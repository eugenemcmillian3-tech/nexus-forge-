import { defineTable } from 'convex/server'
import { v } from 'convex/values'
export const labKind = v.union(v.literal('comparison'), v.literal('science'), v.literal('generality'))
export const frontierTables = {
  labProtocols: defineTable({ ownerKey:v.string(), kind:labKind, title:v.string(), hypothesis:v.string(), metric:v.string(), unit:v.string(), direction:v.union(v.literal('higher'),v.literal('lower')), target:v.number(), minimumSamples:v.number(), domains:v.array(v.string()), heldOutDomains:v.array(v.string()), status:v.union(v.literal('open'),v.literal('closed')), createdAt:v.number() }).index('by_owner_kind',['ownerKey','kind']),
  labTrials: defineTable({ protocolId:v.id('labProtocols'), caseKey:v.string(), domain:v.string(), baseline:v.number(), candidate:v.number(), evidence:v.string(), digest:v.string(), createdAt:v.number() }).index('by_protocol',['protocolId']).index('by_protocol_case',['protocolId','caseKey']),
  extensionPackages: defineTable({ ownerKey:v.string(), name:v.string(), version:v.string(), description:v.string(), inputFields:v.array(v.string()), outputFields:v.array(v.string()), status:v.union(v.literal('draft'),v.literal('validated'),v.literal('retired')), createdAt:v.number() }).index('by_owner',['ownerKey']).index('by_owner_name_version',['ownerKey','name','version']),
  frontierAudits: defineTable({ ownerKey:v.string(), area:v.string(), action:v.string(), detail:v.string(), createdAt:v.number() }).index('by_owner',['ownerKey']),
  resiliencePolicies: defineTable({ ownerKey:v.string(), maxRecords:v.number(), maxMediaBytes:v.number(), updatedAt:v.number() }).index('by_owner',['ownerKey']),
  privateMedia: defineTable({ ownerKey:v.string(), storageId:v.id('_storage'), name:v.string(), mime:v.string(), size:v.number(), sha256:v.string(), note:v.string(), createdAt:v.number() }).index('by_owner',['ownerKey']).index('by_storage',['storageId']),
  forgeTeams: defineTable({ ownerKey:v.string(), name:v.string(), createdAt:v.number() }).index('by_owner',['ownerKey']),
  forgeMemberships: defineTable({ teamId:v.id('forgeTeams'), operatorId:v.string(), role:v.union(v.literal('admin'),v.literal('contributor'),v.literal('viewer')), status:v.union(v.literal('requested'),v.literal('active'),v.literal('revoked')), createdAt:v.number() }).index('by_operator',['operatorId']).index('by_team',['teamId']).index('by_team_operator',['teamId','operatorId']),
  forgeTeamNotes: defineTable({ teamId:v.id('forgeTeams'), author:v.string(), text:v.string(), createdAt:v.number() }).index('by_team',['teamId']),
}
