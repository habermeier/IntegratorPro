**Task-ID: DEVICE-DOCS-P1**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 3, beginning Device System Documentation"
2. End your result file with: "Worker 3 - Device System Documentation - Complete/Blocked"
3. NEVER use "In-Progress" status when submitting - you are either done or blocked

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

Device placement system needs comprehensive TypeScript interfaces and documentation before implementation. Worker 1 is handling data architecture migration. This work prepares the foundation for device system implementation (T-1, T-2, T-3 in the plan).

Design decisions documented in: `tickets/device-system-design-decisions.md`

---

## Mission

Create complete TypeScript interface definitions and technical documentation for the device placement system data models, preparing for implementation in next cycle.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **TypeScript Interfaces Document** created at `docs/device-system-interfaces.ts` with:
  - Device interface (all fields from design decisions)
  - DeviceType interface (with defaultProductId, defaultShorthand)
  - Product interface (with optional fields, multi-component support)
  - CableRoute interface (explicit segment geometry, PoE attribute)
  - LCP interface (simple: name, position, roomId)
  - All supporting types (Vector2, Vector3, etc.)
- [ ] **Data Model Documentation** created at `docs/device-system-data-models.md`:
  - Explanation of each interface and its purpose
  - Relationship diagrams (Device → DeviceType → Product)
  - Field descriptions with examples
  - Multi-component product examples
  - Cable topology examples (daisy-chain vs home-run)
- [ ] **Symbol Library Specification** created at `docs/symbol-library-spec.md`:
  - List of initial symbols needed (canned light, camera, sensor, WiFi AP, LCP, chandelier, fan, etc.)
  - Symbol size guidelines (world-space, ~0.3m default)
  - Shorthand annotation specifications
  - Color coding by device category
- [ ] **Cable Routing Specification** created at `docs/cable-routing-spec.md`:
  - Cable types and their properties (Cat6, DALI-2, KNX, Fiber, LED, Shade)
  - Topology rules (daisy-chain vs home-run)
  - Parallel pathing algorithm description
  - Color coding scheme (KNX=green, DALI=blue, etc.)
  - Amperage tracking methodology
- [ ] **All interfaces validated** - no TypeScript compilation errors in the interfaces file

---

## Deliverables

1. **docs/device-system-interfaces.ts**:
   ```typescript
   // Complete interfaces for:
   // - Device (15+ fields)
   // - DeviceType (8+ fields)
   // - Product (12+ fields with optional fields)
   // - CableRoute (7+ fields with segment geometry)
   // - LCP (5+ fields)
   // - Supporting types
   ```

2. **docs/device-system-data-models.md**:
   - Markdown document (2000-3000 words)
   - Clear explanations of each data model
   - ASCII/Mermaid diagrams showing relationships
   - Examples for each interface
   - Notes on design decisions (why fields are optional, etc.)

3. **docs/symbol-library-spec.md**:
   - List of 15+ device symbols needed
   - Size specifications (world-space meters)
   - Visual description for each symbol
   - Shorthand examples
   - Color palette

4. **docs/cable-routing-spec.md**:
   - Cable type matrix (topology, connectors, rules)
   - Algorithm descriptions (parallel snapping, bundled turns)
   - Color scheme table
   - Rules engine specifications (DALI 64-device limit, amperage, etc.)

---

## Independence Statement

This task is fully independent. Pure documentation work - no code dependencies.

---

## First Action Hints

1. Read design decisions to understand all requirements:
   ```bash
   cat tickets/device-system-design-decisions.md
   ```

2. Review implementation plan for context:
   ```bash
   cat tickets/device-system-implementation-plan.md
   ```

3. Start with device-system-interfaces.ts - copy the interface skeletons from design-decisions.md and flesh them out with complete field definitions and JSDoc comments.

---

## Autonomy Mode

**Mode:** Exact
**Expansion Budget:** Low - stick to the interface definitions and documentation specified. May add clarifying examples and diagrams.

---

## MANDATORY COMPLIANCE

Before marking this task complete, you MUST verify:

1. **TypeScript Validation:**
   ```bash
   npx tsc --noEmit docs/device-system-interfaces.ts
   ```
   Output must show 0 errors.

2. **Completeness Check:**
   - Device interface has ALL fields from design decisions (id, deviceTypeId, productId, name, position, rotation, roomId, layerId, installationHeight, networkConnections, lcpAssignment, metadata, createdAt)
   - Product interface has components array for multi-component products
   - CableRoute has segments array with Vector3 points
   - All optional fields marked with `?`

3. **Documentation Quality:**
   - Each markdown file has clear section headings
   - Examples included for complex concepts
   - Diagrams showing relationships
   - No "TBD" or "TODO" placeholders

4. **Spell Check:**
   ```bash
   aspell list < docs/device-system-data-models.md
   ```
   No major typos.

Include proof of these checks in your result file.

If a check fails: FIX IT. Add missing fields, correct errors, complete documentation.

Work that is incomplete or has errors is NOT acceptable.

---

## Reference Documents

- Design decisions: `tickets/device-system-design-decisions.md` (PRIMARY SOURCE)
- Implementation plan: `tickets/device-system-implementation-plan.md`
- Data architecture analysis: `tickets/data-persistence-architecture-analysis.md`

---

**Result File:** `tmp/worker/result-worker3-DEVICE-DOCS-P1.md`

Start NOW.
