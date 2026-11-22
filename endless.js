// endless.js -- The Endless Land: one world on land that goes on in every direction, made as you go. It is split into regions a kilometre
// or two across, each a different kind of place (mushroom meadows, crystal dunes, islands floating over a lake, a forest of stone pillars,
// glass woods, a drowned city, coral highlands, ember fields, frost mountains, plains of giant bones, toy geometry, the great lake, arch
// canyons, a clockwork grove, giant grass); each region gets its own name, ground, sky and things standing in it, all from one seed, so the
// same place is always the same. Ways to travel: on foot, by glider (fly anywhere), and by the endless railway, two tracks running east
// and west for ever with a station every 3 km. Built into endless.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 60000), rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp, sstep = (x, a, b) => { const t = clampN((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SEED = (+(new URLSearchParams(location.search).get("seed")) || 1) | 0;

// ---------- noise ----------
function hash(i, j, k = 0) { let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul((k | 0) + SEED * 7919, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vn(x, z, k) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), a = hash(i, j, k), b = hash(i + 1, j, k), c = hash(i, j + 1, k), d = hash(i + 1, j + 1, k); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 4, k = 0) { let s = 0, a = 0.5, w = 0; for (let o = 0; o < n; o++) { s += a * vn(x, z, k + o * 31); w += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.3; a *= 0.5; } return s / w; }
const ridge = (x, z, n = 4, k = 0) => { let s = 0, a = 0.5, w = 0; for (let o = 0; o < n; o++) { s += a * (1 - Math.abs(2 * vn(x, z, k + o * 13) - 1)); w += a; x = x * 2.1 + 5.3; z = z * 2.1 + 1.7; a *= 0.5; } return s / w; };

// ---------- the regions: a jittered grid of region centres, the borders warped so no region is a polygon ----------
const CELL = 1500;
const BIOMES = [
  { name: "Mushroom Meadow", g: ["#5e9a48", "#86b058"], top: "#5a8ad8", hor: "#cfe4ee", fog: 7000, h: (x, z) => 8 + 14 * fbm(x / 320, z / 320, 4, 1) },
  { name: "Crystal Dunes", g: ["#d8b07a", "#c08a5a"], top: "#7a5ab8", hor: "#f0c8b0", fog: 6000, h: (x, z) => 6 + 16 * ridge(x / 140 + 3 * fbm(x / 600, z / 600, 2, 2), z / 260, 3, 3) },
  { name: "Floating Isles", g: ["#4a6a5a", "#6a8a6a"], top: "#3a7ae0", hor: "#d8ecf8", fog: 12000, h: (x, z) => -28 + 8 * fbm(x / 300, z / 300, 3, 4), planet: 1 },
  { name: "Stone Forest", g: ["#8a8070", "#a89a84"], top: "#6a88b8", hor: "#e0dccc", fog: 5000, h: (x, z) => 18 + 6 * fbm(x / 200, z / 200, 3, 5) },
  { name: "Glass Wood", g: ["#a8c8c0", "#c8e0d8"], top: "#58a8d0", hor: "#e8f8f8", fog: 4500, h: (x, z) => 10 + 16 * fbm(x / 420, z / 420, 4, 6) },
  { name: "Drowned City", g: ["#6a7a68", "#8a8a78"], top: "#6a8098", hor: "#c8d0d0", fog: 2600, h: (x, z) => -1.5 + 4 * fbm(x / 160, z / 160, 3, 7) },
  { name: "Coral Highlands", g: ["#d88a7a", "#e8b08a"], top: "#4a90c8", hor: "#f8dcd0", fog: 6000, h: (x, z) => 14 + 34 * Math.pow(fbm(x / 260, z / 260, 4, 8), 2) },
  { name: "Ember Fields", g: ["#2a2420", "#3e302a"], top: "#3a2a3a", hor: "#b0603a", fog: 3000, h: (x, z) => 10 + 26 * ridge(x / 300, z / 300, 4, 9), ember: 1 },
  { name: "Frost Peaks", g: ["#e8eef2", "#b8c8d0"], top: "#4a78c0", hor: "#e0ecf4", fog: 9000, h: (x, z) => 30 + 150 * Math.pow(ridge(x / 700, z / 700, 5, 10), 2.2) },
  { name: "Bone Plains", g: ["#c8c090", "#a8a070"], top: "#8a98a8", hor: "#e8e0c8", fog: 5000, h: (x, z) => 6 + 7 * fbm(x / 500, z / 500, 3, 11) },
  { name: "Toy Geometry", g: ["#8ad08a", "#f0e080"], top: "#70b0f0", hor: "#f8f0f8", fog: 8000, h: (x, z) => 5 + 4 * Math.round(4 * fbm(x / 400, z / 400, 3, 12)) },
  { name: "Great Lake", g: ["#6a8a58", "#c8b888"], top: "#4a88d0", hor: "#d8e8f0", fog: 12000, h: (x, z) => -12 + 26 * Math.max(0, fbm(x / 350, z / 350, 4, 13) - 0.45) },
  { name: "Arch Canyons", g: ["#b8603a", "#d8904a"], top: "#4a80c8", hor: "#f0d0a8", fog: 8000, h: (x, z) => { const m = fbm(x / 500, z / 500, 4, 14), c = ridge(x / 380, z / 380, 3, 15); return 8 + 46 * sstep(m, 0.45, 0.5) * (c < 0.8 ? 1 : 0.3) + 8 * Math.round(3 * m) ; } },
  { name: "Clockwork Grove", g: ["#6a6458", "#8a7a58"], top: "#6a7088", hor: "#d8c8a8", fog: 4000, h: (x, z) => 10 + 9 * fbm(x / 300, z / 300, 3, 16) },
  { name: "Giant Grass", g: ["#4e8a2a", "#6a9a32"], top: "#5a90d8", hor: "#e8f0d8", fog: 3500, h: (x, z) => 5 + 9 * fbm(x / 520, z / 520, 3, 17) }];
BIOMES.forEach(b => { b.c = b.g.map(c => new THREE.Color(c)); b.ctop = new THREE.Color(b.top); b.chor = new THREE.Color(b.hor); });
const NB = BIOMES.length;
const cellPt = (i, j) => [(i + 0.15 + 0.7 * hash(i, j, 1)) * CELL, (j + 0.15 + 0.7 * hash(i, j, 2)) * CELL];
// the start region is a mushroom meadow; the rest are drawn at random
const cellBiome = (i, j) => (i === 0 && j === 0) ? 0 : Math.floor(hash(i, j, 3) * NB);
const SYL = ["ar", "bel", "cor", "dun", "el", "fen", "gal", "hesk", "ir", "jor", "kal", "lune", "mor", "nev", "or", "pell", "quin", "ras", "sil", "tor", "ul", "vey", "wen", "xan", "yar", "zel", "ith", "ost", "amber", "cael"];
function cellName(i, j) { const n = 2 + Math.floor(hash(i, j, 4) * 2); let s = ""; for (let k = 0; k < n; k++) s += SYL[Math.floor(hash(i, j, 5 + k) * SYL.length)]; return s[0].toUpperCase() + s.slice(1); }
// the regions near a point and how much each counts there (they blend over about 200 m at a border)
const WB = new Int32Array(9), WW = new Float32Array(9), WI = new Int32Array(9), WJ = new Int32Array(9); let WN = 0;
function weights(x, z) { const wx = x + 700 * (fbm(x / 1100, z / 1100, 3, 40) - 0.5), wz = z + 700 * (fbm(x / 1100 + 7, z / 1100 + 3, 3, 41) - 0.5), i0 = Math.floor(wx / CELL), j0 = Math.floor(wz / CELL); let dmin = 1e12; const D = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const [px, pz] = cellPt(i0 + a, j0 + b), d = Math.hypot(wx - px, wz - pz); D.push([d, i0 + a, j0 + b]); if (d < dmin) dmin = d; }
  WN = 0; let s = 0; for (const [d, i, j] of D) { const e = d - dmin; if (e > 380) continue; const w = Math.exp(-e / 70); WB[WN] = cellBiome(i, j); WW[WN] = w; WI[WN] = i; WJ[WN] = j; WN++; s += w; } for (let k = 0; k < WN; k++) WW[k] /= s; }
