import { createFileRoute } from '@tanstack/react-router'
import { PricingOptions } from '../components/pricing-options'
export const Route=createFileRoute('/pricing')({component:()=> <main className="nexus-shell min-h-screen"><PricingOptions/></main>})
