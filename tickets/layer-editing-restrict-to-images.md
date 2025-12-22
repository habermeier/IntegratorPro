# Restrict Layer Editing to Image Layers Only

**Priority:** P1 (Prevents User Confusion/Errors)
**Effort:** Medium (3-4 hours)
**Type:** UX Refinement / Data Integrity
**Origin:** User feedback during P2 cycle review

---

## Problem

"Layer Editing" mode is currently available for all layers, including data layers (Rooms, Furniture, Devices, etc.). This doesn't make sense and creates confusion/errors.

**Issues with Current Behavior:**
1. User can accidentally rotate/scale/offset Room overlay (data layer)
2. Data layers should ALWAYS align with base layer (never need adjustment)
3. Layer editing is only needed for image overlays (like electrical) that aren't perfectly to scale
4. Having layer editing on by default causes accidental misalignment
5. No clear indication of which layers should/shouldn't be editable

**Core Problem:**
- **Image layers** (electrical overlay, photos) may need alignment adjustments
- **Data layers** (rooms, furniture, devices, polygons) should always be locked to base layer
- Current system doesn't distinguish between these two types

---

## Solution

Implement layer type system with `allowLayerEditing` flag. Only image layers can be edited; data layers are always aligned to base.

**Design:**

### Layer Types

**Image Layers** (allowLayerEditing: true):
- Base floor plan image
- Electrical overlay image
- Any imported photo/PDF layers
- These may need scale/rotation/offset adjustments due to source misalignment

**Data Layers** (allowLayerEditing: false):
- Rooms (polygon data)
- Furniture (placed items)
- Devices (future: lights, sensors, etc.)
- Cables (future)
- Masks
- Annotations
- **These always align to world coordinates, never need layer-level transforms**

### Behavior Changes

**Before:**
- Layer editing mode available for all layers
- User can accidentally transform data layers
- No clear guidance on which layers should be edited

**After:**
- Layer editing mode ONLY available for image layers marked `allowLayerEditing: true`
- Data layers cannot be edited (transform controls disabled/hidden)
- Clear visual distinction in layer panel (e.g., lock icon on data layers)
- Layer editing mode only activates on explicit user click (not default)

---

## Acceptance Criteria

### Core Functionality

- [ ] **Add `allowLayerEditing` property to layer interface**
  - Type: `boolean`
  - Default for image layers: `true`
  - Default for data layers: `false`
  - Stored in layer metadata

- [ ] **Layer editing controls respect flag**
  - If `allowLayerEditing === false`: Hide/disable transform controls (rotate, scale, offset)
  - If `allowLayerEditing === true`: Show transform controls when layer editing mode active
  - Clear error message if user tries to edit locked layer: "This layer is locked to base coordinates"

- [ ] **Layer panel UI shows editing capability**
  - Visual indicator for layers that can be edited (e.g., unlock icon)
  - Visual indicator for layers that cannot be edited (e.g., lock icon)
  - Tooltip: "Data layer - always aligned to base" vs "Image layer - can be adjusted"

- [ ] **Layer editing mode activation**
  - Only activates when user explicitly clicks "Edit Layer" or similar button
  - NOT active by default
  - Only available for layers with `allowLayerEditing: true`
  - Persists per layer: If editing electrical overlay, switching to rooms exits edit mode

- [ ] **Existing layer configuration**
  - Base floor plan: `allowLayerEditing: true`
  - Electrical overlay: `allowLayerEditing: true`
  - Rooms: `allowLayerEditing: false`
  - Furniture: `allowLayerEditing: false`
  - Masks: `allowLayerEditing: false`
  - Future device layers: `allowLayerEditing: false`

### User Experience

- [ ] **No accidental data layer transforms**
  - User cannot accidentally rotate/scale room overlay
  - Attempting to edit locked layer shows helpful message
  - Transform controls completely hidden for data layers

- [ ] **Clear mental model**
  - Image layers: Can be adjusted to align with base
  - Data layers: Always world-coordinate aligned, cannot be adjusted
  - User understands which layers are which

- [ ] **Electrical overlay workflow preserved**
  - User can still import electrical overlay
  - User can still enter layer editing mode
  - User can still adjust scale/rotation/offset
  - No regression in electrical alignment workflow

### Technical

- [ ] **Build passes** with 0 TypeScript errors
- [ ] **No regressions** in existing layer functionality
- [ ] **Manual testing** confirms locked layers cannot be edited

---

## Implementation Details

### Layer Interface Update

