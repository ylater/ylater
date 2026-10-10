
import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { normalizeRoom, SEASONS } from './room-state.mjs';

// Adapted from the user's 松风茶肆 · 宋式街角; original geometry and procedural textures retained.
export function mountSongRoom(container, initialState, onFailure = () => {}) {
let config = normalizeRoom(initialState);
let destroyed = false;
const puddleGroups = [];
let namePlaque;
let frameRequest = 0;
let inView = true;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion = motionPreference.matches;
const environment = { glow: 1, wind: 1 };


// ── 01 · 场景、摄像机、渲染器与交互 ────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#cbd5d6', 35, 72);
const camera = new THREE.PerspectiveCamera(36, Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1), 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
renderer.domElement.setAttribute('aria-label', '可旋转的宋式雅间三维场景');
renderer.domElement.setAttribute('role', 'img');
renderer.domElement.tabIndex = 0;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.4, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.rotateSpeed = 0.65;
controls.zoomSpeed = 0.75;
controls.panSpeed = 0.65;
controls.screenSpacePanning = true;
controls.minDistance = 8.5;
controls.maxDistance = 40;
controls.minPolarAngle = THREE.MathUtils.degToRad(22);
controls.maxPolarAngle = THREE.MathUtils.degToRad(80);
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
renderer.domElement.addEventListener('contextmenu', event => event.preventDefault());
const initialDirection = new THREE.Vector3(-11.5, 13.85, 15.65).normalize();
function fitCamera() {
  controls.target.set(0, 1.4, 0);
  camera.fov = camera.aspect < .82 ? 52 : 36;
  camera.updateProjectionMatrix();
  const portrait = Math.max(1, .79 / camera.aspect);
  const distance = Math.min(39, 25 * portrait);
  camera.position.copy(controls.target).addScaledVector(initialDirection, distance);
  controls.update();
}
fitCamera();

const world = new THREE.Group();
scene.add(world);
const animations = { cloth: [], lanterns: [], branches: [], ripples: [], drops: [], reflections: [] };
const roofMaterials = [];
const outlineMeshes = [];
let seed = 77291;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; }
const rand = (a, b) => a + random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const geometryCache = new Map();
function geometry(key, create) { if (!geometryCache.has(key)) geometryCache.set(key, create()); return geometryCache.get(key); }
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(1, 12, 8);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
const planeGeometry = new THREE.PlaneGeometry(1, 1);

// ── 02 · 程序化材质与本地 Canvas 纹理 ──────────────────────────
const ramp = new THREE.DataTexture(new Uint8Array([88, 139, 191, 238]), 4, 1, THREE.RedFormat);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.generateMipmaps = false;
ramp.needsUpdate = true;
function toon(color, extra = {}) { return new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra }); }
function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d'); paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
const woodTexture = canvasTexture(128, 512, (c, w, h) => {
  c.fillStyle = '#a48c72'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 100; i++) {
    c.beginPath(); const x = rand(0, w); c.moveTo(x, 0);
    c.bezierCurveTo(x + rand(-4, 4), h * .3, x + rand(-5, 5), h * .65, x + rand(-3, 3), h);
    c.strokeStyle = i % 4 ? 'rgba(55,39,26,.045)' : 'rgba(230,209,159,.08)'; c.lineWidth = rand(.3, 1.5); c.stroke();
  }
});
const plasterTexture = canvasTexture(256, 256, (c, w, h) => {
  c.fillStyle = '#e7e3d5'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(69,75,62,${rand(.008, .03)})`; c.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 2)); }
  const wash = c.createLinearGradient(0, 180, 0, 256); wash.addColorStop(0, 'rgba(65,80,69,0)'); wash.addColorStop(1, 'rgba(65,80,69,.1)'); c.fillStyle = wash; c.fillRect(0, 0, w, h);
});
const M = {
  wood: toon('#bba98f', { map: woodTexture }), woodLight: toon('#d2bc98', { map: woodTexture }),
  woodDark: toon('#827261', { map: woodTexture }), woodBlack: toon('#4a4237'),
  wall: toon('#f0ecdf', { map: plasterTexture }), wallSide: toon('#e0e1d6', { map: plasterTexture }),
  stone: toon('#97a5a1'), stoneLight: toon('#b1b8ae'), foundation: toon('#777f77'),
  base: toon('#818b83'), baseDark: toon('#606d67'), soil: toon('#746f56'),
  ink: toon('#35413d'), iron: toon('#414a44'), paper: toon('#ede4cc'),
  celadon: toon('#a3c0aa'), white: toon('#e5dfc9'), clay: toon('#ad8160'), clayDark: toon('#79604b'),
  bamboo: toon('#949a6a'), leaf: toon('#738c65'), leafLight: toon('#9caa79'), leafDark: toon('#516f57'),
  tea: toon('#686746'), red: toon('#905e4c'), gold: toon('#c5aa74'), charcoal: toon('#48483e'),
  moss: toon('#879477'), bookBlue: toon('#5c7475'), bookBrown: toon('#b0a182'), bookGreen: toon('#85947c'),
  roof: Array.from({ length: 5 }, (_, i) => toon(['#536169', '#59666c', '#505e64', '#5c6a6e', '#56646b'][i])),
  pavement: Array.from({ length: 7 }, (_, i) => toon(['#a5b1ad', '#aab7b3', '#b6c0b8', '#94a5a2', '#a0afab', '#adb5aa', '#8e9f9c'][i]))
};
function mesh(parent, geo, material, x = 0, y = 0, z = 0, shadow = true) {
  const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
}
function box(parent, w, h, d, x, y, z, material = M.wood, outline = false) {
  const m = mesh(parent, cubeGeometry, material, x, y, z); m.scale.set(w, h, d);
  if (outline) outlineMeshes.push(m); return m;
}
function cylinder(parent, radius, height, x, y, z, material = M.wood, top = radius, segments = 12) {
  const ratio = top / radius;
  const geo = ratio === 1 && segments === 12 ? cylinderGeometry : geometry(`c${ratio.toFixed(3)}:${segments}`, () => new THREE.CylinderGeometry(ratio, 1, 1, segments));
  const m = mesh(parent, geo, material, x, y, z); m.scale.set(radius, height, radius); return m;
}
function sphere(parent, x, y, z, sx, sy, sz, material) { const m = mesh(parent, sphereGeometry, material, x, y, z); m.scale.set(sx, sy, sz); return m; }
function torus(parent, radius, thickness, x, y, z, material, horizontal = true, arc = Math.PI * 2) {
  const geo = geometry(`t${radius}:${thickness}:${arc}`, () => new THREE.TorusGeometry(radius, thickness, 5, 20, arc));
  const m = mesh(parent, geo, material, x, y, z); if (horizontal) m.rotation.x = Math.PI / 2; return m;
}
function beam(parent, start, end, width, depth, material = M.wood) {
  const delta = end.clone().sub(start); const m = box(parent, width, delta.length(), depth, 0, 0, 0, material);
  m.position.copy(start).add(end).multiplyScalar(.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), delta.normalize()); return m;
}
function group(parent, x = 0, y = 0, z = 0, angle = 0, animated = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = angle; g.userData.animated = animated; parent.add(g); return g;
}
function artPlane(parent, texture, w, h, x, y, z, rotation = 0, extra = {}) {
  const m = mesh(parent, planeGeometry, toon('#ffffff', { map: texture, side: THREE.DoubleSide, ...extra }), x, y, z, false);
  m.scale.set(w, h, 1); m.rotation.y = rotation; return m;
}
const serif = '"Noto Serif CJK SC", "Songti SC", "STSong", "SimSun", serif';
function lettering(text, { vertical = false, dark = false, width = 768, height = 256, size = 125, seal = true } = {}) {
  return canvasTexture(width, height, (c, w, h) => {
    c.fillStyle = dark ? '#454337' : '#e5dfc8'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 450; i++) { c.fillStyle = dark ? 'rgba(255,224,157,.035)' : 'rgba(82,71,46,.035)'; c.fillRect(rand(0, w), rand(0, h), rand(1, 3), rand(1, 2)); }
    c.fillStyle = dark ? '#e5d9b7' : '#4b5145'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${size}px ${serif}`;
    if (vertical) { const chars = [...text]; chars.forEach((ch, i) => c.fillText(ch, w * .5, h * (i + .65) / (chars.length + .3))); }
    else { const chars = [...text]; const spacing = w * .83 / chars.length; chars.forEach((ch, i) => c.fillText(ch, w * .5 + (i - (chars.length - 1) / 2) * spacing, h * .51)); }
    if (seal) { c.fillStyle = '#9a624c'; c.fillRect(w * .89, h * .73, w * .045, Math.min(h * .13, w * .045)); c.strokeStyle = dark ? '#ccb895' : '#e5dfc8'; c.lineWidth = 2; c.strokeRect(w * .9, h * .74, w * .025, Math.min(h * .09, w * .027)); }
  });
}

// ── 03 · 薄暮与暖光 ──────────────────────────────────────────
const ambientLight = new THREE.AmbientLight('#c7d9de', .36);scene.add(ambientLight);
const hemisphereLight = new THREE.HemisphereLight('#c2d8e9', '#918c73', .87);scene.add(hemisphereLight);
const dusk = new THREE.DirectionalLight('#c9d9e3', 1.35); dusk.position.set(-8, 15, 9);
dusk.castShadow = true; dusk.shadow.mapSize.set(1024, 1024);
Object.assign(dusk.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: .5, far: 35 });
dusk.shadow.bias = -.00035; dusk.shadow.normalBias = .045; dusk.shadow.radius = 3; dusk.target.position.set(0, 0, 0);
scene.add(dusk, dusk.target);
const coolFill = new THREE.DirectionalLight('#aecadd', .43); coolFill.position.set(7, 8, -9); scene.add(coolFill);
const interiorLight = new THREE.PointLight('#ffdcab', 6.5, 9, 1.6); interiorLight.position.set(.3, 2.55, -1.2); scene.add(interiorLight);
const entranceLight = new THREE.PointLight('#fbd5a2', 2.7, 6, 1.7); entranceLight.position.set(-.9, 2.2, 1.2); scene.add(entranceLight);

