# Navigation & Master Data Patch Report

## Scope
This patch addresses refresh navigation consistency and introduces a centralized master-data service for classes and subjects without deleting existing mock/seed data.

## Navigation
- Added `src/utils/navigationState.ts` as a single session-scoped navigation state store.
- `App.tsx` now restores navigation state before falling back to legacy storage keys.
- Restore support was expanded to all declared `ExamViewMode` values.
- Existing explicit exam/schedule URL deep links retain priority.
- Existing CBT behavior is preserved: a refreshed `exam_cbt` state returns to the package gate rather than inventing a resumable in-memory React state.
- Existing URL synchronization remains in place.

## Master Data
- Added `src/services/masterDataService.ts`.
- Class and subject seed data are exposed through centralized services.
- Existing hardcoded/seed data is not deleted.
- Duplicate names are prevented by the upsert helpers.
- Classes and subjects support stable IDs and `isActive` state.
- Existing components were wired to read centralized master subjects/classes while retaining legacy seeds as fallback.

## Compatibility
The patch is intentionally non-destructive. Existing `localStorage` defaults, mock data, Firebase configuration, Supabase, Gemini, exam packages, and offline mechanisms are not removed.

## Important limitation
The master-data service in this patch is a compatibility/local browser master layer. It does **not** silently invent a new Firebase collection or migrate production data. A production Firebase-backed Master Data UI/repository should be implemented only after confirming the project's existing Firebase schema and authorization model.

## Verification
Run in the project root:

```bash
npm install
npx tsc --noEmit
npm run lint
npm run build
```

Do not treat an environment/dependency failure as a code PASS.
