// Arcodex on-chain swap configuration (Arc chain, chainId 5042)
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hex,
} from "viem";

export type { Address, Hex } from "viem";

export const ARC_CHAIN = {
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://fortest-production-9a201.up.railway.app"] } },
} as const;

// Deployed contracts (Arc mainnet)
export const ARCODEX_BONDING = "0xfe4CEf26Ab54581868A3D727e7bc72CC4AabD324" as Address;
export const ARCODEX_FEE_ROUTER = "0x8FcA8fB88337BdedA54AA28227E1294923f5ca52" as Address;
export const USDC = "0x3600000000000000000000000000000000000000" as Address;
export const SWAP_ROUTER = "0x53bf6b0684ec7ef91e1387da3d1a1769bc5a6f77" as Address;
export const QUOTER = "0x7dfd4f31be6814d2906bde155c3e1b146eac1468" as Address;

// Swap of existing tokens (ArcodexFeeRouter): 1.5% fee, 100% to platform
export const FEE_BPS = 150n;
export const CREATOR_SHARE_BPS = 0n;
export const PLATFORM_SHARE_BPS = 10000n;

// Newly launched tokens (bonding curve + pool): 1.0% fee, split 70/20/10
// (0.7% creator / 0.2% platform / 0.1% holder dividends - Plan A)
export const LAUNCH_FEE_BPS = 100n;
export const LAUNCH_CREATOR_SHARE_BPS = 7000n;
export const LAUNCH_PLATFORM_SHARE_BPS = 2000n;
export const LAUNCH_HOLDER_SHARE_BPS = 1000n;

// ---- ABIs (minimal, matching deployed contracts) ----

export const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
] as const;

export const FEE_ROUTER_ABI = [
  "function swapExactInput(address router, address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum) returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function creatorClaimable(address) view returns (uint256)",
  "function platformClaimable(address) view returns (uint256)",
] as const;

export const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) view returns (uint256)",
] as const;

// ---- Clients ----

export function publicClient() {
  return createPublicClient({ chain: ARC_CHAIN, transport: http() });
}

/** Wallet client from an injected provider (window.ethereum). */
export function walletClient(provider: unknown) {
  return createWalletClient({ chain: ARC_CHAIN, transport: custom(provider as any) });
}

// ---- Quotes ----

export async function quoteSwap(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
  poolFee: number
): Promise<bigint> {
  const client = publicClient();
  try {
    const q = await client.readContract({
      address: QUOTER,
      abi: QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [tokenIn, tokenOut, amountIn, poolFee, 0n],
    });
    return BigInt(q as bigint);
  } catch {
    // some quoters need the struct form
    const q = await client.readContract({
      address: QUOTER,
      abi: [
        "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) view returns (uint256)",
      ],
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn, tokenOut, amountIn, fee: poolFee, sqrtPriceLimitX96: 0n }],
    });
    return BigInt(q as bigint);
  }
}

// ---- Swaps ----

export interface SwapReceipt {
  txHash: Hex;
  amountOut: bigint;
}

/** Buy/sell through ArcodexFeeRouter (atomic 1-tx, 1.5% fee included). */
export async function executeSwap(
  provider: unknown,
  account: Address,
  tokenIn: Address,
  tokenOut: Address,
  poolFee: number,
  amountIn: bigint,
  amountOutMin: bigint
): Promise<SwapReceipt> {
  const client = walletClient(provider);
  const { request } = await publicClient().simulateContract({
    address: ARCODEX_FEE_ROUTER,
    abi: FEE_ROUTER_ABI,
    functionName: "swapExactInput",
    args: [SWAP_ROUTER, tokenIn, tokenOut, poolFee, amountIn, amountOutMin],
    account,
  });
  const txHash = await client.writeContract(request);
  return { txHash, amountOut: 0n };
}

/** Approve token spending for the fee router (MaxUint256). */
export async function approveToken(
  provider: unknown,
  account: Address,
  token: Address
): Promise<Hex> {
  const client = walletClient(provider);
  const { request } = await publicClient().simulateContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [ARCODEX_FEE_ROUTER, 2n ** 256n - 1n],
    account,
  });
  return client.writeContract(request);
}

