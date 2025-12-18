# Three.js Floor Plan Editor - Architecture Design

## Executive Summary

This architecture design for an interactive floor plan editor uses Three.js for 2D rendering with a **component-based, model-view-controller (MVC)** pattern. The design emphasizes reusable systems, clear separation of concerns, and proven patterns from research.

**Core Philosophy:** Framework-agnostic business logic with React integration only at the boundary.

---

## Research Foundation

This architecture is informed by established patterns:

- **MVC for Three.js apps** - Separate models from views ([Source](https://medium.com/@lucas.majerowicz/mvc-pattern-for-building-three-js-applications-ed4660aa9c49))
- **Component-based modularity** - Independent, composable systems ([Source](https://pierfrancesco-soffritti.medium.com/how-to-organize-the-structure-of-a-three-js-project-77649f58fa3f))
- **Scene graph architecture** - Hierarchical rendering with dirty region detection ([Source](https://dev.to/xingjian_hu_123dc779cbcac/konvajs-vs-fabricjs-in-depth-technical-comparison-and-use-case-analysis-3k7l))
- **Command pattern for undo/redo** - Granular operations with side effect handling ([Source](https://dev.to/mustafamilyas/creating-undo-redo-system-using-command-pattern-in-react-mmg))
- **React Flow patterns** - Drag, zoom, pan, selection in node editors ([Source](https://reactflow.dev/))

---

## Building Blocks

### 1. Layer Management System
**Purpose:** Manage multiple visual layers with independent visibility, opacity, transforms, and z-ordering.

**Key Features:**
- Image layers (base floor plan, electrical overlay)
- Vector layers (walls, rooms, cable runs, symbols)
- Per-layer visibility/opacity controls
- Per-layer transforms (translate, scale, rotate)
- Z-index ordering

### 2. Navigation System
**Purpose:** Handle pan, zoom, and magnified cursor for precise interaction.

**Key Features:**
- Pan (spacebar + drag or middle mouse)
- Zoom (wheel or pinch)
- Magnified cursor (2x zoom lens following mouse)
- Coordinate conversion (screen ↔ world)

### 3. Tool/Mode System
**Purpose:** Manage active tool state and tool-specific behaviors.

**Key Features:**
- Tool palette (select, draw room, draw cable, place symbol, measure, etc.)
- Tool state machine
- Tool-specific cursors and UI feedback
- Prevent conflicting tool actions

### 4. Vector Editing System
**Purpose:** Create and edit polygons (rooms, masks, cable runs).

**Key Features:**
- Polygon drawing (click-to-add vertices)
- Vertex editing (select, drag, delete points)
- Shape manipulation
- Snap-to (walls, grid)

### 5. Object Placement System
**Purpose:** Place and manage symbols/annotations on floor plan.

**Key Features:**
- Symbol library with categories
- Place, rotate, scale objects
- Snap-to behavior
- Selection and properties

### 6. Selection & Interaction
**Purpose:** Handle user interaction with objects.

**Key Features:**
- Click-to-select (raycasting)
- Drag-to-reposition
- Multi-select support
- Hit detection

### 7. Command & History System
**Purpose:** Undo/redo with command pattern.

**Key Features:**
- Command objects for all mutable operations
- Undo/redo stacks
- History depth limits
- Command grouping (transactions)

### 8. State & Persistence
**Purpose:** Manage application state and save/load.

**Key Features:**
- Centralized state management
- Auto-save (debounced)
- Snapshot system
- Dev/prod data sync

---

## Core Architecture

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   React UI Layer                             │
│  FloorPlanRenderer, ToolPalette, LayerPanel, etc.           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              FloorPlanEditor (Facade)                        │
│  Coordinates all subsystems, exposes public API             │
└───────┬──────────┬──────────┬──────────┬───────────┬────────┘
        │          │          │          │           │
        ▼          ▼          ▼          ▼           ▼
    ┌────────┐ ┌──────┐  ┌──────┐  ┌─────────┐  ┌────────┐
    │ Layer  │ │ Tool │  │Select│  │ Command │  │ State  │
    │ System │ │System│  │System│  │ Manager │  │Manager │
    └────┬───┘ └──┬───┘  └──┬───┘  └────┬────┘  └───┬────┘
         │        │         │           │           │
         └────────┴─────────┴───────────┴───────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │    THREE.Scene, Renderer,     │
            │    Cameras, Raycaster         │
            └───────────────────────────────┘
```

---

## Detailed System Designs

### System 1: LayerSystem

**Responsibilities:**
- Manage collection of layers
- Control visibility, opacity, z-order
- Apply per-layer transforms
- Render layers to scene

**Architecture Pattern:** Scene Graph (inspired by Konva.js)

**Data Model:**

```typescript
// Layer hierarchy
interface Layer {
  id: string;
  name: string;
  type: 'image' | 'vector' | 'annotation';
  zIndex: number;
  visible: boolean;
  opacity: number;

  // Transform relative to world
  transform: {
    position: { x: number; y: number };
    scale: { x: number; y: number };
    rotation: number; // radians
  };

  // Three.js representation
  container: THREE.Group; // All layer content under this group

  // Type-specific data
  content: ImageLayerContent | VectorLayerContent | AnnotationLayerContent;
}

interface ImageLayerContent {
  textureUrl: string;
  texture?: THREE.Texture;
  mesh?: THREE.Mesh;
}

interface VectorLayerContent {
  polylines: Polyline[];
  polygons: Polygon[];
}

interface AnnotationLayerContent {
  symbols: PlacedSymbol[];
  measurements: Measurement[];
}
```

**Key Methods:**

```typescript
class LayerSystem {
  private layers: Map<string, Layer> = new Map();
  private scene: THREE.Scene;

  // Layer CRUD
  addLayer(config: LayerConfig): Layer;
  removeLayer(id: string): void;
  getLayer(id: string): Layer | undefined;
  getAllLayers(): Layer[];

  // Layer ordering
  setLayerZIndex(id: string, zIndex: number): void;
  moveLayerUp(id: string): void;
  moveLayerDown(id: string): void;

  // Layer properties
  setLayerVisible(id: string, visible: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerTransform(id: string, transform: Partial<Transform>): void;

  // Rendering
  render(): void; // Update scene graph based on layer state

  // World coordinate system
  getWorldBounds(): { width: number; height: number }; // From base layer

  // Coordinate conversion (layer-specific)
  worldToLayer(layerId: string, worldPos: Vector2): Vector2;
  layerToWorld(layerId: string, layerPos: Vector2): Vector2;
}
```

**Implementation Notes:**
- Base layer (floor plan image) defines world coordinate system
- All other layers transform relative to base layer
- Use THREE.Group for each layer to apply transforms
- Dirty flag pattern: only update scene when layer changes

---

### System 2: CameraSystem

**Responsibilities:**
- Manage main camera and zoom cursor camera
- Handle pan and zoom interactions
- Convert between screen and world coordinates
- Render multiple viewports

**Architecture Pattern:** Model-View-Controller (camera = model, viewport = view)

**Data Model:**

```typescript
interface CameraState {
  // Main view
  position: { x: number; y: number }; // Pan offset
  zoom: number; // Current zoom level

  // Zoom cursor
  zoomCursorEnabled: boolean;
  zoomCursorMagnification: number; // Default 2x
  zoomCursorSize: number; // Pixels (default 250)
}
```

**Key Methods:**

```typescript
class CameraSystem {
  private mainCamera: THREE.OrthographicCamera;
  private zoomCamera: THREE.OrthographicCamera;
  private state: CameraState;

  // Navigation
  pan(deltaX: number, deltaY: number): void;
  zoom(factor: number, centerX?: number, centerY?: number): void;
  resetView(): void;

  // Coordinate conversion
  screenToWorld(screenX: number, screenY: number): Vector2;
  worldToScreen(worldX: number, worldY: number): Vector2;

  // Zoom cursor
  updateZoomCursor(screenX: number, screenY: number): void;
  setZoomCursorEnabled(enabled: boolean): void;

  // Rendering (multi-viewport)
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void;

  // State
  getState(): CameraState;
  setState(state: Partial<CameraState>): void;
}
```

**Implementation Details:**

```typescript
// Coordinate conversion (critical for all interaction)
screenToWorld(screenX: number, screenY: number): Vector2 {
  const camera = this.mainCamera;
  const viewportWidth = camera.right - camera.left;
  const viewportHeight = camera.top - camera.bottom;

  // Normalize to 0-1
  const normalizedX = screenX / this.viewportWidth;
  const normalizedY = screenY / this.viewportHeight;

  // Map to camera bounds
  const worldX = camera.left + viewportWidth * normalizedX;
  const worldY = camera.top - viewportHeight * normalizedY; // Y inverted

  return { x: worldX, y: worldY };
}

// Multi-viewport rendering (proven in Test 2.1)
render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
  renderer.clear();

  // Main viewport
  renderer.setViewport(0, 0, this.viewportWidth, this.viewportHeight);
  renderer.setScissor(0, 0, this.viewportWidth, this.viewportHeight);
  renderer.setScissorTest(true);
  renderer.clearDepth();
  renderer.render(scene, this.mainCamera);

  // Zoom cursor viewport
  if (this.state.zoomCursorEnabled && this.zoomCursorPosition) {
    const size = this.state.zoomCursorSize;
    const x = Math.max(0, Math.min(this.viewportWidth - size,
                                    this.zoomCursorPosition.x - size / 2));
    const y = Math.max(0, Math.min(this.viewportHeight - size,
                                    this.viewportHeight - this.zoomCursorPosition.y - size / 2));

    renderer.setViewport(x, y, size, size);
    renderer.setScissor(x, y, size, size);
    renderer.clearDepth();
    renderer.render(scene, this.zoomCamera);
  }

  renderer.setScissorTest(false);
}
```

---

### System 3: ToolSystem

**Responsibilities:**
- Manage active tool state
- Dispatch tool-specific interactions
- Coordinate with other systems based on tool

**Architecture Pattern:** State Machine + Strategy Pattern

**Data Model:**

```typescript
type ToolType =
  | 'select'
  | 'pan'
  | 'draw-room'
  | 'draw-mask'
  | 'draw-cable'
  | 'place-symbol'
  | 'measure'
  | 'scale-calibrate';

interface ToolState {
  activeTool: ToolType;
  toolData: Record<string, unknown>; // Tool-specific state
}

interface Tool {
  type: ToolType;
  cursor: string; // CSS cursor

  // Lifecycle
  onActivate(): void;
  onDeactivate(): void;

  // Events
  onPointerDown(worldPos: Vector2, event: PointerEvent): void;
  onPointerMove(worldPos: Vector2, event: PointerEvent): void;
  onPointerUp(worldPos: Vector2, event: PointerEvent): void;
  onKeyDown(event: KeyboardEvent): void;
  onKeyUp(event: KeyboardEvent): void;

  // Rendering overlay (e.g., preview lines)
  render(scene: THREE.Scene): void;

  // Cleanup
  dispose(): void;
}
```

**Key Methods:**

```typescript
class ToolSystem {
  private tools: Map<ToolType, Tool> = new Map();
  private activeTool: Tool | null = null;
  private state: ToolState;

  // Tool management
  registerTool(tool: Tool): void;
  setActiveTool(type: ToolType): void;
  getActiveTool(): Tool | null;

  // Event delegation
  handlePointerDown(screenPos: Vector2, event: PointerEvent): void;
  handlePointerMove(screenPos: Vector2, event: PointerEvent): void;
  handlePointerUp(screenPos: Vector2, event: PointerEvent): void;
  handleKeyDown(event: KeyboardEvent): void;
  handleKeyUp(event: KeyboardEvent): void;

  // Rendering
  render(scene: THREE.Scene): void; // Render active tool overlay

  // State
  getState(): ToolState;
}
```

**Tool Implementation Example (DrawRoomTool):**

```typescript
class DrawRoomTool implements Tool {
  type: ToolType = 'draw-room';
  cursor = 'crosshair';

  private points: Vector2[] = [];
  private previewLine: THREE.Line | null = null;
  private commandManager: CommandManager;
  private selectionSystem: SelectionSystem;

  constructor(commandManager: CommandManager, selectionSystem: SelectionSystem) {
    this.commandManager = commandManager;
    this.selectionSystem = selectionSystem;
  }

  onActivate(): void {
    this.points = [];
  }

  onPointerDown(worldPos: Vector2, event: PointerEvent): void {
    // Check if closing polygon (near first point)
    if (this.points.length >= 3) {
      const dist = this.distance(worldPos, this.points[0]);
      if (dist < 20) { // 20px snap threshold
        this.completeRoom();
        return;
      }
    }

    // Add point
    this.points.push(worldPos);
    this.updatePreview();
  }

  onPointerMove(worldPos: Vector2, event: PointerEvent): void {
    this.updatePreview(worldPos);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cancel();
    } else if (event.key === 'Enter' && this.points.length >= 3) {
      this.completeRoom();
    }
  }

  private completeRoom(): void {
    const command = new AddRoomCommand(this.points);
    this.commandManager.execute(command);
    this.points = [];
    this.updatePreview();
  }

  private cancel(): void {
    this.points = [];
    this.updatePreview();
  }

  render(scene: THREE.Scene): void {
    if (this.previewLine) {
      scene.add(this.previewLine);
    }
  }

  dispose(): void {
    if (this.previewLine) {
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
    }
  }

  // ... helper methods
}
```

---

### System 4: SelectionSystem

**Responsibilities:**
- Manage selected objects
- Handle raycasting for hit detection
- Coordinate with tools for selection behavior

**Architecture Pattern:** Observer Pattern (notifies listeners on selection change)

**Data Model:**

```typescript
interface SelectionState {
  selectedIds: Set<string>; // Object IDs
  selectionMode: 'single' | 'multi';
}

interface Selectable {
  id: string;
  layerId: string;
  object3D: THREE.Object3D; // For raycasting
  bounds: Bounds; // For rectangular selection
}
```

**Key Methods:**

```typescript
class SelectionSystem {
  private state: SelectionState;
  private selectables: Map<string, Selectable> = new Map();
  private listeners: Set<SelectionListener> = new Set();
  private raycaster: THREE.Raycaster;

  // Registration
  registerSelectable(selectable: Selectable): void;
  unregisterSelectable(id: string): void;

  // Selection
  select(id: string, mode?: 'replace' | 'add' | 'toggle'): void;
  selectMultiple(ids: string[]): void;
  clearSelection(): void;
  isSelected(id: string): boolean;
  getSelected(): string[];

  // Hit detection
  raycastAt(worldPos: Vector2): Selectable | null;
  rectangleSelect(start: Vector2, end: Vector2): Selectable[];

  // Observers
  addListener(listener: SelectionListener): void;
  removeListener(listener: SelectionListener): void;

  // State
  getState(): SelectionState;
}
```

**Raycasting Implementation:**

```typescript
raycastAt(worldPos: Vector2): Selectable | null {
  // Convert world to NDC for raycaster
  const camera = this.cameraSystem.mainCamera;
  const viewportWidth = camera.right - camera.left;
  const viewportHeight = camera.top - camera.bottom;

  const ndcX = ((worldPos.x - camera.left) / viewportWidth) * 2 - 1;
  const ndcY = -((worldPos.y - camera.bottom) / viewportHeight) * 2 + 1;

  const pointer = new THREE.Vector2(ndcX, ndcY);
  this.raycaster.setFromCamera(pointer, camera);

  // Raycast against all selectable objects
  const objects = Array.from(this.selectables.values())
    .filter(s => s.object3D)
    .map(s => s.object3D);

  const intersects = this.raycaster.intersectObjects(objects, true);

  if (intersects.length > 0) {
    // Find selectable by object3D
    for (const [id, selectable] of this.selectables) {
      if (intersects[0].object === selectable.object3D ||
          intersects[0].object.parent === selectable.object3D) {
        return selectable;
      }
    }
  }

  return null;
}
```

---

### System 5: CommandManager

**Responsibilities:**
- Execute commands
- Maintain undo/redo stacks
- Support command grouping (transactions)

**Architecture Pattern:** Command Pattern

**Data Model:**

```typescript
interface Command {
  execute(): void;
  undo(): void;
  redo?(): void; // Optional, defaults to execute

  // Metadata
  type: string;
  description: string;
  timestamp: number;
}

interface CommandManagerState {
  undoStack: Command[];
  redoStack: Command[];
  maxHistorySize: number;
}
```

**Key Methods:**

```typescript
class CommandManager {
  private state: CommandManagerState;
  private listeners: Set<CommandListener> = new Set();

  // Command execution
  execute(command: Command): void;
  undo(): void;
  redo(): void;

  // Transactions (group multiple commands)
  beginTransaction(description: string): void;
  endTransaction(): void;

  // History
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoStack(): Command[];
  getRedoStack(): Command[];
  clearHistory(): void;

  // Observers
  addListener(listener: CommandListener): void;
  removeListener(listener: CommandListener): void;
}
```

**Example Commands:**

```typescript
class AddRoomCommand implements Command {
  type = 'add-room';
  description: string;
  timestamp: number;

  private room: Room;
  private layerSystem: LayerSystem;

  constructor(points: Vector2[], layerSystem: LayerSystem) {
    this.room = { id: generateId(), points, name: '' };
    this.layerSystem = layerSystem;
    this.description = `Add room with ${points.length} vertices`;
    this.timestamp = Date.now();
  }

  execute(): void {
    const roomLayer = this.layerSystem.getLayer('rooms');
    if (roomLayer && roomLayer.content.type === 'vector') {
      roomLayer.content.polygons.push(this.room);
      this.layerSystem.markDirty('rooms');
    }
  }

  undo(): void {
    const roomLayer = this.layerSystem.getLayer('rooms');
    if (roomLayer && roomLayer.content.type === 'vector') {
      const index = roomLayer.content.polygons.findIndex(r => r.id === this.room.id);
      if (index !== -1) {
        roomLayer.content.polygons.splice(index, 1);
        this.layerSystem.markDirty('rooms');
      }
    }
  }
}

class MoveObjectCommand implements Command {
  type = 'move-object';
  description: string;
  timestamp: number;

  private objectId: string;
  private oldPosition: Vector2;
  private newPosition: Vector2;
  private layerSystem: LayerSystem;

  constructor(objectId: string, from: Vector2, to: Vector2, layerSystem: LayerSystem) {
    this.objectId = objectId;
    this.oldPosition = from;
    this.newPosition = to;
    this.layerSystem = layerSystem;
    this.description = `Move object ${objectId}`;
    this.timestamp = Date.now();
  }

  execute(): void {
    this.setPosition(this.newPosition);
  }

  undo(): void {
    this.setPosition(this.oldPosition);
  }

  private setPosition(pos: Vector2): void {
    // Find object and update position
    // ...mark layer dirty
  }
}
```

---

### System 6: StateManager

**Responsibilities:**
- Centralize application state
- Handle persistence (save/load)
- Manage snapshots
- Coordinate state across systems

**Architecture Pattern:** Centralized State with Persistence Layer

**Data Model:**

```typescript
interface AppState {
  layers: LayerState[];
  camera: CameraState;
  tools: ToolState;
  selection: SelectionState;

  // Domain objects
  rooms: Room[];
  cableRuns: CableRun[];
  symbols: PlacedSymbol[];
  overlayMasks: OverlayMask[];

  // Calibration
  scale: ScaleCalibration | null;
}

interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  state: AppState;
}
```

**Key Methods:**

```typescript
class StateManager {
  private state: AppState;
  private snapshots: Snapshot[] = [];
  private autosaveDebounce: number = 500; // ms

  // State access
  getState(): AppState;
  setState(state: Partial<AppState>): void;

  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;

  // Snapshots
  createSnapshot(name: string): Snapshot;
  loadSnapshot(id: string): void;
  deleteSnapshot(id: string): void;
  listSnapshots(): Snapshot[];

  // Auto-save
  enableAutosave(): void;
  disableAutosave(): void;

  // Serialization
  serialize(): string; // JSON
  deserialize(json: string): AppState;
}
```

**Persistence Strategy:**

```typescript
// Base + override pattern (from requirements)
class PersistenceService {
  async save(key: string, data: AppState): Promise<void> {
    // POST to /api/{key} (writes to .local.json override)
    await fetch(`/api/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async load(key: string): Promise<AppState> {
    // GET from /api/{key} (reads override if exists, else base)
    const response = await fetch(`/api/${key}`);
    return await response.json();
  }
}
```

---

## Facade: FloorPlanEditor

**Purpose:** Coordinate all subsystems and expose a clean public API for React integration.

**Architecture Pattern:** Facade Pattern

```typescript
class FloorPlanEditor {
  // Subsystems
  private layerSystem: LayerSystem;
  private cameraSystem: CameraSystem;
  private toolSystem: ToolSystem;
  private selectionSystem: SelectionSystem;
  private commandManager: CommandManager;
  private stateManager: StateManager;

  // Three.js primitives
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.initThreeJS(container);
    this.initSystems();
    this.setupEventHandlers();
    this.startRenderLoop();
  }

  // Public API for React

  // Layers
  addLayer(config: LayerConfig): void;
  setLayerVisible(id: string, visible: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  setLayerTransform(id: string, transform: Partial<Transform>): void;

  // Tools
  setActiveTool(tool: ToolType): void;
  getActiveTool(): ToolType;

  // Camera
  pan(deltaX: number, deltaY: number): void;
  zoom(factor: number, centerX?: number, centerY?: number): void;
  setZoomCursorEnabled(enabled: boolean): void;

  // Selection
  getSelectedObjects(): string[];
  clearSelection(): void;

  // Commands
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // State
  save(): Promise<void>;
  load(): Promise<void>;
  createSnapshot(name: string): void;

  // Lifecycle
  dispose(): void;

  // Events (for React state sync)
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}
```

---

## React Integration

**Philosophy:** React components are thin wrappers around the editor facade.

### Main Component

```typescript
export const FloorPlanRenderer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<FloorPlanEditor | null>(null);

  // React state (synced from editor via events)
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    const editor = new FloorPlanEditor(containerRef.current);
    editorRef.current = editor;

    // Sync state from editor to React
    editor.on('tool-changed', setActiveTool);
    editor.on('selection-changed', setSelectedObjects);
    editor.on('layers-changed', setLayers);
    editor.on('history-changed', () => {
      setCanUndo(editor.canUndo());
      setCanRedo(editor.canRedo());
    });

    // Load initial state
    editor.load();

    return () => {
      editor.dispose();
    };
  }, []);

  // UI event handlers (delegate to editor)
  const handleToolChange = (tool: ToolType) => {
    editorRef.current?.setActiveTool(tool);
  };

  const handleLayerVisibilityChange = (id: string, visible: boolean) => {
    editorRef.current?.setLayerVisible(id, visible);
  };

  const handleUndo = () => {
    editorRef.current?.undo();
  };

  const handleRedo = () => {
    editorRef.current?.redo();
  };

  return (
    <div className="h-full w-full flex">
      <LayerPanel
        layers={layers}
        onVisibilityChange={handleLayerVisibilityChange}
      />

      <div ref={containerRef} className="flex-1" />

      <ToolPalette
        activeTool={activeTool}
        onToolChange={handleToolChange}
      />

      <HistoryControls
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    </div>
  );
};
```

---

## File Structure

```
src/
├── editor/
│   ├── FloorPlanEditor.ts         # Facade
│   ├── systems/
│   │   ├── LayerSystem.ts
│   │   ├── CameraSystem.ts
│   │   ├── ToolSystem.ts
│   │   ├── SelectionSystem.ts
│   │   ├── CommandManager.ts
│   │   └── StateManager.ts
│   ├── tools/
│   │   ├── Tool.ts                # Base interface
│   │   ├── SelectTool.ts
│   │   ├── DrawRoomTool.ts
│   │   ├── DrawCableTool.ts
│   │   ├── PlaceSymbolTool.ts
│   │   ├── MeasureTool.ts
│   │   └── ScaleTool.ts
│   ├── commands/
│   │   ├── Command.ts             # Base interface
│   │   ├── AddRoomCommand.ts
│   │   ├── MoveObjectCommand.ts
│   │   ├── DeleteObjectCommand.ts
│   │   └── TransformLayerCommand.ts
│   ├── models/
│   │   ├── Layer.ts
│   │   ├── Room.ts
│   │   ├── CableRun.ts
│   │   ├── Symbol.ts
│   │   └── types.ts               # Shared types
│   └── utils/
│       ├── geometry.ts
│       └── math.ts
├── components/
│   ├── FloorPlanRenderer.tsx      # Main React component
│   ├── LayerPanel.tsx
│   ├── ToolPalette.tsx
│   ├── HistoryControls.tsx
│   └── PropertiesPanel.tsx
├── hooks/
│   ├── useEditor.ts
│   └── useEditorState.ts
└── services/
    ├── PersistenceService.ts
    └── api.ts
```

---

## Implementation Phases

### Phase 1: Foundation - Rendering & Navigation
**Goal:** Establish core rendering infrastructure with layer management and camera controls

**Components:**
- [x] Tests 1.1-3.2 (primitives proven - note: zoom cursor Y-axis needs fix)
- [ ] **LayerSystem**
  - Image layers (base floor plan, electrical overlay)
  - Layer visibility/opacity controls
  - Per-layer transforms (translate, scale, rotate)
  - Z-index ordering
- [ ] **CameraSystem**
  - Pan (drag or spacebar + drag)
  - Zoom (wheel or pinch)
  - Coordinate conversion (screen ↔ world)
  - Multi-viewport rendering (main + zoom cursor)
  - Magnified cursor (2x zoom lens)
- [ ] **FloorPlanEditor Facade**
  - Coordinate all systems
  - Expose clean API for React
- [ ] **React Integration**
  - FloorPlanRenderer component
  - Layer panel UI
  - Camera controls UI

**Success Criteria:**
- ✅ Load and display base floor plan
- ✅ Load and overlay electrical plan
- ✅ Pan and zoom work smoothly at 60 FPS
- ✅ Adjust electrical overlay alignment (position, scale, rotation, opacity)
- ✅ Toggle layer visibility
- ✅ Zoom cursor follows mouse and shows 2x magnification
- ✅ World coordinate system matches base layer

**Deliverable:** Working floor plan viewer with layer alignment tools

---

### Phase 2: Interaction - Tools, Selection & History
**Goal:** Enable user interaction with objects through tools, selection, and undo/redo

**Components:**
- [ ] **ToolSystem**
  - Tool framework (base Tool interface)
  - Tool registration and activation
  - Tool state machine
  - Tool-specific cursors and UI feedback
- [ ] **SelectionSystem**
  - Raycasting for object picking
  - Single and multi-select
  - Selection state management
  - Visual selection feedback
- [ ] **CommandManager**
  - Command pattern implementation
  - Undo/redo stacks
  - Command grouping (transactions)
  - History depth limits
- [ ] **Initial Tools**
  - SelectTool (click to select)
  - PanTool (alternative to spacebar)

**Success Criteria:**
- ✅ Switch between tools via palette
- ✅ Click to select objects on floor plan
- ✅ Multi-select with Shift+Click
- ✅ Undo/redo works for all operations
- ✅ Selection highlights correctly
- ✅ Tool-specific cursors show current mode

**Deliverable:** Interactive editor with selection and history management

---

### Phase 3: Content Creation - Drawing & Editing
**Goal:** Create and edit vector content (rooms, cable runs, measurements)

**Components:**
- [ ] **Vector Editing System**
  - Polygon drawing (click-to-add vertices)
  - Vertex selection and dragging
  - Add/delete vertices
  - Snap-to-walls behavior
  - Shape closing logic
- [ ] **Drawing Tools**
  - DrawRoomTool (polygon for room boundaries)
  - DrawCableTool (multi-segment paths for cable runs)
  - DrawMaskTool (polygon to hide overlay content)
- [ ] **Measurement Tools**
  - ScaleTool (two-point calibration)
  - MeasureTool (multi-point distance measurement)
- [ ] **Vector Layer Support**
  - Add vector layer type to LayerSystem
  - Render polylines and polygons
  - Layer-specific styling

**Success Criteria:**
- ✅ Draw room boundaries with polygon tool
- ✅ Edit room boundaries by dragging vertices
- ✅ Add/remove vertices from existing polygons
- ✅ Snap to walls when drawing
- ✅ Draw multi-segment cable runs
- ✅ Calibrate scale with two known points
- ✅ Measure distances with real-world units
- ✅ Create overlay masks to hide unwanted content

**Deliverable:** Full drawing and editing capabilities for vector content

---

### Phase 4: Annotations - Symbols & Metadata
**Goal:** Place and manage symbols/annotations with rich metadata

**Components:**
- [ ] **Symbol System**
  - Symbol library with categories (Lighting, LV Controls, Receptacles, HVAC, Safety, Infrastructure)
  - SVG symbol definitions
  - Symbol rendering in annotation layer
- [ ] **Placement Tool**
  - PlaceSymbolTool (click to place)
  - Symbol rotation (R key, Shift+Arrow for fine-tune)
  - Symbol properties (metadata, notes)
- [ ] **Room Assignment**
  - Point-in-polygon detection
  - Auto-assign symbols to rooms
  - Manual override in properties panel
- [ ] **Annotation Layer Support**
  - Add annotation layer type to LayerSystem
  - Render symbols with correct z-ordering
  - Category-based visibility toggles

**Success Criteria:**
- ✅ Browse symbol library by category
- ✅ Place symbols on floor plan
- ✅ Rotate symbols before/after placement
- ✅ Symbols automatically assigned to rooms
- ✅ Edit symbol properties (name, notes, metadata)
- ✅ Toggle symbol categories on/off
- ✅ Search/filter symbols
- ✅ Symbol tooltips show metadata on hover

**Deliverable:** Complete annotation system with symbol library

---

### Phase 5: Production - Persistence, Performance & Polish
**Goal:** Production-ready application with data persistence and optimizations

**Components:**
- [ ] **StateManager**
  - Centralized state management
  - Serialization/deserialization
  - Auto-save (debounced 500ms)
  - Base + override file pattern
- [ ] **Persistence Service**
  - Server API endpoints (GET/POST)
  - Snapshot system (save/load/delete)
  - Dev/prod data sync
- [ ] **Performance Optimizations**
  - Dirty region detection (only re-render changed layers)
  - Object pooling for geometry
  - Frustum culling (automatic via Three.js)
  - Lazy loading for large symbol libraries
- [ ] **UX Polish**
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Y, ESC, Delete, R, etc.)
  - Error handling and recovery
  - Loading states and progress indicators
  - Responsive UI for different screen sizes
  - Accessibility (keyboard navigation, ARIA labels)
- [ ] **Testing & Documentation**
  - Unit tests for all systems
  - Integration tests for workflows
  - Visual regression tests
  - User documentation
  - API documentation

**Success Criteria:**
- ✅ Auto-save works after every change (debounced 500ms)
- ✅ Snapshots save/load correctly
- ✅ Dev can sync production data for commits
- ✅ 60 FPS with 5 layers + 100+ objects
- ✅ All keyboard shortcuts work
- ✅ Graceful error handling with user feedback
- ✅ Works on different screen sizes
- ✅ Comprehensive test coverage
- ✅ Production deployment successful

**Deliverable:** Production-ready floor plan editor

---

## Key Design Decisions

### 1. Why Three.js instead of Konva/Fabric?

**Reasons:**
- Native multi-camera support (proven in Test 2.1)
- Better for hybrid 2D/3D future features
- Mature raycasting for interaction
- WebGL performance for large scenes
- Already proven in our tests

**Trade-off:** More low-level than Konva/Fabric, but better suited for our multi-viewport requirements.

### 2. Why MVC Pattern?

**Benefits:**
- Models (rooms, symbols) independent of rendering
- Easy to test business logic
- Can swap rendering layer (e.g., add WebGL2 features)
- Clear separation between data and presentation

### 3. Why Command Pattern for Undo/Redo?

**Benefits:**
- Granular operations (not full state snapshots)
- Side effects handled explicitly
- Can group commands into transactions
- Memory efficient
- Proven pattern (from research)

### 4. Why Facade for FloorPlanEditor?

**Benefits:**
- Hides complexity from React components
- Single entry point for all operations
- Easier to mock for testing
- Can version the API independently

### 5. Why Scene Graph for Layers?

**Benefits:**
- Hierarchical transforms (parent-child)
- Automatic culling and dirty regions
- Proven in Konva.js for performance
- Matches Three.js architecture

### 6. World Coordinate System = Base Layer

**Critical for raycasting:**
- All objects positioned in base layer coordinates
- Screen → world conversion references base layer
- Other layers apply inverse transform for hit detection
- Eliminates coordinate confusion

---

## Performance Considerations

### Dirty Region Detection
Only re-render layers that changed:

```typescript
class LayerSystem {
  private dirtyLayers: Set<string> = new Set();

  markDirty(layerId: string): void {
    this.dirtyLayers.add(layerId);
  }

  render(): void {
    if (this.dirtyLayers.size === 0) return; // Early exit

    for (const layerId of this.dirtyLayers) {
      this.renderLayer(layerId);
    }

    this.dirtyLayers.clear();
  }
}
```

### Object Pooling for Geometry
Reuse Three.js objects instead of creating/destroying:

```typescript
class GeometryPool {
  private linePool: THREE.Line[] = [];

  acquireLine(): THREE.Line {
    return this.linePool.pop() || new THREE.Line();
  }

  releaseLine(line: THREE.Line): void {
    this.linePool.push(line);
  }
}
```

### Frustum Culling
Let Three.js automatically skip off-screen objects (enabled by default).

### Debounced Auto-Save
Avoid server spam:

```typescript
private scheduleSave = debounce(() => {
  this.stateManager.save();
}, 500);
```

---

## Testing Strategy

### Unit Tests
- LayerSystem: add/remove, visibility, transforms
- CameraSystem: coordinate conversion, pan/zoom math
- CommandManager: execute, undo, redo, transactions
- Each Tool: activation, event handling, command generation

### Integration Tests
- FloorPlanEditor: full workflow tests
- End-to-end: draw room → save → reload → undo

### Visual Regression Tests
- Keep Tests 1.1-3.2 as primitives regression
- Screenshot tests for UI components

---

## Migration from PixiJS

1. **Run in parallel initially**
   - Keep old /floorplan route
   - New /floorplan-v2 with Three.js
   - A/B test both versions

2. **Feature parity checklist**
   - [ ] Load floor plan + overlays
   - [ ] Pan and zoom
   - [ ] Layer visibility toggles
   - [ ] Place DALI devices
   - [ ] Draw rooms
   - [ ] Measure distances
   - [ ] Save/load state
   - [ ] Zoom cursor

3. **Data migration**
   - Convert Pixi coords to Three.js world coords
   - Migration script for existing projects

4. **Cutover**
   - Swap routes once parity achieved
   - Monitor for issues
   - Deprecate PixiJS after 1 week

---

## Sources

This architecture is based on research from:

- [MVC Pattern for Three.js Applications](https://medium.com/@lucas.majerowicz/mvc-pattern-for-building-three-js-applications-ed4660aa9c49)
- [Organizing Three.js Code](https://pierfrancesco-soffritti.medium.com/how-to-organize-the-structure-of-a-three-js-project-77649f58fa3f)
- [Konva vs Fabric.js Comparison](https://dev.to/xingjian_hu_123dc779cbcac/konvajs-vs-fabricjs-in-depth-technical-comparison-and-use-case-analysis-3k7l)
- [Command Pattern for Undo/Redo in React](https://dev.to/mustafamilyas/creating-undo-redo-system-using-command-pattern-in-react-mmg)
- [React Flow - Node-Based Editor](https://reactflow.dev/)
- [useHistoryState Hook](https://usehooks.com/usehistorystate)
- [Three.js Multiple Viewports](https://discourse.threejs.org/t/render-multiple-views/57999)

---

## Next Steps

1. Review this architecture with team
2. Approve/modify design decisions
3. Begin Phase 1 implementation
4. Set up project structure
5. Implement LayerSystem and CameraSystem first

**Ready to build!**
