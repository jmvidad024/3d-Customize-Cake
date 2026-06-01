// Basic Three.js setup for 3D Cake Customizer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2f2a3a);
scene.fog = new THREE.Fog(0x2f2a3a, 6, 12);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.cursor = 'grab';
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('container').appendChild(renderer.domElement);



const plateGeometry = new THREE.CylinderGeometry(1.8, 1.8, 0.15, 64);

const plateMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.08
});

const plate = new THREE.Mesh(plateGeometry, plateMaterial);

plate.position.y = -0.4;

scene.add(plate);

// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

// Warm spotlight
const spotLight = new THREE.SpotLight(0xfff2d6, 2.2);
spotLight.position.set(3, 6, 4);

spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.4;
spotLight.decay = 1.5;
spotLight.distance = 20;

scene.add(spotLight);

// Rim light
const rimLight = new THREE.DirectionalLight(0xffd4aa, 1.2);
rimLight.position.set(-4, 3, -3);

scene.add(rimLight);

// Add a cylinder as cake
const layers = [];
const layerHeight = 0.5;
const layerRadii = [1.2, 1.0, 0.8];
let selectedLayer = 0;

function addLayer() {
    if (layers.length >= layerRadii.length) return;
    const radius = layerRadii[layers.length];
    const geometry = new THREE.CylinderGeometry(radius, radius, layerHeight, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0xf6deb3 }); // Default to Vanilla
    const layer = new THREE.Mesh(geometry, material);
    layer.position.y = layers.length * layerHeight;
    scene.add(layer);
    layers.push(layer);
    updateLayerButtons();
}

function disposeObject(obj) {
    if (!obj) return;
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
        } else {
            obj.material.dispose();
        }
    }
}

function updateLayerButtons() {
    document.querySelectorAll('.layerBtn').forEach((btn, index) => {
        if (index < layers.length) {
            btn.disabled = false;
            btn.style.display = 'inline-flex';
        } else {
            btn.disabled = true;
            btn.style.display = 'none';
        }
        btn.classList.toggle('active', index === selectedLayer);
    });
    const addBtn = document.getElementById('addLayerBtn');
    const removeBtn = document.getElementById('removeLayerBtn');
    if (addBtn) addBtn.disabled = layers.length >= 3;
    if (removeBtn) removeBtn.disabled = layers.length <= 1;
}

function removeSelectedLayer() {
    if (layers.length <= 1) return;
    if (selectedLayer < 0 || selectedLayer >= layers.length) {
        selectedLayer = layers.length - 1;
    }
    const layer = layers.splice(selectedLayer, 1)[0];
    scene.remove(layer);
    disposeObject(layer);
    for (let i = 0; i < layers.length; i++) {
        layers[i].position.y = i * layerHeight;
    }
    selectedLayer = Math.min(selectedLayer, layers.length - 1);
    updateLayerButtons();
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = `Layer removed. Selected Layer ${selectedLayer + 1}.`;
}

// Start with 1 layer
addLayer();

const placedToppings = [];
const toppings = []; // To keep track of topping meshes
const toppingActions = [];
let activeToppingType = null;
let activeToppingPreview = null;
let customTextValue = '';
let isPainting = false;
let lastPaintPosition = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function isTopSurface(normal) {
    return normal.y > 0.8;
}

function getTopY() {
    return layers.length * layerHeight - layerHeight / 2;
}

function getPlacementHit(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(layers, false);
    if (!intersects.length) return null;
    const hit = intersects[0];
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
    return { point: hit.point, normal };
}

function alignPreviewToNormal(group, normal) {
    if (!group) return;
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, normal);
    group.setRotationFromQuaternion(q);
}

