# Definition of Done — Lom

`@lom-tester` validates every task against this before moving to done.

---

## Universal Criteria

**Code Quality**
- [ ] `npx tsc --noEmit` — zero errors
- [ ] No `any` types
- [ ] No `console.log` in committed code
- [ ] No commented-out code
- [ ] No hardcoded secrets

**Functionality**
- [ ] All acceptance criteria from the task block met
- [ ] Feature works end-to-end locally

**CLI-Specific**
- [ ] `npx lom init` runs cleanly from a fresh directory
- [ ] No unhandled promise rejections
- [ ] Graceful error messages — no raw stack traces to user

**Templates**
- [ ] No hardcoded project-specific content in `/templates/` (only tokens)
- [ ] All `{{TOKEN}}` placeholders render correctly with test data

**Deployment**
- [ ] `npm run build` passes cleanly
- [ ] No broken imports

---

## Does NOT block done
- Performance optimization (unless it's a perf task)
- Windows-specific testing (unless the task targets Windows)