function dominant(x, z) { weights(x, z); let b = 0; for (let k = 1; k < WN; k++) if (WW[k] > WW[b]) b = k; return [WB[b], WI[b], WJ[b]]; }
// a region at random in proportion to the weights (so the things standing in two regions mingle at the border)
function pickBiome(x, z, r) { weights(x, z); let acc = 0; for (let k = 0; k < WN; k++) { acc += WW[k]; if (r < acc) return WB[k]; } return WB[WN - 1]; }
function rawH(x, z) { weights(x, z); let h = 0; for (let k = 0; k < WN; k++) if (WW[k] > 0.004) h += WW[k] * BIOMES[WB[k]].h(x, z); return h + 10 * (fbm(x / 3000, z / 3000, 3, 50) - 0.5); }

// ---------- the railway's line: two tracks 9 m apart, wandering east and west for ever, levelled and carried on trestles over the low ground ----------
const trackZ = x => 700 * Math.sin(x / 2600) + 260 * Math.sin(x / 910 + 1.3);
const trackDZ = x => 700 / 2600 * Math.cos(x / 2600) + 260 / 910 * Math.cos(x / 910 + 1.3);
const TY = new Map();
function trackYAt(k) { if (TY.has(k)) return TY.get(k); if (TY.size > 200000) TY.clear(); const x = k * 10; let s = 0, n = 0; for (let q = -6; q <= 6; q++) { const xx = x + q * 40, w = 1 - Math.abs(q) / 7; s += rawH(xx, trackZ(xx)) * w; n += w; } const y = Math.max(s / n, 3) + 1.5; TY.set(k, y); return y; }
function trackY(x) { const k = Math.floor(x / 10), f = x / 10 - k; return lerpN(trackYAt(k), trackYAt(k + 1), f); }
// the ground: the regions blended, cut down to let the line through
function ground(x, z) { let h = rawH(x, z); const dz = Math.abs(z - trackZ(x)); if (dz < 45) { const ty = trackY(x) - 1.6; if (h > ty) h = lerpN(ty, h, sstep(dz, 14, 45)); } return h; }

// ---------- the sky: its colours and the fog follow the region you are in; over the Floating Isles a ringed world hangs in the sky ----------
let hour = 15.0;
function sunDir(h) { const a = (h - 6) / 12 * Math.PI; return V3(Math.cos(a) * 0.75, Math.sin(a) * 0.82, -0.45).normalize(); }
const skyU = { sun: { value: V3(0, 1, 0) }, top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, day: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(40000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "#include <common>\n#include <logdepthbuf_pars_vertex>\nvarying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n#include <logdepthbuf_vertex>\n}",
  fragmentShader: `#include <logdepthbuf_pars_fragment>
  uniform vec3 sun, top, hor; uniform float day; varying vec3 vD;
  float h2(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
  void main(){
    #include <logdepthbuf_fragment>
    float h = max(vD.y, 0.0), s = max(dot(vD, sun), 0.0);
    vec3 c = mix(hor, top, pow(h, 0.5)) * mix(0.06, 1.0, day);
    c += vec3(1.0, 0.55, 0.3) * pow(1.0 - h, 6.0) * smoothstep(0.35, -0.05, sun.y) * smoothstep(-0.3, 0.0, sun.y) * pow(s, 1.5);
    c += vec3(1.0, 0.92, 0.75) * (pow(s, 1200.0) * 8.0 + pow(s, 14.0) * 0.25 * day);
    vec3 q = floor(vD * 260.0); float st = step(0.9975, h2(q)) * (1.0 - day) * smoothstep(0.0, 0.2, vD.y); c += vec3(st);
    if (vD.y < 0.0) c = hor * mix(0.06, 0.8, day);
    gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` }));
scene.add(sky);
scene.fog = new THREE.Fog(0xcccccc, 300, 7000);
const hemi = new THREE.HemisphereLight(0xdde8ff, 0x6a6048, 1.0); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff2dc, 2.6); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048);
Object.assign(sunL.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 600 }); sunL.shadow.bias = -0.0005; sunL.shadow.normalBias = 0.04; scene.add(sunL, sunL.target);
const PLANET = new THREE.Group(); { const m = new THREE.Mesh(new THREE.SphereGeometry(2600, 48, 24), new THREE.MeshBasicMaterial({ color: 0xc8a8e8, fog: false, transparent: true }));
  const r = new THREE.Mesh(new THREE.RingGeometry(3400, 5600, 96), new THREE.MeshBasicMaterial({ color: 0xe8d8c0, fog: false, transparent: true, side: THREE.DoubleSide })); r.rotation.x = 1.25; PLANET.add(m, r); PLANET.userData.mats = [m.material, r.material]; scene.add(PLANET); }
const _top = new THREE.Color(), _hor = new THREE.Color(); let fogFar = 7000, planetW = 0;
function updateSky(x, z) { weights(x, z); _top.setRGB(0, 0, 0); _hor.setRGB(0, 0, 0); let ff = 0, pw = 0; for (let k = 0; k < WN; k++) { const B = BIOMES[WB[k]], w = WW[k]; _top.r += B.ctop.r * w; _top.g += B.ctop.g * w; _top.b += B.ctop.b * w; _hor.r += B.chor.r * w; _hor.g += B.chor.g * w; _hor.b += B.chor.b * w; ff += B.fog * w; pw += (B.planet || 0) * w; }
  fogFar = lerpN(fogFar, ff, 0.02); planetW = lerpN(planetW, pw, 0.02); skyU.top.value.lerp(_top, 0.03); skyU.hor.value.lerp(_hor, 0.03); }
function updateLight() { const d = sunDir(hour), day = clampN((d.y + 0.1) / 0.3, 0, 1); skyU.sun.value.copy(d); skyU.day.value = day; sunL.intensity = 2.6 * clampN(d.y / 0.12, 0, 1); hemi.intensity = 0.15 + 0.85 * day;
  scene.fog.color.copy(skyU.hor.value).multiplyScalar(lerpN(0.06, 0.85, day)); scene.fog.near = fogFar * 0.04; scene.fog.far = fogFar; renderer.toneMappingExposure = 1.0 + 0.5 * (1 - day);
  PLANET.userData.mats.forEach(m => m.opacity = planetW * (0.35 + 0.65 * day)); PLANET.visible = planetW > 0.01; return d; }

