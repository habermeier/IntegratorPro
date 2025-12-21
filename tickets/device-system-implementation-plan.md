Date: 2025-12-20

# Device System - Implementation Plan (Ticket Breakdown)

This document breaks down the comprehensive device placement and specification system into smaller, testable tickets that can be worked on incrementally or in parallel.

---

## Dependency Graph

```
[TICKET-0: Data Architecture] ← PREREQUISITE
           ↓
    ┌──────┴──────┐
    ↓             ↓
[TICKET-1]    [TICKET-5]
DeviceModels  LayerSystem
    ↓             ↓
[TICKET-2] ←──────┘
ProductCatalog
    ↓
[TICKET-3]
DevicePlacement ←─── [TICKET-4: Heights&Rooms]
    ↓
┌───┴────┬──────────┬──────────┐
↓        ↓          ↓          ↓
[T-6]  [T-9]     [T-10]    [T-11]
Cables  LCPs     Sidebar   Ranges
  ↓
[T-7]
Routing
Assist
  ↓
[T-8]
Rules
Engine
  ↓
[T-12]
Settings
```

---

## PREREQUISITE: TICKET-0 - Data Architecture Migration

**Title:** Migrate to Monolithic Project Data Architecture with Versioning

**Description:**
Implement DataService abstraction layer and migrate from multiple individual endpoints to single monolithic project.json pattern with automatic versioning.

**Scope:**
- Create `services/DataService.ts` client abstraction
- Migrate existing data (layout, scale, polygons, electrical-overlay, dali-devices) to single project.json
- Implement `/api/project/:projectId` endpoints (GET, POST)
- Implement `/api/project/:projectId/history` for version history
- Implement `/api/projects` for project listing
- Auto-versioning on save (.history folder)
- Update all existing components to use DataService

**Deliverables:**
1. DataService.ts with loadProject(), saveProject(), update*() methods
2. Server endpoints for monolithic project CRUD
3. Migration script: consolidate existing JSON files → project.json
4. Updated FloorPlanRenderer.tsx and other components using DataService
5. Version history UI (load previous version)
6. Project structure: `projects/270-boll-ave/project.json` + `.history/`

**Test Criteria:**
- ✅ Load existing project data (migrated from old files)
- ✅ Save project creates version in .history
- ✅ Load previous version restores state
- ✅ All existing features work (polygons, scale, electrical-overlay)
- ✅ No data loss during migration

**Estimated Effort:** 4-6 hours

**Blocks:** All other tickets (PREREQUISITE)

**Reference:** `tickets/data-persistence-architecture-analysis.md`

---

## CORE FOUNDATION

### TICKET-1: Device Data Models & Registry System

**Title:** Implement Core Device Data Models and Registry Pattern

**Description:**
Create TypeScript interfaces and registry system for DeviceType, Product, and Device with extensible, data-driven architecture.

**Scope:**
- Define interfaces: DeviceType, Product, Device, LCP
- Implement DeviceTypeRegistry (factory pattern for extensibility)
- Implement ProductCatalog service
- Add device/product data to project.json structure
- No UI yet (data models only)

**Deliverables:**
1. `editor/models/Device.ts` - Device interface with all fields
2. `editor/models/DeviceType.ts` - DeviceType interface with defaultProductId
3. `editor/models/Product.ts` - Product interface with optional fields, multi-component support
4. `editor/models/LCP.ts` - LCP interface (simple: name, position, roomId)
5. `services/DeviceTypeRegistry.ts` - Registry pattern for device types
6. `services/ProductCatalog.ts` - Product catalog service
7. Updated project.json schema to include devices, deviceTypes, products, lcps arrays

