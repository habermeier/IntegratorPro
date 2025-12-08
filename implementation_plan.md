# Refactor Rack and DIN Layout### [Visualizer.tsx]
#### [MODIFY] [Visualizer.tsx](file:///home/quagoo/IntegratorPro/components/Visualizer.tsx)
- **Layout Structure**:
    - **Row-Based Layout**: Each Cabinet (LCP-1, LCP-2, MDF) will be a full-width row.
    - **Two-Column Design**:
        - **Left**: The Visual Enclosure/Rack.
        - **Right**: The Panel Schedule (Table) and Engineering Notes.
    - This replaces the previous "side-by-side cabinets" approach.
- **Dimensions**:
    - Increase `ENCLOSURE_WIDTH_PX` for LCP-1 (e.g., to `700px`) and LCP-2 (e.g., to `500px`) to utilize the new space.
    - Add explicit dimension labels (e.g., " Width: 24 inches") to the enclosure headers.
- **Module Identification (Panel Schedule)**:
    - **New**: Render a "Panel Schedule" table below each DIN enclosure data.
    - **Columns**: "Position/Index", "Device", "Purpose/Notes".
    - **Content**: Display `notes` field as the primary "Purpose" description to answer "what is it driven for".
    - **On-Module Label**: Where space permits (large modules), attempt to show a truncated purpose label.
- **Rough-In Section**:
    - **Refine Filter**: Strict filtering to exclude items in `MDF`, `LCP-1`, or `LCP-2` from the "Rough In" list, even if they are Wall Mount. Only items with location `Field` or truly unassigned locations should appear.
    - **Check**: Ensure "KLF 200" (MDF) does not appear.

## Verification Plan

### Manual Verification
1.  **Initial State**: Load page. Verify no walls are shown (unless previously saved).
2.  **Detection**: Click "Detect Walls".
    -   Verify "Scanning..." state.
    -   Verify lines appear (rendered by `FloorPlanMap` from state).
3.  **Persistence**: Click "Save Layout".
    -   Reload page.
    -   Verify walls reappear without "Detecting" again.
4.  **Deletion**: Click "Clear Walls".
    -   Verify lines disappear.
    -   Save and Reload. Verify they are gone.
