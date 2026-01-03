# Role: Handoff Protocol

## Purpose
The Handoff Protocol ensures that technical context, active tasks, and critical environmental details are preserved between developer sessions. This is essential for preventing regression and reducing "re-learning" time for the next agent or human developer.

## Location & Lifecycle
- **File Path**: `/tmp/tech-lead-handoff.md` (or `/tmp/handoff.md`)
- **Persistence**: This file is **EPHEMERAL**. It should NOT be committed to the repository.
- **Trigger**: A handoff file MUST be created or updated at the end of every work session, or when context window limits (token usage) are approaching.

## Content Requirements
Every handoff file must include the following sections:

### 1. Critical Environmental Details
- **Testing URLs**: Specify exactly where the app should be tested (e.g., `http://localhost:3002`).
- **Required Ports**: List ports for API (3001), Dev Server (3002), etc.
- **Active Processes**: Note any long-running commands (e.g., `npm run dev`).

### 2. Current State & Mission
- **Phase ID**: (e.g., `UI-FIX-P2`)
- **Status**: (🟢 Active / 🟡 Blocked / 🔴 Error)
- **Summary**: A high-level overview of what was achieved in the current session.

### 3. Active Work & Successor Tasks
- **Pending verification**: List items that were implemented but not yet fully QA'd.
- **Next steps**: Provide clear, actionable instructions for the next agent to pick up the thread.
- **Success Criteria**: Define what "done" looks like for the next phase.

### 4. Known Issues & Blockers
- **Critical Bugs**: Document any known crashes or regressions introduced.
- **Blockers**: List anything preventing the current mission from completing.

## Best Practices
- **Be Concise**: Focus on delta (what changed) and state (what is current).
- **Be Explicit**: Don't say "test the UI"; say "verify the Menu button in the top-left at <800px width".
- **Evidence-Based**: Reference specific files and line numbers where appropriate.

## Cut-and-Paste Handoff Template (MANDATORY)
At the end of your session, after updating `/tmp/tech-lead-handoff.md`, you MUST provide a final message containing a block exactly like the one below for the USER to copy into the next session:

```markdown
### 🔄 Session Handoff: [Context/Mission Name]
You are picking up from a previous session. Follow these steps to initialize:

1. **Role Identification**: Determine if you are acting as Tech Lead (`roles/tech-lead.md`) or Worker (`roles/worker.md`).
2. **Technical Context**: READ `/tmp/tech-lead-handoff.md` IMMEDIATELY. It contains the current mission, mandatory testing location (**localhost:3002**), and active blockers.
3. **Environment**: Ensure `npm run dev` is running and the app is accessible at `http://localhost:3002`.
4. **Resumption**: Execute the "Next Steps" listed in the handoff file.
```

---
*This protocol ensures zero-latency transitions between AI coding sessions.*
