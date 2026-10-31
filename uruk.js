// uruk.js -- Uruk at its height, the Late Uruk period, about 3200 BC: the largest city in the world, with the Anu terrace and its White
// Temple, Eanna, the precinct of Inanna, with its huge halls and cone mosaics, the houses of perhaps 25,000-50,000 people, canals through
// the city, and the irrigated country, villages, palm groves and marshes round about. Built into uruk.html by build.py. Real size.
//
// What it rests on: the German excavations at Uruk-Warka since 1912 (Jordan, Nöldeke, Heinrich, Lenzen, Boehmer, Eichmann; magnetic survey
// by Fassbinder and van Ess), which uncovered the White Temple on the Anu terrace and the great buildings of Eanna levels V-IV, the earliest
// written tablets (Nissen, Damerow and Englund on proto-cuneiform), cylinder seals and the Uruk Vase; Robert McC. Adams and Nissen's surveys
// of the countryside; houses of the Uruk colonies at Habuba Kabira and Jebel Aruda; environmental work on the marshes. Much is unknown: the
// city's plan outside the sacred districts, its houses, how people dressed. Every marker says whether a thing is known, inferred, or typical.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const Q = new URLSearchParams(location.search), SEED = Math.max(1, Number(Q.get("seed") || 1) | 0);
const ERA = -3200, LATE = false, URUK = true;   // Late Uruk, about 3200 BC (LATE is the Eridu program's later era, not used here)
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 60000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const O3 = new THREE.Object3D(), clampN = THREE.MathUtils.clamp, sstepN = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
let s0 = (SEED * 48271) % 2147483647 || 1; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const seeded = n => { let s = (Math.imul(n | 0, 2654435761) ^ (SEED * 40503)) >>> 0 || 1; return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296; };

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(SEED, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 4) { let a = 0, f = 1, w = 0.5, s = 0; for (let k = 0; k < n; k++) { a += w * vnoise(x * f, z * f); s += w; f *= 2.03; w *= 0.5; } return a / s; }

// ---------- textures ----------
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const speckle = (base, n, cols, sw = 2, sh = 2) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let k = 0; k < n; k++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.globalAlpha = 0.25 + rnd() * 0.4; g.fillRect(rnd() * w, rnd() * h, sw * (0.5 + rnd()), sh * (0.5 + rnd())); } g.globalAlpha = 1; };


// ---------- the people of Uruk ----------
// Dress in the Late Uruk period is known from the Uruk Vase, cylinder seals and statuettes: men bare-chested in a kilt, the leading
// figure (the so-called priest-king) bearded, his hair in a bun held by a headband, in a long skirt with a net pattern; offering-bearers
// shown naked in the rites; women in long robes, some draped over one shoulder. Wool was now the main cloth (the tablets count sheep and
// textiles by the thousand), linen for the gods and their servants. Most people barefoot. Treat the details as inferred.
const SKINS = [0xb88a64, 0xa87a56, 0xc49670, 0x9a6c4a, 0xb08060, 0x8e6242];
// cloth: undyed linen and cotton (off-white), indigo blues, browns and butternut, checked and striped cottons (shown plain), madras red and yellow
const WOOL = [0xe0d6c0, 0xd2c6aa, 0xc0b292, 0x9a8a6e, 0x7a6a52, 0x5e5040, 0x8a7a66], LINEN = [0xe8e2d2, 0xdcd4c0, 0xd6ccb4], OCHRE = [0xa8582e, 0x8a4a2a, 0xb87a3a];
const LEATHER = [0x8a6a4a, 0x7a5a3a, 0x9a7a56, 0x6e5238], UNDYED = [0xe6dcc6, 0xd8ccb0, 0xc8b898, 0xb0a07e, 0x8a7a60], DYED = [0x8a3a2a, 0x4a4a7a, 0xa8742e, 0x6a2a3a];   // Ubaid: linen and leather; Ur III: wool, mostly undyed, colour for the better-off
const HAIRS = [0x1a120c, 0x2a1c12, 0x241810, 0x3a2618];
// geometry helpers: parts carry a vertex shade (darker in fold valleys and on undersides, a cheap stand-in for soft shadow)
function mergeG(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const q of gs) { const c = q.attributes.position.count; pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3);
    for (let i = 0; i < c; i++) { const sh = q.attributes.color ? q.attributes.color.getX(i) : 1, ny = q.attributes.normal.getY(i), v = sh * (0.8 + 0.2 * (ny * 0.5 + 0.5)); col[(o + i) * 3] = col[(o + i) * 3 + 1] = col[(o + i) * 3 + 2] = v; } o += c; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("color", new THREE.BufferAttribute(col, 3)); return out; }
const MT = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), V3(sx, sy, sz));
const G1 = (g, m = MT(0, 0, 0)) => mergeG([[g, m]]);
// cloth that hangs in folds: a tapered tube whose radius ripples more toward the hem, shaded in the valleys
function foldTube(rTop, rBot, h, segs, folds, amp, open = 0, thetaStart = 0, seed = 0) { const g = new THREE.CylinderGeometry(rTop, rBot, h, segs, 4, true, thetaStart, Math.PI * 2 - open), p = g.attributes.position, sh = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (h / 2 - y) / h, a = Math.atan2(x, z), wv = Math.sin(a * folds + seed) + 0.4 * Math.sin(a * folds * 2.3 + seed * 3), k = 1 + amp * t * wv;
    p.setXYZ(i, x * k, y - t * t * 0.015 * (1 + Math.sin(a * 3 + seed)), z * k); const s = 0.86 + 0.14 * wv * t - 0.08 * t; sh[i * 3] = sh[i * 3 + 1] = sh[i * 3 + 2] = s; }
  g.setAttribute("color", new THREE.BufferAttribute(sh, 3)); g.computeVertexNormals(); return g; }
// a head: a sphere shaped into skull, cheeks and jaw, with nose, ears and brow
function headGeo() { const g = new THREE.SphereGeometry(0.1, 16, 12), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i) / 0.1, y = p.getY(i) / 0.1, z = p.getZ(i) / 0.1;
    x *= 0.84; y *= 1.12; if (y < 0) { x *= 1 - 0.28 * -y; if (z > 0) z = z * (1 - 0.1 * -y) + 0.06 * -y; } if (z < 0) z *= 1.06; if (z > 0.6 && y > 0.32 && y < 0.5) z += 0.025;   // jaw narrows, chin forward, brow
    p.setXYZ(i, x * 0.1, y * 0.1, z * 0.1); } g.computeVertexNormals();
  return mergeG([[g, MT(0, 0.67, 0)], [new THREE.ConeGeometry(0.016, 0.05, 4).rotateX(-Math.PI / 2 - 0.35), MT(0, 0.663, 0.104)], [new THREE.SphereGeometry(0.02, 6, 4), MT(0.087, 0.668, -0.005, 0.35, 1.2, 0.9)], [new THREE.SphereGeometry(0.02, 6, 4), MT(-0.087, 0.668, -0.005, 0.35, 1.2, 0.9)],
    [new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), MT(0, 0.55, -0.005)]]); }
// a cap of hair or cloth over the head that stops at the hairline in front (leaving the face open) and comes lower at the sides and back
function faceCap(r, backT, frontT, width, segs = 14) { const g = new THREE.SphereGeometry(r, segs, 9, 0, Math.PI * 2, 0, backT), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), th = Math.acos(clampN(y / r, -1, 1)), a = Math.atan2(x, z), f = clampN(1 - Math.abs(a) / width, 0, 1), fs = f * f * (3 - 2 * f), mt = backT + (frontT - backT) * fs;
    if (th > mt) p.setXYZ(i, r * Math.sin(mt) * Math.sin(a), r * Math.cos(mt), r * Math.sin(mt) * Math.cos(a)); }
  g.computeVertexNormals(); return g; }

const HIPY = 0.92, THIGH = 0.44, SHIN = 0.42, UARM = 0.28, FARM = 0.26;
// the shawl: a band of cloth following the torso's surface, high over the left shoulder and low under the right arm
function shawlBand() { const P = [[0.14, -0.02], [0.13, 0.12], [0.15, 0.25], [0.165, 0.34], [0.17, 0.42], [0.12, 0.49], [0.055, 0.52]], rAt = y => { for (let i = 1; i < P.length; i++) if (y <= P[i][1]) { const [r0, y0] = P[i - 1], [r1, y1] = P[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return 0.055; };
  const N = 28, K = 4, pos = [], idx = []; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, yc = 0.3 + 0.11 * Math.cos(a); for (let j = 0; j <= K; j++) { const y = yc - 0.085 + 0.17 * j / K, r = rAt(y) + 0.016; pos.push(r * Math.cos(a), y, -r * Math.sin(a) * 0.7); } }
  for (let i = 0; i < N; i++) for (let j = 0; j < K; j++) { const a = i * (K + 1) + j, b = a + K + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
// the leader's long skirt with its net pattern (as on the Uruk Vase and seals): a lattice of darker lines baked into the cloth's shading
function netSkirt() { const g = new THREE.CylinderGeometry(0.155, 0.28, 0.86, 40, 18, true).scale(1, 1, 0.82).translate(0, -0.37, 0).toNonIndexed(), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  for (let t = 0; t < n; t += 3) { let cx = 0, cy = 0, cz = 0; for (let k = 0; k < 3; k++) { cx += p.getX(t + k) / 3; cy += p.getY(t + k) / 3; cz += p.getZ(t + k) / 3; } const u = (Math.atan2(cz / 0.82, cx) / (Math.PI * 2) + 0.5) * 20, v = (cy + 0.8) / 0.86 * 11, fu = u + v - Math.floor(u + v), fv = u - v - Math.floor(u - v);
    const sh = cy < -0.74 ? 0.6 : (fu < 0.16 || fv < 0.16) ? 0.58 : 1; for (let k = 0; k < 3; k++) col.set([sh, sh, sh], (t + k) * 3); }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); return g; }
const PG = {
  thigh: G1(new THREE.CylinderGeometry(0.078, 0.058, THIGH, 9).translate(0, -THIGH / 2, 0)),
  shin: mergeG([[new THREE.SphereGeometry(0.058, 7, 5), MT(0, 0, 0)], [new THREE.LatheGeometry([[0.044, -SHIN], [0.048, -SHIN * 0.75], [0.058, -SHIN * 0.35], [0.055, -0.04], [0.05, 0]].map(([r, y]) => new THREE.Vector2(r, y)), 9), MT(0, 0, 0)]]),
  shoe: mergeG([[new THREE.BoxGeometry(0.09, 0.065, 0.2), MT(0, -0.035, 0.035)], [new THREE.SphereGeometry(0.046, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, -0.068, 0.13, 1, 0.9, 1.15)], [new THREE.SphereGeometry(0.048, 7, 4), MT(0, -0.03, -0.035, 1, 0.8, 1)]]),
  uarm: mergeG([[new THREE.SphereGeometry(0.062, 8, 6), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.058, 0.047, UARM, 9).translate(0, -UARM / 2, 0), MT(0, 0, 0)]]),
  farm: mergeG([[new THREE.SphereGeometry(0.048, 7, 5), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.047, 0.036, FARM, 9).translate(0, -FARM / 2, 0), MT(0, 0, 0)]]),
  hand: mergeG([[new THREE.SphereGeometry(0.038, 7, 5), MT(0, -0.05, 0.005, 0.85, 1.35, 0.6)], [new THREE.SphereGeometry(0.016, 5, 4), MT(0.03, -0.03, 0.02, 1, 1.9, 1, 0, 0.5)]]),
  torso: mergeG([[new THREE.LatheGeometry([[0.14, -0.02], [0.13, 0.12], [0.15, 0.25], [0.165, 0.34], [0.17, 0.42], [0.12, 0.49], [0.055, 0.52]].map(([r, y]) => new THREE.Vector2(r, y)), 14), MT(0, 0, 0, 1, 1, 0.68)],
    [new THREE.SphereGeometry(0.07, 8, 6), MT(0.155, 0.43, 0)], [new THREE.SphereGeometry(0.07, 8, 6), MT(-0.155, 0.43, 0)]]),
  head: headGeo(),
  eyeW: mergeG([[new THREE.SphereGeometry(0.014, 6, 4), MT(0.033, 0.694, 0.089, 1, 0.75, 0.55)], [new THREE.SphereGeometry(0.014, 6, 4), MT(-0.033, 0.694, 0.089, 1, 0.75, 0.55)]]),
  eyes: mergeG([[new THREE.SphereGeometry(0.0065, 5, 4), MT(0.033, 0.694, 0.096)], [new THREE.SphereGeometry(0.0065, 5, 4), MT(-0.033, 0.694, 0.096)], [new THREE.BoxGeometry(0.03, 0.004, 0.008), MT(0, 0.632, 0.097)]]),
  brows: mergeG([[new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(0.033, 0.712, 0.097, 1, 1, 1, 0, -0.12)], [new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(-0.033, 0.712, 0.097, 1, 1, 1, 0, 0.12)]]),
  hairShort: G1(faceCap(0.108, Math.PI * 0.5, Math.PI * 0.3, Math.PI * 0.42).scale(0.9, 1.12, 1.04).translate(0, 0.672, -0.006)),
  hairLong: mergeG([[faceCap(0.108, Math.PI * 0.56, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [foldTube(0.085, 0.1, 0.34, 12, 9, 0.12, Math.PI * 0.85, Math.PI * 0.425), MT(0, 0.5, -0.025)]]),
  bun: mergeG([[faceCap(0.11, Math.PI * 0.55, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [new THREE.SphereGeometry(0.065, 8, 6), MT(0, 0.75, -0.1, 1, 0.9, 1)]]),   // the hair gathered up behind
  fillet: G1(new THREE.TorusGeometry(0.104, 0.012, 4, 20).rotateX(Math.PI / 2).scale(0.93, 1, 1.06).translate(0, 0.73, -0.005)),   // a band round the head
  kilt: G1(foldTube(0.15, 0.24, 0.5, 20, 8, 0.07, 0, 0, 3).scale(1, 1, 0.82).translate(0, -0.18, 0)),   // a wrapped kilt, waist to knee
  wrap: G1(foldTube(0.15, 0.3, 0.88, 22, 9, 0.07, 0, 0, 2).scale(1, 1, 0.82).translate(0, -0.38, 0)),
  netskirt: G1(netSkirt()),   // a wrap to the ankle
  wraptop: G1(new THREE.LatheGeometry([[0.146, -0.04], [0.136, 0.12], [0.158, 0.25], [0.172, 0.34], [0.175, 0.4]].map(([r, y]) => new THREE.Vector2(r, y)), 14).scale(1, 1, 0.7)),   // the wrap's upper part, over the breast
  shawl: mergeG([[shawlBand(), MT(0, 0, 0)], [new THREE.SphereGeometry(0.083, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), MT(0.155, 0.425, 0, 1, 0.75, 1)]]),   // a shawl over the left shoulder, wound round the body under the right arm
  loincloth: mergeG([[new THREE.BoxGeometry(0.22, 0.32, 0.012), MT(0, -0.1, 0.15)], [new THREE.BoxGeometry(0.22, 0.3, 0.012), MT(0, -0.1, -0.14)], [new THREE.CylinderGeometry(0.143, 0.143, 0.05, 14, 1, true), MT(0, 0.05, 0, 1, 1, 0.72)]]),
  seal: mergeG([[new THREE.CylinderGeometry(0.012, 0.012, 0.035, 8), MT(0.04, 0.37, 0.13)], [new THREE.TorusGeometry(0.075, 0.003, 3, 14).rotateX(Math.PI / 2 - 0.5), MT(0, 0.44, 0.06)]]),   // a cylinder seal on a cord round the neck
  marks: mergeG([1, -1].flatMap(sx => [[0.155, 0.469, 0.059], [0.183, 0.444, 0.064], [0.127, 0.451, 0.061], [0.16, 0.49, 0.02]].map(([x, y, z]) => [new THREE.SphereGeometry(0.011, 5, 4), MT(sx * x, y, z, 1, 1, 0.5)]))),   // dots on the shoulders, painted or tattooed, as on the Ubaid figurines
  beads: G1(new THREE.TorusGeometry(0.09, 0.016, 5, 16).rotateX(Math.PI / 2 - 0.3).translate(0, 0.47, 0.035)),
  belt: mergeG([[new THREE.CylinderGeometry(0.146, 0.146, 0.03, 14, 1, true), MT(0, 0.06, 0, 1, 1, 0.72)]]),
  beard: G1(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.62).scale(0.9, 1.2, 0.8).translate(0, 0.625, 0.04)) };
const PARTS = ["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "torso", "head", "eyeW", "eyes", "brows", "hairShort", "hairLong", "bun", "fillet", "kilt", "wrap", "netskirt", "wraptop", "shawl", "loincloth", "beads", "marks", "seal", "belt", "beard"];
const PGEO = { legL: PG.thigh, legR: PG.thigh, shinL: PG.shin, shinR: PG.shin, shoeL: PG.shoe, shoeR: PG.shoe, armL: PG.uarm, armR: PG.uarm, foreL: PG.farm, foreR: PG.farm, handL: PG.hand, handR: PG.hand };
for (const k in PG) if (!PG[k].attributes.color) PG[k] = G1(PG[k]);
const METAL = new Set([]);
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide, vertexColors: true });
// roles: man, woman, child, elder, fisher (a fisherman or boatman in a loincloth), temple (a temple attendant: inferred)
function looks(i, role) { const h = k => hash(i * 13 + k, 77), pick = (A, k) => A[(h(k) * A.length) | 0];
  const r = role || (h(1) < 0.38 ? "woman" : h(2) < 0.3 ? "child" : h(3) < 0.1 ? "elder" : h(4) < 0.18 ? "fisher" : "man");
  const L = { role: r, s: 0.9 + h(5) * 0.12, skin: pick(SKINS, 4), hair: r === "elder" && h(6) < 0.7 ? 0x8a8478 : pick(HAIRS, 6), cloth: h(7) < 0.75 ? pick(WOOL, 7) : pick(LINEN, 7), cloth2: pick(WOOL.concat(OCHRE), 8),
    shawl: r === "elder" ? h(9) < 0.8 : r === "woman" ? h(9) < 0.5 : r === "man" ? h(9) < 0.15 : false, beard: (r === "man" || r === "elder" || r === "fisher") && h(10) < 0.6, beads: h(11) < 0.45, fillet: h(12) < 0.25, sandals: h(13) < 0.2, girl: h(14) < 0.5, naked: r === "child" && h(15) < 0.5, shaven: r === "temple" };
  if (!LATE) Object.assign(L, { cloth: h(7) < 0.7 ? pick(UNDYED, 7) : pick(LINEN, 7), cloth2: h(8) < 0.8 ? pick(UNDYED, 8) : pick(DYED, 8), shawl: r === "woman" ? h(9) < 0.45 : false, beads: h(11) < 0.35, marks: false, fillet: r === "man" || r === "elder" ? h(12) < 0.25 : r === "woman" ? h(12) < 0.4 : false });   // Uruk: wool, mostly undyed; headbands as on the Uruk Vase and seals
  else Object.assign(L, { cloth: h(7) < 0.85 ? pick(UNDYED, 7) : pick(DYED, 7), cloth2: h(8) < 0.7 ? pick(UNDYED, 8) : pick(DYED, 8), fillet: r === "woman" ? L.fillet : false, beard: (r === "man" || r === "elder" || r === "worker") && h(10) < 0.5, shaven: (r === "man" || r === "worker") && h(22) < 0.2, beads: r === "woman" ? h(11) < 0.5 : h(11) < 0.12 });
  if (r === "leader") Object.assign(L, { cloth: pick([0xddd2b8, 0xcfc2a2, 0xe6dcc6], 7), beard: true, bun: true, fillet: true, shawl: false, beads: false, shaven: false, s: 1.0 + h(5) * 0.05 });   // bearded, hair in a bun under a headband, the net skirt
  if (r === "bearer") Object.assign(L, { naked: true, shaven: true, beard: false, fillet: false, beads: false, shawl: false });   // naked, as on the Uruk Vase
  if (r === "priestess") Object.assign(L, { role: "woman", priestess: true, cloth: 0xe8e2d2, cloth2: 0xd8ccb0, shawl: true, fillet: true, beads: true });
  if (L.role === "woman") L.long = h(23) < 0.5;   // long hair down the back, or a bun
  if (r === "child") L.s = 0.58 + h(5) * 0.18; if (r === "temple") Object.assign(L, { cloth: 0xeee8da, beard: false, shawl: false, s: 0.95 + h(5) * 0.08 });
  if (LATE && !role && r === "man" && h(16) < 0.18) L.role = h(17) < 0.5 ? "official" : "scribe";
  if (L.role === "official") Object.assign(L, { cloth: pick([0xe8e0cc, 0xd8ccb0, 0xc8b898], 18), cloth2: pick([0xe8e0cc, 0x9a6a3a, 0x6a5a8a, 0x8a3a2a], 19), shawl: true, seal: true, shaven: h(20) < 0.65, beard: h(20) >= 0.65 && h(10) < 0.6, beads: false });   // a long robe and a fringed shawl over the left shoulder
  if (L.role === "scribe") Object.assign(L, { seal: true, shaven: h(20) < 0.6, beard: h(20) >= 0.6 && h(10) < 0.5, fillet: false });
  if (LATE && L.role === "woman") Object.assign(L, { shawl: h(9) < 0.75, fillet: h(12) < 0.6 });
  if (LATE && L.role === "temple") L.shaven = true;
  return L; }
const isWoman = L => L.role === "woman" || (L.role === "child" && L.girl);
const robed = L => L.role === "official" || L.role === "temple";
function shows(L, p) { const r = L.role, w = isWoman(L), man = !w && r !== "child";
  switch (p) {
    case "hairShort": return !w && !L.shaven && !L.bun; case "hairLong": return (r === "child" && L.girl) || !!L.long; case "bun": return (r === "woman" && !L.long) || !!L.bun; case "fillet": return L.fillet && !L.shaven && r !== "child";
    case "kilt": return (man && r !== "fisher" && r !== "leader" && r !== "bearer" && !robed(L)) || (r === "child" && !L.girl && !L.naked); case "wrap": return r === "woman" || (r === "child" && L.girl && !L.naked) || robed(L); case "seal": return !!L.seal; case "netskirt": return r === "leader"; case "wraptop": return r === "woman" || r === "official";
    case "shawl": return L.shawl; case "loincloth": return r === "fisher"; case "beads": return L.beads; case "marks": return !!L.marks; case "belt": return (man && r !== "fisher" && r !== "bearer") || r === "woman"; case "beard": return L.beard;
    default: return true; } }
function colorOf(L, p) {
  if (p.startsWith("leg") || p.startsWith("shin") || p.startsWith("hand") || p === "head" || p === "torso" || p.startsWith("arm") || p.startsWith("fore")) return L.skin; if (p.startsWith("shoe")) return L.sandals ? 0x6a4a2a : L.skin;
  switch (p) { case "eyes": return 0x1e140c; case "eyeW": return 0xe8e4dc; case "brows": case "hairShort": case "hairLong": case "bun": case "beard": return L.hair; case "fillet": return 0x8a3a2a;
    case "kilt": case "wrap": case "netskirt": case "wraptop": return L.cloth; case "shawl": return L.cloth2; case "loincloth": return L.cloth; case "beads": return 0xd8c8a0; case "marks": return 0x2e2018; case "seal": return 0x3a4a5a; case "belt": return 0x6a4a2a; } return 0xffffff; }
// poses: hip flex (l), knee bend (k), shoulder swing (a), elbow bend (e, negative = forearm forward), skirt tilt (sk)
function poseOf(kind, t, ph, walkAmt = 1) { const c = t * 7 + ph, w = Math.sin(c), sway = 0.04 * Math.sin(t * 0.8 + ph);
  const P = { drop: 0, lean: 0, lL: 0, lR: 0, kL: 0.05, kR: 0.05, aL: sway, aR: -sway, eL: -0.15, eR: -0.15, sk: 0 };
  const walk = (amp = 1) => { const A = walkAmt * amp; P.lL = 0.42 * w * A; P.lR = -0.42 * w * A; P.kL = 0.08 + 0.6 * Math.max(0, Math.cos(c)) * A; P.kR = 0.08 + 0.6 * Math.max(0, -Math.cos(c)) * A; P.lean = 0.05; P.aL = -0.35 * w * A; P.aR = 0.35 * w * A; P.eL = -0.25 - 0.15 * Math.max(0, -w) * A; P.eR = -0.25 - 0.15 * Math.max(0, w) * A; };
  const sit = () => Object.assign(P, { drop: HIPY - 0.47, lL: -1.5, lR: -1.45, kL: 1.5, kR: 1.45, lean: -0.04, sk: -1.15 });
  switch (kind) {
    case "walk": walk(); break;
    case "carry": walk(0.9); Object.assign(P, { aL: -0.45, aR: -0.45, eL: -1.15, eR: -1.15 }); break;
    case "shoulder": walk(0.85); Object.assign(P, { aL: -2.6, eL: -1.0, aR: 0.35 * w, eR: -0.3 }); break;   // a load on the shoulder, steadied with one hand
    case "pull": walk(0.7); Object.assign(P, { lean: 0.45, aL: -1.2, aR: -1.0, eL: -0.3, eR: -0.4 }); break;   // hauling on the towline, leaning into it
    case "guard": Object.assign(P, { aR: -0.3, eR: -1.05, aL: -0.15, eL: -0.6 }); break;
    case "kneel": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.06, aL: -0.45, aR: -0.45, eL: -1.25, eR: -1.25 }); break;
    case "pray": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.12, aL: -0.7, aR: -0.7, eL: -1.55, eR: -1.55 }); break;
    case "sit": sit(); Object.assign(P, { aL: -0.55, aR: -0.5, eL: -0.95, eR: -1.0 - 0.15 * Math.max(0, Math.sin(t * 0.9 + ph)) }); break;
    case "write": Object.assign(P, { drop: HIPY - 0.12, lL: -1.4, lR: -1.3, kL: 0.4, kR: 0.6, lean: -0.05, aL: -1.05, aR: -1.05, eL: -1.25, eR: -1.15 - 0.12 * Math.max(0, Math.sin(t * 2.9 + ph)), spL: -0.35, spR: 0.3, sk: -1.0 }); break;   // sitting, a tablet in the left hand, the stylus in the right
    case "sitground": Object.assign(P, { drop: HIPY - 0.12, lL: -1.4, lR: -1.3, kL: 0.4, kR: 0.6, lean: -0.15, aL: -0.3, aR: -0.4, eL: -0.6, eR: -0.8 - 0.2 * Math.max(0, Math.sin(t * 0.5 + ph)), sk: -1.0 }); break;   // sitting on the ground, legs out
    case "row": { sit(); const r = Math.sin(t * 2.4); Object.assign(P, { lean: 0.22 * r, aL: -1.05 - 0.35 * r, aR: -1.05 - 0.35 * r, eL: -0.4 + 0.35 * r, eR: -0.4 + 0.35 * r }); break; }
    case "paddle": { const r = Math.sin(t * 2.1 + ph); Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.25 + 0.15 * r, aL: -1.4 - 0.4 * r, aR: -0.6 - 0.5 * r, eL: -0.3, eR: -0.6 }); break; }   // kneeling in a dugout, paddling
    case "pole": { const q = (t * 0.35 + ph) % 1; Object.assign(P, { lean: 0.35 + 0.3 * Math.sin(q * 6.283), aL: -1.5 + 0.6 * q, aR: -1.3 + 0.6 * q, eL: -0.3, eR: -0.4, lL: 0.2, lR: -0.2 }); walk(0.5); break; }   // walking aft on the keelboat's running board, pushing on the setting pole
    case "hammer": { const q = (t * 1.6 + ph) % 1, up = q < 0.6 ? q / 0.6 : 1 - (q - 0.6) / 0.4; Object.assign(P, { lean: 0.22, lL: -0.1, lR: 0.12, kL: 0.15, kR: 0.1, aL: -0.55, eL: -0.9, aR: -0.5 - 1.9 * up, eR: -0.4 - 0.6 * up }); break; }
    case "reap": { const q = Math.sin(t * 2.2 + ph); Object.assign(P, { lean: 0.75, lL: -0.35, lR: 0.1, kL: 0.4, kR: 0.25, aL: -0.9, eL: -0.6, aR: -0.6 - 0.45 * q, eR: -0.5 - 0.3 * q }); break; }   // bent to the sickle
    case "net": { const q = (t * 0.4 + ph) % 1, up = q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7; Object.assign(P, { lean: 0.1 - 0.2 * up, aL: -0.6 - 1.6 * up, aR: -0.6 - 1.8 * up, eL: -0.6, eR: -0.5 }); break; }   // casting a net
    case "hoe": { const q = (t * 0.9 + ph) % 1, up = q < 0.5 ? q / 0.5 : 1 - (q - 0.5) / 0.5; Object.assign(P, { lean: 0.35 + 0.2 * (1 - up), lL: -0.25, lR: 0.15, kL: 0.3, kR: 0.15, aL: -0.9 - 1.0 * up, aR: -0.7 - 1.0 * up, eL: -0.5, eR: -0.6 }); break; }   // hoeing the corn
    case "lever": { const q = Math.sin(t * 0.8 + ph); Object.assign(P, { lean: 0.3 + 0.25 * q, aL: -1.6 - 0.5 * q, aR: -1.6 - 0.5 * q, eL: -0.2, eR: -0.2, lL: -0.2, lR: 0.25, kL: 0.2, kR: 0.1 }); break; }   // bearing down on the press lever
    case "knead": { const q = Math.sin(t * 3 + ph); Object.assign(P, { lean: 0.3, aL: -0.9 - 0.15 * q, aR: -0.9 + 0.15 * q, eL: -0.9, eR: -0.9 }); break; }
    case "talk": { const g = Math.pow(Math.max(0, Math.sin(t * 0.55 + ph)), 4); Object.assign(P, { aL: 0.04, eL: -0.2, aR: -0.08 - 0.45 * g, eR: -0.28 - 0.85 * g - 0.15 * g * Math.sin(t * 2.1 + ph) }); break; }
    case "ride": Object.assign(P, { drop: HIPY - 0.5, lL: -0.4, lR: -0.4, kL: 0.95, kR: 0.95, spr: 0.42, aL: -0.45, aR: -0.45, eL: -0.95, eR: -0.95, lean: 0.05 }); break;
    case "dance": { const q = Math.sin(t * 4 + ph); walk(0.6); Object.assign(P, { aL: -0.6 + 0.3 * q, aR: -1.4 - 0.3 * q, eL: -0.6, eR: -0.5, lean: -0.03 }); break; }
    case "fiddle": Object.assign(P, { aL: -1.25, eL: -1.4, aR: -0.6 - 0.25 * Math.sin(t * 7 + ph), eR: -1.2 }); break;
    case "spin": Object.assign(P, { aL: -0.55, eL: -1.55, aR: -0.35, eR: -0.75 - 0.25 * Math.sin(t * 3 + ph) }); break;
    case "bow": Object.assign(P, { lean: 0.38, aL: -0.15, aR: -0.15, eL: -0.3, eR: -0.3 }); break;
    case "sell": { const g = Math.pow(Math.max(0, Math.sin(t * 0.45 + ph)), 3); Object.assign(P, { lean: 0.06, aL: -0.12, eL: -0.35, aR: -0.1 - 0.5 * g, eR: -0.3 - 0.75 * g }); break; } }
  return P; }
const _b = new THREE.Matrix4(), _hm = new THREE.Matrix4(), _sk = new THREE.Matrix4(), _j = new THREE.Matrix4(), _tmp = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), ZEROM = new THREE.Matrix4().makeScale(0, 0, 0), _p = V3(0, 0, 0), _s = V3(1, 1, 1);

const _M = {}, LIMB = new Set(["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR"]), SKIRT = new Set(["kilt", "wrap", "loincloth"]);
function partMatrices(x, y, z, h, L, P, out) { _e2.set(0, h, 0); _q2.setFromEuler(_e2); _b.compose(_p.set(x, y, z), _q2, _s.set(L.s, L.s, L.s));
  _hm.copy(_b).multiply(_tmp.makeTranslation(0, HIPY - P.drop, 0)).multiply(_j.makeRotationX(P.lean)); _sk.copy(_hm).multiply(_j.makeRotationX(P.sk - P.lean * 0.5));
  const leg = (sx, l, k, side) => { const th = _b.clone().multiply(_tmp.makeTranslation(sx, HIPY - P.drop, 0)); if (P.spr) th.multiply(_tmp.makeRotationZ(P.spr * Math.sign(sx))); th.multiply(_j.makeRotationX(l));
    const sh = th.clone().multiply(_tmp.makeTranslation(0, -THIGH, 0)).multiply(_j.makeRotationX(k));
    _M["leg" + side] = th; _M["shin" + side] = sh; _M["shoe" + side] = sh.clone().multiply(_tmp.makeTranslation(0, -SHIN, 0)).multiply(_j.makeRotationX(-(l + k) * 0.85)); };
  leg(0.085, P.lL, P.kL, "L"); leg(-0.085, P.lR, P.kR, "R");
  const arm = (sx, a, e, sp, side) => { const u = _hm.clone().multiply(_tmp.makeTranslation(sx, 0.43, 0)).multiply(_j.makeRotationX(a)).multiply(_tmp.makeRotationZ(sp)), f = u.clone().multiply(_tmp.makeTranslation(0, -UARM, 0)).multiply(_j.makeRotationX(e)), hd = f.clone().multiply(_tmp.makeTranslation(0, -FARM, 0));
    _M["arm" + side] = u; _M["fore" + side] = f; _M["hand" + side] = hd; return [f, hd]; };
  arm(0.19, P.aL, P.eL, P.spL ?? -0.07, "L"); arm(-0.19, P.aR, P.eR, P.spR ?? 0.07, "R");
  for (const p of PARTS) { if (!shows(L, p)) { out.push(ZEROM); continue; } out.push(LIMB.has(p) ? _M[p] : SKIRT.has(p) ? _sk.clone() : _hm.clone()); } }
