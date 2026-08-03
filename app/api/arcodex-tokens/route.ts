// Server-side route: reads Arcodex-launched tokens from the bonding curve.
// The Railway RPC is heavily rate-limited per-IP, so the browser never talks
// to it directly — Vercel's server fetches once per cache window (60s) and
// the client just consumes this JSON. No LLM, no backend infra, pure edge.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RPC = "https://arcanine.lol/api/rpc";
const RPC_FALLBACK = "https://fortest-production-9a201.up.railway.app";
const CURVE = "0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0";

const SELECTOR = {
  tokenCount: "0x9f181b5e",
  tokenList: (i: bigint) =>
    `0x9ead7222${i.toString(16).padStart(64, "0")}`,
  tokens: (addr: string) =>
    `0xe4860339000000000000000000000000${addr.slice(2).toLowerCase()}`,
};

interface TokenRaw {
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// arcanine is fast; keep a tiny throttle only to stay under its per-project
// quota ("project ID exceeded quota"), then fall back to Railway.
let lastRpc = 0;
async function throttle() {
  const wait = Math.max(0, 200 - (Date.now() - lastRpc));
  if (wait > 0) await sleep(wait);
  lastRpc = Date.now();
}

async function rpcCall(method: string, params: unknown[], id: number, retries = 2) {
  const urls = [RPC, RPC_FALLBACK];
  for (let u = 0; u < urls.length; u++) {
    for (let attempt = 0; ; attempt++) {
      await throttle();
      try {
        const r = await fetch(urls[u], {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0",
            Origin: "https://arcanine.lol",
            Referer: "https://arcanine.lol/",
          },
          body: JSON.stringify({ jsonrpc: "2.0", method, params, id: id + u * 100 }),
          signal: AbortSignal.timeout(12000),
          cache: "no-store",
        });
        const j = await r.json();
        if (j.error) {
          const msg = String(j.error.message || "");
          if (/quota|rate limit|429|599|limit/i.test(msg) && attempt < retries) {
            await sleep(900 * (attempt + 1));
            continue;
          }
          throw new Error(msg);
        }
        return j.result;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (attempt < retries) {
          await sleep(900 * (attempt + 1));
          continue;
        }
        // give up on this URL, try the fallback
        break;
      }
    }
  }
  throw new Error("all RPC endpoints failed");
}

function decodeTokens(raw: string): TokenRaw {
  const hex = raw.slice(2);
  const slot = (start: number, len: number) => {
    const h = hex.slice(start * 64, (start + len) * 64).replace(/^0+/, "");
    return h ? "0x" + h : "0x0";
  };

  // dynamic types (strings + arrays) come after the fixed 19-slot header
  const head = (idx: number) => parseInt(slot(idx, 1), 16); // offset in bytes

  const addr = (h: string) => "0x" + h.slice(-40);
  const str = (dataIdx: number) => {
    const start = head(dataIdx); // bytes
    const word = start / 32;
    const len = parseInt(slot(word, 1), 16);
    const chars = hex.slice((word + 1) * 64, (word + 1) * 64 + len * 2);
    let s = "";
    for (let i = 0; i < chars.length; i += 2) {
      const c = parseInt(chars.slice(i, i + 2), 16);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  return {
    token: addr(slot(0, 1)),
    creator: addr(slot(1, 1)),
    creatorFeeWallet: addr(slot(2, 1)),
    name: str(3),
    symbol: str(4),
    website: str(5),
    twitter: str(6),
    telegram: str(7),
    discord: str(8),
    supply: BigInt(slot(9, 1)).toString(),
    startingPrice: BigInt(slot(10, 1)).toString(),
    graduationThreshold: BigInt(slot(11, 1)).toString(),
    sold: BigInt(slot(12, 1)).toString(),
    totalCollected: BigInt(slot(13, 1)).toString(),
    creatorClaimable: BigInt(slot(14, 1)).toString(),
    platformClaimable: BigInt(slot(15, 1)).toString(),
    bondingType: Number(BigInt(slot(16, 1))),
    graduated: BigInt(slot(17, 1)) !== 0n,
    pool: addr(slot(18, 1)),
  };
}

// ---- In-memory cache (per serverless instance) ----
let cacheData: { key: string; json: unknown; at: number } | null = null;
const CACHE_TTL = 120_000; // 2min in-memory
// CDN: fresh 2min, stale up to 10min (stale-while-revalidate) so the page
// always paints instantly and refreshes in the background.
const CDN_CACHE = "public, s-maxage=120, stale-while-revalidate=600";

/** Run async work with a concurrency cap (gentle on the RPC quota). */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, i: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function GET(req: Request) {
  // Optional ?holder=0x... adds per-holder data (balances + claimable fees)
  // so Profile can render real on-chain data without browser->RPC calls.
  const holder = new URL(req.url).searchParams.get("holder")?.toLowerCase() || "";
  const cacheKey = holder || "all";

  if (cacheData && cacheData.key === cacheKey && Date.now() - cacheData.at < CACHE_TTL) {
    return NextResponse.json(cacheData.json, {
      headers: { CDN_CACHE },
    });
  }
  try {
    const count = Number(BigInt(await rpcCall("eth_call", [{ to: CURVE, data: SELECTOR.tokenCount }, "latest"], 1)));

    // tokenList(i) for all i — run in parallel (4 at a time)
    const rawList = await mapLimit(
      Array.from({ length: count }, (_, i) => i),
      4,
      (i) => rpcCall("eth_call", [{ to: CURVE, data: SELECTOR.tokenList(BigInt(i)) }, "latest"], 100 + i)
    );
    const addresses = rawList.map((raw) => "0x" + raw.slice(-40));

    // tokens(address) for all addresses — parallel, 4 at a time
    const raws = await mapLimit(addresses, 4, (a, i) =>
      rpcCall("eth_call", [{ to: CURVE, data: SELECTOR.tokens(a) }, "latest"], 200 + i)
    );
    const tokens = raws.map(decodeTokens);

    const body: any = { count, tokens: tokens.reverse() };

    // Per-holder view: ERC20 balanceOf(token, holder) for every Arcodex token.
    // balanceOf(address) selector = 0x70a08231 + padded address.
    if (holder && /^0x[0-9a-f]{40}$/.test(holder)) {
      const balanceSel = `0x70a08231000000000000000000000000${holder.slice(2)}`;
      const balances = await mapLimit(addresses, 4, (a, i) =>
        rpcCall("eth_call", [{ to: a, data: balanceSel }, "latest"], 400 + i)
      );
      body.holdings = tokens.map((t, i) => ({
        token: t.token,
        symbol: t.symbol,
        name: t.name,
        balance: BigInt(balances[i] || "0x0").toString(),
      }));
    }

    cacheData = { key: cacheKey, json: body, at: Date.now() };
    return NextResponse.json(body, {
      headers: { CDN_CACHE },
    });
  } catch (e: any) {
    // serve stale cache if the RPC is down
    if (cacheData) {
      return NextResponse.json(cacheData.json, {
        headers: { CDN_CACHE },
      });
    }
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