// ── 04 · 厚实正方形底座与青石街角 ────────────────────────────
function createBase() {
  box(world, 12, .62, 12, 0, -.29, 0, M.base, true);
  box(world, 11.94, .14, 11.94, 0, -.63, 0, M.baseDark, true);
  box(world, 12.08, .12, 12.08, 0, .075, 0, M.stoneLight, true);
  box(world, 11.88, .045, 11.88, 0, .153, 0, M.foundation);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 10; i++) {
      const p = -5.4 + i * 1.2;
      box(world, 1.17, .016, .008, p, -.25, side * 6.005, M.baseDark);
      box(world, .008, .016, 1.17, side * 6.005, -.25, p, M.baseDark);
    }
  }
}
function createStoneRoad() {
  // 宽街与侧巷共同构成 L 型，不使用二维背景。
  for (let row = 0; row < 5; row++) {
    const z = 2.32 + row * .67;
    for (let col = 0; col < 12; col++) {
      const left = -5.895 + col * .985 + (row % 2 ? .13 : 0);
      const width = Math.min(.955, 5.895 - left);
      if (width < .12) continue;
      const slab = box(world, width, .075, .635, left + width / 2, .191 + rand(-.006, .006), z, M.pavement[Math.floor(random() * 7)]);
      slab.rotation.y = rand(-.008, .008);
    }
  }
  for (let row = 0; row < 12; row++) {
    const z = -5.28 + row * .64;
    for (let col = 0; col < 3; col++) box(world, .75, .075, .615, -5.28 + col * .77, .187 + rand(-.005, .005), z, M.pavement[Math.floor(random() * 7)]);
  }
  // 路缘石、内嵌沟渠、格栅排水口。
  box(world, 8.95, .025, .125, 1.18, .197, 1.885, M.ink);
  box(world, .105, .025, 7.3, -3.44, .184, -1.73, M.ink);
  for (let i = 0; i < 12; i++) box(world, .72, .105, .19, -2.83 + i * .735, .245, 1.75, M.stoneLight, true);
  for (let i = 0; i < 9; i++) box(world, .2, .12, .77, -3.32, .244, -5.08 + i * .78, M.stoneLight);
  for (const [x, z] of [[2.8, 1.9], [-3.43, -1.1]]) {
    box(world, .48, .023, .24, x, .22, z, M.iron);
    for (let i = 0; i < 7; i++) box(world, .027, .027, .22, x - .21 + i * .07, .239, z, M.stone);
  }
  // 少量磨损刻痕，避免地面变成高频噪点。
  for (let i = 0; i < 20; i++) {
    const x = rand(-5.4, 5.3), z = rand(2.15, 5.35);
    const m = box(world, rand(.06, .2), .002, .008, x, .235, z, M.stone); m.rotation.y = rand(-1.5, 1.5); m.castShadow = false;
  }
  box(world, 6.46, .22, 4.6, .23, .292, -1.29, M.foundation, true);
  box(world, 6.24, .075, 4.38, .23, .433, -1.29, M.woodDark);
  for (let i = 0; i < 25; i++) box(world, .242, .055, 4.3, -2.77 + i * .25, .499, -1.29, i % 3 ? M.wood : M.woodLight);
  box(world, 2.2, .13, .51, -.61, .27, 1.37, M.stoneLight, true);
  box(world, 1.94, .14, .33, -.61, .406, 1.12, M.stoneLight, true);
  for (let i = 0; i < 5; i++) box(world, .33, .016, .36, -1.29 + i * .34, .342, 1.37, M.stone);
}

// ── 05 · 木窗、半掩木门、温润的宋式木构 ────────────────────────
function lattice(parent, width, height, x, y, z, material = M.wood, count = 5) {
  box(parent, width, .055, .052, x, y - height / 2, z, material);
  box(parent, width, .055, .052, x, y + height / 2, z, material);
  for (const s of [-1, 1]) box(parent, .055, height, .052, x + s * width / 2, y, z, material);
  for (let i = 1; i < count; i++) box(parent, .026, height, .03, x - width / 2 + width * i / count, y, z, material);
  for (let i = 1; i < 4; i++) box(parent, width, .026, .03, x, y - height / 2 + height * i / 4, z, material);
}
function createWoodWindow(parent, width, height, x, y, z, angle = 0) {
  const g = group(parent, x, y, z, angle);
  for (const s of [-1, 1]) box(g, .09, height + .15, .14, s * (width / 2 + .04), 0, 0, M.woodDark, true);
  box(g, width + .24, .1, .22, 0, -height / 2, .01, M.woodLight, true);
  box(g, width + .24, .09, .13, 0, height / 2, 0, M.woodDark);
  for (const s of [-1, 1]) {
    const leaf = group(g, s * width / 2, 0, .025, s * .87);
    box(leaf, width * .32, height, .055, -s * width * .16, 0, 0, M.wood);
    box(leaf, width * .28, height * .63, .028, -s * width * .16, height * .08, .04, M.paper);
    lattice(leaf, width * .28, height * .63, -s * width * .16, height * .08, .065, M.woodDark, 3);
    box(leaf, width * .28, height * .17, .03, -s * width * .16, -height * .36, .04, M.woodLight);
  }
  lattice(g, width, .3, 0, height / 2 - .2, -.04, M.wood, 9);
  return g;
}
function createDoor(parent, width, height, x, y, z, angle = 0, opening = -.85) {
  const g = group(parent, x, y, z, angle);
  box(g, width + .2, .12, .18, 0, height + .04, 0, M.woodDark, true);
  for (const s of [-1, 1]) box(g, .095, height, .17, s * (width / 2 + .03), height / 2, 0, M.woodDark, true);
  const door = group(g, -width / 2, 0, 0, opening);
  box(door, width * .48, height - .07, .075, width * .24, height / 2, 0, M.wood, true);
  for (let i = 0; i < 5; i++) box(door, .012, height - .2, .006, width * (.036 + i * .099), height / 2, .045, M.woodDark);
  for (const yy of [.21, height - .25]) box(door, width * .45, .067, .02, width * .24, yy, .05, M.woodDark);
  torus(door, .036, .008, width * .41, height * .48, .058, M.iron, false);
  return g;
}
function createShop() {
  const shop = group(world);
  // 后墙与右侧墙保留实体；临街双面开窗，使器物真实可见。
  box(shop, 6.16, 2.91, .12, .23, 1.984, -3.41, M.wall, true);
  box(shop, .12, 2.9, 4.29, 3.34, 1.98, -1.29, M.wallSide, true);
  box(shop, .12, .67, 4.3, -2.89, .862, -1.29, M.wallSide);
  box(shop, .12, .73, 4.3, -2.89, 3.07, -1.29, M.wallSide);
  box(shop, .12, 1.53, .54, -2.89, 1.975, -3.1, M.wallSide);
  box(shop, .12, 1.53, .66, -2.89, 1.975, .6, M.wallSide);
  createWoodWindow(shop, 2.77, 1.52, -2.97, 1.98, -1.22, -Math.PI / 2);
  for (const x of [-2.89, -1.48, .26, 3.33]) {
    cylinder(shop, .17, .22, x, .63, .9, M.stoneLight, .15, 8);
    box(shop, .16, 2.74, .18, x, 2.04, .9, M.woodDark, true);
    box(shop, .43, .095, .29, x, 3.24, .93, M.woodDark, true);
    box(shop, .57, .09, .35, x, 3.35, .92, M.wood, true);
    box(shop, .21, .15, .68, x, 3.37, .99, M.woodDark);
    for (const s of [-1, 1]) beam(shop, V(x + s * .06, 3.12, .9), V(x + s * .25, 3.33, .9), .07, .085, M.wood);
  }
  for (const x of [-2.89, 3.33]) {
    for (const z of [-3.4, -1.45]) box(shop, .17, 2.89, .17, x, 1.985, z, M.woodDark, true);
    box(shop, .16, .15, 4.6, x, 3.43, -1.26, M.woodDark, true);
  }
  box(shop, 6.44, .17, .2, .23, 3.44, .95, M.woodDark, true);
  box(shop, 6.36, .13, .15, .23, 3.43, -3.43, M.woodDark);
  box(shop, 1.28, .7, .13, -2.19, .89, .91, M.wall);
  createWoodWindow(shop, 1.14, 1.46, -2.19, 1.985, 1.015);
  box(shop, 2.93, .65, .12, 1.8, .865, .93, M.woodDark);
  for (let i = 0; i < 12; i++) box(shop, .195, .52, .021, .44 + i * .241, .87, 1.004, i % 3 ? M.wood : M.woodLight);
  box(shop, 2.98, .065, .34, 1.8, 1.225, .92, M.woodLight, true);
  lattice(shop, 2.96, .31, 1.79, 3.12, .94, M.woodDark, 13);
  createDoor(shop, 1.56, 2.72, -.62, .52, .96, 0, 1.22);
  // 墙脚石基、侧墙腰线及墙面题字。
  for (let i = 0; i < 8; i++) box(shop, .145, .26, .505, -2.973, .67, -3.18 + i * .53, i % 2 ? M.stone : M.stoneLight);
  for (let i = 0; i < 7; i++) box(shop, .14, .26, .56, 3.416, .67, -3.11 + i * .62, M.stone);
  artPlane(shop, lettering('且坐吃茶', { vertical: true, width: 256, height: 768, size: 133 }), .31, 1.02, -3.045, 2.03, .47, -Math.PI / 2, { transparent: true });
  // 匾额与轻简的门楣，色彩克制，不使用宫廷装饰。
  box(shop, 2.97, .62, .13, -.27, 3.0, 1.44, M.woodDark, true);
  box(shop, 2.81, .47, .027, -.27, 3.0, 1.522, M.woodBlack);
  namePlaque = artPlane(shop, lettering(config.name, { dark: true, size: 135 }), 2.73, .44, -.27, 3.0, 1.541, 0, { emissive: '#6c5130', emissiveIntensity: .12 });
  for (const x of [-1.44, .89]) beam(shop, V(x, 3.5, 1.3), V(x, 3.25, 1.44), .018, .018, M.iron);
  for (const x of [-1.08, -.17]) createBanner(shop, .43, .63, x, 2.72, 1.085, '', false);
  createBambooBlind(shop, 2.83, 1.8, 2.78, 1.015);
  return shop;
}

