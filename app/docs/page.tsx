"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

const DOCS: Record<string, { title: string; body: string }> = {
  whitepaper: {
    title: "Whitepaper",
    body: `# Arcodex Whitepaper

**Version 2.0 · Arc Chain Launchpad · Native USDC**

## Abstract

Arcodex is a memecoin launchpad built on the Arc blockchain, where **USDC is the native asset** — both the pricing currency and the gas token. Every token launches on a bonding curve with a fixed **1% trading fee** split **70% creator · 20% platform · 10% holder dividend pool**. Swapping existing Arc tokens through Arcodex's fee router costs a flat **1.5% (100% to the platform)**. Arcodex aggregates tokens launched across all launchpads on Arc into a single discoverable marketplace with built-in swap.

## 1. Problem

Launching a token today is fragmented: multiple launchpads, inconsistent fee models, unclear creator economics, and no unified view of what exists on-chain. Creators cannot easily claim fees, and traders must jump between sites.

## 2. Solution

Arcodex provides:

- **One-click token launch** with two bonding types (Standard, Early Buy)
- **Native USDC pricing** everywhere — no ETH/WETH conversions, no price confusion
- **Creator-first launch fees**: 1% split 70% creator / 20% platform / 10% holder dividends
- **Holders get paid**: 10% of every launch-token trade accrues to a USDC dividend pool, claimable pro-rata to balance (fee-reflection pattern)
- **Unified token index** across all Arc launchpads with instant swap
- **Bridge** for moving USDC onto Arc
- **Liquidity pools** for post-graduation trading

## 3. Bonding Curve

Tokens launch on a linear bonding curve: price = startingPrice * (1 + sold / graduationThreshold)

- Price rises linearly as supply is purchased
- At 100% graduation, remaining supply + curve USDC migrate to a full AMM pool
- Early buyers are rewarded with lower prices; late buyers pay more
- Curve liquidity is always backed 1:1 by USDC held in the contract

### Bonding Types

| Type | Description |
|------|-------------|
| Standard | Linear curve, open to everyone from block one. Fair launch. |
| Early Buy | Whitelisted early buyers get first access before public trading. |

## 4. Fee Model

### 4.1 Launch tokens (bonding curve + pool) — 1.00% per trade

Every buy and sell on a launch token accrues a **1% fee** in USDC, split three ways:

| Party | Share of fee | Effective rate | Goes to |
|-------|--------------|----------------|---------|
| Creator | 70% | 0.70% | Creator fee wallet, claimable anytime |
| Platform | 20% | 0.20% | Arcodex treasury |
| Holders | 10% | 0.10% | USDC dividend pool, claimable pro-rata |

**Holder dividends (fee reflection):** 10% of every trade is deposited into a per-token USDC dividend pool. Any holder can claim their pro-rata share based on token balance — hold more, earn more. Claimed dividends are paid out in USDC directly.

### 4.2 Swap existing tokens (ArcodexFeeRouter) — 1.50% per trade

Swapping tokens that already have DEX liquidity on Arc (e.g. RadarDex) through Arcodex's atomic fee router:

| Party | Share of fee | Effective rate | Goes to |
|-------|--------------|----------------|---------|
| Platform | 100% | 1.50% | Arcodex treasury |

- Fees accrue on-chain in USDC
- Creators claim from their profile; the platform claims to a treasury wallet
- No hidden fees. No gas token conversions — USDC is the native gas on Arc

## 5. Architecture

Arcodex dApp (Discover, Launch, Tokens, Bridge, Pool) → Arcodex API/Indexer → Smart Contracts (ArcodexBondingCurve, ArcodexPool, ArcodexFeeRouter, BondingCurveToken) → Arc Chain (native USDC, EVM compatible).

## 6. Token Lifecycle

1. Launch — creator deploys token with metadata (name, symbol, description, website, socials)
2. Bonding — traders buy/sell against the curve in USDC; 1% fee accrues (70/20/10)
3. Graduation — at 100% curve sold, liquidity migrates to a full AMM pool
4. Trading — post-graduation, the token trades freely on the AMM with the same 70/20/10 split
5. Claim — creator claims 0.70%; platform claims 0.20%; **holders claim 0.10% pro-rata dividends**

## 7. Security

- Non-reentrancy guards on all value-moving functions
- SafeERC20 for USDC transfers
- Ownable admin functions (treasury, graduation)
- Curve liquidity fully backed; no fractional reserves
- Creator fees claimable only by the designated fee wallet
- No arbitrary minting after launch; supply fixed at deployment

## 8. Tokenomics

| Item | Value |
|------|-------|
| Trading fee (launch tokens) | 1.00% fixed |
| Creator share | 70% of launch fee (0.70%) |
| Platform share | 20% of launch fee (0.20%) |
| Holder dividends | 10% of launch fee (0.10%) |
| Swap fee (existing tokens) | 1.50% fixed, 100% platform |
| Price currency | USDC (native) |
| Curve graduation | 100% of bonding supply |

## 9. Roadmap

- Phase 1 — Launchpad live (bonding curves, fees, claim, holder dividends)
- Phase 2 — Token index across all Arc launchpads + unified swap
- Phase 3 — Bridge (LI.FI powered) + liquidity pools
- Phase 4 — Creator analytics, X integration, governance

## 10. Disclaimer

Arcodex is a protocol for launching and trading community tokens. Tokens launched on the platform carry risk, including total loss. Nothing in this whitepaper is financial advice.`,
  },
  structure: {
    title: "Architecture",
    body: `# Arcodex Architecture

**Project structure and system design**

## Repository Layout

\`\`\`
arc-launchpad/
├── app/
│   ├── page.tsx              # Home: hero, trending, bonding types
│   ├── discover/page.tsx     # Discover: all Arcodex-launched tokens + sort
│   ├── tokens/page.tsx       # Tokens: index across ALL Arc launchpads
│   ├── tokens/[address]/     # Token detail: chart, swap, socials, contract
│   ├── token/[address]/      # Bonding token detail (Arcodex launches)
│   ├── launch/page.tsx       # Launch: create token (bonding type, socials, fee)
│   ├── bridge/page.tsx       # Bridge: USDC cross-chain (LI.FI)
│   ├── pool/page.tsx         # Pool: LP positions + all pools
│   ├── profile/page.tsx      # Profile: claim creator fees, holdings
│   ├── docs/page.tsx         # Docs hub: whitepaper, structure, contracts
│   ├── layout.tsx            # Root layout + fonts
│   ├── providers.tsx         # Wallet + auth providers
│   └── globals.css           # Design tokens (dark, cyan accent)
├── components/
│   ├── Navbar.tsx            # Top bar: Discover/Tokens/Launch/Bridge/Pool/Profile
│   ├── TokenCard.tsx         # Token grid card with bonding badge
│   ├── BondingBadge.tsx      # Standard / Early Buy badge
│   ├── SortDropdown.tsx      # Reusable sort/filter dropdown
│   ├── TradingViewChart.tsx  # TradingView lightweight-charts integration
│   ├── WalletProvider.tsx    # EIP-1193 wallet context (MetaMask/Rabby)
│   ├── CopyButton.tsx        # Copy-to-clipboard with feedback
├── lib/
│   ├── swap.ts               # Contract addresses, ABIs, swap/launch helpers
│   ├── arcTokens.ts          # Cross-launchpad token index
│   ├── radar.ts              # RadarDex price data
│   ├── types.ts              # TypeScript types
│   └── useAuth.ts            # Wallet auth hook (EIP-1193)
├── contracts/
│   ├── ArcodexBondingCurve.sol  # Bonding curve + 70/20/10 fee + dividends
│   ├── ArcodexPool.sol          # AMM pool at graduation (same fee split)
│   └── ArcodexFeeRouter.sol     # Atomic swap router (1.5% platform)
└── docs/
    ├── whitepaper.md         # Full whitepaper
    ├── structure.md          # This document
    └── contracts.md          # Smart contract spec
\`\`\`

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| Charts | TradingView lightweight-charts v5 |
| Wallet | EIP-1193 (MetaMask, Rabby) |
| Contracts | Solidity + ethers.js / viem |
| Icons | Phosphor Icons |
| Package manager | pnpm |
| Deploy | Vercel |

## Design System

- **Theme:** Dark, crypto-native. Off-black background, cyan accent (#22d3ee).
- **Typography:** Geist Sans + Geist Mono (mono for data/numbers).
- **Currency:** USDC everywhere (Arc native asset).
- **Fee model:** Launch 1% (70/20/10) · Swap 1.5% (100% platform).
- **Bonding types:** Standard, Early Buy.

## Smart Contract Flow

1. \`launchToken(...)\` deploys \`BondingCurveToken\`, registers metadata.
2. \`buy(token, usdcIn)\` prices USDC -> tokens on the curve, takes 1% fee, splits 70/20/10 into accruing balances + holder dividend pool.
3. \`sell(token, tokensIn)\` prices tokens -> USDC, same fee logic.
4. \`claimCreatorFees(token)\` pays the creator fee wallet; \`claimHolderRewards(token)\` pays USDC dividends pro-rata.
5. \`graduate(token, pool)\` migrates fully-sold curves to an AMM pool (ArcodexPool).`,
  },
  contracts: {
    title: "Smart Contracts",
    body: `# Arcodex Smart Contracts

## Live Deployment (Arc mainnet, chainId 5042)

| Contract | Address | Fee |
|----------|---------|-----|
| ArcodexBondingCurve | \\\`0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0\\\` | 1% (launch tokens, 0.7% creator / 0.2% platform / 0.1% holder) |
| ArcodexFeeRouter | \\\`0x8FcA8fB88337BdedA54AA28227E1294923f5ca52\\\` | 1.5% (swap existing tokens, 100% platform) |
| USDC (quote) | \\\`0x3600000000000000000000000000000000000000\\\` | — |
| ArcodexPool | deployed per-token at graduation | 1% (0.7% creator / 0.2% platform / 0.1% holder) |

Bonding curve deploy TX: \\\`0x5c902794ca70fef977878bd2cb66fc4dd56f0e0f9c51e3df01af932a82fd5aa2\\\`
Fee router deploy TX: \\\`0xf2658709884ca825df9e61658ddf33febff3bfdcfd38f525dba612a2ae3544f7\\\`

## Fee Model

\`\`\`
# Launch tokens (bonding curve + pool): 1.0% -> 0.7% creator / 0.2% platform / 0.1% holder
FEE_BPS = 100
CREATOR_SHARE_BPS = 7000  # 70% -> creator (0.70%)
PLATFORM_SHARE_BPS = 2000 # 20% -> platform (0.20%)
HOLDER_SHARE_BPS = 1000   # 10% -> holder dividend pool (0.10%)

# Swap of existing tokens (ArcodexFeeRouter): 1.5% -> 100% platform
FEE_BPS = 150
CREATOR_SHARE_BPS = 0     # 0% -> creator
PLATFORM_SHARE_BPS = 10000 # 100% -> platform (1.50%)
\`\`\`

Applied on every buy and sell. Accrues on-chain per token; claimable separately.

## Contract: ArcodexBondingCurve

Source: contracts/ArcodexBondingCurve.sol

The factory + exchange contract for Arcodex. Every token launch creates a BondingCurveToken (minimal ERC20). Buy/sell prices follow a linear bonding curve priced in USDC. Supports Standard and Early Buy (whitelist) bonding. Implements holder dividends via fee reflection: 10% of every trade accrues to a per-token USDC pool, claimable pro-rata to token balance.

## Core Functions

| Function | Description |
|----------|-------------|
| launchToken(...) | Deploys token, registers metadata + socials + whitelist, seeds curve |
| buy(token, usdcIn) | Buy curve tokens with USDC, 1% fee split 70/20/10 |
| sell(token, tokensIn) | Sell curve tokens for USDC, 1% fee split 70/20/10 |
| claimCreatorFees(token) | Creator claims accrued 70% share |
| claimPlatformFees(token) | Owner claims accrued 20% share |
| claimHolderRewards(token) | Holder claims USDC dividends (10% of fees) pro-rata to balance |
| pendingHolderRewards(token, holder) | View pending holder dividends for a wallet |
| graduate(token) | Deploys ArcodexPool, migrates fully-sold curve to AMM pool |
| priceToTokens(token, usdcIn) | Quote: USDC -> tokens |
| tokensToPrice(token, tokensIn) | Quote: tokens -> USDC |
| isWhitelisted(token, wallet) | Check Early Buy whitelist status |

## ArcodexFeeRouter (Swap existing tokens)

Source: contracts/ArcodexFeeRouter.sol

Atomic 1-tx fee router for tokens that already have DEX liquidity on Arc (e.g. RadarDex). Skims a 1.5% fee (100% to the Arcodex platform), routes the net amount through the underlying V3 swap router, delivers output straight to the user.

## ArcodexPool (AMM)

Source: contracts/ArcodexPool.sol

Constant-product pool (token <-> USDC) deployed at graduation. Same 1% fee split 70/20/10 as the bonding curve (0.7% creator / 0.2% platform / 0.1% holder dividends), charged once in USDC terms. Supports swapUsdcIn / swapTokenIn, addLiquidity / removeLiquidity with LP tokens, and claimable creator/platform fees + holder dividends.

## Curve Formula

\`\`\`
price = startingPrice * (1 + sold / graduationThreshold)
\`\`\`

Linear from startingPrice up to 4x at 100% graduation. Liquidity fully backed by USDC held in the contract.

## Security

- ReentrancyGuard on all value-moving functions
- SafeERC20 for USDC
- Ownable for treasury + graduation
- Creator fee claim restricted to the registered fee wallet
- No arbitrary mint after launch; supply fixed at deployment

## Contract: BondingCurveToken

Minimal ERC20 (name, symbol, decimals=18, transfer/approve/transferFrom, mint by factory only). No owner, no upgradeability, no hidden minting.

## Deployment Notes

- Constructor args: (usdcAddress, platformTreasury)
- Arc chain: USDC is native. Verify USDC address before deployment
- Recommended: audit + testnet deploy before mainnet`,
  },
};

