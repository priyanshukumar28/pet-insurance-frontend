import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, Download, RefreshCw, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Textarea, Select, Label } from '../components/UI/Field.jsx';
import { inr } from '../lib/format.js';
import { fetchFile } from '../lib/download.js';

const COVERAGE_LABELS = {
  FRACTURE: 'Fracture',
  HOSPITALIZATION: 'Hospitalization',
  PER_DAY_LIMIT: 'Per Day Limit',
  OPD: 'OPD',
  TB_LIABILITY: 'TP Liability',
  INJURY_COVER: 'Injury Cover',
  ILLNESS_COVER: 'Illness Cover',
};

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function startOfUtcDay(d = new Date()) {
  const dt = new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}
function addMonthsClamped(date, months) {
  const d = startOfUtcDay(date);
  const mi = d.getUTCMonth() + months;
  const y = d.getUTCFullYear() + Math.floor(mi / 12);
  const m = ((mi % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}
// Mirror of the backend: start = today, end = start + term − 1 day.
function coverPeriod(termMonths) {
  const start = startOfUtcDay();
  const end = new Date(addMonthsClamped(start, termMonths || 12).getTime() - 86400000);
  return { start, end };
}
function fmtDate(d) {
  return d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
}

const BLANK = {
  planId: '',
  planVariantId: '',
  addonIds: [],
  channel: 'MANUAL',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerAddress: '',
  petName: '',
  petType: '',
  petBreed: '',
  petAgeMonths: '',
  petWeightKg: '',
  pdfOverrides: {},
};

export default function SaleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const proposalRef = searchParams.get('proposalId');

  const [catalog, setCatalog] = useState(null);
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState(isEdit ? null : { ...BLANK });
  const [snapshot, setSnapshot] = useState(null); // stored sale snapshot (edit)
  const [proposal, setProposal] = useState(null); // source proposal (new-from-proposal)
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/sales/catalog'), api.get('/plans')])
      .then(async ([cat, pl]) => {
        setCatalog(cat.data.data);
        setPlans(pl.data.data.items);
        if (!isEdit && proposalRef) {
          try {
            const { data } = await api.get(`/proposals/${encodeURIComponent(proposalRef)}`);
            const p = data.data.proposal;
            setProposal(p);
            setForm((f) => ({
              ...f,
              channel: 'WEBSITE',
              planId: p.selection?.planId || f.planId,
              planVariantId: p.selection?.planVariantId || f.planVariantId,
              addonIds: p.selection?.addonIds?.length ? p.selection.addonIds : f.addonIds,
              customerName: p.petParent?.name || '',
              customerEmail: p.petParent?.email || '',
              customerPhone: p.petParent?.mobile || '',
              petName: p.pet?.name || '',
              petType: p.pet?.type || '',
              petBreed: p.pet?.breed || '',
              petAgeMonths: p.pet?.ageMonths ?? '',
              petWeightKg: p.pet?.weightKg ?? '',
            }));
          } catch {
            toast.error('Could not load the linked proposal — creating a blank sale.');
          }
        }
        if (isEdit) {
          const { data } = await api.get(`/sales/${id}`);
          const s = data.data.sale;
          if (s.status !== 'DRAFT') {
            toast.error('Issued policies can’t be edited. Use Endorse or Cancel from the Sales list.');
            navigate('/sales', { replace: true });
            return;
          }
          setSnapshot(s);
          setForm({
            planId: s.planId || '',
            planVariantId: s.planVariantId || '',
            addonIds: (s.addonsSnapshot || []).map((a) => a.id).filter(Boolean),
            channel: s.channel,
            customerName: s.customerName || '',
            customerEmail: s.customerEmail || '',
            customerPhone: s.customerPhone || '',
            customerAddress: s.customerAddress || '',
            petName: s.petName || '',
            petType: s.petType || '',
            petBreed: s.petBreed || '',
            petAgeMonths: s.petAgeMonths ?? '',
            petWeightKg: s.petWeightKg ?? '',
            pdfOverrides: s.pdfOverrides || {},
          });
        }
      })
      .catch(() => toast.error('Could not load the sale form'));
  }, [id, isEdit, proposalRef]);

  const selectedPlan = useMemo(() => plans.find((p) => p.id === form?.planId), [plans, form?.planId]);
  const selectedVariant = useMemo(
    () => selectedPlan?.variants.find((v) => v.id === form?.planVariantId),
    [selectedPlan, form?.planVariantId]
  );
  const selectedAddons = useMemo(
    () => (selectedPlan?.addons || []).filter((a) => form?.addonIds.includes(a.id)),
    [selectedPlan, form?.addonIds]
  );

  const pricing = useMemo(() => {
    if (!selectedVariant) return null;
    const base = Number(selectedVariant.premium) || 0;
    const baseWithGst = Number(selectedVariant.premiumWithGst) || base;
    const addonsPremium = selectedAddons.reduce((s, a) => s + (Number(a.additionalPremium) || 0), 0);
    const addonsWithGst = selectedAddons.reduce(
      (s, a) => s + (Number(a.additionalPremiumWithGst) || Number(a.additionalPremium) || 0),
      0
    );
    const total = round2(baseWithGst + addonsWithGst);
    return {
      basePremium: round2(base),
      addonsPremium: round2(addonsPremium),
      gstAmount: round2(total - base - addonsPremium),
      totalPremium: total,
    };
  }, [selectedVariant, selectedAddons]);

  // Issue date is always today; cover dates come from the plan's term.
  const cover = useMemo(
    () => coverPeriod(selectedPlan?.coverTermMonths ?? 12),
    [selectedPlan?.coverTermMonths]
  );

  // Whether the selected plan can be sold today (its saleable window).
  const saleBlock = useMemo(() => {
    if (!selectedPlan) return null;
    const today = startOfUtcDay();
    const from = selectedPlan.saleableFrom ? startOfUtcDay(selectedPlan.saleableFrom) : null;
    const until = selectedPlan.saleableUntil ? startOfUtcDay(selectedPlan.saleableUntil) : null;
    if (from && today < from) return `This plan is not open for sale until ${fmtDate(from)}.`;
    if (until && today > until)
      return `This plan was saleable only up to ${fmtDate(until)} — new policies can no longer be issued against it.`;
    return null;
  }, [selectedPlan]);

  // Effective benefits shown on the PDF for this slab.
  const effectiveBenefits = useMemo(() => {
    if (!selectedVariant) return [];
    if (selectedVariant.benefits?.length) return selectedVariant.benefits;
    return selectedPlan?.commonBenefits || [];
  }, [selectedVariant, selectedPlan]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setOverride(key, value) {
    setForm((f) => ({ ...f, pdfOverrides: { ...f.pdfOverrides, [key]: value } }));
  }
  function toggleAddon(addonId) {
    setForm((f) => ({
      ...f,
      addonIds: f.addonIds.includes(addonId)
        ? f.addonIds.filter((x) => x !== addonId)
        : [...f.addonIds, addonId],
    }));
  }
  function pickPlan(planId) {
    const plan = plans.find((p) => p.id === planId);
    setForm((f) => ({
      ...f,
      planId,
      planVariantId: plan?.variants[0]?.id || '',
      addonIds: [],
    }));
  }

  function payload(extra = {}) {
    return {
      ...form,
      petAgeMonths: form.petAgeMonths === '' ? null : Number(form.petAgeMonths),
      petWeightKg: form.petWeightKg === '' || form.petWeightKg == null ? null : Number(form.petWeightKg),
      ...(proposal && !isEdit ? { proposalId: proposal.id } : {}),
      ...extra,
    };
  }

  async function save(extra) {
    if (!form.planId || !form.planVariantId) return toast.error('Pick a plan and a slab');
    if (!form.customerName.trim()) return toast.error('Customer name is required');
    if (!isEdit && saleBlock) return toast.error(saleBlock);
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/sales/${id}`, payload(extra));
        toast.success('Sale updated');
      } else {
        const { data } = await api.post('/sales', payload(extra));
        toast.success(`Policy issued — ${data.data.sale.reference}`);
      }
      navigate('/sales');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the sale');
    } finally {
      setSaving(false);
    }
  }

  async function reprice() {
    setSaving(true);
    try {
      await api.put(`/sales/${id}`, payload({ reprice: true }));
      toast.success('Re-synced with the current plan');
      const { data } = await api.get(`/sales/${id}`);
      setSnapshot(data.data.sale);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not re-sync');
    } finally {
      setSaving(false);
    }
  }

  if (!catalog || !form) return <p className="text-sm text-brand-slate">Loading…</p>;

  const planMissing = isEdit && form.planId && !selectedPlan;
  const secondaryKeys = Object.keys(COVERAGE_LABELS);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/sales')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-slate hover:text-brand-blue"
      >
        <ArrowLeft size={16} /> Back to Sales
      </button>

      {proposal && !isEdit && (
        <div className="flex items-center gap-2 rounded-xl2 border border-brand-blue/30 bg-brand-blueTint px-4 py-3 text-sm text-brand-blue">
          <ClipboardList size={16} />
          <span>
            Issuing from proposal <strong>{proposal.proposalNo}</strong>
            {proposal.pet?.name ? ` · ${proposal.pet.name}` : ''}. It will be marked converted once the policy issues.
          </span>
        </div>
      )}

      {isEdit && snapshot && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-brand-line bg-white p-4 shadow-card">
          <div className="text-sm">
            <span className="font-semibold text-brand-ink">{snapshot.reference}</span>
            <span className="ml-2 text-brand-slate">
              recorded {new Date(snapshot.createdAt).toLocaleDateString('en-IN')}
              {snapshot.soldBy ? ` by ${snapshot.soldBy.name}` : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={reprice} disabled={saving}>
              <RefreshCw size={14} /> Re-sync pricing
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                fetchFile(`/sales/${id}/pdf`, { open: true }).catch(() => toast.error('Could not open PDF'))
              }
            >
              <FileText size={14} /> View PDF
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                fetchFile(`/sales/${id}/pdf`, {
                  params: { download: 1 },
                  filename: `certificate-${snapshot.reference}.pdf`,
                }).catch(() => toast.error('Could not download PDF'))
              }
            >
              <Download size={14} /> Download
            </Button>
          </div>
        </div>
      )}

      {planMissing && (
        <p className="rounded-lg bg-brand-orangeTint px-4 py-2.5 text-sm text-brand-orangeDark">
          The plan on this sale no longer exists. The stored snapshot is still used for the certificate. Pick a
          current plan below to re-map it, or leave as-is.
        </p>
      )}

      {/* 1. Plan & slab */}
      <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-brand-ink">Plan & slab</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Plan" required>
            <Select value={form.planId} onChange={(e) => pickPlan(e.target.value)}>
              <option value="">Select plan…</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.insurer?.shortName || p.insurer?.name) + ' — ' + p.name}
                  {p.status !== 'PUBLISHED' ? ` (${p.status.toLowerCase()})` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Slab" required hint="drives the certificate">
            <Select
              value={form.planVariantId}
              onChange={(e) => set('planVariantId', e.target.value)}
              disabled={!selectedPlan}
            >
              <option value="">Select slab…</option>
              {(selectedPlan?.variants || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} — SI {inr(v.surgerySumInsured)} · {inr(v.premium)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Channel">
            <Select value={form.channel} onChange={(e) => set('channel', e.target.value)}>
              {catalog.saleChannels.map((c) => (
                <option key={c} value={c}>
                  {c[0] + c.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {selectedPlan?.addons?.length > 0 && (
          <div className="mt-4">
            <Label hint="each adds its premium on top of the slab">Add-ons</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {selectedPlan.addons.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAddon(a.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.addonIds.includes(a.id)
                      ? 'border-brand-blue bg-brand-blueTint text-brand-blue'
                      : 'border-brand-line bg-white text-brand-slate'
                  }`}
                >
                  {a.name} · +{inr(a.additionalPremiumWithGst ?? a.additionalPremium, { decimals: true })}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedVariant && (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg bg-brand-bg p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-slate">Premium</p>
              <dl className="space-y-1 text-sm">
                <Row k="Base premium" v={inr(pricing.basePremium, { decimals: true })} />
                <Row k="Add-ons" v={inr(pricing.addonsPremium, { decimals: true })} />
                <Row k="GST" v={inr(pricing.gstAmount, { decimals: true })} />
                <div className="mt-1 border-t border-brand-line pt-1">
                  <Row k="Total payable" v={inr(pricing.totalPremium, { decimals: true })} strong />
                </div>
              </dl>
            </div>
            <div className="rounded-lg bg-brand-bg p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-slate">
                Coverage on this slab
              </p>
              <dl className="space-y-1 text-sm">
                <Row k="Surgery (SI)" v={inr(selectedVariant.surgerySumInsured)} />
                {secondaryKeys.map((key) => (
                  <Row
                    key={key}
                    k={COVERAGE_LABELS[key]}
                    v={
                      selectedVariant.coverages?.[key] == null || selectedVariant.coverages?.[key] === ''
                        ? 'Not covered'
                        : inr(selectedVariant.coverages[key])
                    }
                  />
                ))}
              </dl>
            </div>
            <div className="rounded-lg bg-brand-bg p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-slate">
                Benefits on this slab
              </p>
              <ul className="space-y-1 text-sm">
                {effectiveBenefits.map((b) => (
                  <li key={b.key} className={b.included ? 'text-brand-ink' : 'text-brand-slate line-through'}>
                    {b.included ? '✓' : '✕'} {b.label}
                  </li>
                ))}
                {effectiveBenefits.length === 0 && <li className="text-brand-slate">No benefits configured.</li>}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 2. Customer & pet */}
      <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <h3 className="mb-4 text-sm font-semibold text-brand-ink">Customer & pet</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Customer name" required>
            <Input value={form.customerName} onChange={(e) => set('customerName', e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={form.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={form.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Address">
              <Textarea rows={2} value={form.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} />
            </Field>
          </div>
          <Field label="Pet name">
            <Input value={form.petName} onChange={(e) => set('petName', e.target.value)} />
          </Field>
          <Field label="Pet type">
            <Select value={form.petType} onChange={(e) => set('petType', e.target.value)}>
              <option value="">—</option>
              {catalog.petTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Breed">
            <Input value={form.petBreed} onChange={(e) => set('petBreed', e.target.value)} />
          </Field>
          <Field label="Pet age (months)">
            <Input
              type="number"
              min="0"
              value={form.petAgeMonths}
              onChange={(e) => set('petAgeMonths', e.target.value)}
            />
          </Field>
          <Field label="Pet weight (kg)">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.petWeightKg}
              onChange={(e) => set('petWeightKg', e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* 2b. Issue & cover dates — system-set, not editable */}
      <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-brand-ink">Issue &amp; cover dates</h3>
        <p className="mb-4 mt-1 text-xs text-brand-slate">
          Set automatically. The policy issues today and runs for the plan&apos;s cover term
          {selectedPlan ? ` (${selectedPlan.coverTermMonths ?? 12} month${(selectedPlan.coverTermMonths ?? 12) === 1 ? '' : 's'})` : ''}.
        </p>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div>
            <dt className="text-brand-slate">Issue date</dt>
            <dd className="font-medium text-brand-ink">{fmtDate(cover.start)}</dd>
          </div>
          <div>
            <dt className="text-brand-slate">Cover start</dt>
            <dd className="font-medium text-brand-ink">{fmtDate(cover.start)}</dd>
          </div>
          <div>
            <dt className="text-brand-slate">Cover end</dt>
            <dd className="font-medium text-brand-ink">{selectedPlan ? fmtDate(cover.end) : '—'}</dd>
          </div>
        </dl>
        {saleBlock && !isEdit && (
          <p className="mt-4 rounded-lg bg-brand-orangeTint px-4 py-2.5 text-sm text-brand-orangeDark">
            {saleBlock}
          </p>
        )}
      </section>

      {/* 3. PDF details / overrides */}
      <section className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-brand-ink">Certificate details</h3>
        <p className="mb-4 mt-1 text-xs text-brand-slate">
          Optional. These fill fixed slots on the certificate PDF — they do not change its layout or styling. Plan
          and pricing data always come from the selected slab above.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {catalog.pdfOverrideFields.map((f) =>
            f.multiline ? (
              <div key={f.key} className="md:col-span-2">
                <Field label={f.label}>
                  <Textarea
                    rows={2}
                    value={form.pdfOverrides[f.key] || ''}
                    onChange={(e) => setOverride(f.key, e.target.value)}
                  />
                </Field>
              </div>
            ) : (
              <Field key={f.key} label={f.label}>
                <Input
                  value={form.pdfOverrides[f.key] || ''}
                  onChange={(e) => setOverride(f.key, e.target.value)}
                />
              </Field>
            )
          )}
        </div>
      </section>

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-line bg-brand-bg/80 py-4 backdrop-blur">
        <Button variant="secondary" onClick={() => navigate('/sales')}>
          Cancel
        </Button>
        <Button onClick={() => save()} disabled={saving || (!isEdit && !!saleBlock)}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Issue policy'}
        </Button>
      </div>
    </div>
  );
}

function Row({ k, v, strong }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-brand-slate">{k}</dt>
      <dd className={strong ? 'font-bold text-brand-ink' : 'text-brand-ink'}>{v}</dd>
    </div>
  );
}
