import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import Button from '../../components/UI/Button.jsx';
import { Field, Input, Textarea, Label } from '../../components/UI/Field.jsx';
import { fetchFile } from '../../lib/download.js';

const BLANK_CONTENT = {
  documentTitle: '',
  preamble: '',
  sections: [],
  declarationText: '',
  footerNote: '',
};

export default function PdfTemplateEditor() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (isEdit) {
          const { data } = await api.get(`/pdf-templates/${id}`);
          const t = data.data.template;
          setForm({
            name: t.name,
            description: t.description || '',
            isDefault: t.isDefault,
            content: { ...BLANK_CONTENT, ...(t.content || {}), sections: t.content?.sections || [] },
          });
        } else {
          const { data } = await api.get('/pdf-templates/defaults');
          setForm({
            name: '',
            description: '',
            isDefault: false,
            content: { ...BLANK_CONTENT, ...data.data.content, sections: data.data.content.sections || [] },
          });
        }
      } catch {
        toast.error('Could not load the template');
      }
    })();
  }, [id, isEdit]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setContent(key, value) {
    setForm((f) => ({ ...f, content: { ...f.content, [key]: value } }));
  }
  function setSection(i, patch) {
    setForm((f) => ({
      ...f,
      content: { ...f.content, sections: f.content.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) },
    }));
  }
  function moveSection(i, dir) {
    setForm((f) => {
      const s = [...f.content.sections];
      const j = i + dir;
      if (j < 0 || j >= s.length) return f;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...f, content: { ...f.content, sections: s } };
    });
  }

  async function save() {
    if (!form.name.trim()) return toast.error('Template name is required');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        isDefault: form.isDefault,
        content: {
          ...form.content,
          sections: form.content.sections
            .filter((s) => (s.heading || '').trim() || (s.body || '').trim())
            .map((s) => ({ heading: s.heading || '', body: s.body || '' })),
        },
      };
      if (isEdit) await api.put(`/pdf-templates/${id}`, payload);
      else await api.post('/pdf-templates', payload);
      toast.success('Template saved');
      navigate('/pdf-templates');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <p className="text-sm text-brand-slate">Loading…</p>;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/pdf-templates')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-slate hover:text-brand-blue"
      >
        <ArrowLeft size={16} /> Back to templates
      </button>

      <div className="grid grid-cols-1 gap-4 rounded-xl2 border border-brand-line bg-white p-5 shadow-card md:grid-cols-3">
        <Field label="Template name" required>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Tata AIG Pet Standard" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Description">
            <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-brand-ink">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
          Use as the global default
        </label>
      </div>

      <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <p className="mb-4 text-xs text-brand-slate">
          The layout, colours and section styling of the certificate are fixed. Only the text below changes.
        </p>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Document title" hint="shown under the Across Assist header">
            <Input value={form.content.documentTitle} onChange={(e) => setContent('documentTitle', e.target.value)} />
          </Field>
          <Field label="Preamble" hint="intro paragraph above the plan details">
            <Textarea rows={3} value={form.content.preamble} onChange={(e) => setContent('preamble', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <Label>Rules / Terms &amp; Conditions sections</Label>
            <p className="text-xs text-brand-slate">
              Each becomes a titled block near the end of the certificate. Blank lines in the body separate
              paragraphs; single line breaks are kept (good for numbered clauses).
            </p>
          </div>
          <button
            onClick={() => setContent('sections', [...form.content.sections, { heading: '', body: '' }])}
            className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-brand-blue hover:underline"
          >
            <Plus size={13} /> Add section
          </button>
        </div>

        <div className="space-y-4">
          {form.content.sections.map((s, i) => (
            <div key={i} className="rounded-lg border border-brand-line p-4">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  className="flex-1 font-medium"
                  placeholder="Section heading (e.g. Key Conditions)"
                  value={s.heading}
                  onChange={(e) => setSection(i, { heading: e.target.value })}
                />
                <button
                  onClick={() => moveSection(i, -1)}
                  disabled={i === 0}
                  className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => moveSection(i, 1)}
                  disabled={i === form.content.sections.length - 1}
                  className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() =>
                    setContent('sections', form.content.sections.filter((_, idx) => idx !== i))
                  }
                  className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <Textarea
                rows={5}
                placeholder="Section body…"
                value={s.body}
                onChange={(e) => setSection(i, { body: e.target.value })}
              />
            </div>
          ))}
          {form.content.sections.length === 0 && (
            <p className="text-sm text-brand-slate">No sections — add rules and T&amp;C blocks as needed.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
        <div className="grid grid-cols-1 gap-4">
          <Field label="Declaration text" hint="rendered as its own 'Declaration' block">
            <Textarea
              rows={3}
              value={form.content.declarationText}
              onChange={(e) => setContent('declarationText', e.target.value)}
            />
          </Field>
          <Field label="Footer note" hint="first line of the certificate footer">
            <Textarea
              rows={2}
              value={form.content.footerNote}
              onChange={(e) => setContent('footerNote', e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="sticky bottom-0 flex justify-between gap-3 border-t border-brand-line bg-brand-bg/80 py-4 backdrop-blur">
        <div>
          {isEdit && (
            <Button
              variant="secondary"
              onClick={() =>
                fetchFile(`/pdf-templates/${id}/preview`, { open: true }).catch(() =>
                  toast.error('Could not open the preview')
                )
              }
            >
              <FileText size={15} /> Preview PDF
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/pdf-templates')}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save template' : 'Create template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