// ---------- the ground: nested grids that follow you, coloured by the regions ----------
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const _gc = new THREE.Color(), _ga = new THREE.Color();
function groundColor(x, z, h, slope, out) { weights(x, z); let r = 0, g = 0, b = 0; const n = fbm(x / 40, z / 40, 3, 60), n2 = fbm(x / 7, z / 7, 2, 61);
  for (let k = 0; k < WN; k++) { const B = BIOMES[WB[k]], w = WW[k]; _gc.copy(B.c[0]).lerp(B.c[1], n);
    if (B.ember) { const v = Math.abs(fbm(x / 30, z / 30, 3, 62) - 0.5); if (v < 0.03) _gc.setRGB(1.6, 0.45, 0.1); }
    if (B.name === "Frost Peaks" && h < 45) _gc.lerp(_ga.set("#6a7a6a"), 0.5 * sstep(45 - h, 0, 15));
    if (B.name === "Arch Canyons") _gc.multiplyScalar(0.85 + 0.25 * (0.5 + 0.5 * Math.sin(h * 1.3)));
    if (B.name === "Toy Geometry") { const q = Math.floor(h / 4) & 3; _gc.set(["#8ad08a", "#f0e080", "#f0a0c0", "#90c8f0"][q]); }
    r += _gc.r * w; g += _gc.g * w; b += _gc.b * w; }
  const sh = (0.88 + 0.24 * n2) * (slope > 0.9 ? 0.75 : 1); if (h < 0.6) { const wet = sstep(0.6 - h, 0, 2); r = lerpN(r, 0.55, wet * 0.5); g = lerpN(g, 0.5, wet * 0.5); b = lerpN(b, 0.38, wet * 0.5); }
  out[0] = r * sh; out[1] = g * sh; out[2] = b * sh; }
const ME = { x: 0, y: 0, z: 0, vy: 0 };
function grid(size, n, drop, level) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.receiveShadow = true; m.userData = { size, n, drop, level, cx: 1e12, cz: 1e12, inner: null }; scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(240, 120, 0, 0), grid(1800, 150, 0.3, 1), grid(12000, 150, 2, 2), grid(70000, 110, 10, 3)] : [grid(320, 160, 0, 0), grid(2200, 200, 0.3, 1), grid(14000, 200, 2, 2), grid(80000, 140, 10, 3)];
for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox, 0, oz);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = ground(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    groundColor(x, z, H[i], slope, c3); const dme = Math.hypot(x - ME.x, z - ME.z); let y = H[i] - dme * dme / 12.7e6 - drop;
    if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 25 + drop * 4; }
    p.setY(i, y); col.setXYZ(i, c3[0], c3[1], c3[2]); }
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = true; m.geometry.computeVertexNormals(); }
function updateGround(force = false) { for (const m of GRIDS) if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * (m.userData.level === 1 ? 0.05 : 0.08)) { fillGrid(m); if (!force) return; } }
// the water: one sheet at sea level that goes where you go
const WATER = new THREE.Mesh(new THREE.PlaneGeometry(90000, 90000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a6a7a, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.88 })); WATER.receiveShadow = true; scene.add(WATER);

