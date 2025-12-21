Date: 2025-12-20

# Data Persistence Architecture - Analysis & Recommendation

## Current State

### **Existing API Endpoints** (server.js)

**Individual Endpoints:**
1. `/api/layout` - Floor plan layout data (modules)
2. `/api/scale` - Scale calibration factor
3. `/api/electrical-overlay` - Electrical overlay data
4. `/api/settings` - Application settings
5. `/api/polygons` - Room/mask polygons (uses createDataEndpoints helper)
6. `/api/dali-devices` - DALI device data (uses createDataEndpoints helper)

**Proposed (from other AI):**
7. `/api/furniture` - Furniture placement data

### **Current Pattern:**

```javascript
function createDataEndpoints(apiPath, baseFile, overrideFile, dataKey, displayName) {
    // GET: Read from override if exists, otherwise base
    app.get(apiPath, ...);

    // POST: Write to base (DEV) or override (PROD)
    app.post(apiPath, ...);
}
```

**File Strategy:**
- **Base files:** `layout.json`, `scale.json`, `polygons.json` (committed to git)
- **Override files:** `layout.local.json`, `scale.local.json`, `polygons.local.json` (gitignored)
- **DEV mode:** Writes to base files (committed with source)
- **PROD mode:** Writes to override files (local only)

**Data Structure (per endpoint):**
```json
// polygons.json
{
  "polygons": [...]
}

// scale.json
{
  "scaleFactor": 123.45
}

// dali-devices.json
{
  "devices": [...]
}
```

---

## The Problem

### **Current Issues:**

