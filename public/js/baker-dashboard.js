let activeOrderTab = 'paid';
let allDesigns = [];

async function loadDashboard() {
  await refreshSession();
  await Promise.all([
    loadDesigns(),
    loadOrders(activeOrderTab)
  ]);
}

async function loadOrders(tab) {
  activeOrderTab = tab;
  const container = document.getElementById('ordersContainer');
  container.innerHTML = '<div class="empty-state"><h2>Loading orders...</h2><p>Please wait.</p></div>';

  try {
    const res = await authFetch(`/api/appointments${getOrderQuery(tab)}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('Unable to load orders');
    }
    const orders = filterOrdersForTab(await res.json(), tab);
    document.getElementById('ordersCount').textContent = orders.length;
    renderOrders(orders, tab);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="empty-state"><h2>Unable to load orders</h2><p>Please refresh and try again.</p></div>';
  }
}

function getOrderQuery(tab) {
  const cacheBust = `_=${Date.now()}`;
  if (tab === 'pending') return `?tab=pending&payment=pending&${cacheBust}`;
  if (tab === 'completed') return `?tab=completed&status=completed&${cacheBust}`;
  return `?tab=paid&payment=paid&${cacheBust}`;
}

function filterOrdersForTab(orders, tab) {
  if (!Array.isArray(orders)) return [];
  if (tab === 'completed') {
    return orders.filter(order => order.status === 'completed');
  }
  if (tab === 'pending') {
    return orders.filter(order => !isPaid(order) && order.status !== 'completed' && order.status !== 'draft');
  }
  return orders.filter(order => isPaid(order) && order.status !== 'completed' && order.status !== 'draft');
}

function isPaid(order) {
  return order.paid === true || order.paid === 1 || order.paid === '1';
}

async function loadDesigns() {
  try {
    const res = await authFetch('/api/designs?mine=true');
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('Unable to load designs');
    }
    allDesigns = await res.json();
    updateDesignStats(allDesigns);
    renderDesigns(allDesigns);
  } catch (error) {
    console.error(error);
    document.getElementById('designsContainer').innerHTML = '<div class="empty-state"><h2>Unable to load designs</h2><p>Please refresh and try again.</p></div>';
  }
}

function updateDesignStats(designs) {
  document.getElementById('templateCount').textContent = designs.filter(d => d.type === 'premade').length;
  document.getElementById('customCount').textContent = designs.filter(d => (d.type || 'custom') === 'custom').length;
}

function renderOrders(orders, tab) {
  const container = document.getElementById('ordersContainer');
  container.innerHTML = '';
  if (!orders || orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><h2>No ${getTabLabel(tab).toLowerCase()} orders</h2><p>${getEmptyOrderText(tab)}</p></div>`;
    return;
  }

  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'dashboard-card order-card';
    const designForThumb = {
      name: order.design_name || 'Custom order',
      thumbnail: order.design_thumbnail,
      design: getOrderDesign(order)
    };
    const thumbSrc = getDashboardThumbnail(designForThumb);
    const thumb = thumbSrc ? `<img src="${thumbSrc}" class="dashboard-thumb" alt="${order.design_name || 'Custom order'}"/>` : '';
    const dateText = new Date(order.date).toLocaleDateString();
    const badgeClass = order.status === 'completed' ? 'completed' : isPaid(order) ? 'paid' : 'pending';

    card.innerHTML = `
      <div class="design-card-header">
        <h3>${order.design_name || 'Custom order'}</h3>
        <span class="design-type-badge ${badgeClass}">${getOrderStatusText(order)}</span>
      </div>
      ${thumb}
      <div class="design-card-info">
        <p>Pickup date: ${dateText}</p>
        <p>Customer: ${getCustomerLabel(order)}</p>
        <p>${getOrderDetailText(order)}</p>
      </div>
      <div class="design-card-actions"></div>
    `;

    const actions = card.querySelector('.design-card-actions');
    if (order.design_id) {
      const previewBtn = document.createElement('button');
      previewBtn.className = 'edit-btn';
      previewBtn.textContent = 'View 3D';
      previewBtn.onclick = () => showOrder3DPreview(order);
      actions.appendChild(previewBtn);
    }

    if (isPaid(order) && order.status !== 'completed') {
      const completeBtn = document.createElement('button');
      completeBtn.className = 'complete-btn';
      completeBtn.textContent = 'Complete';
      completeBtn.onclick = () => completeOrder(order.id);
      actions.appendChild(completeBtn);
    }

    if (!isPaid(order) && order.status !== 'completed') {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.onclick = () => deletePendingOrder(order);
      actions.appendChild(deleteBtn);
    }

    container.appendChild(card);
  });
}

function getTabLabel(tab) {
  if (tab === 'pending') return 'Pending';
  if (tab === 'completed') return 'Completed';
  return 'Paid';
}

function getEmptyOrderText(tab) {
  if (tab === 'pending') return 'Unpaid appointments will appear here.';
  if (tab === 'completed') return 'Finished cakes will appear here after you mark them complete.';
  return 'Paid appointments ready for baking will appear here.';
}

function getOrderStatusText(order) {
  if (order.status === 'completed') return 'Completed';
  return isPaid(order) ? 'Paid' : 'Pending';
}

function getOrderDetailText(order) {
  if (order.status === 'completed') {
    return order.completed_at ? `Ready since ${new Date(order.completed_at).toLocaleString()}` : 'Ready for pickup';
  }
  return isPaid(order) ? 'Ready to bake' : 'Awaiting payment';
}

function getCustomerLabel(order) {
  return order.customer_name || order.customer_email || 'Customer';
}

