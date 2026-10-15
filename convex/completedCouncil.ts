import type { QueryCtx } from './_generated/server'
import type { Doc } from './_generated/dataModel'
const stages = ['council-plan', 'council-Vision Architect', 'council-Research Oracle', 'council-Systems Engineer', 'council-Builder Agent', 'council-Creative Director', 'council-critic', 'council-decision']
const agents = ['Vision Architect', 'Research Oracle', 'Systems Engineer', 'Builder Agent', 'Creative Director', 'Critic Agent']
type Outcome = { block: string | null; result?: string; proof?: string }
export async function completedCouncilOutcome(ctx: Pick<QueryCtx, 'db'>, claim: Doc<'executionClaims'>): Promise<Outcome> {
  if (claim.status !== 'uncertain' || claim.scope !== 'council' || !claim.workKey.startsWith('runner:')) return { block: 'Only an uncertain runner Council completion can be reconciled.' }
  const runId = ctx.db.normalizeId('missionRuns', claim.workKey.slice(7))
  const run = runId ? await ctx.db.get('missionRuns', runId) : null
  const mission = await ctx.db.get('missions', claim.missionId)
  if (!run || !mission || run.missionId !== mission._id || !mission.approved || mission.status !== 'review' || run.status !== 'paused' || run.currentStage !== 'execution_recovery') return { block: 'Mission and runner are not at the completed Council recovery checkpoint.' }
  const snapshot = await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey', q => q.eq('claimId', claim._id).eq('effectKey', 'council-context:v1')).unique()
  const final = await ctx.db.query('executionEffects').withIndex('by_claimId_and_effectKey', q => q.eq('claimId', claim._id).eq('effectKey', 'council-result')).unique()
  if (!snapshot || !final) return { block: 'Saved Council context and final result are both required.' }
  let saved: { context?: { missionText?: string; researchContext?: string; learningContext?: string; preflightContext?: string }; memoryReceiptId?: string }, summary: unknown
  try { saved = JSON.parse(snapshot.payload); summary = JSON.parse(final.payload).summary } catch { return { block: 'Saved Council evidence is malformed.' } }
  const receiptId = typeof saved.memoryReceiptId === 'string' ? ctx.db.normalizeId('councilMemoryReceipts', saved.memoryReceiptId) : null
  const receipt = receiptId ? await ctx.db.get('councilMemoryReceipts', receiptId) : null
  if (!receipt || receipt.ownerKey !== mission.ownerKey || receipt.missionId !== mission._id || receipt.status !== 'planner-responded' || saved.context?.missionText !== mission.mission || receipt.missionText !== mission.mission || receipt.learningContext !== saved.context.learningContext || receipt.preflightContext !== saved.context.preflightContext || typeof saved.context.researchContext !== 'string') return { block: 'Saved inputs and planner receipt do not match this mission.' }
  if (typeof summary !== 'string' || !summary.trim()) return { block: 'No usable final Council summary exists.' }
  const result = JSON.stringify({ ok: true, summary })
  if (new TextEncoder().encode(result).length > 256 * 1024) return { block: 'The final Council result exceeds its recovery bound.' }
  const rows = await ctx.db.query('providerInvocations').withIndex('by_missionRunId_and_stage_and_role_and_outcome', q => q.eq('missionRunId', run._id).gte('stage', 'council-').lt('stage', 'council.')).take(9)
  if (rows.length !== stages.length || new Set(rows.map(row => row.stage)).size !== stages.length || rows.some(row => !stages.includes(row.stage) || row.missionId !== mission._id || row.ownerKey !== mission.ownerKey || row.outcome !== 'succeeded')) return { block: 'All eight unique Council stages must have confirmed successful outcomes.' }
  for (const row of rows) {
    const answer = await ctx.db.query('providerResults').withIndex('by_invocation', q => q.eq('invocationId', row._id)).unique()
    if (!answer || !/^[a-f0-9]{64}$/.test(answer.requestDigest)) return { block: 'Every Council stage must retain a durable answer.' }
  }
  const runs = await ctx.db.query('agentRuns').withIndex('by_mission', q => q.eq('missionId', mission._id)).take(7)
  if (runs.length !== agents.length || new Set(runs.map(row => row.agent)).size !== agents.length || runs.some(row => !agents.includes(row.agent) || row.status !== 'complete')) return { block: 'All six Council agents must have persisted completion.' }
  return { block: null, result, proof: JSON.stringify([snapshot._id, final._id, receipt._id, rows.map(row => [row._id, row.outcome]), runs.map(row => [row._id, row.status])]) }
}
