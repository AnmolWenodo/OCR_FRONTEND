/* =====================================================
   InvoiceOCR  —  Shared JavaScript
   ===================================================== */

// ── Config ─────────────────────────────────────────────
const CFG = {
  get base() { return (localStorage.getItem('iocrBase') || 'http://localhost:3000').replace(/\/$/, ''); },
  set base(v) { localStorage.setItem('iocrBase', v); }
};

// ── Wenodo external API auth ────────────────────────────
const WENODO_API_KEY = 'Key-34534534534534534534534';
function getWenodoHeaders() {
  return {
    'Authorization': `Basic ${btoa(WENODO_API_KEY + ':')}`,
    'x-api-key': WENODO_API_KEY,
    'Content-Type': 'application/json'
  };
}

// ── HTTP helper — GET body → query params (key fix) ─────
async function api(method, path, body, isForm = false) {
  let url = CFG.base + path;
  const opts = { method, headers: { 'x-request-id': 'ui-' + Date.now() } };

  if (method === 'GET' && body && typeof body === 'object') {
    const params = new URLSearchParams(body).toString();
    url += (url.includes('?') ? '&' : '?') + params;
  } else if (body && !isForm) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  } else if (body) {
    opts.body = body;
  }
  return fetch(url, opts);
}
const apiFetch = api; // alias

// ── Toast ────────────────────────────────────────────────
function toast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const icons = {
    ok:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    err:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
  };
  const cls = type === 'success' ? 'ok' : type === 'error' ? 'err' : type === 'warning' ? 'warn' : type;
  const t = document.createElement('div');
  t.className = 'toast' + (cls ? ' ' + cls : '');
  t.innerHTML = (icons[type] || '') + `<span style="flex:1">${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

// ── JSON syntax highlight ────────────────────────────────
function jsonHL(val) {
  const s = typeof val === 'string' ? val : JSON.stringify(val, null, 2);
  return s
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, m => {
      if (/^"/.test(m)) return /:$/.test(m) ? `<span class="jk">${m}</span>` : `<span class="js">${m}</span>`;
      if (/true|false/.test(m)) return `<span class="jb">${m}</span>`;
      if (/null/.test(m)) return `<span class="jnull">${m}</span>`;
      return `<span class="jn">${m}</span>`;
    });
}

function renderJson(containerId, data, label = 'RESPONSE') {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="json-box"><div class="json-box-header"><span class="json-box-label">${label}</span></div><div class="json-body">${jsonHL(data)}</div></div>`;
}

// ── Badge helpers ─────────────────────────────────────────
function statusBadge(s) {
  if (!s) return '<span class="badge badge-gray">—</span>';
  const sl = String(s).toLowerCase();
  if (['ok','success','validated','ready','uploaded','processed','approved','queued'].includes(sl))
    return `<span class="badge badge-green">${s}</span>`;
  if (['pending','processing','running','checking'].includes(sl))
    return `<span class="badge badge-blue">${s}</span>`;
  if (['error','failed','rejected'].includes(sl))
    return `<span class="badge badge-red">${s}</span>`;
  if (['warn','partial','skipped'].includes(sl))
    return `<span class="badge badge-amber">${s}</span>`;
  return `<span class="badge badge-gray">${s}</span>`;
}

function confPill(c) {
  if (c === null || c === undefined) return '';
  const pct = Math.round(c * 100);
  const cls = c >= .9 ? 'conf-h' : c >= .6 ? 'conf-m' : 'conf-l';
  return `<span class="conf-pill ${cls}">${pct}%</span>`;
}

// ── Normalize invoice fields from any response shape ──────
function extractFields(data) {
  const SKIP = new Set(['id','_id','status','createdAt','updatedAt','fileName','fileUrl',
    'lineItems','pages','__v','message','annotations','trainingAnnotations','record']);
  let src = data?.fields || data?.extractedFields || data?.record?.fields || data;
  if (typeof src !== 'object' || Array.isArray(src)) src = {};
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    if (SKIP.has(k)) continue;
    if (Array.isArray(v) || (typeof v === 'object' && v !== null && 'value' in v))
      out[k] = { value: v?.value ?? '', confidence: v?.confidence ?? null };
    else if (typeof v !== 'object')
      out[k] = { value: String(v ?? ''), confidence: null };
  }
  if (src !== data) {
    for (const [k, v] of Object.entries(data)) {
      if (SKIP.has(k) || out[k]) continue;
      if (typeof v === 'string' || typeof v === 'number')
        out[k] = { value: String(v), confidence: null };
    }
  }
  return out;
}

function resolveId(data) {
  return data?.record?.id || data?.id || data?._id || data?.invoiceId || null;
}

// ── API base input sync ───────────────────────────────────
function initBaseInput() {
  const inp = document.getElementById('baseInput');
  if (!inp) return;
  inp.value = CFG.base;
  inp.addEventListener('change', () => { CFG.base = inp.value.trim(); });
}

