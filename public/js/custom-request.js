// Check authentication
const user = getCurrentUser();
if (!user || user.role !== 'customer') {
  window.location.href = '/login';
}

// DOM Elements
const form = document.getElementById('customRequestForm');
const uploadZone = document.getElementById('uploadZone');
const cakeImageInput = document.getElementById('cakeImage');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const changeImageBtn = document.getElementById('changeImageBtn');
const servingSizeSelect = document.getElementById('servingSize');
const deliveryTypeSelect = document.getElementById('deliveryType');
const deliveryAddressGroup = document.getElementById('deliveryAddressGroup');
const successMessage = document.getElementById('successMessage');
const newRequestBtn = document.getElementById('newRequestBtn');
const resetBtn = document.getElementById('resetBtn');
const submitBtn = form.querySelector('.btn-submit');

updateAuthUI(user);

const CUSTOM_BASE_PRICE_PHP = 1500;
const DELIVERY_FEE_PHP = 250;
const SIZE_PRICES_PHP = {
  6: 0,
  12: 500,
  20: 1000,
  30: 1800
};

function formatPeso(amount) {
  return `PHP ${Number(amount || 0).toLocaleString('en-PH')}`;
}

// Set minimum date to today
document.getElementById('pickupDate').min = new Date().toISOString().split('T')[0];

// Upload Zone Drag & Drop
uploadZone.addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  cakeImageInput.click();
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    cakeImageInput.files = files;
    handleImageUpload();
  }
});

cakeImageInput.addEventListener('change', handleImageUpload);

function handleImageUpload() {
  const file = cakeImageInput.files[0];
  
  if (file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      cakeImageInput.value = '';
      return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10MB.');
      cakeImageInput.value = '';
      return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      imagePreview.classList.remove('hidden');
      uploadZone.classList.add('has-preview');
    };
    reader.readAsDataURL(file);
  }
}

changeImageBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  cakeImageInput.click();
});

// Delivery Type Toggle
deliveryTypeSelect.addEventListener('change', (e) => {
  if (e.target.value === 'delivery') {
    deliveryAddressGroup.classList.remove('hidden');
    document.getElementById('deliveryAddress').required = true;
  } else {
    deliveryAddressGroup.classList.add('hidden');
    document.getElementById('deliveryAddress').required = false;
  }
});

// Price Calculator
function updatePrice() {
  const basePrice = CUSTOM_BASE_PRICE_PHP;
  let sizePrice = 0;
  let deliveryPrice = 0;

  // Size pricing
  const sizeValue = servingSizeSelect.value;
  sizePrice = SIZE_PRICES_PHP[sizeValue] || 0;

  // Delivery pricing
  const deliveryType = deliveryTypeSelect.value;
  if (deliveryType && deliveryType !== 'pickup') deliveryPrice = DELIVERY_FEE_PHP;

  const total = basePrice + sizePrice + deliveryPrice;

  // Update display
  document.getElementById('sizePrice').textContent = sizePrice > 0 ? `+${formatPeso(sizePrice)}` : '+PHP 0';
  document.getElementById('deliveryPrice').textContent = deliveryPrice > 0 ? `+${formatPeso(deliveryPrice)}` : '+PHP 0';
  document.getElementById('totalPrice').textContent = formatPeso(total);
}

servingSizeSelect.addEventListener('change', updatePrice);
deliveryTypeSelect.addEventListener('change', updatePrice);

// Form Submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate image
  if (!cakeImageInput.files.length) {
    alert('Please upload a cake image');
    return;
  }

  // Create FormData
  const formData = new FormData();
  formData.append('image', cakeImageInput.files[0]);
  formData.append('name', document.getElementById('cakeName').value);
  formData.append('occasion', document.getElementById('occasion').value);
  formData.append('servingSize', document.getElementById('servingSize').value);
  formData.append('flavor', document.getElementById('flavorChoice').value);
  formData.append('dietary', document.getElementById('dietaryNeeds').value);
  formData.append('description', document.getElementById('description').value);
  formData.append('specialRequests', document.getElementById('specialRequests').value);
  formData.append('pickupDate', document.getElementById('pickupDate').value);
  formData.append('deliveryType', document.getElementById('deliveryType').value);
  formData.append('deliveryAddress', document.getElementById('deliveryAddress').value);

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Submit request
    const response = await fetch('/api/custom-request', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(async () => ({ error: await response.text() }));
      throw new Error(error.details || error.error || 'Unable to submit request');
    }

    const data = await response.json();

    // Show success message
    successMessage.classList.remove('hidden');
    form.style.display = 'none';

  } catch (error) {
    console.error('Error submitting request:', error);
    alert('Error submitting request: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Design Request';
  }
});

// Success Actions
newRequestBtn.addEventListener('click', () => {
  form.reset();
  imagePreview.classList.add('hidden');
  uploadZone.classList.remove('has-preview');
  cakeImageInput.value = '';
  successMessage.classList.add('hidden');
  form.style.display = '';
  window.scrollTo(0, 0);
  updatePrice();
});

resetBtn.addEventListener('click', () => {
  imagePreview.classList.add('hidden');
  uploadZone.classList.remove('has-preview');
  cakeImageInput.value = '';
  setTimeout(updatePrice, 0);
});

// Initialize
updatePrice();
