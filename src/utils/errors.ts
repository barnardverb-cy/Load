export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error && 'code' in error && error.code === '23505') {
    return 'That name is already in use. Choose a different name or restore the archived item.'
  }

  return error instanceof Error ? error.message : fallback
}
