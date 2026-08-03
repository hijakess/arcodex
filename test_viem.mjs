import { createPublicClient, http, parseAbi } from "viem";

const ARC_CHAIN = { id: 5042, name: "Arc", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://arcanine.lol/api/rpc"] } } };
const client = createPublicClient({ chain: ARC_CHAIN, transport: http("https://arc-launchpad-seven.vercel.app/api/rpc") });

const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const QUOTER_ABI = parseAbi(["function quoteExactInputSingle(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) view returns (uint256)"]);

const USDC = "0x3600000000000000000000000000000000000000";
const TOKEN = "0x8bcb94279fc2c984ec34e0c1f2192df8c69ea4f0"; // Architects
const QUOTER = "0x7dfd4f31be6814d2906bde155c3e1b146eac1468";
const HOLDER = "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3";

// 1) chainId via proxy
console.log("chainId:", await client.getChainId());

// 2) USDC balance via proxy
try {
  const bal = await client.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [HOLDER] });
  console.log("USDC balance:", bal.toString());
} catch (e) { console.log("USDC balance err:", e.message); }

// 3) quote USDC->TOKEN via proxy, try fee tiers 10000, 3000, 500, 100
for (const fee of [10000, 3000, 500, 100]) {
  try {
    const q = await client.readContract({ address: QUOTER, abi: QUOTER_ABI, functionName: "quoteExactInputSingle", args: [USDC, TOKEN, 1000000n, fee, 0n] });
    console.log(`quote fee=${fee}:`, q.toString());
  } catch (e) { console.log(`quote fee=${fee} err:`, e.shortMessage || e.message); }
}
