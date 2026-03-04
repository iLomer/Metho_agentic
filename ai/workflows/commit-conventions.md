# Commit Conventions

```
<type>(<scope>): <description> [<agent-tag>]
```

**Types:** `feat` `fix` `refactor` `chore` `docs`

**Tags:** `[dev-agent]` `[pm-agent]` `[tester-agent]` `[bootstrap]`

**Examples:**
```
feat(cli): add project brief prompts [dev-agent]
fix(templates): correct CLAUDE.md token rendering [dev-agent]
docs(backlog): add slice-006 definition [pm-agent]
chore(scaffold): initialize project [bootstrap]
```

**Rules:** lowercase · no period · under 72 chars · agent tag mandatory
