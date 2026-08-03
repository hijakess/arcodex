// Server-side JSON-RPC proxy for Arc (chainId 5042).
// The browser NEVER talks to the public RPC directly — Railway rate-limits
// per-IP and arcanine rejects foreign Origins — so all reads (balances,
// quotes, simulate, receipts) go through Vercel, which fetches arcanine
// (fast, no strict IP limit) with a Railway fallback.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RPC = "https://arcanine.lol/api/rpc";
const RPC_FALLBACK = "https://fortest-production-9a201.up.railway.app";

// Vercel Hobby kills serverless functions at 10s — every request MUST finish
// well under that. Per-fetch timeout is 5s; the whole call has a hard 8.5s
// deadline so the browser never sees a Vercel 504 / aborted fetch.
const FETCH_TIMEOUT_MS = 5000;
const TOTAL_DEADLINE_MS = 8500;

// Only forward safe read/estimate methods — never expose an open proxy.
const ALLOWED = new Set([
  "eth_call",
  "eth_estimateGas",
  "eth_chainId",
  "eth_blockNumber",
  "eth_gasPrice",
  "eth_maxPriorityFeePerGas",
  "eth_feeHistory",
  "eth_getBalance",
  "eth_getCode",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_getTransactionByHash",
  "eth_getLogs",
  "net_version",
]);

// Short-TTL cache for identical reads (auto-quote + click-Buy re-quote within
// 2s hit the cache instead of burning another RPC round-trip). Only eth_call /
// eth_getBalance / eth_getTransactionCount are cached — never receipts.
const CACHE_TTL_MS = 2000;
const cache = new Map<string, { at: number; result: unknown }>();
const CACHEABLE = new Set(["eth_call", "eth_getBalance", "eth_getTransactionCount", "eth_gasPrice"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRpc = 0;
async function throttle() {
  const wait = Math.max(0, 150 - (Date.now() - lastRpc));
  if (wait > 0) await sleep(wait);
  lastRpc = Date.now();
}

async function rpcCall(method: string, params: unknown[], id: number) {
  const urls = [RPC, RPC_FALLBACK];
  const start = Date.now();

  // Fire both endpoints in parallel and take the FIRST valid answer — do NOT
  // wait for the slowest runner. The public arcanine RPC is fast but
  // intermittently "rate limited" on heavy eth_call simulates; Railway is
  // slower but consistent. First-success keeps latency at the fastest node.
  const runners = urls.map((url, u) => {
    return (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (Date.now() - start > TOTAL_DEADLINE_MS - 1000) {
          return { ok: false as const, err: new Error("RPC deadline exceeded") };
        }
        await throttle();
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Mozilla/5.0",
              Origin: "https://arcanine.lol",
              Referer: "https://arcanine.lol/",
            },
            body: JSON.stringify({ jsonrpc: "2.0", method, params, id: id + u * 100 + attempt }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            cache: "no-store",
          });
          const j = await r.json();
          if (j.error) {
            const msg = String(j.error.message || "");
            // Contract reverts are real answers — pass through immediately.
            // Only transport-ish failures (timeout/rate-limit/429/599) retry.
            if (/timeout|rate limit|429|599|fetch|too many/i.test(msg) && attempt === 0) {
              await sleep(300 * (attempt + 1));
              continue;
            }
            return { ok: false as const, err: new Error(msg) };
          }
          return { ok: true as const, result: j.result };
        } catch (e: any) {
          const msg = String(e?.message || e);
          if (/timeout|fetch|network|abort|429|599|rate limit|too many/i.test(msg) && attempt === 0) {
            await sleep(300 * (attempt + 1));
            continue;
          }
          return { ok: false as const, err: e };
        }
      }
      return { ok: false as const, err: new Error("endpoint failed") };
    })();
  });

  const pending = [...runners];
  let firstErr: unknown = null;
  let contractErr: unknown = null;
  const isContractLevel = (m: string) =>
    /reverted|execution|ERC20|transfer|allowance|insufficient|INSUFFICIENT|slippage|SLIPPAGE/i.test(m);
  while (pending.length > 0) {
    const { r, i } = await Promise.race(
      pending.map((p, i) => p.then((r) => ({ r, i })))
    );
    if (r.ok) return r.result;
    const msg = String(r.err instanceof Error ? r.err.message : r.err);
    if (isContractLevel(msg)) contractErr = contractErr ?? r.err;
    firstErr = firstErr ?? r.err;
    pending.splice(i, 1);
  }
  // Prefer a real contract answer (revert / allowance / slippage) over a
  // flaky RPC-level error ("project ID exceeded quota") — the contract answer
  // is what the user actually needs to see.
  throw contractErr ?? firstErr ?? new Error("all RPC endpoints failed");
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const method = String(body?.method || "");
  if (!ALLOWED.has(method)) {
    return NextResponse.json({ error: `method not allowed: ${method}` }, { status: 403 });
  }

  const params = Array.isArray(body?.params) ? body.params : [];
  const id = Number(body?.id) || 1;

  // Cache identical reads briefly (auto-quote + click-Buy re-quote).
  const ckey = CACHEABLE.has(method) ? `${method}:${JSON.stringify(params)}` : "";
  if (ckey) {
    const hit = cache.get(ckey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return NextResponse.json({ jsonrpc: "2.0", id, result: hit.result });
    }
  }

  try {
    const result = await rpcCall(method, params, id);
    if (ckey) cache.set(ckey, { at: Date.now(), result });
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (e: any) {
    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32603, message: String(e?.message || e) } },
      { status: 502 }
    );
  }
}
