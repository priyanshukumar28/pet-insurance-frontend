import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, Pencil, Trash2, Layers, Puzzle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import EmptyState from '../components/UI/EmptyState.jsx';
import Button from '../components/UI/Button.jsx';
import { Select, Input } from '../components/UI/Field.jsx';
import { inr, STATUS_STYLES } from '../lib/format.js';

const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

// Pet types a plan can be priced separately for (mirrors the backend catalog).
const PET_PRICED = ['Dog', 'Cat'];

export default function Plans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);
  const [insurers, setInsurers] = useState([]);
  const [filters, setFilters] = useState({ insurerId: '', status: '', search: '' });

  const load = useCallback(() => {
    const params = {};
    if (filters.insurerId) params.insurerId = filters.insurerId;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    api
      .get('/plans', { params })
      .then(({ data }) => setPlans(data.data.items))
      .catch(() => setPlans([]));
  }, [filters]);

  useEffect(() => {
    api.get('/insurers').then(({ data }) => setInsurers(data.data.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function changeStatus(plan, status) {
    try {
      await api.patch(`/plans/${plan.id}/status`, { status });
      toast.success(`Plan ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  }

  async function remove(plan) {
    if (!window.confirm(`Delete "${plan.name}"? This removes its slabs and add-ons too.`)) return;
    try {
      await api.delete(`/plans/${plan.id}`);
      toast.success('Plan deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete plan');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-48"
            value={filters.insurerId}
            onChange={(e) => setFilters((f) => ({ ...f, insurerId: e.target.value }))}
          >
            <option value="">All insurers</option>
            {insurers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.shortName || i.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
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
            className="w-52"
            placeholder="Search plan name…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>
        <Button onClick={() => navigate('/plans/new')}>
          <Plus size={16} />
          Create Plan
        </Button>
      </div>

      {plans === null ? (
        <p className="text-sm text-brand-slate">Loading plans…</p>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No plans match"
          description="Create a plan and map it to an insurer. Each plan can hold several premium slabs and optional add-ons."
          action={
            <Button onClick={() => navigate('/plans/new')}>
              <Plus size={16} />
              Create Plan
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-brand-ink">{plan.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[plan.status]}`}
                    >
                      {plan.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-brand-slate">
                    {plan.insurer?.shortName || plan.insurer?.name}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Select
                    className="w-32 !py-1.5 text-xs"
                    value={plan.status}
                    onChange={(e) => changeStatus(plan, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0] + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </Select>
                  <button
                    onClick={() => navigate(`/plans/${plan.id}/edit`)}
                    className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(plan)}
                    className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-brand-slate">
                <span className="inline-flex items-center gap-1.5">
                  <Layers size={13} />
                  {plan.variants.length} slab{plan.variants.length === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Puzzle size={13} />
                  {plan.addons.length} add-on{plan.addons.length === 1 ? '' : 's'}
                </span>
                <span>
                  Premium{' '}
                  <strong className="text-brand-ink">
                    {plan.priceFrom === plan.priceTo
                      ? inr(plan.priceFrom)
                      : `${inr(plan.priceFrom)} – ${inr(plan.priceTo)}`}
                  </strong>
                </span>
                {plan.petTypePricing && (
                  <span className="rounded-full bg-brand-blueTint px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue">
                    Dog / Cat pricing
                  </span>
                )}
                <span>
                  Entry {plan.entryAgeMin} {plan.entryAgeMinUnit.toLowerCase()} – {plan.entryAgeMax}{' '}
                  {plan.entryAgeMaxUnit.toLowerCase()} · Exit {plan.exitAge} {plan.exitAgeUnit.toLowerCase()}
                </span>
                <span>
                  Weight{' '}
                  <strong className="text-brand-ink">{plan.weightBandText || 'No limit'}</strong>
                </span>
                <span>
                  Pets{' '}
                  <strong className="text-brand-ink">{plan.insurer?.petTypesText || 'Dogs & cats'}</strong>
                </span>
              </div>

              {plan.variants.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead>
                      <tr className="text-left text-brand-slate">
                        <th className="py-1 pr-4 font-medium">Slab</th>
                        <th className="py-1 pr-4 font-medium">Surgery SI</th>
                        {plan.petTypePricing ? (
                          PET_PRICED.map((t) => (
                            <th key={t} className="py-1 pr-4 font-medium">
                              {t} premium <span className="font-normal">(+ GST)</span>
                            </th>
                          ))
                        ) : (
                          <>
                            <th className="py-1 pr-4 font-medium">Premium</th>
                            <th className="py-1 pr-4 font-medium">+ GST</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {plan.variants.map((v) => (
                        <tr key={v.id} className="border-t border-brand-line/70 text-brand-ink">
                          <td className="py-1.5 pr-4">{v.label}</td>
                          <td className="py-1.5 pr-4">{inr(v.surgerySumInsured)}</td>
                          {plan.petTypePricing ? (
                            PET_PRICED.map((t) => {
                              const e = v.petTypePremiums?.[t];
                              return (
                                <td key={t} className="py-1.5 pr-4">
                                  {e ? (
                                    <>
                                      {inr(e.premium)}{' '}
                                      <span className="text-brand-slate">({inr(e.premiumWithGst, { decimals: true })})</span>
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                              );
                            })
                          ) : (
                            <>
                              <td className="py-1.5 pr-4">{inr(v.premium)}</td>
                              <td className="py-1.5 pr-4">{inr(v.premiumWithGst, { decimals: true })}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
