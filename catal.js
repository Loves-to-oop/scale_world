// catal.js -- a day in Çatalhöyük, about 7000 BC. Built into catalhoyuk.html by build.py.
//
// What it rests on (excavations by Mellaart, 1960s, and Hodder's project, 1993-2017): a 13 ha mound of mud-brick
// houses built wall to wall with no streets; entry by ladder through the roof, beside the oven; white plastered walls,
// repainted and replastered again and again; raised platforms with the dead buried beneath; plastered aurochs skulls
// (bucrania) and red paintings; open middens between houses; 3,500-8,000 people at most. Around it the Konya plain,
// the Çarşamba river, seasonal marsh, cereal fields further out; sheep and goats herded, aurochs hunted; obsidian
// brought from the Cappadocian volcanoes; the twin-peaked Hasan Dağ on the horizon. The landscape is generated
// fresh from a seed (?seed=2 for another); the town plan is generated too, at the real size and density.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const Q = new URLSearchParams(location.search), SEED = Math.max(1, Number(Q.get("seed") || 1) | 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 40000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const O3 = new THREE.Object3D(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
let s0 = (SEED * 48271) % 2147483647 || 1; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const seeded = n => { let s = (Math.imul(n | 0, 2654435761) ^ (SEED * 40503)) >>> 0 || 1; return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296; };

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(SEED, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z) { let a = 0, f = 1, w = 0.5; for (let k = 0; k < 4; k++) { a += w * vnoise(x * f, z * f); f *= 2.03; w *= 0.5; } return a / 0.9375; }

// ---------- the land: plain, two river channels, marsh, the mound ----------
const WATER = -1.0;
const rivW = z => -430 + 90 * Math.sin(z / 380 + SEED) + 70 * (fbm(z / 260, 3.7) - 0.5) * 2;
const rivE = z => 480 + 70 * Math.sin(z / 330 + 2 * SEED) + 60 * (fbm(z / 240, 9.1) - 0.5) * 2;
const riverD = (x, z) => Math.min(Math.abs(x - rivW(z)) - 4, Math.abs(x - rivE(z)));
function plainH(x, z) {
  let h = (fbm(x / 700 + 11, z / 700) - 0.5) * 3.2 + (fbm(x / 110, z / 110 + 5) - 0.5) * 0.5;
  h = Math.max(h, -0.55);
  const d = riverD(x, z), wet = fbm(x / 160 + 40, z / 160);
  if (d < 220) h = THREE.MathUtils.lerp(Math.min(h, -0.85 + 0.6 * wet), h, THREE.MathUtils.smoothstep(d, 90, 220));   // marsh: down near the water
  if (d < 40) h = Math.min(h, THREE.MathUtils.lerp(-2.8, -0.9, THREE.MathUtils.smoothstep(d, 10, 40)));                 // the channel
  const r = Math.hypot(x, z); h += THREE.MathUtils.smoothstep(r, 1500, 2200) * 45 * fbm(x / 500, z / 500 + 2);           // low hills at the edge
  return h; }
const MX = 230, MZ = 150, MH = 17;                         // the mound: 460 × 300 m, 17 m high
function moundH(x, z) { const q = (x / MX) ** 2 + (z / MZ) ** 2; return q < 1 ? MH * Math.pow(1 - q, 0.65) + (fbm(x / 30, z / 30) - 0.5) * 0.8 * (1 - q) : 0; }
const terrainH = (x, z) => plainH(x, z) + moundH(x, z);

// ---------- the town: a grid of houses and middens ----------
const CELL = 6.4, GX0 = -MX, GZ0 = -MZ, NX = Math.ceil(2 * MX / CELL), NZ = Math.ceil(2 * MZ / CELL);
const cell = new Int8Array(NX * NZ), roof = new Float32Array(NX * NZ), houseAt = new Int32Array(NX * NZ).fill(-1), HOUSES = [];
const cc = (ix, iz) => [GX0 + (ix + 0.5) * CELL, GZ0 + (iz + 0.5) * CELL];
for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) {
  const [x, z] = cc(ix, iz), q = (x / MX) ** 2 + (z / MZ) ** 2, k = iz * NX + ix;
  if (q > 0.86 || moundH(x, z) < 2) continue;
  const open = fbm(x / 38 + 70, z / 38) < 0.36 || hash(ix + 900, iz) < 0.1;
  if (open) { cell[k] = 2; continue; }                      // a midden / yard
  cell[k] = 1; const r = hash(ix, iz + 500), ry = terrainH(x, z) + 2.9 + (r - 0.5) * 1.1;
  roof[k] = ry; houseAt[k] = HOUSES.length;
  HOUSES.push({ ix, iz, x, z, roofY: ry, baseY: terrainH(x, z) - 2.5, hatch: V3(x + 0.7, ry, z + CELL / 2 - 1.15), seed: (ix * 131 + iz * 977) | 0 }); }
const cellIdx = (x, z) => { const ix = Math.floor((x - GX0) / CELL), iz = Math.floor((z - GZ0) / CELL); return ix < 0 || iz < 0 || ix >= NX || iz >= NZ ? -1 : iz * NX + ix; };
function outsideH(x, z) { const k = cellIdx(x, z); return k >= 0 && cell[k] === 1 ? roof[k] : terrainH(x, z); }

// ladders: one in every midden against a neighbouring house, and some round the edge of the town
const LADDERS = [], ladderGrid = new Map();
for (let iz = 0; iz < NZ; iz++) for (let ix = 0; ix < NX; ix++) { const k = iz * NX + ix; if (cell[k] === 1) continue;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => { const jx = ix + dx, jz = iz + dz; return jx >= 0 && jz >= 0 && jx < NX && jz < NZ && cell[jz * NX + jx] === 1; });
  if (!dirs.length || (cell[k] === 0 && hash(ix + 77, iz) > 0.22)) continue;
  const [dx, dz] = dirs[(hash(ix, iz + 33) * dirs.length) | 0], [x, z] = cc(ix, iz), wx = x + dx * CELL / 2, wz = z + dz * CELL / 2;
  const off = (hash(ix + 5, iz + 5) - 0.5) * 3, fx = wx - dx * 0.9 + (dz ? off : 0), fz = wz - dz * 0.9 + (dx ? off : 0);
  const top = roof[(iz + dz) * NX + ix + dx], foot = terrainH(fx, fz);
  const L = { x: fx, z: fz, tx: wx + dx * 0.25 + (dz ? off : 0), tz: wz + dz * 0.25 + (dx ? off : 0), foot, top, dx, dz, edge: cell[k] === 0 };
  LADDERS.push(L); const key = k; if (!ladderGrid.has(key)) ladderGrid.set(key, []); ladderGrid.get(key).push(L);
  const k2 = (iz + dz) * NX + ix + dx; if (!ladderGrid.has(k2)) ladderGrid.set(k2, []); ladderGrid.get(k2).push(L); }
function nearLadder(x, z) { const k = cellIdx(x, z); if (k < 0) return null;
  for (const L of ladderGrid.get(k) || []) { const mx = (L.x + L.tx) / 2, mz = (L.z + L.tz) / 2; if (Math.hypot(x - mx, z - mz) < 1.5) return L; } return null; }

// ---------- sky, sun, fog ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.55)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), skyMat); scene.add(sky);
scene.fog = new THREE.FogExp2(0xc8d4d8, IS_HEADSET ? 0.0011 : 0.0006);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xbfd4e6, 0x8a7a5a, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(160, 24), new THREE.MeshBasicMaterial({ color: 0xfff6e0, fog: false, toneMapped: false })); scene.add(sunDisc);

