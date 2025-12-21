# Cable Routing Specification

**Date:** 2025-12-20
**Reference:** `tickets/device-system-design-decisions.md`

---

## Overview

This document specifies the cable routing system for device interconnection and power delivery. The system supports manual cable routing with intelligent assistance, topology-specific rules, and accurate length calculation.

### Key Principles

1. **Manual Routing:** User draws cable paths segment-by-segment (no automatic pathfinding)
2. **Explicit Geometry:** Store actual cable segments in 3D (not just logical connections)
3. **Intelligent Assistance:** Magnetic parallel snapping, bundled turns, controlled spacing
4. **Topology-Aware:** Different rules for daisy-chain (DALI, KNX) vs home-run (Cat6, LED)
5. **Accurate Calculations:** Include horizontal runs, vertical drops, buffer, service loops
6. **Visual Feedback:** Color-coded by type, validation warnings, device count indicators

---

## Cable Types and Properties

### Complete Cable Type Matrix

| Cable Type | Physical Spec | Topology | Max Length | Max Devices | PoE Support | Notes |
|------------|---------------|----------|------------|-------------|-------------|-------|
| **DALI-2** | 18/2 or 16/2 | Daisy-chain | 300m | 64 | No | No loops, any other topology OK |
| **KNX** | Twisted pair | Daisy-chain | 1000m | Varies | No | No loops allowed |
| **Cat6** | 4-pair UTP | Home-run | 100m | 1 per cable | Yes | PoE optional |
| **Cat6a** | 4-pair UTP | Home-run | 100m | 1 per cable | Yes | PoE optional, higher bandwidth |
| **Fiber** | Single/Multi-mode | Home-run | 2000m+ | 1 per cable | No | Pre-fab, leave coil |
| **LED-24V** | 18/2 or 16/2 | Home-run | Varies | 1 per cable | No | Amperage tracking |
| **Shade-16/4** | 16/4 stranded | Home-run | Varies | 1 per cable | No | Window shade motors |

### Cable Type Details

#### DALI-2 (Digital Addressable Lighting Interface)

**Physical:**
- Wire gauge: 18/2 or 16/2
- Polarity: Not critical (DALI is polarity-independent)
- Shielding: Not required (but can help in noisy environments)

**Topology:**
- **Daisy-chain preferred:** LCP → Light 1 → Light 2 → ... → Light N
- **NO LOOPS:** Loop detection is an error (bus architecture)
- **Other topologies allowed:** Star, tree, hybrid (as long as no loops)
- **Device limit:** 64 devices per universe (DALI spec)

**Electrical:**
- Voltage: 16V DC (DALI bus voltage)
- Max current: 250mA per segment (DALI spec)
- Power budget: Sum device loads (typically 0.5-2mA per device for bus power)

**Rules:**
- Device count warning thresholds:
  - Green: 0-50 devices (safe, user configurable)
  - Orange: 51-62 devices (approaching limit)
  - Red: 63-64 devices (at max, consider splitting)
- Junction boxes required for T-junctions (attic routing)
- Max cable length: 300m (DALI spec)

#### KNX (Building Automation Bus)

**Physical:**
- Twisted pair (KNX certified cable)
- Red/black or green/yellow pairs (standard colors)

**Topology:**
- **Daisy-chain:** Bus topology (similar to DALI)
- **NO LOOPS:** Loop detection is an error
- **Line topology:** Main line with optional branches

**Electrical:**
- Voltage: 29V DC (KNX bus voltage)
- Max current: Depends on power supply (typically 640mA per line)

**Rules:**
- Max cable length: 1000m per line (without repeaters)
- Backbone/line structure for large installations (future)
- Terminating resistors at line ends (120Ω)

#### Cat6 / Cat6a (Ethernet)

**Physical:**
- 4-pair twisted pair (UTP or STP)
- RJ45 terminations
- 23 AWG

**Topology:**
- **Home-run only:** Each device gets individual cable to LCP/switch
- **No daisy-chain:** Ethernet is point-to-point
- **Star topology:** All cables radiate from central switch

**Electrical:**
- Data: 1 Gbps (Cat6) or 10 Gbps (Cat6a)
- PoE power delivery (optional):
  - PoE (802.3af): 15W max
  - PoE+ (802.3at): 25W max
  - PoE++ (802.3bt): 60W max

