# Complete Floor Plan Editor Implementation Prompt

## Project Overview

You are implementing a complete **Three.js-based interactive floor plan editor** for a React/TypeScript application. This replaces an existing PixiJS implementation with a more robust, scalable architecture.

## What You're Building

An interactive editor where users can:
- Load and align multiple floor plan images (base + electrical overlay)
- Pan and zoom with a magnified cursor for precision
- Draw and edit room boundaries (polygons)
- Draw multi-segment cable runs for electrical/network/HVAC systems
- Place and rotate symbols (lights, switches, sensors, outlets, etc.)
- Measure distances with real-world calibration
- Manage layers (visibility, opacity, transforms)
- Undo/redo all operations
- Auto-save with snapshots
- Export data for production use

## Critical Documents to Read First

**MUST READ IN ORDER:**

1. **`THREEJS_ARCHITECTURE.md`** - Complete architecture design with all systems, patterns, and implementation phases
2. **`requirements/floorplan-annotation.md`** - Full feature requirements and specifications
3. **`THREEJS_MIGRATION_PLAN.md`** - Context on why Three.js and primitives test plan
4. **`MAGNIFIED_CURSOR_PRD.md`** - Zoom cursor specification (2x magnification, spacebar pan mode)

**Reference Implementation (Tests 1.1-3.2):**
- `tests/threejs/Test1_1_HelloWorld.tsx` - Basic scene setup
- `tests/threejs/Test1_2_BasicGeometry.tsx` - Camera framing and zoom
- `tests/threejs/Test2_1_MultiViewport.tsx` - Multi-camera rendering (note: zoom cursor Y-axis needs fix)
- `tests/threejs/Test3_1_TextureLoading.tsx` - Texture loading with aspect ratio preservation
- `tests/threejs/Test3_2_LayeredTextures.tsx` - Multiple layers with transforms

These tests **prove the primitives work**. Extract patterns from them.

## Architecture Overview

The system is organized into **8 core systems** following MVC and component-based patterns:

```
FloorPlanEditor (Facade)
├── LayerSystem          # Manage visual layers with transforms
├── CameraSystem         # Pan, zoom, multi-viewport, coordinate conversion
├── ToolSystem           # Tool state machine and delegation
├── SelectionSystem      # Raycasting and object picking
├── CommandManager       # Undo/redo with command pattern
├── StateManager         # Persistence and snapshots
└── React Integration    # Thin UI wrapper
```

**See `THREEJS_ARCHITECTURE.md` for complete system designs, interfaces, and code examples.**

## Implementation Phases

Follow the 5-phase approach defined in the architecture document:

### Phase 1: Foundation - Rendering & Navigation
- LayerSystem (image layers, visibility, opacity, transforms)
- CameraSystem (pan, zoom, multi-viewport, magnified cursor)
- FloorPlanEditor facade
- React integration (FloorPlanRenderer component)

### Phase 2: Interaction - Tools, Selection & History
- ToolSystem (framework, state machine)
- SelectionSystem (raycasting, multi-select)
- CommandManager (undo/redo with command pattern)
- SelectTool and PanTool

### Phase 3: Content Creation - Drawing & Editing
- Vector editing system (polygons, vertices)
- DrawRoomTool, DrawCableTool, DrawMaskTool
- ScaleTool (calibration), MeasureTool
- Vector layer support

### Phase 4: Annotations - Symbols & Metadata
- Symbol library with categories (6 categories from requirements)
- PlaceSymbolTool with rotation
- Room assignment (point-in-polygon)
- Annotation layer support
- Symbol properties and metadata

### Phase 5: Production - Persistence, Performance & Polish
- StateManager (centralized state, serialization)
- PersistenceService (base + override pattern, auto-save)
- Performance optimizations (dirty regions, pooling)
- Keyboard shortcuts
- Testing and documentation

## File Structure to Create

