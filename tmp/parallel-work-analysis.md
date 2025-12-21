Date: 2025-12-20

# Parallel Work Analysis - 3 Workers

## Current State

**Prerequisite:** T-0 (Data Architecture Migration) blocks all device system work.

**Challenge:** T-0 is estimated at 4-6 hours and is a prerequisite for everything else.

---

## Option 1: Three-Way Split of T-0 (RECOMMENDED)

Break T-0 into 3 parallel, independent sub-tasks that can be integrated together:

### Worker 1: Client Abstraction Layer
**File:** `services/DataService.ts`
- Create DataService with loadProject() and saveProject()
- Initially works with existing endpoints (fetch('/api/layout'), etc.)
- Implements caching, convenience methods (updateFurniture, updateDevices)
- TypeScript interface definitions for ProjectData
- **Independent:** Can be developed and tested without server changes
- **Integration point:** API calls (uses existing endpoints initially)

### Worker 2: Server Migration & Endpoints
**Files:** `server.js`, `scripts/migrate-to-project.js`
- Create monolithic `/api/project/:projectId` endpoints (GET, POST)
- Create `/api/project/:projectId/history` endpoint
- Create `/api/projects` list endpoint
- Migration script to consolidate existing JSON files into project.json
- Auto-versioning logic (.history folder)
- **Independent:** Can develop endpoints without client using them yet
- **Integration point:** Endpoint contracts (matches DataService expectations)

### Worker 3: Component Integration & Testing
**Files:** `components/FloorPlanRenderer.tsx`, other components using APIs
- Replace direct fetch() calls with dataService methods
- Update component initialization (loadProject instead of multiple fetches)
- Update save handlers (dataService.updatePolygons, etc.)
- Test integration (load, save, verify data flow)
- **Independent:** Can prepare changes using mock DataService initially
- **Integration point:** Uses DataService API (Worker 1) and new endpoints (Worker 2)

**Integration:** After all 3 complete, wire together and verify end-to-end.

**Estimated:** 1.5-2 hours per worker (parallelized, vs 4-6 sequential)

---

## Option 2: T-0 + Parallel Prep Work

### Worker 1: Complete T-0 (Data Architecture)
Full migration as specified in original ticket.

### Worker 2: Design & Documentation
- Create detailed data models for Device, DeviceType, Product, Cable, LCP
- Write TypeScript interfaces
- Design symbol library structure
- Document cable routing algorithms
- Prepare for T-1 (Device Models)

### Worker 3: Tooling & Infrastructure
- Create initial symbol rendering utilities (SVG → canvas conversion)
- Set up layer registry pattern skeleton
- Create spatial utils foundation (distance calculations, point-in-polygon)
- Prepare for T-5 (Layer System) and T-6 (Cable Drawing)

**Problem:** Workers 2 and 3 can't fully test their work until T-0 completes.

---

## Option 3: Pause Device System, Work Furniture (ALTERNATIVE)

### Resume Furniture Ticket (Currently Paused)

From `tickets/furniture-placement-tool.md`:
- Furniture placement tool is mostly complete
- **Main gap:** Persistence (save/load) not implemented
- Uses proposed `/api/furniture` endpoint

**Parallel Tasks:**

### Worker 1: Furniture Persistence
- Implement furniture save/load using DataService pattern
- Add furniture to project.json schema
- Test save/load cycle

### Worker 2: Furniture Refinements
- "Snap to Wall" rotation (auto-align to wall)
- Keyboard nudging improvements
- Distance indicator refinements

### Worker 3: Furniture Settings & UI Polish
- Settings integration (snap sensitivity, rotation increment)
- Sidebar improvements (sorting, filtering)
- Visual polish (collision indicators, distance colors)

**Advantage:** Can make progress on a nearly-complete feature while planning device system.

**Disadvantage:** Furniture still needs data architecture migration eventually.

---

## Recommendation: Option 1 (Three-Way T-0 Split)

**Why:**
✅ Makes progress on critical prerequisite immediately
✅ All 3 workers productive in parallel
✅ Shorter total time (1.5-2h vs 4-6h)
✅ Clean integration points (well-defined interfaces)
✅ Unblocks entire device system after completion

**Risks:**
⚠️ Requires careful coordination at integration
⚠️ Need clear API contracts between workers

**Mitigation:**
- Create API contract document before work starts
- Each worker includes integration tests against contract
- Tech lead verifies integration after all 3 complete

---

## Integration Contract (for Option 1)

### DataService API (Worker 1 provides)
```typescript
interface DataService {
  loadProject(projectId?: string): Promise<ProjectData>;
  saveProject(data: ProjectData): Promise<void>;
  updatePolygons(polygons: Polygon[]): Promise<void>;
  updateFurniture(furniture: Furniture[]): Promise<void>;
  // ... other convenience methods
}

interface ProjectData {
  version: string;
  timestamp: string;
  metadata: ProjectMetadata;
  floorPlan: {
    scale: { pixelsPerMeter: number };
    layout: any;
    polygons: Polygon[];
    electricalOverlay: any;
  };
  furniture: Furniture[];
  devices: Device[];
  cables: CableRoute[];
  lcps: LCP[];
  settings: Settings;
}
```

### Server Endpoints (Worker 2 provides)
```
GET  /api/project/:projectId         → ProjectData
POST /api/project/:projectId         → { success: boolean, savedTo: string }
GET  /api/project/:projectId/history → { versions: Version[] }
GET  /api/projects                   → { projects: ProjectSummary[] }
```

### Component Updates (Worker 3 provides)
- FloorPlanRenderer uses `dataService.loadProject()` on mount
- Save handlers use `dataService.updatePolygons()`, etc.
- All direct fetch() calls replaced with DataService methods

---

## Next Steps

**If Option 1 approved:**
1. Create 3 assignment files (Worker 1, 2, 3)
2. Define API contracts explicitly in each assignment
3. Hand off to workers simultaneously
4. After completion: Integration verification cycle

**If Option 3 approved:**
1. Resume furniture ticket work
2. Complete furniture persistence
3. Return to device system after furniture done

**Decision needed from Bernie:** Which option?
