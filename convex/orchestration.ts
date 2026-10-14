import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireOperator, requireOwnedMission } from "./permissions";
import { internal } from "./_generated/api";

const dependency = v.object({
  _id: v.id("missionDependencies"),
  _creationTime: v.number(),
  missionId: v.id("missions"),
  dependsOnMissionId: v.id("missions"),
  kind: v.union(v.literal("blocks"), v.literal("informs")),
  note: v.optional(v.string()),
  createdAt: v.number(),
});
const resource = v.object({
  _id: v.id("missionResources"),
  _creationTime: v.number(),
  missionId: v.id("missions"),
  resourceKey: v.string(),
  mode: v.union(v.literal("exclusive"), v.literal("shared")),
  status: v.union(
    v.literal("requested"),
    v.literal("held"),
    v.literal("released"),
  ),
  heldAt: v.optional(v.number()),
  releasedAt: v.optional(v.number()),
});

export const listDependencies = query({
  args: { missionId: v.id("missions") },
  returns: v.array(dependency),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId);
    return ctx.db
      .query("missionDependencies")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
  },
});
export const listResources = query({
  args: { missionId: v.id("missions") },
  returns: v.array(resource),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId);
    return ctx.db
      .query("missionResources")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
  },
});

export const addDependency = mutation({
  args: {
    missionId: v.id("missions"),
    dependsOnMissionId: v.id("missions"),
    kind: v.union(v.literal("blocks"), v.literal("informs")),
    note: v.optional(v.string()),
  },
  returns: v.id("missionDependencies"),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    await requireOwnedMission(ctx, args.missionId);
    await requireOwnedMission(ctx, args.dependsOnMissionId);
    if (args.missionId === args.dependsOnMissionId)
      throw new Error("A mission cannot depend on itself");
    if (
      !(await ctx.db.get(args.missionId)) ||
      !(await ctx.db.get(args.dependsOnMissionId))
    )
      throw new Error("Both missions must exist");
    const existing = await ctx.db
      .query("missionDependencies")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    if (existing.some((d) => d.dependsOnMissionId === args.dependsOnMissionId))
      throw new Error("Dependency already exists");
    const id = await ctx.db.insert("missionDependencies", {
      ...args,
      createdAt: Date.now(),
    });
    await ctx.runMutation(internal.audit.record, {
      missionId: args.missionId,
      type: "orchestration",
      action: "dependency_added",
      status: args.kind,
      detail: `Dependency added on ${args.dependsOnMissionId}.`,
    });
    return id;
  },
});

export const setResource = mutation({
  args: {
    missionId: v.id("missions"),
    resourceKey: v.string(),
    mode: v.union(v.literal("exclusive"), v.literal("shared")),
  },
  returns: v.id("missionResources"),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    await requireOwnedMission(ctx, args.missionId);
    const key = args.resourceKey.trim();
    if (!key) throw new Error("Resource key is required");
    const existing = await ctx.db
      .query("missionResources")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    const prior = existing.find(
      (r) => r.resourceKey === key && r.status !== "released",
    );
    if (prior) return prior._id;
    return await ctx.db.insert("missionResources", {
      missionId: args.missionId,
      resourceKey: key,
      mode: args.mode,
      status: "requested",
    });
  },
});

