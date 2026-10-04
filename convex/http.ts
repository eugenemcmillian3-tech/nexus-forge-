import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { api } from "./_generated/api"
import { auth } from "./auth"

const http = httpRouter()

auth.addHttpRoutes(http)

http.route({
  path: "/github-actions/delivery-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = process.env.NEXUS_FORGE_DELIVERY_SECRET
    if (!expected) return new Response("Delivery secret is not configured", { status: 503 })

    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!supplied || supplied !== expected) return new Response("Unauthorized", { status: 401 })

    let body: { deliveryId?: string; conclusion?: string; runUrl?: string; commitSha?: string; summary?: string }
    try {
      body = await request.json()
    } catch {
      return new Response("Invalid JSON", { status: 400 })
    }

    if (!body.deliveryId || !body.conclusion || !body.runUrl || !body.commitSha) {
      return new Response("Missing deliveryId, conclusion, runUrl, or commitSha", { status: 400 })
    }

    try {
      await ctx.runMutation(api.delivery.recordWorkflowResult, {
        id: body.deliveryId as any,
        conclusion: body.conclusion,
        runUrl: body.runUrl,
        commitSha: body.commitSha,
        summary: body.summary ?? "GitHub Actions result received.",
      })
      return Response.json({ ok: true })
    } catch (error) {
      return Response.json({ ok: false, error: error instanceof Error ? error.message : "Delivery update failed" }, { status: 422 })
    }
  }),
})

export default http
