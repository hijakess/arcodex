"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import TradingViewChart, { Candle, candlesToMcap } from "@/components/TradingViewChart";
import CopyButton from "@/components/CopyButton";
import { ArcToken } from "@/lib/arcTokens";
import {
  fetchRadarToken,
  fetchRadarChart,
  fetchRadarSwaps,
  CHART_TFS,
  RadarSwap,
} from "@/lib/radar";
import { formatUsdc, formatNum, timeAgo, shortAddr } from "@/lib/mockData";
import { useAuth } from "@/lib/useAuth";
import { useWallet, ARC_CHAIN_ID } from "@/lib/wallet";
import {
  executeSwap,
  approveToken,
  quoteSwap,
  publicClient,
  ARCODEX_FEE_ROUTER,
  SWAP_ROUTER,
  USDC,
  ERC20_ABI,
  FEE_BPS,
  CREATOR_SHARE_BPS,
  PLATFORM_SHARE_BPS,
  type Address,
} from "@/lib/swap";
import {
  XLogo,
  Globe,
  TelegramLogo,
  DiscordLogo,
  ArrowsLeftRight,
  ArrowDown,
  CircleNotch,
  ArrowUpRight,
  ArrowDownRight,
} from "@phosphor-icons/react";

type Tf = keyof typeof CHART_TFS;

