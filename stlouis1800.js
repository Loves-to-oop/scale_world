// stlouis1800.js -- St. Louis in the spring of 1800: the French village on its limestone terrace above the Mississippi, capital of
// Spanish Upper Louisiana. Built into stlouis1800.html by build.py. A walkable reconstruction at real size.
//
// What it rests on (see the notes by each part): the village's plan of 1764 (Laclède and Auguste Chouteau: three streets along the
// river, La Grande Rue, Rue de l'Église and Rue des Granges, crossed by lanes, blocks of 300 by 240 French feet), the Spanish census
// of 1799 (925 people in the town), the survey and sketches of the 1790s (Collot's plan of 1796; the Hutchins and Perrin du Lac
// descriptions), Frederic Billon's Annals of St. Louis, J. Thomas Scharf's History, the Chouteau papers, studies of French colonial
// building in the Mississippi valley (Peterson; Edwards; the Bolduc and Amoureux houses at Ste. Genevieve, which still stand), and the
// archaeology of the Arch grounds. What is not known (most single houses, the exact line of the river bank in 1800, the forts' final
// form) is filled with typical buildings of the time, and every marker says whether a thing is known, inferred, or typical.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const Q = new URLSearchParams(location.search), SEED = Math.max(1, Number(Q.get("seed") || 1) | 0);
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


// ---------- the people of St. Louis, 1800 ----------
// The census of 1799 counted 925 people in the town: French Creoles born in the Illinois country or Canada, a few from France, Spain
// and the new United States; about 268 enslaved Black people and 56 free people of colour. Osage, Sauk, Fox, Kickapoo and other
// nations came to trade. Dress after the inventories, travellers' accounts (Perrin du Lac, Collot) and paintings of the time:
// Creole men in linen or cotton shirts, breeches or long trousers, a waistcoat, often a blue or madras kerchief tied over the head;
// the better-off in a coat and a round hat or tricorne, the hair in a queue; voyageurs in a red wool cap, a woven sash, breechcloth and
// leggings; Creole women in a skirt and short jacket (casaquin), an apron, a kerchief at the neck and a cap or madras headwrap; Black
// women in the tignon headwrap; Spanish soldiers of the Louisiana Regiment in white coats faced with blue; Osage men with shaved heads,
// a scalp lock and roach, a blanket, breechcloth and leggings; the priest in a black cassock.
const SK_E = [0xe8c4a8, 0xdcb494, 0xf0d0b8, 0xd8a888, 0xe0b898], SK_A = [0x6a4a32, 0x4e3626, 0x7a5a3e, 0x3e2a1e, 0x8a6446], SK_N = [0xa87a56, 0x9a6a48, 0xb08a64, 0x8e6242];
// cloth: undyed linen and cotton (off-white), indigo blues, browns and butternut, checked and striped cottons (shown plain), madras red and yellow
const LINEN = [0xe8e2d2, 0xdcd4c0, 0xd2c8b0, 0xc8bea4], WORK = [0x4a5a7a, 0x3a4a6a, 0x6a5a44, 0x8a7a5a, 0x5a4a3a, 0x7a6a50, 0x9a8a6a], FINE = [0x2a3a5a, 0x1e2a44, 0x5a2a2a, 0x3a4a3a, 0x4a3a2a, 0x6a6a72, 0x2a2a2a], MADRAS = [0xb83a2a, 0xc8902a, 0x2a4a8a, 0xa82a3a, 0xd8b04a];
const HAIRS = [0x3a2618, 0x5a3a20, 0x7a5a32, 0x2a1c12, 0x6a4a2a, 0x1a120c];
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
  hairShort: G1(faceCap(0.108, Math.PI * 0.52, Math.PI * 0.3, Math.PI * 0.42).scale(0.9, 1.12, 1.04).translate(0, 0.672, -0.006)),
  queue: mergeG([[new THREE.CylinderGeometry(0.016, 0.022, 0.2, 6), MT(0, 0.55, -0.1, 1, 1, 1, 0.25, 0)], [new THREE.BoxGeometry(0.05, 0.02, 0.02), MT(0, 0.63, -0.095)]]),   // the hair tied back in a queue with a ribbon
  hairLong: mergeG([[faceCap(0.108, Math.PI * 0.56, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [foldTube(0.085, 0.1, 0.3, 12, 9, 0.12, Math.PI * 0.85, Math.PI * 0.425), MT(0, 0.52, -0.025)]]),
  roach: mergeG([[new THREE.BoxGeometry(0.035, 0.09, 0.22), MT(0, 0.8, -0.02)], [new THREE.CylinderGeometry(0.012, 0.006, 0.22, 4), MT(0, 0.68, -0.115, 1, 1, 1, 0.35, 0)]]),   // a deer-hair roach and the scalp lock on a shaved head
  tricorne: mergeG([[new THREE.CylinderGeometry(0.205, 0.205, 0.02, 3), MT(0, 0.765, 0.01)], [new THREE.CylinderGeometry(0.17, 0.2, 0.07, 3, 1, true), MT(0, 0.8, 0.01)], [new THREE.CylinderGeometry(0.095, 0.1, 0.1, 12), MT(0, 0.81, 0)]]),   // the three-cornered hat, one point forward
  roundHat: mergeG([[new THREE.CylinderGeometry(0.17, 0.17, 0.014, 16), MT(0, 0.765, 0)], [new THREE.CylinderGeometry(0.092, 0.1, 0.14, 14), MT(0, 0.84, 0)]]),   // the round hat of the 1790s
  tuque: mergeG([[new THREE.CylinderGeometry(0.108, 0.108, 0.05, 12, 1, true), MT(0, 0.74, -0.005)], [new THREE.ConeGeometry(0.1, 0.26, 10), MT(0, 0.83, -0.08, 1, 1, 1, -0.9, 0)]]),   // the voyageur's red knitted cap, its top hanging back
  kerchief: mergeG([[faceCap(0.116, Math.PI * 0.55, Math.PI * 0.28, Math.PI * 0.48), MT(0, 0.673, -0.008, 0.93, 1.13, 1.06)], [new THREE.SphereGeometry(0.035, 6, 4), MT(0, 0.68, -0.125)], [new THREE.BoxGeometry(0.06, 0.08, 0.01), MT(0.02, 0.62, -0.13, 1, 1, 1, 0, 0.4)]]),   // a madras kerchief knotted at the back
  tignon: mergeG([[faceCap(0.118, Math.PI * 0.56, Math.PI * 0.27, Math.PI * 0.48), MT(0, 0.673, -0.008, 0.93, 1.13, 1.06)], [new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, 0.76, -0.02, 0.95, 0.75, 1.0)], [new THREE.SphereGeometry(0.035, 6, 4), MT(0.03, 0.83, 0.05)]]),   // the tignon, wrapped high
  mobcap: mergeG([[faceCap(0.118, Math.PI * 0.6, Math.PI * 0.27, Math.PI * 0.5), MT(0, 0.674, -0.008, 0.93, 1.13, 1.06)], [new THREE.TorusGeometry(0.11, 0.014, 4, 18, Math.PI * 1.2).rotateX(-0.3), MT(0, 0.705, 0.0, 1, 1, 1, 0, 0)]]),   // a white linen cap with a frill
  coat: G1(foldTube(0.175, 0.28, 0.86, 20, 6, 0.06, Math.PI * 0.42, Math.PI * 0.21, 3).scale(1, 1, 0.82).translate(0, 0.08, -0.01)),   // a coat, open in front, its skirts to the knee
  vest: G1(new THREE.LatheGeometry([[0.148, -0.06], [0.138, 0.12], [0.158, 0.25], [0.172, 0.34], [0.176, 0.42], [0.126, 0.49]].map(([r, y]) => new THREE.Vector2(r, y)), 14).scale(1, 1, 0.7)),
  skirt: G1(foldTube(0.15, 0.3, 0.86, 22, 9, 0.07, 0, 0, 2).scale(1, 1, 0.82).translate(0, -0.37, 0)),
  jacket: G1(foldTube(0.165, 0.235, 0.42, 18, 6, 0.05, 0, 0, 4).scale(1, 1, 0.78).translate(0, 0.25, 0)),   // the casaquin, a short jacket over the skirt
  apron: G1(new THREE.PlaneGeometry(0.32, 0.62).translate(0, -0.28, 0.215)),
  fichu: mergeG([[new THREE.TorusGeometry(0.105, 0.026, 4, 14).rotateX(Math.PI / 2), MT(0, 0.47, 0.01, 1, 1, 0.75)], [new THREE.ConeGeometry(0.08, 0.16, 3).rotateX(Math.PI), MT(0, 0.38, 0.115, 1, 1, 0.3)]]),   // a kerchief round the neck, crossed on the breast
  sash: mergeG([[new THREE.CylinderGeometry(0.148, 0.148, 0.1, 14, 1, true), MT(0, 0.06, 0, 1, 1, 0.72)], [new THREE.BoxGeometry(0.06, 0.38, 0.02), MT(0.1, -0.15, 0.11)], [new THREE.BoxGeometry(0.06, 0.32, 0.02), MT(0.04, -0.12, 0.115)]]),   // the woven sash, its ends hanging
  belt: mergeG([[new THREE.CylinderGeometry(0.142, 0.142, 0.035, 14, 1, true), MT(0, 0.07, 0, 1, 1, 0.72)], [new THREE.BoxGeometry(0.05, 0.05, 0.02), MT(0, 0.07, 0.105)]]),
  breechcloth: mergeG([[new THREE.BoxGeometry(0.2, 0.42, 0.012), MT(0, -0.14, 0.15)], [new THREE.BoxGeometry(0.2, 0.42, 0.012), MT(0, -0.14, -0.14)]]),
  robe: G1(foldTube(0.19, 0.36, 0.96, 20, 8, 0.1, 0, 0, 4).scale(1, 1, 0.8).translate(0, -0.02, -0.005)),   // a trade blanket worn as a robe
  crossbelt: mergeG([[new THREE.BoxGeometry(0.04, 0.6, 0.012), MT(0, 0.24, 0.125, 1, 1, 1, 0, 0.62)], [new THREE.BoxGeometry(0.04, 0.6, 0.012), MT(0, 0.24, 0.128, 1, 1, 1, 0, -0.62)]]),   // white crossbelts over the soldier's coat
  musket: mergeG([[new THREE.CylinderGeometry(0.012, 0.014, 1.15, 6), MT(0, 0.42, 0)], [new THREE.BoxGeometry(0.04, 0.42, 0.07), MT(0, -0.3, 0.01)], [new THREE.CylinderGeometry(0.005, 0.005, 0.32, 4), MT(0, 1.12, 0)]]),   // a flintlock musket with its bayonet
  beard: G1(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.62).scale(0.9, 1.2, 0.8).translate(0, 0.625, 0.04)) };
const PARTS = ["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "torso", "head", "eyeW", "eyes", "brows", "hairShort", "queue", "hairLong", "roach",
  "tricorne", "roundHat", "tuque", "kerchief", "tignon", "mobcap", "coat", "vest", "skirt", "jacket", "apron", "fichu", "sash", "belt", "breechcloth", "robe", "crossbelt", "musket", "beard"];
const PGEO = { legL: PG.thigh, legR: PG.thigh, shinL: PG.shin, shinR: PG.shin, shoeL: PG.shoe, shoeR: PG.shoe, armL: PG.uarm, armR: PG.uarm, foreL: PG.farm, foreR: PG.farm, handL: PG.hand, handR: PG.hand };
for (const k in PG) if (!PG[k].attributes.color) PG[k] = G1(PG[k]);
const METAL = new Set(["musket"]);
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide, vertexColors: true });
// roles: creole (a Creole man), woman, child, enslaved (an enslaved man), enslavedw (an enslaved woman), merchant, lady, voyageur, soldier,
// osage (an Osage man), osagew (an Osage woman), priest
function looks(i, role) { const h = k => hash(i * 13 + k, 77), pick = (A, k) => A[(h(k) * A.length) | 0];
  let r = role || (h(1) < 0.27 ? "woman" : h(2) < 0.22 ? "child" : h(3) < 0.3 ? (h(4) < 0.5 ? "enslaved" : "enslavedw") : h(5) < 0.07 ? (h(4) < 0.5 ? "merchant" : "lady") : h(6) < 0.14 ? "voyageur" : "creole");
  const black = r === "enslaved" || r === "enslavedw" || (r === "child" && h(8) < 0.3) || ((r === "creole" || r === "woman") && h(9) < 0.07), native = r === "osage" || r === "osagew";
  const L = { role: r, s: 0.92 + h(5) * 0.12, skin: native ? pick(SK_N, 4) : black ? pick(SK_A, 4) : pick(SK_E, 4), hair: black || native ? 0x1a120c : h(30) < 0.1 ? 0x8a8478 : pick(HAIRS, 6),
    shirt: pick(LINEN, 7), leg: pick(WORK, 8), shin: pick(LINEN, 10), shoes: h(21) < 0.5 ? 0x2a2018 : 0x8a6a48, coat: null, vest: null, head: null, headCol: pick(MADRAS, 11), skirtC: pick(WORK, 12), jacketC: pick(LINEN.concat(WORK), 13),
    apron: h(14) < 0.7, apronC: pick(LINEN, 15), fichu: h(16) < 0.6, sash: null, beard: h(24) < 0.06, queue: false, girl: h(29) < 0.5, robeC: null, black };
  if (r === "creole") Object.assign(L, { head: h(17) < 0.45 ? "kerchief" : h(17) < 0.6 ? "roundHat" : null, vest: h(18) < 0.4 ? pick(WORK, 19) : null, shin: h(20) < 0.5 ? L.leg : L.shin, queue: h(22) < 0.3, shoes: h(21) < 0.35 ? 0x8a6a48 : 0x2a2018 });   // long trousers or breeches; moccasins or shoes
  if (r === "merchant") Object.assign(L, { coat: pick(FINE, 19), vest: pick([0xe8dcc0, 0xc8a860, 0x8a2a2a, 0xd8d0c0], 18), leg: pick([0xd8ccae, 0x2a2a2a, 0x4a3a2a, 0xc8b890], 8), shin: 0xe8e4dc, head: h(17) < 0.6 ? "roundHat" : "tricorne", queue: true, shoes: 0x1a1410, s: 0.96 + h(5) * 0.1 });
  if (r === "lady") Object.assign(L, { skirtC: pick([0x6a3a4a, 0x3a4a6a, 0xd8ccb0, 0x5a6a5a, 0x8a5a3a], 12), jacketC: pick([0xe8dcc8, 0x3a4a6a, 0x6a3a4a], 13), apron: false, fichu: true, head: h(17) < 0.6 ? "mobcap" : "kerchief" });
  if (r === "woman") Object.assign(L, { head: L.black ? "tignon" : h(17) < 0.5 ? "mobcap" : "kerchief" });
  if (r === "enslavedw") Object.assign(L, { head: "tignon", skirtC: pick(WORK, 12), jacketC: pick(LINEN, 13), apron: h(14) < 0.8 });
  if (r === "enslaved") Object.assign(L, { head: h(17) < 0.4 ? "kerchief" : null, leg: pick(LINEN.concat(WORK), 8), shoes: h(21) < 0.5 ? 0x8a6a48 : 0x2a2018 }), L.shin = L.leg;
  if (r === "voyageur") Object.assign(L, { head: "tuque", headCol: 0xa82a22, sash: pick([0xb83a2a, 0x2a4a8a, 0xc8902a], 23), leg: pick([0x5a4a3a, 0x3a4a6a, 0x8a3a2a], 8), shoes: 0x8a6a48, shirt: pick([0x4a5a7a, 0x8a3a3a, 0xe8e2d2, 0x5a6a8a], 7) }), L.shin = L.leg;   // leggings and breechcloth, moccasins
  if (r === "soldier") Object.assign(L, { coat: 0xe8e4d8, vest: 0xe8e4d8, leg: 0xe8e4d8, shin: 0xe8e4dc, head: "tricorne", headCol: 0x1a1a1a, queue: true, shoes: 0x1a1410 });   // the Louisiana Regiment: white, faced with blue
  if (r === "osage") Object.assign(L, { robeC: h(25) < 0.5 ? pick([0xb82a22, 0x2a3a7a, 0xe8e2d4, 0x3a5a3a], 26) : null, leg: pick([0x8a6a48, 0x6a4a2a, 0xa83a2a, 0x2a3a6a], 8), shoes: 0x8a6a48, shirt: L.skin, s: 1.0 + h(5) * 0.1 }), L.shin = L.leg;   // the Osage were famous for their height
  if (r === "osagew") Object.assign(L, { skirtC: pick([0x2a3a6a, 0x8a2a2a, 0x6a4a2a], 12), jacketC: pick([0x8a6a48, 0xb82a22, 0x2a3a6a], 13), robeC: pick([0xb82a22, 0x2a3a7a, 0xe8e2d4], 26), apron: false, fichu: false, shoes: 0x8a6a48 });
  if (r === "priest") Object.assign(L, { skirtC: 0x15120f, jacketC: 0x15120f, shirt: 0x15120f, head: "tricorne", headCol: 0x15120f, apron: false, fichu: false, shoes: 0x1a1410 });
  if (r === "child") { L.s = 0.6 + h(5) * 0.16; L.head = h(17) < 0.25 ? (L.girl ? "mobcap" : "kerchief") : null; L.shin = L.leg; L.shoes = h(21) < 0.5 ? L.skin : 0x8a6a48; }   // many children barefoot
  return L; }
const isWoman = L => L.role === "woman" || L.role === "lady" || L.role === "enslavedw" || L.role === "osagew" || (L.role === "child" && L.girl);
function shows(L, p) { const r = L.role, w = isWoman(L), robed = w || r === "priest", man = !w && r !== "child" && r !== "priest";
  switch (p) {
    case "hairShort": return !w && r !== "osage" && !(L.head === "kerchief" || L.head === "tuque"); case "queue": return L.queue && man; case "hairLong": return w && !L.head; case "roach": return r === "osage";
    case "tricorne": case "roundHat": case "tuque": case "kerchief": case "tignon": case "mobcap": return L.head === p;
    case "coat": return !!L.coat; case "vest": return !!L.vest && !L.coat || (r === "merchant" || r === "soldier"); case "skirt": return robed; case "jacket": return robed && r !== "osagew" || r === "osagew"; case "apron": return w && L.apron; case "fichu": return w && L.fichu;
    case "sash": return !!L.sash; case "belt": return man && !L.sash && r !== "osage" && !L.coat; case "breechcloth": return r === "voyageur" || r === "osage"; case "robe": return !!L.robeC; case "crossbelt": case "musket": return r === "soldier"; case "beard": return man && L.beard;
    default: return true; } }
function colorOf(L, p) { const w = isWoman(L);
  if (p.startsWith("leg")) return w || L.role === "priest" ? L.skirtC : L.role === "osage" ? L.skin : L.leg; if (p.startsWith("shin")) return w || L.role === "priest" ? L.skirtC : L.role === "osage" ? L.leg : L.shin;
  if (p.startsWith("shoe")) return L.shoes; if (p.startsWith("hand") || p === "head") return L.skin;
  if (p.startsWith("arm") || p.startsWith("fore")) return L.coat ? L.coat : w || L.role === "priest" ? L.jacketC : L.role === "osage" ? L.skin : L.shirt;
  switch (p) { case "torso": return w || L.role === "priest" ? L.jacketC : L.role === "osage" ? L.skin : L.shirt; case "eyes": return 0x2a1e16; case "eyeW": return 0xe8e4dc; case "brows": case "hairShort": case "queue": case "hairLong": case "beard": return L.hair;
    case "roach": return 0xa82a22; case "tricorne": return L.role === "soldier" || L.role === "priest" ? 0x15120f : 0x2a2420; case "roundHat": return L.role === "merchant" ? 0x1a1612 : 0x5a4a38; case "tuque": return L.headCol; case "kerchief": return L.headCol; case "tignon": return L.headCol; case "mobcap": return 0xf0ece2;
    case "coat": return L.coat; case "vest": return L.vest || L.shirt; case "skirt": return L.skirtC; case "jacket": return L.jacketC; case "apron": return L.apronC; case "fichu": return 0xf2eee4; case "sash": return L.sash; case "belt": return 0x3a2a1c;
    case "breechcloth": return L.role === "osage" ? 0x6a4a2a : 0x3a4a6a; case "robe": return L.robeC; case "crossbelt": return 0xf4f2ea; case "musket": return 0x4a3a2a; } return 0xffffff; }
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
    case "sitground": Object.assign(P, { drop: HIPY - 0.12, lL: -1.4, lR: -1.3, kL: 0.4, kR: 0.6, lean: -0.15, aL: -0.3, aR: -0.4, eL: -0.6, eR: -0.8 - 0.2 * Math.max(0, Math.sin(t * 0.5 + ph)), sk: -1.0 }); break;   // sitting on the ground, legs out
    case "row": { sit(); const r = Math.sin(t * 2.4); Object.assign(P, { lean: 0.22 * r, aL: -1.05 - 0.35 * r, aR: -1.05 - 0.35 * r, eL: -0.4 + 0.35 * r, eR: -0.4 + 0.35 * r }); break; }
    case "paddle": { const r = Math.sin(t * 2.1 + ph); Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.25 + 0.15 * r, aL: -1.4 - 0.4 * r, aR: -0.6 - 0.5 * r, eL: -0.3, eR: -0.6 }); break; }   // kneeling in a dugout, paddling
    case "pole": { const q = (t * 0.35 + ph) % 1; Object.assign(P, { lean: 0.35 + 0.3 * Math.sin(q * 6.283), aL: -1.5 + 0.6 * q, aR: -1.3 + 0.6 * q, eL: -0.3, eR: -0.4, lL: 0.2, lR: -0.2 }); walk(0.5); break; }   // walking aft on the keelboat's running board, pushing on the setting pole
    case "hammer": { const q = (t * 1.6 + ph) % 1, up = q < 0.6 ? q / 0.6 : 1 - (q - 0.6) / 0.4; Object.assign(P, { lean: 0.22, lL: -0.1, lR: 0.12, kL: 0.15, kR: 0.1, aL: -0.55, eL: -0.9, aR: -0.5 - 1.9 * up, eR: -0.4 - 0.6 * up }); break; }
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

const _M = {}, LIMB = new Set(["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "musket"]), SKIRT = new Set(["skirt", "apron", "breechcloth"]);
function partMatrices(x, y, z, h, L, P, out) { _e2.set(0, h, 0); _q2.setFromEuler(_e2); _b.compose(_p.set(x, y, z), _q2, _s.set(L.s, L.s, L.s));
  _hm.copy(_b).multiply(_tmp.makeTranslation(0, HIPY - P.drop, 0)).multiply(_j.makeRotationX(P.lean)); _sk.copy(_hm).multiply(_j.makeRotationX(P.sk - P.lean * 0.5));
  const leg = (sx, l, k, side) => { const th = _b.clone().multiply(_tmp.makeTranslation(sx, HIPY - P.drop, 0)); if (P.spr) th.multiply(_tmp.makeRotationZ(P.spr * Math.sign(sx))); th.multiply(_j.makeRotationX(l));
    const sh = th.clone().multiply(_tmp.makeTranslation(0, -THIGH, 0)).multiply(_j.makeRotationX(k));
    _M["leg" + side] = th; _M["shin" + side] = sh; _M["shoe" + side] = sh.clone().multiply(_tmp.makeTranslation(0, -SHIN, 0)).multiply(_j.makeRotationX(-(l + k) * 0.85)); };
  leg(0.085, P.lL, P.kL, "L"); leg(-0.085, P.lR, P.kR, "R");
  const arm = (sx, a, e, sp, side) => { const u = _hm.clone().multiply(_tmp.makeTranslation(sx, 0.43, 0)).multiply(_j.makeRotationX(a)).multiply(_tmp.makeRotationZ(sp)), f = u.clone().multiply(_tmp.makeTranslation(0, -UARM, 0)).multiply(_j.makeRotationX(e)), hd = f.clone().multiply(_tmp.makeTranslation(0, -FARM, 0));
    _M["arm" + side] = u; _M["fore" + side] = f; _M["hand" + side] = hd; return [f, hd]; };
  arm(0.19, P.aL, P.eL, -0.07, "L"); const [, hR] = arm(-0.19, P.aR, P.eR, 0.07, "R");
  _M.musket = hR.clone().multiply(_tmp.makeTranslation(0, -0.04, 0.02)).multiply(_j.makeRotationX(-(P.aR + P.eR) - P.lean));   // held upright whatever the arm does
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



// ---------- the map: metres from the corner of La Grande Rue and the Rue de la Place (Main and Market streets) ----------
// x east, z south. The town was laid out along the river, so its streets run a little east of north; town coordinates (u across,
// toward the river; v along the streets, southward) are turned from the compass by GR. Lat/long as in today's maps: the corner
// of Main and Market lay in what is now the Gateway Arch grounds.
const LAT0 = 38.6252, LON0 = -90.1855, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110574;
const LL = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
const GR = 0.2, GC = Math.cos(GR), GS = Math.sin(GR);
const toXZ = (u, v) => [u * GC - v * GS, u * GS + v * GC], toUV = (x, z) => [x * GC + z * GS, -x * GS + z * GC];
function line(pts, metres) { const P = metres ? pts : pts.map(([a, b]) => LL(a, b)), S = [], cum = [0];
  for (let i = 1; i < P.length; i++) { S.push([P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]]); cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { P, S, cum, L: cum[cum.length - 1], box: [x0, x1, z0, z1],
    near(x, z, m) { return x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m; },
    d(x, z) { let best = 1e18; for (const [ax, az, bx, bz] of S) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0, ex = ax + t * dx - x, ez = az + t * dz - z, d2 = ex * ex + ez * ez; if (d2 < best) best = d2; } return Math.sqrt(best); },
    at(s) { s = clampN(s, 0, this.L); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])]; } }; }
const lineUV = pts => line(pts.map(([u, v]) => toXZ(u, v)), true);

