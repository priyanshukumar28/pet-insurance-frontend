import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileSignature, Pencil, Ban, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { BASE_URL } from '../api/axios.js';
import Modal from '../components/UI/Modal.jsx';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Select, Textarea } from '../components/UI/Field.jsx';
import { inr } from '../lib/format.js';
import { PROPOSAL_STATUS_STYLES } from './Proposals.jsx';

const SOURCE_LABELS = { PARTNER_API: 'Partner API', WEBSITE: 'Website', ADMIN: 'Admin' };
const ASSET_BASE = BASE_URL.replace(/\/api\/?$/, '');
const assetUrl = (u) => (u && /^https?:/.test(u) ? u : `${ASSET_BASE}${u || ''}`);
const KIND_LABEL = { FRONT: 'Front', LEFT: 'Left', RIGHT: 'Right' };
const COVERAGE_LABELS = {
  FRACTURE: 'Fracture',
  HOSPITALIZATION: 'Hospitalization',
  PER_DAY_LIMIT: 'Per day limit',
  OPD: 'OPD',
  TB_LIABILITY: 'TB liability',
  INJURY_COVER: 'Injury cover',
  ILLNESS_COVER: 'Illness cover',
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
const yn = (v) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '—');

function fmtDateTime(d) {
  return d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-brand-slate">{k}</dt>
      <dd className="text-right font-medium text-brand-ink">{v ?? '—'}</dd>
    </div>
  );
}