export default function TokenDetailPage() {
  const params = useParams<{ address: string }>();
  const [token, setToken] = useState<ArcToken | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [tf, setTf] = useState<Tf>("1D");
  const [chartCandles, setChartCandles] = useState<Candle[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [swaps, setSwaps] = useState<RadarSwap[]>([]);
  const [swapStatus, setSwapStatus] = useState<
    "idle" | "quoting" | "approving" | "swapping" | "success" | "error"
  >("idle");
  const [swapError, setSwapError] = useState("");
  const [lastTx, setLastTx] = useState("");
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);

  // Real wallet (EIP-1193 injected provider)
  const {
    account,
    chainId,
    connect,
    connecting,
    isWrongChain,
    switchToArc,
    addArcChain,
    error: walletError,
  } = useAuth();
  const { provider } = useWallet();

  // Fetch real USDC + token balances for the connected account
  useEffect(() => {
    if (!account || !token) {
      setUsdcBalance(null);
      setTokenBalance(null);
      return;
    }
    let cancelled = false;
    const client = publicClient();
    (async () => {
      try {
        const [usdc, tok] = await Promise.all([
          client.readContract({
            address: USDC,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [account as Address],
          }),
          client.readContract({
            address: token.address as Address,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [account as Address],
          }),
        ]);
        if (!cancelled) {
          setUsdcBalance(BigInt(usdc as bigint));
          setTokenBalance(BigInt(tok as bigint));
        }
      } catch {
        /* RPC hiccup — leave balances unknown */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, token]);

  // Pool fee tier for this token (RadarDex V3 pools commonly use 1% = 10000)
  const poolFee = 10000;

  // Try swap via injected wallet -> ArcodexFeeRouter (1.5%)
  async function handleSwap() {
    if (!token) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setSwapError("Enter an amount first.");
      setSwapStatus("error");
      return;
    }
    // Gate 1: wallet must be connected
    if (!account) {
      await connect();
      return;
    }
    // Gate 2: wallet must be on Arc (auto-adds the chain if missing)
    if (isWrongChain) {
      const ok = await switchToArc();
      if (!ok) return;
    }
    if (!provider) {
      setSwapError("No wallet detected. Install MetaMask / Rabby to continue.");
      setSwapStatus("error");
      return;
    }
    try {
      setSwapStatus("quoting");
      setSwapError("");
      const tokenAddr = token.address as Address;

      const isBuy = mode === "buy";
      const tokenIn = isBuy ? USDC : tokenAddr;
      const tokenOut = isBuy ? tokenAddr : USDC;
      const amountIn = isBuy
        ? BigInt(Math.round(amt * 1e6)) // USDC 6 decimals
        : BigInt(Math.round(amt * 1e18)); // token 18 decimals

      // 1.5% fee -> minOut = quote * (1 - 1.5% - slippage 2%)
      setSwapStatus("quoting");
      const quote = await quoteSwap(tokenIn, tokenOut, amountIn, poolFee);
      const minOut = (quote * 9650n) / 10000n; // 3.5% total buffer

      // approve only the input token
      setSwapStatus("approving");
      await approveToken(provider, account as Address, tokenIn);

      setSwapStatus("swapping");
      const { txHash } = await executeSwap(provider, account as Address, tokenIn, tokenOut, poolFee, amountIn, minOut);
      setLastTx(txHash);
      setSwapStatus("success");
    } catch (e: any) {
      setSwapError(e?.shortMessage || e?.message || "Swap failed.");
      setSwapStatus("error");
    }
  }

  // Load token from the live feed (no mock fallback)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setToken(undefined);
    fetchRadarToken(params.address)
      .then((t) => {
        if (cancelled) return;
        if (t) setToken(t);
        else setNotFound(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.address]);

  // Load real candlesticks for the active timeframe
  const loadChart = useCallback(
    (address: string, t: Tf) => {
      setChartLoading(true);
      const { tf: candleTf, limit } = CHART_TFS[t];
      fetchRadarChart(address, candleTf, limit)
        .then((cs) => {
          if (!cs || cs.length === 0) return;
          setChartCandles(cs.map((c) => ({ time: c.time, value: c.close })));
        })
        .catch(() => {})
        .finally(() => setChartLoading(false));
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    loadChart(token.address, tf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tf]);

  // Load recent swaps
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetchRadarSwaps(token.address, 25).then((s) => {
      if (!cancelled && Array.isArray(s)) setSwaps(s);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const chartData: Candle[] = chartCandles;

  // Real supply: mcap / price, so mcap chart ends exactly at displayed mcap
  const supply = token && token.priceUsdc > 0 ? token.mcapUsdc / token.priceUsdc : 1_000_000;
  const mcapData = useMemo(
    () => candlesToMcap(chartData, supply || 1_000_000),
    [chartData, supply]
  );

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
          <CircleNotch size={28} className="animate-spin text-[var(--accent)]" />
          <p className="mt-4 font-mono text-sm text-[var(--text-2)]">
            Loading token from live feed…
          </p>
        </section>
      </main>
    );
  }

  if (!token || notFound) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
          <h1 className="font-mono text-2xl">Token not found</h1>
          <Link href="/tokens" className="mt-4 inline-block font-mono text-sm text-[var(--accent)]">
            Back to Tokens
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
        <Link href="/tokens" className="font-mono text-xs text-[var(--text-2)] transition hover:text-[var(--text)]">
          ← Back to Tokens
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Left: chart + info */}
          <div>
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border)]">
                <Image src={token.image} alt={token.name} width={64} height={64} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-2xl font-semibold tracking-tight">{token.symbol}</h1>
                  <span className="rounded border border-[var(--border)] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-2)]">
                    {token.launchpad}
                  </span>
                  <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${up ? "border-[var(--pos)]/40 bg-[var(--pos)]/10 text-[var(--pos)]" : "border-[var(--neg)]/40 bg-[var(--neg)]/10 text-[var(--neg)]"}`}>
                    {up ? "+" : ""}
                    {token.change24h.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-[var(--text-2)]">{token.name}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-2xl font-semibold text-[var(--text)]">
                    {formatUsdc(token.priceUsdc, 4)}
                  </p>
                  <p className="font-mono text-[11px] text-[var(--text-2)]">
                    {token.symbol}/USDC · 24h volume {formatUsdc(token.volume24h)}
                    {chartLoading && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[var(--accent)]">
                        <CircleNotch size={10} className="animate-spin" />
                        live
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 self-start rounded-md border border-[var(--border)] p-0.5 sm:self-auto">
                  {(Object.keys(CHART_TFS) as Tf[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTf(t)}
                      className={`rounded px-2.5 py-1 font-mono text-[10px] transition ${
                        tf === t
                          ? "bg-[var(--accent)] font-semibold text-[#05070b]"
                          : "text-[var(--text-2)] hover:text-[var(--text)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex h-64 w-full flex-col sm:h-80">
                {chartData.length > 0 ? (
                  <TradingViewChart
                    priceData={chartData}
                    mcapData={mcapData}
                    accent={up ? "#22d3ee" : "#fb7185"}
                    showMetricToggle
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-[var(--border)] font-mono text-[11px] text-[var(--text-2)]">
                    {chartLoading ? "loading chart…" : "no chart data available"}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Market cap" value={formatUsdc(token.mcapUsdc)} />
              <Stat label="Liquidity" value={formatUsdc(token.liquidityUsdc)} />
              <Stat label="Traders 24h" value={formatNum(token.holders)} />
              <Stat label="Volume 24h" value={formatUsdc(token.volume24h)} />
            </div>

            {/* Token details: socials, contract, pool */}
            <div className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
                Token details
              </p>

              {/* Socials */}
              <div className="mt-4 flex flex-wrap gap-2">
                {token.website && (
                  <a
                    href={token.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <Globe size={14} className="text-[var(--accent)]" />
                    Website
                  </a>
                )}
                {token.twitter && (
                  <a
                    href={`https://x.com/${token.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <XLogo size={14} className="text-[var(--accent)]" />
                    @{token.twitter}
                  </a>
                )}
                {token.telegram && (
                  <a
                    href={`https://t.me/${token.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <TelegramLogo size={14} className="text-[var(--accent)]" />
                    Telegram
                  </a>
                )}
                {token.discord && (
                  <a
                    href={`https://discord.gg/${token.discord}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-white/[0.04] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50"
                  >
                    <DiscordLogo size={14} className="text-[var(--accent)]" />
                    Discord
                  </a>
                )}
              </div>

              {/* Contract address */}
              <div className="mt-4">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Contract address
                </p>
                <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-[var(--text)]">
                    {token.fullAddress}
                  </code>
                  <CopyButton text={token.fullAddress} />
                </div>
              </div>

              {/* Pool address */}
              <div className="mt-4">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  Pool address
                </p>
                <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <code className="flex-1 truncate font-mono text-xs text-[var(--text)]">
                    {token.poolAddress}
                  </code>
                  <CopyButton text={token.poolAddress} />
                </div>
              </div>

              <p className="mt-4 font-mono text-[10px] text-[var(--text-2)]/60">
                Launchpad: {token.launchpad} · Listed on Arcodex with native USDC liquidity.
              </p>
            </div>
          </div>

          {/* Right: swap panel */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 border-b border-[var(--border)] pb-3">
                <ArrowsLeftRight size={15} className="text-[var(--accent)]" />
                <p className="font-mono text-sm font-semibold">Swap</p>
              </div>

              <div className="mt-4 flex rounded-md border border-[var(--border)] p-1">
                <button
                  onClick={() => setMode("buy")}
                  className={`flex-1 rounded py-2 font-mono text-xs font-semibold transition ${mode === "buy" ? "bg-[var(--pos)] text-[#05070b]" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setMode("sell")}
                  className={`flex-1 rounded py-2 font-mono text-xs font-semibold transition ${mode === "sell" ? "bg-[var(--neg)] text-white" : "text-[var(--text-2)] hover:text-[var(--text)]"}`}
                >
                  Sell
                </button>
              </div>

              {/* You pay */}
              <div className="mt-4 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-2)]">
                  <span>{mode === "buy" ? "You pay" : "You sell"}</span>
                  <span className="flex items-center gap-1.5">
                    {account ? (
                      <>
                        Balance:{" "}
                        {mode === "buy"
                          ? usdcBalance !== null
                            ? formatUsdc(Number(usdcBalance) / 1e6)
                            : "—"
                          : tokenBalance !== null
                            ? Number(tokenBalance) / 1e18 < 1000
                              ? Number(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })
                              : Number(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })
                            : "—"}
                        <button
                          onClick={() => {
                            if (mode === "buy" && usdcBalance !== null) {
                              setAmount((Number(usdcBalance) / 1e6).toFixed(4));
                            } else if (mode === "sell" && tokenBalance !== null) {
                              setAmount((Number(tokenBalance) / 1e18).toFixed(4));
                            }
                          }}
                          disabled={usdcBalance === null && tokenBalance === null}
                          className="rounded border border-[var(--accent)]/40 px-1.5 py-0.5 font-mono text-[9px] font-bold text-[var(--accent)] transition hover:bg-[var(--accent)]/10 disabled:opacity-40"
                        >
                          MAX
                        </button>
                      </>
                    ) : (
                      "not connected"
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-transparent font-mono text-xl text-[var(--text)] placeholder:text-[var(--text-2)]/40 focus:outline-none"
                  />
                  <span className="shrink-0 rounded border border-[var(--border)] bg-white/[0.04] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--text)]">
                    USDC
                  </span>
                </div>
              </div>

              {/* Swap icon */}
              <div className="flex justify-center py-1">
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] transition hover:border-[var(--accent)]/60 active:scale-95">
                  <ArrowDown size={13} />
                </button>
              </div>

              {/* You receive */}
              <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-3">
                <div className="flex items-center justify-between font-mono text-[10px] text-[var(--text-2)]">
                  <span>You receive</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-xl text-[var(--text)]">
                    {amount ? (Number(amount) / token.priceUsdc).toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0.00"}
                  </span>
                  <span className="shrink-0 rounded border border-[var(--border)] bg-white/[0.04] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--text)]">
                    {token.symbol}
                  </span>
                </div>
              </div>

              {/* Rate info */}
              <div className="mt-3 space-y-1.5 font-mono text-[11px] text-[var(--text-2)]">
                <div className="flex justify-between">
                  <span>Rate</span>
                  <span className="text-[var(--text)]">1 {token.symbol} = {formatUsdc(token.priceUsdc, 5)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee (1.5%)</span>
                  <span className="text-[var(--text)]">100% platform</span>
                </div>
                <div className="flex justify-between">
                  <span>Liquidity</span>
                  <span className="text-[var(--text)]">{formatUsdc(token.liquidityUsdc)}</span>
                </div>
              </div>

              {account && isWrongChain && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2">
                  <p className="font-mono text-[10px] text-amber-300">
                    Wallet is on chain {chainId}. Arcodex runs on Arc (5042).
                  </p>
                  <button
                    onClick={async () => {
                      await switchToArc();
                    }}
                    className="shrink-0 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-1 font-mono text-[10px] font-semibold text-amber-300 transition hover:border-amber-400"
                  >
                    Switch to Arc
                  </button>
                </div>
              )}
              {walletError && !isWrongChain && (
                <p className="mt-3 rounded-md border border-[var(--neg)]/40 bg-[var(--neg)]/10 px-3 py-2 font-mono text-[11px] text-[var(--neg)]">
                  {walletError}
                </p>
              )}
              {swapStatus === "error" && (
                <p className="mt-3 rounded-md border border-[var(--neg)]/40 bg-[var(--neg)]/10 px-3 py-2 font-mono text-[11px] text-[var(--neg)]">
                  {swapError}
                </p>
              )}
              {swapStatus === "success" && (
                <div className="mt-3 rounded-md border border-[var(--pos)]/40 bg-[var(--pos)]/10 px-3 py-2 font-mono text-[11px] text-[var(--pos)]">
                  Swap sent!{" "}
                  <a
                    href={`https://arc.blockscout.com/tx/${lastTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    view tx
                  </a>
                </div>
              )}

              <button
                onClick={handleSwap}
                disabled={connecting || swapStatus === "quoting" || swapStatus === "approving" || swapStatus === "swapping"}
                className={`mt-5 w-full rounded-md py-3 font-mono text-sm font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                  !account || isWrongChain
                    ? "bg-[var(--accent)] text-[#05070b] hover:brightness-110"
                    : mode === "buy"
                      ? "bg-[var(--pos)] text-[#05070b] hover:brightness-110"
                      : "bg-[var(--neg)] text-white hover:brightness-110"
                }`}
              >
                {connecting
                  ? "Connecting…"
                  : swapStatus === "quoting"
                    ? "Quoting…"
                    : swapStatus === "approving"
                      ? "Approving…"
                      : swapStatus === "swapping"
                        ? "Swapping…"
                        : !account
                          ? "Connect Wallet"
                          : isWrongChain
                            ? "Switch to Arc"
                            : mode === "buy"
                              ? `Buy ${token.symbol}`
                              : `Sell ${token.symbol}`}
              </button>

              <p className="mt-3 text-center font-mono text-[10px] text-[var(--text-2)]/60">
                Powered by Arcodex · Native USDC on Arc
              </p>
            </div>
          </div>
        </div>

        {/* Recent trades */}
        <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-2)]">
                Recent trades
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-[var(--text-2)]/70">
                Live from the RadarDex feed · {swaps.length} latest swaps
              </p>
            </div>
            <a
              href={`https://arc.blockscout.com/token/${token.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-[var(--accent)] transition hover:underline"
            >
              View on explorer →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                  <th className="px-5 py-2.5 font-medium">Side</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount (USDC)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Price</th>
                  <th className="px-4 py-2.5 font-medium">Trader</th>
                  <th className="px-4 py-2.5 text-right font-medium">Time</th>
                  <th className="px-5 py-2.5 text-right font-medium">TX</th>
                </tr>
              </thead>
              <tbody>
                {swaps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-2)]">
                      No recent swaps yet.
                    </td>
                  </tr>
                )}
                {swaps.map((s, i) => {
                  const buy = s.side === "buy";
                  return (
                    <tr
                      key={`${s.txHash}-${i}`}
                      className={`${i > 0 ? "border-t border-[var(--border)]" : ""} transition hover:bg-white/[0.03]`}
                    >
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${
                            buy
                              ? "bg-[var(--pos)]/10 text-[var(--pos)]"
                              : "bg-[var(--neg)]/10 text-[var(--neg)]"
                          }`}
                        >
                          {buy ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {buy ? "BUY" : "SELL"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text)]">
                        {formatUsdc(s.usdc)}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text)]">
                        {formatUsdc(s.price, 6)}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`https://arc.blockscout.com/address/${s.trader}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--text-2)] transition hover:text-[var(--accent)]"
                        >
                          {shortAddr(s.trader)}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--text-2)]">
                        {timeAgo(s.time * 1000)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={`https://arc.blockscout.com/tx/${s.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent)] transition hover:underline"
                        >
                          view <ArrowUpRight size={11} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[var(--text)]">{value}</p>
    </div>
  );
}