**Data Models:**
```typescript
interface Device {
  id: string;
  deviceTypeId: string;
  productId: string;
  name: string;
  position: Vector2;
  rotation: number;
  roomId: string | null;
  layerId: string;
  installationHeight: number;  // meters
  networkConnections: string[];
  lcpAssignment: string | null;
  metadata: Record<string, any>;  // device-specific (range, ampsRequired, etc.)
  createdAt: number;
}

interface DeviceType {
  id: string;
  name: string;
  category: 'lighting' | 'sensors' | 'security' | 'network' | 'controls' | 'hvac';
  defaultProductId: string;
  defaultShorthand?: string;
  defaultInstallationHeight: number;  // meters
  symbolType: string;  // for rendering
}

interface Product {
  id: string;
  name: string;
  manufacturer?: string;
  category: string;
  specSheetUrl?: string;
  purchaseUrl?: string;
  googleSearchUrl?: string;
  dimensions?: { width: number; length: number; height?: number };  // native units (e.g., "6 inch")
  imageUrl?: string;
  shorthand?: string;  // override DeviceType default
  components?: Array<{  // multi-component products (DALI-2 assemblies)
    productId: string;
    quantity: number;
  }>;
  powerRequirement?: {
    type: 'PoE' | 'PoE+' | 'PoE++' | 'AC' | '24V LED';
    watts: number;
  };
  ampsRequired?: number;  // for DALI/circuit load calculations
}

interface LCP {
  id: string;
  name: string;  // "LCP-1", "LCP-2", etc.
  position: Vector2;
  roomId: string;
  rotation: number;
}
```

**Test Criteria:**
- ✅ Create DeviceType, add to registry
- ✅ Create Product with all optional fields null (graceful handling)
- ✅ Create Product with multi-component assembly
- ✅ Create Device instance referencing DeviceType and Product
- ✅ Device inherits defaultProductId from DeviceType
- ✅ Save/load devices in project.json
- ✅ Registry pattern allows adding new device types without code changes

**Estimated Effort:** 3-4 hours

**Dependencies:** TICKET-0 (data architecture)

**Can Parallelize With:** TICKET-5 (layer system - different subsystem)

---

### TICKET-2: Product Catalog & BOM Integration

**Title:** Implement Product Catalog UI and BOM Integration

**Description:**
Create product catalog management UI, device detail modal, and integrate with existing BOM system.

**Scope:**
- Product catalog UI (list, add, edit products)
- Device detail modal (click device → show product info, specs, links)
- Multi-component product expansion in BOM
- "Change Product Model" feature (swap all instances)
- Graceful handling of missing product data (pre-existing fixtures)

**Deliverables:**
1. `components/ProductCatalog.tsx` - Product management UI
   - List all products by category
   - Add/edit product form (all fields optional except name)
   - Mark default product per DeviceType
   - "Replace All" button (swaps default product)
2. `components/DeviceDetailModal.tsx` - Click device → modal
   - Product image (or placeholder if missing)
   - Model name, manufacturer, specs
   - Dimensions, links (spec sheet, purchase, Google)
   - Installation height, network connections
   - Room assignment, LCP assignment
   - Edit properties button
   - Gracefully handles missing data
3. BOM integration:
   - Aggregate devices by product model
   - Expand multi-component products (show sub-parts)
   - Link to existing ProjectBOM component
   - "Click product → highlight devices on floor plan" (reverse lookup)

**Test Criteria:**
- ✅ Add product with all fields populated
- ✅ Add product with only name (all other fields missing) → no errors
- ✅ Create multi-component product (DALI-2 assembly) → BOM shows 3 line items
- ✅ Click device on floor plan → detail modal opens with product info
- ✅ Device with missing product links → modal hides those sections gracefully
- ✅ Change default product for DeviceType → all instances update
- ✅ Click product in BOM → all devices using that product highlight on floor plan

**Estimated Effort:** 4-5 hours

**Dependencies:** TICKET-1 (device models)

**Can Parallelize With:** TICKET-3 (device placement - different UI area)

---

## DEVICE PLACEMENT

### TICKET-3: Device Placement Tool & Symbol Rendering

**Title:** Implement Device Placement Tool with Symbol Rendering System

**Description:**
Create PlaceDeviceTool for placing devices on floor plan with world-space symbols that scale with zoom.

