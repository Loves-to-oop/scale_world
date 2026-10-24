// london1066.js -- London and Westminster on Christmas Day 1066, the day William the Conqueror was crowned in Edward the
// Confessor's new Romanesque abbey. Built into london1066.html by build.py. A walkable reconstruction at real size.
//
// What it rests on (see the notes by each part): the archaeology of Late Saxon London (MOLA's waterfront, Cheapside and Fleet valley
// excavations; Vince, Saxon London; Milne; Schofield), the Roman wall's known line and gates, the timber London Bridge (dendro-dated
// timbers at Fennings Wharf), Gem's reconstruction of Edward's abbey (cruciform, about 98 m long, crossing tower and two western towers,
// as in the Bayeux Tapestry), and the chroniclers' account of the coronation (William of Poitiers, Orderic Vitalis, the Carmen, the
// Anglo-Saxon Chronicle). What is not known (most individual buildings, street frontages, Saxon St Paul's, the palace) is filled with
// typical buildings of the time, and every marker says whether a thing is known, inferred, or typical.
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


// ---------- people of 1066 ----------
// Dress after the Bayeux Tapestry and the archaeology of Anglo-Saxon and Norman England: men in knee-length tunics, hose or leg
// wrappings, cloaks fastened with a brooch; Englishmen with long hair and moustaches, Normans with the back of the head shaved;
// women in ankle-length gowns with a headrail (veil) over the hair; Norman soldiers in mail hauberks, conical nasal helmets and
// kite shields, with spears; Benedictine monks in black habits; bishops in white albs, coloured chasubles and mitres.
const SKINS = [0xe8c4a8, 0xdcb494, 0xf0d0b8, 0xd8a888, 0xe4bc9c], DYE = [0x6a5a48, 0x8a7a5a, 0x4a5a3a, 0x7a3a2a, 0x3a4a6a, 0xa89a78, 0x5a4a3a, 0x9a6a3a, 0x6a6a5a, 0x3a3a3a];
function mergeG(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(m); if (q.attributes.uv) q.deleteAttribute("uv"); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const q of gs) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); return out; }
const MT = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, 0, rz)), V3(sx, sy, sz));
const HIPY = 0.92;
const PG = {
  leg: mergeG([[new THREE.SphereGeometry(0.068, 6, 4), MT(0, -0.02, 0)], [new THREE.CylinderGeometry(0.066, 0.046, 0.84, 8), MT(0, -0.42, 0)], [new THREE.BoxGeometry(0.09, 0.07, 0.22), MT(0, -0.85, 0.04)]]),
  arm: mergeG([[new THREE.SphereGeometry(0.056, 6, 4), MT(0, -0.01, 0)], [new THREE.CylinderGeometry(0.052, 0.036, 0.56, 8), MT(0, -0.28, 0)]]),
  hand: new THREE.SphereGeometry(0.042, 5, 3).scale(0.8, 1.2, 0.9).translate(0, -0.6, 0.01),
  torso: mergeG([[new THREE.LatheGeometry([[0.135, 0], [0.125, 0.12], [0.15, 0.27], [0.168, 0.38], [0.16, 0.45], [0.06, 0.505]].map(([r, y]) => new THREE.Vector2(r, y)), 12), MT(0, 0, 0, 1, 1, 0.7)], [new THREE.CylinderGeometry(0.045, 0.05, 0.09, 9), MT(0, 0.53, 0)]]),
  head: mergeG([[new THREE.SphereGeometry(0.1, 10, 7), MT(0, 0.67, 0, 0.88, 1.1, 1)], [new THREE.BoxGeometry(0.024, 0.045, 0.032), MT(0, 0.665, 0.098)], [new THREE.SphereGeometry(0.05, 6, 4), MT(0, 0.61, 0.035, 1.25, 0.8, 1.2)],
    [new THREE.SphereGeometry(0.014, 4, 3), MT(0.035, 0.69, 0.088)], [new THREE.SphereGeometry(0.014, 4, 3), MT(-0.035, 0.69, 0.088)]]),
  eyes: mergeG([[new THREE.SphereGeometry(0.011, 4, 3), MT(0.034, 0.693, 0.096)], [new THREE.SphereGeometry(0.011, 4, 3), MT(-0.034, 0.693, 0.096)]]),
  hairEng: mergeG([[new THREE.SphereGeometry(0.106, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), MT(0, 0.675, -0.01, 0.92, 1.1, 1.04)], [new THREE.BoxGeometry(0.17, 0.16, 0.04), MT(0, 0.6, -0.085)], [new THREE.BoxGeometry(0.07, 0.014, 0.02), MT(0, 0.641, 0.1, 1, 1, 1, 0, 0)]]),   // long hair and a moustache
  hairNor: new THREE.SphereGeometry(0.104, 10, 3, 0, Math.PI * 2, 0, Math.PI * 0.32).scale(0.92, 1.1, 1.02).translate(0, 0.682, 0.012).rotateX(-0.35),   // cropped, the back of the head shaved
  headrail: mergeG([[new THREE.SphereGeometry(0.115, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), MT(0, 0.675, -0.01, 0.95, 1.12, 1.06)], [new THREE.CylinderGeometry(0.1, 0.17, 0.3, 10, 1, true, Math.PI * 0.75, Math.PI * 1.5), MT(0, 0.5, -0.01, 1, 1, 0.85)]]),
  tunic: new THREE.CylinderGeometry(0.16, 0.24, 0.5, 14, 1, true).scale(1, 1, 0.8).translate(0, -0.2, 0),
  gown: new THREE.CylinderGeometry(0.16, 0.3, 0.88, 14, 1, true).scale(1, 1, 0.82).translate(0, -0.39, 0),
  cloak: new THREE.CylinderGeometry(0.19, 0.32, 0.95, 14, 1, true, Math.PI * 0.62, Math.PI * 1.76).scale(1, 1, 0.78).translate(0, 0.0, -0.01),
  brooch: new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10).rotateX(Math.PI / 2).translate(0.09, 0.44, 0.13),
  helm: mergeG([[new THREE.ConeGeometry(0.115, 0.2, 10), MT(0, 0.81, 0)], [new THREE.CylinderGeometry(0.112, 0.112, 0.06, 10, 1, true), MT(0, 0.72, 0)], [new THREE.BoxGeometry(0.022, 0.1, 0.02), MT(0, 0.67, 0.112)]]),
  mitre: mergeG([[new THREE.BoxGeometry(0.16, 0.24, 0.05), MT(0, 0.83, 0.03)], [new THREE.BoxGeometry(0.16, 0.24, 0.05), MT(0, 0.83, -0.03)], [new THREE.ConeGeometry(0.085, 0.08, 4), MT(0, 0.98, 0)]]),
  crown: mergeG(Array.from({ length: 6 }, (_, k) => [new THREE.BoxGeometry(0.035, 0.07, 0.012), new THREE.Matrix4().makeRotationY(k / 6 * Math.PI * 2).multiply(MT(0, 0.79, 0.098))]).concat([[new THREE.TorusGeometry(0.1, 0.012, 3, 12).rotateX(Math.PI / 2), MT(0, 0.76, 0)]])),
  hood: new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.1, 1.1).translate(0, 0.68, -0.025),
  shield: mergeG([[new THREE.CylinderGeometry(0.28, 0.02, 0.95, 3, 1, false, -Math.PI / 6, Math.PI * 2).scale(1, 1, 0.12), MT(0.27, 0.32, 0.12)]]),
  spear: mergeG([[new THREE.CylinderGeometry(0.013, 0.013, 2.4, 5), MT(0, 0.2, 0.05)], [new THREE.ConeGeometry(0.03, 0.2, 5), MT(0, 1.5, 0.05)]]) };
const PARTS = ["legL", "legR", "armL", "armR", "handL", "handR", "torso", "head", "eyes", "hairEng", "hairNor", "headrail", "tunic", "gown", "cloak", "brooch", "helm", "mitre", "crown", "hood", "shield", "spear"];
const PGEO = { legL: PG.leg, legR: PG.leg, armL: PG.arm, armR: PG.arm, handL: PG.hand, handR: PG.hand };
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide });
// roles: eng (an Englishman), woman, child, norman (a Norman knight or lord), soldier (a Norman soldier on guard), monk, cleric, bishop, noble (an English thegn), king
function looks(i, role) { const h = k => hash(i * 13 + k, 77), r = role || (h(1) < 0.47 ? "woman" : h(2) < 0.16 ? "child" : h(3) < 0.12 ? "norman" : "eng"), skin = SKINS[(h(4) * SKINS.length) | 0];
  const L = { role: r, s: r === "child" ? 0.62 + h(5) * 0.12 : 0.92 + h(5) * 0.12, skin, hair: [0x4a3020, 0x2a1a10, 0x8a6a3a, 0xa87a3a, 0x5a3a20][(h(6) * 5) | 0],
    tunic: DYE[(h(7) * DYE.length) | 0], hose: [0x5a4a3a, 0x6a5a48, 0x8a2a2a, 0x3a3a3a, 0xa89a7a][(h(8) * 5) | 0], cloak: DYE[(h(9) * DYE.length) | 0], hasCloak: h(10) < 0.55, extra: 0 };
  if (r === "soldier") Object.assign(L, { tunic: 0x7a7a80, hose: 0x5a4a3a, cloak: 0x7a2a2a, hasCloak: h(10) < 0.3 });
  if (r === "cleric") Object.assign(L, { tunic: 0xece6d6, cloak: 0xece6d6, hasCloak: false });
  if (r === "monk") Object.assign(L, { tunic: 0x1e1a18, cloak: 0x1e1a18, hasCloak: false });
  if (r === "bishop") Object.assign(L, { tunic: 0xf0ece0, cloak: [0xc8a83a, 0x8a2a5a, 0xa82a2a][(h(11) * 3) | 0], hasCloak: true });
  if (r === "noble" || r === "norman") Object.assign(L, { tunic: [0xa82a2a, 0x2a4a9a, 0x3a6a3a, 0x8a5a2a][(h(11) * 4) | 0], cloak: [0x6a2a5a, 0xb8382a, 0x2a3a6a, 0x5a3a20][(h(12) * 4) | 0], hasCloak: true });
  if (r === "king") Object.assign(L, { tunic: 0x7a1a3a, cloak: 0xa8202a, hose: 0x8a2a2a, hasCloak: true, s: 1.05 });
  return L; }
function colorOf(L, p) { const g = L.role === "woman"; return p.startsWith("leg") ? (g ? L.tunic : L.hose) : p.startsWith("arm") || p === "torso" ? L.tunic : p === "hand" || p.startsWith("hand") || p === "head" ? L.skin : p === "eyes" ? 0x2a2018 :
  p === "hairEng" || p === "hairNor" ? L.hair : p === "headrail" ? [0xe8e0d0, 0xc8b898, 0xd8d0c0, 0x8a7a5a][Math.floor(L.s * 100) % 4] : p === "tunic" || p === "gown" ? L.tunic : p === "cloak" ? L.cloak : p === "brooch" || p === "crown" ? 0xd8b84a :
  p === "helm" ? 0x8a8a90 : p === "mitre" ? 0xf0ece0 : p === "hood" ? L.tunic : p === "shield" ? [0xb8302a, 0x2a4a9a, 0xd8b83a, 0x3a6a3a][Math.floor(L.s * 37) % 4] : p === "spear" ? 0x6a4a2c : 0xffffff; }
function shows(L, p) { const r = L.role, robe = r === "woman" || r === "monk" || r === "cleric" || r === "bishop" || r === "king";
  switch (p) { case "hairEng": return r === "eng" || r === "child" || r === "noble" || r === "cleric"; case "hairNor": return r === "norman" || r === "king"; case "headrail": return r === "woman"; case "tunic": return !robe; case "gown": return robe;
    case "cloak": return L.hasCloak && r !== "monk"; case "brooch": return L.hasCloak && r !== "monk" && r !== "bishop"; case "helm": return r === "soldier"; case "mitre": return r === "bishop"; case "crown": return r === "king"; case "hood": return r === "monk";
    case "shield": case "spear": return r === "soldier"; default: return true; } }
function poseOf(kind, t, ph, walkAmt = 1) { const w = Math.sin(t * 7 + ph);
  switch (kind) {
    case "walk": return { drop: 0, lean: 0.04, lL: 0.42 * w * walkAmt, lR: -0.42 * w * walkAmt, aL: -0.32 * w * walkAmt, aR: 0.32 * w * walkAmt };
    case "guard": return { drop: 0, lean: 0, lL: 0.02, lR: -0.02, aL: -0.25, aR: -0.55 };
    case "kneel": return { drop: 0.42, lean: 0.12, lL: -1.5, lR: 0.2, aL: -0.4, aR: -0.4 };
    case "pray": return { drop: 0.42, lean: 0.05, lL: -1.5, lR: 0.2, aL: -1.2, aR: -1.2 };
    case "sit": return { drop: HIPY - 0.45, lean: -0.05, lL: -1.45, lR: -1.35, aL: -0.4, aR: -0.35 };
    case "cheer": return { drop: 0, lean: -0.05, lL: 0, lR: 0, aL: -2.6 - 0.3 * Math.sin(t * 5 + ph), aR: -2.6 - 0.3 * Math.cos(t * 5 + ph) };
    case "crown": return { drop: 0, lean: 0, lL: 0, lR: 0, aL: -2.4, aR: -2.4 };
    case "bless": return { drop: 0, lean: 0, lL: 0, lR: 0, aL: -0.3, aR: -1.8 - 0.2 * Math.sin(t * 1.5) };
    case "hammer": { const p2 = (t * 1.6 + ph) % 1; return { drop: 0, lean: 0.2, lL: 0.1, lR: -0.1, aL: -0.9, aR: p2 < 0.6 ? -1 - p2 * 2.8 : -2.7 + (p2 - 0.6) * 4.7 }; }
    case "carry": return { drop: 0, lean: 0.06, lL: 0.4 * w * walkAmt, lR: -0.4 * w * walkAmt, aL: -1.0, aR: -1.0 };
    case "talk": return { drop: 0, lean: 0, lL: 0.05, lR: -0.05, aL: 0.05, aR: -0.3 - 0.3 * Math.max(0, Math.sin(t * 1.3 + ph)) };
    case "sell": return { drop: 0, lean: 0.1, lL: 0, lR: 0, aL: -0.8, aR: -0.9 - 0.3 * Math.sin(t * 2 + ph) };
    default: return { drop: 0, lean: 0, lL: 0, lR: 0, aL: 0.03 * Math.sin(t * 0.8 + ph), aR: -0.03 * Math.sin(t * 0.8 + ph) }; } }
const _b = new THREE.Matrix4(), _hm = new THREE.Matrix4(), _j = new THREE.Matrix4(), _tmp = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), ZEROM = new THREE.Matrix4().makeScale(0, 0, 0), _p = V3(0, 0, 0), _s = V3(1, 1, 1);
function partMatrices(x, y, z, h, L, P, out) { _e2.set(0, h, 0); _q2.setFromEuler(_e2); _b.compose(_p.set(x, y, z), _q2, _s.set(L.s, L.s, L.s));
  _hm.copy(_b).multiply(_tmp.makeTranslation(0, HIPY - P.drop, 0)).multiply(_j.makeRotationX(P.lean));
  const legAt = (sx, a) => out.push(_b.clone().multiply(_tmp.makeTranslation(sx, HIPY - P.drop, 0)).multiply(_j.makeRotationX(a)));
  legAt(0.085, P.lL); legAt(-0.085, P.lR);
  const armM = (sx, a, sp) => _hm.clone().multiply(_tmp.makeTranslation(sx, 0.45, 0)).multiply(_j.makeRotationX(a)).multiply(_tmp.makeRotationZ(sp)), aL = armM(0.175, P.aL, -0.05), aR = armM(-0.175, P.aR, 0.05);
  out.push(aL, aR, aL, aR);
  for (const p of PARTS.slice(6)) { if (!shows(L, p)) { out.push(ZEROM); continue; } if (p === "spear") out.push(aR.clone().multiply(_tmp.makeTranslation(0, -0.6, 0)).multiply(_j.makeRotationX(Math.PI / 2 - P.aR * 0.9)));
    else if (p === "shield") out.push(aL.clone().multiply(_tmp.makeTranslation(0, -0.3, 0)).multiply(_j.makeRotationX(-P.aL))); else out.push(_hm.clone()); } }
function personMesh(i, role, kind, x, y, z, h, t = 0) { const L = looks(i, role), g = new THREE.Group(), ms = []; partMatrices(0, 0, 0, 0, L, poseOf(kind, t, i), ms);
  PARTS.forEach((p, k) => { if (ms[k] === ZEROM) return; const m = new THREE.Mesh(PGEO[p] || PG[p], M(colorOf(L, p), { roughness: p === "helm" || p === "crown" ? 0.35 : 0.85, metalness: p === "helm" || p === "crown" || p === "brooch" ? 0.7 : 0, side: THREE.DoubleSide })); m.matrixAutoUpdate = false; m.matrix.copy(ms[k]); g.add(m); });
  g.position.set(x, y, z); g.rotation.y = h; g.userData = { i, role, kind }; return g; }
// the crowd: instanced parts, one set for everyone; only the people shown are packed into the first slots and drawn
class Crowd { constructor(n) { this.n = n; this.L = []; this.M = {}; this.slot = new Int32Array(n).fill(-1); this.who = new Int32Array(n); this.count = 0;
    PARTS.forEach(p => { const im = new THREE.InstancedMesh(PGEO[p] || PG[p], p === "helm" || p === "crown" || p === "brooch" ? new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.7 }) : personMat, n);
      im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, new THREE.Color()); im.count = 0; this.M[p] = im; scene.add(im); }); this.ms = []; this._m = new THREE.Matrix4(); this._c = new THREE.Color(); }
  paint(i) { const s = this.slot[i]; if (s < 0) return; const L = this.L[i]; PARTS.forEach(p => this.M[p].setColorAt(s, this._c.setHex(colorOf(L, p)))); this.colorsDirty = true; }
  look(i, L) { this.L[i] = L; this.paint(i); }
  set(i, x, y, z, h, kind, t, walkAmt = 1) { if (this.slot[i] < 0) { const s = this.count++; this.slot[i] = s; this.who[s] = i; this.paint(i); }
    const s = this.slot[i]; this.ms.length = 0; partMatrices(x, y, z, h, this.L[i], poseOf(kind, t, i * 1.7, walkAmt), this.ms); PARTS.forEach((p, k) => this.M[p].setMatrixAt(s, this.ms[k])); }
  hide(i) { const s = this.slot[i]; if (s < 0) return; const last = --this.count, j = this.who[last];
    if (s !== last) { for (const p of PARTS) { const im = this.M[p]; im.getMatrixAt(last, this._m); im.setMatrixAt(s, this._m); im.getColorAt(last, this._c); im.setColorAt(s, this._c); } this.slot[j] = s; this.who[s] = j; this.colorsDirty = true; }
    this.slot[i] = -1; }
  done() { for (const m of Object.values(this.M)) { m.count = this.count; m.instanceMatrix.needsUpdate = true; if (this.colorsDirty && m.instanceColor) m.instanceColor.needsUpdate = true; } this.colorsDirty = false; } }


// ---------- the map: latitude and longitude to metres (x east, z south) from Westminster Abbey's crossing ----------
const LAT0 = 51.4994, LON0 = -0.1275, KX = 111320 * Math.cos(LAT0 * Math.PI / 180), KZ = 110574;
const LL = (lat, lon) => [(lon - LON0) * KX, -(lat - LAT0) * KZ];
function line(pts, metres) { const P = metres ? pts : pts.map(([a, b]) => LL(a, b)), S = [], cum = [0];
  for (let i = 1; i < P.length; i++) { S.push([P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]]); cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { P, S, cum, L: cum[cum.length - 1], box: [x0, x1, z0, z1],
    near(x, z, m) { return x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m; },
    d(x, z) { let best = 1e18; for (const [ax, az, bx, bz] of S) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0, ex = ax + t * dx - x, ez = az + t * dz - z, d2 = ex * ex + ez * ez; if (d2 < best) best = d2; } return Math.sqrt(best); },
    side(x, z) { let best = 1e18, sg = 1; for (const [ax, az, bx, bz] of S) { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1) : 0, ex = x - (ax + t * dx), ez = z - (az + t * dz), d2 = ex * ex + ez * ez; if (d2 < best) { best = d2; sg = Math.sign(dx * ez - dz * ex) || 1; } } return Math.sqrt(best) * sg; },
    at(s) { s = clampN(s, 0, this.L); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])]; } }; }
function poly(pts) { const P = pts.map(([a, b]) => LL(a, b)); return { P, inside(x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, zi] = P[i], [xj, zj] = P[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; } }; }

// ---------- the land and water in 1066 ----------
// SOURCES: the Late Saxon north bank ran roughly 0-30 m south of today's Thames Street (MOLA waterfront excavations at Queenhithe,
// Bull Wharf, New Fresh Wharf, Billingsgate), so the river was wider than now, more than ~300 m at the bridge and shallower; the south
// bank at Southwark was gravel islands (eyots) in tidal marsh; Thorney Island (Westminster) a gravel island of ~470 x 370 m between
// branches of the Tyburn; the Fleet a tidal inlet up to Holborn; the Walbrook a small boggy stream splitting the City's two hills,
// Ludgate Hill and Cornhill, gravel terraces about 15-18 m above the Thames. Channel outlines are approximate (low confidence).
// Level 0 is a typical high tide; the ground is given in metres above it.
const THAMES = line([[51.4880, -0.1245], [51.4935, -0.1222], [51.4995, -0.1214], [51.5040, -0.1200], [51.5070, -0.1178], [51.5085, -0.1135], [51.5094, -0.1080], [51.5097, -0.1028],
  [51.5091, -0.0960], [51.5087, -0.0910], [51.5080, -0.0870], [51.5076, -0.0820], [51.5073, -0.0770], [51.5062, -0.0710], [51.5038, -0.0640]]);   // the centre line; half-width below
const RIVER_HW = 175;
const FLEET = line([[51.5108, -0.1040], [51.5130, -0.1048], [51.5150, -0.1055], [51.5175, -0.1068], [51.5200, -0.1080]]), WALBROOK = line([[51.5103, -0.0905], [51.5125, -0.0902], [51.5150, -0.0893], [51.5178, -0.0888]]);
const TYB_N = line([[51.5040, -0.1350], [51.5030, -0.1290], [51.5020, -0.1228]]), TYB_S = line([[51.4975, -0.1345], [51.4968, -0.1300], [51.4955, -0.1238]]), TYB_W = line([[51.5040, -0.1350], [51.5005, -0.1352], [51.4975, -0.1345]]);
const THORNEY = { c: LL(51.4995, -0.1268), rx: 235, rz: 185 };
const HILLS = [[...LL(51.5138, -0.0985), 9, 380], [...LL(51.5135, -0.0860), 9, 380], [...LL(51.5150, -0.0930), 4, 500]];
// the Roman wall (late 2nd century, ragstone with tile courses), its known line from the Tower to Blackfriars, and its gates
const WALL_PTS = [[51.5081, -0.0759], [51.5110, -0.0752], [51.5135, -0.0770], [51.5150, -0.0790], [51.5163, -0.0815], [51.5172, -0.0850], [51.5177, -0.0890], [51.5178, -0.0935], [51.5181, -0.0960],
  [51.5168, -0.0970], [51.5162, -0.0988], [51.5155, -0.1003], [51.5147, -0.1018], [51.5139, -0.1026], [51.5128, -0.1031], [51.5114, -0.1034]];
const WALL = line(WALL_PTS), CITY = poly([...WALL_PTS, [51.5100, -0.1034], [51.5103, -0.0960], [51.5100, -0.0880], [51.5094, -0.0800], [51.5087, -0.0760]]);
const GATES = [["Ludgate", 51.5139, -0.1026], ["Newgate", 51.5155, -0.1003], ["Aldersgate", 51.5168, -0.0970], ["Cripplegate", 51.5178, -0.0935], ["Bishopsgate", 51.5163, -0.0815], ["Aldgate", 51.5135, -0.0770]].map(([n, a, b]) => { const [x, z] = LL(a, b); return { n, x, z }; });
function baseH(x, z) { const s = THAMES.side(x, z), d = Math.abs(s); let h;
  if (s > 0) { h = 0.7 + 0.6 * fbm(x / 180, z / 180, 3); const pond = fbm(x / 260 + 9, z / 260, 3); if (pond < 0.36) h = lerpN(h, -0.6, sstepN(0.36 - pond, 0, 0.05));   // the southern marshes, with pools and channels
    const [ex, ez] = LL(51.5045, -0.0905); h = Math.max(h, 2.2 - Math.hypot(x - ex, (z - ez) * 1.6) / 300);                                                            // the Southwark eyot at the bridgehead
    const [lx, lz] = LL(51.4950, -0.1195); h = Math.max(h, 2.0 - Math.hypot(x - lx, z - lz) / 200); }                                                                  // the higher ground of Lambeth
  else { h = 6 + 5 * fbm(x / 900 + 3, z / 900, 3) + clampN(-z - 2000, 0, 6000) / 400;                                                                                   // terrace gravels, rising slowly north
    for (const [hx, hz, a, r] of HILLS) h += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
    const tw = Math.hypot(x - THORNEY.c[0], z - THORNEY.c[1]); h = lerpN(Math.min(h, 2.6 + 0.6 * fbm(x / 60, z / 60, 2)), h, sstepN(tw, 300, 900));                    // Thorney Island and the low ground round it
    h = lerpN(1.0, h, sstepN(d, RIVER_HW, RIVER_HW + 150)); }                                                                                                          // the foreshore
  if (d < RIVER_HW + 30) h = lerpN(-4, h, sstepN(d, RIVER_HW - 50, RIVER_HW + (s > 0 ? 10 : 30)));
  const carve = (L, w, dep, bank) => { if (!L.near(x, z, w + bank)) return; const dd = L.d(x, z); if (dd < w + bank) h = Math.min(h, lerpN(dep, h, sstepN(dd, w * 0.5, w + bank))); };
  carve(FLEET, 40, -2.5, 60); carve(WALBROOK, 3, -0.4, 30); carve(TYB_N, 7, -1.2, 10); carve(TYB_S, 7, -1.2, 10); carve(TYB_W, 6, -1.0, 10);
  if (WALL.near(x, z, 30) && !CITY.inside(x, z)) { const wd = WALL.d(x, z); if (wd > 3 && wd < 18) h -= 2.4 * Math.sin((wd - 3) / 15 * Math.PI); }                     // the city ditch outside the wall
  return h; }
const groundH = baseH;

