// Proper immutable-aware verification:
// 1. compile with deploy settings
// 2. for each contract, patch the PUSH32-zero immutable placeholders in the
//    compiled runtime bytecode with the values observed on-chain, then compare
// 3. report constructor args read from chain (storage/getters)
const fs = require("fs");
const path = require("path");
const solc = require("solc");
const { ethers } = require("ethers");
const DIR = __dirname;
const FILES = ["ArcodexPool.sol", "ArcodexBondingCurve.sol", "ArcodexFeeRouter.sol"];
const sources = {};
for (const f of FILES) sources[f] = { content: fs.readFileSync(path.join(DIR, f), "utf8") };
function findImports(importPath) {
  const p = path.join(DIR, "node_modules", importPath);
  if (fs.existsSync(p)) return { contents: fs.readFileSync(p, "utf8") };
  return { error: `File not found: ${importPath}` };
}
const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    viaIR: true,
    evmVersion: "paris",
    outputSelection: { "*": { "*": ["abi", "evm.deployedBytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

async function rpc(method, params) {
  const body = JSON.stringify({ jsonrpc: "2.0", id: 1, method, params });
  for (const url of ["https://arcanine.lol/api/rpc", "https://fortest-production-9a201.up.railway.app"]) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", Origin: "https://arcanine.lol", Referer: "https://arcanine.lol/" },
        body,
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      return j.result;
    } catch (e) { /* try next */ }
  }
  throw new Error("RPC failed");
}
const getCode = async (a) => (await rpc("eth_getCode", [a, "latest"])).replace(/^0x/, "");
const call = async (to, data) => rpc("eth_call", [{ to, data }, "latest"]);

// PUSH32-zero immutable placeholders: compiled has 7f + 32 zero bytes where
// on-chain has 7f + real value. Patch compiled with the on-chain value at any
// position where they differ AND compiled has the placeholder pattern.
function patchImmutables(compiled, onchain) {
  let patched = compiled;
  let n = 0;
  for (let i = 0; i + 66 <= compiled.length; i += 2) {
    // hex: '7f' opcode + 64 hex chars
    if (compiled.slice(i, i + 2) === "7f" && compiled.slice(i + 2, i + 66) === "0".repeat(64) && onchain.slice(i, i + 66) !== compiled.slice(i, i + 66)) {
      const val = onchain.slice(i + 2, i + 66);
      if (val !== "0".repeat(64)) {
        patched = patched.slice(0, i + 2) + val + patched.slice(i + 66);
        n++;
      }
    }
  }
  return { patched, n };
}

(async () => {
  const Z = "0".repeat(64);
  const strip = (code) => (code.slice(-2) === "29" ? code.slice(0, -86) : code);
  const targets = [
    { file: "ArcodexBondingCurve.sol", name: "ArcodexBondingCurve", addr: "0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0" },
    { file: "ArcodexFeeRouter.sol", name: "ArcodexFeeRouter", addr: "0x8FcA8fB88337BdedA54AA28227E1294923f5ca52" },
    { file: "ArcodexBondingCurve.sol", name: "BondingCurveToken", addr: "0x42983a981b90136b418c26caefb8a1bc89a00c1d" },
    { file: "ArcodexPool.sol", name: "ArcodexPool", addr: null },
  ];
  const results = [];
  for (const t of targets) {
    if (!t.addr) { console.log(`[SKIP] ${t.name}: no instance deployed yet (factory deploys at graduation)`); continue; }
    const compiled = output.contracts[t.file][t.name].evm.deployedBytecode.object.replace(/^0x/, "");
    const onchain = await getCode(t.addr);
    const c = strip(compiled), o = strip(onchain);
    let exact = c === o;
    let patched = null;
    if (!exact) {
      patched = patchImmutables(c, o);
      exact = patched.patched === o;
    }
    const lenOk = compiled.length === onchain.length;
    results.push({ name: t.name, addr: t.addr, exact, lenOk, patchedN: patched?.n ?? 0, compiledLen: compiled.length / 2, onchainLen: onchain.length / 2 });
    console.log(`[${exact ? "OK  " : "FAIL"}] ${t.name} @ ${t.addr}`);
    console.log(`      ${compiled.length / 2}B vs ${onchain.length / 2}B | ${exact ? (patched ? `MATCH after ${patched.n} immutable patch(es)` : "EXACT") : "MISMATCH"}`);
  }

  // Constructor args from chain
  console.log("\n=== Constructor args (read from chain) ===");
  const iface = new ethers.Interface([
    "function usdc() view returns(address)",
    "function platformTreasury() view returns(address)",
    "function treasury() view returns(address)",
    "function owner() view returns(address)",
    "function factory() view returns(address)",
  ]);
  // BondingCurve: usdc + treasury
  for (const fn of ["usdc", "platformTreasury", "treasury", "owner"]) {
    try {
      const r = await call("0x0264BebE36b68C0F6694D5f3dC233DFC2bbdF4d0", iface.encodeFunctionData(fn, []));
      console.log(`BondingCurve.${fn}() = ${r && r !== "0x" ? iface.decodeFunctionResult(fn, r)[0] : "(revert/empty)"}`);
    } catch (e) { console.log(`BondingCurve.${fn}() = ERR ${e.message}`); }
  }
  // FeeRouter treasury
  for (const fn of ["treasury", "platformTreasury", "owner"]) {
    try {
      const r = await call("0x8FcA8fB88337BdedA54AA28227E1294923f5ca52", iface.encodeFunctionData(fn, []));
      console.log(`FeeRouter.${fn}() = ${r && r !== "0x" ? iface.decodeFunctionResult(fn, r)[0] : "(revert/empty)"}`);
    } catch (e) { console.log(`FeeRouter.${fn}() = ERR ${e.message}`); }
  }
  // token factory
  const r = await call("0x42983a981b90136b418c26caefb8a1bc89a00c1d", iface.encodeFunctionData("factory", []));
  console.log(`ARCT.factory() = ${r && r !== "0x" ? iface.decodeFunctionResult("factory", r)[0] : "(revert/empty)"}`);
})();