// the crowd: one instanced mesh per garment or part; each packs only the people wearing it into its first slots, so nothing unworn is drawn
class Crowd { constructor(n) { this.n = n; this.L = []; this.P = PARTS.map(p => { const im = new THREE.InstancedMesh(PGEO[p] || PG[p], METAL.has(p) ? new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.7, vertexColors: true }) : personMat, n);
      im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, new THREE.Color()); im.count = 0; scene.add(im); return { p, im, slot: new Int32Array(n).fill(-1), who: new Int32Array(n), count: 0 }; });
    this.ms = []; this._m = new THREE.Matrix4(); this._c = new THREE.Color(); this.count = 0; this.on = new Uint8Array(n); }
  free(Q, i) { const s = Q.slot[i]; if (s < 0) return; const last = --Q.count, j = Q.who[last];
    if (s !== last) { Q.im.getMatrixAt(last, this._m); Q.im.setMatrixAt(s, this._m); Q.im.getColorAt(last, this._c); Q.im.setColorAt(s, this._c); Q.slot[j] = s; Q.who[s] = j; } Q.slot[i] = -1; Q.dirty = true; }
  look(i, L) { this.L[i] = L; for (const Q of this.P) if (Q.slot[i] >= 0) { if (shows(L, Q.p)) { Q.im.setColorAt(Q.slot[i], this._c.setHex(colorOf(L, Q.p))); Q.dirty = true; } else this.free(Q, i); } }
  set(i, x, y, z, h, kind, t, walkAmt = 1) { const L = this.L[i]; this.ms.length = 0; partMatrices(x, y, z, h, L, poseOf(kind, t, i * 1.7, walkAmt), this.ms); if (!this.on[i]) { this.on[i] = 1; this.count++; }
    this.P.forEach((Q, k) => { const m = this.ms[k]; if (m === ZEROM) { if (Q.slot[i] >= 0) this.free(Q, i); return; }
      if (Q.slot[i] < 0) { const s = Q.count++; Q.slot[i] = s; Q.who[s] = i; Q.im.setColorAt(s, this._c.setHex(colorOf(L, Q.p))); Q.dirty = true; } Q.im.setMatrixAt(Q.slot[i], m); }); }
  hide(i) { if (this.on[i]) { this.on[i] = 0; this.count--; } for (const Q of this.P) this.free(Q, i); }
  done() { for (const Q of this.P) { Q.im.count = Q.count; Q.im.instanceMatrix.needsUpdate = true; if (Q.dirty && Q.im.instanceColor) { Q.im.instanceColor.needsUpdate = true; Q.dirty = false; } } } }



// ---------- the map: metres from the White Temple (x east, z south) ----------
// Uruk is Warka, 31.324 N, 45.637 E, in southern Iraq, about 65 km north-west of Ur.
const LAT0 = 31.324, LON0 = 45.637, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110574;
const LL = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
function line(pts) { const P = pts, S = [], cum = [0];
  for (let i = 1; i < P.length; i++) { S.push([P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]]); cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const BK = new Map(), BC = 250, bkey = (i, j) => i * 100003 + j;   // segments bucketed by 250 m square, so distance tests only look nearby
  S.forEach((sg, k) => { const [ax, az, bx, bz] = sg; for (let i = Math.floor((Math.min(ax, bx) - 300) / BC); i <= Math.floor((Math.max(ax, bx) + 300) / BC); i++) for (let j = Math.floor((Math.min(az, bz) - 300) / BC); j <= Math.floor((Math.max(az, bz) + 300) / BC); j++) { const q = bkey(i, j); if (!BK.has(q)) BK.set(q, []); BK.get(q).push(sg); } });
  return { P, S, cum, L: cum[cum.length - 1], box: [x0, x1, z0, z1],
    near(x, z, m) { return x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m && BK.has(bkey(Math.floor(x / BC), Math.floor(z / BC))); },
    d(x, z) { const SB = BK.get(bkey(Math.floor(x / BC), Math.floor(z / BC))); if (!SB) return 1e9; let best = 1e18; for (const [ax, az, bx, bz] of SB) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0, ex = ax + t * dx - x, ez = az + t * dz - z, d2 = ex * ex + ez * ez; if (d2 < best) best = d2; } return Math.sqrt(best); },
    at(s) { s = clampN(s, 0, this.L); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])]; } }; }
// a line with gentle wiggles added, from a few points (procedural meanders)
function wiggle(pts, amp, seed) { const R = seeded(seed), out = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 120)), nx = -(bz - az) / L, nz = (bx - ax) / L, ph = R() * 6;
    for (let k = 0; k < n; k++) { const f = k / n, w = Math.sin(f * Math.PI) * amp * Math.sin(f * 6.283 * (1 + R()) + ph); out.push([ax + (bx - ax) * f + nx * w, az + (bz - az) * f + nz * w]); } } out.push(pts[pts.length - 1]); return line(out); }

// ---------- the land and the water ----------
// SOURCES: Uruk lay on a branch of the Euphrates in the flat alluvial plain, its water and transport carried by canals, several of which
// ran right through the city (traced by magnetic survey). Round it the plain was intensely irrigated and farmed, with villages and small
// towns every few kilometres (Adams and Nissen's surveys); marshes lay to the south and east; the desert edge was well to the west.
// The courses of the river and canals in 3200 BC are not known: those here are generated. Level 0 is the water of the river and marsh.
const WATER = 0;
const RIVER = wiggle([[-6000, -9000], [-3500, -5500], [-1800, -3000], [-1100, -1200], [-850, 0], [-950, 1200], [-1300, 2600], [-1200, 4200], [-400, 6500]], 60, 11), RIVER_HW = 32;
const CANALS = [wiggle([[-880, -250], [-350, -330], [250, -300], [800, -260], [1500, -150], [2400, 200]], 14, 21), wiggle([[-920, 520], [-300, 560], [300, 600], [950, 520], [1700, 700]], 14, 22),
  wiggle([[-1100, -1200], [-200, -1400], [800, -1500], [1800, -1300], [3000, -900]], 22, 23), wiggle([[-950, 1200], [0, 1500], [1000, 1700], [2000, 2200]], 20, 24),
  wiggle([[-1300, 2600], [-2300, 2000], [-3200, 1200]], 18, 25), wiggle([[-1800, -3000], [-2600, -2000], [-3300, -800]], 18, 26)];   // two canals through the city; feeders and field canals round it
const CITY = { x: 260, z: 40, r: 900 };   // the city at its height: about 250 hectares round the two sacred districts
const LAGOON = { x: 4300, z: 3700, r: 2600 };
const MARSH_IN = 2600;   // where the wetland begins, toward the marshes in the south-east
const marshMask = (x, z) => { const p = x * 0.8 + z * 0.6, q = -x * 0.6 + z * 0.8, n = fbm(x / 700 + 3, z / 700, 3), inner = MARSH_IN + n * 300 + Math.max(0, Math.abs(q) - 700) * 0.35;
  return sstepN(p - inner, 0, 320) * (1 - sstepN(Math.abs(q), 2600 + p * 0.4, 3400 + p * 0.4)); };   // 0 on dry land; 1 deep in the wetland
const desertness = (x, z) => sstepN(-(x + z) * 0.707 - 5600 + 500 * (fbm(x / 1500 + 9, z / 1500, 2) - 0.5), 0, 1600);
// about 2040 BC: the precinct and the small town's quarters (precinct coordinates: u along the stair axis, v across), and outside them the
// low mounds of the larger earlier town, abandoned
const LATE_BOXES = [[-100, 118, -88, 88], [124, 215, -140, 140], [-50, 118, 94, 165], [-30, 118, -165, -94]];
function lateRuin(x, z) { const u = (x - z) * 0.7071, v = (x + z) * 0.7071; let dm = 1e9; for (const Q of LATE_BOXES) { const du = Math.max(Q[0] - u, 0, u - Q[1]), dv = Math.max(Q[2] - v, 0, v - Q[3]); dm = Math.min(dm, Math.hypot(du, dv)); } if (dm < 8) return 0;
  const f = fbm(x / 38 + 11, z / 38 + 3, 3); return (3.6 * sstepN(f, 0.52, 0.74) + 0.8 * sstepN(f, 0.4, 0.52)) * sstepN(dm, 8, 30) * (1 - sstepN(Math.hypot(x, z / 0.88), 400, 520)); }
function baseH(x, z) { const n1 = fbm(x / 160, z / 160, 3), n2 = fbm(x / 1100 + 7, z / 1100, 3);
  let h = 0.9 + 0.5 * n2 + 0.25 * (n1 - 0.5);                                                                                   // the alluvial plain
  h += 2.4 * Math.exp(-(((x - CITY.x) / 1000) ** 2 + ((z - CITY.z) / 850) ** 2)) + 1.2 * Math.exp(-(((x - 520) / 230) ** 2 + ((z - 80) / 210) ** 2));   // the city mound, built up over a thousand years, and Eanna's rise
  if (LATE && x * x + z * z < 2.9e5) h += lateRuin(x, z);   // the mounds of the old town
  const ds = desertness(x, z); if (ds > 0) h += ds * (1.6 + 2.2 * n2 + 1.8 * Math.pow(Math.abs(Math.sin((x * 0.6 - z * 0.8) / 70 + 4 * n1)), 3));   // the desert: sand, low dunes
  const mm = marshMask(x, z); if (mm > 0) {   // the wetland: reed beds in shallow water and mud, open pools, winding channels, low dry islands; further out the open lagoon
    const isl = fbm(x / 260 + 21, z / 260 + 7, 3), pool = fbm(x / 140 + 5, z / 140 + 13, 3), ch = 1 - Math.abs(2 * fbm(x / 320 + 31, z / 320 + 2, 3) - 1), far = sstepN(Math.hypot((x - LAGOON.x) * 0.85, z - LAGOON.z), LAGOON.r, LAGOON.r - 1400);
    let t = 0.12 + (fbm(x / 45, z / 45, 2) - 0.5) * 0.5; if (pool > 0.6) t = lerpN(t, -1.5, sstepN(pool, 0.6, 0.68)); if (ch > 0.93) t = lerpN(t, -1.4, sstepN(ch, 0.93, 0.97)); t = lerpN(t, -1.8 - 1.0 * n2, far);
    if (isl > 0.63 + far * 0.05) t = lerpN(t, 0.8 + (isl - 0.63) * 3, sstepN(isl, 0.63 + far * 0.05, 0.69 + far * 0.05)); h = lerpN(h, t, sstepN(mm, 0, 1)); }
  if (RIVER.near(x, z, 260)) { const d = RIVER.d(x, z); h += 1.5 * (1 - sstepN(d, RIVER_HW, 200)) * sstepN(d, RIVER_HW * 0.8, RIVER_HW + 6); if (d < RIVER_HW + 10) h = Math.min(h, lerpN(-2.8, h, sstepN(d, RIVER_HW * 0.5, RIVER_HW + 10))); }   // the river on its levees
  for (const C of CANALS) if (C.near(x, z, 30)) { const d = C.d(x, z); if (d < 26) { h += 0.5 * (1 - sstepN(d, 3, 22)) * sstepN(d, 2.4, 4.5); if (d < 4) h = Math.min(h, lerpN(-0.9, h, sstepN(d, 1.5, 4))); } }
  for (const f of EXTRA_H) { const e = f(x, z); if (e > h) h = e; }   // built earth: the builders' ramp
  if (FLATS.length && x > FLAT_BB[0] && x < FLAT_BB[1] && z > FLAT_BB[2] && z < FLAT_BB[3]) for (const R of FLATS) { const dx = x - R.x, dz = z - R.z; if (dx * dx + dz * dz > R.r2) continue; const lx = dx * R.c - dz * R.s, lz = dx * R.s + dz * R.c; if (Math.abs(lx) < R.hw && Math.abs(lz) < R.hd) h = R.exact ? lerpN(h, R.y, Math.min(1, (R.hw - Math.abs(lx)) / 3, (R.hd - Math.abs(lz)) / 3)) : Math.min(h, R.y); }
  return h; }
const FLAT_BB = [1e9, -1e9, 1e9, -1e9], FLATS = [], flatUnder = (F, w, d, y, exact = false) => { const r = Math.hypot(w, d) / 2 + 2; FLAT_BB[0] = Math.min(FLAT_BB[0], F.x - r); FLAT_BB[1] = Math.max(FLAT_BB[1], F.x + r); FLAT_BB[2] = Math.min(FLAT_BB[2], F.z - r); FLAT_BB[3] = Math.max(FLAT_BB[3], F.z + r); return FLATS.push({ x: F.x, z: F.z, c: F.c, s: F.s, hw: w / 2, hd: d / 2, y, exact, r2: (w * w + d * d) / 4 + 4 }); };
const EXTRA_H = [], SOLID_H = [];   // EXTRA_H: built earth, drawn as ground; SOLID_H: masonry drawn by its own geometry, felt underfoot but not drawn
const groundH = (x, z) => { let h = baseH(x, z); for (const f of SOLID_H) { const e = f(x, z); if (e > h) h = e; } return h; };
const nearWater = (x, z, m) => RIVER.d(x, z) < RIVER_HW + m || CANALS.some(C => C.near(x, z, m) && C.d(x, z) < 4 + m);

// ---------- the land-use raster: 2.5 m cells, for ground colour, placing things, and the map ----------
// 0 open, 1 path, 2 building, 3 yard, 4 temple precinct, 5 field, 6 steppe grazing, 7 wall, 8 garden, 9 palm grove, 10 cemetery, 11 brick yard, 12 threshing floor
const RX0 = -5000, RZ0 = -5000, RC = 2.5, RW = 4000, RH = 4000, RAS = new Uint8Array(RW * RH), CROP = new Uint8Array(RW * RH);
const rIdx = (x, z) => { const i = Math.floor((x - RX0) / RC), j = Math.floor((z - RZ0) / RC); return i < 0 || j < 0 || i >= RW || j >= RH ? -1 : j * RW + i; };
const rGet = (x, z) => { const k = rIdx(x, z); return k < 0 ? 0 : RAS[k]; };
function rRect(x, z, w, d, ry, v, test, crop) { const c = Math.cos(ry), s = Math.sin(ry), R = Math.hypot(w, d) / 2 + RC;
  for (let zz = z - R; zz <= z + R; zz += RC) for (let xx = x - R; xx <= x + R; xx += RC) { const dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) > w / 2 || Math.abs(lz) > d / 2) continue; const k = rIdx(xx, zz); if (k < 0) { if (test) return false; continue; }
    if (test) { if (RAS[k] !== 0 && RAS[k] !== 3 && RAS[k] !== 6) return false; } else if (v !== 3 || RAS[k] === 0) { RAS[k] = v; if (crop !== undefined) CROP[k] = crop; } }
  return true; }
function rLine(L, w, v) { for (const [ax, az, bx, bz] of L.S) { const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 1.5);
  for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; for (let u = -w / 2; u <= w / 2; u += 1.5) for (let q = -w / 2; q <= w / 2; q += 1.5) { const kk = rIdx(x + u, z + q); if (kk >= 0 && u * u + q * q <= w * w / 4) RAS[kk] = v; } } } }

// ---------- sky, sun and haze ----------
// A day in spring, at the barley harvest (in southern Mesopotamia barley ripens in April-May): latitude 30.8 N, the sun's declination
// about +14 degrees; it rises about 5:30 and sets about 18:40, and stands 73 degrees high at noon. Hot by midday; a dusty haze.
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.6)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xd8d0c0, IS_HEADSET ? 0.00034 : 0.00024);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xd4dce4, 0x6a5a44, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(260, 24), new THREE.MeshBasicMaterial({ color: 0xfff4d8, fog: false, toneMapped: false })); scene.add(sunDisc);
function sunAt(hour) { const lat = 30.8 * Math.PI / 180, dec = 14.0 * Math.PI / 180, H = (hour - 12) * 15 * Math.PI / 180;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));
  return { el, dir: V3(Math.sin(az) * Math.cos(el) * -1, Math.sin(el), Math.cos(az) * Math.cos(el)).normalize() }; }
// water: the river silty, the lagoon clearer and greener, reflecting the sky
const SKY_ENV = tex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#9ab8d8"); gr.addColorStop(0.47, "#dcdcd4"); gr.addColorStop(0.53, "#7a7262"); gr.addColorStop(1, "#4a4438"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); SKY_ENV.mapping = THREE.EquirectangularReflectionMapping; SKY_ENV.wrapS = SKY_ENV.wrapT = THREE.ClampToEdgeWrapping; SKY_ENV.repeat.set(1, 1);
const water = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x5a6250, roughness: 0.14, metalness: 0.0, envMap: SKY_ENV, envMapIntensity: 0.5, map: tex(256, 256, speckle("#ffffff", 1500, ["#d8d8c8", "#ffffff", "#c4c8b8"], 7, 1.2), [3000, 3000]) }));
water.position.y = WATER; scene.add(water);

// ---------- the ground: nested grids, each twice as coarse as the last, that follow you ----------

const GN = IS_HEADSET ? 96 : 128, NLV = IS_HEADSET ? 7 : 8, CELL0 = 1;
const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97,
  map: tex(256, 256, speckle("#c4c4c4", 6000, ["#eeeeee", "#8a8a8a", "#a8a8a8", "#d8d8d8"], 1.5, 3)) });
const LEVELS = [];
for (let k = 0; k < NLV; k++) { const n = GN + 1, geo = new THREE.BufferGeometry(), idx = new Uint16Array(GN * GN * 6); let o = 0;
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.set([a, c, b, b, c, d], o); o += 6; }
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * n * 3), 3)); geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * n * 2), 2)); geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
  const mesh = new THREE.Mesh(geo, groundMat); mesh.frustumCulled = false; scene.add(mesh);
  LEVELS.push({ c: CELL0 * 2 ** k, ox: NaN, oz: NaN, H: new Float32Array(n * n), C: new Float32Array(n * n * 3), geo, mesh, dirty: true }); }
const _gc = new THREE.Color(), _c1 = new THREE.Color(); let GC_CELL = 1;   // the ground cell being coloured: fine patterns fade where cells are too coarse to show them
function levelRecentre(L, cx, cz) { const c = L.c, n = GN + 1, step = 2 * c, ox = Math.round(cx / step) * step, oz = Math.round(cz / step) * step;
  if (ox === L.ox && oz === L.oz) return false;
  const H2 = new Float32Array(n * n), C2 = new Float32Array(n * n * 3), had = !isNaN(L.ox), di = had ? Math.round((ox - L.ox) / c) : 0, dj = had ? Math.round((oz - L.oz) / c) : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, si = i + di, sj = j + dj;
    if (had && si >= 0 && si <= GN && sj >= 0 && sj <= GN) { const q = sj * n + si; H2[k] = L.H[q]; C2[3 * k] = L.C[3 * q]; C2[3 * k + 1] = L.C[3 * q + 1]; C2[3 * k + 2] = L.C[3 * q + 2]; continue; }
    const x = ox + (i - GN / 2) * c, z = oz + (j - GN / 2) * c, h = baseH(x, z); H2[k] = h; GC_CELL = c; groundColor(x, z, h, _gc); C2[3 * k] = _gc.r; C2[3 * k + 1] = _gc.g; C2[3 * k + 2] = _gc.b; }
  L.H = H2; L.C = C2; L.ox = ox; L.oz = oz; L.dirty = true; return true; }
function levelWrite(L, F) { const c = L.c, n = GN + 1, p = L.geo.attributes.position.array, uv = L.geo.attributes.uv.array, half = F ? GN / 2 * F.c - c * 1.01 : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, x = L.ox + (i - GN / 2) * c, z = L.oz + (j - GN / 2) * c;
    const ex = F ? Math.max(Math.abs(x - F.ox), Math.abs(z - F.oz)) : 1e9, inner = ex < half, edge = !inner && ex < half + c * 0.99;
    p[3 * k] = x; p[3 * k + 1] = inner ? L.H[k] - 60 : edge ? L.H[k] - 0.15 - 0.03 * c : L.H[k]; p[3 * k + 2] = z; uv[2 * k] = x / 6; uv[2 * k + 1] = z / 6; }
  const nr = L.geo.attributes.normal.array, H = L.H;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, gx = (H[j * n + Math.min(GN, i + 1)] - H[j * n + Math.max(0, i - 1)]) / ((Math.min(GN, i + 1) - Math.max(0, i - 1)) * c),
    gz = (H[Math.min(GN, j + 1) * n + i] - H[Math.max(0, j - 1) * n + i]) / ((Math.min(GN, j + 1) - Math.max(0, j - 1)) * c), l = Math.hypot(gx, 1, gz); nr[3 * k] = -gx / l; nr[3 * k + 1] = 1 / l; nr[3 * k + 2] = -gz / l; }
  L.geo.attributes.color.array.set(L.C);
  for (const a of ["position", "color", "uv", "normal"]) L.geo.attributes[a].needsUpdate = true; L.dirty = false; }
function updateGround(x, z, budget = 3) { const moved = [];
  for (let k = 0; k < NLV; k++) { const L = LEVELS[k]; if (budget > 0 && levelRecentre(L, x, z)) { budget--; moved[k] = true; } }
  for (let k = 0; k < NLV; k++) { const L = LEVELS[k]; if (isNaN(L.ox)) continue; if (L.dirty || moved[k - 1]) levelWrite(L, k ? LEVELS[k - 1] : null); } }

// spring colours: the pale grey-brown alluvium with a flush of green, the desert's sand, the marsh greens and mud, the ripe barley
// (yellow, some already reaped), green flax, the dark ground under the palms, the town's beaten earth and the white-plastered precinct
function groundColor(x, z, h, c) {
  const n1 = fbm(x / 40, z / 40, 3), n2 = fbm(x / 600 + 5, z / 600, 3);
  c.setRGB(0.64 + 0.06 * n2, 0.57 + 0.05 * n1, 0.43 + 0.03 * n1); c.lerp(_c1.setRGB(0.48, 0.52, 0.32), clampN((n1 - 0.45) * 2.2, 0, 0.6));   // alluvium with spring grass
  const ds = desertness(x, z); if (ds > 0) c.lerp(_c1.setRGB(0.82 + 0.05 * n1, 0.72 + 0.05 * n1, 0.54), ds);
  if (LATE && x * x + z * z < 2.9e5) { const m = lateRuin(x, z); if (m > 0.05) c.lerp(_c1.setRGB(0.6 + 0.08 * n1, 0.52 + 0.06 * n1, 0.44), Math.min(0.85, m * 0.6)); }   // ruin mounds: eroded mud brick and sherds
  const mm = marshMask(x, z); if (mm > 0.02) { const rb = h < 0.6, tw = fbm(x / 90 + 2, z / 90 + 9, 2); c.lerp(rb ? _c1.setRGB(0.28 + 0.2 * tw, 0.4 + 0.08 * tw, 0.16 + 0.08 * tw) : _c1.setRGB(0.4 + 0.05 * n1, 0.48 + 0.05 * n1, 0.26), clampN(mm * 2, 0, 0.92)); }   // reed beds, green and tawny; islands grassy
  if (nearWater(x, z, 40) && h > 0.3) c.lerp(_c1.setRGB(0.4, 0.5, 0.28), 0.45);                                                   // greener along the water
  if (h < WATER + 0.4) c.lerp(_c1.setRGB(0.4, 0.36, 0.28), clampN((WATER + 0.4 - h) * 1.5, 0, 0.9));
  const k = rIdx(x, z), r = k < 0 ? 0 : RAS[k];
  if (r === 1) c.setRGB(0.7 + 0.05 * n1, 0.62 + 0.05 * n1, 0.48);
  else if (r === 2) c.lerp(_c1.setRGB(0.5, 0.42, 0.32), 0.9); else if (r === 3) c.lerp(_c1.setRGB(0.62 + 0.04 * n1, 0.54, 0.41), 0.8);
  else if (r === 4) c.setRGB(0.8 + 0.03 * n1, 0.74 + 0.03 * n1, 0.62);
  else if (r === 5) { const cr = CROP[k], row = Math.sin((x + z) * 1.9) > 0.3;
    if (cr === 1) c.setRGB(0.84 + 0.04 * n1 - (row ? 0.05 : 0), 0.72 + 0.04 * n1 - (row ? 0.05 : 0), 0.4); else if (cr === 2) c.setRGB(0.78 + 0.04 * n1, 0.7, 0.5); else if (cr === 3) c.setRGB(0.4, 0.52, 0.44 + (fbm(x / 3, z / 3, 2) > 0.62 ? 0.12 : 0));
    else if (cr === 4) c.setRGB(0.74, 0.64, 0.36); else if (cr === 6) c.setRGB(row ? 0.32 : 0.46, row ? 0.46 : 0.4, row ? 0.22 : 0.3); else c.setRGB(0.6 + 0.04 * n1, 0.55, 0.42); }
  else if (r === 9) c.lerp(_c1.setRGB(0.42 + 0.05 * n1, 0.44 + 0.05 * n1, 0.28), 0.8);
  else if (r === 10) c.lerp(_c1.setRGB(0.72, 0.66, 0.54), 0.7);
  else if (r === 11) { const b = (Math.floor(x / 0.6) + Math.floor(z / 1.2)) % 2; c.setRGB(b ? 0.62 : 0.68, b ? 0.52 : 0.58, b ? 0.4 : 0.44); }
  else if (r === 12) c.setRGB(0.78 + 0.04 * n1, 0.7 + 0.04 * n1, 0.5);
  else if (r === 8) { const row = Math.sin(x * 2.6) > 0.2; c.setRGB(row ? 0.34 : 0.46, row ? 0.46 : 0.38, row ? 0.22 : 0.28); }
  return c; }

// markers (defined here so that everything can use them)
const MARKS = [];
const mark = (name, x, z, tag, text, o = {}) => { const m = { name, x, z, tag, text, y: o.y, r: o.r || 25, range: o.range || 700, big: !!o.big, follow: o.follow, hidden: !!o.hidden }; MARKS.push(m); return m; };

// ---------- buildings as real geometry, merged by area ----------
const GT = (w, h, draw, metres) => { const t = tex(w, h, draw); t.repeat.set(1 / metres, 1 / metres); return t; };
const G_TEX = {
  // walls of sun-dried mud brick, plastered with mud and chopped straw, smoothed by hand: 2 m square
  mud: GT(256, 256, (g, w, h) => { speckle("#b89a74", 4000, ["#c4a882", "#a88a64", "#c8b08a", "#9a7e5a"], 3, 3)(g, w, h); for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "90,70,46" : "214,196,160"},.1)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 26, 6 + rnd() * 18, rnd() * 3, 0, 6.283); g.fill(); }
    g.strokeStyle = "rgba(220,200,160,.25)"; for (let k = 0; k < 120; k++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 * (rnd() - 0.5), y + 3); g.stroke(); } g.fillStyle = "rgba(70,52,34,.3)"; g.fillRect(0, h - 12, w, 12); }, 2),
  // the temple's walls: mud brick laid in courses, under a pale plaster
  brick: GT(256, 256, (g, w, h) => { g.fillStyle = "#d4c4a4"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) { g.fillStyle = ["#d8c8a8", "#ccbc9a", "#dccdae", "#c8b894"][(rnd() * 4) | 0]; g.fillRect(x + 1, y + 1, 30, 14); }
    for (let k = 0; k < 40; k++) { g.fillStyle = "rgba(240,230,210,.25)"; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 20 + rnd() * 40, 10 + rnd() * 30, 0, 0, 6.283); g.fill(); } }, 2),
  // reed matting over the huts' arches; reed bundles
  reedmat: GT(256, 256, (g, w, h) => { g.fillStyle = "#b8a070"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16 + y / 8) % 2 ? "#c8b080" : "#a89060"; g.fillRect(x + ((y / 8) % 2 ? 8 : 0), y, 15, 7); }
    for (let k = 0; k < 600; k++) { g.fillStyle = "rgba(80,60,30,.15)"; g.fillRect(rnd() * w, rnd() * h, 1, 4 + rnd() * 8); } }, 1.5),
  reed: GT(128, 256, (g, w, h) => { g.fillStyle = "#a8925e"; g.fillRect(0, 0, w, h); for (let k = 0; k < 400; k++) { g.strokeStyle = ["#c0aa74", "#8a7444", "#b49c66", "#9a844e"][(rnd() * 4) | 0]; g.lineWidth = 1 + rnd() * 1.5; const x = rnd() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (rnd() - 0.5) * 3, h); g.stroke(); }
    for (let y = 20; y < h; y += 60) { g.fillStyle = "rgba(60,40,20,.5)"; g.fillRect(0, y, w, 4); } }, 1),
  palm: GT(128, 128, (g, w, h) => { g.fillStyle = "#6a5a44"; g.fillRect(0, 0, w, h); for (let k = 0; k < 160; k++) { g.fillStyle = ["rgba(110,92,66,.5)", "rgba(40,30,20,.5)"][k % 2]; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); } }, 1),
  plank: GT(256, 256, (g, w, h) => { g.fillStyle = "#7a6a58"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = ["#8a7a66", "#76665a", "#948472"][(x / 32) % 3]; g.fillRect(x + 1, 0, 30, h); } }, 2),
  dark: GT(16, 16, (g, w, h) => { g.fillStyle = "#1a140e"; g.fillRect(0, 0, w, h); }, 1) };
const G_MAT = {}; for (const k in G_TEX) G_MAT[k] = new THREE.MeshStandardMaterial({ map: G_TEX[k], vertexColors: true, roughness: 0.95 });
G_MAT.reedmat.side = THREE.DoubleSide; G_MAT.lod = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
const GCOL = new Map(), GCHUNK = 500;
function gcol(key) { if (!GCOL.has(key)) GCOL.set(key, { pos: [], nor: [], uv: [], col: [], mat: key.split("|")[1] }); return GCOL.get(key); }
// a frame: where a building stands; local x across, z along its length, y up from its base
const FR = (x, z, ry, gy, chunkKey) => ({ x, z, gy, c: Math.cos(ry), s: Math.sin(ry), key: chunkKey ?? `${Math.floor(x / GCHUNK)},${Math.floor(z / GCHUNK)}` });
const _gp = [0, 0, 0];
function gw(F, lx, ly, lz) { return [F.x + lx * F.c + lz * F.s, F.gy + ly, F.z - lx * F.s + lz * F.c]; }
let GTINT = [1, 1, 1];
// a polygon of 3 or 4 local points, uvs given; if `out` (a local direction) is given, the winding is turned to face it
function gpoly(F, mat, P, UV, out) { const C = gcol(F.key + "|" + mat), W = P.map(p => gw(F, ...p));
  const ax = W[1][0] - W[0][0], ay = W[1][1] - W[0][1], az = W[1][2] - W[0][2], bx = W[2][0] - W[0][0], by = W[2][1] - W[0][1], bz = W[2][2] - W[0][2];
  let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
  if (out) { const ox = out[0] * F.c + out[2] * F.s, oy = out[1], oz = -out[0] * F.s + out[2] * F.c; if (nx * ox + ny * oy + nz * oz < 0) { W.reverse(); UV = UV.slice().reverse(); nx = -nx; ny = -ny; nz = -nz; } }
  const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  const idx = W.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
  for (const i of idx) { C.pos.push(...W[i]); C.nor.push(nx, ny, nz); C.uv.push(...UV[i]); C.col.push(...GTINT); } }
// an axis-aligned box in the frame, centre (cx, cy, cz), sizes; skip faces with skip = "b" bottom, "t" top
function gbox(F, mat, cx, cy, cz, sx, sy, sz, skip = "b") { const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const f = (n, P, U) => gpoly(F, mat, P, U, n);
  f([1, 0, 0], [[cx + hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz + hz]], [[0, cy - hy], [sz, cy - hy], [sz, cy + hy], [0, cy + hy]]);
  f([-1, 0, 0], [[cx - hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz + hz], [cx - hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz - hz]], [[0, cy - hy], [sz, cy - hy], [sz, cy + hy], [0, cy + hy]]);
  f([0, 0, 1], [[cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz]], [[0, cy - hy], [sx, cy - hy], [sx, cy + hy], [0, cy + hy]]);
  f([0, 0, -1], [[cx + hx, cy - hy, cz - hz], [cx - hx, cy - hy, cz - hz], [cx - hx, cy + hy, cz - hz], [cx + hx, cy + hy, cz - hz]], [[0, cy - hy], [sx, cy - hy], [sx, cy + hy], [0, cy + hy]]);
  if (!skip.includes("t")) f([0, 1, 0], [[cx - hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz + hz], [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz]], [[0, 0], [sx, 0], [sx, sz], [0, sz]]);
  if (!skip.includes("b")) f([0, -1, 0], [[cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz + hz], [cx - hx, cy - hy, cz + hz]], [[0, 0], [sx, 0], [sx, sz], [0, sz]]); }
// a round-headed opening (dark), facing `out`, centred at (cx, cz) on a wall, sill at y0, width w, height h to the top of the arch
function garch(F, mat, cx, y0, cz, w, h, out) { const r = w / 2, ys = y0 + h - r, N = 6, along = out[0] ? [0, 0, 1] : [1, 0, 0], P = (u, y) => [cx + along[0] * u + out[0] * 0.03, y, cz + along[2] * u + out[2] * 0.03];
  gpoly(F, mat, [P(-r, y0), P(r, y0), P(r, ys), P(-r, ys)], [[0, 0], [1, 0], [1, 1], [0, 1]], out);
  for (let k = 0; k < N; k++) { const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N; gpoly(F, mat, [P(0, ys), P(r * Math.cos(a0), ys + r * Math.sin(a0)), P(r * Math.cos(a1), ys + r * Math.sin(a1))], [[0, 0], [1, 0], [1, 1]], out); } }
