"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";

const DOCS: Record<string, { title: string; body: string }> = {
  whitepaper: {
    title: "Whitepaper",
    body: `# Arcodex Whitepaper

**Version 1.0 · Arc Chain Launchpad · Native USDC**

## Abstract

Arcodex is a memecoin launchpad built on the Arc blockchain, where **USDC is the native asset**. Tokens launch on a bonding curve with a **1% trading fee split 0.8% to the creator and 0.2% to the platform**. Swapping existing tokens costs a flat **1.5% fee (100% platform)**. Arcodex aggregates tokens launched across all launchpads on Arc into a single discoverable marketplace with built-in swap.

## 1. Problem

Launching a token today is fragmented: multiple launchpads, inconsistent fee models, unclear creator economics, and no unified view of what exists on-chain. Creators cannot easily claim fees, and traders must jump between sites.

## 2. Solution

Arcodex provides:

- One-click token launch with two bonding types (Standard, Early Buy)
- Native USDC pricing everywhere - no ETH/WETH conversions
- Fixed 1.5% swap fee on existing tokens (100% platform) + 1% launch fee (0.8% creator / 0.2% platform)
- Unified token index across all Arc launchpads with instant swap
- Bridge for moving USDC onto Arc
- Liquidity pools for post-graduation trading

## 3. Bonding Curve

Tokens launch on a linear bonding curve: price = startingPrice * (1 + sold / graduationThreshold)

- Price rises linearly as supply is purchased
- At 100% graduation, remaining supply + curve USDC migrate to a full AMM pool
- Curve liquidity is always backed 1:1 by USDC held in the contract

### Bonding Types

| Type | Description |
|------|-------------|
| Standard | Linear curve, open to everyone from block one. Fair launch. |
| Early Buy | Whitelisted early buyers get first access before public trading. |

## 4. Fee Model

Two fee models:

**Launch tokens (bonding curve + pool) — 1%** per trade, split 80/20:

| Party | Share | Effective rate |
|-------|-------|----------------|
| Creator | 80% of fee | 0.80% |
| Platform | 20% of fee | 0.20% |

**Swap existing tokens (ArcodexFeeRouter) — 1.5%** per trade, 100% to the platform:

| Party | Share | Effective rate |
|-------|-------|----------------|
| Platform | 100% of fee | 1.50% |
| Creator | 0% | 0.00% |

Fees accrue on-chain in USDC. Creators claim their share from their profile; the platform claims to a treasury wallet.

## 5. Architecture

Arcodex dApp (Discover, Launch, Tokens, Bridge, Pool) -> Arcodex API/Indexer -> Smart Contracts (ArcodexBondingCurve, BondingCurveToken) -> Arc Chain (native USDC, EVM compatible).

## 6. Token Lifecycle

1. Launch - creator deploys token with metadata (name, symbol, description, website, socials)
2. Bonding - traders buy/sell against the curve in USDC; 1% fee accrues (0.8% creator / 0.2% platform)
3. Graduation - at 100% curve sold, liquidity migrates to a full AMM pool
4. Trading - post-graduation, token trades freely on the AMM with the same 0.8% / 0.2% split
5. Claim - creator claims 0.8%; platform claims 0.2%

## 7. Security

- Non-reentrancy guards on all value-moving functions
- SafeERC20 for USDC transfers
- Ownable admin functions (treasury, graduation)
- Curve liquidity fully backed; no fractional reserves
- Creator fees claimable only by the designated fee wallet

## 8. Tokenomics

| Item | Value |
|------|-------|
| Trading fee (launch tokens) | 1.00% fixed |
| Creator share | 80% of launch fee (0.80%) |
| Platform share | 20% of launch fee (0.20%) |
| Swap fee (existing tokens) | 1.50% fixed, 100% platform |
| Price currency | USDC (native) |
| Curve graduation | 100% of bonding supply |

## 9. Roadmap

- Phase 1 - Launchpad live (bonding curves, fees, claim)
- Phase 2 - Token index across all Arc launchpads + unified swap
- Phase 3 - Bridge (LI.FI powered) + liquidity pools
- Phase 4 - Creator analytics, X integration, governance

## 10. Disclaimer

Arcodex is a protocol for launching and trading community tokens. Tokens launched on the platform carry risk, including total loss. Nothing in this whitepaper is financial advice.`,
  },
  contracts: {
    title: "Smart Contracts",
    body: `# Arcodex Smart Contracts

## Live Deployment (Arc mainnet, chainId 5042)

| Contract | Address | Fee |
|----------|---------|-----|
| ArcodexBondingCurve | \`0x7D7184cB91d8c7b1bb4FF92CAA19707aCfCa67e3\` | 1% (launch tokens, 0.8% creator / 0.2% platform) |
| ArcodexFeeRouter | \`0x8FcA8fB88337BdedA54AA28227E1294923f5ca52\` | 1.5% (swap existing tokens, 100% platform) |
| USDC (quote) | \`0x3600000000000000000000000000000000000000\` | — |
| ArcodexPool | deployed per-token at graduation | 1% (0.8% creator / 0.2% platform) |

Bonding curve deploy TX: \`0x6ef486343892f042e3d4456eac76f4eaebe95bf01df54141f053394b939da07f\`
Fee router deploy TX: \`0xf2658709884ca825df9e61658ddf33febff3bfdcfd38f525dba612a2ae3544f7\`

## Fee Model

Two fee models:

\`\`\`
# Launch tokens (bonding curve + pool): 1.0% -> 0.8% creator / 0.2% platform
FEE_BPS = 100
CREATOR_SHARE_BPS = 8000  # 80% -> creator (0.80%)
PLATFORM_SHARE_BPS = 2000 # 20% -> platform (0.20%)

# Swap of existing tokens (ArcodexFeeRouter): 1.5% -> 100% platform
FEE_BPS = 150
CREATOR_SHARE_BPS = 0     # 0% -> creator
PLATFORM_SHARE_BPS = 10000 # 100% -> platform (1.50%)
\`\`\`

Applied on every buy and sell. Accrues on-chain per token; claimable separately.

## Contract: ArcodexBondingCurve

Source: contracts/ArcodexBondingCurve.sol

The factory + exchange contract for Arcodex. Every token launch creates a BondingCurveToken (minimal ERC20). Buy/sell prices follow a linear bonding curve priced in USDC. Supports Standard and Early Buy (whitelist) bonding.

## Core Functions

| Function | Description |
|----------|-------------|
| launchToken(...) | Deploys token, registers metadata + socials + whitelist, seeds curve |
| buy(token, usdcIn) | Buy curve tokens with USDC, 1% fee split 80/20 |
| sell(token, tokensIn) | Sell curve tokens for USDC, 1% fee split 80/20 |
| claimCreatorFees(token) | Creator claims accrued 80% share |
| claimPlatformFees(token) | Owner claims accrued 20% share |
| graduate(token) | Deploys ArcodexPool, migrates fully-sold curve to AMM pool |
| priceToTokens(token, usdcIn) | Quote: USDC -> tokens |
| tokensToPrice(token, tokensIn) | Quote: tokens -> USDC |
| isWhitelisted(token, wallet) | Check Early Buy whitelist status |

## ArcodexFeeRouter (Swap existing tokens)

Source: contracts/ArcodexFeeRouter.sol

Atomic 1-tx fee router for tokens that already have DEX liquidity on Arc (e.g. RadarDex tokens). Skims a 1.5% fee (100% to the Arcodex platform), routes the net amount through the underlying V3 swap router, delivers output straight to the user. Same pattern as RadarDex's fee router but at Arcodex's 1.5% platform rate.

## ArcodexPool (AMM)

Source: contracts/ArcodexPool.sol

Constant-product pool (token <-> USDC) deployed at graduation. Same 1% fee split 80/20 as the bonding curve, charged in the output asset. Supports swapUsdcIn / swapTokenIn, addLiquidity / removeLiquidity with LP tokens, and claimable creator/platform fees.

## Curve Formula

\\\`\\\`\\\`
price = startingPrice * (1 + sold / graduationThreshold)
\\\`\\\`\\\`

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
                    {c.trim()}
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
          {t.slice(2)}
        </li>
      );
    } else if (/^\d+\.\s/.test(t)) {
      blocks.push(
        <li key={`l-${blocks.length}`} className="ml-4 list-decimal font-mono text-xs leading-relaxed text-[var(--text-2)]">
          {t.replace(/^\d+\.\s/, "")}
        </li>
      );
    } else {
      blocks.push(
        <p key={`p-${blocks.length}`} className="my-2 font-mono text-xs leading-relaxed text-[var(--text-2)]">
          {t}
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
