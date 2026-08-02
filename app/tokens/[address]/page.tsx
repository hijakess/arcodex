"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TradingViewChart, { genCandles, candlesToMcap } from "@/components/TradingViewChart";
import CopyButton from "@/components/CopyButton";
import { arcTokens, ArcToken } from "@/lib/arcTokens";
import { fetchRadarToken } from "@/lib/radar";
import { formatUsdc, formatNum } from "@/lib/mockData";
import {
  XLogo,
  Globe,
  TelegramLogo,
  DiscordLogo,
  ArrowsLeftRight,
  ArrowUp,
  ArrowDown,
  LinkSimple,
  CircleNotch,
} from "@phosphor-icons/react";

export default function TokenDetailPage() {
  const params = useParams<{ address: string }>();
  const [token, setToken] = useState<ArcToken | undefined>(() =>
    arcTokens.find((t) => t.address === params.address)
  );
  const [loading, setLoading] = useState(!token);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (token) return;
    fetchRadarToken(params.address)
      .then((t) => {
        if (cancelled) return;
        if (t) setToken(t);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.address]);

  const chartData = useMemo(
    () => genCandles((token?.address ?? "0x").length + Math.round((token?.priceUsdc ?? 0.001) * 1000) || 7, 120),
    [token]
  );
  const mcapData = useMemo(
    () => candlesToMcap(chartData, (token?.mcapUsdc ?? 1) / (token?.priceUsdc ?? 1) || 1_000_000),
    [chartData, token]
  );

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <CircleNotch size={28} className="animate-spin text-[var(--accent)]" />
          <p className="mt-4 font-mono text-sm text-[var(--text-2)]">
            Loading token from live feed…
          </p>
        </section>
      </main>
    );
  }

  if (!token || notFound) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-mono text-2xl">Token not found</h1>
          <Link href="/tokens" className="mt-4 inline-block font-mono text-sm text-[var(--accent)]">
            Back to Tokens
          </Link>
        </section>
      </main>
    );
  }

  const up = token.change24h >= 0;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Link href="/tokens" className="font-mono text-xs text-[var(--text-2)] transition hover:text-[var(--text)]">
          ← Back to Tokens
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left: chart + info */}
          <div>
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                <Image src={token.image} alt={token.name} width={64} height={64} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-2xl font-semibold tracking-tight">{token.symbol}</h1>
                  <span className="rounded border border-[var(--border)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-2)]">
                    {token.launchpad}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${up ? "border-[var(--pos)]/40 bg-[var(--pos)]/10 text-[var(--pos)]" : "border-[var(--neg)]/40 bg-[var(--neg)]/10 text-[var(--neg)]"}`}>
                    {up ? "+" : ""}
                    {token.change24h.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-[var(--text-2)]">{token.name}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-2xl font-semibold text-[var(--text)]">
                    {formatUsdc(token.priceUsdc, 4)}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--text-2)]">
                    {token.symbol}/USDC · 24h volume {formatUsdc(token.volume24h)}
                  </p>
                </div>
                <div className="flex gap-1 rounded-md border border-[var(--border)] p-0.5">
                  {["1H", "1D", "1W", "1M"].map((tf) => (
                    <button key={tf} className={`rounded px-2.5 py-1 font-mono text-[10px] transition ${tf === "1D" ? "bg-[var(--accent)] text-[#05070b] font-semibold" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}>
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 h-64 w-full">
                <TradingViewChart
                  priceData={chartData}
                  mcapData={mcapData}
                  accent={up ? "#22d3ee" : "#fb7185"}
                  showMetricToggle
                />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Market cap" value={formatUsdc(token.mcapUsdc)} />
              <Stat label="Liquidity" value={formatUsdc(token.liquidityUsdc)} />
              <Stat label="Traders 24h" value={formatNum(token.holders)} />
              <Stat label="Volume 24h" value={formatUsdc(token.volume24h)} />
            </div>

            {/* Token details: socials, contract, pool */}
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
                Token details
              </p>

              {/* Socials */}
              <div className="mt-4 flex flex-wrap gap-2">
                {token.website && (
                  <a
                    href={token.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <Globe size={14} className="text-[var(--accent)]" />
                    Website
                  </a>
                )}
                {token.twitter && (
                  <a
                    href={`https://x.com/${token.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <XLogo size={14} className="text-[var(--accent)]" />
                    @{token.twitter}
                  </a>
                )}
                {token.telegram && (
                  <a
                    href={`https://t.me/${token.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <TelegramLogo size={14} className="text-[var(--accent)]" />
                    Telegram
                  </a>
                )}
                {token.discord && (
                  <a
                    href={`https://discord.gg/${token.discord}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <DiscordLogo size={14} className="text-[var(--accent)]" />
                    Discord
                  </a>
                )}
              </div>

              {/* Contract address */}
              <div className="mt-4">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Contract address
                </p>
                <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-[var(--text)]">
                    {token.fullAddress}
                  </code>
                  <CopyButton text={token.fullAddress} />
                </div>
              </div>

              {/* Pool address */}
              <div className="mt-4">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Pool address
                </p>
                <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-[var(--text)]">
                    {token.poolAddress}
                  </code>
                  <CopyButton text={token.poolAddress} />
                </div>
              </div>

              <p className="mt-4 font-mono text-[10px] text-[var(--text-2)]/60">
                Launchpad: {token.launchpad} · Listed on Arcodex with native USDC liquidity.
              </p>
            </div>
          </div>

          {/* Right: swap panel */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
                <ArrowsLeftRight size={15} className="text-[var(--accent)]" />
                <p className="font-mono text-sm font-semibold">Swap</p>
              </div>

              <div className="mt-4 flex rounded-md border border-[var(--border)] p-1">
                <button
                  onClick={() => setMode("buy")}
                  className={`flex-1 rounded py-2 font-mono text-xs font-semibold transition ${mode === "buy" ? "bg-[var(--pos)] text-[#05070b]" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setMode("sell")}
                  className={`flex-1 rounded py-2 font-mono text-xs font-semibold transition ${mode === "sell" ? "bg-[var(--neg)] text-white" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}
                >
                  Sell
                </button>
              </div>

              {/* You pay */}
              <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-2)]">
                  <span>{mode === "buy" ? "You pay" : "You sell"}</span>
                  <span>Balance: 1,250.00</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-transparent font-mono text-xl text-[var(--text)] placeholder:text-[var(--text-2)]/40 focus:outline-none"
                  />
                  <span className="shrink-0 rounded border border-[var(--border)] bg-white/[0.04] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--text)]">
                    USDC
                  </span>
                </div>
              </div>

              {/* Swap icon */}
              <div className="flex justify-center py-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] transition hover:border-[var(--accent)]/60 active:scale-95">
                  <ArrowDown size={13} />
                </button>
              </div>

              {/* You receive */}
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-2)]">
                  <span>You receive</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-xl text-[var(--text)]">
                    {amount ? (Number(amount) / token.priceUsdc).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0.00"}
                  </span>
                  <span className="shrink-0 rounded border border-[var(--border)] bg-white/[0.04] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--text)]">
                    {token.symbol}
                  </span>
                </div>
              </div>

              {/* Rate info */}
              <div className="mt-3 space-y-1.5 font-mono text-[11px] text-[var(--text-2)]">
                <div className="flex justify-between">
                  <span>Rate</span>
                  <span className="text-[var(--text)]">1 {token.symbol} = {formatUsdc(token.priceUsdc, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee (1%)</span>
                  <span className="text-[var(--text)]">0.8% creator · 0.2% platform</span>
                </div>
                <div className="flex justify-between">
                  <span>Liquidity</span>
                  <span className="text-[var(--text)]">{formatUsdc(token.liquidityUsdc)}</span>
                </div>
              </div>

              <button className={`mt-5 w-full rounded-md py-3 font-mono text-sm font-semibold transition active:scale-[0.99] ${mode === "buy" ? "bg-[var(--pos)] text-[#05070b] hover:brightness-110" : "bg-[var(--neg)] text-white hover:brightness-110"}`}>
                {mode === "buy" ? `Buy ${token.symbol}` : `Sell ${token.symbol}`}
              </button>

              <p className="mt-3 text-center font-mono text-[10px] text-[var(--text-2)]/60">
                Powered by Arcodex · Native USDC on Arc
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}
