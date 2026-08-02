"use client";

// Copy-to-clipboard button with feedback.

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export default function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-[var(--text-2)] transition hover:border-[var(--accent)]/50 hover:text-[var(--text)] active:scale-[0.97]"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={11} className="text-[var(--pos)]" weight="bold" />
          <span className="text-[var(--pos)]">Copied</span>
        </>
      ) : (
        <>
          <Copy size={11} />
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}
