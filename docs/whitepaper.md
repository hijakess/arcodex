# Arcodex Whitepaper

**Version 1.0 · Arc Chain Launchpad · Native USDC**

## Abstract

Arcodex is a memecoin launchpad built on the Arc blockchain, where **USDC is the native asset**. Every token launches on a bonding curve with a fixed **1% trading fee**, split **80% to the creator and 20% to the platform**. Arcodex aggregates tokens launched across all launchpads on Arc into a single discoverable marketplace with built-in swap.

## 1. Problem

Launching a token today is fragmented: multiple launchpads, inconsistent fee models, unclear creator economics, and no unified view of what exists on-chain. Creators cannot easily claim fees, and traders must jump between sites.

## 2. Solution

Arcodex provides:

- **One-click token launch** with two bonding types (Standard, Early Buy).
- **Native USDC pricing** everywhere - no ETH/WETH conversions, no price confusion.
- **Fixed 1% fee** with transparent 80/20 creator/platform split.
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

Fixed **1.00%** fee on every trade (buy and sell):

| Party | Share | Effective rate |
|-------|-------|----------------|
| Creator | 80% | 0.80% |
| Platform | 20% | 0.20% |

- Fees accrue on-chain in USDC.
- Creators claim from their profile; the platform claims to a treasury wallet.
- No hidden fees. No gas token conversions - USDC is the native gas on Arc.

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
│  ArcodexBondingCurve · BondingCurveToken    │
│  Fees: 0.7% creator / 0.2% platform / 0.1% holder │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Arc Chain (native USDC)               │
│  L1 · USDC gas · EVM compatible             │
└─────────────────────────────────────────────┘
```

## 6. Token Lifecycle

1. **Launch** - Creator deploys a token with metadata (name, symbol, description, website, socials).
2. **Bonding** - Traders buy/sell against the curve in USDC. 1% fee accrues.
3. **Graduation** - At 100% curve sold, liquidity migrates to a full AMM pool.
4. **Trading** - Post-graduation, the token trades freely on the AMM with the same 1% fee split.
5. **Claim** - Creator claims 80% of fees; platform claims 20%.

## 7. Security

- **Non-reentrancy guards** on all value-moving functions.
- **SafeERC20** for USDC transfers.
- **Ownable** admin functions (treasury, graduation).
- Curve liquidity is fully backed; no fractional reserves.
- Creator fees are claimable only by the designated fee wallet.
- Timelock/audit process before mainnet deployment.

## 8. Tokenomics

| Item | Value |
|------|-------|
| Trading fee | 1.00% fixed |
| Creator share | 80% |
| Platform share | 20% |
| Price currency | USDC (native) |
| Curve graduation | 100% of bonding supply |

## 9. Roadmap

- **Phase 1** - Launchpad live (bonding curves, fees, claim).
- **Phase 2** - Token index across all Arc launchpads + unified swap.
- **Phase 3** - Bridge (LI.FI powered) + liquidity pools.
- **Phase 4** - Creator analytics, X integration, governance.

## 10. Disclaimer

Arcodex is a protocol for launching and trading community tokens. Tokens launched on the platform carry risk, including total loss. Nothing in this whitepaper is financial advice.