// ---------- the things standing in each region: one instanced mesh per kind, re-placed round you as you move ----------
const MT = (x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
// merge [geometry, colour, matrix] parts into one geometry with vertex colours (a little shading jitter on each face)
function G(parts) { let n = 0; const gs = parts.map(([g, c, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m || MT()); q.deleteAttribute("uv"); n += q.attributes.position.count; return [q, new THREE.Color(c)]; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0, f = 0;
  for (const [q, c] of gs) { const k = q.attributes.position.count; pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); for (let i = 0; i < k; i++) { if (i % 3 === 0) f = 0.9 + 0.2 * hash(o + i, 7, 99); col[(o + i) * 3] = c.r * f; col[(o + i) * 3 + 1] = c.g * f; col[(o + i) * 3 + 2] = c.b * f; } o += k; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere(); return g; }
const Cy = (r0, r1, h, s = 8, open = false) => new THREE.CylinderGeometry(r0, r1, h, s, 1, open), Sp = (r, a = 10, b = 7) => new THREE.SphereGeometry(r, a, b), Ic = r => new THREE.IcosahedronGeometry(r, 0), Bx = (a, b, c) => new THREE.BoxGeometry(a, b, c), Co = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s), To = (R, r, a = Math.PI * 2, s = 18) => new THREE.TorusGeometry(R, r, 6, s, a);
const MAT = { std: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }), smooth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.5, depthWrite: false }), glow: new THREE.MeshBasicMaterial({ vertexColors: true }), metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.75, flatShading: true }) };
// a kind of thing: the region it belongs to, its parts (geometry, material), spacing of its grid and how far out it is placed, how dense,
// its size range, how high it stands (or floats), and whether you can stand on its top (top: height in its own units; rad: radius) or
// bump into it (solid: trunk radius in its own units)
const KINDS = [];
function kind(b, parts, o) { KINDS.push({ b, parts, sp: 30, r: 500, dens: 0.5, s: [1, 1], y: 0, max: 1500, wet: false, ...o }); }
// Mushroom Meadow
for (const [cap, spot] of [["#c8302a", "#f4f0e0"], ["#8a4ac8", "#e8d8f8"], ["#e8a030", "#fff4d0"]]) kind(0, [[G([[Cy(0.28, 0.4, 3, 9), "#f2ead8", MT(0, 1.5, 0)], [new THREE.SphereGeometry(1.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap, MT(0, 2.9, 0, 1, 0.62, 1)], [Cy(1.65, 1.65, 0.12, 12), "#e8dcc0", MT(0, 2.92, 0)], ...[0, 1, 2, 3, 4].map(k => [Sp(0.22, 6, 4), spot, MT(Math.cos(k * 1.3) * 1.0, 3.6 - 0.15 * (k % 2), Math.sin(k * 1.3) * 1.0, 1, 0.5, 1)])]), "smooth"]], { sp: 45, r: 650, dens: 0.35, s: [1.5, 7], top: 3.95, rad: 1.4, solid: 0.35 });
kind(0, [[G([...[0, 1, 2, 3, 4, 5].map(k => [Co(0.12, 0.5, 5), ["#f0e040", "#f080c0", "#ffffff", "#80a0f0"][k % 4], MT(Math.cos(k) * 0.5, 0.25, Math.sin(k * 1.7) * 0.5)]), [Ic(0.5), "#4a8a3a", MT(0, 0.1, 0, 1.4, 0.4, 1.4)]]), "std"]], { sp: 9, r: 160, dens: 0.4, s: [1, 2.5] });
// Crystal Dunes
for (const c of ["#b080ff", "#ffb050", "#70e0e8"]) kind(1, [[G([...[0, 1, 2, 3, 4].map(k => [new THREE.OctahedronGeometry(1, 0), c, MT(Math.cos(k * 1.9) * 0.9 * (k > 0), 1.8 + k * 0.2 - (k > 0) * 0.8, Math.sin(k * 1.9) * 0.9 * (k > 0), 0.45, 2.4 - 0.4 * (k > 0), 0.45, 0.3 * Math.sin(k), 0, 0.3 * Math.cos(k))])]), "glow"]], { sp: 50, r: 700, dens: 0.3, s: [1, 6] });
kind(1, [[G([[new THREE.DodecahedronGeometry(1, 0), "#a07a5a", MT(0, 0.3, 0, 1.3, 0.7, 1)]]), "std"]], { sp: 25, r: 300, dens: 0.25, s: [0.5, 2.5] });
// Floating Isles: islands of rock and turf hanging in the air, a tree or two on each (you can land on them)
kind(2, [[G([[Co(1, 1.6, 9), "#7a6a5a", MT(0, -0.82, 0, 1, 1, 1, Math.PI, 0, 0)], [Cy(1.02, 1.0, 0.15, 9), "#5a9a48", MT(0, -0.05, 0)], [Cy(0.04, 0.06, 0.35, 5), "#5a4030", MT(0.3, 0.17, 0.2)], [Ic(0.2), "#3a7a2a", MT(0.3, 0.42, 0.2)], [Cy(0.03, 0.05, 0.25, 5), "#5a4030", MT(-0.4, 0.12, -0.3)], [Ic(0.15), "#4a8a32", MT(-0.4, 0.3, -0.3)]]), "std"]], { sp: 170, r: 2200, dens: 0.55, s: [10, 40], y: [25, 110], fly: 1, top: 0.0, rad: 0.95, max: 600 });
kind(2, [[G([[new THREE.DodecahedronGeometry(1, 0), "#6a6a62", MT(0, 0, 0, 1, 0.6, 1)]]), "std"]], { sp: 40, r: 500, dens: 0.2, s: [2, 6], wet: true });
// Stone Forest: pillars of banded stone, some a hundred metres tall; flat tops you can land on
kind(3, [[G([[Cy(0.105, 0.13, 0.35, 9), "#a89480", MT(0, 0.175, 0)], [Cy(0.1, 0.105, 0.3, 9), "#c8b498", MT(0, 0.5, 0)], [Cy(0.11, 0.1, 0.35, 9), "#8a7a6a", MT(0, 0.825, 0)], [Cy(0.125, 0.11, 0.04, 9), "#5a8a48", MT(0, 1.0, 0)]]), "std"]], { sp: 55, r: 1600, dens: 0.55, s: [25, 110], top: 1.02, rad: 0.11, solid: 0.12, max: 1200 });
kind(3, [[G([[new THREE.DodecahedronGeometry(1, 0), "#9a8a78", MT(0, 0.3, 0, 1.2, 0.8, 1)]]), "std"]], { sp: 20, r: 300, dens: 0.3, s: [0.6, 3] });
// Glass Wood: dark trunks, crowns of glass
kind(4, [[G([[Cy(0.12, 0.2, 4, 6), "#3a3448", MT(0, 2, 0)], [Cy(0.04, 0.07, 1.6, 5), "#3a3448", MT(0.5, 3.4, 0, 1, 1, 1, 0, 0, -0.6)]]), "std"], [G([[Ic(1.6), "#a8f0ff", MT(0, 5.4, 0)], [Ic(1.1), "#d0b8ff", MT(1.0, 4.6, 0.4)], [Ic(1.0), "#b8ffd8", MT(-0.9, 4.8, -0.5)]]), "glass"]], { sp: 14, r: 420, dens: 0.55, s: [1.2, 3.2], solid: 0.18, max: 2500 });
// Drowned City: towers and walls standing in the shallows, an arch here and there
kind(5, [[G([[Bx(1, 1, 1), "#9a948a", MT(0, 0.5, 0)], ...[0.2, 0.4, 0.6, 0.8].map(y => [Bx(1.01, 0.05, 1.01), "#3a3a40", MT(0, y, 0)]), [Bx(1.06, 0.03, 1.06), "#7a746a", MT(0, 1.0, 0)]]), "std"]], { sp: 45, r: 1400, dens: 0.45, s: [8, 45], wet: true, sy: [1.5, 4], top: 1.0, rad: 0.45, solid: 0.5, max: 900 });
kind(5, [[G([[To(1, 0.18, Math.PI, 10), "#8a8478", MT(0, 0, 0)], [Bx(0.36, 1.2, 0.36), "#8a8478", MT(-1, -0.6, 0)], [Bx(0.36, 1.2, 0.36), "#8a8478", MT(1, -0.6, 0)]]), "std"]], { sp: 90, r: 900, dens: 0.3, s: [4, 12], y: 1.2, wet: true });
// Coral Highlands
kind(6, [[G([...[0, 1, 2].map(k => [Cy(0.9, 0.9, 0.06, 12), ["#f06070", "#f0a040", "#e070d0"][k], MT(0, 1.0 + k * 0.2, k * 0.12, 1, 1, 1, Math.PI / 2, k * 0.7, 0)]), [Cy(0.06, 0.08, 0.6, 5), "#c05050", MT(0, 0.3, 0)]]), "smooth"]], { sp: 22, r: 450, dens: 0.35, s: [1.5, 6] });
kind(6, [[G([...[0, 1, 2, 3, 4, 5, 6].map(k => [Cy(0.09, 0.14, 1.6, 6), "#ff8a5a", MT(Math.cos(k * 0.9) * 0.4 * (k > 0), 0.8 + (k > 0) * 0.5, Math.sin(k * 0.9) * 0.4 * (k > 0), 1, 1, 1, Math.sin(k) * 0.6 * (k > 0), 0, Math.cos(k) * 0.6 * (k > 0))])]), "smooth"]], { sp: 26, r: 450, dens: 0.35, s: [1.5, 5] });
kind(6, [[G([...[0, 1, 2, 3, 4].map(k => [Cy(0.25, 0.3, 1 + k * 0.3, 10, true), "#f8e0a0", MT(Math.cos(k * 1.4) * 0.6, (1 + k * 0.3) / 2, Math.sin(k * 1.4) * 0.6)])]), "smooth"]], { sp: 30, r: 400, dens: 0.3, s: [1, 4] });
// Ember Fields: black glass spikes, glowing vents
kind(7, [[G([[Co(0.5, 3, 6), "#1a1418", MT(0, 1.5, 0)], [Co(0.3, 1.8, 5), "#221a1e", MT(0.5, 0.9, 0.2, 1, 1, 1, 0, 0, -0.3)]]), "metal"]], { sp: 24, r: 600, dens: 0.4, s: [1.5, 8] });
kind(7, [[G([[Sp(0.6, 10, 6), "#ff7a20", MT(0, 0.1, 0, 1, 0.4, 1)], [Sp(0.3, 8, 5), "#ffd060", MT(0, 0.3, 0)]]), "glow"]], { sp: 35, r: 700, dens: 0.35, s: [1, 4] });
// Frost Peaks: snow pines and blue ice spires
kind(8, [[G([[Cy(0.12, 0.18, 1.5, 5), "#4a3a2a", MT(0, 0.75, 0)], [Co(1.5, 2.6, 7), "#2a4a3a", MT(0, 2.5, 0)], [Co(1.2, 2.2, 7), "#e8f0f4", MT(0, 3.6, 0)], [Co(0.8, 1.8, 7), "#2e5040", MT(0, 4.6, 0)], [Co(0.5, 1.2, 7), "#f0f4f8", MT(0, 5.4, 0)]]), "std"]], { sp: 12, r: 450, dens: 0.4, s: [1, 2.6], solid: 0.18, max: 2500 });
kind(8, [[G([[Co(0.6, 6, 6), "#a8d8ff", MT(0, 3, 0)], [Co(0.3, 3, 5), "#c8e8ff", MT(0.6, 1.5, 0.2, 1, 1, 1, 0, 0, -0.2)]]), "glass"]], { sp: 60, r: 900, dens: 0.25, s: [2, 8] });
// Bone Plains: the ribs and skulls of something enormous
kind(9, [[G([...[0, 1, 2, 3, 4, 5].map(k => [To(1, 0.05, Math.PI * 0.9, 12), "#ece4cc", MT(0, 0, -1.2 + k * 0.5, 1 - Math.abs(k - 2.5) * 0.08, 1.3 - Math.abs(k - 2.5) * 0.1, 1, 0, 0, Math.PI * 0.05)]), [Cy(0.08, 0.08, 3.2, 6), "#e0d8bc", MT(0, 0.05, 0, 1, 1, 1, Math.PI / 2, 0, 0)]]), "smooth"]], { sp: 120, r: 1400, dens: 0.4, s: [8, 22], max: 400 });
kind(9, [[G([[Sp(1, 12, 9), "#e8e0c4", MT(0, 0.8, 0, 1, 0.85, 1.2)], [Sp(0.25, 8, 6), "#1a1612", MT(0.38, 0.9, 0.95)], [Sp(0.25, 8, 6), "#1a1612", MT(-0.38, 0.9, 0.95)], [Bx(1.1, 0.35, 0.7), "#e0d8bc", MT(0, 0.2, 0.8)]]), "smooth"]], { sp: 160, r: 1200, dens: 0.3, s: [3, 10], max: 200 });
// Toy Geometry: huge spheres, cubes, rings and cones in bright colours, some resting, some floating
kind(10, [[G([[Sp(1, 18, 12), "#ffffff", MT(0, 1, 0)]]), "smooth"]], { sp: 60, r: 1000, dens: 0.3, s: [2, 12], tint: ["#f04848", "#f0c030", "#40a0f0", "#60d070", "#c060f0"], top: 2.0, rad: 0.5 });
kind(10, [[G([[Bx(2, 2, 2), "#ffffff", MT(0, 1, 0)]]), "smooth"]], { sp: 60, r: 1000, dens: 0.3, s: [2, 10], tint: ["#f08040", "#30c0b0", "#f0f0f0", "#f070a0"], top: 2.0, rad: 0.95, solid: 1.0, spin: 1 });
kind(10, [[G([[To(1, 0.3, Math.PI * 2, 32), "#ffffff", MT(0, 0, 0)]]), "smooth"]], { sp: 110, r: 1400, dens: 0.35, s: [4, 20], y: [6, 40], fly: 1, tint: ["#f04848", "#f0c030", "#40a0f0", "#60d070"], tilt: 1 });
kind(10, [[G([[Co(1, 2.4, 24), "#ffffff", MT(0, 1.2, 0)]]), "smooth"]], { sp: 70, r: 1000, dens: 0.25, s: [2, 9], tint: ["#f0a030", "#9060f0", "#30b0f0"] });
// Great Lake: lily pads big enough to stand on, reeds at the shore
kind(11, [[G([[Cy(1, 1, 0.05, 16), "#3a8a3a", MT(0, 0, 0)], [Sp(0.15, 6, 4), "#f8d0e8", MT(0.4, 0.1, 0.2)]]), "std"]], { sp: 12, r: 350, dens: 0.4, s: [1, 4], water: 1, top: 0.03, rad: 0.95, max: 2500 });
kind(11, [[G([...[0, 1, 2, 3, 4, 5, 6, 7].map(k => [Cy(0.02, 0.03, 2.2, 4), "#6a8a3a", MT(Math.cos(k * 2.3) * 0.4, 1.1, Math.sin(k * 2.3) * 0.4, 1, 1, 1, Math.sin(k) * 0.1, 0, Math.cos(k) * 0.1)]), [Cy(0.05, 0.05, 0.4, 5), "#6a4a2a", MT(0.1, 2.2, 0)]]), "std"]], { sp: 6, r: 160, dens: 0.5, s: [0.8, 1.6], shore: 1, max: 2500 });
// Arch Canyons: stone arches and hoodoos
kind(12, [[G([[To(1, 0.22, Math.PI, 12), "#c8703a", MT(0, 0, 0, 1, 1, 1.5)], [Bx(0.5, 0.6, 0.6), "#b0603a", MT(-1, 0, 0)], [Bx(0.5, 0.6, 0.6), "#b0603a", MT(1, 0, 0)]]), "std"]], { sp: 140, r: 1500, dens: 0.4, s: [10, 35], max: 400 });
kind(12, [[G([[Cy(0.35, 0.5, 2, 7), "#c87848", MT(0, 1, 0)], [Sp(0.45, 8, 5), "#d89058", MT(0, 2.2, 0, 1, 0.7, 1)], [Cy(0.25, 0.3, 1, 7), "#b86838", MT(0, 2.8, 0)], [Cy(0.6, 0.55, 0.2, 7), "#8a5030", MT(0, 3.35, 0)]]), "std"]], { sp: 40, r: 900, dens: 0.35, s: [2, 8], solid: 0.4, top: 3.45, rad: 0.55 });
// Clockwork Grove: giant gears standing on edge, slowly turning; pylons with glowing lamps
kind(13, [[G([[To(1, 0.12, Math.PI * 2, 24), "#b08a40", MT(0, 0, 0)], ...Array.from({ length: 16 }, (_, k) => [Bx(0.18, 0.28, 0.2), "#a07a38", MT(Math.cos(k / 16 * Math.PI * 2) * 1.15, Math.sin(k / 16 * Math.PI * 2) * 1.15, 0, 1, 1, 1, 0, 0, k / 16 * Math.PI * 2)]), ...[0, 1, 2, 3].map(k => [Bx(0.08, 1.9, 0.08), "#8a6a30", MT(0, 0, 0, 1, 1, 1, 0, 0, k * Math.PI / 4)]), [Cy(0.2, 0.2, 0.3, 10), "#6a5020", MT(0, 0, 0, 1, 1, 1, Math.PI / 2, 0, 0)]]), "metal"]], { sp: 60, r: 900, dens: 0.4, s: [3, 14], y: 1.35, gear: 1 });
kind(13, [[G([[Cy(0.08, 0.12, 6, 6), "#5a5a5e", MT(0, 3, 0)], [Bx(1.2, 0.08, 0.08), "#5a5a5e", MT(0, 5.6, 0)]]), "metal"], [G([[Sp(0.25, 10, 7), "#80f0ff", MT(0.6, 5.3, 0)], [Sp(0.25, 10, 7), "#80f0ff", MT(-0.6, 5.3, 0)], [Sp(0.3, 10, 7), "#ffe080", MT(0, 6.2, 0)]]), "glow"]], { sp: 40, r: 700, dens: 0.35, s: [1, 2.5], solid: 0.12 });
// Giant Grass: blades that tower over you, dandelion clocks the size of trees
kind(14, [[G([[Co(0.3, 1, 4), "#5a9a30", MT(0, 0.5, 0, 1, 1, 0.25)]]), "std"]], { sp: 3.5, r: 110, dens: 0.75, s: [6, 18], max: 4000, lean: 1 });
kind(14, [[G([[Cy(0.02, 0.03, 4, 5), "#6a9a3a", MT(0, 2, 0)], [Sp(0.6, 12, 8), "#f4f4ec", MT(0, 4.3, 0)], [Sp(0.15, 8, 5), "#a89a50", MT(0, 4.3, 0)]]), "std"]], { sp: 28, r: 500, dens: 0.35, s: [2, 5] });
// every kind gets its instanced meshes; a kind is refilled when you have moved a fifth of its reach since it was last filled
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = V3(0, 0, 0), _s = V3(1, 1, 1), _col = new THREE.Color();
for (const K of KINDS) { K.meshes = K.parts.map(([g, m]) => { const im = new THREE.InstancedMesh(g, MAT[m], K.max); im.count = 0; im.frustumCulled = false; im.castShadow = m !== "glass" && m !== "glow"; im.receiveShadow = m !== "glow"; scene.add(im); return im; }); K.cx = 1e12; K.cz = 1e12; K.items = []; K.tints = (K.tint || []).map(c => new THREE.Color(c)); }
const corridor = (x, z, w) => Math.abs(z - trackZ(x)) < w;
function fillKind(K) { K.cx = ME.x; K.cz = ME.z; let n = 0; K.items = []; const S = K.sp, i0 = Math.floor((ME.x - K.r) / S), i1 = Math.floor((ME.x + K.r) / S), j0 = Math.floor((ME.z - K.r) / S), j1 = Math.floor((ME.z + K.r) / S), ki = KINDS.indexOf(K);
  for (let i = i0; i <= i1 && n < K.max; i++) for (let j = j0; j <= j1 && n < K.max; j++) { if (hash(i, j, ki * 7 + 100) > K.dens) continue; const x = (i + hash(i, j, ki + 200)) * S, z = (j + hash(i, j, ki + 300)) * S; if ((x - ME.x) ** 2 + (z - ME.z) ** 2 > K.r * K.r) continue;
    if (pickBiome(x, z, hash(i, j, ki + 400)) !== K.b) continue; const s = lerpN(K.s[0], K.s[1], Math.pow(hash(i, j, ki + 500), 1.6)); if (corridor(x, z, 12 + s * (K.rad || 1.5) * 1.2)) continue;
    const g = rawH(x, z); if (K.water ? g > -0.8 : K.shore ? (g < -0.3 || g > 1.2) : (!K.wet && !K.fly && g < 0.3)) continue;
    let y = K.water ? 0.02 : K.fly ? Math.max(g, 0) + lerpN(K.y[0], K.y[1], hash(i, j, ki + 600)) : g + (typeof K.y === "number" ? K.y * s : 0);
    const sy = K.sy ? s * lerpN(K.sy[0], K.sy[1], hash(i, j, ki + 700)) : s, ry = hash(i, j, ki + 800) * 6.283, rx = K.tilt ? (hash(i, j, ki + 900) - 0.5) * 1.6 : K.lean ? (hash(i, j, ki + 900) - 0.5) * 0.35 : 0, rz = K.lean ? (hash(i, j, ki + 950) - 0.5) * 0.35 : 0;
    _e.set(rx, ry, rz); _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(s, sy, s)); for (const im of K.meshes) im.setMatrixAt(n, _m4);
    if (K.tints.length) _col.copy(K.tints[Math.floor(hash(i, j, ki + 1000) * K.tints.length)]); else _col.setScalar(0.85 + 0.3 * hash(i, j, ki + 1000)); for (const im of K.meshes) im.setColorAt(n, _col);
    K.items.push({ x, y, z, s, sy, ry, n }); n++; }
  for (const im of K.meshes) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } }
