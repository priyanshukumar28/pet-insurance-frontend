// Date-range presets for the dashboard filter. All dates are local calendar
// dates; the backend treats them as UTC days.

export function toISODate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

// key → { label, resolve: () => ({ from, to }) as ISO date strings }
export const PRESETS = [
  { key: 'last-7', label: 'Last 7 days', resolve: () => ({ from: toISODate(daysAgo(6)), to: toISODate(new Date()) }) },
  { key: 'last-30', label: 'Last 30 days', resolve: () => ({ from: toISODate(daysAgo(29)), to: toISODate(new Date()) }) },
  { key: 'last-90', label: 'Last 90 days', resolve: () => ({ from: toISODate(daysAgo(89)), to: toISODate(new Date()) }) },
  { key: 'this-month', label: 'This month', resolve: () => ({ from: toISODate(startOfMonth()), to: toISODate(new Date()) }) },
  {
    key: 'last-month',
    label: 'Last month',
    resolve: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      return { from: toISODate(startOfMonth(d)), to: toISODate(endOfMonth(d)) };
    },
  },
  {
    key: 'this-quarter',
    label: 'This quarter',
    resolve: () => {
      const now = new Date();
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { from: toISODate(qStart), to: toISODate(now) };
    },
  },
  {
    key: 'this-year',
    label: 'This year',
    resolve: () => ({ from: toISODate(new Date(new Date().getFullYear(), 0, 1)), to: toISODate(new Date()) }),
  },
];

export const DEFAULT_PRESET = 'this-month';

export function resolvePreset(key) {
  const p = PRESETS.find((x) => x.key === key) || PRESETS.find((x) => x.key === DEFAULT_PRESET);
  return { ...p.resolve(), presetKey: p.key };
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtOne(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MON[m - 1]} ${y}`;
}
export function fmtRangeLabel(from, to) {
  if (!from || !to) return 'Select dates';
  return from === to ? fmtOne(from) : `${fmtOne(from)} – ${fmtOne(to)}`;
}
