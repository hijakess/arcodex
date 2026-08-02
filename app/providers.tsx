"use client";

import { PrivyProvider } from "@privy-io/react-auth";

// Replace NEXT_PUBLIC_PRIVY_APP_ID with a real Privy app ID to enable
// wallet connect + X (Twitter) login. Without it, the app runs in demo mode
// with a mock connect button.
const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export default function Providers({ children }: { children: React.ReactNode }) {
  if (!APP_ID) {
    return <>{children}</>;
  }
  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#22D3EE",
          logo: "/logo.png",
        },
        loginMethods: ["wallet", "twitter", "email", "google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "all-users",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