// ---- Bonding curve (launch tokens) ----

export const BONDING_ABI = [
  "function launchToken(string name, string symbol, string description, string website, string twitter, string telegram, string discord, uint256 supply, uint256 startingPrice, uint256 graduationThreshold, address creatorFeeWallet, uint8 bondingType, address[] whitelist) returns (address token)",
  "function buy(address token, uint256 usdcIn)",
  "function sell(address token, uint256 tokensIn)",
  "function tokens(address) view returns (address token, address creator, address creatorFeeWallet, string name, string symbol, string website, string twitter, string telegram, string discord, uint256 supply, uint256 startingPrice, uint256 graduationThreshold, uint256 sold, uint256 totalCollected, uint256 creatorClaimable, uint256 platformClaimable, uint8 bondingType, bool graduated, address pool)",
  "function pendingHolderRewards(address token, address holder) view returns (uint256)",
  "function claimHolderRewards(address token)",
  "function holderRewardPool(address) view returns (uint256)",
  "function accRewardPerShare(address) view returns (uint256)",
  "function claimedHolderRewards(address,address) view returns (uint256)",
  "function FEE_BPS() view returns (uint256)",
  "function CREATOR_SHARE_BPS() view returns (uint256)",
  "function PLATFORM_SHARE_BPS() view returns (uint256)",
  "function HOLDER_SHARE_BPS() view returns (uint256)",
] as const;

export interface LaunchParams {
  name: string;
  symbol: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  supply: bigint; // token 18 decimals
  startingPrice: bigint; // USDC per token, 6 decimals
  graduationThreshold: bigint; // token units
  creatorFeeWallet: Address;
  bondingType: 0 | 1; // 0 = standard, 1 = early buy
  whitelist: Address[];
}

/** Launch a token on the bonding curve (gas paid in native USDC). */
export async function launchToken(
  provider: unknown,
  account: Address,
  p: LaunchParams
): Promise<{ txHash: Hex; tokenAddress?: Address }> {
  const client = walletClient(provider);
  const { request } = await publicClient().simulateContract({
    address: ARCODEX_BONDING,
    abi: BONDING_ABI,
    functionName: "launchToken",
    args: [
      p.name,
      p.symbol,
      p.description,
      p.website,
      p.twitter,
      p.telegram,
      p.discord,
      p.supply,
      p.startingPrice,
      p.graduationThreshold,
      p.creatorFeeWallet,
      p.bondingType,
      p.whitelist,
    ],
    account,
  });
  const txHash = await client.writeContract(request);
  return { txHash };
}

/** Claim holder dividends (USDC) for a launched token. */
export async function claimHolderRewards(
  provider: unknown,
  account: Address,
  token: Address
): Promise<Hex> {
  const client = walletClient(provider);
  const { request } = await publicClient().simulateContract({
    address: ARCODEX_BONDING,
    abi: BONDING_ABI,
    functionName: "claimHolderRewards",
    args: [token],
    account,
  });
  return client.writeContract(request);
}

/** Pending holder dividends (USDC) for a wallet on a launched token. */
export async function getPendingHolderRewards(
  token: Address,
  holder: Address
): Promise<bigint> {
  const client = publicClient();
  const r = await client.readContract({
    address: ARCODEX_BONDING,
    abi: BONDING_ABI,
    functionName: "pendingHolderRewards",
    args: [token, holder],
  });
  return BigInt(r as bigint);
}

/** Check whether a token was launched on the Arcodex bonding curve. */
export async function isArcodexToken(token: Address): Promise<boolean> {
  const client = publicClient();
  try {
    const info = await client.readContract({
      address: ARCODEX_BONDING,
      abi: BONDING_ABI,
      functionName: "tokens",
      args: [token],
    });
    const arr = info as readonly unknown[];
    // token field (index 0) is zero when not launched here
    return arr[0] !== "0x0000000000000000000000000000000000000000";
  } catch {
    return false;
  }
}
