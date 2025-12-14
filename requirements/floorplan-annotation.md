# Floorplan Overlay & Annotation Requirements

## Goal
Let users align and compare two floorplan images (clean background + electrical overlay), then place and manage rich SVG annotations across multiple layers. Preserve alignment and annotations with versioned snapshots and BOM-friendly metadata.

## Base Assets
- **Images**
  - `clean`: floor plan without electrical annotations (background). This is the source for wall vectorization.
  - `electrical`: floor plan with electrical annotations (overlay candidate).
- **Vector overlay (walls only)**: AI vectorization of the clean image that focuses on walls and ignores text/symbols/notes/door swings where possible. Loaded from JSON (main file + debug file for diagnostics).

## Wall Vectorization Workflow
- Input: clean image only; goal is to extract walls (preferably double/thick lines) and drop text/notes/symbols/door swings.
- Controls:
  - “Generate walls” action to run vectorization and produce JSON.
  - “Load main walls” (full JSON) and “Load debug walls” (tiny file) for diagnostics.
  - Filter toggle: “walls only” vs “show all vectors” for debugging.
- Cleanup mode:
  - Selection tools:
    - Rectangular drag-select to highlight vectors in a box.
    - Single-click select: pick vectors near the cursor; zoom level affects selection radius (higher zoom → smaller radius).
    - ESC clears the current selection without deleting.
  - Deletion: backspace deletes selected vectors.
  - Undo/redo for deletions (history scoped to vector cleanup).
  - Save cleaned walls so this step is done once; persist to server as the canonical wall set.

### Wall Cleanup Acceptance Criteria
- **Selection radius scaling**: At 1x zoom, click select radius ≈ 10px; scales down proportionally with zoom-in (e.g., radius ≈ 5px at 2x, 2–3px at 4x), caps at a minimum of 2px.
- **Rectangle select**: Dragging draws a visible marquee; releasing selects all intersecting vectors. ESC cancels marquee and clears selection.
- **Feedback**: Selected vectors highlight (e.g., color change or halo); selection count is shown in a small HUD.
- **Deletion**: Backspace deletes only the current selection. If nothing is selected, no action. Confirm via brief toast/HUD message.
- **Undo/redo**: At least 20 steps of history within the cleanup session; Ctrl/Cmd+Z (undo) and Ctrl/Cmd+Shift+Z (redo) supported in addition to UI buttons. Undo reverses the last delete; redo reapplies it.
- **Persistence**: Saving cleaned walls writes the filtered vector set to server storage. Autosave (debounced 300–500ms) after each delete/undo/redo is preferred; otherwise provide an explicit “Save cleaned walls” that is clearly indicated. Loading the app should use the cleaned set if it exists.

## Scale Calibration (Absolute Distance)
- **Purpose**: Convert on-screen pixel distances to real-world units for accurate cable lengths and measurements.
- **Flow**:
  - User chooses “Set Scale” tool, clicks two points on the plan (snaps to walls if available).
  - System shows the pixel distance between the two points (in image space).
  - Prompt user to enter real-world distance with flexible parsing (e.g., `10'`, `10ft`, `3m`, `3.5m`, `12' 6"`). Accept metric and imperial; store canonical value in meters.
  - Compute and store `pixelsPerMeter` (and its inverse) in layout state.
  - Persist immediately to server; reload should restore the calibration.
- **Interaction**:
  - Draw a live rubber-band line between the two points while placing; show hover feedback about what’s under the cursor.
  - Allow pan/zoom while in calibration; treat small drags as panning and only register a point if movement is below a threshold (e.g., 5–8px) before mouseup/click.
  - ESC cancels; Backspace clears the two points before confirmation.
- **Usage**:
  - Measurement tools (distance, cable estimation) must use the calibrated scale.
  - Show current scale in UI (e.g., “Scale: 128 px/m”). If scale is missing, warn the user before allowing cable length outputs.
