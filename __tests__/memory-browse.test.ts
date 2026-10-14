import { describe, expect, it } from "vitest"
import { convexTest } from "convex-test"
import schema from "../convex/schema"
import { api } from "../convex/_generated/api"
const modules = import.meta.glob("../convex/**/*.ts")
const identity = (subject: string) => ({ subject, issuer: "https://nexus-forge.test", tokenIdentifier: `https://nexus-forge.test|${subject}` })
async function fixture() {
  const t = convexTest(schema, modules)
  const ids = await t.run(async ctx => {
    const mission = (ownerKey: string) => ctx.db.insert("missions", { title: "Memory search", mission: "Retrieve saved mission evidence", autonomy: "guided", budget: 0, status: "draft", completion: 0, approved: false, ownerKey })
    const first = await mission("owner-a"), second = await mission("owner-a"), other = await mission("owner-b")
    await ctx.db.insert("memories", { ownerKey: "owner-a", missionId: first, category: "lesson", key: "first", value: "Orchard recovery evidence from Council", confidence: 0.5, source: "Council" })
    await ctx.db.insert("memories", { ownerKey: "owner-a", missionId: second, category: "lesson", key: "second", value: "Orchard another mission finding", confidence: 0.6, source: "Council" })
    await ctx.db.insert("memories", { ownerKey: "owner-a", missionId: first, category: "research-synthesis", key: "research", value: "Orchard research evidence", confidence: 0.7, source: "Research" })
    await ctx.db.insert("memories", { ownerKey: "owner-a", category: "learning-lesson", key: "unlinked", value: "Reusable outcome context", confidence: 0.8, source: "Measurement" })
    await ctx.db.insert("memories", { ownerKey: "owner-b", missionId: other, category: "lesson", key: "private", value: "Orchard private evidence", confidence: 1, source: "Private" })
    return { first, second, other }
  })
  return { t, owner: t.withIdentity(identity("owner-a")), ...ids }
}
const paginationOpts = { numItems: 10, cursor: null }
describe("private memory browse and content search", () => {
  it("rejects anonymous memory browsing", async () => {
    const { t } = await fixture()
    await expect(t.query(api.memory.browse, { paginationOpts })).rejects.toThrow()
  })
  it("returns only the authenticated owner's records including unlinked memory", async () => {
    const { owner } = await fixture()
    const result = await owner.query(api.memory.browse, { paginationOpts })
    expect(result.page.map(row => row.key).sort()).toEqual(["first", "research", "second", "unlinked"])
    expect(result.page.every(row => row.ownerKey === "owner-a")).toBe(true)
  })
  it("combines selected mission and category filters", async () => {
    const { owner, first } = await fixture()
    const result = await owner.query(api.memory.browse, { missionId: first, category: "lesson", paginationOpts })
    expect(result.page.map(row => row.key)).toEqual(["first"])
  })
  it("rejects another owner's mission filter", async () => {
    const { owner, other } = await fixture()
    await expect(owner.query(api.memory.browse, { missionId: other, paginationOpts })).rejects.toThrow(/not found or access denied/i)
  })
  it("searches content while retaining owner, mission, and category boundaries", async () => {
    const { owner, first } = await fixture()
    const result = await owner.query(api.memory.browse, { search: "Orchard", missionId: first, category: "lesson", paginationOpts })
    expect(result.page.map(row => row.key)).toEqual(["first"])
    const all = await owner.query(api.memory.browse, { search: "Orchard", paginationOpts })
    expect(all.page.map(row => row.key).sort()).toEqual(["first", "research", "second"])
  })
  it("paginates matching records without truncating history to a fixed first batch", async () => {
    const { owner } = await fixture()
    const first = await owner.query(api.memory.browse, { paginationOpts: { numItems: 2, cursor: null } })
    expect(first.page).toHaveLength(2)
    expect(first.isDone).toBe(false)
    const second = await owner.query(api.memory.browse, { paginationOpts: { numItems: 2, cursor: first.continueCursor } })
    expect(new Set([...first.page, ...second.page].map(row => row._id)).size).toBe(4)
    expect(second.isDone).toBe(true)
  })
  it("bounds search input before querying", async () => {
    const { owner } = await fixture()
    await expect(owner.query(api.memory.browse, { search: "x".repeat(201), paginationOpts })).rejects.toThrow(/200 characters/)
  })
})