// ---------- streets of 1066 ----------
// The Late Saxon street plan: Cheapside (Westcheap) the broad market street, Eastcheap, Thames Street along the bank, and the
// north-south lanes laid out in the 880s-890s grid between Cheapside and the hithes (Bread Street, Friday Street, Bow Lane, Garlick Hill;
// excavated at Bread Street, Milk Street and Bow Lane), Wood Street up to Cripplegate, Gracechurch Street and Fish Street Hill to the
// bridge. Outside: Fleet Street and the Strand to Charing, King Street to Westminster, the Roman roads out of the gates, and Borough High
// Street on its causeway in Southwark. Courses follow the medieval streets, which mostly keep the Saxon lines; widths are typical (4-6 m,
// Cheapside wider), surfaced with rammed gravel.
const STREETS = [
  ["Cheapside", 11, [[51.5155, -0.1003], [51.5152, -0.0990], [51.5148, -0.0975], [51.5143, -0.0955], [51.5139, -0.0930], [51.5135, -0.0905], [51.5133, -0.0880], [51.5133, -0.0850], [51.5135, -0.0820], [51.5135, -0.0770]]],
  ["Thames Street", 5, [[51.5115, -0.1033], [51.5113, -0.1000], [51.5110, -0.0960], [51.5107, -0.0925], [51.5104, -0.0900], [51.5099, -0.0870], [51.5096, -0.0835], [51.5094, -0.0790], [51.5091, -0.0762]]],
  ["Eastcheap", 7, [[51.5113, -0.0905], [51.5110, -0.0880], [51.5108, -0.0850], [51.5106, -0.0820], [51.5103, -0.0790]]],
  ["Fish Street Hill and Gracechurch Street", 6, [[51.5097, -0.0872], [51.5110, -0.0868], [51.5122, -0.0858], [51.5133, -0.0850], [51.5148, -0.0832], [51.5163, -0.0815]]],
  ["Ludgate Hill", 6, [[51.5139, -0.1026], [51.5140, -0.1005]]],
  ["Watling Street", 5, [[51.5134, -0.0968], [51.5128, -0.0945], [51.5123, -0.0920], [51.5119, -0.0905]]],
  ["Bread Street", 4, [[51.5110, -0.0948], [51.5125, -0.0947], [51.5141, -0.0946]]],
  ["Friday Street", 4, [[51.5111, -0.0961], [51.5128, -0.0960], [51.5144, -0.0959]]],
  ["Bow Lane and Garlick Hill", 4, [[51.5108, -0.0932], [51.5122, -0.0930], [51.5138, -0.0929]]],
  ["Dowgate", 4, [[51.5104, -0.0910], [51.5120, -0.0908], [51.5134, -0.0905]]],
  ["Wood Street", 5, [[51.5140, -0.0937], [51.5158, -0.0937], [51.5177, -0.0935]]],
  ["Milk Street", 4, [[51.5139, -0.0925], [51.5152, -0.0924]]],
  ["Aldersgate Street", 6, [[51.5168, -0.0970], [51.5157, -0.0968], [51.5149, -0.0967]]],
  ["Fenchurch Street", 5, [[51.5122, -0.0858], [51.5121, -0.0820], [51.5126, -0.0795], [51.5135, -0.0772]]],
  ["St Mary at Hill", 4, [[51.5096, -0.0835], [51.5107, -0.0833]]],
  ["Fleet Street", 6, [[51.5139, -0.1026], [51.5140, -0.1045], [51.5139, -0.1080], [51.5134, -0.1120], [51.5130, -0.1145]]],
  ["the Strand", 6, [[51.5130, -0.1145], [51.5120, -0.1180], [51.5105, -0.1215], [51.5088, -0.1250], [51.5073, -0.1277]]],
  ["King Street", 6, [[51.5073, -0.1277], [51.5050, -0.1270], [51.5025, -0.1266], [51.5004, -0.1265]]],
  ["the road to Holborn", 6, [[51.5155, -0.1003], [51.5160, -0.1040], [51.5167, -0.1090], [51.5172, -0.1150]]],
  ["Ermine Street", 6, [[51.5163, -0.0815], [51.5190, -0.0805], [51.5230, -0.0790]]],
  ["the road east from Aldgate", 6, [[51.5135, -0.0770], [51.5140, -0.0730], [51.5148, -0.0680]]],
  ["the road north from Cripplegate", 5, [[51.5178, -0.0935], [51.5200, -0.0940], [51.5230, -0.0945]]],
  ["Borough High Street", 7, [[51.5062, -0.0878], [51.5045, -0.0890], [51.5025, -0.0905], [51.5000, -0.0920], [51.4975, -0.0930]]],
  ["the road to Lambeth", 4, [[51.5000, -0.0920], [51.4985, -0.1000], [51.4965, -0.1100], [51.4952, -0.1185]]],
].map(([name, w, pts]) => ({ name, w, L: line(pts) }));
const BRIDGE = line([[51.5097, -0.0872], [51.5062, -0.0878]]), BRIDGE_Y = 2.6;   // London Bridge, timber, on the line of Fish Street Hill

// ---------- the land-use raster: 2 m cells over the whole map, for ground colour, placing buildings without overlaps, and walking ----------
// 0 open ground, 1 street, 2 building, 3 yard, 4 churchyard / precinct, 5 ploughed field, 6 burnt ground, 7 wall
const RX0 = -1400, RZ0 = -2400, RC = 2, RW = 2800, RH = 1900, RAS = new Uint8Array(RW * RH);
const rIdx = (x, z) => { const i = Math.floor((x - RX0) / RC), j = Math.floor((z - RZ0) / RC); return i < 0 || j < 0 || i >= RW || j >= RH ? -1 : j * RW + i; };
const rGet = (x, z) => { const k = rIdx(x, z); return k < 0 ? 0 : RAS[k]; };
function rRect(x, z, w, d, ry, v, test) {   // w along local x, d along local z; with test: true if every cell is 0 or 3 (free)
  const c = Math.cos(ry), s = Math.sin(ry), R = Math.hypot(w, d) / 2 + RC;
  for (let zz = z - R; zz <= z + R; zz += RC) for (let xx = x - R; xx <= x + R; xx += RC) { const dx = xx - x, dz = zz - z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) > w / 2 || Math.abs(lz) > d / 2) continue; const k = rIdx(xx, zz); if (k < 0) { if (test) return false; continue; }
    if (test) { if (RAS[k] !== 0 && RAS[k] !== 3 && RAS[k] !== 5) return false; } else if (v !== 3 || RAS[k] === 0) RAS[k] = v; }
  return true; }
function rLine(L, w, v) { for (const [ax, az, bx, bz] of L.S) { const len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 1.5);
  for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; for (let u = -w / 2; u <= w / 2; u += 1.5) for (let q = -w / 2; q <= w / 2; q += 1.5) { const kk = rIdx(x + u, z + q); if (kk >= 0 && u * u + q * q <= w * w / 4) RAS[kk] = v; } } } }
for (const S of STREETS) rLine(S.L, S.w, 1);

// ---------- sky, sun, winter haze and smoke ----------
// 25 December 1066 (Julian), which is 31 December in today's calendar: the sun rises about 8:05 and sets about 16:00, and at noon
// stands only 15 degrees above the southern horizon. The weather that day is not recorded; this is a pale, hazy midwinter day,
// with the smoke of thousands of hearths lying over the City.
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor; varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(hor, up, pow(y, 0.6)), 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 32, 16), skyMat); sky.renderOrder = -1; scene.add(sky);
scene.fog = new THREE.FogExp2(0xb8bcc0, IS_HEADSET ? 0.00055 : 0.00042);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xc4ccd6, 0x5a5444, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(260, 24), new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false, toneMapped: false })); scene.add(sunDisc);
// the sun's place for latitude 51.5 N, declination -23.1 degrees, by the hour of local solar time
function sunAt(hour) { const lat = 51.5 * Math.PI / 180, dec = -23.1 * Math.PI / 180, H = (hour - 12) * 15 * Math.PI / 180;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(dec) * Math.cos(lat));   // az from south, west positive
  return { el, dir: V3(Math.sin(az) * Math.cos(el) * -1, Math.sin(el), Math.cos(az) * Math.cos(el)).normalize() }; }
const WATER = 0;
const water = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x55605a, roughness: 0.3, metalness: 0.1, map: tex(256, 256, speckle("#ffffff", 1500, ["#d0d8d4", "#ffffff", "#b8c4c0"], 6, 1.2), [3000, 3000]) }));
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
const _gc = new THREE.Color(), _c1 = new THREE.Color();
function levelRecentre(L, cx, cz) { const c = L.c, n = GN + 1, step = 2 * c, ox = Math.round(cx / step) * step, oz = Math.round(cz / step) * step;
  if (ox === L.ox && oz === L.oz) return false;
  const H2 = new Float32Array(n * n), C2 = new Float32Array(n * n * 3), had = !isNaN(L.ox), di = had ? Math.round((ox - L.ox) / c) : 0, dj = had ? Math.round((oz - L.oz) / c) : 0;
  for (let j = 0; j <= GN; j++) for (let i = 0; i <= GN; i++) { const k = j * n + i, si = i + di, sj = j + dj;
    if (had && si >= 0 && si <= GN && sj >= 0 && sj <= GN) { const q = sj * n + si; H2[k] = L.H[q]; C2[3 * k] = L.C[3 * q]; C2[3 * k + 1] = L.C[3 * q + 1]; C2[3 * k + 2] = L.C[3 * q + 2]; continue; }
    const x = ox + (i - GN / 2) * c, z = oz + (j - GN / 2) * c, h = baseH(x, z); H2[k] = h; groundColor(x, z, h, _gc); C2[3 * k] = _gc.r; C2[3 * k + 1] = _gc.g; C2[3 * k + 2] = _gc.b; }
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
// midwinter colours: dun grass, bare mud and gravel where people walk, reeds on the marsh, ploughed strips
function groundColor(x, z, h, c) {
  const n1 = fbm(x / 40, z / 40, 3), n2 = fbm(x / 600 + 5, z / 600, 3);
  c.setRGB(0.36 + 0.10 * n2, 0.37 + 0.08 * n1, 0.22 + 0.04 * n1);                                                           // winter pasture
  if (h < 1.6 && THAMES.side(x, z) > 0) c.lerp(_c1.setRGB(0.48 + 0.08 * n1, 0.42 + 0.06 * n1, 0.28), 0.7);                    // dead reeds and sedge on the southern marsh
  if (h < WATER + 0.5) c.lerp(_c1.setRGB(0.30, 0.27, 0.22), clampN((WATER + 0.5 - h) * 1.5, 0, 0.9));                       // mud at the water's edge
  const v = rGet(x, z);
  if (v === 1) c.setRGB(0.52 + 0.07 * n1, 0.45 + 0.06 * n1, 0.34 + 0.03 * n1);                                                          // gravel streets, churned to mud
  else if (v === 2 || v === 3) c.lerp(_c1.setRGB(0.30 + 0.06 * n1, 0.26 + 0.04 * n1, 0.19), v === 2 ? 0.9 : 0.75);            // trodden yards
  else if (v === 5) c.lerp(_c1.setRGB(0.36 + 0.05 * Math.sin(x * 0.6), 0.29, 0.20), 0.8);                                   // ploughed strips
  else if (v === 6) c.setRGB(0.14 + 0.05 * n1, 0.12 + 0.04 * n1, 0.10);                                                     // burnt: Southwark, fired by William in late November
  else if (v === 7) c.lerp(_c1.setRGB(0.40, 0.38, 0.32), 0.8);
  else if (v === 4) c.lerp(_c1.setRGB(0.34, 0.38, 0.24), 0.5);
  else if (fieldAt(x, z, h)) c.lerp(_c1.setRGB(0.38 + 0.06 * Math.sin(x * 0.55 + z * 0.08), 0.31, 0.21), 0.75);                 // ploughland in strips, bare for winter
  if (v === 0 && Math.hypot(x - moorX, (z - moorZ) * 1.5) < 420) c.lerp(_c1.setRGB(0.42 + 0.06 * n1, 0.40, 0.27), 0.6);       // Moorfields fen
  return c; }

// ---------- buildings as real geometry, merged by area ----------
// Every building is built from its parts at true size (posts, wall panels, thick roofs, ridges, doors, shutters), with textures laid
// at real scale (1 unit of texture = 1 m) and a colour per building, then merged into one mesh per material per 500 m square.
const GT = (w, h, draw, metres) => { const t = tex(w, h, draw); t.repeat.set(1 / metres, 1 / metres); return t; };
const G_TEX = {
  daub: GT(256, 256, (g, w, h) => { speckle("#b0a084", 4000, ["#bcae92", "#a09074", "#c4b89c", "#968a70", "#aaa088"], 3, 3)(g, w, h);   // clay daub over wattle, smoothed by hand: 2 m square
    for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "80,66,46" : "200,186,160"},.10)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 8 + rnd() * 26, 6 + rnd() * 18, rnd() * 3, 0, 6.283); g.fill(); }   // hand-smoothed, uneven
    g.fillStyle = "rgba(60,48,32,.35)"; g.fillRect(0, h - 14, w, 14); }, 2),
  plank: GT(256, 256, (g, w, h) => { g.fillStyle = "#7a6a58"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { const c = ["#8a7a66", "#76665a", "#948472", "#6e604e", "#827260"][(x / 32) % 5]; g.fillStyle = c; g.fillRect(x + 1, 0, 30, h);   // split oak planks, 25 cm
      for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(30,22,14,.22)"; g.fillRect(x + 2 + rnd() * 27, rnd() * h, 1, 10 + rnd() * 40); } g.fillStyle = "rgba(15,10,6,.55)"; g.fillRect(x, 0, 2, h); } g.fillStyle = "rgba(40,30,20,.4)"; g.fillRect(0, h - 10, w, 10); }, 2),
  oak: GT(128, 128, (g, w, h) => { g.fillStyle = "#3e3024"; g.fillRect(0, 0, w, h); for (let k = 0; k < 160; k++) { g.fillStyle = ["rgba(80,62,44,.5)", "rgba(28,20,14,.5)"][k % 2]; g.fillRect(rnd() * w, 0, 1 + rnd() * 2, h); } }, 1),
  thatch: GT(256, 256, (g, w, h) => { g.fillStyle = "#7e6a46"; g.fillRect(0, 0, w, h);   // water reed / straw, laid in courses; weathered grey-brown with moss
    for (let k = 0; k < 6000; k++) { const x = rnd() * w, y = rnd() * h, l = 5 + rnd() * 14; g.strokeStyle = ["#9a8458", "#6a5836", "#8a7650", "#5a4a30", "#a8946a", "#7a7458"][(rnd() * 6) | 0]; g.globalAlpha = 0.55; g.lineWidth = 0.8 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 1.5, y + l); g.stroke(); }
    g.globalAlpha = 1; for (let y = 0; y < h; y += 43) { g.fillStyle = "rgba(30,22,10,.28)"; g.fillRect(0, y, w, 4); g.fillStyle = "rgba(200,180,130,.12)"; g.fillRect(0, y + 4, w, 3); }
    for (let k = 0; k < 18; k++) { g.fillStyle = "rgba(70,84,40,.18)"; g.beginPath(); g.arc(rnd() * w, rnd() * h, 6 + rnd() * 18, 0, 6.283); g.fill(); } }, 2),
  shingle: GT(256, 256, (g, w, h) => { g.fillStyle = "#5e564a"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = ((y / 16) % 2) * 12; x < w; x += 24) {   // riven oak shingles, 15 x 20 cm courses
      g.fillStyle = ["#7e7466", "#6e665a", "#8a8070", "#746a5c", "#686054"][(rnd() * 5) | 0]; g.fillRect(x + 1, y, 22, 15); g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(x, y + 14, 24, 2); } }, 2),
  rubble: GT(256, 256, (g, w, h) => { g.fillStyle = "#9a9282"; g.fillRect(0, 0, w, h); for (let k = 0; k < 700; k++) { g.fillStyle = ["#a8a090", "#888070", "#b0a898", "#7a7466", "#9c8a78", "#8a5a44"][(rnd() * 6) | 0]; const x = rnd() * w, y = rnd() * h, sw = 8 + rnd() * 14, sh = 5 + rnd() * 7; g.fillRect(x, y, sw, sh); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(x, y + sh, sw, 1); } }, 2),   // ragstone rubble with reused Roman tile, lime mortar
  stave: GT(256, 256, (g, w, h) => { for (let x = 0; x < w; x += 40) { const gr = g.createLinearGradient(x, 0, x + 40, 0); gr.addColorStop(0, "#2e2418"); gr.addColorStop(0.5, "#6a5642"); gr.addColorStop(1, "#2e2418"); g.fillStyle = gr; g.fillRect(x, 0, 40, h);   // split logs set upright, round side out (as at Greensted)
      for (let k = 0; k < 10; k++) { g.fillStyle = "rgba(20,14,8,.3)"; g.fillRect(x + 6 + rnd() * 28, rnd() * h, 1, 20 + rnd() * 40); } } }, 2),
  char: GT(128, 128, speckle("#201a16", 1500, ["#2c2420", "#141010", "#3e3028", "#4a3a2a", "#5a5048"], 4, 6), 2),
  hang: GT(128, 256, (g, w, h) => { g.fillStyle = "#7a2a24"; g.fillRect(0, 0, w, h); g.fillStyle = "#c89a3a"; g.fillRect(0, 10, w, 10); g.fillRect(0, h - 20, w, 10);   // a hall hanging: woollen cloth with an embroidered border
    for (let x = 6; x < w; x += 24) { g.fillStyle = "#2a3a5a"; g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 10, 44); g.lineTo(x, 58); g.lineTo(x - 10, 44); g.fill(); } g.fillStyle = "rgba(0,0,0,.15)"; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); }, 2),
  rush: GT(256, 256, (g, w, h) => { speckle("#5e5038", 3000, ["#7a6a44", "#4a3e2a", "#8a7a52", "#6a5a3a"], 6, 1.5)(g, w, h); }, 2) };
const G_MAT = {}; for (const k in G_TEX) G_MAT[k] = new THREE.MeshStandardMaterial({ map: G_TEX[k], vertexColors: true, roughness: k === "oak" ? 0.85 : 0.95 });
G_MAT.dark = new THREE.MeshStandardMaterial({ color: 0x0e0a06, vertexColors: true, roughness: 1 });
G_MAT.plain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
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
// the timber house: low walls on earth-fast oak posts, wattle-and-daub or planks; door in a frame; shuttered window openings
function gHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, H.chunkKey), w = H.w, d = H.d, wh = H.wh, rh = H.rh, R = seeded((H.x * 7 + H.z * 13) | 0);
  const bw = 0.85 + R() * 0.25, br = 0.8 + R() * 0.3, tintW = H.wall === "daub" ? (R() < 0.3 ? [1.3, 1.3, 1.27] : [bw, bw * 0.98, bw * 0.95]) : [bw, bw * 0.97, bw * 0.94];   // some daub limewashed
  const tintR = H.roof === "thatch" ? (R() < 0.25 ? [1.15, 1.1, 0.95] : [br, br * 0.98, br * 0.93]) : [br, br, br];   // a few roofs new-thatched, most weathered
  GTINT = tintW; gbox(F, H.wall, 0, wh / 2 - 0.15, 0, w, wh + 0.3, d);
  if (!H.hip) for (const sz of [-1, 1]) gpoly(F, H.wall, [[-w / 2, wh, sz * d / 2], [w / 2, wh, sz * d / 2], [0, wh + rh, sz * d / 2]], [[0, wh], [w, wh], [w / 2, wh + rh]], [0, 0, sz]);   // the gable ends
  GTINT = [0.9 + R() * 0.2, 0.9, 0.9]; const post = (x, z) => gbox(F, "oak", x, wh / 2 - 0.1, z, 0.22, wh + 0.2, 0.22, "b");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(sx * w / 2, sz * d / 2);
  if (H.wall === "daub" && !IS_HEADSET) { const nz = Math.max(1, Math.round(d / 1.3)), nx = Math.max(1, Math.round(w / 1.3));
    for (let i = 1; i < nz; i++) for (const sx of [-1, 1]) gbox(F, "oak", sx * (w / 2 + 0.02), wh / 2 - 0.1, -d / 2 + d * i / nz, 0.05, wh + 0.2, 0.16, "bt");
    for (let i = 1; i < nx; i++) for (const sz of [-1, 1]) gbox(F, "oak", -w / 2 + w * i / nx, wh / 2 - 0.1, sz * (d / 2 + 0.02), 0.16, wh + 0.2, 0.05, "bt"); }
  for (const sx of [-1, 1]) gbox(F, "oak", sx * w / 2, wh - 0.08, 0, 0.26, 0.2, d + 0.1, "b");   // wall plates
  // the doorway: oak jambs and lintel, a plank door
  const dr = H.door, onX = dr === "+x" || dr === "-x", sg = dr[0] === "+" ? 1 : -1, n = onX ? [sg, 0, 0] : [0, 0, sg], ox = onX ? sg * (w / 2 + 0.04) : 0, oz = onX ? 0 : sg * (d / 2 + 0.04), dw = 0.95, dh = Math.min(1.8, wh - 0.2);
  const at = (u, y) => onX ? [ox, y, u] : [u, y, oz];
  GTINT = [1.05, 1, 0.95]; gpoly(F, "plank", [at(-dw / 2, 0), at(dw / 2, 0), at(dw / 2, dh), at(-dw / 2, dh)], [[0, 0], [dw, 0], [dw, dh], [0, dh]], n);
  GTINT = [1, 1, 1]; for (const u of [-dw / 2 - 0.09, dw / 2 + 0.09]) { const [px, , pz] = at(u, 0); gbox(F, "oak", px, dh / 2, pz, onX ? 0.12 : 0.16, dh, onX ? 0.16 : 0.12); }
  { const [px, , pz] = at(0, 0); gbox(F, "oak", px, dh + 0.08, pz, onX ? 0.12 : dw + 0.4, 0.16, onX ? dw + 0.4 : 0.12); }
  // window openings with a shutter, one on each long wall
  for (const sx of [-1, 1]) { if (onX && sx === sg) continue; const z = (R() - 0.5) * d * 0.4, wy = Math.min(1.3, wh - 0.75); GTINT = [1, 1, 1];
    gpoly(F, "dark", [[sx * (w / 2 + 0.03), wy, z - 0.28], [sx * (w / 2 + 0.03), wy, z + 0.28], [sx * (w / 2 + 0.03), wy + 0.42, z + 0.28], [sx * (w / 2 + 0.03), wy + 0.42, z - 0.28]], [[0, 0], [1, 0], [1, 1], [0, 1]], [sx, 0, 0]);
    gbox(F, "plank", sx * (w / 2 + 0.06), wy - 0.24, z, 0.04, 0.42, 0.56, ""); }
  // a lean-to on some
  if (H.lean) { const lw = 1.8, lh = wh * 0.7, sx = H.lean, lz = d * 0.25; GTINT = tintW; gbox(F, "plank", sx * (w / 2 + lw / 2), lh / 2 - 0.1, lz, lw, lh + 0.2, d * 0.45);
    GTINT = tintR; const x0 = sx * (w / 2 + lw + 0.3), x1 = sx * w / 2, y0 = lh - 0.1, y1 = wh - 0.05, L = d * 0.45 / 2 + 0.2, rm = H.roof;
    gpoly(F, rm, [[x0, y0 + 0.2, lz - L], [x0, y0 + 0.2, lz + L], [x1, y1 + 0.2, lz + L], [x1, y1 + 0.2, lz - L]], [[0, 0], [2 * L, 0], [2 * L, 2], [0, 2]], [sx, 1, 0]);
    gpoly(F, rm, [[x0, y0, lz - L], [x0, y0, lz + L], [x1, y1, lz + L], [x1, y1, lz - L]], [[0, 0], [2 * L, 0], [2 * L, 2], [0, 2]], [0, -1, 0]); }
  GTINT = tintR; groof(F, H.roof, w, d, wh, rh, { hip: H.hip });
  GTINT = [1, 1, 1]; }
