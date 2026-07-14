---
name: audit-swarm
description: Parallel multi-lens codebase audit with adversarially verified, severity-ranked findings. Modes full | lenses | coverage | delta | fix. Use to audit, harden, systematically debug, or make code production ready.
---

# Audit Swarm

You are the orchestrator. Subagents find and verify; you plan, choose lenses,
consolidate, and (fix mode only) commit. Follow phases in order. Read each reference
file ONLY when its phase says so — then read that file FULLY; every section applies.

Why this method: sampling misses bugs (three manual passes over one repo each found
new HIGHs). Counter: assigned coverage with a ledger, independent failure-mode lenses,
adversarial verification (~20–25% of raw HIGH/MEDs get refuted or downgraded).

## Anti-hallucination rules (bind you AND every agent you spawn)

- Never cite a file:line you have not opened this session. Never invent line numbers.
- If a path, ID, or prior-run artifact these instructions reference does not exist:
  STOP that step and report it. Do not improvise a substitute.
- Templates are verbatim: fill only the `<blanks>`, change nothing else.
- Numbers in your report must trace to tool output or script return values.

## Arguments (all optional)

- `--mode full|lenses|coverage|delta|fix` — default `full` first audit, `lenses`
  repeat audit. `delta` = changed-code-only. `fix` = remediate a findings report.
