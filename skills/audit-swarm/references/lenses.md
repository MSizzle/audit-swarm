# Lens menu + selection rules

Read this file fully — every section applies.

## How to select

1. Start from Phase 0 recon, not this list: what does THIS system do that a generic
   checklist misses? Invent 1–2 lenses specific to it (its domain workflow, its
   oddest subsystem, its most recently rewritten area).
2. Then take 8–12 from the menu. Mandatory picks by stakes:
   - moves money → #1, #2, #3, #5
   - handles PII/PHI/secrets → #9, #15
   - has ≥2 tiers/services → #4 (feed it the Phase 0 seam census)
   - has runbooks/deploy docs → #7
   - has a test suite → #10 and #11 (they are different lenses)
   - has requirement/contract docs (REQUIREMENTS.md, OVERVIEW.md, ADRs) → #20
   - ships an installable artifact (MSI/installer/packaged binary) → #17 with
     `repro: true` — static walk of the first-run path is not enough
   - has human-facing surfaces (templates, SMS/email, CLI help) → #19
3. Ledger stats prune the menu (from `.planning/audit-ledger.json` lens rows):
   - 0 findings in 2 consecutive runs → retire the lens for this repo.
   - >70% of its HIGH/MEDs refuted → rewrite its prompt or drop it (noise generator).
   - A failure class recurring across runs/repos → promote it to a permanent custom
     lens; consider adding it to this menu.
4. Tag `panel: true` on lenses whose HIGHs justify a 3-skeptic majority panel:
   money movement, auth/privilege, anything where a wrong CONFIRMED/REFUTED verdict
   is expensive. Everything else gets one skeptic.
   Cost tiering: mechanical lenses (#6 supply chain, #12 comment liars, #13
   exceptions, #14 stubs, #16 resources) may carry `model: "haiku", effort: "low"` —
   pattern-hunting, not whole-system reasoning. Semantic lenses (#1-#5, #8, #11,
   #15, #17-#20) stay on the default model. Repro-flagged lenses (#17 with an
   artifact) and #20 are the expensive additions — mandatory when their stakes row
   triggers, opt-in otherwise.
5. A good lens: names one concrete failure class, cuts across many files, and has a
   falsifiable output ("every X checked against Y").
6. Delta mode: pick only lenses relevant to the changed files' nature (schema change
   → #4 #7; new endpoint → #8 #18; scheduler edit → #1 #2 #5), plus #12 (comment
   liars) which is cheap and always applies to fresh diffs. A changed file sitting
   on a seam pulls the WHOLE seam in (both sides, full membership), not just the
   diff — seam bugs live in the join, and each side looks correct in its own diff.
7. Frame rotation (repeat audits): vary at least one frame parameter vs the prior
   run — evidence type (static ↔ repro-backed), direction (code-forward ↔
   contract-backward #20), entry point (files ↔ seams ↔ operator journeys #17/#19).
   Re-running one frame converges, and convergence reads as clean when the residual
   bugs simply live outside the frame. Record the rotated parameter in 00-PLAN.md;
   the ledger's `frame` field shows what previous runs used.

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
   both sides against EACH OTHER, not each against its own docs. Prompt MUST embed
   the Phase 0 seam census; every listed seam gets a both-sides check (producer
   writes X → does consumer read X, or `.get()` a key that was never put there?).
   Twin modules across tiers count as a seam: a fix landed on one tier and never
   ported to its twin is a finding.
5. **Time & scheduling edges** — timezone/DST, month-end, clock skew, replay windows,
   token expiry, "state changed since tick was scheduled".
6. **Dependency & supply chain** — floating tags vs pins (CI actions, Docker bases,
   package resolves), lockfile honesty, install-time code execution.
7. **Ops-truth & config drift** — runbooks vs actual code (restore procedures that
   cannot restore the current format!), .env.example vs variables the code reads,
   deploy docs vs compose files, per-environment default divergence. Include
   version parity: every version pinned in test fixtures/CI (DB images, language
   runtimes, containers) diffed against the deploy manifests' pins — tests passing
   on Postgres 16 prove nothing about the Postgres 17.10 production pins.
8. **Input validation & injection** — every external input surface: SQL/command/
   template injection, path traversal, deserialization, header smuggling.
9. **Data lifecycle** — backups restore? retention enforced? deletion deletes?
   sensitive data leaking into logs, evidence files, error payloads, new surfaces
   added since last audit.
10. **Test-suite blind spots** — subsystems with no tests; suites that exist but
    never run in CI; money/auth paths covered only manually.
11. **Mock-broken seams** — tests mocking the exact seam they claim to verify; fakes
    drifted from the real API shape; asserts-nothing tests. Suite-green ≠ working
    feature; this class recurs. Specifically hunt: `dependency_overrides` on the
    auth/identity path, settings injected before boot, raw engines that skip
    production event hooks/transaction wrappers, tests that record a value tuple
    but assert only the call count, and tests that assert a WRONG value as correct.
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
17. **Failure-mode UX & fresh-run** — what the user actually sees when each failure
    fires; walk the fresh-install/first-run path end to end (boot deadlocks hide
    here). When the repo ships an artifact, run with `repro: true`: boot the entry
    point in a stripped environment (no .env, empty config dir — the state a real
    fresh install actually has) in a throwaway worktree and report what happens.
    Dev/CI environments pre-satisfy config, so the fresh path has usually NEVER
    executed anywhere; static reads miss the crash order.
18. **Permissions & privilege** — authz on every route/command; least-privilege on
    tokens/keys/DB roles; gaps between authenticated and authorized.
19. **UI-promise vs handler** — every user-facing string checked against what the
    wired handler actually does: button labels vs the endpoint they post to (a
    "Retry" that charges the NEXT installment), help text claiming client-side
    behavior that has no implementing code, notification/SMS bodies stating an
    amount or date the code computes differently, template captions vs rendered
    values. Comment liars (#12) for humans instead of maintainers.
20. **Contract-backward** — for each contract clause extracted in Phase 0 (from
    REQUIREMENTS/OVERVIEW/ADRs), locate the code that ENFORCES it — a runtime
    gate or assertion, not prose or a checklist. No enforcement found → report
    UNENFORCED at the clause's stakes as severity. Work backward from the clause
    to code; never forward from code (each function looks locally reasonable).
    Procedural safety ("operators are instructed to...") is UNENFORCED.

## §coverage — hunt list for coverage-mode readers

Append to each reader's file-list prompt: "While reading, hunt ALL of: logic errors,
dead/unreachable branches, fail-open error handling, contract mismatches with code
you can see called, hardcoded values that must match external systems, sensitive
data in logs, comments/docstrings that contradict the code, and stubs presenting as
implemented."
