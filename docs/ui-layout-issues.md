# UI Layout Issues - Floor Plan Editor

## Critical Issues

### 1. Bottom HUD Overlap ❌
**Problem:** Dark stats bar blocks floor plan content
**Location:** Bottom center, overlapping floor plan
**Fix:** Move to top-right corner as compact card, or make dismissible

### 2. Left Panel (Device Library) Inefficiency ❌
**Problem:** 
- Only 4 fixtures visible with huge icons
- Excessive spacing
- Prominent delete button
**Fix:**
- Reduce icon size to 48px (currently ~80px)
- Tighter grid layout (3 columns instead of 2)
- Move delete button to context menu
- Make "Add Fixture" button smaller/icon-only

### 3. Right Panel (Layers) Inefficiency ❌
**Problem:**
- Excessive vertical padding on each layer
- "SHIMMY" badges unclear
- Opacity slider always visible
**Fix:**
- Reduce layer item height by 40%
- Remove/clarify SHIMMY badges
- Only show opacity slider on hover/selection

### 4. Top Bar Crowding ❌
**Problem:**
- Competing labels
- Cramped icon buttons
- Unnecessary "PRIMARY" badge
**Fix:**
- Consolidate into single status line
- Increase icon button spacing
- Remove PRIMARY badge

### 5. Canvas Tooltips Overlap ❌
**Problem:** "SELECT" and "FAST ZOOM" tooltips block view
**Fix:** Move to top-left corner as small status indicator

### 6. Zoom Cursor Size ❌
**Problem:** Large red reticle is intrusive
**Fix:** Reduce size by 30%

## Recommended Layout Changes

### Priority 1: Bottom HUD
- Move stats to top-right as compact card
- Only show during placement mode
- Add close button

### Priority 2: Compact Panels
- Device Library: 3-column grid, 48px icons
- Layers Panel: Reduce padding, hover-only controls

### Priority 3: Clean Canvas
- Remove center tooltips
- Smaller zoom cursor
- Better mode indicators

## Screen Real Estate Optimization

**Current Usage:**
- Left Panel: ~200px (could be 180px)
- Right Panel: ~250px (could be 200px)  
- Top Bar: ~120px (could be 80px)
- Bottom HUD: ~80px (should be 0px when not needed)
- **Total Lost:** ~450px of vertical space

**Optimized:**
- Gain ~100px horizontal (narrower panels)
- Gain ~120px vertical (smaller top bar + remove bottom HUD)
- **Net Gain:** ~15% more canvas space