// ---------- the land and the water ----------
// SOURCES: the town stood on the first terrace of the west bank, about 10-15 m above the river, on limestone that broke off in a
// bluff 6-9 m high along most of the front, with a gentler slope down to the landing below the Place d'Armes (Hutchins 1778; Collot
// 1796; Billon). Behind the town the ground rose again to a second ridge, where the Spanish built their tower in 1780, and beyond
// lay open prairie and the common fields. Mill Creek (La Petite Rivière) ran into the river south of the town; Laclède's mill dam
// (by 1800 Auguste Chouteau's) held back a long mill pond, Chouteau's Pond, in its valley west of the town. North, on the terrace,
// stood the mounds of the Mississippian people, abandoned 500 years before; the largest, which the French called La Grange de
// Terre, survived until 1869. The Mississippi was about 1.2 km wide here (the sand bar that became Bloody Island formed after
// 1800); its banks have since moved, and its line here is approximate. Level 0 is the river in its spring rise.
const WATER = 0;
// the river's centre line in town coordinates (u at each v), through points from today's course (the line used in the Cahokia program):
// nearly straight past the town, then bending south-west below Mill Creek toward the Meramec; RIVER_HW its half-width
const RIVER_CP = [[-14000, -1600], [-9000, -900], [-4996, -278], [-2097, 444], [-800, 600], [0, 660], [957, 690], [1700, 420], [2600, -120], [3662, -817], [5500, -1320], [8268, -1824], [14000, -2700]], RIVER_HW = 540;
const riverU = v => { const P = RIVER_CP; if (v <= P[0][0]) return P[0][1]; if (v >= P[P.length - 1][0]) return P[P.length - 1][1]; let i = 0; while (P[i + 1][0] < v) i++;
  const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)], t = (v - p1[0]) / (p2[0] - p1[0]), t2 = t * t, t3 = t2 * t;   // a Catmull-Rom curve through the points
  const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * (p2[0] - p1[0]), m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * (p2[0] - p1[0]);
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2; };
const BLUFF_TOP = v => 11.5 + 2.8 * sstepN(-v, -300, 1200) - 2.2 * sstepN(v, 500, 950);         // the terrace edge: higher to the north
const LANDING = [-12, 112];                                                                         // the slope down to the landing, below the Place d'Armes (v range)
const CREEK = v => 0, creekV = u => 965 + 35 * Math.sin(u / 280) + 0.03 * Math.max(0, -u - 800);  // Mill Creek's line: v at each u
const DAM_U = -820, POND_Y = 9.2, POND = { u0: -2700, u1: DAM_U };                                  // Chouteau's mill dam and pond
const [BMX, BMZ] = LL(38.64298, -90.18630), [BMU, BMV] = toUV(BMX, BMZ);                            // Big Mound (La Grange de Terre), at today's N. Broadway and Mound St.
const AROUND_FLAT = [];
// sandbars and young islands, growing willows; one opposite the town in these years became Bloody Island (u offset from the river's centre)
const ISLANDS = [{ v: -1250, du: 140, len: 900, w: 150 }, { v: 2300, du: -120, len: 700, w: 120 }];
const islandH = (u, v) => { let best = -99; for (const I of ISLANDS) { const ru = riverU(I.v) + I.du, q = Math.hypot((v - I.v) / (I.len / 2), (u - ru) / (I.w / 2)); if (q < 1.3) best = Math.max(best, lerpN(1.4, -2.5, sstepN(q, 0.6, 1.3))); } return best; };   // ground raised under the villages across the river (filled in below)
const MOUNDS = [{ u: BMU, v: BMV, w: 97.2, d: 48.2, h: 10.4, ridge: true, name: "La Grange de Terre (Big Mound)" }];
{ const R = seeded(1764); for (let k = 0; k < 9; k++) MOUNDS.push({ u: BMU - 120 - R() * 320, v: BMV + 120 + R() * 520, w: 18 + R() * 22, d: 16 + R() * 18, h: 1.2 + R() * 3.2 }); }
function baseH(x, z) { const [u, v] = toUV(x, z), ru = riverU(v), s = ru - RIVER_HW - u, n1 = fbm(x / 140, z / 140, 3), n2 = fbm(x / 900 + 7, z / 900, 3);
  let h;
  if (u > ru) { const se = u - ru - RIVER_HW; if (se < 0) return Math.max(-1.5 - 6 * sstepN(-se, 0, 160), islandH(u, v)); const sl = fbm(x / 420 + 4, z / 420, 3), sl2 = Math.abs(fbm(x / 1500 + 9, z / 1500 - 3, 3) - 0.5); h = 1.7 + 1.4 * n1 + 0.8 * n2 - 2.6 * sstepN(sl, 0.6, 0.68) * sstepN(se, 300, 700) - 2.4 * sstepN(0.03 - sl2, 0, 0.012) * sstepN(se, 500, 900);   // the American Bottom: ridges, sloughs and old channels holding water
    for (const [cu, cv, r] of AROUND_FLAT) { const d = Math.hypot(u - cu, v - cv); if (d < r) h = lerpN(Math.max(h, 2.6), h, sstepN(d, r * 0.7, r)); } return h; }   // the villages stand on the higher ground
  if (s < 0) return Math.max(-1.2 - 6 * sstepN(-s, 0, 140), islandH(u, v));                                                   // the river bed
  const top = BLUFF_TOP(v), lv = v > LANDING[0] && v < LANDING[1] ? Math.min(1, Math.min(v - LANDING[0], LANDING[1] - v) / 25) : 0;   // at the landing, a long slope instead of a bluff
  const beach = 0.4 + Math.min(s, 30) * 0.06, bluffAt = 32 + 3 * Math.sin(v / 90) + 4 * n1, cliff = sstepN(s, bluffAt, bluffAt + 9 + 6 * n1), ramp = sstepN(s, 18, 120);
  h = beach + (top - beach) * lerpN(cliff, ramp, lv);
  h += sstepN(s, bluffAt + 10, 400) * (0.004 * (s - bluffAt)) + 0.5 * (n1 - 0.5);                   // the terrace, rising gently westward
  h += 6.5 * sstepN(-u, 250, 420) + 9 * sstepN(-u, 900, 2400) + 6 * (n2 - 0.5) * sstepN(-u, 300, 900);   // the second ridge (the fort's hill) and the prairie beyond
  // Mill Creek's valley and the mill pond
  const cv = creekV(u), dv = Math.abs(v - cv), vw = clampN(55 + (-u) * 0.12, 55, 260);
  if (dv < vw + 80) { const floor = u > DAM_U ? lerpN(0.6, 5.2, clampN((-u) / -DAM_U, 0, 1)) : u > POND.u0 ? 7.2 : 7.2 + (POND.u0 - u) * 0.004;
    h = lerpN(Math.min(h, floor + dv * 0.02), h, sstepN(dv, vw * 0.55, vw + 80)); }
  { const du = Math.abs(u - DAM_U); if (du < 14 && Math.abs(v - cv) < vw + 60) h = Math.max(h, lerpN(POND_Y + 0.9, h, sstepN(du, 2.5, 14))); }   // the mill dam: an earth bank across the valley
  for (const Mo of MOUNDS) { const du = (u - Mo.u) / (Mo.w / 2), dvv = (v - Mo.v) / (Mo.d / 2), q = Mo.ridge ? Math.max(Math.abs(du), Math.abs(dvv) * 0.6 + Math.abs(du) * 0.4) : Math.hypot(du, dvv); if (q < 1.25) h += Mo.h * (q < 0.55 ? 1 : 1 - sstepN(q, 0.55, 1.25)); }
  if (FLATS.length && x > FLAT_BB[0] && x < FLAT_BB[1] && z > FLAT_BB[2] && z < FLAT_BB[3]) for (const R of FLATS) { const dx = x - R.x, dz = z - R.z; if (dx * dx + dz * dz > R.r2) continue; const lx = dx * R.c - dz * R.s, lz = dx * R.s + dz * R.c; if (Math.abs(lx) < R.hw && Math.abs(lz) < R.hd) h = R.exact ? lerpN(h, R.y, Math.min(1, (R.hw - Math.abs(lx)) / 3, (R.hd - Math.abs(lz)) / 3)) : Math.min(h, R.y); }
  return h; }
const FLAT_BB = [1e9, -1e9, 1e9, -1e9], FLATS = [], flatUnder = (F, w, d, y, exact = false) => { const r = Math.hypot(w, d) / 2 + 2; FLAT_BB[0] = Math.min(FLAT_BB[0], F.x - r); FLAT_BB[1] = Math.max(FLAT_BB[1], F.x + r); FLAT_BB[2] = Math.min(FLAT_BB[2], F.z - r); FLAT_BB[3] = Math.max(FLAT_BB[3], F.z + r); return FLATS.push({ x: F.x, z: F.z, c: F.c, s: F.s, hw: w / 2, hd: d / 2, y, exact, r2: (w * w + d * d) / 4 + 4 }); };
const groundH = baseH;
const inPond = (x, z) => { const [u, v] = toUV(x, z); return u < POND.u1 - 6 && u > POND.u0 - 400 && Math.abs(v - creekV(u)) < 300 && baseH(x, z) < POND_Y; };

// ---------- the streets of 1800 ----------
// Laclède's plan of 1764: three long streets parallel to the river: La Grande Rue (also Rue Royale; later Main Street), 36 French
// feet wide; Rue de l'Église (Church Street, later Second) and Rue des Granges (Barn Street, later Third), 30 feet; crossed every
// 300 feet by narrower lanes running down to the river. Two names are recorded in the 1790s for the cross streets here: the Rue de la
// Place (Market Street), running from the Place d'Armes, and the Rue de la Tour (Walnut), climbing to the tower. Blocks of 300 by
// 240 feet were divided into lots, mostly quarters of a block, each fenced with upright pickets. The streets were dirt, dusty or deep
// in mud. The town ran about 1.5 km along the river in 1800.
const FT = 0.3248, STREET_U = [0, -90, -180], CROSS_V = [], TOWN_V = [-800, 800];   // French feet; the long streets' u; the cross streets' v
for (let v = -800; v <= 800; v += 100) CROSS_V.push(v);
const STREETS = [
  { name: "La Grande Rue (Main Street)", w: 36 * FT, L: lineUV([[0, -1150], [0, 840]]) }, { name: "Rue de l'Église (Church Street)", w: 30 * FT, L: lineUV([[-90, -820], [-90, 820]]) }, { name: "Rue des Granges (Barn Street)", w: 30 * FT, L: lineUV([[-180, -820], [-180, 820]]) },
  ...CROSS_V.map(v => ({ name: v === 0 ? "Rue de la Place (Market Street)" : v === 100 ? "Rue de la Tour (Walnut Street)" : "a cross street", w: 26 * FT, L: lineUV([[v === 100 ? -320 : -232, v], [v === 0 || v === 100 ? 70 : 30, v]]) })),
  { name: "the road north to St. Ferdinand", w: 6, L: lineUV([[0, -1150], [20, -1700], [60, -2400], [40, -3400]]) },
  { name: "the road to the common fields", w: 5, L: lineUV([[-232, -300], [-480, -320], [-900, -420], [-1500, -520]]) },
  { name: "the road south to Carondelet", w: 5, L: lineUV([[0, 840], [-30, 930], [-60, 990], [-90, 1100], [-140, 1500], [-200, 2300]]) },
  { name: "the path to the mill", w: 3.5, L: lineUV([[-180, 820], [-400, 880], [-700, 930], [DAM_U + 20, creekV(DAM_U) - 40]]) } ];
// the land-use raster: 2 m cells, for ground colour, placing things without overlaps, and the map
// 0 open, 1 street, 2 building, 3 yard, 4 square / churchyard, 5 field, 6 commons pasture, 7 wall / palisade, 8 garden beds, 9 orchard, 10 beach
const RX0 = -3200, RZ0 = -3400, RC = 2, RW = 2900, RH = 5100, RAS = new Uint8Array(RW * RH);
const rIdx = (x, z) => { const i = Math.floor((x - RX0) / RC), j = Math.floor((z - RZ0) / RC); return i < 0 || j < 0 || i >= RW || j >= RH ? -1 : j * RW + i; };
const rGet = (x, z) => { const k = rIdx(x, z); return k < 0 ? 0 : RAS[k]; };
function rRect(x, z, w, d, ry, v, test) { const c = Math.cos(ry), s = Math.sin(ry), R = Math.hypot(w, d) / 2 + RC;
  for (let zz = z - R; zz <= z + R; zz += RC) for (let xx = x - R; xx <= x + R; xx += RC) { const dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) > w / 2 || Math.abs(lz) > d / 2) continue; const k = rIdx(xx, zz); if (k < 0) { if (test) return false; continue; }
    if (test) { if (RAS[k] !== 0 && RAS[k] !== 3 && RAS[k] !== 9) return false; } else if (v !== 3 || RAS[k] === 0) RAS[k] = v; }
  return true; }
const rRectUV = (u0, u1, v0, v1, val) => { const [x, z] = toXZ((u0 + u1) / 2, (v0 + v1) / 2); rRect(x, z, u1 - u0, v1 - v0, -GR, val); };   // a rectangle in town coordinates
function rLine(L, w, v) { for (const [ax, az, bx, bz] of L.S) { const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 1.5);
  for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; for (let u = -w / 2; u <= w / 2; u += 1.5) for (let q = -w / 2; q <= w / 2; q += 1.5) { const kk = rIdx(x + u, z + q); if (kk >= 0 && u * u + q * q <= w * w / 4) RAS[kk] = v; } } } }
// the common fields: long strips one arpent (58.5 m) wide, side by side, each family's; worked in common within one fence (the Grand
// Champ north-west of the town, the Prairie des Noyers to the south-west). In May the wheat is up and green, the corn just planted.
const ARPENT = 58.47, FIELDS = [{ u0: -2200, u1: -560, v0: -1700, v1: -380, name: "The Grand Champ" }, { u0: -2350, u1: -1000, v0: -250, v1: 760, name: "The Prairie des Noyers fields" }];
for (const F of FIELDS) for (let v = F.v0; v < F.v1; v += ARPENT) rRectUV(F.u0, F.u1, v + 0.8, Math.min(F.v1, v + ARPENT) - 0.8, 5);
rRectUV(-2600, -700, 1250, 2200, 6);   // the commons (la Commune) south of the creek: pasture for everyone's cattle
for (const S of STREETS) rLine(S.L, S.w, 1);
rRectUV(6, 66, 4, 96, 4);   // the Place d'Armes

// ---------- sky, sun and haze ----------
// A day in late May 1800, at latitude 38.6 N: the sun's declination about +21 degrees; it rises about 4:40 and sets about 19:15 local
// solar time, and stands 72 degrees high at noon. Warm and humid, a light haze over the river.
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.6)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xc8ccd0, IS_HEADSET ? 0.00034 : 0.00024);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xc4d0dc, 0x5a5444, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(260, 24), new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false, toneMapped: false })); scene.add(sunDisc);
function sunAt(hour) { const lat = 38.6 * Math.PI / 180, dec = 21.0 * Math.PI / 180, H = (hour - 12) * 15 * Math.PI / 180;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));   // az from south, west positive
  return { el, dir: V3(Math.sin(az) * Math.cos(el) * -1, Math.sin(el), Math.cos(az) * Math.cos(el)).normalize() }; }
// the river: brown with silt in its spring rise ("the Mississippi is muddy, the Missouri muddier"), and the mill pond
// the sky's reflection on the water: a simple light-to-dark gradient, so the river reads as water from the bank
const SKY_ENV = tex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#8eb0d8"); gr.addColorStop(0.47, "#d4dce4"); gr.addColorStop(0.53, "#7a7666"); gr.addColorStop(1, "#4a463c"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }); SKY_ENV.mapping = THREE.EquirectangularReflectionMapping; SKY_ENV.wrapS = SKY_ENV.wrapT = THREE.ClampToEdgeWrapping; SKY_ENV.repeat.set(1, 1);
const water = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x5e5038, roughness: 0.14, metalness: 0.0, envMap: SKY_ENV, envMapIntensity: 0.42, map: tex(256, 256, speckle("#ffffff", 1500, ["#d8d0c0", "#ffffff", "#c4b8a4"], 7, 1.2), [3000, 3000]) }));
water.position.y = WATER; scene.add(water);
{ const [cu, cv] = [(POND.u0 + POND.u1) / 2 - 200, creekV((POND.u0 + POND.u1) / 2)], [px, pz] = toXZ(cu, cv), pond = new THREE.Mesh(new THREE.PlaneGeometry(POND.u1 - POND.u0 + 400, 620).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3e4a3a, roughness: 0.12, metalness: 0.0, envMap: SKY_ENV, envMapIntensity: 0.8, map: tex(256, 256, speckle("#ffffff", 900, ["#c8d0c4", "#ffffff"], 6, 1.2), [40, 10]) }));
  pond.position.set(px, POND_Y, pz); pond.rotation.y = -GR; scene.add(pond); }

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

// late-May colours: green grass on the terrace, grey limestone where the bluff breaks, sand and mud at the river's edge, the deep
// green of the Illinois bottoms, dusty streets, gardens and trodden yards, and the long strips of the common fields
const _gc2 = new THREE.Color();
function stripOf(u, v) { for (const F of FIELDS) if (u > F.u0 && u < F.u1 && v > F.v0 && v < F.v1) return Math.floor((v - F.v0) / ARPENT) + (F.v0 | 0); return null; }
function groundColor(x, z, h, c) {
  const n1 = fbm(x / 40, z / 40, 3), n2 = fbm(x / 600 + 5, z / 600, 3), [u, v] = toUV(x, z), ru = riverU(v);
  c.setRGB(0.29 + 0.08 * n2, 0.45 + 0.08 * n1, 0.17 + 0.03 * n1);                                                        // May grass
  if (u < -260 && h > 12) { const pr = sstepN(-u, 260, 700); c.lerp(_c1.setRGB(0.42 + 0.07 * n2, 0.5 + 0.06 * n1, 0.22), pr * 0.85);   // the tall-grass prairie west of the town, with spring flowers
    if (GC_CELL < 5) { const f = fbm(x / 6 + 30, z / 6, 2); if (f > 0.68) c.lerp(f > 0.74 ? _c1.setRGB(0.62, 0.42, 0.62) : _c1.setRGB(0.8, 0.72, 0.3), pr * 0.5); } }
  if (u > ru) { const se = u - ru - RIVER_HW, wood = 1 - sstepN(se, 1200 + 600 * n2, 2000 + 600 * n2);   // the American Bottom: forest along the river, wet prairie and marsh beyond
    c.setRGB(0.42 + 0.06 * n2, 0.5 + 0.06 * n1, 0.24).lerp(_c1.setRGB(0.19 + 0.04 * n2, 0.33 + 0.05 * n1, 0.14), wood);
    if (h < 1.3) c.lerp(_c1.setRGB(0.4 + 0.05 * n1, 0.46, 0.26), clampN((1.3 - h) * 1.2, 0, 0.85)); if (h < 0.5) c.lerp(_c1.setRGB(0.36, 0.33, 0.25), 0.6); if (rGet(x, z) === 1) c.setRGB(0.5, 0.43, 0.32); else if (rGet(x, z) === 5) c.setRGB(0.48 + 0.05 * Math.sin(v * 2.4), 0.54, 0.22); return c; }
  const s = ru - RIVER_HW - u;
  if (s < 40 && h < 3.5) c.lerp(_c1.setRGB(0.56 + 0.06 * n1, 0.5 + 0.05 * n1, 0.4), clampN((3.5 - h) / 2, 0, 1));          // the beach: sand and drying mud
  if (h < WATER + 0.6) c.lerp(_c1.setRGB(0.38, 0.33, 0.25), clampN((WATER + 0.6 - h) * 1.5, 0, 0.9));                     // wet mud at the water's edge
  if (s > 15 && s < 120 && GC_CELL < 9) { const g = Math.abs(baseH(x + 1.5, z) - baseH(x - 1.5, z)) + Math.abs(baseH(x, z + 1.5) - baseH(x, z - 1.5)); if (g > 1.6) c.lerp(_c1.setRGB(0.62 + 0.07 * n1, 0.6 + 0.06 * n1, 0.54), clampN((g - 1.6) / 1.5, 0, 0.92)); }   // limestone in the bluff face
  const cv = creekV(u); if (Math.abs(v - cv) < 5 && u > DAM_U && h < 6) c.setRGB(0.36, 0.4, 0.34);                         // the creek below the dam
  const r = rGet(x, z);
  if (r === 1) c.setRGB(0.52 + 0.07 * n1, 0.44 + 0.06 * n1, 0.32 + 0.03 * n1);                                             // dirt streets, dusty
  else if (r === 2) c.lerp(_c1.setRGB(0.32 + 0.05 * n1, 0.27 + 0.04 * n1, 0.2), 0.9);
  else if (r === 3) c.lerp(_c1.setRGB(0.36 + 0.06 * n1, 0.36 + 0.04 * n1, 0.22), 0.45 + 0.4 * sstepN(fbm(x / 6, z / 6, 2), 0.4, 0.7));   // yards: trodden earth and grass
  else if (r === 4) c.lerp(_c1.setRGB(0.4 + 0.06 * n1, 0.42 + 0.05 * n1, 0.26), 0.55 + 0.3 * fbm(x / 8, z / 8, 2));        // the square, worn
  else if (r === 8) { const row = Math.sin(u * 3.1) > 0.2; c.setRGB(row ? 0.24 : 0.3 + 0.04 * n1, row ? 0.4 : 0.24, row ? 0.14 : 0.17); }   // garden beds: rows of greens on dark earth
  else if (r === 7) c.lerp(_c1.setRGB(0.42, 0.38, 0.3), 0.7);
  else if (r === 6) c.setRGB(0.32 + 0.05 * n2, 0.44 + 0.06 * n1, 0.2);                                                     // the commons, grazed short
  else if (r === 5) { const st = stripOf(u, v) || 0, kind = hash(st, 17), edge = Math.abs(((v % ARPENT) + ARPENT) % ARPENT - ARPENT / 2) > ARPENT / 2 - 1.5;
    if (edge) c.setRGB(0.42, 0.4, 0.28); else if (kind < 0.45) c.setRGB(0.5 + 0.05 * n1 + 0.04 * Math.sin(v * 2.4), 0.56 + 0.05 * n1, 0.2);   // wheat, heading, turning from green to gold
    else if (kind < 0.75) { const row = Math.sin(v * 5.4) > 0.55; c.setRGB(row ? 0.3 : 0.46 + 0.04 * n1, row ? 0.44 : 0.34, row ? 0.16 : 0.24); }   // corn, a hand high in its rows
    else if (kind < 0.85) c.setRGB(0.36, 0.52, 0.22); else c.setRGB(0.44 + 0.06 * n1, 0.44, 0.26); }                         // oats or flax; fallow
  return c; }


// ---------- buildings as real geometry, merged by area ----------
// Every building is built from its parts at true size (sills, upright logs, galleries and their posts, thick hipped roofs, chimneys,
// doors and shutters), with textures laid at real scale (1 unit of texture = 1 m) and a colour per building, then merged into one
// mesh per material per square.
const GT = (w, h, draw, metres) => { const t = tex(w, h, draw); t.repeat.set(1 / metres, 1 / metres); return t; };
const G_TEX = {
  // upright logs set close, the gaps packed with bousillage (clay and straw or Spanish moss), the whole limewashed: 1 m square
  poteaux: GT(256, 256, (g, w, h) => { g.fillStyle = "#e6e0d2"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 42) { const o = rnd() * 6; g.fillStyle = "rgba(120,104,84,.22)"; g.fillRect(x + 36 + o, 0, 4, h);
      for (let k = 0; k < 12; k++) { g.fillStyle = "rgba(90,78,60,.10)"; g.fillRect(x + rnd() * 36, rnd() * h, 2, 10 + rnd() * 50); } }
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "150,136,110" : "250,248,240"},.12)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 20, 4 + rnd() * 14, 0, 0, 6.283); g.fill(); }
    g.fillStyle = "rgba(90,74,50,.28)"; g.fillRect(0, h - 10, w, 10); }, 1),
  // the local grey-buff limestone, laid as rubble in lime mortar; on most houses limewashed
  stone: GT(256, 256, (g, w, h) => { g.fillStyle = "#cfc6b4"; g.fillRect(0, 0, w, h); for (let k = 0; k < 520; k++) { g.fillStyle = ["#d8d0c0", "#bcb4a2", "#c8c0ae", "#e0dacc", "#b0a894", "#d0c6b0"][(rnd() * 6) | 0]; const x = rnd() * w, y = rnd() * h, sw = 14 + rnd() * 26, sh = 8 + rnd() * 12; g.fillRect(x, y, sw, sh); g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(x, y + sh, sw, 1.5); } }, 2),
  // cypress or oak shingles (bardeaux), weathered grey: 2 m square
  shingle: GT(256, 256, (g, w, h) => { g.fillStyle = "#5e584e"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 14) for (let x = ((y / 14) % 2) * 10; x < w; x += 20) {
      g.fillStyle = ["#7e766a", "#6e665c", "#8a8274", "#766e62", "#686258"][(rnd() * 5) | 0]; g.fillRect(x + 1, y, 18, 13); g.fillStyle = "rgba(0,0,0,.38)"; g.fillRect(x, y + 12, 20, 2); } }, 2),
  // straw thatch, as on many of the older houses and barns
  thatch: GT(256, 256, (g, w, h) => { g.fillStyle = "#8a7448"; g.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { const x = rnd() * w, y = rnd() * h, l = 5 + rnd() * 14; g.strokeStyle = ["#a8925e", "#6e5a36", "#94804e", "#5e4e30", "#b09a6c"][(rnd() * 5) | 0]; g.globalAlpha = 0.55; g.lineWidth = 0.8 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 1.5, y + l); g.stroke(); }
    g.globalAlpha = 1; for (let y = 0; y < h; y += 43) { g.fillStyle = "rgba(30,22,10,.25)"; g.fillRect(0, y, w, 4); } }, 2),
  plank: GT(256, 256, (g, w, h) => { g.fillStyle = "#7a6a58"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = ["#8a7a66", "#76665a", "#948472", "#6e604e", "#827260"][(x / 32) % 5]; g.fillRect(x + 1, 0, 30, h);
      for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(30,22,14,.22)"; g.fillRect(x + 2 + rnd() * 27, rnd() * h, 1, 10 + rnd() * 40); } g.fillStyle = "rgba(15,10,6,.55)"; g.fillRect(x, 0, 2, h); } }, 2),
  oak: GT(128, 128, (g, w, h) => { g.fillStyle = "#5a4836"; g.fillRect(0, 0, w, h); for (let k = 0; k < 160; k++) { g.fillStyle = ["rgba(110,90,64,.5)", "rgba(40,30,20,.5)"][k % 2]; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); } }, 1),
  // a pair of glazed casement doors (portes-fenêtres) with small panes, as in the better houses; or plank doors
  door: GT(128, 256, (g, w, h) => { g.fillStyle = "#4a3a2a"; g.fillRect(0, 0, w, h); g.fillStyle = "#2a3440"; for (let y = 0; y < 5; y++) for (let x = 0; x < 2; x++) for (let c = 0; c < 2; c++) g.fillRect(8 + x * 58 + c * 25, 10 + y * 30, 21, 26);
    g.fillStyle = "rgba(200,220,230,.18)"; for (let y = 0; y < 5; y++) g.fillRect(10, 12 + y * 30, 8, 4); g.fillStyle = "#3a2c20"; g.fillRect(8, 166, 112, 84); g.fillStyle = "#2a1e14"; g.fillRect(62, 0, 4, h); }, 1),
  window: GT(128, 128, (g, w, h) => { g.fillStyle = "#4a3a2a"; g.fillRect(0, 0, w, h); g.fillStyle = "#28323e"; for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) g.fillRect(8 + x * 29, 8 + y * 38, 25, 34); g.fillStyle = "rgba(210,225,235,.2)"; for (let y = 0; y < 3; y++) g.fillRect(10, 10 + y * 38, 7, 5); }, 1),
  // upright pickets (pieux), pointed, with gaps: every lot was fenced
  pickets: (() => { const t = tex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { const top = 26 + rnd() * 20; g.fillStyle = ["#7a6a56", "#6e5e4c", "#86765e", "#665848"][(rnd() * 4) | 0]; g.beginPath(); g.moveTo(x + 3, h); g.lineTo(x + 3, top); g.lineTo(x + 15, top - 22); g.lineTo(x + 27, top); g.lineTo(x + 27, h); g.fill(); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + 23, top, 4, h - top); }
      g.fillStyle = "#4e4032"; g.fillRect(0, 150, w, 14); g.fillRect(0, 400, w, 14); }); t.repeat.set(1, 0.5); return t; })(),
  // the stockade: logs a foot through, sharpened, set in a trench
  palisade: (() => { const t = tex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, "#3a2e22"); gr.addColorStop(0.5, "#7a6650"); gr.addColorStop(1, "#3a2e22"); g.fillStyle = gr;
      const top = 10 + rnd() * 14; g.beginPath(); g.moveTo(x + 1, h); g.lineTo(x + 1, top + 14); g.lineTo(x + 16, top); g.lineTo(x + 31, top + 14); g.lineTo(x + 31, h); g.fill(); } }); t.repeat.set(1 / 1.0, 1 / 3.6); return t; })(),
  // horizontal hewn logs with clay chinking: the American way of building (a contrast with the French upright logs)
  logs: GT(256, 256, (g, w, h) => { g.fillStyle = "#b8a888"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) { const gr = g.createLinearGradient(0, y, 0, y + 54); gr.addColorStop(0, "#4a3a2a"); gr.addColorStop(0.5, "#7a6448"); gr.addColorStop(1, "#3a2c20"); g.fillStyle = gr; g.fillRect(0, y + 4, w, 52); for (let k = 0; k < 20; k++) { g.fillStyle = "rgba(20,14,8,.25)"; g.fillRect(rnd() * w, y + 8 + rnd() * 44, 20 + rnd() * 60, 1.5); } } }, 2),
  dark: GT(16, 16, (g, w, h) => { g.fillStyle = "#1a140e"; g.fillRect(0, 0, w, h); }, 1) };
