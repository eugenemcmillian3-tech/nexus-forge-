import{describe,it,expect}from'vitest'
import{missionProgressPercent}from'../src/lib/mission-progress'
describe('mission progress display compatibility',()=>{
 it('shows completed fractional and legacy percentage records as complete',()=>{
  expect(missionProgressPercent(1,'complete')).toBe(100)
  expect(missionProgressPercent(100,'complete')).toBe(100)
 })
 it('supports Council percentage progress and fractional records without rewriting them',()=>{
  expect(missionProgressPercent(40,'review')).toBe(40)
  expect(missionProgressPercent(.4,'running')).toBe(40)
  expect(missionProgressPercent(0,'draft')).toBe(0)
  expect(missionProgressPercent(200)).toBe(100)
  expect(missionProgressPercent(Number.NaN)).toBe(0)
 })
})