// ── API health ping ───────────────────────────────────────
async function pingApi() {
  const dot = document.getElementById('apiDot');
  const txt = document.getElementById('apiStatusTxt');
  if (dot) dot.className = 'api-dot loading';
  if (txt) txt.textContent = 'Checking…';
  try {
    const r = await api('GET', '/health');
    const ok = r.ok;
    if (dot) dot.className = 'api-dot ' + (ok ? 'ok' : 'err');
    if (txt) txt.textContent = ok ? 'Connected' : 'Error ' + r.status;
    if (ok) toast('API is healthy', 'ok');
    else    toast('API returned ' + r.status, 'err');
  } catch {
    if (dot) dot.className = 'api-dot err';
    if (txt) txt.textContent = 'Unreachable';
    toast('API unreachable', 'err');
  }
}

// ── Mark current nav link active ─────────────────────────
function markNav() {
  const page = location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page);
  });
}

// ── Wenodo: Load Customers dropdown ──────────────────────
async function loadCustomers(selectId) {
  selectId = selectId || 'imap-customerId';
  try {
    const r = await fetch('https://testingadminapi.wenodo.com/api/AdminAPI/ADMIN_GET_CUSTOMER', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CUSTOMER_CODE: '', CUSTOMER_NAME: '', ACTIVE: 1, PAGE_NO: 1, PAGE_SIZE: 200 })
    });
    const data = await r.json();
    const dd = document.getElementById(selectId);
    if (!dd) return;
    dd.innerHTML = '<option value="">Select Customer</option>';
    (data.Table || []).forEach(c => {
      dd.innerHTML += `<option value="${c.CUSTOMER_ID}">${c.CUSTOMER_NAME}</option>`;
    });
  } catch (e) { console.warn('loadCustomers failed:', e); }
}

// ── Wenodo: Load Entities for a customer ─────────────────
async function loadEntities(customerId, entitySelectId, branchSelectId) {
  entitySelectId = entitySelectId || 'imap-entityId';
  branchSelectId = branchSelectId || 'imap-branchId';
  const entityDd = document.getElementById(entitySelectId);
  const branchDd = document.getElementById(branchSelectId);
  if (entityDd) entityDd.innerHTML = '<option>Loading…</option>';
  if (branchDd) branchDd.innerHTML = '<option value="">Select Branch</option>';
  if (!customerId) return;
  try {
    const r = await fetch('https://testinghumanresourceapi.wenodo.com/api/HumanResourceAPI/ADMIN_GET_ENTITY_LIST', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ CUSTOMER_ID: customerId })
    });
    const data = await r.json();
    if (!data?.Table) { if (entityDd) entityDd.innerHTML = '<option>No data</option>'; return; }
    if (entityDd) {
      entityDd.innerHTML = '<option value="">Select Entity</option>';
      data.Table.forEach(e => {
        entityDd.innerHTML += `<option value="${e.ENTITY_ID}">${e.ENTITY_NAME}</option>`;
      });
    }
  } catch (e) {
    if (entityDd) entityDd.innerHTML = '<option>Error</option>';
    console.error(e);
  }
}

// ── Wenodo: Load Branches for an entity ──────────────────
async function loadBranches(entityId, branchSelectId) {
  branchSelectId = branchSelectId || 'imap-branchId';
  const dd = document.getElementById(branchSelectId);
  if (dd) dd.innerHTML = '<option>Loading…</option>';
  if (!entityId) return;
  try {
    const r = await fetch('https://testingadminapi.wenodo.com/api/AdminAPI/ADMIN_GET_BRANCH', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ENTITY_ID: entityId, ACTIVE: 1 })
    });
    const data = await r.json();
    if (dd) {
      dd.innerHTML = '<option value="">Select Branch</option>';
      (data.Table || []).forEach(b => {
        dd.innerHTML += `<option value="${b.BRANCH_ID}">${b.LOCATION_NAME}</option>`;
      });
    }
  } catch (e) {
    if (dd) dd.innerHTML = '<option>Error</option>';
    console.error(e);
  }
}

