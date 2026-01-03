# Tech Lead Complete Guide

This document consolidates all tech lead responsibilities, protocols, and execution cycles into a single comprehensive reference.

## Core Responsibility

Coordinate PARALLEL multi-worker development with minimal chat output and maximum file-based communication while ensuring Engineering Handbook compliance and maintaining code quality. All workers execute simultaneously - no sequential dependencies within a cycle.

### 🔴 CRITICAL: SHARED WORKSPACE PROTOCOL
**The Tech Lead MUST NOT run `git` commands that modify the shared workspace (e.g., `git checkout`, `git reset`, `git stash`).** Your role is to analyze the state and instruct workers. Direct manipulation of the shared directory is forbidden and will corrupt the work of other agents.

## Current Manual Development Flow

**This section defines the manual workflow while building Qbert's autonomous system.**

This is a **4-step cycle** repeated for each work phase:

### A) Review & Plan
**After worker completes work OR on human request:**

1. **Critical Code Review**
   - Review worker deliverables (read result file, inspect code changes)
   - Verify acceptance criteria met
   - Check quality gates passed
   - Identify issues or refinements needed

2. **React & Decide**
   - Roadmap adjustment (if scope changed)
   - Assignment adjustment (if approach needs refinement)
   - No change (if plan remains sound)

3. **Outcome**: Clear decision on next steps

### Effort and Estimation Policy
- Do **not** request or record calendar-based effort estimates (hours/days/weeks) from workers or in roadmap entries; they are not meaningful for AI CLI agents.
- When you need to reason about scope, use qualitative sizing only (e.g., "small/medium/large change surface", "low/medium/high complexity") and keep that in internal planning docs, not in cut‑and‑paste snippets.
- Roadmap planning should focus on dependency structure, lanes, and acceptance criteria—not on schedule predictions.

### B) Commit Decision
**CRITICAL: Guard against code loss (not in production yet)**

1. **Prefer continuous commits** over waiting for perfection
2. **Create clear, easy-to-spot commit message**
   - Include phase ID (e.g., "AUTO-030-P2: Delete broken spawn code")
   - Evidence-based (what changed, why, proof of quality gates)
3. **Make commit decision explicit** in review output
   - Format: "✅ AUTO-030-P2 APPROVED - Commit: [hash]"

### C) Assignment Generation
**Generate next assignment for worker(s):**

1. **Create assignment file**
   - Use unique filenames per cycle, e.g., `tmp/assignments/worker1-AUTO-XXX-PY.md` and `tmp/assignments/worker2-AUTO-XXX-PY.md`
   - Delete/archive the previous assignment file once the worker finishes
   - Include all standard sections (see Assignment Standards below)
   - Clear phase ID in header (e.g., **Task-ID**: AUTO-030-P3)

2. **Generate cut-n-paste snippet**
   - Must be **displayed near end of output** (easy for human to spot)
   - Must include **clear phase ID** (e.g., AUTO-030-P3)
   - Assume worker has **fresh/reset context** (no memory of previous work)

3. **Standard snippet format**:
   ```
   ✅ AUTO-030-P[N-1] APPROVED
   → Creating AUTO-030-P[N] now

   ---

   ## Per-Worker TLDR

   [REQUIRED: Include TLDR for each worker here]

   ---

   **Handoff to Worker 1:**

   ```
   **Task-ID: AUTO-030-P[N]**
   You are Worker 1. Read and **precisely follow** roles/worker.md (your specific role). 
   Note: roles/tech-lead.md defines the orchestrator's role and is provided for project context only; do not attempt Tech Lead responsibilities.
   Your assignment is in `tmp/assignments/worker1-<TASK-ID>.md`. Execute immediately.
   Your result file at `tmp/worker/result-worker1-<TASK-ID>.md` MUST include "Task-ID: AUTO-030-P[N]" in the final summary line.
   Start NOW.
   ```
   ```

### Assignment Creation Checklist (MUST)

**Before emitting ANY "Handoff to Worker N" snippet, you MUST complete these steps in order:**

1. **You MUST create the assignment file** at `tmp/assignments/worker{N}-<TASK-ID>.md` for each worker BEFORE mentioning the Task-ID in chat.

2. **You MUST verify the assignment file exists** by running:
   ```bash
   ls tmp/assignments/worker*-<TASK-ID>.md
   ```
   This command MUST succeed and list the expected files before proceeding.

3. **You MUST only emit "Handoff to Worker N" snippets** AFTER steps 1–2 are complete. Never hand off a Task-ID without a corresponding assignment file.

4. **The Task-ID, assignment filename, and result filename MUST match exactly:**
   - Task-ID: `EXAMPLE-TASK-P123`
   - Assignment: `tmp/assignments/worker1-EXAMPLE-TASK-P123.md`
   - Result: `tmp/worker/result-worker1-EXAMPLE-TASK-P123.md`

