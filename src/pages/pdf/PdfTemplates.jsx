import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Pencil, Trash2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import EmptyState from '../../components/UI/EmptyState.jsx';
import Button from '../../components/UI/Button.jsx';

export default function PdfTemplates() {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  const load = useCallback(() => {
    api
      .get('/pdf-templates')
      .then(({ data }) => setItems(data.data.items))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(t) {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api.delete(`/pdf-templates/${t.id}`);
      toast.success('Template deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  }

  if (items === null) return <p className="text-sm text-brand-slate">Loading templates…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="max-w-2xl text-sm text-brand-slate">
          The certificate layout is fixed. A template only changes the words — document title, intro, the rules /
          terms &amp; conditions sections, declaration and footer. Map templates to plans (and insurers) from the
          plan builder / insurer form.
        </p>
        <Button onClick={() => navigate('/pdf-templates/new')}>
          <Plus size={16} />
          New template
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create a template, then map it to plans or set it as the default."
          action={
            <Button onClick={() => navigate('/pdf-templates/new')}>
              <Plus size={16} />
              New template
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-brand-line bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                <th className="px-5 py-3">Template</th>
                <th className="px-5 py-3">Sections</th>
                <th className="px-5 py-3">Mapped to</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-brand-line last:border-0">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 font-medium text-brand-ink">
                      {t.name}
                      {t.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-blueTint px-2 py-0.5 text-[11px] font-semibold text-brand-blue">
                          <Star size={11} className="fill-brand-blue" /> Default
                        </span>
                      )}
                    </div>
                    {t.description && <div className="mt-0.5 text-xs text-brand-slate">{t.description}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-brand-slate">{(t.content?.sections || []).length}</td>
                  <td className="px-5 py-3.5 text-brand-slate">
                    {t.usedByPlans || 0} plan{t.usedByPlans === 1 ? '' : 's'} · {t.usedByInsurers || 0} insurer
                    {t.usedByInsurers === 1 ? '' : 's'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => navigate(`/pdf-templates/${t.id}`)}
                        className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-bg hover:text-brand-blue"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(t)}
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
    </div>
  );
}
