# Debug Plan: Coverage Circles & Labels

## Issue 1: Coverage circles disappear when Electrical Overlay is OFF

**Test in browser console at http://localhost:3002/floorplan:**
```javascript
// Check lighting layer visibility
const editor = window.editor || window.scene?.userData?.editor;
const lightingLayer = editor?.layerSystem?.getLayer('lighting');
console.log('Lighting layer visible:', lightingLayer?.visible);
console.log('Lighting container visible:', lightingLayer?.container?.visible);

// Check electrical layer
const electricalLayer = editor?.layerSystem?.getLayer('electrical');
console.log('Electrical layer visible:', electricalLayer?.visible);

// Check coverage circles
const symbols = lightingLayer?.container?.children || [];
console.log('Lighting layer has', symbols.length, 'symbol groups');
symbols.forEach(sym => {
  const circle = sym.getObjectByName?.('coverage-circle');
  if (circle) {
    console.log('Coverage circle found:', circle.visible, 'parent visible:', sym.visible);
  }
});
```

## Issue 2: Labels not appearing

**Check label creation:**
```javascript
const symbols = lightingLayer?.container?.children || [];
symbols.forEach(sym => {
  const label = sym.getObjectByName?.('label');
  const shorthand = sym.getObjectByName?.('shorthand-label');
  console.log('Symbol', sym.userData.id, {
    hasLabel: !!label,
    labelVisible: label?.visible,
    hasShorthand: !!shorthand,
    shorthandVisible: shorthand?.visible
  });
});
```

## Quick Fixes to Try

1. **Force coverage circles visible regardless of layer state**
2. **Ensure labels are created for all lighting fixtures**
3. **Add explicit 2DS-L9 label rendering**