// a thatched or shingled roof with real thickness: gabled (ridge along z) or hipped; eaves overhang e, verge overhang g
function groof(F, mat, w, d, wh, rh, o = {}) { const t = o.t ?? (mat === "thatch" ? 0.38 : 0.16), e = o.e ?? (mat === "thatch" ? 0.5 : 0.35), g = o.g ?? 0.3, k = rh / (w / 2), W2 = w / 2 + e, ye = wh - e * k, yr = wh + rh, tv = t * Math.hypot(1, k), under = o.under || mat;
  const sl = Math.hypot(W2, yr - ye);
  if (!o.hip) { const L = d / 2 + g;
    for (const sx of [-1, 1]) { const A = [sx * W2, ye + tv, -L], B = [sx * W2, ye + tv, L], C = [0, yr + tv, L], D = [0, yr + tv, -L], uv = [[0, 0], [2 * L, 0], [2 * L, sl], [0, sl]];
      gpoly(F, mat, [A, B, C, D], uv, [sx, 1, 0]);
      gpoly(F, under, [[sx * W2, ye, -L], [sx * W2, ye, L], [0, yr, L], [0, yr, -L]], uv, [-sx * 0.3, -1, 0]);
      gpoly(F, mat, [[sx * W2, ye, -L], [sx * W2, ye, L], B, A], [[0, 0], [2 * L, 0], [2 * L, t], [0, t]], [sx, 0, 0]);
      for (const sz of [-1, 1]) gpoly(F, mat, [[sx * W2, ye, sz * L], [0, yr, sz * L], [0, yr + tv, sz * L], [sx * W2, ye + tv, sz * L]], [[0, 0], [sl, 0], [sl, t], [0, t]], [0, 0, sz]); }
    if (mat === "thatch") for (let q = 0; q < 6; q++) { const a0 = Math.PI * q / 6, a1 = Math.PI * (q + 1) / 6, r = 0.3, y0 = yr + tv - 0.12; gpoly(F, "thatch", [[r * Math.cos(a0), y0 + r * Math.sin(a0) * 0.8, -L - 0.05], [r * Math.cos(a0), y0 + r * Math.sin(a0) * 0.8, L + 0.05], [r * Math.cos(a1), y0 + r * Math.sin(a1) * 0.8, L + 0.05], [r * Math.cos(a1), y0 + r * Math.sin(a1) * 0.8, -L - 0.05]], [[0, 0], [2 * L, 0], [2 * L, 0.3], [0, 0.3]], [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0]); }
    else gbox(F, "oak", 0, yr + tv + 0.04, 0, 0.22, 0.12, 2 * L + 0.1); }
  else { const Le = d / 2 + e, Rz = Math.max(0.25, d / 2 - w / 2), slz = Math.hypot(Le - Rz, yr - ye);
    for (const sx of [-1, 1]) { gpoly(F, mat, [[sx * W2, ye + tv, -Le], [sx * W2, ye + tv, Le], [0, yr + tv, Rz], [0, yr + tv, -Rz]], [[0, 0], [2 * Le, 0], [Le + Rz, sl], [Le - Rz, sl]], [sx, 1, 0]);
      gpoly(F, under, [[sx * W2, ye, -Le], [sx * W2, ye, Le], [0, yr, Rz], [0, yr, -Rz]], [[0, 0], [2 * Le, 0], [Le + Rz, sl], [Le - Rz, sl]], [-sx * 0.3, -1, 0]);
      gpoly(F, mat, [[sx * W2, ye, -Le], [sx * W2, ye, Le], [sx * W2, ye + tv, Le], [sx * W2, ye + tv, -Le]], [[0, 0], [2 * Le, 0], [2 * Le, t], [0, t]], [sx, 0, 0]); }
    for (const sz of [-1, 1]) { gpoly(F, mat, [[-W2, ye + tv, sz * Le], [W2, ye + tv, sz * Le], [0, yr + tv, sz * Rz]], [[0, 0], [2 * W2, 0], [W2, slz]], [0, 1, sz]);
      gpoly(F, under, [[-W2, ye, sz * Le], [W2, ye, sz * Le], [0, yr, sz * Rz]], [[0, 0], [2 * W2, 0], [W2, slz]], [0, -1, -sz * 0.3]);
      gpoly(F, mat, [[-W2, ye, sz * Le], [W2, ye, sz * Le], [W2, ye + tv, sz * Le], [-W2, ye + tv, sz * Le]], [[0, 0], [2 * W2, 0], [2 * W2, t], [0, t]], [0, 0, sz]);
      if (mat === "thatch") { const ys = yr + tv - (yr - ye) * 0.12 / (Le - Rz) * 4, zz = sz * (Rz + 0.48); gpoly(F, "dark", [[-0.3, ys - 0.02, zz], [0.3, ys - 0.02, zz], [0, yr + tv - 0.05, sz * (Rz + 0.05)]], [[0, 0], [1, 0], [0.5, 1]], [0, 1, sz]); }   // a smoke hole near the top of the hip
    }
    if (mat === "thatch") gbox(F, "thatch", 0, yr + tv - 0.05, 0, 0.5, 0.25, 2 * Rz + 0.4); } }
function gFlush(target) { const out = [];
  for (const [key, C] of GCOL) { if (!C.pos.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(C.pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(C.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(C.uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(C.col.map(v => clampN(v, 0, 1.6)), 3)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, G_MAT[C.mat]); m.userData.key = key; (target || scene).add(m); out.push(m); }
  GCOL.clear(); return out; }

// a gabled roof over a 1 x 1 base, 1 tall; the ridge runs along z, the gable ends face +z and -z
function gableGeo() { const v = [-0.5, 0, -0.5, 0.5, 0, -0.5, 0, 1, -0.5, -0.5, 0, 0.5, 0.5, 0, 0.5, 0, 1, 0.5], T = [];
  const P = i => [v[3 * i], v[3 * i + 1], v[3 * i + 2]], tri = (a, b, c, uv) => { T.push([...P(a), ...P(b), ...P(c), uv]); };
  const pos = [], uv = [], add = (a, b, c, ua, ub, uc) => { pos.push(...P(a), ...P(b), ...P(c)); uv.push(...ua, ...ub, ...uc); };
  add(3, 4, 5, [0, 0], [1, 0], [0.5, 0.5]); add(1, 0, 2, [0, 0], [1, 0], [0.5, 0.5]);                                        // gable ends
  add(0, 3, 5, [0, 0], [1, 0], [1, 1]); add(0, 5, 2, [0, 0], [1, 1], [0, 1]); add(4, 1, 2, [0, 0], [1, 0], [1, 1]); add(4, 2, 5, [0, 0], [1, 1], [0, 1]);   // the two slopes
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g; }
const GABLE_G = gableGeo(), BOX_G = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), CYL_G = new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0), CONE4_G = new THREE.ConeGeometry(0.7071, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
const PLANE_G = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
// the kit: lists of [x, y, z, sx, sy, sz, rotY] per part and material, drawn as one instanced mesh each
const KIT = {}; const kit = (key, geo, mat) => KIT[key] || (KIT[key] = { geo, mat, list: [] });
// small things drawn only near you, batched by 250 m square: [name prefix, distance in m]
const KIT_NEAR = [["ptrunk", 1600], ["pcrown", 1600], ["tamarisk", 900], ["jar", 260], ["oven", 350], ["grave", 500], ["brickstack", 500], ["tk:", 260], ["rboat", 1200], ["tfish", 80], ["pillar", 1600]];
const kitNear = key => { for (const [p, r] of KIT_NEAR) if (key.startsWith(p)) return r; return 0; };
const put = (key, geo, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => { if (kitNear(key)) key = key + "@" + lodKey(x, z); kit(key, geo, mat).list.push([x, y, z, sx, sy, sz, ry, rx, rz]); return KIT[key].list.length - 1; };
function buildKit(group) { for (const k in KIT) { const K = KIT[k]; if (!K.list.length || K.im) continue; const im = new THREE.InstancedMesh(K.geo, K.mat, K.list.length), c = new THREE.Color();
  K.list.forEach(([x, y, z, sx, sy, sz, ry, rx, rz], i) => { O3.position.set(x, y, z); O3.rotation.set(rx || 0, ry, rz || 0, "YXZ"); O3.scale.set(sx, sy, sz); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); c.setHSL(0.08, 0.1 + 0.15 * hash(i, 3), 0.78 + 0.22 * hash(i, 5)); im.setColorAt(i, c); });
  im.frustumCulled = false; K.im = im; group.add(im); } }
function kitHide(key, i) { const K = KIT[key]; if (!K?.im) return; K.im.setMatrixAt(i, ZEROM); K.im.instanceMatrix.needsUpdate = true; }
function kitShow(key, i) { const K = KIT[key]; if (!K?.im) return; const [x, y, z, sx, sy, sz, ry, rx, rz] = K.list[i]; O3.position.set(x, y, z); O3.rotation.set(rx || 0, ry, rz || 0, "YXZ"); O3.scale.set(sx, sy, sz); O3.updateMatrix(); K.im.setMatrixAt(i, O3.matrix); K.im.instanceMatrix.needsUpdate = true; }

const COLL = new Map(), CC = 16;
function solid(x, z, w, d, ry, tag) { const r = { x, z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), tag, on: true }, R = Math.hypot(w, d) / 2;
  for (let i = Math.floor((x - R) / CC); i <= Math.floor((x + R) / CC); i++) for (let j = Math.floor((z - R) / CC); j <= Math.floor((z + R) / CC); j++) { const k = i * 100003 + j; if (!COLL.has(k)) COLL.set(k, []); COLL.get(k).push(r); }
  return r; }
function pushOut(p, rad = 0.3) { const L = COLL.get(Math.floor(p.x / CC) * 100003 + Math.floor(p.z / CC)); if (!L) return;
  for (const r of L) { if (!r.on || (r.ymax !== undefined && p.y > r.ymax)) continue; const dx = p.x - r.x, dz = p.z - r.z, lx = dx * r.c - dz * r.s, lz = dx * r.s + dz * r.c, ex = r.hw + rad - Math.abs(lx), ez = r.hd + rad - Math.abs(lz);
    if (ex <= 0 || ez <= 0) continue; let nx = lx, nz = lz; if (ex < ez) nx = Math.sign(lx || 1) * (r.hw + rad); else nz = Math.sign(lz || 1) * (r.hd + rad);
    p.x = r.x + nx * r.c + nz * r.s; p.z = r.z - nx * r.s + nz * r.c; } }

const MAT = { wood: M(0x5a4634), dark: M(0x18120c, { roughness: 1, side: THREE.DoubleSide }), mud: new THREE.MeshStandardMaterial({ map: G_TEX.mud, roughness: 1 }), reed: new THREE.MeshStandardMaterial({ map: G_TEX.reed, roughness: 1 }), reedmat: new THREE.MeshStandardMaterial({ map: G_TEX.reedmat, roughness: 1, side: THREE.DoubleSide }),
  clay: M(0xb08a62), pot: M(0xd8c8a4), fired: M(0xc8a87a), bitumen: M(0x1a1612, { roughness: 0.4 }), palm: new THREE.MeshStandardMaterial({ map: G_TEX.palm, roughness: 1 }), cloth: M(0xe0d6c0, { side: THREE.DoubleSide }), fish: M(0x8a9098, { metalness: 0.3, roughness: 0.5 }) };
const LOD_CELL = 250, lodKey = (x, z) => Math.floor(x / LOD_CELL) + "," + Math.floor(z / LOD_CELL);
const putG = (key, geo, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0) => put(key, geo, mat, x, groundH(x, z) + y, z, sx, sy, sz, ry, rx);
const POT_G = new THREE.LatheGeometry([[0, 0], [0.18, 0.02], [0.3, 0.2], [0.32, 0.4], [0.24, 0.62], [0.13, 0.7], [0.15, 0.78], [0, 0.78]].map(([r, y]) => new THREE.Vector2(r, y)), 12);   // a storage jar
const OVEN_G = new THREE.CylinderGeometry(0.42, 0.55, 0.9, 12, 1, true).translate(0, 0.45, 0), BOWL_G = new THREE.SphereGeometry(0.2, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);

// ---------- houses: mud brick and reed ----------
// SOURCES: Ubaid houses excavated at Tell Abada, Kheit Qasim, Tell Madhhur and Tell el-Oueili are of mud brick, "tripartite": a long
// central hall, often T-shaped, with rows of smaller rooms down each side, about 10-20 m long, with a hearth or oven in the hall, flat
// roofs of palm trunks, reeds and mud reached by a stair, and courtyards. At Eridu Safar and Lloyd also found the remains of reed huts
// (the "hut sounding"), plastered with mud, like the reed houses still built in the marshes: arches of bundled reeds covered with mats.
const HOUSES = [];
function addHouse(x, z, w, d, ry, o = {}) { const gy = Math.min(...[[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => groundH(x + Math.cos(ry) * a * w / 2 + Math.sin(ry) * b * d / 2, z - Math.sin(ry) * a * w / 2 + Math.cos(ry) * b * d / 2))) - 0.05, R = seeded((x * 31 + z * 17) | 0);
  const H = { x, z, w, d, ry, gy, kind: o.kind || "house", reed: !!o.reed, plain: !!o.plain, fore: o.fore || 0, court: o.court ?? (LATE && !o.reed), wh: o.wh ?? (o.reed ? 0 : 2.9 + R() * 0.5), face: o.face ?? (R() < 0.5 ? 1 : -1), name: o.name, tint: 0.88 + R() * 0.2 };
  const c = Math.cos(ry), s = Math.sin(ry), fx = H.reed ? 0 : H.face * (w / 2 + 0.7), fz = H.reed ? H.face * (d / 2 + 0.7) : 0;
  H.dp = [x + fx * c + fz * s, z - fx * s + fz * c, Math.atan2(fx * c + fz * s, -fx * s + fz * c)];
  H.coll = solid(x, z, w + 0.1, d + 0.1, ry, H); rRect(x, z, w + 1, d + 1, ry, 2); HOUSES.push(H); return H; }
// the walled forecourt in front of a house, with a gateway onto the street (as at Habuba Kabira)
function foreWalls(F, H) { const fd = H.fore, w = H.w, d = H.d, f = H.face, t = H.tint, wl = (cx, cz, sx, sz) => { gbox(F, "mud", cx, 1.0, cz, sx, 2.0, sz, "b"); const [x, , z] = gw(F, cx, 0, cz); solid(x, z, sx, sz, H.ry); };
  GTINT = [t * 0.97, t * 0.94, t * 0.9]; for (const sz of [-1, 1]) wl(f * (w / 2 + fd / 2), sz * (d / 2 - 0.2), fd, 0.4); const fx = f * (w / 2 + fd - 0.2), L = d / 2 - 0.75; for (const sz of [-1, 1]) wl(fx, sz * (0.75 + L / 2), 0.4, L); GTINT = [1, 1, 1]; }
function gMudHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, "H" + lodKey(H.x, H.z)), w = H.w, d = H.d, wh = H.wh, R = seeded((H.x * 7 + H.z * 13) | 0), t = H.tint;
  GTINT = [t, t * 0.97, t * 0.93]; gbox(F, "mud", 0, wh / 2, 0, w, wh, d); gbox(F, "mud", 0, wh + 0.25, 0, w + 0.1, 0.5, d + 0.1, "b");   // walls and the parapet
  GTINT = [t * 0.95, t * 0.92, t * 0.88]; gbox(F, "mud", 0, wh + 0.06, 0, w - 0.4, 0.1, d - 0.4, "b");   // the roof's mud surface inside the parapet
  GTINT = [0.7, 0.62, 0.5]; for (let k = 1; k < Math.round(d / 0.9); k++) for (const sx of [-1, 1]) gbox(F, "palm", sx * (w / 2 + 0.12), wh - 0.2, -d / 2 + k * 0.9, 0.24, 0.16, 0.16, "");   // the ends of the palm-trunk beams
  GTINT = [1, 1, 1]; const fx = H.face * (w / 2 + 0.03), n = [H.face, 0, 0]; gpoly(F, "dark", [[fx, 0, -0.5], [fx, 0, 0.5], [fx, 1.9, 0.5], [fx, 1.9, -0.5]], [[0, 0], [1, 0], [1, 1], [0, 1]], n);   // the doorway
  for (const sz of [-1, 1]) for (const a of [-0.3, 0.3]) { const z = sz * d / 2 * 0.6 + a; gpoly(F, "dark", [[fx, wh - 0.8, z - 0.12], [fx, wh - 0.8, z + 0.12], [fx, wh - 0.45, z + 0.12], [fx, wh - 0.45, z - 0.12]], [[0, 0], [1, 0], [1, 1], [0, 1]], n); }   // small high windows
  for (const sx of [-1, 1]) for (const z of [-d / 4, d / 4]) gpoly(F, "dark", [[-fx * sx * 0 + sx * (w / 2 + 0.03), wh - 0.8, z - 0.12], [sx * (w / 2 + 0.03), wh - 0.8, z + 0.12], [sx * (w / 2 + 0.03), wh - 0.45, z + 0.12], [sx * (w / 2 + 0.03), wh - 0.45, z - 0.12]], [[0, 0], [1, 0], [1, 1], [0, 1]], [sx, 0, 0]);
  if (R() < 0.45) { GTINT = [0.95, 0.88, 0.72]; const sx = -H.face * w * 0.2; for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gbox(F, "palm", sx + a * 1.2, wh + 0.9, b * 1.4, 0.1, 1.8, 0.1, "b"); gbox(F, "reedmat", sx, wh + 1.85, 0, 2.8, 0.08, 3.2, "");   // a reed shade on the roof, for sleeping in the heat
    GTINT = [1, 1, 1]; }
  GTINT = [t * 0.9, t * 0.86, t * 0.8]; const sz = R() < 0.5 ? 1 : -1; for (let k = 0; k < 6; k++) gbox(F, "mud", H.face * (w / 2 + 0.45), (k + 1) * wh / 12, sz * (d / 2 - 0.8 - k * 0.42), 0.8, (k + 1) * wh / 6, 0.42, "b");   // an outside stair to the roof
  GTINT = [1, 1, 1]; if (H.fore) foreWalls(F, H);
  const L = FR(H.x, H.z, H.ry, H.gy, "L" + lodKey(H.x, H.z)); GTINT = [0.46 * t, 0.38 * t, 0.28 * t]; gbox(L, "lod", 0, (wh + 0.5) / 2, 0, w, wh + 0.5, d); GTINT = [1, 1, 1]; }
// the courtyard house of Sumerian towns (excavated at Ur, Nippur, Tell Asmar): rooms round an open court, the outer walls blank but for the
// door, flat roofs over the rooms, the court open to the sky; a vestibule inside the door, a reception room, a kitchen, stores, stairs
function gCourtHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, "H" + lodKey(H.x, H.z)), w = H.w, d = H.d, wh = H.wh, t = H.tint, th = 0.55, rg = Math.min(3.2, w * 0.3, d * 0.3);
  GTINT = [t, t * 0.97, t * 0.93]; for (const sx of [-1, 1]) gbox(F, "mud", sx * (w / 2 - th / 2), (wh + 0.5) / 2, 0, th, wh + 0.5, d); for (const sz of [-1, 1]) gbox(F, "mud", 0, (wh + 0.5) / 2, sz * (d / 2 - th / 2), w - 2 * th, wh + 0.5, th);   // the outer walls and parapet
  const cw = w - 2 * rg, cd = d - 2 * rg, gp = 0.6, sg = (L, f) => { const a = (L / 2 + gp) / 2, l = L / 2 - gp; for (const q of [-1, 1]) f(q * a, l); f(0, 2 * gp, true); };   // the court's walls, a doorway in the middle of each side
  for (const sx of [-1, 1]) sg(cd + 0.35, (c, l, top) => top ? gbox(F, "mud", sx * cw / 2, (wh + 2.1) / 2, 0, 0.35, wh - 2.1, l) : gbox(F, "mud", sx * cw / 2, wh / 2, c, 0.35, wh, l)); for (const sz of [-1, 1]) sg(cw - 0.35, (c, l, top) => top ? gbox(F, "mud", 0, (wh + 2.1) / 2, sz * cd / 2, l, wh - 2.1, 0.35) : gbox(F, "mud", c, wh / 2, sz * cd / 2, l, wh, 0.35));
  GTINT = [t * 0.93, t * 0.9, t * 0.85]; for (const sx of [-1, 1]) gbox(F, "mud", sx * (w / 2 - rg / 2), wh + 0.05, 0, rg - th, 0.12, d - 2 * th, "b"); for (const sz of [-1, 1]) gbox(F, "mud", 0, wh + 0.05, sz * (d / 2 - rg / 2), cw, 0.12, rg - th, "b");   // roofs over the rooms
  GTINT = [0.7, 0.62, 0.5]; for (let k = 1; k < Math.round(d / 1.0); k++) for (const sx of [-1, 1]) gbox(F, "palm", sx * (w / 2 + 0.08), wh - 0.2, -d / 2 + k * 1.0, 0.18, 0.14, 0.14, "");
  GTINT = [1, 1, 1]; const fx = H.face * (w / 2 + 0.03); gpoly(F, "dark", [[fx, 0, -0.55], [fx, 0, 0.55], [fx, 2.0, 0.55], [fx, 2.0, -0.55]], [[0, 0], [1, 0], [1, 1], [0, 1]], [H.face, 0, 0]);
  GTINT = [0.4, 0.34, 0.28]; gpoly(F, "dark", [[-cw / 2 + 0.2, 0.06, -cd / 2 + 0.2], [cw / 2 - 0.2, 0.06, -cd / 2 + 0.2], [cw / 2 - 0.2, 0.06, cd / 2 - 0.2], [-cw / 2 + 0.2, 0.06, cd / 2 - 0.2]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 1, 0]);   // the court's beaten floor
  GTINT = [1, 1, 1]; const L = FR(H.x, H.z, H.ry, H.gy, "L" + lodKey(H.x, H.z)); GTINT = [0.46 * t, 0.38 * t, 0.28 * t]; gbox(L, "lod", 0, (wh + 0.5) / 2, 0, w, wh + 0.5, d); GTINT = [1, 1, 1]; }
// a house built simply, for the outer city: the same size and shape, its walls, parapet and door (the plan inside is the full one)
function gPlainHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, "H" + lodKey(H.x, H.z)), w = H.w, d = H.d, wh = H.wh, t = H.tint; GTINT = [t, t * 0.97, t * 0.93]; gbox(F, "mud", 0, (wh + 0.45) / 2, 0, w, wh + 0.45, d, "b");
  GTINT = [1, 1, 1]; const fx = H.face * (w / 2 + 0.03); gpoly(F, "dark", [[fx, 0, -0.5], [fx, 0, 0.5], [fx, 1.9, 0.5], [fx, 1.9, -0.5]], [[0, 0], [1, 0], [1, 1], [0, 1]], [H.face, 0, 0]); if (H.fore) foreWalls(F, H);
  const L = FR(H.x, H.z, H.ry, H.gy, "L" + lodKey(H.x, H.z)); GTINT = [0.46 * t, 0.38 * t, 0.28 * t]; gbox(L, "lod", 0, (wh + 0.45) / 2, 0, w, wh + 0.45, d); GTINT = [1, 1, 1]; }
// a reed hut: arches of bundled reeds, covered with mats, the ends closed with a lattice of reeds and a door
const reedBundle = (F, x, z, y0, y1, r0, r1) => { for (let k = 0; k < 8; k++) { const a0 = k / 8 * Math.PI * 2, a1 = (k + 1) / 8 * Math.PI * 2, am = (a0 + a1) / 2; gpoly(F, "reed", [[x + Math.cos(a0) * r0, y0, z + Math.sin(a0) * r0], [x + Math.cos(a1) * r0, y0, z + Math.sin(a1) * r0], [x + Math.cos(a1) * r1, y1, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y1, z + Math.sin(a0) * r1]], [[0, 0], [0.3, 0], [0.3, y1 - y0], [0, y1 - y0]], [Math.cos(am), 0, Math.sin(am)]); } };   // a tapering column of bundled reeds
function gReedHut(H) { const F = FR(H.x, H.z, H.ry, H.gy, "H" + lodKey(H.x, H.z)), w = H.w, d = H.d, hh = Math.min(3.4, w * 0.75), N = 10, t = H.tint;
  const arc = a => [Math.cos(a) * w / 2, Math.sin(a) * hh];
  for (let k = 0; k < N; k++) { const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N, [x0, y0] = arc(a0), [x1, y1] = arc(a1), nx = Math.cos((a0 + a1) / 2), ny = Math.sin((a0 + a1) / 2), L = Math.hypot(x1 - x0, y1 - y0);
    GTINT = [t, t * 0.96, t * 0.88]; gpoly(F, "reedmat", [[x0, y0, -d / 2], [x0, y0, d / 2], [x1, y1, d / 2], [x1, y1, -d / 2]], [[0, 0], [d, 0], [d, L], [0, L]], [nx, ny, 0]);
    GTINT = [t * 0.8, t * 0.74, t * 0.6]; for (let q = 0; q <= Math.round(d / 1.2); q++) { const z = -d / 2 + q * d / Math.round(d / 1.2); gpoly(F, "reed", [[x0 * 1.03, y0 * 1.03, z - 0.09], [x0 * 1.03, y0 * 1.03, z + 0.09], [x1 * 1.03, y1 * 1.03, z + 0.09], [x1 * 1.03, y1 * 1.03, z - 0.09]], [[0, 0], [0.2, 0], [0.2, L], [0, L]], [nx, ny, 0]); } }   // the arches, standing proud of the matting
  for (const sz of [-1, 1]) { GTINT = [t * 0.92, t * 0.88, t * 0.78]; for (let k = 0; k < N; k++) { const a0 = Math.PI * k / N, a1 = Math.PI * (k + 1) / N, [x0, y0] = arc(a0), [x1, y1] = arc(a1); gpoly(F, "reed", [[0, 0, sz * d / 2], [x0, y0, sz * d / 2], [x1, y1, sz * d / 2]], [[0.5, 0], [0, 1], [1, 1]], [0, 0, sz]); }
    if (sz === H.face) { GTINT = [1, 1, 1]; gpoly(F, "dark", [[-0.45, 0, sz * (d / 2 + 0.03)], [0.45, 0, sz * (d / 2 + 0.03)], [0.45, 1.7, sz * (d / 2 + 0.03)], [-0.45, 1.7, sz * (d / 2 + 0.03)]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, sz]); }
    for (const sx of [-1, 1]) { const bx = sx * (w / 2 - 0.12), bz = sz * (d / 2 - 0.05), bh = hh + 0.45; GTINT = [t * 0.8, t * 0.74, t * 0.6]; reedBundle(F, bx, bz, 0, bh, 0.2, 0.09); GTINT = [t * 0.55, t * 0.48, t * 0.36]; for (let q = 1; q <= 5; q++) reedBundle(F, bx, bz, bh * q / 6 - 0.04, bh * q / 6 + 0.04, 0.215 - 0.11 * q / 6 + 0.012, 0.215 - 0.11 * q / 6 + 0.01); } }   // the end bundles of reeds, tapering, bound with cord, the arches springing from them
  GTINT = [1, 1, 1]; const L = FR(H.x, H.z, H.ry, H.gy, "L" + lodKey(H.x, H.z)); GTINT = [0.48 * t, 0.42 * t, 0.28 * t]; gbox(L, "lod", 0, hh * 0.45, 0, w * 0.9, hh * 0.9, d); GTINT = [1, 1, 1]; }
// a courtyard by the house: a low mud wall, a bread oven (tannur), storage jars, a hearth, a goat pen
function yard(H, R) { const c = Math.cos(H.ry), s = Math.sin(H.ry), at = (lx, lz) => [H.x + lx * c + lz * s, H.z - lx * s + lz * c], dep = 7 + R() * 4, fx = H.reed ? 0 : H.face, fz = H.reed ? H.face : 0, ox = fx * (H.w / 2 + dep / 2 + 0.2), oz = fz * (H.d / 2 + dep / 2 + 0.2);
  const [yx, yz] = at(ox, oz), yw = H.reed ? H.w + 3 : dep, yd = H.reed ? dep : H.d + 2; if (!rRect(yx, yz, yw, yd, H.ry, 0, true)) return null; rRect(yx, yz, yw, yd, H.ry, 3);
  if (!H.reed) { const F = FR(yx, yz, H.ry, groundH(yx, yz) - 0.1, "H" + lodKey(yx, yz)); GTINT = [H.tint * 0.95, H.tint * 0.9, H.tint * 0.84]; for (const sz of [-1, 1]) { gbox(F, "mud", 0, 0.75, sz * yd / 2, yw, 1.5, 0.35); solid(...gw(F, 0, 0, sz * yd / 2).filter((_, i) => i !== 1), yw, 0.4, H.ry); }
    gbox(F, "mud", fx * yw / 2, 0.75, -yd / 4 - 0.6, 0.35, 1.5, yd / 2 - 1.2); gbox(F, "mud", fx * yw / 2, 0.75, yd / 4 + 0.6, 0.35, 1.5, yd / 2 - 1.2); GTINT = [1, 1, 1]; }
  const [ox2, oz2] = at(ox + (R() - 0.5) * 2, oz + (R() - 0.5) * 2); put("oven", OVEN_G, MAT.clay, ox2, groundH(ox2, oz2) - 0.05, oz2, 1, 1, 1); OVENS.push([ox2, oz2]);
  for (let k = 0; k < 2 + R() * 3; k++) { const [px, pz] = at(ox + (R() - 0.5) * 3, oz + (R() - 0.5) * 3); put("jar", POT_G, MAT.pot, px, groundH(px, pz) - 0.02, pz, 1, 0.8 + R() * 0.5, 1, R() * 6); }
  YARD_SPOTS.push([yx, yz]); return [yx, yz]; }
const OVENS = [], YARD_SPOTS = [];


// ---------- the sacred districts: the Anu terrace with the White Temple, and Eanna, the precinct of Inanna ----------
// The White Temple (Anu district, level E) and the Eanna buildings of level IVa are known from the German excavations (1912-13, 1928-39,
// 1954 on: Jordan, Nöldeke, Heinrich, Lenzen, Eichmann). Plans are from the excavations; heights, roofs and the exact placement of the
// Eanna buildings relative to one another are approximate. Each marker says so.
G_TEX.white = GT(256, 256, (g, w, h) => { g.fillStyle = "#ece8de"; g.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "190,180,160" : "255,255,250"},${0.08 + rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 8, 2 + rnd() * 8); } }, 2);   // gypsum whitewash
G_MAT.white = new THREE.MeshStandardMaterial({ map: G_TEX.white, vertexColors: true, roughness: 0.9 });
const drawCones = (g, w, h) => { g.fillStyle = "#8a7a62"; g.fillRect(0, 0, w, h); const C = ["#f0e8d8", "#242018", "#b84a2c"];   // cone mosaic: the painted heads of clay cones in zigzags and lozenges
  for (let y = 0; y < h; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < w; x += 8) { const zz = Math.abs(((x / 8 + Math.floor(y / 32) * 2) % 8) - 4), band = Math.floor(y / 32) % 3, lz = (Math.abs((x % 64) - 32) + Math.abs((y % 64) - 32)) < 20;
    g.fillStyle = C[lz ? (band + 1) % 3 : (zz + Math.floor(y / 8)) % 4 < 2 ? band : (band + 2) % 3]; g.beginPath(); g.arc(x + 4, y + 4, 3.9, 0, 6.283); g.fill(); } };
