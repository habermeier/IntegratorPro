# Magnified Cursor System - Product Requirements Document

**Source:** `components/MagnifiedCursor.tsx` + `components/FloorPlanMap.tsx`
**Status:** ✅ Code is active and production-tested
**Purpose:** Provides 2x zoom lens that follows cursor for precise placement

---

## Overview

The magnified cursor is a **250px circular lens** that shows the floor plan at **2x magnification** relative to current screen zoom. It enables precise placement of devices, polygon points, and other elements.

### Key Behavior:
- **Spacebar + Drag** → PAN mode (blue border)
- **No Spacebar** → PLACE mode (red/green border, places "thing")
- **"Thing"** = polygon point, device, measurement point, etc. (context-dependent)

---

## Constants

```typescript
// components/MagnifiedCursor.tsx Lines 3-5
const ZOOM_CURSOR_SIZE = 250;       // Lens diameter in pixels
const ZOOM_MAGNIFICATION = 2;       // 2x relative to current screen zoom
```

---

## When to Show Cursor

**Logic:** `components/FloorPlanMap.tsx` Lines 495-504

```typescript
const showZoomCursor = useMemo(() =>
    (activeTool === 'scale' && scalePoints.length < 2) ||
    (activeTool === 'measure' && measurePoints.length < 2) ||
    (activeTool === 'topology' && !routingMode && !draggingDeviceId) ||
    (maskEditingActive && maskTool === 'draw') ||
    (roomDrawingActive && roomDrawing !== null && !roomPreviewFillColor),
    [activeTool, scalePoints.length, measurePoints.length, routingMode,
        draggingDeviceId, maskEditingActive, maskTool, roomDrawingActive,
        roomDrawing, roomPreviewFillColor]
);
```

**Show when:**
- ✅ Scale tool (placing calibration points)
- ✅ Measure tool (placing measurement points)
- ✅ Topology mode (placing devices)
- ✅ Mask drawing mode (drawing mask polygons)
- ✅ Room drawing mode (drawing room polygons)

**Hide when:**
- ❌ Room preview has fill color (about to name room)
- ❌ Dragging a device
- ❌ In routing mode
- ❌ Tool is inactive

---

## Mode Labels & Border Colors

**Mode Label Logic:** Lines 507-514

```typescript
const cursorModeLabel = useMemo(() => {
    if (activeTool === 'scale') return 'SCALE';
    if (activeTool === 'measure') return 'MEASURE';
    if (activeTool === 'topology') return 'PLACE';
    if (maskEditingActive) return 'DRAW';
    if (roomDrawingActive) return 'ROOM';
    return '';
}, [activeTool, maskEditingActive, roomDrawingActive]);
```

**Border Color Logic:** Lines 517-520

```typescript
const cursorBorderColor = useMemo(() => {
    if (roomDrawingActive) return '#22c55e'; // Green for room drawing
    return '#ef4444'; // Red for all other modes
}, [roomDrawingActive]);
```

**Dynamic Colors:**
- **Red (`#ef4444`)** - Default (scale, measure, topology, mask)
- **Green (`#22c55e`)** - Room drawing mode
- **Blue (`#3b82f6`)** - PAN mode (when spacebar held)

---

## Spacebar Pan Mode

**Implementation:** `components/MagnifiedCursor.tsx` Lines 64-87