export default function ProposalDetail() {
  const { proposalNo } = useParams();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get(`/proposals/${encodeURIComponent(proposalNo)}`)
      .then(({ data }) => setP(data.data.proposal))
      .catch(() => setNotFound(true));
  }, [proposalNo]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(status) {
    const verb = status === 'CANCELLED' ? 'cancel' : status === 'EXPIRED' ? 'mark expired' : 'reopen';
    if (!window.confirm(`${verb[0].toUpperCase() + verb.slice(1)} proposal ${p.proposalNo}?`)) return;
    try {
      await api.patch(`/proposals/${p.id}/status`, { status });
      toast.success(`Proposal ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  }

  async function remove() {
    if (!window.confirm(`Delete proposal ${p.proposalNo}? This cannot be undone.`)) return;
    try {
      await api.delete(`/proposals/${p.id}`);
      toast.success('Proposal deleted');
      navigate('/proposals');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  }

  function openEdit() {
    setEdit({
      customerName: p.petParent.name || '',
      customerMobile: p.petParent.mobile || '',
      customerEmail: p.petParent.email || '',
      petName: p.pet.name || '',
      petBreed: p.pet.breed || '',
      petType: p.pet.type || '',
      petAgeMonths: p.pet.ageMonths ?? '',
      petWeightKg: p.pet.weightKg ?? '',
      notes: p.notes || '',
    });
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.put(`/proposals/${p.id}`, {
        ...edit,
        petAgeMonths: edit.petAgeMonths === '' ? undefined : Number(edit.petAgeMonths),
        petWeightKg: edit.petWeightKg === '' ? undefined : Number(edit.petWeightKg),
      });
      toast.success('Proposal updated');
      setEdit(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <BackLink navigate={navigate} />
        <p className="text-sm text-brand-slate">Proposal not found.</p>
      </div>
    );
  }
  if (!p) return <p className="text-sm text-brand-slate">Loading…</p>;

  const canConvert = p.status !== 'CONVERTED' && p.status !== 'CANCELLED';

  return (
    <div className="space-y-5">
      <BackLink navigate={navigate} />

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">{p.proposalNo}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PROPOSAL_STATUS_STYLES[p.status]}`}>
              {p.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-brand-slate">
            {SOURCE_LABELS[p.source] || p.source}
            {p.apiClient ? ` · ${p.apiClient.name}` : ''} · created {fmtDateTime(p.createdAt)}
            {p.status !== 'CONVERTED' && ` · reached step ${p.journeyStep ?? 1} of 4`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canConvert && (
            <Button onClick={() => navigate(`/sales/new?proposalId=${encodeURIComponent(p.id)}`)}>
              <FileSignature size={15} /> Create certificate
            </Button>
          )}
          {p.status !== 'CONVERTED' && (
            <Button variant="secondary" onClick={openEdit}>
              <Pencil size={14} /> Edit
            </Button>
          )}
          {canConvert && p.status !== 'EXPIRED' && (
            <Button variant="secondary" onClick={() => setStatus('EXPIRED')}>
              <Clock size={14} /> Mark expired
            </Button>
          )}
          {canConvert && (
            <Button variant="danger" onClick={() => setStatus('CANCELLED')}>
              <Ban size={14} /> Cancel
            </Button>
          )}
          {p.status !== 'CONVERTED' && (
            <Button variant="danger" onClick={remove}>
              <Trash2 size={14} /> Delete
            </Button>
          )}
        </div>
      </div>

      {p.certificate && (
        <div className="rounded-xl2 border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Converted to certificate <strong>{p.certificate.reference}</strong> ({p.certificate.status}) on{' '}
          {fmtDateTime(p.convertedAt)}.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Pet parent</h3>
          <dl className="divide-y divide-brand-line">
            <Row k="Name" v={p.petParent.name} />
            <Row k="Mobile" v={p.petParent.mobile} />
            <Row k="Email" v={p.petParent.email} />
          </dl>
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Pet</h3>
          <dl className="divide-y divide-brand-line">
            <Row k="Name" v={p.pet.name} />
            <Row k="Type" v={p.pet.type} />
            <Row k="Breed" v={p.pet.breed} />
            <Row k="Age" v={p.pet.ageText || (p.pet.ageMonths != null ? `${p.pet.ageMonths} months` : null)} />
            <Row k="Weight" v={p.pet.weightKg != null ? `${p.pet.weightKg} kg` : null} />
          </dl>
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Proposer &amp; address</h3>
          <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-3">
            <Row k="Title" v={p.proposer?.title} />
            <Row k="First name" v={p.proposer?.firstName} />
            <Row k="Middle name" v={p.proposer?.middleName} />
            <Row k="Last name" v={p.proposer?.lastName} />
            <Row k="Gender" v={p.proposer?.gender} />
            <Row k="Date of birth" v={p.proposer?.dob ? fmtDate(p.proposer.dob) : null} />
            <Row k="Name as per Aadhaar" v={p.proposer?.aadhaarName} />
            <Row k="PAN" v={p.proposer?.panNo} />
            <Row k="GST / UIN" v={p.proposer?.gstUin} />
            <Row k="Addressee" v={p.proposer?.addressee} />
            <Row k="House / Building" v={p.proposer?.houseBuilding} />
            <Row k="Street" v={p.proposer?.streetName} />
            <Row k="Subarea / City" v={p.proposer?.subareaCity} />
            <Row k="State" v={p.proposer?.state} />
            <Row k="Pincode" v={p.proposer?.pincode} />
            <Row k="Fax" v={p.proposer?.fax} />
          </dl>
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Eligibility &amp; consent</h3>
          <dl className="divide-y divide-brand-line">
            <Row k="Pet sound & healthy" v={yn(p.eligibility?.sound)} />
            <Row k="Vaccinated (3+)" v={yn(p.eligibility?.vacc)} />
            <Row k="Declaration accepted" v={p.declarationAccepted ? 'Yes' : 'No'} />
          </dl>
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Pet photos</h3>
          {p.photos?.length ? (
            <div className="grid grid-cols-3 gap-3">
              {p.photos.map((ph) => (
                <a
                  key={ph.kind}
                  href={assetUrl(ph.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="block overflow-hidden rounded-lg border border-brand-line"
                >
                  <img src={assetUrl(ph.url)} alt={KIND_LABEL[ph.kind] || ph.kind} className="aspect-square w-full object-cover" />
                  <span className="block bg-brand-bg px-2 py-1 text-center text-[11px] font-medium text-brand-slate">
                    {KIND_LABEL[ph.kind] || ph.kind}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-slate">No photos uploaded yet.</p>
          )}
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Selected cover &amp; quote</h3>
          {p.quote ? (
            <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-3">
              <Row k="Plan" v={p.quote.planName} />
              <Row k="Insurer" v={p.quote.insurerName} />
              <Row k="Slab" v={p.quote.slabLabel} />
              <Row k="Sum Insured (Surgery)" v={p.quote.surgerySumInsured != null ? inr(p.quote.surgerySumInsured) : null} />
              {Object.entries(COVERAGE_LABELS).map(([key, label]) => (
                <Row
                  key={key}
                  k={label}
                  v={
                    p.quote.coverages?.[key] == null || p.quote.coverages?.[key] === ''
                      ? 'Not covered'
                      : inr(p.quote.coverages[key])
                  }
                />
              ))}
              <Row k="Base premium" v={inr(p.quote.basePremium, { decimals: true })} />
              <Row k="Add-ons" v={inr(p.quote.addonsPremium, { decimals: true })} />
              <Row k="GST" v={inr(p.quote.gstAmount, { decimals: true })} />
              <Row k="Total" v={inr(p.quote.totalPremium, { decimals: true })} />
              <Row k="Cover term" v={p.quote.coverTermMonths ? `${p.quote.coverTermMonths} months` : null} />
              <Row k="Quoted at" v={fmtDateTime(p.lastQuotedAt)} />
            </dl>
          ) : (
            <p className="text-sm text-brand-slate">No plan chosen yet.</p>
          )}
        </section>

        {p.notes && (
          <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-brand-ink">Notes</h3>
            <p className="whitespace-pre-wrap text-sm text-brand-ink">{p.notes}</p>
          </section>
        )}
      </div>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        title={`Edit ${p.proposalNo}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Pet parent name" required>
                <Input value={edit.customerName} onChange={(e) => setEdit({ ...edit, customerName: e.target.value })} />
              </Field>
            </div>
            <Field label="Mobile" required>
              <Input value={edit.customerMobile} onChange={(e) => setEdit({ ...edit, customerMobile: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input value={edit.customerEmail} onChange={(e) => setEdit({ ...edit, customerEmail: e.target.value })} />
            </Field>
            <Field label="Pet name">
              <Input value={edit.petName} onChange={(e) => setEdit({ ...edit, petName: e.target.value })} />
            </Field>
            <Field label="Breed">
              <Input value={edit.petBreed} onChange={(e) => setEdit({ ...edit, petBreed: e.target.value })} />
            </Field>
            <Field label="Pet type">
              <Select value={edit.petType} onChange={(e) => setEdit({ ...edit, petType: e.target.value })}>
                <option value="">—</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
                <option value="Other">Other</option>
              </Select>
            </Field>
            <Field label="Age (months)">
              <Input
                type="number"
                min="0"
                value={edit.petAgeMonths}
                onChange={(e) => setEdit({ ...edit, petAgeMonths: e.target.value })}
              />
            </Field>
            <Field label="Weight (kg)">
              <Input value={edit.petWeightKg} onChange={(e) => setEdit({ ...edit, petWeightKg: e.target.value })} />
            </Field>
            <div className="col-span-2">
              <Field label="Notes">
                <Textarea rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} />
              </Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function BackLink({ navigate }) {
  return (
    <button
      onClick={() => navigate('/proposals')}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-slate hover:text-brand-blue"
    >
      <ArrowLeft size={16} /> Back to Proposals
    </button>
  );
}