// ---------- ground meshes: the wide land, and a fine patch over the mound ----------
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const speckle = (base, n, cols, size = 2) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let k = 0; k < n; k++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.globalAlpha = 0.25 + rnd() * 0.4; g.fillRect(rnd() * w, rnd() * h, size * (0.5 + rnd()), size * (0.5 + rnd())); } g.globalAlpha = 1; };
const groundTex = tex(256, 256, speckle("#bdbdbd", 5000, ["#e8e8e8", "#8a8a8a", "#a0a0a0"]), [1, 1]);
function groundMesh(x0, z0, w, d, n, sink) {
  const geo = new THREE.PlaneGeometry(w, d, n, Math.round(n * d / w)).rotateX(-Math.PI / 2), p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color(), uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + x0, z = p.getZ(i) + z0, h = terrainH(x, z), inPatch = sink && Math.abs(x) < 255 && Math.abs(z) < 170;
    p.setX(i, x); p.setZ(i, z); p.setY(i, inPatch ? h - 1.2 : h); uv.setXY(i, x / 6, z / 6);
    const dr = riverD(x, z), m = moundH(x, z), n1 = fbm(x / 60, z / 60);
    c.setRGB(0.55 + 0.1 * n1, 0.55 + 0.08 * n1, 0.36);                                              // dry steppe grass, early summer
    if (h < -0.5) c.lerp(new THREE.Color(0.30, 0.42, 0.22), THREE.MathUtils.clamp((-0.5 - h) / 0.4, 0, 1));   // marsh green
    if (dr < 30 || h < WATER + 0.1) c.lerp(new THREE.Color(0.40, 0.36, 0.28), 0.6);                    // mud banks
    if (m > 0.3) c.lerp(new THREE.Color(0.55, 0.47, 0.36), Math.min(1, m / 2));                         // the mound: trodden earth and midden
    if (h > 8) c.lerp(new THREE.Color(0.58, 0.52, 0.40), Math.min(1, (h - 8) / 20));
    col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: groundTex, roughness: 0.95 })); scene.add(mesh); return mesh; }
groundMesh(0, 0, 4400, 4400, IS_HEADSET ? 130 : 220, true);
groundMesh(0, 0, 510, 340, IS_HEADSET ? 128 : 200, false);
{ const w = new THREE.Mesh(new THREE.PlaneGeometry(4400, 4400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5d7f86, roughness: 0.4, metalness: 0.05 }));   // opaque: a transparent sheet this size costs a lot
  w.position.y = WATER; scene.add(w); }

// distant mountains: the twin-peaked Hasan Dağ to the east-north-east (3,268 m, ~130 km off: drawn smaller and nearer at the
// same angular size) and the Taurus range low to the south
const mtnMat = new THREE.MeshBasicMaterial({ color: 0x8fa4b4, fog: false });
function peak(x, z, r, h, snow) { const g = new THREE.ConeGeometry(r, h, 48, 8), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), f = 1 + 0.18 * (fbm(p.getX(i) / 300 + x, p.getZ(i) / 300) - 0.5) * (y < h / 2 ? 1 : 0.3); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
  const m = new THREE.Mesh(g, mtnMat); m.position.set(x, h / 2 - 20, z); scene.add(m);
  if (snow) { const s = new THREE.Mesh(new THREE.ConeGeometry(r * 0.16, h * 0.16, 32), new THREE.MeshBasicMaterial({ color: 0xe6eef4, fog: false })); s.position.set(x, h - h * 0.08 - 20, z); scene.add(s); } }
{ const d = 22000, a = -0.42; const hx = d * Math.cos(a), hz = d * Math.sin(a);
  peak(hx, hz, 1500, 560, true); peak(hx + 900, hz + 500, 1100, 470, true); peak(hx - 1600, hz - 300, 2600, 230, false);
  for (let k = 0; k < 9; k++) { const t = -0.5 + k / 8, ang = Math.PI / 2 + t * 1.3; peak(26000 * Math.cos(ang), 26000 * Math.sin(ang), 3000 + rnd() * 2000, 300 + rnd() * 350, false); } }

// ---------- houses ----------
const mud = tex(256, 256, speckle("#a8946f", 4000, ["#8a7550", "#c2ad86", "#6e5c40"]), [2, 2]);
const NH = HOUSES.length;
const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: mud, roughness: 0.95 }), NH);
const hatches = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.06, 0.8), M(0x1a140e), NH);
const roofLip = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.18, 0.25), M(0x9a8460), NH);   // a little kerb by the hatch
const hcol = new THREE.Color();
HOUSES.forEach((h, i) => { const ht = h.roofY - h.baseY; O3.position.set(h.x, h.baseY + ht / 2, h.z); O3.rotation.set(0, 0, 0); O3.scale.set(CELL + 0.02, ht, CELL + 0.02); O3.updateMatrix(); bodies.setMatrixAt(i, O3.matrix);
  hcol.setHSL(0.09 + 0.02 * hash(h.ix, h.iz), 0.25 + 0.1 * hash(h.iz, h.ix), 0.6 + 0.1 * hash(h.ix + 3, h.iz)); bodies.setColorAt(i, hcol);
  O3.position.set(h.hatch.x, h.roofY + 0.02, h.hatch.z); O3.scale.set(1, 1, 1); O3.updateMatrix(); hatches.setMatrixAt(i, O3.matrix);
  O3.position.set(h.hatch.x, h.roofY + 0.09, h.hatch.z + 0.55); O3.updateMatrix(); roofLip.setMatrixAt(i, O3.matrix); });
for (const m of [bodies, hatches, roofLip]) { m.frustumCulled = false; scene.add(m); }
// a merged-geometry helper (three.js core has no BufferGeometryUtils)
function merge(parts) { let n = 0; const gs = parts.map(([g, mat]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(mat); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const q of gs) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); return out; }
const TM = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(s, s, s));
// a unit ladder (1 m tall, rungs every 30 cm when scaled to 3 m): rails and rungs
const ladderGeo = (() => { const parts = []; for (const sx of [-0.22, 0.22]) parts.push([new THREE.BoxGeometry(0.06, 1, 0.06), TM(sx, 0.5, 0)]);   // boxes: ~100 triangles a ladder, and there are thousands
  for (let k = 1; k < 8; k++) parts.push([new THREE.BoxGeometry(0.44, 0.035, 0.035), TM(0, k / 8, 0)]); return merge(parts); })();
const woodM = M(0x6b4a2a);
const ladderTops = new THREE.InstancedMesh(ladderGeo, woodM, NH);   // the hatch ladders poke up out of every roof
HOUSES.forEach((h, i) => { O3.position.set(h.hatch.x, h.roofY - 0.2, h.hatch.z - 0.1); O3.rotation.set(-0.12, 0, 0); O3.scale.set(1, 1.4, 1); O3.updateMatrix(); ladderTops.setMatrixAt(i, O3.matrix); });
ladderTops.frustumCulled = false; scene.add(ladderTops);
const outLadders = new THREE.InstancedMesh(ladderGeo, woodM, LADDERS.length);
LADDERS.forEach((L, i) => { const H = L.top - L.foot + 0.9, lean = Math.atan2(0.9, H); O3.position.set(L.x, L.foot, L.z); O3.rotation.set(0, 0, 0);
  O3.rotation.set(L.dz ? lean * L.dz : 0, 0, L.dx ? -lean * L.dx : 0); O3.scale.set(1, H / Math.cos(lean), 1); O3.updateMatrix(); outLadders.setMatrixAt(i, O3.matrix); });
outLadders.frustumCulled = false; scene.add(outLadders);
// roof clutter: bread ovens on some roofs, bundles of reeds, pots, fuel cakes
const clutter = { ovens: [], reeds: [], pots: [] };
HOUSES.forEach(h => { const r = hash(h.ix + 21, h.iz + 3); if (r < 0.08) clutter.ovens.push(h); else if (r < 0.2) clutter.reeds.push(h); else if (r < 0.32) clutter.pots.push(h); });
function scatterOnRoofs(list, geo, mat, place) { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((h, i) => { place(h, O3); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }); im.frustumCulled = false; scene.add(im); return im; }
scatterOnRoofs(clutter.ovens, new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9a7a56), (h, o) => { o.position.set(h.x - 1.6, h.roofY, h.z - 1.2); o.rotation.set(0, 0, 0); o.scale.set(1, 0.8, 1); });
scatterOnRoofs(clutter.reeds, new THREE.CylinderGeometry(0.18, 0.18, 1.8, 8).rotateZ(Math.PI / 2), M(0xb8a466), (h, o) => { o.position.set(h.x - 1.2, h.roofY + 0.2, h.z - 1.8); o.rotation.set(0, hash(h.ix, 9) * 3, 0); o.scale.set(1, 1, 1); });
scatterOnRoofs(clutter.pots, new THREE.SphereGeometry(0.22, 10, 8), M(0x6e4a30), (h, o) => { o.position.set(h.x + 1.8, h.roofY + 0.18, h.z - 1.5); o.rotation.set(0, 0, 0); o.scale.set(1, 1.2, 1); });
// smoke from roof hatches and ovens
const SMOKERS = HOUSES.filter(h => hash(h.ix + 4, h.iz + 8) < 0.12 && Math.hypot(h.x - 18, h.z - 30) > 25).map(h => V3(h.hatch.x, h.roofY + 0.3, h.hatch.z)).concat(clutter.ovens.map(h => V3(h.x - 1.6, h.roofY + 0.45, h.z - 1.2)));
const NSM = Math.min(SMOKERS.length, IS_HEADSET ? 70 : 160) * 10, smPos = new Float32Array(NSM * 3), smAge = new Float32Array(NSM);
for (let i = 0; i < NSM; i++) smAge[i] = rnd() * 12;
const smoke = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(smPos, 3)),
  new THREE.PointsMaterial({ color: 0xd8d4cc, size: 2.2, transparent: true, opacity: 0.3, depthWrite: false, map: tex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); }) })); smoke.frustumCulled = false; scene.add(smoke);

