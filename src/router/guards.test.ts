import { describe, expect, it } from 'vitest'

import { resolveAuthRedirect } from './guards'

describe('resolveAuthRedirect', () => {
  it('sends a signed-out user to login and preserves the destination', () => {
    expect(resolveAuthRedirect({ requiresAuth: true }, false, '/dashboard')).toBe(
      '/login?redirect=%2Fdashboard',
    )
  })

  it('sends an authenticated user away from public-only pages', () => {
    expect(resolveAuthRedirect({ publicOnly: true }, true, '/login')).toBe('/dashboard')
  })

  it('allows authorized navigation', () => {
    expect(resolveAuthRedirect({ requiresAuth: true }, true, '/dashboard')).toBeUndefined()
  })
})
