// Live token feed from RadarDex (https://radardex.app)
// CORS is open (access-control-allow-origin: *), so the browser can
// fetch directly — real-time data, no backend needed.
// Falls back to static arcTokens when the API is unreachable.

import { ArcToken } from "./arcTokens";
import { placeholderImage } from "./swap";

const RADAR_API = "https://web-production-efe27.up.railway.app";
const FALLBACK_IMAGE = "/tokens/arcl.svg";

// Chart timeframes: Arcodex tab → RadarDex API tf (seconds per candle)
// limit is chosen so the visible window matches the tab label:
//   1H → 1m candles × 120 ≈ 2h   (enough for a chart)
//   1D → 15m candles × 96  = 24h
//   1W → 1h candles × 168  = 7d
//   1M → 6h candles × 120  = 30d
export const CHART_TFS: Record<string, { tf: number; limit: number }> = {
  "1H": { tf: 60, limit: 120 },
  "1D": { tf: 900, limit: 96 },
  "1W": { tf: 3600, limit: 168 },
  "1M": { tf: 21600, limit: 120 },
};

export interface RadarCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
}

export interface RadarSwap {
  side: "buy" | "sell";
  version: string;
  usdc: number;
  token: number;
  price: number;
  trader: string;
  txHash: string;
  time: number;
}

interface RadarTokenRaw {
  address: string;
  symbol: string;
  name: string;
  price: number;
  mcap: number;
  change24h: number | null;
  volume24: number;
  txns24: number;
  traders24: number;
  liquidityUsdc: number;
  ageSec: number;
  icon: string | null;
  hasUsdc: boolean;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  discord: string | null;
}

interface RadarTokenDetailRaw extends RadarTokenRaw {
  bestPool: string | null;
}

function cleanUrl(u: string | null): string | undefined {
  if (!u) return undefined;
  const s = u.trim();
  if (!s || s === "null") return undefined;
  return s;
}

// API returns full URLs for socials (e.g. https://x.com/handle).
// Arcodex expects bare handles, so strip the origin.
function handleFrom(url: string | null): string | undefined {
  const u = cleanUrl(url);
  if (!u) return undefined;
  const m = u.match(/(?:x\.com|twitter\.com|t\.me|telegram\.me|discord\.gg|discord\.com\/invite)\/([A-Za-z0-9_]+)/i);
  if (m) return m[1];
  return u.replace(/^https?:\/\//, "").split("/")[0] || undefined;
}

function mapToken(t: RadarTokenRaw, poolAddress?: string): ArcToken {
  return {
    address: t.address,
    fullAddress: t.address,
    symbol: t.symbol,
    name: t.name,
    image: t.icon || FALLBACK_IMAGE,
    launchpad: "RadarDex",
    priceUsdc: t.price ?? 0,
    mcapUsdc: t.mcap ?? 0,
    change24h: t.change24h ?? 0,
    volume24h: t.volume24 ?? 0,
    holders: t.traders24 ?? 0, // RadarDex exposes 24h traders, not holder count
    liquidityUsdc: t.liquidityUsdc ?? 0,
    ageH: (t.ageSec ?? 0) / 3600,
    website: cleanUrl(t.website),
    twitter: handleFrom(t.twitter),
    telegram: handleFrom(t.telegram),
    discord: handleFrom(t.discord),
    poolAddress: poolAddress ?? "",
  };
}

/** Fetch the top tokens by 24h volume that have USDC liquidity. */
export async function fetchRadarTokens(limit = 500): Promise<ArcToken[]> {
  const url = `${RADAR_API}/tokens?sort=volume24&dir=desc&limit=${limit}&window=24h`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`RadarDex API ${r.status}`);
  const d = await r.json();
  const list: RadarTokenRaw[] = Array.isArray(d?.tokens) ? d.tokens : [];
  return list
    .filter((t) => t.hasUsdc && (t.liquidityUsdc ?? 0) > 0)
    .map((t) => mapToken(t));
}

