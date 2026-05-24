// Save/Load functionality for cake designs with owner & thumbnail support

function authFetch(url, options = {}) {
    const headers = Object.assign({}, options.headers || {}, {
        'Content-Type': options.headers && options.headers['Content-Type'] ? options.headers['Content-Type'] : 'application/json'
    });
    const token = localStorage.getItem('cake_token');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, Object.assign({}, options, { headers }));
}

function exportCakeDesign() {
    const design = {
        layers: layers.map((layer, index) => ({
            index: index,
            color: layer.material.color.getHexString(),
            radius: layerRadii[index] || 1.0,
            height: layerHeight
        })),
        toppings: placedToppings
    };
    return design;
}

function generateThumbnail(design) {
    const w = 220, h = 220;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff7f0';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#e6e6e6';
    ctx.beginPath();
    ctx.ellipse(w/2, h - 40, 70, 12, 0, 0, Math.PI*2);
    ctx.fill();

    const layers = design.layers || [];
    const layerHeightPx = 30;
    let baseY = h - 60;
    for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        const color = '#' + (layer.color || 'f6deb3');
        ctx.fillStyle = color;
        const radius = 60 - (i * 10);
        ctx.beginPath();
        ctx.ellipse(w/2, baseY - i * layerHeightPx, radius, 12, 0, 0, Math.PI*2);
        ctx.fill();
    }

    const toppings = design.toppings || [];
    for (let i = 0; i < Math.min(12, toppings.length); i++) {
        const t = toppings[i];
        const x = w/2 + (Math.random() - 0.5) * 80;
        const y = baseY - (layers.length - 1) * layerHeightPx - 6 + (Math.random() - 0.5) * 8;
        ctx.fillStyle = '#ff6b6b';
        if (t.type === 'whippedCream') ctx.fillStyle = '#ffffff';
        if (t.type === 'chocolateChips') ctx.fillStyle = '#4a2b1a';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI*2);
        ctx.fill();
    }

    ctx.fillStyle = '#4d3b50';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((design.name || '').slice(0,20), w/2, 18);

    return c.toDataURL('image/png');
}

function getDesignThumbnail(design) {
    if (design.thumbnail) return design.thumbnail;
    if (design.design) {
        return generateThumbnail({ name: design.name, layers: design.design.layers || [], toppings: design.design.toppings || [] });
    }
    return null;
}

function loadDesignIntoScene(designData) {
    if (!designData || !Array.isArray(designData.layers)) {
        throw new Error('Invalid design data');
    }

    clearAllToppings();
    while (layers.length > 1) removeSelectedLayer();

    designData.layers.forEach((layerData, index) => {
        if (index > 0) addLayer();
        if (layers[index]) {
            const colorValue = parseInt('0x' + layerData.color, 16);
            layers[index].material.color.setHex(colorValue);
        }
    });

    (designData.toppings || []).forEach((toppingData, index) => {
        const position = getLoadedToppingPosition(toppingData);
        withSeededRandom(getToppingSeed(toppingData, index), () => {
            switch (toppingData.type) {
                case 'sprinkles': addSprinkles(position, new THREE.Vector3(0,1,0)); break;
                case 'whippedCream': addWhippedCream(position, new THREE.Vector3(0,1,0)); break;
                case 'candles': addCandles(position, new THREE.Vector3(0,1,0)); break;
                case 'chocolateChips': addChocolateChips(position, new THREE.Vector3(0,1,0), layers[0]); break;
                case 'customText':
                    customTextValue = toppingData.text || 'Happy Cake';
                    addCustomText(position, new THREE.Vector3(0,1,0));
                    break;
            }
        });
    });

    updateCamera();
}

function getLoadedToppingPosition(toppingData) {
    const position = toppingData && toppingData.position ? toppingData.position : null;
    const hasSavedPosition = position
        && Number.isFinite(Number(position.x))
        && Number.isFinite(Number(position.y))
        && Number.isFinite(Number(position.z));

    if (!hasSavedPosition) {
        return new THREE.Vector3(0, getTopY() + 0.04, 0);
    }

    const loaded = new THREE.Vector3(Number(position.x), Number(position.y), Number(position.z));
    const isPlaceholderPosition = Math.abs(loaded.x) < 0.001
        && Math.abs(loaded.y) < 0.001
        && Math.abs(loaded.z) < 0.001;

    return isPlaceholderPosition ? new THREE.Vector3(0, getTopY() + 0.04, 0) : loaded;
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

const saveModal = document.getElementById('saveModal');
const saveBtn = document.getElementById('saveDesignBtn');
const confirmSaveBtn = document.getElementById('confirmSaveBtn');
const designNameInput = document.getElementById('designName');
const backToTemplatesBtn = document.getElementById('backToTemplatesBtn');
const appointmentStatus = document.getElementById('appointmentStatus');

let draftAppointment = null;
const editorParams = new URLSearchParams(window.location.search);
const viewDesignId = editorParams.get('viewDesign');
let currentUser = null;
let templateMode = editorParams.get('templateMode') === '1';

function isViewOnlyMode() {
    return Boolean(viewDesignId);
}

function isTemplateMode() {
    return templateMode && currentUser && ['admin', 'baker'].includes(currentUser.role);
}

async function loadDraftAppointment() {
    try {
        const res = await authFetch('/api/appointments/draft');
        if (!res.ok) {
            draftAppointment = null;
            return null;
        }
        const data = await res.json();
        draftAppointment = data.draft || null;
        return draftAppointment;
    } catch (error) {
        console.error('Unable to fetch draft appointment', error);
        draftAppointment = null;
        return null;
    }
}

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', function() {
        this.closest('.modal').style.display = 'none';
    });
});