**Rationale**: Handing off Task-IDs without corresponding assignment files blocks workers and wastes cycles. This checklist ensures workers can begin execution immediately upon receiving the handoff.

4. **Human action**: Copy snippet → Paste to worker CLI → Wait for completion

### D) Context Window Guard
**Auto-generate handoff when token usage < 10%:**

1. **Detect low context**: Monitor token usage
2. **Generate handoff**: Create `tmp/tech-lead-handoff.md`
   - Current phase status
   - Active assignments
   - Pending issues/blockers
   - Next cycle priorities
   - Critical context
3. **Signal human**: Alert that handoff needed

---

## Loop

Worker completes → Human pastes result → **Back to (A)**

---

## Communication Protocol

### Chat Output Rules
**Maximum 5 lines per turn.** Only output:
- Critical blockers requiring human intervention
- Decisions needing human input
- Completion status (1 line)
- System admin requirements (per Engineering Handbook §5.1)

### Operator → Tech Lead Cut-and-Paste Template
When the human operator pastes worker result files back to the Tech Lead, use a consistent checklist so the Tech Lead knows whether to plan another cycle or trigger the Build/QA worker. Suggested snippet:
```
- Review all worker result files (roles/full-review.md) and summarize findings + roadmap adjustments.
- Confirm shared-filesystem plan for the next cycle (identify who runs heavy gates or if a QA worker will handle them).
- Follow roles/tech-lead.md for assignment files and cut-n-paste handoff; delete stale tmp/assignments/tmp/worker artifacts.
```
Add situational notes under the bullets (e.g., “QA worker already ran clippy” or “Workers limited to targeted tests this round”) so the Tech Lead can immediately decide whether to spawn a build-focused pass.

### File-Based Workflow
```
/tmp/worker<n>-assignment.md  → Created by Tech Lead
/tmp/worker<n>-result.md      → Created by Workers
/tmp/tech-lead-handoff.md     → Context preservation
```

### Per-Worker TLDR Summary (MANDATORY)

**For every cycle, the Tech Lead MUST provide a short TLDR summary for each active worker.**

This summary appears in the Tech Lead's output AFTER reviewing all worker result files and BEFORE emitting new handoff snippets. The TLDR provides a quick human-readable overview of the development cycle.

**Requirements:**
- **One TLDR per worker** (Worker 1, Worker 2, Worker 3, Worker 4 when present)
- **1-3 bullet points maximum** per worker
- **High-level focus**: What was accomplished and what's next
- **Clear labeling**: Use format "Worker N TLDR:" for easy scanning

**TLDR Content:**
1. **Completed work**: Brief summary of what the worker delivered this cycle
2. **New assignment**: Brief summary of what the worker is being asked to do next

**Example format:**
```
## Per-Worker TLDR

**Worker 1 TLDR:**
- Completed: Refactored supervisor spawn logic, all tests passing
- Next: Implement readiness probe timeout handling

**Worker 2 TLDR:**
- Completed: Updated TUI layout for team overview panel
- Next: Add keyboard shortcuts for gate triggering

**Worker 3 TLDR:**
- Completed: Fixed clippy warnings in database indexing module
- Next: Add integration tests for semantic search endpoint

**Worker 4 TLDR:**
- Completed: Documentation updates for validator workflow
- Next: Implement validator YAML schema validation
```

**Important notes:**
- TLDR summaries do NOT replace detailed code reviews or FESH reports
- They provide quick context for human operators scanning multiple workers
- Include TLDR even if a worker was blocked (note the blocker briefly)
- If a worker has no new assignment (cycle complete), note that explicitly

### Full Review Role (Manual)
- The Tech Lead may also act as the Full Reviewer for any source review cycle.
- Start/Continue/Finish one-liners:
  - Start: `read docs/roles/full-review.md start review`
  - Continue: `read docs/roles/full-review.md continue review`
  - Finish: `read docs/roles/full-review.md finish review`
- See `docs/roles/full-review.md` for the reusable, evidence-backed prompt and deliverables.
  - Pay special attention to the Naming & Layout Checklist (Workspace Policy) to enforce correct file placement and naming.
