function getCake3DThumbnail(template) {
  if (!window.THREE) return null;

  let renderer = null;
  try {
    const width = 640;
    const height = 400;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const { scene, camera } = createCakePreviewScene(template, width / height);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');
    disposeCakePreviewScene(scene);
    renderer.dispose();
    return dataUrl;
  } catch (error) {
    console.warn('Unable to render 3D cake thumbnail:', error);
    if (renderer) renderer.dispose();
    return null;
  }
}

function mountCake3DViewer(container, template) {
  if (!window.THREE || !container) return null;

  const width = Math.max(container.clientWidth, 320);
  const height = Math.max(container.clientHeight, 320);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const { scene, camera } = createCakePreviewScene(template, width / height);
  let theta = -0.45;
  let phi = Math.PI / 3;
  let radius = 5;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let frameId = null;

  function updateCamera() {
    phi = Math.max(0.35, Math.min(Math.PI - 0.25, phi));
    radius = Math.max(3.2, Math.min(7, radius));
    camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
    camera.position.y = radius * Math.cos(phi);
    camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(0, 0.45, 0);
  }

  function render() {
    updateCamera();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  function onPointerDown(event) {
    isDragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    if (!isDragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    theta -= dx * 0.01;
    phi -= dy * 0.01;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function onPointerUp(event) {
    isDragging = false;
    if (renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event) {
    event.preventDefault();
    radius += event.deltaY * 0.004;
  }

  function onResize() {
    const nextWidth = Math.max(container.clientWidth, 320);
    const nextHeight = Math.max(container.clientHeight, 320);
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
  }

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', onResize);
  render();

  return {
    dispose() {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      disposeCakePreviewScene(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    }
  };
}

function createCakePreviewScene(template, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2f2a3a);
  scene.fog = new THREE.Fog(0x2f2a3a, 6, 12);

  const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(3.8, 2.5, -2.1);
  camera.lookAt(0, 0.45, 0);

  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 0.15, 64),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.08 })
  );
  plate.position.y = -0.4;
  scene.add(plate);

  scene.add(new THREE.AmbientLight(0xffffff, 0.9));

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

  const layers = getCakeThumbnailLayers(template);
  const layerMeshes = [];
  layers.forEach((layer, index) => {
    const radius = Number(layer.radius) || [1.2, 1.0, 0.8][index] || 0.8;
    const layerHeight = Number(layer.height) || 0.5;
    const cake = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, layerHeight, 32),
      new THREE.MeshStandardMaterial({ color: normalizeCakeThumbnailColor(layer.color, index) })
    );
    cake.position.y = index * layerHeight;
    scene.add(cake);
    layerMeshes.push(cake);
  });

  addCakeThumbnailToppings(scene, template, layers, layerMeshes);
  return { scene, camera };
}

function disposeCakePreviewScene(scene) {
  scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (object.material.map) object.material.map.dispose();
      object.material.dispose();
    }
  });
}

function getCakeThumbnailLayers(template) {
  const design = getCakeThumbnailDesign(template);
  const layers = design && Array.isArray(design.layers) ? design.layers : [];

  return layers.length > 0 ? layers.slice(0, 3) : [{ color: 'f6deb3' }];
}

function normalizeCakeThumbnailColor(color, index) {
  const defaults = [0xf6deb3, 0xf2c9ab, 0xffd7dc];
  if (!color) return defaults[index % defaults.length];
  if (typeof color === 'number') return color;
  const clean = String(color).replace('#', '');
  return Number.parseInt(clean, 16) || defaults[index % defaults.length];
}

function addCakeThumbnailToppings(scene, template, layers, layerMeshes) {
  const design = getCakeThumbnailDesign(template);
  const toppings = design && Array.isArray(design.toppings) ? design.toppings : [];

  toppings.forEach((topping, index) => {
    const point = getCakeThumbnailToppingPosition(topping, layers.length);
    withCakeThumbnailSeed(getCakeToppingSeed(topping, index), () => {
      if (topping.type === 'sprinkles') addCakeThumbnailSprinkles(scene, point);
      if (topping.type === 'whippedCream') addCakeThumbnailWhippedCream(scene, point);
      if (topping.type === 'candles') addCakeThumbnailCandles(scene, point);
      if (topping.type === 'chocolateChips') addCakeThumbnailChocolateChips(scene, point, layerMeshes[0]);
      if (topping.type === 'customText') addCakeThumbnailCustomText(scene, point, topping.text);
    });
  });
}

function getCakeThumbnailDesign(template) {
  if (!template) return null;
  if (template.design && typeof template.design === 'object') return template.design;
  if (Array.isArray(template.layers)) return template;
  if (typeof template.design === 'string') {
    try {
      return JSON.parse(template.design);
    } catch (error) {
      return null;
    }
  }
  return null;
}

function getCakeThumbnailToppingPosition(toppingData, layerCount) {
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

function addCakeThumbnailSprinkles(scene, point) {
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
    const offset = tangent.clone().multiplyScalar((Math.random() - 0.5) * 0.18)
      .add(bitangent.clone().multiplyScalar((Math.random() - 0.5) * 0.18));
    sprinkle.position.copy(point).add(offset).add(normal.clone().multiplyScalar(0.02));
    sprinkle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    sprinkle.rotation.y += Math.random() * Math.PI;
    scene.add(sprinkle);
  }
}

function addCakeThumbnailWhippedCream(scene, point) {
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

function addCakeThumbnailCandles(scene, point) {
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

function addCakeThumbnailChocolateChips(scene, point, hitObject) {
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
    const offset = tangent.clone().multiplyScalar((Math.random() - 0.5) * 0.25)
      .add(bitangent.clone().multiplyScalar((Math.random() - 0.5) * 0.25));
    chip.position.copy(point).add(offset).add(normal.clone().multiplyScalar(0.04));
    scene.add(chip);
  }
}

function addCakeThumbnailCustomText(scene, point, text = 'Happy Cake') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  ctx.strokeText(label, canvas.width / 2, canvas.height / 2);
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#ff6b97';
  ctx.strokeText(label, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = '#fff8ea';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.45),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide })
  );
  plane.position.copy(point);
  plane.position.y += 0.08;
  plane.rotation.x = -Math.PI / 2;
  scene.add(plane);
}

function getCakeToppingSeed(toppingData, index) {
  const position = toppingData && toppingData.position ? toppingData.position : {};
  return `${toppingData.type || 'topping'}-${index}-${position.x || 0}-${position.y || 0}-${position.z || 0}`;
}

function withCakeThumbnailSeed(seedText, callback) {
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

window.getCake3DThumbnail = getCake3DThumbnail;
window.mountCake3DViewer = mountCake3DViewer;
