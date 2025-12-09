# Task: Implement Systems Overview (Data-Driven)

## Goal
Implement a thematic "Systems Overview" view driven by a flexible data schema, allowing systems to be defined, added, or removed via data configuration.

## Checklist
- [ ] **Schema Definition**
    - [ ] Update `types.ts`: Define `SystemDefinition` interface.
    - [ ] Update `types.ts`: Add `systemIds` to `HardwareModule`.
- [ ] **Data Model**
    - [ ] Create `constants/systems.ts`: Define the 7 systems (Lighting, Heating, Access, etc.).
    - [ ] Update `constants.ts`: Tag existing products with correct `systemIds`.
- [ ] **UI Implementation**
    - [ ] Create `components/SystemsOverview.tsx`: Generic renderer for `SystemDefinition[]`.
    - [ ] Implement Deep Linking (Auto-expand based on hash).
- [ ] **Integration**
    - [ ] Update `App.tsx`: Add "Systems Overview" to Nav and Render loop.
    - [ ] Update `hooks/useDeepLink.ts`: Support `SYSTEMS` view mode.
- [ ] **Verification**
    - [ ] Verify Sections render correctly.
    - [ ] Verify Mini-BOM filtering.
    - [ ] Verify Deep Linking (`#systems/lighting`).
