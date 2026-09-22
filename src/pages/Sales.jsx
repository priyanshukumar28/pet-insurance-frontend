import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Plus, Pencil, Trash2, FileText, Download, BadgeCheck, FileSignature, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import EmptyState from '../components/UI/EmptyState.jsx';
import Button from '../components/UI/Button.jsx';
import { Input, Select } from '../components/UI/Field.jsx';
import { inr } from '../lib/format.js';
import { fetchFile } from '../lib/download.js';
import EndorseModal from '../components/sales/EndorseModal.jsx';
import CancelModal from '../components/sales/CancelModal.jsx';
import PetPhotoCell from '../components/UI/PetPhotoCell.jsx';
import DateRangePicker from '../components/UI/DateRangePicker.jsx';
import { PRESETS, ALL_TIME_PRESET } from '../lib/dateRanges.js';

const DATE_PRESETS = [ALL_TIME_PRESET, ...PRESETS];

const STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED'];
const STATUS_STYLES = {
  DRAFT: 'bg-brand-line/60 text-brand-slate',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState(null);
  const [meta, setMeta] = useState({ total: 0, confirmedPremium: 0 });
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [range, setRange] = useState({ from: '', to: '', presetKey: 'all' });
  const [endorsableFields, setEndorsableFields] = useState([]);
  const [endorseFor, setEndorseFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);

  const load = useCallback(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (range.from) params.from = range.from;
    if (range.to) params.to = range.to;
    api
      .get('/sales', { params })
      .then(({ data }) => {
        setSales(data.data.items);
        setMeta({ total: data.data.total, confirmedPremium: data.data.confirmedPremium });
      })
      .catch(() => setSales([]));
  }, [filters, range.from, range.to]);

  useEffect(() => {
    api.get('/sales/catalog').then(({ data }) => setEndorsableFields(data.data.endorsableFields || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function issue(sale) {
    if (!window.confirm(`Issue policy ${sale.reference}? After issuing it can't be edited — only endorsed or cancelled.`))
      return;
    try {
      await api.patch(`/sales/${sale.id}/status`, { status: 'CONFIRMED' });
      toast.success('Policy issued');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not issue');
    }
  }

  async function remove(sale) {
    if (!window.confirm(`Delete draft ${sale.reference}?`)) return;
    try {
      await api.delete(`/sales/${sale.id}`);
      toast.success('Draft deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  }

  function pdf(sale, download) {
    fetchFile(`/sales/${sale.id}/pdf`, {
      params: download ? { download: 1 } : undefined,
      filename: `certificate-${sale.reference}.pdf`,
      open: !download,
    }).catch(() => toast.error('Could not fetch the PDF'));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-40"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Input
            className="w-60"
            placeholder="Search reference / customer / plan…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <DateRangePicker value={range} onChange={setRange} presets={DATE_PRESETS} />
        </div>
        <Button onClick={() => navigate('/sales/new')}>
          <Plus size={16} />
          Record Manual Sale
        </Button>
      </div>

      {sales === null ? (
        <p className="text-sm text-brand-slate">Loading sales…</p>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No sales recorded"
          description="Record a manual sale — pick a plan slab, add-ons and customer details, and a certificate PDF is generated."
          action={
            <Button onClick={() => navigate('/sales/new')}>
              <Plus size={16} />
              Record Manual Sale
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex gap-4 text-sm text-brand-slate">
            <span>
              {meta.total} sale{meta.total === 1 ? '' : 's'}
            </span>
            <span>
              Confirmed premium:{' '}
              <strong className="text-brand-ink">{inr(meta.confirmedPremium, { decimals: true })}</strong>
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
            <table className="w-full min-w-[1140px] text-sm">
              <thead>
                <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Front</th>
                  <th className="px-4 py-3">Left</th>
                  <th className="px-4 py-3">Right</th>
                  <th className="px-4 py-3">Plan / Slab</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-brand-line last:border-0">
                    <td className="px-4 py-3">
                      <button
                        className="font-medium text-brand-blue hover:underline"
                        onClick={() => navigate(`/sales/${s.id}`)}
                      >
                        {s.reference}
                      </button>
                      {s.proposalNo && (
                        <div className="text-[11px] text-brand-slate">from {s.proposalNo}</div>
                      )}
                      {s.endorsements?.length > 0 && (
                        <div className="text-[11px] text-brand-slate">{s.endorsements.length} endorsement(s)</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-ink">{s.customerName}</div>
                      <div className="text-xs text-brand-slate">{s.petName || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <PetPhotoCell photos={s.photos} kind="FRONT" />
                    </td>
                    <td className="px-4 py-3">
                      <PetPhotoCell photos={s.photos} kind="LEFT" />
                    </td>
                    <td className="px-4 py-3">
                      <PetPhotoCell photos={s.photos} kind="RIGHT" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-ink">{s.planName}</div>
                      <div className="text-xs text-brand-slate">
                        {s.insurerName} · {s.slabLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-ink">{inr(s.totalPremium, { decimals: true })}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[s.status]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-slate">
                      {new Date(s.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {s.status !== 'CANCELLED' && (
                          <button
                            title="View PDF"
                            onClick={() => pdf(s, false)}
                            className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                          >
                            <FileText size={15} />
                          </button>
                        )}
                        {s.status === 'CONFIRMED' && (
                          <button
                            title="Download PDF"
                            onClick={() => pdf(s, true)}
                            className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                          >
                            <Download size={15} />
                          </button>
                        )}

                        {s.status === 'DRAFT' && (
                          <>
                            <button
                              title="Issue policy"
                              onClick={() => issue(s)}
                              className="rounded-lg p-1.5 text-brand-slate hover:bg-green-50 hover:text-green-700"
                            >
                              <BadgeCheck size={15} />
                            </button>
                            <button
                              title="Edit draft"
                              onClick={() => navigate(`/sales/${s.id}/edit`)}
                              className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              title="Delete draft"
                              onClick={() => remove(s)}
                              className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}

                        {s.status === 'CONFIRMED' && (
                          <>
                            <button
                              title="Endorse (basic details)"
                              onClick={() => setEndorseFor(s)}
                              className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                            >
                              <FileSignature size={15} />
                            </button>
                            <button
                              title="Cancel policy"
                              onClick={() => setCancelFor(s)}
                              className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                            >
                              <Ban size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <EndorseModal
        open={!!endorseFor}
        onClose={() => setEndorseFor(null)}
        sale={endorseFor}
        fields={endorsableFields}
        onDone={load}
      />
      <CancelModal open={!!cancelFor} onClose={() => setCancelFor(null)} sale={cancelFor} onDone={load} />
    </div>
  );
}
