"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import BondingBadge from "@/components/BondingBadge";
import { BONDING_TYPES, CHAIN } from "@/lib/mockData";
import { BondingType } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

export default function LaunchPage() {
  const { user, connect } = useAuth();
  const [bonding, setBonding] = useState<BondingType>("standard");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [creatorWallet, setCreatorWallet] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [initialBuy, setInitialBuy] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--pos)]/40 bg-[var(--pos)]/10">
            <span className="font-mono text-2xl text-[var(--pos)]">✓</span>
          </div>
          <h1 className="mt-6 font-mono text-2xl font-semibold">Launch queued</h1>
          <p className="mt-3 font-mono text-xs leading-relaxed text-[var(--text-2)]">
            {symbol || "Your token"} will deploy on {CHAIN.name} with a{" "}
            <span className="text-[var(--text)]">
              {bonding === "early-buy" ? "Early Buy" : "Standard"}
            </span>{" "}
            bonding curve. All prices in {CHAIN.nativeSymbol}. Connect the creator
            wallet to sign the deployment transaction.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-8 rounded-md border border-[var(--border)] px-5 py-2 font-mono text-xs text-[var(--text-2)] transition hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
          >
            Back
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">Launch</h1>
        <p className="mt-2 font-mono text-xs text-[var(--text-2)]">
          Create a token on {CHAIN.name}. Native currency:{" "}
          <span className="text-[var(--accent)]">{CHAIN.nativeSymbol}</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          {/* Bonding type */}
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
              Bonding type
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {BONDING_TYPES.map((bt) => (
                <button
                  key={bt.value}
                  type="button"
                  onClick={() => setBonding(bt.value)}
                  className={`rounded-lg border p-4 text-left transition ${
                    bonding === bt.value
                      ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                      : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <BondingBadge type={bt.value} />
                    {bonding === bt.value && (
                      <span className="font-mono text-xs text-[var(--accent)]">Selected</span>
                    )}
                  </div>
                  <p className="mt-3 font-mono text-sm font-semibold text-[var(--text)]">
                    {bt.label}
                  </p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--text-2)]">
                    {bt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Token details */}
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={60}
                placeholder="e.g. Arc Light"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                Symbol
              </span>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                maxLength={20}
                placeholder="e.g. ARCL"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={256}
              rows={3}
              placeholder="What is this token about?"
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
            />
          </label>

          {/* Token socials */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
              Token socials
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-2)]/80">
              Shown on the token detail page.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Website
                </span>
                <input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Twitter / X
                </span>
                <input
                  value={twitter}
                  onChange={(e) => setTwitter(e.target.value)}
                  placeholder="@yourhandle"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Telegram (optional)
                </span>
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@yourgroup"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Discord (optional)
                </span>
                <input
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="discord.gg/..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {/* Creator fee destination */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
              Creator fee destination
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-2)]/80">
              Trading fees accrue here and can be claimed from your profile.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Fee wallet
                </span>
                <input
                  value={creatorWallet}
                  onChange={(e) => setCreatorWallet(e.target.value)}
                  placeholder="0x..."
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  X handle (optional)
                </span>
                <input
                  value={xHandle}
                  onChange={(e) => setXHandle(e.target.value)}
                  placeholder="@yourhandle"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-3.5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Fee rate
                </p>
                <p className="mt-1 font-mono text-xl font-semibold text-[var(--accent)]">
                  1.00%
                </p>
                <p className="mt-1 font-mono text-[10px] leading-relaxed text-[var(--text-2)]/80">
                  Fixed fee on every trade. Split: 80% creator · 20% platform.
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Initial buy (USDC, optional)
                </span>
                <input
                  value={initialBuy}
                  onChange={(e) => setInitialBuy(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
              </label>
            </div>
          </div>

          {!user && (
            <p className="rounded-md border border-amber-300/30 bg-amber-400/5 px-4 py-3 font-mono text-xs text-amber-200/90">
              Connect a wallet to deploy. You can also log in with X.
            </p>
          )}

          <button
            type="submit"
            disabled={!user}
            className="w-full rounded-md bg-[var(--accent)] py-3 font-mono text-sm font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {user ? "Launch token" : "Connect wallet to launch"}
          </button>
          {!user && (
            <button
              type="button"
              onClick={() => connect("twitter")}
              className="w-full rounded-md border border-[var(--border)] py-3 font-mono text-sm text-[var(--text)] transition hover:border-[var(--accent)]/50"
            >
              Log in with X
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
