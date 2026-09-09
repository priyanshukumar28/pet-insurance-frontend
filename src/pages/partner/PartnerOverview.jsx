import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, FileCheck2, IndianRupee, Percent } from 'lucide-react';
import api from '../../api/axios.js';
import { inr, num } from '../../lib/format.js';
import { resolvePreset, DEFAULT_PRESET } from '../../lib/dateRanges.js';
import DateRangePicker from '../../components/UI/DateRangePicker.jsx';
import TrendChart from '../../components/charts/TrendChart.jsx';
import DonutChart from '../../components/charts/DonutChart.jsx';
import { KpiCard, Card, LegendDot } from '../../components/dashboard/Kpi.jsx';

export default function PartnerOverview() {
  const [range, setRange] = useState(() => resolvePreset(DEFAULT_PRESET));
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  const load = useCallback(() => {
    setErr(false);
    api
      .get('/portal/overview', { params: { from: range.from, to: range.to } })
      .then(({ data: res }) => setData(res.data))
      .catch(() => setErr(true));
  }, [range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const k = data?.kpis;
  const conv = data?.conversion;
  const convPct = (n) => (conv?.total ? `${Math.round((n / conv.total) * 1000) / 10}%` : '0%');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Your business</h1>
          <p className="mt-1 text-sm text-brand-slate">Proposals, certificates and premium driven through your integration.</p>
        </div>
        <DateRangePicker value={range} onChange={({ from, to, presetKey }) => setRange({ from, to, presetKey })} />
      </div>

      {err && (
        <div className="rounded-xl2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Couldn&apos;t load your dashboard. Please try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {!data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[124px] animate-pulse rounded-xl2 border border-brand-line bg-white" />
          ))
        ) : (
          <>
            <KpiCard icon={ClipboardList} label="Proposals Created" value={num(k.proposalsCreated.value)} kpi={k.proposalsCreated} mode="pct" />
            <KpiCard icon={FileCheck2} label="Certificates Issued" value={num(k.certificatesIssued.value)} kpi={k.certificatesIssued} mode="pct" />
            <KpiCard icon={IndianRupee} label="Total Premium" value={inr(k.totalPremium.value, { decimals: true })} kpi={k.totalPremium} mode="pct" />
            <KpiCard icon={Percent} label="Conversion Rate" value={`${k.conversionRate.value}%`} hint="proposals → certificates" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Trend"
          subtitle="Proposals, certificates and premium over the selected period."
          right={
            <span className="rounded-full border border-brand-line px-2.5 py-1 text-[11px] font-semibold text-brand-slate">
              {data?.range.granularity === 'month' ? 'Monthly' : 'Daily'}
            </span>
          }
        >
          <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-brand-slate">
            <span className="inline-flex items-center gap-1.5"><LegendDot color="#9DC1F4" /> Proposals</span>
            <span className="inline-flex items-center gap-1.5"><LegendDot color="#22C55E" /> Certificates</span>
            <span className="inline-flex items-center gap-1.5"><LegendDot color="#8B5CF6" /> Premium (₹)</span>
          </div>
          {data ? <TrendChart data={data.trend} granularity={data.range.granularity} /> : <div className="h-[260px] animate-pulse rounded-lg bg-brand-bg" />}
        </Card>

        <Card title="Conversion" subtitle="How your proposals resolve.">
          {data ? (
            <div className="flex flex-col items-center gap-5">
              <DonutChart
                segments={[
                  { label: 'Converted', value: conv.converted, color: '#22C55E' },
                  { label: 'Pending', value: conv.pending, color: '#1363DF' },
                  { label: 'Lost / Dropped', value: conv.lost, color: '#F97186' },
                ]}
                centerLabel={`${Math.round(conv.rate * 1000) / 10}%`}
                centerSub="Conversion Rate"
              />
              <ul className="w-full space-y-2 text-sm">
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-brand-slate"><LegendDot color="#22C55E" /> Converted</span>
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

      <div className="flex flex-wrap gap-3 text-sm">
        <Link to="/portal/proposals" className="font-semibold text-brand-blue hover:underline">View all proposals →</Link>
        <Link to="/portal/certificates" className="font-semibold text-brand-blue hover:underline">View all certificates →</Link>
      </div>
    </div>
  );
}