const G_MAT = {}; for (const k in G_TEX) G_MAT[k] = new THREE.MeshStandardMaterial({ map: G_TEX[k], vertexColors: true, roughness: 0.92 });
for (const k of ["pickets", "palisade"]) Object.assign(G_MAT[k], { alphaTest: 0.5, side: THREE.DoubleSide });
G_MAT.lod = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
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
const KIT_NEAR = [["tree", 1400], ["crown", 1400], ["fruit", 500], ["fcap", 500], ["fcrown", 4800], ["ftrunk", 2400], ["fpost", 700], ["frail", 700], ["cross", 300], ["oven", 400], ["well", 350], ["tk:", 260], ["pirogue", 900], ["bateau", 900], ["bell", 400], ["cannon", 400], ["carriage", 400], ["cargo", 500], ["barrel", 500], ["leadpig", 400], ["cratepile", 500], ["lumber", 500], ["raftlog", 700]];
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

const MAT = { wood: M(0x5a4634), dark: M(0x18120c, { roughness: 1, side: THREE.DoubleSide }), iron: M(0x3a3a3c, { metalness: 0.6, roughness: 0.5 }), stone: new THREE.MeshStandardMaterial({ map: G_TEX.stone, roughness: 0.95 }),
  thatch: new THREE.MeshStandardMaterial({ map: G_TEX.thatch, roughness: 1 }), plank: new THREE.MeshStandardMaterial({ map: G_TEX.plank, roughness: 0.9 }), cloth: M(0xe8e0cc, { side: THREE.DoubleSide }), hide: M(0x8a6a48), lime: M(0xe8e2d6), brick: M(0x9a5a40) };
// a fence or palisade: a two-sided plane along a line in the frame, textured at real size
function gFence(F, mat, x0, z0, x1, z1, hgt) { const L = Math.hypot(x1 - x0, z1 - z0); gpoly(F, mat, [[x0, 0, z0], [x1, 0, z1], [x1, hgt, z1], [x0, hgt, z0]], [[0, 0], [L, 0], [L, hgt], [0, hgt]]); }

// ---------- houses: the French Creole house of the Mississippi valley ----------
// SOURCES: the houses of colonial St. Louis are known from deeds, inventories and sale notices (Billon; Peterson, "Colonial St. Louis:
// Building a Creole Capital"), and from the survivors at Ste. Genevieve and Cahokia. Most were of upright logs, either set in the
// ground (poteaux en terre) or on a squared sill on a stone footing (poteaux sur solle), the spaces between the posts filled with
// bousillage (clay mixed with straw or moss) and limewashed white; some of stone (maison de pierre). They were one storey, about
// 6-9 m by 9-15 m, with a steep hipped roof that swept out over a gallery on two, three or four sides, carried on slender posts; roofs of
// shingles (bardeaux) or straw thatch; casement windows and glazed doors opening onto the gallery, with plank shutters; a chimney of
// stone or of clay on a timber frame. Each stood at the front of its lot, behind a fence of pickets, with a kitchen, a barn, cabins for
// the enslaved, a bake oven, a well, a garden and fruit trees behind.
const HOUSES = [];
const LOD_CELL = 250, lodKey = (x, z) => Math.floor(x / LOD_CELL) + "," + Math.floor(z / LOD_CELL);
function addHouse(u, v, w, d, o = {}) { const [x, z] = toXZ(u, v), R = seeded((u * 31 + v * 17) | 0), gy = o.gy ?? Math.min(groundH(x, z), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => groundH(...toXZ(u + a * w / 2, v + b * d / 2)))) - 0.05;
  const wall = o.wall ?? (R() < 0.14 ? "stone" : "poteaux"), H = { u, v, x, z, w, d, ry: -GR, gy, wall, roof: o.roof ?? (R() < 0.78 ? "shingle" : "thatch"), lime: o.lime ?? (wall === "stone" ? R() < 0.6 : R() < 0.85),
    face: o.face ?? 1, gal: o.gal ?? (R() < 0.55 ? "all" : R() < 0.7 ? "fb" : R() < 0.85 ? "f" : "none"), gw: o.gw ?? 2.1, wh: o.wh ?? 2.75 + R() * 0.35, fl: o.fl ?? 0.45, kind: o.kind || "house", storeys: o.storeys || 1, chim: o.chim ?? (R() < 0.5 ? 1 : -1), name: o.name };
  const G = galExt(H); H.W = w + G[0] + G[1]; H.D = d + G[2] + G[3]; H.cu = (G[1] - G[0]) / 2; H.cv = (G[3] - G[2]) / 2;   // the outline under the roof
  H.dp = (() => { const [dx, dz] = toXZ(u + H.face * (w / 2 + 0.6 + (H.face > 0 ? G[1] : G[0])), v); return [dx, dz, H.face > 0 ? Math.PI / 2 - GR : -Math.PI / 2 - GR]; })();
  H.coll = solid(x, z, w + 0.1, d + 0.1, H.ry, H); rRect(x, z, w + 1, d + 1, H.ry, 2); HOUSES.push(H); return H; }
// which sides have a gallery: [-x, +x, -z, +z] widths; "f" the street front (+face), "fb" front and back, "all" round
function galExt(H) { const g = H.gw, f = H.face; if (H.gal === "all") return [g, g, g, g]; if (H.gal === "fb") return [g, g, 0, 0]; if (H.gal === "f") return f > 0 ? [0, g, 0, 0] : [g, 0, 0, 0]; return [0, 0, 0, 0]; }
function gHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, "H" + lodKey(H.x, H.z)), w = H.w, d = H.d, wh = H.wh, fl = H.fl, R = seeded((H.u * 7 + H.v * 13) | 0), G = galExt(H), up = H.storeys > 1 ? 3.1 : 0;
  const wallT = H.lime ? [1.0 + R() * 0.04, 1.0, 0.98] : H.wall === "stone" ? [0.98, 0.96, 0.92] : [0.62 + R() * 0.08, 0.58, 0.52], wallM = H.wall;
  GTINT = [0.62, 0.6, 0.56]; gbox(F, "stone", 0, fl / 2, 0, w + 0.12, fl, d + 0.12);                                                  // the stone footing
  const x0 = -w / 2 - G[0], x1 = w / 2 + G[1], z0 = -d / 2 - G[2], z1 = d / 2 + G[3], eave = fl + wh - 0.35 + up, kx = (Math.min(x1 - x0, z1 - z0) / 2 * (H.roof === "thatch" ? 1.05 : 0.95)) / ((x1 - x0) / 2);
  GTINT = wallT; gbox(F, wallM, 0, (fl + eave) / 2, 0, w, eave - fl, d);
  for (let k = 0; k < 4; k++) if (G[k]) { const hh = G[k] * kx * 0.98, onX = k < 2, sg = k % 2 ? 1 : -1; gbox(F, wallM, onX ? sg * w / 2 * 0.995 : 0, eave + hh / 2, onX ? 0 : sg * d / 2 * 0.995, onX ? 0.1 : w, hh, onX ? d : 0.1); }   // the wall carried up under the gallery roof
  if (wallM === "poteaux") { GTINT = [0.5, 0.42, 0.34]; for (const sx of [-1, 1]) gbox(F, "oak", sx * (w / 2 + 0.02), fl + 0.08, 0, 0.18, 0.16, d + 0.1, "b"); for (const sz of [-1, 1]) gbox(F, "oak", 0, fl + 0.08, sz * (d / 2 + 0.02), w + 0.1, 0.16, 0.18, "b"); }   // the sill (solle)
  // the gallery: a plank floor at the house floor's height, slender posts, a rail on some
  const rail = R() < 0.5;
  if (G.some(g => g > 0)) { GTINT = [0.92, 0.88, 0.82]; gbox(F, "plank", (x0 + x1) / 2, fl - 0.06, (z0 + z1) / 2, x1 - x0, 0.12, z1 - z0);
    const post = (px, pz) => { GTINT = [0.95, 0.92, 0.86]; gbox(F, "oak", px, fl + (eave - fl) / 2, pz, 0.13, eave - fl, 0.13, "b"); GTINT = [0.62, 0.6, 0.56]; gbox(F, "stone", px, fl / 2 - 0.03, pz, 0.3, fl, 0.3, "b"); };
    const runs = []; if (G[0]) runs.push([x0, z0 + (G[2] ? 0 : 0), x0, z1]); if (G[1]) runs.push([x1, z0, x1, z1]); if (G[2]) runs.push([x0, z0, x1, z0]); if (G[3]) runs.push([x0, z1, x1, z1]);
    for (const [ax, az, bx, bz] of runs) { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.3)); for (let k = 0; k <= n; k++) post(ax + (bx - ax) * k / n, az + (bz - az) * k / n);
      if (rail) { GTINT = [0.9, 0.86, 0.8]; const cx = (ax + bx) / 2, cz = (az + bz) / 2; gbox(F, "oak", cx, fl + 0.85, cz, ax === bx ? 0.08 : L, 0.07, ax === bx ? L : 0.08, ""); for (let k = 0; k < n * 3; k++) { const f = (k + 0.5) / (n * 3); gbox(F, "oak", ax + (bx - ax) * f, fl + 0.43, az + (bz - az) * f, 0.04, 0.8, 0.04, "bt"); } } }
    GTINT = [0.85, 0.8, 0.72]; for (const [ax, az, bx, bz] of runs) gbox(F, "oak", (ax + bx) / 2, eave - 0.1, (az + bz) / 2, ax === bx ? 0.16 : Math.abs(bx - ax), 0.2, ax === bx ? Math.abs(bz - az) : 0.16, "b"); }
  if (up) { GTINT = [0.9, 0.86, 0.8]; gbox(F, "plank", (x0 + x1) / 2, fl + wh + 0.05, (z0 + z1) / 2, x1 - x0, 0.14, z1 - z0); }   // an upper gallery floor on the two-storey houses
  // doors and windows: glazed doors onto the street gallery, windows with open shutters elsewhere
  const opening = (side, along, y, ow, oh, tx, shutters = true) => { const onX = side[1] === "x", sg = side[0] === "+" ? 1 : -1, ox = onX ? sg * (w / 2 + 0.03) : 0, oz = onX ? 0 : sg * (d / 2 + 0.03), n = onX ? [sg, 0, 0] : [0, 0, sg], at = (a, yy) => onX ? [ox, yy, a] : [a, yy, oz];
    GTINT = [1, 1, 1]; gpoly(F, tx, [at(along - ow / 2, y), at(along + ow / 2, y), at(along + ow / 2, y + oh), at(along - ow / 2, y + oh)], [[0, 0], [1, 0], [1, 1], [0, 1]], n);
    GTINT = [0.95, 0.92, 0.86]; for (const a of [along - ow / 2 - 0.06, along + ow / 2 + 0.06]) { const [px, , pz] = at(a, 0); gbox(F, "oak", px + (onX ? sg * 0.02 : 0), y + oh / 2, pz + (onX ? 0 : sg * 0.02), onX ? 0.06 : 0.1, oh + 0.1, onX ? 0.1 : 0.06, ""); }
    if (shutters) { GTINT = H.shutC; for (const sgn of [-1, 1]) { const a = along + sgn * (ow / 2 + 0.12 + ow / 4), [px, , pz] = at(a, 0); gbox(F, "plank", px + (onX ? sg * 0.05 : 0), y + oh / 2, pz + (onX ? 0 : sg * 0.05), onX ? 0.04 : ow / 2, oh, onX ? ow / 2 : 0.04, ""); } } };
  H.shutC = [[0.55, 0.7, 0.6], [0.8, 0.78, 0.72], [0.5, 0.4, 0.32], [0.4, 0.5, 0.62]][(R() * 4) | 0];
  const fs = H.face > 0 ? "+x" : "-x", bs = H.face > 0 ? "-x" : "+x", nd = Math.max(1, Math.round(d / 4.5));
  for (let k = 0; k < nd; k++) { const a = -d / 2 + d * (k + 0.5) / nd; if (k === Math.floor(nd / 2) || R() < 0.45) opening(fs, a, fl + 0.02, 1.15, 2.1, "door"); else opening(fs, a, fl + 0.85, 0.9, 1.15, "window"); }
  for (let k = 0; k < Math.max(1, nd - 1); k++) { const a = -d / 2 + d * (k + 0.5) / Math.max(1, nd - 1); if (R() < 0.3) opening(bs, a, fl + 0.02, 1.1, 2.0, "door"); else opening(bs, a, fl + 0.85, 0.85, 1.1, "window"); }
  for (const sz of ["-z", "+z"]) if (R() < 0.6) opening(sz, (R() - 0.5) * w * 0.4, fl + 0.85, 0.8, 1.05, "window");
  if (up) for (let k = 0; k < nd; k++) { const a = -d / 2 + d * (k + 0.5) / nd; opening(fs, a, fl + wh + 0.4, 1.0, 2.0, "door"); opening(bs, a, fl + wh + 0.85, 0.85, 1.1, "window"); }
  // the chimney, through the roof at one end
  const cz = H.chim * (d / 2 - 1.2), ridgeY = eave + (Math.min(x1 - x0, z1 - z0) / 2) * (H.roof === "thatch" ? 1.05 : 0.95);
  GTINT = H.wall === "stone" || R() < 0.6 ? [0.86, 0.82, 0.76] : [0.72, 0.6, 0.48]; gbox(F, "stone", 0, (fl + ridgeY + 0.9) / 2, cz, 0.95, ridgeY + 0.9 - fl, 1.1, "b"); GTINT = [0.4, 0.38, 0.36]; gbox(F, "stone", 0, ridgeY + 0.95, cz, 1.05, 0.12, 1.2, "b");
  // the roof: hipped, steep, sweeping out over the galleries
  GTINT = H.roof === "thatch" ? [0.95 + R() * 0.15, 0.92, 0.85] : [0.85 + R() * 0.25, 0.85 + R() * 0.2, 0.84 + R() * 0.15]; const FR2 = FR(H.x + Math.cos(H.ry) * H.cu + Math.sin(H.ry) * H.cv, H.z - Math.sin(H.ry) * H.cu + Math.cos(H.ry) * H.cv, H.ry, H.gy, F.key);
  groof(FR2, H.roof, x1 - x0, z1 - z0, eave, Math.min(x1 - x0, z1 - z0) / 2 * (H.roof === "thatch" ? 1.05 : 0.95), { hip: true, e: 0.3, t: H.roof === "thatch" ? 0.32 : 0.12 });
  GTINT = [1, 1, 1]; }
function lodHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, "L" + lodKey(H.x, H.z)), G = galExt(H), x0 = -H.w / 2 - G[0], x1 = H.w / 2 + G[1], z0 = -H.d / 2 - G[2], z1 = H.d / 2 + G[3], e = H.fl + H.wh - 0.35 + (H.storeys > 1 ? 3.1 : 0), rh = Math.min(x1 - x0, z1 - z0) / 2;
  GTINT = H.lime ? [0.62, 0.6, 0.58] : [0.4, 0.37, 0.33]; gbox(F, "lod", 0, (e) / 2, 0, H.w, e, H.d, "b");
  GTINT = H.roof === "thatch" ? [0.36, 0.3, 0.2] : [0.3, 0.3, 0.29]; const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2, rz = Math.max(0.2, hz - hx);
  for (const s of [-1, 1]) { gpoly(F, "lod", [[cx + s * hx, e, cz - hz], [cx + s * hx, e, cz + hz], [cx, e + rh, cz + rz], [cx, e + rh, cz - rz]], [[0, 0], [1, 0], [1, 1], [0, 1]], [s, 1, 0]); gpoly(F, "lod", [[cx - hx, e, cz + s * hz], [cx + hx, e, cz + s * hz], [cx, e + rh, cz + s * rz]], [[0, 0], [1, 0], [0.5, 1]], [0, 1, s]); }
  GTINT = [1, 1, 1]; }
// outbuildings: a kitchen, a barn, a cabin, built simply; a bake oven of clay
function gShed(u, v, w, d, wall, roof, o = {}) { const [x, z] = toXZ(u, v), gy = groundH(x, z) - 0.1, F = FR(x, z, -GR, gy, "H" + lodKey(x, z)), wh = o.wh ?? 2.3, R = seeded((u * 3 + v * 5) | 0);
  GTINT = wall === "plank" ? [0.8 + R() * 0.2, 0.78, 0.72] : wall === "poteaux" ? (R() < 0.5 ? [0.98, 0.96, 0.92] : [0.6, 0.56, 0.5]) : [0.96, 0.94, 0.9]; gbox(F, wall, 0, wh / 2, 0, w, wh, d);
  GTINT = [1, 1, 1]; const sg = o.door ?? 1; gpoly(F, "plank", [[sg * (w / 2 + 0.03), 0, -0.5], [sg * (w / 2 + 0.03), 0, 0.5], [sg * (w / 2 + 0.03), 1.9, 0.5], [sg * (w / 2 + 0.03), 1.9, -0.5]], [[0, 0], [1, 0], [1, 1.9], [0, 1.9]], [sg, 0, 0]);
  if (o.chim) { GTINT = [0.8, 0.76, 0.7]; gbox(F, "stone", 0, (wh + w * 0.6 + 0.8) / 2, d / 2 - 0.7, 0.8, wh + w * 0.6 + 0.8, 0.9, "b"); }
  GTINT = roof === "thatch" ? [0.95, 0.9, 0.82] : [0.9, 0.88, 0.86]; groof(F, roof, w, d, wh, w * (o.hip ? 0.62 : 0.7), { hip: !!o.hip, e: 0.35 });
  const lf = FR(x, z, -GR, gy, "L" + lodKey(x, z)); GTINT = [0.4, 0.37, 0.33]; gbox(lf, "lod", 0, wh / 2, 0, w, wh, d); GTINT = [1, 1, 1];
  solid(x, z, w + 0.1, d + 0.1, -GR); rRect(x, z, w + 0.6, d + 0.6, -GR, 2); }
const OVEN_G = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), WELL_G = new THREE.CylinderGeometry(0.7, 0.75, 0.8, 12).translate(0, 0.4, 0);
const putUV = (key, geo, mat, u, v, y, sx, sy, sz, ry = 0) => { const [x, z] = toXZ(u, v); return put(key, geo, mat, x, groundH(x, z) + y, z, sx, sy, sz, ry - GR); };
const FRUIT = [], OVENS = [], WELLS = [], YARD_SPOTS = [];

// ---------- the lots ----------
// Each block (300 by 240 French feet) was usually cut into quarters, each a family's, the house at the street front; some families
// held half a block or a whole one; some lots were still garden or empty in 1800. The town was densest near the Place d'Armes.
const LOTS = [], STOREHOUSES = [];
const fence = (u0, v0, u1, v1, hgt = 1.8, mat = "pickets") => { const [ax, az] = toXZ(u0, v0), [bx, bz] = toXZ(u1, v1), F = FR(0, 0, 0, 0, "H" + lodKey((ax + bx) / 2, (az + bz) / 2)), L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 6));
  for (let k = 0; k < n; k++) { const fx0 = ax + (bx - ax) * k / n, fz0 = az + (bz - az) * k / n, fx1 = ax + (bx - ax) * (k + 1) / n, fz1 = az + (bz - az) * (k + 1) / n, g0 = groundH(fx0, fz0) - 0.15, g1 = groundH(fx1, fz1) - 0.15, Lk = L / n, U0 = (L * k / n);
    GTINT = [1, 1, 1]; gpoly(F, mat, [[fx0, g0, fz0], [fx1, g1, fz1], [fx1, g1 + hgt, fz1], [fx0, g0 + hgt, fz0]], [[U0, 0], [U0 + Lk, 0], [U0 + Lk, hgt], [U0, hgt]]); }
  const R = Math.hypot(bx - ax, bz - az) / 2, c = Math.atan2(bx - ax, bz - az); solid((ax + bx) / 2, (az + bz) / 2, 0.15, L, c); rLine(line([[ax, az], [bx, bz]], true), 1, 7); };
// a lot: u0..u1 across, v0..v1 along; the house fronts the street at face (+1: the street is at u1, -1: at u0)
function makeLot(u0, u1, v0, v1, face, dens, R) { const L = { u0, u1, v0, v1, face }; LOTS.push(L);
  const depth = u1 - u0, len = v1 - v0, occupied = R() < dens;
  // the fence: three sides, and the front with a gate
  fence(u0, v0, u1, v0); fence(u0, v1, u1, v1); const back = face > 0 ? u0 : u1, front = face > 0 ? u1 : u0; fence(back, v0, back, v1); fence(front, v0, front, (v0 + v1) / 2 - 1.6); fence(front, (v0 + v1) / 2 + 1.6, front, v1);
  rRectUV(u0 + 0.5, u1 - 0.5, v0 + 0.5, v1 - 0.5, 3);
  if (!occupied) { rRectUV(u0 + 4, u1 - 4, v0 + 4, v1 - 4, 8); for (let k = 0; k < 6; k++) FRUIT.push([...toXZ(u0 + 4 + R() * (depth - 8), v0 + 4 + R() * (len - 8)), 0.5 + R() * 0.3]); return L; }
  const hw = 6 + R() * 2.5, hd = Math.min(len - 6, 9 + R() * 6), gal = R() < 0.55 ? "all" : R() < 0.7 ? "fb" : "f", g = 2.1, ext = gal === "all" || gal === "fb" ? g : face > 0 ? 0 : g;
  const hu = face > 0 ? u1 - 1.2 - (gal === "none" ? 0 : g) - hw / 2 : u0 + 1.2 + (gal === "none" ? 0 : g) + hw / 2, hv = (v0 + v1) / 2 + (R() - 0.5) * Math.max(0, len - hd - 8);
  L.house = addHouse(hu, hv, hw, hd, { face, gal });
  // behind: the kitchen (a separate building, for fear of fire), a barn or stable, a cabin, the oven and well, the garden and orchard
  const bu = u => face > 0 ? u1 - u : u0 + u;   // distance back from the street
  if (R() < 0.85) gShed(bu(hw + g + 7), v0 + 5 + R() * 3, 4.2, 5, R() < 0.7 ? "poteaux" : "plank", R() < 0.6 ? "shingle" : "thatch", { chim: true, door: face, hip: R() < 0.5 });
  if (R() < 0.6 && depth > 30) gShed(bu(depth - 6), v1 - 7 - R() * 4, 6, 8 + R() * 3, "plank", R() < 0.5 ? "thatch" : "shingle", { wh: 2.8, door: face });
  if (R() < 0.4) gShed(bu(hw + g + 8), v1 - 5, 3.8, 4.6, "poteaux", "thatch", { door: face });
  if (R() < 0.55) { const ou = bu(hw + g + 4), ov = v0 + 11 + R() * 4; putUV("oven", OVEN_G, MAT.brick, ou, ov, 0.35, 1.0, 0.95, 1.2); putUV("ovenbase", BOX_G, MAT.stone, ou, ov, -0.1, 2.1, 0.45, 2.5); OVENS.push(toXZ(ou, ov)); }
  if (R() < 0.6) { const wu = bu(hw + g + 3), wv = v1 - 12 - R() * 4; putUV("well", WELL_G, MAT.stone, wu, wv, 0, 1, 1, 1); putUV("wellpost", BOX_G, MAT.wood, wu, wv + 0.75, 0, 0.12, 2.0, 0.12); putUV("wellpost", BOX_G, MAT.wood, wu, wv - 0.75, 0, 0.12, 2.0, 0.12); putUV("wellbar", BOX_G, MAT.wood, wu, wv, 1.9, 0.1, 0.1, 1.7); WELLS.push(toXZ(wu, wv)); }
  const gu0 = Math.min(bu(hw + g + 12), bu(depth - 3)), gu1 = Math.max(bu(hw + g + 12), bu(depth - 3)); if (Math.abs(gu1 - gu0) > 6) rRectUV(gu0, gu1, v0 + 3, (v0 + v1) / 2, 8);
  for (let k = 0; k < 2 + R() * 4; k++) FRUIT.push([...toXZ(bu(hw + g + 8 + R() * Math.max(2, depth - hw - g - 12)), (v0 + v1) / 2 + R() * (len / 2 - 3)), 0.45 + R() * 0.3]);
  YARD_SPOTS.push(toXZ(bu(hw + g + 5), (v0 + v1) / 2));
  return L; }
const townDens = v => 0.98 - 0.5 * sstepN(Math.abs(v - 20), 250, 800);
const SPECIAL = new Set(["0,-1", "0,0", "1,1"]);   // blocks taken by the Chouteau house, the church, the Government House (east of Main)
{ const R = seeded(1800);
  for (let bi = 0; bi < CROSS_V.length - 1; bi++) { const va = CROSS_V[bi] + 4.5, vb = CROSS_V[bi + 1] - 4.5, vm = (va + vb) / 2, key = Math.round(vm / 100 - 0.5);
    // east of La Grande Rue: lots from the street to the bluff (a single row, facing west)
    if (key === -1) { for (const [vv, sz] of [[-80, 16], [-48, 14], [-20, 12]]) gShed(30, vv, 9, sz, "stone", "shingle", { wh: 3.4, door: -1 }); fence(6, va, 6, -54); fence(6, -46, 6, vb); fence(6, va, 52, va); fence(6, vb, 52, vb); rRectUV(6.5, 51.5, va + 0.5, vb - 0.5, 3); STOREHOUSES.push(toXZ(4, -80), toXZ(4, -48), toXZ(4, -20)); }
    else if (key !== 0 && key !== 1 && key !== -2) { const ue = 50 + 3 * Math.sin(vm / 90); makeLot(6, ue, va, vm - 0.5, -1, townDens(vm), R); makeLot(6, ue, vm + 0.5, vb, -1, townDens(vm), R); }
    // between La Grande Rue and Rue de l'Église, and between it and Rue des Granges: four quarter-lots each
    for (const [ua, ub] of [[-84.2, -5.8], [-174.2, -95.8]]) { if (key === 0) continue; const um = (ua + ub) / 2;
      if (R() < 0.22) makeLot(um + 0.5, ub, va, vb, 1, townDens(vm), R); else { makeLot(um + 0.5, ub, va, vm - 0.5, 1, townDens(vm), R); makeLot(um + 0.5, ub, vm + 0.5, vb, 1, townDens(vm), R); }   // some families held a half block
      if (R() < 0.22) makeLot(ua, um - 0.5, va, vb, -1, townDens(vm) * 0.9, R); else { makeLot(ua, um - 0.5, va, vm - 0.5, -1, townDens(vm) * 0.9, R); makeLot(ua, um - 0.5, vm + 0.5, vb, -1, townDens(vm) * 0.9, R); } }
    // west of Rue des Granges: shallow lots facing it, up to the palisade
    makeLot(-230, -185.8, va, vm - 0.5, 1, townDens(vm) * 0.75, R); makeLot(-230, -185.8, vm + 0.5, vb, 1, townDens(vm) * 0.75, R); } }


// markers (defined here so that every building can use them)
const MARKS = [], FLAGS = [];
const mark = (name, x, z, tag, text, o = {}) => { const m = { name, x, z, tag, text, y: o.y, r: o.r || 25, range: o.range || 700, big: !!o.big, follow: o.follow, hidden: !!o.hidden }; MARKS.push(m); return m; };
const markUV = (name, u, v, tag, text, o) => { const [x, z] = toXZ(u, v); return mark(name, x, z, tag, text, o); };

