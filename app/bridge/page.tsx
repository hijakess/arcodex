"use client";

import Navbar from "@/components/Navbar";
import { Compass } from "@phosphor-icons/react";

export default function BridgePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-28 text-center sm:px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-dim)]">
          <Compass size={22} className="text-[var(--accent)]" />
        </div>
        <h1 className="mt-6 font-mono text-2xl font-semibold tracking-tight">
          Bridge — Coming Soon
        </h1>
        <p className="mt-3 font-mono text-xs leading-relaxed text-[var(--text-2)]">
          Move USDC and assets across chains right here. We&apos;re still
          building the bridge — check back soon.
        </p>
        <div className="mt-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
            Status
          </p>
          <p className="mt-1 font-mono text-[11px] text-[var(--text)]">
            🚧 Under construction — no bridge transactions yet.
          </p>
        </div>
      </section>
    </main>
  );
}