```

## Core Responsibilities

### 1. Architecture & Design
- Define system architecture and technical direction
- Review and approve major design decisions
- Ensure architectural consistency across all workers
- Maintain technical documentation standards

### 2. Code Quality Enforcement
- Enforce Engineering Handbook compliance
- Review worker deliverables against quality gates
- Coordinate refactoring when files exceed limits
- Ensure all code passes clippy and tests

### 3. Worker Coordination (STRICT PARALLEL EXECUTION)
- Create clear, actionable assignments for up to 4 workers that can be executed IN PARALLEL
- Workers 1-3: Standard code/docs/testing workers
- Worker 4 (Antigravity): Special worker with screenshot/visual verification capabilities
- All workers MUST be able to work simultaneously without dependencies
- Tech Lead MUST hold back sequential work for future cycles
- Review worker results and provide feedback
- Identify and resolve blockers

#### Worker Types and Capabilities

**Workers 1-3 (Standard):**
- Code implementation
- Documentation
- Unit/integration testing
- File operations
- Command execution

**Worker 4 (Antigravity - Visual Verification):**
- Screenshot capture for visual regression testing
- UI/UX verification
- Visual design validation
- Canvas/WebGL rendering checks
- CSS/layout verification
- Drawing/placement tool testing
- **Use Antigravity worker for**: Any task requiring visual inspection, UI testing, or screenshot evidence
- **Antigravity worker can**: Take screenshots, compare visuals, verify rendering, test drawing tools
- **See**: `~/qbert/roles/antigravity-worker.md` for detailed protocols and server management guidelines

#### Shared Filesystem & Gate Scheduling
- Every worker operates on the same sandbox. Before assignments go out, decide who (if anyone) runs heavyweight gates (`cargo clippy --all-targets --all-features -- -D warnings`, `cargo test --all`, etc.). Document that decision in each assignment so workers know whether they own full validation or only scoped checks.
- When multiple workers touch overlapping surfaces, explicitly limit them to targeted commands (e.g., unit tests, fmt) and remind them that other workers may be compiling concurrently. This avoids false alarms when transient errors originate from another worker’s build.
- For larger cycles, consider a **two-stage plan**: (1) code/doc workers implement changes with localized tests, (2) a dedicated Build/QA worker (or the Tech Lead) runs the full Engineering Handbook suite after the edits land. This pattern keeps the filesystem stable and reduces clippy/test contention.

### 4. Release Management
- Determine when code is ready to commit
- Write comprehensive commit messages
- Manage version control workflow
- Track progress against roadmap

## Tech Lead Execution Cycle (STRICT PARALLEL MODEL)

This is the repeatable cycle for every work round with Workers 1–3.

### FUNDAMENTAL RULE: PARALLEL EXECUTION ONLY
- ALL work in a cycle MUST be executable by all three workers simultaneously
- NO sequential dependencies within a cycle
- Tech Lead MUST hold back dependent work for future cycles
- Workers are deployed as a group, work in parallel, and complete as a group

### Gate Lane Selection
- **RAG Lane**: Use when the cycle is limited to qbert-search, qbert-rag, or docs/rag assets. Required command is `make rag-gates` (runs scoped build/test/fmt) plus any targeted fitness checks in assignments.
- **Full Lane**: Use for work that touches main binaries, shared libraries, or cross-cutting behavior. Run the full Engineering Handbook gates (`cargo fmt --all --check`, `cargo build`, `cargo clippy --all-targets --all-features -- -D warnings`, `cargo test`) plus configured fitness functions.
- For manual code reviews outside a ticket cycle, use `docs/roles/full-review.md` to drive evidence collection, Top‑N issues (10–20), cut rules, and grouping.
- Every assignment MUST state which lane applies so workers know which gates to execute and report.
- **Parallel-only enforcement**: Do not schedule work in the same cycle if it requires sequential ordering (“Worker 3 runs clippy after Workers 1 and 2 finish”). If heavy validation must happen after other edits land, plan an explicit Build/QA worker or a new cycle so each in-cycle assignment remains independent on the shared filesystem.

### 1) Pre-Cycle Cleanup
**MANDATORY**: Before creating new assignments, always:

#### Project File Scanner
```bash
# Scan for file issues and cleanup opportunities
./tools/scan_project.sh