// a burnt house in Southwark: stumps of charred posts and wall, fallen timbers, a black floor
function gBurnt(H) { const F = FR(H.x, H.z, H.ry, H.gy), R = seeded((H.x * 5 + H.z * 3) | 0), w = H.w, d = H.d; GTINT = [1, 1, 1];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(F, "char", sx * w / 2, 0.6 + R() * 0.6, sz * d / 2, 0.24, 1.2 + R() * 1.8, 0.24);
  for (const sx of [-1, 1]) gbox(F, "char", sx * w / 2, 0.25, 0, 0.18, 0.2 + R() * 0.7, d * (0.4 + R() * 0.5));
  for (let k = 0; k < 4; k++) { const L = 2 + R() * 3; gbox(F, "char", (R() - 0.5) * w, 0.12, (R() - 0.5) * d, 0.2, 0.2, L); }
  gpoly(F, "char", [[-w / 2, 0.05, -d / 2], [w / 2, 0.05, -d / 2], [w / 2, 0.05, d / 2], [-w / 2, 0.05, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]);
  if (R() < 0.25) { gbox(F, "oak", -w / 2, 1.3, -d / 2, 0.22, 2.6, 0.22); gbox(F, "oak", w / 2, 1.3, -d / 2, 0.22, 2.6, 0.22); gbox(F, "oak", 0, 2.5, -d / 2, w, 0.2, 0.22); } }   // new posts going up
// the Late Saxon parish church: nave and chancel, rubble or split-log walls, small round-headed windows, a bellcote, shingles
function gChurch(x, z, o) { const gy = groundH(x, z) - 0.3, F = FR(x, z, 0, gy), nl = o.nl, nw = o.nw, cl = o.cl, cw = o.cw, wh = o.wh, wm = o.mat === "plank" ? "stave" : "rubble", rf = o.roof;
  const NF = FR(x, z, Math.PI / 2, gy, F.key), CF = FR(x + nl / 2 + cl / 2, z, Math.PI / 2, gy, F.key);   // frames with the ridge running east-west
  GTINT = wm === "rubble" ? [1.05, 1.03, 1.0] : [1, 1, 1];
  gbox(NF, wm, 0, wh / 2, 0, nw, wh, nl); for (const sz of [-1, 1]) gpoly(NF, wm, [[-nw / 2, wh, sz * nl / 2], [nw / 2, wh, sz * nl / 2], [0, wh + nw * 0.6, sz * nl / 2]], [[0, wh], [nw, wh], [nw / 2, wh + nw * 0.6]], [0, 0, sz]);
  gbox(CF, wm, 0, wh * 0.4, 0, cw, wh * 0.8, cl); gpoly(CF, wm, [[-cw / 2, wh * 0.8, cl / 2], [cw / 2, wh * 0.8, cl / 2], [0, wh * 0.8 + cw * 0.6, cl / 2]], [[0, 0], [cw, 0], [cw / 2, 1]], [0, 0, 1]);
  if (wm === "rubble") { GTINT = [1.25, 1.2, 1.1]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(NF, "rubble", sx * nw / 2, wh / 2, sz * nl / 2, 0.45, wh, 0.45); }   // dressed quoins at the corners
  GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (const f of [0.25, 0.7]) garch(NF, "dark", sx * nw / 2, wh * 0.45, -nl / 2 + nl * f, 0.4, 1.1, [sx, 0, 0]);
  garch(CF, "dark", 0, wh * 0.35, cl / 2, 0.4, 1.0, [0, 0, 1]); garch(NF, "dark", 0, 0, -nl / 2, 1.2, 2.5, [0, 0, -1]);
  GTINT = [1, 1, 1]; groof(NF, rf, nw, nl, wh, nw * 0.6, { e: 0.3, g: 0.25 }); groof(CF, rf, cw, cl, wh * 0.8, cw * 0.6, { e: 0.3, g: 0.2 });
  const by = wh + nw * 0.6; gbox(NF, wm, 0, by + 0.7, -nl / 2 + 0.3, 1.3, 1.4, 0.6, "b"); garch(NF, "dark", 0, by + 0.2, -nl / 2, 0.55, 0.9, [0, 0, -1]); groof(FR(x - nl / 2 + 0.3, z, Math.PI / 2, gy + by + 1.4, F.key), "shingle", 1.5, 0.8, 0, 0.6, { e: 0.1, g: 0.1 });   // the bellcote
  gbox(NF, "oak", 0, by + 2.4, -nl / 2 + 0.3, 0.1, 0.9, 0.1); gbox(NF, "oak", 0, by + 2.55, -nl / 2 + 0.3, 0.5, 0.1, 0.1); }
// flush everything into meshes, one per material per square
function gFlush(target) { const out = [];
  for (const [key, C] of GCOL) { if (!C.pos.length) continue; const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(C.pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(C.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(C.uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(C.col.map(v => clampN(v, 0, 1.6)), 3)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, G_MAT[C.mat]); m.userData.key = key; (target || scene).add(m); out.push(m); }
  GCOL.clear(); return out; }

// ---------- materials ----------
const thatchT = tex(256, 256, (g, w, h) => { g.fillStyle = "#8a7448"; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 2600; k++) { const x = rnd() * w, y = rnd() * h, l = 6 + rnd() * 18; g.strokeStyle = ["#a88e5a", "#6e5a34", "#94784a", "#5a4a2c", "#7a7458"][(rnd() * 5) | 0]; g.globalAlpha = 0.5; g.lineWidth = 1 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 2, y + l); g.stroke(); }
  g.globalAlpha = 1; for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(40,30,15,.25)"; g.fillRect(0, y, w, 3); } }, [3, 2]);
const daubT = tex(256, 128, (g, w, h) => { speckle("#a89a7c", 2500, ["#b8aa8a", "#988a6a", "#c0b494", "#8a7c60"])(g, w, h);   // wattle-and-daub panels between earth-fast oak posts
  for (let x = 0; x < w; x += 64) { g.fillStyle = "#4e3c2a"; g.fillRect(x, 0, 9, h); } g.fillStyle = "#4e3c2a"; g.fillRect(0, h - 10, w, 10); g.fillRect(0, 0, w, 6); }, [2, 1]);
const plankT = tex(256, 128, (g, w, h) => { g.fillStyle = "#5e4a36"; g.fillRect(0, 0, w, h);   // walls of split oak planks set upright
  for (let x = 0; x < w; x += 16) { g.fillStyle = ["#6a5440", "#56442f", "#72604a", "#4e3e2c"][(x / 16) % 4]; g.fillRect(x + 1, 0, 14, h); g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x, 0, 2, h); }
  for (let k = 0; k < 500; k++) { g.fillStyle = "rgba(20,14,8,.25)"; g.fillRect(rnd() * w, rnd() * h, 1, 4 + rnd() * 12); } }, [3, 1]);
const ashlarT = tex(256, 256, (g, w, h) => { speckle("#d6cbb0", 3000, ["#e2d8c0", "#c8bc9e", "#d0c4a6", "#b8ac90"])(g, w, h);   // Caen stone, cut in squared blocks
  g.fillStyle = "rgba(120,104,80,.55)"; for (let y = 0; y < h; y += 16) { g.fillRect(0, y, w, 1.5); const o = (y / 16) % 2 ? 0 : 16; for (let x = o; x < w; x += 32) g.fillRect(x, y, 1.5, 16); } }, [6, 4]);
const ragT = tex(256, 256, (g, w, h) => { g.fillStyle = "#8a8474"; g.fillRect(0, 0, w, h);   // Kentish ragstone rubble with courses of red Roman tile
  for (let k = 0; k < 900; k++) { g.fillStyle = ["#9a9484", "#7a7464", "#a49e8c", "#6e6a5c", "#8e8a78"][(rnd() * 5) | 0]; g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 10, 4 + rnd() * 5); }
  for (const y of [70, 76, 180, 186]) { g.fillStyle = "#8a4a32"; g.fillRect(0, y, w, 5); g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(0, y + 5, w, 1); } }, [4, 1]);
const shingleT = tex(256, 256, (g, w, h) => { g.fillStyle = "#5e544a"; g.fillRect(0, 0, w, h);   // oak shingles, weathered grey
  for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? 0 : 8; x < w; x += 16) { g.fillStyle = ["#6e6458", "#5a5248", "#7a7064", "#625a4e"][(rnd() * 4) | 0]; g.fillRect(x + 1, y, 14, 11); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x, y + 10, 16, 2); } }, [4, 4]);
const leadT = tex(256, 256, (g, w, h) => { speckle("#7e8288", 1500, ["#8a8e94", "#70747a", "#969aa0"])(g, w, h); g.fillStyle = "rgba(40,44,50,.5)"; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 3, h); }, [6, 3]);
const charT = tex(128, 128, speckle("#1e1a16", 900, ["#2a2420", "#121010", "#3a3028", "#4a3a2a"], 4, 6), [2, 1]);
const MAT = { thatch: new THREE.MeshStandardMaterial({ map: thatchT, roughness: 1 }), daub: new THREE.MeshStandardMaterial({ map: daubT, roughness: 0.95 }), plank: new THREE.MeshStandardMaterial({ map: plankT, roughness: 0.9 }),
  ashlar: new THREE.MeshStandardMaterial({ map: ashlarT, roughness: 0.85 }), rag: new THREE.MeshStandardMaterial({ map: ragT, roughness: 0.95 }), shingle: new THREE.MeshStandardMaterial({ map: shingleT, roughness: 0.95 }),
  lead: new THREE.MeshStandardMaterial({ map: leadT, roughness: 0.6, metalness: 0.3 }), char: new THREE.MeshStandardMaterial({ map: charT, roughness: 1 }), wood: M(0x5a4634), dark: M(0x18120c, { roughness: 1, side: THREE.DoubleSide }),
  tar: M(0x2e2620, { roughness: 0.7, side: THREE.DoubleSide }), stoneGrey: M(0x8a8478), iron: M(0x3a3a3c, { metalness: 0.6, roughness: 0.5 }), cloth: M(0xd8ccb0, { side: THREE.DoubleSide }) };
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
const put = (key, geo, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => { kit(key, geo, mat).list.push([x, y, z, sx, sy, sz, ry, rx, rz]); return KIT[key].list.length - 1; };
function buildKit(group) { for (const k in KIT) { const K = KIT[k]; if (!K.list.length || K.im) continue; const im = new THREE.InstancedMesh(K.geo, K.mat, K.list.length), c = new THREE.Color();
  K.list.forEach(([x, y, z, sx, sy, sz, ry, rx, rz], i) => { O3.position.set(x, y, z); O3.rotation.set(rx || 0, ry, rz || 0); O3.scale.set(sx, sy, sz); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); c.setHSL(0.08, 0.1 + 0.15 * hash(i, 3), 0.78 + 0.22 * hash(i, 5)); im.setColorAt(i, c); });
  im.frustumCulled = false; K.im = im; group.add(im); } }
function kitHide(key, i) { const K = KIT[key]; if (!K?.im) return; K.im.setMatrixAt(i, ZEROM); K.im.instanceMatrix.needsUpdate = true; }
function kitShow(key, i) { const K = KIT[key]; if (!K?.im) return; const [x, y, z, sx, sy, sz, ry, rx, rz] = K.list[i]; O3.position.set(x, y, z); O3.rotation.set(rx || 0, ry, rz || 0); O3.scale.set(sx, sy, sz); O3.updateMatrix(); K.im.setMatrixAt(i, O3.matrix); K.im.instanceMatrix.needsUpdate = true; }

// ---------- solid things: rectangles you cannot walk through, in a 16 m hash ----------
const COLL = new Map(), CC = 16;
function solid(x, z, w, d, ry, tag) { const r = { x, z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), tag, on: true }, R = Math.hypot(w, d) / 2;
  for (let i = Math.floor((x - R) / CC); i <= Math.floor((x + R) / CC); i++) for (let j = Math.floor((z - R) / CC); j <= Math.floor((z + R) / CC); j++) { const k = i * 100003 + j; if (!COLL.has(k)) COLL.set(k, []); COLL.get(k).push(r); }
  return r; }
function pushOut(p, rad = 0.3) { const L = COLL.get(Math.floor(p.x / CC) * 100003 + Math.floor(p.z / CC)); if (!L) return;
  for (const r of L) { if (!r.on) continue; const dx = p.x - r.x, dz = p.z - r.z, lx = dx * r.c - dz * r.s, lz = dx * r.s + dz * r.c, ex = r.hw + rad - Math.abs(lx), ez = r.hd + rad - Math.abs(lz);
    if (ex <= 0 || ez <= 0) continue; let nx = lx, nz = lz; if (ex < ez) nx = Math.sign(lx || 1) * (r.hw + rad); else nz = Math.sign(lz || 1) * (r.hd + rad);
    p.x = r.x + nx * r.c + nz * r.s; p.z = r.z - nx * r.s + nz * r.c; } }

// ---------- houses ----------
// Late Saxon London houses (Bread Street, Milk Street, Ironmonger Lane, Poultry, Fennings Wharf): rectangular, about 4-6 m by 6-12 m,
// of earth-fast oak posts with plank or wattle-and-daub walls, many over a plank-lined cellar, a central hearth, and a thatched roof
// (shingles on better buildings). They stood a little back from the street, often gable-end on, on long narrow plots with yards,
// cesspits and wells behind. No stone houses are known in London before about 1100.
const HOUSES = [];
function addHouse(x, z, w, d, ry, o = {}) { const gy = o.gy ?? groundH(x, z), R = seeded((x * 31 + z * 17) | 0), wall = o.wall ?? (R() < 0.55 ? "daub" : "plank"), roof = o.roof ?? (R() < 0.88 ? "thatch" : "shingle");
  const H = { x, z, w, d, ry, gy, wh: o.wh ?? 2.0 + R() * 0.6, rh: o.rh ?? w * (roof === "thatch" ? 0.62 + R() * 0.14 : 0.5), wall, roof, hip: o.hip ?? (roof === "thatch" && R() < 0.5), kind: o.kind || "house", burnt: !!o.burnt, door: o.door ?? "+z" };
  H.lean = !H.burnt && R() < 0.2 ? (H.door === "+x" ? -1 : 1) : 0;
  if (!H.burnt) { const s = Math.sin(ry), c = Math.cos(ry), dr = H.door;   // the doorway: "+z"/"-z" a gable end, "+x"/"-x" a long side
    H.dp = dr === "+z" ? [x + s * (d / 2 + 0.03), z + c * (d / 2 + 0.03), ry] : dr === "-z" ? [x - s * (d / 2 + 0.03), z - c * (d / 2 + 0.03), ry + Math.PI] :
      dr === "+x" ? [x + c * (w / 2 + 0.03), z - s * (w / 2 + 0.03), ry + Math.PI / 2] : [x - c * (w / 2 + 0.03), z + s * (w / 2 + 0.03), ry - Math.PI / 2]; }
  H.coll = solid(x, z, w + 0.1, d + 0.1, ry, H); if (H.lean) { const lx = H.lean * (w / 2 + 0.9); solid(x + Math.cos(ry) * lx, z - Math.sin(ry) * lx, 1.8, d * 0.45, ry); }
  HOUSES.push(H); return H; }
function buildHouses(fireSet) { for (const H of HOUSES) { if (fireSet.has(H)) continue; if (H.burnt) gBurnt(H); else gHouse(H); }
  let k = 0; for (const H of fireSet) { H.chunkKey = "fire" + k++; gHouse(H); }
  for (const m of gFlush()) { const key = m.userData.key; if (!key.startsWith("fire")) continue; const H = [...fireSet][+key.slice(4).split("|")[0]]; (H.fx || (H.fx = [])).push(m); m.userData.mat0 = m.material; } }
// yard things: woodpiles, barrels, wells, wattle fences
const wattleT = tex(256, 128, (g, w, h) => { g.fillStyle = "#3a2e20"; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 9) { g.fillStyle = ["#7a6446", "#6a5638", "#8a7452"][(y / 9 | 0) % 3]; for (let x = 0; x < w; x += 32) { g.beginPath(); g.ellipse(x + 16 + ((y / 9 | 0) % 2) * 16, y, 17, 4, 0, 0, 6.283); g.fill(); } }
  g.fillStyle = "#4a3a28"; for (let x = 0; x < w; x += 32) g.fillRect(x + 14, 0, 5, h); }, [8, 1]);
MAT.wattle = new THREE.MeshStandardMaterial({ map: wattleT, roughness: 1 });
const logEndT = tex(128, 128, (g, w, h) => { g.fillStyle = "#3a2e22"; g.fillRect(0, 0, w, h); for (let k = 0; k < 60; k++) { const x = rnd() * w, y = rnd() * h, r = 5 + rnd() * 6; g.fillStyle = "#a88a5a"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.strokeStyle = "#6a5032"; g.beginPath(); g.arc(x, y, r * 0.5, 0, 6.283); g.stroke(); } }, [1, 1]);
MAT.woodpile = new THREE.MeshStandardMaterial({ map: logEndT, roughness: 1 });
function yardThings(x, z, ry, R) { const c = Math.cos(ry), s = Math.sin(ry), at = (u, v) => [x + u * c + v * s, z - u * s + v * c], r = R();
  if (r < 0.35) { const [px, pz] = at((R() - 0.5) * 3, 0); put("woodpile", BOX_G, MAT.woodpile, px, groundH(px, pz), pz, 1.6, 0.9, 0.6, ry); }
  else if (r < 0.55) { const [px, pz] = at((R() - 0.5) * 3, 0); put("barrel", CYL_G, MAT.wood, px, groundH(px, pz), pz, 0.6, 0.85, 0.6); }
  else if (r < 0.68) { const [px, pz] = at((R() - 0.5) * 3, 1); put("well", CYL_G, MAT.wattle, px, groundH(px, pz), pz, 1.2, 0.7, 1.2); put("wellpost", BOX_G, MAT.wood, px + 0.5, groundH(px, pz), pz, 0.12, 1.6, 0.12); put("wellpost", BOX_G, MAT.wood, px - 0.5, groundH(px, pz), pz, 0.12, 1.6, 0.12); put("wellbar", BOX_G, MAT.wood, px, groundH(px, pz) + 1.55, pz, 1.2, 0.1, 0.1); }
  else if (r < 0.78) { const [px, pz] = at((R() - 0.5) * 3, 2); put("stack", new THREE.ConeGeometry(0.5, 1, 10).translate(0, 0.5, 0), MAT.thatch, px, groundH(px, pz), pz, 2.2, 2.4, 2.2); } }
// one side of a street: plots one after another, gable-end on or broadside, set back a little; a back building on some
function lineStreet(S, dens, opts = {}) { const R = seeded(S.name.length * 977 + (opts.seed || 0));
  for (const sg of opts.sides || [-1, 1]) { let s = R() * 4;
    while (s < S.L.L) { const [px, pz, a] = S.L.at(s), front = 4.5 + R() * 3.5, tx = Math.sin(a), tz = Math.cos(a), nx = tz * sg, nz = -tx * sg; s += front + 0.4 + R() * 2.5;
      const D = typeof dens === "function" ? dens(px, pz) : dens; if (R() > D) { s += R() * 6; continue; }
      const gableOn = R() < 0.62, deep = 6 + R() * 6, back = S.w / 2 + 0.5 + R() * 2.5;
      const hw = gableOn ? front : deep * 0.75, hd = gableOn ? deep : front, hry = gableOn ? Math.atan2(nx, nz) : Math.atan2(tx, tz), along = gableOn ? deep : hw;   // gable-on: ridge away from the street; broadside: along it
      const cx = px + nx * (back + along / 2), cz = pz + nz * (back + along / 2);
      if (baseH(cx, cz) < 1.0 || baseH(cx + nx * along / 2, cz + nz * along / 2) < 0.9) continue;
      if (!rRect(cx, cz, hw + 1.2, hd + 1.2, hry, 0, true)) continue;
      const H = addHouse(cx, cz, hw, hd, hry, { burnt: opts.burnt && R() < 0.8, door: gableOn ? "-z" : sg > 0 ? "-x" : "+x", kind: opts.kind });
      rRect(cx, cz, hw + 0.4, hd + 0.4, hry, 2);
      const yx = cx + nx * (along / 2 + 7), yz = cz + nz * (along / 2 + 7); rRect(yx, yz, front + 0.5, 13, Math.atan2(nx, nz), 3);   // the yard behind
      if (opts.yards !== false && R() < 0.35) { const bx = cx + nx * (along / 2 + 9 + R() * 4), bz = cz + nz * (along / 2 + 9 + R() * 4), bw = 3.5 + R() * 2, bd = 5 + R() * 3;
        if (baseH(bx, bz) > 1 && rRect(bx, bz, bw + 1, bd + 1, Math.atan2(nx, nz), 0, true)) { const B = addHouse(bx, bz, bw, bd, Math.atan2(nx, nz) + Math.PI, { burnt: opts.burnt && R() < 0.8, door: "+z", kind: opts.kind }); rRect(bx, bz, bw, bd, B.ry, 2); } }
      if (opts.yards !== false && R() < 0.5) { const fx = cx + nx * (along / 2 + 7) + tx * (front / 2 + 0.3), fz = cz + nz * (along / 2 + 7) + tz * (front / 2 + 0.3);   // a wattle fence between plots
        put("fence", BOX_G, MAT.wattle, fx, groundH(fx, fz) - 0.15, fz, 0.1, 1.25, 13, Math.atan2(nx, nz)); }
      if (opts.yards !== false && !opts.burnt) yardThings(yx, yz, Math.atan2(nx, nz), R);
    } } }

// ---------- churches ----------
// London had perhaps 30-50 parish churches by 1066 (more were founded soon after); a few are known from excavation or documents.
// The typical Late Saxon parish church was small, of two cells: a nave about 6-8 m by 12-18 m and a smaller square chancel,
// in stone rubble or timber. All Hallows by the Tower keeps a 7th-century arch; St Bride's was excavated after the Blitz.
const CHURCHES = [];
function addChurch(x, z, o = {}) { const nw = o.nw || 6.5, nl = o.nl || 14, cw = o.cw || 4.5, cl = o.cl || 5, wh = o.wh || 5.5, mat = o.mat || "rag", roof = o.roof || "shingle";
  gChurch(x, z, { nl, nw, cl, cw, wh, mat, roof }); const cx = x + nl / 2 + cl / 2;
  solid(x, z, nl, nw, 0); solid(cx, z, cl, cw, 0); rRect(x + 3, z, nl + cl + 18, nw + 16, 0, 4);
  const C = { x, z, nl, ...o }; CHURCHES.push(C); return C; }

// ---------- the Roman wall and its gates ----------
// About 3.2 km round the landward side, 2.5 m thick and about 6 m high, of Kentish ragstone with bonding courses of tile, with a ditch.
// Gates: Ludgate, Newgate, Aldersgate, Cripplegate (the old fort's north gate), Bishopsgate and Aldgate. Moorgate is medieval, later.
// The gates' 11th-century form is not known; they are shown as simple towered arches on their Roman footprints.
{ for (const [ax, az, bx, bz] of WALL.S) { const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 4)), ry = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n;
      if (GATES.some(G => Math.hypot(G.x - x, G.z - z) < 4.6)) continue;
      const gy = groundH(x, z); put("w:rag", BOX_G, MAT.rag, x, gy - 1.5, z, 2.6, 7.5, len / n + 0.05, ry); put("w:rag", BOX_G, MAT.rag, x, gy + 6, z, 3.0, 0.3, len / n + 0.05, ry);
      solid(x, z, 2.6, len / n + 0.2, ry); } }
  for (const [ax, az, bx, bz] of WALL.S) { const L = { S: [[ax, az, bx, bz]] }; rLine(L, 3, 7); }
  for (const G of GATES) { let best = 1e9, dir = 0; for (const [ax, az, bx, bz] of WALL.S) { const t = clampN(((G.x - ax) * (bx - ax) + (G.z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2), 0, 1), d = Math.hypot(ax + t * (bx - ax) - G.x, az + t * (bz - az) - G.z); if (d < best) { best = d; dir = Math.atan2(bx - ax, bz - az); } }
    G.ry = dir; const tx = Math.sin(dir), tz = Math.cos(dir), gy = groundH(G.x, G.z);
    for (const sg of [-1, 1]) { const x = G.x + tx * 4.6 * sg, z = G.z + tz * 4.6 * sg; put("w:rag", BOX_G, MAT.rag, x, gy - 1, z, 5.2, 10, 5.2, dir); solid(x, z, 5.2, 5.2, dir); }
    put("w:rag", BOX_G, MAT.rag, G.x, gy + 4.6, G.z, 4.2, 4.4, 4.2, dir); put("door", PLANE_G, MAT.dark, G.x, gy + 3.6, G.z, 4.0, 1.0, 1, dir + Math.PI / 2); } }
// the riverside wall, built late in the Roman period; by 1066 only broken stretches stood along the waterfront
{ const R = seeded(31); for (let lon = -0.1020; lon < -0.0780; lon += 0.0011) { if (R() < 0.45) continue; const lat = 51.5097 + (lon + 0.1025) * -0.09, [x, z] = LL(lat, lon), [x2, z2] = LL(lat - 0.0011 * 0.09, lon + 0.0011);
    let k = 0, px = x, pz = z; while (THAMES.side(px, pz) > -RIVER_HW - 6 && k++ < 40) pz -= 2;   // keep it on the bank's edge
    const gy = groundH(px, pz), len = Math.hypot(x2 - x, z2 - z) * (0.4 + R() * 0.5), ry = Math.atan2(x2 - x, z2 - z); if (rGet(px, pz) === 1 || gy < 0.5) continue;
    put("w:rag", BOX_G, MAT.rag, px, gy - 0.6, pz, 2.2, 1 + R() * 2.8, len, ry); solid(px, pz, 2.2, len, ry); } }

// ---------- bridges ----------
// London Bridge was timber, rebuilt several times; dendro-dated timbers from Fennings Wharf on the Southwark side date to about 987-1032.
// Roughly 300 m of trestles carrying a plank deck about 4-6 m wide, with no houses on it (those came with the stone bridge after 1176).
const SPANS = [{ L: BRIDGE, y: BRIDGE_Y, hw: 2.6, name: "London Bridge" }, { L: line([[51.5140, -0.1036], [51.5140, -0.1053]]), y: 4.5, hw: 2.8, name: "Fleet Bridge" },
  { L: line([[51.5028, -0.1266], [51.5017, -0.1266]]), y: 2.4, hw: 2, name: "the bridge over the Tyburn" }];
for (const B of SPANS) { const [ax, az, bx, bz] = [B.L.P[0][0], B.L.P[0][1], B.L.P[1][0], B.L.P[1][1]], len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az), n = Math.ceil(len / 6);
  for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n; put("deck", BOX_G, MAT.wood, x, B.y - 0.35, z, B.hw * 2, 0.35, len / n + 0.05, ry);
    for (const sg of [-1, 1]) { const ox = Math.cos(ry) * B.hw * sg, oz = -Math.sin(ry) * B.hw * sg; put("rail", BOX_G, MAT.wood, x + ox, B.y + 0.9, z + oz, 0.12, 0.12, len / n + 0.05, ry); put("rail", BOX_G, MAT.wood, x + ox, B.y, z + oz, 0.14, 1.0, 0.14, ry);
      const gy = baseH(x + ox, z + oz); if (gy < B.y - 0.5) put("pile", CYL_G, MAT.wood, x + ox * 0.9, Math.min(gy, -3) - 1, z + oz * 0.9, 0.38, B.y - Math.min(gy, -3) + 0.6, 0.38); } } }
function spanY(x, z) { for (const B of SPANS) { if (!B.L.near(x, z, B.hw + 20)) continue; const [ax, az, bx, bz] = B.L.S[0], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = ((x - ax) * dx + (z - az) * dz) / l2, len = Math.sqrt(l2);
  const px = ax + clampN(t, 0, 1) * dx, pz = az + clampN(t, 0, 1) * dz; if (Math.hypot(x - px, z - pz) > B.hw) continue; const out = t < 0 ? -t * len : t > 1 ? (t - 1) * len : 0; if (out > 12) continue; return B.y - out * 0.2; } return -1e9; }

// ---------- boats at the hithes ----------
// Queenhithe (Æthelred's hithe) and Billingsgate were the trading shores, where boats were run up on the foreshore against timber
// revetments. Craft in the London waterfront finds are clinker-built in the Scandinavian manner; a few seagoing ships, many small boats.
function boatGeo(L, B, D) { const NU = 12, NV = 6, pos = [], idx = [];
  for (let i = 0; i <= NU; i++) { const u = i / NU, z = (u - 0.5) * L, tp = 1 - Math.pow(Math.abs(u - 0.5) * 2, 2.2), sheer = D * 0.35 * Math.pow(Math.abs(u - 0.5) * 2, 3);
    for (let j = 0; j <= NV; j++) { const v = j / NV, a = Math.PI * v; pos.push(Math.cos(a) * B / 2 * Math.max(0.04, tp), D - Math.sin(a) * D * Math.max(0.25, Math.sqrt(tp)) + sheer, z); } }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; }
const BOAT_G = boatGeo(1, 1, 1);
const BOATS = [];
function addBoat(x, z, ry, len, ship) { const gy = Math.max(WATER - 0.35, groundH(x, z) - 0.1), B = len * (ship ? 0.22 : 0.3), D = ship ? 1.6 : 0.8;
  put("boat", BOAT_G, MAT.tar, x, gy, z, B, D, len, ry); if (ship) { put("mast", CYL_G, MAT.wood, x, gy + 0.3, z, 0.22, len * 0.55, 0.22); put("yard", BOX_G, MAT.wood, x, gy + len * 0.5, z, len * 0.5, 0.18, 0.18, ry + Math.PI / 2); }
  BOATS.push({ x, z, ry, len, ship }); }

// ---------- Westminster Abbey, Edward the Confessor's church ----------
// Known from excavated foundations under the present church, the Bayeux Tapestry's picture of it, and the description in the Life of
// King Edward (about 1067); reconstructed by Richard Gem and Eric Fernie. A Romanesque church in the new Norman manner, the first in
// England, modelled on Jumièges: cruciform, about 98 m long when finished, an aisled nave of 12 bays with alternating piers, arcade,
// gallery and clerestory, transepts, a crossing tower, an apsidal east end, and (later) two western towers; Caen and Reigate stone.
// Consecrated on 28 December 1065. The east end, crossing and transepts were finished by then; most historians think the nave was
// completed only in the 1080s or later, so here its western half is still being built, closed off by a temporary timber wall.
// Its axis runs east-west; x here is metres east of the centre of the crossing.
const AB_Y = groundH(0, 0) + 0.05, AB_F = AB_Y + 0.2;   // the floor
const NAVE_W = -62, NAVE_DONE = -33.5, CHOIR_E = 25, BAY = 4.75;
const abT = ashlarT.clone(); abT.repeat.set(1 / 5.6, 1 / 5.6); abT.needsUpdate = true;
const pnT = plankT.clone(); pnT.repeat.set(1 / 4, 1 / 2); pnT.needsUpdate = true;
const ceilT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6a4a30"; g.fillRect(0, 0, w, h);   // a flat boarded ceiling, painted (as at Peterborough later): form and colours inferred
  for (let x = 0; x < w; x += 32) { g.fillStyle = "#4a3020"; g.fillRect(x, 0, 3, h); } g.strokeStyle = "#a8803a"; g.lineWidth = 3;
  for (let y = 16; y < h; y += 64) for (let x = 16; x < w; x += 64) { g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 16); g.lineTo(x + 16, y + 32); g.lineTo(x, y + 16); g.closePath(); g.stroke(); }
  g.fillStyle = "#8a2a20"; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 4); });
