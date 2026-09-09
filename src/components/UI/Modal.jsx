import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-brand-ink/40 p-4 py-10">
      <div
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-xl2 bg-white shadow-panel`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-brand-line px-6 py-4">
          <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-brand-slate hover:bg-brand-bg">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-brand-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
