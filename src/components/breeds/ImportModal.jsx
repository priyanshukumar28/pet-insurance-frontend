import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, Upload, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios.js';
import { fetchFile } from '../../lib/download.js';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

const SHOW = 8; // rows listed per group in the preview

// Two-step spreadsheet import: pick a file → it is validated straight away
// (dry-run, nothing saved) → the admin reviews the summary → Import commits.
//
//   importUrl      POST endpoint; called with ?dryRun=1 first, then without
//   groups         [{ key, label, tone, line(row) }] — which report lists to preview
//   stats          [{ key, label, tone }] — which report counts to show as chips
//   modes          optional [{ value, label, hint }] — e.g. Add/update vs Replace
//   changeKeys     report counts that mean "this import will change something"
const TONES = {
  good: 'bg-green-100 text-green-700',
  info: 'bg-brand-blueTint text-brand-blue',
  warn: 'bg-brand-orangeTint text-brand-orangeDark',
  bad: 'bg-red-100 text-red-700',
  mute: 'bg-brand-bg text-brand-slate',
};

export default function ImportModal({
  open,
  onClose,
  title,
  intro,
  templateUrl,
  templateFilename,
  importUrl,
  groups,
  stats,
  modes,
  changeKeys,
  onDone,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState(modes?.[0]?.value || null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false); // previewing
  const [saving, setSaving] = useState(false);

  // Fresh state each time the dialog opens.
  useEffect(() => {
    if (open) {
      setFile(null);
      setMode(modes?.[0]?.value || null);
      setPreview(null);
      setError('');
      setBusy(false);
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function send(f, m, dryRun) {
    const fd = new FormData();
    fd.append('file', f);
    const params = new URLSearchParams();
    if (dryRun) params.set('dryRun', '1');
    if (m) params.set('mode', m);
    return api.post(`${importUrl}?${params}`, fd);
  }

  async function runPreview(f, m) {
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      const { data } = await send(f, m, true);
      setPreview(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  }

  function pickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after fixing it
    if (!f) return;
    setFile(f);
    runPreview(f, mode);
  }

  function changeMode(m) {
    setMode(m);
    if (file) runPreview(file, m);
  }

  async function commit() {
    setSaving(true);
    try {
      const { data } = await send(file, mode, false);
      toast.success(data.message || 'Imported');
      onDone?.(data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
      // The data may have changed since the preview — refresh it.
      runPreview(file, mode);
    } finally {
      setSaving(false);
    }
  }

  const willChange = preview && (changeKeys || []).some((k) => (preview.counts[k] || 0) > 0);
  const canImport = !!preview && !busy && !saving && !preview.blocked && willChange;
  const activeMode = modes?.find((m) => m.value === mode);

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={commit} disabled={!canImport}>
            <Upload size={15} />
            {saving ? 'Importing…' : 'Import'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {intro && <p className="text-sm text-brand-slate">{intro}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => fetchFile(templateUrl, { filename: templateFilename })}>
            <Download size={15} />
            Download template
          </Button>
          <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy || saving}>
            <FileSpreadsheet size={15} />
            {file ? 'Choose a different file' : 'Choose .xlsx / .csv file'}
          </Button>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={pickFile} />
          {file && <span className="truncate text-xs text-brand-slate">{file.name}</span>}
        </div>

        {modes && (
          <div className="space-y-1.5 rounded-lg border border-brand-line p-3">
            {modes.map((m) => (
              <label key={m.value} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  className="mt-1"
                  checked={mode === m.value}
                  onChange={() => changeMode(m.value)}
                  disabled={busy || saving}
                />
                <span>
                  <span className="font-medium text-brand-ink">{m.label}</span>
                  <span className="block text-xs text-brand-slate">{m.hint}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        {busy && <p className="text-sm text-brand-slate">Checking the file…</p>}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {stats.map((s) => (
                <span
                  key={s.key}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    TONES[(preview.counts[s.key] || 0) > 0 ? s.tone : 'mute']
                  }`}
                >
                  {preview.counts[s.key] || 0} {s.label}
                </span>
              ))}
              <span className="rounded-full bg-brand-bg px-2.5 py-1 text-xs font-semibold text-brand-slate">
                {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} in file
              </span>
            </div>

            {preview.blocked && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {preview.errors.length > 0
                  ? `"${activeMode?.label}" can't run while any row has an error, or a typo could remove a breed by mistake. Fix the rows below and choose the file again.`
                  : `No valid rows — "${activeMode?.label}" would empty this list, so it is blocked.`}
              </p>
            )}

            {!preview.blocked && !willChange && preview.errors.length === 0 && (
              <p className="text-sm text-brand-slate">Nothing to change — everything in this file is already in the system.</p>
            )}

            {groups.map((g) => {
              const list = preview[g.key] || [];
              if (!list.length) return null;
              return (
                <div key={g.key}>
                  <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${g.tone === 'bad' ? 'text-red-700' : 'text-brand-slate'}`}>
                    {g.label} ({list.length})
                  </p>
                  <ul className="divide-y divide-brand-line overflow-hidden rounded-lg border border-brand-line text-sm">
                    {list.slice(0, SHOW).map((row, i) => (
                      <li key={i} className="px-3 py-1.5 text-brand-ink">
                        {g.line(row)}
                      </li>
                    ))}
                    {list.length > SHOW && (
                      <li className="bg-brand-bg px-3 py-1.5 text-xs text-brand-slate">…and {list.length - SHOW} more</li>
                    )}
                  </ul>
                </div>
              );
            })}

            {preview.errors.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                  Rows with errors ({preview.errors.length}){!preview.blocked && ' — these rows are skipped'}
                </p>
                <ul className="max-h-48 divide-y divide-red-100 overflow-y-auto rounded-lg border border-red-200 bg-red-50/40 text-sm">
                  {preview.errors.map((e, i) => (
                    <li key={i} className="px-3 py-1.5 text-red-800">
                      <span className="mr-2 font-mono text-xs text-red-600">Row {e.row}</span>
                      {e.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