```
src/
├── editor/
│   ├── FloorPlanEditor.ts           # Main facade
│   ├── systems/
│   │   ├── LayerSystem.ts
│   │   ├── CameraSystem.ts
│   │   ├── ToolSystem.ts
│   │   ├── SelectionSystem.ts
│   │   ├── CommandManager.ts
│   │   └── StateManager.ts
│   ├── tools/
│   │   ├── Tool.ts                  # Base interface
│   │   ├── SelectTool.ts
│   │   ├── PanTool.ts
│   │   ├── DrawRoomTool.ts
│   │   ├── DrawCableTool.ts
│   │   ├── DrawMaskTool.ts
│   │   ├── PlaceSymbolTool.ts
│   │   ├── MeasureTool.ts
│   │   └── ScaleTool.ts
│   ├── commands/
│   │   ├── Command.ts               # Base interface
│   │   ├── AddRoomCommand.ts
│   │   ├── AddCableRunCommand.ts
│   │   ├── MoveObjectCommand.ts
│   │   ├── DeleteObjectCommand.ts
│   │   ├── TransformLayerCommand.ts
│   │   └── PlaceSymbolCommand.ts
│   ├── models/
│   │   ├── Layer.ts
│   │   ├── Room.ts
│   │   ├── CableRun.ts
│   │   ├── Symbol.ts
│   │   ├── OverlayMask.ts
│   │   └── types.ts                 # Shared types
│   └── utils/
│       ├── geometry.ts              # Vector2, point-in-polygon, etc.
│       ├── math.ts                  # Coordinate conversion, transforms
│       └── symbolLibrary.ts         # Symbol definitions
├── components/
│   ├── FloorPlanRenderer.tsx        # Main React component
│   ├── LayerPanel.tsx               # Layer visibility/opacity controls
│   ├── ToolPalette.tsx              # Tool selection UI
│   ├── SymbolLibrary.tsx            # Symbol categories and picker
│   ├── PropertiesPanel.tsx          # Selected object properties
│   ├── HistoryControls.tsx          # Undo/redo buttons
│   └── SnapshotManager.tsx          # Save/load snapshots UI
├── hooks/
│   ├── useEditor.ts                 # Editor instance hook
│   └── useEditorState.ts            # State sync hook
└── services/
    ├── PersistenceService.ts        # Server API integration
    └── api.ts                       # API client
```

## Key Implementation Guidelines

### 1. Coordinate System - CRITICAL

**Inverted Y-axis for 2D rendering:**
```typescript
// Main camera setup
const camera = new THREE.OrthographicCamera(
    0, width,      // left, right
    height, 0,     // top, bottom (INVERTED!)
    0.1, 1000
);
// This makes (0,0) = top-left, matching screen coordinates
```

**World coordinate system = Base layer:**
- Base floor plan image defines world space (e.g., 8000×5333 pixels)
- All objects positioned in world coordinates
- Other layers transform relative to base layer
- Raycasting: screen → world (base layer) → inverse transform for other layers

### 2. Multi-Viewport Rendering - CRITICAL

```typescript
renderer.autoClear = false; // MUST set this!

renderer.clear();

// Main viewport
renderer.setViewport(0, 0, width, height);
renderer.setScissor(0, 0, width, height);
renderer.setScissorTest(true);
renderer.clearDepth();
renderer.render(scene, mainCamera);

// Zoom cursor viewport (250x250, 2x magnification)
renderer.setViewport(zoomX, zoomY, 250, 250);
renderer.setScissor(zoomX, zoomY, 250, 250);
renderer.clearDepth();
renderer.render(scene, zoomCamera);

renderer.setScissorTest(false);
```

### 3. Command Pattern for Undo/Redo

Every mutable operation = command:
```typescript
interface Command {
  execute(): void;
  undo(): void;
  redo?(): void;
  type: string;
  description: string;
  timestamp: number;
}

// Example: Adding a room
class AddRoomCommand implements Command {
  private room: Room;

  execute(): void {
    layerSystem.addPolygon('rooms', this.room);
  }

  undo(): void {
    layerSystem.removePolygon('rooms', this.room.id);
  }
}
```

### 4. Tool Pattern - State Machine

