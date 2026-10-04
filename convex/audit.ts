import { v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

const event = v.object({_id:v.id("auditEvents"),_creationTime:v.number(),missionId:v.id("missions"),eventType:v.string(),source:v.string(),message:v.string(),runId:v.optional(v.id("missionRuns")),deliveryId:v.optional(v.id("deliveries")),verificationId:v.optional(v.id("verifications")),decisionId:v.optional(v.id("portfolioDecisions")),metadata:v.optional(v.string()),createdAt:v.number()})

export const record = internalMutation({
  args:{missionId:v.id("missions"),type:v.string(),action:v.string(),status:v.string(),detail:v.string(),runId:v.optional(v.id("missionRuns")),deliveryId:v.optional(v.id("deliveries")),verificationId:v.optional(v.id("verifications")),decisionId:v.optional(v.id("portfolioDecisions"))},
  returns:v.id("auditEvents"),
  handler:async(ctx,args)=>ctx.db.insert("auditEvents",{missionId:args.missionId,eventType:`${args.type}:${args.action}`,source:args.type,message:`${args.status}: ${args.detail}`,runId:args.runId,deliveryId:args.deliveryId,verificationId:args.verificationId,decisionId:args.decisionId,metadata:JSON.stringify({status:args.status}),createdAt:Date.now()})
})

export const list = query({
  args:{missionId:v.id("missions")},
  returns:v.array(event),
  handler:async(ctx,args)=>ctx.db.query("auditEvents").withIndex("by_mission",q=>q.eq("missionId",args.missionId)).order("desc").take(100),
})
