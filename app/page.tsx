"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import TokenCard from "@/components/TokenCard";
import BondingBadge from "@/components/BondingBadge";
import { CHAIN } from "@/lib/mockData";
import { Token } from "@/lib/types";
import { ArcToken } from "@/lib/arcTokens";
import { fetchRadarTokens } from "@/lib/radar";
import { placeholderImage } from "@/lib/swap";
import { RocketLaunch, Coins, ArrowRight, CircleNotch } from "@phosphor-icons/react";

// RadarDex tokens are live AMM tokens (already graduated) — map to the
// launchpad Token shape used by TokenCard.
function arcToToken(t: ArcToken): Token {
  return {
    address: t.address,
    symbol: t.symbol,
    name: t.name,
    description: "",
    image: t.image,
    bondingType: "standard",
    priceUsdc: t.priceUsdc,
    mcapUsdc: t.mcapUsdc,
    supply: t.priceUsdc > 0 ? t.mcapUsdc / t.priceUsdc : 0,
    change24h: t.change24h,
    volume24h: t.volume24h,
    holders: t.holders,
    bondingProgress: 100, // has a live pool → fully graduated
    trades24h: 0,
    createdAt: Date.now() / 1000 - t.ageH * 3600,
    creator: { wallet: "", feeBps: 0, claimed: 0, claimable: 0 },
    tags: [],
  };
}

interface ChainTokenInfo {
  token: string;
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

// Arcodex bonding-curve token (from the on-chain API route) → Token.
function chainToToken(info: ChainTokenInfo, index: number, total: number): Token {
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
    createdAt: total - index,
    creator: {
      wallet: "",
      feeBps: 70,
      claimed: 0,
      claimable: Number(info.creatorClaimable) / 1e6,
    },
    tags: [],
  };
}

export default function HomePage() {
  const [trending, setTrending] = useState<Token[]>([]);
  const [newest, setNewest] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    // Trending: top RadarDex tokens by 24h volume (live, no mock)
    const radar = fetchRadarTokens(500)
      .then((list) => {
        if (cancelled) return;
        setTrending(
          [...list]
            .sort((a, b) => b.volume24h - a.volume24h)
            .slice(0, 5)
            .map(arcToToken)
        );
      })
      .catch(() => {});

    // Newest: Arcodex bonding-curve tokens from the on-chain API (no mock)
    const chain = fetch("/api/arcodex-tokens")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`))))
      .then((data) => {
        if (cancelled || data?.error) return;
        const infos: ChainTokenInfo[] = Array.isArray(data?.tokens) ? data.tokens : [];
        // API returns newest-first already
        setNewest(infos.slice(0, 5).map((info, i) => chainToToken(info, i, infos.length)));
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "Failed to load live tokens.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    Promise.allSettled([radar, chain]).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="grid-backdrop absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-24">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--accent)]">
              {CHAIN.name} launchpad
            </p>
            <h1 className="mt-4 font-mono text-4xl font-semibold leading-none tracking-tight sm:text-6xl">
              Launch on Arc.
              <br />
              Trade in{" "}
              <span className="text-[var(--accent)]">USDC</span>.
            </h1>
            <p className="mt-5 max-w-md font-mono text-sm leading-relaxed text-[var(--text-2)]">
              Create a token on a bonding curve with Standard or Early Buy
              distribution. All prices, fees, and trades in native USDC.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/launch"
                className="flex items-center gap-2 rounded-md bg-[var(--accent)] px-5 py-2.5 font-mono text-sm font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.98]"
              >
                <RocketLaunch size={16} />
                Launch a token
              </Link>
              <Link
                href="/discover"
                className="flex items-center gap-2 rounded-md border border-[var(--border)] px-5 py-2.5 font-mono text-sm text-[var(--text)] transition hover:border-[var(--accent)]/50"
              >
                Discover tokens
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Hero logo mark */}
          <div className="pointer-events-none absolute -right-10 top-10 hidden opacity-60 lg:block">
            <Image
              src="/logo.png"
              alt=""
              width={320}
              height={320}
              className="logo-glow"
              priority
            />
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
            Trending now
          </h2>
          <Link
            href="/discover"
            className="font-mono text-xs text-[var(--accent)] transition hover:brightness-125"
          >
            View all →
          </Link>
        </div>
        {loading && trending.length === 0 ? (
          <div className="mt-5 flex h-40 items-center justify-center rounded-lg border border-[var(--border)]">
            <CircleNotch size={20} className="animate-spin text-[var(--accent)]" />
          </div>
        ) : trending.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {trending.map((t, i) => (
              <TokenCard key={t.address} token={t} index={i} />
            ))}
          </div>
        ) : (
          <p className="mt-5 font-mono text-xs text-[var(--text-2)]">
            No live tokens yet — check back soon.
          </p>
        )}
      </section>

      {/* Bonding types */}
      <section className="border-y border-[var(--border)] bg-[var(--surface)]/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
            Two bonding types
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex items-center gap-3">
                <BondingBadge type="standard" />
              </div>
              <h3 className="mt-4 font-mono text-xl font-semibold">Standard</h3>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--text-2)]">
                Linear bonding curve, open to everyone from block one. The classic
                fair launch: first come, first priced.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex items-center gap-3">
                <BondingBadge type="early-buy" />
              </div>
              <h3 className="mt-4 font-mono text-xl font-semibold">Early Buy</h3>
              <p className="mt-2 font-mono text-xs leading-relaxed text-[var(--text-2)]">
                Whitelisted early buyers get first access before public trading.
                Creator controls the whitelist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newest */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
            Newest launches
          </h2>
          <Link
            href="/discover"
            className="font-mono text-xs text-[var(--accent)] transition hover:brightness-125"
          >
            View all →
          </Link>
        </div>
        {loading && newest.length === 0 ? (
          <div className="mt-5 flex h-40 items-center justify-center rounded-lg border border-[var(--border)]">
            <CircleNotch size={20} className="animate-spin text-[var(--accent)]" />
          </div>
        ) : newest.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {newest.map((t, i) => (
              <TokenCard key={t.address} token={t} index={i} />
            ))}
          </div>
        ) : (
          <p className="mt-5 font-mono text-xs text-[var(--text-2)]">
            No tokens launched on Arcodex yet — be the first!
          </p>
        )}
      </section>

      {/* Stats strip */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-10 sm:grid-cols-4 sm:px-6">
          {[
            ["Native currency", CHAIN.nativeSymbol],
            ["Launch fee", "1%"],
            ["Swap fee", "1.5%"],
            ["Graduation", "AMM at 100%"],
          ].map(([k, v]) => (
            <div key={k} className="px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                {k}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold text-[var(--text)]">
                <Coins size={15} className="text-[var(--accent)]" />
                {v}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-8 text-center font-mono text-[11px] text-[var(--text-2)]">
        arcodex · launched on {CHAIN.name} · all amounts in {CHAIN.nativeSymbol}
      </footer>
    </main>
  );
}