// ── 06 · 缓坡灰瓦屋顶：无夸张飞檐、无龙饰 ──────────────────────
function createRoof(parent, width, depth, cx, cz, eaveY, rise = 1.1) {
  const roof = group(parent, cx, 0, cz);
  const half = depth / 2;
  const roofY = d => eaveY + rise * (1 - d / half) + .075 * Math.pow(d / half, 4);
  const makeSurface = sign => {
    const positions = [], indices = []; const nx = 20, nz = 12;
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const x = -width / 2 + width * ix / nx, distance = half * iz / nz;
      positions.push(x, roofY(distance) - .042 + .025 * Math.pow(2 * x / width, 4), distance * sign);
    }
    for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
      const a = z * (nx + 1) + x, b = a + nx + 1;
      if (sign > 0) indices.push(a, b, a + 1, b, b + 1, a + 1); else indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setIndex(indices); geo.computeVertexNormals();
    const mat = M.roof[0].clone(); mat.side = THREE.DoubleSide; roofMaterials.push(mat); mesh(roof, geo, mat);
  };
  makeSurface(1); makeSurface(-1);
  const columns = Math.floor(width / .188), rows = Math.ceil(half / .39);
  const tileGeometry = geometry('roof-tile', () => {
    const p = [], ind = []; const steps = 6;
    for (let j = 0; j < 2; j++) for (let i = 0; i <= steps; i++) {
      const a = Math.PI * i / steps; p.push(Math.cos(a) * .093, Math.sin(a) * .032, (j - .5) * .445);
    }
    for (let i = 0; i < steps; i++) ind.push(i, i + 1, i + steps + 1, i + 1, i + steps + 2, i + steps + 1);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setIndex(ind); geo.computeVertexNormals(); return geo;
  });
  const tileMaterials = M.roof.map(m => { const c = m.clone(); c.side = THREE.DoubleSide; roofMaterials.push(c); return c; });
  for (const sign of [-1, 1]) {
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const distance = .15 + row * (half - .23) / (rows - 1);
      const x = -width / 2 + .105 + col * (width - .21) / (columns - 1);
      const slope = -rise / half + .30 * Math.pow(distance / half, 3) / half;
      const tile = mesh(roof, tileGeometry, tileMaterials[(col + row * 2) % 5], x, roofY(distance) + .022 + .025 * Math.pow(2 * x / width, 4), distance * sign);
      tile.rotation.x = -sign * Math.atan(slope);
    }
    box(parent, width + .13, .14, .15, cx, eaveY - .03, cz + half * sign, M.woodDark, true);
    for (let i = 0; i < Math.floor(width / .39); i++) {
      const x = cx - width / 2 + .16 + i * .39;
      beam(parent, V(x, eaveY + rise - .12, cz), V(x, eaveY - .05, cz + half * sign), .058, .095, M.woodDark);
    }
  }
  const ridgeMat = M.roof[2].clone(); roofMaterials.push(ridgeMat);
  const ridge = cylinder(roof, .087, width + .12, 0, eaveY + rise + .055, 0, ridgeMat); ridge.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    // 山墙与简化叉手，保持朴素的木构秩序。
    const x = cx + side * (width / 2 - .23);
    box(parent, .12, .12, depth - .46, x, eaveY + .02, cz, M.woodDark);
    beam(parent, V(x, eaveY + .02, cz - half + .24), V(x, eaveY + rise - .1, cz), .10, .11, M.wood);
    beam(parent, V(x, eaveY + rise - .1, cz), V(x, eaveY + .02, cz + half - .24), .10, .11, M.wood);
    beam(parent, V(x, eaveY + .06, cz - .57), V(x, eaveY + rise - .15, cz), .055, .075, M.woodDark);
    beam(parent, V(x, eaveY + .06, cz + .57), V(x, eaveY + rise - .15, cz), .055, .075, M.woodDark);
  }
  return roof;
}

// ── 07 · 小型器物：茶具、陶器、书卷、文房 ──────────────────────
function createPottery(parent, x, y, z, radius = .12, height = .24, material = M.celadon, type = 'jar') {
  const profiles = {
    jar: [[0,0],[.66,0],[.85,.07],[1,.28],[.97,.58],[.73,.8],[.55,.86],[.57,1],[.42,1],[.42,.85]],
    vase: [[0,0],[.62,0],[.9,.15],[1,.44],[.62,.68],[.32,.76],[.29,.95],[.42,1],[.3,1],[.23,.95]],
    bowl: [[0,0],[.37,0],[.43,.08],[.84,.48],[1,1],[.88,1],[.71,.48],[.36,.15]],
    pot: [[0,0],[.58,0],[.9,.18],[1,.42],[.92,.7],[.69,.85],[.53,.89],[.54,1],[.39,1],[.36,.89]]
  };
  const geo = geometry('pottery-' + type, () => new THREE.LatheGeometry(profiles[type].map(([r,h]) => new THREE.Vector2(r, h)), 16));
  const p = mesh(parent, geo, material, x, y, z); p.scale.set(radius, height, radius);
  if (type === 'jar') {
    cylinder(parent, radius * .59, .032, x, y + height + .009, z, material);
    sphere(parent, x, y + height + .028, z, radius * .17, .023, radius * .17, material);
  }
  if (type === 'bowl') { cylinder(parent, radius * .66, .003, x, y + height * .53, z, M.tea); }
  return p;
}
function createTeapot(parent, x, y, z, scale = 1, material = M.clayDark) {
  const g = group(parent, x, y, z);
  sphere(g, 0, .12 * scale, 0, .155 * scale, .12 * scale, .13 * scale, material);
  cylinder(g, .118 * scale, .026 * scale, 0, .226 * scale, 0, material);
  sphere(g, 0, .256 * scale, 0, .032 * scale, .031 * scale, .032 * scale, material);
  beam(g, V(.11 * scale, .12 * scale, 0), V(.25 * scale, .21 * scale, 0), .068 * scale, .054 * scale, material);
  const spout = cylinder(g, .035 * scale, .05 * scale, .255 * scale, .22 * scale, 0, material, .025 * scale); spout.rotation.z = -.5;
  const handle = torus(g, .091 * scale, .023 * scale, -.155 * scale, .135 * scale, 0, material, false, Math.PI * 1.6); handle.rotation.z = .65;
  return g;
}
function createTeaSet(parent, x, y, z, scale = 1) {
  const g = group(parent, x, y, z);
  box(g, .71 * scale, .045 * scale, .44 * scale, 0, .021, 0, M.woodDark, true);
  for (const s of [-1, 1]) box(g, .025, .048, .45 * scale, s * .35 * scale, .051, 0, M.woodLight);
  createTeapot(g, -.12 * scale, .05 * scale, -.032 * scale, .78 * scale, M.clayDark);
  for (const [xx, zz] of [[.18, .12], [.19, -.11], [-.11, .16]]) {
    cylinder(g, .084 * scale, .012, xx * scale, .061, zz * scale, M.celadon);
    createPottery(g, xx * scale, .072, zz * scale, .052 * scale, .051 * scale, M.white, 'bowl');
  }
  return g;
}
function createBookStack(parent, x, y, z, count = 3, scale = 1) {
  const g = group(parent, x, y, z, rand(-.10, .10));
  for (let i = 0; i < count; i++) {
    const mat = [M.bookBlue, M.bookBrown, M.bookGreen][i % 3]; const yy = i * .065 * scale;
    box(g, .37 * scale, .041 * scale, .25 * scale, 0, yy + .025 * scale, 0, M.paper);
    box(g, .39 * scale, .009 * scale, .27 * scale, 0, yy + .049 * scale, 0, mat);
    box(g, .39 * scale, .008 * scale, .27 * scale, 0, yy + .003 * scale, 0, mat);
    box(g, .013 * scale, .048 * scale, .268 * scale, -.186 * scale, yy + .025 * scale, 0, mat);
    for (let j = 0; j < 4; j++) box(g, .018 * scale, .051 * scale, .004 * scale, -.164 * scale, yy + .026 * scale, (-.10 + j * .067) * scale, M.paper);
    box(g, .072 * scale, .003, .12 * scale, .08 * scale, yy + .055 * scale, 0, M.white);
  }
  return g;
}
function createScrolls(parent, x, y, z, count = 4) {
  for (let i = 0; i < count; i++) {
    const roll = cylinder(parent, .044, .35, x + (i % 2) * .09, y + Math.floor(i / 2) * .081 + .045, z, M.paper); roll.rotation.x = Math.PI / 2;
    const rod = cylinder(parent, .016, .405, roll.position.x, roll.position.y, z, M.woodDark); rod.rotation.x = Math.PI / 2;
    box(parent, .014, .078, .018, roll.position.x, roll.position.y, z + .028, M.bookBlue);
  }
}
function createBrushPot(parent, x, y, z) {
  createPottery(parent, x, y, z, .075, .15, M.bamboo, 'vase');
  for (let i = 0; i < 5; i++) {
    const xx = x + rand(-.034, .034), zz = z + rand(-.026, .026), hh = rand(.18, .30);
    const brush = cylinder(parent, .009, hh, xx, y + .11 + hh / 2, zz, M.woodDark); brush.rotation.z = rand(-.15, .15);
    cylinder(parent, .015, .045, xx, y + .12 + hh, zz, M.ink, .004);
  }
}
function createWritingSet(parent, x, y, z) {
  const g = group(parent, x, y, z);
  box(g, .53, .006, .34, -.07, .006, .04, M.paper);
  for (let i = 0; i < 8; i++) {
    const stroke = box(g, .015, .002, rand(.025, .048), -.20 + (i % 4) * .09, .011, -.07 + Math.floor(i / 4) * .09, M.ink); stroke.rotation.y = .3;
  }
  box(g, .22, .035, .15, .33, .021, .07, M.ink, true);
  box(g, .13, .006, .083, .33, .043, .07, M.charcoal);
  createBrushPot(g, -.38, 0, -.18);
  for (const xx of [.07, .3]) cylinder(g, .025, .17, xx, .085, -.18, M.woodDark);
  box(g, .31, .03, .045, .18, .17, -.18, M.woodLight);
  for (let i = 0; i < 3; i++) beam(g, V(.09 + i * .075, .15, -.18), V(.09 + i * .075, .02, -.23), .007, .007, M.woodDark);
  box(g, .065, .08, .065, .4, .04, -.18, M.red);
  createScrolls(g, -.20, .01, .31, 2);
}

