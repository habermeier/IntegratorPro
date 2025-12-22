# Assignment: Worker 2 - Device Registry Reactivity
**Task-ID**: REACTIVITY-P4

## Identity Verification Requirement
You MUST:
1. Start your work by confirming: "I am Worker 2, beginning Device Registry Reactivity"
2. Record start timestamp immediately
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 2 - Device Registry Reactivity - Complete - Duration: [X minutes]"

## Context
The `DeviceRegistry` stores devices but provides no way for UI components to know when data has changed. We need an observer pattern to support reactive UI updates.

## Mission
Add `EventEmitter` capability to `DeviceRegistry` and trigger events on all mutation operations.

## Acceptance Criteria
- [ ] Modify `src/services/DeviceRegistry.ts` to extend `EventEmitter` (from the standard 'events' module or use a simple custom implementation if 'events' isn't available).
- [ ] Emit a 'change' event in:
    - `addDevice()`
    - `removeDevice()`
    - `updateDevice()`
    - `setDevices()`
    - `clearDevices()`
- [ ] Ensure the 'change' event includes the type of change and the affected device(s) as payload (optional but recommended).
- [ ] Build passes: `npm run build` must succeed.

## Deliverables
- [MODIFY] `src/services/DeviceRegistry.ts`

## Independence Statement
Your work is independent. `DataService` uses the registry but doesn't yet depend on events.

## First Action Hints
1. Check if the 'events' module is available in the environment.
2. Update the `DeviceRegistry` class signature.
3. Add `this.emit('change', ...)` calls in all mutation methods.

## Autonomy Mode
Mission (Small Budget)