**Rules:**
- Max cable length: 100m (Ethernet spec)
- PoE power budget tracking per switch:
  - Example: 24-port switch with 370W PoE budget
  - Display: "285W / 370W" with color coding
- Validation: Device needs PoE+ but cable only has PoE → warning

#### Fiber Optic

**Physical:**
- Single-mode or multi-mode fiber
- LC, SC, or ST connectors
- Pre-fabricated cables (typically)

**Topology:**
- **Home-run:** Point-to-point links
- **LCP to Tech Closet:** Backbone connections

**Rules:**
- Max length: 2000m+ (depends on fiber type and equipment)
- Leave service coil (10-15m) for flexibility
- Cannot be spliced in field (pre-fab only)

#### LED-24V (Low Voltage Lighting)

**Physical:**
- 18/2 or 16/2 wire (varies by fixture wattage)
- Polarity critical (+ / -)

**Topology:**
- **Home-run:** One cable per fixture
- **Parallel possible:** Multiple fixtures on one circuit (with proper sizing)

**Electrical:**
- Voltage: 24V DC
- Amperage tracking: Sum fixture loads
- Circuit limit: 15A typical (with proper wire gauge)

**Rules:**
- Amperage calculation: Sum all fixtures on circuit
- Display: "12.5A / 15A" with color coding:
  - Green: <12A (80% safe)
  - Orange: 12-14A (approaching limit)
  - Red: >14A (over safe threshold, warning)
- Wire gauge appropriate for amperage and length

#### Shade-16/4 (Window Shade Control)

**Physical:**
- 16/4 stranded wire
- 4 conductors for motor + control

**Topology:**
- **Home-run:** One cable per shade motor

**Rules:**
- Max length: Varies by motor specifications
- Control wiring separate from power

---

## Cable Topology Rules

### Daisy-Chain Topology (DALI, KNX)

**Characteristics:**
- Multiple devices connected along single cable run
- Sequential wiring: Device 1 → Device 2 → Device 3
- Significantly reduces cable count vs. home-run

**Example: DALI Universe**
```
LCP-2 ─────┬───→ Light 1 ─────┬───→ Light 2 ─────┬───→ Light 3
           │                  │                  │
        (drop to              (drop to              (drop to
         ceiling               ceiling               ceiling
         height)               height)               height)
```

**Cable Segments:**
1. Horizontal run from LCP to Light 1 location
2. Vertical drop to Light 1 height
3. Vertical climb back to ceiling
4. Horizontal run to Light 2 location
5. Repeat for each device in chain

**Advantages:**
- **Cable Count:** 2 cables at LCP (in/out) serving 30 devices
- **Cost Effective:** Less wire than home-run
- **Easy Expansion:** Add devices along route

**Rules:**
- **Device Order Matters:** Array order = physical daisy-chain order
- **No Loops:** Detection of loop topology = error
- **Max Devices:** 64 for DALI (enforced)
- **Junction Boxes:** Required for T-junctions

### Home-Run Topology (Cat6, LED, Fiber, Shades)

**Characteristics:**
- One cable per device, direct to LCP/switch
- No shared cables between devices
- Higher cable count, simpler troubleshooting

**Example: Cat6 Network**
```
        ┌─→ Camera 1
        │
        ├─→ Camera 2
        │
LCP-1 ──┼─→ WiFi AP 1
        │
        ├─→ Door Access 1
        │
        └─→ Door Access 2
```

**Advantages:**
- **Isolation:** Device failures don't affect others
- **Bandwidth:** Full bandwidth per device (Ethernet)
- **Troubleshooting:** Easy to identify failed cable

**Disadvantages:**
- **Cable Count:** High wire count at LCP (12 cameras = 12 cables)
- **Cost:** More cable material required

---

## Cable Drawing Tool

### User Workflow

1. **Select Cable Type:** Choose from palette (Cat6, DALI-2, etc.)
2. **Click to Route:** Click points to define cable path
   - First click: Start point (device or LCP)
   - Subsequent clicks: Waypoints (corners, routing points)
   - Last click: End point (device or LCP)
3. **Vertical Drops:** System auto-calculates based on device heights
4. **Finalize:** Press Enter to complete, Escape to cancel

### Segment-by-Segment Routing

