// ─── UI.JS ────────────────────────────────────────────────────────
// Handles: navigation, modals, toast, role visibility, utilities
// Depends on: db (supabase.js)

// ─── TOPBAR DATE ─────────────────────────────────────────────────
document.getElementById('topbarDate').textContent = new Date().toLocaleString('en-PK', {
  dateStyle: 'medium', timeStyle: 'short'
});

// ─── CHART REFS ──────────────────────────────────────────────────
let chartStatus = null, chartCrimes = null;

// ─── NAVIGATION ──────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('currentPageTitle').textContent = page.toUpperCase();
  event.currentTarget.classList.add('active');

  const loaders = {
    dashboard: loadDashboard,
    cases:     loadCases,
    crimes:    loadCrimes,
    suspects:  loadSuspects,
    victims:   loadVictims,
    evidence:  loadEvidence,
    officers:  loadOfficers,
    locations: loadLocations,
    users:     loadUsers,
  };
  if (loaders[page]) loaders[page]();
}

// ─── TOAST ───────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ─── MODAL ───────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('active');
  if (id === 'modalCase')    populateSelect('caseOfficer', 'officers', 'officer_id', 'name');
  if (id === 'modalCrime')   populateSelect('crimeLocation', 'locations', 'location_id', 'city', r => `${r.address}, ${r.city}`);
  if (id === 'modalEvidence') populateSelect('evidenceCase', 'cases', 'case_id', 'title');
  if (id === 'modalOfficer') populateSelect('officerDept', 'departments', 'department_id', 'name');
  if (id === 'modalSuspect') populateSelect('suspectLinkedCase', 'cases', 'case_id', 'title', r => `#${r.case_id} — ${r.title} [${r.status}]`);
  if (id === 'modalVictim')  populateSelect('victimCase', 'cases', 'case_id', 'title');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// ─── POPULATE SELECT ─────────────────────────────────────────────
async function populateSelect(selectId, table, valueField, labelField, labelFn = null) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Loading...</option>';
  const { data } = await db.from(table).select('*');
  sel.innerHTML = '<option value="">Select...</option>';
  (data || []).forEach(r => {
    const opt = document.createElement('option');
    opt.value = r[valueField];
    opt.textContent = labelFn ? labelFn(r) : r[labelField];
    sel.appendChild(opt);
  });
}

// ─── FILTER TABLE ────────────────────────────────────────────────
function filterTable(tbodyId, query) {
  const rows = document.getElementById(tbodyId).querySelectorAll('tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
}

// ─── STATUS BADGE ────────────────────────────────────────────────
function statusBadge(status) {
  const cls = { 'Open': 'badge-open', 'Closed': 'badge-closed', 'Under Review': 'badge-review' };
  return `<span class="badge ${cls[status] || 'badge-red'}">${status}</span>`;
}

// ─── ROLE VISIBILITY ─────────────────────────────────────────────
// Hides all .admin-only elements for viewers
function applyRoleVisibility(role) {
  const els = document.querySelectorAll('.admin-only');
  if (role === 'admin') {
    els.forEach(el => el.style.display = '');
  } else {
    els.forEach(el => el.style.display = 'none');
  }
}

// ─── COLLAPSIBLE SECTIONS ────────────────────────────────────────
let crimeSectionOpen = false;

function toggleCrimeSection() {
  crimeSectionOpen = !crimeSectionOpen;
  document.getElementById('caseCrimeSection').style.display = crimeSectionOpen ? 'block' : 'none';
  document.getElementById('crimeToggleIcon').textContent    = crimeSectionOpen ? '−' : '+';
  if (crimeSectionOpen) populateSelect('caseCrimeLocation', 'locations', 'location_id', 'city', r => `${r.address}, ${r.city}`);
}

let newLocSectionOpen = false;

function toggleNewLocation() {
  newLocSectionOpen = !newLocSectionOpen;
  document.getElementById('newLocationSection').style.display = newLocSectionOpen ? 'block' : 'none';
  document.getElementById('newLocToggleIcon').textContent     = newLocSectionOpen ? '−' : '+';
}

let caseNewLocSectionOpen = false;

function toggleCaseNewLocation() {
  caseNewLocSectionOpen = !caseNewLocSectionOpen;
  document.getElementById('caseNewLocationSection').style.display = caseNewLocSectionOpen ? 'block' : 'none';
  document.getElementById('caseNewLocToggleIcon').textContent     = caseNewLocSectionOpen ? '−' : '+';
}

// ─── GENERIC EDIT MODAL ──────────────────────────────────────────
let currentEdit = null;

function openEditModal(title, fields, saveCallback) {
  currentEdit = { fields, saveCallback };
  const modal = document.getElementById('modalEdit');
  modal.querySelector('h3').textContent = title;
  const container = document.getElementById('editFormFields');
  container.innerHTML = fields.map(f => {
    if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${o.value}" ${o.value == f.value ? 'selected' : ''}>${o.label}</option>`
      ).join('');
      return `<div class="form-group ${f.span || ''}"><label>${f.label}</label><select id="edit_${f.key}">${opts}</select></div>`;
    }
    if (f.type === 'textarea') {
      return `<div class="form-group ${f.span || ''}"><label>${f.label}</label><textarea id="edit_${f.key}">${f.value || ''}</textarea></div>`;
    }
    return `<div class="form-group ${f.span || ''}"><label>${f.label}</label><input type="${f.type || 'text'}" id="edit_${f.key}" value="${f.value || ''}"/></div>`;
  }).join('');
  modal.classList.add('active');
}

async function saveEdit() {
  if (!currentEdit) return;
  await currentEdit.saveCallback();
  document.getElementById('modalEdit').classList.remove('active');
  currentEdit = null;
}