```typescript
interface Layer {
  id: string;
  name: string;
  type: 'image' | 'data';
  visible: boolean;
  opacity: number;
  allowLayerEditing: boolean; // NEW
  transform?: {
    scale: number;
    rotation: number;
    offset: { x: number; y: number };
  };
  // ... other properties
}
```

### Layer Configuration

```typescript
const layers = [
  {
    id: 'base',
    name: 'Base Floor Plan',
    type: 'image',
    allowLayerEditing: true, // Can adjust base image alignment
  },
  {
    id: 'electrical',
    name: 'Electrical Overlay',
    type: 'image',
    allowLayerEditing: true, // Primary use case for layer editing
  },
  {
    id: 'rooms',
    name: 'Rooms',
    type: 'data',
    allowLayerEditing: false, // Data layer - always aligned to base
  },
  {
    id: 'furniture',
    name: 'Furniture',
    type: 'data',
    allowLayerEditing: false, // Data layer - always aligned to base
  },
  {
    id: 'masks',
    name: 'Masks',
    type: 'data',
    allowLayerEditing: false, // Data layer - always aligned to base
  },
  // Future:
  {
    id: 'devices',
    name: 'Devices',
    type: 'data',
    allowLayerEditing: false, // Data layer - always aligned to base
  },
];
```

### Layer Panel UI

```tsx
<LayerItem>
  <LayerName>{layer.name}</LayerName>
  {layer.allowLayerEditing ? (
    <UnlockIcon title="Image layer - can be adjusted" />
  ) : (
    <LockIcon title="Data layer - locked to base coordinates" />
  )}
  {layer.allowLayerEditing && (
    <EditButton onClick={() => enterLayerEditMode(layer.id)}>
      Edit Layer
    </EditButton>
  )}
</LayerItem>
```

### Transform Control Logic

```typescript
function canEditLayer(layerId: string): boolean {
  const layer = getLayer(layerId);
  return layer?.allowLayerEditing ?? false;
}

function enterLayerEditMode(layerId: string) {
  if (!canEditLayer(layerId)) {
    showToast('This layer is locked to base coordinates and cannot be edited', 'warning');
    return;
  }

  // Activate transform controls
  currentEditingLayer = layerId;
  showTransformControls();
}
```

---

## User Workflow

### Aligning Electrical Overlay (Primary Use Case)

1. User imports electrical overlay image
2. Image doesn't align perfectly with base floor plan
3. User clicks "Edit Layer" on electrical overlay in layer panel
4. Transform controls appear (rotate, scale, offset)
5. User adjusts until electrical overlay aligns with base
6. User clicks "Done" to exit edit mode
7. Electrical overlay alignment saved

### Attempting to Edit Data Layer (Prevented)

1. User accidentally clicks on "Rooms" layer
2. No "Edit Layer" button available (or button disabled)
3. Lock icon indicates layer is locked to base
4. Tooltip explains: "Data layer - always aligned to base coordinates"
5. User cannot accidentally misalign room data

---

## Migration Notes

**Existing Projects:**
- Add `allowLayerEditing` flag to all existing layers
- Image layers (base, electrical): Set to `true`
- Data layers (rooms, furniture, masks): Set to `false`
- Preserve existing transforms on image layers

**New Projects:**
- Layer template includes `allowLayerEditing` flag
- Default values based on layer type

---

## Future Enhancements

- **Layer type icons**: Different icons for image vs data layers in panel
- **Bulk lock/unlock**: "Lock all data layers" option
- **Per-user preferences**: "Always show/hide layer editing controls"
- **Advanced transform**: Perspective transform for photos taken at angles
- **Layer groups**: Group related layers together (e.g., "Overlays", "Data")

---

## Likely Files to Modify

**Layer Management:**
- Layer interface/type definition
- Layer creation/initialization logic
- Layer panel component (show lock icons, hide edit buttons)

**Transform Controls:**
- Layer editing mode activation logic
- Transform control visibility (check `allowLayerEditing`)
- Error handling for locked layers

**Find layer-related code:**
```bash
grep -r "layer.*edit" components/ editor/
grep -r "transform.*control" components/ editor/
grep -r "electrical.*overlay" components/ editor/
```

---

## References

- User feedback: "Layer Editing should only come on if the user has clicked on it. It's most often going to happen for aligning electrical overlay."
- User feedback: "I can rotate / mess with Room overlay (scale, offset), that doesn't make sense."
- User feedback: "The only time we need adjusting is if we have a second image (like electrical) that isn't fully to scale."
- User feedback: "We can mark a layer as 'can have layer refinement', but everything else should be key / referenced off of the base layer."
- Date reported: 2025-12-21 (during P2 cycle review)

---

**Status:** Not Started
**Assigned To:** TBD
