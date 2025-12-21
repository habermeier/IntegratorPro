# Device System - Data Models Documentation

**Date:** 2025-12-20
**Reference:** `tickets/device-system-design-decisions.md`
**Interfaces:** `docs/device-system-interfaces.ts`

---

## Overview

This document explains the data models for the comprehensive device placement and specification system. The system manages devices, products, cable routing, and control panels (LCPs) for integration projects.

### Key Design Principles

1. **Metric Storage:** All positions, dimensions, and measurements stored in meters internally
2. **Graceful Degradation:** Missing product data handled gracefully (pre-existing fixtures)
3. **Explicit Geometry:** Cable routes store actual segment paths (not just logical connections)
4. **Flexible Overrides:** Per-instance overrides for products, heights, ranges, etc.
5. **Extensibility:** Data-driven registries for easy addition of new device types

---

## Data Model Relationships

```
┌─────────────────┐
│  DeviceType     │◄──────────┐
│  (Abstract)     │            │
│                 │            │  References
│  - Category     │            │  (default)
│  - Default      ├────┐       │
│    Product      │    │       │
│  - Symbol       │    │       │
│  - Defaults     │    │       │
└─────────────────┘    │       │
                       │       │
                       │       │
┌─────────────────┐    │       │
│  Product        │◄───┘       │
│  (Specific      │            │
│   Model)        │            │
│                 │            │  References
│  - Specs        │            │  (can override)
│  - Links        │            │
│  - Components   │            │
│  - Power Req    │            │
└─────────────────┘            │
                               │
                               │
┌─────────────────┐            │
│  Device         │────────────┘
│  (Placed        │
│   Instance)     │
│                 │
│  - Position     │───────┐
│  - Rotation     │       │
│  - Room         │       │
│  - LCP          │       │
│  - Overrides    │       │
└─────────────────┘       │
                          │
                          │
┌─────────────────┐       │
│  CableRoute     │       │  Connects
│                 │       │  Devices
│  - Type         │       │
│  - Segments     │───────┘
│  - Devices      │
│  - LCP          │───────┐
│  - PoE          │       │
└─────────────────┘       │
                          │
                          │  Terminates
                          │  at
┌─────────────────┐       │
│  LCP            │◄──────┘
│  (Control       │
│   Panel)        │
│                 │
│  - Position     │
│  - Room         │
│  - Name         │
└─────────────────┘
```

---

## DeviceType

**Purpose:** Represents an abstract device category or concept

**Examples:**
- "Undirected Canned Light"
- "Focus Light"
- "WiFi Access Point"
- "Motion Sensor"
- "Security Camera (PTZ)"

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `name` | string | Human-readable name |
| `category` | enum | Device category: lighting, sensors, security, network, controls, hvac |
| `defaultProductId` | string | Default/recommended product model |
| `defaultShorthand` | string? | Default 3-4 letter shorthand for symbols (e.g., "CAN", "FOC") |
| `defaultInstallationHeight` | number | Default height from floor in meters |
| `symbolType` | string | Symbol identifier for rendering system |
| `metadata` | object? | Device-specific defaults (e.g., range for WiFi APs) |

### Example

```typescript
{
  id: "dt-canned-light-001",
  name: "Undirected Canned Light",
  category: "lighting",
  defaultProductId: "prod-halo-6inch",
  defaultShorthand: "CAN",
  defaultInstallationHeight: 2.9, // meters (ceiling height)
  symbolType: "canned-light",
  metadata: {
    defaultWattage: 15
  }
}
```

### Design Notes

- **Registry Pattern:** DeviceTypes are registered in a central registry for extensibility
- **Room-Specific Types:** Same functional device can have different types for different contexts
  - Example: "Office Canned Light - Flicker-Free" vs "Kitchen Canned Light - Standard"
- **Unique Fixtures:** Special fixtures get dedicated DeviceTypes
  - Example: "Master Bath Sconce - Vanity Left"

---

## Product

**Purpose:** Represents a specific manufacturer model with specs and links

