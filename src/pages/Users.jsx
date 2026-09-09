import { useCallback, useEffect, useState } from 'react';
import { Users2, Plus, Pencil, KeyRound, Power, Trash2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import EmptyState from '../components/UI/EmptyState.jsx';
import Modal from '../components/UI/Modal.jsx';
import Button from '../components/UI/Button.jsx';
import { Field, Input, Select } from '../components/UI/Field.jsx';

const TYPE_LABEL = { admin: 'Admin', staff: 'Staff', partner: 'Partner' };
const TYPE_BADGE = {
  admin: 'bg-brand-blueTint text-brand-blue',
  staff: 'bg-brand-orangeTint text-brand-orangeDark',
  partner: 'bg-green-100 text-green-700',
};
const roleLabel = (r) => r.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function fmtDateTime(d) {
  return d
    ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'never';
}

function CopyField({ label, value }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-brand-slate">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-brand-bg px-3 py-2 text-xs text-brand-ink">{value}</code>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="rounded-lg border border-brand-line p-2 text-brand-slate hover:bg-brand-bg"
        >
          {done ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

const blankForm = () => ({
  type: 'admin',
  role: 'ADMIN',
  name: '',
  email: '',
  password: '',
  clientMode: 'existing', // 'existing' | 'new'
  apiClientId: '',
  newClientName: '',
  newClientScopes: new Set(['proposals:write', 'certificates:issue']),
  isActive: true,
});

export default function Users() {
  const { admin: me } = useAuth();
  const [items, setItems] = useState(null);
  const [catalog, setCatalog] = useState({ roleGroups: {}, scopes: [], apiClients: [] });
  const [filters, setFilters] = useState({ type: '', q: '', status: '' });
  const [modal, setModal] = useState(null); // { mode:'create'|'edit', id?, form }
  const [secret, setSecret] = useState(null); // { clientId, clientSecret }
  const [pwFor, setPwFor] = useState(null); // user row
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = {};
    if (filters.type) params.type = filters.type;
    if (filters.q) params.q = filters.q;
    if (filters.status) params.status = filters.status;
    api.get('/users', { params }).then(({ data }) => setItems(data.data.items)).catch(() => setItems([]));
  }, [filters]);

  useEffect(() => {
    api.get('/users/catalog').then(({ data }) => setCatalog(data.data)).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const rolesFor = (type) => catalog.roleGroups[type] || [];

  function openCreate() {
    setModal({ mode: 'create', form: blankForm() });
  }
  function openEdit(u) {
    setModal({
      mode: 'edit',
      id: u.id,
      form: {
        ...blankForm(),
        type: u.type,
        role: u.role,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        clientMode: 'existing',
        apiClientId: u.apiClient?.id || '',
      },
    });
  }
  function setF(patch) {
    setModal((m) => ({ ...m, form: { ...m.form, ...patch } }));
  }
  function pickType(type) {
    setF({ type, role: rolesFor(type)[0] || '' });
  }
  function toggleScope(s) {
    setModal((m) => {
      const next = new Set(m.form.newClientScopes);
      next.has(s) ? next.delete(s) : next.add(s);
      return { ...m, form: { ...m.form, newClientScopes: next } };
    });
  }

  async function save() {
    const f = modal.form;
    if (!f.name.trim()) return toast.error('Name is required');
    if (modal.mode === 'create') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return toast.error('Enter a valid email');
      if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(f.password))
        return toast.error('Password: 8+ chars with an uppercase letter and a number');
    }
    const body = { name: f.name.trim(), role: f.role };
    if (modal.mode === 'create') {
      body.email = f.email.trim();
      body.password = f.password;
    }
    if (f.role === 'PARTNER') {
      if (f.clientMode === 'new') {
        if (!f.newClientName.trim()) return toast.error('Give the API client a name');
        body.newApiClient = { name: f.newClientName.trim(), scopes: Array.from(f.newClientScopes) };
      } else {
        if (!f.apiClientId) return toast.error('Pick an API client for this partner');
        body.apiClientId = f.apiClientId;
      }
    }
    if (modal.mode === 'edit') body.isActive = f.isActive;

    setSaving(true);
    try {
      if (modal.mode === 'create') {
        const { data } = await api.post('/users', body);
        toast.success(`${f.name} added`);
        if (data.data.clientSecret) {
          setSecret({ clientId: data.data.apiClient.clientId, clientSecret: data.data.clientSecret });
        }
      } else {
        await api.patch(`/users/${modal.id}`, body);
        toast.success('User updated');
      }
      setModal(null);
      load();
      api.get('/users/catalog').then(({ data }) => setCatalog(data.data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u) {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'User deactivated' : 'User reactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    }
  }
  async function remove(u) {
    if (!window.confirm(`Remove ${u.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      toast.success(`${u.name} removed`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  }
  async function resetPw() {
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw)) return toast.error('Password: 8+ chars with an uppercase letter and a number');
    try {
      await api.post(`/users/${pwFor.id}/reset-password`, { password: pw });
      toast.success(`Password reset for ${pwFor.name}`);
      setPwFor(null);
      setPw('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reset');
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading users…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-36" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
            <option value="">All types</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="partner">Partner</option>
          </Select>
          <Select className="w-36" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Input className="w-60" placeholder="Search name / email…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} /> New user
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Users2} title="No users match" description="Create admin, staff or partner logins here." action={<Button onClick={openCreate}><Plus size={16} /> New user</Button>} />
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Type / Role</th>
                <th className="px-4 py-3">Partner client</th>
                <th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-brand-line last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-ink">
                      {u.name}
                      {isSelf && <span className="ml-1.5 text-[11px] text-brand-slate">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-brand-slate">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_BADGE[u.type]}`}>{TYPE_LABEL[u.type]}</span>
                      <span className="ml-2 text-xs text-brand-slate">{roleLabel(u.role)}</span>
                    </td>
                    <td className="px-4 py-3 text-brand-slate">{u.apiClient?.name || '—'}</td>
                    <td className="px-4 py-3 text-brand-slate">{fmtDateTime(u.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-brand-line/60 text-brand-slate'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button title="Edit" onClick={() => openEdit(u)} className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue">
                          <Pencil size={15} />
                        </button>
                        <button title="Reset password" onClick={() => setPwFor(u)} className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue">
                          <KeyRound size={15} />
                        </button>
                        <button
                          title={isSelf ? "Can't change your own account" : u.isActive ? 'Deactivate' : 'Reactivate'}
                          disabled={isSelf}
                          onClick={() => toggleActive(u)}
                          className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue disabled:opacity-30"
                        >
                          <Power size={15} />
                        </button>
                        <button
                          title={isSelf ? "Can't delete your own account" : 'Delete'}
                          disabled={isSelf}
                          onClick={() => remove(u)}
                          className="rounded-lg p-1.5 text-brand-slate hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / edit */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === 'create' ? 'New user' : 'Edit user'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        {modal && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold text-brand-slate">User type</p>
              <div className="flex gap-1 rounded-lg bg-brand-bg p-1">
                {['admin', 'staff', 'partner'].map((t) => (
                  <button
                    key={t}
                    onClick={() => pickType(t)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      modal.form.type === t ? 'bg-white text-brand-ink shadow-card' : 'text-brand-slate'
                    }`}
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Role">
                <Select value={modal.form.role} onChange={(e) => setF({ role: e.target.value })}>
                  {rolesFor(modal.form.type).map((r) => (
                    <option key={r} value={r}>{roleLabel(r)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Name" required>
                <Input value={modal.form.name} onChange={(e) => setF({ name: e.target.value })} />
              </Field>
            </div>
            {modal.mode === 'create' && (
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email" required>
                  <Input value={modal.form.email} onChange={(e) => setF({ email: e.target.value })} />
                </Field>
                <Field label="Temporary password" required hint="8+ chars, 1 uppercase, 1 number">
                  <Input value={modal.form.password} onChange={(e) => setF({ password: e.target.value })} />
                </Field>
              </div>
            )}
            {modal.mode === 'edit' && (
              <label className="flex items-center gap-2 text-sm text-brand-ink">
                <input type="checkbox" checked={modal.form.isActive} onChange={(e) => setF({ isActive: e.target.checked })} />
                Active
              </label>
            )}

            {modal.form.role === 'PARTNER' && (
              <div className="rounded-lg border border-brand-line p-3">
                <p className="mb-2 text-xs font-semibold text-brand-slate">API client (the business this partner sees)</p>
                <div className="mb-2 flex gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" checked={modal.form.clientMode === 'existing'} onChange={() => setF({ clientMode: 'existing' })} />
                    Link existing
                  </label>
                  {modal.mode === 'create' && (
                    <label className="flex items-center gap-1.5">
                      <input type="radio" checked={modal.form.clientMode === 'new'} onChange={() => setF({ clientMode: 'new' })} />
                      Create new
                    </label>
                  )}
                </div>
                {modal.form.clientMode === 'existing' ? (
                  <Select value={modal.form.apiClientId} onChange={(e) => setF({ apiClientId: e.target.value })}>
                    <option value="">Select API client…</option>
                    {catalog.apiClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                ) : (
                  <div className="space-y-2">
                    <Input placeholder="Client name (e.g. company)" value={modal.form.newClientName} onChange={(e) => setF({ newClientName: e.target.value })} />
                    <div className="space-y-1">
                      {catalog.scopes.map((s) => (
                        <label key={s} className="flex items-center gap-2 text-sm text-brand-ink">
                          <input type="checkbox" checked={modal.form.newClientScopes.has(s)} onChange={() => toggleScope(s)} />
                          <code className="rounded bg-brand-bg px-1 text-xs">{s}</code>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Secret shown once */}
      <Modal open={!!secret} onClose={() => setSecret(null)} title="Copy the partner's API credentials" footer={<Button onClick={() => setSecret(null)}>Done</Button>}>
        {secret && (
          <div className="space-y-4">
            <p className="rounded-lg bg-brand-orangeTint px-3 py-2 text-xs text-brand-orangeDark">
              The secret is shown only once. Send it to the partner over a secure channel.
            </p>
            <CopyField label="clientId" value={secret.clientId} />
            <CopyField label="clientSecret" value={secret.clientSecret} />
          </div>
        )}
      </Modal>

      {/* Reset password */}
      <Modal
        open={!!pwFor}
        onClose={() => { setPwFor(null); setPw(''); }}
        title={pwFor ? `Reset password — ${pwFor.name}` : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setPwFor(null); setPw(''); }}>Cancel</Button>
            <Button onClick={resetPw}>Reset</Button>
          </>
        }
      >
        <Field label="New temporary password" hint="8+ chars, 1 uppercase, 1 number">
          <Input value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        </Field>
        <p className="mt-2 text-xs text-brand-slate">The user is signed out of all sessions and must log in with this password.</p>
      </Modal>
    </div>
  );
}
