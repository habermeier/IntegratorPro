# Floorplan Overlay & Annotation Requirements

## Goal
Let users align and compare two floorplan images (clean background + electrical overlay), then place and manage rich SVG annotations across multiple layers. Preserve alignment and annotations with versioned snapshots and BOM-friendly metadata.

## Base Assets
- **Images**
  - `clean`: floor plan without electrical annotations (background). This is the source for wall vectorization.
  - `electrical`: floor plan with electrical annotations (overlay candidate).
- **Vector overlay (walls only)**: AI vectorization of the clean image that focuses on walls and ignores text/symbols/notes/door swings where possible. Loaded from JSON (main file + debug file for diagnostics).

## Wall Vectorization Workflow
- Input: clean image only; goal is to extract walls (preferably double/thick lines) and drop text/notes/symbols/door swings.
- Controls:
  - “Generate walls” action to run vectorization and produce JSON.
  - “Load main walls” (full JSON) and “Load debug walls” (tiny file) for diagnostics.
  - Filter toggle: “walls only” vs “show all vectors” for debugging.
- Cleanup mode:
  - Selection tools:
    - Rectangular drag-select to highlight vectors in a box.
    - Single-click select: pick vectors near the cursor; zoom level affects selection radius (higher zoom → smaller radius).
    - ESC clears the current selection without deleting.
  - Deletion: backspace deletes selected vectors.
  - Undo/redo for deletions (history scoped to vector cleanup).
  - Save cleaned walls so this step is done once; persist to server as the canonical wall set.

### Wall Cleanup Acceptance Criteria
- **Selection radius scaling**: At 1x zoom, click select radius ≈ 10px; scales down proportionally with zoom-in (e.g., radius ≈ 5px at 2x, 2–3px at 4x), caps at a minimum of 2px.
- **Rectangle select**: Dragging draws a visible marquee; releasing selects all intersecting vectors. ESC cancels marquee and clears selection.
- **Feedback**: Selected vectors highlight (e.g., color change or halo); selection count is shown in a small HUD.
- **Deletion**: Backspace deletes only the current selection. If nothing is selected, no action. Confirm via brief toast/HUD message.
- **Undo/redo**: At least 20 steps of history within the cleanup session; Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (redo) supported in addition to UI buttons. Undo reverses the last delete; redo reapplies it.
- **Persistence**: Saving cleaned walls writes the filtered vector set to server storage. Autosave (debounced 300–500ms) after each delete/undo/redo is preferred; otherwise provide an explicit “Save cleaned walls” that is clearly indicated. Loading the app should use the cleaned set if it exists.

## Scale Calibration (Absolute Distance)
- **Purpose**: Convert on-screen pixel distances to real-world units for accurate cable lengths and measurements.
- **Flow**:
  - User chooses "Set Scale" tool, clicks two points on the plan (snaps to walls if available).
  - System shows the pixel distance between the two points (in image space).
  - Prompt user to enter real-world distance with flexible parsing (e.g., `10'`, `10ft`, `3m`, `3.5m`, `12' 6"`). Accept metric and imperial; store canonical value in meters.
  - Compute and store `pixelsPerMeter` (and its inverse) in layout state.
  - Persist immediately to server; reload should restore the calibration.
- **Interaction**:
  - Draw a live rubber-band line between the two points while placing; show hover feedback about what's under the cursor.
  - Allow pan/zoom while in calibration; treat small drags as panning and only register a point if movement is below a threshold (e.g., 5–8px) before mouseup/click.
  - ESC cancels; Backspace clears the two points before confirmation.
- **Usage**:
  - Measurement tools (distance, cable estimation) must use the calibrated scale.
  - Show current scale in UI (e.g., "Scale: 128 px/m"). If scale is missing, warn the user before allowing cable length outputs.
- **Edge cases**:
  - If user recalibrates, replace previous scale and persist.
  - If points are too close (e.g., <10px apart), reject with a message to pick a longer span.
  - Support undo/cancel: ESC to exit calibration, Backspace clears the two points before confirmation.