// ---------- the Chouteau house ----------
// Laclède's headquarters of 1764, the first stone house, on the block facing the Place d'Armes across La Grande Rue, between the Rue
// de la Place and the Rue de la Tour; bought by Auguste Chouteau in 1789 and rebuilt: two storeys of stone with a garret, galleries, the whole block
// enclosed by a stone wall about 10 feet high with loopholes for defence, and inside it kitchens, quarters for the enslaved, stables, a
// warehouse for furs, a garden and orchard. The finest house in the town.
const CHOU = { u: -34, v: 50 };
{ const H = addHouse(CHOU.u, CHOU.v, 12.5, 21, { wall: "stone", lime: true, roof: "shingle", gal: "all", gw: 2.6, storeys: 2, face: 1, wh: 3.1, fl: 0.7, chim: 1, kind: "chouteau" }); H.name = "Chouteau";
  const wall = (u0, v0, u1, v1) => { const [ax, az] = toXZ(u0, v0), [bx, bz] = toXZ(u1, v1), L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), mx = (ax + bx) / 2, mz = (az + bz) / 2, gy = Math.min(groundH(ax, az), groundH(bx, bz)) - 0.3, F = FR(mx, mz, ry, gy, "H" + lodKey(mx, mz));
    GTINT = [1.02, 1.0, 0.97]; gbox(F, "stone", 0, 1.65, 0, 0.6, 3.3 + 0.3, L); GTINT = [0.8, 0.78, 0.74]; gbox(F, "stone", 0, 3.5, 0, 0.75, 0.15, L + 0.1);
    for (let s = 2; s < L - 1; s += 3.2) gpoly(F, "dark", [[0.31, 2.1, s - L / 2 - 0.08], [0.31, 2.1, s - L / 2 + 0.08], [0.31, 2.35, s - L / 2 + 0.08], [0.31, 2.35, s - L / 2 - 0.08]], [[0, 0], [1, 0], [1, 1], [0, 1]], [1, 0, 0]);   // loopholes
    const lf = FR(mx, mz, ry, gy, "L" + lodKey(mx, mz)); GTINT = [0.6, 0.58, 0.55]; gbox(lf, "lod", 0, 1.8, 0, 0.6, 3.6, L); solid(mx, mz, 0.7, L, ry); rLine(line([[ax, az], [bx, bz]], true), 1.5, 7); };
  wall(-84, 4, -84, 96); wall(-84, 96, -6, 96); wall(-84, 4, -6, 4); wall(-6, 4, -6, 45); wall(-6, 55, -6, 96);   // a gateway on La Grande Rue
  gShed(-70, 14, 5, 7, "stone", "shingle", { chim: true, door: 1, hip: true }); gShed(-72, 34, 4.5, 11, "stone", "shingle", { door: 1 }); gShed(-72, 80, 6, 14, "stone", "shingle", { wh: 3.2, door: 1 });   // kitchen, quarters, the fur warehouse
  gShed(-50, 12, 7, 9, "plank", "shingle", { wh: 3, door: -1 }); rRectUV(-80, -56, 60, 90, 8); for (let k = 0; k < 14; k++) FRUIT.push([...toXZ(-80 + (k % 4) * 7, 40 + Math.floor(k / 4) * 9), 0.6]);
  markUV("The Chouteau house", CHOU.u, CHOU.v, "known", "Pierre Laclède's stone headquarters of 1764, the first building of St. Louis, bought by Auguste Chouteau in 1789 and rebuilt as the grandest house in the town: two storeys of limestone with galleries all round, its whole block walled in stone with loopholes. Auguste Chouteau, now 50, came here at 14 with Laclède to clear the site in February 1764; with his half-brother Pierre he controls the Osage trade, holding the Spanish licence. Place known; the house's exact form is reconstructed from descriptions.", { y: 12, r: 25, range: 900, big: true }); }
// ---------- the church ----------
// The parish church of St. Louis, of upright logs (poteaux en terre), built in 1776 on the block given for it by Laclède, where the Old
// Cathedral stands today: between the Rue de l'Église (named for it) and the Rue des Granges, the Rue de la Place and the Rue de la Tour,
// one block west of Laclède's house. About 60 by 30 French feet, with a bell. Beside it the priest's house, and the graveyard round it.
// Its exact place in the block, its door and its belfry are reconstructed.
const CHURCH = { u: -135, v: 62 };
{ const [x, z] = toXZ(CHURCH.u, CHURCH.v), gy = groundH(x, z) - 0.2, ry = Math.PI - GR, F = FR(x, z, ry, gy, "H" + lodKey(x, z)), nw = 9.5, nl = 19.5, wh = 4.6;   // the length runs along the block, the door at the north end, toward the Rue de la Place (as the Old Cathedral faces)
  flatUnder(F, nw + 2, nl + 2, gy + 0.2);
  GTINT = [0.5, 0.45, 0.4]; gbox(F, "stone", 0, 0.2, 0, nw + 0.2, 0.4, nl + 0.2); GTINT = [0.98, 0.96, 0.92]; gbox(F, "poteaux", 0, 0.4 + wh / 2, 0, nw, wh, nl);
  for (const sz of [-1, 1]) gpoly(F, "poteaux", [[-nw / 2, 0.4 + wh, sz * nl / 2], [nw / 2, 0.4 + wh, sz * nl / 2], [0, 0.4 + wh + nw * 0.75, sz * nl / 2]], [[0, 0], [nw, 0], [nw / 2, nw * 0.75]], [0, 0, sz]);
  GTINT = [1, 1, 1]; gpoly(F, "door", [[-0.9, 0.42, nl / 2 + 0.03], [0.9, 0.42, nl / 2 + 0.03], [0.9, 3.0, nl / 2 + 0.03], [-0.9, 3.0, nl / 2 + 0.03]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 1]);
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) gpoly(F, "window", [[sx * (nw / 2 + 0.03), 1.6, -nl / 2 + 3 + k * 4.5 - 0.6], [sx * (nw / 2 + 0.03), 1.6, -nl / 2 + 3 + k * 4.5 + 0.6], [sx * (nw / 2 + 0.03), 3.6, -nl / 2 + 3 + k * 4.5 + 0.6], [sx * (nw / 2 + 0.03), 3.6, -nl / 2 + 3 + k * 4.5 - 0.6]], [[0, 0], [1, 0], [1, 1], [0, 1]], [sx, 0, 0]);
  GTINT = [0.9, 0.88, 0.86]; groof(F, "shingle", nw, nl, 0.4 + wh, nw * 0.75, { e: 0.45, g: 0.4 });
  const by = 0.4 + wh + nw * 0.75; GTINT = [0.9, 0.86, 0.8]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(F, "oak", sx * 0.7, by - 0.6 + 1.1, nl / 2 - 1.6 + sz * 0.7, 0.16, 2.2, 0.16, "b");   // the belfry on the ridge
  GTINT = [0.9, 0.88, 0.86]; groof(FR(...gw(F, 0, 0, nl / 2 - 1.6).filter((_, i) => i !== 1), ry, gy + by + 1.6, F.key), "shingle", 1.9, 1.9, 0, 0.9, { hip: true, e: 0.15 });
  gbox(F, "oak", 0, by + 2.9, nl / 2 - 1.6, 0.08, 1.0, 0.08); gbox(F, "oak", 0, by + 3.15, nl / 2 - 1.6, 0.5, 0.08, 0.08);
  const [bx, , bz] = gw(F, 0, 0, nl / 2 - 1.6); put("bell", new THREE.CylinderGeometry(0.18, 0.32, 0.5, 12, 1, true).translate(0, 0.25, 0), M(0x8a6a3a, { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }), bx, gy + by + 0.7, bz, 1, 1, 1);
  const lf = FR(x, z, ry, gy, "L" + lodKey(x, z)); GTINT = [0.62, 0.6, 0.58]; gbox(lf, "lod", 0, (0.4 + wh) / 2, 0, nw, 0.4 + wh, nl); GTINT = [0.3, 0.3, 0.29]; for (const s of [-1, 1]) gpoly(lf, "lod", [[s * (nw / 2 + 0.4), 0.4 + wh, -nl / 2], [s * (nw / 2 + 0.4), 0.4 + wh, nl / 2], [0, by, nl / 2], [0, by, -nl / 2]], [[0, 0], [1, 0], [1, 1], [0, 1]], [s, 1, 0]); GTINT = [1, 1, 1];
  solid(x, z, nw + 0.2, nl + 0.2, ry); rRect(x, z, nw + 2, nl + 2, ry, 2); rRectUV(-174, -96, 4, 96, 4);
  addHouse(-110, 84, 6.5, 10, { face: 1, gal: "fb", kind: "presbytery", lime: true });   // the priest's house
  const R = seeded(1776); for (let k = 0; k < 46; k++) { const cu = -170 + R() * 22, cv = 8 + R() * 82; if (Math.abs(cu - CHURCH.u) < 8 && Math.abs(cv - CHURCH.v) < 13) continue; putUV("cross", BOX_G, MAT.wood, cu, cv, 0, 0.08, 1.0 + R() * 0.4, 0.08); putUV("crossbar", BOX_G, MAT.wood, cu, cv, 0.7, 0.07, 0.07, 0.45); }   // wooden crosses in the graveyard
  fence(-174, 4, -174, 96); fence(-174, 4, -139, 4); fence(-131, 4, -96, 4); fence(-174, 96, -96, 96); fence(-96, 4, -96, 96);
  markUV("The church of St. Louis", CHURCH.u, CHURCH.v, "known", "The parish church, of upright cedar logs on the block Laclède set aside for it, built in 1776 (the first was a tent, then a small log chapel) and blessed by Father Pierre Gibault. About 60 by 30 French feet, roofed with shingles, with a small belfry; the graveyard round it. The Old Cathedral (1834) stands on the same block. The church and its block are known; its form (belfry, windows) and the way it faced are reconstructed: here it faces north, as the Old Cathedral does.", { y: 14, r: 22, range: 900, big: true });
  markUV("The graveyard", -160, 26, "inferred", "The parish burial ground round the church, wooden crosses over the graves. In 1800 the town's dead (French, Spanish, enslaved and free Black Catholics) were buried here.", { y: 3, r: 10, range: 150 }); }
// ---------- the Government House and the Place d'Armes ----------
// The lieutenant governor of Upper Louisiana, Charles Dehault Delassus (since 1799), lived and kept his offices in the Government House,
// a stone house on La Grande Rue at the Rue de la Tour, rented by the Spanish crown. Its exact form is not known. The Place d'Armes, the public square, ran from La Grande Rue down to the landing: the market, the parade
// ground of the militia, and where the town's business with the river was done.
{ const H = addHouse(30, 140, 10, 18, { wall: "stone", lime: true, gal: "all", face: -1, kind: "govt", roof: "shingle" }); H.name = "Government House";
  const [fx, fz] = toXZ(12, 108), fy = groundH(fx, fz); put("flagpole", CYL_G, MAT.wood, fx, fy, fz, 0.14, 13, 0.14);
  const flagT = tex(256, 170, (g, w, h) => { g.fillStyle = "#f4f0e6"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b8202a"; g.lineWidth = 26; g.lineCap = "round"; for (const [a, b, c, d] of [[30, 20, w - 30, h - 20], [w - 30, 20, 30, h - 20]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    g.fillStyle = "#f4f0e6"; for (let k = 0; k < 10; k++) { const t = 0.1 + k * 0.09; for (const [a, b, c, d] of [[30, 20, w - 30, h - 20], [w - 30, 20, 30, h - 20]]) { g.beginPath(); g.arc(a + (c - a) * t, b + (d - b) * t, 7, 0, 6.283); g.fill(); } } });   // the Cross of Burgundy: a red ragged saltire on white
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6, 12, 4).translate(1.2, 0, 0), new THREE.MeshStandardMaterial({ map: flagT, side: THREE.DoubleSide, roughness: 0.9 })); flag.position.set(fx, fy + 12.1, fz); scene.add(flag); FLAGS.push(flag);
  markUV("The Government House", 30, 140, "inferred", "Where the lieutenant governor of Spanish Upper Louisiana lived and worked: since 1799 Charles Dehault Delassus, a Frenchman in Spanish service. The house, of stone, was rented by the crown. Its place on La Grande Rue at the Rue de la Tour is recorded; its form is inferred. In October 1800 Spain secretly agreed to give Louisiana back to France; here, in March 1804, the flags of Spain, France and the United States were raised and lowered in turn.", { y: 9, r: 20, range: 700, big: true });
  markUV("The Place d'Armes", 34, 50, "known", "The public square, from La Grande Rue down to the river landing: the market place, the militia's parade ground, where proclamations were read and auctions held, and where the town met the river. Laclède laid it out in 1764.", { y: 6, r: 30, range: 700, big: true });
  markUV("The flag of Spain", 12, 108, "inferred", "Spain has ruled Louisiana since 1763-1770; Spanish forts flew the Cross of Burgundy, a red ragged saltire on white. Hardly anyone here is Spanish: the governor's officers and the small garrison. The town's language is French.", { y: 13, r: 8, range: 300 }); }
// Pierre Chouteau's house, north on La Grande Rue
{ fence(6, -195.5, 52, -195.5); fence(6, -104.5, 52, -104.5); fence(52, -195.5, 52, -104.5); fence(6, -195.5, 6, -152); fence(6, -148, 6, -104.5); rRectUV(6.5, 51.5, -195, -105, 3); gShed(44, -185, 4.2, 5, "stone", "shingle", { chim: true, door: -1 }); gShed(44, -125, 6, 9, "plank", "shingle", { door: -1 });
  const H = addHouse(28, -150, 8.5, 15, { wall: "stone", lime: true, gal: "all", face: -1, roof: "shingle", kind: "pchouteau" }); markUV("Pierre Chouteau's house", 28, -150, "inferred", "The stone house of Pierre Chouteau, Auguste's half-brother, 41: he lived for years among the Osage and speaks their language, and with Auguste built Fort Carondelet in the Osage country in 1794 under a six-year monopoly of their trade. Its site on La Grande Rue is from the records; its form typical.", { y: 8, r: 16, range: 400 }); }

// ---------- the defences ----------
// After the British-led attack of 26 May 1780 ("l'année du coup") the town was ringed with a palisade and Fernando de Leyba began a round
// stone tower on the hill behind it, Fort San Carlos, at the head of the Rue de la Tour. In the 1790s, fearing attack from Canada or
// the United States, Governor Carondelet's officers built more: a stockade fort round the tower with bastions, and small stone towers at
// the ends of the town. Their exact plan in 1800 is uncertain (Collot's plan of 1796 shows several); here they follow the descriptions.
const FORT = { u: -335, v: 100 };
{ const [x, z] = toXZ(FORT.u, FORT.v), gy = groundH(x, z), tower = (tx, tz, r, h, key = "H") => { const ty = groundH(tx, tz) - 0.4, n = 18, F = FR(tx, tz, 0, ty, key + lodKey(tx, tz));
    for (let k = 0; k < n; k++) { const a0 = k / n * 6.283, a1 = (k + 1) / n * 6.283, P = (a, y) => [Math.sin(a) * r, y, Math.cos(a) * r]; GTINT = [0.96, 0.94, 0.9]; gpoly(F, "stone", [P(a0, 0), P(a1, 0), P(a1, h), P(a0, h)], [[a0 * r, 0], [a1 * r, 0], [a1 * r, h], [a0 * r, h]], [Math.sin((a0 + a1) / 2), 0, Math.cos((a0 + a1) / 2)]);
      if (k % 3 === 0) for (const y of [2.6, h - 1.6]) { const a = (a0 + a1) / 2; gpoly(F, "dark", [[Math.sin(a - 0.03) * (r + 0.03), y, Math.cos(a - 0.03) * (r + 0.03)], [Math.sin(a + 0.03) * (r + 0.03), y, Math.cos(a + 0.03) * (r + 0.03)], [Math.sin(a + 0.03) * (r + 0.03), y + 0.5, Math.cos(a + 0.03) * (r + 0.03)], [Math.sin(a - 0.03) * (r + 0.03), y + 0.5, Math.cos(a - 0.03) * (r + 0.03)]], [[0, 0], [1, 0], [1, 1], [0, 1]], [Math.sin(a), 0, Math.cos(a)]); } }   // loopholes
    GTINT = [0.9, 0.88, 0.86]; for (let k = 0; k < n; k++) { const a0 = k / n * 6.283, a1 = (k + 1) / n * 6.283, re = r + 0.5; gpoly(F, "shingle", [[Math.sin(a0) * re, h - 0.3, Math.cos(a0) * re], [Math.sin(a1) * re, h - 0.3, Math.cos(a1) * re], [0, h + r * 0.9, 0]], [[0, 0], [re * 0.35, 0], [re * 0.17, r]], [Math.sin((a0 + a1) / 2), 0.6, Math.cos((a0 + a1) / 2)]); }   // a conical roof of shingles
    GTINT = [1, 1, 1]; const dF = FR(tx, tz, 0, ty, F.key); gpoly(dF, "plank", [[-0.6, 0.4, r + 0.04], [0.6, 0.4, r + 0.04], [0.6, 2.4, r + 0.04], [-0.6, 2.4, r + 0.04]], [[0, 0], [1, 0], [1, 2], [0, 2]], [0, 0, 1]);
    solid(tx, tz, r * 1.6, r * 1.6, 0); rRect(tx, tz, r * 2 + 1, r * 2 + 1, 0, 7); };
  tower(x, z, 5.2, 9.5);   // Fort San Carlos: the round stone tower of 1780
  const sq = 23, F = FR(x, z, -GR, gy, "H" + lodKey(x, z)), pal = (a, b, c, d) => { const [ax, az] = toXZ(FORT.u + a, FORT.v + b), [bx, bz] = toXZ(FORT.u + c, FORT.v + d); fence(FORT.u + a, FORT.v + b, FORT.u + c, FORT.v + d, 3.6, "palisade"); };
  pal(-sq, -sq, sq, -sq); pal(-sq, sq, sq, sq); pal(-sq, -sq, -sq, sq); pal(sq, -sq, sq, -3); pal(sq, 3, sq, sq);   // the stockade round it, its gate toward the town
  for (const [a, b] of [[-sq, -sq], [sq, sq]]) { const sa = Math.sign(a), sb = Math.sign(b); pal(a, b, a + sa * 7, b + sb * 7); pal(a + sa * 7, b + sb * 7, a + sa * 7, b - sb * 3); pal(a + sa * 7, b + sb * 7, a - sa * 3, b + sb * 7); }   // two corner bastions
  gShed(FORT.u - 10, FORT.v - 14, 5, 12, "poteaux", "shingle", { door: 1 }); gShed(FORT.u + 12, FORT.v - 14, 4.5, 8, "stone", "shingle", { door: -1 });   // barracks and the powder magazine
  const [fx, fz] = toXZ(FORT.u + 8, FORT.v + 8); put("flagpole", CYL_G, MAT.wood, fx, groundH(fx, fz), fz, 0.12, 11, 0.12);
  const flag2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.35, 12, 4).translate(1.0, 0, 0), FLAGS[0].material); flag2.position.set(fx, groundH(fx, fz) + 10.2, fz); scene.add(flag2); FLAGS.push(flag2);
  for (let k = 0; k < 3; k++) { const [cx, cz] = toXZ(FORT.u + 17 - k * 0.1, FORT.v - 12 + k * 6); put("cannon", CYL_G, MAT.iron, cx, groundH(cx, cz) + 0.6, cz, 0.28, 1.9, 0.28, -GR + Math.PI / 2, Math.PI / 2 - 0.1); put("carriage", BOX_G, MAT.wood, cx, groundH(cx, cz), cz, 0.8, 0.55, 1.3, -GR); }
  rRectUV(FORT.u - sq, FORT.u + sq, FORT.v - sq, FORT.v + sq, 4);
  markUV("Fort San Carlos: the tower", FORT.u, FORT.v, "known", "A round stone tower on the hill at the head of the Rue de la Tour (Walnut Street), begun in 1780 by Lieutenant Governor Fernando de Leyba when an attack was feared. On 26 May 1780 about 1,000 warriors (Sauk, Fox, Menominee, Winnebago and Sioux), sent by the British at Michilimackinac, attacked the town; its people, militia and a few Spanish soldiers held them off from the half-built tower and trenches. The tower's place is known; its height and roof are reconstructed.", { y: 14, r: 20, range: 900, big: true });
  markUV("The stockade fort", FORT.u + sq, FORT.v - sq, "inferred", "In the 1790s the Spanish enclosed the tower in a stockade with bastions, with barracks and a powder magazine: the garrison of the Louisiana Regiment here is small, a few dozen men, and the town relies on its militia (every man from 16 to 50). Form inferred from Collot's plan and descriptions.", { y: 6, r: 14, range: 400 }); }
// the palisade round the town, with gates; small stone towers at its ends (inferred)
{ const PU = -236, gaps = [[-306, -294], [-6, 6], [94, 106]]; let v0 = -790; for (const [a, b] of gaps) { fence(PU, v0, PU, a, 3.4, "palisade"); v0 = b; } fence(PU, v0, PU, 790, 3.4, "palisade");
  fence(PU, -790, -30, -790, 3.4, "palisade"); fence(PU, 790, -20, 790, 3.4, "palisade");
  markUV("The palisade", PU, -450, "inferred", "A stockade of logs set upright in a trench, about 3.5 m high, along the back of the town, with gates where the roads left it. Begun after the attack of 1780 and repaired in the 1790s; by 1800 it was decaying, and its exact line is not certain.", { y: 5, r: 14, range: 300 }); }
// ---------- Chouteau's mill ----------
// Laclède built a water mill on La Petite Rivière (Mill Creek) south of the town, damming the creek to make a mill pond; Auguste
// Chouteau bought it in 1779. The pond, "Chouteau's Pond", grew to well over a kilometre long and was the town's favourite place for
// fishing, boating and skating until it was drained in the 1850s. The mill ground the town's wheat and corn.
const MILL = { u: DAM_U + 14, v: creekV(DAM_U) + 22 };
{ const cv = creekV(DAM_U), [x, z] = toXZ(MILL.u, MILL.v), gy = groundH(x, z) - 0.3;
  // the dam: an earth bank faced with stone, across the valley
  { const [dx, dz] = toXZ(DAM_U + 4, cv + 30), F = FR(dx, dz, -GR, 0, "H" + lodKey(dx, dz)); GTINT = [0.7, 0.66, 0.6]; gbox(F, "stone", 0, (POND_Y + 1) / 2, 0, 8, POND_Y + 1, 4); }   // a stone spillway beside the mill
  const F = FR(x, z, -GR, gy, "H" + lodKey(x, z)); flatUnder(F, 14, 16, gy);
  GTINT = [0.94, 0.92, 0.88]; gbox(F, "stone", 0, 3.6, 0, 9, 7.2, 12); GTINT = [0.9, 0.88, 0.86]; groof(F, "shingle", 9, 12, 7.2, 4.2, { e: 0.35 });
  for (const sz of [-1, 1]) gpoly(F, "stone", [[-4.5, 7.2, sz * 6], [4.5, 7.2, sz * 6], [0, 11.4, sz * 6]], [[0, 0], [9, 0], [4.5, 4.2]], [0, 0, sz]);
  GTINT = [1, 1, 1]; gpoly(F, "plank", [[4.53, 0.2, -1.6], [4.53, 0.2, -0.4], [4.53, 2.3, -0.4], [4.53, 2.3, -1.6]], [[0, 0], [1, 0], [1, 2], [0, 2]], [1, 0, 0]);
  for (const [a, b] of [[2.5, -3], [5.2, 3]]) gpoly(F, "window", [[4.53, b, a - 0.5], [4.53, b, a + 0.5], [4.53, b + 1, a + 0.5], [4.53, b + 1, a - 0.5]], [[0, 0], [1, 0], [1, 1], [0, 1]], [1, 0, 0]);
  // the race: a timber flume from the pond to the wheel, on the mill's west side
  GTINT = [0.7, 0.6, 0.5]; gbox(F, "plank", -6.4, POND_Y - gy - 0.3, -4, 1.4, 0.7, 10); solid(...gw(F, -6.4, 0, -4).filter((_, i) => i !== 1), 1.5, 10, -GR);
  solid(x, z, 9.2, 12.2, -GR); rRect(x, z, 14, 16, -GR, 2);
  const lf = FR(x, z, -GR, gy, "L" + lodKey(x, z)); GTINT = [0.62, 0.6, 0.58]; gbox(lf, "lod", 0, 3.6, 0, 9, 7.2, 12); GTINT = [1, 1, 1];
  markUV("Chouteau's mill", MILL.u, MILL.v, "known", "The town's water mill on Mill Creek (La Petite Rivière), built by Laclède and owned since 1779 by Auguste Chouteau. Its dam holds back Chouteau's Pond. The farmers bring their wheat and corn here; the miller keeps a share as his toll. The site is known; the mill's form is typical of the time.", { y: 13, r: 22, range: 800, big: true });
  markUV("Chouteau's Pond", DAM_U - 700, creekV(DAM_U - 700), "known", "The mill pond behind the dam, well over a kilometre long, wooded along its banks: for fishing and boating in summer and skating in winter. It was drained in the 1850s, when the railway came; Union Station and the rail yards stand in its valley now.", { y: 4, r: 120, range: 2500, big: true }); }
// ---------- the mounds north of the town ----------
for (const Mo of MOUNDS) if (Mo.name) markUV(Mo.name, Mo.u, Mo.v, "known", "The largest of some two dozen mounds on the terrace north of the town, raised by the Mississippian people who built Cahokia, across the river, about 1050-1300. An oval ridge-topped mound about 97 by 48 m and 10 m high; the French called it La Grange de Terre, the earth barn. Its builders were long gone by 1764; the Osage and others who came to trade knew nothing of them, or would not say. It was carted away for railway fill in 1869.", { y: 14, r: 50, range: 2500, big: true });
// ---------- the common fields' fence ----------
// The common field (le grand champ) was fenced against the cattle as one, each family keeping up its own length of fence.
{ const posts = (u0, v0, u1, v1) => { const L = Math.hypot(u1 - u0, v1 - v0), n = Math.ceil(L / 3.5); for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n, v = v0 + (v1 - v0) * k / n; putUV("fpost", BOX_G, MAT.wood, u, v, -0.1, 0.12, 1.5, 0.12); if (k < n) { const um = u + (u1 - u0) / n / 2, vm = v + (v1 - v0) / n / 2; for (const y of [0.6, 1.1]) putUV("frail", BOX_G, MAT.wood, um, vm, y, u0 === u1 ? 0.07 : L / n, 0.08, u0 === u1 ? L / n : 0.07); } } };
  for (const F of FIELDS) { posts(F.u0, F.v0, F.u1, F.v0); posts(F.u0, F.v1, F.u1, F.v1); posts(F.u0, F.v0, F.u0, F.v1); posts(F.u1, F.v0, F.u1, F.v1);
    markUV(F.name, (F.u0 + F.u1) / 2, (F.v0 + F.v1) / 2, "known", "The common fields: long strips, each an arpent wide (58.5 m) and up to 40 arpents long, granted to the families of the town and farmed side by side inside one fence. Wheat (sown in autumn) is up and green; the corn was planted this month; some strips grow oats, flax, tobacco or lie fallow. Many townspeople farmed; others had their fields worked by enslaved labourers. The layout follows the French long lots of the Illinois country; the strips here are representative.", { y: 4, r: 300, range: 3000, big: true }); } }