// ---------- marsh reeds, fields, trees ----------
{ const pts = []; for (let k = 0; k < 40000 && pts.length < (IS_HEADSET ? 2500 : 6000); k++) { const side = rnd() < 0.5, z = (rnd() - 0.5) * 3000, x = (side ? rivW(z) : rivE(z)) + (rnd() - 0.5) * 420, h = terrainH(x, z);
    if (h > WATER - 0.25 && h < WATER + 0.35 && Math.hypot(x, z) > 200) pts.push([x, h, z]); }
  const im = new THREE.InstancedMesh(new THREE.ConeGeometry(0.35, 2.2, 5).translate(0, 1.1, 0), M(0x7c8a4a, { roughness: 0.9 }), pts.length), c = new THREE.Color();
  pts.forEach(([x, h, z], i) => { O3.position.set(x, h, z); O3.rotation.set((rnd() - 0.5) * 0.2, rnd() * 6, (rnd() - 0.5) * 0.2); O3.scale.set(0.7 + rnd() * 0.8, 0.7 + rnd() * 0.7, 0.7 + rnd() * 0.8); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix);
    c.setHSL(0.17 + rnd() * 0.05, 0.35, 0.32 + rnd() * 0.12); im.setColorAt(i, c); });
  im.frustumCulled = false; scene.add(im); var REEDS = pts; }
const FIELDS = [];
{ const barley = tex(128, 128, (g, w, h) => { g.fillStyle = "#c8a85a"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = "#a88a44"; g.fillRect(0, y, w, 3); } for (let k = 0; k < 900; k++) { g.fillStyle = rnd() < 0.5 ? "#e0c878" : "#8a7034"; g.fillRect(rnd() * w, rnd() * h, 1, 3); } }, [1, 1]);
  const green = tex(128, 128, (g, w, h) => { g.fillStyle = "#8a9a4a"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) { g.fillStyle = "#6e7e3a"; g.fillRect(0, y, w, 3); } }, [1, 1]);
  for (let k = 0; k < 400 && FIELDS.length < 16; k++) { const a = rnd() * 6.283, r = 420 + rnd() * 700, x = r * Math.cos(a), z = r * Math.sin(a) * 0.8;
    if (riverD(x, z) < 120 || plainH(x, z) < -0.3 || FIELDS.some(f => Math.hypot(f.x - x, f.z - z) < 90)) continue;
    const w = 35 + rnd() * 30, d = 45 + rnd() * 35, rot = rnd() * 3, geo = new THREE.PlaneGeometry(w, d, 8, 8).rotateX(-Math.PI / 2), p = geo.attributes.position, cs = Math.cos(rot), sn = Math.sin(rot);
    for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), X = x + lx * cs - lz * sn, Z = z + lx * sn + lz * cs; p.setXYZ(i, X, terrainH(X, Z) + 0.12, Z); }
    geo.computeVertexNormals(); const ripe = rnd() < 0.7; const t = (ripe ? barley : green).clone(); t.needsUpdate = true; t.repeat.set(w / 8, d / 8);
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 })));
    FIELDS.push({ x, z, w, d, rot, ripe }); } }
{ const pts = []; for (let k = 0; k < 6000 && pts.length < (IS_HEADSET ? 260 : 600); k++) { const x = (rnd() - 0.5) * 4200, z = (rnd() - 0.5) * 4200, r = Math.hypot(x, z), h = terrainH(x, z), dr = riverD(x, z);
    if ((r > 1500 && h > 3 && rnd() < 0.8) || (dr > 25 && dr < 70 && rnd() < 0.15)) pts.push([x, h, z, dr < 70]); }
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 3, 6).translate(0, 1.5, 0), woodM, pts.length);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4, 1), M(0x5a6a38), pts.length), c = new THREE.Color();
  pts.forEach(([x, h, z, wet], i) => { const s = 0.8 + rnd() * 0.9; O3.position.set(x, h, z); O3.rotation.set(0, rnd() * 6, 0); O3.scale.setScalar(s); O3.updateMatrix(); trunks.setMatrixAt(i, O3.matrix);
    O3.position.y = h + 3.6 * s; O3.scale.set(s, s * (wet ? 1.6 : 1.1), s); O3.updateMatrix(); crowns.setMatrixAt(i, O3.matrix); c.setHSL(wet ? 0.2 : 0.24, 0.3, 0.28 + rnd() * 0.08); crowns.setColorAt(i, c); });
  for (const m of [trunks, crowns]) { m.frustumCulled = false; scene.add(m); } }

// ---------- people ----------
const SKIN = [0x8d5a3b, 0x9a6646, 0x7a4a2e, 0xa36e4a, 0x84553a], CLOTH = [0xcdb48a, 0xb89a6a, 0x8a6a48, 0xd8c8a0, 0x9a4a2a, 0x6a5040, 0xe0d2b0, 0x7a6a50];
function person(r, child = false) {
  const g = new THREE.Group(), s = child ? 0.62 : 0.92 + r() * 0.14;
  const skin = M(SKIN[(r() * SKIN.length) | 0]), cloth = M(CLOTH[(r() * CLOTH.length) | 0], { roughness: 0.95 }), hair = M(0x1e140c);
  const hip = new THREE.Group(); hip.position.y = 0.9 * s; g.add(hip);
  const legs = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(sd * 0.1 * s, 0, 0); hip.add(p);
    p.add(new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.88 * s, 0.14 * s).translate(0, -0.44 * s, 0), skin)); return p; });
  const upper = new THREE.Group(); hip.add(upper);
  upper.add(new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.22 * s, 0.62 * s, 10).translate(0, 0.31 * s, 0), cloth));
  upper.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22 * s, 0.27 * s, 0.34 * s, 10).translate(0, -0.12 * s, 0), cloth));   // a wrapped skirt / kilt
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115 * s, 12, 10), skin); head.position.y = 0.76 * s; upper.add(head);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.122 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hr.position.set(0, 0.78 * s, -0.01); hr.rotation.x = -0.3; upper.add(hr);
  const arms = [-1, 1].map(sd => { const p = new THREE.Group(); p.position.set(sd * 0.22 * s, 0.56 * s, 0); upper.add(p);
    p.add(new THREE.Mesh(new THREE.BoxGeometry(0.085 * s, 0.6 * s, 0.085 * s).translate(0, -0.3 * s, 0), skin)); return p; });
  scene.add(g); return { g, hip, legs, upper, arms, s, head }; }
const pose = {
  stand(P) { P.hip.position.y = 0.9 * P.s; P.legs.forEach(l => { l.rotation.set(0, 0, 0); l.scale.y = 1; }); P.upper.rotation.set(0, 0, 0); P.arms.forEach(a => a.rotation.set(0, 0, 0)); },
  walk(P, t, k = 6) { pose.stand(P); const a = 0.5 * Math.sin(t * k); P.legs[0].rotation.x = a; P.legs[1].rotation.x = -a; P.arms[0].rotation.x = -a * 0.8; P.arms[1].rotation.x = a * 0.8; P.hip.position.y = 0.9 * P.s + 0.03 * Math.abs(Math.cos(t * k)); },
  sit(P) { pose.stand(P); P.hip.position.y = 0.3 * P.s; P.legs.forEach(l => l.rotation.x = -1.45); },
  kneel(P) { pose.stand(P); P.hip.position.y = 0.47 * P.s; P.legs.forEach(l => { l.scale.y = 0.53; l.rotation.x = 0.1; }); },   // knees on the ground, shins folded under
  stoop(P, t) { pose.stand(P); P.upper.rotation.x = 1.0; P.legs.forEach(l => l.rotation.x = -0.25); P.hip.position.y = 0.86 * P.s; P.arms[1].rotation.x = -0.6 - 0.5 * Math.sin(t * 2.5); P.arms[0].rotation.x = -0.4; } };
