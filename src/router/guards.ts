export type RouteAccess = {
  requiresAuth?: boolean
  publicOnly?: boolean
}

export function resolveAuthRedirect(
  access: RouteAccess,
  isAuthenticated: boolean,
  requestedPath: string,
): string | undefined {
  if (access.requiresAuth && !isAuthenticated) {
    return `/login?redirect=${encodeURIComponent(requestedPath)}`
  }

  if (access.publicOnly && isAuthenticated) {
    return '/dashboard'
  }

  return undefined
}
