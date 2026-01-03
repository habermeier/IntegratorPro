# Parallel Execution Examples for Tech Lead

## Good Example: Parallel Architecture Migration

### Cycle 1 (All Parallel)
- Worker 1: Remove Manager from App struct
- Worker 2: Delete Manager module and fix tests  
- Worker 3: Remove compatibility shims

These can ALL run simultaneously because:
- Worker 1 only touches app modules
- Worker 2 deletes dead code and updates tests
- Worker 3 removes shims in actors module
No worker needs another's output.

### Cycle 2 (After Cycle 1 Complete)
- Worker 1: Implement worker process PTY
- Worker 2: Implement NDJSON protocol
- Worker 3: Add snapshot capability

These depend on Cycle 1 being done (clean architecture) but can run in parallel with each other.

## Bad Example: Sequential Work (DON'T DO THIS)

### Wrong Cycle (Sequential Dependencies)
- Worker 1: Create new API interface
- Worker 2: Implement the interface Worker 1 creates ❌
- Worker 3: Test the implementation Worker 2 creates ❌

Worker 2 can't start until Worker 1 finishes. Worker 3 can't start until Worker 2 finishes. This is WRONG.

### Corrected Into Two Cycles

**Cycle 1:**
- Worker 1: Create new API interface
- Worker 2: Clean up old API references
- Worker 3: Update documentation

**Cycle 2 (After Cycle 1):**
- Worker 1: Implement interface handlers
- Worker 2: Add integration tests
- Worker 3: Update client examples

## Common Patterns for Parallel Work

### Pattern 1: Module Separation
Give each worker a different module/directory:
- Worker 1: src/handlers/
- Worker 2: src/actors/
- Worker 3: src/tui/

### Pattern 2: Layer Separation  
Give each worker a different layer:
- Worker 1: Database layer
- Worker 2: API layer
- Worker 3: UI layer

### Pattern 3: Feature Separation
Give each worker an independent feature:
- Worker 1: Add logging system
- Worker 2: Add metrics collection
- Worker 3: Add health checks

### Pattern 4: Cleanup Separation
Give each worker different cleanup tasks:
- Worker 1: Fix clippy warnings in module A
- Worker 2: Add missing tests for module B
- Worker 3: Update documentation for module C

## Red Flags That Work Isn't Parallel

1. Assignment says "after Worker X completes..."
2. Assignment says "using the interface Worker Y creates..."
3. Assignment says "wait for..." or "depends on..."
4. Workers touch the same files
5. One worker's compilation depends on another's code

## Tech Lead Decision Tree

```
Is all work independent?
├─ YES → Create assignments for all 3 workers
└─ NO → Can work be split into independent parts?
    ├─ YES → Split and assign independent parts only
    └─ NO → This is sequential work
         └─ Hold it for next cycle
             └─ Find other parallel work for this cycle
```

## Remember

- Workers are deployed as a GROUP
- Workers work in PARALLEL
- Workers complete as a GROUP
- Tech Lead waits for ALL before reviewing
- Sequential work goes in NEXT cycle