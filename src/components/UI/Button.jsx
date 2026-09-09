const variants = {
  primary: 'bg-brand-blue text-white hover:bg-brand-blueDark disabled:bg-brand-blue/40',
  secondary: 'border border-brand-line bg-white text-brand-ink hover:bg-brand-bg disabled:opacity-50',
  danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-50',
  ghost: 'text-brand-slate hover:bg-brand-bg hover:text-brand-blue',
};

export default function Button({ variant = 'primary', className = '', type = 'button', children, ...rest }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
