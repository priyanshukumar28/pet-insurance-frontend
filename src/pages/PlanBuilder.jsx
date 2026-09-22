import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Layers, CalendarClock, Gift, Puzzle, FileText, Dog, Cat } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Textarea, Select, Label } from '../components/UI/Field.jsx';
import { fetchFile } from '../lib/download.js';

const TABS = [
  { key: 'coverages', label: 'Coverages', icon: Layers },
  { key: 'eligibility', label: 'Eligibility & Waiting', icon: CalendarClock },
  { key: 'benefits', label: 'Benefits', icon: Gift },
  { key: 'addons', label: 'Add-ons', icon: Puzzle },
];

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}
// Rounds a rupee amount to 2 decimals, or to the nearest whole rupee when
// `whole` is set (the admin's "round to nearest ₹" toggle).
function roundMoney(n, whole) {
  const v = Number(n) || 0;
  return whole ? Math.round(v) : round2(v);
}
// Premium, GST %, GST amount (₹) and Premium-with-GST are one relationship —
// once Premium is fixed, any ONE of {GST %, GST amount, Premium with GST}
// determines the other two. These recompute the other two from whichever
// field the admin just edited (see the onSlab*/onAddon* handlers below).
function fromGstPercent(premium, gstPercent, whole) {
  const p = Number(premium) || 0;
  const pct = Number(gstPercent) || 0;
  const premiumWithGst = roundMoney(p * (1 + pct / 100), whole);
  return { gstAmount: roundMoney(premiumWithGst - p, whole), premiumWithGst };
}
function fromGstAmount(premium, gstAmount, whole) {
  const p = Number(premium) || 0;
  const amt = roundMoney(gstAmount, whole);
  const premiumWithGst = roundMoney(p + amt, whole);
  return { gstPercent: p > 0 ? round2((amt / p) * 100) : 0, premiumWithGst };
}
function fromPremiumWithGst(premium, premiumWithGst, whole) {
  const p = Number(premium) || 0;
  const withGst = roundMoney(premiumWithGst, whole);
  const amt = roundMoney(withGst - p, whole);
  return { gstAmount: amt, gstPercent: p > 0 ? round2((amt / p) * 100) : 0 };
}

// Apply one edit to a price group {<premiumKey>, gstPercent, gstAmount,
// premiumWithGst} — same linked-field rules as the single-price inputs: editing
// any one of GST % / GST amount / Premium-with-GST recomputes the other two.
function priceEdit(values, premiumKey, field, raw, whole) {
  const premium = values[premiumKey];
  if (field === premiumKey) return { [premiumKey]: raw, ...fromGstPercent(raw, values.gstPercent, whole) };
  if (field === 'gstPercent') return { gstPercent: raw, ...fromGstPercent(premium, raw, whole) };
  if (field === 'gstAmount') {
    const { gstPercent, premiumWithGst } = fromGstAmount(premium, raw, whole);
    return { gstAmount: raw, gstPercent, premiumWithGst };
  }
  const { gstAmount, gstPercent } = fromPremiumWithGst(premium, raw, whole);
  return { premiumWithGst: raw, gstAmount, gstPercent };
}

// The single-price fields of a slab / add-on, as one price group.
function singlePrice(item, premiumKey) {
  return {
    [premiumKey]: item[premiumKey],
    gstPercent: item.gstPercent,
    gstAmount: item.gstAmount,
    premiumWithGst: item.premiumWithGst,
  };
}

// A brand-new slab / add-on starts with a (blank) price group for every pet type.
function withPetPrices(item, types, premiumKey) {
  return { ...item, petTypePrices: Object.fromEntries(types.map((t) => [t, singlePrice(item, premiumKey)])) };
}

// With pet-type pricing on, the slab's single premium fields always mirror its
// LOWEST pet-type price (the "from" price) — the server does the same on save.
function lowestOf(petTypePrices, premiumKey) {
  const filled = Object.values(petTypePrices || {}).filter((e) => e && e[premiumKey] !== '' && e[premiumKey] != null);
  if (!filled.length) return {};
  const lo = filled.reduce((a, b) => (Number(b[premiumKey]) < Number(a[premiumKey]) ? b : a));
  return singlePrice(lo, premiumKey);
}

// Server { Dog: {premium, gstPercent, premiumWithGst}, … } → editable price
// groups. A type the server has no entry for starts from the single price.
function toPetTypePrices(map, types, single, premiumKey, withGstKey) {
  return Object.fromEntries(
    types.map((t) => {
      const e = map && map[t];
      if (!e) return [t, { ...single }];
      const premium = e[premiumKey] ?? '';
      const gstPercent = e.gstPercent ?? single.gstPercent;
      const premiumWithGst = e[withGstKey] ?? fromGstPercent(premium, gstPercent, false).premiumWithGst;
      return [t, { [premiumKey]: premium, gstPercent, gstAmount: round2(Number(premiumWithGst) - Number(premium || 0)), premiumWithGst }];
    })
  );
}

// Editable price groups → the API's { Dog: { <premiumKey>, gstPercent }, … }.
function petTypePricesPayload(prices, types, premiumKey) {
  return Object.fromEntries(
    types.map((t) => [
      t,
      { [premiumKey]: Number(prices?.[t]?.[premiumKey]) || 0, gstPercent: Number(prices?.[t]?.gstPercent) },
    ])
  );
}

