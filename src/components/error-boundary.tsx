import { useEffect } from 'react'
import { Link, useRouter, type ErrorComponentProps } from '@tanstack/react-router'

// Matches the exact error surfaces that indicate an ended operator session:
// - the ConvexError text thrown by requireOperator (convex/permissions.ts),
//   which Convex serializes into the client error message, and
// - session-expiry messages from the Convex Auth client.
// Generic "Server Error Called by client" messages do NOT match on purpose:
// a genuine server bug must stay on the retryable error screen, not look like
// a signed-out session.
export function isAuthSessionError(message: string): boolean {
  return /unauthenticated|not authenticated|authenticated operator session|authentication required|no authenticated user|auth session/i.test(message)
}

// Wired as router-level `defaultErrorComponent` (see ../router.tsx). Receives
// `{ error, info, reset }` — we only use `error` here.
//
// Retry uses `router.invalidate()`, NOT the `reset` prop. `reset()` alone just
// clears the error boundary without re-running the failed loader, so the same
// error fires again on the next render. `router.invalidate()` re-runs loaders
// AND resets the boundary, which is what you actually want for a retry button.
export function ErrorBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  // `error` is typed `unknown` — anything can be thrown, not just an Error.
  const message = error instanceof Error ? error.message : String(error)
  const isAuthExpiry = isAuthSessionError(message)

  useEffect(() => {
    if (isAuthExpiry) {
      void router.navigate({ to: '/', replace: true })
    }
  }, [isAuthExpiry, router])

  if (isAuthExpiry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center" role="status" data-testid="session-ended-state">
        <h1 className="text-2xl font-semibold">Your session has ended</h1>
        <p className="text-muted-foreground max-w-md">Taking you back to sign in…</p>
        <Link to="/" className="text-sm underline underline-offset-4">Continue to sign in</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
      <h1 className="text-4xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md break-words">
        {message}
      </p>
      <button
        onClick={() => router.invalidate()}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        Retry
      </button>
    </div>
  )
}
