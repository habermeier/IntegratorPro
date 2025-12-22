# Assignment: Worker 3 - FloorPlanRenderer Refactor
**Task-ID**: REFACTOR-P4

## Identity Verification Requirement
You MUST:
1. Start your work by confirming: "I am Worker 3, beginning FloorPlanRenderer Refactor"
2. Record start timestamp immediately
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 3 - FloorPlanRenderer Refactor - Complete - Duration: [X minutes]"

## Context
`FloorPlanRenderer.tsx` has grown to over 1000 lines, violating our 300-line quality gate. It contains too much initialization and event handling logic that should be modularized.

## Mission
Refactor `FloorPlanRenderer.tsx` by extracting logic into custom hooks, bringing the main file under 500 lines (as a first step, with 300 as the final goal).

## Acceptance Criteria
- [ ] Create `src/hooks/useEditorInitialization.ts`:
    - Extract `initEditor` callback and the async `setup` logic.
    - Extract initial layer definitions.
- [ ] Create `src/hooks/useEditorEvents.ts`:
    - Extract the `useEffect` block that sets up `editor.on(...)` listeners.
- [ ] Ensure `FloorPlanRenderer.tsx` remains functional and all dependencies are correctly passed between the component and the new hooks.
- [ ] Build passes: `npm run build` with 0 TypeScript errors.
- [ ] The total line count of `FloorPlanRenderer.tsx` MUST be reduced significantly (aim for < 500 lines).

## Deliverables
- [MODIFY] `components/FloorPlanRenderer.tsx`
- [NEW] `src/hooks/useEditorInitialization.ts`
- [NEW] `src/hooks/useEditorEvents.ts`

## Independence Statement
Your work focuses on refactoring. Avoid changing logic; just move it. Ensure you work in a way that doesn't conflict with other workers (they are touching services, you are touching the UI component).

## First Action Hints
1. Identify the boundaries of the `useEffect` and `initEditor` blocks.
2. Create the hook files and define their input/output types.
3. Move the logic and verify imports.

## Autonomy Mode
Mission (Large Budget)
