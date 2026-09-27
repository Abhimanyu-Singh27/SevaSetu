"use client";

import { useEffect, useState } from "react";
import { Activity, LoaderCircle, Pause, Play } from "lucide-react";

type EarningsData = {
  buckets: { label: string; amount: number }[];
  active: boolean;
  total: number;
  hasEarnings: boolean;
};

export function WorkerEarningsPanel() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const response = await fetch("/api/v1/worker/earnings", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load earnings");
        const result = await response.json();
        if (!mounted) return;
        setData(result.data);
        setError(false);
        if (result.data.active && !timer) timer = setInterval(load, 60_000);
        if (!result.data.active && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch {
        if (mounted) setError(true);
      }
    };
    void load();
    const onAvailabilityChange = () => { void load(); };
    window.addEventListener("sevasetu:availability", onAvailabilityChange);
    return () => {
      mounted = false;
      window.removeEventListener("sevasetu:availability", onAvailabilityChange);
      if (timer) clearInterval(timer);
    };
  }, []);

  const buckets = data?.buckets || Array.from({ length: 12 }, (_, index) => ({ label: `${index + 1}h`, amount: 0 }));
  const values = buckets.map((bucket) => bucket.amount);
  const max = Math.max(...values, 1);
  const points = values.map((amount, index) => ({
    x: 12 + index * (376 / Math.max(values.length - 1, 1)),
    y: 116 - (amount / max) * 88,
  }));
  const segments = points.slice(1).map((point, index) => ({
    key: buckets[index + 1].label,
    path: `M${points[index].x},${points[index].y} L${point.x},${point.y}`,
    color: values[index + 1] > values[index] ? "#14855f" : values[index + 1] < values[index] || values[index] === 0 ? "#c83f48" : "#87939f",
  }));

  return <div className="worker-earnings-panel">
    <div className="worker-earnings-summary">
      <div><span className="kicker">Last 12 active hours</span><strong>{data ? `₹${data.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—"}</strong><small>Recorded earnings by active hour</small></div>
      <span className={`worker-earnings-state${data?.active ? " is-active" : ""}`}>{data?.active ? <><Activity size={14} /> Tracking active time</> : data ? <><Pause size={14} /> Paused while offline</> : <><LoaderCircle className="spin" size={14} /> Loading</>}</span>
    </div>
    {error ? <p className="earnings-empty" role="status">Earnings data is temporarily unavailable.</p> : <>
      <svg className="worker-earnings-chart" viewBox="0 0 400 142" role="img" aria-label={data?.hasEarnings ? "Service earnings per active hour" : "No service earnings recorded yet"}>
        {[28, 72, 116].map((y) => <line key={y} x1="8" x2="392" y1={y} y2={y} className="earnings-grid-line" />)}
        {segments.map((segment) => <path key={segment.key} d={segment.path} fill="none" stroke={segment.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
        {points.map((point, index) => <circle key={buckets[index].label} cx={point.x} cy={point.y} r="3.5" fill={values[index] > 0 ? "#14855f" : "#c83f48"}><title>{buckets[index].label}: ₹{buckets[index].amount.toLocaleString("en-IN")}</title></circle>)}
      </svg>
      <div className="worker-earnings-axis"><span>Earlier active hours</span><span>{data?.active ? <><Play size={11} /> Now</> : "Paused"}</span></div>
      {!data?.hasEarnings && <p className="earnings-empty">Complete a service while Available or Busy to start the earnings graph.</p>}
    </>}
  </div>;
}