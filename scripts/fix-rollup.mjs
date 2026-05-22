// Workaround for this machine: the prebuilt @rollup/rollup-darwin-arm64 native
// binary is rejected by macOS hardened-runtime library validation
// ("different Team IDs"). Rollup 4.60.x has no built-in WASM fallback, so we
// shim the native package to re-export @rollup/wasm-node, which provides the
// same { parse, parseAsync, xxhash* } API in pure WASM. Idempotent; runs on
// postinstall so it survives `npm install`.
import { existsSync, mkdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const nm = path.join(root, "node_modules");
const wasm = path.join(nm, "@rollup", "wasm-node");
if (!existsSync(wasm)) {
  console.log("[fix-rollup] @rollup/wasm-node not installed; skipping shim.");
  process.exit(0);
}

const shimDir = path.join(nm, "@rollup", "rollup-darwin-arm64");
const realBinary = path.join(shimDir, "rollup.darwin-arm64.node");

// If a real native binary is present, drop it (it fails to load on this box).
if (existsSync(realBinary)) {
  try {
    if (statSync(realBinary).isFile()) rmSync(realBinary);
  } catch {
    /* ignore */
  }
}

mkdirSync(shimDir, { recursive: true });
writeFileSync(
  path.join(shimDir, "package.json"),
  JSON.stringify(
    { name: "@rollup/rollup-darwin-arm64", version: "4.60.4", main: "index.js" },
    null,
    2
  )
);
writeFileSync(
  path.join(shimDir, "index.js"),
  'module.exports = require("@rollup/wasm-node/dist/native.js");\n'
);
console.log("[fix-rollup] shimmed @rollup/rollup-darwin-arm64 -> @rollup/wasm-node");