**Scope:**
- PlaceDeviceTool (select device type, place on floor plan)
- Symbol rendering system (world-space, scales with zoom)
- Global symbol size adjuster (0.5x to 2x, saved with project)
- Symbol shorthand overlay (3-4 letter codes)
- Arrow key positioning (nudge 1", 1', 0.1")
- Symbol library (initial symbols: canned light, camera, sensor, AP, etc.)

**Deliverables:**
1. `editor/tools/PlaceDeviceTool.ts` - Device placement workflow
   - Select device type from palette
   - Symbol preview follows cursor
   - Click to place at location
   - Arrow key positioning: ↑↓←→ (1"), Shift (1'), Ctrl (0.1")
   - Enter to finalize, Escape to cancel
2. `editor/systems/SymbolRenderer.ts` - Symbol drawing system
   - World-space symbols (size in meters, e.g., 0.3m for canned light)
   - Scales with zoom (like furniture)
   - Global size multiplier (0.5x-2x setting)
   - Symbol shorthand text overlay (from Product.shorthand)
   - Asterisk (*) indicator for multi-component products
3. `data/symbols.ts` - Symbol library (initial set)
   - Canned light (circle with crosshairs)
   - Outdoor sconce (wall-mount symbol)
   - Camera (camera icon)
   - WiFi AP (wireless icon)
   - Sensor (sensor icon)
   - LCP (panel icon)
   - Chandelier, fan, etc.
4. Device palette UI (sidebar or toolbar)
   - Grouped by category (Lights, Sensors, Security, etc.)
   - Click to select device type for placement
5. Settings: "Symbol Size" slider (0.5x-2x)

**Test Criteria:**
- ✅ Select device type → symbol preview follows cursor
- ✅ Click to place → device created at position
- ✅ Symbol size matches expected world-space dimensions
- ✅ Zoom in/out → symbols scale with floor plan
- ✅ Adjust global symbol size → all symbols resize proportionally
- ✅ Symbol shows shorthand text overlay ("FOC" for focus light)
- ✅ Multi-component product shows asterisk (*)
- ✅ Arrow keys nudge device (1", 1', 0.1" depending on modifier)
- ✅ Symbol size setting saves with project

**Estimated Effort:** 5-6 hours

**Dependencies:** TICKET-1 (device models)

**Can Parallelize With:** TICKET-2 (product catalog - different feature)

---

### TICKET-4: Room Assignment & Installation Heights

**Title:** Implement Automatic Room Assignment and Installation Height System

**Description:**
Auto-detect room on device placement (point-in-polygon) and implement installation height system with defaults and overrides.

**Scope:**
- Point-in-polygon room detection
- Auto-assign room on placement (by UUID)
- Manual room override (device detail modal dropdown)
- Installation height system (defaults by device category, per-device override)
- Height annotation rendering (togglable)
- Settings: ceiling height, switch height defaults

**Deliverables:**
1. Room auto-detection:
   - On device placement, check which room polygon contains device center
   - Assign roomId (UUID) to device
   - Manual override in device detail modal (dropdown of all rooms)
2. Installation height system:
   - DeviceType has defaultInstallationHeight (meters)
   - Device can override (metadata.installationHeight)
   - Height annotation rendering (dimension line + label)
   - Toggle height annotations visibility (layer panel or setting)
3. Settings integration:
   - Global ceiling height (default: 2.9m / 9.5ft)
   - Switch height from finished floor (default: 1.2m / 4ft)
   - Device types use these as defaults (ceiling-mount → ceiling height, wall switch → switch height)
4. Device properties UI:
   - Installation height field (shows default, can override)
   - Room assignment dropdown (shows current, can change)

**Test Criteria:**
- ✅ Place device in room → roomId auto-assigned
- ✅ Place device in hallway (hallway is a room) → assigned correctly
- ✅ Place device in "External Zone A" → assigned correctly
- ✅ Device on room boundary → assigned to one room (deterministic)
- ✅ Change room manually → roomId updated
- ✅ Ceiling-mount device → height = ceiling height setting
- ✅ Wall switch device → height = switch height setting
- ✅ Override device height → shows custom value
- ✅ Toggle height annotations → labels show/hide
- ✅ Height displayed in user's unit preference (Imperial/Metric)

