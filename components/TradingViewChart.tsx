"use client";

// TradingView lightweight-charts v5 area chart.
// Interactive: crosshair, time scale, price scale.

import { useEffect, useRef } from "react";
import { createChart, ColorType, AreaSeries, IChartApi, UTCTimestamp } from "lightweight-charts";

export interface Candle {
  time: number; // unix seconds
  value: number;
}

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

export default function TradingViewChart({
  data,
  height = 260,
  accent = "#22d3ee",
}: {
  data: Candle[];
  height?: number;
  accent?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