ceilT.repeat.set(1 / 4, 1 / 4);
const AMAT = { ashlar: new THREE.MeshStandardMaterial({ map: abT, roughness: 0.85 }), plank: new THREE.MeshStandardMaterial({ map: pnT, roughness: 0.9 }), ceil: new THREE.MeshStandardMaterial({ map: ceilT, roughness: 0.9 }),
  floor: new THREE.MeshStandardMaterial({ map: tex(256, 256, (g, w, h) => { speckle("#a8a090", 2000, ["#b8b0a0", "#989080", "#a09888"])(g, w, h); g.fillStyle = "rgba(70,60,50,.5)"; for (let k = 0; k < w; k += 64) { g.fillRect(k, 0, 2, h); g.fillRect(0, k, w, 2); } }, [1, 1]), roughness: 0.8 }),
  glow: new THREE.MeshBasicMaterial({ color: 0x9aa4ae, side: THREE.DoubleSide, toneMapped: true }), dark: MAT.dark, red: M(0x8a1a1a), gold: M(0xc8a040, { metalness: 0.7, roughness: 0.35 }), wood: M(0x4e3a28), cloth: M(0xe8e0c8) };
AMAT.floor.map.repeat.set(1 / 3, 1 / 3);
const AG = {}; for (const k in AMAT) AG[k] = [];
// a box with its texture laid at real size (1 unit of texture = 1 m), base at y
function slab(mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, coll = false) { const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv;
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]]; for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  const m = new THREE.Matrix4().compose(V3(x, y + sy / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), V3(1, 1, 1)); AG[mat].push([g, m]);
  if (coll) solid(x, z, sx, sz, ry); }
function shapeG(mat, shape, depth, x, y, z, ry) { const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth / 2);
  AG[mat].push([g, new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1))]); }
function flushAG() { for (const k in AG) if (AG[k].length) { const m = new THREE.Mesh(mergeUV(AG[k]), AMAT[k]); m.frustumCulled = false; scene.add(m); AG[k].length = 0; } }
function mergeUV(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g).applyMatrix4(m); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const q of gs) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); if (q.attributes.uv) uv.set(q.attributes.uv.array, o * 2); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return out; }
// the panel above an arch: a rectangle w wide from y0 to y1 with a round-headed opening `open` wide springing at ys
function archPanel(w, y0, y1, open, ys) { const s = new THREE.Shape(), r = open / 2; s.moveTo(-w / 2, y0); s.lineTo(-r, y0); s.lineTo(-r, ys); s.absarc(0, ys, r, Math.PI, 0, true); s.lineTo(r, y0); s.lineTo(w / 2, y0); s.lineTo(w / 2, y1); s.lineTo(-w / 2, y1); s.closePath(); return s; }
function windowPanel(w, y0, y1, open, ys, yb) { const s = new THREE.Shape(); s.moveTo(-w / 2, y0); s.lineTo(w / 2, y0); s.lineTo(w / 2, y1); s.lineTo(-w / 2, y1); s.closePath();
  const h = new THREE.Path(), r = open / 2; h.moveTo(-r, yb); h.lineTo(r, yb); h.lineTo(r, ys); h.absarc(0, ys, r, 0, Math.PI, false); h.lineTo(-r, yb); s.holes.push(h); return s; }
// a window: a dark opening outside, pale daylight inside; nrm is the outward direction (+1/-1) along `axis`
function windowAt(x, y, z, w, h, axis, nrm, th) { const ry = axis === "z" ? (nrm > 0 ? 0 : Math.PI) : (nrm > 0 ? Math.PI / 2 : -Math.PI / 2);
  const ox = axis === "x" ? nrm * (th / 2 + 0.02) : 0, oz = axis === "z" ? nrm * (th / 2 + 0.02) : 0;
  const pl = (mat, sx, sz, r) => { const g = new THREE.PlaneGeometry(w, h); AG[mat].push([g, new THREE.Matrix4().compose(V3(x + sx, y + h / 2, z + sz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r, 0)), V3(1, 1, 1))]); };
  pl("dark", ox, oz, ry); pl("glow", -ox, -oz, ry + Math.PI); }
// walls with gaps for doors: along x at z (th thick) or along z at x
function wallX(x0, x1, z, th, y0, h, gaps = [], mat = "ashlar") { let a = x0; for (const [g0, g1, gh] of [...gaps, [x1, x1, 0]]) { if (g0 > a) slab(mat, (a + g0) / 2, y0, z, g0 - a, h, th, 0, 0, true); if (g1 > g0) slab(mat, (g0 + g1) / 2, y0 + gh, z, g1 - g0, h - gh, th); a = g1; } }
function wallZ(z0, z1, x, th, y0, h, gaps = [], mat = "ashlar") { let a = z0; for (const [g0, g1, gh] of [...gaps, [z1, z1, 0]]) { if (g0 > a) slab(mat, x, y0, (a + g0) / 2, th, h, g0 - a, 0, 0, true); if (g1 > g0) slab(mat, x, y0 + gh, (g0 + g1) / 2, th, h - gh, g1 - g0); a = g1; } }
{ const Y = AB_Y, TH = 1.4, ZA = 10.5;   // outer aisle walls at z = +-10.5 (centre line)
  // the floor
  slab("floor", (NAVE_DONE + CHOIR_E) / 2, Y, 0, CHOIR_E - NAVE_DONE, 0.2, ZA * 2 + TH); slab("floor", 0, Y, 0, 12.8, 0.2, 55.4); slab("floor", (NAVE_W + NAVE_DONE) / 2, Y - 0.1, 0, NAVE_DONE - NAVE_W, 0.2, ZA * 2 + TH);
  // the nave: arcade, gallery and clerestory, bay by bay; piers alternate between compound piers with a shaft running up the wall and round columns
  const arcade = archPanel(BAY, 5.4, 8, BAY - 1.7, 5.4), gallery = windowPanel(BAY, 8, 13, BAY - 2.0, 11.0, 8.9), clere = windowPanel(BAY, 13, 19, 1.2, 16.8, 15.0);
  const halfArc = archPanel(BAY, 5.4, 8, BAY - 1.7, 5.4);
  for (let k = 0; k < 12; k++) { const xc = -5 - BAY * (k + 0.5), done = xc > NAVE_DONE, built = done ? 3 : k < 9 ? 2 : k < 11 ? 1 : 0.6;   // the western bays: arcades up, galleries begun, no clerestory or roof
    for (const zs of [-5, 5]) { if (built >= 1) shapeG("ashlar", arcade, 1.4, xc, Y, zs, 0); if (built >= 2) shapeG("ashlar", gallery, 1.4, xc, Y, zs, 0); if (built >= 3) shapeG("ashlar", clere, 1.4, xc, Y, zs, 0);
      if (built >= 3) windowAt(xc, Y + 15, zs, 1.1, 2.6, "z", Math.sign(zs), 1.4);
      const px = -5 - BAY * (k + 1); if (k < 11) { const major = k % 2 === 1, ph = built >= 3 ? 19 : built >= 2 ? 13 : built >= 1 ? 8 : 4;
        if (major) { slab("ashlar", px, Y, zs, 1.7, built >= 1 ? 5.4 : ph, 1.7, 0, 0, true); const g = new THREE.CylinderGeometry(0.32, 0.32, ph, 10); AG.ashlar.push([g, new THREE.Matrix4().makeTranslation(px, Y + ph / 2, zs - Math.sign(zs) * 0.95)]); }
        else { const g = new THREE.CylinderGeometry(0.8, 0.8, 5.4, 14); AG.ashlar.push([g, new THREE.Matrix4().makeTranslation(px, Y + 2.7, zs)]); solid(px, zs, 1.5, 1.5, 0); if (built >= 2) slab("ashlar", px, Y + 5.4, zs, 1.7, ph - 5.4, 1.4); } } }
    // outer aisle walls with a window in each bay below and in the gallery
    const ah = done ? 12.5 : [9, 8, 7, 6, 4.5, 3][k - 6];
    for (const zs of [-1, 1]) { slab("ashlar", xc, Y, ZA * zs, BAY + 0.02, ah, TH, 0, 0, true); if (done || ah > 6) windowAt(xc, Y + 3.2, ZA * zs, 1.1, 2.3, "z", zs, TH); if (done) windowAt(xc, Y + 9.4, ZA * zs, 1.1, 2.0, "z", zs, TH);
      if (done) { slab("plank", xc, Y + 7.9, 7.85 * zs, BAY + 0.02, 0.15, 4.9); slab("plank", xc, Y + 12.4, 8.05 * zs, BAY + 0.02, 0.25, 6.6, 0, zs * 0.36); } } }   // aisle ceiling (the gallery floor) and the lean-to roof over the gallery
  slab("ceil", (NAVE_DONE - 5) / 2, Y + 19, 0, -5 - NAVE_DONE, 0.25, 11.4);   // the nave's flat boarded ceiling
  // the temporary west wall of timber, across the unfinished nave, with its door
  wallZ(-11.2, 11.2, NAVE_DONE - 0.3, 0.3, Y, 19, [[-1.6, 1.6, 3.6]], "plank");
  // the western end as laid out: the west wall's footings
  slab("ashlar", NAVE_W, Y - 0.5, 0, 1.6, 2.2, ZA * 2 + TH, 0, 0, true);
  // the crossing: four great piers and four arches, the tower above
  for (const [px, pz] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) slab("ashlar", px, Y, pz, 2.4, 19, 2.4, 0, 0, true);
  const cross = archPanel(10, 13, 19, 7.6, 13); for (const [x, z, ry] of [[-5, 0, Math.PI / 2], [5, 0, Math.PI / 2], [0, -5, 0], [0, 5, 0]]) shapeG("ashlar", cross, 2.0, x, Y, z, ry);
  slab("ceil", 0, Y + 19, 0, 10, 0.25, 10);
  // the transepts: north and south arms, with the north door (the main way in while the nave is building) and the south door to the cloister
  for (const zs of [-1, 1]) { const z0 = zs < 0 ? -27.7 : ZA + 0.7, z1 = zs < 0 ? -ZA - 0.7 : 27.7; wallZ(z0, z1, -5.7, TH, Y, 19); wallZ(z0, z1, 5.7, TH, Y, 19);
    wallX(-6.4, 6.4, 27 * zs, TH, Y, 19, zs < 0 ? [[-1.7, 1.7, 4.2]] : []);
    for (const zz of [14, 19.5, 24]) { windowAt(-5.7, Y + 4, zz * zs, 1.1, 2.6, "x", -1, TH); windowAt(5.7, Y + 4, zz * zs, 1.1, 2.6, "x", 1, TH); windowAt(-5.7, Y + 14.5, zz * zs, 1.2, 2.8, "x", -1, TH); windowAt(5.7, Y + 14.5, zz * zs, 1.2, 2.8, "x", 1, TH); }
    for (const xx of [-2.6, 2.6]) windowAt(xx, Y + 12, 27 * zs, 1.2, 3.2, "z", zs, TH); windowAt(0, Y + 15.5, 27 * zs, 1.4, 2.6, "z", zs, TH);
    slab("ceil", 0, Y + 19, (5 + 27) / 2 * zs, 11.4, 0.25, 22); }
  // the choir and presbytery: four bays east of the crossing, aisled, then the apse
  const arcC = archPanel(5, 5.4, 8, 3.3, 5.4), galC = windowPanel(5, 8, 13, 3.0, 11, 8.9), clC = windowPanel(5, 13, 19, 1.2, 16.8, 15);
  for (let k = 0; k < 4; k++) { const xc = 5 + 5 * (k + 0.5); for (const zs of [-5, 5]) { shapeG("ashlar", arcC, 1.4, xc, Y, zs, 0); shapeG("ashlar", galC, 1.4, xc, Y, zs, 0); shapeG("ashlar", clC, 1.4, xc, Y, zs, 0); windowAt(xc, Y + 15, zs, 1.1, 2.6, "z", Math.sign(zs), 1.4);
      if (k < 3) { slab("ashlar", 5 + 5 * (k + 1), Y, zs, 1.7, 5.4, 1.7, 0, 0, true); } }
    for (const zs of [-1, 1]) { slab("ashlar", xc, Y, ZA * zs, 5.02, 12.5, TH, 0, 0, true); windowAt(xc, Y + 3.2, ZA * zs, 1.1, 2.3, "z", zs, TH); windowAt(xc, Y + 9.4, ZA * zs, 1.1, 2.0, "z", zs, TH);
      slab("plank", xc, Y + 7.9, 7.85 * zs, 5.02, 0.15, 4.9); slab("plank", xc, Y + 12.4, 8.05 * zs, 5.02, 0.25, 6.6, 0, zs * 0.36); } }
  slab("ceil", 15, Y + 19, 0, 20, 0.25, 11.4);
  for (const zs of [-1, 1]) slab("ashlar", CHOIR_E + 0.7, Y, 7.85 * zs, TH, 12.5, 6.7, 0, 0, true);   // the aisles' east walls
  // the apse: a half-round wall, three windows, a half-cone roof
  for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k + 0.5) / 9 * Math.PI, x = CHOIR_E + Math.cos(a) * 5.7, z = Math.sin(a) * 5.7; slab("ashlar", x, Y, z, TH, 19, 2.05, -a, 0, true);
    if (k >= 3 && k <= 5) { const g = new THREE.PlaneGeometry(1.1, 2.8), m = new THREE.Matrix4().compose(V3(x - Math.cos(a) * 0.72, Y + 9, z - Math.sin(a) * 0.72), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a - Math.PI / 2, 0)), V3(1, 1, 1)); AG.glow.push([g, m]);
      const m2 = new THREE.Matrix4().compose(V3(x + Math.cos(a) * 0.72, Y + 9, z + Math.sin(a) * 0.72), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)), V3(1, 1, 1)); AG.dark.push([g.clone(), m2]); } }
  { const g = new THREE.CircleGeometry(5.7, 12, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2); AG.ceil.push([g, new THREE.Matrix4().makeTranslation(CHOIR_E, Y + 18.9, 0)]); }
  { const g = new THREE.CylinderGeometry(5.7, 5.7, 0.2, 12, 1, false, 0, Math.PI); AG.floor.push([g, new THREE.Matrix4().makeTranslation(CHOIR_E, Y + 0.1, 0)]); }
  // the choir: monks' stalls under the crossing and in the first bays of the nave; the high altar; King Edward's tomb before it
  for (const zs of [-1, 1]) { slab("wood", -6, Y + 0.2, 3.6 * zs, 16, 0.5, 0.5, 0, 0, true); slab("wood", -6, Y + 0.2, 4.2 * zs, 16, 2.4, 0.15); slab("wood", -6, Y + 0.2, 2.6 * zs, 16, 0.9, 0.4); }
  slab("ashlar", 17.5, Y + 0.2, 0, 4, 0.35, 6); slab("ashlar", 18.5, Y + 0.55, 0, 1.2, 1.0, 2.6); slab("red", 18.5, Y + 1.55, 0, 1.3, 0.05, 2.7); slab("red", 17.88, Y + 0.85, 0, 0.04, 0.7, 2.7);
  slab("gold", 18.8, Y + 1.6, 0, 0.08, 0.9, 0.08); slab("gold", 18.8, Y + 2.2, 0, 0.08, 0.08, 0.5);
  for (const zs of [-1, 1]) { slab("gold", 18.6, Y + 1.6, 1.05 * zs, 0.1, 0.45, 0.1); }
  slab("ashlar", 13.8, Y + 0.2, 0, 2.4, 0.45, 1.1, 0, 0, true);   // Edward's tomb: a plain raised slab (his shrine came in 1163)
  // the throne for the enthronement, set at the crossing, facing west: placing inferred
  slab("ashlar", 3, Y + 0.2, 0, 3, 0.5, 4); slab("wood", 3.4, Y + 0.7, 0, 0.8, 0.5, 0.9); slab("wood", 3.85, Y + 0.7, 0, 0.12, 1.6, 0.9); slab("red", 3.4, Y + 1.21, 0, 0.8, 0.06, 0.9);
  // exterior roofs and the crossing tower
  put("r:lead", GABLE_G, MAT.lead, (NAVE_DONE - 5) / 2, Y + 19, 0, 12.8, 6.5, -5 - NAVE_DONE + 0.4, Math.PI / 2); put("r:lead", GABLE_G, MAT.lead, 15, Y + 19, 0, 12.8, 6.5, 20.4, Math.PI / 2);
  for (const zs of [-1, 1]) put("r:lead", GABLE_G, MAT.lead, 0, Y + 19, 16.7 * zs, 12.8, 6.5, 22.4, 0);
  { const g = new THREE.ConeGeometry(6.4, 6.5, 12, 1, true, 0, Math.PI); put("apseroof", g, new THREE.MeshStandardMaterial({ map: leadT, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }), CHOIR_E, Y + 19 + 3.25, 0, 1, 1, 1, 0); }
  slab("ashlar", 0, Y + 19, 0, 12.6, 17, 12.6); for (const [x, z, a] of [[6.32, 0, 0], [-6.32, 0, 0], [0, 6.32, 1], [0, -6.32, 1]]) for (const o of [-2.4, 0, 2.4]) slab("dark", x + (a ? o : 0), Y + 30, z + (a ? 0 : o), a ? 1.0 : 0.05, 3.2, a ? 0.05 : 1.0);
  put("cap", CONE4_G, MAT.lead, 0, Y + 36, 0, 13.2, 4.5, 13.2); put("vane", CYL_G, MAT.iron, 0, Y + 40.5, 0, 0.1, 2.4, 0.1);
  put("vane", BOX_G, new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.8, roughness: 0.3 }), 0, Y + 42.4, 0, 1.2, 0.7, 0.12);   // the weathercock: in the Bayeux Tapestry a man is fixing it to the new church
  // scaffolding and stone at the unfinished west end: putlog scaffolds of poles lashed together, and a hoist
  { const R = seeded(5); for (let k = 6; k < 12; k++) { const xc = -5 - BAY * (k + 0.5); for (const zs of [-1, 1]) for (const zo of [9.2, 12.0]) { const z = zo * zs;
      for (const xo of [-BAY / 2 + 0.3, BAY / 2 - 0.3]) put("pole", CYL_G, MAT.wood, xc + xo, Y, z, 0.16, 11 - (k - 6), 0.16);
      for (let h = 2; h < 10 - (k - 6); h += 2) put("pole", BOX_G, MAT.wood, xc, Y + h, z, BAY, 0.12, 0.12); }
      for (const zs of [-1, 1]) for (let h = 2; h < 10 - (k - 6); h += 2) put("plankS", BOX_G, MAT.wood, xc, Y + h + 0.1, 10.6 * zs, BAY, 0.08, 2.4);
      for (let n = 0; n < 5; n++) { const x = xc + (R() - 0.5) * 3, z = (R() - 0.5) * 7; put("block", BOX_G, AMAT.ashlar, x, Y - 0.1, z, 0.6 + R() * 0.3, 0.4, 0.4 + R() * 0.3, R()); } }
    put("pole", CYL_G, MAT.wood, -50, Y, 0, 0.3, 12, 0.3); put("pole", BOX_G, MAT.wood, -48, Y + 12, 0, 5, 0.25, 0.25); put("pole", CYL_G, MAT.wood, -46, Y, 0, 0.06, 12, 0.06); }
  flushAG(); rRect(-20, 30, 160, 140, 0, 4);
}
function inAbbey(x, z) { return (x > NAVE_DONE && x < CHOIR_E && Math.abs(z) < 11.2) || (Math.abs(x) < 6.4 && Math.abs(z) < 27.7) || (x >= CHOIR_E && Math.hypot(x - CHOIR_E, z) < 5.7); }
// lamps: candles on the altar and lamps hung in the crossing
const flameM = new THREE.MeshBasicMaterial({ color: 0xffb050, toneMapped: false }), FLAME_G = new THREE.ConeGeometry(0.03, 0.12, 5).translate(0, 0.06, 0);
for (const zs of [-1, 1]) put("flame", FLAME_G, flameM, 18.6, AB_Y + 2.05, 1.05 * zs, 1, 1, 1);
for (const [x, z] of [[0, 0], [-12, 0], [-22, 0], [12, 0], [0, -16], [0, 16]]) { put("corona", new THREE.TorusGeometry(0.9, 0.04, 4, 16).rotateX(Math.PI / 2), MAT.iron, x, AB_Y + 6, z, 1, 1, 1); put("chain", CYL_G, MAT.iron, x, AB_Y + 6, z, 0.03, 13, 0.03);
  for (let k = 0; k < 6; k++) put("flame", FLAME_G, flameM, x + Math.cos(k) * 0.9, AB_Y + 6.03, z + Math.sin(k) * 0.9, 1.5, 1.5, 1.5); }
const abbeyLight = new THREE.PointLight(0xffd0a0, 0, 70, 1.0); abbeyLight.position.set(2, AB_Y + 9, 0); scene.add(abbeyLight);

// ---------- around the abbey: the monastery, the palace, the wharf ----------
// The monastery lay south of the church round a cloister. Edward's monks had new buildings under way (parts of the dormitory undercroft
// of about 1070-1100 survive); the older buildings were timber. Layout and appearance here are inferred.
{ const Y = AB_Y; wallX(-33, -6.4, 41, 1.0, Y, 4, [], "ashlar"); slab("plank", -19.7, Y + 4, 41, 26.6, 4, 9);
  put("r:shingle", GABLE_G, MAT.shingle, -19.7, Y + 8, 41, 10, 4, 27, Math.PI / 2); solid(-19.7, 41, 26.6, 9, 0);   // the refectory
  slab("ashlar", 0, Y, 46, 10, 4.5, 36, 0, 0, true); slab("plank", 0, Y + 4.5, 46, 10, 3, 36); put("r:shingle", GABLE_G, MAT.shingle, 0, Y + 7.5, 46, 11, 4.5, 37, 0);   // the dormitory over its stone undercroft
  for (let z = 30; z < 64; z += 3) put("pole", CYL_G, MAT.wood, 5.6, Y, z, 0.14, 9, 0.14);
  slab("plank", -36, Y, 26, 7, 4, 30, 0, 0, true); put("r:thatch", GABLE_G, MAT.thatch, -36, Y + 4, 26, 8, 3.5, 31, 0);   // the west range: stores and guest rooms, timber
  for (const [x, z, w, d] of [[-19.7, 13.4, 26.6, 2.6], [-19.7, 34.4, 26.6, 2.6], [-31.4, 23.9, 2.6, 18.4], [-8, 23.9, 2.6, 18.4]]) { slab("wood", x, Y + 2.6, z, w, 0.15, d); }   // the cloister walks' pentice roofs
}
flushAG();
// Edward's palace stood by the river east of the abbey (its buildings: see the palace section); a palisade round it.
const PALACE = LL(51.4990, -0.1250);
rRect(PALACE[0] + 5, PALACE[1], 80, 60, 0, 4);
{ const R = seeded(61); for (let a = 0; a < Math.PI * 2; a += 0.06) { const x = PALACE[0] + 5 + Math.cos(a) * 42, z = PALACE[1] + Math.sin(a) * 32; if (Math.abs(a - Math.PI) < 0.12) continue; put("pale", BOX_G, MAT.paleWood || (MAT.paleWood = M(0x8a7a64)), x, groundH(x, z) - 0.2, z, 0.25, 2.4, 2.4, -a); solid(x, z, 0.3, 2.4, -a); } }
// the wharf on the Thames side of Thorney, where barges brought Caen stone, shipped across the Channel and up the river
{ const [wx, wz] = LL(51.4993, -0.1243); put("deck", BOX_G, MAT.wood, wx + 18, 0.8, wz, 36, 0.4, 5, 0); for (let k = 0; k < 4; k++) addBoat(wx + 26 + k * 4, wz + (k % 2 ? 6 : -6), Math.PI / 2, 13, k === 0);
  for (let n = 0; n < 14; n++) put("block", BOX_G, AMAT.ashlar, wx + 2 + (n % 3) * 1.1, 1.0, wz - 8 + Math.floor(n / 3) * 1.1, 0.8, 0.5, 0.6, 0); }

// ---------- Edward's palace, which you can walk into ----------
// Nothing of Edward the Confessor's palace survives or has been excavated: it lay under the later Palace of Westminster, between the
// abbey and the river. What is shown is what an English royal residence of the time had, after the excavated royal halls at Cheddar
// (Somerset), Yeavering and Goltho and the written sources: a great aisled timber hall with a central hearth and a dais for the high
// table, walls hung with embroidered hangings (wills of the period bequeath 'hall-hangings'); a two-storey chamber block (the Bayeux
// Tapestry shows Edward dying in an upper room, his body laid out below) with an outside stair; a separate kitchen, for fear of fire.
// Today William is staying here; after the crowning the king and the bishops go back for the coronation feast (customary; this one is
// not described).
const SURF = [];   // raised surfaces you can walk on: stairs, landings, upper floors
const surfRect = (F, x0, x1, z0, z1, y0, y1 = y0, alongZ = true) => SURF.push({ F, x0, x1, z0, z1, y0, y1, alongZ });
function surfAt(x, z) { let best = -1e9; for (const S of SURF) { const dx = x - S.F.x, dz = z - S.F.z, lx = dx * S.F.c - dz * S.F.s, lz = dx * S.F.s + dz * S.F.c;
  if (lx < Math.min(S.x0, S.x1) || lx > Math.max(S.x0, S.x1) || lz < Math.min(S.z0, S.z1) || lz > Math.max(S.z0, S.z1)) continue;
  const f = S.alongZ ? (lz - S.z0) / (S.z1 - S.z0 || 1) : (lx - S.x0) / (S.x1 - S.x0 || 1), h = S.F.gy + S.y0 + (S.y1 - S.y0) * clampN(f, 0, 1); if (h > best) best = h; } return best; }
const ZONES = [];   // rooms: for light and for who you can see
function zoneOf(x, z) { if (inAbbey(x, z)) return "abbey"; for (const Z of ZONES) { const dx = x - Z.F.x, dz = z - Z.F.z, lx = dx * Z.F.c - dz * Z.F.s, lz = dx * Z.F.s + dz * Z.F.c; if (Math.abs(lx) < Z.w / 2 && Math.abs(lz) < Z.d / 2) return Z.name; } return null; }
// walls with doorways, solid both sides; doors = [[side, u (centre along the wall), width, height]]; extra = [y0, y1] spans kept within a door gap
function gWalls(F, mat, w, d, h, th, doors = [], keep = []) { const ry = Math.atan2(F.s, F.c);
  for (const side of ["+x", "-x", "+z", "-z"]) { const onX = side[1] === "x", sg = side[0] === "+" ? 1 : -1, L = onX ? d : w, gaps = doors.filter(D => D[0] === side).sort((a, b) => a[1] - b[1]);
    const seg = (u0, u1, y0, y1) => { if (u1 - u0 < 0.01 || y1 - y0 < 0.01) return; const um = (u0 + u1) / 2, cx = onX ? sg * w / 2 : um, cz = onX ? um : sg * d / 2;
      gbox(F, mat, cx, (y0 + y1) / 2, cz, onX ? th : u1 - u0 + (onX ? 0 : th), y1 - y0, onX ? u1 - u0 + th : th, y0 > 0.1 ? "" : "b");
      if (y0 < 0.1) { const [X, , Z] = gw(F, cx, 0, cz); solid(X, Z, onX ? th : u1 - u0, onX ? u1 - u0 : th, ry); } };
    let a = -L / 2; for (const D of gaps) { seg(a, D[1] - D[2] / 2, 0, h); for (const [y0, y1] of (D[4] || [[D[3], h]])) seg(D[1] - D[2] / 2, D[1] + D[2] / 2, y0, y1); a = D[1] + D[2] / 2; } seg(a, L / 2, 0, h); } }