**Estimated Effort:** 3-4 hours

**Dependencies:** TICKET-3 (device placement)

**Can Parallelize With:** TICKET-5 (layer system - orthogonal feature)

---

## LAYER SYSTEM

### TICKET-5: Device Layer System

**Title:** Implement Flat, User-Orderable Layer System for Devices

**Description:**
Extend layer system with device categories (Lights, Sensors, Security, etc.), user-controllable ordering, and extensible architecture.

**Scope:**
- Add device layers to layer system (Lights, Sensors, Security, Network, Controls, HVAC)
- Flat layer list (no hierarchies)
- User drag-drop reordering (changes z-index)
- All layers toggleable
- Extensible registry pattern (easy to add new layers)
- Layer state saved with project

**Deliverables:**
1. Extend `editor/systems/LayerSystem.ts`:
   - Add device layers: Lights, Sensors, Security, Network, Controls, HVAC
   - User-orderable (drag to reorder)
   - Z-index rendering based on layer order
2. Update `components/editor/LayersSidebar.tsx`:
   - Show all layers (floor plan + devices)
   - Visual sections (dividers) for organization
   - Checkbox for visibility toggle
   - Drag handle for reordering
   - Device count per layer: "Lights (32)"
3. Layer registry pattern:
   - Data-driven layer definitions
   - Easy to add new layers (just add config entry)
   - Future: Window Shades, Plumbing, HVAC Ducts, etc.
4. Default layer order:
   - Base, Masks, Rooms, Furniture, Lights, Sensors, Security, Network, Controls, HVAC
   - User can reorder as needed
5. Layer visibility state saved in project.json

**Test Criteria:**
- ✅ All device layers show in layer panel
- ✅ Toggle layer visibility → devices show/hide
- ✅ Drag layer to reorder → z-index changes (visible rendering order)
- ✅ Device count updates dynamically ("Lights (32)")
- ✅ Layer order saves with project
- ✅ Add new layer type (e.g., "Window Shades") → appears in UI automatically

**Estimated Effort:** 3-4 hours

**Dependencies:** TICKET-0 (data architecture for layer state)

**Can Parallelize With:** TICKET-1 (device models - orthogonal)

---

## CABLE ROUTING

### TICKET-6: Cable Data Models & Basic Drawing Tool

**Title:** Implement Cable Route Data Models and Basic Drawing Tool

**Description:**
Create cable routing data structures (explicit segment geometry), basic cable drawing tool (click-to-route), and cable type support.

**Scope:**
- CableRoute interface (type, segments, PoE attribute, device connections)
- Cable types: Cat6, Cat6a, DALI-2, KNX, Fiber, LED-24V, Shade-16/4, Akuvox types
- Basic draw cable tool (segment-by-segment routing)
- Cable length calculation (sum of segments)
- Cable rendering (lines on floor plan)
- Cable layer (toggleable)

**Deliverables:**
1. `editor/models/CableRoute.ts`:
   ```typescript
   interface CableRoute {
     id: string;
     type: "Cat6" | "Cat6a" | "DALI-2" | "KNX" | "Fiber" | "LED-24V" | "Shade-16/4";
     poe?: { standard: "PoE" | "PoE+" | "PoE++", watts: number };
     segments: Array<{ from: Vector3, to: Vector3 }>;  // world coords (meters)
     totalLength: number;  // computed
     devices: string[];  // device IDs along route (daisy-chain)
     lcpId?: string;  // terminates at which LCP
     metadata: Record<string, any>;  // amperage, universe, etc.
   }
   ```
2. `editor/tools/DrawCableTool.ts` - Basic routing tool
   - Select cable type
   - Click to add route points (segments)
   - Escape to cancel, Enter to finalize
   - Auto-calculate total length
   - Store explicit segment geometry
3. Cable rendering:
   - Draw lines for each segment
   - Different color per cable type (basic)
   - Z-index above devices
4. Cable layer:
   - Add "Cables" layer (or per-type: DALI-2, Cat6, etc.)
   - Toggle visibility