G_TEX.cones = GT(256, 256, drawCones, 0.64);   // cone heads about 2 cm across
G_MAT.cones = new THREE.MeshStandardMaterial({ map: G_TEX.cones, vertexColors: true, roughness: 0.8 });
const PILLAR_M = new THREE.MeshStandardMaterial({ map: (() => { const t = tex(256, 256, drawCones); t.repeat.set(12.8, 10.6); return t; })(), roughness: 0.8 });   // for the round columns (their own UVs)
const HALLS = [];   // interiors that dim the daylight: { inside(x, y, z), lp: light position, name }
// a tripartite building: the long central hall (T-shaped when tdepth is set), rows of rooms either side, outer walls set with niches
function tripartite(cx, cz, ry, gy, o) {
  const F = FR(cx, cz, ry, gy, o.key || "sacred"), w = o.w, d = o.d, wh = o.wh, th = o.th || 1.1, W2 = w / 2, D2 = d / 2, hall = o.hall / 2, mat = o.mat || "brick", tint = o.tint || [0.98, 0.95, 0.88];
  const wall = (x0, z0, x1, z1, hgt = wh, butt = false) => { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.2) return; const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, along = Math.abs(x0 - x1) < 0.01; GTINT = tint;
    gbox(F, mat, mx, hgt / 2, mz, along ? th : L, hgt, along ? L : th); const [sx, , sz] = gw(F, mx, 0, mz); solid(sx, sz, along ? th : L, along ? L : th, ry);
    if (butt) { const n = Math.max(1, Math.floor(L / 2.2)), sg = along ? Math.sign(x0) : Math.sign(z0); for (let k = 0; k <= n; k++) { const f = (along ? Math.min(z0, z1) : Math.min(x0, x1)) + k * L / n, oo = sg * (th / 2 + 0.22); gbox(F, mat, along ? mx + oo : f, (hgt + 0.1) / 2, along ? f : mz + oo, along ? 0.44 : 0.8, hgt + 0.1, along ? 0.8 : 0.44); } } };
  const z0 = o.tdepth ? -D2 + o.tdepth : -D2 + th / 2, n = Math.max(2, Math.round((D2 - th / 2 - z0) / o.room)), rz = k => z0 + k * (D2 - th / 2 - z0) / n, door = 1.8;
  let kd = 0; for (let k = 0; k < n; k++) if (rz(k) <= 0 && rz(k + 1) > 0) kd = k; const dz = (rz(kd) + rz(kd + 1)) / 2;   // the side doors open into the room at the middle
  for (const sx of [-1, 1]) { wall(sx * W2, -D2, sx * W2, dz - door / 2, wh, true); wall(sx * W2, dz + door / 2, sx * W2, D2, wh, true); }
  wall(-W2, -D2, -door / 2, -D2, wh, true); wall(door / 2, -D2, W2, -D2, wh, true); wall(-W2, D2, W2, D2, wh, true);   // the end walls, a door into the hall
  for (const sx of [-1, 1]) { const hx = sx * (hall + th / 2);
    for (let k = 0; k < n; k++) { const a = rz(k), b = rz(k + 1), m = (a + b) / 2; wall(hx, a, hx, m - 0.7, wh + 1.4); wall(hx, m + 0.7, hx, b, wh + 1.4); if (k > 0) wall(sx * (hall + th), a, sx * (W2 - th / 2), a, wh); }   // the hall's walls, a doorway into each room; the cross walls
    if (o.tdepth) { const mx2 = (hall + th + W2 - th / 2) / 2; wall(sx * (hall + th), z0, sx * (mx2 - 0.7), z0, wh); wall(sx * (mx2 + 0.7), z0, sx * (W2 - th / 2), z0, wh); } }
  GTINT = tint.map(v => v * 0.88); for (const sx of [-1, 1]) gbox(F, "mud", sx * (hall + th + (W2 - hall - th) / 2), wh + 0.15, (z0 + D2) / 2, W2 - hall - th + 0.2, 0.3, D2 - z0, "");   // roofs: flat over the rooms, the hall higher (a clerestory: inferred)
  gbox(F, "mud", 0, wh + 1.55, (z0 + D2) / 2, 2 * hall + 2 * th, 0.3, D2 - z0, ""); if (o.tdepth) gbox(F, "mud", 0, wh + 1.55, -D2 + o.tdepth / 2, w, 0.3, o.tdepth, "");
  GTINT = tint; gbox(F, mat, 0, 0.5, D2 - th - 1.2, Math.min(2 * hall - 0.8, 3.2), 1.0, 1.8); gbox(F, mat, 0, 1.05, D2 - th - 0.75, Math.min(2 * hall - 1.6, 2.2), 0.5, 0.8);   // the stepped altar at the end of the hall
  const tz = z0 + 3.6; gbox(F, mat, 0, 0.45, tz, 1.4, 0.9, 1.0); GTINT = [1, 1, 1];   // the offering table
  { const [x, , z] = gw(F, 0, 0, D2 - th - 1.2); solid(x, z, Math.min(2 * hall - 0.8, 3.2), 1.8, ry); } { const [x, , z] = gw(F, 0, 0, tz); solid(x, z, 1.4, 1.0, ry); }
  const loc = (x, z) => { const ddx = x - F.x, ddz = z - F.z; return [ddx * F.c - ddz * F.s, ddx * F.s + ddz * F.c]; };
  const inside = (x, y, z) => { const [a, b] = loc(x, z); return Math.abs(a) < W2 && Math.abs(b) < D2 && y > gy - 0.5 && y < gy + wh; };
  HALLS.push({ inside, lp: gw(F, 0, wh - 0.8, (z0 + D2) / 2), name: o.name }); return { F, loc, inside, W2, D2, z0, tz, dz }; }

const TEMPLE = { x: 0, z: 0, ry: Math.PI / 4, pw: 40, pd: 46, ph: 12, w: 17.5, d: 22.3, wh: 6.2 };
// the Anu terrace: a great platform of mud brick built up over older temples, its sides set with niches, a stair up its north-east side
{ const T = TEMPLE, c = Math.cos(T.ry), s = Math.sin(T.ry), toL = (x, z) => [x * c - z * s, x * s + z * c], ZB = baseH(0, 0) - 0.3, top = ZB + T.ph, SL = 44, SW = 7;
  T.base = ZB; T.top = top; rRect(0, 0, T.pw + SL * 2 + 20, T.pd + 30, T.ry, 4);
  SOLID_H.push((x, z) => { const [lx, lz] = toL(x, z); let h = -1e9; if (Math.abs(lx) < T.pw / 2 && Math.abs(lz) < T.pd / 2) h = top;
    if (lx >= T.pw / 2 - 0.5 && lx < T.pw / 2 + SL && Math.abs(lz) < SW / 2) h = Math.max(h, ZB + T.ph * (T.pw / 2 + SL - lx) / SL); return h; });
  const F = FR(0, 0, T.ry, ZB, "anu"); GTINT = [0.9, 0.84, 0.72]; gbox(F, "mud", 0, T.ph / 2, 0, T.pw, T.ph, T.pd, "b");
  for (const sx of [-1, 1]) for (let k = 0; k <= Math.floor(T.pd / 3); k++) gbox(F, "mud", sx * (T.pw / 2 + 0.3), T.ph / 2, -T.pd / 2 + k * T.pd / Math.floor(T.pd / 3), 0.6, T.ph, 1.4, "b");   // niches and buttresses
  for (const sz of [-1, 1]) for (let k = 0; k <= Math.floor(T.pw / 3); k++) gbox(F, "mud", -T.pw / 2 + k * T.pw / Math.floor(T.pw / 3), T.ph / 2, sz * (T.pd / 2 + 0.3), 1.4, T.ph, 0.6, "b");
  for (let k = 0; k < 40; k++) { const f = k / 40, x = T.pw / 2 + SL * (1 - f) - SL / 80, y = T.ph * f; gbox(F, "brick", x, y / 2 + 0.15, 0, SL / 40 + 0.02, y + 0.3, SW, "b"); }   // the stair
  for (const sz of [-1, 1]) for (let k = 0; k < 16; k++) { const f = (k + 0.5) / 16, x = T.pw / 2 + SL * (1 - f), y = T.ph * f + 0.9; gbox(F, "mud", x, y / 2, sz * (SW / 2 + 0.4), SL / 16 + 0.02, y, 0.8, "b"); }
  const W = tripartite(0, 0, T.ry, top, { w: T.w, d: T.d, wh: T.wh, hall: 4.6, room: 4.8, mat: "white", tint: [1, 1, 1], key: "anu", name: "inside the White Temple" });
  T.inHall = (x, z) => W.inside(x, P_.y, z); T.doorZ = W.dz; T.tableZ = W.tz; T.light = new THREE.PointLight(0xffc890, 0, 24, 1.4); scene.add(T.light);
  mark("The White Temple", 0, 0, "known", "On the high terrace of the Anu district, the White Temple: about 17.5 by 22.3 m, its niched walls coated with white gypsum plaster that shone across the plain, its corners pointing to the cardinal directions; a long central hall with a stepped altar and an offering table, and rooms either side. Built perhaps around 3500-3350 BC (the dating is debated), it was an old and holy building by 3200. Which god it served is not known: the district is named for the temple of An, the sky god, built here much later. Plan known; height and roof inferred.", { y: T.ph + 9, r: 20, range: 4000, big: true });
  mark("The Anu terrace", ...(() => { const lx = T.pw / 2 + 2, lz = T.pd / 2; return [lx * c + lz * s, -lx * s + lz * c]; })(), "known", "A platform of mud brick about 12 m high, raised over the remains of earlier temples on the same spot: the forerunner of the ziggurat. Its sides were set with niches and buttresses, and partly coated with bitumen; a stair climbed one side. Size approximate.", { y: 4, r: 14, range: 600 }); }

// Eanna: the precinct of Inanna, about 500 m east, a cluster of huge buildings (level IVa, about 3200 BC)
const EANNA = { x: 520, z: 80, ry: Math.PI / 4 };
{ const E = EANNA, c = Math.cos(E.ry), s = Math.sin(E.ry), IN = (lx, lz) => [E.x + lx * c + lz * s, E.z - lx * s + lz * c], gy = baseH(E.x, E.z) - 0.2, FE = FR(E.x, E.z, E.ry, gy, "eanna"); E.IN = IN; E.gy = gy;
  flatUnder(FE, 280, 240, gy, true); rRect(E.x, E.z, 280, 240, E.ry, 4);
  GTINT = [1, 1, 1]; gpoly(FE, "brick", [[-130, 0.03, -110], [130, 0.03, -110], [130, 0.03, 110], [-130, 0.03, 110]], [[0, 0], [60, 0], [60, 50], [0, 50]], [0, 1, 0]);   // the precinct's paving of mud brick
  const D = tripartite(...IN(10, 15), E.ry, gy, { w: 50, d: 80, wh: 9, hall: 11, room: 7, tdepth: 18, key: "eanna", name: "inside Temple D" });
  const C = tripartite(...IN(-88, -10), E.ry, gy, { w: 22, d: 54, wh: 7, hall: 6.5, room: 5.5, tdepth: 10, key: "eanna", name: "inside Temple C" });
  // Building E: rooms round a square court
  { const F = FR(...IN(88, -62), E.ry, gy, "eanna"), S = 50, R = 9, th = 1.2, wh = 6, wall = (x0, z0, x1, z1, butt) => { const L = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, al = Math.abs(x0 - x1) < 0.01; GTINT = [0.97, 0.93, 0.85];
      gbox(F, "brick", mx, wh / 2, mz, al ? th : L, wh, al ? L : th); const [sx, , sz] = gw(F, mx, 0, mz); solid(sx, sz, al ? th : L, al ? L : th, E.ry);
      if (butt) { const n = Math.floor(L / 2.4), sg = al ? Math.sign(x0) : Math.sign(z0); for (let k = 0; k <= n; k++) { const f = (al ? Math.min(z0, z1) : Math.min(x0, x1)) + k * L / n; gbox(F, "brick", al ? mx + sg * 0.8 : f, wh / 2, al ? f : mz + sg * 0.8, al ? 0.44 : 0.8, wh, al ? 0.8 : 0.44); } } };
    const h = S / 2, ci = h - R; for (const sx of [-1, 1]) wall(sx * h, -h, sx * h, h, true); wall(-h, -h, -1.2, -h, true); wall(1.2, -h, h, -h, true); wall(-h, h, h, h, true);
    for (const sx of [-1, 1]) { wall(sx * ci, -ci, sx * ci, -1.0); wall(sx * ci, 1.0, sx * ci, ci); } wall(-ci, ci, -1.0, ci); wall(1.0, ci, ci, ci); wall(-ci, -ci, -1.2, -ci); wall(1.2, -ci, ci, -ci);
    for (const sx of [-1, 1]) for (const k of [-2, -1, 0, 1, 2]) if (k) wall(sx * ci, k * ci / 2.5, sx * (h - th / 2), k * ci / 2.5); for (const sz of [-1, 1]) for (const k of [-1, 1]) wall(k * ci / 2, sz * ci, k * ci / 2, sz * (h - th / 2));
    GTINT = [0.85, 0.8, 0.72]; for (const sx of [-1, 1]) { gbox(F, "mud", sx * (ci + R / 2), wh + 0.15, 0, R, 0.3, S, ""); gbox(F, "mud", 0, wh + 0.15, sx * (ci + R / 2), 2 * ci, 0.3, R, ""); } GTINT = [1, 1, 1]; }
  // the Great Court: sunk into the precinct, a bench of mud brick all round
  { const [x, z] = IN(88, 18), F = FR(x, z, E.ry, gy - 1.4, "eanna"), S = 48; flatUnder(F, S, S, gy - 1.4, true); GTINT = [0.95, 0.9, 0.82];
    for (const sx of [-1, 1]) { gbox(F, "brick", sx * (S / 2 + 0.4), 0.7, 0, 0.8, 1.4 + 0.6, S + 1.6); gbox(F, "brick", 0, 0.7, sx * (S / 2 + 0.4), S, 1.4 + 0.6, 0.8); gbox(F, "brick", sx * (S / 2 - 0.6), 0.25, 0, 1.2, 0.5, S - 2.4); gbox(F, "brick", 0, 0.25, sx * (S / 2 - 0.6), S - 2.4, 0.5, 1.2); }
    GTINT = [1, 1, 1]; }
  // the Pillar Hall: a terrace fronted by two rows of great columns, columns and wall covered with cone mosaic
  { const [x, z] = IN(-88, 66), F = FR(x, z, E.ry, gy, "eanna"), PH = 1.6; flatUnder(F, 34, 22, gy + PH, true); GTINT = [0.95, 0.9, 0.82]; gbox(F, "brick", 0, PH / 2, 0, 34, PH, 22, "b"); for (let k = 0; k < 8; k++) gbox(F, "brick", 0, (k + 1) * PH / 16, -11 - 2.6 + k * 0.34, 8, (k + 1) * PH / 8, 0.36, "b");
    GTINT = [1, 1, 1]; gbox(F, "cones", 0, PH + 3.4, 9.5, 34, 6.8, 1.6); for (let k = -6; k <= 6; k++) if (k % 2 === 0) { const [cx, , cz] = gw(F, k * 2.6, 0, 8.6); put("pillar", CYL_G, PILLAR_M, cx, gy + PH, cz, 1.6, 6.8, 1.6); }   // the back wall with half-columns
    for (const r of [-4, 2]) for (const k of [-1.5, -0.5, 0.5, 1.5]) { const [cx, , cz] = gw(F, k * 7, 0, r); put("pillar", CYL_G, PILLAR_M, cx, gy + PH, cz, 2.6, 6.8, 2.6); solid(cx, cz, 2.4, 2.4, E.ry); } }
  // Inanna's ring-posts at the door of Temple D: bundles of reeds bent into a loop at the top, with streamers
  { const reed = M(0xc8b070), band = M(0x6a4a2a); for (const lx of [7.4, 12.6]) { const [px, pz] = IN(lx, -26.4), G = new THREE.Group(); G.position.set(px, gy, pz); G.rotation.y = E.ry;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 4.6, 10).translate(0, 2.3, 0), reed), loop = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 6, 14), reed); loop.position.set(0, 5.0, 0); G.add(post, loop);
      for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - k * 0.012, 0.2 - k * 0.012, 0.08, 10), band); b.position.y = 0.8 + k * 1.0; G.add(b); }
      for (let k = 0; k < 3; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.01).translate(0, -0.7, 0), reed); st.position.set(0.28 + k * 0.06, 4.75, 0); st.rotation.z = 0.15 + k * 0.08; G.add(st); } scene.add(G); }
    mark("Inanna's ring-posts", ...IN(10, -27), "known", "Bundles of reeds bent into a loop at the top, with streamers: the symbol of Inanna. They stand beside her shrine on the Uruk Vase and on seals, and the same shape is the sign for her name in the earliest writing. Placed here at Temple D by inference.", { y: 5.6, r: 4, range: 120 }); }
  // the Cone-Mosaic Court behind the Pillar Hall: walls and half-columns all covered with mosaic (level IVb)
  { const F = FR(...IN(-88, 91), E.ry, gy, "eanna"), W = 34, D = 26, H = 4.6, th = 1.0, wl = (cx, cz, sx, sz) => { gbox(F, "cones", cx, H / 2, cz, sx, H, sz); const [x, , z] = gw(F, cx, 0, cz); solid(x, z, sx, sz, E.ry); };
    GTINT = [1, 1, 1]; wl(-W / 2, 0, th, D); wl(W / 2, -D / 4 - 1.5, th, D / 2 - 3); wl(W / 2, D / 4 + 1.5, th, D / 2 - 3); wl(0, D / 2, W, th);   // a gateway in the east wall; the Pillar Hall's back wall closes the south
    for (let k = -5; k <= 5; k++) { for (const sz of [1]) { const [cx, , cz] = gw(F, k * 2.9, 0, sz * (D / 2 - 0.5)); put("pillar", CYL_G, PILLAR_M, cx, gy, cz, 1.3, H, 1.3); } }
    for (let k = -3; k <= 3; k++) { const [cx, , cz] = gw(F, -W / 2 + 0.5, 0, k * 3.2); put("pillar", CYL_G, PILLAR_M, cx, gy, cz, 1.3, H, 1.3); }
    mark("The Cone-Mosaic Court", ...IN(-88, 91), "known", "A court whose walls and half-columns were covered all over with cone mosaic: tens of thousands of clay cones, their heads dipped in black, red or white, pressed into the wet plaster to make zigzags, lozenges and triangles, like woven matting. Level IVb, a little before 3200 BC; the size and placement here are approximate.", { y: 6, r: 14, range: 400 }); }
  mark("Eanna", ...IN(-40, -100), "known", "The precinct of Inanna, goddess of love and war (Eanna, 'house of heaven'). In the Late Uruk period, level IVa of the excavations, about 3200 BC, it held a cluster of huge buildings unlike anything built before: halls up to 80 m long, courts, colonnades. What they were for is debated: temples, assembly halls, the seat of a ruler, storehouses. The plans are from the excavations; how the buildings stood relative to one another is approximate here.", { y: 14, r: 120, range: 4000, big: true });
  mark("Temple D", ...IN(10, 15), "known", "The largest building of Eanna IVa, about 80 by 50 m: a cross-shaped central hall with rows of rooms either side, its outer walls set all round with niches. Plan from the excavations; height and roof inferred.", { y: 13, r: 30, range: 900 });
  mark("Temple C", ...IN(-88, -10), "known", "About 54 by 22 m: a T-shaped central hall with rooms either side, entered from both long sides and the end. Plan from the excavations; height and roof inferred.", { y: 11, r: 20, range: 700 });
  mark("Building E", ...IN(88, -62), "known", "A square building about 50 m a side, rooms ranged round a central court: perhaps the seat of a ruler, or offices. Its use is not known. Plan from the excavations, simplified.", { y: 10, r: 20, range: 700 });
  mark("The Great Court", ...IN(88, 18), "known", "A court about 50 m square, sunk into the ground and surrounded by a bench of mud brick; clay pipes inside the bench may have watered a garden. Its use is unknown.", { y: 3, r: 20, range: 500 });
  mark("The Pillar Hall", ...IN(-88, 66), "known", "A terrace fronted by two rows of columns 2.6 m across, with half-columns along the back wall, all covered with mosaic: thousands of clay cones pressed into the plaster, their heads painted black, red and white in zigzags, lozenges and chevrons. From level IVb, a little before 3200 BC; whether it still stood by then is uncertain.", { y: 9, r: 14, range: 600 });
  mark("Where the first writing was found", ...IN(60, -110), "known", "Almost 5,000 of the earliest written tablets come from Eanna, most from rubbish fills of levels IVa and III, about 3300-3000 BC: accounts of barley, beer, sheep and goats, textiles and workers, and lists of words copied out by trainee scribes. The signs are pictures and numbers drawn and pressed into clay: proto-cuneiform.", { y: 3, r: 6, range: 300 }); }
// the light and the halls: whichever hall you are in
TEMPLE.hallAt = (x, y, z) => HALLS.find(H => H.inside(x, y, z)) || null;

// ---------- the city ----------
// Uruk at its height covered about 250 hectares, perhaps 25,000-50,000 people. Its plan outside the sacred districts is barely known;
// houses of the period are known best from the Uruk colonies on the Euphrates in Syria (Habuba Kabira, Jebel Aruda): mud-brick houses
// with a long central hall and rooms either side, opening onto a walled forecourt, on plots of a few hundred square metres, along streets.
// Here: avenues out from the centre, the canals through the city with their quays, blocks of houses, denser near the sacred districts and
// with gardens and open ground toward the edge. Near the centre the houses are built in full; further out more simply (the same size and
// shape). All typical.
const LANES = [], LATE_SQ = [];
{ const R = seeded(3200), c = Math.SQRT1_2, s = c, IN = (u, v) => [CITY.x + u * c + v * s, CITY.z - u * s + v * c], HR = Math.PI / 4 - Math.PI / 2, CORE = 320;
  for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.2, P = []; for (let r = 40; r <= CITY.r + 80; r += 60) { const aa = a + 0.08 * Math.sin(r / 140 + k); P.push([CITY.x + Math.cos(aa) * r, CITY.z + Math.sin(aa) * r * 0.9]); } const L = line(P); LANES.push(L); rLine(L, 6, 1); }   // the avenues
  for (const C of CANALS.slice(0, 2)) rLine(C, 18, 1);   // the canals through the city, with their quays
  const edge = (x, z) => CITY.r * (0.92 + 0.16 * (fbm(x / 400 + 4, z / 400, 2) - 0.5) * 2), fill = r => r < 420 ? 0.97 : r < 650 ? 0.8 : 0.55;
  const lane = (u0, v0, u1, v1) => { const [ax, az] = IN(u0, v0), [bx, bz] = IN(u1, v1); if (Math.hypot((ax + bx) / 2 - CITY.x, (az + bz) / 2 - CITY.z) > 650) return; const L = line([[ax, az], [bx, bz]]); LANES.push(L); rLine(L, 2.6, 1); };
  const ok = (x, z, w, d) => [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]].every(([a, b]) => groundH(x + a * w * 0.35, z + b * d * 0.35) > 0.8);
  const block = (u, v, bw, bd) => { const rows = bd >= 26 ? 2 : 1;
    for (let r = 0; r < rows; r++) { const dep = bd / rows, cv = v + dep * (r + 0.5), face = rows === 2 ? (r === 0 ? -1 : 1) : (R() < 0.5 ? -1 : 1); let lu = u;
      while (lu < u + bw - 8) { let lw = 10 + R() * 6; if (u + bw - (lu + lw) < 9) lw = u + bw - lu; const [x, z] = IN(lu + lw / 2, cv); lu += lw; const rc = Math.hypot(x - CITY.x, z - CITY.z), core = rc < CORE;
        if (!ok(x, z, dep, lw) || !rRect(x, z, dep - 1.6, lw - 1.6, HR, 0, true)) continue; if (R() < (core ? 0.04 : 0.1)) { rRect(x, z, dep, lw, HR, 3); YARD_SPOTS.push([x, z]); continue; }   // now and then a yard or garden
        const hb = Math.max(8, dep * 0.62), fd = dep - hb - 0.2, cH = Math.cos(HR), sH = Math.sin(HR), hx = x - face * (fd / 2) * cH, hz = z + face * (fd / 2) * sH;   // the house at the back of its plot, its forecourt in front
        rRect(x + face * (hb / 2) * cH, z - face * (hb / 2) * sH, fd, lw, HR, 3); addHouse(hx, hz, hb - 0.2, lw - 0.2, HR, { court: false, face, plain: !core, fore: fd > 2.5 ? fd : 0, wh: 3.0 + R() * 0.6 }); } } };
  const gap = () => R() < 0.2 ? 6 : 3 + R() * 1.5;
  for (let u = -CITY.r; u < CITY.r; ) { const bw = 30 + R() * 16; for (let v = -CITY.r; v < CITY.r; ) { const bd = 24 + R() * 16, [x, z] = IN(u + bw / 2, v + bd / 2), rc = Math.hypot(x - CITY.x, z - CITY.z);
      if (rc < edge(x, z) && R() < fill(rc)) block(u, v, bw, bd); const g = gap(); lane(u, v + bd + g / 2, u + bw, v + bd + g / 2); v += bd + g; }
    const g = gap(); lane(u + bw + g / 2, -CITY.r, u + bw + g / 2, CITY.r); u += bw + g; }
  // reed huts and byres along the river outside the city, as on the Uruk trough
  for (let k = 0, n = 0; k < 4000 && n < (IS_HEADSET ? 40 : 80); k++) { const [x0, z0, a] = RIVER.at(R() * RIVER.L), sd = R() < 0.5 ? -1 : 1, off = RIVER_HW + 25 + R() * 120, x = x0 + Math.cos(a) * sd * off, z = z0 - Math.sin(a) * sd * off;
    const rc = Math.hypot(x - CITY.x, z - CITY.z); if (rc < CITY.r + 60 || rc > 4200 || groundH(x, z) < 0.5) continue; const ry = R() * 6.28, w = 3.8 + R() * 1.6, d = 7 + R() * 6; if (!rRect(x, z, w + 2.5, d + 2.5, ry, 0, true)) continue; addHouse(x, z, w, d, ry, { reed: true }); n++; } }
mark("The city", ...[CITY.x + 180, CITY.z + 260], "inferred", "Uruk at its height covered about 250 hectares, with perhaps 25,000-50,000 people: the largest city in the world. Its plan outside the sacred districts is barely known. The houses follow those of the Uruk colonies on the Euphrates in Syria: mud-brick houses with a long central hall and rooms either side, opening onto a walled forecourt with a gateway to the street. Here they are packed in blocks along streets near the centre, with more gardens and open ground toward the edge.", { y: 12, r: 200, range: 4000, big: true });
mark("Canals through the city", ...CANALS[0].at(CANALS[0].L * 0.32).slice(0, 2), "known", "Magnetic survey of Uruk has traced canals and waterways running through the city, with what look like quays and harbours: boats brought grain, reeds, fish, timber and stone right into the city. Their exact courses here are generated.", { y: 4, r: 12, range: 800 });
// the brick yard by the canal, where mud is mixed with chaff, moulded and laid out in rows to dry
const BRICKYARD = { x: -620, z: -1150 }; { rRect(BRICKYARD.x, BRICKYARD.z, 60, 30, Math.PI / 4, 11); const R = seeded(77);
  for (let k = 0; k < 6; k++) { const c = Math.cos(Math.PI / 4), s = Math.sin(Math.PI / 4), lx = -20 + k * 7, x = BRICKYARD.x + lx * c + 8 * s, z = BRICKYARD.z - lx * s + 8 * c; for (let q = 0; q < 6; q++) putG("brickstack", BOX_G, MAT.mud, x + q * 0.6 * s, 0, z + q * 0.6 * c, 0.9, 0.5 + 0.1 * (q % 3), 0.45, Math.PI / 4); } }
// threshing floors at the field edges: hard, round, swept
const THRESH = []; { const R = seeded(12); for (const C of CANALS.slice(2)) for (let k = 0; k < 3; k++) { const [x, z, a] = C.at(C.L * (0.25 + k * 0.25)), ox = x + Math.cos(a) * 60, oz = z - Math.sin(a) * 60; if (groundH(ox, oz) > 0.5 && rRect(ox, oz, 18, 18, 0, 0, true)) { rRect(ox, oz, 16, 16, 0, 12); THRESH.push([ox, oz]); } } }


// ---------- fields, palms, reeds and hamlets: the country round the town (procedurally generated) ----------
// Fields lay along the river and canals, where the water could be led onto them: long strips running back from the banks, sown with
// barley (the main crop; it stands salt better than wheat), some emmer and flax, and lying fallow in turns. Barley was reaped with
// sickles of fired clay (still common in the Uruk period) or of flint blades set in bitumen. Date palms grew along the banks, and the
// tablets record orchards, gardens, sheep and goats in great flocks, cattle and pigs. The details here are generated.
const CROPS_P = [[1, 0.42], [2, 0.2], [3, 0.1], [4, 0.1], [6, 0.03], [5, 0.15]];
{ const R = seeded(5000); for (const C of [RIVER, ...CANALS]) { const step = 22, hw = C === RIVER ? RIVER_HW + 14 : 9;
    for (let s = 20; s < C.L - 20; s += step + R() * 6) { const [x, z, a] = C.at(s); if (Math.hypot(x, z) > 4900) continue; for (const sg of [-1, 1]) {
      const len = 110 + R() * 160, nx = Math.cos(a) * sg, nz = -Math.sin(a) * sg, cx = x + nx * (hw + len / 2), cz = z + nz * (hw + len / 2);
      if (desertness(cx, cz) > 0.25 || marshMask(cx, cz) > 0.08 || groundH(cx, cz) < 0.4 || Math.hypot(cx - CITY.x, cz - CITY.z) < CITY.r + 80) continue;
      let r = R(), crop = 5; for (const [cid, p] of CROPS_P) { if (r < p) { crop = cid; break; } r -= p; }
      if (rRect(cx, cz, step - 2, len, a, 0, true)) rRect(cx, cz, step - 2, len, a, 5, false, crop); } } } }
// date palms: along the banks, in groves, round the town; tamarisk scrub on the desert edge
const PTRUNK_G = new THREE.CylinderGeometry(0.17, 0.24, 1, 7).translate(0, 0.5, 0);
const PCROWN_G = (() => { const p = []; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, droop = 0.25 + (k % 3) * 0.3; p.push([new THREE.BoxGeometry(0.38, 0.02, 3.4).translate(0, 0, 1.7), new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeRotationX(droop - 0.2 * (k % 2)))]); }
  for (let k = 0; k < 6; k++) p.push([new THREE.BoxGeometry(0.3, 0.02, 2.2).translate(0, 0, 1.1), new THREE.Matrix4().makeRotationY(k + 0.5).multiply(new THREE.Matrix4().makeRotationX(-0.9))]); return mergeG(p); })();
const frondM = M(0x52683a, { roughness: 0.9, side: THREE.DoubleSide }), tamM = new THREE.MeshStandardMaterial({ color: 0x6a7a52, roughness: 1, flatShading: true }), TAM_G = new THREE.IcosahedronGeometry(1, 0);
const palm = (x, z, s) => { const h = groundH(x, z), R = seeded((x * 13 + z * 7) | 0), H = (7 + R() * 6) * s, lean = (R() - 0.5) * 0.12; put("ptrunk", PTRUNK_G, MAT.palm, x, h - 0.2, z, s, H, s, R() * 6, lean); put("pcrown", PCROWN_G, frondM, x + Math.sin(lean) * H * 0, h + H - 0.2, z, s, s, s, R() * 6); };
{ const R = seeded(71); let n = 0, cap = IS_HEADSET ? 2600 : 4200;
  for (let k = 0; k < 300000 && n < cap; k++) { const x = RX0 + R() * RW * RC, z = RZ0 + R() * RH * RC, h = groundH(x, z); if (h < 0.5) continue; const r = rGet(x, z); if (r === 1 || r === 2 || r === 4 || r === 10 || r === 11 || r === 12) continue;
    const bank = nearWater(x, z, 16) && !nearWater(x, z, 3) ? 0.6 : 0, grove = r === 9 ? 0.8 : 0, town = Math.hypot(x, z) < 480 && (r === 3 || r === 8 || r === 0) ? 0.05 : 0, ds = desertness(x, z);
    if (ds > 0.5) { if (R() < 0.02) { put("tamarisk", TAM_G, tamM, x, h + 0.6, z, 1.4 + R(), 1 + R() * 0.6, 1.4 + R(), R() * 6); n++; } continue; }
    if (R() < (bank + grove + town) * 0.25) { palm(x, z, 0.8 + R() * 0.45); n++; } } }
// palm groves: stretches along the canals near the town, planted thick
{ const R = seeded(73); for (const C of (LATE ? CANALS.slice(0, 3).concat(CANALS.slice(6)) : CANALS.slice(0, 3))) for (let s = 40; s < C.L * 0.8; s += LATE ? 110 : 160) { const [x, z, a] = C.at(s); for (const sg of [-1, 1]) { const cx = x + Math.cos(a) * sg * 30, cz = z - Math.sin(a) * sg * 30; if (marshMask(cx, cz) > 0.05 || !rRect(cx, cz, 40, 60, a, 0, true)) continue; rRect(cx, cz, 40, 60, a, 9);
      for (let q = 0; q < 26; q++) { const lx = (R() - 0.5) * 36, lz = (R() - 0.5) * 56; palm(cx + lx * Math.cos(a) + lz * Math.sin(a), cz - lx * Math.sin(a) + lz * Math.cos(a), 0.85 + R() * 0.4); } } } }
// the hamlets: small settlements on the channels' levees, a few houses and reed huts each; and fishing camps on reed islands in the marsh
const HAMLETS = []; { const R = seeded(6000); const spots = [[RIVER, 0.18], [RIVER, 0.32], [CANALS[0], 0.75], [CANALS[3], 0.55], [CANALS[2], 0.85], [RIVER, 0.62]];
  for (const [C, f] of spots) { const [x0, z0, a] = C.at(C.L * f), sg = R() < 0.5 ? 1 : -1, hx = x0 + Math.cos(a) * sg * 90, hz = z0 - Math.sin(a) * sg * 90; if (Math.hypot(hx, hz) > 4800 || Math.hypot(hx - CITY.x, hz - CITY.z) < CITY.r + 200) continue; HAMLETS.push([hx, hz]);
    for (let k = 0, n = 0; k < 120 && n < 8 + R() * 8; k++) { const x = hx + (R() - 0.5) * 120, z = hz + (R() - 0.5) * 120, reed = R() < 0.4, ry = a + (R() - 0.5) * 0.6, w = reed ? 4 + R() : 7 + R() * 3, d = reed ? 7 + R() * 4 : 9 + R() * 4;
      if (groundH(x, z) < 0.6 || !rRect(x, z, w + 3, d + 3, ry, 0, true)) continue; const H = addHouse(x, z, w, d, ry, { reed }); yard(H, R); n++; for (let q = 0; q < 3; q++) palm(x + (R() - 0.5) * 30, z + (R() - 0.5) * 30, 0.9 + R() * 0.3); }
    mark("A hamlet", hx, hz, "typical", "A farming hamlet on a levee: a few families, mud-brick houses and reed huts, fields along the channel, a palm grove, sheep, goats and cattle. Round Uruk at its height the plain was thick with villages and small towns, a few kilometres apart, linked by canals. Generated.", { y: 6, r: 60, range: 2500 }); }
  for (let k = 0, n = 0; k < 3000 && n < 7; k++) { const a = R() * 6.283, r = 2400 + R() * 2400, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x, z) > 4800) continue; const mm = marshMask(x, z), h = groundH(x, z); if (mm < 0.3 || h < 0.55) continue;   // reed-hut hamlets on the islands
    for (let q = 0; q < 3; q++) { const ux = x + (R() - 0.5) * 30, uz = z + (R() - 0.5) * 30; if (groundH(ux, uz) < 0.15) continue; addHouse(ux, uz, 4 + R(), 7 + R() * 3, R() * 6, { reed: true }); }
    mark("A fishing camp", x, z, "typical", "Reed huts on a reed island in the marsh: fishermen and fowlers, who lived on the water as the Marsh Arabs did until the 1990s. Fish were a staple: the tablets count them by the thousand, dried and fresh. Generated.", { y: 5, r: 40, range: 2000 }); n++; } }