function gGableBoth(F, mat, w, d, wh, rh) { for (const sz of [-1, 1]) for (const io of [1, -1]) gpoly(F, mat, [[-w / 2, wh, sz * (d / 2 - 0.15 * (io < 0))], [w / 2, wh, sz * (d / 2 - 0.15 * (io < 0))], [0, wh + rh, sz * (d / 2 - 0.15 * (io < 0))]], [[0, wh], [w, wh], [w / 2, wh + rh]], [0, 0, sz * io]); }
const PAL = {}, hearthFireM = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), HFIRE_G = new THREE.ConeGeometry(0.16, 0.55, 6).translate(0, 0.27, 0);
{ // the great hall: 30 x 12 m, aisled, long axis east-west
  const F = FR(PALACE[0], PALACE[1], Math.PI / 2, groundH(PALACE[0], PALACE[1]) - 0.1, "palace"), w = 12, d = 30, wh = 4.2, rh = 6.2; PAL.hall = F;
  ZONES.push({ name: "hall", F, w: w - 0.3, d: d - 0.3, light: [0, 2.5, -2], doors: [[w / 2, -11], [-w / 2, -11]] });
  GTINT = [0.95, 0.92, 0.9]; gWalls(F, "plank", w, d, wh, 0.3, [["+x", -11, 1.8, 2.8], ["-x", -11, 1.8, 2.8]]);
  for (const sx of [-1, 1]) for (let z = -15; z <= 15.01; z += 2.5) gbox(F, "oak", sx * (w / 2 + 0.17), wh / 2, z, 0.14, wh, 0.22, "b");
  gGableBoth(F, "plank", w, d, wh, rh); GTINT = [0.9, 0.9, 0.9]; groof(F, "shingle", w, d, wh, rh, { under: "plank", e: 0.6, t: 0.25 });
  GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let z = -12; z <= 12.01; z += 3) { gbox(F, "oak", sx * 3.5, (wh + 1.6) / 2, z, 0.38, wh + 1.6, 0.38); }   // the aisle posts
  for (let z = -12; z <= 12.01; z += 3) { gbox(F, "oak", 0, wh + 1.6, z, 7.4, 0.3, 0.3, ""); for (const sx of [-1, 1]) gbox(F, "oak", sx * 4.8, wh - 0.05, z, 2.6, 0.25, 0.25, ""); }   // tie-beams over the nave and aisles
  for (const sx of [-1, 1]) gbox(F, "oak", sx * 3.5, wh + 1.6, 0, 0.32, 0.3, 24.5, "");
  gpoly(F, "rush", [[-w / 2, 0.04, -d / 2], [w / 2, 0.04, -d / 2], [w / 2, 0.04, d / 2], [-w / 2, 0.04, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]);   // an earth floor strewn with rushes
  GTINT = [0.8, 0.78, 0.75]; gbox(F, "rubble", 0, 0.1, -2, 1.6, 0.2, 4.2, "b"); GTINT = [0.25, 0.2, 0.18]; gbox(F, "rubble", 0, 0.12, -2, 1.1, 0.16, 3.6, "b");   // the long hearth
  GTINT = [1, 1, 1]; gbox(F, "plank", 0, 0.225, 13, w - 0.3, 0.45, 3.7, "b");   // the dais
  gbox(F, "oak", 0, 0.45 + 0.72, 12.2, 7.2, 0.08, 0.95, ""); GTINT = [1.3, 1.28, 1.2]; gbox(F, "plain", 0, 0.45 + 0.765, 12.2, 7.4, 0.02, 1.05, "b"); GTINT = [1, 1, 1];   // the high table and its cloth
  for (const x of [-3, 3]) gbox(F, "oak", x, 0.45 + 0.36, 12.2, 0.1, 0.72, 0.8, "b");
  gbox(F, "oak", 0, 0.45 + 0.6, 13.6, 0.9, 1.2, 0.7, "b"); gbox(F, "oak", 0, 0.45 + 1.15, 13.95, 0.9, 1.3, 0.12, "b"); GTINT = [1.1, 0.3, 0.3]; gbox(F, "plain", 0, 0.45 + 1.21, 13.55, 0.8, 0.06, 0.6, "b"); GTINT = [1, 1, 1];   // the king's chair
  gbox(F, "oak", 0, 0.45 + 0.23, 13.4, 7, 0.06, 0.45, "b");   // a bench behind the high table for the others
  for (const sx of [-1, 1]) { gbox(F, "oak", sx * 4.7, 0.74, -1, 0.85, 0.06, 18, ""); for (let z = -9; z <= 7.01; z += 4) gbox(F, "oak", sx * 4.7, 0.36, z, 0.6, 0.72, 0.08, "b");   // trestle tables and benches in the aisles
    for (const bx of [3.95, 5.45]) gbox(F, "oak", sx * bx, 0.22, -1, 0.32, 0.44, 18, "b"); }
  for (const sx of [-1, 1]) for (const [z0, z1] of [[-9.6, 14.6]]) { const x = sx * (w / 2 - 0.17); gpoly(F, "hang", [[x, 1.0, z0], [x, 1.0, z1], [x, 3.6, z1], [x, 3.6, z0]], [[0, 0], [z1 - z0, 0], [z1 - z0, 2.6], [0, 2.6]], [-sx, 0, 0]); }   // hangings on the walls
  gpoly(F, "hang", [[-5.6, 1.0, d / 2 - 0.17], [5.6, 1.0, d / 2 - 0.17], [5.6, 3.8, d / 2 - 0.17], [-5.6, 3.8, d / 2 - 0.17]], [[0, 0], [11.2, 0], [11.2, 2.8], [0, 2.8]], [0, 0, -1]);
  for (let k = 0; k < 7; k++) { const [x, , z] = gw(F, (k - 3) * 1.1, 0, 12.0); put("flame", FLAME_G, flameM, x, F.gy + 1.31, z, 1.3, 1.3, 1.3); put("candle", CYL_G, M(0xe8e0c8), x, F.gy + 1.22, z, 0.035, 0.1, 0.035); }
  PAL.hearth = gw(F, 0, 0.2, -2); for (let k = 0; k < 5; k++) { const [x, , z] = gw(F, (k % 2 - 0.5) * 0.4, 0, -3.5 + k * 0.8); put("hfire", HFIRE_G, hearthFireM, x, F.gy + 0.2, z, 1, 0.8 + (k % 3) * 0.25, 1); }
  PAL.northDoor = gw(F, w / 2 + 1.6, 0, -11); PAL.southDoor = gw(F, -w / 2 - 1.6, 0, -11); PAL.inNorth = gw(F, w / 2 - 1.5, 0, -11); PAL.inSouth = gw(F, -w / 2 + 1.5, 0, -11);
  PAL.seat = (lx, lz) => gw(F, lx, 0, lz);
}
{ // the chamber block: two storeys, the king's chamber upstairs, an outside stair on its west side
  const F = FR(PALACE[0] + 23, PALACE[1] - 2, 0, groundH(PALACE[0] + 23, PALACE[1] - 2) - 0.1, "palace"), w = 8, d = 12, h = 6.4, uf = 3.2, rh = 4.6; PAL.chamber = F;
  ZONES.push({ name: "chamber", F, w: w - 0.3, d: d - 0.3, light: [0, uf + 2, 2], light0: [0, 1.6, 2], doors: [[-w / 2, -0.5]] });
  GTINT = [0.92, 0.9, 0.88]; gWalls(F, "plank", w, d, h, 0.3, [["-x", -0.5, 1.2, 2.1, [[2.1 + 0.01, uf + 0.0], [uf + 2.2, h]]]]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(F, "oak", sx * (w / 2 + 0.1), h / 2, sz * (d / 2 + 0.1), 0.3, h, 0.3, "b");
  for (const sz of [-1, 1]) gbox(F, "oak", 0, uf, sz * (d / 2 + 0.17), w + 0.3, 0.22, 0.12, "");
  gGableBoth(F, "plank", w, d, h, rh); GTINT = [0.9, 0.9, 0.9]; groof(F, "shingle", w, d, h, rh, { under: "plank", e: 0.5, t: 0.22 });
  GTINT = [1, 1, 1]; gbox(F, "plank", 0, uf - 0.1, 0, w - 0.3, 0.2, d - 0.3, ""); for (let z = -5; z <= 5.01; z += 2) gbox(F, "oak", 0, uf - 0.3, z, w - 0.3, 0.2, 0.22, "");   // the upper floor on its joists
  surfRect(F, -3.85, 3.85, -5.85, 5.85, uf + 0.1);
  for (const [x, z, out] of [[w / 2, 3, [1, 0, 0]], [w / 2, -3, [1, 0, 0]], [0, d / 2, [0, 0, 1]]]) { const ox = out[0] * 0.18, oz = out[2] * 0.18;   // upper windows, shutters open
    const P = (u, y) => out[0] ? [x + ox, y, z + u] : [x + u, y, z + oz]; for (const io of [1, -1]) gpoly(F, "dark", [P(-0.35, uf + 1.3), P(0.35, uf + 1.3), P(0.35, uf + 2.0), P(-0.35, uf + 2.0)], [[0, 0], [1, 0], [1, 1], [0, 1]], [out[0] * io, 0, out[2] * io]); }
  // the stair: steps rising northward along the west wall to a landing at the door
  const sx0 = -w / 2 - 1.35, sx1 = -w / 2 - 0.15, z0 = 7.6, z1 = 0.7, N = 16;
  for (let k = 0; k < N; k++) { const z = z0 + (z1 - z0) * (k + 0.5) / N, y = uf * (k + 1) / N + 0.1; gbox(F, "oak", (sx0 + sx1) / 2, y - 0.06, z, 1.2, 0.12, Math.abs(z1 - z0) / N + 0.02, ""); gbox(F, "oak", sx0 - 0.03, y / 2, z, 0.08, y, 0.1, "b"); }
  gbox(F, "oak", (sx0 + sx1) / 2, uf + 0.04, -0.2, 1.2, 0.12, 1.9, ""); for (const z of [-1.1, 0.7]) gbox(F, "oak", sx0 + 0.1, uf / 2, z, 0.18, uf, 0.18, "b");
  for (let k = 0; k <= 8; k++) { const z = z0 + (z1 - z0) * k / 8, y = uf * k / 8; gbox(F, "oak", sx0 - 0.03, y + 0.95, z, 0.06, 0.06, Math.abs(z1 - z0) / 8 + 0.05, ""); }
  surfRect(F, sx0, sx1, z0, z1, 0.1, uf + 0.1); surfRect(F, sx0, -3.7, -1.15, z1, uf + 0.1);
  // upstairs: the bed with its curtains, a chest, a stool, hangings
  const Y = uf + 0.1; gbox(F, "oak", 1.6, Y + 0.25, -3.6, 1.5, 0.5, 2.2, "b"); GTINT = [1.2, 1.15, 1.05]; gbox(F, "plain", 1.6, Y + 0.56, -3.6, 1.4, 0.14, 2.1, "b"); GTINT = [0.7, 0.18, 0.2]; gbox(F, "plain", 1.6, Y + 0.65, -3.3, 1.45, 0.06, 1.5, "b");
  GTINT = [1, 1, 1]; for (const px of [0.85, 2.35]) for (const pz of [-4.7, -2.5]) gbox(F, "oak", px, Y + 1.1, pz, 0.1, 2.2, 0.1, "b"); gbox(F, "oak", 1.6, Y + 2.2, -3.6, 1.6, 0.06, 2.3, "");
  for (const io of [1, -1]) { gpoly(F, "hang", [[0.85, Y + 0.7, -4.7], [0.85, Y + 0.7, -2.5], [0.85, Y + 2.15, -2.5], [0.85, Y + 2.15, -4.7]], [[0, 0], [2.2, 0], [2.2, 1.45], [0, 1.45]], [-io, 0, 0]); gpoly(F, "hang", [[0.85, Y + 0.7, -4.75], [2.35, Y + 0.7, -4.75], [2.35, Y + 2.15, -4.75], [0.85, Y + 2.15, -4.75]], [[0, 0], [1.5, 0], [1.5, 1.45], [0, 1.45]], [0, 0, io]); }
  gbox(F, "oak", -2.6, Y + 0.3, -4.8, 1.2, 0.6, 0.6, "b"); gbox(F, "oak", -0.8, Y + 0.25, 1.5, 0.45, 0.5, 0.45, "b");
  for (const sz of [-1, 1]) gpoly(F, "hang", [[-3.7, Y + 0.6, sz * 5.82], [3.7, Y + 0.6, sz * 5.82], [3.7, Y + 2.6, sz * 5.82], [-3.7, Y + 2.6, sz * 5.82]], [[0, 0], [7.4, 0], [7.4, 2], [0, 2]], [0, 0, -sz]);
  { const [x, , z] = gw(F, 0.2, 0, -2); put("candle", CYL_G, MAT.iron, x, Y, z, 0.05, 1.3, 0.05); put("flame", FLAME_G, flameM, x, Y + 1.32, z, 1.5, 1.5, 1.5); }
  // downstairs: stores
  for (let k = 0; k < 6; k++) { const [x, , z] = gw(F, 2.6 - (k % 3) * 0.75, 0, 4.6 - Math.floor(k / 3) * 0.8); put("barrel", CYL_G, MAT.wood, x, F.gy, z, 0.6, 0.85, 0.6); }
  gbox(F, "oak", -2.8, 0.35, 4.6, 1.2, 0.7, 0.7, "b"); gbox(F, "oak", -2.8, 0.35, 3.4, 1.2, 0.7, 0.7, "b");
  PAL.chamberDoor = gw(F, -w / 2 - 0.8, 0, -0.5); PAL.bed = gw(F, 1.6, 0, -3.6); PAL.stairFoot = gw(F, (sx0 + sx1) / 2, 0, z0 + 1);
}
{ // the kitchen, apart from the hall for fear of fire: a central fire, a spit, a cauldron, a clay oven
  const F = FR(PALACE[0] - 6, PALACE[1] + 19, 0, groundH(PALACE[0] - 6, PALACE[1] + 19) - 0.1, "palace"), w = 6.5, d = 8, wh = 2.6, rh = 4.2; PAL.kitchen = F;
  ZONES.push({ name: "kitchen", F, w: w - 0.3, d: d - 0.3, light: [0, 1.2, 0.5], doors: [[0, -d / 2]] });
  GTINT = [0.95, 0.9, 0.85]; gWalls(F, "daub", w, d, wh, 0.3, [["-z", 0, 1.3, 2.0]]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(F, "oak", sx * w / 2, wh / 2, sz * d / 2, 0.24, wh, 0.24, "b");
  GTINT = [0.8, 0.8, 0.8]; groof(F, "thatch", w, d, wh, rh, { hip: true }); GTINT = [0.6, 0.55, 0.5];
  GTINT = [1, 1, 1];
  GTINT = [1, 1, 1]; gpoly(F, "rush", [[-w / 2, 0.04, -d / 2], [w / 2, 0.04, -d / 2], [w / 2, 0.04, d / 2], [-w / 2, 0.04, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]);
  GTINT = [0.6, 0.55, 0.5]; gbox(F, "rubble", 0, 0.08, 0.5, 1.6, 0.16, 1.6, "b");
  for (const sx of [-1, 1]) gbox(F, "oak", sx * 1.1, 0.6, 0.5, 0.1, 1.2, 0.1, "b"); gbox(F, "oak", 0, 1.15, 0.5, 2.4, 0.04, 0.04, "");   // the spit
  { const [x, , z] = gw(F, 0, 0, 0.5); const pig = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8).scale(1.7, 0.85, 0.9), M(0xa8683a, { roughness: 0.5 })); pig.position.set(x, F.gy + 1.08, z); pig.rotation.y = 0; scene.add(pig); PAL.pig = pig; }
  for (let k = 0; k < 4; k++) { const [x, , z] = gw(F, (k - 1.5) * 0.4, 0, 0.5); put("hfire", HFIRE_G, hearthFireM, x, F.gy + 0.15, z, 1, 0.7 + (k % 2) * 0.3, 1); }
  { const [x, , z] = gw(F, -2.2, 0, 2.6); const oven = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8a6a4a)); oven.position.set(x, F.gy, z); scene.add(oven); }
  gbox(F, "oak", 2.3, 0.8, 1.5, 1.0, 0.06, 2.6, ""); for (const z of [0.5, 2.5]) gbox(F, "oak", 2.3, 0.4, z, 0.8, 0.8, 0.08, "b");
  for (let k = 0; k < 6; k++) { const [x, , z] = gw(F, 2.2 + (k % 2) * 0.3, 0, 0.6 + k * 0.35); put("loaf", new THREE.SphereGeometry(0.14, 8, 5).scale(1, 0.55, 1), M(0xb07a3a), x, F.gy + 0.88, z, 1, 1, 1); }
  for (let k = 0; k < 3; k++) { const [x, , z] = gw(F, 0.8, 0, -1.8 + k * 0.6); put("ham", new THREE.SphereGeometry(0.16, 8, 5).scale(0.8, 1.4, 0.8), M(0x8a5a3a), x, F.gy + wh - 0.75, z, 1, 1, 1); put("hamcord", CYL_G, M(0x6a5a40), x, F.gy + wh - 0.55, z, 0.02, 0.6, 0.02); }
  PAL.kitchenDoor = gw(F, 0, 0, -d / 2 - 1.5); PAL.inKitchen = gw(F, 0, 0, -d / 2 + 1.5); PAL.cookSpots = [gw(F, 1.2, 0, -0.8), gw(F, -1.3, 0, 1.6), gw(F, 1.6, 0, 2.2)];
}
const HALL_IN = (x, z) => zoneOf(x, z) === "hall";

// ---------- markers: what things are, and how well we know them ----------
// tag: "known" (from excavation or written record), "inferred" (the place is known, the form is a reasoned guess),
// "typical" (a stand-in for the kind of thing that stood there), "absent" (famous things that do not exist yet), "person".
const MARKS = [];
const mark = (name, x, z, tag, text, o = {}) => { const m = { name, x, z, tag, text, y: o.y, r: o.r || 25, range: o.range || 700, big: !!o.big, follow: o.follow, hidden: !!o.hidden }; MARKS.push(m); return m; };
const markLL = (name, lat, lon, tag, text, o) => { const [x, z] = LL(lat, lon); return mark(name, x, z, tag, text, o); };

// ---------- churches ----------
function findFree(x, z, w, d, ry = 0) { for (let r = 0; r < 60; r += 3) for (let a = 0; a < 6.28; a += r ? 0.7 : 7) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (rRect(X, Z, w, d, ry, 0, true)) return [X, Z]; } return [x, z]; }
{ // St Paul's: its site on Ludgate Hill is certain, its form unknown
  const [x, z] = LL(51.5138, -0.0985), gy = groundH(x, z) - 0.3; rRect(x, z, 150, 96, 0, 4);
  gChurch(x - 4, z, { nl: 44, nw: 17, cl: 14, cw: 10, wh: 11, mat: "rag", roof: "shingle" }); solid(x - 4, z, 44, 17, 0); solid(x + 25, z, 14, 10, 0);
  { const F = FR(x - 30.5, z, 0, gy); GTINT = [1.05, 1.03, 1]; gbox(F, "rubble", 0, 13, 0, 9, 26, 9); GTINT = [1, 1, 1]; for (const [ox, oz, o] of [[4.5, 0, [1, 0, 0]], [-4.5, 0, [-1, 0, 0]], [0, 4.5, [0, 0, 1]], [0, -4.5, [0, 0, -1]]]) { garch(F, "dark", ox, 21, oz, 0.9, 2.6, o); }
    garch(F, "dark", -4.5, 0, 0, 1.8, 3.4, [-1, 0, 0]); put("cap", CONE4_G, MAT.shingle, x - 30.5, gy + 26, z, 10, 6, 10); solid(x - 30.5, z, 9, 9, 0); }
  for (const [dx, dz] of [[-10, 26], [6, 28], [22, -24], [-16, -26]]) addHouse(x + dx, z + dz, 6, 10, 0, { wall: "plank", roof: "shingle", door: "-z" });   // canons' houses
  mark("St Paul's Cathedral", x, z, "inferred", "London's cathedral since Bishop Mellitus founded it in 604, on the top of Ludgate Hill. The church that stood here in 1066 was rebuilt after a fire in 962 and burned down in 1087, when the great Norman cathedral (Old St Paul's) was begun. No trace of the Saxon building has been found, so its form here is a guess: a large stone church with a west tower, in a precinct with the canons' houses. The bishop of London in 1066 was William, a Norman appointed by Edward the Confessor in 1051.", { big: true, range: 3000, y: 34, r: 45 });
}
const CH = [["All Hallows by the Tower", 51.5098, -0.0795, "known", "Founded by Barking Abbey in the 7th century: a round-headed arch of reused Roman tiles from that first church still stands inside the present one. A stone church, the oldest in the City."],
  ["St Bride's", 51.5136, -0.1053, "known", "Dedicated to St Brigid of Kildare, beside the Fleet. Excavated after the church was bombed in 1940: a small stone two-cell church of the 11th century (perhaps earlier) over Roman remains."],
  ["St Alban, Wood Street", 51.5163, -0.0935, "known", "A small Late Saxon church excavated after the Blitz, inside the corner of the old Roman fort. Medieval legend tied it to King Offa of Mercia."],
  ["St Andrew, Holborn", 51.5172, -0.1080, "known", "Recorded in a charter of 951 as 'the old wooden church of St Andrew' on the Holborn road outside the city: shown here in timber."],
  ["St Clement Danes", 51.5131, -0.1140, "known", "The church of the Danish community outside the walls on the road to Westminster. Harold Harefoot, king 1035-1040, was said to be buried here."],
  ["St Nicholas Shambles", 51.5152, -0.0988, "inferred", "Excavated in 1975-79: its first church was a small stone building of the 11th century beside the meat market (the 'shambles') on Newgate Street. Whether it stood by 1066 is uncertain."],
  ["St Mary, Lambeth", 51.4950, -0.1195, "known", "Lambeth's church, on the riverside across from Westminster. The manor belonged to Goda, Edward the Confessor's sister; Domesday Book (1086) records the church."],
  ["Southwark minster", 51.5058, -0.0905, "inferred", "Domesday Book records a minster (monasterium) at Southwark, on the site of the later priory of St Mary Overie (now Southwark Cathedral). Form unknown."]];
for (const [name, lat, lon, tag, text] of CH) { const [x0, z0] = LL(lat, lon), [x, z] = findFree(x0, z0, 30, 20), timber = name.includes("Holborn"); const C = addChurch(x, z, { mat: timber ? "plank" : "rag", roof: timber ? "thatch" : "shingle" }); mark(name, x, z, tag, text, { y: 14, range: 900 }); }
{ const R = seeded(19); let n = 0;   // other parish churches, where it is not known which ones existed
  for (let tries = 0; tries < 400 && n < 20; tries++) { const S = STREETS[(R() * 15) | 0], [px, pz] = S.L.at(R() * S.L.L); if (!CITY.inside(px, pz)) continue; const x = px + (R() - 0.5) * 70, z = pz + (R() - 0.5) * 70;
    if (!CITY.inside(x, z) || baseH(x, z) < 2 || !rRect(x, z, 30, 20, 0, 0, true) || CHURCHES.some(c => Math.hypot(c.x - x, c.z - z) < 120)) continue;
    addChurch(x, z, { mat: R() < 0.6 ? "rag" : "plank", roof: R() < 0.6 ? "shingle" : "thatch", nl: 11 + R() * 6, nw: 5.5 + R() * 2 }); n++;
    if (n % 4 === 1) mark("A parish church", x, z, "typical", "London had about 30-50 small parish churches by 1066, many founded by local lords or groups of neighbours in the 10th and 11th centuries, and more were added soon after (about 100 by 1200). Which ones existed in 1066 is mostly unknown. This stands for one: two cells, a nave for the people and a smaller chancel for the altar, of ragstone rubble (often reusing Roman stone and tile) or timber.", { y: 12, range: 300 }); } }

// ---------- houses along the streets ----------
const outsideDens = { "Fleet Street": (x, z) => 0.55 * (1 - sstepN(Math.hypot(x - GATES[0].x, z - GATES[0].z), 150, 700)) + 0.06, "the Strand": 0.07, "King Street": (x, z) => z > -330 ? 0.5 : 0.05,
  "the road to Holborn": (x, z) => 0.5 * (1 - sstepN(Math.hypot(x - GATES[1].x, z - GATES[1].z), 100, 500)), "Ermine Street": (x, z) => 0.45 * (1 - sstepN(Math.hypot(x - GATES[4].x, z - GATES[4].z), 80, 400)),
  "the road east from Aldgate": (x, z) => 0.4 * (1 - sstepN(Math.hypot(x - GATES[5].x, z - GATES[5].z), 80, 400)), "the road north from Cripplegate": (x, z) => 0.3 * (1 - sstepN(Math.hypot(x - GATES[3].x, z - GATES[3].z), 60, 300)),
  "Borough High Street": (x, z) => 0.75 * (1 - sstepN(Math.hypot(x - BRIDGE.P[1][0], z - BRIDGE.P[1][1]), 250, 650)), "the road to Lambeth": 0.03 };
const [cheapX, cheapZ] = LL(51.5130, -0.0930);
const cityDens = (x, z) => { if (!CITY.inside(x, z)) return 0; const d = Math.hypot(x - cheapX, (z - cheapZ) * 1.6); return 0.88 - 0.45 * sstepN(d, 500, 1300); };   // thickest round Cheapside and the waterfront, thinner toward the walls
for (const S of STREETS) { const od = outsideDens[S.name], f = (x, z) => CITY.inside(x, z) ? cityDens(x, z) : typeof od === "function" ? od(x, z) : od || 0;
  if (S.name === "Thames Street") { lineStreet(S, f, { sides: [1] }); lineStreet(S, (x, z) => 0.3 * f(x, z), { sides: [-1], seed: 3, yards: false }); }
  else lineStreet(S, f, { burnt: S.name === "Borough High Street", kind: S.name === "King Street" ? "vill" : "house" }); }
{ const R = seeded(23); let n = 0;   // houses back from the streets, on lanes and in yards
  for (let tries = 0; tries < 6000 && n < 420; tries++) { const x = GATES[0].x + R() * (GATES[5].x - GATES[0].x + 60), z = -2200 + R() * 1300; if (!CITY.inside(x, z) || R() > cityDens(x, z) || baseH(x, z) < 1.2 || WALL.d(x, z) < 12) continue;
    const w = 4 + R() * 2, d = 6 + R() * 5, ry = (R() < 0.5 ? 0 : Math.PI / 2) + (R() - 0.5) * 0.3; if (!rRect(x, z, w + 2, d + 2, ry, 0, true)) continue;
    const H = addHouse(x, z, w, d, ry, { door: ["+z", "-z", "+x", "-x"][(R() * 4) | 0] }); rRect(x, z, w + 0.4, d + 0.4, ry, 2); rRect(x, z, w + 8, d + 8, ry, 3); n++; } }