```typescript
interface Tool {
  type: ToolType;
  cursor: string;

  onActivate(): void;
  onDeactivate(): void;

  onPointerDown(worldPos: Vector2, event: PointerEvent): void;
  onPointerMove(worldPos: Vector2, event: PointerEvent): void;
  onPointerUp(worldPos: Vector2, event: PointerEvent): void;
  onKeyDown(event: KeyboardEvent): void;
  onKeyUp(event: KeyboardEvent): void;

  render(scene: THREE.Scene): void; // For preview overlays
  dispose(): void;
}
```

### 5. Layer System - Scene Graph

```typescript
interface Layer {
  id: string;
  name: string;
  type: 'image' | 'vector' | 'annotation';
  zIndex: number;
  visible: boolean;
  opacity: number;
  transform: {
    position: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number;
  };
  container: THREE.Group; // All layer content here
  content: ImageLayerContent | VectorLayerContent | AnnotationLayerContent;
}
```

### 6. Raycasting with Transformed Layers

```typescript
raycast(screenPos: Vector2): Selectable | null {
  // 1. Convert screen → world (base layer coords)
  const worldPos = cameraSystem.screenToWorld(screenPos);

  // 2. For each layer, apply inverse transform
  for (const layer of layers) {
    const localPos = worldToLayerLocal(worldPos, layer);

    // 3. Check if point hits layer geometry
    if (pointInLayerBounds(localPos, layer)) {
      return layer;
    }
  }

  return null;
}
```

### 7. Dirty Flag Pattern - Performance

Only re-render changed layers:
```typescript
class LayerSystem {
  private dirtyLayers: Set<string> = new Set();

  markDirty(layerId: string): void {
    this.dirtyLayers.add(layerId);
  }

  render(): void {
    if (this.dirtyLayers.size === 0) return;

    for (const id of this.dirtyLayers) {
      this.updateLayer(id);
    }

    this.dirtyLayers.clear();
  }
}
```

### 8. React Integration - Thin Wrapper

```typescript
export const FloorPlanRenderer: React.FC = () => {
  const editorRef = useRef<FloorPlanEditor | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');

  useEffect(() => {
    const editor = new FloorPlanEditor(containerRef.current);

    // Sync state from editor to React
    editor.on('layers-changed', setLayers);
    editor.on('tool-changed', setActiveTool);

    editor.load(); // Load initial state

    return () => editor.dispose();
  }, []);

  return (
    <div className="flex h-full">
      <LayerPanel layers={layers} onChange={(id, props) =>
        editorRef.current?.setLayerProps(id, props)
      } />

      <div ref={containerRef} className="flex-1" />

      <ToolPalette activeTool={activeTool} onChange={(tool) =>
        editorRef.current?.setActiveTool(tool)
      } />
    </div>
  );
};
```

## Detailed Requirements from Docs

### Layer Management (from requirements)
- Base floor plan (always visible)
- Electrical overlay (transformable: translate, scale, rotate, opacity)
- Wall vectors (AI-extracted, filterable)
- Room boundaries (user-drawn polygons)
- Cable runs (multi-segment paths with branching)
- Overlay masks (hide unwanted content)
- Symbols (6 categories with SVG definitions)

### Symbol Categories (from requirements)
1. **Lighting** - Recessed, pendant, chandelier, ceiling fan, exterior
2. **LV Controls** - KNX switch, presence sensor, humidity/VOC sensor
3. **Receptacles** - Standard, GFCI, 240V
4. **HVAC** - DC vent fan, motorized skylight, weather station
5. **Safety** - Smoke/CO alarm combo
6. **Infrastructure** - LCP panel, Ethernet switch

### Drawing Tools Behavior (from requirements)
- **DrawRoomTool**: Click-to-add vertices, close polygon (click near first point or Enter)
- **DrawCableTool**: Multi-segment paths, unlimited points, branching support, vertical drops (Ctrl+Click)
- **DrawMaskTool**: Rectangular masks to hide overlay content
- **ScaleTool**: Two-point calibration with real-world distance input (flexible parsing: "10'", "3m", "12' 6\"")
- **MeasureTool**: Multi-point distance measurement with per-segment labels

