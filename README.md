# audit-swarm

A Claude Code skill that audits a codebase the way a red team would: many independent lenses in parallel, every finding attacked by a skeptic before it reaches the report, and a ledger so the next run starts smarter than the last.

## Why it exists

Manual audit passes sample. Sampling misses bugs. On the codebase this skill was distilled from, three careful sequential passes each "finished" and each missed HIGH-severity bugs the next one caught. A fourth pass, restructured as assigned exhaustive coverage plus adversarial verification, confirmed 81 findings the samplers never saw.

The second insight: finders lie confidently. In practice roughly 20 to 25 percent of raw HIGH and MEDIUM findings get refuted or downgraded when a dedicated skeptic, prompted to refute by default, attacks them with code evidence. Shipping unverified finder output means shipping noise.

audit-swarm packages both counters into one repeatable pipeline.

## How it works

```
Phase 0  Recon           orchestrator maps the repo: tiers, seams, stakes, prior findings
Phase 1  Lens selection  8-12 failure-mode lenses picked from an 18-lens menu,
                         plus 1-2 invented for this specific repo
Phase 2  Find            one subagent per lens, in parallel, report-only,
                         every claim cites file:line, "clean" must cite coverage
Phase 3  Verify          one skeptic per HIGH/MED finding, prompted to REFUTE,
                         default-to-refuted; money/auth lenses get 3-skeptic panels;
                         HIGHs can be confirmed by reproduction (failing test in a
                         throwaway git worktree)
Phase 4  Consolidate     severity-ranked report: HIGH bullets, MED table, blind-spot
                         list, fix-priority waves; run appended to a per-repo ledger
Phase 5  Fix (optional)  wave-based remediation: regression-proof test per fix,
                         adversarial diff review per commit, full-suite gate
```

The heavy lifting lives in a fixed workflow script (`references/workflow.js`) that the orchestrating model invokes but never has to read: ground rules, output schemas, skeptic prompts, dedupe, and verdict tallying are frozen there. The orchestrator only builds a small JSON args object. This makes the skill cheap and reliable to run with smaller models doing the orchestration.

## What makes it different

- **Refute-by-default verification.** Every HIGH/MED finding faces a skeptic whose job is to kill it. Panels of three vote on money and auth findings.
- **Reproduction beats reading.** Skeptics on HIGH findings can write a minimal failing test in a temporary git worktree and run it. CONFIRMED-BY-REPRO is the strongest verdict.
- **Cross-run learning.** A per-repo ledger accumulates closed, refuted, and WONTFIX findings (never re-discovered) plus per-lens hit/refute stats (noisy lenses get rewritten or retired).
- **Measured sensitivity.** The optional `--calibrate` flag seeds 5-6 subtle synthetic bugs in a throwaway worktree and reports finder recall: "caught 5/6 seeded bugs." An audit that states its own detection rate, not just its findings.
- **Blind-spot accounting.** Every finder reports the files it actually read. The union is diffed against the in-scope inventory, so "nobody looked at the installer" appears in the report instead of silently happening.

## Install

As a plugin:

```
/plugin marketplace add MSizzle/audit-swarm
/plugin install audit-swarm
```

Or manually:

```
git clone https://github.com/MSizzle/audit-swarm
cp -r audit-swarm/skills/audit-swarm ~/.claude/skills/
```

## Usage

```
/audit-swarm                          first full audit of a repo
/audit-swarm --mode lenses            repeat audit, fresh failure-mode lenses
/audit-swarm --mode delta --since v1.2.0    changed code + its callers + seams only
/audit-swarm --mode fix --fix .planning/audit-2026-07-13/99-FINDINGS.md
/audit-swarm --calibrate              adds seeded-bug recall measurement
```

Modes: `full` (coverage readers + lenses), `lenses`, `coverage`, `delta`, `fix`.

## Requirements and cost

- Claude Code with the Workflow tool (subagent orchestration). Without it the skill degrades to parallel Agent calls.
- A typical lens run spawns 8-12 finder subagents plus one skeptic per HIGH/MED finding. `--calibrate` roughly doubles finder spend. Delta mode is the cheap recurring option and works well as a pre-release gate.
- Finders and skeptics default to Sonnet; the orchestrator inherits your session model.

## Safety notes

- Finders are report-only: no fixes, no commits, no file writes outside the audit directory.
- Skeptic reproduction is restricted to one action: write a failing test in a temporary git worktree and run that single test. Application entry points, deploy scripts, migrations against real databases, network calls, and anything touching credentials are explicitly forbidden in the prompt. Read that block in `references/workflow.js` before auditing a repo with live credentials, and judge for yourself.
- Audit artifacts (finding logs quote raw code) are written to a directory registered in `.git/info/exclude`, never committed.

## Layout

```
skills/audit-swarm/
  SKILL.md                    orchestration spine: phases, gates, anti-hallucination rules
  references/
    lenses.md                 18-lens menu, mandatory-by-stakes rules, ledger pruning
    workflow.js               fixed fan-out script: schemas, prompts, panels, dedupe
    report-format.md          verbatim report and ledger templates
    calibration.md            seeded-bug recall procedure
    fix-mode.md               remediation loop with adversarial diff review
```

## License

MIT