/** Fetch a single token detail (includes best pool address). */
export async function fetchRadarToken(address: string): Promise<ArcToken | null> {
  try {
    const r = await fetch(`${RADAR_API}/token/${address}`);
    if (!r.ok) return null;
    const t = (await r.json()) as RadarTokenDetailRaw;
    if (!t?.address) return null;
    return mapToken(t, t.bestPool ?? undefined);
  } catch {
    return null;
  }
}

// ---- On-chain fallback (tokens launched on the Arcodex bonding curve) ----
// RadarDex only indexes tokens that have a live pool; bonding-curve tokens
// that haven't graduated yet are invisible to it. When that happens we fall
// back to the Arcodex API route (which reads the bonding curve directly).

interface ChainTokenInfo {
  token: string;
  creator: string;
  creatorFeeWallet: string;
  name: string;
  symbol: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  supply: string;
  startingPrice: string;
  graduationThreshold: string;
  sold: string;
  totalCollected: string;
  creatorClaimable: string;
  platformClaimable: string;
  bondingType: number;
  graduated: boolean;
  pool: string;
}

function chainToArcToken(info: ChainTokenInfo): ArcToken {
  const startingPrice = Number(info.startingPrice) / 1e6;
  const threshold = Math.max(1, Number(info.graduationThreshold) / 1e18);
  const sold = Number(info.sold) / 1e18;
  const price = startingPrice * (1 + sold / threshold);
  const supply = Number(info.supply) / 1e18;
  const cleanPool = /^0x0+$|^0x0x0+$/.test(info.pool) ? "" : info.pool;
  return {
    address: info.token,
    fullAddress: info.token,
    symbol: info.symbol,
    name: info.name,
    image: placeholderImage(info.symbol, info.token),
    launchpad: "Arcodex",
    priceUsdc: price,
    mcapUsdc: price * supply,
    change24h: 0,
    volume24h: Number(info.totalCollected) / 1e6,
    holders: 0,
    liquidityUsdc: 0,
    ageH: 0,
    website: info.website || undefined,
    twitter: info.twitter ? info.twitter.replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//, "") : undefined,
    telegram: info.telegram || undefined,
    discord: info.discord || undefined,
    poolAddress: cleanPool,
  };
}

/** Fetch a token from the Arcodex bonding curve (server-side API route). */
export async function fetchChainToken(address: string): Promise<ArcToken | null> {
  try {
    const r = await fetch("/api/arcodex-tokens", { cache: "no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    const list: ChainTokenInfo[] = Array.isArray(d?.tokens) ? d.tokens : [];
    const info = list.find(
      (t) => t.token.toLowerCase() === address.toLowerCase()
    );
    return info ? chainToArcToken(info) : null;
  } catch {
    return null;
  }
}

/** Fetch token: RadarDex first, then the on-chain bonding curve fallback. */
export async function fetchTokenOrChain(address: string): Promise<ArcToken | null> {
  const radar = await fetchRadarToken(address);
  if (radar) return radar;
  return fetchChainToken(address);
}

/** Fetch real candlesticks for a token. tf is seconds per candle. */
export async function fetchRadarChart(
  address: string,
  tf: number,
  limit = 1000
): Promise<RadarCandle[]> {
  try {
    const r = await fetch(`${RADAR_API}/token/${address}/chart?tf=${tf}&limit=${limit}`);
    if (!r.ok) throw new Error(`chart ${r.status}`);
    const d = await r.json();
    return Array.isArray(d?.candles) ? d.candles : [];
  } catch {
    return [];
  }
}

/** Fetch the most recent swaps for a token. */
export async function fetchRadarSwaps(
  address: string,
  limit = 30
): Promise<RadarSwap[]> {
  try {
    const r = await fetch(`${RADAR_API}/token/${address}/swaps?limit=${limit}`);
    if (!r.ok) throw new Error(`swaps ${r.status}`);
    const d = await r.json();
    return Array.isArray(d?.swaps) ? d.swaps : [];
  } catch {
    return [];
  }
}