1. **Data fragmentation** - Project data spread across 7+ separate files
2. **No atomic saves** - Saving furniture doesn't save devices (consistency risk)
3. **No versioning** - Can't rollback to "2 hours ago" state
4. **Proliferation of endpoints** - Adding devices, cables, LCPs, etc. = 10+ more endpoints
5. **Client complexity** - Must call multiple APIs, manage multiple save states
6. **No project concept** - Data is global, not project-scoped (can't have "270 Boll Ave" vs "Client B")

### **Future Requirements (from design decisions):**

- **Single project blob** with versioning (.history folder)
- **Atomic saves** - all data or none
- **Multi-project support** - different client projects
- **Easy backup/restore** - one file to save/load
- **Version history** - rollback capability

---

## Option A: Continue Current Pattern (Multiple Endpoints)

### **Implementation:**
```
/api/layout          → layout.json
/api/scale           → scale.json
/api/polygons        → polygons.json
/api/furniture       → furniture.json
/api/devices         → devices.json
/api/cables          → cables.json
/api/lcps            → lcps.json
/api/settings        → settings.json
...
```

### **Pros:**
- ✅ Minimal code changes (incremental)
- ✅ Familiar pattern to current codebase
- ✅ Granular saves (only save what changed)
- ✅ Easy to add new endpoints (use createDataEndpoints helper)

### **Cons:**
- ❌ No atomic saves (data consistency issues)
- ❌ No versioning (can't rollback)
- ❌ No project concept (all data global)
- ❌ Client must call 7+ APIs on load
- ❌ Client must track "dirty" state per data type
- ❌ Endpoint proliferation (10+ endpoints eventually)
- ❌ Hard to implement multi-project support later
- ❌ No single "export project" capability

---

## Option B: Monolithic Project Endpoint (RECOMMENDED)

### **Implementation:**
```
/api/project         → projects/270-boll-ave/project.json
/api/project/history → projects/270-boll-ave/.history/
```

**Single Project File:**
```json
{
  "version": "1.0",
  "timestamp": "2025-12-20T15:30:00Z",
  "metadata": {
    "name": "270 Boll Ave",
    "status": "Draft",
    "created": "2025-12-15T10:00:00Z",
    "modified": "2025-12-20T15:30:00Z"
  },
  "floorPlan": {
    "scale": { "pixelsPerMeter": 123.45 },
    "layout": { /* modules */ },
    "polygons": [/* rooms, masks */],
    "electricalOverlay": { /* overlay data */ }
  },
  "furniture": [/* all furniture */],
  "devices": [/* all devices */],
  "cables": [/* all cable routes */],
  "lcps": [/* LCP configs */],
  "settings": {
    "units": "IMPERIAL",
    "ceilingHeight": 2.9,
    "switchHeight": 1.2,
    /* ... */
  }
}
```

**Server Endpoints:**
```javascript
// GET /api/project/:projectId
app.get('/api/project/:projectId', (req, res) => {
  const projectFile = `projects/${req.params.projectId}/project.json`;
  const data = fs.readFileSync(projectFile, 'utf8');
  res.json(JSON.parse(data));
});

// POST /api/project/:projectId
app.post('/api/project/:projectId', (req, res) => {
  const projectDir = `projects/${req.params.projectId}`;
  const projectFile = `${projectDir}/project.json`;
  const historyDir = `${projectDir}/.history`;

  // 1. Save current to history
  if (fs.existsSync(projectFile)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyFile = `${historyDir}/project-${timestamp}.json`;
    fs.copyFileSync(projectFile, historyFile);
  }

  // 2. Write new project file
  const projectData = {
    ...req.body,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(projectFile, JSON.stringify(projectData, null, 2));

  res.json({ success: true, savedTo: projectFile });
});

// GET /api/project/:projectId/history
app.get('/api/project/:projectId/history', (req, res) => {
  const historyDir = `projects/${req.params.projectId}/.history`;
  const files = fs.readdirSync(historyDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      filename: f,
      timestamp: extractTimestamp(f),
      size: fs.statSync(`${historyDir}/${f}`).size
    }));
  res.json({ versions: files });
});

// GET /api/project/:projectId/history/:version
app.get('/api/project/:projectId/history/:version', (req, res) => {
  const historyFile = `projects/${req.params.projectId}/.history/${req.params.version}`;
  const data = fs.readFileSync(historyFile, 'utf8');
  res.json(JSON.parse(data));
});

// GET /api/projects (list all projects)
app.get('/api/projects', (req, res) => {
  const projects = fs.readdirSync('projects')
    .filter(dir => fs.existsSync(`projects/${dir}/project.json`))
    .map(dir => {
      const data = JSON.parse(fs.readFileSync(`projects/${dir}/project.json`, 'utf8'));
      return {
        id: dir,
        name: data.metadata.name,
        status: data.metadata.status,
        modified: data.timestamp
      };
    });
  res.json({ projects });
});
```

### **Pros:**
- ✅ **Atomic saves** - all data saved together (consistency guaranteed)
- ✅ **Versioning built-in** - automatic history on every save
- ✅ **Multi-project support** - natural project structure
- ✅ **Simple client code** - one GET, one POST
- ✅ **Easy backup/restore** - copy one file
- ✅ **Easy export** - download project.json
- ✅ **Git-friendly** - can diff entire project state
- ✅ **Rollback capability** - load from history
- ✅ **Future-proof** - easy to migrate to database (keep same JSON structure)

### **Cons:**
- ⚠️ **Larger payloads** - sending entire project on every save (mitigated: gzip, only ~100KB-1MB)
- ⚠️ **Migration required** - need to consolidate existing data
- ⚠️ **Save conflicts** - if future multi-user (mitigated: not in scope)

---

## Option C: Hybrid - Client Abstraction Layer

### **Implementation:**

**Client-side DataService (abstraction):**
```typescript
// services/DataService.ts

interface ProjectData {
  floorPlan: { scale, layout, polygons, electricalOverlay };
  furniture: Furniture[];
  devices: Device[];
  cables: CableRoute[];
  lcps: LCP[];
  settings: Settings;
}

class DataService {
  private projectId: string = '270-boll-ave';
  private cache: ProjectData | null = null;

  // Load entire project
  async loadProject(): Promise<ProjectData> {
    // Option B: Single endpoint
    const response = await fetch(`/api/project/${this.projectId}`);
    this.cache = await response.json();
    return this.cache;

    /* Option A fallback (if not migrated yet):
    const [scale, layout, polygons, furniture, devices, ...] = await Promise.all([
      fetch('/api/scale').then(r => r.json()),
      fetch('/api/layout').then(r => r.json()),
      fetch('/api/polygons').then(r => r.json()),
      fetch('/api/furniture').then(r => r.json()),
      fetch('/api/devices').then(r => r.json()),
      ...
    ]);
    this.cache = { floorPlan: { scale, layout, polygons }, furniture, devices, ... };
    return this.cache;
    */
  }

  // Save entire project
  async saveProject(data: ProjectData): Promise<void> {
    // Option B: Single endpoint
    await fetch(`/api/project/${this.projectId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    this.cache = data;

    /* Option A fallback (if not migrated yet):
    await Promise.all([
      fetch('/api/scale', { method: 'POST', body: JSON.stringify(data.floorPlan.scale) }),
      fetch('/api/layout', { method: 'POST', body: JSON.stringify(data.floorPlan.layout) }),
      fetch('/api/polygons', { method: 'POST', body: JSON.stringify({ polygons: data.floorPlan.polygons }) }),
      fetch('/api/furniture', { method: 'POST', body: JSON.stringify({ furniture: data.furniture }) }),
      ...
    ]);
    */
  }

  // Granular update (convenience method)
  async updateFurniture(furniture: Furniture[]): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.furniture = furniture;
    await this.saveProject(this.cache!);
  }

  async updateDevices(devices: Device[]): Promise<void> {
    if (!this.cache) await this.loadProject();
    this.cache!.devices = devices;
    await this.saveProject(this.cache!);
  }

  // ... other convenience methods
}

