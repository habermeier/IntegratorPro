Date: 2025-12-20

Executive Summary
Add a professional furniture placement tool with CAD-like spatial awareness, enabling integrators to layout furniture/equipment on floor plans with intelligent wall and furniture snapping, real-time distance annotations, and collision warnings. The tool will support fine-tuned positioning via arrow keys, rotation controls, blocking/non-blocking furniture types, and minimum clearance settings. Furniture items become a new layer type with click-to-zoom list view, auto-room detection by UUID, and integration with the existing measurement utilities for consistent unit handling.

Scope

In-Scope:
- New placement tool (`place-furniture`) with keyboard shortcut `F`
- Furniture data model with dimensions (width/length), name, color, rotation, blocking status, and room UUID association
- Smart snapping to walls and blocking furniture with magnetic pull (6" wall threshold, 3" furniture threshold)
- Real-time distance annotations showing offset to nearest 2 walls and nearby blocking furniture
- Arrow key positioning: nudge by 1" (default), 1' (Shift), 0.1" (Ctrl)
- Alt-key rotation: 15° (Alt+←/→), 90° (Alt+Shift+←/→), 1° (Alt+Ctrl+←/→)
- Ctrl to disable snapping temporarily
- Blocking vs non-blocking furniture types (beds/tables block, chairs/lamps don't)
- Minimum distance warnings (red annotations when below threshold)
- Settings page integration: minimum furniture clearance, show/hide annotations, snap sensitivity
- Furniture layer with visibility toggle and reduced room shading when active
- Furniture sidebar panel with list view, click-to-zoom, edit/duplicate/delete
- Enhanced measure tool with snap-to furniture/walls when furniture layer active
- Collision detection with visual warnings (non-blocking, guidance only)
- Keyboard shortcut overlay showing context-sensitive controls
- Integration with existing `measurementUtils.ts` for dimension input/display
- Room UUID persistence (rename-safe association)

Out-of-Scope:
- 3D furniture visualization or perspective rendering
- Furniture library/templates (user manually creates each item)
- Auto-layout or smart arrangement algorithms
- Furniture cost estimation or BOM integration (future enhancement)
- Non-rectangular furniture shapes (circles, L-shapes, custom polygons)
- Multi-select or bulk operations on furniture
- Furniture grouping or hierarchies
- Rotation snap-to-wall alignment (only position snapping, not rotation)

Deliverables

1. **New Tool Implementation**
   - `editor/tools/PlaceFurnitureTool.ts` with full placement workflow and keyboard controls
   - Tool registered in ToolPalette with 'F' shortcut
   - Preview rendering with real-time spatial feedback

2. **Data Model & Utilities**
   - `editor/models/Furniture.ts` interface with all properties (id, type, name, width, length, position, rotation, color, roomId, isBlocking, createdAt)
   - `utils/spatialUtils.ts` with distance calculation functions (point-to-line, rect-to-polygon, rect-to-rect, snap-to logic)
   - Room model extended to ensure UUID exists and is persisted

3. **Distance Annotation System**
   - Rendering system for double-headed arrows (THREE.Line) and distance labels (THREE.Sprite)
   - Smart display logic: show 2 nearest walls (<3ft), nearby blocking furniture (<2ft)
   - Color coding: white/blue (normal), red (below minimum distance threshold)
   - Hide when not placing/selecting furniture

4. **Snapping & Collision**
   - Magnetic snap to walls (6" threshold) and blocking furniture (3" threshold, respects minimum distance)
   - Visual feedback: blue highlight for wall snap, yellow for furniture snap
   - Collision detection with red outline/warning message for overlaps
   - Ctrl key to disable snapping

5. **Furniture Sidebar Panel**
   - Component replacing/augmenting symbol placement UI
   - List view with thumbnail, name, dimensions, room name, blocking icon
   - Click item to auto-zoom/focus camera on furniture
   - Right-click context menu: Edit, Toggle Blocking, Duplicate, Delete
   - "Add Furniture" button opening creation dialog

6. **Furniture Creation/Edit Dialog**
   - Fields: Name (text), Width (distance input), Length (distance input), Color (picker with alpha), "Takes up space" (checkbox for isBlocking)
   - Uses `parseDistanceInput()` for width/length (accepts "6ft" or "1.8m")
   - Smart defaults for blocking status based on name keywords

7. **Layer System Integration**
   - Furniture layer added to LayerSystem
   - Default visibility: ON
   - When active: reduce room shading to 20% opacity with grayscale
   - LayersSidebar updated to show "Furniture (count)" with eye icon toggle

8. **Settings Page Updates**
   - `/settings` → Floorplan category additions:
     - Minimum Furniture Clearance input (default: 18", respects unit system)
     - Show Distance Annotations toggle (default: ON)
     - Snap Sensitivity slider: Low (3"), Medium (6"), High (12")

9. **Measure Tool Enhancement**
   - When furniture layer active: snap to furniture edges/corners, walls, room vertices
   - Ctrl to disable snap for free-form measurement
   - Visual feedback: cyan highlight on snap targets

10. **Keyboard Shortcut Overlay**
    - `components/editor/ShortcutOverlay.tsx` showing context-sensitive shortcuts
    - Position: bottom-right above ScaleRuler
    - Auto-hide after 3s, reappear on tool change or key press
    - Content varies by active tool (placement vs selection vs other tools)

11. **Data Persistence**
    - Furniture items stored in project data (localStorage/file export)
    - Included in save/load workflow
    - Room UUID association persisted correctly

12. **Visual Rendering**
    - Furniture drawn as filled rectangles with border, alpha color, and center-aligned label
    - Z-index: above rooms, below masks/symbols
    - Blocking indicator icon (optional visual in corner)

13. **Documentation**
    - Update relevant architecture docs with furniture layer and spatial utils
    - Inline code comments for spatial algorithms
