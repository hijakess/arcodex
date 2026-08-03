import Link from "next/link";
import Image from "next/image";
import { Token } from "@/lib/types";
import { formatUsdc, formatNum } from "@/lib/mockData";
import BondingBadge from "./BondingBadge";

export default function TokenCard({ token, index }: { token: Token; index?: number }) {
  const hasChange = token.change24h !== 0;
  const up = token.change24h >= 0;
  return (
    <Link
      href={`/tokens/${token.address}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)]"
    >
      <div className="relative aspect-square w-full overflow-hidden">
        {token.image.startsWith("data:") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={token.image}
            alt={token.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <Image
            src={token.image}
            alt={token.name}
            width={320}
            height={320}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          <BondingBadge type={token.bondingType} />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-[var(--text)]">
              {token.symbol}
            </p>
            <p className="truncate font-mono text-[11px] text-[var(--text-2)]">
              {token.name}
            </p>
          </div>
          <span
            className={`shrink-0 font-mono text-xs font-semibold ${
              !hasChange
                ? "text-[var(--text-2)]/60"
                : up
                  ? "text-[var(--pos)]"
                  : "text-[var(--neg)]"
            }`}
          >
            {!hasChange ? "—" : `${up ? "+" : ""}${token.change24h.toFixed(1)}%`}
          </span>
        </div>

        <div className="flex items-center justify-between font-mono text-[11px] text-[var(--text-2)]">
          <span>MCAP</span>
          <span className="text-[var(--text)]">{formatUsdc(token.mcapUsdc)}</span>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-[var(--text-2)]">
            <span>Bonding progress</span>
            <span>{token.bondingProgress}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${token.bondingProgress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 font-mono text-[11px] text-[var(--text-2)]">
          <span>{token.holders > 0 ? `${formatNum(token.holders)} holders` : "— holders"}</span>
          <span>{token.volume24h > 0 ? `${formatUsdc(token.volume24h)} vol` : "— vol"}</span>
        </div>
      </div>
    </Link>
  );
}