### Key Down (Spacebar Pressed):
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return; // Ignore in text inputs
    if (e.code === 'Space') {
        e.preventDefault();
        setIsPanning(true);
        onPanStateChange(true); // Notify parent
    }
};
```

### Key Up (Spacebar Released):
```typescript
const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
        e.preventDefault();
        setIsPanning(false);
        onPanStateChange(false); // Notify parent
    }
};
```

### Visual Feedback:
```typescript
// Lines 129-130
const modeLabel = isPanning ? 'PAN' : baseMode;
const effectiveBorderColor = isPanning ? '#3b82f6' : borderColor;
```

**Parent Integration:**
```typescript
// FloorPlanMap.tsx Line 2988
onPanStateChange={setIsSpacePressed}
```

Parent's `isSpacePressed` state prevents placement actions while panning.

---

## Coordinate System & Magnification

### Magnification Calculation (Line 106):
```typescript
const lensScale = currentScale * ZOOM_MAGNIFICATION;
```

- `currentScale` = Current zoom level from `react-zoom-pan-pinch` transform
- `ZOOM_MAGNIFICATION` = 2x
- Result: Lens shows content at 2x current zoom

### Centering Math (Lines 125-126):
```typescript
const offsetX = (ZOOM_CURSOR_SIZE / 2) - (naturalCoords.x * lensScale);
const offsetY = (ZOOM_CURSOR_SIZE / 2) - (naturalCoords.y * lensScale);
```

**How it works:**
1. Get natural image coordinates under cursor: `getNaturalCoords(mouseX, mouseY)`
2. Scale those coordinates: `naturalCoords.x * lensScale`
3. Offset to center in 250px lens: `(250 / 2) - scaledCoord`

**Result:** The point under cursor appears at center of lens.

---

## Rendering Architecture

### DOM Structure:

```
<div> (Lens Container - 250x250px, follows cursor)
  ├── <div> (Content Container - naturalWidth x naturalHeight)
  │   └── {renderContent({ idPrefix: 'zoom-lens-' })}  ← Floor plan content
  ├── <div> (Crosshair - red dot at center)
  └── <div> (Mode Label - bottom right corner)
```

### Lens Container (Lines 133-143):
```typescript
<div
    className="absolute z-50 pointer-events-none overflow-hidden bg-black rounded-lg shadow-2xl"
    style={{
        left: mousePos.x - (ZOOM_CURSOR_SIZE / 2),  // Center on cursor
        top: mousePos.y - (ZOOM_CURSOR_SIZE / 2),
        width: ZOOM_CURSOR_SIZE,
        height: ZOOM_CURSOR_SIZE,
        border: `3px solid ${effectiveBorderColor}`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
    }}
>
```

### Content Container (Lines 145-159):
```typescript
<div
    style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: naturalWidth,         // Full natural image size
        height: naturalHeight,
        transformOrigin: '0 0',
        transform: `translate(${offsetX}px, ${offsetY}px) scale(${lensScale})`,
        willChange: 'transform',     // GPU optimization hint
        backfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'subpixel-antialiased',
    }}
>
```

**Performance Optimizations:**
- `willChange: 'transform'` - Tells browser to use GPU
- `backfaceVisibility: 'hidden'` - Forces hardware acceleration
- `WebkitFontSmoothing: 'subpixel-antialiased'` - Better text rendering

### Crosshair (Lines 165-173):
```typescript
<div
    className="absolute w-2 h-2 bg-red-500 rounded-full shadow-sm"
    style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
    }}
/>
```

### Mode Label (Lines 176-180):
```typescript
<div className="absolute bottom-1 right-1 text-white text-[10px] font-bold bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm z-60">
    [{modeLabel}]
</div>
```

---

## Content Rendering (DRY Pattern)

**Key Insight:** Content is rendered by a **callback function** passed as prop.

```typescript
// MagnifiedCursor.tsx Line 39
renderContent: (props: { idPrefix: string }) => React.ReactNode;
```

**Why `idPrefix`?**
- SVG filters use IDs (e.g., `#drop-shadow-filter`)
- Main view and lens view both render same content
- Need unique IDs to avoid conflicts
- Lens uses `idPrefix: 'zoom-lens-'`
- Main view uses `idPrefix: ''` (default)

