"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { List, X, CaretDown, Plus, ArrowsClockwise, Wallet } from "@phosphor-icons/react";
import { useAuth } from "@/lib/useAuth";
import { shortAddr } from "@/lib/mockData";
import { ARC_CHAIN_ID } from "@/lib/wallet";

const NAV_LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/tokens", label: "Tokens" },
  { href: "/launch", label: "Launch" },
  { href: "/bridge", label: "Bridge" },
  { href: "/pool", label: "Pool" },
  { href: "/docs", label: "Docs" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const {
    user,
    connect,
    disconnect,
    loading,
    error,
    chainId,
    isWrongChain,
    addArcChain,
    switchToArc,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(t)) {
        setMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(t)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function handleConnect() {
    setBusy(true);
    await connect();
    setBusy(false);
  }

  async function handleSwitchOrAdd() {
    setBusy(true);
    await switchToArc(); // auto-adds the chain when the wallet doesn't have it
    setBusy(false);
  }

  const onArc = chainId === ARC_CHAIN_ID;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Arcline logo"
            width={30}
            height={30}
            className="logo-glow rounded-[6px]"
            priority
          />
          <span className="font-mono text-sm font-semibold tracking-tight">
            arcodex<span className="text-[var(--accent)]">.app</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-mono text-xs text-[var(--text-2)] transition hover:text-[var(--text)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Wrong-chain pill (desktop) */}
          {user && isWrongChain && (
            <button
              onClick={handleSwitchOrAdd}
              disabled={busy}
              className="hidden items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs text-amber-300 transition hover:border-amber-400 md:flex disabled:opacity-60"
            >
              <ArrowsClockwise size={13} className={busy ? "animate-spin" : ""} />
              Switch to Arc
            </button>
          )}

          {/* Wallet */}
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-3 py-1.5 font-mono text-xs text-[var(--accent)] transition hover:border-[var(--accent)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-soft" />
                {shortAddr(user.address)}
                <CaretDown size={11} className="opacity-70" />
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading || busy}
                className="flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-1.5 font-mono text-xs font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                <Wallet size={13} />
                {loading || busy ? "Connecting…" : "Connect Wallet"}
              </button>
            )}

            {menuOpen && user && (
              <div className="absolute right-0 top-11 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl shadow-black/40">
                <div className="border-b border-[var(--border)] px-3 py-2">
                  <p className="truncate font-mono text-xs text-[var(--text)]">
                    {user.address}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-[var(--text-2)]">
                    Connected via injected wallet
                  </p>
                </div>

                {/* Network status + Add/Switch Arc */}
                <div className="mt-2 flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-2)]">
                      Network
                    </p>
                    <p className="font-mono text-[11px] font-semibold text-[var(--text)]">
                      {onArc ? (
                        <span className="text-[var(--pos)]">Arc ✓</span>
                      ) : (
                        <span className="text-amber-300">Not on Arc</span>
                      )}
                    </p>
                  </div>
                  {!onArc && (
                    <button
                      onClick={handleSwitchOrAdd}
                      disabled={busy}
                      className="flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber-300 transition hover:border-amber-400 disabled:opacity-60"
                    >
                      <ArrowsClockwise size={11} className={busy ? "animate-spin" : ""} />
                      {busy ? "Switching…" : "Switch to Arc"}
                    </button>
                  )}
                </div>

                {/* Add Arc network (works even when already on Arc) */}
                <button
                  onClick={async () => {
                    setBusy(true);
                    await addArcChain();
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="mt-1.5 flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50 hover:text-[var(--accent)] disabled:opacity-60"
                >
                  <Plus size={13} className="text-[var(--accent)]" />
                  Add Arc Network
                </button>

                {error && (
                  <p className="mt-2 rounded-md border border-[var(--neg)]/40 bg-[var(--neg)]/10 px-3 py-1.5 font-mono text-[10px] text-[var(--neg)]">
                    {error}
                  </p>
                )}

                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 block rounded-md px-3 py-2 font-mono text-xs text-[var(--text)] transition hover:bg-white/5"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    disconnect();
                    setMenuOpen(false);
                  }}
                  className="mt-1 block w-full rounded-md px-3 py-2 text-left font-mono text-xs text-[var(--neg)] transition hover:bg-white/5"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="relative md:hidden" ref={mobileMenuRef}>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {mobileOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
            </button>

            {mobileOpen && (
              <div className="absolute right-0 top-11 w-60 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl shadow-black/40">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-3 py-2.5 font-mono text-xs text-[var(--text)] transition hover:bg-white/5 hover:text-[var(--accent)]"
                  >
                    {l.label}
                  </Link>
                ))}

                <div className="my-1.5 border-t border-[var(--border)]" />

                {user ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2">
                      <p className="truncate font-mono text-[11px] text-[var(--accent)]">
                        {shortAddr(user.address)}
                      </p>
                      {!onArc && (
                        <button
                          onClick={handleSwitchOrAdd}
                          disabled={busy}
                          className="ml-2 flex shrink-0 items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] text-amber-300 disabled:opacity-60"
                        >
                          <ArrowsClockwise size={10} className={busy ? "animate-spin" : ""} />
                          Switch to Arc
                        </button>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        setBusy(true);
                        await addArcChain();
                        setBusy(false);
                      }}
                      disabled={busy}
                      className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50 disabled:opacity-60"
                    >
                      <Plus size={13} className="text-[var(--accent)]" />
                      Add Arc Network
                    </button>
                    <button
                      onClick={() => {
                        disconnect();
                        setMobileOpen(false);
                      }}
                      className="mt-1 w-full rounded-md px-3 py-2 text-left font-mono text-xs text-[var(--neg)] transition hover:bg-white/5"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={loading || busy}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 py-2.5 font-mono text-xs font-semibold text-[#05070b] transition hover:brightness-110 disabled:opacity-60"
                  >
                    <Wallet size={13} />
                    {loading || busy ? "Connecting…" : "Connect Wallet"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
