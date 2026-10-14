import { describe, expect, it } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api } from "../convex/_generated/api"
const modules = import.meta.glob("../convex/**/*.ts")
const identity = (subject: string) => ({ subject, issuer: "https://nexus-forge.test", tokenIdentifier: `https://nexus-forge.test|${subject}` })
async function fixture(status: "escalated" | "open" = "escalated") {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => {
    const missionId = await ctx.db.insert("missions", { title: "Recovery", mission: "Review an actual failure", autonomy: "guided", budget: 0, status: "blocked", completion: 0, approved: true, ownerKey: "owner-a" })
    const runId = await ctx.db.insert("missionRuns", { missionId, startedAt: 1, deadlineAt: 2, maxRetries: 2, retries: 2, status: "escalated", currentStage: "timeout_escalation", nextActionAt: 1 })
    const incidentId = await ctx.db.insert("incidents", { missionId, runId, kind: "test", stage: "timeout", message: "Execution timeout", attempts: 2, status, createdAt: 1 })
    return { missionId, runId, incidentId }
  })
  return { t, ...ids }
}
const notes = { recovery: "Reviewed the timeout and corrected the input.", lesson: "Check the input contract before starting the next run." }
describe("documented escalation recovery", () => {
  it("rejects anonymous review", async () => {
    const { t, incidentId } = await fixture()
    await expect(t.mutation(api.incidents.reviewEscalated, { incidentId, ...notes })).rejects.toThrow()
  })
  it("rejects review by another owner", async () => {
    const { t, incidentId } = await fixture()
    await expect(t.withIdentity(identity("owner-b")).mutation(api.incidents.reviewEscalated, { incidentId, ...notes })).rejects.toThrow(/not found or access denied/i)
  })
  it("rejects incomplete recovery notes without resolving the incident", async () => {
    const { t, incidentId } = await fixture()
    await expect(t.withIdentity(identity("owner-a")).mutation(api.incidents.reviewEscalated, { incidentId, recovery: "short", lesson: notes.lesson })).rejects.toThrow(/12 characters/)
    expect((await t.run(ctx => ctx.db.get(incidentId)))?.status).toBe("escalated")
  })
  it("records the owner's review and audit evidence without restarting execution", async () => {
    const { t, missionId, runId, incidentId } = await fixture()
    await t.withIdentity(identity("owner-a")).mutation(api.incidents.reviewEscalated, { incidentId, ...notes })
    const data = await t.run(async ctx => ({ incident: await ctx.db.get(incidentId), run: await ctx.db.get(runId), mission: await ctx.db.get(missionId), audit: await ctx.db.query("auditEvents").collect() }))
    expect(data.incident).toMatchObject({ status: "resolved", ...notes })
    expect(data.incident?.resolvedAt).toBeGreaterThan(0)
    expect(data.run?.status).toBe("escalated")
    expect(data.mission?.status).toBe("blocked")
    expect(data.audit).toHaveLength(1)
    expect(data.audit[0]).toMatchObject({ missionId, runId, eventType: "incident:human_review_resolved" })
  })
  it("rejects review of an incident that is not escalated", async () => {
    const { t, incidentId } = await fixture("open")
    await expect(t.withIdentity(identity("owner-a")).mutation(api.incidents.reviewEscalated, { incidentId, ...notes })).rejects.toThrow(/Only an escalated incident/)
  })
  it("rejects cross-owner diagnosis before contacting a provider", async () => {
    const { t, incidentId } = await fixture()
    await expect(t.withIdentity(identity("owner-b")).action(api.incidents.diagnose, { incidentId })).rejects.toThrow(/not found or access denied/i)
  })
})
