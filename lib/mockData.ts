import { Token, Trade, Holding, BondingType } from "./types";

// Mock data layer for the Arc launchpad.
// Replace with real Arc chain + bonding curve data when the contract is live.

const now = Date.now();
const h = 3600_000;

export const CHAIN = {
  name: "Arc",
  nativeSymbol: "USDC",
  rpc: process.env.NEXT_PUBLIC_ARC_RPC || "",
  explorer: process.env.NEXT_PUBLIC_ARC_EXPLORER || "https://arc.blockscout.com",
};

export const BONDING_TYPES: { value: BondingType; label: string; desc: string }[] = [
  {
    value: "standard",
    label: "Standard",
    desc: "Linear bonding curve. Open to everyone from block one.",
  },
  {
    value: "early-buy",
    label: "Early Buy",
    desc: "Whitelisted early buyers get first access before public trading.",
  },
];

export const tokens: Token[] = [
  {
    address: "0xARC11111111111111111111111111111111111111",
    symbol: "ARCL",
    name: "Arc Light",
    description: "The first light on Arc. Native USDC gas, zero friction.",
    image: "/tokens/arcl.svg",
    bondingType: "standard",
    priceUsdc: 0.0042,
    mcapUsdc: 184_320,
    supply: 43_886_000,
    change24h: 18.4,
    volume24h: 96_540,
    holders: 1284,
    bondingProgress: 38,
    trades24h: 2140,
    createdAt: now - 26 * h,
    creator: {
      wallet: "0xAbC1...9f3E",
      xHandle: "arclight",
      feeBps: 100,
      claimed: 240,
      claimable: 62.5,
    },
    tags: ["infra", "community"],
  },
  {
    address: "0xARC22222222222222222222222222222222222222",
    symbol: "GRID",
    name: "Grid Runner",
    description: "Speedrun the grid. Lowest latency swaps on Arc.",
    image: "/tokens/grid.svg",
    bondingType: "early-buy",
    priceUsdc: 0.0137,
    mcapUsdc: 274_000,
    supply: 20_000_000,
    change24h: -6.2,
    volume24h: 41_230,
    holders: 842,
    bondingProgress: 61,
    trades24h: 1320,
    createdAt: now - 52 * h,
    creator: {
      wallet: "0xDef2...77aA",
      xHandle: "gridrunner",
      feeBps: 100,
      claimed: 310,
      claimable: 0,
    },
    tags: ["gaming", "speed"],
  },
  {
    address: "0xARC33333333333333333333333333333333333333",
    symbol: "NOVA",
    name: "Nova Terminal",
    description: "Terminal for on-chain agents. Build, deploy, trade.",
    image: "/tokens/nova.svg",
    bondingType: "standard",
    priceUsdc: 0.00092,
    mcapUsdc: 55_200,
    supply: 60_000_000,
    change24h: 42.7,
    volume24h: 128_900,
    holders: 2103,
    bondingProgress: 12,
    trades24h: 3860,
    createdAt: now - 9 * h,
    creator: {
      wallet: "0x8aB3...1cD9",
      xHandle: "novaterminal",
      feeBps: 200,
      claimed: 0,
      claimable: 118.2,
    },
    tags: ["ai", "agents"],
  },
  {
    address: "0xARC44444444444444444444444444444444444444",
    symbol: "FLUX",
    name: "Flux Bridge",
    description: "Cross-chain liquidity moving at the speed of light.",
    image: "/tokens/flux.svg",
    bondingType: "early-buy",
    priceUsdc: 0.051,
    mcapUsdc: 510_000,
    supply: 10_000_000,
    change24h: 3.1,
    volume24h: 22_480,
    holders: 521,
    bondingProgress: 84,
    trades24h: 640,
    createdAt: now - 88 * h,
    creator: {
      wallet: "0xEc5D...4fB2",
      xHandle: "fluxbridge",
      feeBps: 100,
      claimed: 890,
      claimable: 41.7,
    },
    tags: ["bridge", "defi"],
  },
  {
    address: "0xARC55555555555555555555555555555555555555",
    symbol: "PULSE",
    name: "Pulse Protocol",
    description: "Heartbeat of the Arc ecosystem. Staking, yield, vibes.",
    image: "/tokens/pulse.svg",
    bondingType: "standard",
    priceUsdc: 0.0077,
    mcapUsdc: 115_500,
    supply: 15_000_000,
    change24h: -12.8,
    volume24h: 33_750,
    holders: 968,
    bondingProgress: 47,
    trades24h: 1530,
    createdAt: now - 40 * h,
    creator: {
      wallet: "0x1F9e...8cA1",
      xHandle: "pulseprotocol",
      feeBps: 150,
      claimed: 175,
      claimable: 12.4,
    },
    tags: ["defi", "staking"],
  },
  {
    address: "0xARC66666666666666666666666666666666666666",
    symbol: "ZERO",
    name: "Zero Gas",
    description: "Gasless meta-transactions for the next billion users.",
    image: "/tokens/zero.svg",
    bondingType: "early-buy",
    priceUsdc: 0.0021,
    mcapUsdc: 42_000,
    supply: 20_000_000,
    change24h: 9.6,
    volume24h: 18_300,
    holders: 356,
    bondingProgress: 21,
    trades24h: 720,
    createdAt: now - 17 * h,
    creator: {
      wallet: "0xBb77...2eD0",
      xHandle: "zerogas",
      feeBps: 100,
      claimed: 0,
      claimable: 27.9,
    },
    tags: ["infra", "gasless"],
  },
  {
    address: "0xARC77777777777777777777777777777777777777",
    symbol: "ECHO",
    name: "Echo Social",
    description: "Social graph on-chain. Follow, tip, monetize.",
    image: "/tokens/echo.svg",
    bondingType: "standard",
    priceUsdc: 0.00043,
    mcapUsdc: 21_500,
    supply: 50_000_000,
    change24h: 27.3,
    volume24h: 64_100,
    holders: 1735,
    bondingProgress: 6,
    trades24h: 2950,
    createdAt: now - 4 * h,
    creator: {
      wallet: "0xCd12...9bB8",
      xHandle: "echosocial",
      feeBps: 200,
      claimed: 0,
      claimable: 4.1,
    },
    tags: ["social", "content"],
  },
  {
    address: "0xARC88888888888888888888888888888888888888",
    symbol: "VEGA",
    name: "Vega Markets",
    description: "Prediction markets for the Arc era.",
    image: "/tokens/vega.svg",
    bondingType: "standard",
    priceUsdc: 0.0188,
    mcapUsdc: 188_000,
    supply: 10_000_000,
    change24h: -2.4,
    volume24h: 51_920,
    holders: 1104,
    bondingProgress: 55,
    trades24h: 1870,
    createdAt: now - 64 * h,
    creator: {
      wallet: "0xEf90...3aC4",
      xHandle: "vegamarkets",
      feeBps: 100,
      claimed: 420,
      claimable: 0,
    },
    tags: ["prediction", "defi"],
  },
];

