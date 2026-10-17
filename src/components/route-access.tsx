import { useRouterState } from '@tanstack/react-router'
import { AuthWrapper } from './auth-wrapper'
export function RouteAccess({children}:{children:React.ReactNode}) {
  const pathname=useRouterState({select:state=>state.location.pathname})
  return pathname==='/pricing'?<>{children}</>:<AuthWrapper>{children}</AuthWrapper>
}
