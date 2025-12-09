# Implementation Plan - Systems Overview

## Goal
Create a "Systems Overview" view that presents the project organized by functional subsystems rather than just hardware types. This view will serve as a rich, narrative-driven interface for understanding the *intent* and *implementation* of each system, supported by relevant BOM data.

## User Review Required
> [!IMPORTANT]
> **Data Tagging**: To accurately filter the BOM for specific subsystems (e.g., separating "Security Cameras" from "Door Access" when both are `SECURITY` type), I may need to add a `subsystem` or `tags` field to `HardwareModule` in `types.ts`, or rely on string matching in `constants.ts`.
> **Proposed Approach**: I will add a simple `systemId` or `tags` array to `HardwareModule` to allow explicit mapping.

## Proposed Changes

### 1. Data Schema (`types.ts`)
-   Update `HardwareModule` to include optional `systemIds: string[]` to allow a product to belong to multiple systems (e.g., a Switch might be in 'Lighting' and 'HVAC').
-   Alternatively, define a `SystemDefinition` interface.

### 2. System Definitions (`systems.ts`)
-   Create new file `constants/systems.ts` (or similar).
-   Define the 7 requested systems with:
    -   `id` (for deep linking) e.g., `lighting`, `heating`, `access`.
    -   `title`
    -   `goal` (Narrative text)
    -   `technical` (Narrative text)
    -   `filter`: Logic to select modules (or list of IDs).

### 3. New Component (`components/SystemsOverview.tsx`)
-   **Structure**: A list of expandable Accordions (Details/Summary).
-   **Content**: Render Goal, Tech, and `<MiniBOM />`.
-   **Deep Linking**:
    -   `useEffect` to auto-expand the section matching the URL hash (e.g., `#systems/lighting`).
    -   Support linking to specific items *within* the Mini BOM.

### 4. App Navigation (`App.tsx`)
-   Add "Systems Overview" to Sidebar.
-   Add `SYSTEMS` ViewMode.

## Verification Plan
### Manual Verification
-   [ ] Click "Systems Overview".
-   [ ] Expand "Lighting & Control".
    -   Verify narrative text.
    -   Verify Mini BOM shows DALI Gateways, Keypads, etc.
-   [ ] Expand "Door Access".
    -   Verify Doorbird/Akuvox and Strikes are listed.
    -   Verify Cameras are *not* listed (if separated).
-   [ ] Deep Link Test: Navigate to `#systems/heating`. Confirm correct accordion opens.

### Automated Test (Browser)
-   Use browser tool to navigate and verify text content and BOM filtering.
