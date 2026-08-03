import { createPublicClient, http, parseAbi } from "viem";

const ARC_CHAIN = { id: 5042, name: "Arc", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: { default: { http: ["https://arcanine.lol/api/rpc"] } } };
const client = createPublicClient({ chain: ARC_CHAIN, transport: http("https://arc-launchpad-seven.vercel.app/api/rpc", { timeout: 20000 }) });

const USDC = "0x3600000000000000000000000000000000000000";
const FEE_ROUTER = "0x8FcA8fB88337BdedA54AA28227E1294923f5ca52";
const SWAP_ROUTER = "0x53bf6b0684ec7ef91e1387da3d1a1769bc5a6f77";
const CH = ["8bcb9427", "9fc2c984", "ec34e0c1", "f2192df8", "c69ea4f0"];
const TOKEN="0" + "x" + CH.join("");
const ACCOUNT = "0x04FA941F3fa799f86fE9207D1c77eE4F3331B2f3";

const FEE_ROUTER_ABI = parseAbi([
  "function swapExactInput(address router, address tokenIn, address tokenOut, uint24 poolFee, uint256 amountIn, uint256 amountOutMinimum) returns (uint256)",
  "function feeBps() view returns (uint256)",
]);
const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
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

console.log("--- BUY flow (0.01 USDC -> Architects) ---");
// approve USDC -> FEE_ROUTER (simulate)
await timed("simulate approve ", () => client.simulateContract({
  address: USDC, abi: ERC20_ABI, functionName: "approve",
  args: [FEE_ROUTER, 2n ** 256n - 1n], account: ACCOUNT,
}).then((r) => "ok gas=" + r.request.gas));
// simulate swapExactInput buy
await timed("simulate swap buy", () => client.simulateContract({
  address: FEE_ROUTER, abi: FEE_ROUTER_ABI, functionName: "swapExactInput",
  args: [SWAP_ROUTER, USDC, TOKEN, 10000, 1000000n, 0n], account: ACCOUNT,
}).then((r) => "ok gas=" + r.request.gas));

console.log("--- SELL flow (100 Architects -> USDC) ---");
await timed("simulate swap sell", () => client.simulateContract({
  address: FEE_ROUTER, abi: FEE_ROUTER_ABI, functionName: "swapExactInput",
  args: [SWAP_ROUTER, TOKEN, USDC, 10000, 100000000000000000000n, 0n], account: ACCOUNT,
}).then((r) => "ok gas=" + r.request.gas));

console.log("--- balances ---");
await timed("USDC bal   ", () => client.readContract({ address: USDC, abi: ERC20_ABI, functionName: "balanceOf", args: [ACCOUNT] }).then((b) => (Number(b) / 1e6).toFixed(4)));
await timed("TOKEN bal  ", () => client.readContract({ address: TOKEN, abi: ERC20_ABI, functionName: "balanceOf", args: [ACCOUNT] }).then((b) => (Number(b) / 1e18).toFixed(4)));
await timed("allowance  ", () => client.readContract({ address: USDC, abi: ERC20_ABI, functionName: "allowance", args: [ACCOUNT, FEE_ROUTER] }).then((b) => b.toString()));
