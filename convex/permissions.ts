import { getAuthUserId } from "@convex-dev/auth/server"
import { internalQuery } from "./_generated/server"

export async function requireOperator(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Authenticated operator session required")
  return userId
}

export const currentOperator = internalQuery({
  args: {},
  handler: async (ctx) => getAuthUserId(ctx),
})
