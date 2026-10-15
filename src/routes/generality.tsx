import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'
import { ExpansionGuide } from '../components/expansion-guide'
import { ExperimentLab } from '../components/experiment-lab'
import metadata from '../metadata.json'
export const Route=createFileRoute('/generality')({head:()=>{const p=metadata['/generality'];return{meta:[{title:p.title},{name:'description',content:p.description}],links:[{rel:'canonical',href:'https://bphntw8kdojl9qvuifywyjtk.macaly.app/generality'}]}},component:Page})
function Page(){return <WorkspaceLayout title="Generality Research" eyebrow="EXPANDED CAPABILITIES"><ExpansionGuide path="/generality"/><ExperimentLab kind="generality"/></WorkspaceLayout>}
