// Shared button. variant: "primary" (default) | "secondary" | "danger".
const VARIANTS = {
  primary: 'bg-brand-blue text-white hover:bg-brand-blueDark disabled:bg-brand-blue/40',
  secondary:
    'border border-brand-line bg-white text-brand-ink hover:border-brand-blue/40 hover:text-brand-blue ' +
    'disabled:text-brand-slate disabled:hover:border-brand-line',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/40',
};

export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold',
        'shadow-card transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant] || VARIANTS.primary,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
