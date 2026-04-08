"use strict";

const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const root = process.argv[2];
if (!root) {
  process.stderr.write(JSON.stringify({ error: "missing extract root" }));
  process.exit(1);
}

process.chdir(root);

const pkgPath = path.join(root, "package.json");
let pkg = {};
if (fs.existsSync(pkgPath)) {
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch (_) {}
}

let mainRel = String(pkg.main || "index.js").replace(/^\.\//, "");
let mainPath = path.join(root, mainRel);

if (!fs.existsSync(mainPath)) {
  const fallbacks = ["main.js", "app.js", "server.js", "handler.js"];
  for (const f of fallbacks) {
    const fPath = path.join(root, f);
    if (fs.existsSync(fPath)) {
      mainPath = fPath;
      break;
    }
  }
}

// Still not found? Try any .js file that is NOT from node_modules
if (!fs.existsSync(mainPath)) {
  const rootFiles = fs.readdirSync(root);
  const anyJs = rootFiles.find(f => f.endsWith(".js") && f !== "package.json");
  if (anyJs) {
    mainPath = path.join(root, anyJs);
  }
}

if (!fs.existsSync(mainPath)) {
  process.stderr.write(
    JSON.stringify({ error: `Cannot find entry point module (tried ${mainPath}). Ensure you have index.js or package.json#main.` })
  );
  process.exit(1);
}

const req = JSON.parse(process.env.KABOOM_REQ_JSON || "{}");

(async () => {
  try {
    // Dynamic import for ESM/CJS compatibility. Use file:// URL for Windows.
    // Add cache-buster to ensure fresh code
    const fileUrl = pathToFileURL(mainPath).href + "?t=" + Date.now();
    const loaded = await import(fileUrl);
    
    function findHandler(obj, depth = 0) {
      if (!obj || depth > 1) return null;
      const candidates = ["handler", "run", "main", "execute", "default"];
      // Priority 1: Direct function keys (named exports or root)
      for (const k of candidates) {
        if (typeof obj[k] === 'function') return obj[k];
      }
      // Priority 2: Recursively look inside 'default' if it's an object (common for CJS in ESM)
      if (obj.default && typeof obj.default === 'object') {
        return findHandler(obj.default, depth + 1);
      }
      return null;
    }

    function getAllFuncs(obj, depth = 0, path = "") {
      if (!obj || depth > 1) return [];
      let funcs = Object.keys(obj)
        .filter(k => typeof obj[k] === 'function')
        .map(k => (path ? `${path}.${k}` : k));
      if (obj.default && typeof obj.default === 'object') {
        funcs = funcs.concat(getAllFuncs(obj.default, depth + 1, "default"));
      }
      return funcs;
    }

    const handler = findHandler(loaded);

    if (typeof handler !== "function") {
      const allFuncs = getAllFuncs(loaded);
      const isReactOrFrontend = JSON.stringify(loaded).includes("react") || mainPath.includes("src/");
      let diagMsg = `Module must export a function (tried handler, run, main, execute, default). Found functions: [${allFuncs.join(', ') || 'none'}].`;
      
      if (isReactOrFrontend && allFuncs.length === 0) {
        diagMsg += `\nWARNING: Kaboom is a serverless backend platform. It appears you uploaded frontend client code (e.g. React). You must export an HTTP handler function to deploy a gadget.`;
      } else {
        diagMsg += ` Ensure you export your handler function correctly.`;
      }

      process.stderr.write(
        JSON.stringify({ error: diagMsg })
      );
      process.exit(1);
    }

    const result = await handler(req);
    const out =
      typeof result === "string" ? result : JSON.stringify(result ?? null);
    process.stdout.write(out);
  } catch (e) {
    process.stderr.write(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) })
    );
    process.exit(1);
  }
})();
