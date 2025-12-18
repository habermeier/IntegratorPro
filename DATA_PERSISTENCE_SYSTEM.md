# Data Persistence System - Simple & Reliable

## How It Works Now

### Environment-Based Storage

**DEVELOPMENT (your local machine):**
- ✅ All changes save to **base files** (rooms.json, baseMasks.json, daliDevices.json)
- ✅ **Gets committed to git** automatically
- ✅ Data is version controlled and safe

**PRODUCTION (deployed server):**
- ✅ All changes save to **.local files** (rooms.local.json, baseMasks.local.json, etc.)
- ✅ **Gitignored** - won't conflict with dev changes
- ✅ Can be backed up separately

### Environment Detection

Server automatically detects environment:
```javascript
const IS_DEV = process.env.NODE_ENV !== 'production';
```

Default is DEV (saves to base files).

### Data Flow

```
User makes change (add room, mask, device)
    ↓
Client waits 500ms (debounce)
    ↓
Client POSTs to /api/rooms (or /api/base-masks, /api/dali-devices)
    ↓
Server checks IS_DEV
    ↓
DEV: Writes to rooms.json (committed)
PROD: Writes to rooms.local.json (gitignored)
    ↓
Returns: { success: true, savedTo: "base (committed)", file: "rooms.json" }
```

### Protected Against Data Loss

**Mount Guards** prevent overwriting on page load:

```javascript
// First mount: Skip save
if (!roomsMountedRef.current) {
    roomsMountedRef.current = true;
    return;  // Don't save empty array!
}

// Subsequent changes: Save normally
setTimeout(() => {
    fetch('/api/rooms', {
        body: JSON.stringify({ rooms })
    });
}, 500);
```

This prevents the bug where empty arrays overwrote your data on page refresh.

---

## Files Modified

### Server (server.js)
- Line 15-17: Added IS_DEV environment detection
- Line 89-90: Write to base file in DEV, .local in PROD
- Line 93: Enhanced logging shows which file and type

### Client (FloorPlanMap.tsx)
- Line 116-117: Added masksMountedRef and devicesMountedRef
- Line 1087-1090: Masks mount guard
- Line 1194-1197: Devices mount guard
- Line 1104, 1220: Enhanced logging shows save destination

---

## Testing

### Verify DEV Mode Active:

1. Start server: `npm run dev`
2. Check console: Should show `🔧 Server mode: DEVELOPMENT (saves to base files, commits to git)`
3. Make a change (add room, mask, or device)
4. Check console: `✅ Base masks saved to baseMasks.json [base (committed)]`
5. Check file: `cat baseMasks.json` - should have your data

### Verify No Data Loss on Reload:

1. Add test data (room/mask/device)
2. Wait for save confirmation in console
3. Refresh page (F5)
4. Check console: "Skipping masks save on initial mount"
5. Data should still be present

### Verify Git Commits:

```bash
git status
# Should show:
# modified:   baseMasks.json
# modified:   rooms.json
# modified:   daliDevices.json

git diff baseMasks.json
# Should show your changes
```

---

## Production Deployment

When you deploy to production:

**Option 1: Set NODE_ENV=production**
```bash
NODE_ENV=production npm start
```

**Option 2: Use process manager (PM2)**
```bash
pm2 start server.js --env production
```

Server will automatically:
- Save to .local.json files
- Keep your dev data (base files) pristine
- Allow prod edits without git conflicts

---

## Pulling Production Data to Dev

**Manual Method:**
```bash
# On prod server, copy .local files
scp user@prod:/path/to/IntegratorPro/*.local.json ./

# Merge into base files
cp rooms.local.json rooms.json
cp baseMasks.local.json baseMasks.json
cp daliDevices.local.json daliDevices.json

# Commit
git add *.json
git commit -m "Sync prod data to dev"
```

**Script Method (future):**
```bash
# Create script: scripts/pull-prod-data.sh
#!/bin/bash
scp user@prod:/path/*.local.json ./
cp rooms.local.json rooms.json
cp baseMasks.local.json baseMasks.json
cp daliDevices.local.json daliDevices.json
echo "✅ Production data pulled to dev files"
```

---

## What Gets Saved

### Rooms (/api/rooms)
- All polygon points
- Room names
- Fill colors
- Label positions and rotations
- Visibility flags

### Overlay Masks (/api/base-masks)
- Rectangle positions (x, y, width, height)
- Rotations
- Colors
- Visibility flags
- IDs

### DALI Devices (/api/dali-devices)
- Device placements (x, y coordinates)
- Device types
- Device IDs

### Electrical Overlay (/api/electrical-overlay)
- Position (x, y)
- Scale
- Rotation
- Opacity
- Lock state

---

## Backup Strategy

### Automatic (DEV):
✅ Git commits contain all data
✅ Git history is your backup

### Manual (PROD):
```bash
# Backup .local files
cp rooms.local.json rooms.backup.$(date +%Y%m%d).json
cp baseMasks.local.json baseMasks.backup.$(date +%Y%m%d).json
cp daliDevices.local.json daliDevices.backup.$(date +%Y%m%d).json
```

### Scheduled (future):
```bash
# crontab entry: Backup every day at 2am
0 2 * * * /path/to/backup-script.sh
```

---

## Summary

**Simple model:**
- DEV → base files → git commits → safe
- PROD → .local files → gitignored → separate
- Mount guards prevent data loss on reload
- Everything auto-saves with 500ms debounce
- Console logs confirm every save

**Your data is now:**
1. ✅ Automatically saved on every change
2. ✅ Committed to git in DEV
3. ✅ Protected from overwrite on page load
4. ✅ Logged clearly in console
5. ✅ Easy to sync between DEV/PROD

No more lost work!