export const recentTrades: Trade[] = [
  { id: "t1", tokenAddress: tokens[2].address, wallet: "0x7fA2...91d0", isBuy: true, amountUsdc: 1200, tokenAmount: 1_304_347, time: now - 12_000, isCreator: false },
  { id: "t2", tokenAddress: tokens[0].address, wallet: "0x3bC9...5eF1", isBuy: true, amountUsdc: 450, tokenAmount: 107_142, time: now - 23_000, isCreator: false },
  { id: "t3", tokenAddress: tokens[2].address, wallet: "0x8aB3...1cD9", isBuy: true, amountUsdc: 5000, tokenAmount: 5_434_782, time: now - 41_000, isCreator: true },
  { id: "t4", tokenAddress: tokens[4].address, wallet: "0xDe4f...22b6", isBuy: false, amountUsdc: 900, tokenAmount: 116_883, time: now - 67_000, isCreator: false },
  { id: "t5", tokenAddress: tokens[6].address, wallet: "0x1Ae8...77c3", isBuy: true, amountUsdc: 210, tokenAmount: 488_372, time: now - 95_000, isCreator: false },
  { id: "t6", tokenAddress: tokens[1].address, wallet: "0x5fD0...9a12", isBuy: true, amountUsdc: 3000, tokenAmount: 218_978, time: now - 140_000, isCreator: false },
];

export const myHoldings: Holding[] = [
  { tokenAddress: tokens[2].address, symbol: "NOVA", name: "Nova Terminal", image: tokens[2].image, amount: 2_400_000, avgCostUsdc: 0.00061, currentPriceUsdc: 0.00092, pnlUsdc: 744 },
  { tokenAddress: tokens[0].address, symbol: "ARCL", name: "Arc Light", image: tokens[0].image, amount: 850_000, avgCostUsdc: 0.0038, currentPriceUsdc: 0.0042, pnlUsdc: 340 },
  { tokenAddress: tokens[6].address, symbol: "ECHO", name: "Echo Social", image: tokens[6].image, amount: 6_000_000, avgCostUsdc: 0.00039, currentPriceUsdc: 0.00043, pnlUsdc: 240 },
];

export const claimableFees = tokens
  .filter((t) => t.creator.claimable > 0)
  .map((t) => ({
    tokenAddress: t.address,
    symbol: t.symbol,
    name: t.name,
    image: t.image,
    claimable: t.creator.claimable,
    feeBps: t.creator.feeBps,
  }));

export function formatUsdc(n: number, decimals = 2): string {
  if (!isFinite(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(decimals)}`;
  // micro prices: keep significant digits instead of collapsing to 0.0000
  return `$${Number(n.toPrecision(6)).toString()}`;
}

export function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const hh = Math.floor(m / 60);
  if (hh < 24) return `${hh}h ago`;
  return `${Math.floor(hh / 24)}d ago`;
}

export function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
