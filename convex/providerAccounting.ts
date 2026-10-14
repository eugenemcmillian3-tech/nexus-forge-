import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'
import { callAiProvider } from './aiProvider'

export async function callManagedAi(ctx: Pick<ActionCtx, 'runMutation'>, args: { ownerKey: string; missionId?: Id<'missions'>; missionRunId?: Id<'missionRuns'>; stage: string; role: Parameters<typeof callAiProvider>[0]; prompt: string; maxTokens: number }): Promise<string> {
  let invocationId: Id<'providerInvocations'>
  try { invocationId = await ctx.runMutation(internal.providerUsage.begin, { ownerKey: args.ownerKey, ...(args.missionId ? { missionId: args.missionId } : {}), ...(args.missionRunId ? { missionRunId: args.missionRunId } : {}), stage: args.stage, role: args.role }) }
  catch { throw new Error('Could not prepare provider accounting. No inference request was started.') }
  let observedReports = 0
  const record = async (usage: Parameters<NonNullable<Parameters<typeof callAiProvider>[3]>>[0]) => {
    observedReports++
    await ctx.runMutation(internal.manifestIntelligence.recordProviderUsageInternal, { ownerKey: args.ownerKey, ...usage, invocationId, reportOrdinal: observedReports })
  }
  const finish = async (outcome: 'succeeded' | 'failed') => {
    try { await ctx.runMutation(internal.providerUsage.finish, { invocationId, outcome, observedReports }) }
    catch { console.warn('Provider accounting finalization failed; the durable invocation remains pending for review. No inference retry was made.') }
  }
  try {
    const answer = await callAiProvider(args.role, args.prompt, args.maxTokens, record)
    await finish('succeeded')
    return answer
  } catch (error) { await finish('failed'); throw error }
}
