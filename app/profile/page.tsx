"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { myHoldings, claimableFees, formatUsdc, formatNum, shortAddr } from "@/lib/mockData";
import { useAuth } from "@/lib/useAuth";
import { Coins, Wallet, ArrowUpRight } from "@phosphor-icons/react";
import { useState } from "react";

export default function ProfilePage() {
  const { user, connect, hasPrivy, isWrongChain, chainId, switchToArc } = useAuth();
  const [claimed, setClaimed] = useState<string[]>([]);
  const totalClaimable = claimableFees.reduce((s, f) => s + f.claimable, 0);
  const totalPnl = myHoldings.reduce((s, h) => s + h.pnlUsdc, 0);

  if (!user) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto flex max-w-md flex-col items-center px-4 py-28 text-center sm:px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-dim)]">
            <Wallet size={26} className="text-[var(--accent)]" />
          </div>
          <h1 className="mt-6 font-mono text-2xl font-semibold">Connect to view profile</h1>
          <p className="mt-3 font-mono text-xs leading-relaxed text-[var(--text-2)]">
            Claim creator fees and see the tokens you hold.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3">
            <button
              onClick={() => connect("wallet")}
              className="w-full rounded-md bg-[var(--accent)] py-3 font-mono text-sm font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.99]"
            >
              Connect Wallet
            </button>
            {hasPrivy && (
              <button
                onClick={() => connect("twitter")}
                className="w-full rounded-md border border-[var(--border)] py-3 font-mono text-sm text-[var(--text)] transition hover:border-[var(--accent)]/50"
              >
                Log in with X
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-tight">Profile</h1>
            <p className="mt-1 font-mono text-xs text-[var(--text-2)]">
              {user.address}
              {user.twitterHandle ? ` · @${user.twitterHandle}` : ""}
            </p>
            <p className="mt-0.5 font-mono text-[10px]">
              {isWrongChain ? (
                <span className="text-amber-300">
                  Wrong network (chain {chainId}) — Arcodex runs on Arc 5042.{" "}
                  <button onClick={() => switchToArc()} className="underline transition hover:text-amber-200">
                    Switch to Arc
                  </button>
                </span>
              ) : (
                <span className="text-[var(--pos)]">Connected · Arc network ✓</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                Claimable fees
              </p>
              <p className="font-mono text-lg font-semibold text-[var(--accent)]">
                {formatUsdc(totalClaimable)}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                Holdings PnL
              </p>
              <p
                className={`font-mono text-lg font-semibold ${
                  totalPnl >= 0 ? "text-[var(--pos)]" : "text-[var(--neg)]"
                }`}
              >
                {totalPnl >= 0 ? "+" : ""}
                {formatUsdc(totalPnl)}
              </p>
            </div>
          </div>
        </div>

        {/* Claim fees */}
        <div className="mt-10">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-[var(--accent)]" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
              Creator fees
            </h2>
          </div>
          {claimableFees.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center font-mono text-xs text-[var(--text-2)]">
              No claimable fees yet. Launch a token to start earning.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {claimableFees.map((f) => {
                const isClaimed = claimed.includes(f.tokenAddress);
                return (
                  <div
                    key={f.tokenAddress}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={f.image}
                        alt={f.symbol}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-md object-cover"
                      />
                      <div>
                        <p className="font-mono text-sm font-semibold text-[var(--text)]">
                          {f.symbol}
                        </p>
                        <p className="font-mono text-[11px] text-[var(--text-2)]">
                          {f.name} · {(f.feeBps / 100).toFixed(2)}% fee
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-semibold text-[var(--accent)]">
                        {formatUsdc(f.claimable)}
                      </span>
                      <button
                        onClick={() => {
                          if (isClaimed) return;
                          setClaimed((c) => [...c, f.tokenAddress]);
                        }}
                        disabled={isClaimed}
                        className="rounded-md bg-[var(--accent)] px-4 py-2 font-mono text-xs font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                      >
                        {isClaimed ? "Claimed" : "Claim"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Holdings */}
        <div className="mt-12">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
            Tokens you hold
          </h2>
          {myHoldings.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center font-mono text-xs text-[var(--text-2)]">
              No holdings yet. Explore the Discover page.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
              {myHoldings.map((h, i) => {
                const pnlPct = ((h.currentPriceUsdc - h.avgCostUsdc) / h.avgCostUsdc) * 100;
                return (
                  <Link
                    key={h.tokenAddress}
                    href={`/token/${h.tokenAddress}`}
                    className={`flex items-center justify-between px-4 py-3 transition hover:bg-white/5 ${
                      i > 0 ? "border-t border-[var(--border)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={h.image}
                        alt={h.symbol}
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-md object-cover"
                      />
                      <div>
                        <p className="font-mono text-sm font-semibold text-[var(--text)]">
                          {h.symbol}
                        </p>
                        <p className="font-mono text-[11px] text-[var(--text-2)]">
                          {formatNum(h.amount)} tokens
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-mono text-xs text-[var(--text-2)]">PnL</p>
                        <p
                          className={`font-mono text-sm font-semibold ${
                            h.pnlUsdc >= 0 ? "text-[var(--pos)]" : "text-[var(--neg)]"
                          }`}
                        >
                          {h.pnlUsdc >= 0 ? "+" : ""}
                          {formatUsdc(h.pnlUsdc)}
                          <span className="ml-1 text-[10px] opacity-70">
                            ({pnlPct >= 0 ? "+" : ""}
                            {pnlPct.toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                      <ArrowUpRight size={15} className="text-[var(--text-2)]" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