function blankSlab(gst, secondaryKeys, benefits = []) {
  return {
    label: '',
    surgerySumInsured: '',
    premium: '',
    gstPercent: gst,
    gstAmount: '',
    premiumWithGst: '',
    coverages: Object.fromEntries(secondaryKeys.map((k) => [k, ''])),
    benefits: benefits.map((b) => ({ ...b })),
    isRecommended: false,
  };
}

// Reconcile a slab's benefit list against the plan-level benefit rows: add rows
// that appeared, drop rows that were removed, keep the plan's labels, preserve
// each slab's own included/note. Returns null when nothing changed.
function reconcileSlabBenefits(slabBenefits, planBenefits) {
  const bySlabKey = Object.fromEntries((slabBenefits || []).map((b) => [b.key, b]));
  const next = planBenefits.map((p) => {
    const existing = bySlabKey[p.key];
    return {
      key: p.key,
      label: p.label,
      included: existing ? existing.included : p.included,
      note: existing ? existing.note || '' : p.note || '',
    };
  });
  return JSON.stringify(next) === JSON.stringify(slabBenefits || []) ? null : next;
}
function blankAddon(gst) {
  return {
    name: '',
    description: '',
    additionalPremium: '',
    gstPercent: gst,
    gstAmount: '',
    premiumWithGst: '',
    coverageEffects: {},
  };
}

