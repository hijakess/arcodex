"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import TokenCard from "@/components/TokenCard";
import SortDropdown from "@/components/SortDropdown";
import { tokens } from "@/lib/mockData";
import { BondingType } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "mcap", label: "Market cap" },
  { value: "change", label: "24h change" },
  { value: "volume", label: "24h volume" },
  { value: "progress", label: "Bonding progress" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "standard", label: "Standard" },
  { value: "early-buy", label: "Early Buy" },
];

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    let list = tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(query.toLowerCase()) ||
        t.name.toLowerCase().includes(query.toLowerCase())
    );
    if (filter !== "all") {
      list = list.filter((t) => t.bondingType === (filter as BondingType));
    }
    switch (sort) {
      case "mcap":
        list = [...list].sort((a, b) => b.mcapUsdc - a.mcapUsdc);
        break;
      case "change":
        list = [...list].sort((a, b) => b.change24h - a.change24h);
        break;
      case "volume":
        list = [...list].sort((a, b) => b.volume24h - a.volume24h);
        break;
      case "progress":
        list = [...list].sort((a, b) => b.bondingProgress - a.bondingProgress);
        break;
      default:
        list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [query, sort, filter]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            Discover
          </h1>
          <p className="max-w-lg font-mono text-xs text-[var(--text-2)]">
            Every token live on Arc, priced in USDC. Bonding curves graduate to a
            full AMM at 100% progress.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by symbol or name..."
            className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-2)]/60 focus:border-[var(--accent)]/60 focus:outline-none lg:max-w-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SortDropdown
              options={FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
              label="Type"
            />
            <SortDropdown
              options={SORT_OPTIONS}
              value={sort}
              onChange={setSort}
              label="Sort"
            />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {filtered.map((t, i) => (
            <TokenCard key={t.address} token={t} index={i} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-20 text-center font-mono text-sm text-[var(--text-2)]">
            No tokens match "{query}".
          </div>
        )}
      </section>
    </main>
  );
}
