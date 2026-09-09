export function inr(value, { decimals = false } = {}) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(Number(value));
}

export function num(value) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-IN').format(Number(value));
}

// Signed percent, e.g. 12 → "+12%", -8 → "-8%", 0 → "0%".
export function pct(n) {
  const v = Number(n) || 0;
  return `${v > 0 ? '+' : ''}${v}%`;
}

// Compact rupee for chart axis ticks: 1234 → "₹1.2K", 1250000 → "₹12.5L".
export function compactInr(value) {
  const n = Number(value) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(n % 1e7 ? 1 : 0)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(n % 1e5 ? 1 : 0)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(n % 1e3 ? 1 : 0)}K`;
  return `₹${Math.round(n)}`;
}

export function ageLabel(n, unit) {
  if (n === null || n === undefined) return '—';
  const u = String(unit || '').toLowerCase();
  return `${n} ${u}${Number(n) === 1 ? '' : 's'}`;
}

export const STATUS_STYLES = {
  DRAFT: 'bg-brand-line/60 text-brand-slate',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-brand-orangeTint text-brand-orangeDark',
};
