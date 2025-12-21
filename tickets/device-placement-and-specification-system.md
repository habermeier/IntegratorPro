Date: 2025-12-20

Executive Summary
Implement a comprehensive device placement and specification system for electrical, lighting, networking, security, and HVAC equipment. The system will support symbol-based placement of diverse device types (lights, sensors, switches, cameras, WiFi APs, intercoms, etc.) with BOM integration through an abstraction layer, allowing generic device types (e.g., "undirected canned light") to map to specific products with specs, dimensions, and purchase links. Devices will be organized into layers (Lights, Sensors, Security, Network, etc.), include networking/cabling annotations (Cat6, PoE, DALI-2, KNX, Fiber, LED 24V), support installation height settings, cable routing with service loops, range visualization for wireless devices, and generate complete system specifications for integrator workflows. The system will be architected for eventual data-driven configuration via JSON/database rather than hardcoded device types.

Scope

In-Scope:

**Device Types & Categories:**
- Lighting: Canned lights (undirected, focus, etc.), outdoor sconces, ceiling fixtures, chandeliers, unique one-off fixtures (pre-existing or custom), DALI-2 pucks
- Sensors: Presence, movement, location (X,Y tracking), VOC/smell, humidity
- Fans: Bathroom, toilet, laundry exhaust fans
- Network: WiFi APs, switches, servers (tech room equipment)
- Security: Cameras (outdoor under eaves), 3D face recognition (doors), electric strike plates, security pucks, intercom (Android-based, hallway mount)
- Controls: Light Control Panels (LCPs) with naming system (LCP-2-1, LCP-2-2, etc.), switches
- Future: Window shades (placement with service loops for future installation)

**BOM Integration & Abstraction Layer:**
- Generic device types (e.g., "undirected canned light") map to specific products
- Product database with: model name, spec sheet link, purchase link, Google search link, dimensions, optional image
- **Support for incomplete specs:** Pre-existing or custom fixtures may have missing product links, specs, or dimensions (optional fields)
- Swapping product model updates all instances of that device type
- Each product has a detail page/modal with image, specs, dimensions, links (gracefully handles missing data)
- Symbol shorthand annotation (3-4 letters) defined per product (e.g., "FOC" for focus light)

**Symbol System:**
- Small icon symbols for devices (not to-scale drawings)
- Visual differentiation by device type (lights, sensors, cameras, etc.)
- Optional shorthand text overlay on symbols (from product spec)
- Outdoor sconces, canned lights, cameras, sensors, switches, APs, intercoms all get unique symbols
- Architecture supports future data-driven symbol definitions (SVG paths in JSON)

**Layer System:**
- Lights layer
- Sensors layer (presence, movement, location, environmental)
- Security layer (cameras, face recognition, strike plates, pucks, intercom)
- Network layer (WiFi APs, switches, servers)
- Controls layer (LCPs, switches)
- HVAC layer (fans, ventilation)
- Future: Shades layer
- Show/hide toggles per layer
- Default visibility settings

**Room & Area Association:**
- Devices belong to rooms/areas by UUID (rename-safe)
- Auto-detect room on placement (like furniture system)
- Display room name in device lists

**Installation Heights:**
- Default heights by device category: ceiling height, switch height, custom per type
- Settings page: global ceiling height, switch height from finished floor
- Per-device height override (annotated on placement)
- Display height annotations on floor plan (togglable)

**Networking & Cabling:**
- Device network connector types: Cat6, Cat6a, PoE (over Cat6/Cat6a), Fiber, DALI-2, KNX, LED 24V, automated shades (TBD)
- LCP units: naming system (Office 2: LCP-2-1, LCP-2-2, LCP-2-3; Garage: LCP-1)
- LCP network connections: DALI, KNX, Cat6 (non-PoE), etc.
- Cable routing visualization: draw cables between devices, LCPs, switches
- Ceiling drops: annotate vertical cable runs from ceiling to device height
- Service loops: mark spare cable loops in walls, windows, future switch locations
- Cable type differentiation (color-coded or line-styled)

**Range Visualization:**
- WiFi APs: show coverage radius (togglable)
- Location sensors: show tracking range (X,Y coord coverage)
- Max range indicators for planning spacing
- Visual: semi-transparent circles, color-coded by device type

**Device Placement Workflow:**
- Select device type from library/palette
- Symbol preview follows cursor
- Click to place at location
- Arrow keys for fine positioning (like furniture)
- Auto-assigns to room (UUID-based)
- Set installation height (defaults from device type)
- Assign network connections
- Add to appropriate layer

**LCP Naming & Management:**
- Naming convention: LCP-[room/area number]-[sequence]
- Examples: LCP-2-1, LCP-2-2 (Office 2), LCP-1 (Garage)
- Associate devices with LCPs (which LCP controls which lights/sensors)
- LCP detail view: shows connected devices, network types, location
- Security considerations: pucks in server room vs. garage

