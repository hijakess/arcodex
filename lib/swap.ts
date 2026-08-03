// Arcodex on-chain swap configuration (Arc chain, chainId 5042)
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";

export type { Address, Hex } from "viem";

export const ARC_CHAIN = {
  id: 5042,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://arcanine.lol/api/rpc"] } },
} as const;

// Deployed contracts (Arc mainnet)
export const ARCODEX_BONDING = "0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0" as Address;
export const ARCODEX_FEE_ROUTER = "0x8FcA8fB88337BdedA54AA28227E1294923f5ca52" as Address;
export const USDC = "0x3600000000000000000000000000000000000000" as Address;
export const SWAP_ROUTER = "0x53bf6b0684ec7ef91e1387da3d1a1769bc5a6f77" as Address;
export const QUOTER = "0x7dfd4f31be6814d2906bde155c3e1b146eac1468" as Address;
// Platform fee treasury — receives the flat $1 launch fee per deploy.
export const PLATFORM_TREASURY = "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3" as Address;
// Flat launch fee: 1 USDC (6 decimals) per token deployment, + gas.
export const LAUNCH_FEE_USDC = 1_000_000n;

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
// NOTE: every ABI MUST go through parseAbi() — viem throws
// "Cannot use 'in' operator to search for 'name'" on raw string arrays.

export const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

export const FEE_ROUTER_ABI = parseAbi([
  "function swapExactInput(address router, address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum) returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function creatorClaimable(address) view returns (uint256)",
  "function platformClaimable(address) view returns (uint256)",
]);

export const QUOTER_ABI = parseAbi([
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) view returns (uint256)",
]);

// Some RadarDex quoters only accept the struct form.
export const QUOTER_ABI_STRUCT = parseAbi([
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) view returns (uint256)",
]);

// ---- Clients ----

/**
 * Public client for reads/simulates. Browser NEVER hits the public RPC
 * directly (Railway rate-limits per-IP, arcanine rejects foreign Origins);
 * every call goes through the server-side /api/rpc proxy instead.
 * Client-side timeout guards against a hung proxy (Vercel cold start etc).
 */