async function completeOrder(orderId) {
  if (!confirm('Mark this cake as completed and ready for pickup?')) return;

  try {
    const res = await authFetch(`/api/appointments/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error.error || 'Unable to complete order');
      return;
    }

    await loadOrders(activeOrderTab);
  } catch (error) {
    console.error(error);
    alert('Unable to complete order');
  }
}

async function deletePendingOrder(order) {
  const customer = getCustomerLabel(order);
  const name = order.design_name || 'this pending order';
  if (!confirm(`Delete ${name} for ${customer}?`)) return;

  try {
    const res = await authFetch(`/api/appointments/${order.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error.error || 'Unable to delete pending order');
      return;
    }

    await loadOrders(activeOrderTab);
  } catch (error) {
    console.error(error);
    alert('Unable to delete pending order');
  }
}

function renderDesigns(designs) {
  const container = document.getElementById('designsContainer');
  container.innerHTML = '';
  if (!designs || designs.length === 0) {
    container.innerHTML = '<div class="empty-state"><h2>No designs available</h2><p>Use the editor or template list to add designs.</p></div>';
    return;
  }

  designs.forEach(design => {
    const card = document.createElement('div');
    card.className = 'dashboard-card design-card';
    const isPremade = design.type === 'premade';
    const thumbSrc = getDashboardThumbnail(design);
    const thumb = thumbSrc ? `<img src="${thumbSrc}" class="dashboard-thumb" alt="${design.name}"/>` : '';
    const createdDate = new Date(design.createdAt).toLocaleDateString();
    card.innerHTML = `
      <div class="design-card-header">
        <h3>${design.name}</h3>
        <span class="design-type-badge ${isPremade ? 'premade' : ''}">${isPremade ? 'Pre-made' : 'Custom'}</span>
      </div>
      ${thumb}
      <div class="design-card-info">
        <p>${createdDate}</p>
      </div>
      <div class="design-card-actions"></div>
    `;
    const actions = card.querySelector('.design-card-actions');

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'View';
    editBtn.onclick = () => { window.location.href = `/?viewDesign=${design.id}`; };
    actions.appendChild(editBtn);

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = isPremade ? 'Make Custom' : 'Make Template';
    toggleBtn.className = isPremade ? 'custom-btn' : 'premade-btn';
    toggleBtn.onclick = async () => {
      const newType = isPremade ? 'custom' : 'premade';
      const res = await authFetch(`/api/designs/${design.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newType })
      });
      if (res.ok) {
        loadDesigns();
      } else {
        alert('Update failed');
      }
    };
    actions.appendChild(toggleBtn);

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = 'Delete';
    del.onclick = async () => {
      if (!confirm('Delete?')) return;
      const res = await authFetch(`/api/designs/${design.id}`, { method: 'DELETE' });
      if (res.ok) {
        loadDesigns();
      } else {
        alert('Delete failed');
      }
    };
    actions.appendChild(del);

    container.appendChild(card);
  });
}

document.querySelectorAll('.order-tab').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.order-tab').forEach(tab => tab.classList.remove('active'));
    this.classList.add('active');
    loadOrders(this.getAttribute('data-order-tab'));
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(button => button.classList.remove('active'));
    this.classList.add('active');
    const filter = this.getAttribute('data-filter');
    let filtered = allDesigns;
    if (filter === 'custom') filtered = allDesigns.filter(d => (d.type || 'custom') === 'custom');
    if (filter === 'premade') filtered = allDesigns.filter(d => d.type === 'premade');
    renderDesigns(filtered);
  });
});

function getDashboardThumbnail(design) {
  return (window.getCake3DThumbnail && window.getCake3DThumbnail(design))
    || design.thumbnail
    || '';
}

function getOrderDesign(order) {
  return parseDesignData(order.design || order.design_data);
}

function showOrder3DPreview(order) {
  const design = {
    name: order.design_name || 'Custom order',
    thumbnail: order.design_thumbnail,
    design: getOrderDesign(order)
  };

  const overlay = document.createElement('div');
  overlay.className = 'dashboard-preview-overlay';
  overlay.innerHTML = `
    <div class="dashboard-preview-modal">
      <div class="dashboard-preview-header">
        <h3>${design.name}</h3>
        <button class="dashboard-preview-close" aria-label="Close preview">Close</button>
      </div>
      <div class="dashboard-preview-canvas" data-preview-canvas></div>
      <div class="dashboard-preview-actions">
        <button class="edit-btn" data-open-editor>Open Full 3D</button>
      </div>
    </div>
  `;

  let viewer = null;
  const close = () => {
    if (viewer) viewer.dispose();
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
  };
  overlay.querySelector('.dashboard-preview-close').addEventListener('click', close);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) close();
  });
  overlay.querySelector('[data-open-editor]').addEventListener('click', () => {
    window.location.href = `/?viewDesign=${order.design_id}`;
  });
  document.body.appendChild(overlay);

  const canvasHost = overlay.querySelector('[data-preview-canvas]');
  if (window.mountCake3DViewer) {
    viewer = window.mountCake3DViewer(canvasHost, design);
  } else {
    canvasHost.innerHTML = '<div class="empty-state"><h2>3D preview unavailable</h2><p>Open the full editor to inspect this order.</p></div>';
  }
}

function parseDesignData(designData) {
  if (!designData) return null;
  if (typeof designData === 'object') return designData;
  try {
    return JSON.parse(designData);
  } catch (error) {
    console.warn('Unable to parse order design data:', error);
    return null;
  }
}

loadDashboard();
