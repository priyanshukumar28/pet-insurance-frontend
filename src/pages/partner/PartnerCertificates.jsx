import { useCallback, useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { Input } from '../../components/UI/Field.jsx';
import { inr } from '../../lib/format.js';
import { fetchFile } from '../../lib/download.js';
import { resolvePreset, DEFAULT_PRESET } from '../../lib/dateRanges.js';
import DateRangePicker from '../../components/UI/DateRangePicker.jsx';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function PartnerCertificates() {
  const [range, setRange] = useState(() => resolvePreset(DEFAULT_PRESET));
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    const params = { from: range.from, to: range.to };
    if (q) params.q = q;
    api.get('/portal/certificates', { params }).then(({ data }) => setRows(data.data.items)).catch(() => setRows([]));
  }, [range.from, range.to, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function pdf(reference, download) {
    fetchFile(`/portal/certificates/${encodeURIComponent(reference)}/pdf`, {
      params: download ? { download: 1 } : undefined,
      filename: `certificate-${reference}.pdf`,
      open: !download,
    }).catch(() => toast.error('Could not fetch the certificate'));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Certificates</h1>
        <p className="mt-1 text-sm text-brand-slate">Policies issued from your proposals.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input className="w-64" placeholder="Search reference / customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        <DateRangePicker value={range} onChange={({ from, to, presetKey }) => setRange({ from, to, presetKey })} />
      </div>

      {rows === null ? (
        <p className="text-sm text-brand-slate">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-brand-line bg-white px-6 py-10 text-center text-sm text-brand-slate">
          No certificates in this period.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Cover period</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-brand-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-ink">{s.reference}</div>
                    {s.proposalNo && <div className="text-[11px] text-brand-slate">from {s.proposalNo}</div>}
                  </td>
                  <td className="px-4 py-3 text-brand-ink">{s.customerName}</td>
                  <td className="px-4 py-3 text-brand-slate">{s.planLabel}</td>
                  <td className="px-4 py-3 text-brand-ink">{inr(s.totalPremium, { decimals: true })}</td>
                  <td className="px-4 py-3 text-brand-slate">{fmtDate(s.issuedAt)}</td>
                  <td className="px-4 py-3 text-brand-slate">
                    {fmtDate(s.policyStartDate)} – {fmtDate(s.policyEndDate)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button title="View" onClick={() => pdf(s.reference, false)} className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue">
                        <FileText size={15} />
                      </button>
                      <button title="Download" onClick={() => pdf(s.reference, true)} className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue">
                        <Download size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
