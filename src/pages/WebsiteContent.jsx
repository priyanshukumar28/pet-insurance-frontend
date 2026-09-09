import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Textarea } from '../components/UI/Field.jsx';

// Friendly labels + ordering for the editable legal documents. Marketing copy
// for the rest of the site now ships in the website build and is not editable
// here.
const TAB_META = {
  'legal.privacy': 'Privacy Policy',
  'legal.terms': 'Terms & Conditions',
  'legal.wording': 'Policy Wording',
};

const LONG_KEYS = new Set(['body', 'a', 'answer', 'intro', 'lead', 'subcopy', 'message', 'preamble', 'banner']);
const prettyKey = (k) =>
  k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace(/\bA\b/, 'Answer').replace(/\bQ\b/, 'Question');

// Recursive editor for a JSON value.
function Node({ label, value, onChange, depth = 0 }) {
  if (typeof value === 'string') {
    const long = label && (LONG_KEYS.has(label.toLowerCase()) || value.length > 80);
    return (
      <Field label={label ? prettyKey(label) : undefined}>
        {long ? (
          <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input value={value} onChange={(e) => onChange(e.target.value)} />
        )}
      </Field>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <label className="mb-3 flex items-center gap-2 text-sm text-brand-ink">
        <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
        {prettyKey(label || '')}
      </label>
    );
  }

  if (typeof value === 'number') {
    return (
      <Field label={label ? prettyKey(label) : undefined}>
        <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
      </Field>
    );
  }

  if (Array.isArray(value)) {
    const blank = () => {
      const sample = value[0];
      if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
        return Object.fromEntries(Object.keys(sample).map((k) => [k, Array.isArray(sample[k]) ? [] : '']));
      }
      return '';
    };
    return (
      <div className="mb-4">
        {label && <p className="mb-2 text-xs font-semibold text-brand-slate">{prettyKey(label)}</p>}
        <div className="space-y-3">
          {value.map((item, i) => (
            <div key={i} className="rounded-lg border border-brand-line bg-brand-bg p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-slate">
                  {prettyKey(label || 'item')} {i + 1}
                </span>
                <button
                  onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
              <Node
                value={item}
                onChange={(v) => onChange(value.map((x, idx) => (idx === i ? v : x)))}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange([...value, blank()])}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline"
        >
          <Plus size={13} /> Add {prettyKey(label || 'item').toLowerCase()}
        </button>
      </div>
    );
  }

  // object
  return (
    <div className={depth > 0 ? 'space-y-1' : 'space-y-1'}>
      {label && depth > 0 && <p className="mb-1 text-xs font-semibold text-brand-slate">{prettyKey(label)}</p>}
      {Object.entries(value).map(([k, v]) => (
        <Node
          key={k}
          label={k}
          value={v}
          onChange={(nv) => onChange({ ...value, [k]: nv })}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function WebsiteContent() {
  const [content, setContent] = useState(null); // { key: value }
  const [keys, setKeys] = useState([]);
  const [active, setActive] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/site-content')
      .then(({ data }) => {
        setContent(data.data.content);
        setKeys(data.data.keys);
        const first = data.data.keys[0];
        setActive(first);
        setDraft(JSON.parse(JSON.stringify(data.data.content[first])));
      })
      .catch(() => toast.error('Could not load website content'));
  }, []);

  const dirty = useMemo(
    () => draft && content && JSON.stringify(draft) !== JSON.stringify(content[active]),
    [draft, content, active]
  );

  function pick(key) {
    if (dirty && !window.confirm('Discard unsaved changes to this block?')) return;
    setActive(key);
    setDraft(JSON.parse(JSON.stringify(content[key])));
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put(`/site-content/${active}`, { value: draft });
      setContent((c) => ({ ...c, [active]: data.data.value }));
      setDraft(JSON.parse(JSON.stringify(data.data.value)));
      toast.success('Website content updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (!content || !draft) return <p className="text-sm text-brand-slate">Loading…</p>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-brand-slate">
        The legal documents shown on the public customer website. Changes go live immediately. All other
        website copy is fixed in the site itself and is not edited here.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => pick(k)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                k === active ? 'bg-brand-blue text-white' : 'text-brand-slate hover:bg-brand-blueTint hover:text-brand-blue'
              }`}
            >
              {TAB_META[k] || k}
            </button>
          ))}
        </nav>

        <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-brand-ink">{TAB_META[active] || active}</h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setDraft(JSON.parse(JSON.stringify(content[active])))}
                disabled={!dirty}
              >
                <RotateCcw size={14} /> Revert
              </Button>
              <Button onClick={save} disabled={!dirty || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
          <Node value={draft} onChange={setDraft} />
        </div>
      </div>
    </div>
  );
}