export const preflight = query({
  args: { missionId: v.id("missions") },
  returns: v.object({
    ready: v.boolean(),
    blockers: v.array(v.string()),
    advisories: v.array(v.string()),
    resources: v.array(
      v.object({
        key: v.string(),
        mode: v.string(),
        available: v.boolean(),
        heldByMission: v.optional(v.id("missions")),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireOwnedMission(ctx, args.missionId);
    const blockers: string[] = [];
    const advisories: string[] = [];
    const deps = await ctx.db
      .query("missionDependencies")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    for (const dep of deps) {
      const m = await ctx.db.get(dep.dependsOnMissionId);
      if (dep.kind === "blocks" && (!m || m.status !== "complete"))
        blockers.push(
          `Blocked by mission ${dep.dependsOnMissionId}${m ? ` (${m.status})` : " (missing)"}`,
        );
      else if (dep.kind === "informs" && m?.status !== "complete")
        advisories.push(
          `Informing mission ${dep.dependsOnMissionId} is not complete.`,
        );
    }
    const resources = await ctx.db
      .query("missionResources")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    const resourceRows: {
      key: string;
      mode: string;
      available: boolean;
      heldByMission?: any;
    }[] = [];
    for (const r of resources) {
      const holders = await ctx.db
        .query("missionResources")
        .withIndex("by_resource", (q) => q.eq("resourceKey", r.resourceKey))
        .collect();
      const active = holders.find(
        (h) =>
          h.missionId !== args.missionId &&
          h.status === "held" &&
          (h.mode === "exclusive" || r.mode === "exclusive"),
      );
      if (active)
        blockers.push(
          `Resource ${r.resourceKey} is held by mission ${active.missionId}.`,
        );
      resourceRows.push({
        key: r.resourceKey,
        mode: r.mode,
        available: !active,
        ...(active ? { heldByMission: active.missionId } : {}),
      });
    }
    return {
      ready: blockers.length === 0,
      blockers,
      advisories,
      resources: resourceRows,
    };
  },
});

export const acquireForExecution = mutation({
  args: { missionId: v.id("missions") },
  returns: v.object({ acquired: v.boolean(), blockers: v.array(v.string()) }),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    await requireOwnedMission(ctx, args.missionId);
    const blockers: string[] = [];
    const deps = await ctx.db
      .query("missionDependencies")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    for (const dep of deps) {
      const m = await ctx.db.get(dep.dependsOnMissionId);
      if (dep.kind === "blocks" && (!m || m.status !== "complete"))
        blockers.push(`Dependency ${dep.dependsOnMissionId} is not complete.`);
    }
    const resources = await ctx.db
      .query("missionResources")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    for (const r of resources) {
      const holders = await ctx.db
        .query("missionResources")
        .withIndex("by_resource", (q) => q.eq("resourceKey", r.resourceKey))
        .collect();
      const active = holders.find(
        (h) =>
          h.missionId !== args.missionId &&
          h.status === "held" &&
          (h.mode === "exclusive" || r.mode === "exclusive"),
      );
      if (active)
        blockers.push(`Resource ${r.resourceKey} is held by another mission.`);
    }
    if (blockers.length) return { acquired: false, blockers };
    const now = Date.now();
    for (const r of resources)
      if (r.status !== "held")
        await ctx.db.patch(r._id, { status: "held", heldAt: now });
    await ctx.runMutation(internal.audit.record, {
      missionId: args.missionId,
      type: "orchestration",
      action: "resources_acquired",
      status: "ready",
      detail: resources.length
        ? `Acquired ${resources.length} resource reservation(s).`
        : "No resource conflicts detected.",
    });
    return { acquired: true, blockers: [] };
  },
});

export const releaseForMission = mutation({
  args: { missionId: v.id("missions") },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireOperator(ctx);
    await requireOwnedMission(ctx, args.missionId);
    const rows = await ctx.db
      .query("missionResources")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    const now = Date.now();
    let count = 0;
    for (const r of rows)
      if (r.status === "held") {
        await ctx.db.patch(r._id, { status: "released", releasedAt: now });
        count++;
      }
    return count;
  },
});

export const releaseForMissionInternal = internalMutation({
  args: { missionId: v.id("missions") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("missionResources")
      .withIndex("by_mission", (q) => q.eq("missionId", args.missionId))
      .collect();
    const now = Date.now();
    let count = 0;
    for (const r of rows)
      if (r.status === "held") {
        await ctx.db.patch(r._id, { status: "released", releasedAt: now });
        count++;
      }
    return count;
  },
});
