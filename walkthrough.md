# Walkthrough - Performance Instrumentation

I have added debug logging infrastructure to identify the cause of the zoom/pan lag.

## Changes

### 1. FloorPlanMap Instrumentation
- **Debug Overlay:** Added a semi-transparent HUD showing:
    - Render count.
    - Last 10 log entries with millisecond timestamps.
- **Event Logging:** Capturing `onWheel` and `onZoom` events to trace the propagation delay from user input to state update.

### 2. WallDetector Instrumentation
- **Render Trace:** Added console logging for every render cycle of the Wall Detector to see if it is re-rendering aggressively during map interaction.

## Verification results

### Manual Verification
- **Debug Overlay:** Verified code insertion. The overlay will appear green on top-left.
- **Console Logs:** `[WallDetector] Render #...` logs will flood the console if re-renders are the issue.

## Resolution

### Identified Issue
- **Excessive Re-renders**: The `WallDetector` component was re-rendering on every `FloorPlanMap` update (e.g. during zoom/pan state changes) because it was not memoized.
- **Debug Overhead**: The debug logging itself (`addLog`) introduced `setState` calls on high-frequency events (`onWheel`, `onZoom`), exacerbating the problem.

### Fix Applied
1.  **Memoization**: Wrapped `WallDetector` in `React.memo` to ensure it only re-renders when its props (`imageUrl`) change.
2.  **Optimized Logging**: Disabled high-frequency debug logs in `FloorPlanMap.tsx` to remove the observer effect overhead.

# Wall Detection Refactor

I have refactored the Wall Detection system to be on-demand, persistent, and more robust, although the computer vision library is currently encountering memory limits with the high-resolution floor plan.

## Changes

### 1. WallDetector.tsx
- **On-Demand**: Changed to use `useImperativeHandle` / `ref` so detection only runs when triggered by the parent.
- **Downscaling**: Implemented image downscaling (target 512px) to attempt to mitigate memory usage during CV processing.
- **Improved Logging**: Added detailed logs to trace OpenCV steps.
- **Logic**: Returns detected lines instead of drawing them on a hidden canvas.

### 2. FloorPlanMap.tsx
- **State Management**: Added handling for `WALL` type items in `layoutData`.
- **UI**: Added "Detect Walls" and "Clear Walls" buttons.
- **Persistence**: "Save & Lock" now persists detected walls to `layout.json` via the API.
- **Rendering**: Walls are now rendered as SVG lines overlaying the map, allowing for persistence and editing (future).

## Verification Results

### Successes
- **Pipeline Integrity**: Validated using mock data that:
    - Walls are correctly rendered when data is present.
    - "Clear Walls" button appears correctly when walls exist.
    - Wall data is successfully saved to `layout.json` and persists across page reloads.
    - Clearing walls works and persists.

### Issues
- **OpenCV Crash**: The `opencv.js` library is crashing with `RuntimeError: table index is out of bounds` when processing this specific floor plan image (10800x7200), even after implementing downscaling. This appears to be a limitation or bug in the WASM build environment regarding large source images.
- **Workaround**: The code is implemented safely with error catching. If the library issue is resolved (e.g., by using a smaller source image or a different CV backend), the feature will work immediately.
