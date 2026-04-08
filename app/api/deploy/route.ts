import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildRunPublicUrl } from "@/lib/public-url";
import {
  envPairsToRecord,
  parseEnvFile,
  type EnvPair,
} from "@/lib/deployment-env";
import { extractZipTo, npmInstallProduction } from "@/lib/zip-deploy";
import {
  dockerPull,
  dockerRemoveForce,
  dockerRunDetached,
  dockerNameForDeploymentId,
} from "@/lib/docker-runtime";

export const runtime = "nodejs";

const MAX_MULTIPART_BYTES = 100 * 1024 * 1024;

function mergeEnvInputs(
  pairs: EnvPair[],
  envFileText: string | null
): Record<string, string> {
  const fromFile = envFileText ? parseEnvFile(envFileText) : {};
  const fromPairs = envPairsToRecord(pairs);
  return { ...fromFile, ...fromPairs };
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let type: string;
    let code = "";
    let githubRepo: string | undefined;
    let envPairs: EnvPair[] = [];
    let containerExposePort = 8080;
    let zipBuffer: Buffer | null = null;
    let envFileText: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const len = req.headers.get("content-length");
      if (len && Number(len) > MAX_MULTIPART_BYTES) {
        return NextResponse.json(
          { 
            error: "Request body too large (limit 100MB). " + 
                   "IMPORTANT: Do not zip your 'node_modules' or '.next' folders; they are heavy and redundant." 
          },
          { status: 413 }
        );
      }
      const form = await req.formData();
      type = String(form.get("type") || "snippet");
      code = String(form.get("code") ?? "");
      const gr = form.get("githubRepo");
      githubRepo = gr ? String(gr).trim() || undefined : undefined;
      const ev = form.get("envVars");
      if (ev && typeof ev === "string") {
        try {
          envPairs = JSON.parse(ev) as EnvPair[];
        } catch {
          envPairs = [];
        }
      }
      const cep = form.get("containerExposePort");
      if (cep) containerExposePort = Math.max(1, parseInt(String(cep), 10) || 8080);

      const zip = form.get("zip");
      if (zip && zip instanceof File && zip.size > 0) {
        zipBuffer = Buffer.from(await zip.arrayBuffer());
      }

      const envFile = form.get("envFile");
      if (envFile && envFile instanceof File && envFile.size > 0) {
        envFileText = await envFile.text();
      }
    } else {
      const body = (await req.json()) as Record<string, unknown>;
      type = (body.type as string) || "snippet";
      code = (body.code as string) || "";
      githubRepo =
        typeof body.githubRepo === "string" ? body.githubRepo.trim() || undefined : undefined;
      envPairs = Array.isArray(body.envVars) ? (body.envVars as EnvPair[]) : [];
      if (body.containerExposePort != null) {
        containerExposePort = Math.max(
          1,
          parseInt(String(body.containerExposePort), 10) || 8080
        );
      }
    }

    const deploymentEnv = mergeEnvInputs(envPairs, envFileText);
    const envVarsJson =
      Object.keys(deploymentEnv).length > 0
        ? JSON.stringify(deploymentEnv)
        : null;

    const shortId = Math.random().toString(16).substring(2, 10);
    const id = `kbm_${shortId}`;
    const endpoint = `/api/run/${id}`;
    const publicUrl = buildRunPublicUrl(req, id);

    const baseDir = path.join(process.cwd(), ".data", "kaboom", id);
    let runtimeMeta: Record<string, unknown> | null = null;
    let storedCode = code;

    if (type === "function") {
      if (!zipBuffer?.length) {
        return NextResponse.json(
          { error: "Function deployment requires a ZIP upload (package.json + entry)." },
          { status: 400 }
        );
      }
      const extractPath = path.join(baseDir, "extract");
      await fs.mkdir(extractPath, { recursive: true });
      await extractZipTo(zipBuffer, extractPath);
      try {
        await npmInstallProduction(extractPath);
      } catch (e) {
        console.error("[deploy] npm install failed", e);
        await fs.rm(baseDir, { recursive: true, force: true });
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? `npm install failed: ${e.message}`
                : "npm install failed",
          },
          { status: 500 }
        );
      }
      storedCode = zipBuffer.length ? `zip:${zipBuffer.length} bytes` : "zip";
      runtimeMeta = {
        kind: "function",
        extractPath,
      };
    }

    if (type === "container") {
      const imageTag = (code || "").trim();
      if (!imageTag) {
        return NextResponse.json(
          { error: "Container deployment requires an image tag (e.g. nginx:latest)." },
          { status: 400 }
        );
      }
      const containerName = dockerNameForDeploymentId(id);
      try {
        await dockerPull(imageTag);
      } catch (e) {
        console.error("[deploy] docker pull", e);
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? `docker pull failed: ${e.message}`
                : "docker pull failed (is Docker running?)",
          },
          { status: 500 }
        );
      }

      try {
        const { containerId, hostPort } = await dockerRunDetached({
          name: containerName,
          image: imageTag,
          exposePort: containerExposePort,
          env: deploymentEnv,
        });
        storedCode = imageTag;
        runtimeMeta = {
          kind: "container",
          dockerContainerId: containerId,
          dockerHostPort: hostPort,
          containerExposePort,
          imageTag,
        };
      } catch (e) {
        console.error("[deploy] docker run", e);
        await dockerRemoveForce(containerName);
        return NextResponse.json(
          {
            error:
              e instanceof Error
                ? `docker run failed: ${e.message}`
                : "docker run failed (check image EXPOSE / port mapping)",
          },
          { status: 500 }
        );
      }
    }

    let finalName = `gadget-${shortId}`;
    if (githubRepo && githubRepo.includes("/")) {
      const parts = githubRepo.split("/");
      const repoName = parts[parts.length - 1];
      if (repoName) finalName = repoName;
    }

    await prisma.function.create({
      data: {
        id,
        name: finalName,
        code: storedCode,
        type: type || "snippet",
        status: "active",
        githubRepo: githubRepo || null,
        envVars: envVarsJson,
        endpoint,
        publicUrl,
        runtimeMeta: runtimeMeta ? JSON.stringify(runtimeMeta) : null,
      },
    });

    return NextResponse.json({
      id,
      endpoint,
      publicUrl,
      success: true,
    });
  } catch (error) {
    console.error("[deploy]", error);
    return NextResponse.json({ error: "Deployment failed" }, { status: 500 });
  }
}