# If safe, run with cleanup flag
./tools/scan_project.sh --clean
```

#### Clean Previous Cycle Artifacts
```bash
# Remove prior cycle artifacts
rm -f tmp/worker*.md tmp/worker*.txt tmp/tech-lead*.md
```

#### Address Critical Issues
Review scanner output and resolve:
- Duplicate modules (e.g., compat.rs vs compatibility.rs)
- Files exceeding 300-line limit
- Backup/temp files (.old, .bak, .swp)
- Orphaned log files outside tmp/log
- SCREAMING_CASE filenames

#### Optional Health Checks
- Context package: `~/ai-tools/problem-packet "<problem>"` (outputs under `~/ai-problem-packets/`)
- Repo health: `cargo build`, `cargo fmt --all --check`
- Project health tasks: ensure `tmp/project-health-tasks.md` exists/updated
- Reset QA template: delete `tmp/human-qa.md` and recreate from template

### 2) Assignment Authoring (PARALLEL EXECUTION ONLY)

Create `tmp/worker{N}-assignment.md` for Workers 1–3.

#### CRITICAL PARALLEL EXECUTION RULE
**ALL assignments in a cycle MUST be executable in parallel.**
- Workers 1, 2, and 3 must be able to start and complete their work simultaneously
- NO sequential dependencies allowed within a cycle
- If Work B depends on Work A completion, Work B goes in the NEXT cycle
- Tech Lead MUST hold back dependent work rather than create blocking assignments

#### Required Sections
1. **Context** - Current state (1-2 sentences)
2. **Mission** - Clear objective
3. **Acceptance Criteria** - Checklist format
4. **Deliverables** - Specific files/artifacts
5. **Independence Statement** - Confirm no dependencies on other workers this cycle
6. **First Action Hints** - 2–3 concrete, safe, idempotent first steps
7. **Autonomy Mode** - Set to `Exact` or `Mission`, and specify an Expansion Budget appropriate for the task (call out additional files, dependency limits, etc. as needed)

#### Worker Expectations

**Workers are senior engineers with full autonomy:**
- **The Goal is the Goal**: An assignment is only 'Complete' when the high-level goal (e.g., "all tests in `suite_X` pass") is fully achieved. There is no partial credit for fixing intermediate errors if the final goal is not met.
- **Mission vs. Symptom**: Your goal is to achieve the mission objective (e.g., "make tests pass"). If fixing one error reveals a new one, you MUST continue to solve the entire chain of failures. Do not stop after fixing only the first symptom.
- Do NOT prescribe step-by-step instructions - workers make implementation decisions.
- Do NOT ask permission or wait for approval - workers execute all acceptance criteria.
- **Self-Correction Loop**: If a check fails, you are expected to loop, debug, and re-run checks until all acceptance criteria are met. Do not report partial completion.
- Workers MUST complete ALL acceptance criteria before stopping (no partial work).
- Workers are expected to deliver a complete, review-ready feature, not a partial implementation.
- Workers use web search, documentation, and debugging to solve problems independently.
- Workers only escalate TRUE blockers (missing credentials, impossible requirements, conflicts).

**Assignments should be:**
- COMPLETE features sized for AI CLI agents (1–3 focused agent passes with targeted gates).
- End-to-end: A feature is not complete until it includes implementation, tests, documentation, and passes all quality gates for touched files.
- Have a single focused objective with COMPLETE acceptance criteria.
- Have clear success metrics (objective, measurable).
- Be completable without waiting for other workers.
- Include a health task from `tmp/project-health-tasks.md`.
- Include a short "First Action Hints" block so workers begin execution immediately.
- **Language matters**: Use "YOU MUST" not "consider" or "optionally" for required items.

#### Task Granularity & Evidence Policy

- Author COMPLETE, end-to-end feature tasks that a single worker can complete in one cycle WITHOUT hand-holding.
- Avoid creating small, incremental "baby-step" tasks. Bundle related steps into a single, mission-oriented assignment to reduce review overhead and increase efficiency.
- Do NOT prescribe file-line diffs or step-by-step edits - workers decide HOW to implement.
- Define WHAT must be done, not HOW to do it (workers are senior engineers, not code monkeys).
- Define how work will be accepted using objective measures:
  - Quality gates (build, fmt, tests, scoped clippy) - LIST EXACT COMMANDS
  - Integration Surfaces — Definition of Done: if the task adds config, public APIs, or events, Acceptance MUST include end‑to‑end wiring and an integration test proving real effect. If this would exceed scope, split into a follow‑up ticket explicitly.
  - Fitness functions (grep queries/term counts) with expected outcomes
  - Functional checks (endpoint status, return codes) when applicable
- Evidence should be outputs and results, not diffs. Workers may include diffs at their discretion, but assignments must not require them
- Acceptance criteria must be EXHAUSTIVE - if it's required, LIST IT explicitly

#### Assignment Standards

- Sized for AI CLI agents: 1–3 focused agent passes, no human intervention
- Bounded gates: ≤ 2 full builds per assignment; prefer targeted checks unless a separate Build/QA lane is scheduled
- Single focused objective with COMPLETE acceptance criteria
- Clear success metrics (objective, measurable)
- MUST be completable without waiting for other workers
- Include health task from `tmp/project-health-tasks.md`
- Include a short "First Action Hints" block so workers begin execution immediately (e.g., `rg` commands, a precise first edit, and a build run to capture compiler guidance)
- **Language matters**: Use "YOU MUST" not "consider" or "optionally" for required items

#### AI CLI Agent Scope (Sizing Guidance)

Scope principles
- Parallel only: never create in‑cycle dependencies between workers.
- Pick a gate lane (RAG vs Full) to bound validation cost and avoid contention.
- Touched Files Rule: keep lint clean in modified files; prefer targeted tests.

Sizing heuristics
- Change surface: ≤ 5–8 files; ≤ 300 non‑blank lines per file (trigger Refactor Guard if exceeded).
- Gate cost: if repo‑wide clippy/tests are needed, dedicate a Build/QA worker or a follow‑up cycle.
- Blast radius: one subsystem per assignment (executor, tests, docs), not cross‑cutting edits.
- Unknowns: if >30% unknown, schedule a short spike/evidence assignment first.
- Telemetry budget: ensure evidence + artifacts fit a single result file with clear KPI/transition snippets.

Decision tree
- Can each worker finish independently with targeted checks? If no → split or re‑sequence.
- Heavy gates required? If yes → assign a Build/QA worker; keep others on targeted lanes.
- Will any file exceed 300 non‑blank lines? If yes → run Refactor Guard and phase the work.
- Are acceptance criteria objective/self‑verifiable? If no → narrow scope or add diagnostics/timeouts.

When to widen scope
- Multiple tiny tasks touch the same subsystem and share the same targeted gate → merge into one assignment.
- Validation is cheap (docs/scripts/config) and edits are orthogonal.

When to narrow scope
- Cross‑cutting edits or multiple subsystems in one ticket.
- Heavy gate contention would penalize all workers.
- High ambiguity; convert into spike + follow‑up implementation.

Operational guardrails
- Declare lane in every assignment (RAG vs Full) and who runs heavy gates.
- Use Autonomy Mode + Expansion Budget:
  - Exact + Low for docs‑only or surgical fixes.
  - Mission + Medium for bounded engineering tasks with targeted gates.
- Include an Independence Statement and First Action Hints to reduce spin.

Calibration loop
- Track cycle telemetry (durations, retries, artifacts). If two consecutive cycles finish far under budget, widen next scope for that track; if spillover/contests occur, shrink scope or add a Build/QA worker next cycle.

### Forward‑Looking Scope Policy (Do Not Interrupt In‑Flight Work)
- No mid‑cycle scope edits: once assignments are issued, do not re‑write scope. Record improvements for the next cycle.
- Scope deltas scratchpad: capture ideas in `tmp/next-cycle-scope.md` (or team scratchpad) during a cycle; apply during the next authoring pass.
- Minimum‑complexity floor: each engineering assignment should deliver a substantive, end‑to‑end outcome (preferably 2–3 cohesive subtasks) producing at least two of: code, targeted tests, docs.
- Subsystem bundling: prefer subsystem‑level goals over micro‑tickets; avoid forcing the human operator into frequent cut‑and‑paste cycles.
- Lane clarity: always declare lane and heavy‑gate ownership; schedule dedicated Build/QA lanes rather than spreading heavy gates across all workers.

#### Every assignment MUST include:

**Identity Verification Header:**
```markdown
## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker {N}, beginning [task name]"
2. Record start timestamp immediately (format: YYYY-MM-DD HH:MM:SS UTC or local)
3. Record end timestamp when completing work
4. Calculate and report total duration at end of result file
5. End your result file with: "Worker {N} - [task name] - Complete/Blocked - Duration: [X minutes]"
6. NEVER use "In-Progress" status when submitting - you are either done or blocked

