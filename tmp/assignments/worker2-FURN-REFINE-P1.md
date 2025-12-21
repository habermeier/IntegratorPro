**Task-ID: FURN-REFINE-P1**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 2, beginning Furniture Refinements"
2. End your result file with: "Worker 2 - Furniture Refinements - Complete/Blocked"
3. NEVER use "In-Progress" status when submitting - you are either done or blocked

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

Furniture placement tool is mostly complete (`tickets/furniture-placement-tool.md`). Current gaps noted in "Next Steps" section:
1. "Snap to Wall" rotation (auto-align furniture back to wall)
2. Keyboard nudging preview update improvements
3. Distance indicator visual refinements

Persistence (save/load) is intentionally OUT OF SCOPE this cycle - Worker 1 is handling data architecture.

---

## Mission

Refine furniture placement UX: implement snap-to-wall rotation, improve keyboard nudging, and enhance distance indicator visuals.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Snap-to-Wall Rotation**: When furniture is near a wall (<20 units), pressing 'W' key auto-rotates furniture so back edge aligns parallel to wall
- [ ] **Keyboard Nudging**: Arrow keys (↑↓←→) smoothly update preview position in real-time (currently deferred)
- [ ] **Distance Indicators**:
  - Solid blue lines to walls (current) - no change needed
  - Dashed green lines to furniture (<200 units) - make thickness 2px (currently 1px), improve visibility
  - Add distance label at midpoint of each line (e.g., "2.5m" or "8' 3\"")
- [ ] **Visual Feedback**: Snap-to-wall shows brief highlight on target wall (200ms flash)
- [ ] **Settings Integration**: Add "Enable Snap-to-Wall" toggle in Settings → Floorplan (default: ON)
- [ ] **No Regressions**: All existing furniture features still work (placement, rotation with 'R', collision detection, distance lines)

---

## Deliverables

1. **PlaceFurnitureTool.ts Updates**:
   - Implement snap-to-wall logic (detect nearest wall, calculate alignment rotation)
   - 'W' key handler for snap-to-wall
   - Update arrow key handlers for real-time preview updates
   - Wall highlight flash on snap

2. **Distance Indicator Enhancements**:
   - Increase line thickness to 2px for furniture-to-furniture lines
   - Add distance labels (text at midpoint of lines)
   - Use formatDistance() from measurementUtils for labels

3. **Settings Component Update**:
   - Add "Enable Snap-to-Wall" toggle under Floorplan settings
   - Default: true
   - Persists in localStorage (use existing settings pattern)

4. **Manual Testing Checklist** (include in result):
   - Place furniture near wall → press 'W' → furniture aligns to wall ✓
   - Arrow keys nudge furniture → preview updates smoothly ✓
   - Distance lines show labels with correct measurements ✓
   - Disable snap-to-wall in settings → 'W' key does nothing ✓
   - Existing rotation ('R'), collision, distance lines still work ✓

---

## Independence Statement

This task is fully independent. Does not depend on Worker 1's data architecture work.

---

## First Action Hints

1. Find the furniture placement tool:
   ```bash
   find editor/tools -name "*Furniture*"
   ```

2. Check current keyboard handlers:
   ```bash
   grep -A 5 "onKeyDown" editor/tools/PlaceFurnitureTool.ts
   ```

3. Start with snap-to-wall logic - add 'W' key handler that:
   - Finds nearest wall (use existing spatial utils)
   - Calculates rotation to align furniture parallel to wall
   - Updates furniture rotation

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Low - focus on the specific refinements. May add helper functions for snap-to-wall calculations.

---

## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```

2. **No TypeScript Errors:**
   Check build output - 0 errors.

3. **Manual Test in Browser:**
   ```bash
   npm run dev
   ```
   Then test:
   - Select furniture tool
   - Place furniture near wall
   - Press 'W' → furniture aligns
   - Arrow keys → furniture moves with preview
   - Distance lines visible with labels
   - Settings toggle works

4. **No Regressions:**
   - 'R' key rotation still works
   - Collision detection still works
   - Existing distance lines still show

Include screenshots or detailed test results in your result file as proof.

If a check fails: DEBUG AND FIX IT. Do not stop, do not ask permission, FIX IT.

Work that fails ANY of these checks is NOT complete.

---

## Reference Documents

- Furniture ticket: `tickets/furniture-placement-tool.md` (see "Next Steps / Where we left off")
- Spatial utils: `utils/spatialUtils.ts`
- Measurement utils: `utils/measurementUtils.ts`
- Settings component: `components/Settings.tsx`

---

**Result File:** `tmp/worker/result-worker2-FURN-REFINE-P1.md`

Start NOW.
