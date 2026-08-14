---
description: Execute the shared Vector closeout, documentation, QA, and handoff protocol
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git remote:*), Bash(docker compose ps:*), Bash(pnpm format:check:*), Bash(pnpm lint:*), Bash(pnpm typecheck:*), Bash(pnpm test:*), Bash(pnpm build:*), Read, Edit, Write, Glob, Grep
---

# Vector session wrap

Shared instructions:

@AGENTS.md

Engineering workflow:

@docs/engineering-workflow.md

Handoff to update:

@HANDOFF.md

Run `AGENTS.md` **Mandatory session wrap** iteratively until the final documentation and
QA review produces no further edits. Review both `AGENTS.md` and `CLAUDE.md`; synchronize
shared instructions and Claude routing whenever agent behavior changes. Commit and push
only when the user explicitly requested it.
