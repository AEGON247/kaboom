import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function dockerNameForDeploymentId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

export async function dockerPull(image: string): Promise<void> {
  await execFileAsync("docker", ["pull", image], {
    maxBuffer: 50 * 1024 * 1024,
    timeout: 600_000,
  });
}

export async function dockerRunDetached(args: {
  name: string;
  image: string;
  exposePort: number;
  env: Record<string, string>;
}): Promise<{ containerId: string; hostPort: number }> {
  const envArgs: string[] = [];
  for (const [k, v] of Object.entries(args.env)) {
    envArgs.push("-e", `${k}=${v}`);
  }

  const { stdout } = await execFileAsync(
    "docker",
    [
      "run",
      "-d",
      "--name",
      args.name,
      ...envArgs,
      "-p",
      `0:${args.exposePort}`,
      args.image,
    ],
    { maxBuffer: 10 * 1024 * 1024, timeout: 120_000 }
  );

  const containerId = stdout.trim();

  const { stdout: portOut } = await execFileAsync("docker", [
    "port",
    args.name,
    `${args.exposePort}/tcp`,
  ]);

  const line = portOut.trim().split("\n")[0] ?? "";
  const m = line.match(/:(\d+)\s*$/);
  const hostPort = m ? parseInt(m[1], 10) : 0;
  if (!hostPort) {
    throw new Error(`Could not resolve host port for container (docker port output: ${portOut})`);
  }

  return { containerId, hostPort };
}

export async function dockerRemoveForce(name: string): Promise<void> {
  try {
    await execFileAsync("docker", ["rm", "-f", name], { timeout: 60_000 });
  } catch {
    // ignore
  }
}

export { dockerNameForDeploymentId };
