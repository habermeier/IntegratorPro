# Project Maintenance Role

## Core Responsibility

Execute comprehensive project maintenance cycles to ensure codebase health, eliminate technical debt, and maintain strict adherence to Engineering Handbook standards. The maintenance role holder performs systematic cleanup, file organization, and quality assurance tasks when assigned a "maintenance check" or "maintenance cycle".

## Role Purpose

This role exists to prevent project degradation through proactive cleanup and systematic quality enforcement. The maintenance role holder serves as the guardian of project organization, file hygiene, and architectural discipline.

## Core Responsibilities

### 1. Automated Tool Execution
- Execute project file scanner to detect and clean problematic files
- Review scanner output and address all identified issues
- Maintain consistent file organization standards
- Enforce build system quality gates

### 2. Manual Quality Assessment
- Perform manual file system health checks beyond automated detection
- Identify architectural inconsistencies and organizational problems
- Review project structure for clarity and maintainability
- Ensure all files serve a clear purpose in the project

### 3. Technical Debt Prevention
- Address file size violations before they become critical
- Remove duplicate or obsolete modules
- Clean up temporary and backup files
- Maintain proper directory structure and naming conventions

### 4. Quality Gate Enforcement
- Verify all Engineering Handbook standards are met
- Ensure build, lint, and test suite health
- Validate pre-commit hook compliance
- Maintain 300-line file limit adherence

## Maintenance Execution Cycle

When assigned a maintenance check, execute this complete cycle:

### 1. Pre-Cycle Assessment
**MANDATORY**: Always start with project file scanner:

```bash
# Scan for file issues and cleanup opportunities
./tools/scan_project.sh

# If safe, run with cleanup flag
./tools/scan_project.sh --clean
```

### 2. Automated Cleanup Execution
**What the scanner checks**:
1. Backup and temporary files (.old, .bak, .swp, ~)
2. Duplicate modules (e.g., compat.rs vs compatibility.rs)
3. Disabled test files (.disabled)
4. Large files (>10MB)
5. Old worker artifacts (>7 days)
6. SCREAMING_CASE filenames
7. Orphaned log files outside tmp/log
8. Source files exceeding 300-line limit
9. Build.rs enforcement status

**Action Required**: Address ALL issues identified by the scanner before proceeding.

### 3. Manual File System Health Check

**Purpose**: Identify files that seem out of place or don't belong in the project structure

**What to check** (skip tmp/ directory):
1. **Root directory pollution**:
   - Stray test files (e.g., test_server.py in root)
   - Debug logs outside tmp/log (e.g., qbert_debug.log)
   - Backup Cargo.toml files (Cargo.toml.backup)
   - Non-standard markdown files (AGENTS.md, GEMINI.md vs docs/)

2. **Backup and temporary files**:
   - .bak files (e.g., src/app/snapshot.rs.bak)
   - .old, .swp, ~ files
   - .orig files from merge conflicts

3. **Misplaced Python files**:
   - Python test files outside examples/ or tests/
   - .pyc compiled files

4. **Log file locations**:
   - Log files in root directory
   - Log files outside tmp/log/

5. **Configuration duplicates**:
   - Multiple versions of config files
   - Backup copies of TOML files

**Action items**:
- Move misplaced files to correct locations
- Delete obvious temporary/backup files
- Archive important but outdated files
- Update .gitignore for recurring patterns
- Don't delete files immediately - list them first for review

### 4. Quality Gate Verification

**MANDATORY**: Before completing maintenance cycle, verify all quality gates pass:

```bash
cargo build              # MUST compile without errors
cargo clippy --all-targets --all-features -- -D warnings  # MUST pass
cargo test               # MUST pass
cargo fmt --all --check  # MUST be formatted
```

**Include the output of these commands as proof of maintenance cycle completion.**

### 5. Issue Resolution and Documentation

Document all identified issues and their resolutions in the maintenance cycle report.

## Common Issues and Resolutions

### Critical Issues (Address Immediately)
#### Duplicate Actor Modules
**Issue**: Both `src/actors/compat.rs` and `src/actors/compatibility.rs` exist
**Resolution**: Review both files, merge necessary functionality, remove duplicate

