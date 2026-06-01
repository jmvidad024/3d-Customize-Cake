let currentOrder = null;
let orders = [];

async function initPage() {
  await refreshSession();
  await loadOrders();
}

async function loadOrders() {
  const container = document.getElementById('ordersListContainer');
  container.innerHTML = '<div class="loading">Loading your orders...</div>';

  try {
    const res = await authFetch('/api/appointments/user');
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('Unable to load orders');
    }
    orders = await res.json();
    renderOrdersList();
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="error">Unable to load orders. Please refresh the page.</div>';
  }
}

function renderOrdersList() {
  const container = document.getElementById('ordersListContainer');
  container.innerHTML = '';

  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="empty-message">No orders yet. Book a cake to get started.</div>';
    return;
  }

  orders.forEach(order => {
    const item = document.createElement('div');
    item.className = 'order-list-item';

    const status = getOrderStatus(order);
    const dateText = new Date(order.date).toLocaleDateString();

    item.innerHTML = `
      <div class="order-item-header">
        <h4>${escapeHtml(order.design_name || 'Cake Order')}</h4>
        <span class="order-status-badge ${status.className}">${status.label}</span>
      </div>
      <p class="order-item-date">${dateText}</p>
      <p class="order-item-detail">${escapeHtml(status.message)}</p>
    `;

    item.onclick = () => selectOrder(order);

    if (currentOrder && currentOrder.id === order.id) {
      item.classList.add('active');
    }

    container.appendChild(item);
  });
}

function selectOrder(order) {
  currentOrder = order;
  renderOrdersList();
  renderReportForm();

  if (window.matchMedia('(max-width: 900px)').matches) {
    document.querySelector('.report-form-panel').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

function renderReportForm() {
  if (!currentOrder) return;

  const formPanel = document.getElementById('reportForm');
  const noSelection = document.getElementById('noOrderSelected');

  noSelection.classList.add('hidden');
  formPanel.classList.remove('hidden');

  document.getElementById('reportOrderTitle').textContent = currentOrder.design_name || 'Cake Order';
  document.getElementById('reportOrderDate').textContent = new Date(currentOrder.date).toLocaleDateString();

  const status = getOrderStatus(currentOrder);
  const statusEl = document.getElementById('reportOrderStatus');
  statusEl.textContent = status.label;
  statusEl.className = `status-badge ${status.className}`;

  const designLink = document.getElementById('viewDesignLink');
  if (currentOrder.design_id) {
    designLink.href = `/?viewDesign=${currentOrder.design_id}`;
    designLink.style.display = 'inline-flex';
  } else {
    designLink.style.display = 'none';
  }

  document.getElementById('reportCategory').value = '';
  document.getElementById('reportMessage').value = '';
}

function getOrderStatus(order) {
  if (order.status === 'completed') {
    return {
      label: 'Ready',
      className: 'completed',
      message: 'Your cake is ready and can be picked up.'
    };
  }
  if (order.paid) {
    return {
      label: 'Paid',
      className: 'paid',
      message: 'Payment received. The baker is preparing your cake.'
    };
  }
  return {
    label: 'Pending',
    className: 'pending',
    message: 'Awaiting payment before the baker starts production.'
  };
}

document.getElementById('submitReportForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentOrder) {
    alert('Please select an order first.');
    return;
  }

  const category = document.getElementById('reportCategory').value;
  const message = document.getElementById('reportMessage').value.trim();

  if (!category) {
    alert('Please select an issue category.');
    return;
  }

  if (!message) {
    alert('Please describe the issue.');
    return;
  }

  const submitBtn = document.querySelector('#submitReportForm button[type="submit"]');

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const res = await authFetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `[${category.toUpperCase()}] ${message}`,
        designId: currentOrder.design_id || null
      })
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to submit report');
    }

    alert('Your report has been submitted successfully. The baker will review it soon.');

    document.getElementById('reportCategory').value = '';
    document.getElementById('reportMessage').value = '';
    currentOrder = null;
    renderOrdersList();
    document.getElementById('reportForm').classList.add('hidden');
    document.getElementById('noOrderSelected').classList.remove('hidden');
  } catch (error) {
    console.error(error);
    alert('Error submitting report: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Report';
  }
});

document.getElementById('clearReportBtn').addEventListener('click', () => {
  document.getElementById('reportCategory').value = '';
  document.getElementById('reportMessage').value = '';
});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

initPage();
