import { paginationOptsValidator, paginationResultValidator } from "convex/server"
import { productOutcomeFields, productOutcomeInput, evaluateProductOutcome } from "./productOutcomeModel"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { internal } from "./_generated/api"
import { requireOperator, requireOwnedMission } from "./permissions"
import { evaluateDeliveryEvidence } from "./deliveryEvidence"

const verification = v.object({_id:v.id("verifications"),_creationTime:v.number(),missionId:v.id("missions"),deliveryId:v.id("deliveries"),passed:v.boolean(),score:v.number(),criteria:v.array(v.string()),evidence:v.array(v.string()),summary:v.string(),createdAt:v.number()})
const measurement = v.object({_id:v.id("measurements"),_creationTime:v.number(),missionId:v.id("missions"),verificationId:v.optional(v.id("verifications")),metric:v.string(),actual:v.number(),target:v.number(),unit:v.string(),status:v.union(v.literal("pass"),v.literal("fail"),v.literal("partial")),evidence:v.array(v.string()),createdAt:v.number()})
export const list = query({ args:{missionId:v.id("missions")}, returns:v.array(verification), handler:async(ctx,args)=>{await requireOwnedMission(ctx,args.missionId);return ctx.db.query("verifications").withIndex("by_mission",q=>q.eq("missionId",args.missionId)).order("desc").take(20)} })
export const record = mutation({ args:{deliveryId:v.id("deliveries"),passed:v.boolean(),score:v.number(),criteria:v.array(v.string()),evidence:v.array(v.string()),summary:v.string()}, returns:v.id("verifications"), handler:async(ctx,args)=>{await requireOperator(ctx);const d=await ctx.db.get("deliveries",args.deliveryId);if(!d)throw new Error("Delivery request not found");await requireOwnedMission(ctx,d.missionId);return await recordOutcomeInternal(ctx,args.deliveryId,args.passed,args.score,args.criteria,args.evidence,args.summary,false) } })

export const measurements = query({ args:{missionId:v.id("missions")}, returns:v.array(measurement), handler:async(ctx,args)=>{await requireOwnedMission(ctx,args.missionId);return await ctx.db.query("measurements").withIndex("by_mission",q=>q.eq("missionId",args.missionId)).order("desc").take(20)} })

export const recordRuntimeCost = mutation({ args: { missionId: v.id("missions"), actualCost: v.number(), evidence: v.string(), verificationId: v.optional(v.id("verifications")) }, returns: v.id("measurements"), handler: async (ctx, args) => { await requireOperator(ctx); await requireOwnedMission(ctx, args.missionId); if (!Number.isFinite(args.actualCost) || args.actualCost < 0 || args.actualCost > 1000000) throw new Error("Actual runtime cost must be finite and between $0 and $1,000,000."); const evidence = args.evidence.trim().slice(0, 2000); if (evidence.length < 3) throw new Error("Provide a measurement source or evidence reference."); const mission = await ctx.db.get(args.missionId); if (!mission) throw new Error("Mission not found."); if (args.verificationId) { const verification = await ctx.db.get(args.verificationId); if (!verification || verification.missionId !== args.missionId) throw new Error("Verification does not belong to this mission."); } const status = mission.budget <= 0 ? "partial" as const : args.actualCost <= mission.budget ? "pass" as const : "fail" as const; return await ctx.db.insert("measurements", { missionId: args.missionId, verificationId: args.verificationId, metric: "actual runtime cost", actual: args.actualCost, target: mission.budget, unit: "USD", status, evidence: [`Operator-recorded actual spend: $${args.actualCost.toFixed(4)}`, `Source: ${evidence}`, mission.budget > 0 ? `Mission budget: $${mission.budget.toFixed(2)}` : "Budget comparison unavailable: mission budget is zero or unset."], createdAt: Date.now() }); } });

