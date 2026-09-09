import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Shared building blocks for the Sales Dashboard and the Partner Portal overview.

export function DeltaPill({ kpi, mode = 'pct' }) {
  if (mode === 'count') {
    const n = kpi?.addedInPeriod ?? 0;
    if (!n) return <span className="text-[11px] font-semibold text-brand-slate">No change</span>;
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700">
        <ArrowUpRight size={12} /> {n}
      </span>
    );
  }
  const d = kpi?.deltaPct ?? 0;
  if (d === 0) return <span className="text-[11px] font-semibold text-brand-slate">No change</span>;
  const up = d > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
        up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
      }`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(d)}%
    </span>
  );
}

export function KpiCard({ icon: Icon, label, value, kpi, mode, hint = 'vs previous period' }) {
  return (
    <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-brand-slate">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blueTint text-brand-blue">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-brand-ink">{value}</p>
      <div className="mt-2 flex items-center gap-1.5">
        {kpi && mode ? <DeltaPill kpi={kpi} mode={mode} /> : null}
        {(kpi && mode) || hint ? <span className="text-[11px] text-brand-slate">{hint}</span> : null}
      </div>
    </div>
  );
}

export function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <div className={`rounded-xl2 border border-brand-line bg-white shadow-card ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-brand-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-brand-slate">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-5 pt-4">{children}</div>
    </div>
  );
}

export function LegendDot({ color }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}
