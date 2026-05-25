let tickets = [];
let selectedTicket = null;

async function loadTickets() {
  const res = await authFetch('/api/chat/admin');
  tickets = await res.json();

  renderTicketList();

  // 🔥 refresh right panel safely
  if (selectedTicket) {
    const updated = tickets.find(t => t.id === selectedTicket.id);

    if (updated) {
      selectedTicket = updated;
      openTicket(updated); // 👈 no DOM element dependency
    }
  }
}

function renderTicketList() {
  const container = document.getElementById('ticket-list');
  container.innerHTML = '';

  tickets.forEach(ticket => {
    const div = document.createElement('div');

    div.className = `ticket-item status-${ticket.status.toLowerCase()}`;

    div.innerHTML = `
      <div class="ticket-header">
        <strong>${ticket.customer_name}</strong>
        <span class="status-badge">${ticket.status}</span>
      </div>

      <p class="ticket-preview">
        ${ticket.message.slice(0, 60)}${ticket.message.length > 60 ? '...' : ''}
      </p>
    `;

    div.onclick = () => openTicket(ticket);

    container.appendChild(div);
  });

  // 🔥 restore active highlight after re-render
  if (selectedTicket) {
    const activeEl = [...container.children]
      .find(el => el.innerHTML.includes(selectedTicket.customer_name));

    if (activeEl) activeEl.classList.add('active');
  }
}

function openTicket(ticket) {
  selectedTicket = ticket;

  document.querySelectorAll('.ticket-item')
    .forEach(el => el.classList.remove('active'));

  // highlight selected (safe)
  const items = document.querySelectorAll('.ticket-item');
  items.forEach(el => {
    if (el.innerText.includes(ticket.customer_name)) {
      el.classList.add('active');
    }
  });

  const view = document.getElementById('ticket-view');

  view.innerHTML = `
    <div class="ticket-detail-header">
      <h2>${ticket.customer_name}</h2>

      <span class="status-badge large status-${ticket.status.toLowerCase()}">
        ${ticket.status}
      </span>
    </div>

    <div class="ticket-meta">
      <span>ID: #${ticket.id}</span>
    </div>

    <div id="chat-thread">
      <div class="chat-bubble user">
        ${ticket.message}
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

  await loadTickets(); // 🔥 wait ensures sync
}

loadTickets();