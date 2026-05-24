const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');

function switchTab(tab) {
  loginTab.classList.toggle('active', tab === 'login');
  registerTab.classList.toggle('active', tab === 'register');
  loginForm.classList.toggle('active', tab === 'login');
  registerForm.classList.toggle('active', tab === 'register');
}

loginTab.addEventListener('click', () => switchTab('login'));
registerTab.addEventListener('click', () => switchTab('register'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Login failed');
    return;
  }
  setSession(data.user, data.token);
  if (['admin', 'baker'].includes(data.user.role)) {
    window.location.href = '/baker-dashboard';
  } else {
    window.location.href = '/templates.html';
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Registration failed');
    return;
  }
  setSession(data.user, data.token);
  window.location.href = '/templates.html';
});
