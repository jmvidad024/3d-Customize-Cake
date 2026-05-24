let currentUser = null;

function isStaffUser() {
  return currentUser && ['admin', 'baker'].includes(currentUser.role);
}

async function loadTemplates() {
  const container = document.getElementById('templatesContainer');
  container.innerHTML = '<div class="loading">Loading templates...</div>';

  try {
    const response = await authFetch('/api/designs?scope=templates');
    const templates = await response.json();

    if (!Array.isArray(templates) || templates.length === 0) {
      container.innerHTML = '<div class="error">No templates available</div>';
      return;
    }

    container.innerHTML = '';
    templates.forEach(template => {
      const card = document.createElement('div');
      card.className = 'template-card';

      const thumbSrc = getTemplateThumbnail(template);

      card.innerHTML = `
        <img src="${thumbSrc}" alt="${template.name}" class="template-image" onerror="this.src='/api/designs/${template.id}/thumbnail'" />
        <div class="template-info">
          <h3>${template.name}</h3>
          <p>${isStaffUser() ? 'Pre-made design - View only' : 'Pre-made design - Ready to book'}</p>
          <div class="template-actions">
            <button class="btn-secondary" data-view-template-id="${template.id}">View 3D</button>
            ${isStaffUser() ? '' : `<button class="btn-primary" data-template-id="${template.id}">Book</button>`}
          </div>
        </div>
      `;

      const viewBtn = card.querySelector('[data-view-template-id]');
      const bookBtn = card.querySelector('[data-template-id]');
      viewBtn.addEventListener('click', () => {
        window.location.href = `/?viewDesign=${template.id}`;
      });
      if (bookBtn) {
        bookBtn.addEventListener('click', () => showBookingModal(template));
      }

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading templates:', error);
    container.innerHTML = '<div class="error">Failed to load templates. Please try again.</div>';
  }
}

let draftAppointment = null;

async function loadDraftAppointment() {
  try {
    const res = await authFetch('/api/appointments/draft');
    if (!res.ok) {
      draftAppointment = null;
      document.getElementById('draftNotice').textContent = '';
      return;
    }
    const data = await res.json();
    draftAppointment = data.draft || null;
    const draftNotice = document.getElementById('draftNotice');
    if (draftAppointment) {
      draftNotice.innerHTML = `You have an unfinished custom cake appointment for <strong>${draftAppointment.date}</strong>. <button class="btn-primary" id="continueDraftBtn">Continue</button>`;
      const continueBtn = document.getElementById('continueDraftBtn');
      if (continueBtn) {
        continueBtn.addEventListener('click', () => {
          window.location.href = '/';
        });
      }
    } else {
      draftNotice.textContent = '';
    }
  } catch (error) {
    console.error('Unable to load draft appointment', error);
  }
}

function getTemplateThumbnail(template) {
  return (window.getCake3DThumbnail && window.getCake3DThumbnail(template))
    || createThreeThumbnail(template)
    || template.thumbnail
    || getDefaultThumbnail(template.name);
}

function createThreeThumbnail(template) {
  if (!window.THREE) return null;

  let renderer = null;
  try {
    const width = 640;
    const height = 400;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2f2a3a);
    scene.fog = new THREE.Fog(0x2f2a3a, 6, 12);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.8, 1.8, 0.15, 64),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.08 })
    );
    plate.position.y = -0.4;
    scene.add(plate);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xfff2d6, 2.2);
    spotLight.position.set(3, 6, 4);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.4;
    spotLight.decay = 1.5;
    spotLight.distance = 20;
    scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0xffd4aa, 1.2);
    rimLight.position.set(-4, 3, -3);
    scene.add(rimLight);

    const layers = getThumbnailLayers(template);
    const layerMeshes = [];
    layers.forEach((layer, index) => {
      const radius = [1.2, 1.0, 0.8][index] || 0.8;
      const layerHeight = 0.5;
      const color = normalizeColor(layer.color, index);
      const cake = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, layerHeight, 32),
        new THREE.MeshStandardMaterial({ color })
      );
      cake.position.y = index * layerHeight;
      scene.add(cake);
      layerMeshes.push(cake);
    });

    addThumbnailToppings(scene, template, layers, layerMeshes);

    const theta = 0;
    const phi = Math.PI / 3;
    const radius = 5;
    camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(0, 0.4, 0);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) object.material.dispose();
    });
    renderer.dispose();
    return dataUrl;
  } catch (error) {
    console.warn('Unable to render 3D template thumbnail:', error);
    if (renderer) renderer.dispose();
    return null;
  }
}

