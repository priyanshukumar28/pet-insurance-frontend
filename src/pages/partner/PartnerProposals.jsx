import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios.js';
import { Input, Select } from '../../components/UI/Field.jsx';
import { resolvePreset, DEFAULT_PRESET } from '../../lib/dateRanges.js';
import DateRangePicker from '../../components/UI/DateRangePicker.jsx';

const BADGE = {
  CONVERTED: 'bg-green-100 text-green-700',
  QUOTED: 'bg-brand-orangeTint text-brand-orangeDark',
  OPEN: 'bg-brand-blueTint text-brand-blue',
  EXPIRED: 'bg-brand-line/60 text-brand-slate',
  CANCELLED: 'bg-red-100 text-red-700',
};
const STATUSES = ['OPEN', 'QUOTED', 'CONVERTED', 'EXPIRED', 'CANCELLED'];
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function PartnerProposals() {
  const [range, setRange] = useState(() => resolvePreset(DEFAULT_PRESET));
  const [filters, setFilters] = useState({ status: '', q: '' });
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    const params = { from: range.from, to: range.to };
    if (filters.status) params.status = filters.status;
    if (filters.q) params.q = filters.q;
    api.get('/portal/proposals', { params }).then(({ data }) => setRows(data.data.items)).catch(() => setRows([]));
  }, [range.from, range.to, filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Proposals</h1>
        <p className="mt-1 text-sm text-brand-slate">Every lead created through your integration.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-40" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Input className="w-60" placeholder="Search proposal no / customer…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <DateRangePicker value={range} onChange={({ from, to, presetKey }) => setRange({ from, to, presetKey })} />
      </div>

      {rows === null ? (
        <p className="text-sm text-brand-slate">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-line bg-white px-6 py-10 text-center text-sm text-brand-slate">
          No proposals in this period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-4 py-3">Proposal No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.proposalNo} className="border-b border-brand-line last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-ink">{p.proposalNo}</td>
                  <td className="px-4 py-3">
                    <div className="text-brand-ink">{p.customerName}</div>
                    <div className="text-xs text-brand-slate">{p.customerMobile}</div>
                  </td>
                  <td className="px-4 py-3 text-brand-slate">{p.planLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-brand-slate">{p.certificate?.reference || '—'}</td>
                  <td className="px-4 py-3 text-brand-slate">{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
