import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})

export const passwordResetSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const registerSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Enter your name').max(80, 'Use 80 characters or fewer'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>
export type PasswordResetInput = z.infer<typeof passwordResetSchema>
export type RegisterInput = z.infer<typeof registerSchema>