- **Edge cases**:
  - If user recalibrates, replace previous scale and persist.
  - If points are too close (e.g., <10px apart), reject with a message to pick a longer span.
  - Support undo/cancel: ESC to exit calibration, Backspace clears the two points before confirmation.

## Layers & Visibility
- Layers include: `clean image` (always on), `electrical image overlay`, `AI vectors`, and multiple annotation layers (see below).
- Each layer supports: toggle visibility, opacity slider (0–100%), z-order defined (clean at bottom, annotations above).
- Electrical image overlay supports transform controls (scale, rotation small increments, X/Y offset) and a lock toggle to prevent accidental moves.
- Layer transforms and visibility/opacity must persist immediately to server storage.

## Electrical Overlay Alignment
- User controls: opacity slider, scale, rotation (fine increments), X/Y translation.
- Live preview while adjusting; snapping not required.
- “Lock overlay” freezes interactions; unlocking restores transform handles.
- Persist overlay transform/visibility on every change (no manual save needed).

## AI Vector Filtering (walls-first)
- When loading vector JSON, default filter to keep only wall-like polylines:
  - Heuristics: minimum segment count, minimum total length, optional thickness/double-line detection if data supports it.
  - Preserve ability to toggle “show all vectors” vs “walls only”.
- AI vectors live in their own layer with visibility toggle and opacity control.

## Annotation Layers
- Supported layers (initial set): labels (text), lights, fans, sensors, switches, receptacles, ethernet, security cameras, skylights, exterior lights, exterior receptacles. More can be added.
- Each layer holds SVG symbols; symbols come from a palette menu.
- User selects a symbol type; each click places a new symbol on the active layer.
- Placement behavior:
  - If cursor is within N pixels of a wall vector, snap/align the symbol axis to the nearest wall segment; otherwise use default orientation.
  - Click-drag on an existing symbol repositions it with the same snapping rules.
- Deletion/undo:
  - Backspace deletes the last placement on the active layer only.
  - Provide redo to restore the last N deletions for that layer.
  - Undo/redo history is layer-scoped.
- All changes save immediately to server storage (no manual save).

## Metadata per Symbol
- Auto-generate a unique, human-readable ID (layer prefix + serial).
- Store: type (light, outlet, etc.), name/ID, room/location text, optional productId (for BOM deep link), optional product spec URL, optional cost estimate, optional freeform note.
- Hover tooltip shows: type, name/ID, room/location, spec link (opens new tab if present), cost (if present), note (if present).

## Data Persistence & Snapshots
- Primary state stored on server as JSON (includes layer visibility/opacity, overlay transform, AI filter mode, all annotations).
- Snapshots:
  - User can save a snapshot with a name; system adds timestamp.
  - List existing snapshots with name + timestamp.
  - Load a snapshot to restore state.
  - Delete snapshots.

## UI/Controls
- Panel to manage layers (visibility, opacity), active annotation layer selection, and symbol palette.
- Controls for electrical overlay transform (scale, rotate, translate), opacity, and lock.
- Buttons:
  - “Reload AI overlay” (main file) and “Load debug overlay” (small test) for diagnostics.
  - “Show walls only” toggle for vector filtering.
  - Snapshot: save (name input), load (list), delete (per item).
- Status HUD for current mode/tool and snapping feedback.

## Performance/UX Constraints
- Large vector files must render without freezing: prefer per-polyline rendering, lazy/throttled state updates, and memoization of symbol lists.
- Transform adjustments should feel real-time; dragging symbols uses rAF/throttled updates.
- Autosave operations must be debounced to avoid server overload but still near-instant (e.g., 300–500ms debounce).

## Storage/API Notes
- Expose endpoints to read/write current state and manage snapshots (list/save/load/delete).
- Overlay transform (scale/rotation/offset), opacity, and visibility stored alongside annotations and vector filter mode.
- Support loading alternate vector files (main vs debug) via parameter.

## Diagnostics
- Provide a debug overlay loader (tiny JSON) to confirm rendering.
- Optional logging endpoint to record vector load counts and filter results (wall count vs total) for troubleshooting.
