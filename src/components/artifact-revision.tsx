import {useState} from 'react'
import {useMutation} from 'convex/react'
import {api} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
export function ArtifactRevision({artifact}:{artifact:{_id:Id<'artifacts'>;content:string}}){
 const save=useMutation(api.artifacts.revise)
 const [content,setContent]=useState(artifact.content),[busy,setBusy]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState('')
 return <details><summary>Revise artifact content</summary>
  <p>Repair the implementation and save a new draft. The original stays intact. The new revision needs its own verification and approval.</p>
  <label htmlFor={'revision-'+artifact._id}>Revised HTML content</label>
  <textarea id={'revision-'+artifact._id} data-testid="artifact-revision-content" rows={16} maxLength={200000} value={content} disabled={busy} onChange={e=>setContent(e.target.value)}/>
  <button className="secondary-button" data-testid="save-artifact-revision" disabled={busy||!content.trim()||content.trim()===artifact.content.trim()} onClick={async()=>{
   setBusy(true);setError('');setReceipt('')
   try{const id=await save({id:artifact._id,content});setReceipt('New draft saved: '+id+'. Verify and approve the revision above.')}
   catch(e){setError(e instanceof Error?e.message:'Revision could not be saved. Your edits are retained.')}
   finally{setBusy(false)}
  }}>{busy?'Saving revision…':'Save as new draft revision'}</button>
  {error&&<p role="alert">{error}</p>}{receipt&&<p role="status">{receipt}</p>}
 </details>
}
