# Add DataService Cache Management and Invalidation

**Priority:** P2 (Should Fix Soon)
**Effort:** Small (2-3 hours)
**Dependencies:** None (builds on Worker 1's DATA-ARCH-P1)
**Origin:** Worker 1 FESH Report (DATA-ARCH-P1)

---

## Problem

The DataService uses an in-memory cache (singleton pattern) that persists across component mounts/unmounts. This creates two risks:

1. **Stale Data:** If FloorPlanRenderer unmounts and remounts, it may use cached data instead of reloading from disk, missing changes made by other processes or manual file edits.

2. **Concurrent Editing:** If multiple tabs/windows are open, or if external changes occur (manual file edit, git pull), the cache becomes stale with no invalidation mechanism.

**Current Implementation:**
```typescript
class DataService {
  private static cache: ProjectData | null = null;

  async loadProject(projectId?: string): Promise<ProjectData> {
    if (this.cache) {
      return this.cache;  // ← Always returns cache if present
    }
    // ... fetch from server
  }
}
```

**Risk Scenarios:**
- User opens project in Tab A
- User opens same project in Tab B
- User makes changes in Tab B and saves
- Tab A cache is now stale (missing Tab B's changes)
- User makes changes in Tab A and saves
- Tab B's changes are overwritten

---

## Solution

Implement cache invalidation with the following strategies:

### 1. Cross-Tab Synchronization
Use `storage` events to detect changes from other tabs:

```typescript
window.addEventListener('storage', (e) => {
  if (e.key === 'integrator-pro-project-version') {
    DataService.clearCache();
    // Optionally: trigger reload in active components
  }
});
```

### 2. Cache TTL (Time-To-Live)
Add timestamp-based expiration:

```typescript
private static cacheTimestamp: number | null = null;
private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async loadProject(projectId?: string): Promise<ProjectData> {
  const now = Date.now();
  if (this.cache && this.cacheTimestamp && (now - this.cacheTimestamp < this.CACHE_TTL)) {
    return this.cache;
  }
  // Reload from server
}
```

### 3. Version-Based Invalidation
Server returns version/timestamp, client compares:

```typescript
async loadProject(projectId?: string, forceReload = false): Promise<ProjectData> {
  if (!forceReload && this.cache) {
    // Quick check: has server version changed?
    const serverVersion = await this.getProjectVersion(projectId);
    if (serverVersion === this.cacheVersion) {
      return this.cache;
    }
  }
  // Reload from server
}
```

### 4. Manual Invalidation API
Expose clearCache() for explicit invalidation:

```typescript
// Already exists, but not called anywhere
static clearCache(): void {
  this.cache = null;
  this.cacheTimestamp = null;
  this.cacheVersion = null;
}
```

---

## Recommended Implementation

**Hybrid Approach (Strategies 1 + 2 + 4):**

1. **Add TTL** (5-minute default) to prevent stale cache in single-tab scenarios
2. **Add cross-tab sync** via storage events for multi-tab scenarios
3. **Expose forceReload parameter** for explicit cache bypass
4. **Keep manual clearCache()** for programmatic invalidation

**Code Changes:**

```typescript
// services/DataService.ts
class DataService {
  private static cache: ProjectData | null = null;
  private static cacheTimestamp: number | null = null;
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Listen for cross-tab changes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.onStorageChange);
    }
  }

  private onStorageChange = (e: StorageEvent): void => {
    if (e.key === 'integrator-pro-last-save') {
      console.log('[DataService] Detected external change, clearing cache');
      DataService.clearCache();
      // Dispatch event for components to reload
      window.dispatchEvent(new CustomEvent('project-data-changed'));
    }
  };

  async loadProject(projectId?: string, forceReload = false): Promise<ProjectData> {
    const now = Date.now();
    const cacheValid = this.cache &&
                       this.cacheTimestamp &&
                       (now - this.cacheTimestamp < this.CACHE_TTL);

    if (!forceReload && cacheValid) {
      console.log('[DataService] Using cached project data');
      return this.cache;
    }

    console.log('[DataService] Loading project from server');
    // ... existing fetch logic ...
    this.cache = data;
    this.cacheTimestamp = now;
    return data;
  }

  async saveProject(data: ProjectData): Promise<void> {
    // ... existing save logic ...
    // Update localStorage to notify other tabs
    localStorage.setItem('integrator-pro-last-save', Date.now().toString());
    // Update cache
    this.cache = data;
    this.cacheTimestamp = Date.now();
  }

  static clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = null;
  }
}
```

**FloorPlanRenderer.tsx Changes:**

```typescript
useEffect(() => {
  // Listen for cross-tab changes
  const handleProjectChange = () => {
    console.log('[FloorPlanRenderer] Reloading due to external change');
    loadProjectData();
  };

  window.addEventListener('project-data-changed', handleProjectChange);
  return () => window.removeEventListener('project-data-changed', handleProjectChange);
}, []);

const loadProjectData = async () => {
  const data = await dataService.loadProject('270-boll-ave', false);
  // ... update state ...
};
```

---

## Acceptance Criteria

- [ ] Cache expires after 5 minutes (TTL implemented)
- [ ] Changes in one tab trigger reload in other tabs (cross-tab sync works)
- [ ] localStorage key 'integrator-pro-last-save' updated on every save
- [ ] FloorPlanRenderer listens for 'project-data-changed' event and reloads
- [ ] forceReload parameter works in loadProject()
- [ ] clearCache() can be called manually
- [ ] Build passes with 0 TypeScript errors
- [ ] Manual testing: open 2 tabs, save in Tab A, verify Tab B updates

---

## Testing Checklist

1. **Single Tab TTL Test:**
   - Load project (cache populated)
   - Wait 6 minutes
   - Trigger any action that calls loadProject()
   - Verify network request made (cache expired)

2. **Cross-Tab Sync Test:**
   - Open project in Tab A
   - Open same project in Tab B
   - Make change in Tab A and save
   - Verify Tab B detects change and reloads
   - Check console logs for '[DataService] Detected external change'

3. **Force Reload Test:**
   - Load project normally (cache populated)
   - Call loadProject with forceReload=true
   - Verify network request made (cache bypassed)

4. **Manual Invalidation Test:**
   - Load project (cache populated)
   - Call DataService.clearCache()
   - Load project again
   - Verify network request made

5. **No Regressions:**
   - All existing save/load functionality works
   - Polygons, furniture, settings load correctly
   - Auto-versioning still works

---

## References

- Worker 1 FESH Report: tmp/worker/result-worker1-DATA-ARCH-P1.md (lines 126-127)
- MDN Storage Event: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- Current DataService: src/services/DataService.ts

---

## Notes

- TTL of 5 minutes is configurable - can adjust based on user feedback
- Consider adding setting to disable cache entirely for debugging
- Future enhancement: Server could return ETag/Last-Modified headers for smarter cache validation
- If project switching is added, cache key should include projectId

---

## Alternatives Considered

1. **Disable cache entirely:** Too slow for frequent saves
2. **Server polling:** Wasteful network traffic
3. **WebSocket updates:** Over-engineered for MVP
4. **Service Worker:** Complex, browser compatibility issues

Selected hybrid approach balances performance and correctness.

---

**Status:** Not Started
**Assigned To:** TBD