/* ─── Visual Fee Breakdown ─────────────────────────────────────────────── */

function FeeBreakdown() {
  const launchSegments = [
    { pct: 70, label: "Creator", sub: "0.70% · claimable anytime", color: "bg-cyan-400", text: "text-cyan-300" },
    { pct: 20, label: "Platform", sub: "0.20% · treasury", color: "bg-blue-500", text: "text-blue-300" },
    { pct: 10, label: "Holders", sub: "0.10% · USDC dividends", color: "bg-amber-400", text: "text-amber-300" },
  ];
  const swapSegments = [
    { pct: 100, label: "Platform", sub: "1.50% · treasury", color: "bg-blue-500", text: "text-blue-300" },
  ];

  return (
    <div className="mt-8 space-y-6">
      {/* Launch tokens */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-mono text-lg font-semibold text-[var(--text)]">Launch Tokens</h2>
            <p className="font-mono text-[11px] text-[var(--text-2)]">Bonding curve + AMM pool · every buy &amp; sell</p>
          </div>
          <span className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-3 py-1 font-mono text-sm font-semibold text-[var(--accent)]">
            1.00% fee
          </span>
        </div>

        {/* stacked bar */}
        <div className="mt-4 flex h-10 w-full overflow-hidden rounded-md border border-[var(--border)]">
          {launchSegments.map((s) => (
            <div
              key={s.label}
              className={`${s.color} flex items-center justify-center font-mono text-xs font-bold text-black/80 transition-all`}
              style={{ width: `${s.pct}%` }}
            >
              {s.pct}%
            </div>
          ))}
        </div>

        {/* legend */}
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {launchSegments.map((s) => (
            <div key={s.label} className="flex items-start gap-2 rounded-md border border-[var(--border)]/60 bg-[var(--bg)] p-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${s.color}`} />
              <div>
                <p className={`font-mono text-sm font-semibold ${s.text}`}>{s.label}</p>
                <p className="font-mono text-[11px] text-[var(--text-2)]">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swap existing */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="font-mono text-lg font-semibold text-[var(--text)]">Swap Existing Tokens</h2>
            <p className="font-mono text-[11px] text-[var(--text-2)]">Atomic fee router · tokens with live DEX liquidity</p>
          </div>
          <span className="rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-1 font-mono text-sm font-semibold text-blue-300">
            1.50% fee
          </span>
        </div>

        <div className="mt-4 flex h-10 w-full overflow-hidden rounded-md border border-[var(--border)]">
          {swapSegments.map((s) => (
            <div
              key={s.label}
              className={`${s.color} flex items-center justify-center font-mono text-xs font-bold text-black/80`}
              style={{ width: `${s.pct}%` }}
            >
              {s.pct}% · {s.label}
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-1">
          {swapSegments.map((s) => (
            <div key={s.label} className="flex items-start gap-2 rounded-md border border-[var(--border)]/60 bg-[var(--bg)] p-3">
              <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${s.color}`} />
              <div>
                <p className={`font-mono text-sm font-semibold ${s.text}`}>{s.label}</p>
                <p className="font-mono text-[11px] text-[var(--text-2)]">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [tab, setTab] = useState<"whitepaper" | "structure" | "contracts">("whitepaper");
  const doc = DOCS[tab];

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">Docs</h1>
        <p className="mt-2 font-mono text-xs text-[var(--text-2)]">
          Whitepaper, architecture, and smart contract specification for Arcodex.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {(
            [
              ["whitepaper", "Whitepaper"],
              ["structure", "Architecture"],
              ["contracts", "Smart Contracts"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md border px-4 py-2 font-mono text-xs transition ${
                tab === key
                  ? "border-[var(--accent)] bg-[var(--accent-dim)] font-semibold text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)]/50 hover:text-[var(--text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Visual fee breakdown — shown on every tab */}
        <FeeBreakdown />

        <article className="prose-invert mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <MarkdownRenderer text={doc.body} />
        </article>
      </section>
    </main>
  );
}

// Minimal markdown renderer for docs (headings, lists, tables, code, bold).
function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let inCode = false;
  let codeBuf: string[] = [];
  let tableBuf: string[][] = [];

  function renderInline(raw: string): React.ReactNode[] {
    const out: React.ReactNode[] = [];
    // split on **bold** segments
    const parts = raw.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((p, idx) => {
      if (!p) return;
      if (p.startsWith("**") && p.endsWith("**")) {
        out.push(
          <strong key={idx} className="font-semibold text-[var(--text)]">
            {p.slice(2, -2)}
          </strong>
        );
      } else {
        out.push(<span key={idx}>{p}</span>);
      }
    });
    return out;
  }

  function flushTable() {
    if (tableBuf.length === 0) return;
    const [header, , ...rows] = tableBuf;
    blocks.push(
      <div key={`t-${blocks.length}`} className="my-4 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr>
              {header.map((h, idx) => (
                <th key={idx} className="border-b border-[var(--border)] px-3 py-2 text-left font-semibold text-[var(--accent)]">
                  {h.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} className="border-b border-[var(--border)]/50 px-3 py-2 text-[var(--text)]">
                    {renderInline(c.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuf = [];
  }

  for (i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTable = line.trim().startsWith("|");

    if (inCode) {
      if (line.trim() === "```") {
        inCode = false;
        blocks.push(
          <pre key={`c-${blocks.length}`} className="my-4 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs leading-relaxed text-[var(--text)]">
            {codeBuf.join("\n")}
          </pre>
        );
        codeBuf = [];
      } else {
        codeBuf.push(line);
      }
      continue;
    }

    if (line.trim().startsWith("```")) {
      flushTable();
      inCode = true;
      continue;
    }

    if (isTable) {
      tableBuf.push(line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));
      continue;
    }
    flushTable();

    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("### ")) {
      blocks.push(<h3 key={`h-${blocks.length}`} className="mt-6 mb-2 font-mono text-lg font-semibold text-[var(--text)]">{t.slice(4)}</h3>);
    } else if (t.startsWith("## ")) {
      blocks.push(<h2 key={`h-${blocks.length}`} className="mt-8 mb-3 font-mono text-xl font-semibold text-[var(--text)]">{t.slice(3)}</h2>);
    } else if (t.startsWith("# ")) {
      blocks.push(<h1 key={`h-${blocks.length}`} className="mb-4 font-mono text-2xl font-semibold text-[var(--text)]">{t.slice(2)}</h1>);
    } else if (t.startsWith("- ")) {
      blocks.push(
        <li key={`l-${blocks.length}`} className="ml-4 list-disc font-mono text-xs leading-relaxed text-[var(--text-2)]">
          {renderInline(t.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(t)) {
      blocks.push(
        <li key={`l-${blocks.length}`} className="ml-4 list-decimal font-mono text-xs leading-relaxed text-[var(--text-2)]">
          {renderInline(t.replace(/^\d+\.\s/, ""))}
        </li>
      );
    } else {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-2 font-mono text-xs leading-relaxed text-[var(--text-2)]">
          {renderInline(t)}
        </p>
      );
    }
  }
  if (inCode) {
    blocks.push(
      <pre key={`c-${blocks.length}`} className="my-4 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 font-mono text-xs text-[var(--text)]">
        {codeBuf.join("\n")}
      </pre>
    );
  }
  flushTable();

  return <div className="space-y-1">{blocks}</div>;
}
