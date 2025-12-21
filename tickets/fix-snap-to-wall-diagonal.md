# Fix Snap-to-Wall for Diagonal Walls

**Priority:** P2 (Should Fix Soon)
**Effort:** Small (1-2 hours)
**Dependencies:** None (builds on Worker 2's FURN-REFINE-P1)
**Origin:** Worker 2 FESH Report (FURN-REFINE-P1)

---

## Problem

The snap-to-wall rotation feature ('W' key) rounds the wall angle to the nearest 90° increment (0°, 90°, 180°, 270°). This works correctly for horizontal and vertical walls, but fails for diagonal walls.

**Current Implementation:**
```typescript
// PlaceFurnitureTool.ts, lines 446-447
const wallAngle = Math.atan2(dy, dx) * (180 / Math.PI);
const snappedAngle = Math.round(wallAngle / 90) * 90;  // ← Rounds to 0/90/180/270
this.currentRotation = snappedAngle;
```

**Example Failure:**
- Wall at 45° angle (diagonal)
- User presses 'W' to align furniture
- Wall angle calculated as 45°
- Rounded to 0° (nearest 90° increment)
- Furniture aligns horizontally instead of parallel to 45° wall

**Affected Scenarios:**
- Angled walls in modern architecture
- Bay windows
- Octagonal rooms
- Any non-orthogonal wall

---

## Solution

Use the exact wall angle instead of rounding to 90° increments. The furniture should align **parallel** to the wall's actual orientation.

**Updated Implementation:**

```typescript
// PlaceFurnitureTool.ts
snapToWallRotation(): void {
  if (!this.snapToWallEnabled) return;

  const walls = this.getWallSegments(); // from spatialUtils or polygon data
  let nearestWall: { segment: [Vector2, Vector2]; distance: number } | null = null;
  let minDistance = 20; // max snap distance

  // Find nearest wall within snap range
  for (const wall of walls) {
    const distance = getDistancePointToSegment(this.currentPos, wall.start, wall.end);
    if (distance < minDistance) {
      minDistance = distance;
      nearestWall = { segment: [wall.start, wall.end], distance };
    }
  }

  if (!nearestWall) {
    console.log('[PlaceFurnitureTool] No wall within 20 units for snap-to-wall');
    return;
  }

  // Calculate exact wall angle
  const [start, end] = nearestWall.segment;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const wallAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Use exact wall angle (no rounding!)
  this.currentRotation = wallAngle;

  // Update preview and flash wall
  this.updatePreviewTransform();
  this.flashWall(nearestWall.segment);

  console.log(`[PlaceFurnitureTool] Snapped to wall at ${wallAngle.toFixed(1)}°`);
}
```

**Key Change:**
- Remove: `const snappedAngle = Math.round(wallAngle / 90) * 90;`
- Use directly: `this.currentRotation = wallAngle;`

---

## Acceptance Criteria

- [ ] Furniture aligns parallel to diagonal walls (test 45° wall)
- [ ] Furniture still aligns correctly to horizontal walls (0°, 180°)
- [ ] Furniture still aligns correctly to vertical walls (90°, 270°)
- [ ] Wall flash still appears on snap
- [ ] Console log shows exact wall angle (not rounded)
- [ ] Settings toggle still works (snap-to-wall can be disabled)
- [ ] Build passes with 0 TypeScript errors
- [ ] Manual testing with various wall angles (0°, 45°, 60°, 90°, 135°)

---

## Testing Checklist

1. **Horizontal Wall (0°):**
   - Draw horizontal wall
   - Place furniture near it
   - Press 'W'
   - Verify furniture rotation = 0° or 180°

2. **Vertical Wall (90°):**
   - Draw vertical wall
   - Place furniture near it
   - Press 'W'
   - Verify furniture rotation = 90° or 270°

3. **Diagonal Wall (45°):**
   - Draw diagonal wall at 45° angle
   - Place furniture near it
   - Press 'W'
   - Verify furniture rotation = 45° (or 225° depending on wall direction)

4. **Arbitrary Angle (e.g., 30°, 60°, 135°):**
   - Draw walls at various angles
   - Place furniture near each
   - Press 'W'
   - Verify furniture aligns parallel to each wall

5. **Multiple Nearby Walls:**
   - Place furniture equidistant from two walls (different angles)
   - Press 'W'
   - Verify furniture aligns to **nearest** wall only

6. **No Wall Nearby:**
   - Place furniture far from all walls (>20 units)
   - Press 'W'
   - Verify no rotation change
   - Check console for "No wall within 20 units" message

7. **Settings Toggle:**
   - Disable "Enable Snap-to-Wall" in Settings
   - Press 'W' near wall
   - Verify no rotation change

8. **No Regressions:**
   - 'R' key rotation still works
   - Manual rotation still works
   - Wall flash still appears
   - Distance indicators still work

---

## Edge Cases

1. **Wall Direction Ambiguity:**
   - A wall segment has two parallel directions (wallAngle and wallAngle + 180°)
   - Current implementation may choose either
   - **Solution:** Consider furniture's current rotation and choose the angle closest to it (minimize rotation change)

   **Enhanced Logic:**
   ```typescript
   // Choose wall direction closest to current rotation
   let wallAngle = Math.atan2(dy, dx) * (180 / Math.PI);
   const altAngle = wallAngle + 180;

   const diff1 = Math.abs(this.currentRotation - wallAngle);
   const diff2 = Math.abs(this.currentRotation - altAngle);

   if (diff2 < diff1) {
     wallAngle = altAngle;
   }

   this.currentRotation = wallAngle;
   ```

2. **Angle Normalization:**
   - Ensure rotation stays within 0-360° range
   - **Solution:** Add normalization:
   ```typescript
   this.currentRotation = ((wallAngle % 360) + 360) % 360;
   ```

---

## References

- Worker 2 FESH Report: tmp/worker/result-worker2-FURN-REFINE-P1.md (line 275)
- Current Implementation: editor/tools/PlaceFurnitureTool.ts (lines 446-447)
- Spatial Utils: utils/spatialUtils.ts (getDistancePointToSegment function)

---

## Notes

- Consider adding **optional** snap-to-45° or snap-to-15° increments as a user preference
  - "Snap to nearest 45°" would help align furniture to common angles while supporting diagonals
  - Could be a Settings option: "Snap Angle Precision" (Exact / 45° / 15° / 90°)
- The wall flash should work correctly with diagonal walls (already uses wall segment endpoints)
- Performance should be identical (no additional computation)

---

## Future Enhancement Ideas

- **Smart rotation:** Auto-detect which side of the wall furniture is on and rotate accordingly (e.g., sofa back against wall, chair front facing room)
- **Multi-wall alignment:** If furniture is in a corner, align to nearest corner angle
- **Visual preview:** Show rotation angle overlay while 'W' is pressed (before releasing)

---

**Status:** Not Started
**Assigned To:** TBD
