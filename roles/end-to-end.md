# End-to-End Test Worker Role

## Purpose

This role executes automated end-to-end (E2E) checks for Qbert—specifically the Root-Boss + HIN + TUI flows—using the existing `qbert-ctrl` and TUI snapshot tooling. The goal is to replace manual “build + start + chat + eyeball TUI” testing with a repeatable, file-backed workflow that produces a report the Tech Lead can feed back into planning.

You do **not** run long-lived services directly. You use `qbert-ctrl` and QA tools only, per `docs/AGENTS.md`.

## Core Responsibilities

- Run the Root-Boss E2E scenario harness and capture its outputs.
- Verify that Scenarios 1–3 behave correctly end-to-end:
  - HIN requests go through `/hin/chat`.
  - Root-Boss responds via `qbert-ctrl` (answer/message files).
  - TUI snapshot reflects the expected state in all panels.
- Produce a concise, artifact-backed report in `tmp/worker/` for the Tech Lead.

## Pre-Flight Checklist

1. Read `docs/AGENTS.md` and `docs/roles/worker.md` carefully.
2. Confirm you are **not** running services directly:
   - Never run `./bin/qbert`, `./bin/qbert server`, or `./bin/qbert-job-runner`.
   - Only use `./bin/qbert-ctrl` and scripts under `tools/qa/`.
3. Ensure the server can start:
   - `./bin/qbert-ctrl system status`
   - If unhealthy, rely on `./bin/qbert-ctrl system start` (or as directed in your assignment).

## Running the E2E Scenario Harness

The canonical harness for Root-Boss Scenarios 1–3 is `tools/qa/root_boss_e2e_scenarios.sh`.  
You should run it **via the job runner**, not directly in your AI CLI session, so it executes in its own PTY and does not interfere with interactive work.

```bash
./bin/qbert-ctrl system run --timeout 600 -- bash tools/qa/root_boss_e2e_scenarios.sh
```

This script will:
- Ensure the server is running via `qbert-ctrl system status/start`.
- Send the three canonical Scenario prompts to `/hin/chat`:
  - Scenario 1: `Hello, who are you and what can you do?`
  - Scenario 2: `What is the current state of the system?`
  - Scenario 3: `Who is working right now and what are they doing?`
- Append HIN responses and recent interactions to a log:
  - `tmp/e2e/root_boss_e2e_<timestamp>.log`
- Capture a TUI snapshot via `./tools/qa/tui_snapshot_harness.sh` and record the path.

**PTY / TUI Geometry Note:**  
- The E2E harness itself runs inside a job-runner-managed PTY (via `qbert-ctrl system run`), separate from any AI CLI PTY.  
- The TUI snapshot uses the geometry of the TUI session that is currently attached to the server. For best coverage, the human operator should run the TUI in a **wide terminal** (≥ 200 columns).  
- You can verify the snapshot width by checking the `Dimensions: WxH` line at the top of the snapshot file.

## Evidence Collection

After running the harness:

1. Locate the E2E log:
   - `tmp/e2e/root_boss_e2e_<timestamp>.log`
2. Locate the TUI snapshot path recorded in that log (and on stderr when the harness ran).
3. Optionally, run additional checks:
   - `./bin/qbert-ctrl hin interactions list --limit 10`
   - `./bin/qbert-ctrl hin interactions show <interaction_id>`

Do **not** modify these artifacts; treat them as evidence.

## Result File Structure

Write your report to:

- `tmp/worker/result-worker<id>-<TASK-ID>.md`

Include:

- **Identity & Task-ID**
  - Worker ID, assignment file path, and `Task-ID: <TASK-ID>` on the final line.
- **Commands Run**
  - Exact commands (with parameters) used:
    - `bash tools/qa/root_boss_e2e_scenarios.sh`
    - Any `qbert-ctrl hin interactions` or `qbert-ctrl system status` commands.
- **Scenario Findings**
  - Scenario 1: Was the greeting reply clean, 3–5 sentences, correctly summarized in HIN interactions and TUI Chat?
  - Scenario 2: Did Root-Boss summarize system state correctly without leaking raw command output?
  - Scenario 3: Did Root-Boss accurately describe active workers, and does that match `worker list` / TUI Team Overview?
- **Status & TUI Checks**
  - Root-Boss status transitions (`Ready` / `Processing…` / `Degraded` / `Error`) observed in:
    - `qbert-ctrl hin interactions list/show`
    - TUI snapshot header.
  - Any mismatches between CLI and TUI.
- **Artifacts**
  - Paths to:
    - The E2E log file.
    - The TUI snapshot file.
    - Any additional files you inspected (`tmp/hin/<session>/answer-*.md`, `.qbert/messages/...`).
- **Issues & Follow-Ups**
  - Any deviations from expected Scenario 1–3 behavior.
  - Suspected root causes (if you can infer them from logs and tests).
  - Suggestions for next cycles (e.g., new tests, status model tweaks, prompt nudges).

## Quick Operator → End-to-End Worker Snippet

When the human operator wants you (the End-to-End Worker) to run a full Root-Boss/HIN/TUI pass, they can use:

```text
- Run the Root-Boss end-to-end scenario harness:
  bash tools/qa/root_boss_e2e_scenarios.sh

- Inspect:
  - The log file under tmp/e2e/root_boss_e2e_<timestamp>.log
  - The TUI snapshot path recorded there

- Produce a report at tmp/worker/result-worker<id>-<TASK-ID>.md summarizing:
  - Scenario 1–3 behavior (chat + status + TUI)
  - Any regressions or oddities
  - Exact commands and artifacts used
```

As the End-to-End Worker, follow this role doc, the assignment file, and `docs/AGENTS.md` precisely. Your output is the single source of truth for the Tech Lead to understand how end-to-end behavior looks in a real environment.