### Persistence (from requirements)
**Base + Override Pattern:**
- Base files (version controlled): `layout.json`, `scale.json`, `cableRuns.json`
- Override files (gitignored): `layout.local.json`, `scale.local.json`, `cableRuns.local.json`
- GET `/api/{resource}` reads override if exists, else base
- POST `/api/{resource}` writes to override
- Auto-save debounced 500ms
- Snapshot system (save/load/delete named snapshots)

### Keyboard Shortcuts (from requirements)
- **Ctrl+Z** / **Cmd+Z**: Undo
- **Ctrl+Shift+Z** / **Cmd+Shift+Z**: Redo
- **ESC**: Cancel current operation / Clear selection
- **Delete**: Delete selected object
- **R**: Rotate symbol 45° clockwise
- **Shift+R**: Rotate symbol 45° counter-clockwise
- **Shift+Arrow**: Fine-tune rotation ±1°
- **Space+Drag**: Pan mode (temporary)

## Success Criteria - Complete Feature List

### ✅ Phase 1 - Foundation
- Load base floor plan and electrical overlay
- Pan with drag or spacebar+drag
- Zoom with wheel (around cursor position)
- Magnified cursor (2x, 250px, follows mouse, correct Y-axis)
- Layer visibility toggles
- Layer opacity sliders
- Transform electrical overlay (translate, scale, rotate)
- 60 FPS performance

### ✅ Phase 2 - Interaction
- Tool palette (switch between tools)
- Click to select objects
- Multi-select with Shift+Click
- Undo/redo (Ctrl+Z, Ctrl+Shift+Z)
- Selection highlighting
- Tool-specific cursors

### ✅ Phase 3 - Drawing & Editing
- Draw room boundaries (polygon tool)
- Edit vertices (drag, add, delete)
- Snap to walls
- Draw cable runs (multi-segment)
- Cable run branching (Ctrl+Click for vertical drops)
- Scale calibration (two-point with distance input)
- Measure distances with real-world units
- Create overlay masks

### ✅ Phase 4 - Symbols
- Symbol library UI (6 categories, expandable)
- Place symbols on floor plan
- Rotate symbols (R key, Shift+Arrow fine-tune)
- Auto-assign symbols to rooms (point-in-polygon)
- Edit symbol properties (metadata, notes)
- Toggle symbol categories
- Symbol tooltips on hover

### ✅ Phase 5 - Production
- Auto-save (debounced 500ms)
- Snapshot system (save/load/delete)
- Base + override file pattern
- Dev/prod data sync
- All keyboard shortcuts work
- Error handling with user feedback
- Responsive UI
- Unit and integration tests
- Documentation

## Testing Strategy

**Unit Tests:**
- Each system independently (LayerSystem, CameraSystem, etc.)
- Coordinate conversion functions
- Command execute/undo/redo
- Point-in-polygon detection
- Transform math

**Integration Tests:**
- Complete workflows (draw room → save → reload → undo)
- Multi-layer interactions
- Tool switching and state

**Visual Regression:**
- Keep Tests 1.1-3.2 as primitives regression
- Screenshot tests for UI components

**Manual Testing:**
- Load real floor plan images
- Align electrical overlay
- Draw complete room layout
- Place 50+ symbols
- Test undo/redo extensively
- Verify performance at 60 FPS

## Common Pitfalls - DO NOT

❌ Don't create separate renderer for zoom cursor (use single renderer, multiple viewports)
❌ Don't use perspective camera (use OrthographicCamera)
❌ Don't forget `renderer.autoClear = false`
❌ Don't skip coordinate conversion (screen ≠ world)
❌ Don't hardcode dimensions (calculate from container)
❌ Don't update scene every frame (use dirty flags)
❌ Don't mix Y-axis conventions
❌ Don't store coords in screen space (always world coords)
❌ Don't create new geometry every frame (pool/reuse)
❌ Don't forget to dispose Three.js resources
❌ Don't tightly couple React to editor (use facade pattern)
❌ Don't skip undo/redo for any mutable operation

