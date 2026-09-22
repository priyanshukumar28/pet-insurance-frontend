import { useCallback, useEffect, useState } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import Button from '../UI/Button.jsx';
import StatusBadge, { fmtWhen } from './StatusBadge.jsx';

// The messages sent (or skipped) for one proposal / one policy, with a "send again"
// button. Used on the proposal and policy pages. `event` is PROPOSAL_CREATED or
// CERTIFICATE_ISSUED.
export default function MessagesPanel({ event, proposalNo, proposalId, reference, saleId, canSend = false, className = '' }) {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get('/notifications/logs', { params: { event, limit: 20, ...(reference ? { reference } : { proposalNo }) } })
      .then(({ data }) => setRows(data.data.items))
      .catch(() => setRows([]));
  }, [event, proposalNo, reference]);

  useEffect(load, [load]);

  async function sendAgain() {
    setBusy(true);
    try {
      const { data } = await api.post('/notifications/send', { event, proposalId, saleId });
      toast.success(data.data?.mode === 'log' ? 'Recorded as a preview — nothing was sent (NOTIFY_MODE=log)' : data.message || 'Queued');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`rounded-xl2 border border-brand-line bg-white p-5 shadow-card ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-ink">Customer messages</h3>
        {canSend && (
          <Button variant="secondary" onClick={sendAgain} disabled={busy}>
            <Send size={14} /> {busy ? 'Sending…' : 'Send again'}
          </Button>
        )}
      </div>
      {rows === null ? (
        <p className="text-sm text-brand-slate">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-brand-slate">
          Nothing has been sent for this record yet.
        </p>
      ) : (
        <ul className="divide-y divide-brand-line/70 text-sm">
          {rows.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="flex items-center gap-2 text-brand-ink">
                {m.channel === 'EMAIL' ? <Mail size={14} className="text-brand-slate" /> : <MessageCircle size={14} className="text-brand-slate" />}
                <span className="font-medium">{m.channel === 'EMAIL' ? 'Email' : 'WhatsApp'}</span>
                <span className="text-brand-slate">{m.recipient || '—'}</span>
                {m.trigger !== 'AUTO' && <span className="text-[11px] uppercase text-brand-slate">({m.trigger.toLowerCase()})</span>}
              </span>
              <span className="flex items-center gap-2">
                {m.error && <span className="max-w-[260px] truncate text-xs text-brand-slate" title={m.error}>{m.error}</span>}
                <StatusBadge status={m.status} />
                <span className="text-xs text-brand-slate">{fmtWhen(m.createdAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
