import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Save, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fetchFile } from '../lib/download.js';
import Button from '../components/ui/Button.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ImportModal from '../components/breeds/ImportModal.jsx';
import { Input, Select } from '../components/ui/Field.jsx';

const WRITE_ROLES = ['SUPERADMIN', 'ADMIN'];

const IMPORT_MODES = [
  { value: 'merge', label: 'Add / update', hint: 'Adds the breeds in the file and updates their category. Nothing is removed.' },
  { value: 'replace', label: 'Replace', hint: "Makes this insurer's list exactly match the file — breeds not in the file are removed." },
];
const IMPORT_STATS = [
  { key: 'added', label: 'to add', tone: 'good' },
  { key: 'updated', label: 'to update', tone: 'info' },
  { key: 'unchanged', label: 'unchanged', tone: 'mute' },
  { key: 'removed', label: 'to remove', tone: 'warn' },
  { key: 'errors', label: 'with errors', tone: 'bad' },
];
const withCat = (r) => (r.category ? ` — ${r.category}` : '');
const IMPORT_GROUPS = [
  { key: 'added', label: 'Will be added', line: (r) => `${r.code} · ${r.name} (${r.species})${withCat(r)}` },
  {
    key: 'updated',
    label: 'Category will change',
    line: (r) => `${r.code} · ${r.name}: ${r.previousCategory || 'no category'} → ${r.category || 'no category'}`,
  },
  { key: 'removed', label: 'Will be removed', tone: 'warn', line: (r) => `${r.code} · ${r.name} (${r.species})` },
];

// `covered`: { [breedId]: categoryId | '' } — the breeds this insurer underwrites
// and the category (if any) each one falls in. Saved as a whole.
function toCovered(items) {
  return Object.fromEntries(items.map((m) => [m.breedId, m.categoryId || '']));
}

