**Task-ID: LAYER-LOCK-P3**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 2, beginning Layer Editing Restriction"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 2 - Layer Editing Restriction - Complete/Blocked - Duration: [X minutes]"
6. NEVER use "In-Progress" status when submitting - you are either done or blocked

## YOU ARE A SENIOR ENGINEER

You have FULL AUTONOMY to:
- Make technical decisions within assignment scope
- Research solutions (web search, docs, experimentation)
- Debug and fix problems independently
- Choose implementation approaches

You MUST:
- Complete ALL acceptance criteria (no partial work, no "asking permission")
- Work through problems using web search, documentation, debugging
- Only escalate TRUE blockers (impossible requirements, missing credentials, conflicts)
- Use good judgment: solid implementation, not quick hacks or over-engineering

---

## Context

Layer editing mode currently allows users to transform ANY layer (rotate, scale, offset). This is dangerous for data layers like Rooms, Furniture, Devices - these should always align with base coordinates and never be transformed at the layer level.

User feedback: "I can rotate / mess with Room overlay (scale, offset), that doesn't make sense. The only time we need adjusting is if we have a second image (like electrical) that isn't fully to scale."

Reference: `tickets/layer-editing-restrict-to-images.md`

---

## Mission

Restrict layer editing to image layers only (base, electrical). Lock data layers (rooms, furniture, devices) to base coordinates to prevent accidental misalignment.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Add `allowLayerEditing` property to layer interface/type**
  - Type: `boolean`
  - Add to LayerConfig interface (likely in LayerSystem.ts or layer types)
  - Optional with default behavior

- [ ] **Set `allowLayerEditing` flag on layer creation**:
  - Image layers (base, electrical): `allowLayerEditing: true`
  - Data layers (mask, room, furniture, lighting, sensors, security, network, cables, lcps): `allowLayerEditing: false`

- [ ] **Layer editing controls respect flag**:
  - Find where layer editing mode is activated
  - Check `allowLayerEditing` before allowing transform controls
  - If false: Show error message "This layer is locked to base coordinates"
  - If false: Disable/hide transform controls (rotate, scale, offset)

- [ ] **Layer panel UI shows lock status**:
  - Add visual indicator for locked layers (lock icon or disabled state)
  - Tooltip: "Data layer - locked to base" vs "Image layer - can be adjusted"
  - Clear indication which layers can vs cannot be edited

- [ ] **Build passes** with 0 TypeScript errors

- [ ] **Manual testing**:
  - Try to edit base layer → Should work (transform controls appear)
  - Try to edit electrical layer → Should work (transform controls appear)
  - Try to edit room layer → Should fail (error message or disabled)
  - Try to edit furniture layer → Should fail (error message or disabled)
  - Verify lock icons appear on data layers in layer panel
  - No regressions (electrical overlay editing still works)

---

## Deliverables

1. **Layer type/interface updates**:
   - Add `allowLayerEditing: boolean` property
   - Update LayerConfig interface
   - Update Layer class/type

2. **FloorPlanRenderer.tsx or layer initialization**:
   - Set `allowLayerEditing: true` for base, electrical
   - Set `allowLayerEditing: false` for all data layers

3. **Layer editing logic**:
   - Add check before activating layer edit mode
   - Show error message if user tries to edit locked layer
   - Disable transform controls for locked layers

4. **UI updates** (layer panel):
   - Add lock icon or visual indicator
   - Add tooltip explaining locked vs unlocked

5. **Manual testing results** in result file:
   - Evidence that image layers can be edited
   - Evidence that data layers cannot be edited
   - Screenshots or detailed description of lock UI
   - Confirmation of no regressions

---

## Independence Statement

This task is fully independent. Does not depend on Workers 1 or 3.

May have minor dependency on Worker 1's new layers, but can use existing layers for testing.

---

## First Action Hints

1. Find layer interface/type definition:
   ```bash
   grep -r "interface.*Layer\|type.*Layer" editor/systems/ editor/types/
   ```

2. Find where layer editing mode is activated:
   ```bash
   grep -r "layer.*edit\|transform.*control" components/ editor/
   ```

3. Find FloorPlanRenderer layer initialization:
   ```bash
   grep -A 5 "addLayer" components/FloorPlanRenderer.tsx
   ```

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Medium - add property, implement checks, add UI indicators, error handling

---

## MANDATORY COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show 0 errors.

2. **Manual Testing:**
   Start dev server and test:
   - Image layers (base, electrical) can be edited
   - Data layers (room, furniture) cannot be edited
   - Error message appears when trying to edit locked layer
   - Lock indicators visible in layer panel

Include proof of these checks in your result file.

If a check fails: FIX IT. Debug, research, fix. Do not stop until all checks pass.

---

## Reference Documents

- Detailed ticket: `tickets/layer-editing-restrict-to-images.md`
- Layer system: `editor/systems/LayerSystem.ts`
- Current layers: `components/FloorPlanRenderer.tsx`

---

**Result File:** `tmp/worker/result-worker2-LAYER-LOCK-P3.md`

Start NOW.
