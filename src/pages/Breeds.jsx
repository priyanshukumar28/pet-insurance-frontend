import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dog, Plus, Pencil, Trash2, Upload, Download, Search, Tags } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchFile } from '../lib/download.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import Modal from '../components/ui/Modal.jsx';
import Button from '../components/ui/Button.jsx';
import ImportModal from '../components/breeds/ImportModal.jsx';
import { Field, Input, Select } from '../components/ui/Field.jsx';

const WRITE_ROLES = ['SUPERADMIN', 'ADMIN'];

const IMPORT_STATS = [
  { key: 'created', label: 'new', tone: 'good' },
  { key: 'existing', label: 'already exist', tone: 'info' },
  { key: 'errors', label: 'with errors', tone: 'bad' },
];
const IMPORT_GROUPS = [
  { key: 'created', label: 'Will be added', line: (r) => `${r.species} · ${r.name}` },
  { key: 'existing', label: 'Already in the system (skipped)', line: (r) => `${r.species} · ${r.name}` },
];

const badge = (on) =>
  `rounded-full px-2 py-0.5 text-xs font-medium ${on ? 'bg-green-100 text-green-700' : 'bg-brand-line/60 text-brand-slate'}`;

const iconBtn = 'rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue';

export default function Breeds() {
  const { admin } = useAuth();
  const canWrite = WRITE_ROLES.includes(admin?.role);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'categories' ? 'categories' : 'breeds';

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-brand-line">
        {[
          ['breeds', 'Breeds', Dog],
          ['categories', 'Categories', Tags],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setParams(key === 'breeds' ? {} : { tab: key })}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-brand-slate hover:text-brand-ink'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'breeds' ? <BreedsTab canWrite={canWrite} /> : <CategoriesTab canWrite={canWrite} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function BreedsTab({ canWrite }) {
  const [items, setItems] = useState(null);
  const [filters, setFilters] = useState({ species: '', status: '', q: '' });
  const [modal, setModal] = useState(null); // { mode: 'create'|'edit', id?, code?, form }
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = useCallback(() => {
    api
      .get('/breeds')
      .then(({ data }) => setItems(data.data.items))
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    if (!items) return [];
    const q = filters.q.trim().toLowerCase();
    return items.filter(
      (b) =>
        (!filters.species || b.species === filters.species) &&
        (!filters.status || (filters.status === 'active') === b.isActive) &&
        (!q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
    );
  }, [items, filters]);

  async function save() {
    const { mode, id, form } = modal;
    if (!form.name.trim()) return toast.error('Breed name is required');
    setSaving(true);
    try {
      if (mode === 'create') {
        const { data } = await api.post('/breeds', { species: form.species, name: form.name });
        toast.success(data.message);
      } else {
        await api.put(`/breeds/${id}`, { name: form.name });
        toast.success('Breed updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save breed');
    } finally {
      setSaving(false);
    }
  }

  async function toggle(b) {
    try {
      await api.put(`/breeds/${b.id}`, { isActive: !b.isActive });
      toast.success(b.isActive ? `${b.name} deactivated` : `${b.name} activated`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update breed');
    }
  }

  async function remove(b) {
    if (!window.confirm(`Delete ${b.name} (${b.code})? Its code will not be reused.`)) return;
    try {
      await api.delete(`/breeds/${b.id}`);
      toast.success('Breed deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete breed');
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading breeds…</p>;

  const dogs = items.filter((b) => b.species === 'Dog').length;
  const cats = items.filter((b) => b.species === 'Cat').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-slate">
          {items.length} breed{items.length === 1 ? '' : 's'} · {dogs} dog · {cats} cat — insurers pick from this list
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fetchFile('/breeds/template', { filename: 'breed-master-template.xlsx' })}>
            <Download size={16} />
            Template
          </Button>
          {canWrite && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload size={16} />
                Upload breeds
              </Button>
              <Button onClick={() => setModal({ mode: 'create', form: { species: 'Dog', name: '' } })}>
                <Plus size={16} />
                Add breed
              </Button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Dog}
          title="No breeds yet"
          description="Upload a spreadsheet of dog and cat breeds. Each breed gets a code automatically, then you can map breeds to each insurer."
          action={
            canWrite && (
              <Button onClick={() => setImportOpen(true)}>
                <Upload size={16} />
                Upload breeds
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-slate" />
              <Input
                className="pl-9"
                placeholder="Search by breed name or code"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              />
            </div>
            <div className="w-36">
              <Select value={filters.species} onChange={(e) => setFilters({ ...filters, species: e.target.value })}>
                <option value="">All species</option>
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
              </Select>
            </div>
            <div className="w-36">
              <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">Any status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl2 border border-brand-line bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Breed</th>
                  <th className="px-5 py-3">Species</th>
                  <th className="px-5 py-3">Insurers</th>
                  <th className="px-5 py-3">Status</th>
                  {canWrite && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="px-5 py-8 text-center text-brand-slate">
                      No breeds match these filters.
                    </td>
                  </tr>
                )}
                {shown.map((b) => (
                  <tr key={b.id} className="border-b border-brand-line last:border-0">
                    <td className="px-5 py-3">
                      <code className="rounded bg-brand-bg px-1.5 py-0.5 text-xs font-semibold text-brand-ink">{b.code}</code>
                    </td>
                    <td className="px-5 py-3 font-medium text-brand-ink">{b.name}</td>
                    <td className="px-5 py-3 text-brand-slate">{b.species}</td>
                    <td className="px-5 py-3 text-brand-slate">{b.insurerCount ?? 0}</td>
                    <td className="px-5 py-3">
                      <span className={badge(b.isActive)}>{b.isActive ? 'Active' : 'Inactive'}</span>
                    </td>
                    {canWrite && (
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            title="Rename"
                            onClick={() => setModal({ mode: 'edit', id: b.id, code: b.code, form: { species: b.species, name: b.name } })}
                            className={iconBtn}
                          >
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => toggle(b)} className="rounded-lg px-2 py-1 text-xs font-medium text-brand-slate hover:bg-brand-bg hover:text-brand-blue">
                            {b.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button title="Delete" onClick={() => remove(b)} className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Add breed' : `Rename breed — ${modal?.code}`}
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
          <div className="space-y-4">
            <Field label="Species" hint={modal.mode === 'edit' ? 'fixed once created' : undefined}>
              <Select
                value={modal.form.species}
                disabled={modal.mode === 'edit'}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, species: e.target.value } })}
              >
                <option value="Dog">Dog</option>
                <option value="Cat">Cat</option>
              </Select>
            </Field>
            <Field label="Breed name" required hint={modal.mode === 'create' ? 'the code is assigned automatically' : 'the code never changes'}>
              <Input
                autoFocus
                value={modal.form.name}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Upload breeds"
        intro="Upload dog and cat breeds. Each new breed is given a breed code automatically; breeds already in the system are skipped, so it is safe to re-upload a bigger list."
        templateUrl="/breeds/template"
        templateFilename="breed-master-template.xlsx"
        importUrl="/breeds/import"
        stats={IMPORT_STATS}
        groups={IMPORT_GROUPS}
        changeKeys={['created']}
        onDone={load}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function CategoriesTab({ canWrite }) {
  const [items, setItems] = useState(null);
  const [modal, setModal] = useState(null); // { mode, id?, form }
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get('/breed-categories')
      .then(({ data }) => setItems(data.data.items))
      .catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  async function save() {
    const { mode, id, form } = modal;
    if (!form.name.trim()) return toast.error('Category name is required');
    setSaving(true);
    try {
      const payload = { name: form.name, displayOrder: Number(form.displayOrder) || 0, isActive: form.isActive };
      if (mode === 'create') {
        await api.post('/breed-categories', payload);
        toast.success('Category added');
      } else {
        await api.put(`/breed-categories/${id}`, payload);
        toast.success('Category updated');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save category');
    } finally {
      setSaving(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/breed-categories/${c.id}`);
      toast.success('Category deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete category');
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading categories…</p>;

  const openCreate = () =>
    setModal({ mode: 'create', form: { name: '', displayOrder: (items.reduce((m, c) => Math.max(m, c.displayOrder), 0) || 0) + 1, isActive: true } });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-brand-slate">
          The fixed list of categories (Giant, Large, Medium, Small to start with). Insurers choose which of these each of their
          breeds falls in (or none) — the same breed can be in different categories for different insurers. Uploads can only use
          the categories listed here and never create new ones, because a category can affect pricing.
        </p>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus size={16} />
            Add category
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Add the categories insurers can use. Uploads can only pick from this list — they never create categories."
          action={canWrite && <Button onClick={openCreate}><Plus size={16} />Add category</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Used by</th>
                <th className="px-5 py-3">Status</th>
                {canWrite && <th className="px-5 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-brand-line last:border-0">
                  <td className="px-5 py-3 font-medium text-brand-ink">{c.name}</td>
                  <td className="px-5 py-3 text-brand-slate">{c.displayOrder}</td>
                  <td className="px-5 py-3 text-brand-slate">
                    {c.usageCount ?? 0} insurer breed{c.usageCount === 1 ? '' : 's'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={badge(c.isActive)}>{c.isActive ? 'Active' : 'Inactive'}</span>
                  </td>
                  {canWrite && (
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          title="Edit"
                          onClick={() => setModal({ mode: 'edit', id: c.id, form: { name: c.name, displayOrder: c.displayOrder, isActive: c.isActive } })}
                          className={iconBtn}
                        >
                          <Pencil size={15} />
                        </button>
                        <button title="Delete" onClick={() => remove(c)} className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'Add category' : 'Edit category'}
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
              <Field label="Category name" required>
                <Input autoFocus value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} />
              </Field>
            </div>
            <Field label="Display order" hint="lower = first">
              <Input
                type="number"
                min="0"
                value={modal.form.displayOrder}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, displayOrder: e.target.value } })}
              />
            </Field>
            <label className="mt-7 flex items-center gap-2 text-sm text-brand-ink">
              <input
                type="checkbox"
                checked={modal.form.isActive}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, isActive: e.target.checked } })}
              />
              Active
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
