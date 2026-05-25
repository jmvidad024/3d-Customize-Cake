let logoutBound = false;

function getToken() {
  return localStorage.getItem('cake_token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('cake_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function setSession(user, token) {
  localStorage.setItem('cake_token', token);
  localStorage.setItem('cake_user', JSON.stringify(user));
  try {
    document.cookie = `cake_token=${token}; path=/`;
  } catch (e) {
    // ignore
  }
}

function clearSession() {
  localStorage.removeItem('cake_token');
  localStorage.removeItem('cake_user');
  try {
    document.cookie = 'cake_token=; Max-Age=0; path=/';
  } catch (e) {
    // ignore
  }
}

function authFetch(url, options = {}) {
  const token = getToken();
  const headers = Object.assign({}, options.headers || {});
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, Object.assign({}, options, { headers }));
}

async function requireAuthPage(defaultRedirect = '/login') {
  const token = getToken();
  if (!token) {
    window.location.href = defaultRedirect;
    return null;
  }
  const user = getCurrentUser();
  updateAuthUI(user);
  return user;
}

async function refreshSession() {
  const token = getToken();
  if (!token) {
    return null;
  }
  const res = await authFetch('/api/users/me');
  if (!res.ok) {
    clearSession();
    return null;
  }
  const user = await res.json();
  setSession(user, token);
  updateAuthUI(user);
  return user;
}

function updateAuthUI(user) {
  if (!user) {
    return;
  }
  const welcomeText = document.getElementById('welcomeText');
  if (welcomeText) {
    welcomeText.textContent = `Welcome, ${user.name} (${user.role})`;
  }
  const profileInitial = document.getElementById('profileInitial');
  if (profileInitial) {
    profileInitial.textContent = (user.name || 'C').trim().charAt(0).toUpperCase();
  }
  const bakerLink = document.getElementById('bakerDashboardLink');
  if (bakerLink) {
    bakerLink.style.display = ['baker', 'admin'].includes(user.role) ? 'inline-flex' : 'none';
  }
  const reportLink = document.getElementById('chatbotDashboardLink');
  if (reportLink) {
    reportLink.style.display = ['baker', 'admin'].includes(user.role) ? 'inline-flex' : 'none';
  }
  const userLink = document.getElementById('userDashboardLink');
  if (userLink) {
    userLink.style.display = 'inline-flex';
  }
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await authFetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {
        // ignore errors
      }
      clearSession();
      window.location.href = '/login';
    });
  }
  bindLogout();
  initProfileMenu();
}

function initProfileMenu() {
  const profileMenuBtn = document.getElementById('profileMenuBtn');
  const profileMenu = document.getElementById('profileMenu');
  if (!profileMenuBtn || !profileMenu) return;

  // prevent duplicate binding
  if (profileMenuBtn.dataset.menuReady === 'true') return;
  profileMenuBtn.dataset.menuReady = 'true';

  profileMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // IMPORTANT FIX
    const isOpen = !profileMenu.hidden;
    profileMenu.hidden = isOpen;
    profileMenuBtn.setAttribute('aria-expanded', String(!isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!profileMenu.hidden && !event.target.closest('.profile-menu')) {
      profileMenu.hidden = true;
      profileMenuBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

function bindLogout() {
  if (logoutBound) return;
  logoutBound = true;

  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}

    clearSession();
    window.location.href = '/login';
  });
}