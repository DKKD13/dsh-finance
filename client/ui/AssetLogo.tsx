import { useState } from 'react'

/** Public ticker artwork observed in the reference, with a readable local fallback. */
export function AssetLogo({ symbol }: { readonly symbol: string }) {
  const [failedSymbol, setFailedSymbol] = useState('')
  return <span className="rg-pf-monogram" aria-hidden>{failedSymbol === symbol
    ? symbol.replace(/[^A-Za-z0-9]/gu, '').slice(0, 1)
    : <img data-monochrome={symbol === 'AAPL' || undefined} src={`https://finance-logo.perplexity.ai/ticker/${encodeURIComponent(symbol)}?format=png&fallback=404&size=50`} width="30" height="30" alt="" loading="lazy" onError={() => setFailedSymbol(symbol)} />}</span>
}