function getThumbnailLayers(template) {
  const layers = template && template.design && Array.isArray(template.design.layers)
    ? template.design.layers
    : [];

  if (layers.length > 0) {
    return layers.slice(0, 3);
  }

  return [
    { color: 'f6deb3' }
  ];
}

function normalizeColor(color, index) {
  const defaults = [0xf6deb3, 0xf2c9ab, 0xffd7dc];
  if (!color) return defaults[index % defaults.length];
  if (typeof color === 'number') return color;
  const clean = String(color).replace('#', '');
  return Number.parseInt(clean, 16) || defaults[index % defaults.length];
}

function addThumbnailToppings(scene, template, layers, layerMeshes) {
  const toppings = template.design && Array.isArray(template.design.toppings)
    ? template.design.toppings
    : [];

  toppings.forEach((topping, index) => {
    const point = getThumbnailToppingPosition(topping, layers.length);
    withSeededRandom(getToppingSeed(topping, index), () => {
      if (topping.type === 'sprinkles') addExactSprinkles(scene, point);
      if (topping.type === 'whippedCream') addExactWhippedCream(scene, point);
      if (topping.type === 'candles') addExactCandles(scene, point);
      if (topping.type === 'chocolateChips') addExactChocolateChips(scene, point, layerMeshes[0]);
      if (topping.type === 'customText') addExactCustomText(scene, point, topping.text);
    });
  });
}

function getThumbnailToppingPosition(toppingData, layerCount) {
  const topY = layerCount * 0.5 - 0.25 + 0.04;
  const position = toppingData && toppingData.position ? toppingData.position : null;
  const hasSavedPosition = position
    && Number.isFinite(Number(position.x))
    && Number.isFinite(Number(position.y))
    && Number.isFinite(Number(position.z));

  if (!hasSavedPosition) return new THREE.Vector3(0, topY, 0);

  const loaded = new THREE.Vector3(Number(position.x), Number(position.y), Number(position.z));
  const isPlaceholderPosition = Math.abs(loaded.x) < 0.001
    && Math.abs(loaded.y) < 0.001
    && Math.abs(loaded.z) < 0.001;

  return isPlaceholderPosition ? new THREE.Vector3(0, topY, 0) : loaded;
}

function addExactSprinkles(scene, point) {
  const normal = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3(1, 0, 0);
  const bitangent = new THREE.Vector3(0, 0, -1);
  const colors = [0xff4f81, 0x5ad0ff, 0xffd84d, 0x7dff7a, 0xffffff];

  for (let i = 0; i < 12; i++) {
    const sprinkle = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.025, 0.09),
      new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.6
      })
    );
    const offsetX = (Math.random() - 0.5) * 0.18;
    const offsetY = (Math.random() - 0.5) * 0.18;
    const offset = tangent.clone().multiplyScalar(offsetX).add(bitangent.clone().multiplyScalar(offsetY));
    sprinkle.position.copy(point).add(offset).add(normal.clone().multiplyScalar(0.02));
    sprinkle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    sprinkle.rotation.y += Math.random() * Math.PI;
    scene.add(sprinkle);
  }
}

function addExactWhippedCream(scene, point) {
  const normal = new THREE.Vector3(0, 1, 0);
  const creamMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0.0 });
  const spherePositions = [
    { pos: [0, 0.12, 0], radius: 0.15 },
    { pos: [0.08, 0.06, 0.06], radius: 0.12 },
    { pos: [-0.08, 0.06, 0.06], radius: 0.12 },
    { pos: [0.06, 0.06, -0.08], radius: 0.12 },
    { pos: [0, 0.02, 0], radius: 0.14 }
  ];

  spherePositions.forEach(({ pos, radius }) => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), creamMaterial);
    sphere.position.copy(point).add(normal.clone().multiplyScalar(0.08)).add(new THREE.Vector3(pos[0], pos[1], pos[2]));
    scene.add(sphere);
  });
}

function addExactCandles(scene, point) {
  const candle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0xfff4d6, roughness: 0.8 })
  );
  candle.position.copy(point);
  candle.position.y += 0.18;
  scene.add(candle);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff5500, emissiveIntensity: 1.5 })
  );
  flame.position.copy(point);
  flame.position.y += 0.4;
  scene.add(flame);
}