**Parent Usage (FloorPlanMap.tsx Lines 2968-2987):**
```typescript
renderContent={({ idPrefix }) => (
    <FloorPlanContent
        idPrefix={idPrefix}  // ← CRITICAL for SVG ID scoping
        imgRef={lensImgRef}
        layers={layers}
        baseImageUrl={CLEAN_IMAGE}
        electricalImageUrl={ELECTRICAL_IMAGE}
        overlayMasks={overlayMasks}
        masksVisible={masksVisible}
        rooms={rooms}
        daliDevices={daliDevices}
        electricalOverlay={electricalOverlay}
        naturalWidth={imgRef.current?.naturalWidth}
        naturalHeight={imgRef.current?.naturalHeight}
        renderDeviceIcon={renderDeviceIcon}
        selectedDeviceId={selectedDeviceId}
        routingPath={routingPath}
        activeTool={activeTool}
    />
)}
```

**FloorPlanContent (components/FloorPlanContent.tsx):**
- Renders all layers (base, electrical, rooms, masks, devices)
- Uses `idPrefix` to scope SVG filter IDs
- **Same component** used for both main view and lens
- **DRY!** No duplicate rendering logic

---

## Integration Props

**MagnifiedCursor Component Interface (Lines 7-42):**

```typescript
interface MagnifiedCursorProps {
    // Mode label to display (SCALE, MEASURE, PLACE, DRAW, ROOM)
    baseMode: string;

    // Optional border color (defaults to red)
    borderColor?: string;

    // Mouse position and state
    mousePos: { x: number; y: number } | null;
    isMouseOverFloorPlan: boolean;
    enabled: boolean;

    // Coordinate mapping - converts screen coords to natural image coords
    getNaturalCoords: (screenX: number, screenY: number) => { x: number; y: number };

    // Natural image dimensions
    naturalWidth: number;
    naturalHeight: number;

    // Current zoom scale (from react-zoom-pan-pinch transform)
    currentScale?: number;

    // Render callback for lens content
    renderContent: (props: { idPrefix: string }) => React.ReactNode;

    // Callback when pan state changes (spacebar pressed/released)
    onPanStateChange: (isPanning: boolean) => void;
}
```

---

## DRY Strategy for "Place Thing" Actions

### Current Pattern (Non-DRY):

Each tool has its own click handler:
- Room drawing: Adds polygon point
- Mask drawing: Adds polygon point
- Device placement: Places device
- Scale tool: Adds calibration point
- Measure tool: Adds measurement point

### Proposed DRY Pattern:

**1. Unified Action Interface:**
```typescript
interface PlacementAction {
    type: 'polygon-point' | 'device' | 'calibration' | 'measurement';
    execute: (coords: { x: number; y: number }) => void;
    canPlace: () => boolean;
}
```

**2. Mode-Specific Factories:**
```typescript
const getRoomDrawingAction = (): PlacementAction => ({
    type: 'polygon-point',
    execute: (coords) => setRoomDrawing(prev => [...(prev || []), coords]),
    canPlace: () => roomDrawing !== null && !roomPreviewFillColor,
});

const getMaskDrawingAction = (): PlacementAction => ({
    type: 'polygon-point',
    execute: (coords) => setMaskDrawing(prev => [...(prev || []), coords]),
    canPlace: () => maskDrawing !== null,
});

const getDevicePlacementAction = (): PlacementAction => ({
    type: 'device',
    execute: (coords) => addDevice(coords),
    canPlace: () => !draggingDeviceId && !routingMode,
});
```

**3. Unified Click Handler:**
```typescript
const handleCanvasClick = (e: React.PointerEvent) => {
    if (isSpacePressed) return; // Pan mode, don't place

    const action = getCurrentPlacementAction();
    if (!action || !action.canPlace()) return;

    const coords = containerPosToImageCoords(e.clientX, e.clientY);
    action.execute(coords);
};
```

**Benefits:**
- ✅ Single click handler for all placement modes
- ✅ Mode logic encapsulated in factories
- ✅ Easy to add new placement types
- ✅ Consistent spacebar pan behavior

---

## Pixi Implementation Notes

### For Pixi Renderer:

