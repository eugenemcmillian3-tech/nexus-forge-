import {useState} from 'react'
import {useAction,useQuery} from 'convex/react'
import {api} from '../../convex/_generated/api'
import type {Id} from '../../convex/_generated/dataModel'
export function GeminiMediaStudio(){
 const readiness=useQuery(api.geminiMedia.readiness,{}),assets=useQuery(api.privateMedia.list,{}),run=useAction(api.geminiMedia.run);
 const[mode,setMode]=useState<'image'|'music'|'video'>('image'),[busy,setBusy]=useState(false),[result,setResult]=useState(''),[error,setError]=useState('');
 return <div className="glass-card research-card frontier-feature"><h2>Gemini media studio</h2>
 <p>{readiness===undefined?'Checking server configuration…':readiness.configured?'Server key configured. Availability and billing are checked when an operation runs.':'Add GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY to server secrets.'}</p>
 <p>Generate an image, compose a 30-second music clip, or analyze an original private video up to 2 MiB. Only the selected prompt and asset are sent to Google when you submit. Charges may apply. Each submission is attempted once and retained in runtime receipts.</p>
 <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');setResult('');void run({requestKey:crypto.randomUUID(),mode,prompt:String(f.get('prompt')), ...(mode==='video'?{mediaId:String(f.get('media')) as Id<'privateMedia'>}:{})}).then(setResult).catch(e=>setError(e instanceof Error?e.message:'Operation failed')).finally(()=>setBusy(false))}}>
 <label>Gemini operation<select value={mode} disabled={busy} onChange={e=>setMode(e.target.value as typeof mode)}><option value="image">Generate image · Nano Banana 2.1</option><option value="music">Compose 30-second music clip · Lyria</option><option value="video">Analyze original video · Gemini</option></select></label>
 <label>{mode==='video'?'Question about the video':'Creative prompt'}<textarea name="prompt" required maxLength={2048}/></label>
 {mode==='video'&&<label>Private video<select name="media" required><option value="">Choose an imported MP4 or WebM…</option>{assets?.filter(a=>['video/mp4','video/webm'].includes(a.mime)).map(a=><option key={a._id} value={a._id}>{a.name}</option>)}</select></label>}
 <button className="primary-button" disabled={busy||!readiness?.configured}>{busy?'Processing…':'Run Gemini operation once'}</button></form>
 <p>Generated files appear in your private asset library below. Video analysis uses the original video, with model sampling; events and audio may be missed. Responses are unverified inference. A failed receipt does not establish that no charge occurred.</p>
 {error&&<p role="alert">{error}</p>}{result&&<pre role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{result}</pre>}</div>
}