Each click creates a segment:
```
Click 1 (LCP) ──────→ Click 2 (corner) ──────→ Click 3 (device)
     Segment 1             Segment 2
```

Segments stored as explicit geometry:
```typescript
segments: [
  { from: {x: 1.0, y: 1.0, z: 2.9}, to: {x: 5.0, y: 1.0, z: 2.9} },
  { from: {x: 5.0, y: 1.0, z: 2.9}, to: {x: 5.0, y: 5.0, z: 2.9} },
  { from: {x: 5.0, y: 5.0, z: 2.9}, to: {x: 5.0, y: 5.0, z: 2.4} }  // Drop
]
```

### Vertical Drop Handling

System automatically calculates vertical drops:

**Ceiling-height routing:**
- Default Z: Ceiling height (from project settings, e.g., 2.9m)

**Drop to device:**
- From: Ceiling height (2.9m)
- To: Device installation height (e.g., 2.4m for sconce)
- Segment added automatically

**Climb back to ceiling (daisy-chain):**
- From: Device height (2.4m)
- To: Ceiling height (2.9m)
- Continue horizontal routing

**User Control:**
- Manual Z adjustment for attic routing, drops, etc.
- Intermediate waypoints can specify custom Z height

---

## Cable Routing Assistance

### Magic Parallel Pathing

**Behavior:**
When routing new cable near existing cable (within threshold):
1. **Magnetic Snap:** New cable snaps to parallel path
2. **Controlled Spacing:** Maintains consistent distance (default 0.1m)
3. **Visual Feedback:** Highlight snap target, show spacing guide
4. **Toggle:** "Parallel Mode" on/off for freehand routing

**Spacing Control:**
- **Default:** 0.1m (4 inches) between parallel cables
- **Adjustable:** 0.05m to 0.3m (2-12 inches)
- **Per-Cable Override:** Some cables need custom spacing

**Example:**
```
Existing cable:  ═════════════════════
                    ↑ 0.1m spacing
New cable:       ═════════════════════  (snaps parallel)
```

**Benefits:**
- Professional appearance (no spaghetti mess)
- Consistent spacing for wire management
- Faster routing (snap to existing paths)

### Auto-Bundled Turns

**Behavior:**
When parallel cables turn corner:
1. **Bundle Turn:** All cables turn together
2. **Consistent Radius:** Uniform curve radius (e.g., 0.3m)
3. **Maintain Spacing:** Parallel spacing preserved through turn

**Example:**
```
Cable 1:  ═══════╗
          ║      ║
Cable 2:  ═══════╝

Bundled turn with consistent radius and spacing
```

**Benefits:**
- Clean, professional routing visualization
- Realistic cable tray/conduit behavior
- Easier to estimate actual installation

### Snap to Devices and LCPs

**Behavior:**
- **Near Device:** Cable endpoint snaps to device position
- **Near LCP:** Cable endpoint snaps to LCP position
- **Snap Radius:** Within 0.5m (configurable)
- **Visual Feedback:** Highlight target device/LCP

**Connection Logic:**
```typescript
// When cable endpoint snaps to device
if (snapToDevice) {
  cable.devices.push(deviceId);
  device.networkConnections.push(cableId);
  device.lcpAssignment = cable.lcpId;
}
```

---

## Cable Length Calculation

### Components

Total cable length = Sum of:
1. **Horizontal Segments:** Sum of ceiling-level routing
2. **Vertical Drops:** From ceiling to device height
3. **Vertical Climbs:** Back to ceiling (daisy-chain only)
4. **Service Loops:** +5 feet per loop marker
5. **Connection Buffer:** Per-device buffer (varies by type)

### Calculation Formula

```typescript
function calculateCableLength(cable: CableRoute, devices: Device[]): number {
  let totalLength = 0;

  // Sum all segment lengths (3D Euclidean distance)
  for (const segment of cable.segments) {
    totalLength += distance3D(segment.from, segment.to);
  }

  // Add service loops
  const serviceLoops = cable.metadata.serviceLoops || [];
  totalLength += serviceLoops.length * 1.524;  // 5 feet per loop in meters

  // Add connection buffer per device
  for (const deviceId of cable.devices) {
    const device = findDevice(deviceId);
    const bufferMeters = getDeviceBuffer(device.deviceTypeId);
    totalLength += bufferMeters;
  }

  return totalLength;
}
```