let kindI = 0;
function updateKinds(all = false) { let done = 0; for (let t = 0; t < KINDS.length && (all || done < 2); t++) { const K = KINDS[kindI = (kindI + 1) % KINDS.length]; if (all || Math.hypot(ME.x - K.cx, ME.z - K.cz) > K.r * 0.2) { fillKind(K); done++; } } }
// the gears turn
function spinGears(t) { for (const K of KINDS) { if (!K.gear) continue; for (const it of K.items) { if (Math.abs(it.x - ME.x) > 300 || Math.abs(it.z - ME.z) > 300) continue; _e.set(0, it.ry, t * 0.3 * (it.n % 2 ? 1 : -1) * 6 / it.s); _m4.compose(_p.set(it.x, it.y, it.z), _q.setFromEuler(_e), _s.set(it.s, it.s, it.s)); K.meshes[0].setMatrixAt(it.n, _m4); } K.meshes[0].instanceMatrix.needsUpdate = true; } }
// standing on things, and bumping into them
function propFloor(x, z, yRef) { let best = -1e9; for (const K of KINDS) { if (K.top === undefined) continue; for (const it of K.items) { const r = K.rad * it.s, dx = x - it.x, dz = z - it.z; if (dx * dx + dz * dz > r * r) continue; const t = it.y + K.top * it.sy; if (t <= yRef + 0.6 && t > best) best = t; } } return best; }
function propPush(x, z, y) { for (const K of KINDS) { if (!K.solid) continue; for (const it of K.items) { const r = K.solid * it.s + 0.25, dx = x - it.x, dz = z - it.z, d2 = dx * dx + dz * dz; if (d2 > r * r || d2 < 1e-6) continue; const top = it.y + (K.top !== undefined ? K.top * it.sy : 8 * it.sy); if (y > top - 0.3 || y + 1.7 < it.y) continue; const d = Math.sqrt(d2); x = it.x + dx / d * r; z = it.z + dz / d * r; } } return [x, z]; }

