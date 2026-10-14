import { v } from 'convex/values'
import { internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { artifactCiState, ciStepResults } from './artifactCiValidators'
import { summarizeBrowserRun } from './artifactTestPlan'
export const context = internalQuery({
  args: { testRunId: v.id('artifactTestRuns'), operatorId: v.string(), currentRequired: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get('artifactTestRuns', args.testRunId)
    if (!row || row.operatorId !== args.operatorId) throw new Error('Test snapshot not found or access denied')
    const mission = await ctx.db.get('missions', row.missionId), artifact = await ctx.db.get('artifacts', row.artifactId)
    if (!mission || !artifact || mission.ownerKey !== args.operatorId) throw new Error('Test snapshot not found or access denied')
    if (args.currentRequired && (mission.mission !== row.missionSnapshot || artifact.content !== row.artifactSnapshot)) throw new Error('Saved snapshot is historical. Run current browser checks before publishing a CI snapshot.')
    return row
  },
})
export const published = internalMutation({
  args: { testRunId: v.id('artifactTestRuns'), state: artifactCiState }, returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get('artifactTestRuns', args.testRunId)
    if (!row) throw new Error('Test snapshot not found')
    if (row.ci && (row.ci.snapshotSha !== args.state.snapshotSha || row.ci.commitSha !== args.state.commitSha)) throw new Error('Published snapshot provenance is immutable')
    await ctx.db.patch('artifactTestRuns', args.testRunId, { ci: { ...row.ci, ...args.state } })
    return null
  },
})
export const verified = internalMutation({
  args: { testRunId: v.id('artifactTestRuns'), snapshotSha: v.string(), runUrl: v.string(), attempt: v.number(), checkId: v.number(), results: ciStepResults },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get('artifactTestRuns', args.testRunId)
    if (!row?.ci || row.ci.snapshotSha !== args.snapshotSha) throw new Error('CI snapshot provenance mismatch')
    const summary = summarizeBrowserRun(row.criteria, row.plan, args.results)
    if (row.ci.verifiedAt && (row.ci.runUrl !== args.runUrl || row.ci.attempt !== args.attempt || row.ci.checkId !== args.checkId)) throw new Error('Verified CI receipt is immutable; create a fresh saved test run for another CI attempt')
    await ctx.db.patch('artifactTestRuns', args.testRunId, { ci: { ...row.ci, runUrl: args.runUrl, attempt: args.attempt, checkId: args.checkId, results: args.results, outcome: summary.allPassed ? 'passed' : summary.failed ? 'failed' : 'partial', verifiedAt: Date.now() } })
    await ctx.runMutation(internal.audit.record, { missionId: row.missionId, type: 'artifact', action: 'exact_ci_verified', status: summary.allPassed ? 'passed' : 'needs_review', detail: `Exact snapshot CI: ${summary.passed}/${summary.total} criteria passed; commit ${row.ci.commitSha}; ${args.runUrl} attempt ${args.attempt}. Approval and delivery unchanged.` })
    return null
  },
})
