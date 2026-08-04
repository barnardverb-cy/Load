import { describe, expect, it } from 'vitest'

import {
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerSchema,
} from './auth'

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

describe('passwordResetRequestSchema', () => {
  it('accepts a valid email', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'athlete@example.com' }).success).toBe(
      true,
    )
  })

  it('rejects an invalid email', () => {
    expect(passwordResetRequestSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })
})

describe('passwordResetSchema', () => {
  it('accepts matching passwords', () => {
    expect(
      passwordResetSchema.safeParse({ password: 'new-password', confirmPassword: 'new-password' })
        .success,
    ).toBe(true)
  })

  it('rejects a password shorter than eight characters', () => {
    expect(
      passwordResetSchema.safeParse({ password: 'short', confirmPassword: 'short' }).success,
    ).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = passwordResetSchema.safeParse({
      password: 'new-password',
      confirmPassword: 'other-password',
    })
    expect(result.success).toBe(false)
  })
})
