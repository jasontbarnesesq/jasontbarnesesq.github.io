/* ============================================================
   File Converter — Frontend App
   Google OAuth + Drive integration + backend API calls
   ============================================================ */

'use strict';

// ── Configuration ────────────────────────────────────────────
const CONFIG = {
  // Replace these before deploying
  GOOGLE_CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
  BACKEND_URL: 'YOUR_CLOUD_RUN_URL',   // e.g. https://file-converter-xxxxxx-uc.a.run.app
  DRIVE_SCOPES: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
  ].join(' '),
};

// ── App state ─────────────────────────────────────────────────
const state = {
  user: null,
  idToken: null,
  accessToken: null,
  files: [],          // { file, id, name, ext, size }
  outputFormat: 'pdf',
  driveFolderId: null,
  driveFolderName: 'Conversions',
  history: [],
  driveFiles: [],
};

// ── Utility ───────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function fileIcon(ext) {
  const icons = { md: '📝', json: '📦', bas: '💾', txt: '📋', pdf: '📄', docx: '📃', xlsx: '📊' };
  return icons[ext.toLowerCase()] || '📁';
}

function showToast(msg, type = 'info') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast hidden'; }, 3500);
}

// ── Google Sign-In callback ───────────────────────────────────
function handleGoogleSignIn(response) {
  const payload = parseJwt(response.credential);
  state.idToken = response.credential;
  state.user = {
    name: payload.name,
    email: payload.email,
    picture: payload.picture,
    sub: payload.sub,
  };

  // Populate UI
  $('user-name').textContent = state.user.name;
  $('user-email').textContent = state.user.email;
  $('user-avatar').src = state.user.picture;
  $('user-avatar').onerror = () => { $('user-avatar').style.display = 'none'; };

  // Hide auth overlay, show app
  $('auth-overlay').style.display = 'none';
  $('app').classList.remove('hidden');

  // Request Drive access token via GAPI
  loadGapiAndRequestToken();
}

function parseJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}

function signOut() {
  state.user = null;
  state.idToken = null;
  state.accessToken = null;
  state.files = [];
  $('app').classList.add('hidden');
  $('auth-overlay').style.display = 'flex';
  // Reset Google sign-in button
  google.accounts.id.disableAutoSelect();
  showToast('Signed out successfully', 'info');
}

// ── GAPI / Drive token ────────────────────────────────────────
function loadGapiAndRequestToken() {
  gapi.load('client', () => {
    gapi.client.init({
      apiKey: '',  // not needed for OAuth token flow
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    }).then(() => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: CONFIG.DRIVE_SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            showToast('Drive access denied — outputs will not be saved to Drive', 'error');
            return;
          }
          state.accessToken = tokenResponse.access_token;
          gapi.client.setToken({ access_token: state.accessToken });
          loadHistory();
          loadDriveFiles();
        },
      });
      tokenClient.requestAccessToken({ prompt: '' });
    }).catch(err => {
      console.error('GAPI init error', err);
      showToast('Google API init failed — Drive features unavailable', 'error');
    });
  });
}

// ── Navigation ────────────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`view-${name}`).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');

  if (name === 'history') loadHistory();
  if (name === 'drive') loadDriveFiles();
}

// ── File handling ─────────────────────────────────────────────
const ACCEPTED_EXTS = ['md', 'json', 'bas', 'txt'];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

function handleFiles(fileList) {
  const newFiles = Array.from(fileList).filter(f => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) {
      showToast(`${f.name}: unsupported type (.${ext})`, 'error');
      return false;
    }
    if (f.size > MAX_SIZE) {
      showToast(`${f.name}: exceeds 50 MB limit`, 'error');
      return false;
    }
    return true;
  });

  newFiles.forEach(f => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    state.files.push({ file: f, id, name: f.name, ext: f.name.split('.').pop().toLowerCase(), size: f.size });
  });

  renderFileQueue();
}

