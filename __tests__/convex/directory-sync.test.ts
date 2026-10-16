// @vitest-environment edge-runtime
import {describe,it,expect} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../../convex/schema'
import {api} from '../../convex/_generated/api'
const modules=import.meta.glob('../../convex/**/*.ts')
async function fixture(){
 const t=convexTest(schema,modules),owner=t.withIdentity({subject:'owner'}),other=t.withIdentity({subject:'other'})
 const teamId=await owner.mutation(api.forgeTeams.create,{name:'Roster acceptance'})
 return{t,owner,other,teamId}
}
const person={email:'person@example.com',role:'contributor' as const}
describe('reviewed directory reconciliation',()=>{
 it('requires admin for review and apply and atomically provisions only verified identities',async()=>{
  const{t,owner,other,teamId}=await fixture()
  const userId=await t.run(ctx=>ctx.db.insert('users',{email:person.email,emailVerificationTime:1}))
  const input={teamId,entries:[person,{email:'pending@example.com',role:'viewer' as const}],revokeMissing:false}
  await expect(t.query(api.teamDirectorySync.preview,input)).rejects.toThrow(/Authenticated/)
  await expect(other.query(api.teamDirectorySync.preview,input)).rejects.toThrow(/admin/)
  const r=await owner.query(api.teamDirectorySync.preview,input)
  expect(r.rows.map(r=>r.operation)).toEqual(['add','add'])
  expect(await owner.query(api.teamProvisioning.list,{teamId})).toEqual([])
  await expect(other.mutation(api.teamDirectorySync.apply,{...input,revision:r.revision})).rejects.toThrow(/admin/)
  expect(await owner.mutation(api.teamDirectorySync.apply,{...input,revision:r.revision})).toMatchObject({applied:2,revoked:0})
  expect((await t.withIdentity({subject:userId}).query(api.forgeTeams.detail,{teamId})).role).toBe('contributor')
  expect((await owner.query(api.forgeTeams.detail,{teamId})).memberships).toHaveLength(2)
  const current=await owner.query(api.teamDirectorySync.preview,input)
  expect(await owner.mutation(api.teamDirectorySync.apply,{...input,revision:current.revision})).toMatchObject({applied:0,revoked:0})
 })
 it('rejects stale membership, roster and verification changes with no partial writes',async()=>{
  const{t,owner,teamId}=await fixture(),input={teamId,entries:[person],revokeMissing:false}
  const first=await owner.query(api.teamDirectorySync.preview,input)
  await expect(owner.mutation(api.teamDirectorySync.apply,{...input,entries:[{...person,role:'viewer'}],revision:first.revision})).rejects.toThrow(/Review/)
  await t.run(ctx=>ctx.db.insert('users',{email:person.email,emailVerificationTime:1}))
  await expect(owner.mutation(api.teamDirectorySync.apply,{...input,revision:first.revision})).rejects.toThrow(/Review/)
  const second=await owner.query(api.teamDirectorySync.preview,input)
  const id=await owner.mutation(api.forgeTeams.requestJoin,{teamId})
  await owner.mutation(api.forgeTeams.setMember,{teamId,membershipId:id,role:'admin',status:'active'})
  // Change a grant after review, rather than relying on millisecond update timestamps.
  await owner.mutation(api.teamProvisioning.provision,{teamId,entries:[{email:'unrelated@example.com',role:'viewer'}]})
  await expect(owner.mutation(api.teamDirectorySync.apply,{...input,revision:second.revision})).rejects.toThrow(/Review/)
  expect((await owner.query(api.teamProvisioning.list,{teamId})).map(g=>g.email)).toEqual(['unrelated@example.com'])
 })
 it('revokes only omitted directory grants and protects owners, current admins and manual members',async()=>{
  const{t,owner,other,teamId}=await fixture()
  const [ownerId,personId,adminId]=await t.run(async ctx=>Promise.all(['owner@example.com',person.email,'admin@example.com'].map(email=>ctx.db.insert('users',{email,emailVerificationTime:1}))))
  // Use real user IDs for the owner in this fixture.
  await t.run(async ctx=>{await ctx.db.patch(teamId,{ownerKey:ownerId});const m=await ctx.db.query('forgeMemberships').first();await ctx.db.patch(m!._id,{operatorId:ownerId})})
  const ownerUser=t.withIdentity({subject:ownerId})
  await ownerUser.mutation(api.teamProvisioning.provision,{teamId,entries:[{email:'owner@example.com',role:'viewer'},person,{email:'admin@example.com',role:'viewer'}]})
  const adminMembership=(await ownerUser.query(api.forgeTeams.detail,{teamId})).memberships.find(m=>m.operatorId===adminId)!
  await ownerUser.mutation(api.forgeTeams.setMember,{teamId,membershipId:adminMembership._id,role:'admin',status:'active'})
  const manual=await other.mutation(api.forgeTeams.requestJoin,{teamId})
  await ownerUser.mutation(api.forgeTeams.setMember,{teamId,membershipId:manual,role:'viewer',status:'active'})
  const reviewing=t.withIdentity({subject:adminId}),input={teamId,entries:[],revokeMissing:true}
  const r=await reviewing.query(api.teamDirectorySync.preview,input)
  expect(r.rows.map(r=>r.operation).sort()).toEqual(['protected-current-admin','protected-owner','revoke'])
  expect(await reviewing.mutation(api.teamDirectorySync.apply,{...input,revision:r.revision})).toMatchObject({applied:0,revoked:1})
  await expect(t.withIdentity({subject:personId}).query(api.forgeTeams.detail,{teamId})).rejects.toThrow(/permission denied/)
  expect((await other.query(api.forgeTeams.detail,{teamId})).role).toBe('viewer')
  expect((await reviewing.query(api.forgeTeams.detail,{teamId})).role).toBe('admin')
 })
 it('retains missing grants by default, rejects invalid/duplicate rosters and rolls back quota failures',async()=>{
  const{t,owner,teamId}=await fixture()
  await owner.mutation(api.teamProvisioning.provision,{teamId,entries:[person]})
  const input={teamId,entries:[{email:'new@example.com',role:'viewer' as const}],revokeMissing:false}
  expect((await owner.query(api.teamDirectorySync.preview,input)).rows.some(r=>r.operation==='retain')).toBe(true)
  await expect(owner.query(api.teamDirectorySync.preview,{...input,entries:[]})).rejects.toThrow(/empty roster/)
  await expect(owner.query(api.teamDirectorySync.preview,{...input,entries:[person,{...person,email:'PERSON@example.com'}]})).rejects.toThrow(/Duplicate/)
  await expect(owner.query(api.teamDirectorySync.preview,{...input,entries:[{...person,email:'invalid'}]})).rejects.toThrow(/Valid email/)
  const verified=await t.run(ctx=>ctx.db.insert('users',{email:'new@example.com',emailVerificationTime:1}))
  await t.run(async ctx=>{for(let i=0;i<19;i++)await ctx.db.insert('forgeMemberships',{teamId,operatorId:'manual-'+i,role:'viewer',status:'active',createdAt:1})})
  const r=await owner.query(api.teamDirectorySync.preview,input)
  await expect(owner.mutation(api.teamDirectorySync.apply,{...input,revision:r.revision})).rejects.toThrow(/quota/)
  expect((await owner.query(api.teamProvisioning.list,{teamId})).map(g=>g.email)).toEqual([person.email])
  expect(await t.run(ctx=>ctx.db.query('forgeMemberships').withIndex('by_operator',q=>q.eq('operatorId',verified)).collect())).toEqual([])
 })
 it('revokes a previous linked account when a verified directory identity is reassigned',async()=>{
  const{t,owner,teamId}=await fixture()
  const oldId=await t.run(ctx=>ctx.db.insert('users',{email:person.email,emailVerificationTime:1}))
  await owner.mutation(api.teamProvisioning.provision,{teamId,entries:[person]})
  await t.run(ctx=>ctx.db.patch(oldId,{email:'old@example.com'}))
  const newId=await t.run(ctx=>ctx.db.insert('users',{email:person.email,emailVerificationTime:2}))
  const input={teamId,entries:[person],revokeMissing:false},r=await owner.query(api.teamDirectorySync.preview,input)
  expect(r.rows[0].operation).toBe('reconcile-membership')
  await owner.mutation(api.teamDirectorySync.apply,{...input,revision:r.revision})
  await expect(t.withIdentity({subject:oldId}).query(api.forgeTeams.detail,{teamId})).rejects.toThrow(/permission denied/)
  expect((await t.withIdentity({subject:newId}).query(api.forgeTeams.detail,{teamId})).role).toBe('contributor')
 })
})
