import { createFileRoute } from '@tanstack/react-router'
import { WorkspaceLayout } from '../components/workspace-layout'
import { ExpansionGuide } from '../components/expansion-guide'
import { MultimodalStudio } from '../components/multimodal-studio'
import metadata from '../metadata.json'
export const Route=createFileRoute('/multimodal')({head:()=>{const p=metadata['/multimodal'];return{meta:[{title:p.title},{name:'description',content:p.description}],links:[{rel:'canonical',href:'https://bphntw8kdojl9qvuifywyjtk.macaly.app/multimodal'}]}},component:Page})
function Page(){return <WorkspaceLayout title="Multimodal Studio" eyebrow="EXPANDED CAPABILITIES"><ExpansionGuide path="/multimodal"/><MultimodalStudio/></WorkspaceLayout>}
