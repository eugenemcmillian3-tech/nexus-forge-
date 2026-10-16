// @vitest-environment edge-runtime
import {afterEach,it,expect,vi} from 'vitest'
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})
it.each(['missing','invalid','configured'])('keeps real OAuth handlers registered with %s Workspace configuration',async(state)=>{
 vi.resetModules()
 vi.stubEnv('AUTH_GOOGLE_ID',state==='missing'?'':'fixture.apps.googleusercontent.com')
 vi.stubEnv('AUTH_GOOGLE_SECRET',state==='missing'?'':'fixture')
 vi.stubEnv('AUTH_GOOGLE_HOSTED_DOMAIN',state==='configured'?'example.com':state==='invalid'?'https://example.com':'')
 const {default:http}=await import('../../convex/http')
 expect(http.lookup('/api/auth/signin/google','GET')?.slice(1)).toEqual(['GET','/api/auth/signin/*'])
 expect(http.lookup('/api/auth/callback/google','GET')?.slice(1)).toEqual(['GET','/api/auth/callback/*'])
 expect(http.lookup('/api/auth/callback/google','POST')?.slice(1)).toEqual(['POST','/api/auth/callback/*'])
 const {enterpriseConfigured}=await import('../../convex/enterpriseIdentity')
 expect(enterpriseConfigured(process.env)).toBe(state==='configured')
})
