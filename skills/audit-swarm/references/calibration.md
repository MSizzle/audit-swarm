# Calibration wave (`--calibrate`) — measure finder recall

Read this file fully — every section applies.

Purpose: skeptics kill false positives; nothing measures false negatives. This wave
seeds known bugs and measures how many the finders catch, so the report can state
its own sensitivity ("caught 5/6 seeded bugs") instead of implying completeness.

Cost: roughly doubles finder spend. Use for client-facing / go-live audits.

## Procedure

1. Create an isolated copy: `git worktree add <scratchpad>/audit-calib HEAD`.
2. Spawn ONE seeding agent (general-purpose, model sonnet) with this task, verbatim:
   "In the worktree at <path>, plant exactly <N=5-8> realistic bugs, one per class
   from this list: <pick classes matching the chosen lenses — e.g. remove a lock or
   state recheck; invert or off-by-one a condition; unpin a pinned dependency; rename
   a field on one side of a cross-tier contract; log a value the redaction list
   should cover; make a docstring lie about behavior; drop a key from a payload that
   a downstream consumer .get()s (seam drop); move an idempotency-key commit to
   after the external call (dispatch-point); change a user-facing label or message
   so it promises something the wired handler does not do (UI-promise); make a test
   pass by overriding the dependency or mocking the seam it claims to verify
   (mock-seam); remove the runtime gate enforcing a documented contract clause
   (unenforced-contract)>. Each bug must be subtle (survives a skim), syntactically
   valid, and NOT break the build. Where the lens set includes money/auth panels,
   also plant ONE masked pair: bug A blocks the code path on which bug B sits — B
   is only reachable once A is fixed. Write the answer key — file:line, class,
   one-line description per seed (mark the masked pair) — as your final message.
   Do not write the answer key inside the worktree."
3. Save the answer key to `<auditDir>/calibration-key.md`. Never show it to finders.
4. Run the SAME lenses as the real wave in a second, separate Workflow call: same
   args shape, prompts rewritten to point at the worktree path. Do NOT reuse the real
   run's Workflow call or runId.
5. Score by file match: recall = seeds found / seeds planted. A seed is "found" if
   any finding cites the seeded file and describes the planted defect.
   Masked-pair scoring (when planted): B found at all = discovery pass; B's verdict
   is the latent-rule check — CONFIRMED-LATENT with masked_by pointing at A = pass,
   REFUTED "because A blocks it" = the skeptic latent rule failed; record that in
   the ledger, it means real masked bugs are being erased.
6. Write results into 99-FINDINGS.md header line:
   `Calibration: <X>/<Y> seeded bugs caught. Missed: <class> (<lens that should have caught it>).`
   A missed class = that lens's prompt needs work — record that in the ledger lens row.
7. Tear down: `git worktree remove --force <path>`. Delete nothing else.

## Iron rules

- Calibration findings NEVER enter the real findings set, the ledger, or 99-FINDINGS
  (except the recall line).
- Seeded bugs are never fixed, never committed — the worktree is destroyed.
- If the seeding agent reports it could not plant a class subtly, reduce Y; never
  count an unplanted seed as caught or missed.
