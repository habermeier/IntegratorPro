Date: 2025-12-20

# Device Placement & Specification System - Design Decisions

This document captures all design decisions made during requirements clarification for the comprehensive device placement and specification system.

---

## 1. Product vs DeviceType Mapping

**Decision:** ProductId stored on each Device instance, with DeviceType providing default

**Implementation:**
- **DeviceType** = abstract concept ("undirected canned light", "focus light")
- **Product** = specific manufacturer/model with specs, links, dimensions, images
- **Device** = placed instance on floor plan

**Behavior:**
- DeviceType has **default productId** (recommended product)
- Each Device instance stores productId (initially from DeviceType default)
- Per-instance override allowed (rare, visually indicated with different color)
- "Swap all" feature: change DeviceType default → all instances update (unless manually overridden)
- Unused products stay in catalog for future use

**Multi-Component Products:**
- Products can be **assemblies** (e.g., DALI-2 light = LED fixture + transformer + DALI controller)
- Product has `components: []` array listing sub-parts
- BOM auto-expands assemblies into individual line items
- Floor plan symbol shows asterisk (*) indicator for multi-part devices
- Device detail modal shows all components

**Room/Purpose-Specific DeviceTypes:**
- Same functional class, different types for different needs
- Example: "Office Canned Light - Flicker-Free" vs "Kitchen Canned Light - Standard"
- Helps BOM clarity and installation planning
- Unique fixtures get dedicated DeviceTypes: "Master Bath Sconce - Vanity Left"

**Product Catalog:**
- "Default" checkbox per DeviceType
- "Replace All" action swaps default and updates instances
- Products have optional fields (for pre-existing fixtures): specSheetUrl, purchaseUrl, dimensions, imageUrl

---

## 2. Cable Routing System - FULLY IN SCOPE

**Decision:** Manual cable routing with intelligent rules enforcement

### **Cable Drawing Tool:**
- Click-to-route segment-by-segment (LCP → Light 1 → Light 2 → etc.)
- Auto-calculate: horizontal runs + vertical drops + climbs + buffer/slack
- Per-device buffer configurable (junction boxes, lights, sensors)

### **Cable Topologies by Type:**

**Daisy-Chain (Bus):**
- **DALI-2:** Max 2 cables at LCP (in/out of daisy chain)
  - Devices connected along cable run
  - Max 64 devices per universe
  - No loops allowed, any other topology OK
  - Max cable length enforced
- **KNX:** Same - daisy chain, 2 cables at LCP
  - Ceiling and upper wall sensors default
  - No loops allowed

**Home-Run (Point-to-Point):**
- **Cat6/Cat6a/PoE:** Each device = individual cable to LCP/switch
- **LED (24V):** Each fixture = individual power cable
- **Window Shades:** 16/4 stranded wire, one cable per shade motor
- **Fiber:** Pre-fab cables, LCP-to-Tech Closet, leave coil for flexibility

### **DALI-2 Rules Engine:**
- Device limit: 64 per universe with configurable thresholds:
  - Green: 0-50 (or user setting)
  - Orange: 51-62
  - Red: 63-64
- Amperage tracking: sum device loads along cable
- T-junctions require junction box placement (attic)
- 4-5 total universes planned (including outdoor DMX/RDM)
- Heights: default ceiling, drops for wall/exterior sconces

### **Amperage Tracking:**
- Each device has `ampsRequired: number` (optional)
- Sum all devices on circuit
- Display: "12.5A / 15A" with color coding:
  - Green: <12A (80% safe)
  - Orange: 12-14A
  - Red: >14A (warning, non-blocking)
- 15A circuit default (configurable)

### **Cable Calculation:**
- Horizontal ceiling runs
- Vertical drops (to device height) and climbs (back to ceiling)
- Service loops: +5 feet per loop marker
- Buffer at each connection point (configurable per device type)
- Total length displayed per cable run

