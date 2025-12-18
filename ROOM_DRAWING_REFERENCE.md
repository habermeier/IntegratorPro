# Room Drawing System - Reference Documentation

**Source:** `components/FloorPlanMap.tsx` (Legacy DOM/SVG Renderer)
**Status:** ✅ Code is still active in current codebase (USE_PIXI = false)

---

## Overview

The room drawing system allows users to create polygon rooms by clicking points. When the user clicks near the first point, the polygon closes and prompts for a room name.

---

## State Management

### Key State Variables (FloorPlanMap.tsx)

```typescript
// Line 127
const [roomDrawing, setRoomDrawing] = useState<{ x: number, y: number }[] | null>(null);

// Related state
const [roomPreviewFillColor, setRoomPreviewFillColor] = useState<string | null>(null);
const [showRoomNameModal, setShowRoomNameModal] = useState(false);
const [roomNameInput, setRoomNameInput] = useState('');
const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
const [snapPoint, setSnapPoint] = useState<{ x: number, y: number, type: string } | null>(null);

// Room data
const [rooms, setRooms] = useState<Room[]>([]);

// Mode tracking
const roomDrawingActive = activeMode === 'rooms'; // Line 75
```

---

## Drawing Flow

### 1. Start Drawing (Line 2437-2444)

**User Action:** Clicks "Draw New Room" button

```typescript
// Enter drawing mode
setRoomDrawing([]);  // Empty array = ready to accept points
setRoomPreviewFillColor(null);
setSelectedRoomId(null);
setSnapPoint(null);
showHudMessage('Click to start room outline  •  Click first point to close', 5000);
```

### 2. Add Points (Line 1336-1368)

**User Action:** Clicks on canvas to add polygon vertices

```typescript
if (roomDrawingActive && roomDrawing !== null && !isSpacePressed && !showRoomNameModal && !roomPreviewFillColor) {
    const rect = containerRef.current.getBoundingClientRect();
    const containerX = e.clientX - rect.left;
    const containerY = e.clientY - rect.top;
    let clickCoords = containerPosToImageCoords(containerX, containerY);

    // Use snapped position if available
    if (snapPoint) {
        clickCoords = { x: snapPoint.x, y: snapPoint.y };
    }

    // Check if clicking near first point to close the path
    if (roomDrawing.length >= 3) {
        const firstPoint = roomDrawing[0];
        const dx = clickCoords.x - firstPoint.x;
        const dy = clickCoords.y - firstPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 20) {  // 20px snap threshold
            // Close the path and prompt for room name
            setRoomPreviewFillColor(generateRoomColor());
            setRoomNameInput('');
            setShowRoomNameModal(true);
            setSnapPoint(null);
            return;
        }
    }

    // Add point to path
    setRoomDrawing(prev => [...(prev || []), clickCoords]);
}
```

**Key Features:**
- Minimum 3 points required to close
- 20px snap distance to close on first point
- Supports vertex snapping to existing geometry
- Coordinates in image space (not screen space)

### 3. Close & Name Room (Line 3014-3070)

**User Action:** Enters room name in modal and clicks "Create Room"

```typescript
if (roomDrawing && roomDrawing.length >= 3) {
    // Creating new room
    const avgX = roomDrawing.reduce((sum, p) => sum + p.x, 0) / roomDrawing.length;
    const avgY = roomDrawing.reduce((sum, p) => sum + p.y, 0) / roomDrawing.length;

    const newRoom: Room = {
        id: `room-${Date.now()}`,
        name: roomNameInput || 'Unnamed Room',
        path: roomDrawing,
        fillColor: roomPreviewFillColor || generateRoomColor(),
        labelPosition: { x: avgX, y: avgY },
        labelRotation: 0,
        visible: true
    };

    setRooms(prev => [...prev, newRoom]);
    setRoomDrawing(null);
    setRoomPreviewFillColor(null);
    setShowRoomNameModal(false);
    setRoomNameInput('');

    showHudMessage(`Room "${newRoom.name}" created`, 2000);
}
```

### 4. Stop Drawing (Line 2431-2436)

**User Action:** Clicks "Stop Drawing" button or presses Escape

```typescript
// Exit drawing mode
setRoomDrawing(null);
setRoomPreviewFillColor(null);
setSnapPoint(null);
showHudMessage('Drawing cancelled', 2000);
```

---

## Keyboard Shortcuts

### During Drawing (Line 881-920)

```typescript
// Enter: Close path early (if 3+ points)
if (e.code === 'Enter' && roomDrawingActive && roomDrawing && roomDrawing.length >= 3 && !isTyping) {
    e.preventDefault();
    setRoomPreviewFillColor(generateRoomColor());
    setRoomNameInput('');
    setShowRoomNameModal(true);
    setSnapPoint(null);
}

// Escape: Undo last point
if (e.code === 'Escape' && roomDrawingActive && roomDrawing && roomDrawing.length > 0 && !showRoomNameModal) {
    e.preventDefault();
    const newPath = roomDrawing.slice(0, -1);
    if (newPath.length === 0) {
        setRoomDrawing(null);
        setSnapPoint(null);
        showHudMessage('Drawing cancelled', 2000);
    } else {
        setRoomDrawing(newPath);
        showHudMessage('Point removed', 1000);
    }
}
```

### When Room Selected (Line 817-859)

