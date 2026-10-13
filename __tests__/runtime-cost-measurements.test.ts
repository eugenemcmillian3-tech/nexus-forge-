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

async function seedMission(t: ReturnType<typeof convexTest>, ownerKey: string, budget = 25) {
  return t.run(async (ctx) => ctx.db.insert("missions", {
    title: "Runtime cost test",
    mission: "Measure actual runtime cost with traceable evidence",
    autonomy: "governed",
    budget,
    status: "complete",
    completion: 1,
    approved: true,
    ownerKey,
  }));
}

describe("runtime cost measurement", () => {
  it("persists actual spend as a mission-owned USD measurement with budget comparison", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "cost-owner");
    const operator = t.withIdentity(identity("cost-owner"));
    const measurementId = await operator.mutation(api.verification.recordRuntimeCost, {
      missionId,
      actualCost: 12.5,
      evidence: "Provider billing export for run 42",
    });
    const rows = await operator.query(api.verification.measurements, { missionId });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      _id: measurementId,
      metric: "actual runtime cost",
      actual: 12.5,
      target: 25,
      unit: "USD",
      status: "pass",
    });
    expect(rows[0].evidence.join(" ")).toContain("Provider billing export");
  });

  it("rejects negative, non-finite, and excessive spend", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "cost-owner");
    const operator = t.withIdentity(identity("cost-owner"));
    for (const actualCost of [-1, 1000001, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(operator.mutation(api.verification.recordRuntimeCost, {
        missionId,
        actualCost,
        evidence: "Billing source",
      })).rejects.toThrow(/actual runtime cost must be finite/i);
    }
    expect(await operator.query(api.verification.measurements, { missionId })).toEqual([]);
  });

  it("rejects recording cost against another operator's mission", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "owner-a");
    await expect(t.withIdentity(identity("owner-b")).mutation(api.verification.recordRuntimeCost, {
      missionId,
      actualCost: 1,
      evidence: "Billing source",
    })).rejects.toThrow(/not found or access denied/i);
  });

  it("marks cost partial when no positive mission budget is configured", async () => {
    const t = convexTest(schema, modules);
    const missionId = await seedMission(t, "cost-owner", 0);
    const operator = t.withIdentity(identity("cost-owner"));
    await operator.mutation(api.verification.recordRuntimeCost, {
      missionId,
      actualCost: 0.25,
      evidence: "Provider billing export",
    });
    const rows = await operator.query(api.verification.measurements, { missionId });
    expect(rows[0].status).toBe("partial");
    expect(rows[0].evidence.join(" ")).toContain("Budget comparison unavailable");
  });
});