// small places outside: Charing, round St Clement Danes, Lambeth, and a few farmsteads
function cluster(lat, lon, n, rad, seed, o = {}) { const [cx, cz] = LL(lat, lon), R = seeded(seed); let k = 0;
  for (let t = 0; t < n * 20 && k < n; t++) { const a = R() * 6.283, r = rad * Math.sqrt(R()), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, w = 4.5 + R() * 2, d = 7 + R() * 5, ry = R() * Math.PI;
    if (baseH(x, z) < 1.2 || !rRect(x, z, w + 3, d + 3, ry, 0, true)) continue; addHouse(x, z, w, d, ry, { door: "-z", ...o }); rRect(x, z, w + 0.4, d + 0.4, ry, 2); rRect(x, z, w + 14, d + 14, ry, 3); k++; } }
cluster(51.5073, -0.1270, 6, 45, 41); cluster(51.5131, -0.1135, 10, 70, 42); cluster(51.4955, -0.1192, 7, 70, 43); cluster(51.5165, -0.1150, 3, 60, 44); cluster(51.5200, -0.1000, 3, 80, 45); cluster(51.4985, -0.1340, 4, 60, 46);
cluster(51.5035, -0.0905, 10, 120, 47, { burnt: true });
markLL("Charing", 51.5073, -0.1277, "inferred", "A hamlet at the bend of the river road, where the Strand turns south to Westminster: its Old English name, cierring, means 'a turning'. The cross that gave Charing Cross its name was put up in 1294.", { range: 1200 });
markLL("The Danish settlement", 51.5131, -0.1125, "known", "A small community of Danes, living outside the walls round St Clement's church: London had many Scandinavian residents after Cnut became king in 1016.", { range: 900 });
markLL("Lambeth", 51.4958, -0.1188, "known", "A riverside manor on the Surrey shore opposite Westminster, held by Goda, King Edward's sister. The archbishops of Canterbury acquired it about 1200 and built Lambeth Palace.", { range: 1500 });

// ---------- Southwark: burned ----------
markLL("Southwark", 51.5035, -0.0900, "known", "The bridgehead settlement on gravel islands in the marsh: its name means 'the southern work', the defence of the bridge's south end. After his victory at Hastings William came up to the bridge in late November; the Londoners held it against him, and his knights burned Southwark before going round by Wallingford to approach London from the north-west (William of Poitiers). Some people are rebuilding.", { big: true, range: 3000 });

// ---------- the Westminster hamlet ----------
markLL("The vill of Westminster", 51.5012, -0.1262, "known", "The little settlement that grew up by the abbey and palace, along the road to London. Domesday Book (1086) records 25 houses there 'of the abbot's knights and of other men'. These are the houses that the Norman guards set on fire during the coronation.", { range: 1200 });

// ---------- the land: Thorney, rivers, marsh, hills ----------
markLL("Thorney Island", 51.4980, -0.1290, "known", "'The island of thorns': a gravel island about 470 by 370 m, between two mouths of the Tyburn stream and the Thames. Here the abbey of St Peter was founded in the 10th century (a minster may have stood here earlier), and Edward the Confessor built his palace and great church. It was 'Westminster', the west minster, as against St Paul's in the east.", { big: true, range: 2500, y: 30 });
markLL("The Tyburn", 51.5032, -0.1300, "known", "A stream from Hampstead that split into channels as it reached the Thames, making Thorney an island. Their exact courses are uncertain; they were later culverted and built over.", { range: 600 });
markLL("The Fleet", 51.5150, -0.1056, "known", "London's second river: a tidal inlet up to 100 m wide at its mouth, with wharves and mills. Fleet Street crossed it by a bridge just outside Ludgate. It was later narrowed into a canal and then buried; it still runs, in a sewer.", { range: 1500 });
markLL("The Walbrook", 51.5125, -0.0903, "known", "A small stream running down the valley between the City's two hills, Ludgate Hill and Cornhill, to the Thames. Its banks were boggy; Roman finds from it include the temple of Mithras. By 1066 it was silting and narrow.", { range: 500 });
markLL("Moorfields", 51.5195, -0.0880, "known", "The great marsh outside the north wall: the Roman wall dammed the streams that ran south, and the ground behind it became a fen. On frozen winters, a 12th-century writer says, young men skated here on animal shin-bones.", { range: 1500 });
markLL("Ludgate Hill", 51.5139, -0.0995, "known", "The western of the City's two hills, about 15-18 m above the river, with St Paul's on its top.", { range: 300, hidden: true });
markLL("Cornhill", 51.5135, -0.0860, "known", "The eastern of the City's two hills, where the Roman forum and basilica stood; their ruins had been dug for stone for centuries.", { range: 600 });
markLL("The Thames", 51.5060, -0.1050, "known", "The river was wider and shallower than now: the Saxon waterfront lay about 100 m north of today's riverbank at Billingsgate, and the south shore was marsh and islands. The tide rose and fell about 4-5 m (less than today's 7 m). The embankments of the 19th century narrowed it.", { range: 2500 });
markLL("Lundenwic: fields", 51.5120, -0.1180, "known", "Under these fields lies Lundenwic, the Middle Saxon trading town of about 600-850 that stretched along the Strand from Trafalgar Square to Aldwych. After Viking raids it was abandoned, and King Alfred moved the people inside the Roman walls in the 880s. 'Aldwych', 'the old wic', remembers it.", { range: 1200 });
markLL("The Strand", 51.5112, -0.1200, "known", "'The shore': the road along the riverbank from the City to Westminster, with only a few houses, fields and gardens. It was where the great men's riverside houses would rise in the 13th to 16th centuries.", { range: 900 });

// ---------- the City ----------
markLL("The Roman wall", 51.5178, -0.0900, "known", "Built about 190-220 AD: 3.2 km long on the landward side, about 2.5 m thick and 6 m high, of Kentish ragstone with courses of red tile, a ditch outside. Repaired by Alfred and his successors, it still defined London in 1066. Long stretches survive (at Tower Hill and London Wall).", { range: 900 });
for (const G of GATES) mark(G.n, G.x, G.z, "known", { Ludgate: "The western gate, below St Paul's, toward Fleet Street and Westminster: the route William's procession would take. Its 1066 form is unknown; shown as a simple towered arch.",
  Newgate: "The gate of the road west to Silchester and the west country (the 'new' gate was in fact Roman). Later London's prison.", Aldersgate: "A gate of the late Roman period, on the road north; named perhaps after a man called Ealdred.", Cripplegate: "The north gate of the old Roman fort (about 120 AD), built into the city wall: the road north to the fields and Moorfields.", Bishopsgate: "The gate of Ermine Street, the road north to Lincoln and York.", Aldgate: "The 'old gate' (or 'ale gate'), the road east to Colchester." }[G.n], { range: 600 });
markLL("Cheapside (Westcheap)", 51.5141, -0.0945, "known", "The broad market street of London ('ceap' means trade). London was England's largest town, with perhaps 10,000-15,000 people. Today is Christmas Day, a holy day: there is no market, and the stalls are empty. Many have gone to Westminster to see the crowning.", { range: 900 });
markLL("The grid of lanes", 51.5122, -0.0947, "known", "Bread Street, Friday Street, Bow Lane, Garlick Hill: lanes laid out when King Alfred resettled London in the 880s-890s, running down from Cheapside to the hithes on the river. Excavations along them have found the houses, cellars, wells and rubbish pits of the 10th and 11th centuries.", { range: 400 });
markLL("Queenhithe (Æthelred's hithe)", 51.5104, -0.0947, "known", "A beach market with a timber embankment, granted in 899 to Ealdorman Æthelred of Mercia and the bishop of Worcester. Boats ran up on the foreshore here to unload. Excavated at Bull Wharf.", { range: 900 });
markLL("Billingsgate", 51.5096, -0.0832, "known", "The other main hithe, below the bridge. A law code of about 1000 (IV Æthelred) lists the tolls paid here: ships from Rouen with wine, from Flanders, Ponthieu, Normandy and France, and the 'men of the emperor' (Germans), who could buy wool and lard and three live pigs for their ships.", { range: 900 });
markLL("London Bridge", 51.5080, -0.0875, "known", "A timber bridge on piles: timbers from its Southwark end have tree-ring dates of about 987-1032. The Norse sagas tell of Olaf pulling an earlier bridge down in 1014. The Londoners held it against William's army in November. No houses stood on it until the stone bridge of 1176-1209.", { big: true, range: 2500, y: 10 });
markLL("No Tower of London", 51.5081, -0.0765, "absent", "The Tower does not exist yet. Soon after the coronation William had 'fortifications' built in the City 'against the fickleness of the huge and fierce population' (William of Poitiers): a ditch and rampart in this south-east corner of the Roman wall, where the White Tower was built about 1075-1100.", { range: 1500 });
markLL("No Guildhall, no castles", 51.5155, -0.0920, "absent", "Not yet built: the Guildhall (first recorded about 1128), Baynard's and Montfichet castles in the west of the City (after 1066), and Moorgate (1415). Saxon London was governed by its folkmoot, which met in the open air by St Paul's, and by the husting court.", { range: 500 });
markLL("Westminster Hall: not yet", 51.4986, -0.1246, "absent", "Westminster Hall was built by William's son William Rufus in 1097-99. Edward's palace stood about here; nothing of it is known, so its hall, chamber and kitchen are typical buildings of a royal residence, in timber.", { range: 400 });
markLL("Edward's palace", 51.4994, -0.1252, "inferred", "Edward the Confessor moved his main residence here from the City to watch his abbey being built. He died in the palace on 5 January 1066; Harold was crowned the next day. William is staying here. Nothing of it has been found, so its buildings follow what royal residences of the time had: a great hall, a two-storey chamber block, a kitchen, inside a palisade. Walk in: the hall's doors are on its long sides near the west end; the chamber has an outside stair.", { range: 1500, y: 14 });
markLL("The monastery", 51.4990, -0.1280, "inferred", "Edward refounded the abbey for a larger community of Benedictine monks (perhaps about 70 by 1100) under Abbot Edwin. The new stone buildings south of the church were under way (part of the dormitory's undercroft of about 1070-1100 survives); older buildings were timber. Layout inferred.", { range: 600 });
markLL("The wharf", 51.4993, -0.1237, "inferred", "Barges brought Caen stone, quarried in Normandy and shipped across the Channel and up the Thames, for the abbey.", { range: 500 });

// ---------- trees, bare in midwinter ----------
// Oaks, elms, ashes, willows and alders, leafless; willows and alders along the streams and on the marsh.
function bareTreeGeo() { const parts = [[new THREE.CylinderGeometry(0.16, 0.32, 4.2, 5), MT(0, 2.1, 0)]], R = seeded(3);
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + R(), tilt = 0.5 + R() * 0.5, L = 2.5 + R() * 2, h = 2.6 + R() * 1.6; const m = new THREE.Matrix4().makeTranslation(0, h, 0).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(new THREE.Matrix4().makeTranslation(0, L / 2, 0));
    parts.push([new THREE.CylinderGeometry(0.04, 0.11, L, 3), m]);
    for (let q = 0; q < 1; q++) { const L2 = 1.2 + R(), m2 = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, L * (0.1 + q * 0.4), 0)).multiply(new THREE.Matrix4().makeRotationZ((q ? -1 : 1) * (0.6 + R() * 0.4))).multiply(new THREE.Matrix4().makeTranslation(0, L2 / 2, 0)); parts.push([new THREE.CylinderGeometry(0.015, 0.04, L2, 3), m2]); } }
  return mergeG(parts); }
const TREE_G = bareTreeGeo(), treeM = M(0x4a4038, { roughness: 1 });
{ const R = seeded(71); let n = 0, cap = IS_HEADSET ? 800 : 1300;
  for (let gz = RZ0; gz < RZ0 + RH * RC && n < cap; gz += 22) for (let gx = RX0; gx < RX0 + RW * RC && n < cap; gx += 22) { const x = gx + R() * 20, z = gz + R() * 20, h = baseH(x, z); if (h < 0.9) continue;
    const v = rGet(x, z); if (v === 1 || v === 2 || v === 7 || v === 4) continue; const inC = CITY.inside(x, z);
    const wet = (THAMES.side(x, z) > 0 && h < 2.3) || [TYB_N, TYB_S, TYB_W, FLEET, WALBROOK].some(L => L.near(x, z, 40) && L.d(x, z) < 40);
    const p = inC ? (v === 3 ? 0.03 : 0.01) : wet ? 0.22 : v === 3 ? 0.08 : 0.035 + 0.06 * sstepN(fbm(x / 400, z / 400, 2), 0.5, 0.7);
    if (R() > p) continue; const s = wet ? 0.7 + R() * 0.4 : 0.8 + R() * 0.7; put("tree", TREE_G, treeM, x, h - 0.2, z, s, s * (wet ? 0.8 : 1), s, R() * 6.28); n++; } }
// boats: run up on the foreshore at the hithes, a few seagoing ships, small boats along the banks
function bankPoint(lat, lon, out) { let [x, z] = LL(lat, lon), k = 0; while (baseH(x, z) > -0.3 && k++ < 120) z += 1.5; return [x, z + out]; }
{ const R = seeded(81); for (const [lon0, lon1, n] of [[-0.0960, -0.0935, 7], [-0.0845, -0.0822, 7], [-0.1020, -0.0990, 2], [-0.0910, -0.0895, 2]]) for (let k = 0; k < n; k++) { const lon = lon0 + (lon1 - lon0) * (k + R() * 0.5) / n, [x, z] = bankPoint(51.5112, lon, -3 + R() * 6);
    addBoat(x, z, (R() - 0.5) * 0.5, 7 + R() * 7, R() < 0.2); }
  for (let k = 0; k < 3; k++) { const [x, z] = bankPoint(51.5108, -0.0950 + k * 0.006, 40 + R() * 30); addBoat(x, z, Math.PI / 2 + (R() - 0.5) * 0.4, 18 + R() * 4, true); }   // ships riding at anchor
  for (const [lon0, lon1] of [[-0.0960, -0.0935], [-0.0845, -0.0822]]) { const [x0, z0] = bankPoint(51.5112, lon0, -4), [x1, z1] = bankPoint(51.5112, lon1, -4), len = Math.hypot(x1 - x0, z1 - z0);
    put("revet", BOX_G, MAT.wood, (x0 + x1) / 2, -1, (z0 + z1) / 2 - 6, 0.4, 2.6, len, Math.atan2(x1 - x0, z1 - z0)); } }   // timber embankments
mark("Boats on the foreshore", ...bankPoint(51.5112, -0.0948, 0), "typical", "Boats were run up on the sloping foreshore at low tide and unloaded there. Finds from the London waterfront are clinker-built (overlapping planks, riveted) in the Scandinavian tradition: small boats for the river, and seagoing ships with a single mast and square sail. Christmas Day: nobody is working.", { range: 400 });
// a few typical houses to read about
{ const picks = [[51.5128, -0.0940], [51.5118, -0.0960], [51.5040, -0.0890], [51.5010, -0.1262]];
  const txt = ["A Late Saxon town house. Excavations on Bread Street, Milk Street and at No 1 Poultry show houses about 4-6 m wide and 6-12 m long, on earth-fast oak posts, walled with planks or wattle-and-daub, roofed with thatch or shingles, with a central hearth and no chimney. Many had a cellar lined with planks. Behind, a long narrow plot: yard, well, cesspit, rubbish pits, a pig or hens. Press E at a doorway to go in.",
    "A plot behind the street front: back buildings, a wattle fence, the yard. London's plots were long and narrow, laid out along the 890s streets; some had workshops: bone, antler and leather working, metalworking, weaving.",
    "A burnt house in Southwark: William's men fired the settlement a month ago. A few are being rebuilt.",
    "A house in Westminster's little vill. In the coronation (from about 10:13) Norman guards outside the abbey set these houses alight."];
  picks.forEach(([lat, lon], i) => { const [x, z] = LL(lat, lon); let best = null, bd = 1e9; for (const H of HOUSES) { const d = Math.hypot(H.x - x, H.z - z); if (d < bd) { bd = d; best = H; } }
    if (best) mark(["A town house", "Yards and plots", "Burnt Southwark", "A Westminster house"][i], best.x, best.z, "typical", txt[i], { y: 6, range: 200 }); }); }
// ploughland north of the City and the Strand: winter strips of the open fields
function fieldAt(x, z, h) { if (h < 4 || THAMES.side(x, z) > 0 || CITY.inside(x, z)) return 0; if (WALL.near(x, z, 160) && WALL.d(x, z) < 160) return 0; const v = vnoise(x / 260 + 40, z / 260); return v > 0.52 ? 1 : 0; }
const [moorX, moorZ] = LL(51.5198, -0.0885);

// ---------- the day's clock ----------
// The hour of the coronation is not recorded. Mass on a great feast was in the morning; here the procession sets out at 10:00 and
// the events the chroniclers describe follow in their order, at a plausible pace. SIM is seconds after midnight.
const hms = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
let SIM = hms(9, 55), timeRate = 1;
const T = { proc: hms(10, 0), enter: hms(10, 4, 30), prostrate: hms(10, 5), ask1: hms(10, 10), ask2: hms(10, 11, 30), shout: hms(10, 12, 40), fire: hms(10, 13, 30), flee: hms(10, 14, 10),
  oath: hms(10, 20), anoint: hms(10, 24), crown: hms(10, 28), throne: hms(10, 31), mass: hms(10, 34), leave: hms(11, 20) };
const MOMENTS = [["Before the coronation", hms(9, 55)], ["The procession", T.proc - 10], ["The questions", T.ask1 - 15], ["The shout and the fire", T.shout - 20], ["The flight from the church", T.flee - 10],
  ["The oath", T.oath - 10], ["The anointing", T.anoint - 10], ["The crowning", T.crown - 15], ["The enthronement", T.throne - 10], ["After: the king returns", T.leave - 10]];
const NARR = [
  [hms(9, 55), "Christmas Day 1066, Westminster. Ten weeks after Hastings, the Londoners and the English leaders have submitted to William at Berkhamsted, and he is to be crowned in Edward the Confessor's new abbey, consecrated a year and three days ago. Norman troops guard the church."],
  [T.proc, "The procession leaves the palace: clergy with the cross, candles and the Gospel book, the bishops, Duke William, his lords. Armed Norman knights guard the way (William of Poitiers)."],
  [T.prostrate, "Before the high altar and Edward's tomb, William lies face down while the litany is sung: the opening of the English coronation rite."],
  [T.ask1, "Geoffrey, bishop of Coutances, asks the Normans in French whether they will have William as their king (Orderic Vitalis)."],
  [T.ask2, "Ealdred, archbishop of York, asks the English in English. (Stigand of Canterbury, whose appointment the pope did not recognise, is passed over.)"],
  [T.shout, "Both peoples shout their assent together, 'with one voice if not one language' (William of Poitiers)."],
  [T.fire, "The armed guard outside, hearing the great shout in a foreign tongue, think something terrible has happened, and set fire to the houses nearby (Orderic Vitalis; William of Poitiers)."],
  [T.flee, "The fire spreads quickly. The congregation rushes out of the church, 'some to fight the flames, others to loot'. Only the bishops, a few clergy and the monks stay with the duke, who is 'trembling violently' (Orderic)."],
  [T.oath, "William swears the coronation oath before the altar: to defend God's churches and their ministers, to rule the people justly, to make and keep right law, and to forbid violence and unjust judgement (the Worcester Chronicle; William of Poitiers)."],
  [T.anoint, "Ealdred anoints him with holy oil, the sacred heart of the rite, which made a king different from other men."],
  [T.crown, "Ealdred sets the crown on his head (one source describes a crown with twelve gems), and gives him the sceptre and rod. The Anglo-Saxon Chronicle: 'and Archbishop Ealdred consecrated him king at Westminster'."],
  [T.throne, "King William is enthroned. Mass continues. Outside the houses of Westminster burn. Orderic, writing later, says the English never trusted the Normans after this day."],
  [T.leave, "The king and the bishops leave the church and go back to the palace. The smoke of the burnt houses drifts across Thorney."]];
let narrI = -1;

// ---------- the people ----------
const NC = IS_HEADSET ? 640 : 860, crowd = new Crowd(NC), AG2 = [];   // everyone, one instanced crowd
let nextI = 0;
function agent(role, o = {}) { const i = nextI++; if (i >= NC) return null; const L = looks(i, role); crowd.look(i, L); const A = { i, L, role: L.role, x: 0, z: 0, y: 0, h: 0, kind: "stand", walk: 0, shown: false, ...o }; AG2.push(A); return A; }
// a route: points [x, z]; position at distance s
function routeAt(P, s) { let i = 1; for (; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s <= l) { const f = s / l; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), false]; } s -= l; }
  const n = P.length - 1; return [P[n][0], P[n][1], n ? Math.atan2(P[n][0] - P[n - 1][0], P[n][1] - P[n - 1][1]) : 0, true]; }
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const ND = [0, -27.7], WD = [NAVE_DONE - 0.3, 0];   // the north transept door and the temporary west door
const PAL_DOOR = [PAL.northDoor[0], PAL.northDoor[2]], PAL_IN = [PAL.inNorth[0], PAL.inNorth[2]];
const PROC_PATH = [PAL_DOOR, [PAL_DOOR[0] - 13, PAL_DOOR[1] + 4], [PALACE[0] - 47, PALACE[1]], [110, 10], [90, -45], [30, -45], [0, -40], ND, [0, -12], [0, -2]];   // out of the hall, through the palisade gate, round to the north door
// the procession and the principals
const PRIN = {};
{ const order = [["cleric", "cross"], ["cleric", "candle"], ["cleric", "candle"], ["cleric", "book"], ["cleric"], ["cleric"], ["monk", "edwin"], ["bishop", "geoffrey"], ["bishop", "ealdred"], ["norman", "william"],
    ["norman", "lord"], ["norman", "lord"], ["norman", "lord"], ["norman", "lord"], ["norman", "lord"], ["norman", "lord"]];
  const stations = { cross: [21.5, 0, -Math.PI / 2], candle: [19.5, 2.2, -Math.PI / 2], book: [17.2, -1.4, Math.PI / 2], edwin: [17.4, 2.6, -Math.PI / 2], geoffrey: [-0.5, -3.5, -Math.PI / 2], ealdred: [17.0, 0, -Math.PI / 2], william: [15.5, 0, Math.PI / 2] };
  let ci = 0, li = 0;
  order.forEach(([role, key], k) => { const A = agent(role, { proc: true, delay: k * 2.4, key }); let st = stations[key];
    if (key === "candle") st = [19.5, ci++ ? -2.2 : 2.2, -Math.PI / 2]; if (!key) st = [16 + (k % 2) * 2, (k % 2 ? 3.5 : -3.5), k % 2 ? -Math.PI : 0]; if (key === "lord") { st = [-2.5 + (li % 3) * 2.4, -8 - Math.floor(li / 3) * 1.8, Math.PI]; li++; }
    const wt = PAL.seat(2.2 + (k % 3) * 1.2, -13.5 + Math.floor(k / 3) * 1.4); A.wait = [wt[0], wt[2]];   // waiting in the hall beforehand
    const hs = { william: [0, 13.6, 1], ealdred: [1.3, 13.4, 1], geoffrey: [-1.3, 13.4, 1], edwin: [2.6, 13.4, 1] }[key] || [k % 2 ? 4.1 : -4.1, -8 + k * 1.1, 0], hw = PAL.seat(hs[0], hs[1]);   // and where they sit at the feast afterwards
    A.feast = [hw[0], hw[2], hs[2] ? -Math.PI / 2 : hs[0] > 0 ? Math.PI : 0, hs[2]];
    A.station = st; A.path = [A.wait, PAL_IN, ...PROC_PATH, [st[0], st[1]]]; if (key) PRIN[key] = A; }); }
// monks in the choir stalls, singing
for (let k = 0; k < 18; k++) { const zs = k % 2 ? 1 : -1, x = -12.5 + Math.floor(k / 2) * 1.6; agent("monk", { fixed: [x, 3.0 * zs, zs > 0 ? Math.PI : 0], kind: "stand", monk: true }); }
// the congregation: Normans on the north side, English on the south (the arrangement is not recorded)
{ const R = seeded(91), spots = [];
  for (let x = -31.5; x < -15; x += 1.15) for (let z = -9.6; z <= 9.6; z += 1.1) { if (Math.abs(z) > 4.3 && Math.abs(z) < 5.9 && Math.abs(((x + 5) / BAY) - Math.round((x + 5) / BAY)) < 0.25) continue; spots.push([x + (R() - 0.5) * 0.3, z + (R() - 0.5) * 0.3, "nave"]); }
  for (let x = -14.5; x < -6.5; x += 1.15) for (const z of [6.4, 7.5, 8.6, 9.6, -6.4, -7.5, -8.6, -9.6]) spots.push([x + (R() - 0.5) * 0.3, z, "nave"]);
  for (let x = -4.2; x <= 4.2; x += 1.1) for (let z = 11; z < 25.5; z += 1.1) { spots.push([x + (R() - 0.5) * 0.3, z, "s"]); if (z > 11.5) spots.push([x + (R() - 0.5) * 0.3, -z, "n"]); }
  const nCong = Math.min(spots.length, NC - nextI - 260);
  for (let k = 0; k < nCong; k++) { const sp = spots[Math.floor(R() * spots.length)]; spots.splice(spots.indexOf(sp), 1); const north = sp[1] < 0, role = north ? (R() < 0.85 ? "norman" : "cleric") : (R() < 0.3 ? "woman" : R() < 0.25 ? "noble" : R() < 0.1 ? "cleric" : "eng");
    const out = sp[2] === "nave" ? [WD, [WD[0] - 6, sp[1] * 0.4], [-50 - R() * 30, -14 - R() * 6], [-40 + R() * 100, -60 - R() * 70]] : [[0, sp[1] * 0.6], ND, [0, -34], [-30 + R() * 140, -60 - R() * 80]];
    const A = agent(role, { cong: true, seat: [sp[0], sp[1]], out: [[sp[0], sp[1]], ...out], leaveAt: T.flee + R() * 200 + (sp[2] === "s" ? 50 : 0), speed: 1.5 + R() * 0.8 });
    A.faceSeat = face(sp[0], sp[1], 10, sp[1] * 0.2); } }
// outside: English onlookers by the north door, Norman guards round the church and along the way
const GUARDS = [];
{ const R = seeded(93); for (let k = 0; k < 70; k++) { const a = R() * Math.PI, r = 14 + R() * 30, x = -10 + Math.cos(a) * r * 1.6, z = -40 - Math.sin(a) * r;
    agent(R() < 0.35 ? "woman" : R() < 0.15 ? "child" : "eng", { fixed: [x, z, face(x, z, 0, -27)], kind: "stand", onlooker: true, fleeTo: [x + (R() - 0.5) * 60, z - 40 - R() * 80], speed: 1.2 + R() }); }
  const posts = [];
  for (let k = 0; k < 14; k++) { const s = 12 + k * 18, [x, z, a] = routeAt(PROC_PATH, s); posts.push([x + Math.cos(a) * 2.6 * (k % 2 ? 1 : -1), z - Math.sin(a) * 2.6 * (k % 2 ? 1 : -1)]); }
  for (const [x, z] of [[-6, -31], [6, -31], [-40, 14], [-40, -14], [30, -15], [30, 15], [-20, -16], [10, -36], [-70, 0], [-30, -30], [45, 0], [20, -30]]) posts.push([x, z]);
  for (const [x, z] of posts) { const A = agent("soldier", { fixed: [x, z, face(x, z, 0, 0) + Math.PI], kind: "guard" }); GUARDS.push(A); } }
