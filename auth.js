// ─── AUTH.JS ─────────────────────────────────────────────────────
// Handles: login, logout, session check, role fetching
// Depends on: db (supabase.js)

window.userRole  = null;
window.userEmail = null;

// ─── SHOW / HIDE SCREENS ─────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appShell').style.display    = 'none';
}

function showMainApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display    = 'flex';
}

// ─── SIGN IN ─────────────────────────────────────────────────────
async function signIn() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  const btn      = document.getElementById('loginBtn');

  // Basic validation
  if (!email || !password) {
    errEl.textContent = 'Please enter email and password.';
    errEl.style.display = 'block';
    return;
  }

  // Loading state
  btn.textContent = 'SIGNING IN...';
  btn.disabled    = true;
  errEl.style.display = 'none';

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const role = await getUserRole(data.user.id);
    updateTopbar();
    applyRoleVisibility(role);
    showMainApp();
    loadDashboard();

  } catch (err) {
    errEl.textContent   = 'Invalid email or password. Try again.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'SIGN IN';
    btn.disabled    = false;
  }
}

// ─── SIGN OUT ────────────────────────────────────────────────────
async function signOut() {
  await db.auth.signOut();
  window.userRole  = null;
  window.userEmail = null;
  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
  showLoginScreen();
}

// ─── GET USER ROLE ───────────────────────────────────────────────
async function getUserRole(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single();

  if (error || !data) {
    window.userRole  = 'viewer';
    window.userEmail = '';
    return 'viewer';
  }

  window.userRole  = data.role;
  window.userEmail = data.email;
  return data.role;
}

// ─── UPDATE TOPBAR ───────────────────────────────────────────────
function updateTopbar() {
  const right = document.getElementById('topbarRight');
  const isAdmin = window.userRole === 'admin';
  right.innerHTML = `
    <span style="color:var(--text-dim);font-size:11px;">
      ${window.userEmail}
    </span>
    <span class="badge ${isAdmin ? 'badge-red' : ''}"
      style="${!isAdmin ? 'background:#222;color:#666;' : ''}">
      ${window.userRole}
    </span>
    ${!isAdmin ? '<span style="color:#f1c40f;font-size:11px;">👁 View Only</span>' : ''}
    <button class="btn btn-ghost btn-sm" onclick="signOut()">Logout</button>
  `;
}

// ─── CHECK SESSION ON LOAD ───────────────────────────────────────
async function checkSession() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    const role = await getUserRole(data.session.user.id);
    updateTopbar();
    applyRoleVisibility(role);
    showMainApp();
    loadDashboard();
  } else {
    showLoginScreen();
  }
}

// ─── ALLOW LOGIN WITH ENTER KEY ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPassword')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') signIn();
    });
  document.getElementById('loginEmail')
    ?.addEventListener('keydown', e => {
      if (e.key === 'Enter') signIn();
    });
});

// ─── INIT: CHECK SESSION ON PAGE LOAD ───────────────────────────
checkSession();
