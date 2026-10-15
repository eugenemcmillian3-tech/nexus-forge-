import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import type { ActionCtx } from './_generated/server'
import { callAiProvider } from './aiProvider'

export async function callManagedAi(ctx: Pick<ActionCtx, 'runMutation'>, args: { ownerKey: string; missionId?: Id<'missions'>; missionRunId?: Id<'missionRuns'>; stage: string; role: Parameters<typeof callAiProvider>[0]; prompt: string; maxTokens: number }): Promise<string> {
  let invocationId: Id<'providerInvocations'>
  const identity = { ownerKey: args.ownerKey, ...(args.missionId ? { missionId: args.missionId } : {}), ...(args.missionRunId ? { missionRunId: args.missionRunId } : {}), stage: args.stage, role: args.role }
  // Stable request contract: changed prompts/limits cannot silently reuse an old answer.
  const requestDigest = args.missionRunId
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([args.role, args.prompt, args.maxTokens])))), byte => byte.toString(16).padStart(2, '0')).join('')
    : ''
  try {
    if (args.missionRunId) {
      const recovered = await ctx.runMutation(internal.providerRecovery.reserve, { ...identity, requestDigest })
      if (recovered.answer !== undefined) return recovered.answer
      invocationId = recovered.invocationId
    } else {
      // Explicit direct requests remain independent; they are not runner-stage retries.
      invocationId = await ctx.runMutation(internal.providerUsage.begin, identity)
    }
  } catch { throw new Error('Could not prepare provider accounting. No inference request was started. Existing runner work may require review or an explicit new run.') }
  let observedReports = 0
  const record = async (usage: Parameters<NonNullable<Parameters<typeof callAiProvider>[3]>>[0]) => {
    observedReports++
    await ctx.runMutation(internal.manifestIntelligence.recordProviderUsageInternal, { ownerKey: args.ownerKey, ...usage, invocationId, reportOrdinal: observedReports })
  }
  const finish = async (outcome: 'succeeded' | 'failed') => {
    try { await ctx.runMutation(internal.providerUsage.finish, { invocationId, outcome, observedReports }) }
    catch { console.warn('Provider accounting finalization failed; the durable invocation remains pending for review. No inference retry was made.') }
  }
  let answer: string
  try { answer = await callAiProvider(args.role, args.prompt, args.maxTokens, record) }
  catch (error) { await finish('failed'); throw error }
  if (args.missionRunId) {
    try { await ctx.runMutation(internal.providerRecovery.complete, { invocationId, requestDigest, answer, observedReports }) }
    catch {
      // Never mark failed or retry here: the provider has already returned an answer.
      // A lost acknowledgement may have committed successfully; reserve can recover it.
      throw new Error('Provider answered but durable result confirmation failed. Review the invocation before retrying; no inference retry was made.')
    }
  } else { await finish('succeeded') }
  return answer
}