// ---------- across the river: Cahokia and the ferry ----------
// Cahokia, the old French village of the Illinois country (a mission from 1699), stood about 6 km south-east of St. Louis, a mile or
// so inland from the river on Cahokia Creek. American since the Revolution, it was in the Northwest Territory (the Indiana Territory
// from July 1800), with perhaps 700 people, French in language and ways like St. Louis. Its church of the Holy Family, built in 1799 of
// upright walnut logs on a sill, still stands, as does the "Cahokia Courthouse", a French house of about 1740 used as the courthouse
// from 1793. Village plan and houses here are typical; the church and courthouse are placed in it by eye.
const CAHOKIA = (() => { const [x, z] = LL(38.5705, -90.1898), [u, v] = toUV(x, z); return { u, v }; })();
AROUND_FLAT.push([CAHOKIA.u, CAHOKIA.v, 650]);
{ const R = seeded(1699), C = CAHOKIA, streets = [[-120, -320, -120, 320], [-20, -320, -20, 320], [80, -300, 80, 300], [-200, -60, 200, -60], [-200, 120, 200, 120]];
  for (const [a, b, c, d] of streets) { const L = lineUV([[C.u + a, C.v + b], [C.u + c, C.v + d]]); rLine(L, 8, 1); }
  for (let k = 0; k < 120; k++) { const su = [-120, -20, 80][k % 3] + (R() < 0.5 ? -1 : 1) * 24, sv = -300 + R() * 600, u0 = C.u + su - 18, v0 = C.v + sv; if (LOTS.some(l => Math.abs(l.u0 - u0) < 36 && Math.abs(l.v0 - v0) < 44)) continue; if (R() < 0.25) continue;
    makeLot(u0, u0 + 36, v0, v0 + 40, su > [-120, -20, 80][k % 3] ? -1 : 1, 0.85, R); if (LOTS.filter(l => Math.abs(l.u0 - C.u) < 400 && Math.abs(l.v0 - C.v) < 400).length > 55) break; }
  for (let s = -600; s < 600; s += ARPENT) rRectUV(C.u + 260, C.u + 1600, C.v + s + 0.8, C.v + s + ARPENT - 0.8, 5);   // Cahokia's common field, long lots east of the village
  // the church of the Holy Family (1799)
  { const [x, z] = toXZ(C.u - 70, C.v + 10), gy = groundH(x, z) - 0.15, ry = Math.PI - GR, F = FR(x, z, ry, gy, "H" + lodKey(x, z)), nw = 10, nl = 22, wh = 4.4;
    GTINT = [0.5, 0.45, 0.4]; gbox(F, "stone", 0, 0.25, 0, nw + 0.3, 0.5, nl + 0.3); GTINT = [0.72, 0.64, 0.54]; gbox(F, "poteaux", 0, 0.5 + wh / 2, 0, nw, wh, nl);
    for (const sz of [-1, 1]) gpoly(F, "poteaux", [[-nw / 2, 0.5 + wh, sz * nl / 2], [nw / 2, 0.5 + wh, sz * nl / 2], [0, 0.5 + wh + nw * 0.7, sz * nl / 2]], [[0, 0], [nw, 0], [nw / 2, nw * 0.7]], [0, 0, sz]);
    GTINT = [1, 1, 1]; gpoly(F, "door", [[-0.9, 0.52, nl / 2 + 0.03], [0.9, 0.52, nl / 2 + 0.03], [0.9, 3.0, nl / 2 + 0.03], [-0.9, 3.0, nl / 2 + 0.03]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, 1]);
    GTINT = [0.9, 0.88, 0.86]; groof(F, "shingle", nw, nl, 0.5 + wh, nw * 0.7, { e: 0.6, g: 0.4 }); const by = 0.5 + wh + nw * 0.7; gbox(F, "oak", 0, by + 0.8, nl / 2 - 1.4, 1.2, 1.6, 1.2, "b"); groof(FR(...gw(F, 0, 0, nl / 2 - 1.4).filter((_, i) => i !== 1), ry, gy + by + 1.6, F.key), "shingle", 1.6, 1.6, 0, 1.2, { hip: true, e: 0.1 });
    solid(x, z, nw, nl, ry); rRect(x, z, nw + 2, nl + 2, ry, 2); const lf = FR(x, z, ry, gy, "L" + lodKey(x, z)); GTINT = [0.5, 0.46, 0.4]; gbox(lf, "lod", 0, (0.5 + wh) / 2, 0, nw, 0.5 + wh, nl); GTINT = [1, 1, 1];
    for (let k = 0; k < 24; k++) { const cu = C.u - 92 + (k % 6) * 3.5, cv = C.v + 26 + Math.floor(k / 6) * 3.5; putUV("cross", BOX_G, MAT.wood, cu, cv, 0, 0.08, 1.1, 0.08); putUV("crossbar", BOX_G, MAT.wood, cu, cv, 0.75, 0.07, 0.07, 0.45); }
    markUV("Cahokia: the Holy Family church", C.u - 70, C.v + 10, "known", "The parish church of Cahokia, built in 1799 of upright walnut logs set on a sill (poteaux sur solle), the oldest church west of the Alleghenies still in use. The Cahokia mission was founded in 1699 by priests from Quebec. The church stands; its exact place in this reconstructed village is approximate.", { y: 12, r: 25, range: 3000, big: true }); }
  // the courthouse: a French house of about 1740, the seat of justice from 1793
  addHouse(C.u + 40, C.v - 30, 8, 13, { wall: "poteaux", gal: "all", face: 1, roof: "shingle", lime: false, kind: "courthouse" });
  markUV("Cahokia: the courthouse", C.u + 40, C.v - 30, "known", "A French house of upright logs with galleries all round, built about 1740 and used from 1793 as the courthouse of St. Clair County: where the American territory's law was kept for the Illinois villages. It survives (rebuilt in the 1930s from its own timbers). Its place in this village is approximate.", { y: 8, r: 15, range: 1500 });
  markUV("Cahokia", C.u, C.v - 120, "known", "The French village of Cahokia, across the river and some 6 km downstream: founded as a mission in 1699, a generation older than St. Louis, now American (Northwest Territory; Indiana Territory from July 1800), with about 700 people. Many of its families had kin in St. Louis, and some moved there to stay under the French-speaking Spanish crown when the Americans came. Its houses and plan here are typical.", { y: 10, r: 120, range: 6000, big: true }); }
// Piggott's ferry: on the Illinois shore opposite the town, the landing of the ferry James Piggott (an American, a veteran of the Revolution)
// ran from about 1797; his cabin built the American way, of horizontal logs
{ const v = 400, u = riverU(v) + RIVER_HW + 45; AROUND_FLAT.push([u, v, 60]); gShed(u, v, 5.5, 7.5, "logs", "shingle", { chim: true, door: -1, wh: 2.4 }); gShed(u + 14, v + 8, 4, 6, "logs", "shingle", { door: -1 });
  markUV("Piggott's ferry landing", u, v, "inferred", "The Illinois landing of the ferry to St. Louis, run from about 1797 by James Piggott, an American from Pennsylvania who had fought in the Revolution. His cabin is of horizontal logs notched at the corners: the American way of building, quite different from the French upright logs across the river. The Illinois side is American: the Northwest Territory, the Indiana Territory from 4 July 1800.", { y: 6, r: 20, range: 1500 }); }


// ---------- trees ----------
// The Illinois shore across the river was bottomland forest (cottonwood, sycamore, willow, elm, pecan); on this side, timber along
// the bluff and in the creek valley, groves of oak and walnut on the prairie's edge, and in the town's yards the orchards the French
// were known for: apples, pears, peaches, cherries, plums. In late May everything is in full leaf.
const TRUNK_G = new THREE.CylinderGeometry(0.12, 0.26, 1, 6).translate(0, 0.5, 0), CROWN_G = new THREE.IcosahedronGeometry(1, 0), trunkM = M(0x4e4236, { roughness: 1 });
const leafM = [0x3e5e2a, 0x4a6a30, 0x365526, 0x52703a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
const tree = (x, z, s, kind = 0, far = false) => { const h = groundH(x, z), R = seeded((x * 13 + z * 7) | 0), k = far ? "f" : ""; put(k + "trunk", TRUNK_G, trunkM, x, h - 0.2, z, s, 5.5 * s, s, R() * 6.28);
  const n = far ? 1 : 3; for (let q = 0; q < n; q++) put(k + "crown", CROWN_G, leafM[0], x + (R() - 0.5) * 2.2 * s * (far ? 0 : 1), h + (5.5 + R() * 2.2) * s, z + (R() - 0.5) * 2.2 * s * (far ? 0 : 1), (far ? 3.6 : 2.4) * s, (far ? 3.0 : 2.1) * s, (far ? 3.6 : 2.4) * s, R() * 6); };
{ const R = seeded(71); let n = 0, cap = IS_HEADSET ? 3200 : 5200;
  for (let k = 0; k < 400000 && n < cap; k++) { const x = RX0 + R() * RW * RC, z = RZ0 + R() * RH * RC, h = baseH(x, z); if (h < 0.6) continue;   // spread evenly over the map
    const v = rGet(x, z); if (v !== 0 && v !== 6) continue; const [u, vv] = toUV(x, z), s = riverU(vv) - RIVER_HW - u, cv = creekV(u), creek = Math.abs(vv - cv) < 200 && u < 100 && Math.abs(vv - cv) > 8;
    if (inPond(x, z)) continue; const rav = Math.pow(1 - Math.abs(2 * fbm(x / 700 + 2, z / 700 + 5, 3) - 1), 6) * sstepN(-u, 500, 900);   // ravines cutting the prairie's edge, wooded
    const p = (s < 60 ? 0.3 : creek ? 0.5 : rav > 0.35 ? 0.45 : u < -2600 ? 0.3 : u < -280 ? 0.015 + 0.45 * sstepN(fbm(x / 450 + 3, z / 450, 2), 0.6, 0.7) : 0.05) * 0.25;   // the bluff and the creek wooded; oak groves dotting the prairie
    if (R() > p) continue; tree(x, z, 0.9 + R() * 0.7, (R() * 4) | 0); n++; } }
// the forest on the Illinois shore, seen across the river: big cottonwoods and sycamores
// (a belt of forest 1-2 km deep along the river; beyond it, the wet prairie of the American Bottom with scattered groves)
{ const R = seeded(73); let n = 0, cap = IS_HEADSET ? 4500 : 8000; for (let k = 0; k < 120000 && n < cap; k++) { const v = -5500 + R() * 14000, d = 30 + R() * 4200, belt = 1500 + 500 * fbm(v / 900, 3, 2);
    if (d > belt && R() > 0.07) continue; if (d < belt && R() > 0.9) continue; const u = riverU(v) + RIVER_HW + d, [x, z] = toXZ(u, v); if (baseH(x, z) < 0.7 || AROUND_FLAT.some(([cu, cv, r]) => Math.hypot(u - cu, v - cv) < r * 0.9)) continue;
    tree(x, z, (d < belt ? 2.0 : 1.3) + R() * 1.1, (R() * 4) | 0, true); n++; } }   // cottonwoods and sycamores 25-30 m tall
// fruit trees in the yards
for (const [x, z, s] of FRUIT) { const h = groundH(x, z), R = seeded((x * 5 + z * 3) | 0); put("fruit", TRUNK_G, trunkM, x, h - 0.1, z, s * 0.7, 2.6 * s, s * 0.7, R() * 6); put("fcap", CROWN_G, leafM[1], x, h + 3.2 * s, z, 2.2 * s, 1.7 * s, 2.2 * s, R() * 6); }

// ---------- the prairie's tall grass, round you as you walk ----------
// Big bluestem, Indian grass and switchgrass, knee- to waist-high in May, with spring flowers: drawn as clumps near you only.
const GRASS_N = IS_HEADSET ? 2200 : 4200, GRASS = new THREE.InstancedMesh((() => { const parts = [0, Math.PI / 3, Math.PI * 2 / 3].map(a => new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateY(a).toNonIndexed()), out = new THREE.BufferGeometry();   // three crossed planes, keeping their texture coordinates
  for (const k of ["position", "normal", "uv"]) out.setAttribute(k, new THREE.Float32BufferAttribute(parts.flatMap(g => [...g.attributes[k].array]), k === "uv" ? 2 : 3)); return out; })(),
  new THREE.MeshStandardMaterial({ map: tex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); for (let k = 0; k < 70; k++) { const x = rnd() * w, top = rnd() * h * 0.6; g.strokeStyle = ["#7a8a3a", "#8a9a48", "#6a7a30", "#9aa456", "#a8a060"][(rnd() * 5) | 0]; g.lineWidth = 1.5 + rnd() * 2; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (rnd() - 0.5) * 20, h * 0.6, x + (rnd() - 0.5) * 30, top); g.stroke(); }
    for (let k = 0; k < 6; k++) { g.fillStyle = ["#a868b0", "#e0c040", "#f0f0e0"][(rnd() * 3) | 0]; g.beginPath(); g.arc(rnd() * w, rnd() * h * 0.5 + 8, 3 + rnd() * 3, 0, 6.283); g.fill(); } }), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }), GRASS_N);
GRASS.frustumCulled = false; GRASS.count = 0; scene.add(GRASS); let grassAt = [1e9, 1e9];
function grassStep() { if (Math.hypot(P_.x - grassAt[0], P_.z - grassAt[1]) < 12) return; grassAt = [P_.x, P_.z]; let n = 0; const R = seeded(((P_.x / 12) | 0) * 7 + ((P_.z / 12) | 0) * 13);
  for (let k = 0; k < GRASS_N * 3 && n < GRASS_N; k++) { const a = R() * 6.283, r = Math.sqrt(R()) * 70, x = P_.x + Math.cos(a) * r, z = P_.z + Math.sin(a) * r, [u, v] = toUV(x, z), h = baseH(x, z); if (u > -270 || h < 12 || rGet(x, z) !== 0) continue;
    const s = 0.7 + R() * 0.6; O3.position.set(x, h - 0.05, z); O3.rotation.set(0, R() * 3, 0); O3.scale.set(s * 1.1, s * (0.8 + R() * 0.5), s * 1.1); O3.updateMatrix(); GRASS.setMatrixAt(n++, O3.matrix); }
  GRASS.count = n; GRASS.instanceMatrix.needsUpdate = true; }

// ---------- boats at the landing ----------
// The keelboat was the river's freighter: 15-25 m long, built on a keel, with a cargo box amidships, a mast for the towline (the
// cordelle) and a sail, and running boards along each side for the crew to walk aft pushing on their setting poles. Upstream a
// crew of 20 or more poled, rowed, sailed or hauled it on the cordelle from the bank, 15-25 km a day. Bateaux and Mackinaw boats were
// lighter; pirogues were dugout canoes of cottonwood or walnut. A ferry to the Illinois shore had run since about 1797.
function boatGeo(L, B, D) { const NU = 12, NV = 6, pos = [], idx = [];
  for (let i = 0; i <= NU; i++) { const u = i / NU, z = (u - 0.5) * L, tp = 1 - Math.pow(Math.abs(u - 0.5) * 2, 2.6), sheer = D * 0.3 * Math.pow(Math.abs(u - 0.5) * 2, 3);
    for (let j = 0; j <= NV; j++) { const v = j / NV, a = Math.PI * v; pos.push(Math.cos(a) * B / 2 * Math.max(0.05, tp), D - Math.sin(a) * D * Math.max(0.3, Math.sqrt(tp)) + sheer, z); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const BOAT_G = boatGeo(1, 1, 1), hullM = M(0x5a4a3a, { side: THREE.DoubleSide }), boxM = M(0x7a6a56), tarpM = M(0xd8ccb0, { side: THREE.DoubleSide });
// a keelboat as one group (for the one that leaves), or as kit parts (for those moored)
function keelGroup() { const g = new THREE.Group(), add = (geo, mat, x, y, z, sx, sy, sz, rx = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.x = rx; g.add(m); return m; };
  add(BOAT_G, hullM, 0, -0.55, 0, 3.4, 1.35, 19); add(BOX_G, boxM, 0, 0.7, -0.5, 2.6, 1.3, 9.5); add(BOX_G, MAT.plank, 0, 2.0, -0.5, 2.9, 0.12, 9.8);
  for (const sx of [-1, 1]) add(BOX_G, MAT.plank, sx * 1.5, 0.75, -0.5, 0.36, 0.06, 12);   // the running boards
  add(CYL_G, MAT.wood, 0, 0.7, 4.8, 0.2, 9.5, 0.2); add(BOX_G, MAT.wood, 0, 0.6, -9.4, 0.12, 0.12, 4, 0.2);   // the mast and the steering oar
  for (let k = 0; k < 5; k++) add(BOX_G, M(0x8a6a48), (k % 2 - 0.5) * 0.9, 0.75, 7.1 + (k > 2 ? -1.1 : 0), 0.7, 0.45, 0.55);   // bales on the foredeck
  return g; }
const KEEL_AT = (v, off = 6) => { const u = riverU(v) - RIVER_HW + off; return toXZ(u, v); };
{ for (const [v, off, ry] of [[30, 7, 0.06], [78, 6.5, -0.04]]) { const [x, z] = KEEL_AT(v, off), g = keelGroup(); g.position.set(x, WATER, z); g.rotation.y = -GR + Math.PI + ry; scene.add(g); }
  const R = seeded(808); for (let k = 0; k < 9; k++) { const v = -20 + k * 7 + R() * 3, [x, z] = KEEL_AT(v, 1.5 + R() * 2.5); put("pirogue", BOAT_G, hullM, x, WATER - 0.12, z, 0.95, 0.55, 8 + R() * 3, -GR + Math.PI / 2 + (R() - 0.5) * 0.4); }   // dugouts drawn up on the beach
  for (const [v, off, ry] of [[-14, 8, 0.03], [112, 7.5, -0.02]]) { const [x, z] = KEEL_AT(v, off), g = keelGroup(); g.position.set(x, WATER, z); g.rotation.y = -GR + ry; scene.add(g); }
  for (let k = 0; k < 4; k++) { const [x, z] = KEEL_AT(132 + k * 17, 7); put("bateau", BOAT_G, hullM, x, WATER - 0.3, z, 3.0, 0.9, 12, -GR + Math.PI); put("bateaubox", BOX_G, tarpM, x, WATER + 0.3, z, 2.2, 0.8, 5, -GR); }
  for (let k = 0; k < 8; k++) { const v = 80 + k * 6, [x, z] = KEEL_AT(v, 1.5 + (k % 3)); put("pirogue", BOAT_G, hullM, x, WATER - 0.12, z, 0.9, 0.5, 7 + (k % 4), -GR + Math.PI / 2 + 0.2 * (k % 3 - 1)); }
  { const [x, z] = KEEL_AT(205, 8); for (let k = 0; k < 14; k++) put("raftlog", CYL_G, MAT.wood, x + Math.cos(-GR) * (k - 7) * 0.45, WATER - 0.2, z - Math.sin(-GR) * (k - 7) * 0.45, 0.42, 14, 0.42, -GR, Math.PI / 2); }   // a raft of logs, floated down for building
  // goods on the beach: packs of furs going down, lead in pigs from the mines, kegs of salt, barrels of flour and whiskey, trade goods coming up
  { const R = seeded(1765); for (let k = 0; k < 70; k++) { const v = -10 + R() * 120, u = riverU(v) - RIVER_HW - 12 - R() * 16, [x, z] = toXZ(u, v), g = groundH(x, z), t = R();
      if (t < 0.35) put("cargo", BOX_G, M(0x8a6a48), x, g, z, 0.9, 0.55 + (k % 3) * 0.5, 0.9, -GR + R()); else if (t < 0.6) put("barrel", CYL_G, MAT.wood, x, g, z, 0.6, 0.85, 0.6); else if (t < 0.75) put("leadpig", BOX_G, M(0x6a6e74, { metalness: 0.5, roughness: 0.5 }), x, g, z, 0.5, 0.3 + 0.15 * (k % 3), 0.25, -GR + R()); else if (t < 0.88) put("cratepile", BOX_G, M(0xb09a72), x, g, z, 1.1, 0.7, 0.8, -GR + R()); else put("lumber", BOX_G, M(0x9a7a52), x, g, z, 0.3, 0.25, 5, -GR + 0.1 * R()); } }
  markUV("The riverfront trade", riverU(50) - RIVER_HW - 18, 40, "known", "The landing was St. Louis's business: furs and hides (deer, beaver, otter, bear, buffalo robes) went down to New Orleans; up came the convoys of keelboats with cloth, blankets, guns, powder, kettles, tools, sugar, coffee, wine and brandy, three or four months' hard work against the current. Bateaux brought lead from the mines and salt from the springs; hunters and Native traders came in by canoe. Porters (many of them enslaved) carried it all up to the merchants' storehouses. Much of the town's money was furs, lead and salt. The goods and boats here are typical; the trade is well recorded.", { y: 4, r: 30, range: 800, big: true });
  markUV("The landing", riverU(50) - RIVER_HW - 8, 50, "known", "Below the Place d'Armes the bank sloped down to a natural landing (the levee), where boats were drawn up and unloaded: keelboats from New Orleans (three or four months upstream) with sugar, coffee, cloth, guns, powder, kettles and wine; bateaux with lead from the mines and salt from the springs; pirogues of hunters and traders. Furs (deer, beaver, otter, bear) went down. The beach and boats here are typical; the landing's place is known.", { y: 4, r: 30, range: 800, big: true }); }


// animals, carts and small things, used below
const COW_G = mergeG([[new THREE.CapsuleGeometry(0.38, 0.95, 4, 10).rotateX(Math.PI / 2), MT(0, 0.98, 0, 0.92, 1, 1)], [new THREE.CylinderGeometry(0.16, 0.22, 0.45, 8).rotateX(-1.0), MT(0, 1.05, 0.72)], [new THREE.CapsuleGeometry(0.15, 0.25, 3, 8).rotateX(Math.PI / 2 + 0.5), MT(0, 0.92, 1.0)],
  ...[[0.2, 0.5], [-0.2, 0.5], [0.2, -0.5], [-0.2, -0.5]].map(([x, z]) => [new THREE.CylinderGeometry(0.095, 0.075, 0.7, 7), MT(x, 0.35, z)]), [new THREE.ConeGeometry(0.03, 0.2, 4), MT(0.12, 1.12, 1.0, 1, 1, 1, 0, -0.9)], [new THREE.ConeGeometry(0.03, 0.2, 4), MT(-0.12, 1.12, 1.0, 1, 1, 1, 0, 0.9)], [new THREE.CylinderGeometry(0.02, 0.01, 0.6, 4), MT(0, 0.8, -0.85, 1, 1, 1, 0.2, 0)]]);
const HORSE_G = mergeG([[new THREE.CapsuleGeometry(0.3, 0.85, 4, 10).rotateX(Math.PI / 2), MT(0, 1.12, 0, 0.9, 1, 1)], [new THREE.CylinderGeometry(0.13, 0.2, 0.7, 8).rotateX(-0.75), MT(0, 1.42, 0.62)], [new THREE.CapsuleGeometry(0.11, 0.38, 3, 8).rotateX(Math.PI / 2 + 0.9), MT(0, 1.62, 0.92)],
  ...[[0.17, 0.48], [-0.17, 0.48], [0.17, -0.48], [-0.17, -0.48]].map(([x, z]) => [new THREE.CylinderGeometry(0.08, 0.055, 0.9, 7), MT(x, 0.45, z)]), [new THREE.ConeGeometry(0.09, 0.6, 6), MT(0, 0.92, -0.75, 1, 1, 1, 0.5, 0)], [new THREE.BoxGeometry(0.06, 0.32, 0.5), MT(0, 1.62, 0.6, 1, 1, 1, -0.75, 0)]]);
const PIG_G = mergeG([[new THREE.SphereGeometry(0.3, 8, 6), MT(0, 0.5, 0, 0.75, 0.75, 1.5)], [new THREE.SphereGeometry(0.15, 6, 4), MT(0, 0.55, 0.48, 1, 0.9, 1.2)], ...[[0.13, 0.3], [-0.13, 0.3], [0.13, -0.3], [-0.13, -0.3]].map(([x, z]) => [new THREE.CylinderGeometry(0.04, 0.035, 0.32, 5), MT(x, 0.16, z)])]);
const CART_G = mergeG([[new THREE.BoxGeometry(1.3, 0.12, 2.3), MT(0, 0.75, 0)], [new THREE.BoxGeometry(0.06, 0.45, 2.3), MT(0.62, 0.98, 0)], [new THREE.BoxGeometry(0.06, 0.45, 2.3), MT(-0.62, 0.98, 0)], [new THREE.BoxGeometry(1.3, 0.45, 0.06), MT(0, 0.98, -1.12)],
  [new THREE.BoxGeometry(0.07, 0.07, 2.4), MT(0.45, 0.78, 2.2)], [new THREE.BoxGeometry(0.07, 0.07, 2.4), MT(-0.45, 0.78, 2.2)], [new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6).rotateZ(Math.PI / 2), MT(0, 0.55, 0)]]);
const WHEEL2_G = (() => { const p = [[new THREE.TorusGeometry(0.55, 0.05, 4, 14), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8).rotateX(Math.PI / 2), MT(0, 0, 0)]]; for (let k = 0; k < 6; k++) p.push([new THREE.BoxGeometry(0.05, 1.05, 0.04), new THREE.Matrix4().makeRotationZ(k / 6 * Math.PI)]); return mergeG(p).rotateY(Math.PI / 2); })();
const PROP_SACK_G = new THREE.SphereGeometry(0.3, 7, 5).scale(1, 1.3, 1).translate(0, 0.38, 0), OAK_NEW = M(0x9a7a52, { roughness: 0.85 });

// ---------- work at hand: crafts and machines of 1800 ----------
// Sites where the tools of the town can be seen in use, each with its parts labelled: the fur press that packed the peltries for the
// river; the smith's forge; Chouteau's water mill; a bake oven in a yard; a house going up in the French way, upright logs on a sill, the
// gaps packed with bousillage; and a keelboat being loaded for the Missouri.
const TECH_ANIM = [], TECH_JOBS = [];
// a job in frame F's local coordinates: steps [u, v, faceU, faceV, pose, seconds, held, carriedThere]
const techJob = (role, F, steps, ph = 0) => TECH_JOBS.push({ role, ph, steps: steps.map(([u, v, fu, fv, k, d, c, wc]) => { const [x, , z] = gw(F, u, 0, v), [fx, , fz] = gw(F, fu, 0, fv), st = { p: [x, z], f: [fx, fz], k, d, c: c || null }; if (wc !== undefined) st.wc = wc; return st; }) });
const techLabel = (F, u, v, y, name, text) => { const [x, , z] = gw(F, u, 0, v); mark(name, x, z, "known", text, { y, range: 30, r: 2.5 }); };
const frameUV = (u, v, rot = 0) => { const [x, z] = toXZ(u, v); return FR(x, z, -GR + rot, groundH(x, z), "tech"); };
// the fur press, in the yard of the Chouteaus' warehouse: skins stacked in a frame and squeezed under a long lever into packs of about
// 100 lb, tied with thongs and marked, for the keelboats to New Orleans or Montreal. Deerskins (shaved and dried) were also the town's
// money: prices were reckoned in livres, but paid in peltries.
{ const F = frameUV(-56, 76), gy = F.gy; GTINT = [1, 1, 1];
  for (const sx of [-0.6, 0.6]) for (const sz of [-0.6, 0.6]) put("tk:presspost", BOX_G, MAT.wood, ...gw(F, sx, 0, sz), 0.16, 1.6, 0.16);
  put("tk:pressbed", BOX_G, MAT.wood, ...gw(F, 0, 0, 0), 1.4, 0.2, 1.4); const pack = put("tk:pack", BOX_G, MAT.hide, ...gw(F, 0, 0.2, 0), 0.95, 0.6, 0.95);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 5.5).translate(0, 0, 2.2), MAT.wood), [lx, , lz] = gw(F, 0, 0, -0.5); lever.position.set(lx, gy + 1.5, lz); lever.rotation.order = "YXZ"; lever.rotation.y = -GR; scene.add(lever);
  TECH_ANIM.push(t => lever.rotation.x = 0.12 + 0.16 * Math.sin(t * 0.8));
  for (let k = 0; k < 8; k++) put("tk:skins", BOX_G, M([0xa8865a, 0x8a6a48, 0x6a4a32][k % 3]), ...gw(F, -2.4 + (k % 2) * 0.7, 0, -1.5 + Math.floor(k / 2) * 0.9), 0.6, 0.12 + 0.05 * k, 0.8);
  for (let k = 0; k < 6; k++) put("tk:packs", BOX_G, MAT.hide, ...gw(F, 2.4, 0.6 * (k % 3), -1.2 + Math.floor(k / 3) * 1.1), 0.9, 0.58, 0.9);
  techJob("enslaved", F, [[-2.0, -0.6, -2.4, -1.5, "kneel", 5], [-0.7, 0, 0, 0, "sell", 4, null, "hide"], [0, 3.2, 0, 4.6, "lever", 9], [-2.0, -0.6, -2.4, -1.5, "kneel", 4]]);
  techJob("creole", F, [[0.4, 4.2, 0, 4.6, "lever", 14], [1.6, 0.9, 2.4, 0.4, "sell", 5], [0.8, 0.6, 0, 0, "kneel", 6]], 7);
  techLabel(F, 0, 0, 1.9, "The fur press", "Skins stacked in a frame of four posts and pressed flat under a long lever (here a man's weight on a 5 m pole) into a compact pack of about 100 pounds, to be tied with rawhide and marked with the trader's sign. A keelboat carried hundreds."); techLabel(F, -2.4, -1, 1.2, "Deerskins", "Shaved, dried deerskins: the commonest fur, and the town's money. A good skin was worth about 40 sous; prices in St. Louis were written in livres but paid in peltries, or in lead.");
  techLabel(F, 2.4, -0.6, 1.8, "Packs for the river", "Pressed packs of beaver, otter, bear and deer, ready for the landing. The Chouteaus' furs went down to New Orleans, or north by Michilimackinac to Montreal and London.");
  markUV("The fur press", -56, 76, "typical", "The fur trade is why St. Louis exists: Laclède's company held the trade of the Missouri. In the yard of the Chouteaus' warehouse men press furs into packs for the river. The press is typical of the trade; the Chouteaus' furs passed through such a yard.", { y: 4, r: 8, range: 300 }); }
