
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process"),crypto=require("node:crypto");
const MODE="seed";
const root="/convex/data/recovery-drill/fixture";
function log(v){console.log(JSON.stringify({event:"authenticated_recovery_fixture",mode:MODE,...v,time:new Date().toISOString()}));}
function run(cmd,args,env){const r=cp.spawnSync(cmd,args,{cwd:root,env,encoding:"utf8",timeout:150000,maxBuffer:4000000});if(r.status!==0){fs.writeFileSync(path.join(root,"last-command-error"),(r.stderr||"")+"\n"+(r.stdout||""),{mode:0o600});throw Error("COMMAND_FAILED_"+cmd+"_"+r.status);}return r.stdout;}
(async()=>{
fs.mkdirSync(root,{recursive:true,mode:0o700});
const backend=cp.spawn("./run_backend.sh",[],{cwd:"/convex",env:process.env,stdio:"inherit"});
for(const sig of ["SIGTERM","SIGINT"])process.on(sig,()=>backend.kill(sig));
let exited=false;backend.on("exit",()=>{exited=true;});
try{
 let ready=false;for(let i=0;i<90;i++){if(exited)throw Error("BACKEND_EXITED");try{const r=await fetch("http://127.0.0.1:3210/version",{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 if(!ready)throw Error("BACKEND_NOT_READY");
 const keyResult=cp.spawnSync("./generate_admin_key.sh",[],{cwd:"/convex",env:process.env,encoding:"utf8",timeout:10000});
 if(keyResult.status!==0)throw Error("ADMIN_GENERATION_FAILED");
 const admin=keyResult.stdout.trim();if(!admin||/\s/.test(admin))throw Error("ADMIN_KEY_FORMAT");
 const env={...process.env,CONVEX_SELF_HOSTED_URL:"http://127.0.0.1:3210",CONVEX_SELF_HOSTED_ADMIN_KEY:admin};
 if(MODE==="seed"){
 fs.mkdirSync(path.join(root,"convex"),{recursive:true});
 fs.writeFileSync(path.join(root,"package.json"),JSON.stringify({name:"nexus-forge-isolated-recovery-fixture",version:"1.0.0",type:"module",private:true,dependencies:{convex:"latest"}}));
 fs.writeFileSync(path.join(root,"convex","schema.js"),"\nimport { defineSchema, defineTable } from \"convex/server\";\nimport { v } from \"convex/values\";\nexport default defineSchema({ syntheticRecoveryDocuments: defineTable({\nrunId:v.string(),owner:v.string(),status:v.string(),storageId:v.id(\"_storage\"),digest:v.string(),bytes:v.number()\n}) });\n");
 fs.writeFileSync(path.join(root,"convex","recovery.js"),"\nimport { actionGeneric as action, queryGeneric as query, internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, anyApi } from \"convex/server\";\nimport { v } from \"convex/values\";\nconst RUN=\"synthetic-recovery-20261017T1613Z\";\nconst BODY=\"NEXUS_FORGE_SYNTHETIC_RECORD_AND_FILE_20261017T1613Z\\n\";\nasync function owner(ctx){const i=await ctx.auth.getUserIdentity();if(!i||i.subject!==\"synthetic-owner-a\")throw new Error(\"OWNER_DENIED\");return i.subject;}\nexport const inspect=query({args:{},handler:async(ctx)=>{await owner(ctx);return await ctx.db.query(\"syntheticRecoveryDocuments\").filter(q=>q.eq(q.field(\"runId\"),RUN)).unique();}});\nexport const find=internalQuery({args:{},handler:async(ctx)=>await ctx.db.query(\"syntheticRecoveryDocuments\").filter(q=>q.eq(q.field(\"runId\"),RUN)).unique()});\nexport const put=internalMutation({args:{storageId:v.id(\"_storage\"),digest:v.string(),bytes:v.number()},handler:async(ctx,a)=>{if(await ctx.db.query(\"syntheticRecoveryDocuments\").filter(q=>q.eq(q.field(\"runId\"),RUN)).unique())throw new Error(\"ALREADY_SEEDED\");return await ctx.db.insert(\"syntheticRecoveryDocuments\",{runId:RUN,owner:\"synthetic-owner-a\",status:\"complete\",...a});}});\nasync function hex(blob){const b=await blob.arrayBuffer();return {bytes:b.byteLength,digest:Array.from(new Uint8Array(await crypto.subtle.digest(\"SHA-256\",b))).map(n=>n.toString(16).padStart(2,\"0\")).join(\"\")};}\nexport const seed=action({args:{},handler:async(ctx)=>{await owner(ctx);if(await ctx.runQuery(anyApi.recovery.find,{}))throw new Error(\"ALREADY_SEEDED\");const blob=new Blob([BODY],{type:\"application/octet-stream\"});const h=await hex(blob);const storageId=await ctx.storage.store(blob);await ctx.runMutation(anyApi.recovery.put,{storageId,...h});return {seeded:true,...h};}});\nexport const verify=action({args:{},handler:async(ctx)=>{await owner(ctx);const row=await ctx.runQuery(anyApi.recovery.find,{});if(!row||row.owner!==\"synthetic-owner-a\"||row.status!==\"complete\")throw new Error(\"RECORD_MISMATCH\");const blob=await ctx.storage.get(row.storageId);if(!blob)throw new Error(\"MISSING_STORAGE\");const h=await hex(blob);const expected=await hex(new Blob([BODY]));if(h.digest!==expected.digest||h.bytes!==expected.bytes||row.digest!==h.digest||row.bytes!==h.bytes)throw new Error(\"FILE_MISMATCH\");return {runId:row.runId,documentId:row._id,storageId:row.storageId,owner:row.owner,status:row.status,...h};}});\n");
 run("npm",["install","--ignore-scripts","--no-audit","--no-fund","--silent"],env);
 run("node",["node_modules/convex/bin/main.js","deploy","--yes","--typecheck","disable"],env);
 }
 const {ConvexHttpClient}=await import(path.join(root,"node_modules/convex/dist/esm/browser/index.js"));
 const client=new ConvexHttpClient("http://127.0.0.1:3210");
 client.setAdminAuth(admin,{subject:"synthetic-owner-a",issuer:"https://recovery-lab.invalid"});
 if(MODE==="seed")await client.action("recovery:seed",{});
 const result=await client.action("recovery:verify",{});
 const fingerprint=crypto.createHash("sha256").update(JSON.stringify(result)).digest("hex");
 const receipt=path.join(root,"baseline.json");
 if(MODE==="seed"){fs.writeFileSync(receipt,JSON.stringify({fingerprint,result}),{mode:0o600});}
 else {const prior=JSON.parse(fs.readFileSync(receipt,"utf8"));if(prior.fingerprint!==fingerprint)throw Error("PERSISTED_IDENTITY_MISMATCH");}
 const other=new ConvexHttpClient("http://127.0.0.1:3210");other.setAdminAuth(admin,{subject:"synthetic-owner-b",issuer:"https://recovery-lab.invalid"});
 const anon=new ConvexHttpClient("http://127.0.0.1:3210");
 for(const [label,c] of [["foreignOwner",other],["anonymous",anon]]){let denied=false;try{await c.query("recovery:inspect",{});}catch(e){denied=String(e).includes("OWNER_DENIED");}if(!denied)throw Error("ACCESS_CHECK_FAILED_"+label);}
 const pkg=JSON.parse(fs.readFileSync(path.join(root,"node_modules/convex/package.json"),"utf8"));
 log({result:"PASS",records:1,storageObjects:1,bytes:result.bytes,digest:result.digest,identityFingerprint:fingerprint,foreignOwnerDenied:true,anonymousDenied:true,convexClientVersion:pkg.version});
}catch(e){log({result:"FAIL",reason:e instanceof Error?e.message:"unknown"});}
if(exited)process.exit(1);
await new Promise(resolve=>backend.once("exit",resolve));process.exit(1);
})().catch(()=>{log({result:"FAIL",reason:"WRAPPER_FAILED"});process.exit(1);});