export default function InsurerBreeds() {
  const { id } = useParams();
  const { admin } = useAuth();
  const canWrite = WRITE_ROLES.includes(admin?.role);

  const [insurer, setInsurer] = useState(null);
  const [breeds, setBreeds] = useState(null);
  const [categories, setCategories] = useState([]);
  const [saved, setSaved] = useState({}); // as stored on the server
  const [covered, setCovered] = useState({}); // as edited on screen
  const [filters, setFilters] = useState({ species: '', show: 'all', q: '' });
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Only the most recent load may write state — an older, slower response must not
  // overwrite what the admin has ticked since.
  const loadSeq = useRef(0);
  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    Promise.all([api.get(`/insurers/${id}/breeds`), api.get('/breeds'), api.get('/breed-categories')])
      .then(([m, b, c]) => {
        if (seq !== loadSeq.current) return;
        setInsurer(m.data.data.insurer);
        setBreeds(b.data.data.items);
        setCategories(c.data.data.items);
        const map = toCovered(m.data.data.items);
        setSaved(map);
        setCovered(map);
      })
      .catch((err) => {
        if (seq !== loadSeq.current) return;
        if (err.response?.status === 404) setNotFound(true);
        setBreeds([]);
      });
  }, [id]);
  useEffect(load, [load]);

  const dirty = useMemo(() => JSON.stringify(covered) !== JSON.stringify(saved), [covered, saved]);

  const shown = useMemo(() => {
    if (!breeds) return [];
    const q = filters.q.trim().toLowerCase();
    return breeds.filter((b) => {
      const isCovered = b.id in covered;
      // An inactive breed is only worth showing while this insurer still has it.
      if (!b.isActive && !isCovered) return false;
      return (
        (!filters.species || b.species === filters.species) &&
        (filters.show === 'all' || (filters.show === 'covered') === isCovered) &&
        (!q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q))
      );
    });
  }, [breeds, covered, filters]);

  const selectable = shown.filter((b) => b.isActive);
  const allShownCovered = selectable.length > 0 && selectable.every((b) => b.id in covered);

  function toggleOne(b) {
    setCovered((c) => {
      const next = { ...c };
      if (b.id in next) delete next[b.id];
      else next[b.id] = '';
      return next;
    });
  }
  function toggleShown() {
    setCovered((c) => {
      const next = { ...c };
      for (const b of selectable) {
        if (allShownCovered) delete next[b.id];
        else if (!(b.id in next)) next[b.id] = '';
      }
      return next;
    });
  }
  function setCategory(breedId, categoryId) {
    setCovered((c) => ({ ...c, [breedId]: categoryId }));
  }

  async function save() {
    setSaving(true);
    try {
      const items = Object.entries(covered).map(([breedId, categoryId]) => ({ breedId, categoryId: categoryId || null }));
      const { data } = await api.put(`/insurers/${id}/breeds`, { items });
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (notFound) return <p className="text-sm text-brand-slate">Insurer not found.</p>;
  if (breeds === null || !insurer) return <p className="text-sm text-brand-slate">Loading…</p>;

  const coveredCount = Object.keys(covered).length;
  const uncategorised = Object.values(covered).filter((v) => !v).length;
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/insurers" className="inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline">
            <ArrowLeft size={13} />
            Insurers
          </Link>
          <h2 className="mt-1 text-lg font-semibold text-brand-ink">{insurer.name} — breeds</h2>
          <p className="text-sm text-brand-slate">
            {coveredCount} of {breeds.filter((b) => b.isActive).length} breeds covered
            {coveredCount > 0 && ` · ${uncategorised} without a category`}
            {dirty && <span className="ml-2 rounded-full bg-brand-orangeTint px-2 py-0.5 text-xs font-semibold text-brand-orangeDark">Unsaved changes</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fetchFile(`/insurers/${id}/breeds/template`, { filename: 'insurer-breeds.xlsx' })}>
            <Download size={16} />
            Template
          </Button>
          {canWrite && (
            <>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload size={16} />
                Upload mapping
              </Button>
              <Button onClick={save} disabled={!dirty || saving}>
                <Save size={16} />
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {breeds.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No breeds in the system yet"
          description="Upload the breed master first (Breeds in the sidebar), then come back to choose which breeds this insurer covers."
          action={
            <Link to="/breeds">
              <Button>Go to Breeds</Button>
            </Link>
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
            <div className="w-44">
              <Select value={filters.show} onChange={(e) => setFilters({ ...filters, show: e.target.value })}>
                <option value="all">All breeds</option>
                <option value="covered">Covered only</option>
                <option value="uncovered">Not covered only</option>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl2 border border-brand-line bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-line bg-brand-bg text-left text-xs font-semibold uppercase tracking-wide text-brand-slate">
                  <th className="w-12 px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all shown"
                      checked={allShownCovered}
                      disabled={!canWrite || selectable.length === 0}
                      onChange={toggleShown}
                    />
                  </th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-3 py-3">Breed</th>
                  <th className="px-3 py-3">Species</th>
                  <th className="w-56 px-3 py-3">Category (optional)</th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-brand-slate">
                      No breeds match these filters.
                    </td>
                  </tr>
                )}
                {shown.map((b) => {
                  const on = b.id in covered;
                  return (
                    <tr key={b.id} className={`border-b border-brand-line last:border-0 ${on ? '' : 'text-brand-slate'}`}>
                      <td className="px-5 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Covers ${b.name}`}
                          checked={on}
                          disabled={!canWrite}
                          onChange={() => toggleOne(b)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <code className="rounded bg-brand-bg px-1.5 py-0.5 text-xs font-semibold text-brand-ink">{b.code}</code>
                      </td>
                      <td className={`px-3 py-2.5 ${on ? 'font-medium text-brand-ink' : ''}`}>
                        {b.name}
                        {!b.isActive && <span className="ml-2 rounded-full bg-brand-line/60 px-2 py-0.5 text-xs font-medium text-brand-slate">Inactive</span>}
                      </td>
                      <td className="px-3 py-2.5">{b.species}</td>
                      <td className="px-3 py-1.5">
                        <Select
                          value={covered[b.id] || ''}
                          disabled={!on || !canWrite}
                          onChange={(e) => setCategory(b.id, e.target.value)}
                        >
                          <option value="">— None —</option>
                          {categories
                            .filter((c) => c.isActive || c.id === covered[b.id])
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                                {c.isActive ? '' : ' (inactive)'}
                              </option>
                            ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {activeCategories.length === 0 && (
            <p className="text-xs text-brand-slate">
              No active categories are set up. Categories are optional — add them under{' '}
              <Link to="/breeds?tab=categories" className="font-medium text-brand-blue hover:underline">
                Breeds → Categories
              </Link>
              .
            </p>
          )}
        </>
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title={`Upload breed mapping — ${insurer.name}`}
        intro="Upload the breeds this insurer covers, with a category where the insurer uses one. The template lists every breed with its code — keep the rows this insurer covers. Category must be one of the categories already set up in the system; any other value is rejected, because a category can affect pricing."
        templateUrl={`/insurers/${id}/breeds/template`}
        templateFilename="insurer-breeds.xlsx"
        importUrl={`/insurers/${id}/breeds/import`}
        modes={IMPORT_MODES}
        stats={IMPORT_STATS}
        groups={IMPORT_GROUPS}
        changeKeys={['added', 'updated', 'removed']}
        onDone={load}
      />
    </div>
  );
}
