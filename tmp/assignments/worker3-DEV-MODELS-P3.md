**Task-ID: DEV-MODELS-P3**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 3, beginning Device Data Models & Registry"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 3 - Device Data Models & Registry - Complete/Blocked - Duration: [X minutes]"
6. NEVER use "In-Progress" status when submitting - you are either done or blocked

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

Device placement system requires core data models (Device, DeviceType, Product) and a registry to manage device instances. This is T-1 from the device system implementation plan.

Reference documentation created by Worker 3 in P1:
- `docs/device-system-interfaces.ts` (466 lines of TypeScript interfaces)
- `docs/device-system-data-models.md` (comprehensive documentation)

---

## Mission

Implement Device, DeviceType, Product interfaces and DeviceRegistry singleton for managing device instances in the application.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

- [ ] **Create `src/models/Device.ts`** with TypeScript interfaces:
  - Device interface (13 fields from docs/device-system-interfaces.ts)
  - DeviceType interface (8 fields)
  - Product interface (12+ fields with optional fields)
  - Vector2, Vector3 types (if not already defined)
  - Export all interfaces

- [ ] **Create `src/services/DeviceRegistry.ts`** singleton:
  - Manages all device instances in memory
  - Methods:
    - `addDevice(device: Device): void` - Add device to registry
    - `removeDevice(deviceId: string): void` - Remove device
    - `getDevice(deviceId: string): Device | undefined` - Get device by ID
    - `getAllDevices(): Device[]` - Get all devices
    - `getDevicesByLayer(layerId: string): Device[]` - Get devices in layer
    - `getDevicesByRoom(roomId: string): Device[]` - Get devices in room
    - `clearDevices(): void` - Clear all devices
  - Singleton pattern (private constructor, static getInstance())
  - Event emission on changes (optional but recommended)

- [ ] **Integrate with DataService**:
  - Add `devices: Device[]` field to ProjectData interface
  - Update `loadProject()` to populate DeviceRegistry from loaded data
  - Update `saveProject()` to save devices from DeviceRegistry
  - Add convenience method: `updateDevices(devices: Device[]): Promise<void>`

- [ ] **Add device storage to project.json**:
  - Devices array in project data structure
  - Auto-versioning still works (devices saved to .history/)

- [ ] **Build passes** with 0 TypeScript errors

- [ ] **Unit/integration test** (create simple test file or manual verification):
  - Create device instance
  - Add to registry
  - Retrieve from registry
  - Save to project.json (via DataService)
  - Load from project.json (populate registry)
  - Verify devices persist correctly

---

## Deliverables

1. **src/models/Device.ts** (NEW):
   - Device, DeviceType, Product interfaces
   - All supporting types (Vector2, Vector3 if needed)
   - JSDoc comments on interfaces
   - Export all types

2. **src/services/DeviceRegistry.ts** (NEW):
   - Singleton class managing device instances
   - All CRUD methods (add, remove, get, getAll, etc.)
   - Filter methods (by layer, by room)
   - Event emission (optional)

3. **src/services/DataService.ts** (MODIFIED):
   - Add devices field to ProjectData
   - Update loadProject to populate DeviceRegistry
   - Update saveProject to save from DeviceRegistry
   - Add updateDevices convenience method

4. **Manual testing results** in result file:
   - Create test device instance
   - Add to registry
   - Save to project.json
   - Verify device appears in file
   - Load project, verify device restored to registry
   - Evidence that auto-versioning works with devices

---

## Independence Statement

This task is fully independent. Does not depend on Workers 1 or 2.

Uses documentation created by Worker 3 in P1 cycle.

---

## First Action Hints

1. Read the interface specifications:
   ```bash
   cat docs/device-system-interfaces.ts | head -100
   ```

2. Check current DataService structure:
   ```bash
   grep -A 10 "interface ProjectData" src/services/DataService.ts
   ```

3. Start by creating Device.ts with interfaces:
   ```typescript
   // src/models/Device.ts
   export interface Vector2 {
     x: number;
     y: number;
   }

   export interface Device {
     id: string;
     deviceTypeId: string;
     productId: string;
     name: string;
     position: Vector2;
     rotation: number;
     roomId: string | null;
     layerId: string;
     installationHeight: number;
     networkConnections: string[];
     lcpAssignment: string | null;
     metadata: Record<string, any>;
     createdAt: number;
   }
   // ... DeviceType, Product interfaces
   ```

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Medium - create interfaces, implement registry singleton, integrate with DataService, add tests

---

## MANDATORY COMPLIANCE

Before marking this task complete, you MUST verify:

1. **Build Success:**
   ```bash
   npm run build
   ```
   Output must show 0 errors.

2. **TypeScript Validation:**
   All interfaces compile without errors.
   DeviceRegistry methods have proper types.

3. **Integration Test:**
   Create test device, add to registry, save/load via DataService.
   Verify device persists to project.json.

Include proof of these checks in your result file.

If a check fails: FIX IT. Debug, research, fix. Do not stop until all checks pass.

---

## Reference Documents

- Interface specs: `docs/device-system-interfaces.ts` (PRIMARY SOURCE - copy these interfaces)
- Data model docs: `docs/device-system-data-models.md` (explanations and examples)
- Current DataService: `src/services/DataService.ts`
- Implementation plan: `tickets/device-system-implementation-plan.md` (T-1 section)

---

**Result File:** `tmp/worker/result-worker3-DEV-MODELS-P3.md`

Start NOW.
