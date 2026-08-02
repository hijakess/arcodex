"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown, Check, FunnelSimple } from "@phosphor-icons/react";

export interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

export default function SortDropdown({
  options,
  value,
  onChange,
  label = "Sort",
}: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-mono text-xs text-[var(--text)] transition hover:border-[var(--accent)]/50 active:scale-[0.98]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FunnelSimple size={14} className="text-[var(--accent)]" />
        <span className="text-[var(--text-2)]">{label}:</span>
        <span className="font-semibold">{active?.label ?? "All"}</span>
        <CaretDown
          size={12}
          className={`text-[var(--text-2)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl shadow-black/50"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left font-mono text-xs transition hover:bg-white/5 ${
                  selected ? "text-[var(--accent)]" : "text-[var(--text)]"
                }`}
              >
                {opt.label}
                {selected && <Check size={13} weight="bold" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