// ---------- the endless railway: two tracks, eastbound on the south track and westbound on the north, a station every 3 km ----------
// The trains keep a timetable: each waits 20 s at a station, then runs 100 s to the next. Eastbound and westbound trains run 6 km apart.
const TRK = 4.5, STN = 3000, VCAR = 30, DWELL = 20, RUN = 100, PERIOD = DWELL + RUN, NCAR = 5, CARL = 18, GAP = 1.2;
const railMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3, flatShading: true });
const RAILG = new THREE.Mesh(new THREE.BufferGeometry(), railMat); RAILG.castShadow = true; RAILG.receiveShadow = true; RAILG.frustumCulled = false; scene.add(RAILG);
const STATION_LABELS = []; let railCx = 1e12;
const stationName = k => { const n = 2 + Math.floor(hash(k, 9, 70) * 2); let s = ""; for (let q = 0; q < n; q++) s += SYL[Math.floor(hash(k, q, 71) * SYL.length)]; return s[0].toUpperCase() + s.slice(1) + [" Halt", " Junction", " Station", " Crossing", " Cross"][Math.floor(hash(k, 3, 72) * 5)]; };
function labelTex(text) { const c = document.createElement("canvas"); c.width = 512; c.height = 96; const g = c.getContext("2d"); g.fillStyle = "#1e2a3a"; g.fillRect(0, 0, 512, 96); g.strokeStyle = "#e8d8a8"; g.lineWidth = 6; g.strokeRect(6, 6, 500, 84); g.fillStyle = "#f4ecd8"; g.font = "bold 44px Georgia"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 50); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function buildRail() { const cx = Math.round(ME.x / 1000) * 1000; if (cx === railCx) return; railCx = cx; const parts = [];
  const box = (x, y, z, sx, sy, sz, ry, col) => parts.push([Bx(sx, sy, sz), col, MT(x, y, z, 1, 1, 1, 0, ry, 0)]);
  for (let x = cx - 2600; x < cx + 2600; x += 2.6) { const z = trackZ(x), y = trackY(x), a = Math.atan(trackDZ(x)), ry = -a, c = Math.cos(a), s = Math.sin(a);
    for (const sd of [-1, 1]) { const oz = sd * TRK; box(x - s * oz, y, z + c * oz, 0.25, 0.16, 2.6, ry, "#5a4a3a"); }
    if (Math.round(x / 2.6) % 4 === 0) { box(x, y - 0.25, z, 2.6 * 4, 0.35, TRK * 2 + 3.2, ry, "#7a7468"); const g = rawH(x, z); if (y - g > 1.5 && Math.round(x / 2.6) % 8 === 0) for (const sd of [-1, 1]) { const h = y - 0.4 - Math.min(g, 0) + 2; box(x - s * sd * TRK, y - 0.4 - h / 2, z + c * sd * TRK, 0.7, h, 0.7, ry, "#6a6458"); } }
    for (const sd of [-1, 1]) for (const rr of [-0.72, 0.72]) { const oz = sd * TRK + rr; box(x - s * oz, y + 0.14, z + c * oz, 2.62, 0.12, 0.08, ry, "#8a8a90"); } }
  for (let k = Math.ceil((cx - 2600) / STN); k * STN < cx + 2600; k++) { const x0 = k * STN; for (let x = x0 - 70; x < x0 + 70; x += 10) { const z = trackZ(x + 5), y = trackY(x + 5), ry = -Math.atan(trackDZ(x + 5)); box(x + 5, y + 0.45, z, 10.2, 1.0, 5.4, ry, "#b8b0a0"); }
    const z0 = trackZ(x0), y0 = trackY(x0), ry0 = -Math.atan(trackDZ(x0)); for (const dx of [-40, -20, 0, 20, 40]) { box(x0 + dx, y0 + 2.6, trackZ(x0 + dx), 0.2, 3.4, 0.2, ry0, "#3a3a40"); } box(x0, y0 + 4.4, z0, 92, 0.2, 5.0, ry0, "#7a3a2a"); }
  RAILG.geometry.dispose(); RAILG.geometry = G(parts);
  for (const L of STATION_LABELS) { scene.remove(L); L.material.map.dispose(); } STATION_LABELS.length = 0;
  for (let k = Math.ceil((cx - 2600) / STN); k * STN < cx + 2600; k++) { const x0 = k * STN, y0 = trackY(x0), ry0 = -Math.atan(trackDZ(x0)); for (const sd of [-1, 1]) { const me = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.95), new THREE.MeshBasicMaterial({ map: labelTex(stationName(k)), side: THREE.DoubleSide })); me.position.set(x0, y0 + 3.7, trackZ(x0) + sd * 0.15); me.rotation.y = ry0; scene.add(me); STATION_LABELS.push(me); } } }
