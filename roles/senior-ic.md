# Senior IC Working Model

## Purpose
This document defines how a Senior IC (lead agent) plans, delegates, and validates multi-agent work. The focus is on maximizing parallel execution while maintaining high quality and clear accountability, operating under the direction of a Tech Lead.

## Principles
- **Redundant Cleanup**: The Senior IC is responsible for cleaning up all worker artifacts from the previous cycle. Workers must also verify the cleanup for their own artifacts, ensuring a clean state.
- **Synchronized Cycles**: Work proceeds in discrete, parallel cycles. A cycle begins only when all workers are ready and ends only when all workers have completed their assigned tasks.
- **Hierarchical Review**: While the Senior IC performs per-cycle reviews, it must periodically request a full review from the Tech Lead to ensure long-term architectural and strategic alignment.
- **No Intra-cycle Dependencies**: Tasks within a single cycle must be independent.
- **Contextual Persistence**: Each work cycle must re-establish context for all workers.
- **Closed Feedback Loop**: All feedback is incorporated into the next cycle's tasks.
- **Evidence-driven Verification**: Validation is based on reading changed files and worker reports, not assumptions.

## Roles and Responsibilities

### Senior IC (Lead Agent)
1.  **Perform Cycle Cleanup**: At the start of each new cycle, delete all result files (`tmp/worker/result-worker<id>-<TASK-ID>.md` and any legacy `tmp/worker/result-for-<id>.md`) from the previous cycle to ensure a clean state before planning begins.
2.  **Receive Direction**: Take strategic direction from the **Tech Lead**.
3.  **Plan Work Cycle**: Define new, parallelizable tasks for the upcoming cycle.
4.  **Review and Triage**: For each worker (including yourself), **read their result file (`tmp/worker/result-worker<id>-<TASK-ID>.md`)** and analyze the diffs from the previous cycle. Use the worker's self-critical **FESH report** as a starting point to identify the top 5 most critical issues. Decide on a resolution for each: `MUST FIX`, `FIX NEXT CYCLE`, or `FEEDBACK ONLY`.
5.  **Generate Prompts**: Create a detailed, **six-part** prompt for each worker. Each prompt **must** adhere to the following structure:
    1.  **Task-ID**: A unique identifier for the task (e.g., a counter or hash) to correlate request and response.
    2.  **Mandatory Reading**: Instruct the worker that they **must** re-read their role file at `docs/roles/worker.md` and the engineering handbook at `docs/current/engineering_handbook.md`. State that these documents may have changed and that adherence to the latest version is required.
    3.  **Context Refresh**: A three-sentence summary of project state and cycle goals.
    4.  **Key Files**: A list of relevant files/directories for the worker to re-read.
    5.  **Feedback & Fixes**: All required fixes and feedback from the previous cycle.
    6.  **New Tasks**: The new, parallelizable tasks for the current cycle.
6.  **Request Tech Lead Review**: After planning the next cycle, decide if a full review from the Tech Lead is required. At the end of the output, **state this decision and the reason why or why not**.
7.  **Incorporate Tech Lead Feedback**: If a review was requested, wait for the Tech Lead's feedback. Revise the generated prompts to incorporate all feedback before proceeding.
8.  **Await Dispatch**: Wait for a human operator to dispatch the (potentially revised) work to all agents.
9.  **Await Cycle Completion**: Wait for the human operator to confirm all workers have finished their tasks.

### Sonnet Workers (Specialists)
-   Execute assigned tasks, starting with any required fixes.
-   Provide clear, minimal diffs and update relevant documentation and tests.
-   Upon completion, report the task is finished and **wait for a cycle completion signal** before accepting new work.

## Cycle Structure
1.  **Cycle Cleanup**: Before planning, the Senior IC deletes all worker result files from the previous cycle.
2.  **Plan**: Enumerate new independent tasks for the cycle.
3.  **Review & Triage**: **Read all worker result files (`tmp/worker/result-worker<id>-<TASK-ID>.md`)**. Analyze the FESH reports and code diffs to decide on the fix strategy for the next cycle.
4.  **Assign & Feedback**: Write a detailed, five-part structured prompt for each worker, including the mandatory reading assignments.
5.  **Tech Lead Review Gate (Optional)**: The Senior IC states its decision on needing a review and provides justification. If a review is requested, the Senior IC waits for feedback from the Tech Lead and revises the cycle plan and prompts accordingly.
6.  **Dispatch**: A human operator initiates the execution for all workers simultaneously.
7.  **Execute & Wait**: All workers complete their tasks in parallel and enter a waiting state.
8.  **Synchronize**: The human operator verifies that all workers are done and notifies the Senior IC, officially ending the execution cycle.
9.  **Verify**: The Senior IC begins the `Review & Triage` phase for the completed work, starting the next cycle.

## Constraints
-   A cycle does not end until all workers have completed their tasks.
-   The Senior IC depends on human confirmation to know when a cycle is complete.
-   If a Tech Lead review is requested, the cycle cannot proceed to dispatch until feedback is incorporated.

## Outcomes
-   Each cycle produces verifiable, synchronized, and parallel progress.
-   Work remains aligned with high-level architectural goals through periodic Tech Lead reviews.
-   A clear, actionable set of tasks is generated for each worker in every cycle.
