import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'
import { ExpansionGuide } from '../components/expansion-guide'
import { FrontierControls } from '../components/frontier-controls'
import metadata from '../metadata.json'
export const Route=createFileRoute('/developers')({head:()=>{const p=metadata['/developers'];return{meta:[{title:p.title},{name:'description',content:p.description}],links:[{rel:'canonical',href:'https://bphntw8kdojl9qvuifywyjtk.macaly.app/developers'}]}},component:Page})
function Page(){return <WorkspaceLayout title="Developer Integrations" eyebrow="EXPANDED CAPABILITIES"><ExpansionGuide path="/developers"/><FrontierControls area="developers"/></WorkspaceLayout>}