5. Add cables to project.json

**Test Criteria:**
- ✅ Draw cable route (multiple segments) → segments stored
- ✅ Total length calculated correctly (sum of segment lengths)
- ✅ Cable renders on floor plan (line visible)
- ✅ Toggle cable layer → cables show/hide
- ✅ Save/load cables in project.json
- ✅ Different cable types supported (Cat6, DALI-2, etc.)
- ✅ PoE attribute on cable (Cat6 with PoE)

**Estimated Effort:** 4-5 hours

**Dependencies:** TICKET-3 (device placement - need devices to route between)

**Can Parallelize With:** TICKET-9 (LCP placement - orthogonal)

---

### TICKET-7: Cable Routing Assistance (UX)

**Title:** Implement Magic Parallel Pathing and Auto-Bundled Turns

**Description:**
Add intelligent cable routing assistance: parallel path snapping, controlled spacing, bundled 90° turns, and color-coded visualization.

**Scope:**
- Parallel path magnetic snapping (cables route together)
- Controlled spacing between parallel cables (0.1m default)
- Auto-bundled 90° turns (bundle turns together)
- Color coding by cable type (KNX=green, DALI=blue, etc.)
- User can override colors
- Toggle "parallel mode" on/off

**Deliverables:**
1. Parallel path snapping:
   - When routing cable near existing cable → snap to parallel path
   - Maintain consistent spacing (configurable, default 0.1m)
   - Visual feedback: highlight snap target
2. Auto-bundled turns:
   - When turning corner, all parallel cables turn together
   - Consistent radius on turns
   - Professional appearance
3. Color coding:
   - Cable type → default color mapping:
     - KNX: Green
     - DALI-2: Blue
     - Cat6/PoE: Yellow/Orange
     - Fiber: Purple
     - LED (24V): Red
     - Shade (16/4): Brown/Tan
   - System auto-assigns high-contrast colors
   - User can override per cable or globally
4. Drawing tool enhancements:
   - "Parallel Mode" toggle (snap vs freehand)
   - Spacing control (0.05m to 0.3m)
5. Settings:
   - Default cable spacing
   - Color overrides per cable type

**Test Criteria:**
- ✅ Route cable near existing cable → snaps to parallel path
- ✅ Parallel cables maintain consistent spacing
- ✅ Turn corner → all parallel cables turn together (bundled)
- ✅ Different cable types have distinct colors
- ✅ Override cable color → renders in custom color
- ✅ Toggle parallel mode off → freehand routing (no snap)
- ✅ Adjust spacing setting → parallel cables re-space

**Estimated Effort:** 4-5 hours

**Dependencies:** TICKET-6 (basic cable drawing)

**Can Parallelize With:** TICKET-10 (device sidebar - different feature)

---

### TICKET-8: Cable Rules Engine

**Title:** Implement Cable Topology Rules and Load Tracking

**Description:**
Enforce cable-specific rules: DALI-2 device limits, KNX topology restrictions, amperage tracking, max cable length warnings.

**Scope:**
- DALI-2 rules: max 64 devices, color-coded warnings, amperage tracking, no loops
- KNX rules: no loops, max cable length
- Amperage tracking for all circuits (15A default)
- Visual warnings (color-coded: green/orange/red)
- Validation (non-blocking)

**Deliverables:**
1. DALI-2 rules engine:
   - Track device count per universe (cable route)
   - Color-coded warnings:
     - Green: 0-50 devices (or user setting)
     - Orange: 51-62 devices
     - Red: 63-64 devices
   - Amperage tracking: sum device.metadata.ampsRequired along route
   - Display: "32 devices / 64 max, 11.2A / 15A"
   - Topology validation: detect loops (error)
   - Max cable length warning
2. KNX rules:
   - No loops (same as DALI)
   - Max cable length warning
3. Cat6/PoE rules:
   - Amperage tracking for PoE (sum watts)
   - Display per switch/LCP: "285W / 370W PoE budget"
4. Visual indicators:
   - Cable color changes based on status (green/orange/red)
   - Tooltip shows warnings: "⚠️ DALI Universe 2: 63 devices (near max)"
