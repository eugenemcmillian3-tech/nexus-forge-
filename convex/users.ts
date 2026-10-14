import type { Doc } from "./_generated/dataModel"
import { query } from "./_generated/server"
import { getAuthUserId } from "@convex-dev/auth/server"

export const currentLoggedInUser = query({
  args: {},
  handler: async (ctx): Promise<Doc<"users"> | null> => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    return await ctx.db.get("users", userId)
  },
})
