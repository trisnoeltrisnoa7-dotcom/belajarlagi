# UJIANKU CBT 2.91 — Performance + Security Hardening

## Included

### Performance / stability
- Active CBT session autosave moved to IndexedDB (async, non-blocking).
- localStorage remains only as a compatibility fallback for the active session.
- Autosave is throttled to every 5 seconds and no longer follows the 1-second countdown tick.
- `pagehide` triggers a final persistence attempt.
- Answer counters use `useMemo` instead of filtering all questions on every render.
- Supervisor lock refresh polling increased from 3 seconds to 15 seconds.
- Service worker version bumped and forced mid-session activation/reload removed.

### Security hardening
- Firebase anonymous authentication is initialized so Firestore is no longer accessed as a public unauthenticated client.
- Firestore rules deny all unauthenticated access.
- Server token verification no longer trusts `expectedToken`, `isFreeMode`, or `isTokenMandatory` sent by the browser.
- Token verification is server-authoritative and rate limited.
- Token comparison uses constant-time comparison.
- Normal production mode fails closed if a package token is not configured on the server.
- Server supervisor status endpoint cannot be changed without a private server-side key.

## REQUIRED production configuration

Set these server environment variables (never expose them as `VITE_*`):

```env
EXAM_MODE=normal
EXAM_TOKENS_JSON={"your-package-id":"YOUR_TOKEN"}
SUPERVISOR_API_KEY=long-random-private-value
```

For a free/no-token deployment use:

```env
EXAM_MODE=free
```

Do not put `EXAM_TOKENS_JSON` or `SUPERVISOR_API_KEY` in frontend source, `.env` variables prefixed with `VITE_`, or a public repository.

## Important architectural note

Anonymous Firebase authentication is an access-control layer, not a complete admin authorization system. Before a high-stakes production exam, administrative Firestore writes should be moved behind Firebase custom claims/server APIs (teacher/admin roles). The current patch closes public unauthenticated access and makes exam-token verification server-authoritative, but it does not magically turn the existing client-side supervisor PIN into a cryptographic admin identity.

## Firebase Authentication

Enable **Anonymous** sign-in in Firebase Authentication. If Anonymous Authentication is disabled, Firestore operations will be rejected by the new rules.

## Token migration

The browser package/schedule may still contain a token for display/legacy UI. That value is no longer trusted by `/api/exam-token/verify`.
The real token must exist in `EXAM_TOKENS_JSON` keyed by the package ID sent by the client.

## Validation performed

The repository was inspected and patched. A full TypeScript build could not be completed in this environment because the uploaded project dependencies are incomplete in `node_modules` and package installation timed out. Run:

```bash
npm install
npm run lint
npm run build
```

before deployment.
