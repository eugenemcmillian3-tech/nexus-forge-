export function parseResearchResponse(text: string, sourceUrls: string[]) {
  let value: unknown
  try { value = JSON.parse(text.trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '')) }
  catch { throw new Error('Research response was incomplete or invalid. Try a narrower research question; no research was saved.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Research response must contain a result and retrieved citations. No research was saved.')
  const data = value as { result?: unknown; citations?: unknown }
  if (typeof data.result !== 'string' || !data.result.trim() || !Array.isArray(data.citations)) throw new Error('Research response must contain a result and retrieved citations. No research was saved.')
  const citations = [...new Set(data.citations.filter((url): url is string => typeof url === 'string' && sourceUrls.includes(url)))]
  if (!citations.length) throw new Error('Research response contained no supported retrieved citations. Try a narrower question; no research was saved.')
  return { result: data.result.trim(), citations }
}
