"use client";

// Auth hook backed by a REAL injected wallet (EIP-1193) via the WalletProvider.
// Keeps the same surface used by Navbar / Profile / Launch:
//   user, loading, connect(method), disconnect, hasPrivy
// plus chain helpers: chainId, isWrongChain, addArcChain, switchToArc.
//
// X (Twitter) login needs NEXT_PUBLIC_PRIVY_APP_ID; until then it falls back
// to a normal wallet connect so every CTA stays functional.

import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/mockData";

const HAS_PRIVY = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export interface AuthUser {
  address: string;
  displayName: string;
  avatar?: string;
  loginMethod: "wallet" | "twitter" | "demo";
  twitterHandle?: string;
}

export function useAuth() {
  const {
    account,
    chainId,
    connecting,
    error,
    connect,
    disconnect,
    addArcChain,
    switchToArc,
    isWrongChain,
  } = useWallet();

  const user: AuthUser | null = account
    ? {
        address: account,
        displayName: shortAddr(account),
        avatar: undefined,
        loginMethod: "wallet",
        twitterHandle: undefined,
      }
    : null;

  return {
    user,
    account,
    loading: connecting,
    connecting,
    error,
    // method kept for call-site compatibility; twitter only works with Privy set.
    connect: async (_method?: "wallet" | "twitter") => {
      return connect();
    },
    disconnect,
    hasPrivy: HAS_PRIVY,
    chainId,
    isWrongChain,
    addArcChain,
    switchToArc,
  };
}