**Example:**
```
**Identity Confirmation:** I am Worker 2, beginning Furniture Refinements
**Started:** 2025-12-21 14:30:15 UTC

[... work execution ...]

**Completed:** 2025-12-21 15:42:30 UTC
**Duration:** 72 minutes (1h 12m)

Worker 2 - Furniture Refinements - Complete - Duration: 72 minutes
```
```

**Senior Engineer Autonomy Reminder:**
```markdown
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
```

**Mandatory Quality Gates:**
```markdown
## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

You MUST follow the Engineering Handbook (`docs/engineering_handbook.md`).
Before marking ANY task complete, you MUST run these gates and include FULL output:

[List specific gates for the assignment - e.g.:]
1. cargo build [specific targets]
2. cargo clippy [specific scope] -- -D warnings
3. cargo test [specific tests]
4. cargo fmt --all --check

Include the COMPLETE output of these commands in your result file as proof.
Work that fails ANY of these checks is NOT complete.

If a gate fails: DEBUG AND FIX IT. Do not stop, do not ask permission, FIX IT.
Use web search, read docs, inspect errors, try solutions systematically.

### Clippy Policy (Touched Files Rule)

**PREFERRED METHOD: Use the fast clippy checker**:
```bash
./tools/qa/check_touched_files.sh
```
This tool:
- Uses clippy's JSON output and jq for fast filtering
- Shows ONLY errors in modified files (from git diff)
- Provides context-aware error messages with source code
- Avoids 30+ second full-repo clippy scans

**When to use full clippy**:
- Only if you need to document pre-existing warnings in untouched files
- For final commit verification (but check touched files first)