// the palace household: cooks, servants carrying food from the kitchen to the hall, people laying the high table, guards at the gate
{ const KD = [PAL.kitchenDoor[0], PAL.kitchenDoor[2]], KI = [PAL.inKitchen[0], PAL.inKitchen[2]], SD = [PAL.southDoor[0], PAL.southDoor[2]], SI = [PAL.inSouth[0], PAL.inSouth[2]];
  PAL.cookSpots.forEach(([x, , z], k) => agent(k === 1 ? "woman" : "eng", { fixed: [x, z, face(x, z, PAL.kitchen.x, PAL.kitchen.z + 0.5)], kind: k === 1 ? "sell" : "hammer", palace: true }));
  for (let k = 0; k < 8; k++) { const t = PAL.seat(k % 2 ? 4.0 : -4.0, -7 + k * 2), path = [KI, KD, SD, SI, [t[0], t[2]]]; agent(k % 3 === 1 ? "woman" : "eng", { loop: path, phase: k * 23, speed: 1.0 + (k % 3) * 0.15, palace: true }); }
  for (let k = 0; k < 3; k++) { const [x, , z] = PAL.seat(-2 + k * 2, 11.4); agent(k === 1 ? "woman" : "eng", { fixed: [x, z, Math.PI / 2], kind: "sell", palace: true }); }
  const [gx, gz] = [PALACE[0] - 44, PALACE[1]]; for (const o of [-3, 3]) { const A = agent("soldier", { fixed: [gx, gz + o, -Math.PI / 2], kind: "guard" }); GUARDS.push(A); } }
// the houses that burn: the nearest of the Westminster vill
const FIRE_H = HOUSES.filter(H => H.kind === "vill" && !H.burnt).sort((a, b) => Math.hypot(a.x, a.z + 40) - Math.hypot(b.x, b.z + 40)).slice(0, 7);
FIRE_H.forEach((H, k) => { H.ignite = T.fire + k * 45; H.state = 0; const G = GUARDS[k * 2 + 1] || GUARDS[k]; if (G) { G.torch = H; G.torchAt = H.ignite; } });
// people about the streets: placed near you as you go, walking the streets, talking at doors
const AMB = []; { const N = NC - nextI; for (let k = 0; k < N; k++) { const A = agent(null, { amb: true }); if (A) AMB.push(A); } }
function placeAmbient(A, px, pz) { const R = Math.random;
  for (let t = 0; t < 25; t++) { if (R() < 0.3 && HOUSES.length) { const H = HOUSES[(R() * HOUSES.length) | 0]; if (H.burnt && R() < 0.6) continue; if (!H.dp || Math.hypot(H.dp[0] - px, H.dp[1] - pz) > 320) continue;   // talking at a doorway
      const ox = Math.sin(H.dp[2]) * 1.4, oz = Math.cos(H.dp[2]) * 1.4; A.mode = "talk"; A.x = H.dp[0] + ox + (R() - 0.5) * 2; A.z = H.dp[1] + oz + (R() - 0.5) * 2; A.h = R() * 6.28; A.kind = R() < 0.15 ? "carry" : "talk"; return true; }
    const S = STREETS[(R() * STREETS.length) | 0], s = R() * S.L.L, [x, z] = S.L.at(s); if (Math.hypot(x - px, z - pz) > 330 || baseH(x, z) < 0.5) continue;
    A.mode = "walk"; A.S = S; A.s = s; A.dir = R() < 0.5 ? 1 : -1; A.lane = (R() - 0.5) * S.w * 0.7; A.v = 1.0 + R() * 0.5; A.kind = R() < 0.12 ? "carry" : "walk"; return true; }
  A.mode = "off"; return false; }
for (const A of AMB) A.mode = "off";
mark("William, duke of Normandy", 0, 0, "person", "William, 38 years old, duke of Normandy since he was about seven; Edward the Confessor's cousin once removed, who claimed Edward had promised him the throne. He won at Hastings on 14 October; today he becomes king of the English. In the Bayeux Tapestry Normans wear their hair cropped, the back of the head shaved.", { follow: PRIN.william, r: 6, range: 120 });
mark("Ealdred, archbishop of York", 0, 0, "person", "Ealdred, archbishop of York since 1061, an experienced churchman and diplomat who had travelled to Rome and Jerusalem. He probably crowned Harold in January, and crowns William today: the archbishop of Canterbury, Stigand, was not recognised by the pope.", { follow: PRIN.ealdred, r: 6, range: 120 });
mark("Geoffrey, bishop of Coutances", 0, 0, "person", "Geoffrey de Montbray, bishop of Coutances in Normandy, who fought at Hastings and became one of the greatest landholders in England. He puts the question to the Normans, in French.", { follow: PRIN.geoffrey, r: 6, range: 120 });
mark("Abbot Edwin", 0, 0, "person", "Edwin, abbot of Westminster under Edward the Confessor and now under William, head of the community of Benedictine monks who serve the abbey.", { follow: PRIN.edwin, r: 5, range: 80 });
mark("The great hall", ...(([x, , z]) => [x, z])(PAL.seat(0, 0)), "inferred", "The king's hall: the heart of any royal residence, where the king ate, held court and gave feasts. Edward's has not been found; this one follows excavated royal halls (Cheddar, Goltho): an aisled timber hall about 30 by 12 m, earth floor strewn with rushes, a long central hearth with no chimney, benches and trestle tables in the aisles, and the high table on a dais at the far end. Embroidered hangings on the walls: wills of the time leave 'hall-hangings'. Today the household is preparing the coronation feast.", { y: 3.2, r: 10, range: 60 });
mark("The high table", ...(([x, , z]) => [x, z])(PAL.seat(0, 12.6)), "inferred", "On the dais, across the end of the hall: the king's chair in the middle, the greatest guests beside him, everyone else at the tables below. After the crowning King William comes back here with the bishops for the feast (a coronation feast was customary; this one is not described).", { y: 1.9, r: 4, range: 30 });
mark("The king's chamber", ...(([x, , z]) => [x, z])(gw(PAL.chamber, 1, 0, -2)), "inferred", "Upstairs in the chamber block, reached by the outside stair: the king's private room. Here, the Life of King Edward says, Edward died on 5 January 1066, with Queen Edith warming his feet, Earl Harold, Archbishop Stigand and the steward Robert fitzWimarc at his bedside; the Bayeux Tapestry shows the deathbed in an upper room and his body being prepared below. The room's form is inferred.", { y: 5.3, r: 6, range: 40 });
mark("The kitchen", ...(([x, , z]) => [x, z])(gw(PAL.kitchen, 0, 0, 0)), "inferred", "A separate kitchen, apart from the hall in case of fire: a central fire with a spit (a pig roasting for the feast), a cauldron, a clay bread oven, a table of loaves, hams hanging from the rafters.", { y: 2.6, r: 5, range: 40 });
mark("Monks of Westminster", -9, 0, "person", "Benedictine monks in black habits, singing the office and the coronation chants from the choir stalls.", { y: 4, r: 8, range: 60 });
mark("Norman lords and knights", 0, -18, "person", "The Norman nobles and knights, on the north side here (where each group stood is not recorded). Mail-shirted soldiers guard the church outside.", { y: 4, r: 10, range: 80 });
mark("The English", 0, 18, "person", "English thegns, churchmen and Londoners. English men wore their hair long, with moustaches; women covered their hair with a headrail.", { y: 4, r: 10, range: 80 });
mark("Norman guards", -10, -48, "person", "Armed Norman knights and soldiers posted round the abbey and in the town: mail hauberks, conical helmets with a nose-guard, kite-shaped shields and spears, as in the Bayeux Tapestry.", { y: 4, r: 14, range: 200 });
// what each kind of person is wearing (E near anyone)
const DRESS = { eng: "An Englishman: knee-length woollen tunic, belted, hose or leg wrappings, a cloak pinned at the shoulder with a brooch; long hair and a moustache (the Tapestry draws the English so, unlike the Normans).",
  woman: "An Englishwoman: an ankle-length gown over a linen underdress, a headrail (veil) covering the hair and shoulders, a cloak in winter. Married women always covered their hair.",
  child: "A child, dressed like the grown-ups in small: tunic or gown, cloak, leather shoes.", norman: "A Norman: tunic and cloak in strong colours, the hair cut short with the back of the head shaved, clean-shaven.",
  soldier: "A Norman soldier: a mail hauberk to the knees over a padded tunic, a conical iron helmet with a nose-guard, a kite-shaped wooden shield, a spear; a sword at the belt.",
  monk: "A Benedictine monk of Westminster: a black habit and cowl, tonsured.", cleric: "A cleric in a white alb, the long linen robe of the clergy at the altar.", bishop: "A bishop: alb, coloured chasuble, mitre (low two-horned mitres were just coming into use in the 1060s).",
  noble: "An English thegn, a landholder of rank: a better-dyed tunic and cloak, a fine brooch.", king: "The king, crowned, in rich robes." };

// ---------- moving everyone, by the clock ----------
function personY(x, z) { if (inAbbey(x, z)) return AB_F; const F = PAL.hall, dx = x - F.x, dz = z - F.z, lx = dx * F.c - dz * F.s, lz = dx * F.s + dz * F.c; if (Math.abs(lx) < 5.85 && lz > 11.15 && lz < 14.9) return F.gy + 0.45;   // the dais
  return Math.max(groundH(x, z), spanY(x, z), WATER - 1.0); }
const _aseed = A => hash(A.i, 5);
function stationPose(A) { const S = SIM, k = A.key, [sx, sz, sh] = A.station; let x = sx, z = sz, h = sh, kind = "stand";
  const shouting = S > T.shout && S < T.shout + 25;
  if (k === "william") { if (S < T.ask1) kind = "pray"; else if (S < T.oath) { h = -Math.PI / 2 + (S > T.flee && S < T.oath ? Math.sin(S * 23) * 0.04 : 0); }   // turned to the people; trembling
    else if (S < T.anoint) { h = Math.PI / 2; kind = "sell"; } else if (S < T.crown + 60) { h = Math.PI / 2; kind = "kneel"; } else if (S < T.throne) h = -Math.PI / 2;
    else { const f = clampN((S - T.throne) / 30, 0, 1); x = lerpN(15.5, 3.45, f); z = Math.sin(f * Math.PI) * 1.4; h = -Math.PI / 2; kind = f < 1 ? "walk" : "sit"; } }
  else if (k === "ealdred") { if (S > T.ask2 && S < T.shout) { kind = "talk"; h = 0; } else if (S > T.anoint && S < T.crown) { kind = "bless"; x = 16.6; } else if (S > T.crown && S < T.crown + 40) { kind = "crown"; x = 16.4; } else if (S > T.mass) { h = Math.PI / 2; x = 17.6; kind = "bless"; } }
  else if (k === "geoffrey") { if (S > T.ask1 && S < T.ask2) { kind = "talk"; h = Math.PI; } else h = Math.PI / 2; }
  else if (k === "candle" || k === "cross" || k === "book") kind = "carry";
  if (shouting && (k === "lord" || !k)) kind = "cheer";
  return [x, z, h, kind]; }
function agentState(A) { const S = SIM;
  if (A.proc) { if (A.key === "lord" && S > T.flee + A.delay * 8) { const s = (S - T.flee - A.delay * 8) * 1.6, P = A.lordOut || (A.lordOut = [[A.station[0], A.station[1]], ND, [0, -34], [-20 + A.delay * 5, -70 - A.delay * 2]]), [x, z, h, done] = routeAt(P, s); return [x, z, done ? face(x, z, 40, -150) : h, done ? "talk" : "walk", !done]; }
    if (S < T.proc + A.delay) return [A.wait[0], A.wait[1], face(A.wait[0], A.wait[1], PAL_IN[0], PAL_IN[1]), A.key === "william" ? "talk" : "stand"];   // gathered in the hall
    if (S > T.leave + (16 - A.delay / 2.4) * 2.4) { const s = (S - T.leave - (16 - A.delay / 2.4) * 2.4) * 0.9, P = A.back || (A.back = [[A.station[0], A.station[1]], ...PROC_PATH.slice().reverse(), PAL_IN, [A.feast[0], A.feast[1]]]), [x, z, h, done] = routeAt(P, s); return done ? [A.feast[0], A.feast[1], A.feast[2], "sit"] : [x, z, h, "walk", true]; }   // back to the hall for the feast
    const s = (S - T.proc - A.delay) * 0.9, [x, z, h, done] = routeAt(A.path, s); if (!done) return [x, z, h, A.key === "candle" || A.key === "cross" || A.key === "book" ? "carry" : "walk", true]; return stationPose(A); }
  if (A.cong) { if (S < A.leaveAt) return [A.seat[0], A.seat[1], A.faceSeat, S > T.shout && S < T.shout + 25 ? "cheer" : "stand"];
    const s = (S - A.leaveAt) * A.speed, [x, z, h, done] = routeAt(A.out, s); if (!done) return [x, z, h, "walk", true, A.speed];
    const F = FIRE_H[A.i % FIRE_H.length], r = _aseed(A); return [x, z, F ? face(x, z, F.x, F.z) : h, r < 0.25 ? "hammer" : r < 0.35 ? "carry" : r < 0.6 ? "talk" : "stand"]; }
  if (A.monk) return [...A.fixed, S > T.shout && S < T.shout + 25 ? "cheer" : "stand"];
  if (A.onlooker) { const go = T.fire + 20 + _aseed(A) * 80; if (S < go) return [...A.fixed, S > T.shout && S < T.shout + 25 ? "cheer" : "stand"];
    const fight = _aseed(A) < 0.45, F = FIRE_H[A.i % FIRE_H.length], tgt = fight && F ? [F.x + Math.cos(A.i) * (F.w / 2 + 3), F.z + Math.sin(A.i) * (F.d / 2 + 3)] : A.fleeTo, P = [[A.fixed[0], A.fixed[1]], tgt], [x, z, h, done] = routeAt(P, (S - go) * A.speed);
    return done ? [x, z, fight && F ? face(x, z, F.x, F.z) : h, fight ? "hammer" : "talk"] : [x, z, h, "walk", true, A.speed]; }
  if (A.torch && S > T.shout + 15) { const H = A.torch, P = [[A.fixed[0], A.fixed[1]], [H.dp[0] + Math.sin(H.dp[2]) * 2, H.dp[1] + Math.cos(H.dp[2]) * 2]], s = (S - T.shout - 15) * Math.max(0.6, Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) / Math.max(10, A.torchAt - T.shout - 15)), [x, z, h, done] = routeAt(P, s);
    return done ? [x, z, face(x, z, H.x, H.z), "guard"] : [x, z, h, "carry", true]; }
  if (A.loop) { const P = A.loop, L = A.loopL || (A.loopL = P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0)), u = (S * A.speed + A.phase * 7) % (2 * L + 16);   // to the hall and back, a pause at each end
    if (u < L) { const [x, z, h] = routeAt(P, u); return [x, z, h, "carry", true]; } if (u < L + 8) { const [x, z, h] = routeAt(P, L); return [x, z, h, "sell"]; }
    if (u < 2 * L + 8) { const [x, z, h] = routeAt(P, 2 * L + 8 - u); return [x, z, h + Math.PI, "walk", true]; } const [x, z, h] = routeAt(P, 0); return [x, z, h + Math.PI, "stand"]; }
  if (A.fixed) return [...A.fixed, A.kind];
  return null; }
let frameN = 0;
let youZone = null, nearDoor = false;
function seen(x, z, d) { if (d > 260) return false; if (INSIDE_H) return d < 60; if (zoneOf(x, z) === youZone) return true; return nearDoor ? d < 120 : false; }   // people in another room or building only through a doorway
function lifeStep(dt, t) { frameN++; const px = P_.x, pz = P_.z, rate = Math.min(timeRate, 8); youZone = zoneOf(px, pz); nearDoor = ALL_DOORS.some(([x, z]) => Math.hypot(x - px, z - pz) < 14);
  for (const A of AG2) {
    if (A.amb) { if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if ((frameN + A.i) % 30 === 0) placeAmbient(A, px, pz); if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if (A.shown) { crowd.hide(A.i); A.shown = false; } continue; } }
      if (A.mode === "walk") { A.s += A.dir * A.v * dt * rate; if (A.s < 0 || A.s > A.S.L.L) { A.dir *= -1; A.s = clampN(A.s, 0, A.S.L.L); }
        const [x, z, a] = A.S.L.at(A.s); A.x = x + Math.cos(a) * A.lane; A.z = z - Math.sin(a) * A.lane; A.h = A.dir > 0 ? a : a + Math.PI; }
      const d = Math.hypot(A.x - px, A.z - pz), step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
      if (!seen(A.x, A.z, d)) { if (A.shown) { crowd.hide(A.i); A.shown = false; } continue; }
      crowd.set(A.i, A.x, personY(A.x, A.z), A.z, A.h, A.mode === "walk" ? A.kind : A.kind, t, A.mode === "walk" ? A.v * rate : 1); A.shown = true; continue; }
    const st = agentState(A); if (!st) { if (A.shown) { crowd.hide(A.i); A.shown = false; } continue; }
    const [x, z, h, kind, moving, sp] = st; A.x = x; A.z = z; A.h = h; A.kind = kind; const d = Math.hypot(x - px, z - pz);
    if (!seen(x, z, d)) { if (A.shown) { crowd.hide(A.i); A.shown = false; } continue; }
    const step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
    if (A.key === "william") { const crowned = SIM > T.crown + 20; if (crowned !== !!A.crowned) { A.crowned = crowned; A.L = looks(A.i, crowned ? "king" : "norman"); crowd.look(A.i, A.L); } }
    let y = personY(x, z); if (A.key === "william" && kind === "sit") y = AB_Y + 0.76;
    crowd.set(A.i, x, y, z, h, kind, t, moving ? Math.min(2, (sp || 0.9) / 1.2) * Math.min(rate, 3) : 1); A.shown = true; }
  crowd.done(); }

// ---------- fire and smoke ----------
const fireM = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const FIRE_IM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 3, 6).translate(0, 1.5, 0), fireM, FIRE_H.length * 7); FIRE_IM.frustumCulled = false; scene.add(FIRE_IM);
for (let k = 0; k < FIRE_IM.count; k++) FIRE_IM.setMatrixAt(k, ZEROM);
const fireLight = new THREE.PointLight(0xff8030, 0, 120, 1.4); scene.add(fireLight);
class Smoke { constructor(n, size, col, op) { this.n = n; this.P = []; const pos = new Float32Array(n * 3).fill(-9999); this.geo = new THREE.BufferGeometry(); this.geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const st = tex(64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.pts = new THREE.Points(this.geo, new THREE.PointsMaterial({ size, map: st, color: col, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true })); this.pts.frustumCulled = false; scene.add(this.pts);
    for (let k = 0; k < n; k++) this.P.push({ age: 1e9, life: 1 }); this.k = 0; }
  emit(x, y, z, vy, life, spread = 0.4) { const p = this.P[this.k]; this.k = (this.k + 1) % this.n; Object.assign(p, { x: x + (Math.random() - 0.5) * spread, y, z: z + (Math.random() - 0.5) * spread, vy: vy * (0.8 + Math.random() * 0.4), age: 0, life }); }
  step(dt) { const a = this.geo.attributes.position.array; for (let k = 0; k < this.n; k++) { const p = this.P[k]; if (p.age > p.life) { a[3 * k + 1] = -9999; continue; } p.age += dt; p.y += p.vy * dt; p.x += 0.5 * dt * (0.3 + p.age / p.life); p.z += 0.15 * dt;
    a[3 * k] = p.x; a[3 * k + 1] = p.y; a[3 * k + 2] = p.z; } this.geo.attributes.position.needsUpdate = true; } }
const hearthSmoke = new Smoke(IS_HEADSET ? 300 : 600, 2.6, 0xb0b0ae, 0.22), fireSmoke = new Smoke(IS_HEADSET ? 300 : 500, 9, 0x4a4642, 0.4);
let smokeHouses = [], smokeT = 0;
const charCol = new THREE.Color(0x2a2420), wallCol = new THREE.Color(0xe8e0d8);
function fireStep(dt, t) { let sum = 0, cx = 0, cz = 0, k = 0;
  for (const H of FIRE_H) { const age = SIM - H.ignite, f = age < 0 ? 0 : age < 150 ? age / 150 : age < 1200 ? 1 : age < 3000 ? 1 - 0.85 * (age - 1200) / 1800 : Math.max(0, 0.15 * (1 - (age - 3000) / 4000));
    const collapsed = age > 1200; if (collapsed !== (H.state === 2)) { H.state = collapsed ? 2 : 0; for (const m of H.fx || []) { const roofy = /\|(thatch|shingle)$/.test(m.userData.key); if (roofy) m.visible = !collapsed; else m.material = collapsed ? G_MAT.char : m.userData.mat0; } }
    for (let q = 0; q < 7; q++) { const idx = k * 7 + q; if (f <= 0.01) { FIRE_IM.setMatrixAt(idx, ZEROM); continue; } const u = (q / 6 - 0.5) * H.d * 0.8, c = Math.cos(H.ry), s = Math.sin(H.ry), x = H.x + s * u, z = H.z + c * u, top = collapsed ? H.gy + 0.4 : H.gy + H.wh + H.rh * 0.4;
      const sc = f * (0.7 + 0.35 * Math.sin(t * (9 + q) + q * 1.7)) * (collapsed ? 0.8 : 1.4); O3.position.set(x, top, z); O3.rotation.set(0, t + q, 0); O3.scale.set(sc * 1.2, sc * (1.2 + 0.3 * Math.sin(t * 13 + q)), sc * 1.2); O3.updateMatrix(); FIRE_IM.setMatrixAt(idx, O3.matrix); }
    if (f > 0.01) { sum += f; cx += H.x * f; cz += H.z * f; if (Math.random() < f * dt * 14) fireSmoke.emit(H.x, H.gy + H.wh + H.rh, H.z, 2.2, 22, 4); }
    else if (age > 0 && age < 9000 && Math.random() < dt * 2) fireSmoke.emit(H.x, H.gy + 1, H.z, 1.2, 18, 3);
    k++; }
  FIRE_IM.instanceMatrix.needsUpdate = true;
  if (sum > 0) { fireLight.position.set(cx / sum, AB_Y + 6, cz / sum); fireLight.intensity = Math.min(3, sum) * 120 * (0.85 + 0.15 * Math.sin(t * 17)); } else fireLight.intensity = 0;
  smokeT -= dt; if (smokeT <= 0) { smokeT = 2; smokeHouses = HOUSES.filter(H => !H.burnt && H.state !== 2 && hash(H.x | 0, H.z | 0) < 0.6 && Math.abs(H.x - P_.x) < 220 && Math.abs(H.z - P_.z) < 220).slice(0, 120); }
  if (smokeHouses.length) for (let n = 0; n < Math.ceil(dt * 30); n++) { const H = smokeHouses[(Math.random() * smokeHouses.length) | 0]; if (H !== INSIDE_H) hearthSmoke.emit(H.x, H.gy + H.wh + H.rh * 0.85, H.z, 0.5, 14, 1.2); }
  hearthSmoke.step(dt); fireSmoke.step(dt); }

// ---------- inside a house ----------
// Built when you go in, from what excavated houses held: a central hearth, benches and beds along the walls, a loom, a quern,
// pots, a chest; and since it is Christmas Day, a household at its feast (the Advent fast is over).
let INSIDE_H = null, IN = null;
const houseLight = new THREE.PointLight(0xff9a50, 0, 14, 1.3); scene.add(houseLight);
const ITEMS_TXT = { hearth: "The hearth, in the middle of the floor: a bed of clay or reused Roman tile. There is no chimney; the smoke finds its way out through the thatch, blackening the rafters. In winter the fire is kept in all day for warmth, light and cooking.",
  loom: "A loom. Spinning and weaving were women's daily work. By the 11th century the two-beam upright loom was replacing the old warp-weighted loom (whose clay loomweights are found in earlier Saxon London).",
  quern: "A rotary quern of lava stone from the Mayen quarries in the Rhineland, imported to London in large numbers: grain was ground into flour by hand, every day.",
  pots: "Cooking pots and storage jars: London's own Late Saxon Shelly ware (clay tempered with crushed shell), with finer glazed pitchers from Stamford and Thetford-type wares from East Anglia.",
  beds: "Bed platforms along the walls, with straw or bracken, woollen blankets and sheepskins. The household slept round the fire.",
  chest: "A wooden chest with an iron lock for what was valuable: cloth, a brooch, a few silver pennies. London had more moneyers than any other English mint; this year's coins carry Harold's head, and soon William's.",
  table: "The Christmas feast on a trestle board: bread, a pottage of beans or peas, pork or beef, cheese, and ale. Christmas was one of the great feasts of the year; the Twelve Days were a holiday by law under King Alfred.",
  cellar: "A trapdoor to the cellar, lined with planks: many Late Saxon London houses had one, for storage, found by archaeologists as rectangular pits with timber linings.",
  cauldron: "An iron cauldron hung from a chain over the fire, for the pottage." };
function makeInterior(H) { const g = new THREE.Group(), Y = H.gy, iw = H.w - 0.25, id = H.d - 0.25, items = [], gr = [];
  const wallT = (H.wall === "daub" ? daubT : plankT).clone(); wallT.repeat.set(2, 1); wallT.needsUpdate = true;
  const box = new THREE.Mesh(new THREE.BoxGeometry(iw, H.wh, id).translate(0, H.wh / 2, 0), new THREE.MeshStandardMaterial({ map: wallT, side: THREE.BackSide, roughness: 0.95 })); g.add(box);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(iw, id).rotateX(-Math.PI / 2), M(0x4a3e30, { roughness: 1 })); fl.position.y = 0.02; g.add(fl);
  if (!H.hip) for (const sz of [-1, 1]) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([-iw / 2, H.wh, sz * id / 2, iw / 2, H.wh, sz * id / 2, 0, H.wh + H.rh * 0.96, sz * id / 2], 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, iw / 2, 0, iw / 4, H.rh / 2], 2)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: wallT, side: THREE.DoubleSide, roughness: 0.95 })); g.computeVertexNormals(); gr.push(m); }
  for (const m of gr) g.add(m);
  { const [dx, dz] = toLocal(H, H.dp[0], H.dp[1]), onX = Math.abs(dx) > Math.abs(dz), dm = new THREE.Mesh(new THREE.PlaneGeometry(0.95, Math.min(1.8, H.wh - 0.2)), new THREE.MeshStandardMaterial({ map: plankT, roughness: 0.9 }));
    dm.position.set(onX ? Math.sign(dx) * (iw / 2 - 0.02) : 0, Math.min(1.8, H.wh - 0.2) / 2, onX ? 0 : Math.sign(dz) * (id / 2 - 0.02)); dm.rotation.y = onX ? -Math.sign(dx) * Math.PI / 2 : dz > 0 ? Math.PI : 0; g.add(dm); }
  for (let k = 1; k < Math.floor(id / 1.6); k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(iw, 0.14, 0.14), M(0x2a2018)); r.position.set(0, H.wh, -id / 2 + k * 1.6); g.add(r); }   // tie-beams, sooty
  const it = (key, x, z, obj) => { obj.position.set(x, obj.position.y, z); g.add(obj); items.push({ key, x, z }); };
  const hearth = new THREE.Group(); hearth.add(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.08, 10), M(0x6a5448))); const fl2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 6).translate(0, 0.3, 0), flameM); hearth.add(fl2);
  for (let k = 0; k < 5; k++) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 5), M(0x2a1a10)); lg.rotation.set(Math.PI / 2, 0, k * 1.25); lg.position.y = 0.1; hearth.add(lg); } it("hearth", 0, 0, hearth);
  const caul = new THREE.Group(); const cb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.iron); cb.position.y = 0.95; caul.add(cb); const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, H.wh - 0.9, 4), MAT.iron); ch.position.y = 0.95 + (H.wh - 0.95) / 2; caul.add(ch); it("cauldron", 0.05, 0.05, caul);
  const side = iw / 2 - 0.45;
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, id * 0.6).translate(0, 0.225, 0), M(0x5a4a38)); it("beds", sx * side, -id * 0.1, b); const fur = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, id * 0.45).translate(0, 0.49, 0), M(sx > 0 ? 0xc8b898 : 0x7a5a3a)); fur.position.set(sx * side, 0, -id * 0.1); g.add(fur); }
  const tb = new THREE.Group(); tb.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 2.0).translate(0, 0.72, 0), M(0x6a5236))); for (const z of [-0.8, 0.8]) tb.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08).translate(0, 0.35, z), M(0x5a4430)));
  for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(k % 3 ? new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8).translate(0, 0.81, 0) : new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10).translate(0, 0.79, 0), M(k % 3 ? 0x7a5a3a : 0xc8a870)); c.position.set((k % 2 - 0.5) * 0.4, 0, -0.8 + k * 0.32); tb.add(c); }
  it("table", 0, -id * 0.28, tb);
  const loom = new THREE.Group(); for (const x of [-0.7, 0.7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 0.1).translate(0, 1.0, 0), M(0x5a4430)); p.position.x = x; loom.add(p); }
  const bm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), M(0x5a4430)); bm.position.y = 1.9; loom.add(bm); const bm2 = bm.clone(); bm2.position.y = 0.3; loom.add(bm2);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), M([0x8a2a2a, 0x3a5a7a, 0x9a8a5a][(hash(H.x | 0, 3) * 3) | 0], { side: THREE.DoubleSide })); cloth.position.y = 1.1; loom.add(cloth); loom.rotation.y = Math.PI; it("loom", 0, id / 2 - 0.35, loom);
  const q = new THREE.Group(); q.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.09, 12).translate(0, 0.045, 0), M(0x5a5a5e))); q.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12).translate(0, 0.13, 0), M(0x4a4a4e))); it("quern", -side + 0.1, id * 0.33, q);
  const pots = new THREE.Group(); for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.12, 0.02], [0.17, 0.12], [0.16, 0.24], [0.12, 0.3], [0.13, 0.33]].map(([r, y]) => new THREE.Vector2(r, y)), 10), M(k % 2 ? 0x4a3e34 : 0x6a5040, { side: THREE.DoubleSide })); p.position.set((k % 2) * 0.35, 0, Math.floor(k / 2) * 0.35); pots.add(p); } it("pots", side - 0.1, id * 0.33, pots);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.5).translate(0, 0.25, 0), M(0x4e3a26)); it("chest", side - 0.05, -id * 0.42, chest);
  const trap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(-Math.PI / 2), M(0x3a2c1e)); trap.position.y = 0.03; it("cellar", -side + 0.5, -id * 0.42, trap);
  const fam = [], R = seeded(H.x | 0), roles = ["eng", "woman", "child", "woman", "eng", "child"], n = 3 + Math.floor(R() * 3);
  for (let k = 0; k < n; k++) { const sx = k % 2 ? 1 : -1, z = -id * 0.28 - 0.7 + Math.floor(k / 2) * 0.7, p = personMesh(9000 + (H.x | 0) * 7 + k, roles[k], "sit", sx * 0.75, 0.0, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2); p.position.y = -0.0; g.add(p); fam.push({ role: roles[k], x: sx * 0.75, z }); }
  const bench = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 2.0).translate(0, 0.21, 0), M(0x5a4430)); for (const sx of [-1, 1]) { const b = bench.clone(); b.position.set(sx * 0.85, 0, -id * 0.28); g.add(b); }
  g.position.set(H.x, Y, H.z); g.rotation.y = H.ry; scene.add(g); return { g, items, fam, flame: fl2 }; }
