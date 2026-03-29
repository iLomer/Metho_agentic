# Sprint Contracts

Sprint contracts are negotiated agreements between `@meto-developer` and `@meto-tester` that must exist and be signed before any implementation code is written for a slice.

---

## Why Contracts Exist

Without a contract, two failure modes recur:

1. **Developer builds the wrong thing.** The PM slice definition describes intent — not every testable behavior. Without a negotiated list of behaviors, the developer interprets ambiguities alone.
2. **Tester rejects work the developer thought was done.** Rejection after implementation is expensive. A signed contract eliminates after-the-fact disputes about scope.

The contract is not bureaucracy. It is the cheapest place to catch disagreement.

---

## Contract Workflow

```
PM defines slice in tasks-todo.md
       ↓
@meto-developer copies template → ai/contracts/slice-NNN-contract.md
       ↓
Developer fills Sections 1–5 (criteria, test behaviors, edge cases, DoD, out-of-scope)
       ↓
Developer sends contract to @meto-tester for review
       ↓
@meto-tester reviews: verifies behaviors are measurable, adds ≥1 edge case, checks DoD commands
       ↓
Tester signs OR returns with revision requests
       ↓ (if revisions requested)
Developer updates contract → tester re-reviews
       ↓ (when agreed)
Both sign Section 6
       ↓
Implementation begins — task moves to in-progress
```

**The negotiation loop is blocking.** Neither agent may skip it. A task must not move from `tasks-todo.md` to active implementation without a signed contract file in this directory.

---

## File Naming Convention

```
ai/contracts/slice-{{SLICE_ID}}-contract.md
```

Examples:

- `ai/contracts/slice-085-contract.md`
- `ai/contracts/slice-112-contract.md`

Use zero-padded three-digit slice IDs to keep the directory sorted.

---

## Contract Lifecycle

| Status | Meaning |
|---|---|
| `DRAFT` | Developer has filled the template, not yet reviewed by tester |
| `AGREED` | Both agents have reviewed; tester has not yet signed |
| `SIGNED` | Both signatures present in Section 6 — implementation may begin |

Update the `Status:` field at the top of the contract as it progresses.

---

## NEVER DO

- **@meto-developer:** Do not write implementation code before the contract status is `SIGNED`.
- **@meto-developer:** Do not leave Section 3 (Edge Cases) empty — every slice has at least one.
- **@meto-tester:** Do not sign a contract with blank sections, vague test behaviors, or no edge cases.
- **@meto-tester:** Do not sign a contract whose DoD commands cannot actually be run to verify the work.
- **Either agent:** Do not modify a contract after it has been `SIGNED` without resetting status to `DRAFT` and re-negotiating.

---

## Template Location

The blank contract template lives at:

```
templates/ai/contracts/slice-NNN-contract.md
```

Copy it, rename it to your slice ID, and begin filling it in. Do not edit the template itself.
