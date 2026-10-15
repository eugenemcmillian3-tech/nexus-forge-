import{query}from'./_generated/server'
import{enterpriseConfigured,workspaceDomain}from'./enterpriseIdentity'
export const available=query({args:{},handler:async()=>({workspaceSso:enterpriseConfigured(process.env),domain:enterpriseConfigured(process.env)?workspaceDomain(process.env.AUTH_GOOGLE_HOSTED_DOMAIN):null})})
