import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import vm from "vm";
import { prisma } from "@/lib/prisma";
import { buildProcessEnvForDeployment } from "@/lib/deployment-env";
import { getZipInvokeScriptPath } from "@/lib/zip-deploy";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

type RuntimeMeta = {
  kind?: string;
  extractPath?: string;
  dockerHostPort?: number;
};

type RunParams = Promise<{ id: string; rest?: string[] }>;

export async function GET(req: Request, { params }: { params: RunParams }) {
  const { id } = await params;
  return runInvocation(req, id);
}

export async function POST(req: Request, { params }: { params: RunParams }) {
  const { id } = await params;
  return runInvocation(req, id);
}

export async function PUT(req: Request, { params }: { params: RunParams }) {
  const { id } = await params;
  return runInvocation(req, id);
}

export async function PATCH(req: Request, { params }: { params: RunParams }) {
  const { id } = await params;
  return runInvocation(req, id);
}

export async function DELETE(req: Request, { params }: { params: RunParams }) {
  const { id } = await params;
  return runInvocation(req, id);
}

async function runInvocation(req: Request, id: string) {
  const start = Date.now();

  const row = await prisma.function.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Function not found" }, { status: 404 });
  }

  if (row.type === "container") {
    return proxyToContainer(req, row, id, start);
  }

  let bodyText = "";
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      bodyText = await req.text();
    } catch {
      bodyText = "";
    }
  }

  const deploymentEnv: Record<string, string> = row.envVars
    ? (JSON.parse(row.envVars) as Record<string, string>)
    : {};
  const mergedEnv = buildProcessEnvForDeployment(deploymentEnv);

  const syntheticReq = {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
    body: bodyText,
  };

  let status = 200;
  let output = "";

  try {
    if (row.type === "snippet") {
      const moduleObj: { exports: unknown } = { exports: {} };
      const sandbox: Record<string, unknown> = {
        module: moduleObj,
        get exports() {
          return moduleObj.exports;
        },
        set exports(v: unknown) {
          moduleObj.exports = v;
        },
        process: { env: mergedEnv },
        console: {
          log: (...a: unknown[]) => console.log("[snippet]", ...a),
        },
        Buffer,
        setTimeout,
        clearTimeout,
      };
      let handler: (...args: unknown[]) => unknown;
      
      try {
        vm.createContext(sandbox);
        vm.runInContext(row.code, sandbox, { timeout: 10_000 });
        handler = moduleObj.exports as (...args: unknown[]) => unknown;
      } catch (err: any) {
        if (err instanceof SyntaxError && err.message.includes("Cannot use import statement outside a module")) {

          const encoded = Buffer.from(row.code).toString('base64');
          const dataUrl = `data:text/javascript;base64,${encoded}`;
          const imported = await import(dataUrl);
          
          const candidates = ["handler", "run", "main", "execute", "default"];
          for (const k of candidates) {
            if (typeof imported[k] === 'function') {
              handler = imported[k];
              break;
            }
          }
          if (!handler! && imported.default && typeof imported.default === 'object') {
             for (const k of candidates) {
               if (typeof imported.default[k] === 'function') {
                 handler = imported.default[k];
                 break;
               }
             }
          }
        } else {
          throw err;
        }
      }

      if (typeof handler! !== "function") {
        output = JSON.stringify({ error: "Module must export a function (tried handler, run, main, execute, default)." });
        status = 500;
      } else {
        const result = await handler!(syntheticReq);
        output =
          typeof result === "string" ? result : JSON.stringify(result ?? null);
      }
    } else if (row.type === "function") {
      let meta: RuntimeMeta = {};
      try {
        meta = row.runtimeMeta ? (JSON.parse(row.runtimeMeta) as RuntimeMeta) : {};
      } catch {
        meta = {};
      }
      const extractPath = meta.extractPath;
      if (!extractPath) {
        output = JSON.stringify({ error: "ZIP deployment metadata missing" });
        status = 500;
      } else {
        const script = getZipInvokeScriptPath();
        const payload = {
          ...syntheticReq,
          env: mergedEnv,
        };
        try {
          const { stdout, stderr } = await execFileAsync(
            process.execPath,
            [script, extractPath],
            {
              env: {
                ...mergedEnv,
                KABOOM_REQ_JSON: JSON.stringify(payload),
              },
              timeout: 60_000,
              maxBuffer: 10 * 1024 * 1024,
            }
          );
          if (stderr?.trim()) {
            try {
              const errObj = JSON.parse(stderr.trim()) as { error?: string };
              if (errObj?.error) {
                throw new Error(errObj.error);
              }
            } catch (e) {
              if (e instanceof SyntaxError) {
                if (stderr.trim()) throw new Error(stderr.trim());
              } else {
                throw e;
              }
            }
          }
          output = stdout ?? "";
        } catch (e: unknown) {
          const msg =
            e instanceof Error
              ? e.message
              : typeof e === "object" && e && "stderr" in e
                ? String((e as { stderr?: Buffer }).stderr)
                : String(e);
          output = JSON.stringify({ error: msg || "ZIP handler failed" });
          status = 500;
        }
      }
    } else {
      output = JSON.stringify({ error: `Unknown type: ${row.type}` });
      status = 500;
    }

    const durationMs = Date.now() - start;
    await prisma.executionLog.create({
      data: { functionId: id, status, durationMs, output },
    });

    return new NextResponse(output, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    status = 500;
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e) || "Execution Error";
    output = JSON.stringify({ error: msg, stack: e instanceof Error ? e.stack : undefined });
    await prisma.executionLog.create({
      data: { functionId: id, status, durationMs, output },
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function proxyToContainer(
  req: Request,
  row: {
    id: string;
    runtimeMeta: string | null;
  },
  id: string,
  start: number
) {
  let meta: RuntimeMeta = {};
  try {
    meta = row.runtimeMeta
      ? (JSON.parse(row.runtimeMeta) as RuntimeMeta)
      : {};
  } catch {
    meta = {};
  }
  const hostPort = meta.dockerHostPort;
  if (!hostPort) {
    const durationMs = Date.now() - start;
    await prisma.executionLog.create({
      data: {
        functionId: id,
        status: 500,
        durationMs,
        output: JSON.stringify({ error: "Container port not found in deployment" }),
      },
    });
    return NextResponse.json(
      { error: "Container port not found in deployment" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const prefix = `/api/run/${row.id}`;
  let suffix = url.pathname.startsWith(prefix)
    ? url.pathname.slice(prefix.length)
    : "/";
  if (suffix === "") suffix = "/";
  if (!suffix.startsWith("/")) suffix = `/${suffix}`;

  const target = new URL(`http://127.0.0.1:${hostPort}${suffix}`);
  target.search = url.search;

  const headers = new Headers(req.headers);
  const hop = [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
  ];
  for (const h of hop) headers.delete(h);
  headers.delete("host");

  const init: RequestInit & { duplex?: string } = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Upstream fetch failed";
    const durationMs = Date.now() - start;
    await prisma.executionLog.create({
      data: {
        functionId: id,
        status: 502,
        durationMs,
        output: JSON.stringify({ error: msg }),
      },
    });
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const durationMs = Date.now() - start;
  await prisma.executionLog.create({
    data: {
      functionId: id,
      status: upstream.status,
      durationMs,
      output: JSON.stringify({
        proxied: true,
        upstream: upstream.status,
        path: suffix,
      }),
    },
  });

  const outHeaders = new Headers(upstream.headers);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}
