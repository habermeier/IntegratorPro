# Compatibility & Data Loss Analysis

## Issue 1: Old Code Compatibility with Pixi Renderer

### Current Setup (USE_PIXI = true):

**Main View:** ✅ Pixi renderer (FloorPlanStage.tsx)
- Renders floor plan images via WebGL
- Rooms, masks, devices rendered as PIXI.Graphics
- Fast, hardware-accelerated

**Magnified Cursor:** ⚠️ **Still uses old DOM/SVG renderer**
- MagnifiedCursor component renders FloorPlanContent (SVG-based)
- This is a **hybrid approach** - works but inconsistent
- Lens shows SVG, main view shows Pixi

### Compatibility Status:

| Component | Old Code Location | Works with Pixi? | Notes |
|-----------|------------------|------------------|-------|
| **MagnifiedCursor** | MagnifiedCursor.tsx | ⚠️ Partial | Renders SVG content, not Pixi |
| **Room Drawing State** | FloorPlanMap.tsx:127 | ✅ Yes | State management is renderer-agnostic |
| **Click Handlers** | FloorPlanMap.tsx:1330-1402 | ⚠️ Needs porting | Works on DOM, need Pixi event system |
| **Coordinate Math** | containerPosToImageCoords() | ✅ Yes | Math is the same |
| **Room Rendering** | FloorPlanContent.tsx | ❌ No | Uses SVG `<polygon>`, need PIXI.Graphics |
| **Point-in-Polygon** | FloorPlanMap.tsx:310 | ✅ Yes | Algorithm is renderer-agnostic |

### What Needs Porting:

1. **MagnifiedCursor Rendering** - Replace SVG content with Pixi viewport
2. **Room/Mask Drawing Visual** - Replace SVG polygons with PIXI.Graphics
3. **Click Event Handlers** - Attach to Pixi viewport instead of DOM

### What Can Be Reused:

1. ✅ All state management (roomDrawing, maskDrawing, etc.)
2. ✅ Coordinate conversion math
3. ✅ Point-in-polygon algorithm
4. ✅ Snap-to-close logic
5. ✅ Keyboard shortcuts
6. ✅ Auto-save logic (after fixing the bug below!)

---

## Issue 2: DATA LOSS BUG - CRITICAL! 🚨

### Root Cause Found:

**Location:** `components/FloorPlanMap.tsx`

**The Bug:**

```javascript
// Line 1081-1100 - BASE MASKS (NO GUARD!)
useEffect(() => {
    const timer = setTimeout(() => {
        fetch('/api/base-masks', {
            method: 'POST',
            body: JSON.stringify({ masks: overlayMasks }), // ← Saves empty array on mount!
        });
    }, 500);
    return () => clearTimeout(timer);
}, [overlayMasks]); // ← Runs IMMEDIATELY on mount

// Line 1179-1208 - DALI DEVICES (NO GUARD!)
useEffect(() => {
    const timer = setTimeout(() => {
        fetch('/api/dali-devices', {
            method: 'POST',
            body: JSON.stringify({ devices: daliDevices }), // ← Saves empty array on mount!
        });
    }, 500);
    return () => clearTimeout(timer);
}, [daliDevices]); // ← Runs IMMEDIATELY on mount
```

**Compare to ROOMS (HAS GUARD):**

```javascript
// Line 1118-1146 - ROOMS (PROTECTED!)
useEffect(() => {
    // Skip save on initial mount
    if (!roomsMountedRef.current) {
        roomsMountedRef.current = true;
        return; // ← Doesn't save on mount!
    }

    const timer = setTimeout(() => {
        fetch('/api/rooms', {
            method: 'POST',
            body: JSON.stringify({ rooms }),
        });
    }, 500);
    return () => clearTimeout(timer);
}, [rooms]);
```

### What Happened to Your Data:

1. ✅ You created hours of mask/device data
2. ✅ Data saved to `baseMasks.local.json` and `daliDevices.local.json`
3. 💥 Page refreshed (or browser restarted)
4. 💥 Component mounted with `overlayMasks = []` and `daliDevices = []`
5. 💥 After 500ms, auto-save wrote empty arrays to files
6. 💥 **All your work was overwritten**

Rooms survived because they have the mounted guard!

---

## Fix: Add Mounted Guards

### Apply This Fix NOW:

```javascript
// At top of component with other refs (around line 127)
const masksMountedRef = useRef(false);
const devicesMountedRef = useRef(false);

// Fix masks save (line 1081)
useEffect(() => {
    // Skip save on initial mount
    if (!masksMountedRef.current) {
        masksMountedRef.current = true;
        return;
    }

    const timer = setTimeout(() => {
        fetch('/api/base-masks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ masks: overlayMasks }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log('Base masks saved to server');
            }
        });
    }, 500);
    return () => clearTimeout(timer);
}, [overlayMasks]);

// Fix devices save (line 1179)
useEffect(() => {
    // Skip save on initial mount
    if (!devicesMountedRef.current) {
        devicesMountedRef.current = true;
        return;
    }

    const timer = setTimeout(() => {
        fetch('/api/dali-devices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: daliDevices }),
        })
        .then(res => {
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data && data.success) {
                console.log('DALI devices saved to server successfully');
            }
        });
    }, 500);
    return () => clearTimeout(timer);
}, [daliDevices]);
```

---

## Additional Data Protection Strategies

### 1. Commit .local.json Files to Git

**Current:** `.gitignore` excludes all `.local.json` files

**Problem:** Your data never gets version controlled

**Solution:** Remove from `.gitignore` or create manual backups

```bash
# Option A: Remove from .gitignore
# Edit .gitignore, remove these lines:
# baseMasks.local.json
# rooms.local.json
# daliDevices.local.json

# Option B: Manual backup command
cp baseMasks.local.json baseMasks.backup.json
cp rooms.local.json rooms.backup.json
cp daliDevices.local.json daliDevices.backup.json
git add *.backup.json
git commit -m "Backup floor plan data"
```

### 2. Add Export/Import Buttons

Create UI buttons to download/upload all data as JSON:

```typescript
// Export all data
const exportAllData = () => {
    const backup = {
        rooms,
        overlayMasks,
        daliDevices,
        electricalOverlay,
        timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floorplan-backup-${Date.now()}.json`;
    a.click();
};

// Import from file
const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const backup = JSON.parse(e.target?.result as string);
        setRooms(backup.rooms || []);
        setOverlayMasks(backup.overlayMasks || []);
        setDaliDevices(backup.daliDevices || []);
        setElectricalOverlay(backup.electricalOverlay || {});
    };
    reader.readAsText(file);
};
```

### 3. Browser localStorage Backup

Add periodic localStorage backup as failsafe:

```typescript
useEffect(() => {
    const interval = setInterval(() => {
        localStorage.setItem('floorplan-backup', JSON.stringify({
            rooms,
            overlayMasks,
            daliDevices,
            timestamp: Date.now(),
        }));
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
}, [rooms, overlayMasks, daliDevices]);
```

### 4. Warning on Empty Data

Add console warning when loading empty data:

```typescript
// In load useEffect
.then(data => {
    if (data && data.masks) {
        if (data.masks.length === 0) {
            console.warn('⚠️ Loaded 0 masks - this might indicate data loss!');
        }
        setOverlayMasks(data.masks);
    }
});
```

---

## Recovery: Can You Get Your Data Back?

### Check These Locations:

1. **Windows Chrome** - If you did the work there:
   - localStorage: `localStorage.getItem('floorplan-backup')`
   - .local.json files in Windows project folder

2. **Browser History/Cache** - Unlikely but possible:
   - Check browser dev tools → Application → Storage

3. **Git Reflog** - If data was ever committed:
   ```bash
   git log --all --full-history -- baseMasks.local.json
   ```

4. **File System Backups** - If you have Time Machine, etc.:
   - Look for `.local.json` files from before Dec 16 20:03

---

## Immediate Action Plan

1. **✅ FIRST:** Apply the mounted guard fix to prevent future data loss
2. **✅ SECOND:** Build and test that empty arrays don't get saved on mount
3. **✅ THIRD:** Add export/import buttons for manual backups
4. **✅ FOURTH:** Check Windows Chrome for your lost data
5. **✅ OPTIONAL:** Remove `.local.json` from `.gitignore` to version control data

---

## Summary

**Compatibility:** Old code is partially compatible. State/logic can be reused, but rendering needs porting to Pixi.

**Data Loss:** Critical bug found - masks and devices auto-save on mount without guard. Rooms were protected, which is why they have the guard but masks/devices don't.

**Fix Applied:** Add `masksMountedRef` and `devicesMountedRef` guards.

**Prevention:** Export buttons, localStorage backup, git commits, warnings on empty data.
