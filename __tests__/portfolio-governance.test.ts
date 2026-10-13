import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";

const modules = import.meta.glob("../convex/**/*.ts");

function identity(subject: string) {
  return {
    subject,
    issuer: "https://nexus-forge.test",
    tokenIdentifier: `https://nexus-forge.test|${subject}`,
  };
}

async function seedMission(t: ReturnType<typeof convexTest>, ownerKey: string, approved = true, status: "draft" | "running" | "review" | "complete" | "cancelled" = "draft") {
  return t.run(async (ctx) => ctx.db.insert("missions", {
    title: "Portfolio governance regression",
    mission: "Verify ownership and execution preflight",
    autonomy: "governed",
    budget: 0,
    status,
    completion: status === "complete" ? 1 : 0,
    approved,
    ownerKey,
  }));
}

async function seedDecision(t: ReturnType<typeof convexTest>, missionId: any) {
  return t.run(async (ctx) => ctx.db.insert("portfolioDecisions", {
    missionId,
    priorityRank: 1,
    action: "Execute approved mission",
    decision: "approve",
    createdAt: 1,
  }));
}

const args = (missionId: any) => ({ missionId, priorityRank: 1, action: "Execute approved mission" });

describe("portfolio execution governance", () => {
  it("rejects portfolio decisions for another operator's mission", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "owner-a");
    await expect(t.withIdentity(identity("owner-b")).mutation(api.portfolio.recordDecision, {
      ...args(missionId),
      decision: "approve",
    })).rejects.toThrow(/not found or access denied/i);
  });

  it("rejects executing another operator's approved mission", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "owner-a");
    await seedDecision(t, missionId);
    await expect(t.withIdentity(identity("owner-b")).mutation(api.portfolio.executeApprovedMission, args(missionId)))
      .rejects.toThrow(/not found or access denied/i);
  });

  it("blocks execution until blocking prerequisite missions are complete", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "owner-a");
    const prerequisiteId = await seedMission(t, "owner-a", false, "draft");
    await seedDecision(t, missionId);
    await t.run(async (ctx) => ctx.db.insert("missionDependencies", {
      missionId,
      dependsOnMissionId: prerequisiteId,
      kind: "blocks",
      createdAt: 1,
    }));
    await expect(t.withIdentity(identity("owner-a")).mutation(api.portfolio.executeApprovedMission, args(missionId)))
      .rejects.toThrow(/execution blocked by prerequisite mission/i);
  });

  it("blocks execution when an exclusive resource conflicts with an existing holder", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "owner-a");
    const otherMissionId = await seedMission(t, "owner-a");
    await seedDecision(t, missionId);
    await t.run(async (ctx) => {
      await ctx.db.insert("missionResources", { missionId, resourceKey: "provider:cloudflare", mode: "exclusive", status: "requested" });
      await ctx.db.insert("missionResources", { missionId: otherMissionId, resourceKey: "provider:cloudflare", mode: "shared", status: "held", heldAt: 1 });
    });
    await expect(t.withIdentity(identity("owner-a")).mutation(api.portfolio.executeApprovedMission, args(missionId)))
      .rejects.toThrow(/execution blocked by resource conflict/i);
  });

  it("blocks autonomous restart while an escalated incident is unresolved", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "owner-a");
    await seedDecision(t, missionId);
    await t.run(async (ctx) => ctx.db.insert("incidents", {
      missionId,
      kind: "execution_failure",
      stage: "retry_escalation",
      message: "Retry limit reached",
      attempts: 3,
      status: "escalated",
      createdAt: 1,
    }));
    await expect(t.withIdentity(identity("owner-a")).mutation(api.portfolio.executeApprovedMission, args(missionId)))
      .rejects.toThrow(/autonomous restart blocked/i);
  });
});