// a smithy on La Grande Rue
{ const L = LOTS.filter(l => l.house && l.face < 0 && l.v0 > 180 && l.v0 < 420)[0] || LOTS[10], u = (L.u0 + L.u1) / 2 + 6, v = L.v0 + 6, F = frameUV(u, v);
  gShed(u, v, 5, 6, "plank", "shingle", { door: -1, wh: 2.6 }); const gy = F.gy;
  const coal = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: 0xff6a20, emissive: 0xff4a10, emissiveIntensity: 1.4 })), [cx, , cz] = gw(F, -3.6, 0, -1.2); coal.position.set(cx, gy + 0.95, cz); scene.add(coal); TECH_ANIM.push(t => coal.material.emissiveIntensity = 1.0 + 0.5 * Math.abs(Math.sin(t * 2.6)));
  put("tk:forge", BOX_G, MAT.stone, ...gw(F, -3.6, 0, -1.2), 1.4, 0.9, 1.2); const bel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 1.2).translate(0, 0.25, 0), M(0x5a3a22)), [bx, , bz] = gw(F, -4.6, 0, -0.6); bel.position.set(bx, gy + 0.8, bz); bel.rotation.y = -GR; scene.add(bel); TECH_ANIM.push(t => bel.scale.y = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6)));
  put("tk:stump", CYL_G, MAT.wood, ...gw(F, -3.6, 0, 0.6), 0.55, 0.6, 0.55); put("tk:anvil", BOX_G, MAT.iron, ...gw(F, -3.6, 0.6, 0.6), 0.28, 0.28, 0.65); put("tk:tub", CYL_G, MAT.wood, ...gw(F, -2.4, 0, 1.4), 0.8, 0.6, 0.8);
  techJob("creole", F, [[-3.0, -1.2, -3.6, -1.2, "sell", 5, "bar"], [-2.9, 0.6, -3.6, 0.6, "hammer", 8, "bar"], [-3.0, -1.2, -3.6, -1.2, "sell", 4, "bar"], [-2.9, 0.6, -3.6, 0.6, "hammer", 6, "bar"], [-2.4, 0.9, -2.4, 1.4, "sell", 2.5, "bar"]]);
  techJob("child", F, [[-4.6, 0.1, -4.6, -0.6, "hammer", 30]]);
  techLabel(F, -3.6, -1.2, 1.8, "The forge", "A stone hearth burning charcoal, blown by bellows to forging heat. The smiths of St. Louis made and mended hoes, axes, ploughshares, nails and hinges, shod horses and repaired the traders' guns: iron and steel came up from New Orleans."); techLabel(F, -4.6, -0.6, 1.5, "Bellows", "Leather bellows, worked by a boy, blow air into the fire.");
  techLabel(F, -3.6, 0.6, 1.3, "The anvil", "An iron anvil on an oak stump: the hot iron is drawn out, bent, punched and welded with the hammer.");
  markUV("A smithy", u, v, "typical", "A blacksmith's shop on La Grande Rue. Several smiths worked in the town (some enslaved men were trained as smiths); a gunsmith was especially valued in a trading town. The shop is typical.", { y: 4, r: 8, range: 300 }); }
// the mill: its wheel turning, sacks carried in from a cart
{ const F = FR(...toXZ(MILL.u, MILL.v), -GR, groundH(...toXZ(MILL.u, MILL.v)) - 0.3, "tech"), gy = F.gy;
  const wheel = new THREE.Group(), wm = MAT.wood; for (let k = 0; k < 12; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.18), wm); b.rotation.x = k / 12 * Math.PI; wheel.add(b); const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.08), wm); const a = k / 12 * Math.PI * 2; p.position.set(0, Math.sin(a) * 2.5, Math.cos(a) * 2.5); p.rotation.x = -a; wheel.add(p); }
  for (const sx of [-0.45, 0.45]) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.07, 4, 24).rotateY(Math.PI / 2), wm); r.position.x = sx; wheel.add(r); }
  const [wx, , wz] = gw(F, -5.5, 0, 1.5); wheel.position.set(wx, gy + 2.8, wz); wheel.rotation.order = "YXZ"; wheel.rotation.y = -GR; scene.add(wheel); TECH_ANIM.push((t, dt) => wheel.rotation.x -= dt * 0.9);
  put("tk:cart", CART_G, MAT.wood, ...gw(F, 7, 0, 2), 1, 1, 1, -GR + Math.PI / 2); for (let k = 0; k < 4; k++) put("tk:sacks", PROP_SACK_G, MAT.cloth, ...gw(F, 6.6 + (k % 2) * 0.6, 1.0, 1.6 + Math.floor(k / 2) * 0.9), 1, 1, 1);
  techJob("enslaved", F, [[6.6, 3.0, 7, 2, "sell", 4], [4.9, -1.0, 4.4, -1.0, "stand", 3, null, "sack"], [6.6, 3.0, 7, 2, "sell", 4]]); techJob("creole", F, [[5.4, 0.6, 7, 2, "talk", 20], [4.9, -1.5, 4.4, -1.5, "stand", 8]], 9);
  techLabel(F, -5.5, 1.5, 6.0, "The water wheel", "Water from the pond runs down the timber race onto the wheel, turning it; the wheel's shaft drives the millstones inside through wooden gears."); techLabel(F, -6.4, -4, 3.5, "The race", "A timber trough leading water from the pond to the wheel; a sluice gate at its head starts and stops the mill.");
  techLabel(F, 0, 0, 4.5, "The millstones", "Inside, a pair of stones about a metre and a half across: the lower fixed, the upper turning on it. Grain fed from a hopper is ground between their furrowed faces into meal and flour."); }
// a bake oven in a yard: the dome of clay and stones, fired with wood, raked out, the loaves set in on a peel
{ const [ox, oz] = OVENS.sort((a, b) => Math.hypot(...a) - Math.hypot(...b))[0] || toXZ(-40, 230), [ou, ov] = toUV(ox, oz), F = frameUV(ou, ov);
  put("tk:table", BOX_G, MAT.wood, ...gw(F, 2.2, 0.75, 0.4), 1.4, 0.06, 0.7); for (let k = 0; k < 5; k++) put("tk:loaf", new THREE.SphereGeometry(0.13, 8, 5).scale(1.2, 0.55, 1), M(0xb07a3a), ...gw(F, 1.7 + k * 0.25, 0.8, 0.4), 1, 1, 1);
  for (let k = 0; k < 2; k++) put("tk:tlegs", BOX_G, MAT.wood, ...gw(F, 1.6 + k * 1.2, 0, 0.4), 0.08, 0.75, 0.6);
  techJob(Math.random() < 0.5 ? "enslavedw" : "woman", F, [[2.2, -0.2, 2.2, 0.4, "knead", 10], [1.4, 0, 0, 0, "kneel", 6], [2.2, -0.2, 2.2, 0.4, "knead", 8]]);
  techLabel(F, 0, 0, 1.5, "The bake oven", "A dome of clay and stones on a stone base, outdoors (for fear of fire). A wood fire is burned inside until the walls are hot, the ashes raked out, and the loaves slid in on a wooden peel; the stored heat bakes them. Creole bread was of wheat flour from the mill.");
  markUV("Baking day", ou, ov, "typical", "Bread was baked at home, in an outdoor oven in the yard, often by enslaved women. The oven and the work are typical.", { y: 3, r: 6, range: 200 }); }
// a house going up: poteaux sur solle, upright posts on a squared sill on stone footings; the bousillage being packed in
{ const L = LOTS.find(l => !l.house && l.v0 > -500 && l.v0 < 500 && l.u0 < -100) || LOTS.find(l => !l.house), u = (L.u0 + L.u1) / 2 + (L.face > 0 ? 6 : -6), v = (L.v0 + L.v1) / 2, F = frameUV(u, v), w = 6.5, d = 11;
  rRectUV(u - w / 2 - 1, u + w / 2 + 1, v - d / 2 - 1, v + d / 2 + 1, 2);
  GTINT = [0.6, 0.58, 0.54]; for (let k = 0; k <= 4; k++) for (const sx of [-1, 1]) gbox(F, "stone", sx * w / 2, 0.15, -d / 2 + d * k / 4, 0.45, 0.35, 0.45);   // the footings
  GTINT = [0.8, 0.68, 0.52]; for (const sx of [-1, 1]) gbox(F, "oak", sx * w / 2, 0.42, 0, 0.26, 0.24, d + 0.3); for (const sz of [-1, 1]) gbox(F, "oak", 0, 0.42, sz * d / 2, w + 0.3, 0.24, 0.26);   // the sill (solle)
  for (let k = 0; k <= 22; k++) { const sx = k < 12 ? -1 : 1, i = k % 12, z = -d / 2 + d * i / 11; if (sx > 0 && i > 6) continue; gbox(F, "oak", sx * w / 2, 0.54 + 1.4, z, 0.2, 2.8, 0.2, "b"); }   // the posts, a hand apart, standing on it
  GTINT = [0.72, 0.62, 0.5]; for (let k = 0; k < 11; k++) { const z = -d / 2 + d * (k + 0.5) / 11; for (const y of [0.8, 1.3, 1.8]) gbox(F, "oak", -w / 2, 0.54 + y, z, 0.05, 0.06, d / 11 * 0.9, ""); }   // laths across the gaps, to hold the fill
  GTINT = [0.62, 0.52, 0.4]; for (let k = 0; k < 6; k++) { const z = -d / 2 + d * (k + 0.5) / 11; gbox(F, "stone", -w / 2, 0.54 + 0.9, z, 0.18, 1.8, d / 11 * 0.95, ""); }   // bousillage packed in at the lower end of the wall
  GTINT = [0.85, 0.75, 0.6]; gbox(F, "oak", -w / 2, 3.38, 0, 0.24, 0.2, d + 0.2); for (let k = 0; k < 4; k++) put("tk:post", BOX_G, OAK_NEW, ...gw(F, 4.5, 0.1 + k * 0.22, -3 + k * 0.4), 0.2, 0.2, 3.2, -GR, 0, 0);
  put("tk:mud", CYL_G, M(0x7a6448), ...gw(F, -5.2, 0, 2), 2.2, 0.25, 2.2); put("tk:straw", CYL_G, MAT.thatch, ...gw(F, -6.0, 0, 4.2), 1.2, 0.6, 1.2);
  techJob("enslaved", F, [[-5.0, 1.0, -5.2, 2, "hoe", 8], [-4.0, -1.2, -w / 2, -1.2, "kneel", 8, null, "basket"], [-5.0, 1.0, -5.2, 2, "hoe", 6]]);
  techJob("creole", F, [[w / 2 + 0.8, 2.5, w / 2, 2.5, "hammer", 10], [4.5, 0, 4.5, -2, "sell", 4], [w / 2 + 0.8, 1.0, w / 2, 1.0, "hammer", 8, null, "plank"]], 5);
  techJob("enslavedw", F, [[-5.8, 3.4, -6.0, 4.2, "kneel", 7], [-5.2, 0.9, -5.2, 2, "knead", 9]], 11);
  techLabel(F, w / 2, -d / 2, 0.9, "The sill (solle)", "A squared oak timber laid on stone footings, so the posts stand clear of the damp: poteaux sur solle. Older houses had their posts set straight in the ground (poteaux en terre), and rotted in 20 or 30 years.");
  techLabel(F, w / 2, 2, 3.2, "The posts (poteaux)", "Upright logs of oak or cedar, hewn flat on two faces and set close, mortised into the sill below and a plate above: the French way of building in wood, from Normandy and Canada, quite unlike the Americans' horizontal log cabins.");
  techLabel(F, -w / 2, -3, 2.2, "Bousillage", "The fill between the posts: clay mixed with straw or Spanish moss, packed round short laths (the 'barreaux') laid across the gaps, then smoothed and limewashed. Here it is being mixed in a pit and carried up in baskets.");
  markUV("A house going up", u, v, "typical", "A new house on an empty lot, built the Creole way: posts on a sill, filled with bousillage, a steep hipped roof to come, with galleries. Building crews were often enslaved carpenters. Typical.", { y: 5, r: 10, range: 300 }); }
// the keelboat being loaded at the landing (until it leaves at 9:30)
const KEEL = { v0: 30, off: 7, g: null };
{ const [x, z] = KEEL_AT(KEEL.v0 + 24, KEEL.off), g = keelGroup(); g.position.set(x, WATER, z); g.rotation.y = -GR + Math.PI; scene.add(g); KEEL.g = g; KEEL.x = x; KEEL.z = z;
  const F = FR(x, z, -GR, 0, "tech"), [lx, lz] = toXZ(riverU(KEEL.v0 + 24) - RIVER_HW - 22, KEEL.v0 + 24), L = FR(lx, lz, -GR, groundH(lx, lz), "tech");
  for (let k = 0; k < 10; k++) put("tk:bales", BOX_G, M(k % 3 ? 0xc8b890 : 0x8a6a48), ...gw(L, -3 + (k % 5) * 0.8, 0, -2 + Math.floor(k / 5) * 1.0).map((v, i) => i === 1 ? v : v), 0.7, 0.5, 0.6);
  KEEL.loaders = []; for (let k = 0; k < 6; k++) KEEL.loaders.push([lx, lz, x, z]);
  techLabel(F, 0, 0, 3.2, "The cargo box", "Goods for the Missouri trade under a roofed box amidships: blankets, cloth, guns, powder and lead, kettles, knives, vermilion, beads, tobacco and brandy, to be traded with the Osage, Kansa, Oto, Omaha and others for furs.");
  techLabel(F, 0, -8.5, 2.4, "The mast", "A tall mast, for a square sail when the wind serves, and for the cordelle: a towline of several hundred feet, made fast high on the mast, by which the crew on the bank haul the boat upstream against the current.");
  techLabel(F, 1.5, 0, 1.5, "The running boards", "Planks along each side. Poling, the crew set their poles in the river bed at the bow and walk aft along these, pushing the boat forward under their feet, then run back and do it again."); }

// ---------- carried things ----------
const PROP_G = { yoke: mergeG([[new THREE.BoxGeometry(1.25, 0.05, 0.06), MT(0, 1.47, -0.02)], [new THREE.CylinderGeometry(0.14, 0.12, 0.32, 9), MT(0.6, 0.72, 0)], [new THREE.CylinderGeometry(0.14, 0.12, 0.32, 9), MT(-0.6, 0.72, 0)], [new THREE.CylinderGeometry(0.006, 0.006, 0.6, 3), MT(0.6, 1.17, 0)], [new THREE.CylinderGeometry(0.006, 0.006, 0.6, 3), MT(-0.6, 1.17, 0)]]),
  basket: mergeG([[new THREE.CylinderGeometry(0.22, 0.17, 0.28, 10, 1, true), MT(0.3, 0.98, 0.05)], [new THREE.CylinderGeometry(0.17, 0.17, 0.02, 10), MT(0.3, 0.85, 0.05)]]),
  headbasket: mergeG([[new THREE.CylinderGeometry(0.26, 0.2, 0.22, 10, 1, true), MT(0, 1.86, 0)], [new THREE.CylinderGeometry(0.2, 0.2, 0.02, 10), MT(0, 1.75, 0)]]),   // carried on the head
  sack: mergeG([[new THREE.SphereGeometry(0.26, 7, 5), MT(0.12, 1.55, -0.05, 1.5, 0.8, 0.9)]]), bale: mergeG([[new THREE.BoxGeometry(0.55, 0.4, 0.5), MT(0.16, 1.62, -0.04)]]), keg: mergeG([[new THREE.CylinderGeometry(0.17, 0.17, 0.45, 9).rotateZ(Math.PI / 2), MT(0.16, 1.62, -0.04)]]),
  bar: mergeG([[new THREE.BoxGeometry(0.025, 0.025, 0.7), MT(0.12, 1.0, 0.45)], [new THREE.BoxGeometry(0.025, 0.025, 0.7), MT(0.16, 1.0, 0.45)], [new THREE.BoxGeometry(0.05, 0.05, 0.3), MT(0.14, 1.0, 0.9)]]),
  hide: mergeG([[new THREE.BoxGeometry(0.62, 0.05, 0.95), MT(0.12, 1.47, -0.08, 1, 1, 1, 0.15, 0.4)]]), plank: mergeG([[new THREE.BoxGeometry(0.24, 0.05, 2.4), MT(0.2, 1.56, 0.1)]]),
  hoe: mergeG([[new THREE.CylinderGeometry(0.018, 0.018, 1.5, 5), MT(0, 0.85, 0.32, 1, 1, 1, 0.9, 0)], [new THREE.BoxGeometry(0.2, 0.14, 0.02), MT(0, 0.3, 0.92, 1, 1, 1, 0.4, 0)]]),
  fiddle: mergeG([[new THREE.BoxGeometry(0.2, 0.06, 0.36), MT(0.12, 1.38, 0.18, 1, 1, 1, 0.3, 0.4)], [new THREE.BoxGeometry(0.02, 0.02, 0.6), MT(-0.12, 1.3, 0.3, 1, 1, 1, 0, 0.8)]]),
  cross: mergeG([[new THREE.CylinderGeometry(0.02, 0.02, 2.4, 5), MT(0.2, 1.3, 0.25)], [new THREE.BoxGeometry(0.5, 0.05, 0.04), MT(0.2, 2.25, 0.25)], [new THREE.BoxGeometry(0.05, 0.6, 0.04), MT(0.2, 2.3, 0.25)]]),
  banner: mergeG([[new THREE.CylinderGeometry(0.02, 0.02, 2.6, 5), MT(0.2, 1.4, 0.25)], [new THREE.BoxGeometry(0.7, 0.9, 0.01), MT(0.2, 2.15, 0.25)]]) };
const NC = IS_HEADSET ? 420 : 680;
const PROP_COL = { yoke: 0x6a5238, basket: 0x8a7452, headbasket: 0x9a845a, sack: 0xd8ccb0, bale: 0x9a7a52, keg: 0x7a5a3a, bar: 0x8a4a2a, hide: 0x9a7a5a, plank: 0x9a7a52, hoe: 0x6a5238, fiddle: 0x7a4a2a, cross: 0xd8b84a, banner: 0xe8dcc0 };
const PROPS = {}; for (const k in PROP_G) { const im = new THREE.InstancedMesh(PROP_G[k], M(PROP_COL[k], { vertexColors: true }), NC); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; scene.add(im); PROPS[k] = { im, slot: new Int32Array(NC).fill(-1), who: new Int32Array(NC), n: 0 }; }
const _pm = new THREE.Matrix4();
function propSet(A, y) { const P = PROPS[A.prop]; if (!P) return; if (P.slot[A.i] < 0) { P.slot[A.i] = P.n; P.who[P.n] = A.i; P.n++; P.im.count = P.n; }
  O3.position.set(A.x, y, A.z); O3.rotation.set(0, A.h, 0); const s = A.L.s; O3.scale.set(s, s, s); O3.updateMatrix(); P.im.setMatrixAt(P.slot[A.i], O3.matrix); P.im.instanceMatrix.needsUpdate = true; }
function propHide(A) { const P = PROPS[A.prop]; if (!P) return; const s = P.slot[A.i]; if (s < 0) return; const last = --P.n, j = P.who[last];
  if (s !== last) { P.im.getMatrixAt(last, _pm); P.im.setMatrixAt(s, _pm); P.slot[j] = s; P.who[s] = j; } P.slot[A.i] = -1; P.im.count = P.n; P.im.instanceMatrix.needsUpdate = true; }


// ---------- the day's clock ----------
// Tuesday 20 May 1800: Easter fell on 13 April, so this is a Rogation day, one of the three before Ascension when French Catholic
// parishes walked in procession round their fields behind the cross, singing the litany and praying for the crops. The order of this
// day is reconstructed from the customs of the town; none of it is recorded for this date. SIM is seconds after midnight.
const hms = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
let SIM = hms(6, 20), timeRate = 1;
const T = { mass: hms(6, 0), proc: hms(6, 40), procEnd: hms(8, 10), load: hms(8, 0), keel: hms(9, 30), osage: hms(11, 0), osageLeave: hms(16, 30), noon: hms(12, 0), eve: hms(18, 0), dance: hms(18, 45), retreat: hms(21, 30) };
const MOMENTS = [["Early morning: Mass", hms(6, 20)], ["The Rogation procession", T.proc - 30], ["The day's work", hms(8, 30)], ["The keelboat leaves", T.keel - 120], ["Osage visitors at the Chouteaus'", T.osage + 300], ["Noon: the Angelus and dinner", T.noon - 60],
  ["Afternoon in the fields", hms(15, 0)], ["Evening on the galleries", T.eve], ["A dance", T.dance + 600], ["Night: the retreat", T.retreat - 60]];
const NARR = [
  [hms(6, 0), "Tuesday 20 May 1800, St. Louis, capital of Spanish Upper Louisiana, about 1,000 people. The church bell rings for early Mass: today is a Rogation day."],
  [T.proc, "After Mass the parish walks out in the Rogation procession: the cross and a banner, the priest in surplice and stole, children and the faithful behind, chanting the litany of the saints, out along the road to the common fields to bless the young wheat and corn."],
  [hms(8, 15), "The procession is back; the day's work begins. Fields to hoe, furs to press, a keelboat to load for the Missouri, bread to bake, a house going up. In the fields and the yards, much of the work is done by the town's enslaved people, about a quarter of its population."],
  [T.keel, "The keelboat pushes off from the landing for the Missouri, its crew of French Creole and métis voyageurs at the poles, then on the cordelle: weeks of hauling upstream to the trading posts. They sing as they go."],
  [hms(15, 0), "A bateau comes up the river from Ste. Genevieve, rowed hard against the current, with lead from the mines and salt from the springs: the porters will carry it up to the storehouses."],
  [T.osage, "A party of Osage arrives by the north road to see the Chouteaus, their traders and old friends. Pierre Chouteau speaks their language. They will be given presents and food, and talk at length."],
  [T.noon, "The noon Angelus. Shops close and the town goes home to dinner, the main meal, and many to a rest in the heat of the day."],
  [hms(14, 30), "Work begins again: the fields, the boats, the yards."],
  [T.eve, "Evening: work done, people sit on their galleries in the cool and visit; children play in the street. The town was known for its sociability: card games, billiards, and dancing."],
  [T.dance, "Fiddle music from a gallery on La Grande Rue: a dance (a bal), the young people dancing reels and cotillions, lanterns hung along the gallery. The French of St. Louis would dance on any excuse."],
  [hms(19, 15), "Sunset over the prairie. The evening Angelus rings; the dance goes on by lantern light."],
  [T.retreat, "The drum beats the retreat at the fort. The town goes to bed; a patrol walks the streets."]];
let narrI = -1;

// ---------- the people ----------
const crowd = new Crowd(NC), AG2 = [];
let nextI = 0;
function agent(role, o = {}) { const i = nextI++; if (i >= NC) return null; const L = looks(i, role); crowd.look(i, L); const A = { i, L, role: L.role, x: 0, z: 0, y: 0, h: 0, kind: "stand", walk: 0, shown: false, ...o }; AG2.push(A); return A; }
function routeAt(P, s) { let i = 1; for (; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s <= l) { const f = s / l; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), false]; } s -= l; }
  const n = P.length - 1; return [P[n][0], P[n][1], n ? Math.atan2(P[n][0] - P[n - 1][0], P[n][1] - P[n - 1][1]) : 0, true]; }
const routeLen = P => P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0);
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const UVP = pts => pts.map(([u, v]) => toXZ(u, v));
const working = () => (SIM > hms(7, 0) && SIM < hms(12, 0)) || (SIM > hms(14, 30) && SIM < hms(18, 30));
// the Rogation procession: cross, banner, the priest, children, the people, out to the Grand Champ and back
const CH_DOOR = toXZ(CHURCH.u, CHURCH.v - 13), PROC_PATH = [CH_DOOR, ...UVP([[-135, 0], [0, 0], [0, -300], [-200, -300], [-240, -300], [-480, -322], [-560, -360], [-560, -700], [-560, -1000], [-480, -1000], [-300, -820], [-200, -310], [0, -300], [0, 0], [-135, 0]]), CH_DOOR];
const PROC = []; { const order = ["child", "child", "priest", "child", "child", ...Array.from({ length: 36 }, (_, k) => k % 3 === 0 ? "woman" : k % 7 === 0 ? "enslavedw" : k % 5 === 0 ? "child" : k % 4 === 0 ? "lady" : "creole")];
  order.forEach((r, k) => { const A = agent(r, { proc: true, delay: k * 1.7, lane: (k % 2 ? 0.7 : -0.7) * (k > 4 ? 1 : 0), prop: k === 0 ? "cross" : k === 1 ? "banner" : null }); if (A) PROC.push(A); }); }
const PRIEST = PROC[2];
// the keelboat crew: loading, then poling off and hauling on the cordelle along the beach
const CREW = []; { for (let k = 0; k < 14; k++) { const A = agent(k === 0 ? "creole" : "voyageur", { crew: k, patron: k === 0 }); if (A) CREW.push(A); } }
const BANK = v => toXZ(riverU(v) - RIVER_HW - 3.5, v), KEEL_V = s => KEEL.v0 + 24 - s;   // the beach line; the boat's v as it moves north
function keelState() { const t = SIM - T.keel; if (t < 0) return { s: 0, phase: "loading" }; const s = t < 300 ? 0.5 * t * t / 300 * 0.6 : 90 + (t - 300) * 0.6; return { s, phase: t < 400 ? "poling" : "cordelle" }; }
// the Osage visitors: from the north road to the Chouteaus' gate and into the yard; at evening back to their camp north of the town
const OSAGE = []; { for (let k = 0; k < 13; k++) { const A = agent(k < 9 ? "osage" : "osagew", { osage: k }); if (A) OSAGE.push(A); } }
const OS_IN = UVP([[60, -2600], [40, -1800], [10, -1200], [0, -700], [0, 50], [-6, 50], [-14, 50], [-14, 30], [-50, 28], [-58, 40]]);
// soldiers: sentries at the fort's gate and the Government House, a patrol along La Grande Rue
const SOLD = []; for (const [u, v, fu, fv] of [[FORT.u + 25, FORT.v - 1.5, FORT.u + 40, FORT.v], [FORT.u + 25, FORT.v + 1.5, FORT.u + 40, FORT.v], [21, 140, 0, 140], [24.5, 132, 0, 132]]) { const [x, z] = toXZ(u, v), [fx, fz] = toXZ(fu, fv); SOLD.push(agent("soldier", { fixed: [x, z, face(x, z, fx, fz)], kind: "guard" })); }
const PATROL = [agent("soldier", { patrol: 0 }), agent("soldier", { patrol: 1 })], PATROL_PATH = UVP([[FORT.u + 26, FORT.v], [-180, 100], [0, 100], [0, -700], [0, 700], [0, 100], [-180, 100], [FORT.u + 26, FORT.v]]);
// people with names (where they are today is not recorded: they stand for the town's leading men)
const AUGUSTE = agent("merchant", { loop: UVP([[10, 60], [-4, 50], [-14, 50], [-14, 67], [-50, 69], [-56, 72]]), speed: 0.8, phase: 0 });
const DELASSUS = agent("merchant", { loop: UVP([[20, 140], [12, 112], [20, 70], [12, 112]]), speed: 0.7, phase: 30 });
if (AUGUSTE) AUGUSTE.L.coat = 0x1e2a44; if (DELASSUS) { DELASSUS.L.coat = 0xe8e4d8; DELASSUS.L.vest = 0x2a4a8a; DELASSUS.L.head = "tricorne"; crowd.look(DELASSUS.i, DELASSUS.L); }
// sellers on the Place d'Armes in the morning: a farmer with greens, a fisherman, an Osage woman with moccasins, a baker's girl
const SELL = []; for (const [u, v, r, p] of [[22, 30, "creole", "basket"], [26, 40, "creole", "sack"], [30, 22, "osagew", null], [20, 52, "enslavedw", "headbasket"], [36, 60, "woman", "basket"]]) { const [x, z] = toXZ(u, v); SELL.push(agent(r, { fixed: [x, z, face(x, z, ...toXZ(0, v))], kind: "sell", prop: p, seller: true })); }
// the landing: porters carrying goods up to the storehouses and the Chouteaus' gate, merchants checking cargo, Native traders by their canoes
const PORTERS = []; { const R = seeded(66); for (let k = 0; k < 18; k++) { const v = 10 + R() * 90, beach = toXZ(riverU(v) - RIVER_HW - 9 - R() * 6, v), mid = toXZ(riverU(50) - RIVER_HW - 45, 48 + (R() - 0.5) * 30), top = toXZ(44, 50 + (R() - 0.5) * 20), dest = k % 4 === 3 ? toXZ(-3, 50) : STOREHOUSES[k % 3];
    const A = agent(k % 3 ? "enslaved" : "voyageur", { porter: [beach, mid, top, dest], phase: R() * 300, carry: ["bale", "keg", "sack", "bale"][k % 4] }); if (A) PORTERS.push(A); }
  for (const [du, v, r, kind] of [[-14, 30, "merchant", "talk"], [-20, 70, "merchant", "sell"], [-10, 90, "osage", "sell"], [-8, 94, "osagew", "sitground"], [-9, 86, "osage", "sitground"], [-24, 50, "creole", "talk"]]) { const [x, z] = toXZ(riverU(v) - RIVER_HW + du, v); agent(r, { trader: true, fixed: [x, z, face(x, z, ...toXZ(riverU(v) - RIVER_HW - 30, v))], kind }); } }
