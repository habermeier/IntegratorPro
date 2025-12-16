# Handoff Document: Floor Plan Magnified Cursor Issue

**Date**: 2025-12-15
**Project**: IntegratorPro - Floor Plan Map Component
**Status**: ⚠️ BLOCKED - No progress being made on magnified cursor rendering

---

## Current Problem

The magnified cursor in Topology mode is not correctly rendering the composite layer view. The cursor should show an exact 2x magnified preview of what's under the mouse position, including all visible layers (base, masks, electrical, rooms, devices), but it's showing:

1. **Offset content** - showing wrong area of floor plan
2. **Missing layers** - rooms layer not visible even when checked
3. **Masks not working** - white mask rectangles that block content in main view don't appear in cursor

---

## What We Tried (All Failed)

### Attempt 1: Fix mask rendering in cursor
- Copied exact mask rendering code from main view
- Updated mask positioning (center-based coordinates)
- Added mask color and opacity properties
- **Result**: No change

### Attempt 2: Fix viewport calculation
- Changed SVG viewBox from 75×75 to 37.5×37.5 for 2x magnification
- Updated background positioning formulas
- **Result**: No change

### Attempt 3: Created shared rendering component (FloorPlanLayers.tsx)
- Extracted layer rendering into reusable component
- Used viewport abstraction for both main view and cursor
- Single source of truth for rendering logic
- **Result**: Component renders (confirmed via console logs) but NO visual change at all

### Attempt 4: Added debug logging and visual tests
- Added console.log showing viewport, scale, masks count
- Added bright lime green border to FloorPlanLayers container
- Confirmed component IS being called with correct data (149 masks, viewport correct)
- **Result**: Logs show correct data but user sees "no change at all"

### Attempt 5: Created debug toggle button (IN PROGRESS)
- Added button to toggle between normal view and zoomed FloorPlanLayers view
- Allows testing if shared component works in main view
- **Status**: Code added but not tested yet

---

## Current Code State

### New Files Created
- **`/home/bernie/IntegratorPro/components/FloorPlanLayers.tsx`**
  - Shared component for rendering floor plan layers
  - Takes viewport (x, y, width, height in image coords) and containerSize (pixels)
  - Renders: base layer, masks, electrical with transforms, SVG overlays
  - Has bright lime green border for debugging (line 118)
  - Has console.log debugging (lines 96-108)

### Modified Files
- **`/home/bernie/IntegratorPro/components/MagnifiedCursor.tsx`**
  - Completely rewritten to use FloorPlanLayers component
  - Much simpler - just calculates viewport and delegates to shared component
  - Cursor size: 225px (3x normal for debugging)

- **`/home/bernie/IntegratorPro/components/FloorPlanMap.tsx`**
  - Added import for FloorPlanLayers (line 6)
  - Added debugZoomMode state (lines 1505-1506)
  - Added "DEBUG: Toggle Zoom" button in tools panel (lines 2945-2961)
  - Added conditional rendering for debug zoom mode (lines 3742-3778)
  - Normal view wrapped in fragment (line 3781-3782)
  - **INCOMPLETE**: Need to close the normal view fragment at end of layer rendering

---

## Key Technical Details

### Viewport Calculation (for 225px cursor at 2x magnification)
```typescript
const viewportSize = CURSOR_SIZE / MAGNIFICATION; // 225 / 2 = 112.5
const viewport = {
    x: coords.x - viewportSize / 2,  // Center viewport on cursor
    y: coords.y - viewportSize / 2,
    width: viewportSize,  // 112.5 image units
    height: viewportSize,
};
```

### Background Positioning in FloorPlanLayers
```typescript
const scale = containerSize.width / viewport.width; // 225 / 112.5 = 2
const bgWidth = naturalWidth * scale;
const bgHeight = naturalHeight * scale;
const bgX = -viewport.x * scale;
const bgY = -viewport.y * scale;
```

### Console Log Output (Confirmed Working)
```json
{
    "viewport": { "x": 319.68, "y": 1368.63, "width": 112.5, "height": 112.5 },
    "containerSize": { "width": 225, "height": 225 },
    "scale": 2,
    "masksCount": 149,
    "layersVisible": { "base": true, "electrical": true }
}
```

---

## Debugging Steps to Try Next

### 1. Test the Debug Toggle Button
- Click "DEBUG: Toggle Zoom" button in tools panel
- Should show full-screen FloorPlanLayers component with 1000×1000 viewport
- Big red banner should say "🔍 DEBUG ZOOM MODE"
- This will definitively test if FloorPlanLayers works at all

### 2. Complete the Debug Toggle Implementation
- Need to close the `{!debugZoomMode && (<>` fragment at end of layer rendering
- Search for where all layers/overlays end (after DALI devices, annotations, etc.)
- Add `</>)}` to close the fragment

### 3. If Debug Toggle Shows FloorPlanLayers Works
- Problem is specific to cursor rendering context
- Check z-index, positioning, or React rendering issues with cursor overlay
- Maybe try rendering cursor as portal?

### 4. If Debug Toggle Also Fails
- FloorPlanLayers component has fundamental bug
- Check if images are loading (network tab)
- Check if CSS is interfering
- Try simplifying component to just show one layer

### 5. Alternative Approach: Canvas-based
- If shared component approach fails entirely
- Render layers to off-screen canvas
- Sample pixels under cursor
- Display in magnified cursor

---

## File Locations

- **Main component**: `/home/bernie/IntegratorPro/components/FloorPlanMap.tsx`
- **Cursor component**: `/home/bernie/IntegratorPro/components/MagnifiedCursor.tsx`
- **Shared layers**: `/home/bernie/IntegratorPro/components/FloorPlanLayers.tsx`
- **Images**:
  - Base: `/home/bernie/IntegratorPro/images/floor-plan-clean.jpg`
  - Electrical: `/home/bernie/IntegratorPro/images/electric-plan-plain-full-clean-2025-12-12.jpg`

---

## Git Status

```
Modified: components/FloorPlanMap.tsx
Modified: components/MagnifiedCursor.tsx
Untracked: components/FloorPlanLayers.tsx
```

Build status: ✅ Compiles successfully (no TypeScript errors)

---

## User Feedback Pattern

User has repeatedly said:
- "no change at all"
- "we are making zero progress"
- "same exact issue prevails"

This suggests either:
1. Code changes aren't being picked up (caching issue?)
2. New code is rendering but looks identical to old broken implementation
3. There's a fundamental misunderstanding of the problem

---

## Recommendations for Next Session

1. **First**: Complete and test the debug toggle button - this is the most promising diagnostic tool
2. **If that works**: Investigate why cursor context is different
3. **If that fails**: Consider completely different approach (canvas, or just abandon cursor compositing)
4. **Consider**: Maybe the "old" cursor implementation was actually correct for the main view's rendering, and the issue is that we need to use the exact same rendering path, not a new shared component

---

## Questions to Investigate

1. Why does console log show correct data but user sees no visual change?
2. Is there a React rendering/update issue?
3. Is the lime green border actually visible? (User hasn't mentioned it)
4. Does the browser dev tools show the FloorPlanLayers div in the DOM?
5. Is there CSS that's hiding or overriding the component?

---

## End of Handoff

Good luck! The debug toggle is your best tool to figure out what's going on.
