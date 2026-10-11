import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import { internalQuery } from "./_generated/server"

export async function requireOwnedMission(ctx: any, missionId: any) {
  const userId = await requireOperator(ctx)
  const mission = await ctx.db.get(missionId)
  if (!mission || mission.ownerKey !== userId) throw new ConvexError("Mission not found or access denied")
  return mission
}

export async function requireOperator(ctx: any) {
  const userId = await getAuthUserId(ctx)
  // ConvexError serializes the message to the client, so the browser can
  // distinguish an expired operator session from a genuine server failure.
  // A plain Error is replaced with a generic "Server Error" client-side.
  if (!userId) throw new ConvexError("Authenticated operator session required")
  return userId
}

export const currentOperator = internalQuery({
  args: {},
  handler: async (ctx) => getAuthUserId(ctx),
})