// reed boats on the shores: bundles of reeds lashed into a hull with high curved ends, many coated with bitumen against the water
function reedBoatGeo() { const NU = 14, NV = 6, pos = [], idx = []; for (let i = 0; i <= NU; i++) { const u = i / NU, z = u - 0.5, e = Math.abs(2 * u - 1), tp = Math.max(0.06, 1 - e ** 2.4), rise = 0.9 * e ** 3.5;
    for (let j = 0; j <= NV; j++) { const v = j / NV, a = Math.PI * v; pos.push(Math.cos(a) * 0.5 * tp, 0.5 - Math.sin(a) * 0.5 * Math.max(0.3, Math.sqrt(tp)) + rise, z); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const RBOAT_G = reedBoatGeo(), boatBitM = M(0x221c16, { roughness: 0.45, side: THREE.DoubleSide }), boatReedM = M(0xb09a64, { side: THREE.DoubleSide });
{ const R = seeded(808); let n = 0; for (let k = 0; k < 4000 && n < 40; k++) { const a = R() * 6.283, r = 300 + R() * 2500, x = Math.cos(a) * r, z = Math.sin(a) * r, h = groundH(x, z); if (h < -0.2 || h > 0.15) continue; if (marshMask(x, z) < 0.05 && !nearWater(x, z, 6)) continue;
    put(R() < 0.6 ? "rboatb" : "rboatr", RBOAT_G, R() < 0.6 ? boatBitM : boatReedM, x, WATER - 0.25, z, 1.1, 0.7, 6 + R() * 4, R() * 6); n++; } }
// tall reeds round you in the marsh and along the water: Phragmites, three or four metres high
const REED_N = IS_HEADSET ? 2200 : 4000, REEDS = new THREE.InstancedMesh((() => { const parts = [0, Math.PI / 3, Math.PI * 2 / 3].map(a => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY(a).toNonIndexed()), out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) out.setAttribute(k, new THREE.Float32BufferAttribute(parts.flatMap(g => [...g.attributes[k].array]), k === "uv" ? 2 : 3)); return out; })(),
  new THREE.MeshStandardMaterial({ map: tex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 90; k++) { const x = rnd() * w, tx = x + (rnd() - 0.5) * 24, ty = rnd() * 60; g.strokeStyle = ["#7a8a48", "#8a9a52", "#a8a064", "#6a7a3a"][(rnd() * 4) | 0]; g.lineWidth = 1.2 + rnd() * 0.8; g.beginPath(); g.moveTo(x, h); g.lineTo(tx, ty + 20); g.stroke();   // stems about a finger thick
      g.fillStyle = ["#c8b890", "#b8a47a", "#d0c09a"][(rnd() * 3) | 0]; g.beginPath(); g.ellipse(tx, ty + 14, 4, 16, (rnd() - 0.5) * 0.4, 0, 6.283); g.fill(); if (k % 2 === 0) { g.strokeStyle = "#6a8a3a"; g.lineWidth = 1.4; g.beginPath(); const y = 120 + rnd() * 300, xm = x + (tx - x) * (1 - y / h); g.moveTo(xm, y); g.lineTo(xm + (rnd() < 0.5 ? -26 : 26), y - 46); g.stroke(); } } }), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }), REED_N);
REEDS.frustumCulled = false; REEDS.count = 0; scene.add(REEDS); let reedAt = [1e9, 1e9];
// scatter plants on a fixed jittered grid in the world, nearest first: the same spot always holds the same plant, so nothing jumps as you walk
function stableScatter(IM, cap, sp, radius, accept, place) { const offs = IM.userData.offs || (IM.userData.offs = (() => { const o = [], n = Math.ceil(radius / sp); for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) if (Math.hypot(i, j) * sp <= radius) o.push([i, j]); return o.sort((a, b) => Math.hypot(...a) - Math.hypot(...b)); })());
  const ci = Math.round(P_.x / sp), cj = Math.round(P_.z / sp); let n = 0;
  for (const [di, dj] of offs) { if (n >= cap) break; const i = ci + di, j = cj + dj, x = (i + hash(i, j * 7 + 1) - 0.5) * sp, z = (j + hash(i * 3 + 5, j) - 0.5) * sp; if (!accept(x, z, i, j)) continue;
    place(x, z, hash(i * 11, j * 13), hash(i * 17 + 3, j * 19 + 7)); IM.setMatrixAt(n++, O3.matrix); }
  IM.count = n; IM.instanceMatrix.needsUpdate = true; }
function reedStep() { if (Math.hypot(P_.x - reedAt[0], P_.z - reedAt[1]) < 6) return; reedAt = [P_.x, P_.z];
  stableScatter(REEDS, REED_N, 1.6, 85, (x, z) => { const h = groundH(x, z); if (h < -0.7 || h > 0.9 || rGet(x, z) === 2) return false; const mm = marshMask(x, z); return mm > 0.1 || nearWater(x, z, 5); },
    (x, z, r1, r2) => { const s = 0.8 + r1 * 0.5; O3.position.set(x, Math.max(groundH(x, z), WATER - 0.6) - 0.05, z); O3.rotation.set(0, r2 * 3, 0); O3.scale.set(s * 1.3, s * (2.6 + r2 * 1.4), s * 1.3); O3.updateMatrix(); }); }
// standing barley (and emmer) round you in the fields, ripe for the sickle
const CROPV_N = IS_HEADSET ? 2600 : 4500, CROPV = new THREE.InstancedMesh(REEDS.geometry, new THREE.MeshStandardMaterial({ map: tex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 60; k++) { const x = rnd() * w, top = 10 + rnd() * 30; g.strokeStyle = ["#c8a850", "#d8b860", "#b89848", "#a88a40"][(rnd() * 4) | 0]; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (rnd() - 0.5) * 8, top); g.stroke(); g.fillStyle = "#e0c060"; g.beginPath(); g.ellipse(x + (rnd() - 0.5) * 8, top, 3, 9, 0.2, 0, 6.283); g.fill(); } }), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }), CROPV_N);
CROPV.frustumCulled = false; CROPV.count = 0; scene.add(CROPV); let cropAt = [1e9, 1e9];
function cropStep() { if (Math.hypot(P_.x - cropAt[0], P_.z - cropAt[1]) < 5) return; cropAt = [P_.x, P_.z];
  stableScatter(CROPV, CROPV_N, 1.05, 58, (x, z) => { const kk = rIdx(x, z); return kk >= 0 && RAS[kk] === 5 && (CROP[kk] === 1 || CROP[kk] === 4); },
    (x, z, r1, r2) => { const s = 0.8 + r1 * 0.3; O3.position.set(x, groundH(x, z) - 0.03, z); O3.rotation.set(0, r2 * 3, 0); O3.scale.set(s * 0.9, s * (0.85 + r2 * 0.2), s * 0.9); O3.updateMatrix(); }); }
mark("The marsh", 2700, 2000, "inferred", "The marshes south-east of the city: reed beds, pools and channels, low islands with reed huts. They gave Uruk reeds for building, mats, baskets, boats and fuel, fish and birds in great numbers, and pasture; the tablets record fishermen and reed-cutters working for the institutions. Where their edge lay in 3200 BC is not known. ", { y: 5, r: 300, range: 5000, big: true });
mark("The river", ...RIVER.at(RIVER.L * 0.42).slice(0, 2), "inferred", "A branch of the Euphrates, flowing above the plain between its own levees, as rivers in Mesopotamia do: the high ground along its banks was the best land. Canals led water off it to the fields. Its course here is generated: the river's channels then are not known.", { y: 5, r: 80, range: 3000, big: true });
mark("The desert edge", -2600, 2200, "inferred", "To the west and south-west the alluvium gives way to the sand and gravel of the desert, the edge of the Arabian plateau: grazing for sheep and goats after the rains, and the way to the shell, stone and bitumen of other lands.", { y: 4, r: 300, range: 4000, big: true });
{ const [ux, uz] = LL(30.9626, 46.1031); const d = Math.hypot(ux, uz), k = 4600 / d; mark(`Toward Ur (${Math.round(d / 1000)} km)`, ux * k, uz * k, "known", `Ur lay ${Math.round(d / 1000)} km to the south-east, a town of the same culture; Eridu beyond it, its old temple rebuilt again and again. Up and down the plain were other Uruk-period towns: Larsa, Umma, Nippur, Kish.`, { y: 4, r: 60, range: 5000, big: true }); }


// ---------- carried and held things ----------
const PROP_G = { jar: mergeG([[new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.17, 0.12], [0.16, 0.24], [0.08, 0.32], [0.09, 0.36], [0, 0.36]].map(([r, y]) => new THREE.Vector2(r, y)), 10), MT(0, 1.76, 0)]]),   // a water jar on the head
  basket: mergeG([[new THREE.CylinderGeometry(0.26, 0.2, 0.22, 10, 1, true), MT(0, 1.88, 0)], [new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), MT(0, 1.78, 0)]]),
  sheaf: mergeG([[new THREE.CylinderGeometry(0.16, 0.1, 1.1, 8), MT(0.12, 1.5, -0.05, 1, 1, 1, 1.2, 0.2)], [new THREE.SphereGeometry(0.18, 7, 5), MT(0.12, 1.55, 0.45, 1, 0.7, 1.6)]]),
  sickle: mergeG([[new THREE.TorusGeometry(0.12, 0.018, 4, 10, Math.PI * 1.1), MT(-0.2, 0.75, 0.32, 1, 1, 1, 0.4, 0)]]),   // a sickle of fired clay
  reeds: mergeG([[new THREE.CylinderGeometry(0.14, 0.14, 3.2, 8), MT(0.14, 1.58, -0.1, 1, 1, 1, Math.PI / 2 - 0.15, 0)]]),   // a bundle of reeds on the shoulder
  fish: mergeG([[new THREE.ConeGeometry(0.06, 0.34, 5).rotateZ(Math.PI / 2), MT(-0.22, 0.6, 0.12)], [new THREE.ConeGeometry(0.06, 0.3, 5).rotateZ(Math.PI / 2), MT(-0.24, 0.5, 0.1)], [new THREE.CylinderGeometry(0.004, 0.004, 0.3, 3), MT(-0.22, 0.75, 0.12)]]),
  pole: mergeG([[new THREE.CylinderGeometry(0.025, 0.025, 4.2, 5), MT(0.2, 1.3, 0.35, 1, 1, 1, 0.3, 0)]]), net: mergeG([[new THREE.SphereGeometry(0.3, 6, 4), MT(0, 1.2, 0.35, 1.2, 0.6, 0.8)]]),
  mud: mergeG([[new THREE.CylinderGeometry(0.24, 0.18, 0.16, 9), MT(0, 1.85, 0)]]), staff: mergeG([[new THREE.CylinderGeometry(0.02, 0.02, 1.6, 5), MT(-0.2, 0.9, 0.15)]]) };
const NC = IS_HEADSET ? 420 : 680;
const PROP_COL = { jar: 0xd8c4a0, basket: 0xa88c5a, sheaf: 0xd8b860, sickle: 0xb88a5a, reeds: 0xb8a070, fish: 0x9aa0a8, pole: 0x6a5238, net: 0x8a7a5a, mud: 0x8a6a4a, staff: 0x6a5238 };
const PROPS = {}; for (const k in PROP_G) { const im = new THREE.InstancedMesh(PROP_G[k], M(PROP_COL[k], { vertexColors: true }), NC); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; scene.add(im); PROPS[k] = { im, slot: new Int32Array(NC).fill(-1), who: new Int32Array(NC), n: 0 }; }
const _pm = new THREE.Matrix4();
function propSet(A, y) { const P = PROPS[A.prop]; if (!P) return; if (P.slot[A.i] < 0) { P.slot[A.i] = P.n; P.who[P.n] = A.i; P.n++; P.im.count = P.n; }
  const s = A.L.s; O3.position.set(A.x, y - (A.L.shaven && !A.L.bun ? 0.09 * s : 0), A.z); O3.rotation.set(0, A.h, 0); O3.scale.set(s, s, s); O3.updateMatrix(); P.im.setMatrixAt(P.slot[A.i], O3.matrix); P.im.instanceMatrix.needsUpdate = true; }
function propHide(A) { const P = PROPS[A.prop]; if (!P) return; const s = P.slot[A.i]; if (s < 0) return; const last = --P.n, j = P.who[last];
  if (s !== last) { P.im.getMatrixAt(last, _pm); P.im.setMatrixAt(s, _pm); P.slot[j] = s; P.who[s] = j; } P.slot[A.i] = -1; P.im.count = P.n; P.im.instanceMatrix.needsUpdate = true; }
// animals
const COW_G = mergeG([[new THREE.CapsuleGeometry(0.36, 0.9, 4, 10).rotateX(Math.PI / 2), MT(0, 0.95, 0, 0.92, 1, 1)], [new THREE.CylinderGeometry(0.15, 0.21, 0.45, 8).rotateX(-1.0), MT(0, 1.02, 0.7)], [new THREE.CapsuleGeometry(0.14, 0.24, 3, 8).rotateX(Math.PI / 2 + 0.5), MT(0, 0.9, 0.97)],
  ...[[0.19, 0.48], [-0.19, 0.48], [0.19, -0.48], [-0.19, -0.48]].map(([x, z]) => [new THREE.CylinderGeometry(0.09, 0.07, 0.68, 7), MT(x, 0.34, z)]), [new THREE.ConeGeometry(0.03, 0.28, 4), MT(0.13, 1.1, 0.98, 1, 1, 1, 0, -1.1)], [new THREE.ConeGeometry(0.03, 0.28, 4), MT(-0.13, 1.1, 0.98, 1, 1, 1, 0, 1.1)]]);
const SHEEP_G = mergeG([[new THREE.SphereGeometry(0.3, 8, 6), MT(0, 0.5, 0, 0.8, 0.75, 1.25)], [new THREE.SphereGeometry(0.11, 6, 4), MT(0, 0.6, 0.42, 0.8, 1, 1.3)], ...[[0.12, 0.22], [-0.12, 0.22], [0.12, -0.22], [-0.12, -0.22]].map(([x, z]) => [new THREE.CylinderGeometry(0.03, 0.025, 0.32, 5), MT(x, 0.16, z)]),
  [new THREE.TorusGeometry(0.05, 0.018, 4, 8, Math.PI * 1.4), MT(0.08, 0.66, 0.36)], [new THREE.TorusGeometry(0.05, 0.018, 4, 8, Math.PI * 1.4), MT(-0.08, 0.66, 0.36)]]);
const DONKEY_G = mergeG([[new THREE.CapsuleGeometry(0.24, 0.7, 4, 10).rotateX(Math.PI / 2), MT(0, 0.9, 0)], [new THREE.CylinderGeometry(0.1, 0.16, 0.55, 8).rotateX(-0.8), MT(0, 1.12, 0.5)], [new THREE.CapsuleGeometry(0.09, 0.32, 3, 8).rotateX(Math.PI / 2 + 0.9), MT(0, 1.25, 0.74)],
  ...[[0.13, 0.38], [-0.13, 0.38], [0.13, -0.38], [-0.13, -0.38]].map(([x, z]) => [new THREE.CylinderGeometry(0.06, 0.045, 0.75, 7), MT(x, 0.37, z)]), [new THREE.ConeGeometry(0.04, 0.3, 4), MT(0.06, 1.5, 0.72)], [new THREE.ConeGeometry(0.04, 0.3, 4), MT(-0.06, 1.5, 0.72)]]);   // donkeys (or donkey-onager crosses) drew carts by now
const PIG_G = mergeG([[new THREE.SphereGeometry(0.3, 8, 6), MT(0, 0.5, 0, 0.75, 0.75, 1.5)], [new THREE.SphereGeometry(0.15, 6, 4), MT(0, 0.55, 0.48, 1, 0.9, 1.2)], ...[[0.13, 0.3], [-0.13, 0.3], [0.13, -0.3], [-0.13, -0.3]].map(([x, z]) => [new THREE.CylinderGeometry(0.04, 0.035, 0.32, 5), MT(x, 0.16, z)])]);

// ---------- work at hand: the crafts and techniques of the Uruk period ----------
const TECH_ANIM = [], TECH_JOBS = [];
const techJob = (role, F, steps, ph = 0) => TECH_JOBS.push({ role, ph, steps: steps.map(([u, v, fu, fv, k, d, c, wc]) => { const [x, , z] = gw(F, u, 0, v), [fx, , fz] = gw(F, fu, 0, fv), st = { p: [x, z], f: [fx, fz], k, d, c: c || null }; if (wc !== undefined) st.wc = wc; return st; }) });
const techLabel = (F, u, v, y, name, text) => { const [x, , z] = gw(F, u, 0, v); mark(name, x, z, "known", text, { y, range: 30, r: 2.5 }); };
const site = (x, z, w, d) => { for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.45) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (groundH(X, Z) > 0.6 && rRect(X, Z, w + 4, d + 4, Math.PI / 4, 0, true)) { rRect(X, Z, w + 4, d + 4, Math.PI / 4, 3); return FR(X, Z, Math.PI / 4, groundH(X, Z), "tech"); } } return FR(x, z, Math.PI / 4, groundH(x, z), "tech"); };
const SMOKERS = [];
// the potters: the slow wheel, painting, drying, the two-chamber kiln
if (!LATE) { const F = site(1250, -380, 16, 12), gy = F.gy; const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 16), MAT.clay), [wx, , wz] = gw(F, -3, 0, 0); wheel.position.set(wx, gy + 0.38, wz); scene.add(wheel); TECH_ANIM.push((t, dt) => wheel.rotation.y += dt * 2.2);
  put("tk:pivot", CYL_G, MAT.clay, ...gw(F, -3, 0, 0), 0.12, 0.35, 0.12); const pot = new THREE.Mesh(BOWL_G.clone().rotateX(Math.PI), MAT.pot); pot.position.set(wx, gy + 0.44, wz); pot.scale.setScalar(0.9); scene.add(pot); TECH_ANIM.push((t, dt) => pot.rotation.y += dt * 2.2);
  for (let k = 0; k < 36; k++) put("tk:drypot", k % 6 ? BOWL_G : POT_G, MAT.fired, ...gw(F, 1 + (k % 9) * 0.45, 0, -3 + Math.floor(k / 9) * 0.5), k % 6 ? 0.45 : 0.7, k % 6 ? 0.5 : 0.7, k % 6 ? 0.45 : 0.7, k);   // bevelled-rim bowls drying in rows, and a few jars
  put("tk:mat", BOX_G, MAT.reedmat, ...gw(F, 2.8, 0, -2.2), 4.5, 0.02, 2.8);
  // the kiln: a firebox below, a perforated floor, the pots stacked in the domed chamber above
  const [kx, , kz] = gw(F, 4, 0, 3.5); put("tk:kilnbase", CYL_G, MAT.mud, kx, gy, kz, 2.6, 0.9, 2.6); put("tk:kilndome", new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), MAT.mud, kx, gy + 0.9, kz, 1.3, 1.1, 1.3);
  put("tk:firemouth", BOX_G, MAT.dark, ...gw(F, 4, 0, 2.15), 0.6, 0.5, 0.1); const fire = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.12), new THREE.MeshStandardMaterial({ color: 0xff7a20, emissive: 0xff5a10, emissiveIntensity: 1.3 })), [fx, , fz] = gw(F, 4, 0, 2.08); fire.position.set(fx, gy + 0.22, fz); scene.add(fire); TECH_ANIM.push(t => fire.material.emissiveIntensity = 1 + 0.5 * Math.abs(Math.sin(t * 3)));
  SMOKERS.push([kx, gy + 2.0, kz, 2.5]); for (let k = 0; k < 5; k++) put("tk:fuel", BOX_G, MAT.reed, ...gw(F, 5.6, 0, 1.5 + k * 0.3), 0.8, 0.25, 0.25);
  techJob("man", F, [[-3, 0.65, -3, 0, "sit", 30]]); techJob("woman", F, [[1.8, -1.2, 1.8, -2.2, "sitground", 22], [2.5, -1.2, 2.5, -2.2, "sitground", 18]], 4);
  techJob("man", F, [[4, 1.6, 4, 2.15, "kneel", 10], [5.6, 1.0, 5.6, 1.5, "sell", 4, null, "reeds"], [4, 1.6, 4, 2.15, "kneel", 8]], 9);
  techLabel(F, -3, 0, 1.0, "The fast wheel", "The potter's wheel proper came in during the Uruk period: a heavy wheel spun fast enough to draw a pot up from a lump of clay. Jars, bottles and spouted vessels were thrown or finished on it, plain and quick.");
  techLabel(F, 2, -2.5, 1.0, "Bevelled-rim bowls", "Coarse, thick bowls pressed by hand into moulds, made by the thousand: the commonest find of the Uruk period, up to three-quarters of all the pottery at some sites, from Iran to Syria. Most likely for rations of grain or bread: many hold about two-thirds of a litre, a day's ration. The painted wares of earlier times are gone.");
  techLabel(F, 4, 3.5, 2.6, "The kiln", "A two-chamber updraft kiln: the fire (of reeds, brush, dung) in a pit below, its heat rising through a perforated clay floor into the domed chamber where the pots stand, reaching 900-1,000°C. Such kilns are known from sites of the period.");
  mark("The potters", F.x, F.z, "typical", "A potters' yard at the edge of the town, by the kilns (for the smoke and the risk of fire). Pottery was mass-produced now by specialists: plain wheel-made jars and mould-made bowls by the thousand.", { y: 4, r: 12, range: 400 }); }
// brick-making by the canal: mud trodden with chaff, moulded, dried in the sun (the same in both periods)
{ const F = FR(BRICKYARD.x, BRICKYARD.z, Math.PI / 4, groundH(BRICKYARD.x, BRICKYARD.z), "tech"), gy = F.gy; put("tk:mudpit", CYL_G, M(0x6a5038), ...gw(F, -10, 0, -6), 5, 0.12, 5); put("tk:chaff", CYL_G, MAT.reed, ...gw(F, -14, 0, -9), 1.6, 0.7, 1.6);
  for (let k = 0; k < 4; k++) put("tk:mould", BOX_G, MAT.wood, ...gw(F, -4 + k * 0.6, 0, -6), 0.3, 0.1, 0.55);
  techJob("man", F, [[-10, -6, -10, -5, "walk", 14], [-9, -7, -9, -6, "walk", 12]]); techJob("man", F, [[-4.5, -5.2, -4.5, -6, "kneel", 9, null, "mud"], [-9.5, -4, -10, -6, "kneel", 4]], 3); techJob("child", F, [[-14, -8.2, -14, -9, "kneel", 6], [-10.5, -8, -10, -6, "sell", 4, null, "basket"]], 6);
  techLabel(F, -10, -6, 1.0, "The mixing pit", "Clay-rich mud from the canal bank, trodden with chopped straw or chaff to stop the bricks cracking as they dry."); techLabel(F, -4, -6, 0.8, "Brick moulds", "Wooden frames: the mud is pressed in, the mould lifted off, and the brick left to dry in the sun for a week or two. Ubaid bricks were long and flat; the temple used thousands.");
  mark("The brick yard", F.x, F.z, "typical", "Sun-dried mud brick was the building material of Mesopotamia: houses, walls, terraces, the great halls of Eanna, where small square bricks (Riemchen) and even limestone and gypsum were also used. Rows of bricks drying by the canal.", { y: 4, r: 18, range: 400 }); }
// the harvest: reaping barley with clay sickles; sheaves; threshing by trampling cattle; winnowing
{ let best = null; for (let k = 0; k < 4000; k++) { const R = seeded(k), x = (R() - 0.5) * 2400, z = (R() - 0.5) * 2400, kk = rIdx(x, z); if (kk >= 0 && RAS[kk] === 5 && CROP[kk] === 1 && Math.hypot(x, z) < 1200) { best = [x, z]; break; } }
  if (best) { const F = FR(best[0], best[1], Math.PI / 4, groundH(...best), "tech"); for (let k = 0; k < 10; k++) put("tk:sheaf", new THREE.CylinderGeometry(0.16, 0.1, 1, 8).translate(0, 0.5, 0), M(0xd8b860), ...gw(F, -4 + (k % 5) * 1.2, 0, 3 + Math.floor(k / 5) * 1.0), 1, 0.7, 1, k, 0.45 + 0.2 * (k % 3));
      for (let k = 0; k < 5; k++) techJob(k % 2 ? "woman" : (LATE ? "worker" : "man"), F, [[-5 + k * 1.6, -2 - k * 0.3, -5 + k * 1.6, -6, "reap", 14, "sickle"], [-5 + k * 1.6, -3.5 - k * 0.3, -5 + k * 1.6, -6, "reap", 12, "sickle"]], k * 3);
      techJob("child", F, [[-2, 1.5, -4, 3, "kneel", 8], [-3, 3.5, -4, 3, "sell", 3, null, "sheaf"]], 2);
      if (LATE) techLabel(F, -3, -3, 1.2, "Copper sickles", "Sickles of copper or bronze now, or of flint blades set in bitumen: the clay sickles of the Ubaid have gone. The fields belong to the temple, the crown or families; harvest gangs are counted and fed by the scribes."); else techLabel(F, -3, -3, 1.2, "Clay sickles", "Sickles of fired clay, their edges sharp enough to cut straw: still among the commonest finds of the Uruk period in southern Mesopotamia, where there is no stone. Flint blades set in bitumen were also used.");
      techLabel(F, -2, 3.5, 1.4, "Sheaves", "The barley is cut near the ear, tied in sheaves and carried to the threshing floor. Barley, which stands the salty soil better than wheat, was the staple: for bread, porridge and beer.");
      mark("The barley harvest", F.x, F.z, "typical", "Spring is harvest time in southern Mesopotamia: the barley sown in autumn, watered from the canals through the winter, is ripe by April or May.", { y: 4, r: 15, range: 500 }); } }
if (THRESH.length) { const [tx, tz] = THRESH[0], F = FR(tx, tz, 0, groundH(tx, tz), "tech"); put("tk:straw", CYL_G, M(0xd8c070), tx, groundH(tx, tz), tz, 9, 0.18, 9); put("tk:grain", new THREE.ConeGeometry(1, 1, 10).translate(0, 0.5, 0), M(0xc8a860), ...gw(F, 6, 0, 6), 1.4, 0.8, 1.4);
  THRESH.oxen = [0, 1, 2].map(k => k * 2.1); techJob("man", F, [[0, 0, 3, 0, "stand", 40, "staff"]]); techJob("woman", F, [[6.6, 5.2, 7, 4, "net", 9, "basket"], [6.2, 6.6, 7, 8, "net", 9, "basket"]], 4);
  techLabel(F, 0, 0, 1.4, "The threshing floor", "A circle of hard, swept ground: cattle are driven round and round over the spread sheaves, their hooves knocking the grain from the ears."); techLabel(F, 6, 6, 1.6, "Winnowing", "Tossing the threshed grain into the wind from baskets or wooden forks: the chaff blows away and the grain falls. The chaff is kept, for brick-making and fodder."); }
// boat-building and fishing on the water's edge nearest the town
const SHORE = (() => { for (let k = 0; k < 4000; k++) { const R = seeded(k + 9000), a = Math.atan2(LAGOON.z, LAGOON.x) + (R() - 0.5) * 1.6, r = 380 + R() * 900, x = Math.cos(a) * r, z = Math.sin(a) * r; if (groundH(x, z) > 0.25 && groundH(x, z) < 0.8 && rRect(x, z, 22, 16, 0, 0, true)) return [x, z, a]; } return [500, 400, 0.7]; })();
{ const [sx, sz, a] = SHORE, F = FR(sx, sz, a + Math.PI / 2, groundH(sx, sz), "tech"), gy = F.gy; rRect(sx, sz, 20, 14, a, 3);
  put("tk:bboat", RBOAT_G, boatReedM, ...gw(F, 0, 0.4, 0), 1.3, 0.8, 7.5); for (let k = 0; k < 6; k++) put("tk:bundle", CYL_G, MAT.reed, ...gw(F, -3, 0, -3 + k * 1.1), 0.28, 0.28, 4.5, 0, Math.PI / 2);
  put("tk:bitpot", POT_G, MAT.bitumen, ...gw(F, 3, 0, 1), 0.9, 0.7, 0.9); const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })), [fx, , fz] = gw(F, 3, 0, 1); fire.position.set(fx, gy + 0.2, fz); scene.add(fire); TECH_ANIM.push(t => fire.scale.y = 0.8 + 0.4 * Math.sin(t * 11)); SMOKERS.push([fx, gy + 1.2, fz, 1]);
  techJob("man", F, [[-1.2, -1.5, 0, -1.5, "hammer", 12], [-1.2, 1.5, 0, 1.5, "hammer", 10]]); techJob("man", F, [[2.4, 1.6, 3, 1, "kneel", 8], [1.2, 0.5, 0, 0.5, "sell", 10]], 5); techJob("fisher", F, [[-3.6, -2, -3, -2, "kneel", 10, null, "reeds"], [-3.6, 2, -3, 2, "kneel", 10]], 8);
  techLabel(F, 0, 0, 1.8, "A reed boat", "Bundles of reeds bound tight with cord into a hull with high, curving ends: the boats of the marshes for thousands of years. Boats with high prows appear on cylinder seals of the period, and the proto-cuneiform tablets have a sign for one; reed boats and wooden ones carried the city's goods.");
  techLabel(F, 3, 1, 1.3, "Bitumen", "Natural asphalt from seeps in the region, heated and mixed with sand, straw or mineral grit, smeared over the boat to make it watertight. It was also used to haft tools, set inlays, and waterproof baskets and floors.");
  // fishermen at the water: a net cast from the bank, fish drying, nets mended with clay sinkers
  for (let k = 0; k < 4; k++) put("tk:rack", BOX_G, MAT.wood, ...gw(F, 6 + k * 0.9, 0, -4), 0.06, 1.6, 0.06); put("tk:rackbar", BOX_G, MAT.wood, ...gw(F, 7.4, 1.5, -4), 3, 0.06, 0.06); for (let k = 0; k < 10; k++) put("tk:dryfish", new THREE.ConeGeometry(0.06, 0.34, 5), MAT.fish, ...gw(F, 6.2 + k * 0.28, 1.25, -4), 1, 1, 1, 0, Math.PI);
  techJob("fisher", F, [[0, -6, 0, -12, "net", 18, "net"]], 0); techJob("fisher", F, [[7, -2, 7, -3, "sitground", 30]], 3);
  techLabel(F, 7, -4, 1.8, "Drying fish", "Fish split and hung to dry in the sun: carp, catfish, perch from the fresh water, and fish from the sea. The Uruk tablets list dried fish by kind and number."); techLabel(F, 7, -2, 0.9, "Net sinkers", "Nets of plant fibre weighted with sinkers of baked clay, pierced or grooved for the cord: a common find."); }
// spinning, weaving, grinding and baking in a courtyard near the temple
if (!LATE) { const yd = YARD_SPOTS.slice().sort((a, b) => Math.hypot(...a) - Math.hypot(...b))[3] || [60, 40], F = FR(yd[0], yd[1], Math.PI / 4, groundH(...yd), "tech");
  for (const [a, b] of [[-1.2, -1], [1.2, -1], [-1.2, 1.4], [1.2, 1.4]]) put("tk:peg", BOX_G, MAT.wood, ...gw(F, a, 0, b), 0.06, 0.25, 0.06); put("tk:warp", BOX_G, M(0xe0d6c0), ...gw(F, 0, 0.12, 0.2), 2.3, 0.01, 2.3); put("tk:beam", BOX_G, MAT.wood, ...gw(F, 0, 0.12, -1), 2.6, 0.06, 0.06);
  put("tk:quern", BOX_G, M(0x8a8478), ...gw(F, -2.6, 0, 2.6), 0.5, 0.18, 0.75); put("tk:flour", BOWL_G, MAT.pot, ...gw(F, -2.6, 0, 3.2), 1, 1, 1);
  techJob("woman", F, [[0, -1.6, 0, 0, "kneel", 40]]); techJob("woman", F, [[2.4, 1.2, 0, 0, "spin", 40]], 6); techJob("woman", F, [[-2.6, 2.1, -2.6, 2.7, "knead", 30]], 11);
  techLabel(F, 0, 0.2, 0.6, "The ground loom", "A horizontal loom pegged out on the ground, the warp stretched between two beams: wool from the flocks and linen from flax were woven so. By now most cloth was wool: the tablets count sheep and goats by the thousand, and textiles of many grades.");
  techLabel(F, 2.4, 1.2, 1.6, "Spinning", "Spinning thread with a drop spindle, a stick with a whorl of baked clay or stone as a flywheel; the fibre held on a distaff or wound round the wrist.");
  techLabel(F, -2.6, 2.6, 0.8, "The saddle quern", "Grain ground into flour by rubbing a hand stone back and forth on a larger one: hours of work every day, mostly women's. The flour is baked into flat loaves on the hot inner wall of the tannur oven."); }

