**Task-ID: CACHE-MGT-P2**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 1, beginning DataService Cache Management"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 1 - DataService Cache Management - Complete/Blocked - Duration: [X minutes]"
6. NEVER use "In-Progress" status when submitting - you are either done or blocked

## YOU ARE A SENIOR ENGINEER

You have FULL AUTONOMY to:
- Make technical decisions within assignment scope
- Research solutions (web search, docs, experimentation)
- Debug and fix problems independently
- Choose implementation approaches

You MUST:
- Complete ALL acceptance criteria (no partial work, no "asking permission")
- Work through problems using web search, documentation, debugging
- Only escalate TRUE blockers (impossible requirements, missing credentials, conflicts)
- Use good judgment: solid implementation, not quick hacks or over-engineering

---

## Context

Worker 1 created DataService with in-memory caching. FESH report identified cache staleness risk: if multiple tabs are open or data changes externally, cache becomes stale with no invalidation mechanism. This creates data integrity risks.

Reference: `tmp/tech-lead-review-cycle1.md` (Priority 2 issue) and `tickets/dataservice-cache-management.md`

---

## Mission

Implement cache invalidation for DataService using hybrid approach: TTL + cross-tab sync + manual invalidation API.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Cache TTL implemented** (5-minute default)
  - Add `cacheTimestamp` private field
  - Add `CACHE_TTL` constant (5 * 60 * 1000 ms)
  - Check TTL in `loadProject()` before returning cache
  - Cache expires after 5 minutes, triggers reload

- [ ] **Cross-tab synchronization** via storage events
  - Listen for 'storage' events in constructor
  - Key: 'integrator-pro-last-save'
  - On change, call `clearCache()` and dispatch 'project-data-changed' event
  - Update `saveProject()` to write localStorage key with timestamp

- [ ] **Force reload parameter** added to loadProject
  - Signature: `loadProject(projectId?: string, forceReload = false): Promise<ProjectData>`
  - When `forceReload = true`, bypass cache even if valid
  - Update FloorPlanRenderer to use forceReload when needed

- [ ] **FloorPlanRenderer integration**
  - Add useEffect to listen for 'project-data-changed' event
  - Event handler reloads project data
  - Cleanup listener on unmount

- [ ] **Build passes** with 0 TypeScript errors
  - Run `npm run build` and verify success

- [ ] **Manual testing** (document in result file)
  - Single tab TTL test (wait 6 min, verify reload)
  - Cross-tab sync test (open 2 tabs, save in one, verify other reloads)
  - Force reload test (call with forceReload=true, verify network request)
  - No regressions (existing save/load works, polygons load correctly)

---

## Deliverables

1. **src/services/DataService.ts** updates:
   - Add `cacheTimestamp` field
   - Add `CACHE_TTL` constant
   - Modify `loadProject()` with TTL check and forceReload parameter
   - Add storage event listener in constructor
   - Modify `saveProject()` to update localStorage timestamp
   - Implement `onStorageChange()` handler

2. **components/FloorPlanRenderer.tsx** updates:
   - Add useEffect for 'project-data-changed' listener
   - Update loadProjectData to handle reloads
   - Cleanup listener on unmount

3. **Manual testing results** in result file:
   - Evidence of TTL expiration
   - Evidence of cross-tab sync
   - Evidence of force reload
   - Confirmation of no regressions

---

## Independence Statement

This task is fully independent. Does not depend on Workers 2, 3, or 4.

---

## First Action Hints

1. Read the current DataService implementation:
   ```bash
   cat src/services/DataService.ts | head -100
   ```

2. Read the detailed ticket for implementation guidance:
   ```bash
   cat tickets/dataservice-cache-management.md
   ```

3. Start implementing TTL check in loadProject():
   - Add private fields for cacheTimestamp and CACHE_TTL
   - Modify loadProject to check TTL before returning cache

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Low - stick to cache management spec, add localStorage integration, add event listeners

---

## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show 0 errors.

2. **TypeScript Validation:**
   Check build output for any type errors in DataService or FloorPlanRenderer.

3. **Manual Testing:**
   Run dev server and execute all test scenarios documented in acceptance criteria.

Include proof of these checks in your result file.

If a check fails: FIX IT. Debug, research, fix. Do not stop until all checks pass.

---

## Reference Documents

- DataService implementation: `src/services/DataService.ts`
- FloorPlanRenderer: `components/FloorPlanRenderer.tsx`
- Detailed ticket: `tickets/dataservice-cache-management.md`
- Tech Lead review: `tmp/tech-lead-review-cycle1.md`

---

**Result File:** `tmp/worker/result-worker1-CACHE-MGT-P2.md`

Start NOW.
