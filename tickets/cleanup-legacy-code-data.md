# Cleanup Legacy Code and Data

**Priority:** P3 (Nice to Have - Ongoing)
**Effort:** Small (incremental, 15-30 min per cleanup)
**Type:** Maintenance / Technical Debt

---

## Purpose

This is an **ongoing tracking ticket** for identifying and removing old code, unused files, and deprecated data patterns that accumulate during development. We maintain this list to ensure we don't leave cruft behind, but don't prioritize it over feature work.

---

## Cleanup Checklist

### Data Files

- [ ] **Legacy JSON files from pre-migration** (after verifying project.json works in production)
  - `data/270-boll-ave/polygons.json`
  - `data/270-boll-ave/polygons.local.json`
  - `data/270-boll-ave/scale.json`
  - `data/270-boll-ave/scale.local.json`
  - `data/270-boll-ave/electrical-overlay.json`
  - `data/270-boll-ave/electrical-overlay.local.json`
  - `data/270-boll-ave/layout-module.json`
  - `data/270-boll-ave/layout-module.local.json`
  - **When:** After 1-2 weeks of stable project.json usage
  - **Safety:** Create backup archive before deletion

- [ ] **Old settings files** (if/when migrated to project.json)
  - Check for any orphaned localStorage keys
  - Document which settings should persist vs which are stale

### Server Endpoints

- [ ] **Deprecated individual data endpoints** (after confirming no usage)
  - `/api/270-boll-ave/polygons` (GET/POST)
  - `/api/270-boll-ave/scale` (GET/POST)
  - `/api/270-boll-ave/electrical-overlay` (GET/POST)
  - `/api/270-boll-ave/layout-module` (GET/POST)
  - **When:** After all clients migrated to `/api/project/:projectId`
  - **Safety:** Add deprecation warnings first, monitor logs, then remove

### Client Code

- [ ] **Direct fetch() calls** (if any remain)
  - Search for `fetch('/api/270-boll-ave/` patterns
  - Replace with DataService methods
  - **When:** During next component refactor

- [ ] **Unused imports** (accumulate over time)
  - Run `npx ts-prune` to find unused exports
  - Review and remove dead code
  - **When:** Quarterly cleanup

- [ ] **Commented-out code** (if debugging code left behind)
  - Search for large blocks of `//` or `/* */` comments
  - Remove if confirmed unnecessary
  - **When:** Before major releases

### Temporary/Debug Files

- [ ] **tmp/ directory** (worker assignments/results)
  - Review if tmp/ should be git-ignored entirely
  - Archive completed cycle results to docs/history/ or delete
  - **When:** End of each cycle

- [ ] **Debug console.logs** (excessive logging)
  - Search for `console.log` in production code
  - Remove or gate behind DEBUG flag
  - **When:** Before production deployment

### Documentation

- [ ] **Outdated tickets** (completed or obsolete)
  - Move completed tickets to `tickets/archive/`
  - Remove tickets made obsolete by design changes
  - **When:** Monthly review

- [ ] **Stale TODO comments** in code
  - Search for `// TODO` and `// FIXME`
  - Convert to tickets or resolve
  - **When:** Quarterly cleanup

---

## Process

When adding items to this list:
1. Add checkbox item with clear description
2. Note **when** it should be cleaned up (timing/trigger)
3. Note **safety** considerations (backups, deprecation warnings, etc.)
4. Include file paths or code patterns to search for

When cleaning up items:
1. Check the item off
2. Note what was removed in commit message
3. Archive or delete (depending on item)

---

## Current Priority Items (From Recent Work)

### High Priority (Next 1-2 Weeks)

- [ ] **Verify legacy data files can be deleted**
  - Test project.json thoroughly in production
  - Create backup: `tar -czf data-legacy-backup-$(date +%Y%m%d).tar.gz data/270-boll-ave/*.json`
  - Delete old JSON files
  - Update migration script to note files are deprecated

### Medium Priority (Next Month)

- [ ] **Remove old server endpoints** (after monitoring confirms no usage)
  - Add deprecation warnings to old endpoints
  - Monitor server logs for 1 week
  - If zero hits, remove endpoints
  - Update server.js comments

### Low Priority (Next Quarter)

- [ ] **Review tmp/ directory structure**
  - Decide if worker assignments/results should be archived or ignored
  - Update .gitignore if needed
  - Create archival process if keeping history

---

## Notes

- This is an **evergreen ticket** - never closes, just accumulates and clears items
- Balance cleanup against feature velocity - don't let this block progress
- Some legacy code should stay during transition periods (deprecate gracefully)
- Document why things were removed (commit messages) in case we need to understand later

---

**Last Updated:** 2025-12-21
**Items Completed:** 0
**Items Pending:** 15+
