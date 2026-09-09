const baseInput =
  'w-full rounded-lg border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink outline-none ' +
  'placeholder:text-brand-slate/60 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 ' +
  'disabled:cursor-not-allowed disabled:bg-brand-bg';

export function Label({ children, required, hint }) {
  return (
    <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-slate">
      {children}
      {required && <span className="text-brand-orangeDark">*</span>}
      {hint && <span className="font-normal text-brand-slate/70">— {hint}</span>}
    </label>
  );
}

export function Field({ label, required, hint, error, children }) {
  return (
    <div>
      {label && (
        <Label required={required} hint={hint}>
          {label}
        </Label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Input(props) {
  return <input {...props} className={`${baseInput} ${props.className || ''}`} />;
}

export function Textarea(props) {
  return <textarea {...props} className={`${baseInput} ${props.className || ''}`} />;
}

export function Select(props) {
  return (
    <select {...props} className={`${baseInput} appearance-none pr-8 ${props.className || ''}`}>
      {props.children}
    </select>
  );
}

export { baseInput };
