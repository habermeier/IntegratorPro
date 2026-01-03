# Full Review — Manual Code/Design Review (Repeatable Prompt)

Purpose
- Provide a reusable, evidence-driven review prompt and process for ANY source code or design change. This is a manual role (not automated multi-agent). The Tech Lead may play this role.

One‑Line Prompts (re‑entrant)
- Start: `read docs/roles/full-review.md start review`
- Continue: `read docs/roles/full-review.md continue review`
- Finish: `read docs/roles/full-review.md finish review`

Scope & Who
- Applies to any repo/component/language. Reviewer is a senior engineer following the Engineering Handbook. The Tech Lead may assume this role when needed.

Required Reads (before reviewing)
- `docs/AGENTS.md` (universal rules)
- `docs/engineering_handbook.md` (gates, coding standards)
- Module assignment (if any), e.g., `docs/roadmap/assignments/...`
- Related ADRs / Sunsets / Workspace Policy (as referenced by the change)

General Review Prompt (Copy/Paste)
```
You are performing a MANUAL, evidence‑backed full review of a code/design change.

Objectives
- Validate correctness, reliability, observability, testability, performance, security, naming/semantics, API/UX fit, and scope compliance.

You MUST
1) Run and paste FULL outputs (no summaries; include commands run):
   - **Workspace Check (Build/QA only)**: For Build/QA assignments, verify cargo workspace is quiet before heavy builds/tests:
     • `./tools/qa/check_quiet_cargo_workspace.sh` (exit 0 = quiet, exit 1 = busy/BLOCKED)
     • If busy, treat assignment as BLOCKED and document conflicting processes
     • See `docs/engineering-handbook.md` § Build/QA Workspace Check for details
   - Formatting: project standard (e.g., `cargo fmt --all --check`, `ruff --format`, `prettier --check .`)
   - Build: project standard (e.g., `cargo build`, `npm run build`, `mvn -q -DskipTests=false -e -B -V -U -Dmaven.test.skip=false verify`)
   - Lint (Touched Files Rule): run repo‑standard lint (e.g., `cargo clippy --all-targets --all-features -- -D warnings`, `eslint`, `ruff`, `golangci-lint`).
     • FIX ALL lint violations in files you modified this cycle (even pre‑existing in those files).
     • If remaining warnings are ONLY in untouched files, proceed; paste output and note them.
     • Include `git diff --name-only` to prove touched files are clean.
   - Tests: targeted tests for the change and the project’s test entry (e.g., `cargo test`, `npm test`, `pytest`, `go test ./...`, `mvn test`). Paste failures verbatim.
   - Repo checks/CI parity: run project checks (e.g., `./tools/repo-check/validate_root.sh`, `./tools/qa/compliance/check_docs_links.sh`) and confirm mapping to CI workflows.

2) Provide evidence with file:line citations
   - Use path:line references (e.g., `src/actors/supervisor/orchestrator_ops.rs:35`).
   - For each claim, include the exact snippet/diff or log showing it.

3) Discover and rank issues (10–20 items)
   - Find 10–20 distinct issues across pillars: Correctness, Reliability, Observability, Testability, Performance, Security, Naming/Semantics, API/UX, Architecture.
   - For each issue: Title, Severity (P0 critical / P1 high / P2 moderate), Impact, Evidence (path:line + snippet), Repro/Command, Suggested Fix (concrete), Effort (S/M/L).
   - Stack‑rank by user impact × likelihood; break ties by effort/benefit ratio.

4) Cut Rule (exclude nitpicks)
   - REMOVE items that are style‑only (with no functional risk), not reproducible, out of current scope, or trivial renames without semantic effect.
   - KEEP naming/semantics issues ONLY when they impair comprehension, API clarity, or future maintenance.

5) Group & classify
   - After ranking and cutting, group issues by pillar and/or subsystem; call out cross‑cutting themes.

6) Handbook Compliance Checklist
   - Cite `docs/engineering_handbook.md` sections for: formatting, lint policy (Touched Files Rule), testing levels, logging/telemetry, error handling (no panics/unwraps in prod paths), concurrency safety, docs/rustdoc coverage, dependency policy.
   - For each, show concrete proof (diffs, code refs, command outputs). Note any variances and rationale.

7) Naming & Layout Checklist (Workspace Policy)
   - Validate file placement and naming per `docs/workspace-policy.md`:
     • Durable docs in `docs/` (roadmap/specs/ADRs); short‑lived doc scripts in `docs/current/tools/`; durable scripts in `tools/<category>/`; short‑lived non‑doc scripts in `tools/misc/`; ephemeral outputs in `tmp/` (never committed).
     • No generated artifacts in repo root; move to `tmp/` or summarize into `docs/current/work/`.
     • Scripts path‑agnostic: avoid hardcoded relative paths; print `--help` with correct usage and repo‑root detection if needed.
     • Tests in correct locations and naming (e.g., Rust `tests/` for integration, `#[cfg(test)]` in modules for unit; Node `tests/` or `__tests__`; Python `tests/`).
     • Language naming conventions followed (e.g., Rust snake_case modules/files, Go package directory names, JS/TS kebab/snake as per project). Call out deviations only when they impair discoverability or tooling.
     • Config placement respects current policy (e.g., `.qbert/` for config; no stale root configs if policy has moved).
   - Evidence to paste:
     • `./tools/repo-check/validate_root.sh` output and `.github/workflows/root-layout-check.yml` mapping.
     • `rg -n "^(tmp/|tools/misc/|docs/current/tools/)" -S` scans (or equivalent) to show artifacts/scripts in correct buckets.
     • List any misplaced files with proposed new paths and confirm doc references would be updated.