- **Persistence**:
  - Server-side storage with base + override pattern: `scale.json` (committed default) + `scale.local.json` (production override, gitignored).
  - GET `/api/scale` reads from override if exists, else base.
  - POST `/api/scale` always writes to override to preserve committed default.

## Cable Run Measurement Tool
### Purpose
Multi-point cable run measurement and visualization for calculating wire runs across different systems (KNX, DALI, Ethernet) with support for vertical drops, branching, and layer-based organization.

### Prerequisites
- **Requires scale**: Measure tool is disabled (ghosted) until `scaleFactor` is set via Set Scale tool.
- **Tool palette**: Add "Measure" button alongside "Set Scale" and "Select" tools.

### Core Measurement Flow
- **Multi-point placement**: Unlimited click-to-add points forming a connected path.
- **Visual feedback**: Reuse magnified cursor preview (75px box, 2x zoom, red dot) from Set Scale tool.
- **Line rendering**: Draw connected path through all points with drop shadow for visibility.
- **Preview line**: Show temporary line from last placed point to current mouse position.
- **Point editing**: Click any existing point to select and drag to new position (same mechanic as Set Scale editing).
- **Completion**: Press Enter or click "Complete Run" to finish adding points and save the run.

### Distance Display & Calculation
- **Per-segment labels**: Display distance for each line segment at its midpoint.
- **Horizontal distance**: Standard Euclidean distance converted using `scaleFactor`.
- **Total length**: Cumulative sum of all segment lengths displayed near cursor or in HUD.
- **Units**: Imperial (feet and decimal inches, rounded to nearest tenth) matching scale bar format.
- **Real-time updates**: Distances recalculate during point editing.

### Run Naming & Metadata
- **Naming prompt**: On completion, dialog appears: "Name this run" + "Select layer type" dropdown.
- **Examples**: "KNX Switches", "DALI Universe 1", "Ethernet Backbone", "KNX Zone 2".
- **One name per topology**: Each run/tree structure has a single name regardless of branches.
- **Layer assignment**: Each run belongs to exactly one layer type (DALI, KNX, ETHERNET).