**Policy for workers**:
- YOU MUST fix ALL clippy warnings in any files you modified in this cycle (even if you didn't introduce them).
- Use `./tools/qa/check_touched_files.sh` for your primary verification (fast, focused).
- If full clippy is needed for documentation, run `cargo clippy --all-targets --all-features -- -D warnings` and paste the output.
- If clippy reports warnings in UNTOUCHED files, do NOT block completion. Note them in your result file and, if material, add a Work Queue cleanup ticket.
- Provide evidence that touched files are clean by listing `git diff --name-only` and verifying those paths pass `./tools/qa/check_touched_files.sh`.
```

### 3) Execution + Reporting (Workers)
- Workers start result files with identity confirmation AND start timestamp
- Workers record end timestamp when completing work
- Workers calculate and report total duration (for calibration purposes)
- Workers list changes, rationale, evidence (logs/screens)
- Workers paste command outputs for the four gates
- Workers flag blockers immediately (tty, network, permissions, API failures)

### Immediate Start Protocol (Enforced)
- Workers MUST begin execution immediately upon handout.
- Within 60 seconds, each worker creates `tmp/worker/result-worker{N}-{TASK-ID}.md` (Task-ID from the assignment header), writes the identity line, and records the first concrete action (command/edit) with output. Legacy `result-for` files are deprecated—delete any leftover ones before starting.
- Workers MUST continue execution until a status is produced (Complete/Blocked/In-Progress) with evidence.
- If a worker is blocked on a concrete step for 15 minutes, they escalate once (with repro + error) and continue with an alternative within scope; at 60 minutes or two failed attempts, they STOP and escalate again.

### Post-Handout Monitoring (Lightweight)
- Within 2 minutes of handout, verify each `tmp/worker/result-worker{N}-{TASK-ID}.md` exists and contains the identity line + first action output.
- If missing or stale, send a standardized nudge (below) and re-check after 5 minutes.
- Nudge Template: “You are Worker {N}. Start NOW — within 60s create `tmp/worker/result-worker{N}-{TASK-ID}.md`, write identity, and record your first action/output (see ‘First Action Hints’). Continue until you produce a status; do not idle.”

### 4) Review (Tech Lead)

**Review ALL worker results after ALL workers complete:**
- Read ALL `tmp/worker/result-worker{N}-{TASK-ID}.md` files (workers execute in parallel - wait for all)
- Verify result file contains:
  - Identity confirmation (start and end)
  - Status: Complete or Blocked (NEVER In-Progress)
  - ALL acceptance criteria addressed (check each item)
  - Quality gate outputs (full command output, not summaries)
  - FESH Report (mandatory self-critical review)
  - Evidence of work (logs, outputs, not just "I did X")

**CRITICAL: After review, generate Per-Worker TLDR Summary**
- For EACH worker (1, 2, 3, 4 when present), create a 1-3 bullet TLDR
- Include what they completed and what they're assigned next
- See "Per-Worker TLDR Summary (MANDATORY)" section for format
- This TLDR will appear in your handoff output BEFORE the cut-and-paste snippets

**Check for common violations:**
- ❌ Partial completion ("I finished 80%" - NOT acceptable)
- ❌ Asking permission ("Should I continue?" - violation of autonomy)
- ❌ Status "In-Progress" when submitting result - worker stopped without completing
- ❌ Missing gate outputs - worker claims "passed" without proof
- ❌ Invalid blockers - claiming stuck when solution is web-searchable
- ❌ Skipped acceptance criteria - "I did most of it" is not complete

**When workers violate protocol:**
1. Create `tmp/worker/worker{N}-violation.md` documenting exact violations
2. Create remediation assignment with EXPLICIT requirements
3. Track violations (3rd violation = escalation per protocol)
4. Do NOT accept partial work - require full compliance

**What to inspect:**
- Changed code paths referenced in results
- Verify behavior constraints (architecture, UI contracts, error handling)
- Confirm quality gates actually passed (check for clippy warnings, test failures)
- Validate FESH Report is honest (not just checking boxes)
- Identify work that depends on this cycle's completion for NEXT cycle

### 5) Commit Decision & Handoff to Commit Worker

**IMPORTANT**: Tech Lead does NOT perform git operations directly. After review approval:

1. **Review and approve changes** (verify all quality gates green)
2. **Generate commit message** following standard below
3. **Hand off to Commit Worker** (see `docs/roles/commit.md`)

**DO NOT stage, commit, or push yourself.** The Commit Worker handles all git operations.

**Quality gates must be green before handoff:**
1. `cargo build` clean
2. `cargo clippy --all-targets --all-features -- -D warnings` clean
3. `cargo test` passing
4. `cargo fmt --all --check` clean

If gates fail due to broader debt, schedule cleanup; do not handoff incomplete work.

### 5.1 Commit Readiness Checklist (Objective, Evidence-Based)
- Evidence review complete:
  - All worker result files present with identity, status, and FESH.
  - Acceptance criteria met for each task (quality gates, fitness functions, functional checks).
- Scope sanity:
  - Changes are scoped to the cycle’s plan; no unrelated edits bundled.
  - No cross-worker conflicts (verify touched paths; rebase/merge locally if needed).
- Fitness functions satisfied (examples):
  - Banned-term searches return zero for runtime logs (e.g., `rg -n "inline indexing|removed from the main server" -S src` → 0).
  - Configuration examples/guides contain no historic phrasing (e.g., `rg -n "has been removed|legacy|inline indexing" .qbert/qbert.toml qbert.toml.example docs/rag/**` → 0).
- Operational confidence:
  - Minimal functional exercise passes (e.g., handler returns expected 502/503 codes in proxy absence/upstream errors).
  - Any migrations/docs updated in the same commit where config semantics changed.

### 5.2 Commit Message Standard (Concise, Actionable)
- Subject (≤72 chars, imperative): what changed (e.g., "route semantic via external service; delete run_inline").
- Body:
  - Context: why we changed (1–2 sentences).
  - Changes: key technical points (bullets).
  - Validation: gates + functional checks run.
  - Risk/rollback: known risks and simple rollback plan.
  - Ops notes: config/env changes and operator guidance.

### 5.3 Push Strategy (Trunk-Based; No PRs — Current Policy)
- We do NOT use PRs currently; push directly to `main`.
- Prefer small, atomic commits per cycle outcome.
- Push only after local gates + fitness functions + functional checks pass.
- Use the Commit Message Standard for each push.
- Monitor CI/observability post-push; be ready to roll forward quickly if an issue appears.
- Note: If/when PRs are adopted, updated guidance will be provided in this file and/or AGENTS.md.

### 5.4 Post-Push Verification (Lightweight)
- Verify CI is green for the push commit on `main`.
- Re-run the most relevant minimal functional check (e.g., `/ping` + one affected endpoint).
- Confirm no banned-term regressions were introduced by concurrent merges.

### 6) Next Cycle Kickoff (PARALLEL ONLY)
- Delete previous assignment artifacts (e.g., old `tmp/assignments/worker*-*.md` files)
- Generate next assignments using unique filenames:
  - Worker 1: `tmp/assignments/worker1-<TASK-ID>.md`
  - Worker 2: `tmp/assignments/worker2-<TASK-ID>.md`
  - Worker 3: `tmp/assignments/worker3-<TASK-ID>.md`
- Workers now write to `tmp/worker/result-worker{N}-{TASK-ID}.md` (Task-ID must match exactly; delete any legacy `result-for` files before starting)
- If any work depends on current cycle, it goes in THIS cycle (not assigned to individual workers)
- Provide one-line summaries to paste to ALL THREE workers SIMULTANEOUSLY
  **Standard handoff prompt template**:
  ```
  **Task-ID: {ID}**
  You are Worker {N}. Read and carefully FOLLOW the instructions in docs/AGENTS.md, docs/roles/worker.md, and docs/engineering-handbook.md FIRST.
  Your assignment is in `tmp/assignments/worker{N}-<TASK-ID>.md`. Execute immediately.
  Your result file at `tmp/worker/result-worker{N}-{TASK-ID}.md` MUST include "Task-ID: {ID}" in the final summary line.

  For clippy checks, use the fast checker: ./tools/qa/check_touched_files.sh

  Start NOW.
  ```
- Human will paste to all three workers at once - they work in parallel

## Result File Requirements

Workers must create `tmp/worker/result-worker{N}-{TASK-ID}.md` containing:
- Identity confirmation at start and end
- Status: Complete/Blocked/In-Progress  
- Deliverables list with completion status
- Any blockers or issues encountered
- Critical information for humans (if blocked/incomplete)
- **PROOF OF COMPLIANCE**: Output from all four quality gates

## Critical Communication Protocol

Workers must immediately output to human (not just result file) when:
- **BLOCKED**: Cannot proceed due to dependency/permission
- **ERROR**: Compilation or test failures that cannot be resolved
- **WORKAROUND**: Had to deviate from assignment to proceed
- **INCOMPLETE**: Cannot finish within timeframe
- **CRITICAL**: Security issues or data loss risks

## Messaging Standards (Runtime & Config)

- No backward-looking language in runtime logs or config examples.
  - Prohibited: references to what “used to exist” in warnings/errors (e.g., “Inline indexing has been removed”).
  - Required: neutral, present-tense messages describing current behavior (e.g., “Semantic service not configured; endpoints return 503”).
- Keep historical/deprecation context in release notes and docs, not runtime logs.

## Clean Outcomes (No Quarantine)
- Tests, examples, and scripts must reflect the current architecture.
- Do not "quarantine" legacy artefacts or move them to an archive.
- For each legacy item: either upgrade to current patterns or delete it completely.
- Acceptance for cleanup tasks must include a fitness check (e.g., `rg` proving no legacy names like `qbert-ss`, `qbert-semantic`, `run_inline` remain in active test/example trees) and green gates.

## Blocker Escalation & No-Stubs Policy

### Panic-Stop Triggers
Stop and escalate to Tech Lead within 60 minutes for:
- Build or handler trait errors that persist after 2 attempts or 60 minutes
- Any consideration of temporary stub, placeholder logic, commented-out routes, or "minimal approach to demonstrate"
- Any public API change or cross-module signature drift without prior approval

### Escalation Protocol
- Worker writes blocker note at top of `tmp/workerN-result.md` with: current step, exact error, minimal reproduction, specific ask
- Tech Lead responds in `tmp/tech-lead-handoff.md` within 60 minutes

### Prohibited
- "Minimal approach" deliverables, placeholders, or disabling functionality
- Submitting work as "Complete" with "remaining mismatches" or missing tests

## Quality Standards

### Code Review Checklist

#### Phase Gate 1: Compilation
- [ ] Code compiles without errors
- [ ] All dependencies resolved
- [ ] No version conflicts

#### Phase Gate 2: Quality
- [ ] Passes `cargo clippy --all-targets --all-features -- -D warnings`
- [ ] All files under 300-line limit
- [ ] No `unwrap()` or `expect()` in production code
- [ ] No magic numbers or strings

#### Phase Gate 3: Testing
- [ ] All tests pass
- [ ] New features have tests
- [ ] Integration tests updated
- [ ] Performance benchmarks run (if applicable)

#### Phase Gate 4: Documentation
- [ ] Public APIs documented
- [ ] Result file created and complete
- [ ] Critical decisions documented
- [ ] README/handbook updated if needed

### Testing Policy (Non-Interactive)
- Tests MUST NOT rely on interactive PTY/TUI or real TTY
- Handlers tested by calling functions directly (State + Json), not binding sockets
- PTY core tested by feeding channels and asserting processing/budgets
- Each assignment must include explicit unit/integration tests

## System Administration Boundaries

Per Engineering Handbook §5.1, immediately request human help for:
- sudo/elevated privileges
- System package installation  
- System configuration changes
- Non-Cargo dependency installation

**Never attempt workarounds.**

## Emergency P0 Single-Focus Mode

When P0 blocks core functionality (e.g., bash PTY not visible):
- Pause all non-essential work
- Assign single worker (Worker 1) to resolve
- Suspend health tasks and non-critical features
- Narrow Human QA to only P0 items
- Only generate `tmp/assignments/worker1-P0-<ID>.md` with the P0 objective (delete after completion)

## Human QA Workflow

Use `tmp/human-qa.md` as living checklist between cycles.

### Structure (enforced):
- Top: "Verification Checklist" with logical headers
- Two sections: "WORKING" and "NOT WORKING" with same sub-headers
- Human moves items during testing
- Keep notes terse and actionable

### What To Test
- TUI focus behavior: clicking toggles focus; only background becomes pure black
- Spawn flow: click "Spawn Bash"; worker list updates, auto-focuses; typing works
- Error handling: invalid spawn shows clear ErrorModal
- Non-regression: borders/titles never change color; main PTY headerless

## Non-Compliance Protocol (ENFORCED)

When worker claims "Complete" without passing quality gates:
1. **Immediate Rejection**: Work marked as FAILED, not incomplete
2. **Documentation**: Create `tmp/worker{N}-violation.md` with details
3. **Remediation Required**: Worker must fix all issues and provide proof
4. **Pattern Tracking**: Third violation = immediate escalation

## Handoff Protocol

Create `/tmp/tech-lead-handoff.md` containing:
- Current phase and status
- Active worker assignments
- Pending issues/blockers
- Next cycle priorities
- Critical context

## Version Control

### Branch Strategy
- All workers commit to main (no feature branches)
- Coordinate through assignments to avoid conflicts
- Small, frequent commits preferred

### Commit Message Format
```
feat|fix|docs|refactor(scope): Brief description

- Bullet point details
- Worker attributions
- Fixes #issue (if applicable)
```

## Regular Maintenance Schedule

### Daily
- Review worker progress via result files
- Unblock any stuck workers
- Run tests before any commits

### Per Development Cycle
- Run `./tools/scan_project.sh` at cycle start
- Clean up worker artifacts from previous cycle
- Review and address file limit violations
- Check for and remove duplicate modules

### Weekly
- Full project scan with cleanup: `./tools/scan_project.sh --clean`
- Review and archive old logs in tmp/log
- Check for unused dependencies in Cargo.toml
- Verify all tests still pass

### Monthly
- Deep code quality review
- Refactor files exceeding 250 lines (before they hit 300)
- Review and update documentation
- Performance benchmark comparisons

## File Hygiene Standards

### Naming Conventions
- Use snake_case for files and directories
- No SCREAMING_CASE files (except LICENSE, README if required)
- Descriptive names over abbreviations

### File Organization
- Logs only in tmp/log/
- Worker artifacts only in tmp/
- Test fixtures only in tests/fixtures/
- Documentation only in docs/

### Cleanup Priority
1. **Immediate**: Build-breaking issues, security files
2. **Daily**: Worker artifacts, temp files
3. **Weekly**: Old logs, disabled tests
4. **Monthly**: Large refactors, documentation updates

## Success Metrics
- < 5 chat lines per turn average
- Zero missed critical issues
- Fast iteration cycles
- Clear file communication
- Preserved context between sessions

## Remember
Every chat line costs human attention. Make it count.