// a train: a streamlined engine and four open observation cars (benches, a canopy on posts, so you can see out)
function trainGroup(col) { const T = new THREE.Group(); const body = new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, metalness: 0.4 }), dark = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.4 }), trim = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.4, metalness: 0.5 }), wood = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.7 });
  const add = (P, geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; P.add(me); return me; };
  T.cars = []; for (let c = 0; c < NCAR; c++) { const C = new THREE.Group(); T.add(C); T.cars.push(C);
    add(C, Bx(3.0, 0.5, CARL), dark, 0, 0.55, 0); for (const z of [-CARL / 2 + 2.5, CARL / 2 - 2.5]) for (const x of [-0.8, 0.8]) add(C, Cy(0.45, 0.45, 0.2, 10).rotateZ(Math.PI / 2), dark, x, 0.45, z);
    if (c === 0) { add(C, Bx(3.0, 2.8, CARL - 3), body, 0, 2.2, -1.5); const nose = add(C, Sp(1.5, 16, 10), body, 0, 2.0, CARL / 2 - 3); nose.scale.set(1, 0.95, 2.0); add(C, Bx(3.05, 0.5, CARL - 3), dark, 0, 2.8, -1.5); add(C, Bx(3.1, 0.18, CARL), trim, 0, 1.0, 0); }
    else { add(C, Bx(3.0, 0.15, CARL), wood, 0, 0.88, 0); for (const sd of [-1, 1]) { add(C, Bx(0.1, 0.9, CARL), body, sd * 1.45, 1.4, 0); add(C, Bx(0.12, 0.08, CARL), trim, sd * 1.45, 1.88, 0); }
      for (let k = 0; k < 5; k++) { const z = -CARL / 2 + 2 + k * 3.5; add(C, Bx(2.4, 0.1, 0.5), wood, 0, 1.4, z); add(C, Bx(2.4, 0.6, 0.08), wood, 0, 1.7, z - 0.25); }
      for (const z of [-CARL / 2 + 0.3, CARL / 2 - 0.3]) for (const sd of [-1, 1]) add(C, Cy(0.06, 0.06, 2.6, 6), trim, sd * 1.4, 2.25, z); add(C, Bx(3.2, 0.12, CARL), body, 0, 3.55, 0); } }
  T.visible = false; scene.add(T); return T; }
const S_of = t => STN * Math.floor(t / PERIOD) + VCAR * Math.max(0, (t % PERIOD) - DWELL);
const POOL = { 1: [0, 1, 2].map(() => trainGroup(0x2a5a9a)), "-1": [0, 1, 2].map(() => trainGroup(0x9a2a2a)) };
// where car c of train k in direction d is at time t: its centre and heading
function carPose(d, k, c, t) { let x = d * (S_of(t) + k * 2 * STN) + d * 55; for (let q = 0; q <= c; q++) { const step = (q === 0 ? CARL / 2 : CARL + GAP) / Math.sqrt(1 + trackDZ(x) ** 2); x -= d * step; } const a = Math.atan(trackDZ(x)), o = d > 0 ? TRK : -TRK, h = Math.atan2(1, trackDZ(x)) + (d > 0 ? 0 : Math.PI); return [x - o * Math.sin(a), trackY(x) + 0.2, trackZ(x) + o * Math.cos(a), h]; }
const dwelling = t => (t % PERIOD) < DWELL;
function updateTrains(t) { for (const d of [1, -1]) { const S = S_of(t), kc = Math.round((d * ME.x - S - 55) / (2 * STN)); POOL[d].forEach((T, q) => { const k = kc - 1 + q; T.userData.k = k; T.userData.d = d; const [hx] = carPose(d, k, 0, t); T.visible = Math.abs(hx - ME.x) < 3200 && Math.abs(trackZ(ME.x) - ME.z) < 6000;
      if (!T.visible) return; T.cars.forEach((C, c) => { const [x, y, z, h] = carPose(d, k, c, t); C.position.set(x, y, z); C.rotation.y = h; }); }); } }

// ---------- you: walking, the glider, riding the train ----------
let yaw = Math.PI / 2, pitch = 0.0, vrYaw = yaw, started = false, mode = "walk", ride = null, msgT = 0, rateI = 0, TIME = 3; const keys = {}, prevB = {}, RATES = [1, 60, 600];
const SKIFF = new THREE.Group(); { const m = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.4, metalness: 0.5 }), g = new THREE.MeshBasicMaterial({ color: 0x80f0ff }); const d = new THREE.Mesh(Cy(0.7, 0.55, 0.12, 20), m); d.position.y = -0.05; const r = new THREE.Mesh(To(0.62, 0.03, Math.PI * 2, 24), g); r.rotation.x = Math.PI / 2; r.position.y = -0.1; SKIFF.add(d, r); SKIFF.visible = false; rig.add(SKIFF); }
// what is underfoot: the ground, the water's surface (you wade, then swim at the top), a platform or the track deck, the top of something
function floorAt(x, z, yRef) { let f = Math.max(ground(x, z), -1.2); const tz = trackZ(x), dz = Math.abs(z - tz), ty = trackY(x);
  if (dz < 2.7 && Math.abs(x - Math.round(x / STN) * STN) < 70) f = Math.max(f, ty + 0.95); else if (dz < TRK + 2 && ty + 0.25 <= yRef + 0.8) f = Math.max(f, ty + 0.25);
  const p = propFloor(x, z, yRef); return Math.max(f, p); }
function say(html, secs = 10) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; const g = vrPanelT.image.getContext("2d"); g.clearRect(0, 0, 1024, 384); g.fillStyle = "rgba(14,16,24,0.9)"; g.fillRect(0, 0, 1024, 384); g.fillStyle = "#f2eee4"; g.font = "30px Georgia";
  const words = html.replace(/<br>/g, " ").replace(/<[^>]+>/g, "").split(" "); let line = "", y = 52; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 40; if (y > 360) break; } line += w + " "; } if (y <= 360) g.fillText(line, 32, y); vrPanelT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:720px;z-index:2;background:rgba(14,16,24,.88);color:#f2eee4;font:15px/1.5 Georgia,serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(14,16,24,.75);color:#f2eee4;font:13px/1.5 Georgia,serif;padding:6px 10px;border-radius:8px;display:none;text-align:right"; document.body.appendChild(HUD);