## Implementation Order

**Recommended sequence:**

1. **Read all docs** (architecture, requirements, test code)
2. **Implement Phase 1** (foundation)
   - LayerSystem → CameraSystem → FloorPlanEditor → React
   - Test: Load images, pan, zoom, transform layers
3. **Implement Phase 2** (interaction)
   - ToolSystem → SelectionSystem → CommandManager
   - Test: Select objects, undo/redo
4. **Implement Phase 3** (drawing)
   - Vector editing → DrawRoomTool → MeasureTool
   - Test: Draw rooms, measure distances
5. **Implement Phase 4** (symbols)
   - Symbol library → PlaceSymbolTool → Room assignment
   - Test: Place and rotate symbols
6. **Implement Phase 5** (production)
   - StateManager → PersistenceService → Polish
   - Test: Auto-save, snapshots, performance

**Test continuously.** Don't wait until the end.

## Data Model Examples

### Room
```typescript
interface Room {
  id: string;
  name: string;
  type: 'interior' | 'exterior';
  boundary: {
    points: { x: number; y: number }[];
  };
  visible: boolean;
  createdAt: string;
}
```

### Cable Run
```typescript
interface CableRun {
  id: string;
  name: string;
  layerType: 'DALI' | 'KNX' | 'ETHERNET';
  points: CableRunPoint[];
  totalLength: number;
  parentRunId?: string; // For branches
  notes?: string;
  createdAt: string;
}

interface CableRunPoint {
  x: number;
  y: number;
  hasDrop: boolean; // Vertical drop at this point
  dropHeight?: number;
  elevation: 'ceiling' | 'wall';
  note?: string;
}
```

### Placed Symbol
```typescript
interface PlacedSymbol {
  id: string;
  type: string; // 'recessed-light', 'knx-switch', etc.
  category: string; // 'lighting', 'lv-controls', etc.
  x: number; // World coordinates
  y: number;
  rotation: number; // Degrees
  scale: number;
  label?: string;
  room?: string; // Auto-assigned
  metadata: {
    circuit?: string;
    notes?: string;
    productId?: string;
    cost?: number;
  };
  createdAt: string;
}
```

## Questions to Consider

Before coding, think through:

1. **Event system**: How will editor notify React of changes?
2. **Async texture loading**: How to handle loading states?
3. **Memory management**: When to dispose geometry/materials?
4. **Resize handling**: How to update cameras on window resize?
5. **Tool state**: How to prevent tool conflicts (e.g., drawing while dragging)?
6. **Coordinate precision**: Float vs Int for world coords?
7. **Undo stack depth**: What's the limit? (50 operations recommended)
8. **Auto-save conflicts**: How to handle rapid changes?
9. **Error boundaries**: How to recover from Three.js errors?
10. **Testing infrastructure**: Jest? Vitest? Integration with existing setup?

## Performance Targets

- **60 FPS** with 5 layers + 100 objects
- **< 500ms** initial load time
- **< 100ms** for tool interactions (click, drag)
- **< 50ms** for coordinate conversions
- **< 1s** for auto-save operations

## Final Notes

**This is a large project.** Break it into phases as defined in the architecture document. Test each phase thoroughly before moving to the next.

**Use the test files** as reference implementations. They prove the primitives work - extract and generalize those patterns.

**Follow the architecture** defined in `THREEJS_ARCHITECTURE.md`. It's based on research and proven patterns (MVC, Command, Scene Graph).

**Ask questions** if anything is unclear. Better to clarify upfront than to build the wrong thing.

**Document as you go.** Add JSDoc comments, especially for complex math (coordinate conversion, transforms).

Good luck! 🚀

---

**START HERE:**
1. Read `THREEJS_ARCHITECTURE.md` in full
2. Read `requirements/floorplan-annotation.md` in full
3. Review Tests 1.1-3.2 to understand patterns
4. Begin Phase 1 implementation (LayerSystem first)
