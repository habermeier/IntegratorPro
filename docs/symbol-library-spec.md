# Symbol Library Specification

**Date:** 2025-12-20
**Reference:** `tickets/device-system-design-decisions.md`

---

## Overview

This document specifies the symbol library for device visualization on the floor plan. Symbols are **world-space** elements that scale with zoom, providing consistent representation of devices regardless of view scale.

### Key Principles

1. **World-Space Sizing:** Symbols sized in meters (not pixels), scale with zoom
2. **Visibility over Accuracy:** Symbol size optimized for visibility (not physical accuracy)
3. **Global Size Control:** Single multiplier affects all symbols proportionally
4. **Visual Clarity:** Distinct symbols for each device category
5. **Shorthand Annotations:** 3-4 letter codes for quick identification

---

## Symbol Sizing

### Base Size System

Symbols are defined in **world-space meters** (not pixels):

- **Canned Light:** 0.3m diameter circle
- **Outdoor Sconce:** 0.25m wall-mount indicator
- **Security Camera:** 0.4m camera icon
- **WiFi Access Point:** 0.35m wireless icon
- **Motion Sensor:** 0.2m sensor icon
- **LCP/Panel:** 0.6m panel box
- **Chandelier:** 0.5m decorative fixture
- **Ceiling Fan:** 0.6m fan blades

### Global Symbol Size Multiplier

**User Setting:** 0.5× to 2.0× (default: 1.0×)

- **Too Cluttered:** Reduce to 0.7× or 0.5×
- **Too Small:** Increase to 1.3× or 1.5×
- **Saved with Project:** Part of project.json settings
- **Affects All Symbols:** Proportional scaling

### Zoom Behavior

- **Zoom Out:** Symbols get smaller with room (maintain world-space relationships)
- **Zoom In:** Symbols get larger (show detail)
- **Consistent:** Everything scales together (furniture, rooms, devices)
- **To See Detail:** User zooms in (natural interaction)

---

## Symbol Categories

### Lighting Symbols

