# Implementation Plan - Motorized Shading System

## Goal
Implement a new "Motorized Shading" system section and add a specific "Technical Cable Schedule" to the Rough-in Guide for electrician reference, ensuring 16/4 home runs are specified.

## User Review Required
> [!NOTE]
> I am adding `MDT Shutter Actuator` to the BOM as a "Pre-spec" item (optional/future) to ensure DIN space is accounted for, but the primary focus is the **cable**.

## Proposed Changes

### 1. Schema Updates (`types.ts`)
-   Add `SHADING` to `ModuleType` enum.

### 2. System Definition (`systems.ts`)
-   Add "Motorized Shading" system.
-   **Goal**: "Automated daylight management and privacy."
-   **Technical**: "Star-wired 24V DC motors controlled via DIN-rail KNX actuators."

### 3. Data Entry (`constants.ts`)
-   **Add Cable**: `16/4 Stranded (Low Voltage)` (Bulk, 3000ft).
    -   Tag as `SHADING` system.
-   **Add Actuator**: `MDT Shutter Actuator 8-fold` (JAL-0810.02).
    -   Qty: 2 (Covers up to 16 motors).
    -   Tag as `SHADING` system.

### 4. Window Treatment Schedule (Estimated)
Based on floor plan review:
-   **Living Room**: 4 Windows
-   **Dining Room**: 2 Windows
-   **Master Bedroom**: 3 Windows
-   **Office**: 2 Windows
-   **Kitchen**: 1 Window
-   **Bed 2**: 1 Window
-   **Bed 3**: 1 Window
*Total: 14 Locations*

### 5. UI Updates (`components/RoughInGuide.tsx`)
-   Add a new section specifically for "Motorized Window Treatment Schedule".
-   **Content**:
    -   **Topology**: Star wiring (Home Run) from every individual window header directly to the central Lighting Control Panel (LCP). No daisy-chaining.
    -   **Voltage Standard**: Low Voltage (24V DC) to support quiet KNX motors (MDT/Theben/SMI).
    -   **Cable Spec**: 16 AWG, 4-Conductor Stranded (16/4). (4-wire is required to support future SMI digital motors or standard 2-wire polarity reversal).
    -   **Termination**: Leave a 12-inch service loop in the window header (taped) and a 3-foot tail at the panel.
    -   **Labeling**: Both ends must be uniquely labeled (e.g., 'SHADE-Pantry-01').

## Verification Plan

### Manual Verification
-   [ ] **Systems Overview**: Verify "Motorized Shading" appears with the correct narrative and equipment list.
-   [ ] **Rough-in Guide**: Verify the "Technical Cable Schedule" text is visible and formatted correctly.
-   [ ] **BOM**: Verify 16/4 Cable is listed under Shading/Accessory.

### Automated Verification
-   Use browser tool to navigate to `/#rough-in` and check for the existence of the specific text string "Leave a 12-inch service loop".
