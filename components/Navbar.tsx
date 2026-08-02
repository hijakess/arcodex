"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { List, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/useAuth";
import { shortAddr } from "@/lib/mockData";

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
  const { user, connect, disconnect, hasPrivy } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
          <div className="relative" ref={menuRef}>
            {user ? (
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-md border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-3 py-1.5 font-mono text-xs text-[var(--accent)] transition hover:border-[var(--accent)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] pulse-soft" />
                {shortAddr(user.address)}
              </button>
            ) : (
              <button
                onClick={() => connect("wallet")}
                className="rounded-md bg-[var(--accent)] px-4 py-1.5 font-mono text-xs font-semibold text-[#05070b] transition hover:brightness-110 active:scale-[0.98]"
              >
                Connect Wallet
              </button>
            )}

            {menuOpen && user && (
              <div className="absolute right-0 top-11 w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl shadow-black/40">
                <div className="border-b border-[var(--border)] px-3 py-2">
                  <p className="truncate font-mono text-xs text-[var(--text)]">
                    {user.address}
                  </p>
                  {user.twitterHandle && (
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--text-2)]">
                      @{user.twitterHandle}
                    </p>
                  )}
                  {!hasPrivy && (
                    <p className="mt-1 font-mono text-[10px] text-amber-300/80">
                      demo mode (set Privy App ID to enable real login)
                    </p>
                  )}
                </div>
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
              {mobileOpen ? (
                <X size={18} weight="bold" />
              ) : (
                <List size={18} weight="bold" />
              )}
            </button>

            {mobileOpen && (
              <div className="absolute right-0 top-11 w-52 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl shadow-black/40">
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
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
