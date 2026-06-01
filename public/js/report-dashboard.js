let tickets = [];
let selectedTicket = null;

async function loadTickets() {
  const res = await authFetch('/api/chat/admin');
  tickets = await res.json();

  renderTicketList();

  if (selectedTicket) {
    const updated = tickets.find(ticket => ticket.id === selectedTicket.id);
    if (updated) {
      selectedTicket = updated;
      openTicket(updated);
    }
  }
}

function renderTicketList() {
  const container = document.getElementById('ticket-list');
  container.innerHTML = '';

  tickets.forEach(ticket => {
    const div = document.createElement('div');
    div.className = `ticket-item status-${String(ticket.status).toLowerCase()}`;

    const designBadge = ticket.design_name
      ? `<small>${escapeHtml(ticket.design_name)}</small>`
      : '';

    div.innerHTML = `
      <div class="ticket-header">
        <strong>${escapeHtml(ticket.customer_name || 'Customer')}</strong>
        <span class="status-badge">${escapeHtml(ticket.status)}</span>
      </div>
      ${designBadge}
      <p class="ticket-preview">
        ${escapeHtml(ticket.message.slice(0, 60))}${ticket.message.length > 60 ? '...' : ''}
      </p>
    `;

    div.onclick = () => openTicket(ticket);
    container.appendChild(div);
  });

  if (selectedTicket) {
    const activeEl = [...container.children]
      .find(el => el.innerText.includes(selectedTicket.customer_name || 'Customer'));
    if (activeEl) activeEl.classList.add('active');
  }
}

function openTicket(ticket) {
  selectedTicket = ticket;

  document.querySelectorAll('.ticket-item')
    .forEach(el => el.classList.remove('active'));

  const items = document.querySelectorAll('.ticket-item');
  items.forEach(el => {
    if (el.innerText.includes(ticket.customer_name || 'Customer')) {
      el.classList.add('active');
    }
  });

  const view = document.getElementById('ticket-view');
  let designSection = '';
  if (ticket.design_id && ticket.design_name) {
    designSection = `
      <div class="design-info-box">
        <div class="design-info-header">
          <h4>Related Cake Design</h4>
          <span class="design-name">${escapeHtml(ticket.design_name)}</span>
        </div>
        <a href="/?viewDesign=${ticket.design_id}" class="view-design-link" target="_blank">
          View Design
        </a>
      </div>
    `;
  }

  view.innerHTML = `
    <div class="ticket-detail-header">
      <h2>${escapeHtml(ticket.customer_name || 'Customer')}</h2>
      <span class="status-badge large status-${String(ticket.status).toLowerCase()}">
        ${escapeHtml(ticket.status)}
      </span>
    </div>

    <div class="ticket-meta">
      <span>ID: #${ticket.id}</span>
    </div>

    ${designSection}

    <div id="chat-thread">
      <div class="chat-bubble user">
        ${escapeHtml(ticket.message)}
      </div>
    </div>

    <button class="resolve-btn" onclick="resolveTicket(${ticket.id})">
      Mark as Resolved
    </button>
  `;
}

async function resolveTicket(id) {
  await authFetch(`/api/chat/${id}`, {
    method: 'PATCH'
  });

  await loadTickets();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

loadTickets();
