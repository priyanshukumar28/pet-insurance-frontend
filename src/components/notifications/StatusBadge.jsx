// Delivery status of one notification message.
const STYLES = {
  PREVIEW: ['Preview', 'bg-brand-blueTint text-brand-blue', 'Rendered and recorded only — nothing was sent (NOTIFY_MODE=log)'],
  PENDING: ['Queued', 'bg-amber-100 text-amber-700', 'Waiting to be sent, or waiting to retry'],
  SENDING: ['Sending', 'bg-amber-100 text-amber-700', 'Being sent right now'],
  SENT: ['Sent', 'bg-sky-100 text-sky-700', 'Accepted by the provider'],
  DELIVERED: ['Delivered', 'bg-green-100 text-green-700', 'Delivered to the customer’s phone'],
  READ: ['Read', 'bg-emerald-100 text-emerald-800', 'The customer opened it'],
  FAILED: ['Failed', 'bg-red-100 text-red-700', 'Gave up — see the error'],
  SKIPPED: ['Skipped', 'bg-brand-line/70 text-brand-slate', 'Deliberately not sent — see the reason'],
};

export default function StatusBadge({ status }) {
  const [label, cls, title] = STYLES[status] || [status, 'bg-brand-line/70 text-brand-slate', ''];
  return (
    <span title={title} className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export const EVENT_LABEL = {
  PROPOSAL_CREATED: 'Proposal created',
  CERTIFICATE_ISSUED: 'Certificate issued',
};

export function fmtWhen(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
