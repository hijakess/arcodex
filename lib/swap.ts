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
export const ARCODEX_BONDING = "0x7D7184cB91d8c7b1bb4FF92CAA19707aCfCa67e3" as Address;
export const ARCODEX_FEE_ROUTER = "0xADe3C6595f98772C61bc1Fb7643945ffe5bbea7B" as Address;
export const USDC = "0x3600000000000000000000000000000000000000" as Address;
export const SWAP_ROUTER = "0x53bf6b0684ec7ef91e1387da3d1a1769bc5a6f77" as Address;
export const QUOTER = "0x7dfd4f31be6814d2906bde155c3e1b146eac1468" as Address;

// Swap of existing tokens: 1.5% Arcodex fee, split 80/20 (1.2% / 0.3%)
export const FEE_BPS = 150n;
export const CREATOR_SHARE_BPS = 8000n;
export const PLATFORM_SHARE_BPS = 2000n;

// Newly launched tokens (bonding curve): 1.0% fee, split 80/20 (0.8% / 0.2%)
export const LAUNCH_FEE_BPS = 100n;

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
