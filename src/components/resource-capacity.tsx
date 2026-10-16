import {useQuery} from 'convex/react'
import {api} from '../../convex/_generated/api'
export function ResourceCapacity(){
 const data=useQuery(api.resourceCapacity.overview,{})
 return <div className="glass-card research-card" data-testid="resource-capacity" data-state={data===undefined?'loading':'ready'}>
 <h2>Record capacity</h2>
 {data===undefined?<p role="status">Loading private admission counts…</p>:<>
 <p>{data.scope}</p>
 <div style={{overflowX:'auto'}}><table><thead><tr><th>Collection</th><th>Saved records</th><th>Limit</th><th>New records available</th><th>Admission</th></tr></thead><tbody>{data.rows.map(row=><tr key={row.id}><th scope="row">{row.label}<p className="muted-copy">{row.scope}</p></th><td>{row.complete?'':'At least '}{row.count}</td><td>{row.limit}</td><td>{row.remaining}</td><td>{row.blocked?'Limit reached':'Available'}</td></tr>)}</tbody></table></div>
 <p>Counts reflect the current admission checks. Lowering a limit retains existing evidence. Disabled, closed and retired records still consume capacity where stated; re-enable or reuse an existing record when its feature permits. This view does not delete evidence or restart work.</p>
 </>}
 </div>
}
