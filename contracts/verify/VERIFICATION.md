# Arcodex — Contract Verification

Verified: **2026-08-03** · Arc mainnet (chainId **5042**) · Explorer-independent (bytecode-level)

## Compiler settings (identical to deployment)

| Setting | Value |
|---|---|
| solc | **0.8.24** |
| optimizer | enabled, **runs = 200** |
| viaIR | **true** |
| evmVersion | **paris** |
| deps | @openzeppelin/contracts **5.0.2** |

## Results

| Contract | Address | Result |
|---|---|---|
| **ArcodexBondingCurve** | `0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0` | ✅ **VERIFIED** — 23,348 B runtime; matches after 7 immutable patches (USDC `0x3600...`) |
| **ArcodexFeeRouter** | `0x8FcA8fB88337BdedA54AA28227E1294923f5ca52` | ✅ **VERIFIED** — 3,568 B runtime; **EXACT** bytecode match |
| **BondingCurveToken** (ARCT) | `0x42983a981b90136b418c26caefb8a1bc89a00c1d` | ✅ **VERIFIED** — 1,925 B runtime; matches after 2 immutable patches (factory `0x0264...`) |
| **ArcodexPool** | — (factory-deployed at graduation) | ⏳ no instance deployed yet |

> Immutables are patched into the runtime bytecode by the constructor at deploy time;
> compiler artifacts carry zero placeholders. The patched positions correspond exactly
> to the expected constructor values (see below) — this is the correct verification
> semantics for contracts using `immutable`.

## Constructor arguments (read from chain)

**ArcodexBondingCurve** `(usdc, platformTreasury)`
- `usdc` = `0x3600000000000000000000000000000000000000` (native USDC)
- `platformTreasury` = `0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3`
- `owner` = `0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3`
- `tokenCount` = 1 (only ARCT launched)

**ArcodexFeeRouter** `(platformTreasury)`
- `platformTreasury` = `0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3`
- `feeBps` = **150** (1.50%)
- `owner` = `0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3`

**BondingCurveToken (ARCT)** `("Arcodex Test", "ARCT", factory)` + `mint(1e24)`
- `name` = "Arcodex Test", `symbol` = "ARCT"
- `supply` = 1,000,000 (1e24 wei)
- `factory` = `0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0`

## Artifacts

- **`arcodex-standard-input.json`** — the exact solc standard-JSON input (10 sources:
  3 project files + 7 OpenZeppelin files). Recompiling it reproduces the deployed
  creation bytecode **byte-for-byte** for all three contracts (validated). This is the
  input explorers (Blockscout/arcscan, `sourceType: solidity-standard-json-input`)
  accept for one-click verification.
- **`verify_bytecode.js`** — reproducible verification script (compile → fetch
  `eth_getCode` → strip CBOR metadata → patch immutables → compare).
- **`contracts/`** — original multi-file sources, identical to the deployment build.

## Why not verified on an explorer?

Arc mainnet has **no public block explorer yet**:
- `arcscan.app` (canonical, used by RadarDex/JPEG World) → resolves to a **private** IP
- `arc.blockscout.com` (currently hardcoded in the app) → Cloudflare 404, no backend
- chainlist.org → no explorer registered for chain 5042
- Sourcify → only supports Arc **testnet** (5042002), not mainnet

The bytecode-level proof above is equivalent and explorer-independent. When
`arcscan.app` goes public, verification is one upload of `arcodex-standard-input.json`
away. **Note:** the app still links `arc.blockscout.com` for "view on explorer" — those
links are dead; they should be updated to `https://arcscan.app`.