const PEOPLE = [], ACT_TEXT = {
  grind: "\"I'm grinding einkorn wheat on a stone quern. Making enough flour takes hours, every day. It becomes bread and porridge.\"",
  weave: "\"I'm weaving a basket from rushes from the marsh. We make our baskets, mats and cloth from plants.\"",
  knap: "\"This obsidian came from the volcanoes far to the east, in Cappadocia. I press flakes off it for blades and arrowheads. The best pieces are polished into mirrors.\"",
  cook: "\"I cook in the clay oven, and boil food by dropping clay balls hot from the fire into baskets and pots.\"",
  carry: "\"I'm bringing water up from the river. In spring the plain floods, and the marsh comes almost to the town.\"",
  herd: "\"I take the sheep and goats out to graze on the plain each day. The cattle in the marsh are wild aurochs. We hunt them, and set their horns in our walls.\"",
  harvest: "\"We're cutting the barley with sickles of flint and obsidian, set in wooden handles. The fields are a long walk from home.\"",
  reeds: "\"I'm cutting reeds. They make floor mats and baskets, and fuel for the oven, along with dried dung.\"",
  plaster: "\"I'm mixing white marl clay to replaster my walls. We do it again and again: some walls have more than a hundred thin layers.\"",
  child: "(Two children are playing a chasing game across the roofs.)" };
const homeIdx = (() => { let best = 0, bd = 1e9; HOUSES.forEach((h, i) => { const d = Math.hypot(h.x - 18, h.z - 30); const k = cellIdx(h.x, h.z + CELL); if (d < bd && cell[k] !== 1 + 9) { bd = d; best = i; } }); return best; })();
const HOME = HOUSES[homeIdx];
const near = HOUSES.map((h, i) => [i, Math.hypot(h.x - HOME.x, h.z - HOME.z)]).filter(([i, d]) => d > 8 && d < 95 && i !== homeIdx).sort(() => rnd() - 0.5).map(([i]) => HOUSES[i]);
const roofProp = (h, kind) => {
  if (kind === "grind") { const q = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), M(0x6a6a66)); q.position.set(h.x, h.roofY + 0.06, h.z + 0.55); scene.add(q); }
  if (kind === "cook") { const o = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0x9a7a56)); o.position.set(h.x, h.roofY, h.z + 0.9); o.scale.y = 0.8; scene.add(o);
    const f = new THREE.PointLight(0xff8a3a, 0, 8, 2); f.position.set(h.x, h.roofY + 0.4, h.z + 0.4); scene.add(f); FIRES.push(f);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); glow.position.set(h.x, h.roofY + 0.12, h.z + 0.45); scene.add(glow); }
  if (kind === "weave") { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.2, 12, 1, true), M(0xc8b070, { side: THREE.DoubleSide })); b.position.set(h.x, h.roofY + 0.4, h.z + 0.4); scene.add(b); }
  if (kind === "plaster") { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 0.25, 14), M(0xe8e2d4)); t.position.set(h.x, h.roofY + 0.12, h.z + 0.55); scene.add(t); } };
const FIRES = [];
let pi = 0;
for (const kind of ["grind", "grind", "weave", "knap", "cook", "cook", "weave", "knap", "plaster", "grind", "cook", "weave"]) { const h = near[pi++]; if (!h) break;
  const P = person(seeded(pi)); P.kind = kind; P.g.position.set(h.x, h.roofY, h.z); P.g.rotation.y = rnd() * 6; P.home = h; roofProp(h, kind); PEOPLE.push(P); }
const sheepGeo = merge([[new THREE.BoxGeometry(0.42, 0.38, 0.8), TM(0, 0.62, 0)], [new THREE.BoxGeometry(0.2, 0.24, 0.3), TM(0, 0.78, 0.5)],
  ...[[-0.14, -0.28], [0.14, -0.28], [-0.14, 0.28], [0.14, 0.28]].map(([x, z]) => [new THREE.BoxGeometry(0.07, 0.45, 0.07), TM(x, 0.22, z)])]);
const cattleGeo = merge([[new THREE.BoxGeometry(0.9, 0.95, 2.1), TM(0, 1.35, 0)], [new THREE.BoxGeometry(0.42, 0.5, 0.6), TM(0, 1.55, 1.25)],
  [new THREE.CylinderGeometry(0.04, 0.07, 0.75, 6), TM(-0.42, 1.92, 1.3, 0, 0, 1.0)], [new THREE.CylinderGeometry(0.04, 0.07, 0.75, 6), TM(0.42, 1.92, 1.3, 0, 0, -1.0)],
  ...[[-0.3, -0.75], [0.3, -0.75], [-0.3, 0.75], [0.3, 0.75]].map(([x, z]) => [new THREE.BoxGeometry(0.16, 0.9, 0.16), TM(x, 0.45, z)])]);
const FLOCKS = [];
function flock(cx, cz, n, geo, cols, wild, sx = 0) { const im = new THREE.InstancedMesh(geo, M(0xffffff), n), c = new THREE.Color(), list = [];
  for (let i = 0; i < n; i++) { c.set(cols[(rnd() * cols.length) | 0]).offsetHSL(0, 0, (rnd() - 0.5) * 0.08); im.setColorAt(i, c); const ox = (rnd() - 0.5) * 22, oz = (rnd() - 0.5) * 22; list.push({ ox, oz, ph: rnd() * 6, x: cx + sx + ox, z: cz + oz, h: rnd() * 6 }); }
  im.frustumCulled = false; scene.add(im); const F = { im, list, cx, cz, wild }; FLOCKS.push(F); return F; }
{ const a = rnd() * 6.283, cx = 420 * Math.cos(a), cz = 300 * Math.sin(a); const F = flock(cx, cz, 26, sheepGeo, [0xe8e2d4, 0xd8ccb4, 0x4a3a2a, 0x8a6a48, 0x2a2420], false, 70);   // starting round the shepherd
  const P = person(seeded(99)); P.kind = "herd"; P.flock = F; P.g.position.set(cx, terrainH(cx, cz), cz); PEOPLE.push(P); }
{ const z = (rnd() - 0.5) * 600, cx = rivW(z) - 160, cz = z; flock(cx, cz, 9, cattleGeo, [0x2a1a10, 0x3a2414, 0x1a120c], true); }
for (const f of FIELDS.slice(0, 3)) for (let k = 0; k < 2; k++) { const P = person(seeded(200 + FIELDS.indexOf(f) * 3 + k)); P.kind = "harvest"; const x = f.x + (rnd() - 0.5) * f.w * 0.6, z = f.z + (rnd() - 0.5) * f.d * 0.6; P.g.position.set(x, terrainH(x, z), z); P.g.rotation.y = rnd() * 6; PEOPLE.push(P); }
{ const r0 = REEDS.slice().sort((a, b) => Math.hypot(a[0] - HOME.x, a[2] - HOME.z) - Math.hypot(b[0] - HOME.x, b[2] - HOME.z))[40];
  if (r0) { const P = person(seeded(300)); P.kind = "reeds"; P.g.position.set(r0[0] + 2, terrainH(r0[0] + 2, r0[2]), r0[2]); PEOPLE.push(P); } }
