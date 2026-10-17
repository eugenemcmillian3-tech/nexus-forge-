import { v } from 'convex/values'
export const taskKind = v.union(v.literal('research'), v.literal('artifact'), v.literal('delivery'))
export const taskFields = {
  ownerKey: v.string(), missionId: v.id('missions'), kind: taskKind,
  status: v.union(v.literal('pending'), v.literal('success'), v.literal('failed')),
  startedAt: v.number(), finishedAt: v.optional(v.number()), sourceRef: v.optional(v.string()),
}
