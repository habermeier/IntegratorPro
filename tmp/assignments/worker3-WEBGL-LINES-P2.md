**Task-ID: WEBGL-LINES-P2**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 3, beginning WebGL Line Thickness Fix"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 3 - WebGL Line Thickness Fix - Complete/Blocked - Duration: [X minutes]"
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

Furniture distance indicators use `LineDashedMaterial` with `linewidth: 2` to show 2px thick green dashed lines. However, `linewidth` property is not supported on most WebGL implementations (only works on Windows with ANGLE). This means the enhanced visibility won't work on most browsers.

Reference: `tmp/tech-lead-review-cycle1.md` (Priority 2 issue) and `tickets/fix-webgl-line-thickness.md`

---

## Mission

Replace `LineDashedMaterial` with THREE.Line2 and LineMaterial for proper thick line rendering across all browsers.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Import THREE.Line2 dependencies**
  - Add imports from 'three/examples/jsm/lines/'
  - Import: Line2, LineMaterial, LineGeometry

- [ ] **Replace furniture-to-furniture lines** (green dashed)
  - Find LineDashedMaterial instances (lines ~282, 593)
  - Create LineGeometry from segment points
  - Create LineMaterial with proper config:
    - color: 0x00ff00 (green)
    - linewidth: 0.002 (world units, ~2mm)
    - dashed: true
    - dashScale, dashSize, gapSize matching current pattern
  - Create Line2 instances
  - Call computeLineDistances() for dashed lines

- [ ] **Test solid blue lines** still work
  - Wall-to-furniture lines should remain unchanged (solid blue)
  - Verify no regression in wall distance indicators

- [ ] **Camera distance scaling** (if needed)
  - LineMaterial uses screen-space rendering
  - May need to adjust linewidth based on camera distance
  - Test at different zoom levels

- [ ] **Performance verification**
  - Test with 10-20 furniture items
  - Verify no lag or frame drops
  - Ensure Line2 instances aren't recreated on every mouse move (consider caching)

- [ ] **Build passes** with 0 TypeScript errors
  - Run `npm run build` and verify success

- [ ] **Manual testing on multiple browsers**
  - Test on at least Chrome and Firefox
  - Verify 2px visual thickness appears on both
  - Compare with wall lines for consistency
  - Test zoom in/out behavior

---

## Deliverables

1. **editor/tools/PlaceFurnitureTool.ts** updates:
   - Add Line2, LineMaterial, LineGeometry imports
   - Replace LineDashedMaterial usage with Line2 + LineMaterial
   - Maintain dashed pattern for furniture-to-furniture lines
   - Add camera distance handling if needed
   - Consider caching Line2 instances for performance

2. **Manual testing results** in result file:
   - Evidence of thick lines rendering on Chrome
   - Evidence of thick lines rendering on Firefox
   - Screenshots showing line thickness comparison
   - Performance testing results (fps, lag check)
   - Zoom behavior verification
   - Regression testing (wall lines, collision, labels)

---

## Independence Statement

This task is fully independent. Does not depend on Workers 1, 2, or 4.

Worker 4 (Antigravity) will do comprehensive visual verification separately - you focus on implementation and basic cross-browser testing.

---

## First Action Hints

1. Check current LineDashedMaterial usage:
   ```bash
   grep -n "LineDashedMaterial" editor/tools/PlaceFurnitureTool.ts
   ```

2. Read the detailed ticket for implementation examples:
   ```bash
   cat tickets/fix-webgl-line-thickness.md
   ```

3. Research THREE.Line2 documentation:
   - Web search: "three.js Line2 dashed lines example"
   - Reference: https://threejs.org/examples/?q=line#webgl_lines_fat

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Medium - replace line rendering, may need to add camera distance logic, caching for performance

---

## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show 0 errors.

2. **TypeScript Validation:**
   Check build output for any type errors related to Line2 imports or usage.

3. **Manual Testing:**
   Start dev server and test:
   - Line thickness visible on Chrome
   - Line thickness visible on Firefox
   - Performance with 10+ furniture items
   - Zoom in/out behavior
   - No regressions (wall lines, labels, collision)

4. **Cross-Browser Testing:**
   CRITICAL: Test on at least 2 different browsers to verify WebGL compatibility.

Include proof of these checks in your result file.

If a check fails: FIX IT. Research alternatives, debug, try different approaches. Do not stop until thick lines work on multiple browsers.

---

## Reference Documents

- PlaceFurnitureTool implementation: `editor/tools/PlaceFurnitureTool.ts`
- Detailed ticket: `tickets/fix-webgl-line-thickness.md`
- Tech Lead review: `tmp/tech-lead-review-cycle1.md`
- THREE.js Line2 examples: https://threejs.org/examples/?q=line#webgl_lines_fat

---

**Result File:** `tmp/worker/result-worker3-WEBGL-LINES-P2.md`

Start NOW.
