"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import TokenCard from "@/components/TokenCard";
import SortDropdown from "@/components/SortDropdown";
import { BondingType, Token } from "@/lib/types";
import { placeholderImage } from "@/lib/swap";
import { CircleNotch } from "@phosphor-icons/react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "mcap", label: "Market cap" },
  { value: "progress", label: "Bonding progress" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "standard", label: "Standard" },
  { value: "early-buy", label: "Early Buy" },
];

interface ApiTokenInfo {
  token: string;
  creator: string;
  creatorFeeWallet: string;
  name: string;
  symbol: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  supply: string;
  startingPrice: string;
  graduationThreshold: string;
  sold: string;
  totalCollected: string;
  creatorClaimable: string;
  platformClaimable: string;
  bondingType: number;
  graduated: boolean;
  pool: string;
}

function toToken(info: ApiTokenInfo, index: number, total: number): Token {
  const startingPrice = Number(info.startingPrice) / 1e6;
  const threshold = Math.max(1, Number(info.graduationThreshold) / 1e18);
  const sold = Number(info.sold) / 1e18;
  const price = startingPrice * (1 + sold / threshold);
  const supply = Number(info.supply) / 1e18;
  const progress = Math.min(100, Math.max(0, (sold / threshold) * 100));
  return {
    address: info.token,
    symbol: info.symbol,
    name: info.name,
    description: "",
    image: placeholderImage(info.symbol, info.token),
    bondingType: info.bondingType === 1 ? "early-buy" : "standard",
    priceUsdc: price,
    mcapUsdc: price * supply,
    supply,
    change24h: 0,
    volume24h: Number(info.totalCollected) / 1e6,
    holders: 0,
    bondingProgress: progress,
    trades24h: 0,
    // newest-first order comes from the contract; keep that for default sort
    createdAt: total - index,
    creator: {
      wallet: info.creator,
      feeBps: 70,
      claimed: 0,
      claimable: Number(info.creatorClaimable) / 1e6,
    },
    tags: [],
  };
}

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");
  const [list, setList] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    // Serve cached list instantly on revisits; the API route itself is
    // CDN-cached (s-maxage=60) so this is only for instant paint.
    try {
      const cached = sessionStorage.getItem("arcodex:discover:v1");
      if (cached) {
        const { at, tokens } = JSON.parse(cached);
        if (Array.isArray(tokens) && Date.now() - at < 90_000) {
          setList(tokens.map((info: ApiTokenInfo, i: number) => toToken(info, i, tokens.length)));
          setLoading(false);
        }
      }
    } catch {
      /* storage unavailable — fetch fresh */
    }
    fetch("/api/arcodex-tokens")
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        const infos: ApiTokenInfo[] = Array.isArray(data?.tokens) ? data.tokens : [];
        setList(infos.map((info, i) => toToken(info, i, infos.length)));
        setLoading(false);
        try {
          sessionStorage.setItem(
            "arcodex:discover:v1",
            JSON.stringify({ at: Date.now(), tokens: infos })
          );
        } catch {
          /* ignore quota errors */
        }
      })
      .catch((e) => {
        setError(e?.message || "Failed to load tokens from the chain.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let l = list.filter(
      (t) =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
    );
    if (filter !== "all") {
      l = l.filter((t) => t.bondingType === (filter as BondingType));
    }
    switch (sort) {
      case "mcap":
        l = [...l].sort((a, b) => b.mcapUsdc - a.mcapUsdc);
        break;
      case "progress":
        l = [...l].sort((a, b) => b.bondingProgress - a.bondingProgress);
        break;
      default: // newest
        l = [...l].sort((a, b) => b.createdAt - a.createdAt);
    }
    return l;
  }, [list, query, sort, filter]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            Discover
          </h1>
          <p className="max-w-lg font-mono text-xs text-[var(--text-2)]">
            Tokens launched on Arcodex, live from the bonding curve on Arc.
            Priced in USDC — bonding curves graduate to a full AMM at 100%.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by symbol or name..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/60 focus:border-[var(--accent)]/60 focus:outline-none lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SortDropdown
              options={FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
              label="Type"
            />
            <SortDropdown
              options={SORT_OPTIONS}
              value={sort}
              onChange={setSort}
              label="Sort"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-20 flex flex-col items-center gap-3 text-center">
            <CircleNotch size={26} className="animate-spin text-[var(--accent)]" />
            <p className="font-mono text-xs text-[var(--text-2)]">
              Reading tokens from the Arcodex bonding curve…
            </p>
          </div>
        ) : error ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <p className="font-mono text-xs text-[var(--neg)]">{error}</p>
            <button
              onClick={load}
              className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-4 py-2 font-mono text-xs font-semibold text-[var(--accent)] transition hover:border-[var(--accent)]"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-20 text-center font-mono text-sm text-[var(--text-2)]">
            {list.length === 0
              ? "No tokens launched on Arcodex yet. Be the first — Launch one!"
              : `No tokens match "${query}".`}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.map((t, i) => (
              <TokenCard key={t.address} token={t} index={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