function renderFileQueue() {
  const queue = $('file-queue');
  const list = $('file-list');
  const count = $('file-count');
  const btn = $('convert-btn');
  const summary = $('convert-summary');

  if (state.files.length === 0) {
    queue.classList.add('hidden');
    btn.disabled = true;
    summary.textContent = 'No files selected';
    return;
  }

  queue.classList.remove('hidden');
  count.textContent = state.files.length;
  btn.disabled = false;
  summary.textContent = `${state.files.length} file${state.files.length > 1 ? 's' : ''} → ${state.outputFormat.toUpperCase()}`;

  list.innerHTML = '';
  state.files.forEach(({ id, name, ext, size }) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.dataset.id = id;
    li.innerHTML = `
      <span class="file-icon">${fileIcon(ext)}</span>
      <span class="file-name" title="${name}">${name}</span>
      <span class="file-type-badge badge-${ext}">.${ext}</span>
      <span class="file-size">${formatBytes(size)}</span>
      <button class="remove-file-btn" onclick="removeFile('${id}')" title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    list.appendChild(li);
  });
}

function removeFile(id) {
  state.files = state.files.filter(f => f.id !== id);
  renderFileQueue();
}

function clearQueue() {
  state.files = [];
  renderFileQueue();
}

// ── Format selection ──────────────────────────────────────────
document.querySelectorAll('.format-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.format-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    state.outputFormat = opt.dataset.format;
    renderFileQueue();
  });
});

// ── Drop zone ─────────────────────────────────────────────────
const dropZone = $('drop-zone');
const fileInput = $('file-input');

dropZone.addEventListener('click', (e) => {
  if (!e.target.closest('.file-btn')) fileInput.click();
});

fileInput.addEventListener('change', () => {
  handleFiles(fileInput.files);
  fileInput.value = '';
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

// ── Drive folder picker ───────────────────────────────────────
function pickDriveFolder() {
  if (!state.accessToken) {
    showToast('Please sign in with Drive access first', 'error');
    return;
  }
  // Simple folder name prompt as fallback (Drive Picker API requires additional setup)
  const name = prompt('Enter Google Drive folder name (will be created if needed):', state.driveFolderName);
  if (name && name.trim()) {
    state.driveFolderName = name.trim();
    state.driveFolderId = null; // will be resolved on conversion
    $('folder-display').textContent = `My Drive / ${state.driveFolderName}`;
    showToast(`Output folder set to: ${state.driveFolderName}`, 'success');
  }
}

// ── Conversion ────────────────────────────────────────────────
async function startConversion() {
  if (state.files.length === 0) return;

  const btn = $('convert-btn');
  btn.disabled = true;

  $('progress-section').classList.remove('hidden');
  $('results-section').classList.add('hidden');

  const progList = $('progress-list');
  progList.innerHTML = '';

  const results = [];

  // Build progress items
  state.files.forEach(({ id, name }) => {
    const div = document.createElement('div');
    div.className = 'progress-item';
    div.id = `prog-${id}`;
    div.innerHTML = `
      <div class="progress-item-header">
        <span>${name}</span>
        <span id="prog-label-${id}">Uploading…</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" id="prog-bar-${id}" style="width:0%"></div>
      </div>`;
    progList.appendChild(div);
  });

  const options = {
    outputFormat: state.outputFormat,
    folderName: state.driveFolderName,
    folderId: state.driveFolderId,
    notify: $('opt-notify').checked,
    shareable: $('opt-share').checked,
    bundle: $('opt-zip').checked,
  };

  // Convert files sequentially (backend handles heavy lifting; parallel is also fine)
  for (const fileObj of state.files) {
    try {
      const result = await convertFile(fileObj, options);
      results.push({ ...fileObj, ...result, status: 'success' });
      setProgress(fileObj.id, 100, 'Done');
    } catch (err) {
      console.error('Conversion error:', err);
      results.push({ ...fileObj, status: 'error', error: err.message });
      setProgress(fileObj.id, 100, 'Failed', true);
    }
  }

  // Save run to Firestore via backend
  try {
    await saveHistory(results, options);
  } catch (e) {
    console.warn('History save failed:', e);
  }

  renderResults(results);
  $('progress-section').classList.add('hidden');
  $('results-section').classList.remove('hidden');
  btn.disabled = false;
}

function setProgress(id, pct, label, isError = false) {
  const bar = $(`prog-bar-${id}`);
  const lbl = $(`prog-label-${id}`);
  if (bar) bar.style.width = `${pct}%`;
  if (bar) bar.style.background = isError ? 'var(--error)' : '';
  if (lbl) lbl.textContent = label;
}

async function convertFile(fileObj, options) {
  setProgress(fileObj.id, 20, 'Reading…');

  const formData = new FormData();
  formData.append('file', fileObj.file);
  formData.append('output_format', options.outputFormat);
  formData.append('folder_name', options.folderName);
  if (options.folderId) formData.append('folder_id', options.folderId);
  formData.append('shareable', options.shareable);
  formData.append('bundle', options.bundle);

  setProgress(fileObj.id, 40, 'Converting…');

  const response = await fetch(`${CONFIG.BACKEND_URL}/convert`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.idToken}`,
      'X-Drive-Token': state.accessToken || '',
    },
    body: formData,
  });

  setProgress(fileObj.id, 80, 'Saving to Drive…');

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Conversion failed');
  }

  const data = await response.json();
  return data;
}

function renderResults(results) {
  const list = $('results-list');
  list.innerHTML = '';

  results.forEach(r => {
    const div = document.createElement('div');
    div.className = 'result-item';

    if (r.status === 'success') {
      div.innerHTML = `
        <div class="result-info">
          <span>${fileIcon(r.ext)}</span>
          <div>
            <div class="result-name">${r.name} → ${r.outputName || (r.name.replace(/\.[^.]+$/, '') + '.' + state.outputFormat)}</div>
            <div class="result-meta">${r.driveFileId ? 'Saved to Google Drive' : 'Conversion complete'}</div>
          </div>
        </div>
        <div class="result-actions">
          ${r.driveViewLink ? `<a class="icon-btn" href="${r.driveViewLink}" target="_blank" rel="noopener">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open in Drive</a>` : ''}
        </div>`;
    } else {
      div.innerHTML = `
        <div class="result-info">
          <span>❌</span>
          <div>
            <div class="result-name">${r.name}</div>
            <div class="result-meta" style="color:var(--error)">${r.error || 'Unknown error'}</div>
          </div>
        </div>`;
    }

    list.appendChild(div);
  });

  const successCount = results.filter(r => r.status === 'success').length;
  if (successCount > 0) {
    showToast(`${successCount} file${successCount > 1 ? 's' : ''} converted and saved to Drive`, 'success');
  }
}

