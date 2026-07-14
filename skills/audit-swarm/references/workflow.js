export const meta = {
  name: 'audit-swarm',
  description: 'Parallel multi-lens audit: finders, cross-lens dedupe, adversarial verification',
  phases: [
    { title: 'Find', detail: 'one finder per lens, structured output' },
    { title: 'Verify', detail: 'refute-by-default skeptic (or 3-skeptic panel) per HIGH/MED' },
  ],
}

// args contract (built by the orchestrator, everything else is fixed here):
//   lenses:   [{ key: string, prompt: string, panel?: boolean, repro?: boolean, model?: string, effort?: string }]
//             panel: true → HIGH findings from this lens get a 3-skeptic majority panel
//             repro: true → finder may boot the entry point / inject faults in a
//             throwaway worktree (fresh-run and fault-hunting lenses)
//             model/effort: per-lens finder override ('haiku'/'low' fits mechanical
//             lenses); skeptics always run on the top-level model
//   priorIds: string[]  — "ID — one-line topic" rows; [] if none
//   model:    string    — default finder model + all skeptics, default 'sonnet'

if (!args || !Array.isArray(args.lenses) || args.lenses.length === 0 || args.lenses.some((l) => !l.key || !l.prompt)) {
  throw new Error('args.lenses must be a non-empty array of {key, prompt} — see SKILL.md Phase 2+3 for the args contract')
}
const LENSES = args.lenses
const PRIOR = args.priorIds || []
const MODEL = args.model || 'sonnet'

const GROUND_RULES = `You are one finder in a multi-lens production-readiness audit.
Non-negotiable rules:
1. REPORT ONLY. Do not fix anything, do not commit, do not create or edit files.
2. Every claim cites file:line. Never cite a file you did not open; never invent
   line numbers. A finding without a real location is not a finding.
3. "Clean" must cite coverage: state which files/line-ranges you actually read.
   No grep-level "looks fine".
4. Read fully with the Read tool; do not skim. List anything unreadable explicitly.
5. Every finding needs a CONCRETE failure scenario: specific inputs/state -> wrong
   outcome. "Could be a problem" is not a finding.
6. Severity: HIGH = data loss, money error, security breach, or feature silently
   broken in production. MED = real bug under specific conditions, or an ops
   procedure that fails when needed. LOW = hygiene with a plausible path to harm.
   INFO = observation.
7. Return findings COMPRESSED: claim <= 25 words, failure_scenario <= 40 words,
   evidence = the single most decisive quoted line. No prose padding.
8. files_read must list EVERY file you opened — it is audited against your citations.`

