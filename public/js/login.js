const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');

const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');

function switchTab(tab) {
  loginTab.classList.toggle('active', tab === 'login');
  registerTab.classList.toggle('active', tab === 'register');

  loginForm.classList.toggle('active', tab === 'login');
  registerForm.classList.toggle('active', tab === 'register');
}

loginTab.addEventListener('click', () => switchTab('login'));
registerTab.addEventListener('click', () => switchTab('register'));

/**
 * LOGIN
 */
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Prevent spam clicking
  if (loginButton.disabled) return;

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
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
      window.location.href = '/templates';
    }

  } catch (err) {
    console.error('Login error:', err);

    alert('Something went wrong');

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Login';
  }
});

/**
 * REGISTER
 */
registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Prevent spam clicking
  if (registerButton.disabled) return;

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();

  try {
    registerButton.disabled = true;
    registerButton.textContent = 'Registering...';

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Registration failed');
      return;
    }

    setSession(data.user, data.token);

    window.location.href = '/templates';

  } catch (err) {
    console.error('Register error:', err);

    alert('Something went wrong');

  } finally {
    registerButton.disabled = false;
    registerButton.textContent = 'Register';
  }
});