// ---------- life in Uruk about 3200 BC: the city's own work (more to come: the scribes and their tablets, the rations, the procession) ----------
const LATE_AG = []; let TAB_MAT = null; const WRITE = { on: false }; function writeStep() {}


// ---------- inside the houses ----------
// Built when you go in, from what houses of the period held (Habuba Kabira, Jebel Aruda, and earlier tripartite houses): the long central hall with a round
// clay hearth, a mud bench along a wall, reed mats on a floor of beaten earth, storage jars and bins, a saddle quern, baskets, painted
// bowls, a spindle; side rooms opening off it for sleeping and storage; overhead, palm-trunk beams carrying reeds and mud. In a reed
// hut, the arches overhead, mats, a hearth, bedding, the fishing gear.
let INSIDE = null;
const _uvScale = (g, sx, sy) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy); return g; };
const IMAT = { plaster: new THREE.MeshStandardMaterial({ map: G_TEX.mud, roughness: 1 }), earth: new THREE.MeshStandardMaterial({ map: tex(256, 256, speckle("#8a7458", 3000, ["#9a8466", "#7a644a", "#a08a6a"], 3, 3)), roughness: 1 }),
  mat: new THREE.MeshStandardMaterial({ map: G_TEX.reedmat, roughness: 1, side: THREE.DoubleSide }), reed: new THREE.MeshStandardMaterial({ map: G_TEX.reed, roughness: 1, side: THREE.DoubleSide }), palm: new THREE.MeshStandardMaterial({ map: G_TEX.palm, roughness: 1 }),
  clay: M(0xb08a62), pot: M(0xd8c8a4), paint: M(0x3a2a20), wool: M(0xd8ccb0), stone: M(0x8a8478), basket: M(0xa88c5a), barley: M(0xd8b860), dark: M(0x1a120c, { roughness: 1 }), glow: new THREE.MeshBasicMaterial({ color: 0xe8e0cc }),
  fire: new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }) };
const houseLight = new THREE.PointLight(0xffa860, 0, 12, 1.4); scene.add(houseLight);
function iBox(G, mat, F, lx, ly, lz, sx, sy, sz, ry = 0, geo) { const m = new THREE.Mesh(geo || new THREE.BoxGeometry(1, 1, 1), mat); const [x, y, z] = gw(F, lx, ly, lz); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = Math.atan2(F.s, F.c) + ry; G.add(m); return m; }
function iPlane(G, mat, F, lx, ly, lz, w, h, ry) { const m = new THREE.Mesh(_uvScale(new THREE.PlaneGeometry(1, 1), w / 1.5, h / 1.5), mat); const [x, y, z] = gw(F, lx, ly, lz); m.position.set(x, y, z); m.scale.set(w, h, 1); m.rotation.y = Math.atan2(F.s, F.c) + ry; G.add(m); return m; }
const ITEM_TXT = {
  hearth: "The hearth: a round basin of baked clay in the middle of the hall, for warmth on winter nights, light, and cooking in pots; bread is baked outside in the tannur.",
  jars: "Storage jars: barley, dates, lentils, oil, dried fish, kept in big jars and in bins of mud brick against damp and mice.",
  bench: "A bench of mud brick along the wall, plastered: for sitting, sleeping, setting things on.",
  quern: "A saddle quern: grain is ground by rubbing a hand stone back and forth on the large stone, kneeling. Hours of work each day.",
  mats: "Reed mats on the floor of beaten earth: for sitting, eating and sleeping. Impressions of matting are found on house floors of the period.",
  bowls: "Plain bowls and cups, many of them the mass-produced bevelled-rim bowls of the time: the household's everyday dishes, and the measure of a ration.",
  spindle: "A spindle with a whorl of baked clay, and a basket of wool: spinning filled women's spare moments.",
  basket: "A basket of barley, the household's staple, from the harvest.",
  roof: "The roof: palm-trunk beams across the walls, reeds and matting laid over them, and a thick layer of mud on top, reached by a stair. On hot nights people slept on the roof.",
  nets: "Fishing nets and a fish spear: for the household of a fisherman, the marsh was the field.",
  tablets: "A basket of clay tablets: the family's documents (a house bought, a loan of barley or silver and its interest, a marriage contract, an adoption), each sealed by the parties and witnesses. Ordinary people used writing too, through scribes.",
  seal: "The householder's cylinder seal on its cord, of stone: rolled on documents to sign them.",
  chapel: "A household altar: a small bench with offerings and a clay figurine of the family's protective god. In houses of the time at Ur, family members were buried under the floor of the chapel room.",
  upper: "Above, an upper storey: rooms over these, reached by the ladder or a stair, with a wooden gallery round the court. Some houses of the time at Ur had one; most were single-storey.",
  court: "The open court in the middle of the house, open to the sky: light and air for the rooms, which open off it. Houses of about this time excavated at Ur and Nippur are built round a court like this; bigger ones had an upper storey with a wooden gallery.",
  drain: "A drain in the middle of the court, of baked brick and clay pipe rings, to take away rain and washing water. Courtyard drains like this were found in the houses at Ur.",
  ladder: "A ladder of palm wood up to the roof (better houses had a stair of brick): the roof is used for drying dates and grain, and on hot nights the household sleeps up there.",
  kitchen: "The kitchen: cooking pots on a low clay hearth, the smoke going out through the door; bread is baked in a tannur oven in the court.",
  dishes: "Everyday pots, bowls and cups: plain, wheel-made by the thousand in standard sizes. The painted pottery of the Ubaid is two thousand years gone.",
  stores: "A storeroom of the temple: jars of oil and dates, sacks of barley and wool, each lot with a clay label, sealed. The doors themselves were sealed with clay over a peg, and the sealings broken and replaced each time the store was opened.",
  arches: "Inside the hut: the arches of bundled reeds, bent over and tied, carrying the mats. The same way of building is used in the marshes today." };
function enterBuilding(B) { const G = new THREE.Group(), F = B.F, w = B.w, d = B.d, wh = B.wh; scene.add(G);
  const marks = [], solids = [], folk = [], itm = (key, lx, lz, y = 1.4) => { const [x, , z] = gw(F, lx, 0, lz); marks.push(mark(key[0].toUpperCase() + key.slice(1), x, z, "typical", ITEM_TXT[key], { y: y + (F.gy - groundH(x, z)), range: 12, r: 1.8 })); }, block = (lx, lz, sx, sz) => solids.push([lx, lz, sx / 2 + 0.2, sz / 2 + 0.2]);
  iBox(G, IMAT.earth, F, 0, 0.03, 0, w, 0.04, d);
  if (B.court) {   // a courtyard house: rooms round an open court, each with a doorway onto it
    const Hw = w + 1, Hd = d + 1, rg = Math.min(3.2, Hw * 0.3, Hd * 0.3), ch = wh > 4.5 ? 2.9 : wh, cw = Hw - 2 * rg, cd = Hd - 2 * rg, fs = B.face, wall = (cx, cz, sx, sz) => solids.push([cx, cz, sx / 2, sz / 2]), ex = (w / 2 - cw / 2) / 2 + cw / 2, ez = (d / 2 - cd / 2) / 2 + cd / 2;
    for (const sx of [-1, 1]) iBox(G, IMAT.plaster, F, sx * (w / 2 - 0.05), ch / 2, 0, 0.1, ch, d); for (const sz of [-1, 1]) iBox(G, IMAT.plaster, F, 0, ch / 2, sz * (d / 2 - 0.05), w, ch, 0.1);
    for (const sx of [-1, 1]) { const L = (cd + 0.35) / 2 - 0.6, c = ((cd + 0.35) / 2 + 0.6) / 2; for (const q of [-1, 1]) wall(sx * cw / 2, q * c, 0.35, L); } for (const sz of [-1, 1]) { const L = (cw - 0.35) / 2 - 0.6, c = ((cw - 0.35) / 2 + 0.6) / 2; for (const q of [-1, 1]) wall(q * c, sz * cd / 2, L, 0.35); }   // the court's walls (drawn with the house)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const L = d / 2 - cd / 2; iBox(G, IMAT.plaster, F, sx * cw / 2, ch / 2, sz * (cd / 2 + L / 2), 0.3, ch, L); wall(sx * cw / 2, sz * (cd / 2 + L / 2), 0.3, L); }   // cross walls closing the corners
    for (const sx of [-1, 1]) { iBox(G, IMAT.mat, F, sx * ex, ch + 0.02, 0, w / 2 - cw / 2, 0.04, d); for (let k = 0; k < Math.floor(d / 0.9); k++) iBox(G, IMAT.palm, F, sx * ex, ch - 0.1, -d / 2 + 0.45 + k * 0.9, w / 2 - cw / 2, 0.2, 0.2); }
    for (const sz of [-1, 1]) { iBox(G, IMAT.mat, F, 0, ch + 0.02, sz * ez, cw, 0.04, d / 2 - cd / 2); for (let k = 0; k < Math.floor(cw / 0.9); k++) iBox(G, IMAT.palm, F, -cw / 2 + 0.45 + k * 0.9, ch - 0.1, sz * ez, 0.2, 0.2, d / 2 - cd / 2); }
    iPlane(G, IMAT.glow, F, fs * (w / 2 - 0.11), 0.95, 0, 1.0, 1.9, fs > 0 ? -Math.PI / 2 : Math.PI / 2);   // the street door's light
    iBox(G, IMAT.clay, F, 0, 0.06, 0, 0.5, 0.06, 0.5, 0, new THREE.CylinderGeometry(0.5, 0.5, 1, 12)); iBox(G, M(0x1a1410), F, 0, 0.08, 0, 0.3, 0.02, 0.3, 0, new THREE.CylinderGeometry(0.5, 0.5, 1, 12)); itm("drain", 0, 0, 0.6); itm("court", fs * cw * 0.25, cd * 0.25, 2.4);
    { const lx = -fs * (cw / 2 - 0.3), lz = cd * 0.3; for (const q of [-1, 1]) iBox(G, IMAT.palm, F, lx, wh / 2 + 0.3, lz + q * 0.25, 0.08, wh + 0.6, 0.08, 0.0); for (let k = 0; k < 9; k++) iBox(G, IMAT.palm, F, lx, 0.35 + k * (wh / 9), lz, 0.06, 0.06, 0.55); itm("ladder", lx, lz, 2.2); }
    if (B.kind === "store") {   // the temple's storerooms: jars and sacks in rows
      for (const sx of [-1, 1]) for (let k = 0; k < Math.floor((d - 2) / 0.9); k++) { const z = -d / 2 + 1 + k * 0.9; if (sx === fs && Math.abs(z) < 1.4) continue; iBox(G, IMAT.pot, F, sx * (w / 2 - 0.6), 0, z, 1.0, 1.1 + (k % 3) * 0.15, 1.0, k, POT_G); }
      for (const sz of [-1, 1]) for (let k = 0; k < Math.floor((cw - 0.6) / 0.8); k++) iBox(G, IMAT.basket, F, -cw / 2 + 0.6 + k * 0.8, 0.35, sz * (d / 2 - 0.6), 0.65, 0.7, 0.65, k, new THREE.CylinderGeometry(0.45, 0.5, 1, 9));
      for (const sx of [-1, 1]) block(sx * (w / 2 - 0.6), 0, 1.0, d); for (const sz of [-1, 1]) block(0, sz * (d / 2 - 0.6), cw, 0.8); itm("stores", -fs * ex, d * 0.25, 1.6); itm("tablets", -fs * ex, -d * 0.2, 1.1);
      iBox(G, IMAT.basket, F, -fs * ex, 0.25, -d * 0.2, 0.45, 0.32, 0.45, 0, new THREE.CylinderGeometry(0.5, 0.42, 1, 10)); folk.push([fs * cw * 0.2, -cd * 0.2, 0.6, "talk", "official"], [-fs * cw * 0.1, cd * 0.2, 2.4, "talk", "man"]); }
    else {
      const rx = -fs * ex; iBox(G, IMAT.mat, F, rx, 0.06, 0, w / 2 - cw / 2 - 0.6, 0.02, Math.min(4, d - 2)); itm("mats", rx, 0.6, 0.6);   // the reception room, opposite the door
      iBox(G, IMAT.basket, F, rx, 0.2, -1.6, 0.45, 0.32, 0.45, 0, new THREE.CylinderGeometry(0.5, 0.42, 1, 10)); for (let k = 0; k < 6; k++) iBox(G, M(0xb89870), F, rx - 0.08 + (k % 3) * 0.08, 0.38, -1.64 + Math.floor(k / 3) * 0.08, 0.07, 0.025, 0.1); itm("tablets", rx, -1.6, 1.1);
      iBox(G, M(0x3a4a5a), F, rx + 0.4, 0.1, -1.2, 0.03, 0.05, 0.03, 0, new THREE.CylinderGeometry(0.5, 0.5, 1, 8)); itm("seal", rx + 0.4, -1.1, 0.7);
      const kz = ez; iBox(G, IMAT.clay, F, -cw * 0.25, 0.08, kz, 0.9, 0.14, 0.9, 0, new THREE.CylinderGeometry(0.5, 0.55, 1, 14)); const fire = iBox(G, IMAT.fire, F, -cw * 0.25, 0.2, kz, 0.35, 0.35, 0.35, 0, new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0)); fire.userData.fire = true; block(-cw * 0.25, kz, 0.9, 0.9); itm("kitchen", -cw * 0.25, kz, 1.0);   // the kitchen
      iBox(G, IMAT.stone, F, cw * 0.25, 0.09, kz, 0.45, 0.18, 0.7); itm("quern", cw * 0.25, kz, 0.8); for (let k = 0; k < 3; k++) iBox(G, IMAT.pot, F, -cw / 2 + 0.5, 0, kz + (k - 1) * 0.6, 0.8, 1.0, 0.8, k, POT_G); block(-cw / 2 + 0.5, kz, 0.8, 1.8); itm("jars", -cw / 2 + 0.6, kz, 1.4);
      for (let k = 0; k < 4; k++) iBox(G, k % 2 ? IMAT.pot : IMAT.clay, F, cw * 0.1 + (k - 1.5) * 0.3, 0.06, kz + 0.7, 0.5, 0.5, 0.5, 0, BOWL_G.clone().rotateX(Math.PI)); itm("dishes", cw * 0.1, kz + 0.7, 0.8);
      const cz = -ez; iBox(G, IMAT.plaster, F, -fs * (cw / 2 - 0.5), 0.4, cz, 0.6, 0.8, 1.2); iBox(G, IMAT.clay, F, -fs * (cw / 2 - 0.5), 0.95, cz, 0.12, 0.3, 0.1); block(-fs * (cw / 2 - 0.5), cz, 0.6, 1.2); itm("chapel", -fs * (cw / 2 - 0.5), cz, 1.4);   // the chapel room, and sleeping mats
      iBox(G, IMAT.mat, F, fs * cw * 0.1, 0.06, cz, cw * 0.5, 0.02, d / 2 - cd / 2 - 0.6); itm(wh > 4.5 ? "upper" : "roof", fs * cw * 0.1, cz, ch - 0.3);
      const h = SIM / 3600, meal = (h > 11.5 && h < 13) || (h > 18.5 && h < 20); folk.push([cw * 0.25, kz - 0.6, 0, "knead", "woman"]);
      if (meal) folk.push([0.9, 0.8, -2.3, "sitground", "man"], [-0.9, 0.7, 2.3, "sitground", "child"], [0.1, -0.9, 0, "sitground", "elder"], [-0.2, 1.2, Math.PI, "sitground", "woman"]);
      else folk.push([-cw * 0.2, -cd * 0.2, 0.8, "spin", "woman"], [rx + 0.5 * fs, -0.9, -fs * Math.PI / 2, "sitground", B.kind === "scribes" ? "scribe" : "man"], [cw * 0.15, cd * 0.15, 1.2, "sitground", "child"]); } }
  else if (!B.reed) {   // a mud-brick house: plastered walls, beams, the hall and its side rooms
    for (const sx of [-1, 1]) iBox(G, IMAT.plaster, F, sx * (w / 2 - 0.05), wh / 2, 0, 0.1, wh, d); for (const sz of [-1, 1]) iBox(G, IMAT.plaster, F, 0, wh / 2, sz * (d / 2 - 0.05), w, wh, 0.1);
    iBox(G, IMAT.mat, F, 0, wh + 0.02, 0, w, 0.04, d); for (let k = 0; k < Math.floor(d / 0.9); k++) iBox(G, IMAT.palm, F, 0, wh - 0.1, -d / 2 + 0.45 + k * 0.9, w, 0.2, 0.2);
    const hw = w * 0.22; for (const sx of [-1, 1]) for (const [a, b] of [[-d / 2, -d * 0.3], [-d * 0.2, -0.75], [0.75, d / 2]]) { const L = b - a; iBox(G, IMAT.plaster, F, sx * hw, wh / 2, (a + b) / 2, 0.25, wh, L); block(sx * hw, (a + b) / 2, 0.25, L); }   // the hall's walls, with doorways to the side rooms
    for (const sx of [-1, 1]) for (const z of [-d * 0.17, d * 0.17]) iPlane(G, IMAT.glow, F, sx * (w / 2 - 0.11), wh - 0.6, z, 0.24, 0.32, sx > 0 ? -Math.PI / 2 : Math.PI / 2);   // the small high windows
    iPlane(G, IMAT.glow, F, B.face * (w / 2 - 0.11), 0.95, 0, 1.0, 1.9, B.face > 0 ? -Math.PI / 2 : Math.PI / 2);   // the doorway's light
    const hearth = iBox(G, IMAT.clay, F, 0, 0.08, d * 0.22, 1.0, 0.14, 1.0, 0, new THREE.CylinderGeometry(0.5, 0.55, 1, 14)), fire = iBox(G, IMAT.fire, F, 0, 0.2, d * 0.22, 0.4, 0.4, 0.4, 0, new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0)); fire.userData.fire = true; block(0, d * 0.22, 1.0, 1.0); itm("hearth", 0, d * 0.22, 1.0);
    iBox(G, IMAT.plaster, F, -hw + 0.4, 0.22, -d * 0.3, 0.6, 0.44, d * 0.3); block(-hw + 0.4, -d * 0.3, 0.6, d * 0.3); itm("bench", -hw + 0.4, -d * 0.3, 0.9);
    for (let k = 0; k < 4; k++) iBox(G, IMAT.pot, F, hw + 0.55 + (k % 2) * 0.7, 0, d * 0.32 + Math.floor(k / 2) * 0.75, 1.1, 1.2 + (k % 2) * 0.2, 1.1, k, POT_G); block(hw + 0.9, d * 0.36, 1.6, 1.6); itm("jars", hw + 1, d * 0.36, 1.6);   // storage jars in a side room
    iBox(G, IMAT.mat, F, 0, 0.06, -d * 0.25, hw * 1.6, 0.02, 2.2); itm("mats", 0.3, -d * 0.25, 0.6); iBox(G, IMAT.stone, F, hw * 0.5, 0.09, d * 0.3, 0.45, 0.18, 0.7); itm("quern", hw * 0.5, d * 0.3, 0.8);
    for (let k = 0; k < 4; k++) iBox(G, k % 2 ? IMAT.pot : IMAT.clay, F, -hw + 0.4 + (k - 1.5) * 0.3, 0.5, -d * 0.36, 0.7, 0.7, 0.7, 0, BOWL_G.clone().rotateX(Math.PI)); itm("bowls", -hw + 0.4, -d * 0.4, 1.0);
    iBox(G, IMAT.basket, F, hw * 0.6, 0.2, -d * 0.1, 0.5, 0.4, 0.5, 0, new THREE.CylinderGeometry(0.5, 0.4, 1, 10)); iBox(G, IMAT.barley, F, hw * 0.6, 0.41, -d * 0.1, 0.45, 0.05, 0.45, 0, new THREE.CylinderGeometry(0.5, 0.5, 1, 10)); itm("basket", hw * 0.6, -d * 0.1, 0.9);
    itm("roof", 0, -d * 0.05, wh - 0.3);
    if (LATE) { iBox(G, IMAT.basket, F, -hw + 0.4, 0.5, -d * 0.22, 0.45, 0.32, 0.45, 0, new THREE.CylinderGeometry(0.5, 0.42, 1, 10)); for (let k = 0; k < 6; k++) iBox(G, M(0xb89870), F, -hw + 0.32 + (k % 3) * 0.08, 0.68, -d * 0.22 + Math.floor(k / 3) * 0.08 - 0.04, 0.07, 0.025, 0.1); itm("tablets", -hw + 0.4, -d * 0.22, 1.1);
      iBox(G, M(0x3a4a5a), F, -hw + 0.5, 0.48, -d * 0.36, 0.03, 0.05, 0.03, 0, new THREE.CylinderGeometry(0.5, 0.5, 1, 8)); itm("seal", -hw + 0.5, -d * 0.4, 0.8);
      iBox(G, IMAT.plaster, F, hw + 1.0, 0.4, -d * 0.4, 1.2, 0.8, 0.5); iBox(G, IMAT.clay, F, hw + 1.0, 0.95, -d * 0.4, 0.12, 0.3, 0.1); itm("chapel", hw + 1.0, -d * 0.4, 1.4); }
    for (const sx of [-1, 1]) for (const z of [-d * 0.33, -d * 0.04 - 0.8]) iBox(G, IMAT.mat, F, sx * (hw + (w / 2 - hw) / 2), 0.08, z, w / 2 - hw - 0.4, 0.08, 1.8);   // sleeping mats in the side rooms
    const h = SIM / 3600, meal = (h > 11.5 && h < 13) || (h > 18.5 && h < 20); folk.push([0.4, d * 0.22 - 0.9, 0, "knead", "woman"], [hw * 0.5, d * 0.3 - 0.6, 0, "knead", "woman"]);
    if (meal) folk.push([-0.8, d * 0.22, Math.PI / 2, "sitground", "man"], [0.9, d * 0.22 + 0.6, -Math.PI / 2, "sitground", "child"], [-0.4, d * 0.22 + 1.0, Math.PI, "sitground", "elder"]); else folk.push([-hw + 0.5, -d * 0.3, Math.PI / 2, "spin", "woman"], [0.5, -d * 0.25, 1.2, "sitground", "child"]); }
  else {   // a reed hut: the vault is the reed matting itself; inner end walls, mats, a hearth, nets
    for (const sz of [-1, 1]) iPlane(G, IMAT.reed, F, 0, wh * 0.45, sz * (d / 2 - 0.05), w, wh * 0.9, sz > 0 ? Math.PI : 0);
    iPlane(G, IMAT.glow, F, 0, 0.85, B.face * (d / 2 - 0.08), 0.85, 1.65, B.face > 0 ? Math.PI : 0);
    iBox(G, IMAT.mat, F, 0, 0.06, 0, w - 1, 0.02, d - 1.2); itm("mats", 0.6, 0, 0.6); const fire = iBox(G, IMAT.fire, F, 0, 0.05, -B.face * d * 0.15, 0.35, 0.35, 0.35, 0, new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0)); fire.userData.fire = true; itm("hearth", 0, -B.face * d * 0.15, 0.8); block(0, -B.face * d * 0.15, 0.8, 0.8);
    for (let k = 0; k < 3; k++) iBox(G, IMAT.pot, F, -w / 2 + 0.6, 0, -d * 0.3 + k * 0.6, 0.8, 0.8, 0.8, k, POT_G); iBox(G, IMAT.wool, F, w / 2 - 0.7, 0.15, d * 0.2, 0.7, 0.3, 1.8); itm("arches", 0, 0, wh - 0.6);
    iBox(G, M(0x8a7a5a), F, w / 2 - 0.6, 1.2, -d * 0.25, 0.08, 1.2, 1.2); itm("nets", w / 2 - 0.8, -d * 0.25, 1.4);
    folk.push([0.5, -B.face * d * 0.15 + 0.7, Math.PI, "sitground", "fisher"], [-0.6, -B.face * d * 0.15 - 0.4, 0.3, "knead", "woman"]); }
  if (B.coll) B.coll.on = false;
  INSIDE = { B, G, marks, solids, folk }; const [lx, ly, lz] = gw(F, 0, 1.0, B.reed || B.court ? 0 : d * 0.22); houseLight.position.set(lx, ly, lz);
  INDOOR.forEach((A, k) => { if (!A) return; const f = folk[k]; if (!f) return; A.L = looks(A.i, f[4]); crowd.look(A.i, A.L); });
  const [dx, , dz] = gw(F, B.door[0], 0, B.door[1]); P_.x = dx; P_.z = dz; P_.y = F.gy; yaw = Math.atan2(F.s, F.c) + (B.reed ? (B.face > 0 ? 0 : Math.PI) : B.face * Math.PI / 2); if (renderer.xr.isPresenting) vrTurn = yaw;
  say(B.reed ? "Inside a reed hut. E near things to read; E at the door to go out." : B.court ? "Inside a courtyard house: the rooms open onto a court open to the sky. E near things to read; E at the door to go out." : "Inside a mud-brick house: the central hall, with rooms to either side. E near things to read; E at the door to go out.", 9); }
function leaveBuilding() { if (!INSIDE) return; const { B, G, marks } = INSIDE; scene.remove(G); G.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); for (const m of marks) { const i = MARKS.indexOf(m); if (i >= 0) MARKS.splice(i, 1); if (m.spr) LBL.remove(m.spr); }
  if (B.coll) B.coll.on = true; houseLight.intensity = 0; INSIDE = null; P_.x = B.out[0]; P_.z = B.out[1]; P_.y = groundH(P_.x, P_.z); yaw = B.out[2]; if (renderer.xr.isPresenting) vrTurn = yaw; }
function insideClamp(p) { const { B } = INSIDE, F = B.F, dx = p.x - F.x, dz = p.z - F.z; let lx = dx * F.c - dz * F.s, lz = dx * F.s + dz * F.c; const r = 0.28, hwid = B.reed ? B.w / 2 * 0.75 : B.w / 2 - 0.1;
  lx = clampN(lx, -hwid + r, hwid - r); lz = clampN(lz, -B.d / 2 + 0.1 + r, B.d / 2 - 0.1 - r);
  for (const [sx, sz, hx, hz] of INSIDE.solids) { const ex = hx + r - Math.abs(lx - sx), ez = hz + r - Math.abs(lz - sz); if (ex > 0 && ez > 0) { if (ex < ez) lx = sx + Math.sign(lx - sx || 1) * (hx + r); else lz = sz + Math.sign(lz - sz || 1) * (hz + r); } }
  p.x = F.x + lx * F.c + lz * F.s; p.z = F.z - lx * F.s + lz * F.c; }
function buildingAtDoor(x, z) { let best = null, bd = 2.6; for (const H of HOUSES) { const dd = Math.hypot(H.dp[0] - x, H.dp[1] - z); if (dd < bd) { bd = dd; best = H; } } if (!best) return null; const H = best, F = FR(H.x, H.z, H.ry, H.gy + 0.05, "int");
  const sh = H.court && !H.reed ? 1.0 : 0.2; return { F, w: H.w - sh, d: H.d - sh, court: H.court && !H.reed, kind: H.kind, wh: H.reed ? Math.min(3.4, H.w * 0.75) : H.wh, reed: H.reed, face: H.face, door: H.reed ? [0, H.face * (H.d / 2 - 0.9)] : [H.face * (H.w / 2 - 0.9), 0], out: [H.dp[0], H.dp[1], H.dp[2] + Math.PI], coll: H.coll }; }
const insideFolk = A => { if (!INSIDE) return null; const f = INSIDE.folk[A.indoor]; if (!f) return null; const [x, , z] = gw(INSIDE.B.F, f[0], 0, f[1]); return [x, z, Math.atan2(INSIDE.B.F.s, INSIDE.B.F.c) + f[2], f[3], false, 0, INSIDE.B.F.gy - WATER]; };


// ---------- the day's clock ----------
// A spring day at harvest time, about 4500 BC. No events are recorded for any single day so long before writing: the order of this
// one is typical, from what the excavations show of life and work. SIM is seconds after midnight.
const hms = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
let SIM = hms(6, 0), timeRate = 1;
const T = { offer: hms(5, 50), boats: hms(6, 30), work: hms(7, 0), sail: hms(10, 0), rest: hms(12, 0), work2: hms(15, 0), herds: hms(17, 30), eve: hms(18, 40) };
const MOMENTS = [["Dawn: offerings at the White Temple", hms(5, 55)], ["The boats go out", T.boats], ["The harvest", hms(8, 0)], ["A boat comes in", T.sail - 60], ["Midday: rest in the shade", hms(12, 30)], ["Afternoon", hms(15, 30)], ["The herds come home", T.herds], ["Evening at the ovens", T.eve], ["Night", hms(21, 0)]];
const NARR = [
  [hms(5, 50), "Dawn at Uruk, a spring morning about 3200 BC, at the barley harvest: the largest city in the world, perhaps 25,000-50,000 people. On its terrace the White Temple catches the first light; to the east rise the great halls of Eanna, the house of Inanna. People climb the terrace stair with offerings."],
  [T.boats, "On the canals through the city and out on the river, boats set off: reed boats and wooden ones, with grain, reeds, fish and goods."],
  [T.work, "Work begins: the barley harvest with clay sickles in the fields round the city, the threshing floors, potters turning out bowls by the thousand, the brick yards, weavers at their looms; in Eanna the officials count what comes in and goes out."],
  [T.sail, "A boat comes in up the river, from the south: Uruk traded far, for timber, stone, copper and lapis lazuli from Afghanistan, and planted colonies as far as Syria and Anatolia."],
  [T.rest, "Midday. It is already hot: people rest in the shade of the houses and palms; the work stops until the heat lessens."],
  [T.work2, "Work again until the evening."],
  [T.herds, "The herds come home from the pastures: sheep and goats in great flocks, counted for the institutions; cattle, donkeys."],
  [T.eve, "Sunset. Bread from the tannur ovens, barley porridge, dates, onions, fish, beer through a straw. On hot nights families sleep on the roofs."]];
let narrI = -1;

// ---------- the people ----------
const crowd = new Crowd(NC), AG2 = [];
let nextI = 0;
function agent(role, o = {}) { const i = nextI++; if (i >= NC) return null; const L = looks(i, role); crowd.look(i, L); const A = { i, L, role: L.role, x: 0, z: 0, y: 0, h: 0, kind: "stand", walk: 0, shown: false, ...o }; AG2.push(A); return A; }
function routeAt(P, s) { let i = 1; for (; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s <= l) { const f = s / l; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), false]; } s -= l; }
  const n = P.length - 1; return [P[n][0], P[n][1], n ? Math.atan2(P[n][0] - P[n - 1][0], P[n][1] - P[n - 1][1]) : 0, true]; }
