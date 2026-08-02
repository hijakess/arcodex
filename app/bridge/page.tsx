"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { CHAIN } from "@/lib/mockData";
import { ArrowsDownUp, CaretDown } from "@phosphor-icons/react";

const CHAINS = ["Arc", "Ethereum", "Base", "Arbitrum", "Solana"];
const ASSETS = [
  { sym: "USDC", name: "USD Coin", img: "circle" },
  { sym: "USDT", name: "Tether", img: "circle" },
  { sym: "ETH", name: "Ether", img: "circle" },
];

export default function BridgePage() {
  const [fromChain, setFromChain] = useState("Ethereum");
  const [toChain, setToChain] = useState("Arc");
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">Bridge</h1>
        <p className="mt-2 font-mono text-xs text-[var(--text-2)]">
          Move USDC and assets to {CHAIN.name}. Native gas on Arc is USDC, so
          bridging is fee-free at the protocol level.
        </p>

        <div className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
          {/* From */}
          <label className="block">
            <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
              From
            </span>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <button
                  onClick={() => setFromOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] transition hover:border-[var(--accent)]/50"
                >
                  {fromChain}
                  <CaretDown size={12} className="text-[var(--text-2)]" />
                </button>
                {fromOpen && (
                  <div className="absolute left-0 top-11 z-30 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl shadow-black/50">
                    {CHAINS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setFromChain(c);
                          setFromOpen(false);
                        }}
                        className={`block w-full px-3.5 py-2 text-left font-mono text-xs transition hover:bg-white/5 ${
                          fromChain === c ? "text-[var(--accent)]" : "text-[var(--text)]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="flex-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/50 focus:border-[var(--accent)]/60 focus:outline-none"
              />
            </div>
          </label>

          {/* Swap direction */}
          <div className="my-4 flex justify-center">
            <button
              onClick={() => {
                setFromChain(toChain);
                setToChain(fromChain);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] transition hover:border-[var(--accent)]/60 active:scale-95"
              aria-label="Swap direction"
            >
              <ArrowsDownUp size={16} />
            </button>
          </div>

          {/* To */}
          <label className="block">
            <span className="mb-1.5 block font-mono text-xs text-[var(--text-2)]">
              To
            </span>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <button
                  onClick={() => setToOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] transition hover:border-[var(--accent)]/50"
                >
                  {toChain}
                  <CaretDown size={12} className="text-[var(--text-2)]" />
                </button>
                {toOpen && (
                  <div className="absolute left-0 top-11 z-30 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl shadow-black/50">
                    {CHAINS.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setToChain(c);
                          setToOpen(false);
                        }}
                        className={`block w-full px-3.5 py-2 text-left font-mono text-xs transition hover:bg-white/5 ${
                          toChain === c ? "text-[var(--accent)]" : "text-[var(--text)]"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Asset select */}
              <div className="relative w-32">
                <button
                  onClick={() => setAssetOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 font-mono text-sm text-[var(--text)] transition hover:border-[var(--accent)]/50"
                >
                  {asset}
                  <CaretDown size={12} className="text-[var(--text-2)]" />
                </button>
                {assetOpen && (
                  <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl shadow-black/50">
                    {ASSETS.map((a) => (
                      <button
                        key={a.sym}
                        onClick={() => {
                          setAsset(a.sym);
                          setAssetOpen(false);
                        }}
                        className={`block w-full px-3.5 py-2 text-left font-mono text-xs transition hover:bg-white/5 ${
                          asset === a.sym ? "text-[var(--accent)]" : "text-[var(--text)]"
                        }`}
                      >
                        {a.sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* Rate line */}
          <div className="mt-5 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3 font-mono text-[11px] text-[var(--text-2)]">
            <span>Rate</span>
            <span className="text-[var(--text)]">
              1 {asset} = 1 {asset}
            </span>
          </div>

          <button className="mt-5 w-full rounded-md bg-[var(--accent)] py-3 font-mono text-sm font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.99]">
            Bridge to {toChain}
          </button>
          <p className="mt-3 text-center font-mono text-[10px] text-[var(--text-2)]/60">
            Powered by LI.FI aggregator. Best route auto-selected.
          </p>
        </div>
      </section>
    </main>
  );
}