function createToppingPreview(type) {
    if (activeToppingPreview) {
        scene.remove(activeToppingPreview);
    }
    activeToppingType = type;
    renderer.domElement.style.cursor = 'crosshair';
    activeToppingPreview = new THREE.Group();
    if (type === 'customText') {
        const previewText = customTextValue || 'Text';
        const preview = createTextPlane(previewText, 0.5);
        activeToppingPreview.add(preview);
    } else {
        const previewMaterial = new THREE.MeshStandardMaterial({color: 0x999999, opacity: 0.5, transparent: true});
        if (type === 'sprinkles') {
            for (let i = 0; i < 12; i++) {
                const geo = new THREE.BoxGeometry(0.03, 0.03, 0.08);
                const mesh = new THREE.Mesh(geo, previewMaterial);
                const angle = (i / 12) * Math.PI * 2;
                mesh.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
                mesh.rotation.z = Math.random() * Math.PI;
                activeToppingPreview.add(mesh);
            }
        } else if (type === 'whippedCream') {
            const geo = new THREE.ConeGeometry(0.4, 0.25, 16);
            const mesh = new THREE.Mesh(geo, previewMaterial);
            mesh.position.y = 0.1;
            activeToppingPreview.add(mesh);
        } else if (type === 'candles') {
            for (let i = 0; i < 5; i++) {
                const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 8);
                const mesh = new THREE.Mesh(geo, previewMaterial);
                const angle = (i / 5) * Math.PI * 2;
                mesh.position.set(Math.cos(angle) * 0.35, 0.12, Math.sin(angle) * 0.35);
                activeToppingPreview.add(mesh);
            }
        } else if (type === 'chocolateChips') {
            for (let i = 0; i < 10; i++) {
                const geo = new THREE.SphereGeometry(0.04, 8, 8);
                const mesh = new THREE.Mesh(geo, previewMaterial);
                const angle = (i / 10) * Math.PI * 2;
                mesh.position.set(Math.cos(angle) * 0.35, 0, Math.sin(angle) * 0.35);
                activeToppingPreview.add(mesh);
            }
        }
    }
    scene.add(activeToppingPreview);
}

function isCanvasClick(event) {
    return event.target === renderer.domElement || renderer.domElement.contains(event.target);
}

function updatePreviewPosition(event) {
    if (!activeToppingPreview || !isCanvasClick(event)) return;
    const hit = getPlacementHit(event);
    if (hit) {
        activeToppingPreview.position.copy(hit.point);
        alignPreviewToNormal(activeToppingPreview, hit.normal);
    }
}

function createTextPlane(text, opacity = 1) {

    const canvas = document.createElement('canvas');

    canvas.width = 1024;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Transparent bg
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const label = String(text || 'Happy Cake').slice(0, 28);
    let fontSize = 118;
    ctx.font = `900 ${fontSize}px Arial`;
    while (ctx.measureText(label).width > canvas.width - 96 && fontSize > 54) {
        fontSize -= 4;
        ctx.font = `900 ${fontSize}px Arial`;
    }

    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#3a1f18';
    ctx.strokeText(
        label,
        canvas.width / 2,
        canvas.height / 2
    );
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ff6b97';
    ctx.strokeText(
        label,
        canvas.width / 2,
        canvas.height / 2
    );
    ctx.fillStyle = '#fff8ea';
    ctx.fillText(
        label,
        canvas.width / 2,
        canvas.height / 2
    );

    const texture = new THREE.CanvasTexture(canvas);

    const material =
        new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide
        });

    const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8, 0.45),
        material
    );

    return plane;
}

function addCustomText(point, normal) {

    // ONLY TOP SURFACE
    if (normal.y < 0.9) return [];

    const text = customTextValue || 'Happy Cake';

    const plane = createTextPlane(text);

    plane.position.copy(point);

    // Keep the frosting text visibly above the cake surface.
    plane.position.y += 0.08;

    // Lay flat on top
    plane.rotation.x = -Math.PI / 2;

    scene.add(plane);

    toppings.push(plane);

    placedToppings.push({
    type: 'customText',
    text: text,
    position: {
        x: point.x,
        y: point.y,
        z: point.z
    }
});

    return [plane];
}

function placeToppingAt(hit) {
    if (!hit) return;
    let action = [];
    if (activeToppingType === 'sprinkles') action = addSprinkles(hit.point, hit.normal, hit.object);
    else if (activeToppingType === 'whippedCream') action = addWhippedCream(hit.point, hit.normal);
    else if (activeToppingType === 'candles') action = addCandles(hit.point, hit.normal);
    else if (activeToppingType === 'chocolateChips') action = addChocolateChips(hit.point, hit.normal, hit.object);
    else if (activeToppingType === 'customText') action = addCustomText(hit.point, hit.normal);
    if (action && action.length) toppingActions.push(action);
}

function paintAtPoint(event) {
    if (!activeToppingType) return;
    const hit = getPlacementHit(event);
    if (!hit) return;
    if (lastPaintPosition.distanceTo(hit.point) < 0.05) return;
    placeToppingAt(hit);
    lastPaintPosition.copy(hit.point);
}

function clearPreview() {
    if (activeToppingPreview) {
        scene.remove(activeToppingPreview);
        activeToppingPreview = null;
    }
}