### Connection Buffer by Device Type

| Device Type | Buffer |
|-------------|--------|
| Junction Box | 0.30m (12") |
| Light Fixture | 0.20m (8") |
| Sensor | 0.25m (10") |
| Switch | 0.20m (8") |
| Camera | 0.30m (12") |
| LCP Termination | 0.50m (20") |

### Service Loop Markers

**Purpose:** Spare cable loops for future use

**Types:**
- **In-Wall Loop:** Future switch/outlet location
- **Window Loop:** Future shade installation
- **General Spare:** Flexibility for changes

**Placement:**
- User places marker on cable route
- Visual indicator: Circle with "S" annotation
- Adds 5 feet (1.524m) to total length

**Example:**
```
LCP ─────(S)─────→ Light 1 ─────→ Light 2
         ↑
    Service loop marker
    +5 feet to cable length
```

---

## Color Coding System

### Cable Type Colors (Industry Standard)

| Cable Type | Color | Hex Code | Industry Standard? |
|------------|-------|----------|-------------------|
| **KNX** | Green | `#00AA00` | ✅ Yes (KNX = green) |
| **DALI-2** | Blue | `#0066CC` | Conventional |
| **Cat6** | Orange | `#FF9900` | Common for data |
| **Cat6a** | Yellow | `#FFCC00` | Common for data |
| **Fiber** | Purple | `#9933CC` | Common for fiber |
| **LED-24V** | Red | `#CC0000` | Power (red) |
| **Shade-16/4** | Brown/Tan | `#996633` | Neutral |

### Color Overrides

**User Customization:**
- Per-cable override: "This Cat6 run is blue"
- Global type override: "All Cat6 cables are green in this project"
- Saved in project settings

### Color for Validation States

**Normal:**
- Cable type color (see table above)

**Warning:**
- Orange tint overlay
- Example: DALI universe at 60 devices (orange threshold)

**Error:**
- Red overlay
- Example: DALI loop detected, cable length exceeds max

### Multi-Category Ethernet

**Problem:** Same Cat6 cable used for different purposes
- Security cameras
- Door access
- WiFi APs
- General network

**Solution: Layer-Based Filtering**
- User assigns cable to category/layer
- Filter: "Show Security cables only"
- Color by category or function (user choice)

**Example:**
```typescript
cable.metadata.category = "Security";  // User-assigned
cable.metadata.function = "PTZ Camera";
```

---

## Rules Engine and Validation

### DALI-2 Rules

#### Device Count Tracking

**Thresholds (User Configurable):**
```typescript
settings.daliWarningThresholds = {
  green: 50,   // 0-50 devices (safe)
  orange: 62,  // 51-62 devices (warning)
  red: 64      // 63-64 devices (at max)
}
```

**Visual Indicators:**
- Cable color tint based on device count
- Tooltip: "DALI Universe 1: 48 devices / 64 max (OK)"
- Summary panel shows all universes with device counts

#### Amperage Tracking

**Calculation:**
```typescript
function calculateDALIAmperage(cable: CableRoute, devices: Device[]): number {
  let totalAmps = 0;
  for (const deviceId of cable.devices) {
    const device = findDevice(deviceId);
    totalAmps += device.metadata.ampsRequired || 0;
  }
  return totalAmps;
}
```

**Display:**
```
DALI Universe 1: 12.5A / 15A
Color: Green (<12A), Orange (12-14A), Red (>14A)
```

**Validation:**
- Warning if >14A (exceeding safe threshold)
- Non-blocking (user can override with proper wire gauge)

#### Topology Validation

**Loop Detection:**
```typescript
function detectDALILoop(cable: CableRoute): boolean {
  // Build graph from cable segments
  // Check for cycles using DFS
  // Return true if loop detected
}
```

**Error Display:**
- Red cable overlay
- Tooltip: "⚠️ DALI topology error: Loop detected"
- Blocking (must fix to proceed)

#### Max Cable Length

**Validation:**
```typescript
if (cable.totalLength > 300) {  // DALI max length
  warning("Cable length exceeds DALI spec (300m)");
}
```

**Non-blocking:** User can proceed but should split universe

### KNX Rules

#### Similar to DALI:
- No loops allowed (topology validation)
- Max cable length: 1000m (warning)
- Device count varies (not fixed like DALI)

### Cat6/PoE Rules

#### Power Budget Tracking

**Per-Switch/LCP:**
```typescript
function calculatePoEBudget(lcp: LCP, cables: CableRoute[]): {
  totalWatts: number;
  maxWatts: number;
} {
  let totalWatts = 0;
  const cablesAtLCP = cables.filter(c => c.lcpId === lcp.id && c.poe);

  for (const cable of cablesAtLCP) {
    totalWatts += cable.poe.watts;
  }

  const maxWatts = lcp.metadata.poeBudget || 370;  // Default 24-port switch
  return { totalWatts, maxWatts };
}
```

**Display:**
```
LCP-1 PoE Budget: 285W / 370W (OK)
Color: Green (<80%), Orange (80-95%), Red (>95%)
```

#### Max Length Validation

```typescript
if (cable.totalLength > 100 && cable.type.startsWith('Cat6')) {
  warning("Ethernet cable exceeds 100m spec");
}
```

#### PoE Mismatch Warning

```typescript
if (device.powerRequirement.type === 'PoE+' && cable.poe.standard === 'PoE') {
  warning("Device requires PoE+ (25W) but cable only provides PoE (15W)");
}
```

### LED-24V Amperage Rules

**Circuit Tracking:**
```typescript
function calculateLEDCircuitLoad(cables: CableRoute[]): number {
  let totalAmps = 0;
  for (const cable of cables) {
    for (const deviceId of cable.devices) {
      const device = findDevice(deviceId);
      totalAmps += device.metadata.ampsRequired || 0;
    }
  }
  return totalAmps;
}
```

**Display:**
```
LED Circuit 1: 11.2A / 15A (OK)
Color: Green (<12A), Orange (12-14A), Red (>14A)
```

---

## Cable Visualization

### Rendering on Floor Plan

**Z-Index Layers (back to front):**
1. Floor plan base
2. Rooms/polygons
3. Furniture
4. Range indicators
5. Device symbols
6. **Cable routes** ← Render here
7. Shorthand text
8. Selection highlights

### Cable Line Rendering

**Basic Rendering:**
- Line width: 3px (at 1.0× zoom)
- Line color: Cable type color (see color table)
- Line style: Solid (normal), Dashed (unconnected), Dotted (error)

**Parallel Cable Bundle:**
- Multiple cables rendered side-by-side
- Maintain visual spacing (scaled with zoom)
- Bundle turns rendered with curves

**Vertical Segments:**
- Dashed line for vertical drops/climbs
- Different line style to distinguish from horizontal

### Annotations

**Device Count (Daisy-Chain):**
- Display at LCP termination: "DALI-1: 32 devices"
- Color-coded by threshold (green/orange/red)

**Cable Length:**
- Display along cable route: "45.3m"
- Toggle visibility in settings

**Service Loop Markers:**
- Circle with "S" annotation
- Hover tooltip: "Service loop: +5 feet"

### Hover/Selection States

**Hover:**
- Highlight cable route (thicker line)
- Show tooltip with cable info:
  ```
  DALI-2 Universe 1
  32 devices / 64 max
  48.5m total length
  12.5A / 15A
  ```

**Selected:**
- Bright highlight color
- Show all connected devices highlighted
- Display cable properties panel

**Multi-Select:**
- Select multiple cables for bulk operations
- Show combined statistics (total length, total devices, etc.)

---

## LCP Cable Summary

### Per-LCP View

**Summary Panel:**
```
LCP-2 Cable Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DALI-2 Cables:
  • Universe 1: 30 devices, 45.3m, 11.2A
  • Universe 2: 28 devices, 42.1m, 10.8A

KNX Cables:
  • Line 1: 12 sensors, 32.5m
  • Line 2: 8 sensors, 28.3m

Cat6/PoE Cables (Home-Runs):
  • Camera-1: 15.2m, PoE 8W
  • Camera-2: 18.5m, PoE 8W
  • WiFi-AP-1: 12.3m, PoE+ 25W
  • Door-Access-1: 20.1m, PoE+ 15W
  ... (12 total)

LED-24V Cables (Home-Runs):
  • Light-1: 8.5m, 1.2A
  • Light-2: 9.2m, 1.2A
  ... (8 total)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Cables: 24
Total Cable Length: 385.2m
PoE Budget: 285W / 370W (77%)
```

**Click to Zoom:**
- Click cable in summary → floor plan zooms to cable route
- Click device → floor plan zooms to device location

---

## Export and Specification

### Cable Schedule Export

**Format:** CSV, Markdown, PDF

**Columns:**
- Cable ID
- Type
- From (device/LCP)
- To (device/LCP)
- Length (meters / feet)
- Device Count (daisy-chain)
- Amperage / PoE Watts
- Notes (service loops, warnings)

**Example CSV:**
```csv
Cable ID,Type,From,To,Length (m),Devices,Load,Notes
cable-dali-01,DALI-2,LCP-2,32 lights,48.5,32,12.5A,Universe 1
cable-cat6-01,Cat6,LCP-1,Camera-1,15.2,1,PoE 8W,
cable-cat6-02,Cat6,LCP-1,Camera-2,18.5,1,PoE 8W,
...
```

### BOM Integration

**Cable Requirements:**
- Total length per cable type
- Add slack percentage (10-20% for waste/pulls)
- Connectors/terminations count
- Junction boxes required

**Example:**
```
Cable Materials BOM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DALI-2 Cable (18/2):
  • Total length: 385m + 20% slack = 462m
  • Connectors: 64 WAGO 2-port

Cat6 Cable:
  • Total length: 285m + 15% slack = 328m
  • RJ45 connectors: 48 (24 cables × 2 ends)
  • Patch panel: 24-port

Junction Boxes:
  • 4× weatherproof (outdoor)
  • 6× standard (attic)
```

---

## Settings and Configuration

### Global Cable Settings

**Location:** Settings > Floorplan > Cables

**Options:**
- **Show Cable Routing:** Toggle visibility
- **Cable Parallel Spacing:** 0.05m - 0.3m (default: 0.1m)
- **Parallel Mode:** Auto-snap enabled/disabled
- **Service Loop Default:** 5 feet (1.524m)
- **Connection Buffer by Type:** Customizable per device type

### Per-Cable Type Settings

**DALI-2:**
- Device warning thresholds: Green (50), Orange (62), Red (64)
- Circuit amperage limit: 15A
- Max cable length warning: 300m

**KNX:**
- Max cable length warning: 1000m

**Cat6/PoE:**
- Max cable length warning: 100m
- PoE budget per switch: 370W (or custom)

**LED-24V:**
- Circuit amperage limit: 15A
- Voltage drop calculations: Enable/disable

### Color Overrides

**Per-Type Defaults:**
```typescript
settings.cableColors = {
  'DALI-2': '#0066CC',
  'KNX': '#00AA00',
  'Cat6': '#FF9900',
  // ... etc
}
```

**Per-Cable Override:**
```typescript
cable.color = '#FF0000';  // Override for this specific cable
```

---

## Future Enhancements

### Automatic Pathfinding (Out of Scope - Phase 1)

Future feature: automatic cable routing around obstacles
- A* pathfinding algorithm
- Obstacle avoidance (walls, furniture)
- Optimal path calculation
- Manual override still available

### Multi-Floor Cable Routing

Future feature: cables between floors
- Vertical risers/chases
- Inter-floor connection points
- 3D visualization

### Voltage Drop Calculations

Future feature: advanced electrical calculations
- Wire gauge recommendations based on length and load
- Voltage drop warnings
- Power quality analysis

### Cable Tray/Conduit Modeling

Future feature: infrastructure modeling
- Cable tray paths
- Conduit sizing
- Fill percentage calculations (NEC compliance)

---

## Summary

The cable routing system provides:

1. **7 Cable Types:** DALI-2, KNX, Cat6, Cat6a, Fiber, LED-24V, Shade-16/4
2. **Topology Support:** Daisy-chain (DALI, KNX) and home-run (Cat6, LED, Fiber, Shades)
3. **Intelligent Routing:** Parallel snapping, bundled turns, controlled spacing
4. **Accurate Calculations:** Horizontal + vertical + buffer + service loops
5. **Validation Engine:** Device limits, amperage tracking, topology rules, cable length
6. **Visual Feedback:** Color-coded by type, validation states, device count indicators
7. **Professional Output:** Cable schedules, BOM integration, specification export

This system enables accurate cable planning with visual routing, realistic length calculations, and automated validation for professional integration projects.

---

**End of Document**