// ── 08 · 实体柜架、茶桌、屏风与里间 ──────────────────────────
function createShelf(parent, x, y, z, width = 2.8, height = 2.27, angle = 0) {
  const g = group(parent, x, y, z, angle); const depth = .42;
  box(g, width, .43, depth, 0, .225, 0, M.woodDark, true);
  for (let i = 0; i < 4; i++) {
    box(g, width / 4 - .035, .34, .032, -width / 2 + width * (i + .5) / 4, .225, .23, M.wood);
    sphere(g, -width / 2 + width * (i + .5) / 4 + .1, .245, .255, .015, .015, .013, M.iron);
  }
  for (const s of [-1, 1]) box(g, .075, height, depth, s * width / 2, height / 2, 0, M.woodDark, true);
  box(g, .055, height - .46, depth, 0, (height + .46) / 2, 0, M.woodDark);
  const levels = [.48, .48 + (height - .48) / 3, .48 + (height - .48) * 2 / 3, height];
  for (const yy of levels) {
    box(g, width + .06, .065, depth + .035, 0, yy, 0, M.wood, true);
    box(g, width, .038, .027, 0, yy + .04, -.2, M.woodLight);
  }
  const columns = Math.max(3, Math.floor(width / .4));
  for (let row = 0; row < 3; row++) for (let i = 0; i < columns; i++) {
    const xx = -width / 2 + (i + .5) * width / columns, yy = levels[row] + .035;
    if ((row * 3 + i) % 5 === 0) createBookStack(g, xx, yy, .015, 3, .72);
    else if ((row + i) % 7 === 0) createScrolls(g, xx - .04, yy, .01, 4);
    else {
      const r = .075 + random() * .03, h = rand(.17, .29);
      createPottery(g, xx, yy, .03, r, h, [M.celadon, M.white, M.clay][(i + row) % 3], row === 2 && i % 2 ? 'vase' : 'jar');
      if (row < 2) box(g, .08, .049, .003, xx, yy + h * .5, .03 + r + .002, M.paper);
    }
  }
  return g;
}
function createStool(parent, x, y, z, scale = 1) {
  box(parent, .33 * scale, .075 * scale, .29 * scale, x, y + .36 * scale, z, M.woodLight, true);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(parent, .043 * scale, .33 * scale, .043 * scale, x + a * .115 * scale, y + .17 * scale, z + b * .094 * scale, M.woodDark);
  box(parent, .24 * scale, .033, .045, x, y + .12 * scale, z, M.wood);
}
function createChair(parent, x, y, z, angle = 0) {
  const g = group(parent, x, y, z, angle);
  box(g, .43, .075, .42, 0, .43, 0, M.woodLight, true);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, .049, b < 0 ? .93 : .4, .049, a * .16, b < 0 ? .47 : .2, b * .16, M.woodDark);
  box(g, .40, .085, .055, 0, .93, -.16, M.wood);
  box(g, .11, .36, .035, 0, .73, -.16, M.wood);
  for (const s of [-1, 1]) box(g, .033, .033, .31, s * .16, .19, 0, M.woodDark);
  return g;
}
function createTeaTable(parent, x, y, z, round = true) {
  const g = group(parent, x, y, z);
  if (round) cylinder(g, .64, .085, 0, .55, 0, M.woodLight, .64, 24);
  else box(g, 1.27, .09, .85, 0, .55, 0, M.woodLight, true);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, .075, .53, .075, a * .36, .265, b * .26, M.woodDark);
  for (const s of [-1, 1]) box(g, .78, .11, .055, 0, .46, s * .27, M.woodDark);
  createTeaSet(g, -.08, .60, .04, .95);
  createPottery(g, .29, .60, -.29, .079, .22, M.celadon, 'vase');
  createFlowerSprig(g, .29, .80, -.29, .33);
  cylinder(g, .1, .012, .37, .612, .28, M.white);
  for (let i = 0; i < 3; i++) sphere(g, .33 + i * .035, .642, .275, .025, .026, .026, M.gold);
  createStool(g, -.78, 0, .03); createStool(g, .01, 0, .74); createChair(g, .16, 0, -.79);
  return g;
}
function bambooPainting() {
  return canvasTexture(384, 768, (c, w, h) => {
    c.fillStyle = '#e4ddc5'; c.fillRect(0, 0, w, h);
    for (let stem = 0; stem < 3; stem++) {
      let x = w * (.23 + stem * .22); const top = h * (.18 + stem * .09);
      c.strokeStyle = '#737c63'; c.lineWidth = 6 - stem;
      c.beginPath(); c.moveTo(x, h * .91); c.quadraticCurveTo(x + 35, h * .5, x + 19, top); c.stroke();
      for (let j = 0; j < 6; j++) {
        const yy = h * .81 - j * h * .095, xx = x + 18;
        c.lineWidth = 2; c.beginPath(); c.moveTo(xx - 8, yy); c.lineTo(xx + 9, yy - 2); c.stroke();
        for (let k = 0; k < 3; k++) {
          const dx = (j % 2 ? -1 : 1) * (30 + k * 16), dy = -25 - k * 12;
          c.fillStyle = ['#737b61', '#68745d', '#929580'][k]; c.beginPath(); c.moveTo(xx, yy);
          c.quadraticCurveTo(xx + dx * .4, yy + dy - 12, xx + dx, yy + dy); c.quadraticCurveTo(xx + dx * .5, yy + dy + 9, xx, yy); c.fill();
        }
      }
    }
    c.font = `31px ${serif}`; c.fillStyle = '#5b6150'; c.fillText('雨', 305, 100); c.fillText('后', 305, 142); c.fillText('清', 305, 184); c.fillText('音', 305, 226);
    c.fillStyle = '#99604a'; c.fillRect(304, 250, 23, 23);
  });
}
function createInterior(parent) {
  createShelf(parent, 1.73, .53, -3.08, 2.72, 2.24);
  createShelf(parent, -2.15, .53, -3.08, 1.23, 2.16);
  createShelf(parent, 1.77, .53, -.32, 2.53, 1.43);
  // 里间入口保留可见深色空隙，门后仍有小柜，增加空间纵深。
  box(parent, .76, 1.98, .025, -.65, 1.52, -3.331, M.ink);
  createDoor(parent, .77, 2.02, -.65, .53, -3.26, 0, -.46);
  box(parent, .38, .48, .16, -.43, .79, -3.28, M.woodDark);
  createPottery(parent, -.43, 1.04, -3.15, .075, .17, M.clay);
  createTeaTable(parent, -1.76, .53, -.59, true);
  // 茶案前窗低柜。
  box(parent, 2.66, .69, .53, 1.88, .875, .52, M.woodDark, true);
  box(parent, 2.81, .09, .72, 1.88, 1.265, .53, M.woodLight, true);
  for (let i = 0; i < 3; i++) {
    box(parent, .83, .51, .028, .99 + i * .88, .89, .80, M.wood);
    box(parent, .1, .04, .02, .98 + i * .88, 1.02, .825, M.iron);
  }
  createTeaSet(parent, 1.59, 1.32, .54, 1.1);
  createPottery(parent, 2.56, 1.32, .54, .14, .28, M.celadon);
  createPottery(parent, 2.88, 1.32, .45, .1, .22, M.white);
  createBookStack(parent, .79, 1.32, .53, 3, .85);
  // 文房方桌：笔架、砚、纸、印章与线装书。
  box(parent, 1.68, .095, .93, 1.52, 1.17, -1.46, M.woodLight, true);
  for (const a of [-1, 1]) for (const b of [-1, 1]) box(parent, .07, .6, .07, 1.52 + a * .69, .82, -1.46 + b * .35, M.woodDark);
  for (const s of [-1, 1]) box(parent, 1.46, .16, .05, 1.52, 1.065, -1.46 + s * .34, M.wood);
  createWritingSet(parent, 1.46, 1.225, -1.5); createBookStack(parent, 2.11, 1.225, -1.48, 2, .75);
  createChair(parent, 1.52, .53, -2.27, 0); createStool(parent, 2.51, .53, -1.48, .95);
  // 竹纸隔断留透空，避免遮挡整间店。
  const screen = group(parent, .09, .53, -1.58, -.18);
  for (let panel = 0; panel < 2; panel++) {
    const g = group(screen, panel * .56, 0, 0, panel * -.20);
    for (const x of [-.26, .26]) box(g, .048, 1.68, .055, x, .85, 0, M.woodDark);
    box(g, .53, .055, .065, 0, 1.67, 0, M.wood);
    box(g, .49, .93, .022, 0, 1.01, 0, M.paper);
    lattice(g, .5, .34, 0, .30, .018, M.wood, 4);
    artPlane(g, bambooPainting(), .47, .92, 0, 1.01, .019);
    for (const x of [-.26, .26]) box(g, .09, .07, .25, x, .07, 0, M.woodDark);
  }
  // 挂轴与题字。
  artPlane(parent, bambooPainting(), .53, 1.25, -.04, 2.16, -3.331);
  for (const yy of [1.52, 2.80]) { const rod = cylinder(parent, .025, .65, -.04, yy, -3.30, M.woodDark); rod.rotation.z = Math.PI / 2; }
  artPlane(parent, lettering('茶烟一缕', { vertical: true, width: 256, height: 768, size: 129 }), .34, 1.2, 3.262, 2.1, -1.91, -Math.PI / 2);
  // 小炉、蒸笼、香炉与水壶。
  cylinder(parent, .18, .25, -2.38, .66, -2.09, M.clayDark);
  cylinder(parent, .145, .026, -2.38, .798, -2.09, M.charcoal);
  createTeapot(parent, -2.38, .818, -2.09, .94, M.iron);
  cylinder(parent, .21, .11, 2.78, 1.38, .57, M.bamboo);
  for (let i = 0; i < 7; i++) box(parent, .32, .008, .016, 2.78, 1.44, .44 + i * .043, M.woodLight);
  createPottery(parent, -.24, 1.225, -.32, .10, .09, M.iron, 'bowl');
  for (const xx of [-.32, -.16]) sphere(parent, xx, 1.24, -.32, .014, .023, .017, M.iron);
  beam(parent, V(-.24, 1.27, -.32), V(-.22, 1.54, -.31), .007, .007, M.woodDark);
  box(parent, .37, .055, .33, -.24, 1.16, -.32, M.woodLight);
  for (const x of [-.37, -.11]) box(parent, .035, .59, .035, x, .845, -.32, M.woodDark);
  // 店内风灯。
  createLantern(parent, .28, 2.83, -1.48, .8, false);
}

