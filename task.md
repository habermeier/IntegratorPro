# Task: Add Motorized Shading System

## Goal
Add a new "Window Treatments" system focusing on pre-wiring requirements (16/4 Home Run) and optional DIN rail allocation.

## Checklist
- [ ] **Data Schema & Content**
    - [ ] Update `types.ts`: Add `SHADING` to `ModuleType` (if not present).
    - [ ] Update `systems.ts`: Add "Motorized Shading" system definition.
    - [ ] Update `constants.ts`: Add `16/4 Cable` (Bulk) and `MDT Shutter Actuator` (Pre-spec).
- [ ] **UI Updates**
    - [ ] Update `RoughInGuide.tsx`: Add the specific "Technical Cable Schedule" text provided by the user.
- [ ] **Verification**
    - [ ] Verify "Motorized Shading" appears in Systems Overview.
    - [ ] Verify "Rough-in Guide" shows the electrician instructions.