**Examples:**
- "Halo H2750 6-inch Recessed Light"
- "Ubiquiti U6-Pro WiFi Access Point"
- "Lutron Caseta Dimmer Switch"

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `name` | string | Product name/model **[REQUIRED]** |
| `manufacturer` | string? | Manufacturer name (optional) |
| `category` | string? | Product category (optional) |
| `specSheetUrl` | string? | Link to PDF spec sheet |
| `purchaseUrl` | string? | Link to purchase page |
| `googleSearchUrl` | string? | Google search URL for product |
| `dimensions` | object? | Physical dimensions in native units |
| `imageUrl` | string? | Product image URL |
| `shorthand` | string? | Override for DeviceType shorthand |
| `components` | array? | Multi-component product definition |
| `powerRequirement` | object? | Power requirements (type, watts) |
| `ampsRequired` | number? | Current draw in amps |
| `range` | number? | Range in meters (WiFi APs, sensors) |
| `metadata` | object? | Product-specific data |

### Example: Simple Product

```typescript
{
  id: "prod-halo-6inch",
  name: "Halo H2750 6-inch Recessed Light",
  manufacturer: "Halo",
  category: "lighting",
  specSheetUrl: "https://example.com/specs/h2750.pdf",
  purchaseUrl: "https://example.com/buy/h2750",
  dimensions: {
    width: "6 inch",
    length: "6 inch",
    height: "8 inch",
    units: "inches"
  },
  imageUrl: "https://example.com/images/h2750.jpg",
  powerRequirement: {
    type: "AC",
    watts: 15
  },
  ampsRequired: 0.125
}
```

### Example: Multi-Component Product (DALI-2 Assembly)

```typescript
{
  id: "prod-dali-light-assembly",
  name: "DALI-2 LED Light Assembly",
  manufacturer: "Various",
  category: "lighting",
  components: [
    {
      productId: "prod-led-fixture-001",
      quantity: 1,
      description: "LED fixture module"
    },
    {
      productId: "prod-dali-transformer-001",
      quantity: 1,
      description: "24V transformer"
    },
    {
      productId: "prod-dali-controller-001",
      quantity: 1,
      description: "DALI-2 controller module"
    }
  ],
  powerRequirement: {
    type: "DALI-2",
    watts: 18
  },
  ampsRequired: 0.75
}
```

### Example: Pre-Existing Fixture (Minimal Data)

```typescript
{
  id: "prod-existing-chandelier",
  name: "Existing Dining Room Chandelier"
  // All other fields omitted - gracefully handled
}
```

### Design Notes

- **Graceful Degradation:** Only `id` and `name` are truly required
- **BOM Expansion:** Multi-component products automatically expand to individual line items
- **Multi-Part Indicator:** Devices using multi-component products show asterisk (*) on floor plan
- **Native Units:** Product dimensions stored in manufacturer's native units (often imperial for US products)
- **Default Products:** One product per DeviceType marked as "default" (recommended)

---

## Device

**Purpose:** Represents a placed instance on the floor plan

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `deviceTypeId` | string | Reference to DeviceType |
| `productId` | string | Reference to Product (initially from DeviceType default) |
| `name` | string | User-assigned name (defaults to product name + number) |
| `position` | Vector2 | World coordinates in meters {x, y} |
| `rotation` | number | Rotation in degrees (0=north, 90=east) |
| `roomId` | string? | Room assignment (UUID, auto-detected) |
| `layerId` | string | Layer for visibility control |
| `installationHeight` | number | Height from finished floor in meters |
| `networkConnections` | string[] | Array of connected cable/device IDs |
| `lcpAssignment` | string? | Which LCP controls this device |
| `metadata` | object | Device-specific data (range overrides, etc.) |
| `createdAt` | number | Creation timestamp (Unix epoch ms) |

### Example

```typescript
{
  id: "dev-12345",
  deviceTypeId: "dt-canned-light-001",
  productId: "prod-halo-6inch",
  name: "Kitchen Light 3",
  position: { x: 5.2, y: 3.8 },
  rotation: 0,
  roomId: "room-kitchen",
  layerId: "layer-lights",
  installationHeight: 2.9,
  networkConnections: ["cable-dali-01"],
  lcpAssignment: "lcp-2",
  metadata: {
    universe: 1,
    address: 15,
    ampsRequired: 0.125
  },
  createdAt: 1703088000000
}
```

### Device Placement Workflow

1. User selects DeviceType from palette
2. System creates Device instance:
   - `productId` = DeviceType.defaultProductId
   - `installationHeight` = DeviceType.defaultInstallationHeight
   - Symbol preview follows cursor
3. User clicks to place
4. System auto-detects room (point-in-polygon)
5. Device created with all defaults
6. User can override product, height, etc. later

### Product Override Behavior

```typescript
// Normal device (uses DeviceType default)
device.productId === deviceType.defaultProductId  // ✅ normal
// → Renders in standard color

// Overridden device (user manually changed product)
device.productId !== deviceType.defaultProductId  // ⚠️ override
// → Renders in different color to indicate override
```