// ── 09 · 灯笼、布幌与收起的竹帘 ──────────────────────────────
const glowTexture = canvasTexture(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,227,169,.46)'); g.addColorStop(.25, 'rgba(255,213,132,.18)'); g.addColorStop(1, 'rgba(255,204,124,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
});
function createLantern(parent, x, y, z, scale = 1, light = true) {
  const g = group(parent, x, y, z, 0, true);
  const paper = toon('#f4dda8', { emissive: '#ffce7d', emissiveIntensity: .64 });
  sphere(g, 0, 0, 0, .2 * scale, .255 * scale, .2 * scale, paper);
  for (const yy of [-.236, .236]) cylinder(g, .116 * scale, .028 * scale, 0, yy * scale, 0, M.woodDark);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4, points = [];
    for (let j = 0; j <= 8; j++) {
      const h = -.23 + j * .0575, r = .203 * Math.sqrt(1 - Math.pow(h / .267, 2));
      points.push(V(Math.sin(angle) * r * scale, h * scale, Math.cos(angle) * r * scale));
    }
    mesh(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 8, .005 * scale, 3, false), M.woodDark);
  }
  cylinder(g, .012, .28 * scale, 0, .39 * scale, 0, M.woodDark);
  torus(g, .073 * scale, .006 * scale, 0, .255 * scale, 0, M.iron, false);
  cylinder(g, .024 * scale, .07 * scale, 0, -.3 * scale, 0, M.red);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, opacity: .42, blending: THREE.AdditiveBlending }));
  halo.scale.set(.94 * scale, .94 * scale, 1); g.add(halo);
  let point;
  if (light) { point = new THREE.PointLight('#ffdc9b', 2.4, 4.2, 1.6); point.position.set(0, -.12, 0); g.add(point); }
  animations.lanterns.push({ group: g, paper, point, halo, phase: rand(0, 6) }); return g;
}
function createBanner(parent, width, height, x, y, z, text = '茶', horizontalSign = true, angle = 0) {
  const g = group(parent, x, y, z, angle, true);
  const texture = lettering(text || ' ', { vertical: text.length > 1, width: 256, height: 512, size: 168, seal: !!text });
  const geo = new THREE.PlaneGeometry(width, height, 7, 12); geo.translate(0, -height / 2, 0);
  const mat = toon('#ffffff', { map: texture, side: THREE.DoubleSide });
  const cloth = mesh(g, geo, mat, 0, 0, .01); cloth.castShadow = false;
  const rest = geo.attributes.position.array.slice(); animations.cloth.push({ mesh: cloth, rest, height, phase: rand(0, 6), amplitude: horizontalSign ? .034 : .018 });
  const pole = cylinder(g, .025, width + .12, 0, .018, 0, M.woodDark); pole.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) cylinder(g, .006, .15, s * width * .34, .091, 0, M.woodDark);
  return g;
}
function createBambooBlind(parent, width, x, y, z) {
  const g = group(parent, x, y, z, 0, true);
  const roll = cylinder(g, .093, width, 0, 0, 0, M.bamboo); roll.rotation.z = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const stick = cylinder(g, .009, width, 0, Math.sin(a) * .094, Math.cos(a) * .094, M.woodLight); stick.rotation.z = Math.PI / 2;
  }
  for (const s of [-1, 1]) { cylinder(g, .005, .43, s * width * .33, -.1, .11, M.woodDark); box(g, .022, .17, .027, s * width * .33, -.011, .103, M.woodDark); }
  animations.branches.push({ group: g, phase: .2, strength: .007 });
}

// ── 10 · 花器、盆景、竹与墙角植物 ──────────────────────────────
const leafGeometry = geometry('leaf', () => {
  const p = [0,0,0, .07,.005,.055, 0,.01,.27, -.07,.005,.055];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex([0,1,2,0,2,3]); g.computeVertexNormals(); return g;
});
for (const m of [M.leaf, M.leafLight, M.leafDark]) m.side = THREE.DoubleSide;
function createLeaf(parent, x, y, z, scale, angle, material = M.leaf) {
  const l = mesh(parent, leafGeometry, material, x, y, z, false); l.scale.setScalar(scale); l.rotation.set(rand(-.65, .6), angle, rand(-.2, .2)); return l;
}
function createFlowerSprig(parent, x, y, z, height = .5) {
  const g = group(parent, x, y, z, 0, true);
  beam(g, V(0, -.03, 0), V(.055, height, 0), .011, .011, M.woodDark);
  for (let i = 0; i < 4; i++) {
    const yy = height * (.25 + i * .18), s = i % 2 ? 1 : -1;
    beam(g, V(yy * .10, yy, 0), V(s * .12, yy + .055, .035), .006, .006, M.woodDark);
    createLeaf(g, s * .07, yy + .023, 0, .45, s * 1.3, M.leaf);
    if (i > 1) {
      for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; sphere(g, s * .12 + Math.cos(a) * .021, yy + .064 + Math.sin(a) * .021, .035, .018, .018, .009, M.white); }
      sphere(g, s * .12, yy + .064, .045, .009, .009, .007, M.gold);
    }
  }
  animations.branches.push({ group: g, phase: rand(0, 6), strength: .009 }); return g;
}
function createPottedPlant(parent, x, y, z, size = 1, type = 'shrub') {
  const g = group(parent, x, y, z);
  createPottery(g, 0, 0, 0, .2 * size, .28 * size, M.clay, 'vase');
  cylinder(g, .11 * size, .013, 0, .247 * size, 0, M.soil);
  const branch = group(g, 0, .24 * size, 0, 0, true);
  if (type === 'bamboo') {
    for (let i = 0; i < 5; i++) {
      const xx = rand(-.09, .09) * size, zz = rand(-.08, .08) * size, hh = rand(.73, 1.24) * size;
      cylinder(branch, .018 * size, hh, xx, hh / 2, zz, M.bamboo);
      for (let j = 1; j < 5; j++) {
        cylinder(branch, .022 * size, .012, xx, hh * j / 5, zz, M.leafDark);
        if (j > 1) for (let k = 0; k < 4; k++) createLeaf(branch, xx, hh * j / 5, zz, size * .8, j + k * 1.75, k % 2 ? M.leaf : M.leafLight);
      }
    }
  } else {
    beam(branch, V(0, 0, 0), V(.08 * size, .62 * size, 0), .043 * size, .043 * size, M.woodDark);
    for (let i = 0; i < 22; i++) {
      const a = rand(0, 6.28), r = rand(.07, .25) * size, yy = rand(.20, .73) * size;
      const end = V(Math.cos(a) * r, yy, Math.sin(a) * r); beam(branch, V(.04 * size, yy * .65, 0), end, .011 * size, .013 * size, M.woodDark);
      for (let k = 0; k < 3; k++) createLeaf(branch, end.x, end.y, end.z, size * .72, a + k * 2, i % 3 ? M.leaf : M.leafLight);
    }
  }
  animations.branches.push({ group: branch, phase: rand(0, 6), strength: .010 }); return g;
}
function createBonsai(parent, x, y, z, size = 1) {
  const g = group(parent, x, y, z);
  cylinder(g, .37 * size, .10 * size, 0, .05 * size, 0, M.stoneLight, .44 * size, 8);
  cylinder(g, .35 * size, .02, 0, .109 * size, 0, M.soil);
  const tree = group(g, 0, .11 * size, 0, 0, true);
  const nodes = [V(0, 0, 0), V(-.1 * size, .32 * size, .02), V(.04 * size, .63 * size, -.06), V(-.09 * size, .98 * size, -.015), V(.06 * size, 1.26 * size, 0)];
  for (let i = 0; i < nodes.length - 1; i++) beam(tree, nodes[i], nodes[i + 1], (.1 - i * .02) * size, (.09 - i * .017) * size, M.woodDark);
  for (const [xx, yy, zz, r] of [[-.39,.65,.12,.32],[.36,.88,.03,.31],[-.24,1.07,-.03,.32],[.07,1.31,0,.31]]) {
    beam(tree, V(0, (yy - .15) * size, 0), V(xx * size, yy * size, zz * size), .035 * size, .025 * size, M.woodDark);
    for (let i = 0; i < 9; i++) sphere(tree, (xx + rand(-r * .7, r * .7)) * size, (yy + rand(-.035, .05)) * size, (zz + rand(-r * .58, r * .58)) * size, r * size * .48, .083 * size, r * size * .43, [M.leaf, M.leafLight, M.leafDark][i % 3]);
  }
  animations.branches.push({ group: tree, phase: 2.1, strength: .004 }); return g;
}