export default function PlanBuilder() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState(null);
  const [insurers, setInsurers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [tab, setTab] = useState('coverages');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  // "Round to nearest ₹" toggle for the Premium/GST/Premium-with-GST linked
  // fields below — applies to slabs and add-ons alike, live.
  const [roundToRupee, setRoundToRupee] = useState(false);

  const secondaryKeys = useMemo(
    () => (catalog ? catalog.coverageFields.filter((c) => !c.primary).map((c) => c.key) : []),
    [catalog]
  );

  // Pet types a plan can be priced separately for (Dog / Cat).
  const petTypes = catalog?.petTypePricingTypes || ['Dog', 'Cat'];

  // The chosen insurer may sell to dogs only or cats only. A separate Dog / Cat
  // price only makes sense when it sells to both (the server enforces this too).
  const insurer = insurers.find((i) => i.id === form?.insurerId) || null;
  const insurerPets = insurer?.petTypes?.length ? insurer.petTypes : petTypes;
  const canPriceByPetType = petTypes.every((t) => insurerPets.includes(t));
  const singlePetLabel = insurer && !canPriceByPetType ? `${insurer.petTypesText || `${insurerPets[0]}s only`}` : '';

  useEffect(() => {
    Promise.all([api.get('/plans/catalog'), api.get('/insurers'), api.get('/pdf-templates')])
      .then(([cat, ins, tpl]) => {
        setCatalog(cat.data.data);
        setInsurers(ins.data.data.items);
        setTemplates(tpl.data.data.items);
        return cat.data.data;
      })
      .then(async (cat) => {
        const gst = cat.defaultGstPercent;
        const skeys = cat.coverageFields.filter((c) => !c.primary).map((c) => c.key);
        const petTypes = cat.petTypePricingTypes || ['Dog', 'Cat'];
        if (isEdit) {
          const { data } = await api.get(`/plans/${id}`);
          const p = data.data.plan;
          const planBenefits = mergeBenefits(cat.defaultCommonBenefits, p.commonBenefits);
          setForm({
            insurerId: p.insurerId,
            pdfTemplateId: p.pdfTemplateId || '',
            name: p.name,
            description: p.description || '',
            status: p.status,
            marketingFamily: p.marketingFamily || '',
            marketingTagline: p.marketingTagline || '',
            isFeatured: !!p.isFeatured,
            badgeLabel: p.badgeLabel || '',
            coverTermMonths: p.coverTermMonths ?? cat.coverTermDefault ?? 12,
            petTypePricing: !!p.petTypePricing,
            saleableFrom: p.saleableFrom ? p.saleableFrom.slice(0, 10) : '',
            saleableUntil: p.saleableUntil ? p.saleableUntil.slice(0, 10) : '',
            entryAgeMin: p.entryAgeMin,
            entryAgeMinUnit: p.entryAgeMinUnit,
            entryAgeMax: p.entryAgeMax,
            entryAgeMaxUnit: p.entryAgeMaxUnit,
            exitAge: p.exitAge,
            exitAgeUnit: p.exitAgeUnit,
            weightMinKg: p.weightMinKg ?? '',
            weightMaxKg: p.weightMaxKg ?? '',
            waitingPeriods: p.waitingPeriods.length ? p.waitingPeriods : cat.defaultWaitingPeriods,
            commonBenefits: planBenefits,
            variants: p.variants.map((v) => {
              const premium = v.premium ?? '';
              const gstPercent = v.gstPercent ?? gst;
              // Prefer the server's own stored premiumWithGst (exact, already
              // persisted) over recomputing it, so an edit doesn't drift the
              // displayed value from what's actually saved.
              const premiumWithGst = v.premiumWithGst ?? fromGstPercent(premium, gstPercent, false).premiumWithGst;
              const gstAmount = round2(Number(premiumWithGst) - Number(premium || 0));
              return {
                id: v.id,
                label: v.label,
                surgerySumInsured: v.surgerySumInsured ?? '',
                premium,
                gstPercent,
                gstAmount,
                premiumWithGst,
                petTypePrices: toPetTypePrices(
                  v.petTypePremiums,
                  petTypes,
                  { premium, gstPercent, gstAmount, premiumWithGst },
                  'premium',
                  'premiumWithGst'
                ),
                coverages: Object.fromEntries(skeys.map((k) => [k, v.coverages?.[k] ?? ''])),
                isRecommended: !!v.isRecommended,
                benefits:
                  reconcileSlabBenefits(v.benefits?.length ? v.benefits : planBenefits, planBenefits) ||
                  (v.benefits?.length ? v.benefits : planBenefits).map((b) => ({ ...b })),
              };
            }),
            addons: p.addons.map((a) => {
              const additionalPremium = a.additionalPremium ?? '';
              const gstPercent = a.gstPercent ?? gst;
              const premiumWithGst =
                a.additionalPremiumWithGst ?? fromGstPercent(additionalPremium, gstPercent, false).premiumWithGst;
              const gstAmount = round2(Number(premiumWithGst) - Number(additionalPremium || 0));
              return {
                name: a.name,
                description: a.description || '',
                additionalPremium,
                gstPercent,
                gstAmount,
                premiumWithGst,
                petTypePrices: toPetTypePrices(
                  a.petTypePremiums,
                  petTypes,
                  { additionalPremium, gstPercent, gstAmount, premiumWithGst },
                  'additionalPremium',
                  'additionalPremiumWithGst'
                ),
                coverageEffects: a.coverageEffects || {},
              };
            }),
          });
        } else {
          setForm({
            insurerId: '',
            pdfTemplateId: '',
            name: '',
            description: '',
            status: 'DRAFT',
            marketingFamily: '',
            marketingTagline: '',
            isFeatured: false,
            badgeLabel: '',
            coverTermMonths: cat.coverTermDefault ?? 12,
            petTypePricing: false,
            saleableFrom: '',
            saleableUntil: '',
            entryAgeMin: 3,
            entryAgeMinUnit: 'MONTH',
            entryAgeMax: 8,
            entryAgeMaxUnit: 'YEAR',
            exitAge: 12,
            exitAgeUnit: 'YEAR',
            weightMinKg: '',
            weightMaxKg: '',
            waitingPeriods: cat.defaultWaitingPeriods.map((w) => ({ ...w })),
            commonBenefits: cat.defaultCommonBenefits.map((b) => ({ ...b })),
            variants: [blankSlab(gst, skeys, cat.defaultCommonBenefits)],
            addons: [],
          });
        }
      })
      .catch(() => toast.error('Could not load the plan builder'));
  }, [id, isEdit]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setSlab(i, patch) {
    setForm((f) => ({ ...f, variants: f.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) }));
  }
  // Premium is the anchor; editing it keeps the current GST % and recomputes
  // the two derived fields.
  function onSlabPremiumChange(i, value) {
    setSlab(i, { premium: value, ...fromGstPercent(value, form.variants[i].gstPercent, roundToRupee) });
  }
  function onSlabGstPercentChange(i, value) {
    setSlab(i, { gstPercent: value, ...fromGstPercent(form.variants[i].premium, value, roundToRupee) });
  }
  function onSlabGstAmountChange(i, value) {
    const { gstPercent, premiumWithGst } = fromGstAmount(form.variants[i].premium, value, roundToRupee);
    setSlab(i, { gstAmount: value, gstPercent, premiumWithGst });
  }
  function onSlabPremiumWithGstChange(i, value) {
    const { gstAmount, gstPercent } = fromPremiumWithGst(form.variants[i].premium, value, roundToRupee);
    setSlab(i, { premiumWithGst: value, gstAmount, gstPercent });
  }
  // --- pet-type pricing ---------------------------------------------------
  // Turning it ON seeds each slab / add-on's Dog and Cat price from the single
  // price already entered, so an admin only edits what actually differs.
  function togglePetTypePricing(on) {
    if (!on) {
      const differs = (list, key) =>
        list.some((it) => {
          const prices = petTypes.map((t) => Number(it.petTypePrices?.[t]?.[key]));
          return prices.some((n) => n !== prices[0]);
        });
      const hasDifferent = differs(form.variants, 'premium') || differs(form.addons, 'additionalPremium');
      if (
        hasDifferent &&
        !window.confirm(
          'Turn off pet-type pricing? Every slab and add-on will keep only its lower price, and the Dog / Cat prices will be discarded when you save.'
        )
      ) {
        return;
      }
    }
    setForm((f) => {
      const seed = (item, premiumKey) => {
        const prices = { ...(item.petTypePrices || {}) };
        petTypes.forEach((t) => {
          if (!prices[t]) prices[t] = singlePrice(item, premiumKey);
        });
        return { ...item, petTypePrices: prices };
      };
      return {
        ...f,
        petTypePricing: on,
        variants: on ? f.variants.map((v) => seed(v, 'premium')) : f.variants,
        addons: on ? f.addons.map((a) => seed(a, 'additionalPremium')) : f.addons,
      };
    });
  }
  // One edit inside a Dog / Cat price panel (slab or add-on). Also re-syncs the
  // item's single "from" price to the lowest of its pet-type prices.
  function setPetTypePrice(listKey, i, premiumKey, type, field, raw) {
    setForm((f) => ({
      ...f,
      [listKey]: f[listKey].map((item, idx) => {
        if (idx !== i) return item;
        const cur = item.petTypePrices?.[type] || singlePrice(item, premiumKey);
        const petTypePrices = {
          ...item.petTypePrices,
          [type]: { ...cur, ...priceEdit(cur, premiumKey, field, raw, roundToRupee) },
        };
        return { ...item, petTypePrices, ...lowestOf(petTypePrices, premiumKey) };
      }),
    }));
  }
  function setSlabCoverage(i, key, value) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) =>
        idx === i ? { ...v, coverages: { ...v.coverages, [key]: value } } : v
      ),
    }));
  }
  function setAddon(i, patch) {
    setForm((f) => ({ ...f, addons: f.addons.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  }
  function onAddonPremiumChange(i, value) {
    setAddon(i, { additionalPremium: value, ...fromGstPercent(value, form.addons[i].gstPercent, roundToRupee) });
  }
  function onAddonGstPercentChange(i, value) {
    setAddon(i, { gstPercent: value, ...fromGstPercent(form.addons[i].additionalPremium, value, roundToRupee) });
  }
  function onAddonGstAmountChange(i, value) {
    const { gstPercent, premiumWithGst } = fromGstAmount(form.addons[i].additionalPremium, value, roundToRupee);
    setAddon(i, { gstAmount: value, gstPercent, premiumWithGst });
  }
  function onAddonPremiumWithGstChange(i, value) {
    const { gstAmount, gstPercent } = fromPremiumWithGst(form.addons[i].additionalPremium, value, roundToRupee);
    setAddon(i, { premiumWithGst: value, gstAmount, gstPercent });
  }
  function setSlabBenefit(slabIdx, benefitKey, patch) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, idx) =>
        idx === slabIdx
          ? { ...v, benefits: v.benefits.map((b) => (b.key === benefitKey ? { ...b, ...patch } : b)) }
          : v
      ),
    }));
  }

  // Keep every slab's benefit list aligned with the plan-level benefit rows.
  useEffect(() => {
    if (!form) return;
    let changed = false;
    const variants = form.variants.map((v) => {
      const next = reconcileSlabBenefits(v.benefits, form.commonBenefits);
      if (next) {
        changed = true;
        return { ...v, benefits: next };
      }
      return v;
    });
    if (changed) setForm((f) => ({ ...f, variants }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.commonBenefits]);

  // Re-derive GST amount / Premium-with-GST for every slab and add-on when the
  // "round to nearest ₹" toggle changes, so it applies immediately rather than
  // only on the next edit. Anchored on Premium + GST % (the pair that's always
  // present), matching the default derivation used everywhere else.
  useEffect(() => {
    if (!form) return;
    const rederive = (item, premiumKey) => {
      const next = { ...item, ...fromGstPercent(item[premiumKey], item.gstPercent, roundToRupee) };
      if (item.petTypePrices) {
        next.petTypePrices = Object.fromEntries(
          Object.entries(item.petTypePrices).map(([t, e]) => [
            t,
            { ...e, ...fromGstPercent(e[premiumKey], e.gstPercent, roundToRupee) },
          ])
        );
      }
      return next;
    };
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v) => rederive(v, 'premium')),
      addons: f.addons.map((a) => rederive(a, 'additionalPremium')),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundToRupee]);

  function validate() {
    if (!form.insurerId) return 'Pick an insurer';
    if (!form.name.trim()) return 'Plan name is required';
    if (form.petTypePricing && !canPriceByPetType)
      return `${insurer.shortName || insurer.name} sells to ${singlePetLabel.toLowerCase()}, so a separate price per pet type doesn't apply — turn "Price differs by pet type" off`;
    if (form.coverTermMonths && (Number(form.coverTermMonths) < 1 || Number(form.coverTermMonths) > 12))
      return 'Cover term must be between 1 and 12 months';
    if (form.saleableFrom && form.saleableUntil && form.saleableUntil < form.saleableFrom)
      return '"Saleable until" cannot be before "saleable from"';
    if ([form.entryAgeMin, form.entryAgeMax, form.exitAge].some((n) => n === '' || n === null))
      return 'Entry and exit ages are required (Eligibility & Waiting tab)';
    if (
      form.weightMinKg !== '' &&
      form.weightMaxKg !== '' &&
      Number(form.weightMaxKg) < Number(form.weightMinKg)
    )
      return '"Maximum weight" cannot be below "minimum weight" (Eligibility & Waiting tab)';
    if (!form.variants.length) return 'Add at least one premium slab';
    for (const [i, v] of form.variants.entries()) {
      if (!v.surgerySumInsured || Number(v.surgerySumInsured) <= 0)
        return `Slab ${i + 1}: Surgery Sum Insured is mandatory and must be > 0`;
      if (form.petTypePricing) {
        for (const t of petTypes) {
          const x = v.petTypePrices?.[t]?.premium;
          if (x === '' || x == null || Number(x) < 0) return `Slab ${i + 1}: enter the ${t} premium`;
        }
      } else if (v.premium === '' || Number(v.premium) < 0) return `Slab ${i + 1}: premium is required`;
    }
    for (const [i, a] of form.addons.entries()) {
      if (!a.name.trim()) return `Add-on ${i + 1}: name is required`;
      if (form.petTypePricing) {
        for (const t of petTypes) {
          const x = a.petTypePrices?.[t]?.additionalPremium;
          if (x === '' || x == null || Number(x) < 0) return `Add-on "${a.name.trim()}": enter the ${t} premium`;
        }
      }
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        coverTermMonths: Number(form.coverTermMonths) || 12,
        saleableFrom: form.saleableFrom || null,
        saleableUntil: form.saleableUntil || null,
        entryAgeMin: Number(form.entryAgeMin),
        entryAgeMax: Number(form.entryAgeMax),
        exitAge: Number(form.exitAge),
        weightMinKg: form.weightMinKg === '' ? null : Number(form.weightMinKg),
        weightMaxKg: form.weightMaxKg === '' ? null : Number(form.weightMaxKg),
        waitingPeriods: form.waitingPeriods
          .filter((w) => w.condition.trim())
          .map((w) => ({ condition: w.condition.trim(), days: Number(w.days) || 0 })),
        commonBenefits: form.commonBenefits
          .filter((b) => b.label.trim())
          .map((b) => ({ key: b.key, label: b.label.trim(), included: !!b.included, note: b.note || '' })),
        variants: form.variants.map((v, i) => ({
          label: v.label,
          surgerySumInsured: Number(v.surgerySumInsured),
          premium: Number(v.premium),
          gstPercent: Number(v.gstPercent),
          petTypePremiums: form.petTypePricing ? petTypePricesPayload(v.petTypePrices, petTypes, 'premium') : undefined,
          displayOrder: i,
          isRecommended: !!v.isRecommended,
          coverages: Object.fromEntries(
            Object.entries(v.coverages).map(([k, val]) => [k, val === '' ? null : Number(val)])
          ),
          benefits: (v.benefits || []).map((b) => ({
            key: b.key,
            label: b.label.trim(),
            included: !!b.included,
            note: b.note || '',
          })),
        })),
        addons: form.addons
          .filter((a) => a.name.trim())
          .map((a, i) => ({
            name: a.name.trim(),
            description: a.description,
            additionalPremium: Number(a.additionalPremium) || 0,
            gstPercent: Number(a.gstPercent),
            petTypePremiums: form.petTypePricing
              ? petTypePricesPayload(a.petTypePrices, petTypes, 'additionalPremium')
              : undefined,
            displayOrder: i,
            coverageEffects: Object.fromEntries(
              Object.entries(a.coverageEffects || {})
                .filter(([, val]) => val !== '' && val !== null && val !== undefined)
                .map(([k, val]) => [k, Number(val)])
            ),
          })),
      };

      if (isEdit) {
        await api.put(`/plans/${id}`, payload);
        toast.success('Plan updated');
      } else {
        await api.post('/plans', payload);
        toast.success('Plan created');
      }
      navigate('/plans');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  }

  if (!form || !catalog) return <p className="text-sm text-brand-slate">Loading builder…</p>;

  const primaryField = catalog.coverageFields.find((c) => c.primary);
  const secondaryFields = catalog.coverageFields.filter((c) => !c.primary);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/plans')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-slate hover:text-brand-blue"
      >
        <ArrowLeft size={16} /> Back to Plans
      </button>

      {/* Header card */}
      <div className="grid grid-cols-1 gap-4 rounded-xl2 border border-brand-line bg-white p-5 shadow-card md:grid-cols-4">
        <div className="md:col-span-2">
          <Field label="Plan name" required>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. PawSecure Health" />
          </Field>
        </div>
        <Field label="Insurer" required>
          <Select value={form.insurerId} onChange={(e) => set('insurerId', e.target.value)}>
            <option value="">Select insurer…</option>
            {insurers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.shortName || i.name}
                {(i.petTypes || []).length === 1 ? ` (${i.petTypesText})` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {catalog.planStatuses.map((s) => (
              <option key={s} value={s}>
                {s[0] + s.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Field label="Certificate PDF template" hint="blank = insurer default, then global default">
            <Select value={form.pdfTemplateId} onChange={(e) => set('pdfTemplateId', e.target.value)}>
              <option value="">Use default</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Description">
            <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Website presentation */}
      <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <h4 className="mb-1 text-sm font-semibold text-brand-ink">Customer website</h4>
        <p className="mb-4 text-xs text-brand-slate">
          How this plan appears on the public site. Only <strong>Published</strong> plans are shown there.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Family / group" hint='e.g. "Essential Care" — plans share a column'>
            <Input
              value={form.marketingFamily}
              onChange={(e) => set('marketingFamily', e.target.value)}
              placeholder="Essential Care"
            />
          </Field>
          <Field label="Badge label" hint='e.g. "Most popular" (featured card only)'>
            <Input
              value={form.badgeLabel}
              onChange={(e) => set('badgeLabel', e.target.value)}
              placeholder="Most popular"
            />
          </Field>
          <Field label="Featured">
            <label className="mt-1 inline-flex cursor-pointer items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => set('isFeatured', e.target.checked)}
              />
              Show as the big card for this family
            </label>
          </Field>
          <div className="md:col-span-3">
            <Field label="Tagline" hint="one line shown under the plan name">
              <Input
                value={form.marketingTagline}
                onChange={(e) => set('marketingTagline', e.target.value)}
                placeholder="Everyday medical cover for young, healthy pets."
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Policy validity */}
      <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <h4 className="mb-1 text-sm font-semibold text-brand-ink">Policy validity</h4>
        <p className="mb-4 text-xs text-brand-slate">
          <strong>Cover term</strong> is how long each issued policy runs — the certificate&apos;s cover start
          (issue date) and end are set from it. The <strong>saleable window</strong> is until when a new policy
          can be issued against this plan; policies already issued keep running to their own end date.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Cover term (months)" hint={`1–${catalog.coverTermMax ?? 12}, applies per policy`}>
            <Input
              type="number"
              min="1"
              max={catalog.coverTermMax ?? 12}
              value={form.coverTermMonths}
              onChange={(e) => set('coverTermMonths', e.target.value)}
            />
          </Field>
          <Field label="Saleable from" hint="blank = available now">
            <Input
              type="date"
              value={form.saleableFrom}
              onChange={(e) => set('saleableFrom', e.target.value)}
            />
          </Field>
          <Field label="Saleable until" hint="blank = no end date">
            <Input
              type="date"
              value={form.saleableUntil}
              onChange={(e) => set('saleableUntil', e.target.value)}
            />
          </Field>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-brand-line">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-brand-slate hover:text-brand-ink'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {(tab === 'coverages' || tab === 'addons') && (
        <PetTypePricingToggle
          on={form.petTypePricing}
          types={petTypes}
          onChange={togglePetTypePricing}
          blockedBy={canPriceByPetType ? '' : `${insurer.shortName || insurer.name} sells to ${singlePetLabel.toLowerCase()}`}
        />
      )}

      {(tab === 'coverages' || tab === 'addons') && (
        <label className="flex w-fit items-center gap-2 text-sm text-brand-slate">
          <input
            type="checkbox"
            checked={roundToRupee}
            onChange={(e) => setRoundToRupee(e.target.checked)}
          />
          Round GST &amp; premium-with-GST amounts to the nearest ₹
        </label>
      )}

      {/* Coverages / slabs */}
      {tab === 'coverages' && (
        <div className="space-y-4">
          <p className="text-sm text-brand-slate">
            Each slab is a priced tier. <strong>{primaryField.label}</strong> is mandatory and drives the pricing;
            the other coverage amounts and the premium change per slab.
          </p>
          {form.variants.map((v, i) => (
            <div key={i} className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-semibold text-brand-ink">Slab {i + 1}</h4>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-slate">
                    <input
                      type="checkbox"
                      checked={!!v.isRecommended}
                      onChange={(e) => setSlab(i, { isRecommended: e.target.checked })}
                    />
                    Recommended on website
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  {isEdit && v.id && (
                    <button
                      onClick={() =>
                        fetchFile(`/plans/${id}/pdf`, { params: { variantId: v.id }, open: true }).catch(() =>
                          toast.error('Could not open the PDF')
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
                    >
                      <FileText size={13} /> Preview PDF
                    </button>
                  )}
                  {form.variants.length > 1 && (
                    <button
                      onClick={() => set('variants', form.variants.filter((_, idx) => idx !== i))}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Field label="Slab label" hint="auto from SI if blank">
                  <Input value={v.label} onChange={(e) => setSlab(i, { label: e.target.value })} placeholder="Silver" />
                </Field>
                <Field label={primaryField.label} required>
                  <Input
                    type="number"
                    min="1"
                    value={v.surgerySumInsured}
                    onChange={(e) => setSlab(i, { surgerySumInsured: e.target.value })}
                  />
                </Field>
                {secondaryFields.map((c) => (
                  <Field key={c.key} label={c.label}>
                    <Input
                      type="number"
                      min="0"
                      value={v.coverages[c.key] ?? ''}
                      onChange={(e) => setSlabCoverage(i, c.key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>

              {form.petTypePricing ? (
                <PetTypePrices
                  types={petTypes}
                  prices={v.petTypePrices}
                  premiumKey="premium"
                  premiumLabel="Premium (₹)"
                  onChange={(type, field, raw) => setPetTypePrice('variants', i, 'premium', type, field, raw)}
                />
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-brand-bg p-4 md:grid-cols-4">
                  <Field label="Premium (₹)" required>
                    <Input type="number" min="0" value={v.premium} onChange={(e) => onSlabPremiumChange(i, e.target.value)} />
                  </Field>
                  <Field label="GST %">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={v.gstPercent}
                      onChange={(e) => onSlabGstPercentChange(i, e.target.value)}
                    />
                  </Field>
                  <Field label="GST amount (₹)" hint="or type this instead of GST %">
                    <Input
                      type="number"
                      min="0"
                      value={v.gstAmount}
                      onChange={(e) => onSlabGstAmountChange(i, e.target.value)}
                    />
                  </Field>
                  <Field label="Premium with GST (₹)" hint="or type this instead">
                    <Input
                      type="number"
                      min="0"
                      value={v.premiumWithGst}
                      onChange={(e) => onSlabPremiumWithGstChange(i, e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {/* Per-slab benefits */}
              <div className="mt-4">
                <Label hint="defaults come from the Benefits tab; override per slab here">
                  Benefits for this slab
                </Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {(v.benefits || []).map((b) => (
                    <button
                      key={b.key}
                      type="button"
                      onClick={() => setSlabBenefit(i, b.key, { included: !b.included })}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        b.included
                          ? 'border-green-300 bg-green-50 text-green-700'
                          : 'border-brand-line bg-white text-brand-slate'
                      }`}
                    >
                      {b.included ? '✓ ' : '✕ '}
                      {b.label}
                    </button>
                  ))}
                  {(!v.benefits || v.benefits.length === 0) && (
                    <span className="text-xs text-brand-slate">Add benefit rows on the Benefits tab first.</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              set('variants', [
                ...form.variants,
                withPetPrices(blankSlab(catalog.defaultGstPercent, secondaryKeys, form.commonBenefits), petTypes, 'premium'),
              ])
            }
          >
            <Plus size={15} /> Add slab
          </Button>
        </div>
      )}

      {/* Eligibility */}
      {tab === 'eligibility' && (
        <div className="space-y-5">
          <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
            <h4 className="mb-1 text-sm font-semibold text-brand-ink">Age eligibility</h4>
            <p className="mb-4 text-xs text-brand-slate">
              A pet is offered this plan only when its age is within the entry band (both ends included). Customers
              never see plans their pet doesn&apos;t qualify for.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <AgePair
                label="Entry age — minimum"
                required
                value={form.entryAgeMin}
                unit={form.entryAgeMinUnit}
                units={catalog.ageUnits}
                onValue={(x) => set('entryAgeMin', x)}
                onUnit={(x) => set('entryAgeMinUnit', x)}
              />
              <AgePair
                label="Entry age — maximum"
                required
                value={form.entryAgeMax}
                unit={form.entryAgeMaxUnit}
                units={catalog.ageUnits}
                onValue={(x) => set('entryAgeMax', x)}
                onUnit={(x) => set('entryAgeMaxUnit', x)}
              />
              <AgePair
                label="Exit age"
                required
                value={form.exitAge}
                unit={form.exitAgeUnit}
                units={catalog.ageUnits}
                onValue={(x) => set('exitAge', x)}
                onUnit={(x) => set('exitAgeUnit', x)}
              />
            </div>
          </div>

          <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
            <h4 className="mb-1 text-sm font-semibold text-brand-ink">Weight eligibility</h4>
            <p className="mb-4 text-xs text-brand-slate">
              For insurers that restrict by pet weight. Leave both blank for no weight limit; fill only one to set just
              a minimum or just a maximum. Both ends are included.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <Field label="Minimum weight (kg)" hint="blank = no minimum">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.weightMinKg}
                  onChange={(e) => set('weightMinKg', e.target.value)}
                  placeholder="e.g. 2"
                />
              </Field>
              <Field label="Maximum weight (kg)" hint="blank = no maximum">
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.weightMaxKg}
                  onChange={(e) => set('weightMaxKg', e.target.value)}
                  placeholder="e.g. 25"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-brand-ink">Waiting periods</h4>
              <button
                onClick={() => set('waitingPeriods', [...form.waitingPeriods, { condition: '', days: 0 }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
              >
                <Plus size={13} /> Add row
              </button>
            </div>
            <div className="space-y-2">
              {form.waitingPeriods.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Input
                    className="flex-1"
                    placeholder="Condition (e.g. Illness)"
                    value={w.condition}
                    onChange={(e) =>
                      set(
                        'waitingPeriods',
                        form.waitingPeriods.map((x, idx) => (idx === i ? { ...x, condition: e.target.value } : x))
                      )
                    }
                  />
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="0"
                      className="w-24"
                      value={w.days}
                      onChange={(e) =>
                        set(
                          'waitingPeriods',
                          form.waitingPeriods.map((x, idx) => (idx === i ? { ...x, days: e.target.value } : x))
                        )
                      }
                    />
                    <span className="text-xs text-brand-slate">days</span>
                  </div>
                  <button
                    onClick={() => set('waitingPeriods', form.waitingPeriods.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {form.waitingPeriods.length === 0 && (
                <p className="text-xs text-brand-slate">No waiting periods — add rows as needed.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Benefits */}
      {tab === 'benefits' && (
        <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <p className="mb-4 text-sm text-brand-slate">
            These are the plan's default benefits. Each row here defines a benefit and its default on/off state;
            every slab starts from these and can override them under <strong>Coverages → Benefits for this slab</strong>.
            Add custom rows at the bottom.
          </p>
          <div className="space-y-2.5">
            {form.commonBenefits.map((b, i) => (
              <div key={b.key || i} className="flex flex-wrap items-center gap-3 rounded-lg border border-brand-line px-3 py-2.5">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!b.included}
                    onChange={(e) =>
                      set(
                        'commonBenefits',
                        form.commonBenefits.map((x, idx) => (idx === i ? { ...x, included: e.target.checked } : x))
                      )
                    }
                  />
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      b.included ? 'bg-green-100 text-green-700' : 'bg-brand-line/60 text-brand-slate'
                    }`}
                  >
                    {b.included ? 'YES' : 'NO'}
                  </span>
                </label>
                {b.key?.startsWith('CUSTOM_') ? (
                  <Input
                    className="flex-1"
                    value={b.label}
                    placeholder="Benefit description"
                    onChange={(e) =>
                      set(
                        'commonBenefits',
                        form.commonBenefits.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x))
                      )
                    }
                  />
                ) : (
                  <span className="flex-1 text-sm text-brand-ink">{b.label}</span>
                )}
                <Input
                  className="w-52"
                  placeholder="Note (optional)"
                  value={b.note || ''}
                  onChange={(e) =>
                    set(
                      'commonBenefits',
                      form.commonBenefits.map((x, idx) => (idx === i ? { ...x, note: e.target.value } : x))
                    )
                  }
                />
                {b.key?.startsWith('CUSTOM_') && (
                  <button
                    onClick={() => set('commonBenefits', form.commonBenefits.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              set('commonBenefits', [
                ...form.commonBenefits,
                { key: `CUSTOM_${Date.now()}`, label: '', included: true, note: '' },
              ])
            }
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
          >
            <Plus size={13} /> Add custom benefit
          </button>
        </div>
      )}

      {/* Add-ons */}
      {tab === 'addons' && (
        <div className="space-y-4">
          <p className="text-sm text-brand-slate">
            Optional riders. Selecting one on the portal adds its premium on top of the chosen slab.
          </p>
          {form.addons.map((a, i) => (
            <div key={i} className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-brand-ink">Add-on {i + 1}</h4>
                <button
                  onClick={() => set('addons', form.addons.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Field label="Add-on name" required>
                    <Input value={a.name} onChange={(e) => setAddon(i, { name: e.target.value })} placeholder="Dental Care" />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Description">
                    <Input value={a.description} onChange={(e) => setAddon(i, { description: e.target.value })} />
                  </Field>
                </div>
              </div>

              {form.petTypePricing ? (
                <PetTypePrices
                  types={petTypes}
                  prices={a.petTypePrices}
                  premiumKey="additionalPremium"
                  premiumLabel="Additional premium (₹)"
                  onChange={(type, field, raw) => setPetTypePrice('addons', i, 'additionalPremium', type, field, raw)}
                />
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-brand-bg p-4 md:grid-cols-4">
                  <Field label="Additional premium (₹)">
                    <Input
                      type="number"
                      min="0"
                      value={a.additionalPremium}
                      onChange={(e) => onAddonPremiumChange(i, e.target.value)}
                    />
                  </Field>
                  <Field label="GST %">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={a.gstPercent}
                      onChange={(e) => onAddonGstPercentChange(i, e.target.value)}
                    />
                  </Field>
                  <Field label="GST amount (₹)" hint="or type this instead of GST %">
                    <Input
                      type="number"
                      min="0"
                      value={a.gstAmount}
                      onChange={(e) => onAddonGstAmountChange(i, e.target.value)}
                    />
                  </Field>
                  <Field label="Premium with GST (₹)" hint="or type this instead">
                    <Input
                      type="number"
                      min="0"
                      value={a.premiumWithGst}
                      onChange={(e) => onAddonPremiumWithGstChange(i, e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={() => set('addons', [...form.addons, withPetPrices(blankAddon(catalog.defaultGstPercent), petTypes, 'additionalPremium')])}>
            <Plus size={15} /> Add add-on
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-brand-line bg-brand-bg/80 py-4 backdrop-blur">
        <Button variant="secondary" onClick={() => navigate('/plans')}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create plan'}
        </Button>
      </div>
    </div>
  );
}

// Plan-level switch: one price for every pet, or a Dog price and a Cat price.
function PetTypePricingToggle({ on, types, onChange, blockedBy = '' }) {
  const list = types.join(' / ');
  // The insurer sells to one species only: a separate Dog / Cat price is meaningless.
  // It can still be switched OFF (if it was already on), never newly ON.
  const blocked = !!blockedBy;
  return (
    <label
      className={`flex items-start gap-3 rounded-xl2 border p-4 shadow-card ${
        blocked && !on ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
      } ${on ? 'border-brand-blue bg-brand-blueTint' : 'border-brand-line bg-white'}`}
    >
      <input
        type="checkbox"
        className="mt-1"
        checked={on}
        disabled={blocked && !on}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold text-brand-ink">Price differs by pet type ({list})</span>
        <span className="mt-0.5 block text-xs text-brand-slate">
          {blocked
            ? `${blockedBy}, so there's just one price for this plan.${on ? ' Untick this to fix the plan.' : ''}`
            : on
              ? `On — every slab and add-on has a separate ${types.join(' and ')} premium; the customer's pet type picks the price. The lower one is shown as a "from" price before they choose.`
              : 'Off — one premium applies to every pet (the default). Turn on if this plan charges differently for dogs and cats.'}
        </span>
      </span>
    </label>
  );
}

// The Dog / Cat price panels for one slab or add-on. Each panel has the same
// linked Premium / GST % / GST amount / Premium-with-GST inputs as a single price.
function PetTypePrices({ types, prices, premiumKey, premiumLabel, onChange }) {
  return (
    <div className="mt-4 rounded-lg bg-brand-bg p-4">
      <div className="grid gap-4 md:grid-cols-2">
        {types.map((t) => {
          const v = (prices && prices[t]) || {};
          const Icon = t === 'Cat' ? Cat : Dog;
          return (
            <div key={t} className="rounded-lg border border-brand-line bg-white p-3">
              <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-blue">
                <Icon size={14} /> {t}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={premiumLabel} required>
                  <Input
                    type="number"
                    min="0"
                    value={v[premiumKey] ?? ''}
                    onChange={(e) => onChange(t, premiumKey, e.target.value)}
                  />
                </Field>
                <Field label="GST %">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={v.gstPercent ?? ''}
                    onChange={(e) => onChange(t, 'gstPercent', e.target.value)}
                  />
                </Field>
                <Field label="GST amount (₹)" hint="or type instead of GST %">
                  <Input
                    type="number"
                    min="0"
                    value={v.gstAmount ?? ''}
                    onChange={(e) => onChange(t, 'gstAmount', e.target.value)}
                  />
                </Field>
                <Field label="Premium with GST (₹)" hint="or type instead">
                  <Input
                    type="number"
                    min="0"
                    value={v.premiumWithGst ?? ''}
                    onChange={(e) => onChange(t, 'premiumWithGst', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AgePair({ label, required, value, unit, units, onValue, onUnit }) {
  return (
    <Field label={label} required={required}>
      <div className="flex gap-2">
        <Input type="number" min="0" className="w-20" value={value} onChange={(e) => onValue(e.target.value)} />
        <Select value={unit} onChange={(e) => onUnit(e.target.value)}>
          {units.map((u) => (
            <option key={u} value={u}>
              {u[0] + u.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );
}

// Keep the catalog's default rows/labels, carry over the saved `included`/`note`.
function mergeBenefits(defaults, saved) {
  const savedByKey = Object.fromEntries((saved || []).map((b) => [b.key, b]));
  const merged = defaults.map((d) => ({ ...d, ...(savedByKey[d.key] || {}) }));
  const extras = (saved || []).filter((b) => !defaults.some((d) => d.key === b.key));
  return [...merged, ...extras];
}
