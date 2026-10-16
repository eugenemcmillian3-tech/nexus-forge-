import {useState} from 'react'
import {useConvex,useMutation} from 'convex/react'
import {api} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
type Entry={email:string;role:'viewer'|'contributor'}
type Review={entries:Entry[];revokeMissing:boolean;revision:string;rows:{email:string;role:string;operation:string;identity:string}[]}
export function DirectoryReconciliation({teamId}:{teamId:Id<'forgeTeams'>}){
 const convex=useConvex(),apply=useMutation(api.teamDirectorySync.apply)
 const [roster,setRoster]=useState(''),[revokeMissing,setRevokeMissing]=useState(false),[review,setReview]=useState<Review|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('')
 async function preview(){
  setBusy(true);setError('');setMessage('');setReview(null)
  try{
   const value:unknown=JSON.parse(roster)
   if(!Array.isArray(value)||value.length>20||value.some(e=>!e||typeof e!=='object'||Object.keys(e).sort().join(',')!=='email,role'||typeof e.email!=='string'||!['viewer','contributor'].includes(e.role)))throw Error('Use a JSON array of up to 20 email/role objects.')
   const entries=value as Entry[],result=await convex.query(api.teamDirectorySync.preview,{teamId,entries,revokeMissing})
   setReview({entries,revokeMissing,...result})
  }catch(e){setError(e instanceof Error?e.message:'Roster review failed')}finally{setBusy(false)}
 }
 async function commit(){
  if(!review)return
  setBusy(true);setError('');setMessage('')
  try{const result=await apply({teamId,entries:review.entries,revokeMissing:review.revokeMissing,revision:review.revision});setMessage('Roster applied: '+result.applied+' grants updated, '+result.revoked+' revoked, '+result.unchanged+' retained.');setReview(null)}
  catch(e){setError(e instanceof Error?e.message:'Reconciliation failed');setReview(null)}
  finally{setBusy(false)}
 }
 return <div className="glass-card research-card"><h3>Reconcile a directory roster</h3>
 <p>Review up to 20 explicit email/role entries before applying them in one transaction. Missing grants are retained unless you select removal. The team owner and your current admin access are protected. Memberships created outside directory provisioning are retained. This is an operator-supplied roster; it does not connect to an external identity directory.</p>
 <form onSubmit={e=>{e.preventDefault();void preview()}}>
 <label>Directory roster JSON<textarea name="roster" required maxLength={12000} value={roster} placeholder={'[{"email":"person@example.com","role":"viewer"}]'} disabled={busy} onChange={e=>{setRoster(e.target.value);setReview(null);setMessage('')}}/></label>
 <label><input type="checkbox" checked={revokeMissing} disabled={busy} onChange={e=>{setRevokeMissing(e.target.checked);setReview(null);setMessage('')}}/>Revoke missing directory grants</label>
 <button className="secondary-button" disabled={busy}>Review roster changes</button>
 </form>
 {review&&<div><h4>Reviewed changes</h4><p>{review.rows.length} roster decisions. Changed membership or directory state requires a fresh review.</p><div style={{overflowX:'auto'}}><table><thead><tr><th>Email</th><th>Role</th><th>Operation</th><th>Identity</th></tr></thead><tbody>{review.rows.map(r=><tr key={r.email}><td>{r.email}</td><td>{r.role}</td><td>{r.operation}</td><td>{r.identity}</td></tr>)}</tbody></table></div><button type="button" className="primary-button" disabled={busy} onClick={()=>void commit()}>Apply reviewed roster</button></div>}
 {busy&&<p role="status">Working…</p>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 </div>
}