// ── 11 · 街巷生活器物与邻铺 ────────────────────────────────────
function createBasket(parent, x, y, z, scale = 1) {
  const g = group(parent, x, y, z);
  cylinder(g, .18 * scale, .30 * scale, 0, .15 * scale, 0, M.bamboo, .245 * scale, 16);
  cylinder(g, .216 * scale, .008, 0, .306 * scale, 0, M.soil);
  for (let i = 0; i < 7; i++) torus(g, (.182 + i * .009) * scale, .006 * scale, 0, (.035 + i * .04) * scale, 0, M.woodLight);
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    beam(g, V(Math.cos(a) * .18 * scale, .02, Math.sin(a) * .18 * scale), V(Math.cos(a) * .24 * scale, .30 * scale, Math.sin(a) * .24 * scale), .006, .006, M.woodLight);
  }
  torus(g, .247 * scale, .015 * scale, 0, .315 * scale, 0, M.bamboo);
  const handle = torus(g, .205 * scale, .014 * scale, 0, .31 * scale, 0, M.woodDark, false, Math.PI); handle.rotation.z = 0;
  return g;
}
function createWaterJar(parent, x, y, z, scale = 1) {
  const g = group(parent, x, y, z);
  createPottery(g, 0, 0, 0, .37 * scale, .61 * scale, M.clayDark, 'pot');
  cylinder(g, .151 * scale, .012, 0, .577 * scale, 0, new THREE.MeshPhongMaterial({ color: '#506a65', specular: '#a2b8a4', shininess: 70 }));
  torus(g, .204 * scale, .016, 0, .604 * scale, 0, M.clay);
  beam(g, V(-.25 * scale, .68 * scale, 0), V(.24 * scale, .70 * scale, -.03), .018, .018, M.bamboo);
  createPottery(g, .16 * scale, .64 * scale, -.03, .073, .05, M.bamboo, 'bowl');
  return g;
}
function createBench(parent, x, y, z, width = 1.45, angle = 0) {
  const g = group(parent, x, y, z, angle);
  box(g, width, .08, .36, 0, .42, 0, M.woodLight, true);
  for (const s of [-1, 1]) {
    box(g, .095, .4, .27, s * (width / 2 - .16), .20, 0, M.woodDark);
    box(g, .33, .07, .29, s * (width / 2 - .16), .05, 0, M.woodDark);
  }
  box(g, width - .23, .065, .05, 0, .19, 0, M.wood); return g;
}
function createNotice(parent, x, y, z, angle = 0) {
  const g = group(parent, x, y, z, angle);
  box(g, .49, .64, .065, 0, .59, 0, M.woodDark, true);
  artPlane(g, lettering('清茶雅器', { vertical: true, width: 256, height: 512, size: 83 }), .38, .51, 0, .60, .038);
  for (const s of [-1, 1]) beam(g, V(s * .19, .70, 0), V(s * .29, .015, .20), .032, .032, M.woodDark);
  return g;
}
function createStreetObjects() {
  createBench(world, -3.38, .23, -1.40, 1.49, Math.PI / 2);
  createBasket(world, -3.48, .23, -.47, .86);
  createWaterJar(world, 3.78, .23, 1.01, .98);
  createPottery(world, 4.33, .23, 1.23, .21, .38, M.clay);
  createPottery(world, 4.17, .23, .75, .13, .27, M.celadon, 'vase');
  createBasket(world, 3.59, .23, -1.97, 1.03);
  createNotice(world, .66, .23, 1.57, -.12);
  createPottedPlant(world, -2.72, .34, 1.47, .76);
  createPottedPlant(world, 3.09, .24, 1.48, .66, 'bamboo');
  createPottedPlant(world, -3.48, .23, -3.34, 1.1, 'bamboo');
  createBonsai(world, -4.89, .25, -4.78, .91);
  createBench(world, -2.09, .24, 1.45, .95);
  createPottery(world, -2.32, .72, 1.45, .075, .24, M.celadon, 'vase'); createFlowerSprig(world, -2.32, .91, 1.45, .29);
  // 竹扫帚：竹柄与独立细束。
  const broom = group(world, -3.04, .23, .30, -.25); broom.rotation.z = -.19;
  cylinder(broom, .014, 1.11, 0, .84, 0, M.bamboo);
  for (let i = 0; i < 17; i++) beam(broom, V(rand(-.02, .02), .37, rand(-.018, .018)), V(rand(-.12, .12), .025, rand(-.033, .033)), .009, .009, i % 2 ? M.bamboo : M.woodLight);
  torus(broom, .023, .009, 0, .33, 0, M.woodDark);
  // 巷口界石与石墩。
  box(world, .27, .57, .24, -4.92, .50, 1.56, M.stoneLight, true);
  artPlane(world, lettering('松风巷', { vertical: true, width: 256, height: 512, size: 126, seal: false }), .13, .36, -4.92, .52, 1.689);
  for (const x of [-4.84, 4.95]) { cylinder(world, .18, .37, x, .406, 2.24, M.stone, .145, 8); sphere(world, x, .61, 2.24, .16, .08, .16, M.stoneLight); }
  // 外墙公告栏：纸与木框均为模型内元素。
  const board = group(world, -3.052, 2.08, -2.95, -Math.PI / 2);
  box(board, .36, .47, .032, 0, 0, 0, M.woodDark);
  artPlane(board, lettering('新茶初焙', { vertical: true, width: 256, height: 512, size: 104 }), .28, .36, 0, 0, .023);
  // 收拢的货架与卷起的席子。
  const rack = group(world, 3.59, .23, -.72, Math.PI / 2);
  for (const x of [-.28, .28]) box(rack, .045, 1.0, .065, x, .5, 0, M.woodDark);
  for (const yy of [.22, .53, .87]) box(rack, .63, .045, .16, 0, yy, 0, M.wood);
  createBookStack(rack, 0, .25, 0, 2, .8);
  // 右侧小庭：与街道相接，压低植物，保留建筑轮廓。
  box(world, 1.92, .045, 3.96, 4.68, .2, -.78, M.soil);
  for (let i = 0; i < 13; i++) {
    const rock = sphere(world, rand(3.78, 5.5), .25, rand(-2.48, .86), rand(.08,.22), rand(.035,.09), rand(.06,.16), i % 3 ? M.stone : M.moss); rock.rotation.y = random() * 3;
  }
  for (let i = 0; i < 5; i++) box(world, .46, .05, .36, 4.08 + i * .26, .257, .66 - i * .65, M.stoneLight);
  createBonsai(world, 4.90, .25, -.96, 1.18);
  createPottedPlant(world, 5.30, .23, -2.45, .75, 'bamboo');
  // 后方短墙与邻铺局部立面，不构造成宫殿或旅游商业街。
  box(world, 5.9, 1.01, .18, .15, .73, -5.38, M.wallSide, true);
  box(world, 6.03, .1, .26, .15, 1.28, -5.38, M.roof[0]);
  const neighbor = group(world, 4.62, .23, -3.79);
  box(neighbor, 2.04, 2.65, .10, 0, 1.42, -.92, M.wallSide);
  box(neighbor, .12, 2.68, 1.8, 1.02, 1.40, 0, M.wallSide);
  box(neighbor, 2.08, .38, .12, 0, .25, .93, M.stone);
  box(neighbor, 2.1, .58, .12, 0, 2.50, .93, M.wall);
  for (const xx of [-1.04, .02, 1.04]) box(neighbor, .12, 2.79, .14, xx, 1.44, .92, M.woodDark);
  box(neighbor, .95, 1.65, .06, -.52, 1.35, .92, M.woodDark);
  createWoodWindow(neighbor, .70, .88, -.52, 1.54, 1.01);
  box(neighbor, .81, 1.80, .018, .51, 1.34, .93, M.ink);
  createDoor(neighbor, .80, 1.85, .51, .43, .99, 0, -.42);
  createRoof(neighbor, 2.37, 2.24, 0, -.02, 2.83, .58);
  createBanner(neighbor, .30, .62, -.60, 2.26, 1.05, '墨');
  createLantern(neighbor, .85, 2.39, 1.14, .63, false);
  // 店角挑杆、布幌与两盏主灯。
  beam(world, V(-2.88, 3.15, 1.06), V(-3.38, 3.15, 1.64), .045, .045, M.woodDark);
  createBanner(world, .58, .94, -3.34, 3.06, 1.62, '茶', true, -.14);
  createLantern(world, -2.59, 2.63, 1.37, 1.03);
  createLantern(world, 3.04, 2.65, 1.38, .99);
  // 几片雨后落叶，均落在底座范围内。
  for (let i = 0; i < 17; i++) {
    const x = i < 9 ? rand(-5.3, -3.6) : rand(-2.7, 4.5), z = i < 9 ? rand(-4.5, 1.8) : rand(2.1, 4.6);
    const leaf = createLeaf(world, x, .237, z, rand(.22,.38), rand(0, 6.28), i % 3 ? M.bamboo : M.clay);
    leaf.rotation.x = .035; leaf.rotation.z = 0;
  }
}