function clearSelection() {
    activeToppingType = null;
    clearPreview();
    document.querySelectorAll('.toppingBtn').forEach(b => b.classList.remove('active'));
    renderer.domElement.style.cursor = 'grab';
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = 'Pick a topping, then click on the cake top to place it.';
}

function undoLastTopping() {
    if (!toppingActions.length) {
        const status = document.getElementById('toppingStatus');
        if (status) status.textContent = 'No toppings to undo.';
        return;
    }
    const lastAction = toppingActions.pop();
    lastAction.forEach(obj => {
        scene.remove(obj);
        disposeObject(obj);
        const index = toppings.indexOf(obj);
        if (index !== -1) toppings.splice(index, 1);
    });
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = 'Last topping removed.';
}

function clearAllToppings() {
    placedToppings.length = 0;
    while (toppingActions.length) {
        const action = toppingActions.pop();
        action.forEach(obj => {
            scene.remove(obj);
            disposeObject(obj);
        });
    }
    toppings.length = 0;
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = 'All toppings cleared.';
}

function addSprinkles(point, normal) {

    const added = [];

    // Build local surface axes
    const up = new THREE.Vector3(0, 1, 0);

    let tangent = new THREE.Vector3()
        .crossVectors(normal, up);

    if (tangent.lengthSq() < 0.001) {
        tangent.set(1, 0, 0);
    }

    tangent.normalize();

    const bitangent = new THREE.Vector3()
        .crossVectors(normal, tangent)
        .normalize();

    for (let i = 0; i < 12; i++) {

        const sprinkleGeometry =
            new THREE.BoxGeometry(0.025, 0.025, 0.09);

        const colors = [
            0xff4f81,
            0x5ad0ff,
            0xffd84d,
            0x7dff7a,
            0xffffff
        ];

        const sprinkleMaterial =
            new THREE.MeshStandardMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                roughness: 0.6
            });

        const sprinkle = new THREE.Mesh(
            sprinkleGeometry,
            sprinkleMaterial
        );

        // Surface-relative scatter
        const offsetX = (Math.random() - 0.5) * 0.18;
        const offsetY = (Math.random() - 0.5) * 0.18;

        const offset =
            tangent.clone().multiplyScalar(offsetX)
            .add(
                bitangent.clone().multiplyScalar(offsetY)
            );

        sprinkle.position
            .copy(point)
            .add(offset)
            .add(normal.clone().multiplyScalar(0.02));

        // Orient to surface
        sprinkle.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            normal
        );

        sprinkle.rotation.y += Math.random() * Math.PI;

        scene.add(sprinkle);

        toppings.push(sprinkle);
        added.push(sprinkle);
    }

    placedToppings.push({
    type: 'sprinkles',
    position: {
        x: point.x,
        y: point.y,
        z: point.z
    }
});

    return added;
}

function addWhippedCream(point, normal) {

    const added = [];
    const creamMaterial =
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            metalness: 0.0
        });

    // Create blob from multiple overlapping spheres
    const spherePositions = [
        { pos: [0, 0.12, 0], radius: 0.15 },
        { pos: [0.08, 0.06, 0.06], radius: 0.12 },
        { pos: [-0.08, 0.06, 0.06], radius: 0.12 },
        { pos: [0.06, 0.06, -0.08], radius: 0.12 },
        { pos: [0, 0.02, 0], radius: 0.14 }
    ];

    spherePositions.forEach(({ pos, radius }) => {
        const sphereGeom = new THREE.SphereGeometry(radius, 16, 16);
        const sphere = new THREE.Mesh(sphereGeom, creamMaterial);

        sphere.position.copy(point)
            .add(normal.clone().multiplyScalar(0.08))
            .add(new THREE.Vector3(pos[0], pos[1], pos[2]));

        scene.add(sphere);
        toppings.push(sphere);
        added.push(sphere);
    });

    placedToppings.push({
    type: 'whippedCream',
    position: {
        x: point.x,
        y: point.y,
        z: point.z
    }
});

    return added;
}

