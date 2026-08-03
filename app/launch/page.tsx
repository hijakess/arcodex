"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import BondingBadge from "@/components/BondingBadge";
import { BONDING_TYPES, CHAIN, formatUsdc } from "@/lib/mockData";
import { BondingType } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { useWallet } from "@/lib/wallet";
import {
  launchToken,
  publicClient,
  walletClient,
  ARCODEX_BONDING,
  USDC,
  ERC20_ABI,
  BONDING_ABI,
  LAUNCH_FEE_BPS,
  LAUNCH_CREATOR_SHARE_BPS,
  LAUNCH_PLATFORM_SHARE_BPS,
  LAUNCH_HOLDER_SHARE_BPS,
  type Address,
} from "@/lib/swap";
import { parseUnits, parseAbi, decodeEventLog } from "viem";
import { CircleNotch, ArrowUpRight, Coins } from "@phosphor-icons/react";

const LAUNCH_EVENT_ABI = parseAbi([
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, uint256 supply, uint256 startingPrice, uint8 bondingType)",
]);

type LaunchStatus = "idle" | "signing" | "launching" | "buying" | "success" | "error";

export default function LaunchPage() {
  const { user, account, connect, hasPrivy, isWrongChain, switchToArc, error: walletError } = useAuth();
  const { provider } = useWallet();

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
  const [supply, setSupply] = useState("1000000000"); // 1B default
  const [startingPrice, setStartingPrice] = useState("0.000002"); // ~$200 → 0.00000200 USDC
  const [graduationUsdc, setGraduationUsdc] = useState("3500"); // graduate at $3,500 liquidity
  const [whitelist, setWhitelist] = useState("");

  const [launchStatus, setLaunchStatus] = useState<LaunchStatus>("idle");
  const [launchError, setLaunchError] = useState("");
  const [lastTx, setLastTx] = useState("");
  const [launchedToken, setLaunchedToken] = useState("");

  const whitelistCount = whitelist
    .split(/[\n,]+/)
    .map((a) => a.trim())
    .filter((a) => a.length > 0).length;

  const feePct = Number(LAUNCH_FEE_BPS) / 100;
  const creatorPct = (Number(LAUNCH_FEE_BPS) * Number(LAUNCH_CREATOR_SHARE_BPS)) / 10000;
  const platformPct = (Number(LAUNCH_FEE_BPS) * Number(LAUNCH_PLATFORM_SHARE_BPS)) / 10000;
  const holderPct = (Number(LAUNCH_FEE_BPS) * Number(LAUNCH_HOLDER_SHARE_BPS)) / 10000;

  // Live curve preview — mirrors the on-chain math:
  //   price = p0 × (1 + 3·s/T)  →  USDC collected at T = 2.5 × p0 × T
  const supplyTokens = Math.max(0, Number(supply) || 0);
  const p0Usdc = Math.max(0, Number(startingPrice) || 0);
  const targetUsdc = Math.max(0, Number(graduationUsdc) || 0);
  const maxCollectedUsdc = 2.5 * p0Usdc * supplyTokens;
  const thresholdTokens = p0Usdc > 0 ? Math.min(supplyTokens, targetUsdc / (2.5 * p0Usdc)) : 0;
  const pctSold = supplyTokens > 0 ? (thresholdTokens / supplyTokens) * 100 : 0;
  const finalPriceUsdc = 4 * p0Usdc;
  const targetReachable = maxCollectedUsdc >= targetUsdc;

  function parseWhitelist(): Address[] {
    return whitelist
      .split(/[\n,]+/)
      .map((a) => a.trim())
      .filter((a) => /^0x[a-fA-F0-9]{40}$/.test(a)) as Address[];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLaunchError("");

    if (!name.trim() || !symbol.trim()) {
      setLaunchError("Name and symbol are required.");
      setLaunchStatus("error");
      return;
    }
    // Gate 1: wallet connected
    if (!account) {
      await connect();
      return;
    }
    // Gate 2: on Arc (auto-adds the chain)
    if (isWrongChain) {
      const ok = await switchToArc();
      if (!ok) return;
    }
    if (!provider) {
      setLaunchError("No wallet detected. Install MetaMask / Rabby to continue.");
      setLaunchStatus("error");
      return;
    }

    try {
      setLaunchStatus("signing");

      const supplyNum = parseUnits(supply || "1000000000", 18);
      const priceNum = parseUnits(startingPrice || "0.000002", 6);
      if (priceNum <= 0n) {
        setLaunchError("Starting price must be greater than 0 — the on-chain curve requires it.");
        setLaunchStatus("error");
        return;
      }
      // Graduate at a USDC-liquidity target. Contract curve:
      //   price = p0 × (1 + 3·s/T)  →  USDC collected at full threshold = 2.5 × p0 × T
      // so the token threshold for a USDC target is  T = target × 1e19 / (25 × p0)
      // (target in 6-dec USDC units, p0 in 6-dec USDC units).
      const targetUsdc6 = BigInt(Math.max(0, Math.round((Number(graduationUsdc) || 0) * 1e6)));
      if (targetUsdc6 <= 0n) {
        setLaunchError("Graduation liquidity must be greater than 0 USDC.");
        setLaunchStatus("error");
        return;
      }
      let threshold = (targetUsdc6 * 10n ** 19n) / (25n * priceNum);
      if (threshold > supplyNum) {
        threshold = supplyNum; // target unreachable at this price — curve sells to 100%
      }
      const whitelistArr = parseWhitelist();
      const feeWallet: Address =
        (creatorWallet.trim() as Address) && /^0x[a-fA-F0-9]{40}$/.test(creatorWallet.trim())
          ? (creatorWallet.trim() as Address)
          : (account as Address);

      if (bonding === "early-buy" && whitelistArr.length === 0) {
        setLaunchError("Early Buy requires at least one valid whitelist address (0x...).");
        setLaunchStatus("error");
        return;
      }

      // 1) Launch the token
      setLaunchStatus("launching");
      const { txHash } = await launchToken(provider, account as Address, {
        name: name.trim(),
        symbol: symbol.trim(),
        description: description.trim(),
        website: website.trim(),
        twitter: twitter.trim().replace(/^@/, ""),
        telegram: telegram.trim().replace(/^@/, ""),
        discord: discord.trim(),
        supply: supplyNum,
        startingPrice: priceNum,
        graduationThreshold: threshold,
        creatorFeeWallet: feeWallet,
        bondingType: bonding === "early-buy" ? 1 : 0,
        whitelist: whitelistArr,
      });
      setLastTx(txHash);

      // Decode the launched token address from the event
      let tokenAddr: Address | undefined;
      try {
        const receipt = await publicClient().waitForTransactionReceipt({ hash: txHash });
        const log = receipt.logs.find(
          (l) => l.address.toLowerCase() === ARCODEX_BONDING.toLowerCase()
        );
        if (log) {
          const decoded = decodeEventLog({
            abi: LAUNCH_EVENT_ABI,
            data: log.data,
            topics: log.topics,
          });
          tokenAddr = (decoded.args as { token: Address }).token;
        }
      } catch {
        /* event decode failed — token still launched */
      }
      if (tokenAddr) setLaunchedToken(tokenAddr);

      // 2) Optional initial buy to seed the curve
      const buyAmt = Number(initialBuy);
      if (tokenAddr && buyAmt > 0) {
        setLaunchStatus("buying");
        const client = walletClient(provider);
        const amountIn = parseUnits(String(buyAmt), 6);
        // approve USDC -> curve
        const { request: appReq } = await publicClient().simulateContract({
          address: USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ARCODEX_BONDING, 2n ** 256n - 1n],
          account: account as Address,
        });
        await client.writeContract(appReq);
        // buy
        const { request: buyReq } = await publicClient().simulateContract({
          address: ARCODEX_BONDING,
          abi: BONDING_ABI,
          functionName: "buy",
          args: [tokenAddr, amountIn],
          account: account as Address,
        });
        await client.writeContract(buyReq);
      }

      setLaunchStatus("success");
    } catch (err: any) {
      setLaunchError(err?.shortMessage || err?.message || "Launch failed.");
      setLaunchStatus("error");
    }
  }

  if (launchStatus === "success") {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--pos)]/40 bg-[var(--pos)]/10">
            <span className="font-mono text-2xl text-[var(--pos)]">✓</span>
          </div>
          <h1 className="mt-6 font-mono text-2xl font-semibold">Token launched!</h1>
          <p className="mt-3 font-mono text-xs leading-relaxed text-[var(--text-2)]">
            <span className="font-semibold text-[var(--text)]">{symbol || "Your token"}</span> is live
            on {CHAIN.name} with a{" "}
            <span className="text-[var(--text)]">
              {bonding === "early-buy" ? "Early Buy" : "Standard"}
            </span>{" "}
            bonding curve. Every trade earns{" "}
            <span className="text-[var(--accent)]">{feePct.toFixed(1)}%</span> fees —{" "}
            {creatorPct.toFixed(1)}% creator · {platformPct.toFixed(1)}% platform ·{" "}
            {holderPct.toFixed(1)}% holder dividends.
          </p>

          {lastTx && (
            <a
              href={`https://arcscan.app/tx/${lastTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-xs text-[var(--accent)] transition hover:border-[var(--accent)]/50"
            >
              View launch transaction <ArrowUpRight size={13} />
            </a>
          )}
          {launchedToken && (
            <div className="mt-4 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                Token address
              </p>
              <p className="mt-1 break-all font-mono text-[11px] text-[var(--text)]">{launchedToken}</p>
              <Link
                href={`/tokens/${launchedToken}`}
                className="mt-2 inline-block font-mono text-[11px] text-[var(--accent)] transition hover:underline"
              >
                Open token page →
              </Link>
            </div>
          )}

          <button
            onClick={() => {
              setLaunchStatus("idle");
              setName("");
              setSymbol("");
              setLastTx("");
              setLaunchedToken("");
            }}
            className="mt-8 rounded-md border border-[var(--border)] px-5 py-2 font-mono text-xs text-[var(--text-2)] transition hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
          >
            Launch another
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
          <span className="text-[var(--accent)]">{CHAIN.nativeSymbol}</span>. Deploy fees are paid
          in native USDC.
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

          {/* Early buy whitelist */}
          {bonding === "early-buy" && (
            <div className="rounded-lg border border-[var(--accent)]/40 bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-[var(--accent)]">
                    Whitelist addresses
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--text-2)]/80">
                    Only these wallets can buy during the Early Buy phase. One
                    address per line (or comma-separated).
                  </p>
                </div>
                {whitelistCount > 0 && (
                  <span className="shrink-0 rounded-full border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-2.5 py-1 font-mono text-[11px] text-[var(--accent)]">
                    {whitelistCount} {whitelistCount === 1 ? "address" : "addresses"}
                  </span>
                )}
              </div>
              <textarea
                value={whitelist}
                onChange={(e) => setWhitelist(e.target.value)}
                rows={4}
                placeholder={"0x1234...abcd\n0x5678...ef01\n0x9abc...def2"}
                className="mt-4 w-full resize-y rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-2)]/40 focus:border-[var(--accent)]/60 focus:outline-none"
              />
              {whitelistCount === 0 && (
                <p className="mt-2 font-mono text-[10px] text-amber-300/80">
                  At least one valid 0x address is required for Early Buy.
                </p>
              )}
            </div>
          )}

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

          {/* Curve parameters */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
              Bonding curve parameters
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-2)]/80">
              Linear curve: price starts at the starting price and rises 4× as the
              curve bonds. When collected liquidity hits the graduation target, the
              curve graduates and the pool locks on the Arcodex DEX.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Supply (tokens)
                </span>
                <input
                  value={supply}
                  onChange={(e) => setSupply(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] focus:border-[var(--accent)]/60 focus:outline-none"
                />
                <p className="mt-1.5 font-mono text-[10px] text-[var(--text-2)]/70">
                  Default 1,000,000,000 (1B)
                </p>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Starting price (USDC)
                </span>
                <input
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  inputMode="decimal"
                  min="0"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] focus:border-[var(--accent)]/60 focus:outline-none"
                />
                <p className="mt-1.5 font-mono text-[10px] text-[var(--text-2)]/70">
                  Min 0 — on-chain curve requires &gt; 0. Rises to 4× at graduation.
                </p>
              </label>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Graduation at (USDC liquidity)
                </span>
                <input
                  value={graduationUsdc}
                  onChange={(e) => setGraduationUsdc(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] focus:border-[var(--accent)]/60 focus:outline-none"
                />
                <p className="mt-1.5 font-mono text-[10px] text-[var(--text-2)]/70">
                  Pool locks on the Arcodex DEX at this amount.
                </p>
              </label>
            </div>

            {/* Live curve preview */}
            <div className="mt-4 grid gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 sm:grid-cols-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Launch mcap
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--text)]">
                  {formatUsdc(supplyTokens * p0Usdc)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Sold at graduation
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--text)]">
                  {pctSold >= 99.99 ? "100%" : pctSold.toFixed(1) + "%"}
                  <span className="ml-1 font-mono text-[10px] font-normal text-[var(--text-2)]/70">
                    ({Math.round(thresholdTokens).toLocaleString()} tokens)
                  </span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Final price
                </p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[var(--text)]">
                  {formatUsdc(finalPriceUsdc, 8)}
                </p>
              </div>
              {p0Usdc > 0 && !targetReachable && (
                <p className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-[10px] text-amber-300 sm:col-span-3">
                  ⚠️ Graduation target ${targetUsdc.toLocaleString()} exceeds the max
                  the curve can collect at this starting price (
                  ${maxCollectedUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} at full
                  sale) — it will graduate at 100% sold instead. Raise the starting price
                  or lower the target.
                </p>
              )}
              {p0Usdc === 0 && (
                <p className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-[10px] text-amber-300 sm:col-span-3">
                  ⚠️ Starting price 0 makes the curve collect no USDC — it can never
                  graduate. The on-chain curve requires a price above 0.
                </p>
              )}
            </div>
          </div>

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
                  placeholder={account ? account : "0x..."}
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
                  {feePct.toFixed(2)}%
                </p>
                <p className="mt-1 font-mono text-[10px] leading-relaxed text-[var(--text-2)]/80">
                  {creatorPct.toFixed(1)}% creator · {platformPct.toFixed(1)}% platform ·{" "}
                  {holderPct.toFixed(1)}% holder dividends
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
                  Initial buy (USDC, optional)
                </span>
                <input
                  value={initialBuy}
                  onChange={(e) => setInitialBuy(e.target.value)}
                  inputMode="decimal"
                  placeholder="e.g. 50"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
                />
                <p className="mt-1.5 font-mono text-[10px] text-[var(--text-2)]/70">
                  Seeds the curve so trading starts immediately.
                </p>
              </label>
            </div>
          </div>

          {!user && (
            <p className="rounded-md border border-amber-300/30 bg-amber-400/5 px-4 py-3 font-mono text-xs text-amber-200/90">
              Connect a wallet (MetaMask / Rabby) to deploy your token on Arc.
            </p>
          )}
          {account && isWrongChain && (
            <p className="rounded-md border border-amber-300/30 bg-amber-400/5 px-4 py-3 font-mono text-xs text-amber-200/90">
              Wrong network — Arcodex runs on Arc (chain 5042).{" "}
              <button type="button" onClick={() => switchToArc()} className="underline">
                Switch to Arc
              </button>
            </p>
          )}
          {launchStatus === "error" && (
            <p className="rounded-md border border-[var(--neg)]/40 bg-[var(--neg)]/10 px-4 py-3 font-mono text-xs text-[var(--neg)]">
              {launchError}
            </p>
          )}
          {walletError && launchStatus === "idle" && (
            <p className="rounded-md border border-[var(--neg)]/40 bg-[var(--neg)]/10 px-4 py-3 font-mono text-xs text-[var(--neg)]">
              {walletError}
            </p>
          )}

          <button
            type="submit"
            disabled={
              !user ||
              isWrongChain ||
              launchStatus === "signing" ||
              launchStatus === "launching" ||
              launchStatus === "buying"
            }
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] py-3 font-mono text-sm font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {(launchStatus === "signing" || launchStatus === "launching" || launchStatus === "buying") && (
              <CircleNotch size={15} className="animate-spin" />
            )}
            {launchStatus === "signing"
              ? "Waiting for signature…"
              : launchStatus === "launching"
                ? "Deploying token…"
                : launchStatus === "buying"
                  ? "Seeding curve…"
                  : !user
                    ? "Connect wallet to launch"
                    : isWrongChain
                      ? "Switch to Arc first"
                      : `Launch ${symbol || "token"}`}
          </button>

          {user && (
            <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-[var(--text-2)]/70">
              <Coins size={11} className="text-[var(--accent)]" />
              Holders earn {holderPct.toFixed(1)}% of every trade as USDC dividends — claim anytime.
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
