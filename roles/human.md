# Human → Tech Lead Cut-and-Paste

> **Forward-Looking Note (AUTO-00X-P3)**: This file contains the manual preamble currently used for Tech Lead cycles. Future automation (tracked in AUTO-00X-P4/P5/P6) will migrate these instructions to `.qbert/prompts/fixed/` where they will be automatically injected by HIN or `qbert-ctrl`, eliminating manual copy-paste. When `.qbert/`-driven prompts become available, operators should prefer those over manually editing this file. See `docs/roadmap/human-preamble-automation.md` for the automation design.

You are the tech lead (roles/tech-lead.md).  Perform a full review: roles/full-review.md
- Review all worker result files (roles/full-review.md) and summarize findings + roadmap adjustments.
- Confirm the shared-filesystem plan for the next cycle (identify who runs heavy gates or if a QA worker will handle them).
- Follow roles/tech-lead.md for assignment handoff; delete stale tmp/assignments/ and tmp/worker/ artifacts.
- Make sure you follow the format for cut-n-paste and the assignments as outlined in roles/tech-lead.md.
- Explicitly instruct the tech lead to verify that all worker assignments from the previous cycle have both assignment files and completed result files before creating the next cycle.
- Reflect who is going to do what in the next cycle, and you must decide what can be safely parallel tracked or what cannot. ONLY give assignments in one cycle that don't depend on order of execution in that cycle (worker‑X cannot depend on worker‑Y within the same cycle).
- As the tech-lead, you should delete the previous assignment/result files for P16 before issuing these to keep tmp/assignments/ and tmp/worker/ clean.
- reivew the road map (docs/roadmap/roadmap.md, docs/roadmap/autonomous-execution-phases.md, ...), review the full-review results you created, and merge that into the next step of assignments.  

Scope policy (AI CLI agents): aim for minimum viable complexity per cycle
- Minimum‑complexity floor: Bundle related work so each assignment delivers a substantive, end‑to‑end outcome (implementation + targeted tests + docs). Prefer 2–3 cohesive subtasks within one assignment over many micro‑tickets.
- Cut‑and‑paste economy: Avoid cycles that produce only trivial changes. If a task would be < one meaningful artifact, merge it with adjacent work on the same subsystem.
- Automation bias: Prefer assignments that reduce future manual steps (e.g., promote scripts to `qbert-ctrl` commands, add telemetry, tighten runbooks).
- Parallelism rule: No in‑cycle dependencies. Hold back sequential work to the next cycle.
- Lane & gates: Declare gate lane (RAG vs Full) and who runs heavy gates. Prefer targeted checks unless a Build/QA worker is explicitly scheduled.
- Change surface ceiling: Keep ≤ 5–8 files touched and ≤ 300 non‑blank lines per file; trigger Refactor Guard if exceeded.
- Unknowns rule: If >30% unknowns, schedule a short spike/evidence assignment first—but require concrete artifacts (logs, minimal PoC, or measurements), not just notes.

Cycle scoping checklist
- Does each worker deliver an end‑to‑end outcome (code + targeted tests + doc touch)?
- Are 2–3 cohesive subtasks bundled per assignment to avoid micro‑cycles?
- Is the lane declared and heavy‑gate ownership explicit?
- Are assignments parallel and independent this cycle?
- Will evidence (logs/telemetry/reports) fit cleanly in a single result file per worker?

No mid‑cycle scope changes
- Do not revise or re‑scope in‑flight assignments once issued. Capture improvements in a short forward‑looking note and apply them to the next cycle.
- Use `tmp/next-cycle-scope.md` (or your team’s preferred scratchpad) to jot scope deltas during a cycle without interrupting workers.

Minimum‑complexity floor (forward‑looking)
- Each engineering assignment should produce at least two of: code change, targeted tests, doc/runbook update. Pure‑docs tasks are acceptable when they consolidate dispersed guidance into a single entry point.
- Prefer subsystem‑level objectives that bundle 2–3 related subtasks (e.g., feature + tests + CLI UX) over many micro tickets.

Human Level Review
- Explain in 3-4 sentences what we did last cycle, the quality of the work, and what if anything we need to fix-forward
- Explain in 3-4 sentences what the next cycle entails
- Explain in 2-3 sentences where we are relative to our project objectives, and how far away we are from a human being able to interact with HIN, and have that kick off or adjust a team of AI agents that are planning, monitoring, generating, and validating until the request is completed.  Example request:  "fix all clippy errors in the best manner possible without reducing functionality / breaking the system".  Or "Refactor the cargo / build process creating libraries / components so we can logically modify code in an area witout recompiling and validating all other code".

PLEASE follow the above carefully AND produce the next set of assignemnts.  Include the full-review.md findings, and fold that into the next set of tasks while making forward progress.

VERY IMPORTANT: create assignment files and DOUBLE check that they exist before telling me the cycle is ready.

