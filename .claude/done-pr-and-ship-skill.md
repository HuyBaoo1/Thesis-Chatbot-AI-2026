# `done, pr` Workflow + `/ship` Skill (Portable Bundle)

> Self-contained file. Copy this single `.md` sang máy khác để cài đặt cả quy trình `done, pr` và skill `/ck:ship` cho Claude Code.

---

## Mục lục

1. [Cách cài lên máy mới](#1-cách-cài-lên-máy-mới)
2. [Quy trình `done, pr` (full cycle)](#2-quy-trình-done-pr-full-cycle)
3. [Skill `/ck:ship` — SKILL.md](#3-skill-ckship--skillmd)
4. [Reference: ship-workflow.md](#4-reference-ship-workflowmd)
5. [Reference: auto-detect.md](#5-reference-auto-detectmd)
6. [Reference: pr-template.md](#6-reference-pr-templatemd)

---

## 1. Cách cài lên máy mới

Trên máy đích (đã cài Claude Code):

```bash
# 1. Tạo skill folder
mkdir -p ~/.claude/skills/ship/references

# 2. Copy 4 phần của skill từ file này:
#    - Section 3 → ~/.claude/skills/ship/SKILL.md
#    - Section 4 → ~/.claude/skills/ship/references/ship-workflow.md
#    - Section 5 → ~/.claude/skills/ship/references/auto-detect.md
#    - Section 6 → ~/.claude/skills/ship/references/pr-template.md

# 3. Verify
ls ~/.claude/skills/ship/
ls ~/.claude/skills/ship/references/

# 4. Khởi động lại Claude Code → /ck:ship sẽ available
```

**Quy trình `done, pr`** (Section 2): paste vào `CLAUDE.md` của repo (commit vào git để cả team dùng), hoặc paste vào `~/.claude/CLAUDE.md` để áp dụng global.

**Yêu cầu môi trường:**
- `git` + `gh` (GitHub CLI, đã `gh auth login`)
- Có agent `tester`, `code-reviewer`, `journal-writer`, `docs-manager` (thuộc CK stack); nếu không có → xem **Section 1.1** ngay dưới.

---

## 1.1. Hướng dẫn cho máy KHÔNG có claudekit

Skill `/ck:ship` được viết để delegate sang 4 subagent của CK stack: `tester`, `code-reviewer`, `journal-writer`, `docs-manager`. Nếu máy đích **không cài claudekit**, có 2 cách dùng:

### Cách 1 — Chạy với cờ skip (zero-config, khuyên dùng)

```
/ck:ship --skip-review --skip-journal --skip-docs
```

Pipeline còn lại: pre-flight → link issues → merge → **tests** → version → changelog → commit → push → PR.

> ⚠️ Tests vẫn chạy được mà không cần `tester` subagent — Claude sẽ tự chạy `npm test` / `pytest` / etc. trực tiếp qua Bash. Bạn chỉ cần **patch nhỏ Step 4** ở `ship-workflow.md` (xem Cách 2 bên dưới).

Nếu thấy phiền, có thể skip luôn tests:
```
/ck:ship --skip-tests --skip-review --skip-journal --skip-docs
```

### Cách 2 — Patch skill để inline thay vì delegate (one-time setup)

Sau khi copy skill xong, edit `~/.claude/skills/ship/references/ship-workflow.md`:

**Step 4 (Run Tests)** — đổi:
> `2. Delegate to `tester` subagent — don't inline test execution`

thành:
> `2. Auto-detect test command (xem auto-detect.md), chạy trực tiếp qua Bash, parse exit code`

**Step 5 (Pre-Landing Review)** — đổi:
> `2. Delegate to `code-reviewer` subagent with the diff`

thành:
> `2. Đọc diff inline, tự review theo 2-pass model (critical + informational). Hoặc skip nếu --skip-review.`

**Step 8 (Journal)** — đổi toàn bộ thành:
> `Skip silently nếu không có /ck:journal skill. Nội dung tóm tắt sẽ nằm trong PR body.`

**Step 9 (Docs Update)** — đổi toàn bộ thành:
> `Skip silently nếu không có /ck:docs skill. Cập nhật docs thủ công nếu cần.`

Sau patch, `/ck:ship` chạy đầy đủ trên máy không có claudekit, không cần thêm cờ.

### Tóm tắt: tối thiểu cần gì?

| Component | Bắt buộc? | Lý do |
|---|---|---|
| `git` | ✅ | Mọi step git |
| `gh` CLI | ✅ | Step 2 (issues) + Step 12 (create PR) |
| `tester` subagent | ❌ | Có thể inline qua Bash |
| `code-reviewer` subagent | ❌ | Skip bằng `--skip-review` |
| `journal-writer` subagent | ❌ | Skip bằng `--skip-journal` |
| `docs-manager` subagent | ❌ | Skip bằng `--skip-docs` |
| Test runner (npm/pytest/...) | ❌ | Skip bằng `--skip-tests` nếu chưa có |

→ **Tối thiểu chỉ cần `git` + `gh`** là chạy được skill ở chế độ skip-all-subagents.

---

## 2. Quy trình `done, pr` (full cycle)

> Paste section này vào `CLAUDE.md` của repo (hoặc global `~/.claude/CLAUDE.md`).

When the user says **"done, pr"**, execute the full cycle below **exactly**.

### Step 0: Ensure on a feature branch

Run `git branch --show-current` first.

**If already on a feature branch (anything other than `main`)** → skip to Step 1.

**If on `main`** → STOP. Do not proceed. Tell the user:

> "You're on `main`. Create an isolated worktree (e.g. `git worktree add ../<slug> -b feat/<slug>`), then open Claude Code in the new directory to continue."

**NEVER run `git checkout main` or `git checkout -b` from a shared session** — this disrupts all other running sessions.

### Step 1: Run `/ck:ship`

Invoke the `/ck:ship` skill — it handles tests, review, version bump, changelog, commit, push, and PR creation automatically. Show the PR URL when done.

### Step 2: Wait for bot review

After PR is created, check bot review:

```bash
gh pr view <pr-number> --comments  # read bot comments (e.g. phoenix bot, copilot, etc.)
```

- If bot flags issues → tell the user what to fix, wait for instruction.
- If no blocking issues → proceed to Step 3.

### Step 3: Merge to main

```bash
gh pr merge <pr-number> --merge --delete-branch
```

Confirm merge succeeded before continuing.

### Step 4: Monitor CI/CD

After merge, offer the user two options:

**Option A (recommended) — non-blocking:**
Offer to schedule a background agent to check CI/CD status in ~8 minutes. This keeps the current session free.

**Option B — check manually when ready:**
```bash
gh run list --workflow=deploy.yml --limit=1   # get run-id and status
gh run view <run-id>                          # check final result
gh run view <run-id> --log-failed             # only if failed
```

- **DO NOT** use `gh run watch` — it streams all log output and wastes tokens.
- Report final status (green/failed) and relevant error lines only.

### Step 5: Cleanup worktree

If this session is running inside a worktree (directory is not the main repo):

```bash
git worktree remove .                 # or your custom cleanup script
git branch -D <branch-name>           # if not auto-deleted
```

Then inform the user the worktree has been removed and they can close this terminal.

---

## 3. Skill `/ck:ship` — SKILL.md

> Path on target machine: `~/.claude/skills/ship/SKILL.md`

```markdown
---
name: ck:ship
description: "Ship pipeline: merge main, test, review, commit, push, PR. Single command from feature branch to PR URL. Use for shipping official releases to main/master or beta releases to dev/beta branches."
argument-hint: "[official|beta] [--skip-tests] [--skip-review] [--skip-journal] [--skip-docs] [--dry-run]"
license: MIT
metadata:
  author: claudekit
  version: "2.0.0"
---

# Ship: Unified Ship Pipeline

Single command to ship a feature branch. Fully automated — only stops for test failures, critical review issues, or major version bumps.

**Inspired by:** gstack `/ship` by Garry Tan. Adapted for framework-agnostic, multi-language support.

## Arguments

| Flag | Effect |
|------|--------|
| `official` | Ship to default branch (main/master). Full pipeline with docs + journal |
| `beta` | Ship to dev/beta branch. Lighter pipeline, skip docs update |
| (none) | Auto-detect: if base branch is main/master → official, else → beta |
| `--skip-tests` | Skip test step (use when tests already passed) |
| `--skip-review` | Skip pre-landing review step |
| `--skip-journal` | Skip journal writing step |
| `--skip-docs` | Skip docs update step |
| `--dry-run` | Show what would happen without executing |

## Ship Mode Detection

\`\`\`
If argument = "official" → target = main/master (auto-detect default branch)
If argument = "beta"     → target = dev/beta (auto-detect dev branch)
If no argument           → infer from current branch naming:
  - feature/* hotfix/* bugfix/* → official (target main)
  - dev/* beta/* experiment/*  → beta (target dev/beta)
  - unclear                    → AskUserQuestion
\`\`\`

## When to Stop (blocking)

- On target branch already → abort
- Merge conflicts that can't be auto-resolved → stop, show conflicts
- Test failures → stop, show failures
- Critical review issues → AskUserQuestion per issue
- Major/minor version bump needed → AskUserQuestion

## When NOT to Stop

- Uncommitted changes → always include them
- Patch version bump → auto-decide
- Changelog content → auto-generate
- Commit message → auto-compose
- No version file → skip version step silently
- No changelog → skip changelog step silently

## Pipeline

\`\`\`
Step 1:  Pre-flight      → Branch check, mode detection, status, diff analysis
Step 2:  Link Issues      → Find/create related GitHub issues
Step 3:  Merge target     → Fetch + merge origin/<target-branch>
Step 4:  Run tests        → Auto-detect test runner, run, check results
Step 5:  Review           → Two-pass checklist review (critical + informational)
Step 6:  Version bump     → Auto-detect version file, bump patch/minor
Step 7:  Changelog        → Auto-generate from commits + diff
Step 8:  Journal          → Write technical journal via /ck:journal
Step 9:  Docs update      → Update project docs via /ck:docs update (official only)
Step 10: Commit           → Conventional commit with version/changelog
Step 11: Push             → git push -u origin <branch>
Step 12: Create PR        → gh pr create with structured body + linked issues
\`\`\`

**Detailed steps:** Load `references/ship-workflow.md`
**Auto-detection:** Load `references/auto-detect.md`
**PR template:** Load `references/pr-template.md`

## Token Efficiency Rules

- Steps 4 (tests) and 5 (review): delegate to `tester` and `code-reviewer` subagents — don't inline
- Steps 8 (journal) and 9 (docs): run in **background** — don't block pipeline
- Step 2 (issues): use single `gh` command batch — avoid multiple API calls
- Skip steps early via flags to save tokens on unnecessary work
- Beta mode auto-skips: docs update (Step 9)
- Capture step outputs inline — don't re-read files already in context

## Quick Start

User says `/ck:ship` → run full pipeline → output PR URL.
User says `/ck:ship beta` → ship to dev branch with lighter pipeline.
User says `/ck:ship official` → ship to main with full docs + journal.

## Output Format

\`\`\`
✓ Pre-flight: branch feature/foo, 5 commits, +200/-50 lines (mode: official)
✓ Issues: linked #42, created #43
✓ Merged: origin/main (up to date)
✓ Tests: 42 passed, 0 failed
✓ Review: 0 critical, 2 informational
✓ Version: 1.2.3 → 1.2.4
✓ Changelog: updated
✓ Journal: written (background)
✓ Docs: updated (background)
✓ Committed: feat(auth): add OAuth2 login flow
✓ Pushed: origin/feature/foo
✓ PR: https://github.com/org/repo/pull/123 (linked: #42, #43)
\`\`\`

## Important Rules

- **Never skip tests** (unless `--skip-tests`). If tests fail, stop.
- **Never force push.** Regular `git push` only.
- **Never ask for confirmation** except for critical review issues and major/minor version bumps.
- **Auto-detect everything.** Test runner, version file, changelog format, target branch — detect from project files.
- **Framework-agnostic.** Works for Node, Python, Rust, Go, Ruby, Java, or any project with a test command.
- **Subagent delegation.** Use `tester` for tests, `code-reviewer` for review, `journal-writer` for journal, `docs-manager` for docs. Don't inline.
- **Background tasks.** Journal and docs run in background to not block the pipeline.
```

---

## 4. Reference: ship-workflow.md

> Path on target machine: `~/.claude/skills/ship/references/ship-workflow.md`

````markdown
# Ship Workflow — Detailed Steps

## Step 1: Pre-flight

1. Check current branch: `git branch --show-current`
   - If on target branch (main/master/dev): **ABORT** — "Ship from a feature branch, not the target branch."
2. Determine ship mode from arguments:
   - `official` → target = auto-detect default branch (main/master)
   - `beta` → target = auto-detect dev branch (dev/beta/develop)
   - No argument → infer from branch name:
     - `feature/* hotfix/* bugfix/*` → official
     - `dev/* beta/* experiment/*` → beta
     - Unclear → `AskUserQuestion` with options: "Official (main)", "Beta (dev)"
3. Auto-detect target branch:
   ```bash
   # For official: detect default branch
   git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
   # Fallback
   git rev-parse --verify origin/main 2>/dev/null && echo "main" || echo "master"

   # For beta: detect dev branch
   for b in dev beta develop; do
     git rev-parse --verify origin/$b 2>/dev/null && echo "$b" && break
   done
   ```
4. Run `git status` (never use `-uall`). Uncommitted changes are always included.
5. Run `git diff <target>...HEAD --stat` and `git log <target>..HEAD --oneline` to understand what's being shipped.
6. If `--dry-run`: output what would happen at each step and stop here.

## Step 2: Link Issues

Find or create related GitHub issues for traceability.

1. Search for related open issues by keywords from branch name and commit messages:
   ```bash
   # Extract keywords from branch name
   BRANCH=$(git branch --show-current)
   KEYWORDS=$(echo "$BRANCH" | sed 's/[^a-zA-Z0-9]/ /g' | tr '[:upper:]' '[:lower:]')

   # Search existing issues
   gh issue list --state open --limit 10 --search "$KEYWORDS"
   ```

2. Also check if any issues are referenced in commit messages:
   ```bash
   git log <target>..HEAD --oneline | grep -oE '#[0-9]+' | sort -u
   ```

3. **If related issues found:** Note issue numbers for PR linking.

4. **If NO related issues found:** Create a new issue with structured format:
   ```bash
   gh issue create --title "<type>: <summary from commits>" --body "$(cat <<'EOF'
   ## Problem Statement
   <infer from diff and commit messages>

   ## Proposal
   <summarize the implementation approach>

   ## How It Works
   <describe key changes with bullet points>

   ### Architecture
   ```
   <ASCII diagram of component interactions>
   ```

   ## Challenges
   - <potential edge cases or risks>

   ## Plan & Phases
   - [x] Implementation complete
   - [x] Tests passing
   - [ ] Code review approved
   - [ ] Merged to <target>

   ## Human Review Tasks
   - [ ] Verify business logic correctness
   - [ ] Check for edge cases not covered by tests
   - [ ] Validate UX/API contract changes (if any)
   EOF
   )"
   ```

5. Store issue numbers for Step 12 (PR creation).

## Step 3: Merge target branch

Fetch and merge so tests run against the merged state:

```bash
git fetch origin <target> && git merge origin/<target> --no-edit
```

- **If merge conflicts:** Try auto-resolve simple ones (lockfiles, version files). For complex conflicts, **STOP** and show them.
- **If already up to date:** Continue silently.

## Step 4: Run Tests

**Skip if:** `--skip-tests` flag.

1. Auto-detect test command (see `auto-detect.md`)
2. Delegate to `tester` subagent — don't inline test execution
3. Check pass/fail from agent result

- **If any test fails:** Show failures and **STOP**. Do not proceed.
- **If all pass:** Note counts briefly and continue.
- **If no test runner detected:** Use `AskUserQuestion` — "No test runner detected. Skip tests or provide command?"

## Step 5: Pre-Landing Review

**Skip if:** `--skip-review` flag.

1. Run `git diff origin/<target>` to get the full diff
2. Delegate to `code-reviewer` subagent with the diff
3. Two-pass model:
   - **Pass 1 (CRITICAL):** Security, injection, race conditions, auth bypass
   - **Pass 2 (INFORMATIONAL):** Dead code, magic numbers, test gaps, style

4. **Output findings:**
   ```
   Pre-Landing Review: N issues (X critical, Y informational)
   ```

5. **If critical issues found:** For EACH critical issue, use `AskUserQuestion`:
   - Problem description with `file:line`
   - Recommended fix
   - Options: A) Fix now (recommended), B) Acknowledge and ship, C) False positive — skip

6. **If user chose Fix (A):** Apply fixes, commit fixed files, then **re-run tests** (Step 4) before continuing.
7. **If only informational:** Include in PR body, continue.
8. **If no issues:** Output "No issues found." and continue.

## Step 6: Version Bump (conditional)

1. Auto-detect version source (see `auto-detect.md`)
2. If no version file found: **skip silently**
3. Auto-decide bump level from diff size:
   - **< 50 lines:** patch bump
   - **50+ lines:** patch bump (default safe choice)
   - **Major feature or breaking change:** Use `AskUserQuestion` — "This looks like a significant change. Bump minor or patch?"
4. For beta mode: use prerelease suffix (e.g., `1.2.4-beta.1`)
5. Write new version to detected file

## Step 7: Changelog (conditional)

1. Check for CHANGELOG.md or CHANGES.md
2. If not found: **skip silently**
3. Auto-generate entry from ALL commits on branch:
   - `git log <target>..HEAD --oneline` for commit list
   - `git diff <target>...HEAD` for full diff context
4. Categorize into: Added, Changed, Fixed, Removed
5. Insert after file header, dated today
6. Format: `## [X.Y.Z] - YYYY-MM-DD`

**Do NOT ask user to describe changes.** Infer from diff and commits.

## Step 8: Journal (background)

**Skip if:** `--skip-journal` flag.

Write a technical journal entry capturing this ship session. Run as **background task** to not block pipeline.

1. Invoke `/ck:journal` skill via `journal-writer` subagent in background:
   - Topic: summary of shipped changes (from commit messages + diff stats)
   - Include: what was shipped, key decisions, technical challenges encountered
   - Output: saved to `./docs/journals/` directory
2. Don't wait for completion — continue to next step immediately.

## Step 9: Docs Update (conditional, background)

**Skip if:** `--skip-docs` flag OR ship mode is `beta`.

Update project documentation for official releases. Run as **background task**.

1. Invoke `/ck:docs update` skill via `docs-manager` subagent in background:
   - Analyzes code changes since last release
   - Updates relevant docs in `./docs/` directory
2. Don't wait for completion — continue to next step immediately.

## Step 10: Commit

1. Stage all changes: `git add -A`
2. Security check: scan staged diff for secrets (API keys, tokens, passwords)
   - If secrets found: **STOP**, warn user, suggest `.gitignore`
3. Compose commit message:
   - Format: `type(scope): description`
   - Infer type from changes (feat/fix/refactor/chore)
   - If version + changelog present, include in same commit
4. Commit:

```bash
git commit -m "$(cat <<'EOF'
type(scope): description

Brief body describing the changes.
EOF
)"
```

## Step 11: Push

```bash
git push -u origin $(git branch --show-current)
```

- **Never force push.**
- If push rejected: suggest `git pull --rebase` and retry once.

## Step 12: Create PR

Check if `gh` CLI is available:
```bash
which gh 2>/dev/null || echo "MISSING"
```

If missing: output "Install GitHub CLI (gh) to auto-create PRs" and stop after push.

Create PR targeting the correct branch:
```bash
gh pr create --base <target-branch> --title "<type>: <summary>" --body "$(cat <<'EOF'
<PR body from pr-template.md>
EOF
)"
```

**Link issues** collected from Step 2:
```bash
# If issues were found/created, add closing keywords in PR body
# e.g., "Closes #42, Relates to #43"
```

**Output the PR URL** — this is the final output the user sees.

If PR already exists for this branch, update it instead:
```bash
gh pr edit --title "<type>: <summary>" --body "$(cat <<'EOF'
<PR body>
EOF
)"
```
````

---

## 5. Reference: auto-detect.md

> Path on target machine: `~/.claude/skills/ship/references/auto-detect.md`

````markdown
# Auto-Detection Logic

Detect test runner, version file, and changelog format from project files.

## Test Runner Detection

Check in order (first match wins):

| Check | Test Command |
|-------|-------------|
| `package.json` → `scripts.test` exists | `npm test` |
| `Makefile` → has `test:` target | `make test` |
| `pytest.ini` OR `pyproject.toml` has `[tool.pytest]` | `pytest` |
| `Cargo.toml` exists | `cargo test` |
| `go.mod` exists | `go test ./...` |
| `Gemfile` + `Rakefile` with test task | `bundle exec rake test` |
| `build.gradle` or `build.gradle.kts` | `./gradlew test` |
| `pom.xml` | `mvn test` |
| `mix.exs` | `mix test` |
| `deno.json` | `deno test` |

**Detection script:**
```bash
if [ -f package.json ] && grep -q '"test"' package.json 2>/dev/null; then
  echo "npm test"
elif [ -f Makefile ] && grep -q '^test:' Makefile 2>/dev/null; then
  echo "make test"
elif [ -f pytest.ini ] || ([ -f pyproject.toml ] && grep -q '\[tool.pytest' pyproject.toml 2>/dev/null); then
  echo "pytest"
elif [ -f Cargo.toml ]; then
  echo "cargo test"
elif [ -f go.mod ]; then
  echo "go test ./..."
else
  echo "NONE"
fi
```

**If NONE:** Use `AskUserQuestion` — "No test runner detected. Options: A) Skip tests, B) Provide test command"

## Version File Detection

Check in order:

| Check | Read Pattern |
|-------|-------------|
| `VERSION` file | Read as semver string |
| `package.json` → `version` field | `jq -r .version package.json` |
| `pyproject.toml` → `version` | grep `version = "..."` |
| `Cargo.toml` → `version` | grep `version = "..."` |
| `mix.exs` → `@version` | grep `@version "..."` |

**If none found:** Skip version bump silently. Not all projects use versioning.

**Bump logic:**
```
Lines changed < 50  → patch (X.Y.Z → X.Y.Z+1)
Lines changed >= 50 → patch (safe default)
User explicitly says "breaking" or "major feature" → AskUserQuestion for minor/major
```

## Changelog Detection

| Check | Format |
|-------|--------|
| `CHANGELOG.md` | Keep-a-changelog format |
| `CHANGES.md` | Same |
| `HISTORY.md` | Same |

**If none found:** Skip changelog silently.

**Entry format:**
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features from commits with `feat:` prefix

### Changed
- Changes from commits with `refactor:`, `perf:` prefix

### Fixed
- Bug fixes from commits with `fix:` prefix

### Removed
- Removals mentioned in commit messages
```

**Infer categories from:**
1. Conventional commit prefixes in `git log main..HEAD --oneline`
2. File types changed (test files → test improvements, docs → documentation)
3. Diff content (new functions = Added, modified functions = Changed)

## Main Branch Detection

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```

Fallback: check if `main` or `master` exists:
```bash
git rev-parse --verify origin/main 2>/dev/null && echo "main" || echo "master"
```
````

---

## 6. Reference: pr-template.md

> Path on target machine: `~/.claude/skills/ship/references/pr-template.md`

````markdown
# PR Body Template

Use this template when creating PRs via `gh pr create`.

## Template

```markdown
## Summary
<bullet points — infer from changelog entry or commit messages>

## Linked Issues
<list issues from Step 2>
- Closes #XX — <issue title>
- Relates to #YY — <issue title>
<or "No linked issues.">

## Pre-Landing Review
<findings from review step>
<format: "N issues (X critical, Y informational)" or "No issues found.">

<if informational issues exist, list them:>
- [file:line] Issue description

## Test Results
- [x] All tests pass (<count> tests, 0 failures)
<or>
- [x] Tests skipped (--skip-tests)

## Changes
<output of git diff --stat, trimmed to key files>

## Ship Mode
- Mode: <official|beta>
- Target: <target-branch>
```

## PR Title Format

```
type(scope): brief description
```

Infer type from changes:
- `feat`: new feature or capability
- `fix`: bug fix
- `refactor`: code restructuring without behavior change
- `perf`: performance improvement
- `chore`: maintenance, dependencies, config

## Example

```markdown
## Summary
- Add OAuth2 login flow with Google and GitHub providers
- Implement session management with secure cookie storage
- Add logout endpoint with token revocation

## Linked Issues
- Closes #42 — Add OAuth2 authentication support
- Relates to #38 — Security audit for auth module

## Pre-Landing Review
Pre-Landing Review: 1 issue (0 critical, 1 informational)

- [src/auth/session.ts:42] Magic number 3600 for session TTL
  Fix: Extract to named constant SESSION_TTL_SECONDS

## Test Results
- [x] All tests pass (127 tests, 0 failures)

## Changes
 src/auth/oauth.ts      | 89 +++++++++
 src/auth/session.ts    | 45 +++++
 src/routes/auth.ts     | 32 ++++
 tests/auth.test.ts     | 67 +++++++
 4 files changed, 233 insertions(+)

## Ship Mode
- Mode: official
- Target: main
```

## Notes

- Keep summary bullets concise — one line per change
- Include review findings even if "No issues found" — shows review happened
- Test counts should match actual output, not estimates
- If PR already exists, use `gh pr edit` instead of `gh pr create`
- Always include linked issues section — traceability is critical
- For beta PRs, target the dev/beta branch, not main
```
````

---

## Phụ lục: Script tự động cài đặt (optional)

Nếu muốn cài 1-shot trên máy mới, chạy script dưới (cần file `done-pr-and-ship-skill.md` này nằm cùng thư mục):

```bash
#!/usr/bin/env bash
set -euo pipefail

SRC="${1:-./done-pr-and-ship-skill.md}"
DEST="$HOME/.claude/skills/ship"

mkdir -p "$DEST/references"

# Trích từng section bằng awk (yêu cầu format markdown ổn định)
awk '/^## 3\. Skill/,/^## 4\. Reference/' "$SRC" | sed -n '/^```markdown$/,/^```$/p' | sed '1d;$d' > "$DEST/SKILL.md"
awk '/^## 4\. Reference/,/^## 5\. Reference/' "$SRC" | sed -n '/^````markdown$/,/^````$/p' | sed '1d;$d' > "$DEST/references/ship-workflow.md"
awk '/^## 5\. Reference/,/^## 6\. Reference/' "$SRC" | sed -n '/^````markdown$/,/^````$/p' | sed '1d;$d' > "$DEST/references/auto-detect.md"
awk '/^## 6\. Reference/,/^## Phụ lục/' "$SRC" | sed -n '/^````markdown$/,/^````$/p' | sed '1d;$d' > "$DEST/references/pr-template.md"

echo "✓ Installed /ck:ship skill to $DEST"
ls -la "$DEST" "$DEST/references"
```

> Lưu ý: script này chỉ là gợi ý — copy thủ công từng section sang đúng path vẫn là cách an toàn nhất.
