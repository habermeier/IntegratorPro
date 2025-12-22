**Task-ID: VISUAL-VER-P2**

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker 4 (Antigravity), beginning Visual Verification Suite"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker 4 - Visual Verification Suite - Complete/Blocked - Duration: [X minutes]"
6. NEVER use "In-Progress" status when submitting - you are either done or blocked

## YOU ARE A SENIOR ENGINEER (with Screenshot Superpowers)

**CRITICAL: Read ~/qbert/roles/antigravity-worker.md for your specialized role protocols!**

You have FULL AUTONOMY to:
- Make technical decisions within assignment scope
- Take screenshots for visual evidence
- Research solutions (web search, docs, experimentation)
- Debug and fix problems independently
- Choose testing approaches

You MUST:
- Complete ALL acceptance criteria (no partial work, no "asking permission")
- Work through problems using web search, documentation, debugging
- Only escalate TRUE blockers (impossible requirements, missing credentials, conflicts)
- Use good judgment: thorough testing, clear visual evidence
- **CHECK servers before restarting** (see Server Management Protocol below)

**SPECIAL CAPABILITIES:**
- You can take screenshots of the application
- You can compare visual states
- You can verify UI/UX behavior visually
- You can test drawing and placement tools interactively

---

## ⚠️ SERVER MANAGEMENT PROTOCOL (CRITICAL)

**DO NOT RESTART SERVERS UNNECESSARILY!**

**BEFORE doing anything, check if servers are already running:**

```bash
# Check API server (port 3001)
curl -s http://localhost:3001/ > /dev/null && echo "API server: running ✓" || echo "API server: NOT running"

# Check website (port 3002)
curl -s http://localhost:3002/ > /dev/null && echo "Web server: running ✓" || echo "Web server: NOT running"
```

**Key facts:**
- **API Server**: Port 3001 (Node.js/Express) - usually already running
- **Website**: Port 3002 (Vite dev server) - usually already running
- **Vite auto-reloads**: Code changes from other workers appear automatically
- **DO NOT restart** unless servers are actually stopped
- **DO NOT open new browser windows** - reuse existing window at http://localhost:3002/

**Only start servers if check shows they're stopped.**

**Include server status check in your result file as proof you didn't restart unnecessarily.**

---

## Context

Phase 1 (P1) delivered furniture placement refinements and data architecture migration. Before proceeding to device system implementation, we need comprehensive visual verification of:
1. Furniture snap-to-wall rotation ('W' key)
2. Arrow key nudging with real-time preview
3. Distance indicators (thickness and labels)
4. Overall floor plan rendering integrity after data migration

This is a VISUAL TESTING assignment - your screenshots and observations are critical evidence.

Reference: `tmp/tech-lead-review-cycle1.md` and P1 worker results

---

## Mission

Conduct comprehensive visual verification and testing of all Phase 1 furniture features and floor plan integrity, documenting findings with screenshots and detailed observations.

---

## Acceptance Criteria

YOU MUST complete ALL of these:

### Visual Testing: Furniture Snap-to-Wall

- [ ] **Test horizontal wall snap**
  - Place furniture near horizontal wall
  - Press 'W' key
  - SCREENSHOT: Before and after snap
  - Verify: Furniture aligns parallel to wall
  - Document: Exact rotation angle logged in console

- [ ] **Test vertical wall snap**
  - Place furniture near vertical wall
  - Press 'W' key
  - SCREENSHOT: Before and after snap
  - Verify: Furniture aligns parallel to wall
  - Document: Exact rotation angle logged in console

- [ ] **Test diagonal wall snap** (if diagonal walls exist in 270-boll-ave)
  - Place furniture near diagonal wall (45°, 135°, etc.)
  - Press 'W' key
  - SCREENSHOT: Before and after snap
  - Verify: Furniture aligns to exact wall angle (not rounded to 90°)
  - Document: Exact rotation angle logged in console
  - **CRITICAL**: If no diagonal walls exist, create one temporarily for testing

- [ ] **Test snap-to-wall visual feedback**
  - Press 'W' near wall
  - SCREENSHOT: Wall flash (capture within 200ms if possible)
  - Verify: Yellow wall highlight appears
  - Document: Flash duration and visibility

- [ ] **Test snap-to-wall toggle**
  - Go to Settings → Floorplan
  - SCREENSHOT: Snap-to-wall toggle (ON state)
  - Turn toggle OFF
  - Return to editor, press 'W' near wall
  - Verify: No rotation occurs
  - Turn toggle ON again
  - Press 'W' near wall
  - Verify: Rotation works again

### Visual Testing: Arrow Key Nudging

- [ ] **Test basic arrow key nudging**
  - Select furniture placement tool
  - Move mouse to position, don't click
  - Press arrow keys (↑↓←→)
  - SCREENSHOT: Furniture preview moving with arrow keys
  - Verify: Preview moves 1" per keypress
  - Verify: Collision detection updates in real-time
  - Verify: Distance annotations update in real-time

