# Worker Assignment Template (Authoritative)

This template MUST be used for all worker assignments to ensure Engineering Handbook compliance.

---

# Worker {N} Assignment - [Task Name]

## Definition of "Complete"
This assignment is not "Complete" until every item in the **Success Criteria** checklist is checked and all quality gates pass. Fixing the initial error is not enough. If subsequent, related errors arise, you are expected to solve them until the mission is 100% accomplished.

## Cut-and-Paste Handoff Prompt (Tech Lead → Worker)
- **Task-ID: {ID}**
- You are Worker {N}. Your assignment is in `tmp/worker{N}-assignment.md`. Read it and execute immediately.
- Your result file at `tmp/worker/result-worker{N}-{ID}.md` MUST include "Task-ID: {ID}" in the final summary line (new naming rule: `result-worker{N}-{Task-ID}.md`; delete any legacy `result-for` files before starting).
- Start NOW.

## IDENTITY VERIFICATION REQUIREMENT
You MUST:
1. Start your work by confirming: "I am Worker {N}, beginning [task name]"
2. End your result file with: "Worker {N} - [task name] - Complete/Blocked/In-Progress"
3. Include identity in any critical status updates to humans

## MISSION OBJECTIVE vs. SYMPTOMS
Your goal is to fully achieve the **Success Criteria** of this assignment. Along the way, you may fix one error only to find another. You are expected to continue solving these subsequent errors until the overall mission is complete. Do not stop after fixing only the first symptom you found.

## IMMEDIATE START DIRECTIVE (NO IDLE)
- Start NOW. Within 60 seconds:
- Create your result file at `tmp/worker/result-worker{N}-{ID}.md`
  - Write the identity line and your first concrete action (command or edit)
- Do NOT wait for confirmation. Do NOT pause to “plan” in chat tools. Execute.
- Keep working until you produce a complete status report (Complete/Blocked/In‑Progress) with evidence.
- If blocked for 15 minutes on a concrete step, escalate per Blocker Escalation and then continue with an alternative within scope.

## EXECUTION OVER PLANNING
- Do not create or maintain separate planning artifacts/tools before starting.
- If you need a plan, add a short checklist directly in your result file and execute through it immediately.

## FIRST ACTION HINTS (INCLUDE THESE IN EVERY ASSIGNMENT)
- Provide 2–3 concise, safe, idempotent first steps so the worker begins immediately.
- Hints should orient, not micromanage; avoid prescribing line edits or diffs.
- Preferred evidence: quality gate outputs, functional checks, fitness function results (e.g., grep counts), not patch hunks.

## AUTONOMY MODE (SET BY TECH LEAD PER ASSIGNMENT)
- Mode: `Exact` | `Mission`
  - `Exact`: Execute only what’s in Acceptance Criteria. If you discover gaps (e.g., integration not wired), add them under "Follow‑Ups" and do NOT expand scope unless allowed by Expansion Budget.
  - `Mission`: You may expand scope to achieve the user‑visible outcome, within the Expansion Budget below. Document each expansion with a 4‑line Decision Record (Context, Options, Decision, Consequences).
- Expansion Budget (default): call out any allowance for extra files or scope expansion; specify dependency/public API limits as needed.
- Red lines (always escalate): new third‑party dependencies, security‑sensitive changes, cross‑cutting refactors, schema/ABI changes.

## MANDATORY ENGINEERING HANDBOOK COMPLIANCE

**CRITICAL**: You MUST follow the Engineering Handbook (`docs/engineering_handbook.md`).

**NO‑POLLING READINESS RULE**: You MUST NOT introduce new readiness or state‑wait logic that relies on `sleep`‑based loops or HTTP `/ping` polling. For readiness (server up, worker idle, "wait until X is ready"), you MUST use subscription‑based patterns only:
- StateSubscription‑style APIs that return `(<current_state>, subscription)`, or
- The ServerReady helpers (`wait_for_server_ready_event`, `wait_for_server_ready_global`) documented in `docs/engineering-handbook.md`.