// a bateau rowed up from Ste. Genevieve in the afternoon, with lead and salt
const ARRIVE = { g: (() => { const g = new THREE.Group(), h = new THREE.Mesh(BOAT_G, hullM); h.scale.set(3.0, 0.9, 12); g.add(h); const b = new THREE.Mesh(BOX_G, tarpM); b.scale.set(2.2, 0.8, 5); b.position.y = 0.6; g.add(b); scene.add(g); return g; })(), men: [] };
for (let k = 0; k < 7; k++) ARRIVE.men.push(agent(k ? "voyageur" : "creole", { arrive: k }));
const arriveState = () => { const t = SIM - hms(15, 0); if (t < -600) return null; const f = clampN(t / 2100, 0, 1), v = lerpN(1500, 150, f * (2 - f)), [x, z] = toXZ(riverU(v) - RIVER_HW + 12 + 10 * (1 - f), v); return { x, z, h: -GR + Math.PI, moving: f < 1 }; };
// in the fields: hoeing the corn, cutting weeds out of the wheat
const FIELDW = []; { const R = seeded(55); for (let k = 0; k < 44; k++) { const F = FIELDS[k % 2], u = F.u0 + 60 + R() * (F.u1 - F.u0 - 120), v = F.v0 + 10 + R() * (F.v1 - F.v0 - 20), [x, z] = toXZ(u, v); const A = agent(R() < 0.55 ? (R() < 0.5 ? "enslaved" : "enslavedw") : R() < 0.6 ? "creole" : "child", { field: true, fixed: [x, z, R() * 6.28], kind: "hoe", prop: "hoe" }); if (A) FIELDW.push(A); } }
// the dance in the evening, on a gallery and in the street before it
const DANCE = { H: HOUSES.filter(H => H.kind === "house" && H.gal === "all" && H.face < 0 && H.v > 200 && H.v < 400)[0] || HOUSES[5], A: [] };
{ const H = DANCE.H, [fx, fz] = toXZ(H.u - H.w / 2 - 3.2, H.v); DANCE.c = toXZ(H.u - H.w / 2 - 9, H.v); DANCE.fid = agent("creole", { fixed: [fx, fz, face(fx, fz, ...DANCE.c)], kind: "fiddle", prop: "fiddle", danceFid: true });
  for (let k = 0; k < 12; k++) { const A = agent(k % 2 ? "woman" : "creole", { dancer: k }); if (A) DANCE.A.push(A); } for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, r = 6 + (k % 2), x = DANCE.c[0] + Math.cos(a) * r, z = DANCE.c[1] + Math.sin(a) * r; agent(k % 3 ? "woman" : "creole", { fixed: [x, z, face(x, z, ...DANCE.c)], kind: k % 2 ? "talk" : "stand", watcher: true }); } }
// the ferry to the Illinois shore: a flat scow, two oarsmen
const FERRY = { a: toXZ(riverU(160) - RIVER_HW + 4, 160), b: toXZ(riverU(400) + RIVER_HW - 6, 400), g: (() => { const g = new THREE.Group(), deck = new THREE.Mesh(BOX_G, MAT.plank); deck.scale.set(3.6, 0.5, 9); g.add(deck); const rail = new THREE.Mesh(BOX_G, MAT.wood); rail.scale.set(3.6, 0.9, 0.1); rail.position.set(0, 0.4, 4.4); g.add(rail.clone()); rail.position.z = -4.4; g.add(rail); scene.add(g); return g; })() };
FERRY.pos = [FERRY.a[0], FERRY.a[1], 0];
FERRY.men = [agent("creole", { ferry: 0 }), agent("enslaved", { ferry: 1 }), agent("creole", { ferry: 2 }), agent("woman", { ferry: 3 })];
markUV("The ferry", riverU(160) - RIVER_HW - 6, 160, "inferred", "A ferry across to the Illinois shore (American territory since 1783), a flat scow rowed or poled over, is recorded from about 1797. Its exact landing here is not.", { y: 3, r: 12, range: 400 });
// a pirogue paddled along the shore
const PIROGUE = { pos: [0, 0, 0], g: (() => { const m = new THREE.Mesh(BOAT_G, hullM); m.scale.set(0.95, 0.55, 9); scene.add(m); return m; })(), men: [agent("voyageur", { pir: 0 }), agent("osage", { pir: 1 })] };
// craftsmen at their tasks (the tech sites)
for (const J of TECH_JOBS) agent(J.role, { job: J.steps, jobPh: J.ph, x: J.steps[0].p[0], z: J.steps[0].p[1] });
// everyone else: about the streets and yards near you
const AMB = []; { const N = NC - nextI - 4; for (let k = 0; k < N; k++) { const A = agent(null, { amb: true }); if (A) AMB.push(A); } }
mark("Auguste Chouteau", 0, 0, "person", "Auguste Chouteau, 50, co-founder of the town with Laclède and its richest merchant: fur trader, landowner, mill owner, militia officer and slaveholder. (Where he was on this day is not recorded: he stands here for the merchants of the town.)", { follow: AUGUSTE, r: 5, range: 80 });
mark("Lieutenant Governor Delassus", 0, 0, "person", "Charles Dehault Delassus, born in Flanders, a colonel in Spanish service and lieutenant governor of Upper Louisiana since 1799; it will be he who hands the province over in 1804. (His movements today are not recorded.)", { follow: DELASSUS, r: 5, range: 80 });
if (PRIEST) mark("The curé", 0, 0, "person", "The parish priest, in cassock and, for the procession, a white surplice and stole. The parish of St. Louis had a priest most years from 1770, usually a French or Flemish missionary; who served in May 1800 is uncertain.", { follow: PRIEST, r: 5, range: 100 });
const DRESS = {
  creole: "A French Creole man of the town: a linen or cotton shirt, breeches or the long trousers that were coming in, often a waistcoat; on his head a madras or blue kerchief tied at the back (a Creole fashion), or a hat; moccasins or shoes. Many men spent part of the year on the rivers.",
  woman: "A Creole woman: a skirt and a short jacket (casaquin), an apron, a kerchief crossed over the shoulders, and a white cap or a madras headwrap. Women ran the households, the gardens and often the family's trade; under French and Spanish law a wife kept her own property.",
  child: "A child of the town; many went barefoot in summer. There was no school worth the name: a few were taught by the priest or at home.",
  enslaved: "An enslaved man. About a quarter of the people of St. Louis were enslaved Africans or African Americans, owned by most of the town's families; they farmed, built, rowed and hauled, worked as smiths and carpenters, and some were hired out. Spanish law (the Code Noir and its successors) gave them a few rights on paper: to marry, to be baptised, sometimes to buy their freedom.",
  enslavedw: "An enslaved woman, in the tignon headwrap. Enslaved women cooked, washed, baked, gardened and nursed in the town's households and worked in the fields. Some free women of colour kept their own houses and businesses.",
  merchant: "A merchant: coat, waistcoat, breeches and stockings, a round hat or a tricorne, the hair tied in a queue. A handful of families (the Chouteaus, Gratiots, Cerrés, Sarpys, Labbadies) dominated the trade.",
  lady: "A merchant's wife: a gown and jacket of better cloth, a fine kerchief, a cap. The great families intermarried; Madame Chouteau (Marie-Thérèse Bourgeois), the mother of Auguste and Pierre, was still living and a person of consequence.",
  voyageur: "A voyageur, a boatman of the fur trade: a red wool cap, a shirt, a bright woven sash, a breechcloth and leggings in the Indian way, moccasins. Engaged for a season at so many livres, they poled and hauled the boats and sang the old French songs as they went.",
  soldier: "A soldier of the Louisiana Regiment (Regimiento Fijo de Luisiana): a white coat faced with blue, white waistcoat and breeches, a tricorne, a musket. The garrison here was small; the town's defence rested on its militia.",
  osage: "An Osage man. The Osage, the strongest nation of the region, lived on the Osage River to the south-west; men shaved the head but for a scalp lock and roach, wore a breechcloth and leggings, a trade blanket, silver ornaments. Their trade (and their friendship) was the Chouteaus' fortune.",
  osagew: "An Osage woman: a wrapped skirt and a blouse or tunic, a blanket, moccasins. Osage women dressed the hides that their men traded.",
  priest: "The priest, in a black cassock, for the procession a white surplice and stole, a tricorne." };

// ---------- daily life about the town: placed near you as you go ----------
function nearestOf(L, x, z, max = 160) { let best = null, bd = max; for (const W of L) { const d = Math.hypot(W[0] - x, W[1] - z); if (d < bd) { bd = d; best = W; } } return best; }
const ACTIVE = () => { const h = SIM / 3600; return h < 4.6 ? 0.06 : h < 6 ? 0.3 : h < 12 ? 1 : h < 14.5 ? 0.45 : h < 19.5 ? 1 : h < 21.5 ? 0.6 : 0.12; };   // how busy the streets are, by the hour
function placeAmbient(A, px, pz) { const R = Math.random; propHide(A); A.prop = null; A.yOff = 0;
  if (R() > ACTIVE()) { A.mode = "off"; return false; }
  const role = A.L.role, H = HOUSES[(R() * HOUSES.length) | 0];
  if (!H.dp || Math.hypot(H.dp[0] - px, H.dp[1] - pz) > 320) { A.mode = "off"; return false; }
  const r = R(), door = [H.dp[0], H.dp[1]], eve = SIM > T.eve || SIM < hms(7, 0);
  if (role === "child" && r < 0.55) { const S = STREETS[(R() * 3) | 0], [x, z] = S.L.at(R() * S.L.L); if (Math.hypot(x - px, z - pz) > 300) { A.mode = "off"; return false; } A.mode = "play"; A.c = [x, z]; A.ph = R() * 6; A.x = x; A.z = z; return true; }
  if (H.gal !== "none" && r < (eve ? 0.55 : 0.18)) { const c = Math.cos(-GR), s = Math.sin(-GR), off = H.face * (H.w / 2 + 1.0), along = (R() - 0.5) * H.d * 0.8;   // sitting out on the gallery
    A.mode = "fixed"; A.x = H.x + c * off + s * along; A.z = H.z - s * off + c * along; A.h = H.dp[2]; A.kind = R() < 0.6 ? "sit" : "talk"; A.yOff = H.gy + H.fl + (A.kind === "sit" ? -0.45 + 0.46 : 0); A.gallery = true; if (A.kind === "sit") A.yOff = H.gy + H.fl - 0.0; return true; }
  if (r < 0.45 && !eve) { const W = nearestOf(WELLS, door[0], door[1]); if (W) { A.mode = "loop"; A.path = [door, [W[0] + 1, W[1] + 1]]; A.prop = "yoke"; A.pause = "sell"; A.x = door[0]; A.z = door[1]; A.v = 0.9 + R() * 0.3; A.u = R() * 60; return true; } }   // fetching water from the yard's well
  if (r < 0.62) { const S = STREETS[(R() * STREETS.length) | 0], [sx, sz] = S.L.at(R() * S.L.L); if (Math.hypot(sx - door[0], sz - door[1]) < 200) { A.mode = "loop"; A.path = [[sx, sz], door]; A.prop = role === "enslavedw" ? "headbasket" : role === "woman" || role === "lady" ? "basket" : R() < 0.5 ? "sack" : null; A.pause = "stand"; A.x = sx; A.z = sz; A.v = 0.9 + R() * 0.4; A.u = R() * 60; return true; } }
  if (r < 0.75) { A.mode = "talk"; A.x = door[0] + (R() - 0.5) * 3; A.z = door[1] + (R() - 0.5) * 3; A.h = R() * 6.28; A.kind = "talk"; return true; }   // talking at a gate
  const S = STREETS[(R() * STREETS.length) | 0], s = R() * S.L.L, [x, z] = S.L.at(s); if (Math.hypot(x - px, z - pz) > 330) { A.mode = "off"; return false; }
  A.mode = "walk"; A.S = S; A.s = s; A.dir = R() < 0.5 ? 1 : -1; A.lane = (R() - 0.5) * S.w * 0.7; A.v = 1.0 + R() * 0.4; A.kind = "walk"; return true; }
function taskStep(A, dt, rate) { if (A.mode === "play") { A.ph += dt * rate * 1.6; A.x = A.c[0] + Math.cos(A.ph) * 3 + Math.cos(A.ph * 2.3) * 1.2; A.z = A.c[1] + Math.sin(A.ph) * 3; A.h = A.ph + Math.PI; A.kind = "walk"; A.walk = 2; return; }
  if (A.mode === "fixed" || A.mode === "talk") return;
  const P = A.path, L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), cyc = 2 * L / A.v + 30; A.u = (A.u + dt * rate) % cyc; const u = A.u;
  if (u < L / A.v) { const f = u * A.v / L; A.x = P[0][0] + (P[1][0] - P[0][0]) * f; A.z = P[0][1] + (P[1][1] - P[0][1]) * f; A.h = Math.atan2(P[1][0] - P[0][0], P[1][1] - P[0][1]); A.kind = A.prop && A.prop !== "yoke" && A.prop !== "headbasket" ? "carry" : "walk"; A.walk = 1; }
  else if (u < L / A.v + 15) { A.x = P[1][0]; A.z = P[1][1]; A.kind = A.pause; A.walk = 0; }
  else if (u < 2 * L / A.v + 15) { const f = 1 - (u - L / A.v - 15) * A.v / L; A.x = P[0][0] + (P[1][0] - P[0][0]) * f; A.z = P[0][1] + (P[1][1] - P[0][1]) * f; A.h = Math.atan2(P[0][0] - P[1][0], P[0][1] - P[1][1]); A.kind = "walk"; A.walk = 1; }
  else { A.x = P[0][0]; A.z = P[0][1]; A.kind = "stand"; A.walk = 0; } }
for (const A of AMB) A.mode = "off";

// ---------- moving everyone, by the clock ----------
function jobProp(A, key) { key = key || null; if (A.prop === key) return; if (A.prop) propHide(A); A.prop = key; }
function jobPose(A, S) { const J = A.job; if (!J.T) { J.T = 0; J.forEach((st, i) => { const pv = J[(i + J.length - 1) % J.length]; st.w = Math.hypot(st.p[0] - pv.p[0], st.p[1] - pv.p[1]) / 0.9; J.T += st.w + st.d; }); }
  let u = (S + (A.jobPh || 0)) % J.T;
  for (let i = 0; i < J.length; i++) { const st = J[i], pv = J[(i + J.length - 1) % J.length];
    if (u < st.w) { const f = u / st.w, carry = st.wc !== undefined ? st.wc : pv.c; jobProp(A, carry); return [pv.p[0] + (st.p[0] - pv.p[0]) * f, pv.p[1] + (st.p[1] - pv.p[1]) * f, Math.atan2(st.p[0] - pv.p[0], st.p[1] - pv.p[1]), carry ? (carry === "sack" || carry === "bale" || carry === "keg" ? "shoulder" : "carry") : "walk", true, 0.9]; }
    u -= st.w; if (u < st.d) { jobProp(A, st.c); return [st.p[0], st.p[1], face(st.p[0], st.p[1], st.f[0], st.f[1]), st.k]; } u -= st.d; }
  return [J[0].p[0], J[0].p[1], 0, "stand"]; }
const PROC_L = routeLen(PROC_PATH);
function agentState(A) { const S = SIM; if (A.job) return working() ? jobPose(A, S) : null;
  if (A.proc) { const start = T.proc + A.delay, s = (S - start) * 0.85; if (S < T.mass - 600 || S > T.procEnd + 900) return null;   // at Mass beforehand; home after
    if (S < start) { const k = PROC.indexOf(A), [du, dv] = [CHURCH.u + ((k % 7) - 3) * 1.2, CHURCH.v - 16 - Math.floor(k / 7) * 1.2], [x, z] = toXZ(du, dv); return [x, z, face(x, z, ...CH_DOOR), S < T.proc - 300 ? "pray" : "stand"]; }   // gathered at the church door
    if (s > PROC_L) { const out = [CH_DOOR, toXZ(CHURCH.u + (A.i % 7 - 3) * 12, -2), toXZ(-135 + (A.i % 9) * 18, (A.i % 5 - 2) * 60)], [x, z, h, done] = routeAt(out, s - PROC_L); return done ? null : [x, z, h, "walk", true]; }
    const [x, z, h] = routeAt(PROC_PATH, s); return [x + Math.cos(h) * A.lane, z - Math.sin(h) * A.lane, h, A.prop ? "carry" : "walk", true, 0.85]; }
  if (A.crew !== undefined) { const K = keelState(), k = A.crew, bx = KEEL.x, bz = KEEL.z;
    if (K.phase === "loading") { if (S < T.load - 1800) return null; if (A.patron) return [bx + 2, bz + 5, face(bx, bz, bx - 20, bz), "talk"];
      const [lx, lz] = KEEL.loaders[0], P = [[lx + (k % 3) * 1.2, lz + (k % 4) * 0.8], [bx - 1 + (k % 2), bz + (k % 5) - 2]], L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), u = ((S + k * 23) * 0.9) % (2 * L + 12);
      if (u < L) { const f = u / L; A.prop = k % 3 ? "bale" : "keg"; return [P[0][0] + (P[1][0] - P[0][0]) * f, P[0][1] + (P[1][1] - P[0][1]) * f, face(...P[0], ...P[1]), "shoulder", true]; } if (u < L + 6) { A.prop = null; return [P[1][0], P[1][1], 0, "kneel"]; }
      if (u < 2 * L + 6) { const f = (u - L - 6) / L; return [P[1][0] + (P[0][0] - P[1][0]) * f, P[1][1] + (P[0][1] - P[1][1]) * f, face(...P[1], ...P[0]), "walk", true]; } return [P[0][0], P[0][1], 0, "kneel"]; }
    A.prop = null; const bv = KEEL_V(K.s); if (bv < -2600) return null; const [kx, kz] = KEEL_AT(bv, KEEL.off);
    if (A.patron) return [kx + Math.sin(-GR) * 8.5, kz + Math.cos(-GR) * 8.5, -GR + Math.PI, "stand"];
    if (K.phase === "poling") { const side = k % 2 ? 1 : -1, q = ((S * 0.35 + k * 0.21) % 1), along = -5 + q * 10, [cx, cz] = [kx + Math.cos(-GR) * side * 1.5 + Math.sin(-GR) * along, kz - Math.sin(-GR) * side * 1.5 + Math.cos(-GR) * along]; return [cx, cz, -GR + Math.PI, "pole", false, 0, 0.75]; }
    const [cx, cz] = BANK(bv - 70 - k * 2.2); return [cx, cz, -GR + Math.PI, "pull", true, 0.6]; }
  if (A.osage !== undefined) { const k = A.osage, arr = T.osage + k * 2.5, s = (S - arr) * 1.0; if (S < arr) return null;
    const L = routeLen(OS_IN); if (S > T.osageLeave + k * 3) { const s2 = (S - T.osageLeave - k * 3) * 1.0, back = [OS_IN[OS_IN.length - 1], ...OS_IN.slice().reverse()]; const [x, z, h, done] = routeAt(back, s2); return done ? null : [x, z, h, "walk", true]; }
    if (s < L) { const [x, z, h] = routeAt(OS_IN, s); return [x + Math.cos(h) * ((k % 3) - 1) * 0.9, z - Math.sin(h) * ((k % 3) - 1) * 0.9, h, "walk", true]; }
    const [cx, cz] = toXZ(-58, 46), a = k / 13 * 6.283, r = 3.2 + (k % 2) * 1.2, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; return [x, z, face(x, z, cx, cz), k < 9 ? (k % 3 === 0 ? "talk" : "sitground") : "sitground"]; }
  if (A.patrol !== undefined) { if (SIM < T.retreat && SIM > hms(5, 0) && (SIM / 600 | 0) % 3 !== 0) return null; const L = routeLen(PATROL_PATH), s = (S * 1.1 + A.patrol * 3) % L, [x, z, h] = routeAt(PATROL_PATH, s); return [x + (A.patrol ? 0.8 : -0.8), z, h, "walk", true, 1.1]; }
  if (A.field) return working() ? [...A.fixed, "hoe"] : null;
  if (A.seller) return SIM > hms(7, 0) && SIM < hms(12, 0) ? [...A.fixed, "sell"] : null;
  if (A.danceFid) return SIM > T.dance && SIM < hms(22, 0) ? [...A.fixed, "fiddle"] : null;
  if (A.watcher) return SIM > T.dance && SIM < hms(22, 30) ? [...A.fixed, A.kind] : null;
  if (A.dancer !== undefined) { if (SIM < T.dance || SIM > hms(22, 30)) return null; const k = A.dancer, a = S * 0.6 * (k % 2 ? 1 : -1) + k / 12 * 6.283, r = 3 + (k % 2) * 0.8, x = DANCE.c[0] + Math.cos(a) * r, z = DANCE.c[1] + Math.sin(a) * r; return [x, z, a + (k % 2 ? 0 : Math.PI), "dance", true, 1.2]; }
  if (A.ferry !== undefined) { const [x, z, h] = FERRY.pos, k = A.ferry, c = Math.cos(h), s = Math.sin(h), lx = k < 2 ? (k ? 1.2 : -1.2) : (k === 2 ? 0.6 : -0.6), lz = k < 2 ? 0 : 2.5; return [x + c * lx + s * lz, z - s * lx + c * lz, k < 2 ? h + (k ? -Math.PI / 2 : Math.PI / 2) : h, k < 2 ? "row" : "stand", false, 0, 0.55]; }
  if (A.pir !== undefined) { const [x, z, h] = PIROGUE.pos, lz = A.pir ? -2.5 : 2.5; return [x + Math.sin(h) * lz, z + Math.cos(h) * lz, h, "paddle", false, 0, 0.25]; }
  if (A.porter) { if (!working()) { jobProp(A, null); return null; } const P = A.porter, L = A.pL || (A.pL = routeLen(P)), u = (S * 0.85 + A.phase * 5) % (2 * L + 24);
    if (u < 12) { jobProp(A, A.carry); return [P[0][0], P[0][1], 0, "kneel"]; } if (u < L + 12) { jobProp(A, A.carry); const [x, z, h] = routeAt(P, u - 12); return [x, z, h, "shoulder", true, 0.85]; }
    if (u < L + 24) { jobProp(A, null); return [P[P.length - 1][0], P[P.length - 1][1], 0, "kneel"]; } jobProp(A, null); const [x, z, h] = routeAt(P, 2 * L + 24 - u); return [x, z, h + Math.PI, "walk", true, 0.85]; }
  if (A.trader) return SIM > hms(7, 30) && SIM < hms(18, 0) ? [...A.fixed, A.kind] : null;
  if (A.arrive !== undefined) { const B = arriveState(); if (!B) return null; const k = A.arrive, c = Math.cos(B.h), s = Math.sin(B.h), lx = k ? (k % 2 ? 0.9 : -0.9) : 0, lz = k ? -3 + Math.floor((k - 1) / 2) * 2 : -5.2; return [B.x + c * lx + s * lz, B.z - s * lx + c * lz, k ? B.h + (k % 2 ? -Math.PI / 2 : Math.PI / 2) : B.h, B.moving && k ? "row" : "stand", false, 0, k && B.moving ? 0.5 : 0.7]; }
  if (A.cart !== undefined) return A.cartPos ? [A.cartPos[0], A.cartPos[1], A.cartPos[2], "walk", true, 0.9] : null;
  if (A.loop) { const P = A.loop, L = A.loopL || (A.loopL = routeLen(P)), u = (S * A.speed + A.phase * 7) % (2 * L + 16);
    if (u < L) { const [x, z, h] = routeAt(P, u); return [x, z, h, "walk", true]; } if (u < L + 8) { const [x, z, h] = routeAt(P, L); return [x, z, h, "talk"]; }
    if (u < 2 * L + 8) { const [x, z, h] = routeAt(P, 2 * L + 8 - u); return [x, z, h + Math.PI, "walk", true]; } const [x, z, h] = routeAt(P, 0); return [x, z, h + Math.PI, "talk"]; }
  if (A.fixed) return [...A.fixed, A.kind];
  return null; }
let frameN = 0;
function lifeStep(dt, t) { frameN++; const px = P_.x, pz = P_.z, rate = Math.min(timeRate, 8);
  for (const A of AG2) {
    if (A.amb) { if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if ((frameN + A.i) % 30 === 0) placeAmbient(A, px, pz); if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; } }
      if ((frameN + A.i) % 600 === 0 && Math.random() > ACTIVE()) { A.mode = "off"; continue; }
      if (A.mode === "loop" || A.mode === "fixed" || A.mode === "play") taskStep(A, dt, rate);
      if (A.mode === "walk") { A.s += A.dir * A.v * dt * rate; if (A.s < 0 || A.s > A.S.L.L) { A.dir *= -1; A.s = clampN(A.s, 0, A.S.L.L); }
        const [x, z, a] = A.S.L.at(A.s); A.x = x + Math.cos(a) * A.lane; A.z = z - Math.sin(a) * A.lane; A.h = A.dir > 0 ? a : a + Math.PI; }
      const d = Math.hypot(A.x - px, A.z - pz), step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
      if (d > 300) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; }
      const ay = A.yOff || groundH(A.x, A.z); crowd.set(A.i, A.x, ay, A.z, A.h, A.kind, t, A.mode === "walk" ? A.v * rate : A.walk ? Math.min(2, A.walk * rate) : 1); A.shown = true; if (A.prop) propSet(A, ay); continue; }
    const st = agentState(A); if (!st) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; }
    let [x, z, h, kind, moving, sp, yw] = st; A.x = x; A.z = z; A.h = h; A.kind = kind; const d = Math.hypot(x - px, z - pz);
    if (d > (A.crew !== undefined || A.proc || A.osage !== undefined ? 700 : 320)) { if (A.shown) { crowd.hide(A.i); if (A.prop) propHide(A); A.shown = false; } continue; }
    const step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
    const y = yw !== undefined ? WATER + yw : Math.max(groundH(x, z), WATER - 0.4);
    crowd.set(A.i, x, y, z, h, kind, t, moving ? Math.min(2, (sp || 0.9) / 1.2) * Math.min(rate, 3) : 1); A.shown = true; if (A.prop) propSet(A, y); else propHide(A); }
  crowd.done(); }