export const dataService = new DataService();
```

**Client Components Use DataService:**
```typescript
// FloorPlanRenderer.tsx
const project = await dataService.loadProject();
setFurniture(project.furniture);
setDevices(project.devices);

// Later...
await dataService.updateFurniture(newFurniture);
// Internally saves entire project, not just furniture
```

### **Pros:**
- ✅ **Client code agnostic** - doesn't know/care about backend structure
- ✅ **Easy migration** - can switch from Option A → B without changing components
- ✅ **Granular convenience methods** - updateFurniture() while internally saving all
- ✅ **Caching** - in-memory cache reduces API calls
- ✅ **Future-proof** - can swap backend to database later

### **Cons:**
- ⚠️ **Extra abstraction layer** - more code
- ⚠️ **Still needs Option A or B** - abstraction doesn't solve underlying problem

---

## Recommendation: **Option B + C (Monolithic Project with Client Abstraction)**

### **Why:**

1. **Meets design requirements:**
   - ✅ Single project blob with versioning
   - ✅ Atomic saves
   - ✅ Multi-project support
   - ✅ Rollback capability

2. **Future-proof:**
   - Easy to migrate to database (same JSON structure)
   - Client abstraction makes backend swappable

3. **Clean architecture:**
   - Server: Simple project CRUD
   - Client: Abstraction layer hides complexity
   - Components: Just call dataService methods

4. **Manageable migration:**
   - Create DataService abstraction first (works with current endpoints)
   - Migrate server to monolithic endpoint
   - Update DataService implementation
   - Components unchanged

---

## Migration Plan

### **Phase 1: Create Client Abstraction (No Breaking Changes)**

**Create `services/DataService.ts`:**
- Implements loadProject() and saveProject()
- Initially uses existing endpoints (Option A pattern)
- Replace direct fetch() calls in components with dataService calls

**Files to Update:**
- FloorPlanRenderer.tsx
- (Any other components using API directly)

**Result:** Client code uses abstraction, but backend unchanged

---

### **Phase 2: Consolidate Server to Monolithic Pattern**

**Server Changes:**
1. Create `/projects/270-boll-ave/` directory
2. Migrate existing data:
   ```javascript
   // scripts/migrate-to-project.js
   const project = {
     version: "1.0",
     timestamp: new Date().toISOString(),
     metadata: { name: "270 Boll Ave", status: "Draft" },
     floorPlan: {
       scale: require('./scale.json'),
       layout: require('./layout.json'),
       polygons: require('./polygons.json').polygons,
       electricalOverlay: require('./electrical-overlay.json')
     },
     furniture: [],  // Future
     devices: [],    // Future
     cables: [],     // Future
     lcps: [],       // Future
     settings: require('./settings.json')
   };
   fs.writeFileSync('projects/270-boll-ave/project.json', JSON.stringify(project, null, 2));
   ```

3. Add new endpoints:
   - `GET /api/project/:projectId`
   - `POST /api/project/:projectId`
   - `GET /api/project/:projectId/history`
   - `GET /api/projects`

4. Keep old endpoints for backward compat (optional, remove later)

**DataService Update:**
```typescript
async loadProject(): Promise<ProjectData> {
  // NEW: Use monolithic endpoint
  const response = await fetch(`/api/project/${this.projectId}`);
  this.cache = await response.json();
  return this.cache;
}
```

**Result:** Single JSON file, versioning works, client code unchanged

---

### **Phase 3: Add New Features (Devices, Cables, etc.)**

Now adding devices/cables is trivial:
- Add to ProjectData interface
- No new endpoints needed
- Auto-saved with project
- Auto-versioned

---

## File Structure (Final State)

```
IntegratorPro/
├── projects/
│   ├── 270-boll-ave/
│   │   ├── project.json                    ← Current state
│   │   └── .history/
│   │       ├── project-2025-12-20-153000.json
│   │       ├── project-2025-12-20-143000.json
│   │       └── project-2025-12-19-170000.json
│   ├── client-b-office/
│   │   ├── project.json
│   │   └── .history/
│   │       └── ...
│   └── ...
├── server.js                               ← Monolithic endpoints
├── services/
│   └── DataService.ts                      ← Client abstraction
└── components/
    └── FloorPlanRenderer.tsx               ← Uses DataService
