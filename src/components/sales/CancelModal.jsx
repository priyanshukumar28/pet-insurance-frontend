import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import Modal from '../UI/Modal.jsx';
import Button from '../UI/Button.jsx';
import { Field, Textarea } from '../UI/Field.jsx';

export default function CancelModal({ open, onClose, sale, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const [seenId, setSeenId] = useState(null);
  if (sale && sale.id !== seenId) {
    setSeenId(sale.id);
    setReason('');
  }

  async function submit() {
    setSaving(true);
    try {
      const { data } = await api.post(`/sales/${sale.id}/cancel`, { reason });
      toast.success(data.message || 'Policy cancelled');
      onDone?.(data.data.sale);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={sale ? `Cancel ${sale.reference}` : 'Cancel policy'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep policy
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            {saving ? 'Cancelling…' : 'Cancel policy'}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-brand-slate">
        This marks the policy as <strong>Cancelled</strong>. It stays on record and its certificate is watermarked
        cancelled. This cannot be undone.
      </p>
      <Field label="Reason" hint="recorded on the policy">
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancellation" />
      </Field>
    </Modal>
  );
}