5. Settings:
   - DALI device warning thresholds (default 50/62/64)
   - Circuit amperage limit (default 15A)
   - Max cable length per type

**Test Criteria:**
- ✅ DALI route with 30 devices → green (OK)
- ✅ DALI route with 60 devices → orange (warning)
- ✅ DALI route with 64 devices → red (at max)
- ✅ DALI route with loop → error indicator
- ✅ Amperage sum displayed: "12.5A / 15A"
- ✅ Amperage >14A → orange warning
- ✅ PoE switch shows power budget: "285W / 370W"
- ✅ Cable exceeds max length → warning tooltip

**Estimated Effort:** 4-5 hours

**Dependencies:** TICKET-7 (cable routing assistance)

**Cannot Parallelize** (builds on TICKET-7)

---

## LCP & UI

### TICKET-9: LCP Placement & Connection Tracking

**Title:** Implement LCP Placement and Cable Termination Tracking

**Description:**
Add LCP placement tool (logical drop points), track which cables terminate at each LCP, display connection summary.

**Scope:**
- LCP placement tool (simple: place LCP-1, LCP-2 on walls)
- Sequential naming (LCP-1, LCP-2, LCP-3)
- Track cable terminations per LCP
- LCP connection summary panel (shows all cables/devices terminating there)
- Click cable/device in summary → highlight on floor plan

**Deliverables:**
1. `editor/tools/PlaceLCPTool.ts` - LCP placement
   - Click to place LCP on wall
   - Auto-name: LCP-1, LCP-2, LCP-3 (sequential)
   - User can rename in properties
   - Rotation for wall orientation
2. Cable termination tracking:
   - Cable has `lcpId` field
   - When drawing cable to LCP → lcpId assigned
   - Device has `lcpAssignment` field (which LCP controls it)
3. `components/LCPSummaryPanel.tsx` - Per-LCP connection view
   - Open LCP-2 → shows all terminations:
     - 2x DALI cables (serving 30 lights via daisy chain)
     - 2x KNX cables (serving 15 sensors)
     - 12x Cat6 cables (individual runs: cameras, APs, doors)
     - 8x LED cables (individual fixtures)
   - Click item → zoom to device/cable on floor plan
4. LCP symbol rendering (panel icon, larger than device symbols)

**Test Criteria:**
- ✅ Place LCP → auto-named LCP-1, LCP-2
- ✅ Rename LCP manually → name updates
- ✅ Draw cable to LCP → cable.lcpId assigned
- ✅ Open LCP summary → shows all terminating cables
- ✅ DALI cable shows device count: "DALI-2: 30 devices"
- ✅ Cat6 cables listed individually (home-runs)
- ✅ Click cable in summary → floor plan zooms to cable
- ✅ LCP symbol visible on floor plan

**Estimated Effort:** 3-4 hours

**Dependencies:** TICKET-6 (cable routing)

**Can Parallelize With:** TICKET-10 (device sidebar - different UI)

---

### TICKET-10: Device Sidebar & Management UI

**Title:** Implement Device List Sidebar with Filtering and Click-to-Zoom

**Description:**
Create device management sidebar: list all devices, filter by layer/room/type, click to zoom, edit/duplicate/delete actions.

**Scope:**
- Device list sidebar (replaces/augments symbol placement UI)
- Group by layer/type
- Filter by layer, room, search
- Click device → auto-zoom and focus camera
- Right-click context menu (edit, duplicate, delete, change product)
- Show device metadata (name, type, room, product)

**Deliverables:**
1. `components/editor/DeviceSidebar.tsx`:
   - List all devices grouped by layer
   - Thumbnail (symbol icon), name, type, room, product
   - Filter controls:
     - By layer: "Show Lights only"
     - By room: "Show Office 2 devices"
     - Search: filter by name
   - Click device → camera focuses on device (auto-zoom)
   - Hover device → highlight on floor plan
2. Right-click context menu:
   - Edit Properties (opens DeviceDetailModal)
   - Duplicate Device
   - Delete Device
   - Change Product Model (single device or all of type)
