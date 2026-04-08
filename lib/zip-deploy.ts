import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import AdmZip from "adm-zip";

const execFileAsync = promisify(execFile);

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

export async function extractZipTo(buffer: Buffer, destDir: string): Promise<void> {
  if (buffer.length > MAX_ZIP_BYTES) {
    throw new Error(`ZIP exceeds max size (${MAX_ZIP_BYTES} bytes)`);
  }
  await fs.mkdir(destDir, { recursive: true });
  const zip = new AdmZip(buffer);
  zip.extractAllTo(destDir, true);

  // Flattening Logic: If the zip only contains one directory (e.g. zipped a folder instead of its contents)
  // Ignore system files like __MACOSX or .DS_Store
  const items = (await fs.readdir(destDir)).filter(i => i !== "__MACOSX" && i !== ".DS_Store");
  if (items.length === 1) {
    const singleDirPath = path.join(destDir, items[0]);
    const stat = await fs.stat(singleDirPath);
    if (stat.isDirectory()) {
      const subItems = await fs.readdir(singleDirPath);
      for (const subItem of subItems) {
        await fs.rename(path.join(singleDirPath, subItem), path.join(destDir, subItem));
      }
      // Note: We don't rmdir if it has leftover junk, but we moved the important stuff.
      // But for completeness:
      await fs.rm(singleDirPath, { recursive: true, force: true });
    }
  }
}

export async function npmInstallProduction(cwd: string): Promise<void> {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await execFileAsync(
    npm,
    ["install", "--omit=dev", "--no-audit", "--no-fund"],
    {
      cwd,
      maxBuffer: 50 * 1024 * 1024,
      timeout: 300_000,
      env: process.env,
      shell: process.platform === "win32", // Fix for spawn EINVAL on Windows
    }
  );
}

export function getZipInvokeScriptPath(): string {
  return path.join(process.cwd(), "scripts", "kaboom-zip-invoke.cjs");
}