function addCandles(point, normal) {

    // Only allow placement on top surface
    if (normal.y < 0.85) return [];

    const added = [];

    // Candle body
    const candleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 16);

    const candleMaterial = new THREE.MeshStandardMaterial({
        color: 0xfff4d6,
        roughness: 0.8
    });

    const candle = new THREE.Mesh(candleGeometry, candleMaterial);

    // Always upright
    candle.position.copy(point);
    candle.position.y += 0.18;

    scene.add(candle);

    // Flame
    const flameGeometry = new THREE.SphereGeometry(0.045, 16, 16);

    const flameMaterial = new THREE.MeshStandardMaterial({
        color: 0xff7a00,
        emissive: 0xff5500,
        emissiveIntensity: 1.5
    });

    const flame = new THREE.Mesh(flameGeometry, flameMaterial);

    flame.position.copy(point);
    flame.position.y += 0.4;

    scene.add(flame);

    toppings.push(candle, flame);

    added.push(candle, flame);

    placedToppings.push({
    type: 'candles',
    position: {
        x: point.x,
        y: point.y,
        z: point.z
    }
});

    return added;
}

function addChocolateChips(point, normal, hitObject) {

    const added = [];

    const up = new THREE.Vector3(0, 1, 0);

    let tangent = new THREE.Vector3()
        .crossVectors(normal, up);

    if (tangent.lengthSq() < 0.001) {
        tangent.set(1, 0, 0);
    }

    tangent.normalize();

    const bitangent = new THREE.Vector3()
        .crossVectors(normal, tangent)
        .normalize();

    // Determine chip color based on cake color
    let chipColor = 0x4a2b1a;
    if (hitObject && hitObject.material && hitObject.material.color) {
        const cakeColor = new THREE.Color(hitObject.material.color);
        chipColor = cakeColor.getLuminance() > 0.5 ? 0x3d1f0a : 0xc8a882;
    }

    for (let i = 0; i < 15; i++) {

        const chipGeometry =
            new THREE.SphereGeometry(0.06, 16, 16);

        const chipMaterial =
            new THREE.MeshStandardMaterial({
                color: chipColor,
                roughness: 0.8,
                metalness: 0.0
            });

        const chip = new THREE.Mesh(
            chipGeometry,
            chipMaterial
        );

        const offsetX = (Math.random() - 0.5) * 0.25;
        const offsetY = (Math.random() - 0.5) * 0.25;

        const offset =
            tangent.clone().multiplyScalar(offsetX)
            .add(
                bitangent.clone().multiplyScalar(offsetY)
            );

        chip.position
            .copy(point)
            .add(offset)
            .add(normal.clone().multiplyScalar(0.04));

        scene.add(chip);

        toppings.push(chip);
        added.push(chip);
    }
    placedToppings.push({
    type: 'chocolateChips',
    position: {
        x: point.x,
        y: point.y,
        z: point.z
    }
});

    return added;
}

function beginToppingPlacement(toppingType) {
    if (isEditorReadOnly()) return;
    if (activeToppingType === toppingType) {
        clearSelection();
        return;
    }
    document.querySelectorAll('.toppingBtn').forEach(b => b.classList.remove('active'));
    const selectedButton = document.querySelector(`.toppingBtn[data-topping="${toppingType}"]`);
    if (selectedButton) selectedButton.classList.add('active');
    createToppingPreview(toppingType);
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = `Placing ${toppingType}. Drag on the cake top or side to add continuously.`;
}

function beginCustomTextPlacement(text) {
    if (isEditorReadOnly()) return;
    customTextValue = text || 'Happy Cake';
    document.querySelectorAll('.toppingBtn').forEach(b => b.classList.remove('active'));
    const textButton = document.getElementById('textToppingBtn');
    if (textButton) textButton.classList.add('active');
    createToppingPreview('customText');
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = 'Placing custom cake text. Click the cake top to add it.';
}

function completePlacement() {
    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = 'Pick a topping, then click on the cake to place it.';
}

function cancelPlacement() {
    clearPreview();
    completePlacement();
}

function setToppingButtons() {
    document.querySelectorAll('.toppingBtn').forEach(btn => {
        btn.addEventListener('click', (event) => {
            event.stopPropagation();
            const topping = btn.getAttribute('data-topping');
            if (topping) beginToppingPlacement(topping);
        });
    });
    const textBtn = document.getElementById('textToppingBtn');
    const textInput = document.getElementById('customTextInput');
    if (textBtn) {
        textBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const text = textInput ? textInput.value.trim() : '';
            if (!text) {
                alert('Enter custom cake text first.');
                return;
            }
            beginCustomTextPlacement(text);
        });
    }
    const clearBtn = document.getElementById('clearToppingBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            clearSelection();
        });
    }
    const undoBtn = document.getElementById('undoToppingBtn');
    if (undoBtn) {
        undoBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            undoLastTopping();
        });
    }
    const clearToppingsBtn = document.getElementById('clearToppingsBtn');
    if (clearToppingsBtn) {
        clearToppingsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            clearAllToppings();
        });
    }
}

