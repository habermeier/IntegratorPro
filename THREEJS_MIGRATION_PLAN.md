# Three.js Migration Plan

## Why Three.js?

PixiJS lacks a native camera system, making multi-camera rendering complex. Three.js provides:
- Built-in OrthographicCamera for 2D rendering
- Trivial multi-viewport/multi-camera support
- Mature raycasting for pointer interaction
- Better resource sharing across views

## Research Sources

- [Multiple Viewports Pattern](https://discourse.threejs.org/t/render-multiple-views/57999) - Single renderer with setViewport
- [Raycaster Documentation](https://threejs.org/docs/api/en/core/Raycaster.html) - Pointer interaction
- [OrthographicCamera Forum](https://discourse.threejs.org/t/using-three-js-orthographic-as-2d-camera/61394) - 2D rendering patterns
- [Floor Plan Example](https://discourse.threejs.org/t/floorplan-using-threejs/5015) - Blueprint-js project
- Official Example: `webgl_interactive_cubes_ortho`

## Multi-Camera Pattern

```javascript
// Single renderer, multiple cameras
renderer.autoClear = false;
renderer.clearColor();

cameras.forEach(camera => {
    renderer.setViewport(camera.x, camera.y, camera.width, camera.height);
    renderer.clearDepth();
    renderer.render(scene, camera);
});
```

## Primitives Test Plan

### Phase 1: Hello World + Basic Camera
- **1.1** Empty scene with OrthographicCamera, solid background
- **1.2** Single colored rectangle, verify camera framing

### Phase 2: Multi-Camera
- **2.1** Two viewports (main + corner box) rendering same scene
- **2.2** Independent camera transforms (normal + 2x zoom)

### Phase 3: Textures & Layers
- **3.1** Load single texture (base floor plan), verify aspect ratio
- **3.2** Multiple layered textures (base + electrical overlay with transforms)
- **3.3** Vector graphics layers (polygons, circles) with z-ordering

### Phase 4: Interaction
- **4.1** Raycaster mouse tracking, world coordinate conversion
- **4.2** Object picking (click to select), test both cameras
- **4.3** Drawing mode (polygon tool with preview)

## Implementation Strategy

1. Start with minimal Hello World
2. Test each primitive incrementally
3. Don't build full features until primitives proven
4. Keep test files separate from production code
5. Only migrate production components after all primitives tested

## Archived Code

Old PixiJS implementation moved to `obsolete/`:
- `FloorPlanStage.tsx` - Main PixiJS renderer
- `PixiMagnifiedCursor.tsx` - Dual-application zoom cursor
- `MagnifiedCursor.tsx` - Original canvas-based cursor
