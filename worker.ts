import { httpServerHandler } from "cloudflare:node";

// Tell the existing Express server that it is running inside Workers.
// This keeps the existing API routes while Cloudflare Static Assets serves the React build.
process.env.NODE_ENV = "production";
process.env.CLOUDFLARE_WORKERS = "1";

await import("./server.ts");

// Cloudflare's official Node/Express bridge forwards Worker requests to the
// Express server listening on this in-memory port.
export default httpServerHandler({ port: 3000 });