// the boats that move: the departing keelboat, the ferry, a pirogue
function boatsStep(t) { { const B = arriveState(); ARRIVE.g.visible = !!B; if (B) { ARRIVE.g.position.set(B.x, WATER - 0.25, B.z); ARRIVE.g.rotation.y = B.h; } } const K = keelState(), bv = KEEL_V(K.s), [kx, kz] = KEEL_AT(bv, KEEL.off); KEEL.g.position.set(kx, WATER + 0.02 * Math.sin(t * 1.3), kz); KEEL.g.visible = bv > -2600;
  const fc = 2400, f = ((SIM % fc) / fc), leg = f < 0.45 ? f / 0.45 : f < 0.5 ? 1 : f < 0.95 ? 1 - (f - 0.5) / 0.45 : 0, e = leg * leg * (3 - 2 * leg), [ax, az] = FERRY.a, [bx, bz] = FERRY.b, h = Math.atan2(bx - ax, bz - az);
  FERRY.pos = [ax + (bx - ax) * e, az + (bz - az) * e, h]; FERRY.g.position.set(FERRY.pos[0], WATER - 0.2, FERRY.pos[1]); FERRY.g.rotation.y = h;
  const pv = -400 + ((SIM * 1.2) % 1400), [px, pz] = KEEL_AT(pv, 40), [px2, pz2] = KEEL_AT(pv + 1, 40); PIROGUE.pos = [px, pz, Math.atan2(px2 - px, pz2 - pz)]; PIROGUE.g.position.set(px, WATER - 0.15, pz); PIROGUE.g.rotation.y = PIROGUE.pos[2]; }
// the rope from the keelboat's mast to the men on the bank
const CORD = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, 0)]), new THREE.LineBasicMaterial({ color: 0x8a7a5a })); CORD.frustumCulled = false; scene.add(CORD);
function cordStep() { const K = keelState(); CORD.visible = K.phase === "cordelle" && KEEL.g.visible; if (!CORD.visible) return; const bv = KEEL_V(K.s), [kx, kz] = KEEL_AT(bv - 4.8, KEEL.off), [cx, cz] = BANK(bv - 70); const p = CORD.geometry.attributes.position.array; p.set([kx, WATER + 7, kz, cx, groundH(cx, cz) + 1.2, cz]); CORD.geometry.attributes.position.needsUpdate = true; }

// ---------- animals and carts ----------
// Cattle on the commons, pigs loose in the streets (a constant complaint), horses, and the two-wheeled charrette with a horse or an ox.
const BEASTS = [], beastIM = {};
{ const R = seeded(301); for (let k = 0; k < 60; k++) { const u = -2500 + R() * 1800, v = 1300 + R() * 850; if (baseH(...toXZ(u, v)) < 2) continue; BEASTS.push({ sp: "cow", home: toXZ(u, v), ph: R() * 100, r: 3 + R() * 6, sl: 0.01 }); }   // cattle on the commons
  for (let k = 0; k < 26; k++) { const S = STREETS[(R() * 3) | 0], [x, z] = S.L.at(R() * S.L.L); BEASTS.push({ sp: "pig", home: [x + (R() - 0.5) * 6, z + (R() - 0.5) * 6], ph: R() * 100, r: 3 + R() * 4, sl: 0.05 }); }   // pigs rooting in the streets
  for (let k = 0; k < 14; k++) { const L = LOTS[(R() * LOTS.length) | 0], [x, z] = toXZ((L.u0 + L.u1) / 2, (L.v0 + L.v1) / 2); BEASTS.push({ sp: "horse", home: [x, z], ph: R() * 100, r: 1.5, sl: 0.01 }); }   // horses in the yards
  for (const [sp, geo, col] of [["cow", COW_G, 0x6a4a34], ["pig", PIG_G, 0x5a4a40], ["horse", HORSE_G, 0x5a3e2a]]) { const n = BEASTS.filter(b => b.sp === sp).length, im = new THREE.InstancedMesh(geo, M(col, { vertexColors: true }), Math.max(1, n)); im.frustumCulled = false; im.count = n; scene.add(im); beastIM[sp] = im; } }
function beastStep(t) { const cnt = { cow: 0, pig: 0, horse: 0 };
  for (const B of BEASTS) { const a = t * B.sl * (B.sp === "pig" ? 1 : 0.5) + B.ph, x = B.home[0] + Math.cos(a) * B.r, z = B.home[1] + Math.sin(a * 1.3) * B.r, im = beastIM[B.sp], i = cnt[B.sp]++;
    if (Math.hypot(x - P_.x, z - P_.z) > 450) { im.setMatrixAt(i, ZEROM); continue; } O3.position.set(x, groundH(x, z), z); O3.rotation.set(0, a + Math.PI / 2, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }
  for (const k in beastIM) beastIM[k].instanceMatrix.needsUpdate = true; }
// carts: along the streets and out to the mill and the fields
const CARTS = []; { const routes = [UVP([[0, -700], [0, 700]]), UVP([[-180, 820], [-400, 880], [-700, 930], [DAM_U + 30, creekV(DAM_U) - 30]]), UVP([[-90, -600], [-90, 600]]), UVP([[-232, -300], [-480, -320], [-900, -420], [-1400, -500]])];
  routes.forEach((P, k) => { const A = agent(k % 2 ? "enslaved" : "creole", { cart: k }); CARTS.push({ P, L: routeLen(P), ph: k * 400, sp: k % 2 ? "ox" : "horse", A }); });
  CARTS.IM = { cart: new THREE.InstancedMesh(CART_G, MAT.wood, CARTS.length), wheel: new THREE.InstancedMesh(WHEEL2_G, MAT.wood, CARTS.length * 2), horse: new THREE.InstancedMesh(HORSE_G, M(0x6a4a30, { vertexColors: true }), CARTS.length), ox: new THREE.InstancedMesh(COW_G, M(0x8a6a4a, { vertexColors: true }), CARTS.length) };
  for (const k in CARTS.IM) { CARTS.IM[k].frustumCulled = false; scene.add(CARTS.IM[k]); } }
function cartStep(t) { let ci = 0; for (const C of CARTS) { const L = C.L, u = (SIM * 0.9 + C.ph) % (2 * L), back = u > L, s = back ? 2 * L - u : u, [x, z, h0] = routeAt(C.P, s), h = back ? h0 + Math.PI : h0, c = Math.sin(h), d = Math.cos(h), y = groundH(x, z), on = working() && Math.hypot(x - P_.x, z - P_.z) < 500;
    const set = (im, i, X, Y, Z, H) => { if (!on) { im.setMatrixAt(i, ZEROM); return; } O3.position.set(X, Y, Z); O3.rotation.set(0, H, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); };
    set(CARTS.IM.cart, ci, x, y, z, h); set(CARTS.IM.wheel, ci * 2, x + d * 0.75, y + 0.55, z - c * 0.75, h); set(CARTS.IM.wheel, ci * 2 + 1, x - d * 0.75, y + 0.55, z + c * 0.75, h);
    const bx = x + c * 3.6, bz = z + d * 3.6; set(CARTS.IM.horse, ci, C.sp === "horse" ? bx : 1e6, groundH(bx, bz), bz, h); set(CARTS.IM.ox, ci, C.sp === "ox" ? bx : 1e6, groundH(bx, bz), bz, h);
    C.A.cartPos = on ? [bx + d * 1.0, bz - c * 1.0, h] : null; ci++; }
  for (const k in CARTS.IM) CARTS.IM[k].instanceMatrix.needsUpdate = true; }

// ---------- smoke from the kitchens ----------
class Smoke { constructor(n, size, col, op) { this.n = n; this.P = []; const pos = new Float32Array(n * 3).fill(-9999); this.geo = new THREE.BufferGeometry(); this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const st = tex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ size, map: st, color: col, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true })); this.pts.frustumCulled = false; scene.add(this.pts);
    for (let k = 0; k < n; k++) this.P.push({ age: 1e9, life: 1 }); this.k = 0; }
  emit(x, y, z, vy, life, spread = 0.4) { const p = this.P[this.k]; this.k = (this.k + 1) % this.n; Object.assign(p, { x: x + (Math.random() - 0.5) * spread, y, z: z + (Math.random() - 0.5) * spread, vy: vy * (0.8 + Math.random() * 0.4), age: 0, life }); }
  step(dt) { const a = this.geo.attributes.position.array; for (let k = 0; k < this.n; k++) { const p = this.P[k]; if (p.age > p.life) { a[3 * k + 1] = -9999; continue; } p.age += dt; p.y += p.vy * dt; p.x += 0.4 * dt * (0.3 + p.age / p.life); p.z += 0.1 * dt;
    a[3 * k] = p.x; a[3 * k + 1] = p.y; a[3 * k + 2] = p.z; } this.geo.attributes.position.needsUpdate = true; } }
const hearthSmoke = new Smoke(IS_HEADSET ? 260 : 500, 2.6, 0xb8b8b4, 0.2);
let smokeHouses = [], smokeT = 0;
function smokeStep(dt) { smokeT -= dt; const cooking = (SIM > hms(5, 30) && SIM < hms(8, 0)) || (SIM > hms(10, 30) && SIM < hms(13, 0)) || (SIM > hms(17, 30) && SIM < hms(20, 0));
  if (smokeT <= 0) { smokeT = 2; smokeHouses = HOUSES.filter(H => hash(H.u | 0, H.v | 0) < 0.55 && Math.abs(H.x - P_.x) < 240 && Math.abs(H.z - P_.z) < 240).slice(0, 100); }
  if (smokeHouses.length) for (let n = 0; n < Math.ceil(dt * (cooking ? 26 : 6)); n++) { const H = smokeHouses[(Math.random() * smokeHouses.length) | 0], cz = H.chim * (H.d / 2 - 1.2), c = Math.cos(H.ry), s = Math.sin(H.ry), G = galExt(H), top = H.gy + H.fl + H.wh + Math.min(H.W, H.D) / 2 * 0.95 + 1.1; hearthSmoke.emit(H.x + s * cz, top, H.z + c * cz, 0.5, 14, 0.6); }
  hearthSmoke.step(dt); }


// ---------- you ----------
const SPEEDS = [[1.4, "walking"], [4, "jogging"], [12, "fast"], [40, "very fast"]];
const keys = {}; let yaw = 0, pitch = -0.05, dragging = false, started = false, speedI = 0, flying = false, labelsOn = true;
const START = { at: toXZ(52, 46), look: toXZ(-60, 46) };   // on the Place d'Armes, above the landing, looking up the Rue de la Place into the town
const P_ = { x: START.at[0], z: START.at[1], y: 0 }; yaw = Math.atan2(-(START.look[0] - START.at[0]), -(START.look[1] - START.at[1]));
const intro = document.getElementById("intro");
let SITTING = localStorage.getItem("vrPosture") === "sitting";
{ const card = intro?.querySelector(".card"), row = document.createElement("p"); row.innerHTML = 'In VR, are you <button data-p="standing">🧍 standing</button> or <button data-p="sitting">🪑 sitting</button>?';
  const paint = () => row.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:0 4px;border-radius:8px;cursor:pointer;border:2px solid #5a3a1e;" + ((b.dataset.p === "sitting") === SITTING ? "background:#5a3a1e;color:#fff" : "background:#fff;color:#5a3a1e"); });
  row.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); SITTING = b.dataset.p === "sitting"; localStorage.setItem("vrPosture", b.dataset.p); paint(); }); paint(); card?.insertBefore(row, card.lastElementChild); }
const CSS = "background:rgba(30,24,18,.78);color:#f2e8d6;border-radius:10px;font:13.5px/1.5 -apple-system,Helvetica,sans-serif";
const HUD = document.createElement("div"); HUD.style.cssText = `position:fixed;left:14px;top:12px;z-index:2;padding:10px 14px;max-width:620px;${CSS}`;
const MSG = document.createElement("div"); MSG.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;padding:12px 18px;max-width:780px;display:none;${CSS};font-size:15px`;
const GUIDE = document.createElement("div"); GUIDE.style.cssText = `position:fixed;right:14px;top:12px;z-index:2;padding:10px 12px;max-height:calc(100vh - 290px);overflow-y:auto;width:250px;${CSS};font-size:13px`;
const MAPC = document.createElement("canvas"); MAPC.width = MAPC.height = 240; MAPC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:10px;border:2px solid rgba(200,160,80,.7);width:240px;height:240px";
document.body.append(HUD, MSG, GUIDE, MAPC);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 12) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone");
  say("Tuesday 20 May 1800, early morning, on the Place d'Armes of St. Louis, capital of Spanish Upper Louisiana: a French village of about a thousand people on its terrace above the Mississippi. Behind you the landing and the keelboats; ahead, across La Grande Rue, the Chouteaus' walled stone house; beyond it the church (its bell ringing for Mass); on the hill, the Spanish tower. Today is a Rogation day: after Mass the parish walks out to bless the fields. Walk anywhere. Markers name things and say how well we know them: press E near one to read it.", 26); }
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
function groundAt(x, z) { return Math.max(groundH(x, z), inPond(x, z) ? POND_Y - 1.4 : WATER - 1.4); }
function standSpot(x, z) { for (let r = 0; r < 80; r += 4) for (let a = 0; a < 6.28; a += r ? 0.5 : 7) { const X = x + Math.cos(a) * (r + 8), Z = z + Math.sin(a) * (r + 8), v = rGet(X, Z);
  if (groundH(X, Z) < 0.4 || v === 2 || v === 7) continue; const p = { x: X, z: Z }; pushOut(p); if (Math.hypot(p.x - X, p.z - Z) < 0.01) return [X, Z]; } return [x + 12, z + 12]; }
function teleport(x, z, lx, lz) { P_.x = x; P_.z = z; P_.y = groundAt(x, z); yaw = Math.atan2(-(lx - x), -(lz - z)); if (renderer.xr.isPresenting) vrTurn = yaw; flying = false; updateGround(x, z, 99); if (typeof lodStep === "function") lodStep(true); }
// places and things to do
const PLACES = [{ name: "The Place d'Armes (start)", at: START.at, look: START.look }];
for (const m of MARKS) if (m.tag !== "person" && m.tag !== "typical" && !m.hidden && m.range > 200) PLACES.push({ name: m.name, m });
function goPlace(p) { start(); if (p.at) { teleport(p.at[0], p.at[1], p.look[0], p.look[1]); say(`<b>${p.name}</b>`, 5); return; } const [x, z] = standSpot(p.m.x, p.m.z + Math.min(40, p.m.r + 8)); teleport(x, z, p.m.x, p.m.z); say(`<b>${p.m.name}</b> · <span style="color:${TAGC[p.m.tag]}">${TAGN[p.m.tag]}</span> · ${p.m.text}`, 24); }
const TODO = [["Watch the Rogation procession (6:40)", [0, -200], [0, -300], T.proc + 120], ["See the fur press", [-46, 82], [-56, 76]], ["Watch the keelboat leave (9:30)", [ -0, 20], [120, 30], T.keel - 90], ["Meet the Osage visitors (11:00-16:30)", [-30, 30], [-58, 46], T.osage + 400],
  ["A house going up", null, null], ["The smithy", null, null], ["Chouteau's mill", [MILL.u + 30, MILL.v + 20], [MILL.u, MILL.v]], ["Up to Fort San Carlos", [FORT.u + 40, FORT.v], [FORT.u, FORT.v]], ["Out to the common fields", [-600, -700], [-900, -800], hms(9, 0)],
  ["The Big Mound, north of the town", [BMU + 60, BMV + 90], [BMU, BMV]], ["The riverfront trade", [riverU(60) - RIVER_HW - 50, 20], [riverU(60) - RIVER_HW, 70], hms(9, 0)], ["Cahokia, across the river", [CAHOKIA.u - 40, CAHOKIA.v - 50], [CAHOKIA.u - 70, CAHOKIA.v + 10]], ["The bateau arrives (15:00)", [riverU(150) - RIVER_HW - 40, 170], [riverU(400) - RIVER_HW, 600], hms(15, 5)], ["The evening dance (19:30)", null, null, T.dance + 300]];
function goTodo(k) { start(); const [name, at, look, tm] = TODO[k]; if (tm !== undefined) { SIM = tm; narrI = -1; }
  let A = at && toXZ(...at), L = look && toXZ(...look);
  if (!A) { const m = MARKS.find(q => q.name === (name === "A house going up" ? "A house going up" : name === "The smithy" ? "A smithy" : "")); if (m) { A = standSpot(m.x, m.z + 12); L = [m.x, m.z]; } else if (name.startsWith("The evening")) { A = toXZ(DANCE.H.u - DANCE.H.w / 2 - 18, DANCE.H.v + 6); L = DANCE.c; } }
  if (A) teleport(A[0], A[1], L[0], L[1]); say(`<b>${name}</b>`, 5); momentI = -1; drawGuide(); }
function goMoment(k) { start(); SIM = MOMENTS[k][1]; narrI = -1; momentI = k; drawGuide(); }
let momentI = 0; function nextMoment() { goMoment((momentI + 1) % MOMENTS.length); }
const TAGC = { known: "#9ad87a", inferred: "#f0c060", typical: "#8ab8f0", absent: "#e08a8a", person: "#d8a8f0" }, TAGN = { known: "known", inferred: "inferred: place known, form guessed", typical: "typical: a stand-in", absent: "not there in 1800", person: "person" };
const hm = s => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}`;
function drawGuide() { GUIDE.innerHTML = `<b>20 May 1800</b> <span style="color:#c8b898">· click to go to the time</span>` + MOMENTS.map(([n, tm], i) => `<div data-m="${i}" style="cursor:pointer;padding:1px 4px">${hm(tm)} ${n}</div>`).join("") +
  `<b>Things to do</b> <span style="color:#c8b898">· click to go</span>` + TODO.map(([n], i) => `<div data-t="${i}" style="cursor:pointer;padding:1px 4px">✦ ${n}</div>`).join("") +
  `<div style="margin:6px 0 2px"><span data-r="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">time ×${timeRate} (T)</span> <span data-l="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">markers ${labelsOn ? "on" : "off"} (L)</span></div>` +
  `<b>Places</b> <span style="color:#c8b898">· click to go</span>` + PLACES.map((p, i) => `<div data-i="${i}" style="cursor:pointer;padding:1px 4px">${p.m ? `<span style="color:${TAGC[p.m.tag]}">●</span> ` : "◆ "}${p.name}</div>`).join("") +
  `<div style="color:#c8b898;font-size:11.5px;margin-top:6px"><span style="color:${TAGC.known}">●</span> known &nbsp;<span style="color:${TAGC.inferred}">●</span> inferred &nbsp;<span style="color:${TAGC.typical}">●</span> typical &nbsp;<span style="color:${TAGC.person}">●</span> people</div>`; }
GUIDE.addEventListener("click", e => { e.stopPropagation(); const d = e.target.closest("[data-i],[data-m],[data-r],[data-l],[data-t]"); if (!d) return; if (d.dataset.t) return goTodo(+d.dataset.t); if (d.dataset.i) goPlace(PLACES[+d.dataset.i]); else if (d.dataset.m) goMoment(+d.dataset.m); else if (d.dataset.r) cycleRate(); else { labelsOn = !labelsOn; drawGuide(); } });
drawGuide();
function interact() { if (!started) return start();
  let best = null, bd = 1e9; for (const m of MARKS) { const [x, z] = m.follow ? [m.follow.x, m.follow.z] : [m.x, m.z], d = Math.hypot(x - P_.x, z - P_.z); if (d < m.r && d / m.r < bd && (!m.follow || m.follow.shown)) { bd = d / m.r; best = m; } }
  let pa = null, pd = 3; for (const A of AG2) { if (!A.shown) continue; const d = Math.hypot(A.x - P_.x, A.z - P_.z); if (d < pd) { pd = d; pa = A; } }
  const named = pa && MARKS.find(m => m.follow === pa); if (named) best = named;
  if (best && (!pa || named || bd < 0.5)) return say(`<b>${best.name}</b> · <span style="color:${TAGC[best.tag]}">${TAGN[best.tag]}</span> · ${best.text}`, 26);
  if (pa) return say(DRESS[pa.L.role] || "A person of St. Louis.", 14);
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
const MX0 = RX0, MZ0 = RZ0, MW = RW * RC, MH = RH * RC, MPX = 8, MAPBASE = document.createElement("canvas"); MAPBASE.width = Math.ceil(MW / MPX); MAPBASE.height = Math.ceil(MH / MPX);
{ const g = MAPBASE.getContext("2d"), W = MAPBASE.width, Hh = MAPBASE.height, img = g.createImageData(W, Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const x = MX0 + i * MPX, z = MZ0 + j * MPX, k = 4 * (j * W + i), v = rGet(x, z), h = baseH(x, z); let r = 140, gr = 156, b = 100;
    if (h < WATER || inPond(x, z)) { r = 96; gr = 104; b = 100; } else if (v === 1) { r = 196; gr = 178; b = 140; } else if (v === 2) { r = 120; gr = 84; b = 54; } else if (v === 7) { r = 90; gr = 76; b = 60; } else if (v === 3 || v === 8) { r = 150; gr = 150; b = 100; } else if (v === 4) { r = 170; gr = 168; b = 120; } else if (v === 5) { r = 156; gr = 164; b = 96; } else if (v === 6) { r = 128; gr = 150; b = 96; }
    else { const [u] = toUV(x, z); if (u > riverU(toUV(x, z)[1])) { r = 96; gr = 128; b = 84; } }
    img.data[k] = r; img.data[k + 1] = gr; img.data[k + 2] = b; img.data[k + 3] = 255; }
  g.putImageData(img, 0, 0); for (const H of HOUSES) { const i = (H.x - MX0) / MPX, j = (H.z - MZ0) / MPX; g.fillStyle = H.wall === "stone" ? "#e8e0d0" : "#f4f0e6"; g.fillRect(i - 1.2, j - 1.2, 2.4, 2.4); } }
function drawMap(target, size, span) { const g = target.getContext("2d"), k0 = 1 / MPX, px = (P_.x - MX0) * k0, pz = (P_.z - MZ0) * k0, sp = span * k0;
  g.fillStyle = "#3a3228"; g.fillRect(0, 0, size, size); g.drawImage(MAPBASE, px - sp / 2, pz - sp / 2, sp, sp, 0, 0, size, size);
  const k = size / span, to = (x, z) => [size / 2 + (x - P_.x) * k, size / 2 + (z - P_.z) * k];
  g.font = `600 ${Math.round(size / 24)}px -apple-system, Helvetica, sans-serif`; g.textAlign = "center";
  for (const m of MARKS) { if (m.follow || m.tag === "typical" || m.hidden || (!m.big && m.range < span * 0.6)) continue; const [u, v] = to(m.x, m.z); if (u < -40 || v < -20 || u > size + 40 || v > size + 20) continue;
    g.fillStyle = TAGC[m.tag]; g.beginPath(); g.arc(u, v, size / 90, 0, 6.283); g.fill(); g.fillStyle = "#fff6dc"; g.fillText(m.name.replace(/\(.*\)/, ""), u, v - size / 50); }
  g.save(); g.translate(size / 2, size / 2); g.rotate(-yawNow()); g.fillStyle = "#ff5a3a"; g.beginPath(); g.moveTo(0, -size / 28); g.lineTo(size / 50, size / 50); g.lineTo(-size / 50, size / 50); g.closePath(); g.fill(); g.restore();
  g.fillStyle = "#f4ead8"; g.textAlign = "left"; g.fillText(`N ↑ · ${span >= 1000 ? span / 1000 + " km" : span + " m"} across · click to zoom`, 8, size - 8); }
const MAP_SPANS = [500, 1500, 4000]; let mapSpanI = 1;
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
const danceLight = new THREE.PointLight(0xffb060, 0, 30, 1.5); { const H = DANCE.H, [lx, lz] = toXZ(H.u - H.w / 2 - 1.2, H.v); danceLight.position.set(lx, H.gy + 2.4, lz); scene.add(danceLight); }   // lanterns along the gallery
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let hudT = 0, mapT = 0, lblT = 0, loopErrs = 0;
const dayUp = new THREE.Color(), dayHor = new THREE.Color(), _c3 = new THREE.Color();
for (const H of HOUSES) { gHouse(H); lodHouse(H); } gFlush(); buildKit(scene);
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
    const high = flying && P_.y > groundAt(P_.x, P_.z) + 6; if (!high) pushOut(P_);
    if (!flying && groundAt(P_.x, P_.z) < -0.8) { P_.x = ox; P_.z = oz; } }   // the river is too deep to wade
  const g = groundAt(P_.x, P_.z);
  if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + Math.max(3.2, sp * 1.2) * dt) : Math.max(g, P_.y - Math.max(7, sp) * dt);
  rig.position.set(P_.x, P_.y + (vr && SITTING ? 0.45 : 0), P_.z);
  updateGround(P_.x, P_.z);
  boatsStep(t); lifeStep(dt, t); beastStep(t); cordStep(); grassStep(); cartStep(t); smokeStep(dt); lodStep();
  for (const f of TECH_ANIM) f(t, dt);
  danceLight.intensity = SIM > T.dance && SIM < hms(22, 0) ? (1 - clampN(sunAt(SIM / 3600).el * 8, 0, 1)) * 40 * (0.9 + 0.1 * Math.sin(t * 9)) : 0;
  for (const f of FLAGS) { const p = f.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, Math.sin(x * 2.2 - t * 4) * 0.12 * x / 2.4); } p.needsUpdate = true; }
  // the sun, sky and light
  const hour = SIM / 3600, S = sunAt(hour), el = S.el, day = clampN(el * 7 + 0.35, 0, 1), dusk = clampN(1 - el * 9, 0, 1) * (el > -0.12 ? 1 : 0);
  sun.position.copy(rig.position).addScaledVector(S.dir, 800); sun.target.position.copy(rig.position);
  sun.intensity = 3.0 * clampN(el * 6, 0, 1); sun.color.setRGB(1, 0.9 - 0.25 * dusk, 0.78 - 0.4 * dusk); hemi.intensity = 0.3 + 1.3 * day; hemi.color.setRGB(0.55 + 0.45 * day, 0.62 + 0.38 * day, 0.85 + 0.15 * day);   // a little moon and starlight at night
  dayUp.setRGB(0.24, 0.44, 0.78).multiplyScalar(0.04 + 0.96 * day); dayHor.setRGB(0.72, 0.76, 0.8).multiplyScalar(0.05 + 0.95 * day); dayHor.lerp(_c3.setRGB(0.98, 0.6, 0.38), dusk * 0.55);
  skyMat.uniforms.up.value.copy(dayUp); skyMat.uniforms.hor.value.copy(dayHor); scene.fog.color.copy(dayHor); sky.position.copy(rig.position);
  sunDisc.position.copy(rig.position).addScaledVector(S.dir, 20000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.03;
  water.position.x = Math.round(P_.x / 500) * 500; water.position.z = Math.round(P_.z / 500) * 500;
  lblT -= dt; if (lblT <= 0) { lblT = 0.15; updateLabels(); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.25; if (MAPC.style.display !== "none" && !vr) drawMap(MAPC, 240, MAP_SPANS[mapSpanI]); if (vr) { drawMap(wristC, 512, MAP_SPANS[mapSpanI]); wristT.needsUpdate = true; } }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3;
    let nearM = null, nd = 1e9; for (const m of MARKS) { if (m.follow || m.hidden) continue; const d = Math.hypot(m.x - P_.x, m.z - P_.z); if (d < m.r && d < nd) { nd = d; nearM = m; } }
    const [u, v] = toUV(P_.x, P_.z), street = Math.abs(u) < 7 ? "on La Grande Rue" : Math.abs(u + 90) < 6 ? "on the Rue de l'Église" : Math.abs(u + 180) < 6 ? "on the Rue des Granges" : u > riverU(v) ? "on the Illinois shore (American territory)" : "";
    const where = nearM ? `at <b>${nearM.name}</b> · E to read` : street;
    HUD.innerHTML = `<b>St. Louis, Tuesday 20 May 1800</b> · ${hm(SIM)}${timeRate > 1 ? ` (time ×${timeRate})` : ""} · ${flying ? "flying" : SPEEDS[speedI][1] + (run > 1 ? ", running" : "")}<br>${where}<br><span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · shift run · − / = pace · E read · N next moment · T time speed · L markers · F fly · M map</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(`${hm(SIM)} · ${where.replace(/<[^>]+>/g, "")}`, msgText || "Left stick walk · right stick turn · trigger run · A read · B next place · X next moment · Y time speed"); vrDirty = false; } }
  renderer.render(scene, camera);
}
