# Ujian19 / ulangan19ku — Cloudflare deployment patch

This package is adapted for Cloudflare Workers while preserving the existing React/Vite frontend and Express API routes.

## Changes
- Added `worker.ts` as the Cloudflare Worker entry point.
- Added `wrangler.jsonc` with:
  - React SPA fallback
  - `dist` static assets
  - `/api/*` routed to the Express Worker
  - production Worker name `ulangan19ku`
- Changed the build script to produce the Vite frontend in `dist`.
- Added the Cloudflare Express bridge via `cloudflare:node`.
- Prevented the Node filesystem/static-serving branch from running inside Workers.
- Kept the existing Node/Express production path for non-Cloudflare environments.
- Corrected `firebase-blueprint.json` so its Firestore schema matches the fields actually written by `src/firebase.ts`.

## Cloudflare environment variables
Configure these as Worker environment variables/secrets as needed:
- `GEMINI_API_KEY`
- `DEEPSEEK_API_KEY` (only if DeepSeek is used)
- `EXAM_MODE`
- `EXAM_TOKENS_JSON`
- `SUPERVISOR_API_KEY`

Do not put private server keys into `VITE_*` variables or public source files.

## Deployment
Cloudflare Workers Builds:
- Build command: `bun run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

The application URL will be the Worker URL shown under Cloudflare > Workers & Pages > ulangan19ku > Domains.

## Important
The uploaded package originally recorded `build: FAILED` and `lint: FAILED` in `FINAL_AUDIT_STATUS.md`; the original package did not contain installed dependencies in this working environment, so a full dependency-backed build cannot be certified here. The source-level Cloudflare deployment structure has been corrected, but after uploading to Cloudflare, the Build log is the final verification of dependency installation and bundling.