**Specification Output:**
- Complete device inventory by layer/type
- BOM integration: quantities, models, specs, purchase links
- Cable requirements: lengths, types, quantities
- Installation notes: heights, service loops, drops
- Per-room device list with assignments
- LCP configuration summary

**Settings Page Integration:**
- Ceiling height (default for ceiling-mount devices)
- Switch height from finished floor (default for wall switches)
- Minimum distance warnings (device-to-device, optional)
- Default layer visibility
- Symbol size/scale preferences
- Annotation display toggles (heights, ranges, cable routes)

**Data-Driven Architecture (Future-Proofing):**
- Device library structure supports JSON-based definitions
- Symbol definitions (SVG paths, dimensions) in data files
- Product catalog in structured format (JSON/database)
- Not required for initial release, but code structured to enable this
- Avoid hardcoding device types; use registry/factory pattern

Out-of-Scope:
- 3D modeling or perspective views of devices
- Automatic cable length calculation (manual entry/estimation)
- Electrical load calculations or circuit design
- HVAC duct routing
- Plumbing integration
- Cost estimation beyond BOM totals
- Multi-floor cable routing (assume single-floor initially)
- Real-time device status monitoring (IoT integration)
- Automated device commissioning or configuration
- CAD file import/export (DXF, DWG)
- Photometric lighting calculations
- Network bandwidth planning or IP address assignment

Deliverables

**1. Device Data Model & Architecture**
- `editor/models/Device.ts` interface:
  ```typescript
  {
    id: string;                    // UUID
    deviceTypeId: string;          // Generic type (e.g., "canned-light-undirected")
    productId: string;             // Specific product model
    name: string;                  // User-assigned name (e.g., "Kitchen Light 1")
    position: Vector2;             // X,Y placement
    rotation: number;              // Degrees (if applicable)
    roomId: string | null;         // Room UUID
    layerId: string;               // Layer assignment
    installationHeight: number;    // Meters from floor (default from device type)
    networkConnections: string[];  // ["Cat6", "PoE", "DALI-2", etc.]
    lcpAssignment: string | null;  // LCP ID if controlled by LCP
    metadata: Record<string, any>; // Device-specific data (range, sensor type, etc.)
    createdAt: number;
  }
  ```
- `editor/models/DeviceType.ts` - device type definitions (abstraction layer)
- `editor/models/Product.ts` - product catalog (specs, links, dimensions, images):
  ```typescript
  {
    id: string;                      // Product ID
    name: string;                    // Model name (required)
    manufacturer?: string;           // Optional manufacturer
    specSheetUrl?: string;           // Optional spec sheet link
    purchaseUrl?: string;            // Optional purchase link
    googleSearchUrl?: string;        // Optional Google search link
    dimensions?: {                   // Optional dimensions
      width: number;
      length: number;
      height?: number;
    };
    imageUrl?: string;               // Optional product image
    shorthand?: string;              // Optional 3-4 letter code for symbol
    category: string;                // Lighting, Sensors, etc.
  }
  ```
- `editor/models/LCP.ts` - Light Control Panel data model
- Registry/factory pattern for device type management

**2. Device Library & Catalog**
- `data/deviceTypes.json` (or .ts initially) - device type definitions
- `data/productCatalog.json` - product database with specs, links, dimensions, images
- **Support for optional/missing fields:** Product links, specs, and dimensions can be null/undefined for pre-existing or custom fixtures
- Symbol definitions (SVG paths or canvas drawing functions)
- Shorthand annotations per product (3-4 letter codes)
- Initial device types: canned lights (undirected, focus), outdoor sconces, chandeliers, unique one-off fixtures, DALI-2 pucks, sensors, cameras, WiFi APs, switches, LCPs, intercoms, fans
- Categorization: Lighting, Sensors, Security, Network, Controls, HVAC

**3. Symbol Rendering System**
- `editor/systems/SymbolRenderer.ts` - draws device symbols on canvas
- Symbol library with icons for each device type
- Text overlay for shorthand annotations
- Scaling: symbols remain consistent size regardless of zoom
- Z-index layering: symbols above furniture, below UI
- Visual differentiation: colors, shapes by device category

**4. Device Placement Tool**
- `editor/tools/PlaceDeviceTool.ts` - device placement workflow
- Device palette/sidebar for selecting device types
- Preview follows cursor
- Click to place, arrow keys for fine positioning
- Auto-detect room and assign UUID
- Set installation height (default or custom)
- Network connection assignment UI
- Integration with existing tool system

**5. Layer System for Devices**
- Extend `editor/systems/LayerSystem.ts` with device layers:
  - Lights, Sensors, Security, Network, Controls, HVAC, (Future: Shades)