3. Visual indicators:
   - Blocking/non-blocking icon (for furniture context)
   - Multi-component asterisk (*)
   - Override indicator (if device productId ≠ deviceType default)
4. Device count per layer: "Lights (32)"

**Test Criteria:**
- ✅ Sidebar shows all devices grouped by layer
- ✅ Click device in list → floor plan zooms to device
- ✅ Filter by layer → only that layer's devices shown
- ✅ Filter by room → only that room's devices shown
- ✅ Search by name → matching devices shown
- ✅ Right-click → context menu appears
- ✅ Duplicate device → new device created at offset position
- ✅ Delete device → removed from floor plan and list
- ✅ Hover device in list → highlight on floor plan

**Estimated Effort:** 4-5 hours

**Dependencies:** TICKET-3 (device placement), TICKET-2 (device detail modal)

**Can Parallelize With:** TICKET-11 (range visualization - orthogonal)

---

### TICKET-11: Range Visualization

**Title:** Implement Range Visualization for WiFi APs and Sensors

**Description:**
Add range circle visualization for devices with coverage/detection range (WiFi APs, location sensors, presence sensors).

**Scope:**
- Range data in device metadata
- Range circle rendering (semi-transparent, color-coded)
- Togglable per device or globally
- Precedence: per-device override > product default > global setting
- Settings: default ranges by device type

**Deliverables:**
1. Range rendering:
   - `utils/rangeUtils.ts` - Calculate and render coverage circles
   - Semi-transparent fill, color-coded by device type
   - Z-index below devices, above rooms
2. Range data:
   - Device metadata: `{ range: 50 }` (meters)
   - Product default: `{ range: 60 }` (for specific models)
   - DeviceType default: uses global setting if no product default
3. Toggle controls:
   - Per-device: toggle in device properties
   - Global: "Show Range Indicators" setting
   - Per-layer: "Show WiFi AP ranges" filter
4. Settings:
   - Default WiFi AP range (default: 50m)
   - Default presence sensor range (default: 10m)
   - Default location sensor range (default: 15m)
5. Device properties UI:
   - Range field shows: "60m (product default)"
   - Override option: custom range input
   - Reset to default button

**Test Criteria:**
- ✅ WiFi AP shows range circle (50m radius)
- ✅ Product with custom range → uses product default (60m)
- ✅ Per-device override → uses custom range (45m)
- ✅ Toggle range display globally → all ranges show/hide
- ✅ Toggle per device → only that device's range shows/hides
- ✅ Different device types have different colors (WiFi=blue, sensor=green)
- ✅ Range circles scale with zoom (world-space)
- ✅ Change global default → devices without override update

**Estimated Effort:** 3-4 hours

**Dependencies:** TICKET-3 (device placement)

**Can Parallelize With:** TICKET-10 (device sidebar - different feature)

---

### TICKET-12: Settings Integration

**Title:** Consolidate All Device-Related Settings

**Description:**
Add all device-related settings to Settings page (Floorplan category): ceiling height, switch height, unit system, symbol size, ranges, warnings.

**Scope:**
- Settings page: Floorplan category
- All device/cable settings in one place
- Persist in project.json

**Deliverables:**
1. Update `components/Settings.tsx` - Floorplan category:
   - **Unit System:** Imperial / Metric toggle
   - **Ceiling Height:** Input (default: 9.5ft / 2.9m)
   - **Switch Height:** Input (default: 4ft / 1.2m)
   - **Symbol Size:** Slider 0.5x - 2x (default: 1.0x)
   - **Show Installation Heights:** Toggle
   - **Show Range Indicators:** Toggle
   - **Show Cable Routing:** Toggle
   - **Cable Parallel Spacing:** Input (default: 0.1m)
   - **DALI Device Warning Thresholds:** Green (50), Orange (62), Red (64)
   - **Circuit Amperage Limit:** Input (default: 15A)
   - **Default WiFi AP Range:** Input (default: 50m)
   - **Default Sensor Range:** Input (default: 10m)
