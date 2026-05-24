async function loadDashboard() {
  await refreshSession();
  await Promise.all([
    loadOrders(),
    loadMyDesigns()
  ]);
}

async function loadOrders() {
  const container = document.getElementById('ordersContainer');
  container.innerHTML = '<div class="empty-state"><h2>Loading orders...</h2><p>Please wait.</p></div>';

  try {
    const res = await authFetch('/api/appointments/user');
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      throw new Error('Unable to load orders');
    }
    const orders = await res.json();
    renderOrders(orders);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="empty-state"><h2>Unable to load orders</h2><p>Please refresh or login again.</p></div>';
  }
}

async function loadMyDesigns() {
  try {
    const res = await authFetch('/api/designs?mine=true');
    if (!res.ok) return;
    const designs = await res.json();
    renderDesigns(designs);
  } catch (error) {
    console.error(error);
  }
}

function renderOrders(orders) {
  const container = document.getElementById('ordersContainer');
  container.innerHTML = '';
  if (!orders || orders.length === 0) {
    container.innerHTML = '<div class="empty-state"><h2>No orders yet</h2><p>Your booked cakes will appear here.</p></div>';
    return;
  }

  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'design-card';
    const designForThumb = {
      name: order.design_name || 'Cake order',
      thumbnail: order.design_thumbnail,
      design: parseDesignData(order.design || order.design_data)
    };
    const thumbSrc = getDashboardThumbnail(designForThumb);
    const thumb = thumbSrc ? `<img src="${thumbSrc}" class="dashboard-thumb" alt="${order.design_name || 'Cake order'}"/>` : '';
    const status = getOrderStatus(order);
    const dateText = new Date(order.date).toLocaleDateString();

    card.innerHTML = `
      <div class="design-card-header">
        <h3>${order.design_name || 'Cake order'}</h3>
        <span class="design-type-badge ${status.className}">${status.label}</span>
      </div>
      ${thumb}
      <div class="design-card-info">
        <p>Pickup date: ${dateText}</p>
        <p>${status.message}</p>
      </div>
      <div class="design-card-actions"></div>
    `;

    const actions = card.querySelector('.design-card-actions');
    if (order.design_id) {
      const viewBtn = document.createElement('button');
      viewBtn.className = 'edit-btn';
      viewBtn.textContent = 'View 3D';
      viewBtn.onclick = () => { window.location.href = `/?viewDesign=${order.design_id}`; };
      actions.appendChild(viewBtn);
    }

    container.appendChild(card);
  });
}

function renderDesigns(designs) {
  const container = document.getElementById('designsContainer');
  container.innerHTML = '<div class="section-title">Saved Designs</div>';
  if (!designs || designs.length === 0) return;

  designs.forEach(design => {
    const card = document.createElement('div');
    card.className = 'design-card';
    const thumbSrc = getDashboardThumbnail(design);
    const thumb = thumbSrc ? `<img src="${thumbSrc}" class="dashboard-thumb" alt="${design.name}"/>` : '';
    const createdDate = new Date(design.createdAt).toLocaleDateString();
    card.innerHTML = `
      <div class="design-card-header">
        <h3>${design.name}</h3>
        <span class="design-type-badge ${design.type === 'premade' ? 'premade' : ''}">${design.type === 'premade' ? 'Pre-made' : 'Custom'}</span>
      </div>
      ${thumb}
      <div class="design-card-info"><p>${createdDate}</p></div>
      <div class="design-card-actions"></div>
    `;

    const actions = card.querySelector('.design-card-actions');
    const viewBtn = document.createElement('button');
    viewBtn.className = 'edit-btn';
    viewBtn.textContent = 'View';
    viewBtn.onclick = () => { window.location.href = `/?viewDesign=${design.id}`; };
    actions.appendChild(viewBtn);

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = 'Delete';
    del.onclick = async () => {
      if (!confirm('Delete?')) return;
      const res = await authFetch(`/api/designs/${design.id}`, { method: 'DELETE' });
      if (res.ok) {
        loadMyDesigns();
      } else {
        alert('Delete failed');
      }
    };
    actions.appendChild(del);

    container.appendChild(card);
  });
}

function getOrderStatus(order) {
  if (order.status === 'completed') {
    return {
      label: 'Ready',
      className: 'completed',
      message: 'Your cake is ready and can now be picked up.'
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

function getDashboardThumbnail(design) {
  return (window.getCake3DThumbnail && window.getCake3DThumbnail(design))
    || design.thumbnail
    || '';
}

function parseDesignData(designData) {
  if (!designData) return null;
  if (typeof designData === 'object') return designData;
  try {
    return JSON.parse(designData);
  } catch (error) {
    console.warn('Unable to parse design data:', error);
    return null;
  }
}

loadDashboard();