const routeLen = P => P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const working = () => (SIM > T.work && SIM < T.rest) || (SIM > T.work2 && SIM < T.eve - 600);
const TL = (lx, lz) => { const c = Math.cos(TEMPLE.ry), s = Math.sin(TEMPLE.ry); return [lx * c + lz * s, -lx * s + lz * c]; };   // the temple's local frame to the map
// bearers of offerings: from the town up the stair, in by the side door, to the offering table, and back
const OFFER_PATH = [EANNA.IN(-150, -60), EANNA.IN(-60, -70), EANNA.IN(10, -60), EANNA.IN(10, -27), EANNA.IN(10, -20), EANNA.IN(10.9, -4.3)];   // the procession: from the city into Eanna, in at the door of Temple D, to the offering table
if (LATE) { const IN = TEMPLE.IN, Z = TEMPLE.ZIG, PW = TEMPLE.PW; OFFER_PATH.length = 0; OFFER_PATH.push(IN(-20, 58), IN(40, 48), IN(72, 10), IN(72, -12), IN(32, -44), IN(32, -52), IN(32, -63), IN(32, -68.4)); }   // from the temple kitchen to the god's table
const OFFER = []; for (let k = 0; k < 12; k++) { const A = agent("bearer", { offer: k, prop: k % 3 === 0 ? "jar" : "basket" }); if (A) OFFER.push(A); }   // naked offering-bearers with baskets and jars, as on the Uruk Vase
const EANNA_AG = [agent("leader", { fixed: [...EANNA.IN(10, -31), face(...EANNA.IN(10, -31), ...EANNA.IN(10, -60))], kind: "talk" }), agent("priestess", { fixed: [...EANNA.IN(10.2, -1.9), face(...EANNA.IN(10.2, -1.9), ...EANNA.IN(10, -20))], kind: "pray" })];
mark("The leader", ...EANNA.IN(10, -31), "inferred", "The leading figure of Uruk, as cylinder seals, the Uruk Vase and statuettes show him: bearded, his hair in a bun under a headband, bare-chested in a long skirt with a net pattern. He feeds the sacred flocks, leads offerings to Inanna, hunts lions, stands over prisoners. Whether he was a priest, a king, or both, archaeologists do not know; they call him the priest-king. Here he waits at the door of Temple D for the morning\'s offerings.", { y: 2.6, r: 3, range: 60 });
mark("The offering procession", ...EANNA.IN(-60, -70), "inferred", "At dawn a procession of naked men carries baskets of fruit and grain and jars of beer and oil to the house of Inanna, as on the Uruk Vase, found in Eanna: rows of offering-bearers, naked (nakedness probably meant purity before the gods), walking toward the goddess, or a priestess acting for her, who stands at the door of her shrine by her reed ring-posts. When and how often such processions happened is not known.", { y: 3, r: 10, range: 300 });
const ATTEND = LATE ? [agent("temple", { fixed: [...TEMPLE.IN(30.4, -68.6), face(...TEMPLE.IN(30.4, -68.6), ...TEMPLE.IN(32, -72))], kind: "pray", attend: true }), agent("temple", { fixed: [...TEMPLE.IN(33.6, -68.6), face(...TEMPLE.IN(33.6, -68.6), ...TEMPLE.IN(32, -72))], kind: "sell", attend: true })] : [agent("temple", { fixed: [...TL(0.9, -TEMPLE.d / 2 + 4.0), face(...TL(0.9, -TEMPLE.d / 2 + 4.0), ...TL(0, -TEMPLE.d / 2 + 4.5))], kind: "sell", attend: true }), agent("temple", { fixed: [...TL(0, TEMPLE.d / 2 - 3.0), face(...TL(0, TEMPLE.d / 2 - 3.0), ...TL(0, TEMPLE.d / 2 - 1.6))], kind: "pray", attend: true })];
// fishing boats poled about the marsh and the river; the sailing boat from the Gulf
const rboatMesh = (bit = true, sail = false) => { const g = new THREE.Group(), h = new THREE.Mesh(RBOAT_G, bit ? boatBitM : boatReedM); h.scale.set(1.2, 0.75, sail ? 11 : 7); g.add(h); if (sail) { const m = new THREE.Mesh(CYL_G, MAT.wood); m.scale.set(0.12, 6, 0.12); m.position.set(0, 0.3, 1.5); g.add(m); const s = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), MAT.cloth); s.position.set(0, 3.8, 1.3); s.rotation.y = Math.PI / 2; g.add(s); } scene.add(g); return g; };
const BOATS = []; { const R = seeded(31); for (let k = 0; k < 6; k++) { let P = null; for (let t = 0; t < 300 && !P; t++) { const cx = LAGOON.x - 1800 + R() * 2400, cz = LAGOON.z - 1600 + R() * 1800, pts = []; for (let q = 0; q < 6; q++) { const a = q / 6 * 6.283, x = cx + Math.cos(a) * (180 + R() * 140), z = cz + Math.sin(a) * (180 + R() * 140); if (groundH(x, z) > -0.25) break; pts.push([x, z]); } if (pts.length === 6) P = [...pts, pts[0]]; }
    if (!P) continue; const B = { P, L: routeLen(P), g: rboatMesh(R() < 0.6), ph: R() * 1000, men: [agent("fisher", { boat: BOATS.length, seat: 0 }), agent(R() < 0.3 ? "child" : "fisher", { boat: BOATS.length, seat: 1 })] }; BOATS.push(B); } }
const SAIL = { g: rboatMesh(true, true), P: [[SHORE[0] + Math.cos(SHORE[2]) * 1600, SHORE[1] + Math.sin(SHORE[2]) * 1600], [SHORE[0] + Math.cos(SHORE[2]) * 60, SHORE[1] + Math.sin(SHORE[2]) * 60]], men: [agent("man", { sail: 0 }), agent("fisher", { sail: 1 }), agent("fisher", { sail: 2 })] };
const sailState = () => { const t = SIM - T.sail; if (t < -1800) return null; const f = clampN((t + 1800) / 3000, 0, 1), [x, z, h] = routeAt(SAIL.P, f * routeLen(SAIL.P)); return { x, z, h, moving: f < 1 }; };
// herders with their flocks on the desert edge; home at evening
const FLOCKS = []; { const R = seeded(44); for (let k = 0; k < 3; k++) { const a = Math.PI * 0.75 + (k - 1) * 0.5, gx = Math.cos(a) * (1600 + k * 300), gz = Math.sin(a) * (1600 + k * 300) * 0.9, home = [Math.cos(a) * 380, Math.sin(a) * 340]; FLOCKS.push({ g: [gx, gz], home, pos: home.slice(), h: 0, moving: false, n: 18 + k * 6, herder: agent(k === 1 ? "child" : "man", { flock: k, prop: "staff" }) }); } }
// reapers in the ripe fields round the town
const REAPERS = []; { const R = seeded(55); for (let k = 0, n = 0; k < 20000 && n < 40; k++) { const x = (R() - 0.5) * 3000, z = (R() - 0.5) * 3000, kk = rIdx(x, z); if (kk < 0 || RAS[kk] !== 5 || CROP[kk] !== 1) continue; const A = agent(R() < 0.45 ? "woman" : "man", { fixed: [x, z, R() * 6.28], kind: "reap", prop: "sickle", field: true }); if (A) { REAPERS.push(A); n++; } } }
for (const J of TECH_JOBS) agent(J.role, { job: J.steps, jobPh: J.ph, x: J.steps[0].p[0], z: J.steps[0].p[1] });
for (const W of LATE_AG) W.A = agent(W.role, { lateW: W });
// donkey carts with solid wheels, on the road to the precinct gate (later period)
const CARTS = []; if (LATE) { const IN = TEMPLE.IN, PW = TEMPLE.PW; for (let k = 0; k < 3; k++) { const P = [IN(PW.x1 + 420, -60 + k * 50), IN(PW.x1 + 150, k * 10 - 10), IN(PW.x1 + 4, 0)], g = new THREE.Group(), bed = new THREE.Mesh(BOX_G, MAT.wood); bed.scale.set(1.3, 0.5, 2.0); bed.position.y = 0.6; g.add(bed);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14).rotateZ(Math.PI / 2), MAT.wood); w.position.set(sx * 0.75, 0.45, 0); g.add(w); }   // solid wheels of planks
    for (const sx of [-0.35, 0.35]) { const d = new THREE.Mesh(DONKEY_G, M(0x7a6a5a, { vertexColors: true })); d.position.set(sx, 0, 2.4); g.add(d); } scene.add(g); CARTS.push({ P, L: routeLen(P), g, ph: k * 700, A: agent("worker", { cartK: k }) }); } }
const INDOOR = Array.from({ length: 6 }, (_, k) => agent("woman", { indoor: k }));
const AMB = []; { const N = NC - nextI - 4; for (let k = 0; k < N; k++) { const A = agent(null, { amb: true }); if (A) AMB.push(A); } }
const DRESS = {
  leader: "The leader of Uruk, as the seals and the Uruk Vase show him: bearded, his hair in a bun under a headband, bare-chested, in a long skirt with a net pattern. Priest, king, or both: no one knows.",
  bearer: "An offering-bearer, naked as on the Uruk Vase, which shows a procession of naked men bringing baskets and jars of produce to Inanna: nakedness probably marked purity before the gods.",
  priestess: "A woman in a long robe and headband receiving the offerings at the table, as on the Uruk Vase: there the figure is the goddess Inanna herself, or a priestess acting for her.",
  man: LATE ? "A man of Eridu in the time of the kings of Ur: a wrapped kilt or a long fringed garment of wool, mostly undyed (coloured cloth cost more); men of rank are often shown with the head and face shaved, others with long hair and beard; as statues and seals show." : "A man of Uruk: bare-chested in a kilt of wool or linen, as on the Uruk Vase and the seals; barefoot. Many worked for the great institutions, paid in rations of barley, beer and oil.",
  woman: LATE ? "A woman of Sumer: a long robe draped over the left shoulder, the hair gathered in a chignon held by a band, as statues show. Women worked as weavers, millers and brewers for the temples, and ran households and businesses." : "A woman of Uruk: a long robe of wool, sometimes draped over one shoulder, the hair long or held by a band. The tablets record women weavers, millers and workers by the hundred.",
  child: "A child: in the heat, often naked. Children worked from an early age: herding, scaring birds from the crops, fetching water, helping at harvest.",
  elder: LATE ? "An older man of Eridu, in a long wrapped garment of wool." : "An older man of Uruk. Councils of elders may have shared power with the leading figure the seals show; how Uruk was governed is debated.",
  fisher: "A fisherman in a loincloth: the tablets list fish by the thousand. He poles a reed boat and casts a net weighted with clay sinkers.",
  official: "An official: a long robe and a fringed shawl over the left shoulder, a cylinder seal on a cord round the neck (his signature, rolled on every document he answers for). Sumerian dress is known from statues, seals and reliefs.",
  scribe: "A scribe, with his cylinder seal: he trained for years in the tablet house to write Sumerian in cuneiform, and keeps the temple's accounts.",
  worker: "A worker of the temple or the state, in a kilt: one of a gang under a foreman, paid in barley, oil and wool, called up for building, canal digging and harvest.",
  temple: "A temple servant in a long white wrap. On the Uruk Vase the offering-bearers walk naked before the goddess; who served the temples, and how, is known only from such images and the tablets' lists of officials." };
if (LATE) mark("Priests of Enki", ...TEMPLE.IN(32, -67.6), "inferred", "Priests before the statue of Enki: shaven-headed, as Sumerian priests are shown, serving the god his meals and tending his statue. Eridu's temple had many priests and servants, singers, lamenters, cooks and craftsmen.", { y: 2.6, r: 4, range: 40 });
else mark("Temple attendants", ...TL(0.5, TEMPLE.tableZ + 0.5), "inferred", "People tending the offering table and the altar of the White Temple. Who served it, and how, is not known.", { y: TEMPLE.top - groundH(...TL(0.5, -TEMPLE.d / 2 + 4.0)) + 2.2, r: 4, range: 40 });

// ---------- daily life about the town: placed near you as you go ----------
const ACTIVE = () => { const h = SIM / 3600; return h < 5 ? 0.05 : h < 6 ? 0.4 : h < 12 ? 1 : h < 15 ? 0.35 : h < 19 ? 1 : h < 21 ? 0.55 : 0.08; };
const nearestOf = (L, x, z, max = 200) => { let best = null, bd = max; for (const W of L) { const d = Math.hypot(W[0] - x, W[1] - z); if (d < bd) { bd = d; best = W; } } return best; };
const WATERPTS = []; { for (const C of CANALS.slice(0, 3)) for (let s = 0; s < C.L; s += 60) WATERPTS.push(C.at(s).slice(0, 2)); }
function placeAmbient(A, px, pz) { const R = Math.random; propHide(A); A.prop = null; A.yOff = 0;
  if (R() > ACTIVE()) { A.mode = "off"; return false; } const H = HOUSES[(R() * HOUSES.length) | 0]; if (Math.hypot(H.dp[0] - px, H.dp[1] - pz) > 320) { A.mode = "off"; return false; }
  const role = A.L.role, r = R(), door = [H.dp[0], H.dp[1]], hot = SIM > T.rest && SIM < T.work2;
  if (role === "child" && r < 0.5) { A.mode = "play"; A.c = [door[0] + (R() - 0.5) * 8, door[1] + (R() - 0.5) * 8]; A.ph = R() * 6; A.x = A.c[0]; A.z = A.c[1]; return true; }
  if (hot || r < 0.25) { A.mode = "fixed"; A.x = door[0] + (R() - 0.5) * 3; A.z = door[1] + (R() - 0.5) * 3; A.h = R() * 6.28; A.kind = R() < 0.6 ? "sitground" : "talk"; return true; }   // in the shade by the door
  if (!H.reed && SIM > T.eve && r < 0.55) { A.mode = "fixed"; const lx = H.court ? (R() < 0.5 ? -1 : 1) * (H.w / 2 - 1.3) : (R() - 0.5) * H.w * 0.5, lz = (R() - 0.5) * H.d * (H.court ? 0.7 : 0.5); A.x = H.x + lx * Math.cos(H.ry) + lz * Math.sin(H.ry); A.z = H.z - lx * Math.sin(H.ry) + lz * Math.cos(H.ry); A.h = R() * 6.28; A.kind = R() < 0.5 ? "sitground" : "talk"; A.yOff = H.gy + H.wh + 0.12; return true; }   // up on the roof in the cool
  if (r < 0.55) { const W = nearestOf(WATERPTS, door[0], door[1], 700); if (W) { A.mode = "loop"; A.path = [door, W]; A.prop = role === "woman" || role === "child" ? "jar" : null; A.pause = "kneel"; A.x = door[0]; A.z = door[1]; A.v = 0.9 + R() * 0.3; A.u = R() * 60; return true; } }   // fetching water from the canal, the jar on the head
  if (r < 0.75) { const L = LANES[(R() * LANES.length) | 0], [sx, sz] = L.at(R() * L.L); if (Math.hypot(sx - door[0], sz - door[1]) < 200) { A.mode = "loop"; A.path = [[sx, sz], door]; A.prop = R() < 0.5 ? "basket" : role === "man" && R() < 0.4 ? "reeds" : null; A.pause = "stand"; A.x = sx; A.z = sz; A.v = 0.9 + R() * 0.4; A.u = R() * 60; return true; } }
  const L = LANES[(R() * LANES.length) | 0], s = R() * L.L, [x, z] = L.at(s); if (Math.hypot(x - px, z - pz) > 330) { A.mode = "off"; return false; }
  A.mode = "walk"; A.S = L; A.s = s; A.dir = R() < 0.5 ? 1 : -1; A.lane = (R() - 0.5) * 1.6; A.v = 0.9 + R() * 0.4; A.kind = "walk"; return true; }
function taskStep(A, dt, rate) { if (A.mode === "play") { A.ph += dt * rate * 1.6; A.x = A.c[0] + Math.cos(A.ph) * 3 + Math.cos(A.ph * 2.3) * 1.2; A.z = A.c[1] + Math.sin(A.ph) * 3; A.h = A.ph + Math.PI; A.kind = "walk"; A.walk = 2; return; }
  if (A.mode === "fixed") return; const P = A.path, L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), cyc = 2 * L / A.v + 30; A.u = (A.u + dt * rate) % cyc; const u = A.u;
  if (u < L / A.v) { const f = u * A.v / L; A.x = P[0][0] + (P[1][0] - P[0][0]) * f; A.z = P[0][1] + (P[1][1] - P[0][1]) * f; A.h = Math.atan2(P[1][0] - P[0][0], P[1][1] - P[0][1]); A.kind = A.prop === "basket" || A.prop === "jar" ? "walk" : A.prop ? "carry" : "walk"; A.walk = 1; }
  else if (u < L / A.v + 15) { A.x = P[1][0]; A.z = P[1][1]; A.kind = A.pause; A.walk = 0; }
  else if (u < 2 * L / A.v + 15) { const f = 1 - (u - L / A.v - 15) * A.v / L; A.x = P[0][0] + (P[1][0] - P[0][0]) * f; A.z = P[0][1] + (P[1][1] - P[0][1]) * f; A.h = Math.atan2(P[0][0] - P[1][0], P[0][1] - P[1][1]); A.kind = "walk"; A.walk = 1; }
  else { A.x = P[0][0]; A.z = P[0][1]; A.kind = "stand"; A.walk = 0; } }
for (const A of AMB) A.mode = "off";

// ---------- moving everyone, by the clock ----------
function jobProp(A, key) { key = key || null; if (A.prop === key) return; if (A.prop) propHide(A); A.prop = key; }
function jobPose(A, S) { const J = A.job; if (!J.T) { J.T = 0; J.forEach((st, i) => { const pv = J[(i + J.length - 1) % J.length]; st.w = Math.hypot(st.p[0] - pv.p[0], st.p[1] - pv.p[1]) / 0.9; J.T += st.w + st.d; }); }
  let u = (S + (A.jobPh || 0)) % J.T;
  for (let i = 0; i < J.length; i++) { const st = J[i], pv = J[(i + J.length - 1) % J.length];
    if (u < st.w) { const f = u / st.w, carry = st.wc !== undefined ? st.wc : pv.c; jobProp(A, carry); return [pv.p[0] + (st.p[0] - pv.p[0]) * f, pv.p[1] + (st.p[1] - pv.p[1]) * f, Math.atan2(st.p[0] - pv.p[0], st.p[1] - pv.p[1]), carry === "reeds" || carry === "sheaf" ? "shoulder" : carry && carry !== "basket" && carry !== "mud" ? "carry" : "walk", true, 0.9]; }
    u -= st.w; if (u < st.d) { jobProp(A, st.c); return [st.p[0], st.p[1], face(st.p[0], st.p[1], st.f[0], st.f[1]), st.k]; } u -= st.d; }
  return [J[0].p[0], J[0].p[1], 0, "stand"]; }
const OFFER_L = routeLen(OFFER_PATH);
function agentState(A) { const S = SIM; if (A.job) return working() ? jobPose(A, S) : null;
  if (A.indoor !== undefined) return insideFolk(A);
  if (A.lateW) { const W = A.lateW; if (W.day ? SIM < hms(6, 0) || SIM > hms(18, 30) : !working()) return null; if (W.fixed) return [W.fixed[0], W.fixed[1], W.fixed[2], W.kind, false, 0, W.y !== undefined ? W.y - WATER : undefined];
    const P = W.carry, L = W.L || (W.L = routeLen(P)), u = (S * 0.8 + W.ph * 5) % (2 * L + 20); if (u < 10) { jobProp(A, "basket"); return [P[0][0], P[0][1], 0, "kneel"]; } if (u < L + 10) { jobProp(A, "basket"); const [x, z, h] = routeAt(P, u - 10); return [x, z, h, "walk", true, 0.8]; } if (u < L + 20) { jobProp(A, null); const p = P[P.length - 1]; return [p[0], p[1], 0, "kneel"]; } jobProp(A, null); const [x, z, h] = routeAt(P, 2 * L + 20 - u); return [x, z, h + Math.PI, "walk", true, 0.8]; }
  if (A.cartK !== undefined) { const C = CARTS[A.cartK]; return C.pos ? [C.pos[0], C.pos[1], C.pos[2], "walk", true, 0.9] : null; }
  if (A.offer !== undefined) { const start = T.offer + A.offer * 55, u = (S - start) * 0.85; if (u < 0 || S > hms(8, 30)) return null; const cyc = 2 * OFFER_L + 40, q = u % cyc, mine = OFFER_PATH.map(([x, z], i) => i === 0 ? [x + (A.offer % 4 - 1.5) * 8, z + (A.offer % 3 - 1) * 8] : [x, z]);
    if (q < OFFER_L) { const [x, z, h] = routeAt(mine, q); return [x, z, h, "walk", true, 0.85]; } if (q < OFFER_L + 40) { const [x, z] = mine[mine.length - 1]; return [x, z, face(x, z, ...TL(0, -TEMPLE.d / 2 + 4.5)), q < OFFER_L + 20 ? "kneel" : "pray"]; }
    const [x, z, h] = routeAt(mine, 2 * OFFER_L + 40 - q); return [x, z, h + Math.PI, "walk", true, 0.85]; }
  if (A.attend) return [...A.fixed, A.kind];
  if (A.boat !== undefined) { const B = BOATS[A.boat]; if (!B || SIM < T.boats || SIM > T.eve) return null; const [x, z, h] = B.pos, lz = A.seat ? -2.2 : 2.2; return [x + Math.sin(h) * lz, z + Math.cos(h) * lz, h, A.seat ? "pole" : "net", false, 0, 0.45]; }
  if (A.sail !== undefined) { const B = sailState(); if (!B) return null; const lz = [-3.5, 0, 3][A.sail]; return [B.x + Math.sin(B.h) * lz, B.z + Math.cos(B.h) * lz, B.h, B.moving ? (A.sail ? "pole" : "stand") : "talk", false, 0, 0.5]; }
  if (A.flock !== undefined) { const F = FLOCKS[A.flock], [x, z] = F.pos; return [x - 3, z - 3, F.h, F.moving ? "walk" : "stand", F.moving, 0.9]; }
  if (A.field) return working() ? [...A.fixed, "reap"] : null;
  if (A.fixed) return [...A.fixed, A.kind];
  return null; }
let frameN = 0;
function lifeStep(dt, t) { frameN++; const px = P_.x, pz = P_.z, rate = Math.min(timeRate, 8);
  for (const A of AG2) {
    if (A.amb) { if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if ((frameN + A.i) % 30 === 0) placeAmbient(A, px, pz); if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; } }
      if ((frameN + A.i) % 600 === 0 && Math.random() > ACTIVE()) { A.mode = "off"; continue; }
      if (A.mode === "loop" || A.mode === "fixed" || A.mode === "play") taskStep(A, dt, rate);
      if (A.mode === "walk") { A.s += A.dir * A.v * dt * rate; if (A.s < 0 || A.s > A.S.L) { A.dir *= -1; A.s = clampN(A.s, 0, A.S.L); } const [x, z, a] = A.S.at(A.s); A.x = x + Math.cos(a) * A.lane; A.z = z - Math.sin(a) * A.lane; A.h = A.dir > 0 ? a : a + Math.PI; }
      const d = Math.hypot(A.x - px, A.z - pz), step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
      if (d > 300 || (rGet(A.x, A.z) === 2 && !A.yOff)) { if (A.shown) {   // far away, or passing through a house: not drawn
        crowd.hide(A.i); propHide(A); A.shown = false; } continue; }
      const ay = A.yOff || groundH(A.x, A.z); crowd.set(A.i, A.x, ay, A.z, A.h, A.kind, t, A.mode === "walk" ? A.v * rate : A.walk ? Math.min(2, A.walk * rate) : 1); A.shown = true; if (A.prop) propSet(A, ay); continue; }
    const st = agentState(A); if (!st) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; }
    let [x, z, h, kind, moving, sp, yw] = st; A.x = x; A.z = z; A.h = h; A.kind = kind; const d = Math.hypot(x - px, z - pz);
    if (d > (A.boat !== undefined || A.sail !== undefined || A.flock !== undefined ? 800 : 320)) { if (A.shown) { crowd.hide(A.i); if (A.prop) propHide(A); A.shown = false; } continue; }
    const step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
    const y = yw !== undefined ? WATER + yw : Math.max(groundH(x, z), WATER - 0.4);
    crowd.set(A.i, x, y, z, h, kind, t, moving ? Math.min(2, (sp || 0.9) / 1.2) * Math.min(rate, 3) : 1); A.shown = true; if (A.prop) propSet(A, y); else propHide(A); }
  crowd.done(); }
// boats, flocks and the oxen on the threshing floor
function boatsStep(t) { for (const C of CARTS) { const on = working(); C.g.visible = on; if (!on) { C.pos = null; continue; } const u = (SIM * 0.9 + C.ph) % (2 * C.L), back = u > C.L, s = back ? 2 * C.L - u : u, [x, z, h0] = routeAt(C.P, s), h = back ? h0 + Math.PI : h0; C.g.position.set(x, groundH(x, z), z); C.g.rotation.y = h; C.pos = [x + Math.sin(h) * 3.6 + Math.cos(h) * 0.9, z + Math.cos(h) * 3.6 - Math.sin(h) * 0.9, h]; } for (const B of BOATS) { const on = SIM > T.boats && SIM < T.eve; B.g.visible = on; const s = ((SIM * 0.7 + B.ph) % B.L), [x, z, h] = routeAt(B.P, s); B.pos = [x, z, h]; if (on) { B.g.position.set(x, WATER - 0.22, z); B.g.rotation.y = h; } }
  const S2 = sailState(); SAIL.g.visible = !!S2; if (S2) { SAIL.g.position.set(S2.x, WATER - 0.25, S2.z); SAIL.g.rotation.y = S2.h; } }
const BEASTS = [], beastIM = {};
{ const R = seeded(301); for (const F of FLOCKS) for (let k = 0; k < F.n; k++) BEASTS.push({ sp: R() < 0.6 ? "sheep" : "goat", flock: F, off: [(R() - 0.5) * 24, (R() - 0.5) * 24], ph: R() * 100 });
  for (let k = 0; k < 24; k++) { const H = HOUSES[(R() * HOUSES.length) | 0]; if (Math.hypot(H.x, H.z) > 500) continue; BEASTS.push({ sp: "pig", home: [H.dp[0] + (R() - 0.5) * 8, H.dp[1] + (R() - 0.5) * 8], ph: R() * 100 }); }
  for (let k = 0; k < 18; k++) { const W = WATERPTS[(R() * WATERPTS.length) | 0]; BEASTS.push({ sp: "cow", home: [W[0] + (R() - 0.5) * 60 + 30, W[1] + (R() - 0.5) * 60], ph: R() * 100 }); }
  if (THRESH.length) for (const off of THRESH.oxen) BEASTS.push({ sp: "cow", thresh: off });
  for (const [sp, geo, col] of [["sheep", SHEEP_G, 0xd8ccb0], ["goat", SHEEP_G, 0x4a3a2a], ["pig", PIG_G, 0x4a3e36], ["cow", COW_G, 0x7a5a3e]]) { const n = BEASTS.filter(b => b.sp === sp).length, im = new THREE.InstancedMesh(geo, M(col, { vertexColors: true }), Math.max(1, n)); im.frustumCulled = false; im.count = n; scene.add(im); beastIM[sp] = im; } }
function flockStep() { const h = SIM / 3600; for (const F of FLOCKS) { const going = h > 6.5 && h < 7.5, home = h < 6.5 || h > 18.5, coming = h > T.herds / 3600 && h <= 18.5; const f = going ? (h - 6.5) : coming ? 1 - (h - T.herds / 3600) : home ? 0 : 1;
  F.pos = [lerpN(F.home[0], F.g[0], clampN(f, 0, 1)) + (f === 1 ? Math.sin(SIM * 0.002 + F.n) * 40 : 0), lerpN(F.home[1], F.g[1], clampN(f, 0, 1))]; F.moving = going || coming; F.h = Math.atan2(F.g[0] - F.home[0], F.g[1] - F.home[1]) + (coming ? Math.PI : 0); } }
function beastStep(t) { flockStep(); const cnt = { sheep: 0, goat: 0, pig: 0, cow: 0 };
  for (const B of BEASTS) { let x, z, h; if (B.flock) { x = B.flock.pos[0] + B.off[0] + Math.sin(t * 0.3 + B.ph) * 1.5; z = B.flock.pos[1] + B.off[1]; h = B.flock.moving ? B.flock.h : t * 0.1 + B.ph; }
    else if (B.thresh !== undefined) { const [tx, tz] = THRESH[0], a = SIM * 0.12 + B.thresh, r = 3.6; x = tx + Math.cos(a) * r; z = tz + Math.sin(a) * r; h = a + Math.PI; if (!working()) { x = tx + 12 + B.thresh * 2; z = tz + 10; } }
    else { const a = t * 0.04 + B.ph; x = B.home[0] + Math.cos(a) * 3; z = B.home[1] + Math.sin(a * 1.3) * 3; h = a + Math.PI / 2; }
    const im = beastIM[B.sp], i = cnt[B.sp]++; if (Math.hypot(x - P_.x, z - P_.z) > 600) { im.setMatrixAt(i, ZEROM); continue; } O3.position.set(x, groundH(x, z), z); O3.rotation.set(0, h, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }
  for (const k in beastIM) beastIM[k].instanceMatrix.needsUpdate = true; }

// ---------- smoke: ovens and kilns ----------
class Smoke { constructor(n, size, col, op) { this.n = n; this.P = []; const pos = new Float32Array(n * 3).fill(-9999); this.geo = new THREE.BufferGeometry(); this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const st = tex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ size, map: st, color: col, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true })); this.pts.frustumCulled = false; scene.add(this.pts);
    for (let k = 0; k < n; k++) this.P.push({ age: 1e9, life: 1 }); this.k = 0; }
  emit(x, y, z, vy, life, spread = 0.4) { const p = this.P[this.k]; this.k = (this.k + 1) % this.n; Object.assign(p, { x: x + (Math.random() - 0.5) * spread, y, z: z + (Math.random() - 0.5) * spread, vy: vy * (0.8 + Math.random() * 0.4), age: 0, life }); }
  step(dt) { const a = this.geo.attributes.position.array; for (let k = 0; k < this.n; k++) { const p = this.P[k]; if (p.age > p.life) { a[3 * k + 1] = -9999; continue; } p.age += dt; p.y += p.vy * dt; p.x += 0.4 * dt * (0.3 + p.age / p.life); p.z += 0.1 * dt;
    a[3 * k] = p.x; a[3 * k + 1] = p.y; a[3 * k + 2] = p.z; } this.geo.attributes.position.needsUpdate = true; } }
const ovenSmoke = new Smoke(IS_HEADSET ? 260 : 500, 2.6, 0xc8c4bc, 0.22);
let smokeOv = [], smokeT = 0;
function smokeStep(dt) { smokeT -= dt; const cooking = (SIM > hms(5, 30) && SIM < hms(8, 0)) || (SIM > hms(17, 30) && SIM < hms(20, 0));
  if (smokeT <= 0) { smokeT = 2; smokeOv = OVENS.filter(o => hash(o[0] | 0, o[1] | 0) < 0.5 && Math.abs(o[0] - P_.x) < 250 && Math.abs(o[1] - P_.z) < 250).slice(0, 80); }
  if (smokeOv.length && cooking) for (let n = 0; n < Math.ceil(dt * 20); n++) { const o = smokeOv[(Math.random() * smokeOv.length) | 0]; ovenSmoke.emit(o[0], groundH(o[0], o[1]) + 1.0, o[1], 0.6, 10, 0.3); }
  if (working()) for (const [x, y, z, k] of SMOKERS) if (Math.random() < dt * 6 * k) ovenSmoke.emit(x, y, z, 1.0, 14, 0.6);
  ovenSmoke.step(dt); }


// ---------- you ----------
const SPEEDS = [[1.4, "walking"], [4, "jogging"], [12, "fast"], [40, "very fast"]];
const keys = {}; let yaw = 0, pitch = -0.05, dragging = false, started = false, speedI = 0, flying = false, labelsOn = true;
const START = { at: TL(TEMPLE.pw / 2 + 50, 0), look: [0, 0] };   // at the foot of the terrace stair, looking up at the White Temple
const P_ = { x: START.at[0], z: START.at[1], y: 0 }; yaw = Math.atan2(-(START.look[0] - START.at[0]), -(START.look[1] - START.at[1]));
const intro = document.getElementById("intro");
let SITTING = localStorage.getItem("vrPosture") === "sitting";
if (LATE && intro) { const c = intro.querySelector(".card"), ps = c.querySelectorAll("p"); document.title = "Eridu, about 2040 BC: the ziggurat of Amar-Sin"; c.querySelector("h1").textContent = "Eridu, about 2040 BC";   // the later time: a different introduction
  ps[0].innerHTML = "Two and a half thousand years after the Ubaid town, Eridu is an ancient holy city in the kingdom of Ur, under King Amar-Sin. The temple of Enki, the E-abzu, now stands on a ziggurat of mud brick cased in baked brick set in bitumen, and the king is rebuilding it: workers carry bricks up an earth ramp to the scaffolds, each brick stamped with his name. Round it is the walled precinct, with storehouses, the temple kitchen and the scribes' house; beyond, a town of courtyard houses, canals, fields and date groves.";
  ps[1].innerHTML = "Writing is everywhere: scribes press cuneiform into clay tablets for every ration, delivery and sale, and roll cylinder seals across them to sign. Watch the barley rations measured out, the coppersmith, the potter at the fast wheel, the brick kiln, donkey carts on solid wheels, cargo boats on the canal. Go into the houses (E at a door). The country round is generated; the ziggurat follows Amar-Sin's at Eridu and Ur-Nammu's at Ur, and the precinct is typical of its time.";
  c.querySelector("p.dim").innerHTML = "After the excavations at Eridu (Safar, Mustafa and Lloyd, 1946-49), Woolley's at Ur, and the many thousands of Ur III tablets. Much is unknown: every marker says whether a thing is known, inferred, or typical. Click to begin."; }
{ const card = intro?.querySelector(".card"), row = document.createElement("p"); row.innerHTML = 'In VR, are you <button data-p="standing">🧍 standing</button> or <button data-p="sitting">🪑 sitting</button>?';
  const paint = () => row.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:0 4px;border-radius:8px;cursor:pointer;border:2px solid #5a3a1e;" + ((b.dataset.p === "sitting") === SITTING ? "background:#5a3a1e;color:#fff" : "background:#fff;color:#5a3a1e"); });
  { const dr = document.createElement("p"); dr.innerHTML = 'Where and when? <button data-d="ubaid">🏺 Eridu, about 4500 BC</button> <button data-d="ur3">𒀭 Eridu, about 2040 BC</button> <button data-d="uruk">𒌷 Uruk, about 3200 BC</button>';
    const cur = "uruk"; dr.querySelectorAll("button").forEach(b => b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:2px 4px;border-radius:8px;cursor:pointer;border:2px solid #5a3a1e;" + (b.dataset.d === cur ? "background:#5a3a1e;color:#fff" : "background:#fff;color:#5a3a1e"));
    dr.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); if (b.dataset.d === "ubaid") location.href = "eridu.html"; else if (b.dataset.d === "ur3") location.href = "eridu.html?era=2040"; }); card?.insertBefore(dr, card.lastElementChild); }
  row.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); SITTING = b.dataset.p === "sitting"; localStorage.setItem("vrPosture", b.dataset.p); paint(); }); paint(); card?.insertBefore(row, card.lastElementChild); }