- Layer visibility toggles in sidebar
- Default visibility settings
- Filter device list by layer
- Layer-specific rendering styles

**6. Installation Height System**
- Height annotation rendering (text labels, dimension lines)
- Default heights by device category (ceiling, switch, custom)
- Settings page: global ceiling height, switch height
- Per-device override in device properties
- Toggle height annotations visibility

**7. Networking & Cabling Visualization**
- Cable routing tool: draw cables between devices
- Cable types: Cat6, Cat6a, PoE, Fiber, DALI-2, KNX, LED 24V
- Visual differentiation: color-coded or line-styled
- Ceiling drops: vertical cable annotations
- Service loops: special markers (in-wall, windows, future switches)
- Cable layer (show/hide)
- Cable list view with types, endpoints, lengths

**8. LCP Management System**
- LCP placement tool (special device type)
- Naming UI: auto-suggest LCP-[area]-[seq] format
- LCP detail panel: shows connected devices, network types
- Device-to-LCP assignment interface
- LCP configuration summary view

**9. Range Visualization**
- `utils/rangeUtils.ts` - calculate and render coverage circles
- WiFi AP range circles (radius in meters, togglable)
- Sensor range visualization (presence, location tracking)
- Semi-transparent fills, color-coded by device type
- Toggle range display per device or globally
- Settings: default range values by device type

**10. Device Detail Modal**
- Click device → open modal with:
  - Product image (if available, placeholder if missing)
  - Model name and specs (show "No specs available" if missing)
  - Dimensions (show "Dimensions not specified" if missing)
  - Links: spec sheet, purchase, Google search (only show available links, gracefully hide missing ones)
  - Installation height
  - Network connections
  - Room assignment
  - LCP assignment
  - Edit properties button
- **Graceful handling of missing data:** Modal adapts to show only available product information for pre-existing/custom fixtures
- Modal component: `components/DeviceDetailModal.tsx`

**11. Device Sidebar Panel**
- Device list grouped by layer/type
- Filter by layer, room, or search
- Click device to focus/zoom on floor plan
- Right-click context menu: Edit, Duplicate, Delete, Change Product Model
- Show: symbol thumbnail, name, type, room, height
- Bulk actions: assign to LCP, change layer, export list

**12. Settings Page Integration**
- New settings under "Devices" category:
  - Ceiling Height (default: 9.5 ft or 2.9 m)
  - Switch Height (default: 4 ft or 1.2 m)
  - Show Installation Heights (toggle)
  - Show Range Indicators (toggle)
  - Show Cable Routing (toggle)
  - Symbol Size (slider: small/medium/large)
  - Default WiFi AP Range (input field)
  - Default Sensor Range (input field)

**13. BOM Integration**
- Device list aggregates by product model
- Quantities calculated automatically
- Links to existing ProjectBOM component
- BOM export includes device placements (room, height, network connections)
- "Change Product Model" feature: swap all instances of device type to new product

**14. Specification Export**
- Generate text/PDF report with:
  - Device inventory by layer
  - Room-by-room device list
  - LCP configuration summary
  - Cable requirements (types, quantities)
  - Installation notes (heights, service loops, drops)
  - BOM with purchase links
- Export format: Markdown, PDF, or CSV

**15. Data Persistence**
- Store devices in project data (localStorage/file export)
- Include in save/load workflow
- Device library and product catalog persistence
- LCP configurations saved with project

**16. Future-Proofing for Data-Driven System**
- Code architecture:
  - Device type registry (not switch statements)
  - Symbol factory pattern (load from data)
  - Product catalog service (JSON → runtime objects)
  - Plugin-style device type extensions
- Documentation: guide for adding new device types via JSON
- Example JSON schema for device types and products

**17. Security System Specifics**
- Ultravox security: electric strike plates, security pucks (4x)
- 3D face recognition: door placements (4 doors)
- Android intercom: hallway mount, height annotation
- Security puck assignment: server room vs. garage (UI for location selection)
- Security layer with distinct visual style

**18. Service Loop Annotation System**
- Service loop marker tool
- Types: in-wall (future switches), windows (future shades), general spare
- Visual: coiled cable icon or "SL" marker
- List view: all service loops by type and location
- Export: service loop locations in specification

**19. Testing & Validation**
- Test device placement across all types
- Verify BOM aggregation correctness
- Test product model swapping (all instances update)
- Validate cable routing and service loop annotations
- Check range visualization accuracy
- Test LCP assignment and naming
- Verify specification export completeness

**20. Documentation**
- User guide: device placement workflow, LCP naming, cable routing
- Developer docs: device type architecture, adding new device types
- Product catalog schema documentation
- Symbol definition format guide (for data-driven future)
