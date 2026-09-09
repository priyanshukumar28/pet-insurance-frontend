import { useEffect, useState, useCallback } from 'react';
import { Download, FileSpreadsheet, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import Button from '../../components/UI/Button.jsx';
import { Input, Select } from '../../components/UI/Field.jsx';

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const BENEFITS = [
  { key: '', label: 'Any benefit' },
  { key: 'TELE_CONSULTATION', label: 'Tele Consultation' },
  { key: 'DIAGNOSTICS_DISCOUNT', label: 'Diagnostics discount' },
  { key: 'PHARMACY_VOUCHER', label: 'Pharmacy voucher' },
  { key: 'HOSPICASH', label: 'Hospicash' },
];

const BLANK = {
  insurerId: '',
  status: '',
  search: '',
  priceMin: '',
  priceMax: '',
  hasAddons: '',
  benefit: '',
  createdFrom: '',
  createdTo: '',
};

export default function PlansMIS() {
  const [insurers, setInsurers] = useState([]);
  const [filters, setFilters] = useState(BLANK);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get('/insurers').then(({ data }) => setInsurers(data.data.items)).catch(() => {});
  }, []);

  const params = useCallback(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null) p[k] = v;
    });
    return p;
  }, [filters]);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/mis/plans', { params: params() })
      .then(({ data }) => setReport(data.data))
      .catch(() => toast.error('Could not load the report'))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  async function download() {
    setDownloading(true);
    try {
      const res = await api.get('/mis/plans/export', { params: params(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plans-mis-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    } finally {
      setDownloading(false);
    }
  }

  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand-ink">Plans MIS</h2>
          <p className="text-sm text-brand-slate">
            One row per premium slab across all insurers. {report ? `${report.rowCount} rows · ${report.planCount} plans` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setFilters(BLANK)}>
            <RotateCcw size={15} /> Reset
          </Button>
          <Button onClick={download} disabled={downloading || !report?.rowCount}>
            <Download size={15} />
            {downloading ? 'Preparing…' : 'Download Excel'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 rounded-xl2 border border-brand-line bg-white p-4 shadow-card md:grid-cols-4 lg:grid-cols-6">
        <Select value={filters.insurerId} onChange={(e) => set('insurerId', e.target.value)}>
          <option value="">All insurers</option>
          {insurers.map((i) => (
            <option key={i.id} value={i.id}>
              {i.shortName || i.name}
            </option>
          ))}
        </Select>
        <Select value={filters.status} onChange={(e) => set('status', e.target.value)}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0] + s.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <Input placeholder="Plan name…" value={filters.search} onChange={(e) => set('search', e.target.value)} />
        <Input
          type="number"
          placeholder="Premium min"
          value={filters.priceMin}
          onChange={(e) => set('priceMin', e.target.value)}
        />
        <Input
          type="number"
          placeholder="Premium max"
          value={filters.priceMax}
          onChange={(e) => set('priceMax', e.target.value)}
        />
        <Select value={filters.hasAddons} onChange={(e) => set('hasAddons', e.target.value)}>
          <option value="">Add-ons: any</option>
          <option value="true">Has add-ons</option>
          <option value="false">No add-ons</option>
        </Select>
        <Select value={filters.benefit} onChange={(e) => set('benefit', e.target.value)}>
          {BENEFITS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </Select>
        <label className="flex flex-col text-[11px] font-semibold text-brand-slate">
          Created from
          <Input type="date" value={filters.createdFrom} onChange={(e) => set('createdFrom', e.target.value)} />
        </label>
        <label className="flex flex-col text-[11px] font-semibold text-brand-slate">
          Created to
          <Input type="date" value={filters.createdTo} onChange={(e) => set('createdTo', e.target.value)} />
        </label>
      </div>

      {/* Preview */}
      <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
        {loading ? (
          <p className="p-6 text-sm text-brand-slate">Loading…</p>
        ) : !report || report.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <FileSpreadsheet size={28} className="text-brand-slate" />
            <p className="text-sm text-brand-slate">No rows for these filters.</p>
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left font-semibold uppercase tracking-wide text-brand-slate">
                {report.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2.5">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.slice(0, 200).map((row, i) => (
                <tr key={i} className="border-b border-brand-line/70 last:border-0">
                  {report.columns.map((c) => (
                    <td key={c} className="whitespace-nowrap px-3 py-2 text-brand-ink">
                      {row[c] === '' || row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {report && report.rows.length > 200 && (
        <p className="text-xs text-brand-slate">
          Showing first 200 of {report.rowCount} rows — the Excel download contains everything.
        </p>
      )}
    </div>
  );
}
