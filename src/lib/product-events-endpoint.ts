export function productEventsEndpoint(backend: string): string | null {
  try {
    const url = new URL(backend)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || !url.hostname.endsWith('.convex.cloud')) return null
    return `https://${url.hostname.slice(0, -'.convex.cloud'.length)}.convex.site/product-events`
  } catch { return null }
}