// water carriers: from an edge ladder out to the nearest river and back, climbing the ladder each time
const edgeL = LADDERS.filter(L => L.edge).sort((a, b) => Math.hypot(a.x - HOME.x, a.z - HOME.z) - Math.hypot(b.x - HOME.x, b.z - HOME.z)).slice(0, 4);
const jarGeo = new THREE.SphereGeometry(0.16, 10, 8);
edgeL.forEach((L, k) => { const P = person(seeded(400 + k)); P.kind = "carry"; P.L = L; const rx = Math.abs(L.x - rivW(L.z)) < Math.abs(L.x - rivE(L.z)) ? rivW(L.z) + 16 : rivE(L.z) - 14;
  P.river = V3(rx, 0, L.z + (rnd() - 0.5) * 60); P.cycle = rnd(); P.jar = new THREE.Mesh(jarGeo, M(0x8a5a3a)); P.jar.scale.y = 1.25; P.jar.position.y = 0.95 * P.s; P.upper.add(P.jar); PEOPLE.push(P); });
// children chasing across the roofs near your house
for (let k = 0; k < 2; k++) { const P = person(seeded(500 + k), true); P.kind = "child"; P.ph = k * Math.PI; P.c = V3(HOME.x - 10, 0, HOME.z - 12); PEOPLE.push(P); }

// ---------- your house's interior (built when you climb into any house, from that house's seed) ----------
const plaster = new THREE.MeshStandardMaterial({ map: tex(256, 256, speckle("#ece6da", 2500, ["#f6f2ea", "#d8d0c0"], 2), [3, 2]), roughness: 0.9 });
const floorM = new THREE.MeshStandardMaterial({ map: tex(256, 256, speckle("#d8ccb4", 3000, ["#c4b698", "#e6dcc8"]), [3, 3]), roughness: 0.95 });
const PAINT = [   // painted panels found in the houses (redrawn freely)
  ["geometric panel", "Red and black geometric patterns, like woven textiles or kilims, were painted on plastered walls and then plastered over and repainted.", (g, w, h) => { g.fillStyle = "#efe8dc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#a8321e"; g.lineWidth = 7;
    for (let x = 20; x < w; x += 60) for (let y = 20; y < h; y += 60) { g.beginPath(); g.moveTo(x, y + 25); g.lineTo(x + 25, y); g.lineTo(x + 50, y + 25); g.lineTo(x + 25, y + 50); g.closePath(); g.stroke(); } }],
  ["hunting scene", "A painted hunt: many small figures, some in leopard skins, crowd round a huge red aurochs. Scenes like this may show feasts or rituals rather than everyday hunting.", (g, w, h) => { g.fillStyle = "#efe8dc"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#a8321e"; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.28, h * 0.2, 0, 0, 6.283); g.fill(); g.fillRect(w * 0.27, h * 0.6, 12, h * 0.22); g.fillRect(w * 0.7, h * 0.6, 12, h * 0.22); g.beginPath(); g.ellipse(w * 0.8, h * 0.4, 34, 24, 0, 0, 6.283); g.fill();
    g.strokeStyle = "#a8321e"; g.lineWidth = 6; g.beginPath(); g.arc(w * 0.84, h * 0.3, 30, 3.6, 5.6); g.stroke();
    g.fillStyle = "#2a1a14"; for (let k = 0; k < 16; k++) { const x = 30 + (k % 8) * (w - 60) / 7, y = k < 8 ? 40 : h - 70; g.fillRect(x, y, 8, 30); g.beginPath(); g.arc(x + 4, y - 7, 7, 0, 6.283); g.fill(); g.fillRect(x - 8, y + 6, 24, 4); } }],
  ["town and twin-peaked mountain", "This painting, found in 1963, may be the oldest known town plan: rows of houses beneath a two-peaked mountain, perhaps the volcano Hasan Dağ erupting, the source of their obsidian.", (g, w, h) => { g.fillStyle = "#efe8dc"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#c8662e"; g.beginPath(); g.moveTo(w * 0.2, h * 0.55); g.lineTo(w * 0.42, h * 0.12); g.lineTo(w * 0.5, h * 0.3); g.lineTo(w * 0.58, h * 0.1); g.lineTo(w * 0.8, h * 0.55); g.fill();
    g.fillStyle = "#2a1a14"; for (let k = 0; k < 60; k++) g.fillRect(w * 0.42 + (rnd() - 0.5) * w * 0.3, h * 0.08 - rnd() * 30, 4, 4);
    g.strokeStyle = "#a8321e"; g.lineWidth = 4; for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) g.strokeRect(20 + c * (w - 40) / 12, h * 0.62 + r * 32, (w - 40) / 12 - 4, 28); }],
  ["handprints", "Rows of red handprints, pressed onto the white plaster.", (g, w, h) => { g.fillStyle = "#efe8dc"; g.fillRect(0, 0, w, h); g.fillStyle = "#a8321e";
    for (let k = 0; k < 14; k++) { const x = 40 + (k % 7) * (w - 80) / 6, y = k < 7 ? h * 0.32 : h * 0.72; g.beginPath(); g.ellipse(x, y, 16, 20, 0, 0, 6.283); g.fill(); for (let f = 0; f < 5; f++) { const a = -2.4 + f * 0.42; g.save(); g.translate(x + 18 * Math.cos(a), y + 22 * Math.sin(a)); g.rotate(a + 1.57); g.fillRect(-3, -14, 6, 16); g.restore(); } } }]];
