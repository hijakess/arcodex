"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BondingBadge from "@/components/BondingBadge";
import TradingViewChart, { genCandles, candlesToMcap } from "@/components/TradingViewChart";
import { tokens, recentTrades, formatUsdc, formatNum, timeAgo, shortAddr } from "@/lib/mockData";
import { XLogo, ArrowDown, ArrowUp, Wallet } from "@phosphor-icons/react";

export default function TokenPage() {
  const params = useParams<{ address: string }>();
  const token = tokens.find((t) => t.address === params.address);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  const trades = useMemo(
    () => recentTrades.filter((t) => t.tokenAddress === params.address),
    [params.address]
  );

  const chartData = useMemo(
    () => genCandles(params.address.length + Math.round((token?.priceUsdc ?? 1) * 1000), 120),
    [params.address, token]
  );
  const mcapData = useMemo(
    () => candlesToMcap(chartData, (token?.mcapUsdc ?? 1) / (token?.priceUsdc ?? 1) || 1_000_000),
    [chartData, token]
  );

  if (!token) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-mono text-2xl">Token not found</h1>
          <Link
            href="/discover"
            className="mt-4 inline-block font-mono text-sm text-[var(--accent)]"
          >
            Back to Discover
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
        <Link
          href="/discover"
          className="font-mono text-xs text-[var(--text-2)] transition hover:text-[var(--text)]"
        >
          ← Back to Discover
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left column */}
          <div>
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                <Image
                  src={token.image}
                  alt={token.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-2xl font-semibold tracking-tight">
                    {token.symbol}
                  </h1>
                  <BondingBadge type={token.bondingType} />
                </div>
                <p className="mt-1 font-mono text-sm text-[var(--text-2)]">
                  {token.name}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[var(--text-2)]/70">
                  {token.address}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-2xl font-mono text-xs leading-relaxed text-[var(--text-2)]">
              {token.description}
            </p>

            {/* Chart */}
            <div className="mt-6 flex h-64 w-full flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-[var(--text-2)]">
                  {token.symbol}/USDC · live price action
                </p>
                <span className={`font-mono text-[11px] font-semibold ${up ? "text-[var(--pos)]" : "text-[var(--neg)]"}`}>
                  {up ? "+" : ""}
                  {token.change24h.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 flex-1">
                <TradingViewChart
                  priceData={chartData}
                  mcapData={mcapData}
                  accent={up ? "#22d3ee" : "#fb7185"}
                  height={220}
                  showMetricToggle
                />
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Price" value={`${formatUsdc(token.priceUsdc, 4)}`} />
              <Stat label="Market cap" value={formatUsdc(token.mcapUsdc)} />
              <Stat label="24h vol" value={formatUsdc(token.volume24h)} />
              <Stat label="Holders" value={formatNum(token.holders)} />
            </div>

            {/* Bonding progress */}
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[var(--text-2)]">Bonding progress</span>
                <span className="text-[var(--accent)]">{token.bondingProgress}%</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all"
                  style={{ width: `${token.bondingProgress}%` }}
                />
              </div>
              <p className="mt-2 font-mono text-[10px] text-[var(--text-2)]/70">
                {token.bondingProgress >= 100
                  ? "Graduated to the full AMM. Liquidity locked."
                  : "At 100% this token graduates to the full AMM."}
              </p>
            </div>

            {/* Creator info */}
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
                Creator
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-center gap-2">
                  <Wallet size={15} className="text-[var(--accent)]" />
                  <span className="font-mono text-xs text-[var(--text)]">
                    {token.creator.wallet}
                  </span>
                </div>
                {token.creator.xHandle && (
                  <a
                    href={`https://x.com/${token.creator.xHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-2)] transition hover:text-[var(--accent)]"
                  >
                    <XLogo size={14} />
                    @{token.creator.xHandle}
                  </a>
                )}
                <span className="font-mono text-[11px] text-[var(--text-2)]/70">
                  Fee: {(token.creator.feeBps / 100).toFixed(2)}% per trade
                </span>
              </div>
            </div>

            {/* Trades */}
            <div className="mt-6">
              <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
                Recent trades
              </p>
              {trades.length === 0 ? (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center font-mono text-xs text-[var(--text-2)]">
                  No trades yet. Be the first.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                  {trades.map((t, i) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between px-4 py-2.5 font-mono text-xs ${
                        i > 0 ? "border-t border-[var(--border)]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {t.isBuy ? (
                          <ArrowUp size={13} className="text-[var(--pos)]" />
                        ) : (
                          <ArrowDown size={13} className="text-[var(--neg)]" />
                        )}
                        <span
                          className={
                            t.isBuy ? "text-[var(--pos)]" : "text-[var(--neg)]"
                          }
                        >
                          {t.isBuy ? "BUY" : "SELL"}
                        </span>
                        <span className="text-[var(--text-2)]">
                          {shortAddr(t.wallet)}
                        </span>
                        {t.isCreator && (
                          <span className="rounded border border-[var(--accent)]/40 px-1 font-mono text-[9px] uppercase tracking-wider text-[var(--accent)]">
                            Creator
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[var(--text)]">
                          {formatUsdc(t.amountUsdc)}
                        </span>
                        <span className="text-[var(--text-2)]/70">
                          {timeAgo(t.time)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column - trade panel */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex rounded-md border border-[var(--border)] p-1">
                <button
                  onClick={() => setMode("buy")}
                  className={`flex-1 rounded py-2 font-mono text-xs font-semibold transition ${
                    mode === "buy"
                      ? "bg-[var(--pos)] text-[#05070b]"
                      : "text-[var(--text-2)] hover:text-[var(--text)]"
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setMode("sell")}
                  className={`flex-1 rounded py-2 font-mono text-xs font-semibold transition ${
                    mode === "sell"
                      ? "bg-[var(--neg)] text-white"
                      : "text-[var(--text-2)] hover:text-[var(--text)]"
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Amount (USDC)
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </div>

              <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-[var(--text-2)]">
                <span>Price</span>
                <span className="text-[var(--text)]">
                  {formatUsdc(token.priceUsdc, 4)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-[var(--text-2)]">
                <span>24h change</span>
                <span className={up ? "text-[var(--pos)]" : "text-[var(--neg)]"}>
                  {up ? "+" : ""}
                  {token.change24h.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] text-[var(--text-2)]">
                <span>Supply</span>
                <span className="text-[var(--text)]">{formatNum(token.supply)}</span>
              </div>

              <button
                className={`mt-5 w-full rounded-md py-3 font-mono text-sm font-semibold transition active:scale-[0.99] ${
                  mode === "buy"
                    ? "bg-[var(--pos)] text-[#05070b] hover:brightness-110"
                    : "bg-[var(--neg)] text-white hover:brightness-110"
                }`}
              >
                {mode === "buy" ? `Buy ${token.symbol}` : `Sell ${token.symbol}`}
              </button>

              <p className="mt-3 text-center font-mono text-[10px] text-[var(--text-2)]/60">
                All amounts in USDC. Creator fee {(token.creator.feeBps / 100).toFixed(2)}%
                included.
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
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}
