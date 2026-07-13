# Report templates — fill blanks, keep structure verbatim

Read this file fully — every section applies. Fill only `<blanks>`; numbers must
trace to script return values or tool output.

## §plan — `00-PLAN.md`

```markdown
# Audit run <date> — <mode>

Baseline: HEAD `<sha>`. Scope: <paths or "whole repo">. Orchestrator: <model>.
Finders/skeptics: <model>, report-only.
Ledger: <"read, N dedupe entries" or "created this run">.

## Ground rules
Finders report only. Every claim cites file:line. Clean claims cite coverage.
Every HIGH/MED gets a refute-by-default skeptic (panel lenses: 3-skeptic majority).
Dedupe list below is mandatory finder input. This dir is git-excluded, never committed.

## Dedupe list (closed / refuted / WONTFIX from ledger)
<ID — one-line topic, one per row; or "none — first audit">

## Lenses / readers
| # | Log | Lens/Area | Panel | Focus or file list |
|---|-----|-----------|-------|--------------------|

## Status
- [ ] Wave 1 finders — runId: <fill immediately after Workflow returns>
- [ ] Blind-spot check vs in-scope inventory
- [ ] Skeptic wave + PANEL-SPLIT resolution
- [ ] Calibration (only if --calibrate) — recall: <X/Y>
- [ ] Consolidation (90-VERIFICATION.md, 99-FINDINGS.md, ledger append)
```

## §verification — `90-VERIFICATION.md`

Paste the script's `md_verification` string verbatim. Then append, only where you
tie-broke, overrode, or resolved a PANEL-SPLIT:

```markdown
### Orchestrator resolutions
- <ID>: <your verdict + one-line reason>
```

## §findings — `99-FINDINGS.md` (the deliverable)

```markdown
# 99-FINDINGS — Audit run <date> (<mode>)

Baseline HEAD `<sha>`. <N> lenses, <N> finders + <N> skeptics.
**Verification summary:** <N> raw -> **<X> HIGH, <Y> MED, <Z> LOW** after adversarial
verification. <D> downgraded, <R> refuted, <S> panel-splits resolved by orchestrator.
<Calibration: X/Y seeded bugs caught. Missed: ... — only if --calibrate ran>

<PASTE md_summary HERE — HIGH bullets + MED table>

## LOW / INFO
- **<ID>** — `<file_line>` — <claim>   <!-- from lowInfo, after your sanity pass -->

## Detail (HIGH + MED)                  <!-- yours, one block per surviving HIGH/MED -->
### <ID> [<sev>] <claim>
**Location:** `<file_line>`
**Failure scenario:** <scenario>
**Evidence:** <finder evidence + skeptic/repro confirmation note>
**Fix direction:** <1-2 sentences, direction only — fixes are a separate phase>

## Downgraded
- <ID> <orig> -> <new>: <one-line reason>

## Refuted (future runs: do not re-discover)
- <ID>: <one-line refutation>

## Blind spots                          <!-- filesReadUnion diffed vs in-scope list -->
<in-scope files no lens read: list or "none">. <Gap-fill reader spawned: yes/no + result>

## Coverage attestation                 <!-- coverage mode only -->
<N> files in scope / <N> read / gaps: <list or "none">

## Fix-priority shortlist
Ordered by severity x blast-radius x cheapness, grouped into waves:
- **W1 (do first):** <IDs — parallelizable HIGHs in distinct subsystems>
- **W2:** <MEDs>
- **W3:** <LOW/hygiene batch>
```

## §ledger — `.planning/audit-ledger.json`

Create if missing (and add path to `.git/info/exclude`); else append to both arrays.
Machine-read by Phase 0 of every future run — keep valid JSON, never reformat
existing entries.

```json
{
  "runs": [
    {
      "date": "<YYYY-MM-DD>", "mode": "<mode>", "head": "<sha>", "dir": "<audit dir>",
      "calibration": "<X/Y or null>",
      "lenses": [
        { "key": "<lens>", "findings": 0, "confirmed": 0, "refuted": 0, "downgraded": 0, "note": "<prompt-needs-work etc, optional>" }
      ]
    }
  ],
  "findings": [
    { "id": "<run-date>/<ID>", "status": "open|closed|refuted|wontfix|deferred", "file": "<path>", "topic": "<one line>", "commit": "<sha when closed, else null>" }
  ]
}
```

Status meanings: `open` = confirmed, not yet fixed (fix mode flips to `closed`).
`refuted`/`wontfix` = permanent dedupe entries. Dedupe list for future runs = every
entry with status closed/refuted/wontfix, formatted `<id> — <topic>`.

## Consolidation rules

- Sanity-check LOW/INFO yourself (no skeptics ran); drop noise before listing.
- Rows the dedupe merged (`also_lenses` field): verify the merge was correct — a
  wrong merge hides a distinct bug.
- Refuted/downgraded lists are dedupe input for the next run — never omit them.
- PANEL-SPLIT findings appear in md_verification but NOT md_summary — your
  resolution decides which list they join.
