# Arcodex Smart Contracts

**Bonding curve + fee split (80/20)**

## Contract: `ArcodexBondingCurve`

Source: `contracts/ArcodexBondingCurve.sol`

### Overview

The factory + exchange contract for Arcodex. Every token launch creates a
`BondingCurveToken` (minimal ERC20). Buy/sell prices follow a linear bonding
curve priced in USDC (native asset of Arc).

### Fee Model

```
FEE_BPS = 100            # 1.00% total
CREATOR_SHARE_BPS = 8000 # 80% of fee -> creator (0.80%)
PLATFORM_SHARE_BPS = 2000# 20% of fee -> platform (0.20%)
```

- Applied on every buy and sell.
- Accrues on-chain per token; claimable separately.
- Creator claims via `claimCreatorFees(token)`.
- Platform claims via `claimPlatformFees(token)` (owner/treasury only).

### Core Functions

| Function | Description |
|----------|-------------|
| `launchToken(...)` | Deploys token, registers metadata + socials, seeds curve |
| `buy(token, usdcIn)` | Buy curve tokens with USDC, 1% fee split 80/20 |
| `sell(token, tokensIn)` | Sell curve tokens for USDC, 1% fee split 80/20 |
| `claimCreatorFees(token)` | Creator claims accrued 80% share |
| `claimPlatformFees(token)` | Owner claims accrued 20% share |
| `graduate(token, pool)` | Migrate fully-sold curve to AMM pool |
| `priceToTokens(token, usdcIn)` | Quote: USDC -> tokens |
| `tokensToPrice(token, tokensIn)` | Quote: tokens -> USDC |

### Curve Formula

```
price = startingPrice * (1 + sold / graduationThreshold)
```

Linear from `startingPrice` up to 4x at 100% graduation. Liquidity is fully
backed by USDC held in the contract (no fractional reserves).

### Bonding Types

- **Standard:** open to everyone from block one.
- **Early Buy:** whitelisted buyers get first access (off-chain whitelist hook
  point, `earlyBuy()` gate to be added before mainnet).

### Security

- `ReentrancyGuard` on all value-moving functions.
- `SafeERC20` for USDC.
- `Ownable` for treasury + graduation.
- Creator fee claim restricted to the registered fee wallet.
- No arbitrary mint after launch; supply is fixed at deployment.

## Contract: `BondingCurveToken`

Minimal ERC20 (name, symbol, decimals=18, transfer/approve/transferFrom, mint
by factory only). No owner, no upgradeability, no hidden minting.

## Deployment Notes

- Constructor args: `(usdcAddress, platformTreasury)`.
- Arc chain: USDC is native. Verify the USDC address for the target network
  before deployment.
- Recommended: audit + testnet deploy before mainnet.
- Foundry test suite to be added in `contracts/test/`.
