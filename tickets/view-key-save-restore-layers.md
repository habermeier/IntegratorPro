# View Key (V) Should Save/Restore User's Layer Configuration

**Priority:** P2 (UX Enhancement)
**Effort:** Medium (2-3 hours)
**Type:** Feature Enhancement
**Origin:** User feedback during P2 cycle review

---

## Problem

Currently, keyboard shortcuts like "R" (Rooms) automatically adjust layer visibility/settings to optimize for specific tasks. However, the "V" (View) key doesn't restore the user's custom layer configuration.

**Current Behavior:**
- "R" key: Adjusts layers to room placement mode (specific visibility/opacity settings)
- "V" key: Does something else (unclear what currently)
- User's custom layer adjustments are lost when switching modes
- No way to return to user's preferred "default view"

**Expected Behavior:**
- "V" key: Restore user's last saved layer configuration
- User can adjust layers (visibility, opacity, order) and those settings are preserved
- Pressing "V" at any time returns to the user's custom "View" settings
- "V" becomes the "my custom view" shortcut

---

## Solution

Implement layer configuration save/restore functionality triggered by "V" key.

**Approach:**

1. **Capture layer state** when user presses "V" after making adjustments:
   - Layer visibility (on/off for each layer)
   - Layer opacity (0-100% for each layer)
   - Layer order (z-index stacking)
   - Any other layer properties (blend mode, locked, etc.)

2. **Save to localStorage** with key like 'integrator-pro-view-mode-layers'

3. **Restore on "V" press**:
   - Load saved configuration from localStorage
   - Apply visibility, opacity, order to all layers
   - Update UI to reflect restored state

4. **Smart initialization**:
   - First time user presses "V" (no saved config): Save current state as baseline
   - Subsequent "V" presses: Restore saved state
   - User can update saved state by adjusting layers then pressing "V" again (optional: require explicit "save")

**Alternative: Explicit Save**
- "V" always restores
- "Shift+V" or "Ctrl+V" saves current configuration
- Clearer UX: user knows when they're saving vs restoring

---

## User Workflow

### Workflow 1: Auto-save on Press
1. User adjusts layers to their preferred "View" configuration
2. User presses "V" → Current configuration saved
3. User presses "R" → Layers adjust for room placement
4. User presses "V" → Layers restore to saved configuration
5. Repeat: Any time user wants their custom view, press "V"

### Workflow 2: Explicit Save (Recommended)
1. User adjusts layers to their preferred "View" configuration
2. User presses "Shift+V" → "View configuration saved" notification
3. User presses "R" → Layers adjust for room placement
4. User presses "V" → Layers restore to saved configuration
5. User adjusts layers differently
6. User presses "V" → Still restores to previously saved config (not current state)
7. User presses "Shift+V" → Updates saved configuration

---

## Acceptance Criteria

- [ ] **"V" key restores saved layer configuration**
  - Restores visibility (on/off) for all layers
  - Restores opacity (0-100%) for all layers
  - Restores layer order (if applicable)
  - Works consistently every time "V" is pressed

- [ ] **Layer configuration is saved to localStorage**
  - Key: 'integrator-pro-view-mode-layers'
  - Format: JSON with layer IDs and their properties
  - Persists across page reloads
  - Syncs with server (optional, like other settings)

- [ ] **User can update saved configuration**
  - Either auto-save on "V" press (Workflow 1)
  - OR explicit save with "Shift+V" (Workflow 2 - recommended)
  - Clear feedback when configuration is saved

- [ ] **Initial state handled gracefully**
  - First time user presses "V": Either save current state or load default
  - No errors if no saved configuration exists
  - Sensible default configuration

- [ ] **UI feedback**
  - Toast notification: "View configuration restored" (when pressing "V")
  - Toast notification: "View configuration saved" (when saving)
  - OR subtle indicator in UI showing "View mode active"

- [ ] **No regressions**
  - "R" key still works (room placement mode)
  - Other keyboard shortcuts still work
  - Layer panel UI updates correctly when "V" pressed

- [ ] **Build passes** with 0 TypeScript errors

- [ ] **Manual testing**
  - Save a custom view configuration
  - Switch to room mode ("R")
  - Restore view ("V")
  - Verify layers match saved configuration exactly
  - Reload page, press "V", verify configuration persists

---

## Implementation Notes

**Layer State Structure:**
```typescript
interface ViewModeLayerConfig {
  layers: Array<{
    id: string;
    visible: boolean;
    opacity: number;
    order?: number;
    locked?: boolean;
  }>;
  savedAt: number; // timestamp
}
```

**localStorage:**
```typescript
const config: ViewModeLayerConfig = {
  layers: [
    { id: 'base', visible: true, opacity: 100 },
    { id: 'rooms', visible: true, opacity: 80 },
    { id: 'furniture', visible: false, opacity: 100 },
    // ... etc
  ],
  savedAt: Date.now()
};
localStorage.setItem('integrator-pro-view-mode-layers', JSON.stringify(config));
```

**Restore:**
```typescript
const saved = localStorage.getItem('integrator-pro-view-mode-layers');
if (saved) {
  const config: ViewModeLayerConfig = JSON.parse(saved);
  config.layers.forEach(layerConfig => {
    const layer = editor.getLayer(layerConfig.id);
    if (layer) {
      layer.setVisible(layerConfig.visible);
      layer.setOpacity(layerConfig.opacity);
      // ... apply other properties
    }
  });
}
```

**Keyboard Handler:**
```typescript
onKeyDown(event: KeyboardEvent) {
  if (event.key === 'v' || event.key === 'V') {
    if (event.shiftKey) {
      // Save current configuration
      this.saveViewModeConfiguration();
    } else {
      // Restore saved configuration
      this.restoreViewModeConfiguration();
    }
  }
}
```

---

## Likely Files to Modify

- **Keyboard handler**: Where "R", "V" keys are handled (search for `key === 'r'`)
- **Layer management**: Component that manages layer visibility/opacity
- **Layer panel UI**: Update UI to reflect restored state
- **Settings**: Optionally sync to server like other settings

**Find keyboard handlers:**
```bash
grep -r "key === 'r'" components/ editor/
grep -r "key === 'v'" components/ editor/
grep -r "onKeyDown" components/ editor/
```

---

## References

- User feedback: "when selecting 'V' it should dial in the layers as to the last way the user had them (any adjustments they made)"
- Comparison: "R" key adjusts layers for room placement (auto-adjust)
- Intent: "V" key should restore user's custom view (restore saved state)
- Date reported: 2025-12-21 (during P2 cycle review)

---

## Future Enhancements

- Multiple saved view configurations ("V1", "V2", "V3" for different views)
- Per-project view configurations (different saved views for different projects)
- Visual indicator showing which mode is active (View mode, Room mode, etc.)
- Preset view configurations (e.g., "Electrical Only", "Furniture Only", "Full View")

---

**Status:** Not Started
**Assigned To:** TBD