export const recordMeasuredOutcome = mutation({ args:{deliveryId:v.id("deliveries")}, returns:v.object({verificationId:v.id("verifications"),passed:v.boolean(),score:v.number(),measurementId:v.id("measurements")}), handler:async(ctx,args)=>{await requireOperator(ctx);const d=await ctx.db.get("deliveries",args.deliveryId);if(!d)throw new Error("Delivery request not found");await requireOwnedMission(ctx,d.missionId);if(!d.approved)throw new Error("Human delivery approval is required before verification");if(d.stage!=="verified")throw new Error("Delivery must reach verified stage before recording an outcome");const {evidence,checks,passedCount,score,passed}=evaluateDeliveryEvidence(d);const verificationId=await recordOutcomeInternal(ctx,args.deliveryId,passed,score,checks,evidence,`Mission outcome measured across artifact, workflow, deployment, and smoke evidence: ${passedCount}/4 domains passed.`,true);const measurementId=await ctx.db.insert("measurements",{missionId:d.missionId,verificationId,metric:"governed delivery readiness",actual:score,target:1,unit:"ratio",status:passed?"pass":passedCount>0?"partial":"fail",evidence:checks,createdAt:Date.now()});const mission=await ctx.db.get("missions",d.missionId);if(mission)await ctx.runMutation(internal.memory.captureVerificationLesson,{ownerKey:mission.ownerKey,missionId:mission._id,score,passed,metric:"governed delivery readiness",criteria:checks});return {verificationId,passed,score,measurementId}} })

async function recordOutcomeInternal(ctx:any,deliveryId:any,passed:boolean,rawScore:number,criteria:string[],evidence:string[],summary:string,completeMission:boolean){const d=await ctx.db.get("deliveries",deliveryId);if(!d)throw new Error("Delivery request not found");if(!d.approved)throw new Error("Human delivery approval is required before verification");if(d.stage!=="verified")throw new Error("Delivery must reach verified stage before recording an outcome");const score=Math.max(0,Math.min(1,rawScore));const verificationId=await ctx.db.insert("verifications",{missionId:d.missionId,deliveryId,passed,score,criteria,evidence,summary:summary.trim(),createdAt:Date.now()});await ctx.db.insert("auditEvents",{missionId:d.missionId,eventType:passed?"verification_passed":"verification_failed",source:completeMission?"delivery-evidence-measurement":"operator-assertion",message:passed?`Outcome recorded at ${Math.round(score*100)}%.`:`Outcome verification scored ${Math.round(score*100)}%.`,deliveryId:d._id,verificationId,metadata:JSON.stringify({criteria,evidence,summary:summary.trim()}),createdAt:Date.now()});const mission=await ctx.db.get("missions",d.missionId);if(mission){await ctx.db.insert("memories",{ownerKey:mission.ownerKey,missionId:mission._id,category:"verification-outcome",key:`delivery:${deliveryId}`,value:JSON.stringify({passed,score,criteria,evidence,summary:summary.trim()}),confidence:score,source:"production-verification"});if(completeMission&&passed)await ctx.db.patch(mission._id,{status:"complete",completion:1})}return verificationId}


export const recordProductOutcome = mutation({
  args: productOutcomeInput, returns: v.id("productOutcomes"),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx)
    await requireOwnedMission(ctx, args.missionId)
    const recordedAt = Date.now()
    const result = evaluateProductOutcome(args, recordedAt)
    return ctx.db.insert("productOutcomes", { ...args, ...result, ownerKey, recordedAt, provenance: "operator-recorded" })
  },
})

export const productOutcomes = query({
  args: { missionId: v.optional(v.id("missions")), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({ _id: v.id("productOutcomes"), _creationTime: v.number(), ...productOutcomeFields })),
  handler: async (ctx, args) => {
    const ownerKey = await requireOperator(ctx)
    if (args.missionId) {
      await requireOwnedMission(ctx, args.missionId)
      return ctx.db.query("productOutcomes").withIndex("by_mission", q => q.eq("missionId", args.missionId!)).order("desc").paginate(args.paginationOpts)
    }
    return ctx.db.query("productOutcomes").withIndex("by_owner", q => q.eq("ownerKey", ownerKey)).order("desc").paginate(args.paginationOpts)
  },
})
