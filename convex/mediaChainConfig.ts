export function mediaProviderConfig(env:Record<string,string|undefined>){
 const clean=(s:string|undefined)=>s?.trim().replace(/^["']|["']$/g,'')||''
 return{account:clean(env.CF_ACCOUNT_ID||env.CLOUDFLARE_ACCOUNT_ID),cloudflare:clean(env.CF_API_TOKEN||env.CLOUDFLARE_API_TOKEN),hf:clean(env.HF_TOKEN||env.HUGGINGFACE_API_KEY),pollinations:clean(env.POLLINATIONS_API_KEY)}
}
