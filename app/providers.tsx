"use client";

import { WalletProvider } from "@/lib/wallet";

// Wallet connect is REAL (EIP-1193 injected wallet) on every page.
// Privy (optional) adds X/Twitter + social login once NEXT_PUBLIC_PRIVY_APP_ID
// is set; without it the app still has full wallet connect.

export default function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
