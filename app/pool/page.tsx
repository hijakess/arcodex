"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { formatUsdc, formatNum } from "@/lib/mockData";
import { Plus, Minus, Drop, ArrowUpRight } from "@phosphor-icons/react";

const MY_POOLS = [
  { symbol: "NOVA", name: "Nova Terminal", image: "/tokens/nova.svg", myLiquidity: 12_500, share: 8.2, apr: 64.5, fees24h: 42.1 },
  { symbol: "ARCL", name: "Arc Light", image: "/tokens/arcl.svg", myLiquidity: 8_000, share: 4.6, apr: 41.2, fees24h: 19.8 },
];

const ALL_POOLS = [
  { symbol: "NOVA", name: "Nova Terminal", image: "/tokens/nova.svg", liquidity: 66_000, volume24h: 128_900, apr: 64.5 },
  { symbol: "ARCL", name: "Arc Light", image: "/tokens/arcl.svg", liquidity: 210_000, volume24h: 96_540, apr: 41.2 },
  { symbol: "VGA", name: "Vega", image: "/tokens/vega.svg", liquidity: 140_000, volume24h: 51_920, apr: 28.7 },
  { symbol: "ORB", name: "Orbit", image: "/tokens/grid.svg", liquidity: 148_000, volume24h: 41_230, apr: 22.4 },
  { symbol: "PLS", name: "Pulse", image: "/tokens/pulse.svg", liquidity: 92_000, volume24h: 33_750, apr: 18.9 },
  { symbol: "FLX", name: "Flux", image: "/tokens/flux.svg", liquidity: 320_000, volume24h: 22_480, apr: 12.3 },
];

export default function PoolPage() {
  const [tab, setTab] = useState<"my" | "all">("my");

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-tight">Pool</h1>
            <p className="mt-1 font-mono text-xs text-[var(--text-2)]">
              Provide liquidity on Arc in USDC and earn swap fees.
            </p>
          </div>
          <div className="flex rounded-md border border-[var(--border)] p-1">
            <button
              onClick={() => setTab("my")}
              className={`rounded px-4 py-1.5 font-mono text-xs transition ${
                tab === "my"
                  ? "bg-[var(--accent)] text-[#05070b] font-semibold"
                  : "text-[var(--text-2)] hover:text-[var(--text)]"
              }`}
            >
              My pools
            </button>
            <button
              onClick={() => setTab("all")}
              className={`rounded px-4 py-1.5 font-mono text-xs transition ${
                tab === "all"
                  ? "bg-[var(--accent)] text-[#05070b] font-semibold"
                  : "text-[var(--text-2)] hover:text-[var(--text)]"
              }`}
            >
              All pools
            </button>
          </div>
        </div>

        {tab === "my" ? (
          <div className="mt-8 space-y-3">
            {MY_POOLS.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-10 text-center font-mono text-xs text-[var(--text-2)]">
                No positions yet. Add liquidity to start earning.
              </div>
            ) : (
              MY_POOLS.map((p, i) => (
                <div
                  key={p.symbol}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={p.image} alt={p.symbol} className="h-10 w-10 rounded-md object-cover" />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)]">
                        <Drop size={11} className="text-[var(--accent)]" />
                      </span>
                    </div>
                    <div>
                      <p className="font-mono text-sm font-semibold text-[var(--text)]">
                        {p.symbol}/USDC
                      </p>
                      <p className="font-mono text-[11px] text-[var(--text-2)]">
                        {p.share}% of pool
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                        My liquidity
                      </p>
                      <p className="font-mono text-sm font-semibold text-[var(--text)]">
                        {formatUsdc(p.myLiquidity)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                        Fees 24h
                      </p>
                      <p className="font-mono text-sm font-semibold text-[var(--pos)]">
                        +{formatUsdc(p.fees24h)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                        APR
                      </p>
                      <p className="font-mono text-sm font-semibold text-[var(--accent)]">
                        {p.apr.toFixed(1)}%
                      </p>
                    </div>
                    <button className="rounded-md border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50">
                      Manage
                    </button>
                  </div>
                </div>
              ))
            )}
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-4 font-mono text-xs text-[var(--text-2)] transition hover:border-[var(--accent)]/50 hover:text-[var(--text)]">
              <Plus size={14} />
              Add liquidity
            </button>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  <th className="px-4 py-3 font-medium">Pool</th>
                  <th className="px-4 py-3 text-right font-medium">Liquidity</th>
                  <th className="px-4 py-3 text-right font-medium">Volume 24h</th>
                  <th className="px-4 py-3 text-right font-medium">APR</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {ALL_POOLS.map((p, i) => (
                  <tr
                    key={p.symbol}
                    className={`transition hover:bg-white/[0.03] ${
                      i > 0 ? "border-t border-[var(--border)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={p.image} alt={p.symbol} className="h-7 w-7 rounded-md object-cover" />
                        <div>
                          <p className="font-semibold text-[var(--text)]">{p.symbol}/USDC</p>
                          <p className="text-[10px] text-[var(--text-2)]">{p.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text)]">
                      {formatUsdc(p.liquidity)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text)]">
                      {formatUsdc(p.volume24h)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--accent)]">
                      {p.apr.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 font-mono text-[11px] font-semibold text-[#05070b] transition hover:brightness-110">
                        <Plus size={11} />
                        Add
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