Deliverables
- Ranked Top‑N issues (post‑cut), grouped/classified, each with evidence and fixes.
- Command outputs proving gates/tests actually ran.
- Proposed follow‑up tickets (titles + file paths + scope notes). Do NOT change statuses yourself.

Re‑entry
- If context is lost, re‑run the commands above and continue from the ranked issues list. Keep the report self‑contained.
```

Reviewer Notes
- Anti‑fabrication: All artifacts (logs/snapshots/timelines) MUST be generated by running code paths under test; never hand‑craft evidence.
- Language agnostic: Use the project’s standard linters/formatters/tests. When unclear, follow common defaults:
  • Rust: `cargo fmt`, `cargo build`, `cargo clippy -- -D warnings`, `cargo test`
  • Node/TypeScript: `npm run fmt:check`, `npm run build`, `npm run lint`, `npm test`
  • Python: `ruff check`, `pytest -q`, `black --check .`
  • Go: `go fmt ./...`, `go vet ./...`, `golangci-lint run`, `go test ./...`
  • Java: `mvn -B -q -e -DskipTests=false verify`
- Naming/Semantics pillar: prioritize API clarity, domain correctness, and intent‑revealing names over local cleverness.
- NO‑POLLING rule (readiness): For readiness/state‑wait code, new patterns MUST use subscription‑based APIs (StateSubscription/ServerReady helpers). **Recommended local QA: `./tools/qa/run-all-qa-checks.sh --fast`** (runs NO-POLLING check internally along with other quality gates; `--full` mode reserved for Build/QA workers). This check is also enforced in CI via `.github/workflows/no-polling-check.yml`. Any new readiness polling detected by the check is a **P0 issue** and must be refactored to subscription patterns before approval. Standalone check: `./tools/qa/check_no_polling.sh` or manual confirmation with `rg "sleep\\(" tests src` and `rg "/ping" tests src` if needed. **Canonical helpers**: Review `tests/common/harness/readiness.rs` and `tests/common/harness/http_worker_ready.rs` when validating readiness patterns in new work.

Result Template (Copy/Paste)
```
# Full Review Report — <Module/Change Name>

## Summary
- Scope reviewed, pillars covered, notable outcomes (1–3 lines)

## Commands & Outputs
- <formatter cmd + output>
- <build cmd + output>
- <lint cmd + output + touched files clean proof>
- <tests cmd + output>
- <repo/CI checks + mapping>

## Top Issues (Ranked, 10–20)
1) <Title> — P0 | Impact: <text> | Effort: <S/M/L>
   - Evidence: path:line + snippet/log
   - Repro: <command>
   - Fix: <concrete change>
...

## Cuts (Excluded)
- <brief rationale per removed item>

## Grouping / Themes
- Pillar → Issues

## Handbook Compliance
- <rule>: evidence path:line / output
- Variance: <if any, with rationale>

## Follow‑Ups (Tickets to file)
- <ticket title> — paths, scope, acceptance notes
```