### **Service Loops:**
- Annotation system for spare cable loops
- Types: in-wall (future switches), windows (future shades), general spare
- Visual marker on floor plan
- Export to specification

### **Multi-Category Ethernet:**
- Same physical cable (Cat6) used for different purposes:
  - Security cameras
  - Door access (3D face recognition)
  - WiFi APs
  - General network
- Filter system: "Show all cables" OR multi-select by function/type
- Layer-based organization

---

## 3. Persistence Strategy

**Decision:** Server-side JSON files (single project blob with versioning)

### **Architecture:**
- **Single source of truth:** Server-side JSON files committed with source code
- **Abstraction layer:** `services/DataService.ts` - client code agnostic
- **No localStorage** except UI preferences (sidebar state, etc.)
- **Current:** Server JSON files
- **Future:** Database (abstraction layer makes migration easy)

### **Project-Level Single Blob:**
```json
/projects/270-boll-ave/project.json
{
  "version": "1.0",
  "timestamp": "2025-12-20T15:30:00Z",
  "metadata": { "name": "270 Boll Ave", "status": "Draft" },
  "floorPlan": { /* rooms, masks, polygons */ },
  "devices": [ /* all devices */ ],
  "cables": [ /* all cable routing */ ],
  "furniture": [ /* all furniture */ ],
  "lcps": [ /* LCP configs */ ],
  "settings": { /* ceiling height, units, etc. */ }
}
```

### **Auto-Versioning:**
```
/projects/270-boll-ave/
  project.json           ← current
  .history/
    project-20251220-153000.json
    project-20251220-143000.json
    project-20251219-170000.json
```

**On save:**
1. Copy current → `.history/project-[timestamp].json`
2. Write new `project.json`
3. Keep last N versions (10-20) or 7 days

**Benefits:**
- Git-versioned, portable across dev environments
- Fail-fast (know immediately if save fails)
- "Undo" at project level (load previous version)
- Easy to diff/inspect JSON manually

---

## 4. Units - Storage vs Display

**Decision:** Metric (meters) for all internal storage and computation

### **Internal Storage (Canonical):**
- **ALWAYS METERS** for:
  - Device positions (x, y)
  - Installation heights
  - Cable lengths
  - Room dimensions
  - All calculations
- Metric is superior for computation (no fraction math)

### **Exception - Product Specifications:**
- Keep manufacturer specs in native format
- "2×2 inch recessed light" stays as "2×2 inches"
- Not used in calculations - just reference/display
- US products often spec'd in imperial

### **Display to User:**
- Format based on user's unit preference (Imperial/Metric setting)
- Use `formatDistance()` and `parseDistanceInput()` from measurementUtils
- User sees "9' 6\"" or "2.9 m" depending on preference
- **Computation always stays in meters regardless of display**

**Example:**
```json
{
  "product": {
    "name": "Halo 6-inch Recessed Light",
    "dimensions": "6\" diameter × 8\" depth"  // native spec
  },
  "device": {
    "position": { "x": 5.2, "y": 3.8 },      // meters
    "installationHeight": 2.9                // meters
  }
}
```

---

## 5. Symbol Sizing

**Decision:** World-space symbols that scale with zoom, global size adjuster

### **How Symbols Work:**
- **World-space size** (in meters, not pixels)
- Canned light symbol: ~0.3m diameter
- Camera: ~0.4m, Sensor: ~0.2m
- **Not accurate** to physical device - sized for visibility
- **Symbols scale with zoom** (like furniture and rooms)

### **Global Symbol Size Adjuster:**
- Setting/slider: 0.5× to 2× (affects all symbols proportionally)
- Default: 1.0× (base size)
- If too cluttered → reduce to 0.7×
- If too small → increase to 1.3×
- **Saved with project** (part of project.json settings)

### **Behavior:**
- Zoom out → symbols get smaller with room
- Zoom in → symbols get larger
- To see detail → user zooms in
- Everything scales together (consistent)

