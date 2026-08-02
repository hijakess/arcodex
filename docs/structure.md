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
│   ├── providers.tsx         # Privy auth provider
│   └── globals.css           # Design tokens (dark, cyan accent)
├── components/
│   ├── Navbar.tsx            # Top bar: Discover/Tokens/Launch/Bridge/Pool/Profile
│   ├── TokenCard.tsx         # Token grid card with bonding badge
│   ├── BondingBadge.tsx      # Standard / Early Buy badge
│   ├── SortDropdown.tsx      # Reusable sort/filter dropdown
│   ├── TradingViewChart.tsx  # TradingView lightweight-charts integration
│   ├── CopyButton.tsx        # Copy-to-clipboard with feedback
├── lib/
│   ├── mockData.ts           # Bonding tokens + trades + holdings (mock)
│   ├── arcTokens.ts          # Cross-launchpad token index (mock)
│   ├── types.ts              # TypeScript types
│   └── useAuth.ts            # Privy auth hook (demo fallback)
├── contracts/
│   └── ArcodexBondingCurve.sol  # Bonding curve + 80/20 fee split
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
| Auth | Privy (wallet + X login, env-gated) |
| Icons | Phosphor Icons |
| Package manager | pnpm 11 |
| Deploy | Vercel |

## Design System

- **Theme:** Dark, crypto-native. Off-black background, cyan accent (`#22d3ee`).
- **Typography:** Geist Sans + Geist Mono (mono for data/numbers).
- **Currency:** USDC everywhere (Arc native asset).
- **Fee model:** 1% fixed, 80% creator / 20% platform.
- **Bonding types:** Standard, Early Buy.

## Data Flow

- **Static/mock data** (`lib/mockData.ts`, `lib/arcTokens.ts`) powers the UI today.
- **Real integration path:** replace mock arrays with indexer/API responses; wire
  swap panel to `ArcodexBondingCurve.buy/sell`; wire profile claim to
  `claimCreatorFees`.
- **Privy:** set `NEXT_PUBLIC_PRIVY_APP_ID` to enable real wallet + X login.
  Without it the app runs in demo mode with mock auth.

## Smart Contract Flow

1. `launchToken(...)` deploys `BondingCurveToken`, registers metadata.
2. `buy(token, usdcIn)` prices USDC -> tokens on the curve, takes 1% fee,
   splits 80/20 into accruing balances.
3. `sell(token, tokensIn)` prices tokens -> USDC, same fee logic.
4. `claimCreatorFees(token)` pays the creator fee wallet.
5. `graduate(token, pool)` migrates fully-sold curves to an AMM pool.
