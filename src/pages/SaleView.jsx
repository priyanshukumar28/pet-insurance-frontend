import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { BASE_URL } from '../api/axios.js';
import Button from '../components/UI/Button.jsx';
import { fetchFile } from '../lib/download.js';
import { inr } from '../lib/format.js';

const ASSET_BASE = BASE_URL.replace(/\/api\/?$/, '');
const assetUrl = (u) => (u && /^https?:/.test(u) ? u : `${ASSET_BASE}${u || ''}`);
const KIND_LABEL = { FRONT: 'Front', LEFT: 'Left', RIGHT: 'Right' };
const STATUS_STYLES = {
  DRAFT: 'bg-brand-line/60 text-brand-slate',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};
const COVERAGE_LABELS = {
  FRACTURE: 'Fracture',
  HOSPITALIZATION: 'Hospitalization',
  PER_DAY_LIMIT: 'Per day limit',
  OPD: 'OPD',
  TB_LIABILITY: 'TP Liability',
  INJURY_COVER: 'Injury cover',
  ILLNESS_COVER: 'Illness cover',
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-brand-slate">{k}</dt>
      <dd className="text-right font-medium text-brand-ink">{v ?? '—'}</dd>
    </div>
  );
}

export default function SaleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [s, setS] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/sales/${id}`)
      .then(({ data }) => setS(data.data.sale))
      .catch(() => setNotFound(true));
  }, [id]);

  const back = (
    <button
      onClick={() => navigate('/sales')}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-slate hover:text-brand-blue"
    >
      <ArrowLeft size={16} /> Back to Sales
    </button>
  );

  if (notFound) return <div className="space-y-4">{back}<p className="text-sm text-brand-slate">Sale not found.</p></div>;
  if (!s) return <p className="text-sm text-brand-slate">Loading…</p>;

  function pdf(download) {
    fetchFile(`/sales/${id}/pdf`, {
      params: download ? { download: 1 } : undefined,
      filename: `certificate-${s.reference}.pdf`,
      open: !download,
    }).catch(() => toast.error('Could not fetch the PDF'));
  }

  return (
    <div className="space-y-5">
      {back}

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-brand-ink">{s.reference}</h2>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[s.status]}`}>
              {s.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-brand-slate">
            {s.channel} · issued {fmtDate(s.issuedAt)}
            {s.proposalNo && (
              <>
                {' · from proposal '}
                <button className="font-medium text-brand-blue hover:underline" onClick={() => navigate(`/proposals/${s.proposalNo}`)}>
                  {s.proposalNo}
                </button>
              </>
            )}
          </p>
        </div>
        {s.status !== 'CANCELLED' && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => pdf(false)}>
              <FileText size={14} /> View PDF
            </Button>
            <Button variant="secondary" onClick={() => pdf(true)}>
              <Download size={14} /> Download
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Customer</h3>
          <dl className="divide-y divide-brand-line">
            <Row k="Name" v={s.customerName} />
            <Row k="Mobile" v={s.customerPhone} />
            <Row k="Email" v={s.customerEmail} />
            <Row k="Address" v={s.customerAddress} />
          </dl>
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Pet</h3>
          <dl className="divide-y divide-brand-line">
            <Row k="Name" v={s.petName} />
            <Row k="Type" v={s.petType} />
            <Row k="Breed" v={s.petBreed} />
            <Row k="Age" v={s.petAgeMonths != null ? `${s.petAgeMonths} months` : null} />
            <Row k="Weight" v={s.petWeightKg != null ? `${s.petWeightKg} kg` : null} />
          </dl>
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Pet photos</h3>
          {s.photos?.length ? (
            <div className="grid grid-cols-3 gap-3 sm:max-w-md">
              {s.photos.map((ph) => (
                <a key={ph.kind} href={assetUrl(ph.url)} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-brand-line">
                  <img src={assetUrl(ph.url)} alt={KIND_LABEL[ph.kind] || ph.kind} className="aspect-square w-full object-cover" />
                  <span className="block bg-brand-bg px-2 py-1 text-center text-[11px] font-medium text-brand-slate">
                    {KIND_LABEL[ph.kind] || ph.kind}
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-slate">No photos on this policy.</p>
          )}
        </section>

        <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-brand-ink">Plan &amp; cover</h3>
          <dl className="grid grid-cols-2 gap-x-8 md:grid-cols-3">
            <Row k="Plan" v={s.planName} />
            <Row k="Insurer" v={s.insurerName} />
            <Row k="Slab" v={s.slabLabel} />
            <Row k="Sum Insured (Surgery)" v={s.surgerySumInsured != null ? inr(s.surgerySumInsured) : null} />
            {Object.entries(COVERAGE_LABELS).map(([key, label]) => (
              <Row
                key={key}
                k={label}
                v={
                  s.coveragesSnapshot?.[key] == null || s.coveragesSnapshot?.[key] === ''
                    ? 'Not covered'
                    : inr(s.coveragesSnapshot[key])
                }
              />
            ))}
            <Row k="Base premium" v={inr(s.basePremium, { decimals: true })} />
            <Row k="Add-ons" v={inr(s.addonsPremium, { decimals: true })} />
            <Row k="GST" v={inr(s.gstAmount, { decimals: true })} />
            <Row k="Total premium" v={inr(s.totalPremium, { decimals: true })} />
            <Row k="Cover period" v={`${fmtDate(s.policyStartDate)} — ${fmtDate(s.policyEndDate)}`} />
          </dl>
        </section>
      </div>
    </div>
  );
}
