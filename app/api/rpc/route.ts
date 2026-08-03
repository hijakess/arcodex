// Server-side JSON-RPC proxy for Arc (chainId 5042).
// The browser NEVER talks to the public RPC directly — Railway rate-limits
// per-IP and arcanine rejects foreign Origins — so all reads (balances,
// quotes, simulate, receipts) go through Vercel, which fetches arcanine
// (fast, no strict IP limit) with a Railway fallback.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RPC = "https://arcanine.lol/api/rpc";
const RPC_FALLBACK = "https://fortest-production-9a201.up.railway.app";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
          // Contract-level reverts are real answers — pass them through, don't
          // treat them as transport failures and mask them as "all failed".
          if (/quota|rate limit|429|599|limit|timeout|fetch/i.test(msg) && attempt < retries) {
            await sleep(900 * (attempt + 1));
            continue;
          }
          throw new Error(msg);
        }
        return j.result;
      } catch (e: any) {
        const msg = String(e?.message || e);
        // Only transport-level failures are retryable. Contract reverts and
        // other real RPC answers must propagate so the client sees them.
        if (/timeout|fetch|network|abort|quota|rate limit|429|599/i.test(msg)) {
          if (attempt < retries) {
            await sleep(900 * (attempt + 1));
            continue;
          }
        }
        throw e;
      }
    }
  }
  throw new Error("all RPC endpoints failed");
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
  try {
    const result = await rpcCall(method, params, id);
    return NextResponse.json({ jsonrpc: "2.0", id, result });
  } catch (e: any) {
    return NextResponse.json(
      { jsonrpc: "2.0", id, error: { code: -32603, message: String(e?.message || e) } },
      { status: 502 }
    );
  }
}