- [ ] **Test Shift+arrow (12" increment)**
  - Hold Shift and press arrow keys
  - SCREENSHOT: Larger movement
  - Verify: Furniture moves 12" (1 foot) per keypress
  - Document: Visual difference from normal nudge

- [ ] **Test Ctrl+arrow (0.1" increment)**
  - Hold Ctrl and press arrow keys
  - SCREENSHOT: Fine adjustment
  - Verify: Furniture moves 0.1" per keypress
  - Document: Precision control visible

### Visual Testing: Distance Indicators

- [ ] **Test furniture-to-furniture distance lines**
  - Place 3+ furniture items near each other (<200 units)
  - SCREENSHOT: Green dashed lines between furniture
  - Verify: Lines appear green and dashed
  - Verify: Lines appear 2px thick (or as thick as browser supports)
  - Verify: Distance labels appear at midpoint of lines
  - Document: Label format (e.g., "5' 3\"" or "1.60 m")

- [ ] **Test wall-to-furniture distance lines**
  - Place furniture near walls (<18")
  - SCREENSHOT: Blue solid lines to walls
  - Verify: Lines appear blue and solid (not dashed)
  - Verify: Red color if <18" (too close)
  - Verify: Distance labels appear

- [ ] **Test distance indicator zoom behavior**
  - Zoom in significantly
  - SCREENSHOT: Distance lines at high zoom
  - Zoom out significantly
  - SCREENSHOT: Distance lines at low zoom
  - Verify: Lines scale appropriately with zoom
  - Document: Line visibility at different zoom levels

### Visual Testing: Floor Plan Integrity

- [ ] **Test polygon rendering** (after data migration)
  - Open http://localhost:3002/
  - SCREENSHOT: Full floor plan view
  - Verify: All 119 polygons render correctly
  - Verify: No missing rooms or walls
  - Verify: No visual artifacts or corruption
  - Compare: Visual appearance matches pre-migration state (if you saw it)

- [ ] **Test scale accuracy** (after data migration)
  - Use measure tool or scale ruler
  - SCREENSHOT: Measurement of known dimension
  - Verify: Scale factor correct (19.795... pixels per meter)
  - Document: Measurement accuracy

- [ ] **Test room labels and masks**
  - SCREENSHOT: Room labels visible
  - Verify: All room labels appear correctly
  - Verify: Room masks render without issues

### Cross-Browser Visual Verification

- [ ] **Test on Chrome**
  - Run all above tests in Chrome
  - Document: Chrome version
  - SCREENSHOTS: Key features in Chrome

- [ ] **Test on Firefox** (if possible)
  - Run critical tests in Firefox
  - Document: Firefox version
  - SCREENSHOTS: Key features in Firefox
  - Note: WebGL line thickness differences between browsers

### Regression Testing

- [ ] **Test existing features** still work
  - 'R' key rotation: SCREENSHOT and verify
  - Collision detection: SCREENSHOT red preview when colliding
  - Manual furniture placement: Click to place, verify it works
  - Furniture selection: Click existing furniture, verify selection

---

## Deliverables

1. **Visual Testing Report** in result file:
   - All screenshots embedded or referenced
   - Detailed observations for each test scenario
   - Any visual bugs or issues discovered
   - Browser compatibility notes
   - Performance observations (lag, rendering issues)

2. **Screenshot Collection**:
   - Save screenshots with descriptive names
   - Include in tmp/ or reference cloud storage links
   - Minimum 15 screenshots covering all test scenarios

3. **Bug Report** (if any visual issues found):
   - Clear description of issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshot evidence
   - Severity assessment (P0/P1/P2/P3)

4. **Recommendations**:
   - Any UX improvements noticed during testing
   - Visual inconsistencies that should be addressed
   - Performance concerns
   - Accessibility observations

---

## Independence Statement

This task is fully independent. Does not depend on Workers 1, 2, or 3.

You are testing the CURRENT state of the application, not waiting for other workers' changes.

---

## First Action Hints

1. **FIRST: Check if servers are already running** (DO NOT skip this):
   ```bash
   curl -s http://localhost:3001/ > /dev/null && echo "API: running ✓" || echo "API: stopped"
   curl -s http://localhost:3002/ > /dev/null && echo "Web: running ✓" || echo "Web: stopped"
   ```

2. **ONLY if servers are stopped**, start them:
   ```bash
   # Only run this if above check showed servers stopped
   cd /home/bernie/IntegratorPro && npm run dev
   ```

3. **Check if browser window already open** to http://localhost:3002/
   - If yes: Refresh the page (F5)
   - If no: Open browser to http://localhost:3002/

4. Take initial screenshot of floor plan as baseline

5. Begin systematic testing following acceptance criteria order

---

## Autonomy Mode

**Mode:** Mission
**Expansion Budget:** Medium - thorough visual testing, screenshot all key states, document all findings

---

## MANDATORY COMPLIANCE

Before marking this task complete, you MUST verify:

1. **All Test Scenarios Executed:**
   - Every checkbox in acceptance criteria completed
   - Every test has screenshot evidence
   - Every test has documented observations

2. **Screenshot Quality:**
   - Screenshots are clear and readable
   - Screenshots show relevant UI state
   - Screenshots are properly labeled/named
   - Minimum 15 screenshots total

3. **Documentation Completeness:**
   - Each test result documented (pass/fail/notes)
   - Browser versions documented
   - Any bugs clearly reported
   - Recommendations section completed

If a test reveals a bug: DOCUMENT IT thoroughly, but do not stop testing. Complete all scenarios.

If you cannot test something due to blocker: DOCUMENT why and what you tried.

---

## Reference Documents

- P1 Furniture refinements: `tmp/worker/result-worker2-FURN-REFINE-P1.md`
- P1 Data architecture: `tmp/worker/result-worker1-DATA-ARCH-P1.md`
- Tech Lead review: `tmp/tech-lead-review-cycle1.md`
- Settings component: `components/Settings.tsx`
- Furniture tool: `editor/tools/PlaceFurnitureTool.ts`

---

**Result File:** `tmp/worker/result-worker4-VISUAL-VER-P2.md`

Start NOW.