### Design Notes

- **Position in Meters:** All internal calculations use meters
- **Display in User Preference:** UI shows Imperial/Metric based on user setting
- **Room Auto-Detection:** Point-in-polygon check on placement
- **Manual Override:** User can change room, product, height per-device
- **Network Connections:** Tracks daisy-chain topology and home-runs

---

## CableRoute

**Purpose:** Represents a physical cable with explicit routing geometry

### Key Concepts

- **Explicit Segments:** Store actual cable path (not just logical device connections)
- **Length Calculation:** Sum of segment lengths + drops + buffer
- **Topology Support:** Both daisy-chain (DALI, KNX) and home-run (Cat6, LED)
- **PoE as Attribute:** PoE is power delivery over Cat6 (not a separate cable type)

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `type` | enum | Cable type: Cat6, Cat6a, DALI-2, KNX, Fiber, LED-24V, Shade-16/4 |
| `poe` | object? | PoE specification (for Cat6/Cat6a only) |
| `segments` | array | Array of 3D line segments {from, to} in meters |
| `totalLength` | number | Total cable length in meters (computed) |
| `devices` | string[] | Device IDs connected (order matters for daisy-chain) |
| `lcpId` | string? | LCP termination point |
| `metadata` | object | Cable-specific data (amperage, universe, etc.) |
| `color` | string? | Visual color override |

### Cable Types and Topologies

| Type | Topology | Max Length | Notes |
|------|----------|------------|-------|
| **DALI-2** | Daisy-chain | 300m | Max 64 devices, no loops, any other topology OK |
| **KNX** | Daisy-chain | 1000m | No loops allowed |
| **Cat6** | Home-run | 100m | One cable per device, PoE optional |
| **Cat6a** | Home-run | 100m | One cable per device, PoE optional |
| **Fiber** | Home-run | 2000m+ | Pre-fab cables, leave coil for flexibility |
| **LED-24V** | Home-run | varies | One cable per fixture, amperage tracking |
| **Shade-16/4** | Home-run | varies | 16/4 stranded, one per shade motor |

### Example: DALI-2 Daisy-Chain

```typescript
{
  id: "cable-dali-01",
  type: "DALI-2",
  segments: [
    { from: {x: 2.0, y: 3.0, z: 2.9}, to: {x: 5.0, y: 3.0, z: 2.9} },  // Horizontal ceiling run
    { from: {x: 5.0, y: 3.0, z: 2.9}, to: {x: 5.0, y: 3.0, z: 2.4} },  // Vertical drop to light
    { from: {x: 5.0, y: 3.0, z: 2.4}, to: {x: 5.0, y: 3.0, z: 2.9} },  // Climb back to ceiling
    { from: {x: 5.0, y: 3.0, z: 2.9}, to: {x: 8.0, y: 3.0, z: 2.9} },  // Continue to next light
    // ... more segments
  ],
  totalLength: 45.3,  // meters (includes drops, buffer)
  devices: ["dev-001", "dev-002", "dev-003"],  // Daisy-chain order
  lcpId: "lcp-2",
  metadata: {
    universe: 1,
    amperage: 3.5,
    deviceCount: 3
  }
}
```

### Example: Cat6 with PoE (Home-Run)

```typescript
{
  id: "cable-cat6-camera-01",
  type: "Cat6",
  poe: {
    standard: "PoE",
    watts: 8
  },
  segments: [
    { from: {x: 10.0, y: 5.0, z: 2.9}, to: {x: 10.0, y: 5.0, z: 2.5} },  // Drop from ceiling
    { from: {x: 10.0, y: 5.0, z: 2.5}, to: {x: 8.0, y: 5.0, z: 2.5} },   // Horizontal to LCP
  ],
  totalLength: 3.2,
  devices: ["dev-camera-001"],  // Single device (home-run)
  lcpId: "lcp-1",
  metadata: {
    poeWatts: 8
  }
}
```

### Cable Calculation Components

Total cable length calculation includes:

1. **Horizontal Runs:** Ceiling-level routing between points
2. **Vertical Drops:** From ceiling to device installation height
3. **Climbs:** Back to ceiling (for daisy-chain continuation)
4. **Service Loops:** +5 feet per loop marker (spare cable for future)
5. **Connection Buffer:** Per-device buffer (configurable by type)
   - Junction boxes: 12" extra
   - Lights: 8" extra
   - Sensors: 10" extra

