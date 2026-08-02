"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import SortDropdown from "@/components/SortDropdown";
import { arcTokens, ArcToken } from "@/lib/arcTokens";
import { fetchRadarTokens } from "@/lib/radar";
import { formatUsdc, formatNum } from "@/lib/mockData";
import { ArrowsLeftRight, CaretDown, Check, MagnifyingGlass, CircleNotch } from "@phosphor-icons/react";

const SORT_OPTIONS = [
  { value: "mcap", label: "Market cap" },
  { value: "volume", label: "24h volume" },
  { value: "change", label: "24h change" },
  { value: "liquidity", label: "Liquidity" },
  { value: "holders", label: "Holders" },
];

export default function TokensPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("mcap");
  const [launchpad, setLaunchpad] = useState("all");
  const [padOpen, setPadOpen] = useState(false);
  const [liveTokens, setLiveTokens] = useState<ArcToken[] | null>(null);
  const [liveError, setLiveError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRadarTokens(500)
      .then((tokens) => {
        if (cancelled) return;
        setLiveTokens(tokens);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tokens = liveTokens ?? arcTokens;
  const launchpads = useMemo(
    () => ["all", ...Array.from(new Set(tokens.map((t) => t.launchpad)))],
    [tokens]
  );

  const filtered = useMemo(() => {
    let list = tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
    );
    if (launchpad !== "all") {
      list = list.filter((t) => t.launchpad === launchpad);
    }
    switch (sort) {
      case "volume":
        list = [...list].sort((a, b) => b.volume24h - a.volume24h);
        break;
      case "change":
        list = [...list].sort((a, b) => b.change24h - a.change24h);
        break;
      case "liquidity":
        list = [...list].sort((a, b) => b.liquidityUsdc - a.liquidityUsdc);
        break;
      case "holders":
        list = [...list].sort((a, b) => b.holders - a.holders);
        break;
      default:
        list = [...list].sort((a, b) => b.mcapUsdc - a.mcapUsdc);
    }
    return list;
  }, [query, sort, launchpad, tokens]);

  const activePad = launchpad === "all" ? "All launchpads" : launchpad;

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-3xl font-semibold tracking-tight">Tokens</h1>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] text-[var(--text-2)]">
                <CircleNotch size={11} className="animate-spin" />
                loading live feed…
              </span>
            ) : liveError ? (
              <span className="rounded-full border border-amber-300/30 bg-amber-400/5 px-2.5 py-1 font-mono text-[10px] text-amber-200/90">
                live feed offline · showing cached list
              </span>
            ) : (
              <span className="rounded-full border border-[var(--pos)]/40 bg-[var(--pos)]/10 px-2.5 py-1 font-mono text-[10px] text-[var(--pos)]">
                ● live · {tokens.length} tokens
              </span>
            )}
          </div>
          <p className="max-w-2xl font-mono text-xs text-[var(--text-2)]">
            Every token on Arc from the RadarDex feed, in one place. Buy or
            swap any of them directly on Arcodex with USDC.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <MagnifyingGlass
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-2)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any token on Arc..."
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-10 pr-4 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/60 focus:border-[var(--accent)]/60 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Launchpad filter dropdown */}
            <div className="relative">
              <button
                onClick={() => setPadOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
              >
                <span className="text-[var(--text-2)]">Launchpad:</span>
                <span className="font-semibold">{activePad}</span>
                <CaretDown
                  size={12}
                  className={`text-[var(--text-2)] transition-transform ${padOpen ? "rotate-180" : ""}`}
                />
              </button>
              {padOpen && (
                <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl shadow-black/50">
                  {launchpads.map((pad) => {
                    const selected = launchpad === pad;
                    return (
                      <button
                        key={pad}
                        onClick={() => {
                          setLaunchpad(pad);
                          setPadOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3.5 py-2 text-left font-mono text-xs transition hover:bg-white/5 ${
                          selected ? "text-[var(--accent)]" : "text-[var(--text)]"
                        }`}
                      >
                        {pad === "all" ? "All launchpads" : pad}
                        {selected && <Check size={13} weight="bold" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <SortDropdown options={SORT_OPTIONS} value={sort} onChange={setSort} label="Sort" />
          </div>
        </div>

        {/* Token table */}
        <div className="mt-8 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                <th className="px-4 py-3 font-medium">Token</th>
                <th className="px-4 py-3 font-medium">Launchpad</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">24h</th>
                <th className="px-4 py-3 text-right font-medium">Market cap</th>
                <th className="px-4 py-3 text-right font-medium">Liquidity</th>
                <th className="px-4 py-3 text-right font-medium">Traders 24h</th>
                <th className="px-4 py-3 text-right font-medium">Swap</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const up = t.change24h >= 0;
                return (
                  <tr
                    key={t.address}
                    onClick={() => (window.location.href = `/tokens/${t.address}`)}
                    className={`cursor-pointer transition hover:bg-white/[0.03] ${
                      i > 0 ? "border-t border-[var(--border)]" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={t.image}
                          alt={t.symbol}
                          width={30}
                          height={30}
                          className="h-7 w-7 rounded-md object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text)]">{t.symbol}</p>
                          <p className="truncate text-[10px] text-[var(--text-2)]">
                            {t.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-[var(--border)] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-[var(--text-2)]">
                        {t.launchpad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text)]">
                      {formatUsdc(t.priceUsdc, 4)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        up ? "text-[var(--pos)]" : "text-[var(--neg)]"
                      }`}
                    >
                      {up ? "+" : ""}
                      {t.change24h.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text)]">
                      {formatUsdc(t.mcapUsdc)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text)]">
                      {formatUsdc(t.liquidityUsdc)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-2)]">
                      {formatNum(t.holders)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 font-mono text-[11px] font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.98]">
                        <ArrowsLeftRight size={12} />
                        Swap
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center font-mono text-sm text-[var(--text-2)]">
            No tokens match your filters.
          </div>
        )}
      </section>
    </main>
  );
}
