"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatUsdc, formatNum, shortAddr } from "@/lib/mockData";
import { useAuth } from "@/lib/useAuth";
import { useWallet } from "@/lib/wallet";
import { claimCreatorFees, placeholderImage, type Address } from "@/lib/swap";
import { Coins, Wallet, ArrowUpRight, CircleNotch } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

interface ChainToken {
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

interface ChainHolding {
  token: string;
  symbol: string;
  name: string;
  balance: string;
}

interface ApiResponse {
  tokens?: ChainToken[];
  holdings?: ChainHolding[];
}

// Bonding-curve price: price = startingPrice * (1 + sold / threshold)
function curvePriceUsdc(t: ChainToken): number {
  const startingPrice = Number(t.startingPrice) / 1e6;
  const threshold = Math.max(1, Number(t.graduationThreshold) / 1e18);
  const sold = Number(t.sold) / 1e18;
  return startingPrice * (1 + sold / threshold);
}

export default function ProfilePage() {
  const { user, connect, hasPrivy, isWrongChain, chainId, switchToArc } = useAuth();
  const { provider } = useWallet();
  const [tokens, setTokens] = useState<ChainToken[]>([]);
  const [holdings, setHoldings] = useState<ChainHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Load real on-chain data: creator fees + token balances via the API route
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/arcodex-tokens?holder=${user.address}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        return r.json();
      })
      .then((d: ApiResponse) => {
        if (cancelled) return;
        setTokens(Array.isArray(d.tokens) ? d.tokens : []);
        setHoldings(Array.isArray(d.holdings) ? d.holdings : []);
      })
      .catch((e) => setError(e?.message || "Failed to load profile data."))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Tokens where this wallet is the creator / fee wallet, with claimable fees
  const claimableFees = tokens
    .filter(
      (t) =>
        t.creator.toLowerCase() === user?.address.toLowerCase() ||
        t.creatorFeeWallet.toLowerCase() === user?.address.toLowerCase()
    )
    .map((t) => ({
      tokenAddress: t.token,
      symbol: t.symbol,
      name: t.name,
      image: placeholderImage(t.symbol, t.token),
      claimable: Number(t.creatorClaimable) / 1e6,
      feeBps: 100,
    }))
    .filter((f) => f.claimable > 0);

  // Holdings: balance > 0, valued at the current curve price
  const myHoldings = holdings
    .filter((h) => BigInt(h.balance) > 0n)
    .map((h) => {
      const info = tokens.find((t) => t.token.toLowerCase() === h.token.toLowerCase());
      const price = info ? curvePriceUsdc(info) : 0;
      const amount = Number(h.balance) / 1e18;
      return {
        tokenAddress: h.token,
        symbol: h.symbol,
        name: h.name,
        image: placeholderImage(h.symbol, h.token),
        amount,
        priceUsdc: price,
        valueUsdc: amount * price,
      };
    });

  const totalClaimable = claimableFees.reduce((s, f) => s + f.claimable, 0);
  const totalValue = myHoldings.reduce((s, h) => s + h.valueUsdc, 0);

  async function handleClaim(token: string) {
    if (!user || !provider) return;
    setClaiming(token);
    setError("");
    try {
      await claimCreatorFees(provider, user.address as Address, token as Address);
      setClaimed((c) => [...c, token]);
      // refresh so the claimed amount clears
      const r = await fetch(`/api/arcodex-tokens?holder=${user.address}`, { cache: "no-store" });
      const d: ApiResponse = await r.json();
      setTokens(Array.isArray(d.tokens) ? d.tokens : []);
    } catch (e: any) {
      setError(e?.shortMessage || e?.message || "Claim failed.");
    } finally {
      setClaiming(null);
    }
  }

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
              {shortAddr(user.address)}
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
                Holdings value
              </p>
              <p className="font-mono text-lg font-semibold text-[var(--text)]">
                {formatUsdc(totalValue)}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-[var(--neg)]/40 bg-[var(--neg)]/10 px-4 py-2 font-mono text-xs text-[var(--neg)]">
            {error}
          </p>
        )}

        {/* Claim fees */}
        <div className="mt-10">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-[var(--accent)]" />
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
              Creator fees
            </h2>
          </div>
          {loading ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-[var(--border)]">
              <CircleNotch size={18} className="animate-spin text-[var(--accent)]" />
            </div>
          ) : claimableFees.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center font-mono text-xs text-[var(--text-2)]">
              No claimable fees yet. Launch a token to start earning.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {claimableFees.map((f) => {
                const isClaimed = claimed.includes(f.tokenAddress);
                const isClaiming = claiming === f.tokenAddress;
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
                        onClick={() => handleClaim(f.tokenAddress)}
                        disabled={isClaimed || isClaiming}
                        className="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 font-mono text-xs font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                      >
                        {isClaiming && <CircleNotch size={12} className="animate-spin" />}
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
          {loading ? (
            <div className="mt-4 flex h-24 items-center justify-center rounded-lg border border-[var(--border)]">
              <CircleNotch size={18} className="animate-spin text-[var(--accent)]" />
            </div>
          ) : myHoldings.length === 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center font-mono text-xs text-[var(--text-2)]">
              No holdings yet. Explore the Discover page.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
              {myHoldings.map((h, i) => (
                <Link
                  key={h.tokenAddress}
                  href={`/tokens/${h.tokenAddress}`}
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
                      <p className="font-mono text-xs text-[var(--text-2)]">Value</p>
                      <p className="font-mono text-sm font-semibold text-[var(--text)]">
                        {formatUsdc(h.valueUsdc)}
                      </p>
                    </div>
                    <ArrowUpRight size={15} className="text-[var(--text-2)]" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
