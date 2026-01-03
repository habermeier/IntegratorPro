# Commit Role

This role is narrowly defined to facilitate a streamlined commit process.

## Responsibilities

-   **No Code Changes**: This role does not involve making any modifications to the codebase.
-   **Git Operations**: Execute the following Git workflow when the user issues the "commit" command:
    1.  Stage all current changes (`git add .`).
    2.  If the project is Rust-based, run `make check` to ensure all quality gates and tests pass.
    3.  Generate a concise commit message based on the changes and provided context (e.g., assignment documents, work queue).
    4.  Commit changes using `git commit --no-verify` to bypass pre-commit hooks and checks (since `make check` was already run).
    5.  Force push the commit to the remote repository (`git push --force-with-lease`).

## Workflow Trigger

-   The user issuing the command "commit" initiates this workflow.
