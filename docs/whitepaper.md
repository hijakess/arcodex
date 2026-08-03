# Arcodex Whitepaper

**Version 2.0 · Arc Chain Launchpad · Native USDC**

## Abstract

Arcodex is a memecoin launchpad built on the Arc blockchain, where **USDC is the native asset** — both the pricing currency and the gas token. Every token launches on a bonding curve with a fixed **1% trading fee** split **70% creator · 20% platform · 10% holder dividend pool**. Swapping existing Arc tokens through Arcodex's fee router costs a flat **1.5% (100% to the platform)**. Arcodex aggregates tokens launched across all launchpads on Arc into a single discoverable marketplace with built-in swap.

## 1. Problem

Launching a token today is fragmented: multiple launchpads, inconsistent fee models, unclear creator economics, and no unified view of what exists on-chain. Creators cannot easily claim fees, and traders must jump between sites.

## 2. Solution

Arcodex provides:

- **One-click token launch** with two bonding types (Standard, Early Buy).
- **Native USDC pricing** everywhere — no ETH/WETH conversions, no price confusion.
- **Creator-first launch fees**: 1% split 70% creator / 20% platform / 10% holder dividends.
- **Holders get paid**: 10% of every launch-token trade accrues to a USDC dividend pool, claimable pro-rata to balance (fee-reflection pattern).
- **Unified token index** across all Arc launchpads with instant swap.
- **Bridge** for moving USDC onto Arc.
- **Liquidity pools** for post-graduation trading.

## 3. Bonding Curve

Tokens launch on a linear bonding curve:

```
price = startingPrice * (1 + sold / graduationThreshold)
```

- Price rises linearly as supply is purchased.
- At 100% graduation, remaining supply + curve USDC migrate to a full AMM pool.
- Early buyers are rewarded with lower prices; late buyers pay more.
- Curve liquidity is always backed 1:1 by USDC held in the contract.

### Bonding Types

| Type | Description |
|------|-------------|
| **Standard** | Linear curve, open to everyone from block one. Fair launch. |
| **Early Buy** | Whitelisted early buyers get first access before public trading. |

## 4. Fee Model

### 4.1 Launch tokens (bonding curve + pool) — 1.00% per trade

Every buy and sell on a launch token accrues a **1% fee** in USDC, split three ways:

| Party | Share of fee | Effective rate | Goes to |
|-------|--------------|----------------|---------|
| **Creator** | 70% | 0.70% | Creator fee wallet, claimable anytime |
| **Platform** | 20% | 0.20% | Arcodex treasury |
| **Holders** | 10% | 0.10% | USDC dividend pool, claimable pro-rata |

**Holder dividends (fee reflection):** 10% of every trade is deposited into a per-token USDC dividend pool. Any holder can claim their pro-rata share based on token balance — hold more, earn more. Claimed dividends are paid out in USDC directly.

### 4.2 Swap existing tokens (ArcodexFeeRouter) — 1.50% per trade

Swapping tokens that already have DEX liquidity on Arc (e.g. RadarDex) through Arcodex's atomic fee router:

| Party | Share of fee | Effective rate | Goes to |
|-------|--------------|----------------|---------|
| **Platform** | 100% | 1.50% | Arcodex treasury |

- Fees accrue on-chain in USDC.
- Creators claim from their profile; the platform claims to a treasury wallet.
- No hidden fees. No gas token conversions — USDC is the native gas on Arc.

## 5. Architecture

```
┌─────────────────────────────────────────────┐
│                Arcodex dApp                  │
│  Discover · Launch · Tokens · Bridge · Pool │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Arcodex API / Indexer                │
│  Token index · prices · volume · holders    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Smart Contracts (Arc chain)           │
│  ArcodexBondingCurve · ArcodexPool          │
│  ArcodexFeeRouter · BondingCurveToken       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Arc Chain (native USDC)               │
│  L1 · USDC gas · EVM compatible             │
└─────────────────────────────────────────────┘
```

## 6. Token Lifecycle

1. **Launch** — Creator deploys a token with metadata (name, symbol, description, website, socials).
2. **Bonding** — Traders buy/sell against the curve in USDC. 1% fee accrues (70/20/10).
3. **Graduation** — At 100% curve sold, liquidity migrates to a full AMM pool.
4. **Trading** — Post-graduation, the token trades freely on the AMM with the same 70/20/10 split.
5. **Claim** — Creator claims 0.70%; platform claims 0.20%; **holders claim 0.10% pro-rata dividends**.

## 7. Security

- **Non-reentrancy guards** on all value-moving functions.
- **SafeERC20** for USDC transfers.
- **Ownable** admin functions (treasury, graduation).
- Curve liquidity is fully backed; no fractional reserves.
- Creator fees are claimable only by the designated fee wallet.
- No arbitrary minting after launch; supply fixed at deployment.
- Timelock/audit process before mainnet deployment.

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

- **Phase 1** — Launchpad live (bonding curves, fees, claim, holder dividends).
- **Phase 2** — Token index across all Arc launchpads + unified swap.
- **Phase 3** — Bridge (LI.FI powered) + liquidity pools.
- **Phase 4** — Creator analytics, X integration, governance.

## 10. Disclaimer

Arcodex is a protocol for launching and trading community tokens. Tokens launched on the platform carry risk, including total loss. Nothing in this whitepaper is financial advice.
