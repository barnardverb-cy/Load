import { describe, expect, it } from 'vitest'

import { loginSchema, registerSchema } from './auth'

describe('loginSchema', () => {
  it('accepts a valid login', () => {
    expect(
      loginSchema.safeParse({ email: 'athlete@example.com', password: 'password' }).success,
    ).toBe(true)
  })

  it('rejects invalid credentials', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '' })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts matching passwords with a valid profile', () => {
    const result = registerSchema.safeParse({
      displayName: 'Joshua',
      email: 'athlete@example.com',
      password: 'strong-password',
      confirmPassword: 'strong-password',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      displayName: 'Joshua',
      email: 'athlete@example.com',
      password: 'strong-password',
      confirmPassword: 'different-password',
    })
    expect(result.success).toBe(false)
  })
})