// ── 12 · 雨歇水痕、灯光倒影、细小滴水 ──────────────────────────
const puddleTexture = canvasTexture(256, 256, (c, w, h) => {
  c.translate(w / 2, h / 2); c.beginPath();
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = 94 + Math.sin(a * 3) * 9 + Math.cos(a * 5) * 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? c.lineTo(x,y) : c.moveTo(x,y); }
  c.closePath(); const g = c.createRadialGradient(0,0,8,0,0,110); g.addColorStop(0, 'rgba(155,178,177,.80)'); g.addColorStop(.75, 'rgba(134,158,158,.58)'); g.addColorStop(1, 'rgba(134,158,158,0)'); c.fillStyle = g; c.fill();
});
const reflectionTexture = canvasTexture(128, 256, (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h * .26, 2, w / 2, h * .43, h * .49);
  g.addColorStop(0, 'rgba(245,214,152,.58)'); g.addColorStop(.36, 'rgba(245,207,135,.2)'); g.addColorStop(1, 'rgba(245,207,135,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, 13 + i * 18, w, rand(2,6)); }
});
function createPuddle(parent, x, z, width = 1, depth = .5, lit = false) {
  const g = group(parent, x, .242, z);
  const mat = new THREE.MeshPhongMaterial({ color: '#a0b7b4', map: puddleTexture, transparent: true, opacity: .30, shininess: 105, specular: '#a9bcb7', depthWrite: false, side: THREE.DoubleSide });
  const water = mesh(g, planeGeometry, mat, 0, 0, 0, false); water.rotation.x = -Math.PI / 2; water.scale.set(width, depth, 1); water.renderOrder = 1;
  if (lit) {
    const reflection = mesh(g, planeGeometry, new THREE.MeshBasicMaterial({ map: reflectionTexture, transparent: true, opacity: .38, depthWrite: false, color: '#ecd3a3' }), 0, .008, .06, false);
    reflection.rotation.x = -Math.PI / 2; reflection.scale.set(width * .57, depth * .96, 1); reflection.renderOrder = 2;
    animations.reflections.push({ mesh: reflection, phase: rand(0,6) });
  }
  for (let i = 0; i < 2; i++) {
    const ripple = mesh(g, geometry('water-ring', () => new THREE.RingGeometry(.92, 1, 32)), new THREE.MeshBasicMaterial({ color: '#d5ded2', side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false }), -.10 + i * .15, .007, .025, false);
    ripple.rotation.x = -Math.PI / 2; ripple.scale.setScalar(.01); ripple.renderOrder = 3;
    animations.ripples.push({ mesh: ripple, phase: i * 1.55 + rand(0,4), max: Math.min(width, depth) * .36 });
  }
  puddleGroups.push(g);return g;
}
function createRainRemnants() {
  createPuddle(world, -2.45, 2.52, 1.15, .56, true);
  createPuddle(world, 3.00, 2.53, 1.14, .60, true);
  createPuddle(world, -.83, 2.83, 1.55, .45, true);
  createPuddle(world, -4.45, .32, .58, 1.14);
  createPuddle(world, -4.96, -2.62, .67, .77);
  createPuddle(world, 1.58, 4.24, 1.20, .41);
  createPuddle(world, -3.42, 4.89, .70, .35);
  const dropMaterial = new THREE.MeshPhongMaterial({ color: '#c5ddda', transparent: true, opacity: .42, shininess: 70, depthWrite: false });
  for (const [x,z] of [[-2.46,1.48], [.03,1.48], [2.78,1.48], [-3.37,-1.28]]) {
    const drop = sphere(world, x, 3.48, z, .015, .032, .015, dropMaterial); drop.castShadow = false; drop.receiveShadow = false; drop.visible = false;
    animations.drops.push({ mesh: drop, x, z, start: 3.5, phase: rand(0,8), period: rand(5.4,9.6) });
    createPuddle(world, x, z + .13, .31, .21);
  }
}

// ── 13 · 组装；共享几何体、静态实例批处理、细轮廓 ────────────────
createBase();
createStoneRoad();
const shop = createShop();
createInterior(shop);
const roofAssembly = group(world, 0, 0, 0, 0, true);
createRoof(roofAssembly, 6.92, 5.20, .22, -1.15, 3.54, 1.14);
createStreetObjects();
createRainRemnants();

function createOutlines() {
  world.updateMatrixWorld(true);
  const points = [], edges = new THREE.EdgesGeometry(cubeGeometry, 30), source = edges.attributes.position;
  const v = new THREE.Vector3();
  for (const object of outlineMeshes) {
    let parent = object.parent;
    while (parent && parent !== roofAssembly) parent = parent.parent;
    if (parent === roofAssembly) continue;
    for (let i = 0; i < source.count; i++) { v.fromBufferAttribute(source, i).applyMatrix4(object.matrixWorld); points.push(v.x, v.y, v.z); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#35413b', transparent: true, opacity: .25 })); scene.add(lines); edges.dispose();
}
function batchStaticMeshes() {
  world.updateMatrixWorld(true);
  const roots = [world];
  world.traverse(object => { if (object.userData.animated) roots.push(object); });
  for (const root of roots) {
    const batches = new Map(), inverse = root.matrixWorld.clone().invert();
    root.traverse(object => {
      if (!object.isMesh || !object.geometry || Array.isArray(object.material) || object.material.transparent) return;
      let node = object;
      while (node && node !== root) { if (node.userData.animated) return; node = node.parent; }
      const key = `${object.geometry.uuid}:${object.material.uuid}:${object.castShadow}`;
      if (!batches.has(key)) batches.set(key, []); batches.get(key).push(object);
    });
    for (const objects of batches.values()) {
      if (objects.length < 3) continue;
      const first = objects[0], instanced = new THREE.InstancedMesh(first.geometry, first.material, objects.length);
      instanced.castShadow = first.castShadow; instanced.receiveShadow = true;
      objects.forEach((object, i) => instanced.setMatrixAt(i, inverse.clone().multiply(object.matrixWorld)));
      instanced.instanceMatrix.needsUpdate = true; instanced.computeBoundingSphere();
      objects.forEach(object => object.removeFromParent()); root.add(instanced);
    }
  }
}
createOutlines();
batchStaticMeshes();

// ── 14 · 动效：静中有动，动而不扰 ──────────────────────────────
const clock = new THREE.Clock();
let elapsed = 0, lastFrame = 0, frameCount = 0, sampleTime = 0, renderFrame = 0;
let roofOpacity = 1;
let roofTarget = 1;
const targetBeforeClamp = new THREE.Vector3();
const panCorrection = new THREE.Vector3();

function updateAnimations(t) {
  const motion = reducedMotion ? 0 : environment.wind;
  for (const { paper, point, halo, group: g, phase } of animations.lanterns) {
    const f = .5 * Math.sin(t * .83 + phase) + .5 * Math.sin(t * 1.37 + phase);
    paper.emissiveIntensity = (.64 + f * .045 * motion) * environment.glow;
    if (point) point.intensity = (2.4 + f * .09 * motion) * environment.glow;
    halo.material.opacity = (.39 + f * .025 * motion) * environment.glow;
    g.rotation.z = Math.sin(t * .52 + phase) * .009 * motion;
  }
  interiorLight.intensity = (6.5 + Math.sin(t * .77) * .13 * motion) * environment.glow;
  entranceLight.intensity = (2.7 + Math.sin(t * .69 + 1.1) * .065 * motion) * environment.glow;
  for (const { mesh: m, rest, height, phase, amplitude } of animations.cloth) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const influence = Math.min(1, Math.max(0, -rest[i * 3 + 1] / height));
      p.setZ(i, rest[i * 3 + 2] + Math.sin(t * .84 + phase + rest[i * 3] * 2.2 - influence * .9) * amplitude * influence * motion);
      p.setX(i, rest[i * 3] + Math.sin(t * .57 + phase) * .008 * influence * motion);
    }
    p.needsUpdate = true;
    if (renderFrame % 6 === 0) m.geometry.computeVertexNormals();
  }
  for (const { group: g, phase, strength } of animations.branches) g.rotation.z = Math.sin(t * .62 + phase) * strength * motion;
  for (const { mesh: m, phase, max } of animations.ripples) {
    const cycle = (t + phase) % 4.9;
    const progress = cycle / 1.65;
    m.visible = config.weather === 'rain' && progress < 1 && !reducedMotion;
    if (m.visible) { m.scale.setScalar(.015 + progress * max); m.material.opacity = Math.sin(progress * Math.PI) * .12; }
  }
  for (const { mesh: m, phase } of animations.reflections) m.material.opacity = .36 + Math.sin(t * .79 + phase) * .016 * motion;
  for (const d of animations.drops) {
    const cycle = (t + d.phase) % d.period; d.mesh.visible = config.weather === 'rain' && cycle < .81 && !reducedMotion;
    if (d.mesh.visible) d.mesh.position.y = d.start - 4.9 * cycle * cycle;
    if (d.mesh.position.y < .245) d.mesh.visible = false;
  }
  // 靠近时渐隐瓦片，方便检查真实陈设；正常观景距离保留完整屋顶。
  const distance = camera.position.distanceTo(controls.target);
  const desired = config.cutaway ? .06 : THREE.MathUtils.smoothstep(distance, 11.7, 17.2) * .96 + .04;
  roofTarget = desired;
  if (reducedMotion) roofOpacity = desired;
  else roofOpacity += (desired - roofOpacity) * .08;
  if (Math.abs(roofOpacity - desired) < .002) roofOpacity = desired;
  for (const material of roofMaterials) {
    const transparent = roofOpacity < .995;
    if (material.transparent !== transparent) { material.transparent = transparent; material.depthWrite = !transparent; material.needsUpdate = true; }
    material.opacity = roofOpacity;
  }
}

// ── 四季、天气与可定制雅间 ──────────────────────────────────
const roofColors = roofMaterials.map(material => material.color.clone());
const roadColors = M.pavement.map(material => material.color.clone());
const particles = new THREE.Group();scene.add(particles);
const rainCount = 340;
const rainPositions = new Float32Array(rainCount * 6);
const rainOrigins = Array.from({ length: rainCount }, () => ({ x: rand(-7, 7), y: rand(.4, 10), z: rand(-6, 6) }));
const rainGeometry = new THREE.BufferGeometry();rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#dce9ed', transparent: true, opacity: .42, depthWrite: false }));
rain.frustumCulled = false;particles.add(rain);
const snowCount = 240;
const snowPositions = new Float32Array(snowCount * 3);
const snowOrigins = Array.from({ length: snowCount }, () => ({ x: rand(-7, 7), y: rand(.4, 9), z: rand(-6, 6), phase: rand(0, 7) }));
const snowTexture = canvasTexture(32, 32, c => { const gradient = c.createRadialGradient(16, 16, 0, 16, 16, 15);gradient.addColorStop(0, '#fff');gradient.addColorStop(.5, '#ffffffdf');gradient.addColorStop(1, '#ffffff00');c.fillStyle = gradient;c.fillRect(0, 0, 32, 32); });
const snowGeometry = new THREE.BufferGeometry();snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3));
const snow = new THREE.Points(snowGeometry, new THREE.PointsMaterial({ color: '#ffffff', size: .11, map: snowTexture, transparent: true, opacity: .88, depthWrite: false }));
snow.frustumCulled = false;particles.add(snow);

