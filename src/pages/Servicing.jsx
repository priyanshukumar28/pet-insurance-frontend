import { useEffect, useState } from 'react';
import { LifeBuoy, Search, FileText, Download, FileSignature, Ban, History } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import Button from '../components/UI/Button.jsx';
import { Input } from '../components/UI/Field.jsx';
import { inr } from '../lib/format.js';
import { fetchFile } from '../lib/download.js';
import EndorseModal from '../components/sales/EndorseModal.jsx';
import CancelModal from '../components/sales/CancelModal.jsx';

const STATUS_STYLES = {
  DRAFT: 'bg-brand-line/60 text-brand-slate',
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function Servicing() {
  const [ref, setRef] = useState('');
  const [sale, setSale] = useState(null);
  const [searching, setSearching] = useState(false);
  const [touched, setTouched] = useState(false);
  const [endorsableFields, setEndorsableFields] = useState([]);
  const [endorseOpen, setEndorseOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    api.get('/sales/catalog').then(({ data }) => setEndorsableFields(data.data.endorsableFields || [])).catch(() => {});
  }, []);

  async function search(e) {
    e?.preventDefault();
    if (!ref.trim()) return;
    setSearching(true);
    setTouched(true);
    try {
      const { data } = await api.get('/sales/lookup', { params: { reference: ref.trim() } });
      setSale(data.data.sale);
    } catch (err) {
      setSale(null);
      toast.error(err.response?.data?.message || 'Certificate not found');
    } finally {
      setSearching(false);
    }
  }

  function pdf(download) {
    fetchFile(`/sales/${sale.id}/pdf`, {
      params: download ? { download: 1 } : undefined,
      filename: `certificate-${sale.reference}.pdf`,
      open: !download,
    }).catch(() => toast.error('Could not fetch the PDF'));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <LifeBuoy size={16} className="text-brand-blue" />
          Policy servicing
        </div>
        <p className="mb-4 text-sm text-brand-slate">
          Look up an issued certificate by its number to endorse basic details or cancel it. Issued policies cannot be
          edited otherwise.
        </p>
        <form onSubmit={search} className="flex gap-2">
          <Input
            className="max-w-sm"
            placeholder="Certificate no. e.g. RSR00000000001"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
          />
          <Button type="submit" disabled={searching || !ref.trim()}>
            <Search size={15} />
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </form>
      </div>

      {touched && !sale && !searching && (
        <p className="rounded-lg bg-brand-orangeTint px-4 py-2.5 text-sm text-brand-orangeDark">
          No certificate matched that number.
        </p>
      )}

      {sale && (
        <div className="space-y-4">
          <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-brand-ink">{sale.reference}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[sale.status]}`}>
                    {sale.status}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-brand-slate">
                  {sale.planName} · {sale.insurerName} · {sale.slabLabel}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sale.status === 'CANCELLED' ? (
                  <span className="text-xs text-brand-slate">Policy cancelled — no actions available.</span>
                ) : (
                  <>
                    <Button variant="secondary" onClick={() => pdf(false)}>
                      <FileText size={14} /> View PDF
                    </Button>
                    <Button variant="secondary" onClick={() => pdf(true)}>
                      <Download size={14} /> Download
                    </Button>
                    {sale.status === 'CONFIRMED' && (
                      <>
                        <Button onClick={() => setEndorseOpen(true)}>
                          <FileSignature size={14} /> Endorse
                        </Button>
                        <Button variant="danger" onClick={() => setCancelOpen(true)}>
                          <Ban size={14} /> Cancel
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {sale.status === 'CANCELLED' && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                Cancelled on {fmtDate(sale.cancelledAt)}
                {sale.cancelledByName ? ` by ${sale.cancelledByName}` : ''}
                {sale.cancelReason ? ` — ${sale.cancelReason}` : ''}
              </div>
            )}
            {sale.status === 'DRAFT' && (
              <div className="mt-4 rounded-lg bg-brand-orangeTint px-4 py-3 text-sm text-brand-orangeDark">
                This is still a draft — it must be issued from the Sales tab before it can be endorsed or cancelled.
              </div>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
              <Cell k="Customer" v={sale.customerName} />
              <Cell k="Phone" v={sale.customerPhone} />
              <Cell k="Email" v={sale.customerEmail} />
              <Cell k="Nominee" v={sale.pdfOverrides?.nominee} />
              <Cell k="Address" v={sale.customerAddress} wide />
              <Cell k="Pet" v={[sale.petName, sale.petBreed].filter(Boolean).join(' · ')} />
              <Cell k="Total premium" v={inr(sale.totalPremium, { decimals: true })} />
              <Cell k="Policy period" v={`${fmtDate(sale.policyStartDate)} – ${fmtDate(sale.policyEndDate)}`} />
              <Cell k="Issued" v={fmtDate(sale.issuedAt)} />
            </dl>
          </div>

          <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-ink">
              <History size={15} /> Endorsement history
            </div>
            {(!sale.endorsements || sale.endorsements.length === 0) && (
              <p className="text-sm text-brand-slate">No endorsements on this policy.</p>
            )}
            <ul className="space-y-3">
              {(sale.endorsements || []).map((e) => (
                <li key={e.id} className="rounded-lg border border-brand-line p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-brand-ink">Endorsement {e.number}</span>
                    <span className="text-xs text-brand-slate">
                      {fmtDate(e.createdAt)}
                      {e.endorsedByName ? ` · ${e.endorsedByName}` : ''}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-brand-slate">
                    {(e.changes || []).map((c, i) => (
                      <li key={i}>
                        <span className="text-brand-ink">{c.label}:</span> {c.from || '—'} → {c.to || '—'}
                      </li>
                    ))}
                  </ul>
                  {e.reason && <p className="mt-1 text-xs text-brand-slate">Reason: {e.reason}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <EndorseModal
        open={endorseOpen}
        onClose={() => setEndorseOpen(false)}
        sale={sale}
        fields={endorsableFields}
        onDone={(updated) => setSale(updated)}
      />
      <CancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        sale={sale}
        onDone={(updated) => setSale(updated)}
      />
    </div>
  );
}

function Cell({ k, v, wide }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-slate">{k}</dt>
      <dd className="mt-0.5 text-brand-ink">{v || '—'}</dd>
    </div>
  );
}
