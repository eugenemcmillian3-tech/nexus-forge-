import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'
import { ExpansionGuide } from '../components/expansion-guide'
import { TeamGovernance } from '../components/team-governance'
import metadata from '../metadata.json'
export const Route=createFileRoute('/teams')({head:()=>{const p=metadata['/teams'];return{meta:[{title:p.title},{name:'description',content:p.description}],links:[{rel:'canonical',href:'https://bphntw8kdojl9qvuifywyjtk.macaly.app/teams'}]}},component:Page})
function Page(){return <WorkspaceLayout title="Team Governance" eyebrow="EXPANDED CAPABILITIES"><ExpansionGuide path="/teams"/><TeamGovernance/></WorkspaceLayout>}
