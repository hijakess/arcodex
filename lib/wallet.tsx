"use client";

// Real EIP-1193 injected-wallet provider (MetaMask, Rabby, Coinbase Wallet, ...).
// Exposes connect / disconnect / chain state + helpers to add & switch to the
// Arc network (chainId 5042) with the currently online public RPC.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const ARC_CHAIN_ID = 5042;
export const ARC_CHAIN_HEX = "0x13b2";
// RPC for the wallet "Add Chain" button. arcanine is the fastest public RPC
// BUT rejects bare wallet requests (it needs special headers → wallets show
// "URL RPC tidak terdeteksi"). Our own /api/rpc proxy accepts any request,
// relays to arcanine+Railway in parallel (fast, no per-IP rate limit) and now
// also supports eth_sendRawTransaction — so it's the correct wallet RPC.
// Railway stays as a fallback in case the proxy is unreachable.
export const ARC_CHAIN_RPC = "https://arc-launchpad-seven.vercel.app/api/rpc";
export const ARC_CHAIN_RPC_ALT = "https://fortest-production-9a201.up.railway.app";
export const ARC_CHAIN_EXPLORER = "https://arcscan.app";

export const ARC_CHAIN_PARAMS = {
  chainId: ARC_CHAIN_HEX,
  chainName: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: [ARC_CHAIN_RPC, ARC_CHAIN_RPC_ALT],
  blockExplorerUrls: [ARC_CHAIN_EXPLORER],
} as const;

export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: any[]) => void): void;
  removeListener?(event: string, handler: (...args: any[]) => void): void;
}

/** Resolve the injected provider (window.ethereum or its nested providers list). */
export function getProvider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  const eth: Eip1193Provider | undefined = w.ethereum;
  if (!eth?.request) return null;
  if (Array.isArray((eth as any).providers) && (eth as any).providers.length > 0) {
    return (eth as any).providers[0] as Eip1193Provider;
  }
  return eth;
}

interface WalletContextValue {
  provider: Eip1193Provider | null;
  account: string | null;
  chainId: number | null;
  connecting: boolean;
  error: string;
  connect(): Promise<boolean>;
  disconnect(): void;
  addArcChain(): Promise<boolean>;
  switchToArc(): Promise<boolean>;
  isWrongChain: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const provider = getProvider();

  const refresh = useCallback(async () => {
    const p = getProvider();
    if (!p) return;
    try {
      const accounts = (await p.request({ method: "eth_accounts" })) as string[];
      setAccount(accounts?.[0] ?? null);
      const hex = (await p.request({ method: "eth_chainId" })) as string;
      setChainId(hex ? parseInt(hex, 16) : null);
    } catch {
      /* wallet not unlocked yet */
    }
  }, []);

  // Attach to provider events; re-read state on mount and when the wallet
  // injects itself late (ethereum#initialized).
  useEffect(() => {
    refresh();
    const p = getProvider();
    if (!p) return;
    const onAccounts = (accs: string[]) => setAccount(accs?.[0] ?? null);
    const onChain = (hex: string) => setChainId(parseInt(hex, 16));
    const onDisconnect = () => {
      setAccount(null);
      setChainId(null);
    };
    p.on?.("accountsChanged", onAccounts);
    p.on?.("chainChanged", onChain);
    p.on?.("disconnect", onDisconnect);
    window.addEventListener("ethereum#initialized", refresh as EventListener, { once: true });
    return () => {
      p.removeListener?.("accountsChanged", onAccounts);
      p.removeListener?.("chainChanged", onChain);
      p.removeListener?.("disconnect", onDisconnect);
      window.removeEventListener("ethereum#initialized", refresh as EventListener);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    const p = getProvider();
    if (!p) {
      setError("No wallet detected. Install MetaMask or Rabby to continue.");
      return false;
    }
    setConnecting(true);
    setError("");
    try {
      const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts?.[0] ?? null);
      const hex = (await p.request({ method: "eth_chainId" })) as string;
      setChainId(hex ? parseInt(hex, 16) : null);
      return Boolean(accounts?.[0]);
    } catch (e: any) {
      setError(e?.message || "Connection rejected.");
      return false;
    } finally {
      setConnecting(false);
    }
  }, []);

  const addArcChain = useCallback(async () => {
    const p = getProvider();
    if (!p) return false;
    try {
      await p.request({ method: "wallet_addEthereumChain", params: [ARC_CHAIN_PARAMS] });
      setChainId(ARC_CHAIN_ID);
      setError("");
      return true;
    } catch (e: any) {
      if (e?.code === 4001) setError("Add Arc network rejected in wallet.");
      else setError(e?.message || "Could not add the Arc network.");
      return false;
    }
  }, []);

  const switchToArc = useCallback(async () => {
    const p = getProvider();
    if (!p) return false;
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARC_CHAIN_HEX }],
      });
      setChainId(ARC_CHAIN_ID);
      setError("");
      return true;
    } catch (e: any) {
      // 4902 = network not added to this wallet yet -> add it automatically.
      if (e?.code === 4902 || e?.code === -32603) return addArcChain();
      if (e?.code === 4001) setError("Switch to Arc rejected in wallet.");
      else setError(e?.message || "Could not switch to the Arc network.");
      return false;
    }
  }, [addArcChain]);

  const disconnect = useCallback(() => {
    setAccount(null);
    // chainId kept: the wallet itself is still there, just forgotten by the app.
  }, []);

  const isWrongChain = Boolean(account) && chainId !== null && chainId !== ARC_CHAIN_ID;

  const value = useMemo<WalletContextValue>(
    () => ({
      provider,
      account,
      chainId,
      connecting,
      error,
      connect,
      disconnect,
      addArcChain,
      switchToArc,
      isWrongChain,
    }),
    [provider, account, chainId, connecting, error, connect, disconnect, addArcChain, switchToArc, isWrongChain]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