**1. Replace DOM Lens with Pixi Viewport:**
- Use separate `PIXI.Application` for lens
- Or use nested `Viewport` within main viewport
- Scale factor: `lensScale = currentScale * 2`

**2. Coordinate Mapping:**
- Same math applies: `offsetX = (250/2) - (naturalX * lensScale)`
- Pixi uses same coordinate system (top-left origin)

**3. Content Rendering:**
- Instead of `renderContent()` callback, pass layer data
- Render same layers in both main + lens viewports
- Use same LayerManager logic (DRY!)

**4. Crosshair:**
- Use `PIXI.Graphics` instead of DOM div
- Draw circle at viewport center

**5. Border:**
- Render with CSS on container div (like current)
- Or use PIXI.Graphics rounded rectangle

---

## Anti-Aliasing for Pixi

**User Request:** "when we are zoomed out of the map, I'd like to use some kind of anti-aliasing if possible. Things look a bit garbage without that."

### Solution: Enable Antialiasing in PIXI.Application

**Current Code (FloorPlanStage.tsx Line 340-345):**
```typescript
<Application
    onInit={handleInit}
    resizeTo={containerRef}
    backgroundAlpha={1}
    background={0x1a1a1a}
    preference="webgl"
/>
```

**Add Antialiasing:**
```typescript
<Application
    onInit={handleInit}
    resizeTo={containerRef}
    backgroundAlpha={1}
    background={0x1a1a1a}
    preference="webgl"
    antialias={true}  // ← ADD THIS
/>
```

**What it does:**
- Enables MSAA (Multi-Sample Anti-Aliasing) in WebGL
- Smooths edges of sprites, graphics, and text
- Slight performance cost but worth it for quality
- Especially visible when zoomed out

**Alternative: Texture Filtering**
```typescript
// For individual sprites/textures
sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR; // Smooth
// vs
sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST; // Pixelated
```

Use `LINEAR` for smooth downscaling (zoomed out), `NEAREST` for pixel art.

---

## Testing Checklist

### Magnified Cursor:
- [ ] Lens appears when entering placement modes
- [ ] Lens follows cursor smoothly (no lag)
- [ ] 2x magnification works correctly
- [ ] Crosshair centered on cursor position
- [ ] Spacebar switches to PAN mode (blue border)
- [ ] Releasing spacebar returns to PLACE mode
- [ ] Mode label updates correctly
- [ ] Border color changes per mode (red/green/blue)
- [ ] Lens hides when exiting placement mode
- [ ] No SVG ID conflicts between main + lens views

### Placement Actions:
- [ ] Click places polygon point (room mode)
- [ ] Click places polygon point (mask mode)
- [ ] Click places device (topology mode)
- [ ] Click places calibration point (scale mode)
- [ ] Click places measurement point (measure mode)
- [ ] Spacebar + click pans (doesn't place)
- [ ] No placement during drag operations

### Anti-Aliasing:
- [ ] Edges smooth when zoomed out
- [ ] Text readable at all zoom levels
- [ ] No excessive blur
- [ ] Performance acceptable

---

## Key Files

- **`components/MagnifiedCursor.tsx`** - Lens component (184 lines)
- **`components/FloorPlanMap.tsx`** - Integration (lines 495-520, 2958-2989)
- **`components/FloorPlanContent.tsx`** - Shared rendering (uses idPrefix)
- **`components/FloorPlanStage.tsx`** - Pixi renderer (add antialias)

---

## Summary

The magnified cursor is a **production-ready, DRY, reusable component** that:
1. ✅ Provides 2x zoom lens for precise placement
2. ✅ Supports spacebar pan mode
3. ✅ Works with any content via `renderContent()` callback
4. ✅ Handles coordinate mapping automatically
5. ✅ Provides visual feedback (borders, labels, crosshair)
6. ✅ Prevents SVG ID conflicts with `idPrefix`

**Ready to port to Pixi!** The core logic (coordinates, pan mode, placement actions) is solid and can be reused.