window.addEventListener('click', function(event) {
    if (event.target === saveModal) saveModal.style.display = 'none';
});

saveBtn.addEventListener('click', function() {
    if (isViewOnlyMode()) {
        alert('This template is open for viewing only.');
        return;
    }
    if (isTemplateMode()) {
        designNameInput.value = '';
        saveModal.querySelector('h2').textContent = 'Save Pre-made Template';
        confirmSaveBtn.textContent = 'Save Template';
        designNameInput.focus();
        saveModal.style.display = 'block';
        return;
    }
    if (!draftAppointment) {
        alert('⚠️ You need to book a custom cake appointment first. Redirecting to Templates.');
        window.location.href = '/templates.html';
        return;
    }
    designNameInput.value = '';
    designNameInput.focus();
    saveModal.style.display = 'block';
});

confirmSaveBtn.addEventListener('click', async function() {
    if (isViewOnlyMode()) return;
    const designName = designNameInput.value.trim();
    if (!designName) { alert('Please enter a design name'); return; }
    if (isTemplateMode()) {
        await savePremadeTemplate(designName);
        return;
    }
    if (!draftAppointment) {
        alert('Appointment not found. Please book first.');
        window.location.href = '/templates.html';
        return;
    }

    const designData = exportCakeDesign();
    designData.name = designName;
    const thumbnail = generateThumbnail({ name: designName, layers: designData.layers, toppings: designData.toppings });

    try {
        const response = await authFetch('/api/designs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: designName, type: 'custom', design: designData, thumbnail })
        });
        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Error saving design');
            return;
        }
        const result = await response.json();

        const attachRes = await authFetch(`/api/appointments/${draftAppointment.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ designId: result.id, status: 'confirmed' })
        });
        if (!attachRes.ok) {
            const attachError = await attachRes.json().catch(() => ({}));
            alert(attachError.error || 'Design saved, but failed to attach to your appointment. Please contact support.');
            return;
        }

        saveModal.style.display = 'none';
        showPaymentFlow(draftAppointment.id);
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving design');
    }
});

async function savePremadeTemplate(designName) {
    const designData = exportCakeDesign();
    designData.name = designName;
    const thumbnail = generateThumbnail({ name: designName, layers: designData.layers, toppings: designData.toppings });

    try {
        const response = await authFetch('/api/designs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: designName, type: 'premade', design: designData, thumbnail })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            alert(result.error || 'Error saving template');
            return;
        }

        saveModal.style.display = 'none';
        appointmentStatus.textContent = 'Template saved. Customers can now view and book it from Templates.';
        if (confirm('Template saved. Return to the baker dashboard?')) {
            window.location.href = '/baker-dashboard';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error saving template');
    }
}

function showPaymentFlow(apptId) {
    appointmentStatus.innerHTML = `
        ✅ Design saved and attached to your appointment.
        <button id="payNowBtn" class="pay-now-btn">
            Pay Now
        </button>
    `;
    const payNowBtn = document.getElementById('payNowBtn');
    if (payNowBtn) {
        payNowBtn.addEventListener('click', async () => {
            try {
                const payRes = await authFetch(`/api/appointments/${apptId}/pay`, { method: 'POST' });
                const payJson = await payRes.json();
                if (payRes.ok) {
                    alert('✅ Payment successful! Your order is now placed.');
                    window.location.href = '/templates.html';
                } else {
                    alert(payJson.error || 'Payment failed');
                }
            } catch (error) {
                console.error(error);
                alert('Payment error');
            }
        });
    }
}

backToTemplatesBtn.addEventListener('click', () => {
    if (isTemplateMode()) {
        window.location.href = '/baker-dashboard';
        return;
    }
    if (isViewOnlyMode() || confirm('Leave the editor and return to templates?')) {
        window.location.href = '/templates.html';
    }
});

(async function initEditor() {
    currentUser = await refreshSession();
    if (!currentUser) {
        window.location.href = '/login';
        return;
    }

    if (templateMode && !isTemplateMode()) {
        alert('Only bakers and admins can create pre-made templates.');
        window.location.href = '/templates.html';
        return;
    }

    if (isViewOnlyMode()) {
        try {
            const res = await authFetch(`/api/designs/${viewDesignId}`);
            if (!res.ok) {
                alert('Unable to load template preview.');
                window.location.href = '/templates.html';
                return;
            }
            const design = await res.json();
            loadDesignIntoScene(design.design);
            setEditorReadOnly(true, `Viewing ${design.name}. Editing is disabled.`);
            appointmentStatus.textContent = 'Template preview only. Go back to Templates to book or create your own cake.';
        } catch (error) {
            console.error(error);
            alert('Unable to load template preview.');
            window.location.href = '/templates.html';
        }
        return;
    }

    if (isTemplateMode()) {
        saveBtn.textContent = 'Save Template';
        backToTemplatesBtn.textContent = 'Back to Dashboard';
        appointmentStatus.textContent = 'Template mode. Create a pre-made cake design, then save it for customers to book.';
        return;
    }

    const draft = await loadDraftAppointment();
    if (!draft) {
        alert('⚠️ You must book a custom cake appointment before designing. Redirecting to Templates.');
        window.location.href = '/templates.html';
        return;
    }
    appointmentStatus.textContent = `📅 Draft appointment for ${draft.date}. Design your cake, then save and pay.`;
})();