const CSS = "background:rgba(30,24,18,.78);color:#f2e8d6;border-radius:10px;font:13.5px/1.5 -apple-system,Helvetica,sans-serif";
const HUD = document.createElement("div"); HUD.style.cssText = `position:fixed;left:14px;top:12px;z-index:2;padding:10px 14px;max-width:620px;${CSS}`;
const MSG = document.createElement("div"); MSG.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;padding:12px 18px;max-width:780px;display:none;${CSS};font-size:15px`;
const GUIDE = document.createElement("div"); GUIDE.style.cssText = `position:fixed;right:14px;top:12px;z-index:2;padding:10px 12px;max-height:calc(100vh - 290px);overflow-y:auto;width:250px;${CSS};font-size:13px`;
const MAPC = document.createElement("canvas"); MAPC.width = MAPC.height = 240; MAPC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:10px;border:2px solid rgba(200,160,80,.7);width:240px;height:240px";
document.body.append(HUD, MSG, GUIDE, MAPC);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 12) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone"); if (LATE) return say("Eridu, about 2040 BC, in the reign of Amar-Sin, king of Ur: dawn on a spring day. Before you, the ziggurat of Enki in its walled precinct, still being built (workers are on the ramp up its south-west face); its triple stair climbs to the shrine on top. In the precinct, the scribes write cuneiform on clay and seal their tablets with cylinder seals; rations are measured out at the storehouses. Around it, the town of courtyard houses, the canals, the fields at harvest, the marshes. Walk anywhere: up the stair to the shrine, into the houses (E at a door). Markers say how well we know each thing: E to read. To watch cuneiform being written, click <b>Watch a scribe write cuneiform</b> under Things to do (top right).", 30);
  say("Uruk, about 3200 BC: dawn on a spring day at the barley harvest, in the largest city in the world. Before you, the stair up the Anu terrace to the White Temple, shining with whitewash; about 500 m east, Eanna, the precinct of Inanna, with its huge halls and walls of cone mosaic. Around you the city: houses in blocks along streets, canals with boats right through it. Beyond: the river, the fields and palm groves, villages, the marshes. Walk anywhere, go into the houses (E at a door), climb the terrace. Markers say how well we know each thing: E to read.", 28); }
addEventListener("keydown", e => { keys[e.code] = true; start();
  if (e.code === "Equal") speedI = Math.min(SPEEDS.length - 1, speedI + 1); if (e.code === "Minus") speedI = Math.max(0, speedI - 1);
  if (e.code === "KeyF") flying = !flying; if (e.code === "KeyE") interact(); if (e.code === "KeyM") MAPC.style.display = MAPC.style.display === "none" ? "" : "none";
  if (e.code === "KeyL") labelsOn = !labelsOn; if (e.code === "KeyT") cycleRate(); if (e.code === "KeyN") nextMoment(); });
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("wheel", e => { if (renderer.xr.isPresenting) return; speedI = clampN(speedI + (e.deltaY < 0 ? 1 : -1), 0, SPEEDS.length - 1); });
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
const RATES = [1, 10, 60]; function cycleRate() { timeRate = RATES[(RATES.indexOf(timeRate) + 1) % RATES.length]; say(`Time runs ${timeRate === 1 ? "at its real pace" : timeRate + " times faster"}.`, 4); drawGuide(); }
function groundAt(x, z) { if (INSIDE) return INSIDE.B.F.gy + 0.05; return Math.max(groundH(x, z), WATER - 1.4); }
function standSpot(x, z) { for (let r = 0; r < 80; r += 4) for (let a = 0; a < 6.28; a += r ? 0.5 : 7) { const X = x + Math.cos(a) * (r + 8), Z = z + Math.sin(a) * (r + 8), v = rGet(X, Z);
  if (groundH(X, Z) < 0.4 || v === 2 || v === 7) continue; const p = { x: X, z: Z }; pushOut(p); if (Math.hypot(p.x - X, p.z - Z) < 0.01) return [X, Z]; } return [x + 12, z + 12]; }
function teleport(x, z, lx, lz) { if (INSIDE) leaveBuilding(); P_.x = x; P_.z = z; P_.y = groundAt(x, z); yaw = Math.atan2(-(lx - x), -(lz - z)); if (renderer.xr.isPresenting) vrTurn = yaw; flying = false; updateGround(x, z, 99); if (typeof lodStep === "function") lodStep(true); }
// places and things to do
if (LATE) { const p = TEMPLE.IN(TEMPLE.PW.x1 + 30, 4); START.at = p; START.look = [0, 0]; P_.x = p[0]; P_.z = p[1]; yaw = Math.atan2(-(0 - p[0]), -(0 - p[1])); }
const PLACES = [{ name: LATE ? "Before the precinct gate (start)" : "Below the temple (start)", at: START.at, look: START.look }];
for (const m of MARKS) if (m.tag !== "person" && m.tag !== "typical" && !m.hidden && m.range > 200) PLACES.push({ name: m.name, m });
if (LATE) { const m = MARKS.find(q => q.name === "The statue of Enki"); if (m) PLACES.push({ name: m.name, m }); }
if (LATE && WRITE.on) PLACES.push({ name: "A scribe writing cuneiform", write: true });
function goPlace(p) { start(); if (p.write) { const [x, z, h] = WRITE.W0.fixed, m = MARKS.find(q => q.name === "A receipt being written"); if (SIM < hms(6, 0) || SIM > hms(18, 30)) SIM = hms(9, 0); const tp = WRITE.grp.visible ? WRITE.grp.position : V3(x + Math.sin(h) * 0.3, 0, z + Math.cos(h) * 0.3); teleport(x - Math.sin(h) * 0.3 + Math.cos(h) * 0.28, z - Math.cos(h) * 0.3 - Math.sin(h) * 0.28, tp.x, tp.z); pitch = -1.05; say(`<b>${m.name}</b> · <span style="color:${TAGC[m.tag]}">${TAGN[m.tag]}</span> · ${m.text}`, 40); return; } if (p.at) { teleport(p.at[0], p.at[1], p.look[0], p.look[1]); say(`<b>${p.name}</b>`, 5); return; } const [x, z] = standSpot(p.m.x, p.m.z + Math.min(40, p.m.r + 8)); teleport(x, z, p.m.x, p.m.z); say(`<b>${p.m.name}</b> · <span style="color:${TAGC[p.m.tag]}">${TAGN[p.m.tag]}</span> · ${p.m.text}`, 24); }
const TODO_LATE = LATE ? [["Watch a scribe write cuneiform", null, null, null, false, "@write"], ["Climb the ziggurat", TEMPLE.IN(TEMPLE.ZIG.w1 / 2 + 46, 6), [0, 0]], ["The scribes: tablets and seals", null, null, hms(9, 0), false, "The scribes"], ["The statue of Enki", null, null, null, false, "The statue of Enki"], ["Barley rations", null, null, hms(14, 35), false, "Barley rations"], ["The builders on the ramp", null, null, hms(8, 0), false, "The builders' ramp"],
  ["The brick kiln and stamped bricks", null, null, null, false, "The brick kiln"], ["The coppersmith", null, null, null, false, "The coppersmith"], ["Potter and weavers", null, null, null, false, "Potter and weavers"], ["The barley harvest", null, null, null, false, "The barley harvest"],
  ["Boat-builders and fishermen", null, null, null, false, "A reed boat"], ["Out into the marsh", null, null, null, false, "A fishing camp"], ["A hamlet on the river", null, null, null, false, "A hamlet"], ["The cargo boat (10:00)", null, null, T.sail - 300, false, "A reed boat"]] : null;
const TODO = TODO_LATE || [["Up to the White Temple", TL(TEMPLE.pw / 2 + 52, 0), [0, 0], null, true], ["Eanna, the precinct of Inanna", EANNA.IN(-40, -128), [EANNA.x, EANNA.z]], ["The Pillar Hall and its cone mosaics", null, null, null, false, "The Pillar Hall"], ["Temple D", null, null, null, false, "Temple D"],
  ["Where the first writing was found", null, null, null, false, "Where the first writing was found"], ["Canals through the city", null, null, null, false, "Canals through the city"], ["The potters and the kiln", null, null, null, false, "The potters"], ["The brick yard", null, null, null, false, "The brick yard"],
  ["The barley harvest", null, null, null, false, "The barley harvest"], ["Boat-builders and fishermen", null, null, null, false, "A reed boat"], ["Spinning, weaving, grinding", null, null, null, false, "The ground loom"], ["Out into the marsh", null, null, null, false, "A fishing camp"],
  ["A village", null, null, null, false, "A hamlet"], ["A boat comes in (10:00)", null, null, T.sail - 300, false, "A reed boat"], ["The herds come home (17:30)", [FLOCKS[1].home[0] * 1.2, FLOCKS[1].home[1] * 1.2], FLOCKS[1].g, T.herds + 900]];
function goTodo(k) { start(); const [name, at, look, tm, temple, mk] = TODO[k]; if (mk === "@write") return goPlace({ write: true }); if (tm !== undefined && tm !== null) { SIM = tm; narrI = -1; }
  let A = at, L = look; if (mk) { const m = MARKS.find(q => q.name === mk); if (m) { A = standSpot(m.x, m.z + 8); L = [m.x, m.z]; } }
  if (A) teleport(A[0], A[1], L[0], L[1]); say(`<b>${name}</b>`, 5); momentI = -1; drawGuide(); }
function goMoment(k) { start(); SIM = MOMENTS[k][1]; narrI = -1; momentI = k; drawGuide(); }
let momentI = 0; function nextMoment() { goMoment((momentI + 1) % MOMENTS.length); }
const TAGC = { known: "#9ad87a", inferred: "#f0c060", typical: "#8ab8f0", absent: "#e08a8a", person: "#d8a8f0" }, TAGN = { known: "known", inferred: "inferred: likely, not certain", typical: "typical: a stand-in", absent: "not yet", person: "person" };
const hm = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}`;
function drawGuide() { GUIDE.innerHTML = `<div style="margin-bottom:4px"><span data-era="1" style="cursor:pointer;color:#ffe9a8;text-decoration:underline">go to Eridu, about 4500 BC</span> · <span data-era="2" style="cursor:pointer;color:#ffe9a8;text-decoration:underline">Eridu, about 2040 BC</span></div><b>A spring day in Uruk, about 3200 BC</b> <span style="color:#c8b898">· click to go to the time</span>` + MOMENTS.map(([n, tm], i) => `<div data-m="${i}" style="cursor:pointer;padding:1px 4px">${hm(tm)} ${n}</div>`).join("") +
  `<b>Things to do</b> <span style="color:#c8b898">· click to go</span>` + TODO.map(([n], i) => `<div data-t="${i}" style="cursor:pointer;padding:1px 4px">✦ ${n}</div>`).join("") +
  `<div style="margin:6px 0 2px"><span data-r="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">time ×${timeRate} (T)</span> <span data-l="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">markers ${labelsOn ? "on" : "off"} (L)</span></div>` +
  `<b>Places</b> <span style="color:#c8b898">· click to go</span>` + PLACES.map((p, i) => `<div data-i="${i}" style="cursor:pointer;padding:1px 4px">${p.m ? `<span style="color:${TAGC[p.m.tag]}">●</span> ` : "◆ "}${p.name}</div>`).join("") +
  `<div style="color:#c8b898;font-size:11.5px;margin-top:6px"><span style="color:${TAGC.known}">●</span> known &nbsp;<span style="color:${TAGC.inferred}">●</span> inferred &nbsp;<span style="color:${TAGC.typical}">●</span> typical &nbsp;<span style="color:${TAGC.person}">●</span> people</div>`; }
GUIDE.addEventListener("click", e => { e.stopPropagation(); const d = e.target.closest("[data-i],[data-m],[data-r],[data-l],[data-t],[data-era]"); if (!d) return; if (d.dataset.era) { location.href = d.dataset.era === "2" ? "eridu.html?era=2040" : "eridu.html"; return; } if (d.dataset.t) return goTodo(+d.dataset.t); if (d.dataset.i) goPlace(PLACES[+d.dataset.i]); else if (d.dataset.m) goMoment(+d.dataset.m); else if (d.dataset.r) cycleRate(); else { labelsOn = !labelsOn; drawGuide(); } });
drawGuide();
function interact() { if (!started) return start();
  if (INSIDE) { const F = INSIDE.B.F, [dx, , dz] = gw(F, INSIDE.B.door[0], 0, INSIDE.B.door[1]); if (Math.hypot(P_.x - dx, P_.z - dz) < 1.6) return leaveBuilding(); }
  else { const B = buildingAtDoor(P_.x, P_.z); if (B) return enterBuilding(B); }
  let best = null, bd = 1e9; for (const m of MARKS) { const [x, z] = m.follow ? [m.follow.x, m.follow.z] : [m.x, m.z], d = Math.hypot(x - P_.x, z - P_.z); if (d < m.r && d / m.r < bd && (!m.follow || m.follow.shown)) { bd = d / m.r; best = m; } }
  let pa = null, pd = 3; for (const A of AG2) { if (!A.shown) continue; const d = Math.hypot(A.x - P_.x, A.z - P_.z); if (d < pd) { pd = d; pa = A; } }
  const named = pa && MARKS.find(m => m.follow === pa); if (named) best = named;
  if (best && (!pa || named || bd < 0.5)) return say(`<b>${best.name}</b> · <span style="color:${TAGC[best.tag]}">${TAGN[best.tag]}</span> · ${best.text}`, 26);
  if (pa) return say(DRESS[pa.L.priestess ? "priestess" : pa.L.role] || "A person of Uruk.", 14);
  if (best) return say(`<b>${best.name}</b> · <span style="color:${TAGC[best.tag]}">${TAGN[best.tag]}</span> · ${best.text}`, 26);
  say("Nothing to read right here. Walk up to a marker (or a person) and press E.", 6); }

// ---------- floating markers ----------
const zoneOf = () => null, INSIDE_H = null, inAbbey = () => false, personY = (x, z) => groundH(x, z), AB_F = 0;
// ---------- floating markers ----------
// A small tag hangs on a thin pin over each thing; the colour bar says how well it is known. Nearer and more important ones win
// when tags would overlap; the one you can read now (within reach) is lit and says "E to read".
const LBL = new THREE.Group(); scene.add(LBL);
const PIN_N = 256, pinGeo = new THREE.BufferGeometry(); pinGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PIN_N * 6), 3));
const pins = new THREE.LineSegments(pinGeo, new THREE.LineBasicMaterial({ color: 0xf2e8d6, transparent: true, opacity: 0.6, fog: false })); pins.frustumCulled = false; scene.add(pins);
const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PIN_N * 3), 3)); dotGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(PIN_N * 3), 3));
const dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ size: 7, sizeAttenuation: false, vertexColors: true, fog: false })); dots.frustumCulled = false; scene.add(dots);
function labelTex(m, active) { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"), name = m.name, sub = m.tag === "person" ? "person" : TAGN[m.tag].split(":")[0];
  g.font = "600 44px -apple-system, Helvetica, sans-serif"; const w = Math.min(500, Math.max(g.measureText(name).width + 56, 180));
  g.fillStyle = active ? "rgba(58,44,26,.92)" : "rgba(26,20,14,.72)"; g.beginPath(); g.roundRect((512 - w) / 2, 6, w, 110, 22); g.fill();
  if (active) { g.strokeStyle = "#ffe9a8"; g.lineWidth = 4; g.stroke(); }
  g.fillStyle = TAGC[m.tag]; g.beginPath(); g.roundRect((512 - w) / 2 + 12, 22, 9, 78, 4); g.fill();
  g.fillStyle = "#fff6e4"; g.textAlign = "center"; g.fillText(name, 256 + 8, 60, w - 46); g.font = "29px -apple-system, Helvetica, sans-serif"; g.fillStyle = active ? "#ffe9a8" : TAGC[m.tag]; g.fillText(active ? sub + "  ·  press E to read" : sub, 256 + 8, 98, w - 46);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function labelSprite(m) { m.tex = [labelTex(m, false), null]; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: m.tex[0], depthTest: true, fog: false, transparent: true })); s.center.set(0.5, 0); s.renderOrder = 10; LBL.add(s); return s; }
let ACTIVE_M = null; const _v = V3(0, 0, 0), _tc = new THREE.Color();
function readableMark() { let best = null, bd = 1e9; for (const m of MARKS) { const [x, z] = m.follow ? [m.follow.x, m.follow.z] : [m.x, m.z], d = Math.hypot(x - P_.x, z - P_.z); if (d < m.r && d / m.r < bd && (!m.follow || m.follow.shown)) { bd = d / m.r; best = m; } } return best; }
function updateLabels() { const cx = P_.x, cz = P_.z, cy = P_.y + 1.6, myZone = zoneOf(cx, cz), tanH = Math.tan(camera.fov * Math.PI / 360), asp = camera.aspect || 1.6, placed = [], cand = [];
  ACTIVE_M = readableMark();
  for (const m of MARKS) { let x = m.x, z = m.z, ay; if (m.follow) { if (!m.follow.shown) { if (m.spr) m.spr.visible = false; continue; } x = m.follow.x; z = m.follow.z; ay = personY(x, z) + 1.95; }
    const d = Math.hypot(x - cx, z - cz), mz = zoneOf(x, z), vis = labelsOn && !m.hidden && d < m.range && !INSIDE_H && (mz === myZone || d > 60 || m.big);
    if (!vis) { if (m.spr) m.spr.visible = false; continue; } if (ay === undefined) ay = (inAbbey(x, z) ? AB_F : groundH(x, z)) + (m.y ?? 8);
    cand.push({ m, x, z, ay, d, pri: (m === ACTIVE_M ? 1e6 : 0) + (m.big ? 1e4 : 0) - d }); }
  cand.sort((a, b) => b.pri - a.pri); let n = 0; const pp = pinGeo.attributes.position.array, dp = dotGeo.attributes.position.array, dc = dotGeo.attributes.color.array;
  for (const c of cand) { const m = c.m, D = Math.max(1, Math.hypot(c.d, c.ay - cy)), h = clampN(D * 0.033, 0.22, 46), pin = Math.min(h * 1.1, 6), ly = c.ay + pin;
    _v.set(c.x, ly + h / 2, c.z).project(camera); const hn = h / (D * tanH), wn = hn * 4 / asp, box = [_v.x - wn / 2, _v.y - hn / 2, _v.x + wn / 2, _v.y + hn / 2];
    const onScreen = _v.z < 1 && Math.abs(_v.x) < 1.3 && Math.abs(_v.y) < 1.3; if (onScreen && placed.some(b => b[0] < box[2] && b[2] > box[0] && b[1] < box[3] && b[3] > box[1])) { if (m.spr) m.spr.visible = false; continue; }
    if (onScreen) placed.push(box); if (!m.spr) m.spr = labelSprite(m); const act = m === ACTIVE_M; if (act && !m.tex[1]) m.tex[1] = labelTex(m, true);
    const want = m.tex[act ? 1 : 0]; if (m.spr.material.map !== want) { m.spr.material.map = want; m.spr.material.needsUpdate = true; }
    m.spr.material.opacity = act ? 1 : clampN(1.25 - c.d / m.range, 0.45, 1); m.spr.position.set(c.x, ly, c.z); m.spr.scale.set(h * 4, h, 1); m.spr.visible = true;
    if (n < PIN_N) { pp.set([c.x, c.ay, c.z, c.x, ly + h * 0.05, c.z], n * 6); dp.set([c.x, c.ay, c.z], n * 3); _tc.set(TAGC[m.tag]); dc.set([_tc.r, _tc.g, _tc.b], n * 3); n++; } }
  pinGeo.setDrawRange(0, n * 2); dotGeo.setDrawRange(0, n); pinGeo.attributes.position.needsUpdate = true; dotGeo.attributes.position.needsUpdate = true; dotGeo.attributes.color.needsUpdate = true; }

// ---------- the map ----------
const MX0 = RX0, MZ0 = RZ0, MW = RW * RC, MH = RH * RC, MPX = 10, MAPBASE = document.createElement("canvas"); MAPBASE.width = Math.ceil(MW / MPX); MAPBASE.height = Math.ceil(MH / MPX);
{ const g = MAPBASE.getContext("2d"), W = MAPBASE.width, Hh = MAPBASE.height, img = g.createImageData(W, Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const x = MX0 + i * MPX, z = MZ0 + j * MPX, k = 4 * (j * W + i), v = rGet(x, z), h = baseH(x, z); let r = 176, gr = 160, b = 120;
    if (h < WATER) { r = 80; gr = 104; b = 100; } else if (marshMask(x, z) > 0.1) { r = 104; gr = 128; b = 80; } else if (desertness(x, z) > 0.4) { r = 214; gr = 190; b = 140; } else if (v === 1) { r = 200; gr = 180; b = 140; } else if (v === 2) { r = 130; gr = 96; b = 64; } else if (v === 4) { r = 236; gr = 226; b = 200; } else if (v === 5) { r = 210; gr = 190; b = 110; } else if (v === 9) { r = 90; gr = 120; b = 70; } else if (v === 10) { r = 190; gr = 176; b = 150; } else if (v === 3 || v === 8) { r = 170; gr = 150; b = 110; }
    img.data[k] = r; img.data[k + 1] = gr; img.data[k + 2] = b; img.data[k + 3] = 255; }
  g.putImageData(img, 0, 0); for (const H of HOUSES) { const i = (H.x - MX0) / MPX, j = (H.z - MZ0) / MPX; g.fillStyle = H.reed ? "#c8b080" : "#e8dcc4"; g.fillRect(i - 1.2, j - 1.2, 2.4, 2.4); } }
function drawMap(target, size, span) { const g = target.getContext("2d"), k0 = 1 / MPX, px = (P_.x - MX0) * k0, pz = (P_.z - MZ0) * k0, sp = span * k0;
  g.fillStyle = "#3a3228"; g.fillRect(0, 0, size, size); g.drawImage(MAPBASE, px - sp / 2, pz - sp / 2, sp, sp, 0, 0, size, size);
  const k = size / span, to = (x, z) => [size / 2 + (x - P_.x) * k, size / 2 + (z - P_.z) * k];
  g.font = `600 ${Math.round(size / 24)}px -apple-system, Helvetica, sans-serif`; g.textAlign = "center";
  for (const m of MARKS) { if (m.follow || m.tag === "typical" || m.hidden || (!m.big && m.range < span * 0.6)) continue; const [u, v] = to(m.x, m.z); if (u < -40 || v < -20 || u > size + 40 || v > size + 20) continue;
    g.fillStyle = TAGC[m.tag]; g.beginPath(); g.arc(u, v, size / 90, 0, 6.283); g.fill(); g.fillStyle = "#fff6dc"; g.fillText(m.name.replace(/\(.*\)/, ""), u, v - size / 50); }
  g.save(); g.translate(size / 2, size / 2); g.rotate(-yawNow()); g.fillStyle = "#ff5a3a"; g.beginPath(); g.moveTo(0, -size / 28); g.lineTo(size / 50, size / 50); g.lineTo(-size / 50, size / 50); g.closePath(); g.fill(); g.restore();
  g.fillStyle = "#f4ead8"; g.textAlign = "left"; g.fillText(`N ↑ · ${span >= 1000 ? span / 1000 + " km" : span + " m"} across · click to zoom`, 8, size - 8); }
const MAP_SPANS = [600, 2000, 8000]; let mapSpanI = 1;
MAPC.addEventListener("click", e => { e.stopPropagation(); mapSpanI = (mapSpanI + 1) % MAP_SPANS.length; });
function yawNow() { const d = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); return Math.atan2(-d.x, -d.z); }

// ---------- VR ----------
// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0, placeI = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 360; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.197), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false, fog: false }));
vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.3, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(line1, line2) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 360); g.fillStyle = "rgba(30,24,18,.82)"; g.beginPath(); g.roundRect(0, 0, 1024, 360, 22); g.fill();
  const wrap = (txt, y, sz, col, maxLines) => { g.fillStyle = col; g.font = `${sz}px -apple-system, Helvetica, sans-serif`; const words = txt.replace(/<[^>]+>/g, "").split(" "); let ln = "", n = 0;
    for (const w of words) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 26, y); y += sz * 1.25; ln = ""; if (++n >= maxLines) return; } ln += w + " "; } g.fillText(ln, 26, y); };
  wrap(line1, 52, 32, "#ffe9a8", 2); if (line2) wrap(line2, 140, 25, "#f4ead8", 8); vrT.needsUpdate = true; }
const wristC = document.createElement("canvas"); wristC.width = wristC.height = 512; const wristT = new THREE.CanvasTexture(wristC); wristT.colorSpace = THREE.SRGBColorSpace;
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: wristT, toneMapped: false, fog: false })); wrist.position.set(0, 0.05, 0.06); wrist.rotation.x = -1.0; wrist.visible = false;
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrTurn = yaw; vrPanel.visible = true; wrist.visible = true; vrDirty = true;
    s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); rig.rotation.set(0, 0, 0); vrPanel.visible = false; wrist.visible = false; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hudT = 0, mapT = 0, lblT = 0, loopErrs = 0;
const dayUp = new THREE.Color(), dayHor = new THREE.Color(), _c3 = new THREE.Color();
for (const H of HOUSES) { if (H.reed) gReedHut(H); else if (H.plain) gPlainHouse(H); else if (H.court) gCourtHouse(H); else gMudHouse(H); } gFlush(); buildKit(scene);
// the 250 m squares of houses: full detail near you, plain blocks further off
const LODS = new Map(); scene.traverse(o => { const k = o.userData && o.userData.key; if (!o.isMesh || typeof k !== "string" || !/^[HL]-?\d/.test(k)) return; const c = k.slice(1).split("|")[0]; if (!LODS.has(c)) { const [i, j] = c.split(",").map(Number); LODS.set(c, { x: (i + 0.5) * LOD_CELL, z: (j + 0.5) * LOD_CELL, H: [], L: [], near: null, far: null }); } LODS.get(c)[k[0]].push(o); });
for (const k in KIT) { const at = k.indexOf("@"); if (at < 0 || !KIT[k].im) continue; const c = k.slice(at + 1); if (!LODS.has(c)) { const [i, j] = c.split(",").map(Number); LODS.set(c, { x: (i + 0.5) * LOD_CELL, z: (j + 0.5) * LOD_CELL, H: [], L: [], near: null, far: null }); } (LODS.get(c).K ||= []).push([KIT[k].im, kitNear(k) * (IS_HEADSET ? 0.75 : 1)]); }
const LOD_LIST = [...LODS.values()], LOD_NEAR = IS_HEADSET ? 300 : 400, LOD_FAR = IS_HEADSET ? 3600 : 5200; let lodTick = 0;
function lodStep(force) { if (!force && (lodTick++ % 8)) return; for (const C of LOD_LIST) { const d = Math.hypot(C.x - P_.x, C.z - P_.z), near = d < LOD_NEAR + (C.near ? 60 : 0), far = d > LOD_FAR; if (near === C.near && far === C.far) continue; C.near = near; C.far = far; for (const m of C.H) m.visible = near; for (const m of C.L) m.visible = !near && !far; }
  for (const C of LOD_LIST) if (C.K) { const d = Math.hypot(C.x - P_.x, C.z - P_.z); for (const [im, r] of C.K) im.visible = d < r; } }
P_.y = groundAt(P_.x, P_.z); updateGround(P_.x, P_.z, 99); lodStep(true);
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e.stack || e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  if (started) SIM += dt * timeRate; if (SIM > hms(24)) SIM -= hms(24);
  let ni = -1; for (let k = 0; k < NARR.length; k++) if (SIM >= NARR[k][0]) ni = k;
  if (ni !== narrI) { narrI = ni; if (ni >= 0 && started) say(`<b>${hm(NARR[ni][0])}</b> · ${NARR[ni][1]}`, 24); }
  let mx = 0, my = 0, run = 1, up = 0;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) nextMoment(); if (tap("L", gp, 5)) cycleRate(); }
      else { if (gp.buttons[0]?.value > 0.3) run = 3; if (tap("R", gp, 4)) interact(); if (tap("R", gp, 5)) { placeI = (placeI + 1) % PLACES.length; goPlace(PLACES[placeI]); }
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3 && Math.abs(ay) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 3; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; if (flying) up = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0); }
  fwd.y = 0; fwd.normalize(); side.crossVectors(fwd, UP).normalize();
  const sp = SPEEDS[speedI][0] * run;
  if (mx || my) { const ox = P_.x, oz = P_.z; P_.x += (fwd.x * -my + side.x * mx) * sp * dt; P_.z += (fwd.z * -my + side.z * mx) * sp * dt;
    const high = flying && P_.y > groundAt(P_.x, P_.z) + 6; if (INSIDE) { flying = false; insideClamp(P_); } else if (!high) pushOut(P_);
    if (!flying && groundAt(P_.x, P_.z) < -0.8 && groundH(P_.x, P_.z) < groundH(ox, oz)) { P_.x = ox; P_.z = oz; }   // too deep to wade further in; but you can always wade out
    if (!flying && !INSIDE && groundAt(P_.x, P_.z) > P_.y + 0.75) { P_.x = ox; P_.z = oz; } }   // too high a step: a wall   // the river is too deep to wade
  const g = groundAt(P_.x, P_.z);
  if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + Math.max(3.2, sp * 1.2) * dt) : Math.max(g, P_.y - Math.max(7, sp) * dt);
  rig.position.set(P_.x, P_.y + (vr && SITTING ? 0.45 : 0), P_.z);
  updateGround(P_.x, P_.z);
  boatsStep(t); lifeStep(dt, t); beastStep(t); reedStep(); cropStep(); writeStep(); smokeStep(dt); lodStep();
  for (const f of TECH_ANIM) f(t, dt);
  if (INSIDE) { sun.intensity *= 0.1; hemi.intensity *= 0.22; houseLight.intensity = 9 * (0.88 + 0.08 * Math.sin(t * 13) + 0.04 * Math.sin(t * 29)); INSIDE.G.traverse(o => { if (o.userData.fire) o.scale.y = o.userData.fire0 ?? (o.userData.fire0 = o.scale.y), o.scale.y = o.userData.fire0 * (0.8 + 0.3 * Math.sin(t * 11 + o.id)); }); }
  { const hh = !INSIDE && TEMPLE.hallAt(P_.x, P_.y, P_.z); TEMPLE.light.intensity = hh ? 40 : 0; if (hh) { TEMPLE.light.position.set(...hh.lp); sun.intensity *= 0.25; hemi.intensity *= 0.45; } }
  // the sun, sky and light
  const hour = SIM / 3600, S = sunAt(hour), el = S.el, day = clampN(el * 7 + 0.35, 0, 1), dusk = clampN(1 - el * 9, 0, 1) * (el > -0.12 ? 1 : 0);
  sun.position.copy(rig.position).addScaledVector(S.dir, 800); sun.target.position.copy(rig.position);
  sun.intensity = 3.0 * clampN(el * 6, 0, 1); sun.color.setRGB(1, 0.9 - 0.25 * dusk, 0.78 - 0.4 * dusk); hemi.intensity = 0.3 + 1.3 * day; hemi.color.setRGB(0.55 + 0.45 * day, 0.62 + 0.38 * day, 0.85 + 0.15 * day);   // a little moon and starlight at night
  dayUp.setRGB(0.3, 0.48, 0.78).multiplyScalar(0.04 + 0.96 * day); dayHor.setRGB(0.82, 0.8, 0.74).multiplyScalar(0.05 + 0.95 * day); dayHor.lerp(_c3.setRGB(0.98, 0.6, 0.38), dusk * 0.55);
  skyMat.uniforms.up.value.copy(dayUp); skyMat.uniforms.hor.value.copy(dayHor); scene.fog.color.copy(dayHor); sky.position.copy(rig.position);
  sunDisc.position.copy(rig.position).addScaledVector(S.dir, 20000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.03;
  water.position.x = Math.round(P_.x / 500) * 500; water.position.z = Math.round(P_.z / 500) * 500;
  lblT -= dt; if (lblT <= 0) { lblT = 0.15; updateLabels(); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.25; if (MAPC.style.display !== "none" && !vr) drawMap(MAPC, 240, MAP_SPANS[mapSpanI]); if (vr) { drawMap(wristC, 512, MAP_SPANS[mapSpanI]); wristT.needsUpdate = true; } }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3;
    let nearM = null, nd = 1e9; for (const m of MARKS) { if (m.follow || m.hidden) continue; const d = Math.hypot(m.x - P_.x, m.z - P_.z); if (d < m.r && d < nd) { nd = d; nearM = m; } }
    const hh2 = TEMPLE.hallAt(P_.x, P_.y, P_.z), ec = (() => { const dx = P_.x - EANNA.x, dz = P_.z - EANNA.z, c = Math.cos(EANNA.ry), sn = Math.sin(EANNA.ry); return Math.abs(dx * c - dz * sn) < 140 && Math.abs(dx * sn + dz * c) < 120; })(), street = hh2 ? hh2.name : P_.y > TEMPLE.base + 6 && Math.hypot(P_.x, P_.z) < 80 ? "on the Anu terrace" : ec ? "in Eanna, the precinct of Inanna" : Math.hypot(P_.x - CITY.x, P_.z - CITY.z) < CITY.r ? "in the city" : marshMask(P_.x, P_.z) > 0.15 ? "in the marsh" : desertness(P_.x, P_.z) > 0.4 ? "on the desert edge" : "in the country round Uruk";
    const DB = INSIDE ? null : buildingAtDoor(P_.x, P_.z), where = INSIDE ? "inside · E near things to read · E at the door to go out" : DB ? "at a door · <b>E: go inside</b>" : nearM ? `at <b>${nearM.name}</b> · E to read` : street;
    HUD.innerHTML = `<b>Uruk, a spring day about 3200 BC</b> · ${hm(SIM)}${timeRate > 1 ? ` (time ×${timeRate})` : ""} · ${flying ? "flying" : SPEEDS[speedI][1] + (run > 1 ? ", running" : "")}<br>${where}<br><span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · shift run · − / = pace · E read · N next moment · T time speed · L markers · F fly · M map</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(`${hm(SIM)} · ${where.replace(/<[^>]+>/g, "")}`, msgText || "Left stick walk · right stick turn · trigger run · A read · B next place · X next moment · Y time speed"); vrDirty = false; } }
  renderer.render(scene, camera);
}
