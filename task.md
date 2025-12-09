# Task: Implement Systems Overview

## Goal
Create a "Systems Overview" view that presents the project organized by functional subsystems (Lighting, HVAC, Access, etc.).

## Checklist
- [x] **Data Schema & Definitions**
    - [x] Update `types.ts`: Add `systemIds` to `HardwareModule`.
    - [x] Create `constants/systems.ts`: Define the 7 systems (Goal, Technical, Filter).
    - [x] Update `constants.ts`: Tag existing hardware modules with appropriate `systemIds`.
- [x] **UI Components**
    - [x] Create `components/SystemsOverview.tsx`: Implement the accordion list view.
        - [x] Render system goals and technical details.
        - [x] Integrate `MiniBOM` or list relevant hardware.
        - [x] Implement auto-expansion based on URL hash (deep linking).
    - [x] Update `App.tsx`:
        - [x] Add "Systems Overview" to the sidebar navigation.
        - [x] Add routing logic for the new view mode.
- [x] **Verification**
    - [x] Manual Check: Verify Accordions expand, text is correct.
    - [x] Manual Check: Verify Deep Linking (`#systems/lighting`).
    - [x] Automated: Run browser test to verify navigation and content.