function addExactChocolateChips(scene, point, hitObject) {
  const normal = new THREE.Vector3(0, 1, 0);
  const tangent = new THREE.Vector3(1, 0, 0);
  const bitangent = new THREE.Vector3(0, 0, -1);
  let chipColor = 0x4a2b1a;
  if (hitObject && hitObject.material && hitObject.material.color) {
    const cakeColor = new THREE.Color(hitObject.material.color);
    chipColor = cakeColor.getLuminance() > 0.5 ? 0x3d1f0a : 0xc8a882;
  }

  for (let i = 0; i < 15; i++) {
    const chip = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshStandardMaterial({ color: chipColor, roughness: 0.8, metalness: 0.0 })
    );
    const offsetX = (Math.random() - 0.5) * 0.25;
    const offsetY = (Math.random() - 0.5) * 0.25;
    const offset = tangent.clone().multiplyScalar(offsetX).add(bitangent.clone().multiplyScalar(offsetY));
    chip.position.copy(point).add(offset).add(normal.clone().multiplyScalar(0.04));
    scene.add(chip);
  }
}

function addExactCustomText(scene, point, text = 'Happy Cake') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ff4f81';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 0.3),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 1, depthWrite: false })
  );
  plane.position.copy(point);
  plane.position.y += 0.03;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
}

function getToppingSeed(toppingData, index) {
  const position = toppingData && toppingData.position ? toppingData.position : {};
  return `${toppingData.type || 'topping'}-${index}-${position.x || 0}-${position.y || 0}-${position.z || 0}`;
}

function withSeededRandom(seedText, callback) {
  const originalRandom = Math.random;
  let seed = 0;
  for (let i = 0; i < seedText.length; i++) {
    seed = ((seed << 5) - seed + seedText.charCodeAt(i)) >>> 0;
  }
  Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function getDefaultThumbnail(name) {
  const label = (name || 'Cake').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200">
    <rect width="100%" height="100%" fill="#fff7f0"/>
    <text x="50%" y="30" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#333">${label}</text>
    <ellipse cx="160" cy="150" rx="90" ry="18" fill="#e6e6e6"/>
    <ellipse cx="160" cy="130" rx="70" ry="16" fill="#f6deb3"/>
    <ellipse cx="160" cy="112" rx="60" ry="14" fill="#f2c9ab"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function setStatus(status, message, ok = false) {
  status.textContent = message;
  status.style.color = ok ? '#4caf50' : '#ff6b6b';
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getBookingDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 3);
  return {
    min: formatDateForInput(today),
    max: formatDateForInput(maxDate)
  };
}

function applyBookingDateRange(input) {
  const range = getBookingDateRange();
  input.min = range.min;
  input.max = range.max;
}

function isBookingDateInRange(date) {
  const range = getBookingDateRange();
  return date >= range.min && date <= range.max;
}

function getBookingDateRangeText() {
  const range = getBookingDateRange();
  return `Please choose a date from ${range.min} to ${range.max}.`;
}

async function checkAvailability(date, status) {
  if (!date) {
    setStatus(status, 'Please choose a date');
    return;
  }
  if (!isBookingDateInRange(date)) {
    setStatus(status, getBookingDateRangeText());
    return;
  }

  try {
    const res = await authFetch(`/api/appointments/availability?date=${encodeURIComponent(date)}`);
    const data = await res.json();
    if (res.ok) {
      const available = data.available ? 'Available' : 'Full';
      setStatus(status, `${available} - ${data.booked}/${data.capacity} booked on ${date}`, data.available);
    } else {
      setStatus(status, data.error || 'Unable to check availability');
    }
  } catch (e) {
    console.error(e);
    setStatus(status, 'Error checking availability');
  }
}

function showBookingModal(template) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal-content';

  const thumbSrc = getTemplateThumbnail(template);

  modal.innerHTML = `
    <h3>${template.name}</h3>
    <img src="${thumbSrc}" alt="${template.name}" class="modal-image" />
    <p>Select your preferred date for this cake design.</p>
    <input type="date" id="bookingDate" class="date-picker" />
    <div class="status-text" id="bookingStatus"></div>
    <div class="modal-buttons">
      <button class="btn-secondary" id="closeBtn">Close</button>
      <button class="btn-primary" id="checkBtn">Check Availability</button>
      <button class="btn-success" id="bookBtn">Book & Continue</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeBtn = modal.querySelector('#closeBtn');
  const checkBtn = modal.querySelector('#checkBtn');
  const bookBtn = modal.querySelector('#bookBtn');
  const dateInput = modal.querySelector('#bookingDate');
  const status = modal.querySelector('#bookingStatus');
  applyBookingDateRange(dateInput);

  const removeModal = () => {
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
  };

  closeBtn.addEventListener('click', removeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeModal();
  });

  checkBtn.addEventListener('click', () => checkAvailability(dateInput.value, status));

  bookBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    if (!date) {
      setStatus(status, 'Please choose a date');
      return;
    }
    if (!isBookingDateInRange(date)) {
      setStatus(status, getBookingDateRangeText());
      return;
    }

    try {
      const res = await authFetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(status, data.error || 'Booking failed');
        return;
      }

      const appt = data.appointment;
      const attachRes = await authFetch(`/api/appointments/${appt.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ designId: template.id })
      });

      if (!attachRes.ok) {
        setStatus(status, 'Booked but failed to attach design');
        return;
      }

      status.innerHTML = 'Booked! <button class="btn-success" id="payNowBtn">Pay Now</button>';
      status.style.color = '#4caf50';

      const payNowBtn = modal.querySelector('#payNowBtn');
      if (payNowBtn) {
        payNowBtn.addEventListener('click', async () => {
          try {
            const payRes = await authFetch(`/api/appointments/${appt.id}/pay`, { method: 'POST' });
            const payJson = await payRes.json();

            if (payRes.ok) {
              alert('Payment successful! The baker will see your order.');
              localStorage.removeItem('current_appointment');
              removeModal();
              loadTemplates();
            } else {
              alert(payJson.error || 'Payment failed');
            }
          } catch (e) {
            console.error(e);
            alert('Payment error');
          }
        });
      }
    } catch (e) {
      console.error(e);
      setStatus(status, 'Booking error');
    }
  });
}

function showCustomBookingModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal-content';
  modal.innerHTML = `
    <h3>Create Custom Cake</h3>
    <p>Select the date you want for your custom cake appointment.</p>
    <input type="date" id="customBookingDate" class="date-picker" />
    <div class="status-text" id="customBookingStatus"></div>
    <div class="modal-buttons">
      <button class="btn-secondary" id="closeCustomBtn">Cancel</button>
      <button class="btn-primary" id="customCheckBtn">Check Availability</button>
      <button class="btn-success" id="customBookBtn">Book & Continue</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeBtn = modal.querySelector('#closeCustomBtn');
  const checkBtn = modal.querySelector('#customCheckBtn');
  const bookBtn = modal.querySelector('#customBookBtn');
  const dateInput = modal.querySelector('#customBookingDate');
  const status = modal.querySelector('#customBookingStatus');
  applyBookingDateRange(dateInput);

  const removeModal = () => {
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
  };

  closeBtn.addEventListener('click', removeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) removeModal();
  });

  checkBtn.addEventListener('click', () => checkAvailability(dateInput.value, status));

  bookBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    if (!date) {
      setStatus(status, 'Please choose a date');
      return;
    }
    if (!isBookingDateInRange(date)) {
      setStatus(status, getBookingDateRangeText());
      return;
    }

    try {
      const res = await authFetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, status: 'draft' })
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus(status, data.error || 'Booking failed');
        return;
      }

      alert(`Appointment draft created for ${date}. Redirecting to the editor now.`);
      window.location.href = '/';
    } catch (e) {
      console.error(e);
      setStatus(status, 'Booking error');
    }
  });
}

async function handleCreateCustomClick() {
  if (isStaffUser()) {
    alert('Bakers and admins can view templates here. Custom cake creation is for customer appointments.');
    return;
  }
  if (draftAppointment) {
    const continueDraft = confirm(`You have an unfinished custom cake appointment for ${draftAppointment.date}. Continue editing it?\n\nChoose Cancel to start again with a different date.`);
    if (continueDraft) {
      window.location.href = '/';
      return;
    }
  }
  showCustomBookingModal();
}

document.getElementById('createCustomBtn').addEventListener('click', handleCreateCustomClick);

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error(e);
  }
  localStorage.removeItem('cake_token');
  localStorage.removeItem('cake_user');
  window.location.href = '/login';
});

(async () => {
  currentUser = await refreshSession();
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }
  document.getElementById('welcomeText').textContent = `Welcome, ${currentUser.name}!`;
  if (isStaffUser()) {
    const createCustomBtn = document.getElementById('createCustomBtn');
    const draftNotice = document.getElementById('draftNotice');
    createCustomBtn.style.display = 'none';
    draftNotice.textContent = 'Staff view: templates are available for preview only.';
  } else {
    await loadDraftAppointment();
  }
  loadTemplates();
})();
