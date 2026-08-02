// Live token feed from RadarDex (https://radardex.app)
// CORS is open (access-control-allow-origin: *), so the browser can
// fetch directly — real-time data, no backend needed.
// Falls back to static arcTokens when the API is unreachable.

import { ArcToken } from "./arcTokens";

const RADAR_API = "https://web-production-efe27.up.railway.app";
const FALLBACK_IMAGE = "/tokens/arcl.svg";

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
