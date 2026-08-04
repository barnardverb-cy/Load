/** Runtime origin, safe for SSR/test environments where `window` is absent. */
export function currentOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

/** Runtime full URL, safe for SSR/test environments where `window` is absent. */
export function currentUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : ''
}

/** Promise-based delay, guarded so it is safe outside the browser. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined') window.setTimeout(resolve, ms)
    else setTimeout(resolve, ms)
  })
}
