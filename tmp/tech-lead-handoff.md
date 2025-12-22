# Tech Lead Handoff - Cycle P4

## Current Phase and Status
**Phase**: P4 - Migration, Reactivity, and Refactoring
**Status**: IN-PROGRESS (Execution Stage)
**Commit History**: Cycle P3 was successfully committed in previous turn (`feat: implement device data models, registry system, and layer restrictions`).

## Active Worker Assignments
Assignments are authored and verified in `tmp/assignments/`. Workers have been instructed to start.

- **Worker 1 (MIGRATION-P4)**:
    - **Task**: Implement DALI device migration in `src/services/DataService.ts`.
    - **Goal**: Transparently convert legacy `DaliDevice[]` data to new `Device[]` format on load.
    - **File**: [worker1-MIGRATION-P4.md](file:///home/bernie/IntegratorPro/tmp/assignments/worker1-MIGRATION-P4.md)

- **Worker 2 (REACTIVITY-P4)**:
    - **Task**: Add `EventEmitter` to `src/services/DeviceRegistry.ts`.
    - **Goal**: Emit 'change' events on all CRUD operations to support reactive UI updates.
    - **File**: [worker2-REACTIVITY-P4.md](file:///home/bernie/IntegratorPro/tmp/assignments/worker2-REACTIVITY-P4.md)

- **Worker 3 (REFACTOR-P4)**:
    - **Task**: Refactor `components/FloorPlanRenderer.tsx`.
    - **Goal**: Extract initialization and event handling logic into custom hooks (`useEditorInitialization`, `useEditorEvents`) to meet the <300 line quality gate.
    - **File**: [worker3-REFACTOR-P4.md](file:///home/bernie/IntegratorPro/tmp/assignments/worker3-REFACTOR-P4.md)

## Pending Issues / Blockers
- **Critical Issue**: `FloorPlanRenderer.tsx` is >1000 lines. Refactoring is in progress (Worker 3).
- **Data Integrity**: confirmed that `projects/270-boll-ave/project.json` currently has empty `devices` array. Legacy migration by Worker 1 is a safety net.
- **Save Loop**: A previous save loop issue was fixed by adding dirty checks (`lastSavedSymbolsRef`, etc.) in `FloorPlanRenderer.tsx`. Ensure these are preserved during refactor.

## Next Cycle Priorities (P5)
1. **Verification**: Review results from Workers 1, 2, and 3.
2. **Reactivity Hook**: Implement `useDevices` hook that leverages Worker 2's new event-emitting registry.
3. **UI Integration**: Update `LayersSidebar` or other components to use the reactive hook.
4. **Final Refactor**: Continue reducing `FloorPlanRenderer.tsx` if still above 300 lines.

## Critical Context
- **Project Structure**: Multi-worker parallel system. Always wait for all workers to finish before review.
- **Engineering Handbook**: Strict adherence to file length limits and quality gates is required.
- **Shared Workspace**: Direct git manipulation is forbidden; use [commit worker](file:///home/bernie/IntegratorPro/roles/commit.md) for commits.
- **Layers**: New device layers (Cables, Lighting, etc.) and `allowLayerEditing` flags were established in P3.
