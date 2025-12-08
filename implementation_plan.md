# Wall Detection Refactoring

Goal: Change Wall Detection to be on-demand, persist results to `layout.json`, and allow deletion.

## User Review Required
- **Validation**: Confirm if storing walls mixed with modules in `layout.json` (with `type: 'WALL'`) is acceptable. (Proceeding with this assumption as it fits the `layoutData` pattern).

## Proposed Changes

### Components

#### [MODIFY] [FloorPlanMap.tsx](file:///home/quagoo/IntegratorPro/components/FloorPlanMap.tsx)
-   **State**: Add handling for `WALL` type items in `layoutData`.
-   **UI**:
    -   Add "Detect Walls" button in the Control Panel (top right).
    -   Add "Clear Walls" button (only visible if walls exist).
-   **Logic**:
    -   Use `useImperativeHandle` ref on `WallDetector` to trigger scan.
    -   On scan completion (`onLinesDetected`), append new lines to `layoutData` with `type: 'WALL'`.
    -   Update `handleSaveLayout` to persist these.
    -   Update `render` to draw these lines (previously `WallDetector` drew them on its own canvas).
        -   *Correction*: `WallDetector` draws on its own canvas. If we want to persist them and "save geometry", we probably want to render them *ourselves* from the data, OR keep using `WallDetector` to render them but feed the data back in.
        -   *Better approach*: `WallDetector` is for **detection**. Once detected, we lift the data to `FloorPlanMap` state. `FloorPlanMap` then renders them (SVG or Canvas overlay) and `WallDetector` clears its debug canvas. This allows "saving" and "reloading" without re-running CV.

#### [MODIFY] [WallDetector.tsx](file:///home/quagoo/IntegratorPro/components/WallDetector.tsx)
-   **API**: Expose `detectWalls()` via `ref`.
-   **Cleanup**: Remove internal "Scan Walls" button and debug UI (or hide it behind a flag).
-   **Behavior**: When detection finishes, return lines and *clear* internal canvas (so `FloorPlanMap` can take over rendering).

### Backend
-   **No changes required** if we re-use `/api/layout` and just add new items with `type: 'WALL'`.

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