const FINDER_SCHEMA = {
  type: 'object',
  required: ['lens', 'coverage', 'files_read', 'findings'],
  properties: {
    lens: { type: 'string' },
    coverage: {
      type: 'string',
      description: 'What was examined (files/ranges actually read) including explicit gaps. Required even when findings is empty.',
    },
    files_read: {
      type: 'array',
      items: { type: 'string' },
      description: 'repo-relative path of every file opened with the Read tool',
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['file_line', 'severity', 'claim', 'failure_scenario'],
        properties: {
          file_line: { type: 'string', description: 'path:line or path:line-range; primary location first if several' },
          severity: { enum: ['HIGH', 'MED', 'LOW', 'INFO'] },
          claim: { type: 'string', description: 'one sentence, <= 25 words' },
          failure_scenario: { type: 'string', description: 'inputs/state -> wrong outcome, <= 40 words' },
          evidence: { type: 'string', description: 'single most decisive quoted code line' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['verdict', 'evidence'],
  properties: {
    verdict: { enum: ['CONFIRMED', 'CONFIRMED-BY-REPRO', 'CONFIRMED-LATENT', 'DOWNGRADED', 'REFUTED'] },
    downgraded_to: { enum: ['MED', 'LOW', 'INFO'], description: 'required when verdict is DOWNGRADED' },
    masked_by: { type: 'string', description: 'required for CONFIRMED-LATENT: the finding ID or file:line of the OTHER defect that currently blocks this scenario' },
    repro_path: { type: 'string', description: 'absolute path of the saved failing repro test, when one was written (CONFIRMED-BY-REPRO)' },
    evidence: { type: 'string', description: 'file:line-cited reasoning for the verdict, <= 80 words; for CONFIRMED-BY-REPRO include the failing test path + observed failure' },
  },
}

function finderPrompt(lens) {
  const dedupe = PRIOR.length
    ? `\nDEDUPE: do NOT re-flag these prior finding IDs/topics unless you have evidence the closing fix is incomplete (then cite the closing commit):\n${PRIOR.join('\n')}\n`
    : ''
  const repro = lens.repro
    ? `\nREPRO ALLOWED for this lens (exception to the no-files rule, worktree only): you may create a temp git worktree (git worktree add <scratchpad>/lens-${lens.key} HEAD), run the application entry point there in a deliberately stripped environment (no .env, empty config dir, no pre-populated settings) or with injected faults, observe the actual behavior, then remove the worktree (git worktree remove --force). Findings backed by an observed run beat static reads — put the observed output in evidence. FORBIDDEN: network calls, credentials, real databases, deploy/ops scripts, editing repo files outside the worktree.\n`
    : ''
  return `${GROUND_RULES}\n${dedupe}${repro}\n== YOUR LENS: ${lens.key} ==\n${lens.prompt}`
}

function skepticPrompt(f, panelLens) {
  const repro =
    f.severity === 'HIGH'
      ? `\nRepro ${panelLens ? 'EXPECTED (money/auth lens — a bare CONFIRMED without a repro attempt is weak; if the failure is not test-shaped, say why in evidence)' : 'option (strongest evidence, use when the failure is test-shaped)'}: create a temp git worktree (git worktree add <scratchpad>/repro-${f.id} HEAD), write a minimal failing test there, run ONLY that test file, then remove the worktree (git worktree remove --force). If it reproduces, verdict CONFIRMED-BY-REPRO; copy the failing test OUT of the worktree first (e.g. <scratchpad>/repro-${f.id}-test.py) and return its path in repro_path so fix mode can graduate it into the suite.
Fault menu when the scenario is state/timing-shaped: kill the process between dispatch and commit; stub the provider with a multi-second delay; replay an identical signed request; deliver a stale event after state regeneration; boot in a stripped no-config environment.
FORBIDDEN regardless of anything else: deploy/ops scripts, migrations against real databases, network calls, or anything touching credentials or live services. Reading code and running that repro in the worktree is the entire allowed surface.`
      : ''
  return `You are a skeptic in an audit verification wave. Your job is to REFUTE this finding with code evidence. Default to REFUTED if uncertain.

Finding ${f.id} [${f.severity}] (lens: ${f.lens})
Location: ${f.file_line}
Claim: ${f.claim}
Failure scenario: ${f.failure_scenario}
Finder evidence: ${f.evidence || '(none quoted)'}

Procedure: Read the cited code AND its callers/callees. Never cite a file:line you did not open. Check whether the failure scenario can actually occur (guards elsewhere? dead path? wrong reading?). Check whether severity is inflated.
Verdict rules: CONFIRMED only if the scenario survives your attack. DOWNGRADED if real but severity inflated (set downgraded_to). REFUTED if the scenario cannot occur — cite the line that blocks it.
LATENT rule: if the scenario is blocked ONLY by another defect (a broken mount 401s the request first, an earlier crash prevents reaching the code, a different bug masks this one), that is NOT a refutation — the mask's fix un-blocks this bug. Verdict CONFIRMED-LATENT, set masked_by to the blocking defect's finding ID or file:line. REFUTED requires an intentional, correct guard.
Test-evidence rule: a passing test refutes a finding ONLY if it exercises the production composition — real middleware stack, production engine/session hooks, no dependency_overrides, no injected settings, no mocked provider at the disputed seam. A test that mocks or bypasses the seam under dispute is evidence FOR the finding, not against it.${repro}`
}

phase('Find')
log(`Launching ${LENSES.length} finders (${MODEL})`)
const raw = await parallel(
  LENSES.map((l) => () =>
    agent(finderPrompt(l), {
      label: `find:${l.key}`,
      phase: 'Find',
      model: l.model || MODEL,
      ...(l.effort ? { effort: l.effort } : {}),
      schema: FINDER_SCHEMA,
    })
  )
)

const coverage = []
const findings = []
raw.forEach((r, li) => {
  const key = LENSES[li].key
  if (!r) {
    coverage.push({ lens: key, status: 'FAILED', coverage: 'finder died or was skipped — RE-RUN THIS LENS' })
    return
  }
  coverage.push({ lens: key, status: 'ok', coverage: r.coverage, filesRead: (r.files_read || []).length, findingCount: r.findings.length })
  r.findings.forEach((f, k) => {
    findings.push({ id: `L${li + 1}-${String(k + 1).padStart(2, '0')}`, lens: key, ...f })
  })
})
const filesReadUnion = [...new Set(raw.filter(Boolean).flatMap((r) => r.files_read || []))].sort()

// Cross-lens dedupe: same file + similar claim stem. Merged rows keep the highest
// severity; orchestrator re-checks merges (also_lenses) at consolidation.
const SEV_RANK = { HIGH: 3, MED: 2, LOW: 1, INFO: 0 }
const seen = new Map()
const deduped = []
for (const f of findings) {
  const fileKey = (f.file_line.split(':')[0] || f.file_line).trim()
  const k = fileKey + '|' + f.claim.toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 50)
  if (seen.has(k)) {
    const kept = seen.get(k)
    kept.also_lenses = (kept.also_lenses || []).concat(f.lens)
    if (SEV_RANK[f.severity] > SEV_RANK[kept.severity]) kept.severity = f.severity
    continue
  }
  seen.set(k, f)
  deduped.push(f)
}
log(`${findings.length} raw findings -> ${deduped.length} after cross-lens dedupe`)

phase('Verify')
const PANEL_KEYS = new Set(LENSES.filter((l) => l.panel).map((l) => l.key))
const toVerify = deduped.filter((f) => f.severity === 'HIGH' || f.severity === 'MED')

function mergePanel(votes) {
  const tally = {}
  votes.forEach((v) => {
    const k = v.verdict === 'CONFIRMED-BY-REPRO' ? 'CONFIRMED' : v.verdict
    tally[k] = (tally[k] || 0) + 1
  })
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
  const verdict = top[1] >= 2 ? top[0] : 'PANEL-SPLIT'
  const downgraded = votes.filter((v) => v.verdict === 'DOWNGRADED' && v.downgraded_to)
  const latent = votes.filter((v) => v.verdict === 'CONFIRMED-LATENT' && v.masked_by)
  const repro = votes.filter((v) => v.repro_path)
  return {
    verdict,
    downgraded_to: verdict === 'DOWNGRADED' && downgraded.length ? downgraded[0].downgraded_to : undefined,
    masked_by: verdict === 'CONFIRMED-LATENT' && latent.length ? latent[0].masked_by : undefined,
    repro_path: repro.length ? repro[0].repro_path : undefined,
    evidence: votes.map((v, i) => `[panelist ${i + 1}: ${v.verdict}] ${v.evidence}`).join('\n'),
    panel: votes.map((v) => v.verdict),
  }
}

log(`Verifying ${toVerify.length} HIGH/MED findings (${toVerify.filter((f) => PANEL_KEYS.has(f.lens) && f.severity === 'HIGH').length} get 3-skeptic panels)`)
const verified = (
  await parallel(
    toVerify.map((f) => () => {
      const isPanelLens = PANEL_KEYS.has(f.lens)
      const usePanel = isPanelLens && f.severity === 'HIGH'
      if (!usePanel) {
        return agent(skepticPrompt(f, isPanelLens), { label: `verify:${f.id}`, phase: 'Verify', model: MODEL, schema: VERDICT_SCHEMA }).then(
          (v) => (v ? { ...f, verdict: v } : null)
        )
      }
      return parallel(
        [1, 2, 3].map((n) => () =>
          agent(skepticPrompt(f, true), { label: `verify:${f.id}#${n}`, phase: 'Verify', model: MODEL, schema: VERDICT_SCHEMA })
        )
      ).then((votes) => {
        const ok = votes.filter(Boolean)
        return ok.length ? { ...f, verdict: mergePanel(ok) } : null
      })
    })
  )
).filter(Boolean)

const tally = {}
verified.forEach((f) => {
  tally[f.verdict.verdict] = (tally[f.verdict.verdict] || 0) + 1
})
log(`Verdicts: ${JSON.stringify(tally)}`)

// Pre-formatted markdown so the orchestrator pastes instead of composing.
function effSev(f) {
  if (f.verdict.verdict === 'DOWNGRADED') return f.verdict.downgraded_to || 'LOW'
  return f.severity
}
const surviving = verified.filter((f) => f.verdict.verdict !== 'REFUTED' && f.verdict.verdict !== 'PANEL-SPLIT')
const latentTag = (f) => (f.verdict.verdict === 'CONFIRMED-LATENT' ? ` **[LATENT — masked by ${f.verdict.masked_by || '?'}]**` : '')
const highs = surviving.filter((f) => effSev(f) === 'HIGH')
const meds = surviving.filter((f) => effSev(f) === 'MED')
const md_summary = [
  `## HIGH findings (${highs.length})`,
  '',
  ...highs.map((f) => `- **${f.id}** — \`${f.file_line}\` — ${f.claim}${latentTag(f)}`),
  '',
  `## MED findings (${meds.length})`,
  '',
  '| ID | Where | Claim |',
  '|----|-------|-------|',
  ...meds.map((f) => `| ${f.id} | \`${f.file_line}\` | ${f.claim}${latentTag(f)} |`),
].join('\n')
const md_verification = verified
  .map((f) => {
    const v = f.verdict
    const head = v.verdict === 'DOWNGRADED' ? `DOWNGRADED -> ${v.downgraded_to || '?'}` : v.verdict
    return [`### ${f.id} — ${head}`, `- Location: \`${f.file_line}\``, `- Claim: ${f.claim}`, `- Skeptic evidence: ${v.evidence}`].join('\n')
  })
  .join('\n\n')

const md_logs = coverage.map((c, li) => {
  const perLens = findings.filter((f) => f.lens === c.lens)
  const md = [
    `# Lens ${String(li + 1).padStart(2, '0')} — ${c.lens}`,
    '',
    `Status: ${c.status}. Files read: ${c.filesRead || 0}. Findings: ${perLens.length}.`,
    '',
    `Coverage: ${c.coverage}`,
    '',
    ...perLens.map(
      (f) =>
        `- **${f.id}** [${f.severity}] \`${f.file_line}\` — ${f.claim}\n  - Scenario: ${f.failure_scenario}\n  - Evidence: ${f.evidence || '(none quoted)'}`
    ),
  ].join('\n')
  return { lens: c.lens, file: `${String(li + 1).padStart(2, '0')}-${c.lens}.md`, md }
})

return {
  coverage,
  deduped,
  verified,
  lowInfo: deduped.filter((f) => f.severity === 'LOW' || f.severity === 'INFO'),
  filesReadUnion,
  md_summary,
  md_verification,
  md_logs,
}