const PAINT_TEX = PAINT.map(([, , d]) => tex(512, 256, d));
let interior = null, inside = null;
const HX = CELL / 2 - 0.45, HZ = CELL / 2 - 0.45, IH = 2.7;
function buildInterior(h) {
  if (interior) { scene.remove(interior.g); interior.g.traverse(o => o.geometry?.dispose()); }
  const r = seeded(h.seed), g = new THREE.Group(), floorY = h.roofY - 3.0, items = []; g.position.set(h.x, floorY, h.z); scene.add(g);
  const box = (w, ht, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, ht, d), m); b.position.set(x, y, z); g.add(b); return b; };
  box(2 * HX, 0.1, 2 * HZ, 0, -0.05, 0, floorM);
  box(2 * HX, IH, 0.1, 0, IH / 2, -HZ - 0.05, plaster); box(2 * HX, IH, 0.1, 0, IH / 2, HZ + 0.05, plaster);
  box(0.1, IH, 2 * HZ, -HX - 0.05, IH / 2, 0, plaster); box(0.1, IH, 2 * HZ, HX + 0.05, IH / 2, 0, plaster);
  const hx = h.hatch.x - h.x, hz = h.hatch.z - h.z, hw = 0.42, beam = M(0x5a3a22);   // ceiling with the hatch hole; roof beams
  box(hx - hw + HX, 0.3, 2 * HZ, (-HX + hx - hw) / 2, IH + 0.15, 0, beam); box(HX - hx - hw, 0.3, 2 * HZ, (HX + hx + hw) / 2, IH + 0.15, 0, beam);
  box(2 * hw, 0.3, hz - hw + HZ, hx, IH + 0.15, (-HZ + hz - hw) / 2, beam); box(2 * hw, 0.3, HZ - hz - hw, hx, IH + 0.15, (HZ + hz + hw) / 2, beam);
  for (let k = 0; k < 5; k++) box(0.14, 0.14, 2 * HZ, -HX + 0.5 + k * (2 * HX - 1) / 4, IH - 0.07, 0, M(0x4a2e1a));
  const lad = new THREE.Mesh(ladderGeo, woodM); lad.position.set(hx, 0, hz - 0.15); lad.rotation.x = -0.12; lad.scale.set(1, 3.6, 1); g.add(lad);
  const platH = [0.32, 0.22];   // north platform (the dead buried beneath) and east platform
  box(2 * HX, platH[0], 1.4, 0, platH[0] / 2, -HZ + 0.7, floorM); box(1.2, platH[1], 2 * HZ - 1.4, HX - 0.6, platH[1] / 2, 0.7, floorM);
  items.push({ p: V3(0, 0.4, -HZ + 0.8), name: "north platform", text: "The family's dead were buried under this platform, often curled up, wrapped in mats. Some skulls were later taken out, plastered and painted, and passed on. People slept and sat above their ancestors." });
  const oven = new THREE.Mesh(new THREE.SphereGeometry(0.65, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0xb8956a)); oven.position.set(-1.0, 0, HZ - 0.55); oven.scale.y = 0.9; g.add(oven);
  box(0.36, 0.3, 0.1, -1.0, 0.15, HZ - 1.15, M(0x1a100a));
  const hearth = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.07, 6, 18).rotateX(Math.PI / 2), M(0x8a6a48)); hearth.position.set(0.0, 0.03, HZ - 1.4); g.add(hearth);
  const embers = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a1a })); embers.position.set(0, 0.04, HZ - 1.4); g.add(embers);
  const fire = new THREE.PointLight(0xff9a4a, 3.5, 9, 1.6); fire.position.set(0, 0.6, HZ - 1.4); g.add(fire);
  items.push({ p: V3(-0.5, 0.4, HZ - 1.0), name: "oven and hearth", text: "The oven and hearth sit on the south side, under the roof hole, so the smoke rises out of the ladder opening. The walls and ceiling near them were black with soot, which shows up in the soot layers in people's lungs from the burials." });
  for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M(0x9a6a44)); b.position.set(0.5 + (k % 3) * 0.11, 0.05, HZ - 1.2 + Math.floor(k / 3) * 0.11); g.add(b); }   // cooking balls
  box(0.75, 0.95, 0.05, -HX + 0.03, 0.48, -0.4, M(0x1a140e)).rotation.y = Math.PI / 2;   // the low crawl-through into the storeroom
  items.push({ p: V3(-HX + 0.4, 0.5, -0.4), name: "storeroom doorway", text: "A low opening leads into a side room for storage: grain and pulses in bins of clay, baskets, fuel." });
  const nb = (r() * 4) | 0;   // bucrania: plastered aurochs skulls with their real horns, set in the walls
  for (let k = 0; k < nb; k++) { const bg = new THREE.Group(), onWest = k % 2 === 0; bg.position.set(onWest ? -HX + 0.08 : 1.0 + (k - 1) * 0.6, 1.3 + r() * 0.6, onWest ? 0.9 - k * 0.7 : -HZ + 0.08); bg.rotation.y = onWest ? Math.PI / 2 : 0; g.add(bg);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), M(0xf2ece0)); skull.scale.set(0.8, 1.15, 0.55); bg.add(skull);
    for (const sd of [-1, 1]) { const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.55, 8), M(0xe6dcc8)); horn.position.set(sd * 0.27, 0.22, 0.04); horn.rotation.z = -sd * 0.9; bg.add(horn); }
    items.push({ p: bg.position.clone(), name: "bucranium", text: "An aurochs skull, plastered over and set into the wall with its real horns. Wild aurochs were enormous, and hunting and feasting on them seems to have mattered deeply. Some walls had rows of horns." }); }
  const np = 1 + ((r() * 2) | 0); for (let k = 0; k < np; k++) { const v = (r() * PAINT.length) | 0, m = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({ map: PAINT_TEX[v], roughness: 0.9 }));
    const onNorth = k === 0; m.position.set(onNorth ? -0.95 : HX - 0.02, 1.75, onNorth ? -HZ + 0.02 : -0.6); m.rotation.y = onNorth ? 0 : -Math.PI / 2; g.add(m);
    items.push({ p: m.position.clone(), name: PAINT[v][0], text: PAINT[v][1] }); }
  const quern = box(0.55, 0.14, 0.35, 1.3, 0.07 + platH[1], 1.6, M(0x6a6a66)); items.push({ p: quern.position.clone(), name: "quern", text: "A saddle quern for grinding grain, with its hand stone." });
  for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.35, 12, 1, true), M(0xc8b070, { side: THREE.DoubleSide })); b.position.set(-1.9 + k * 0.6, 0.17, 0.9); g.add(b); }
  const mat = box(1.6, 0.02, 1.0, -0.6, platH[0] + 0.01, -HZ + 0.7, M(0xb8a466));
  interior = { g, floorY, items, fire, embers, platH, h };
}
function insideH(lx, lz) { const p = interior.platH; if (lz < -HZ + 1.4) return p[0]; if (lx > HX - 1.2 && lz > -HZ + 1.4) return p[1]; return 0; }

// ---------- you, your chores ----------
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(30,22,12,.72);color:#f4ead8;padding:10px 14px;border-radius:10px;font:13.5px/1.55 -apple-system,Helvetica,sans-serif;max-width:560px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(30,22,12,.8);color:#f4ead8;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:720px;display:none";
document.body.append(HUD, MSG);
let msgT = 0, msgText = "";
function say(t, secs = 9) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
const riverPt = (() => { const z = HOME.z + 40, x = rivW(z); return V3(x + 14, 0, z); })();
const reedPt = (() => { const r0 = REEDS.slice().sort((a, b) => Math.hypot(a[0] - HOME.x, a[2] - HOME.z) - Math.hypot(b[0] - HOME.x, b[2] - HOME.z))[10] || [riverPt.x, 0, riverPt.z + 40]; return V3(r0[0], 0, r0[2]); })();
const clayPt = (() => { for (let k = 0; k < 500; k++) { const z = HOME.z - 80 + (rnd() - 0.5) * 300, x = rivW(z) + 40 + rnd() * 80, h = terrainH(x, z); if (h > WATER + 0.15 && h < -0.4) return V3(x, 0, z); } return V3(riverPt.x + 50, 0, riverPt.z - 60); })();
{ const d = new THREE.Mesh(new THREE.CircleGeometry(3.5, 24).rotateX(-Math.PI / 2), M(0xece8dc, { polygonOffset: true, polygonOffsetFactor: -3 })); d.position.set(clayPt.x, terrainH(clayPt.x, clayPt.z) + 0.05, clayPt.z); scene.add(d); }
const homeJar = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), M(0x8a5a3a)); homeJar.scale.y = 1.3; homeJar.position.set(HOME.hatch.x - 1.0, HOME.roofY + 0.25, HOME.hatch.z - 0.4); scene.add(homeJar);
const atHatch = V3(HOME.hatch.x - 1.0, 0, HOME.hatch.z - 0.4);
const TASKS = [
  { title: "Fetch water", steps: [
    { text: "Pick up the water jar on your roof, beside the hatch", at: atHatch, act: () => { homeJar.visible = false; carry("jar"); } },
    { text: "Fill it at the river, west of the town", at: riverPt, act: () => say("You fill the jar. The river is muddy and shallow in summer; in spring it floods the whole plain.") },
    { text: "Bring it home and set it down by your hatch", at: atHatch, act: () => { carry(null); homeJar.visible = true; } }],
    done: "Water for cooking, drinking and mixing plaster: carried up every day, often by women and children." },
  { title: "Cut reeds", steps: [
    { text: "Go to the reed beds in the marsh", at: reedPt, act: () => { carry("reeds"); say("You cut an armful of reeds with an obsidian blade."); } },
    { text: "Bring the reeds home to your roof", at: atHatch, act: () => carry(null) }],
    done: "Reeds become floor mats, baskets and fuel. Traces of mats survive under the burials." },
  { title: "Dig white clay for plaster", steps: [
    { text: "Dig white marl clay at the pale patch by the marsh", at: clayPt, act: () => { carry("clay"); say("You dig a basket of fine white marl. The walls inside are replastered with it, sometimes every year."); } },
    { text: "Carry the clay home", at: atHatch, act: () => carry(null) }],
    done: "Walls were replastered over and over: some have more than a hundred layers, with paintings sealed between them." },
  { title: "Visit your ancestors", steps: [
    { text: "Climb down into your house (stand on the hatch and press E)", at: null, cond: () => inside === HOME },
    { text: "Sit by the north platform, where your family's dead are buried", at: "platform", act: () => say("You sit above your ancestors. Your grandparents lie under this platform; when you die, you will be buried here too.") }],
    done: "The house was the centre of life and death: houses were rebuilt on the same spot for generations, each new one on top of the last." }];
let taskI = 0, stepI = 0, carried = null, carryMesh = null;
function carry(kind) { if (carryMesh) { camera.remove(carryMesh); carryMesh = null; } carried = kind; if (!kind) return;
  carryMesh = kind === "jar" ? new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), M(0x8a5a3a)) : kind === "reeds" ? new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8).rotateZ(1.2), M(0xb8a466)) : new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.16, 12), M(0xece8dc));
  carryMesh.position.set(0.28, -0.38, -0.55); camera.add(carryMesh); }
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beacon.frustumCulled = false; scene.add(beacon);
function stepTarget() { const t = TASKS[taskI]; if (!t) return null; const s = t.steps[stepI]; if (!s || !s.at) return null;
  if (s.at === "platform") return inside === HOME ? V3(HOME.x, interior.floorY + 0.4, HOME.z - HZ + 0.9) : null;
  const k = cellIdx(s.at.x, s.at.z); return V3(s.at.x, outsideH(s.at.x, s.at.z), s.at.z); }
