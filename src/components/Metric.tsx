interface MetricProps {
  label: string;
  value: string;
  hint?: string;
}

export function Metric({ label, value, hint }: MetricProps) {
  return (
    <div className="rounded-md border border-black/10 bg-white/70 p-3">
      <p className="text-[11px] font-bold text-black/45">{label}</p>
      <p className="mt-1 text-base font-black text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-4 text-black/52">{hint}</p> : null}
    </div>
  );
}
