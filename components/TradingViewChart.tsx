"use client";

// TradingView lightweight-charts v5 — candlestick (OHLC) chart with
// Price/MCAP metric toggle. Interactive: crosshair, time scale, price scale.
// Candles come from the RadarDex live feed (real OHLC, no mock).

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  AreaSeries,
  CandlestickSeries,
  IChartApi,
  UTCTimestamp,
} from "lightweight-charts";

/** Area chart point (close value). */
export interface Candle {
  time: number; // unix seconds
  value: number;
}

/** Candlestick (OHLC) point. */
export interface OhlcCandle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
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

export function ohlcToMcap(data: OhlcCandle[], supply: number): OhlcCandle[] {
  return data.map((d) => ({
    time: d.time,
    open: d.open * supply,
    high: d.high * supply,
    low: d.low * supply,
    close: d.close * supply,
  }));
}

/**
 * Adaptive price formatter for the y-axis.
 * Micro-priced tokens (0.000001) need up to 8+ significant digits; large
 * values (mcap) need compact notation. Uses significant digits for micro
 * prices so nominal values never collapse to "0.0000".
 */
export function formatAxisPrice(p: number): string {
  if (!isFinite(p)) return "$0";
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2)}M`;
  if (p >= 10_000) return `$${(p / 1_000).toFixed(1)}K`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  // micro prices: keep 4 significant digits (e.g. 0.000001234 -> $0.000001234)
  return `$${Number(p.toPrecision(4)).toString()}`;
}

const UP = "#34d399"; // --pos
const DOWN = "#fb7185"; // --neg

export default function TradingViewChart({
  priceData,
  mcapData,
  candles,
  candleMcapData,
  height,
  accent = "#22d3ee",
  showMetricToggle = false,
}: {
  /** Area series data (used when `candles` is not provided). */
  priceData?: Candle[];
  mcapData?: Candle[];
  /** Candlestick (OHLC) data — when provided the chart renders candles. */
  candles?: OhlcCandle[];
  candleMcapData?: OhlcCandle[];
  /** Optional fixed pixel height. When omitted the chart fills its parent (h-full). */
  height?: number;
  accent?: string;
  showMetricToggle?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [metric, setMetric] = useState<ChartMetric>("price");

  const hasCandles = !!candles && candles.length > 0;

  const areaData = metric === "mcap" && mcapData ? mcapData : priceData || [];
  const candleData =
    metric === "mcap" && candleMcapData ? candleMcapData : candles || [];

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      ...(height ? { height } : {}),
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(232,236,242,0.55)",
        fontFamily: "'Geist Mono', ui-monospace, monospace",
        fontSize: 11,
      },
      localization: {
        priceFormatter: formatAxisPrice,
        timeFormatter: (t: number) => {
          const d = new Date(t * 1000);
          const hh = String(d.getUTCHours()).padStart(2, "0");
          const mm = String(d.getUTCMinutes()).padStart(2, "0");
          return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${hh}:${mm}`;
        },
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
        scaleMargins: { top: 0.12, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 2,
        barSpacing: hasCandles ? 7 : undefined,
      },
      crosshair: {
        mode: 0,
        vertLine: { color: accent, width: 1, style: 3, labelBackgroundColor: accent },
        horzLine: { color: accent, width: 1, style: 3, labelBackgroundColor: accent },
      },
      autoSize: true,
    });

    if (hasCandles) {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: UP,
        downColor: DOWN,
        borderVisible: false,
        wickUpColor: UP,
        wickDownColor: DOWN,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      series.setData(
        candleData.map((d) => ({
          time: d.time as UTCTimestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        }))
      );
    } else {
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
        areaData.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [areaData, candleData, height, accent, hasCandles]);

  return (
    <div className="flex h-full w-full flex-col">
      {showMetricToggle && (
        <div className="mb-2 flex w-max gap-1 self-end rounded-md border border-[var(--border)] p-0.5">
          {(["price", "mcap"] as ChartMetric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition ${
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
      <div ref={containerRef} className="min-h-0 w-full flex-1" style={height ? { height } : undefined} />
    </div>
  );
}
