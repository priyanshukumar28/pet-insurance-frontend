import api from '../api/axios.js';

// Fetch a binary endpoint (auth header attached by the axios instance) and
// hand the browser a download / open-in-tab.
export async function fetchFile(url, { params, filename, open = false } = {}) {
  const res = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  if (open) {
    window.open(blobUrl, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