export function publicClient() {
  return createPublicClient({
    chain: ARC_CHAIN,
    transport: http("/api/rpc", { timeout: 9000 }),
  });
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
  // Struct form first — this quoter (RadarDex V3) rejects the flat form with
  // an RPC-level error ("project ID exceeded quota" / "not a valid request"),
  // which the proxy used to retry and blow the Vercel 10s budget. Struct is
  // the form the contract actually accepts; flat stays only as a fallback.
  try {
    const q = await client.readContract({
      address: QUOTER,
      abi: QUOTER_ABI_STRUCT,
      functionName: "quoteExactInputSingle",
      args: [{ tokenIn, tokenOut, amountIn, fee: poolFee, sqrtPriceLimitX96: 0n }],
    });
    return BigInt(q as bigint);
  } catch {
    const q = await client.readContract({
      address: QUOTER,
      abi: QUOTER_ABI,
      functionName: "quoteExactInputSingle",
      args: [tokenIn, tokenOut, amountIn, poolFee, 0n],
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
  // Verified on mainnet: this router actually burns ~160k gas, but Railway's
  // eth_estimateGas returns ~15.2M (~100x over) and with viem's default 44 gwei
  // tip that demands 0.67 USDC of gas — small wallets then fail with
  // "insufficient funds for gas". Fix: cap tip at 1 gwei (base is 20 gwei) and
  // set a generous fixed gas limit; unused gas is refunded, so the real cost
  // stays ~0.003 USDC.
  const txHash = await client.writeContract({
    ...request,
    maxFeePerGas: 22n * 10n ** 9n,
    maxPriorityFeePerGas: 1n * 10n ** 9n,
    gas: 500_000n,
  } as any);
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

/** Current USDC/token allowance granted to the fee router. */
export async function getAllowance(
  account: Address,
  token: Address
): Promise<bigint> {
  const client = publicClient();
  const r = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [account, ARCODEX_FEE_ROUTER],
  });
  return BigInt(r as bigint);
}

// ---- Bonding curve (launch tokens) ----

export const BONDING_ABI = parseAbi([
  "function launchToken(string name, string symbol, string description, string website, string twitter, string telegram, string discord, uint256 supply, uint256 startingPrice, uint256 graduationThreshold, address creatorFeeWallet, uint8 bondingType, address[] whitelist) returns (address token)",
  "function buy(address token, uint256 usdcIn)",
  "function sell(address token, uint256 tokensIn)",
  "function tokenCount() view returns (uint256)",
  "function tokenList(uint256) view returns (address)",
  "function tokens(address) view returns (address token, address creator, address creatorFeeWallet, string name, string symbol, string website, string twitter, string telegram, string discord, uint256 supply, uint256 startingPrice, uint256 graduationThreshold, uint256 sold, uint256 totalCollected, uint256 creatorClaimable, uint256 platformClaimable, uint8 bondingType, bool graduated, address pool)",
  "function pendingHolderRewards(address token, address holder) view returns (uint256)",
  "function claimHolderRewards(address token)",
  "function claimCreatorFees(address token)",
  "function holderRewardPool(address) view returns (uint256)",
  "function accRewardPerShare(address) view returns (uint256)",
  "function claimedHolderRewards(address,address) view returns (uint256)",
  "function FEE_BPS() view returns (uint256)",
  "function CREATOR_SHARE_BPS() view returns (uint256)",
  "function PLATFORM_SHARE_BPS() view returns (uint256)",
  "function HOLDER_SHARE_BPS() view returns (uint256)",
] as const);

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

/** Claim creator fees (USDC) accrued by a launched token's creator. */
export async function claimCreatorFees(
  provider: unknown,
  account: Address,
  token: Address
): Promise<Hex> {
  const client = walletClient(provider);
  const { request } = await publicClient().simulateContract({
    address: ARCODEX_BONDING,
    abi: BONDING_ABI,
    functionName: "claimCreatorFees",
    args: [token],
    account,
  });
  return client.writeContract(request);
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

export interface ArcodexTokenInfo {
  token: string;
  creator: string;
  creatorFeeWallet: string;
  name: string;
  symbol: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  supply: bigint;
  startingPrice: bigint; // USDC per token, 6 decimals
  graduationThreshold: bigint;
  sold: bigint;
  totalCollected: bigint;
  creatorClaimable: bigint;
  platformClaimable: bigint;
  bondingType: 0 | 1; // 0=standard, 1=early-buy
  graduated: boolean;
  pool: string;
}

/** Read a single token's info from the bonding curve. */
export async function getArcodexTokenInfo(
  token: Address
): Promise<ArcodexTokenInfo | null> {
  const client = publicClient();
  try {
    const info = (await client.readContract({
      address: ARCODEX_BONDING,
      abi: BONDING_ABI,
      functionName: "tokens",
      args: [token],
    })) as readonly unknown[];
    if (info[0] === "0x0000000000000000000000000000000000000000") return null;
    return {
      token: info[0] as string,
      creator: info[1] as string,
      creatorFeeWallet: info[2] as string,
      name: info[3] as string,
      symbol: info[4] as string,
      website: info[5] as string,
      twitter: info[6] as string,
      telegram: info[7] as string,
      discord: info[8] as string,
      supply: BigInt(info[9] as bigint),
      startingPrice: BigInt(info[10] as bigint),
      graduationThreshold: BigInt(info[11] as bigint),
      sold: BigInt(info[12] as bigint),
      totalCollected: BigInt(info[13] as bigint),
      creatorClaimable: BigInt(info[14] as bigint),
      platformClaimable: BigInt(info[15] as bigint),
      bondingType: (Number(info[16]) as 0 | 1),
      graduated: info[17] as boolean,
      pool: info[18] as string,
    };
  } catch {
    return null;
  }
}

/** Deterministic SVG placeholder for tokens without an image. */
export function placeholderImage(symbol: string, address: string): string {
  const s = symbol.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "?";
  // hue from the address so each token gets a stable colour
  const hue = (parseInt(address.slice(2, 10), 16) || 190) % 360;
  const hue2 = (hue + 40) % 360;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='hsl(${hue},70%,28%)'/><stop offset='1' stop-color='hsl(${hue2},70%,16%)'/></linearGradient></defs><rect width='320' height='320' fill='url(#g)'/><text x='50%' y='54%' font-family='monospace' font-size='88' font-weight='bold' fill='rgba(255,255,255,0.92)' text-anchor='middle' dominant-baseline='middle'>${s}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Fetch ALL tokens launched on the Arcodex bonding curve, newest first.
 * Uses tokenCount + tokenList + tokens(address). No mock data.
 * Retries transient RPC errors (Railway is rate-limited).
 */
async function readWithRetry<T>(fn: () => Promise<T>, retries = 4): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = String(e?.shortMessage || e?.message || e || "");
      const transient =
        msg.includes("limit") ||
        msg.includes("429") ||
        msg.includes("599") ||
        msg.includes("timeout") ||
        msg.includes("fetch");
      if (!transient || attempt >= retries) throw e;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}

export async function getArcodexTokens(): Promise<ArcodexTokenInfo[]> {
  const client = publicClient();
  const count = Number(
    await readWithRetry(() =>
      client.readContract({
        address: ARCODEX_BONDING,
        abi: BONDING_ABI,
        functionName: "tokenCount",
      })
    )
  );
  if (count === 0) return [];

  // read the token list (sequential to be gentle on the RPC)
  const addresses: Address[] = [];
  for (let i = 0; i < count; i++) {
    const addr = await readWithRetry(() =>
      client.readContract({
        address: ARCODEX_BONDING,
        abi: BONDING_ABI,
        functionName: "tokenList",
        args: [BigInt(i)],
      })
    );
    addresses.push(addr as Address);
  }

  const tokens: ArcodexTokenInfo[] = [];
  for (const addr of addresses) {
    const info = await readWithRetry(() => getArcodexTokenInfo(addr));
    if (info) tokens.push(info);
  }
  return tokens.reverse(); // newest first
}
