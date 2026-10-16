import {describe,it,expect} from 'vitest'
import {parseResearchResponse} from '../convex/researchResponse'
const source='https://www.w3.org/WAI/tutorials/forms/'
describe('complete cited research response',()=>{
 it('rejects the observed truncated JSON instead of treating it as prose',()=>{
  expect(()=>parseResearchResponse('{"result":"Long implementation cut off', [source])).toThrow(/incomplete or invalid/)
 })
 it.each(['{}','[]','null','{"result":"Advice","citations":[]}', '{"result":"Advice","citations":["https://fabricated.example/"]}'])('rejects unsupported response %s',text=>{
  expect(()=>parseResearchResponse(text,[source])).toThrow()
 })
 it('accepts fenced complete JSON, filters unsupported citations and deduplicates',()=>{
  const text='\x60\x60\x60json\n'+JSON.stringify({result:' Label every field. ',citations:[source,source,'https://fabricated.example/']})+'\n\x60\x60\x60'
  expect(parseResearchResponse(text,[source])).toEqual({result:'Label every field.',citations:[source]})
 })
})
