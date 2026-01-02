# IntegratorPro Project Roadmap

This document tracks the technical evolution and feature implementation of the IntegratorPro System Planning Suite.

## Recently Completed: Phase 20-27 (UI & Data Robustness)

The following features have been fully implemented and integrated into the Three.js editor environment.

### 1. Unified Layout & "Zen Mode"
*   **Maximum Real Estate**: The editor now automatically enters "Zen Mode" on the `/floorplan` route, hiding the global application sidebar and header.
*   **Floating Navigation**: A persistent floating Home button allows quick exit from the full-screen editor.
*   **Collapsible Sidebars**:
    *   Manual Toggles: `[` (Left Panel) and `]` (Right Panel).
    *   Auto-Hide: Hover within 20px of screen edges to reveal; auto-collapses after 500ms of inactivity.
    *   Visual Feedback: 4px mini-strips with reactive glow/pulse effects when mouse is in the detection zone.

### 2. Intelligent HUD (Command Center)
*   **Consolidated UI**: Removed all disparate floating banners (Last Key, Shimmy Guide, Zoom Indicator) into a single, unified "Command Bar" at the bottom-center.
*   **Contextual Guidance**: 100% tool coverage for real-time hints. Instructions update dynamically based on the active tool (e.g., Room Drawing, Device Placement).
*   **Responsive Logic**: Hints automatically abbreviate for mobile viewports (< 640px) to prevent layout breaks.
*   **Mode Theming**: Visual color coding for the Command Bar border:
    *   **Blue**: Selection Mode
    *   **Emerald**: Alignment (Shimmy) Mode (with pulse animation)
    *   **Purple**: Device Placement
    *   **Cyan**: Drawing Mode
*   **Shortcut Legend**: A comprehensive help modal accessible via the `HelpCircle` icon or the `?` / `F1` keys.

### 3. Dynamic Device Specification System
*   **Modular Spec Builders**: Extracted heavy logic into standalone components:
    *   `HEWilliams2DSBuilder`: Full HE Williams 2DS downlight configurator with ordering code generation.
    *   `GenericLightBuilder`: Manual entry for non-catalog fixtures.
*   **Pre-population**: Clicking any placed fixture instantly loads its current metadata into the modular builder for editing.
*   **Draft Guarding**:
    *   Real-time diff detection between current device and library type.
    *   "UNSAVED SPEC CHANGES" warning badge.
    *   Intelligent button guarding (Save/Update buttons disabled unless changes exist).
*   **Mass Conversion Workflow**:
    *   When saving a new fixture type, a modal offers scoped updates: "Only This Instance", "All in Room", or "All in Project".
    *   Ensures label integrity (e.g., a "2DS-L9" label always matches the actual hardware spec).

### 4. Navigation & Interaction
*   **Spacebar Auto-Pan**: Advanced navigation for laptop/trackpad users. Holding `Space` and moving the mouse pans the view without requiring a click.
*   **Scrollability**: Fixed vertical scrolling for all sidebars (Device Panel, Layers, Furniture) to support small viewports.
*   **Performance**: Throttled `mousemove` listeners (16ms/60fps) to reduce React re-renders during navigation.

### 5. Data Safety & Persistence
*   **Mount Protection**: Implementation of `isInitializedRef` guards across all hooks to prevent the "Empty-Save-on-Mount" bug.
*   **Project Backup**: "EXPORT PROJECT" and "IMPORT PROJECT" buttons added to sidebar footer.
*   **Schema Validation**: Import logic verifies JSON structure (metadata, floorPlan, arrays) before overwriting server state.
*   **Automated Testing**: Established Vitest infrastructure with unit tests for the `useAutoSave` persistence logic.

---

## Future Roadmap (Planned)

### Phase 28: Advanced Visualization
*   **Visual Diff Modal**: Show side-by-side property changes before committing a "Global Type Update".
*   **Success Tooltips**: Non-intrusive toast notifications for successful Saves/Imports.
*   **Custom Pulse Animations**: Replace standard Tailwind pulses with refined, hardware-accelerated CSS animations.

### Phase 29: System Expansion
*   **Modular Registry**: Expand the Spec Builder pattern to support Receptacles, LED Strips, and HVAC controllers.
*   **Device Buffers**: Implement collision/spacing visualization for devices (e.g., "Do not place within 12 inches of a sprinkler").

### Phase 30: Intelligence & Automation
*   **AI Auto-Placement**: Use Gemini Vision to suggest device locations based on architectural symbols.
*   **Thermal/Fit Analysis**: Automated reports on enclosure fill and heat dissipation for LCP panels.