#### Files Exceeding 300 Lines
**Issue**: Source files over project limit
**Resolution**: Refactor following Engineering Handbook guidelines:
- Extract logical modules
- Create trait abstractions
- Split by domain boundaries (not arbitrary splits)

#### Build Failures
**Issue**: Project doesn't compile or quality gates fail
**Resolution**: Must be fixed before completing maintenance cycle
- Review error messages and fix compilation issues
- Address clippy warnings
- Fix failing tests
- Format code properly

### Standard Cleanup Issues
#### Orphaned Logs
**Issue**: Log files outside tmp/log directory
**Resolution**: Move to tmp/log or delete if unnecessary

#### Backup File Accumulation
**Issue**: .bak, .old, .swp files throughout project
**Resolution**: Review and delete after confirming they're not needed

#### Worker Artifact Buildup
**Issue**: Old tmp/worker*.md files accumulating
**Resolution**: Remove files older than current development cycle

## File Organization Standards

### Directory Structure Enforcement
```
qbert/
├── src/           # Source code only
├── tests/         # Integration tests
├── benches/       # Benchmarks
├── docs/          # Documentation
├── tools/         # Maintenance scripts
├── tmp/           # Temporary files
│   └── log/       # All log files here
└── deployment/    # Deployment configs
```

### Naming Rules Enforcement
- Use snake_case for all files and directories
- No SCREAMING_CASE (except LICENSE, README)
- Descriptive names over abbreviations
- Test files end with `_test.rs` or in tests/

### Cleanup Priority Matrix

| Priority | Type | Action | Response Time |
|----------|------|--------|---------------|
| P0 | Build breaking | Fix immediately | Current cycle |
| P1 | Security files | Remove immediately | Current cycle |
| P2 | Temp/backup files | Clean with scanner | Current cycle |
| P3 | Old worker files | Archive/remove | Current cycle |
| P4 | Large refactors | Plan and execute | Next cycle |

## Automated Enforcement Understanding

### Pre-commit Hooks (Must Pass)
The project uses strict pre-commit hooks that enforce:
- `cargo fmt` - Code formatting
- `cargo clippy` - Linting with all warnings as errors
- `cargo test` - All tests must pass

### Build-time Checks (Must Pass)
- 300-line file limit (build.rs)
- No unwrap/expect in production code
- No magic numbers/strings
- Cognitive complexity limits

## Troubleshooting Guide

### Scanner Reports Issues After Cleanup
Some issues require manual intervention:
- Duplicate modules need code review before merging
- Files over 300 lines need refactoring
- Some logs may be needed for debugging

### Build Fails Due to File Limits
1. Check which file exceeds limit: `cargo build`
2. Refactor following handbook guidelines
3. Extract logical modules, not arbitrary splits

### Quality Gates Fail
1. Address each failure systematically
2. Do not use `--no-verify` to bypass (except emergencies)
3. Fix root causes, not symptoms
4. Document any workarounds needed

## Maintenance Cycle Completion Requirements

### Result Documentation
Create a maintenance cycle report documenting:
- Scanner output and issues addressed
- Manual issues found and resolved
- Quality gate verification results
- Any outstanding issues requiring future attention
- Recommendations for preventing similar issues

### Success Criteria
A maintenance cycle is complete only when:
- [ ] Project file scanner shows no critical issues
- [ ] Manual file system health check completed
- [ ] All quality gates pass (build, clippy, test, fmt)
- [ ] Maintenance cycle report created
- [ ] All P0-P2 issues resolved
- [ ] P3-P4 issues documented for future cycles

## Escalation Protocol

### When to Escalate
- Build or quality gates fail despite multiple attempts
- Conflicting requirements between file organization and functionality
- Uncertainty about whether files should be deleted
- Major architectural violations discovered

### How to Escalate
- Document specific issue with steps attempted
- Provide clear recommendation or question
- Include relevant file paths and error messages
- Request specific guidance needed to proceed

## Role Success Metrics
- Zero build/quality gate failures after maintenance
- Consistent file organization standards
- Proactive technical debt prevention
- Clear documentation of all actions taken
- Efficient resolution of identified issues