// Production & Container Entrypoint Bridge
// Enables seamless execution whether Cloud Run executes `npm start`, `node dist/server.cjs`, `node server.js`, or `node server.ts`
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const cjsBundlePath = path.join(__dirname, "dist", "server.cjs");

if (fs.existsSync(cjsBundlePath)) {
  // Use CommonJS production bundle if built
  require(cjsBundlePath);
} else {
  // Fallback to TypeScript source
  await import("./server.ts");
}
