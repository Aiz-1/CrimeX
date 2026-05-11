// â”€â”€â”€ APP.JS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All database operations: load, add, edit, delete for every entity
// Depends on: db (supabase.js), ui functions (ui.js)

// â”€â”€â”€ DASHBOARD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadDashboard() {
  const [cases, suspects, crimes, evidence, officers] = await Promise.all([
    db.from('cases').select('*'),
    db.from('suspects').select('*'),
    db.from('crimes').select('*'),
    db.from('evidence').select('*'),
    db.from('officers').select('*'),
  ]);

  document.getElementById('statCases').textContent    = cases.data?.length    || 0;
  document.getElementById('statOpen').textContent     = cases.data?.filter(c => c.status === 'Open').length || 0;
  document.getElementById('statSuspects').textContent = suspects.data?.length || 0;
  document.getElementById('statCrimes').textContent   = crimes.data?.length   || 0;
  document.getElementById('statEvidence').textContent = evidence.data?.length || 0;
  document.getElementById('statOfficers').textContent = officers.data?.length || 0;

  const { data: recent } = await db.from('cases')
    .select('*, officers(name)')
    .order('date_opened', { ascending: false })
    .limit(5);

  const tbody = document.getElementById('recentCasesBody');
  if (!recent?.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">NO CASES YET</td></tr>';
  } else {
    tbody.innerHTML = recent.map(c => `
      <tr>
        <td><span class="badge badge-red">#${c.case_id}</span></td>
        <td>${c.title}</td>
        <td>${statusBadge(c.status)}</td>
        <td>${c.date_opened || 'â€”'}</td>
        <td>${c.officers?.name || 'â€”'}</td>
      </tr>`).join('');
  }

  // Charts
  const statusCounts = { Open: 0, Closed: 0, 'Under Review': 0 };
  cases.data?.forEach(c => { if (statusCounts[c.status] !== undefined) statusCounts[c.status]++; });

  const crimeCounts = {};
  crimes.data?.forEach(c => { crimeCounts[c.type] = (crimeCounts[c.type] || 0) + 1; });

  if (chartStatus) chartStatus.destroy();
  if (chartCrimes) chartCrimes.destroy();

  chartStatus = new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#2ecc71','#888','#f1c40f'], borderWidth: 0 }]
    },
    options: { plugins: { legend: { labels: { color: '#888', font: { size: 11 } } } } }
  });

  chartCrimes = new Chart(document.getElementById('chartCrimes'), {
    type: 'bar',
    data: {
      labels: Object.keys(crimeCounts),
      datasets: [{ data: Object.values(crimeCounts), backgroundColor: '#c0392b', borderRadius: 3 }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#888' }, grid: { color: '#1a1a1a' } },
        y: { ticks: { color: '#888', stepSize: 1 }, grid: { color: '#2a2a2a' } }
      }
    }
  });
}

