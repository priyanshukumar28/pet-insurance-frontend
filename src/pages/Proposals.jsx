import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import EmptyState from '../components/UI/EmptyState.jsx';
import Modal from '../components/UI/Modal.jsx';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Select } from '../components/UI/Field.jsx';

export const PROPOSAL_STATUS_STYLES = {
  OPEN: 'bg-brand-blueTint text-brand-blue',
  QUOTED: 'bg-brand-orangeTint text-brand-orangeDark',
  CONVERTED: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-brand-line/60 text-brand-slate',
  CANCELLED: 'bg-red-100 text-red-700',
};
const SOURCE_LABELS = { PARTNER_API: 'Partner API', WEBSITE: 'Website', ADMIN: 'Admin' };

const BLANK = { customerName: '', customerMobile: '', customerEmail: '', petName: '', petBreed: '', petType: '', age: '', ageUnit: 'YEAR', petWeightKg: '' };

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function Proposals() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [meta, setMeta] = useState({ total: 0, openCount: 0 });
  const [catalog, setCatalog] = useState({ statuses: [], sources: [] });
  const [filters, setFilters] = useState({ status: '', source: '', q: '' });
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.source) params.source = filters.source;
    if (filters.q) params.q = filters.q;
    api
      .get('/proposals', { params })
      .then(({ data }) => {
        setItems(data.data.items);
        setMeta({ total: data.data.total, openCount: data.data.openCount });
      })
      .catch(() => setItems([]));
  }, [filters]);

  useEffect(() => {
    api.get('/proposals/catalog').then(({ data }) => setCatalog(data.data)).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function setField(key, value) {
    setModal((m) => ({ ...m, [key]: value }));
  }

  async function create() {
    if (!modal.customerName.trim()) return toast.error('Pet parent name is required');
    if (!/^\d{10}$/.test(modal.customerMobile.replace(/\D/g, ''))) return toast.error('Enter a valid 10-digit mobile');
    setSaving(true);
    try {
      const { data } = await api.post('/proposals', {
        customerName: modal.customerName,
        customerMobile: modal.customerMobile,
        customerEmail: modal.customerEmail || undefined,
        petName: modal.petName || undefined,
        petBreed: modal.petBreed || undefined,
        petType: modal.petType || undefined,
        age: modal.age || undefined,
        ageUnit: modal.ageUnit,
        petWeightKg: modal.petWeightKg || undefined,
      });
      toast.success(`Created ${data.data.proposal.proposalNo}`);
      setModal(null);
      navigate(`/proposals/${encodeURIComponent(data.data.proposal.proposalNo)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create proposal');
    } finally {
      setSaving(false);
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading proposals…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-40" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Any status</option>
            {catalog.statuses.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <Select className="w-40" value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}>
            <option value="">Any source</option>
            {catalog.sources.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s] || s}
              </option>
            ))}
          </Select>
          <Input
            className="w-64"
            placeholder="Search proposal no / name / mobile / pet…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
        <Button onClick={() => setModal({ ...BLANK })}>
          <Plus size={16} /> New Proposal
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No proposals yet"
          description="Proposals arrive from the partner API or the website's 'save my quote' flow, and can be created here by hand. Convert one to issue its certificate."
          action={
            <Button onClick={() => setModal({ ...BLANK })}>
              <Plus size={16} /> New Proposal
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex gap-4 text-sm text-brand-slate">
            <span>
              {meta.total} proposal{meta.total === 1 ? '' : 's'}
            </span>
            <span>
              Open / quoted: <strong className="text-brand-ink">{meta.openCount}</strong>
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                  <th className="px-4 py-3">Proposal No</th>
                  <th className="px-4 py-3">Pet parent</th>
                  <th className="px-4 py-3">Pet</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr
                    key={p.proposalNo}
                    className="cursor-pointer border-b border-brand-line last:border-0 hover:bg-brand-bg/50"
                    onClick={() => navigate(`/proposals/${encodeURIComponent(p.proposalNo)}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-ink">{p.proposalNo}</div>
                      {p.certificate && <div className="text-[11px] text-green-700">→ {p.certificate.reference}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-ink">{p.petParent.name}</div>
                      <div className="text-xs text-brand-slate">{p.petParent.mobile}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-ink">{p.pet.name || '—'}</div>
                      <div className="text-xs text-brand-slate">
                        {[p.pet.breed, p.pet.ageText].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-slate">{SOURCE_LABELS[p.source] || p.source}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROPOSAL_STATUS_STYLES[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-slate">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          title="Open"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/proposals/${encodeURIComponent(p.proposalNo)}`);
                          }}
                          className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                        >
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title="New Proposal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        {modal && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Pet parent name" required>
                <Input value={modal.customerName} onChange={(e) => setField('customerName', e.target.value)} />
              </Field>
            </div>
            <Field label="Mobile" required>
              <Input value={modal.customerMobile} onChange={(e) => setField('customerMobile', e.target.value)} placeholder="10-digit" />
            </Field>
            <Field label="Email">
              <Input value={modal.customerEmail} onChange={(e) => setField('customerEmail', e.target.value)} />
            </Field>
            <Field label="Pet name">
              <Input value={modal.petName} onChange={(e) => setField('petName', e.target.value)} />
            </Field>
            <Field label="Breed">
              <Input value={modal.petBreed} onChange={(e) => setField('petBreed', e.target.value)} />
            </Field>
            <Field label="Age">
              <Input value={modal.age} onChange={(e) => setField('age', e.target.value)} placeholder="e.g. 3" />
            </Field>
            <Field label="Age unit">
              <Select value={modal.ageUnit} onChange={(e) => setField('ageUnit', e.target.value)}>
                <option value="YEAR">Years</option>
                <option value="MONTH">Months</option>
              </Select>
            </Field>
            <Field label="Weight (kg)">
              <Input value={modal.petWeightKg} onChange={(e) => setField('petWeightKg', e.target.value)} placeholder="e.g. 12.5" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