const vrPanelT = new THREE.CanvasTexture(Object.assign(document.createElement("canvas"), { width: 1024, height: 384 })), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.21), new THREE.MeshBasicMaterial({ map: vrPanelT, transparent: true, depthTest: false })); vrPanel.position.set(0, -0.4, -0.62); vrPanel.rotation.x = -0.7; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
let regionKey = "";
function regionCheck() { const [b, i, j] = dominant(ME.x, ME.z), key = i + "," + j; if (key === regionKey) return; regionKey = key; say(`<b>${regionTitle(b, i, j)}</b>`, 6); }
const regionTitle = (b, i, j) => { const n = cellName(i, j), t = BIOMES[b].name; return hash(i, j, 6) < 0.5 ? `The ${t} of ${n}` : `${n} ${t}`; };
function toggleGlider() { if (ride) return; mode = mode === "fly" ? "walk" : "fly"; SKIFF.visible = mode === "fly"; ME.vy = 0; say(mode === "fly" ? "<b>Glider out.</b> Fly where you look; <b>shift</b> for speed, <b>space</b> up, <b>C</b> down; <b>G</b> again to land." : "Glider away: you drop to whatever is below.", 6); }
function nearestCar() { let best = null, bd = 6.5; for (const d of [1, -1]) for (const T of POOL[d]) { if (!T.visible) continue; T.cars.forEach((C, c) => { if (c === 0) return; const dx = ME.x - C.position.x, dz = ME.z - C.position.z, along = Math.abs(dx * Math.sin(C.rotation.y) + dz * Math.cos(C.rotation.y)), side = Math.abs(dx * Math.cos(C.rotation.y) - dz * Math.sin(C.rotation.y)); const dd = Math.max(side - 1.5, 0) + Math.max(along - CARL / 2, 0); if (dd < bd && Math.abs(ME.y - C.position.y) < 3) { bd = dd; best = { d, k: T.userData.k, c, seat: clampN(Math.round(((ME.x - C.position.x) * Math.sin(C.rotation.y) + (ME.z - C.position.z) * Math.cos(C.rotation.y) + CARL / 2 - 2) / 3.5), 0, 4) }; } }); } return best; }
function act() { if (ride) { const [x, y, z, h] = carPose(ride.d, ride.k, ride.c, TIME); const ang = Math.atan(trackDZ(x)), cx = x + Math.sin(ang) * 0, nz = z - trackZ(x), sx = x + Math.sign(nz) * 2.6 * Math.sin(ang), sz = z - Math.sign(nz) * 2.6 * Math.cos(ang); ride = null; mode = "walk"; ME.x = sx; ME.z = sz; ME.y = floorAt(sx, sz, y + 2); ME.vy = 0; say(dwelling(TIME) ? "You step down onto the platform." : "You jump off.", 4); return; }
  const c = nearestCar(); if (c) { ride = c; mode = "ride"; SKIFF.visible = false; say(`<b>Aboard the ${c.d > 0 ? "eastbound" : "westbound"} train.</b> It stops 20 s at each station, every 3 km. <b>E</b> gets off.`, 7); return; }
  say("Nothing to board here. Trains stop at the stations on the railway (a station every 3 km). <b>G</b> takes out the glider.", 6); }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${["real time", "a minute a second", "ten minutes a second"][rateI]}.`, 3); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyG") toggleGlider(); if (e.code === "KeyT") setRate(rateI + 1); if (e.code === "KeyR") toStart(); if (e.code === "Space" && mode === "walk" && !ride && Math.abs(ME.y - floorAt(ME.x, ME.z, ME.y)) < 0.05) ME.vy = 5.5; });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function toStart() { ride = null; mode = "walk"; SKIFF.visible = false; ME.x = -25; ME.z = trackZ(-25); ME.y = floorAt(ME.x, ME.z, 100); ME.vy = 0; yaw = Math.PI / 2 + 0.25; vrYaw = yaw; pitch = 0; updateGround(true); updateKinds(true); buildRail(); }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block"; toStart(); regionKey = "x";
  say("<b>The Endless Land.</b> You are on the platform of the first station of a railway that runs east and west for ever. Each region is a different kind of place; walk, take the <b>glider</b> (<b>G</b>), or board a train (<b>E</b> beside a car). <b>R</b> brings you back here.", 14); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr"); if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let frameN = 0;
updateGround(true); updateKinds(true); buildRail();
const _fq = new THREE.Quaternion();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++; TIME += dt; if (started) hour = (hour + dt * RATES[rateI] / 3600) % 24;
  let mx = 0, my = 0, up = 0, run = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed, bY = gp.buttons[5]?.pressed; if (bX && !prevB.x) setRate(rateI + 1); prevB.x = bX; if (bY && !prevB.y) toStart(); prevB.y = bY; }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; if (Math.abs(ty) > 0.3) up = -ty;
        const bA = gp.buttons[4]?.pressed || gp.buttons[0]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.a) act(); prevB.a = bA; if (bB && !prevB.b) { if (mode === "walk" && Math.abs(ME.y - floorAt(ME.x, ME.z, ME.y)) < 0.05 && up > 0.5) ME.vy = 5.5; else toggleGlider(); } prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) up += 1; if (keys.KeyC) up -= 1; }
  camera.getWorldQuaternion(_fq);
  if (ride) { const [x, y, z, h] = carPose(ride.d, ride.k, ride.c, TIME), lz = -CARL / 2 + 2.25 + ride.seat * 3.5; ME.x = x + Math.sin(h) * lz; ME.z = z + Math.cos(h) * lz; ME.y = y + 1.0; }
  else if (mode === "fly") { const f = V3(0, 0, -1).applyQuaternion(_fq), sd = V3(1, 0, 0).applyQuaternion(_fq), sp = (run ? 110 : 28) * dt; ME.x += (f.x * -my + sd.x * mx) * sp; ME.z += (f.z * -my + sd.z * mx) * sp; ME.y += (f.y * -my + up) * sp; ME.y = Math.max(ME.y, floorAt(ME.x, ME.z, ME.y) + 0.3); }
  else { if (started && (mx || my)) { const f = V3(0, 0, -1).applyQuaternion(_fq); f.y = 0; f.normalize(); const sdv = V3(-f.z, 0, f.x), sp = (run ? 7 : 3) * dt; let nx = ME.x + (f.x * -my + sdv.x * mx) * sp, nz = ME.z + (f.z * -my + sdv.z * mx) * sp; const nf = floorAt(nx, nz, ME.y); if (nf - ME.y < 1.2) { [nx, nz] = propPush(nx, nz, ME.y); ME.x = nx; ME.z = nz; } }
    const fy = floorAt(ME.x, ME.z, ME.y); if (fy >= ME.y - 0.02 && ME.vy <= 0) { ME.y = lerpN(ME.y, fy, fy > ME.y ? 0.5 : 1); ME.vy = 0; } else { ME.vy -= 9.8 * dt; ME.y = Math.max(fy, ME.y + ME.vy * dt); if (ME.y === fy) ME.vy = 0; } }
  rig.position.set(ME.x, ME.y, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, ride ? 1.2 : 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  updateSky(ME.x, ME.z); const sd = updateLight(); sunL.position.set(ME.x + sd.x * 300, ME.y + Math.max(sd.y, 0.05) * 300, ME.z + sd.z * 300); sunL.target.position.set(ME.x, ME.y, ME.z); sky.position.copy(rig.position);
  PLANET.position.set(ME.x - 9000, ME.y + 14000, ME.z - 26000); WATER.position.set(Math.round(ME.x / 100) * 100, 0, Math.round(ME.z / 100) * 100);
  updateGround(); updateKinds(); if (frameN % 20 === 0) { buildRail(); regionCheck(); } updateTrains(TIME); spinGears(TIME);
  if (frameN % 10 === 0) { const [b, i, j] = dominant(ME.x, ME.z), hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60); HUD.innerHTML = `${regionTitle(b, i, j)}<br>${Math.round(ME.x / 100) / 10} km east, ${Math.round(-ME.z / 100) / 10} km north · ${mode === "fly" ? "gliding, " + Math.round(ME.y) + " m" : ride ? "on the train" : "on foot"}<br>${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} · G glider · E board · R start`; }
  msgT -= dt; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
