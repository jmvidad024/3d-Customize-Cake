const user = getCurrentUser();

const isCustomerPage =
  document.getElementById('chatbot-widget') !== null;

if (isCustomerPage && (!user || user.role !== 'customer')) {
  document.getElementById('chatbot-widget')?.remove();
}

const toggle = document.getElementById('chatbot-toggle');
const box = document.getElementById('chatbot-box');
const sendBtn = document.getElementById('chat-send');

if (toggle) {
  toggle.onclick = () => {
    box.classList.toggle('hidden');
  };
}

if (sendBtn) {
  sendBtn.onclick = async () => {
    const message = document.getElementById('chat-input').value;
    const image = document.getElementById('chat-image').files[0];

    const formData = new FormData();
    formData.append('message', message);
    if (image) formData.append('image', image);

    const res = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`
  },
  body: JSON.stringify({
    message
  })
});

    const data = await res.json();
    alert(data.message || 'Sent!');
  };
}