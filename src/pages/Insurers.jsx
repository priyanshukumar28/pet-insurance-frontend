import { useEffect, useState, useCallback } from 'react';
import { Building2, Plus, Pencil, Trash2, Star, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import EmptyState from '../components/UI/EmptyState.jsx';
import Modal from '../components/UI/Modal.jsx';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Textarea, Select } from '../components/UI/Field.jsx';

const BLANK = {
  name: '',
  shortName: '',
  website: '',
  logoUrl: '',
  description: '',
  isActive: true,
  isFeatured: false,
  displayOrder: 0,
  pdfTemplateId: '',
};

export default function Insurers() {
  const [items, setItems] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', form }
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get('/insurers')
      .then(({ data }) => setItems(data.data.items))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
    api.get('/pdf-templates').then(({ data }) => setTemplates(data.data.items)).catch(() => {});
  }, [load]);

  function openCreate() {
    setModal({ mode: 'create', form: { ...BLANK } });
  }
  function openEdit(insurer) {
    setModal({
      mode: 'edit',
      id: insurer.id,
      form: {
        name: insurer.name || '',
        shortName: insurer.shortName || '',
        website: insurer.website || '',
        logoUrl: insurer.logoUrl || '',
        description: insurer.description || '',
        isActive: insurer.isActive,
        isFeatured: insurer.isFeatured,
        displayOrder: insurer.displayOrder ?? 0,
        pdfTemplateId: insurer.pdfTemplate?.id || '',
      },
    });
  }

  function setField(key, value) {
    setModal((m) => ({ ...m, form: { ...m.form, [key]: value } }));
  }

  async function save() {
    const { mode, id, form } = modal;
    if (!form.name.trim()) return toast.error('Insurer name is required');
    setSaving(true);
    try {
      const payload = { ...form, displayOrder: Number(form.displayOrder) || 0 };
      if (mode === 'create') {
        await api.post('/insurers', payload);
        toast.success('Insurer added');
      } else {
        await api.put(`/insurers/${id}`, payload);
        toast.success('Insurer updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save insurer');
    } finally {
      setSaving(false);
    }
  }

  async function remove(insurer) {
    if (!window.confirm(`Delete ${insurer.name}? This can't be undone.`)) return;
    try {
      await api.delete(`/insurers/${insurer.id}`);
      toast.success('Insurer deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete insurer');
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading insurers…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-slate">
          {items.length} insurer{items.length === 1 ? '' : 's'} · plans are mapped to these
        </p>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Add Insurer
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No insurers onboarded yet"
          description="Add an insurer, then build its plans under the Plans tab."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} />
              Add Insurer
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-5 py-3">Insurer</th>
                <th className="px-5 py-3">Plans</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-brand-line last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 font-medium text-brand-ink">
                      {it.name}
                      {it.isFeatured && <Star size={14} className="fill-brand-orange text-brand-orange" />}
                    </div>
                    {it.website && (
                      <a
                        href={it.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
                      >
                        {it.website.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-brand-slate">{it.planCount ?? 0}</td>
                  <td className="px-5 py-3.5 text-brand-slate">{it.displayOrder}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        it.isActive ? 'bg-green-100 text-green-700' : 'bg-brand-line/60 text-brand-slate'
                      }`}
                    >
                      {it.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(it)}
                        className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(it)}
                        className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Add Insurer' : 'Edit Insurer'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        {modal && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Insurer name" required>
                <Input value={modal.form.name} onChange={(e) => setField('name', e.target.value)} />
              </Field>
            </div>
            <Field label="Short name" hint="shown on cards">
              <Input value={modal.form.shortName} onChange={(e) => setField('shortName', e.target.value)} />
            </Field>
            <Field label="Display order" hint="lower = higher up">
              <Input
                type="number"
                min="0"
                value={modal.form.displayOrder}
                onChange={(e) => setField('displayOrder', e.target.value)}
              />
            </Field>
            <Field label="Website">
              <Input
                placeholder="https://…"
                value={modal.form.website}
                onChange={(e) => setField('website', e.target.value)}
              />
            </Field>
            <Field label="Logo URL">
              <Input
                placeholder="https://…"
                value={modal.form.logoUrl}
                onChange={(e) => setField('logoUrl', e.target.value)}
              />
            </Field>
            <div className="col-span-2">
              <Field label="Default certificate PDF template" hint="used by this insurer's plans unless a plan overrides it">
                <Select
                  value={modal.form.pdfTemplateId}
                  onChange={(e) => setField('pdfTemplateId', e.target.value)}
                >
                  <option value="">Use global default</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Description">
                <Textarea
                  rows={2}
                  value={modal.form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                checked={modal.form.isActive}
                onChange={(e) => setField('isActive', e.target.checked)}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                checked={modal.form.isFeatured}
                onChange={(e) => setField('isFeatured', e.target.checked)}
              />
              Featured on portal
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
