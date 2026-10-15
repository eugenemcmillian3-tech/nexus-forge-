import { convexAuth } from "@convex-dev/auth/server"
import Google from '@auth/core/providers/google'
import {enterpriseConfigured,workspaceDomain,verifiedWorkspaceProfile} from './enterpriseIdentity'
import {applyDirectoryGrants} from './teamProvisioning'
import { ResendOTP } from "./ResendOTP"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP,...(enterpriseConfigured(process.env)?[Google({clientId:process.env.AUTH_GOOGLE_ID,clientSecret:process.env.AUTH_GOOGLE_SECRET,authorization:{params:{hd:workspaceDomain(process.env.AUTH_GOOGLE_HOSTED_DOMAIN)!}},profile:(p)=>verifiedWorkspaceProfile(p,workspaceDomain(process.env.AUTH_GOOGLE_HOSTED_DOMAIN)!)})]:[])],
  callbacks:{afterUserCreatedOrUpdated:async(ctx,{userId})=>{await applyDirectoryGrants(ctx,userId)}},
})
