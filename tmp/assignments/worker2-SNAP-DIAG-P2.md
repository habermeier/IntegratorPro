**Task-ID: SNAP-DIAG-P2**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 2, beginning Snap-to-Wall Diagonal Fix"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 2 - Snap-to-Wall Diagonal Fix - Complete/Blocked - Duration: [X minutes]"
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

Furniture snap-to-wall ('W' key) currently rounds wall angles to nearest 90° (0°, 90°, 180°, 270°). This works for horizontal/vertical walls but fails for diagonal walls. User expects furniture to align parallel to actual wall angle, not rounded angle.

Reference: `tmp/tech-lead-review-cycle1.md` (Priority 2 issue) and `tickets/fix-snap-to-wall-diagonal.md`

---

## Mission

Fix snap-to-wall rotation to use exact wall angle instead of rounding to 90° increments, enabling proper alignment with diagonal walls.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Remove angle rounding** from snapToWallRotation()
  - Find the line: `const snappedAngle = Math.round(wallAngle / 90) * 90;`
  - Remove rounding, use exact wallAngle directly
  - Update currentRotation with exact wall angle

- [ ] **Wall direction ambiguity handled**
  - Wall segment has two possible parallel angles (wallAngle and wallAngle + 180°)
  - Choose angle closest to furniture's current rotation (minimize rotation change)
  - Implement logic to select best direction

- [ ] **Angle normalization** added
  - Ensure rotation stays within 0-360° range
  - Use: `((wallAngle % 360) + 360) % 360`

- [ ] **Console logging updated**
  - Log exact wall angle (not rounded)
  - Format: `Snapped to wall at 45.3°` (not `Snapped to wall at 45°`)

- [ ] **Build passes** with 0 TypeScript errors
  - Run `npm run build` and verify success

- [ ] **Manual testing** (document in result file)
  - Test horizontal walls (0°, 180°) - should still work
  - Test vertical walls (90°, 270°) - should still work
  - Test diagonal walls (45°, 135°, 225°, 315°) - should align exactly
  - Test arbitrary angles (30°, 60°, 120°) - should align parallel
  - Test no wall nearby - should log "No wall within 20 units"
  - Test Settings toggle - disabling should prevent snap
  - Test 'R' key rotation - should still work (no regression)

---

## Deliverables

1. **editor/tools/PlaceFurnitureTool.ts** updates:
   - Remove angle rounding from snapToWallRotation() method
   - Add wall direction selection logic (choose closest to current rotation)
   - Add angle normalization
   - Update console.log to show exact angle with 1 decimal place

2. **Manual testing results** in result file:
   - Evidence of diagonal wall alignment working
   - Evidence of horizontal/vertical walls still working
   - Evidence of arbitrary angle walls working
   - Screenshots or detailed description of visual results
   - Confirmation of no regressions

---

## Independence Statement

This task is fully independent. Does not depend on Workers 1, 3, or 4.

Worker 4 (Antigravity) will do visual verification testing separately - you focus on code implementation and basic manual testing.

---

## First Action Hints

1. Read the current snap-to-wall implementation:
   ```bash
   grep -A 20 "snapToWallRotation" editor/tools/PlaceFurnitureTool.ts
   ```

2. Find the exact line that does rounding:
   ```bash
   grep "Math.round.*90" editor/tools/PlaceFurnitureTool.ts
   ```

3. Read the detailed ticket for implementation guidance:
   ```bash
   cat tickets/fix-snap-to-wall-diagonal.md
   ```

---

## Autonomy Mode

**Mode:** Exact
**Expansion Budget:** Low - surgical fix to remove rounding, add direction selection, add normalization

---

## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show 0 errors.

2. **TypeScript Validation:**
   Check build output for any type errors in PlaceFurnitureTool.

3. **Manual Testing:**
   Start dev server and test all scenarios in acceptance criteria.
   Document what you tested and what you observed.

Include proof of these checks in your result file.

If a check fails: FIX IT. Debug, research, fix. Do not stop until all checks pass.

---

## Reference Documents

- PlaceFurnitureTool implementation: `editor/tools/PlaceFurnitureTool.ts`
- Detailed ticket: `tickets/fix-snap-to-wall-diagonal.md`
- Tech Lead review: `tmp/tech-lead-review-cycle1.md`
- Worker 2 P1 result: `tmp/worker/result-worker2-FURN-REFINE-P1.md` (for context)

---

**Result File:** `tmp/worker/result-worker2-SNAP-DIAG-P2.md`

Start NOW.
