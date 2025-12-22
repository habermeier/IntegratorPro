# Fix Furniture Tab Z-Index (Should Not Obstruct Layer Windows)

**Priority:** P2 (UX Issue)
**Effort:** Small (15-30 minutes)
**Type:** UI/Layout Fix
**Origin:** User feedback during P2 cycle review

---

## Problem

The right-side furniture tab obstructs the layer window(s). It should be below the layer windows in z-index stacking order.

**Current Behavior:**
- Furniture tab appears on top of layer windows
- Layer windows are hidden/covered by furniture tab
- User cannot interact with layer windows when furniture tab is open

**Expected Behavior:**
- Layer windows should appear on top of furniture tab
- Furniture tab should be below layer windows in z-index
- User can always access layer windows regardless of furniture tab state

---

## Solution

Adjust CSS z-index values for furniture tab and layer windows to ensure proper stacking order.

**Approach:**
1. Find furniture tab component and its z-index
2. Find layer window components and their z-index
3. Ensure layer windows have higher z-index than furniture tab
4. Test that layer windows are always accessible

**Likely Files:**
- Furniture tab: `components/FurnitureTab.tsx` or similar
- Layer windows: `components/LayerPanel.tsx` or `components/Layers.tsx`
- Styles: Check for inline styles or CSS modules

**Z-Index Hierarchy (Recommended):**
```
Base floor plan: z-index: 0
Furniture tab: z-index: 100
Layer windows: z-index: 200
Modals/dialogs: z-index: 1000
```

---

## Acceptance Criteria

- [ ] Layer windows appear on top of furniture tab
- [ ] Furniture tab does not obstruct layer windows
- [ ] User can interact with layer windows when furniture tab is open
- [ ] No regressions in other UI element stacking (modals, tooltips, etc.)
- [ ] Build passes with 0 errors
- [ ] Manual testing confirms correct z-index order

---

## Testing Checklist

1. **Open furniture tab:**
   - Verify furniture tab appears
   - Note its position on screen

2. **Open layer window:**
   - Verify layer window appears on top of furniture tab
   - Verify layer window is not hidden or obstructed
   - Verify user can click/interact with layer window

3. **Both open simultaneously:**
   - Open furniture tab
   - Open layer window
   - Verify layer window is fully visible and accessible
   - Verify furniture tab is behind layer window

4. **Close/open sequence:**
   - Close layer window
   - Verify furniture tab still visible
   - Reopen layer window
   - Verify layer window appears on top again

5. **No regressions:**
   - Test other UI elements (Settings modal, error dialogs, tooltips)
   - Verify z-index changes don't break other overlays

---

## References

- User feedback: "the right side furniture tab should not obstruct the layer window(s). It should be below it."
- Date reported: 2025-12-21 (during P2 cycle review)

---

**Status:** Not Started
**Assigned To:** TBD
