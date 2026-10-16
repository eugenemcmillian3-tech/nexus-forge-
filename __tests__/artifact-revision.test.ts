import {describe,it,expect} from 'vitest'
import {convexTest} from 'convex-test'
import schema from '../convex/schema'
import {api} from '../convex/_generated/api'
const modules=import.meta.glob('../convex/**/*.ts')
describe('artifact revision',()=>{
 it('preserves approved original and creates a separate unapproved draft; rejects other owners and unchanged content',async()=>{
  const t=convexTest(schema,modules)
  const missionId=await t.run(c=>c.db.insert('missions',{ownerKey:'revision-owner',title:'Revision',mission:'Create a form',status:'running',autonomy:'Approval required',budget:0,completion:0,approved:true}))
  const id=await t.run(c=>c.db.insert('artifacts',{missionId,type:'web-app',name:'Form',content:'Original content',status:'ready',requiresApproval:false}))
  const owner=t.withIdentity({subject:'revision-owner'})
  await expect(t.withIdentity({subject:'other'}).mutation(api.artifacts.revise,{id,content:'Changed content'})).rejects.toThrow()
  await expect(owner.mutation(api.artifacts.revise,{id,content:'Original content'})).rejects.toThrow(/Change the content/)
  const revisionId=await owner.mutation(api.artifacts.revise,{id,content:'Repaired content'})
  expect(await t.run(c=>c.db.get(id))).toMatchObject({content:'Original content',status:'ready',requiresApproval:false})
  expect(await t.run(c=>c.db.get(revisionId))).toMatchObject({content:'Repaired content',status:'awaiting_approval',requiresApproval:true,missionId})
 })
})
