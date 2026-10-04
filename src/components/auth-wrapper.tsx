import { AuthLoading, Authenticated, Unauthenticated } from "convex/react"
import { SignInForm } from "./sign-in-form"

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <>
    <AuthLoading><div className="min-h-screen nexus-shell auth-state"><span className="live-pill">● CONNECTING TO FORGE CORE</span></div></AuthLoading>
    <Authenticated>{children}</Authenticated>
    <Unauthenticated><SignInForm /></Unauthenticated>
  </>
}
