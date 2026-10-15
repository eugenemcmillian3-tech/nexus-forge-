import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'
import { ExpansionGuide } from '../components/expansion-guide'
import { FrontierControls } from '../components/frontier-controls'
import metadata from '../metadata.json'
export const Route=createFileRoute('/resilience')({head:()=>{const p=metadata['/resilience'];return{meta:[{title:p.title},{name:'description',content:p.description}],links:[{rel:'canonical',href:'https://bphntw8kdojl9qvuifywyjtk.macaly.app/resilience'}]}},component:Page})
function Page(){return <WorkspaceLayout title="Security & Resilience" eyebrow="EXPANDED CAPABILITIES"><ExpansionGuide path="/resilience"/><FrontierControls area="resilience"/></WorkspaceLayout>}
