**Task-ID: DATA-ARCH-P1**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 1, beginning Data Architecture Migration"
2. End your result file with: "Worker 1 - Data Architecture Migration - Complete/Blocked"
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

Current state: Project data is fragmented across 6+ individual endpoints (/api/layout, /api/scale, /api/polygons, /api/dali-devices, etc.) with no versioning or atomic saves. This blocks the device placement system and all future multi-project work.

Design decision: Migrate to monolithic project.json pattern with automatic versioning. See `tickets/data-persistence-architecture-analysis.md` for full rationale.

---

## Mission

Implement DataService abstraction layer and migrate from multiple individual endpoints to single monolithic project.json pattern with automatic versioning.

This is the foundation for the entire device placement system. All future work depends on this.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] `services/DataService.ts` created with loadProject(), saveProject(), update*() methods
- [ ] Server endpoints implemented: GET/POST `/api/project/:projectId`, GET `/api/project/:projectId/history`, GET `/api/projects`
- [ ] Migration script creates `projects/270-boll-ave/project.json` from existing JSON files (layout.json, scale.json, polygons.json, electrical-overlay.json, dali-devices.json, settings.json)
- [ ] Auto-versioning: every save creates timestamped copy in `.history/` folder
- [ ] FloorPlanRenderer.tsx updated to use DataService (replace all direct fetch() calls)
- [ ] All existing features work (load polygons, scale, electrical overlay, save changes)
- [ ] Version history works (can load previous version)
- [ ] NO data loss during migration (all existing data preserved)
- [ ] Project structure: `projects/270-boll-ave/project.json` + `.history/project-TIMESTAMP.json` files

---

## Deliverables

1. **DataService** (`services/DataService.ts`):
   - loadProject(projectId?: string): Promise<ProjectData>
   - saveProject(data: ProjectData): Promise<void>
   - updatePolygons(), updateScale(), updateFurniture(), etc. (convenience methods)
   - In-memory cache
   - TypeScript interfaces for ProjectData structure

2. **Server Endpoints** (`server.js`):
   - GET /api/project/:projectId - load project
   - POST /api/project/:projectId - save with auto-versioning
   - GET /api/project/:projectId/history - list versions
   - GET /api/projects - list all projects

3. **Migration Script** (`scripts/migrate-to-project.js`):
   - Reads existing JSON files (layout.json, scale.json, polygons.json, etc.)
   - Consolidates into single project.json
   - Creates directory structure: projects/270-boll-ave/
   - Run once to migrate existing data

4. **Component Updates**:
   - FloorPlanRenderer.tsx uses DataService instead of direct fetch()
   - Other components updated if they use APIs directly

5. **File Structure**:
   ```
   projects/
     270-boll-ave/
       project.json
       .history/
         project-2025-12-20-153000.json
         project-2025-12-20-143000.json
   ```

---

## Independence Statement

This task is fully independent. No dependencies on other workers this cycle.

---

## First Action Hints

1. Read the full design document:
   ```bash
   cat tickets/data-persistence-architecture-analysis.md
   ```

2. Check current server endpoints to understand existing pattern:
   ```bash
   grep -A 10 "app.get('/api/" server.js
   ```

3. Create DataService.ts skeleton and define ProjectData interface first (establishes contract for everything else).

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Medium - you may create helper functions, utilities, and additional types as needed to implement the core requirements. Stay focused on the data architecture migration objective.

---

## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

You MUST follow the Engineering Handbook and TypeScript/React best practices.
Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show no errors.

2. **Server Runs:**
   ```bash
   npm run dev
   ```
   Server starts without errors.

3. **Manual Test:**
   - Load http://localhost:5173/floorplan
   - Verify floor plan loads (existing data visible)
   - Make a change (e.g., add polygon)
   - Reload page - verify change persisted
   - Check `projects/270-boll-ave/project.json` exists
   - Check `.history/` folder has timestamped versions

4. **No Data Loss:**
   - Compare existing data with migrated project.json
   - All polygons, scale, layout, electrical-overlay present

Include the output of these checks in your result file as proof.

If a check fails: DEBUG AND FIX IT. Do not stop, do not ask permission, FIX IT.
Use web search, read docs, inspect errors, try solutions systematically.

Work that fails ANY of these checks is NOT complete.

---

## Reference Documents

- Design: `tickets/data-persistence-architecture-analysis.md`
- Implementation plan: `tickets/device-system-implementation-plan.md`
- Current server: `server.js`
- Current component: `components/FloorPlanRenderer.tsx`

---

**Result File:** `tmp/worker/result-worker1-DATA-ARCH-P1.md`

Start NOW.