// â”€â”€â”€ CASES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadCases() {
  const status = document.getElementById('filterStatus')?.value;
  let query = db.from('cases').select('*, officers(name)').order('case_id', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  const tbody = document.getElementById('casesBody');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">NO CASES FOUND</td></tr>'; return; }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td><span class="badge badge-red">#${c.case_id}</span></td>
      <td>${c.title}</td>
      <td>${statusBadge(c.status)}</td>
      <td>${c.date_opened || 'â€”'}</td>
      <td>${c.officers?.name || 'â€”'}</td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editCase(${c.case_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('cases','case_id',${c.case_id},loadCases)">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addCase() {
  const title      = document.getElementById('caseTitle').value.trim();
  const status     = document.getElementById('caseStatus').value;
  const officer_id = document.getElementById('caseOfficer').value || null;
  if (!title) { toast('Please enter a case title', 'error'); return; }

  const { data: caseData, error: caseErr } = await db.from('cases')
    .insert({ title, status, officer_id }).select('case_id').single();
  if (caseErr) { toast('Error creating case: ' + caseErr.message, 'error'); return; }
  const case_id = caseData.case_id;

  const crimeType = document.getElementById('caseCrimeType').value.trim();
  if (crimeSectionOpen && crimeType) {
    const date_occurred = document.getElementById('caseCrimeDate').value || null;
    let location_id   = document.getElementById('caseCrimeLocation').value || null;

    if (caseNewLocSectionOpen) {
      const city = document.getElementById('caseNewLocCity').value.trim();
      if (city) {
        const address     = document.getElementById('caseNewLocAddress').value.trim();
        const district    = document.getElementById('caseNewLocDistrict').value.trim();
        const postal_code = document.getElementById('caseNewLocPostal').value.trim();
        const { data: locData, error: locErr } = await db.from('locations')
          .insert({ address, city, district, postal_code }).select('location_id').single();
        if (locErr) { toast('Error saving location: ' + locErr.message, 'error'); return; }
        location_id = locData.location_id;
      }
    }

    const description   = document.getElementById('caseCrimeDesc').value.trim();
    const { data: crimeData, error: crimeErr } = await db.from('crimes')
      .insert({ type: crimeType, date_occurred, location_id, description }).select('crime_id').single();
    if (crimeErr) {
      toast('Case created, but crime failed: ' + crimeErr.message, 'error');
    } else {
      const { error: linkErr } = await db.from('case_crimes').insert({ case_id, crime_id: crimeData.crime_id });
      if (linkErr) toast('Case & crime created, but linking failed: ' + linkErr.message, 'error');
      else toast('Case and crime created and linked!');
    }
  } else {
    toast('Case created successfully!');
  }

  closeModal('modalCase');
  document.getElementById('caseTitle').value     = '';
  document.getElementById('caseCrimeType').value = '';
  document.getElementById('caseCrimeDate').value = '';
  document.getElementById('caseCrimeDesc').value = '';
  document.getElementById('caseCrimeLocation').innerHTML = '<option value="">Select location...</option>';
  document.getElementById('caseNewLocAddress').value  = '';
  document.getElementById('caseNewLocCity').value     = '';
  document.getElementById('caseNewLocDistrict').value = '';
  document.getElementById('caseNewLocPostal').value   = '';
  if (caseNewLocSectionOpen) toggleCaseNewLocation();
  if (crimeSectionOpen) toggleCrimeSection();
  loadCases();
}

async function editCase(id) {
  const { data: c } = await db.from('cases').select('*').eq('case_id', id).single();
  const { data: officers } = await db.from('officers').select('officer_id, name');
  if (!c) return;
  openEditModal('Edit Case', [
    { key: 'title', label: 'Title', value: c.title, span: 'span-2' },
    { key: 'status', label: 'Status', type: 'select', value: c.status, options: [{value:'Open',label:'Open'},{value:'Under Review',label:'Under Review'},{value:'Closed',label:'Closed'}] },
    { key: 'officer_id', label: 'Officer', type: 'select', value: c.officer_id || '', options: [{value:'',label:'Select...'},...(officers||[]).map(o=>({value:o.officer_id,label:o.name}))] },
  ], async () => {
    const { error } = await db.from('cases').update({
      title: document.getElementById('edit_title').value,
      status: document.getElementById('edit_status').value,
      officer_id: document.getElementById('edit_officer_id').value || null
    }).eq('case_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Case updated!'); loadCases();
  });
}

// â”€â”€â”€ CRIMES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadCrimes() {
  const { data: crimesData, error: crimesErr } = await db.from('crimes').select('*').order('crime_id', { ascending: false });
  if (crimesErr) { toast('Error loading crimes: ' + crimesErr.message, 'error'); console.error(crimesErr); }
  
  // Fetch locations separately to bypass missing foreign key constraint in Supabase
  const { data: locData } = await db.from('locations').select('location_id, city, district');
  const locMap = {};
  if (locData) {
    locData.forEach(l => { locMap[l.location_id] = l; });
  }

  const tbody = document.getElementById('crimesBody');
  if (!crimesData?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">NO CRIMES RECORDED</td></tr>'; return; }
  
  tbody.innerHTML = crimesData.map(c => {
    const loc = locMap[c.location_id];
    const locStr = loc ? `${loc.city}, ${loc.district}` : 'â€”';
    return `
    <tr>
      <td><span class="badge badge-red">#${c.crime_id}</span></td>
      <td>${c.type}</td>
      <td>${c.description?.slice(0,50) || 'â€”'}${c.description?.length > 50 ? '...' : ''}</td>
      <td>${c.date_occurred || 'â€”'}</td>
      <td>${locStr}</td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editCrime(${c.crime_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('crimes','crime_id',${c.crime_id},loadCrimes)">Delete</button>
      </div></td>
    </tr>`;
  }).join('');
  applyRoleVisibility(window.userRole);
}

async function addCrime() {
  const type         = document.getElementById('crimeType').value.trim();
  const date_occurred = document.getElementById('crimeDate').value || null;
  const description  = document.getElementById('crimeDesc').value.trim();
  if (!type) { toast('Please enter crime type', 'error'); return; }

  let location_id = document.getElementById('crimeLocation').value || null;

  if (newLocSectionOpen) {
    const city = document.getElementById('newLocCity').value.trim();
    if (city) {
      const address     = document.getElementById('newLocAddress').value.trim();
      const district    = document.getElementById('newLocDistrict').value.trim();
      const postal_code = document.getElementById('newLocPostal').value.trim();
      const { data: locData, error: locErr } = await db.from('locations')
        .insert({ address, city, district, postal_code }).select('location_id').single();
      if (locErr) { toast('Error saving location: ' + locErr.message, 'error'); return; }
      location_id = locData.location_id;
      populateSelect('crimeLocation', 'locations', 'location_id', 'city', r => `${r.address}, ${r.city}`);
    }
  }

  const { error } = await db.from('crimes').insert({ type, date_occurred, location_id, description });
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast(location_id ? 'Crime recorded with location!' : 'Crime recorded!');

  closeModal('modalCrime');
  document.getElementById('crimeType').value    = '';
  document.getElementById('crimeDesc').value    = '';
  document.getElementById('newLocAddress').value  = '';
  document.getElementById('newLocCity').value     = '';
  document.getElementById('newLocDistrict').value = '';
  document.getElementById('newLocPostal').value   = '';
  if (newLocSectionOpen) toggleNewLocation();
  loadCrimes();
}

async function editCrime(id) {
  const { data: c } = await db.from('crimes').select('*').eq('crime_id', id).single();
  const { data: locs } = await db.from('locations').select('location_id, address, city');
  if (!c) return;
  openEditModal('Edit Crime', [
    { key: 'type', label: 'Type', value: c.type },
    { key: 'date_occurred', label: 'Date', type: 'date', value: c.date_occurred || '' },
    { key: 'location_id', label: 'Location', type: 'select', value: c.location_id || '', options: [{value:'',label:'Select...'},...(locs||[]).map(l=>({value:l.location_id,label:`${l.address}, ${l.city}`}))] },
    { key: 'description', label: 'Description', type: 'textarea', value: c.description || '', span: 'span-2' },
  ], async () => {
    const { error } = await db.from('crimes').update({
      type: document.getElementById('edit_type').value,
      date_occurred: document.getElementById('edit_date_occurred').value || null,
      location_id: document.getElementById('edit_location_id').value || null,
      description: document.getElementById('edit_description').value
    }).eq('crime_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Crime updated!'); loadCrimes();
  });
}

// â”€â”€â”€ SUSPECTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadSuspects() {
  const { data: suspects } = await db.from('suspects').select('*').order('suspect_id', { ascending: false });
  const { data: links }    = await db.from('case_suspects').select('suspect_id');
  const caseCount = {};
  links?.forEach(l => { caseCount[l.suspect_id] = (caseCount[l.suspect_id] || 0) + 1; });
  const tbody = document.getElementById('suspectsBody');
  if (!suspects?.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">NO SUSPECTS FOUND</td></tr>'; return; }
  tbody.innerHTML = suspects.map(s => `
    <tr>
      <td><span class="badge badge-red">#${s.suspect_id}</span></td>
      <td>${s.name}</td>
      <td>${s.gender || 'â€”'}</td>
      <td>${s.dob || 'â€”'}</td>
      <td>${s.phone || 'â€”'}</td>
      <td><span class="badge ${(caseCount[s.suspect_id]||0) > 1 ? 'badge-review' : 'badge-open'}">${caseCount[s.suspect_id] || 0} cases</span></td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editSuspect(${s.suspect_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('suspects','suspect_id',${s.suspect_id},loadSuspects)">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addSuspect() {
  const name    = document.getElementById('suspectName').value.trim();
  const dob     = document.getElementById('suspectDob').value || null;
  const gender  = document.getElementById('suspectGender').value;
  const phone   = document.getElementById('suspectPhone').value.trim();
  const address = document.getElementById('suspectAddress').value.trim();
  const case_id = document.getElementById('suspectLinkedCase').value || null;
  const role    = document.getElementById('suspectRole').value;
  if (!name) { toast('Please enter suspect name', 'error'); return; }

  let query = db.from('suspects').select('suspect_id').ilike('name', name);
  if (phone) query = query.eq('phone', phone);
  const { data: existing } = await query.limit(1);

  let suspect_id;
  let isNew = false;

  if (existing && existing.length > 0) {
    suspect_id = existing[0].suspect_id;
  } else {
    const { data: suspectData, error: suspectErr } = await db.from('suspects')
      .insert({ name, dob, gender, phone, address }).select('suspect_id').single();
    if (suspectErr) { toast('Error: ' + suspectErr.message, 'error'); return; }
    suspect_id = suspectData.suspect_id;
    isNew = true;
  }

  if (case_id) {
    const { data: existingLink } = await db.from('case_suspects').select('*').eq('case_id', case_id).eq('suspect_id', suspect_id).limit(1);
    if (existingLink && existingLink.length > 0) {
      toast('Suspect is already linked to this case!');
    } else {
      const { error: linkErr } = await db.from('case_suspects').insert({ case_id, suspect_id, role });
      if (linkErr) toast('Linking failed: ' + linkErr.message, 'error');
      else toast(isNew ? 'Suspect added and linked to case!' : 'Existing suspect found and linked to case!');
    }
  } else {
    toast(isNew ? 'Suspect added!' : 'Suspect already exists!');
  }

  closeModal('modalSuspect');
  document.getElementById('suspectName').value = '';
  document.getElementById('suspectDob').value = '';
  document.getElementById('suspectGender').value = '';
  document.getElementById('suspectPhone').value = '';
  document.getElementById('suspectAddress').value = '';
  document.getElementById('suspectLinkedCase').innerHTML = '<option value="">No case â€” add later</option>';
  loadSuspects();
}

async function editSuspect(id) {
  const { data: s } = await db.from('suspects').select('*').eq('suspect_id', id).single();
  if (!s) return;
  openEditModal('Edit Suspect', [
    { key: 'name', label: 'Name', value: s.name, span: 'span-2' },
    { key: 'dob', label: 'DOB', type: 'date', value: s.dob || '' },
    { key: 'gender', label: 'Gender', type: 'select', value: s.gender || '', options: [{value:'',label:'Select...'},{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}] },
    { key: 'phone', label: 'Phone', value: s.phone || '' },
    { key: 'address', label: 'Address', value: s.address || '', span: 'span-2' },
  ], async () => {
    const { error } = await db.from('suspects').update({
      name: document.getElementById('edit_name').value,
      dob: document.getElementById('edit_dob').value || null,
      gender: document.getElementById('edit_gender').value,
      phone: document.getElementById('edit_phone').value,
      address: document.getElementById('edit_address').value
    }).eq('suspect_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Suspect updated!'); loadSuspects();
  });
}

// â”€â”€â”€ VICTIMS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadVictims() {
  const { data } = await db.from('victims').select('*').order('victim_id', { ascending: false });
  const tbody = document.getElementById('victimsBody');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">NO VICTIMS RECORDED</td></tr>'; return; }
  tbody.innerHTML = data.map(v => `
    <tr>
      <td><span class="badge badge-red">#${v.victim_id}</span></td>
      <td>${v.name}</td>
      <td>${v.gender || 'â€”'}</td>
      <td>${v.dob || 'â€”'}</td>
      <td>${v.contact || 'â€”'}</td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editVictim(${v.victim_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('victims','victim_id',${v.victim_id},loadVictims)">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addVictim() {
  const name    = document.getElementById('victimName').value.trim();
  const dob     = document.getElementById('victimDob').value || null;
  const gender  = document.getElementById('victimGender').value;
  const contact = document.getElementById('victimContact').value.trim();
  const case_id = document.getElementById('victimCase').value || null;
  if (!name) { toast('Please enter victim name', 'error'); return; }

  let query = db.from('victims').select('victim_id').ilike('name', name);
  if (contact) query = query.eq('contact', contact);
  const { data: existing } = await query.limit(1);

  let victim_id;
  let isNew = false;

  if (existing && existing.length > 0) {
    victim_id = existing[0].victim_id;
  } else {
    const { data: victimData, error: victimErr } = await db.from('victims')
      .insert({ name, dob, gender, contact }).select('victim_id').single();
    if (victimErr) { toast('Error: ' + victimErr.message, 'error'); return; }
    victim_id = victimData.victim_id;
    isNew = true;
  }

  if (case_id) {
    const { data: existingLink } = await db.from('case_victims').select('*').eq('case_id', case_id).eq('victim_id', victim_id).limit(1);
    if (existingLink && existingLink.length > 0) {
      toast('Victim is already linked to this case!');
    } else {
      const { error: linkErr } = await db.from('case_victims').insert({ case_id, victim_id });
      if (linkErr) toast('Linking failed: ' + linkErr.message, 'error');
      else toast(isNew ? 'Victim recorded and linked to case!' : 'Existing victim found and linked to case!');
    }
  } else {
    toast(isNew ? 'Victim recorded!' : 'Victim already exists!');
  }

  closeModal('modalVictim');
  document.getElementById('victimName').value = '';
  document.getElementById('victimDob').value = '';
  document.getElementById('victimGender').value = '';
  document.getElementById('victimContact').value = '';
  document.getElementById('victimCase').innerHTML = '<option value="">No case â€” add later</option>';
  loadVictims();
}

async function editVictim(id) {
  const { data: v } = await db.from('victims').select('*').eq('victim_id', id).single();
  if (!v) return;
  openEditModal('Edit Victim', [
    { key: 'name', label: 'Name', value: v.name, span: 'span-2' },
    { key: 'dob', label: 'DOB', type: 'date', value: v.dob || '' },
    { key: 'gender', label: 'Gender', type: 'select', value: v.gender || '', options: [{value:'',label:'Select...'},{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}] },
    { key: 'contact', label: 'Contact', value: v.contact || '', span: 'span-2' },
  ], async () => {
    const { error } = await db.from('victims').update({
      name: document.getElementById('edit_name').value,
      dob: document.getElementById('edit_dob').value || null,
      gender: document.getElementById('edit_gender').value,
      contact: document.getElementById('edit_contact').value
    }).eq('victim_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Victim updated!'); loadVictims();
  });
}

// â”€â”€â”€ EVIDENCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadEvidence() {
  const { data } = await db.from('evidence').select('*, cases(title)').order('evidence_id', { ascending: false });
  const tbody = document.getElementById('evidenceBody');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">NO EVIDENCE LOGGED</td></tr>'; return; }
  tbody.innerHTML = data.map(e => `
    <tr>
      <td><span class="badge badge-red">#${e.evidence_id}</span></td>
      <td>${e.type}</td>
      <td>${e.description?.slice(0,60) || 'â€”'}${e.description?.length > 60 ? '...' : ''}</td>
      <td>${e.date_collected || 'â€”'}</td>
      <td>${e.cases?.title || 'â€”'}</td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editEvidence(${e.evidence_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('evidence','evidence_id',${e.evidence_id},loadEvidence)">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addEvidence() {
  const type           = document.getElementById('evidenceType').value.trim();
  const date_collected = document.getElementById('evidenceDate').value || null;
  const case_id        = document.getElementById('evidenceCase').value || null;
  const description    = document.getElementById('evidenceDesc').value.trim();
  if (!type) { toast('Please enter evidence type', 'error'); return; }
  const { error } = await db.from('evidence').insert({ type, date_collected, case_id, description });
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Evidence added! Case status may have updated automatically.');
  closeModal('modalEvidence');
  document.getElementById('evidenceType').value = '';
  document.getElementById('evidenceDesc').value = '';
  loadEvidence();
}

async function editEvidence(id) {
  const { data: e } = await db.from('evidence').select('*').eq('evidence_id', id).single();
  const { data: cases } = await db.from('cases').select('case_id, title');
  if (!e) return;
  openEditModal('Edit Evidence', [
    { key: 'type', label: 'Type', value: e.type },
    { key: 'date_collected', label: 'Date Collected', type: 'date', value: e.date_collected || '' },
    { key: 'case_id', label: 'Case', type: 'select', value: e.case_id || '', options: [{value:'',label:'Select...'},...(cases||[]).map(c=>({value:c.case_id,label:c.title}))], span: 'span-2' },
    { key: 'description', label: 'Description', type: 'textarea', value: e.description || '', span: 'span-2' },
  ], async () => {
    const { error } = await db.from('evidence').update({
      type: document.getElementById('edit_type').value,
      date_collected: document.getElementById('edit_date_collected').value || null,
      case_id: document.getElementById('edit_case_id').value || null,
      description: document.getElementById('edit_description').value
    }).eq('evidence_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Evidence updated!'); loadEvidence();
  });
}

// â”€â”€â”€ OFFICERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadOfficers() {
  const { data } = await db.from('officers').select('*, departments(name)').order('officer_id', { ascending: false });
  const tbody = document.getElementById('officersBody');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">NO OFFICERS REGISTERED</td></tr>'; return; }
  tbody.innerHTML = data.map(o => `
    <tr>
      <td><span class="badge badge-red">#${o.officer_id}</span></td>
      <td>${o.name}</td>
      <td>${o.rank || 'â€”'}</td>
      <td><span class="badge badge-review">${o.badge_number}</span></td>
      <td>${o.departments?.name || 'â€”'}</td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editOfficer(${o.officer_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('officers','officer_id',${o.officer_id},loadOfficers)">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addOfficer() {
  const name          = document.getElementById('officerName').value.trim();
  const rank          = document.getElementById('officerRank').value.trim();
  const badge_number  = document.getElementById('officerBadge').value.trim();
  const department_id = document.getElementById('officerDept').value || null;
  if (!name || !badge_number) { toast('Name and badge number required', 'error'); return; }
  const { error } = await db.from('officers').insert({ name, rank, badge_number, department_id });
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Officer registered!');
  closeModal('modalOfficer');
  document.getElementById('officerName').value  = '';
  document.getElementById('officerBadge').value = '';
  loadOfficers();
}

async function editOfficer(id) {
  const { data: o } = await db.from('officers').select('*').eq('officer_id', id).single();
  const { data: depts } = await db.from('departments').select('department_id, name');
  if (!o) return;
  openEditModal('Edit Officer', [
    { key: 'name', label: 'Name', value: o.name, span: 'span-2' },
    { key: 'rank', label: 'Rank', value: o.rank || '' },
    { key: 'badge_number', label: 'Badge No.', value: o.badge_number || '' },
    { key: 'department_id', label: 'Department', type: 'select', value: o.department_id || '', options: [{value:'',label:'Select...'},...(depts||[]).map(d=>({value:d.department_id,label:d.name}))], span: 'span-2' },
  ], async () => {
    const { error } = await db.from('officers').update({
      name: document.getElementById('edit_name').value,
      rank: document.getElementById('edit_rank').value,
      badge_number: document.getElementById('edit_badge_number').value,
      department_id: document.getElementById('edit_department_id').value || null
    }).eq('officer_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Officer updated!'); loadOfficers();
  });
}

// â”€â”€â”€ LOCATIONS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadLocations() {
  const { data } = await db.from('locations').select('*').order('location_id', { ascending: false });
  const tbody = document.getElementById('locationsBody');
  if (!data?.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">NO LOCATIONS ADDED</td></tr>'; return; }
  tbody.innerHTML = data.map(l => `
    <tr>
      <td><span class="badge badge-red">#${l.location_id}</span></td>
      <td>${l.address || 'â€”'}</td>
      <td>${l.city || 'â€”'}</td>
      <td>${l.district || 'â€”'}</td>
      <td>${l.postal_code || 'â€”'}</td>
      <td><div class="action-btns">
        <button class="btn btn-edit btn-sm admin-only" onclick="editLocation(${l.location_id})">Edit</button>
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteRecord('locations','location_id',${l.location_id},loadLocations)">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addLocation() {
  const address     = document.getElementById('locationAddress').value.trim();
  const city        = document.getElementById('locationCity').value.trim();
  const district    = document.getElementById('locationDistrict').value.trim();
  const postal_code = document.getElementById('locationPostal').value.trim();
  if (!city) { toast('Please enter city', 'error'); return; }
  const { error } = await db.from('locations').insert({ address, city, district, postal_code });
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Location added!');
  closeModal('modalLocation');
  loadLocations();
}

async function editLocation(id) {
  const { data: l } = await db.from('locations').select('*').eq('location_id', id).single();
  if (!l) return;
  openEditModal('Edit Location', [
    { key: 'address', label: 'Address', value: l.address || '', span: 'span-2' },
    { key: 'city', label: 'City', value: l.city || '' },
    { key: 'district', label: 'District', value: l.district || '' },
    { key: 'postal_code', label: 'Postal Code', value: l.postal_code || '' },
  ], async () => {
    const { error } = await db.from('locations').update({
      address: document.getElementById('edit_address').value,
      city: document.getElementById('edit_city').value,
      district: document.getElementById('edit_district').value,
      postal_code: document.getElementById('edit_postal_code').value
    }).eq('location_id', id);
    if (error) { toast('Error: '+error.message,'error'); return; }
    toast('Location updated!'); loadLocations();
  });
}

// â”€â”€â”€ DELETE (generic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function deleteRecord(table, field, id, reloadFn) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  // Handle manual cascading deletes for junction tables and nullable references
  try {
    if (table === 'cases') {
      await db.from('case_crimes').delete().eq('case_id', id);
      await db.from('case_suspects').delete().eq('case_id', id);
      await db.from('case_victims').delete().eq('case_id', id);
      await db.from('evidence').update({ case_id: null }).eq('case_id', id);
    } else if (table === 'crimes') {
      await db.from('case_crimes').delete().eq('crime_id', id);
    } else if (table === 'suspects') {
      await db.from('case_suspects').delete().eq('suspect_id', id);
    } else if (table === 'victims') {
      await db.from('case_victims').delete().eq('victim_id', id);
    } else if (table === 'officers') {
      await db.from('cases').update({ officer_id: null }).eq('officer_id', id);
    } else if (table === 'locations') {
      await db.from('crimes').update({ location_id: null }).eq('location_id', id);
    }
  } catch(e) {
    console.error("Error clearing relations:", e);
  }

  const { error } = await db.from(table).delete().eq(field, id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  toast('Record deleted.');
  reloadFn();
}

// â”€â”€â”€ REPORTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function runReport(view) {
  const container = document.getElementById('reportResult');
  container.innerHTML = '<div class="loading">RUNNING QUERY...</div>';
  const { data, error } = await db.from(view).select('*');
  if (error) { container.innerHTML = `<div class="empty-state">Error: ${error.message}</div>`; return; }
  if (!data?.length) { container.innerHTML = '<div class="empty-state">NO RESULTS FOUND</div>'; return; }
  const cols = Object.keys(data[0]);
  container.innerHTML = `
    <div class="table-card-header"><h3>${view.replace(/_/g,' ').toUpperCase()}</h3></div>
    <table>
      <thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${data.map(row => `<tr>${cols.map(c => `<td>${row[c] ?? 'â€”'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
}

// â”€â”€â”€ USER MANAGEMENT (admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function loadUsers() {
  const { data, error } = await db.from('profiles').select('*');
  const tbody = document.getElementById('usersBody');
  if (error || !data?.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty-state">NO USERS FOUND</td></tr>';
    return;
  }
  tbody.innerHTML = data.map(u => `
    <tr>
      <td>${u.email || '<em style="color:var(--text-dim)">—</em>'}</td>
      <td>
        <select onchange="updateUserRole('${u.id}', this.value)"
          style="background:var(--bg3);border:1px solid var(--border);color:var(--text);
                 padding:5px 10px;border-radius:4px;font-family:var(--mono);font-size:12px;outline:none;">
          <option value="admin"  ${u.role === 'admin'  ? 'selected' : ''}>admin</option>
          <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>viewer</option>
        </select>
      </td>
      <td><div class="action-btns">
        <button class="btn btn-danger btn-sm admin-only" onclick="deleteUser('${u.id}')">Delete</button>
      </div></td>
    </tr>`).join('');
  applyRoleVisibility(window.userRole);
}

async function addNewUser() {
  const email    = document.getElementById('newUserEmail').value.trim();
  const password = document.getElementById('newUserPassword').value.trim();
  const role     = document.getElementById('newUserRole').value;

  if (!email)    { toast('Please enter an email address', 'error'); return; }
  if (!password) { toast('Please enter a temporary password', 'error'); return; }
  if (password.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

  // Create user in Supabase Auth (requires service role key via dbAdmin)
  const { data: authData, error: authError } = await dbAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
      toast('Error: Email already in use', 'error');
    } else {
      toast('Error: ' + authError.message, 'error');
    }
    return;
  }

  const userId = authData.user.id;

  // Insert into profiles table with chosen role
  const { error: profileError } = await db.from('profiles').insert({ id: userId, email, role });
  if (profileError) { toast('Auth created but profile error: ' + profileError.message, 'error'); return; }

  toast('User created and role assigned!');
  closeModal('modalAddUser');
  document.getElementById('newUserEmail').value    = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('newUserRole').value     = 'viewer';
  loadUsers();
}

async function updateUserRole(userId, newRole) {
  const { error } = await db.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) { toast('Error updating role', 'error'); return; }
  toast(`Role updated to ${newRole}!`);
  loadUsers();
}

async function deleteUser(userId) {
  if (!confirm('Are you sure? This cannot be undone.')) return;

  const { error: authError } = await dbAdmin.auth.admin.deleteUser(userId);
  if (authError) { toast('Error deleting user: ' + authError.message, 'error'); return; }

  await db.from('profiles').delete().eq('id', userId);
  toast('User deleted.');
  loadUsers();
}

// â”€â”€â”€ SEED DEPARTMENTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function seedDepartments() {
  const { data } = await db.from('departments').select('department_id').limit(1);
  if (data && data.length > 0) return;
  const depts = [
    { name: 'Homicide' }, { name: 'Narcotics' }, { name: 'Cyber Crime' },
    { name: 'Fraud Investigation' }, { name: 'Traffic' },
    { name: 'Counter Terrorism' }, { name: 'Forensics' }, { name: 'Internal Affairs' }
  ];
  await db.from('departments').insert(depts);
}

// â”€â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
seedDepartments();