setToppingButtons();

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        clearSelection();
    }
});

document.addEventListener('contextmenu', (event) => {
    if (activeToppingType && isCanvasClick(event)) {
        event.preventDefault();
        clearSelection();
    }
});

camera.position.set(0, 0, 5);

function handlePlacementMouseMove(event) {
    if (activeToppingPreview) {
        updatePreviewPosition(event);
    }
    if (isPainting) {
        paintAtPoint(event);
        return;
    }

    if (isMouseDown && !activeToppingType && isCanvasClick(event)) {
        const deltaX = event.clientX - mouseX;
        const deltaY = event.clientY - mouseY;
        theta -= deltaX * 0.005;
        phi = Math.max(0.3, Math.min(Math.PI / 2, phi - deltaY * 0.005));
        updateCamera();
        mouseX = event.clientX;
        mouseY = event.clientY;
    }
}

document.addEventListener('mousemove', handlePlacementMouseMove);

document.addEventListener('mousedown', (event) => {
    if (!isCanvasClick(event)) return;
    if (isEditorReadOnly() && event.button === 0) {
        isMouseDown = true;
        mouseX = event.clientX;
        mouseY = event.clientY;
        renderer.domElement.style.cursor = 'grabbing';
        return;
    }
    if (event.button === 0 && activeToppingType) {
        isPainting = true;
        const hit = getPlacementHit(event);
        if (hit) {
            placeToppingAt(hit);
            lastPaintPosition.copy(hit.point);
        }
        return;
    }
    if (event.button === 0) {
        isMouseDown = true;
        mouseX = event.clientX;
        mouseY = event.clientY;
        renderer.domElement.style.cursor = 'grabbing';
    }
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    isPainting = false;
    lastPaintPosition.set(Infinity, Infinity, Infinity);
    if (!activeToppingType) renderer.domElement.style.cursor = 'grab';
});

// Custom orbit controls
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let theta = 0;
let phi = Math.PI / 3;
const radius = 5;
window.editorReadOnly = false;

function isEditorReadOnly() {
    return window.editorReadOnly === true;
}

function setEditorReadOnly(enabled, message = 'Viewing template only. Editing is disabled.') {
    window.editorReadOnly = enabled;
    document.body.classList.toggle('readonly-view', enabled);
    clearSelection();

    const editableSelectors = [
        '#addLayerBtn',
        '#removeLayerBtn',
        '.layerBtn',
        '.flavorBtn',
        '.toppingBtn',
        '#customTextInput',
        '#undoToppingBtn',
        '#clearToppingsBtn',
        '#saveDesignBtn'
    ];

    editableSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            element.disabled = enabled;
        });
    });

    const status = document.getElementById('toppingStatus');
    if (status) status.textContent = message;
}

function updateCamera() {
    camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(0, 0.4, 0);
}

updateCamera();

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Simple customization: select cake flavor per layer
const flavors = [
    { name: 'Vanilla', color: 0xf6deb3 },
    { name: 'Chocolate', color: 0x6b3f1a },
    { name: 'Strawberry', color: 0xff6b97 },
    { name: 'Mocha', color: 0xa57444 },
    { name: 'Lemon', color: 0xffe26b }
];

document.querySelectorAll('.layerBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isEditorReadOnly()) return;
        if (btn.disabled) return;
        document.querySelectorAll('.layerBtn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedLayer = parseInt(btn.getAttribute('data-layer'));
    });
});

const removeLayerBtn = document.getElementById('removeLayerBtn');
if (removeLayerBtn) {
    removeLayerBtn.addEventListener('click', () => {
        if (isEditorReadOnly()) return;
        removeSelectedLayer();
    });
}

document.querySelectorAll('.flavorBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (isEditorReadOnly()) return;
        const flavorName = btn.getAttribute('data-flavor');
        const flavor = flavors.find(f => f.name === flavorName);
        if (flavor && layers[selectedLayer]) {
            layers[selectedLayer].material.color.setHex(flavor.color);
        }
    });
});

// Add layer button
const addLayerBtn = document.getElementById('addLayerBtn');
if (addLayerBtn) {
    addLayerBtn.addEventListener('click', () => {
        if (isEditorReadOnly()) return;
        addLayer();
    });
}