// ── IMAP: Fetch config from server ────────────────────────
async function getImapConfig() {
  const area = document.getElementById('imapConfigResult');
  const cid  = parseInt(document.getElementById('imap-customerId')?.value || 0);
  const eid  = parseInt(document.getElementById('imap-entityId')?.value   || 0);
  const bid  = parseInt(document.getElementById('imap-branchId')?.value   || 0);
  if (!cid) return;
  try {
    const r    = await api('POST', '/api/emails/get-imap-config', { customerId: cid, entityId: eid, branchId: bid });
    const resp = await r.json();
    if (r.ok && resp.success && resp.data?.length > 0) {
      const first = resp.data[0];
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
      set('imap-username', first.IMAP_USER);
      set('imap-password', first.IMAP_PASSWORD);
      set('imap-host',     first.IMAP_HOST || 'imap.gmail.com');
      set('imap-port',     first.IMAP_PORT || 993);
      set('to_alias',      first.TO_ALIAS);
      const cb = document.getElementById('imap-isRunning');
      if (cb) cb.checked = !!first.IS_RUNNING;

      if (area) {
        area.innerHTML = `<div class="card" style="margin-top:12px;">
          <div class="card-header"><div class="card-title">Live Server Accounts (${resp.data.length})</div></div>
          <div class="card-body" style="background:#f8f9fa;">
            ${resp.data.map(cfg => `
              <div class="config-entry-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid var(--c-border);padding-bottom:8px;">
                  <span style="font-weight:700;color:var(--c-blue);font-size:14px;">${cfg.IMAP_USER}</span>
                </div>
                <div class="prop-grid">
                  <div class="prop-row"><span class="prop-label">Host</span><span class="prop-value">${cfg.IMAP_HOST}:${cfg.IMAP_PORT}</span></div>
                  <div class="prop-row"><span class="prop-label">Type</span><span class="prop-value">${cfg.IMAP_TYPE==1?'Invoices':cfg.IMAP_TYPE==2?'Statements':'Expenses'}</span></div>
                  <div class="prop-row"><span class="prop-label">Customer</span><span class="prop-value">${cfg.CUSTOMER_NAME||'—'}</span></div>
                  <div class="prop-row"><span class="prop-label">Entity</span><span class="prop-value">${cfg.ENTITY_NAME||'—'}</span></div>
                  <div class="prop-row"><span class="prop-label">Branch</span><span class="prop-value">${cfg.BRANCH_NAME||'—'}</span></div>
                  <div class="prop-row"><span class="prop-label">TO Alias</span><span class="prop-value">${cfg.TO_ALIAS||'—'}</span></div>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
      }
      toast('Configurations synchronized', 'ok');
    } else {
      if (area) area.innerHTML = '';
      toast('No config found for these IDs', 'warn');
    }
  } catch (e) {
    console.error(e);
    toast('Error fetching IMAP config', 'err');
  }
}

// ── IMAP: Save config ─────────────────────────────────────
async function saveImapConfig() {
  const btn = document.getElementById('saveImapBtn');
  const get = id => document.getElementById(id);
  const payload = {
    username:   get('imap-username')?.value.trim(),
    password:   get('imap-password')?.value.trim(),
    host:       get('imap-host')?.value.trim(),
    port:       parseInt(get('imap-port')?.value),
    imapType:   get('imap-type')?.value,
    IS_RUNNING: get('imap-isRunning')?.checked || false,
    customerId: parseInt(get('imap-customerId')?.value || 0),
    entityId:   parseInt(get('imap-entityId')?.value   || 0),
    branchId:   parseInt(get('imap-branchId')?.value   || 0),
    userId:     0,
    to_alias:   get('to_alias')?.value.trim(),
  };
  if (btn) btn.disabled = true;
  try {
    const r    = await api('POST', '/api/emails/imap-config', payload);
    const data = await r.json();
    if (r.ok || (data.message?.includes('Already exists'))) {
      toast('IMAP Settings Saved', 'ok');
    } else {
      toast('Failed to save: ' + (data.message || r.status), 'err');
    }
    const area = document.getElementById('imapConfigResult');
    if (area) area.innerHTML += `<div class="card" style="margin-top:12px;"><div class="card-body" style="padding:0;"><div class="json-box"><div class="json-body">${jsonHL(data)}</div></div></div></div>`;
  } catch (e) {
    toast('Connection Error: ' + e.message, 'err');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Shared sidebar HTML ───────────────────────────────────
const SIDEBAR_HTML = `
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="brand-mark">
      <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5z"/><line x1="8" y1="13" x2="16" y2="13" stroke="#fff" stroke-width="1.5"/><line x1="8" y1="16" x2="13" y2="16" stroke="#fff" stroke-width="1.5"/></svg>
    </div>
    <div>
      <div class="logo-text">InvoiceOCR</div>
      <div class="logo-sub">Document Intelligence</div>
    </div>
  </div>

  <div class="nav-section">
    <div class="nav-section-label">Main</div>
    <a class="nav-link" href="index.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      Dashboard
    </a>
    <a class="nav-link" href="analyze.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Analyze Invoice
    </a>
    <a class="nav-link" href="invoices.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Invoices
    </a>
    <a class="nav-link" href="validate.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      Validate
    </a>
    <a class="nav-link" href="emails.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
      Emails
    </a>
    <a class="nav-link" href="feedback.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Feedback
    </a>
    <a class="nav-link" href="settings.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      Settings
    </a>
  </div>

  <div class="nav-section">
    <div class="nav-section-label">Training</div>
    <a class="nav-link" href="dataset.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
      Dataset
    </a>
    <a class="nav-link" href="training.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      Build Model
    </a>
    <a class="nav-link" href="models.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      Models
    </a>
  </div>

  <div class="sidebar-footer">
    <div class="api-box">
      <label>API Endpoint</label>
      <input id="baseInput" placeholder="http://localhost:3000" />
      <div class="api-status-row">
        <div class="api-dot" id="apiDot"></div>
        <span class="api-status-text" id="apiStatusTxt">Not checked</span>
        <button class="ping-btn" onclick="pingApi()">Ping</button>
      </div>
    </div>
  </div>
</aside>
<div id="toast-container"></div>
`;

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const mc = document.querySelector('.main-content');
  if (mc) mc.insertAdjacentHTML('beforebegin', SIDEBAR_HTML);
  initBaseInput();
  markNav();
});
