"use client";

import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import TokenCard from "@/components/TokenCard";
import BondingBadge from "@/components/BondingBadge";
import { tokens, CHAIN, formatUsdc } from "@/lib/mockData";
import { RocketLaunch, Coins, ArrowRight } from "@phosphor-icons/react";

export default function HomePage() {
  const trending = [...tokens].sort((a, b) => b.volume24h - a.volume24h).slice(0, 5);
  const newest = [...tokens].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

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
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {trending.map((t, i) => (
            <TokenCard key={t.address} token={t} index={i} />
          ))}
        </div>
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
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {newest.map((t, i) => (
            <TokenCard key={t.address} token={t} index={i} />
          ))}
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-t border-[var(--border)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 py-10 sm:grid-cols-4 sm:px-6">
          {[
            ["Native currency", CHAIN.nativeSymbol],
            ["Creator fee", "0.5-2%"],
            ["Graduation", "AMM at 100%"],
            ["Login", "Wallet or X"],
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