function toLocal(H, x, z) { const dx = x - H.x, dz = z - H.z, c = Math.cos(H.ry), s = Math.sin(H.ry); return [dx * c - dz * s, dx * s + dz * c]; }
function toWorld(H, lx, lz) { const c = Math.cos(H.ry), s = Math.sin(H.ry); return [H.x + lx * c + lz * s, H.z - lx * s + lz * c]; }
function enterHouse(H) { INSIDE_H = H; IN = makeInterior(H); H.coll.on = false;
  const [lx, lz] = toLocal(H, H.dp[0], H.dp[1]), f = 0.75; [P_.x, P_.z] = toWorld(H, lx * f, lz * f); yaw = Math.atan2(-(H.x - P_.x), -(H.z - P_.z)); if (renderer.xr.isPresenting) vrTurn = yaw;
  say("<b>Inside a house</b> · Press E near things to learn about them, or near a person; E at the doorway to go out.", 10); }
function leaveHouse() { const H = INSIDE_H; if (!H) return; scene.remove(IN.g); IN.g.traverse(o => { o.geometry?.dispose?.(); }); H.coll.on = true;
  const s = Math.sin(H.dp[2]), c = Math.cos(H.dp[2]); P_.x = H.dp[0] + s * 1.2; P_.z = H.dp[1] + c * 1.2; INSIDE_H = null; IN = null; houseLight.intensity = 0; }
function insideStep(t) { const H = INSIDE_H, [lx, lz] = toLocal(H, P_.x, P_.z), hw = H.w / 2 - 0.45, hd = H.d / 2 - 0.45; let X = clampN(lx, -hw, hw), Z = clampN(lz, -hd, hd);
  if (Math.hypot(X, Z) < 0.95) { const a = Math.atan2(Z, X); X = Math.cos(a) * 0.95; Z = Math.sin(a) * 0.95; }   // not into the fire
  [P_.x, P_.z] = toWorld(H, X, Z); const fl = 0.85 + 0.1 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29); IN.flame.scale.set(1, fl * 1.2, 1); houseLight.position.set(H.x, H.gy + 0.9, H.z); houseLight.intensity = 9 * fl; }
function insideInteract() { const H = INSIDE_H, [lx, lz] = toLocal(H, P_.x, P_.z), [dx, dz] = toLocal(H, H.dp[0], H.dp[1]);
  if (Math.hypot(lx - dx, lz - dz) < 1.8) return leaveHouse();
  let best = null, bd = 1.9; for (const I of IN.items) { const d = Math.hypot(I.x - lx, I.z - lz); if (d < bd) { bd = d; best = I; } }
  for (const F of IN.fam) { const d = Math.hypot(F.x - lx, F.z - lz); if (d < bd - 0.3) { bd = d; best = { fam: F }; } }
  if (best?.fam) return say(DRESS[best.fam.role] + " The family is at its Christmas meal.", 14); if (best) return say(ITEMS_TXT[best.key], 16);
  say("Walk closer to something to read about it; E at the doorway to go out.", 5); }
function nearDoorHouse() { let best = null, bd = 2.2; const L = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) L.push(...(COLL.get((Math.floor(P_.x / CC) + i) * 100003 + Math.floor(P_.z / CC) + j) || []));
  for (const r of L) { const H = r.tag; if (!H || !H.dp || H.burnt || H.state === 2) continue; const d = Math.hypot(H.dp[0] - P_.x, H.dp[1] - P_.z); if (d < bd) { bd = d; best = H; } } return best; }

// ---------- the abbey's own markers ----------
mark("Westminster Abbey", -14, -14, "known", "Edward the Confessor's abbey church of St Peter: the first Romanesque church in England, built in the new Norman manner from about 1050, consecrated on 28 December 1065. Edward was buried here on 6 January; Harold was probably crowned here the same day; today William. The plan is known from foundations found under the present church (rebuilt by Henry III from 1245); the look of it from the Bayeux Tapestry (with a crossing tower and a man fixing the weathercock) and the Life of King Edward. The crossing tower, transepts and east end were finished; the nave was still being built.", { big: true, range: 5000, y: 46, r: 45 });
mark("The unfinished nave", -48, 0, "inferred", "Most historians (Gem, Fernie) think the nave was completed only in the 1080s or later, and the two western towers later still. So here the western bays stand at arcade and gallery height in scaffolding, and a timber wall closes the finished part. How far the work had got in 1066 is not known.", { y: 14, r: 18, range: 400 });
mark("The north door", 0, -30, "inferred", "With the nave unfinished, the way in was probably by a transept door. The north transept front became the abbey's main entrance in the 13th-century church.", { y: 6, r: 8, range: 250 });
mark("The high altar", 18.5, 0, "known", "The high altar of St Peter, in the presbytery before the apse. The coronation was performed here: the oath, the anointing, the crowning.", { y: 3.2, r: 4, range: 60 });
mark("King Edward's tomb", 13.8, 0, "known", "Edward the Confessor, died 5 January 1066, buried the next day before the high altar of his new church. A plain tomb until he was made a saint (1161) and moved to a shrine (1163); Henry III rebuilt the abbey around his shrine.", { y: 1.8, r: 3, range: 50 });
mark("The throne", 3.4, 0, "inferred", "After the crowning the king was enthroned. Where the throne stood in 1066 is not recorded; at later coronations it was on a raised stage at the crossing.", { y: 2.6, r: 3, range: 50 });
mark("The arcades", -20, 5, "known", "Arcade, gallery and clerestory in three storeys, with piers alternating between compound piers (with a shaft running up the wall) and round columns, as at Jumièges in Normandy. Bases of the piers were found in excavation. Caen stone, pale cream. The flat painted timber ceiling is inferred.", { y: 9, r: 10, range: 80 });

// ---------- you ----------
const SPEEDS = [[1.4, "walking"], [4, "jogging"], [12, "fast"], [40, "very fast"]];
const keys = {}; let yaw = 0, pitch = -0.05, dragging = false, started = false, speedI = 0, flying = false, labelsOn = true;
const START = { x: 46, z: -78, look: [0, -20] };
const P_ = { x: START.x, z: START.z, y: 0 }; yaw = Math.atan2(-(START.look[0] - START.x), -(START.look[1] - START.z));
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
  say("Westminster, Christmas morning 1066. Before you, Edward the Confessor's new abbey; to your right, the houses of the little vill. At 10:00 William's procession comes from the palace (to the south-east) to the north door. Walk anywhere: into the abbey, along the Strand to the City, across London Bridge. Markers name things and say how well we know them: press E near one to read it.", 22); }
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
function groundAt(x, z) { if (INSIDE_H) return INSIDE_H.gy + 0.02; const base = inAbbey(x, z) ? AB_F : Math.max(groundH(x, z), spanY(x, z)), s = surfAt(x, z); return s > base && s <= P_.y + 0.7 ? s : base; }   // stairs and upper floors: only if you can step onto them
function standSpot(x, z, avoidAbbey = true) { for (let r = 0; r < 80; r += 4) for (let a = 0; a < 6.28; a += r ? 0.5 : 7) { const X = x + Math.cos(a) * (r + 10), Z = z + Math.sin(a) * (r + 10), v = rGet(X, Z);
  if (groundAt(X, Z) < 0.3 || v === 2 || v === 7 || (avoidAbbey && inAbbey(X, Z))) continue; const p = { x: X, z: Z }; pushOut(p); if (Math.hypot(p.x - X, p.z - Z) < 0.01) return [X, Z]; } return [x + 12, z + 12]; }
function teleport(x, z, lx, lz, high = false) { if (INSIDE_H) leaveHouse(); P_.x = x; P_.z = z; P_.y = high ? 1e9 : -1e9; P_.y = groundAt(x, z); yaw = Math.atan2(-(lx - x), -(lz - z)); if (renderer.xr.isPresenting) vrTurn = yaw; flying = false; updateGround(x, z, 99); }
// places: everything named, all open from the start; and the moments of the coronation
const PLACES = [{ name: "Outside the abbey (start)", at: [START.x, START.z], look: START.look }, { name: "Inside the abbey: south transept", at: [2.5, 15], look: [15, 0] }, { name: "Inside the abbey: the nave", at: [-28, 2.5], look: [10, 0] }];
for (const m of MARKS) if (m.tag !== "person" && m.tag !== "typical" && !m.hidden && !["The high altar", "King Edward's tomb", "The throne", "The arcades", "The north door"].includes(m.name)) PLACES.push({ name: m.name, m });
function goPlace(p) { start(); if (p.at) { teleport(p.at[0], p.at[1], p.look[0], p.look[1]); say(`<b>${p.name}</b>`, 5); return; } const zn = zoneOf(p.m.x, p.m.z) && !inAbbey(p.m.x, p.m.z);
  if (zn) teleport(p.m.x - 2, p.m.z + 1.5, p.m.x, p.m.z, (p.m.y || 0) > 4); else { const [x, z] = standSpot(p.m.x, p.m.z + 20); teleport(x, z, p.m.x, p.m.z); } say(`<b>${p.m.name}</b> · <span style="color:${TAGC[p.m.tag]}">${TAGN[p.m.tag]}</span> · ${p.m.text}`, 24); }
function goMoment(k) { start(); const [name, tm] = MOMENTS[k]; SIM = tm; narrI = -1; momentI = k;
  const view = k <= 1 ? [[46, -78], [0, -20]] : k === 3 || k === 4 ? (Math.hypot(P_.x, P_.z) > 300 || inAbbey(P_.x, P_.z) ? [[34, -64], [60, -170]] : null) : k === 9 ? [[60, -50], [0, -27]] : (inAbbey(P_.x, P_.z) ? null : [[2.5, 15], [15, 0]]);
  if (view && (Math.hypot(P_.x - view[0][0], P_.z - view[0][1]) > 40)) teleport(view[0][0], view[0][1], view[1][0], view[1][1]); drawGuide(); }
let momentI = 0; function nextMoment() { goMoment((momentI + 1) % MOMENTS.length); }
const TAGC = { known: "#9ad87a", inferred: "#f0c060", typical: "#8ab8f0", absent: "#e08a8a", person: "#d8a8f0" }, TAGN = { known: "known", inferred: "inferred: place known, form guessed", typical: "typical: a stand-in", absent: "not there in 1066", person: "person" };
function drawGuide() { GUIDE.innerHTML = `<b>Coronation</b> <span style="color:#c8b898">· click to go to the moment</span>` + MOMENTS.map(([n, tm], i) => `<div data-m="${i}" style="cursor:pointer;padding:1px 4px">${String(Math.floor(tm / 3600)).padStart(2, "0")}:${String(Math.floor(tm / 60) % 60).padStart(2, "0")} ${n}</div>`).join("") +
  `<div style="margin:6px 0 2px"><span data-r="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">time ×${timeRate} (T)</span> <span data-l="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">markers ${labelsOn ? "on" : "off"} (L)</span></div>` +
  `<b>Places</b> <span style="color:#c8b898">· click to go</span>` + PLACES.map((p, i) => `<div data-i="${i}" style="cursor:pointer;padding:1px 4px">${p.m ? `<span style="color:${TAGC[p.m.tag]}">●</span> ` : "◆ "}${p.name}</div>`).join("") +
  `<div style="color:#c8b898;font-size:11.5px;margin-top:6px"><span style="color:${TAGC.known}">●</span> known &nbsp;<span style="color:${TAGC.inferred}">●</span> inferred &nbsp;<span style="color:${TAGC.typical}">●</span> typical &nbsp;<span style="color:${TAGC.absent}">●</span> not yet built &nbsp;<span style="color:${TAGC.person}">●</span> people</div>`; }
GUIDE.addEventListener("click", e => { e.stopPropagation(); const d = e.target.closest("[data-i],[data-m],[data-r],[data-l]"); if (!d) return; if (d.dataset.i) goPlace(PLACES[+d.dataset.i]); else if (d.dataset.m) goMoment(+d.dataset.m); else if (d.dataset.r) cycleRate(); else { labelsOn = !labelsOn; drawGuide(); } });
drawGuide();
function interact() { if (!started) return start(); if (INSIDE_H) return insideInteract(); const DH = nearDoorHouse(); if (DH) return enterHouse(DH);
  let best = null, bd = 1e9; for (const m of MARKS) { const [x, z] = m.follow ? [m.follow.x, m.follow.z] : [m.x, m.z], d = Math.hypot(x - P_.x, z - P_.z); if (d < m.r && d / m.r < bd) { bd = d / m.r; best = m; } }
  let pa = null, pd = 3; for (const A of AG2) { if (!A.shown) continue; const d = Math.hypot(A.x - P_.x, A.z - P_.z); if (d < pd) { pd = d; pa = A; } }
  const named = pa && MARKS.find(m => m.follow === pa); if (named) best = named;
  if (best && (!pa || named || bd < 0.5)) return say(`<b>${best.name}</b> · <span style="color:${TAGC[best.tag]}">${TAGN[best.tag]}</span> · ${best.text}`, 26);
  if (pa) return say(DRESS[pa.L.role] || "A Londoner.", 12);
  if (best) return say(`<b>${best.name}</b> · <span style="color:${TAGC[best.tag]}">${TAGN[best.tag]}</span> · ${best.text}`, 26);
  say("Nothing to read right here. Walk up to a marker (or a person) and press E; at a house doorway, E goes in.", 6); }

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
const MX0 = RX0, MZ0 = RZ0, MW = RW * RC, MH = RH * RC, MPX = 6, MAPBASE = document.createElement("canvas"); MAPBASE.width = Math.ceil(MW / MPX); MAPBASE.height = Math.ceil(MH / MPX);
{ const g = MAPBASE.getContext("2d"), W = MAPBASE.width, Hh = MAPBASE.height, img = g.createImageData(W, Hh), WG = 12, gw = Math.ceil(MW / WG) + 1, wet = new Uint8Array(gw * (Math.ceil(MH / WG) + 1));
  for (let j = 0; j * WG <= MH; j++) for (let i = 0; i * WG <= MW; i++) wet[j * gw + i] = baseH(MX0 + i * WG, MZ0 + j * WG) < 0 ? 1 : 0;
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) { const x = MX0 + i * MPX, z = MZ0 + j * MPX, k = 4 * (j * W + i), v = rGet(x, z); let r = 150, gr = 156, b = 112;
    if (wet[Math.round((z - MZ0) / WG) * gw + Math.round((x - MX0) / WG)]) { r = 84; gr = 108; b = 122; } else if (v === 1) { r = 196; gr = 178; b = 140; } else if (v === 2) { r = 120; gr = 84; b = 54; } else if (v === 7) { r = 70; gr = 64; b = 58; } else if (v === 6) { r = 60; gr = 50; b = 44; } else if (v === 3) { r = 150; gr = 140; b = 100; } else if (v === 4) { r = 140; gr = 150; b = 104; }
    img.data[k] = r; img.data[k + 1] = gr; img.data[k + 2] = b; img.data[k + 3] = 255; }
  g.putImageData(img, 0, 0); g.fillStyle = "#e8dcc0"; for (const H of HOUSES) { const i = (H.x - MX0) / MPX, j = (H.z - MZ0) / MPX; g.fillStyle = H.burnt ? "#2a2420" : "#7a5434"; g.fillRect(i - 1, j - 1, 2, 2); }
  g.fillStyle = "#d8d0c0"; g.fillRect((NAVE_W - MX0) / MPX, (-11 - MZ0) / MPX, (CHOIR_E + 6 - NAVE_W) / MPX, 22 / MPX); g.fillRect((-6 - MX0) / MPX, (-28 - MZ0) / MPX, 12 / MPX, 56 / MPX); }
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
const dayUp = new THREE.Color(), dayHor = new THREE.Color();
buildHouses(new Set(FIRE_H)); buildKit(scene);
const ALL_DOORS = [ND, WD, ...ZONES.flatMap(Z => Z.doors.map(([a, b]) => { const p = gw(Z.F, a, 0, b); return [p[0], p[2]]; }))];
P_.y = groundAt(P_.x, P_.z); updateGround(P_.x, P_.z, 99);
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  if (started) SIM += dt * timeRate;
  let ni = -1; for (let k = 0; k < NARR.length; k++) if (SIM >= NARR[k][0]) ni = k;
  if (ni !== narrI) { const first = narrI === -1 && ni === 0 && !started; narrI = ni; if (ni >= 0 && started && !first && Math.hypot(P_.x, P_.z) < 1800) say(`<b>${String(Math.floor(NARR[ni][0] / 3600)).padStart(2, "0")}:${String(Math.floor(NARR[ni][0] / 60) % 60).padStart(2, "0")}</b> · ${NARR[ni][1]}`, 24); }
  let mx = 0, my = 0, run = 1, up = 0;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) nextMoment(); if (tap("L", gp, 5)) cycleRate(); }
      else { if (gp.buttons[0]?.value > 0.3) run = 3; if (tap("R", gp, 4)) interact(); if (tap("R", gp, 5)) { placeI = (placeI + 1) % PLACES.length; goPlace(PLACES[placeI]); }
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 3; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; if (flying) up = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0); }
  fwd.y = 0; fwd.normalize(); side.crossVectors(fwd, UP).normalize();
  const sp = (INSIDE_H || inAbbey(P_.x, P_.z) ? Math.min(SPEEDS[speedI][0], 1.4) : SPEEDS[speedI][0]) * run;
  if (mx || my) { const ox = P_.x, oz = P_.z; P_.x += (fwd.x * -my + side.x * mx) * sp * dt; P_.z += (fwd.z * -my + side.z * mx) * sp * dt;
    const high = flying && P_.y > groundAt(P_.x, P_.z) + 6; if (!high && !INSIDE_H) pushOut(P_);
    if (!flying && !INSIDE_H && groundAt(P_.x, P_.z) < -0.7) { P_.x = ox; P_.z = oz; } }   // the river is too deep to wade: use the bridge
  if (INSIDE_H) { flying = false; insideStep(t); }
  const g = groundAt(P_.x, P_.z);
  if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + Math.max(3.2, sp * 1.2) * dt) : Math.max(g, P_.y - Math.max(7, sp) * dt);
  rig.position.set(P_.x, P_.y + (vr && SITTING ? 0.45 : 0), P_.z);
  updateGround(P_.x, P_.z);
  lifeStep(dt, t); fireStep(dt, t);
  // the sun, low in the south all day; sky and light
  const hour = SIM / 3600, S = sunAt(hour), el = S.el, day = clampN(el * 7 + 0.35, 0, 1), dusk = clampN(1 - el * 9, 0, 1) * (el > -0.12 ? 1 : 0);
  sun.position.copy(rig.position).addScaledVector(S.dir, 800); sun.target.position.copy(rig.position);
  sun.intensity = 2.2 * clampN(el * 6, 0, 1); sun.color.setRGB(1, 0.88 - 0.25 * dusk, 0.74 - 0.4 * dusk); hemi.intensity = 0.2 + 1.45 * day;
  const inA = inAbbey(P_.x, P_.z) && !flying, zn = flying ? null : zoneOf(P_.x, P_.z), Z = zn && zn !== "abbey" ? ZONES.find(q => q.name === zn) : null;
  hemi.groundColor.setHex(inA ? 0x9a8c78 : 0x7a7060); if (INSIDE_H) { sun.intensity *= 0.1; hemi.intensity *= 0.12; } else if (inA) { sun.intensity *= 0.12; hemi.intensity *= 0.75; } else if (Z) { sun.intensity *= 0.1; hemi.intensity *= 0.3; }
  if (Z) { const up = Z.light0 && P_.y < Z.F.gy + 2.5, lp = gw(Z.F, ...(up ? Z.light0 : Z.light)); houseLight.position.set(...lp); houseLight.distance = Z.name === "hall" ? 34 : 14; houseLight.intensity = (Z.name === "hall" ? 65 : 16) * (0.88 + 0.08 * Math.sin(t * 13) + 0.04 * Math.sin(t * 29)); } else if (!INSIDE_H) houseLight.intensity = 0;
  abbeyLight.intensity = Math.hypot(P_.x, P_.z) < 90 ? (inA ? 260 : 30) * (0.9 + 0.1 * Math.sin(t * 7)) : 0;
  dayUp.setRGB(0.55, 0.62, 0.72).multiplyScalar(0.05 + 0.95 * day); dayHor.setRGB(0.80, 0.80, 0.80).multiplyScalar(0.06 + 0.94 * day).lerp(_c1.setRGB(0.95, 0.62, 0.40), dusk * 0.5);
  skyMat.uniforms.up.value.copy(dayUp); skyMat.uniforms.hor.value.copy(dayHor); scene.fog.color.copy(dayHor); sky.position.copy(rig.position);
  sunDisc.position.copy(rig.position).addScaledVector(S.dir, 20000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.03;
  water.position.x = Math.round(P_.x / 500) * 500; water.position.z = Math.round(P_.z / 500) * 500;
  lblT -= dt; if (lblT <= 0) { lblT = 0.15; updateLabels(); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.25; if (MAPC.style.display !== "none" && !vr) drawMap(MAPC, 240, MAP_SPANS[mapSpanI]); if (vr) { drawMap(wristC, 512, MAP_SPANS[mapSpanI]); wristT.needsUpdate = true; } }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3;
    const hh = Math.floor(SIM / 3600), mi = Math.floor(SIM / 60) % 60, DH = INSIDE_H ? null : nearDoorHouse();
    let nearM = null, nd = 1e9; for (const m of MARKS) { if (m.follow || m.hidden) continue; const d = Math.hypot(m.x - P_.x, m.z - P_.z); if (d < m.r && d < nd) { nd = d; nearM = m; } }
    const room = { hall: "in the great hall of Edward's palace", chamber: P_.y > PAL.chamber.gy + 2 ? "upstairs in the king's chamber" : "in the chamber block's ground floor (the stair is outside)", kitchen: "in the palace kitchen" }[zoneOf(P_.x, P_.z)];
    const where = INSIDE_H ? "inside a house · E near things to read; E at the doorway to go out" : DH ? "at a doorway · <b>E: go inside</b>" : nearM ? `at <b>${nearM.name}</b> · E to read` : inA ? "inside Westminster Abbey" : room || (CITY.inside(P_.x, P_.z) ? "inside the walls of London" : "");
    HUD.innerHTML = `<b>London and Westminster, Christmas Day 1066</b> · ${hh}:${String(mi).padStart(2, "0")}${timeRate > 1 ? ` (time ×${timeRate})` : ""} · ${flying ? "flying" : SPEEDS[speedI][1] + (run > 1 ? ", running" : "")}<br>${where}<br>
      <span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · shift run · − / = pace · E read / go in · N next moment · T time speed · L markers · F fly · M map</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(`${hh}:${String(mi).padStart(2, "0")} · ${where.replace(/<[^>]+>/g, "")}`, msgText || "Left stick walk · right stick turn · trigger run · A read / go in · B next place · X next moment of the coronation · Y time speed"); vrDirty = false; } }
  renderer.render(scene, camera);
}
