import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Receipt, IndianRupee, ShieldCheck, Building2 } from 'lucide-react';
import api from '../api/axios.js';
import { inr, num } from '../lib/format.js';
import { resolvePreset, DEFAULT_PRESET } from '../lib/dateRanges.js';
import DateRangePicker from '../components/UI/DateRangePicker.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import { KpiCard, Card, LegendDot } from '../components/dashboard/Kpi.jsx';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const SALE_BADGE = {
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  DRAFT: 'bg-brand-line/60 text-brand-slate',
};
const PROPOSAL_BADGE = {
  CONVERTED: 'bg-green-100 text-green-700',
  QUOTED: 'bg-brand-orangeTint text-brand-orangeDark',
  OPEN: 'bg-brand-blueTint text-brand-blue',
  EXPIRED: 'bg-brand-line/60 text-brand-slate',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const [range, setRange] = useState(() => resolvePreset(DEFAULT_PRESET));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setErr(false);
    api
      .get('/dashboard/summary', { params: { from: range.from, to: range.to } })
      .then(({ data: res }) => setData(res.data))
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const k = data?.kpis;
  const conv = data?.conversion;
  const trend = data?.trend;
  const granularity = data?.range?.granularity;
  const convPct = (n) => (conv?.total ? `${Math.round((n / conv.total) * 1000) / 10}%` : '0%');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Sales Dashboard</h1>
          <p className="mt-1 text-sm text-brand-slate">
            Track your performance, proposals, sales and business growth in one place.
          </p>
        </div>
        <DateRangePicker
          value={range}
          onChange={({ from, to, presetKey }) => setRange({ from, to, presetKey })}
        />
      </div>

      {err && (
        <div className="rounded-xl2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load the dashboard. Please try again.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {!k ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[124px] animate-pulse rounded-xl2 border border-brand-line bg-white" />
          ))
        ) : (
          <>
            <KpiCard icon={FileText} label="Proposals Created" value={num(k.proposalsCreated.value)} kpi={k.proposalsCreated} mode="pct" />
            <KpiCard icon={Receipt} label="Policies Sold" value={num(k.policiesSold.value)} kpi={k.policiesSold} mode="pct" />
            <KpiCard icon={IndianRupee} label="Total Premium" value={inr(k.totalPremium.value, { decimals: true })} kpi={k.totalPremium} mode="pct" />
            <KpiCard icon={ShieldCheck} label="Active Plans" value={num(k.activePlans.value)} kpi={k.activePlans} mode="count" />
            <KpiCard icon={Building2} label="Active Insurers" value={num(k.activeInsurers.value)} kpi={k.activeInsurers} mode="count" />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Sales & Proposals Trend"
          subtitle="Proposals, policies sold and premium over the selected period."
          right={
            <span className="rounded-full border border-brand-line px-2.5 py-1 text-[11px] font-semibold text-brand-slate">
              {granularity === 'month' ? 'Monthly' : 'Daily'}
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-brand-slate">
            <span className="inline-flex items-center gap-1.5"><LegendDot color="#9DC1F4" /> Proposals</span>
            <span className="inline-flex items-center gap-1.5"><LegendDot color="#22C55E" /> Policies Sold</span>
            <span className="inline-flex items-center gap-1.5"><LegendDot color="#8B5CF6" /> Premium (₹)</span>
          </div>
          {trend ? (
            <TrendChart data={trend} granularity={granularity} />
          ) : (
            <div className="h-[260px] animate-pulse rounded-lg bg-brand-bg" />
          )}
        </Card>

        <Card title="Proposal to Sales Conversion" subtitle="Conversion rate from proposals to policies.">
          {conv ? (
            <div className="flex flex-col items-center gap-5">
              <DonutChart
                segments={[
                  { label: 'Converted to Sales', value: conv.converted, color: '#22C55E' },
                  { label: 'Pending', value: conv.pending, color: '#1363DF' },
                  { label: 'Lost / Dropped', value: conv.lost, color: '#F97186' },
                ]}
                centerLabel={`${Math.round(conv.rate * 1000) / 10}%`}
                centerSub="Conversion Rate"
              />
              <ul className="w-full space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-brand-slate"><LegendDot color="#22C55E" /> Converted to Sales</span>
                  <span className="font-semibold text-brand-ink">{conv.converted} ({convPct(conv.converted)})</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-brand-slate"><LegendDot color="#1363DF" /> Pending</span>
                  <span className="font-semibold text-brand-ink">{conv.pending} ({convPct(conv.pending)})</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-brand-slate"><LegendDot color="#F97186" /> Lost / Dropped</span>
                  <span className="font-semibold text-brand-ink">{conv.lost} ({convPct(conv.lost)})</span>
                </li>
              </ul>
            </div>
          ) : (
            <div className="h-[300px] animate-pulse rounded-lg bg-brand-bg" />
          )}
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Recent Sales"
          right={<Link to="/sales" className="text-xs font-semibold text-brand-blue hover:underline">View All →</Link>}
        >
          <RecentTable
            rows={data?.recentSales || []}
            cols={['Reference', 'Customer', 'Plan', 'Premium', 'Date', 'Status']}
            render={(s) => [
              <Link key="ref" to={`/sales/${s.id}`} className="font-medium text-brand-blue hover:underline">{s.reference}</Link>,
              s.customerName,
              s.planLabel,
              <span key="p" className="text-brand-ink">{inr(s.totalPremium, { decimals: true })}</span>,
              fmtDate(s.date),
              <Badge key="b" cls={SALE_BADGE[s.status]}>{s.status}</Badge>,
            ]}
            empty="No sales in this period."
            loading={loading && !data}
          />
        </Card>

        <Card
          title="Recent Proposals"
          right={<Link to="/proposals" className="text-xs font-semibold text-brand-blue hover:underline">View All →</Link>}
        >
          <RecentTable
            rows={data?.recentProposals || []}
            cols={['Proposal No', 'Customer', 'Plan', 'Date', 'Status']}
            render={(p) => [
              <Link key="no" to={`/proposals/${encodeURIComponent(p.proposalNo)}`} className="font-medium text-brand-blue hover:underline">{p.proposalNo}</Link>,
              p.customerName,
              p.planLabel,
              fmtDate(p.date),
              <Badge key="b" cls={PROPOSAL_BADGE[p.status]}>{p.status}</Badge>,
            ]}
            empty="No proposals in this period."
            loading={loading && !data}
          />
        </Card>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-line pt-4 text-xs text-brand-slate">
        <span>© {new Date().getFullYear()} Across Assist. All rights reserved.</span>
      </footer>
    </div>
  );
}

function Badge({ cls, children }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls || 'bg-brand-line/60 text-brand-slate'}`}>
      {children}
    </span>
  );
}

function RecentTable({ rows, cols, render, empty, loading }) {
  if (loading) return <div className="h-40 animate-pulse rounded-lg bg-brand-bg" />;
  if (!rows.length) return <p className="py-6 text-center text-sm text-brand-slate">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-brand-line text-left text-[11px] font-semibold uppercase tracking-wide text-brand-slate">
            {cols.map((c) => (
              <th key={c} className="py-2 pr-3">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-brand-line last:border-0">
              {render(r).map((cell, i) => (
                <td key={i} className="py-2.5 pr-3 text-brand-slate">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