**Canonical helper implementations**: See `tests/common/harness/readiness.rs` (StateSubscription/ServerReady, AI TUI WorkerReady) and `tests/common/harness/http_worker_ready.rs` (HTTP-based helpers for process-spawned tests). Prefer these over introducing fresh polling patterns.

If you believe polling is unavoidable in your assignment, STOP and escalate to the Tech Lead instead of adding a new polling loop.

**Automated NO-POLLING Check**: Before marking your work complete, you MUST run the comprehensive QA suite `./tools/qa/run-all-qa-checks.sh --fast` (runs NO-POLLING check along with other quality gates). This check is also enforced in CI via `.github/workflows/no-polling-check.yml`. Any violations must be fixed before submission. Note: `--full` mode is reserved for heavy QA sweeps typically delegated to Build/QA workers; use `--fast` for regular pre-submission verification. Standalone NO-POLLING check: `./tools/qa/check_no_polling.sh`.

Before marking ANY task complete, you MUST run these commands and include output in your result:

```bash
# 1. Build check - MUST compile without errors
cargo build --bin qbert

# 2. Format check - MUST be properly formatted
cargo fmt --all --check

# 3. Clippy check - MUST pass without warnings
cargo clippy --all-targets --all-features -- -D warnings

# 4. Test check - MUST pass all tests
cargo test
```

**Work that fails ANY of these checks is NOT complete.**

### INTEGRATION SURFACES — DEFINITION OF DONE
- If you introduce or modify any of the following, your work is NOT complete until it is wired end‑to‑end and proven by a test that asserts real effect (not just types exist):
  - Configuration items (e.g., `.qbert`/settings) — must be read by construction paths and change runtime behavior
  - Public APIs — must be consumed by at least one code path or integration test
  - Events/telemetry — must be observable through the event bus or metrics and asserted in tests
- If end‑to‑end wiring would violate Expansion Budget (Exact mode) or Red lines, document the gap in your FESH and create a follow‑up ticket; otherwise, implement it now.

### Pre‑Submission Checklist (paste outputs; no summaries)
- Re‑read: `docs/roles/worker.md`, `docs/engineering_handbook.md`, and the Naming & Layout checklist in `docs/roles/full-review.md`.
- Run and paste outputs:
  - `cargo fmt --all --check`
  - `cargo build`
  - `cargo clippy --all-targets --all-features -- -D warnings` (Touched Files Rule: fix ALL warnings in files you modified this cycle; if warnings remain only in untouched files, proceed but note them. Paste `git diff --name-only` to prove touched files are clean.)
  - `cargo test` or targeted tests explicitly listed in the assignment
  - `./tools/qa/run-all-qa-checks.sh --fast` (comprehensive QA suite including NO-POLLING check; use `--full` only if explicitly requested or when assigned as Build/QA worker)
  - `./tools/repo-check/validate_root.sh`
  - `./tools/qa/compliance/check_docs_links.sh`
- Evidence integrity: All artifacts (logs/timelines/snapshots) MUST be generated by the code paths under test. Never fabricate. Show the test/code that produced any artifact you attach.
- Naming/Layout: Verify file placement and naming against `docs/workspace-policy.md` (durable vs. ephemeral; scripts in `tools/` or `tools/misc/`; docs tools under `docs/current/tools/`; outputs in `tmp/`).
- Evidence & citations: Use file references like `path:line` for every claim; include snippets/diffs for key points.

## BLOCKER ESCALATION (PANIC‑STOP)
- If you are blocked for 15 minutes on a concrete step, escalate once with the details below. If still blocked at 60 minutes (or after 2 attempts), STOP and escalate again.
- Add a short blocker note at the top of your result file with: current step, exact error text, minimal repro, and your specific ask.
- The Tech Lead will respond with a decision within 60 minutes in the handoff document.

