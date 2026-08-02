"use client";

// TradingView lightweight-charts v5 area chart with Price/MCAP metric toggle.
// Interactive: crosshair, time scale, price scale.

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, AreaSeries, IChartApi, UTCTimestamp } from "lightweight-charts";

export interface Candle {
  time: number; // unix seconds
  value: number;
}

export type ChartMetric = "price" | "mcap";

export function genCandles(seed: number, points = 96): Candle[] {
  const out: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  let v = 0.4 + (seed % 9) * 0.06;
  let trend = (seed % 3) - 1;
  for (let i = 0; i < points; i++) {
    trend += (Math.random() - 0.52) * 0.008;
    trend = Math.max(-0.04, Math.min(0.04, trend));
    v += trend + (Math.random() - 0.5) * 0.015;
    v = Math.max(0.02, v);
    out.push({ time: now - (points - i) * 900, value: v });
  }
  return out;
}

export function candlesToMcap(data: Candle[], supply: number): Candle[] {
  return data.map((d) => ({ time: d.time, value: d.value * supply }));
}

export default function TradingViewChart({
  priceData,
  mcapData,
  height = 260,
  accent = "#22d3ee",
  showMetricToggle = false,
}: {
  priceData: Candle[];
  mcapData?: Candle[];
  height?: number;
  accent?: string;
  showMetricToggle?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [metric, setMetric] = useState<ChartMetric>("price");

  const data = metric === "mcap" && mcapData ? mcapData : priceData;

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(232,236,242,0.55)",
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 0,
        vertLine: { color: accent, width: 1, style: 3, labelBackgroundColor: accent },
        horzLine: { color: accent, width: 1, style: 3, labelBackgroundColor: accent },
      },
      autoSize: true,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: accent,
      topColor: `${accent}55`,
      bottomColor: `${accent}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
    });
    series.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
    );
    chart.timeScale().fitContent();

    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height, accent]);

  return (
    <div>
      {showMetricToggle && (
        <div className="mb-2 flex gap-1 rounded-md border border-[var(--border)] p-0.5">
          {(["price", "mcap"] as ChartMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
                metric === m
                  ? "bg-[var(--accent)] font-semibold text-[#05070b]"
                  : "text-[var(--text-2)] hover:text-[var(--text)]"
              }`}
            >
              {m === "price" ? "Price" : "MCAP"}
            </button>
          ))}
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