### Vertical Drops & Elevation
- **Global ceiling height**: Single configurable ceiling height (default: 10'), automatically adds 1' safety margin (total: 11').
- **Variances**: Height differences between rooms are within margin of error, no per-room heights needed.
- **Drop toggles**: Ctrl+Click (or Cmd+Click) on any point to toggle drop state.
- **Drop visualization**: Different marker style for drop points (e.g., square vs circle).
- **Drop distance**: Standard drop is ceiling-to-switch height (~7' assuming 11' ceiling, 4' switch height). Future: configurable drop heights.
- **Adjusted totals**: Total run length = horizontal segments + vertical drop distances.
- **Elevation states**:
  - In-ceiling: Default state for runs at ceiling height.
  - In-wall: State after a drop point.
  - Automatic tracking: Segments inherit elevation based on preceding drop points.

### Branching & Tapping
- **Branch from point**: Click existing point → "Branch from here" → start new chain sharing that point.
- **Tap into segment**: Shift+Click on existing line segment → insert new point → branch from there.
- **Data structure**: Runs can reference `parentRunId` and `parentPointIndex` to form tree structure.
- **Shared points**: Points can belong to multiple runs (junction points).
- **Visual connection**: Highlight junction points when hovering to show connectivity.

### Use Case: KNX Installation
1. **Main ceiling run**: Horizontal line through center of rooms (sensors, general coverage).
2. **Wall branches**: Tap main line → run to wall location → toggle drop → continue in-wall (future switch locations).
3. **Multiple zones**: Separate named runs on same KNX layer (e.g., "KNX Zone 1", "KNX Zone 2").

### Layer System (Data-Driven)
- **Layer types**: DALI, KNX, ETHERNET (initial set). System designed to easily add more via configuration.
- **Layer configuration**: Define layers in data structure (not hardcoded throughout UI):
  ```typescript
  const LAYER_DEFINITIONS = [
    { id: 'DALI', name: 'DALI', color: '#f97316', description: 'Lighting control' },
    { id: 'KNX', name: 'KNX', color: '#3b82f6', description: 'Building automation' },
    { id: 'ETHERNET', name: 'Ethernet', color: '#22c55e', description: 'Network cabling' },
    // Easy to add more here
  ];
  ```
- **Fixed colors**: Colors are fixed per layer type (no customization initially). Elevation modulates brightness within base color.
- **Color scheme**:
  - DALI: Orange/amber (#f97316) - lighting themed
  - KNX: Blue (#3b82f6) - automation themed
  - Ethernet: Green (#22c55e) - network themed
  - In-ceiling: Full saturation (darker)
  - In-wall: Reduced saturation (lighter)

### Layer Visibility & Selection
- **Visibility toggles**: Extend existing "Layers" panel with "Cable Runs" section:
  ```
  Layers
  ├─ Base [opacity slider]
  ├─ Electrical [opacity slider]
  └─ Cable Runs
     ├─ DALI [toggle + count]
     ├─ KNX [toggle + count]
     └─ Ethernet [toggle + count]
  ```
- **Individual control**: Each layer type can be shown/hidden independently.
- **Combination views**: Multiple layer types can be visible simultaneously.
- **Run count**: Show number of runs per layer type in toggle label.

### Run Selection & Focus
- **Selection mechanism**: Click anywhere on a run (any segment or point) to select entire run/tree.
- **Visual feedback**: Selected run "pops" with aggressive drop shadow (e.g., 0 8px 16px rgba(0,0,0,0.4)).
- **Multi-run distinction**: Multiple runs can exist on same layer with different names; selection highlights only the clicked run.
- **Deselection**: Click empty area or ESC to deselect.
- **Edit mode**: Selected run shows edit handles on all points for repositioning.

### Notes & Annotations
- **Point notes**: Ctrl+Click (Cmd+Click on Mac) on point opens note dialog.
- **Note content**: Freeform text (e.g., "Future switch location", "Junction box", "Service loop").
- **Visual indicator**: Small icon/badge on points with notes.
- **Note display**: Hover tooltip shows note; click to edit.
- **Run-level notes**: Click run name in list to open metadata panel with run-level notes field.

### Persistence & Data Sync
- **Storage pattern**: Same as layout/scale - base + override files:
  - `cableRuns.json` (committed default, version controlled)
  - `cableRuns.local.json` (production override, gitignored)
- **Server endpoints**:
  - GET `/api/cable-runs` - Reads from override if exists, else base
  - POST `/api/cable-runs` - Always writes to override to preserve committed default
- **Auto-save**: Debounced save (300-500ms) after any change (add point, edit, delete, rename).
- **Dev/Prod sync**:
  - **CLI tool**: `npm run sync-prod-data` downloads production data and updates base files for commit.
  - **Dev UI button**: "Sync from Production" button visible only in dev environment (`process.env.NODE_ENV === 'development'`).
  - **Workflow**: Developer works in dev, deploys to prod, client makes changes in prod, developer syncs back and commits.

### Data Model
```typescript
interface CableRunPoint {
  x: number;              // Image pixel coordinates
  y: number;
  hasDrop: boolean;       // Vertical drop at this point
  dropHeight?: number;    // Custom drop height (optional, uses global default if unset)
  elevation: 'ceiling' | 'wall';  // Current elevation state
  note?: string;          // Point-level annotation
}

interface CableRunSegment {
  length: number;         // Horizontal distance in real units (feet)
  elevation: 'ceiling' | 'wall';
}

interface CableRun {
  id: string;
  name: string;           // "KNX Switches", "DALI Universe 1"
  layerType: string;      // 'DALI' | 'KNX' | 'ETHERNET'
  points: CableRunPoint[];
  segments: CableRunSegment[];  // Derived, recalculated on changes
  totalLength: number;    // Includes horizontal + vertical drops
  parentRunId?: string;   // For branches/taps
  parentPointIndex?: number;
  notes?: string;         // Run-level notes
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}

interface CableRunsState {
  runs: CableRun[];
  ceilingHeight: number;  // Global setting in feet
  activeLayerTypes: string[];  // Currently visible layers
}

interface LayerDefinition {
  id: string;             // 'DALI', 'KNX', 'ETHERNET'
  name: string;           // Display name
  color: string;          // Base color (hex)
  description: string;    // Tooltip/help text
}
```

### UI Components
- **Tool palette**: Add "Measure" button (ghosted if no scale).
- **Layer panel**: Extend with "Cable Runs" section and per-layer toggles.
- **HUD**: Show current tool state, total run length during placement.
- **Completion dialog**: Name input + layer type dropdown.
- **Metadata panel**: Show/edit run properties (name, layer, notes, stats).
- **Dev sync button**: "Sync from Production" (dev env only).

### Implementation Phases
1. **Phase 1: Core Measurement Chain**
   - Multi-point placement and editing
   - Distance display (per-segment and total)
   - Run naming and basic persistence
   - Layer assignment (no visibility toggles yet)

2. **Phase 2: Layer System**
   - Data-driven layer definitions
   - Visibility toggles in UI
   - Color coding per layer type
   - Run count display

3. **Phase 3: Selection & Focus**
   - Click-to-select entire run
   - Aggressive drop shadow for selected run
   - Edit mode with point handles

4. **Phase 4: Vertical Drops**
   - Ceiling height configuration
   - Drop toggles on points
   - Adjusted distance calculations
   - Elevation state tracking

5. **Phase 5: Elevation Visuals**
   - Color modulation (darker in-ceiling, lighter in-wall)
   - Drop segment rendering (gradient/dashed)

6. **Phase 6: Branching**
   - Branch creation from points
   - Tap into segments
   - Junction point visualization

7. **Phase 7: Notes & Sync**
   - Point and run-level notes
   - Dev/prod data sync (CLI + UI)

### Acceptance Criteria
- [ ] Measure tool disabled when scale not set; enabled when scale exists.
- [ ] Unlimited points can be added to form cable run path.
- [ ] Each segment displays its length at midpoint.
- [ ] Total run length updates in real-time during placement and editing.
- [ ] Completed runs prompt for name and layer type.
- [ ] Runs persist to server immediately with base + override pattern.
- [ ] Layer system is data-driven (adding new layer type requires minimal code changes).
- [ ] Multiple runs can exist on same layer with unique names.
- [ ] Clicking run selects entire topology and applies aggressive drop shadow.
- [ ] Layer visibility toggles show/hide runs per layer type independently.
- [ ] Ceiling height is configurable globally.
- [ ] Points can be toggled as drops, adding vertical distance to total.
- [ ] In-ceiling and in-wall segments have visually distinct colors (brightness modulation).
- [ ] Branches can be created from existing runs.
- [ ] Notes can be added to points and runs.
- [ ] Dev environment has "Sync from Production" button to pull prod data into base files for commit.
- [ ] Production changes are preserved in override file, not affecting committed defaults.

## Layers & Visibility
- Layers include: `clean image` (always on), `electrical image overlay`, `AI vectors`, and multiple annotation layers (see below).
- Each layer supports: toggle visibility, opacity slider (0–100%), z-order defined (clean at bottom, annotations above).
- Electrical image overlay supports transform controls (scale, rotation small increments, X/Y offset) and a lock toggle to prevent accidental moves.
- Layer transforms and visibility/opacity must persist immediately to server storage.

## Electrical Overlay Alignment
- User controls: opacity slider, scale, rotation (fine increments), X/Y translation.
- Live preview while adjusting; snapping not required.
- “Lock overlay” freezes interactions; unlocking restores transform handles.
- Persist overlay transform/visibility on every change (no manual save needed).

## AI Vector Filtering (walls-first)
- When loading vector JSON, default filter to keep only wall-like polylines:
  - Heuristics: minimum segment count, minimum total length, optional thickness/double-line detection if data supports it.
  - Preserve ability to toggle “show all vectors” vs “walls only”.
- AI vectors live in their own layer with visibility toggle and opacity control.

## Symbol Placement System

### Equipment Categories (Annotation Layers)

Each category is a toggleable layer containing specific symbol types. Categories organize symbols by function.

#### 1. Lighting
- **Recessed Light**: Filled square with axis-aligned crosshairs extending 1/2 dimension past square edges
- **Pendant/Chandelier**: Circle with 5 radial spokes, small circles at spoke ends, label "chand"
- **Ceiling Fan**: Fan blade symbol (4-6 blades radiating from center)
- **Exterior Light**: Circle with X (terminating at radius), crosshairs extending beyond circle, "foot" (perpendicular line) attached to one crosshair

#### 2. Low Voltage Controls
- **KNX Switch**: Text symbol "$LV"
- **Presence Sensor**: Small rectangle, label "PRS-LV" underneath
- **Humidity/VOC Sensor**: Small rectangle, label "HVOC-LV" underneath

#### 3. Receptacles & Power
- **Standard Outlet**: Circle with two parallel lines (top 1/3 and bottom 1/3 of circle), lines extend 1/2 diameter beyond circle on both sides
- **Bathroom/Exterior (GFCI)**: Same as standard outlet + "GFCI" label
- **240V Outlet**: Same as standard outlet + "220V" label

#### 4. HVAC & Ventilation
- **DC Vent Fan**: Small fan symbol with "DC" label
- **Motorized Skylight**: Rectangle with up arrow ↑, label "SkyLight"
- **Weather Station**: Rectangular box, label "weather-LV" underneath

#### 5. Safety & Security
- **Smoke/CO/Alarm Combo**: Text "FA/CO" in circle

#### 6. Infrastructure
- **LCP Panel**: Rectangular box (40x60px base), label "LCP-1" or "LCP-2", can be wall-mounted or free-standing
- **Ethernet Switch Panel**: Rectangular box, label "ETH-SW" or model number

### Symbol Design Specifications

**SVG Implementation:**
- Base sizes: Small (16x16px), Medium (24x24px), Large (32x48px for panels)
- All symbols scale proportionally with floor plan zoom level
- Stroke width: 2px at base scale, scales with symbol
- Colors: Category-based (Lighting: yellow, LV Controls: blue, Receptacles: orange, HVAC: green, Safety: red, Infrastructure: gray)
- Rotation anchor: Center point of symbol
- Text labels: Font size scales with symbol size

**Coordinate System:**
- All symbols placed in natural image pixel coordinates (consistent across zoom levels)
- SVG rendered with viewBox matching floor plan image dimensions
- Symbols transform with floor plan pan/zoom operations

### Placement Workflow

**Tool Activation:**
1. Click equipment category in layers panel (e.g., "Lighting")
2. Category expands to show symbol palette
3. Click specific symbol to activate placement tool
4. Cursor shows preview of symbol at current rotation

**Placement Mechanics:**
- **Normal click**: Place symbol at cursor position
- **Space + drag**: Pan map without placing symbol
- **R key (before or after placement)**: Rotate 45° clockwise
- **Shift + R**: Rotate 45° counter-clockwise
- **Shift + Arrow keys (after selection)**: Fine-tune rotation in 1° increments
- **Drag placed symbol**: Reposition (symbol remains selected)
- **ESC**: Undo last placement (removes most recent symbol from active category)
- **Delete key**: Remove selected symbol

**Rotation System:**
- Default angles: 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315° (quick rotate with R)
- Fine-tune mode: Hold Shift + use arrow keys for ±1° adjustments
- Rotation persists for next placement (can place multiple symbols at same angle)
- Displayed in HUD: "Rotation: 45°"

**Undo/Redo:**
- ESC: Undo last placement in active category
- Ctrl+Z: Undo (cross-category, up to 50 operations)
- Ctrl+Shift+Z: Redo
- History stored per-category with 50-operation depth

### Layer Visibility & Management

**Categories Panel Structure:**
```
Symbol Placement
├─ [eye] Lighting (12)
│  └─ [palette when expanded]
├─ [eye] LV Controls (8)
├─ [eye] Receptacles (24)
├─ [eye] HVAC (6)
├─ [eye] Safety (10)
└─ [eye] Infrastructure (4)
```

- Click eye icon to toggle category visibility
- Number in parentheses shows count of placed symbols
- Click category name to expand/collapse symbol palette
- Active category highlighted in blue
- Symbols from hidden categories do not render

### Symbol Properties & Metadata

**Data Structure per Symbol:**
```typescript
interface PlacedSymbol {
  id: string;              // "lighting-001", "lv-control-003"
  type: string;            // "recessed-light", "knx-switch"
  category: string;        // "lighting", "lv-controls", etc.
  x: number;              // Image pixel coordinates
  y: number;
  rotation: number;        // Degrees (0-359)
  scale: number;           // Default 1.0 (for custom sizing)
  label?: string;          // Optional custom label
  room?: string;           // Auto-assigned based on room boundaries
  metadata: {
    circuit?: string;
    notes?: string;
    productId?: string;
    specUrl?: string;
    cost?: number;
  };
  createdAt: string;       // ISO timestamp
}
```

**Auto-generated IDs:**
- Format: `{category}-{sequential-number}`
- Examples: `lighting-001`, `receptacle-042`, `infrastructure-003`
- Unique within project, persist across sessions

**Room Assignment:**
- Automatically assigned when symbol placed inside defined room boundary
- Default: "external" if not within any room boundary
- Can be manually overridden in symbol properties dialog

**Tooltip on Hover:**
- Line 1: Symbol type (e.g., "Recessed Light")
- Line 2: ID and room (e.g., "lighting-012 • Kitchen")
- Line 3: Rotation if non-zero (e.g., "↻ 45°")
- Line 4: Notes (if present)

## Room Boundary & Naming System

### Purpose
Define spatial zones on the floor plan to automatically assign room locations to placed symbols and enable room-based organization/filtering.

### Room Boundary Drawing

**Tool Activation:**
- Click "Define Room" tool in layers panel
- Tool activates with multi-point drawing mode (similar to measurement tool)

**Drawing Mechanics:**
- **Click to add vertices**: Each click adds a point to the boundary polygon
- **Live preview**: Line drawn from last point to cursor showing next edge
- **Space + drag**: Pan map without adding point
- **Snap to existing boundaries**: When cursor within 10px of existing room boundary, snap to that edge (allows sharing walls)
- **Close polygon**: Click near first point (within 20px) or press Enter to complete
- **Cancel**: Press ESC to abort room definition

**Boundary Sharing:**
- When drawing near an existing room boundary, edge highlights in yellow
- Clicking on highlighted edge attaches new room to that boundary
- Shared edges reduce data redundancy and ensure rooms don't overlap
- Moving a shared edge updates both rooms simultaneously

**Completion Dialog:**
- After closing polygon, dialog prompts for room name
- Suggested names: "Kitchen", "Master Bedroom", "Garage", "Backyard", "Left Side Yard"
- Room name stored with boundary data

### Room Data Structure

```typescript
interface RoomBoundary {
  id: string;                    // "room-001"
  name: string;                  // "Kitchen", "Backyard", etc.
  type: 'interior' | 'exterior'; // Auto-detected or manual
  boundary: {
    points: { x: number, y: number }[];  // Polygon vertices in image coordinates
    sharedEdges?: {                       // Edges shared with other rooms
      roomId: string;
      edgeIndices: [number, number];      // Start and end vertex indices
    }[];
  };
  color?: string;                // Optional color for boundary display
  visible: boolean;              // Toggle room boundary visibility
  createdAt: string;
}
```

### Room Assignment Logic

**Automatic Assignment:**
- When symbol is placed, check if its coordinates (x, y) fall inside any room boundary polygon
- Use point-in-polygon algorithm (ray casting)
- Assign symbol's `room` property to matching room name
- If inside multiple rooms (shouldn't happen with proper boundaries), use smallest area room
- If outside all rooms, assign "external"

**Manual Override:**
- User can click symbol → properties → change room assignment
- Useful for boundary edge cases or symbols on walls

### Room Layer Management

**Visibility Controls:**
```
Room Boundaries
├─ [eye] Show All Boundaries
├─ Kitchen [edit] [delete]
├─ Master Bedroom [edit] [delete]
├─ Backyard [edit] [delete]
└─ [+] Define New Room
```

- Toggle "Show All Boundaries" to display/hide all room outlines
- Individual room visibility: Show/hide specific room's boundary
- Edit: Modify boundary vertices or rename
- Delete: Remove room (symbols in room revert to "external")

**Boundary Rendering:**
- Thin dashed line (1px, dashed: 5px on / 5px off)
- Color: Semi-transparent blue (#3b82f6 at 40% opacity)
- Rendered on separate layer above floor plan but below symbols
- Z-order: Base image → Electrical overlay → AI vectors → Room boundaries → Symbols

### External Area Naming

**Default External:**
- Any area not within a defined room boundary is "external"
- Symbols placed outside rooms show room: "external"

**Named External Areas:**
- Can define external room boundaries for: "Backyard", "Front Yard", "Left Side Yard", "Right Side Yard", "Driveway"
- Same polygon drawing tool, but mark as `type: 'exterior'`
- Exterior rooms rendered with different color (green tint instead of blue)

## Overlay Masking Rectangles

### Purpose
Hide unwanted text, notes, or visual clutter from the electrical plan overlay without modifying the source image.

### Masking Tool

**Tool Activation:**
- Sub-layer under "Electrical Overlay" called "Overlay Masks"
- Click "Add Mask" to activate rectangle drawing mode

**Rectangle Drawing:**
- **Click and drag**: Click to set one corner, drag to opposite corner, release to place
- **Rotation**: After placement, press R to rotate in 45° increments (or Shift+arrows for fine-tune)
- **Resize**: Drag corner handles to resize
- **Reposition**: Drag center to move
- **Multiple masks**: Can place unlimited masking rectangles

**Visual Properties:**
- Fill: Solid white (#FFFFFF) or match background color
- Opacity: 100% (fully opaque, completely hides content beneath)
- Border: Thin red outline (1px) when selected, no border when deselected
- Z-order: Rendered on top of electrical overlay, below symbols

### Mask Data Structure

```typescript
interface OverlayMask {
  id: string;           // "mask-001"
  x: number;           // Top-left corner in image coordinates
  y: number;
  width: number;
  height: number;
  rotation: number;     // Degrees
  color: string;        // Default "#FFFFFF"
  visible: boolean;
  createdAt: string;
}
```

### Mask Management

**Visibility:**
- Toggle "Overlay Masks" sub-layer to show/hide all masks
- Individual mask visibility via selection menu

**Editing:**
- Click mask to select (shows resize handles and rotation indicator)
- Delete key: Remove selected mask
- ESC: Deselect mask

**Use Cases:**
- Hide text notes from engineer on electrical plan
- Mask out revision stamps or dates
- Cover legend boxes or title blocks
- Hide contractor annotations

**Persistence:**
- Masks stored with electrical overlay transform data
- Saved to `electricalOverlay.json` / `electricalOverlay.local.json`
- Auto-save on any mask change (add, move, resize, rotate, delete)

## Data Persistence & Snapshots
- Primary state stored on server as JSON (includes layer visibility/opacity, overlay transform, AI filter mode, all annotations).
- Snapshots:
  - User can save a snapshot with a name; system adds timestamp.
  - List existing snapshots with name + timestamp.
  - Load a snapshot to restore state.
  - Delete snapshots.

## UI/Controls
- Panel to manage layers (visibility, opacity), active annotation layer selection, and symbol palette.
- Controls for electrical overlay transform (scale, rotate, translate), opacity, and lock.
- Buttons:
  - “Reload AI overlay” (main file) and “Load debug overlay” (small test) for diagnostics.
  - “Show walls only” toggle for vector filtering.
  - Snapshot: save (name input), load (list), delete (per item).
- Status HUD for current mode/tool and snapping feedback.

## Performance/UX Constraints
- Large vector files must render without freezing: prefer per-polyline rendering, lazy/throttled state updates, and memoization of symbol lists.
- Transform adjustments should feel real-time; dragging symbols uses rAF/throttled updates.
- Autosave operations must be debounced to avoid server overload but still near-instant (e.g., 300–500ms debounce).

## Storage/API Notes
- Expose endpoints to read/write current state and manage snapshots (list/save/load/delete).
- Overlay transform (scale/rotation/offset), opacity, and visibility stored alongside annotations and vector filter mode.
- Support loading alternate vector files (main vs debug) via parameter.

## Diagnostics
- Provide a debug overlay loader (tiny JSON) to confirm rendering.
- Optional logging endpoint to record vector load counts and filter results (wall count vs total) for troubleshooting.