function resetConverter() {
  state.files = [];
  renderFileQueue();
  $('results-section').classList.add('hidden');
  $('progress-section').classList.add('hidden');
}

// ── History ───────────────────────────────────────────────────
async function loadHistory() {
  if (!state.user || !state.idToken) return;

  try {
    const res = await fetch(`${CONFIG.BACKEND_URL}/history`, {
      headers: { 'Authorization': `Bearer ${state.idToken}` },
    });

    if (!res.ok) throw new Error('Failed to load history');
    const data = await res.json();
    state.history = data.runs || [];
    renderHistory(state.history);
  } catch (e) {
    console.warn('History load failed:', e);
    renderHistory([]);
  }
}

async function saveHistory(results, options) {
  await fetch(`${CONFIG.BACKEND_URL}/history`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${state.idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      outputFormat: options.outputFormat,
      folderName: options.folderName,
      files: results.map(r => ({
        name: r.name,
        ext: r.ext,
        size: r.size,
        status: r.status,
        driveFileId: r.driveFileId || null,
        driveViewLink: r.driveViewLink || null,
        error: r.error || null,
      })),
    }),
  });
}

function renderHistory(runs) {
  const list = $('history-list');

  if (!runs || runs.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <p>No conversion history yet.<br>Convert some files to see them here.</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  runs.forEach(run => {
    const success = run.files.filter(f => f.status === 'success').length;
    const total = run.files.length;

    const div = document.createElement('div');
    div.className = 'history-item';
    div.dataset.formats = run.outputFormat;
    div.dataset.names = run.files.map(f => f.name).join(' ').toLowerCase();

    div.innerHTML = `
      <div class="history-icon">${fileIcon(run.outputFormat)}</div>
      <div class="history-details">
        <div class="history-title">${run.files.map(f => f.name).join(', ')}</div>
        <div class="history-meta">
          <span>${formatDate(run.timestamp)}</span>
          <span>${total} file${total > 1 ? 's' : ''} → ${run.outputFormat.toUpperCase()}</span>
          <span>${run.folderName || 'My Drive'}</span>
        </div>
      </div>
      <div class="history-actions">
        <span class="history-badge ${success === total ? 'badge-success' : success > 0 ? 'badge-running' : 'badge-error'}">
          ${success}/${total} ok
        </span>
      </div>`;

    list.appendChild(div);
  });
}

function filterHistory() {
  const search = $('history-search').value.toLowerCase();
  const format = $('history-filter').value;

  document.querySelectorAll('.history-item').forEach(el => {
    const nameMatch = !search || el.dataset.names.includes(search);
    const fmtMatch = !format || el.dataset.formats === format;
    el.style.display = nameMatch && fmtMatch ? '' : 'none';
  });
}

// ── Drive files list ──────────────────────────────────────────
async function loadDriveFiles() {
  if (!state.accessToken) {
    $('drive-files-list').innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8"/>
        </svg>
        <p>Drive access not granted.<br>Sign in again to enable Drive features.</p>
      </div>`;
    return;
  }

  $('drive-files-list').innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading Drive files…</p>
    </div>`;

  try {
    const res = await gapi.client.drive.files.list({
      q: `name contains '' and trashed = false and '${state.user.email}' in owners`,
      fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    const files = res.result.files || [];
    const appFiles = files.filter(f => isConverterOutputMime(f.mimeType));

    renderDriveFiles(appFiles.length > 0 ? appFiles : files.slice(0, 20));
  } catch (e) {
    console.error('Drive list error:', e);
    $('drive-files-list').innerHTML = `<div class="empty-state"><p>Failed to load Drive files.<br>${e.message || ''}</p></div>`;
  }
}

function isConverterOutputMime(mime) {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ].includes(mime);
}

function renderDriveFiles(files) {
  const list = $('drive-files-list');

  if (!files || files.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="1.5">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <p>No converted files found in Drive yet.</p>
      </div>`;
    return;
  }

  list.innerHTML = '';
  files.forEach(f => {
    const ext = extFromMime(f.mimeType);
    const div = document.createElement('div');
    div.className = 'drive-file-item';
    div.innerHTML = `
      <span class="drive-file-icon">${fileIcon(ext)}</span>
      <span class="drive-file-name">${f.name}</span>
      <span class="drive-file-meta">${f.modifiedTime ? formatDate(f.modifiedTime) : ''}</span>
      ${f.webViewLink ? `<a class="icon-btn" href="${f.webViewLink}" target="_blank" rel="noopener">Open</a>` : ''}`;
    list.appendChild(div);
  });
}

function extFromMime(mime) {
  const map = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/plain': 'txt',
  };
  return map[mime] || 'file';
}
