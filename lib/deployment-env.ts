import { parse } from "dotenv";

export type EnvPair = { key: string; value: string };


export function parseEnvFile(text: string): Record<string, string> {
  const buf = Buffer.from(text, "utf8");
  return parse(buf);
}

export function envPairsToRecord(pairs: EnvPair[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const { key, value } of pairs) {
    const k = key.trim();
    if (!k) continue;
    out[k] = value;
  }
  return out;
}





export function buildProcessEnvForDeployment(
  deployment: Record<string, string>
): NodeJS.ProcessEnv {
  const platform: Record<string, string> = {};
  if (process.env.NODE_ENV) platform.NODE_ENV = process.env.NODE_ENV;
  if (process.env.TZ) platform.TZ = process.env.TZ;
  return { ...platform, ...deployment } as NodeJS.ProcessEnv;
}
