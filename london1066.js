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
const ERA = Q.get("era") === "1285" ? 1285 : Q.get("era") === "1100" ? 1100 : 1066, SUMMER = ERA === 1100, AUTUMN = ERA === 1285, LEAFY = SUMMER || AUTUMN;   // 1066 (winter), Lammas Day 1 August 1100, or Michaelmas 29 September 1285
const MARKET = Q.get("day") === "market" || ERA >= 1100;   // which day: Christmas Day (the coronation) or a market day a few days before
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


// ---------- who you are (chosen on the start card) ----------
const LIVES = {
  traveller: { title: "a time traveller from a university", short: "Time traveller", rank: "unseen", intro: "No one here can see or hear you: you are an observer. The markers are your field notes." },
  comb: { title: "a comb-maker of Bread Street, London", short: "Comb-maker", rank: "common", intro: "You make combs of red-deer antler in your house on Bread Street, with your wife and children. London is crowded with William's men; tomorrow (or today) the duke is crowned." },
  ale: { title: "an alewife of Eastcheap, London", short: "Alewife", rank: "common", woman: true, intro: "You brew ale and sell it from your house in Eastcheap; your husband is a carter. Brewing, spinning, cooking and the children fill your day." },
  south: { title: "a fisherman of Southwark", short: "Southwark fisherman", rank: "common", intro: "A month ago William's knights burned Southwark. Your house is a black shell; your family shelters in a lean-to beside it. You fish the Thames for eels and are rebuilding." },
  thegn: { title: "an English thegn with a town house in London", short: "Thegn", rank: "noble", intro: "You hold land in Middlesex and a 'haw', a town house, in the City, with servants. You submitted to William with the other English leaders at Berkhamsted. A thegn is expected at the crowning." } };
if (ERA === 1285) { LIVES.comb.intro = "You make combs of antler, bone and horn in your house on Bread Street, with your wife, children and an apprentice. It is Michaelmas, quarter day: your rent is due to your landlord today. In June the king took the City into his own hands and removed its mayor.";
  LIVES.ale.title = "a brewster of Eastcheap, London"; LIVES.ale.short = "Brewster"; LIVES.ale.intro = "You brew ale and sell it from your house in Eastcheap, with a pole and bush over the door when a brew is ready; the assize of ale fixes your price and the ale-conner tastes it. Your husband is a carter.";
  LIVES.south.intro = "You fish the Thames for eels, salmon and flounder from Southwark, by the foot of the stone bridge. You know how to shoot the bridge when the tide runs through the arches, and you sell your catch at the fish market in Old Fish Street.";
  LIVES.thegn = { title: "a mercer of Cheapside, a citizen of London", short: "Mercer", rank: "noble", intro: "You are a citizen and mercer, dealing in linen, silks and small wares from a shop and house on Cheapside, with servants and apprentices. You have served as alderman of your ward; this summer the king removed your mayor and put a royal warden over the City." }; }
let mountPrev = [0, 0];   // the horse's last position (used by mountStep in the roles module, which can run before that module has finished loading)
const WHO = LIVES[Q.get("who")] ? Q.get("who") : "traveller", LIFE = LIVES[WHO], UNSEEN = LIFE.rank === "unseen";

// ---------- people of 1066 ----------
// Dress after the Bayeux Tapestry and the archaeology of Anglo-Saxon and Norman England: men in knee-length tunics, hose or leg
// wrappings, cloaks fastened with a brooch; Englishmen with long hair and moustaches, Normans with the back of the head shaved;
// women in ankle-length gowns with a headrail (veil) over the hair; Norman soldiers in mail hauberks, conical nasal helmets and
// kite shields, with spears; Benedictine monks in black habits; bishops in white albs, coloured chasubles and mitres.
const SKINS = [0xe8c4a8, 0xdcb494, 0xf0d0b8, 0xd8a888, 0xe4bc9c];
// cloth colours: most people wore undyed wool (off-white, oatmeal, grey, brown) or cheap, faded dyes (woad blue, madder red, weld yellow,
// woad-and-weld green); the rich wore strong reds, blues and purples, with tablet-woven or embroidered bands at hems and cuffs
const NATURAL = [0xd2c8b0, 0xb8ab90, 0x8c8476, 0x6e5e4c, 0x5a4a3a, 0x3e342c], COMMON = [0x56607a, 0x7a3e30, 0xa08c4c, 0x5c6640, 0x6a4f56], RICH = [0x9a2424, 0x2c4880, 0x4e2a58, 0x2e5a3a, 0xa8302a, 0x1e3a6a], TRIMS = [0xc8a040, 0xb8302a, 0x2a3a7a, 0xd8c890];
const HAIRS = [0x3a2618, 0x5a3a20, 0x7a5a32, 0xa07a40, 0x2a1c12, 0x6a4a2a];
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
  shoe: mergeG([[new THREE.BoxGeometry(0.09, 0.065, 0.19), MT(0, -0.035, 0.035)], [new THREE.SphereGeometry(0.046, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, -0.068, 0.125, 1, 0.9, 1.15)], [new THREE.SphereGeometry(0.048, 7, 4), MT(0, -0.03, -0.035, 1, 0.8, 1)]]),   // leather turnshoes
  uarm: mergeG([[new THREE.SphereGeometry(0.062, 8, 6), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.058, 0.047, UARM, 9).translate(0, -UARM / 2, 0), MT(0, 0, 0)]]),
  farm: mergeG([[new THREE.SphereGeometry(0.048, 7, 5), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.047, 0.036, FARM, 9).translate(0, -FARM / 2, 0), MT(0, 0, 0)]]),
  hand: mergeG([[new THREE.SphereGeometry(0.038, 7, 5), MT(0, -0.05, 0.005, 0.85, 1.35, 0.6)], [new THREE.SphereGeometry(0.016, 5, 4), MT(0.03, -0.03, 0.02, 1, 1.9, 1, 0, 0.5)]]),   // a hand with a thumb
  torso: mergeG([[new THREE.LatheGeometry([[0.14, -0.02], [0.13, 0.12], [0.15, 0.25], [0.165, 0.34], [0.17, 0.42], [0.12, 0.49], [0.055, 0.52]].map(([r, y]) => new THREE.Vector2(r, y)), 14), MT(0, 0, 0, 1, 1, 0.68)],
    [new THREE.SphereGeometry(0.07, 8, 6), MT(0.155, 0.43, 0)], [new THREE.SphereGeometry(0.07, 8, 6), MT(-0.155, 0.43, 0)]]),
  head: headGeo(),
  eyeW: mergeG([[new THREE.SphereGeometry(0.014, 6, 4), MT(0.033, 0.694, 0.089, 1, 0.75, 0.55)], [new THREE.SphereGeometry(0.014, 6, 4), MT(-0.033, 0.694, 0.089, 1, 0.75, 0.55)]]),
  eyes: mergeG([[new THREE.SphereGeometry(0.0065, 5, 4), MT(0.033, 0.694, 0.096)], [new THREE.SphereGeometry(0.0065, 5, 4), MT(-0.033, 0.694, 0.096)], [new THREE.BoxGeometry(0.03, 0.004, 0.008), MT(0, 0.632, 0.097)]]),   // pupils and the line of the mouth
  brows: mergeG([[new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(0.033, 0.712, 0.097, 1, 1, 1, 0, -0.12)], [new THREE.BoxGeometry(0.03, 0.005, 0.008), MT(-0.033, 0.712, 0.097, 1, 1, 1, 0, 0.12)]]),
  hairEng: mergeG([[faceCap(0.108, Math.PI * 0.56, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [foldTube(0.085, 0.095, 0.16, 12, 9, 0.12, Math.PI * 0.8, Math.PI * 0.4), MT(0, 0.6, -0.02)]]),   // worn long, to the collar
  hairLong: mergeG([[faceCap(0.108, Math.PI * 0.56, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [foldTube(0.085, 0.11, 0.36, 12, 9, 0.12, Math.PI * 0.85, Math.PI * 0.425), MT(0, 0.5, -0.025)]]),
  hairNor: faceCap(0.108, Math.PI * 0.3, Math.PI * 0.27, Math.PI * 0.4).rotateX(-0.25).scale(0.9, 1.12, 1.04).translate(0, 0.674, 0.004),   // cropped, the back of the head shaved: tilted about the head, not the feet
  tonsure: G1(new THREE.SphereGeometry(0.108, 12, 3, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.24, Math.PI * 0.24).scale(0.9, 1.12, 1.04).translate(0, 0.675, -0.005)),
  moustache: mergeG([[new THREE.CapsuleGeometry(0.007, 0.035, 2, 4).rotateZ(Math.PI / 2), MT(0.02, 0.64, 0.1, 1, 1, 1, 0, -0.45)], [new THREE.CapsuleGeometry(0.007, 0.035, 2, 4).rotateZ(Math.PI / 2), MT(-0.02, 0.64, 0.1, 1, 1, 1, 0, 0.45)]]),
  beard: G1(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, Math.PI * 0.38, Math.PI * 0.62).scale(0.9, 1.2, 0.8).translate(0, 0.625, 0.04)),
  headrail: mergeG([[faceCap(0.117, Math.PI * 0.66, Math.PI * 0.27, Math.PI * 0.5), MT(0, 0.673, -0.008, 0.93, 1.13, 1.06)], [foldTube(0.1, 0.19, 0.32, 16, 7, 0.1, Math.PI * 0.5, Math.PI * 0.25), MT(0, 0.5, -0.015, 1, 1, 0.85)]]),
  tunic: G1(foldTube(0.17, 0.27, 0.54, 20, 7, 0.07, 0, 0, 1).scale(1, 1, 0.8).translate(0, -0.2, 0)),
  trim: G1(new THREE.CylinderGeometry(0.27, 0.275, 0.045, 20, 1, true).scale(1, 1, 0.8).translate(0, -0.45, 0)),
  belt: mergeG([[new THREE.CylinderGeometry(0.142, 0.142, 0.035, 14, 1, true), MT(0, 0.07, 0, 1, 1, 0.72)], [new THREE.BoxGeometry(0.07, 0.08, 0.03), MT(0.11, 0.02, 0.08)]]),   // and a pouch
  gown: G1(foldTube(0.16, 0.33, 0.9, 22, 9, 0.08, 0, 0, 2).scale(1, 1, 0.82).translate(0, -0.39, 0)),
  cloak: G1(foldTube(0.19, 0.34, 0.97, 20, 6, 0.1, Math.PI * 0.24, -Math.PI * 0.18, 3).scale(1, 1, 0.8).translate(0, -0.01, -0.012)),   // open at the right, pinned on the right shoulder
  mantle: G1(foldTube(0.18, 0.35, 0.92, 20, 8, 0.09, 0, 0, 4).scale(1, 1, 0.8).translate(0, 0.0, -0.005)),
  brooch: G1(new THREE.CylinderGeometry(0.028, 0.028, 0.012, 10).rotateX(Math.PI / 2).translate(-0.1, 0.44, 0.12)),
  helm: mergeG([[new THREE.ConeGeometry(0.117, 0.2, 12), MT(0, 0.81, 0)], [new THREE.CylinderGeometry(0.114, 0.114, 0.06, 12, 1, true), MT(0, 0.72, 0)], [new THREE.BoxGeometry(0.022, 0.1, 0.02), MT(0, 0.67, 0.114)]]),
  coif: G1(new THREE.CylinderGeometry(0.1, 0.17, 0.17, 12, 1, true).translate(0, 0.56, -0.005)),
  sword: mergeG([[new THREE.BoxGeometry(0.045, 0.78, 0.025), MT(0.19, -0.3, 0.03, 1, 1, 1, 0.12, 0.08)], [new THREE.BoxGeometry(0.13, 0.025, 0.03), MT(0.17, 0.1, 0.0)]]),
  mitre: mergeG([[new THREE.SphereGeometry(0.11, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, 0.72, 0, 1, 1.3, 1)], [new THREE.ConeGeometry(0.04, 0.07, 6), MT(0.055, 0.85, 0)], [new THREE.ConeGeometry(0.04, 0.07, 6), MT(-0.055, 0.85, 0)]]),   // the low mitre of the 1060s
  chasuble: G1(foldTube(0.15, 0.34, 0.74, 20, 5, 0.07, 0, 0, 5).scale(1, 1, 0.78).translate(0, 0.1, 0)),
  pallium: mergeG([[new THREE.TorusGeometry(0.15, 0.018, 4, 14).rotateX(Math.PI / 2), MT(0, 0.44, 0, 1, 1, 0.8)], [new THREE.BoxGeometry(0.05, 0.42, 0.012), MT(0, 0.2, 0.2)], [new THREE.BoxGeometry(0.05, 0.42, 0.012), MT(0, 0.2, -0.17)]]),
  crozier: mergeG([[new THREE.CylinderGeometry(0.012, 0.012, 1.85, 5), MT(0, -0.12, 0)], [new THREE.TorusGeometry(0.06, 0.013, 4, 10, Math.PI * 1.5), MT(0, 0.86, 0)]]),
  cowl: G1(new THREE.TorusGeometry(0.11, 0.05, 6, 14).rotateX(Math.PI / 2).scale(1, 1, 0.9).translate(0, 0.5, -0.02)),
  hood: G1(faceCap(0.13, Math.PI * 0.64, Math.PI * 0.27, Math.PI * 0.52).scale(1, 1.1, 1.08).translate(0, 0.676, -0.012)),
  cap: G1(new THREE.ConeGeometry(0.105, 0.17, 10).rotateX(0.35).translate(0, 0.79, 0.02)),
  // 13th-century dress: the sleeveless surcoat over the tunic; the linen coif tied under the chin; the wimple round chin and throat; the
  // barbette (a band under the chin and over the head) with the fillet (a stiff band round the brow), worn over the hair in a net
  surcoat: G1(foldTube(0.178, 0.31, 0.8, 20, 7, 0.07, 0, 0, 6).scale(1, 1, 0.83).translate(0, -0.27, 0)),
  lcoif: mergeG([[faceCap(0.113, Math.PI * 0.6, Math.PI * 0.27, Math.PI * 0.47), MT(0, 0.673, -0.006, 0.92, 1.12, 1.05)], [new THREE.TorusGeometry(0.082, 0.007, 3, 12, Math.PI).rotateZ(Math.PI), MT(0, 0.655, 0.03)]]),
  wimple: mergeG([[new THREE.CylinderGeometry(0.084, 0.108, 0.13, 14, 1, true), MT(0, 0.585, 0.004, 1, 1, 0.95)], [new THREE.SphereGeometry(0.08, 12, 5, 0, Math.PI * 2, Math.PI * 0.56, Math.PI * 0.44), MT(0, 0.655, 0.012, 1, 1.05, 1)]]),
  barbette: mergeG([[new THREE.TorusGeometry(0.104, 0.014, 4, 24), MT(0, 0.668, 0.005, 0.97, 1.16, 1)], [new THREE.CylinderGeometry(0.114, 0.116, 0.055, 18, 1, true), MT(0, 0.742, -0.006, 1, 1, 1.04)]]),
  crown: mergeG(Array.from({ length: 6 }, (_, k) => [new THREE.BoxGeometry(0.035, 0.07, 0.012), new THREE.Matrix4().makeRotationY(k / 6 * Math.PI * 2).multiply(MT(0, 0.79, 0.098))]).concat([[new THREE.TorusGeometry(0.1, 0.012, 3, 12).rotateX(Math.PI / 2), MT(0, 0.76, 0)]])),
  sceptre: mergeG([[new THREE.CylinderGeometry(0.012, 0.012, 0.8, 5), MT(0, 0.3, 0)], [new THREE.SphereGeometry(0.03, 6, 4), MT(0, 0.72, 0)]]),
  shield: mergeG([[new THREE.CylinderGeometry(0.28, 0.02, 0.95, 3, 1, false, -Math.PI / 6, Math.PI * 2).scale(1, 1, 0.12), MT(0.09, -0.05, 0.1)]]),
  spear: mergeG([[new THREE.CylinderGeometry(0.013, 0.013, 2.4, 5), MT(0, 0.2, 0)], [new THREE.ConeGeometry(0.03, 0.2, 5), MT(0, 1.5, 0)]]) };
const PARTS = ["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "torso", "head", "eyeW", "eyes", "brows", "hairEng", "hairLong", "hairNor", "tonsure", "moustache", "beard", "headrail", "tunic", "trim", "belt", "gown", "cloak", "mantle", "brooch",
  "helm", "coif", "sword", "mitre", "chasuble", "pallium", "crozier", "cowl", "hood", "cap", "crown", "sceptre", "shield", "spear", "surcoat", "lcoif", "wimple", "barbette"];
const PGEO = { legL: PG.thigh, legR: PG.thigh, shinL: PG.shin, shinR: PG.shin, shoeL: PG.shoe, shoeR: PG.shoe, armL: PG.uarm, armR: PG.uarm, foreL: PG.farm, foreR: PG.farm, handL: PG.hand, handR: PG.hand };
for (const k in PG) if (!PG[k].attributes.color) PG[k] = G1(PG[k]);
const METAL = new Set(["helm", "crown", "brooch", "sceptre", "coif"]);
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide, vertexColors: true });
// roles: eng (an Englishman), woman, child, norman (a Norman lord or knight), soldier, monk, cleric, bishop, archbishop, noble (an English thegn), duke (William before the crowning), king
function looks(i, role) { const h = k => hash(i * 13 + k, 77), pick = (A, k) => A[(h(k) * A.length) | 0];
  const r = role || (h(1) < 0.45 ? "woman" : h(2) < 0.18 ? "child" : h(3) < 0.03 ? "norman" : h(3) < 0.1 ? "noble" : "eng");
  const poor = h(20) < 0.7, plain = k => poor ? (h(k + 40) < 0.72 ? pick(NATURAL, k) : pick(COMMON, k)) : (h(k + 40) < 0.5 ? pick(COMMON, k) : pick(RICH, k));
  const L = { role: r, s: 0.92 + h(5) * 0.12, skin: pick(SKINS, 4), hair: h(30) < 0.12 ? 0x8a8478 : pick(HAIRS, 6), tunic: plain(7), hose: plain(8), shoes: h(21) < 0.5 ? 0x3a2a1e : 0x4e3a28, cloak: plain(9), hasCloak: h(10) < 0.75,
    trim: null, belt: 0x3a2c20, rail: h(22) < 0.8 ? 0xe6e0d0 : pick([0xcfc4a8, 0xb8ab90, 0x9a8c70], 23), beard: h(24) < 0.25, mous: h(25) < 0.85, hood: h(26) < 0.18, cap: h(27) < 0.12, mantle: h(28) < 0.55, girl: h(29) < 0.5, chas: 0, pallium: false };
  // 1285: most men shaven or short-bearded; working men in linen coifs or hoods; many in surcoats, the better-off in long ones of dyed cloth;
  // married women in veil and wimple, younger and fashionable women in barbette and fillet
  if (ERA === 1285) Object.assign(L, { mous: h(25) < 0.1, beard: h(24) < 0.3, hood: h(26) < 0.3, cap: false, lcoif: h(27) < 0.5, hasCloak: h(10) < 0.22, mantle: h(28) < 0.25, surcoat: h(31) < 0.45 ? pick([0x7a3a2a, 0x3a4a6a, 0x5a6a3a, 0x8a6a3a, 0x6a5a4a, 0x4a3a5a], 32) : null, barb: r === "woman" && h(33) < 0.35 });
  if (SUMMER) Object.assign(L, { hasCloak: h(10) < 0.15, hood: false, cap: h(27) < 0.06, mantle: h(28) < 0.12 });   // summer: few cloaks or hoods
  if (r === "child") { L.s = 0.62 + h(5) * 0.14; L.hasCloak = h(10) < 0.4; L.tunic = plain(7); }
  if (r === "noble" || r === "norman") Object.assign(L, { tunic: pick(RICH, 11), cloak: pick(RICH, 12), hose: pick([0x8a2a2a, 0x2a3a6a, 0x5a4a3a, 0xa89a7a], 13), hasCloak: !SUMMER || h(10) < 0.5, trim: pick(TRIMS, 14), hood: false, cap: false, belt: 0x5a3a20 });
  if (ERA === 1285 && (r === "noble" || r === "norman")) Object.assign(L, { surcoat: pick(RICH, 34), hasCloak: h(10) < 0.3 });
  if (r === "woman" && !poor) L.trim = pick(TRIMS, 14);
  if (r === "soldier") Object.assign(L, { tunic: 0x80838a, hose: plain(8), cloak: pick(RICH, 12), hasCloak: h(10) < 0.25, hood: false, cap: false });   // a mail hauberk over a padded tunic
  if (r === "monk") Object.assign(L, { tunic: 0x1c1816, hasCloak: false, belt: 0x2a2420 });
  if (r === "cleric") Object.assign(L, { tunic: 0xece6d6, hasCloak: false, belt: 0xd8d0c0 });
  if (r === "bishop" || r === "archbishop") Object.assign(L, { tunic: 0xf0ece0, chas: [0xc8a83a, 0x8a2a5a, 0xa82a2a, 0x2a4a8a][(h(11) * 4) | 0], hasCloak: false, pallium: r === "archbishop", s: 0.95 + h(5) * 0.08 });
  if (r === "duke") Object.assign(L, { tunic: 0x2c3a78, cloak: 0x8a1a22, trim: 0xc8a040, hasCloak: true, hose: 0x8a2a2a, s: 1.03 });
  if (r === "king") Object.assign(L, { tunic: 0x6a1a4a, cloak: 0xa8202a, trim: 0xd8b040, hasCloak: true, hose: 0x8a2a2a, s: 1.03 });
  return L; }
const adultMan = L => L.role === "eng" || L.role === "noble";
function shows(L, p) { const r = L.role, girl = r === "child" && L.girl, robe = r === "woman" || girl || r === "monk" || r === "cleric" || r === "bishop" || r === "archbishop" || r === "duke" || r === "king", clergy = r === "monk" || r === "cleric" || r === "bishop" || r === "archbishop";
  switch (p) {
    case "hairEng": return adultMan(L) || (r === "child" && !L.girl) || (r === "woman" && L.barb); case "hairLong": return girl; case "hairNor": return r === "norman" || r === "duke" || r === "king";
    case "tonsure": return clergy; case "moustache": return adultMan(L) && L.mous; case "beard": return adultMan(L) && L.beard; case "headrail": return r === "woman" && !L.barb;
    case "tunic": return !robe; case "trim": return L.trim !== null; case "belt": return r !== "bishop" && r !== "archbishop"; case "gown": return robe;
    case "cloak": return L.hasCloak && !clergy && r !== "woman" && !girl; case "mantle": return (r === "woman" && L.mantle) || (girl && L.hasCloak); case "brooch": return L.hasCloak && !clergy && r !== "woman" && !girl;
    case "helm": case "coif": case "sword": case "shield": case "spear": return r === "soldier";
    case "mitre": case "chasuble": case "crozier": return r === "bishop" || r === "archbishop"; case "pallium": return L.pallium; case "cowl": return r === "monk";
    case "hood": return L.hood && (adultMan(L) || r === "child") && !L.cap; case "cap": return L.cap && adultMan(L);
    case "surcoat": return !!L.surcoat && !robe && r !== "child"; case "lcoif": return !!L.lcoif && adultMan(L) && !L.hood; case "wimple": return r === "woman" && ERA === 1285 && !L.barb; case "barbette": return r === "woman" && !!L.barb;
    case "crown": case "sceptre": return r === "king"; default: return true; } }
function colorOf(L, p) { const robeLegs = L.role === "woman" || (L.role === "child" && L.girl);
  if (p.startsWith("leg") || p.startsWith("shin")) return robeLegs ? L.tunic : L.hose; if (p.startsWith("fore")) return L.role === "soldier" ? 0x6a5a48 : L.tunic; if (p.startsWith("shoe")) return L.shoes; if (p.startsWith("hand") || p === "head") return L.skin;
  switch (p) { case "armL": case "armR": case "torso": return L.tunic; case "eyes": return 0x3a2a20; case "eyeW": return 0xe8e4dc; case "brows": return L.hair; case "hairEng": case "hairLong": case "hairNor": case "tonsure": case "moustache": case "beard": return L.hair;
    case "headrail": return L.rail; case "tunic": case "gown": return L.tunic; case "trim": return L.trim ?? L.tunic; case "belt": return L.belt; case "cloak": case "mantle": return L.cloak;
    case "brooch": return L.trim ? 0xd8b84a : 0x9a9a90; case "helm": return 0x8a8a90; case "coif": return 0x80838a; case "sword": return 0x4a3a2a; case "mitre": return 0xf2eee2; case "chasuble": return L.chas;
    case "pallium": return 0xf4f0e6; case "crozier": return 0xc8a040; case "cowl": return 0x1c1816; case "hood": case "cap": return L.cloak; case "surcoat": return L.surcoat; case "lcoif": case "wimple": case "barbette": return 0xece6d8; case "crown": return 0xd8b84a; case "sceptre": return 0xd8b84a;
    case "shield": return [0xb8302a, 0x2a4a9a, 0xd8b83a, 0x3a6a3a][Math.floor(L.s * 37) % 4]; case "spear": return 0x6a4a2c; } return 0xffffff; }
// poses: hip flex (l), knee bend (k), shoulder swing (a), elbow bend (e, negative = forearm forward), skirt tilt (sk)
function poseOf(kind, t, ph, walkAmt = 1) { const c = t * 7 + ph, w = Math.sin(c), sway = 0.04 * Math.sin(t * 0.8 + ph);
  const P = { drop: 0, lean: 0, lL: 0, lR: 0, kL: 0.05, kR: 0.05, aL: sway, aR: -sway, eL: -0.15, eR: -0.15, sk: 0 };
  const walk = (amp = 1) => { const A = walkAmt * amp; P.lL = 0.42 * w * A; P.lR = -0.42 * w * A; P.kL = 0.08 + 0.6 * Math.max(0, Math.cos(c)) * A; P.kR = 0.08 + 0.6 * Math.max(0, -Math.cos(c)) * A; P.lean = 0.05; P.aL = -0.35 * w * A; P.aR = 0.35 * w * A; P.eL = -0.25 - 0.15 * Math.max(0, -w) * A; P.eR = -0.25 - 0.15 * Math.max(0, w) * A; };
  const sit = () => Object.assign(P, { drop: HIPY - 0.47, lL: -1.5, lR: -1.45, kL: 1.5, kR: 1.45, lean: -0.04, sk: -1.15 });
  switch (kind) {
    case "walk": walk(); break;
    case "carry": walk(0.9); Object.assign(P, { aL: -0.45, aR: -0.45, eL: -1.15, eR: -1.15 }); break;
    case "guard": Object.assign(P, { aR: -0.3, eR: -1.05, aL: -0.15, eL: -0.6 }); break;
    case "kneel": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.06, aL: -0.45, aR: -0.45, eL: -1.25, eR: -1.25 }); break;
    case "pray": Object.assign(P, { drop: HIPY - 0.5, lL: 0.05, lR: 0.05, kL: 1.55, kR: 1.55, lean: 0.12, aL: -0.7, aR: -0.7, eL: -1.55, eR: -1.55 }); break;
    case "sit": sit(); Object.assign(P, { aL: -0.55, aR: -0.5, eL: -0.95, eR: -1.0 - 0.15 * Math.max(0, Math.sin(t * 0.9 + ph)) }); break;
    case "row": { sit(); const r = Math.sin(t * 2.4); Object.assign(P, { lean: 0.22 * r, aL: -1.05 - 0.35 * r, aR: -1.05 - 0.35 * r, eL: -0.4 + 0.35 * r, eR: -0.4 + 0.35 * r }); break; }
    case "cheer": Object.assign(P, { lean: -0.05, aL: -2.7 - 0.25 * Math.sin(t * 5 + ph), aR: -2.7 - 0.25 * Math.cos(t * 5 + ph), eL: -0.35, eR: -0.35 }); break;
    case "crown": Object.assign(P, { aL: -2.2, aR: -2.2, eL: -0.7, eR: -0.7 }); break;
    case "bless": Object.assign(P, { aL: -0.25, eL: -0.7, aR: -1.0 - 0.15 * Math.sin(t * 1.5), eR: -1.25 }); break;
    case "hammer": { const q = (t * 1.6 + ph) % 1, up = q < 0.6 ? q / 0.6 : 1 - (q - 0.6) / 0.4; Object.assign(P, { lean: 0.22, lL: -0.1, lR: 0.12, kL: 0.15, kR: 0.1, aL: -0.55, eL: -0.9, aR: -0.5 - 1.9 * up, eR: -0.4 - 0.6 * up }); break; }
    case "talk": { const g = Math.pow(Math.max(0, Math.sin(t * 0.55 + ph)), 4); Object.assign(P, { aL: 0.04, eL: -0.2, aR: -0.08 - 0.45 * g, eR: -0.28 - 0.85 * g - 0.15 * g * Math.sin(t * 2.1 + ph) }); break; }   // arms at rest, a gesture now and then
    case "ride": Object.assign(P, { drop: HIPY - 0.5, lL: -0.4, lR: -0.4, kL: 0.95, kR: 0.95, spr: 0.42, aL: -0.45, aR: -0.45, eL: -0.95, eR: -0.95, lean: 0.05 }); break;
    case "reap": { const q = Math.sin(t * 2.2 + ph); Object.assign(P, { lean: 0.75, lL: -0.35, lR: 0.1, kL: 0.4, kR: 0.25, aL: -0.9, eL: -0.6, aR: -0.6 - 0.45 * q, eR: -0.5 - 0.3 * q }); break; }   // bent to the sickle
    case "spin": Object.assign(P, { aL: -0.55, eL: -1.55, aR: -0.35, eR: -0.75 - 0.25 * Math.sin(t * 3 + ph) }); break;   // distaff in the crook of the left arm, drawing out the thread
    case "bow": Object.assign(P, { lean: 0.38, aL: -0.15, aR: -0.15, eL: -0.3, eR: -0.3 }); break;
    case "sell": { const g = Math.pow(Math.max(0, Math.sin(t * 0.45 + ph)), 3); Object.assign(P, { lean: 0.06, aL: -0.12, eL: -0.35, aR: -0.1 - 0.5 * g, eR: -0.3 - 0.75 * g }); break; } }   // standing by the goods: now and then reaching to arrange them or show one
  return P; }
const _b = new THREE.Matrix4(), _hm = new THREE.Matrix4(), _sk = new THREE.Matrix4(), _j = new THREE.Matrix4(), _tmp = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _e2 = new THREE.Euler(), ZEROM = new THREE.Matrix4().makeScale(0, 0, 0), _p = V3(0, 0, 0), _s = V3(1, 1, 1);
const _M = {}, LIMB = new Set(["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "spear", "shield", "crozier", "sceptre"]), SKIRT = new Set(["tunic", "trim", "gown", "surcoat"]);
function partMatrices(x, y, z, h, L, P, out) { _e2.set(0, h, 0); _q2.setFromEuler(_e2); _b.compose(_p.set(x, y, z), _q2, _s.set(L.s, L.s, L.s));
  _hm.copy(_b).multiply(_tmp.makeTranslation(0, HIPY - P.drop, 0)).multiply(_j.makeRotationX(P.lean)); _sk.copy(_hm).multiply(_j.makeRotationX(P.sk - P.lean * 0.5));
  const leg = (sx, l, k, side) => { const th = _b.clone().multiply(_tmp.makeTranslation(sx, HIPY - P.drop, 0)); if (P.spr) th.multiply(_tmp.makeRotationZ(P.spr * Math.sign(sx))); th.multiply(_j.makeRotationX(l));   // (legs apart astride a horse)
    const sh = th.clone().multiply(_tmp.makeTranslation(0, -THIGH, 0)).multiply(_j.makeRotationX(k));
    _M["leg" + side] = th; _M["shin" + side] = sh; _M["shoe" + side] = sh.clone().multiply(_tmp.makeTranslation(0, -SHIN, 0)).multiply(_j.makeRotationX(-(l + k) * 0.85)); };
  leg(0.085, P.lL, P.kL, "L"); leg(-0.085, P.lR, P.kR, "R");
  const arm = (sx, a, e, sp, side) => { const u = _hm.clone().multiply(_tmp.makeTranslation(sx, 0.43, 0)).multiply(_j.makeRotationX(a)).multiply(_tmp.makeRotationZ(sp)), f = u.clone().multiply(_tmp.makeTranslation(0, -UARM, 0)).multiply(_j.makeRotationX(e)), hd = f.clone().multiply(_tmp.makeTranslation(0, -FARM, 0));
    _M["arm" + side] = u; _M["fore" + side] = f; _M["hand" + side] = hd; return [f, hd]; };
  const [fL, hL] = arm(0.19, P.aL, P.eL, -0.07, "L"), [, hR] = arm(-0.19, P.aR, P.eR, 0.07, "R");
  const upright = (m, a) => m.clone().multiply(_tmp.makeTranslation(0, -0.04, 0.02)).multiply(_j.makeRotationX(-a - P.lean));   // held upright whatever the arm does
  _M.spear = upright(hR, P.aR + P.eR); _M.crozier = upright(hL, P.aL + P.eL); _M.sceptre = upright(hR, P.aR + P.eR); _M.shield = fL.clone().multiply(_tmp.makeTranslation(0, -0.13, 0)).multiply(_j.makeRotationX(-(P.aL + P.eL)));
  for (const p of PARTS) { if (!shows(L, p)) { out.push(ZEROM); continue; } out.push(LIMB.has(p) ? _M[p] : SKIRT.has(p) ? _sk.clone() : _hm.clone()); } }
function personMesh(i, role, kind, x, y, z, h, t = 0) { const L = looks(i, role), g = new THREE.Group(), ms = []; partMatrices(0, 0, 0, 0, L, poseOf(kind, t, i), ms);
  PARTS.forEach((p, k) => { if (ms[k] === ZEROM) return; const m = new THREE.Mesh(PGEO[p] || PG[p], M(colorOf(L, p), { roughness: METAL.has(p) ? 0.35 : 0.85, metalness: METAL.has(p) ? 0.7 : 0, side: THREE.DoubleSide, vertexColors: true })); m.matrixAutoUpdate = false; m.matrix.copy(ms[k]); g.add(m); });
  g.position.set(x, y, z); g.rotation.y = h; g.userData = { i, role, kind }; return g; }
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
// branches of the Tyburn; the Fleet a tidal inlet up to Holborn, under today's New Bridge Street and Farringdon Street, broad at its mouth and narrowing upstream; the Walbrook a small boggy stream splitting the City's two hills,
// Ludgate Hill and Cornhill, gravel terraces about 15-18 m above the Thames. Channel outlines are approximate (low confidence).
// Level 0 is a typical high tide; the ground is given in metres above it.
const THAMES = line([[51.4772, -0.1820], [51.4800, -0.1660], [51.4828, -0.1510], [51.4848, -0.1400], [51.4862, -0.1315], [51.4880, -0.1245], [51.4935, -0.1222], [51.4995, -0.1214], [51.5040, -0.1200], [51.5070, -0.1178], [51.5085, -0.1135], [51.5094, -0.1080], [51.5097, -0.1028],
  [51.5091, -0.0960], [51.5087, -0.0910], [51.5080, -0.0870], [51.5076, -0.0820], [51.5058, -0.0770], [51.5050, -0.0710], [51.5038, -0.0640], [51.5048, -0.0560], [51.5072, -0.0460], [51.5082, -0.0360], [51.5060, -0.0260]]);   // from Chelsea to Limehouse   // the centre line; half-width below
const RIVER_HW = 175;
const FLEET = line([[51.5108, -0.1039], [51.5125, -0.1041], [51.5140, -0.1043], [51.5160, -0.1048], [51.5185, -0.1058], [51.5205, -0.1068], [51.5240, -0.1090], [51.5300, -0.1150], [51.5380, -0.1250], [51.5450, -0.1350]]), WALBROOK = line([[51.5103, -0.0905], [51.5125, -0.0902], [51.5150, -0.0893], [51.5178, -0.0888]]);
const TYB_N = line([[51.5040, -0.1350], [51.5030, -0.1290], [51.5020, -0.1228]]), TYB_S = line([[51.4975, -0.1345], [51.4968, -0.1300], [51.4955, -0.1238]]), TYB_W = line([[51.5040, -0.1350], [51.5005, -0.1352], [51.4975, -0.1345]]);
const BROOKS = [line([[51.5400, -0.1650], [51.5250, -0.1530], [51.5150, -0.1480], [51.5080, -0.1430], [51.5040, -0.1350]]),   // the Tyburn above its mouths
  line([[51.5300, -0.1900], [51.5130, -0.1780], [51.5050, -0.1700], [51.4950, -0.1620], [51.4865, -0.1590]]),   // the Westbourne
  line([[51.4550, -0.1100], [51.4680, -0.1150], [51.4780, -0.1200], [51.4862, -0.1290]]),   // the Effra
  line([[51.4550, -0.1650], [51.4650, -0.1700], [51.4745, -0.1765]]),   // the Falcon Brook at Battersea
  line([[51.4930, -0.0780], [51.4985, -0.0720], [51.5030, -0.0690]])];   // the Neckinger
const THORNEY = { c: LL(51.4995, -0.1268), rx: 235, rz: 185 };
const HILLS = [[...LL(51.5138, -0.0985), 9, 380], [...LL(51.5135, -0.0860), 9, 380], [...LL(51.5150, -0.0930), 4, 500]];
// the Roman wall (late 2nd century, ragstone with tile courses), its known line from the Tower to Blackfriars, and its gates
const WALL_PTS = [[51.5076, -0.0753], [51.5110, -0.0751],   // the wall reached the river just east of where the White Tower would stand (Roman wall survives by the Wardrobe Tower)
  [51.5135, -0.0770], [51.5150, -0.0790], [51.5163, -0.0815], [51.5172, -0.0850], [51.5177, -0.0890], [51.5178, -0.0935], [51.5181, -0.0960],
  [51.5168, -0.0970], [51.5162, -0.0988], [51.5155, -0.1003], [51.5147, -0.1018], [51.5139, -0.1026], [51.5128, -0.1031], [51.5114, -0.1034]];
const WALL = line(WALL_PTS), CITY = poly([...WALL_PTS, [51.5100, -0.1034], [51.5103, -0.0960], [51.5100, -0.0880], [51.5094, -0.0800], [51.5080, -0.0756]]);
const GATES = [["Ludgate", 51.5139, -0.1026], ["Newgate", 51.5155, -0.1003], ["Aldersgate", 51.5168, -0.0970], ["Cripplegate", 51.5178, -0.0935], ["Bishopsgate", 51.5163, -0.0815], ["Aldgate", 51.5135, -0.0770]].map(([n, a, b]) => { const [x, z] = LL(a, b); return { n, x, z }; });
function baseHL(x, z) { const s = THAMES.side(x, z), d = Math.abs(s); let h;
  if (s > 0) { h = 0.7 + 0.6 * fbm(x / 180, z / 180, 3); const up = sstepN(d, 900, 2600); const pond = fbm(x / 260 + 9, z / 260, 3); if (pond < 0.36) h = lerpN(h, -0.6, sstepN(0.36 - pond, 0, 0.05));   // the southern marshes, with pools and channels
    const [ex, ez] = LL(51.5045, -0.0905); h = Math.max(h, 2.2 - Math.hypot(x - ex, (z - ez) * 1.6) / 300);                                                            // the Southwark eyot at the bridgehead
    const [lx, lz] = LL(51.4950, -0.1195); h = Math.max(h, 2.0 - Math.hypot(x - lx, z - lz) / 200);
    if (up > 0) h = lerpN(h, 2.5 + 5 * fbm(x / 1100 + 7, z / 1100, 3) + clampN((d - 2400) / 500, 0, 14), up); }   // rising out of the marsh to Kennington, Camberwell and the Surrey hills                                                                  // the higher ground of Lambeth
  else { h = 6 + 5 * fbm(x / 900 + 3, z / 900, 3) + clampN(-z - 2000, 0, 6000) / 400;                                                                                   // terrace gravels, rising slowly north
    for (const [hx, hz, a, r] of HILLS) h += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
    const tw = Math.hypot(x - THORNEY.c[0], z - THORNEY.c[1]); h = lerpN(Math.min(h, 2.6 + 0.6 * fbm(x / 60, z / 60, 2)), h, sstepN(tw, 300, 900));                    // Thorney Island and the low ground round it
    h = lerpN(1.0, h, sstepN(d, RIVER_HW, RIVER_HW + 150)); }                                                                                                          // the foreshore
  if (ERA === 1285 && s > 0 && x > SWK[0] && x < SWK[1] && d < RIVER_HW + 650) h = Math.max(h, lerpN(1.5, h, sstepN(d, RIVER_HW + 450, RIVER_HW + 650)) * (1 - sstepN(Math.abs(x - (SWK[0] + SWK[1]) / 2), (SWK[1] - SWK[0]) / 2 - 150, (SWK[1] - SWK[0]) / 2)) + h * sstepN(Math.abs(x - (SWK[0] + SWK[1]) / 2), (SWK[1] - SWK[0]) / 2 - 150, (SWK[1] - SWK[0]) / 2));   // by 1285 Southwark's marsh is embanked and built over
  if (d < RIVER_HW + 30) h = lerpN(-4, h, sstepN(d, RIVER_HW - 50, RIVER_HW + (s > 0 ? 10 : 30)));
  const carve = (L, w, dep, bank) => { if (!L.near(x, z, w + bank)) return; const dd = L.d(x, z); if (dd < w + bank) h = Math.min(h, lerpN(dep, h, sstepN(dd, w * 0.5, w + bank))); };
  if (FLEET.near(x, z, 60)) { const fw = clampN(26 - (-z - 1270) / 560 * 18, 5, 26), dd = FLEET.d(x, z); if (dd < fw + 22) { if (z > -2150) h = Math.min(h, lerpN(-2.2, h, sstepN(dd, fw * 0.6, fw + 22))); else h -= 1.6 * (1 - sstepN(dd, fw * 0.5, fw + 30)); } }   // the Fleet: about 50 m across at its mouth, 15 m by Fleet Street; tidal to Holborn, a brook above   // tidal to Holborn, a brook in its valley above
  for (const B of BROOKS) if (B.near(x, z, 30)) { const dd = B.d(x, z); if (dd < 30) h -= (h > 1.2 ? 1.2 : 0.4) * (1 - sstepN(dd, 2, 30)); }   // brooks in their valleys
  carve(WALBROOK, 3, -0.4, 30); carve(TYB_N, 7, -1.2, 10); carve(TYB_S, 7, -1.2, 10); carve(TYB_W, 6, -1.0, 10);
  if (ERA === 1100 && TOWER_DITCH.near(x, z, 14)) { const dd = TOWER_DITCH.d(x, z); if (dd < 12) h -= 2.6 * (1 - sstepN(dd, 3, 12)); }   // the Tower's ditch (by 1100)
  if (ERA === 1285) { const mx = x - TOW_C[0], mz = z - TOW_C[1]; if (mx > -225 && mx < 100 && mz > -125 && mz < 92) h = Math.max(h, lerpN(h, 1.6, (1 - sstepN(mz, 78, 92)) * (1 - sstepN(mx, 88, 100)) * sstepN(mx, -225, -212)));
    if (mx > -186 && mx < 130 && mz > -118 && mz < 66 && !(mx < -136 && mz > 38 && mz < 54)) { const dO = Math.max(-139 - mx, mx - 83, -72 - mz); if (dO > 0 && dO < 46) h = Math.min(h, lerpN(h, -2.4, sstepN(dO, 1, 6) * (1 - sstepN(dO, 40, 46)))); } }
  if (WALL.near(x, z, 30) && !CITY.inside(x, z)) { const wd = WALL.d(x, z); if (wd > 3 && wd < 18) h -= 2.4 * Math.sin((wd - 3) / 15 * Math.PI); }                     // the city ditch outside the wall
  if (FLATS.length && x > FLAT_BB[0] && x < FLAT_BB[1] && z > FLAT_BB[2] && z < FLAT_BB[3]) for (const R of FLATS) { const dx = x - R.x, dz = z - R.z; if (dx * dx + dz * dz > R.r2) continue; const lx = dx * R.c - dz * R.s, lz = dx * R.s + dz * R.c; if (Math.abs(lx) < R.hw && Math.abs(lz) < R.hd) h = R.exact ? lerpN(h, R.y, Math.min(1, (R.hw - Math.abs(lx)) / 3, (R.hd - Math.abs(lz)) / 3)) : Math.min(h, R.y); }   // levelled under floors
  return h; }
// building floors the ground is levelled under (so a hillside does not come up through them)
const FLAT_BB = [1e9, -1e9, 1e9, -1e9], FLATS = [], flatUnder = (F, w, d, y, exact = false) => { const r = Math.hypot(w, d) / 2 + 2; FLAT_BB[0] = Math.min(FLAT_BB[0], F.x - r); FLAT_BB[1] = Math.max(FLAT_BB[1], F.x + r); FLAT_BB[2] = Math.min(FLAT_BB[2], F.z - r); FLAT_BB[3] = Math.max(FLAT_BB[3], F.z + r); return FLATS.push({ x: F.x, z: F.z, c: F.c, s: F.s, hw: w / 2, hd: d / 2, y, exact, r2: (w * w + d * d) / 4 + 4 }); };
// ---------- the lower Thames, from Limehouse to the sea ----------
// Its course follows the river's real line past the Isle of Dogs, Greenwich, Woolwich, Erith, Dartford, Gravesend and Tilbury into the estuary.
// It widens from about 350 m to kilometres; marshes line it (the Essex and Kent marshes, grazed by sheep), chalk and gravel hills rise behind.
const LOWER = line([[51.5060, -0.0260], [51.5020, -0.0190], [51.4950, -0.0215], [51.4880, -0.0170], [51.4845, -0.0080], [51.4860, 0.0030], [51.4930, 0.0070], [51.5010, 0.0060], [51.5060, 0.0120], [51.5030, 0.0280], [51.4985, 0.0450],
  [51.4960, 0.0650], [51.5000, 0.0850], [51.5080, 0.1050], [51.5050, 0.1300], [51.4950, 0.1550], [51.4840, 0.1760], [51.4790, 0.2050], [51.4790, 0.2350], [51.4700, 0.2550], [51.4580, 0.2750], [51.4560, 0.3000], [51.4650, 0.3250],
  [51.4560, 0.3450], [51.4500, 0.3700], [51.4580, 0.4000], [51.4650, 0.4400], [51.4820, 0.4750], [51.4950, 0.5100], [51.5000, 0.5600], [51.4950, 0.6200], [51.4950, 0.7000], [51.4900, 0.8000], [51.4850, 0.9500]]);
const LOWER_HILLS = [[...LL(51.4770, -0.0010), 30, 500], [...LL(51.4690, 0.0700), 105, 1300], [...LL(51.4820, 0.2380), 22, 700], [...LL(51.4380, 0.3700), 35, 1800], [...LL(51.4300, 0.2300), 45, 2500], [...LL(51.5550, 0.6000), 35, 2500]];
function lowerInfo(x, z) { let best = 1e18, sg = 1, sAt = 0; for (let k = 0; k < LOWER.S.length; k++) { const [ax, az, bx, bz] = LOWER.S[k], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = clampN(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), ex = x - (ax + t * dx), ez = z - (az + t * dz), d2 = ex * ex + ez * ez;
  if (d2 < best) { best = d2; sg = Math.sign(dx * ez - dz * ex) || 1; sAt = LOWER.cum[k] + t * Math.sqrt(l2); } } return { d: Math.sqrt(best), side: sg, s: sAt }; }
const lowerHW = s => 175 + clampN(s / 12000, 0, 1) * 90 + clampN((s - 12000) / 26000, 0, 1) * 260 + clampN((s - 38000) / 14000, 0, 1) * 1400 + clampN((s - 52000) / 14000, 0, 1) * 4500;   // the river's half-width, widening to the sea
function baseHE(x, z) { const R = lowerInfo(x, z), hw = lowerHW(R.s), north = R.side < 0, mw = north ? 1700 : 1000;
  let land = north ? 4 + 16 * fbm(x / 2600 + 3, z / 2600, 3) : 9 + 40 * fbm(x / 3000 + 9, z / 3000, 3); for (const [hx, hz, a, r] of LOWER_HILLS) land += a * Math.exp(-((x - hx) ** 2 + (z - hz) ** 2) / (r * r));
  let marsh = 0.6 + 0.8 * fbm(x / 320, z / 320, 3); const pond = fbm(x / 280 + 17, z / 280, 3); if (pond < 0.37) marsh = lerpN(marsh, -0.5, sstepN(0.37 - pond, 0, 0.05));   // marsh with pools and creeks
  let h = lerpN(marsh, land, sstepN(R.d, hw + mw * 0.5, hw + mw * 1.4)); if (R.d < hw + 40) h = lerpN(-4.5, h, sstepN(R.d, hw - 60, hw + 25)); return h; }
function baseH(x, z) { if (x < 6200) return baseHL(x, z); const e = baseHE(x, z); if (x > 7200) return e; return lerpN(baseHL(x, z), e, (x - 6200) / 1000); }
const riverSide = (x, z) => x < 6700 ? THAMES.side(x, z) : lowerInfo(x, z).side;
const groundH = baseH;
const SWK = [LL(51.505, -0.1010)[0], LL(51.505, -0.0740)[0]], TOW_C = LL(51.50815, -0.07595), inTowerYard = (x, z) => ERA === 1285 && x - TOW_C[0] > -190 && x - TOW_C[0] < 132 && z - TOW_C[1] > -120 && z - TOW_C[1] < 82;
const TOWER_DITCH = line([[51.5072, -0.0784], [51.5094, -0.0784], [51.5094, -0.0752]]);   // west and north of the Norman Tower's bailey

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
const BRIDGE = line([[51.5097, -0.0872], [51.5062, -0.0878]]), BRIDGE_Y = 4.5;   // deck height above high water: not known; ships rowed under it (Olaf, 1014), so set well clear   // London Bridge, timber, on the line of Fish Street Hill

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
scene.fog = new THREE.FogExp2(0xb8bcc0, (IS_HEADSET ? 0.00055 : 0.00042) * (SUMMER ? 0.55 : AUTUMN ? 0.75 : 1));   // a summer haze is lighter than winter smoke and mist
const sun = new THREE.DirectionalLight(0xfff0d8, 1.6); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xc4ccd6, 0x5a5444, 1.1); scene.add(hemi);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(260, 24), new THREE.MeshBasicMaterial({ color: 0xfff0d0, fog: false, toneMapped: false })); scene.add(sunDisc);
// the sun's place for latitude 51.5 N, declination -23.1 degrees, by the hour of local solar time
function sunAt(hour) { const lat = 51.5 * Math.PI / 180, dec = (SUMMER ? 17.9 : AUTUMN ? -5.2 : -23.1) * Math.PI / 180, H = (hour - 12) * 15 * Math.PI / 180;
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
// midwinter colours: dun grass, bare mud and gravel where people walk, reeds on the marsh, ploughed strips
function groundColor(x, z, h, c) {
  const n1 = fbm(x / 40, z / 40, 3), n2 = fbm(x / 600 + 5, z / 600, 3);
  if (LEAFY) c.setRGB(0.27 + 0.08 * n2, 0.42 + 0.08 * n1, 0.17 + 0.03 * n1); else c.setRGB(0.36 + 0.10 * n2, 0.37 + 0.08 * n1, 0.22 + 0.04 * n1);   // summer grass, or winter pasture                                                           // winter pasture
  if (h < 1.6 && (x > 6700 || riverSide(x, z) > 0)) c.lerp(SUMMER ? _c1.setRGB(0.32 + 0.06 * n1, 0.44 + 0.06 * n1, 0.2) : _c1.setRGB(0.48 + 0.08 * n1, 0.42 + 0.06 * n1, 0.28), 0.7);                    // dead reeds and sedge on the southern marsh
  if (h < WATER + 0.5) c.lerp(_c1.setRGB(0.30, 0.27, 0.22), clampN((WATER + 0.5 - h) * 1.5, 0, 0.9));                       // mud at the water's edge
  const v = rGet(x, z);
  if (v === 1) c.setRGB(0.52 + 0.07 * n1 + (SUMMER ? 0.06 : 0), 0.45 + 0.06 * n1 + (SUMMER ? 0.05 : 0), 0.34 + 0.03 * n1 + (SUMMER ? 0.03 : 0));   // (dry and dusty in summer)                                                          // gravel streets, churned to mud
  else if (v === 2 || v === 3) c.lerp(_c1.setRGB(0.30 + 0.06 * n1, 0.26 + 0.04 * n1, 0.19), v === 2 ? 0.9 : 0.75);            // trodden yards
  else if (v === 5) c.lerp(_c1.setRGB(0.36 + 0.05 * Math.sin(x * 0.6), 0.29, 0.20), 0.8);                                   // ploughed strips
  else if (v === 6) c.setRGB(0.14 + 0.05 * n1, 0.12 + 0.04 * n1, 0.10);                                                     // burnt: Southwark, fired by William in late November
  else if (v === 7) c.lerp(_c1.setRGB(0.40, 0.38, 0.32), 0.8);
  else if (v === 4) c.lerp(SUMMER ? _c1.setRGB(0.28, 0.44, 0.18) : _c1.setRGB(0.34, 0.38, 0.24), 0.5);
  else if (v === 8) { const yard = ERA === 1066 && x < -40 && x > -125 && Math.abs(z) < 55, m = clampN(0.35 + 0.9 * (fbm(x / 9, z / 9, 3) - 0.5) + (yard ? 0.35 : 0) + 0.4 * (1 - sstepN(Math.hypot(x + 10, z * 1.3), 20, 90)), 0.1, 1);   // trampled mud in patches, worn grass between
    c.lerp(_c1.setRGB(0.34 + 0.06 * n1, 0.28 + 0.04 * n1, 0.2), m); if (yard && fbm(x / 4, z / 4, 2) > 0.55) c.lerp(_c1.setRGB(0.62, 0.58, 0.48), 0.4); }   // stone chips and mortar in the masons' yard   // trampled mud; stone chips and mortar in the masons' yard
  else if (v === 9) c.setRGB(0.3 + 0.04 * Math.sin(z * 2.1), 0.25, 0.18);   // dug garden beds
  if (v === 0) ruralColor(x, z, h, c, n1);
  for (const B of BROOKS) if (B.near(x, z, 6) && B.d(x, z) < 3.2) c.setRGB(0.26, 0.31, 0.32);   // brook water
  if (FLEET.near(x, z, 8) && z < -2150 && FLEET.d(x, z) < 4) c.setRGB(0.26, 0.31, 0.32);
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
G_MAT.lod = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });   // distant houses: plain colours, no texture
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
// level of detail: each house is built in full into its 250 m square ("H"), and again as a plain block with a gable roof ("L"); the
// squares near you show the full houses, those further off the blocks, and the farthest nothing (see lodStep)
const LOD_CELL = 250, lodKey = (x, z) => Math.floor(x / LOD_CELL) + "," + Math.floor(z / LOD_CELL);
function lodHouse(H) { const F = FR(H.x, H.z, H.ry, H.gy, "L" + lodKey(H.x, H.z)), w = H.w, d = H.d, wh = H.wh, rh = H.rh, wc = { daub: [0.52, 0.47, 0.38], plank: [0.31, 0.23, 0.16], stave: [0.31, 0.23, 0.16], rubble: [0.48, 0.45, 0.4] }[H.wall] || [0.45, 0.41, 0.34],
    rc = H.tile ? [0.44, 0.21, 0.15] : H.roof === "thatch" ? [0.38, 0.31, 0.19] : [0.28, 0.28, 0.29], UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const k = 0.62; GTINT = wc.map(v => v * k); gbox(F, "lod", 0, wh / 2 - 0.15, 0, w, wh + 0.3, d, "b"); for (const sz of [-1, 1]) gpoly(F, "lod", [[-w / 2, wh, sz * d / 2], [w / 2, wh, sz * d / 2], [0, wh + rh, sz * d / 2]], [[0, 0], [1, 0], [0.5, 1]], [0, 0, sz]);
  GTINT = rc.map(v => v * k); for (const sx of [-1, 1]) gpoly(F, "lod", [[sx * (w / 2 + 0.35), wh - 0.25, -d / 2 - 0.3], [0, wh + rh, -d / 2 - 0.3], [0, wh + rh, d / 2 + 0.3], [sx * (w / 2 + 0.35), wh - 0.25, d / 2 + 0.3]], UV, [sx, 1, 0]); GTINT = [1, 1, 1]; }
function gHouse(H) { if (!H.chunkKey) H.chunkKey = "H" + lodKey(H.x, H.z);
  if (ERA === 1285 && H.roof === "thatch" && (H.dense || CITY.inside(H.x, H.z)) && Math.abs((H.x * 31 + H.z * 17) | 0) % 10 < 7) { H.roof = "shingle"; H.tile = true; }
  const F = FR(H.x, H.z, H.ry, H.gy, H.chunkKey), w = H.w, d = H.d, wh = H.wh, rh = H.rh, R = seeded((H.x * 7 + H.z * 13) | 0);
  const bw = 0.85 + R() * 0.25, br = 0.8 + R() * 0.3, tintW = H.wall === "daub" ? (R() < 0.3 ? [1.3, 1.3, 1.27] : [bw, bw * 0.98, bw * 0.95]) : [bw, bw * 0.97, bw * 0.94];   // some daub limewashed
  const tintR = H.tile ? [1.05 * br + 0.1, 0.58 * br, 0.44 * br] : H.roof === "thatch" ? (R() < 0.25 ? [1.15, 1.1, 0.95] : [br, br * 0.98, br * 0.93]) : [br, br, br];   // a few roofs new-thatched, most weathered
  GTINT = tintW; gbox(F, H.wall, 0, wh / 2 - 0.15, 0, w, wh + 0.3, d);
  if (H.dense && wh > 3.6) { gbox(F, H.wall, 0, wh * 0.76, 0, w + 0.5, wh * 0.48, d + 0.5); GTINT = [0.55, 0.45, 0.35]; gbox(F, "oak", 0, wh * 0.52, 0, w + 0.56, 0.22, d + 0.56); GTINT = tintW; }   // a jettied upper storey
  if (!H.hip) for (const sz of [-1, 1]) gpoly(F, H.wall, [[-w / 2, wh, sz * d / 2], [w / 2, wh, sz * d / 2], [0, wh + rh, sz * d / 2]], [[0, wh], [w, wh], [w / 2, wh + rh]], [0, 0, sz]);   // the gable ends
  GTINT = [0.9 + R() * 0.2, 0.9, 0.9]; const post = (x, z) => gbox(F, "oak", x, wh / 2 - 0.1, z, 0.22, wh + 0.2, 0.22, "b");
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) post(sx * w / 2, sz * d / 2);
  if (H.wall === "daub" && !IS_HEADSET) { const sp = H.dense ? 2.4 : 1.3, nz = Math.max(1, Math.round(d / sp)), nx = Math.max(1, Math.round(w / sp));
    for (let i = 1; i < nz; i++) for (const sx of [-1, 1]) gbox(F, "oak", sx * (w / 2 + 0.02), wh / 2 - 0.1, -d / 2 + d * i / nz, 0.05, wh + 0.2, 0.16, "bt");
    for (let i = 1; i < nx; i++) for (const sz of [-1, 1]) gbox(F, "oak", -w / 2 + w * i / nx, wh / 2 - 0.1, sz * (d / 2 + 0.02), 0.16, wh + 0.2, 0.05, "bt"); }
  for (const sx of [-1, 1]) gbox(F, "oak", sx * w / 2, wh - 0.08, 0, 0.26, 0.2, d + 0.1, "b");   // wall plates
  // the doorway: oak jambs and lintel, a plank door
  const dr = H.door, onX = dr === "+x" || dr === "-x", sg = dr[0] === "+" ? 1 : -1, n = onX ? [sg, 0, 0] : [0, 0, sg], ox = onX ? sg * (w / 2 + 0.04) : 0, oz = onX ? 0 : sg * (d / 2 + 0.04), dw = 0.95, dh = Math.min(1.8, wh - 0.2);
  const at = (u, y) => onX ? [ox, y, u] : [u, y, oz];
  GTINT = [1.05, 1, 0.95]; gpoly(F, "plank", [at(-dw / 2, 0), at(dw / 2, 0), at(dw / 2, dh), at(-dw / 2, dh)], [[0, 0], [dw, 0], [dw, dh], [0, dh]], n);
  const rich = R() < 0.3;   // better houses: door frames carved and painted (red ochre, with lighter bands), as wood was carved in the Ringerike style
  GTINT = rich ? [1.6, 0.55, 0.38] : [1, 1, 1]; for (const u of [-dw / 2 - 0.09, dw / 2 + 0.09]) { const [px, , pz] = at(u, 0); gbox(F, "oak", px, dh / 2, pz, onX ? 0.14 : 0.2, dh, onX ? 0.2 : 0.14); if (rich) { GTINT = [1.7, 1.5, 0.9]; for (const y of [0.5, 1.0, 1.5]) gbox(F, "oak", px, y, pz, onX ? 0.16 : 0.22, 0.06, onX ? 0.22 : 0.16, ""); GTINT = [1.6, 0.55, 0.38]; } }
  { const [px, , pz] = at(0, 0); gbox(F, "oak", px, dh + 0.1, pz, onX ? 0.14 : dw + 0.5, rich ? 0.3 : 0.16, onX ? dw + 0.5 : 0.14); if (rich) { GTINT = [1.7, 1.5, 0.9]; gbox(F, "oak", px, dh + 0.1, pz, onX ? 0.16 : dw + 0.3, 0.06, onX ? dw + 0.3 : 0.16, ""); } }
  if (rich && !H.hip) { GTINT = [1.3, 0.6, 0.4]; for (const sz of [-1, 1]) for (const sx of [-1, 1]) { const P0 = [0, wh + rh + 0.15, sz * (d / 2 + 0.32)], P1 = [sx * 0.55, wh + rh + 0.9, sz * (d / 2 + 0.32)];   // crossed gable finials, carved
      gpoly(F, "oak", [[P0[0] - 0.06, P0[1], P0[2]], [P0[0] + 0.06, P0[1], P0[2]], [P1[0] + 0.06, P1[1], P1[2]], [P1[0] - 0.06, P1[1], P1[2]]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, sz]); gpoly(F, "oak", [[P0[0] - 0.06, P0[1], P0[2]], [P0[0] + 0.06, P0[1], P0[2]], [P1[0] + 0.06, P1[1], P1[2]], [P1[0] - 0.06, P1[1], P1[2]]], [[0, 0], [1, 0], [1, 1], [0, 1]], [0, 0, -sz]); } }
  GTINT = [1, 1, 1];
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
// small things drawn only near you, batched by 250 m square: [name prefix, distance in m]
const KIT_NEAR = [["tree", 900], ["crown", 900], ["fence", 600], ["st:", 360], ["stack", 700], ["rickbase", 700], ["vine", 600], ["pale", 700], ["block", 500], ["log", 500], ["stall", 300], ["candle", 200], ["effigy", 200], ["purbeck", 400], ["wtcol", 300], ["tcol", 300], ["hutpost", 400]];
const kitNear = key => { for (const [p, r] of KIT_NEAR) if (key.startsWith(p)) return r; return 0; };
const put = (key, geo, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) => { if (kitNear(key)) key = key + "@" + lodKey(x, z); kit(key, geo, mat).list.push([x, y, z, sx, sy, sz, ry, rx, rz]); return KIT[key].list.length - 1; };
function buildKit(group) { for (const k in KIT) { const K = KIT[k]; if (!K.list.length || K.im) continue; const im = new THREE.InstancedMesh(K.geo, K.mat, K.list.length), c = new THREE.Color();
  K.list.forEach(([x, y, z, sx, sy, sz, ry, rx, rz], i) => { O3.position.set(x, y, z); O3.rotation.set(rx || 0, ry, rz || 0, "YXZ"); O3.scale.set(sx, sy, sz); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); c.setHSL(0.08, 0.1 + 0.15 * hash(i, 3), 0.78 + 0.22 * hash(i, 5)); im.setColorAt(i, c); });
  im.frustumCulled = false; K.im = im; group.add(im); } }
function kitHide(key, i) { const K = KIT[key]; if (!K?.im) return; K.im.setMatrixAt(i, ZEROM); K.im.instanceMatrix.needsUpdate = true; }
function kitShow(key, i) { const K = KIT[key]; if (!K?.im) return; const [x, y, z, sx, sy, sz, ry, rx, rz] = K.list[i]; O3.position.set(x, y, z); O3.rotation.set(rx || 0, ry, rz || 0, "YXZ"); O3.scale.set(sx, sy, sz); O3.updateMatrix(); K.im.setMatrixAt(i, O3.matrix); K.im.instanceMatrix.needsUpdate = true; }

// ---------- solid things: rectangles you cannot walk through, in a 16 m hash ----------
const COLL = new Map(), CC = 16;
function solid(x, z, w, d, ry, tag) { const r = { x, z, hw: w / 2, hd: d / 2, c: Math.cos(ry), s: Math.sin(ry), tag, on: true }, R = Math.hypot(w, d) / 2;
  for (let i = Math.floor((x - R) / CC); i <= Math.floor((x + R) / CC); i++) for (let j = Math.floor((z - R) / CC); j <= Math.floor((z + R) / CC); j++) { const k = i * 100003 + j; if (!COLL.has(k)) COLL.set(k, []); COLL.get(k).push(r); }
  return r; }
function pushOut(p, rad = 0.3) { const L = COLL.get(Math.floor(p.x / CC) * 100003 + Math.floor(p.z / CC)); if (!L) return;
  for (const r of L) { if (!r.on || (r.ymax !== undefined && p.y > r.ymax)) continue; const dx = p.x - r.x, dz = p.z - r.z, lx = dx * r.c - dz * r.s, lz = dx * r.s + dz * r.c, ex = r.hw + rad - Math.abs(lx), ez = r.hd + rad - Math.abs(lz);
    if (ex <= 0 || ez <= 0) continue; let nx = lx, nz = lz; if (ex < ez) nx = Math.sign(lx || 1) * (r.hw + rad); else nz = Math.sign(lz || 1) * (r.hd + rad);
    p.x = r.x + nx * r.c + nz * r.s; p.z = r.z - nx * r.s + nz * r.c; } }

// ---------- houses ----------
// Late Saxon London houses (Bread Street, Milk Street, Ironmonger Lane, Poultry, Fennings Wharf): rectangular, about 4-6 m by 6-12 m,
// of earth-fast oak posts with plank or wattle-and-daub walls, many over a plank-lined cellar, a central hearth, and a thatched roof
// (shingles on better buildings). They stood a little back from the street, often gable-end on, on long narrow plots with yards,
// cesspits and wells behind. No stone houses are known in London before about 1100.
const HOUSES = [];
const LDN_C = LL(51.5110, -0.0960);
function addHouse(x, z, w, d, ry, o = {}) { const gy = o.gy ?? groundH(x, z), R = seeded((x * 31 + z * 17) | 0), dense = ERA === 1285 && !o.burnt && (o.kind || "house") === "house" && Math.hypot(x - LDN_C[0], z - LDN_C[1]) < 1500, wall = o.wall ?? (R() < 0.55 ? "daub" : "plank"), roof = o.roof ?? (R() < 0.88 ? "thatch" : "shingle");
  const H = { x, z, w, d, ry, gy, dense, wh: o.wh ?? (dense && R() < 0.8 ? 3.9 + R() * 2.8 : 2.0 + R() * 0.6), rh: o.rh ?? w * (roof === "thatch" ? 0.62 + R() * 0.14 : 0.5), wall, roof, hip: o.hip ?? (roof === "thatch" && R() < 0.5), kind: o.kind || "house", burnt: !!o.burnt, door: o.door ?? "+z" };
  H.lean = !H.burnt && R() < 0.2 ? (H.door === "+x" ? -1 : 1) : 0;
  if (!H.burnt) { const s = Math.sin(ry), c = Math.cos(ry), dr = H.door;   // the doorway: "+z"/"-z" a gable end, "+x"/"-x" a long side
    H.dp = dr === "+z" ? [x + s * (d / 2 + 0.03), z + c * (d / 2 + 0.03), ry] : dr === "-z" ? [x - s * (d / 2 + 0.03), z - c * (d / 2 + 0.03), ry + Math.PI] :
      dr === "+x" ? [x + c * (w / 2 + 0.03), z - s * (w / 2 + 0.03), ry + Math.PI / 2] : [x - c * (w / 2 + 0.03), z + s * (w / 2 + 0.03), ry - Math.PI / 2]; }
  H.coll = solid(x, z, w + 0.1, d + 0.1, ry, H); if (H.lean) { const lx = H.lean * (w / 2 + 0.9); solid(x + Math.cos(ry) * lx, z - Math.sin(ry) * lx, 1.8, d * 0.45, ry); }
  HOUSES.push(H); return H; }
function buildHouses(fireSet) { for (const H of HOUSES) { if (fireSet.has(H)) continue; if (H.burnt) gBurnt(H); else { gHouse(H); lodHouse(H); } }
  let k = 0; for (const H of fireSet) { H.chunkKey = "fire" + k++; gHouse(H); }
  for (const m of gFlush()) { const key = m.userData.key; if (!key.startsWith("fire")) continue; const H = [...fireSet][+key.slice(4).split("|")[0]]; (H.fx || (H.fx = [])).push(m); m.userData.mat0 = m.material; } }
// yard things: woodpiles, barrels, wells, wattle fences
const wattleT = tex(256, 128, (g, w, h) => { g.fillStyle = "#3a2e20"; g.fillRect(0, 0, w, h); for (let y = 4; y < h; y += 9) { g.fillStyle = ["#7a6446", "#6a5638", "#8a7452"][(y / 9 | 0) % 3]; for (let x = 0; x < w; x += 32) { g.beginPath(); g.ellipse(x + 16 + ((y / 9 | 0) % 2) * 16, y, 17, 4, 0, 0, 6.283); g.fill(); } }
  g.fillStyle = "#4a3a28"; for (let x = 0; x < w; x += 32) g.fillRect(x + 14, 0, 5, h); }, [8, 1]);
MAT.wattle = new THREE.MeshStandardMaterial({ map: wattleT, roughness: 1 });
const logEndT = tex(128, 128, (g, w, h) => { g.fillStyle = "#3a2e22"; g.fillRect(0, 0, w, h); for (let k = 0; k < 60; k++) { const x = rnd() * w, y = rnd() * h, r = 5 + rnd() * 6; g.fillStyle = "#a88a5a"; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.strokeStyle = "#6a5032"; g.beginPath(); g.arc(x, y, r * 0.5, 0, 6.283); g.stroke(); } }, [1, 1]);
MAT.woodpile = new THREE.MeshStandardMaterial({ map: logEndT, roughness: 1 });
const FRUIT = [];   // fruit trees in the yards, placed with the town's trees
function yardThings(x, z, ry, R) { const c = Math.cos(ry), s = Math.sin(ry), at = (u, v) => [x + u * c + v * s, z - u * s + v * c], r = R(); if (R() < 0.3) { const [fx, fz] = at((R() - 0.5) * 4, 4 + R() * 3); FRUIT.push([fx, fz, 0.45 + R() * 0.2]); }
  if (r < 0.35) { const [px, pz] = at((R() - 0.5) * 3, 0); put("woodpile", BOX_G, MAT.woodpile, px, groundH(px, pz), pz, 1.6, 0.9, 0.6, ry); }
  else if (r < 0.55) { const [px, pz] = at((R() - 0.5) * 3, 0); put("barrel", CYL_G, MAT.wood, px, groundH(px, pz), pz, 0.6, 0.85, 0.6); }
  else if (r < 0.68) { const [px, pz] = at((R() - 0.5) * 3, 1); put("well", CYL_G, MAT.wattle, px, groundH(px, pz), pz, 1.2, 0.7, 1.2); put("wellpost", BOX_G, MAT.wood, px + 0.5, groundH(px, pz), pz, 0.12, 1.6, 0.12); put("wellpost", BOX_G, MAT.wood, px - 0.5, groundH(px, pz), pz, 0.12, 1.6, 0.12); put("wellbar", BOX_G, MAT.wood, px, groundH(px, pz) + 1.55, pz, 1.2, 0.1, 0.1); }
  else if (r < 0.78) { const [px, pz] = at((R() - 0.5) * 3, 2); put("stack", new THREE.ConeGeometry(0.5, 1, 10).translate(0, 0.5, 0), MAT.thatch, px, groundH(px, pz), pz, 2.2, 2.4, 2.2); } }
// one side of a street: plots one after another, gable-end on or broadside, set back a little; a back building on some
function lineStreet(S, dens, opts = {}) { const R = seeded(S.name.length * 977 + (opts.seed || 0));
  for (const sg of opts.sides || [-1, 1]) { let s = R() * 4;
    while (s < S.L.L) { const [px, pz, a] = S.L.at(s), front = ERA === 1285 ? 4 + R() * 2.5 : 4.5 + R() * 3.5, tx = Math.sin(a), tz = Math.cos(a), nx = tz * sg, nz = -tx * sg; s += front + (ERA === 1285 ? 0.15 + R() * 0.4 : 0.4 + R() * 2.5);
      const D = typeof dens === "function" ? dens(px, pz) : dens; if (R() > D) { s += R() * 6; continue; }
      const tight = ERA === 1285 && D > 0.6, gableOn = tight || R() < (ERA === 1285 ? 0.88 : 0.62), deep = 6 + R() * 6, back = S.w / 2 + (ERA === 1285 ? 0.3 + R() * 0.6 : 0.5 + R() * 2.5);
      const hw = gableOn ? front : deep * 0.75, hd = gableOn ? deep : front, hry = gableOn ? Math.atan2(nx, nz) : Math.atan2(tx, tz), along = gableOn ? deep : hw;   // gable-on: ridge away from the street; broadside: along it
      const cx = px + nx * (back + along / 2), cz = pz + nz * (back + along / 2);
      if (baseH(cx, cz) < 1.0 || baseH(cx + nx * along / 2, cz + nz * along / 2) < 0.9) continue;
      if (!rRect(cx, cz, tight ? hw - 1.8 : hw + 1.2, hd + (tight ? 0.4 : 1.2), hry, 0, true)) continue;
      const H = addHouse(cx, cz, hw, hd, hry, { burnt: opts.burnt && R() < 0.8, door: gableOn ? "-z" : sg > 0 ? "-x" : "+x", kind: opts.kind });
      rRect(cx, cz, tight ? hw - 0.6 : hw + 0.4, hd + 0.4, hry, 2);
      const yx = cx + nx * (along / 2 + 7), yz = cz + nz * (along / 2 + 7); rRect(yx, yz, front + 0.5, 13, Math.atan2(nx, nz), 3);   // the yard behind
      if (opts.yards !== false && R() < 0.35) { const bx = cx + nx * (along / 2 + 9 + R() * 4), bz = cz + nz * (along / 2 + 9 + R() * 4), bw = 3.5 + R() * 2, bd = 5 + R() * 3;
        if (baseH(bx, bz) > 1 && rRect(bx, bz, bw + 1, bd + 1, Math.atan2(nx, nz), 0, true)) { const B = addHouse(bx, bz, bw, bd, Math.atan2(nx, nz) + Math.PI, { burnt: opts.burnt && R() < 0.8, door: "+z", kind: opts.kind }); rRect(bx, bz, bw, bd, B.ry, 2); } }
      if (opts.yards !== false && !tight && R() < 0.5) { const fx = cx + nx * (along / 2 + 7) + tx * (front / 2 + 0.3), fz = cz + nz * (along / 2 + 7) + tz * (front / 2 + 0.3);   // a wattle fence between plots
        put("fence", BOX_G, MAT.wattle, fx, groundH(fx, fz) - 0.15, fz, 0.1, 1.25, 13, Math.atan2(nx, nz)); }
      if (opts.yards !== false && !opts.burnt && (!tight || R() < 0.15)) yardThings(yx, yz, Math.atan2(nx, nz), R);
    } } }

// ---------- churches ----------
// London had perhaps 30-50 parish churches by 1066 (more were founded soon after); a few are known from excavation or documents.
// The typical Late Saxon parish church was small, of two cells: a nave about 6-8 m by 12-18 m and a smaller square chancel,
// in stone rubble or timber. All Hallows by the Tower keeps a 7th-century arch; St Bride's was excavated after the Blitz.
const CHURCHES = [];
function addChurch(x, z, o = {}) { const nw = o.nw || 6.5, nl = o.nl || 14, cw = o.cw || 4.5, cl = o.cl || 5, wh = o.wh || 5.5, mat = o.mat || "rag", roof = o.roof || "shingle";
  gChurchWalk(x, z, { nl, nw, cl, cw, wh, mat, roof }); const cx = x + nl / 2 + cl / 2;   // walls and their doorways are solid; you can walk in
  rRect(x + 3, z, nl + cl + 18, nw + 16, 0, 4);
  const C = { x, z, nl, ...o }; CHURCHES.push(C); return C; }

// ---------- the Roman wall and its gates ----------
// About 3.2 km round the landward side, 2.5 m thick and about 6 m high, of Kentish ragstone with bonding courses of tile, with a ditch.
// Gates: Ludgate, Newgate, Aldersgate, Cripplegate (the old fort's north gate), Bishopsgate and Aldgate. Moorgate is medieval, later.
// The gates' 11th-century form is not known; they are shown as simple towered arches on their Roman footprints.
{ for (const [ax, az, bx, bz] of WALL.S) { const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 4)), ry = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n;
      if (GATES.some(G => Math.hypot(G.x - x, G.z - z) < 4.6) || inTowerYard(x, z)) continue;
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
const SPANS = [{ L: BRIDGE, y: BRIDGE_Y, hw: 2.6, name: "London Bridge" }, { L: line([[51.5140, -0.1036], [51.5140, -0.1050]]), y: 4.5, hw: 2.8, name: "Fleet Bridge" },
  { L: line([[51.5028, -0.1266], [51.5017, -0.1266]]), y: 2.4, hw: 2, name: "the bridge over the Tyburn" }];
// each bridge runs on past its ends onto dry land, its deck ramping down to the ground on either bank (timber approaches on earth banks)
for (const B of SPANS) { const [ax0, az0, bx0, bz0] = B.L.S[0], len0 = Math.hypot(bx0 - ax0, bz0 - az0), ux = (bx0 - ax0) / len0, uz = (bz0 - az0) / len0;
  let ea = 4, eb = 4; while (ea < 60 && baseH(ax0 - ux * ea, az0 - uz * ea) < B.y - 1.1) ea += 3; while (eb < 60 && baseH(bx0 + ux * eb, bz0 + uz * eb) < B.y - 1.1) eb += 3;   // walk out until the bank is near deck height
  B.ax = ax0 - ux * ea; B.az = az0 - uz * ea; B.ux = ux; B.uz = uz; B.len = len0 + ea + eb; B.gA = baseH(B.ax, B.az); B.gB = baseH(B.ax + ux * B.len, B.az + uz * B.len); B.R = Math.max(14, Math.min(ea, eb) + 10);
  B.yAt = s => { const ra = Math.max(0, 1 - s / B.R), rb = Math.max(0, 1 - (B.len - s) / B.R); return B.y + (B.gA + 0.15 - B.y) * ra * ra * (3 - 2 * ra) + (B.gB + 0.15 - B.y) * rb * rb * (3 - 2 * rb); };
  if (ERA === 1285 && B.name === "London Bridge") continue;
  const ry = Math.atan2(ux, uz), n = Math.ceil(B.len / 3);
  for (let k = 0; k < n; k++) { const s0 = B.len * k / n, s1 = B.len * (k + 1) / n, sm = (s0 + s1) / 2, x = B.ax + ux * sm, z = B.az + uz * sm, y0 = B.yAt(s0), y1 = B.yAt(s1), ym = (y0 + y1) / 2, seg = Math.hypot(s1 - s0, y1 - y0);
    put("deck", BOX_G, MAT.wood, x, ym - 0.35, z, B.hw * 2, 0.35, seg + 0.05, ry, Math.atan2(y0 - y1, s1 - s0));
    const gm = baseH(x, z); if (ym - gm > 0.4 && gm > B.y - 2.5 && gm > -0.5) put("bank", BOX_G, MAT.wood, x, gm - 0.3, z, B.hw * 2 - 0.2, ym - gm - 0.05, seg + 0.05, ry);   // timber-faced earth approach
    for (const sg of [-1, 1]) { const ox = Math.cos(ry) * B.hw * sg, oz = -Math.sin(ry) * B.hw * sg; put("rail", BOX_G, MAT.wood, x + ox, ym + 0.9, z + oz, 0.12, 0.12, seg + 0.05, ry, Math.atan2(y0 - y1, s1 - s0)); if (k % 2 === 0) put("rail", BOX_G, MAT.wood, x + ox, ym, z + oz, 0.14, 1.0, 0.14, ry);
      const gy = baseH(x + ox, z + oz); if (gy < ym - 0.5 && k % 2 === 0) put("pile", CYL_G, MAT.wood, x + ox * 0.9, Math.min(gy, -3) - 1, z + oz * 0.9, 0.38, ym - Math.min(gy, -3) + 0.6, 0.38); } } }
function spanY(x, z) { for (const B of SPANS) { const dx = x - B.ax, dz = z - B.az, s = dx * B.ux + dz * B.uz; if (s < 0 || s > B.len) continue; const off = Math.abs(dx * B.uz - dz * B.ux); if (off > B.hw) continue; return B.yAt(s); } return -1e9; }

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
// by 1285 the big ship of the northern seas is the cog: high, straight-sided, flat-bottomed, clinker-built, with a straight stem and
// sternpost, a stern rudder hung on pintles (replacing the steering oar after about 1200), castles fore and aft, one square sail
const COG_G = (() => { const s = new THREE.Shape([[0, -0.5], [0.3, -0.42], [0.47, -0.22], [0.5, 0.05], [0.47, 0.3], [0.38, 0.47], [-0.38, 0.47], [-0.47, 0.3], [-0.5, 0.05], [-0.47, -0.22], [-0.3, -0.42]].map(([a, b]) => new THREE.Vector2(a, b)));
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).rotateX(-Math.PI / 2); })();
function cogParts(key, x, y, z, ry, len, beam, depth) { const at = lz => [x + Math.sin(ry) * lz, z + Math.cos(ry) * lz]; const [ax, az] = at(-len * 0.36), [fx, fz] = at(len * 0.38), [rx, rz] = at(-len * 0.49);
  put(key + "castle", BOX_G, MAT.wood, ax, y + depth, az, beam * 0.92, 1.7, len * 0.22, ry); put(key + "castle", BOX_G, MAT.wood, fx, y + depth, fz, beam * 0.8, 1.3, len * 0.16, ry);
  for (const [cx, cz, w, d, h] of [[ax, az, beam * 0.92, len * 0.22, 1.7], [fx, fz, beam * 0.8, len * 0.16, 1.3]]) for (let k = -2; k <= 2; k += 2) put(key + "merlon", BOX_G, MAT.wood, cx + Math.cos(ry) * k * w / 5, y + depth + h, cz - Math.sin(ry) * k * w / 5, w / 6, 0.45, d * 0.9, ry);
  put(key + "rudder", BOX_G, MAT.tar, rx, y - 0.6, rz, 0.18, depth + 0.8, 1.1, ry); }
function addBoat(x, z, ry, len, ship) { if (ship && ERA === 1285) { const gy = Math.max(WATER - 1.2, groundH(x, z) - 0.1), B = len * 0.32, D = 2.6; put("cog", COG_G, MAT.tar, x, gy, z, B, D, len, ry); cogParts("mc", x, gy, z, ry, len, B, D); put("mast", CYL_G, MAT.wood, x, gy + 1, z, 0.3, len * 0.8, 0.3); put("yard", BOX_G, MAT.wood, x, gy + len * 0.72, z, len * 0.6, 0.2, 0.2, ry + Math.PI / 2); BOATS.push({ x, z, ry, len, ship }); return; } const gy = Math.max(WATER - 0.35, groundH(x, z) - 0.1), B = len * (ship ? 0.22 : 0.3), D = ship ? 1.6 : 0.8;
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
const NAVE_W = -62, NAVE_DONE = ERA >= 1100 ? -62.7 : -33.5,   // by 1100 the nave was finished
  CHOIR_E = 25, BAY = 4.75, HS = 1.22;   // HS: heights scaled to Jumièges' proportions (nave walls about 23 m)
// in 1285 Henry III's Gothic church has replaced everything from the fifth bay of the nave eastward: those parts are not built here (see the 1285 section)
const AB_CUT = ERA === 1285 ? -5.7 - 5 * BAY : 1e9, abCut = (x, z) => x > AB_CUT && Math.abs(z) < 12.5 || ERA === 1285 && x > -7.5 && Math.abs(z) < 30 && x < 60, putAB = (k, g, m, x, y, z, ...r) => abCut(x, z) ? -1 : put(k, g, m, x, y, z, ...r);
const abT = ashlarT.clone(); abT.repeat.set(1 / 5.6, 1 / 5.6); abT.needsUpdate = true;
const pnT = plankT.clone(); pnT.repeat.set(1 / 4, 1 / 2); pnT.needsUpdate = true;
const ceilT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6a4a30"; g.fillRect(0, 0, w, h);   // a flat boarded ceiling, painted (as at Peterborough later): form and colours inferred
  for (let x = 0; x < w; x += 32) { g.fillStyle = "#4a3020"; g.fillRect(x, 0, 3, h); } g.strokeStyle = "#a8803a"; g.lineWidth = 3;
  for (let y = 16; y < h; y += 64) for (let x = 16; x < w; x += 64) { g.beginPath(); g.moveTo(x + 16, y); g.lineTo(x + 32, y + 16); g.lineTo(x + 16, y + 32); g.lineTo(x, y + 16); g.closePath(); g.stroke(); }
  g.fillStyle = "#8a2a20"; for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 4); });
ceilT.repeat.set(1 / 4, 1 / 4);
const AMAT = { ashlar: new THREE.MeshStandardMaterial({ map: abT, roughness: 0.85 }), plank: new THREE.MeshStandardMaterial({ map: pnT, roughness: 0.9 }), ceil: new THREE.MeshStandardMaterial({ map: ceilT, roughness: 0.9 }),
  floor: new THREE.MeshStandardMaterial({ map: tex(256, 256, (g, w, h) => { speckle("#a8a090", 2000, ["#b8b0a0", "#989080", "#a09888"])(g, w, h); g.fillStyle = "rgba(70,60,50,.5)"; for (let k = 0; k < w; k += 64) { g.fillRect(k, 0, 2, h); g.fillRect(0, k, w, 2); } }, [1, 1]), roughness: 0.8 }),
  glow: new THREE.MeshBasicMaterial({ color: 0x9aa4ae, side: THREE.DoubleSide, toneMapped: true }), dark: MAT.dark, shade: new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.9, side: THREE.DoubleSide }), lead: new THREE.MeshStandardMaterial({ map: leadT, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }), red: M(0x8a1a1a), gold: M(0xc8a040, { metalness: 0.7, roughness: 0.35 }), wood: M(0x4e3a28), cloth: M(0xe8e0c8) };
AMAT.floor.map.repeat.set(1 / 3, 1 / 3);
// paint: Romanesque church walls were plastered and painted: whitewash with red lines imitating masonry, patterned bands, a painted
// curtain along the foot of the walls, and figure scenes; in the apse, usually Christ in Majesty. Edward's paintings are lost; these are typical.
AMAT.paint = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: tex(256, 512, (g, w, h) => { g.fillStyle = "#e6dcc8"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(150,40,30,.75)"; g.lineWidth = 2; for (let y = 60; y < 360; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.moveTo(0, y + 4); g.lineTo(w, y + 4); g.stroke(); const o = ((y / 30) % 2) * 32; for (let x = o; x < w; x += 64) { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y + 30); g.stroke(); } }
  g.fillStyle = "#8a2a20"; g.fillRect(0, 20, w, 26); g.fillStyle = "#c8a040"; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x + 12, 22); g.lineTo(x + 24, 44); g.fill(); }   // a zigzag frieze
  g.fillStyle = "#2a4a6a"; g.fillRect(0, 372, w, 10); for (let x = 0; x < w; x += 22) { const gr = g.createLinearGradient(x, 0, x + 22, 0); gr.addColorStop(0, "#7a2a22"); gr.addColorStop(0.5, "#a8443a"); gr.addColorStop(1, "#6a2018"); g.fillStyle = gr; g.fillRect(x, 382, 22, h - 382); }   // the painted curtain below
  g.fillStyle = "rgba(255,255,255,.15)"; for (let x = 0; x < w; x += 22) { g.beginPath(); g.moveTo(x + 4, 382); g.quadraticCurveTo(x + 11, 400, x + 18, 382); g.fill(); } }) });
AMAT.mural = new THREE.MeshStandardMaterial({ roughness: 0.9, side: THREE.DoubleSide, map: tex(1024, 256, (g, w, h) => { g.fillStyle = "#1e3a6a"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8a040"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
  for (let k = 0; k < 60; k++) { g.fillStyle = "rgba(255,240,200,.5)"; g.beginPath(); g.arc(Math.random() * w, 14 + Math.random() * (h - 28), 1.5, 0, 6.283); g.fill(); }
  const cx = w / 2; g.fillStyle = "#d8b850"; g.beginPath(); g.ellipse(cx, h / 2, 62, 112, 0, 0, 6.283); g.fill(); g.fillStyle = "#e8dcb8"; g.beginPath(); g.ellipse(cx, h / 2, 54, 104, 0, 0, 6.283); g.fill();   // Christ in Majesty in a mandorla
  g.fillStyle = "#c8a040"; g.beginPath(); g.arc(cx, 62, 22, 0, 6.283); g.fill(); g.fillStyle = "#e0b898"; g.beginPath(); g.arc(cx, 64, 14, 0, 6.283); g.fill(); g.fillStyle = "#8a2a24"; g.beginPath(); g.moveTo(cx - 10, 80); g.lineTo(cx + 10, 80); g.lineTo(cx + 38, 210); g.lineTo(cx - 38, 210); g.fill();
  g.fillStyle = "#2a4a8a"; g.beginPath(); g.moveTo(cx - 6, 84); g.lineTo(cx + 30, 200); g.lineTo(cx + 10, 205); g.lineTo(cx - 14, 96); g.fill(); g.fillStyle = "#e8e0c8"; g.fillRect(cx + 16, 120, 18, 24);   // robe, mantle, the book
  for (const sx of [-1, 1]) for (const [dx, col] of [[150, "#8a2a24"], [290, "#3a6a3a"]]) { const x = cx + sx * dx; g.fillStyle = "#c8a040"; g.beginPath(); g.arc(x, 90, 14, 0, 6.283); g.fill(); g.fillStyle = "#e0b898"; g.beginPath(); g.arc(x, 92, 9, 0, 6.283); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(x - 8, 102); g.lineTo(x + 8, 102); g.lineTo(x + 24, 220); g.lineTo(x - 24, 220); g.fill();
    g.fillStyle = "rgba(230,220,190,.85)"; g.beginPath(); g.moveTo(x - sx * 6, 108); g.quadraticCurveTo(x - sx * 60, 80, x - sx * 46, 170); g.fill(); } }) });   // angels and saints
AMAT.silk = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide, map: G_TEX.hang.clone() }); AMAT.silk.map.repeat.set(1, 1); AMAT.silk.map.needsUpdate = true;
AMAT.paintc = M(0xb8783a); AMAT.linen = M(0xeee8dc);
const AG = {}; for (const k in AMAT) AG[k] = [];
// a box with its texture laid at real size (1 unit of texture = 1 m), base at y
function slab(mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, coll = false) { if (abCut(x, z)) return; AG[mat] = AG[mat] || []; const g = new THREE.BoxGeometry(sx, sy, sz), uv = g.attributes.uv;
  const dims = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]]; for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  const m = new THREE.Matrix4().compose(V3(x, y + sy / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), V3(1, 1, 1)); AG[mat].push([g, m]);
  if (coll) solid(x, z, sx, sz, ry); }
function shapeG(mat, shape, depth, x, y, z, ry) { if (abCut(x, z)) return; AG[mat] = AG[mat] || []; const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, -depth / 2);
  AG[mat].push([g, new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1))]); }
function flushAG(sy = 1) { for (const k in AMAT) AG[k] = AG[k] || []; if (ERA === 1285) for (const k in AG) AG[k] = AG[k].filter(([, m]) => !abCut(m.elements[12], m.elements[14])); for (const k in AG) if (AG[k].length) { const m = new THREE.Mesh(mergeUV(AG[k]), AMAT[k]); m.scale.y = sy; m.position.y = AB_Y * (1 - sy); m.frustumCulled = false; scene.add(m); AG[k].length = 0; } }   // sy: the church's height, stretched from the floor
function mergeUV(parts) { let n = 0; const gs = parts.map(([g, m]) => { const q = (g.index ? g.toNonIndexed() : g).applyMatrix4(m); n += q.attributes.position.count; return q; });
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const q of gs) { pos.set(q.attributes.position.array, o * 3); nor.set(q.attributes.normal.array, o * 3); if (q.attributes.uv) uv.set(q.attributes.uv.array, o * 2); o += q.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return out; }
// the panel above an arch: a rectangle w wide from y0 to y1 with a round-headed opening `open` wide springing at ys
function archPanel(w, y0, y1, open, ys) { const s = new THREE.Shape(), r = open / 2; s.moveTo(-w / 2, y0); s.lineTo(-r, y0); s.lineTo(-r, ys); s.absarc(0, ys, r, Math.PI, 0, true); s.lineTo(r, y0); s.lineTo(w / 2, y0); s.lineTo(w / 2, y1); s.lineTo(-w / 2, y1); s.closePath(); return s; }
function windowPanel(w, y0, y1, open, ys, yb) { const s = new THREE.Shape(); s.moveTo(-w / 2, y0); s.lineTo(w / 2, y0); s.lineTo(w / 2, y1); s.lineTo(-w / 2, y1); s.closePath();
  const h = new THREE.Path(), r = open / 2; h.moveTo(-r, yb); h.lineTo(r, yb); h.lineTo(r, ys); h.absarc(0, ys, r, 0, Math.PI, false); h.lineTo(-r, yb); s.holes.push(h); return s; }
// a window: a dark opening outside, pale daylight inside; nrm is the outward direction (+1/-1) along `axis`
// a round-headed opening, centred on its middle, in the xy plane facing +z
function archGeo(w, h) { const s = new THREE.Shape(), r = w / 2; s.moveTo(-r, -h / 2); s.lineTo(r, -h / 2); s.lineTo(r, h / 2 - r); s.absarc(0, h / 2 - r, r, 0, Math.PI, false); s.lineTo(-r, -h / 2); return new THREE.ShapeGeometry(s, 8); }
function windowAt(x, y, z, w, h, axis, nrm, th) { if (abCut(x, z)) return; const ry = axis === "z" ? (nrm > 0 ? 0 : Math.PI) : (nrm > 0 ? Math.PI / 2 : -Math.PI / 2);
  const ox = axis === "x" ? nrm * (th / 2 + 0.02) : 0, oz = axis === "z" ? nrm * (th / 2 + 0.02) : 0;
  const pl = (mat, sx, sz, r) => { const g = archGeo(w, h); AG[mat].push([g, new THREE.Matrix4().compose(V3(x + sx, y + h / 2, z + sz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r, 0)), V3(1, 1, 1))]); };
  pl("dark", ox, oz, ry); pl("glow", -ox, -oz, ry + Math.PI); archFrame(x + ox, y, z + oz, w, h, ry); }
// the moulded frame round a window or arch outside: a roll moulding over the arch and a small shaft each side (as at Jumièges)
function archFrame(x, y, z, w, h, ry, depth = 0.12) { if (abCut(x, z)) return; const r = w / 2, ys = y + h - r, s = new THREE.Shape(); s.absarc(0, 0, r + 0.24, 0, Math.PI, false); s.lineTo(-r - 0.06, 0); s.absarc(0, 0, r + 0.06, Math.PI, 0, true); s.lineTo(r + 0.24, 0);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 }); AG.ashlar.push([g, new THREE.Matrix4().compose(V3(x, ys, z), q, V3(1, 1, 1))]);
  for (const sx of [-1, 1]) { const c = new THREE.CylinderGeometry(0.075, 0.075, h - r, 7), off = V3(sx * (r + 0.15), 0, 0.08).applyQuaternion(q); AG.ashlar.push([c, new THREE.Matrix4().makeTranslation(x + off.x, y + (h - r) / 2, z + off.z)]);
    const cap = new THREE.BoxGeometry(0.26, 0.14, 0.2), co = V3(sx * (r + 0.15), 0, 0.08).applyQuaternion(q); AG.paintc.push([cap, new THREE.Matrix4().compose(V3(x + co.x, ys - 0.02, z + co.z), q, V3(1, 1, 1))]); } }
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
  if (ERA >= 1100) { wallZ(-11.2, 11.2, NAVE_W - 0.5, 1.4, Y, 19, [[-2, 2, 5]], "ashlar"); for (const zz of [-7.8, 7.8]) windowAt(NAVE_W - 0.5, Y + 4, zz, 1.1, 2.4, "x", -1, 1.4); windowAt(NAVE_W - 0.5, Y + 12, 0, 1.6, 3.6, "x", -1, 1.4); }   // the west front
  else wallZ(-11.2, 11.2, NAVE_DONE - 0.3, 0.3, Y, 19, [[-1.6, 1.6, 3.6]], "plank");
  // the western end as laid out: the west wall's footings
  if (ERA === 1066) slab("ashlar", NAVE_W, Y - 0.5, 0, 1.6, 2.2, ZA * 2 + TH, 0, 0, true);
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
    if (k >= 3 && k <= 5) { const g = archGeo(1.1, 2.8), m = new THREE.Matrix4().compose(V3(x - Math.cos(a) * 0.72, Y + 9, z - Math.sin(a) * 0.72), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a - Math.PI / 2, 0)), V3(1, 1, 1)); AG.glow.push([g, m]);
      const m2 = new THREE.Matrix4().compose(V3(x + Math.cos(a) * 0.72, Y + 9, z + Math.sin(a) * 0.72), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -a + Math.PI / 2, 0)), V3(1, 1, 1)); AG.dark.push([g.clone(), m2]); } }
  { const g = new THREE.CircleGeometry(5.7, 12, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2); AG.ceil.push([g, new THREE.Matrix4().makeTranslation(CHOIR_E, Y + 18.9, 0)]); }
  { const g = new THREE.CylinderGeometry(5.7, 5.7, 0.2, 12, 1, false, 0, Math.PI); AG.floor.push([g, new THREE.Matrix4().makeTranslation(CHOIR_E, Y + 0.1, 0)]); }
  flushAG(HS);
  // the choir: monks' stalls under the crossing and in the first bays of the nave; the high altar; King Edward's tomb before it
  for (const zs of [-1, 1]) { slab("wood", -6, Y + 0.2, 3.6 * zs, 16, 0.5, 0.5, 0, 0, true); slab("wood", -6, Y + 0.2, 4.2 * zs, 16, 2.4, 0.15); slab("wood", -6, Y + 0.2, 2.6 * zs, 16, 0.9, 0.4); }
  slab("ashlar", 17.5, Y + 0.2, 0, 4, 0.35, 6); slab("ashlar", 18.5, Y + 0.55, 0, 1.2, 1.0, 2.6); slab("linen", 18.5, Y + 1.55, 0, 1.3, 0.05, 2.7); slab("gold", 17.88, Y + 0.6, 0, 0.05, 0.95, 2.5); for (let k = 0; k < 7; k++) slab("red", 17.85, Y + 0.85 + (k % 2) * 0.3, -1.05 + k * 0.35, 0.03, 0.08, 0.08);   // a gold altar frontal set with gems (Edward gave rich ornaments; its form inferred)
  slab("gold", 18.8, Y + 1.6, 0, 0.08, 0.9, 0.08); slab("gold", 18.8, Y + 2.2, 0, 0.08, 0.08, 0.5);
  for (const zs of [-1, 1]) { slab("gold", 18.6, Y + 1.6, 1.05 * zs, 0.1, 0.45, 0.1); }
  slab("ashlar", 13.8, Y + 0.2, 0, 2.4, 0.85, 1.1, 0, 0, true); slab("silk", 13.8, Y + 1.05, 0, 2.6, 0.04, 1.3); for (const s of [-1, 1]) slab("silk", 13.8, Y + 0.35, s * 0.66, 2.6, 0.72, 0.03); for (const s of [-1, 1]) slab("silk", 13.8 + s * 1.31, Y + 0.35, 0, 0.03, 0.72, 1.3);   // Edward's tomb, a stone chest under a silk pall
  for (const [dx, dz] of [[-1.5, -0.9], [-1.5, 0.9], [1.5, -0.9], [1.5, 0.9]]) { slab("gold", 13.8 + dx, Y + 0.2, dz, 0.08, 1.3, 0.08); slab("gold", 13.8 + dx, Y + 1.5, dz, 0.3, 0.04, 0.3); slab("linen", 13.8 + dx, Y + 1.54, dz, 0.07, 0.4, 0.07); }
  // the throne for the enthronement, set at the crossing, facing west: placing inferred
  slab("ashlar", 3, Y + 0.2, 0, 3, 0.5, 4); slab("wood", 3.4, Y + 0.7, 0, 0.8, 0.5, 0.9); slab("wood", 3.85, Y + 0.7, 0, 0.12, 1.6, 0.9); slab("red", 3.4, Y + 1.21, 0, 0.8, 0.06, 0.9);
  flushAG();
  // exterior roofs and the crossing tower
  put("r:lead", GABLE_G, MAT.lead, (NAVE_DONE + Math.min(-5, AB_CUT)) / 2, Y + 19 * HS, 0, 12.8, 7, Math.min(-5, AB_CUT) - NAVE_DONE + 0.4, Math.PI / 2); putAB("r:lead", GABLE_G, MAT.lead, 15, Y + 19 * HS, 0, 12.8, 7, 20.4, Math.PI / 2);
  for (const zs of [-1, 1]) putAB("r:lead", GABLE_G, MAT.lead, 0, Y + 19 * HS, 16.7 * zs, 12.8, 7, 22.4, 0);
  { const g = new THREE.ConeGeometry(6.4, 6.5, 12, 1, true, 0, Math.PI); putAB("apseroof", g, new THREE.MeshStandardMaterial({ map: leadT, roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }), CHOIR_E, Y + 19 * HS + 3.25, 0, 1, 1, 1, 0); }
  slab("ashlar", 0, Y + 19, 0, 12.6, 17, 12.6); for (const [x, z, a] of [[6.32, 0, 0], [-6.32, 0, 0], [0, 6.32, 1], [0, -6.32, 1]]) for (const o of [-2.4, 0, 2.4]) slab("dark", x + (a ? o : 0), Y + 30, z + (a ? 0 : o), a ? 1.0 : 0.05, 3.2, a ? 0.05 : 1.0);
  putAB("cap", CONE4_G, MAT.lead, 0, Y + 36 * HS, 0, 13.2, 6, 13.2);
  for (const [cx, cz, ry] of [[0, 28.0, 0], [0, -28.0, 0], [CHOIR_E + 6.2, 0, Math.PI / 2]]) { const top = Y + 19 * HS + (cx > CHOIR_E ? 5.8 : 6.9); putAB("gcross", BOX_G, AMAT.ashlar, cx, top, cz, 0.22, 1.6, 0.22, ry); putAB("gcross", BOX_G, AMAT.ashlar, cx, top + 1.0, cz, 0.9, 0.22, 0.22, ry); }   // stone crosses on the gables putAB("vane", CYL_G, MAT.iron, 0, Y + 36 * HS + 6, 0, 0.1, 2.4, 0.1);
  putAB("vane", BOX_G, new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.8, roughness: 0.3 }), 0, Y + 36 * HS + 7.9, 0, 1.2, 0.7, 0.12);   // the weathercock: in the Bayeux Tapestry a man is fixing it to the new church
  // scaffolding and stone at the unfinished west end: putlog scaffolds of poles lashed together, and a hoist
  if (ERA === 1066) { const R = seeded(5); for (let k = 6; k < 12; k++) { const xc = -5 - BAY * (k + 0.5); for (const zs of [-1, 1]) for (const zo of [9.2, 12.0]) { const z = zo * zs;
      for (const xo of [-BAY / 2 + 0.3, BAY / 2 - 0.3]) putAB("pole", CYL_G, MAT.wood, xc + xo, Y, z, 0.16, 11 - (k - 6), 0.16);
      for (let h = 2; h < 10 - (k - 6); h += 2) putAB("pole", BOX_G, MAT.wood, xc, Y + h, z, BAY, 0.12, 0.12); }
      for (const zs of [-1, 1]) for (let h = 2; h < 10 - (k - 6); h += 2) putAB("plankS", BOX_G, MAT.wood, xc, Y + h + 0.1, 10.6 * zs, BAY, 0.08, 2.4);
      for (let n = 0; n < 5; n++) { const x = xc + (R() - 0.5) * 3, z = (R() - 0.5) * 7; putAB("block", BOX_G, AMAT.ashlar, x, Y - 0.1, z, 0.6 + R() * 0.3, 0.4, 0.4 + R() * 0.3, R()); } }
    putAB("pole", CYL_G, MAT.wood, -50, Y, 0, 0.3, 12, 0.3); putAB("pole", BOX_G, MAT.wood, -48, Y + 12, 0, 5, 0.25, 0.25); putAB("pole", CYL_G, MAT.wood, -46, Y, 0, 0.06, 12, 0.06); }
  // inside: painted walls behind the windows' light, the apse's Christ in Majesty, painted cushion capitals, the rood, silk hangings
  const panel = (x, z, w, h, y0, ry) => { const g = new THREE.PlaneGeometry(w, h); AG.paint = AG.paint || []; AG.paint.push([g, new THREE.Matrix4().compose(V3(x, Y + y0 + h / 2, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1))]); };
  for (const zs of [-1, 1]) { for (let x = NAVE_DONE + BAY / 2; x < -5.7; x += BAY) panel(x, (ZA - 0.705) * zs, BAY, 12.1, 0.2, zs > 0 ? Math.PI : 0); for (let x = 8.2; x < CHOIR_E; x += 5) panel(x, (ZA - 0.705) * zs, 5, 12.1, 0.2, zs > 0 ? Math.PI : 0);
    for (const xs of [-1, 1]) for (let z = 13.6; z < 26; z += 5) panel(xs * 4.995, z * zs, 5, 18.6, 0.2, xs > 0 ? -Math.PI / 2 : Math.PI / 2); panel(0, 26.295 * zs, 10, 18.6, 0.2, zs > 0 ? Math.PI : 0); }
  { const g = new THREE.CylinderGeometry(4.98, 4.98, 6.2, 18, 1, true, 0, Math.PI); AG.mural = [[g, new THREE.Matrix4().makeTranslation(CHOIR_E, Y + 12.4 + 3.1, 0)]]; }
  for (let k = 0; k < 11; k += 2) for (const zs of [-5, 5]) slab("paintc", -5 - BAY * (k + 1), Y + 5.0, zs, 1.85, 0.4, 1.85);
  for (const zs of [-5, 5]) for (const x of [10, 15, 20]) slab("paintc", x, Y + 5.0, zs, 1.9, 0.4, 1.9);
  slab("wood", -5.2, Y + 12.2, 0, 0.4, 0.45, 9.6); slab("paintc", -5.2, Y + 12.65, 0, 0.12, 4.2, 0.35); slab("paintc", -5.2, Y + 15.0, 0, 0.12, 0.35, 2.6);   // the rood beam and the great cross
  slab("linen", -5.35, Y + 13.4, 0, 0.08, 1.4, 0.35); slab("linen", -5.35, Y + 14.5, 0, 0.08, 0.28, 1.9); slab("gold", -5.36, Y + 14.9, 0, 0.06, 0.35, 0.35);   // Christ on the cross, crowned
  for (const zs of [-1, 1]) { slab("red", -5.3, Y + 12.65, 2.3 * zs, 0.4, 1.7, 0.45); slab("linen", -5.3, Y + 14.35, 2.3 * zs, 0.35, 0.3, 0.3); }   // Mary and John
  if (ERA === 1066) for (const zs of [-1, 1]) for (const x of [7.5, 12.5, 17.5]) slab("silk", x, Y + 0.6, zs * 5.2, 3.2, 4.6, 0.04);   // silk hangings between the presbytery piers for the crowning
  // Romanesque exterior detail, as at Jumièges and in the Bayeux Tapestry's picture: flat pilaster buttresses between the bays, string
  // courses under the windows, a corbel table under the eaves, a round-arched north door, a two-stage crossing tower with blind arcading
  // below and paired belfry openings above, small apses ending the choir aisles (Gem's reconstruction)
  const PIL = (x, z, nx, nz, y0, y1, wd = 0.8) => slab("ashlar", x + nx * 0.17, Y + y0, z + nz * 0.17, nx ? 0.34 : wd, y1 - y0, nz ? 0.34 : wd);
  const nb = [], cb = []; for (let k = 0; k <= (ERA >= 1100 ? 12 : 6); k++) nb.push(-5.7 - BAY * k); for (let k = 0; k <= 4; k++) cb.push(5.7 + 5 * k);
  for (const zs of [-1, 1]) { for (const x of [...nb, ...cb]) { PIL(x, 11.2 * zs, 0, zs, 0, 12.3); PIL(x, 5.7 * zs, 0, zs, 14.5, 19); }
    for (const [x0, x1] of [[NAVE_DONE, -6.4], [6.4, CHOIR_E + 0.7]]) { for (const y of [2.8, 8.2]) slab("ashlar", (x0 + x1) / 2, Y + y, 11.32 * zs, x1 - x0, 0.18, 0.24); slab("ashlar", (x0 + x1) / 2, Y + 14.9, 5.82 * zs, x1 - x0, 0.15, 0.24);
      for (let x = x0 + 0.4; x < x1; x += 0.9) { slab("ashlar", x, Y + 12.1, 11.35 * zs, 0.28, 0.25, 0.3); slab("ashlar", x, Y + 18.7, 5.85 * zs, 0.28, 0.25, 0.3); } }
    for (const x of [-6.4, 6.4]) { const sx = Math.sign(x); for (const z of [11.6, 19, 27.35]) PIL(x, z * zs, sx, 0, 0, 18.8, 1.0); for (let z = 11.6; z < 27.6; z += 0.9) slab("ashlar", x + sx * 0.15, Y + 18.7, z * zs, 0.3, 0.25, 0.28); slab("ashlar", x + sx * 0.12, Y + 2.8, 19.4 * zs, 0.24, 0.18, 16); slab("ashlar", x + sx * 0.12, Y + 13.1, 19.4 * zs, 0.24, 0.18, 16); }
    for (const x of [-6.4, 0, 6.4]) PIL(x, 27.7 * zs, 0, zs, 0, 18.8, 1.0); slab("ashlar", 0, Y + 10.6, 27.82 * zs, 12.8, 0.18, 0.24); }
  // blind arcading across the foot of each transept front: a row of shallow round arches on shafts, the recesses shadowed
  for (const zs of [-1, 1]) for (let k = 0; k < 6; k++) { const ax = -4.6 + k * 1.84; if (zs < 0 && Math.abs(ax) < 2.8) continue; const ry = zs > 0 ? 0 : Math.PI, z = (27.7 + 0.01) * zs;
    const g = new THREE.PlaneGeometry(1.3, 2.6); AG.shade.push([g, new THREE.Matrix4().compose(V3(ax, Y + 1.0 + 1.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1))]); archFrame(ax, Y + 1.0, z, 1.3, 3.25, ry, 0.1); }
  // the north door: a round arch of two orders with a plain tympanum
  { const ring = (ri, ro, d, zo) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI, false); s.lineTo(-ri, 0); s.absarc(0, 0, ri, Math.PI, 0, true); s.lineTo(ro, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 12 }); AG.ashlar.push([g, new THREE.Matrix4().makeTranslation(0, Y + 4.2, -27.7 - zo)]); };
    ring(1.7, 2.1, 0.25, 0.25); ring(2.1, 2.5, 0.15, 0.15); const t = new THREE.Shape(); t.absarc(0, 0, 1.7, 0, Math.PI, false); t.lineTo(1.7, 0); AG.paintc.push([new THREE.ShapeGeometry(t, 12).rotateY(Math.PI), new THREE.Matrix4().makeTranslation(0, Y + 4.2, -27.75)]);   // the tympanum, painted
    for (const sx of [-1, 1]) { const g = new THREE.CylinderGeometry(0.17, 0.17, 4.2, 10); AG.ashlar.push([g, new THREE.Matrix4().makeTranslation(sx * 1.9, Y + 2.1, -27.85)]); } }
  // the crossing tower: blind arcading on the lower stage, two pairs of round-headed belfry openings above, string courses, corbels
  for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const fx = nx * 6.32, fz = nz * 6.32, ry = nx ? (nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (nz > 0 ? 0 : Math.PI);
    const at = (u, y, w, h, mat) => { const g = archGeo(w, h); AG[mat].push([g, new THREE.Matrix4().compose(V3(fx + (nz ? u : 0) + nx * 0.03, Y + y + h / 2, fz + (nx ? u : 0) + nz * 0.03), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1))]); };
    for (let k = 0; k < 5; k++) at(-4.4 + k * 2.2, 21.2, 1.5, 4.2, "shade");
    for (const u of [-3.2, -1.6, 1.6, 3.2]) at(u, 28.4, 1.0, 3.6, "dark");
    for (const y of [20.2, 27.2, 35.4]) slab("ashlar", fx * 1.0, Y + y, fz * 1.0, nz ? 13.0 : 0.3, 0.22, nx ? 13.0 : 0.3);
    for (const u of [-6.3, 6.3]) slab("ashlar", fx + (nz ? u : 0) + nx * 0.17, Y + 19, fz + (nx ? u : 0) + nz * 0.17, nx ? 0.34 : 1.0, 17, nz ? 0.34 : 1.0); }
  // small apses at the east ends of the choir aisles
  for (const zs of [-1, 1]) { const cz = 7.85 * zs, cx = CHOIR_E + 1.4; for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k + 0.5) / 6 * Math.PI; slab("ashlar", cx + Math.cos(a) * 2.6, Y, cz + Math.sin(a) * 2.6, 0.9, 11.5, 1.5, -a, 0, true); }
    windowAt(cx + 3.1, Y + 4, cz, 0.8, 2.0, "x", 1, 0.9); const g = new THREE.ConeGeometry(3.2, 2.6, 10, 1, true, 0, Math.PI); AG.lead.push([g, new THREE.Matrix4().makeTranslation(cx, Y + 11.5 + 1.3, cz)]); }
  flushAG(HS); rRect(-25, -5, 190, 150, 0, 8); rRect(-36, -50, 48, 22, 0, 4); rRect(28, 44, 26, 30, 0, 4); rRect(62, 70, 46, 50, 0, 9);   // worksite and trodden ground; the lay cemetery north of the church, the monks' cemetery; the monks' garden
  // the masons' yard west of the unfinished nave: lodges, stacks of Caen stone, timber, a lime pit, a sawpit, handcarts
  if (ERA === 1066) { const R = seeded(77); for (const [x, z] of [[-84, -22], [-84, 20]]) { addHouse(x, z, 6, 12, 0, { wall: "plank", roof: "thatch", wh: 2.4, door: "+x", kind: "lodge" }).noEnter = true; }
    for (let k = 0; k < 6; k++) { const bx = -70 - (k % 3) * 5, bz = (k < 3 ? -1 : 1) * (28 + R() * 6); for (let q = 0; q < 9; q++) putAB("block", BOX_G, AMAT.ashlar, bx + (q % 3) * 0.9, AB_Y - 0.1 + Math.floor(q / 3) * 0.45, bz + (R() - 0.5) * 0.4, 0.8, 0.42, 0.55, R() * 0.2); }
    for (let k = 0; k < 10; k++) putAB("log", CYL_G, MAT.wood, -96, AB_Y + 0.2 + (k % 3) * 0.38, -6 + k * 0.45, 0.36, 7, 0.36, Math.PI / 2, Math.PI / 2);
    putAB("limepit", CYL_G, M(0xd8d4c8), -98, AB_Y - 0.2, 24, 4, 0.3, 4); putAB("limepit", CYL_G, M(0x8a8478), -98, AB_Y - 0.25, 24, 4.6, 0.3, 4.6);
    putAB("sawtrestle", BOX_G, MAT.wood, -104, AB_Y, 6, 0.3, 1.6, 0.3); putAB("sawtrestle", BOX_G, MAT.wood, -104, AB_Y, 1, 0.3, 1.6, 0.3); putAB("log", CYL_G, MAT.wood, -104, AB_Y + 1.7, 3.5, 0.5, 6, 0.5, 0, Math.PI / 2);
    for (const [x, z] of [[-62, -40], [-58, 38]]) { putAB("cart", BOX_G, MAT.wood, x, AB_Y + 0.5, z, 1.3, 0.35, 2.4); for (const s of [-1, 1]) putAB("cartwheel", CYL_G, MAT.wood, x + s * 0.75, AB_Y + 0.55, z, 1.1, 0.12, 1.1, 0, Math.PI / 2); } }
}
function inAbbey(x, z) { if (ERA === 1285) return (x > NAVE_DONE && x < AB_CUT && Math.abs(z) < 11.2) || (x >= AB_CUT && x < 30 && Math.abs(z) < 13.4) || (Math.abs(x) < 6.7 && Math.abs(z) < 29.9) || (x >= 30 && Math.hypot(x - 30, z) < 6.8);
  return (x > NAVE_DONE && x < CHOIR_E && Math.abs(z) < 11.2) || (Math.abs(x) < 6.4 && Math.abs(z) < 27.7) || (x >= CHOIR_E && Math.hypot(x - CHOIR_E, z) < 5.7); }
// lamps: candles on the altar and lamps hung in the crossing
const flameM = new THREE.MeshBasicMaterial({ color: 0xffb050, toneMapped: false }), FLAME_G = new THREE.ConeGeometry(0.03, 0.12, 5).translate(0, 0.06, 0);
for (const zs of [-1, 1]) putAB("flame", FLAME_G, flameM, 18.6, AB_Y + 2.05, 1.05 * zs, 1, 1, 1);
for (const [x, z] of [[0, 0], [-12, 0], [-22, 0], [12, 0], [0, -16], [0, 16]]) { putAB("corona", new THREE.TorusGeometry(0.9, 0.04, 4, 16).rotateX(Math.PI / 2), MAT.iron, x, AB_Y + 6, z, 1, 1, 1); putAB("chain", CYL_G, MAT.iron, x, AB_Y + 6, z, 0.03, 19 * HS - 6, 0.03);
  for (let k = 0; k < 6; k++) putAB("flame", FLAME_G, flameM, x + Math.cos(k) * 0.9, AB_Y + 6.03, z + Math.sin(k) * 0.9, 1.5, 1.5, 1.5); }
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
rRect(PALACE[0] + 4, PALACE[1] + 4, 150, 120, 0, 4);
{ const R = seeded(61); for (let a = 0; a < Math.PI * 2; a += 0.035) { const x = PALACE[0] + 4 + Math.cos(a) * 70, z = PALACE[1] + 4 + Math.sin(a) * 55; if (Math.abs(a - Math.PI) < 0.06) continue; if (ERA === 1285) continue; put("pale", BOX_G, MAT.paleWood || (MAT.paleWood = M(0x8a7a64)), x, groundH(x, z) - 0.2, z, 0.25, 2.4, 2.4, -a); solid(x, z, 0.3, 2.4, -a); } }
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
const PFLOORS = [], personFloor = (F, x0, x1, z0, z1, y) => PFLOORS.push({ F, x0, x1, z0, z1, y });   // floors people stand on (upper floors, halls)
const ZONES = [];   // rooms: for light and for who you can see
let ZONE_HIT = null;
function zoneOf(x, z) { ZONE_HIT = null; if (inAbbey(x, z)) return "abbey"; for (const Z of ZONES) { const dx = x - Z.F.x, dz = z - Z.F.z, lx = dx * Z.F.c - dz * Z.F.s, lz = dx * Z.F.s + dz * Z.F.c; if (Math.abs(lx) < Z.w / 2 && Math.abs(lz) < Z.d / 2) { ZONE_HIT = Z; return Z.name; } } return null; }
// walls with doorways, solid both sides; doors = [[side, u (centre along the wall), width, height]]; extra = [y0, y1] spans kept within a door gap
function gWalls(F, mat, w, d, h, th, doors = [], keep = []) { const ry = Math.atan2(F.s, F.c);
  for (const side of ["+x", "-x", "+z", "-z"]) { const onX = side[1] === "x", sg = side[0] === "+" ? 1 : -1, L = onX ? d : w, gaps = doors.filter(D => D[0] === side).sort((a, b) => a[1] - b[1]);
    const seg = (u0, u1, y0, y1) => { if (u1 - u0 < 0.01 || y1 - y0 < 0.01) return; const um = (u0 + u1) / 2, cx = onX ? sg * w / 2 : um, cz = onX ? um : sg * d / 2;
      gbox(F, mat, cx, (y0 + y1) / 2, cz, onX ? th : u1 - u0 + (onX ? 0 : th), y1 - y0, onX ? u1 - u0 + th : th, y0 > 0.1 ? "" : "b");
      if (y0 < 0.1) { const [X, , Z] = gw(F, cx, 0, cz); solid(X, Z, onX ? th : u1 - u0, onX ? u1 - u0 : th, ry); } };
    let a = -L / 2; for (const D of gaps) { seg(a, D[1] - D[2] / 2, 0, h); for (const [y0, y1] of (D[4] || [[D[3], h]])) seg(D[1] - D[2] / 2, D[1] + D[2] / 2, y0, y1); a = D[1] + D[2] / 2; } seg(a, L / 2, 0, h); } }
function gGableBoth(F, mat, w, d, wh, rh) { for (const sz of [-1, 1]) for (const io of [1, -1]) gpoly(F, mat, [[-w / 2, wh, sz * (d / 2 - 0.15 * (io < 0))], [w / 2, wh, sz * (d / 2 - 0.15 * (io < 0))], [0, wh + rh, sz * (d / 2 - 0.15 * (io < 0))]], [[0, wh], [w, wh], [w / 2, wh + rh]], [0, 0, sz * io]); }
const PAL = {}, hearthFireM = new THREE.MeshBasicMaterial({ color: 0xff9a3a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), HFIRE_G = new THREE.ConeGeometry(0.16, 0.55, 6).translate(0, 0.27, 0);
// by 1285 Edward the Confessor's timber palace is long gone (Henry III's stone palace is built in the 1285 section): only its reference points remain
if (ERA === 1285) { const gy = groundH(PALACE[0], PALACE[1]) - 0.1, F = FR(PALACE[0], PALACE[1], Math.PI / 2, gy, "palace"), w = 12; PAL.hall = F; PAL.hearth = gw(F, 0, 0.2, -2);
  PAL.northDoor = gw(F, w / 2 + 1.6, 0, -11); PAL.southDoor = gw(F, -w / 2 - 1.6, 0, -11); PAL.inNorth = gw(F, w / 2 - 1.5, 0, -11); PAL.inSouth = gw(F, -w / 2 + 1.5, 0, -11); PAL.seat = (lx, lz) => gw(F, lx, 0, lz);
  const C = FR(PALACE[0] + 23, PALACE[1] - 2, 0, gy); PAL.chamber = C; PAL.chamberDoor = gw(C, -4.8, 0, -0.5); PAL.bed = gw(C, 1.6, 0, -3.6); PAL.stairFoot = gw(C, -5, 0, -5);
  const K = FR(PALACE[0] - 6, PALACE[1] + 19, 0, gy); PAL.kitchen = K; PAL.pig = new THREE.Object3D(); PAL.kitchenDoor = gw(K, 0, 0, -5.5); PAL.inKitchen = gw(K, 0, 0, -2.5); PAL.cookSpots = []; }
else {
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
  gbox(F, "oak", 0, 0.45 + 0.21, 13.75, 0.9, 0.42, 0.6, "b"); gbox(F, "oak", 0, 0.45 + 0.95, 14.05, 0.9, 1.9, 0.12, "b"); GTINT = [1.1, 0.3, 0.3]; gbox(F, "plain", 0, 0.45 + 0.44, 13.72, 0.8, 0.05, 0.55, "b"); GTINT = [1, 1, 1];   // the king's chair
  gbox(F, "oak", 0, 0.45 + 0.21, 13.5, 7, 0.42, 0.45, "b");   // a bench behind the high table for the others
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
// the rest of the royal household's buildings, inside the palisade: the queen's chamber (Queen Edith kept her own household), a chapel,
// the housecarls' hall (the king's guard), stables, a bakehouse and a brewhouse, a strong-house for the treasure, a guest house, the gate
{ const P = (dx, dz) => [PALACE[0] + dx, PALACE[1] + dz];
  for (const [[x, z], w, d, ry, o, name] of [[P(36, 28), 8, 14, 0, { wall: "plank", roof: "shingle", wh: 4.6 }, "queen"], [P(46, -26), 9, 24, 0, { wall: "plank", roof: "thatch", wh: 3.2 }, "housecarls"], [P(-39, -29), 7, 26, Math.PI / 2, { wall: "plank", roof: "thatch", wh: 2.8 }, "stables"],
    [P(-24, 18), 6, 9, 0, { wall: "daub", roof: "thatch" }, "bake"], [P(-34, 26), 6, 9, 0, { wall: "daub", roof: "thatch" }, "brew"], [P(58, 6), 6, 8, 0, { wall: "plank", roof: "shingle", wh: 3 }, "treasury"], [P(-49, 34), 7, 16, 0, { wall: "plank", roof: "shingle", wh: 3 }, "guest"]]) {
    const H = addHouse(x, z, w, d, ry, { door: "-z", kind: "palace-" + name, ...o, ...(ERA === 1285 ? { wall: "rubble", roof: "shingle", wh: (o.wh || 2.6) + 1.2 } : {}) }); H.noEnter = true; }
  const [cx, cz] = P(-29, 44); addChurch(cx, cz, { mat: "rag", roof: "shingle", nl: 12, nw: 6 });   // the king's chapel
  const [gx, gz] = [PALACE[0] + 4 - 70, PALACE[1] + 4]; for (const s of [-1, 1]) { put("gatepost", BOX_G, MAT.wood, gx, groundH(gx, gz) - 0.2, gz + s * 3.2, 0.6, 5.2, 0.6); solid(gx, gz + s * 3.2, 0.6, 0.6, 0); } put("gatepost", BOX_G, MAT.wood, gx, groundH(gx, gz) + 4.4, gz, 0.7, 0.5, 7.2); put("r:shingle", GABLE_G, MAT.shingle, gx, groundH(gx, gz) + 4.9, gz, 2, 1.4, 7.6, 0);   // the gate
  for (let k = 0; k < 4; k++) { const [x, z] = P(-39 - 9 + k * 6, -24.5); } }
}
const HALL_IN = (x, z) => zoneOf(x, z) === "hall";
// ---------- churches you can walk into ----------
// A Late Saxon parish church: a nave for the people, a smaller chancel for the altar beyond a narrow chancel arch, walls plastered and
// limewashed inside (often painted), an earth or mortar floor, no seats. Each is a room: its own light, and people inside seen through the door.
function gChurchWalk(x, z, o) { const gy = groundH(x, z) - 0.3, nl = o.nl, nw = o.nw, cl = o.cl, cw = o.cw, wh = o.wh, wm = o.mat === "plank" ? "stave" : "rubble", rf = o.roof, ah = Math.min(wh * 0.7, 4.2);
  const NF = FR(x, z, Math.PI / 2, gy), CF = FR(x + nl / 2 + cl / 2, z, Math.PI / 2, gy, NF.key);
  GTINT = wm === "rubble" ? [1.05, 1.03, 1.0] : [1, 1, 1];
  gWalls(NF, wm, nw, nl, wh, 0.6, [["-z", 0, 1.3, 2.4], ["+z", 0, cw - 1.2, ah]]);   // west door; the chancel arch
  gWalls(CF, wm, cw, cl, wh * 0.8, 0.6, [["-z", 0, cw + 0.7, 0, []]]); gGableBoth(NF, wm, nw, nl, wh, nw * 0.6); gGableBoth(CF, wm, cw, cl, wh * 0.8, cw * 0.6);
  if (wm === "rubble") { GTINT = [1.25, 1.2, 1.1]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(NF, "rubble", sx * (nw / 2 + 0.08), wh / 2, sz * (nl / 2 + 0.08), 0.5, wh, 0.5); }   // dressed quoins
  GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (const f of [0.25, 0.7]) { garch(NF, "dark", sx * (nw / 2 + 0.3), wh * 0.45, -nl / 2 + nl * f, 0.4, 1.1, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; garch(NF, "plain", sx * (nw / 2 - 0.33), wh * 0.45, -nl / 2 + nl * f, 0.4, 1.1, [-sx, 0, 0]); GTINT = [1, 1, 1]; }   // windows: dark outside, daylight within
  garch(CF, "dark", 0, wh * 0.35, cl / 2 + 0.3, 0.4, 1.0, [0, 0, 1]); GTINT = [1.7, 1.7, 1.75]; garch(CF, "plain", 0, wh * 0.35, cl / 2 - 0.33, 0.4, 1.0, [0, 0, -1]); GTINT = [1, 1, 1];
  groof(NF, rf, nw, nl, wh, nw * 0.6, { e: 0.3, g: 0.25, under: "plank" }); groof(CF, rf, cw, cl, wh * 0.8, cw * 0.6, { e: 0.3, g: 0.2, under: "plank" });
  const by = wh + nw * 0.6; gbox(NF, wm, 0, by + 0.7, -nl / 2 + 0.3, 1.3, 1.4, 0.6, "b"); garch(NF, "dark", 0, by + 0.2, -nl / 2, 0.55, 0.9, [0, 0, -1]); groof(FR(x - nl / 2 + 0.3, z, Math.PI / 2, gy + by + 1.4, NF.key), "shingle", 1.5, 0.8, 0, 0.6, { e: 0.1, g: 0.1 });   // the bellcote
  gbox(NF, "oak", 0, by + 2.4, -nl / 2 + 0.3, 0.1, 0.9, 0.1); gbox(NF, "oak", 0, by + 2.55, -nl / 2 + 0.3, 0.5, 0.1, 0.1);
  // inside: limewashed plaster with a painted band, a floor, the altar with its cloth, cross and candles
  GTINT = [1.32, 1.3, 1.24]; for (const sx of [-1, 1]) gpoly(NF, "daub", [[sx * (nw / 2 - 0.31), 0, -nl / 2 + 0.31], [sx * (nw / 2 - 0.31), 0, nl / 2 - 0.31], [sx * (nw / 2 - 0.31), wh, nl / 2 - 0.31], [sx * (nw / 2 - 0.31), wh, -nl / 2 + 0.31]], [[0, 0], [nl, 0], [nl, wh], [0, wh]], [-sx, 0, 0]);
  GTINT = [0.9, 0.3, 0.22]; for (const sx of [-1, 1]) gpoly(NF, "plain", [[sx * (nw / 2 - 0.32), wh * 0.78, -nl / 2 + 0.31], [sx * (nw / 2 - 0.32), wh * 0.78, nl / 2 - 0.31], [sx * (nw / 2 - 0.32), wh * 0.83, nl / 2 - 0.31], [sx * (nw / 2 - 0.32), wh * 0.83, -nl / 2 + 0.31]], [[0, 0], [1, 0], [1, 1], [0, 1]], [-sx, 0, 0]);
  GTINT = [0.75, 0.72, 0.68]; gpoly(NF, "rush", [[-nw / 2, 0.32, -nl / 2], [nw / 2, 0.32, -nl / 2], [nw / 2, 0.32, nl / 2], [-nw / 2, 0.32, nl / 2]], [[0, 0], [nw, 0], [nw, nl], [0, nl]], [0, 1, 0]); gpoly(CF, "rush", [[-cw / 2, 0.36, -cl / 2], [cw / 2, 0.36, -cl / 2], [cw / 2, 0.36, cl / 2], [-cw / 2, 0.36, cl / 2]], [[0, 0], [cw, 0], [cw, cl], [0, cl]], [0, 1, 0]);
  GTINT = [1.1, 1.08, 1.02]; gbox(CF, "rubble", 0, 0.8, cl / 2 - 1.0, 1.6, 1.0, 0.8, "b"); GTINT = [1.4, 1.38, 1.32]; gbox(CF, "plain", 0, 1.32, cl / 2 - 1.0, 1.7, 0.04, 0.9, "b"); GTINT = [1, 0.85, 0.4]; gbox(CF, "plain", 0, 1.65, cl / 2 - 1.2, 0.06, 0.6, 0.06, ""); gbox(CF, "plain", 0, 1.8, cl / 2 - 1.2, 0.35, 0.06, 0.06, "");
  for (const sx of [-0.6, 0.6]) { const [px, , pz] = gw(CF, sx, 0, cl / 2 - 1.0); put("candle", CYL_G, M(0xe8e0c8), px, gy + 1.34, pz, 0.04, 0.22, 0.04); put("flame", FLAME_G, flameM, px, gy + 1.57, pz, 1.2, 1.2, 1.2); }
  GTINT = [1, 1, 1]; ZONES.push({ name: "church", F: NF, w: nw - 0.6, d: nl - 0.6, light: [0, wh * 0.6, 0], doors: [[0, -nl / 2]] }, { name: "church", F: CF, w: cw - 0.6, d: cl - 0.6, light: [0, wh * 0.5, 0], doors: [] }); }

// markers (defined here so the buildings of every period can use them)
const MARKS = [];
const mark = (name, x, z, tag, text, o = {}) => { if (MARKET && o.coronation) return null; const m = { name, x, z, tag, text, y: o.y, r: o.r || 25, range: o.range || 700, big: !!o.big, follow: o.follow, hidden: !!o.hidden }; MARKS.push(m); return m; };
const markLL = (name, lat, lon, tag, text, o) => { const [x, z] = LL(lat, lon); return mark(name, x, z, tag, text, o); };


// ---------- shared by the later periods: people placed inside buildings, coloured glass, painted walls ----------
const INTERIOR_FOLK = [];   // [role, x, z, faceX, faceZ, pose]: spawned by the life module before the street crowd
// stained glass: a round-headed light of deep blue with red medallions framed in yellow, the lead lines dark (13th-century colours)
const GLASS_G = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), GLASS_M = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, map: tex(128, 256, (g, w, h) => {
  const lancet = () => { g.beginPath(); g.moveTo(0, h); g.lineTo(0, w / 2); g.arc(w / 2, w / 2, w / 2, Math.PI, 0); g.lineTo(w, h); g.closePath(); };
  g.save(); lancet(); g.clip(); g.fillStyle = "#1c3a8c"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a7a3a"; for (let y = 0; y < h; y += 28) { g.fillRect(4, y, 10, 10); g.fillRect(w - 14, y + 14, 10, 10); }
  for (let y = 46; y < h - 20; y += 62) { g.fillStyle = "#a81e2a"; g.beginPath(); g.arc(w / 2, y + 18, 27, 0, 6.283); g.fill(); g.strokeStyle = "#e0c050"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#e8d8a8"; g.beginPath(); g.arc(w / 2, y + 8, 7, 0, 6.283); g.fill(); g.fillStyle = "#d8b040"; g.fillRect(w / 2 - 7, y + 16, 14, 20); }
  g.strokeStyle = "rgba(15,15,20,.85)"; g.lineWidth = 2; for (let y = 12; y < h; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 6); g.stroke(); } for (let x = 20; x < w; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  g.restore(); g.strokeStyle = "#141414"; g.lineWidth = 5; lancet(); g.stroke(); }) });
function gWin(F, cx, y0, cz, w, h, out) { garch(F, "plain", cx, y0, cz, w, h, out); const [px, py, pz] = gw(F, cx + out[0] * 0.05, y0, cz + out[2] * 0.05), wx = out[0] * F.c + out[2] * F.s, wz = -out[0] * F.s + out[2] * F.c; put("glass", GLASS_G, GLASS_M, px, py, pz, w * 0.94, h * 0.98, 1, Math.atan2(wx, wz)); }
// the painted curtain round the foot of the walls, below a band of lozenges: the commonest 13th-century wall painting
const DADO_M = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.9, map: tex(512, 128, (g, w, h) => { for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, "#6a1e1a"); gr.addColorStop(0.5, "#a83a2e"); gr.addColorStop(1, "#5a1814"); g.fillStyle = gr; g.fillRect(x, 26, 16, h - 26); }
  g.fillStyle = "rgba(255,240,210,.18)"; for (let x = 0; x < w; x += 16) { g.beginPath(); g.moveTo(x + 3, 26); g.quadraticCurveTo(x + 8, 40, x + 13, 26); g.fill(); } g.fillStyle = "#e6dcc8"; g.fillRect(0, 0, w, 26); g.fillStyle = "#2a4a7a"; for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x + 12, 3); g.lineTo(x + 22, 13); g.lineTo(x + 12, 23); g.lineTo(x + 2, 13); g.fill(); } g.fillStyle = "#c8a040"; g.fillRect(0, 24, w, 3); }) });
DADO_M.map.wrapS = THREE.RepeatWrapping;
function dado(F, cx, cz, len, out, y0 = 0.3, h = 2.2) { const wx = out[0] * F.c + out[2] * F.s, wz = -out[0] * F.s + out[2] * F.c, g = new THREE.PlaneGeometry(len, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 4); const m = new THREE.Mesh(g, DADO_M), [px, , pz] = gw(F, cx, 0, cz); m.position.set(px, F.gy + y0 + h / 2, pz); m.rotation.y = Math.atan2(wx, wz); scene.add(m); }

// inside the White Tower, at the entrance floor: the great western room with its fireplace, the north-east chamber, and in the south-east
// St John's Chapel (about 1080), the oldest church interior in London to survive: round Caen-stone columns with cushion capitals, an
// arcade and gallery, a barrel vault, the apse to the east. Above, the upper floors and the wall passages; below, the storerooms.
function whiteTowerInside(F, W, D, H, T, FL, gy) { const iw = W - 2 * T, id = D - 2 * T, x0 = -W / 2 + T, x1 = W / 2 - T, z0 = -D / 2 + T, z1 = D / 2 - T, CX = 3.6, CZ = 1.5;
  GTINT = [0.62, 0.5, 0.38]; gbox(F, "plank", 0, FL - 0.12, 0, iw, 0.24, id, ""); surfRect(F, x0, x1, z0, z1, FL);
  // the cross wall, with two doorways, and the wall between the chamber and the chapel
  GTINT = [1.25, 1.2, 1.1]; for (const [a, b] of [[z0, -7], [-4.6, 3.4], [5.8, z1]]) { gbox(F, "rubble", CX, FL + (H - FL) / 2, (a + b) / 2, 2.2, H - FL, b - a, ""); const [px, , pz] = gw(F, CX, 0, (a + b) / 2); solid(px, pz, 2.2, b - a, 0); }
  for (const [lo, hi] of [[-7, -4.6], [3.4, 5.8]]) gbox(F, "rubble", CX, FL + 3.2 + (H - FL - 3.2) / 2, (lo + hi) / 2, 2.2, H - FL - 3.2, hi - lo, "");
  for (const [a, b] of [[CX + 1.1, 9], [11.4, x1]]) { gbox(F, "rubble", (a + b) / 2, FL + 5, CZ, b - a, 10, 1.2, ""); const [px, , pz] = gw(F, (a + b) / 2, 0, CZ); solid(px, pz, b - a, 1.2, 0); } gbox(F, "rubble", 10.2, FL + 6.6, CZ, 2.4, 6.8, 1.2, "");
  // ceilings of the great room and the chamber: oak boards on beams
  GTINT = [0.6, 0.48, 0.36]; gbox(F, "plank", (x0 + CX - 1.1) / 2, FL + 7.6, 0, CX - 1.1 - x0, 0.25, id, ""); gbox(F, "plank", (CX + 1.1 + x1) / 2, FL + 7.6, (z0 + CZ) / 2, x1 - CX - 1.1, 0.25, CZ - z0, "");
  for (let x = x0 + 2; x < CX - 1.5; x += 2.5) gbox(F, "oak", x, FL + 7.3, 0, 0.35, 0.4, id, "");
  // the great room: a fireplace in the west wall, a trestle table, chests, a hanging, arms stored along the north wall
  GTINT = [1, 1, 1]; garch(F, "dark", x0 + 0.02, FL, -2, 2.4, 2.2, [1, 0, 0]); { const [hx, , hz] = gw(F, x0 + 0.6, 0, -2); put("hfire", HFIRE_G, hearthFireM, hx, gy + FL, hz, 0.9, 0.8, 0.9); }
  gbox(F, "plank", -6, FL + 0.75, 2, 1.0, 0.08, 6); for (const u of [-1.5, 1.5]) gbox(F, "oak", -6, FL + 0.37, 2 + u * 1.6, 0.8, 0.74, 0.1); for (const sz of [-1, 1]) gbox(F, "plank", -6 + sz * 0.9, FL + 0.45, 2, 0.35, 0.06, 6);
  for (const u of [-10, -7]) gbox(F, "oak", u, FL + 0.35, z1 - 0.6, 1.4, 0.7, 0.7); gbox(F, "hang", -5, FL + 3.5, z1 - 0.05, 6, 2.6, 0.05, "");
  for (let u = x0 + 1; u < CX - 2; u += 0.45) gbox(F, "oak", u, FL + 1.6, z0 + 0.4, 0.05, 3.2, 0.05, ""); gbox(F, "oak", (x0 + CX - 2) / 2, FL + 1.2, z0 + 0.35, CX - 2 - x0, 0.1, 0.12, "");
  // windows: daylight in the deep embrasures
  GTINT = [1.7, 1.7, 1.75]; for (const u of [-10.5, -3, 8, 13]) garch(F, "plain", u, FL + 2.8, z0 - 0.02, 1.0, 2.2, [0, 0, 1]); for (const u of [-10.5, -1]) garch(F, "plain", u, FL + 2.8, z1 + 0.02, 1.0, 2.2, [0, 0, -1]); for (const u of [-6, 4]) garch(F, "plain", x0 - 0.02, FL + 2.8, u, 1.0, 2.2, [1, 0, 0]);
  // St John's Chapel: nave between two rows of round columns, aisles, the gallery arcade above, a barrel vault, the painted apse at the east
  const ax = 9.4, az = 8.2, cM = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: 0.85 }), vM = new THREE.MeshStandardMaterial({ color: 0xece4d4, roughness: 0.9, side: THREE.DoubleSide });
  for (const sz of [-1, 1]) { for (const x of [CX + 2.4, CX + 5.2, CX + 8, CX + 10.8]) { const [px, , pz] = gw(F, x, 0, az + sz * 2.9); put("wtcol", CYL_G, cM, px, gy + FL, pz, 1.1, 5.2, 1.1); put("wtcol", BOX_G, cM, px, gy + FL + 5.2, pz, 1.25, 0.55, 1.25); solid(px, pz, 1.0, 1.0, 0); }
    GTINT = [1.35, 1.3, 1.2]; gbox(F, "rubble", ax + 0.6, FL + 7.6, az + sz * 2.9, x1 - CX - 1.1, 4.6, 0.9, ""); GTINT = [1, 1, 1]; for (const x of [CX + 3.8, CX + 6.6, CX + 9.4]) { garch(F, "dark", x, FL + 6.4, az + sz * 2.9 - sz * 0.47, 1.6, 2.6, [0, 0, -sz]); garch(F, "dark", x, FL + 6.4, az + sz * 2.9 + sz * 0.47, 1.6, 2.6, [0, 0, sz]); } }
  { const s = new THREE.Shape(); s.absarc(0, 0, 2.95, 0, Math.PI, false); s.lineTo(-2.75, 0); s.absarc(0, 0, 2.75, Math.PI, 0, true); s.lineTo(2.95, 0); const g = new THREE.ExtrudeGeometry(s, { depth: x1 - CX - 1.1, bevelEnabled: false, curveSegments: 12 }).rotateY(Math.PI / 2); const m = new THREE.Mesh(g, vM); const [vx, , vz] = gw(F, CX + 1.1, 0, az); m.position.set(vx, gy + FL + 9.9, vz); scene.add(m); }
  GTINT = [0.62, 0.5, 0.38]; for (const sz of [-1, 1]) gbox(F, "plank", ax + 0.6, FL + 5.5, az + sz * 4.25, x1 - CX - 1.1, 0.2, 2.0, "");
  { const mu = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 7), AMAT.mural); const [mx, , mz] = gw(F, x1 - 0.04, 0, az); mu.position.set(mx, gy + FL + 4.2, mz); mu.rotation.y = -Math.PI / 2; scene.add(mu); }
  put("altar", BOX_G, AMAT.ashlar, ...gw(F, x1 - 1.4, FL, az), 1.0, 1.0, 2.2); GTINT = [1.15, 0.35, 0.3]; gbox(F, "plain", x1 - 1.4, FL + 1.02, az, 1.1, 0.04, 2.3, ""); GTINT = [1, 1, 1];
  personFloor(F, x0, x1, z0, z1, FL); { for (const [u, v] of [[-12, -9], [-4, 9]]) { const [px, , pz] = gw(F, u, 0, v), [qx, , qz] = gw(F, 0, 0, 0); INTERIOR_FOLK.push(["soldier", px, pz, qx, qz, "guard"]); } const [cx, , cz] = gw(F, x1 - 2.6, 0, az), [ax2, , az2] = gw(F, x1, 0, az); INTERIOR_FOLK.push(["cleric", cx, cz, ax2, az2, "pray"]); }
  { dado(F, -6, z0 + 0.03, x1 - x0 - 2, [0, 0, 1], FL); dado(F, -6, z1 - 0.03, x1 - x0 - 2, [0, 0, -1], FL); }
  ZONES.push({ name: "wtower", F, w: iw - 0.4, d: id - 0.4, light: [0, FL + 4, 0], doors: [[-6.5, D / 2]], lp: 110, ld: 34 });
  mark("St John's Chapel", ...gw(F, ax, 0, az).filter((_, i) => i !== 1), "known", "The Conqueror's chapel inside the White Tower, built about 1080 and still there today: plain, massive Romanesque, with round columns of Caen stone and cushion capitals, an arcaded gallery above and a barrel vault, ending in an apse. Henry III had it painted and glazed and gave it a painted rood and images.", { y: FL + 10, range: 60, r: 8 }); }

// ---------- London in 1100: what the Normans had built ----------
// A generation after the Conquest: the White Tower finished (begun about 1075-80, done about 1100) in its bailey in the corner of the Roman
// walls; Baynard's Castle and Montfichet's Tower guarding the west of the City; William Rufus's great hall at Westminster (1097-99); the new
// St Paul's rising after the fire of 1087; St Mary-le-Bow on Cheapside (about 1080); the abbey's nave finished; Southwark rebuilt.
if (ERA >= 1100) {
  const rect = (lat0, lon0, lat1, lon1, v) => { const [x0, z0] = LL(lat0, lon0), [x1, z1] = LL(lat1, lon1); rRect((x0 + x1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(z1 - z0), 0, v); };
  rect(51.5073, -0.0783, 51.5093, -0.0755, 4);   // the Tower's bailey, kept clear of houses
  // the White Tower: about 36 x 32.5 m and 27.5 m to the battlements, Kentish ragstone with Caen stone dressings; turrets at the corners
  // (the north-east one round, holding the stair); the apse of St John's Chapel projecting at the south-east; the door at first-floor level,
  // reached by a timber stair. Flat pilaster buttresses, round-headed windows, paired above. Not yet whitewashed (that came in 1240).
  { const [tx, tz] = LL(51.50815, -0.07595), gy = Math.min(...[[-18, -16], [18, -16], [-18, 16], [18, 16], [0, 0]].map(([a, b]) => groundH(tx + a, tz + b))) - 0.4, F = FR(tx, tz, 0, gy, "tower"), W = 36, D = 32.5, H = 27.5, rag = ERA === 1285 ? [1.95, 1.93, 1.88] : [1.15, 1.1, 1.02], caen = ERA === 1285 ? [2.0, 1.98, 1.92] : [1.4, 1.34, 1.16];
    // hollow: walls about 3.6 m thick, the door at first-floor level on the south side, reached by the timber stair (walk up it)
    const T = 3.6, FL = 6.2; GTINT = rag; gWalls(F, "rubble", W, D, H, T, [["+z", -6.5, 2.8, 9.2, [[9.2, H]]]]); gbox(F, "rubble", -6.5, FL / 2, D / 2 - T / 2, 2.8, FL, T, ""); { const [px, , pz] = gw(F, -6.5, 0, D / 2 - T / 2); solid(px, pz, 2.8, T, 0).ymax = gy + FL - 1; }
    gbox(F, "rubble", 0, H - 0.3, 0, W - T, 0.6, D - T, "");
    GTINT = caen; for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = 0; y < H; y += 1.2) gbox(F, "rubble", sx * W / 2, y + 0.5, sz * D / 2, (y / 1.2) % 2 ? 1.0 : 0.6, 0.6, (y / 1.2) % 2 ? 0.6 : 1.0, "");   // dressed quoins
    for (const [side, L] of [["x", D], ["z", W]]) for (const sg of [-1, 1]) for (let u = -L / 2 + L / 4; u < L / 2; u += L / 4) { const px = side === "x" ? sg * (W / 2 + 0.3) : u, pz = side === "x" ? u : sg * (D / 2 + 0.3); gbox(F, "rubble", px, H / 2, pz, side === "x" ? 0.6 : 1.4, H, side === "x" ? 1.4 : 0.6, "b"); }   // pilaster buttresses
    GTINT = [1, 1, 1]; for (const [side, L] of [["x", D], ["z", W]]) for (const sg of [-1, 1]) for (let u = -L / 2 + L / 8; u < L / 2; u += L / 4) { const o = side === "x" ? [sg, 0, 0] : [0, 0, sg], px = side === "x" ? sg * W / 2 : u, pz = side === "x" ? u : sg * D / 2;
      garch(F, "dark", px, 4, pz, 0.35, 1.2, o); garch(F, "dark", px, 10, pz, 1.0, 2.0, o); for (const du of [-0.8, 0.8]) garch(F, "dark", px + (side === "z" ? du : 0), 17.5, pz + (side === "x" ? du : 0), 1.1, 2.8, o); }
    GTINT = rag; for (let u = -W / 2; u < W / 2; u += 1.6) for (const sz of [-1, 1]) gbox(F, "rubble", u + 0.4, H + 0.6, sz * (D / 2 - 0.4), 0.8, 1.2, 0.8, "b");   // battlements
    for (let u = -D / 2; u < D / 2; u += 1.6) for (const sx of [-1, 1]) gbox(F, "rubble", sx * (W / 2 - 0.4), H + 0.6, u + 0.4, 0.8, 1.2, 0.8, "b");
    for (const [sx, sz] of [[-1, -1], [1, 1], [-1, 1]]) { gbox(F, "rubble", sx * (W / 2 - 3), H + 3, sz * (D / 2 - 3), 6.4, 6, 6.4, "b"); garch(F, "dark", sx * (W / 2 - 3) + sx * 3.2, H + 2.5, sz * (D / 2 - 3), 0.5, 1.4, [sx, 0, 0]); }   // the square turrets
    { const c = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.8, H + 6, 18).translate(0, (H + 6) / 2, 0), new THREE.MeshStandardMaterial({ map: G_TEX.rubble, color: 0xe8e0d0, roughness: 0.95 })); const [px, , pz] = gw(F, W / 2 - 2.5, 0, -D / 2 + 2.5); c.position.set(px, gy, pz); scene.add(c); }   // the round north-east stair turret
    { const [ax, , az] = gw(F, W / 2, 0, D / 2 - 7); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k + 0.5) / 7 * Math.PI, SF = FR(ax + Math.cos(a) * 6.3, az + Math.sin(a) * 6.3, -a, gy, "tower"); GTINT = rag; gbox(SF, "rubble", 0, H / 2, 0, 1.6, H, 3.0); if (k % 2) { GTINT = [1, 1, 1]; garch(SF, "dark", 0.82, 17, 0, 0.9, 2.4, [1, 0, 0]); } } solid(ax + 3, az, 7, 12, 0); }   // the chapel's apse
    const sb = Math.max(0.05, groundH(tx - 14.6, tz + D / 2 + 1.4) - gy), ns = Math.max(4, Math.round((FL - sb) / 0.45)), run = Math.max(6.6, ns * 0.4); GTINT = [0.55, 0.42, 0.3]; for (let k = 0; k < ns; k++) gbox(F, "oak", -8 - k * run / ns, FL - 0.2 - k * (FL - 0.2 - sb) / ns, D / 2 + 1.4, run / ns + 0.02, 0.12, 2.0, ""); gbox(F, "oak", -6.5, 6.2, D / 2 + 1.4, 3, 0.2, 2.2, ""); GTINT = [1, 1, 1]; surfRect(F, -8 - run, -7.8, D / 2 + 0.4, D / 2 + 2.4, sb, FL - 0.1, false); surfRect(F, -8.1, -5, D / 2 + 0.3, D / 2 + 2.5, FL); surfRect(F, -7.9, -5.1, D / 2 - T - 0.3, D / 2 + 0.3, FL);   // the timber stair to the first-floor door
    whiteTowerInside(F, W, D, H, T, FL, gy);
    GTINT = [1, 1, 1];
    mark("The White Tower", tx, tz, "known", "William the Conqueror's great stone keep, begun about 1075-80 under Gundulf, bishop of Rochester, and finished about 1100: about 36 by 32.5 m and 27.5 m high, of Kentish ragstone with Caen stone dressings, walls up to 4.5 m thick. Inside, a great hall and chambers, and St John's Chapel (its apse projects at the south-east corner). The door was at first-floor level, up a timber stair. It stood in a bailey in the angle of the Roman walls, with a ditch and palisade on the landward sides. It was first whitewashed in 1240, which gave it its name.", { big: true, range: 3500, y: 36, r: 40 }); }
  if (ERA === 1100) { const R = seeded(1100), pts = TOWER_DITCH.P; for (let k = 1; k < pts.length; k++) { const [ax, az] = pts[k - 1], [bx, bz] = pts[k], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 1.2); for (let q = 0; q < n; q++) { const x = ax + (bx - ax) * q / n + (bz - az) / len * 10, z = az + (bz - az) * q / n - (bx - ax) / len * 10; if (k === 2 && Math.abs(q - n / 2) < 3) continue; put("pale", BOX_G, MAT.paleWood || (MAT.paleWood = M(0x8a7a64)), x, groundH(x, z) - 0.3, z, 0.3, 4, 0.3); solid(x, z, 0.4, 0.4, 0); } }   // the palisade inside the ditch, a gate in the north side
    const [gx, gz] = TOWER_DITCH.at(TOWER_DITCH.cum[1] + (TOWER_DITCH.L - TOWER_DITCH.cum[1]) / 2); put("gatepost", BOX_G, MAT.wood, gx, groundH(gx, gz) + 3.8, gz + 10, 6, 0.5, 0.6); for (const s of [-3, 3]) put("gatepost", BOX_G, MAT.wood, gx + s, groundH(gx, gz) - 0.3, gz + 10, 0.6, 4.6, 0.6);
    const [hx, hz] = LL(51.5088, -0.0776); addHouse(hx, hz, 8, 18, 0, { wall: "plank", roof: "shingle", door: "+x", kind: "palace-towerhall" }).noEnter = true; const [sx2, sz2] = LL(51.5078, -0.0777); addHouse(sx2, sz2, 6, 10, 0, { wall: "plank", roof: "thatch", door: "+x" }).noEnter = true; }   // timber buildings in the bailey
  // Baynard's Castle and Montfichet's Tower: built after 1066 by Norman lords in the west of the City, by the Fleet. Their form is not known
  // (a large ditch found at Ludgate Hill in 1986 may be Montfichet's); shown as stone towers in ditched and palisaded enclosures.
  if (ERA === 1100) for (const [name, lat, lon, s, text] of [["Baynard's Castle", 51.5117, -0.1024, 14, "Built after the Conquest by Ralph Baynard, a Norman lord who appears in Domesday Book, on the riverside in the south-west corner of the City, where the wall met the Fleet. Its form is unknown; King John destroyed it in 1213, and a later Baynard's Castle was built further east."],
    ["Montfichet's Tower", 51.5133, -0.1013, 12, "The fortified house of the Montfichet family, by Ludgate, recorded in the 12th century and pulled down in the 13th (the Blackfriars' friary took its site). A large ditch found in excavations at Ludgate Hill in 1986 may be its moat. Form inferred."]]) {
    const [x, z] = LL(lat, lon), gy = groundH(x, z) - 0.3; rRect(x, z, 70, 70, 0, 4); const F = FR(x, z, 0, gy, "tower"); GTINT = [0.95, 0.92, 0.86]; gbox(F, "rubble", 0, s * 0.6, 0, s, s * 1.2, s); solid(x, z, s, s, 0);
    for (let u = -s / 2; u < s / 2; u += 1.5) for (const sg of [-1, 1]) { gbox(F, "rubble", u + 0.4, s * 1.2 + 0.5, sg * (s / 2 - 0.4), 0.7, 1.0, 0.7, "b"); gbox(F, "rubble", sg * (s / 2 - 0.4), s * 1.2 + 0.5, u + 0.4, 0.7, 1.0, 0.7, "b"); }
    GTINT = [1, 1, 1]; for (const o of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) { garch(F, "dark", o[0] * s / 2, s * 0.75, o[2] * s / 2, 0.8, 1.8, o); garch(F, "dark", o[0] * s / 2, s * 0.35, o[2] * s / 2, 0.35, 1.0, o); }
    for (let a = 0; a < 6.283; a += 0.06) { if (Math.abs(a - 1.6) < 0.1) continue; const px = x + Math.cos(a) * 28, pz = z + Math.sin(a) * 28; put("pale", BOX_G, MAT.paleWood, px, groundH(px, pz) - 0.3, pz, 0.3, 3.6, 0.3); solid(px, pz, 0.4, 0.4, 0); }
    mark(name, x, z, "inferred", text, { y: s * 1.4, range: 1500, r: 30 }); }
  // Westminster Hall: built by William Rufus in 1097-99, about 73 x 20 m inside, the largest hall in Europe. Its walls survive inside the
  // later hall (the roof is Richard II's); Rufus's hall had round-headed windows high up with a wall passage, and probably timber posts
  // dividing it into aisles. He held his first court in it at Whitsun 1099, and is said to have called it too big for a chamber, not big enough for a hall.
  { const [hx, hz] = [125, -30], gy = groundH(hx, hz) - 0.2, F = FR(hx, hz, 0, gy, "whall"), w = 22, d = 75, wh = 12, rh = 9; rRect(hx, hz, 30, 82, 0, 4);
    GTINT = [1.12, 1.08, 1.0]; gWalls(F, "rubble", w, d, wh, 2.0, [["-z", 0, 3.4, 5.5]]); gGableBoth(F, "rubble", w, d, wh, rh); GTINT = [0.92, 0.92, 0.92]; groof(F, "shingle", w, d, wh, rh, { under: "plank", e: 0.6, t: 0.3 });
    GTINT = [1.25, 1.2, 1.08]; for (const sx of [-1, 1]) for (let z = -d / 2 + 2.5; z < d / 2; z += 4.6) gbox(F, "rubble", sx * (w / 2 + 1.25), wh / 2, z, 0.5, wh, 1.3, "b");   // pilaster buttresses
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let z = -d / 2 + 4.8; z < d / 2 - 2; z += 4.6) { garch(F, "dark", sx * (w / 2 + 1.03), 7.5, z, 1.1, 2.8, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; garch(F, "plain", sx * (w / 2 - 1.03), 7.5, z, 1.1, 2.8, [-sx, 0, 0]); GTINT = [1, 1, 1]; }
    for (const sx of [-1, 1]) for (let z = -d / 2 + 7; z < d / 2 - 4; z += 7.5) { gbox(F, "oak", sx * 5.5, (wh + 5) / 2, z, 0.6, wh + 5, 0.6); const [px, , pz] = gw(F, sx * 5.5, 0, z); solid(px, pz, 0.6, 0.6, 0); }   // the timber posts of the aisles
    GTINT = [0.7, 0.68, 0.64]; gpoly(F, "rush", [[-w / 2, 0.24, -d / 2], [w / 2, 0.24, -d / 2], [w / 2, 0.24, d / 2], [-w / 2, 0.24, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]);
    GTINT = [1, 1, 1]; gbox(F, "plank", 0, 0.45, d / 2 - 3, w - 2.2, 0.5, 5, "b"); gbox(F, "oak", 0, 1.3, d / 2 - 1.5, 1.0, 1.6, 0.8, "b"); GTINT = [1.1, 0.3, 0.3]; gbox(F, "plain", 0, 1.32, d / 2 - 1.9, 0.9, 0.06, 0.7, "b");   // the dais and the king's seat
    GTINT = [0.25, 0.2, 0.18]; gbox(F, "rubble", 0, 0.3, 0, 1.6, 0.14, 5, "b"); GTINT = [1, 1, 1];
    for (let k = 0; k < 6; k++) { const [x, , z] = gw(F, (k % 2 - 0.5) * 0.5, 0, -2 + k * 0.8); put("hfire", HFIRE_G, hearthFireM, x, gy + 0.36, z, 1, 0.9, 1); }
    flatUnder(F, w + 1, d + 1, gy + 0.2);
    ZONES.push({ name: "whall", F, w: w - 4, d: d - 4, light: [0, 6, 0], doors: [[0, -d / 2]], lp: 140, ld: 70 });
    mark("Westminster Hall", hx, hz, "known", "Built by William Rufus in 1097-99: about 73 by 20 m inside, the largest hall in Europe. Its walls survive inside the present hall (the great roof is Richard II's, of the 1390s). Rufus held his first court in it at Whitsun 1099; he is said to have called it too big for a chamber, not big enough for a hall. The aisle posts and roof are inferred.", { big: true, range: 2500, y: 22, r: 40 }); }
  // the new St Paul's: after the great fire of 1087 burned the Saxon cathedral and much of the City, Bishop Maurice began a vast Norman
  // church (eventually some 180 m long). In 1100 its east end is rising: aisle walls, round piers, scaffolding, stone stacked on the site.
  if (ERA === 1100) { const [x, z] = LL(51.5138, -0.0985), gy = groundH(x, z) - 0.3, F = FR(x, z, Math.PI / 2, gy, "pauls"), R = seeded(87); rRect(x, z, 150, 96, 0, 4);
    GTINT = [1.2, 1.15, 1.02]; for (const sx of [-1, 1]) for (let zz = -10; zz < 46; zz += 4) { const top = 7 + 7 * Math.max(0, Math.sin((zz + 14) / 24)) + R() * 1.5; gbox(F, "rubble", sx * 15, top / 2, zz + 2, 2.2, top, 4.02); if (zz > -6 && zz < 30) { GTINT = [1, 1, 1]; garch(F, "dark", sx * 16.12, 3, zz + 2, 1.0, 2.2, [sx, 0, 0]); GTINT = [1.2, 1.15, 1.02]; } }
    for (const sx of [-1, 1]) for (let zz = -6; zz < 40; zz += 6) { const h2 = 4 + R() * 6; const c = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.25, h2, 14).translate(0, h2 / 2, 0), new THREE.MeshStandardMaterial({ map: G_TEX.rubble, color: 0xf0e8d8, roughness: 0.9 })); const [px, , pz] = gw(F, sx * 6, 0, zz); c.position.set(px, gy, pz); scene.add(c); solid(px, pz, 2.4, 2.4, 0); }   // the round piers of the choir arcades
    for (const sx of [-1, 1]) for (let zz = -10; zz < 46; zz += 3) { const [px, , pz] = gw(F, sx * 17.2, 0, zz); put("pole", CYL_G, MAT.wood, px, gy, pz, 0.16, 15, 0.16); for (let hh = 2; hh < 15; hh += 2.5) { const [qx, , qz] = gw(F, sx * 16.6, 0, zz + 1.5); put("pole", BOX_G, MAT.wood, qx, gy + hh, qz, 1.2, 0.12, 3, Math.PI / 2); } }   // scaffolding
    for (let k = 0; k < 40; k++) { const [px, , pz] = gw(F, (R() - 0.5) * 50, 0, -30 - R() * 25); put("block", BOX_G, AMAT.ashlar, px, gy + 0.2 + (k % 3) * 0.45, pz, 0.8, 0.42, 0.55, R()); }
    for (const zz of [5, 30]) { const [px, , pz] = gw(F, 0, 0, zz); put("pole", CYL_G, MAT.wood, px, gy, pz, 0.35, 18, 0.35); put("pole", BOX_G, MAT.wood, px + 3, gy + 18, pz, 6, 0.3, 0.3); }   // hoists
    for (const [dx, dz] of [[-10, 36], [6, 38], [22, -34], [-16, -36]]) addHouse(x + dx, z + dz, 6, 10, 0, { wall: "plank", roof: "shingle", door: "-z" });   // canons' houses
    mark("The new St Paul's", x, z, "known", "The great fire of 1087 burned the Saxon cathedral and much of London. Bishop Maurice began a vast new church in the Norman style, of Caen stone, which was to take two centuries and grow to some 180 m: 'Old St Paul's', lost in the Great Fire of 1666. In 1100 the east end is rising in scaffolding; services are held in temporary buildings. The scale and stage of work shown are inferred.", { big: true, range: 3000, y: 22, r: 45 }); }
  // St Mary-le-Bow: a new stone church of about 1080 on Cheapside, named for the arches ('bows') of its crypt, which survives
  { let [x, z] = LL(51.5136, -0.0937), ok = false; for (let r = 0; r < 70 && !ok; r += 3) for (let a = 0; a < 6.28 && !ok; a += 0.7) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (rRect(X, Z, 36, 24, 0, 0, true)) { x = X; z = Z; ok = true; } }
    addChurch(x, z, { mat: "rag", roof: "shingle", nl: 20, nw: 9, cl: 8, cw: 7, wh: 9 }); mark("St Mary-le-Bow", x, z, "known", "A new stone church built about 1080 on Cheapside, by a Norman lord or merchant; named for the round arches ('bows') of its crypt, which still survives under Wren's church. In 1091 a great storm tore off its roof. Its form above ground is inferred.", { y: 14, range: 900, r: 20 }); }
}

// ---------- London in 1285: Westminster ----------
// The Confessor's palace has given way to Henry III's, on the same ground between the abbey and the river: Rufus's great hall, the Lesser
// Hall, the Painted Chamber, the Queen's Chamber, the old chapel of St Stephen (rebuilt from 1292), all of stone. The king's courts sit in
// Westminster Hall: the King's Bench and Chancery at the marble table on the dais at the south end, the Common Pleas by the north door.
// Beside it, the Exchequer, where sheriffs account for the king's revenues on a cloth ruled in squares like a chessboard.
if (ERA === 1285) {
  // Henry III's palace round Rufus's hall: the Lesser Hall to its south, the Painted Chamber beyond, the Queen's Chamber, the old chapel of
  // St Stephen by the river, the kitchens; a stone precinct wall with a gatehouse on the north, onto the palace yard. Plan simplified.
  { const pT = tex(512, 256, (g, W, H) => { g.fillStyle = "#2e5a3a"; g.fillRect(0, 0, W, H); g.fillStyle = "#d8b040"; for (let y = 90; y < H; y += 34) for (let x = (y / 34 % 2) * 17; x < W; x += 34) { g.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283, r = k % 2 ? 3 : 8; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
      g.fillStyle = "#1e3a6a"; g.fillRect(0, 0, W, 76); g.fillStyle = "#c8a040"; g.fillRect(0, 74, W, 5); for (let k = 0; k < 8; k++) { const x = 32 + k * 64; g.fillStyle = "#e0b898"; g.beginPath(); g.arc(x, 18, 7, 0, 6.283); g.fill(); g.fillStyle = ["#a82a2a", "#e8dcc0", "#3a7a3a", "#c8a040"][k % 4]; g.fillRect(x - 10, 26, 20, 40); if (k === 3) { g.fillStyle = "#d8b040"; g.fillRect(x - 8, 6, 16, 5); } } });
    const pM = new THREE.MeshStandardMaterial({ map: pT, roughness: 0.9, side: THREE.DoubleSide }), lead = [0.62, 0.64, 0.68], tile = [0.95, 0.6, 0.48];
    walkHall(135, 24, 12, 30, 10, lead, "whpal"); mark("The Lesser Hall", 135, 24, "known", "Henry III's Lesser Hall (later called the White Hall), south of Rufus's great hall: the king's everyday hall, where he dines and gives audience, and where Parliaments will later meet. Edward the Confessor's timber palace, which stood near here, is long gone.", { y: 14, range: 900, r: 14 });
    const PF = walkHall(152, 52, 9, 26, 9, tile, "whpal", undefined, true); for (const [cx, cz, len, ry] of [[-4.08, 0, 24, Math.PI / 2], [4.08, 0, 24, -Math.PI / 2], [0, 12.58, 7.6, Math.PI]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(len, 5.6), pM), [px, , pz] = gw(PF, cx, 0, cz); m.position.set(px, PF.gy + 3.3, pz); m.rotation.y = ry + Math.atan2(PF.s, PF.c); scene.add(m); }
    { const [bx, , bz] = gw(PF, 0, 0, 9); put("pcbed", BOX_G, MAT.wood, bx, PF.gy + 0.32, bz, 2.4, 0.7, 2.2, Math.atan2(PF.s, PF.c)); put("pcbed", BOX_G, M(0x8a2a3a), bx, PF.gy + 1.02, bz, 2.3, 0.15, 2.1, Math.atan2(PF.s, PF.c)); for (const [u, v] of [[-1.1, -1], [1.1, -1], [-1.1, 1], [1.1, 1]]) { const [qx, , qz] = gw(PF, u, 0, 9 + v); put("pcbed", CYL_G, MAT.wood, qx, PF.gy + 0.32, qz, 0.1, 2.6, 0.1); } }
    mark("The Painted Chamber", 152, 52, "known", "The king's great chamber, where he sleeps and holds council: Henry III had it painted green with gold stars in 1236, and after a fire in 1263 covered with paintings of the Coronation of Edward the Confessor, the Virtues trampling the Vices, and Old Testament battles, with gilded bosses on the ceiling. The real room was about 24 m long, on an upper floor.", { y: 13, range: 900, r: 14 });
    walkHall(184, 34, 8, 18, 8, tile, "whpal"); mark("The Queen's Chamber", 184, 34, "known", "The chambers of Queen Eleanor of Castile, Edward I's wife, painted and glazed; the queen keeps her own household, with its own hall, chapel and garden.", { y: 12, range: 700, r: 10 });
    { const [cx, cz] = [170, -24]; addChurch(cx, cz, { mat: "rag", roof: "shingle", nl: 20, nw: 8, cl: 7, cw: 6, wh: 8 }); mark("St Stephen's Chapel", cx, cz, "known", "The palace chapel of St Stephen, by the river east of the great hall. In 1292 Edward I will begin rebuilding it as a sumptuous two-storey chapel to rival the Sainte-Chapelle in Paris; later still it became the House of Commons.", { y: 14, range: 800 }); }
    walkHall(108, 44, 9, 14, 7, tile, "whpal"); mark("The king's kitchens", 108, 44, "known", "The great kitchens, larders and sculleries of the palace, feeding a household of hundreds when the king is here.", { y: 11, range: 600, r: 10 });
    // the precinct wall, with the gatehouse onto the palace yard to the north of the great hall
    const wallLine = [[98, -108], [215, -108], [215, 82], [98, 82], [98, -108]], gate = [125, -108]; for (let i = 0; i < wallLine.length - 1; i++) { const [ax, az] = wallLine[i], [bx, bz] = wallLine[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 3), ry = Math.atan2(bx - ax, bz - az);
      for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n; if (Math.hypot(x - gate[0], z - gate[1]) < 3.5 || baseH(x, z) < 0.6 || rGet(x, z) === 2 || STREETS.some(S => S.L.near(x, z, 8) && S.L.d(x, z) < S.w / 2 + 1)) continue; put("w:rag", BOX_G, MAT.rag, x, groundH(x, z) - 0.5, z, 0.9, 4.5, L / n + 0.05, ry); solid(x, z, 0.9, L / n, ry); } }
    { const F = FR(gate[0], gate[1], 0, groundH(gate[0], gate[1]), "whpal"); GTINT = [1.15, 1.1, 1.0]; for (const sx of [-1, 1]) { gbox(F, "rubble", sx * 4.6, 5, 0, 4, 10, 6); const [px, , pz] = gw(F, sx * 4.6, 0, 0); solid(px, pz, 4, 6, 0); } gbox(F, "rubble", 0, 7.5, 0, 5.2, 5, 6, ""); for (let u = -6; u <= 6; u += 1.5) gbox(F, "rubble", u, 10.5, 2.6, 0.7, 1, 0.6, "b"); GTINT = [1, 1, 1]; for (const sz of [-1, 1]) garch(F, "dark", 0, 5.2, sz * 3.02, 2.6, 1.6, [0, 0, sz]);
      mark("The palace gate", gate[0], gate[1], "known", "The gatehouse of the Palace of Westminster, opening onto the palace yard (New Palace Yard) before the great hall's north door. Petitioners, lawyers and suitors crowd through it whenever the courts are sitting.", { y: 12, range: 800, r: 10 }); } }
  // Westminster Hall: the courts in session
  { const Z = ZONES.find(z => z.name === "whall"); if (Z) { const F = Z.F, d = 75, w = 22;
      for (const [u, v, r, k] of [[-3, d / 2 - 2.0, "noble", "sit"], [-1, d / 2 - 2.0, "noble", "sit"], [1, d / 2 - 2.0, "cleric", "sit"], [3, d / 2 - 2.0, "noble", "sit"], [0, d / 2 - 6, "eng", "stand"], [2, d / 2 - 6.5, "eng", "talk"], [-2, d / 2 - 7, "woman", "stand"]]) { const [px, , pz] = gw(F, u, 0, v), [qx, , qz] = gw(F, u * 0.5, 0, v - (k === "sit" ? 4 : -4)); INTERIOR_FOLK.push([r, px, pz, qx, qz, k]); }
      GTINT = [0.38, 0.37, 0.36]; gbox(F, "rubble", 0, 1.3, d / 2 - 3.6, 7, 0.12, 1.4, ""); gbox(F, "rubble", 0, 0.9, d / 2 - 3.6, 6.4, 0.7, 1.0, "");   // the marble table
      GTINT = [0.62, 0.5, 0.38]; gbox(F, "plank", -6, 0.3, -d / 2 + 12, 6, 0.6, 3.2, "b"); gbox(F, "plank", -6, 1.15, -d / 2 + 13.2, 4.5, 0.08, 1.0); GTINT = [0.35, 0.6, 0.4]; gbox(F, "plain", -6, 1.2, -d / 2 + 13.2, 4.6, 0.03, 1.1, ""); GTINT = [0.55, 0.42, 0.3]; gbox(F, "oak", -6, 0.55, -d / 2 + 15.5, 6, 0.08, 0.1); for (const u of [-8.8, -3.2]) gbox(F, "oak", u, 0.28, -d / 2 + 15.5, 0.1, 0.56, 0.1); GTINT = [1, 1, 1];
      for (const [u, v, r, k] of [[-7, -d / 2 + 12.3, "noble", "sit"], [-5, -d / 2 + 12.3, "noble", "sit"], [-6, -d / 2 + 17, "eng", "stand"], [-4.5, -d / 2 + 17.5, "eng", "talk"]]) { const [px, , pz] = gw(F, u, 0, v), [qx, , qz] = gw(F, -6, 0, k === "sit" ? v + 5 : v - 5); INTERIOR_FOLK.push([r, px, pz, qx, qz, k]); }
      mark("The courts in Westminster Hall", ...gw(F, 0, 0, d / 2 - 4).filter((_, i) => i !== 1), "known", "By the 13th century the king's courts sit permanently in Rufus's great hall: at the south end, on the dais by the marble table, the King's Bench and the Chancery; by the north door the Court of Common Pleas, fixed at Westminster by Magna Carta (1215) so that ordinary suits need not follow the king about. Lawyers, litigants, clerks and sellers crowd the hall.", { y: 6, range: 300, r: 12 });
      // the Exchequer beside the hall, with its chequered counting cloth
      let ex = null; for (let r = 0; r < 60 && !ex; r += 4) for (let a = 0; a < 6.28 && !ex; a += 0.6) { const X = F.x + w / 2 + 12 + Math.cos(a) * r, Z2 = F.z + 15 + Math.sin(a) * r; if (rRect(X, Z2, 20, 12, 0, 0, true)) ex = [X, Z2]; }
      if (ex) { const EF = walkHall(ex[0], ex[1], 9, 16, 7, [0.62, 0.64, 0.68], "exch", undefined, true), cT = tex(256, 128, (g, W, H) => { g.fillStyle = "#1e3a2a"; g.fillRect(0, 0, W, H); g.strokeStyle = "#d8d0b0"; g.lineWidth = 2; for (let x = 0; x <= W; x += 21) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y <= H; y += 21) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } g.fillStyle = "#c8c8c8"; for (let k = 0; k < 24; k++) { g.beginPath(); g.arc(10 + (k * 37) % W, 10 + (k * 23) % H, 4, 0, 6.283); g.fill(); } });
        const cm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: cT, roughness: 0.9 })), [cx, , cz] = gw(EF, 0, 0, 1); cm.position.set(cx, EF.gy + 1.15, cz); cm.rotation.y = Math.atan2(EF.s, EF.c); scene.add(cm); put("extable", BOX_G, MAT.wood, cx, EF.gy + 0.32, cz, 1.7, 0.8, 3.3, Math.atan2(EF.s, EF.c));
        for (const [u, v, r] of [[-1.3, 0, "noble"], [1.3, 0, "cleric"], [-1.3, 2, "eng"], [1.3, 2, "cleric"]]) { const [px, , pz] = gw(EF, u, 0, v), [qx, , qz] = gw(EF, 0, 0, v); INTERIOR_FOLK.push([r, px, pz, qx, qz, "sit"]); }
        mark("The Exchequer", ex[0], ex[1], "known", "The king's financial office. Twice a year the sheriffs come to account for the revenues of their shires; the treasurer's clerks reckon the sums with counters on a cloth ruled in squares like a chessboard (the 'scaccarium', which gave the Exchequer its name), and receipts are recorded by notched tally sticks split in two.", { y: 11, range: 600, r: 12 }); } } }
  // St Margaret's, the parish church of Westminster beside the abbey, and the abbey's sanctuary
  { let p = null; const [sx, sz] = LL(51.5006, -0.1268); for (let r = 0; r < 70 && !p; r += 4) for (let a = 0; a < 6.28 && !p; a += 0.5) { const X = sx + Math.cos(a) * r, Z2 = sz + Math.sin(a) * r; if (rRect(X, Z2, 34, 22, 0, 0, true)) p = [X, Z2]; }
    if (p) { addChurch(p[0], p[1], { mat: "rag", roof: "shingle", nl: 18, nw: 7.5, cl: 7, cw: 5.5, wh: 7.5 }); mark("St Margaret's, Westminster", p[0], p[1], "known", "The parish church of the people of Westminster, built in the shadow of the abbey (founded in the 12th century, so that the monks need not share their church with the townsfolk). Today's church is a rebuilding of about 1500.", { y: 14, range: 900 }); }
    const [qx, qz] = LL(51.4998, -0.1295); mark("The sanctuary", qx, qz, "known", "The abbey's precinct is a sanctuary: a fugitive, even a felon, who reaches it can claim the protection of the Church and cannot be taken by force. Debtors and criminals live here for years; later a great stone sanctuary tower stood on this spot.", { y: 6, range: 600, r: 20 }); }
}

// ---------- London in 1285: the stone bridge ----------
// Peter of Colechurch's bridge, begun in 1176 and finished in 1209, a little downstream of the old timber one: about 270-280 m long,
// nineteen pointed arches of very unequal span on massive piers, each pier standing on a 'starling', a boat-shaped platform of elm piles
// filled with rubble, so wide that they choked the river to about a third of its width and the tide poured through in rapids. A wooden
// drawbridge near the Southwark end let ships through to Queenhithe. On the middle pier stood the chapel of St Thomas Becket (Peter of
// Colechurch was buried in it); timber houses and shops lined both sides, some overhanging the water; the Great Stone Gate stood near the
// Southwark end (traitors' heads were not set on it until 1305). Spans are evened out here; the real ones ranged from about 4.5 to 10 m.
// a walk-in stone hall: door at the west end, rush floor, central hearth, trestle tables and benches, the dais with the high table, a hanging
function walkHall(x, z, w, d, h, roofT, key, tint = [1.3, 1.25, 1.12], bare = false) { let gy = 1e9; for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0, 0.5]) gy = Math.min(gy, groundH(x + v * d, z + u * w)); gy -= 0.3; const F = FR(x, z, Math.PI / 2, gy, key); flatUnder(F, w + 0.6, d + 0.6, gy + 0.28);
  GTINT = tint; gWalls(F, "rubble", w, d, h, 0.8, [["-z", 0, 2.2, 3.6]]); gGableBoth(F, "rubble", w, d, h, w * 0.4); GTINT = roofT; groof(F, "shingle", w, d, h, w * 0.4, { e: 0.4, under: "plank" });
  for (const sx of [-1, 1]) for (let u = -d / 2 + 3; u < d / 2 - 1; u += 5) { GTINT = [1, 1, 1]; garch(F, "dark", sx * (w / 2 + 0.42), h * 0.35, u, 1.3, h * 0.4, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; garch(F, "plain", sx * (w / 2 - 0.42), h * 0.35, u, 1.3, h * 0.4, [-sx, 0, 0]); }
  GTINT = [0.72, 0.7, 0.66]; gpoly(F, "rush", [[-w / 2, 0.32, -d / 2], [w / 2, 0.32, -d / 2], [w / 2, 0.32, d / 2], [-w / 2, 0.32, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]); surfRect(F, -w / 2, w / 2, -d / 2, d / 2, 0.32);
  if (!bare) { GTINT = [0.3, 0.26, 0.22]; gbox(F, "rubble", 0, 0.3, -d * 0.1, 1.6, 0.12, 2.4, "b"); { const [hx, , hz] = gw(F, 0, 0, -d * 0.1); put("hfire", HFIRE_G, hearthFireM, hx, gy + 0.4, hz, 1, 0.9, 1); }
  GTINT = [1, 1, 1]; for (const sx of [-1, 1]) { gbox(F, "plank", sx * (w / 2 - 2.2), 0.75, -1.5, 0.9, 0.08, d - 11); gbox(F, "plank", sx * (w / 2 - 1.3), 0.45, -1.5, 0.35, 0.06, d - 11); for (let u = -d / 2 + 5; u < d / 2 - 6; u += 3) gbox(F, "oak", sx * (w / 2 - 2.2), 0.37, u, 0.7, 0.74, 0.08); }
  }
  gbox(F, "plank", 0, 0.3, d / 2 - 2.4, w - 1.6, 0.6, 4, "b"); gbox(F, "plank", 0, 1.32, d / 2 - 2.3, w * 0.55, 0.08, 1.0); GTINT = [1.15, 0.35, 0.3]; gbox(F, "plain", 0, 1.37, d / 2 - 2.3, w * 0.55 + 0.1, 0.03, 1.1); GTINT = [1, 1, 1]; gbox(F, "hang", 0, 3.6, d / 2 - 0.45, w * 0.7, 2.8, 0.05, "");
  personFloor(F, -w / 2, w / 2, -d / 2, d / 2, 0.32); for (const sx of [-1, 1]) dado(F, sx * (w / 2 - 0.42), -0.5, d - 2, [-sx, 0, 0], 0.33, 1.6);
  if (!bare) { const R = seeded((x * 3 + z) | 0); for (const sx of [-1, 1]) for (let u = -d / 2 + 6; u < d / 2 - 7; u += 2.4) { if (R() < 0.45) continue; const [px, , pz] = gw(F, sx * (w / 2 - 1.3), 0, u), [tx2, , tz2] = gw(F, sx * (w / 2 - 2.6), 0, u); INTERIOR_FOLK.push([R() < 0.3 ? "woman" : "eng", px, pz, tx2, tz2, "sit"]); } }
  ZONES.push({ name: "hall85", F, w: w - 1.6, d: d - 1.6, light: [0, h * 0.6, 0], doors: [[0, -d / 2]], lp: 60 + d * 2, ld: d + 12 }); return F; }
// a guard room in a gate tower: rush floor, a bench, a brazier, a rack of weapons; a room you can stand in
function guardRoom(F, w, d, h) { GTINT = [0.72, 0.7, 0.66]; gpoly(F, "rush", [[-w / 2, 0.06, -d / 2], [w / 2, 0.06, -d / 2], [w / 2, 0.06, d / 2], [-w / 2, 0.06, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]);
  GTINT = [1, 1, 1]; gbox(F, "plank", -w / 2 + 0.4, 0.45, 0, 0.4, 0.08, d * 0.6); gbox(F, "oak", -w / 2 + 0.4, 0.22, 0, 0.3, 0.44, 0.1); { const [bx, , bz] = gw(F, w / 4, 0, d / 4); put("hfire", HFIRE_G, hearthFireM, bx, F.gy + 0.1, bz, 0.5, 0.5, 0.5); }
  personFloor(F, -w / 2, w / 2, -d / 2, d / 2, 0.06); { const [px, , pz] = gw(F, -w / 6, 0, 0), [qx, , qz] = gw(F, w, 0, 0); INTERIOR_FOLK.push(["soldier", px, pz, qx, qz, "guard"]); }
  for (let u = -d / 3; u < d / 3; u += 0.4) gbox(F, "oak", w / 2 - 0.25, 1.4, u, 0.05, 2.8, 0.05, ""); ZONES.push({ name: "gate", F, w: w, d: d, light: [0, h * 0.7, 0], doors: [[0, 0]], lp: 30, ld: 9 }); }
// the king's beasts in the Lion Tower: lions (a maned male and lionesses) and a leopard, pacing in their dens
const LIONS = [], LION_G = mergeG([[new THREE.CapsuleGeometry(0.32, 0.95, 4, 10).rotateX(Math.PI / 2), MT(0, 0.78, 0)], [new THREE.SphereGeometry(0.23, 10, 8), MT(0, 0.98, 0.82)], [new THREE.BoxGeometry(0.16, 0.12, 0.16), MT(0, 0.9, 1.02)],
    ...[[0.17, 0.42], [-0.17, 0.42], [0.17, -0.42], [-0.17, -0.42]].map(([x, z]) => [new THREE.CylinderGeometry(0.08, 0.07, 0.7, 7), MT(x, 0.35, z)]), [new THREE.CylinderGeometry(0.025, 0.02, 0.8, 5), MT(0, 0.68, -0.85, 1, 1, 1, 0.9, 0)], [new THREE.SphereGeometry(0.06, 5, 4), MT(0, 0.42, -1.15)]]),
  MANE_G = G1(new THREE.SphereGeometry(0.4, 10, 8).scale(1, 1.05, 0.8).translate(0, 1.0, 0.66)), LIONM = new THREE.InstancedMesh(LION_G, M(0xb88a4a, { vertexColors: true }), 4), MANEM = new THREE.InstancedMesh(MANE_G, M(0x6a4422, { vertexColors: true }), 4);
if (ERA === 1285) { scene.add(LIONM, MANEM); for (const m of [LIONM, MANEM]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; } }
function lionStep(t) { if (self.TECH_ANIM) for (const f of TECH_ANIM) f(t); if (self.WINDMILLS) for (let i = 0; i < WINDMILLS.length; i++) WINDMILLS[i].children.forEach(m => { m.parent.rotation.z = t * 0.35 + i; }); if (!LIONS.length) return; LIONS.forEach((L, i) => { const pace = L.lie ? 0 : Math.sin(t * 0.35 + L.ph), side = L.a + Math.PI / 2, x = L.x + Math.cos(side) * pace * 1.1, z = L.z + Math.sin(side) * pace * 1.1, dir = Math.cos(t * 0.35 + L.ph) >= 0 ? 1 : -1, h = L.lie ? -L.a + Math.PI : Math.atan2(Math.cos(side) * dir, Math.sin(side) * dir), s = L.kind === "leopard" ? 0.75 : 1;
    O3.position.set(x, L.gy + (L.lie ? -0.32 : 0), z); O3.rotation.set(0, h, 0); O3.scale.set(s, L.lie ? 0.6 : s, s); O3.updateMatrix(); LIONM.setMatrixAt(i, O3.matrix); if (i === 0) MANEM.setMatrixAt(0, O3.matrix); else MANEM.setMatrixAt(i, ZEROM);
    if (!L.col) { L.col = true; LIONM.setColorAt(i, new THREE.Color(L.kind === "leopard" ? 0xfff0a0 : 0xffffff)); } }); LIONM.instanceMatrix.needsUpdate = true; MANEM.instanceMatrix.needsUpdate = true; if (LIONM.instanceColor) LIONM.instanceColor.needsUpdate = true; }
const ARCH_S = [], STONEK = new THREE.MeshStandardMaterial({ map: G_TEX.rubble, color: 0xd8ccb4, roughness: 0.95 }), LEADK = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.55, metalness: 0.25 });
function archSnap(x, z) { if (!ARCH_S.length) return [x, z]; const B = SPANS[0], dx = x - B.ax, dz = z - B.az, off = Math.abs(dx * B.uz - dz * B.ux); if (off > 60) return [x, z];
  const s = dx * B.ux + dz * B.uz; let best = ARCH_S[0]; for (const a of ARCH_S) if (Math.abs(a - s) < Math.abs(best - s)) best = a; const w = 1 - sstepN(off, 18, 60), d = (best - s) * w; return [x + B.ux * d, z + B.uz * d]; }
// a route over the river: add points just above and below the bridge, all steered through an arch
function throughArch(path) { if (!ARCH_S.length) return path; const B = SPANS[0], side = p => (p[0] - B.ax) * B.uz - (p[1] - B.az) * B.ux, out = [];
  for (let k = 0; k < path.length; k++) { if (k > 0) { const a = path[k - 1], b = path[k], sa = side(a), sb = side(b); if (sa * sb < 0) { const t = sa / (sa - sb); for (const dt of [-30, -12, 0, 12, 30]) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = clampN(t + dt / L, 0, 1); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); } } }
    out.push(path[k]); }
  return out.map(p => archSnap(p[0], p[1])); }
if (ERA === 1285) {
  const B = SPANS[0], hw = B.hw, W = hw * 2 + 2.4, Y = B.y, east = Math.sign(B.uz) || 1, at = s => [B.ax + B.ux * s, B.az + B.uz * s];
  let sA = 0, sB = B.len; for (let s = 0; s < B.len; s += 0.5) if (baseH(...at(s)) < 0.4) { sA = s; break; } for (let s = B.len; s > 0; s -= 0.5) if (baseH(...at(s)) < 0.4) { sB = s; break; }
  let bed = 0; for (let s = sA; s < sB; s += 2) bed = Math.min(bed, baseH(...at(s)));
  const Lw = sB - sA, NA = 19, P = Lw * 0.36 / (NA - 1), A = (Lw - P * (NA - 1)) / NA, DRAW = NA - 7, yBot = bed - 2, ys = 0.7, yA = Y - 1.25;
  const G = new THREE.Group(); G.position.set(at(sA)[0], 0, at(sA)[1]); G.rotation.y = Math.atan2(-B.uz, B.ux); scene.add(G);
  const stoneT = G_TEX.rubble, stoneM = new THREE.MeshStandardMaterial({ map: stoneT, color: 0xd8ccb4, roughness: 0.95 }), slimeM = new THREE.MeshStandardMaterial({ map: stoneT, color: 0x6a6a52, roughness: 1 });
  // the bridge's side elevation, pierced by pointed arches, extruded across its width; two pieces either side of the drawbridge gap
  const archL = k => k * (A + P), shapes = [];
  for (const [k0, k1, left, right] of [[0, DRAW, -8, archL(DRAW)], [DRAW + 1, NA, archL(DRAW) + A, Lw + 8]]) { const sh = new THREE.Shape();
    sh.moveTo(left, yBot); sh.lineTo(right, yBot); sh.lineTo(right, Y - 0.02); sh.lineTo(left, Y - 0.02); sh.lineTo(left, yBot);
    for (let k = k0; k < k1; k++) { const a0 = archL(k), a1 = a0 + A, m = (a0 + a1) / 2, h = new THREE.Path(), yb = yBot + 0.6;
      h.moveTo(a0, yb); h.lineTo(a1, yb); h.lineTo(a1, ys); h.quadraticCurveTo(a1, ys + (yA - ys) * 0.8, m, yA); h.quadraticCurveTo(a0, ys + (yA - ys) * 0.8, a0, ys); h.lineTo(a0, yb); sh.holes.push(h); }
    shapes.push(sh); }
  const eg = new THREE.ExtrudeGeometry(shapes, { depth: W, bevelEnabled: false, curveSegments: 7 }); eg.translate(0, 0, -W / 2); { const uv = eg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.3, uv.getY(i) * 0.3); }
  G.add(new THREE.Mesh(eg, stoneM));
  // starlings round every pier, awash at high tide, green with weed
  const st = []; for (let k = 1; k < NA; k++) { const u = archL(k) - P / 2, sw = P + 3, sl = W + 11, pt = 4, s2 = new THREE.Shape([[-sw / 2, -sl / 2 + pt], [0, -sl / 2], [sw / 2, -sl / 2 + pt], [sw / 2, sl / 2 - pt], [0, sl / 2], [-sw / 2, sl / 2 - pt]].map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ExtrudeGeometry(s2, { depth: 0.25 - yBot, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(u, yBot, 0); st.push(g); }
  for (const g of st) G.add(new THREE.Mesh(g, slimeM));
  // the roadway: rammed gravel between the parapets and house fronts
  { const rd = new THREE.Mesh(new THREE.BoxGeometry(Lw + 16, 0.08, hw * 2), M(0x7a6c58, { roughness: 1 })); rd.position.set(Lw / 2, Y + 0.01, 0); G.add(rd); }
  // the drawbridge: a heavy timber leaf across the gap, with its lifting beams overhead
  { const u0 = archL(DRAW), wM = MAT.wood; for (let q = 0; q < 6; q++) { const b = new THREE.Mesh(new THREE.BoxGeometry(A + 0.6, 0.35, W / 6 - 0.05), wM); b.position.set(u0 + A / 2, Y - 0.2, -W / 2 + (q + 0.5) * W / 6); G.add(b); }
    for (const sz of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), wM); p.position.set(u0 - 0.6, Y + 3.5, sz * (hw + 0.6)); G.add(p); const bm = new THREE.Mesh(new THREE.BoxGeometry(A + 2, 0.4, 0.4), wM); bm.position.set(u0 + A / 2 - 0.6, Y + 6.8, sz * (hw + 0.6)); bm.rotation.z = -0.12; G.add(bm); } }
  const L2W = (u, v) => { const s = sA + u, [x, z] = at(s); return [x + B.uz * v, z - B.ux * v]; };
  for (let k = 0; k < NA; k++) ARCH_S.push(sA + archL(k) + A / 2);
  // what stands on the bridge: [u0, u1, side] stretches taken by buildings; parapets fill the rest
  const taken = [], CH = Math.floor(NA / 2), chU = archL(CH) - P / 2, gateU = archL(NA - 2) - P / 2, drU0 = archL(DRAW) - 3, drU1 = archL(DRAW) + A + 3;
  taken.push([chU - 5, chU + 5, east], [gateU - 3.5, gateU + 3.5, 1], [gateU - 3.5, gateU + 3.5, -1], [drU0, drU1, 1], [drU0, drU1, -1]);
  // the chapel of St Thomas: stone, two storeys, its undercroft down on the starling and the chapel at road level, built out to the east
  { const [cx, cz] = L2W(chU, east * (hw + 7.5)), F = FR(cx, cz, Math.atan2(B.ux, B.uz) + Math.PI / 2, 0.25, "bridge"), w = 9, d = 15, wh = Y - 0.25 + 9;
    GTINT = [1.15, 1.1, 1.0]; gbox(F, "rubble", 0, wh / 2, 0, w, wh, d); gGableBoth(F, "rubble", w, d, wh, 5); GTINT = [0.62, 0.64, 0.68]; groof(F, "shingle", w, d, wh, 5, { e: 0.3 });
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let z = -d / 2 + 2.5; z < d / 2 - 1; z += 3.2) { garch(F, "dark", sx * w / 2, Y + 1.5, z, 1.1, 4.2, [sx, 0, 0]); garch(F, "dark", sx * w / 2, 1.2, z, 0.8, 1.4, [sx, 0, 0]); }
    garch(F, "dark", 0, Y + 1.4, east * d / 2, 3.4, 6.2, [0, 0, east]); garch(F, "dark", 0, Y - 0.25, -east * d / 2, 1.8, 3.2, [0, 0, -east]);
    GTINT = [1.15, 1.1, 1.0]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(F, "rubble", sx * (w / 2 + 0.3), wh / 2 + 1, sz * (d / 2 + 0.3), 0.9, wh + 2, 0.9); gbox(F, "rubble", 0, wh + 5.6, east * (d / 2 - 1.5), 1.4, 2.2, 1.4); GTINT = [1, 1, 1];
    solid(cx, cz, w + 1, d + 1, Math.atan2(B.ux, B.uz) + Math.PI / 2);
    mark("The chapel of St Thomas on the Bridge", cx, cz, "known", "Built on the bridge's central pier and dedicated to St Thomas Becket, the Londoner murdered at Canterbury in 1170 and made a saint. Two storeys: a lower chapel down on the starling, reached by a stair, and the chapel at road level. Peter of Colechurch, the priest who designed the bridge, was buried in it in 1205. Travellers stopped to pray here and give alms for the bridge's upkeep.", { y: 18, range: 1500, r: 25 }); }
  // the Great Stone Gate: twin towers and a gatehouse over the road near the Southwark end, its gates shut at curfew
  { const [gx, gz] = L2W(gateU, 0), F = FR(gx, gz, Math.atan2(B.ux, B.uz), Y, "bridge"), tw = 5.4, th = 15;
    GTINT = [1.1, 1.06, 0.98]; for (const sx of [-1, 1]) { const [px, , pz] = gw(F, sx * (hw + tw / 2), 0, 0), TF = FR(px, pz, Math.atan2(B.ux, B.uz), Y, "bridge"); GTINT = [1.1, 1.06, 0.98]; gWalls(TF, "rubble", tw, 6.5, th - 1, 0.7, [[sx > 0 ? "-x" : "+x", 0, 1.3, 2.5]]); gbox(TF, "rubble", 0, th - 1.2, 0, tw, 0.4, 6.5, ""); gbox(TF, "rubble", 0, 3.4, 0, tw - 1.4, 0.25, 5.1, "");
      for (let u = -3; u < 3.2; u += 1.5) gbox(F, "rubble", sx * (hw + tw / 2), th - 0.4, u, tw, 1.0, 0.7, "b"); guardRoom(TF, tw - 1.4, 5.1, 3.3); }
    gbox(F, "rubble", 0, 9, 0, hw * 2 + 0.1, 6, 6.5); for (let u = -hw; u < hw; u += 1.5) for (const sz of [-1, 1]) gbox(F, "rubble", u + 0.4, 12.5, sz * 3, 0.7, 1.0, 0.6, "b");
    GTINT = [1, 1, 1]; for (const sz of [-1, 1]) for (const sx of [-1, 1]) garch(F, "dark", sx * (hw + tw / 2), 8, sz * 3.25, 0.7, 1.6, [0, 0, sz]); for (const sz of [-1, 1]) garch(F, "dark", 0, 9.2, sz * 3.25, 1.2, 2.2, [0, 0, sz]);
    mark("The Great Stone Gate", gx, gz, "known", "The bridge's southern gatehouse, near the Southwark end: the gates were shut at curfew and the road could be held against attack (in 1263 the Londoners shut the bridge against Henry III's queen). From 1305, starting with William Wallace's, the heads of executed traitors were set on poles above it; in 1285 that grim custom had not begun.", { y: 18, range: 1500, r: 20 }); }
  // timber houses and shops along both sides, their backs jutting out over the river on brackets; in 1285 not yet a continuous street
  { const R = seeded(1285); for (const side of [1, -1]) { let u = -4; while (u < Lw + 4) { const w = 4.5 + R() * 2.5;
      if (R() < 0.3 || taken.some(([a, b, sd]) => sd === side && u + w > a && u < b)) { u += w + 1 + R() * 4; continue; }
      const d = 5 + R() * 1.2, two = R() < 0.65, [hx, hz] = L2W(u + w / 2, side * (hw + d / 2)), rot = Math.atan2(B.ux, B.uz) + Math.PI / 2, F = FR(hx, hz, rot, Y, "bridge");
      addHouse(hx, hz, w, d, rot, { gy: Y, wall: "daub", roof: "thatch", door: side > 0 ? "-z" : "+z", wh: two ? 5.8 + R() * 0.6 : 3.2, kind: "house" });
      GTINT = [0.5, 0.4, 0.3]; for (const sx of [-1, 1]) gbox(F, "oak", sx * (w / 2 - 0.3), -1.4, side * (d / 2 - 1.2), 0.25, 2.8, 0.25, ""); gbox(F, "oak", -w / 5, 0.95, -side * (d / 2 + 0.35), 1.6, 0.1, 0.7, ""); GTINT = [1, 1, 1];
      taken.push([u, u + w, side]); u += w + (R() < 0.6 ? 0 : 1 + R() * 3); } } }
  // parapets wherever no building stands
  for (const side of [1, -1]) for (let u = -6; u < Lw + 6; u += 1) { if (taken.some(([a, b, sd]) => sd === side && u + 1 > a && u < b)) continue; const [px, pz] = L2W(u + 0.5, side * (hw + 0.3)); put("parapet", BOX_G, MAT.rag, px, Y, pz, 0.55, 1.0, 1.02, Math.atan2(B.ux, B.uz)); solid(px, pz, 0.55, 1.0, Math.atan2(B.ux, B.uz)); }
  // the approaches on either bank: stone ramps
  { const ry = Math.atan2(B.ux, B.uz), n = Math.ceil(B.len / 3); for (let k = 0; k < n; k++) { const s0 = B.len * k / n, s1 = B.len * (k + 1) / n, sm = (s0 + s1) / 2; if (sm > sA - 8 && sm < sB + 8) continue;
      const [x, z] = at(sm), y0 = B.yAt(s0), y1 = B.yAt(s1), ym = (y0 + y1) / 2, gm = baseH(x, z); put("deck", BOX_G, MAT.rag, x, Math.min(gm, ym) - 0.4, z, W, ym - Math.min(gm, ym) + 0.4, Math.hypot(s1 - s0, y1 - y0) + 0.05, ry, Math.atan2(y0 - y1, s1 - s0)); } }
  mark("London Bridge, in stone", ...L2W(Lw * 0.35, 0), "known", "Peter of Colechurch's stone bridge, begun in 1176 and finished in 1209: about 270 m long on nineteen pointed arches. The piers stand on 'starlings', boat-shaped platforms of piles and rubble so wide that they block about two thirds of the river; at the turn of the tide the water drops a metre or more through the arches in rapids, and many travellers land above the bridge and walk round rather than 'shoot' it. Houses and shops line the roadway; tolls and rents from them pay for its upkeep. It stood for over 600 years, until 1831.", { y: 12, range: 2500, r: 60 });
  mark("The drawbridge", ...L2W(archL(DRAW) + A / 2, 0), "known", "A timber lifting span near the Southwark end, so that masted ships could pass upriver to Queenhithe, and so the bridge could be cut in war. By the late 13th century it was raised less and less, and the bridge's wardens were often in trouble for its decay.", { y: 9, range: 600, r: 14 });
}

// ---------- London in 1285: St Paul's ----------
// Old St Paul's, rebuilt after the fire of 1087: a Norman nave of twelve bays with round arches (finished in the 12th century), Norman
// transepts, and over the crossing a tower with a lead-covered timber spire finished in 1221, about 149 m by later reckoning, among the
// tallest in Europe. In 1285 the 'New Work', a Gothic choir of tall pointed windows begun in 1256, is going up at the east end and will
// not be finished until 1314. The whole church was some 180 m long. In 1285 Edward I licensed the canons to wall the churchyard; Paul's
// Cross, the open-air pulpit where Londoners met in folkmoot and heard sermons and proclamations, stood in its north-east corner.
if (ERA === 1285) {
  const [Cx, Cz] = LL(51.5138, -0.0987); let gy = 1e9; for (let u = -95; u <= 95; u += 19) for (const v of [-16, 0, 16]) gy = Math.min(gy, groundH(Cx + u, Cz + v)); gy -= 0.3;
  rRect(Cx, Cz, 240, 150, 0, 4);
  const CF = FR(Cx, Cz, Math.PI / 2, gy, "pauls"), sub = lz => { const [X, , Z] = gw(CF, 0, 0, lz); return FR(X, Z, Math.PI / 2, gy, "pauls"); }, caen = [1.5, 1.44, 1.28], lead = [0.62, 0.64, 0.68];
  GTINT = [0.9, 0.88, 0.84]; gbox(CF, "rubble", 0, -1.5, -3, 34, 3.4, 186, "");
  GTINT = [0.9, 0.88, 0.84]; gbox(FR(Cx - 3, Cz, 0, gy, "pauls"), "rubble", 0, -1.5, 0, 16, 3.4, 94, "");
  // the nave, Paul's Walk: walls, arcades of round piers, triforium and clerestory, painted screen at the east end
  { const NF = sub(-50), w = 31, d = 80, ah = 12, ch = 28;
    GTINT = caen; gWalls(NF, "rubble", w, d, ah, 1.6, [["-z", 0, 4.5, 8], ["+x", 22, 3, 5], ["+z", 0, 13, ah, []]]);
    for (const sx of [-1, 1]) { gbox(NF, "rubble", sx * 6.5, (ah + ch) / 2 + 0.01, 0, 1.4, ch - ah, d, "");
      for (let z = -d / 2 + 6.67; z < d / 2 - 1; z += 6.67) { const [px, , pz] = gw(NF, sx * 6.5, 0, z); put("pier", CYL_G, AMAT.ashlar, px, gy, pz, 2.6, ah + 0.05, 2.6); solid(px, pz, 2.4, 2.4, 0); }
      for (let z = -d / 2 + 3.33; z < d / 2; z += 6.67) { GTINT = [1, 1, 1]; garch(NF, "dark", sx * (6.5 + 0.72), 18.5, z, 1.7, 5, [sx, 0, 0]); garch(NF, "dark", sx * (6.5 - 0.72), 13, z - 1, 0.9, 2.2, [-sx, 0, 0]); garch(NF, "dark", sx * (6.5 - 0.72), 13, z + 1, 0.9, 2.2, [-sx, 0, 0]);
        GTINT = [1.7, 1.7, 1.75]; garch(NF, "plain", sx * (6.5 - 0.72), 18.5, z, 1.7, 5, [-sx, 0, 0]); garch(NF, "plain", sx * (w / 2 - 0.82), 4.5, z, 1.4, 3.6, [-sx, 0, 0]); GTINT = [1, 1, 1]; garch(NF, "dark", sx * (w / 2 + 0.82), 4.5, z, 1.4, 3.6, [sx, 0, 0]);
        GTINT = caen; gbox(NF, "rubble", sx * (w / 2 + 1.1), ah / 2, z + 3.33, 0.8, ah, 1.4, "b"); }
      const [rx, , rz] = gw(NF, sx * 11.2, 0, 0); put("aisleroof", BOX_G, LEADK, rx, gy + 14.4, rz, 10.6, 0.35, d + 1, Math.PI / 2, 0, -sx * Math.atan2(5.2, 9)); }
    GTINT = caen; gGableBoth(NF, "rubble", 14.4, d, ch, 9); GTINT = lead; groof(NF, "shingle", 14.4, d, ch, 9, { e: 0.4, t: 0.3 });
    GTINT = caen; for (const sx of [-1, 1]) gbox(NF, "rubble", sx * 8.2, 20, -d / 2 - 0.9, 3.2, 40, 3.2, "b");
    GTINT = [1, 1, 1]; garch(NF, "dark", 0, 0, -d / 2 - 0.82, 6.2, 9.5, [0, 0, -1]); garch(NF, "dark", 0, 16, -d / 2 - 0.82, 3, 7, [0, 0, -1]); for (const sx of [-1, 1]) garch(NF, "dark", sx * 3.4, 17, -d / 2 - 0.82, 1.6, 5, [0, 0, -1]);
    GTINT = [0.72, 0.7, 0.66]; gpoly(NF, "rush", [[-w / 2, 0.32, -d / 2], [w / 2, 0.32, -d / 2], [w / 2, 0.32, d / 2], [-w / 2, 0.32, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]);
    GTINT = [0.95, 0.3, 0.22]; for (const sx of [-1, 1]) { gbox(NF, "plain", sx * 3.6, 4, d / 2 - 1.2, 4.8, 8, 0.6, ""); const [px, , pz] = gw(NF, sx * 3.6, 0, d / 2 - 1.2); solid(px, pz, 4.8, 0.6, Math.PI / 2); } gbox(NF, "plain", 0, 6, d / 2 - 1.2, 2.4, 4, 0.6, ""); GTINT = [1.5, 1.25, 0.6]; gbox(NF, "plain", 0, 9.5, d / 2 - 1.3, 0.4, 3, 0.3, ""); gbox(NF, "plain", 0, 10.4, d / 2 - 1.3, 2, 0.35, 0.3, "");
    GTINT = [1, 1, 1]; surfRect(NF, -w / 2, w / 2, -d / 2, d / 2, 0.32); flatUnder(NF, w + 1.6, d + 1, gy + 0.28);
    for (const sx of [-1, 1]) dado(NF, sx * (w / 2 - 0.82), 0, d - 4, [-sx, 0, 0], 0.33);
    { const R = seeded(1285); for (let k = 0; k < 10; k++) { const u = (k % 2 ? 1 : -1) * (2 + R() * 2.5), v = -30 + Math.floor(k / 2) * 12, [px, , pz] = gw(NF, u, 0, v), [qx, , qz] = gw(NF, -u * 0.3, 0, v + (R() - 0.5) * 2); INTERIOR_FOLK.push([R() < 0.35 ? "woman" : R() < 0.2 ? "noble" : "eng", px, pz, qx, qz, k % 3 ? "talk" : "stand"]); } }
    ZONES.push({ name: "pauls", F: NF, w: w - 3, d: d - 2, light: [0, 10, 0], doors: [[0, -d / 2]], lp: 220, ld: 95 }); }
  // the transepts and crossing, solid from outside
  { const TF = FR(...gw(CF, 0, 0, -3).filter((_, i) => i !== 1), 0, gy, "pauls"), w = 14, d = 92, h = 28;
    GTINT = caen; gWalls(TF, "rubble", w, d, h, 1.4, [["-x", 0, 31, h, []], ["+x", 0, 31, h, []], ["-z", 0, 3, 5], ["+z", 0, 3, 5]]); for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(TF, "rubble", sx * 7, 20, sz * 11, 1.4, 16, 9, "");
    gGableBoth(TF, "rubble", w, d, h, 9); GTINT = lead; groof(TF, "shingle", w, d, h, 9, { e: 0.4, t: 0.3, under: "plank" });
    GTINT = [1, 1, 1]; for (const sz of [-1, 1]) { garch(TF, "dark", 0, 14, sz * (d / 2 + 0.72), 4.5, 9, [0, 0, sz]); GTINT = [1.7, 1.7, 1.75]; gWin(TF, 0, 14, sz * (d / 2 - 0.72), 4.5, 9, [0, 0, -sz]); GTINT = [1, 1, 1]; }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const k of [0, 1]) { garch(TF, "dark", sx * (w / 2 + 0.72), 16 - k * 10, sz * (d / 2 - 8 - k * 10), 1.6, 4.5, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; gWin(TF, sx * (w / 2 - 0.72), 16 - k * 10, sz * (d / 2 - 8 - k * 10), 1.6, 4.5, [-sx, 0, 0]); GTINT = [1, 1, 1]; }
    GTINT = [0.72, 0.7, 0.66]; gpoly(TF, "rush", [[-w / 2, 0.32, -d / 2], [w / 2, 0.32, -d / 2], [w / 2, 0.32, d / 2], [-w / 2, 0.32, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]); surfRect(TF, -w / 2, w / 2, -d / 2, d / 2, 0.32); flatUnder(TF, w + 1.4, d + 1.4, gy + 0.28);
    GTINT = [1, 1, 1]; ZONES.push({ name: "pauls", F: TF, w: w - 2, d: d - 2, light: [0, 10, 0], doors: [[0, -d / 2], [0, d / 2]], lp: 200, ld: 90 }); }
  // the crossing tower and its spire
  { const [tx, , tz] = gw(CF, 0, 0, -3), TF = FR(tx, tz, 0, gy, "pauls"), H = 87;
    GTINT = caen; gbox(TF, "rubble", 0, (H + 28) / 2, 0, 15, H - 28, 15, ""); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { gbox(TF, "rubble", sx * 6.6, H / 2 + 1, sz * 6.6, 2.6, H + 2, 2.6); solid(tx + sx * 6.6, tz + sz * 6.6, 2.6, 2.6, 0); }
    GTINT = [1, 1, 1]; for (const o of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) for (const u of [-3.2, 0, 3.2]) { const px = o[0] ? o[0] * 7.52 : u, pz = o[2] ? o[2] * 7.52 : u; garch(TF, "dark", px, H - 14, pz, 1.8, 8, o); garch(TF, "dark", px, H - 30, pz, 1.4, 5, o); }
    const sp = new THREE.Mesh(new THREE.ConeGeometry(7.2, 62, 8).translate(0, 31, 0), new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.5, metalness: 0.25 })); sp.position.set(tx, gy + H, tz); scene.add(sp);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.7, roughness: 0.35 })); ball.position.set(tx, gy + H + 62.5, tz); scene.add(ball);
    put("cross", BOX_G, MAT.wood, tx, gy + H + 63, tz, 0.25, 3, 0.25); put("cross", BOX_G, MAT.wood, tx, gy + H + 64.6, tz, 1.6, 0.25, 0.25);
    mark("St Paul's Cathedral", tx, tz, "known", "Old St Paul's, rebuilt after the fire of 1087: a Norman nave of twelve bays (walk in by the great west door: its aisles are 'Paul's Walk', where Londoners meet, gossip, do business and hire servants), Norman transepts, and over the crossing a tower with a lead-covered timber spire finished in 1221, by later reckoning about 149 m, among the tallest in Europe. The whole church is some 180 m long, one of the largest in Christendom. At the east end the Gothic 'New Work' is building.", { y: 100, range: 6000, r: 60, big: true }); }
  // the choir: the Gothic New Work, tall pointed windows between buttresses; its eastern bays still under scaffolding
  { const QF = sub(33), w = 31, d = 58, ah = 14, ch = 31, gold = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.85, roughness: 0.3 }), vM = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9, side: THREE.DoubleSide });
    GTINT = [1.25, 1.2, 1.08]; gWalls(QF, "rubble", w, d, ah, 1.4, [["-z", 0, 31, ah, []]]); for (const sx of [-1, 1]) gbox(QF, "rubble", sx * 7.2, (ah + ch) / 2, 0, 1.2, ch - ah, d, ""); gbox(QF, "rubble", 0, (ah + ch) / 2, d / 2, 14.4, ch - ah, 1.2, "");
    GTINT = lead; groof(QF, "shingle", 14.4, d, ch, 10, { e: 0.4, t: 0.3 });
    for (const sx of [-1, 1]) { const [rx, , rz] = gw(QF, sx * 11.2, 0, 0); put("aisleroof", BOX_G, LEADK, rx, gy + ah + 2.3, rz, 10.6, 0.35, d, Math.PI / 2, 0, -sx * Math.atan2(4.6, 9));
      for (let z = -d / 2 + 4; z < d / 2 - 1; z += 6.5) { GTINT = [1, 1, 1]; garch(QF, "dark", sx * (7.22 + 0.6), ah + 4, z, 2.2, 10, [sx, 0, 0]); garch(QF, "dark", sx * (w / 2 + 0.72), 3, z, 2.2, 8.5, [sx, 0, 0]); GTINT = [1.75, 1.72, 1.8]; gWin(QF, sx * (7.2 - 0.62), ah + 4, z, 2.2, 10, [-sx, 0, 0]); gWin(QF, sx * (w / 2 - 0.72), 3, z, 2.2, 8.5, [-sx, 0, 0]);
        GTINT = [1.25, 1.2, 1.08]; gbox(QF, "rubble", sx * (w / 2 + 1.0), ah / 2, z + 3.25, 1.6, ah, 1.4, "b"); gbox(QF, "rubble", sx * (w / 2 + 1.0), ah + 1.6, z + 3.25, 0.8, 3.2, 0.8, "b"); }
      for (let z = -d / 2 + 6.5; z < d / 2 - 1; z += 6.5) { const [px, , pz] = gw(QF, sx * 7.2, 0, z); put("pier", CYL_G, AMAT.ashlar, px, gy, pz, 1.6, ah + 0.05, 1.6); solid(px, pz, 1.5, 1.5, 0); }
      const ac = new THREE.Mesh(new THREE.PlaneGeometry(d, 7.8).rotateX(Math.PI / 2), vM); const [ax, , az] = gw(QF, sx * 11.2, 0, 0); ac.position.set(ax, gy + ah - 0.05, az); ac.rotation.y = Math.PI / 2; scene.add(ac); }
    { const sh = new THREE.Shape(); sh.moveTo(-7.2, 0); sh.quadraticCurveTo(-7.2, 5, 0, 6.2); sh.quadraticCurveTo(7.2, 5, 7.2, 0); sh.lineTo(6.9, 0); sh.quadraticCurveTo(6.9, 4.7, 0, 5.9); sh.quadraticCurveTo(-6.9, 4.7, -6.9, 0); sh.lineTo(-7.2, 0);
      const v = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 10 }).rotateY(Math.PI / 2), vM); const [vx, , vz] = gw(QF, 0, 0, -d / 2); v.position.set(vx, gy + ch - 4, vz); scene.add(v); }
    GTINT = [0.72, 0.7, 0.66]; gpoly(QF, "rush", [[-w / 2, 0.32, -d / 2], [w / 2, 0.32, -d / 2], [w / 2, 0.32, d / 2], [-w / 2, 0.32, d / 2]], [[0, 0], [w, 0], [w, d], [0, d]], [0, 1, 0]); surfRect(QF, -w / 2, w / 2, -d / 2, d / 2, 0.32); flatUnder(QF, w + 1.4, d + 1.4, gy + 0.28);
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let z = -d / 2 + 2; z < 6; z += 0.75) { const [px, , pz] = gw(QF, sx * 4.6, 0, z); put("stall", BOX_G, MAT.wood, px, gy + 0.32, pz, 0.6, 0.9, 0.7); const [qx, , qz] = gw(QF, sx * 5.2, 0, z); put("stall", BOX_G, MAT.wood, qx, gy + 1.2, qz, 0.12, 1.8, 0.72); }
    { const [px, , pz] = gw(QF, 0, 0, 14); put("altar", BOX_G, AMAT.ashlar, px, gy + 0.32, pz, 1.1, 1.05, 2.8); put("altar", BOX_G, gold, px - 0.58, gy + 0.42, pz, 0.04, 0.85, 2.5); solid(px, pz, 2.9, 1.2, Math.PI / 2);
      const [sx2, , sz2] = gw(QF, 0, 0, 22); put("shrine", BOX_G, AMAT.ashlar, sx2, gy + 0.32, sz2, 3, 1.6, 1.6); put("shrine", BOX_G, gold, sx2, gy + 1.92, sz2, 2.2, 0.8, 0.9); put("feret", GABLE_G, gold, sx2, gy + 2.72, sz2, 0.9, 0.5, 2.2, Math.PI / 2); solid(sx2, sz2, 3, 1.6, 0);
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; put("candle", CYL_G, M(0xeee8dc), sx2 + Math.cos(a) * 2.4, gy + 0.32, sz2 + Math.sin(a) * 1.8, 0.08, 1.5, 0.08); }
      for (const [u, v, r, k] of [[-1.5, 19.6, "cleric", "pray"], [1.5, 19.6, "cleric", "pray"], [-2.6, 22, "woman", "kneel"], [2.6, 22, "eng", "kneel"]]) { const [px, , pz] = gw(QF, u, 0, v), [qx, , qz] = gw(QF, 0, 0, k === "kneel" ? 22 : 30); INTERIOR_FOLK.push([r, px, pz, qx, qz, k]); }
      mark("St Erkenwald's shrine", sx2, sz2, "known", "Behind the high altar, the shrine of St Erkenwald, bishop of London (675-693), London's own saint, whose relics drew pilgrims and paid for the New Work. A new silver-gilt shrine was made for him in 1314-26.", { y: 5, range: 200, r: 8 }); }
    ZONES.push({ name: "pauls", F: QF, w: w - 2, d: d - 2, light: [0, 10, 0], doors: [[0, -d / 2]], lp: 200, ld: 80 }); }
  // the eastern bays of the New Work, half built: walls at uneven heights, scaffolding, a hoist, stone stacked on the site
  { const EF = sub(76), R = seeded(1256), d = 28, w = 31;
    GTINT = [1.25, 1.2, 1.08]; for (const sx of [-1, 1]) for (let z = -d / 2; z < d / 2; z += 3.5) { const top = 14 - (z + d / 2) * 0.32 + R() * 2.5; gbox(EF, "rubble", sx * (w / 2 - 0.8), top / 2, z + 1.75, 1.6, top, 3.52); const top2 = Math.max(0, 22 - (z + d / 2) * 0.9 + R() * 3); if (top2 > 1) gbox(EF, "rubble", sx * 7.2, top2 / 2, z + 1.75, 1.4, top2, 3.52); }
    gbox(EF, "rubble", 0, 2, d / 2 - 0.8, w, 4, 1.6);
    for (const sx of [-1, 1]) for (let z = -d / 2; z < d / 2; z += 3) { const [px, , pz] = gw(EF, sx * (w / 2 + 1.5), 0, z); put("pole", CYL_G, MAT.wood, px, gy, pz, 0.18, 18, 0.18); for (let hh = 3; hh < 18; hh += 3) { const [qx, , qz] = gw(EF, sx * (w / 2 + 1.5), 0, z + 1.5); put("pole", BOX_G, MAT.wood, qx, gy + hh, qz, 0.12, 0.12, 3.1, Math.PI / 2); } }
    const [hx, , hz] = gw(EF, 0, 0, 0); put("pole", CYL_G, MAT.wood, hx, gy, hz, 0.4, 24, 0.4); put("pole", BOX_G, MAT.wood, hx + 4, gy + 24, hz, 8, 0.35, 0.35);
    for (let k = 0; k < 50; k++) { const [px, , pz] = gw(EF, (R() - 0.5) * 60, 0, d / 2 + 6 + R() * 18); put("block", BOX_G, AMAT.ashlar, px, groundH(px, pz) + (k % 3) * 0.45, pz, 0.9, 0.44, 0.6, R()); }
    solid(EF.x, EF.z, w, d, Math.PI / 2);
    mark("The New Work", ...gw(EF, 0, 0, 0).filter((_, i) => i !== 1), "known", "The new Gothic choir, begun in 1256 to replace the Norman east end: tall pointed windows, slender shafts, and in the end a great rose window in the east wall. In 1285 its eastern bays are still rising behind scaffolding; it was not finished until 1314. It was paid for by gifts, indulgences and the offerings of pilgrims to the shrine of St Erkenwald.", { y: 26, range: 1200, r: 30 }); }
  // the churchyard wall, licensed by Edward I in 1285, with gates where the streets come in
  { const W2 = 115, D2 = 72, gates = []; for (const S of STREETS) for (let s = 0; s < S.L.L; s += 3) { const [x, z] = S.L.at(s); if (Math.abs(Math.abs(x - Cx) - W2) < 4 && Math.abs(z - Cz) < D2 || Math.abs(Math.abs(z - Cz) - D2) < 4 && Math.abs(x - Cx) < W2) gates.push([x, z]); }
    const seg = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 3); for (let k = 0; k < n; k++) { const x = x0 + (x1 - x0) * (k + 0.5) / n, z = z0 + (z1 - z0) * (k + 0.5) / n; if (gates.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 6)) continue; const ry = Math.atan2(x1 - x0, z1 - z0); put("w:rag", BOX_G, MAT.rag, x, groundH(x, z) - 0.3, z, 0.8, 3.2, L / n + 0.05, ry); solid(x, z, 0.8, L / n, ry); } };
    seg(Cx - W2, Cz - D2, Cx + W2, Cz - D2); seg(Cx + W2, Cz - D2, Cx + W2, Cz + D2); seg(Cx + W2, Cz + D2, Cx - W2, Cz + D2); seg(Cx - W2, Cz + D2, Cx - W2, Cz - D2); }
  // Paul's Cross: an open-air pulpit with a cross, in the north-east of the churchyard
  { const px = Cx + 62, pz = Cz - 40, py = groundH(px, pz); put("pcross", CYL_G, MAT.rag, px, py - 0.2, pz, 5, 1.4, 5); put("pcross", CYL_G, MAT.wood, px, py + 1.2, pz, 3.6, 1.2, 3.6); put("pcross", CONE4_G, LEADK, px, py + 4.6, pz, 4.4, 2.2, 4.4); for (const [ox, oz] of [[1.4, 1.4], [-1.4, 1.4], [1.4, -1.4], [-1.4, -1.4]]) put("pcross", BOX_G, MAT.wood, px + ox, py + 2.4, pz + oz, 0.2, 2.3, 0.2);
    put("cross", BOX_G, MAT.wood, px + 4, py, pz, 0.3, 5, 0.3); put("cross", BOX_G, MAT.wood, px + 4, py + 3.8, pz, 1.6, 0.3, 0.3); solid(px, pz, 5, 5, 0);
    mark("Paul's Cross", px, pz, "known", "An open-air pulpit by a cross in the churchyard: the place of the folkmoot, where the citizens met at the sound of St Paul's bell, and where sermons, royal proclamations and excommunications were read out to the crowd. In 1285 the king's warden, not a mayor, rules the City.", { y: 7, range: 500, r: 12 }); }
}

// ---------- London in 1285: the Tower ----------
// Henry III (from 1238) and Edward I (1275-85) turned the Conqueror's keep into a concentric castle, about 12 acres: an inner curtain with
// thirteen towers, pushed east beyond the old Roman wall; an outer curtain with St Thomas's Tower over the new water gate (1275-79, later
// called Traitors' Gate); a moat about 40 m wide, flooded from the Thames; the entrance on the west through the Lion Tower, the Middle Tower
// and the Byward Tower. Henry III had the White Tower whitewashed in 1240, which gave it its name, and kept a menagerie: lions, a leopard,
// a polar bear (1252) that fished in the Thames on a chain, an elephant (1255). Edward I spent about £21,000 here, more than on any castle
// in Wales. Plan simplified from the present layout.
if (ERA === 1285) {
  const TP = (rx, rz) => [TOW_C[0] + rx, TOW_C[1] + rz], TOW_M = new THREE.MeshStandardMaterial({ color: 0xbab2a2, roughness: 0.95 });
  rRect(TOW_C[0] - 28, TOW_C[1] - 19, 318, 200, 0, 4);
  const curtain = (pts, h, th, gaps) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = TP(...pts[i]), [bx, bz] = TP(...pts[i + 1]), len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 2.5)), ry = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k < n; k++) { const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n; if (gaps.some(([gx, gz, r]) => { const [X, Z] = TP(gx, gz); return Math.hypot(X - x, Z - z) < r; })) continue;
      const gy = groundH(x, z); put("tw:wall", BOX_G, TOW_M, x, gy - 1.5, z, th, h + 1.5, len / n + 0.05, ry); if (k % 2 === 0) put("tw:wall", BOX_G, TOW_M, x, gy + h, z, th, 1.3, len / n * 0.55, ry); solid(x, z, th, len / n + 0.2, ry); } } };
  const tower = (rx, rz, d, h) => { const [x, z] = TP(rx, rz), gy = groundH(x, z); put("tw:tower", CYL_G, TOW_M, x, gy - 1.5, z, d, h + 1.5, d); for (let a = 0; a < 6.28; a += 6.28 / 10) put("tw:wall", BOX_G, TOW_M, x + Math.cos(a) * (d / 2 - 0.5), gy + h, z + Math.sin(a) * (d / 2 - 0.5), 1.2, 1.3, 1.2, -a); solid(x, z, d * 0.8, d * 0.8, 0); };
  // the inner curtain and its towers; its gate (the Garden Tower, later the Bloody Tower) on the south
  curtain([[-117, -52], [61, -52], [61, 48], [-117, 48], [-117, -52]], 11, 3, [[-55, 48, 6]]);
  for (const [x, z] of [[-117, -52], [61, -52], [61, 48], [-117, 48], [-60, -52], [-20, -52], [20, -52], [-117, -2], [61, -15], [61, 18], [-30, 48], [15, 48]]) tower(x, z, 13, 17);
  // the outer curtain, lower, with rounded bastions; the Byward gate in its south-west corner
  curtain([[-139, 40], [-139, -72], [83, -72], [83, 68], [-139, 68], [-139, 54]], 7, 2.6, [[-48, 68, 13]]);
  for (const [x, z] of [[-139, -72], [83, -72], [-30, -72], [83, 0], [83, 68]]) tower(x, z, 16, 9);
  // gatehouses: the Byward Tower and the Middle Tower astride the causeway over the moat, and beyond them the Lion Tower
  const hollowTower = (rx, rz, dd, h, face) => { const [x, z] = TP(rx, rz), gy = groundH(x, z) - 0.2, r = dd / 2, n = 12; for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - face), Math.cos(a - face))) < 0.3) { put("tw:wall", BOX_G, TOW_M, x + Math.cos(a) * r, gy + 2.6, z + Math.sin(a) * r, 1.2, h - 2.6, 2 * r * Math.sin(Math.PI / n) + 0.15, -a); continue; } put("tw:wall", BOX_G, TOW_M, x + Math.cos(a) * r, gy - 1, z + Math.sin(a) * r, 1.2, h + 1, 2 * r * Math.sin(Math.PI / n) + 0.15, -a); solid(x + Math.cos(a) * r, z + Math.sin(a) * r, 1.2, 2 * r * Math.sin(Math.PI / n) + 0.1, -a); }
    for (let a = 0; a < 6.28; a += 6.28 / 10) put("tw:wall", BOX_G, TOW_M, x + Math.cos(a) * (r - 0.5), gy + h, z + Math.sin(a) * (r - 0.5), 1.2, 1.3, 1.2, -a); put("tw:floor", CYL_G, TOW_M, x, gy + 4, z, dd - 1.2, 0.3, dd - 1.2); guardRoom(FR(x, z, 0, gy), r * 1.2, r * 1.2, 3.8); };
  for (const gx of [-139, -162]) { hollowTower(gx, 36, 11, 14, Math.PI / 2); hollowTower(gx, 56, 11, 14, -Math.PI / 2); const [x, z] = TP(gx, 46), F = FR(x, z, 0, groundH(x, z), "tower"); GTINT = [1.1, 1.06, 0.98]; gbox(F, "rubble", 0, 10, 0, 9, 8.5, 16, ""); for (let u = -7; u < 8; u += 2) gbox(F, "rubble", 4, 14.8, u, 1, 1.2, 1, "b"); GTINT = [1, 1, 1]; for (const sx of [-1, 1]) garch(F, "dark", sx * 4.52, 5.8, 0, 3.2, 4.2, [sx, 0, 0]); }
  // the Lion Tower: a round barbican with an open yard; round its inside, barred dens where the king's beasts are kept
  { const [lx, lz] = TP(-198, 26), gy = groundH(lx, lz) - 0.2, r = 12, n = 24; for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.18) { put("tw:wall", BOX_G, TOW_M, lx + Math.cos(a) * r, gy + 4, lz + Math.sin(a) * r, 1.6, 5, 2 * r * Math.sin(Math.PI / n) + 0.2, -a); continue; }
      put("tw:wall", BOX_G, TOW_M, lx + Math.cos(a) * r, gy - 1, lz + Math.sin(a) * r, 1.6, 10, 2 * r * Math.sin(Math.PI / n) + 0.2, -a); if (k % 2) put("tw:wall", BOX_G, TOW_M, lx + Math.cos(a) * r, gy + 9, lz + Math.sin(a) * r, 1.6, 1.3, 1.2, -a); solid(lx + Math.cos(a) * r, lz + Math.sin(a) * r, 1.6, 2 * r * Math.sin(Math.PI / n) + 0.1, -a); }
    for (let d = 0; d < 4; d++) { const a0 = Math.PI * 0.35 + d * Math.PI * 0.33, ca = Math.cos(a0), sa = Math.sin(a0), fr = 8.2, cx = lx + ca * 9.8, cz = lz + sa * 9.8;
      for (const s2 of [-1, 1]) { const wa = a0 + s2 * 0.15, wx = lx + Math.cos(wa) * 9.9, wz = lz + Math.sin(wa) * 9.9; put("tw:wall", BOX_G, TOW_M, wx, gy, wz, 3.6, 3.2, 0.5, -wa + Math.PI / 2); solid(wx, wz, 3.6, 0.5, -wa + Math.PI / 2); }
      for (let b = -6; b <= 6; b++) { const ba = a0 + b * 0.022, bx = lx + Math.cos(ba) * fr, bz = lz + Math.sin(ba) * fr; put("lionbar", CYL_G, MAT.iron, bx, gy, bz, 0.06, 3, 0.06); } put("lionbar", BOX_G, MAT.iron, lx + ca * fr, gy + 2.9, lz + sa * fr, 0.1, 0.1, 3.1, -a0); { const bx = lx + ca * fr, bz = lz + sa * fr; solid(bx, bz, 0.3, 3.0, -a0); }
      LIONS.push({ x: cx, z: cz, gy, a: a0, ph: d * 1.7, kind: d === 3 ? "leopard" : "lion", lie: d === 1 }); }
    { const ww = 3.4; put("tw:floor", CYL_G, M(0x9a8a6a), lx, gy + 0.05, lz, r * 2 - 1.5, 0.1, r * 2 - 1.5); } }
  // the inner gate over the gap in the south curtain
  { const [x, z] = TP(-55, 48), F = FR(x, z, 0, groundH(x, z), "tower"); GTINT = [1.1, 1.06, 0.98]; gbox(F, "rubble", 0, 11, 0, 12, 11, 9, ""); GTINT = [1, 1, 1]; for (const sz of [-1, 1]) garch(F, "dark", 0, 5.4, sz * 4.52, 3.6, 4.4, [0, 0, sz]); }
  // St Thomas's Tower over the water gate: a broad arch where boats come in from the river under the outer curtain
  { const [x, z] = TP(-48, 70), gy = groundH(x, z), F = FR(x, z, 0, gy, "tower"); GTINT = [1.12, 1.08, 1.0]; gbox(F, "rubble", 0, 8.5, 0, 26, 17, 13); for (const sx of [-1, 1]) gbox(F, "rubble", sx * 12.5, 10, 6, 4.5, 20, 4.5);
    for (let u = -12; u < 13; u += 2) gbox(F, "rubble", u, 17.6, 6.2, 1, 1.3, 0.8, "b"); GTINT = [1, 1, 1]; garch(F, "dark", 0, -1.5, 6.52, 17, 9, [0, 0, 1]); for (const u of [-6, 0, 6]) garch(F, "dark", u, 11, 6.52, 1.4, 3.2, [0, 0, 1]); solid(x, z, 26, 13, 0);
    mark("St Thomas's Tower and the water gate", x, z, "known", "Built by Edward I in 1275-79 over a new water gate in the outer curtain, so that the king could come and go by river. Later it was the way prisoners were brought in by boat after trial at Westminster, and it became known as Traitors' Gate. In 1285 it is brand new, and its upper floor holds a royal chamber with an oratory dedicated to St Thomas Becket.", { y: 20, range: 1500, r: 25 }); }
  // inside: Henry III's great hall by the inner curtain, and the chapel of St Peter ad Vincula
  { const [x, z] = TP(-15, 30); walkHall(x, z, 12, 30, 9, [0.95, 0.92, 0.88], "tower"); mark("The great hall", x, z, "known", "Henry III's great hall in the inner ward, by the royal lodgings in the Wakefield Tower: where the king held court and feasted when he stayed at the Tower. Gone today.", { y: 13, range: 500, r: 12 }); }
  { const [x, z] = TP(-88, -30); addChurch(x, z, { mat: "rag", roof: "shingle", nl: 16, nw: 7, cl: 7, cw: 5.5, wh: 7 }); mark("St Peter ad Vincula", x, z, "known", "The chapel of the Tower's inner ward. Edward I will rebuild it in 1286-87; in 1285 it is still the old chapel that Henry III had glazed and painted.", { y: 12, range: 500, r: 12 }); }
  { const [x, z] = TP(-20, -40); mark("The Tower of London", x, z, "known", "A concentric castle by 1285. Henry III enlarged the Conqueror's White Tower with an inner curtain and towers, pushed east beyond the old Roman wall (the Londoners were furious, and when the new gate collapsed in 1240-41 they said St Thomas Becket had knocked it down). Edward I added the outer curtain, the great moat and the new entrance in 1275-85, at a cost of about £21,000. The White Tower has been whitewashed since 1240: hence its name.", { y: 40, range: 4000, r: 70, big: true }); }
  { const [x, z] = TP(-198, 26); mark("The Lion Tower: the king's beasts", x, z, "known", "The outermost gate, a round barbican west of the moat, where the royal menagerie was kept: lions, leopards and other gifts to the king. Henry III was sent a polar bear by the king of Norway in 1252; the sheriffs of London had to pay 4 pence a day for its keep and a muzzle and chain so it could fish in the Thames. An elephant from Louis IX arrived in 1255 and died two years later. In 1285 there are lions and a leopard: walk into the yard to see them in their dens.", { y: 14, range: 800, r: 20 }); }
  { const [x, z] = TP(-160, -95); mark("The moat", x, z, "known", "Edward I's moat, dug in 1275-81 by Flemish engineers under Walter of Flanders: some 40 m wide, filled from the Thames and held by sluices.", { y: 4, range: 600, r: 25 }); }
}

// ---------- London in 1285: Henry III's Westminster Abbey ----------
// From 1245 Henry III pulled down the Confessor's east end and built a Gothic church in the French manner (Reims, the Sainte-Chapelle):
// the highest vault in England, about 31 m; flying buttresses; an apse with an ambulatory and radiating chapels; transepts, the north one
// with a rose window over a triple porch ('Solomon's Porch'); and the first five bays of a new nave, consecrated on 13 October 1269 when
// the Confessor's body was moved to a golden shrine behind the high altar, on a Cosmati base of porphyry and glass mosaic (Italian work,
// 1268-69), with the Cosmati pavement before the altar. Henry III was buried by the shrine in 1272. West of the new work, the Romanesque
// nave still stands, lower, and will until the 1370s-1500s. The Lady Chapel at the east end is Henry's of 1220.
if (ERA === 1285) {
  const Y0 = AB_Y, X0 = AB_CUT, XA = 30, XM = (X0 + XA) / 2, L = XA - X0, stone = [1.45, 1.4, 1.28], lead = [0.62, 0.64, 0.68];
  const gT = G_TEX.rubble.clone(); gT.repeat.set(14, 5); gT.needsUpdate = true; const gM = new THREE.MeshStandardMaterial({ map: gT, color: 0xe8dcc6, roughness: 0.9, side: THREE.DoubleSide }), leadM = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide });
  // the main vessel (the new nave bays and the choir) and its aisles, hollow: aisle walls, arcades on Purbeck marble piers, triforium,
  // clerestory, a pointed vault; open to the old nave at the west, to the transepts, and to the apse at the east
  const purbM = new THREE.MeshStandardMaterial({ color: 0x4a4844, roughness: 0.45, metalness: 0.05 }), vaultM = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9, side: THREE.DoubleSide }), ribM = new THREE.MeshStandardMaterial({ color: 0xb8ac94, roughness: 0.8, side: THREE.DoubleSide });
  const crescent = (hw, rise, t) => { const s = new THREE.Shape(); s.moveTo(-hw, 0); s.quadraticCurveTo(-hw, rise * 0.8, 0, rise); s.quadraticCurveTo(hw, rise * 0.8, hw, 0); s.lineTo(hw - t, 0); s.quadraticCurveTo(hw - t, rise * 0.8 - t, 0, rise - t); s.quadraticCurveTo(-hw + t, rise * 0.8 - t, -hw + t, 0); s.lineTo(-hw, 0); return s; };
  const ARC_G = (() => { const s = new THREE.Shape(); s.moveTo(-2.8, 9); s.lineTo(-2.05, 9); s.quadraticCurveTo(-2.05, 12.6, 0, 14.2); s.quadraticCurveTo(2.05, 12.6, 2.05, 9); s.lineTo(2.8, 9); s.lineTo(2.8, 15.05); s.lineTo(-2.8, 15.05); s.lineTo(-2.8, 9); return new THREE.ExtrudeGeometry(s, { depth: 1.2, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.6); })();
  const RIB_G = new THREE.ExtrudeGeometry(crescent(6.6, 5.6, 0.45), { depth: 0.35, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -0.17);
  { const MF = FR(XM, 0, Math.PI / 2, Y0, "abbeyG"), AF = FR(XM, 0, 0, Y0, "abbeyG"), cx = -XM; flatUnder(AF, L, 28, AB_F - 0.03); flatUnder(FR(0, 0, 0, Y0), 14.6, 61, AB_F - 0.03); flatUnder(FR(XA + 3.6, 0, 0, Y0), 7.4, 14.6, AB_F - 0.03);
    GTINT = stone; gWalls(AF, "rubble", L, 28, 15, 1.2, [["-x", 0, 21, 15, []], ["+x", 0, 14.6, 15, []], ["-z", cx, 14.6, 15, []], ["+z", cx, 14.6, 15, []]]);
    for (const sz of [-1, 1]) { for (const [u0, u1] of [[-L / 2, cx - 7.3], [cx + 7.3, L / 2]]) { gbox(AF, "rubble", (u0 + u1) / 2, 23.5, sz * 6.6, u1 - u0, 17, 1.2, ""); }
      for (let u = -L / 2 + 2.8; u < L / 2; u += 5.6) { if (Math.abs(u - cx) < 7.6) continue; const [ax, , az] = gw(AF, u, 0, sz * 6.6); put("abarc", ARC_G, STONEK, ax, Y0, az, 1, 1, 1, 0);
        GTINT = [1, 1, 1]; garch(AF, "dark", u - 1.1, 16.4, sz * (6.6 - 0.62), 0.9, 2.8, [0, 0, -sz]); garch(AF, "dark", u + 1.1, 16.4, sz * (6.6 - 0.62), 0.9, 2.8, [0, 0, -sz]); GTINT = [1.75, 1.72, 1.8]; gWin(AF, u, 21.5, sz * (6.6 - 0.62), 2.6, 9, [0, 0, -sz]); gWin(AF, u, 3.2, sz * (14 - 0.62), 2.4, 8, [0, 0, -sz]); GTINT = stone; }
      for (let u = -L / 2 + 5.6; u < L / 2 - 1; u += 5.6) { if (Math.abs(u - cx) < 7.0) continue; const [px, , pz] = gw(AF, u, 0, sz * 6.6); put("purbeck", CYL_G, purbM, px, Y0, pz, 1.5, 9.1, 1.5); for (const o of [[0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]]) put("purbeck", CYL_G, purbM, px + o[0], Y0, pz + o[1], 0.4, 9.1, 0.4); put("purbeck", CYL_G, purbM, px, Y0 + 15, pz - sz * 0.62, 0.35, 12, 0.35); solid(px, pz, 1.6, 1.6, 0); } }
    gbox(AF, "rubble", -L / 2, 23.5, 0, 1.2, 17, 13.2, "");
    for (const [u0, u1] of [[-L / 2, cx - 6.6], [cx + 6.6, L / 2]]) { const g = new THREE.ExtrudeGeometry(crescent(6.6, 5.6, 0.3), { depth: u1 - u0, bevelEnabled: false, curveSegments: 10 }).rotateY(Math.PI / 2); const m = new THREE.Mesh(g, vaultM); const [vx, , vz] = gw(AF, u0, 0, 0); m.position.set(vx, Y0 + 27, vz); scene.add(m);
      for (let u = u0 + 2.8; u < u1; u += 5.6) { const [rx, , rz] = gw(AF, u, 0, 0); put("abrib", RIB_G, ribM, rx, Y0 + 26.9, rz, 1, 1, 1, Math.PI / 2); } }
    for (const sz of [-1, 1]) for (const [x0, x1] of [[X0, -7.3], [7.3, XA]]) { const ag = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 7.4).rotateX(Math.PI / 2), vaultM); ag.position.set((x0 + x1) / 2, Y0 + 14.9, sz * 10.3); scene.add(ag); }
    GTINT = lead; groof(MF, "shingle", 14.6, L, 32, 11, { e: 0.4, t: 0.3 }); GTINT = stone; gGableBoth(MF, "rubble", 14.6, L, 32, 11);
    for (const sx of [-1, 1]) { const [rx, , rz] = gw(MF, sx * 10.6, 0, 0); put("abroof", BOX_G, LEADK, rx, Y0 + 17.2, rz, 8.2, 0.35, L, Math.PI / 2, 0, -sx * Math.atan2(4.4, 7.2));
      for (let u = -L / 2 + 3; u < L / 2 - 1; u += 5.6) { if (Math.abs(u + XM) < 8) continue; GTINT = [1, 1, 1]; garch(MF, "dark", sx * 7.22, 19.5, u, 3.0, 10.5, [sx, 0, 0]); garch(MF, "dark", sx * 14.62, 3.2, u, 2.6, 8.5, [sx, 0, 0]);
        const [px, , pz] = gw(MF, sx * 15.6, 0, u + 2.8); put("abbutt", BOX_G, STONEK, px, Y0, pz, 1.6, 23, 2.2); put("abpin", CONE4_G, STONEK, px, Y0 + 23, pz, 1.7, 4.5, 1.7); solid(px, pz, 1.6, 2.2, 0);
        const fy = 21.5, ty = 28, dz = 7.6, fl = Math.hypot(dz, ty - fy), [qx, , qz] = gw(MF, sx * 11.8, 0, u + 2.8); put("abfly", BOX_G, STONEK, qx, Y0 + (fy + ty) / 2 - 0.45, qz, 0.8, 0.9, fl, 0, -sx * Math.asin((ty - fy) / fl)); } }
    for (const sz of [-1, 1]) for (const [u0, u1] of [[-L / 2, cx - 7.3], [cx + 7.3, L / 2]]) dado(AF, (u0 + u1) / 2, sz * (14 - 0.62), u1 - u0, [0, 0, -sz], AB_F - Y0 + 0.01, 2.6);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(L, 26.6).rotateX(-Math.PI / 2), AMAT.floor); fl.position.set(XM, AB_F + 0.01, 0); scene.add(fl);
    GTINT = [1, 1, 1]; }
  // the transepts, hollow, with the north door under the rose window, and the low lantern over the crossing
  { const TF = FR(0, 0, 0, Y0, "abbeyG"), d = 61;
    GTINT = stone; gWalls(TF, "rubble", 14.6, d, 32, 1.2, [["-x", 0, 28, 15, []], ["+x", 0, 28, 15, []], ["-z", 0, 3.6, 8.5], ["+z", 0, 2.6, 5]]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) gbox(TF, "rubble", sx * 7.3, 23.5, sz * 10.3, 1.2, 17, 7.4, "");
    gGableBoth(TF, "rubble", 14.6, d, 32, 11); GTINT = lead; groof(TF, "shingle", 14.6, d, 32, 11, { e: 0.4, t: 0.3 });
    GTINT = stone; gbox(TF, "rubble", 0, 36, 0, 15.4, 9, 15.4); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { gbox(TF, "rubble", sx * 8.4, 21, sz * (d / 2 + 0.6), 2.4, 42, 2.4); put("abpin", CONE4_G, STONEK, sx * 8.4, Y0 + 42, sz * (d / 2 + 0.6), 2.6, 7, 2.6); }
    put("abcap", CONE4_G, MAT.lead, 0, Y0 + 40.5, 0, 15.8, 5, 15.8);
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const k of [0, 1]) { garch(TF, "dark", sx * 7.92, k ? 19.5 : 3.2, sz * (d / 2 - 9), k ? 3 : 2.6, k ? 10.5 : 8.5, [sx, 0, 0]); GTINT = [1.75, 1.72, 1.8]; gWin(TF, sx * (7.3 - 0.62), k ? 19.5 : 3.2, sz * (d / 2 - 9), k ? 3 : 2.6, k ? 10.5 : 8.5, [-sx, 0, 0]); GTINT = [1, 1, 1]; }
    for (const u of [-4.6, 4.6]) garch(TF, "dark", u, 0, -d / 2 - 0.62, 2.8, 7, [0, 0, -1]); for (const u of [-4.6, 0, 4.6]) garch(TF, "dark", u, 10, -d / 2 - 0.62, 1.2, 5, [0, 0, -1]);
    garch(TF, "dark", 0, 17, d / 2 + 0.62, 5, 12, [0, 0, 1]); GTINT = [1.75, 1.72, 1.8]; gWin(TF, 0, 17, d / 2 - 0.62, 5, 12, [0, 0, -1]); GTINT = [1, 1, 1];
    for (const [z0, z1] of [[-d / 2, -6.6], [6.6, d / 2]]) { const g = new THREE.ExtrudeGeometry(crescent(6.7, 5.6, 0.3), { depth: z1 - z0, bevelEnabled: false, curveSegments: 10 }); const m = new THREE.Mesh(g, vaultM); m.position.set(0, Y0 + 27, z0); scene.add(m); for (let z = z0 + 2.8; z < z1; z += 5.6) put("abrib", RIB_G, ribM, 0, Y0 + 26.9, z, 1, 1, 1, 0); }
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(13.4, d - 1.2).rotateX(-Math.PI / 2), AMAT.floor); fl.position.set(0, AB_F + 0.012, 0); scene.add(fl);
    const glassT = tex(256, 256, (g, w, h) => { g.fillStyle = "#101820"; g.fillRect(0, 0, w, h); for (let k = 0; k < 16; k++) { g.fillStyle = ["#2a4a9a", "#a82a2a", "#c8a040", "#2a7a4a", "#6a3a8a"][k % 5]; g.beginPath(); g.moveTo(128, 128); g.arc(128, 128, 120, k / 16 * 6.283, (k + 0.9) / 16 * 6.283); g.fill(); } g.fillStyle = "#c8a040"; g.beginPath(); g.arc(128, 128, 40, 0, 6.283); g.fill(); g.fillStyle = "#2a4a9a"; g.beginPath(); g.arc(128, 128, 26, 0, 6.283); g.fill(); });
    const rin = new THREE.Mesh(new THREE.CircleGeometry(5.2, 32), new THREE.MeshBasicMaterial({ map: glassT, toneMapped: true })); rin.position.set(0, Y0 + 22, -d / 2 + 0.63); scene.add(rin);
    const rose = new THREE.Group(); rose.add(new THREE.Mesh(new THREE.CircleGeometry(5.2, 32), MAT.dark)); const trM = new THREE.MeshStandardMaterial({ color: 0xe0d6c2, roughness: 0.9 }); rose.add(new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.3, 6, 32), trM)); rose.add(new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.18, 6, 24), trM));
    for (let k = 0; k < 16; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.3, 0.12), trM); const a = k / 16 * Math.PI * 2; b.position.set(Math.sin(a) * 3.6, Math.cos(a) * 3.6, 0.05); b.rotation.z = -a; rose.add(b); }
    rose.position.set(0, Y0 + 22, -d / 2 - 0.68); rose.rotation.y = Math.PI; scene.add(rose);
    mark("Solomon's Porch: the north front", 0, -d / 2, "known", "Henry III's great north transept front, the abbey's state entrance from the palace and the town: a triple porch with sculpted figures under a huge rose window, in the manner of the new French cathedrals. Londoners called the porch 'Solomon's Porch'. Walk in by its central door.", { y: 30, range: 1000, r: 25 }); }
  // the apse with its ambulatory and radiating chapels, and the Lady Chapel beyond
  { const cyl = (r, h, y, x, z, t0, tl) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14, 1, false, t0, tl).translate(0, h / 2, 0), gM); m.position.set(x, Y0 + y, z); scene.add(m); return m; };
    cyl(7.3, 32, 0, XA, 0, 0, Math.PI); cyl(14, 15, 0, XA, 0, 0, Math.PI);
    { const r1 = new THREE.Mesh(new THREE.ConeGeometry(8.2, 9, 14, 1, true, 0, Math.PI).translate(0, 4.5, 0), leadM); r1.position.set(XA, Y0 + 32, 0); scene.add(r1); const r2 = new THREE.Mesh(new THREE.ConeGeometry(14.6, 4.8, 14, 1, true, 0, Math.PI).translate(0, 2.4, 0), leadM); r2.position.set(XA, Y0 + 15, 0); scene.add(r2); }
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k + 0.5) / 5 * Math.PI, cx = XA + Math.cos(a) * 16.5, cz = Math.sin(a) * 16.5; cyl(4.2, 13, 0, cx, cz, 0, Math.PI * 2); const c = new THREE.Mesh(new THREE.ConeGeometry(4.6, 4, 10).translate(0, 2, 0), leadM); c.position.set(cx, Y0 + 13, cz); scene.add(c); solid(cx, cz, 7, 7, 0);
      for (const rr of [7.35, 14.05]) { const wa = -Math.PI / 2 + (k + 0.5) / 5 * Math.PI + 0.32, wx = XA + Math.cos(wa) * rr, wz = Math.sin(wa) * rr; put("abwin", BOX_G, MAT.dark, wx, Y0 + (rr < 10 ? 19.5 : 3.5), wz, 0.12, rr < 10 ? 10 : 8, 2.2, -wa); } }
    for (let a = -Math.PI / 2; a <= Math.PI / 2 + 0.01; a += Math.PI / 12) solid(XA + Math.cos(a) * 7.0, Math.sin(a) * 7.0, 1.4, 2.2, -a);
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k + 0.5) / 5 * Math.PI + 0.32; put("abglow", BOX_G, GLASS_M, XA + Math.cos(a) * 7.12, Y0 + 19.5, Math.sin(a) * 7.12, 0.08, 10, 2.2, -a); }
    const LF = FR(XA + 30, 0, Math.PI / 2, Y0, "abbeyG"); GTINT = stone; gbox(LF, "rubble", 0, 9, 0, 11, 18, 26); gGableBoth(LF, "rubble", 11, 26, 18, 6); GTINT = lead; groof(LF, "shingle", 11, 26, 18, 6, { e: 0.4 });
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let u = -10; u < 11; u += 5) garch(LF, "dark", sx * 5.52, 4, u, 2.2, 9, [sx, 0, 0]); solid(XA + 30, 0, 26, 11, 0);
    mark("The Lady Chapel", XA + 30, 0, "known", "Henry III laid its foundation stone in 1220, before he began the new church; it stood at the east end until Henry VII replaced it in 1503 with the chapel that bears his name.", { y: 22, range: 800, r: 14 }); }
  // inside the old nave, its east end: the stone screen (pulpitum) before the monks' choir, painted, with its door and the rood above
  { const PF = FR(X0 - 0.5, 0, Math.PI / 2, AB_F, "abbeyG"); GTINT = [1.3, 1.24, 1.12]; for (const sx of [-1, 1]) gbox(PF, "rubble", sx * 3.5, 3.5, 0, 5, 7, 0.9, ""); gbox(PF, "rubble", 0, 5.3, 0, 2.2, 3.4, 0.9, ""); for (const sx of [-1, 1]) { const [px, , pz] = gw(PF, sx * 3.5, 0, 0); solid(px, pz, 5, 0.9, Math.PI / 2); }
    GTINT = [0.9, 0.3, 0.22]; for (const sx of [-1, 1]) gbox(PF, "plain", sx * 3.5, 1.5, -0.5, 5, 3, 0.1, ""); GTINT = [0.25, 0.42, 0.62]; gbox(PF, "plain", 0, 6.4, -0.5, 12, 0.5, 0.1, "");
    GTINT = [1, 1, 1]; for (const u of [-4.2, -2.4, 2.4, 4.2]) garch(PF, "dark", u, 3.6, -0.58, 1.1, 2.2, [0, 0, -1]);
    GTINT = [1.5, 1.25, 0.6]; gbox(PF, "plain", 0, 7, 0, 0.35, 4.5, 0.3, ""); gbox(PF, "plain", 0, 10, 0, 2.6, 0.35, 0.3, ""); GTINT = [1, 1, 1]; }
  // the monks' choir: oak stalls in two tiers each side, from the screen to the crossing
  for (const sz of [-1, 1]) for (let x = X0 + 1.5; x < -8; x += 0.75) { put("stall", BOX_G, MAT.wood, x, AB_F, sz * 4.4, 0.7, 0.5, 0.6); put("stall", BOX_G, MAT.wood, x, AB_F, sz * 5.3, 0.7, 0.9, 0.6); put("stall", BOX_G, MAT.wood, x, AB_F + 0.9, sz * 5.65, 0.72, 1.8, 0.12); }
  for (const sz of [-1, 1]) { solid((X0 - 8) / 2 + 0.75, sz * 4.9, X0 * -1 - 9.5, 1.6, 0); }
  for (const [x, z] of [[23.4, 1.8], [23.4, -1.8], [28.6, 1.8], [28.6, -1.8], [26, 2.6]]) INTERIOR_FOLK.push([x > 26 ? "woman" : "eng", x, z, 26, 0, "kneel"]); for (const z of [0.7, -0.7]) INTERIOR_FOLK.push(["cleric", 18.9, z, 20, z, "pray"]);
  for (const [x, z, r, k] of [[-40, 3, "eng", "talk"], [-40, 1.6, "woman", "talk"], [-50, -4, "eng", "stand"], [-55, 2, "woman", "pray"], [-35, -3, "eng", "talk"], [-35, -1.6, "noble", "talk"]]) INTERIOR_FOLK.push([r, x, z, x + (k === "pray" ? 10 : 0), z + (k === "talk" ? (z > 2 || z < -2 ? -2 : 2) * Math.sign(z || 1) : 0) + (k === "stand" ? 3 : 0), k]);
  // the Cosmati pavement before the high altar (1268): porphyry and glass in roundels and interlace, laid by Italian craftsmen
  { const cT = tex(512, 512, (g, w, h) => { g.fillStyle = "#3a3430"; g.fillRect(0, 0, w, h); const roundel = (x, y, r, k) => { g.fillStyle = ["#7a2a3a", "#2a5a3a", "#c8a040", "#d8d0c0"][k % 4]; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.strokeStyle = "#e8e0d0"; g.lineWidth = 4; g.stroke(); };
      roundel(256, 256, 70, 0); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; roundel(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150, 46, k + 1); } for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; roundel(256 + Math.cos(a) * 225, 256 + Math.sin(a) * 225, 16, k); }
      g.strokeStyle = "#c8a040"; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); for (let x = 20; x < w - 20; x += 24) { g.fillStyle = (x / 24) % 2 ? "#7a2a3a" : "#2a5a3a"; g.fillRect(x, 16, 12, 12); g.fillRect(x, h - 28, 12, 12); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 7.6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: cT, roughness: 0.4 })); m.position.set(14, AB_F + 0.025, 0); scene.add(m); }
  // the high altar with the Westminster Retable (painted about 1270), and behind it St Edward's shrine and Henry III's tomb
  { const gold = new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.85, roughness: 0.3 }), cosT = tex(256, 128, (g, w, h) => { g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = "#7a2a3a"; g.beginPath(); g.arc(x + 16, 40, 12, 0, 6.283); g.fill(); g.fillStyle = "#2a5a3a"; g.fillRect(x + 6, 76, 20, 20); g.fillStyle = "#c8a040"; g.fillRect(x, 104, 32, 6); g.fillRect(x, 10, 32, 6); } }), cosM = new THREE.MeshStandardMaterial({ map: cosT, roughness: 0.5 });
    put("altar", BOX_G, AMAT.ashlar, 20, AB_F, 0, 1.1, 1.05, 2.8); put("altar", BOX_G, gold, 19.42, AB_F + 0.1, 0, 0.04, 0.85, 2.5); solid(20, 0, 1.2, 2.9, 0);
    const rT = tex(512, 128, (g, w, h) => { g.fillStyle = "#1e3a6a"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8a040"; g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); for (let k = 0; k < 7; k++) { const x = 40 + k * 72; g.fillStyle = "#c8a040"; g.fillRect(x - 28, 12, 56, h - 24); g.fillStyle = k === 3 ? "#8a2a24" : "#e8dcc0"; g.fillRect(x - 22, 18, 44, h - 36); g.fillStyle = "#e0b898"; g.beginPath(); g.arc(x, 36, 9, 0, 6.283); g.fill(); g.fillStyle = "#c8a040"; g.beginPath(); g.arc(x, 34, 13, Math.PI, 0); g.fill(); } });
    const ret = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.95), new THREE.MeshStandardMaterial({ map: rT, roughness: 0.6, side: THREE.DoubleSide })); ret.position.set(20.5, AB_F + 1.55, 0); ret.rotation.y = -Math.PI / 2; scene.add(ret);
    for (const sz of [-1, 1]) { put("candle", CYL_G, M(0xeee8dc), 20, AB_F + 1.05, sz * 1.1, 0.06, 0.4, 0.06); put("flame", FLAME_G, flameM, 20, AB_F + 1.45, sz * 1.1, 1, 1, 1); }
    const sb = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.9, 1.9).translate(0, 0.95, 0), cosM); sb.position.set(26, AB_F, 0); scene.add(sb); solid(26, 0, 3.6, 2.1, 0);
    for (const sz of [-1, 1]) for (const u of [-1, 0, 1]) { const n = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.1), MAT.dark); n.position.set(26 + u * 1.05, AB_F + 0.7, sz * 0.96); n.rotation.y = sz > 0 ? 0 : Math.PI; scene.add(n); }
    const fer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 1.0).translate(0, 0.45, 0), gold); fer.position.set(26, AB_F + 1.9, 0); scene.add(fer); put("feret", GABLE_G, gold, 26, AB_F + 2.8, 0, 1.0, 0.55, 2.6, Math.PI / 2);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; put("candle", CYL_G, M(0xeee8dc), 26 + Math.cos(a) * 2.6, AB_F, Math.sin(a) * 1.9, 0.08, 1.6, 0.08); put("flame", FLAME_G, flameM, 26 + Math.cos(a) * 2.6, AB_F + 1.6, Math.sin(a) * 1.9, 1.2, 1.2, 1.2); }
    const ht = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.4, 1.2).translate(0, 0.7, 0), cosM); ht.position.set(25.6, AB_F, -4.3); scene.add(ht); put("tombtop", BOX_G, purbM, 25.6, AB_F + 1.4, -4.3, 2.9, 0.12, 1.3); solid(25.6, -4.3, 2.9, 1.3, 0); }

  // the inside, unseen: notes for the shrine and the tombs
  mark("Westminster Abbey", -40, -18, "known", "Half old, half new. East of here rises Henry III's Gothic church, begun in 1245 and consecrated in 1269: the highest vault in England, flying buttresses, a ring of chapels round the east end. West of it the Confessor's Romanesque nave still stands, lower and older; it will be rebuilt to match only from the 1370s, and not finished until about 1500. Henry spent some £45,000 on the work, more than on anything else in his reign.", { y: 40, range: 3000, r: 40, big: true });
  mark("St Edward's shrine", 22, 0, "known", "Behind the high altar, raised on a base of Italian Cosmati work, inlaid porphyry and glass mosaic, the golden feretory of St Edward the Confessor, to which his body was moved on 13 October 1269. Pilgrims kneel in the niches of the base, hoping for healing. Henry III lies beside it, buried in 1272 (his bronze effigy was made in 1291). Before the high altar, the Cosmati pavement of 1268. (Inside is not built here: the old nave is open.)", { y: 36, range: 900, r: 20 });
  mark("The old nave", X0 - 14, 0, "known", "The Romanesque nave of the Confessor's church, still standing west of Henry III's new work and visibly lower; the monks use the new choir, the townsfolk this nave. Walk in by the west door.", { y: 28, range: 900, r: 18 });
}

// ---------- London in 1285: the City ----------
// The friars came in the 13th century and took big precincts: the Franciscans (Greyfriars, 1225) by Newgate, the Austin friars (1253) by
// Broad Street, the Carmelites (Whitefriars, 1247) off Fleet Street, the Crutched Friars (about 1269) near Tower Hill, and the Dominicans
// (Blackfriars), who in 1276 moved to the site of Baynard's Castle and Montfichet's Tower; for them the City wall is being carried west
// from Ludgate to the Fleet and down to the Thames. The Templars' round church (1185) stands by Fleet Street; the Guildhall in the north
// of the City; the Great Conduit (1236-45) brings water in lead pipes from the Tyburn springs to Cheapside. The Jewry lies round Old Jewry:
// in 1285 a dwindling, heavily taxed community, five years before Edward I expelled all Jews from England (1290).
const CONDUITS = [];
if (ERA === 1285) {
  const near = (lat, lon, w, d) => { let [x, z] = LL(lat, lon); for (let r = 0; r < 90; r += 4) for (let a = 0; a < 6.28; a += 0.5) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (rRect(X, Z, w, d, 0, 0, true)) return [X, Z]; } return [x, z]; };
  for (const [name, lat, lon, text] of [["Greyfriars", 51.5160, -0.0995, "The Franciscans, the Friars Minor, came to London in 1224 and settled here by Newgate, in the poorest quarter by the Shambles. They live by begging and preach in the streets; their church is being enlarged with the gifts of Londoners, and in 1306 Queen Margaret will rebuild it on a grand scale."],
    ["Blackfriars", 51.5122, -0.1028, "The Dominicans, the Friars Preachers, moved here in 1276 from Holborn, given the sites of Baynard's Castle and Montfichet's Tower by the City and the archbishop. Edward I and Queen Eleanor are their patrons; their great church is rising, and the City wall is being carried round their precinct to the Fleet."],
    ["Austin Friars", 51.5160, -0.0858, "The Augustinian friars (Austin friars), settled here in 1253 by Humphrey de Bohun, earl of Hereford."],
    ["Whitefriars", 51.5132, -0.1078, "The Carmelites, the White Friars from their white cloaks, settled between Fleet Street and the river in 1247."],
    ["Crutched Friars", 51.5121, -0.0775, "The friars of the Holy Cross, called 'crutched' (crossed) from the red cross on their habits, settled near Tower Hill about 1269."]]) {
    const [x, z] = near(lat, lon, 64, 34); addChurch(x, z, { mat: "rag", roof: "shingle", nl: 30, nw: 11, cl: 12, cw: 8, wh: 9 }); rRect(x + 6, z + 22, 40, 22, 0, 4);
    mark(name, x, z, "known", text, { y: 16, range: 1500, r: 20 }); }
  // the Temple: the Knights Templar's round church, modelled on the Holy Sepulchre, consecrated 1185, with the chancel of 1240
  { const [x, z] = near(51.5131, -0.1100, 50, 28), gy = groundH(x, z) - 0.3, sM = new THREE.MeshStandardMaterial({ map: G_TEX.rubble.clone(), color: 0xe0d6c0, roughness: 0.9 }); sM.map.repeat.set(10, 3); sM.map.needsUpdate = true;
    const lM = new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.55, metalness: 0.25 }), drum = (r, h, y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 16).translate(0, h / 2, 0), sM); m.position.set(x - 10, gy + y, z); scene.add(m); };
    const rx = x - 10, rz = z; let ty = 1e9; for (let a = 0; a < 6.28; a += 0.8) ty = Math.min(ty, groundH(rx + Math.cos(a) * 9, rz + Math.sin(a) * 9), groundH(x + 11.5 + Math.cos(a) * 9, z + Math.sin(a) * 6)); const fy = ty - 0.3;
    // the round: a ring wall with the west door, an inner arcade of Purbeck marble columns carrying the raised drum, a conical roof
    for (let k = 0; k < 16; k++) { const a = (k + 0.5) / 16 * Math.PI * 2; if (Math.abs(a - Math.PI) < 0.2) continue; put("trwall", BOX_G, sM, rx + Math.cos(a) * 9.5, fy, rz + Math.sin(a) * 9.5, 1.0, 8, 3.8, -a); solid(rx + Math.cos(a) * 9.5, rz + Math.sin(a) * 9.5, 1.0, 3.8, -a); }
    put("trwall", BOX_G, sM, rx - 9.5, fy + 3.6, rz, 1.0, 4.4, 3.8, Math.PI);
    { const m = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 6, 16, 1, true).translate(0, 3, 0), sM); sM.side = THREE.DoubleSide; m.position.set(rx, fy + 8, rz); scene.add(m); }
    const purb = new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.4 }); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; put("tcol", CYL_G, purb, rx + Math.cos(a) * 6, fy, rz + Math.sin(a) * 6, 0.9, 8, 0.9); solid(rx + Math.cos(a) * 6, rz + Math.sin(a) * 6, 0.9, 0.9, 0); }
    { const c = new THREE.Mesh(new THREE.ConeGeometry(7, 5, 16).translate(0, 2.5, 0), lM); c.material.side = THREE.DoubleSide; c.position.set(rx, fy + 14, rz); scene.add(c); const c2 = new THREE.Mesh(new THREE.ConeGeometry(10.2, 2.4, 16, 1, true).translate(0, 1.2, 0), lM); c2.position.set(rx, fy + 8, rz); scene.add(c2);
      const ceil = new THREE.Mesh(new THREE.RingGeometry(6, 9.5, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe0d6c0, side: THREE.DoubleSide })); ceil.position.set(rx, fy + 7.9, rz); scene.add(ceil); }
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; put("tewin", BOX_G, MAT.dark, rx + Math.cos(a) * 10.02, fy + 3, rz + Math.sin(a) * 10.02, 0.1, 2.6, 1.0, -a); put("tewin", BOX_G, MAT.dark, rx + Math.cos(a + 0.26) * 6.05, fy + 10, rz + Math.sin(a + 0.26) * 6.05, 0.1, 2.2, 0.9, -a - 0.26); }
    { const fl = new THREE.Mesh(new THREE.CircleGeometry(9.2, 24).rotateX(-Math.PI / 2), AMAT.floor); fl.position.set(rx, fy + 0.31, rz); scene.add(fl); }
    // the knights' effigies on the floor of the round: stone figures in mail, crossed legs, shields
    for (const [ox, oz, a] of [[-2.2, -2.5, 0.2], [-2.2, 2.5, -0.2], [2.2, -2.5, 0.1], [2.2, 2.5, -0.1], [0, -3.6, 0]]) { const ex = rx + ox, ez = rz + oz; put("effigy", BOX_G, purb, ex, fy + 0.3, ez, 2.0, 0.35, 0.7, a); put("effigy", CYL_G, purb, ex - Math.cos(a) * 0.85, fy + 0.62, ez + Math.sin(a) * 0.85, 0.32, 0.22, 0.32); put("effigy", BOX_G, purb, ex + Math.cos(a) * 0.2, fy + 0.62, ez - Math.sin(a) * 0.2, 0.5, 0.06, 0.4, a); }
    // the chancel of 1240, opening off the round to the east: a hall church, its three aisles of equal height
    const F = FR(x + 11.5, z, Math.PI / 2, fy, "temple"); GTINT = [1.45, 1.4, 1.28]; gWalls(F, "rubble", 18, 24, 10, 0.8, [["-z", 0, 8, 7]]); gGableBoth(F, "rubble", 18, 24, 10, 6); GTINT = [0.62, 0.64, 0.68]; groof(F, "shingle", 18, 24, 10, 6, { e: 0.3, under: "plank" });
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let u = -9; u < 10; u += 4.5) { garch(F, "dark", sx * 9.42, 2.5, u, 1.2, 5, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; gWin(F, sx * 8.58, 2.5, u, 1.2, 5, [-sx, 0, 0]); GTINT = [1, 1, 1]; }
    garch(F, "dark", 0, 2, 12.42, 4, 6, [0, 0, 1]); GTINT = [1.7, 1.7, 1.75]; gWin(F, 0, 2, 11.58, 4, 6, [0, 0, -1]); GTINT = [1, 1, 1];
    for (const sx of [-1, 1]) for (const u of [-6, 0, 6]) { const [px, , pz] = gw(F, sx * 3, 0, u); put("tcol", CYL_G, purb, px, fy, pz, 0.6, 10, 0.6); solid(px, pz, 0.6, 0.6, 0); }
    { const [px, , pz] = gw(F, 0, 0, 10); put("altar", BOX_G, AMAT.ashlar, px, fy + 0.3, pz, 1.0, 1.0, 2.4); solid(px, pz, 1.1, 2.5, 0); }
    GTINT = [0.72, 0.7, 0.66]; gpoly(F, "rush", [[-9, 0.32, -12], [9, 0.32, -12], [9, 0.32, 12], [-9, 0.32, 12]], [[0, 0], [18, 0], [18, 24], [0, 24]], [0, 1, 0]); GTINT = [1, 1, 1];
    flatUnder(F, 19, 25, fy + 0.28); flatUnder(FR(rx, rz, 0, fy), 20, 20, fy + 0.28); surfRect(F, -9, 9, -12, 12, 0.32); surfRect(FR(rx, rz, 0, fy), -9.3, 9.3, -9.3, 9.3, 0.32);
    for (const [u, v, r, k] of [[-3, 3, "noble", "stand"], [3, -3, "noble", "stand"], [-1, 0, "eng", "kneel"]]) INTERIOR_FOLK.push([r, rx + u, rz + v, rx + 20, rz, k]);
    ZONES.push({ name: "temple", F: FR(rx, rz, 0, fy), w: 18, d: 18, light: [0, 6, 0], doors: [[-9.5, 0]], lp: 90, ld: 30 }, { name: "temple", F, w: 17, d: 23, light: [0, 6, 0], doors: [[0, -12]], lp: 90, ld: 30 });
    rRect(x, z, 60, 50, 0, 4);
    mark("The Temple Church", x - 10, z, "known", "The church of the Knights Templar, its round nave modelled on the church of the Holy Sepulchre in Jerusalem, consecrated in 1185 by Heraclius, patriarch of Jerusalem; the long chancel was added in 1240. The New Temple is also a bank: kings and nobles keep treasure here, and in 1263 the future Edward I broke in and took £10,000 of it. Stone effigies of knights lie on the floor of the round.", { y: 20, range: 1500, r: 20 }); }
  // the Guildhall: the hall of the City's government, though in 1285 the king's warden, not a mayor, rules
  { const [x, z] = near(51.5157, -0.0919, 34, 18); walkHall(x, z, 13, 28, 10, [0.95, 0.6, 0.48], "guild"); rRect(x, z, 36, 20, 0, 4);
    mark("The Guildhall", x, z, "known", "Where the City's courts and the folk of the wards meet: the hustings court, the mayor and aldermen. In June 1285 Edward I, angry at the City's disorder, seized its liberties when the mayor Gregory de Rokesley refused to appear before his justices; the City will be ruled by royal wardens until 1298.", { y: 15, range: 1200, r: 15 }); }
  // the Great Conduit at the east end of Cheapside: a stone cistern house where water arrives in lead pipes from the Tyburn springs
  { const [x, z] = near(51.5139, -0.0922, 9, 7), gy = groundH(x, z), F = FR(x, z, 0, gy, "conduit"); GTINT = [1.35, 1.3, 1.18]; gbox(F, "rubble", 0, 2, 0, 7, 4, 4.5); GTINT = [0.7, 0.72, 0.76]; groof(F, "shingle", 7, 4.5, 4, 1.6, { e: 0.2 }); GTINT = [1, 1, 1]; garch(F, "dark", 0, 0.3, 2.27, 1.4, 2.4, [0, 0, 1]);
    put("trough", BOX_G, MAT.lead, x, gy, z + 3.2, 3.2, 0.7, 1.0); solid(x, z, 7, 4.5, 0); CONDUITS.push([x, z + 4]);
    mark("The Great Conduit", x, z, "known", "Built in 1236-45: London's first piped water, brought nearly 5 km in lead pipes from springs by the Tyburn (near today's Bond Street) to this stone cistern house at the head of Cheapside. Water-carriers ('cobs') fill their tankards here to sell water about the town; brewers and fishmongers were forbidden to use it for their trades.", { y: 7, range: 600, r: 10 }); }
  // the Stocks Market: built in 1282 by the mayor Henry le Waleys where the Poultry meets Cornhill, a market house for fish and meat,
  // named after the stocks that stood there; its rents paid for London Bridge
  { const pts = [[-16, -5], [16, -5], [-16, 5], [16, 5], [0, 0]], [cx0, cz0] = LL(51.5132, -0.0888); let best = null, bs = 1e9; for (let r = 0; r < 110; r += 6) for (let a = 0; a < 6.28; a += 0.4) { const X = cx0 + Math.cos(a) * r, Z = cz0 + Math.sin(a) * r; if (!rRect(X, Z, 36, 16, 0, 0, true)) continue; const hs = pts.map(([u, v]) => groundH(X + u, Z + v)), sc = Math.max(...hs) - Math.min(...hs) + r * 0.01; if (sc < bs) { bs = sc; best = [X, Z]; } }
    const [x, z] = best || [cx0, cz0], gy = pts.reduce((a, [u, v]) => a + groundH(x + u, z + v), 0) / 5, F = FR(x, z, Math.PI / 2, gy, "stocks"); flatUnder(F, 22, 46, gy, true); rRect(x, z, 40, 18, 0, 4); self.STOCKS = { x, z, ry: Math.PI / 2 };
    GTINT = [0.55, 0.45, 0.35]; for (const sx of [-1, 1]) for (let u = -14; u <= 14; u += 4) { gbox(F, "oak", sx * 5, 2.2, u, 0.35, 4.4, 0.35); const [px, , pz] = gw(F, sx * 5, 0, u); solid(px, pz, 0.35, 0.35, 0); } gbox(F, "oak", 0, 4.4, 0, 10.6, 0.3, 30);
    GTINT = [0.95, 0.6, 0.48]; groof(F, "shingle", 10.6, 30, 4.4, 3.4, { e: 0.4, under: "plank" }); GTINT = [1, 1, 1]; gGableBoth(F, "plank", 10.6, 30, 4.4, 3.4);
    put("stocks", BOX_G, MAT.wood, x - 18, gy, z + 3, 0.3, 0.6, 2.4); put("stocks", BOX_G, MAT.wood, x - 18, gy + 0.6, z + 3, 0.35, 0.2, 2.6);
    mark("The Stocks Market", x, z, "known", "A covered market for fishmongers and butchers, built in 1282 by Henry le Waleys, mayor, on the site of the stocks where wrongdoers were set; the rents of its stalls went to the upkeep of London Bridge. Mansion House stands on the site today.", { y: 8, range: 700, r: 16 }); }
  // the Jewry
  { const [x, z] = LL(51.5146, -0.0908); for (const [dx, dz] of [[-14, 6], [10, -8]]) { const [hx, hz] = near(51.5146 - dz * 9e-6, -0.0908 + dx * 1.44e-5, 12, 10); addHouse(hx, hz, 8, 11, 0, { wall: "rubble", roof: "shingle", door: "+x" }).noEnter = true; }
    mark("The Jewry", x, z, "known", "The Jewish quarter round Old Jewry and Gresham Street, with its synagogue. Jews came to England with the Conqueror; some built stone houses, safer from fire and from mobs. They were the king's property, taxed at his will; in 1264 hundreds were killed here in riots, in 1275 Edward I forbade them to lend at interest, and in 1278-79 about 300 Jews were hanged in London on charges of clipping coin. In 1290 he will expel all Jews from England.", { y: 10, range: 600, r: 18 }); }
  // the City wall carried west round the Blackfriars, from Ludgate to the Fleet and down towards the Thames: in 1285 still building
  { const pts = [LL(51.5139, -0.1028), LL(51.5137, -0.1046), LL(51.5106, -0.1049)], R = seeded(1282);
    for (let i = 0; i < 2; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 3), ry = Math.atan2(bx - ax, bz - az);
      for (let k = 0; k < n; k++) { const f = (k + 0.5) / n, x = ax + (bx - ax) * f, z = az + (bz - az) * f, gy = groundH(x, z), h = i === 0 || f < 0.45 ? 7.5 : Math.max(1, 7.5 * (1 - (f - 0.45) * 2.4)) + R() * 0.6; put("w:rag", BOX_G, MAT.rag, x, gy - 1.5, z, 2.6, h + 1.5, len / n + 0.05, ry); solid(x, z, 2.6, len / n + 0.2, ry);
        if (i === 1 && f > 0.4 && f < 0.75 && k % 2 === 0) for (const s of [-1, 1]) put("pole", CYL_G, MAT.wood, x + Math.cos(ry) * 2.2 * s, gy, z - Math.sin(ry) * 2.2 * s, 0.15, h + 3, 0.15); } }
    mark("The new wall", ...pts[1], "known", "In 1282 Edward I licensed the archbishop and the Dominicans to pull down the old wall by Ludgate and carry a new one west and south along the Fleet to the Thames, enclosing the Blackfriars' precinct. Here it is half built; it was finished in the 1320s.", { y: 10, range: 800, r: 15 }); }
}

// ---------- London in 1285: Southwark's riverside streets ----------
// Bankside, running west from the bridge foot along the embanked shore, and Tooley Street (St Olave's Street) running east: both lined
// with houses by the 13th century; Bankside with the bishop of Winchester's licensed 'stews' (bathhouses and brothels), regulated by an
// ordinance of 1161. Their line is found here by walking south from the river to dry ground.
if (ERA === 1285) { const shore = lon => { const [x0] = LL(51.505, lon); for (let lat = 51.5100; lat > 51.5000; lat -= 0.00005) { const [x, z] = LL(lat, lon); if (THAMES.side(x, z) > 0 && baseH(x, z) > 1.25) return [lat - 0.00018, lon]; } return [51.5060, lon]; };
  for (const [name, lons] of [["Bankside", [-0.0915, -0.0945, -0.0975, -0.1005]], ["Tooley Street", [-0.0862, -0.0835, -0.0805, -0.0775]]]) { const S = { name, w: 5, L: line(lons.map(shore)) }; STREETS.push(S); rLine(S.L, S.w, 1); }
  { const [x, z] = LL(...shore(-0.0965)); mark("Bankside and the stews", x, z, "known", "Along Bankside, west of the bridge, the bathhouses ('stews') licensed by the bishop of Winchester, whose manor this is: an ordinance of 1161 regulated them, forbidding the keepers to hold women against their will or to open on holy days. Inns, fishermen's houses and the bishop's palace stand along the shore.", { y: 8, range: 900, r: 30 }); } }

// ---------- London in 1285: round about ----------
// Southwark: the priory church of St Mary Overie, rebuilt in Gothic after the fire of 1212 (today Southwark Cathedral); the Bishop of
// Winchester's palace, his London house, by the river; St Thomas's Hospital. Smithfield: the 'smooth field' outside the wall, with its
// Friday horse market, and the priory and hospital of St Bartholomew (founded 1123 by Rahere). Along the Strand, the great men's riverside
// inns: the Savoy (Peter of Savoy's, 1246; now Edmund, earl of Lancaster's) and the bishops' houses. Clerkenwell: the priory of St John
// of Jerusalem, the Knights Hospitallers' English headquarters, with a round church (1185), and the nunnery of St Mary.
if (ERA === 1285) {
  const near = (lat, lon, w, d) => { let [x, z] = LL(lat, lon); for (let r = 0; r < 120; r += 4) for (let a = 0; a < 6.28; a += 0.5) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (rRect(X, Z, w, d, 0, 0, true)) return [X, Z]; } return [x, z]; };
  const hall = (x, z, w, d, h, roofT, name) => { walkHall(x, z, w, d, h, roofT, name); rRect(x, z, d + 10, w + 10, 0, 4); };
  const gothic = (x, z, nl, nw, h, name) => { const gy = groundH(x, z) - 0.3, F = FR(x, z, Math.PI / 2, gy, name); GTINT = [1.4, 1.35, 1.22]; gbox(F, "rubble", 0, h / 2, 0, nw, h, nl); gGableBoth(F, "rubble", nw, nl, h, nw * 0.45); GTINT = [0.62, 0.64, 0.68]; groof(F, "shingle", nw, nl, h, nw * 0.45, { e: 0.4 });
    GTINT = [1.4, 1.35, 1.22]; for (const sx of [-1, 1]) gbox(F, "rubble", sx * (nw / 2 + 3), h * 0.3, 0, 6, h * 0.6, nl - 6); gbox(F, "rubble", 0, h * 0.9, -nl / 2 + 4, 7, h * 1.8, 7); GTINT = [0.62, 0.64, 0.68]; put("cap", CONE4_G, MAT.lead, ...gw(F, 0, h * 1.8, -nl / 2 + 4), 7.4, 6, 7.4);
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let u = -nl / 2 + 8; u < nl / 2 - 2; u += 5) { garch(F, "dark", sx * (nw / 2 + 0.02), h * 0.62, u, 1.6, h * 0.3, [sx, 0, 0]); garch(F, "dark", sx * (nw / 2 + 6.02), 1.5, u, 1.4, h * 0.38, [sx, 0, 0]); } garch(F, "dark", 0, h * 0.3, nl / 2 + 0.02, 3, h * 0.55, [0, 0, 1]);
    solid(x, z, nl, nw + 12, 0); rRect(x, z, nl + 16, nw + 26, 0, 4); };
  { const [x, z] = near(51.5060, -0.0905, 70, 40); gothic(x, z, 60, 11, 18, "overie"); mark("St Mary Overie", x, z, "known", "The church of the Augustinian canons of Southwark, 'St Mary over the river', burned in the great fire of 1212 that swept across London Bridge, and rebuilt since in the new Gothic manner; today it is Southwark Cathedral, and its choir of the 1220s survives.", { y: 26, range: 2000, r: 25 }); }
  { const [x, z] = near(51.5070, -0.0925, 44, 24); hall(x, z, 14, 34, 11, [0.95, 0.6, 0.48], "winch"); mark("Winchester Palace", x, z, "known", "The London house of the bishops of Winchester, built in the 1140s by Bishop Henry of Blois, King Stephen's brother: a great hall by the river with its own wharf, cellars and gardens. The bishop owns this part of Southwark (the 'Liberty of the Clink', after his prison) and licenses its bathhouses.", { y: 16, range: 1200, r: 18 }); }
  for (const [name, lat, lon, text] of [["St Olave's", 51.5052, -0.0850, "The parish church of St Olave, dedicated to the Norwegian king who (the sagas say) pulled down London Bridge in 1014 and was made a saint: Tooley Street is a corruption of 'St Olave's Street'."], ["St George the Martyr", 51.5016, -0.0930, "The parish church at the south end of Borough High Street, where the roads to Canterbury and the south divide; recorded in 1122."], ["St Margaret's, Southwark", 51.5048, -0.0905, "A parish church on Borough High Street; its churchyard and the street before it are the scene of Southwark's market."]]) { const [x, z] = near(lat, lon, 36, 22); addChurch(x, z, { mat: "rag", roof: "shingle", nl: 16, nw: 7, cl: 6, cw: 5, wh: 7 }); mark(name, x, z, "known", text, { y: 14, range: 900 }); }
  { const [x, z] = near(51.4977, -0.0797, 80, 40); gothic(x, z, 56, 11, 16, "bermondsey"); mark("Bermondsey Priory", x, z, "known", "A Cluniac priory founded in 1082 by a London citizen, Alwin Child, on its island in the Bermondsey marshes; rich, with a great Romanesque church, and a royal favourite (Henry II held councils here).", { y: 24, range: 2000, r: 25 }); }
  { const C = MARKS.find(m => m.name === "Winchester Palace"); if (C) mark("The Clink", C.x + 30, C.z + 10, "known", "The bishop of Winchester's prison in his Liberty of Southwark, for those who broke the Liberty's rules: by later centuries 'the Clink' became the word for any prison.", { y: 6, range: 500, r: 10 }); }
  { const [x, z] = near(51.5040, -0.0875, 40, 24); hall(x, z, 10, 30, 7, [0.95, 0.6, 0.48], "stthomas"); mark("St Thomas's Hospital", x, z, "known", "A hospital for the sick poor, run by the canons of St Mary Overie and refounded here after the fire of 1212, dedicated to St Thomas Becket.", { y: 11, range: 800, r: 14 }); }
  { const [x, z] = near(51.5188, -0.1000, 80, 40); gothic(x, z, 50, 10, 15, "barts"); mark("St Bartholomew's Priory", x, z, "known", "Founded in 1123 by Rahere, a courtier of Henry I turned canon, after a vision of St Bartholomew in Rome: a priory of Augustinian canons and, beside it, a hospital for the sick, which still stands as Barts. Its great Norman choir survives as the church of St Bartholomew the Great.", { y: 22, range: 1500, r: 20 }); }
  { const [x, z] = LL(51.5182, -0.1022); rRect(x, z, 120, 80, 0, 4); const R = seeded(1123); for (let k = 0; k < 16; k++) { const px = x + (R() - 0.5) * 80, pz = z + (R() - 0.5) * 50; put("pale", BOX_G, MAT.paleWood, px, groundH(px, pz), pz, 0.2, 1.2, 0.2); put("pale", BOX_G, MAT.paleWood, px, groundH(px, pz) + 0.9, pz + 2, 0.12, 0.12, 4); }
    mark("Smithfield", x, z, "known", "The 'smooth field' outside the wall by Aldersgate and Newgate: every Friday a horse fair, described about 1173 by William FitzStephen, where earls and knights come to buy, and the horses are raced to show their paces; cattle, pigs and sheep are sold here too. Also a place of jousts, and of executions: William Wallace will die here in 1305.", { y: 6, range: 1000, r: 40 }); }
  { const [x, z] = near(51.5105, -0.1205, 60, 40); hall(x, z, 15, 40, 12, [0.62, 0.64, 0.68], "savoy"); mark("The Savoy", x, z, "known", "The riverside palace built by Peter of Savoy, uncle of Queen Eleanor of Provence, on land Henry III gave him in 1246; it now belongs to Edmund Crouchback, earl of Lancaster, the king's brother. Along the Strand between London and Westminster the bishops and great lords have built their London inns, with gardens and water-gates to the river.", { y: 18, range: 1500, r: 20 }); }
  for (const [lat, lon, name] of [[51.5098, -0.1160, "the bishop of Exeter's inn"], [51.5093, -0.1240, "the bishop of Durham's inn"]]) { const [x, z] = near(lat, lon, 40, 24); hall(x, z, 11, 26, 9, [0.95, 0.6, 0.48], "inn"); mark(name[0].toUpperCase() + name.slice(1), x, z, "known", "One of the bishops' London houses along the Strand: a stone hall and chapel round a court, with gardens running down to the river and a water-gate for the bishop's barge.", { y: 13, range: 700, r: 14 }); }
  { const [x, z] = near(51.5225, -0.1030, 60, 40), gy = groundH(x, z) - 0.3, sM = new THREE.MeshStandardMaterial({ map: G_TEX.rubble.clone(), color: 0xd8ccb4, roughness: 0.9 }); sM.map.repeat.set(10, 3); sM.map.needsUpdate = true;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 9, 16).translate(0, 4.5, 0), sM); d.position.set(x - 8, gy, z); scene.add(d); const c = new THREE.Mesh(new THREE.ConeGeometry(8.6, 5, 16).translate(0, 2.5, 0), new THREE.MeshStandardMaterial({ color: 0x8a9096, roughness: 0.55, metalness: 0.25 })); c.position.set(x - 8, gy + 9, z); scene.add(c); solid(x - 8, z, 14, 14, 0);
    hall(x + 10, z, 10, 20, 9, [0.62, 0.64, 0.68], "stjohn"); mark("The Priory of St John, Clerkenwell", x - 8, z, "known", "The English headquarters of the Knights Hospitaller, the Order of St John of Jerusalem, who nurse pilgrims and fight in the Holy Land: a round church consecrated in 1185 by Heraclius, patriarch of Jerusalem (the same week as the Temple), and the prior's great house. Its crypt survives.", { y: 15, range: 1500, r: 20 }); }
  { const [x, z] = near(51.5236, -0.1058, 50, 30); gothic(x, z, 34, 9, 12, "stmary"); mark("St Mary's nunnery, Clerkenwell", x, z, "known", "A priory of Augustinian nuns, founded about 1144 beside the 'clerks' well' where London's parish clerks performed mystery plays.", { y: 18, range: 1000, r: 16 }); }
}

// ---------- technology at work: crafts and machines of each period ----------
// Sites where the tools and machines of the time can be seen working, chosen to show how technology changed between 1066 and 1285:
// the smith's forge (much the same throughout: charcoal hearth, leather bellows, anvil); cloth finished by fullers treading it in troughs
// ('walkers'), and from the 1180s by water-powered fulling mills; the upright warp-weighted loom (clay loomweights are common finds in
// Late Saxon London) giving way to the horizontal treadle loom of the 12th-13th centuries; hand querns at home before the mills took the
// grain; tanners' pits; boats built clinker-fashion on the shore; and on the building sites lime kilns, hoists and scaffolds, with the
// treadwheel crane and the wheelbarrow (a 13th-century arrival in England) by 1285.
const TECH_ANIM = [], OAK_NEW = M(0x9a7a52, { roughness: 0.85 });
{ const site = (lat, lon, w, d, R = 80) => { const [x0, z0] = LL(lat, lon); for (let r = 0; r < R; r += 4) for (let a = 0; a < 6.28; a += 0.45) { const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (baseH(x, z) > 0.9 && rRect(x, z, w + 4, d + 4, 0, 0, true)) { rRect(x, z, w + 4, d + 4, 0, 4); const gy = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, 0]].reduce((a, [u, v]) => a + baseH(x + u, z + v), 0) / 5; flatUnder(FR(x, z, 0, gy), w + 6, d + 6, gy, true); return [x, z]; } } return null; };
  const folk = (role, x, z, tx, tz, kind) => INTERIOR_FOLK.push([role, x, z, tx, tz, kind]);
  const shed = (x, z, w, d, key, roof = "thatch", ry = 0) => { const gy = groundH(x, z), F = FR(x, z, ry, gy, key); GTINT = [0.5, 0.4, 0.3]; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { gbox(F, "oak", sx * (w / 2 - 0.15), 1.5, sz * (d / 2 - 0.15), 0.25, 3, 0.25); const [px, , pz] = gw(F, sx * (w / 2 - 0.15), 0, sz * (d / 2 - 0.15)); solid(px, pz, 0.3, 0.3, 0); }
    GTINT = [1, 1, 1]; gWalls(F, "plank", w, d, 2.8, 0.15, [["+z", 0, w - 0.4, 2.8, []]]); GTINT = [0.95, 0.9, 0.8]; groof(F, roof, w + 0.4, d, 2.9, 1.6, { e: 0.4 }); GTINT = [1, 1, 1]; return F; };
  // the forge
  const forge = (x, z, text) => { const F = shed(x, z, 6, 5, "tech"), gy = F.gy; GTINT = [0.75, 0.72, 0.68]; gbox(F, "rubble", -1.6, 0.45, -1.2, 1.6, 0.9, 1.4); gbox(F, "rubble", -1.6, 1.6, -1.75, 1.2, 1.4, 0.3, ""); GTINT = [1, 1, 1];
    const coal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: 0xff6a20, emissive: 0xff4a10, emissiveIntensity: 1.4 })); const [cx, , cz] = gw(F, -1.6, 0, -1.1); coal.position.set(cx, gy + 0.95, cz); scene.add(coal); TECH_ANIM.push(t => coal.material.emissiveIntensity = 1.0 + 0.5 * Math.abs(Math.sin(t * 2.6)));
    const bel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 1.2).translate(0, 0.25, 0), M(0x5a3a22)); const [bx, , bz] = gw(F, -2.6, 0, -1.0); bel.position.set(bx, gy + 0.8, bz); scene.add(bel); TECH_ANIM.push(t => bel.scale.y = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.6)));
    put("tk:stump", CYL_G, MAT.wood, ...gw(F, 0.6, 0, -0.2), 0.55, 0.6, 0.55); put("tk:anvil", BOX_G, MAT.iron, ...gw(F, 0.6, 0.6, -0.2), 0.28, 0.28, 0.65); put("tk:tub", CYL_G, MAT.wood, ...gw(F, 1.9, 0, -1.4), 0.8, 0.6, 0.8);
    for (let k = 0; k < 6; k++) put("tk:shoe", new THREE.TorusGeometry(0.07, 0.015, 4, 10, Math.PI * 1.4), MAT.iron, ...gw(F, -0.8 + k * 0.32, 1.9, -2.3), 1, 1, 1, 0);
    folk("eng", ...gw(F, 0.6, 0, 0.55).filter((_, i) => i !== 1), ...gw(F, 0.6, 0, -0.2).filter((_, i) => i !== 1), "hammer"); folk("child", ...gw(F, -2.6, 0, -0.1).filter((_, i) => i !== 1), ...gw(F, -2.6, 0, -1.5).filter((_, i) => i !== 1), "hammer");
    mark("A smith's forge", x, z, "typical", text, { y: 5, range: 400, r: 8 }); };
  // fullers treading cloth in troughs, and the tenter frames where it dries stretched on tenterhooks
  const walkers = (x, z) => { const gy = groundH(x, z), F = FR(x, z, 0, gy, "tech"); for (const u of [-1.3, 1.3]) { put("tk:trough", BOX_G, MAT.wood, ...gw(F, u, 0, 0), 1.6, 0.6, 2.4); put("tk:water", BOX_G, M(0x6a7a7a, { roughness: 0.3 }), ...gw(F, u, 0.45, 0), 1.4, 0.1, 2.2); folk("eng", ...gw(F, u, 0.4, 0).filter((_, i) => i !== 1), ...gw(F, u, 0, 3).filter((_, i) => i !== 1), "walk"); }
    for (let k = 0; k < 3; k++) { const v = 4 + k * 2.2; for (const u of [-3.5, 3.5]) put("tk:tenter", BOX_G, MAT.wood, ...gw(F, u, 0, v), 0.12, 1.8, 0.12); put("tk:tenter", BOX_G, MAT.wood, ...gw(F, 0, 1.75, v), 7.2, 0.1, 0.1); put("tk:cloth", BOX_G, M([0x8a2a2a, 0x2a4a7a, 0x6a6a5a][k]), ...gw(F, 0, 0.6, v), 6.8, 1.1, 0.04); }
    mark("Fullers at work", x, z, "known", ERA === 1285 ? "Fulling by foot in the City: woven woollen cloth is trodden in troughs of water with fuller's earth and urine to shrink and thicken it, then stretched on tenter frames to dry square ('on tenterhooks'). Outside London water-driven fulling mills have spread since the 1180s, but the City's fullers and weavers resist them." : "Woven woollen cloth is trodden in troughs of water with fuller's earth and stale urine to shrink, clean and thicken it (the fullers were called 'walkers'), then stretched on tenter frames to dry to size. All by foot and hand: water-powered fulling mills did not reach England until the 1180s.", { y: 4, range: 400, r: 10 }); };
  // a water-powered fulling mill (1285): the wheel turns a shaft whose cams lift two great wooden hammers (stocks) onto the cloth
  const fullingMill = (x, z, ry = 0) => { const F = shed(x, z, 7, 6, "tech", "shingle", ry), gy = F.gy; const W = new THREE.Group(); const wM = MAT.wood; W.add(new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.12, 5, 20), wM)); for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 0.25), wM); sp.rotation.z = k * Math.PI / 8; W.add(sp); const pd = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.6), wM); pd.position.set(Math.cos(k * Math.PI / 4) * 1.95, Math.sin(k * Math.PI / 4) * 1.95, 0); pd.rotation.z = k * Math.PI / 4; W.add(pd); }
    const [wx, , wz] = gw(F, 0, 0, 4.6); W.position.set(wx, gy + 0.6, wz); W.rotation.y = ry; scene.add(W); TECH_ANIM.push(t => W.rotation.z = -t * 0.9);
     put("tk:shaft", CYL_G, MAT.wood, ...gw(F, 0, 1.0, 4.4), 0.25, 5.5, 0.25, ry + Math.PI, Math.PI / 2, 0);
    for (const v of [-1, 1]) { const H = new THREE.Group(), arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.4).translate(0, 0, -1.2), wM), head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.6).translate(0, 0, -2.4), wM); H.add(arm, head); const [hx, , hz] = gw(F, -1 + v * 0.8, 1.6, 1.5); H.position.set(hx, gy + 1.6, hz); scene.add(H); TECH_ANIM.push(t => H.rotation.x = -0.55 * Math.max(0, Math.sin(t * 2.7 + (v > 0 ? 0 : Math.PI)))); }
    put("tk:trough", BOX_G, MAT.wood, ...gw(F, -1, 0, -0.9), 2.2, 0.7, 1.0); put("tk:cloth", BOX_G, M(0x7a6a5a), ...gw(F, -1, 0.65, -0.9), 2.0, 0.12, 0.8);
    folk("eng", ...gw(F, -2.6, 0, -0.3).filter((_, i) => i !== 1), ...gw(F, -1, 0, -0.9).filter((_, i) => i !== 1), "stand");
    mark("A fulling mill", x, z, "known", "A water-powered fulling mill: cams on the wheel's shaft lift two heavy wooden hammers ('stocks') and let them fall on the wet cloth in the trough, doing the work of many men treading it. They appear in England in the 1180s (the Templars had one at Barton-on-Windrush by 1185) and spread through the 13th century, moving the cloth industry toward the fast streams of the countryside.", { y: 6, range: 500, r: 10 }); };
  // looms: the upright warp-weighted loom (1066, 1100) and the horizontal treadle loom (1285)
  const warpLoom = (x, z) => { const gy = groundH(x, z), F = FR(x, z, 0, gy, "tech"); for (const u of [-0.9, 0.9]) put("tk:loom", BOX_G, MAT.wood, ...gw(F, u, 0, 0), 0.1, 2.3, 0.1, 0, 0.18); put("tk:loom", BOX_G, MAT.wood, ...gw(F, 0, 2.15, -0.2), 2.0, 0.12, 0.12);
    put("tk:warp", BOX_G, M(0xe0d4b8), ...gw(F, 0, 0.6, -0.08), 1.7, 1.5, 0.02, 0, 0.18); put("tk:web", BOX_G, M(0x8a2a2a), ...gw(F, 0, 1.55, -0.18), 1.7, 0.55, 0.03, 0, 0.18); for (let k = 0; k < 10; k++) put("tk:weight", new THREE.SphereGeometry(0.06, 6, 4), M(0x8a6a4a), ...gw(F, -0.75 + k * 0.17, 0.42, 0.06), 1, 1, 1);
    folk("woman", ...gw(F, 0, 0, 0.9).filter((_, i) => i !== 1), x, z, "sell");
    mark("A warp-weighted loom", x, z, "known", "The upright loom of Anglo-Saxon England: the warp threads hang from a top beam, held taut by rings of baked clay (loomweights, found by the hundred in Late Saxon London), and the weaver works standing, beating the weft upward. Weaving was women's work at home. By the 13th century it had been replaced by the horizontal treadle loom.", { y: 3, range: 300, r: 6 }); };
  const treadleLoom = (x, z) => { const F = shed(x, z, 5, 4, "tech", "shingle"), gy = F.gy; for (const [u, v] of [[-1.1, -0.9], [1.1, -0.9], [-1.1, 0.9], [1.1, 0.9]]) put("tk:loom", BOX_G, MAT.wood, ...gw(F, u, 0, v), 0.12, 1.7, 0.12); for (const v of [-0.9, 0.9]) put("tk:loom", BOX_G, MAT.wood, ...gw(F, 0, 0.9, v), 2.4, 0.12, 0.14);
    put("tk:warp", BOX_G, M(0xe0d4b8), ...gw(F, 0, 0.92, 0), 2.1, 0.02, 1.7); put("tk:web", BOX_G, M(0x2a4a7a), ...gw(F, 0, 0.94, 0.6), 2.1, 0.03, 0.5); put("tk:heddle", BOX_G, MAT.wood, ...gw(F, 0, 1.6, 0), 2.2, 0.4, 0.06); for (const u of [-0.4, 0.4]) put("tk:treadle", BOX_G, MAT.wood, ...gw(F, u, 0.08, 0.3), 0.12, 0.05, 1.2);
    for (const u of [-0.6, 0.6]) folk("eng", ...gw(F, u, 0, 1.45).filter((_, i) => i !== 1), ...gw(F, u, 0, 0).filter((_, i) => i !== 1), "sit");
    mark("A treadle loom", x, z, "known", "The horizontal treadle loom: the weavers sit, working the heddles with their feet to open the shed and passing the shuttle by hand, much faster than the old upright loom; a broadloom like this takes two men. Weaving has become men's work in a guild: the London Weavers had a royal charter by 1155, and Flemish weavers set the pace in fine cloth.", { y: 4, range: 300, r: 6 }); };
  // a hand quern (1066, 1100): two round stones, the upper turned by a peg handle
  const quern = (x, z) => { const gy = groundH(x, z); put("tk:quern", CYL_G, M(0x8a8478), x, gy, z, 0.6, 0.18, 0.6); put("tk:quern", CYL_G, M(0x9a9488), x, gy + 0.18, z, 0.56, 0.14, 0.56); put("tk:quern", CYL_G, MAT.wood, x + 0.2, gy + 0.32, z, 0.04, 0.2, 0.04); folk("woman", x, z + 0.75, x, z, "sell");
    mark("A hand quern", x, z, "typical", "Grinding corn at home on a rotary quern: the upper stone, turned by a peg, grinds the grain against the lower. Hours of work every day for the women of a household; where a lord had a mill, he could forbid querns and make his tenants pay to grind at his mill.", { y: 2.5, range: 200, r: 5 }); };
  // tanners' pits
  const tannery = (x, z) => { const gy = groundH(x, z), F = FR(x, z, 0, gy, "tech"); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const [px, , pz] = gw(F, -3 + i * 3, 0, -1.6 + j * 3.2); put("tk:pit", BOX_G, M(0x4a3a24, { roughness: 0.4 }), px, gy - 0.25, pz, 2.2, 0.3, 2.4); put("tk:pitrim", BOX_G, MAT.wood, px, gy - 0.05, pz, 2.5, 0.12, 2.7); }
    for (let k = 0; k < 4; k++) { put("tk:rack", BOX_G, MAT.wood, ...gw(F, 6, 0, -3 + k * 2), 0.1, 2, 0.1); } put("tk:rack", BOX_G, MAT.wood, ...gw(F, 6, 1.9, 0), 0.1, 0.1, 7); for (let k = 0; k < 3; k++) put("tk:hide", BOX_G, M(0x9a7a5a), ...gw(F, 6, 1.1, -2 + k * 2), 0.05, 1.5, 1.4);
    folk("eng", ...gw(F, -1.6, 0, 0).filter((_, i) => i !== 1), ...gw(F, -3, 0, -1.6).filter((_, i) => i !== 1), "hammer"); folk("eng", ...gw(F, 4.5, 0, 0.5).filter((_, i) => i !== 1), ...gw(F, 6, 0, 0).filter((_, i) => i !== 1), "stand");
    mark("Tanners' pits", x, z, "typical", "Hides soaked in lime to loosen the hair, scraped on a beam, then laid for months in pits of water and crushed oak bark, whose tannin turns skin to leather. The stink kept tanners to the edges of towns and the banks of streams like the Fleet.", { y: 3, range: 400, r: 10 }); };
  // a boat on the stocks: a clinker hull of overlapping planks riveted together, the frames inserted after the shell (1066), or a cog (1285)
  const shipyard = (x, z, ry) => { const gy = Math.max(groundH(x, z), 0.3), cog = ERA === 1285, len = cog ? 18 : 14, B = len * (cog ? 0.32 : 0.24), D = cog ? 2.4 : 1.4;
    for (let k = -3; k <= 3; k++) put("tk:stock", BOX_G, MAT.wood, x + Math.sin(ry) * k * len * 0.14, gy, z + Math.cos(ry) * k * len * 0.14, B * 0.6, 0.6, 0.35, ry);
    put(cog ? "tk:cog" : "tk:hull", cog ? COG_G : BOAT_G, OAK_NEW, x, gy + 0.6, z, B, D * 0.6, len, ry); for (let k = -4; k <= 4; k++) for (const s of [-1, 1]) put("tk:frame", BOX_G, MAT.wood, x + Math.sin(ry) * k * len * 0.1 + Math.cos(ry) * s * B * 0.45, gy + 0.6, z + Math.cos(ry) * k * len * 0.1 - Math.sin(ry) * s * B * 0.45, 0.14, D * 0.75, 0.18, ry);
    for (let k = 0; k < 6; k++) put("tk:plank", BOX_G, MAT.wood, x + Math.cos(ry) * (B + 2.5), gy + k * 0.12, z - Math.sin(ry) * (B + 2.5), 0.4, 0.1, len * 0.7, ry);
    for (const s of [-1, 1]) folk("eng", x + Math.cos(ry) * s * (B * 0.5 + 0.9), z - Math.sin(ry) * s * (B * 0.5 + 0.9), x, z, "hammer");
    mark(cog ? "A cog on the stocks" : "A boat on the stocks", x, z, "known", cog ? "Shipwrights building a cog: the flat bottom laid first, then the high sides of overlapping planks clenched with iron nails; a stern rudder will hang on the straight sternpost, and castles will be built at bow and stern. Cogs carry far more than the old keels." : "Shipwrights building a clinker boat in the northern way: the shell of overlapping oak planks is built up first, fastened with iron rivets clenched over roves, and the frames are fitted inside afterwards. Planks were split from logs with axes and wedges, not sawn.", { y: 5, range: 500, r: 12 }); };
  // the building site's lime kiln and mortar, a windlass hoist; and by 1285 the treadwheel crane and wheelbarrows
  const limeKiln = (x, z) => { const gy = groundH(x, z); put("tk:kiln", CYL_G, MAT.rag, x, gy - 0.2, z, 4, 3, 4); put("tk:kilnmouth", BOX_G, MAT.dark, x + 2.02, gy + 0.2, z, 0.1, 0.9, 0.8); const sm = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 8, 1, true).translate(0, 1.5, 0), new THREE.MeshBasicMaterial({ color: 0xd8d4cc, transparent: true, opacity: 0.35, depthWrite: false })); sm.position.set(x, gy + 2.8, z); scene.add(sm); TECH_ANIM.push(t => { sm.scale.set(1 + 0.15 * Math.sin(t), 1 + 0.2 * Math.sin(t * 0.7), 1 + 0.15 * Math.sin(t)); });
    put("tk:mortar", CYL_G, M(0xd8d4c8), x - 4, gy - 0.25, z + 1, 2.4, 0.3, 2.4); folk("eng", x - 4, z - 0.4, x - 4, z + 1, "hammer"); solid(x, z, 3.6, 3.6, 0);
    mark("A lime kiln", x, z, "known", "Chalk or limestone burned for days in the kiln becomes quicklime; slaked with water and mixed with sand it makes the lime mortar that binds the masonry. Every great building site had its kilns.", { y: 5, range: 400, r: 8 }); };
  const wheelbarrow = (x, z, ry) => { const gy = groundH(x, z); put("tk:barrow", BOX_G, MAT.wood, x, gy + 0.35, z, 0.6, 0.3, 0.9, ry); put("tk:barrowwheel", CYL_G, MAT.wood, x + Math.sin(ry) * 0.55, gy + 0.05, z + Math.cos(ry) * 0.55, 0.35, 0.08, 0.35, ry, 0, Math.PI / 2); for (const s of [-1, 1]) put("tk:barrowarm", BOX_G, MAT.wood, x - Math.sin(ry) * 0.6 + Math.cos(ry) * s * 0.25, gy + 0.4, z - Math.cos(ry) * 0.6 - Math.sin(ry) * s * 0.25, 0.05, 0.05, 0.8, ry); };
  const treadCrane = (x, y, z, ry) => { const W = new THREE.Group(), wM = MAT.wood; for (const s of [-0.6, 0.6]) { const r = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.1, 5, 22), wM); r.position.z = s; W.add(r); } for (let k = 0; k < 12; k++) { const rung = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.3), wM); rung.position.set(Math.cos(k / 12 * 6.28) * 2.2, Math.sin(k / 12 * 6.28) * 2.2, 0); W.add(rung); }
    W.position.set(x, y + 2.4, z); W.rotation.y = ry; scene.add(W); TECH_ANIM.push(t => W.rotation.z = Math.sin(t * 0.2) * 1.5);
    put("tk:craneframe", BOX_G, wM, x, y, z, 0.3, 4.8, 0.3); put("tk:cranejib", BOX_G, wM, x + Math.cos(ry) * 3, y + 5, z - Math.sin(ry) * 3, 0.3, 0.3, 7, ry + Math.PI / 2); put("tk:craneblock", BOX_G, AMAT.ashlar, x + Math.cos(ry) * 6.2, y + 2.6, z - Math.sin(ry) * 6.2, 0.8, 0.5, 0.6); put("tk:rope", BOX_G, MAT.iron, x + Math.cos(ry) * 6.2, y + 3.1, z - Math.sin(ry) * 6.2, 0.03, 1.9, 0.03);
    mark("A treadwheel crane", x, z, "known", "On top of the rising walls, a great wheel turned by men walking inside it winds the rope that lifts dressed stones up to the masons. Treadwheel cranes made the Gothic cathedrals possible; one survives at Canterbury and others in the roofs of Salisbury and Beverley.", { y: y + 7, range: 700, r: 10 }); };

  if (ERA === 1066 || ERA === 1100) {
    for (const [lat, lon] of [[51.5022, -0.1268], [51.5136, -0.1046]]) { const p = site(lat, lon, 8, 7); if (p) forge(p[0], p[1], "The smith's forge: a charcoal fire on a raised stone hearth, blown hot by leather bellows worked by a boy; the iron, smelted in bloomeries in the Weald or the Forest of Dean, is hammered out on the anvil into knives, nails, tools, and horseshoes, which were nailed on in England by the 11th century."); }
    { const p = site(51.5150, -0.0890, 10, 12); if (p) walkers(p[0], p[1]); }
    { const p = site(51.5124, -0.0925, 4, 4); if (p) warpLoom(p[0], p[1]); }
    { const p = site(51.5018, -0.1262, 3, 3); if (p) quern(p[0], p[1]); }
  }
  if (ERA === 1285) {
    for (const [lat, lon, t] of [[51.5174, -0.1012, "Farriers at Smithfield, beside the horse market: a charcoal hearth blown by leather bellows, the anvil, horseshoes hung ready. Iron now comes from the Weald and the Forest of Dean, and from Spain by sea; London's smiths, farriers and armourers are among its busiest trades."], [51.5150, -0.0985, "A smith's forge by Newgate: charcoal hearth, leather bellows, anvil and quenching tub, much as two centuries before. Water-powered hammers and blast furnaces are still to come (14th-15th centuries)."]]) { const p = site(lat, lon, 8, 7); if (p) forge(p[0], p[1], t); }
    { const p = site(51.5150, -0.0890, 10, 12); if (p) walkers(p[0], p[1]); }
    { let best = null; for (let s = 0; s < FLEET.L && !best; s += 6) { const [fx, fz, a] = FLEET.at(s); if (fz > LL(51.5185, 0)[1]) continue; for (const sg of [-1, 1]) { const nx = Math.cos(a) * sg, nz = -Math.sin(a) * sg, x = fx + nx * 9, z = fz + nz * 9; if (baseH(x, z) > 0.9 && rRect(x, z, 13, 12, 0, 0, true)) { best = [x, z, Math.atan2(-nx, -nz)]; break; } } }
      if (best) { rRect(best[0], best[1], 13, 12, 0, 4); fullingMill(best[0], best[1], best[2]); } }
    { const p = site(51.5126, -0.0925, 6, 5); if (p) treadleLoom(p[0], p[1]); }
  }
  { const p = site(51.5170, -0.1062, 14, 10); if (p) tannery(p[0], p[1]); }
  { let found = null; for (const lon of [-0.0790, -0.0810, -0.0830]) { if (found) break; for (let lat = 51.5100; lat > 51.5000; lat -= 0.00005) { const [x, z] = LL(lat, lon); if (THAMES.side(x, z) > 0 && baseH(x, z) > 0.9) { const [x2, z2] = LL(lat - 0.00012, lon); if (rRect(x2, z2, 26, 14, 0, 0, true)) { rRect(x2, z2, 26, 14, 0, 4); found = [x2, z2]; } break; } } } if (found) shipyard(found[0], found[1], Math.PI / 2); }
  if (ERA === 1066) { const p = site(51.4997, -0.1310, 8, 8, 60); if (p) limeKiln(p[0], p[1]); }
  if (ERA === 1100) { const [x, z] = LL(51.5138, -0.0985); limeKiln(x - 60, z + 40); }
  if (ERA === 1285) { const [Cx, Cz] = LL(51.5138, -0.0987); limeKiln(Cx + 100, Cz + 50); for (let k = 0; k < 4; k++) wheelbarrow(Cx + 80 + k * 3, Cz + 40 + (k % 2) * 2, 0.4 + k);
    treadCrane(Cx + 76, groundH(Cx + 76, Cz + 14) + 13, Cz + 14, Math.PI);
    { const lx = Cx + 70, lz = Cz - 52, F = shed(lx, lz, 10, 6, "tech", "shingle"); for (const u of [-3, 0, 3]) { put("tk:banker", BOX_G, AMAT.ashlar, ...gw(F, u, 0, 0.5), 1.2, 0.9, 0.8); put("tk:stone", BOX_G, AMAT.ashlar, ...gw(F, u, 0.9, 0.5), 0.8, 0.45, 0.5); folk("eng", ...gw(F, u, 0, 1.4).filter((_, i) => i !== 1), ...gw(F, u, 0, 0.5).filter((_, i) => i !== 1), "hammer"); }
      mark("The masons' lodge", lx, lz, "known", "The masons' workshop by the cathedral: banker masons shape blocks of Caen and Reigate stone on stone benches, following full-size templates cut in thin boards from the master mason's drawings, scratched out on a plaster tracing floor. The master here is building the New Work's tall Gothic windows.", { y: 5, range: 400, r: 10 }); }
    mark("A clock for St Paul's", Cx - 3, Cz + 8, "known", "In 1286 the cathedral's accounts pay one Bartholomew, 'orologiarius', to look after the clock: one of the first mechanical clocks recorded in England, driven by falling weights and striking the hours on a bell, instead of the water clocks and sundials of the past.", { y: 30, range: 300, r: 10 }); }
}

// ---------- markers: what things are, and how well we know them ----------
// tag: "known" (from excavation or written record), "inferred" (the place is known, the form is a reasoned guess),
// "typical" (a stand-in for the kind of thing that stood there), "absent" (famous things that do not exist yet), "person".

// ---------- churches ----------
function findFree(x, z, w, d, ry = 0) { for (let r = 0; r < 60; r += 3) for (let a = 0; a < 6.28; a += r ? 0.7 : 7) { const X = x + Math.cos(a) * r, Z = z + Math.sin(a) * r; if (rRect(X, Z, w, d, ry, 0, true)) return [X, Z]; } return [x, z]; }
if (ERA === 1066) { // St Paul's: its site on Ludgate Hill is certain, its form unknown. Shown as a Late Saxon great church, with features of those that survive
  // or have been excavated: Canterbury's Anglo-Saxon cathedral (aisled nave, apse; excavated 1993), the westwork tower of Winchester Old
  // Minster, side chapels (porticus) as at Deerhurst and Brixworth, pilaster strips and long-and-short quoins as at Earls Barton, small
  // round- and triangular-headed openings, and walls rendered and limewashed.
  const [x, z] = LL(51.5138, -0.0985), gy = groundH(x, z) - 0.3; rRect(x, z, 150, 96, 0, 4);
  const NF = FR(x, z, Math.PI / 2, gy), lime = [1.32, 1.3, 1.24], dress = [1.22, 1.18, 1.1];
  const gtri = (F, cx, y0, cz, w, h, out) => { const along = out[0] ? [0, 0, 1] : [1, 0, 0], P = (u, y) => [cx + along[0] * u + out[0] * 0.03, y, cz + along[2] * u + out[2] * 0.03], r = w / 2, ys = y0 + h - r;
    gpoly(F, "dark", [P(-r, y0), P(r, y0), P(r, ys), P(-r, ys)], [[0, 0], [1, 0], [1, 1], [0, 1]], out); gpoly(F, "dark", [P(-r, ys), P(r, ys), P(0, y0 + h)], [[0, 0], [1, 0], [0.5, 1]], out); };
  // walk-in: an aisled nave (arcades of square piers carrying the clerestory), a north door, the west door through the tower, the chancel and apse
  GTINT = lime; gWalls(NF, "daub", 18, 40, 7, 0.7, [["+x", -12, 1.6, 2.9], ["-z", 0, 1.8, 3.4], ["+z", 0, 7.6, 6.2, [[6.2, 7]]]]);
  for (const sx of [-1, 1]) { gbox(NF, "daub", sx * 4.5, 10, 0, 0.8, 6, 40, ""); for (let zz = -16; zz <= 16; zz += 4) { gbox(NF, "daub", sx * 4.5, 3.5, zz, 1.0, 7, 1.0, "b"); const [px, , pz] = gw(NF, sx * 4.5, 0, zz); solid(px, pz, 1.0, 1.0, Math.PI / 2); } }   // the clerestory walls on their piers
  for (const sz of [-1, 1]) gbox(NF, "daub", 0, sz > 0 ? 9.6 : 10, sz * 20, 8.2, sz > 0 ? 6.8 : 6, 0.7, "");   // the central vessel's end walls above the aisles
  GTINT = [0.9, 0.9, 0.9]; for (const sx of [-1, 1]) { gpoly(NF, "shingle", [[sx * 9.3, 7.2, -20.2], [sx * 9.3, 7.2, 20.2], [sx * 4.9, 9.7, 20.2], [sx * 4.9, 9.7, -20.2]], [[0, 0], [40, 0], [40, 5], [0, 5]], [sx, 1, 0]); gpoly(NF, "plank", [[sx * 9, 6.95, -20], [sx * 9, 6.95, 20], [sx * 4.9, 9.4, 20], [sx * 4.9, 9.4, -20]], [[0, 0], [40, 0], [40, 5], [0, 5]], [0, -1, 0]); }
  groof(NF, "shingle", 9, 40, 13, 5, { e: 0.4, g: 0.3, under: "plank" }); gGableBoth(NF, "daub", 9, 40, 13, 5);
  GTINT = [1, 1, 1]; for (const sx of [-1, 1]) for (let zz = -14; zz <= 14; zz += 4) { garch(NF, "dark", sx * 4.92, 10.2, zz, 0.6, 1.5, [sx, 0, 0]); garch(NF, "dark", sx * 9.38, 3.2, zz, 0.5, 1.3, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; garch(NF, "plain", sx * 4.08, 10.2, zz, 0.6, 1.5, [-sx, 0, 0]); garch(NF, "plain", sx * 8.63, 3.2, zz, 0.5, 1.3, [-sx, 0, 0]); GTINT = [1, 1, 1]; }
  GTINT = dress; for (const sx of [-1, 1]) for (let zz = -18; zz <= 18; zz += 4) gbox(NF, "rubble", sx * 4.95, 10.0, zz, 0.1, 6, 0.32, "bt");   // pilaster strips outside
  GTINT = [0.75, 0.72, 0.68]; gpoly(NF, "rush", [[-9, 0.33, -20], [9, 0.33, -20], [9, 0.33, 20], [-9, 0.33, 20]], [[0, 0], [18, 0], [18, 40], [0, 40]], [0, 1, 0]);
  GTINT = [0.9, 0.3, 0.22]; for (const sx of [-1, 1]) gpoly(NF, "plain", [[sx * 4.08, 8.2, -20], [sx * 4.08, 8.2, 20], [sx * 4.08, 8.6, 20], [sx * 4.08, 8.6, -20]], [[0, 0], [1, 0], [1, 1], [0, 1]], [-sx, 0, 0]);   // a painted band along the clerestory
  for (const sx of [-1, 1]) { const [px, , pz] = gw(NF, sx * 12, 0, 14), PF = FR(px, pz, 0, gy, NF.key); GTINT = lime; gbox(PF, "daub", 0, 3.5, 0, 6, 7, 6); GTINT = [0.9, 0.9, 0.9]; groof(PF, "shingle", 6, 6, 7, 3.5, { e: 0.3 });   // side chapels
    GTINT = [1, 1, 1]; garch(PF, "dark", 0, 3, -3 * sx, 0.5, 1.3, [0, 0, -sx]); solid(px, pz, 6, 6, 0); }
  { const [cx, , cz] = gw(NF, 0, 0, 26), CF = FR(cx, cz, Math.PI / 2, gy, NF.key); GTINT = lime; gWalls(CF, "daub", 9, 12, 11, 0.7, [["-z", 0, 9.8, 0, []], ["+z", 0, 8.2, 0, []]]); gGableBoth(CF, "daub", 9, 12, 11, 4.5); GTINT = [0.9, 0.9, 0.9]; groof(CF, "shingle", 9, 12, 11, 4.5, { e: 0.35, under: "plank" });   // the chancel
    GTINT = [1, 1, 1]; for (const sx of [-1, 1]) { garch(CF, "dark", sx * 4.85, 6, 0, 0.55, 1.5, [sx, 0, 0]); GTINT = [1.7, 1.7, 1.75]; garch(CF, "plain", sx * 4.15, 6, 0, 0.55, 1.5, [-sx, 0, 0]); GTINT = [1, 1, 1]; }
    GTINT = [0.75, 0.72, 0.68]; gpoly(CF, "rush", [[-4.5, 0.36, -6], [4.5, 0.36, -6], [4.5, 0.36, 7.5], [-4.5, 0.36, 7.5]], [[0, 0], [9, 0], [9, 13], [0, 13]], [0, 1, 0]);
    GTINT = [1.1, 1.08, 1.02]; gbox(CF, "rubble", 0, 0.85, 3.6, 2.2, 1.0, 1.0, "b"); GTINT = [1, 0.85, 0.4]; gbox(CF, "plain", 0, 0.85, 3.08, 2.0, 0.9, 0.04, ""); GTINT = [1.4, 1.38, 1.32]; gbox(CF, "plain", 0, 1.37, 3.6, 2.3, 0.04, 1.1, "b");   // the high altar, a gilded frontal
    GTINT = [1, 0.85, 0.4]; gbox(CF, "plain", 0, 1.8, 3.9, 0.07, 0.8, 0.07, ""); gbox(CF, "plain", 0, 2.0, 3.9, 0.45, 0.07, 0.07, ""); GTINT = [0.6, 0.45, 0.3]; gbox(CF, "oak", 0, 0.9, 7.6, 1.0, 1.6, 0.6, "b");   // cross; the bishop's chair (cathedra) in the apse
    for (const sx of [-0.8, 0.8]) { const [px, , pz] = gw(CF, sx, 0, 3.6); put("candle", CYL_G, M(0xe8e0c8), px, gy + 1.39, pz, 0.05, 0.3, 0.05); put("flame", FLAME_G, flameM, px, gy + 1.7, pz, 1.4, 1.4, 1.4); }
    const [ax, , az] = gw(NF, 0, 0, 32); GTINT = lime; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k + 0.5) / 7 * Math.PI, sxp = ax + Math.cos(a) * 4.1, szp = az + Math.sin(a) * 4.1, SF = FR(sxp, szp, -a, gy, NF.key); gbox(SF, "daub", 0, 4.5, 0, 0.8, 9, 2.0); solid(sxp, szp, 0.8, 2.0, -a); if (k === 3) { GTINT = [1, 1, 1]; garch(SF, "dark", 0.42, 4.5, 0, 0.5, 1.4, [1, 0, 0]); GTINT = lime; } }
    put("spapse", new THREE.ConeGeometry(4.8, 4, 10, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ map: shingleT, roughness: 0.95, side: THREE.DoubleSide }), ax, gy + 9 + 2, az, 1, 1, 1);
    ZONES.push({ name: "church", F: CF, w: 8.3, d: 11.3, light: [0, 6, 2], doors: [] }); }
  { const [tx, , tz] = gw(NF, 0, 0, -25), TF = FR(tx, tz, Math.PI / 2, gy, NF.key), H = 28; GTINT = lime; gWalls(TF, "daub", 10, 10, H, 1.0, [["-z", 0, 1.8, 3.4], ["+z", 0, 1.8, 3.4]]); gbox(TF, "plank", 0, 6, 0, 9, 0.2, 9, "");   // the west tower, its ground floor a porch
    GTINT = dress; for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let y = 0; y < H - 1; y += 1.5) { gbox(TF, "rubble", sx * 5, y + 0.6, sz * 5, 0.42, 1.2, 0.42, ""); gbox(TF, "rubble", sx * 4.75, y + 1.32, sz * 4.75, 0.95, 0.24, 0.95, ""); }   // long-and-short quoins
    for (const [ox, oz, o] of [[5.5, 0, [1, 0, 0]], [-5.5, 0, [-1, 0, 0]], [0, 5.5, [0, 0, 1]], [0, -5.5, [0, 0, -1]]]) { const strip = (u, y0, y1) => gbox(TF, "rubble", ox + (o[2] ? u : 0) + o[0] * 0.05, (y0 + y1) / 2, oz + (o[0] ? u : 0) + o[2] * 0.05, o[0] ? 0.1 : 0.3, y1 - y0, o[0] ? 0.3 : 0.1, "bt");
      GTINT = dress; for (const u of [-2.6, 2.6]) strip(u, 1.5, 19.5); for (const y of [10, 19.6]) gbox(TF, "rubble", ox + o[0] * 0.06, y, oz + o[2] * 0.06, o[0] ? 0.12 : 10, 0.25, o[0] ? 10 : 0.12, "");
      GTINT = [1, 1, 1]; gtri(TF, ox, 13, oz, 0.7, 1.9, o); for (const u of [-1.0, 1.0]) garch(TF, "dark", ox + (o[2] ? u : 0), 22, oz + (o[0] ? u : 0), 1.3, 2.6, o);
      GTINT = dress; gbox(TF, "rubble", ox + o[0] * 0.12, 23.2, oz + o[2] * 0.12, o[0] ? 0.25 : 0.32, 2.4, o[0] ? 0.32 : 0.25, ""); }
    GTINT = [1, 1, 1]; put("cap", CONE4_G, MAT.shingle, tx, gy + H, tz, 11, 5, 11); put("vane", CYL_G, MAT.iron, tx, gy + H + 5, tz, 0.08, 2, 0.08); put("vane", BOX_G, new THREE.MeshStandardMaterial({ color: 0xd8b04a, metalness: 0.8, roughness: 0.3 }), tx, gy + H + 6.6, tz, 1.0, 0.6, 0.1); ZONES.push({ name: "church", F: TF, w: 9, d: 9, light: [0, 2.5, 0], doors: [[0, -5]] }); }   // with a gilded weathercock (Winchester's is described in a 10th-century poem)
  // inside, richly furnished as the great English churches were: a painted frieze of saints along the clerestory, painted plaster in the aisles,
  // the great rood over the chancel arch, hanging crown-shaped lamps, embroidered hangings, some coloured glass, and St Erkenwald's shrine
  { const saintsT = tex(1024, 256, (g, w, h) => { g.fillStyle = "#1e3260"; g.fillRect(0, 0, w, h); g.fillStyle = "#c8a040"; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 30, w, 30); g.fillStyle = "#8a2a20"; g.fillRect(0, h - 22, w, 14);
      for (let k = 0; k < 8; k++) { const x = 64 + k * 128; g.strokeStyle = "#c8a040"; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 54, h - 30); g.lineTo(x - 54, 80); g.arc(x, 80, 54, Math.PI, 0); g.lineTo(x + 54, h - 30); g.stroke();   // a saint under each arch
        g.fillStyle = "#d8b048"; g.beginPath(); g.arc(x, 74, 20, 0, 6.283); g.fill(); g.fillStyle = "#e0b898"; g.beginPath(); g.arc(x, 76, 13, 0, 6.283); g.fill();
        g.fillStyle = ["#8a2a24", "#3a6a3a", "#e8e0c8", "#6a3a6a"][k % 4]; g.beginPath(); g.moveTo(x - 12, 92); g.lineTo(x + 12, 92); g.lineTo(x + 26, h - 34); g.lineTo(x - 26, h - 34); g.fill();
        g.fillStyle = ["#c8a040", "#2a4a8a", "#8a2a24", "#3a6a3a"][k % 4]; g.beginPath(); g.moveTo(x - 10, 96); g.lineTo(x + 22, h - 60); g.lineTo(x - 4, h - 52); g.fill(); g.fillStyle = "#e8e0c8"; g.fillRect(x - 6 + (k % 2 ? 10 : -14), 120, 12, 16); } });
    const saintsM = new THREE.MeshStandardMaterial({ map: saintsT, roughness: 0.9, side: THREE.DoubleSide }), glassM = new THREE.MeshBasicMaterial({ color: 0x9ab0c8, side: THREE.DoubleSide }), goldM = M(0xe0b850, { metalness: 0.3, roughness: 0.35, emissive: 0x3a2808 });   // gilding that still reads in candlelight
    const wallPlane = (mat, lx, ly, lz, w, h, n, F = NF) => { const [x2, , z2] = gw(F, lx, 0, lz), nx = n[0] * F.c + n[2] * F.s, nz = -n[0] * F.s + n[2] * F.c, m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x2, gy + ly, z2); m.rotation.y = Math.atan2(nx, nz); scene.add(m); return m; };
    for (const sx of [-1, 1]) { wallPlane(saintsM, sx * 4.085, 11.6, 0, 38.6, 2.0, [-sx, 0, 0]); for (let zz = -18; zz <= 18; zz += 4) wallPlane(AMAT.paint, sx * 8.635, 3.6, zz, 3.6, 6.4, [-sx, 0, 0]); }   // (the frieze above the windows' light; painted plaster in the aisles)
    for (const sx of [-1, 1]) for (let zz = -14; zz <= 14; zz += 8) wallPlane(new THREE.MeshBasicMaterial({ color: [0x8aa0c8, 0xc8a870, 0xa87a7a][(zz + 14) / 8 % 3 | 0], side: THREE.DoubleSide }), sx * 4.07, 10.95, zz, 0.5, 1.4, [-sx, 0, 0]);   // a few windows of coloured glass
    GTINT = [0.45, 0.32, 0.2]; gbox(NF, "oak", 0, 6.0, 19.4, 8.2, 0.35, 0.35, ""); GTINT = [1, 0.82, 0.4]; gbox(NF, "plain", 0, 7.4, 19.4, 0.22, 2.6, 0.12, ""); gbox(NF, "plain", 0, 8.0, 19.4, 1.5, 0.2, 0.12, "");   // the rood beam and the gilded cross
    GTINT = [1.3, 1.25, 1.2]; gbox(NF, "plain", 0, 7.3, 19.32, 0.3, 1.0, 0.1, ""); gbox(NF, "plain", 0, 8.0, 19.32, 1.2, 0.18, 0.1, ""); GTINT = [1, 0.8, 0.35]; gbox(NF, "plain", 0, 8.95, 19.32, 0.32, 0.32, 0.08, "");   // Christ, crowned
    for (const sx of [-1, 1]) { GTINT = sx < 0 ? [0.25, 0.35, 0.7] : [0.7, 0.25, 0.22]; gbox(NF, "plain", sx * 2.2, 6.95, 19.4, 0.45, 1.5, 0.4, ""); GTINT = [1.2, 1.0, 0.85]; gbox(NF, "plain", sx * 2.2, 7.85, 19.4, 0.3, 0.3, 0.3, ""); }   // Mary and John
    GTINT = [1, 1, 1];
    for (const zz of [-12, -2, 8]) { const [cx2, , cz2] = gw(NF, 0, 0, zz); put("corona", new THREE.TorusGeometry(0.9, 0.04, 4, 16).rotateX(Math.PI / 2), MAT.iron, cx2, gy + 6.5, cz2, 1.3, 1.3, 1.3); put("chain", CYL_G, MAT.iron, cx2, gy + 6.5, cz2, 0.03, 6.5, 0.03);
      for (let q = 0; q < 8; q++) put("flame", FLAME_G, flameM, cx2 + Math.cos(q * 0.785) * 1.17, gy + 6.53, cz2 + Math.sin(q * 0.785) * 1.17, 1.5, 1.5, 1.5); }   // crown-shaped lamps hung in the nave
    const [chx, , chz] = gw(NF, 0, 0, 26), CF2 = FR(chx, chz, Math.PI / 2, gy, NF.key);
    for (const sx of [-1, 1]) wallPlane(AMAT.silk, sx * 4.13, 2.6, 0.5, 6.5, 3.4, [-sx, 0, 0], CF2);   // embroidered hangings either side of the altar
    { const [sx2, , sz2] = gw(CF2, -2.6, 0, -1.5); const shrine = new THREE.Group(); const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.0).translate(0, 0.5, 0), AMAT.ashlar); shrine.add(base);   // St Erkenwald's shrine
      for (const ax of [-0.8, 0, 0.8]) { const arch = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.6), MAT.dark); arch.position.set(ax, 0.42, 0.51); shrine.add(arch); }   // openings where pilgrims reached in toward the saint
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.6).translate(0, 1.28, 0), goldM), roof = new THREE.Mesh(GABLE_G, goldM); roof.scale.set(0.6, 0.4, 1.6); roof.rotation.y = Math.PI / 2; roof.position.y = 1.55; shrine.add(body, roof);
      for (let q = 0; q < 6; q++) { const gem = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), M([0xa82a2a, 0x2a4aa8, 0x2a8a4a][q % 3], { roughness: 0.2 })); gem.position.set(-0.6 + q * 0.24, 1.3, 0.31); shrine.add(gem); }
      shrine.position.set(sx2, gy + 0.36, sz2); shrine.rotation.y = 0; scene.add(shrine);
      for (const dx of [-1.3, 1.3]) { put("candle", CYL_G, M(0xe8e0c8), sx2 + dx, gy + 0.36, sz2 + 0.9, 0.06, 1.3, 0.06); put("flame", FLAME_G, flameM, sx2 + dx, gy + 1.7, sz2 + 0.9, 1.6, 1.6, 1.6); }
      mark("St Erkenwald's shrine", sx2, sz2, "known", "Erkenwald, bishop of London (675-693), founder of Barking and Chertsey abbeys, was London's own saint, and his tomb in St Paul's its great shrine: pilgrims came for healing, and a book of his miracles was written about 1140. In 1148 his relics were moved to a new shrine behind the high altar. That his shrine was here is known; its form (a gilded house-shaped reliquary over a stone tomb with openings for pilgrims to reach toward the saint) is inferred.", { y: 2.4, r: 4, range: 40 }); }
    mark("Inside St Paul's", ...(([a, , b]) => [a, b])(gw(NF, 0, 0, 0)), "inferred", "No trace of the Saxon cathedral survives, but England's great churches were famous for their richness: walls painted with saints and scenes, a gilded rood with Mary and John over the chancel arch, gold and silver on the altar, embroidered hangings (English embroidery was prized across Europe), crown-shaped hanging lamps, and some coloured window glass (as excavated at Jarrow and Winchester). These are shown here in a typical arrangement.", { y: 9, r: 12, range: 40 }); }
  ZONES.push({ name: "church", F: NF, w: 17.3, d: 39.3, light: [0, 6, 6], doors: [[9, -12], [0, -20]] });
  GTINT = [1, 1, 1];
  for (const [dx, dz] of [[-10, 26], [6, 28], [22, -24], [-16, -26]]) addHouse(x + dx, z + dz, 6, 10, 0, { wall: "plank", roof: "shingle", door: "-z" });   // canons' houses
  mark("St Paul's Cathedral", x, z, "inferred", "London's cathedral since Bishop Mellitus founded it in 604, on the top of Ludgate Hill. The church that stood here in 1066 was rebuilt after a fire in 962 and burned down in 1087, when the great Norman cathedral (Old St Paul's) was begun. No trace of the Saxon building has been found, so it is shown as a Late Saxon great church, quite unlike the new Norman abbey at Westminster: an aisled nave with side chapels and an apse (as in the excavated Anglo-Saxon cathedral at Canterbury), a big west tower (like Winchester Old Minster's westwork), rendered and limewashed walls with pilaster strips, long-and-short corner stones and small round- and triangular-headed openings (as at Earls Barton, Deerhurst and Brixworth), in a precinct with the canons' houses. The bishop of London in 1066 was William, a Norman appointed by Edward the Confessor in 1051.", { big: true, range: 3000, y: 34, r: 45 });
}
const CH = [["All Hallows by the Tower", 51.5098, -0.0795, "known", "Founded by Barking Abbey in the 7th century: a round-headed arch of reused Roman tiles from that first church still stands inside the present one. A stone church, the oldest in the City."],
  ["St Bride's", 51.5136, -0.1053, "known", "Dedicated to St Brigid of Kildare, on the gravel terrace just west of the Fleet, beside a holy well (Bride's Well, later Bridewell). Excavated after the church was bombed in 1940: a small stone two-cell church of the 11th century (perhaps earlier) over Roman remains."],
  ["St Alban, Wood Street", 51.5163, -0.0935, "known", "A small Late Saxon church excavated after the Blitz, inside the corner of the old Roman fort. Medieval legend tied it to King Offa of Mercia."],
  ["St Andrew, Holborn", 51.5172, -0.1080, "known", "Recorded in a charter of 951 as 'the old wooden church of St Andrew' on the Holborn road outside the city: shown here in timber."],
  ["St Clement Danes", 51.5131, -0.1140, "known", "The church of the Danish community outside the walls on the road to Westminster. Harold Harefoot, king 1035-1040, was said to be buried here."],
  ["St Nicholas Shambles", 51.5152, -0.0988, "inferred", "Excavated in 1975-79: its first church was a small stone building of the 11th century beside the meat market (the 'shambles') on Newgate Street. Whether it stood by 1066 is uncertain."],
  ["St Mary, Lambeth", 51.4950, -0.1195, "known", "Lambeth's church, on the riverside across from Westminster. The manor belonged to Goda, Edward the Confessor's sister; Domesday Book (1086) records the church."],
  ["Southwark minster", 51.5058, -0.0905, "inferred", "Domesday Book records a minster (monasterium) at Southwark, on the site of the later priory of St Mary Overie (now Southwark Cathedral). Form unknown."]];
for (const [name, lat, lon, tag, text] of CH) { const [x0, z0] = LL(lat, lon), [x, z] = findFree(x0, z0, 30, 20), timber = name.includes("Holborn"); const C = addChurch(x, z, { mat: timber ? "plank" : "rag", roof: timber ? "thatch" : "shingle" }); mark(name, x, z, tag, text, { y: 14, range: 900 }); }
{ const R = seeded(19); let n = 0;   // other parish churches, where it is not known which ones existed
  for (let tries = 0; tries < (ERA === 1285 ? 3000 : 400) && n < (ERA === 1285 ? 60 : 20); tries++) { const S = STREETS[(R() * 15) | 0], [px, pz] = S.L.at(R() * S.L.L); if (!CITY.inside(px, pz)) continue; const x = px + (R() - 0.5) * 70, z = pz + (R() - 0.5) * 70;
    if (!CITY.inside(x, z) || baseH(x, z) < 2 || !rRect(x, z, 30, 20, 0, 0, true) || CHURCHES.some(c => Math.hypot(c.x - x, c.z - z) < (ERA === 1285 ? 62 : 120))) continue;
    addChurch(x, z, ERA === 1285 ? { mat: "rag", roof: "shingle", nl: 13 + R() * 8, nw: 6 + R() * 2.5, wh: 6 + R() * 1.5 } : { mat: R() < 0.6 ? "rag" : "plank", roof: R() < 0.6 ? "shingle" : "thatch", nl: 11 + R() * 6, nw: 5.5 + R() * 2 }); n++;
    if (ERA === 1285 && n % 6 === 1) mark("A parish church", x, z, "typical", "By 1285 the City has about a hundred parish churches inside the walls, more than any other city in England: most small, many rebuilt in stone in the 12th and 13th centuries, each serving a few streets and run by its own parishioners and priest. Their bells ring the hours and the curfew. This stands for one; which stood exactly where is known for many, but not modelled here.", { y: 14, range: 700 });
    if (ERA !== 1285 && n % 4 === 1) mark("A parish church", x, z, "typical", "London had about 30-50 small parish churches by 1066, many founded by local lords or groups of neighbours in the 10th and 11th centuries, and more were added soon after (about 100 by 1200). Which ones existed in 1066 is mostly unknown. This stands for one: two cells, a nave for the people and a smaller chancel for the altar, of ragstone rubble (often reusing Roman stone and tile) or timber.", { y: 12, range: 300 }); } }

// ---------- houses along the streets ----------
const outsideDens = { "Fleet Street": (x, z) => 0.55 * (1 - sstepN(Math.hypot(x - GATES[0].x, z - GATES[0].z), 150, 700)) + 0.06, "the Strand": 0.07, "King Street": (x, z) => z > -330 ? 0.5 : 0.05,
  "the road to Holborn": (x, z) => 0.5 * (1 - sstepN(Math.hypot(x - GATES[1].x, z - GATES[1].z), 100, 500)), "Ermine Street": (x, z) => 0.45 * (1 - sstepN(Math.hypot(x - GATES[4].x, z - GATES[4].z), 80, 400)),
  "the road east from Aldgate": (x, z) => 0.4 * (1 - sstepN(Math.hypot(x - GATES[5].x, z - GATES[5].z), 80, 400)), "the road north from Cripplegate": (x, z) => 0.3 * (1 - sstepN(Math.hypot(x - GATES[3].x, z - GATES[3].z), 60, 300)),
  "Borough High Street": (x, z) => 0.75 * (1 - sstepN(Math.hypot(x - BRIDGE.P[1][0], z - BRIDGE.P[1][1]), 250, 650)), "the road to Lambeth": 0.03 };
const [cheapX, cheapZ] = LL(51.5130, -0.0930);
const cityDens = (x, z) => { if (!CITY.inside(x, z)) return 0; const d = Math.hypot(x - cheapX, (z - cheapZ) * 1.6); return ERA === 1285 ? 0.98 - 0.12 * sstepN(d, 700, 1500) : 0.88 - 0.45 * sstepN(d, 500, 1300); };
// by 1285, about 80,000 people: the suburbs run far out along the roads from the gates, and the Strand is nearly built up to Westminster
if (ERA === 1285) { const gd = (G, x, z) => Math.hypot(x - G.x, z - G.z); Object.assign(outsideDens, { "Fleet Street": (x, z) => 0.7 * (1 - sstepN(gd(GATES[0], x, z), 700, 1500)) + 0.25, "the Strand": 0.5, "King Street": (x, z) => z > -520 ? 0.85 : 0.35,
  "the road to Holborn": (x, z) => 0.88 * (1 - sstepN(gd(GATES[1], x, z), 400, 1100)), "Ermine Street": (x, z) => 0.85 * (1 - sstepN(gd(GATES[4], x, z), 300, 950)), "the road east from Aldgate": (x, z) => 0.8 * (1 - sstepN(gd(GATES[5], x, z), 300, 850)),
  "the road north from Cripplegate": (x, z) => 0.7 * (1 - sstepN(gd(GATES[3], x, z), 200, 650)), "Borough High Street": (x, z) => 0.95 * (1 - sstepN(Math.hypot(x - BRIDGE.P[1][0], z - BRIDGE.P[1][1]), 500, 1150)), "the road to Lambeth": 0.15, "Bankside": 0.85, "Tooley Street": 0.85 }); }   // thickest round Cheapside and the waterfront, thinner toward the walls
for (const S of STREETS) { const od = outsideDens[S.name], f = (x, z) => CITY.inside(x, z) ? cityDens(x, z) : typeof od === "function" ? od(x, z) : od || 0;
  if (S.name === "Thames Street") { lineStreet(S, f, { sides: [1] }); lineStreet(S, (x, z) => 0.3 * f(x, z), { sides: [-1], seed: 3, yards: false }); }
  else lineStreet(S, f, { burnt: S.name === "Borough High Street" && ERA === 1066, kind: S.name === "King Street" ? "vill" : "house" }); }
{ const R = seeded(23); let n = 0;   // houses back from the streets, on lanes and in yards
  for (let tries = 0; tries < (ERA === 1285 ? 60000 : 6000) && n < (ERA === 1285 ? (IS_HEADSET ? 1300 : 2200) : 420); tries++) { const x = GATES[0].x + R() * (GATES[5].x - GATES[0].x + 60), z = -2200 + R() * 1300; if (!CITY.inside(x, z) || R() > cityDens(x, z) || baseH(x, z) < 1.2 || WALL.d(x, z) < 12) continue;
    const w = 4 + R() * 2, d = 6 + R() * 5, ry = (R() < 0.5 ? 0 : Math.PI / 2) + (R() - 0.5) * 0.3; if (!rRect(x, z, w + 2, d + 2, ry, 0, true)) continue;
    const H = addHouse(x, z, w, d, ry, { door: ["+z", "-z", "+x", "-x"][(R() * 4) | 0] }); rRect(x, z, w + 0.4, d + 0.4, ry, 2); rRect(x, z, w + 8, d + 8, ry, 3); n++; } }
// small places outside: Charing, round St Clement Danes, Lambeth, and a few farmsteads
function cluster(lat, lon, n, rad, seed, o = {}) { const [cx, cz] = LL(lat, lon), R = seeded(seed); let k = 0;
  for (let t = 0; t < n * 20 && k < n; t++) { const a = R() * 6.283, r = rad * Math.sqrt(R()), x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, w = 4.5 + R() * 2, d = 7 + R() * 5, ry = R() * Math.PI;
    if (baseH(x, z) < 1.2 || !rRect(x, z, w + 3, d + 3, ry, 0, true)) continue; addHouse(x, z, w, d, ry, { door: "-z", ...o }); rRect(x, z, w + 0.4, d + 0.4, ry, 2); rRect(x, z, w + 14, d + 14, ry, 3); k++; } }
cluster(51.5073, -0.1270, ERA === 1285 ? 22 : 6, ERA === 1285 ? 110 : 45, 41); cluster(51.5131, -0.1135, ERA === 1285 ? 40 : 10, ERA === 1285 ? 160 : 70, 42); cluster(51.4955, -0.1192, 7, 70, 43); cluster(51.5165, -0.1150, 3, 60, 44); cluster(51.5200, -0.1000, 3, 80, 45); cluster(51.4985, -0.1340, 4, 60, 46);
cluster(51.5035, -0.0905, ERA === 1285 ? 140 : 10, ERA === 1285 ? 380 : 120, 47, { burnt: ERA === 1066 });   // Southwark: burned in 1066, rebuilt by 1100
markLL("Charing", 51.5073, -0.1277, "inferred", "A hamlet at the bend of the river road, where the Strand turns south to Westminster: its Old English name, cierring, means 'a turning'. The cross that gave Charing Cross its name was put up in 1294.", { range: 1200 });
markLL("The Danish settlement", 51.5131, -0.1125, "known", "A small community of Danes, living outside the walls round St Clement's church: London had many Scandinavian residents after Cnut became king in 1016.", { range: 900 });
markLL("Lambeth", 51.4958, -0.1188, "known", "A riverside manor on the Surrey shore opposite Westminster, held by Goda, King Edward's sister. The archbishops of Canterbury acquired it about 1200 and built Lambeth Palace.", { range: 1500 });

// ---------- Southwark: burned ----------
if (ERA === 1066) markLL("Southwark", 51.5035, -0.0900, "known", "The bridgehead settlement on gravel islands in the marsh: its name means 'the southern work', the defence of the bridge's south end. After his victory at Hastings William came up to the bridge in late November; the Londoners held it against him, and his knights burned Southwark before going round by Wallingford to approach London from the north-west (William of Poitiers). Some people are rebuilding.", { big: true, range: 3000 });

// ---------- the Westminster hamlet ----------
markLL("The vill of Westminster", 51.5012, -0.1262, "known", "The little settlement that grew up by the abbey and palace, along the road to London. Domesday Book (1086) records 25 houses there 'of the abbot's knights and of other men'. These are the houses that the Norman guards set on fire during the coronation.", { range: 1200 });

// ---------- the land: Thorney, rivers, marsh, hills ----------
markLL("Thorney Island", 51.4980, -0.1290, "known", "'The island of thorns': a gravel island about 470 by 370 m, between two mouths of the Tyburn stream and the Thames. Here the abbey of St Peter was founded in the 10th century (a minster may have stood here earlier), and Edward the Confessor built his palace and great church. It was 'Westminster', the west minster, as against St Paul's in the east.", { big: true, range: 2500, y: 30 });
markLL("The Tyburn", 51.5032, -0.1300, "known", "A stream from Hampstead that split into channels as it reached the Thames, making Thorney an island. Their exact courses are uncertain; they were later culverted and built over.", { range: 600 });
markLL("The Fleet", 51.5150, -0.1046, "known", "London's second river: a tidal inlet up to 100 m wide at its mouth, with wharves and mills. Fleet Street crossed it by a bridge just outside Ludgate. It was later narrowed into a canal and then buried; it still runs, in a sewer.", { range: 1500 });
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
if (ERA === 1066) markLL("No Tower of London", 51.5081, -0.0765, "absent", "The Tower does not exist yet. Soon after the coronation William had 'fortifications' built in the City 'against the fickleness of the huge and fierce population' (William of Poitiers): a ditch and rampart in this south-east corner of the Roman wall, where the White Tower was built about 1075-1100.", { range: 1500 });
if (ERA === 1066) markLL("No Guildhall, no castles", 51.5155, -0.0920, "absent", "Not yet built: the Guildhall (first recorded about 1128), Baynard's and Montfichet castles in the west of the City (after 1066), and Moorgate (1415). Saxon London was governed by its folkmoot, which met in the open air by St Paul's, and by the husting court.", { range: 500 });
if (ERA === 1066) markLL("Westminster Hall: not yet", 51.4986, -0.1246, "absent", "Westminster Hall was built by William's son William Rufus in 1097-99. Edward's palace stood about here; nothing of it is known, so its hall, chamber and kitchen are typical buildings of a royal residence, in timber.", { range: 400 });
markLL("Edward's palace", 51.4994, -0.1252, "inferred", "Edward the Confessor moved his main residence here from the City to watch his abbey being built. He died in the palace on 5 January 1066; Harold was crowned the next day. William is staying here. Nothing of it has been found, so its buildings follow what a royal household needed: a great aisled hall; a two-storey chamber block for the king; Queen Edith's own chamber; a chapel; the hall of the housecarls, the king's guard; stables; kitchen, bakehouse and brewhouse; a strong-house for the treasure; a guest house; inside a palisade with a gate. Royal halls of the time ran to 25-40 m long. Walk in: the hall's doors are on its long sides near the west end; the chamber has an outside stair.", { range: 1500, y: 14 });
markLL("The monastery", 51.4990, -0.1280, "inferred", "Edward refounded the abbey for a larger community of Benedictine monks (perhaps about 70 by 1100) under Abbot Edwin. The new stone buildings south of the church were under way (part of the dormitory's undercroft of about 1070-1100 survives); older buildings were timber. Layout inferred.", { range: 600 });
markLL("The wharf", 51.4993, -0.1237, "inferred", "Barges brought Caen stone, quarried in Normandy and shipped across the Channel and up the Thames, for the abbey.", { range: 500 });

// ---------- trees, bare in midwinter ----------
// Oaks, elms, ashes, willows and alders, leafless; willows and alders along the streams and on the marsh.
function bareTreeGeo() { const parts = [[new THREE.CylinderGeometry(0.16, 0.32, 4.2, 5), MT(0, 2.1, 0)]], R = seeded(3);
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283 + R(), tilt = 0.5 + R() * 0.5, L = 2.5 + R() * 2, h = 2.6 + R() * 1.6; const m = new THREE.Matrix4().makeTranslation(0, h, 0).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationZ(tilt)).multiply(new THREE.Matrix4().makeTranslation(0, L / 2, 0));
    parts.push([new THREE.CylinderGeometry(0.04, 0.11, L, 3), m]);
    for (let q = 0; q < 1; q++) { const L2 = 1.2 + R(), m2 = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, L * (0.1 + q * 0.4), 0)).multiply(new THREE.Matrix4().makeRotationZ((q ? -1 : 1) * (0.6 + R() * 0.4))).multiply(new THREE.Matrix4().makeTranslation(0, L2 / 2, 0)); parts.push([new THREE.CylinderGeometry(0.015, 0.04, L2, 3), m2]); } }
  return mergeG(parts); }
const TREE_G = bareTreeGeo(), treeM = M(0x4a4038, { roughness: 1 }), CROWN_G = new THREE.IcosahedronGeometry(1, 0), crownLeafM = new THREE.MeshStandardMaterial({ color: AUTUMN ? 0x7a6a2c : 0x3a5a26, roughness: 0.95, flatShading: true });
{ const R = seeded(71); let n = 0, cap = IS_HEADSET ? 1100 : 2000;
  for (let gz = RZ0; gz < RZ0 + RH * RC && n < cap; gz += 22) for (let gx = RX0; gx < RX0 + RW * RC && n < cap; gx += 22) { const x = gx + R() * 20, z = gz + R() * 20, h = baseH(x, z); if (h < 0.9) continue;
    const v = rGet(x, z); if (v === 1 || v === 2 || v === 7 || v === 4) continue; const inC = CITY.inside(x, z);
    const wet = (THAMES.side(x, z) > 0 && h < 2.3) || [TYB_N, TYB_S, TYB_W, FLEET, WALBROOK].some(L => L.near(x, z, 40) && L.d(x, z) < 40);
    const p = inC ? (v === 3 ? 0.03 : 0.01) : wet ? 0.26 : v === 3 ? 0.08 : 0.035 + 0.06 * sstepN(fbm(x / 400, z / 400, 2), 0.5, 0.7) + (x < -450 ? 0.04 + 0.2 * sstepN(fbm(x / 300 + 5, z / 300, 2), 0.45, 0.62) : 0);   // more wood west of the Tyburn
    if (R() > p) continue; const s = wet ? 0.7 + R() * 0.4 : 0.8 + R() * 0.7; put("tree", TREE_G, treeM, x, h - 0.2, z, s, s * (wet ? 0.8 : 1), s, R() * 6.28); if (LEAFY) for (let q = 0; q < 2; q++) put("crown", CROWN_G, crownLeafM, x + (R() - 0.5) * 2.4 * s, h + (4.6 + R() * 1.6) * s * (wet ? 0.8 : 1), z + (R() - 0.5) * 2.4 * s, 2.3 * s, 1.9 * s, 2.3 * s, R() * 6);   // in leaf
    n++; } }
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
// fruit trees in the yards and crofts (apples, pears, plums, and cherries all occur in Late Saxon pits)
{ const im = new THREE.InstancedMesh(TREE_G, treeM, Math.max(1, FRUIT.length)); FRUIT.forEach(([x, z, s], i) => { O3.position.set(x, groundH(x, z) - 0.1, z); O3.rotation.set(0, i * 1.7, 0); O3.scale.set(s, s * 0.7, s); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); if (LEAFY) put("crown", CROWN_G, crownLeafM, x, groundH(x, z) + 3.4 * s, z, 2.6 * s, 1.6 * s, 2.6 * s, i); }); im.count = FRUIT.length; im.computeBoundingSphere(); scene.add(im); }
// the St Paul's stone: the end of a tomb in St Paul's churchyard, carved in the Scandinavian Ringerike style and painted; its runes read
// "Ginna and Toki had this stone laid". Found in 1852; now in the Museum of London. About 1030-1040, when Cnut's Danes were in London.
{ const [x, z] = LL(51.5133, -0.0972), gy = groundH(x, z), stoneT = tex(256, 160, (g, w, h) => { g.fillStyle = "#cfc6b2"; g.fillRect(0, 0, w, h);
    g.lineWidth = 9; g.strokeStyle = "#20283a"; g.lineCap = "round"; g.beginPath(); g.moveTo(40, 120); g.bezierCurveTo(70, 60, 140, 130, 175, 70); g.bezierCurveTo(190, 45, 215, 55, 210, 80); g.stroke();   // the great beast
    g.beginPath(); g.moveTo(90, 100); g.lineTo(70, 140); g.moveTo(140, 105); g.lineTo(150, 145); g.stroke(); g.lineWidth = 3; for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(60 + k * 22, 80); g.bezierCurveTo(50 + k * 22, 40, 90 + k * 20, 30, 80 + k * 20, 15); g.stroke(); }   // its tendrils
    g.strokeStyle = "#9a2a22"; g.lineWidth = 2; g.beginPath(); g.moveTo(40, 120); g.bezierCurveTo(70, 60, 140, 130, 175, 70); g.stroke(); g.fillStyle = "#f4f0e6"; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(60 + k * 9, 95 - Math.sin(k * 0.5) * 18, 2, 0, 6.283); g.fill(); }
    g.fillStyle = "#20283a"; g.font = "bold 13px serif"; g.fillText("ᚴᛁᚾᛅ᛫ᛚᛁᛏ᛫ᛚᛁᚴᛁᛅ᛫ᛋᛏᛁᛁᚾ", 12, 152); });
  put("tomb", BOX_G, AMAT.ashlar, x, gy, z, 2.0, 0.65, 0.75, 0); put("stoneend", BOX_G, new THREE.MeshStandardMaterial({ map: stoneT, roughness: 0.85 }), x - 1.03, gy, z, 0.06, 0.62, 0.72, 0);
  mark("The St Paul's stone", x, z, "known", "The end of a tomb in St Paul's churchyard, carved with a great beast and tendrils in the Scandinavian Ringerike style and painted dark blue-black, red and white; the runes on its edge read 'Ginna and Toki had this stone laid'. About 1030-1040, when Cnut's Danish followers lived in London. Found in 1852; now in the Museum of London. Houses and furnishings were carved and painted in the same styles.", { y: 2, r: 5, range: 150 }); }
// ploughland north of the City and the Strand: winter strips of the open fields
function fieldAt(x, z, h) { if (h < 4 || THAMES.side(x, z) > 0 || CITY.inside(x, z)) return 0; if (WALL.near(x, z, 160) && WALL.d(x, z) < 160) return 0; const v = vnoise(x / 260 + 40, z / 260); return v > 0.52 ? 1 : 0; }
const [moorX, moorZ] = LL(51.5198, -0.0885);

// ---------- things to do: markets (on a market day), alehouses, boatmen ----------
// Trading was forbidden on Sundays and feast days (laws of Edgar, Æthelred and Cnut), so on Christmas Day the markets are shut.
// On the market day (a weekday a few days before Christmas) the City trades: Cheapside ('ceap', market) with its stalls; the meat market
// by St Nicholas Shambles on Newgate Street (the 'shambles' were the butchers' benches); Eastcheap; fish at Billingsgate and Queenhithe.
// Stall goods follow what excavation finds in Late Saxon London (pottery, bone and antler combs, leather shoes, ironwork, fish and meat
// bones, oyster shells); prices are guesses, as no prices survive for London in 1066.
const GOODS = {
  butcher: { name: "A butcher's stall", tag: "inferred", items: [["a joint of pork", 4, "Pork was the commonest town meat: pig bones fill Late Saxon rubbish pits."], ["a joint of mutton", 3, "From old sheep: they were kept for wool first."], ["a piece of salt beef", 3, "Beef salted in autumn, when cattle were slaughtered before winter."], ["pig's trotters", 1, "Nothing was wasted."]] },
  fish: { name: "A fishmonger", tag: "inferred", items: [["a dozen salt herrings", 1, "Herring, salted or smoked, the great food of fasting days: from about 1000 sea fish appear in English town deposits (the 'fish event horizon')."], ["a fresh Thames eel", 2, "Eels were caught in weirs and traps all along the Thames; rents were often paid in eels."], ["a dozen oysters", 1, "Oyster shells are everywhere in London excavations."], ["a salmon", 8, "Salmon still ran up the Thames."]] },
  bread: { name: "A bread stall", tag: "typical", items: [["a loaf of wheat bread", 1, "White wheat bread for those who could afford it."], ["a big loaf of rye and barley", 1, "Coarse dark bread, the everyday loaf."]] },
  dairy: { name: "Cheese, butter and eggs", tag: "typical", items: [["a small cheese", 2, "Mostly made from sheep's milk."], ["a pat of butter", 2, "Salted to keep."], ["a dozen eggs", 1, "Hens were kept in town yards."]] },
  veg: { name: "Winter vegetables", tag: "typical", items: [["a bunch of leeks", 1, "Leeks were the Anglo-Saxon vegetable: 'leac-tun', leek-garden, was the word for a garden."], ["a string of onions", 1, "Stored from the autumn."], ["a cabbage", 1, "Grown in town yards."], ["a dozen stored apples", 1, "Kept through the winter."]] },
  pots: { name: "A potter's stall", tag: "inferred", items: [["a cooking pot", 2, "London's own Late Saxon Shelly ware, hand-made, the clay tempered with crushed shell."], ["a glazed Stamford ware pitcher", 6, "Wheel-thrown and glazed, brought from Stamford in Lincolnshire: one of the finest wares of the time."]] },
  cloth: { name: "A cloth seller", tag: "typical", items: [["an ell of undyed wool", 4, "Grey-brown 'russet', the common cloth."], ["an ell of madder-red wool", 12, "Dyed red with madder root: dearer."], ["a linen headrail", 8, "For a married woman's head-covering."]] },
  iron: { name: "Ironwork", tag: "typical", items: [["a knife", 4, "Everyone carried a knife at the belt."], ["a handful of nails", 2, "Iron nails for clench-built boats and doors."], ["a pair of shears", 6, "For cloth, wool and hair."]] },
  leather: { name: "A shoemaker", tag: "inferred", items: [["a pair of turnshoes", 12, "Sewn inside out and turned: hundreds of Late Saxon shoes have been found in waterlogged London ground."], ["a leather belt", 4, ""]] },
  comb: { name: "A comb-maker", tag: "inferred", items: [["an antler comb", 4, "Combs of red-deer antler, riveted between bone side-plates: comb-making waste is a common Late Saxon London find."], ["a bone pin", 1, "For fastening clothes or hair."]] },
  poultry: { name: "Poultry", tag: "typical", items: [["a hen", 4, ""], ["a goose", 8, "A Christmas goose."]] },
  salt: { name: "Salt and corn", tag: "typical", items: [["a measure of salt", 2, "Salt from the Droitwich brine springs or the coastal salterns, for keeping meat and fish."], ["a sack of malt", 10, "For brewing ale."]] } };
// by 1285 London's trades have their own streets and guilds: goldsmiths in West Cheap, mercers by St Mary-le-Bow, pepperers in Soper Lane,
// poulterers in the Poultry, fishmongers in Thames Street and Fish Street, vintners in the Vintry, cooks in Eastcheap; the Stocks Market (1282)
// for fish and flesh. Prices are in pence, rounded from 13th-century records (the assizes of bread and ale, royal and household accounts).
if (ERA === 1285) { Object.assign(GOODS, {
  goldsmith: { name: "A goldsmith", tag: "known", items: [["a silver ring", 12, "Goldsmiths keep their shops in West Cheap, under wardens who test the metal; the king's Exchange by St Paul's changes foreign coin."], ["a silver brooch", 30, "A ring brooch to pin a cloak or the neck of a gown."], ["a mazer bowl with a silver rim", 60, "A drinking bowl of turned maple wood, rimmed with silver."]] },
  mercer: { name: "A mercer", tag: "known", items: [["an ell of silk", 48, "Italian silk, bought at the great fairs or from Lombard merchants: for the rich."], ["a linen kerchief", 4, ""], ["a leather purse", 6, "Worn hanging from the belt."], ["a pair of gloves", 3, ""]] },
  spicer: { name: "A pepperer", tag: "known", items: [["a pound of pepper", 10, "The pepperers of Soper Lane sell spices by weight on their great beams: their trade became the Grocers' Company."], ["an ounce of saffron", 12, "The dearest spice, for colour as much as taste."], ["a pound of sugar", 18, "Sugar is a spice too, a luxury from the Mediterranean."], ["a pound of almonds", 3, "For almond milk on fast days."]] },
  wine: { name: "A vintner", tag: "known", items: [["a gallon of Gascon wine", 3, "Most wine comes from Gascony, English since 1152, landed at the Vintry; the City's assize fixes the price, and taverners who sell bad wine are punished."], ["a gallon of Rhenish", 6, "White wine from the Rhine, dearer."]] },
  chandler: { name: "A chandler", tag: "typical", items: [["a pound of tallow candles", 2, "Tallow dips smell and smoke: wax candles are for churches and the rich."], ["a wax taper", 4, "To offer at a shrine."]] },
  cook: { name: "A cookshop", tag: "known", items: [["a hot pie", 1, "Cooks sell hot food ready-made; William FitzStephen (about 1173) describes a public cookshop by the river where any traveller could buy roast, fried or boiled meat and fish at any hour. Eastcheap is the cooks' street."], ["a roast capon", 4, ""]] } });
  GOODS.pots.items = [["a glazed jug", 3, "Green-glazed jugs from Kingston and the Surrey kilns, or from Mill Green in Essex, some decorated with faces and patterns."], ["a cooking pot", 1, ""]];
  GOODS.cloth.items = [["an ell of russet", 6, "Common English cloth."], ["an ell of scarlet", 60, "The finest dyed wool, Flemish or English: the colour of the rich."], ["an ell of linen", 3, ""]];
  GOODS.bread.items = [["a farthing loaf", 0.25, "The Assize of Bread (1266) fixes the loaf's weight to the price of wheat; bakers who sell short are drawn through the streets on a hurdle with the loaf hung round their neck."], ["a penny loaf of brown bread", 1, ""]];
  GOODS.poultry.items = [["a capon", 3, "The Poultry is named after the poulterers' stalls here."], ["a goose", 4, "Michaelmas is the season for geese, fattened on the harvest stubble."], ["a dozen eggs", 1, ""]];
  GOODS.fish.items = [["a salmon", 18, "From the Thames, still clean enough for salmon."], ["a stockfish", 1, "Dried cod from Norway, beaten soft and soaked."], ["a hundred herrings", 6, "Salted herring from Yarmouth, for Fridays and Lent."]];
  for (const k of ["goldsmith", "mercer", "spicer", "wine", "chandler", "cook", "pots", "cloth", "bread", "poultry", "fish"]) GOODS[k].items.forEach(it => it[1] = Math.round(it[1] * 4));   // prices are kept in farthings
}
const STALLS = [], MKT_ON = MARKET;
const STALL_G = { board: BOX_G, carcass: mergeG([[new THREE.SphereGeometry(0.2, 8, 6), MT(0, 0, 0, 1.15, 2.0, 0.7)], [new THREE.CylinderGeometry(0.05, 0.06, 0.35, 5), MT(0.1, 0.48, 0, 1, 1, 1, 0, 0.2)], [new THREE.CylinderGeometry(0.05, 0.06, 0.35, 5), MT(-0.1, 0.48, 0, 1, 1, 1, 0, -0.2)]]), joint: new THREE.SphereGeometry(0.12, 6, 4).scale(1.4, 0.7, 1), fish: new THREE.SphereGeometry(0.05, 6, 3).scale(1, 0.45, 3.4),
  loaf: new THREE.SphereGeometry(0.13, 8, 5).scale(1, 0.55, 1.2), pot: new THREE.LatheGeometry([[0, 0], [0.1, 0.01], [0.15, 0.1], [0.14, 0.22], [0.1, 0.27], [0.11, 0.3]].map(([r, y]) => new THREE.Vector2(r, y)), 10),
  bolt: new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8).rotateX(Math.PI / 2), cheese: new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10), basket: new THREE.CylinderGeometry(0.24, 0.2, 0.28, 10).translate(0, 0.14, 0),
  cask: new THREE.CylinderGeometry(0.3, 0.3, 0.7, 10).rotateZ(Math.PI / 2), candle: new THREE.CylinderGeometry(0.015, 0.015, 0.25, 5),
  sack: new THREE.SphereGeometry(0.24, 6, 4).scale(1, 1.3, 1).translate(0, 0.3, 0), veg: new THREE.SphereGeometry(0.07, 6, 4), small: new THREE.BoxGeometry(0.16, 0.04, 0.05), shoe: new THREE.BoxGeometry(0.1, 0.07, 0.25), bird: new THREE.SphereGeometry(0.12, 6, 4).scale(1, 0.9, 1.4) };
const SMAT = { meat: M(0xc07868, { roughness: 0.55 }), joint: M(0x9a3a32, { roughness: 0.55 }), fat: M(0xe0c8b0), fish: M(0xa8b0b8, { roughness: 0.4, metalness: 0.2 }), bread: M(0xb07a3a), pot: M(0x5a4a3e), glaze: M(0x8a7a2a, { roughness: 0.35 }), bolt: M(0x8a7a62), red: M(0x8a2a24), linen: M(0xe6e0d0),
  cheese: M(0xe0c070), basket: MAT.wattle, sack: M(0xb8a888), leek: M(0x5a7a3a), onion: M(0xb08a4a), apple: M(0x9a4a2a), iron: MAT.iron, leather: M(0x5a3a22), bone: M(0xe0d4b8), bird: M(0x8a7a6a), awning: M(0xc8bca0, { side: THREE.DoubleSide }), gold: M(0xd8b04a, { metalness: 0.8, roughness: 0.3 }), silver: M(0xc8ccd0, { metalness: 0.8, roughness: 0.3 }), silkR: M(0xa82a3a, { roughness: 0.4 }), silkB: M(0x2a4a9a, { roughness: 0.4 }), silkG: M(0x3a7a4a, { roughness: 0.4 }), cask: M(0x6a4e32), pie: M(0xa8743a) };
function addStall(x, z, a, side, kind) { const G = GOODS[kind], c = Math.cos(a), s = Math.sin(a), at = (u, v, y = 0) => [x + c * u + s * v, z - s * u + c * v], gy = groundH(x, z);   // u across the street, v along it
  const P = (key, geo, mat, u, v, y, sx = 1, sy = 1, sz = 1, ry = 0) => { const [px, pz] = at(u, v); put("st:" + key, geo, mat, px, gy + y, pz, sx, sy, sz, a + ry); };
  P("board", BOX_G, MAT.wood, 0, 0, 0.78, 0.8, 0.06, 2.2); for (const v of [-0.85, 0.85]) P("trestle", BOX_G, MAT.wood, 0, v, 0, 0.6, 0.78, 0.08);
  for (const v of [-1.1, 1.1]) P("pole", BOX_G, MAT.wood, side * 0.5, v, 0, 0.08, 2.3, 0.08); P("awn", BOX_G, SMAT.awning, side * 0.15, 0, 2.1, 1.3, 0.03, 2.4);
  const R = seeded((x * 13 + z * 7) | 0), top = 0.84;
  if (kind === "butcher") { P("bar", BOX_G, MAT.wood, side * 0.45, 0, 2.0, 0.08, 0.08, 2.2); for (const v of [-0.6, 0.1, 0.7]) { P("carcass", STALL_G.carcass, SMAT.meat, side * 0.45, v, 1.3); P("hook", BOX_G, MAT.iron, side * 0.45, v, 1.72, 0.02, 0.28, 0.02); } for (let k = 0; k < 6; k++) P("joint", STALL_G.joint, SMAT.joint, (R() - 0.5) * 0.4, -0.9 + k * 0.35, top); }
  else if (kind === "fish") { for (let k = 0; k < 14; k++) P("fish", STALL_G.fish, SMAT.fish, (R() - 0.5) * 0.5, -0.95 + k * 0.14, top + 0.02, 1, 1, 1, R() * 0.6); for (const v of [-1.5, 1.5]) P("basket", STALL_G.basket, SMAT.basket, -side * 0.3, v, 0); }
  else if (kind === "bread") for (let k = 0; k < 10; k++) P("loaf", STALL_G.loaf, SMAT.bread, (k % 2 - 0.5) * 0.35, -0.9 + Math.floor(k / 2) * 0.45, top + 0.04);
  else if (kind === "dairy") { for (let k = 0; k < 6; k++) P("cheese", STALL_G.cheese, SMAT.cheese, (k % 2 - 0.5) * 0.35, -0.8 + Math.floor(k / 2) * 0.5, top + 0.04); P("basket", STALL_G.basket, SMAT.basket, 0, 0.75, top); }
  else if (kind === "veg") for (let k = 0; k < 24; k++) P("veg", STALL_G.veg, [SMAT.leek, SMAT.onion, SMAT.apple][k % 3], (R() - 0.5) * 0.55, -1 + R() * 2, top + 0.05, 1, k % 3 ? 1 : 2.5, 1);
  else if (kind === "pots") for (let k = 0; k < 8; k++) P("pot", STALL_G.pot, k % 4 ? SMAT.pot : SMAT.glaze, (k % 2 - 0.5) * 0.4, -0.9 + Math.floor(k / 2) * 0.55, top);
  else if (kind === "cloth") for (let k = 0; k < 6; k++) P("bolt", STALL_G.bolt, [SMAT.bolt, SMAT.red, SMAT.linen][k % 3], (k % 2 - 0.5) * 0.36, -0.7 + Math.floor(k / 2) * 0.7, top + 0.08);
  else if (kind === "iron") for (let k = 0; k < 10; k++) P("small", STALL_G.small, SMAT.iron, (R() - 0.5) * 0.5, -0.9 + k * 0.2, top + 0.02, 1, 1, 1, R());
  else if (kind === "leather") for (let k = 0; k < 8; k++) P("shoe", STALL_G.shoe, SMAT.leather, (k % 2 - 0.5) * 0.3, -0.9 + Math.floor(k / 2) * 0.5, top + 0.04);
  else if (kind === "comb") for (let k = 0; k < 12; k++) P("comb", STALL_G.small, SMAT.bone, (R() - 0.5) * 0.5, -0.95 + k * 0.17, top + 0.02);
  else if (kind === "poultry") { for (let k = 0; k < 3; k++) P("basket", STALL_G.basket, SMAT.basket, -side * 0.2, -0.8 + k * 0.8, 0); for (let k = 0; k < 5; k++) P("bird", STALL_G.bird, SMAT.bird, (R() - 0.5) * 0.4, -0.9 + k * 0.45, top + 0.1); }
  else if (kind === "salt") for (let k = 0; k < 5; k++) P("sack", STALL_G.sack, SMAT.sack, -side * 0.2 + (R() - 0.5) * 0.3, -1 + k * 0.5, 0);
  else if (kind === "goldsmith") { for (let k = 0; k < 6; k++) P("cup", STALL_G.pot, k % 2 ? SMAT.silver : SMAT.gold, (k % 2 - 0.5) * 0.35, -0.8 + Math.floor(k / 2) * 0.6, top, 0.6, 0.7, 0.6); for (let k = 0; k < 8; k++) P("ring", STALL_G.small, SMAT.gold, (R() - 0.5) * 0.4, -0.95 + k * 0.25, top + 0.01, 0.4, 0.5, 0.4); }
  else if (kind === "mercer") for (let k = 0; k < 8; k++) P("bolt", STALL_G.bolt, [SMAT.silkR, SMAT.silkB, SMAT.linen, SMAT.silkG][k % 4], (k % 2 - 0.5) * 0.36, -0.8 + Math.floor(k / 2) * 0.5, top + 0.08);
  else if (kind === "spicer") { for (let k = 0; k < 6; k++) P("spsack", STALL_G.sack, [SMAT.sack, SMAT.onion, SMAT.red][k % 3], (k % 2 - 0.5) * 0.35, -0.8 + Math.floor(k / 2) * 0.55, top, 0.5, 0.45, 0.5); P("beam", BOX_G, MAT.wood, side * 0.45, 0, 1.9, 0.06, 0.06, 1.0); P("beam", BOX_G, MAT.wood, side * 0.45, 0, 1.4, 0.04, 0.5, 0.04); }
  else if (kind === "wine") for (let k = 0; k < 4; k++) P("cask", STALL_G.cask, SMAT.cask, -side * 0.3, -1.05 + k * 0.7, 0.35);
  else if (kind === "chandler") for (let k = 0; k < 12; k++) P("candle", STALL_G.candle, SMAT.linen, (R() - 0.5) * 0.45, -0.95 + k * 0.17, top + 0.12);
  else if (kind === "cook") { for (let k = 0; k < 8; k++) P("pie", STALL_G.loaf, SMAT.pie, (k % 2 - 0.5) * 0.35, -0.9 + Math.floor(k / 2) * 0.5, top + 0.04, 1.1, 0.8, 0.9); P("pot", STALL_G.pot, SMAT.pot, -side * 0.3, 1.3, 0, 2, 2, 2); }
  solid(x, z, 0.9, 2.3, a); const [sx, sz] = at(side * 0.75, 0); const S = { x, z, a, side, kind, G, seller: [sx, sz, Math.atan2(-c * side, s * side)], front: at(-side * 0.8, 0) }; STALLS.push(S); return S; }
// lines of stalls along a street between two longitudes, both sides, keeping the middle clear
function stallsAlong(name, lon0, lon1, kinds, gap = 6.5) { if (IS_HEADSET && ERA === 1285) gap *= 1.4; const S = STREETS.find(q => q.name === name), R = seeded(name.length * 31 + lon0 * 1e4 | 0); if (!S) return;
  for (let s = 3; s < S.L.L; s += gap) { const [x, z, a] = S.L.at(s), lon = x / KX + LON0; if (lon < Math.min(lon0, lon1) || lon > Math.max(lon0, lon1)) continue;
    for (const side of [-1, 1]) { if (R() < 0.3) continue; const off = side * (S.w / 2 - 1.1), px = x + Math.cos(a) * off, pz = z - Math.sin(a) * off; if (rGet(px, pz) !== 1) continue; addStall(px, pz, a, side, kinds[(R() * kinds.length) | 0]); } } }
if (MKT_ON && ERA === 1285) {
  stallsAlong("Cheapside", -0.0995, -0.0980, ["butcher", "butcher", "butcher", "poultry"], 4);   // the Shambles, by St Nicholas
  stallsAlong("Cheapside", -0.0968, -0.0950, ["goldsmith", "goldsmith", "goldsmith", "iron"], 4.5);   // West Cheap: the goldsmiths
  stallsAlong("Cheapside", -0.0950, -0.0932, ["mercer", "mercer", "cloth", "cloth", "leather", "pots", "chandler", "dairy", "veg"], 4.5);
  stallsAlong("Cheapside", -0.0932, -0.0921, ["spicer", "spicer", "mercer", "mercer"], 4.5);   // by Soper Lane and the Mercery
  stallsAlong("Cheapside", -0.0921, -0.0903, ["poultry", "poultry", "poultry", "dairy"], 4.5);   // the Poultry
  stallsAlong("Bread Street", -0.0955, -0.0940, ["bread"], 6); stallsAlong("Milk Street", -0.0930, -0.0920, ["dairy", "dairy", "veg"], 6); stallsAlong("Wood Street", -0.0942, -0.0932, ["veg", "pots", "iron"], 6);
  stallsAlong("Eastcheap", -0.0890, -0.0845, ["cook", "cook", "butcher", "butcher", "bread"], 5);
  stallsAlong("Thames Street", -0.0845, -0.0815, ["fish", "fish", "fish", "salt"], 4); stallsAlong("Thames Street", -0.0958, -0.0935, ["fish", "fish", "salt", "salt"], 4); stallsAlong("Thames Street", -0.0928, -0.0910, ["wine", "wine", "wine"], 5);   // Billingsgate, Queenhithe, the Vintry
  stallsAlong("Fish Street Hill and Gracechurch Street", -0.0880, -0.0862, ["fish", "fish", "veg"], 5);
  if (self.STOCKS) for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) { const [x, z] = [STOCKS.x + Math.sin(STOCKS.ry) * (k - 2.5) * 4.6 + Math.cos(STOCKS.ry) * sd * 2.4, STOCKS.z + Math.cos(STOCKS.ry) * (k - 2.5) * 4.6 - Math.sin(STOCKS.ry) * sd * 2.4]; addStall(x, z, STOCKS.ry, sd, k % 2 ? "fish" : "butcher"); }
}
else if (MKT_ON) {
  stallsAlong("Cheapside", -0.0995, -0.0980, ["butcher", "butcher", "butcher", "poultry"], 5);   // the Shambles, by St Nicholas
  stallsAlong("Cheapside", -0.0975, -0.0905, ["bread", "dairy", "veg", "pots", "cloth", "iron", "leather", "comb", "poultry", "veg", "bread", "salt"], 7.5);
  stallsAlong("Eastcheap", -0.0890, -0.0845, ["butcher", "butcher", "poultry", "veg", "bread"], 8);
  stallsAlong("Thames Street", -0.0845, -0.0822, ["fish", "fish", "fish", "salt"], 5); stallsAlong("Thames Street", -0.0958, -0.0935, ["fish", "fish", "salt", "salt"], 5);
}
// alehouses (on both days): ordinary houses where the alewife sold her brew, with benches and casks; which houses, unknown
const ALEHOUSES = [];
{ for (const [lat, lon] of [[51.5130, -0.0950], [51.5112, -0.0858], [51.5136, -0.1060], [51.5010, -0.1262]]) { const [x, z] = LL(lat, lon); let best = null, bd = 1e9; for (const H of HOUSES) { if (H.burnt || H.kind === "vill" && lat < 51.502 && false) continue; const d = Math.hypot(H.x - x, H.z - z); if (d < bd && H.w * H.d > 35) { bd = d; best = H; } }
    if (best) { best.ale = true; ALEHOUSES.push(best); mark("An alehouse", best.x, best.z, "typical", "An alehouse: an ordinary house where the alewife sold the ale she brewed (brewing was mostly women's work). Ale was the everyday drink, made from malted barley, unhopped, sweetish and not strong. Go in (E at the door) for a jug.", { y: 6, r: 8, range: 250 }); } } }
// boatmen: hire a boat from the hithes and landing places
const PIERS = [["Westminster wharf", 51.4994, -0.1240, -1], ["Lambeth", 51.4958, -0.1212, 1], ["Queenhithe", 51.5108, -0.0947, -1], ["Billingsgate", 51.5097, -0.0838, -1], ["Southwark", 51.5060, -0.0905, 1]].map(([name, lat, lon, sg]) => {
  let [x, z] = LL(lat, lon), k = 0; const tx = THAMES.side(x, z); let px = x, pz = z;   // walk toward the river until the water; the pier is just ashore, the boat just out
  const step = () => { let best = null, bd = 1e9; for (let a = 0; a < 6.28; a += 0.4) { const qx = px + Math.cos(a) * 2, qz = pz + Math.sin(a) * 2, d = Math.abs(THAMES.side(qx, qz)); if (d < bd) { bd = d; best = [qx, qz]; } } [px, pz] = best; };
  while (baseH(px, pz) > 0.2 && k++ < 200) step(); const wx = px, wz = pz; for (let q = 0; q < 6; q++) step(); const [bx, bz] = [px, pz];
  let ax = wx, az = wz, j = 0; while (baseH(ax, az) < 0.6 && j++ < 40) { ax += (wx - bx) * 0.5; az += (wz - bz) * 0.5; }
  put("jetty", BOX_G, MAT.wood, (ax + bx) / 2, 0.5, (az + bz) / 2, 1.6, 0.25, Math.hypot(bx - ax, bz - az) + 2, Math.atan2(bx - ax, bz - az));
  { const ux = (bx - ax) / Math.hypot(bx - ax, bz - az), uz = (bz - az) / Math.hypot(bx - ax, bz - az); addBoat(bx - ux * 2 + uz * 2.6, bz - uz * 2 - ux * 2.6, Math.atan2(bx - ax, bz - az), 6, false); }   // the boatman's own boat, moored alongside the jetty
  mark("Boatman: " + name, ax, az, "typical", "A boatman waits to row passengers along or across the river: the Thames was London's main road (the bridge was the only crossing). Press E to hire him.", { y: 3, r: 6, range: 200 });
  return { name, land: [ax, az], boat: [bx, bz] }; });
// treadwheel cranes on the quays at Queenhithe and Billingsgate (by 1285 the hithes have timber quays and cranes for unloading ships)
if (ERA === 1285) for (const P of PIERS.filter(p => p.name === "Queenhithe" || p.name === "Billingsgate")) { const [ax, az] = P.land, dx = P.boat[0] - ax, dz = P.boat[1] - az, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, cx = ax + uz * 9, cz = az - ux * 9, gy = groundH(cx, cz);
  put("crane", BOX_G, MAT.wood, cx, gy, cz, 3.2, 0.4, 3.2); put("crane", BOX_G, MAT.wood, cx, gy, cz, 0.45, 7.5, 0.45); put("crane", BOX_G, MAT.wood, cx + ux * 2.5, gy + 7.2, cz + uz * 2.5, 0.35, 0.35, 6, Math.atan2(ux, uz)); put("crane", BOX_G, MAT.iron, cx + ux * 5.3, gy + 3.5, cz + uz * 5.3, 0.04, 3.6, 0.04);
  put("cranewheel", new THREE.TorusGeometry(1.9, 0.18, 5, 18), MAT.wood, cx - uz * 1.4, gy + 2.2, cz + ux * 1.4, 1, 1, 1, Math.atan2(ux, uz) + Math.PI / 2); put("crane", BOX_G, MAT.wood, cx - uz * 1.4, gy + 2.1, cz + ux * 1.4, 0.2, 0.2, 2.4, Math.atan2(-uz, ux));
  mark("A treadwheel crane", cx, cz, "typical", "Men walk inside the great wheel to wind the rope and lift casks of wine and bales from the ships onto the quay. The City's cranes and the tolls on goods landed here were a valuable right.", { y: 9, range: 400, r: 10 }); }
// a river route between two piers: out to midstream, along the centre line, in to the other pier
function riverRoute(A, B) { const sOf = (x, z) => { let best = 0, bd = 1e9; for (let s = 0; s <= THAMES.L; s += 20) { const [px, pz] = THAMES.at(s), d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = s; } } return best; };
  const sA = sOf(...A.boat), sB = sOf(...B.boat), P = [A.boat], n = Math.max(2, Math.ceil(Math.abs(sB - sA) / 40)); for (let k = 0; k <= n; k++) { const [x, z] = THAMES.at(sA + (sB - sA) * k / n); P.push([x, z]); } P.push(B.boat); return throughArch(P); }
// pigs and sheep: driven in to the Shambles on market days; pigs root in yards on any day. Medieval pigs were hairy, dark and long-legged,
// sheep small, horned, many brown or dark-faced.
const PIG_G = mergeG([[new THREE.SphereGeometry(0.3, 8, 6), MT(0, 0.5, 0, 0.75, 0.75, 1.5)], [new THREE.SphereGeometry(0.15, 6, 4), MT(0, 0.55, 0.48, 1, 0.9, 1.2)], [new THREE.CylinderGeometry(0.06, 0.07, 0.08, 6).rotateX(Math.PI / 2), MT(0, 0.52, 0.66)],
  ...[[0.13, 0.3], [-0.13, 0.3], [0.13, -0.3], [-0.13, -0.3]].map(([x, z]) => [new THREE.CylinderGeometry(0.04, 0.035, 0.32, 5), MT(x, 0.16, z)]), [new THREE.ConeGeometry(0.05, 0.1, 4), MT(0.08, 0.7, 0.42)], [new THREE.ConeGeometry(0.05, 0.1, 4), MT(-0.08, 0.7, 0.42)]]);
const SHEEP_G = mergeG([[new THREE.SphereGeometry(0.3, 8, 6), MT(0, 0.5, 0, 0.8, 0.75, 1.25)], [new THREE.SphereGeometry(0.11, 6, 4), MT(0, 0.6, 0.42, 0.8, 1, 1.3)], ...[[0.12, 0.22], [-0.12, 0.22], [0.12, -0.22], [-0.12, -0.22]].map(([x, z]) => [new THREE.CylinderGeometry(0.03, 0.025, 0.32, 5), MT(x, 0.16, z)]),
  [new THREE.TorusGeometry(0.05, 0.018, 4, 8, Math.PI * 1.4), MT(0.08, 0.66, 0.36)], [new THREE.TorusGeometry(0.05, 0.018, 4, 8, Math.PI * 1.4), MT(-0.08, 0.66, 0.36)]]);
const BEASTS = [], beastIM = {};
{ const R = seeded(301), pigM = M(0x4e4038), sheepM = M(0xc8bca4);
  const S = STREETS.find(q => q.name === "Cheapside"), NG = [GATES[1].x, GATES[1].z], SH = LL(51.5151, -0.0990);
  for (let k = 0; k < 22; k++) { const H = HOUSES[(R() * HOUSES.length) | 0]; if (H.burnt || !CITY.inside(H.x, H.z)) continue; const c = Math.cos(H.ry), s = Math.sin(H.ry), back = H.d / 2 + 4; BEASTS.push({ sp: "pig", home: [H.x - s * back, H.z - c * back], ph: R() * 100, x: 0, z: 0, h: 0 }); }   // pigs rooting in back yards
  if (MKT_ON) { for (let k = 0; k < 14; k++) BEASTS.push({ sp: "sheep", path: [[NG[0] - 60, NG[1] - 30], NG, SH], ph: k * 2.2 + R(), x: 0, z: 0, h: 0, off: [(R() - 0.5) * 3, (R() - 0.5) * 3] });   // a flock driven in by Newgate
    for (let k = 0; k < 6; k++) BEASTS.push({ sp: "pig", path: [[NG[0] - 40, NG[1] - 50], NG, SH], ph: 40 + k * 2.6, x: 0, z: 0, h: 0, off: [(R() - 0.5) * 3, (R() - 0.5) * 3] }); }
  for (const [sp, geo, mat] of [["pig", PIG_G, pigM], ["sheep", SHEEP_G, sheepM]]) { const n = BEASTS.filter(b => b.sp === sp).length; const im = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); im.frustumCulled = false; im.count = n; scene.add(im); beastIM[sp] = im; } }
function beastStep(t) { const cnt = { pig: 0, sheep: 0 };
  for (const B of BEASTS) { if (B.path) { const L = 160, s = ((SIM * 0.7 + B.ph * 10) % (L + 120)); const [x, z, h, done] = routeAt(B.path, Math.min(s, L)); B.x = x + B.off[0]; B.z = z + B.off[1]; B.h = done ? h + Math.sin(t * 0.3 + B.ph) * 2 : h; B.walk = !done; }
    else { const a = t * 0.05 + B.ph, r = 2.5; B.x = B.home[0] + Math.cos(a) * r; B.z = B.home[1] + Math.sin(a * 1.3) * r; B.h = a + Math.PI / 2; B.walk = true; }
    const d = Math.hypot(B.x - P_.x, B.z - P_.z), im = beastIM[B.sp], i = cnt[B.sp]++; if (d > 200) { im.setMatrixAt(i, ZEROM); continue; }
    O3.position.set(B.x, groundH(B.x, B.z) + (B.walk ? Math.abs(Math.sin(t * 6 + B.ph)) * 0.03 : 0), B.z); O3.rotation.set(0, B.h, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }
  for (const k in beastIM) beastIM[k].instanceMatrix.needsUpdate = true; }
if (MKT_ON) { markLL("The Shambles", 51.5152, -0.0990, "inferred", "London's meat market, on Newgate Street by the church of St Nicholas 'at the Shambles' (the butchers' benches, Old English 'scamel'). Butchers killed and cut up beasts here, and the rubbish pits nearby are full of their bones. Animals were driven in on the hoof through Newgate. First recorded by name in the 12th century; trading here before 1066 is likely but not certain.", { y: 4, r: 30, range: 500 });
  markLL("The market day", 51.5141, -0.0935, "typical", "A weekday a few days before Christmas 1066. Cheapside is full of stalls on trestles; butchers on Newgate Street and in Eastcheap; fish by the hithes. William's army is camped round London, and Norman soldiers are in the town. Prices here are guesses: the few prices that survive are livestock values in King Æthelstan's laws (about 930): an ox 30 pence, a cow 20, a pig about 10, a sheep a shilling.", { y: 5, r: 25, range: 400 }); }

// ---------- the countryside round London ----------
// The villages are those of Domesday Book (1086) and earlier charters, at their old centres; their farms, fields and lanes are generated:
// what such places had, not a survey of what stood. Late Saxon farming here was open fields in long strips (selions) grouped into
// furlongs, worked by plough teams of oxen; meadow by the streams for hay; pasture and commons; woods for timber, fuel and pigs (pannage,
// in the autumn acorn season). Middlesex north of London was still well wooded. In midwinter the land is bare: ploughland, stubble,
// fallow, winter corn barely showing.
const VILLS = [
  ["Islington", 51.5365, -0.1030, 7, true, "known", "Iseldone in Domesday Book (1086): small manors, some held by the canons of St Paul's, with ploughland, meadow and woodland for pigs, on the high ground north of the City."],
  ["St Pancras", 51.5340, -0.1300, 4, true, "known", "A manor of the canons of St Paul's (Domesday), by the Fleet. Its church of St Pancras is thought to be one of the oldest Christian sites round London."],
  ["Tyburn", 51.5205, -0.1500, 5, false, "known", "Tiburne in Domesday, held by Barking Abbey: a small manor by the Tyburn brook, later called Marylebone after its church."],
  ["Hoxton", 51.5290, -0.0800, 4, false, "known", "Hochestone in Domesday: held by the canons of St Paul's; ploughland just north of the City."],
  ["Stepney", 51.5170, -0.0420, 8, true, "known", "Stibenhede: the bishop of London's great manor, reaching from the City wall to the River Lea, with many tenants and mills (Domesday). Its church of St Dunstan is said to have been founded by Dunstan, bishop of London, about 952."],
  ["Hackney", 51.5450, -0.0560, 5, false, "inferred", "Part of the bishop's great manor of Stepney; not named separately in Domesday. Farms and woodland by the Hackney Brook."],
  ["Kensington", 51.5010, -0.1920, 5, false, "known", "Chenesit in Domesday: a manor with ploughland, meadow and pasture, and woodland for 200 pigs."],
  ["Chelsea", 51.4840, -0.1700, 5, false, "known", "Chelched in Domesday: a riverside manor; the name means 'chalk landing-place'."],
  ["Battersea", 51.4745, -0.1690, 6, true, "known", "Patricesy: William gave it to Westminster Abbey in 1067. Domesday records seven mills here, on the Falcon Brook and by the Thames, among the most valuable in Surrey."],
  ["Kennington", 51.4870, -0.1100, 4, false, "known", "Chenintune in Domesday: a small manor on the higher ground south of the Lambeth marsh."],
  ["Bermondsey", 51.4975, -0.0780, 6, true, "known", "Bermundesye in Domesday: the king's manor, with a 'new and handsome church' and fisheries; on an island of gravel in the marsh."],
  ["Rotherhithe", 51.5000, -0.0520, 4, false, "inferred", "Riverside farms and fishermen's houses on the marsh east of Bermondsey."],
  ["Camberwell", 51.4740, -0.0930, 5, true, "known", "Cambrewelle in Domesday, with a church: farms on the rising ground south of the marsh."],
  ["Clapham", 51.4620, -0.1380, 4, false, "known", "Clopeham in Domesday: a small manor on the Surrey gravels."],
  // down the river
  ["Deptford (West Greenwich)", 51.4795, -0.0245, 5, false, "known", "West Greenwich in Domesday, where the Ravensbourne meets the Thames; the 'deep ford' that later named it."],
  ["Greenwich", 51.4810, -0.0060, 5, true, "known", "Here the Danish army camped with its fleet from 1011 to 1014, and here in 1012 they killed Ælfheah (St Alphege), archbishop of Canterbury, pelting him with bones at a feast when he refused to be ransomed. His church later stood on the spot."],
  ["Woolwich", 51.4925, 0.0650, 4, false, "known", "Hulviz in Domesday: a small riverside settlement; the name means a trading place for wool."],
  ["Barking Abbey", 51.5355, 0.0760, 6, true, "known", "Up the Roding: the great nunnery founded about 666 by Erkenwald for his sister Æthelburh, one of the richest in England. After the coronation William withdrew to Barking while fortifications were built in London, and there Earls Edwin and Morcar and other English leaders came to submit to him."],
  ["Rainham", 51.5180, 0.1900, 3, false, "known", "Renaham in Domesday: farms on the Essex marsh edge."],
  ["Erith", 51.4810, 0.1780, 5, true, "known", "Erhede in Domesday ('gravelly landing place'): a riverside manor with a church; a landing place for ships waiting on the tide."],
  ["Dartford", 51.4460, 0.2160, 6, true, "known", "Tarentefort in Domesday, the ford of the Darent on Watling Street from London to Canterbury; mills on the river."],
  ["Thurrock (Grays)", 51.4770, 0.3240, 4, false, "known", "Turruc in Domesday, on the Essex shore: the name may mean the bilge of a ship, for the hollow of the land."],
  ["Northfleet", 51.4440, 0.3300, 5, true, "known", "Norfluet in Domesday: a large manor of the archbishop of Canterbury, with mills and a fishery."],
  ["Gravesend", 51.4430, 0.3680, 4, false, "known", "Gravesham in Domesday: a small landing place, later the place where ships for London waited for the tide and pilots."],
  ["East Tilbury", 51.4710, 0.4280, 4, true, "known", "Tilaburg, where St Cedd founded a church and community about 653 to convert the East Saxons (Bede)."],
  ["Mucking", 51.4960, 0.4330, 2, false, "known", "On the gravel terrace above: the great excavated Anglo-Saxon settlement of the 5th-7th centuries, over 200 sunken-floored buildings and cemeteries; long abandoned by 1066, now farmland. A few farms."],
  ["Cliffe", 51.4630, 0.4970, 4, true, "known", "Clive in Domesday, on the chalk above the Kent marshes; church councils (Clofesho) may have met near here in the 8th century."],
  ["Canvey", 51.5150, 0.5800, 2, false, "known", "Marsh islands grazed by sheep: Essex flocks on the coastal marshes were famous, and cheese was made from their milk."],
  ["Benfleet", 51.5470, 0.5600, 4, true, "known", "Here in 893 the English stormed the Viking leader Haesten's fortress and captured his ships, wives and children (the Anglo-Saxon Chronicle); burnt timbers and skeletons were found in the 19th century."],
  ["Prittlewell", 51.5520, 0.7100, 5, true, "known", "Pritteuuella in Domesday. In 2003 a richly furnished 7th-century royal burial chamber was found here, perhaps of Sæxa, brother of King Sæberht of the East Saxons."],
  ["Shoebury", 51.5300, 0.7900, 3, false, "known", "Where the Danes built a fortified camp in 894 (the Chronicle); the bank of their camp survived into modern times."],
  ["Minster in Sheppey", 51.4220, 0.8100, 5, true, "known", "On the Isle of Sheppey, the nunnery founded about 670 by Queen Seaxburh; Viking fleets wintered on Sheppey in 855. Across the estuary's mouth, the sea."]].map(([name, lat, lon, n, church, tag, text]) => { const [x, z] = LL(lat, lon); return { name, x, z, n, church, tag, text, rot: hash(x | 0, z | 0) * Math.PI }; });
// post windmills (1285): the whole timber body turns on a great post to face the wind; four sails of cloth on lattice frames. The first
// English windmills are recorded in the 1180s; by 1285 they stand on the rising ground round London.
function windmill(x, z, ry, noted) { const gy = groundH(x, z), c = Math.cos(ry), s = Math.sin(ry);
  for (const r of [0, Math.PI / 2]) put("wmtrestle", BOX_G, MAT.wood, x, gy, z, 0.35, 0.35, 6, ry + r); put("wmpost", CYL_G, MAT.wood, x, gy, z, 0.6, 4.2, 0.6);
  put("wmbody", BOX_G, MAT.wood, x, gy + 3.6, z, 3.4, 5.2, 4, ry); put("wmroof", GABLE_G, MAT.shingle, x, gy + 8.8, z, 3.6, 1.6, 4.2, ry); put("wmsteps", BOX_G, MAT.wood, x - s * 3.4, gy + 0.2, z - c * 3.4, 0.9, 0.2, 3.8, ry, -0.85); solid(x, z, 3.4, 4, ry);
  const G = new THREE.Group(); for (let k = 0; k < 4; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7.5, 0.18).translate(0, 3.75, 0), MAT.wood), sail = new THREE.Mesh(new THREE.BoxGeometry(1.5, 5.8, 0.05).translate(0.85, 4.3, 0), M(0xe6dcc6, { side: THREE.DoubleSide })); arm.rotation.z = k * Math.PI / 2; sail.rotation.z = k * Math.PI / 2; G.add(arm, sail); }
  G.position.set(x + s * 2.15, gy + 7.2, z + c * 2.15); G.rotation.y = ry; scene.add(G); WINDMILLS.push(G);
  if (noted) mark("A windmill", x, z, "known", "A post mill, its whole body turned on a great oak post to face the wind; the miller grinds the village's corn and takes a share as toll. Windmills reached England only in the 1180s; in 1066 there were none.", { y: 12, range: 1500, r: 15 }); }
// the Roman and old roads out of London, beyond the streets
for (const [name, w, pts] of [["Oxford Street (the Roman road west)", 6, [[51.5172, -0.1150], [51.5163, -0.1300], [51.5150, -0.1450], [51.5133, -0.1590], [51.5110, -0.1800], [51.5080, -0.2000]]],
  ["Watling Street (Edgware Road)", 6, [[51.5133, -0.1590], [51.5250, -0.1750], [51.5400, -0.1930], [51.5500, -0.2050]]], ["Watling Street (Old Kent Road)", 6, [[51.4975, -0.0930], [51.4930, -0.0850], [51.4860, -0.0700], [51.4790, -0.0560], [51.4720, -0.0400]]],
  ["Stane Street", 6, [[51.4975, -0.0930], [51.4880, -0.1050], [51.4790, -0.1150], [51.4650, -0.1300], [51.4550, -0.1420]]], ["Ermine Street", 6, [[51.5230, -0.0790], [51.5300, -0.0775], [51.5450, -0.0750], [51.5550, -0.0740]]],
  ["the road to Stepney and Colchester", 6, [[51.5148, -0.0680], [51.5165, -0.0560], [51.5190, -0.0430], [51.5240, -0.0250]]], ["the road to Islington", 5, [[51.5168, -0.0970], [51.5250, -0.1000], [51.5365, -0.1030], [51.5450, -0.1050]]],
  ["the lane to Kensington", 4, [[51.5050, -0.1350], [51.5030, -0.1550], [51.5010, -0.1920]]], ["the lane to Chelsea", 4, [[51.4975, -0.1345], [51.4920, -0.1500], [51.4840, -0.1700]]]]) { const S = { name, w, L: line(pts) }; STREETS.push(S); rLine(S.L, w, 1); }
const ROADS_OUT = STREETS.slice(-9);
// land use beyond the town
const FIELD_R = 1100;
function nearVill(x, z) { let best = null, bd = 1e9; for (const V of VILLS) { const d = Math.hypot(V.x - x, V.z - z); if (d < bd) { bd = d; best = V; } } return [best, bd]; }
function landUse(x, z, h) { if (h < 0.6 || CITY.inside(x, z)) return 0; const [V, d] = nearVill(x, z), wet = THAMES.side(x, z) > 0 ? h < 2.2 : h < 1.4;
  if (wet) return 4;   // marsh and meadow
  const wood = fbm(x / 1400 + 31, z / 1400, 3) + (z < -4800 ? 0.22 : 0) + (z > 5200 ? 0.15 : 0) - (d < FIELD_R * (V.n <= 5 ? 0.65 : 1) ? 0.35 : 0) + (x < -1000 && x > -4600 && z < -300 && z > -2900 ? 0.42 : 0);   // with the woods west of the Tyburn (later Hyde Park)
  if (wood > 0.62) return 3;   // woodland
  if (d < FIELD_R * (V.n <= 5 ? 0.65 : 1) || (riverSide(x, z) < 0 && z < -2300 && d < 1900)) return 1;   // open fields
  return fbm(x / 700 + 13, z / 700, 2) > 0.58 ? 5 : 2; }   // heath and commons, or pasture
function ruralColor(x, z, h, c, n1) { if (rIdx(x, z) < 0) for (const S of ROADS_OUT) if (S.L.near(x, z, 6) && S.L.d(x, z) < S.w / 2) return c.setRGB(0.5 + 0.06 * n1, 0.44, 0.33);
  const u = landUse(x, z, h); if (!u) return c;
  if (u === 1) { const [V] = nearVill(x, z), a = V.rot + Math.floor((x * Math.cos(V.rot) + z * Math.sin(V.rot)) / 220) * 1.3 + Math.floor((-x * Math.sin(V.rot) + z * Math.cos(V.rot)) / 220) * 2.1;   // furlongs, each with its own strip direction
      const fu = hash(Math.floor((x * Math.cos(V.rot) + z * Math.sin(V.rot)) / 220), Math.floor((-x * Math.sin(V.rot) + z * Math.cos(V.rot)) / 220)), sel = Math.sin((x * Math.cos(a) + z * Math.sin(a)) / 18 * Math.PI), rid = 0.5 + 0.5 * sel * clampN(1 - (GC_CELL - 2) / 6, 0, 1);
      if (SUMMER) { if (fu < 0.32) c.setRGB(0.62 + 0.06 * rid, 0.54 + 0.05 * rid, 0.27);   // wheat ripe for the sickle
        else if (fu < 0.48) c.setRGB(0.7 + 0.04 * rid, 0.64 + 0.04 * rid, 0.42);   // reaped: stubble, the sheaves stooked
        else if (fu < 0.62) c.setRGB(0.56 + 0.05 * rid, 0.58 + 0.04 * rid, 0.32);   // barley and oats
        else if (fu < 0.78) c.setRGB(0.24 + 0.05 * rid, 0.4 + 0.05 * rid, 0.16);   // beans and peas
        else c.setRGB(0.36 + 0.05 * rid, 0.44 + 0.04 * rid, 0.22); return c; }   // the fallow field, grazed
      if (fu < 0.45) c.setRGB(0.36 + 0.05 * rid, 0.28 + 0.04 * rid, 0.19);   // ploughed, ridge and furrow
      else if (fu < 0.7) c.setRGB(0.36 + 0.04 * rid, 0.34 + 0.05 * rid, 0.2);   // winter corn just showing
      else c.setRGB(0.5 + 0.05 * rid, 0.45 + 0.03 * rid, 0.3); }   // stubble and fallow
  else if (u === 2) c.lerp(SUMMER ? _c1.setRGB(0.26 + 0.05 * n1, 0.44, 0.16) : _c1.setRGB(0.37 + 0.05 * n1, 0.4, 0.24), 0.6);
  else if (u === 3) SUMMER ? c.setRGB(0.18 + 0.04 * n1, 0.27 + 0.04 * n1, 0.12) : c.setRGB(0.27 + 0.05 * n1, 0.22 + 0.03 * n1, 0.16);   // the wood floor
  else if (u === 4) c.lerp(SUMMER ? _c1.setRGB(0.42 + 0.1 * n1, 0.5, 0.26) : _c1.setRGB(0.38, 0.4, 0.27), 0.55);   // (meadows mown for hay in summer)
  else if (u === 5) SUMMER ? c.setRGB(0.26 + 0.05 * n1, 0.4 + 0.03 * n1, 0.15) : c.setRGB(0.45 + 0.05 * n1, 0.36 + 0.03 * n1, 0.25);   // bracken and gorse
  return c; }
// the farms: a dwelling, a barn, a byre or sheds, ricks, a croft with a fence; along the village lane
const FARM_SPOTS = [], MILLS = [];
const MAT_MOAT = new THREE.MeshStandardMaterial({ color: 0x3a4a48, roughness: 0.3, metalness: 0.1 }), WINDMILLS = [];
for (const V of VILLS) { const R = seeded(V.x * 3 + V.z | 0), ux = Math.cos(V.rot), uz = Math.sin(V.rot); const placed = [];
  const free = (x, z, r) => placed.every(([a, b, q]) => Math.hypot(a - x, b - z) > r + q) && baseH(x, z) > 0.8 && !STREETS.some(S => S.L.near(x, z, 8) && S.L.d(x, z) < S.w / 2 + 3);
  const lane = { name: "the village lane of " + V.name, w: 4, L: line([[V.x - ux * 220, V.z - uz * 220], [V.x, V.z], [V.x + ux * 220 + uz * 40, V.z + uz * 220 - ux * 40]], true) }; STREETS.push(lane); ROADS_OUT.push(lane);
  const NV = ERA === 1285 ? Math.round(V.n * 1.6) : V.n; for (let k = 0; k < NV; k++) { const s = (k + 0.5) / NV * lane.L.L, [lx, lz, a] = lane.L.at(s), sg = k % 2 ? 1 : -1, nx = Math.cos(a) * sg, nz = -Math.sin(a) * sg, x = lx + nx * 18, z = lz + nz * 18; if (!free(x, z, 14)) continue;
    const ry = Math.atan2(nx, nz) + (R() - 0.5) * 0.4, c = Math.cos(ry), s2 = Math.sin(ry), at = (u, v) => [x + u * c + v * s2, z - u * s2 + v * c];
    const H = addHouse(x, z, 5.5 + R(), 9 + R() * 3, ry, { door: "-z", kind: "farm" }); placed.push([x, z, 14]);
    const [bx, bz] = at(9, 4); const B = addHouse(bx, bz, 6.5, 12 + R() * 4, ry + Math.PI / 2, { door: "+x", kind: "barn", wall: "plank", roof: "thatch", wh: 3.2 }); B.noEnter = true;   // the barn, threshing floor between its doors
    FARM_SPOTS.push({ x: B.dp[0] + Math.sin(B.dp[2]) * 1.2, z: B.dp[1] + Math.cos(B.dp[2]) * 1.2, h: B.dp[2] + Math.PI, kind: "hammer", role: "eng", what: "thresh" });
    for (let q = 0; q < 2; q++) { const [rx, rz] = at(-6 - q * 4, 10); put("stack", new THREE.ConeGeometry(0.5, 1, 10).translate(0, 0.5, 0), MAT.thatch, rx, groundH(rx, rz), rz, 3.2, 3.6, 3.2); put("rickbase", CYL_G, MAT.thatch, rx, groundH(rx, rz) - 0.2, rz, 3.0, 2.2, 3.0); }   // ricks of unthreshed corn and hay
    const [fx, fz] = at(0, 16); for (const [u, v, len, r] of [[-8, 16, 24, Math.PI / 2], [8, 16, 24, Math.PI / 2], [0, 28, 16, 0]]) { const [px, pz] = at(u, v); put("fence", BOX_G, MAT.wattle, px, groundH(px, pz) - 0.15, pz, 0.1, 1.25, len, ry + r); }   // the croft
    if (R() < 0.5) { const [px, pz] = at(-4, 6); put("well", CYL_G, MAT.wattle, px, groundH(px, pz), pz, 1.2, 0.7, 1.2); }
    if (R() < 0.6) { const [px, pz] = at(3, 22); FARM_SPOTS.push({ x: px, z: pz, h: ry, kind: R() < 0.5 ? "sell" : "hammer", role: R() < 0.5 ? "woman" : "eng", what: "yard" }); } }
  if (ERA === 1285 && (V.church || V.n >= 3)) { const [cx, cz] = [V.x - uz * 30, V.z + ux * 30], C = addChurch(cx, cz, { mat: "rag", roof: "shingle", nl: 14, nw: 6.5, wh: 6.5 }), tx = cx - 14 / 2 - 2.6, gy = groundH(tx, cz);
    put("vtower", BOX_G, MAT.rag, tx, gy - 0.3, cz, 4.6, 13, 4.6); put("vtowercap", CONE4_G, MAT.lead, tx, gy + 12.7, cz, 5, 3.6, 5); put("vtowerwin", BOX_G, MAT.dark, tx - 2.32, gy + 9.5, cz, 0.05, 1.6, 0.7); solid(tx, cz, 4.6, 4.6, 0);
    if (V.n >= 5) { const a = R() * 6.28, mx = V.x + Math.cos(a) * 140, mz = V.z + Math.sin(a) * 140; if (baseH(mx, mz) > 1 && !STREETS.some(S => S.L.near(mx, mz, 30) && S.L.d(mx, mz) < 24)) { walkHall(mx, mz, 9, 18, 6.5, [0.9, 0.85, 0.7], "manor"); rRect(mx, mz, 40, 40, 0, 4);
      for (let q = 0; q < 40; q++) { const u = q / 40 * 4, side = Math.floor(u), f = u - side, [ox, oz] = [[-1, -1 + 2 * f], [-1 + 2 * f, 1], [1, 1 - 2 * f], [1 - 2 * f, -1]][side]; put("moat", BOX_G, MAT_MOAT, mx + ox * 17, groundH(mx + ox * 17, mz + oz * 17) - 0.15, mz + oz * 17, 4.4, 0.2, 4.4); }
      if (V.n >= 7) mark("A moated manor house", mx, mz, "typical", "The lord's house: a hall with its chamber, kitchen and barns, set on an island in a square moat. Hundreds of moated sites were dug in England between about 1200 and 1325, as much for show and to keep out thieves and deer as for defence.", { y: 10, range: 900, r: 20 }); } }
    { let best = null, bh = -1e9; for (let q = 0; q < 24; q++) { const a = q / 24 * 6.28, r = 220 + (q % 3) * 60, wx = V.x + Math.cos(a) * r, wz = V.z + Math.sin(a) * r, h = baseH(wx, wz); if (h > bh && !STREETS.some(S => S.L.near(wx, wz, 20) && S.L.d(wx, wz) < 14)) { bh = h; best = [wx, wz]; } } if (best && bh > 1.5) windmill(best[0], best[1], R() * 6.28, V.name === "Islington" || V.n >= 8); } }
  else if (V.church) { const [cx, cz] = [V.x - uz * 30, V.z + ux * 30]; addChurch(cx, cz, { mat: R() < 0.5 ? "rag" : "plank", roof: R() < 0.5 ? "shingle" : "thatch", nl: 11, nw: 5.5 }); }
  mark(V.name, V.x, V.z, V.tag, V.text + " The farms, fields and lanes shown are typical of such a village, not a survey.", { y: 12, range: 2500, r: 60 }); }
// water mills: a vertical undershot wheel turned by the stream, in a timber mill house. Domesday Book counts some 6,000 mills in England;
// excavated Anglo-Saxon mills include the vertical wheels of Old Windsor and the horizontal mill at Tamworth. No windmills yet (1180s).
const WHEEL_G = (() => { const parts = [[new THREE.TorusGeometry(1.6, 0.08, 5, 20), MT(0, 0, 0)], [new THREE.TorusGeometry(1.6, 0.08, 5, 20), MT(0, 0, 0.5)], [new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8).rotateX(Math.PI / 2), MT(0, 0, 0.25)]];
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; parts.push([new THREE.BoxGeometry(0.08, 3.1, 0.08), new THREE.Matrix4().makeRotationZ(a).multiply(MT(0, 0, 0.25))]); }
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; parts.push([new THREE.BoxGeometry(0.55, 0.06, 0.62), new THREE.Matrix4().makeRotationZ(a).multiply(MT(0, 1.75, 0.25))]); }
  return mergeG(parts); })();
const wheelM = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9, vertexColors: true });
function addMill(lat, lon, L, name, tag, text) { let [x, z] = LL(lat, lon); let best = 0, bd = 1e9; for (let s = 0; s <= L.L; s += 2) { const [px, pz] = L.at(s), d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = s; } }
  const [px, pz, a] = L.at(best), nx = Math.cos(a), nz = -Math.sin(a), mx = px + nx * 7.5, mz = pz + nz * 7.5, bed = groundH(px, pz), wy = bed < WATER - 0.2 ? WATER : bed + 0.12;   // the water surface: the tidal level, or the brook's own
  addHouse(mx, mz, 5, 7, a + Math.PI / 2, { door: "+z", wall: "plank", roof: "thatch", kind: "mill", wh: 3 }).noEnter = true;   // the door faces away from the wheel
  const w = new THREE.Mesh(WHEEL_G, wheelM); w.position.set(px + nx * 2.2, wy + 1.25, pz + nz * 2.2); w.rotation.y = a + Math.PI / 2; scene.add(w);   // the paddles dip into the stream
  put("leat", BOX_G, MAT.wood, px + nx * 2.2, wy - 0.6, pz + nz * 2.2, 2.0, 0.55, 5, a); put("leat", BOX_G, MAT.wood, px + nx * 4.6, wy - 0.6, pz + nz * 4.6, 0.25, 1.6, 6, a); put("axle", CYL_G, MAT.wood, px + nx * 3.4, wy + 1.25, pz + nz * 3.4, 0.22, 2.6, 0.22, a + Math.PI / 2, Math.PI / 2);   // the timber trough guiding water under the wheel
  MILLS.push({ w, x: px, z: pz }); mark(name, mx, mz, tag, text, { y: 6, r: 12, range: 700 }); }
addMill(51.4962, -0.1300, line([[51.4975, -0.1345], [51.4968, -0.1300], [51.4955, -0.1238]]), "The abbey's mill", "inferred", "Westminster Abbey's water mill on the Tyburn: Millbank, just south, is named after it (recorded later in the Middle Ages). A vertical undershot wheel turns a shaft and gears driving the millstones inside; the abbey's tenants had to grind their corn here and pay a share.");
addMill(51.5220, -0.1082, FLEET, "A mill on the Fleet", "inferred", "Mills stood on the Fleet above Holborn (recorded from the 12th century); this one is placed where the stream runs down its valley. The miller took a toll of the flour, a sixteenth or so.");
addMill(51.4700, -0.1730, BROOKS[3], "Battersea mill", "known", "One of the seven mills Domesday Book records at Battersea, on the Falcon Brook. The wheel's shaft drives a pair of millstones, French burr or German lava stones, through wooden gears.");
addMill(51.4680, -0.1720, BROOKS[3], "Battersea mill", "known", "Another of Battersea's seven Domesday mills.");
mark("No windmills", ...LL(51.5560, -0.1000), "absent", "There are no windmills anywhere in England in 1066: the first are recorded in the 1180s. Corn was ground by water mills, or at home with hand querns.", { y: 10, range: 1500 });
// fish weirs and traps along the banks: lines of stakes with wattle, funnelling fish and eels into baskets
{ const R = seeded(410); for (const [lat, lon] of [[51.4925, -0.1225], [51.4860, -0.1350], [51.4815, -0.1600], [51.5050, -0.0600]]) { let [x, z] = LL(lat, lon), k = 0; while (baseH(x, z) > -0.5 && k++ < 80) { const s = THAMES.side(x, z); x -= Math.sign(s) * 0; z += s > 0 ? -2 : 2; }
    for (let q = 0; q < 14; q++) put("weir", CYL_G, MAT.wood, x + q * 1.6, -1.6, z + q * 0.9, 0.12, 2.3 + R() * 0.3, 0.12); put("weirw", BOX_G, MAT.wattle, x + 11, -0.8, z + 6.3, 0.08, 1.0, 25, Math.atan2(1.6, 0.9)); }
  mark("A fish weir", ...LL(51.4925, -0.1225), "typical", "Fish weirs of stakes and wattle in the shallows funnelled salmon, shad and eels into wicker traps; the Thames was lined with them, and later laws tried to keep the channel clear of them.", { y: 3, range: 500 }); }
// trees: woods, hedgerow trees, scattered field trees; bare for winter. Simple far trees in 2 km tiles so unseen ones are skipped.
// a winter tree for woods and fields: three crossed planes painted with a branching crown of bare twigs, cut out by alpha
const TWIG_T = tex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const R = seeded(12);
  const br = (x, y, a, l, wd, d) => { const x2 = x + Math.sin(a) * l, y2 = y - Math.cos(a) * l; g.strokeStyle = d < 2 ? "#3e3228" : "#4e4034"; g.lineWidth = wd; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (d > 7 || l < 3) return; const n = d < 2 ? 3 : 2; for (let k = 0; k < n; k++) br(x2, y2, a + (R() - 0.5) * 1.3 + (k - (n - 1) / 2) * 0.5, l * (0.68 + R() * 0.15), Math.max(0.6, wd * 0.62), d + 1); };
  br(w / 2, h, 0, h * 0.3, 9, 0); });
const TWIG_G = (() => { const P = [], N = [], U = []; for (let k = 0; k < 6; k++) { const q = new THREE.PlaneGeometry(8, 8).translate(0, 4, 0).rotateY(k * Math.PI / 3 + (k >= 3 ? Math.PI : 0)).toNonIndexed(); P.push(...q.attributes.position.array); U.push(...q.attributes.uv.array); for (let i = 0; i < q.attributes.position.count; i++) N.push(0, 1, 0); }   // each plane both ways round, so both faces are lit from above
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); out.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2)); return out; })();   // (normals up: lit like a crown, not a board)
const LEAF_T = LEAFY ? tex(256, 256, (g, w, h) => { g.drawImage(TWIG_T.image, 0, 0); const R = seeded(13); for (let k = 0; k < 900; k++) { const a = R() * 6.283, r = Math.sqrt(R()), x = w / 2 + Math.cos(a) * r * w * 0.46, y = h * 0.42 + Math.sin(a) * r * h * 0.36;   // in leaf: clusters of green over the branches
    g.fillStyle = (AUTUMN ? ["#5a6a24", "#8a7a2a", "#a8742a", "#7a4a1e", "#46602a"] : ["#2e4a1e", "#3a5a24", "#46682c", "#28401a", "#527a34"])[(R() * 5) | 0]; g.beginPath(); g.arc(x, y, 4 + R() * 7, 0, 6.283); g.fill(); } }) : null;
const twigM = new THREE.MeshStandardMaterial({ map: LEAFY ? LEAF_T : TWIG_T, alphaTest: 0.45, side: THREE.FrontSide, roughness: 1 });
const HOLLY_G = mergeG([[new THREE.IcosahedronGeometry(1, 1), MT(0, 1.1, 0, 1.1, 1.3, 1.1)]]), YEW_G = mergeG([[new THREE.CylinderGeometry(0.25, 0.35, 1.5, 6), MT(0, 0.75, 0)], [new THREE.IcosahedronGeometry(2.2, 1), MT(0, 3.4, 0, 1, 1.25, 1)]]);
const hollyM = M(0x1e3a22, { vertexColors: true }), yewM = M(0x1a2e1c, { vertexColors: true });   // the winter evergreens: holly in the woods, yew in the churchyards
const TREE_TILES = [];   // tiles of woodland, drawn only near you
const WOOD_G = mergeG([[new THREE.CylinderGeometry(0.15, 0.3, 5, 5), MT(0, 2.5, 0)], [new THREE.IcosahedronGeometry(3.2, 0), MT(0, 7.0, 0, 1, 1.15, 1)]]), woodM = new THREE.MeshStandardMaterial({ color: 0x5a4c42, roughness: 1, vertexColors: true });
{ const tiles = new Map(), R = seeded(503), X0 = -7500, X1 = 8500, Z0 = -7500, Z1 = 6500, step = IS_HEADSET ? 34 : 26; let n = 0, cap = IS_HEADSET ? 90000 : 200000;
  const NXc = Math.ceil((X1 - X0) / step), NZc = Math.ceil((Z1 - Z0) / step), TOT = NXc * NZc;   // cells visited in a scattered order, so the budget is spread over the whole map
  for (let q = 0; q < TOT && n < cap; q++) { const cell = (q * 7919) % TOT, x = X0 + (cell % NXc) * step, z = Z0 + Math.floor(cell / NXc) * step; const px = x + R() * step, pz = z + R() * step; if (rIdx(px, pz) >= 0) continue;   // the town area has its own trees
    const h = baseH(px, pz); if (h < 0.7) continue; const u = landUse(px, pz, h), p = u === 3 ? 0.6 : u === 4 ? 0.07 : u === 2 ? 0.05 : u === 5 ? 0.06 : u === 1 ? 0.008 : 0; if (!p || R() > p) continue;
    const key = Math.floor(px / 2000) + "," + Math.floor(pz / 2000); if (!tiles.has(key)) tiles.set(key, []); const many = u === 3 ? 3 : 1; for (let m = 0; m < many; m++) { const qx = px + (m ? (R() - 0.5) * step : 0), qz = pz + (m ? (R() - 0.5) * step : 0); tiles.get(key).push([qx, baseH(qx, qz) - 0.3, qz, 0.6 + R() * 0.7, u === 3 && R() < 0.14]); n++; } }   // woods are dense: several trees to a cell, holly beneath
  for (const [key, list] of tiles) { const [tx, tz] = key.split(",").map(v => (+v + 0.5) * 2000); for (const [geo, mat, sel] of [[TWIG_G, twigM, t => !t[4]], [HOLLY_G, hollyM, t => t[4]]]) { const L = list.filter(sel); if (!L.length) continue; const im = new THREE.InstancedMesh(geo, mat, L.length); TREE_TILES.push({ im, x: tx, z: tz }); L.forEach(([x, y, z, s], i) => { O3.position.set(x, y, z); O3.rotation.set(0, s * 9, 0); O3.scale.set(s, s, s); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }); im.computeBoundingSphere(); scene.add(im); } } }
// trees round the villages down the river, beyond the generated countryside
{ const R = seeded(907), list = []; for (const V of VILLS) { if (V.x < 8500) continue; for (let q = 0; q < 160; q++) { const a = R() * 6.283, r = 300 + R() * 1500, x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r, h = baseH(x, z); if (h < 1.2) continue; const u = landUse(x, z, h); if (u === 1 && R() < 0.85) continue; list.push([x, h - 0.3, z, 0.7 + R() * 0.6]); } }
  const tiles = new Map(); for (const t of list) { const k = Math.floor(t[0] / 4000) + "," + Math.floor(t[2] / 4000); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(t); }
  for (const [, L] of tiles) { const im = new THREE.InstancedMesh(TWIG_G, twigM, L.length); L.forEach(([x, y, z, s], i) => { O3.position.set(x, y, z); O3.rotation.set(0, s * 9, 0); O3.scale.set(s, s, s); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }); im.computeBoundingSphere(); scene.add(im); } }
// pollard willows and alders along the brooks; trees along the lanes and roads; yews in the churchyards
{ const R = seeded(1201), W = [], Y = [];
  for (const L of [...BROOKS, TYB_N, TYB_S, TYB_W, FLEET, WALBROOK]) for (let s = 0; s < L.L; s += 9) { const [x, z, a] = L.at(s); for (const sg of [-1, 1]) { if (R() < 0.35) continue; const o = 4 + R() * 4, px = x + Math.cos(a) * o * sg, pz = z - Math.sin(a) * o * sg, h = baseH(px, pz); if (h < 0.4 || CITY.inside(px, pz) || rGet(px, pz) === 2 || rGet(px, pz) === 1) continue; W.push([px, h - 0.2, pz, 0.45 + R() * 0.25]); } }
  for (const S of ROADS_OUT) for (let s = 0; s < S.L.L; s += 14) { if (R() < 0.45) continue; const [x, z, a] = S.L.at(s), sg = R() < 0.5 ? -1 : 1, o = S.w / 2 + 2.5 + R() * 2, px = x + Math.cos(a) * o * sg, pz = z - Math.sin(a) * o * sg, h = baseH(px, pz); if (h < 0.6 || CITY.inside(px, pz)) continue; W.push([px, h - 0.2, pz, 0.7 + R() * 0.5]); }
  for (const C of CHURCHES) for (let k = 0; k < (R() < 0.5 ? 2 : 1); k++) { const px = C.x - C.nl / 2 - 5 - R() * 5, pz = C.z + (R() < 0.5 ? -1 : 1) * (6 + R() * 4); Y.push([px, groundH(px, pz) - 0.1, pz, 0.8 + R() * 0.4]); }
  for (const [list, geo, mat] of [[W, TWIG_G, twigM], [Y, YEW_G, yewM]]) if (list.length) { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, y, z, s], i) => { O3.position.set(x, y, z); O3.rotation.set(0, i * 2.1, 0); O3.scale.set(s, s, s); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }); im.computeBoundingSphere(); scene.add(im); } }
// vineyards: Domesday Book (1086) records vineyards at Kensington and at Holborn (some "newly planted", so not all were there in 1066). In winter: pruned vines on stakes
for (const [lat, lon, name] of [[51.5030, -0.1880, "Kensington"], [51.5190, -0.1110, "Holborn"]]) { const [cx, cz] = LL(lat, lon); for (let r = 0; r < 14; r++) for (let k = 0; k < 22; k++) { const x = cx - 22 + k * 2, z = cz - 14 + r * 2.1; if (baseH(x, z) < 1) continue; put("vine", CYL_G, MAT.wood, x, groundH(x, z), z, 0.05, 1.3, 0.05); put("vinestem", CYL_G, M(0x4a3a2a), x, groundH(x, z), z, 0.09, 0.6, 0.09); }
  mark("A vineyard at " + name, cx, cz, "known", "Domesday Book (1086) records vineyards in Middlesex, at Kensington and at Holborn among others; some are described as newly planted, so this one may not yet have been here in 1066. English wine was made in the south until the climate cooled in the later Middle Ages. In winter the vines are pruned back to their stakes.", { y: 3, r: 25, range: 400 }); }
// animals in the fields: sheep on the pastures, cattle on the meadows, pigs in the woods; on the market day a plough team of eight oxen
const COW_G = mergeG([[new THREE.CapsuleGeometry(0.38, 0.95, 4, 10).rotateX(Math.PI / 2), MT(0, 0.98, 0, 0.92, 1, 1)], [new THREE.CylinderGeometry(0.16, 0.22, 0.45, 8).rotateX(-1.0), MT(0, 1.05, 0.72)], [new THREE.CapsuleGeometry(0.15, 0.25, 3, 8).rotateX(Math.PI / 2 + 0.5), MT(0, 0.92, 1.0)],   // body, neck, head
  ...[[0.2, 0.5], [-0.2, 0.5], [0.2, -0.5], [-0.2, -0.5]].map(([x, z]) => [new THREE.CylinderGeometry(0.095, 0.075, 0.7, 7), MT(x, 0.35, z)]),
  [new THREE.ConeGeometry(0.03, 0.2, 4), MT(0.12, 1.12, 1.0, 1, 1, 1, 0, -0.9)], [new THREE.ConeGeometry(0.03, 0.2, 4), MT(-0.12, 1.12, 1.0, 1, 1, 1, 0, 0.9)], [new THREE.CylinderGeometry(0.02, 0.01, 0.6, 4), MT(0, 0.8, -0.85, 1, 1, 1, 0.2, 0)]]);
// the plough: beam, handles, coulter and share; and the yokes over each pair of oxen
const PLOUGH_G = mergeG([[new THREE.BoxGeometry(0.12, 0.12, 2.6), MT(0, 0.6, 0.2, 1, 1, 1, 0.15, 0)], [new THREE.BoxGeometry(0.06, 0.06, 1.1), MT(0.25, 0.75, -1.0, 1, 1, 1, -0.7, 0)], [new THREE.BoxGeometry(0.06, 0.06, 1.1), MT(-0.25, 0.75, -1.0, 1, 1, 1, -0.7, 0)], [new THREE.BoxGeometry(0.3, 0.15, 0.6), MT(0, 0.1, -0.6)], [new THREE.BoxGeometry(0.05, 0.6, 0.12), MT(0, 0.3, 0.6)]]);
const YOKE_G = mergeG([[new THREE.BoxGeometry(1.7, 0.1, 0.12), MT(0, 1.42, 0.55)]]);
const FIELD_BEASTS = [];
{ const R = seeded(611); for (const V of VILLS) { for (let f = 0; f < 2; f++) { const a = R() * 6.28, r = 300 + R() * 500, cx = V.x + Math.cos(a) * r, cz = V.z + Math.sin(a) * r, u = landUse(cx, cz, baseH(cx, cz));
      const sp = u === 3 ? "pig" : u === 4 ? "cow" : "sheep", n = sp === "cow" ? 6 : sp === "pig" ? 8 : 16; for (let k = 0; k < n; k++) FIELD_BEASTS.push({ sp, cx: cx + (R() - 0.5) * 30, cz: cz + (R() - 0.5) * 30, ph: R() * 100, x: 0, z: 0, h: 0 });
      if (sp !== "pig") FARM_SPOTS.push({ x: cx + 8, z: cz + 6, h: R() * 6, kind: "guard", role: R() < 0.3 ? "child" : "eng", what: sp === "sheep" ? "shepherd" : "herd" }); } }
  if (MARKET) for (const V of VILLS.slice(0, 6)) { const a = V.rot, cx = V.x + Math.cos(a + 1) * 420, cz = V.z + Math.sin(a + 1) * 420; for (let k = 0; k < 8; k++) FIELD_BEASTS.push({ sp: "ox", team: { cx, cz, a, k }, ph: 0, x: 0, z: 0, h: 0 }); FARM_SPOTS.push({ plough: { cx, cz, a }, role: "eng", kind: "walk", what: "plough" }); } }
const PLOUGHS = FARM_SPOTS.filter(f => f.plough).map(f => f.plough), ploughIM = new THREE.InstancedMesh(PLOUGH_G, MAT.wood, Math.max(1, PLOUGHS.length)), yokeIM = new THREE.InstancedMesh(YOKE_G, MAT.wood, Math.max(1, PLOUGHS.length * 4)); ploughIM.frustumCulled = yokeIM.frustumCulled = false; scene.add(ploughIM, yokeIM);
// harvest (Lammas, 1 August): reapers with sickles in the ripe wheat, women binding sheaves, stooks standing in the reaped strips
const furlongFu = (x, z) => { const [V] = nearVill(x, z); return hash(Math.floor((x * Math.cos(V.rot) + z * Math.sin(V.rot)) / 220), Math.floor((-x * Math.sin(V.rot) + z * Math.cos(V.rot)) / 220)); };
const STOOK_G = mergeG([[new THREE.ConeGeometry(0.45, 1.3, 7), MT(0, 0.65, 0)], [new THREE.CylinderGeometry(0.42, 0.5, 0.35, 7), MT(0, 0.18, 0)]]), STOOKS = [];
if (SUMMER) { const R = seeded(1801); for (const V of VILLS) { if (Math.abs(V.x) > 9000) continue; for (let k = 0; k < 260; k++) { const a = R() * 6.283, r = 120 + R() * 600, x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r, h = baseH(x, z); if (landUse(x, z, h) !== 1) continue; const fu = furlongFu(x, z);
      if (fu >= 0.32 && fu < 0.48) STOOKS.push([x, h - 0.05, z]); else if (fu < 0.32 && k % 23 === 0) { FARM_SPOTS.push({ x, z, h: R() * 6.28, kind: "reap", role: "eng", what: "reap" }); FARM_SPOTS.push({ x: x + 2.5, z: z + 1.2, h: R() * 6.28, kind: k % 2 ? "reap" : "sell", role: "woman", what: "bind" }); } } }
  const tilesS = new Map(); for (const s of STOOKS) { const key = Math.floor(s[0] / 2000) + "," + Math.floor(s[2] / 2000); if (!tilesS.has(key)) tilesS.set(key, []); tilesS.get(key).push(s); }
  for (const [key, L] of tilesS) { const [tx, tz] = key.split(",").map(v => (+v + 0.5) * 2000), im = new THREE.InstancedMesh(STOOK_G, M(0xc8a860, { vertexColors: true }), L.length); L.forEach(([x, y, z], i) => { O3.position.set(x, y, z); O3.rotation.set(0, i, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }); im.computeBoundingSphere(); scene.add(im); TREE_TILES.push({ im, x: tx, z: tz }); }
  mark("Harvest", ...((V => [V.x + 300, V.z + 200])(VILLS[0])), "typical", "Lammas, 1 August: 'loaf-mass', when bread baked from the first of the new wheat was blessed in church. The corn harvest is beginning: men reap with sickles, cutting the stalks high; women and children bind the sheaves and set them up in stooks to dry; the stubble is left for the animals to graze. The hay was mown in June and July.", { y: 3, range: 900, r: 60 }); }
const fieldIM = {}; for (const [sp, geo, col] of [["cow", COW_G, 0x6a4a34], ["ox", COW_G, 0x8a6a4a], ["sheep", SHEEP_G, 0xc8bca4], ["pig", PIG_G, 0x4e4038]]) { const n = FIELD_BEASTS.filter(b => b.sp === sp).length; if (!n) continue; const im = new THREE.InstancedMesh(geo, M(col, { vertexColors: geo.attributes.color ? true : false }), n); im.frustumCulled = false; scene.add(im); fieldIM[sp] = im; }
const ploughAt = (P, t) => { const L = 180, s = (t * 0.6) % (2 * L), back = s > L, u = back ? 2 * L - s : s, lane = Math.floor(t * 0.6 / (2 * L)) % 6, dx = Math.cos(P.a) * (back ? -1 : 1), dz = Math.sin(P.a) * (back ? -1 : 1);   // up and down the furlong, a furrow over each turn
  return [P.cx + Math.cos(P.a) * (u - L / 2) - Math.sin(P.a) * lane * 4, P.cz + Math.sin(P.a) * (u - L / 2) + Math.cos(P.a) * lane * 4, Math.atan2(dx, dz)]; };
function countryStep(t) { const cnt = {}; for (const k in fieldIM) cnt[k] = 0; for (const B of FIELD_BEASTS) { const im = fieldIM[B.sp];
    if (B.team) { const [x, z, h] = ploughAt(B.team, SIM), fx = Math.sin(h), fz = Math.cos(h), row = Math.floor(B.team.k / 2), side = B.team.k % 2 ? 0.7 : -0.7; B.x = x + fx * (3 + row * 2.4) + fz * side; B.z = z + fz * (3 + row * 2.4) - fx * side; B.h = h; }   // four yoke-pairs ahead of the plough
    else { const a = t * 0.02 + B.ph; B.x = B.cx + Math.cos(a) * 6 + Math.sin(a * 0.37) * 4; B.z = B.cz + Math.sin(a * 1.1) * 6; B.h = a + Math.PI / 2 + Math.sin(t * 0.3 + B.ph); }
    if (Math.abs(B.x - P_.x) > 500 || Math.abs(B.z - P_.z) > 500) continue;   // only the animals near you are drawn
    O3.position.set(B.x, groundH(B.x, B.z), B.z); O3.rotation.set(0, B.h, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(cnt[B.sp]++, O3.matrix); }
  for (const k in fieldIM) fieldIM[k].count = cnt[k];
  PLOUGHS.forEach((P, i) => { const [x, z, h] = ploughAt(P, SIM), fx = Math.sin(h), fz = Math.cos(h); O3.position.set(x + fx * 1.2, groundH(x, z), z + fz * 1.2); O3.rotation.set(0, h, 0); O3.updateMatrix(); ploughIM.setMatrixAt(i, O3.matrix);
    for (let r = 0; r < 4; r++) { const d = 3 + r * 2.4; O3.position.set(x + fx * d, groundH(x + fx * d, z + fz * d), z + fz * d); O3.updateMatrix(); yokeIM.setMatrixAt(i * 4 + r, O3.matrix); } });
  ploughIM.instanceMatrix.needsUpdate = yokeIM.instanceMatrix.needsUpdate = true;
  for (const k in fieldIM) fieldIM[k].instanceMatrix.needsUpdate = true;
  if ((t * 2 | 0) !== countryStep.tk) { countryStep.tk = t * 2 | 0; for (const T of TREE_TILES) T.im.visible = Math.max(Math.abs(T.x - P_.x), Math.abs(T.z - P_.z)) < 2600; }
  for (const Mi of MILLS) if (Math.abs(Mi.x - P_.x) < 600 && Math.abs(Mi.z - P_.z) < 600) Mi.w.rotateZ(-0.012); }   // the wheels turn
if (MARKET) mark("A plough team", ...((P => [P.cx, P.cz])(FARM_SPOTS.find(f => f.plough).plough)), "typical", "Eight oxen yoked in pairs pulling a heavy plough with a coulter and a mouldboard that turns the sod: Domesday Book measures land in such 'ploughs'. Winter ploughing readied the fallow for spring sowing; a ploughman and a boy with a goad.", { y: 4, range: 600, r: 30 });

// ---------- traffic on the river ----------
// The Thames was London's highway. The tolls at Billingsgate (IV Æthelred, about 1000) name ships from Rouen with wine, from Flanders,
// Ponthieu, Normandy and France, and the 'men of the emperor' from Germany. Seagoing ships, clinker-built with one mast and a square sail
// (striped, as in the Bayeux Tapestry), lay below the bridge; river barges and rowing boats went up and down past it, carrying grain,
// stone, timber, firewood and passengers; fishermen worked the weirs. On Christmas Day, a holy day, there is little traffic.
const sailT = tex(64, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16) % 2 ? "#e8dcc4" : "#a8302a"; g.fillRect(x, 0, 16, h); } g.fillStyle = "rgba(0,0,0,.12)"; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1); });
const sailM = new THREE.MeshStandardMaterial({ map: sailT, side: THREE.DoubleSide, roughness: 0.9 }), sailPlainM = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, side: THREE.DoubleSide, roughness: 0.9 });
const CREW_G = mergeG([[new THREE.CylinderGeometry(0.14, 0.2, 0.55, 7), MT(0, 0.28, 0)], [new THREE.SphereGeometry(0.1, 7, 5), MT(0, 0.68, 0)]]);   // seated oarsmen, seen from afar
const SAIL_G = (() => { const g = new THREE.PlaneGeometry(1, 1, 4, 4), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.12 * (1 - Math.pow(p.getX(i) * 2, 2)) * (0.5 - p.getY(i))); g.computeVertexNormals(); return g; })();   // bellied by the wind
const BRIDGE_S = (() => { let best = 0, bd = 1e9; for (let s = 0; s < THAMES.L; s += 10) { const [x, z] = THAMES.at(s), d = Math.hypot(x - BRIDGE.P[0][0], z - BRIDGE.P[0][1]); if (d < bd) { bd = d; best = s; } } return best; })();
const RIVER_BOATS = [];
{ const R = seeded(707), n = MARKET ? 42 : 14;
  for (let k = 0; k < n; k++) { const r = R(), type = r < 0.28 ? "ship" : r < 0.6 ? "barge" : r < 0.88 ? "rowboat" : "fisher";
    const s0 = type === "ship" ? BRIDGE_S + 120 : 300, s1 = type === "ship" ? THAMES.L - 200 : THAMES.L - 300;   // ships stay below the bridge
    const len = type === "ship" ? 15 + R() * 6 : type === "barge" ? 11 + R() * 4 : type === "rowboat" ? 5.5 + R() * 1.5 : 6, speed = type === "ship" ? 1.4 : type === "barge" ? 0.9 : type === "rowboat" ? 1.8 : 0.15;
    if (type === "ship" && k % 4 === 1 && ERA !== 1285) { RIVER_BOATS.push({ type, len, speed: 1.1, s0: BRIDGE_S - 640, s1: THAMES.L - 300, s: BRIDGE_S - 300 + R() * 900, dir: R() < 0.5 ? 1 : -1, lane: (R() - 0.5) * 120, ph: R() * 10, crew: 8, cargo: null, sail: sailM, through: true }); continue; }   // ships that lower their masts to pass the bridge
    if (k % 3 === 2) { RIVER_BOATS.push({ type, len, speed: speed * (0.8 + R() * 0.4), s0: 300, s1: LOWER.L - 2000, s: 300 + R() * (LOWER.L - 2300), dir: R() < 0.5 ? 1 : -1, lane: (R() - 0.5) * 300, ph: R() * 10, crew: type === "ship" ? 6 : 2, cargo: type === "barge" ? "grain" : null, sail: sailM, lower: true }); continue; }   // traffic on the lower river
    RIVER_BOATS.push({ type, len, speed: speed * (0.8 + R() * 0.4), s0, s1, s: s0 + R() * (s1 - s0), dir: R() < 0.5 ? 1 : -1, lane: (R() - 0.5) * 220, ph: R() * 10, crew: type === "ship" ? 6 : type === "barge" ? 3 : type === "rowboat" ? 2 : 2, cargo: type === "barge" ? ["stone", "grain", "wood", "barrels"][(R() * 4) | 0] : null, sail: type === "ship" && R() < 0.6 ? sailM : sailPlainM }); } }
const COG = ERA === 1285, RB = { cog: new THREE.InstancedMesh(COG_G, MAT.tar, RIVER_BOATS.length), castle: new THREE.InstancedMesh(BOX_G, MAT.wood, RIVER_BOATS.length * 2), rudder: new THREE.InstancedMesh(BOX_G, MAT.tar, RIVER_BOATS.length), hull: new THREE.InstancedMesh(BOAT_G, MAT.tar, RIVER_BOATS.length), crew: new THREE.InstancedMesh(CREW_G, M(0x6a5444, { vertexColors: true }), RIVER_BOATS.reduce((a, b) => a + b.crew, 0)), oar: new THREE.InstancedMesh(BOX_G, MAT.wood, RIVER_BOATS.reduce((a, b) => a + b.crew * 2, 0)),
  mast: new THREE.InstancedMesh(CYL_G, MAT.wood, RIVER_BOATS.length), sailS: new THREE.InstancedMesh(SAIL_G, sailM, RIVER_BOATS.length), sailP: new THREE.InstancedMesh(SAIL_G, sailPlainM, RIVER_BOATS.length), cargo: new THREE.InstancedMesh(BOX_G, M(0x8a7a62), RIVER_BOATS.length * 4), post: new THREE.InstancedMesh(BOX_G, MAT.tar, RIVER_BOATS.length * 2), floor: new THREE.InstancedMesh(BOX_G, MAT.wood, RIVER_BOATS.length) };
for (const k in RB) { RB[k].frustumCulled = false; RB[k].instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(RB[k]); }
const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _bv = V3(0, 0, 0), _bs = V3(1, 1, 1), _be = new THREE.Euler();
const local = (x, y, z, h, lx, ly, lz) => [x + Math.cos(h) * lx + Math.sin(h) * lz, y + ly, z - Math.sin(h) * lx + Math.cos(h) * lz];
function setI(im, i, x, y, z, h, sx, sy, sz, rx = 0, rz = 0) { _be.set(rx, h, rz, "YXZ"); _bq.setFromEuler(_be); _bm.compose(_bv.set(x, y, z), _bq, _bs.set(sx, sy, sz)); im.setMatrixAt(i, _bm); }
function boatsStep(t, dt) { let ci = 0, oi = 0, gi = 0, si = 0, pi = 0, pj = 0;
  RIVER_BOATS.forEach((B, i) => { if (B.type !== "fisher") { B.s += B.dir * B.speed * dt; if (B.s > B.s1 || B.s < B.s0) { B.dir *= -1; B.s = clampN(B.s, B.s0, B.s1); } } else B.s += Math.sin(t * 0.05 + B.ph) * 0.05 * dt;
    const [cx, cz, a] = (B.lower ? LOWER : THAMES).at(B.s), nx = Math.cos(a), nz = -Math.sin(a), [x, z] = B.lower ? [cx + nx * B.lane, cz + nz * B.lane] : archSnap(cx + nx * B.lane, cz + nz * B.lane), h = a + (B.dir < 0 ? Math.PI : 0), bob = Math.sin(t * 1.3 + B.ph) * 0.05, far = Math.abs(x - P_.x) > 1600 || Math.abs(z - P_.z) > 1600;
    const cog = COG && B.type === "ship", sc = far ? 0 : 1, beam = B.len * (cog ? 0.32 : B.type === "ship" ? 0.24 : B.type === "barge" ? 0.33 : 0.3), depth = cog ? 2.6 : B.type === "ship" ? 1.7 : 0.8, y = WATER - depth * 0.55 + bob;
    setI(cog ? RB.cog : RB.hull, i, x, y, z, h, beam * sc, depth * sc, B.len * sc, Math.sin(t * 0.9 + B.ph) * 0.02, Math.sin(t * 0.7 + B.ph) * 0.03); setI(cog ? RB.hull : RB.cog, i, 0, -999, 0, 0, 0, 0, 0);
    if (cog) { const [ax, , az] = local(x, y, z, h, 0, 0, -B.len * 0.36), [fx, , fz] = local(x, y, z, h, 0, 0, B.len * 0.38), [rx, , rz] = local(x, y, z, h, 0, 0, -B.len * 0.49); setI(RB.castle, i * 2, ax, y + depth, az, h, beam * 0.92 * sc, 1.7 * sc, B.len * 0.22 * sc); setI(RB.castle, i * 2 + 1, fx, y + depth, fz, h, beam * 0.8 * sc, 1.3 * sc, B.len * 0.16 * sc); setI(RB.rudder, i, rx, y - 0.6, rz, h, 0.18 * sc, (depth + 0.8) * sc, 1.1 * sc); }
    else { setI(RB.castle, i * 2, 0, -999, 0, 0, 0, 0, 0); setI(RB.castle, i * 2 + 1, 0, -999, 0, 0, 0, 0, 0); setI(RB.rudder, i, 0, -999, 0, 0, 0, 0, 0); } setI(RB.floor, i, x, WATER + 0.03 + bob, z, h, beam * 0.72 * sc, 0.05 * sc, B.len * 0.78 * sc);   // bottom boards, over the water
    for (const e of [-1, 1]) { const [px, py, pz] = local(x, y, z, h, 0, depth * 0.9, e * B.len * 0.48); setI(RB.post, pi++, px, py, pz, h, 0.18 * sc, (B.type === "ship" ? 1.4 : 0.6) * sc, 0.25 * sc, -e * 0.4); }   // stem and stern posts
    const struck = B.through && Math.abs(B.s - BRIDGE_S) < 110, sailing = B.type === "ship" && !struck;
    if (struck) { const [mx, , mz] = local(x, y, z, h, 0, 0, -B.len * 0.1); setI(RB.mast, i, mx, y + depth * 0.95, mz, h, 0.25 * sc, B.len * 0.6 * sc, 0.25 * sc, Math.PI / 2); setI(RB.sailS, i, 0, -999, 0, 0, 0, 0, 0); setI(RB.sailP, i, 0, -999, 0, 0, 0, 0, 0); }   // mast lowered onto its crutch
    else if (sailing) { const mh = cog ? 0.8 : 0.6, sw = cog ? 0.55 : 0.45, sh = cog ? 0.45 : 0.38; const [mx, , mz] = local(x, y, z, h, 0, 0, 0); setI(RB.mast, i, mx, y + 0.5, mz, h, 0.25 * sc, B.len * mh * sc, 0.25 * sc); const [sx, sy, sz] = local(x, y, z, h, 0, B.len * 0.38, 0.2);
      setI(B.sail === sailM ? RB.sailS : RB.sailP, i, sx, y + 0.5 + B.len * (mh - 0.25), sz, h + Math.PI, B.len * sw * sc, B.len * sh * sc, 1); setI(B.sail === sailM ? RB.sailP : RB.sailS, i, 0, -999, 0, 0, 0, 0, 0); }
    else { setI(RB.mast, i, 0, -999, 0, 0, 0, 0, 0); setI(RB.sailS, i, 0, -999, 0, 0, 0, 0, 0); setI(RB.sailP, i, 0, -999, 0, 0, 0, 0, 0); }
    const rowing = (B.type !== "ship" || struck) && B.type !== "fisher", stroke = Math.sin(t * 2.2 + B.ph);
    for (let k = 0; k < B.crew; k++) { const lz = (k - (B.crew - 1) / 2) * (B.len * 0.7 / Math.max(1, B.crew)); const [px, py, pz] = local(x, y, z, h, 0, depth * 0.45, lz); setI(RB.crew, ci++, px, py, pz, h + (rowing ? Math.PI : 0), sc, sc, sc, rowing ? 0.25 * stroke : 0);
      for (const e of [-1, 1]) { const [ox, oy, oz] = local(x, y, z, h, e * beam * 0.55, depth * 0.55, lz); setI(RB.oar, oi++, ox, oy, oz, h + e * (rowing ? 0.4 * stroke : 0) + Math.PI / 2, (rowing || B.type === "ship" && k < 2 ? 2.6 : 0) * sc, 0.06 * sc, 0.06 * sc, 0, e * 0.25); } }
    for (let k = 0; k < 4; k++) { if (!B.cargo) { setI(RB.cargo, gi++, 0, -999, 0, 0, 0, 0, 0); continue; } const [px, py, pz] = local(x, y, z, h, (k % 2 - 0.5) * beam * 0.4, depth * 0.55, (Math.floor(k / 2) - 0.5) * B.len * 0.3);
      const S = { stone: [0.8, 0.5, 0.7], grain: [0.7, 0.45, 0.9], wood: [0.6, 0.4, B.len * 0.28], barrels: [0.6, 0.7, 0.6] }[B.cargo]; setI(RB.cargo, gi++, px, py, pz, h, S[0] * sc, S[1] * sc, S[2] * sc); } });
  for (const k in RB) RB[k].instanceMatrix.needsUpdate = true; }
if (ERA !== 1285) mark("Ships below the bridge", ...THAMES.at(BRIDGE_S + 260).slice(0, 2), "known", "Seagoing ships could not pass the low timber bridge: they moored and unloaded at Billingsgate and along the shore below it. The tolls of about 1000 list wine ships from Rouen, ships from Flanders, Ponthieu, Normandy and France, and the emperor's men from Germany, who paid in pepper, gloves and vinegar at Christmas and Easter. Their sails were striped, as the Bayeux Tapestry shows.", { y: 8, range: 1500, r: 80 });
mark("River traffic", ...THAMES.at(BRIDGE_S - 700).slice(0, 2), "typical", "Above the bridge: barges rowed and poled with grain, stone (Caen stone for the abbey, Kentish rag), timber and firewood; ferries and passenger boats; fishermen at their weirs. " + (MARKET ? "A busy market day." : "Christmas Day, a holy day: few boats are out."), { y: 6, range: 1500, r: 80 });
if (ERA !== 1285) mark("Passing the bridge", ...THAMES.at(BRIDGE_S - 60).slice(0, 2), "inferred", "The timber bridge stood on rows of trestles a few metres apart. Its height is not known, but ships could row under it: the sagas tell how in 1014 King Olaf's ships, roofed over with wattle against the stones thrown down on them, rowed up beneath the bridge and tied ropes round its piles to pull it down. It also had to clear the highest tides and winter floods (the tidal range was smaller than today's 7 m). Here the deck is about 4.5 m above high water, more at low tide. Barges and boats rowed through the gaps, best at slack water; seagoing ships lowered their masts and rowed through, or unloaded below the bridge at Billingsgate.", { y: 6, range: 800, r: 40 });
if (ERA === 1285) mark("Ships below the bridge", ...THAMES.at(BRIDGE_S + 260).slice(0, 2), "known", "Seagoing ships moor below the bridge and unload at Billingsgate and the quays. Ship design has changed since 1066: these are cogs, high-sided, flat-bottomed and broad, carrying far more cargo (wine casks from Gascony, wool sacks outward), with castles at bow and stern for archers and a rudder hung on the sternpost instead of a steering oar. Hanseatic merchants from Cologne and Lübeck, with their own hall at the Steelyard, sail them here. The drawbridge can be raised to let ships up to Queenhithe, but by now it rarely is, and the City favours Billingsgate.", { y: 8, range: 1500, r: 80 });
if (ERA === 1285) mark("Shooting the bridge", ...THAMES.at(BRIDGE_S - 60).slice(0, 2), "known", "The starlings under the piers block about two thirds of the river, so as the tide turns the water piles up on one side and pours through the arches in a fall of a metre or more. Watermen 'shoot the bridge' through the rapids; many passengers get out above it and walk round to meet the boat below. Boats were wrecked and people drowned here for centuries.", { y: 6, range: 800, r: 40 });

// ---------- carts, packhorses and riders in the streets ----------
// Anglo-Saxon calendars (the 11th-century Cotton Julius A.vi and Tiberius B.v) show two-wheeled carts drawn by oxen and horses; carters
// hauled firewood, hay, grain, stone and goods into London, and packhorses carried loads on the roads. Norman knights rode about the
// occupied town. On a holy day there was little hauling.
const HORSE_G = mergeG([[new THREE.CapsuleGeometry(0.3, 0.85, 4, 10).rotateX(Math.PI / 2), MT(0, 1.12, 0, 0.9, 1, 1)], [new THREE.CylinderGeometry(0.13, 0.2, 0.7, 8).rotateX(-0.75), MT(0, 1.42, 0.62)], [new THREE.CapsuleGeometry(0.11, 0.38, 3, 8).rotateX(Math.PI / 2 + 0.9), MT(0, 1.62, 0.92)],
  ...[[0.17, 0.48], [-0.17, 0.48], [0.17, -0.48], [-0.17, -0.48]].map(([x, z]) => [new THREE.CylinderGeometry(0.08, 0.055, 0.9, 7), MT(x, 0.45, z)]), [new THREE.ConeGeometry(0.09, 0.6, 6), MT(0, 0.92, -0.75, 1, 1, 1, 0.5, 0)],
  [new THREE.ConeGeometry(0.035, 0.12, 4), MT(0.06, 1.88, 0.86)], [new THREE.ConeGeometry(0.035, 0.12, 4), MT(-0.06, 1.88, 0.86)], [new THREE.BoxGeometry(0.06, 0.32, 0.5), MT(0, 1.62, 0.6, 1, 1, 1, -0.75, 0)]]);   // body, neck, head, legs, tail, ears, mane
const CART_G = mergeG([[new THREE.BoxGeometry(1.3, 0.12, 2.3), MT(0, 0.75, 0)], [new THREE.BoxGeometry(0.06, 0.45, 2.3), MT(0.62, 0.98, 0)], [new THREE.BoxGeometry(0.06, 0.45, 2.3), MT(-0.62, 0.98, 0)], [new THREE.BoxGeometry(1.3, 0.45, 0.06), MT(0, 0.98, -1.12)],
  [new THREE.BoxGeometry(0.07, 0.07, 2.4), MT(0.45, 0.78, 2.2)], [new THREE.BoxGeometry(0.07, 0.07, 2.4), MT(-0.45, 0.78, 2.2)], [new THREE.CylinderGeometry(0.05, 0.05, 1.7, 6).rotateZ(Math.PI / 2), MT(0, 0.55, 0)]]);   // bed, sides, shafts, axle
const WHEEL2_G = (() => { const p = [[new THREE.TorusGeometry(0.55, 0.05, 4, 14), MT(0, 0, 0)], [new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8).rotateX(Math.PI / 2), MT(0, 0, 0)]]; for (let k = 0; k < 6; k++) p.push([new THREE.BoxGeometry(0.05, 1.05, 0.04), new THREE.Matrix4().makeRotationZ(k / 6 * Math.PI)]); return mergeG(p).rotateY(Math.PI / 2); })();
const LOAD_G = { wood: mergeG(Array.from({ length: 6 }, (_, k) => [new THREE.CylinderGeometry(0.12, 0.12, 2.1, 6).rotateX(Math.PI / 2), MT((k % 3 - 1) * 0.3, 0.95 + Math.floor(k / 3) * 0.22, 0)])), hay: G1(new THREE.SphereGeometry(0.8, 8, 5).scale(0.85, 0.55, 1.4).translate(0, 1.2, 0)),
  sacks: mergeG(Array.from({ length: 4 }, (_, k) => [new THREE.SphereGeometry(0.28, 6, 4).scale(1, 0.8, 1.3), MT((k % 2 - 0.5) * 0.55, 1.05, (Math.floor(k / 2) - 0.5) * 0.9)])), barrels: mergeG(Array.from({ length: 3 }, (_, k) => [new THREE.CylinderGeometry(0.28, 0.28, 0.75, 8), MT(0, 1.2, (k - 1) * 0.7)])) };
const PACK_G = mergeG([[new THREE.BoxGeometry(0.32, 0.4, 0.6), MT(0.38, 1.1, 0)], [new THREE.BoxGeometry(0.32, 0.4, 0.6), MT(-0.38, 1.1, 0)], [new THREE.BoxGeometry(0.85, 0.08, 0.7), MT(0, 1.42, 0)]]);
const VEH = []; { const R = seeded(808), n = MARKET ? (IS_HEADSET ? 14 : 22) : 6;
  for (let k = 0; k < n; k++) { const r = R(), type = !MARKET ? (k < 3 ? "rider" : k < 5 ? "pack" : "horsecart") : r < 0.3 ? "oxcart" : r < 0.55 ? "horsecart" : r < 0.75 ? "pack" : "rider";
    VEH.push({ type, load: ["wood", "hay", "sacks", "barrels"][(R() * 4) | 0], mode: "off", S: null, s: 0, dir: 1, v: type === "oxcart" ? 0.8 : type === "rider" ? 1.6 : 1.1, x: 0, z: 0, h: 0, ph: R() * 10, nr: (k % 3) + 1 }); } }
const VIM = { horse: new THREE.InstancedMesh(HORSE_G, M(0x6a4a30, { vertexColors: true }), VEH.length * 2), ox: new THREE.InstancedMesh(COW_G, M(0x8a6a4a, { vertexColors: true }), VEH.length * 2), cart: new THREE.InstancedMesh(CART_G, MAT.wood, VEH.length), wheel: new THREE.InstancedMesh(WHEEL2_G, MAT.wood, VEH.length * 2), pack: new THREE.InstancedMesh(PACK_G, M(0x7a6a4e, { vertexColors: true }), VEH.length) };
const LIM = {}; for (const k in LOAD_G) LIM[k] = new THREE.InstancedMesh(LOAD_G[k], M({ wood: 0x5a4632, hay: 0xb8a060, sacks: 0xb8a888, barrels: 0x6a4e32 }[k], { vertexColors: true }), VEH.length);
for (const m of [...Object.values(VIM), ...Object.values(LIM)]) { m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
{ const c = new THREE.Color(); VEH.forEach((V, i) => { for (const j of [0, 1]) VIM.horse.setColorAt(i * 2 + j, c.setHex([0x6a4a30, 0x3a2a20, 0x8a6a4a, 0x9a9488, 0x2a2018][(i + j) % 5])); }); VIM.horse.instanceColor.needsUpdate = true; }
function placeVehicle(V, px, pz) { for (let t = 0; t < 20; t++) { const S = STREETS[(Math.random() * STREETS.length) | 0], s = Math.random() * S.L.L, [x, z] = S.L.at(s); const d = Math.hypot(x - px, z - pz); if (d > 380 || d < (V.mode === "off" ? 0 : 120) || baseH(x, z) < 0.5) continue;
  V.S = S; V.s = s; V.dir = Math.random() < 0.5 ? 1 : -1; V.mode = "go"; return; } V.mode = "off"; }
const hideI = (im, i) => im.setMatrixAt(i, ZEROM);
function vehStep(t, dt) { const counts = { horse: 0, ox: 0, cart: 0, wheel: 0, pack: 0 }, lc = { wood: 0, hay: 0, sacks: 0, barrels: 0 }, rate = Math.min(timeRate, 8);
  for (const V of VEH) { if (V.mode === "off" || Math.hypot(V.x - P_.x, V.z - P_.z) > 420) { if (Math.random() < 0.05) placeVehicle(V, P_.x, P_.z); }
    if (V.mode === "go") { V.s += V.dir * V.v * dt * rate; if (V.s < 0 || V.s > V.S.L.L) { V.dir *= -1; V.s = clampN(V.s, 0, V.S.L.L); } const [x, z, a] = V.S.L.at(V.s), side = V.dir > 0 ? 1 : -1, lane = Math.min(1.4, V.S.w / 2 - 0.9);
      V.h = V.dir > 0 ? a : a + Math.PI; V.x = x + Math.cos(a) * lane * side; V.z = z - Math.sin(a) * lane * side; }
    const show = V.mode === "go" && Math.hypot(V.x - P_.x, V.z - P_.z) < 420, fx = Math.sin(V.h), fz = Math.cos(V.h), y = show ? Math.max(groundH(V.x, V.z), spanY(V.x, V.z)) : 0, bob = Math.abs(Math.sin(t * 5 + V.ph)) * 0.03;
    const beast = (kind, ox, oz, k) => { const im = VIM[kind], i = counts[kind]++; if (!show) return hideI(im, i); O3.position.set(V.x + fx * oz + fz * ox, y + bob, V.z + fz * oz - fx * ox); O3.rotation.set(0, V.h, 0); O3.scale.set(1, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); };
    if (V.type === "oxcart") { beast("ox", 0.55, 3.0); beast("ox", -0.55, 3.0); counts.horse += 2; } else if (V.type === "horsecart") { beast("horse", 0, 2.6); counts.horse++; counts.ox += 2; } else { beast("horse", 0, 0.4); counts.horse++; counts.ox += 2; }
    const cart = V.type === "oxcart" || V.type === "horsecart", ci = counts.cart++, wi = counts.wheel; counts.wheel += 2;
    if (show && cart) { O3.position.set(V.x, y, V.z); O3.rotation.set(0, V.h, 0); O3.updateMatrix(); VIM.cart.setMatrixAt(ci, O3.matrix); for (const s of [-1, 1]) { O3.position.set(V.x + fz * 0.8 * s, y + 0.55, V.z - fx * 0.8 * s); O3.rotation.set(-V.s * 1.8 * V.dir, V.h, 0, "YXZ"); O3.updateMatrix(); VIM.wheel.setMatrixAt(wi + (s > 0), O3.matrix); }
      const li = lc[V.load]++; O3.position.set(V.x, y, V.z); O3.rotation.set(0, V.h, 0); O3.updateMatrix(); LIM[V.load].setMatrixAt(li, O3.matrix); }
    else { hideI(VIM.cart, ci); hideI(VIM.wheel, wi); hideI(VIM.wheel, wi + 1); }
    const pi = counts.pack++; if (show && V.type === "pack") { O3.position.set(V.x + fx * 0.4, y + bob, V.z + fz * 0.4); O3.rotation.set(0, V.h, 0); O3.updateMatrix(); VIM.pack.setMatrixAt(pi, O3.matrix); } else hideI(VIM.pack, pi);
    V.show = show; }
  for (const k in LIM) { for (let i = lc[k]; i < VEH.length; i++) hideI(LIM[k], i); LIM[k].instanceMatrix.needsUpdate = true; }
  for (const k in VIM) VIM[k].instanceMatrix.needsUpdate = true; }
// where the driver walks (beside the beasts' heads) or the rider sits
function driverAt(V) { const fx = Math.sin(V.h), fz = Math.cos(V.h); if (V.type === "rider") return [V.x + fx * 0.25, V.z + fz * 0.25, V.h, "ride"]; const d = V.type === "oxcart" ? 4.2 : V.type === "horsecart" ? 3.4 : 1.4; return [V.x + fx * d - fz * 0.9, V.z + fz * d + fx * 0.9, V.h, "walk"]; }

// ---------- daily work: what Londoners were doing ----------
// Water was fetched from wells in the yards (timber-lined wells are common finds behind Late Saxon houses) or from the Thames and the
// Walbrook, carried in wooden pails on a shoulder-yoke; firewood was carried in on the back; women spun whenever their hands were free;
// children played in the streets. On working days the crafts were done at the house door for the light: smiths, carpenters, coopers,
// shoemakers, wheelwrights, weavers, bakers; on the shore, boatbuilders and fishermen mending nets; porters carried goods up from the
// hithes. Christmas Day was a holy day: the work stops, but water, fire and food do not.
const WELLS = [...(KIT.well?.list || []).map(([x, , z]) => [x, z]), ...CONDUITS];
const PROP_G = { yoke: mergeG([[new THREE.BoxGeometry(1.25, 0.05, 0.06), MT(0, 1.47, -0.02)], [new THREE.CylinderGeometry(0.14, 0.12, 0.32, 9), MT(0.6, 0.72, 0)], [new THREE.CylinderGeometry(0.14, 0.12, 0.32, 9), MT(-0.6, 0.72, 0)], [new THREE.CylinderGeometry(0.006, 0.006, 0.6, 3), MT(0.6, 1.17, 0)], [new THREE.CylinderGeometry(0.006, 0.006, 0.6, 3), MT(-0.6, 1.17, 0)]]),   // a shoulder-yoke with two pails
  faggot: mergeG(Array.from({ length: 9 }, (_, k) => [new THREE.CylinderGeometry(0.035, 0.035, 1.2, 4), MT((k % 3 - 1) * 0.08, 1.15 + Math.floor(k / 3) * 0.07, -0.2, 1, 1, 1, 0.2, 0.15 * (k % 3 - 1))])),   // a bundle of firewood on the back
  distaff: mergeG([[new THREE.CylinderGeometry(0.012, 0.012, 0.75, 4), MT(0.2, 1.25, 0.12, 1, 1, 1, 0.25, -0.3)], [new THREE.SphereGeometry(0.07, 6, 4), MT(0.3, 1.58, 0.2, 1, 1.6, 1)], [new THREE.CylinderGeometry(0.008, 0.008, 0.25, 3), MT(-0.12, 0.85, 0.2)], [new THREE.CylinderGeometry(0.035, 0.035, 0.03, 8), MT(-0.12, 0.74, 0.2)]]),   // distaff with wool, spindle and whorl
  basket: mergeG([[new THREE.CylinderGeometry(0.22, 0.17, 0.28, 10, 1, true), MT(0.3, 0.98, 0.05)], [new THREE.CylinderGeometry(0.17, 0.17, 0.02, 10), MT(0.3, 0.85, 0.05)]]),
  sack: mergeG([[new THREE.SphereGeometry(0.26, 7, 5), MT(0.12, 1.55, -0.05, 1.5, 0.8, 0.9)]]) };
const NC_PROPS = IS_HEADSET ? 640 : 860;   // one slot per person (as the crowd)
const PROP_COL = { yoke: 0x6a5238, faggot: 0x5a4632, distaff: 0xd8ccb0, basket: 0x8a7452, sack: 0xb8a888 };
const PROPS = {}; for (const k in PROP_G) { const im = new THREE.InstancedMesh(PROP_G[k], M(PROP_COL[k], { vertexColors: true }), NC_PROPS); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.count = 0; scene.add(im);
  PROPS[k] = { im, slot: new Int32Array(NC_PROPS).fill(-1), who: new Int32Array(NC_PROPS), n: 0 }; }   // packed: only the props being carried are drawn
const _pm = new THREE.Matrix4();
function propSet(A, y) { const P = PROPS[A.prop]; if (!P) return; if (P.slot[A.i] < 0) { P.slot[A.i] = P.n; P.who[P.n] = A.i; P.n++; P.im.count = P.n; }
  O3.position.set(A.x, y, A.z); O3.rotation.set(0, A.h, 0); const s = A.L.s; O3.scale.set(s, s, s); O3.updateMatrix(); P.im.setMatrixAt(P.slot[A.i], O3.matrix); P.im.instanceMatrix.needsUpdate = true; }
function propHide(A) { const P = PROPS[A.prop]; if (!P) return; const s = P.slot[A.i]; if (s < 0) return; const last = --P.n, j = P.who[last];
  if (s !== last) { P.im.getMatrixAt(last, _pm); P.im.setMatrixAt(s, _pm); P.slot[j] = s; P.who[s] = j; } P.slot[A.i] = -1; P.im.count = P.n; P.im.instanceMatrix.needsUpdate = true; }
// household tasks for the people in the streets near you
function nearestWell(x, z) { let best = null, bd = 140; for (const W of WELLS) { const d = Math.hypot(W[0] - x, W[1] - z); if (d < bd) { bd = d; best = W; } } return best; }
function placeTask(A, px, pz) { const R = Math.random, r = R(), role = A.L.role;
  if (role === "child" && r < 0.6) { const S = STREETS[(R() * STREETS.length) | 0], [x, z] = S.L.at(R() * S.L.L); if (Math.hypot(x - px, z - pz) > 300 || baseH(x, z) < 0.5) return false; A.mode = "play"; A.c = [x, z]; A.ph = R() * 6; A.prop = null; return true; }   // children chasing each other round
  const H = HOUSES[(R() * HOUSES.length) | 0]; if (!H.dp || H.burnt || H.kind !== "house" || Math.hypot(H.dp[0] - px, H.dp[1] - pz) > 300) return false;
  const door = [H.dp[0] + Math.sin(H.dp[2]) * 1.2, H.dp[1] + Math.cos(H.dp[2]) * 1.2];
  if (r < 0.4) { const W = nearestWell(door[0], door[1]); if (!W) return false; A.mode = "loop"; A.path = [door, [W[0] + 1, W[1] + 1]]; A.prop = "yoke"; A.pause = "sell"; A.task = "water"; }   // fetching water
  else if (r < 0.55 && role === "woman") { A.mode = "fixed"; A.x = door[0] + (R() - 0.5); A.z = door[1] + (R() - 0.5); A.h = H.dp[2] + (R() - 0.5); A.kind = "spin"; A.prop = "distaff"; A.task = "spin"; }   // spinning at the door
  else if (r < 0.75) { const S = STREETS[(R() * STREETS.length) | 0], [sx, sz] = S.L.at(R() * S.L.L); if (Math.hypot(sx - door[0], sz - door[1]) > 160) return false; A.mode = "loop"; A.path = [[sx, sz], door]; A.prop = role === "woman" ? "basket" : "faggot"; A.pause = "stand"; A.task = "carry"; }   // bringing in firewood, or home from errands
  else return false;
  A.v = 0.9 + R() * 0.4; A.u = R() * 60; return true; }
function taskStep(A, dt, rate, t) { if (A.mode === "play") { A.ph += dt * rate * 1.6; A.x = A.c[0] + Math.cos(A.ph) * 3 + Math.cos(A.ph * 2.3) * 1.2; A.z = A.c[1] + Math.sin(A.ph) * 3; A.h = A.ph + Math.PI; A.kind = "walk"; A.walk = 2; return; }
  if (A.mode === "fixed") return;
  const P = A.path, L = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]), cyc = 2 * L / A.v + 30; A.u = (A.u + dt * rate) % cyc; const u = A.u;   // there and back, with a pause at each end (drawing water; at the door)
  if (u < L / A.v) { const f = u * A.v / L; A.x = P[0][0] + (P[1][0] - P[0][0]) * f; A.z = P[0][1] + (P[1][1] - P[0][1]) * f; A.h = Math.atan2(P[1][0] - P[0][0], P[1][1] - P[0][1]); A.kind = "walk"; A.walk = 1; }
  else if (u < L / A.v + 15) { A.x = P[1][0]; A.z = P[1][1]; A.kind = A.pause; A.walk = 0; }
  else if (u < 2 * L / A.v + 15) { const f = 1 - (u - L / A.v - 15) * A.v / L; A.x = P[0][0] + (P[1][0] - P[0][0]) * f; A.z = P[0][1] + (P[1][1] - P[0][1]) * f; A.h = Math.atan2(P[0][0] - P[1][0], P[0][1] - P[1][1]); A.kind = "walk"; A.walk = 1; }
  else { A.x = P[0][0]; A.z = P[0][1]; A.kind = "stand"; A.walk = 0; } }
// workshops at house doors: props, and on working days the craftsman at work
const WORKSHOPS = [];
{ const R = seeded(1066), kinds = ["smith", "smith", "carpenter", "carpenter", "cooper", "shoemaker", "shoemaker", "wheelwright", "weaver", "weaver", "baker", "comb"], used = new Set();
  const cand = HOUSES.filter(H => H.dp && !H.burnt && H.kind === "house" && !H.ale && !H.home && CITY.inside(H.x, H.z));
  for (let k = 0; k < 30 && cand.length; k++) { const H = cand[(R() * cand.length) | 0]; if (used.has(H)) continue; used.add(H); const kind = kinds[k % kinds.length], a = H.dp[2], fx = Math.sin(a), fz = Math.cos(a), sx = Math.cos(a), sz = -Math.sin(a);
    const at = (u, v) => [H.dp[0] + fx * v + sx * u, H.dp[1] + fz * v + sz * u], P = (key, geo, mat, u, v, y, w, h, d, ry = 0) => { const [x, z] = at(u, v); put("ws:" + key, geo, mat, x, groundH(x, z) + y, z, w, h, d, a + ry); };
    let worker = null;
    if (kind === "smith") { P("stump", CYL_G, MAT.wood, 0, 2.2, 0, 0.5, 0.55, 0.5); P("anvil", BOX_G, MAT.iron, 0, 2.2, 0.55, 0.25, 0.25, 0.6); P("forge", BOX_G, MAT.rag, 1.6, 2.4, 0, 1.0, 0.8, 1.0); P("coals", BOX_G, M(0xff6a20, { emissive: 0xff4a10, emissiveIntensity: 0.8 }), 1.6, 2.4, 0.8, 0.6, 0.06, 0.6); P("tub", CYL_G, MAT.wood, -1.0, 2.0, 0, 0.6, 0.5, 0.6); worker = [0, 1.5, "hammer"]; }
    else if (kind === "carpenter") { for (const u of [-1.2, 1.2]) P("trestle", BOX_G, MAT.wood, u, 2.4, 0, 0.12, 0.7, 0.7); P("beam", BOX_G, MAT.wood, 0, 2.4, 0.7, 3.4, 0.3, 0.3); worker = [0.4, 1.8, "hammer"]; }
    else if (kind === "cooper") { for (let q = 0; q < 3; q++) P("barrel", CYL_G, MAT.wood, -1.2 + q * 0.7, 2.6, 0, 0.6, 0.85, 0.6); P("hoop", new THREE.TorusGeometry(0.35, 0.03, 4, 14).rotateX(Math.PI / 2), MAT.iron, 0.9, 2.1, 0.6, 1, 1, 1); worker = [0.9, 1.5, "hammer"]; }
    else if (kind === "shoemaker") { P("bench", BOX_G, MAT.wood, 0, 1.6, 0, 1.6, 0.42, 0.45); for (let q = 0; q < 4; q++) P("shoe", BOX_G, M(0x5a3a22), -0.6 + q * 0.3, 1.6, 0.44, 0.09, 0.07, 0.24); worker = [0.4, 1.6, "sell", true]; }
    else if (kind === "wheelwright") { P("wheel", WHEEL2_G, MAT.wood, -1.0, 2.0, 0.55, 1, 1, 1, Math.PI / 2); P("hub", CYL_G, MAT.wood, 0.8, 2.0, 0, 0.35, 0.5, 0.35); worker = [0.3, 1.5, "hammer"]; }
    else if (kind === "weaver") { for (const u of [-0.8, 0.8]) P("loompost", BOX_G, MAT.wood, u, 1.0, 0, 0.1, 2.0, 0.1); P("loombeam", BOX_G, MAT.wood, 0, 1.0, 1.9, 1.8, 0.1, 0.1); P("cloth", BOX_G, M([0x8a2a2a, 0x3a5a7a, 0x9a8a5a][k % 3]), 0, 1.02, 0.4, 1.4, 1.45, 0.02); worker = [0, 1.7, "sell", false, "woman"]; }   // a two-beam upright loom by the door
    else if (kind === "baker") { P("oven", new THREE.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), M(0x8a6a4a), 1.2, 2.6, 0, 1, 1, 1); P("table", BOX_G, MAT.wood, -0.8, 2.2, 0.75, 1.2, 0.05, 0.6); for (let q = 0; q < 5; q++) P("loaf", new THREE.SphereGeometry(0.12, 8, 5).scale(1, 0.55, 1.2), M(0xb07a3a), -1.2 + q * 0.2, 2.2, 0.82, 1, 1, 1); worker = [-0.8, 1.5, "sell", false, "woman"]; }
    else if (kind === "comb") { P("bench", BOX_G, MAT.wood, 0, 1.6, 0, 1.4, 0.42, 0.45); for (let q = 0; q < 5; q++) P("antler", CYL_G, M(0xc8b898), -0.5 + q * 0.25, 1.6, 0.44, 0.04, 0.3, 0.04, q); worker = [0.3, 1.6, "sell", true]; }
    WORKSHOPS.push({ kind, H, at, worker }); } }
// on the shore: boatbuilders at a hull on the stocks, fishermen mending nets; porters carrying up from the hithes; a thatcher on a roof
const SHORE_WORK = [];
{ const R = seeded(77); for (const [lat, lon] of [[51.5112, -0.0975], [51.5098, -0.0812]]) { let [x, z] = LL(lat, lon), k = 0; while (baseH(x, z) > 0.4 && k++ < 120) z += 1.5; z -= 8;
    put("ws:stocks", BOX_G, MAT.wood, x, groundH(x, z), z, 0.4, 0.5, 6, 0); put("ws:hull", BOAT_G, MAT.wood, x, groundH(x, z) + 0.5, z, 1.9, 0.75, 8, Math.PI / 2 * 0); for (const r of [-0.5, 0.5]) put("ws:rib", BOX_G, MAT.wood, x + r * 2.5, groundH(x, z) + 0.6, z, 0.08, 1.0, 0.1);
    SHORE_WORK.push({ x: x + 1.6, z: z - 1, h: -Math.PI / 2, kind: "hammer" }, { x: x - 1.6, z: z + 1.5, h: Math.PI / 2, kind: "hammer" });
    const nx = x + 14; for (const dz of [-2, 2]) put("ws:netpole", CYL_G, MAT.wood, nx, groundH(nx, z + dz), z + dz, 0.08, 1.8, 0.08); put("ws:net", BOX_G, MAT.wattle, nx, groundH(nx, z) + 0.4, z, 0.02, 1.3, 4); SHORE_WORK.push({ x: nx + 0.8, z, h: -Math.PI / 2, kind: "sell", sit: true }); }
  mark("Boatbuilders", ...LL(51.5106, -0.0975), "typical", "On the foreshore, a clinker-built boat on the stocks: overlapping oak planks fastened with iron rivets over washers, the frames put in after the planking, as in the Viking-age boats found on the London waterfront. Nearby, fishermen mend their nets.", { y: 3, r: 15, range: 300 }); }
const THATCH_H = HOUSES.find(H => H.roof === "thatch" && H.dp && !H.burnt && CITY.inside(H.x, H.z) && H.kind === "house" && !H.home && !H.ale && Math.hypot(H.x - 2200, H.z + 1430) < 400);
if (THATCH_H) { const a = THATCH_H.ry, c = Math.cos(a), s = Math.sin(a), lx = THATCH_H.x + c * (THATCH_H.w / 2 + 0.6), lz = THATCH_H.z - s * (THATCH_H.w / 2 + 0.6); put("ws:ladder", BOX_G, MAT.wood, lx, THATCH_H.gy, lz, 0.5, THATCH_H.wh + THATCH_H.rh * 0.6, 0.08, a + Math.PI / 2, -0.3); }
if (MARKET) { const w = WORKSHOPS[0]; if (w) mark("A smithy", ...w.at(0, 2.2), "typical", "Smiths worked at the door: a charcoal forge blown by bellows, an anvil on a tree stump, a tub to quench the iron. Smithing slag and hammerscale are found all over Late Saxon London; iron came from the Weald. Knives, nails, keys, horseshoes, tools.", { y: 3, r: 6, range: 150 });
  const wv = WORKSHOPS.find(q => q.kind === "weaver"); if (wv) mark("A weaver", ...wv.at(0, 1.0), "typical", "Weaving on a two-beam upright loom, by the door for the light: by the 11th century this had largely replaced the old warp-weighted loom in towns. Cloth was woven at home by women, then fulled and dyed.", { y: 3, r: 5, range: 120 }); }
mark("Fetching water", ...(WELLS[0] || [0, 0]), "typical", "Water came from wells in the yards (timber-lined shafts are common finds behind Late Saxon houses), or from the Thames and the Walbrook, carried home in wooden pails on a shoulder-yoke, several times a day. Most of what people drank was ale.", { y: 2.5, r: 6, range: 120 });

// ---------- the day's clock ----------
// The hour of the coronation is not recorded. Mass on a great feast was in the morning; here the procession sets out at 10:00 and
// the events the chroniclers describe follow in their order, at a plausible pace. SIM is seconds after midnight.
const hms = (h, m = 0, s = 0) => h * 3600 + m * 60 + s;
let SIM = (Q.get("who") || "traveller") !== "traveller" ? hms(7, 40) : MARKET ? hms(9, 0) : hms(9, 55), timeRate = 1;   // a life starts before dawn
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
if (ERA === 1285) { NARR.length = 0; NARR.push([hms(9, 0), "Michaelmas, Saturday 29 September 1285: quarter day, when rents and dues are paid and servants hired, and a market day. Edward I is king; in June he seized the City's liberties and set a royal warden over it, and in October his Statute of Winchester will order the gates shut at dusk and a watch kept every night. London Bridge stands in stone. The harvest is in, and the ploughing for winter wheat has begun."]); }
if (ERA === 1100) { NARR.length = 0; NARR.push([hms(9, 0), "Lammas Day, 1 August 1100. William Rufus, the Conqueror's son, is king (tomorrow he will be killed by an arrow while hunting in the New Forest, and his brother Henry crowned at Westminster three days later). A generation after the Conquest, London has the White Tower, finished this year; Baynard's Castle and Montfichet's Tower; Rufus's great hall at Westminster; a new St Paul's rising after the fire of 1087. The harvest is beginning in the fields."]); }
else if (MARKET) { NARR.length = 0; NARR.push([hms(9, 0), "A market day a few days before Christmas 1066. William has come to London to be crowned on Christmas Day; his army is camped round the City. The streets are busy: stalls along Cheapside, butchers at the Shambles on Newgate Street and in Eastcheap, fish by the hithes. You have a purse of silver pennies: walk up to a stall and press E to buy. Boatmen wait at the hithes."]); }
let narrI = -1;

// ---------- the people ----------
const NC = ERA === 1285 ? (IS_HEADSET ? 1000 : 1700) : IS_HEADSET ? 640 : 860, crowd = new Crowd(NC), AG2 = [];   // everyone, one instanced crowd
let nextI = 0;
function agent(role, o = {}) { const i = nextI++; if (i >= NC) return null; const L = looks(i, role); crowd.look(i, L); const A = { i, L, role: L.role, x: 0, z: 0, y: 0, h: 0, kind: "stand", walk: 0, shown: false, ...o }; AG2.push(A); return A; }
// a route: points [x, z]; position at distance s
function routeAt(P, s) { let i = 1; for (; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (s <= l) { const f = s / l; return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * f, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f, Math.atan2(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]), false]; } s -= l; }
  const n = P.length - 1; return [P[n][0], P[n][1], n ? Math.atan2(P[n][0] - P[n - 1][0], P[n][1] - P[n - 1][1]) : 0, true]; }
const face = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
const ND = [0, -27.7], WD = [NAVE_DONE - 0.3, 0];   // the north transept door and the temporary west door
const PAL_DOOR = [PAL.northDoor[0], PAL.northDoor[2]], PAL_IN = [PAL.inNorth[0], PAL.inNorth[2]];
const PROC_PATH = [PAL_DOOR, [PAL_DOOR[0] - 13, PAL_DOOR[1] + 6], [PALACE[0] - 50, PALACE[1] + 4], [PALACE[0] - 72, PALACE[1] + 4], [95, -10], [70, -45], [30, -45], [0, -40], ND, [0, -12], [0, -2]];   // out of the hall, through the palisade gate, round to the north door
// the procession and the principals
const PRIN = {};
if (!MARKET) { const order = [["cleric", "cross"], ["cleric", "candle"], ["cleric", "candle"], ["cleric", "book"], ["cleric"], ["cleric"], ["monk", "edwin"], ["bishop", "geoffrey"], ["archbishop", "ealdred"], ["duke", "william"],
    ["norman", "lord"], ["norman", "lord"], ["norman", "lord"], ["norman", "lord"], ["norman", "lord"], ["norman", "lord"]];
  const stations = { cross: [21.5, 0, -Math.PI / 2], candle: [19.5, 2.2, -Math.PI / 2], book: [17.2, -1.4, Math.PI / 2], edwin: [17.4, 2.6, -Math.PI / 2], geoffrey: [-0.5, -3.5, -Math.PI / 2], ealdred: [17.0, 0, -Math.PI / 2], william: [15.5, 0, Math.PI / 2] };
  let ci = 0, li = 0;
  order.forEach(([role, key], k) => { const A = agent(role, { proc: true, delay: k * 2.4, key }); let st = stations[key];
    if (key === "candle") st = [19.5, ci++ ? -2.2 : 2.2, -Math.PI / 2]; if (!key) st = [16 + (k % 2) * 2, (k % 2 ? 3.5 : -3.5), k % 2 ? -Math.PI : 0]; if (key === "lord") { st = [-2.5 + (li % 3) * 2.4, -8 - Math.floor(li / 3) * 1.8, Math.PI]; li++; }
    const wt = PAL.seat(2.2 + (k % 3) * 1.2, -13.5 + Math.floor(k / 3) * 1.4); A.wait = [wt[0], wt[2]];   // waiting in the hall beforehand
    const hs = { william: [0, 13.75, 1], ealdred: [1.3, 13.5, 1], geoffrey: [-1.3, 13.5, 1], edwin: [2.6, 13.5, 1] }[key] || [k % 2 ? 4.1 : -4.1, -8 + k * 1.1, 0], hw = PAL.seat(hs[0], hs[1]);   // and where they sit at the feast afterwards
    A.feast = [hw[0], hw[2], hs[2] ? -Math.PI / 2 : hs[0] > 0 ? Math.PI : 0, hs[2]];
    A.station = st; A.path = [A.wait, PAL_IN, ...PROC_PATH, [st[0], st[1]]]; if (key) PRIN[key] = A; }); }
// monks in the choir stalls, singing
for (let k = 0; k < 18; k++) { const zs = k % 2 ? 1 : -1, x = -12.5 + Math.floor(k / 2) * 1.6; agent("monk", { fixed: [x, 3.0 * zs, zs > 0 ? Math.PI : 0], kind: "stand", monk: true }); }
// the congregation: Normans on the north side, English on the south (the arrangement is not recorded)
if (!MARKET) { const R = seeded(91), spots = [];
  for (let x = -31.5; x < -15; x += 1.15) for (let z = -9.6; z <= 9.6; z += 1.1) { if (Math.abs(z) > 4.3 && Math.abs(z) < 5.9 && Math.abs(((x + 5) / BAY) - Math.round((x + 5) / BAY)) < 0.25) continue; spots.push([x + (R() - 0.5) * 0.3, z + (R() - 0.5) * 0.3, "nave"]); }
  for (let x = -14.5; x < -6.5; x += 1.15) for (const z of [6.4, 7.5, 8.6, 9.6, -6.4, -7.5, -8.6, -9.6]) spots.push([x + (R() - 0.5) * 0.3, z, "nave"]);
  for (let x = -4.2; x <= 4.2; x += 1.1) for (let z = 11; z < 25.5; z += 1.1) { spots.push([x + (R() - 0.5) * 0.3, z, "s"]); if (z > 11.5) spots.push([x + (R() - 0.5) * 0.3, -z, "n"]); }
  const nCong = Math.min(spots.length, NC - nextI - 260);
  for (let k = 0; k < nCong; k++) { const sp = spots[Math.floor(R() * spots.length)]; spots.splice(spots.indexOf(sp), 1); const north = sp[1] < 0, role = north ? (R() < 0.96 ? "norman" : "cleric") : (R() < 0.3 ? "woman" : R() < 0.3 ? "noble" : R() < 0.04 ? "cleric" : "eng");
    const out = sp[2] === "nave" ? [WD, [WD[0] - 6, sp[1] * 0.4], [-50 - R() * 30, -14 - R() * 6], [-40 + R() * 100, -60 - R() * 70]] : [[0, sp[1] * 0.6], ND, [0, -34], [-30 + R() * 140, -60 - R() * 80]];
    const A = agent(role, { cong: true, seat: [sp[0], sp[1]], out: [[sp[0], sp[1]], ...out], leaveAt: T.flee + R() * 200 + (sp[2] === "s" ? 50 : 0), speed: 1.5 + R() * 0.8 });
    A.faceSeat = face(sp[0], sp[1], 10, sp[1] * 0.2); } }
// outside: English onlookers by the north door, Norman guards round the church and along the way
const GUARDS = [];
{ const R = seeded(93); for (let k = 0; k < (MARKET ? 0 : 70); k++) { const a = R() * Math.PI, r = 14 + R() * 30, x = -10 + Math.cos(a) * r * 1.6, z = -40 - Math.sin(a) * r;
    agent(R() < 0.35 ? "woman" : R() < 0.15 ? "child" : "eng", { fixed: [x, z, face(x, z, 0, -27)], kind: "stand", onlooker: true, fleeTo: [x + (R() - 0.5) * 60, z - 40 - R() * 80], speed: 1.2 + R() }); }
  const posts = [];
  for (let k = 0; k < 14; k++) { const s = 12 + k * 18, [x, z, a] = routeAt(PROC_PATH, s); posts.push([x + Math.cos(a) * 2.6 * (k % 2 ? 1 : -1), z - Math.sin(a) * 2.6 * (k % 2 ? 1 : -1)]); }
  for (const [x, z] of [[-6, -31], [6, -31], [-40, 14], [-40, -14], [30, -15], [30, 15], [-20, -16], [10, -36], [-70, 0], [-30, -30], [45, 0], [20, -30]]) posts.push([x, z]);
  for (const [x, z] of posts) { const A = agent("soldier", { fixed: [x, z, face(x, z, 0, 0) + Math.PI], kind: "guard" }); GUARDS.push(A); } }
// the palace household: cooks, servants carrying food from the kitchen to the hall, people laying the high table, guards at the gate
if (ERA !== 1285) { const KD = [PAL.kitchenDoor[0], PAL.kitchenDoor[2]], KI = [PAL.inKitchen[0], PAL.inKitchen[2]], SD = [PAL.southDoor[0], PAL.southDoor[2]], SI = [PAL.inSouth[0], PAL.inSouth[2]];
  PAL.cookSpots.forEach(([x, , z], k) => agent(k === 1 ? "woman" : "eng", { fixed: [x, z, face(x, z, PAL.kitchen.x, PAL.kitchen.z + 0.5)], kind: k === 1 ? "sell" : "hammer", palace: true }));
  for (let k = 0; k < 8; k++) { const t = PAL.seat(k % 2 ? 4.0 : -4.0, -7 + k * 2), path = [KI, KD, SD, SI, [t[0], t[2]]]; agent(k % 3 === 1 ? "woman" : "eng", { loop: path, phase: k * 23, speed: 1.0 + (k % 3) * 0.15, palace: true }); }
  for (let k = 0; k < 3; k++) { const [x, , z] = PAL.seat(-2 + k * 2, 11.4); agent(k === 1 ? "woman" : "eng", { fixed: [x, z, Math.PI / 2], kind: "sell", palace: true }); }
  const [gx, gz] = [PALACE[0] - 70, PALACE[1] + 4]; for (const o of [-4, 4]) { const A = agent("soldier", { fixed: [gx, gz + o, -Math.PI / 2], kind: "guard" }); GUARDS.push(A); } }
// the houses that burn: the nearest of the Westminster vill
const FIRE_H = MARKET ? [] : HOUSES.filter(H => H.kind === "vill" && !H.burnt).sort((a, b) => Math.hypot(a.x, a.z + 40) - Math.hypot(b.x, b.z + 40)).slice(0, 7);
FIRE_H.forEach((H, k) => { H.ignite = T.fire + k * 45; H.state = 0; const G = GUARDS[k * 2 + 1] || GUARDS[k]; if (G) { G.torch = H; G.torchAt = H.ignite; } });
// people about the streets: placed near you as you go, walking the streets, talking at doors
// the stallholders, and a boatman for hire
for (const S of STALLS) { const [x, z, h] = S.seller; S.agent = agent(S.kind === "butcher" || S.kind === "iron" ? "eng" : hash(x | 0, z | 0) < 0.45 ? "woman" : "eng", { fixed: [x, z, h], kind: S.kind === "butcher" ? "hammer" : "sell", seller: true }); }
const ROWER = agent("eng", { rower: true });
// craftsmen at their doors, boatbuilders and net-menders on the shore, porters up from the hithe, a thatcher on a roof: on working days
if (MARKET) { for (const W of WORKSHOPS) { if (!W.worker) continue; const [u, v, kind, sit, role] = W.worker, [x, z] = W.at(u, v); agent(role || "eng", { fixed: [x, z, W.H.dp[2]], kind: sit ? "sit" : kind, farm: true }); }
  for (const S of SHORE_WORK) agent("eng", { fixed: [S.x, S.z, S.h], kind: S.sit ? "sit" : S.kind, farm: true });
  const P = PIERS.find(p => p.name === "Queenhithe"), [qx, qz] = LL(51.5112, -0.0948); if (P) for (let k = 0; k < 4; k++) agent("eng", { loop: [[P.land[0] + k, P.land[1]], [qx + k * 2, qz - 4]], phase: k * 17, speed: 0.9, prop: "sack", farm: true });
  if (THATCH_H) agent("eng", { fixed: [THATCH_H.x, THATCH_H.z, THATCH_H.ry + Math.PI / 2], kind: "hammer", yOff: THATCH_H.wh + THATCH_H.rh * 0.5, farm: true }); }
for (const V of VEH) agent(V.type === "rider" ? (V.nr === 1 ? "noble" : "soldier") : "eng", { veh: V });   // carters walking at their beasts' heads; riders: Norman knights, or an English thegn
if (MARKET) for (const [x, z, h] of [[-68, -27, 0], [-73, 29, Math.PI], [-63, 31, Math.PI], [-102, 4.5, Math.PI / 2], [-106, 2.5, -Math.PI / 2], [-50, 10, -Math.PI / 2]]) agent("eng", { fixed: [x, z, h], kind: "hammer", farm: true });   // masons dressing stone, sawyers at the sawpit
// farm folk at their winter work: threshing with flails in the barn doorways, in the yards, herding, and the ploughman behind his team
for (const F of [...FARM_SPOTS.filter(f => f.plough), ...FARM_SPOTS.filter(f => !f.plough).filter((f, i) => i % 2 === 0)].slice(0, 64)) agent(F.role, F.plough ? { plough: F.plough, farm: true } : { fixed: [F.x, F.z, F.h], kind: F.kind, farm: true });
for (const [role, x, z, tx, tz, kind] of INTERIOR_FOLK) agent(role, { fixed: [x, z, face(x, z, tx, tz)], kind, inside: true });
const AMB = []; { const N = NC - nextI - 8; for (let k = 0; k < N; k++) { const A = agent(null, { amb: true }); if (A) AMB.push(A); } }
function placeAmbient(A, px, pz) { const R = Math.random; propHide(A); A.prop = null;
  if (R() < 0.5 && placeTask(A, px, pz)) { if (A.path) { A.x = A.path[0][0]; A.z = A.path[0][1]; } if (A.c) { A.x = A.c[0]; A.z = A.c[1]; } return true; }   // a household task
  for (let t = 0; t < 25; t++) { if (R() < 0.3 && HOUSES.length) { const H = HOUSES[(R() * HOUSES.length) | 0]; if (H.burnt && R() < 0.6) continue; if (!H.dp || Math.hypot(H.dp[0] - px, H.dp[1] - pz) > 320) continue;   // talking at a doorway
      const ox = Math.sin(H.dp[2]) * 1.4, oz = Math.cos(H.dp[2]) * 1.4; A.mode = "talk"; A.x = H.dp[0] + ox + (R() - 0.5) * 2; A.z = H.dp[1] + oz + (R() - 0.5) * 2; A.h = R() * 6.28; A.kind = R() < 0.15 ? "carry" : "talk"; return true; }
    const S = STREETS[(R() * STREETS.length) | 0], s = R() * S.L.L, [x, z] = S.L.at(s); if (Math.hypot(x - px, z - pz) > 330 || baseH(x, z) < 0.5) continue;
    A.mode = "walk"; A.S = S; A.s = s; A.dir = R() < 0.5 ? 1 : -1; A.lane = (R() - 0.5) * S.w * 0.7; A.v = 1.0 + R() * 0.5; A.kind = R() < 0.12 ? "carry" : "walk"; return true; }
  A.mode = "off"; return false; }
for (const A of AMB) A.mode = "off";
mark("William, duke of Normandy", 0, 0, "person", "William, 38 years old, duke of Normandy since he was about seven; Edward the Confessor's cousin once removed, who claimed Edward had promised him the throne. He won at Hastings on 14 October; today he becomes king of the English. In the Bayeux Tapestry Normans wear their hair cropped, the back of the head shaved.", { follow: PRIN.william, r: 6, range: 120 , coronation: true });
mark("Ealdred, archbishop of York", 0, 0, "person", "Ealdred, archbishop of York since 1061, an experienced churchman and diplomat who had travelled to Rome and Jerusalem. He probably crowned Harold in January, and crowns William today: the archbishop of Canterbury, Stigand, was not recognised by the pope.", { follow: PRIN.ealdred, r: 6, range: 120 , coronation: true });
mark("Geoffrey, bishop of Coutances", 0, 0, "person", "Geoffrey de Montbray, bishop of Coutances in Normandy, who fought at Hastings and became one of the greatest landholders in England. He puts the question to the Normans, in French.", { follow: PRIN.geoffrey, r: 6, range: 120 , coronation: true });
mark("Abbot Edwin", 0, 0, "person", "Edwin, abbot of Westminster under Edward the Confessor and now under William, head of the community of Benedictine monks who serve the abbey.", { follow: PRIN.edwin, r: 5, range: 80 , coronation: true });
if (ERA !== 1285) mark(ERA === 1285 ? "The Lesser Hall" : "The great hall", ...(([x, , z]) => [x, z])(PAL.seat(0, 0)), "inferred", ERA === 1285 ? "Henry III's Lesser Hall (the White Hall), rebuilt in stone on the site of the Confessor's timber hall: the king's everyday hall within the Palace of Westminster, beside the great hall of William Rufus. Edward the Confessor's palace is long gone; Henry spent heavily here, on glass, painting and new chambers." : "The king's hall: the heart of any royal residence, where the king ate, held court and gave feasts. Edward's has not been found; this one follows excavated royal halls (Cheddar, Goltho): an aisled timber hall about 30 by 12 m, earth floor strewn with rushes, a long central hearth with no chimney, benches and trestle tables in the aisles, and the high table on a dais at the far end. Embroidered hangings on the walls: wills of the time leave 'hall-hangings'. Today the household is preparing the coronation feast.", { y: 3.2, r: 10, range: 60 });
if (ERA !== 1285) mark("The high table", ...(([x, , z]) => [x, z])(PAL.seat(0, 12.6)), "inferred", ERA === 1285 ? "The king's table on the dais. Edward I is often away (in Wales and in the north) and the palace's halls are busy with royal officials, clerks and petitioners." : "On the dais, across the end of the hall: the king's chair in the middle, the greatest guests beside him, everyone else at the tables below. After the crowning King William comes back here with the bishops for the feast (a coronation feast was customary; this one is not described).", { y: 1.9, r: 4, range: 30 });
if (ERA !== 1285) mark(ERA === 1285 ? "The Painted Chamber" : "The king's chamber", ...(([x, , z]) => [x, z])(gw(PAL.chamber, 1, 0, -2)), "inferred", ERA === 1285 ? "Upstairs, the king's great bedchamber, the Painted Chamber: Henry III had it painted green with gold stars in 1236, and after a fire in 1263 covered with paintings of the Coronation of Edward the Confessor, the Virtues trampling the Vices, and Old Testament battles, with gilded bosses on the ceiling. (Here, a smaller room stands for a chamber about 24 m long.)" : "Upstairs in the chamber block, reached by the outside stair: the king's private room. Here, the Life of King Edward says, Edward died on 5 January 1066, with Queen Edith warming his feet, Earl Harold, Archbishop Stigand and the steward Robert fitzWimarc at his bedside; the Bayeux Tapestry shows the deathbed in an upper room and his body being prepared below. The room's form is inferred.", { y: 5.3, r: 6, range: 40 });
if (ERA !== 1285) mark(ERA === 1285 ? "The king's kitchen" : "The kitchen", ...(([x, , z]) => [x, z])(gw(PAL.kitchen, 0, 0, 0)), "inferred", ERA === 1285 ? "The palace kitchens, stone-built now, feeding a household of hundreds when the king is in residence." : "A separate kitchen, apart from the hall in case of fire: a central fire with a spit (a pig roasting for the feast), a cauldron, a clay bread oven, a table of loaves, hams hanging from the rafters.", { y: 2.6, r: 5, range: 40 });
mark("Monks of Westminster", -9, 0, "person", "Benedictine monks in black habits, singing the office and the coronation chants from the choir stalls.", { y: 4, r: 8, range: 60 });
mark("Norman lords and knights", 0, -18, "person", "The Norman nobles and knights, on the north side here (where each group stood is not recorded). Mail-shirted soldiers guard the church outside.", { y: 4, r: 10, range: 80 , coronation: true });
mark("The English", 0, 18, "person", "English thegns, churchmen and Londoners. English men wore their hair long, with moustaches; women covered their hair with a headrail.", { y: 4, r: 10, range: 80 , coronation: true });
mark("Norman guards", -10, -48, "person", "Armed Norman knights and soldiers posted round the abbey and in the town: mail hauberks, conical helmets with a nose-guard, kite-shaped shields and spears, as in the Bayeux Tapestry.", { y: 4, r: 14, range: 200 });
// what each kind of person is wearing (E near anyone)
const DRESS0 = { eng: "An Englishman: knee-length woollen tunic, belted, hose or leg wrappings, a cloak pinned at the shoulder with a brooch; long hair and a moustache (the Tapestry draws the English so, unlike the Normans).",
  woman: "An Englishwoman: an ankle-length gown over a linen underdress, a headrail (veil) covering the hair and shoulders, a cloak in winter. Married women always covered their hair.",
  child: "A child, dressed like the grown-ups in small: tunic or gown, cloak, leather shoes.", norman: "A Norman: tunic and cloak in strong colours, the hair cut short with the back of the head shaved, clean-shaven.",
  soldier: "A Norman soldier: a mail hauberk to the knees over a padded tunic, a conical iron helmet with a nose-guard, a kite-shaped wooden shield, a spear; a sword at the belt.",
  monk: "A Benedictine monk of Westminster: a black habit and cowl, tonsured.", cleric: "A cleric in a white alb, the long linen robe of the clergy at the altar.", bishop: "A bishop: alb, coloured chasuble, mitre (low two-horned mitres were just coming into use in the 1060s).",
  noble: "An English thegn, a landholder of rank: a better-dyed tunic and cloak, a fine brooch.", king: "The king, crowned, in rich robes." };
// what each kind of person wears, from the Bayeux Tapestry, grave finds and written sources
const DRESS = {
  eng: "An Englishman: a knee-length woollen tunic, bloused over a belt, over a linen shirt; hose or leg-wrappings (winingas) bound to the knee; leather turnshoes. Most cloth was undyed wool (off-white, grey, brown) or cheaply dyed with woad (blue), madder (red) or weld (yellow). A rectangular cloak pinned at the right shoulder, leaving the sword arm free; a hood or soft cap in winter. Englishmen wore their hair long, with a moustache (as the Tapestry draws them); older men often a beard.",
  woman: "An Englishwoman: an ankle-length woollen gown (cyrtel) over a linen underdress, belted with a girdle; a linen headrail (veil) wrapped over the head and neck: a grown woman's hair was always covered. In winter a closed mantle over the shoulders. Better-off women had embroidered bands at hem and cuffs.",
  child: "A child, dressed like a small adult: boys in tunics and hose, girls in gowns with their hair loose and uncovered (only married women covered theirs).",
  norman: "A Norman lord or knight in his best: a knee-length tunic in strong colours with a woven band at the hem, a cloak pinned at the right shoulder, coloured hose. The hair cut short and the back of the head shaved, clean-shaven: the Tapestry marks Normans out this way.",
  soldier: "A Norman soldier: a mail hauberk to the knees, split front and back for riding, with mail sleeves to the elbow, over a padded tunic; mail round the neck; a conical iron helmet with a nose-guard; a kite-shaped wooden shield, painted; a spear; a sword on a belt at the left hip.",
  monk: "A Benedictine monk of Westminster: a black woollen habit (tunic and cowl), a cord belt, the crown of the head shaved (the tonsure), clean-shaven.",
  cleric: "A cleric serving at the altar: a long white linen alb, belted, the tonsure.",
  bishop: "A bishop vested for mass: a white alb; over it the chasuble, a coloured silk vestment shaped like a bell; the low, rounded mitre of the 1060s (the tall two-horned mitre came in the next century); a crozier, the bishop's pastoral staff.",
  archbishop: "An archbishop: vested like a bishop, with the pallium over the chasuble, a white woollen band round the shoulders with strips hanging front and back, sent by the pope.",
  noble: "An English thegn, a landholder of rank: tunic and cloak in strong dyes with an embroidered or tablet-woven band, a gilt brooch at the shoulder; long hair, moustache.",
  duke: "William, duke of Normandy, in a long robe and a mantle for the ceremony; Norman haircut, clean-shaven.",
  king: "King William, crowned: the crown (the Carmen describes one with twelve gems), sceptre in hand, a long robe and mantle." };

// ---------- moving everyone, by the clock ----------
function personY(x, z) { if (inAbbey(x, z)) return AB_F; for (const R of PFLOORS) { const dx = x - R.F.x, dz = z - R.F.z, lx = dx * R.F.c - dz * R.F.s, lz = dx * R.F.s + dz * R.F.c; if (lx > R.x0 && lx < R.x1 && lz > R.z0 && lz < R.z1) return R.F.gy + R.y; } const F = PAL.hall, dx = x - F.x, dz = z - F.z, lx = dx * F.c - dz * F.s, lz = dx * F.s + dz * F.c; if (Math.abs(lx) < 5.85 && lz > 11.15 && lz < 14.9) return F.gy + 0.45;   // the dais
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
    return done ? [x, z, face(x, z, H.x, H.z), "guard"] : [x, z, h, "walk", true]; }
  if (A.loop) { const P = A.loop, L = A.loopL || (A.loopL = P.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - P[i][0], p[1] - P[i][1]), 0)), u = (S * A.speed + A.phase * 7) % (2 * L + 16);   // to the hall and back, a pause at each end
    if (u < L) { const [x, z, h] = routeAt(P, u); return [x, z, h, "carry", true]; } if (u < L + 8) { const [x, z, h] = routeAt(P, L); return [x, z, h, "sell"]; }
    if (u < 2 * L + 8) { const [x, z, h] = routeAt(P, 2 * L + 8 - u); return [x, z, h + Math.PI, "walk", true]; } const [x, z, h] = routeAt(P, 0); return [x, z, h + Math.PI, "stand"]; }
  if (A.veh) { if (!A.veh.show) return null; const [x, z, h, k] = driverAt(A.veh); return [x, z, h, k, k === "walk", A.veh.v]; }
  if (A.plough) { const [x, z, h] = ploughAt(A.plough, SIM); return [x, z, h, "walk", true, 0.6]; }
  if (A.rower) { if (!RIDE) return null; return [RIDE.rx, RIDE.rz, RIDE.rh, "row"]; }
  if (A.fixed) return [...A.fixed, A.kind];
  return null; }
let frameN = 0;
let youZone = null, nearDoor = false;
function seen(x, z, d) { if (d > 260) return false; if (INSIDE_H) return d < 60; if (zoneOf(x, z) === youZone) return true; return nearDoor ? d < 120 : false; }   // people in another room or building only through a doorway
function lifeStep(dt, t) { frameN++; const px = P_.x, pz = P_.z, rate = Math.min(timeRate, 8); youZone = zoneOf(px, pz); nearDoor = ALL_DOORS.some(([x, z]) => Math.hypot(x - px, z - pz) < 14);
  for (const A of AG2) {
    if (A.amb) { if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if ((frameN + A.i) % 30 === 0) placeAmbient(A, px, pz); if (A.mode === "off" || Math.hypot(A.x - px, A.z - pz) > 400) { if (A.shown) { crowd.hide(A.i); A.shown = false; } continue; } }
      const rx = A.react && t < A.react.until;
      if ((A.mode === "loop" || A.mode === "fixed" || A.mode === "play") && !rx) taskStep(A, dt, rate, t);
      if (A.mode === "walk" && !rx) { A.s += A.dir * A.v * dt * rate; if (A.s < 0 || A.s > A.S.L.L) { A.dir *= -1; A.s = clampN(A.s, 0, A.S.L.L); }
        const [x, z, a] = A.S.L.at(A.s); A.x = x + Math.cos(a) * A.lane; A.z = z - Math.sin(a) * A.lane; A.h = A.dir > 0 ? a : a + Math.PI; }
      const d = Math.hypot(A.x - px, A.z - pz), step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
      if (!seen(A.x, A.z, d)) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; }
      const ay = personY(A.x, A.z); crowd.set(A.i, A.x, ay, A.z, rx ? A.react.h : A.h, rx ? (A.react.bow ? "bow" : "talk") : A.kind, t, A.mode === "walk" ? A.v * rate : A.walk ? Math.min(2, A.walk * rate) : 1); A.shown = true; if (A.prop) propSet(A, ay); continue; }
    const st = agentState(A); if (!st) { if (A.shown) { crowd.hide(A.i); propHide(A); A.shown = false; } continue; }
    let [x, z, h, kind, moving, sp] = st; if (A.react && t < A.react.until && !moving && kind !== "sit") { h = A.react.h; kind = A.react.bow ? "bow" : "talk"; } A.x = x; A.z = z; A.h = h; A.kind = kind; const d = Math.hypot(x - px, z - pz);
    if (!seen(x, z, d)) { if (A.shown) { crowd.hide(A.i); A.shown = false; } continue; }
    const step = d < 35 ? 1 : d < 120 ? 3 : 8; if ((frameN + A.i) % step && A.shown) continue;
    if (A.key === "william") { const crowned = SIM > T.crown + 20; if (crowned !== !!A.crowned) { A.crowned = crowned; A.L = looks(A.i, crowned ? "king" : "duke"); crowd.look(A.i, A.L); } }
    let y = personY(x, z); if (A.yOff) y = groundH(x, z) + A.yOff; if (A.key === "william" && kind === "sit" && inAbbey(x, z)) y = AB_Y + 0.76; if (A.rower) y = WATER + 0.05; if (kind === "ride") y = Math.max(groundH(x, z), spanY(x, z)) + 0.92;
    crowd.set(A.i, x, y, z, h, kind, t, moving ? Math.min(2, (sp || 0.9) / 1.2) * Math.min(rate, 3) : 1); A.shown = true;  if (A.prop) propSet(A, y); }
  crowd.done(); }

// ---------- fire and smoke ----------
const fireM = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const FIRE_IM = new THREE.InstancedMesh(new THREE.ConeGeometry(0.9, 3, 6).translate(0, 1.5, 0), fireM, Math.max(1, FIRE_H.length * 7)); FIRE_IM.frustumCulled = false; scene.add(FIRE_IM);
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
  ale: "Casks of the alewife's ale.",
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
  if (H.ale) { for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.8, 10).translate(0, 0.4, 0), M(0x6a4e32)); b.position.set(side - 0.1, 0, -id * 0.42 + k * 0.7); g.add(b); } items.push({ key: "ale", x: side - 0.1, z: -id * 0.42 + 0.7 });
    const w = personMesh(7000 + (H.x | 0), "woman", "sell", side - 0.8, 0, -id * 0.2, Math.PI / 2); g.add(w); fam.push({ role: "woman", x: side - 0.8, z: -id * 0.2, ale: true }); }
  g.position.set(H.x, Y, H.z); g.rotation.y = H.ry; scene.add(g); return { g, items, fam, flame: fl2 }; }
function toLocal(H, x, z) { const dx = x - H.x, dz = z - H.z, c = Math.cos(H.ry), s = Math.sin(H.ry); return [dx * c - dz * s, dx * s + dz * c]; }
function toWorld(H, lx, lz) { const c = Math.cos(H.ry), s = Math.sin(H.ry); return [H.x + lx * c + lz * s, H.z - lx * s + lz * c]; }
function enterHouse(H) { INSIDE_H = H; IN = makeInterior(H); H.coll.on = false; setTimeout(() => houseWelcome(H), 50);
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
  if (best?.fam?.ale || best?.key === "ale") return aleMenu(); if (best?.fam) return say(DRESS[best.fam.role] + (H.ale ? " Drinking in the alehouse." : MARKET ? " At home." : " The family is at its Christmas meal."), 14); if (best) return say(ITEMS_TXT[best.key], 16);
  say("Walk closer to something to read about it; E at the doorway to go out.", 5); }
function nearDoorHouse() { let best = null, bd = 2.2; const L = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) L.push(...(COLL.get((Math.floor(P_.x / CC) + i) * 100003 + Math.floor(P_.z / CC) + j) || []));
  for (const r of L) { const H = r.tag; if (!H || !H.dp || H.burnt || H.state === 2 || H.noEnter) continue; const d = Math.hypot(H.dp[0] - P_.x, H.dp[1] - P_.z); if (d < bd) { bd = d; best = H; } } return best; }

// ---------- the abbey's own markers ----------
if (ERA !== 1285) mark("Westminster Abbey", -14, -14, "known", "Edward the Confessor's abbey church of St Peter: the first Romanesque church in England, built in the new Norman manner from about 1050, consecrated on 28 December 1065. Edward was buried here on 6 January; Harold was probably crowned here the same day; today William. The plan is known from foundations found under the present church (rebuilt by Henry III from 1245); the look of it from the Bayeux Tapestry (with a crossing tower and a man fixing the weathercock) and the Life of King Edward. The crossing tower, transepts and east end were finished; the nave was still being built. Finished, it was about 98 m long, longer than any other church in England, with an aisled nave about 22 m wide. Its heights are not known; they are shown in the proportions of Jumièges in Normandy, its model: nave walls about 23 m, the crossing tower about 45 m to its cap.", { big: true, range: 5000, y: 58, r: 45 });
if (ERA === 1066) mark("The building site", -82, 0, "inferred", "The abbey was still being built. West of the church, the masons' yard: their timber lodges, where they cut and dressed the stone; stacks of Caen stone shipped from Normandy (and Reigate stone from Surrey); timber and scaffold poles; a pit of slaked lime for mortar; a sawpit. The ground round the church is trampled mud, not lawn: the grass is in the burial grounds, the lay cemetery north of the church and the monks' cemetery to the south-east. The monks' garden lies beyond." + (MARKET ? " Today the masons are at work." : " Today, a holy day, the site is still."), { y: 6, r: 25, range: 400 });
if (ERA === 1066) mark("The unfinished nave", -48, 0, "inferred", "Most historians (Gem, Fernie) think the nave was completed only in the 1080s or later, and the two western towers later still. So here the western bays stand at arcade and gallery height in scaffolding, and a timber wall closes the finished part. How far the work had got in 1066 is not known.", { y: 14, r: 18, range: 400 });
if (ERA !== 1285) mark("The north door", 0, -30, "inferred", "With the nave unfinished, the way in was probably by a transept door. The north transept front became the abbey's main entrance in the 13th-century church.", { y: 6, r: 8, range: 250 });
if (ERA !== 1285) mark("The high altar", 18.5, 0, "known", "The high altar of St Peter, in the presbytery before the apse. The coronation was performed here: the oath, the anointing, the crowning.", { y: 3.2, r: 4, range: 60 });
if (ERA !== 1285) mark("King Edward's tomb", 13.8, 0, "known", "Edward the Confessor, died 5 January 1066, buried the next day in a stone coffin before the high altar of his new church. His tomb would have been covered with a costly silk pall and ringed with candles; 12th-century writers say William soon gave it a covering of gold and silver. Edward was made a saint in 1161 and moved to a shrine in 1163; Henry III rebuilt the whole abbey around his shrine. The tomb's form here is inferred.", { y: 1.9, r: 3, range: 50 });
if (ERA !== 1285) mark("The exterior", -6, -34, "inferred", "Outside, Norman great churches of the 1060s were mostly plain, finely cut stone: their richness was in proportion and mouldings, not ornament (zigzag chevron and dense carving came in only about 1100-1120). Shown: roll mouldings and small shafts framing the windows, flat pilaster buttresses, string courses, a corbel table under the eaves, blind arcading across the foot of the transept fronts, a painted tympanum over the north door, stone crosses on the gables. Details inferred from Jumièges and the surviving fragments of Edward's church.", { y: 8, r: 14, range: 200 });
if (ERA !== 1285) mark("The paintings", 0, 20, "inferred", "Norman and English great churches were plastered and painted inside: whitewash with red lines imitating masonry, patterned friezes, a painted curtain along the foot of the walls, figure scenes, and in the apse Christ in Majesty with angels and saints; capitals were painted too. Edward's paintings are lost; these follow surviving Romanesque schemes (St Albans, Kempley, the Norman churches).", { y: 9, r: 10, range: 60 });
if (ERA !== 1285) mark("The rood", -5.2, 0, "inferred", "The rood: a great crucifix with Mary and John, on a beam across the crossing arch, facing the people in the nave. Great churches had them; Archbishop Stigand gave great roods of gold and silver to several churches. Its form here is inferred.", { y: 15.5, r: 8, range: 60 });
if (ERA !== 1285) mark("The throne", 3.4, 0, "inferred", "After the crowning the king was enthroned. Where the throne stood in 1066 is not recorded; at later coronations it was on a raised stage at the crossing.", { y: 2.6, r: 3, range: 50 });
if (ERA !== 1285) mark("The arcades", -20, 5, "known", "Arcade, gallery and clerestory in three storeys, with piers alternating between compound piers (with a shaft running up the wall) and round columns, as at Jumièges in Normandy. Bases of the piers were found in excavation. Caen stone, pale cream. The flat painted timber ceiling is inferred.", { y: 9, r: 10, range: 80 });

// ---------- you ----------
const SPEEDS = [[1.4, "walking"], [4, "jogging"], [12, "fast"], [40, "very fast"]];
const keys = {}; let yaw = 0, pitch = -0.05, dragging = false, started = false, speedI = 0, flying = false, labelsOn = true;
const START = { x: 46, z: -78, look: [0, -20] };
const P_ = { x: START.x, z: START.z, y: 0 }; yaw = Math.atan2(-(START.look[0] - START.x), -(START.look[1] - START.z));
const intro = document.getElementById("intro");
let SITTING = localStorage.getItem("vrPosture") === "sitting";
{ const card = intro?.querySelector(".card"), row = document.createElement("p"); row.innerHTML = 'In VR, are you <button data-p="standing">🧍 standing</button> or <button data-p="sitting">🪑 sitting</button>?';
  const paint = () => row.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:0 4px;border-radius:8px;cursor:pointer;border:2px solid #5a3a1e;" + ((b.dataset.p === "sitting") === SITTING ? "background:#5a3a1e;color:#fff" : "background:#fff;color:#5a3a1e"); });
  { const dr = document.createElement("p"); dr.innerHTML = 'When? <button data-d="xmas">👑 Christmas Day 1066: the coronation</button> <button data-d="market">🧺 A market day, December 1066</button> <button data-d="1100">☀️ Summer 1100: the Norman city</button> <button data-d="1285">🍂 Michaelmas 1285: the stone bridge</button>';
    const cur = ERA === 1285 ? "1285" : ERA === 1100 ? "1100" : MARKET ? "market" : "xmas", pd = () => dr.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:2px 4px;border-radius:8px;cursor:pointer;border:2px solid #5a3a1e;" + (b.dataset.d === cur ? "background:#5a3a1e;color:#fff" : "background:#fff;color:#5a3a1e"); });
    dr.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); if (b.dataset.d !== cur) { const q = new URLSearchParams(location.search); q.delete("day"); q.delete("era"); if (b.dataset.d === "market") q.set("day", "market"); if (b.dataset.d === "1100") q.set("era", "1100"); if (b.dataset.d === "1285") q.set("era", "1285"); location.search = q.toString(); } }); pd(); card?.insertBefore(dr, card.lastElementChild); }
  { const wr = document.createElement("p"), cur = new URLSearchParams(location.search).get("who") || "traveller"; wr.innerHTML = "Who are you? " + [["traveller", "🎓 Time traveller (unseen)"], ["comb", "🦌 London comb-maker"], ["ale", ERA === 1285 ? "🍺 London brewster" : "🍺 London alewife"], ["south", "🎣 Southwark fisherman"], ["thegn", ERA === 1285 ? "🧵 London mercer" : "🛡 English thegn"]].map(([k, n]) => `<button data-w="${k}">${n}</button>`).join(" ");
    wr.querySelectorAll("button").forEach(b => b.style.cssText = "font:600 13.5px -apple-system,sans-serif;padding:5px 10px;margin:2px 3px;border-radius:8px;cursor:pointer;border:2px solid #5a3a1e;" + (b.dataset.w === cur ? "background:#5a3a1e;color:#fff" : "background:#fff;color:#5a3a1e"));
    wr.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); if (b.dataset.w !== cur) { const q = new URLSearchParams(location.search); if (b.dataset.w === "traveller") q.delete("who"); else q.set("who", b.dataset.w); location.search = q.toString(); } }); card?.insertBefore(wr, card.lastElementChild); }
  row.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); SITTING = b.dataset.p === "sitting"; localStorage.setItem("vrPosture", b.dataset.p); paint(); }); paint(); card?.insertBefore(row, card.lastElementChild); }
const CSS = "background:rgba(30,24,18,.78);color:#f2e8d6;border-radius:10px;font:13.5px/1.5 -apple-system,Helvetica,sans-serif";
const HUD = document.createElement("div"); HUD.style.cssText = `position:fixed;left:14px;top:12px;z-index:2;padding:10px 14px;max-width:620px;${CSS}`;
const MSG = document.createElement("div"); MSG.style.cssText = `position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;padding:12px 18px;max-width:780px;display:none;${CSS};font-size:15px`;
const GUIDE = document.createElement("div"); GUIDE.style.cssText = `position:fixed;right:14px;top:12px;z-index:2;padding:10px 12px;max-height:calc(100vh - 290px);overflow-y:auto;width:250px;${CSS};font-size:13px`;
const MAPC = document.createElement("canvas"); MAPC.width = MAPC.height = 240; MAPC.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2;border-radius:10px;border:2px solid rgba(200,160,80,.7);width:240px;height:240px";
document.body.append(HUD, MSG, GUIDE, MAPC);
let msgT = 0, msgText = "", vrDirty = true;
function say(t, secs = 12) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function start() { if (started) return; started = true; intro?.classList.add("gone"); if (!UNSEEN) return roleStart();
  if (ERA === 1285) return say("Michaelmas, Saturday 29 September 1285, at Westminster: quarter day, when rents fall due, and a market day. Edward I is king; this summer he took the City into his own hands. Before you, Henry III's soaring Gothic abbey joined to the old Romanesque nave. Downriver: St Paul's with its great spire, the stone London Bridge lined with houses, the whitewashed Tower in its new walls and moat; friaries, the Temple's round church, the Great Conduit in Cheapside. Some 80,000 people now, and the suburbs spill out along every road. Walk into the abbey by Solomon's Porch, into St Paul's, the Temple, the Guildhall and the great halls; climb the stair into the White Tower; see the Stocks Market and the goldsmiths of Cheapside. The leaves are turning and the harvest is in. Walk anywhere, or take a boat.", 26);
  if (ERA === 1100) return say("Lammas Day, 1 August 1100, at Westminster: a summer morning a generation after the Conquest. Before you, the abbey, its nave finished; beyond the palace, William Rufus's new hall. Downriver, the White Tower rises over the City; Baynard's Castle and Montfichet's Tower guard the west; the new St Paul's is building. The markets are busy and the harvest is beginning. Walk anywhere, or take a boat.", 24);
  if (MARKET) return say("A market day a few days before Christmas 1066, at Westminster. The City is about 3 km east, along the Strand (or take a boat from the wharf, or use the guide's 'Things to do'). In the City: stalls on Cheapside, butchers at the Shambles and in Eastcheap, fish by the hithes. You carry 30 silver pennies: press E at a stall to buy.", 22);
  say("Westminster, Christmas morning 1066. Before you, Edward the Confessor's new abbey; to your right, the houses of the little vill. At 10:00 William's procession comes from the palace (to the south-east) to the north door. Walk anywhere: into the abbey, along the Strand to the City, across London Bridge. Markers name things and say how well we know them: press E near one to read it.", 22); }
addEventListener("keydown", e => { keys[e.code] = true; start();
  if (RIDE && (e.code === "Equal" || e.code === "Minus")) { boatPace = clampN(boatPace + (e.code === "Equal" ? 1 : -1), 0, BOAT_PACE.length - 1); say(`The boat's pace: ${BOAT_PACE[boatPace] === 1 ? "rowing (about 4 mph)" : "sped up ×" + BOAT_PACE[boatPace]}.`, 3); return; }
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
let momentI = 0; function nextMoment() { if (MARKET) { momentI = (momentI + 1) % TODO.length; return goTodo(momentI); } goMoment((momentI + 1) % MOMENTS.length); }
const TAGC = { known: "#9ad87a", inferred: "#f0c060", typical: "#8ab8f0", absent: "#e08a8a", person: "#d8a8f0" }, TAGN = { known: "known", inferred: "inferred: place known, form guessed", typical: "typical: a stand-in", absent: "not there in 1066", person: "person" };
function drawGuide() { const TD = self.TODO_LIST || []; GUIDE.innerHTML = (MARKET ? `<b>A market day, December 1066</b>` : `<b>Coronation</b> <span style="color:#c8b898">· click to go to the moment</span>` + MOMENTS.map(([n, tm], i) => `<div data-m="${i}" style="cursor:pointer;padding:1px 4px">${String(Math.floor(tm / 3600)).padStart(2, "0")}:${String(Math.floor(tm / 60) % 60).padStart(2, "0")} ${n}</div>`).join("")) +
  `<div style="margin:4px 0">${[["xmas", "Christmas 1066"], ["market", "market day 1066"], ["1100", "summer 1100"], ["1285", "Michaelmas 1285"]].filter(([k]) => k !== (ERA === 1285 ? "1285" : ERA === 1100 ? "1100" : MARKET ? "market" : "xmas")).map(([k, n]) => `<span data-day="${k}" style="cursor:pointer;color:#ffe9a8;text-decoration:underline;margin-right:10px">go to ${n}</span>`).join("")}</div>` +
  (UNSEEN || !self.ROLES_READY ? "" : `<b>Your day</b> <span style="color:#c8b898">· ${LIFE.short} · E where you are to do these</span>` + MY_TASKS.map(t => `<div style="padding:1px 4px">${DIARY.some(d => d[1] === t.name) ? "✓" : "·"} ${t.name} <span style="color:#c8b898">(${t.when}, ${t.where})</span></div>`).join("") + `<div data-home="1" style="cursor:pointer;padding:1px 4px;color:#ffe9a8">⌂ go home</div>`) +
  `<b>Things to do</b> <span style="color:#c8b898">· click to go</span>` + TD.map(([n], i) => `<div data-t="${i}" style="cursor:pointer;padding:1px 4px">✦ ${n}</div>`).join("") +
  `<div style="margin:6px 0 2px"><span data-r="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">time ×${timeRate} (T)</span> <span data-l="1" style="cursor:pointer;padding:2px 8px;border-radius:6px;background:rgba(200,160,80,.25)">markers ${labelsOn ? "on" : "off"} (L)</span></div>` +
  `<b>Places</b> <span style="color:#c8b898">· click to go</span>` + PLACES.map((p, i) => `<div data-i="${i}" style="cursor:pointer;padding:1px 4px">${p.m ? `<span style="color:${TAGC[p.m.tag]}">●</span> ` : "◆ "}${p.name}</div>`).join("") +
  `<div style="color:#c8b898;font-size:11.5px;margin-top:6px"><span style="color:${TAGC.known}">●</span> known &nbsp;<span style="color:${TAGC.inferred}">●</span> inferred &nbsp;<span style="color:${TAGC.typical}">●</span> typical &nbsp;<span style="color:${TAGC.absent}">●</span> not yet built &nbsp;<span style="color:${TAGC.person}">●</span> people</div>`; }
GUIDE.addEventListener("click", e => { e.stopPropagation(); const d = e.target.closest("[data-i],[data-m],[data-r],[data-l],[data-t],[data-day],[data-home]"); if (!d) return; if (d.dataset.home) { start(); const p = homeDoor(); if (p) teleport(p[0], p[1], HOME ? HOME.x : SHELTER.fire[0], HOME ? HOME.z : SHELTER.fire[1]); return; } if (d.dataset.day) { const q = new URLSearchParams(location.search); q.delete("day"); q.delete("era"); if (d.dataset.day === "market") q.set("day", "market"); if (d.dataset.day === "1100") q.set("era", "1100"); if (d.dataset.day === "1285") q.set("era", "1285"); location.search = q.toString(); return; } if (d.dataset.t) return goTodo(+d.dataset.t); if (d.dataset.i) goPlace(PLACES[+d.dataset.i]); else if (d.dataset.m) goMoment(+d.dataset.m); else if (d.dataset.r) cycleRate(); else { labelsOn = !labelsOn; drawGuide(); } });
drawGuide();
function interact(skipTasks) { if (!started) return start(); if (busy) return; if (RIDE) { if (MENU) return closeMenu(); return RIDE.voyage ? voyageMenu() : say("On the way: − / = to change the pace.", 3); } if (MENU) return closeMenu(); if (mountToggle()) return;
  if (!skipTasks) { const avail = MY_TASKS.filter(t => t.test()); if (avail.length) return tasksMenu(avail, () => interact(true)); }
  if (INSIDE_H) return insideInteract();
  const PR = nearPier(); if (PR) return boatMenu(PR); const ST = nearStall(); if (ST) return stallMenu(ST);
  if (zoneOf(P_.x, P_.z) === "hall" && hallSeat()) { SITTING_DOWN = true; return say(FEAST_TXT() + " Walk to stand up.", 18); }
  const DH = nearDoorHouse(); if (DH) return enterHouse(DH);
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
// the 250 m squares of houses: full detail near you, plain blocks further off, nothing far in the haze
const LODS = new Map(); scene.traverse(o => { const k = o.userData && o.userData.key; if (!o.isMesh || typeof k !== "string" || !(k[0] === "H" || k[0] === "L") || !/^[HL]-?\d/.test(k)) return; const c = k.slice(1).split("|")[0]; if (!LODS.has(c)) { const [i, j] = c.split(",").map(Number); LODS.set(c, { x: (i + 0.5) * LOD_CELL, z: (j + 0.5) * LOD_CELL, H: [], L: [], near: null, far: null }); } LODS.get(c)[k[0]].push(o); });
for (const k in KIT) { const at = k.indexOf("@"); if (at < 0 || !KIT[k].im) continue; const c = k.slice(at + 1); if (!LODS.has(c)) { const [i, j] = c.split(",").map(Number); LODS.set(c, { x: (i + 0.5) * LOD_CELL, z: (j + 0.5) * LOD_CELL, H: [], L: [], near: null, far: null }); } (LODS.get(c).K ||= []).push([KIT[k].im, kitNear(k) * (IS_HEADSET ? 0.75 : 1)]); }
const LOD_LIST = [...LODS.values()], LOD_NEAR = IS_HEADSET ? 300 : 380, LOD_FAR = IS_HEADSET ? 3600 : 5200; let lodTick = 0;
function lodStep(force) { if (!force && (lodTick++ % 8)) return; for (const C of LOD_LIST) { const d = Math.hypot(C.x - P_.x, C.z - P_.z), near = d < LOD_NEAR + (C.near ? 60 : 0), far = d > LOD_FAR; if (near === C.near && far === C.far) continue; C.near = near; C.far = far; for (const m of C.H) m.visible = near; for (const m of C.L) m.visible = !near && !far; }
  for (const C of LOD_LIST) if (C.K) { const d = Math.hypot(C.x - P_.x, C.z - P_.z); for (const [im, r] of C.K) im.visible = d < r; } }
if (false) scene.traverse(o => { const k = o.userData && o.userData.key; if (!o.isMesh || typeof k !== "string" || !k.startsWith("palace|")) return; const m = k.slice(7); if (m === "plank" || m === "stave" || m === "daub") o.material = G_MAT.rubble; else if (m === "thatch") o.material = G_MAT.shingle; });   // Henry III's palace: the old plan, rebuilt in stone
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
      else { if (gp.buttons[0]?.value > 0.3) run = 3;
        if (MENU) { if (Math.abs(ay) > 0.7 && snap) { MENU.sel = (MENU.sel + (ay > 0 ? 1 : MENU.opts.length - 1)) % MENU.opts.length; snap = false; drawMenu(); } if (tap("R", gp, 4)) { const o = MENU.opts[MENU.sel]; closeMenu(); o.fn(); } if (tap("R", gp, 5)) closeMenu(); }
        else { if (tap("R", gp, 4)) interact(); if (tap("R", gp, 5)) { if (RIDE) boatPace = (boatPace + 1) % BOAT_PACE.length; else { placeI = (placeI + 1) % PLACES.length; goPlace(PLACES[placeI]); } } }
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3 && Math.abs(ay) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) run = 3; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; if (flying) up = (keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0); }
  fwd.y = 0; fwd.normalize(); side.crossVectors(fwd, UP).normalize();
  const sp = MOUNT.ridden && !flying ? (run > 1 ? 8.5 : 3.8) * Math.max(1, SPEEDS[speedI][0] / 1.4) : (INSIDE_H || inAbbey(P_.x, P_.z) ? Math.min(SPEEDS[speedI][0], 1.4) : SPEEDS[speedI][0]) * run;   // on horseback: a trot, a canter
  if (RIDE) { mx = my = 0; rideStep(dt); }
  if ((mx || my) && SITTING_DOWN) SITTING_DOWN = false;
  if (mx || my) { const ox = P_.x, oz = P_.z; P_.x += (fwd.x * -my + side.x * mx) * sp * dt; P_.z += (fwd.z * -my + side.z * mx) * sp * dt;
    const high = flying && P_.y > groundAt(P_.x, P_.z) + 6; if (!high && !INSIDE_H) pushOut(P_);
    if (!flying && !INSIDE_H && groundAt(P_.x, P_.z) < -0.7) { P_.x = ox; P_.z = oz; }
    if (!flying && !allowedAt(P_.x, P_.z) && allowedAt(ox, oz)) { P_.x = ox; P_.z = oz; }
    if (MOUNT.ridden && zoneOf(P_.x, P_.z) && !zoneOf(ox, oz)) { P_.x = ox; P_.z = oz; if (clock.elapsedTime - blockT > 4) { blockT = clock.elapsedTime; say("You'll have to get down from the horse to go in (E).", 4); } } }   // the river is too deep to wade: use the bridge
  if (INSIDE_H) { flying = false; insideStep(t); }
  const g = RIDE ? P_.y : groundAt(P_.x, P_.z);
  if (RIDE) { } else if (flying) P_.y = Math.max(g, P_.y + up * Math.max(4, sp) * dt); else P_.y = g > P_.y ? Math.min(g, P_.y + Math.max(3.2, sp * 1.2) * dt) : Math.max(g, P_.y - Math.max(7, sp) * dt);
  rig.position.set(P_.x, P_.y + (vr && SITTING ? 0.45 : 0) - (SITTING_DOWN || RIDE ? 0.65 : 0) + (MOUNT.ridden ? 1.05 + (MOUNT.gait > 0.3 ? Math.abs(Math.sin(t * (MOUNT.gait > 5 ? 9 : 7))) * 0.07 : 0) : 0), P_.z);
  updateGround(P_.x, P_.z);
  lifeStep(dt, t); fireStep(dt, t); beastStep(t); reactStep(t); countryStep(t); lionStep(t); lodStep(); vehStep(t, dt); mountStep(dt, t); boatsStep(t, dt * Math.min(timeRate, 10));
  // the sun, low in the south all day; sky and light
  const hour = SIM / 3600, S = sunAt(hour), el = S.el, day = clampN(el * 7 + 0.35, 0, 1), dusk = clampN(1 - el * 9, 0, 1) * (el > -0.12 ? 1 : 0);
  sun.position.copy(rig.position).addScaledVector(S.dir, 800); sun.target.position.copy(rig.position);
  sun.intensity = (SUMMER ? 3.0 : AUTUMN ? 2.6 : 2.2) * clampN(el * 6, 0, 1); sun.color.setRGB(1, 0.88 - 0.25 * dusk, 0.74 - 0.4 * dusk); hemi.intensity = 0.2 + 1.45 * day;
  const inA = inAbbey(P_.x, P_.z) && !flying, zn = flying ? null : zoneOf(P_.x, P_.z), Z = zn && zn !== "abbey" ? ZONE_HIT : null;
  hemi.groundColor.setHex(inA ? 0x9a8c78 : 0x7a7060); if (INSIDE_H) { sun.intensity *= 0.1; hemi.intensity *= 0.12; } else if (inA) { sun.intensity *= 0.12; hemi.intensity *= 0.6; } else if (Z) { sun.intensity *= 0.1; hemi.intensity *= 0.3; }
  if (Z) { const up = Z.light0 && P_.y < Z.F.gy + 2.5, lp = gw(Z.F, ...(up ? Z.light0 : Z.light)); houseLight.position.set(...lp); houseLight.distance = Z.ld || (Z.name === "hall" ? 34 : Z.name === "church" ? Math.max(14, Math.max(Z.w, Z.d) * 0.85) : 14); houseLight.intensity = (Z.lp || (Z.name === "hall" ? 65 : Z.name === "church" ? 14 + Z.w * Z.d * 0.06 : 16)) * (0.88 + 0.08 * Math.sin(t * 13) + 0.04 * Math.sin(t * 29)); } else if (!INSIDE_H) houseLight.intensity = 0;
  abbeyLight.intensity = Math.hypot(P_.x, P_.z) < 90 ? (inA ? 260 : 30) * (0.9 + 0.1 * Math.sin(t * 7)) : 0;
  if (LEAFY) { dayUp.setRGB(0.22, 0.4, 0.75).multiplyScalar(0.05 + 0.95 * day); dayHor.setRGB(0.68, 0.74, 0.82).multiplyScalar(0.06 + 0.94 * day); } else { dayUp.setRGB(0.55, 0.62, 0.72).multiplyScalar(0.05 + 0.95 * day); dayHor.setRGB(0.80, 0.80, 0.80).multiplyScalar(0.06 + 0.94 * day); } dayHor.lerp(_c1.setRGB(0.95, 0.62, 0.40), dusk * 0.5);
  skyMat.uniforms.up.value.copy(dayUp); skyMat.uniforms.hor.value.copy(dayHor); scene.fog.color.copy(dayHor); sky.position.copy(rig.position);
  sunDisc.position.copy(rig.position).addScaledVector(S.dir, 20000); sunDisc.lookAt(rig.position); sunDisc.visible = el > -0.03;
  water.position.x = Math.round(P_.x / 500) * 500; water.position.z = Math.round(P_.z / 500) * 500;
  lblT -= dt; if (lblT <= 0) { lblT = 0.15; updateLabels(); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; vrDirty = true; }
  mapT -= dt; if (mapT <= 0) { mapT = 0.25; if (MAPC.style.display !== "none" && !vr) drawMap(MAPC, 240, MAP_SPANS[mapSpanI]); if (vr) { drawMap(wristC, 512, MAP_SPANS[mapSpanI]); wristT.needsUpdate = true; } }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3;
    const hh = Math.floor(SIM / 3600), mi = Math.floor(SIM / 60) % 60, DH = INSIDE_H ? null : nearDoorHouse();
    let nearM = null, nd = 1e9; for (const m of MARKS) { if (m.follow || m.hidden) continue; const d = Math.hypot(m.x - P_.x, m.z - P_.z); if (d < m.r && d < nd) { nd = d; nearM = m; } }
    const room = { hall: ERA === 1285 ? "in the Lesser Hall of the palace" : "in the great hall of Edward's palace", chamber: P_.y > PAL.chamber.gy + 2 ? (ERA === 1285 ? "in the Painted Chamber" : "upstairs in the king's chamber") : "in the chamber block's ground floor (the stair is outside)", kitchen: "in the palace kitchen", church: "inside the church", whall: "in Westminster Hall", tower: "in the Tower", pauls: "inside St Paul's", hall85: "inside the hall", wtower: "inside the White Tower", gate: "in the gatehouse", temple: "in the Temple Church" }[zoneOf(P_.x, P_.z)];
    const where = INSIDE_H ? "inside a house · E near things to read; E at the doorway to go out" : DH ? "at a doorway · <b>E: go inside</b>" : nearM ? `at <b>${nearM.name}</b> · E to read` : inA ? "inside Westminster Abbey" : room || (CITY.inside(P_.x, P_.z) ? "inside the walls of London" : "");
    HUD.innerHTML = `<b>London and Westminster, ${ERA === 1285 ? "Michaelmas, 29 September 1285" : ERA === 1100 ? "Lammas Day, 1 August 1100" : MARKET ? "a market day, December 1066" : "Christmas Day 1066"}</b> · ${hh}:${String(mi).padStart(2, "0")}${timeRate > 1 ? ` (time ×${timeRate})` : ""} · ${flying ? "flying" : SPEEDS[speedI][1] + (run > 1 ? ", running" : "")}<br>${where}<br>
      <span style="color:#e8dcc0">${UNSEEN ? "time traveller (unseen)" : "you: " + LIFE.short}${combs ? " · combs " + combs : ""}${eels ? " · eels " + eels : ""}${ale ? " · ale brewed" : ""} · purse ${fmtD(PURSE)}${BASKET.length ? " · basket: " + BASKET.slice(-6).join(", ") + (BASKET.length > 6 ? " …" : "") : ""}${RIDE ? (RIDE.voyage ? " · on a voyage down the river" : " · in the boat to " + RIDE.Q.name) + (BOAT_PACE[boatPace] > 1 ? " (×" + BOAT_PACE[boatPace] + ")" : "") : ""}</span><br><span style="color:#c8b898;font-size:12.5px">WASD walk · drag to look · shift run · − / = pace · E read / go in · N next moment · T time speed · L markers · F fly · M map</span>`;
    if (vr && (vrDirty || ((t * 3) | 0) % 3 === 0)) { drawVR(`${hh}:${String(mi).padStart(2, "0")} · ${where.replace(/<[^>]+>/g, "")}`, msgText || "Left stick walk · right stick turn · trigger run · A read / go in · B next place · X next moment of the coronation · Y time speed"); vrDirty = false; } }
  renderer.render(scene, camera);
}

// ---------- doing things: your purse, buying, drinking, sitting, boats ----------
// Money was the silver penny, struck by London's moneyers; there were no smaller coins, so a penny was cut in half for a halfpenny
// or in quarters for a farthing. Your purse holds 30 pence: about a month's pay for a labourer later in the Middle Ages.
let PURSE = 120; const BASKET = [];   // in farthings
const fmtD = f => { const d = Math.floor(f / 4), q = f % 4; return (d ? d : q ? "" : "0") + ["", "¼", "½", "¾"][q] + "d"; };
const coinWords = f => f === 1 ? "a farthing (a quarter of a silver penny, cut from a whole one)" : f === 2 ? "a halfpenny (a penny cut in half)" : f % 4 === 0 ? `${f / 4} silver penn${f === 4 ? "y" : "ies"}` : `${fmtD(f)} in silver, some of it cut`;
let MENU = null, SITTING_DOWN = false, RIDE = null;
function showMenu(title, opts, note = "") { MENU = { title, opts, sel: 0, note }; drawMenu(); }
function drawMenu() { if (!MENU) return; msgText = MENU.title + " · " + MENU.opts.map((o, i) => `${i + 1}. ${o.label}`).join(" · ");
  MSG.innerHTML = `<b>${MENU.title}</b>${MENU.note ? `<br><span style="color:#c8b898">${MENU.note}</span>` : ""}` + MENU.opts.map((o, i) => `<div data-o="${i}" style="cursor:pointer;padding:3px 6px;margin-top:3px;border-radius:6px;${i === MENU.sel ? "background:rgba(255,233,168,.22)" : ""}"><b>${i + 1}</b> · ${o.label}</div>`).join("") +
    `<div style="color:#c8b898;font-size:12.5px;margin-top:6px">press a number or click · E or Esc to close · your purse: ${fmtD(PURSE)}</div>`; MSG.style.display = "block"; msgT = 1e9; vrDirty = true; }
function closeMenu() { MENU = null; msgT = 0.01; }
MSG.addEventListener("click", e => { const d = e.target.closest("[data-o]"); if (!d || !MENU) return; e.stopPropagation(); const o = MENU.opts[+d.dataset.o]; closeMenu(); o.fn(); });
addEventListener("keydown", e => { if (!MENU) return; if (e.code === "Escape") closeMenu(); const n = e.code.startsWith("Digit") ? +e.code.slice(5) - 1 : -1; if (n >= 0 && n < MENU.opts.length) { const o = MENU.opts[n]; closeMenu(); o.fn(); } });
function buy(name, price, about, then) { if (PURSE < price) return say(`You haven't enough left: ${name} costs ${fmtD(price)} and your purse holds ${fmtD(PURSE)}.`, 8);
  PURSE -= price; if (!then) BASKET.push(name); say(`You buy ${name} for ${coinWords(price)}. ${about || ""} <span style="color:#c8b898">(Prices are guesses: none survive for London in 1066.)</span>`, 14); if (then) then(); }
function stallMenu(S) { const G = S.G; showMenu(`${G.name}`, G.items.map(([n, p, about]) => ({ label: `${n} · ${fmtD(p)}`, fn: () => buy(n, p, about) })), S.kind === "butcher" ? "The butcher cuts what you point at from the carcasses hanging behind." : S.kind === "fish" ? "Fresh from the river and salted from the sea." : ""); }
function aleMenu() { showMenu("The alewife", [{ label: `a jug of ale · ${fmtD(2)}`, fn: () => buy("a jug of ale", 2, "You sit on the bench and drink: thick, sweetish, cloudy and not strong. Unhopped: hops came to England in the 15th century.", () => sitDown("Sitting in the alehouse with your ale. Walk to stand up.")) }, { label: "a cup of mead (honey wine, dearer) · " + fmtD(4), fn: () => buy("a cup of mead", 4, "Mead, made from honey: a drink for feasts.", () => sitDown("Sitting with your mead. Walk to stand up.")) }]); }
function sitDown(txt) { SITTING_DOWN = true; say(txt, 10); }
// boats
function boatMenu(P) { showMenu(`Hire a boat at ${P.name}`, [...PIERS.filter(Q => Q !== P).map(Q => ({ label: `to ${Q.name} · ${fmtD(2)}`, fn: () => buy(`a boat to ${Q.name}`, 2, "", () => startRide(P, Q)) })),
    { label: `down the river to the sea, a long voyage · ${fmtD(8)}`, fn: () => buy("a passage down the river", 8, "", () => startVoyage(P)) }], "A rowed boat makes 3-5 miles an hour; − and = (or B in VR) speed the trip up."); }
const rideBoat = new THREE.Group(); { const hull = new THREE.Mesh(BOAT_G, MAT.tar); hull.scale.set(1.6, 0.75, 6.4); rideBoat.add(hull); const boards = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 5.2), MAT.wood); boards.position.y = 0.2; rideBoat.add(boards);
  for (const z of [-1.2, 0.6, 2.0]) { const th = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.25), MAT.wood); th.position.set(0, 0.42, z); rideBoat.add(th); } }   // hull, bottom boards, thwarts
rideBoat.visible = false; scene.add(rideBoat);
const BOAT_PACE = [1, 3, 10, 30]; let boatPace = 0;
function startRide(P, Q) { if (INSIDE_H) leaveHouse(); if (MOUNT?.ridden) mountToggle(); const path = riverRoute(P, Q), len = path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0); RIDE = { P, Q, path, len, s: 0, rx: 0, rz: 0, rh: 0, seen: new Set() }; rideBoat.visible = true; flying = false; SITTING_DOWN = false;
  say(`You step into the boat at ${P.name}. The boatman pushes off for ${Q.name}. Look around: the river was London's main road. (− / = to speed up the trip.)`, 10); }
// a voyage down the river to the sea: along the Thames from the pier, then the lower river; E aboard to put ashore or turn back
function startVoyage(P) { if (INSIDE_H) leaveHouse(); if (MOUNT?.ridden) mountToggle(); let sP = 0, bd = 1e9; for (let s = 0; s <= THAMES.L; s += 20) { const [x, z] = THAMES.at(s), d = Math.hypot(x - P.boat[0], z - P.boat[1]); if (d < bd) { bd = d; sP = s; } }
  const path = [P.boat]; for (let s = sP; s < THAMES.L - 50; s += 60) { const [x, z] = THAMES.at(s); path.push([x, z]); } for (let s = 0; s <= LOWER.L; s += 80) { const [x, z] = LOWER.at(s); path.push([x, z]); } path.splice(0, path.length, ...throughArch(path));
  const len = path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0); RIDE = { P, Q: P, path, len, s: 0, rx: 0, rz: 0, rh: 0, voyage: true, seen: new Set() }; rideBoat.visible = true; flying = false; SITTING_DOWN = false; boatPace = 1;
  say("You take passage down the river: past the bridge and " + (ERA >= 1100 ? "the White Tower" : "the Tower's empty corner") + ", round the Isle of Dogs, and on through the marshes to the estuary and the sea, about 70 km. Press E aboard to put ashore or turn back; − / = (B in VR) change the pace.", 14); }
function voyageMenu() { showMenu("Aboard", [{ label: "keep going", fn: () => {} }, { label: "put ashore here", fn: putAshore }, { label: "turn back to London", fn: () => { const P = PIERS.find(p => p.name === "Queenhithe"); RIDE = null; rideBoat.visible = false; teleport(P.land[0], P.land[1], P.land[0] + 10, P.land[1] + 30); say("A day later, you are back at Queenhithe.", 6); } }]); }
function putAshore() { const R = RIDE; if (!R) return; const x0 = rideBoat.position.x, z0 = rideBoat.position.z; let best = null;
  for (let r = 10; r < 9000 && !best; r += 15) for (let a = 0; a < 6.283; a += 0.2) { const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (baseH(x, z) > 0.6) { best = [x, z]; break; } }
  RIDE = null; rideBoat.visible = false; if (best) { teleport(best[0], best[1], x0, z0); say("The boatman runs the boat up on the shore and you step out. To get back, use the guide's places (or find a boat).", 8); } }
function rideStep(dt) { const R = RIDE; R.s += dt * 2.0 * BOAT_PACE[boatPace]; const [x, z, h, done] = routeAt(R.path, R.s); const sx = Math.sin(h), sz = Math.cos(h);
  rideBoat.position.set(x, WATER - 0.22 + Math.sin(clock.elapsedTime * 1.4) * 0.04, z); rideBoat.rotation.set(Math.sin(clock.elapsedTime * 0.9) * 0.02, h, 0); P_.x = x - sx * 1.0; P_.z = z - sz * 1.0; P_.y = WATER + 0.05; R.rx = x + sx * 1.6; R.rz = z + sz * 1.6; R.rh = h + Math.PI;
  if (((clock.elapsedTime * 2) | 0) % 2 === 0) for (const m of MARKS) { if (R.seen.has(m) || m.follow || m.hidden || m.tag === "person") continue; if (Math.hypot(m.x - x, m.z - z) < Math.min(1500, m.range)) { R.seen.add(m); if (R.voyage && m.big !== undefined && VILLS.some(V => V.name === m.name)) { say(`<b>Passing ${m.name}</b> · ${m.text}`, 18); break; } } }   // what you pass
  if (done) { RIDE = null; rideBoat.visible = false; if (R.voyage) { putAshore(); say("The estuary opens into the sea. Beyond the Nore, the German Ocean: the way the wine ships came from Rouen and the Danes came from the north. You are put ashore.", 14); return; }
    P_.x = R.Q.land[0]; P_.z = R.Q.land[1]; P_.y = groundAt(P_.x, P_.z); if (R.eels) { eels += 6; DIARY.push([SIM, "Checked the eel traps"]); SIM += 3600; say("Six fat eels in the traps, and the traps re-baited. Back at the landing an hour later.", 10); } else say(`You step ashore at ${R.Q.name}.`, 6); } }
// sitting at the tables in the palace hall
function hallSeat() { const F = PAL.hall, dx = P_.x - F.x, dz = P_.z - F.z, lx = dx * F.c - dz * F.s, lz = dx * F.s + dz * F.c; return Math.abs(Math.abs(lx) - 4.7) < 1.4 && lz > -10 && lz < 8; }
const FEAST_TXT = () => MARKET ? "You sit at a trestle table in the king's hall. Servants are about; there is bread and ale for the household." :
  SIM > T.leave + 300 ? "You sit at the coronation feast: bread, roast pork and beef, game birds, salmon, cheeses, spiced dishes for the high table, ale and wine from Normandy. Harpers and gleemen sing. (What was served at William's feast is not recorded; this is what a great Late Saxon feast had.)" :
  "You sit at a trestle table. The servants are laying the hall for the coronation feast.";
// where you can do things: for the guide
const TODO = [];
if (MARKET) TODO.push(["The Shambles (butchers)", 51.5150, -0.0994], ["Cheapside stalls", 51.5143, -0.0952], ["Eastcheap", 51.5110, -0.0862], ["Fish at Billingsgate", 51.5099, -0.0834], ["Fish and salt at Queenhithe", 51.5109, -0.0950]);
for (const P of PIERS) TODO.push(["A boat from " + P.name, P.land]); ALEHOUSES.forEach((H, i) => TODO.push(["An alehouse" + ["", " (Eastcheap)", " (Fleet Street)", " (Westminster)"][i], [H.dp[0] + Math.sin(H.dp[2]) * 2, H.dp[1] + Math.cos(H.dp[2]) * 2]]));
if (ERA !== 1285) TODO.push(["Sit in the king's hall", [PAL.seat(4.0, -2)[0], PAL.seat(4.0, -2)[2]]]);
function goTodo(k) { const [n, a, b] = TODO[k]; let x, z; if (Array.isArray(a)) [x, z] = a; else { [x, z] = LL(a, b); const p = { x, z }; pushOut(p); x = p.x; z = p.z; } start(); teleport(x, z, x + 10, z + 3); say(`<b>${n}</b>`, 5); }
function nearStall() { let best = null, bd = 2.6; for (const S of STALLS) { const d = Math.min(Math.hypot(S.front[0] - P_.x, S.front[1] - P_.z), Math.hypot(S.x - P_.x, S.z - P_.z) + 0.4); if (d < bd) { bd = d; best = S; } } return best; }
function nearPier() { for (const P of PIERS) if (Math.hypot(P.land[0] - P_.x, P.land[1] - P_.z) < 6) return P; return null; }

self.TODO_LIST = TODO; drawGuide();

// ---------- who you are: a life to live ----------
// Chosen on the start card. Each life has a home, a household and a day of ordinary tasks of the time (all optional: the world is open).
// People react to you as they would have: by your rank, whether you are English or not, and where you go.
// home: a house chosen for each life
let HOME = null, SHELTER = null;
const nearestHouse = (lat, lon, test = H => !H.burnt) => { const [x, z] = LL(lat, lon); let best = null, bd = 1e9; for (const H of HOUSES) { if (!test(H)) continue; const d = Math.hypot(H.x - x, H.z - z); if (d < bd) { bd = d; best = H; } } return best; };
if (WHO === "comb") HOME = nearestHouse(51.5122, -0.0950, H => !H.burnt && !H.ale && H.dp);
if (WHO === "ale") HOME = ALEHOUSES[1] || ALEHOUSES[0];
if (WHO === "thegn") { const [x, z] = LL(51.5160, -0.0925); HOME = HOUSES.filter(H => !H.burnt && !H.ale && H.dp && Math.hypot(H.x - x, H.z - z) < 220).sort((a, b) => b.w * b.d - a.w * a.d)[0]; }
if (WHO === "south") { HOME = nearestHouse(51.5040, -0.0895, H => ERA === 1066 ? H.burnt : !H.burnt && !H.noEnter); if (HOME && ERA === 1066) { const c = Math.cos(HOME.ry), s = Math.sin(HOME.ry), ox = HOME.w / 2 + 2.2, sx = HOME.x + c * ox, sz = HOME.z - s * ox, gy = groundH(sx, sz);
    SHELTER = { x: sx, z: sz, gy }; for (const [u, v] of [[-1, -1.6], [-1, 1.6], [1, -1.6], [1, 1.6]]) put("hutpost", CYL_G, MAT.wood, sx + c * u + s * v, gy, sz - s * u + c * v, 0.14, u < 0 ? 2.2 : 1.2, 0.14);   // a lean-to of poles and old thatch
    put("hutroof", BOX_G, MAT.thatch, sx, gy + 1.6, sz, 2.6, 0.2, 3.6, HOME.ry, 0, 0.42); put("shfire", HFIRE_G, hearthFireM, sx + c * 2.4, gy, sz - s * 2.4, 1.2, 1.2, 1.2); SHELTER.fire = [sx + c * 2.4, sz - s * 2.4]; } }
if (HOME) HOME.home = true;
// the household
const HOUSEHOLD = { comb: ["woman", "child", "child"], ale: ["eng", "child", "child", "woman"], thegn: ["woman", "eng", "eng", "woman"], south: ["woman", "child", "child"] }[WHO] || [];
if (SHELTER) HOUSEHOLD.forEach((r, k) => { const a = k / HOUSEHOLD.length * 6.28, x = SHELTER.fire[0] + Math.cos(a) * 1.3, z = SHELTER.fire[1] + Math.sin(a) * 1.3; agent(r, { fixed: [x, z, face(x, z, ...SHELTER.fire)], kind: k ? "sit" : "sell", family: true }); });
// the day: tasks with a place, a test and what doing them means; doing one passes time
const DIARY = [];
const fade = document.createElement("div"); fade.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .8s;z-index:6"; document.body.appendChild(fade);
let busy = false;
function spend(mins, text, after) { if (busy) return; busy = true; fade.style.opacity = 1; setTimeout(() => { SIM += mins * 60; narrI = -1; if (after) after(); fade.style.opacity = 0; busy = false; say(text, 22); drawGuide(); }, 900); }
const homeDoor = () => HOME?.dp ? [HOME.dp[0] + Math.sin(HOME.dp[2]) * 1.5, HOME.dp[1] + Math.cos(HOME.dp[2]) * 1.5] : SHELTER ? [SHELTER.x, SHELTER.z] : null;
const atHome = () => (HOME && INSIDE_H === HOME) || (SHELTER && Math.hypot(P_.x - SHELTER.x, P_.z - SHELTER.z) < 6);
const nearChurch = () => CHURCHES.find(C => Math.hypot(C.x - P_.x - C.nl / 2, C.z - P_.z) < 12 || Math.hypot(C.x - P_.x, C.z - P_.z) < 14);
const hh = () => SIM / 3600;
let combs = 0, eels = 0, ale = 0;
const T_ = (id, name, when, where, test, run) => ({ id, name, when, where, test, run });
const TASKS = {
  common: [
    T_("fire", "Rake up the fire", "dawn", "at home", () => atHome(), () => spend(15, "You rake back the ashes: the fire was banked overnight and the embers are still alive, so there is no need for flint and steel. A handful of kindling, a log; the smoke finds its way up through the thatch. It is still dark: in midwinter people rose before the sun (8:05) and used the light.")),
    T_("water", "Fetch water from the well", "morning", "the yard well, or the river", () => atHome() || BASKET.length >= 0 && STALLS && false, () => spend(20, "You carry two wooden pails to the well in the yard: a timber-lined shaft like those excavated behind Late Saxon houses. Water for drinking (mostly ale was drunk), cooking, washing. Many Londoners used the Thames or the Walbrook."))],
  church: T_("mass", "Hear mass at the parish church", "Christmas morning", "any parish church", () => !MARKET && !!nearChurch(), () => spend(60, "Christmas mass. You stand in the nave with your neighbours (there are no pews); beyond the chancel arch the priest says the mass in Latin at the altar, candles burning. At Christmas there were three masses: at midnight, at dawn and in the day. The church is cold; your breath shows.")),
  comb: [
    T_("work", "Make combs at your bench", "morning", "at home", () => atHome(), () => spend(150, "You work at your bench by the door for the light. Shed antlers of red deer, bought from the country: you saw them into plates and side-strips, rivet the plates between the strips with small iron rivets, then cut the teeth with a fine saw, and finish with a file and a polish. Antler offcuts like yours are found all over Late Saxon London. Three combs done.", () => { combs += 3; })),
    T_("sell", "Sell combs at a stall on Cheapside", "market day", "Cheapside", () => MARKET && combs > 0 && STALLS.some(S => S.kind === "comb" && Math.hypot(S.x - P_.x, S.z - P_.z) < 6), () => { const n = combs, p = n * 4; spend(90, `You set out your combs on the trestle and call your wares. Women and men try them; you haggle. ${n} sold for ${fmtD(p)} in silver pennies and cut halfpennies.`, () => { PURSE += p; combs = 0; }); }),
    T_("eat", "Eat with your family", "midday", "at home", () => atHome(), () => spend(45, MARKET ? "Pottage of beans and leeks from the pot on the fire, dark bread, cheese, ale. Two meals a day was usual: a light one in the morning and dinner around midday." : "Christmas dinner, the feast after the Advent fast: pork, a goose if you can afford one, white bread, ale, and honey cakes for the children.")),
    T_("tafl", "Play tafl by the fire", "evening", "at home", () => atHome() && hh() > 15, () => spend(60, "Tafl: the king's game, a board game played in England and Scandinavia. The king and his men break out to the edge of the board; the attackers try to trap him. A board is found at Coppergate in York.")),
    T_("sleep", "Go to bed", "night", "at home", () => atHome() && hh() > 16, () => endDay())],
  ale: [
    T_("brew", "Brew a batch of ale", "morning", "at home, at the cauldron", () => atHome(), () => spend(180, "You heat water in the great pot, steep the malted barley in it (the mash), run off the sweet liquor, boil it, cool it in tubs and pitch in yeast from the last brew. No hops (they came in the 15th century): unhopped ale goes sour in a few days, so brewing never stops. Brewing was mostly women's work.", () => { ale += 20; })),
    T_("spin", "Spin wool with your spindle", "any time", "at home", () => atHome(), () => spend(60, "Distaff under your arm, a spindle with a clay or bone whorl dropping and turning: every woman spun whenever her hands were free. Spindle whorls are among the commonest finds in London. A day's spinning makes enough yarn for a few hand-breadths of cloth.")),
    T_("serve", "Serve your customers", "afternoon", "at home", () => atHome() && ale > 0, () => spend(120, `Carters, porters, a sailor from Rouen. You draw ale from the cask into jugs; they drink on the benches. ${MARKET ? "" : "Holy day or not, the alehouse is full. "}You take ${fmtD(10)}.`, () => { PURSE += 10; ale = Math.max(0, ale - 10); })),
    T_("eat", "Cook and eat with your family", "midday", "at home", () => atHome(), () => spend(60, "Pottage, the everyday food: grain, peas or beans and leeks, with a little bacon, simmered all morning in the pot on the fire. Bread, ale, cheese.")),
    T_("sleep", "Go to bed", "night", "at home", () => atHome() && hh() > 16, () => endDay())],
  south: [
    T_("rebuild", ERA === 1066 ? "Work on rebuilding your house" : "Mend your nets and traps", "morning", ERA === 1066 ? "your burnt house" : "your house", () => HOME && Math.hypot(HOME.x - P_.x, HOME.z - P_.z) < 10, () => spend(150, ERA === 1066 ? "You dig out the burnt post stumps and set new oak posts in the holes, your neighbour helping. Earth-fast posts, then wattle panels, daub, rafters, thatch: a house like this took a few weeks to build with family and neighbours." : "You sit at your door mending your nets with hemp twine and weaving new eel traps of willow, waiting for the tide to turn.")),
    T_("eels", "Check your eel traps from the boat", "morning", "the Southwark landing", () => { const P = PIERS.find(p => p.name === "Southwark"); return P && Math.hypot(P.land[0] - P_.x, P.land[1] - P_.z) < 8; }, () => { const P = PIERS.find(p => p.name === "Southwark"); startEelRun(P); }),
    T_("selleels", "Sell eels at Billingsgate", "market day", "Billingsgate", () => MARKET && eels > 0 && STALLS.some(S => S.kind === "fish" && Math.hypot(S.x - P_.x, S.z - P_.z) < 8), () => { const p = eels * 2; spend(60, `You sell your eels to the fishmongers at Billingsgate: ${fmtD(p)}.`, () => { PURSE += p; eels = 0; }); }),
    T_("eat", "Eat by the fire with your family", "midday", ERA === 1066 ? "the shelter" : "your house", () => atHome(), () => spend(40, ERA !== 1066 ? (eels ? "Eels stewed in the pot with leeks, bread and ale, by the hearth with your family." : "Bread, a pottage of peas and beans, ale.") : eels ? "Eels stewed in the pot, bread, small ale. The children are cold; the lean-to keeps off the rain but not the wind." : "Bread, a little cheese, small ale. The burning took your stores; neighbours across the river have helped.")),
    T_("sleep", "Sleep in the shelter", "night", "the shelter", () => atHome() && hh() > 16, () => endDay())],
  thegn: [
    T_("dress", "Dress in your best", "dawn", "at home", () => atHome(), () => spend(20, "Your servants bring your best: a fine linen shirt, a tunic of madder-red wool with a tablet-woven border, a cloak of blue with a gilt brooch at the right shoulder, your sword-belt. A thegn showed his rank by his dress and his weapons.")),
    T_("walk", "Go out to Westminster with your men", "Christmas morning", "from your house", () => !MARKET && atHome() || !MARKET && CITY.inside(P_.x, P_.z), () => spend(45, "Out by Ludgate, over the Fleet bridge, along Fleet Street and the Strand past the fields, through Charing and down King Street: about 3 km to Westminster. Norman patrols on the road.", () => { if (INSIDE_H) leaveHouse(); teleport(40, -60, 0, -27); })),
    T_("abbey", "Take your place in the abbey", "before 10:00", "the north door", () => !MARKET && Math.hypot(P_.x, P_.z + 30) < 25 && SIM < T.shout, () => { teleport(2.5, 15, 15, 0); say("You stand with the English thegns in the south transept. Across the crossing the Norman lords; before the altar the bishops. The procession is coming.", 14); }),
    T_("feast", "Sit at the king's feast", "after the crowning", "the king's hall", () => !MARKET && SIM > T.leave + 240 && zoneOf(P_.x, P_.z) === "hall", () => { SITTING_DOWN = true; say(FEAST_TXT() + " You sit among the English thegns at the trestles; the new king and the bishops at the high table. Who would keep his lands under the new king was on every mind.", 20); }),
    T_("rents", "Receive your tenants' rents", "market day", "at home", () => MARKET && atHome(), () => spend(90, "Your tenants come in with their dues for the Christmas term: silver pennies, a few hens, a cheese. Your reeve tallies it on a notched stick.", () => { PURSE += 40; })),
    T_("husting", "Attend the husting court", "market day", "by St Paul's", () => MARKET && Math.hypot(...((([x, z]) => [x - P_.x, z - P_.z])(LL(51.5138, -0.0985)))) < 90, () => spend(90, "London's husting, the city court, met weekly: disputes over debts, property and trade, settled before the aldermen and the bishop's men. The folkmoot of all the citizens met in the open by St Paul's a few times a year.")),
    T_("sleep", "Go to bed", "night", "at home", () => atHome() && hh() > 16, () => endDay())] };
const MY_TASKS = UNSEEN ? [] : [...(TASKS[WHO] || []), ...(WHO !== "thegn" && WHO !== "south" ? TASKS.common : WHO === "south" ? [TASKS.common[0]] : []), ...(MARKET ? [] : [TASKS.church])];
function doTask(t) { DIARY.push([SIM, t.name]); t.run(); }
function taskHere() { if (busy) return null; for (const t of MY_TASKS) if (t.test()) return t; return null; }
function startEelRun(P) { const [bx, bz] = P.boat, [cx, cz] = THAMES.at(0), path = [P.boat]; let best = 0, bd = 1e9; for (let s = 0; s < THAMES.L; s += 20) { const [x, z] = THAMES.at(s), d = Math.hypot(x - bx, z - bz); if (d < bd) { bd = d; best = s; } }
  for (const ds of [0, -120, -260, -120, 0]) { const [x, z] = THAMES.at(best + ds); path.push([x + (bx - x) * 0.5, z + (bz - z) * 0.5]); } path.push(P.boat);
  RIDE = { P, Q: P, path, len: path.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - path[i][0], p[1] - path[i][1]), 0), s: 0, rx: 0, rz: 0, rh: 0, eels: true }; rideBoat.visible = true;
  say("You row out to your traps: wicker eel-traps (grigs) staked in the shallows upstream, and a weir of hurdles. Eels were caught in huge numbers; rents were paid in them.", 12); }
function endDay() { spend(30, `<b>The end of your day.</b> ${DIARY.length ? "You " + DIARY.map(([t, n]) => `${n.toLowerCase()} (${Math.floor(t / 3600)}:${String(Math.floor(t / 60) % 60).padStart(2, "0")})`).join("; ") + "." : ""} Sleep: on a straw-filled bed along the wall, the household round the banked fire. In winter people slept long. Walk on to begin again in the morning.`, () => { SIM = hms(7, 30); DIARY.length = 0; combs = eels = ale = 0; }); }
// how people speak to you (a little Old English or French, translated)
const GREET = {
  common: ["“Wes þū hāl!” (Good health to you!)", "“God's blessing on you, neighbour.”", "“Have you heard? They say the duke will be crowned at Westminster.”", "“Bread is dear since the Normans came.”", "“Southwark is still black from the burning.”", "“Mind the mud by the conduit.”", "“My cousin saw the duke's knights at Ludgate.”"],
  toNoble: ["(bows) “Hlāford.” (My lord.)", "(bows) “God keep you, lord.”", "(steps aside, head down)"],
  norman: ["“Arrière!” (Back!) a Norman soldier waves you off.", "(a Norman stares at you and says something in French to his fellows)", "“Anglais...” (he mutters)"],
  normanToNoble: ["(a Norman nods) “Sire.”", "(a Norman knight looks you over and lets you pass)"],
  clergy: ["“Pax vobiscum.” (Peace be with you.)", "“Benedicite.” (Bless you.)"],
  child: ["(children run past, shrieking, chasing a pig's bladder ball)", "(a child stares at you, then runs off)"] };
const BUBBLES = [0, 1, 2].map(() => { const c = document.createElement("canvas"); c.width = 512; c.height = 96; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false, fog: false })); s.renderOrder = 15; s.visible = false; s.scale.set(1.9, 0.36, 1); scene.add(s); return { s, c, t, A: null, until: 0 }; });
function bubble(A, text) { const B = BUBBLES.find(b => !b.A) || BUBBLES[0], g = B.c.getContext("2d"); g.clearRect(0, 0, 512, 96); g.font = "30px -apple-system, Helvetica, sans-serif"; const w = Math.min(500, g.measureText(text).width + 30);
  g.fillStyle = "rgba(255,250,236,.94)"; g.beginPath(); g.roundRect((512 - w) / 2, 8, w, 64, 16); g.fill(); g.beginPath(); g.moveTo(240, 72); g.lineTo(256, 92); g.lineTo(272, 72); g.fill(); g.fillStyle = "#2a2018"; g.textAlign = "center"; g.fillText(text, 256, 52, w - 24);
  B.t.needsUpdate = true; B.A = A; B.until = clock.elapsedTime + 4; B.s.visible = true; }
let reactT = 0;
function reactStep(t) { for (const B of BUBBLES) { if (!B.A) continue; if (t > B.until || !B.A.shown) { B.A = null; B.s.visible = false; continue; } B.s.position.set(B.A.x, personY(B.A.x, B.A.z) + 2.25, B.A.z); }
  if (UNSEEN || busy || RIDE) return; reactT -= 1 / 60; if (reactT > 0) return; reactT = 0.3;
  for (const A of AG2) { if (!A.shown || A.family || A.rower || A.proc) continue; const d = Math.hypot(A.x - P_.x, A.z - P_.z); if (d > 2.6 || (A.greetT && t - A.greetT < 50)) continue;
    A.greetT = t; A.react = { until: t + 4, h: face(A.x, A.z, P_.x, P_.z), bow: LIFE.rank === "noble" && A.L.role !== "norman" && A.L.role !== "soldier" && A.L.role !== "bishop" };
    const r = A.L.role, nor = r === "norman" || r === "soldier", cler = r === "monk" || r === "cleric" || r === "bishop" || r === "archbishop", pool = r === "child" ? GREET.child : cler ? GREET.clergy : nor ? (LIFE.rank === "noble" ? GREET.normanToNoble : GREET.norman) : LIFE.rank === "noble" ? GREET.toNoble : GREET.common;
    const line = pool[Math.floor(Math.random() * pool.length)]; bubble(A, line.length > 46 ? line.slice(0, line.indexOf("”") + 1 || 46) : line); if (d < 2) say(line, 6); break; } }
// where you may not go
let blockT = 0;
function allowedAt(x, z) { if (UNSEEN) return true; const zn = zoneOf(x, z), t = clock.elapsedTime;
  const no = msg => { if (t - blockT > 4) { blockT = t; say(msg, 7); } return false; };
  if (zn === "abbey" && !MARKET && LIFE.rank === "common" && SIM > T.proc - 900 && SIM < T.flee) return no("A Norman guard bars the door with his spear: “Arrière!” The church is full of the great men of both peoples; ordinary folk watch from outside.");
  if ((zn === "hall" || zn === "chamber" || zn === "kitchen") && LIFE.rank === "common") return no("A royal servant blocks the doorway: “Not here: this is the king's hall.”");
  if (zn === "chamber" && LIFE.rank === "noble") return no("A chamberlain stops you: the king's chamber is private.");
  return true; }
// going into someone else's house
function houseWelcome(H) { if (UNSEEN || H === HOME || H.ale) return; if (LIFE.rank === "noble") return say("The household stands up as you come in. “Lord? How may we serve you?”", 7);
  say("“Hey! Who are you? This isn't your house: out!” The householder stands up to see you off.", 6); setTimeout(() => { if (INSIDE_H === H) leaveHouse(); }, 2600); }

// starting your day; your house marked; the day's list in the guide
if (HOME && !UNSEEN) mark("Your house", HOME.x, HOME.z, "person", "Your home. Press E at the door to go in; inside, press E for the day's tasks.", { y: 6, r: 6, range: 3000, big: true });
if (SHELTER && !UNSEEN) mark("Your family's shelter", SHELTER.x, SHELTER.z, "person", "Your family's lean-to by the burnt house. Press E here for the day's tasks.", { y: 4, r: 6, range: 3000, big: true });
buildKit(scene);
function roleStart() { const p = homeDoor(); if (p) { teleport(p[0], p[1], HOME ? HOME.x : SHELTER.fire[0], HOME ? HOME.z : SHELTER.fire[1]); if (HOME && !SHELTER && HOME.dp) enterHouse(HOME); }
  say(`<b>You are ${LIFE.title}.</b> ${LIFE.intro} ${ERA === 1285 ? "It is Michaelmas, 29 September 1285: quarter day, when rents fall due. London Bridge stands in stone." : ERA === 1100 ? "It is Lammas Day, 1 August 1100, a generation after the Conquest: the White Tower stands finished over the City." : MARKET ? "Today is a market day." : "Today is Christmas Day, 1066."} Press E at home for the day's tasks (all optional: go anywhere). The guide on the right lists your day.`, 26); }
function tasksMenu(avail, fallback) { showMenu(`What will you do? (${Math.floor(SIM / 3600)}:${String(Math.floor(SIM / 60) % 60).padStart(2, "0")})`, [...avail.map(t => ({ label: t.name, fn: () => doTask(t) })), ...(fallback ? [{ label: "something else: look around here", fn: fallback }] : [])]); }

self.ROLES_READY = true; drawGuide();
// ---------- your horse ----------
// A saddled horse tethered near where you start. Horses of the time were small (about 13-14 hands); saddles had a high pommel and cantle,
// and stirrups were in use in England by the 11th century (the Bayeux Tapestry shows both). Thegns and knights rode; most townsfolk walked.
const MOUNT = (() => { const g = new THREE.Group(), body = new THREE.Mesh(HORSE_G, M(WHO === "thegn" ? 0x3a2a20 : 0x6a4a30, { vertexColors: true })); g.add(body);
  const tack = M(0x4a3020); for (const [w, h, d, x, y, z] of [[0.62, 0.12, 0.7, 0, 1.46, 0.05], [0.5, 0.22, 0.08, 0, 1.56, 0.4], [0.5, 0.26, 0.08, 0, 1.58, -0.3], [0.04, 0.5, 0.04, 0.33, 1.2, 0.05], [0.04, 0.5, 0.04, -0.33, 1.2, 0.05]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tack); m.position.set(x, y, z); g.add(m); }   // saddle, pommel, cantle, stirrup leathers
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 4, 8), MAT.iron); st.position.set(s * 0.33, 0.93, 0.05); g.add(st); }
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.95), M(WHO === "thegn" ? 0x8a2a24 : 0x6a5a48)); cloth.position.set(0, 1.28, 0.05); g.add(cloth);
  scene.add(g); return { g, x: 0, z: 0, h: 0, ridden: false, gait: 0 }; })();
{ let x, z, h; if (UNSEEN) { x = START.x + 6; z = START.z - 3; h = 0; } else { const p = homeDoor(); const a = HOME?.dp ? HOME.dp[2] : 0; x = p[0] + Math.cos(a) * 3.5 + Math.sin(a) * 2; z = p[1] - Math.sin(a) * 3.5 + Math.cos(a) * 2; h = a + Math.PI / 2; const q = { x, z }; pushOut(q, 1.2); x = q.x; z = q.z; }
  Object.assign(MOUNT, { x, z, h }); }
mark(WHO === "thegn" || UNSEEN ? "Your horse" : "A neighbour's pony", MOUNT.x, MOUNT.z, "typical", (WHO === "thegn" ? "Your riding horse. A thegn rode; his horse and his weapons were part of his rank (the heriot owed at his death included them)." : UNSEEN ? "A horse to get about on." : "Your neighbour's pony, lent for the day: most townsfolk walked, and horses belonged to the better-off.") + " Small by modern standards, about 13-14 hands. High saddle and stirrups, as in the Bayeux Tapestry. Press E beside it to mount; E again to get down; shift (or the trigger) to canter.", { y: 2.4, r: 3, range: 120 });
const MOUNT_MARK = MARKS[MARKS.length - 1];
function mountToggle() { if (MOUNT.ridden) { MOUNT.ridden = false; MOUNT_MARK.x = MOUNT.x; MOUNT_MARK.z = MOUNT.z; MOUNT_MARK.hidden = false; say("You get down and tie the horse.", 4); return true; }
  if (Math.hypot(MOUNT.x - P_.x, MOUNT.z - P_.z) < 3 && !INSIDE_H && !zoneOf(P_.x, P_.z)) { MOUNT.ridden = true; MOUNT_MARK.hidden = true; SITTING_DOWN = false; P_.x = MOUNT.x; P_.z = MOUNT.z; say("You swing up into the saddle. Walk on: shift (or the trigger) to canter; E to get down. You'll need to get down to go indoors.", 7); return true; } return false; }
function mountStep(dt, t, moving) { const M_ = MOUNT; if (M_.ridden) { const dx = P_.x - mountPrev[0], dz = P_.z - mountPrev[1], v = Math.hypot(dx, dz) / Math.max(dt, 1e-3);
    if (v > 0.3) { const target = Math.atan2(dx, dz); let d = target - M_.h; d = Math.atan2(Math.sin(d), Math.cos(d)); M_.h += d * Math.min(1, dt * 5); }
    M_.gait = lerpN(M_.gait, v, Math.min(1, dt * 3)); M_.x = P_.x; M_.z = P_.z; }
  mountPrev = [P_.x, P_.z]; const gy = Math.max(groundH(M_.x, M_.z), spanY(M_.x, M_.z)), sp = M_.gait, bob = sp > 0.3 ? Math.abs(Math.sin(t * (sp > 5 ? 9 : 7))) * (sp > 5 ? 0.09 : 0.05) : 0;
  M_.g.position.set(M_.x - Math.sin(M_.h) * 0.15, gy + bob, M_.z - Math.cos(M_.h) * 0.15); M_.g.rotation.set(sp > 5 ? Math.sin(t * 9) * 0.04 : 0, M_.h, 0); }
