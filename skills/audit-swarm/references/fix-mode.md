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
3. **Invariant + reach check** — the step that stops finding-shaped fixes:
   (a) state in one line the invariant the fix restores ("every enqueue payload
   carries the provider charge ID");
   (b) twin sweep — grep sibling tiers/services/modules for the same pattern; the
   same defect there gets fixed in this commit or filed as a new ledger finding
   (a fix landed on one tier and never ported to its twin is how AUD-50-class
   regressions survive);
   (c) one-hop trace — read the immediate producer of whatever data the fixed code
   consumes and the immediate consumer of whatever it produces; confirm the
   invariant holds at both hops (fixing a formatter downstream of a payload that
   never contained the field is how AUD-18-class fixes fail).
   Record invariant + checked locations in the ledger entry (`invariant` field).
4. Add or adjust a test that FAILS without the fix and passes with it. A test that
   passes either way proves nothing. Actually verify the fail: stash/revert the fix
   or invert the assertion once.
   If the finding has a harvested repro (99-FINDINGS §Repro harvest), GRADUATE that
   exact failing test into the suite — do not write a parallel weaker one.
   Composition rule: the test must exercise production composition — no
   dependency_overrides on the fixed path, no injected settings, no raw engine
   skipping production hooks, no mock at the fixed seam. A test that mocks the seam
   it claims to verify proves nothing (this class recurs).
5. Run the FULL relevant suite — including special-infra suites (Docker/testcontainer
   migration tests, integration suites). Subset-green is how mock-seam bugs survive.
6. Atomic commit: `fix(<area>): audit <ID> — <claim>`.
7. **Adversarial diff review**: spawn one skeptic agent on the commit:
   "Review the diff of <sha> adversarially: (a) does it introduce a new bug?
   (b) does it fix the root cause or patch a symptom of: <claim + failure scenario>?
   (c) does it break any caller of the changed code? Cite file:line; never cite a
   file you did not open. Answer NEW-BUG / SYMPTOM-ONLY / CALLER-BROKEN / CLEAN."
   Anything but CLEAN: fix before proceeding to the next finding.
8. **Latent reactivation**: check the ledger for findings with `masked_by` = this
   finding's ID. Each one is now unmasked: re-verify it at new HEAD (spawn its
   skeptic again); flip `latent` -> `open` (or `refuted` with evidence) and add it
   to the current wave plan. Fixing a mask without re-checking what it hid ships
   the hidden bug live.
9. Update the findings file in place: `FIXED <commit>` / `WONTFIX — <rationale>` /
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
   match. Every `latent` finding whose mask was fixed this session has been
   re-verified — no `masked_by` pointing at a `closed` finding may remain `latent`.
3. Update the ledger: each fixed finding's status `open` -> `closed` + commit sha +
   `invariant` line; wontfix/deferred statuses likewise (see report-format.md
   §ledger).
4. Re-score journeys the fixes touched (report §Journey verdict): a journey only
   flips to PROVEN on citable end-to-end evidence, not on "its findings are closed".
5. Report to user: per-wave commit list, disposition tally, suite result, journeys
   re-scored, latent findings reactivated/closed, anything deferred and where
   tracked.

Do not push unless the user asked for push.