### Design Notes

- **Explicit Geometry Enables:** Accurate routing around walls, professional visualization
- **PoE Validation:** Can check if device needs PoE+ but cable only has PoE
- **Amperage Tracking:** Sum device loads along circuit
- **Color Coding:** Each cable type has default color (KNX=green, DALI=blue, etc.)

---

## LCP (Local Control Panel)

**Purpose:** Logical drop location for cable termination

### Phase 1: Simple Placement (Current)

LCPs are **logical** drop locations placed on walls:
- Simple sequential naming: LCP-1, LCP-2, LCP-3
- Track which cables terminate there
- No subdivision yet

### Phase 2: Physical Design (Future)

Future work will add:
- Subdivision: LCP-2-1, LCP-2-2, LCP-2-3 (physical panels)
- DIN rail module layout
- Wire-to-terminal assignment
- Inter-LCP connections

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (UUID) |
| `name` | string | User-assigned name (default: LCP-1, LCP-2) |
| `position` | Vector2 | Wall location in meters {x, y} |
| `roomId` | string | Which room LCP is located in |
| `rotation` | number | Wall orientation in degrees |
| `metadata` | object? | LCP-specific data |

### Example

```typescript
{
  id: "lcp-2",
  name: "LCP-2",
  position: { x: 12.5, y: 8.3 },
  roomId: "room-utility",
  rotation: 90,  // Facing east
  metadata: {
    panelType: "24-port",
    estimatedCableCount: 28
  }
}
```

### Cable Count at LCP

Example LCP-2 cable summary:
- **2x DALI cables** (serving 30 lights via daisy chain)
- **2x KNX cables** (serving 15 sensors)
- **12x Cat6 cables** (individual runs: cameras, APs, doors)
- **8x LED cables** (individual fixtures)
- **Total: 24 cables** (not 60+ individual wires)

Daisy-chain topology significantly reduces cable count vs. home-run for everything.

### Design Notes

- **Sequential Naming:** Auto-increments LCP-1, LCP-2, etc.
- **Wall Placement:** Position + rotation defines wall location
- **Future Subdivision:** Phase 2 will add physical panel layout tools

---

## Complete Example: Kitchen Device System

### Scenario
Kitchen with:
- 4 DALI-2 canned lights (daisy-chain)
- 2 motion sensors (KNX daisy-chain)
- 1 WiFi AP (Cat6 PoE home-run)
- 1 LCP in utility room

### DeviceType Definitions

```typescript
// Canned Light Type
{
  id: "dt-canned-light",
  name: "Undirected Canned Light",
  category: "lighting",
  defaultProductId: "prod-halo-6inch",
  defaultShorthand: "CAN",
  defaultInstallationHeight: 2.9,
  symbolType: "canned-light"
}

// Motion Sensor Type
{
  id: "dt-motion-sensor",
  name: "KNX Motion Sensor",
  category: "sensors",
  defaultProductId: "prod-knx-motion",
  defaultShorthand: "MOT",
  defaultInstallationHeight: 2.7,
  symbolType: "sensor"
}

// WiFi AP Type
{
  id: "dt-wifi-ap",
  name: "WiFi Access Point",
  category: "network",
  defaultProductId: "prod-ubiquiti-u6pro",
  defaultShorthand: "AP",
  defaultInstallationHeight: 2.9,
  symbolType: "wifi-ap",
  metadata: {
    defaultRange: 50
  }
}
```

### Product Definitions

```typescript
// Halo Light
{
  id: "prod-halo-6inch",
  name: "Halo H2750 6-inch Recessed Light",
  manufacturer: "Halo",
  category: "lighting",
  ampsRequired: 0.125,
  powerRequirement: { type: "24V LED", watts: 15 }
}

// KNX Sensor
{
  id: "prod-knx-motion",
  name: "ABB KNX Motion Sensor",
  manufacturer: "ABB",
  category: "sensors"
}

// WiFi AP
{
  id: "prod-ubiquiti-u6pro",
  name: "Ubiquiti U6-Pro",
  manufacturer: "Ubiquiti",
  category: "network",
  powerRequirement: { type: "PoE+", watts: 25 },
  range: 60
}
```

### Device Instances