function advance() { const t = TASKS[taskI]; stepI++; if (stepI >= t.steps.length) { say(`<b>${t.title}: done.</b> ${t.done}`, 12); taskI++; stepI = 0;
  if (taskI >= TASKS.length) setTimeout(() => say("<b>Your day's work is done.</b> In the evening people gathered on the roofs and around their hearths. Walk about, climb into other houses, talk to people (E), or wait for night.", 16), 12500); } }

// ---------- getting about ----------
const keys = {}; let yaw = Math.PI, pitch = -0.1, dragging = false, started = false;
const P_ = { x: HOME.hatch.x - 0.3, z: HOME.hatch.z - 1.6, y: HOME.roofY };
const intro = document.getElementById("intro");
function start() { if (started) return; started = true; intro?.classList.add("gone"); say("You wake on the roof of your house. Your first chore: fetch water. Follow the golden light; press E to act or talk.", 10); }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyE") interact(); });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
function groundAt(x, z) { if (inside) return interior.floorY + insideH(x - inside.x, z - inside.z); return Math.max(outsideH(x, z), WATER - 0.6); }   // you wade, at most waist-deep
function enterHouse(h) { const i = HOUSES.indexOf(h); buildInterior(h); inside = h; bodies.setMatrixAt(i, ZERO); hatches.setMatrixAt(i, ZERO); bodies.instanceMatrix.needsUpdate = hatches.instanceMatrix.needsUpdate = true;
  P_.x = h.hatch.x; P_.z = h.hatch.z - 0.8; P_.y = interior.floorY; if (!renderer.xr.isPresenting) yaw = 0;
  say(h === HOME ? "You climb down into your house: one room, about 5 by 5 metres, its walls white with plaster. E near things to learn about them; E at the ladder to climb out." : "You climb down into a neighbour's house. Every house had the same layout: oven and ladder on the south, platforms on the north and east. E at the ladder to climb out.", 10); }
function leaveHouse() { const h = inside, i = HOUSES.indexOf(h); inside = null;
  const ht = h.roofY - h.baseY; O3.position.set(h.x, h.baseY + ht / 2, h.z); O3.rotation.set(0, 0, 0); O3.scale.set(CELL + 0.02, ht, CELL + 0.02); O3.updateMatrix(); bodies.setMatrixAt(i, O3.matrix);
  O3.position.set(h.hatch.x, h.roofY + 0.02, h.hatch.z); O3.scale.set(1, 1, 1); O3.updateMatrix(); hatches.setMatrixAt(i, O3.matrix); bodies.instanceMatrix.needsUpdate = hatches.instanceMatrix.needsUpdate = true;
  scene.remove(interior.g); interior = null; P_.x = h.hatch.x; P_.z = h.hatch.z - 1.0; P_.y = h.roofY; }
function interact() {
  if (!started) return start();
  const t = TASKS[taskI], s = t?.steps[stepI], tgt = stepTarget();
  if (s && tgt && Math.hypot(P_.x - tgt.x, P_.z - tgt.z) < 3 && Math.abs(P_.y - tgt.y) < 2.5) { s.act?.(); advance(); return; }
  if (inside) {
    if (Math.hypot(P_.x - inside.hatch.x, P_.z - inside.hatch.z) < 1.3) return leaveHouse();
    let best = null, bd = 2.2; for (const it of interior.items) { const d = Math.hypot(P_.x - (inside.x + it.p.x), P_.z - (inside.z + it.p.z)); if (d < bd) { bd = d; best = it; } }
    if (best) return say(`<b>${best.name}</b>: ${best.text}`, 14); return; }
  const k = cellIdx(P_.x, P_.z);
  if (k >= 0 && cell[k] === 1) { const h = HOUSES[houseAt[k]]; if (Math.hypot(P_.x - h.hatch.x, P_.z - h.hatch.z) < 1.2 && Math.abs(P_.y - h.roofY) < 0.6) return enterHouse(h); }
  let best = null, bd = 3; for (const p of PEOPLE) { const w = p.g.position, d = Math.hypot(P_.x - w.x, P_.z - w.z); if (d < bd && Math.abs(P_.y - w.y) < 2.5) { bd = d; best = p; } }
  if (best) return say(ACT_TEXT[best.kind], 12);
  const L = nearLadder(P_.x, P_.z); if (L) return say("Ladders lean against the house walls everywhere: there were no streets, so people walked across the roofs and climbed up and down between them.", 9);
  say("Nothing here to do. Follow the golden light for your chore, or find someone to talk to.", 5); }

// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0, vrDirty = true;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 360; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.197), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false, fog: false }));
vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(line1, line2) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 360); g.fillStyle = "rgba(30,22,12,.78)"; g.beginPath(); g.roundRect(0, 0, 1024, 360, 22); g.fill();
  const wrap = (txt, y, sz, col, maxLines) => { g.fillStyle = col; g.font = `${sz}px -apple-system, Helvetica, sans-serif`; const words = txt.replace(/<[^>]+>/g, "").split(" "); let line = "", n = 0;
    for (const w of words) { if (g.measureText(line + w).width > 970) { g.fillText(line, 26, y); y += sz * 1.25; line = ""; if (++n >= maxLines) return; } line += w + " "; } g.fillText(line, 26, y); };
  wrap(line1, 52, 34, "#ffe9a8", 2); if (line2) wrap(line2, 150, 28, "#f4ead8", 6); vrT.needsUpdate = true; }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; vrDirty = true;
    s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); rig.rotation.set(0, 0, 0); vrPanel.visible = false; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hour = 7.5, hudT = 0, loopErrs = 0;
