# Arcodex Architecture

**Project structure and system design**

## Repository Layout

```
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
```

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

- **Theme:** Dark, crypto-native. Off-black background, cyan accent (`#22d3ee`).
- **Typography:** Geist Sans + Geist Mono (mono for data/numbers).
- **Currency:** USDC everywhere (Arc native asset).
- **Fee model:** Launch 1% (70/20/10) · Swap 1.5% (100% platform).
- **Bonding types:** Standard, Early Buy.

## Data Flow

- **Static/mock data** (`lib/mockData.ts`, `lib/arcTokens.ts`) powers part of the UI today.
- **Real integration path:** swap panel wired to `ArcodexBondingCurve.buy/sell`; launch wired to `launchToken`; profile claim wired to `claimCreatorFees` / `claimHolderRewards`.
- **Wallet:** EIP-1193 injected provider (MetaMask/Rabby) with Add Arc Chain support.

## Smart Contract Flow

1. `launchToken(...)` deploys `BondingCurveToken`, registers metadata.
2. `buy(token, usdcIn)` prices USDC -> tokens on the curve, takes 1% fee, splits 70/20/10 into accruing balances + holder dividend pool.
3. `sell(token, tokensIn)` prices tokens -> USDC, same fee logic.
4. `claimCreatorFees(token)` pays the creator fee wallet; `claimHolderRewards(token)` pays USDC dividends pro-rata to balance.
5. `graduate(token, pool)` migrates fully-sold curves to an AMM pool (ArcodexPool).