```typescript
// Kitchen Lights (4x)
{
  id: "dev-kitchen-light-1",
  deviceTypeId: "dt-canned-light",
  productId: "prod-halo-6inch",
  name: "Kitchen Light 1",
  position: { x: 3.0, y: 2.0 },
  rotation: 0,
  roomId: "room-kitchen",
  layerId: "layer-lights",
  installationHeight: 2.9,
  networkConnections: ["cable-dali-kitchen"],
  lcpAssignment: "lcp-1",
  metadata: { universe: 1, address: 10 },
  createdAt: 1703088000000
}
// ... dev-kitchen-light-2, 3, 4 similar

// Motion Sensors (2x)
{
  id: "dev-kitchen-sensor-1",
  deviceTypeId: "dt-motion-sensor",
  productId: "prod-knx-motion",
  name: "Kitchen Sensor 1",
  position: { x: 2.0, y: 4.0 },
  rotation: 0,
  roomId: "room-kitchen",
  layerId: "layer-sensors",
  installationHeight: 2.7,
  networkConnections: ["cable-knx-kitchen"],
  lcpAssignment: "lcp-1",
  metadata: {},
  createdAt: 1703088100000
}
// ... dev-kitchen-sensor-2 similar

// WiFi AP
{
  id: "dev-kitchen-ap",
  deviceTypeId: "dt-wifi-ap",
  productId: "prod-ubiquiti-u6pro",
  name: "Kitchen WiFi AP",
  position: { x: 5.0, y: 3.0 },
  rotation: 0,
  roomId: "room-kitchen",
  layerId: "layer-network",
  installationHeight: 2.9,
  networkConnections: ["cable-cat6-ap"],
  lcpAssignment: "lcp-1",
  metadata: { range: 60 },  // Uses product default
  createdAt: 1703088200000
}
```

### Cable Routes

```typescript
// DALI-2 Daisy-Chain (4 lights)
{
  id: "cable-dali-kitchen",
  type: "DALI-2",
  segments: [
    /* LCP to Light 1 */
    { from: {x: 1.0, y: 1.0, z: 2.9}, to: {x: 3.0, y: 2.0, z: 2.9} },
    { from: {x: 3.0, y: 2.0, z: 2.9}, to: {x: 3.0, y: 2.0, z: 2.4} },  // Drop
    { from: {x: 3.0, y: 2.0, z: 2.4}, to: {x: 3.0, y: 2.0, z: 2.9} },  // Climb
    /* Light 1 to Light 2 */
    { from: {x: 3.0, y: 2.0, z: 2.9}, to: {x: 5.0, y: 2.0, z: 2.9} },
    // ... more segments for lights 3 and 4
  ],
  totalLength: 32.5,
  devices: ["dev-kitchen-light-1", "dev-kitchen-light-2", "dev-kitchen-light-3", "dev-kitchen-light-4"],
  lcpId: "lcp-1",
  metadata: {
    universe: 1,
    amperage: 0.5,
    deviceCount: 4
  }
}

// KNX Daisy-Chain (2 sensors)
{
  id: "cable-knx-kitchen",
  type: "KNX",
  segments: [/* similar structure */],
  totalLength: 18.3,
  devices: ["dev-kitchen-sensor-1", "dev-kitchen-sensor-2"],
  lcpId: "lcp-1",
  metadata: {}
}

// Cat6 PoE+ Home-Run (WiFi AP)
{
  id: "cable-cat6-ap",
  type: "Cat6a",
  poe: { standard: "PoE+", watts: 25 },
  segments: [
    { from: {x: 1.0, y: 1.0, z: 2.9}, to: {x: 5.0, y: 3.0, z: 2.9} },
    { from: {x: 5.0, y: 3.0, z: 2.9}, to: {x: 5.0, y: 3.0, z: 2.4} }
  ],
  totalLength: 5.2,
  devices: ["dev-kitchen-ap"],
  lcpId: "lcp-1",
  metadata: { poeWatts: 25 }
}
```

### LCP

```typescript
{
  id: "lcp-1",
  name: "LCP-1",
  position: { x: 1.0, y: 1.0 },
  roomId: "room-utility",
  rotation: 0,
  metadata: {}
}
```

### Summary

This kitchen setup requires:
- **3 cables at LCP-1:**
  - 1x DALI-2 cable (serving 4 lights)
  - 1x KNX cable (serving 2 sensors)
  - 1x Cat6a PoE+ cable (serving 1 WiFi AP)
- **7 devices total**
- **~56 meters total cable length**

The daisy-chain topology (DALI, KNX) significantly reduces cable count compared to home-run everything.

---

## Data Persistence

### Storage Format

All data stored in single monolithic JSON file:

```
/projects/270-boll-ave/
  project.json           ← Current state
  .history/
    project-20251220-153000.json
    project-20251220-143000.json
```

### Project.json Structure

```typescript
{
  "version": "1.0",
  "timestamp": "2025-12-20T15:30:00Z",
  "metadata": {
    "name": "270 Boll Ave",
    "status": "Draft"
  },
  "floorPlan": { /* rooms, masks, scale */ },
  "devices": [ /* all Device instances */ ],
  "deviceTypes": [ /* DeviceType registry */ ],
  "products": [ /* Product catalog */ ],
  "cables": [ /* all CableRoute instances */ ],
  "lcps": [ /* all LCP instances */ ],
  "furniture": [ /* existing furniture system */ ],
  "settings": { /* project settings */ }
}
```

### Auto-Versioning

On each save:
1. Copy current `project.json` → `.history/project-[timestamp].json`
2. Write new `project.json`
3. Keep last N versions (10-20) or 7 days
4. Git-versioned for portability

### Benefits

- **Single Source of Truth:** Server-side JSON (not localStorage)
- **Fail-Fast:** Know immediately if save fails
- **Undo Support:** Load previous version from history
- **Git Integration:** Portable across dev environments
- **Manual Inspection:** Easy to diff and inspect JSON

---

## Units and Measurements

### Internal Storage (Canonical)

**ALWAYS METERS** for:
- Device positions (x, y)
- Installation heights
- Cable lengths
- Room dimensions
- All calculations

### Display to User

- Format based on user preference (Imperial/Metric setting)
- Use `formatDistance()` and `parseDistanceInput()` from measurementUtils
- User sees "9' 6\"" or "2.9 m" depending on preference
- **Computation always stays in meters regardless of display**

### Exception: Product Specifications

- Keep manufacturer specs in native format
- "2×2 inch recessed light" stays as "2×2 inches"
- Not used in calculations - just reference/display
- US products often spec'd in imperial

---

## Extensibility Patterns

### Adding New Device Type

1. Add entry to DeviceType registry:
   ```typescript
   {
     id: "dt-window-shade",
     name: "Automated Window Shade",
     category: "controls",
     defaultProductId: "prod-lutron-shade",
     defaultShorthand: "SHD",
     defaultInstallationHeight: 2.5,
     symbolType: "window-shade"
   }
   ```

2. Add symbol to symbol library (if new type)

3. Add layer (if new category):
   ```typescript
   {
     id: "layer-shades",
     name: "Window Shades",
     category: "controls",
     order: 17
   }
   ```

4. That's it - UI auto-populates from registry

### Adding New Cable Type

1. Add to CableRoute type enum:
   ```typescript
   type: "Cat6" | "Cat6a" | "DALI-2" | "KNX" | "Fiber" | "LED-24V" | "Shade-16/4" | "DMX-RDM"
   ```

2. Add color mapping:
   ```typescript
   CABLE_COLORS['DMX-RDM'] = '#FF00FF';  // Magenta
   ```

3. Add topology rules (if different from existing)

4. Add to cable layer system

---

## Validation and Warnings

### Non-Blocking Validation

System provides visual warnings but doesn't prevent actions:

- **DALI Universe:** Color-coded device count (green/orange/red)
- **Amperage:** Circuit load indicators (green <12A, orange 12-14A, red >14A)
- **Cable Length:** Max length warnings
- **PoE Mismatch:** Device needs PoE+ but cable only has PoE
- **Product Override:** Visual indicator when device product ≠ type default

### Blocking Validation

Only hard errors prevent action:
- **DALI Loops:** Loop detection (topology error)
- **Device Limit:** Attempting to add 65th device to DALI universe
- **Invalid Position:** Placing device outside project bounds

---

## Summary

The device system data models provide:

1. **Flexible Product Mapping:** DeviceType → default Product, with per-Device overrides
2. **Explicit Cable Geometry:** Accurate routing and length calculation
3. **Graceful Degradation:** Handle missing product data (pre-existing fixtures)
4. **Multi-Component Support:** DALI assemblies auto-expand in BOM
5. **Topology Support:** Both daisy-chain (DALI, KNX) and home-run (Cat6, LED)
6. **Extensible Architecture:** Data-driven registries for easy addition of types
7. **Metric Storage:** Consistent internal representation with unit-agnostic display
8. **Version Control:** Auto-versioned project snapshots with Git integration

These models support the full device placement, specification, cable routing, and BOM generation workflows.

---

**End of Document**
