import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { PRESETS, fmtRangeLabel, toISODate } from '../../lib/dateRanges.js';

// Compact date-range control: a trigger button showing the current range, and a
// dropdown with presets + a custom from/to pair. Calls onChange({ from, to,
// presetKey }) — presetKey is null for a custom range.
export default function DateRangePicker({ value, onChange, presets = PRESETS }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from: value.from, to: value.to });
  const ref = useRef(null);

  useEffect(() => {
    setDraft({ from: value.from, to: value.to });
  }, [value.from, value.to]);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(preset) {
    onChange({ ...preset.resolve(), presetKey: preset.key });
    setOpen(false);
  }
  function applyCustom() {
    let { from, to } = draft;
    if (!from || !to) return;
    if (to < from) [from, to] = [to, from];
    onChange({ from, to, presetKey: null });
    setOpen(false);
  }

  const todayISO = toISODate(new Date());

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2.5 rounded-xl2 border border-brand-line bg-white px-4 py-2.5 text-sm font-medium text-brand-ink shadow-card hover:border-brand-blue/40"
      >
        <Calendar size={16} className="text-brand-slate" />
        {fmtRangeLabel(value.from, value.to)}
        <ChevronDown size={15} className={`text-brand-slate transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[320px] rounded-xl2 border border-brand-line bg-white p-3 shadow-panel">
          <div className="grid grid-cols-2 gap-1">
            {presets.map((p) => {
              const active = value.presetKey === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => pick(p)}
                  className={`rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                    active ? 'bg-brand-blue text-white' : 'text-brand-slate hover:bg-brand-bg hover:text-brand-blue'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-brand-line pt-3">
            <p className="mb-2 text-xs font-semibold text-brand-slate">Custom range</p>
            <div className="flex items-center gap-2">
              <input
                type="date"
                max={todayISO}
                value={draft.from || ''}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                className="w-full rounded-lg border border-brand-line bg-white px-2.5 py-1.5 text-[13px] text-brand-ink outline-none focus:border-brand-blue"
              />
              <span className="text-brand-slate">–</span>
              <input
                type="date"
                max={todayISO}
                value={draft.to || ''}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                className="w-full rounded-lg border border-brand-line bg-white px-2.5 py-1.5 text-[13px] text-brand-ink outline-none focus:border-brand-blue"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!draft.from || !draft.to}
              className="mt-2.5 w-full rounded-lg bg-brand-blue py-2 text-[13px] font-semibold text-white hover:bg-brand-blueDark disabled:bg-brand-blue/40"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
