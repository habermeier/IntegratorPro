# Fix WebGL Line Thickness for Distance Indicators

**Priority:** P2 (Should Fix Soon)
**Effort:** Medium (4-6 hours)
**Dependencies:** None
**Origin:** Worker 2 FESH Report (FURN-REFINE-P1)

---

## Problem

The furniture distance indicators use `LineDashedMaterial` with `linewidth: 2` to show 2px thick green dashed lines between furniture items. However, the `linewidth` property is not supported on most WebGL implementations (only works on Windows with ANGLE). This means the enhanced visibility improvement won't work on most browsers.

**Current Implementation:**
```typescript
const material = new LineDashedMaterial({
  color: 0x00ff00,
  linewidth: 2,  // ← This won't work on most browsers
  dashSize: 0.1,
  gapSize: 0.05
});
```

**Affected File:** `editor/tools/PlaceFurnitureTool.ts` (lines 282, 593)

---

## Solution

Replace `LineDashedMaterial` with `THREE.Line2` and `LineMaterial` from `three/examples/jsm/lines/Line2.js`, which implements thick lines using geometry-based rendering.

**Approach:**
1. Import Line2, LineGeometry, LineMaterial from three/examples/jsm
2. Replace LineDashedMaterial instances with LineMaterial
3. Create LineGeometry from segment points
4. Set line width in world units (not pixels)
5. Implement custom dashed line shader if needed

**Reference Implementation:**
```typescript
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

// Create thick dashed line
const geometry = new LineGeometry();
geometry.setPositions([x1, y1, z1, x2, y2, z2]);

const material = new LineMaterial({
  color: 0x00ff00,
  linewidth: 0.002,  // in world units (2mm in meters)
  dashed: true,
  dashScale: 50,
  dashSize: 0.1,
  gapSize: 0.05
});

const line = new Line2(geometry, material);
line.computeLineDistances();  // Required for dashed lines
```

---

## Acceptance Criteria

- [ ] Distance lines render with 2px visual thickness on all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Dashed pattern preserved (green dashed lines between furniture)
- [ ] Solid blue lines to walls still work correctly
- [ ] Performance acceptable (no significant fps drop with 10+ furniture items)
- [ ] Lines scale properly with zoom (world-space thickness)
- [ ] Build passes with 0 TypeScript errors
- [ ] Manual testing on at least 2 different browsers

---

## Testing Checklist

1. **Visual Verification:**
   - Place 3+ furniture items near each other
   - Verify green dashed lines appear with visible thickness
   - Compare with wall lines (solid blue) for consistency
   - Test on Chrome, Firefox, Safari

2. **Zoom Behavior:**
   - Zoom in/out and verify lines maintain appropriate thickness
   - Check that lines don't become too thick at close zoom or invisible at far zoom

3. **Performance:**
   - Place 10-20 furniture items
   - Move furniture around
   - Verify no lag or frame drops

4. **Regression Testing:**
   - Wall distance lines still work (solid blue)
   - Collision detection still works
   - Distance labels still appear
   - All existing furniture features work

---

## References

- THREE.js Line2 Documentation: https://threejs.org/examples/?q=line#webgl_lines_fat
- LineMaterial API: https://threejs.org/docs/#examples/en/lines/LineMaterial
- Worker 2 FESH Report: tmp/worker/result-worker2-FURN-REFINE-P1.md (lines 259-260)

---

## Notes

- LineMaterial uses screen-space line width, so need to adjust based on camera distance
- May need to update line width dynamically on zoom changes
- Consider caching Line2 instances to avoid recreation on every mouse move
- If dashed lines prove difficult with Line2, consider alternative: solid line with opacity or alternating color segments

---

**Status:** Not Started
**Assigned To:** TBD
