import {describe,it,expect} from 'vitest'
import {qaCallbackInputs,assertRetryRun} from '../convex/deliveryRecovery'
describe('QA callback and recovery',()=>{
 it('only attaches server callback origin to QA-only delivery',()=>{
  expect(qaCallbackInputs('nexus-forge1/no-dispatch','main',undefined)).toEqual({})
  expect(qaCallbackInputs('nexus-forge1/no-dispatch','qa-only','https://quick-rabbit-810.eu-west-1.convex.site')).toEqual({callback_origin:'https://quick-rabbit-810.eu-west-1.convex.site'})
  for(const origin of [undefined,'http://example.com','https://example.com','https://x.convex.site/path','https://user:pass@x.convex.site'])expect(()=>qaCallbackInputs('nexus-forge1/no-dispatch','qa-only',origin)).toThrow()
 })
 const run={id:123,status:'completed',conclusion:'failure',head_branch:'qa-only',event:'workflow_dispatch',path:'.github/workflows/nexus-forge-delivery.yml',head_commit:{message:'nexus-forge: deliver delivery1'}}
 it('requires the exact completed failed run and delivery commit',()=>{
  expect(()=>assertRetryRun(run,'delivery1','qa-only','123')).not.toThrow()
  for(const change of [{status:'in_progress'},{conclusion:'success'},{head_branch:'main'},{id:456},{head_commit:{message:'Other delivery'}},{event:'push'}])expect(()=>assertRetryRun({...run,...change},'delivery1','qa-only','123')).toThrow()
 })
})
