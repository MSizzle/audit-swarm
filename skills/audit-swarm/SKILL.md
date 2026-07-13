---
name: audit-swarm
description: Multi-lens parallel codebase audit for production readiness — ideate repo-specific failure-mode lenses, fan out parallel finder subagents, adversarially verify every HIGH/MED with refute-by-default skeptics, consolidate a severity-ranked findings report. Modes full | lenses | coverage | delta | fix. Use when the user wants to audit, harden, systematically debug, or make a codebase production ready.
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

1. Finders report only — no fixes, no commits.
2. Audit dir + ledger go in `.git/info/exclude` (NOT .gitignore); never commit.
3. Every HIGH/MED gets a refute-by-default skeptic before the report.
4. `.planning/audit-ledger.json` is the dedupe source of truth — read before, append
   after, never re-discover its closed/refuted/WONTFIX entries.
5. Consolidation and tie-breaks are yours — never delegated.
6. A lens reporting zero findings with no coverage citation is a FAILED run.

## Phase 0 — Recon (you, inline, no subagents)

1. Read `.planning/audit-ledger.json` if it exists → dedupe list + lens stats. If
   missing, you will create it in Phase 4 (template: report-format.md §ledger).
2. `git ls-files` filtered to source; count files/lines per area.
   Delta mode: in-scope = `git diff --name-only <since>..HEAD` (source only) + their
   direct importers (grep) + any cross-tier seam a changed file sits on.
3. Identify tiers/services and seams between them — top bug-yield zone.
4. `git log --oneline -50`; note domain stakes (money? PII/PHI? creds?).
5. Note test suites: which run in CI, which need special infra.
6. `mkdir` audit dir; append it (and ledger path, once) to `.git/info/exclude`.

**Gate 0 → 1:** dedupe list extracted (or "first audit" noted); in-scope file count
known; audit dir exists and is excluded.

## Phase 1 — Lens selection

Read `references/lenses.md` now (menu, mandatory-by-stakes, ledger-stats pruning,
`panel` tag for money/auth lenses). Coverage mode: partition every in-scope file
across 8–15 readers, each file exactly one owner, prompt = file list + lenses.md
§coverage hunt list.

Write `<dir>/00-PLAN.md` from report-format.md §plan (read just that section).

**Gate 1 → 2:** 00-PLAN.md exists with lens table + dedupe list.

## Phase 2+3 — Execute

Ground rules, schemas, skeptic prompts, repro policy, panels, dedupe, IDs all live in
the fixed script — do NOT read or rewrite it. Build args, invoke:

```
Workflow({
  scriptPath: "<absolute path to the directory containing this SKILL.md>/references/workflow.js",
  args: {
    lenses:   [{ key: "concurrency", prompt: "<hunt instruction only: what, which paths/seams, recon pointers. 2-6 sentences>", panel: false }, ...],
    priorIds: ["<ID — one-line topic>", ...],
    model:    "sonnet"
  }
})
```

Immediately record the returned runId in 00-PLAN.md Status. If interrupted, resume:
`Workflow({scriptPath, resumeFromRunId})`.

`--calibrate`: read `references/calibration.md` now and run its procedure as a
second, separate Workflow call. Calibration findings NEVER enter the real set.

Script returns `{ coverage, deduped, verified, lowInfo, filesReadUnion,
md_verification, md_summary }`. Then:
- re-run any lens whose coverage row says FAILED (one-element lenses array);
- write one `NN-<lens>.md` log per lens from `deduped` + coverage;
- diff `filesReadUnion` against the Phase 0 in-scope list → blind-spot list; spawn a
  gap-fill reader if blind spots include high-stakes areas;
- write `verdicts/<id>-verdict.md` per `verified` entry;
- resolve every PANEL-SPLIT verdict yourself; spot-check skeptics that confirm
  everything or refute on technicalities.

**Gate 2+3 → 4:** runId recorded; no FAILED lens; blind-spot list written; all
PANEL-SPLITs resolved.

## Phase 4 — Consolidate (you)

Read `references/report-format.md` fully now. Paste `md_verification` into
90-VERIFICATION.md and `md_summary` into 99-FINDINGS.md, then add only what the
templates mark yours (detail blocks, fix directions, shortlist, blind spots,
calibration line). Append this run to the ledger (§ledger).

Report to user: verified counts, HIGH list verbatim, shortlist, artifact paths,
calibration recall if run. Recommend `--mode fix`; then STOP — finding and fixing
are separate decisions.

**Gate 4 (final):** 90-VERIFICATION.md + 99-FINDINGS.md written; ledger appended;
nothing committed.

## Phase 5 — Fix mode

Read `references/fix-mode.md` now and follow it exactly (includes per-fix adversarial
diff review and ledger status updates).