**Benefits:**
- Consistent with furniture and room elements
- Natural zoom behavior
- One global control for symbol density
- User can fine-tune for their display/preferences

---

## 6. Room Auto-Detect Algorithm

**Decision:** Point-in-polygon only (all spaces covered by polygons)

### **Algorithm:**
- Check if device **center point** is inside room polygon
- If yes → assign to that room
- Simple, fast, accurate

### **Room Types:**
- Interior rooms: "Master Bedroom", "Office 2", "Kitchen"
- **Hallways are rooms** (part of polygon system)
- **External zones:** "External Zone A", "External Zone B", "External Zone C"
- All treated as "rooms" in the system

### **Manual Override:**
- Double-click device → details modal
- Dropdown shows all rooms/zones
- User can reassign if needed (boundary edge cases)

### **Assumption:**
- All placement points will be inside a polygon
- No "unassigned" state needed
- User creates rooms/zones to cover all areas

---

## 7. PoE Modeling

**Decision:** PoE is a cable attribute, not a separate cable type

### **Why:**
- PoE (Power over Ethernet) is not a physical cable
- It's **power delivery over Cat6/Cat6a**
- Same cable, different configuration

### **Data Model:**

**Cable:**
```typescript
{
  type: "Cat6" | "Cat6a" | "Fiber" | "DALI-2" | "KNX" | "LED-24V" | "Shade-16/4",
  poe?: {
    standard: "PoE" | "PoE+" | "PoE++",  // 15W / 25W / 60W
    watts: number
  }
}
```

**Device:**
```typescript
{
  powerRequirement?: {
    type: "PoE" | "PoE+" | "PoE++" | "AC" | "24V LED",
    watts: number
  }
}
```

### **Examples:**
- WiFi AP: `{ type: "Cat6a", poe: { standard: "PoE+", watts: 25 } }`
- Security Camera: `{ type: "Cat6", poe: { standard: "PoE", watts: 8 } }`
- Server (data only): `{ type: "Cat6" }` (no PoE)

### **Benefits:**
- Accurate model (PoE is Cat6 with power)
- Power budget tracking per switch
- Validation (device needs PoE+ but cable only has PoE → warning)

---

## 8. LCP Naming & Workflow

**Decision:** Simple naming (LCP-1, LCP-2) for logical drop locations, subdivision happens later

### **Phase 1: Floor Plan Placement (THIS TICKET):**
- LCPs are **logical drop locations** on floor plan
- Simple sequential naming: **LCP-1, LCP-2, LCP-3**
- Placed on specific walls in rooms
- Cables terminate at these logical locations
- **No subdivision yet**

### **Phase 2: LCP Design Workflow (FUTURE TICKET):**
- Open LCP-2 configurator
- See all cables terminating there
- Subdivide into physical panels (LCP-2-1, LCP-2-2, LCP-2-3)
- Assign cables to DIN modules
- Design physical layout

### **LCP Model (simple):**
```typescript
{
  id: string;           // UUID
  name: string;         // "LCP-1", "LCP-2", "LCP-3"
  position: Vector2;    // wall location
  roomId: string;       // which room
  rotation: number;     // wall orientation
}
```

### **Cable Count at LCP:**
- **Daisy-chain:** 2 DALI cables (serving 30 lights), 2 KNX cables (serving 15 sensors)
- **Home-run:** 12 individual Cat6 cables, 8 individual LED cables
- Total wires at LCP-2: ~24 cables (not 60+ individual wires)

---

## 9. Range Visualization Precedence

**Decision:** Per-device override > Product default > Global setting

### **Cascade (highest to lowest priority):**

**1. Per-Device Override**
- User manually sets range for specific device
- Example: "WiFi AP in garage has concrete walls, reduce to 40m"
- Stored in `device.metadata.range`

**2. Product Default**
- Product specification defines default range
- Example: "Ubiquiti U6-Pro" has 60m range
- Different products have different ranges

