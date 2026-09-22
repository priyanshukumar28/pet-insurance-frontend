import { useEffect, useState, useCallback } from 'react';
import { KeyRound, Plus, RefreshCw, Power, Trash2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import EmptyState from '../components/UI/EmptyState.jsx';
import Modal from '../components/UI/Modal.jsx';
import Button from '../components/UI/Button.jsx';
import { Field, Input } from '../components/UI/Field.jsx';

function fmtDateTime(d) {
  return d
    ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

export default function ApiClients() {
  const [items, setItems] = useState(null);
  const [scopes, setScopes] = useState([]);
  const [createModal, setCreateModal] = useState(null); // { name, scopes:Set }
  const [secretModal, setSecretModal] = useState(null); // { clientId, clientSecret }
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api
      .get('/api-clients')
      .then(({ data }) => {
        setItems(data.data.items);
        setScopes(data.data.scopes || []);
      })
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setCreateModal({ name: '', scopes: new Set(['proposals:write', 'certificates:issue']) });
  }
  function toggleScope(s) {
    setCreateModal((m) => {
      const next = new Set(m.scopes);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return { ...m, scopes: next };
    });
  }

  async function create() {
    if (!createModal.name.trim()) return toast.error('Give the client a name');
    setSaving(true);
    try {
      const { data } = await api.post('/api-clients', {
        name: createModal.name,
        scopes: Array.from(createModal.scopes),
      });
      setCreateModal(null);
      setSecretModal({ clientId: data.data.clientId, clientSecret: data.data.clientSecret });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create client');
    } finally {
      setSaving(false);
    }
  }

  async function rotate(c) {
    if (!window.confirm(`Rotate the secret for "${c.name}"? The current secret stops working immediately.`)) return;
    try {
      const { data } = await api.post(`/api-clients/${c.id}/rotate-secret`);
      setSecretModal({ clientId: data.data.clientId, clientSecret: data.data.clientSecret });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not rotate secret');
    }
  }

  async function toggleActive(c) {
    try {
      await api.patch(`/api-clients/${c.id}`, { isActive: !c.isActive });
      toast.success(c.isActive ? 'Client deactivated' : 'Client reactivated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    }
  }

  async function toggleMessages(c) {
    try {
      await api.patch(`/api-clients/${c.id}`, { notifyCustomers: !c.notifyCustomers });
      toast.success(c.notifyCustomers ? 'Customer messages turned off for this partner' : 'Customer messages turned on for this partner');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    }
  }

  async function remove(c) {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    try {
      await api.delete(`/api-clients/${c.id}`);
      toast.success('Client deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading API clients…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-sm text-brand-slate">
          Credentials for external partners integrating the Proposal API. Each client exchanges its ID + secret at{' '}
          <code className="rounded bg-brand-bg px-1">/api/partner/auth/token</code> for a short-lived access token.
        </p>
        <Button onClick={openCreate}>
          <Plus size={16} /> New client
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API clients yet"
          description="Create a client to hand a partner their clientId and clientSecret. The secret is shown once."
          action={
            <Button onClick={openCreate}>
              <Plus size={16} /> New client
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Client ID</th>
                <th className="px-4 py-3">Scopes</th>
                <th className="px-4 py-3">Proposals</th>
                <th className="px-4 py-3">Last used</th>
                <th className="px-4 py-3">Customer messages</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-brand-line last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-ink">{c.name}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-brand-slate">{c.clientId}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-slate">{(c.scopes || []).join(', ') || '—'}</td>
                  <td className="px-4 py-3 text-brand-slate">{c.proposalCount ?? 0}</td>
                  <td className="px-4 py-3 text-brand-slate">{fmtDateTime(c.lastUsedAt)}</td>
                  <td className="px-4 py-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-brand-slate" title="Email / WhatsApp to customers of proposals this partner creates">
                      <input type="checkbox" checked={c.notifyCustomers !== false} onChange={() => toggleMessages(c)} />
                      {c.notifyCustomers !== false ? 'On' : 'Off'}
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        c.isActive ? 'bg-green-100 text-green-700' : 'bg-brand-line/60 text-brand-slate'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        title="Rotate secret"
                        onClick={() => rotate(c)}
                        className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                      >
                        <RefreshCw size={15} />
                      </button>
                      <button
                        title={c.isActive ? 'Deactivate' : 'Reactivate'}
                        onClick={() => toggleActive(c)}
                        className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                      >
                        <Power size={15} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => remove(c)}
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

      {/* Create */}
      <Modal
        open={!!createModal}
        onClose={() => setCreateModal(null)}
        title="New API client"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModal(null)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        {createModal && (
          <div className="space-y-4">
            <Field label="Client name" required hint="the partner / integration this is for">
              <Input value={createModal.name} onChange={(e) => setCreateModal({ ...createModal, name: e.target.value })} />
            </Field>
            <div>
              <p className="mb-1 text-xs font-semibold text-brand-slate">Scopes</p>
              <div className="space-y-1.5">
                {scopes.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm text-brand-ink">
                    <input type="checkbox" checked={createModal.scopes.has(s)} onChange={() => toggleScope(s)} />
                    <code className="rounded bg-brand-bg px-1 text-xs">{s}</code>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Secret shown once */}
      <Modal
        open={!!secretModal}
        onClose={() => setSecretModal(null)}
        title="Copy these credentials now"
        footer={
          <Button onClick={() => setSecretModal(null)}>Done</Button>
        }
      >
        {secretModal && (
          <div className="space-y-4">
            <p className="rounded-lg bg-brand-orangeTint px-3 py-2 text-xs text-brand-orangeDark">
              The secret is not stored and will not be shown again. If you lose it, rotate the secret.
            </p>
            <CopyField label="clientId" value={secretModal.clientId} />
            <CopyField label="clientSecret" value={secretModal.clientSecret} />
          </div>
        )}
      </Modal>
    </div>
  );
}
