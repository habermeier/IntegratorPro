# Deep Code Review & Problem Statement
**Task-ID:** AUTO-RENDER-RADIUS-P17
**Date:** 2025-12-31

## User-Reported Issues

1. **Coverage circles only visible when "Electrical Overlay" is ON** - disappear when Electrical OFF
2. **Labels not appearing at all** - no device labels visible
3. **Need 2DS-L9 label** to appear lower-right beneath symbol for all lighting layers

---

## Code Flow Analysis

### Data Loading Flow
```
useEditorInitialization.ts (line 280)
  ↓
applyProjectData(editor, project)
  ↓
useApplyProjectData.ts
  ├─ Line 48: const layerId = device.layerId || device.category || 'lighting'
  ├─ Line 72: devicesByCategory[layerId].push(symbol)
  ├─ Line 88: (layer.content as VectorLayerContent).symbols = symbolsToAssign
  └─ Line 89: editor.layerSystem.markDirty(id)
```

### Rendering Flow
```
LayerSystem.update() (line 171)
  ↓
Line 176-183: Process dirty layers
  ↓
Line 180: this.renderVectorLayer(layer) for each dirty vector layer
  ↓
renderVectorLayer(layer) (line 228)
  ├─ Line 513: if (content.symbols) { ... }
  ├─ Line 514-589: Process each symbol
  │   ├─ Line 556-563: Create label sprite
  │   ├─ Line 577: layer.container.add(group)
  │   └─ Line 588: this.updateCoverageCircle(group, symbolData)
  └─ Coverage circle added to group at line 1034: group.add(circle)
```

### Visibility Control
```
LayerSystem.setLayerVisible(id, visible) (line 105-110)
  ├─ Line 108: layer.visible = visible
  └─ Line 109: layer.container.visible = visible  ← CRITICAL!
```

**When `layer.container.visible = false`, ALL children are hidden:**
- Symbol meshes
- Labels
- Coverage circles
- Everything in that layer

---

## Investigation Results

### 1. Coverage Circles Architecture
**Location:** `editor/systems/LayerSystem.ts:874-1057`

**Creation:**
- Created in `updateCoverageCircle(group, symbolData)`
- Added as child of symbol group: `group.add(circle)` (line 1034)
- Symbol group is child of `layer.container` (line 577)
- **Visibility:** Inherits from parent container

**Visibility Logic:**
```typescript
// Line 1007: Hidden if invalid dimensions
if (radiusX <= 0 || radiusY <= 0) {
    circle.visible = false;
    return;
}
// Line 1055: Otherwise visible
circle.visible = true;
```

**NO dependency on electrical layer** in coverage circle code itself.

### 2. Label Creation
**Location:** `editor/systems/LayerSystem.ts:549-563`

**Condition for label creation:**
```typescript
const isGenericProduct = symbolData.productId === 'generic-product';
const hasShorthand = !!(metadata as any).shorthand;
const willShowRegularLabel = symbolData.label ||
    (symbolData.productId && !(isGenericProduct && !hasShorthand));

if (willShowRegularLabel) {
    const labelText = symbolData.label || symbolData.productId || '';
    const labelSprite = this.createLabel(labelText, def.name);
    labelSprite.name = 'label';
    labelSprite.position.set(10, -10, 0.5);  // Bottom-right offset
    group.add(labelSprite);
}
```

**Label won't show if:**
- No `symbolData.label` AND
- No `symbolData.productId` OR
- `productId === 'generic-product'` AND no shorthand in metadata

### 3. Layer Initialization
**Location:** `src/hooks/useEditorInitialization.ts`

**Lighting layer (line 146-156):**
- id: 'lighting'
- type: 'vector'
- category: 'technical'
- zIndex: 90
- **visible: TRUE** (initially)

**Electrical layer (line 106-117):**
- id: 'electrical'
- type: 'image'
- category: 'foundation'
- zIndex: 30
- **visible: TRUE** (initially)

**Different categories** - NOT mutually exclusive by design.

---

## Root Cause Hypotheses

### Hypothesis 1: Layer Visibility Coupling (MOST LIKELY)
**Problem:** There may be UI or code that couples electrical and lighting layer visibility.

**Evidence needed:**
- Check LayersSidebar.tsx for toggle behavior
- Check if clicking "Electrical Overlay" auto-enables "Lighting"
- Check if there's saved state that keeps lighting OFF

**Test:**
```javascript
// In browser console
const editor = window.scene?.userData?.editor;
const lighting = editor?.layerSystem?.getLayer('lighting');
const electrical = editor?.layerSystem?.getLayer('electrical');
console.log({
    lightingVisible: lighting?.visible,
    lightingContainerVisible: lighting?.container?.visible,
    electricalVisible: electrical?.visible
});
```

### Hypothesis 2: Labels Not Created Due to Data
**Problem:** Device data might not have `label` or `productId` fields set.

**Evidence needed:**
- Check actual device data structure
- Verify `symbolData.label` and `symbolData.productId` values

**Test:**
```javascript
const lighting = editor?.layerSystem?.getLayer('lighting');
const content = lighting?.content;
console.log('Symbols:', content?.symbols?.map(s => ({
    id: s.id,
    label: s.label,
    productId: s.productId,
    metadata: s.metadata
})));
```

### Hypothesis 3: renderVectorLayer Not Called
**Problem:** Lighting layer might not be marked dirty or update loop not running.

**Evidence needed:**
- Check if `markDirty('lighting')` is called
- Check if `update()` loop processes it
- Add logging to `renderVectorLayer`

---

## Next Steps (User to Confirm)

1. **Run browser console tests** to check actual layer visibility states
2. **Check device data** to see if labels/productIds exist
3. **Toggle layers** and observe which combinations show circles/labels
4. **Report findings** so targeted fix can be made

---

## Potential Fixes (After Diagnosis)

### Fix A: Decouple Layer Visibility
If lighting is being auto-hidden when electrical is off:
- Remove any coupling logic
- Ensure lighting layer stays visible independently

### Fix B: Force Label Creation
If labels aren't showing due to data:
- Relax `willShowRegularLabel` condition
- Always show label for lighting fixtures
- Use fixture type as fallback label

### Fix C: Explicit Coverage Circle Visibility
Add defensive code to ensure circles visible when lighting layer is on:
- Check parent layer visibility in `updateCoverageCircle`
- Force circle visible if lighting layer is active

---

## File References

- `editor/systems/LayerSystem.ts:874-1057` - Coverage circle creation
- `editor/systems/LayerSystem.ts:549-563` - Label creation
- `editor/systems/LayerSystem.ts:105-110` - Layer visibility control
- `src/hooks/useApplyProjectData.ts:88-89` - Symbol assignment
- `src/hooks/useEditorInitialization.ts:146-156` - Layer init