#### Undirected Canned Light
- **Symbol:** Circle with crosshairs (downward arrow)
- **Base Size:** 0.3m diameter
- **Shorthand:** "CAN"
- **Color:** Warm white (#FFE5B4)
- **Description:** Recessed ceiling light, general illumination

#### Focus Light / Spotlight
- **Symbol:** Circle with directional cone
- **Base Size:** 0.3m diameter
- **Shorthand:** "FOC"
- **Color:** Bright white (#FFFFFF)
- **Description:** Directional recessed light, accent lighting

#### Track Light
- **Symbol:** Rectangle with directional indicator
- **Base Size:** 0.4m length
- **Shorthand:** "TRK"
- **Color:** White (#F8F8F8)
- **Description:** Track-mounted adjustable light

#### Outdoor Sconce
- **Symbol:** Wall-mount semi-circle with rays
- **Base Size:** 0.25m
- **Shorthand:** "OSC"
- **Color:** Yellow-white (#FFF8DC)
- **Description:** Exterior wall-mounted light

#### Chandelier
- **Symbol:** Decorative multi-arm fixture icon
- **Base Size:** 0.5m diameter
- **Shorthand:** "CHN"
- **Color:** Gold (#FFD700)
- **Description:** Decorative hanging fixture

#### Ceiling Fan (with light)
- **Symbol:** Fan blades with center light
- **Base Size:** 0.6m diameter
- **Shorthand:** "FAN"
- **Color:** Gray (#C0C0C0)
- **Description:** Ceiling fan with integrated lighting

#### Pendant Light
- **Symbol:** Suspended fixture with cord
- **Base Size:** 0.35m
- **Shorthand:** "PND"
- **Color:** Cream (#FFFACD)
- **Description:** Hanging pendant fixture

#### Under-Cabinet Light
- **Symbol:** Horizontal bar with downward rays
- **Base Size:** 0.4m length
- **Shorthand:** "UC"
- **Color:** Cool white (#F0F8FF)
- **Description:** Under-cabinet task lighting

---

### Sensor Symbols

#### Motion Sensor (Ceiling)
- **Symbol:** Circle with motion wave indicators
- **Base Size:** 0.2m diameter
- **Shorthand:** "MOT"
- **Color:** Light blue (#ADD8E6)
- **Description:** Ceiling-mounted motion detection

#### Presence Sensor
- **Symbol:** Circle with "P" indicator
- **Base Size:** 0.2m diameter
- **Shorthand:** "PRE"
- **Color:** Sky blue (#87CEEB)
- **Description:** Occupancy detection sensor

#### Location Sensor
- **Symbol:** Circle with crosshair target
- **Base Size:** 0.25m diameter
- **Shorthand:** "LOC"
- **Color:** Dodger blue (#1E90FF)
- **Description:** Precision location tracking sensor

#### Light Sensor (Photocell)
- **Symbol:** Circle with sun/moon icon
- **Base Size:** 0.15m diameter
- **Shorthand:** "LUX"
- **Color:** Yellow (#FFFF99)
- **Description:** Ambient light level sensor

#### Temperature Sensor
- **Symbol:** Thermometer icon
- **Base Size:** 0.2m
- **Shorthand:** "TMP"
- **Color:** Orange (#FFB366)
- **Description:** Temperature monitoring

---

### Security Symbols

#### Security Camera (Fixed)
- **Symbol:** Camera body with lens
- **Base Size:** 0.4m
- **Shorthand:** "CAM"
- **Color:** Dark gray (#696969)
- **Description:** Fixed security camera

#### PTZ Camera
- **Symbol:** Camera with rotation indicator
- **Base Size:** 0.45m
- **Shorthand:** "PTZ"
- **Color:** Charcoal (#36454F)
- **Description:** Pan-tilt-zoom camera

#### Doorbell Camera
- **Symbol:** Doorbell with camera lens
- **Base Size:** 0.25m
- **Shorthand:** "DBL"
- **Color:** Bronze (#CD7F32)
- **Description:** Video doorbell

#### Door Access (Face Recognition)
- **Symbol:** Door with face icon
- **Base Size:** 0.3m
- **Shorthand:** "ACC"
- **Color:** Steel blue (#4682B4)
- **Description:** Biometric door access control

#### Glass Break Sensor
- **Symbol:** Window with shatter icon
- **Base Size:** 0.2m
- **Shorthand:** "GLS"
- **Color:** Light gray (#D3D3D3)
- **Description:** Glass break detection

---

### Network Symbols

#### WiFi Access Point
- **Symbol:** Radio waves icon
- **Base Size:** 0.35m diameter
- **Shorthand:** "AP"
- **Color:** Green (#90EE90)
- **Description:** Wireless network access point

#### Network Switch
- **Symbol:** Switch box with ports
- **Base Size:** 0.5m
- **Shorthand:** "SW"
- **Color:** Forest green (#228B22)
- **Description:** Network switch

#### Network Drop
- **Symbol:** Ethernet port icon
- **Base Size:** 0.2m
- **Shorthand:** "NET"
- **Color:** Lime (#00FF00)
- **Description:** Ethernet network drop

---

### Control Symbols

#### Wall Switch (Single)
- **Symbol:** Rectangle with toggle
- **Base Size:** 0.15m
- **Shorthand:** "SW"
- **Color:** White (#FFFFFF)
- **Description:** Single-gang wall switch

#### Dimmer Switch
- **Symbol:** Rectangle with slider icon
- **Base Size:** 0.15m
- **Shorthand:** "DIM"
- **Color:** Beige (#F5F5DC)
- **Description:** Dimming control switch

#### Keypad (Multi-Button)
- **Symbol:** Rectangle with button grid
- **Base Size:** 0.2m
- **Shorthand:** "KEY"
- **Color:** Light gray (#E8E8E8)
- **Description:** Multi-button control keypad

#### Shade Controller
- **Symbol:** Window with up/down arrows
- **Base Size:** 0.25m
- **Shorthand:** "SHD"
- **Color:** Tan (#D2B48C)
- **Description:** Motorized shade control

#### Window Shade Motor
- **Symbol:** Tubular motor icon
- **Base Size:** 0.3m length
- **Shorthand:** "MTR"
- **Color:** Brown (#A0522D)
- **Description:** Shade motor mechanism

---

### Infrastructure Symbols

#### LCP (Local Control Panel)
- **Symbol:** Large panel box
- **Base Size:** 0.6m
- **Shorthand:** "LCP"
- **Color:** Dark blue (#000080)
- **Description:** Control panel / patch panel location

#### Junction Box
- **Symbol:** Octagonal box
- **Base Size:** 0.2m
- **Shorthand:** "JB"
- **Color:** Gray (#808080)
- **Description:** Cable junction point

#### Power Outlet
- **Symbol:** Duplex receptacle
- **Base Size:** 0.15m
- **Shorthand:** "PWR"
- **Color:** Red (#FF6B6B)
- **Description:** AC power outlet

---

### HVAC Symbols

#### Thermostat
- **Symbol:** Rectangular control with display
- **Base Size:** 0.2m
- **Shorthand:** "TST"
- **Color:** Light orange (#FFB347)
- **Description:** Climate control thermostat

#### Supply Vent
- **Symbol:** Vent with outward arrows
- **Base Size:** 0.3m
- **Shorthand:** "SUP"
- **Color:** Light blue (#B0E0E6)
- **Description:** HVAC supply vent

#### Return Vent
- **Symbol:** Vent with inward arrows
- **Base Size:** 0.3m
- **Shorthand:** "RET"
- **Color:** Light coral (#F08080)
- **Description:** HVAC return vent

---

## Symbol Design Guidelines

### Visual Style

1. **Simple Geometric Shapes:** Circles, rectangles, triangles for clarity
2. **Clear Iconography:** Recognizable at small and large scales
3. **Distinct Silhouettes:** Each category immediately distinguishable
4. **Minimal Detail:** Avoid fine details that disappear when zoomed out
5. **Consistent Line Weight:** Proportional to symbol size

### Color Coding by Category

| Category | Color Palette | Purpose |
|----------|--------------|---------|
| **Lighting** | Warm whites, yellows, golds | Easy identification of light types |
| **Sensors** | Blues, light blues | Distinct from lighting |
| **Security** | Grays, dark tones | Professional/serious appearance |
| **Network** | Greens | Industry standard for network |
| **Controls** | Whites, beiges, grays | Neutral control elements |
| **Infrastructure** | Dark blues, grays | Structural elements |
| **HVAC** | Orange/blue (hot/cold) | Temperature association |

### Rendering Details

- **Symbol Outline:** 2px at 1.0× scale (scales with multiplier)
- **Fill:** Semi-transparent (80% opacity) for overlapping visibility
- **Stroke:** Solid color, slightly darker than fill
- **Text (Shorthand):** Sans-serif, bold, scaled to 0.6× symbol size
- **Multi-Component Indicator:** Asterisk (*) in top-right corner

---

## Shorthand Annotation System

### Purpose

3-4 letter codes displayed on/near symbols for quick device identification without zooming.

### Placement

- **Small Symbols (<0.3m):** Text below symbol
- **Medium Symbols (0.3-0.5m):** Text centered in symbol
- **Large Symbols (>0.5m):** Text centered in symbol

### Typography

- **Font:** Sans-serif, bold
- **Size:** 0.6× symbol diameter (scales with zoom)
- **Color:** High contrast with symbol fill
  - Light symbols → Dark text
  - Dark symbols → Light text
- **Minimum Readable Size:** Fade out below certain zoom threshold

### Default Shorthands

See individual symbol specifications above. Examples:
- CAN = Canned Light
- FOC = Focus Light
- MOT = Motion Sensor
- CAM = Camera
- AP = Access Point
- LCP = Local Control Panel

### Product Overrides

Products can specify custom shorthand:
```typescript
// DeviceType default
defaultShorthand: "FOC"

// Product override
shorthand: "FCL"  // Manufacturer-specific branding
```

Display logic: `product.shorthand || deviceType.defaultShorthand || null`

---

## Symbol State Indicators

### Override Indicator

When device product ≠ DeviceType default:
- **Visual:** Symbol border changes to orange/yellow
- **Tooltip:** "Custom product selected"
- **Purpose:** Highlight non-standard selections

### Multi-Component Indicator

When product has components array:
- **Visual:** Asterisk (*) in top-right corner of symbol
- **Color:** Bright yellow (#FFD700)
- **Tooltip:** "Multi-component product (3 parts)"
- **Purpose:** BOM will expand to sub-parts

### Connection Status

- **Connected:** Solid symbol (normal)
- **Unconnected:** Dashed outline (no cable routing)
- **Warning:** Red outline (validation issue)
- **Error:** Red fill (critical issue)

### Selection/Hover States

- **Hover:** Highlight with glow effect (20% white overlay)
- **Selected:** Thick border (4px), bright color
- **Multi-Select:** Distinct border pattern (dashed)

---

## Symbol Rendering Implementation

### Canvas Rendering

Symbols rendered using HTML5 Canvas or SVG:

```typescript
interface SymbolRenderContext {
  position: Vector2;        // World coordinates (meters)
  rotation: number;         // Degrees
  scale: number;            // Zoom level
  sizeMultiplier: number;   // Global setting (0.5-2.0)
  symbolType: string;       // Symbol identifier
  shorthand: string | null; // Display text
  state: SymbolState;       // Normal, selected, hover, etc.
}

function renderSymbol(ctx: SymbolRenderContext) {
  const baseSize = SYMBOL_SIZES[ctx.symbolType];
  const actualSize = baseSize * ctx.sizeMultiplier * ctx.scale;

  // Draw symbol at position with rotation
  // Apply state-based styling
  // Render shorthand text if zoom > threshold
}
```

### Z-Index Layering

From back to front:
1. **Floor Plan Base**
2. **Rooms/Polygons**
3. **Furniture**
4. **Range Indicators** (semi-transparent circles)
5. **Device Symbols**
6. **Cable Routes**
7. **Shorthand Text**
8. **Selection Indicators**

---

## Accessibility Considerations

### Color Blindness

- **Don't Rely on Color Alone:** Use shape and pattern differences
- **High Contrast:** Ensure symbols readable in grayscale
- **Pattern Fill Options:** Stripes, dots for category differentiation

### Text Scaling

- **Minimum Size:** Shorthand text fades out below 12px rendered height
- **Zoom for Detail:** User can zoom in for readability
- **Tooltip Fallback:** Hover shows full device name regardless of zoom

---

## Future Extensions

### Additional Symbols

Planned for future releases:
- **Plumbing:** Fixtures, valves, drains
- **Electrical:** Outlets, switches (detailed variations)
- **Fire Safety:** Smoke detectors, sprinklers, pull stations
- **Audio/Video:** Speakers, displays, microphones
- **Blinds/Shades:** Various shade types

### Custom Symbol Import

Future feature: user-uploadable custom symbols
- SVG import support
- Symbol editor tool
- Save custom symbols to project library

### Symbol Variations

Some device types may need multiple symbol variations:
- Camera: Dome vs. Bullet vs. PTZ
- Light: Different beam patterns (narrow, wide, flood)
- Sensor: Wall-mount vs. ceiling-mount versions

---

## Summary

The symbol library provides:

1. **25+ Initial Symbols:** Covering lighting, sensors, security, network, controls, infrastructure, HVAC
2. **World-Space Sizing:** Consistent scaling behavior (0.15m - 0.6m base sizes)
3. **Global Size Control:** 0.5× - 2.0× multiplier for user preference
4. **Clear Visual Language:** Distinct shapes, colors, and shorthands per category
5. **Shorthand Annotations:** 3-4 letter codes for quick identification
6. **State Indicators:** Override, multi-component, connection, selection states
7. **Extensible Architecture:** Easy addition of new symbols and categories

These symbols enable clear, professional floor plan visualization with instant device recognition at any zoom level.

---

**End of Document**
