# Assignment: Worker 1 - DALI Device Migration
**Task-ID**: MIGRATION-P4

## Identity Verification Requirement
You MUST:
1. Start your work by confirming: "I am Worker 1, beginning DALI Device Migration"
2. Record start timestamp immediately
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 1 - DALI Device Migration - Complete - Duration: [X minutes]"

## Context
The project has moved from `DaliDevice[]` to a more structured `Device[]` model. Existing project files still contain the old format, causing type mismatches and loading failures.

## Mission
Implement a migration layer in `DataService.ts` to transparently convert legacy DALI devices to the new `Device` structure.

## Acceptance Criteria
- [ ] Implement `migrateDaliDevices(legacyDevices: any[]): Device[]` in `DataService.ts`.
- [ ] Logic MUST handle missing fields by providing sensible defaults:
    - `deviceTypeId`: Default to "generic-lighting".
    - `productId`: Use legacy `productId` if exists, otherwise "generic-legacy".
    - `position`: Map legacy `x`/`y` directly.
    - `layerId`: Default to "lighting".
    - `metadata`: Preserve all legacy fields in the `metadata` record.
- [ ] Integration: `loadProject` MUST detect if the incoming data uses the old format (e.g., check `devices` array element structure) and apply migration before caching/populating registry.
- [ ] No regression: Ensure new `Device` objects are not double-migrated.
- [ ] Build passes: `npm run build` must result in 0 errors.

## Deliverables
- [MODIFY] `src/services/DataService.ts`

## Independence Statement
Your work is independent of other workers this cycle. The `Device` model is already defined.

## First Action Hints
1. Inspect `src/services/DataService.ts` to see where `fetch` happens.
2. Define the migration function at the bottom of the class.
3. Add a check in `loadProject` right after the `fetch` result.

## Autonomy Mode
Mission (Medium Budget)
