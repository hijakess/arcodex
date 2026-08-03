# Arcodex Smart Contracts

**Bonding curve + fee split (70/20/10) + holder dividends**

## Contract: `ArcodexBondingCurve`

Source: `contracts/ArcodexBondingCurve.sol`

### Overview

The factory + exchange contract for Arcodex. Every token launch creates a
`BondingCurveToken` (minimal ERC20). Buy/sell prices follow a linear bonding
curve priced in USDC (native asset of Arc). Supports Standard and Early Buy
(whitelist) bonding. Implements **holder dividends** via fee reflection: 10% of
every trade accrues to a per-token USDC pool, claimable pro-rata to balance.

### Fee Model

```
FEE_BPS = 100            # 1.00% total
CREATOR_SHARE_BPS = 7000 # 70% of fee -> creator (0.70%)
PLATFORM_SHARE_BPS = 2000 # 20% of fee -> platform (0.20%)
HOLDER_SHARE_BPS = 1000  # 10% of fee -> holder dividends (0.10%)
```

- Applied on every buy and sell.
- Accrues on-chain per token; claimable separately.
- Creator claims via `claimCreatorFees(token)`.
- Platform claims via `claimPlatformFees(token)` (owner/treasury only).
- Holders claim USDC dividends via `claimHolderRewards(token)` — pro-rata to
  their token balance (fee-reflection pattern, `totalDividendPerShare` /
  `userDividendDebt` accounting, `REWARD_SCALE = 1e36`).

### Core Functions

| Function | Description |
|----------|-------------|
| `launchToken(...)` | Deploys token, registers metadata + socials + whitelist, seeds curve |
| `buy(token, usdcIn)` | Buy curve tokens with USDC, 1% fee split 70/20/10 |
| `sell(token, tokensIn)` | Sell curve tokens for USDC, 1% fee split 70/20/10 |
| `claimCreatorFees(token)` | Creator claims accrued 70% share |
| `claimPlatformFees(token)` | Owner claims accrued 20% share |
| `claimHolderRewards(token)` | Holder claims USDC dividends (10% of fees) pro-rata to balance |
| `pendingHolderRewards(token, holder)` | View pending holder dividends for a wallet |
| `graduate(token)` | Migrate fully-sold curve to AMM pool |
| `priceToTokens(token, usdcIn)` | Quote: USDC -> tokens |
| `tokensToPrice(token, tokensIn)` | Quote: tokens -> USDC |
| `isWhitelisted(token, wallet)` | Check Early Buy whitelist status |

### Curve Formula

```
price = startingPrice * (1 + sold / graduationThreshold)
```

Linear from `startingPrice` up to 4x at 100% graduation. Liquidity is fully
backed by USDC held in the contract (no fractional reserves).

### Bonding Types

- **Standard:** open to everyone from block one.
- **Early Buy:** whitelisted buyers get first access.

### Security

- `ReentrancyGuard` on all value-moving functions.
- `SafeERC20` for USDC.
- `Ownable` for treasury + graduation.
- Creator fee claim restricted to the registered fee wallet.
- No arbitrary mint after launch; supply is fixed at deployment.

## Contract: `ArcodexFeeRouter`

Source: `contracts/ArcodexFeeRouter.sol`

Atomic 1-tx fee router for tokens that already have DEX liquidity on Arc
(e.g. RadarDex). Skims a **1.5% fee (100% to the platform)**, routes the net
amount through the underlying V3 swap router, delivers output straight to the
user.

```
FEE_BPS = 150            # 1.50% total
CREATOR_SHARE_BPS = 0    # 0% -> creator
PLATFORM_SHARE_BPS = 10000 # 100% -> platform (1.50%)
```

## Contract: `ArcodexPool`

Source: `contracts/ArcodexPool.sol`

Constant-product pool (token <-> USDC) deployed at graduation. Same 1% fee
split 70/20/10 as the bonding curve, charged once in USDC terms. Supports
`swapUsdcIn` / `swapTokenIn`, `addLiquidity` / `removeLiquidity` with LP
tokens, and claimable creator/platform fees + holder dividends.

## Contract: `BondingCurveToken`

Minimal ERC20 (name, symbol, decimals=18, transfer/approve/transferFrom, mint
by factory only). No owner, no upgradeability, no hidden minting.

## Live Deployment (Arc, chainId 5042)

| Contract | Address |
|----------|---------|
| ArcodexBondingCurve | `0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0` |
| ArcodexFeeRouter | `0x8FcA8fB88337BdedA54AA28227E1294923f5ca52` |
| USDC (quote) | `0x3600000000000000000000000000000000000000` |
| ArcodexPool | deployed per-token at graduation |

## Deployment Notes

- Constructor args: `(usdcAddress, platformTreasury)`.
- Arc chain: USDC is native. Verify the USDC address for the target network
  before deployment.
- Recommended: audit + testnet deploy before mainnet.
