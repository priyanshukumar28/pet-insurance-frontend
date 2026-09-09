export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-brand-line bg-white px-6 py-16 text-center shadow-card">
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-blueTint text-brand-blue">
          <Icon size={22} />
        </span>
      )}
      <h3 className="text-base font-semibold text-brand-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-brand-slate">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