**3. Global Setting**
- Settings page: "Default WiFi AP Range: 50m"
- Fallback if product has no specified range
- Quick adjustment without per-device edits

### **UI Display:**
```
Device Properties:
  Range: 60m (product default)
  [Override] Custom range: [__] m

  If overridden:
  Range: 45m (custom) [Reset to default]
```

### **Application:**
- WiFi APs: coverage radius
- Location sensors: tracking range (X,Y coordinates)
- Presence sensors: detection zone
- Togglable display on floor plan

---

## 10. Layer System Integration

**Decision:** Flat, user-orderable layers with visual sections

### **Architecture:**
- **No nested hierarchies** - flat list of layers
- **User-controlled ordering** - drag/drop to reorder
- **All independently toggleable** - no "always visible" layers
- **Visual sections** for UI organization (not actual layer groups)

### **Default Layer Order** (user can reorder):
```
Floor Plan
  1. Base
  2. Masks (blocks unwanted base annotations)
  3. Rooms

Furniture & Devices
  4. Furniture
  5. Lights (dedicated layer - important category)
  6. Sensors
  7. Security
  8. Network
  9. Controls
  10. HVAC

Cables
  11. DALI-2
  12. Cat6/PoE
  13. KNX
  14. Fiber
  15. LED (24V)
  16. Shades (16/4)
```

### **Key Points:**
- **Masks after Base** - they block base annotations we don't want to see
- **Lights get dedicated layer** - important enough category
- **Sections are UI only** - just visual dividers in layer panel
- **User reorders as needed** - changes z-index rendering order

### **Extensibility:**
- Layer registry/configuration (data-driven)
- Add new layer = add config entry
- Future layers: Window Shades, Plumbing, HVAC Ducts, Annotations
- UI auto-populates from registry

