import { describe,expect,it,vi } from 'vitest'
import { render,screen } from '@testing-library/react'
import { RouteAccess } from '../src/components/route-access'
const mock=vi.hoisted(()=>({path:'/pricing'}))
vi.mock('@tanstack/react-router',()=>({useRouterState:({select}:any)=>select({location:{pathname:mock.path}})}))
vi.mock('../src/components/auth-wrapper',()=>({AuthWrapper:()=> <p>Authentication required</p>}))
describe('public pricing access boundary',()=>{
 it('renders pricing without requiring authentication',()=>{mock.path='/pricing';render(<RouteAccess><h1>Paid pricing</h1></RouteAccess>);expect(screen.getByRole('heading',{name:'Paid pricing'})).toBeInTheDocument();expect(screen.queryByText('Authentication required')).not.toBeInTheDocument()})
 it.each(['/billing','/checkout','/','/pricing/private'])('protects %s from unauthenticated access',path=>{mock.path=path;render(<RouteAccess><h1>Protected content</h1></RouteAccess>);expect(screen.getByText('Authentication required')).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Protected content'})).not.toBeInTheDocument()})
})