2. Settings saved in `project.settings` (part of project.json)
3. Settings applied globally across all components

**Test Criteria:**
- ✅ All settings accessible in Settings page
- ✅ Change setting → updates immediately on floor plan
- ✅ Settings persist after save/reload
- ✅ Ceiling height affects all ceiling-mount devices
- ✅ Symbol size slider → all symbols resize
- ✅ Toggle annotations → heights/ranges show/hide

**Estimated Effort:** 2-3 hours

**Dependencies:** TICKET-4 (heights), TICKET-11 (ranges), TICKET-7 (cable spacing)

**Cannot Parallelize** (consolidates multiple features)

---

## Summary: Ticket Breakdown

| Ticket | Title | Effort | Dependencies | Can Parallelize? |
|--------|-------|--------|--------------|------------------|
| **T-0** | Data Architecture Migration | 4-6h | None | ❌ PREREQUISITE |
| **T-1** | Device Data Models & Registry | 3-4h | T-0 | ✅ with T-5 |
| **T-2** | Product Catalog & BOM | 4-5h | T-1 | ✅ with T-3 |
| **T-3** | Device Placement & Symbols | 5-6h | T-1 | ✅ with T-2 |
| **T-4** | Room Assignment & Heights | 3-4h | T-3 | ✅ with T-5 |
| **T-5** | Device Layer System | 3-4h | T-0 | ✅ with T-1 |
| **T-6** | Cable Data & Basic Drawing | 4-5h | T-3 | ✅ with T-9 |
| **T-7** | Cable Routing Assistance | 4-5h | T-6 | ✅ with T-10 |
| **T-8** | Cable Rules Engine | 4-5h | T-7 | ❌ Sequential |
| **T-9** | LCP Placement & Tracking | 3-4h | T-6 | ✅ with T-10 |
| **T-10** | Device Sidebar & Management | 4-5h | T-2, T-3 | ✅ with T-11 |
| **T-11** | Range Visualization | 3-4h | T-3 | ✅ with T-10 |
| **T-12** | Settings Integration | 2-3h | T-4, T-7, T-11 | ❌ Sequential |

**Total Estimated Effort:** 44-57 hours

**Parallelization Opportunities:**
- **Wave 1:** T-0 (prerequisite) - 4-6h
- **Wave 2:** T-1 + T-5 (parallel) - 3-4h
- **Wave 3:** T-2 + T-3 (parallel) - 5-6h
- **Wave 4:** T-4 + T-6 (parallel) - 4-5h
- **Wave 5:** T-7 + T-9 + T-10 + T-11 (parallel) - 4-5h
- **Wave 6:** T-8 (sequential) - 4-5h
- **Wave 7:** T-12 (final integration) - 2-3h

**Optimized Timeline (with parallelization): ~27-38 hours**

---

## Recommendation

### **Approach:**

1. **Start with T-0 (Data Architecture)** - This is the foundation. Get this right, and everything else becomes easier.

2. **Implement in waves** (parallel work where possible):
   - Wave 1: Foundation (T-1 + T-5)
   - Wave 2: Core Features (T-2 + T-3)
   - Wave 3: Integration (T-4 + T-6)
   - Wave 4: Polish (T-7 + T-9 + T-10 + T-11)
   - Wave 5: Rules (T-8)
   - Wave 6: Settings (T-12)

3. **Test after each ticket** - Each ticket has clear test criteria

4. **Can assign different tickets to different AIs** (if coordinating multiple workers)

---

## Out of Scope (Future Tickets)

These were identified but should be separate tickets:

1. **LCP Physical Design Tool** - DIN rail layout, wire-to-module assignment, inter-LCP connections
2. **Export/Specification Generation** - PDF/Markdown export, professional documentation
3. **Snapshot Export** - Already has its own ticket

---

**Next Steps:**

1. **Approve this breakdown?**
2. **Create individual tickets** (copy deliverables/test criteria to separate files)
3. **Start with T-0** (Data Architecture Migration)
4. **Assign workers** (yourself, AIs, etc.)

What do you think?