### **Persistence:**
- Layer order (user's custom arrangement)
- Visibility state per layer
- Saved in project.json

---

## Finalized Open Questions

### **Q1: DeviceType Default ProductId**
**Decision:** Explicit `defaultProductId` field on DeviceType

**Implementation:**
```typescript
interface DeviceType {
  id: string;
  name: string;
  category: string;
  defaultProductId: string;  // ← Explicit default
  // ... other fields
}
```

**Behavior:**
- Clear and unambiguous which product is default
- Easy to change default without affecting placed instances
- UI shows "default" indicator in product catalog

---

### **Q2: Cable Route Storage - Explicit Segment Geometry**
**Decision:** Store cable routes as explicit segment arrays (not just logical connections)

**Data Model:**
```typescript
interface CableRoute {
  id: string;
  type: "Cat6" | "Cat6a" | "DALI-2" | "KNX" | "Fiber" | "LED-24V" | "Shade-16/4";
  poe?: { standard: "PoE" | "PoE+" | "PoE++", watts: number };
  segments: Array<{
    from: { x: number, y: number, z: number },  // world coordinates (meters)
    to: { x: number, y: number, z: number }
  }>;
  totalLength: number;  // computed from segments + drops
  devices: string[];    // device IDs along this route (for daisy-chain)
  lcpId?: string;       // terminates at which LCP
}
```

**Why Explicit Geometry:**
- Accurate length calculation (user-drawn path, not straight-line)
- Visual routing around walls, through drops
- Can show cable paths on floor plan
- Professional routing visualization

---

### **Cable Routing Assistance (UX Feature)**

**Magic Parallel Pathing:**
- When routing new cable near existing cable → magnetic snap to parallel path
- Maintains consistent spacing between parallel cables (e.g., 0.1m apart)
- Professional appearance, avoids spaghetti mess

**Auto-Bundled Turns:**
- 90° turns handled as cable bundle (all parallel cables turn together)
- Consistent radius on turns
- Looks clean and professional

**Visual Differentiation by Cable Type:**
- Each cable type has distinct color for visualization
- **Standard colors:**
  - **KNX:** Green (industry standard)
  - **DALI-2:** Blue
  - **Cat6/PoE:** Yellow/Orange
  - **Fiber:** Purple
  - **LED (24V):** Red
  - **Shade (16/4):** Brown/Tan
- System auto-assigns high-contrast colors
- User can override per cable or globally in settings

**Drawing Tool Behavior:**
- Click-to-route (segment by segment)
- Near existing cable → snap to parallel with controlled spacing
- Turn corner → bundle turns together automatically
- Toggle "parallel mode" on/off (snap vs. freehand routing)

---

### **Q3: Symbol Shorthand Placement**
**Decision:** Hybrid - Default on DeviceType, Product can override

**Data Model:**
```typescript
interface DeviceType {
  id: string;
  name: string;
  defaultShorthand?: string;  // e.g., "CAN" for canned light
  // ...
}

interface Product {
  id: string;
  name: string;
  shorthand?: string;  // Optional override, uses DeviceType default if not set
  // ...
}
```

**Behavior:**
- DeviceType defines standard shorthand for that category
- Product can specify custom shorthand (manufacturer-specific branding)
- Display logic: `product.shorthand || deviceType.defaultShorthand || null`

**Examples:**
- DeviceType "Focus Light" → defaultShorthand: "FOC"
- Most products use "FOC"
- One manufacturer product → shorthand: "FCL" (override)

---

## Additional Technical Details

### **Installation Heights:**
- Default heights by device category (ceiling, switch, custom)
- Settings page: global ceiling height, switch height defaults
- Per-device override in properties
- Height annotations togglable on floor plan

### **Device Detail Modal:**
- Click device → open modal
- Shows: product image (if available), specs, dimensions, links
- **Gracefully handles missing data** (pre-existing fixtures)
- Installation height, network connections, room assignment, LCP assignment
- Edit properties, change product model

### **BOM Integration:**
- Device list aggregates by product model
- Quantities auto-calculated
- Multi-component products expand to sub-parts
- "Change Product Model" swaps all instances of device type
- Links to existing ProjectBOM component

### **Specification Export:**
- Text/Markdown/PDF/CSV formats
- Device inventory by layer/type
- Room-by-room device list
- LCP configuration summary
- Cable requirements (types, quantities, lengths)
- Installation notes (heights, service loops, drops)

---

## Out of Scope (Initial Release)

- Automatic pathfinding for cable routing (manual routing only)
- 3D modeling or perspective views
- Electrical load calculations beyond amperage sum
- HVAC duct routing
- Photometric lighting calculations
- Network bandwidth planning or IP assignment
- Real-time device monitoring (IoT)
- CAD file import/export (DXF, DWG)
- Multi-floor cable routing (single-floor initially)

---

## Future Work (Separate Tickets)

### **LCP & DIN Rail Configuration System:**
- LCP hierarchy (LCP-2-1, LCP-2-2, LCP-2-3)
- Unassigned wire management
- DIN module layout tool
- Wire-to-terminal assignment
- Inter-LCP connections
- Physical vs logical views
- Accurate LCP box dimensions
- Cable separators/holders visualization

### **Data Migration:**
- Audit existing localStorage usage
- Migrate to server JSON pattern
- Formalize DataService abstraction layer

---

## Key Architectural Principles

1. **Single Standard:** One persistence pattern for all data (server JSON)
2. **Abstraction Layers:** Client code agnostic to storage details
3. **Metric Everything:** Meters for storage/computation, display in user preference
4. **Extensibility:** Data-driven configs, registry patterns, easy to add new types
5. **User Control:** Drag/drop ordering, manual overrides, flexibility
6. **Graceful Degradation:** Handle missing/incomplete data (pre-existing fixtures)
7. **Visual Feedback:** Color coding, indicators, context-sensitive displays
8. **Non-Blocking Warnings:** Guide user, don't restrict actions

---

**Document Status:** Design decisions finalized 2025-12-20
**Next Steps:** Complete remaining clarification questions, update main ticket, begin implementation
