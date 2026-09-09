import { useEffect } from 'react';
import { X } from 'lucide-react';

// Centered dialog. <Modal open onClose title footer wide>…body…</Modal>
export default function Modal({ open, onClose, title, footer, wide = false, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-brand-ink/40 p-4 py-10 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-xl2 border border-brand-line bg-white shadow-panel`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-brand-line px-5 py-4">
            <h3 className="text-base font-semibold text-brand-ink">{title}</h3>
            <button
              type="button"
              onClick={() => onClose?.()}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-md p-1 text-brand-slate hover:bg-brand-bg hover:text-brand-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-5 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-brand-line bg-brand-bg px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
