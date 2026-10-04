import { useAuthActions } from "@convex-dev/auth/react"
import { useState } from "react"

export function SignInForm() {
  const { signIn } = useAuthActions()
  const [step,setStep]=useState<"email"|"code">("email")
  const [email,setEmail]=useState("")
  const [error,setError]=useState<string|null>(null)
  const [loading,setLoading]=useState(false)
  const submitEmail=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();setError(null);setLoading(true);try{const fd=new FormData(e.currentTarget);const value=String(fd.get("email")||"");setEmail(value);await signIn("resend-otp",fd);setStep("code")}catch{setError("Unable to send the verification code. Check the email address and try again.")}finally{setLoading(false)}}
  const submitCode=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();setError(null);setLoading(true);try{await signIn("resend-otp",new FormData(e.currentTarget))}catch{setError("That verification code is invalid or expired.")}finally{setLoading(false)}}
  return <main className="min-h-screen nexus-shell auth-state"><div className="glass-card research-card auth-card"><div className="brand-mark">N</div><div className="section-kicker">NEXUS FORGE / HUMAN OPERATOR</div><h1>{step==="email"?"Sign in to the Forge":"Check your email"}</h1><p>{step==="email"?"Human approval and external execution controls require an authenticated operator session.":`We sent a 6-digit verification code to ${email}.`}</p>{error&&<div className="warning auth-error">{error}</div>}{step==="email"?<form onSubmit={submitEmail}><label htmlFor="operator-email">EMAIL</label><input id="operator-email" name="email" type="email" autoComplete="email" required disabled={loading} placeholder="you@example.com"/><button className="primary-button" type="submit" disabled={loading}>{loading?"Sending…":"Send verification code"}</button></form>:<form onSubmit={submitCode}><input name="email" value={email} type="hidden"/><label htmlFor="operator-code">VERIFICATION CODE</label><input id="operator-code" name="code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required disabled={loading} placeholder="123456"/><button className="primary-button" type="submit" disabled={loading}>{loading?"Verifying…":"Verify and enter"}</button><button className="ghost-button" type="button" disabled={loading} onClick={()=>{setStep("email");setError(null)}}>Use another email</button></form>}</div></main>
}
