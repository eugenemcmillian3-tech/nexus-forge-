import { httpRouter } from "convex/server"
import { httpAction } from "./_generated/server"
import { auth } from "./auth"
import { internal } from "./_generated/api"
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

    await ctx.runMutation(internal.delivery.recordWorkflowResult, {
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


http.route({
  path: "/github-actions/deployment-result",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expected = requiredEnv("NEXUS_FORGE_DELIVERY_SECRET")
    if (request.headers.get("Authorization") !== `Bearer ${expected}`) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })
    let body: { deliveryId?: string; runUrl?: string; commitSha?: string; deploymentUrl?: string; summary?: string }
    try { body = await request.json() } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } }) }
    if (!body.deliveryId || !body.runUrl || !body.commitSha || !body.deploymentUrl) return new Response(JSON.stringify({ error: "Missing deployment evidence fields" }), { status: 400, headers: { "Content-Type": "application/json" } })
    let site: URL
    try { site = new URL(body.deploymentUrl) } catch { return new Response(JSON.stringify({ error: "Invalid deployment URL" }), { status: 400, headers: { "Content-Type": "application/json" } }) }
    const safeHost = (u: URL) => { const host=u.hostname.toLowerCase(); return u.protocol==="https:"&&!u.username&&!u.password&&!!host&&host!=="localhost"&&!host.endsWith(".localhost")&&!host.endsWith(".local")&&!host.endsWith(".internal")&&host!=="metadata.google.internal"&&host!=="metadata"&&!host.includes(":")&&!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)&&!/^0x[\da-f]+$/i.test(host)&&!/^\d+$/.test(host)&&(!u.port||u.port==="443") }
    if (!safeHost(site)) return new Response(JSON.stringify({ error: "Deployment URL must be a public HTTPS hostname on the standard port" }), { status: 400, headers: { "Content-Type": "application/json" } })
    site.hash=""
    let response: Response | undefined, current=site.toString()
    try { for(let hop=0;hop<=5;hop++){ response=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(10000)}); if(![301,302,303,307,308].includes(response.status)) break; const location=response.headers.get("location"); if(!location||hop===5) throw new Error("Redirect limit exceeded"); const next=new URL(location,current); if(!safeHost(next)) throw new Error("Unsafe redirect"); current=next.toString() } } catch { return new Response(JSON.stringify({error:"Deployment readiness probe failed safely"}),{status:409,headers:{"Content-Type":"application/json"}}) }
    const html=response?await response.text().catch(()=>""):""
    const checks=[current.startsWith("https://"),!!response?.ok,/<!doctype html/i.test(html)||(/<html/i.test(html)&&/<body/i.test(html)),/<title[^>]*>\s*[^<]+\s*<\/title>/i.test(html),/<meta[^>]+name=["']viewport["'][^>]*>/i.test(html),/<meta[^>]+charset/i.test(html)||/charset=/i.test(JSON.stringify(Object.fromEntries((response?.headers??new Headers()).entries())))]
    if(!checks[0]||!checks[1]||!checks[2]||!checks[4]) return new Response(JSON.stringify({error:"Deployment failed required readiness checks",passedCount:checks.filter(Boolean).length,totalCount:checks.length}),{status:409,headers:{"Content-Type":"application/json"}})
    await ctx.runMutation(internal.delivery.recordDeploymentResult,{id:body.deliveryId as Id<"deliveries">,runUrl:body.runUrl,commitSha:body.commitSha,deploymentUrl:current,summary:body.summary??"Deployment readiness probe passed.",readinessPassedCount:checks.filter(Boolean).length,readinessTotalCount:checks.length})
    return new Response(JSON.stringify({ok:true,verified:true,passedCount:checks.filter(Boolean).length,totalCount:checks.length}),{status:200,headers:{"Content-Type":"application/json"}})
  }),
})

export default http