```typescript
// Delete: Remove selected room
if (e.code === 'Delete' && selectedRoomId && !isTyping && roomDrawing === null) {
    setRooms(prev => prev.filter(room => room.id !== selectedRoomId));
    setSelectedRoomId(null);
    showHudMessage('Room deleted', 2000);
}

// R: Rotate room label
if (e.code === 'KeyR' && selectedRoomId && !isTyping && roomDrawing === null) {
    setRooms(prev => prev.map(room => {
        if (room.id === selectedRoomId) {
            const newRotation = (room.labelRotation || 0) + 45;
            return { ...room, labelRotation: newRotation >= 360 ? 0 : newRotation };
        }
        return room;
    }));
}
```

---

## Visual Rendering

### In-Progress Room Path (Line 1807-1860)

**Rendered in FloorPlanContent.tsx** - Passed as overlay

```typescript
if (roomDrawingActive && roomDrawing !== null && containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    const scale = containerWidthRef.current / (imgRef.current?.naturalWidth || 1);

    // Draw path so far
    if (roomDrawing && roomDrawing.length >= 3) {
        const firstPoint = roomDrawing[0];
        const firstPointScreen = imageCoordsToContainerPos(firstPoint.x, firstPoint.y);

        // Show close indicator when hovering near first point
        if (vertexSnap?.type === 'path-start') {
            // Draw snap circle around first point
        }
    }

    // Live preview path with mouse position
    const previewPath = [...roomDrawing];
    if (mousePosition) {
        previewPath.push(mousePosition);
    }

    // Render polygon preview
}
```

### Completed Rooms (FloorPlanContent.tsx)

Rooms passed as prop and rendered as SVG polygons with fill colors and labels.

---

## Room Selection (Line 1374-1402)

**User Action:** Clicks inside a room polygon when not drawing

```typescript
if (roomDrawingActive && roomDrawing === null && !isSpacePressed) {
    const clickCoords = containerPosToImageCoords(containerX, containerY);

    // Check if clicking inside any room using point-in-polygon test
    let clickedRoomId: string | null = null;
    for (const room of rooms) {
        if (room.visible && isPointInPolygon(clickCoords, room.path)) {
            clickedRoomId = room.id;
            break;
        }
    }

    if (clickedRoomId) {
        setSelectedRoomId(clickedRoomId);
        const room = rooms.find(r => r.id === clickedRoomId);
        showHudMessage(`Room "${room?.name}" selected  •  R: rotate label  •  Del: delete`, 3000);
        return;
    } else {
        setSelectedRoomId(null);
    }
}
```

---

## Point-in-Polygon Algorithm (Line 310-321)

**Ray-casting algorithm** for hit detection:

```typescript
const isPointInPolygon = (point: { x: number, y: number }, polygon: { x: number, y: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};
```

---

## Data Persistence

### Save to Server (Line 1117-1143)

```typescript
useEffect(() => {
    if (!roomsMountedRef.current) {
        roomsMountedRef.current = true;
        return;
    }

    const timer = setTimeout(() => {
        fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rooms }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log('Rooms saved to server');
            }
        });
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
}, [rooms]);
```

### Load from Server (Line 1044-1056)

```typescript
useEffect(() => {
    fetch('/api/rooms')
        .then(res => res.json())
        .then(data => {
            if (data && data.rooms) {
                setRooms(data.rooms);
                console.log('Loaded rooms from server:', data);
            }
        })
        .catch(err => {
            console.error('Failed to load rooms:', err);
        });
}, []);
```

---

## Key Insights for Pixi Implementation

### What Works Well:
1. ✅ **Click-to-add points** - Simple, intuitive
2. ✅ **Snap-to-close** - 20px threshold works great
3. ✅ **Visual feedback** - Live preview path with mouse
4. ✅ **Keyboard shortcuts** - Enter to close, Escape to undo
5. ✅ **Point-in-polygon selection** - Ray-casting algorithm is fast
6. ✅ **Debounced auto-save** - Prevents excessive API calls

### Could Be Reused for Masks:
- Same click-to-add-points mechanism
- Same snap-to-close logic
- Same selection via point-in-polygon test
- **BUT:** Masks might want rectangles instead of free polygons
  - Could add "rectangle mode" vs "polygon mode"
  - Rectangle mode: Click 2 opposite corners
  - Polygon mode: Current system

### Coordinate System:
- All room paths stored in **image coordinates** (not screen space)
- Conversion functions:
  - `containerPosToImageCoords(x, y)` - Screen → Image
  - `imageCoordsToContainerPos(x, y)` - Image → Screen
- This makes rooms resolution-independent

### State Pattern:
```
roomDrawing = null        → Not drawing (selection mode)
roomDrawing = []          → Drawing started, no points yet
roomDrawing = [{x,y}, ...] → Actively drawing, N points placed
```

---

## Next Steps for Pixi

1. **Reuse the state logic** - Same `roomDrawing` state pattern
2. **Render in Pixi** - Replace SVG with PIXI.Graphics polygons
3. **Snap circles** - Use PIXI.Graphics instead of SVG circles
4. **Hit detection** - Same point-in-polygon algorithm works
5. **Consider dual modes for masks:**
   - Rectangle mode (2 clicks)
   - Polygon mode (reuse room logic)

---

## File Locations

- **Main logic:** `components/FloorPlanMap.tsx` (lines 127, 1330-1402, 2430-2465, 3014-3070)
- **Rendering:** `components/FloorPlanContent.tsx` (rooms passed as props)
- **API:** `server.js` (lines 230-232 for /api/rooms endpoint)
- **Algorithms:** Point-in-polygon (line 310), coordinate conversion utilities

---

**This is complete, production-tested code that has been used for hours of work.** The logic is solid and can be ported to Pixi with confidence.
