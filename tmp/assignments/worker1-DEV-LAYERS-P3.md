**Task-ID: DEV-LAYERS-P3**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 1, beginning Device Layer System"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 1 - Device Layer System - Complete/Blocked - Duration: [X minutes]"
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

Device placement system requires dedicated layers for different device categories (lighting, sensors, security, network, cables, LCPs). Currently only have: base, mask, electrical, room, furniture layers.

User feedback: "I don't yet see the layers we discussed. We have Furniture (new), but I don't see the layers for the devices, etc."

Reference: Device system specs documented in `docs/symbol-library-spec.md` and `docs/cable-routing-spec.md`

---

## Mission

Add device-related layers to the floor plan editor so devices can be placed and organized by category.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Add 6 new device layers** to FloorPlanRenderer.tsx initialization:
  - Lighting layer (id: 'lighting', name: 'Lighting')
  - Sensors layer (id: 'sensors', name: 'Sensors')
  - Security layer (id: 'security', name: 'Security')
  - Network layer (id: 'network', name: 'Network')
  - Cables layer (id: 'cables', name: 'Cables')
  - LCPs layer (id: 'lcps', name: 'LCPs')

- [ ] **Configure proper z-index stacking order**:
  - Base: 0 (floor plan image)
  - Mask: 10 (masking)
  - Electrical: 20 (overlay image)
  - Room: 30 (room polygons)
  - Cables: 40 (cable routes - below devices)
  - Lighting: 50 (lights)
  - Sensors: 51 (sensors)
  - Security: 52 (cameras, etc.)
  - Network: 53 (WiFi APs, switches)
  - LCPs: 54 (control panels)
  - Furniture: 60 (furniture on top)

- [ ] **Set layer properties**:
  - type: 'vector' (all device layers are vector/data)
  - visible: true (default visible)
  - opacity: 100 (default full opacity)
  - locked: false (user can toggle)

- [ ] **Verify layers appear in layer panel UI**:
  - All 6 new layers show in layer panel
  - Layer visibility toggles work
  - Layer opacity controls work (if available)
  - Layers appear in correct stacking order

- [ ] **Build passes** with 0 TypeScript errors

- [ ] **Manual testing**:
  - Open app, verify all layers visible in layer panel
  - Toggle each new layer visibility on/off
  - Verify z-index order is correct (cables below devices, devices below furniture)
  - No regressions in existing layers (base, room, furniture still work)

---

## Deliverables

1. **components/FloorPlanRenderer.tsx** updates:
   - Add 6 new editorInstance.addLayer() calls
   - Configure z-index values for proper stacking
   - Set layer properties (type, visible, opacity)

2. **Manual testing results** in result file:
   - Screenshot or description of layer panel showing all new layers
   - Evidence that layers can be toggled
   - Evidence that z-index order is correct
   - Confirmation of no regressions

---

## Independence Statement

This task is fully independent. Does not depend on Workers 2 or 3.

---

## First Action Hints

1. Find current layer initialization in FloorPlanRenderer.tsx:
   ```bash
   grep -A 5 "addLayer.*furniture" components/FloorPlanRenderer.tsx
   ```

2. Read device layer specifications:
   ```bash
   grep -i "layer" docs/symbol-library-spec.md | head -20
   ```

3. Add new layers after furniture layer initialization:
   ```typescript
   editorInstance.addLayer({
       id: 'lighting',
       name: 'Lighting',
       type: 'vector',
       zIndex: 50,
       visible: true,
       opacity: 100,
       locked: false
   });
   // ... repeat for other device layers
   ```

---

## Autonomy Mode

**Mode:** Exact
**Expansion Budget:** Low - add 6 layers with specified properties, configure z-index, verify in UI

---

## MANDATORY COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show 0 errors.

2. **Manual Testing:**
   Start dev server and verify:
   - All 6 new layers appear in layer panel
   - Layers can be toggled on/off
   - Z-index order is correct

Include proof of these checks in your result file.

If a check fails: FIX IT. Debug, research, fix. Do not stop until all checks pass.

---

## Reference Documents

- Current layers: `components/FloorPlanRenderer.tsx` (search for addLayer)
- Layer system: `editor/systems/LayerSystem.ts`
- Device categories: `docs/symbol-library-spec.md`
- Cable spec: `docs/cable-routing-spec.md`

---

**Result File:** `tmp/worker/result-worker1-DEV-LAYERS-P3.md`

Start NOW.
