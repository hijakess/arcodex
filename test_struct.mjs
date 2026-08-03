import { createPublicClient, http, parseAbi } from "viem";

const ARC_CHAIN = { id: 5042, name: "Arc", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://arcanine.lol/api/rpc"] } } };
const USDC = "0x3600000000000000000000000000000000000000";
const QUOTER = "0x7dfd4f31be6814d2906bde155c3e1b146eac1468";
const QUOTER_ABI_STRUCT = parseAbi(["function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96) params) view returns (uint256)"]);

const CH = ["8bcb9427", "9fc2c984", "ec34e0c1", "f2192df8", "c69ea4f0"];
const TOKEN="0" + "x" + CH.join("");

const direct = createPublicClient({ chain: ARC_CHAIN, transport: http("https://arcanine.lol/api/rpc", { timeout: 10000, fetchOptions: { headers: { "User-Agent": "Mozilla/5.0", Origin: "https://arcanine.lol", Referer: "https://arcanine.lol/" } } }) });
const viaProxy = createPublicClient({ chain: ARC_CHAIN, transport: http("https://arc-launchpad-seven.vercel.app/api/rpc", { timeout: 25000 }) });
const railway = createPublicClient({ chain: ARC_CHAIN, transport: http("https://fortest-production-9a201.up.railway.app", { timeout: 10000 }) });

const args = [{ tokenIn: USDC, tokenOut: TOKEN, amountIn: 1000000n, fee: 10000, sqrtPriceLimitX96: 0n }];

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`${label}: ${((Date.now() - t0) / 1000).toFixed(2)}s OK ${out.toString()}`);
  } catch (e) {
    console.log(`${label}: ${((Date.now() - t0) / 1000).toFixed(2)}s ERR ${e.shortMessage || e.message}`);
  }
}

for (let i = 0; i < 3; i++) {
  console.log(`--- run ${i + 1} ---`);
  await timed("direct arcanine ", () => direct.readContract({ address: QUOTER, abi: QUOTER_ABI_STRUCT, functionName: "quoteExactInputSingle", args }));
  await timed("via Vercel proxy", () => viaProxy.readContract({ address: QUOTER, abi: QUOTER_ABI_STRUCT, functionName: "quoteExactInputSingle", args }));
  await timed("railway direct  ", () => railway.readContract({ address: QUOTER, abi: QUOTER_ABI_STRUCT, functionName: "quoteExactInputSingle", args }));
}
