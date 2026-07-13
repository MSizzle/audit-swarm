# Lens menu + selection rules

Read this file fully — every section applies.

## How to select

1. Start from Phase 0 recon, not this list: what does THIS system do that a generic
   checklist misses? Invent 1–2 lenses specific to it (its domain workflow, its
   oddest subsystem, its most recently rewritten area).
2. Then take 8–12 from the menu. Mandatory picks by stakes:
   - moves money → #1, #2, #3, #5
   - handles PII/PHI/secrets → #9, #15
   - has ≥2 tiers/services → #4
   - has runbooks/deploy docs → #7
   - has a test suite → #10 and #11 (they are different lenses)
3. Ledger stats prune the menu (from `.planning/audit-ledger.json` lens rows):
   - 0 findings in 2 consecutive runs → retire the lens for this repo.
   - >70% of its HIGH/MEDs refuted → rewrite its prompt or drop it (noise generator).
   - A failure class recurring across runs/repos → promote it to a permanent custom
     lens; consider adding it to this menu.
4. Tag `panel: true` on lenses whose HIGHs justify a 3-skeptic majority panel:
   money movement, auth/privilege, anything where a wrong CONFIRMED/REFUTED verdict
   is expensive. Everything else gets one skeptic.
5. A good lens: names one concrete failure class, cuts across many files, and has a
   falsifiable output ("every X checked against Y").
6. Delta mode: pick only lenses relevant to the changed files' nature (schema change
   → #4 #7; new endpoint → #8 #18; scheduler edit → #1 #2 #5), plus #12 (comment
   liars) which is cheap and always applies to fresh diffs.

## Menu

1. **Concurrency & races** — TOCTOU between check and act (recheck state at dispatch
   time, not just at schedule time), shared state without locks, double-dispatch,
   missing idempotency keys on retried side effects.
2. **Crash-recovery & idempotency** — process dies between step N and N+1: what
   replays, what duplicates, what wedges? Recovery paths retrying without
   backoff/cooldown; markers that create hot loops.
3. **Abuse cases on crown jewels** — money movement, auth escalation, quota bypass.
   Think as an attacker WITH a valid account.
4. **Cross-tier contract drift** — every seam: request/response shapes, envelope
   nesting, enum values, header names, string constants that must match a UI. Check
   both sides against EACH OTHER, not each against its own docs.
5. **Time & scheduling edges** — timezone/DST, month-end, clock skew, replay windows,
   token expiry, "state changed since tick was scheduled".
6. **Dependency & supply chain** — floating tags vs pins (CI actions, Docker bases,
   package resolves), lockfile honesty, install-time code execution.
7. **Ops-truth & config drift** — runbooks vs actual code (restore procedures that
   cannot restore the current format!), .env.example vs variables the code reads,
   deploy docs vs compose files, per-environment default divergence.
8. **Input validation & injection** — every external input surface: SQL/command/
   template injection, path traversal, deserialization, header smuggling.
9. **Data lifecycle** — backups restore? retention enforced? deletion deletes?
   sensitive data leaking into logs, evidence files, error payloads, new surfaces
   added since last audit.
10. **Test-suite blind spots** — subsystems with no tests; suites that exist but
    never run in CI; money/auth paths covered only manually.
11. **Mock-broken seams** — tests mocking the exact seam they claim to verify; fakes
    drifted from the real API shape; asserts-nothing tests. Suite-green ≠ working
    feature; this class recurs.
12. **Comment liars** — every "fixed in X" comment, invariant claim, docstring
    checked against what the code actually does.
13. **Exception audit** — every broad/bare except and swallowed error: classify
    fail-closed / fail-open / silent.
14. **Stub inventory** — every NotImplementedError, placeholder, `pass` body,
    TODO-gated path: classify known-and-gated vs silent lie.
15. **Secret & sensitive-data sweep** — every log call, template var, outbound
    payload vs the redaction/sensitive-key lists; audit the lists themselves for
    missing keys; check redaction handles ALL quoting/encoding variants (a scrub
    that only strips single-quoted values leaks double-quoted ones — real bug).
16. **Resource lifecycle** — connections/files/subprocesses/temp dirs: leaks,
    missing timeouts, unbounded queues.
17. **Failure-mode UX** — what the user actually sees when each failure fires;
    walk the fresh-install/first-run path end to end (boot deadlocks hide here).
18. **Permissions & privilege** — authz on every route/command; least-privilege on
    tokens/keys/DB roles; gaps between authenticated and authorized.

## §coverage — hunt list for coverage-mode readers

Append to each reader's file-list prompt: "While reading, hunt ALL of: logic errors,
dead/unreachable branches, fail-open error handling, contract mismatches with code
you can see called, hardcoded values that must match external systems, sensitive
data in logs, comments/docstrings that contradict the code, and stubs presenting as
implemented."
