import { convexAuth } from "@convex-dev/auth/server"
import Google from '@auth/core/providers/google'
import {enterpriseConfigured,workspaceDomain,verifiedWorkspaceProfile} from './enterpriseIdentity'
import {applyDirectoryGrants} from './teamProvisioning'
import { ResendOTP } from "./ResendOTP"

// OAuth routes are a stable public contract even when secrets are absent during
// compatibility analysis. Configuration readiness controls the UI; verification
// still fails closed before a Workspace user can be created or updated.
const domain=workspaceDomain(process.env.AUTH_GOOGLE_HOSTED_DOMAIN)
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP,Google({
    clientId:process.env.AUTH_GOOGLE_ID,
    clientSecret:process.env.AUTH_GOOGLE_SECRET,
    authorization:{params:domain?{hd:domain}:{}},
    profile:(p)=>{
      if(!enterpriseConfigured(process.env))throw Error('Workspace sign-in is not configured')
      return verifiedWorkspaceProfile(p,workspaceDomain(process.env.AUTH_GOOGLE_HOSTED_DOMAIN)!)
    },
  })],
  callbacks:{afterUserCreatedOrUpdated:async(ctx,{userId})=>{await applyDirectoryGrants(ctx,userId)}},
})
