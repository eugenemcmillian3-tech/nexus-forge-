import {beforeEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
const {query,apply}=vi.hoisted(()=>({query:vi.fn(),apply:vi.fn()}))
vi.mock('convex/react',()=>({useConvex:()=>({query}),useMutation:()=>apply}))
import {DirectoryReconciliation} from '../src/components/directory-reconciliation'
beforeEach(()=>{cleanup();query.mockReset();apply.mockReset();query.mockResolvedValue({revision:'a'.repeat(64),rows:[{email:'person@example.com',role:'viewer',operation:'add',identity:'awaiting-verified-sign-in'}]});apply.mockResolvedValue({applied:1,revoked:0,unchanged:0})})
const roster='[{"email":"person@example.com","role":"viewer"}]'
describe('directory roster review',()=>{
 it('requires preview and invalidates it whenever inputs change',async()=>{
  render(<DirectoryReconciliation teamId={'team' as any}/>)
  expect(screen.queryByRole('button',{name:'Apply reviewed roster'})).toBeNull()
  fireEvent.change(screen.getByLabelText('Directory roster JSON'),{target:{value:roster}})
  fireEvent.click(screen.getByRole('button',{name:'Review roster changes'}))
  await screen.findByRole('button',{name:'Apply reviewed roster'})
  expect(apply).not.toHaveBeenCalled()
  fireEvent.click(screen.getByLabelText('Revoke missing directory grants'))
  expect(screen.queryByRole('button',{name:'Apply reviewed roster'})).toBeNull()
  fireEvent.click(screen.getByRole('button',{name:'Review roster changes'}))
  fireEvent.click(await screen.findByRole('button',{name:'Apply reviewed roster'}))
  await waitFor(()=>expect(apply).toHaveBeenCalledWith({teamId:'team',entries:[{email:'person@example.com',role:'viewer'}],revokeMissing:true,revision:'a'.repeat(64)}))
  expect(await screen.findByRole('status')).toHaveTextContent('1 grants updated')
 })
 it('rejects malformed rosters and requires a new review after a stale-state error',async()=>{
  render(<DirectoryReconciliation teamId={'team' as any}/>)
  fireEvent.change(screen.getByLabelText('Directory roster JSON'),{target:{value:'[{"email":"x","role":"admin"}]'}})
  fireEvent.click(screen.getByRole('button',{name:'Review roster changes'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('up to 20')
  expect(query).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Directory roster JSON'),{target:{value:roster}})
  fireEvent.click(screen.getByRole('button',{name:'Review roster changes'}))
  apply.mockRejectedValueOnce(Error('Directory or membership changed. Review again.'))
  fireEvent.click(await screen.findByRole('button',{name:'Apply reviewed roster'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Review again')
  expect(screen.queryByRole('button',{name:'Apply reviewed roster'})).toBeNull()
 })
})
