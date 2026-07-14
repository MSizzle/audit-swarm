# Report templates — fill blanks, keep structure verbatim

Read this file fully — every section applies. Fill only `<blanks>`; numbers must
trace to script return values or tool output.

## §plan — `00-PLAN.md`

```markdown
# Audit run <date> — <mode>

Baseline: HEAD `<sha>`. Scope: <paths or "whole repo">. Orchestrator: <model>.
Finders/skeptics: <model>, report-only.
Ledger: <"read, N dedupe entries" or "created this run">.
Frame vs prior run: <rotated parameter (evidence/direction/entry) or "first audit">.

## Ground rules
Finders report only. Every claim cites file:line. Clean claims cite coverage.
Every HIGH/MED gets a refute-by-default skeptic (panel lenses: 3-skeptic majority).
Dedupe list below is mandatory finder input. This dir is git-excluded, never committed.

## Dedupe list (closed / refuted / WONTFIX from ledger)
<ID — one-line topic, one per row; or "none — first audit">

## Seam census                          <!-- Phase 0 step 3; embed in lens #4 prompt -->
<producer ↔ consumer, one per row; or "single-tier, no seams noted">

## Contract clauses                     <!-- Phase 0 step 4; embed in lens #20 prompt -->
<clause — source doc:line, one per row; or "no requirement docs found">

## Journeys                             <!-- Phase 0 step 5; Phase 4 decision keys to these -->
<J1: one-line end-to-end flow, one per row>

## Lenses / readers
| # | Log | Lens/Area | Panel | Repro | Focus or file list |
|---|-----|-----------|-------|-------|--------------------|

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

## Latent (blocked ONLY by another open defect — reactivate when the mask is fixed)
- <ID> masked by <masking ID/location>: <one-line scenario>   <!-- or "none" -->

## Downgraded
- <ID> <orig> -> <new>: <one-line reason>

## Refuted (future runs: do not re-discover)
- <ID>: <one-line refutation>

## Standing residuals                   <!-- ALL open deferred/wontfix/latent across ALL ledger runs -->
Re-presented every run — dedupe never hides these; they sum into the decision:
- <ledger id> [<status>]: <topic>       <!-- or "none" -->

## Repro harvest                        <!-- failing tests skeptics saved; fix mode graduates them -->
- <ID>: `<dir>/repros/<file>`           <!-- or "none written" -->

## Blind spots                          <!-- filesReadUnion diffed vs in-scope list -->
<in-scope files no lens read: list or "none">. <Gap-fill reader spawned: yes/no + result>

## Not proven                           <!-- verification ACTIVITIES not performed, not files -->
Honest negative attestation — what this run did NOT do (e.g. artifact never
installed, migration rehearsal not run, E2E suite skipped, no live-provider test):
- <activity>: <why skipped / what would prove it>

## Journey verdict
| Journey | Status | Blocking IDs |
|---------|--------|--------------|
| <J1 one-line flow> | PROVEN / UNPROVEN / BROKEN | <IDs or -> |

**Decision: <SHIP | BLOCK> — <one sentence, derived from the journey table and
standing residuals, NOT from finding counts. "All findings dispositioned" is not
"ready".>**

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
      "frame": "<evidence/direction/entry-point summary, e.g. 'static, code-forward, files'>",
      "journeys": [ { "name": "<one line>", "status": "PROVEN|UNPROVEN|BROKEN" } ],
      "lenses": [
        { "key": "<lens>", "findings": 0, "confirmed": 0, "refuted": 0, "downgraded": 0, "note": "<prompt-needs-work etc, optional>" }
      ]
    }
  ],
  "findings": [
    { "id": "<run-date>/<ID>", "status": "open|latent|closed|refuted|wontfix|deferred", "file": "<path>", "topic": "<one line>", "commit": "<sha when closed, else null>", "masked_by": "<finding id, latent only>", "invariant": "<one line, set by fix mode on close>", "repro": "<harvested repro path or null>" }
  ]
}
```

Status meanings: `open` = confirmed, not yet fixed (fix mode flips to `closed`).
`latent` = confirmed but blocked by `masked_by`'s defect — fix mode re-verifies it
whenever the masking finding is fixed. `refuted`/`wontfix` = permanent dedupe
entries. Dedupe list for future runs = every entry with status
closed/refuted/wontfix, formatted `<id> — <topic>`. `latent` and `deferred` are
NEVER in the dedupe list — they appear in every report's Standing residuals until
resolved.

## Consolidation rules

- Sanity-check LOW/INFO yourself (no skeptics ran); drop noise before listing.
- Rows the dedupe merged (`also_lenses` field): verify the merge was correct — a
  wrong merge hides a distinct bug.
- Refuted/downgraded lists are dedupe input for the next run — never omit them.
- PANEL-SPLIT findings appear in md_verification but NOT md_summary — your
  resolution decides which list they join.
- Latent findings count at full severity in the journey verdict and shortlist —
  the mask WILL be fixed, which makes them live.
- Journey verdict rules: BROKEN = a surviving finding sits on the journey's path;
  UNPROVEN = no finding, but no end-to-end evidence either (static reads and
  seam-mocked tests do not prove a journey; a repro, E2E test through production
  composition, or documented manual run does). PROVEN requires citable evidence.
- The Not proven section is mandatory even when empty-looking — an audit that
  cannot name what it skipped is overclaiming.
