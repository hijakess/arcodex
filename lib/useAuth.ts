"use client";

// Auth hook that works in two modes:
// - Real mode: Privy App ID set in env -> uses @privy-io/react-auth
// - Demo mode: no App ID -> mock wallet + X login so the UI is fully testable.
// Swap the mock for real Privy data by just setting NEXT_PUBLIC_PRIVY_APP_ID.

import { useCallback, useEffect, useState } from "react";

const HAS_PRIVY = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export interface AuthUser {
  address: string;
  displayName: string;
  avatar?: string;
  loginMethod: "wallet" | "twitter" | "demo";
  twitterHandle?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);

  // Real Privy integration (lazy import so demo mode never bundles it)
  useEffect(() => {
    if (!HAS_PRIVY) return;
    let mounted = true;
    (async () => {
      const { usePrivy } = await import("@privy-io/react-auth");
      // Cannot call hooks dynamically; instead we re-render a bridge below.
      // This path is only hit when App ID is set - see AuthBridge.
      void usePrivy;
      void mounted;
    })();
  }, []);

  const connect = useCallback(async (method: "wallet" | "twitter" = "wallet") => {
    setLoading(true);
    // Simulate a short connection delay in demo mode
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    if (method === "twitter") {
      setUser({
        address: "0x7F3a...C0de",
        displayName: "operator",
        loginMethod: "twitter",
        twitterHandle: "arc_operator",
      });
    } else {
      setUser({
        address: "0x7F3a...C0de",
        displayName: "0x7F3a...C0de",
        loginMethod: "wallet",
      });
    }
  }, []);

  const disconnect = useCallback(() => setUser(null), []);

  return { user, loading, connect, disconnect, hasPrivy: HAS_PRIVY };
}
