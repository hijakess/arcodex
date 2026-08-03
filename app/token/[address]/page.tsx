"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Legacy route: the old mock token page. Redirect to the live on-chain
// token page so bookmarks / old links keep working.
export default function TokenRedirect() {
  const params = useParams<{ address: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/tokens/${params.address}`);
  }, [params.address, router]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="font-mono text-sm text-[var(--text-2)]">Redirecting…</p>
      </section>
    </main>
  );
}
