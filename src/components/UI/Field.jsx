// Form primitives shared across the admin pages.
//   <Field label="…" required hint="…" error="…"><Input …/></Field>
//   <Input/> <Select/> <Textarea/>  — styled pass-throughs
//   <Label hint="…">…</Label>        — standalone label

const base =
  'w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink ' +
  'placeholder:text-brand-slate/60 outline-none transition-colors ' +
  'focus:border-brand-blue focus:ring-1 focus:ring-brand-blue ' +
  'disabled:cursor-not-allowed disabled:bg-brand-bg disabled:text-brand-slate';

const cx = (...c) => c.filter(Boolean).join(' ');

export function Label({ children, hint, className = '' }) {
  return (
    <span className={cx('mb-1.5 block', className)}>
      <span className="text-sm font-medium text-brand-ink">{children}</span>
      {hint && <span className="ml-1.5 text-xs font-normal text-brand-slate">{hint}</span>}
    </span>
  );
}

export function Field({ label, required, hint, error, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-medium text-brand-ink">
            {label}
            {required && <span className="text-red-500"> *</span>}
          </span>
          {hint && <span className="text-xs font-normal text-brand-slate">{hint}</span>}
        </span>
      )}
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Input({ className = '', ...props }) {
  return <input className={cx(base, className)} {...props} />;
}

export function Textarea({ className = '', rows = 3, ...props }) {
  return <textarea rows={rows} className={cx(base, 'resize-y leading-relaxed', className)} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={cx(base, 'pr-8', className)} {...props}>
      {children}
    </select>
  );
}
