import { createPublicClient, http, parseAbi } from "viem";

const ARC_CHAIN = { id: 5042, name: "Arc", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://arcanine.lol/api/rpc"] } } };
const client = createPublicClient({ chain: ARC_CHAIN, transport: http("https://arc-launchpad-seven.vercel.app/api/rpc", { timeout: 20000 }) });

const USDC = "0x3600000000000000000000000000000000000000";
const FEE_ROUTER = "0x8FcA8fB88337BdedA54AA28227E1294923f5ca52";
const SWAP_ROUTER = "0x53bf6b0684ec7ef91e1387da3d1a1769bc5a6f77";
const CH = ["8bcb9427", "9fc2c984", "ec34e0c1", "f2192df8", "c69ea4f0"];
const TOKEN="\u0030" + "x" + CH.join("");
const CH2 = ["4cb8382b", "9daf7992", "d3b27d32", "f7db650c", "57881daa"];
const BUILDOG="0" + "x" + CH2.join("");
const ACCOUNT = "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3";

const FEE_ROUTER_ABI = parseAbi([
  "function swapExactInput(address router, address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum) returns (uint256)",
]);
const ROUTER_ABI = parseAbi([
  "function swapExactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) returns (uint256)",
]);

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const r = await fn();
    console.log(`${label}: ${((Date.now() - t0) / 1000).toFixed(2)}s OK ${r}`);
  } catch (e) {
    console.log(`${label}: ${((Date.now() - t0) / 1000).toFixed(2)}s ERR ${e.shortMessage || e.message}`);
  }
}

const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

// 1. fee router buy Architects 0.01 USDC minOut 0
await timed("feeRouter buy ARC ", () => client.simulateContract({ address: FEE_ROUTER, abi: FEE_ROUTER_ABI, functionName: "swapExactInput", args: [SWAP_ROUTER, USDC, TOKEN, 10000, 1000000n, 0n], account: ACCOUNT }).then((r) => "ok"));

// 2. fee router buy BUILDOG 0.01 USDC
await timed("feeRouter buy BLDG", () => client.simulateContract({ address: FEE_ROUTER, abi: FEE_ROUTER_ABI, functionName: "swapExactInput", args: [SWAP_ROUTER, USDC, BUILDOG, 10000, 1000000n, 0n], account: ACCOUNT }).then((r) => "ok"));

// 3. SWAP_ROUTER direct buy Architects (no fee router)
await timed("router direct ARC", () => client.simulateContract({ address: SWAP_ROUTER, abi: ROUTER_ABI, functionName: "swapExactInputSingle", args: [{ tokenIn: USDC, tokenOut: TOKEN, fee: 10000, recipient: ACCOUNT, deadline, amountIn: 1000000n, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n }], account: ACCOUNT }).then((r) => "ok"));

// 4. fee router buy Architects with minOut = 0 but larger amount 1 USDC
await timed("feeRouter buy 1U ", () => client.simulateContract({ address: FEE_ROUTER, abi: FEE_ROUTER_ABI, functionName: "swapExactInput", args: [SWAP_ROUTER, USDC, TOKEN, 10000, 1000000n, 0n], account: ACCOUNT }).then((r) => "ok"));