const DAY_MIN = 24;                                          // real minutes for a whole day
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  if (started) hour = (hour + dt * 24 / (DAY_MIN * 60)) % 24;
  // movement
  let mx = 0, my = 0, run = 1;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; } else { if (gp.buttons[0]?.value > 0.3) run = 2.2; if (tap("R", gp, 4) || tap("R", gp, 5)) interact();
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 2.4; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; }
  fwd.y = 0; fwd.normalize(); side.crossVectors(fwd, UP).normalize();
  if (mx || my) { const sp = 1.5 * run * dt, nx = P_.x + (fwd.x * -my + side.x * mx) * sp, nz = P_.z + (fwd.z * -my + side.z * mx) * sp;
    const tryXZ = (x, z) => { if (inside) { const lx = x - inside.x, lz = z - inside.z; if (Math.abs(lx) > HX - 0.25 || Math.abs(lz) > HZ - 0.25) return false; }
      const g = groundAt(x, z); if (g - P_.y > 0.55 && !(g - P_.y < 4.5 && (nearLadder(x, z) || nearLadder(P_.x, P_.z)))) return false; P_.x = x; P_.z = z; return true; };
    if (!tryXZ(nx, nz)) { tryXZ(nx, P_.z) || tryXZ(P_.x, nz); } }
  const g = groundAt(P_.x, P_.z); P_.y = g > P_.y ? Math.min(g, P_.y + 3.2 * dt) : Math.max(g, P_.y - 7 * dt);
  rig.position.set(P_.x, P_.y, P_.z);
  // sun, sky and light through the day
  const dayA = (hour - 6) / 12 * Math.PI, el = Math.sin(dayA), sunDir = V3(-Math.cos(dayA), Math.max(el, -0.3), 0.35).normalize();
  sun.position.copy(rig.position).addScaledVector(sunDir, 500); sun.target.position.copy(rig.position);
  const day = THREE.MathUtils.clamp(el * 3 + 0.3, 0, 1), dusk = THREE.MathUtils.clamp(1 - Math.abs(el) * 4, 0, 1) * (el > -0.15 ? 1 : 0);
  sun.intensity = 2.6 * THREE.MathUtils.clamp(el * 3, 0, 1); sun.color.setRGB(1, 0.9 - 0.3 * dusk, 0.78 - 0.45 * dusk);
  hemi.intensity = 0.15 + 1.0 * day;
  const up = new THREE.Color(0.30, 0.50, 0.80).multiplyScalar(0.05 + 0.95 * day), hor = new THREE.Color(0.80, 0.84, 0.86).multiplyScalar(0.06 + 0.94 * day).lerp(new THREE.Color(0.95, 0.55, 0.30), dusk * 0.6);
  skyMat.uniforms.up.value.copy(up); skyMat.uniforms.hor.value.copy(hor); scene.fog.color.copy(hor); sky.position.copy(rig.position);
  sunDisc.position.copy(rig.position).addScaledVector(sunDir, 20000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.05; sunDisc.material.color.setRGB(1, 0.95 - 0.35 * dusk, 0.85 - 0.5 * dusk);
  mtnMat.color.setRGB(0.56, 0.64, 0.71).multiplyScalar(0.12 + 0.88 * day).lerp(hor, 0.35);
  for (const f of FIRES) f.intensity = (1 - day) * 2.5 * (0.8 + 0.2 * Math.sin(t * 13 + f.position.x));
  if (interior) { interior.fire.intensity = 3.2 + 0.6 * Math.sin(t * 11) + 0.3 * Math.sin(t * 23); interior.embers.material.color.setRGB(1, 0.35 + 0.08 * Math.sin(t * 9), 0.08); }
  // smoke
  for (let i = 0; i < NSM; i++) { smAge[i] += dt; if (smAge[i] > 12) smAge[i] -= 12; const src = SMOKERS[i % SMOKERS.length], a = smAge[i];
    smPos[i * 3] = src.x + a * 0.6 + Math.sin(a + i) * 0.3; smPos[i * 3 + 1] = src.y + a * 0.9; smPos[i * 3 + 2] = src.z + a * 0.2; }
  smoke.geometry.attributes.position.needsUpdate = true;
  // people
  for (const p of PEOPLE) { const G = p.g;
    if (p.kind === "grind") { pose.kneel(p); p.upper.rotation.x = 0.55 + 0.25 * Math.sin(t * 2.2); p.arms.forEach(a => a.rotation.x = -1.1 - 0.3 * Math.sin(t * 2.2)); }
    else if (p.kind === "weave" || p.kind === "knap") { pose.sit(p); p.upper.rotation.x = 0.25; p.arms[0].rotation.x = -1.0 + 0.15 * Math.sin(t * (p.kind === "knap" ? 7 : 3)); p.arms[1].rotation.x = -1.0 - 0.15 * Math.sin(t * (p.kind === "knap" ? 7 : 3) + 1); }
    else if (p.kind === "cook" || p.kind === "plaster") { pose.kneel(p); p.upper.rotation.x = 0.4; p.arms[1].rotation.x = -1.2 + 0.4 * Math.sin(t * 1.6); p.arms[0].rotation.x = -0.6; }
    else if (p.kind === "harvest" || p.kind === "reeds") pose.stoop(p, t);
    else if (p.kind === "child") { const a = t * 0.55 + p.ph, x = p.c.x + 9 * Math.cos(a), z = p.c.z + 6 * Math.sin(a * 1.3); G.position.set(x, outsideH(x, z), z); G.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 1.3) + Math.PI / 2; pose.walk(p, t, 11); }
    else if (p.kind === "herd") { const F = p.flock, a = t * 0.012, x = F.cx + 70 * Math.cos(a), z = F.cz + 50 * Math.sin(a); G.position.set(x, terrainH(x, z), z); G.rotation.y = Math.atan2(-70 * Math.sin(a), 50 * Math.cos(a)); pose.walk(p, t, 4);
      F.hx = x; F.hz = z; }
    else if (p.kind === "carry") { const L = p.L, T = 160, c = ((t / T) + p.cycle) % 1, top = V3(L.tx, L.top, L.tz), foot = V3(L.x, L.foot, L.z), riv = V3(p.river.x, 0, p.river.z);
      const leg = (a, b, f) => { const x = a.x + (b.x - a.x) * f, z = a.z + (b.z - a.z) * f; G.position.set(x, terrainH(x, z), z); G.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); pose.walk(p, t, 6); };
      p.jar.visible = c > 0.47 && c < 0.95;
      if (c < 0.05) { G.position.set(top.x, top.y, top.z); pose.stand(p); }
      else if (c < 0.1) { const f = (c - 0.05) / 0.05; G.position.lerpVectors(top, foot, f); pose.walk(p, t, 3); G.rotation.y = Math.atan2(L.dx, L.dz); }
      else if (c < 0.42) leg(foot, riv, (c - 0.1) / 0.32);
      else if (c < 0.47) { G.position.set(riv.x, terrainH(riv.x, riv.z), riv.z); pose.stoop(p, t); }
      else if (c < 0.85) leg(riv, foot, (c - 0.47) / 0.38);
      else if (c < 0.9) { const f = (c - 0.85) / 0.05; G.position.lerpVectors(foot, top, f); pose.walk(p, t, 3); G.rotation.y = Math.atan2(L.dx, L.dz); }
      else { G.position.set(top.x, top.y, top.z); pose.stand(p); } } }
  for (const F of FLOCKS) { const cx = F.wild ? F.cx + 30 * Math.sin(t * 0.004) : F.hx ?? F.cx, cz = F.wild ? F.cz + 20 * Math.cos(t * 0.003) : F.hz ?? F.cz;
    F.list.forEach((a, i) => { const tx = cx + a.ox + 4 * Math.sin(t * 0.07 + a.ph), tz = cz + a.oz + 4 * Math.cos(t * 0.05 + a.ph), dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { a.x += dx / d * Math.min(d, (F.wild ? 0.5 : 1.2) * dt); a.z += dz / d * Math.min(d, (F.wild ? 0.5 : 1.2) * dt); a.h = Math.atan2(dx, dz); }
      O3.position.set(a.x, terrainH(a.x, a.z), a.z); O3.rotation.set(d < 0.3 ? 0.25 : 0, a.h, 0); O3.scale.setScalar(1); O3.updateMatrix(); F.im.setMatrixAt(i, O3.matrix); });
    F.im.instanceMatrix.needsUpdate = true; }
  // the chore marker and the readout
  const T_ = stepTarget(); beacon.visible = !!T_; if (T_) { const dd = Math.hypot(T_.x - P_.x, T_.z - P_.z); beacon.position.set(T_.x, T_.y + 30, T_.z); beacon.scale.set(1, inside ? 0.06 : 1, 1); if (inside) beacon.position.y = T_.y + 1.5;
    beacon.material.opacity = 0.28 * THREE.MathUtils.clamp((dd - 2.5) / 10, inside ? 0.25 : 0, 1); }   // fades as you arrive, so it never fills the view
  const s = TASKS[taskI]?.steps[stepI]; if (s?.cond?.()) advance();
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3;
    const hh = Math.floor(hour), mm = Math.floor((hour % 1) * 60), part = hour < 5 || hour >= 21 ? "night" : hour < 11 ? "morning" : hour < 17 ? "afternoon" : "evening";
    let where = ""; if (T_) { const dx = T_.x - P_.x, dz = T_.z - P_.z, d = Math.hypot(dx, dz), rel = Math.atan2(dx, dz) - Math.atan2(fwd.x, fwd.z), r = Math.atan2(Math.sin(rel), Math.cos(rel));
      where = `${d < 3 ? "here: press E" : `${Math.round(d)} m ${Math.abs(r) < 0.4 ? "ahead" : Math.abs(r) > 2.6 ? "behind you" : r > 0 ? "to your left" : "to your right"}`}`; }
    const task = TASKS[taskI] ? `<b>${TASKS[taskI].title}</b>: ${s?.text || ""} <span style="color:#ffe9a8">· ${where}</span>` : "<b>Chores done</b> · explore, climb into houses, talk to people";
    HUD.innerHTML = `<b>Çatalhöyük, about 7000 BC</b> · ${part}, ${hh}:${String(mm).padStart(2, "0")}${carried ? ` · carrying ${carried}` : ""}<br>${task}<br>
      <span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · shift run · E act / talk / climb in or out at a roof hatch · ladders let you climb between roofs and yards</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(TASKS[taskI] ? `${TASKS[taskI].title}: ${s?.text || ""} · ${where}` : "Chores done: explore, climb into houses, talk to people", msgText); vrDirty = false; } }
  renderer.render(scene, camera);
}
