// Versioned standard token-price snapshot, checked against vendor pricing on 2026-10-17.
// A token-derived amount is a list-price calculation, not a verified provider invoice.
export const RATE_VERSION='standard-token-rates-2026-10-17'
export const tokenRates=[
 {provider:'groq',model:'openai/gpt-oss-20b',input:0.075,output:0.30,source:'https://console.groq.com/docs/model/openai/gpt-oss-20b'},
 {provider:'cerebras',model:'gpt-oss-120b',input:0.35,output:0.75,source:'https://www.cerebras.ai/pricing'},
 {provider:'cloudflare',model:'@cf/meta/llama-3.1-8b-instruct-fp8-fast',input:0.045,output:0.384,source:'https://developers.cloudflare.com/workers-ai/platform/pricing/'},
]
export function chargeCents(usd:number){
 if(!Number.isFinite(usd)||usd<0)throw new Error('Invalid metered cost')
 if(usd===0)return 0
 const value=usd*200
 return Math.min(100,Math.max(1,Math.ceil(value-Number.EPSILON*Math.max(1,value)*8)))
}
type Report={provider:string;model:string;reportedCostUsd?:number;promptTokens?:number;completionTokens?:number}
export function reportCost(report:Report,version?:string):{usd:number;basis:string}|null{
 if(typeof report.reportedCostUsd==='number'&&Number.isFinite(report.reportedCostUsd)&&report.reportedCostUsd>=0)return {usd:report.reportedCostUsd,basis:'provider-reported'}
 if(version!==RATE_VERSION)return null
 const rate=tokenRates.find(r=>r.provider===report.provider&&r.model===report.model)
 const input=report.promptTokens,output=report.completionTokens
 if(!rate||!Number.isSafeInteger(input)||!Number.isSafeInteger(output)||input!<0||output!<0)return null
 return {usd:(input!*rate.input+output!*rate.output)/1000000,basis:RATE_VERSION}
}
