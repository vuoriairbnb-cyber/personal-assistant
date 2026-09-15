import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { MARKET_INDICES, type MarketQuote } from "@/lib/morning-brief/market-pulse-contract";

const valueFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 1 });
const changeFormat = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 1, signDisplay: "always" });
const updatedFormat = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Helsinki" });

function Sparkline({ quote }: { quote: MarketQuote }) {
  const rising = quote.percentChange >= 0;
  if (quote.points.length < 2) {
    const Direction = quote.percentChange === 0 ? Minus : rising ? TrendingUp : TrendingDown;
    return <Direction aria-label="History unavailable" className="h-8 w-8 text-text-tertiary" strokeWidth={1.5} />;
  }
  const values = quote.points.map((point) => point.value); const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const path = values.map((value, index) => `${index === 0 ? "M" : "L"}${(index / (values.length - 1)) * 100} ${32 - ((value - min) / range) * 28}`).join(" ");
  return <svg viewBox="0 0 100 36" role="img" aria-label={`${quote.label}, five recent trading-day closes`} className="h-10 w-24 shrink-0 overflow-visible"><path d={path} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className={rising ? "text-success-strong" : "text-danger-strong"} /><circle cx="100" cy={32 - ((values.at(-1)! - min) / range) * 28} r="2.5" className={rising ? "fill-success-strong" : "fill-danger-strong"} /></svg>;
}

export function MarketPulse({ quotes }: { quotes: MarketQuote[] }) {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
  return <section aria-labelledby="market-pulse-title"><div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="market-pulse-title" className="font-serif text-2xl text-text-primary">Market Pulse</h2><p className="mt-1 text-xs text-text-secondary">Five recent trading-day closes · delayed or end-of-day data</p></div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{MARKET_INDICES.map((definition) => { const quote = bySymbol.get(definition.symbol); if (!quote) return <div key={definition.symbol} className="min-h-36 rounded-lg border border-border-subtle bg-card px-4 py-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{definition.symbol}</p><p className="mt-1 text-sm text-text-secondary">{definition.label}</p><p className="mt-8 text-sm text-text-tertiary">Quote unavailable</p><div className="mt-3"><Minus className="h-5 w-5 text-text-tertiary" strokeWidth={1.5} /></div></div>; const positive = quote.percentChange >= 0; return <div key={quote.symbol} className="min-h-36 rounded-lg border border-border-subtle bg-card px-4 py-4 shadow-xs"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">{quote.symbol}</p><p className="truncate text-xs text-text-secondary">{quote.label}</p></div><Sparkline quote={quote} /></div><p className="mt-3 font-mono text-xl tracking-tight text-text-primary">{valueFormat.format(quote.value)}</p><p className={`mt-1 flex items-center gap-1 text-sm font-medium ${positive ? "text-success-strong" : "text-danger-strong"}`}>{positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{changeFormat.format(quote.absoluteChange)} <span className="text-xs">({changeFormat.format(quote.percentChange)}%)</span></p><p className="mt-2 text-[11px] text-text-tertiary">Delayed / EOD · {updatedFormat.format(new Date(quote.asOf))}</p></div>; })}</div></section>;
}
