import { BondingType } from "@/lib/types";

export default function BondingBadge({ type }: { type: BondingType }) {
  if (type === "early-buy") {
    return (
      <span className="rounded border border-amber-300/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300">
        Early Buy
      </span>
    );
  }
  return (
    <span className="rounded border border-[var(--accent)]/40 bg-[var(--accent-dim)] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
      Standard
    </span>
  );
}
