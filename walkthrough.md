# Walkthrough - Data Architecture Redesign & Deep Connectivity

## Overview
I have successfully refactored the application's core data structure to a **Relational "Product + Instances" Model**. This eliminates data duplication while enabling highly granular tracking of every physical device.

## Key Changes

### 1. New "Deep Schema"
We moved from a flat list to a hierarchical model.
*   **Product (SKU)**: Defines static data (Cost, Manufacturer, Specs, Requirements).
*   **Instances**: Defines physical reality (Location, ID, Position, DALI Universe).

**Example (`constants.ts`):**
```typescript
{
  id: 'mdt-dali-gw',
  name: 'DALI Control Gateway',
  quantity: 4, // 4 Physical Units
  instances: [
    { id: 'lcp1-gw1', location: 'LCP-1', universe: 1 },
    { id: 'lcp2-gw1', location: 'LCP-2', universe: 3 },
    // ...
  ]
}
```

### 2. Consolidated BOM & Project Brief
*   **Project Brief (Dashboard)**: A high-level executive summary of the project scope, standards, and budget. Contains a **Summary BOM**.
*   **Bill of Materials (BOM)**: A dedicated view for the **Full Equipment List**.
    *   **Consolidated Rows**: Identical products (e.g., Altronix Qty 3) are grouped into a single row.
    *   **Aggregated Locations**: Locations are listed intelligently (e.g., "LCP-1, LCP-2").

### 3. "As-Built" Connectivity
I defined a rigorous connectivity model including:
*   **Connection Types**: `MAINS` (HV), `LV`, `KNX`, `DALI`, `ETHERNET`, `SIGNAL` (Access Control/Strikes).
*   **Attributes**: `isPoE`, `cableType` (e.g., "Cat6a", "18/2").
*   **Topology**: Links are now between specific *Instances* (e.g., `lcp1-acc-psu` -> `field-str`), not generic products.

### 4. Floor Plan "Data Layers"
Added a **Layer Control Panel** to the Floor Plan Map.
*   **Toggle Visibility**: You can now show/hide entire systems (Lighting, Security, HVAC, etc.).
*   **Live Data**: The map now renders "Live Modules" from the database, meaning as you add devices to `constants.ts`, they appear on the map if they have `position`.

## Verification Steps Passed from Browser
-   [x] **Project Brief**: Correctly renders summary.
-   [x] **BOM View**: Correctly renders consolidated table with correct quantities and multiple locations.
-   [x] **Visualizer**: Renders individual DIN modules correctly (using `flattenModules` helper).
-   [x] **Floor Plan**: Layers toggle On/Off relative to the device type.
