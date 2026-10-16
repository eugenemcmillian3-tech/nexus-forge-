import {beforeEach,describe,it,expect,vi} from 'vitest'
import {cleanup,render,screen} from '@testing-library/react'
vi.mock('convex/react',()=>({useQuery:vi.fn()}))
import {useQuery} from 'convex/react'
import {ResourceCapacity} from '../src/components/resource-capacity'
beforeEach(()=>{cleanup();vi.mocked(useQuery).mockReset()})
describe('record capacity view',()=>{
 it('waits for evidence before showing capacity',()=>{
  render(<ResourceCapacity/>)
  expect(screen.getByTestId('resource-capacity')).toHaveAttribute('data-state','loading')
  expect(screen.getByRole('status')).toHaveTextContent('Loading private admission counts')
  expect(screen.queryByRole('table')).toBeNull()
 })
 it('distinguishes bounded lower counts, reached limits and available capacity without claiming billing evidence',()=>{
  vi.mocked(useQuery).mockReturnValue({scope:'Private record admission only. Not billing evidence.',rows:[
   {id:'packages',label:'Integration packages',count:3,complete:false,limit:2,remaining:0,blocked:true,scope:'Retired versions count.'},
   {id:'runtime',label:'Active runtime receipts',count:0,complete:true,limit:2,remaining:2,blocked:false,scope:'Retired media history is excluded.'}
  ]} as never)
  render(<ResourceCapacity/>)
  expect(screen.getByTestId('resource-capacity')).toHaveAttribute('data-state','ready')
  expect(screen.getByText('At least 3')).toBeInTheDocument()
  expect(screen.getByText('Limit reached')).toBeInTheDocument()
  expect(screen.getByText('Available')).toBeInTheDocument()
  expect(screen.getByText(/Not billing evidence/)).toBeInTheDocument()
  expect(screen.queryByRole('button')).toBeNull()
 })
})
