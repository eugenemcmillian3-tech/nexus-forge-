import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { auth } from "./auth"
import { api } from "./_generated/api"
import type { Id } from "./_generated/dataModel"

const http = httpRouter()

auth.addHttpRoutes(http)

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

http.route({
  path: "/github-actions/delivery-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = requiredEnv("NEXUS_FORGE_DELIVERY_SECRET")
    const provided = request.headers.get("Authorization")
    if (provided !== `Bearer ${expected}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    let body: { deliveryId?: string; conclusion?: string; runUrl?: string; commitSha?: string; summary?: string }
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!body.deliveryId || !body.conclusion || !body.runUrl || !body.commitSha) {
      return new Response(JSON.stringify({ error: "Missing required fields: deliveryId, conclusion, runUrl, commitSha" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    await ctx.runMutation(api.delivery.recordWorkflowResult, {
      id: body.deliveryId as Id<"deliveries">,
      conclusion: body.conclusion,
      runUrl: body.runUrl,
      commitSha: body.commitSha,
      summary: body.summary ?? "",
    })

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }),
})

export default http
