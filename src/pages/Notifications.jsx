import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Pencil, RotateCcw, RefreshCw, Send, ShieldCheck, ShieldAlert, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import Button from '../components/UI/Button.jsx';
import Modal from '../components/UI/Modal.jsx';
import { Field, Input, Textarea, Select } from '../components/UI/Field.jsx';
import StatusBadge, { EVENT_LABEL, fmtWhen } from '../components/notifications/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MODE_INFO = {
  log: { label: 'Log only', cls: 'bg-brand-blueTint text-brand-blue', note: 'Messages are rendered and recorded as "Preview" but never sent. Safe for development.' },
  live: { label: 'Live', cls: 'bg-green-100 text-green-700', note: 'Messages are really sent.' },
  off: { label: 'Off', cls: 'bg-brand-line/70 text-brand-slate', note: 'Notifications are switched off — nothing is recorded or sent.' },
};

const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'), () => {});

export default function Notifications() {
  const { admin } = useAuth();
  const canWrite = ['SUPERADMIN', 'ADMIN'].includes(admin?.role);
  const [overview, setOverview] = useState(null);
  const [templates, setTemplates] = useState(null);
  const [editing, setEditing] = useState(null); // template being edited
  const [viewLog, setViewLog] = useState(null); // full log row

  const loadAll = useCallback(() => {
    api.get('/notifications/overview').then(({ data }) => setOverview(data.data)).catch(() => toast.error('Could not load notification status'));
    api.get('/notifications/templates').then(({ data }) => setTemplates(data.data.items)).catch(() => setTemplates([]));
  }, []);
  useEffect(loadAll, [loadAll]);

  const eventsByKey = useMemo(() => Object.fromEntries((overview?.events || []).map((e) => [e.key, e])), [overview]);

  if (!overview || !templates) return <p className="text-sm text-brand-slate">Loading…</p>;
  const mode = MODE_INFO[overview.mode] || MODE_INFO.log;

  return (
    <div className="space-y-8">
      {/* --- mode + channel status ---------------------------------------------------- */}
      <section className="space-y-4">
        <div className={`flex flex-wrap items-center gap-3 rounded-xl2 border border-brand-line bg-white p-4 shadow-card`}>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${mode.cls}`}>{mode.label}</span>
          <p className="text-sm text-brand-slate">{mode.note}</p>
          {overview.allowlistActive && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              Test allow-list active ({overview.allowlistCount})
            </span>
          )}
          <span className="ml-auto text-xs text-brand-slate">
            Mode is set by <code>NOTIFY_MODE</code> on the server.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ChannelCard
            icon={Mail}
            title="Email (SMTP)"
            ok={overview.email.configured}
            lines={[
              overview.email.configured ? `${overview.email.host}:${overview.email.port} · ${overview.email.secure ? 'SSL' : 'STARTTLS'}` : 'Not configured — set SMTP_HOST and MAIL_FROM_ADDRESS in the server .env',
              overview.email.from && `From: ${overview.email.from}`,
            ]}
            verify={canWrite && overview.email.configured}
            channel="EMAIL"
            events={overview.events}
            canWrite={canWrite}
            placeholder="you@example.com"
          />
          <ChannelCard
            icon={MessageCircle}
            title="WhatsApp (Tata Tele Omni)"
            ok={overview.whatsapp.configured}
            lines={[
              overview.whatsapp.configured ? overview.whatsapp.baseUrl : 'Not configured — set WHATSAPP_ACCESS_TOKEN in the server .env',
              `Country code +${overview.whatsapp.countryCode}`,
              overview.whatsapp.webhookConfigured ? 'Delivery webhook: secret set' : 'Delivery webhook: not set (WHATSAPP_WEBHOOK_SECRET) — statuses stay "Sent"',
            ]}
            channel="WHATSAPP"
            events={overview.events}
            canWrite={canWrite}
            placeholder="10-digit mobile"
          />
        </div>
        <p className="text-xs text-brand-slate">
          Tiny links are built on <code className="rounded bg-brand-bg px-1">{overview.shortLinkPrefix}/&lt;code&gt;</code>.
        </p>
      </section>

      {/* --- templates -------------------------------------------------------------- */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-brand-ink">Templates</h2>
        <div className="space-y-5">
          {overview.events.map((ev) => (
            <div key={ev.key} className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
              <h3 className="text-sm font-semibold text-brand-ink">{ev.label}</h3>
              <p className="mb-4 text-xs text-brand-slate">{ev.description}</p>
              <div className="grid gap-4 md:grid-cols-2">
                {templates.filter((t) => t.event === ev.key).map((t) => (
                  <TemplateCard
                    key={t.channel}
                    t={t}
                    ev={ev}
                    canWrite={canWrite}
                    onEdit={() => setEditing(t)}
                    onChanged={loadAll}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- delivery log ------------------------------------------------------------ */}
      <DeliveryLog events={overview.events} counts={overview.counts} onOpen={setViewLog} />

      {editing && (
        <TemplateEditor
          t={editing}
          ev={eventsByKey[editing.event]}
          shortLinkPrefix={overview.shortLinkPrefix}
          waConfigured={overview.whatsapp.configured}
          canWrite={canWrite}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadAll(); }}
        />
      )}
      {viewLog && <LogDetail id={viewLog} canWrite={canWrite} onClose={() => setViewLog(null)} />}
    </div>
  );
}

// ------------------------------------------------------------------------------------

function ChannelCard({ icon: Icon, title, ok, lines, verify, channel, events, canWrite, placeholder }) {
  const [to, setTo] = useState('');
  const [event, setEvent] = useState(events[0]?.key);
  const [busy, setBusy] = useState(false);
  const [smtp, setSmtp] = useState(null);

  async function test() {
    if (!to.trim()) return toast.error('Enter where to send the test');
    setBusy(true);
    try {
      const { data } = await api.post('/notifications/test', { event, channel, to: to.trim() });
      const l = data.data.log;
      const msg = { PREVIEW: 'Recorded as a preview — nothing was sent (log mode)', SENT: 'Sent — check the inbox / phone', SKIPPED: `Skipped: ${l.error}`, FAILED: `Failed: ${l.error}`, PENDING: `Queued — will retry (${l.error || ''})` }[l.status] || l.status;
      (['SENT', 'PREVIEW'].includes(l.status) ? toast.success : toast.error)(msg);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Test failed');
    } finally {
      setBusy(false);
    }
  }
  async function verifySmtp() {
    try {
      const { data } = await api.post('/notifications/verify-smtp');
      setSmtp(data.data);
    } catch {
      setSmtp({ ok: false, message: 'Could not check' });
    }
  }

  return (
    <div className="rounded-xl2 border border-brand-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <Icon size={16} /> {title}
        </h3>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {ok ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />} {ok ? 'Configured' : 'Not configured'}
        </span>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs text-brand-slate">
        {lines.filter(Boolean).map((l) => <li key={l}>{l}</li>)}
      </ul>
      {verify && (
        <button onClick={verifySmtp} className="mt-2 text-xs font-medium text-brand-blue hover:underline">
          Check the SMTP connection
        </button>
      )}
      {smtp && <p className={`mt-1 text-xs ${smtp.ok ? 'text-green-700' : 'text-red-600'}`}>{smtp.ok ? 'Connected and authenticated.' : smtp.message}</p>}
      {canWrite && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-brand-line pt-3">
          <div className="min-w-[150px] flex-1">
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder={placeholder} />
          </div>
          <Select value={event} onChange={(e) => setEvent(e.target.value)} className="w-auto">
            {events.map((e) => <option key={e.key} value={e.key}>{EVENT_LABEL[e.key] || e.key}</option>)}
          </Select>
          <Button variant="secondary" onClick={test} disabled={busy}>
            <Send size={14} /> {busy ? 'Sending…' : 'Send test'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------

function TemplateCard({ t, ev, canWrite, onEdit, onChanged }) {
  const isEmail = t.channel === 'EMAIL';
  const Icon = isEmail ? Mail : MessageCircle;

  const fields = () =>
    isEmail
      ? { subject: t.subject, body: t.body, buttonText: t.buttonText, buttonVar: t.buttonVar }
      : { waTemplateName: t.waTemplateName, waLanguage: t.waLanguage, waVariables: t.waVariables, buttonVar: t.buttonVar, waPreview: t.waPreview, requireConsent: t.requireConsent };

  async function toggle() {
    try {
      await api.put(`/notifications/templates/${t.event}/${t.channel}`, { ...fields(), sources: t.sources, enabled: !t.enabled });
      toast.success(t.enabled ? 'Switched off' : 'Switched on');
      onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update');
    }
  }
  async function reset() {
    if (!window.confirm('Reset this template to the built-in default?')) return;
    await api.delete(`/notifications/templates/${t.event}/${t.channel}`);
    toast.success('Reset');
    onChanged();
  }

  return (
    <div className={`rounded-lg border p-4 ${t.enabled ? 'border-brand-line' : 'border-dashed border-brand-line bg-brand-bg/50'}`}>
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
          <Icon size={15} /> {isEmail ? 'Email' : 'WhatsApp'}
          {t.isCustomised && <span className="rounded-full bg-brand-orangeTint px-2 py-0.5 text-[10px] font-semibold text-brand-orangeDark">Customised</span>}
        </h4>
        <label className={`inline-flex items-center gap-1.5 text-xs font-medium ${canWrite ? 'cursor-pointer' : ''}`}>
          <input type="checkbox" checked={t.enabled} disabled={!canWrite} onChange={toggle} /> {t.enabled ? 'On' : 'Off'}
        </label>
      </div>
      <p className="mt-2 truncate text-sm text-brand-ink" title={isEmail ? t.subject : t.waTemplateName}>
        {isEmail ? t.subject : <><code className="rounded bg-brand-bg px-1">{t.waTemplateName}</code> <span className="text-brand-slate">[{t.waLanguage}]</span></>}
      </p>
      <p className="mt-1 text-xs text-brand-slate">
        {t.sources.length ? `Only: ${t.sources.map((s) => ev.sourceOptions.find((o) => o.value === s)?.label || s).join(', ')}` : 'All sources'}
        {!isEmail && (t.requireConsent ? ' · needs customer consent' : ' · no consent required')}
      </p>
      {canWrite && (
        <div className="mt-3 flex gap-3 text-xs font-medium">
          <button onClick={onEdit} className="inline-flex items-center gap-1 text-brand-blue hover:underline"><Pencil size={12} /> Edit</button>
          {t.isCustomised && <button onClick={reset} className="inline-flex items-center gap-1 text-brand-slate hover:text-brand-ink"><RotateCcw size={12} /> Reset to default</button>}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------

function TemplateEditor({ t, ev, shortLinkPrefix, waConfigured, canWrite, onClose, onSaved }) {
  const isEmail = t.channel === 'EMAIL';
  const [f, setF] = useState(() => ({
    enabled: t.enabled,
    sources: t.sources || [],
    subject: t.subject || '',
    body: t.body || '',
    buttonText: t.buttonText || '',
    buttonVar: t.buttonVar || '',
    waTemplateName: t.waTemplateName || '',
    waLanguage: t.waLanguage || 'en',
    waVariables: t.waVariables || [],
    waPreview: t.waPreview || '',
    requireConsent: t.requireConsent !== false,
  }));
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [approval, setApproval] = useState(null);

  // Live preview (debounced) using the unsaved fields + sample data.
  useEffect(() => {
    const h = setTimeout(() => {
      api
        .post(`/notifications/templates/${t.event}/${t.channel}/preview`, isEmail ? { subject: f.subject, body: f.body, buttonText: f.buttonText, buttonVar: f.buttonVar || null } : { waVariables: f.waVariables, waPreview: f.waPreview, waTemplateName: f.waTemplateName, waLanguage: f.waLanguage, buttonVar: f.buttonVar || null })
        .then(({ data }) => setPreview(data.data.preview))
        .catch(() => setPreview(null));
    }, 400);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.subject, f.body, f.buttonText, f.buttonVar, f.waVariables, f.waPreview, f.waTemplateName, f.waLanguage]);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/notifications/templates/${t.event}/${t.channel}`, { ...f, buttonVar: f.buttonVar || null });
      toast.success('Template saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }
  async function checkApproval() {
    try {
      const { data } = await api.post(`/notifications/templates/${t.event}/whatsapp/check`);
      setApproval(data.data);
    } catch (err) {
      setApproval({ error: err.response?.data?.message || 'Could not check' });
    }
  }

  const vars = ev?.variables || [];
  const toggleSource = (v) => set('sources', f.sources.includes(v) ? f.sources.filter((s) => s !== v) : [...f.sources, v]);
  const setVar = (i, v) => set('waVariables', f.waVariables.map((x, idx) => (idx === i ? v : x)));

  // What to give Meta when creating the template.
  const sampleOf = (name) => vars.find((v) => v.name === name)?.sample || '';
  const metaBody = f.waPreview;
  const buttonSample = f.buttonVar ? sampleOf(f.buttonVar) : '';

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={`${isEmail ? 'Email' : 'WhatsApp'} — ${ev?.label || t.event}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {canWrite && <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save template'}</Button>}
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enabled} onChange={(e) => set('enabled', e.target.checked)} /> Enabled</label>
          <div>
            <p className="mb-1 text-xs font-semibold text-brand-slate">Send for</p>
            <div className="flex flex-wrap gap-3 text-sm">
              {ev?.sourceOptions.map((o) => (
                <label key={o.value} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={f.sources.length === 0 || f.sources.includes(o.value)} onChange={() => {
                    // Ticking everything = "all sources" ([]).
                    const cur = f.sources.length === 0 ? ev.sourceOptions.map((x) => x.value) : f.sources;
                    const next = cur.includes(o.value) ? cur.filter((s) => s !== o.value) : [...cur, o.value];
                    set('sources', next.length === ev.sourceOptions.length ? [] : next);
                  }} /> {o.label}
                </label>
              ))}
            </div>
          </div>

          {isEmail ? (
            <>
              <Field label="Subject"><Input value={f.subject} onChange={(e) => set('subject', e.target.value)} /></Field>
              <Field label="Message (HTML)" hint="{{placeholders}} are filled in and safely escaped">
                <Textarea rows={11} className="font-mono text-xs" value={f.body} onChange={(e) => set('body', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Button text"><Input value={f.buttonText} onChange={(e) => set('buttonText', e.target.value)} /></Field>
                <Field label="Button links to">
                  <Select value={f.buttonVar} onChange={(e) => set('buttonVar', e.target.value)}>
                    <option value="">No button</option>
                    {vars.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                  </Select>
                </Field>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><Field label="Template name" hint="exactly as approved (lowercase, underscores)"><Input value={f.waTemplateName} onChange={(e) => set('waTemplateName', e.target.value)} /></Field></div>
                <Field label="Language"><Input value={f.waLanguage} onChange={(e) => set('waLanguage', e.target.value)} /></Field>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-brand-slate">Body variables, in order</p>
                {f.waVariables.map((v, i) => (
                  <div key={i} className="mb-1.5 flex items-center gap-2">
                    <code className="w-10 text-xs text-brand-slate">{`{{${i + 1}}}`}</code>
                    <Select value={v} onChange={(e) => setVar(i, e.target.value)}>
                      {vars.filter((x) => x.name !== 'link' && x.name !== 'code').map((x) => <option key={x.name} value={x.name}>{x.name} — {x.label}</option>)}
                    </Select>
                    <button className="text-xs text-red-600" onClick={() => set('waVariables', f.waVariables.filter((_, idx) => idx !== i))}>Remove</button>
                  </div>
                ))}
                <button className="text-xs font-medium text-brand-blue hover:underline" onClick={() => set('waVariables', [...f.waVariables, vars.find((x) => x.name !== 'link' && x.name !== 'code')?.name])}>+ Add variable</button>
              </div>
              <Field label="URL-button variable" hint="the tiny-link code fills the end of the button URL">
                <Select value={f.buttonVar} onChange={(e) => set('buttonVar', e.target.value)}>
                  <option value="">No button</option>
                  {vars.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                </Select>
              </Field>
              <Field label="Approved message text" hint="use {{1}}, {{2}}… — shown in previews and the log">
                <Textarea rows={4} value={f.waPreview} onChange={(e) => set('waPreview', e.target.value)} />
              </Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.requireConsent} onChange={(e) => set('requireConsent', e.target.checked)} /> Send only if the customer agreed to WhatsApp messages</label>
            </>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-brand-slate">Preview (sample data)</p>
          {isEmail ? (
            preview ? (
              <>
                <p className="rounded-lg bg-brand-bg px-3 py-2 text-sm"><span className="text-brand-slate">Subject: </span>{preview.subject}</p>
                <iframe title="Email preview" srcDoc={preview.html} className="h-[420px] w-full rounded-lg border border-brand-line bg-white" sandbox="" />
              </>
            ) : <p className="text-sm text-brand-slate">Preview unavailable — check the fields.</p>
          ) : (
            <>
              <div className="rounded-lg bg-[#e7f5e6] p-4 text-sm text-brand-ink">
                <p className="whitespace-pre-wrap">{preview?.text || f.waPreview}</p>
                {f.buttonVar && <p className="mt-3 rounded bg-white px-3 py-2 text-center text-xs font-semibold text-brand-blue">🔗 button → {shortLinkPrefix}/{buttonSample}</p>}
              </div>
              <div className="rounded-lg border border-brand-line p-4 text-xs">
                <p className="mb-2 flex items-center justify-between text-sm font-semibold text-brand-ink">For Meta template approval
                  <button className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue" onClick={() => copy(`Name: ${f.waTemplateName}\nLanguage: ${f.waLanguage}\nCategory: UTILITY\n\nBody:\n${metaBody}\n\nSample values: ${f.waVariables.map((v, i) => `{{${i + 1}}}=${sampleOf(v)}`).join(', ')}\n\nButton (URL, dynamic): ${shortLinkPrefix}/{{1}}   sample: ${buttonSample}`)}><Copy size={12} /> Copy</button>
                </p>
                <dl className="grid grid-cols-[110px_1fr] gap-y-1">
                  <dt className="text-brand-slate">Name</dt><dd><code>{f.waTemplateName}</code></dd>
                  <dt className="text-brand-slate">Language</dt><dd>{f.waLanguage}</dd>
                  <dt className="text-brand-slate">Category</dt><dd>Utility (Meta decides)</dd>
                  <dt className="text-brand-slate">Body</dt><dd>{metaBody}</dd>
                  <dt className="text-brand-slate">Samples</dt><dd>{f.waVariables.map((v, i) => `{{${i + 1}}} = ${sampleOf(v)}`).join(' · ')}</dd>
                  <dt className="text-brand-slate">URL button</dt><dd className="break-all">{shortLinkPrefix}/{'{{1}}'} <span className="text-brand-slate">(sample {buttonSample})</span></dd>
                </dl>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Button variant="secondary" onClick={checkApproval} disabled={!waConfigured}>Check approval status</Button>
                {!waConfigured && <span className="text-brand-slate">Set WHATSAPP_ACCESS_TOKEN first</span>}
                {approval && (approval.error
                  ? <span className="text-red-600">{approval.error}</span>
                  : <span className={approval.found && approval.status === 'APPROVED' ? 'font-semibold text-green-700' : 'font-semibold text-amber-700'}>{approval.found ? `${approval.status} (${approval.category})` : 'Template not found at the provider'}</span>)}
              </div>
            </>
          )}
          <div className="rounded-lg bg-brand-bg p-3 text-xs text-brand-slate">
            <p className="mb-1 font-semibold">Available variables</p>
            <div className="flex flex-wrap gap-1.5">
              {vars.map((v) => (
                <button key={v.name} type="button" title={`${v.label} — e.g. ${v.sample}`} onClick={() => copy(`{{${v.name}}}`)} className="rounded-full border border-brand-line bg-white px-2 py-0.5 font-mono text-[11px] hover:border-brand-blue">
                  {`{{${v.name}}}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------------------------

function DeliveryLog({ events, counts, onOpen }) {
  const [filters, setFilters] = useState({ event: '', channel: '', status: '', q: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api
      .get('/notifications/logs', { params: { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), page, limit: 15 } })
      .then(({ data: d }) => setData(d.data))
      .catch(() => setData({ items: [], total: 0, limit: 15 }));
  }, [filters, page]);
  useEffect(load, [load]);

  const setF = (k, v) => { setPage(1); setFilters((s) => ({ ...s, [k]: v })); };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-brand-ink">Delivery log</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-brand-slate">
          {Object.entries(counts).map(([s, n]) => <span key={s} className="inline-flex items-center gap-1"><StatusBadge status={s} /> {n}</span>)}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <Select value={filters.event} onChange={(e) => setF('event', e.target.value)} className="w-auto">
          <option value="">All events</option>
          {events.map((e) => <option key={e.key} value={e.key}>{EVENT_LABEL[e.key] || e.key}</option>)}
        </Select>
        <Select value={filters.channel} onChange={(e) => setF('channel', e.target.value)} className="w-auto">
          <option value="">Both channels</option><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option>
        </Select>
        <Select value={filters.status} onChange={(e) => setF('status', e.target.value)} className="w-auto">
          <option value="">Any status</option>
          {['PREVIEW', 'PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED'].map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
        </Select>
        <div className="w-56"><Input value={filters.q} onChange={(e) => setF('q', e.target.value)} placeholder="Search recipient / PRP / policy no." /></div>
        <Button variant="secondary" onClick={load}><RefreshCw size={14} /> Refresh</Button>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-brand-line bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
              <th className="px-4 py-3">When</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">To</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tries</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-brand-slate">Loading…</td></tr>
            ) : data.items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-brand-slate">No messages yet.</td></tr>
            ) : data.items.map((m) => (
              <tr key={m.id} onClick={() => onOpen(m.id)} className="cursor-pointer border-b border-brand-line/70 last:border-0 hover:bg-brand-bg/60">
                <td className="whitespace-nowrap px-4 py-2.5 text-brand-slate">{fmtWhen(m.createdAt)}</td>
                <td className="px-4 py-2.5">{EVENT_LABEL[m.event] || m.event}</td>
                <td className="px-4 py-2.5">{m.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</td>
                <td className="px-4 py-2.5">{m.recipient || '—'}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{m.reference || m.proposalNo || '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-2.5 text-brand-slate">{m.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.total > data.limit && (
        <div className="mt-3 flex items-center justify-end gap-3 text-sm text-brand-slate">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">← Prev</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">Next →</button>
        </div>
      )}
    </section>
  );
}

function LogDetail({ id, canWrite, onClose }) {
  const [log, setLog] = useState(null);
  useEffect(() => { api.get(`/notifications/logs/${id}`).then(({ data }) => setLog(data.data.log)); }, [id]);

  async function resend() {
    try {
      const { data } = await api.post(`/notifications/logs/${id}/resend`);
      toast.success(data.data?.mode === 'log' ? 'Recorded as a preview — nothing was sent (log mode)' : 'Queued');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend');
    }
  }
  const c = log?.content || {};
  return (
    <Modal open wide onClose={onClose} title="Message details" footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {canWrite && log && <Button onClick={resend}><Send size={14} /> Send again</Button>}
    </>}>
      {!log ? <p className="text-sm text-brand-slate">Loading…</p> : (
        <div className="space-y-4 text-sm">
          <dl className="grid grid-cols-[130px_1fr] gap-y-1.5">
            <dt className="text-brand-slate">Event</dt><dd>{EVENT_LABEL[log.event] || log.event} · {log.channel === 'EMAIL' ? 'Email' : 'WhatsApp'} · {log.trigger.toLowerCase()}</dd>
            <dt className="text-brand-slate">To</dt><dd>{log.recipient || '—'}</dd>
            <dt className="text-brand-slate">Record</dt><dd className="font-mono text-xs">{[log.proposalNo, log.reference].filter(Boolean).join(' · ') || '—'}</dd>
            <dt className="text-brand-slate">Status</dt><dd><StatusBadge status={log.status} /> <span className="text-xs text-brand-slate">after {log.attempts} attempt(s)</span></dd>
            {log.error && (<><dt className="text-brand-slate">Note</dt><dd className="text-red-700">{log.error}</dd></>)}
            {log.providerId && (<><dt className="text-brand-slate">Provider id</dt><dd className="break-all font-mono text-xs">{log.providerId}</dd></>)}
            <dt className="text-brand-slate">Created</dt><dd>{fmtWhen(log.createdAt)}</dd>
            {log.sentAt && (<><dt className="text-brand-slate">Sent</dt><dd>{fmtWhen(log.sentAt)}</dd></>)}
            {log.deliveredAt && (<><dt className="text-brand-slate">Delivered</dt><dd>{fmtWhen(log.deliveredAt)}</dd></>)}
            {log.readAt && (<><dt className="text-brand-slate">Read</dt><dd>{fmtWhen(log.readAt)}</dd></>)}
            {log.nextAttemptAt && (<><dt className="text-brand-slate">Next retry</dt><dd>{fmtWhen(log.nextAttemptAt)}</dd></>)}
          </dl>
          {log.channel === 'EMAIL' && c.html && (
            <>
              <p className="rounded-lg bg-brand-bg px-3 py-2"><span className="text-brand-slate">Subject: </span>{c.subject}</p>
              <iframe title="Email" srcDoc={c.html} sandbox="" className="h-[420px] w-full rounded-lg border border-brand-line bg-white" />
            </>
          )}
          {log.channel === 'WHATSAPP' && c.template && (
            <div className="rounded-lg bg-[#e7f5e6] p-4">
              <p className="whitespace-pre-wrap text-brand-ink">{c.text}</p>
              <p className="mt-3 text-xs text-brand-slate">Template <code>{c.template}</code> [{c.language}] · variables {JSON.stringify(c.params)}{c.buttonParam ? ` · button suffix ${c.buttonParam}` : ''}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
