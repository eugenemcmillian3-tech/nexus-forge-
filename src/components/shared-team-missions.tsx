import {useState} from 'react'
import {useMutation,useQuery} from 'convex/react'
import {api} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
export function SharedTeamMissions({teamId,role}:{teamId:Id<'forgeTeams'>;role:string}){
 const rows=useQuery(api.forgeTeams.sharedMissions,{teamId}),share=useMutation(api.forgeTeams.shareMission),unshare=useMutation(api.forgeTeams.unshareMission),execute=useMutation(api.forgeTeams.executeShared)
 const[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function work(fn:()=>Promise<unknown>){setBusy(true);setError('');try{setMessage(JSON.stringify(await fn())??'Saved')}catch(e){setError(e instanceof Error?e.message:'Team operation failed')}finally{setBusy(false)}}
 return <div><h3>Shared missions</h3><p>Sharing exposes the selected mission title, brief, approval and status to active members. Contributors and admins can launch only when the mission owner grants execution and matching approval already exists. Provider credentials and private artifacts remain private.</p>
 {role==='admin'&&<form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void work(()=>share({teamId,missionId:String(f.get('mission')) as Id<'missions'>,allowExecute:f.get('execute')==='on'}))}}><label>Mission ID you own<input name="mission" required/></label><label><input name="execute" type="checkbox"/> Allow contributors and admins to execute approved work</label><button className="secondary-button" disabled={busy}>Share selected mission</button></form>}
 {rows?.filter(r=>r!==null).map(m=><article key={m.missionId}><h4>{m.title}</h4><p>{m.mission}</p><p>{m.status} · {m.approved?'Approved':'Approval required'} · {m.allowExecute?'Team execution allowed':'Read only'}</p>{role!=='viewer'&&m.allowExecute&&m.approved&&m.approval&&<button className="primary-button" disabled={busy} onClick={()=>void work(()=>execute({teamId,missionId:m.missionId,priorityRank:m.approval!.priorityRank,action:m.approval!.action}))}>Execute approved shared mission</button>}{role==='admin'&&<button className="ghost-button" disabled={busy} onClick={()=>void work(()=>unshare({teamId,missionId:m.missionId}))}>Revoke share (mission owner)</button>}</article>)}
 {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</div>
}