- `--since <sha>` — delta mode baseline (default: last ledger run's HEAD).
- `--scope <paths>` — restrict. Default whole repo.
- `--dir <path>` — artifacts. Default `.planning/audit-<YYYY-MM-DD>/` (`-2` if exists).
- `--fix <file>` — with fix mode: the 99-FINDINGS.md to remediate.
- `--calibrate` — seeded-bug recall measurement (~doubles finder cost; for
  client-facing / go-live audits).

`--mode fix` → Phase 5 directly. Else Phases 0–4.

## Hard rules

1. Finders report only — no fixes, no commits. (Lenses flagged `repro: true` may
   boot the entry point in a throwaway worktree; still report-only.)
2. Audit dir + ledger go in `.git/info/exclude` (NOT .gitignore); never commit.
3. Every HIGH/MED gets a refute-by-default skeptic before the report.
4. `.planning/audit-ledger.json` is the dedupe source of truth — read before, append
   after, never re-discover its closed/refuted/WONTFIX entries. Latent and deferred
   entries are NEVER dedupe-hidden: re-present them in every report.
5. Consolidation and tie-breaks are yours — never delegated.
6. A lens reporting zero findings with no coverage citation is a FAILED run.
7. A finding blocked only by ANOTHER defect is CONFIRMED-LATENT, never REFUTED —
   fixing the mask un-blocks it. Refutation requires an intentional, correct guard.
8. The ship/block decision keys to operator journeys proven end-to-end, not to
   finding counts. "All findings dispositioned" is not "ready".

## Phase 0 — Recon (you, inline, no subagents)

1. Read `.planning/audit-ledger.json` if it exists → dedupe list + lens stats +
   prior frames + standing residuals (every `deferred`/`wontfix`/`latent` entry —
   these get RE-PRESENTED in this run's report, not re-discovered). If missing, you
   will create it in Phase 4 (template: report-format.md §ledger).
2. `git ls-files` filtered to source; count files/lines per area.
   Delta mode: in-scope = `git diff --name-only <since>..HEAD` (source only) + their
   direct importers (grep) + the FULL both-sides membership of any seam a changed
   file sits on (seam bugs live in the join; each side looks fine in its own diff).
3. Seam census: enumerate producer/consumer pairs as first-class audit objects —
   router mounts vs middleware path guards, queue/job payload writers vs readers,
   installer/packaging outputs vs runtime config inputs, twin modules across tiers,
   UI form posts vs their handlers. Write the list into 00-PLAN.md §seams; lens #4's
   prompt embeds it.
4. Contract extraction: read requirement/overview docs (REQUIREMENTS.md,
   docs/OVERVIEW.md, ADRs — whatever exists). Extract testable clauses (who may
   originate money movement, exact formats/labels, time windows, data-minimization
   promises). Write into 00-PLAN.md §contract; lens #20's prompt embeds them.
5. Operator journeys: list the 3–8 end-to-end flows a real operator/patient/staff
   member performs (fresh install → first success, staff retries a failure, patient
   receives a notice...). Write into 00-PLAN.md §journeys — the Phase 4 decision
   keys to these.
6. `git log --oneline -50`; note domain stakes (money? PII/PHI? creds?).
7. Note test suites: which run in CI, which need special infra.
8. `mkdir` audit dir; append it (and ledger path, once) to `.git/info/exclude`.

**Gate 0 → 1:** dedupe list + standing residuals extracted (or "first audit"
noted); seam census, contract clauses, and journeys written (or "none found"
noted per section); in-scope file count known; audit dir exists and is excluded.

## Phase 1 — Lens selection

Read `references/lenses.md` now (menu, mandatory-by-stakes, ledger-stats pruning,
frame rotation, `panel` tag for money/auth lenses, `repro` tag for fresh-run/fault
lenses). Coverage mode: partition every in-scope file across 8–15 readers, each
file exactly one owner, prompt = file list + lenses.md §coverage hunt list.

Repeat audit: rotate the frame — vary at least one of evidence type / direction /
entry point vs the prior run (lenses.md §7); record the rotation in 00-PLAN.md.

Write `<dir>/00-PLAN.md` from report-format.md §plan (read just that section).

**Gate 1 → 2:** 00-PLAN.md exists with lens table, dedupe list, seam census,
contract clauses, journeys, and (repeat audits) the rotated frame parameter.

## Phase 2+3 — Execute

Ground rules, schemas, skeptic prompts, repro policy, panels, dedupe, IDs all live in
the fixed script — do NOT read or rewrite it. Build args, invoke:

```
Workflow({
  scriptPath: "<absolute path to the directory containing this SKILL.md>/references/workflow.js",
  args: {
    lenses:   [{ key: "concurrency", prompt: "<hunt instruction only: what, which paths/seams, recon pointers. 2-6 sentences>", panel: false, repro: false }, ...],
    priorIds: ["<ID — one-line topic>", ...],
    model:    "sonnet"
  }
})
```

Prompt-building duties: lens #4's prompt embeds the Phase 0 seam census verbatim;
lens #20's prompt embeds the contract clauses verbatim; lens #17 gets `repro: true`
when the repo ships an artifact (fresh-run boot). Skeptics enforce the latent rule
and the test-evidence discount automatically (fixed in the script).

Cost tiering: mechanical lenses (stubs, comment liars, dependency pins, exception
audit) may add `model: "haiku", effort: "low"` per lens; semantic lenses (concurrency,
contracts, abuse, mock seams) stay on the default. Skeptics always use the default.

Immediately record the returned runId in 00-PLAN.md Status. If interrupted, resume:
`Workflow({scriptPath, resumeFromRunId})`.

`--calibrate`: read `references/calibration.md` now and run its procedure as a
second, separate Workflow call. Calibration findings NEVER enter the real set.

Script returns `{ coverage, deduped, verified, lowInfo, filesReadUnion,
md_verification, md_summary, md_logs }`. Then:
- re-run any lens whose coverage row says FAILED (one-element lenses array);
- write each `md_logs` entry verbatim to `<dir>/<entry.file>`;
- diff `filesReadUnion` against the Phase 0 in-scope list → blind-spot list; spawn a
  gap-fill reader if blind spots include high-stakes areas;
- write `verdicts/<id>-verdict.md` per `verified` entry;
- harvest repros: copy every `verified[].verdict.repro_path` into `<dir>/repros/`
  (create the dir) — fix mode graduates these into the suite as contract tests;
- resolve every PANEL-SPLIT verdict yourself; spot-check skeptics that confirm
  everything or refute on technicalities. Spot-check REFUTED verdicts on money/auth
  lenses specifically for the latent trap: refuted because another bug blocks the
  path is CONFIRMED-LATENT, not refuted.

**Gate 2+3 → 4:** runId recorded; no FAILED lens; blind-spot list written; repros
harvested; all PANEL-SPLITs resolved.

## Phase 4 — Consolidate (you)

Read `references/report-format.md` fully now. Paste `md_verification` into
90-VERIFICATION.md and `md_summary` into 99-FINDINGS.md, then add only what the
templates mark yours (detail blocks, fix directions, shortlist, blind spots,
standing residuals, not-proven list, journey verdict + decision, calibration
line). Append this run to the ledger (§ledger — including `frame`, `journeys`,
and `masked_by`/`repro` fields on findings).

Report to user: the DECISION line first (derived from journeys), verified counts,
HIGH list verbatim (latent tags included), standing-residuals count, not-proven
list, shortlist, artifact paths, calibration recall if run. Recommend
`--mode fix`; then STOP — finding and fixing are separate decisions.

**Gate 4 (final):** 90-VERIFICATION.md + 99-FINDINGS.md written; ledger appended;
nothing committed.

## Phase 5 — Fix mode

Read `references/fix-mode.md` now and follow it exactly (includes per-fix adversarial
diff review and ledger status updates).
