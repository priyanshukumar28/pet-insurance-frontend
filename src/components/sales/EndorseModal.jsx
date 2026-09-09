import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import Modal from '../UI/Modal.jsx';
import Button from '../UI/Button.jsx';
import { Field, Input, Textarea } from '../UI/Field.jsx';

// Endorse the "basic details" of an issued policy. `fields` comes from
// /sales/catalog → endorsableFields. Only changed fields are sent.
export default function EndorseModal({ open, onClose, sale, fields, onDone }) {
  const current = useMemo(() => {
    if (!sale) return {};
    const out = {};
    for (const f of fields || []) {
      out[f.key] = f.source === 'override' ? sale.pdfOverrides?.[f.key] || '' : sale[f.key] || '';
    }
    return out;
  }, [sale, fields]);

  const [values, setValues] = useState(current);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset local state whenever a different sale is opened.
  const [seenId, setSeenId] = useState(null);
  if (sale && sale.id !== seenId) {
    setSeenId(sale.id);
    setValues(current);
    setReason('');
  }

  const changed = fields?.filter((f) => (values[f.key] || '') !== (current[f.key] || '')) || [];

  async function submit() {
    if (changed.length === 0) return toast.error('Change at least one field to endorse');
    setSaving(true);
    try {
      const changes = {};
      changed.forEach((f) => {
        changes[f.key] = values[f.key] || '';
      });
      const { data } = await api.post(`/sales/${sale.id}/endorsements`, { changes, reason });
      toast.success(data.message || 'Endorsement recorded');
      onDone?.(data.data.sale);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not endorse');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={sale ? `Endorse ${sale.reference}` : 'Endorse'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || changed.length === 0}>
            {saving ? 'Saving…' : `Endorse ${changed.length ? `(${changed.length})` : ''}`}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-brand-slate">
        Only these basic details can be amended. Plan, slab, coverages, benefits, add-ons, premium, sum insured and
        policy dates are locked once a policy is issued.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(fields || []).map((f) =>
          f.multiline ? (
            <div key={f.key} className="md:col-span-2">
              <Field label={f.label}>
                <Textarea
                  rows={2}
                  value={values[f.key] || ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </Field>
            </div>
          ) : (
            <Field key={f.key} label={f.label}>
              <Input
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </Field>
          )
        )}
        <div className="md:col-span-2">
          <Field label="Reason for endorsement" hint="stored on the endorsement record">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. customer changed phone number" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