```

---

## Client Component Pattern

**Before (direct API calls):**
```typescript
// FloorPlanRenderer.tsx
const loadPolygons = async () => {
  const response = await fetch('/api/polygons');
  const data = await response.json();
  setPolygons(data.polygons);
};

const savePolygons = async () => {
  await fetch('/api/polygons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ polygons })
  });
};
```

**After (using DataService):**
```typescript
// FloorPlanRenderer.tsx
import { dataService } from '../services/DataService';

const loadProject = async () => {
  const project = await dataService.loadProject();
  setPolygons(project.floorPlan.polygons);
  setFurniture(project.furniture);
  setDevices(project.devices);
  // ... all data loaded in one call
};

const savePolygons = async (newPolygons) => {
  await dataService.updatePolygons(newPolygons);
  // Internally saves entire project with versioning
};
```

---

## Decision Needed

**Question for Bernie:**

1. **Adopt Option B + C (Monolithic + Abstraction)?**
   - Creates DataService abstraction layer
   - Migrates to single project.json pattern
   - Enables versioning, multi-project, rollback

2. **Or Continue Option A (Multiple Endpoints)?**
   - Keep adding /api/furniture, /api/devices, etc.
   - Simpler short-term, but doesn't meet design requirements

**My Strong Recommendation: Option B + C**

**Next Steps (if approved):**
1. Document this decision in design-decisions.md
2. Create DataService.ts (works with current endpoints)
3. Update components to use DataService
4. Create migration script for server
5. Update server.js with monolithic pattern
6. All future AIs use DataService (standardized)

**Estimated Effort:**
- Phase 1 (DataService): 2-3 hours
- Phase 2 (Server migration): 1-2 hours
- Phase 3 (New features): Just add to interface, no endpoint work

**Total: ~4-5 hours to future-proof entire data architecture**

---

**What's your decision?**