function updateWeather(t) {
  rain.visible = config.weather === 'rain' && !reducedMotion;
  snow.visible = config.weather === 'snow' && !reducedMotion;
  if (rain.visible) {
    rainOrigins.forEach((p, i) => {
      let y = ((p.y - t * 5.5) % 10 + 10) % 10;
      if (p.x > -3.6 && p.x < 3.9 && p.z > -3.9 && p.z < 1.5 && y < 4.8) y = -100;
      rainPositions.set([p.x, y, p.z, p.x + .08, y - .27, p.z], i * 6);
    });
    rainGeometry.attributes.position.needsUpdate = true;
  }
  if (snow.visible) {
    snowOrigins.forEach((p, i) => {
      let y = ((p.y - t * .5) % 9 + 9) % 9;
      if (p.x > -3.6 && p.x < 3.9 && p.z > -3.9 && p.z < 1.5 && y < 4.8) y = -100;
      snowPositions.set([p.x + Math.sin(t * .38 + p.phase) * .6, y, p.z + Math.cos(t * .25 + p.phase) * .28], i * 3);
    });
    snowGeometry.attributes.position.needsUpdate = true;
  }
}

function applyEnvironment(next) {
  const previousName = config.name;
  config = normalizeRoom(next);
  const season = SEASONS[config.season];
  [M.leaf, M.leafLight, M.leafDark].forEach((material, i) => material.color.set(season.leaf[i]));
  roofAssembly.visible = !config.cutaway;
  const snowy = config.weather === 'snow';
  roofMaterials.forEach((material, i) => material.color.copy(roofColors[i]).lerp(new THREE.Color('#f3f5f0'), snowy ? .88 : config.season === 'winter' ? .16 : 0));
  M.pavement.forEach((material, i) => material.color.copy(roadColors[i]).lerp(new THREE.Color('#e4ebe9'), snowy ? .6 : 0));
  puddleGroups.forEach(group => { group.visible = config.weather === 'rain'; });
  const night = config.light === 'night';
  const day = config.light === 'day';
  const overcast = config.weather !== 'clear';
  const skyCenter = night ? '#596875' : day ? season.sky[0] : '#d3c7b2';
  const skyEdge = night ? '#263943' : overcast ? '#9aafb4' : season.sky[1];
  container.style.setProperty('--room-sky-center', skyCenter);
  container.style.setProperty('--room-sky-edge', skyEdge);
  scene.fog.color.set(skyEdge);
  scene.fog.near = config.weather === 'fog' ? 15 : 34;
  scene.fog.far = config.weather === 'fog' ? 48 : snowy ? 65 : 85;
  ambientLight.color.set(night ? '#a6b6ca' : '#e0e8df');ambientLight.intensity = night ? .22 : day ? .55 : .36;
  hemisphereLight.intensity = night ? .38 : day ? 1 : .75;
  dusk.color.set(night ? '#9eafd3' : day ? '#fff2d5' : '#f5d6ad');
  dusk.intensity = (night ? .55 : day ? 1.75 : 1.15) * (overcast ? .72 : 1);
  coolFill.intensity = night ? .3 : .43;
  renderer.toneMappingExposure = night ? .9 : day ? 1.03 : .98;
  environment.glow = night ? 1.22 : day ? .45 : 1;
  environment.wind = config.weather === 'rain' ? 1.45 : config.season === 'summer' ? .75 : 1;
  if (namePlaque && (previousName !== config.name || !namePlaque.userData.personalized)) {
    const old = namePlaque.material.map;
    namePlaque.material.map = lettering(config.name, { dark: true, size: Math.min(135, Math.floor(600 / Array.from(config.name).length)) });
    namePlaque.material.needsUpdate = true;namePlaque.userData.personalized = true;old?.dispose();
  }
  container.dataset.season = config.season;container.dataset.weather = config.weather;container.dataset.light = config.light;
  container.dataset.cutaway = String(config.cutaway);
  renderer.domElement.setAttribute('aria-label', `${config.name}，${season.name}，${config.weather === 'clear' ? '晴天' : config.weather === 'rain' ? '雨天' : config.weather === 'snow' ? '雪天' : '雾天'}的宋式三维场景。可拖动旋转，方向键转动，加减键缩放。`);
  requestFrame();
}

function resize() {
  const oldAspect = camera.aspect;
  camera.aspect = Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1);
  camera.fov = camera.aspect < .82 ? 52 : 36;camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  if ((oldAspect < .82) !== (camera.aspect < .82)) fitCamera();
  requestFrame();
}
function renderScene() {
  controls.update();
  targetBeforeClamp.copy(controls.target);
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, -2.7, 2.7);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, -2.7, 2.7);
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, .55, 2.8);
  camera.position.add(panCorrection.copy(controls.target).sub(targetBeforeClamp));
  updateAnimations(elapsed);updateWeather(elapsed);
  renderer.render(scene, camera);renderFrame++;
}
function requestFrame() {
  if (!frameRequest && !destroyed && inView && !document.hidden) frameRequest = requestAnimationFrame(animate);
}
function animate(now) {
  frameRequest = 0;
  if (destroyed || !inView || document.hidden) return;
  if (!reducedMotion && now - lastFrame < 32) { requestFrame();return; }
  elapsed += Math.min(clock.getDelta(), .05);
  renderScene();
  if (frameCount < 120 && lastFrame) { sampleTime += now - lastFrame;frameCount++; }
  if (frameCount === 120) {
    if (sampleTime / frameCount > 50 && renderer.getPixelRatio() > 1) renderer.setPixelRatio(1);
    frameCount++;
  }
  lastFrame = now;
  if (!reducedMotion || Math.abs(roofOpacity - roofTarget) > .03) requestFrame();
}
function stop() { if (frameRequest) cancelAnimationFrame(frameRequest);frameRequest = 0; }
function handleVisibility() { clock.getDelta();lastFrame = 0;if (document.hidden) stop();else requestFrame(); }
function handleMotion() { reducedMotion = motionPreference.matches;controls.enableDamping = !reducedMotion;requestFrame(); }
function contextLost(event) { event.preventDefault();stop();onFailure(new Error('三维画面连接暂时中断，请重新载入雅间。')); }
function keyControl(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Home') { fitCamera();requestFrame();return; }
  const offset = camera.position.clone().sub(controls.target);const spherical = new THREE.Spherical().setFromVector3(offset);
  if (event.key === 'ArrowLeft') spherical.theta -= .12;
  if (event.key === 'ArrowRight') spherical.theta += .12;
  if (event.key === 'ArrowUp') spherical.phi -= .09;
  if (event.key === 'ArrowDown') spherical.phi += .09;
  if (event.key === '+' || event.key === '=') spherical.radius *= .9;
  if (event.key === '-') spherical.radius *= 1.1;
  spherical.radius = THREE.MathUtils.clamp(spherical.radius, controls.minDistance, controls.maxDistance);
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();requestFrame();
}
const resizeObserver = new ResizeObserver(resize);resizeObserver.observe(container);
const intersectionObserver = new IntersectionObserver(entries => {
  inView = entries[0].isIntersecting;
  clock.getDelta();lastFrame = 0;
  if (inView) requestFrame();else stop();
}, { threshold: .01 });intersectionObserver.observe(container);
document.addEventListener('visibilitychange', handleVisibility);
motionPreference.addEventListener('change', handleMotion);
renderer.domElement.addEventListener('webglcontextlost', contextLost);
renderer.domElement.addEventListener('keydown', keyControl);
controls.addEventListener('change', requestFrame);
controls.enableDamping = !reducedMotion;
applyEnvironment(config);renderScene();container.dataset.ready = 'true';
return {
  setState: applyEnvironment,
  resetView() { fitCamera();requestFrame(); },
  zoom(factor) { const offset = camera.position.clone().sub(controls.target);const radius = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);camera.position.copy(controls.target).add(offset.setLength(radius));controls.update();requestFrame(); },
  async capture() {
    renderScene();
    const output = document.createElement('canvas');output.width = renderer.domElement.width;output.height = renderer.domElement.height;
    const context = output.getContext('2d');
    const sky = context.createRadialGradient(output.width * .47, output.height * .35, 0, output.width * .47, output.height * .35, Math.max(output.width, output.height) * .8);
    sky.addColorStop(0, container.style.getPropertyValue('--room-sky-center'));sky.addColorStop(1, container.style.getPropertyValue('--room-sky-edge'));
    context.fillStyle = sky;context.fillRect(0, 0, output.width, output.height);context.drawImage(renderer.domElement, 0, 0);
    return new Promise((resolve, reject) => output.toBlob(blob => blob ? resolve(blob) : reject(new Error('保存画面失败，请重试。')), 'image/png'));
  },
  dispose() {
    destroyed = true;stop();resizeObserver.disconnect();intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);motionPreference.removeEventListener('change', handleMotion);
    renderer.domElement.removeEventListener('webglcontextlost', contextLost);renderer.domElement.removeEventListener('keydown', keyControl);
    controls.dispose();
    const geometries = new Set();const materials = new Set();const textures = new Set();
    scene.traverse(object => { if (object.geometry) geometries.add(object.geometry);for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) materials.add(material); });
    materials.forEach(material => { Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });material.dispose(); });
    geometries.forEach(geometry => geometry.dispose());textures.forEach(texture => texture.dispose());
    renderer.dispose();renderer.domElement.remove();delete container.dataset.ready;
  }
};
}