## NO‑STUBS / NO “MINIMAL APPROACH” POLICY
- Prohibited: placeholder logic, commented‑out routes, disabling features to appear green, or claiming “complete” with “remaining mismatches”.
- All deviations from the plan MUST include a 4‑line Decision Record (Context, Options, Decision, Consequences).

## TESTING POLICY (NON‑INTERACTIVE)
- Tests MUST NOT rely on an interactive PTY or a real TTY. Do not start the TUI loop in tests.
- Handlers MUST be tested by calling functions directly (State + Json), no network binding.
- PTY core MUST be tested by feeding channels and asserting processed bytes/budgets; renderer via buffer assertions.

## Your Assignment
[Specific task description here]

### Priority 1: [First Task]
[Detailed requirements]

### Priority 2: [Second Task]
[Detailed requirements]

### Implementation Requirements
- NO `unwrap()` or `expect()` - use proper error handling
- NO magic numbers/strings - extract to named constants
- NO files over 300 lines - refactor if needed
- NO functions over 50 lines - split if needed
- MUST document all public APIs
- Avoid busy polling or artificial sleeps; prefer event-driven signalling/await patterns whenever feasible.

### Success Criteria
- [ ] Code compiles without errors
- [ ] All clippy warnings resolved
- [ ] All tests pass
- [ ] Code properly formatted
- [ ] [Specific task requirement 1]
- [ ] [Specific task requirement 2]

### Testing Requirements
After implementation:
1. Run the full quality gate suite (build, fmt, clippy, test)
2. Test the specific functionality you implemented (unit + integration per the policy above)
3. Document any edge cases or limitations
4. When modifying Stage 1 harness or SSE helpers, rerun `cargo test websocket_backpressure_timeout`, `cargo test worker_lifecycle`, and `cargo test batching_size_timing` to confirm `Send + Sync + 'static` predicates behave correctly.

## Result File Requirements

Create `tmp/worker/result-worker{N}-{ID}.md` with:

### Required Sections:
1. **Identity Confirmation**: "I am Worker {N}, beginning [task]"
2. **Implementation Summary**: What you actually did
3. **Quality Gate Results**:
   - Output from `cargo build`
   - Output from `cargo fmt --all --check`
   - Output from `cargo clippy`
   - Output from `cargo test`
4. **Testing Evidence**: Show your feature actually works
5. **Status**: Complete/Blocked/In-Progress
6. **Known Issues**: Any remaining problems or limitations
7. **Identity Confirmation**: "Worker {N} - [task] - [status]"

### Example Result Structure:
```markdown
# Worker {N} Result - [Task Name]

I am Worker {N}, beginning [task name]

## Implementation Summary
[What was done]

## Quality Gate Compliance

### Build Output
```
$ cargo build --bin qbert
   Compiling qbert v0.1.0
   Finished dev [unoptimized + debuginfo] target(s)
```

### Format Check
```
$ cargo fmt --all --check
[output showing no formatting needed]
```

### Clippy Check
```
$ cargo clippy --all-targets --all-features -- -D warnings
[output showing no warnings]
```

### Test Results
```
$ cargo test
[output showing all tests passing]
```

## Testing Evidence
[Show the feature working]

## Status
Complete

Worker {N} - [task name] - Complete
```

## Non-Compliance Consequences

If you claim work is "Complete" without passing quality gates:
1. Your work will be **REJECTED** as FAILED (not incomplete)
2. You must fix all issues yourself
3. You must explain why you submitted non-compliant work
4. Pattern of violations will result in escalation

If a gate fails: DEBUG AND FIX IT. Do not stop, do not ask permission, FIX IT. You are expected to loop on this process until all gates pass for the files you have touched.

## Remember
- The Engineering Handbook is NOT optional
- Quality gates are NOT suggestions
- "Complete" means ALL checks pass
- Include proof in your result file

