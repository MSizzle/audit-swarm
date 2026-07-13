# Fix mode — remediate a findings report

Read this file fully — every section applies. Input: the 99-FINDINGS.md path from
`--fix`. Read it fully first, plus `.planning/audit-ledger.json` if present.

## 1. Wave plan

Group findings: W1 = HIGHs touching distinct subsystems (parallelizable), W2 = MEDs,
W3 = LOW/hygiene batch. Use the report's fix-priority shortlist if present. If any
fix is architectural (changes a contract, a schema, a public behavior), STOP and
confirm the wave plan with the user before touching code.

## 2. Per finding — this loop exactly, no shortcuts

1. Re-read the cited code; confirm the finding still reproduces at current HEAD.
   If gone: disposition `ALREADY-FIXED <commit>`.
2. Implement the minimal correct fix.
3. Add or adjust a test that FAILS without the fix and passes with it. A test that
   passes either way proves nothing. Actually verify the fail: stash/revert the fix
   or invert the assertion once.
4. Run the FULL relevant suite — including special-infra suites (Docker/testcontainer
   migration tests, integration suites). Subset-green is how mock-seam bugs survive.
5. Atomic commit: `fix(<area>): audit <ID> — <claim>`.
6. **Adversarial diff review**: spawn one skeptic agent on the commit:
   "Review the diff of <sha> adversarially: (a) does it introduce a new bug?
   (b) does it fix the root cause or patch a symptom of: <claim + failure scenario>?
   (c) does it break any caller of the changed code? Cite file:line; never cite a
   file you did not open. Answer NEW-BUG / SYMPTOM-ONLY / CALLER-BROKEN / CLEAN."
   Anything but CLEAN: fix before proceeding to the next finding.
7. Update the findings file in place: `FIXED <commit>` / `WONTFIX — <rationale>` /
   `DEFERRED — <where tracked>` / `ALREADY-FIXED <commit>`. A finding with no
   disposition line is not closed.

## 3. Cross-wave hygiene

- Fixes touching code shared between waves: re-run the earlier waves' tests after the
  later wave lands.
- Subagent delegation allowed for mechanical fixes (exact spec: file, change, test to
  add); you review the diff and you commit. Architectural fixes: yourself.

## 4. Final gate — all four, in order

1. Full test suite from a CLEAN environment (fresh dependency sync — undeclared
   transitive deps hide in dirty envs).
2. Every finding has a disposition line. Count findings, count dispositions — must
   match.
3. Update the ledger: each fixed finding's status `open` -> `closed` + commit sha;
   wontfix/deferred statuses likewise (see report-format.md §ledger).
4. Report to user: per-wave commit list, disposition tally, suite result, anything
   deferred and where tracked.

Do not push unless the user asked for push.