---

## Specialized Worker Assignments

### Plan Reviewer Worker (AUTO-022 P3)

When creating assignments for Plan Reviewer workers, follow this format:

**Command to Run**: `./bin/qbert-ctrl worker plan-reviewer [OPTIONS]`

**Options**:
- `--assignment <PATH>` - Assignment file path (default: `tmp/worker/assignment.md`)
- `--result <PATH>` - Result file path (default: `tmp/worker/result.md`)

**Assignment File Location**: `tmp/worker/assignment.md` (default) or custom path

**Required Inputs** (verify before assignment):
- Event-envelope: `.qbert/hin_notifications.db` (hin_notification_log table)
- KPI logs: `.qbert/metrics.jsonl` with mission entries
- Gating report: `tmp/mission/{mission-id}/gating-report.json`

**Expected Outputs** (P4 + P13):
- JSON Report: `tmp/plan-review/{mission-id}-report.json`
- Result File: `tmp/worker/result.md` (or custom path via `--result`)
- Telemetry Outputs (4 files):
  1. `metrics/plan_effectiveness.jsonl` (complete telemetry, P4)
  2. `metrics/planner_adjustments.jsonl` (Goal Planner feed, P13)
  3. `metrics/hin_threshold_adjustments.jsonl` (HIN tuning, P13)
  4. `metrics/learned_patterns/{date}.json` (daily aggregation, P13)

**Success Criteria Template**:
- [ ] All inputs verified (event-envelope, KPI logs, gating report exist)
- [ ] JSON report generated with all required fields
- [ ] Deviation calculations accurate (positive/negative percentages)
- [ ] Confidence scores in valid range (0.0-1.0)
- [ ] Learned patterns extracted (minimum 1 per mission type)
- [ ] All 4 telemetry outputs appended/updated correctly
- [ ] Result file includes "Task-ID: {ID} — PASS/FAIL" status

**Quality Gates** (RAG lane):
- `make rag-gates` (docs only - no code changes)
- `./tools/qa/compliance/check_docs_links.sh`

**CLI Invocation Example**:
```bash
# Create assignment file:
cat > tmp/worker/assignment.md <<'EOF'
# Plan Reviewer Assignment

**Mission ID**: mission-42
**Task**: Analyze mission telemetry and generate plan effectiveness report

## Inputs
- Event-envelope: .qbert/hin_notifications.db (hin_notification_log table)
- KPI logs: .qbert/metrics.jsonl
- Gating outcomes: tmp/mission/mission-42/gating-report.json
EOF

# Run Plan Reviewer worker:
./bin/qbert-ctrl worker plan-reviewer

# Verify outputs:
ls -lh tmp/plan-review/mission-42-report.json
cat tmp/worker/result.md
jq 'select(.mission_id == "mission-42")' metrics/plan_effectiveness.jsonl
jq 'select(.mission_id == "mission-42")' metrics/planner_adjustments.jsonl
jq 'select(.mission_id == "mission-42")' metrics/hin_threshold_adjustments.jsonl
jq '.' metrics/learned_patterns/$(date -u +%Y-%m-%d).json
```

**Hook Invocation** (automatic during mission closure):
- Enable: `export QBERT_ENABLE_PLAN_REVIEWER=1` (or `true`, `yes`, `on`)
- Disable: `export QBERT_ENABLE_PLAN_REVIEWER=false` (or `0`, `no`, `off`, empty, unset)
- Check outcome: `grep "Plan Reviewer hook outcome" tmp/log/qbert.log`

**Reference Documentation**:
- Role Guide: `docs/roles/plan-reviewer.md`
- Operations Runbook: `docs/reference/plan-reviewer-operations.md`
- Roadmap Spec: `docs/roadmap/autonomous-execution-phases.md` § AUTO-022 (lines 1537-1640)

---
*This template enforces the standards required for production-quality code.*
