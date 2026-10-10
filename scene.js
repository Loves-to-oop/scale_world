/* The world at ten million times: if an atom were a grain of sand.
   THREE is defined above this file by build.py (three.js inlined).

   Every size below is a measured value in metres, multiplied by S = 1e7 in one
   place (sz). Every motion is a measured rate, run at a chosen time scale TAU
   (real seconds per second you experience). Values from BioNumbers / Milo &
   Phillips, "Cell Biology by the Numbers" (2015) unless noted. */

const S = 1e7;                                   // the magnification
const sz = metres => metres * S;                 // real -> this world
let inMacro = false;                             // through the portal: the ×10,000 world (see THE PORTAL, near the end)
const nm = 1e-9, um = 1e-6;

// ---------- the data: real sizes and rates ----------------------------------------
const REAL = {
  water:      0.28 * nm,   // H2O, O-to-O spacing in liquid water
  waterPerM3: 3.34e28,     // molecules per cubic metre (33.4 per nm^3)
  dWater:     2.3e-9,      // diffusion coefficient of water in water, m^2/s (25 C)
  glucose:    0.9 * nm,
  dnaWidth:   2.0 * nm,  dnaRise: 0.34 * nm,  bpPerTurn: 10.5,
  hemoglobin: 6.4 * nm,
  antibody:   15 * nm,     // IgG arm-to-arm span
  ribosome:   21 * nm,     // bacterial 70S
  mtOuter:    25 * nm,  mtInner: 15 * nm,  tubulin: 4 * nm,  protofilaments: 13,
  virus:      100 * nm,  spike: 20 * nm,     // SARS-CoV-2 envelope, spike protein length
  dVirus:     4.3e-12,     // Stokes-Einstein, 100 nm sphere in water
  t4Head:     [85 * nm, 110 * nm], t4Tail: 100 * nm,
  ecoliLen:   2 * um,  ecoliDiam: 1 * um,  envelope: 30 * nm,
  ribosomesPerCell: 20000, // E. coli growing fast (~10^4)
  flagellumD: 20 * nm,  flagellumLen: 8 * um,  flagellumHz: 100,
  swim:       25 * um,     // E. coli swimming speed, per second
  chromosome: 4.6e6,       // base pairs in the E. coli genome
  rbcDiam:    7.8 * um,  rbcThick: 2.5 * um,
  cell:       20 * um,  nucleus: 6 * um,  mito: [0.5 * um, 1.5 * um],
  hair:       80 * um,
  lightGreen: 530 * nm,  xray: 0.1 * nm,
  // non-biological things at these scales
  c60: 0.71 * nm,  c60Bond: 0.144 * nm,          // buckminsterfullerene, cage diameter
  naCl: 0.282 * nm,                             // Na-Cl spacing in rock salt
  graphene: 0.142 * nm,                         // C-C bond; lattice constant 0.246 nm
  cnt: 1.36 * nm,                               // (10,10) carbon nanotube diameter
  goldA: 0.408 * nm,  goldNP: 5 * nm,           // gold lattice constant; particle size
  fin: 6 * nm,  finH: 50 * nm,  finPitch: 30 * nm, gatePitch: 48 * nm, gateW: 16 * nm,  // "3 nm-class" chip
  cdPitW: 0.5 * um,  cdPitDepth: 125 * nm,  cdTrack: 1.6 * um,  cdPitMin: 0.83 * um,  cdPitMax: 3.05 * um,
  cloudDrop: 10 * um,  silt: 40 * um,
  // motor proteins and muscle
  actinSub: 5.5 * nm,  actinRise: 2.75 * nm,  actinTwist: -166.7,   // per subunit, degrees
  thickD: 15 * nm,  thickLen: 1.6 * um,  bareZone: 0.16 * um,
  crown: 14.3 * nm,  crownTwist: 40,  headLen: 19 * nm,  stroke: 10 * nm,
  thinLen: 1.0 * um,  sarcRest: 2.4 * um,  sarcShort: 2.1 * um,  lattice: 42 * nm,
  crossBridgeHz: 20,                            // myosin cycles per second while contracting
  kinStep: 8 * nm,  kinHz: 100,  kinLen: 70 * nm,                     // kinesin-1
  dynStep: 8 * nm,  dynHz: 60,  dynRing: 13 * nm,                      // cytoplasmic dynein
  vesicle: 80 * nm,
  fiber: 12 * um,  myofibril: 1.5 * um,
  terminal: 2 * um,  synVesicle: 40 * nm,  cleft: 50 * nm,  quanta: 50,
  twitchDelay: 3e-3,  twitchRise: 30e-3,  twitchFall: 80e-3,  impulseEvery: 0.25,
};

// ---------- renderer: depth from millimetres to kilometres -----------------------
// On a headset (Quest browser) use a standard depth buffer: the logarithmic one, needed on the
// desktop to span millimetres to kilometres, makes the ground and what's under it flicker in VR.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.xr.enabled = true;
renderer.localClippingEnabled = true;
const ABOVE_GLASS = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];   // clip anything below y = 0
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const WATERCOL = new THREE.Color(0x9cc4d8);        // everything here is under water
scene.background = WATERCOL;
scene.fog = new THREE.FogExp2(0x9cc4d8, 0.0009);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, IS_HEADSET ? 0.01 : 0.0005, IS_HEADSET ? 3000 : 20000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
camera.position.y = 1.65;
scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x506070, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(300, 800, 200); scene.add(sun);

const rnd = (() => { let a = 1007; return () => { a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const rr = (a, b) => a + (b - a) * rnd();
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2832 * rnd());
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });

// signs: every caption is a physical object in the world. Three kinds:
//   plaque  -- on a stand beside its exhibit, set at the edge of the nearest path and
//              facing it (placed once everything is built); fades in as you approach
//   banner  -- a board fixed where it is told, facing back down the avenue (+z)
//   floor   -- painted flat on the slide, reading as you walk forward (-z)
const PLAQUES = [];
function label(lines, pos, scale = 1, kind = "plaque") {
  const c = document.createElement("canvas"), g = c.getContext("2d"), px = 44;
  g.font = `600 ${px}px -apple-system, Helvetica, sans-serif`;
  const w = Math.max(...lines.map((l, i) => { g.font = `${i ? 400 : 600} ${i ? px * 0.72 : px}px -apple-system, Helvetica, sans-serif`;
    return g.measureText(l).width; })) + 40;
  c.width = w; c.height = px * 1.3 + (lines.length - 1) * px * 0.95 + 22;
  if (kind === "floor") { g.clearRect(0, 0, c.width, c.height); }
  else { g.fillStyle = kind === "banner" ? "#1b3a4b" : "#20313b"; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = "#c9a227"; g.lineWidth = 6; g.strokeRect(3, 3, c.width - 6, c.height - 6); }
  lines.forEach((l, i) => { g.font = `${i ? 400 : 600} ${i ? px * 0.72 : px}px -apple-system, Helvetica, sans-serif`;
    g.fillStyle = kind === "floor" ? "#1b2631" : i ? "#d5e6ee" : "#ffffff"; g.fillText(l, 20, px * 1.1 + i * px * 0.95 + 4); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  const W = THREE.MathUtils.clamp(c.width / 600 * scale, kind === "floor" ? 0.05 : 0.45, 12), Hh = W * c.height / c.width;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false,
    depthWrite: kind !== "floor", polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));   // always in front of its board
  const gap = Math.max(0.02, W * 0.012);                     // the face stands clear of the backing board
  const g3 = new THREE.Group(); scene.add(g3);
  const rec = { g: g3, face, W, H: Hh, kind, anchor: new THREE.Vector3(pos.x, 0, pos.z), y: pos.y, mats: [face.material] };
  if (kind === "floor") { face.rotation.x = -Math.PI / 2; face.position.y = 0.045; g3.add(face); g3.position.set(pos.x, 0, pos.z); }
  else if (kind === "banner") { face.position.y = pos.y; g3.add(face);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, Hh * 1.04, Math.max(0.02, W * 0.01)), M(0x2c3e50)); back.position.set(0, pos.y, -gap - Math.max(0.01, W * 0.005)); g3.add(back);
    g3.position.set(pos.x, 0, pos.z); }
  else {                                                     // a plaque: a lectern for small signs, a two-post board for big ones
    const stand = M(0x34495e), backMat = M(0x2c3e50, { transparent: true });
    const back = new THREE.Mesh(new THREE.BoxGeometry(W * 1.03, Hh * 1.05, Math.max(0.02, W * 0.012)), backMat);
    rec.mats.push(backMat);
    const holder = new THREE.Group(); holder.add(back, face); face.position.z = Math.max(0.01, W * 0.006) + gap;
    if (W < 1.6) { const tilt = 0.5, top = 0.95;               // lectern, tilted back toward the reader
      holder.rotation.x = -tilt; holder.position.set(0, top + Math.sin(tilt) * 0 + Hh / 2 * Math.cos(tilt), -Hh / 2 * Math.sin(tilt));
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, top, 8), stand); post.position.y = top / 2; g3.add(post);
      rec.mats.push(post.material = stand.clone()); post.material.transparent = true; }
    else { const bottom = Math.min(1.2, 0.4 + W * 0.08); holder.position.y = bottom + Hh / 2;
      for (const sx of [-0.42, 0.42]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(W * 0.012, W * 0.012, bottom + Hh, 8), stand.clone());
        post.material.transparent = true; post.position.set(sx * W, (bottom + Hh) / 2, -W * 0.01); g3.add(post); rec.mats.push(post.material); } }
    g3.add(holder); g3.position.copy(rec.anchor);
  }
  PLAQUES.push(rec); return g3;
}
// once every path exists: stand each plaque at the edge of the nearest path, facing it
function placePlaques() {
  const plaza = new THREE.Vector2(AVX, 1), placed = [];
  for (const r of PLAQUES) {
    if (r.kind !== "plaque") continue;
    const a = new THREE.Vector2(r.anchor.x, r.anchor.z);
    let best = null, bd = Infinity, bw = 0;
    for (const [P, w] of PATHS) for (let i = 0; i < P.length - 1; i++) {
      const A = P[i], B = P[i + 1], AB = B.clone().sub(A), t = THREE.MathUtils.clamp(a.clone().sub(A).dot(AB) / AB.lengthSq(), 0, 1);
      const q = A.clone().addScaledVector(AB, t), d = q.distanceTo(a); if (d < bd) { bd = d; best = q; bw = w; } }
    let pos, facing;
    if (a.distanceTo(plaza) < 12.5 || !best || bd < 0.5) {     // on paving already: just in front of the exhibit, facing the start
      pos = a.clone().add(new THREE.Vector2(0, 0.75)); facing = new THREE.Vector2(0, 1); }
    else { const n = a.clone().sub(best).normalize();           // from the path toward the exhibit
      let off = bw / 2 + 0.3; if (bd - off < 0.45) off = Math.max(0, bd - 0.45);
      pos = best.clone().addScaledVector(n, off); facing = n.clone().negate(); }
    // don't stand two plaques in the same spot: slide sideways along the path
    const side = new THREE.Vector2(-facing.y, facing.x);
    for (let k = 0; k < 12 && placed.some(o => o.p.distanceTo(pos) < (o.W + r.W) / 2 + 0.15); k++) pos.addScaledVector(side, (r.W + 0.2) * 0.6);
    placed.push({ p: pos.clone(), W: r.W });
    r.g.position.set(pos.x, 0, pos.y); r.g.rotation.y = Math.atan2(facing.x, facing.y);
    r.reach = Math.max(7, r.W * 7);                             // how near you must be to read it
  }
}
const fmt = m => m >= 1 ? `${+m.toPrecision(3)} m` : m >= 0.01 ? `${+(m * 100).toPrecision(3)} cm` : `${+(m * 1000).toPrecision(3)} mm`;
const fmtReal = m => m >= 1e3 ? `${(+(m / 1e3).toPrecision(3)).toLocaleString()} km` : m >= 1 ? `${+m.toPrecision(3)} m` :
  m >= 1e-3 ? `${+(m * 1e3).toPrecision(3)} mm` : m >= 1e-6 ? `${+(m * 1e6).toPrecision(3)} µm` :
  m >= 1e-9 ? `${+(m * 1e9).toPrecision(3)} nm` : `${+(m * 1e12).toPrecision(3)} pm`;
const sizeLines = (name, real) => [name, `real ${fmtReal(real)}  ·  here ${fmt(sz(real))}`];

// ---------- the ground: a microscope slide ----------------------------------------
// glass is amorphous; its polished surface is rough at the nanometre level, which
// at this scale means centimetre bumps -- drawn as a soft speckle
{
  const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#b9d3dc"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "120,150,165"},${rr(0.03, 0.12)})`;
    g.beginPath(); g.arc(rnd() * 512, rnd() * 512, rr(0.5, 2.5), 0, 6.3); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4000, 4000);
  tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace;
  // a fine grid, not two giant triangles: depth across a 40 km triangle is imprecise enough that the
  // glass drew over paths and floors from some spots (the PC path flicker)
  const slide = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000, 200, 200).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.05, color: 0xdbe9ee,
      polygonOffset: true, polygonOffsetFactor: 4, polygonOffsetUnits: 4 }));   // no shimmer with paths and floors
  scene.add(slide); window.__slide = slide;
}

// ---------- the size ladder: real molecules, standing in a row ---------------------
const ladder = [];
const row = (x, obj, name, real, labelY) => {
  obj.position.x = x; obj.position.z = -3; scene.add(obj);
  label(sizeLines(name, real), new THREE.Vector3(x, labelY, -3), 0.55);
  ladder.push({ obj, name, real, x });
};
// a water molecule: O with two H at 104.5 degrees, O-H 0.096 nm (atoms as van der Waals spheres)
function water(scale = 1) {
  const g = new THREE.Group(), O = M(0xd84a3a), Hm = M(0xf2f2f2);
  const o = new THREE.Mesh(new THREE.SphereGeometry(sz(0.152 * nm) * scale, 16, 12), O); g.add(o);
  for (const s of [-1, 1]) { const a = s * 52.25 * Math.PI / 180;
    const h = new THREE.Mesh(new THREE.SphereGeometry(sz(0.12 * nm) * scale, 12, 10), Hm);
    h.position.set(Math.sin(a) * sz(0.096 * nm) * scale, Math.cos(a) * sz(0.096 * nm) * scale, 0); g.add(h); }
  return g;
}
const stand = h => { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, h, 8), M(0x6f8794)); s.position.y = h / 2; return s; };
{ // water, enlarged on its stand so its 2.8 mm is visible beside you
  const g = new THREE.Group(); g.add(stand(1.2)); const w = water(); w.position.y = 1.2; g.add(w);
  row(0, g, "water molecule", REAL.water, 1.32);
}
{ // glucose: a six-ring of C and O with OH groups, about 0.9 nm across
  const g = new THREE.Group(); g.add(stand(1.2)); const ring = new THREE.Group(); ring.position.y = 1.2;
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283;
    const at = new THREE.Mesh(new THREE.SphereGeometry(sz(0.17 * nm), 14, 10), M(i === 0 ? 0xd84a3a : 0x404040));
    at.position.set(Math.cos(a) * sz(0.15 * nm), 0, Math.sin(a) * sz(0.15 * nm)); ring.add(at);
    const oh = new THREE.Mesh(new THREE.SphereGeometry(sz(0.15 * nm), 12, 8), M(0xd84a3a));
    oh.position.set(Math.cos(a) * sz(0.35 * nm), (i % 2 ? 1 : -1) * sz(0.08 * nm), Math.sin(a) * sz(0.35 * nm)); ring.add(oh); }
  g.add(ring); row(0.35, g, "glucose", REAL.glucose, 1.33);
}
{ // haemoglobin: four globin subunits, ~6.4 nm
  const g = new THREE.Group(); g.add(stand(1.1)); const p = new THREE.Group(); p.position.y = 1.15;
  const cols = [0xc0392b, 0xe67e22, 0xc0392b, 0xe67e22];
  [[1, 1, 1], [-1, 1, -1], [1, -1, -1], [-1, -1, 1]].forEach(([a, b, c], i) => {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(1.8 * nm), 2), M(cols[i], { flatShading: true }));
    s.position.set(a * sz(1.3 * nm), b * sz(1.2 * nm), c * sz(1.3 * nm)); p.add(s); });
  g.add(p); row(0.85, g, "haemoglobin", REAL.hemoglobin, 1.28);
}
{ // IgG antibody: a Y of three ~7 nm domains pairs
  const g = new THREE.Group(); g.add(stand(1.0)); const y = new THREE.Group(); y.position.y = 1.05;
  const arm = (ang, col) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(sz(1.6 * nm), sz(5 * nm), 6, 10), M(col));
    c.rotation.z = ang; c.position.set(-Math.sin(ang) * sz(4 * nm), Math.cos(ang) * sz(4 * nm), 0); return c; };
  y.add(arm(0.95, 0x3b7fc4), arm(-0.95, 0x3b7fc4), arm(Math.PI, 0x2e5e8e)); g.add(y);
  row(1.5, g, "antibody (IgG)", REAL.antibody, 1.28);
}
{ // DNA: a short stretch of double helix on a stand (the big one is at the start point)
  const g = new THREE.Group(); g.add(stand(1.0)); const d = dna(24); d.rotation.z = -Math.PI / 2; d.position.set(-0.04, 1.08, 0);
  g.add(d); row(2.3, g, "DNA double helix", REAL.dnaWidth, 1.22);
}
{ // 70S ribosome: large and small subunits
  const g = new THREE.Group(); g.add(stand(0.9)); const r = ribosome(); r.position.y = 1.0; g.add(r);
  row(3.3, g, "ribosome", REAL.ribosome, 1.3);
}
{ // microtubule: 13 protofilaments of tubulin around a hollow 15 nm lumen
  const g = new THREE.Group(); const mt = microtubule(1.6); mt.position.y = 0.8 + 0.0; g.add(mt);
  row(4.6, g, "microtubule", REAL.mtOuter, 1.8);
}
{ const v = virus(); v.position.y = sz(REAL.virus) / 2 + 0.2; row(6.6, v, "virus (SARS-CoV-2)", REAL.virus, 1.95); }
{ const p = phageT4(); row(9.0, p, "bacteriophage T4", 200 * nm, 2.6); }
{ // you, for scale: a 1.7 m figure is 170 nm in reality
  const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.2, 6, 12), M(0xe0b080));
  b.position.y = 0.82; g.add(b); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), M(0xe0b080)); hd.position.y = 1.62; g.add(hd);
  row(11.5, g, "you (as you are here)", 170 * nm, 2.15);
}
label(["the size ladder", "everything ×10,000,000  ·  1 nm becomes 1 cm"], new THREE.Vector3(5.5, 3.0, -3), 1.0);

// ---------- builders --------------------------------------------------------------
function dna(bp) {                        // B-DNA, atom-grain level: backbone P and sugar, base pairs
  const g = new THREE.Group(), rise = sz(REAL.dnaRise), twist = 2 * Math.PI / REAL.bpPerTurn;
  const R = sz(0.89 * nm), off = 155 * Math.PI / 180;      // strand 2 phosphate offset: makes the grooves
  const P = M(0xf0a030), Sg = M(0x5a8fd0), base = [M(0x4caf50), M(0xe74c3c), M(0x9b59b6), M(0xf1c40f)];
  const pG = new THREE.SphereGeometry(sz(0.19 * nm), 10, 8), sG = new THREE.SphereGeometry(sz(0.17 * nm), 10, 8);
  for (let i = 0; i < bp; i++) {
    const a = i * twist, y = i * rise;
    for (const [ang, k] of [[a, 0], [a + off, 1]]) {
      const p = new THREE.Mesh(pG, P); p.position.set(Math.cos(ang) * R, y, Math.sin(ang) * R); g.add(p);
      const s = new THREE.Mesh(sG, Sg); s.position.set(Math.cos(ang) * R * 0.72, y + rise * 0.3, Math.sin(ang) * R * 0.72); g.add(s);
    }
    const bA = a + 0.15, bB = a + off - 0.15;       // a base pair spanning between the sugars
    const x1 = Math.cos(bA) * R * 0.65, z1 = Math.sin(bA) * R * 0.65, x2 = Math.cos(bB) * R * 0.65, z2 = Math.sin(bB) * R * 0.65;
    const len = Math.hypot(x2 - x1, z2 - z1), k = Math.floor(rnd() * 4);
    for (const [half, col] of [[0, base[k]], [1, base[3 - k]]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(len / 2, sz(0.07 * nm), sz(0.25 * nm)), col);
      b.position.set(x1 + (x2 - x1) * (0.25 + half * 0.5), y + rise * 0.3, z1 + (z2 - z1) * (0.25 + half * 0.5));
      b.rotation.y = -Math.atan2(z2 - z1, x2 - x1); g.add(b);
    }
  }
  return g;
}
function ribosome() {
  const g = new THREE.Group();
  const big = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(9 * nm), 2), M(0x8e5bb5, { flatShading: true }));
  big.scale.set(1.1, 0.9, 1); g.add(big);
  const small = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(6.5 * nm), 2), M(0xc39bd3, { flatShading: true }));
  small.position.set(sz(3 * nm), sz(8.5 * nm), 0); small.scale.set(1.3, 0.6, 1); g.add(small);
  return g;
}
function microtubule(lenM) {               // 13 protofilaments, tubulin dimers every 8 nm, 3-start helix
  const g = new THREE.Group(), r = sz((REAL.mtOuter + REAL.mtInner) / 4), n = REAL.protofilaments;
  const monomer = sz(REAL.tubulin), count = Math.floor(lenM / monomer);
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(monomer / 2 * 1.05, 8, 6), M(0xffffff), n * count);
  const d = new THREE.Object3D(), ca = new THREE.Color(0x6fb3d9), cb = new THREE.Color(0x2f7fb0); let k = 0;
  for (let p = 0; p < n; p++) for (let i = 0; i < count; i++) {
    const a = p / n * 6.283, y = i * monomer + p * (3 * monomer / n) - lenM / 2;   // 3-start helical rise
    d.position.set(Math.cos(a) * r, y, Math.sin(a) * r); d.updateMatrix(); im.setMatrixAt(k, d.matrix);
    im.setColorAt(k++, i % 2 ? ca : cb);
  }
  g.add(im); return g;
}
function virus() {                         // ~100 nm envelope with ~25 club-shaped spikes
  const g = new THREE.Group(), R = sz(REAL.virus) / 2;
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 4), M(0xb0b8c0, { roughness: 0.8 })));
  const n = 26;
  for (let i = 0; i < n; i++) {
    const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), a = i * 2.39996;
    const dir = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
    const sp = new THREE.Group(); const L = sz(REAL.spike);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(L * 0.07, L * 0.07, L * 0.7, 6), M(0xc0392b)); stalk.position.y = L * 0.35;
    const club = new THREE.Mesh(new THREE.SphereGeometry(L * 0.22, 10, 8), M(0xe74c3c)); club.position.y = L * 0.8;
    club.scale.set(1, 1.3, 1); sp.add(stalk, club);
    sp.position.copy(dir.clone().multiplyScalar(R)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); g.add(sp);
  }
  return g;
}
function phageT4() {                       // elongated icosahedral head, tail sheath, baseplate, 6 fibres
  const g = new THREE.Group(), [hw, hl] = REAL.t4Head.map(sz), tl = sz(REAL.t4Tail);
  const legs = 0.9;                        // standing height of the fibres
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(hw / 2, 0), M(0x7f8fa6, { flatShading: true }));
  head.scale.set(1, hl / hw, 1); head.position.y = legs + tl + hl / 2; g.add(head);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(sz(10 * nm), sz(10 * nm), tl, 12), M(0x5d6d7e));
  tail.position.y = legs + tl / 2; g.add(tail);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(sz(22 * nm), sz(22 * nm), sz(8 * nm), 6), M(0x4a5a6a));
  plate.position.y = legs; g.add(plate);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283;
    const pts = [new THREE.Vector3(0, legs, 0), new THREE.Vector3(Math.cos(a) * 0.55, legs + 0.2, Math.sin(a) * 0.55),
                 new THREE.Vector3(Math.cos(a) * 0.95, 0.02, Math.sin(a) * 0.95)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, sz(1.2 * nm), 5), M(0x5d6d7e))); }
  return g;
}

// ---------- the start point: a long DNA helix in water at its real density --------
const START = new THREE.Vector3(0.05, 0, 3.75);
const DY = 1.62;                         // eye height
const bigDNA = dna(160); bigDNA.rotation.z = -Math.PI / 2;   // helix axis along +x
bigDNA.position.set(-0.27, DY, 3.0); scene.add(bigDNA);
const dnaLen = 160 * sz(REAL.dnaRise);
label(["DNA, atom by atom", `2 nm wide → ${fmt(sz(REAL.dnaWidth))}  ·  one base pair every ${fmt(sz(REAL.dnaRise))}`,
       `one turn every ${REAL.bpPerTurn} base pairs = ${fmt(sz(REAL.dnaRise * REAL.bpPerTurn))}`,
       "orange: phosphate  ·  blue: sugar  ·  bars: base pairs"], new THREE.Vector3(0, DY + 0.14, 2.95), 0.2);
// water: every molecule within 5 cm of the helix, at 33.4 per nm^3 = 33.4 per cm^3 here
const WR = 0.05, wVol = (Math.PI * WR * WR * dnaLen - Math.PI * (sz(1 * nm)) ** 2 * dnaLen) / 2;   // back half
const NW = Math.round(REAL.waterPerM3 / S ** 3 * wVol);     // per m^3 here, times the volume
const wPos = new Float32Array(NW * 3);
for (let i = 0; i < NW; i++) {
  let y, z; do { y = rr(-WR, WR); z = rr(-WR, 0); } while (y * y + z * z > WR * WR || y * y + z * z < sz(1 * nm) ** 2);
  wPos.set([rr(-0.27, -0.27 + dnaLen), DY + y, 3.0 + z], 3 * i);
}
const waterPts = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(wPos, 3)),
  new THREE.PointsMaterial({ color: 0xbfe4ff, size: sz(REAL.water), sizeAttenuation: true, transparent: true, opacity: 0.55, depthWrite: false }));
scene.add(waterPts);
label([`${NW.toLocaleString()} water molecules`, "all of them behind the helix, within 5 cm (33 per cm³ here);",
       "the front half is cut away so you can see the DNA -- really it is buried",
       "they jostle by diffusion: watch at 1 picosecond per second"], new THREE.Vector3(0.62, DY + 0.07, 2.95), 0.26);

// ---------- E. coli: a 2 µm bacterium becomes a 20 m truck ------------------------
const EHOME = new THREE.Vector3(30, 4.6, -150);       // resting on the slide
const ECOLI = new THREE.Group(); ECOLI.position.copy(EHOME); scene.add(ECOLI);
const eL = sz(REAL.ecoliLen), eR = sz(REAL.ecoliDiam) / 2;
{
  const env = new THREE.Mesh(new THREE.CapsuleGeometry(eR, eL - 2 * eR, 16, 40),
    new THREE.MeshStandardMaterial({ color: 0x7fb87a, transparent: true, opacity: 0.32, side: THREE.DoubleSide,
      roughness: 0.5, depthWrite: false }));
  env.rotation.z = Math.PI / 2; ECOLI.add(env);
  const inner = new THREE.Mesh(new THREE.CapsuleGeometry(eR - sz(REAL.envelope), eL - 2 * eR, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0xa8d49a, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  inner.rotation.z = Math.PI / 2; ECOLI.add(inner);
  // ribosomes: the real count, scattered through the cytoplasm outside the nucleoid
  const rib = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(sz(REAL.ribosome) / 2, 1),
    M(0x9b59b6, { flatShading: true }), REAL.ribosomesPerCell);
  const d = new THREE.Object3D(); let k = 0;
  while (k < REAL.ribosomesPerCell) {
    const x = rr(-eL / 2, eL / 2), y = rr(-eR, eR), z = rr(-eR, eR);
    const cx = Math.max(Math.abs(x) - (eL / 2 - eR), 0), inside = Math.hypot(cx, y, z) < eR - sz(REAL.envelope) - 0.15;
    const nucleoid = Math.hypot(x / (eL * 0.33), y / (eR * 0.55), z / (eR * 0.55)) < 1;
    if (!inside || (nucleoid && rnd() < 0.85)) continue;
    d.position.set(x, y, z); d.rotation.set(rnd() * 6, rnd() * 6, 0); d.updateMatrix(); rib.setMatrixAt(k++, d.matrix);
  }
  ECOLI.add(rib);
  // the nucleoid: a 16 km chromosome packed into the middle; drawn as a tangled sample
  const pts = []; let p = new THREE.Vector3();
  for (let i = 0; i < 2600; i++) {
    p.add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(0.55));
    p.set(THREE.MathUtils.clamp(p.x, -eL * 0.3, eL * 0.3), THREE.MathUtils.clamp(p.y, -eR * 0.5, eR * 0.5),
          THREE.MathUtils.clamp(p.z, -eR * 0.5, eR * 0.5)); pts.push(p.clone());
  }
  ECOLI.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 9000, sz(REAL.dnaWidth) / 2, 4),
    M(0xf0c040, { emissive: 0x2a1e04 })));
}
// flagella: ~20 nm filaments several µm long, left-handed helices driven by a rotary motor
const flagella = [];
for (let i = 0; i < 5; i++) {
  const f = new THREE.Group(), a = i / 5 * 6.283 + 0.4;
  f.position.set(rr(-eL * 0.35, eL * 0.1), Math.cos(a) * eR * 0.97, Math.sin(a) * eR * 0.97);
  const L = sz(REAL.flagellumLen), turns = 3.5, amp = 2.4, pts = [];
  for (let j = 0; j <= 160; j++) { const u = j / 160;
    pts.push(new THREE.Vector3(u * L, Math.cos(u * turns * 6.283) * amp * Math.min(1, u * 6), Math.sin(u * turns * 6.283) * amp * Math.min(1, u * 6))); }
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, sz(REAL.flagellumD) / 2, 6), M(0xd8e8c8, { clippingPlanes: ABOVE_GLASS }));
  f.add(tube); f.rotation.set(0, Math.PI + rr(-0.15, 0.15), rr(-0.15, 0.15)); f.userData.spin = tube;
  ECOLI.add(f); flagella.push(f);
}
// three phages landed on the surface, tails down
for (const [x, a] of [[-4, 1.2], [3, 2.6], [6, 0.3]]) {
  const p = phageT4(); p.scale.setScalar(1);
  const dir = new THREE.Vector3(0, Math.cos(a), Math.sin(a));
  p.position.set(x, 0, 0).addScaledVector(dir, eR - 0.05);
  p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); ECOLI.add(p);
}
label(sizeLines("E. coli bacterium", REAL.ecoliLen).concat([
  `${REAL.ribosomesPerCell.toLocaleString()} ribosomes (purple)  ·  its DNA, stretched out: ${fmt(sz(REAL.chromosome * REAL.dnaRise))}`,
  `swims ${fmtReal(REAL.swim)} per second -- at 1 ms per second, ${fmt(sz(REAL.swim) * 1e-3)}/s here`]),
  new THREE.Vector3(30, 17, -150), 4);

// ---------- red blood cells and an animal cell -------------------------------------
function rbc() {                           // biconcave disc: 7.8 µm across, 2.5 µm rim, ~1 µm centre
  const R = sz(REAL.rbcDiam) / 2, pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40, r = u * R;
    const t = sz(REAL.rbcThick) / 2 * Math.sqrt(Math.max(0, 1 - u * u)) * (0.38 + 1.6 * u * u - 0.9 * u ** 4);
    pts.push(new THREE.Vector2(r, t)); }
  for (let i = 40; i >= 0; i--) pts.push(new THREE.Vector2(pts[i].x, -pts[i].y));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 64), M(0xb3312a, { roughness: 0.45 }));
}
for (const [x, y, z, rx] of [[55, 11, -300, 0], [100, 11, -318, 0.08], [70, 30, -352, 1.3]]) {   // two lying flat, one on edge
  const r = rbc(); r.position.set(x, y, z); r.rotation.set(rx, 0.4, 0); scene.add(r);
}
label(sizeLines("red blood cell", REAL.rbcDiam), new THREE.Vector3(72, 62, -318), 12);
// the animal cell is built as a walk-in cell further down (after the park paths exist)
const CELL = new THREE.Group(); CELL.position.set(160, 20, -470); scene.add(CELL);
// a human hair lying across the slide: 80 µm thick = an 800 m ridge
{
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(sz(REAL.hair) / 2, sz(REAL.hair) / 2, 20000, 48),
    M(0x4a3020, { roughness: 0.85 }));
  hair.rotation.set(0, 0.35, Math.PI / 2); hair.position.set(0, sz(REAL.hair) / 2, -1150); scene.add(hair);
  hair.name = "hair"; hair.userData.dynamic = true;       // kept whole: the ×10⁴ world draws its own, solid
  label(sizeLines("a human hair", REAL.hair), new THREE.Vector3(0, sz(REAL.hair) + 90, -950), 160);
}

// ---------- the ruler: a scale bar on the slide, marked in real units ---------------
// it runs from the start straight ahead (-z); 1 cm here = 1 nm real
{
  const RX = -2.2, z0 = 3.5, LEN = 720, dark = M(0x23404f);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, LEN), M(0xf2ede0));
  strip.position.set(RX, 0.032, z0 - LEN / 2); scene.add(strip);   // raised clear of the glass, so it never shimmers
  const ticks = [];                      // [distance m, tick length m]
  for (let d = 0; d <= 1.0001; d += 0.01) ticks.push([d, Math.round(d * 100) % 10 ? 0.06 : 0.14]);
  for (let d = 1.1; d <= 10.0001; d += 0.1) ticks.push([d, Math.round(d * 10) % 10 ? 0.1 : 0.25]);
  for (let d = 11; d <= 100.0001; d += 1) ticks.push([d, d % 10 ? 0.15 : 0.35]);
  for (let d = 110; d <= LEN; d += 10) ticks.push([d, d % 50 ? 0.2 : 0.45]);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.006, 1), dark, ticks.length), o = new THREE.Object3D();
  ticks.forEach(([d, l], i) => { const w = d <= 1 ? 0.003 : d <= 10 ? 0.012 : d <= 100 ? 0.05 : 0.2;
    o.position.set(RX - 0.25 + l / 2, 0.036, z0 - d); o.scale.set(l, 1, w); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  scene.add(im);
  const marks = [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 300, 400, 500, 600, 700];
  for (const d of marks) label([fmtReal(d / S)], new THREE.Vector3(RX - 0.75 - d * 0.008, 0, z0 - d), 0.22 + d * 0.012, "floor");
  label(["ruler: real distance", "1 cm here = 1 nm  ·  1 m = 100 nm  ·  100 m = 10 µm"], new THREE.Vector3(RX, 0.45, z0 - 0.4), 0.28);
}

// ---------- the materials table: non-biological things, atom by atom -----------------
const TZ = -22, TX = 7;                         // in the non-living hall
const table = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.9), M(0x8aa1ad));
table.position.set(3.4 + TX, 1.0, TZ); scene.add(table);
for (const x of [-0.9, 7.7]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.8), M(0x6f8794));
  leg.position.set(x + TX, 0.5, TZ); scene.add(leg); }
label(["the materials table", "non-living things, built atom by atom at ×10,000,000"], new THREE.Vector3(3.4 + TX, 2.3, TZ), 0.8);
const onTable = (obj, x, name, real, extra = []) => { x += TX; obj.position.x = x; obj.position.z = TZ; scene.add(obj);
  label(sizeLines(name, real).concat(extra), new THREE.Vector3(x, 1.58, TZ), 0.42); ladder.push({ obj, name, real, x, z: TZ }); };
const atoms = (pos, r, mat) => {           // many identical atoms as one instanced mesh
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), mat, pos.length), o = new THREE.Object3D();
  pos.forEach((p, i) => { o.position.copy(p); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); return im; };
{ // C60: the 60 vertices of a truncated icosahedron, edge = one C-C bond
  const phi = (1 + Math.sqrt(5)) / 2, base = [[0, 1, 3 * phi], [1, 2 + phi, 2 * phi], [phi, 2, 2 * phi + 1]], set = new Map();
  for (const b of base) for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz_ of [1, -1]) {
    const v = [b[0] * sx, b[1] * sy, b[2] * sz_];
    for (const c of [[0, 1, 2], [1, 2, 0], [2, 0, 1]]) { const w = [v[c[0]], v[c[1]], v[c[2]]];
      set.set(w.map(n => n.toFixed(4)).join(), w); } }
  const k = sz(REAL.c60Bond) / 2, pts = [...set.values()].map(w => new THREE.Vector3(...w).multiplyScalar(k));
  const g = new THREE.Group(); const ball = atoms(pts, sz(0.035 * nm), M(0x333333)); ball.position.y = 1.2; g.add(ball);
  for (const a of pts) for (const b of pts) if (a !== b && a.distanceTo(b) < k * 2.1 && a.x < b.x + 1e-9) {
    const m = a.clone().add(b).multiplyScalar(0.5), bond = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.012 * nm), sz(0.012 * nm), a.distanceTo(b), 4), M(0x777777));
    bond.position.copy(m).add(new THREE.Vector3(0, 1.2, 0)); bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); g.add(bond); }
  g.add(stand(0.17).translateY(1.025)); onTable(g, -0.4, "buckyball (C₆₀)", REAL.c60, [`${pts.length} carbon atoms`]);
}
{ // rock salt: Na+ and Cl- alternating on a cubic lattice
  const n = 8, a = sz(REAL.naCl), na = [], cl = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++)
    ((i + j + k) % 2 ? na : cl).push(new THREE.Vector3((i - n / 2) * a, j * a, (k - n / 2) * a));
  const g = new THREE.Group(); g.add(atoms(na, sz(0.102 * nm), M(0x9b59b6)), atoms(cl, sz(0.181 * nm), M(0x2ecc71)));
  g.position.y = 1.03; onTable(g, 0.6, "salt crystal (NaCl)", n * REAL.naCl, ["purple Na⁺, green Cl⁻, 0.282 nm apart"]);
}
{ // graphene: a hexagonal sheet of carbon, standing upright
  const a = 0.246 * nm, W = 15 * nm, pts = [];
  for (let i = -70; i < 70; i++) for (let j = -70; j < 70; j++) for (const [bx, by] of [[0, 0], [a / 2, a / (2 * Math.sqrt(3))]]) {
    const x = i * a + j * a / 2 + bx, y = j * a * Math.sqrt(3) / 2 + by;
    if (Math.abs(x) < W / 2 && y > 0 && y < W) pts.push(new THREE.Vector3(sz(x), sz(y), 0)); }
  const g = new THREE.Group(); const sheet = atoms(pts, sz(0.04 * nm), M(0x2c3e50)); sheet.position.y = 1.03; g.add(sheet);
  onTable(g, 1.8, "graphene sheet", W, [`${pts.length.toLocaleString()} carbon atoms, bonds ${fmt(sz(REAL.graphene))}`]);
}
{ // a (10,10) carbon nanotube: graphene rolled up along the armchair direction
  const a = 0.246 * nm, C = a * Math.sqrt(3) * 10, L = 30 * nm, pts = [], rot = -Math.PI / 6;
  for (let i = -260; i < 260; i++) for (let j = -260; j < 260; j++) for (const [bx, by] of [[0, 0], [a / 2, a / (2 * Math.sqrt(3))]]) {
    const x0 = i * a + j * a / 2 + bx, y0 = j * a * Math.sqrt(3) / 2 + by;
    const x = x0 * Math.cos(rot) - y0 * Math.sin(rot), y = x0 * Math.sin(rot) + y0 * Math.cos(rot);
    if (x >= 0 && x < C - 1e-12 && y >= 0 && y < L) { const th = x / C * 2 * Math.PI, R = C / (2 * Math.PI);
      pts.push(new THREE.Vector3(sz(y) - sz(L) / 2, sz(R * Math.cos(th)), sz(R * Math.sin(th)))); } }
  const g = new THREE.Group(); const tube = atoms(pts, sz(0.04 * nm), M(0x34495e)); tube.position.y = 1.1; g.add(tube);
  onTable(g, 3.0, "carbon nanotube", REAL.cnt, [`${pts.length.toLocaleString()} atoms, 30 nm of it`]);
}
{ // a 5 nm gold nanoparticle: face-centred cubic gold, cut to a truncated octahedron
  const a = REAL.goldA, R = REAL.goldNP / 2, n = Math.ceil(R / a) + 1, pts = [];
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) for (let k = -n; k <= n; k++)
    for (const [bx, by, bz] of [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]]) {
      const x = (i + bx) * a, y = (j + by) * a, z = (k + bz) * a;
      if (Math.hypot(x, y, z) < R && Math.abs(x) + Math.abs(y) + Math.abs(z) < R * 1.45)
        pts.push(new THREE.Vector3(sz(x), sz(y), sz(z))); }
  const g = new THREE.Group(); const np = atoms(pts, sz(0.144 * nm), M(0xd4a62a, { metalness: 0.9, roughness: 0.25 }));
  np.position.y = 1.03 + sz(R); g.add(np);
  onTable(g, 4.4, "gold nanoparticle", REAL.goldNP, [`${pts.length.toLocaleString()} gold atoms`]);
}
{ // a quantum dot: a 5 nm semiconductor crystal whose colour is set by its size
  const g = new THREE.Group(); const q = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(2.5 * nm), 2),
    M(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 0.9, flatShading: true }));
  q.position.y = 1.03 + sz(2.5 * nm); g.add(q);
  onTable(g, 5.6, "quantum dot (CdSe)", 5 * nm, ["glows orange because it is 5 nm; smaller ones glow blue"]);
}
// ---------- the Light gallery: the electromagnetic spectrum at ×10⁷ ------------------------
// Each wave is a tube whose shape is computed on the GPU: y = A sin(2π x / λ − φ), with
// the phase φ advancing at the light's real frequency f = c/λ times the time scale.
const C_LIGHT = 2.998e8, H_EV = 1239.84;                     // m/s; h·c in eV·nm
const WAVES = [];                                             // {mat, f} -- phases advance in the loop
function waveTube(lambdaM, cycles, amp, r, col) {             // lambdaM: wavelength here (m)
  const L = lambdaM * cycles, geo = new THREE.CylinderGeometry(r, r, L, 6, Math.max(60, Math.round(cycles * 48)), true);
  geo.rotateZ(-Math.PI / 2); geo.translate(L / 2, 0, 0);
  const mat = new THREE.ShaderMaterial({ uniforms: { lam: { value: lambdaM }, amp: { value: amp }, phase: { value: 0 }, col: { value: new THREE.Color(col) } },
    vertexShader: `#include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float lam, amp, phase; varying vec3 vn;
      void main(){ vec3 p = position; float a = 6.2831853 * p.x / lam - phase;
        p.y += amp * sin(a); vn = normalize(normalMatrix * vec3(-amp * 6.2831853 / lam * cos(a), 1.0, 0.0) + normal * 0.6);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `#include <common>
      #include <logdepthbuf_pars_fragment>
      uniform vec3 col; varying vec3 vn;
      void main(){
        #include <logdepthbuf_fragment>
        float sh = 0.55 + 0.45 * abs(normalize(vn).y); gl_FragColor = vec4(col * sh + col * 0.25, 1.0); }` });
  return { mesh: new THREE.Mesh(geo, mat), mat, L };
}
const fmtHz = f => f >= 1e18 ? `${+(f / 1e18).toPrecision(3)} EHz` : f >= 1e15 ? `${+(f / 1e15).toPrecision(3)} PHz` :
  f >= 1e12 ? `${+(f / 1e12).toPrecision(3)} THz` : f >= 1e9 ? `${+(f / 1e9).toPrecision(3)} GHz` : `${+(f / 1e6).toPrecision(3)} MHz`;
const fmtEV = e => e >= 1e3 ? `${+(e / 1e3).toPrecision(3)} keV` : e >= 0.1 ? `${+e.toPrecision(3)} eV` : `${+(e * 1e3).toPrecision(3)} meV`;
function spectrumLine(lamReal, name, note) {                  // plaque text with real physics
  const f = C_LIGHT / lamReal, E = H_EV / (lamReal / nm);
  return [name, `wavelength ${fmtReal(lamReal)} → ${fmt(sz(lamReal))} here`,
          `frequency ${fmtHz(f)} · photon energy ${fmtEV(E)}${E > 3.5 ? " -- enough to break chemical bonds" : ""}`, note]; }
const LG = { x0: 52, z0: -20 };                               // the gallery's corner
{
  // the rainbow wall: seven visible wavelengths stacked on one frame, so you can compare them
  const vis = [[700, 0xff2a1a, "red"], [610, 0xff8c1a, "orange"], [580, 0xffe11a, "yellow"], [530, 0x34e04a, "green"],
               [490, 0x1ad0e6, "cyan"], [450, 0x2d5bff, "blue"], [400, 0x8a3dff, "violet"]];
  const fx = LG.x0, fz = LG.z0 - 4, frameL = sz(700 * nm) * 2 + 1;
  for (const px of [fx - 0.3, fx + frameL]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 0.12), M(0x2c3e50)); post.position.set(px, 2.3, fz); scene.add(post); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(frameL + 0.5, 0.1, 0.12), M(0x2c3e50)); beam.position.set(fx + frameL / 2 - 0.15, 4.6, fz); scene.add(beam);
  vis.forEach(([l, col, n], i) => { const w = waveTube(sz(l * nm), 2, 0.17, 0.035, col); w.mesh.position.set(fx, 0.85 + i * 0.52, fz); scene.add(w.mesh);
    WAVES.push({ mat: w.mat, f: C_LIGHT / (l * nm) });
    const tag = label([`${n} ${l} nm`], new THREE.Vector3(fx - 0.9, 0.85 + i * 0.52, fz), 0.32, "banner");
    // a measuring bracket under the first wave: exactly one wavelength, crest to crest
    const lam = sz(l * nm), y = 0.85 + i * 0.52 - 0.25, mat = new THREE.MeshBasicMaterial({ color: col });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(lam, 0.012, 0.012), mat); bar.position.set(fx + lam / 2, y, fz); scene.add(bar);
    for (const ex of [0, lam]) { const tick = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.09, 0.012), mat); tick.position.set(fx + ex, y, fz); scene.add(tick); }
    label([`one wavelength: ${l} nm → ${fmt(lam)}`], new THREE.Vector3(fx + lam / 2, y - 0.07, fz + 0.02), 0.22, "banner"); });
  label(["the visible rainbow", "each line shows TWO waves; the bracket under it marks ONE wavelength",
         "violet 400 nm → 4 m  ·  red 700 nm → 7 m",
         "every colour you have ever seen fits between these", "at 1 femtosecond per second (press 0) they move: green oscillates every 1.8 s"],
    new THREE.Vector3(fx + 6, 0, fz + 2), 1.0);
  ladder.push({ name: "visible light", real: 530 * nm, x: fx + 6, z: fz });
}
{
  // the rest of the spectrum, shortest first, each on its own rack along a path
  const items = [
    [1e-12 * 1, 0xffffff, "gamma ray", "from atomic nuclei · too fine to see even here: 0.01 mm waves", 40, 0.000004],
    [1.97e-12, 0x9fdfff, "electrons in a 300 kV microscope", "waves this short are why electron microscopes see atoms", 40, 0.000006],
    [0.1 * nm, 0xc39bd3, "X-ray", "the size of an atom: X-rays map where atoms sit in crystals", 6, 0.00025],
    [1 * nm, 0xa569bd, "soft X-ray", "absorbed by air; used to image cells' insides", 6, 0.0025],
    [13.5 * nm, 0x7d3c98, "extreme ultraviolet", "the light that prints today's chips (see the chip nearby)", 6, 0.02],
    [254 * nm, 0x6c3483, "UV-C (germicidal)", "127× wider than DNA, but each photon can break it", 2, 0.35],
    [300 * nm, 0x884ea0, "UV-B", "the sunburn band", 2, 0.4],
    [365 * nm, 0x9b59b6, "UV-A (black light)", "makes white shirts glow at a party", 2, 0.45],
    [1 * um, 0x7b241c, "near infrared", "TV remotes, night-vision cameras", 1.5, 0.9],
    [1.55 * um, 0x641e16, "telecom infrared", "the internet travels through glass fibres at this wavelength", 1.25, 1.2],
  ];
  const zRow = LG.z0 - 13; let x = LG.x0;
  for (const [lam, col, name, note, cycles, amp] of items) {
    const L = sz(lam) * cycles, r = Math.max(sz(lam) * 0.04, 0.00025);   // the shortest are drawn as a fine visible thread
    const w = waveTube(sz(lam), cycles, amp, r, col); w.mesh.position.set(x, 1.15, zRow); scene.add(w.mesh); WAVES.push({ mat: w.mat, f: C_LIGHT / lam });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.3, L) + 0.2, 0.05, 0.25), M(0x34495e)); rack.position.set(x + L / 2, 0.85, zRow); scene.add(rack);
    for (const px of [x - 0.1, x + Math.max(0.3, L) + 0.1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.05), M(0x34495e)); leg.position.set(px, 0.425, zRow); scene.add(leg); }
    label(spectrumLine(lam, name, note), new THREE.Vector3(x + Math.max(0.3, L) / 2, 0, zRow), 0.7);
    ladder.push({ name, real: lam, x: x + L / 2, z: zRow });
    x += Math.max(1.6, L + 1.6);
  }
  // thermal infrared: a single 100 m wave arching over the gallery
  const lamT = 10 * um, wT = waveTube(sz(lamT), 1, 14, 0.25, 0xc0392b);
  wT.mesh.position.set(LG.x0 - 2, 14.5, LG.z0 - 28); scene.add(wT.mesh); WAVES.push({ mat: wT.mat, f: C_LIGHT / lamT });
  label(spectrumLine(lamT, "thermal infrared (the red arch)", "the light YOU glow with: body heat peaks near 10 µm"), new THREE.Vector3(LG.x0 + 4, 0, LG.z0 - 27), 1.2);
  ladder.push({ name: "thermal infrared", real: lamT, x: LG.x0 + 48, z: LG.z0 - 28 });
  // the rest of the spectrum won't fit on the slide
  label(["beyond the slide ▶", `a 12 cm microwave would be ${fmtReal(sz(0.12)).replace(" m", " m")} here = ${(sz(0.12) / 1000).toLocaleString()} km long`,
         `an FM radio wave (3 m) would be ${(sz(3) / 1000).toLocaleString()} km -- wider than the Earth`,
         "the whole spectrum runs over 15 powers of ten; your eyes see one narrow band"], new THREE.Vector3(LG.x0 + 46, 0, LG.z0 - 13), 1.0);
}
{
  // why a light microscope can't see molecules: the diffraction limit
  const cx = LG.x0 + 6, cz = LG.z0 - 22, d = sz(0.61 * 530 * nm / 1.4) * 2;   // Rayleigh: 0.61 λ / NA, NA = 1.4 oil
  const dotPair = (sep, x0) => { for (const sx of [-sep / 2, sep / 2]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); dot.position.set(x0 + sx, 1.6, cz); scene.add(dot);
      const blur = new THREE.Mesh(new THREE.CircleGeometry(d / 2, 48), new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.32, depthWrite: false }));
      blur.position.set(x0 + sx, 1.6, cz - 0.01); scene.add(blur); } };
  dotPair(d * 1.15, cx); dotPair(d * 0.4, cx + 7);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), M(0x10202a)); board.position.set(cx + 3.5, 1.6, cz - 0.05); scene.add(board);
  label(["the diffraction limit", `even a perfect light microscope blurs each point into a disc ~${fmtReal(0.61 * 530 * nm / 1.4 * 2)} wide (${fmt(d)} here)`,
         "left: two points far enough apart to tell apart · right: closer, and they merge into one blur",
         "so a virus (1 m here) or a protein (5 cm) can't be seen with light -- electrons or X-rays are needed"], new THREE.Vector3(cx + 3.5, 0, cz + 2), 1.0);
  ladder.push({ name: "diffraction limit", real: 0.23 * um, x: cx + 3.5, z: cz });
}
{ // a modern chip: silicon fins with gates wrapped over them ("3 nm-class" process)
  const C = new THREE.Group(); C.position.set(12, 0, -46); scene.add(C);
  const W = 6, D = 3.2, base = 1.0;
  const si = new THREE.Mesh(new THREE.BoxGeometry(W, base, D), M(0x5d6670, { roughness: 0.5 })); si.position.y = base / 2; C.add(si);
  const nf = Math.floor(D / sz(REAL.finPitch));
  for (let i = 0; i < nf; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(W, sz(REAL.finH), sz(REAL.fin)), M(0x7d8a96));
    f.position.set(0, base + sz(REAL.finH) / 2, -D / 2 + (i + 0.5) * sz(REAL.finPitch)); C.add(f); }
  const ng = Math.floor(W / sz(REAL.gatePitch));
  for (let i = 0; i < ng; i++) { const g = new THREE.Mesh(new THREE.BoxGeometry(sz(REAL.gateW), sz(REAL.finH) + 0.25, D * 0.9), M(0xc9a227, { metalness: 0.7, roughness: 0.35 }));
    g.position.set(-W / 2 + (i + 0.5) * sz(REAL.gatePitch), base + (sz(REAL.finH) + 0.25) / 2, 0); C.add(g); }
  label(["a computer chip, up close", "silicon fins ~6 nm wide, 50 nm tall → 6 cm × 50 cm",
         "gates (gold) every ~48 nm → 48 cm  ·  each fin-and-gate crossing is part of a transistor",
         "a '3 nm' chip has no 3 nm feature: the name is marketing"], new THREE.Vector3(12, 3.0, -46), 1.6);
  ladder.push({ name: "transistors (chip)", real: REAL.gatePitch, x: 12, z: -46 });
}
{ // the surface of a CD: pits along a spiral track, read by a laser
  const P = new THREE.Group(); P.position.set(8, 0, -84); scene.add(P);
  const W = 90, D = 52;
  const disc = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), M(0xc8ccd2, { metalness: 0.8, roughness: 0.3 }));
  disc.position.set(W / 2, 0.15, 0); P.add(disc);
  const pitM = M(0x2a2e33, { metalness: 0.5, roughness: 0.5 }), track = sz(REAL.cdTrack), pw = sz(REAL.cdPitW);
  for (let t = -D / 2 + track / 2; t < D / 2 - pw; t += track) {
    let x = rr(0, 6); while (x < W - 2) { const L = rr(sz(REAL.cdPitMin), sz(REAL.cdPitMax));
      if (x + L > W) break;
      const pit = new THREE.Mesh(new THREE.BoxGeometry(L, 0.02, pw), pitM); pit.position.set(x + L / 2, 0.305, t); P.add(pit);
      x += L + rr(sz(REAL.cdPitMin), sz(REAL.cdPitMax)); } }
  label(["the surface of a CD", "pits 0.5 µm wide → 5 m, 0.8–3 µm long → 8–30 m, 125 nm deep → 1.25 m",
         "tracks 1.6 µm apart → 16 m  ·  the dark lengths are the music's 1s and 0s"],
    new THREE.Vector3(8 + W / 2, 9, -84), 6);
  ladder.push({ name: "CD pits", real: REAL.cdPitW, x: 8 + W / 2, z: -84 });
}
{ // a cloud droplet hanging in the water above the slide, and a grain of silt
  const drop = new THREE.Mesh(new THREE.SphereGeometry(sz(REAL.cloudDrop) / 2, 64, 48),
    new THREE.MeshPhysicalMaterial({ color: 0xdff4ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.55 }));
  drop.position.set(120, 75, -620); scene.add(drop);
  label(sizeLines("a cloud droplet", REAL.cloudDrop).concat(["(really it would float in air, not water)"]), new THREE.Vector3(120, 135, -620), 20);
  ladder.push({ name: "cloud droplet", real: REAL.cloudDrop, x: 120, z: -620 });
  const g = new THREE.IcosahedronGeometry(sz(REAL.silt) / 2, 2), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i);
    v.multiplyScalar(0.8 + 0.35 * Math.abs(Math.sin(v.x * 0.02) * Math.cos(v.y * 0.03 + v.z * 0.01))); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  const silt = new THREE.Mesh(g, M(0xd8cbb0, { flatShading: true, roughness: 0.4, transparent: true, opacity: 0.92 }));
  silt.position.set(-200, sz(REAL.silt) * 0.3, -680); scene.add(silt);
  label(sizeLines("a grain of silt (quartz)", REAL.silt).concat(["finer than sand, coarser than clay"]), new THREE.Vector3(-200, sz(REAL.silt) * 0.75, -680), 60);
  ladder.push({ name: "silt grain", real: REAL.silt, x: -200, z: -680 });
}

// ---------- motor proteins: kinesin and dynein on a microtubule ---------------------
// the track: a microtubule along x, plus end at +x; kinesin walks to +, dynein to -
const MT0 = -24, MT1 = -10, MTY = 1.55, MTZ = -24;
{ const mt = microtubule(MT1 - MT0); mt.rotation.z = -Math.PI / 2; mt.position.set((MT0 + MT1) / 2, MTY, MTZ); scene.add(mt);
  label(["kinesin and dynein: motors on a microtubule",
         "kinesin (blue) steps 8 nm → 8 cm toward the + end, ~100 steps a second",
         "dynein (red) steps toward the − end, sometimes backwards",
         "watch at 10 ms per second (press 3)  ·  − end ◀  ▶ + end"], new THREE.Vector3((MT0 + MT1) / 2, 3.1, MTZ), 1.0); }
function head(rx, ry, rz, mat) { return new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10).scale(rx, ry, rz), mat); }
function vesicle(r, col) { return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18),
  new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.55, roughness: 0.3 })); }
const R_MT = sz(REAL.mtOuter) / 2;
const kinesin = (() => {
  const g = new THREE.Group(), m = M(0x2e86de), L = sz(REAL.kinLen);
  const hA = head(0.045, 0.03, 0.025, m), hB = head(0.045, 0.03, 0.025, m);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, L, 6), M(0x5dade2));
  const cargo = vesicle(sz(REAL.vesicle) / 2, 0x9bd2f2); g.add(hA, hB, stalk, cargo); scene.add(g);
  return { g, hA, hB, stalk, cargo, L, n: 0, t: 0 };
})();
const dynein = (() => {
  const g = new THREE.Group(), m = M(0xc0392b), r = sz(REAL.dynRing) / 2;
  const ring = () => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.45, 8, 12), m); return t; };
  const hA = ring(), hB = ring();
  const stalkA = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 5), M(0xe6b0aa)), stalkB = stalkA.clone();
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 6), M(0xe57373));
  const cargo = vesicle(sz(REAL.vesicle) * 0.6, 0xf5b7b1); g.add(hA, hB, stalkA, stalkB, tail, cargo); scene.add(g);
  return { g, hA, hB, stalkA, stalkB, tail, cargo, n: 0, t: 0, back: false };
})();
function updateMotors(Treal) {
  // kinesin: dwell, then the trailing head swings 16 nm past the leading one (hand over hand)
  const k = kinesin; k.t += Treal * REAL.kinHz;
  while (k.t >= 1) { k.t -= 1; k.n++; }
  const step = sz(REAL.kinStep), span = MT1 - MT0 - 1.4, x0 = MT0 + 0.5 + ((k.n * step) % span);
  const lead = x0 + step, f = THREE.MathUtils.smoothstep(k.t, 0.75, 1);   // most of each cycle is dwell
  const trailX = x0 - step + 2 * step * f, arc = Math.sin(f * Math.PI) * 0.06;
  const yTop = MTY + R_MT + 0.03;
  const [front, back] = k.n % 2 ? [k.hA, k.hB] : [k.hB, k.hA];
  front.position.set(lead, yTop, MTZ); back.position.set(trailX, yTop + arc, MTZ);
  const mid = (lead + trailX) / 2;
  k.stalk.position.set(mid, yTop + 0.04 + k.L / 2, MTZ);
  k.cargo.position.set(mid - 0.05, yTop + 0.06 + k.L + sz(REAL.vesicle) / 2, MTZ);
  // dynein: toward the minus end, the occasional step back, a floppier gait
  const d = dynein; d.t += Treal * REAL.dynHz;
  while (d.t >= 1) { d.t -= 1; d.back = rnd() < 0.12; d.n += d.back ? -1 : 1; }
  const dx = MT1 - 0.6 - (((d.n * sz(REAL.dynStep)) % span) + span) % span;
  const g2 = THREE.MathUtils.smoothstep(d.t, 0.7, 1), dir = d.back ? 1 : -1;
  const yB = MTY - R_MT - 0.1;                    // walks on the underside
  d.hA.position.set(dx, yB - 0.03, MTZ + 0.05); d.hB.position.set(dx - dir * sz(REAL.dynStep) * (1 - g2), yB - 0.03 - Math.sin(g2 * Math.PI) * 0.05, MTZ - 0.05);
  for (const [h, st] of [[d.hA, d.stalkA], [d.hB, d.stalkB]]) { h.rotation.y = Math.PI / 2;
    st.position.set(h.position.x, (h.position.y + MTY - R_MT) / 2, h.position.z); st.scale.y = Math.abs(h.position.y - (MTY - R_MT)) / 0.15; }
  d.tail.position.set(dx, yB - 0.33, MTZ); d.cargo.position.set(dx, yB - 0.6 - sz(REAL.vesicle) * 0.6, MTZ);
}

// ---------- one sarcomere, at walking scale: actin, myosin, Z-discs ---------------
// 7 thick (myosin) filaments in a hexagon, thin (actin) filaments at the trigonal
// positions between them, anchored to Z-discs that move together as it contracts
const SAR = new THREE.Group(); SAR.position.set(-8, 1.6, -56); SAR.rotation.y = 0; scene.add(SAR);
const SL = sz(REAL.sarcRest), D = sz(REAL.lattice);
const thickPos = [[0, 0], ...[0, 1, 2, 3, 4, 5].map(i => [Math.cos(i * Math.PI / 3) * D, Math.sin(i * Math.PI / 3) * D])];
const thinPos = [];
for (const [a, b] of thickPos) for (let i = 0; i < 6; i++) {   // trigonal sites: centre of each triangle
  const x = a + Math.cos(i * Math.PI / 3 + Math.PI / 6) * D / Math.sqrt(3), y = b + Math.sin(i * Math.PI / 3 + Math.PI / 6) * D / Math.sqrt(3);
  if (Math.hypot(x, y) < D * 1.2 && !thinPos.some(([u, v]) => Math.hypot(u - x, v - y) < 0.01)) thinPos.push([x, y]); }
const thinSides = [-1, 1].map(side => {           // each half: thin filaments anchored to one Z-disc
  const g = new THREE.Group(); SAR.add(g);
  const nSub = Math.round(sz(REAL.thinLen) / sz(REAL.actinRise)), pts = [];
  for (const [y, z] of thinPos) for (let i = 0; i < nSub; i++) {
    const a = i * REAL.actinTwist * Math.PI / 180, r = sz(REAL.actinSub) * 0.45;
    pts.push(new THREE.Vector3(-side * i * sz(REAL.actinRise), y + Math.cos(a) * r, z + Math.sin(a) * r)); }
  g.add(atoms(pts, sz(REAL.actinSub) / 2, M(0xf5b041, { roughness: 0.5 })));
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(D * 1.6, D * 1.6, 0.08, 6), M(0x7f8c8d));
  disc.rotation.z = Math.PI / 2; g.add(disc);
  return g;
});
const thickL = sz(REAL.thickLen), crown = sz(REAL.crown), hl = sz(REAL.headLen);
for (const [y, z] of thickPos) { const t = new THREE.Mesh(new THREE.CylinderGeometry(sz(REAL.thickD) / 2, sz(REAL.thickD) / 2, thickL, 8), M(0x8e44ad));
  t.rotation.z = Math.PI / 2; t.position.set(0, y, z); SAR.add(t); }
const heads = [];                                  // myosin heads: 3 per crown, crowns every 14.3 nm, twisting 40 degrees
for (const [y, z] of thickPos) for (let x = sz(REAL.bareZone) / 2; x < thickL / 2; x += crown) for (const side of [-1, 1])
  for (let k = 0; k < 3; k++) { const ang = (x / crown) * REAL.crownTwist * Math.PI / 180 + k * 2 * Math.PI / 3;
    heads.push({ x: side * x, y, z, ang, side, ph: rnd() }); }
const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6).scale(hl * 0.5, hl * 0.22, hl * 0.22), M(0xc39bd3), heads.length);
SAR.add(headMesh);
label(["one sarcomere: the unit of muscle contraction",
       "myosin (purple) heads pull actin (orange) toward the middle; the Z-discs (grey) close in",
       `2.4 µm → ${fmt(SL)} at rest, ~2.1 µm contracted · myosin stays ${fmt(thickL)} long`,
       "it twitches each time the nerve fires · watch at 10 ms per second (press 3)"], new THREE.Vector3(-8, 3.4, -56), 1.0);
ladder.push({ name: "sarcomere (actin & myosin)", real: REAL.sarcRest, x: -8, z: -56 });
ladder.push({ name: "kinesin & dynein", real: REAL.kinLen, x: -17, z: MTZ });
SAR.rotation.y = Math.PI / 2;                       // lie along the walk (z)

// ---------- a muscle fibre with a nerve ending ----------------------------------------
const FIB = new THREE.Group(); const FR = sz(REAL.fiber) / 2, FLEN = 160;
FIB.position.set(-120, FR - 2, -350); scene.add(FIB);
const fibreSkin = new THREE.Mesh(new THREE.CylinderGeometry(FR, FR, FLEN, 64, 1, true), new THREE.MeshStandardMaterial({
  color: 0xd98880, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, emissive: 0x000000 }));
fibreSkin.rotation.x = Math.PI / 2; FIB.add(fibreSkin);
// myofibrils striped by the real band widths; the pattern follows the sarcomere length
const bandMat = new THREE.ShaderMaterial({
  uniforms: { L: { value: SL }, A: { value: thickL }, T: { value: sz(REAL.thinLen) }, light: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() } },
  // the logdepthbuf chunks are required: this world uses a logarithmic depth buffer
  vertexShader: `#include <common>
    #include <logdepthbuf_pars_vertex>
    varying float vz; varying vec3 vn; void main(){ vz = position.y; vn = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `#include <common>
    #include <logdepthbuf_pars_fragment>
    uniform float L, A, T; uniform vec3 light; varying float vz; varying vec3 vn;
    void main(){
      #include <logdepthbuf_fragment>
      float u = mod(vz + L * 0.5, L) - L * 0.5;          // 0 at the sarcomere centre (M-line)
      float a = abs(u), half_ = L * 0.5;
      vec3 c = vec3(0.93, 0.72, 0.70);                              // I band: thin filaments only, light
      if (a < A * 0.5) c = vec3(0.55, 0.16, 0.18);                  // A band: myosin, dark
      if (a < max(half_ - T, 0.0)) c = vec3(0.75, 0.32, 0.32);      // H zone: myosin without actin overlap
      if (a > half_ - 0.12) c = vec3(0.2, 0.1, 0.1);                // Z line
      float sh = 0.45 + 0.55 * max(dot(normalize(vn), light), 0.0);
      gl_FragColor = vec4(c * sh, 1.0); }` });
{
  const r = sz(REAL.myofibril) / 2, geo = new THREE.CylinderGeometry(r, r, FLEN - 1, 20);
  for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
    const x = (i + (j % 2) * 0.5) * r * 2.15, y = j * r * 2.15 * 0.866;
    if (Math.hypot(x, y) > FR - r - 1) continue;
    const m = new THREE.Mesh(geo, bandMat); m.rotation.x = Math.PI / 2; m.position.set(x, y, 0); FIB.add(m);
  }
}
label(sizeLines("a muscle fibre (one cell)", REAL.fiber).concat([
  "a 160 m stretch of it -- the whole cell is centimetres long, kilometres here",
  "inside: myofibrils 1.5 µm → 15 m, striped by their sarcomeres"]), new THREE.Vector3(-120, 2 * FR + 22, -280), 16);
ladder.push({ name: "muscle fibre", real: REAL.fiber, x: -120, z: -350 });
// the neuromuscular junction: nerve terminal branches lying on top of the fibre
const NMJ = new THREE.Group(); NMJ.position.set(-120, 2 * FR - 2, -350); scene.add(NMJ);
const termR = sz(REAL.terminal) / 2, cleft = sz(REAL.cleft);
const termMat = new THREE.MeshStandardMaterial({ color: 0xf7dc6f, transparent: true, opacity: 0.38, depthWrite: false,
  emissive: 0x000000, side: THREE.DoubleSide });
const branches = [];
{
  const axonPts = [new THREE.Vector3(30, 260, 40), new THREE.Vector3(10, 120, 20), new THREE.Vector3(0, termR + cleft + 8, 0)];
  const axon = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(axonPts), 60, termR * 1.2, 16), termMat);
  NMJ.add(axon);
  for (const ang of [0.3, 1.9, 3.4, 4.8]) {           // terminal branches pressed along the fibre surface
    const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12, d = u * 28;
      const x = Math.cos(ang) * d * 0.6, z = Math.sin(ang) * d;
      const yOn = Math.sqrt(Math.max(0, (FR + termR + cleft) ** 2 - x * x)) - FR;    // follow the fibre's curve
      pts.push(new THREE.Vector3(x, yOn + (1 - u) * 8, z)); }
    const b = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, termR, 14), termMat); NMJ.add(b);
    branches.push(pts);
  }
}
// synaptic vesicles clustered against the membrane facing the fibre
const synV = [];
for (const pts of branches) for (let i = 0; i < 90; i++) {
  const p = pts[2 + Math.floor(rnd() * 10)].clone().add(new THREE.Vector3(rr(-termR, termR) * 0.6, -termR * rr(0.35, 0.85), rr(-termR, termR) * 0.6));
  synV.push({ home: p, p: p.clone(), fusing: -1 }); }
const synMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(sz(REAL.synVesicle) / 2, 10, 8), M(0xf39c12, { emissive: 0x3a2000 }), synV.length);
NMJ.add(synMesh);
const achN = 6000, achPos = new Float32Array(achN * 3);
const ach = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(achPos, 3)),
  new THREE.PointsMaterial({ color: 0x76ff7a, size: 0.12, transparent: true, opacity: 0, depthWrite: false }));
NMJ.add(ach);
label(["a nerve ending on the muscle (neuromuscular junction)",
       `terminal ${fmtReal(REAL.terminal)} → ${fmt(sz(REAL.terminal))} thick · vesicles ${fmtReal(REAL.synVesicle)} → ${fmt(sz(REAL.synVesicle))}`,
       `synaptic cleft ${fmtReal(REAL.cleft)} → ${fmt(cleft)} · ~${REAL.quanta} vesicles release acetylcholine per impulse`,
       "press N to fire the nerve, or wait: it fires 4 times a second (real time)"],
  new THREE.Vector3(-120, 2 * FR + 60, -350), 14);
ladder.push({ name: "nerve ending", real: REAL.terminal, x: -120, z: -350 });

// the twitch: contraction c(t) after an impulse, from its real time course
let realT = 0, lastImpulse = -1;
function twitch(t) { const u = t - lastImpulse - REAL.twitchDelay; if (lastImpulse < 0 || u < 0) return 0;
  return u < REAL.twitchRise ? THREE.MathUtils.smoothstep(u, 0, REAL.twitchRise) : Math.exp(-(u - REAL.twitchRise) / (REAL.twitchFall / 2.5)); }
function fire() { lastImpulse = realT;
  const near = synV.filter(v => v.fusing < 0).sort(() => rnd() - 0.5).slice(0, REAL.quanta);
  for (const v of near) v.fusing = realT;
  const c = achPos;
  for (let i = 0; i < achN; i++) { const pts = branches[i % branches.length], p = pts[2 + Math.floor(rnd() * 10)];
    c.set([p.x + gauss() * 0.4, p.y - termR - cleft * 0.5, p.z + gauss() * 0.4], 3 * i); }
  ach.geometry.attributes.position.needsUpdate = true;
}
addEventListener("keydown", e => { if (e.code === "KeyN") fire(); });
const hdum = new THREE.Object3D();
function updateMuscle(Treal, skipHeads = false, skipSynapse = false) {
  realT += Treal;
  if (realT - lastImpulse > REAL.impulseEvery || lastImpulse < 0) fire();
  const c = twitch(realT), L = SL - (SL - sz(REAL.sarcShort)) * c;
  thinSides[0].position.x = -L / 2; thinSides[1].position.x = L / 2;       // Z-discs and their actin
  bandMat.uniforms.L.value = L;
  // myosin heads: while contracting they cycle -- attach, swing ~10 nm, detach, recock
  const ex = c > 0.02, since = realT - lastImpulse;
  if (!skipHeads) heads.forEach((h, i) => {
    const overlap = Math.abs(h.x) > L / 2 - sz(REAL.thinLen);                   // actin within reach
    const cyc = (h.ph + realT * REAL.crossBridgeHz) % 1;
    const swing = ex && overlap ? (cyc < 0.6 ? cyc / 0.6 : 1 - (cyc - 0.6) / 0.4) : 0;
    const tilt = (0.95 - swing * 0.75) * h.side;                                   // lever angle to the filament
    const r = sz(REAL.thickD) / 2 + hl * 0.45;
    hdum.position.set(h.x + h.side * Math.cos(tilt) * 0, h.y + Math.cos(h.ang) * r, h.z + Math.sin(h.ang) * r);
    hdum.rotation.set(h.ang, 0, Math.PI / 2 - tilt * 0.9); hdum.updateMatrix(); headMesh.setMatrixAt(i, hdum.matrix); });
  headMesh.instanceMatrix.needsUpdate = true;
  // nerve terminal: calcium glow, vesicles fuse, acetylcholine spreads, the fibre membrane fires
  termMat.emissive.setRGB(0.5, 0.35, 0).multiplyScalar(Math.exp(-Math.max(0, since) / 0.002));
  fibreSkin.material.emissive.setRGB(0.6, 0.2, 0.15).multiplyScalar(since > 0.0008 ? Math.exp(-(since - 0.0008) / 0.004) : 0);
  if (!skipSynapse) synV.forEach((v, i) => { if (v.fusing >= 0) { const f = (realT - v.fusing) / 0.0006;
      v.p.copy(v.home).add(new THREE.Vector3(0, -termR * 0.3 * Math.min(1, f), 0));
      if (realT - v.fusing > REAL.impulseEvery * 0.9) { v.fusing = -1; v.p.copy(v.home); } }
    hdum.position.copy(v.p); hdum.rotation.set(0, 0, 0);
    hdum.scale.setScalar(v.fusing >= 0 && realT - v.fusing > 0.0006 ? 0.001 : 1); hdum.updateMatrix(); synMesh.setMatrixAt(i, hdum.matrix); });
  hdum.scale.setScalar(1); synMesh.instanceMatrix.needsUpdate = true;
  const achAge = since; ach.material.opacity = achAge < 0.004 ? 0.9 * Math.min(1, achAge / 0.0005) * (1 - achAge / 0.004) : 0;
  if (ach.material.opacity > 0) { const sp = Math.sqrt(2 * 4e-10 * Treal) * S;    // ACh diffusion D ~ 4e-10 m^2/s
    for (let i = 0; i < achN; i++) { achPos[3 * i] += gauss() * sp; achPos[3 * i + 2] += gauss() * sp; }
    ach.geometry.attributes.position.needsUpdate = true; }
}

// ==========================================================================================
//  THE MUSEUM: halls along the avenue, smallest first. Every exhibit at ×10,000,000.
// ==========================================================================================
const HALLS = [   // name, side (-1 left, +1 right), z from, z to, x extent, colour, one-line description
  { id: "entrance",  name: "Entrance",          side: 0,  z0: 7,    z1: -5,   w: 14,  col: 0xffffff, line: "the size ladder and DNA in water" },
  { id: "molecules", name: "Molecules",         side: 1,  z0: -6,   z1: -16,  w: 12,  col: 0x5dade2, line: "the small molecules life is built from" },
  { id: "proteins",  name: "Proteins",          side: -1, z0: -6,   z1: -74,  w: 32,  col: 0xaf7ac5, line: "the machines: carriers, motors, makers" },
  { id: "processes", name: "Life in action",    side: -1, z0: -62,  z1: -79,  w: 64,  col: 0x48c9b0, line: "proteins at work: vision, insulin, clotting, nerves" },
  { id: "surfaces",  name: "Surfaces",          side: -1, z0: -1,   z1: -84,  w: 210, cx: -168, entryAt: [-62, 0, -42.5], col: 0xd4ac0d, line: "walk on glass, steel, paper, skin, a lotus leaf, a butterfly wing" },
  { id: "nonliving", name: "Non-living things", side: 1,  z0: -18,  z1: -114, w: 250, col: 0x95a5a6, line: "materials, light, a chip and a CD" },
  { id: "viruses",   name: "Viruses",           side: -1, z0: -78,  z1: -120, w: 46,  col: 0xe74c3c, line: "packages of genes that need a cell" },
  { id: "bacteria",  name: "Bacteria",          side: 1,  z0: -124, z1: -215, w: 160,  col: 0x52be80, line: "cells without a nucleus" },
  { id: "archaea",   name: "Archaea",           side: -1, z0: -124, z1: -215, w: 120,  col: 0xf5b041, line: "the other cells without a nucleus" },
  { id: "eukaryotes",name: "Eukaryotes",        side: 0,  z0: -230, z1: -580, w: 380, col: 0xec7063, line: "cells with a nucleus: yeast to muscle" },
  { id: "cell",      name: "Inside a cell",     side: 1,  z0: -464, z1: -476, w: 8,   cx: 56, entryAt: [50, 0, -470], col: 0xf5cba7, line: "walk into a human cell" },
];
for (const h of HALLS) {
  const cx = h.cx ?? (h.side === 0 ? 0 : h.side * (2 + h.w / 2)), len = h.z0 - h.z1;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(h.w, 0.004, len), new THREE.MeshStandardMaterial({
    color: h.col, transparent: true, opacity: h.id === "entrance" ? 0.0 : 0.16, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 2 }));
  mat.position.set(cx, 0.012, (h.z0 + h.z1) / 2); scene.add(mat);
  h.entry = h.entryAt ? new THREE.Vector3(...h.entryAt) : new THREE.Vector3(h.side === 0 ? 0.8 : h.side * 1.0, 0, h.z0 - 1);
  h.look = new THREE.Vector3(cx, 0, (h.z0 + h.z1) / 2);
  if (h.id === "entrance") continue;
  // a banner at the entrance, sized to the hall
  const big = Math.min(6, Math.max(1.2, h.w / 14));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * big, 0.05 * big, 2.6 * big, 8), M(0x34495e));
  const px = h.side === 0 ? -3 : h.side * 2.6; pole.position.set(px, 1.3 * big, h.z0); scene.add(pole);
  label([h.name.toUpperCase(), h.line], new THREE.Vector3(px, 2.6 * big, h.z0 + 0.06 * big), 1.1 * big, "banner");
}
const plinth = (x, z, top = 0.9, w = 0.5) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, top, w), M(0xe5ecef, { roughness: 0.8 }));
  p.position.set(x, top / 2, z); p.userData.plinth = true; scene.add(p); return top; };
const exhibit = (obj, x, z, name, real, extra = [], labelY = 1.6, ls = 0.42) => {
  obj.position.x += x; obj.position.z += z; scene.add(obj);
  label(sizeLines(name, real).concat(extra), new THREE.Vector3(x, labelY, z), ls);
  ladder.push({ name, real, x, z }); return obj; };

// ---------- molecules hall ---------------------------------------------------------------
{
  const z = -11, top = 1.05;
  const at = (r, col) => new THREE.Mesh(new THREE.SphereGeometry(sz(r), 12, 10), M(col));
  const C_ = 0x404040, O_ = 0xd84a3a, N_ = 0x3b6fd8, P_ = 0xf0a030, H_ = 0xf2f2f2;
  { plinth(4, z, top); const w = water(); w.position.y = top + 0.01; exhibit(w, 4, z, "water", REAL.water, ["H₂O: one oxygen, two hydrogens at 104.5°"], 1.4); }
  { plinth(5.5, z, top); const g = new THREE.Group(); g.position.y = top + 0.01;       // glycine, the simplest amino acid
    const xyz = [[0, 0, 0, N_], [0.15, 0.05, 0, C_], [0.3, 0, 0, C_], [0.38, 0.1, 0, O_], [0.36, -0.12, 0, O_], [-0.08, 0.1, 0, H_], [-0.06, -0.1, 0, H_]];
    for (const [x, y, zz, c] of xyz) { const a = at(c === H_ ? 0.11 * nm : 0.15 * nm, c); a.position.set(sz(x * nm), sz(y * nm) + 0.003, sz(zz * nm)); g.add(a); }
    exhibit(g, 5.5, z, "glycine (an amino acid)", 0.5 * nm, ["proteins are chains of 20 kinds of these"], 1.4); }
  { plinth(7, z, top); const g = new THREE.Group(); g.position.y = top + 0.01;          // ATP: adenine, ribose, three phosphates
    for (let i = 0; i < 6; i++) { const a = at(0.14 * nm, i % 3 ? C_ : N_); a.position.set(sz(Math.cos(i) * 0.14 * nm), 0.004, sz(Math.sin(i) * 0.14 * nm)); g.add(a); }
    for (let i = 0; i < 5; i++) { const a = at(0.14 * nm, i ? C_ : O_); a.position.set(sz((0.35 + 0.1 * Math.cos(i * 1.26)) * nm), 0.004, sz(0.1 * Math.sin(i * 1.26) * nm)); g.add(a); }
    for (let i = 0; i < 3; i++) { const pp = at(0.18 * nm, P_); pp.position.set(sz((0.62 + i * 0.29) * nm), 0.004, 0); g.add(pp);
      for (const s2 of [-1, 1]) { const o = at(0.14 * nm, O_); o.position.set(sz((0.62 + i * 0.29) * nm), 0.004, s2 * sz(0.15 * nm)); g.add(o); } }
    exhibit(g, 7, z, "ATP", 1.4 * nm, ["the cell's energy currency; you make your weight of it daily"], 1.4); }
  { plinth(8.6, z, top); const g = new THREE.Group(); g.position.y = top + 0.01;         // a phospholipid: head and two tails
    const hd = at(0.4 * nm, P_); hd.position.y = sz(2.3 * nm); g.add(hd);
    for (const dx of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.22 * nm), sz(0.22 * nm), sz(1.8 * nm), 6), M(0xf5e6a8));
      t.position.set(dx * sz(0.24 * nm), sz(1.0 * nm), 0); g.add(t); }
    exhibit(g, 8.6, z, "phospholipid", 2.5 * nm, ["oily tails, water-loving head"], 1.45); }
  { plinth(10.6, z, top, 0.9); const g = new THREE.Group(); g.position.y = top + 0.005; // a patch of membrane: two leaflets of lipid heads
    const W = 0.32, a = sz(Math.sqrt(0.65) * nm), pts = [[], []];
    for (let x = -W / 2; x < W / 2; x += a) for (let y = -W / 2; y < W / 2; y += a) {
      pts[0].push(new THREE.Vector3(x + rr(-1, 1) * a * 0.15, sz(5 * nm), y + rr(-1, 1) * a * 0.15));
      pts[1].push(new THREE.Vector3(x + rr(-1, 1) * a * 0.15, 0, y + rr(-1, 1) * a * 0.15)); }
    g.add(atoms(pts[0], sz(0.4 * nm), M(0xf0a030)), atoms(pts[1], sz(0.4 * nm), M(0xf0a030)));
    const core = new THREE.Mesh(new THREE.BoxGeometry(W, sz(4.2 * nm), W), new THREE.MeshStandardMaterial({ color: 0xf5e6a8, transparent: true, opacity: 0.5 }));
    core.position.y = sz(2.5 * nm); g.add(core);
    exhibit(g, 10.6, z, "cell membrane", 5 * nm, [`a bilayer of ${(pts[0].length * 2).toLocaleString()} lipids, 5 nm → 5 cm thick`], 1.5, 0.5); }
}

// ---------- proteins hall --------------------------------------------------------------
const animate = [];                                          // things that move with real time
{
  const z = -12;
  { const top = plinth(-4, z, 1.0); const g = new THREE.Group(); g.position.y = top + sz(3 * nm);
    const cols = [0xc0392b, 0xe67e22, 0xc0392b, 0xe67e22];
    [[1, 1, 1], [-1, 1, -1], [1, -1, -1], [-1, -1, 1]].forEach(([a, b, c], i) => {
      const s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(1.8 * nm), 2), M(cols[i], { flatShading: true }));
      s2.position.set(a * sz(1.3 * nm), b * sz(1.2 * nm), c * sz(1.3 * nm)); g.add(s2); });
    exhibit(g, -4, z, "haemoglobin", REAL.hemoglobin, ["carries oxygen in red blood cells: 4 subunits, 4 iron atoms"], 1.5); }
  { const top = plinth(-5.8, z, 0.95); const g = new THREE.Group(); g.position.y = top + sz(8 * nm);
    const arm = (ang, col) => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(sz(1.6 * nm), sz(5 * nm), 6, 10), M(col));
      c.rotation.z = ang; c.position.set(-Math.sin(ang) * sz(4 * nm), Math.cos(ang) * sz(4 * nm), 0); return c; };
    g.add(arm(0.95, 0x3b7fc4), arm(-0.95, 0x3b7fc4), arm(Math.PI, 0x2e5e8e));
    exhibit(g, -5.8, z, "antibody (IgG)", REAL.antibody, ["its two tips grab one exact shape"], 1.55); }
  { const top = plinth(-7.6, z, 1.0); const g = new THREE.Group(); g.position.y = top + sz(2.1 * nm);   // GFP: an 11-strand barrel
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, sl = new THREE.Mesh(new THREE.BoxGeometry(sz(0.45 * nm), sz(4.2 * nm), sz(0.2 * nm)), M(0x58d68d));
      sl.position.set(Math.cos(a) * sz(1.2 * nm), 0, Math.sin(a) * sz(1.2 * nm)); sl.rotation.set(0.25, -a, 0); g.add(sl); }
    const glow = new THREE.Mesh(new THREE.SphereGeometry(sz(0.35 * nm), 10, 8), new THREE.MeshBasicMaterial({ color: 0x7dff7a })); g.add(glow);
    exhibit(g, -7.6, z, "green fluorescent protein", 4.2 * nm, ["a glowing core inside a barrel of 11 strands"], 1.45); }
  { const top = plinth(-10.2, z, 0.75, 0.8); const g = new THREE.Group(); g.position.y = top;           // ATP synthase in a membrane
    const mem = new THREE.Mesh(new THREE.BoxGeometry(0.7, sz(5 * nm), 0.7), new THREE.MeshStandardMaterial({ color: 0xf5e6a8, transparent: true, opacity: 0.55 }));
    mem.position.y = sz(2.5 * nm); g.add(mem);
    const rotor = new THREE.Group(); rotor.userData.dynamic = true; g.add(rotor);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, c = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.5 * nm), sz(0.5 * nm), sz(6 * nm), 6), M(0x5dade2));
      c.position.set(Math.cos(a) * sz(2.5 * nm), sz(2.5 * nm), Math.sin(a) * sz(2.5 * nm)); rotor.add(c); }        // c-ring
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.8 * nm), sz(0.8 * nm), sz(12 * nm), 8), M(0x2874a6));
    shaft.position.y = sz(9 * nm); rotor.add(shaft);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(sz(1.6 * nm), sz(1.2 * nm), sz(0.6 * nm)), M(0xf4d03f)); knob.position.set(sz(1 * nm), sz(5.5 * nm), 0); rotor.add(knob);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, sub = new THREE.Mesh(new THREE.SphereGeometry(sz(2.6 * nm), 12, 10), M(i % 2 ? 0xe74c3c : 0xf1948a));
      sub.position.set(Math.cos(a) * sz(3 * nm), sz(16 * nm), Math.sin(a) * sz(3 * nm)); g.add(sub); }            // F1 head: α3β3
    const stator = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.6 * nm), sz(0.6 * nm), sz(16 * nm), 6), M(0x7f8c8d));
    stator.position.set(sz(5.5 * nm), sz(10 * nm), 0); g.add(stator);
    animate.push(Treal => { rotor.rotation.y += Treal * 100 * 6.283; });
    exhibit(g, -10.2, z, "ATP synthase", 25 * nm, ["a rotary motor: the blue rotor turns ~100 times a second,",
      "making 3 ATP per turn · watch at 10 ms per second (press 3)"], 1.4, 0.5); }
  { const top = plinth(-12.4, z, 0.9); const r = ribosome(); r.position.y = top + sz(10 * nm);
    exhibit(r, -12.4, z, "ribosome", REAL.ribosome, ["reads RNA and builds proteins, ~20 amino acids a second"], 1.5); }
  label(["more proteins in this hall:", "kinesin and dynein on a microtubule (behind) · actin and myosin in a sarcomere (further on)"],
    new THREE.Vector3(-8, 2.1, z), 0.55);
}

// ---------- viruses hall -----------------------------------------------------------------
{
  const z = -95, row = [];
  const spiky = (R, n, spikeL, col, spikeCol, club = 0.25) => {  // envelope with n spikes, by golden-angle spiral
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 3), M(col, { roughness: 0.8 })));
    const stalk = new THREE.CylinderGeometry(spikeL * 0.08, spikeL * 0.08, spikeL, 5), head_ = new THREE.SphereGeometry(spikeL * club, 8, 6);
    const ims = new THREE.InstancedMesh(stalk, M(spikeCol), n), imh = new THREE.InstancedMesh(head_, M(spikeCol), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), a = i * 2.39996;
      const d = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      o.position.copy(d).multiplyScalar(R + spikeL / 2); o.updateMatrix(); ims.setMatrixAt(i, o.matrix);
      o.position.copy(d).multiplyScalar(R + spikeL); o.updateMatrix(); imh.setMatrixAt(i, o.matrix); }
    g.add(ims, imh); return g; };
  const ico = (r, col, detail = 0) => new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), M(col, { flatShading: true }));
  // poliovirus: 30 nm icosahedron
  { const top = plinth(-4, -84, 1.0); const v = ico(sz(15 * nm), 0x5dade2, 1); v.position.y = top + sz(15 * nm);
    exhibit(v, -4, -84, "poliovirus", 30 * nm, ["one of the smallest: an RNA genome in a 60-part shell"], 1.6); }
  // SARS-CoV-2
  { const v = virus(); v.position.y = sz(REAL.virus) / 2 + 0.6; plinth(-7, -88, 0.6, 1.2);
    exhibit(v, -7, -88, "SARS-CoV-2", REAL.virus, ["~25 spike proteins grip our cells"], 2.0); }
  // influenza: densely covered in haemagglutinin and neuraminidase spikes
  { const v = spiky(sz(50 * nm), 380, sz(13.5 * nm), 0xd5dbdb, 0x2e86c1, 0.18); v.position.y = sz(50 * nm) + 0.75; plinth(-10.5, -92, 0.6, 1.3);
    exhibit(v, -10.5, -92, "influenza virus", 100 * nm, ["~400 spikes: haemagglutinin to get in, neuraminidase to get out"], 2.1); }
  // HIV: a sparse handful of spikes, cut away to show the cone-shaped core
  { const g = new THREE.Group(), R = sz(60 * nm);
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 3), new THREE.MeshStandardMaterial({ color: 0xf8c471, transparent: true, opacity: 0.3, depthWrite: false })));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(sz(30 * nm), sz(100 * nm), 24, 1, false), M(0xc0392b)); cone.rotation.z = 1.2; g.add(cone);
    for (let i = 0; i < 14; i++) { const d = new THREE.Vector3(gauss(), gauss(), gauss()).normalize(), sp = new THREE.Mesh(new THREE.ConeGeometry(sz(5 * nm), sz(12 * nm), 6), M(0x7d3c98));
      sp.position.copy(d).multiplyScalar(R + sz(6 * nm)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(sp); }
    g.position.y = R + 0.75; plinth(-14, -96, 0.6, 1.4);
    exhibit(g, -14, -96, "HIV", 120 * nm, ["only ~14 spikes · the red cone holds two RNA genomes"], 2.25); }
  // adenovirus: 90 nm icosahedron with a fibre and knob at each of its 12 corners
  { const g = new THREE.Group(), R = sz(45 * nm), shell = ico(R, 0x48c9b0, 0); g.add(shell);
    const p = shell.geometry.attributes.position, seen = [];
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i);
      if (seen.some(u => u.distanceTo(v) < 1e-3)) continue; seen.push(v);
      const d = v.clone().normalize(), f = new THREE.Mesh(new THREE.CylinderGeometry(sz(1 * nm), sz(1 * nm), sz(30 * nm), 5), M(0x1abc9c));
      f.position.copy(d).multiplyScalar(R + sz(15 * nm)); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.add(f);
      const k = new THREE.Mesh(new THREE.SphereGeometry(sz(4 * nm), 8, 6), M(0x117a65)); k.position.copy(d).multiplyScalar(R + sz(31 * nm)); g.add(k); }
    g.position.y = R + sz(31 * nm) + 0.75; plinth(-18, -100, 0.6, 1.4);
    exhibit(g, -18, -100, "adenovirus", 90 * nm, ["a DNA virus · 12 fibres reach out to grab a cell"], 2.4); }
  // tobacco mosaic virus: an 18 nm × 300 nm rod of 2,130 coat proteins in a helix
  { const g = new THREE.Group(), L = sz(300 * nm), r = sz(9 * nm), n = 900, o = new THREE.Object3D();
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(sz(2.5 * nm), sz(2.3 * nm), sz(7 * nm)), M(0x82e0aa), n);
    for (let i = 0; i < n; i++) { const a = i / 16.33 * 6.283, y = i * (L / n);
      o.position.set(Math.cos(a) * r * 0.62, y, Math.sin(a) * r * 0.62); o.rotation.set(0, -a, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    g.add(im); g.rotation.z = Math.PI / 2; g.position.set(L / 2, 1.1, 0);
    const top = plinth(-23, -88, 0.95, 0.3); plinth(-23 - L / 2 + 0.2, -88, 0.95, 0.3); plinth(-23 + L / 2 - 0.2, -88, 0.95, 0.3);
    exhibit(g, -23 - L / 2, -88, "tobacco mosaic virus", 300 * nm, ["a rod of protein wound round its RNA · the first virus ever found (1892)"], 1.75, 0.5);
    ladder.at(-1).x = -23; }
  // T4 phage
  { const p = phageT4(); plinth(-27, -104, 0.4, 2.2); p.position.y = 0.4; exhibit(p, -27, -104, "bacteriophage T4", 200 * nm, ["infects bacteria: lands on its legs, injects DNA"], 3.1); }
  // mimivirus: a 450 nm capsid covered in 125 nm fibres -- bigger than some bacteria
  { const g = new THREE.Group(), R = sz(225 * nm); g.add(ico(R, 0x5b2c6f, 2));
    const n = 1400, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(sz(1.5 * nm), sz(1.5 * nm), sz(125 * nm), 4), M(0xd2b4de), n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), a = i * 2.39996, d = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); o.position.copy(d).multiplyScalar(R + sz(62 * nm)); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    g.add(im); g.position.y = R + sz(125 * nm) + 0.3;
    exhibit(g, -31, -95, "mimivirus (a giant virus)", 750 * nm, ["so big it was first mistaken for a bacterium (2003)"], R * 2 + sz(250 * nm) + 1.2, 2.2); }
}

// ---------- bacteria hall (E. coli is here too) ------------------------------------------
const cellMat = (col, op = 0.35) => new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, roughness: 0.5 });
function cytoplasm(g, n, within, col = 0x9b59b6, r = sz(REAL.ribosome) / 2) {   // ribosome-like speckle inside a shape
  const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(r, 0), M(col, { flatShading: true }), n), o = new THREE.Object3D(); let k = 0, tries = 0;
  while (k < n && tries++ < n * 20) { const v = within(); if (!v) continue; o.position.copy(v); o.updateMatrix(); im.setMatrixAt(k++, o.matrix); }
  im.count = k; g.add(im); }
{
  // Staphylococcus aureus: 1 µm spheres in grape-like clusters
  { const g = new THREE.Group(), R = sz(0.5 * um);
    for (const [x, y, z] of [[0, 0, 0], [9.6, 0.5, 2], [4.5, 1, 8.4], [-5, 0.3, 7.5], [4, 8.6, 3], [-4, 8, -2], [8, 7, -5]]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), cellMat(0xf4d03f, 0.55)); c.position.set(x, y, z); g.add(c);
      cytoplasm(g, 400, () => { const v = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(R * 0.4); return v.length() < R * 0.9 ? v.add(c.position) : null; }, 0xb7950b); }
    g.position.y = R - 0.3; exhibit(g, 40, -132, "Staphylococcus aureus", 1 * um, ["round cells that cluster like grapes · a common skin bacterium"], 22, 3); }
  // Mycoplasma: among the smallest cells known, ~0.3 µm, no cell wall
  { const g = new THREE.Group(), R = sz(0.15 * um);
    const c = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 18), cellMat(0xa9dfbf, 0.5)); c.scale.set(1.25, 1, 1); g.add(c);
    cytoplasm(g, 120, () => { const v = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(R * 0.35); return v.length() < R * 0.85 ? v : null; });
    g.position.y = R * 0.9; exhibit(g, 12, -130, "Mycoplasma", 0.3 * um, ["one of the smallest cells: ~500 genes, no wall · a virus-scale cell"], 4.6, 0.8); }
  // Vibrio cholerae: a curved rod with one polar flagellum
  { const g = new THREE.Group(), L = sz(2 * um), r = sz(0.25 * um), pts = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20 - 0.5; pts.push(new THREE.Vector3(u * L, -Math.cos(u * 2.2) * 4 + 4, 0)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 24, false), cellMat(0x76d7c4, 0.45)));
    const fl = []; for (let i = 0; i <= 120; i++) { const u = i / 120; fl.push(new THREE.Vector3(L / 2 + u * 50, pts.at(-1).y + Math.sin(u * 30) * 1.5 * Math.min(1, u * 5), Math.cos(u * 30) * 1.5 * Math.min(1, u * 5))); }
    const flag = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fl), 300, sz(REAL.flagellumD) / 2, 5), M(0xd8e8c8, { clippingPlanes: ABOVE_GLASS })); flag.userData.dynamic = true; g.add(flag);
    animate.push(Treal => { flag.rotation.x += Treal * 1000 * 6.283; });     // its sodium-driven motor turns up to ~1,700 Hz
    g.position.y = 2.2; exhibit(g, 22, -170, "Vibrio cholerae", 2 * um, ["comma-shaped · one whip-like flagellum, one of the fastest swimmers"], 18, 3); }
  // Caulobacter crescentus: a crescent on a thin stalk with a sticky holdfast
  { const g = new THREE.Group(), L = sz(1.8 * um), r = sz(0.3 * um), pts = [];
    for (let i = 0; i <= 20; i++) { const u = i / 20 - 0.5; pts.push(new THREE.Vector3(u * L, Math.cos(u * 2.6) * -3, 0)); }
    const body = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, r, 24, false), cellMat(0xa569bd, 0.45)); body.position.y = 14; g.add(body);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.05 * um), sz(0.05 * um), 14, 8), M(0x8e44ad)); stalk.position.set(-L / 2, 7, 0); g.add(stalk);
    const hold = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), M(0x6c3483)); hold.position.set(-L / 2, 0.3, 0); g.add(hold);
    exhibit(g, 55, -165, "Caulobacter crescentus", 1.8 * um, ["a crescent on a stalk, glued down by its holdfast"], 26, 3); }
}

// ---------- archaea hall ------------------------------------------------------------------
{
  // Haloquadratum walsbyi: flat square cells, 2-5 µm on a side, ~0.1-0.2 µm thick, full of gas vesicles
  { const g = new THREE.Group();
    for (const [x, z, s2] of [[0, 0, 25], [26, 3, 25], [13, -24, 22]]) {
      const sq = new THREE.Mesh(new THREE.BoxGeometry(s2, sz(0.15 * um), s2), cellMat(0xf5cba7, 0.5)); sq.position.set(x, 0, z); g.add(sq);
      const gv = new THREE.InstancedMesh(new THREE.CapsuleGeometry(sz(0.06 * um), sz(0.25 * um), 4, 8), M(0xfdfefe, { emissive: 0x333333 }), 90), o = new THREE.Object3D();
      for (let i = 0; i < 90; i++) { o.position.set(x + rr(-s2 / 2.4, s2 / 2.4), 0, z + rr(-s2 / 2.4, s2 / 2.4)); o.rotation.set(0, rnd() * 6, Math.PI / 2); o.updateMatrix(); gv.setMatrixAt(i, o.matrix); }
      g.add(gv); }
    g.position.y = 0.7; g.rotation.z = 0;      // lying flat on the glass
    exhibit(g, -45, -140, "Haloquadratum walsbyi", 2.5 * um, ["square, flat archaea from salt brines -- 25 m across, 1.5 m thin here",
      "the white grains are gas vesicles that float them to the light"], 16, 3); }
  // Methanocaldococcus jannaschii: a deep-sea vent coccus with tufts of archaella
  { const g = new THREE.Group(), R = sz(0.75 * um);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), cellMat(0xeb984e, 0.5)));
    cytoplasm(g, 600, () => { const v = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(R * 0.4); return v.length() < R * 0.9 ? v : null; }, 0xa04000);
    const arch = new THREE.Group(); arch.userData.dynamic = true; g.add(arch);
    for (let i = 0; i < 20; i++) { const d = new THREE.Vector3(1, rr(-0.25, 0.25), rr(-0.25, 0.25)).normalize(), pts = [];
      for (let j = 0; j <= 40; j++) { const u = j / 40; pts.push(d.clone().multiplyScalar(R + u * 35).add(new THREE.Vector3(0, Math.sin(u * 14 + i) * 1.2, Math.cos(u * 14 + i) * 1.2))); }
      arch.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, sz(6 * nm), 4), M(0xf0b27a, { clippingPlanes: ABOVE_GLASS }))); }
    animate.push(Treal => { arch.rotation.x += Treal * 30 * 6.283; });          // archaella rotate like flagella
    g.position.y = R - 0.4; exhibit(g, -30, -175, "Methanocaldococcus jannaschii", 1.5 * um, ["lives at 85 °C in deep-sea vents, makes methane",
      "its tuft of archaella spins like a propeller (different machinery from bacteria)"], 2 * R + 10, 3); }
  // Sulfolobus: a lobed, irregular coccus from hot acid springs
  { const R = sz(0.5 * um), geo = new THREE.IcosahedronGeometry(R, 4), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), k = 1 + 0.18 * Math.sin(v.x * 0.6) * Math.cos(v.y * 0.5) + 0.12 * Math.sin(v.z * 0.8);
      v.multiplyScalar(k); p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals(); const c = new THREE.Mesh(geo, cellMat(0xdc7633, 0.55)); c.position.y = R * 0.92;
    exhibit(c, -55, -195, "Sulfolobus", 1 * um, ["thrives in hot acid springs (80 °C, pH 2)"], 2 * R + 6, 2.5); }
  // Ignicoccus hospitalis carrying Nanoarchaeum equitans, one of the smallest cells
  { const g = new THREE.Group(), R = sz(1 * um);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), cellMat(0xf8c471, 0.4)));
    for (let i = 0; i < 5; i++) { const d = new THREE.Vector3(gauss(), Math.abs(gauss()), gauss()).normalize(), n = new THREE.Mesh(new THREE.SphereGeometry(sz(0.2 * um), 20, 14), cellMat(0xca6f1e, 0.8));
      n.position.copy(d).multiplyScalar(R + sz(0.18 * um)); g.add(n); }
    g.position.y = R - 0.5; exhibit(g, -15, -150, "Ignicoccus with Nanoarchaeum", 2 * um, ["the little cells are Nanoarchaeum equitans, 0.4 µm → 4 m:",
      "too small to live alone, it rides on its host"], 2 * R + 8, 3); }
}

// ---------- eukaryotes hall (red blood cells, the muscle fibre and the animal cell are here) --
const chlamyFlagella = [];
{
  // yeast: a 5 µm budding cell with nucleus, vacuole and a bud
  { const g = new THREE.Group(), R = sz(2.5 * um);
    const c = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), cellMat(0xf9e79f, 0.3)); c.scale.set(1.15, 1, 1); g.add(c);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(R * 0.5, 32, 24), cellMat(0xf9e79f, 0.35)); bud.position.set(R * 1.45, R * 0.15, 0); g.add(bud);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(R * 0.32, 24, 16), M(0x6a4c93)); nuc.position.set(-R * 0.25, R * 0.15, 0); g.add(nuc);
    const vac = new THREE.Mesh(new THREE.SphereGeometry(R * 0.4, 24, 16), cellMat(0x85c1e9, 0.5)); vac.position.set(R * 0.3, -R * 0.2, R * 0.2); g.add(vac);
    g.position.y = R * 0.95; exhibit(g, -50, -255, "baker's yeast", 5 * um, ["a single-celled fungus, budding off a daughter · nucleus purple, vacuole blue"], 2 * R + 14, 5); }
  // Chlamydomonas: a 10 µm green alga that swims with two flagella
  { const g = new THREE.Group(), R = sz(5 * um);
    const c = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), cellMat(0xa9dfbf, 0.3)); c.scale.set(0.85, 1, 0.85); g.add(c);
    const chl = new THREE.Mesh(new THREE.SphereGeometry(R * 0.82, 40, 24, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), M(0x27ae60, { side: THREE.DoubleSide }));
    chl.scale.set(0.85, 1, 0.85); g.add(chl);                                                   // the cup-shaped chloroplast
    const eye = new THREE.Mesh(new THREE.SphereGeometry(R * 0.08, 12, 8), M(0xe74c3c, { emissive: 0x6e0000 })); eye.position.set(R * 0.8, R * 0.1, 0); g.add(eye);
    for (const sd of [-1, 1]) { const f = new THREE.Group(); f.userData.dynamic = true; f.position.set(0, R * 0.98, 0); g.add(f);
      const pts = []; for (let j = 0; j <= 30; j++) { const u = j / 30; pts.push(new THREE.Vector3(sd * Math.sin(u * 1.4) * 60, Math.cos(u * 1.4) * 60 - 0, 0)); }
      f.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, sz(0.12 * um), 6), M(0xd5f5e3)));
      chlamyFlagella.push({ f, sd }); }
    animate.push(Treal => { chlamyT += Treal; const ph = chlamyT * 50 * 6.283;            // breaststroke at ~50 Hz
      for (const { f, sd } of chlamyFlagella) f.rotation.z = sd * (-0.9 + 0.9 * Math.sin(ph)); });
    g.position.y = R * 0.95; exhibit(g, 40, -240, "Chlamydomonas (green alga)", 10 * um, ["swims by breaststroke with two flagella, ~50 beats a second",
      "red eyespot steers it toward light · green chloroplast"], 2 * R + 80, 9); }
}
let chlamyT = 0;
label(["the animal cell (right), red blood cells, and a muscle fibre with its nerve (left) are in this hall"],
  new THREE.Vector3(0, 6, -232), 2.5);

// ==========================================================================================
//  THE PARK: paths, concession stands, benches and lamps on the slide. These are human-sized,
//  so they are giants of the nanoworld: a 3 m kiosk would really be 300 nm across.
// ==========================================================================================
const stoneTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#bfae8c"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "255,250,240" : "120,105,85"},${rr(0.05, 0.18)})`;
    g.beginPath(); g.arc(rnd() * 256, rnd() * 256, rr(0.5, 2.2), 0, 6.3); g.fill(); }
  g.strokeStyle = "rgba(90,80,65,.25)"; g.lineWidth = 2;
  for (let y = 0; y < 256; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
const pathMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: 0xd8c9a8, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
const PATHS = [];                                        // [points, width]
function path(pts, w = 2.2) {                            // a flat paved ribbon along a polyline
  const P = pts.map(([x, z]) => new THREE.Vector2(x, z)), pos = [], uv = [], idx = [];
  let run = 0;
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], t = b.clone().sub(a).normalize(), n = new THREE.Vector2(-t.y, t.x);
    if (i) run += p.distanceTo(P[i - 1]);
    pos.push(p.x + n.x * w / 2, 0.03, p.y + n.y * w / 2, p.x - n.x * w / 2, 0.03, p.y - n.y * w / 2);   // 3 cm up: a real gap, not just polygonOffset (which a log depth buffer can defeat on some PC GPUs)
    uv.push(0, run / w, 1, run / w);
    if (i) { const k = 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, pathMat)); PATHS.push([P, w]); }
const curve = (pts, n = 6) => { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  return c.getPoints(pts.length * n).map(v => [v.x, v.z]); };
// the avenue, with the ruler running along its left edge, and the entrance plaza
const AVX = 1.2;
path([[AVX, 9], [AVX, -645]], 5);
{ const plaza = new THREE.Mesh(new THREE.CircleGeometry(13, 64).rotateX(-Math.PI / 2), pathMat); plaza.position.set(AVX, 0.02, 1); scene.add(plaza); }
// branch paths to every exhibit
path([[3.7, -12.4], [12, -12.4]], 1.8);                                   // molecules
path([[-1.3, -13.6], [-13.5, -13.6]], 1.8);                               // proteins: plinth row
path(curve([[-1.3, -20], [-9, -22.2], [-25, -22.4]]), 1.8);                // kinesin & dynein
path([[-1.3, -42], [-5.4, -44], [-5.4, -69]], 1.8);                        // the sarcomere
path([[3.7, -23.6], [16, -23.6]], 1.8);                                   // materials table
path([[3.7, -36.5], [32, -36.5]], 1.8);                                   // light
path([[3.7, -50.5], [15.5, -50.5]], 1.8);                                 // the chip
path([[3.7, -84], [8, -84]], 2.2);                                        // the CD
path(curve([[-1.3, -82], [-5.5, -86], [-9, -90], [-12.5, -94], [-16, -98], [-21, -102.5], [-27, -107.5], [-34, -100], [-34, -90], [-25, -85.5], [-1.3, -80]]), 2); // viruses
path(curve([[3.7, -128], [12, -133.5], [28, -138], [42, -142], [56, -156], [44, -177], [24, -179], [3.7, -174]]), 2.6);  // bacteria
path(curve([[-1.3, -136], [-15, -158], [-36, -158], [-62, -152], [-66, -192], [-44, -190], [-28, -186], [-1.3, -184]]), 2.6); // archaea
for (const pts of [[[-1.3, -258], [-33, -258]], [[3.7, -244], [22, -244]], [[3.7, -318], [44, -318]], [[-1.3, -352], [-58, -352]],
                   [[3.7, -470], [64, -470]], [[3.7, -622], [96, -622]], [[-1.3, -642], [-150, -680]]]) path(pts, 3);   // the big ones

// concession stands between the halls
function kiosk(x, z, name, menu, col) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = x > AVX ? -Math.PI / 2 : Math.PI / 2; scene.add(g);  // face the avenue
  const wood = M(0x8b5e3c), white = M(0xf4f1ea);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1.05, 0.7), wood); counter.position.set(0, 0.525, 0.65); g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.06, 0.8), white); top.position.set(0, 1.08, 0.65); g.add(top);
  const back = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 0.12), white); back.position.set(0, 1.3, -0.6); g.add(back);
  for (const sx of [-1.45, 1.45]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 1.3), white); side.position.set(sx, 1.3, 0); g.add(side);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), wood); post.position.set(sx, 1.3, 1.0); g.add(post); }
  // striped awning
  const c = document.createElement("canvas"); c.width = 256; c.height = 64; const cg = c.getContext("2d");
  for (let i = 0; i < 8; i++) { cg.fillStyle = i % 2 ? "#ffffff" : col; cg.fillRect(i * 32, 0, 32, 64); }
  const at = new THREE.CanvasTexture(c); at.colorSpace = THREE.SRGBColorSpace;
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 1.5), new THREE.MeshStandardMaterial({ map: at, side: THREE.DoubleSide }));
  awning.position.set(0, 2.75, 0.45); awning.rotation.x = -Math.PI / 2 + 0.35; g.add(awning);
  // the sign and the menu, painted on boards facing out
  const board = (w, h, lines, bg, fg, px) => { const cv = document.createElement("canvas"); cv.width = 512; cv.height = Math.round(512 * h / w);
    const b = cv.getContext("2d"); b.fillStyle = bg; b.fillRect(0, 0, cv.width, cv.height); b.fillStyle = fg; b.textAlign = "center";
    lines.forEach((l, i) => { b.font = `${i ? 400 : 700} ${i ? px * 0.62 : px}px -apple-system, Helvetica, sans-serif`;
      b.fillText(l, cv.width / 2, px * 1.05 + i * px * 0.82 + (i ? px * 0.2 : 0)); });
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, emissive: 0x222222 })); };
  const sign = board(3, 0.6, [name], col, "#ffffff", 70); sign.position.set(0, 3.45, 1.12); g.add(sign);
  const m = board(1.4, 1.0, ["MENU", ...menu], "#2c3e50", "#f7f2e0", 52); m.position.set(0.55, 1.75, -0.53); g.add(m);
  for (let i = 0; i < 4; i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 10), M([0xe74c3c, 0xf1c40f, 0x3498db, 0x2ecc71][i]));
    cup.position.set(-1.1 + i * 0.22, 1.17, 0.7); g.add(cup); }
  return g;
}
const STANDS = [
  [8.5, 9, "Photon Popcorn", ["popped by light: 4–7 m waves", "small · medium · ×10⁷"], "#e67e22"],
  [-4.2, -30, "ATP Energy Drinks", ["one ATP: 1.4 cm here", "adenosine · triphosphate"], "#c0392b"],
  [5.6, -70, "Ribosome Rolls", ["made fresh, 20 amino", "acids per second"], "#8e44ad"],
  [-4.2, -118, "Virus-Free Fries", ["guaranteed under", "1 virus per serving"], "#16a085"],
  [5.6, -205, "Hot Springs Cocoa", ["archaea's favourite:", "served at 85 °C"], "#d35400"],
  [-4.2, -222, "Mitochondria Mocha", ["the powerhouse", "of the café"], "#6e2c00"],
  [5.6, -400, "Nucleus Noodles", ["with chromatin threads", "(2 m of DNA per bowl)"], "#2980b9"],
  [-4.2, -540, "Proton Pretzels", ["salted with H⁺", "pumped fresh"], "#b7950b"],
];
for (const [x, z, n, menu, col] of STANDS) kiosk(x, z, n, menu, col);
label(["a concession stand: 3 m here", "really 300 nm -- the size of a large virus",
       "this whole park is furniture for giants of the nanoworld"], new THREE.Vector3(8.5, 4.4, 12.5), 0.9);

// benches, bins and lamp posts along the avenue
{
  const benchG = new THREE.Group(), wood = M(0x8b5e3c), iron = M(0x2c3e50);
  for (let i = 0; i < 3; i++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.12), wood); plank.position.set(0, 0.45, -0.15 + i * 0.15); benchG.add(plank); }
  for (let i = 0; i < 2; i++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.04), wood); plank.position.set(0, 0.62 + i * 0.16, -0.24); plank.rotation.x = -0.15; benchG.add(plank); }
  for (const sx of [-0.8, 0.8]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.45), iron); leg.position.set(sx, 0.225, 0); benchG.add(leg); }
  const lamp = new THREE.Group();
  const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 4, 8), iron); lp.position.y = 2; lamp.add(lp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff6d5, emissive: 0xffe9a8, emissiveIntensity: 0.9 }));
  bulb.position.y = 4.1; lamp.add(bulb);
  const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.8, 12), M(0x27ae60)); bin.position.y = 0.4;
  for (let z = -6; z > -640; z -= 22) {
    for (const side of [-1, 1]) {
      const x = AVX + side * 3.1;
      if (STANDS.some(s => Math.abs(s[1] - z) < 5)) continue;
      const l = lamp.clone(); l.position.set(AVX + side * 2.75, 0, z); scene.add(l);
      if (((z / 22) | 0) % 2 === (side > 0 ? 0 : 1)) { const b = benchG.clone(); b.position.set(x + side * 0.4, 0, z - 6);
        b.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(b);
        const bn = bin.clone(); bn.position.set(x + side * 0.4, 0.4, z - 7.4); scene.add(bn); }
    }
  }
  label(["a bench: 2 m here = 200 nm real", "a lamp post: 4 m here = 400 nm real -- about the wavelength of violet light"],
    new THREE.Vector3(AVX - 3.5, 2.6, -12), 0.6);
}

// signposts at the branch paths, pointing the way and giving the distance in real units
function signpost(x, z, entries) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.2, 8), M(0x5d4037)); post.position.y = 1.6; g.add(post);
  label(entries.map(([n, dz]) => `${n}  ${fmt(Math.abs(dz))} (${fmtReal(Math.abs(dz) / S)})`), new THREE.Vector3(x, 2.9, z + 0.08), 0.55, "banner");
}
for (const h of HALLS) if (h.id !== "entrance") {
  const z = h.z0 + 1, side = h.side === 0 ? 1 : h.side;
  signpost(AVX + side * 3.3, z, [[`${side < 0 ? "◀" : "▶"} ${h.name}`, 0]]);
}
{ // the map board at the plaza
  const cv = document.createElement("canvas"); cv.width = 768; cv.height = 1024; const g = cv.getContext("2d");
  g.fillStyle = "#f4efe2"; g.fillRect(0, 0, 768, 1024); g.fillStyle = "#2c3e50"; g.font = "700 40px -apple-system, Helvetica";
  g.fillText("Park map  ·  ×10,000,000", 30, 60); g.font = "400 22px -apple-system, Helvetica";
  g.fillText("1 m on the map's ground = 100 nm real", 30, 92);
  const mx = x => 384 + x * 1.05, mz = z => 130 - z * 1.38;
  g.fillStyle = "#cfc6b4"; g.fillRect(mx(-1.3), mz(9), 5 * 1.05, mz(-645) - mz(9));
  for (const h of HALLS) { if (h.id === "entrance") continue;
    const cx = h.cx ?? (h.side === 0 ? 0 : h.side * (2 + h.w / 2));
    g.fillStyle = "#" + h.col.toString(16).padStart(6, "0") + "88"; g.fillRect(mx(cx - h.w / 2), mz(h.z0), h.w * 1.05, (h.z0 - h.z1) * 1.38);
    g.fillStyle = "#1b2631"; g.font = "600 22px -apple-system, Helvetica"; g.fillText(h.name, mx(cx - h.w / 2) + 4, mz(h.z0) + 24); }
  g.fillStyle = "#c0392b"; g.beginPath(); g.arc(mx(AVX), mz(4), 9, 0, 6.3); g.fill(); g.fillText("you are here", mx(AVX) + 14, mz(4) + 8);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), new THREE.MeshStandardMaterial({ map: t, emissive: 0x333333 }));
  board.position.set(-6, 1.7, 6.5); board.rotation.y = 0.6; scene.add(board);
  for (const sx of [-0.7, 0.7]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.7, 6), M(0x5d4037));
    leg.position.set(-6 + Math.cos(0.6) * sx, 1.35, 6.5 - Math.sin(0.6) * sx); scene.add(leg); }
}

// ==========================================================================================
//  MORE EXHIBITS: filling the halls. Sizes from structures in the Protein Data Bank, virus
//  measurements from cryo-electron microscopy, and atomic radii from Bondi (1964).
// ==========================================================================================
const lumpy = (rNm, col, k = 0.18, detail = 3) => {           // a globular protein: a bumpy ball of the right size
  const geo = new THREE.IcosahedronGeometry(sz(rNm * nm), detail), p = geo.attributes.position;
  const ph = rnd() * 9;
  for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i), u = v.clone().normalize();
    v.multiplyScalar(1 + k * Math.sin(u.x * 5 + ph) * Math.cos(u.y * 4 + ph) * Math.sin(u.z * 6)); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, M(col, { flatShading: true })); };
const onPlinth = (obj, x, z, name, realM, extra, top = 1.0, w = 0.5) => {
  plinth(x, z, top, w); obj.position.y += top; return exhibit(obj, x, z, name, realM, extra, top + 0.55 + Math.max(0.1, sz(realM) * 0.9), 0.4); };

// ---------- proteins: two more rows and the long ones ------------------------------------
{
  const row1 = -31, row2 = -39, xs = i => -12.5 - i * 2.1;
  const P = [];
  P.push(["myoglobin", 4.5, ["holds oxygen in muscle: one haem, one iron"], () => { const g = new THREE.Group(); const b = lumpy(2.2, 0xcb4335); b.position.y = sz(2.4 * nm); g.add(b); return g; }]);
  P.push(["lysozyme", 4.0, ["in tears and egg white: cuts bacterial walls"], () => { const g = new THREE.Group(); const b = lumpy(2.0, 0xf1948a); b.scale.set(1.3, 1, 1); b.position.y = sz(2 * nm); g.add(b); return g; }]);
  P.push(["insulin (hexamer)", 5.0, ["stored as six insulins around two zinc ions"], () => { const g = new THREE.Group();
    for (let i = 0; i < 6; i++) { const b = lumpy(1.1, 0x5dade2, 0.12, 2), a = i / 6 * 6.283; b.position.set(Math.cos(a) * sz(1.4 * nm), sz(2.5 * nm), Math.sin(a) * sz(1.4 * nm)); g.add(b); }
    for (const y of [-1, 1]) { const zn = new THREE.Mesh(new THREE.SphereGeometry(sz(0.14 * nm), 10, 8), M(0x95a5a6, { metalness: 0.8 })); zn.position.y = sz(2.5 * nm) + y * sz(0.5 * nm); g.add(zn); } return g; }]);
  P.push(["ferritin", 12, ["a hollow shell of 24 proteins storing up to 4,500 iron atoms"], () => { const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(6 * nm), 2), new THREE.MeshStandardMaterial({ color: 0xa04000, transparent: true, opacity: 0.45, flatShading: true }));
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(3.8 * nm), 2), M(0x6e2c00)); shell.position.y = core.position.y = sz(6 * nm); g.add(shell, core); return g; }]);
  P.push(["nucleosome", 11, ["DNA wound 1.65 times round 8 histones: how 2 m of DNA fits in a nucleus"], () => { const g = new THREE.Group(), y0 = sz(5.5 * nm);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(sz(3.5 * nm), sz(3.5 * nm), sz(5.5 * nm), 24), M(0x5b2c6f)); core.rotation.x = Math.PI / 2; core.position.y = y0; g.add(core);
    const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120, a = u * 1.65 * 6.283; pts.push(new THREE.Vector3(Math.cos(a) * sz(4.6 * nm), y0 + Math.sin(a) * sz(4.6 * nm), (u - 0.5) * sz(5 * nm))); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, sz(1 * nm), 8), M(0xf0a030))); return g; }]);
  P.push(["GroEL chaperonin", 14, ["a folding chamber: two rings of 7, a protein refolds inside"], () => { const g = new THREE.Group();
    for (const [y, c] of [[sz(3.5 * nm), 0x1f618d], [sz(10.5 * nm), 0x2e86c1]]) for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, b = lumpy(2.0, c, 0.1, 2);
      b.scale.set(1, 1.7, 1); b.position.set(Math.cos(a) * sz(5 * nm), y, Math.sin(a) * sz(5 * nm)); g.add(b); } return g; }]);
  P.push(["proteasome", 15, ["the shredder: a barrel of 28 subunits that chops up old proteins"], () => { const g = new THREE.Group();
    for (let r = 0; r < 4; r++) for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283 + r * 0.2, b = lumpy(1.3, r % 3 ? 0xd4ac0d : 0x7d6608, 0.1, 2);
      b.position.set(Math.cos(a) * sz(4.5 * nm), sz((1.6 + r * 3.2) * nm), Math.sin(a) * sz(4.5 * nm)); g.add(b); } return g; }]);
  P.push(["RNA polymerase", 15, ["copies DNA into RNA, ~40 letters a second"], () => { const g = new THREE.Group();
    const a = lumpy(6, 0x16a085), b = lumpy(5, 0x48c9b0); a.position.set(-sz(2 * nm), sz(6 * nm), 0); b.position.set(sz(3 * nm), sz(6 * nm), 0); g.add(a, b);
    const dna_ = new THREE.Mesh(new THREE.CylinderGeometry(sz(1 * nm), sz(1 * nm), sz(30 * nm), 10), M(0xf0a030)); dna_.rotation.z = Math.PI / 2; dna_.position.y = sz(6 * nm); g.add(dna_); return g; }]);
  P.push(["clathrin triskelion", 48, ["three legs; many of them lock into cages (see the cage nearby)"], () => { const g = new THREE.Group();
    for (let i = 0; i < 3; i++) { const a = i / 3 * 6.283, pts = [new THREE.Vector3(0, sz(4 * nm), 0), new THREE.Vector3(Math.cos(a) * sz(12 * nm), sz(2 * nm), Math.sin(a) * sz(12 * nm)),
      new THREE.Vector3(Math.cos(a + 0.5) * sz(24 * nm), sz(0.8 * nm), Math.sin(a + 0.5) * sz(24 * nm))];
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, sz(1.2 * nm), 6), M(0xe59866))); } return g; }]);
  P.forEach(([name, size, extra, make], i) => onPlinth(make(), xs(i), row1, name, size * nm, extra, 1.0, 0.55));
  // row two: membrane machines, standing in patches of membrane
  const memPatch = (w = 0.3) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, sz(5 * nm), w), new THREE.MeshStandardMaterial({ color: 0xf5e6a8, transparent: true, opacity: 0.55 }));
    m.position.y = sz(2.5 * nm); return m; };
  { const g = new THREE.Group(); g.add(memPatch());                                   // aquaporin: four channels, water in single file
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283 + 0.785, b = lumpy(1.6, 0x3498db, 0.12, 2); b.scale.set(1, 2, 1);
      b.position.set(Math.cos(a) * sz(1.8 * nm), sz(2.5 * nm), Math.sin(a) * sz(1.8 * nm)); g.add(b);
      for (let k = 0; k < 6; k++) { const w = water(); w.position.set(Math.cos(a) * sz(1.8 * nm) * 0.55, sz((0.2 + k * 0.85) * nm), Math.sin(a) * sz(1.8 * nm) * 0.55); g.add(w); } }
    onPlinth(g, xs(0), row2, "aquaporin", 6.5 * nm, ["water channels: ~3 billion molecules a second pass in single file"], 1.0, 0.55); }
  { const g = new THREE.Group(); g.add(memPatch());                                   // potassium channel with K+ ions in its filter
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283, b = lumpy(1.5, 0x8e44ad, 0.1, 2); b.scale.set(1, 2.2, 1); b.position.set(Math.cos(a) * sz(1.6 * nm), sz(2.6 * nm), Math.sin(a) * sz(1.6 * nm)); g.add(b); }
    for (let k = 0; k < 3; k++) { const ion = new THREE.Mesh(new THREE.SphereGeometry(sz(0.138 * nm), 10, 8), M(0xd35400, { emissive: 0x401000 })); ion.position.y = sz((2.2 + k * 0.7) * nm); g.add(ion); }
    onPlinth(g, xs(1), row2, "potassium channel", 6 * nm, ["lets K⁺ through but not the smaller Na⁺ -- the basis of every nerve impulse"], 1.0, 0.55); }
  { const g = new THREE.Group();                                                     // clathrin cage: a soccer-ball lattice
    const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(37 * nm), 1), M(0xe59866, { wireframe: true }));
    cage.position.y = sz(37 * nm) + 0.02; g.add(cage);
    const ves = new THREE.Mesh(new THREE.SphereGeometry(sz(22 * nm), 24, 18), new THREE.MeshStandardMaterial({ color: 0xf5e6a8, transparent: true, opacity: 0.5 })); ves.position.y = cage.position.y; g.add(ves);
    onPlinth(g, xs(2), row2, "clathrin-coated vesicle", 75 * nm, ["triskelions locked into a cage around a bubble of membrane"], 0.5, 1.0); }
  { const g = new THREE.Group();                                                     // fibrinogen: the clotting rod, 45 nm, three globules
    for (const [x, r] of [[-22.5, 3.5], [0, 2.6], [22.5, 3.5]]) { const b = lumpy(r, 0xc0392b, 0.1, 2); b.position.set(sz(x * nm), sz(4 * nm), 0); g.add(b); }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.8 * nm), sz(0.8 * nm), sz(45 * nm), 6), M(0xe74c3c)); rod.rotation.z = Math.PI / 2; rod.position.y = sz(4 * nm); g.add(rod);
    onPlinth(g, xs(3) - 0.4, row2, "fibrinogen", 45 * nm, ["in blood plasma: knits into fibrin to make a clot"], 1.0, 0.6); }
  // the long ones: collagen and titin, laid out at their full length
  { const g = new THREE.Group(), L = sz(300 * nm);                                    // collagen: three chains wound round each other
    for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 600; i++) { const u = i / 600, a = u * L / sz(8.6 * nm) * 6.283 + k * 2.094;
      pts.push(new THREE.Vector3(u * L - L / 2, 1.0 + Math.cos(a) * sz(0.45 * nm), Math.sin(a) * sz(0.45 * nm))); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1800, sz(0.32 * nm), 5), M([0xfdebd0, 0xf8c471, 0xf5b041][k]))); }
    for (const x of [-1.3, 0, 1.3]) plinth(-22 + x, -48, 0.95, 0.3);
    exhibit(g, -22, -48, "collagen", 300 * nm, ["the most abundant protein in you: three chains, 1.5 nm thick, 300 nm long",
      "bundled by the thousand into tendons and skin"], 1.6, 0.5); }
  { const g = new THREE.Group(), n = 120;                                              // titin: a chain of ~300 domains; 1 µm long in full
    for (let i = 0; i < n; i++) { const b = lumpy(2.2, i % 9 ? 0x76448a : 0xd2b4de, 0.08, 1); b.scale.set(1.6, 1, 1); b.position.set(i * sz(4.4 * nm) - n * sz(4.4 * nm) / 2, 1.0, Math.sin(i * 0.3) * 0.04); g.add(b); }
    for (const x of [-2.5, 0, 2.5]) plinth(-22 + x, -58, 0.95, 0.3);
    exhibit(g, -22, -58, "titin (a stretch of it)", 1 * um, ["the largest protein: a 1 µm spring in muscle, ~34,000 amino acids",
      `${n} of its ~300 domains shown (${fmt(n * sz(4.4 * nm))} of its 10 m)`], 1.6, 0.5); }
}

// ---------- viruses: a second row and two giants -----------------------------------------
{
  const zr = -115.5, xs = i => -4.5 - i * 2.6;
  const capsid = (dNm, col, bumps = 60) => { const g = new THREE.Group(), R = sz(dNm / 2 * nm);
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1), M(col, { flatShading: true })));
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(R * 0.13, 6, 5), M(col), bumps), o = new THREE.Object3D();
    for (let i = 0; i < bumps; i++) { const y = 1 - 2 * (i + 0.5) / bumps, rad = Math.sqrt(1 - y * y), a = i * 2.39996;
      o.position.set(Math.cos(a) * rad * R, y * R, Math.sin(a) * rad * R); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    g.add(im); return g; };
  const enveloped = (dNm, col, spikes, spikeNm, spikeCol) => { const g = new THREE.Group(), R = sz(dNm / 2 * nm);
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 3), M(col, { roughness: 0.8 })));
    const L = sz(spikeNm * nm), im = new THREE.InstancedMesh(new THREE.CylinderGeometry(L * 0.12, L * 0.18, L, 5), M(spikeCol), spikes), o = new THREE.Object3D();
    for (let i = 0; i < spikes; i++) { const y = 1 - 2 * (i + 0.5) / spikes, rad = Math.sqrt(1 - y * y), a = i * 2.39996, d = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); o.position.copy(d).multiplyScalar(R + L / 2); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }
    g.add(im); return g; };
  const lift = (g, dNm) => { g.position.y = sz(dNm / 2 * nm) + 0.02; return g; };
  const V = [
    ["MS2 phage", 27, ["infects E. coli; one of the simplest viruses: 4 genes"], () => lift(capsid(27, 0x85c1e9, 40), 27)],
    ["rhinovirus (common cold)", 30, ["over 100 kinds; why colds keep coming back"], () => lift(capsid(30, 0x76d7c4, 60), 30)],
    ["norovirus", 38, ["stomach bug: as few as 20 particles can infect"], () => lift(capsid(38, 0xf7dc6f, 90), 38)],
    ["hepatitis B virus", 42, ["a small DNA virus wrapped in an envelope"], () => lift(enveloped(42, 0xd7bde2, 60, 4, 0x7d3c98), 42)],
    ["Zika virus", 50, ["a smooth, tiled envelope of 180 proteins"], () => lift(capsid(50, 0xaed6f1, 180), 50)],
    ["human papillomavirus", 55, ["72 star-shaped capsomers; a vaccine now prevents most cervical cancer"], () => lift(capsid(55, 0xf5cba7, 72), 55)],
    ["rotavirus", 75, ["three shells, like a wheel (rota): spokes inside"], () => { const g = lift(capsid(75, 0xf0b27a, 132), 75);
      const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(30 * nm), 1), M(0xdc7633, { flatShading: true })); g.add(inner); return g; }],
    ["herpes simplex virus", 180, ["an icosahedral capsid inside a tegument, inside a spiky envelope"], () => { const g = new THREE.Group(), R = sz(90 * nm);
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 3), new THREE.MeshStandardMaterial({ color: 0xa3e4d7, transparent: true, opacity: 0.35, depthWrite: false })));
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(sz(62 * nm), 1), M(0x117864, { flatShading: true })));
      const sp = enveloped(180, 0xa3e4d7, 60, 12, 0x0e6655); sp.children[0].visible = false; g.add(sp); return lift(g, 180); }],
    ["rabies virus", 180, ["bullet-shaped: 75 nm wide, 180 nm long"], () => { const g = new THREE.Group(), r = sz(37 * nm), L = sz(140 * nm);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 24), M(0xd98880)); body.rotation.z = Math.PI / 2; g.add(body);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(0xd98880)); tip.rotation.z = -Math.PI / 2; tip.position.x = L / 2; g.add(tip);
      g.position.y = r + 0.02; return g; }],
    ["lambda phage", 210, ["infects E. coli; its flexible 150 nm tail hides its DNA"], () => { const g = new THREE.Group(), r = sz(30 * nm);
      const head_ = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M(0x95a5a6, { flatShading: true })); head_.position.y = sz(150 * nm) + r; g.add(head_);
      const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(new THREE.Vector3(Math.sin(u * 2) * 0.12, sz(150 * nm) * (1 - u), 0)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, sz(4.5 * nm), 6), M(0x7f8c8d))); return g; }],
  ];
  V.forEach(([name, d, extra, make], i) => onPlinth(make(), xs(i), zr, name, d * nm, extra, 0.8, 0.8));
  // Ebola: a filament ~80 nm wide and ~1 µm long, often curled like a shepherd's crook
  { const g = new THREE.Group(), pts = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60, L = sz(970 * nm); const x = u * L * 0.75, hook = u > 0.75 ? (u - 0.75) / 0.25 : 0;
      pts.push(new THREE.Vector3(x - (hook ? Math.sin(hook * Math.PI) * 1.5 : 0), sz(40 * nm) + Math.sin(hook * Math.PI) * 2.2, 0)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, sz(40 * nm), 16), M(0xec7063, { roughness: 0.6 })));
    exhibit(g, -36, -84, "Ebola virus", 970 * nm, ["a filament 80 nm wide and about 1 µm long, often curled like a crook"], 3.6, 1.0); }
  // Pandoravirus: an amphora-shaped giant ~1 µm long, with a pore at one end
  { const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(new THREE.Vector2(sz(250 * nm) * Math.sin(Math.PI * Math.pow(u, 0.8)) + 0.05, u * sz(1000 * nm))); }
    const amph = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M(0x873600, { roughness: 0.7 })); amph.rotation.z = Math.PI / 2;
    const g = new THREE.Group(); g.add(amph); amph.position.set(sz(500 * nm), sz(250 * nm), 0);
    exhibit(g, -44, -108, "Pandoravirus (giant virus)", 1 * um, ["bigger than many bacteria; ~2,500 genes, most unlike anything known"], 6.5, 1.4); }
}

// ---------- non-living: a periodic table of atoms, crystals, nanomaterials ----------------
{
  // atoms at their van der Waals radii (Bondi 1964), in their places in the periodic table
  const A = [["H", 1, 1, 120], ["He", 1, 18, 140], ["Li", 2, 1, 182], ["C", 2, 14, 170], ["N", 2, 15, 155], ["O", 2, 16, 152], ["F", 2, 17, 147], ["Ne", 2, 18, 154],
    ["Na", 3, 1, 227], ["Mg", 3, 2, 173], ["Si", 3, 14, 210], ["P", 3, 15, 180], ["S", 3, 16, 180], ["Cl", 3, 17, 175], ["Ar", 3, 18, 188],
    ["K", 4, 1, 275], ["Ni", 4, 10, 163], ["Cu", 4, 11, 140], ["Zn", 4, 12, 139], ["Ga", 4, 13, 187], ["As", 4, 15, 185], ["Se", 4, 16, 190], ["Br", 4, 17, 185], ["Kr", 4, 18, 202],
    ["Pd", 5, 10, 163], ["Ag", 5, 11, 172], ["Cd", 5, 12, 158], ["In", 5, 13, 193], ["Sn", 5, 14, 217], ["Te", 5, 16, 206], ["I", 5, 17, 198], ["Xe", 5, 18, 216],
    ["Pt", 6, 10, 175], ["Au", 6, 11, 166], ["Hg", 6, 12, 155], ["Tl", 6, 13, 196], ["Pb", 6, 14, 202], ["U", 7, 3, 186]];
  const board = new THREE.Group(); board.position.set(26, 0, -21); board.rotation.y = -Math.PI / 2; scene.add(board);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 0.03), M(0x1b2631)); back.position.set(0, 1.4, -0.02); board.add(back);
  for (const sx of [-0.9, 0.9]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), M(0x34495e)); leg.position.set(sx, 0.45, 0); board.add(leg); }
  const cell = 0.1;
  for (const [sym, per, grp, pm] of A) {
    const x = -0.9 + (grp - 0.5) * cell, y = 1.85 - (per - 0.5) * cell * 1.15;
    const tile = new THREE.Mesh(new THREE.BoxGeometry(cell * 0.92, cell * 1.05, 0.006), M(0x2e4053)); tile.position.set(x, y, 0); board.add(tile);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(sz(pm * 1e-12), 16, 12), M(sym === "Au" ? 0xd4ac0d : sym === "Cu" ? 0xb87333 : sym === "O" ? 0xd84a3a : sym === "C" ? 0x555555 : sym === "H" ? 0xffffff : 0xaeb6bf, { metalness: ["Au", "Cu", "Ag", "Pt", "Ni", "Pd", "Zn", "Cd", "Hg", "Sn", "Pb", "Tl", "In", "Ga", "U"].includes(sym) ? 0.7 : 0 }));
    ball.position.set(x, y + 0.012, 0.01); board.add(ball);
    const c = document.createElement("canvas"); c.width = 64; c.height = 32; const cg = c.getContext("2d"); cg.fillStyle = "#e8eef3"; cg.font = "700 22px -apple-system, Helvetica"; cg.fillText(sym, 4, 24);
    const t = new THREE.CanvasTexture(c); const lab = new THREE.Mesh(new THREE.PlaneGeometry(cell * 0.5, cell * 0.25), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    lab.position.set(x - cell * 0.18, y - cell * 0.33, 0.005); board.add(lab);
  }
  label(["a periodic table of real atoms", "each ball is its atom at ×10⁷: hydrogen 2.4 mm, xenon 4.3 mm across",
         "atoms barely grow down the table: uranium (92 protons) is about the size of chlorine"], new THREE.Vector3(26, 2.35, -21), 0.6);
  ladder.push({ name: "atoms (periodic table)", real: 0.3 * nm, x: 26, z: -21 });
}
{
  const zr = -42.5, xs = i => 18.5 + i * 2.2;
  const lattice = (a, basis, n, rNm, col, cut) => { const pts = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) for (const b of basis) {
      const v = new THREE.Vector3(i + b[0], j + b[1], k + b[2]).multiplyScalar(sz(a)); if (!cut || cut(v)) pts.push(v); }
    const g = new THREE.Group(); const at = atoms(pts, sz(rNm * nm), M(col)); at.position.set(-n * sz(a) / 2, 0.005, -n * sz(a) / 2); g.add(at); return [g, pts.length]; };
  const fccDiamond = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]];
  const items = [];
  { const [g, n] = lattice(0.357 * nm, fccDiamond, 5, 0.07, 0xd6eaf8); items.push([g, "diamond", 1.8 * nm, [`${n} carbon atoms, each bonded to four`]]); }
  { const [g, n] = lattice(0.543 * nm, fccDiamond, 4, 0.11, 0x7f8c8d); items.push([g, "silicon crystal", 2.2 * nm, [`${n} atoms: the crystal every chip is cut from`]]); }
  { const pts = [], a = 0.452 * nm, c = 0.736 * nm;                                  // ice Ih: oxygens on a hexagonal lattice
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 3; k++) for (const [bx, by, bz] of [[0, 0, 0.0625], [2 / 3, 1 / 3, 0.4375], [0, 0, 0.9375 - 0.5], [2 / 3, 1 / 3, 0.5625 + 0.375]]) {
      pts.push(new THREE.Vector3(sz((i + j / 2 + bx) * a), sz((k + bz) * c), sz((j + by) * a * 0.866))); }
    const g = new THREE.Group(); const at = atoms(pts, sz(0.15 * nm), M(0xaed6f1)); at.position.set(-sz(2 * a), 0.005, -sz(1.7 * a)); g.add(at);
    items.push([g, "ice", 2 * nm, ["water molecules locked in hexagons -- why snowflakes have six sides"]]); }
  { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.DodecahedronGeometry(sz(10 * nm), 0), M(0xd5d8dc, { metalness: 0.95, roughness: 0.15 })); p.position.y = sz(10 * nm); g.add(p);
    items.push([g, "silver nanoparticle", 20 * nm, ["kills microbes: used in wound dressings"]]); }
  { const g = new THREE.Group(); const r = new THREE.Mesh(new THREE.CapsuleGeometry(sz(7.5 * nm), sz(35 * nm), 8, 16), M(0xd4ac0d, { metalness: 0.9, roughness: 0.2 }));
    r.rotation.z = Math.PI / 2; r.position.y = sz(7.5 * nm); g.add(r); items.push([g, "gold nanorod", 50 * nm, ["its length tunes which colour of light it absorbs"]]); }
  { const g = new THREE.Group(); const p = lumpy(10, 0xfdfefe, 0.25, 1); p.position.y = sz(10 * nm); g.add(p);
    items.push([g, "titanium dioxide particle", 20 * nm, ["the white in paint and mineral sunscreen"]]); }
  { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.OctahedronGeometry(sz(2.5 * nm), 0), M(0xeaf2f8, { metalness: 0.2, roughness: 0.05 })); p.position.y = sz(2.5 * nm); g.add(p);
    items.push([g, "nanodiamond", 5 * nm, ["made in detonations; found in meteorites"]]); }
  { const g = new THREE.Group(); for (let i = 0; i < 60; i++) { const y = 1 - 2 * (i + 0.5) / 60, rad = Math.sqrt(1 - y * y), a = i * 2.39996, d = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
      const h = new THREE.Mesh(new THREE.SphereGeometry(sz(0.35 * nm), 8, 6), M(0xf0a030)); h.position.copy(d).multiplyScalar(sz(2.3 * nm)).add(new THREE.Vector3(0, sz(2.5 * nm), 0)); g.add(h); }
    const core = new THREE.Mesh(new THREE.SphereGeometry(sz(1.9 * nm), 16, 12), M(0xf9e79f, { transparent: true, opacity: 0.6 })); core.position.y = sz(2.5 * nm); g.add(core);
    items.push([g, "soap micelle", 5 * nm, ["oily tails hide inside, heads face the water: how soap lifts grease"]]); }
  items.forEach(([g, name, real, extra], i) => onPlinth(g, xs(i), zr, name, real, extra, 1.0, 0.55));
  // bigger nanomaterials, standing on the slide
  { const s2 = new THREE.Mesh(new THREE.SphereGeometry(sz(50 * nm), 32, 24), M(0xf2f3f4, { roughness: 0.2 })); s2.position.y = sz(50 * nm);
    exhibit(s2, 22, -27, "silica nanosphere", 100 * nm, ["glass beads: these stacked in order make opal's colours"], 1.8, 0.6); }
  { const g = new THREE.Group(), R = sz(50 * nm);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R, 40, 30, 0, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xf5e6a8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(R - sz(5 * nm), 40, 30, 0, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xf0a030, side: THREE.DoubleSide })));
    g.position.y = R; exhibit(g, 27, -27, "liposome", 100 * nm, ["a hollow bubble of membrane, cut open · mRNA vaccines ride in these"], 1.9, 0.6); }
  { const g = new THREE.Group(); let p = new THREE.Vector3(0, sz(15 * nm), 0);       // soot: 30 nm carbon spheres stuck in a chain
    for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(sz(15 * nm), 16, 12), M(0x1c1c1c, { roughness: 0.95 })); b.position.copy(p); g.add(b);
      p.add(new THREE.Vector3(gauss(), Math.abs(gauss()) * 0.5, gauss()).normalize().multiplyScalar(sz(26 * nm))); }
    exhibit(g, 33, -27, "a soot particle", 300 * nm, ["30 nm spheres of carbon stuck together: what's in smoke"], 2.6, 0.6); }
  { const shape = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; shape[i ? "lineTo" : "moveTo"](Math.cos(a) * 5, Math.sin(a) * 5); }
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: sz(50 * nm), bevelEnabled: false }), M(0xe8daef, { roughness: 0.6 }));
    plate.rotation.x = -Math.PI / 2; exhibit(plate, 45, -30, "a clay platelet (kaolinite)", 1 * um, ["a hexagonal mineral flake, 1 µm wide, 50 nm thick"], 3, 1.2); }
}

// ---------- more bacteria (on the ground) -------------------------------------------------
{
  // Streptococcus: 1 µm cocci in a chain
  { const g = new THREE.Group(), R = sz(0.5 * um);
    for (let i = 0; i < 8; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 18), cellMat(0xa9cce3, 0.55)); c.position.set(i * R * 1.85, R - 0.3, Math.sin(i * 0.7) * 3); g.add(c); }
    exhibit(g, 66, -133, "Streptococcus", 1 * um, ["round cells that divide in one direction, so they form chains · strep throat"], 14, 3); }
  // Bacillus subtilis forming a spore inside
  { const g = new THREE.Group(), L = sz(3 * um), r = sz(0.4 * um);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r, L - 2 * r, 12, 24), cellMat(0xd7bde2, 0.4)); body.rotation.z = Math.PI / 2; body.position.y = r - 0.3; g.add(body);
    const spore = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.6, r * 1.2, 8, 16), M(0x5b2c6f)); spore.rotation.z = Math.PI / 2; spore.position.set(L * 0.28, r - 0.3, 0); g.add(spore);
    exhibit(g, 84, -150, "Bacillus subtilis", 3 * um, ["a rod in the soil · the dark core is a spore that can survive for centuries"], 12, 3); }
  // Pelagibacter: tiny crescent, the most abundant cell in the oceans
  { const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16 - 0.5; pts.push(new THREE.Vector3(u * sz(0.8 * um), Math.cos(u * 3) * -1.2, 0)); }
    const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, sz(0.08 * um), 16, false), cellMat(0x48c9b0, 0.6)); c.position.y = sz(0.08 * um) + 1.1;
    exhibit(c, 10, -158, "Pelagibacter ubique", 0.8 * um, ["perhaps the most numerous cell on Earth: ~10²⁸ in the oceans"], 4, 1); }
  // Leptospira: a tightly coiled spiral 0.1 µm thick and ~8 µm long, lying across the ground
  { const pts = [], L = sz(8 * um), R = sz(0.1 * um), turns = 40;
    for (let i = 0; i <= 2000; i++) { const u = i / 2000, a = u * turns * 6.283; pts.push(new THREE.Vector3(u * L, R + 0.2 + Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9 + Math.sin(u * 3) * 4)); }
    const sp = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 4000, sz(0.05 * um), 6), M(0x1abc9c));
    exhibit(sp, 92, -200, "Leptospira", 8 * um, ["a spirochete: a corkscrew 0.1 µm thick that swims by spinning itself"], 6, 4);
    ladder.at(-1).x = 92 + L / 2; }
  // Anabaena: a chain of cyanobacterial cells, with a thick-walled heterocyst that fixes nitrogen
  { const g = new THREE.Group(), R = sz(1.5 * um);
    for (let i = 0; i < 9; i++) { const het = i === 5, c = new THREE.Mesh(new THREE.SphereGeometry(R * (het ? 1.1 : 1), 24, 18), cellMat(het ? 0xf9e79f : 0x239b56, het ? 0.6 : 0.5));
      c.scale.set(1.05, 0.9, 0.9); c.position.set(i * R * 2.05, R * 0.88, 0); g.add(c); }
    exhibit(g, 110, -175, "Anabaena (cyanobacteria)", 3 * um, ["photosynthesising cells in a chain; the yellow one fixes nitrogen from air",
      "cyanobacteria put the oxygen into Earth's air"], 40, 6);
    ladder.at(-1).x = 110 + 9 * R; }
  // Streptomyces: branching filaments spreading over the ground -- where most antibiotics come from
  { const g = new THREE.Group(), r = sz(0.4 * um);
    const grow = (p, dir, len, depth) => { const pts = [p.clone()]; let q = p.clone(), d = dir.clone();
      for (let i = 0; i < 12; i++) { d.applyAxisAngle(new THREE.Vector3(0, 1, 0), rr(-0.25, 0.25)); q = q.clone().addScaledVector(d, len / 12); q.y = r; pts.push(q); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, r, 10), cellMat(0xb9770e, 0.7)));
      if (depth > 0) for (let k = 0; k < 2; k++) { const at = pts[3 + Math.floor(rnd() * 8)];
        grow(at, d.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (k ? 1 : -1) * rr(0.5, 1.1)), len * 0.6, depth - 1); } };
    grow(new THREE.Vector3(0, r, 0), new THREE.Vector3(1, 0, 0.2).normalize(), 70, 3);
    exhibit(g, 125, -140, "Streptomyces", 0.8 * um, ["branching soil bacteria, like a mould · the source of most antibiotics"], 8, 4); }
}

// ---------- more archaea (on the ground) ----------------------------------------------------
{
  // Halobacterium: purple-membrane rods from salt flats
  { const L = sz(5 * um), r = sz(0.3 * um), c = new THREE.Mesh(new THREE.CapsuleGeometry(r, L - 2 * r, 12, 24), cellMat(0xa569bd, 0.55));
    c.rotation.z = Math.PI / 2; c.position.y = r - 0.3; exhibit(c, -85, -132, "Halobacterium salinarum", 5 * um,
      ["turns salt ponds pink-purple · its purple membrane harvests light"], 9, 4); }
  // Methanosarcina: cells packed into irregular packets
  { const g = new THREE.Group(), R = sz(0.9 * um);
    for (const [x, y, z] of [[0, 0, 0], [16, 0, 3], [7, 0, 15], [9, 14, 6], [-6, 0, 12], [-3, 13, -2]]) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2), cellMat(0xe59866, 0.55)); c.position.set(x, y + R - 0.5, z); g.add(c); }
    exhibit(g, -95, -170, "Methanosarcina", 2 * um, ["packets of methane-makers -- in cows' stomachs, rice paddies, and swamps"], 36, 4); }
  // Pyrococcus furiosus: "rushing fireball", with a tuft of archaella
  { const g = new THREE.Group(), R = sz(1 * um);
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 3), cellMat(0xcb4335, 0.5)); c.position.y = R - 0.5; g.add(c);
    const tuft = new THREE.Group(); tuft.userData.dynamic = true; tuft.position.y = R - 0.5; g.add(tuft);
    for (let i = 0; i < 14; i++) { const d = new THREE.Vector3(-1, rr(-0.3, 0.3), rr(-0.3, 0.3)).normalize(), pts = [];
      for (let j = 0; j <= 30; j++) { const u = j / 30; pts.push(d.clone().multiplyScalar(R + u * 30).add(new THREE.Vector3(0, Math.sin(u * 12 + i) * 1.5, Math.cos(u * 12 + i) * 1.5))); }
      tuft.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, sz(6 * nm), 4), M(0xf1948a, { clippingPlanes: ABOVE_GLASS }))); }
    animate.push(Treal => { tuft.rotation.x += Treal * 30 * 6.283; });
    exhibit(g, -14, -200, "Pyrococcus furiosus", 2 * um, ["'rushing fireball': grows best at 100 °C, boiling water"], 2 * R + 6, 3); }
  // Nitrosopumilus: one of the smallest free-living cells, abundant in the oceans
  { const L = sz(0.8 * um), r = sz(0.1 * um), c = new THREE.Mesh(new THREE.CapsuleGeometry(r, L - 2 * r, 8, 16), cellMat(0x52be80, 0.6));
    c.rotation.z = Math.PI / 2; c.position.y = r; exhibit(c, -10, -132, "Nitrosopumilus maritimus", 0.8 * um, ["among the most numerous cells in the sea; turns ammonia into nitrite"], 3.2, 0.9); }
  // Prometheoarchaeum: an Asgard archaeon with long branching arms -- a cousin of our ancestors
  { const g = new THREE.Group(), R = sz(0.25 * um);
    const c = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 18), cellMat(0xf8c471, 0.6)); c.position.y = R - 0.2; g.add(c);
    const arm = (p, d, len, depth) => { const pts = [p.clone()]; let q = p.clone();
      for (let i = 0; i < 10; i++) { d = d.clone().add(new THREE.Vector3(gauss() * 0.2, gauss() * 0.05, gauss() * 0.2)).normalize(); q = q.clone().addScaledVector(d, len / 10); q.y = Math.max(0.3, q.y); pts.push(q); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, sz(0.04 * um), 6), cellMat(0xf5b041, 0.8)));
      if (depth) arm(pts[6], d.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.8), len * 0.6, depth - 1); };
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283; arm(new THREE.Vector3(Math.cos(a) * R, R, Math.sin(a) * R), new THREE.Vector3(Math.cos(a), 0.05, Math.sin(a)), rr(30, 60), 1); }
    exhibit(g, -100, -205, "Prometheoarchaeum (Asgard archaea)", 0.5 * um, ["first grown in a lab in 2020: long arms, and genes once thought only eukaryotes had",
      "our own cells may descend from a partnership between one of these and a bacterium"], 8, 4); }
}
// paths to the new exhibits
path([[50, -25.6], [52, -21.2], [70, -21.2]], 1.8); path([[50, -25.6], [50, -35.8], [86, -35.8]], 1.8); path([[50, -35.8], [50, -44.8], [72, -44.8]], 1.8);   // the Light gallery
path([[-5.4, -32.4], [-30, -32.4]], 1.8); path([[-5.4, -40.4], [-30, -40.4]], 1.8);
path([[-5.4, -50], [-26, -50]], 1.6); path([[-5.4, -60], [-26, -60]], 1.6);
path([[-1.3, -117.6], [-32, -117.6]], 2); path(curve([[-34, -100], [-40, -95], [-42, -86]]), 2); path([[-34, -103], [-46, -110]], 2);
path([[3.7, -44], [38, -44]], 1.8); path([[3.7, -25.6], [50, -25.6]], 1.8); path([[24.4, -25.6], [24.4, -21]], 1.4);
path(curve([[56, -156], [76, -138], [96, -150], [118, -170], [150, -178], [115, -196], [90, -204], [44, -177]]), 2.6);
path(curve([[-62, -152], [-82, -138], [-100, -160], [-104, -196], [-80, -206], [-40, -205], [-14, -205], [-1.3, -196]]), 2.6);

// ==========================================================================================
//  LIFE IN ACTION: eight processes as walk-around scenes, many molecules at real crowding,
//  at ×10⁷. Each runs as a loop in clock time (the real events take femtoseconds to minutes;
//  every plaque gives the real timing). Instanced so the Quest can draw them.
// ==========================================================================================
const procAnim = [];
const ssm = (a, b, t) => THREE.MathUtils.smoothstep(t, a, b);
const isNear = (p, r = 45) => camW.distanceTo(p) < r;              // only animate what you can see
const deck = (w, d, y, col = 0xf5e6a8) => {                           // a membrane held at chest height on thin posts
  const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(w, sz(5 * nm), d),
    new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  m.position.y = y; g.add(m);
  for (const [sx, sz_] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, y, 6), M(0x7f8c8d));
    post.position.set(sx * (w / 2 - 0.1), y / 2, sz_ * (d / 2 - 0.1)); g.add(post); }
  return g; };
const inst = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); return m; };
const O3 = new THREE.Object3D(), C3 = new THREE.Color();
const set = (m, i, x, y, z, s = 1, rx = 0, ry = 0, rz = 0) => { O3.position.set(x, y, z); O3.rotation.set(rx, ry, rz); O3.scale.setScalar(s); O3.updateMatrix(); m.setMatrixAt(i, O3.matrix); };

// 1. vision: a patch of a rod's disc membrane, packed with rhodopsin, hit by a photon
{
  const X = -12, Z = -66.5, Y = 1.15, W = 4, D = 3, g = deck(W, D, Y); g.position.set(X, 0, Z); scene.add(g);
  const sp = sz(6.3 * nm), nx = Math.floor(W / sp), nz = Math.floor(D / sp), N = nx * nz;   // ~25,000 per µm² in real discs
  const rho = inst(new THREE.CylinderGeometry(sz(2 * nm), sz(2 * nm), sz(4.5 * nm), 7), M(0xffffff), N);
  const pos = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { const x = -W / 2 + (i + 0.5 + (k % 2) * 0.5) * sp + rr(-0.006, 0.006), z = -D / 2 + (k + 0.5) * sp;
    if (x > W / 2) continue; pos.push([x, z]); set(rho, pos.length - 1, x, Y, z); rho.setColorAt(pos.length - 1, C3.set(0xa93226)); }
  rho.count = pos.length; g.add(rho);
  const NT = 500, tr = inst(new THREE.SphereGeometry(sz(2.2 * nm), 8, 6), M(0xffffff), NT), tpos = [];   // transducin on the cytoplasmic face
  for (let i = 0; i < NT; i++) { tpos.push([rr(-W / 2, W / 2), rr(-D / 2, D / 2), rnd() * 6]); tr.setColorAt(i, C3.set(0x1e8449)); }
  g.add(tr);
  const wave = waveTube(sz(530 * nm), 1.2, 0.3, 0.03, 0x7dff7a); g.add(wave.mesh); WAVES.push({ mat: wave.mat, f: C_LIGHT / (530 * nm) });
  let hit = 0;
  procAnim.push(t => { if (!isNear(g.position)) return; const u = t % 9, loop = Math.floor(t / 9);
    hit = (loop * 7919) % rho.count; const [hx, hz] = pos[hit];
    wave.mesh.position.set(-W / 2 - 3 + u * 2.2, Y + 1.2 - u * 0.12, hz); wave.mesh.visible = u < 3.2;
    const on = u > 1.6 && u < 8.4, R = on ? Math.min(1.6, (u - 1.6) * 0.5) : 0;     // the cascade spreads outward
    for (let i = 0; i < pos.length; i += 1) if (i === hit) rho.setColorAt(i, C3.set(on ? 0xffb347 : 0xa93226));
    rho.instanceColor.needsUpdate = true;
    for (let i = 0; i < NT; i++) { const [x0, z0, ph] = tpos[i], x = x0 + Math.sin(t * 0.7 + ph) * 0.08, z = z0 + Math.cos(t * 0.6 + ph) * 0.08;
      set(tr, i, x, Y + sz(5 * nm), z); const d = Math.hypot(x - hx, z - hz); tr.setColorAt(i, C3.set(on && d < R ? 0x7dff9a : 0x1e8449)); }
    tr.instanceMatrix.needsUpdate = true; tr.instanceColor.needsUpdate = true; });
  label(["vision: inside a rod cell's disc", `${pos.length.toLocaleString()} rhodopsins (red) at their real crowding, ~25,000 per µm²`,
    "a green photon (its real 5.3 m wavelength here) flips one rhodopsin's retinal in 200 femtoseconds",
    "it switches on hundreds of transducins (they light up green) as it wanders the membrane",
    "that cascade is how one photon becomes a nerve signal · shown as a 9 s loop"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 2. insulin: receptors on a cell membrane; GLUT4 doors arrive from inside; glucose pours in
{
  const X = -19, Z = -75.5, Y = 1.3, W = 5, D = 3.5, g = deck(W, D, Y); g.position.set(X, 0, Z); scene.add(g);
  const recs = [];                                                     // outside the cell is above the membrane
  for (let i = 0; i < 8; i++) { const r = new THREE.Group(), x = -W / 2 + 0.5 + (i % 4) * 1.2 + (i > 3 ? 0.6 : 0), z = i > 3 ? 0.8 : -0.8;
    r.position.set(x, Y + sz(2.5 * nm), z); g.add(r);
    for (const sx of [-1, 1]) { const arm = lumpy(3, 0x8e44ad, 0.12, 1); arm.scale.set(0.8, 2.2, 0.8); arm.position.set(sx * sz(3.5 * nm), sz(7 * nm), 0); arm.rotation.z = sx * -0.35; r.add(arm); }
    const kin = [-1, 1].map(sx => { const k = lumpy(2.4, 0x5b2c6f, 0.12, 1); k.position.set(sx * sz(2.5 * nm), -sz(7 * nm), 0); r.add(k); return k; });
    const ins = lumpy(1.3, 0x3498db, 0.15, 1); g.add(ins);
    recs.push({ r, kin, ins, home: new THREE.Vector3(x, Y + sz(20 * nm), z), when: i * 0.6 }); }
  const NV = 6, ves = inst(new THREE.SphereGeometry(sz(25 * nm), 16, 12), new THREE.MeshStandardMaterial({ color: 0xd6eaf8, transparent: true, opacity: 0.5, depthWrite: false }), NV);
  const glut = inst(new THREE.CylinderGeometry(sz(2.5 * nm), sz(2.5 * nm), sz(6 * nm), 8), M(0x2471a3), NV); g.add(ves, glut);
  const NG = 200, gl = inst(new THREE.CylinderGeometry(sz(0.45 * nm), sz(0.45 * nm), sz(0.2 * nm), 6), M(0xffffff), NG); g.add(gl);
  const gseed = [...Array(NG)].map(() => [rnd(), rnd() * 6]);
  procAnim.push(t => { if (!isNear(g.position)) return; const u = t % 14;
    for (const { r, kin, ins, home, when } of recs) { const k = ssm(when, when + 1.5, u);
      ins.position.copy(home).add(new THREE.Vector3((1 - k) * 0.3, (1 - k) * 0.5, 0)); ins.position.y -= k * sz(4 * nm);
      ins.visible = u < 13.5; const lit = u > when + 1.6 && u < 13.5;
      for (const kk of kin) kk.material.emissive.setHex(lit ? 0x7e5109 : 0x000000); }
    for (let i = 0; i < NV; i++) { const x = -W / 2 + 0.8 + i * 0.75, rise = ssm(5 + i * 0.4, 7 + i * 0.4, u), fused = u > 7 + i * 0.4;
      set(ves, i, x, Y - 0.9 + rise * 0.65, 0, fused || u > 13.5 ? 0.001 : 1);
      set(glut, i, x, Y + sz(2.5 * nm), 0, fused && u < 13.5 ? 1 : 0.001); }
    for (let i = 0; i < NG; i++) { const [a, ph] = gseed[i], door = Math.floor(a * NV), x = -W / 2 + 0.8 + door * 0.75, k = ((u - 8 - ph * 0.8) % 2.5) / 2.5;
      const open = u > 7.2 + door * 0.4 && u < 13.5;
      set(gl, i, x + Math.sin(ph * 9) * (k < 0.45 ? 0.6 * (0.45 - k) : 0), Y + 0.5 - k * 1.0, Math.cos(ph * 7) * (k < 0.45 ? 0.6 * (0.45 - k) : 0), open && k > 0 ? 1 : 0.001); }
    ves.instanceMatrix.needsUpdate = glut.instanceMatrix.needsUpdate = gl.instanceMatrix.needsUpdate = true; });
  label(["insulin: the signal to take in sugar", "outside the cell (above): insulin (blue) docks in its Λ-shaped receptors; their kinases (below) light up",
    "inside (below): vesicles carry GLUT4 doors up and fuse into the membrane",
    "then glucose (white) pours through the doors into the cell",
    "real time: binding in ms, doors arrive over minutes · 14 s loop · walk under the membrane"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 3. blood clotting: a fibrin fibre 100 nm thick (1 m here) growing from hundreds of protofibrils
{
  const X = -26, Z = -66.5, Y = 1.4, L = 5, U = sz(45 * nm), g = new THREE.Group(); g.position.set(X, 0, Z); scene.add(g);
  const pf = []; for (let r = 0; r <= 0.48; r += 0.09) { const n = Math.max(1, Math.round(6.283 * r / 0.09)); for (let k = 0; k < n; k++) { const a = k / n * 6.283; pf.push([Math.cos(a) * r, Math.sin(a) * r]); } }
  const per = Math.floor(L / (U / 2)), N = pf.length * per;
  const rod = inst(new THREE.CapsuleGeometry(sz(3 * nm), U - sz(6 * nm), 3, 6), M(0xc0392b), N); g.add(rod);
  const order = [...Array(N).keys()].sort((a, b) => (a % per) - (b % per) + (rnd() - 0.5) * 6);   // grows roughly end to end
  const NT = 40, th = inst(new THREE.IcosahedronGeometry(sz(2.2 * nm), 1), M(0x641e16), NT); g.add(th);
  procAnim.push(t => { if (!isNear(g.position)) return; const u = t % 20, shown = Math.floor(N * ssm(0, 17, u));
    for (let j = 0; j < N; j++) { const idx = order[j], p = Math.floor(idx / per), k = idx % per, [y0, z0] = pf[p];
      const x = -L / 2 + k * U / 2 + (p % 2) * U / 4;
      set(rod, idx, x, Y + y0, z0, j < shown && u < 19.5 ? 1 : 0.001, 0, 0, Math.PI / 2); }
    rod.instanceMatrix.needsUpdate = true;
    const front = -L / 2 + L * ssm(0, 17, u);
    for (let i = 0; i < NT; i++) set(th, i, front + Math.sin(t * 1.3 + i) * 0.6, Y + Math.cos(t * 1.1 + i * 2) * 0.7, Math.sin(t * 0.9 + i * 3) * 0.7);
    th.instanceMatrix.needsUpdate = true; });
  label(["blood clotting: a fibrin fibre assembling", `${pf.length} protofibrils side by side, each a chain of fibrin molecules (45 nm → 45 cm)`,
    "thrombin (dark red) cuts fibrinogen so it can join; molecules stack half-overlapped",
    "the finished fibre is ~100 nm thick (1 m here); millions of them make the mesh of a clot",
    "real time: a clot forms in minutes · shown as a 20 s loop"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 4. oxygen: inside a red blood cell, haemoglobin packed shoulder to shoulder, loading O₂
{
  const X = -33, Z = -75.5, g = new THREE.Group(); g.position.set(X, 0, Z); scene.add(g);
  const sp = sz(9.5 * nm), nx = 16, ny = 11, nz = 11, N = nx * ny * nz;      // ~5 mM: about one per (9.5 nm)³
  const hb = inst(new THREE.IcosahedronGeometry(sz(3.1 * nm), 1), M(0xffffff, { flatShading: true }), N), seeds = [];
  let i = 0; for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) for (let c = 0; c < nz; c++, i++) {
    set(hb, i, (a - nx / 2) * sp + rr(-0.02, 0.02), 0.6 + b * sp + rr(-0.02, 0.02), (c - nz / 2) * sp + rr(-0.02, 0.02), 1, rnd() * 6, rnd() * 6, 0);
    seeds.push(a / nx); }
  g.add(hb);
  const deoxy = new THREE.Color(0x5b1f2a), oxy = new THREE.Color(0xff2a2a);
  procAnim.push(t => { if (!isNear(g.position)) return; const u = t % 12, front = u < 6 ? u / 5 : 1 - (u - 6) / 5;   // load in the lungs, unload in tissue
    for (let j = 0; j < N; j++) hb.setColorAt(j, C3.copy(deoxy).lerp(oxy, ssm(seeds[j] - 0.08, seeds[j] + 0.08, front)));
    hb.instanceColor.needsUpdate = true; });
  label(["oxygen: inside a red blood cell", `${N.toLocaleString()} haemoglobins at their real crowding: a third of the cell's weight`,
    "watch them load oxygen (dark red → bright red) as in the lungs, then unload as in the tissues",
    "the colour change is real: it is why arterial blood is brighter than venous",
    "each binds 4 O₂, the later ones more easily (cooperativity) · 12 s loop"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 5. a nerve impulse: a strip of axon membrane; channels open in a travelling wave
{
  const X = -40, Z = -66.5, Y = 1.2, L = 6, W = 1.6, g = deck(L, W, Y); g.position.set(X, 0, Z); scene.add(g);
  const NA = 60, NK = 30, na = inst(new THREE.CylinderGeometry(sz(4 * nm), sz(4 * nm), sz(10 * nm), 8), M(0x2e86c1), NA), kk = inst(new THREE.CylinderGeometry(sz(3.5 * nm), sz(3.5 * nm), sz(9 * nm), 8), M(0x8e44ad), NK);
  const np = [...Array(NA)].map(() => [rr(-L / 2, L / 2), rr(-W / 2.3, W / 2.3)]), kp = [...Array(NK)].map(() => [rr(-L / 2, L / 2), rr(-W / 2.3, W / 2.3)]);
  const NI = 300, ion = inst(new THREE.SphereGeometry(sz(0.4 * nm), 6, 4), M(0xffffff), NI); const iseed = [...Array(NI)].map(() => [Math.floor(rnd() * 90), rnd()]);
  g.add(na, kk, ion);
  procAnim.push(t => { if (!isNear(g.position)) return; const front = -L / 2 - 1 + ((t % 7) / 6) * (L + 2);    // the action potential travels along
    np.forEach(([x, z], i) => { const open = ssm(0, 0.3, front - x) * (1 - ssm(0.6, 1.0, front - x)); set(na, i, x, Y, z, 1 + 0.4 * open); na.setColorAt(i, C3.set(open > 0.3 ? 0x85c1e9 : 0x1f618d)); });
    kp.forEach(([x, z], i) => { const open = ssm(0.7, 1.0, front - x) * (1 - ssm(1.6, 2.2, front - x)); set(kk, i, x, Y, z, 1 + 0.4 * open); kk.setColorAt(i, C3.set(open > 0.3 ? 0xd2b4de : 0x6c3483)); });
    iseed.forEach(([c, ph], i) => { const isK = c >= NA, [x, z] = isK ? kp[c - NA] : np[c], local = front - x - (isK ? 0.7 : 0);
      const k = ((local + ph * 0.4) % 1.2) / 1.2, open = local > 0 && local < (isK ? 1.2 : 0.6);
      set(ion, i, x, Y + (isK ? -1 : 1) * (0.3 - k * 0.6), z, open ? 1 : 0.001); ion.setColorAt(i, C3.set(isK ? 0xe67e22 : 0xbb8fce)); });
    na.instanceMatrix.needsUpdate = kk.instanceMatrix.needsUpdate = ion.instanceMatrix.needsUpdate = true;
    na.instanceColor.needsUpdate = kk.instanceColor.needsUpdate = ion.instanceColor.needsUpdate = true; });
  label(["a nerve impulse travelling along an axon", "sodium channels (blue) open as the wave arrives; Na⁺ (lilac) floods in from outside (above)",
    "just behind, potassium channels (purple) open and K⁺ (orange) flows out, resetting the voltage",
    "real: the wave moves up to 120 m/s; each channel opens for ~1 ms",
    "this strip is 600 nm of axon membrane · shown slowed to a 7 s loop"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 6. DNA replication: a 5 m stretch, helicase unzipping, polymerases copying both strands
{
  const X = -47, Z = -75.5, g = new THREE.Group(); g.position.set(X, 0, Z); scene.add(g);
  const X0 = -2.5, X1 = 2.5, R = sz(1 * nm), pitch = sz(3.4 * nm), y0 = 1.35;
  const keepAhead = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0), keepBehind = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const strand = (dy, dz, ph, col, clip) => { const pts = [];
    for (let x = X0; x <= X1; x += pitch / 12) { const a = (x - X0) / pitch * 6.283 + ph; pts.push(new THREE.Vector3(x, y0 + dy + Math.cos(a) * R, dz + Math.sin(a) * R)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, sz(0.3 * nm), 5), M(col, { clippingPlanes: [clip] }))); };
  strand(0, 0, 0, 0x2e86c1, keepAhead); strand(0, 0, 2.7, 0x5dade2, keepAhead);
  for (const [dy, old] of [[sz(5 * nm), 0x2e86c1], [-sz(5 * nm), 0x5dade2]]) { strand(dy, 0, 0, old, keepBehind); strand(dy, 0, 2.7, 0xf39c12, keepBehind); }
  const heli = new THREE.Group(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, b = lumpy(1.5, 0x7d3c98, 0.1, 1); b.position.set(0, y0 + Math.cos(a) * sz(4 * nm), Math.sin(a) * sz(4 * nm)); heli.add(b); }
  g.add(heli);
  const pols = [1, -1].map(sy => { const p = lumpy(4, 0x1e8449, 0.12, 1); g.add(p); return { p, sy }; });
  const stand = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.04, 0.3), M(0x34495e)); stand.position.set(0, 0.9, 0); g.add(stand);
  procAnim.push(t => { if (!isNear(g.position)) return; const fx = X0 + 0.1 + ((t % 18) / 18) * (X1 - X0 - 0.2);
    keepAhead.constant = -(g.position.x + fx); keepBehind.constant = g.position.x + fx;
    heli.position.x = fx; pols.forEach(({ p, sy }) => p.position.set(fx - 0.09, y0 + sy * sz(5 * nm), 0)); });
  label(["DNA replication: copying the code", "helicase (purple ring) unzips the double helix; a polymerase (green) on each strand",
    "builds a new partner (orange): every daughter molecule is half old, half new",
    "real speed: ~1,000 letters a second in bacteria (this whole 5 m stretch in about 0.15 s)",
    "a human cell copies 6 billion letters with about one uncorrected error per billion · 18 s loop"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 7. translation: a polysome -- many ribosomes reading one mRNA at once
{
  const X = -54, Z = -66.5, L = 5, Y = 1.3, g = new THREE.Group(); g.position.set(X, 0, Z); scene.add(g);
  const mrna = new THREE.Mesh(new THREE.CylinderGeometry(sz(0.6 * nm), sz(0.6 * nm), L, 6), M(0x5dade2)); mrna.rotation.z = Math.PI / 2; mrna.position.y = Y; g.add(mrna);
  const NR = 8, ribs = [], NB = 60;
  for (let i = 0; i < NR; i++) { const rb = ribosome(); g.add(rb);
    const ch = inst(new THREE.SphereGeometry(sz(0.4 * nm), 6, 4), M(0xf4d03f), NB); g.add(ch); ribs.push({ rb, ch, ph: i / NR }); }
  procAnim.push(t => { if (!isNear(g.position)) return;
    for (const { rb, ch, ph } of ribs) { const u = (t / 24 + ph) % 1, x = -L / 2 + u * L;
      rb.position.set(x, Y + sz(8 * nm), 0);
      const n = Math.floor(u * NB); for (let k = 0; k < NB; k++) set(ch, k, x - sz(3 * nm) - Math.sin(k * 0.4) * 0.05, Y + sz(20 * nm) + k * sz(0.35 * nm) * 0.8, Math.cos(k * 0.5) * 0.05, k < n ? 1 : 0.001);
      ch.instanceMatrix.needsUpdate = true; } });
  label(["making proteins: a polysome", "8 ribosomes read the same mRNA (blue) at once, each a little further along",
    "each grows its own protein chain (yellow): the further along, the longer the chain",
    "real speed: ~20 amino acids a second; one mRNA can make dozens of copies",
    "shown slowed: one pass every 24 s"], new THREE.Vector3(X, 0, Z), 1.0);
}

// 8. immunity: two viruses being coated by antibodies
{
  for (const [vx, vz, delay] of [[-60, -75.5, 0], [-63, -77.5, 4]]) {
    const g = new THREE.Group(); g.position.set(vx, 0, vz); scene.add(g);
    const vir = virus(); vir.position.y = 1.4; g.add(vir);
    const R = sz(REAL.virus) / 2 + sz(REAL.spike) * 0.85, n = 26, abs = [];
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), a = i * 2.39996, d = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
      const ab = new THREE.Group(), arm = ang => { const c = new THREE.Mesh(new THREE.CapsuleGeometry(sz(1.4 * nm), sz(4.5 * nm), 3, 6), M(0xf5f5f5));
        c.rotation.z = ang; c.position.set(-Math.sin(ang) * sz(3.5 * nm), Math.cos(ang) * sz(3.5 * nm), 0); return c; };
      ab.add(arm(0.95), arm(-0.95), arm(Math.PI)); g.add(ab);
      abs.push({ ab, d, from: d.clone().multiplyScalar(R + 0.8 + rnd() * 0.6), when: delay + 0.5 + i * 0.3 }); }
    procAnim.push(t => { if (!isNear(g.position)) return; const u = t % 16;
      for (const { ab, d, from, when } of abs) { const k = ssm(when, when + 1.2, u) * (1 - ssm(15, 15.8, u));
        ab.position.lerpVectors(from, d.clone().multiplyScalar(R + sz(9 * nm)), k).add(vir.position);
        ab.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d); ab.visible = k > 0.01; } });
  }
  label(["immunity: antibodies neutralise viruses", "antibodies (white Ys, 15 nm → 15 cm) clamp onto every spike of the virus",
    "a coated virus can't grab our cells, and immune cells recognise it and eat it",
    "vaccines train your body to make exactly these antibodies in advance",
    "real time: seconds to minutes · 16 s loop"], new THREE.Vector3(-61.5, 0, -75.5), 1.0);
}
path([[-5.4, -69], [-5.4, -71], [-66, -71]], 2); path([[-1.3, -71], [-5.4, -71]], 2);
ladder.push({ name: "Life in action (processes)", real: 20 * nm, x: -35, z: -71 });

// ==========================================================================================
//  SURFACES: familiar surfaces at ×10⁷, each a 36 m tile = 3.6 µm of the real thing, walkable.
//  Roughness values: glass 0.3-0.5 nm RMS; Si(111) atomic steps 0.31 nm; polished stainless
//  ~5 nm RMS with ~20 nm scratches; foil rolling ridges ~0.1 µm; paper macrofibril bundles
//  20-50 nm; corneocytes 0.3-0.5 µm thick; lotus wax tubules ~1 µm × 0.1 µm; Morpho ridges
//  ~0.8 µm apart with lamellae every ~0.2 µm.
// ==========================================================================================
const TILES = [], TS = 36, G = 145;                          // walk grid: 145 × 145 samples per tile
function groundH(x, z) {
  if (inMacro) return macroGround(x, z);
  for (const t of TILES) { const lx = x - t.cx, lz = z - t.cz;
    if (Math.abs(lx) < TS / 2 && Math.abs(lz) < TS / 2) {
      const fx = (lx + TS / 2) / TS * (G - 1), fz = (lz + TS / 2) / TS * (G - 1), i = Math.floor(fx), k = Math.floor(fz), a = fx - i, b = fz - k;
      const v = (ii, kk) => t.grid[Math.min(G - 1, kk) * G + Math.min(G - 1, ii)];
      return (v(i, k) * (1 - a) + v(i + 1, k) * a) * (1 - b) + (v(i, k + 1) * (1 - a) + v(i + 1, k + 1) * a) * b; } }
  return 0; }
function surfaceTile(cx, cz, { seg = 96, h, walk, color, mat, colorAt }) {
  const t = { cx, cz, grid: new Float32Array(G * G) };
  const w = walk || h;
  for (let k = 0; k < G; k++) for (let i = 0; i < G; i++) t.grid[k * G + i] = Math.max(0, w(-TS / 2 + i / (G - 1) * TS, -TS / 2 + k / (G - 1) * TS));
  TILES.push(t);
  if (h) {
    const geo = new THREE.PlaneGeometry(TS, TS, seg, seg).rotateX(-Math.PI / 2), p = geo.attributes.position, col = colorAt ? new Float32Array(p.count * 3) : null;
    for (let i = 0; i < p.count; i++) { const lx = p.getX(i), lz = p.getZ(i), y = h(lx, lz); p.setY(i, y + 0.01);
      if (col) { colorAt(lx, lz, y, C3); col.set([C3.r, C3.g, C3.b], 3 * i); } }
    if (col) geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat || M(color, colorAt ? { vertexColors: true } : {})); m.position.set(cx, 0, cz); scene.add(m);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(TS + 0.4, 0.15, TS + 0.4), M(0x5d6d7e)); edge.position.set(cx, -0.06, cz); scene.add(edge);
  }
  return t; }
const vnoise2 = (() => { const P = [...Array(512)].map(() => rnd()); const f = t => t * t * (3 - 2 * t);
  return (x, z) => { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, H = (a, b) => P[((a * 73856093) ^ (b * 19349663)) & 511];
    const u = f(xf), v = f(zf); return (H(xi, zi) * (1 - u) + H(xi + 1, zi) * u) * (1 - v) + (H(xi, zi + 1) * (1 - u) + H(xi + 1, zi + 1) * u) * v - 0.5; }; })();
const fbm2 = (x, z, o = 4) => { let s2 = 0, a = 1, f = 1; for (let i = 0; i < o; i++) { s2 += vnoise2(x * f, z * f) * a; a *= 0.5; f *= 2.07; } return s2; };
const R1 = -21, R2 = -64, C1 = -88, C2 = -128, C3x = -168, C4 = -208;
const tileLabel = (cx, cz, lines) => label(lines, new THREE.Vector3(cx, 0, cz + (cz > -42.5 ? 1 : -1) * 17), 1.1);

// 1. window glass: amorphous silica, flat to a few millimetres here
surfaceTile(C1, R1, { seg: 96, h: (x, z) => 0.012 + 0.004 * fbm2(x * 0.6, z * 0.6, 4),
  mat: new THREE.MeshPhysicalMaterial({ color: 0xd6eef5, roughness: 0.05, metalness: 0, clearcoat: 1 }) });
tileLabel(C1, R1, ["window glass", "this tile is 3.6 µm of a windowpane: bumps of 0.3-0.5 nm → 3-5 mm here",
  "atoms in no particular order (it's a frozen liquid), so there are no steps or grains",
  "as flat as a calm lake, even at ten million times"]);
// 2. silicon wafer: terraces one atomic step apart (0.314 nm → 3.1 mm)
{ const step = 0.00314, terr = 1.8;
  const hW = (x, z) => 0.12 - step * Math.floor((x + TS / 2 + 0.6 * Math.sin(z * 0.25)) / terr);
  surfaceTile(C2, R1, { seg: 140, h: hW, mat: M(0x7f8c8d, { metalness: 0.6, roughness: 0.25, vertexColors: true }),
    colorAt: (x, z, y, c) => c.setHSL(0.58, 0.08, 0.42 + 0.06 * (Math.floor((x + TS / 2 + 0.6 * Math.sin(z * 0.25)) / terr) % 2)) });
  tileLabel(C2, R1, ["a silicon wafer, polished for chips", "the flattest surface people make: broad terraces (light, dark) ~180 nm → 1.8 m wide",
    "each step down is a single layer of atoms: 0.31 nm → 3 mm here", "you are walking down a staircase one atom high per step"]); }
// 3. polished stainless steel: gentle hills, polishing scratches, a grain boundary
{ const scr = [...Array(14)].map(() => ({ a: rr(-0.25, 0.25) + 0.9, o: rr(-16, 16), d: rr(0.08, 0.22), w: rr(0.4, 1.2) }));
  const hS = (x, z) => { let y = 0.75 + 0.05 * fbm2(x * 0.12, z * 0.12, 4);    // base high enough that the deepest groove stays above the edging
    for (const s2 of scr) { const d = x * Math.sin(s2.a) - z * Math.cos(s2.a) - s2.o; y -= s2.d * Math.exp(-((d / s2.w) ** 2)); }
    const gb = x * 0.35 + z - 4; y -= 0.25 * Math.exp(-((gb / 0.9) ** 2)); return y; };
  surfaceTile(C3x, R1, { seg: 160, h: hS, mat: M(0xc8ccd0, { metalness: 0.95, roughness: 0.22 }) });
  tileLabel(C3x, R1, ["polished stainless steel", "mirror-smooth to you, but here: hills of ~5 nm → 5 cm and polishing scratches 20 nm → 20 cm deep",
    "the deeper groove is a grain boundary, where two crystals of iron meet",
    "a chromium-oxide film 2 nm → 2 cm thick covers it all: that's why it doesn't rust"]); }
// 4. aluminium foil: parallel ridges left by the rolling mill
{ const hF = (x, z) => 0.6 + 0.45 * Math.sin(x * 6.283 / 11 + 0.8 * fbm2(z * 0.05, x * 0.02, 2)) + 0.06 * Math.sin(x * 6.283 / 1.3 + z * 0.03) + 0.04 * fbm2(x * 0.5, z * 0.08, 3);
  surfaceTile(C4, R1, { seg: 140, h: hF, mat: M(0xdfe3e6, { metalness: 0.9, roughness: 0.3 }) });
  tileLabel(C4, R1, ["aluminium foil (the shiny side)", "rolling-mill ridges ~100 nm → 1 m high, a micrometre or so → ~11 m apart",
    "the dull side was rolled against another sheet, so it's rougher",
    "the whole foil is ~16 µm thick: 160 m here, a cliff the height of a tall building"]); }
// 5. paper: a jumble of cellulose fibril bundles, with a chalk filler boulder
{ const logs = [];
  for (let layer = 0; layer < 5; layer++) { const base = rr(-0.5, 0.5) + 0.35 * layer;
    for (let i = 0; i < 70; i++) { const r = rr(0.12, 0.25), a = base + rr(-0.35, 0.35), L = rr(10, 30);
      logs.push({ x: rr(-17, 17), z: rr(-17, 17), a, L, r, y: 0.2 + layer * 0.32 + r }); } }
  const box = [[1, 0, 0, -(C1 - TS / 2)], [-1, 0, 0, C1 + TS / 2], [0, 0, 1, -(R2 - TS / 2)], [0, 0, -1, R2 + TS / 2]]   // trim at the tile's edges
    .map(([a, b, c, d]) => new THREE.Plane(new THREE.Vector3(a, b, c), d));
  const cyl = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 8, 1), M(0xf2ead9, { roughness: 0.95, clippingPlanes: box }), logs.length);
  logs.forEach((l, i) => { O3.position.set(C1 + l.x, l.y, R2 + l.z); O3.rotation.set(0, l.a, Math.PI / 2); O3.scale.set(l.r, l.L, l.r); O3.updateMatrix(); cyl.setMatrixAt(i, O3.matrix);
    cyl.setColorAt(i, C3.setHSL(0.11, 0.25, 0.85 + rr(-0.06, 0.05))); });
  scene.add(cyl);
  const chalk = new THREE.Mesh(new THREE.BoxGeometry(9, 7, 8), M(0xfdfefe, { roughness: 0.6 })); chalk.position.set(C1 + 9, 3.5, R2 + 6); chalk.rotation.set(0.35, 0.6, 0.25); scene.add(chalk);
  const hP = (x, z) => { let y = 0.1; for (const l of logs) { const dx = x - l.x, dz = z - l.z, along = dx * Math.cos(l.a) - dz * Math.sin(l.a), across = dx * Math.sin(l.a) + dz * Math.cos(l.a);
      if (Math.abs(along) < l.L / 2 && Math.abs(across) < l.r) y = Math.max(y, l.y + Math.sqrt(l.r * l.r - across * across)); }
    if (Math.hypot(x - 9, z - 6) < 4.5) y = Math.max(y, 7.5); return y; };
  surfaceTile(C1, R2, { seg: 48, h: (x, z) => 0.05, walk: hP, color: 0xb9ad94 });
  tileLabel(C1, R2, ["a sheet of paper", "you're on top of one wood fibre (it's 25 µm wide: 250 m here)",
    "these logs are bundles of cellulose chains, 20-50 nm → 20-50 cm thick, layered in a mat",
    "the white block is chalk filler (calcium carbonate) that makes paper bright and smooth"]); }
// 6. skin: the edge of a flat dead skin cell, and a bacterium living on it
{ const edge = (x, z) => z + 3 * Math.sin(x * 0.18) + 1.5 * fbm2(x * 0.15, 0, 3);
  const hK = (x, z) => { const top = edge(x, z) < 0 ? 4 : 0; return 0.2 + top + 0.25 * fbm2(x * 0.9, z * 0.9, 3) + 0.15 * Math.max(0, Math.sin(x * 2.1) * Math.sin(z * 2.3)); };
  surfaceTile(C2, R2, { seg: 150, h: hK, mat: M(0xe8c3a8, { roughness: 0.85, vertexColors: true }),
    colorAt: (x, z, y, c) => c.setHSL(0.07, 0.38, y > 2 ? 0.74 : 0.66) });
  const staph = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 24), cellMat(0xf4d03f, 0.6)); staph.position.set(C2 - 6, 5, R2 + 9); scene.add(staph);
  tileLabel(C2, R2, ["the surface of your skin", "dead, flattened cells (corneocytes) stacked like roof tiles: each 30 µm → 300 m wide",
    "but only 0.3-0.5 µm → 4 m thick: you're standing at the edge of one, stepping down to the next",
    "the yellow ball is Staphylococcus, a bacterium that lives on almost everyone's skin"]); }
// 7. lotus leaf: the flank of a waxy bump, forested with wax crystals
{ const hL = (x, z) => Math.max(0, Math.sqrt(Math.max(0, 70 * 70 - (x - 40) ** 2 - (z - 5) ** 2)) - 52);
  surfaceTile(C3x, R2, { seg: 96, h: hL, color: 0x7dab55 });
  const N = 420, tub = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 7), M(0xeef6e4, { roughness: 0.4 }), N);
  for (let i = 0; i < N; i++) { const x = rr(-17.5, 17.5), z = rr(-17.5, 17.5), y = hL(x, z), Ln = rr(7, 12);
    const n = new THREE.Vector3(-(hL(x + 0.5, z) - hL(x - 0.5, z)), 1, -(hL(x, z + 0.5) - hL(x, z - 0.5))).normalize().add(new THREE.Vector3(rr(-0.3, 0.3), 0, rr(-0.3, 0.3))).normalize();
    O3.position.set(C3x + x, y, R2 + z).addScaledVector(n, Ln / 2); O3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); O3.scale.set(1, Ln, 1); O3.updateMatrix(); tub.setMatrixAt(i, O3.matrix); }
  scene.add(tub);
  tileLabel(C3x, R2, ["a lotus leaf", "the leaf is covered in bumps 10-20 µm tall (100-200 m here); you're on the side of one",
    "and every bump is a forest of wax crystals ~1 µm → 10 m tall, 0.1 µm → 1 m thick",
    "a raindrop (2 mm → 20 km here!) only touches the tips, so it beads up and rolls off, taking dirt with it"]); }
// 8. Morpho butterfly wing: canyons between 'Christmas tree' ridges that make the blue
{ const ridges = [-12, -4, 4, 12], blue = new THREE.MeshStandardMaterial({ color: 0x1f5fd6, emissive: 0x0b2a7a, metalness: 0.3, roughness: 0.35 });
  const lamGeo = new THREE.BoxGeometry(1, 1, 1), lam = new THREE.InstancedMesh(lamGeo, blue, ridges.length * 8 * 2), web = new THREE.InstancedMesh(lamGeo, blue, ridges.length);
  let k = 0; ridges.forEach((rx, j) => { O3.position.set(C4 + rx, 6, R2); O3.rotation.set(0, 0, 0); O3.scale.set(0.5, 12, TS); O3.updateMatrix(); web.setMatrixAt(j, O3.matrix);
    for (let l = 0; l < 8; l++) for (const sd of [-1, 1]) { const y = 2.2 + l * 1.4, wd = 2.2 - l * 0.18;
      O3.position.set(C4 + rx + sd * wd / 2, y, R2); O3.rotation.set(0, 0, sd * -0.12); O3.scale.set(wd, 0.12, TS); O3.updateMatrix(); lam.setMatrixAt(k++, O3.matrix); } });
  scene.add(lam, web);
  const hM = (x, z) => ridges.some(rx => Math.abs(x - rx) < 0.6) ? 12 : 0.1;
  surfaceTile(C4, R2, { seg: 32, h: (x, z) => 0.05, walk: hM, color: 0x25304a });
  tileLabel(C4, R2, ["a blue Morpho butterfly's wing", "each wing scale is lined with ridges ~0.8 µm → 8 m apart; you're in a canyon between two",
    "every ridge is a 'Christmas tree' of thin layers spaced ~0.2 µm → 2 m",
    "the layers reflect blue light in step (interference): the blue is structure, not pigment"]); }
path([[-5.4, -42.5], [-270, -42.5]], 2.4);
ladder.push({ name: "Surfaces", real: 3.6 * um, x: -148, z: -42.5 });

// ==========================================================================================
//  MORE SURFACES: two from nature that work because of sub-micron structure
// ==========================================================================================
const C5 = -248;
// gecko foot: the tips of its hairs split into ~200 nm spatulae (2 m paddles here) pressed on glass
{ const N = 520, stalk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.12, 1, 6), M(0x8d6e63), N),
    pad = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.1, 1.6), M(0xa1887f), N);
  for (let i = 0; i < N; i++) { const x = rr(-17, 17), z = rr(-17, 17), Ln = rr(3, 6), lean = rr(-0.5, 0.5), dir = rr(0, 6.28);
    const top = new THREE.Vector3(C5 + x + Math.cos(dir) * lean * 2, Ln + 0.15, R1 + z + Math.sin(dir) * lean * 2), base = new THREE.Vector3(C5 + x, 0.15, R1 + z);
    O3.position.copy(top).add(base).multiplyScalar(0.5); O3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(base).normalize());
    O3.scale.set(1, top.distanceTo(base), 1); O3.updateMatrix(); stalk.setMatrixAt(i, O3.matrix);
    O3.position.copy(base); O3.rotation.set(0, dir, 0); O3.scale.setScalar(1); O3.updateMatrix(); pad.setMatrixAt(i, O3.matrix); }
  scene.add(stalk, pad);
  // the spatulae hang down from the foot onto the glass: the "stalks" rise toward the foot above you
  surfaceTile(C5, R1, { seg: 32, h: (x, z) => 0.05, mat: new THREE.MeshPhysicalMaterial({ color: 0xd6eef5, roughness: 0.05, clearcoat: 1 }) });
  tileLabel(C5, R1, ["a gecko's foot on glass", "each toe hair splits into hundreds of spatulae: 200 nm → 2 m wide paddles, 10 nm → 10 cm thin",
    "they press so close to the glass (about 0.3 nm → 3 mm) that van der Waals forces hold them",
    "billions of them hold a gecko on a window, upside down, without any glue"]); }
// moth eye: a hexagonal field of ~200 nm bumps that stops reflections
{ const pitch = 2.2, hH = 2.2, hE = (x, z) => { const a = x / pitch, b = (z / pitch) / 0.866, j = Math.round(b), i = Math.round(a - (j % 2) * 0.5);
      const cx = (i + (j % 2) * 0.5) * pitch, cz = j * pitch * 0.866, r = Math.hypot(x - cx, z - cz) / (pitch * 0.55);
      return 0.1 + hH * Math.max(0, 1 - r * r); };
  surfaceTile(C5, R2, { seg: 220, h: hE, color: 0x4a3b2f, mat: M(0x3e2f25, { roughness: 0.6 }) });
  tileLabel(C5, R2, ["a moth's eye", "covered in bumps ~200 nm → 2 m tall and apart, smaller than a wavelength of light",
    "light meets a gradual change instead of a sharp surface, so almost nothing reflects",
    "so the moth's eye doesn't glint at predators; phone screens and camera lenses now copy it"]); }

// ==========================================================================================
//  NANOTECH AND EVERYDAY THINGS UNDER A MICRON (the Non-living hall's east end)
// ==========================================================================================
{
  const NZ = -53;
  path([[3.7, NZ], [176, NZ]], 2.2);
  // phone camera pixels: 1 µm photosites, each under a colour filter and a micro-lens
  { const g = new THREE.Group(); g.position.set(118, 0, NZ + 9); scene.add(g); const P = 10;
    [[0xd62728, -1, -1], [0x2ca02c, 1, -1], [0x2ca02c, -1, 1], [0x1f77b4, 1, 1]].forEach(([c, sx, sz_]) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(P - 0.3, 2.0, P - 0.3), M(0x2c3e50)); base.position.set(sx * P / 2, 1.0, sz_ * P / 2); g.add(base);
      const filt = new THREE.Mesh(new THREE.BoxGeometry(P - 0.3, 0.8, P - 0.3), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: 0.85 })); filt.position.set(sx * P / 2, 2.4, sz_ * P / 2); g.add(filt);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(P * 0.55, 32, 16, 0, 6.283, 0, 0.9), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.8, roughness: 0.05, transparent: true, opacity: 0.6 }));
      lens.position.set(sx * P / 2, 2.8 - P * 0.55 * Math.cos(0.9), sz_ * P / 2); g.add(lens); });
    label(["phone camera pixels", "four photosites, 1 µm → 10 m each, under red, green, green and blue filters",
      "each glass dome is a micro-lens funnelling light into its pixel", "a 50-megapixel sensor has 50 million of these: here it would be 80 km across"], new THREE.Vector3(118, 0, NZ + 9), 1.4);
    ladder.push({ name: "camera pixels", real: 1 * um, x: 118, z: NZ + 9 }); }
  // hard-drive bits: magnetised patches, with the read head flying over them
  { const g = new THREE.Group(); g.position.set(118, 0, NZ - 9); scene.add(g);
    const plat = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 4), M(0x7f8c8d, { metalness: 0.8, roughness: 0.3 })); plat.position.y = 0.15; g.add(plat);
    const bw = 0.25, bl = 0.5, nb = 0, bits = new THREE.InstancedMesh(new THREE.BoxGeometry(bw * 0.9, 0.02, bl * 0.9), M(0xffffff), 32 * 8); let k = 0;
    for (let i = 0; i < 32; i++) for (let j = 0; j < 8; j++) { O3.position.set(-4 + (i + 0.5) * bw, 0.31, -2 + (j + 0.5) * bl); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); bits.setMatrixAt(k, O3.matrix);
      bits.setColorAt(k++, C3.set(rnd() < 0.5 ? 0xc0392b : 0x2471a3)); }
    g.add(bits);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.3), M(0xd4ac0d, { metalness: 0.7 })); g.add(head);
    procAnim.push(t => { head.position.set(-3.8 + ((t * 0.6) % 7.6), 0.31 + 0.03 + 0.075, -2 + 3 * bl / 2 + 0.25); });   // flies 3 nm → 3 cm above
    label(["hard-drive bits", "each bit is a magnetised patch ~25 × 50 nm → 25 × 50 cm (red north, blue south: 1s and 0s)",
      "the gold read head flies over it only ~3 nm → 3 cm above the platter, at about 100 km/h real speed",
      "like a jumbo jet flying a centimetre off the ground"], new THREE.Vector3(118, 0, NZ - 9), 1.1);
    ladder.push({ name: "hard-drive bits", real: 50 * nm, x: 118, z: NZ - 9 }); }
  // IBM's logo spelled in 35 xenon atoms on nickel (Eigler & Schweizer, 1989)
  { const g = new THREE.Group(); plinth(130, NZ + 7, 1.0, 0.9); g.position.set(130, 1.0, NZ + 7); scene.add(g);
    const ni = [], xe = [], a = sz(0.249 * nm);
    for (let i = -14; i <= 14; i++) for (let j = -7; j <= 7; j++) ni.push(new THREE.Vector3(i * a, 0.006, j * a * 0.866 + (i % 2) * 0.5 * a * 0.866));
    const L = { I: ["X", "X", "X", "X", "X"], B: ["XX.", "X.X", "XX.", "X.X", "XX."], M: ["X...X", "XX.XX", "X.X.X", "X...X", "X...X"] };
    let ox = -11; for (const ch of "IBM") { const rows = L[ch]; rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === "X") xe.push(new THREE.Vector3((ox + x * 1.6) * a, 0.006 + sz(0.22 * nm), (y - 2) * 1.6 * a)); }));
      ox += rows[0].length * 1.6 + 2; }
    g.add(atoms(ni, sz(0.124 * nm), M(0x95a5a6, { metalness: 0.7 })), atoms(xe, sz(0.216 * nm), M(0x5dade2, { emissive: 0x0b3a5a })));
    label(["'IBM' in 35 xenon atoms", "in 1989 Don Eigler pushed single xenon atoms (blue) into place on nickel (grey)",
      "with a scanning tunnelling microscope: the letters are 5 nm → 5 cm tall", "the first time anyone built something one atom at a time"], new THREE.Vector3(130, 0, NZ + 7), 0.7);
    ladder.push({ name: "IBM xenon atoms", real: 5 * nm, x: 130, z: NZ + 7 }); }
  // pencil lead: graphite, sheets of graphene stacked 0.335 nm apart
  { const g = new THREE.Group(); plinth(136, NZ + 7, 1.0, 0.9); g.position.set(136, 1.0, NZ + 7); scene.add(g);
    const pts = [], a = 0.246 * nm, W = 12 * nm;
    for (let l = 0; l < 10; l++) for (let i = -30; i < 30; i++) for (let j = -30; j < 30; j++) for (const [bx, by] of [[0, 0], [a / 2, a / (2 * Math.sqrt(3))]]) {
      const x = i * a + j * a / 2 + bx + (l % 2) * a / 2, z = j * a * Math.sqrt(3) / 2 + by;
      if (Math.abs(x) < W / 2 && Math.abs(z) < W / 2) pts.push(new THREE.Vector3(sz(x), 0.01 + l * sz(0.335 * nm), sz(z))); }
    g.add(atoms(pts, sz(0.035 * nm), M(0x34495e)));
    label(["pencil lead (graphite)", "sheets of carbon hexagons, each one graphene, stacked 0.335 nm → 3.4 mm apart",
      "the sheets barely hold each other, so they slide off onto the paper: that's writing",
      `${pts.length.toLocaleString()} atoms in this 12 nm crumb`], new THREE.Vector3(136, 0, NZ + 7), 0.7);
    ladder.push({ name: "graphite", real: 12 * nm, x: 136, z: NZ + 7 }); }
  // a soap film: 1 µm at the bottom, draining to ~10 nm at the top just before it pops
  { const g = new THREE.Group(); g.position.set(140, 0, NZ - 10); scene.add(g);
    const W = 22, Hh = 14, seg = 60, geo = new THREE.BoxGeometry(W, Hh, 1, 40, seg, 1), p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) + Hh / 2, th = 10 * Math.pow(0.01, y / Hh);      // thickness here, m (10 m → 0.1 m)
      p.setZ(i, Math.sign(p.getZ(i)) * th / 2);
      const nmT = th / S * 1e9, hue = ((2 * 1.33 * nmT) % 600) / 600;              // interference colour from the optical path
      C3.setHSL(hue, 0.8, 0.55); col.set([C3.r, C3.g, C3.b], 3 * i); }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    const film = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.6, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    film.position.y = Hh / 2 + 0.3; g.add(film);
    label(["a soap film", "1 µm → 10 m thick at the bottom, draining to ~10 nm → 10 cm at the top, just before it pops",
      "light reflects off both faces; where the gap fits a wavelength, that colour brightens:", "the swirling colours of a bubble are its thickness, made visible"], new THREE.Vector3(140, 0, NZ - 10), 1.2);
    ladder.push({ name: "soap film", real: 1 * um, x: 140, z: NZ - 10 }); }
  // air: a cubic metre here holds the real number of molecules, flying at their real speed
  { const g = new THREE.Group(); g.position.set(150, 0, NZ + 7); scene.add(g); const B = 1.0, N = Math.round(2.5e25 / S ** 3 * B ** 3);
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(B, B, B)), new THREE.LineBasicMaterial({ color: 0x5d6d7e })); frame.position.y = 1.0 + B / 2; g.add(frame);
    plinth(150, NZ + 7, 1.0, 1.1);
    const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos.set([rr(-B / 2, B / 2), 1.0 + rr(0, B), rr(-B / 2, B / 2)], 3 * i);
      const v = new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(290); vel.set([v.x, v.y, v.z], 3 * i); }   // m/s real; mean speed ~470
    const ptsA = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)),
      new THREE.PointsMaterial({ color: 0xaed6f1, size: sz(0.36 * nm), sizeAttenuation: true })); g.add(ptsA);
    let last = 0;
    procAnim.push(t => { const dt_ = Math.min(0.05, t - last); last = t; if (!isNear(g.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 25)) return;
      const k = S * tau() * dt_; if (k * 500 > 0.5) return;                              // too fast to show: frozen
      for (let i = 0; i < N; i++) for (let c = 0; c < 3; c++) { let x = pos[3 * i + c] + vel[3 * i + c] * k; const lo = c === 1 ? 1.0 : -B / 2, hi = lo + B;
        if (x < lo || x > hi) { vel[3 * i + c] *= -1; x = Math.min(hi, Math.max(lo, x)); } pos[3 * i + c] = x; }
      ptsA.geometry.attributes.position.needsUpdate = true; });
    label(["air, at its real crowding", `${N.toLocaleString()} nitrogen and oxygen molecules in this 1 m³ box (1 µm³ real)`,
      "they're ~3.3 nm → 3.3 cm apart and fly ~68 nm → 68 cm between collisions",
      "at 1 ps per second (press 1) you see them drift at their real ~470 m/s"], new THREE.Vector3(150, 0, NZ + 7), 0.8);
    ladder.push({ name: "air molecules", real: 1 * um, x: 150, z: NZ + 7 }); }
}

// ==========================================================================================
//  THE WALK-IN CELL: a human cell settled on the glass, 20 µm across → 200 m. Enter it like
//  a walk-through aviary. The inside is thinned out: a real cell is too crowded to see into.
// ==========================================================================================
{
  const CX = 160, CZ = -470, RX = 108, RY = 50, CY = 20;             // a flattened dome: 216 m wide, ~70 m tall
  const floorR = RX * Math.sqrt(1 - (CY / RY) ** 2);                  // where the membrane meets the glass (~99 m)
  const mem = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 48), new THREE.MeshStandardMaterial({ color: 0xe8c9a0, transparent: true, opacity: 0.2,
    side: THREE.DoubleSide, depthWrite: false, clippingPlanes: ABOVE_GLASS }));
  mem.scale.set(RX, RY, RX); mem.position.set(CX, CY, CZ); scene.add(mem);
  const inside = (x, y, z) => ((x - CX) / RX) ** 2 + ((y - CY) / RY) ** 2 + ((z - CZ) / RX) ** 2 < 0.92 && y > 0.3;
  // the entrance pavilion where the path meets the membrane
  const DX = CX - floorR;
  { const stone = M(0xe8e1d0); for (const sz_ of [-3.5, 3.5]) { const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6, 0.6), stone); col.position.set(DX - 2, 3, CZ + sz_); scene.add(col); }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 8), stone); lintel.position.set(DX - 2, 6.4, CZ); scene.add(lintel);
    const tg = new THREE.CylinderGeometry(3.4, 3.4, 10, 32, 1, true, 0, Math.PI).rotateZ(Math.PI / 2);   // an arched tunnel along x, through the membrane
    const tunnel = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0xf5cba7, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    tunnel.position.set(DX + 3, 0, CZ); scene.add(tunnel);
    const sign = label(["ENTER A HUMAN CELL", "a typical cell, 20 µm across → 200 m: walk in through the membrane",
      "inside: the nucleus, ER, Golgi, mitochondria and the cytoskeleton", "(thinned out: in reality it's packed too tightly to see through)"],
      new THREE.Vector3(DX - 1.6, 8.6, CZ), 2.4, "banner"); sign.rotation.y = -Math.PI / 2; }   // faces you as you arrive
  // the nucleus, resting near the glass, with nuclear pores
  const NC = new THREE.Vector3(CX + 18, 24, CZ), NR = 30, NY = 18;
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), M(0x6a4c93, { roughness: 0.7 })); nuc.scale.set(NR, NY, NR); nuc.position.copy(NC); scene.add(nuc);
  { const n = 1800, pores = new THREE.InstancedMesh(new THREE.TorusGeometry(0.6, 0.18, 6, 12), M(0xd2b4de, { emissive: 0x2e1a3d }), n);
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, rad = Math.sqrt(1 - y * y), a = i * 2.39996, d = new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad);
      const p = new THREE.Vector3(d.x * NR, d.y * NY, d.z * NR).add(NC), nn = new THREE.Vector3(d.x / NR, d.y / NY, d.z / NR).normalize();
      O3.position.copy(p).addScaledVector(nn, 0.1); O3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nn); O3.scale.setScalar(1); O3.updateMatrix(); pores.setMatrixAt(i, O3.matrix); }
    scene.add(pores); }
  // rough ER: folded sheets around the nucleus, studded with ribosomes
  { const er = new THREE.MeshStandardMaterial({ color: 0xf1948a, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
    const ribPts = [];
    for (let l = 0; l < 5; l++) for (let s2 = 0; s2 < 6; s2++) { const r = 1.15 + l * 0.12, a0 = s2 / 6 * 6.283 + l * 0.4, geo = new THREE.SphereGeometry(1, 24, 12, a0, 0.8, 0.6 + l * 0.05, 1.6);
      const m = new THREE.Mesh(geo, er); m.scale.set(NR * r, NY * r, NR * r); m.position.copy(NC); scene.add(m);
      for (let k = 0; k < 140; k++) { const th = a0 + rnd() * 0.8, ph = 0.6 + l * 0.05 + rnd() * 1.6;
        const v = new THREE.Vector3(-Math.cos(th) * Math.sin(ph), Math.cos(ph), Math.sin(th) * Math.sin(ph));
        ribPts.push(new THREE.Vector3(v.x * NR * r, v.y * NY * r, v.z * NR * r).add(NC)); } }
    scene.add(atoms(ribPts.filter(p => p.y > 0.2), sz(REAL.ribosome) / 2, M(0x8e44ad))); }
  // the Golgi: a stack of curved flattened sacs, with vesicles budding off
  { const GX = CX - 30, GZ = CZ + 22;
    for (let i = 0; i < 6; i++) { const sac = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 8, 0, 6.283, 0, 0.5), new THREE.MeshStandardMaterial({ color: 0xf7dc6f, side: THREE.DoubleSide, roughness: 0.6 }));
      sac.scale.set(9 - i * 0.6, 4, 6 - i * 0.4); sac.position.set(GX, 4 + i * 1.1, GZ); scene.add(sac); }
    for (let i = 0; i < 14; i++) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), M(0xf9e79f)); v.position.set(GX + rr(-10, 10), rr(4, 12), GZ + rr(-8, 8)); scene.add(v); } }
  // mitochondria: many floating, two big ones cut open to show the inner folds (cristae)
  { const [mw, ml] = REAL.mito.map(sz), n = 90, mt = new THREE.InstancedMesh(new THREE.CapsuleGeometry(mw / 2, ml - mw, 6, 12), M(0xd35400), n); let k = 0;
    while (k < n) { const p = new THREE.Vector3(CX + rr(-90, 90), rr(2, 55), CZ + rr(-90, 90));
      if (!inside(p.x, p.y, p.z) || p.distanceTo(NC) < NR + 8 || (Math.abs(p.z - CZ) < 18 && p.y < 22 && p.x < NC.x)) continue;   // keep the walkway clear
      O3.position.copy(p); O3.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); O3.scale.setScalar(1); O3.updateMatrix(); mt.setMatrixAt(k++, O3.matrix); }
    scene.add(mt);
    for (const [mx, mz] of [[CX - 55, CZ - 10], [CX - 20, CZ + 14]]) { const g = new THREE.Group(); g.position.set(mx, 4, mz); scene.add(g);
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(4, 12, 8, 24, ), new THREE.MeshStandardMaterial({ color: 0xe67e22, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })));
      for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.25, 0.6), M(0xf0b27a)); c.position.set(0, -6.5 + i * 1.6, 0); c.rotation.y = Math.PI / 2; g.add(c); }
      g.rotation.z = Math.PI / 2; } }
  // the cytoskeleton: microtubules radiating from the centrosome, vesicles riding along them
  const CS = new THREE.Vector3(CX - 16, 10, CZ - 4), tubes = [];
  { const n = 46, mt = new THREE.InstancedMesh(new THREE.CylinderGeometry(sz(REAL.mtOuter) / 2, sz(REAL.mtOuter) / 2, 1, 6), M(0x5dade2), n);
    for (let i = 0; i < n; i++) { const d = new THREE.Vector3(gauss(), Math.abs(gauss()) * 0.5, gauss()).normalize(); let L = 2;
      while (inside(CS.x + d.x * (L + 2), CS.y + d.y * (L + 2), CS.z + d.z * (L + 2)) && L < 110) L += 2;
      O3.position.copy(CS).addScaledVector(d, L / 2); O3.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); O3.scale.set(1, L, 1); O3.updateMatrix(); mt.setMatrixAt(i, O3.matrix);
      tubes.push({ d, L }); }
    scene.add(mt);
    const cent = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 5, 9), M(0x1b4f72)); cent.position.copy(CS); scene.add(cent);
    const ves = tubes.slice(0, 24).map((tb, i) => { const v = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 8), M(i % 2 ? 0x58d68d : 0xf5b041)); scene.add(v); return { v, tb, ph: rnd(), out: i % 2 === 0 }; });
    procAnim.push(t => { if (camW.distanceTo(CS) > 140) return;
      for (const { v, tb, ph, out } of ves) { const u = (t * 0.03 + ph) % 1, f = out ? u : 1 - u; v.position.copy(CS).addScaledVector(tb.d, f * tb.L); } }); }
  // lysosomes and peroxisomes
  for (let i = 0; i < 18; i++) { let p; do { p = new THREE.Vector3(CX + rr(-80, 80), rr(2, 40), CZ + rr(-80, 80)); } while (!inside(p.x, p.y, p.z) || p.distanceTo(NC) < NR + 6);
    const l = new THREE.Mesh(new THREE.SphereGeometry(rr(1.5, 4), 16, 12), M(i % 3 ? 0x922b21 : 0x7d6608)); l.position.copy(p); scene.add(l); }
  // free ribosomes drifting through the cytoplasm (a few per cent of the real number)
  { const pts = []; while (pts.length < 14000) { const p = new THREE.Vector3(CX + rr(-95, 95), rr(0.5, 45), CZ + rr(-95, 95)); if (inside(p.x, p.y, p.z) && p.distanceTo(NC) > NR + 2) pts.push(p); }
    const rb = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts), new THREE.PointsMaterial({ color: 0xbb8fce, size: sz(REAL.ribosome), sizeAttenuation: true }));
    scene.add(rb); }
  // the path inside, and plaques
  path([[DX - 4, CZ], [CX - 62, CZ], [CX - 34, CZ - 6], [CX - 16, CZ - 8]], 3);
  path([[CX - 62, CZ], [CX - 40, CZ + 16], [CX - 30, CZ + 14]], 2.4);
  path([[CX - 34, CZ - 6], [CX - 22, CZ - 30], [CX + 10, CZ - 36], [CX + 40, CZ - 30]], 2.4);
  label(sizeLines("the nucleus", REAL.nucleus).concat(["holds 2 m of DNA (20,000 km here!) as chromatin",
    "each lilac ring is a nuclear pore, 120 nm → 1.2 m wide: the doors for RNA and proteins"]), new THREE.Vector3(CX - 13, 0, CZ - 8), 1.2);
  label(["the rough endoplasmic reticulum (pink sheets)", "folded membranes wrapped around the nucleus, studded with ribosomes (purple)",
    "proteins destined for export are built here, threaded straight into the sheets"], new THREE.Vector3(CX + 10, 0, CZ - 34), 1.1);
  label(["the Golgi apparatus (yellow stack)", "flattened sacs that sort, tag and package proteins",
    "the small spheres are vesicles budding off to deliver them"], new THREE.Vector3(CX - 33, 0, CZ + 14), 1.1);
  label(sizeLines("a mitochondrion, cut open", REAL.mito[1]).concat(["the power plant: its folded inner membrane (cristae) is lined with ATP synthase",
    "a cell like this has hundreds to thousands of them"]), new THREE.Vector3(CX - 55, 0, CZ - 2), 1.1);
  label(["the cytoskeleton", "microtubules (blue, 25 nm → 25 cm) radiate from the centrosome (dark cylinder)",
    "kinesin and dynein carry vesicles (orange, green) out and in along them"], new THREE.Vector3(CX - 16, 0, CZ - 12), 1.1);
  label(["inside a human cell", "everything here is at its real size, but thinned out:",
    "a real cell is so crowded (proteins fill ~30% of its volume) that you couldn't see a metre",
    "the faint purple dots are ribosomes; a real cell has about 10 million"], new THREE.Vector3(CX - 70, 0, CZ + 2), 1.2);
  ladder.push({ name: "inside a human cell", real: REAL.cell, x: CX - 30, z: CZ });
}

// ==========================================================================================
//  SPIDER SILK: a dragline strand ~4 µm thick (40 m here), cut open. Inside, β-sheet
//  nanocrystals (~2 × 5 × 7 nm) of poly-alanine sit in a stretchy glycine-rich matrix --
//  the crystals give strength, the tangle gives stretch.
// ==========================================================================================
{
  const NZ = -53, FX = 180, R = sz(2 * um), LEN = 80;               // the cut face is at x = FX, facing the path
  // the strand, lying on the slide
  const strand = new THREE.Mesh(new THREE.CylinderGeometry(R, R, LEN, 96, 1, true), M(0xf4f1e8, { roughness: 0.35, side: THREE.DoubleSide }));
  strand.rotation.z = Math.PI / 2; strand.position.set(FX + LEN / 2, R, NZ); scene.add(strand);
  // the cut face: a disc showing the nanofibrils (20 nm → 20 cm) end-on
  const cv = document.createElement("canvas"); cv.width = cv.height = 1024; const g2 = cv.getContext("2d");
  g2.fillStyle = "#d8cfb8"; g2.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26000; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 505;
    g2.fillStyle = `rgba(${rnd() < 0.5 ? "250,246,236" : "190,180,160"},0.9)`; g2.beginPath(); g2.arc(512 + Math.cos(a) * r, 512 + Math.sin(a) * r, 2.6, 0, 6.3); g2.fill(); }
  const ft = new THREE.CanvasTexture(cv); ft.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.8, side: THREE.DoubleSide }));
  face.rotation.y = -Math.PI / 2; face.position.set(FX + 0.05, R, NZ); scene.add(face);
  // a cutaway at the foot of the face: β-sheet nanocrystals in the amorphous matrix, at real density
  const box = { x0: FX - 3.2, x1: FX - 0.2, y0: 0.05, y1: 3.0, z0: NZ - 2.5, z1: NZ + 2.5 };
  const crystals = [], cs = 0.16;                                       // centres ~16 nm apart
  for (let x = box.x0 + cs / 2; x < box.x1; x += cs) for (let y = box.y0 + cs / 2; y < box.y1; y += cs) for (let z = box.z0 + cs / 2; z < box.z1; z += cs)
    if (rnd() < 0.55) crystals.push(new THREE.Vector3(x + rr(-0.03, 0.03), y + rr(-0.03, 0.03), z + rr(-0.03, 0.03)));
  const cm = new THREE.InstancedMesh(new THREE.BoxGeometry(sz(7 * nm), sz(2 * nm), sz(5 * nm)), M(0xd4ac0d, { roughness: 0.5 }), crystals.length);
  crystals.forEach((p, i) => { O3.position.copy(p); O3.rotation.set(rr(-0.15, 0.15), rr(-0.15, 0.15), rr(-0.15, 0.15)); O3.scale.setScalar(1); O3.updateMatrix(); cm.setMatrixAt(i, O3.matrix); });
  scene.add(cm);
  const chains = [];                                                    // loose chains linking neighbouring crystals
  for (let i = 0; i < crystals.length; i += 2) { const a = crystals[i], b = crystals[(i + 1 + Math.floor(rnd() * 6)) % crystals.length];
    if (a.distanceTo(b) > 0.4) continue; const m = a.clone().lerp(b, 0.5).add(new THREE.Vector3(rr(-0.05, 0.05), rr(-0.05, 0.05), rr(-0.05, 0.05)));
    chains.push(a, m, m, b); }
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(chains), new THREE.LineBasicMaterial({ color: 0x9c8f73 })));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(box.x1 - box.x0, box.y1 - box.y0, box.z1 - box.z0),
    new THREE.MeshStandardMaterial({ color: 0xf4f1e8, transparent: true, opacity: 0.12, depthWrite: false }));
  glass.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, NZ); scene.add(glass);
  // one nanocrystal on a plinth, residue by residue: an antiparallel β-pleated sheet stack
  { const PX = FX - 6, PZ = NZ + 4.5; plinth(PX, PZ, 1.0, 0.6);
    const g = new THREE.Group(); g.position.set(PX, 1.0 + 0.03, PZ); scene.add(g);
    const nRes = 20, rise = sz(0.35 * nm), dStrand = sz(0.47 * nm), pleat = sz(0.1 * nm), sheets = 4, strands = 6;
    const bb = M(0x7b241c), side = M(0x95a5a6), hb = new THREE.LineDashedMaterial({ color: 0x3498db, dashSize: 0.0015, gapSize: 0.001 });
    for (let k = 0; k < sheets; k++) { const y = k * sz((k % 2 ? 1.06 : 0.53) * nm) + (k > 1 ? sz(0.53 * nm) : 0);
      for (let j = 0; j < strands; j++) { const z = (j - strands / 2) * dStrand, pts = [];
        for (let i = 0; i <= nRes; i++) pts.push(new THREE.Vector3((i - nRes / 2) * rise * (j % 2 ? -1 : 1), y + (i % 2 ? pleat : -pleat), z));   // zig-zag: the pleat
        g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0), nRes * 3, sz(0.06 * nm), 5), bb));
        const head = new THREE.Mesh(new THREE.ConeGeometry(sz(0.12 * nm), sz(0.3 * nm), 6), bb);        // arrow: which way the strand runs
        head.position.copy(pts[nRes]); head.rotation.z = j % 2 ? Math.PI / 2 : -Math.PI / 2; g.add(head);
        for (let i = 0; i <= nRes; i++) { const sc = new THREE.Mesh(new THREE.SphereGeometry(sz(0.09 * nm), 6, 4), side);  // alanine side chains, alternately up and down
          sc.position.copy(pts[i]).add(new THREE.Vector3(0, (i % 2 ? 1 : -1) * sz(0.18 * nm), 0)); g.add(sc);
          if (j < strands - 1 && i % 2 === 0) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pts[i], pts[i].clone().add(new THREE.Vector3(0, 0, dStrand))]), hb);
            l.computeLineDistances(); g.add(l); } } } }
    label(["one β-sheet nanocrystal, residue by residue", "protein strands (dark red) lie side by side, running in alternate directions (arrows)",
      "hydrogen bonds (blue dashes) zip each strand to its neighbours, 0.47 nm → 4.7 mm apart",
      "the backbone zig-zags (the 'pleat'); alanine side chains (grey) point alternately up and down",
      "sheets stack on top of each other: a crystal ~7 nm → 7 cm long"], new THREE.Vector3(PX, 0, PZ), 0.75);
    ladder.push({ name: "β-pleated sheet", real: 7 * nm, x: PX, z: PZ }); }
  label(sizeLines("a strand of spider silk", 4 * um).concat(["dragline silk: by weight, stronger than steel and tougher than Kevlar",
    "the cut end shows it's a bundle of nanofibrils (20 nm → 20 cm)",
    "the glass case at its foot shows what's inside: β-sheet crystals (gold) tied together by loose chains"]), new THREE.Vector3(FX - 3, 0, NZ - 5), 1.4);
  label(["inside the silk: crystals and tangles", `${crystals.length.toLocaleString()} β-sheet nanocrystals (~2 × 5 × 7 nm → cm-sized gold blocks)`,
    "made of alanine-rich stretches that stack into sheets; they make silk strong",
    "the loose glycine-rich chains between them uncoil when it's pulled: that's why silk stretches"], new THREE.Vector3(FX - 2, 0, NZ + 3), 0.9);
  ladder.push({ name: "spider silk strand", real: 4 * um, x: FX, z: NZ });
}

// ==========================================================================================
//  INTERSTATE 75: the highway behind the museum. The museum is at the middle of the slide, so
//  the east and west edges are half of 75 mm away: 37.5 mm × 10⁷ = 375 km = 233 miles.
//  60 mph here is 26.8 m/s ÷ 10⁷ = 2.7 µm/s in reality: slower than a bacterium swims.
// ==========================================================================================
{
  const HZ = 46, L = 3000, MI = 1609.344, halfLenMi = 37.5e-3 * S / MI, halfWidMi = 12.5e-3 * S / MI;
  const realMph = 60 * 0.44704 / S;                                     // m/s real
  // asphalt with lane markings: two lanes each way, a median, shoulders
  const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256; const g = cv.getContext("2d");
  g.fillStyle = "#3a3d40"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},0.06)`; g.fillRect(rnd() * 512, rnd() * 256, 2, 2); }
  const yLine = (y, col, dash) => { g.fillStyle = col; for (let x = 0; x < 512; x += dash ? 64 : 512) g.fillRect(x, y, dash ? 32 : 512, 3); };
  yLine(14, "#f2f2f2"); yLine(64, "#f2f2f2", true); yLine(116, "#f1c40f"); yLine(140, "#f1c40f"); yLine(192, "#f2f2f2", true); yLine(242, "#f2f2f2");
  const tex = new THREE.CanvasTexture(cv); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(L / 24, 1); tex.anisotropy = 8; tex.colorSpace = THREE.SRGBColorSpace;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(L, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  road.position.set(0, 0.015, HZ); scene.add(road);
  for (const dz of [-10.4, 10.4]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(L, 0.35, 0.12), M(0xbdc3c7, { metalness: 0.7, roughness: 0.4 }));
    rail.position.set(0, 0.65, HZ + dz); scene.add(rail);
    const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), M(0x95a5a6), Math.floor(L / 4));
    for (let i = 0; i < posts.count; i++) { O3.position.set(-L / 2 + i * 4, 0.35, HZ + dz); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); posts.setMatrixAt(i, O3.matrix); }
    scene.add(posts); }
  // a sign board: green highway style, white text
  const board = (w, h, draw, x, y, z, ry = 0) => { const c = document.createElement("canvas"); c.width = 1024; c.height = Math.round(1024 * h / w);
    const b = c.getContext("2d"); draw(b, c.width, c.height); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
  const shield = (b, cx, cy, r) => { b.fillStyle = "#1f4e9c"; b.beginPath(); b.moveTo(cx - r, cy - r * 0.7); b.lineTo(cx + r, cy - r * 0.7); b.lineTo(cx + r, cy + 0.1 * r);
    b.quadraticCurveTo(cx + r, cy + r, cx, cy + r * 1.2); b.quadraticCurveTo(cx - r, cy + r, cx - r, cy + 0.1 * r); b.closePath(); b.fill();
    b.fillStyle = "#c0392b"; b.fillRect(cx - r, cy - r * 0.95, 2 * r, r * 0.3); b.fillStyle = "#fff"; b.font = `700 ${r * 0.24}px Helvetica`; b.textAlign = "center";
    b.fillText("INTERSTATE", cx, cy - r * 0.72); b.font = `700 ${r * 0.95}px Helvetica`; b.fillText("75", cx, cy + r * 0.55); };
  // the overhead gantry, one sign each way
  for (const [dir, sx] of [[1, -1], [-1, 1]]) {
    const gx = 18 * sx, faceZ = HZ - dir * 0.3;
    for (const dz of [-11, 11]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 8, 12), M(0x7f8c8d, { metalness: 0.6 })); pole.position.set(gx, 4, HZ + dz); scene.add(pole); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 22.5), M(0x7f8c8d, { metalness: 0.6 })); beam.position.set(gx, 7.7, HZ); scene.add(beam);
    board(11, 4.4, (b, W, H) => { b.fillStyle = "#006b3f"; b.fillRect(0, 0, W, H); b.strokeStyle = "#fff"; b.lineWidth = 10; b.strokeRect(14, 14, W - 28, H - 28);
        shield(b, 130, 175, 95); b.fillStyle = "#fff"; b.textAlign = "left";
        b.font = "700 74px Helvetica"; b.fillText(dir > 0 ? "EAST" : "WEST", 260, 120);
        b.font = "600 58px Helvetica"; b.fillText(`End of the State of`, 260, 205); b.fillText(`Microscope Slide`, 260, 272);
        b.font = "700 88px Helvetica"; b.textAlign = "right"; b.fillText(`${Math.round(halfLenMi)} mi`, W - 50, 318);
        b.font = "500 44px Helvetica"; b.fillText("here  ·  37.5 mm real", W - 50, 378); },
      gx - 0.3 * sx, 9.9, HZ, sx > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  // a speed-limit sign on each side, with its conversion
  for (const [x, z, ry] of [[-14, HZ - 12.5, Math.PI], [60, HZ + 12.5, Math.PI]]) {   // both face the museum side
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), M(0x95a5a6)); post.position.set(x, 1.6, z); scene.add(post);
    board(1.2, 1.55, (b, W, H) => { b.fillStyle = "#fff"; b.fillRect(0, 0, W, H); b.strokeStyle = "#111"; b.lineWidth = 14; b.strokeRect(20, 20, W - 40, H - 40);
        b.fillStyle = "#111"; b.textAlign = "center"; b.font = "700 130px Helvetica"; b.fillText("SPEED", W / 2, 230); b.fillText("LIMIT", W / 2, 390);
        b.font = "700 420px Helvetica"; b.fillText("60", W / 2, 780);
        b.font = "600 58px Helvetica"; b.fillText("mph here", W / 2, 860); b.fillText(`= ${(realMph * 1e6).toFixed(1)} µm/s real`, W / 2, 940);
        b.font = "500 52px Helvetica"; b.fillText("E. coli swims 9× faster", W / 2, 1040); b.fillText("(about 560 mph here)", W / 2, 1110); },
      x, 3.6, z + (ry ? -0.05 : 0.05), ry);
  }
  // a few cars doing the limit (60 mph = 26.8 m/s here, in clock time)
  const carCols = [0xc0392b, 0x2471a3, 0xf1c40f, 0xecf0f1, 0x27ae60];
  const cars = [...Array(8)].map((_, i) => { const c = new THREE.Group(), col = M(carCols[i % 5], { metalness: 0.5, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.8, 1.8), col); body.position.y = 0.65; c.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 1.6), M(0x2c3e50, { metalness: 0.3, roughness: 0.2 })); cab.position.set(-0.2, 1.35, 0); c.add(cab);
    for (const [wx, wz] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 12), M(0x111111));
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.34, wz); c.add(w); }
    scene.add(c); const east = i % 2 === 0; return { c, east, lane: east ? (i % 4 === 0 ? -6 : -2.4) : (i % 4 === 1 ? 2.4 : 6), ph: rnd() * 600 }; });
  procAnim.push(t => { if (Math.abs(camW.z - HZ) > 300) return;
    for (const { c, east, lane, ph } of cars) { const u = ((t * 26.8 + ph) % 600) - 300; c.position.set(camW.x + (east ? u : -u), 0, HZ + lane); c.rotation.y = east ? 0 : Math.PI; } });
  path([[1.2, 13], [1.2, HZ - 11]], 2.4);
  label(["Interstate 75 (because a slide is 75 mm long)", `the museum sits at the slide's centre: ${Math.round(halfLenMi)} miles to the east or west edge,`,
    `${Math.round(halfWidMi)} miles to the north or south edge (37.5 mm and 12.5 mm × 10⁷)`,
    `60 mph here = ${(realMph * 1e6).toFixed(1)} µm/s in reality -- a car here (4.6 m) would really be 460 nm long`,
    "one mile here is 161 µm real: about two human hairs side by side"], new THREE.Vector3(5, 0, HZ - 16), 1.3);
}

// ---------- the guide: jump to any hall ------------------------------------------------
window.museum = { rig, HALLS, renderer, scene, get mergeStatic() { return mergeStatic; } };                 // handy from the browser console
{
  const guide = document.getElementById("guide");
  guide.innerHTML = "<b>Museum guide</b>" + HALLS.map(h => `<button data-h="${h.id}"><i style="background:#${h.col.toString(16).padStart(6, "0")}"></i>${h.name}</button>`).join("");
  guide.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    const h = HALLS.find(x => x.id === b.dataset.h); leaveMacro(); rig.position.copy(h.entry);
    const d = h.look.clone().sub(h.entry); yaw = Math.atan2(-d.x, -d.z); pitch = -0.05; flying = true; start(); e.stopPropagation(); });
}

// ---------- time: real rates at a chosen time scale --------------------------------
const TAUS = [1e-18, 1e-17, 1e-16, 1e-15, 1e-14, 1e-13, 1e-12, 1e-11, 1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1];
const TAU_NAMES = ["1 attosecond", "10 as", "100 as", "1 femtosecond", "10 fs", "100 fs", "1 picosecond", "10 ps", "100 ps", "1 nanosecond", "10 ns", "100 ns", "1 microsecond",
  "10 µs", "100 µs", "1 millisecond", "10 ms", "100 ms", "1 second"];
let tauI = TAUS.indexOf(1e-12);            // start slow enough to see water move
const tau = () => TAUS[tauI];
// E. coli run-and-tumble: runs ~1 s straight, tumbles ~0.1 s to a new direction
const ecoliState = { dir: new THREE.Vector3(1, 0, 0), run: 1, tumble: 0 };

// ---------- moving: walk on the slide, or fly with the jetpack ---------------------
// start 2.5 m in front of the park map (at -6, 6.5, turned 0.6 rad), looking at it
rig.position.set(-6 + Math.sin(0.6) * 2.5, 0, 6.5 + Math.cos(0.6) * 2.5); let yaw = 0.6, pitch = -0.08, flying = true, speed = 2, vy = 0;
const keys = {};
addEventListener("keydown", e => {
  keys[e.code] = true; start();
  if (e.code === "BracketRight") tauI = Math.min(TAUS.length - 1, tauI + 1);
  if (e.code === "Digit0") tauI = TAUS.indexOf(1e-15); // 1 fs: light
  if (e.code === "Digit1") tauI = TAUS.indexOf(1e-12); // 1 ps: water
  if (e.code === "Digit2") tauI = TAUS.indexOf(1e-3); // 1 ms: bacteria, flagella
  if (e.code === "Digit3") tauI = TAUS.indexOf(1e-2); // 10 ms: motors, muscle
  if (e.code === "BracketLeft") tauI = Math.max(0, tauI - 1);
  if (e.code === "KeyF") flying = !flying;
  if (e.code === "Equal") speed = Math.min(800, speed * 2);
  if (e.code === "Minus") speed = Math.max(0.01, speed / 2);
});
addEventListener("keyup", e => keys[e.code] = false);
addEventListener("wheel", e => { speed = THREE.MathUtils.clamp(speed * (e.deltaY < 0 ? 1.25 : 0.8), 0.01, 800); });
let drag = false, lx = 0, ly = 0;
renderer.domElement.addEventListener("pointerdown", e => { drag = true; lx = e.clientX; ly = e.clientY; start(); });
addEventListener("pointerup", () => drag = false);
addEventListener("pointermove", e => { if (!drag) return;
  yaw -= (e.clientX - lx) * 0.004; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - ly) * 0.004, -1.5, 1.5);
  lx = e.clientX; ly = e.clientY; });
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); });
function start() { document.getElementById("intro")?.classList.add("gone"); }
const Q = new URLSearchParams(location.search);
if (Q.has("shot")) start();
if (Q.get("cam")) { const [x, y, z, yw, pt] = Q.get("cam").split(",").map(Number);
  rig.position.set(x, y, z); yaw = yw; pitch = pt || 0; }
if (Q.get("tau")) tauI = TAUS.indexOf(Number(Q.get("tau"))) >= 0 ? TAUS.indexOf(Number(Q.get("tau"))) : Number(Q.get("tau"));

// ==========================================================================================
//  VR (Quest 3). Nothing here runs on the desktop: it all starts when you press Enter VR.
// ==========================================================================================
// 1. merge everything that never moves into a few big meshes, one per look, so the headset
//    draws a few dozen batches instead of thousands of objects (visually identical)
let merged = false;
function mergeStatic() {
  if (merged) return; merged = true;
  scene.updateMatrixWorld(true);
  const skip = new Set([ECOLI, kinesin.g, dynein.g, SAR, FIB, NMJ, waterPts, MACRO, ...PLAQUES.map(p => p.g)]);
  const groups = new Map(), victims = [];
  const keyOf = m => [m.type, m.color?.getHex(), m.emissive?.getHex(), m.emissiveIntensity, m.roughness, m.metalness,
    m.flatShading, m.side, m.map?.uuid, m.vertexColors, m.wireframe].join("|");
  scene.traverse(o => {
    if (o.userData.dynamic || skip.has(o)) { o.traverse(c => c.userData.keep = true); return; }
  });
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    const m = o.material; if (Array.isArray(m) || m.transparent || m.isShaderMaterial || !o.visible) return;
    if (m.map && !o.geometry.attributes.uv) return;
    const k = keyOf(m); if (!groups.has(k)) groups.set(k, { mat: m, list: [] });
    groups.get(k).list.push(o); victims.push(o);
  });
  for (const { mat, list } of groups.values()) {
    if (list.length < 2) continue;
    let nv = 0, ni = 0; const useUV = !!mat.map;
    const geos = list.map(o => { const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (!g.attributes.normal) g.computeVertexNormals(); nv += g.attributes.position.count;
      ni += g.index ? g.index.count : g.attributes.position.count; return g; });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = useUV ? new Float32Array(nv * 2) : null, idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) { const n = g.attributes.position.count;
      pos.set(g.attributes.position.array.subarray(0, n * 3), vo * 3); nor.set(g.attributes.normal.array.subarray(0, n * 3), vo * 3);
      if (useUV) uv.set(g.attributes.uv.array.subarray(0, n * 2), vo * 2);
      if (g.index) { const src = g.index.array; for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo; io += src.length; }
      else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
      vo += n; g.dispose(); }
    const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); if (useUV) out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
    WORLD7.add(new THREE.Mesh(out, mat));
    for (const o of list) o.parent?.remove(o);
  }
}
// 2. the wrist display: what the desktop readout shows, on a panel above your left wrist
const wristCanvas = document.createElement("canvas"); wristCanvas.width = 640; wristCanvas.height = 400;
const wristTex = new THREE.CanvasTexture(wristCanvas); wristTex.colorSpace = THREE.SRGBColorSpace;
const wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), new THREE.MeshBasicMaterial({ map: wristTex, transparent: true, toneMapped: false }));
wrist.position.set(0, 0.07, 0.02); wrist.rotation.x = -1.0;
function drawWrist(v) {
  const g = wristCanvas.getContext("2d"), n = near.reduce((a, b) => b.pos.distanceTo(rig.position) < a.pos.distanceTo(rig.position) ? b : a);
  const hall = HALLS.slice().reverse().find(h => rig.position.z <= h.z0 + 1) || HALLS[0];
  g.fillStyle = "rgba(10,30,45,.88)"; g.fillRect(0, 0, 640, 400); g.strokeStyle = "#c9a227"; g.lineWidth = 6; g.strokeRect(3, 3, 634, 394);
  const line = (t, y, sz_, col = "#e6f3f9", w = 400) => { g.fillStyle = col; g.font = `${w} ${sz_}px -apple-system, Helvetica, sans-serif`; g.fillText(t, 22, y); };
  const k = inMacro ? 1e4 : S;
  line(inMacro ? "through the portal  ·  ×10,000" : `${hall.name}  ·  ×10,000,000`, 50, 34, "#ffffff", 700);
  line(`time: 1 s here = ${TAU_NAMES[tauI]}`, 100, 28);
  line(`speed ${fmt(v)}/s here = ${fmtReal(v / k)}/s real`, 145, 28);
  line(`(with time slowed to ${TAU_NAMES[tauI]}/s: ${fmtReal(v / k / tau())}/s)`, 172, 20, "#a9c6d4");
  const nn = inMacro ? nearMacro() : n;
  line(`nearest: ${nn.name}`, 195, 28, "#ffe9a8");
  line(`real ${fmtReal(nn.real)}  ·  here ${fmt(nn.real * k)}`, 237, 26);
  line("left stick fly · right stick: forward/back + turn · trigger fast", 300, 22, "#a9c6d4");
  line(`sticks: ${vrSticks}`, 375, 20, "#7f9fb0");
  g.fillStyle = fps >= 70 ? "#7dff9a" : fps >= 50 ? "#ffd166" : "#ff6b6b"; g.font = "700 30px -apple-system, Helvetica, sans-serif";
  g.fillText(`${fps.toFixed(0)} fps`, 500, 50);
  line("A / B  slower / faster time  ·  X / Y  previous / next hall", 335, 22, "#a9c6d4");
  wristTex.needsUpdate = true;
}
// 3. controllers: grips ride with the rig; the wrist panel goes on the left one
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip);
  grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
const vrBtn = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return;
  vrBtn.style.display = "block";
  vrBtn.onclick = async () => {
    vrBtn.textContent = "Preparing VR…"; await new Promise(r => setTimeout(r, 30));
    mergeStatic();
    const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0);
    renderer.xr.setFramebufferScaleFactor(0.8);              // fewer pixels per eye: steadier frame rate
    await renderer.xr.setSession(s); camera.position.y = 0; start(); vrBtn.textContent = "Enter VR";
    const far0 = camera.far, fog0 = scene.fog.density;
    camera.far = VR_FAR; camera.updateProjectionMatrix(); scene.fog.density = 0.006;   // draw less in the distance
    const slide = window.__slide, map0 = slide.material.map, geo0 = slide.geometry;    // plain glass: the fine speckle sparkles in a headset
    slide.material.map = null; slide.material.color.set(0xc9dde4); slide.material.needsUpdate = true;
    slide.geometry = new THREE.PlaneGeometry(VR_FAR * 3, VR_FAR * 3, 40, 40).rotateX(-Math.PI / 2);
    s.requestAnimationFrame(function f() { slide.position.x = rig.position.x; slide.position.z = rig.position.z; if (renderer.xr.isPresenting) s.requestAnimationFrame(f); });
    s.addEventListener("end", () => { camera.position.y = 1.65; rig.rotation.y = 0;
      camera.far = far0; camera.updateProjectionMatrix(); scene.fog.density = fog0;
      slide.material.map = map0; slide.material.color.set(0xdbe9ee); slide.material.needsUpdate = true;
      slide.geometry.dispose(); slide.geometry = geo0; slide.position.set(0, 0, 0); }); }; });
let snap = true, hallI = 0, vrSticks = "", fpsN = 0, fpsT = 0, fps = 0;
const VR_FAR = 260;                                       // metres drawn in VR
let animDt = 0, animFrame = 0;
const pressed = {};                                       // edge detection for controller buttons
const tap = (hand, i, gp) => { const k = hand + i, now = !!gp.buttons[i]?.pressed, was = pressed[k]; pressed[k] = now; return now && !was; };
function jumpToHall(i) { hallI = (i + HALLS.length) % HALLS.length; const h = HALLS[hallI]; leaveMacro();
  rig.position.copy(h.entry); const d = h.look.clone().sub(h.entry); rig.rotation.y = Math.atan2(-d.x, -d.z); }

// ---------- the readout --------------------------------------------------------------
const hud = document.getElementById("hud");
const near = [...ladder.map(l => ({ name: l.name, real: l.real, pos: new THREE.Vector3(l.x, 1, l.z ?? -3) })),
  { name: "E. coli", real: REAL.ecoliLen, pos: ECOLI.position }, { name: "animal cell", real: REAL.cell, pos: CELL.position },
  { name: "DNA helix", real: REAL.dnaWidth, pos: new THREE.Vector3(0, DY, 3) }];
function readout(v) {
  if (inMacro) return readoutMacro(v);
  const h = rig.position.y + camera.position.y, realSpeed = v / S / tau();
  const n = near.reduce((a, b) => b.pos.distanceTo(rig.position) < a.pos.distanceTo(rig.position) ? b : a);
  const dWater = Math.sqrt(6 * REAL.dWater * tau()) * S;        // rms 3D step of a water molecule, per second here
  hud.innerHTML = `<b>×10,000,000</b> &nbsp;·&nbsp; you are 1.7 m here = <b>170 nm</b> real<br>
    time: 1 second here = <b>${TAU_NAMES[tauI]}</b> real &nbsp;<span class="k">[ ]</span> or <span class="k">0</span> light · <span class="k">1</span> water · <span class="k">2</span> bacteria · <span class="k">3</span> motors &amp; muscle<br>
    ${flying ? "jetpack" : "walking"} <span class="k">F</span> &nbsp;·&nbsp; speed ${fmt(v)}/s here = <b>${fmtReal(v / S)}/s</b> real size
    <span class="dim">(with time slowed: ${fmtReal(realSpeed)}/s)</span>
    <span class="k">− =</span> or scroll<br>
    height above the slide: ${fmt(Math.max(0, h))} = ${fmtReal(Math.max(0, h) / S)}<br>
    nearest: <b>${n.name}</b> — real ${fmtReal(n.real)}, here ${fmt(sz(n.real))}<br>
    <span class="dim">a water molecule moves ~${fmt(dWater)} each second at this time scale
    ${dWater > 0.05 ? "— too fast to follow, shown frozen" : ""}</span>`;
}

// ---------- the grand entrance: an arch where the plaza becomes the avenue ----------------
{
  const AZ = -4.0, half = 2.9, Hp = 7.2, stone = M(0xe8e1d0, { roughness: 0.75 }), gold = M(0xc9a227, { metalness: 0.7, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const x = AVX + sx * half;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.9), stone); base.position.set(x, 0.25, AZ); scene.add(base);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, Hp, 20), stone); col.position.set(x, 0.5 + Hp / 2, AZ); scene.add(col);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.85), stone); cap.position.set(x, 0.5 + Hp + 0.15, AZ); scene.add(cap);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), gold); orb.position.set(x, 0.5 + Hp + 0.6, AZ); scene.add(orb);   // an atom, finial-sized
    for (let k = 0; k < 3; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 40), gold);
      ring.position.copy(orb.position); ring.rotation.set(k * 1.05, k * 0.6, 0); scene.add(ring); }
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(half, 0.22, 12, 48, Math.PI), stone); arch.position.set(AVX, 0.5 + Hp, AZ); scene.add(arch);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(2 * half + 0.6, 0.25, 0.4), gold); beam.position.set(AVX, 0.5 + Hp - 2.4, AZ); scene.add(beam);
  label(["TEN MILLION TIMES BIGGER", "If an atom were a grain of sand…",
         "everything in this park is 10,000,000 × its real size", "1 nanometre → 1 centimetre  ·  1 micrometre → 10 metres"],
    new THREE.Vector3(AVX, 0.5 + Hp - 1.35, AZ + 0.45), 3.2, "banner");   // fits between the pillars, in front of them
}
// ---------- the flag of the State of Microscope Slide --------------------------------
const wallAnim = [];                                   // things that move with clock time, not the time scale
{
  const FX = -9.2, FZ = 3.6, poleH = 8;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, poleH, 12), M(0xbfc5ca, { metalness: 0.8, roughness: 0.3 }));
  pole.position.set(FX, poleH / 2, FZ); scene.add(pole);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), M(0xc9a227, { metalness: 0.8 })); top.position.set(FX, poleH + 0.1, FZ); scene.add(top);
  const c = document.createElement("canvas"); c.width = 900; c.height = 600; const g = c.getContext("2d");
  g.fillStyle = "#1f4e8c"; g.fillRect(0, 0, 900, 600);                                   // field
  g.fillStyle = "#e6eef3"; g.fillRect(0, 0, 900, 70); g.fillRect(0, 530, 900, 70);       // the slide's frosted ends, as stripes
  g.save(); g.translate(450, 300);
  g.fillStyle = "rgba(220,240,250,.92)"; g.strokeStyle = "#c9a227"; g.lineWidth = 8;   // the slide itself, 3:1
  g.fillRect(-270, -90, 540, 180); g.strokeRect(-270, -90, 540, 180);
  g.fillStyle = "#f4d03f"; g.beginPath(); g.arc(0, 0, 18, 0, 6.3); g.fill();          // the nucleus of an atom on the slide
  g.strokeStyle = "#c0392b"; g.lineWidth = 5;
  for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(0, 0, 70, 24, k * Math.PI / 3, 0, 6.3); g.stroke(); }
  g.fillStyle = "#ffffff"; g.font = "700 38px Georgia, serif"; g.textAlign = "center";
  g.fillText("STATE OF MICROSCOPE SLIDE", 0, -125); g.font = "italic 30px Georgia, serif"; g.fillText("Ex Parvis Magna", 0, 150);
  g.restore();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const FW = 3.0, FH = 2.0, geo = new THREE.PlaneGeometry(FW, FH, 24, 12); geo.translate(FW / 2, 0, 0);
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(FX + 0.06, poleH - FH / 2 - 0.15, FZ); flag.rotation.y = -0.3; scene.add(flag);
  const base = geo.attributes.position.array.slice();
  wallAnim.push(t => { const p = geo.attributes.position.array;              // a gentle ripple, stronger toward the fly end
    for (let i = 0; i < p.length; i += 3) { const x = base[i], u = x / FW;
      p[i + 2] = Math.sin(x * 2.2 - t * 3.0) * 0.12 * u + Math.sin(base[i + 1] * 3 - t * 2.1) * 0.03 * u; }
    geo.attributes.position.needsUpdate = true; });
  label(["the flag of the State of Microscope Slide", "a 75 × 25 mm glass slide at ×10⁷ is 750 × 250 km:",
         "187,500 km², about the area of Washington State (shaped more like Tennessee)",
         "and its 1 mm of thickness is 10 km deep · motto: Ex Parvis Magna, 'from small things, great'"],
    new THREE.Vector3(FX, 0, FZ), 0.9);
}

placePlaques();

// ==========================================================================================
//  THE PORTAL: step in and grow 1,000 times. Everything you saw becomes 1,000 times smaller,
//  so the world is ×10,000 instead of ×10,000,000: a micrometre is 1 cm, a millimetre 10 m.
//  The whole museum (about 240 µm across, really) shrinks to a 2.4 m patch on the glass,
//  and the slide itself becomes a glass slab 750 × 250 m and 10 m thick, on a lab bench.
//  Both worlds are built at once; only one is shown. The patch is a picture of the museum
//  taken from above the first time you step through.
// ==========================================================================================
const WORLD7 = new THREE.Group();                      // everything built so far: the ×10⁷ museum
for (const o of [...scene.children]) if (o !== rig && !o.isLight) WORLD7.add(o);
scene.add(WORLD7);
const MACRO = new THREE.Group(); MACRO.visible = false; scene.add(MACRO);
const K4 = 1e4;                                        // the macro world's magnification
const PORTAL = new THREE.Vector3(11, 0, 3);            // on the east side of the entrance plaza
const BACK = new THREE.Vector3(14.5, 0, 4.2);          // the way home, beside the shrunken museum
const SLAB = { cx: PORTAL.x, cz: PORTAL.z, L: 75e-3 * K4, W: 25e-3 * K4, T: 1e-3 * K4 };   // 750 × 250 × 10 m
const AIRCOL = new THREE.Color(0xcfe3ee), macroFog = new THREE.FogExp2(0xcfe3ee, 0.0012), museumFog = scene.fog;
const MACRO_SOLIDS = [];                                // things you can stand on: { in(x, z), h }
function macroGround(x, z) {                           // a solid exhibit, the top of the slab, or 10 m down on the bench
  for (const o of MACRO_SOLIDS) if (o.in(x, z)) return typeof o.h === "function" ? o.h(x, z) : o.h;
  return Math.abs(x - SLAB.cx) < SLAB.L / 2 && Math.abs(z - SLAB.cz) < SLAB.W / 2 ? 0 : -SLAB.T; }
function portalGate(parent, pos, ry, col, lines) {     // a ring you walk through, with a swirl inside
  const g = new THREE.Group(); g.position.copy(pos); g.rotation.y = ry; parent.add(g);
  const gold = M(col, { metalness: 0.7, roughness: 0.3, emissive: col, emissiveIntensity: 0.15 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.11, 16, 64), gold); ring.position.y = 1.45; g.add(ring);
  for (const sx of [-1, 1]) { const foot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.6), M(0x34495e)); foot.position.set(sx * 1.05, 0.15, 0); g.add(foot); }
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const gr = x.createRadialGradient(128, 128, 4, 128, 128, 128); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(0.5, "rgba(140,200,255,.55)"); gr.addColorStop(1, "rgba(60,90,200,.25)");
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 5;
  for (let k = 0; k < 4; k++) { x.beginPath(); for (let a = 0; a < 9; a += 0.05) { const r = 6 + a * 13; x.lineTo(128 + r * Math.cos(a + k * 1.571), 128 + r * Math.sin(a + k * 1.571)); } x.stroke(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.15, 48), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  disc.position.y = 1.45; g.add(disc); procAnim.push(t => { disc.rotation.z = -t * 0.9; });
  const sign = label(lines, new THREE.Vector3(0, 3.35, 0), 1.6, "banner"); sign.position.set(0, 0, 0); g.add(sign);
  return g; }
portalGate(WORLD7, PORTAL, -Math.PI / 2, 0xc9a227, ["PORTAL: GROW 1,000 TIMES", "step in to see the world at ×10,000 instead of ×10,000,000",
  "this whole museum will shrink to a 2.4 m patch at your feet"]);
// the slide at ×10⁴: clear glass with a frosted label end, green at its cut edges
{ const glass = new THREE.MeshStandardMaterial({ color: 0xdcebf0, roughness: 0.06, metalness: 0.1 }), edge = M(0x9fd3c3, { roughness: 0.2 }),
    frost = M(0xf3f5f4, { roughness: 0.95 }), FL = SLAB.L * 20 / 75;   // the frosted label end: 20 mm of the 75
  const clearL = SLAB.L - FL;
  const a = new THREE.Mesh(new THREE.BoxGeometry(clearL, SLAB.T, SLAB.W, 110, 1, 50), [edge, edge, glass, glass, edge, edge]);   // fine grid: see the slide
  a.position.set(SLAB.cx - FL / 2, -SLAB.T / 2, SLAB.cz); MACRO.add(a);
  const b = new THREE.Mesh(new THREE.BoxGeometry(FL, SLAB.T, SLAB.W, 40, 1, 50), [edge, edge, frost, frost, edge, edge]);
  b.position.set(SLAB.cx + clearL / 2, -SLAB.T / 2, SLAB.cz); MACRO.add(b);
  const bench = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000, 100, 100).rotateX(-Math.PI / 2), M(0x2e3338, { roughness: 0.6 }));
  bench.position.y = -SLAB.T - 0.05; MACRO.add(bench); }
// the shrunken museum: a picture from straight above, scaled 1/1000 about the portal
const MINI = { cx: 0, cz: -500, W: 2400 };              // museum metres pictured: x -1200..1200, z -1700..700
const miniMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
{ const w = MINI.W / 1000, plane = new THREE.Mesh(new THREE.PlaneGeometry(w, w).rotateX(-Math.PI / 2), miniMat);
  plane.position.set(PORTAL.x + (MINI.cx - PORTAL.x) / 1000, 0.02, PORTAL.z + (MINI.cz - PORTAL.z) / 1000); MACRO.add(plane);
  // the water it all sits in: a shallow puddle (the museum is under water; ~8 µm deep here is 8 cm)
  const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({
    color: 0x9cc4d8, transparent: true, opacity: 0.28, roughness: 0.05, depthWrite: false }));
  drop.scale.set(w * 0.78, 0.08, w * 0.78); drop.position.copy(plane.position).setY(0.02); MACRO.add(drop); }
// the museum's human hair, 80 µm thick: 0.8 m here, 20 m long, with its cuticle -- overlapping
// flat scale cells whose free edges are ~6 µm apart (6 cm here), each ~0.5 µm thick
{ const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  g.fillStyle = "#4a3020"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 8; k++) { const y0 = k * 64 + 10;                 // 8 scale edges per tile, wavy and uneven
    g.fillStyle = "rgba(20,10,5,.55)"; g.strokeStyle = "rgba(140,100,70,.8)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y0);
    for (let x = 0; x <= 512; x += 16) g.lineTo(x, y0 + 7 * Math.sin(x * 0.0245 + k * 1.7) + 4 * Math.sin(x * 0.07 + k));
    g.stroke(); g.lineTo(512, y0 + 18); g.lineTo(0, y0 + 18); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const R = 80e-6 * K4 / 2, L = 20000 / 1000; tex.repeat.set(4, L / (8 * 0.06));   // 8 edges per tile, one per 6 cm
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 64, 1), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
  hair.rotation.set(0, 0.35, Math.PI / 2);
  hair.position.set(PORTAL.x + (0 - PORTAL.x) / 1000, R, PORTAL.z + (-1150 - PORTAL.z) / 1000); MACRO.add(hair); }
// ---------- THE ×10,000 MUSEUM: small animals, big enough that their cells are fist-sized ----------
// A walkway runs south from where you arrive. Animals move at their real speed here (clock time):
// the museum's time setting slows molecules, which would freeze anything this big.
const MACRO_EX = [];                                  // { name, real, pos } for the readout
const macroSign = (lines, x, z, ry, y = 2.2, scale = 1.6) => {   // a board on two posts, facing +z turned by ry
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; MACRO.add(g);
  const b = label(lines, new THREE.Vector3(0, y, 0), scale, "banner"); b.position.set(0, 0, 0); g.add(b);
  const w = THREE.MathUtils.clamp(scale * 1.6, 0.8, 5) / 2;
  for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, y, 8), M(0x34495e));
    post.position.set(sx * w, y / 2, -0.06); g.add(post); }
  return g; };
const macroPath = (pts, w = 3) => {                    // a paved walkway on the glass, 3 cm up
  const P = pts.map(([x, z]) => new THREE.Vector2(x, z)), pos = [], uv = [], idx = []; let run = 0;
  P.forEach((q, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], t = b.clone().sub(a).normalize(), n = new THREE.Vector2(-t.y, t.x);
    if (i) run += q.distanceTo(P[i - 1]);
    pos.push(q.x + n.x * w / 2, 0.03, q.y + n.y * w / 2, q.x - n.x * w / 2, 0.03, q.y - n.y * w / 2); uv.push(0, run / w, 1, run / w);
    if (i) { const k = 2 * i; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); } });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  MACRO.add(new THREE.Mesh(g, pathMat)); };
macroPath([[PORTAL.x, PORTAL.z + 3.6], [PORTAL.x, PORTAL.z + 90]]);
macroSign(["THE ×10,000 MUSEUM", "tiny animals, big enough to walk around",
  "at this scale a cell is 1–10 cm: you can see what they are made of", "the exhibits are straight ahead, along the walkway"], PORTAL.x, PORTAL.z + 8, Math.PI, 3.0, 2.2);
MACRO_EX.push({ name: "the museum you came from", real: 240e-6, pos: new THREE.Vector3(PORTAL.x, 0, PORTAL.z - 0.5) },
  { name: "a human hair", real: 80e-6, pos: new THREE.Vector3(PORTAL.x, 0, PORTAL.z - 1.15) });

// the tardigrade (water bear), Hypsibius-like: 0.4 mm long → 4 m. About 1,000 cells. Its cuticle is
// see-through, so you see storage cells (~12 µm → 12 cm) drifting in the body cavity, the gut green
// with algae, the eggs, the muscular pharynx and its two stylets, two eyespots, and four claws on
// each of its eight stubby legs (claws ~10 µm → 10 cm). It walks ~80 µm/s (0.8 m/s here).
{
  const TC = new THREE.Vector3(PORTAL.x + 10, 0, PORTAL.z + 17), TR = 6, TV = 0.8, STEP = 1.4;   // arena centre, circle radius, speed m/s, steps/s
  const tg = new THREE.Group(); MACRO.add(tg);
  const body = new THREE.Group(); body.position.y = 0.62; tg.add(body);
  // the cuticle: a lathe along x with four shallow segment grooves; the snout end (+x) narrower
  const prof = []; for (let i = 0; i <= 48; i++) { const x = -2 + 4 * i / 48, u = 1 - (x / 2) ** 2;
    const r = 0.55 * Math.pow(Math.max(u, 0), 0.42) * (1 - 0.07 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (x + 2) / 0.8))) * (x > 1.2 ? 1 - 0.3 * (x - 1.2) / 0.8 : 1);
    prof.push(new THREE.Vector2(Math.max(r, 0.001), x)); }
  const cg = new THREE.LatheGeometry(prof, 40).rotateZ(-Math.PI / 2); cg.scale(1, 0.86, 1);
  const cut = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0xe8d9b0, transparent: true, opacity: 0.36, roughness: 0.35, depthWrite: false }));
  cut.renderOrder = 2; body.add(cut);
  const inside = (x, y, z) => (x / 1.8) ** 2 + (y / 0.38) ** 2 + (z / 0.44) ** 2 < 1;
  // gut: green-brown with eaten algae; eggs above it at the back; brain and pharynx in the head
  const gut = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), M(0x5f7a2e, { roughness: 0.7 })); gut.scale.set(1.1, 0.2, 0.24); gut.position.set(-0.2, -0.02, 0); body.add(gut);
  for (const [x, z] of [[-0.55, 0.08], [-0.85, -0.1], [-1.12, 0.05]]) { const egg = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M(0xf3e5c0, { roughness: 0.5 })); egg.position.set(x, 0.2, z); body.add(egg); }
  const brain = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0xe8d6c8)); brain.scale.set(0.16, 0.11, 0.2); brain.position.set(1.5, 0.16, 0); body.add(brain);
  const phar = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), M(0xa0524a, { roughness: 0.5 })); phar.position.set(1.28, -0.04, 0); body.add(phar);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8).rotateZ(Math.PI / 2), M(0xe0d0b0)); tube.position.set(1.66, -0.05, 0); body.add(tube);
  for (const sz_ of [-1, 1]) { const sty = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.42, 6).rotateZ(Math.PI / 2), M(0x8a6d3b));
    sty.position.set(1.64, -0.02, sz_ * 0.05); sty.rotation.y = sz_ * 0.12; body.add(sty);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M(0x111111)); eye.position.set(1.66, 0.2, sz_ * 0.19); body.add(eye); }
  // storage cells, free in the body cavity
  { const pts = []; while (pts.length < 170) { const x = (rnd() * 2 - 1) * 1.8, y = (rnd() * 2 - 1) * 0.38, z = (rnd() * 2 - 1) * 0.44;
      if (!inside(x, y, z) || ((x + 0.2) / 1.2) ** 2 + (y / 0.25) ** 2 + (z / 0.3) ** 2 < 1 || x > 1.1) continue; pts.push([x, y, z]); }
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 9), M(0xd9853b, { roughness: 0.55 }), pts.length);
    pts.forEach(([x, y, z], i) => { O3.position.set(x, y, z); O3.rotation.set(0, 0, 0); O3.scale.setScalar(0.04 + rnd() * 0.02); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); });
    body.add(im); }
  // eight lobopod legs: three pairs under the body, the fourth pair at the back pointing backward
  const legMat = new THREE.MeshStandardMaterial({ color: 0xe8d9b0, transparent: true, opacity: 0.55, roughness: 0.4, depthWrite: false });
  const clawMat = M(0x8a6d3b, { roughness: 0.4 }), LL = 0.36;
  const legGeo = new THREE.CylinderGeometry(0.15, 0.1, LL, 12).translate(0, -LL / 2, 0);
  const clawGeo = new THREE.ConeGeometry(0.014, 0.1, 6).translate(0, -0.05, 0);
  const legs = [];
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const hip = new THREE.Group(), rear = i === 3;
    hip.position.set(rear ? -1.72 : 1.0 - i * 0.8, rear ? -0.12 : -0.28, sd * (rear ? 0.25 : 0.36)); body.add(hip);
    const leg = new THREE.Mesh(legGeo, legMat); leg.renderOrder = 1; hip.add(leg);
    for (let c = 0; c < 4; c++) { const cl = new THREE.Mesh(clawGeo, clawMat); cl.position.set(0, -LL + 0.02, 0);
      cl.rotation.set((c % 2 ? 1 : -1) * 0.35 * sd, 0, (c < 2 ? 0.45 : -0.15)); leg.add(cl); }
    legs.push({ hip, sd, i, rear }); }
  tg.position.copy(TC);
  procAnim.push(t => {
    if (!inMacro) return;
    const a = t * TV / TR, dx = -Math.sin(a), dz = Math.cos(a);
    tg.position.set(TC.x + TR * Math.cos(a), 0, TC.z + TR * Math.sin(a)); tg.rotation.y = Math.atan2(-dz, dx);
    body.position.y = 0.62 + 0.012 * Math.sin(t * STEP * 4 * Math.PI);
    for (const L of legs) { const ph = t * STEP * 2 * Math.PI - L.i * 1.1 + (L.sd > 0 ? Math.PI : 0), sw = Math.sin(ph);
      if (L.rear) L.hip.rotation.set(-L.sd * 0.25, 0, -1.05 + 0.2 * sw);
      else L.hip.rotation.set(-L.sd * (0.38 + 0.1 * Math.max(0, Math.cos(ph))), 0, 0.38 * sw); } });
  MACRO_EX.push({ name: "tardigrade", real: 0.4e-3, pos: tg.position });
  // the arena: a low rail round its walk
  const rail = new THREE.Mesh(new THREE.TorusGeometry(TR + 2.2, 0.035, 8, 120).rotateX(Math.PI / 2), M(0xc9a227, { metalness: 0.6, roughness: 0.35 }));
  rail.position.set(TC.x, 0.75, TC.z); MACRO.add(rail);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8).translate(0, 0.375, 0), M(0x34495e), 36);
  for (let k = 0; k < 36; k++) { const q = k / 36 * Math.PI * 2; O3.position.set(TC.x + (TR + 2.2) * Math.cos(q), 0, TC.z + (TR + 2.2) * Math.sin(q));
    O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); posts.setMatrixAt(k, O3.matrix); }
  MACRO.add(posts);
  macroSign(["tardigrade (water bear)", "real 0.4 mm  ·  here 4 m  ·  about 1,000 cells",
    "orange: storage cells drifting in its body cavity (~12 µm → 12 cm)",
    "green: the gut, full of the plant cells it sucks dry through two stylets",
    "cream: eggs  ·  red: the muscular pharynx that pumps its food  ·  black: two eyespots",
    "8 stubby legs, each with 4 claws (10 µm → 10 cm)  ·  walking at its real speed, ~80 µm/s",
    "dried out it curls into a 'tun' and can survive for years"], PORTAL.x + 2.3, TC.z, -Math.PI / 2, 2.0, 1.7);
}

// helpers for the exhibits below
const arenaRail = (c, r) => {                          // a low railed ring on the glass
  const rail = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 8, 120).rotateX(Math.PI / 2), M(0xc9a227, { metalness: 0.6, roughness: 0.35 }));
  rail.position.set(c.x, 0.75, c.z); MACRO.add(rail);
  const n = Math.round(r * 4.4), posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8).translate(0, 0.375, 0), M(0x34495e), n);
  for (let k = 0; k < n; k++) { const q = k / n * Math.PI * 2; O3.position.set(c.x + r * Math.cos(q), 0, c.z + r * Math.sin(q));
    O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); posts.setMatrixAt(k, O3.matrix); }
  MACRO.add(posts); };
const limb = (A, B, r1, r2, mat, parent, joint = true) => {   // a tapered cylinder from A (radius r1) to B (r2)
  const d = B.clone().sub(A), L = d.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, L, 10), mat);
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); parent.add(m);
  if (joint) { const j = new THREE.Mesh(new THREE.SphereGeometry(r2 * 1.05, 10, 8), mat); j.position.copy(B); parent.add(j); }
  return m; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const canvasTex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t; };
const WEST = Math.PI / 2, EASTF = -Math.PI / 2;        // sign turns: facing +x (on the west side) / facing -x (east side)

// C. elegans: 1 mm → 10 m, 65 µm wide → 0.65 m; exactly 959 cells in the adult hermaphrodite.
// It crawls on its side in a wave, the body following its own track; ~0.15 mm/s (1.6 m/s here).
// Each purple dot is the nucleus of one cell (2–3 µm → 2–3 cm).
{
  const EC = V3(PORTAL.x - 12.5, 0, PORTAL.z + 17), R0 = 5.2, L = 10, A = 0.9, LAM = 6, V = 1.6, RAD = 0.33, NS = 140, NR = 16;
  const track = s => { const a = s / R0, r = R0 + A * Math.sin(2 * Math.PI * s / LAM); return V3(EC.x + r * Math.cos(a), RAD + 0.01, EC.z + r * Math.sin(a)); };
  const radAt = u => RAD * Math.max(0.05, Math.min(1, Math.pow(u / 0.3, 0.8)) * Math.min(1, Math.pow((1 - u) / 0.05, 0.5)));
  const pos = new Float32Array((NS + 1) * NR * 3), nor = new Float32Array(pos.length), idx = [];
  for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b = i * NR + (j + 1) % NR; idx.push(a, a + NR, b, b, a + NR, b + NR); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setIndex(idx);
  const worm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xece6d6, transparent: true, opacity: 0.3, roughness: 0.3, depthWrite: false, side: THREE.DoubleSide }));
  worm.frustumCulled = false; worm.renderOrder = 2; MACRO.add(worm);
  const parts = [];                                    // things inside, fixed in body coordinates (u along, angle, fraction of radius)
  const mk = (n, geo_, mat, place) => { const im = new THREE.InstancedMesh(geo_, mat, n); im.frustumCulled = false; MACRO.add(im);
    for (let k = 0; k < n; k++) parts.push({ im, k, ...place(k) }); };
  mk(959, new THREE.SphereGeometry(0.028, 8, 6), M(0x7d6aa0), () => ({ u: 0.02 + rnd() * 0.96, th: rnd() * 6.283, rr: 0.35 + rnd() * 0.55, s: 1 }));
  mk(64, new THREE.SphereGeometry(0.11, 12, 8), M(0x8b6b45, { roughness: 0.7 }), k => ({ u: 0.12 + k * 0.012, th: 0, rr: 0, s: 1 }));   // the intestine
  mk(10, new THREE.SphereGeometry(1, 14, 10), M(0xf3e5c0), k => ({ u: 0.4 + 0.022 * k, th: k % 2 ? 1.57 : -1.57, rr: 0.4, s: [0.25, 0.15, 0.15] }));   // eggs, 50 × 30 µm
  mk(2, new THREE.SphereGeometry(1, 14, 10), M(0xa0524a), k => ({ u: k ? 0.95 : 0.885, th: 0, rr: 0, s: k ? 0.11 : 0.14 }));             // pharynx: median and terminal bulbs
  const C = [], T = [], N = []; for (let i = 0; i <= NS; i++) { C.push(V3(0, 0, 0)); T.push(V3(0, 0, 0)); N.push(V3(0, 0, 0)); }
  const up = V3(0, 1, 0), X1 = V3(1, 0, 0), q = new THREE.Quaternion();
  const head = V3(0, 0, 0);
  procAnim.push(t => {
    if (!inMacro) return;
    const h = V * t + L;
    for (let i = 0; i <= NS; i++) C[i].copy(track(h - L * (1 - i / NS)));
    for (let i = 0; i <= NS; i++) { T[i].subVectors(C[Math.min(NS, i + 1)], C[Math.max(0, i - 1)]).normalize(); N[i].crossVectors(up, T[i]).normalize(); }
    for (let i = 0; i <= NS; i++) { const r = radAt(i / NS);
      for (let j = 0; j < NR; j++) { const a = j / NR * 6.283, cx = Math.cos(a), sy = Math.sin(a), o = (i * NR + j) * 3;
        const nx = cx * N[i].x, ny = sy, nz = cx * N[i].z;
        pos[o] = C[i].x + r * nx; pos[o + 1] = C[i].y + r * ny; pos[o + 2] = C[i].z + r * nz; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; } }
    geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true;
    for (const p_ of parts) { const i = Math.round(p_.u * NS), r = radAt(p_.u) * p_.rr, cx = Math.cos(p_.th), sy = Math.sin(p_.th);
      O3.position.set(C[i].x + r * cx * N[i].x, C[i].y + r * sy, C[i].z + r * cx * N[i].z);
      O3.quaternion.copy(q.setFromUnitVectors(X1, T[i])); if (Array.isArray(p_.s)) O3.scale.set(...p_.s); else O3.scale.setScalar(p_.s);
      O3.updateMatrix(); p_.im.setMatrixAt(p_.k, O3.matrix); }
    for (const im of new Set(parts.map(p_ => p_.im))) im.instanceMatrix.needsUpdate = true;
    head.copy(C[NS]); });
  arenaRail(EC, R0 + A + 1.4);
  MACRO_EX.push({ name: "C. elegans (a nematode worm)", real: 1e-3, pos: head });
  macroSign(["C. elegans, a nematode worm", "real 1 mm  ·  here 10 m  ·  exactly 959 cells (not counting eggs and sperm)",
    "each purple dot is the nucleus of one cell (2–3 µm → 2–3 cm)",
    "brown: the intestine  ·  cream: eggs (50 µm → 50 cm)  ·  red: the pharynx bulbs that pump in bacteria",
    "it crawls on its side, its body following its own wavy track, at its real speed (~0.15 mm/s)",
    "the first animal to have every cell's ancestry and every nerve connection mapped"], PORTAL.x - 2.3, EC.z, WEST, 2.0, 1.7);
}

// the house dust mite: 0.3 mm → 3 m, an arachnid. Ridged cuticle, no eyes, breathes through its skin.
// Around it: the skin flakes it eats (one dead cell each, ~40 µm → 40 cm) and its droppings.
{
  const MC = V3(PORTAL.x + 13, 0, PORTAL.z + 58);
  const mite = new THREE.Group(); mite.position.copy(MC); mite.rotation.y = 2.4; MACRO.add(mite);
  const ridges = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#efe6d2"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(140,115,80,.55)"; g.lineWidth = 2.5;
    for (let k = 0; k < 64; k++) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, k * 8 + 3 * Math.sin(x * 0.03 + k * 0.4)); g.stroke(); } }, [5, 3]);
  const skin = new THREE.MeshStandardMaterial({ map: ridges, roughness: 0.5 }), legM = M(0xd9c39a, { roughness: 0.5 }), hairM = M(0xbfa27a);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 28), skin); body.scale.set(1.5, 0.75, 1.05); body.position.y = 1.0; mite.add(body);
  const front = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), skin); front.scale.set(0.7, 0.55, 0.75); front.position.set(1.0, 1.08, 0); mite.add(front);
  const gnath = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0xc9a77a)); gnath.scale.set(0.35, 0.22, 0.28); gnath.position.set(1.72, 0.88, 0); mite.add(gnath);
  for (const sd of [-1, 1]) limb(V3(1.9, 0.9, sd * 0.08), V3(2.15, 0.82, sd * 0.1), 0.06, 0.03, M(0xb08a5a), mite);   // chelicerae
  for (const [x, fw] of [[1.15, 0.7], [0.6, 0.35], [-0.5, -0.35], [-1.0, -0.7]]) for (const sd of [-1, 1]) {
    const a = V3(x, 0.75, sd * 0.85), k = V3(x + fw * 0.5, 1.25, sd * 1.6), f = V3(x + fw, 0.04, sd * 2.05);
    limb(a, k, 0.11, 0.08, legM, mite); limb(k, f, 0.08, 0.05, legM, mite); }
  for (const [x, y, z, dx, dy, dz, L] of [[-1.45, 1.0, 0.25, -1, 0.1, 0.2, 1.6], [-1.45, 1.0, -0.25, -1, 0.1, -0.2, 1.6], [-1.2, 1.4, 0.5, -0.6, 0.6, 0.5, 0.7],
      [-1.2, 1.4, -0.5, -0.6, 0.6, -0.5, 0.7], [0.2, 1.65, 0.6, 0, 1, 0.4, 0.5], [0.2, 1.65, -0.6, 0, 1, -0.4, 0.5], [1.2, 1.5, 0.3, 0.6, 0.8, 0.3, 0.45], [1.2, 1.5, -0.3, 0.6, 0.8, -0.3, 0.45]]) {
    const a = V3(x, y, z), d = V3(dx, dy, dz).normalize(); limb(a, a.clone().addScaledVector(d, L), 0.014, 0.006, hairM, mite, false); }
  for (let k = 0; k < 5; k++) { const sh = new THREE.Shape(), R = 0.25 + rnd() * 0.2, n = 6 + (k % 3);   // skin flakes: flat polygons, 5 mm thick
    for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd() * 0.3, r = R * (0.75 + rnd() * 0.3); i ? sh.lineTo(r * Math.cos(a), r * Math.sin(a)) : sh.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    const fl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }).rotateX(-Math.PI / 2), M(0xf1e2cf, { roughness: 0.8 }));
    const a = k * 1.3 + 0.5; fl.position.set(MC.x + 3 * Math.cos(a), 0.01, MC.z + 3 * Math.sin(a)); fl.rotation.y = rnd() * 6; MACRO.add(fl); }
  for (let k = 0; k < 6; k++) { const r = 0.1 + rnd() * 0.05, pel = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), M(0x6e4b2a, { roughness: 0.9 }));
    const a = k * 1.05 + 2.2; pel.position.set(MC.x + 2.4 * Math.cos(a), r, MC.z + 2.4 * Math.sin(a)); MACRO.add(pel); }
  arenaRail(MC, 4.2);
  MACRO_EX.push({ name: "house dust mite", real: 0.3e-3, pos: MC });
  macroSign(["house dust mite", "real 0.3 mm  ·  here 3 m  ·  an arachnid: 8 legs, like spiders and ticks",
    "its cuticle is ridged like a fingerprint (ridges ~1–2 µm → 1–2 cm); no eyes; it breathes through its skin",
    "it eats the skin flakes we shed: each flake is one dead cell (~40 µm → 40 cm)",
    "brown balls: its droppings (10–40 µm), carrying the protein most dust allergies react to"], PORTAL.x + 2.3, MC.z, EASTF, 2.0, 1.7);
}

// a worker ant, 5 mm → 50 m, standing over the walkway: walk under it. Its compound eyes are made of
// ommatidia ~20 µm across (20 cm here), each a tiny eye of about 8 cells.
{
  const ant = new THREE.Group(); ant.position.set(PORTAL.x, 0, PORTAL.z + 97); ant.rotation.y = Math.PI / 2; MACRO.add(ant);   // head to the north
  const shell = M(0x2a1d17, { roughness: 0.32, metalness: 0.15 }), legA = M(0x3a281e, { roughness: 0.4 });
  const blob = (x, y, z, sx, sy, sz_, rz = 0, mat = shell) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat); m.scale.set(sx, sy, sz_); m.position.set(x, y, z); m.rotation.z = rz; ant.add(m); return m; };
  blob(-14, 11, 0, 9, 6.5, 7, 0.12);                  // gaster
  blob(-4.6, 12.4, 0, 1.4, 2.4, 1.6);                 // petiole node
  blob(4, 12, 0, 8, 3.6, 3.4, -0.12);                 // mesosoma
  blob(14.5, 14, 0, 4.8, 4.4, 4.6);                   // head
  const facets = canvasTex(256, 256, (g, w) => { g.fillStyle = "#1a1410"; g.fillRect(0, 0, w, w); const r = 16;
    for (let row = 0; row < 12; row++) for (let col = 0; col < 10; col++) { const cx = col * r * 1.732 + (row % 2) * r * 0.866, cy = row * r * 1.5;
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; g.lineTo(cx + r * 0.93 * Math.cos(a), cy + r * 0.93 * Math.sin(a)); }
      const gr = g.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, r); gr.addColorStop(0, "#8a7a6a"); gr.addColorStop(1, "#2a2018"); g.fillStyle = gr; g.fill(); } }, [6, 3]);
  for (const sd of [-1, 1]) {
    const eye = blob(15.6, 15.4, sd * 4.15, 1.7, 1.45, 0.9, 0, new THREE.MeshStandardMaterial({ map: facets, roughness: 0.25, metalness: 0.2 }));
    const mand = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 8).rotateZ(-Math.PI / 2), shell); mand.position.set(20.2, 11.6, sd * 1.7); mand.rotation.y = sd * 0.45; ant.add(mand);
    const ag = new THREE.Group(); ag.position.set(17.5, 16.8, sd * 1.8); ant.add(ag);            // antenna: scape to the elbow, then the funiculus
    const el = V3(3.6, 7.2, sd * 4.6), tip = V3(13.5, 4.6, sd * 9.4);
    limb(V3(0, 0, 0), el, 0.55, 0.45, legA, ag); limb(el, tip, 0.45, 0.55, legA, ag);
    procAnim.push(t => { if (inMacro) ag.rotation.set(0.08 * Math.sin(t * 1.3 + sd), 0.1 * Math.sin(t * 0.9 + sd * 2), 0.06 * Math.sin(t * 1.7)); });
    for (const [x, kx, ax, tx] of [[7.5, 4, 9, 14], [4, 0, 1, 2], [0.5, -5, -13, -19]]) {   // coxa → knee → ankle → foot
      const c = V3(x, 9.6, sd * 2.2), k = V3(x + kx, 15.5, sd * 13), a = V3(x + ax, 4.5, sd * 22), f = V3(x + tx, 0.25, sd * 27);
      limb(c, k, 1.1, 0.85, legA, ant); limb(k, a, 0.75, 0.55, legA, ant); limb(a, f, 0.45, 0.28, legA, ant); } }
  MACRO_EX.push({ name: "worker ant", real: 5e-3, pos: V3(PORTAL.x, 12, PORTAL.z + 97) });
  macroSign(["a worker ant", "real 5 mm  ·  here 50 m  ·  you can walk under it", "its compound eyes are made of facets ~20 µm across (20 cm here): each facet is a tiny eye of ~8 cells",
    "it smells and touches with its elbowed antennae, and carries ~10–50× its own weight",
    "an ant runs ~3 cm/s: at this scale that is 300 m/s, nearly the speed of sound"], PORTAL.x + 2.3, PORTAL.z + 70, EASTF, 2.2, 1.8);
}

// a piece of a grass blade lying on the glass: 4 × 4 mm, 0.25 mm thick → 40 × 40 m, 2.5 m thick.
// The top: long epidermal cells in files, with rows of stomata (dumbbell guard cells, ~30 µm → 30 cm).
// The cut end: epidermis, green mesophyll cells packed with chloroplasts, and veins.
{
  const GX0 = PORTAL.x - 56, GX1 = PORTAL.x - 16, GZ0 = PORTAL.z + 25, GZ1 = PORTAL.z + 65, GT = 2.5;
  const top = canvasTex(1024, 1024, (g, w, h) => {      // 2 m across × 4 m along: 512 px/m across, 256 px/m along
    g.fillStyle = "#a9d27a"; g.fillRect(0, 0, w, h);
    for (let f = 0; f < 10; f++) { const x0 = f * 102.4; let y = (f * 137) % 300 - 300;
      while (y < h) { const len = 256 + ((f * 7919 + y * 31) % 512 + 512) % 512, isSt = f === 3 || f === 7;
        g.fillStyle = `hsl(${88 + (f % 3) * 4},45%,${66 + (y % 5)}%)`; g.fillRect(x0 + 3, y + 3, 96, len - 6);
        g.strokeStyle = "#5f8f3a"; g.lineWidth = 4; g.strokeRect(x0 + 2, y + 2, 98, len - 4);
        if (isSt) for (let sy = y + 60; sy < y + len - 90; sy += 150) {            // a stoma: two dumbbell guard cells between subsidiary cells
          g.fillStyle = "#c9e3a6"; g.beginPath(); g.ellipse(x0 + 51, sy + 38, 44, 44, 0, 0, 6.283); g.fill();
          g.fillStyle = "#4f8a2e"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(x0 + 51 + sd * 9, sy + 38, 8, 36, 0, 0, 6.283); g.fill(); }
          g.fillStyle = "#2d4a1c"; g.fillRect(x0 + 49, sy + 10, 4, 56); }
        y += len; } } }, [20, 10]);
  const sect = canvasTex(4096, 256, (g, w, h) => {      // 40 m × 2.5 m: ~102 px/m
    g.fillStyle = "#6d9a45"; g.fillRect(0, 0, w, h);
    const cell = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.strokeStyle = "#3f6a22"; g.lineWidth = 1.5; g.stroke(); };
    for (let y = 40; y < h - 40; y += 16) for (let x = (y % 32) / 2; x < w; x += 17) {   // mesophyll with chloroplasts
      cell(x + rnd() * 3, y + rnd() * 3, 7 + rnd() * 2, "#79b84a"); g.fillStyle = "#2f6b1c"; for (let k = 0; k < 4; k++) g.fillRect(x - 5 + rnd() * 9, y - 5 + rnd() * 9, 2.5, 2.5); }
    for (const [y0, y1] of [[0, 22], [h - 22, h]]) for (let x = 0; x < w; x += 22) { g.fillStyle = "#cfe8b0"; g.fillRect(x + 1, y0 + 1, 20, y1 - y0 - 2);
      g.strokeStyle = "#5f8f3a"; g.lineWidth = 2; g.strokeRect(x + 1, y0 + 1, 20, y1 - y0 - 2); }
    for (let x = 160; x < w; x += 330) {                   // veins: bundle sheath ring, big xylem vessels, phloem
      cell(x, h / 2, 62, "#dbe9c4"); for (let a = 0; a < 6.28; a += 0.33) cell(x + 55 * Math.cos(a), h / 2 + 55 * Math.sin(a), 11, "#b9d98e");
      cell(x - 18, h / 2 - 10, 13, "#f3f0e2"); cell(x + 18, h / 2 - 10, 13, "#f3f0e2"); for (let k = 0; k < 7; k++) cell(x - 15 + k * 5, h / 2 + 22, 4, "#e8dcc0"); }
    for (let x = 90; x < w; x += 240) { g.fillStyle = "#2b3b20"; g.fillRect(x, h - 22, 6, 22); g.fillStyle = "#4a6a30"; g.beginPath(); g.ellipse(x + 3, h - 34, 16, 10, 0, 0, 6.283); g.fill(); }   // stomata below, with air chambers
  });
  const side = M(0x7fae55, { roughness: 0.6 }), topM = new THREE.MeshStandardMaterial({ map: top, roughness: 0.55 }), endM = new THREE.MeshStandardMaterial({ map: sect, roughness: 0.6 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(GX1 - GX0, GT, GZ1 - GZ0, 20, 1, 20), [side, side, topM, side, endM, endM]);
  blade.position.set((GX0 + GX1) / 2, GT / 2, (GZ0 + GZ1) / 2); MACRO.add(blade);
  MACRO_SOLIDS.push({ in: (x, z) => x > GX0 && x < GX1 && z > GZ0 && z < GZ1, h: GT });
  MACRO_EX.push({ name: "a piece of a grass blade", real: 4e-3, pos: V3(GX1, 0, (GZ0 + GZ1) / 2) });
  macroSign(["a piece of a grass blade", "real 4 × 4 mm, 0.25 mm thick  ·  here 40 × 40 m, 2.5 m thick",
    "the top is paved with long epidermal cells (0.1–0.3 mm → 1–3 m) in neat files",
    "rows of stomata: pairs of dumbbell-shaped guard cells (~30 µm → 30 cm) that open to let CO₂ in",
    "the cut end (north) shows the inside: green mesophyll cells full of chloroplasts, and the veins",
    "each vein looks like a face (two big xylem vessels over the phloem): botanists call it the 'monkey face'",
    "fly up (jetpack) and walk on it"], PORTAL.x - 2.3, GZ0 + 6, WEST, 2.0, 1.7);
}

// along the path to the penny: everyday tiny things
macroPath([[PORTAL.x + 1.5, PORTAL.z + 42], [PORTAL.x + 69, PORTAL.z + 42]]);
{
  const Z = PORTAL.z + 36, SZ = PORTAL.z + 39.8;
  const smallSign = (x, lines) => macroSign(lines, x, SZ, 0, 1.6, 1.0);
  const salt = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial({ color: 0xf4f8fb, roughness: 0.15, transparent: true, opacity: 0.82 }));
  salt.position.set(PORTAL.x + 11, 1.5, Z - 1); salt.rotation.y = 0.35; MACRO.add(salt);
  smallSign(PORTAL.x + 11, ["a grain of table salt", "real 0.3 mm  ·  here 3 m", "a cube, because its sodium and chloride ions stack in a cubic lattice"]);
  const sg = new THREE.IcosahedronGeometry(2.5, 4), sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) { const v = V3(sp.getX(i), sp.getY(i), sp.getZ(i)).normalize();
    const r = 2.5 * (1 + 0.13 * Math.sin(3 * v.x + 1) * Math.sin(2 * v.y + 2) * Math.sin(4 * v.z) + 0.06 * Math.sin(7 * v.x + 3 * v.z)) * (v.y < 0 ? 0.8 : 1);
    sp.setXYZ(i, v.x * r * 1.15, v.y * r * 0.85, v.z * r); }
  sg.computeVertexNormals();
  const sand = new THREE.Mesh(sg, M(0xd2b48c, { roughness: 0.9 })); sand.position.set(PORTAL.x + 21, 1.75, Z - 1.5); MACRO.add(sand);
  smallSign(PORTAL.x + 21, ["a grain of sand (quartz)", "real 0.5 mm  ·  here 5 m", "worn round by water and wind over thousands of years"]);
  const plinth4 = (x, h = 1) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 0.8), M(0xe5ecef, { roughness: 0.8 })); b.position.set(x, h / 2, Z); MACRO.add(b); return h; };
  { const x = PORTAL.x + 31, h = plinth4(x);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), M(0xf4c430, { roughness: 0.6 })); sun.position.set(x - 0.35, h + 0.2, Z); MACRO.add(sun);
    const spine = new THREE.ConeGeometry(0.018, 0.06, 6).translate(0, 0.03, 0);
    const sps = new THREE.InstancedMesh(spine, M(0xe0a820), 60); for (let k = 0; k < 60; k++) { const y = 1 - 2 * (k + 0.5) / 60, r = Math.sqrt(1 - y * y), a = k * 2.4;
      const d = V3(Math.cos(a) * r, y, Math.sin(a) * r); O3.position.copy(sun.position).addScaledVector(d, 0.145); O3.quaternion.setFromUnitVectors(V3(0, 1, 0), d); O3.scale.setScalar(1); O3.updateMatrix(); sps.setMatrixAt(k, O3.matrix); }
    MACRO.add(sps);
    const pine = new THREE.Group(); pine.position.set(x + 0.3, h + 0.28, Z); MACRO.add(pine);
    const pb = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), M(0xe6c86e)); pb.scale.set(0.24, 0.17, 0.2); pine.add(pb);
    for (const sd of [-1, 1]) { const sac = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), new THREE.MeshStandardMaterial({ color: 0xf2e2a8, transparent: true, opacity: 0.75 })); sac.position.set(sd * 0.27, -0.05, 0); pine.add(sac); }
    smallSign(x, ["pollen grains", "sunflower: 30 µm → 30 cm, spiky to cling to bees", "pine: 70 µm → 70 cm, with two air sacs to ride the wind"]); }
  { const x = PORTAL.x + 42, E = V3(x, 0.78, Z);       // a human egg in its zona pellucida, with corona cells, and sperm
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.6, 40, 28), M(0xf2d7b6, { roughness: 0.7 })); egg.position.copy(E); MACRO.add(egg);
    const zona = new THREE.Mesh(new THREE.SphereGeometry(0.75, 40, 28), new THREE.MeshStandardMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.1 }));
    zona.position.copy(E); MACRO.add(zona);
    const cor = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), M(0xf5e6d0), 46);
    for (let k = 0; k < 46; k++) { const y = 1 - 2 * (k + 0.5) / 46, r = Math.sqrt(1 - y * y), a = k * 2.4; O3.position.set(E.x + 0.84 * r * Math.cos(a), E.y + 0.84 * y, E.z + 0.84 * r * Math.sin(a));
      O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); cor.setMatrixAt(k, O3.matrix); }
    MACRO.add(cor);
    for (let k = 0; k < 4; k++) { const a = -0.5 + k * 0.55, dir = V3(Math.cos(a), 0, Math.sin(a) + 0.6).normalize(), H = E.clone().addScaledVector(dir, 0.95).setY(0.45 + 0.12 * k);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M(0xd8c8f0)); hd.scale.set(0.05, 0.03, 0.015); hd.position.copy(H);
      hd.quaternion.setFromUnitVectors(V3(1, 0, 0), dir.clone().negate()); MACRO.add(hd);
      const tp = new Float32Array(31 * 3), tl = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(tp, 3)), new THREE.LineBasicMaterial({ color: 0xb8a8d8 }));
      tl.frustumCulled = false; MACRO.add(tl);
      procAnim.push(t => { if (!inMacro) return; const side_ = V3(-dir.z, 0, dir.x);
        for (let i = 0; i <= 30; i++) { const d = 0.04 + i / 30 * 0.5, w = 0.04 * (i / 30) * Math.sin(i / 30 * 9 - t * 12 + k);
          tp[i * 3] = H.x + dir.x * d + side_.x * w; tp[i * 3 + 1] = H.y; tp[i * 3 + 2] = H.z + dir.z * d + side_.z * w; }
        tl.geometry.attributes.position.needsUpdate = true; }); }
    smallSign(x, ["a human egg cell, with sperm", "egg 120 µm → 1.2 m: the largest human cell, just visible to the eye",
      "its clear shell (zona pellucida) is 15 µm → 15 cm  ·  sperm head 5 µm → 5 cm, tail 50 µm → 50 cm"]);
    MACRO_EX.push({ name: "human egg cell", real: 120e-6, pos: E }); }
  { const x = PORTAL.x + 52, h = plinth4(x), prof = [];  // red blood cells: biconcave discs
    for (let i = 0; i <= 16; i++) { const r = 0.0375 * i / 16, th = 0.0125 * (0.35 + 1.6 * (r / 0.0375) ** 2) * Math.sqrt(Math.max(0, 1 - (r / 0.0375) ** 2)) + 0.002; prof.push(new THREE.Vector2(r, th)); }
    for (let i = 16; i >= 0; i--) prof.push(new THREE.Vector2(prof[i].x, -prof[i].y));
    const rbcG = new THREE.LatheGeometry(prof, 32), rbcM = M(0xc0392b, { roughness: 0.55 });
    for (let k = 0; k < 7; k++) { const c = new THREE.Mesh(rbcG, rbcM); c.position.set(x - 0.5 + (k % 4) * 0.14, h + 0.015, Z - 0.15 + Math.floor(k / 4) * 0.2); MACRO.add(c); }
    for (let k = 0; k < 9; k++) { const c = new THREE.Mesh(rbcG, rbcM); c.rotation.z = Math.PI / 2; c.position.set(x + 0.25 + k * 0.026, h + 0.04, Z); MACRO.add(c); }   // a rouleau, stacked like coins
    smallSign(x, ["red blood cells", "real 7.5 µm  ·  here 7.5 cm  ·  dimpled discs with no nucleus",
      "you have about 25 trillion; in the museum you came from, one was 75 m across"]);
    MACRO_EX.push({ name: "red blood cells", real: 7.5e-6, pos: V3(x, 1, Z) }); }
  MACRO_EX.push({ name: "a grain of salt", real: 0.3e-3, pos: salt.position }, { name: "a grain of sand", real: 0.5e-3, pos: sand.position });
}

// a US penny: 19.05 mm across, 1.52 mm thick → 190 m across, 15 m tall. Land on it with the jetpack.
{
  const PC = V3(PORTAL.x + 164, 0, PORTAL.z + 27), PR = 19.05e-3 / 2 * K4, PT = 1.52e-3 * K4;
  const face = (shade) => canvasTex(2048, 2048, (g, w) => {   // the 2010- reverse: union shield, ONE CENT scroll, lettering
    const base = shade ? "#5a5a5a" : "#b8693a", hi = shade ? "#ffffff" : "#e09a62", lo = shade ? "#3a3a3a" : "#8e4a26";
    g.fillStyle = base; g.fillRect(0, 0, w, w); const c = w / 2;
    g.strokeStyle = hi; g.lineWidth = 46; g.beginPath(); g.arc(c, c, c * 0.955, 0, 6.283); g.stroke();
    g.fillStyle = hi; g.font = "700 118px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const arc = (txt, r, a0, a1) => { const n = txt.length; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n;
      g.save(); g.translate(c + r * Math.cos(a), c + r * Math.sin(a)); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore(); } };
    arc("UNITED STATES OF AMERICA", c * 0.8, -Math.PI * 0.92, -Math.PI * 0.08);
    g.font = "700 96px Georgia, serif"; g.fillText("E · PLURIBUS · UNUM", c, c * 0.52);
    const sx = c * 0.48, top = c * 0.68, bot = c * 1.62;      // the shield
    g.beginPath(); g.moveTo(c - sx, top); g.lineTo(c + sx, top); g.lineTo(c + sx, c * 1.25); g.quadraticCurveTo(c + sx, bot - 120, c, bot); g.quadraticCurveTo(c - sx, bot - 120, c - sx, c * 1.25); g.closePath();
    g.save(); g.clip(); g.fillStyle = lo; g.fillRect(0, 0, w, w); g.fillStyle = hi; g.fillRect(c - sx, top, 2 * sx, c * 0.22);
    for (let k = 0; k < 13; k++) { const x = c - sx + (k + 0.15) * 2 * sx / 13; g.fillRect(x, top + c * 0.22, 2 * sx / 13 * 0.6, bot); } g.restore();
    g.strokeStyle = hi; g.lineWidth = 18; g.stroke();
    g.fillStyle = shade ? "#e0e0e0" : "#d88c55"; g.beginPath(); g.moveTo(c - c * 0.72, c * 1.02); g.quadraticCurveTo(c, c * 0.92, c + c * 0.72, c * 1.02);   // the scroll
    g.lineTo(c + c * 0.72, c * 1.2); g.quadraticCurveTo(c, c * 1.1, c - c * 0.72, c * 1.2); g.closePath(); g.fill();
    g.fillStyle = lo; g.font = "700 120px Georgia, serif"; g.fillText("ONE CENT", c, c * 1.09); });
  const copper = M(0xc27a48, { metalness: 0.35, roughness: 0.42 });   // not very metallic: with nothing to reflect, real metal settings look black
  const topM = new THREE.MeshStandardMaterial({ map: face(false), bumpMap: face(true), bumpScale: 4, metalness: 0.35, roughness: 0.4 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, PT, 256, 1), [copper, topM, copper]);
  coin.position.set(PC.x, PT / 2, PC.z); coin.rotation.y = 0; MACRO.add(coin);   // the design reads from the west, where the path arrives
  MACRO_SOLIDS.push({ in: (x, z) => Math.hypot(x - PC.x, z - PC.z) < PR, h: PT });
  MACRO_EX.push({ name: "a US penny", real: 19.05e-3, pos: V3(PC.x - PR, 0, PC.z) });
  macroSign(["a US penny (one cent)", "real 19 mm across, 1.5 mm thick  ·  here 190 m across and 15 m tall",
    "its letters are ~1 mm tall → 10 m: the museum you came from (2.4 m) would fit inside the O of ONE",
    "the copper is only a skin ~10 µm thick (10 cm here) over a zinc core",
    "fly up with the jetpack (F, then space) and land on it"], PORTAL.x + 66, PORTAL.z + 38.5, EASTF, 2.4, 2.0);
}

// ---------- the east lane: a red clover mite, a fruit fly's eyes, a head louse on a hair ----------
macroPath([[PORTAL.x + 1.5, PORTAL.z + 51], [PORTAL.x + 67, PORTAL.z + 51]]);
const SOUTHF = Math.PI;                                // sign turn: facing -z (north), seen from a path to its north
// clover mite (Bryobia): the tiny red mite on walls and pavements. 0.75 mm → 7.5 m. Front legs longer
// than the body, used as feelers; fan-shaped bristles on the back; all of them female.
{
  const CC = V3(PORTAL.x + 33, 0, PORTAL.z + 63), cm = new THREE.Group(); cm.position.copy(CC); cm.rotation.y = 0.3; MACRO.add(cm);   // facing east
  const red = M(0xb3261e, { roughness: 0.45 }), legR = M(0xc0392b, { roughness: 0.5 }), fanM = M(0xe8b4a8, { side: THREE.DoubleSide });
  const b = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), red); b.scale.set(3.6, 1.4, 2.5); b.position.y = 2.0; cm.add(b);
  const gn = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0x8e1b14)); gn.scale.set(0.8, 0.5, 0.6); gn.position.set(3.7, 1.6, 0); cm.add(gn);
  for (const sd of [-1, 1]) for (const dx of [2.3, 2.7]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), M(0x5a0a06, { roughness: 0.2 })); e.position.set(dx, 2.7, sd * 1.75); cm.add(e); }
  for (const [x, kx, fx, ky, sc] of [[2.4, 3.5, 9.5, 3.4, 1.0], [1.2, 1.5, 3.2, 2.8, 0.75], [-0.6, -1.0, -2.5, 2.7, 0.7], [-1.8, -2.6, -4.8, 2.6, 0.7]]) for (const sd of [-1, 1]) {
    const a = V3(x, 1.4, sd * 1.9), k = V3(x + kx * 0.5, ky, sd * (2.6 + 1.6 * sc)), f = V3(x + fx * 0.6, 0.05, sd * (3.2 + 2.2 * sc));
    limb(a, k, 0.22, 0.17, legR, cm); limb(k, f, 0.17, 0.09, legR, cm); }
  const fan = new THREE.CircleGeometry(0.22, 12, 0, Math.PI).rotateX(-0.4);
  for (let i = 0; i < 34; i++) { const u = (rnd() * 2 - 1) * 0.85, v = (rnd() * 2 - 1) * 0.8, y = Math.sqrt(Math.max(0, 1 - u * u - v * v));
    const base = V3(u * 3.6, 2.0 + y * 1.4, v * 2.5), st = limb(base, base.clone().add(V3(0, 0.25, 0)), 0.02, 0.02, fanM, cm, false);
    const f = new THREE.Mesh(fan, fanM); f.position.copy(base).add(V3(0, 0.35, 0)); f.rotation.y = rnd() * 6; cm.add(f); }
  arenaRail(CC, 9);
  MACRO_EX.push({ name: "clover mite", real: 0.75e-3, pos: CC });
  macroSign(["clover mite: the tiny red mite on walls and pavements", "real 0.75 mm  ·  here 7.5 m  ·  a plant-sucking mite, not an insect: 8 legs",
    "its front legs are longer than its body and work as feelers", "fan-shaped bristles (~20 µm → 20 cm) stand all over its back",
    "they are all female: they lay eggs without mating", "squash one and the red smear is its own pigment, not blood"], CC.x - 5, PORTAL.z + 53.2, SOUTHF, 2.0, 1.6);
}
// a fruit fly's head: 0.6 mm wide → 6 m. Each red compound eye has ~750 facets (ommatidia), each
// ~16 µm across (16 cm here) with a bristle between some of them. Beside it, a row of ommatidia
// cut open: lens, crystalline cone, red pigment cells, and the photoreceptors' light-catching rods.
{
  const FC = V3(PORTAL.x + 48, 0, PORTAL.z + 61), fh = new THREE.Group(); fh.position.copy(FC); fh.rotation.y = Math.PI / 2; MACRO.add(fh);   // face toward the path (north)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), M(0x9b7a45, { roughness: 0.55 })); cap.scale.set(2.2, 2.3, 2.6); cap.position.y = 3.2; fh.add(cap);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1.2, 16), M(0x6e5530)); neck.position.set(-1.4, 0.7, 0); fh.add(neck);
  const lensG = new THREE.SphereGeometry(1, 8, 6), lensM = M(0xd64a3a, { roughness: 0.18, metalness: 0.05 }), bristle = M(0x3a2a1a);
  for (const sd of [-1, 1]) {
    const E = V3(0.6, 3.3, sd * 1.9), RX = 1.35, RY = 2.0, RZ = 1.25;   // the eye: an ellipsoid bulging from the head's side
    const base = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), M(0x7a1a12, { roughness: 0.4 })); base.scale.set(RX, RY, RZ); base.position.copy(E); fh.add(base);
    const pts = []; for (let i = 0; i < 1500 && pts.length < 750; i++) { const y = 1 - 2 * (i + 0.5) / 1500, r = Math.sqrt(1 - y * y), a = i * 2.39996;
      const d = V3(r * Math.cos(a), y, r * Math.sin(a)); if (d.z * sd > 0.05) pts.push(d); }
    const lens = new THREE.InstancedMesh(lensG, lensM, pts.length), br = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 4).translate(0, 0.15, 0), bristle, Math.ceil(pts.length / 6));
    let nb = 0;
    pts.forEach((d, i) => { const p = V3(d.x * RX, d.y * RY, d.z * RZ).add(E), n = V3(d.x / RX, d.y / RY, d.z / RZ).normalize();
      O3.position.copy(p); O3.quaternion.setFromUnitVectors(V3(0, 1, 0), n); O3.scale.set(0.085, 0.035, 0.085); O3.updateMatrix(); lens.setMatrixAt(i, O3.matrix);
      if (i % 6 === 3) { O3.scale.setScalar(1); O3.position.addScaledVector(n, 0.03); O3.updateMatrix(); br.setMatrixAt(nb++, O3.matrix); } });
    br.count = nb; fh.add(lens, br);
    const ant = V3(2.0, 3.7, sd * 0.6); limb(ant, V3(2.6, 4.1, sd * 0.8), 0.18, 0.2, M(0x9b7a45), fh);           // antenna and its feathery arista
    const ar0 = V3(2.6, 4.1, sd * 0.8), ar1 = V3(3.4, 5.6, sd * 1.4); limb(ar0, ar1, 0.03, 0.015, bristle, fh, false);
    for (let k = 1; k < 8; k++) { const q = ar0.clone().lerp(ar1, k / 8); limb(q, q.clone().add(V3(0.25, 0.08, sd * 0.12)), 0.008, 0.006, bristle, fh, false); limb(q, q.clone().add(V3(-0.12, 0.2, -sd * 0.1)), 0.008, 0.006, bristle, fh, false); } }
  // a row of seven ommatidia, cut lengthwise, on a plinth: each ~16 µm wide and ~100 µm long → 16 cm × 1 m
  const OX = PORTAL.x + 56, OZ = PORTAL.z + 58.5;
  const pl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.6), M(0xe5ecef, { roughness: 0.8 })); pl.position.set(OX, 0.5, OZ); MACRO.add(pl);
  const pig = new THREE.MeshStandardMaterial({ color: 0xa8231a, transparent: true, opacity: 0.45, depthWrite: false }), rodM = M(0xf4d03f, { emissive: 0x3a2a00 }), coneM = new THREE.MeshStandardMaterial({ color: 0xeaf6f8, transparent: true, opacity: 0.6 });
  for (let k = 0; k < 7; k++) { const x = OX - 0.54 + k * 0.18, g = new THREE.Group(); g.position.set(x, 1, OZ); MACRO.add(g);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 1.0, 6), pig); tube.position.y = 0.5; tube.renderOrder = 2; g.add(tube);
    const ln = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8, 0, 6.283, 0, Math.PI / 2), M(0xf0c27a, { roughness: 0.15 })); ln.position.y = 1.0; g.add(ln);
    const cn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 10).rotateX(Math.PI), coneM); cn.position.y = 0.9; g.add(cn);
    for (let r = 0; r < 7; r++) { const a = r / 7 * 6.283; const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.68, 5), rodM); rod.position.set(0.03 * Math.cos(a), 0.44, 0.03 * Math.sin(a)); g.add(rod); } }
  MACRO_EX.push({ name: "fruit fly head and eyes", real: 0.6e-3, pos: FC });
  macroSign(["a fruit fly's head and its compound eyes", "head 0.6 mm → 6 m  ·  each eye ~750 facets, ~16 µm → 16 cm each",
    "every facet is the lens of an ommatidium: a separate little eye, ~100 µm (1 m) deep",
    "on the plinth, seven cut open: lens (amber), crystalline cone (clear), red pigment cells,",
    "and in each, 7 yellow rods: the light-catching parts of its photoreceptor cells",
    "the bristles between facets sense air and touch; the feathery arista on each antenna hears"], FC.x - 1, PORTAL.z + 53.2, SOUTHF, 2.0, 1.6);
}
// a head louse clinging to a human hair, with its nits. Louse 2.5 mm → 25 m; head hair 70 µm → 70 cm.
{
  const HX = PORTAL.x + 59, Z0 = PORTAL.z + 67, Z1 = PORTAL.z + 121, HR = 0.35;
  const cut = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#5a3a22"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 8; k++) { const y0 = k * 64 + 10; g.fillStyle = "rgba(25,12,5,.5)"; g.strokeStyle = "rgba(150,110,75,.8)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y0);
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y0 + 7 * Math.sin(x * 0.0245 + k * 1.7)); g.stroke(); g.lineTo(w, y0 + 18); g.lineTo(0, y0 + 18); g.fill(); } }, [3, (Z1 - Z0) / 0.48]);
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, Z1 - Z0, 40).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: cut, roughness: 0.6 }));
  hair.position.set(HX, HR, (Z0 + Z1) / 2); MACRO.add(hair);
  const LZ = PORTAL.z + 102, louse = new THREE.Group(); louse.position.set(HX, 0, LZ); louse.rotation.y = Math.PI / 2; MACRO.add(louse);   // head to the north
  const skinL = new THREE.MeshStandardMaterial({ color: 0xc9b08a, transparent: true, opacity: 0.6, roughness: 0.45, depthWrite: false }), legL = M(0xa88a62, { roughness: 0.5 }), claw = M(0x6b4a2a, { roughness: 0.35 });
  const prof = []; for (let i = 0; i <= 40; i++) { const x = -8 + 16 * i / 40, u = 1 - (x / 8) ** 2;
    prof.push(new THREE.Vector2(Math.max(0.01, 4.4 * Math.pow(Math.max(u, 0), 0.5) * (1 - 0.06 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (x + 8) / 2.2)))), x)); }
  const abd = new THREE.Mesh(new THREE.LatheGeometry(prof, 36).rotateZ(-Math.PI / 2), skinL); abd.scale.set(1, 0.42, 1); abd.position.set(-4.5, 3.4, 0); abd.renderOrder = 2; louse.add(abd);
  const gut = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), M(0x5e0f0f, { roughness: 0.5 })); gut.scale.set(5.5, 0.9, 1.6); gut.position.set(-3.8, 3.4, 0); louse.add(gut);   // a blood meal
  const tho = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), skinL); tho.scale.set(2.6, 1.5, 3.0); tho.position.set(4.6, 3.3, 0); tho.renderOrder = 2; louse.add(tho);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), M(0xb89c74, { roughness: 0.45 })); hd.scale.set(2.2, 1.3, 1.7); hd.position.set(8.6, 3.2, 0); louse.add(hd);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), M(0x111111)); e.position.set(8.4, 3.6, sd * 1.55); louse.add(e);
    let a = V3(9.6, 3.5, sd * 1.2); for (let k = 0; k < 5; k++) { const b2 = a.clone().add(V3(0.7, 0.15, sd * 0.35)); limb(a, b2, 0.22, 0.2, legL, louse); a = b2; }   // 5-segmented antenna
    for (let k = 0; k < 7; k++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), M(0x3a2a1a)); sp.position.set(-1.5 - k * 1.6, 3.45, sd * (4.2 - Math.abs(k - 3) * 0.12)); louse.add(sp); }   // spiracles
    for (const x of [6.0, 4.6, 3.2]) {                // three legs a side, each ending in a claw that closes round the hair
      const c = V3(x, 2.4, sd * 2.4), k1 = V3(x + 0.3, 1.8, sd * 4.6), t = V3(x, 0.9, sd * 1.0);
      limb(c, k1, 0.5, 0.42, legL, louse); limb(k1, t, 0.42, 0.32, legL, louse);
      const cl = new THREE.Mesh(new THREE.TorusGeometry(HR + 0.12, 0.13, 8, 16, Math.PI * 1.25), claw); cl.position.set(x, HR, 0); cl.rotation.set(0, Math.PI / 2, sd > 0 ? 0.3 : Math.PI - 0.3 + Math.PI * 0.25); louse.add(cl); } }
  // nits: eggs 0.8 × 0.3 mm → 8 × 3 m, cemented to the hair; one hatched and empty
  [[PORTAL.z + 72, false], [PORTAL.z + 81, true]].forEach(([z, hatched]) => {
    const g = new THREE.Group(); g.position.set(HX, HR, z); g.rotation.x = -0.35; MACRO.add(g);
    const shellN = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), new THREE.MeshStandardMaterial({ color: hatched ? 0xf6f2ea : 0xe9dcb8, transparent: true, opacity: hatched ? 0.55 : 0.7, roughness: 0.3, depthWrite: false }));
    shellN.scale.set(1.5, 1.5, 4); shellN.position.set(0, 1.6, 4.2); shellN.renderOrder = 2; g.add(shellN);
    const sheath = new THREE.Mesh(new THREE.CylinderGeometry(HR + 0.15, HR + 0.15, 3.5, 20).rotateX(Math.PI / 2), M(0xd9ceb0, { roughness: 0.7 })); sheath.position.set(0, -0.2, 1.6); g.add(sheath);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(1.2, 20, 10, 0, 6.283, 0, Math.PI / 2), M(0xcfc2a0)); lid.position.set(0, 1.6, 8.1); lid.rotation.x = Math.PI / 2;
    if (hatched) { lid.position.set(0, 2.9, 8.4); lid.rotation.x = 0.4; } g.add(lid);
    if (!hatched) { const ny = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0x6b5340)); ny.scale.set(0.9, 0.9, 2.6); ny.position.set(0, 1.6, 4.3); g.add(ny); } });
  MACRO_EX.push({ name: "head louse on a hair", real: 2.5e-3, pos: V3(HX, 3, LZ) });
  macroSign(["a head louse on a human hair (look south along the hair)", "louse 2.5 mm → 25 m  ·  the hair, 70 µm → 70 cm thick",
    "each of its 6 legs ends in a claw curved to the width of a human hair", "dark red inside: its gut, holding a meal of blood (it feeds several times a day)",
    "nits: its eggs, 0.8 mm → 8 m, cemented to the hair; the near one holds a growing nymph,", "the next has hatched, its lid open"], HX + 1, PORTAL.z + 53.2, SOUTHF, 2.0, 1.6);
}

// ---------- a drop of pond water, 6.4 mm across → 64 m, 0.6 mm deep → 6 m. Walk in. ----------
// Everything inside moves at its real speed. At ×10,000 this is what a light microscope shows at
// 100-400×: cells 1-10 cm; bacteria are the 1-2 cm specks; anything under 0.2 µm (2 mm here) blurs.
const POND = { x: PORTAL.x - 96, z: PORTAL.z + 77, R: 32, H: 6 };
const pondFog = new THREE.FogExp2(0x6fa8b4, 0.03), PONDCOL = new THREE.Color(0x7fb3bf);
macroPath([[PORTAL.x - 1.5, PORTAL.z + 71], [POND.x + 31.5, PORTAL.z + 71]]);
{
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 72, 20, 0, 6.283, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xa8d8e8, transparent: true,
    opacity: 0.2, roughness: 0.04, side: THREE.DoubleSide, depthWrite: false }));
  dome.scale.set(POND.R, POND.H, POND.R); dome.position.set(POND.x, 0, POND.z); dome.renderOrder = 3; MACRO.add(dome);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(POND.R, 72).rotateX(-Math.PI / 2), M(0xbcd9d4, { roughness: 0.3 })); floor.position.set(POND.x, 0.015, POND.z); MACRO.add(floor);
  const inPond = (x, y, z) => ((x - POND.x) / POND.R) ** 2 + ((z - POND.z) / POND.R) ** 2 + (y / POND.H) ** 2 < 1;
  let wasIn = false;
  procAnim.push(() => { if (!inMacro) { wasIn = false; return; } const c = camera.getWorldPosition(V3(0, 0, 0)), now = inPond(c.x, c.y, c.z);
    if (now !== wasIn) { scene.fog = now ? pondFog : macroFog; scene.background = now ? PONDCOL : AIRCOL; wasIn = now; } });
  // bacteria: specks drifting
  { const n = 1500, bp = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * POND.R * 0.95, x = POND.x + r * Math.cos(a), z = POND.z + r * Math.sin(a);
      bp[i * 3] = x; bp[i * 3 + 2] = z; bp[i * 3 + 1] = 0.05 + rnd() * POND.H * Math.sqrt(1 - (r / POND.R) ** 2) * 0.9; }
    MACRO.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(bp, 3)), new THREE.PointsMaterial({ color: 0x55786a, size: 0.018, sizeAttenuation: true }))); }
  const P = (dx, dz) => V3(POND.x + dx, 0, POND.z + dz);
  const glassy = (col, op) => new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: op, roughness: 0.3, depthWrite: false });
  // the amoeba: Amoeba proteus, 0.5 mm → 5 m, crawling ~3 µm/s (3 cm/s) by flowing into its pseudopods
  { const ag = new THREE.SphereGeometry(1, 56, 20), base = ag.attributes.position.array.slice(), pos = ag.attributes.position.array;
    const grp = new THREE.Group(); grp.position.copy(P(4, -14)); MACRO.add(grp);
    const am = new THREE.Mesh(ag, glassy(0xd2dcd2, 0.5)); am.renderOrder = 2; grp.add(am);
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), M(0x9a8fb0)); nuc.scale.set(0.3, 0.12, 0.3); nuc.position.y = 0.45; grp.add(nuc);
    const cv = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), glassy(0xeaf8ff, 0.55)); cv.position.set(-0.8, 0.5, 0.3); grp.add(cv);
    for (let k = 0; k < 7; k++) { const fv = new THREE.Mesh(new THREE.SphereGeometry(0.1 + rnd() * 0.1, 12, 8), M(k % 2 ? 0x6f8f3a : 0x8a7a4a)); fv.position.set((rnd() - 0.5) * 2, 0.35 + rnd() * 0.3, (rnd() - 0.5) * 2); grp.add(fv); }
    const gr = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 4), M(0x7a7f74), 260);
    for (let k = 0; k < 260; k++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 1.6; O3.position.set(r * Math.cos(a), 0.15 + rnd() * 0.65, r * Math.sin(a)); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); gr.setMatrixAt(k, O3.matrix); }
    grp.add(gr);
    const pods = Array.from({ length: 5 }, (_, i) => ({ phi: i * 1.26 + rnd(), ph: rnd() * 6.28, w: 0.3 + rnd() * 0.2 }));
    let last = 0; const dir = V3(1, 0, 0);
    procAnim.push(t => { if (!inMacro) return; const dt = Math.min(0.1, t - last); last = t; let best = 0, bphi = 0;
      for (const p_ of pods) { p_.A = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 45 + p_.ph); p_.phi += 0.002 * Math.sin(t * 0.05 + p_.ph); if (p_.A > best) { best = p_.A; bphi = p_.phi; } }
      for (let i = 0; i < pos.length; i += 3) { const x = base[i], y = base[i + 1], z = base[i + 2], f = Math.atan2(z, x); let R = 1;
        for (const p_ of pods) { let d = Math.abs(f - p_.phi) % 6.283; if (d > Math.PI) d = 6.283 - d; R += 0.9 * p_.A * Math.exp(-((d / p_.w) ** 2)); }
        R *= 1.7; pos[i] = x * R; pos[i + 2] = z * R; pos[i + 1] = y < 0 ? 0.04 + (1 + y) * 0.06 : 0.1 + y * 0.75; }
      ag.attributes.position.needsUpdate = true; ag.computeVertexNormals();
      dir.set(Math.cos(bphi), 0, Math.sin(bphi)); grp.position.addScaledVector(dir, 0.03 * dt);
      if (grp.position.distanceTo(P(0, 0)) > 20) grp.position.lerp(P(0, 0), 0.002);
      cv.scale.setScalar(0.3 + 0.7 * ((t / 50) % 1)); });            // the contractile vacuole fills, then empties
    MACRO_EX.push({ name: "amoeba (Amoeba proteus)", real: 0.5e-3, pos: grp.position }); }
  // paramecia: 0.25 mm → 2.5 m slippers coated in ~5,000 cilia (10 µm → 10 cm); they swim ~0.5 mm/s,
  // 5 m/s here, spinning on their long axis
  for (const [r0, h0, sp, ph] of [[16, 2.4, 5, 0], [9, 3.4, 4.2, 2.5]]) {
    const outer = new THREE.Group(), body = new THREE.Group(); outer.add(body); MACRO.add(outer);
    const sh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), glassy(0xd9e6cf, 0.45)); sh.scale.set(1.25, 0.42, 0.38); sh.renderOrder = 2; body.add(sh);
    const mac = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0x8f7fb0)); mac.scale.set(0.32, 0.17, 0.16); body.add(mac);
    for (const x of [-0.7, 0.7]) { const v = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glassy(0xeaf8ff, 0.7)); v.position.set(x, 0.17, 0); body.add(v);
      for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283; limb(V3(x, 0.17, 0), V3(x + 0.22 * Math.cos(a), 0.17, 0.22 * Math.sin(a)), 0.012, 0.004, glassy(0xeaf8ff, 0.7), body, false); } }
    const og = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 10).rotateZ(Math.PI / 2), M(0x9db58a)); og.position.set(0.15, -0.12, 0.25); body.add(og);   // the oral groove's gullet
    for (let k = 0; k < 9; k++) { const fv = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), M(0x8a6a3a)); fv.position.set((rnd() - 0.5) * 1.6, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4); body.add(fv); }
    const n = 900, ci = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 3).translate(0, 0.05, 0), M(0xc8d8c0), n);
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996, d = V3(y, r * Math.cos(a), r * Math.sin(a));
      const p_ = V3(d.x * 1.25, d.y * 0.42, d.z * 0.38), nn = V3(d.x / 1.25, d.y / 0.42, d.z / 0.38).normalize().add(V3(-0.5, 0, 0)).normalize();
      O3.position.copy(p_); O3.quaternion.setFromUnitVectors(V3(0, 1, 0), nn); O3.scale.setScalar(1); O3.updateMatrix(); ci.setMatrixAt(i, O3.matrix); }
    body.add(ci);
    procAnim.push(t => { if (!inMacro) return; const a = t * sp / r0 + ph, dx = -Math.sin(a), dz = Math.cos(a);
      outer.position.set(POND.x + r0 * Math.cos(a), h0 + 0.4 * Math.sin(t * 0.7 + ph), POND.z + r0 * Math.sin(a)); outer.rotation.y = Math.atan2(-dz, dx); body.rotation.x = t * 5; });
    MACRO_EX.push({ name: "paramecium", real: 0.25e-3, pos: outer.position }); }
  // Euglena: 50 µm → 50 cm, green with chloroplasts, a red eyespot, and a whipping flagellum
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(); MACRO.add(g);
    const b = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), M(0x4f9e33, { roughness: 0.5 })); b.scale.set(0.25, 0.07, 0.07); g.add(b);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), M(0xe0301e, { emissive: 0x501008 })); eye.position.set(0.19, 0.04, 0); g.add(eye);
    const fp = new Float32Array(26 * 3), fl = new THREE.Line(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(fp, 3)), new THREE.LineBasicMaterial({ color: 0x3d6b2a }));
    fl.frustumCulled = false; g.add(fl);
    const r0 = 4 + k * 2.2, h0 = 0.8 + k * 0.7, sp = 0.6 + 0.15 * k, ph = k * 1.7;
    procAnim.push(t => { if (!inMacro) return; for (let i = 0; i <= 25; i++) { const u = i / 25; fp[i * 3] = 0.25 + u * 0.5; fp[i * 3 + 1] = 0.06 * u * Math.sin(u * 8 - t * 14); fp[i * 3 + 2] = 0.03 * u * Math.cos(u * 8 - t * 14); }
      fl.geometry.attributes.position.needsUpdate = true;
      const a = -(t * sp / r0 + ph), dx = Math.sin(a), dz = -Math.cos(a);
      g.position.set(POND.x - 6 + r0 * Math.cos(a), h0, POND.z + 5 + r0 * Math.sin(a)); g.rotation.set(t * 3, Math.atan2(-dz, dx), 0, "YXZ"); });
    if (!k) MACRO_EX.push({ name: "Euglena", real: 50e-6, pos: g.position }); }
  // Volvox: a hollow ball of ~2,000 cells, 0.5 mm → 5 m, with daughter colonies inside; it rolls along
  { const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin); MACRO.add(g);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(2.5, 40, 28), glassy(0xc0e4a8, 0.14)); shell.renderOrder = 2; spin.add(shell);
    const n = 2000, cells = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 4), M(0x3f9a2a), n);
    for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), a = i * 2.39996; O3.position.set(2.5 * r * Math.cos(a), 2.5 * y, 2.5 * r * Math.sin(a));
      O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); cells.setMatrixAt(i, O3.matrix); }
    spin.add(cells);
    for (let k = 0; k < 7; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), M(0x2f7a22, { roughness: 0.5 })); d.position.set((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4).clampLength(0, 1.5); spin.add(d); }
    procAnim.push(t => { if (!inMacro) return; const a = t * 0.8 / 6; g.position.set(POND.x + 6 * Math.cos(a), 3.0, POND.z + 6 * Math.sin(a)); spin.rotation.set(t * 0.3, t * 0.5, 0); });
    MACRO_EX.push({ name: "Volvox (a colony of ~2,000 cells)", real: 0.5e-3, pos: g.position }); }
  // Spirogyra: a filament of cells 40 µm wide (40 cm), each ~100 µm long (1 m), with a green spiral chloroplast
  const SA = P(-18, 8), SB = P(14, 14), SL = SA.distanceTo(SB), sdir = SB.clone().sub(SA).normalize();
  { const g = new THREE.Group(); g.position.copy(SA).setY(0.22); g.quaternion.setFromUnitVectors(V3(1, 0, 0), sdir); MACRO.add(g);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, SL, 24, 1, true).rotateZ(Math.PI / 2).translate(SL / 2, 0, 0), glassy(0xd8f0d0, 0.3)); tube.renderOrder = 2; g.add(tube);
    const walls = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 20).rotateZ(Math.PI / 2), M(0xc8e2c0), Math.floor(SL));
    for (let k = 0; k < walls.count; k++) { O3.position.set(k + 0.5, 0, 0); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); walls.setMatrixAt(k, O3.matrix); }
    g.add(walls);
    const hel = []; for (let s_ = 0; s_ <= SL; s_ += 0.04) hel.push(V3(s_, 0.13 * Math.cos(s_ * 6.283 / 0.55), 0.13 * Math.sin(s_ * 6.283 / 0.55)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hel), hel.length, 0.035, 6), M(0x3f9a2a, { roughness: 0.5 }))); }
  // Vorticella: a bell (100 µm → 1 m) on a spring stalk; it snaps down in a few milliseconds, the
  // fastest movement any cell makes, then slowly stretches out again
  for (let k = 0; k < 4; k++) {
    const at = SA.clone().addScaledVector(sdir, 4 + k * 2.3).add(V3((k % 2 ? 0.8 : -0.8), 0, (k % 2 ? -0.6 : 0.6))), g = new THREE.Group(); g.position.copy(at); MACRO.add(g);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0), M(0xc8d4c0)); g.add(stalk);
    const bell = new THREE.Group(); g.add(bell);
    const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(0.05 + 0.42 * Math.pow(u, 0.7), u * 0.9)); }
    bell.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 24), new THREE.MeshStandardMaterial({ color: 0xd9e6d0, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 6, 24).rotateX(Math.PI / 2), M(0xb8ccb0)); rim.position.y = 0.9; bell.add(rim);
    const per = 7 + k * 2.3, off = k * 3.1, L = 2;
    procAnim.push(t => { if (!inMacro) return; const u = ((t + off) % per) / per, len = u < 0.02 ? 0.35 : 0.35 + (L - 0.35) * Math.min(1, (u - 0.02) / 0.4);
      stalk.scale.y = len; bell.position.y = len; bell.scale.setScalar(u < 0.02 ? 0.7 : 1); });
    if (!k) MACRO_EX.push({ name: "Vorticella", real: 100e-6, pos: at }); }
  // a rotifer: an animal of ~1,000 cells, 0.3 mm → 3 m, anchored by its toes; its crown of cilia
  // looks like two spinning wheels as it sweeps food into its grinding jaws (the mastax)
  { const g = new THREE.Group(); g.position.copy(P(-10, -10)); MACRO.add(g);
    const sk = glassy(0xe2e8d8, 0.5);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.0, 12).translate(0, 0.5, 0), sk); g.add(foot);
    for (const sd of [-1, 1]) limb(V3(0, 0.05, 0), V3(sd * 0.25, 0.0, 0.1), 0.04, 0.02, sk, g, false);
    const trunk = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), sk); trunk.scale.set(0.5, 0.95, 0.45); trunk.position.y = 1.85; trunk.renderOrder = 2; g.add(trunk);
    const mastax = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), M(0x6b5a3a)); mastax.position.y = 2.3; g.add(mastax);
    const st = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0x9a8a4a)); st.scale.set(0.25, 0.35, 0.22); st.position.y = 1.7; g.add(st);
    const wheels = [];
    for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(sd * 0.3, 2.85, 0); w.rotation.z = -sd * 0.4; g.add(w); wheels.push([w, sd]);
      w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.12, 20), sk));
      const cil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 3).translate(0, 0.07, 0), M(0xd8e2d0), 40);
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; O3.position.set(0.28 * Math.cos(a), 0.05, 0.28 * Math.sin(a)); O3.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize());
        O3.scale.setScalar(1); O3.updateMatrix(); cil.setMatrixAt(i, O3.matrix); }
      w.add(cil); }
    procAnim.push(t => { if (!inMacro) return; for (const [w, sd] of wheels) w.children[1].rotation.y = sd * t * 4; g.rotation.z = 0.08 * Math.sin(t * 0.6); });
    MACRO_EX.push({ name: "rotifer", real: 0.3e-3, pos: g.position }); }
  // diatoms on the bottom: algae in glass shells, centric (round) and pennate (boat-shaped), 30–100 µm
  { const radial = canvasTex(256, 256, (g, w) => { g.fillStyle = "#c9a54a"; g.fillRect(0, 0, w, w); g.strokeStyle = "#8a6a20"; g.lineWidth = 2;
      for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283; g.beginPath(); g.moveTo(128 + 14 * Math.cos(a), 128 + 14 * Math.sin(a)); g.lineTo(128 + 126 * Math.cos(a), 128 + 126 * Math.sin(a)); g.stroke(); }
      g.fillStyle = "#6a4a10"; for (let r = 24; r < 126; r += 9) for (let k = 0; k < r * 0.9; k++) { const a = k / (r * 0.9) * 6.283; g.fillRect(128 + r * Math.cos(a), 128 + r * Math.sin(a), 2, 2); } });
    const striae = canvasTex(256, 64, (g, w, h) => { g.fillStyle = "#c2a04a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#7a5a1a"; g.lineWidth = 2;
      for (let x = 4; x < w; x += 7) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h - 4); g.stroke(); } g.fillStyle = "#5a3a0a"; g.fillRect(0, h / 2 - 2, w, 4); });
    const cenM = new THREE.MeshStandardMaterial({ map: radial, roughness: 0.2, transparent: true, opacity: 0.88 }), penM = new THREE.MeshStandardMaterial({ map: striae, roughness: 0.2, transparent: true, opacity: 0.88 });
    for (let k = 0; k < 9; k++) { const a = k * 0.7 + 0.3, r = 6 + k * 1.6, x = POND.x + r * Math.cos(a), z = POND.z + r * Math.sin(a);
      if (k % 2) { const s_ = 0.15 + rnd() * 0.15, d = new THREE.Mesh(new THREE.CylinderGeometry(s_, s_, s_ * 0.5, 40), [M(0xb08a3a), cenM, cenM]); d.position.set(x, s_ * 0.25 + 0.02, z); MACRO.add(d); }
      else { const d = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), penM); d.scale.set(0.45, 0.07, 0.1); d.position.set(x, 0.09, z); d.rotation.y = rnd() * 3; MACRO.add(d); } }
    MACRO_EX.push({ name: "diatoms (algae in glass shells)", real: 60e-6, pos: P(9, 4) }); }
  macroSign(["a drop of pond water: walk in", "real 6.4 mm across, 0.6 mm deep  ·  here 64 m across, 6 m deep  ·  everything moves at its real speed",
    "an amoeba, paramecia, Euglena, a Volvox colony, Vorticella, a rotifer, diatoms and a Spirogyra filament",
    "this is light-microscope scale: what you would see at 100–400×", "the tiny specks are bacteria (1–2 µm → 1–2 cm), about the smallest a light microscope can show"],
    POND.x + 31, PORTAL.z + 67.8, WEST, 2.3, 1.9);
  const inside = [["amoeba", "0.5 mm → 5 m · crawls ~3 µm/s by flowing into its pseudopods · the clear bubble is its contractile vacuole, pumping out water"],
    ["paramecium", "0.25 mm → 2.5 m · ~5,000 cilia (10 µm → 10 cm) row it at ~0.5 mm/s, 5 m/s here, spinning as it goes"],
    ["Volvox", "a hollow ball of ~2,000 cells, each with 2 flagella · the dark green balls inside are its daughter colonies"],
    ["Vorticella", "a bell on a spring stalk · it snaps down in milliseconds, the fastest motion of any cell"],
    ["rotifer", "a whole animal of ~1,000 cells, 0.3 mm → 3 m · its crown of cilia looks like two spinning wheels"]];
  inside.forEach(([n, l], i) => macroSign([n, ...l.split(" · ")], POND.x + 22 - i * 2.5, POND.z - 6 + i * 3.4, Math.PI / 2 - 0.3, 1.0, 0.9));   // facing east, toward the way in
}

// ---------- the anatomy hall, north of the arrival: tissues at a size where you see their cells ----------
const AX = PORTAL.x + 13;                              // the hall's path runs north along x = 24
macroPath([[PORTAL.x + 1.5, PORTAL.z + 4.2], [AX, PORTAL.z + 4.2], [AX, -112]]);
macroSign(["ANATOMY", "the tissues of animals, at a size where you can see their cells",
  "west: blood vessels, gut, muscle, nerve, insect breathing tubes  ·  east: lung, kidney, bone, spider lung, sponge, butterfly wing"], AX, -3, 0, 3.2, 2.2);
const aSign = (z, east, lines) => macroSign(lines, east ? AX + 2.2 : AX - 2.2, z, east ? EASTF : WEST, 2.0, 1.6);
const tubeM = (pts, r, mat, seg = 64, rad = 10) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rad, false), mat);
const rbcGeo = (() => { const pr = []; for (let i = 0; i <= 12; i++) { const r = 0.0375 * i / 12, th = 0.0125 * (0.35 + 1.6 * (r / 0.0375) ** 2) * Math.sqrt(Math.max(0, 1 - (r / 0.0375) ** 2)) + 0.002; pr.push(new THREE.Vector2(r, th)); }
  for (let i = 12; i >= 0; i--) pr.push(new THREE.Vector2(pr[i].x, -pr[i].y)); return new THREE.LatheGeometry(pr, 16); })();
const rbcMat = M(0xc0392b, { roughness: 0.55 }), FLOWS = [];
function flowRBC(curve, n, speed, jit = 0, scale = 1) {   // red blood cells carried along a curve at speed m/s
  const im = new THREE.InstancedMesh(rbcGeo, rbcMat, n); im.frustumCulled = false; MACRO.add(im);
  FLOWS.push({ curve, L: curve.getLength(), speed, im, scale, o: Array.from({ length: n }, (_, i) => ({ u: (i + rnd() * 0.5) / n, j: V3((rnd() - 0.5) * jit, (rnd() - 0.5) * jit, (rnd() - 0.5) * jit), s: 0.9 + rnd() * 0.2 })) }); }
procAnim.push(t => { if (!inMacro) return;
  for (const f of FLOWS) { f.o.forEach((o, i) => { const u = (o.u + t * f.speed / f.L) % 1;
      O3.position.copy(f.curve.getPointAt(u)).add(o.j); O3.quaternion.setFromUnitVectors(V3(0, 1, 0), f.curve.getTangentAt(u)); O3.scale.setScalar(f.scale * o.s); O3.updateMatrix(); f.im.setMatrixAt(i, O3.matrix); });
    f.im.instanceMatrix.needsUpdate = true; } });
const cellTex = (base, wall, w = 256, h = 256, cw = 32, chh = 32, extra) => canvasTex(w, h, (g) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = wall; g.lineWidth = 3;
  for (let r = 0; r * chh < h + chh; r++) for (let c = -1; c * cw < w + cw; c++) { const x = c * cw + (r % 2) * cw / 2, y = r * chh; g.beginPath();
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; g.lineTo(x + cw * 0.55 * Math.cos(a), y + chh * 0.62 * Math.sin(a)); } g.closePath(); g.stroke(); if (extra) extra(g, x, y); } });

// 1 (west). A capillary bed: arteriole (30 µm → 30 cm) → capillaries (8 µm → 8 cm) → venule (40 µm → 40 cm)
{ const Y = 0.3, A0 = V3(5, Y, -12), A1 = V3(9, Y, -12), V0 = V3(17, Y, -20), V1 = V3(21, Y, -20);
  const endo = new THREE.MeshStandardMaterial({ map: cellTex("#f4c2ba", "#c9786e", 256, 64, 64, 16), transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, roughness: 0.4 });
  endo.map.repeat.set(30, 1);
  const art = new THREE.CatmullRomCurve3([A0, A1]), ven = new THREE.CatmullRomCurve3([V0, V1]);
  MACRO.add(new THREE.Mesh(new THREE.TubeGeometry(art, 8, 0.15, 20), endo), new THREE.Mesh(new THREE.TubeGeometry(ven, 8, 0.2, 20), endo));
  const ring = new THREE.InstancedMesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20).rotateY(Math.PI / 2), M(0xb8645a), 40);   // smooth muscle round the arteriole
  for (let k = 0; k < 40; k++) { O3.position.set(A0.x + k * 0.1, Y, A0.z); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); ring.setMatrixAt(k, O3.matrix); }
  MACRO.add(ring); flowRBC(art, 30, 5, 0.18); flowRBC(ven, 40, 5, 0.25);
  const caps = [];
  for (let k = 0; k < 9; k++) { const pts = [A1.clone()], dx = V0.x - A1.x, dz = V0.z - A1.z;
    for (const f of [0.22, 0.45, 0.68, 0.86]) { const off = (k - 4) * 0.55 * Math.sin(f * Math.PI) + (rnd() - 0.5) * 0.5; pts.push(V3(A1.x + dx * f + off * 0.7, Y + (rnd() - 0.5) * 0.15, A1.z + dz * f + off * 0.7)); }
    pts.push(V0.clone()); const cv = new THREE.CatmullRomCurve3(pts); caps.push(cv);
    MACRO.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 80, 0.042, 8), endo)); flowRBC(cv, Math.round(cv.getLength() / 0.3), 5, 0, 0.95); }
  for (let k = 0; k < 8; k++) { const a = caps[k].getPointAt(0.35 + 0.1 * (k % 3)), b = caps[k + 1].getPointAt(0.4 + 0.1 * (k % 3));   // cross-links
    MACRO.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 6, 0.04, 8), endo)); }
  MACRO_EX.push({ name: "capillary bed", real: 8e-6, pos: V3(13, 0, -16) });
  aSign(-16, false, ["a capillary bed", "arteriole 30 µm → 30 cm, ringed with smooth muscle that opens and closes it",
    "capillaries 5–10 µm → 5–10 cm: red blood cells (7.5 µm) squeeze through in single file",
    "the wall is one layer of flat endothelial cells, ~0.5 µm thick (5 mm here): oxygen crosses it",
    "venule 40 µm → 40 cm gathers the blood toward the veins", "blood moves ~0.5 mm/s in capillaries: 5 m/s here, its real speed"]); }

// 1 (east). Lung alveoli: air sacs 0.2 mm → 2 m round an alveolar duct, each wrapped in capillaries
{ const AC = V3(34.5, 0, -15), top = V3(AC.x, 4.4, AC.z);
  const net = canvasTex(512, 512, (g, w) => { g.fillStyle = "rgba(245,200,192,0.32)"; g.fillRect(0, 0, w, w); g.strokeStyle = "rgba(190,40,40,0.95)"; g.lineWidth = 7;
    const P_ = []; for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) P_.push([c * 64 + (r % 2) * 32 + (rnd() - 0.5) * 22, r * 64 + (rnd() - 0.5) * 22]);
    for (let i = 0; i < P_.length; i++) for (let j = i + 1; j < P_.length; j++) { const d = Math.hypot(P_[i][0] - P_[j][0], P_[i][1] - P_[j][1]); if (d < 78) { g.beginPath(); g.moveTo(...P_[i]); g.lineTo(...P_[j]); g.stroke(); } } }, [3, 2]);
  const sac = new THREE.MeshStandardMaterial({ map: net, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.4 });
  const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 3.6, 24, 1, true), sac); duct.position.set(AC.x, 1.8, AC.z); MACRO.add(duct);
  const t2 = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 8, 6), M(0xf8f0e8), 14 * 6); let n2 = 0;
  for (let i = 0; i < 16; i++) { const y = 1 - 1.7 * (i + 0.5) / 16, r = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996, d = V3(r * Math.cos(a), y, r * Math.sin(a));
    if (y < -0.55) continue; const c = top.clone().addScaledVector(d, 1.55);
    const al = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 1.6), sac); al.position.copy(c); al.rotation.y = Math.PI * 0.7 + (d.x < 0 ? 0.6 : -0.6); al.renderOrder = 2; MACRO.add(al);
    for (let k = 0; k < 6 && n2 < t2.count; k++) { const q = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); O3.position.copy(c).addScaledVector(q, 0.97); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); t2.setMatrixAt(n2++, O3.matrix); } }
  t2.count = n2; MACRO.add(t2);
  const mac = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), M(0xd8c8a8)); mac.scale.set(0.16, 0.1, 0.13); MACRO.add(mac);
  procAnim.push(t => { if (inMacro) mac.position.set(top.x + 0.6 * Math.cos(t * 0.05), top.y - 0.3, top.z + 0.6 * Math.sin(t * 0.05)); });
  MACRO_EX.push({ name: "lung alveoli", real: 0.2e-3, pos: AC });
  aSign(-15, true, ["lung alveoli: the air sacs", "each sac 0.2 mm → 2 m; you have ~400 million, together ~70 m² of surface",
    "the red mesh is capillaries (8 µm → 8 cm) wrapped round every sac",
    "air and blood are separated by only ~0.5 µm of cell (5 mm here)",
    "white bumps: type II cells, which make the soapy surfactant that keeps the sacs from collapsing",
    "the wandering blob inside is a macrophage, eating dust"]); }

// 2 (west). Villi of the small intestine: fingers 0.5–1 mm → 5–10 m, with capillaries and a lacteal inside
{ const VC = V3(13, 0, -36);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 8), M(0xd08a86, { roughness: 0.7 })); floor.position.set(VC.x, 0.25, VC.z); MACRO.add(floor);
  const epi = new THREE.MeshStandardMaterial({ map: cellTex("#f0b0a6", "#b86a62", 256, 256, 26, 26, (g, x, y) => { if (((x * 7 + y * 13) | 0) % 97 < 6) { g.fillStyle = "rgba(255,255,250,.85)"; g.beginPath(); g.ellipse(x, y, 9, 11, 0, 0, 6.283); g.fill(); } }),
    transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.5 });
  epi.map.repeat.set(3, 12);
  const vg = new THREE.CapsuleGeometry(0.45, 4.4, 6, 20).translate(0, 2.65, 0), crypt = new THREE.CircleGeometry(0.16, 16).rotateX(-Math.PI / 2);
  const villi = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const g = new THREE.Group(); g.position.set(VC.x - 3.6 + i * 1.8 + (j % 2) * 0.5, 0.5, VC.z - 2.7 + j * 1.8); MACRO.add(g);
    const h = 0.85 + rnd() * 0.3; g.scale.y = h; const v = new THREE.Mesh(vg, epi); v.renderOrder = 2; g.add(v);
    const lac = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.0, 10).translate(0, 2.4, 0), M(0xfaf4e2)); g.add(lac);
    const loop = []; for (let k = 0; k <= 30; k++) { const u = k / 30, a = u * Math.PI * 2; loop.push(V3(0.28 * Math.cos(a * 0.5) * (u < 0.5 ? 1 : 1), 0.2 + 4.6 * Math.sin(u * Math.PI), 0.28 * Math.sin(a * 0.5))); }
    g.add(tubeM(loop, 0.035, M(0xb03030), 60, 6));
    villi.push([g, rnd() * 6]);
    if (j < 3) { const c = new THREE.Mesh(crypt, M(0x5a2a28)); c.position.set(g.position.x + 0.9, 0.51, g.position.z + 0.9); MACRO.add(c); } }
  procAnim.push(t => { if (inMacro) for (const [g, ph] of villi) g.rotation.set(0.04 * Math.sin(t * 0.5 + ph), 0, 0.04 * Math.sin(t * 0.4 + ph * 1.3)); });
  MACRO_EX.push({ name: "intestinal villi", real: 1e-3, pos: VC });
  aSign(-36, false, ["villi of the small intestine", "each finger 0.5–1 mm tall → 5–10 m, 0.1 mm wide → 1 m",
    "covered in absorbing cells (~10 µm → 10 cm), with goblet cells (white) that make mucus",
    "inside each: a capillary loop (red) takes up sugars and amino acids; the lacteal (white) takes up fat",
    "each absorbing cell has ~1,000 microvilli: 1 µm long → 1 cm, too fine to show here",
    "the dark pits are crypts, where new cells are made: the lining renews itself every 3–5 days"]); }

// 2 (east). A kidney glomerulus: a capillary ball 0.2 mm → 2 m inside Bowman's capsule, cut open
{ const GC = V3(33.5, 1.3, -34);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.15, 40, 28, Math.PI * 0.32, Math.PI * 1.36), new THREE.MeshStandardMaterial({ color: 0xf2d0c8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  cap.position.copy(GC); MACRO.add(cap);
  const pts = []; let q = V3(0, 0.8, 0), d = V3(0, -1, 0);
  for (let k = 0; k < 110; k++) { d.add(V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.2)).normalize(); q = q.clone().addScaledVector(d, 0.22);
    if (q.length() > 0.78) { d.addScaledVector(q.clone().normalize(), -1.5).normalize(); q.setLength(0.78); } pts.push(q.clone().add(GC)); }
  MACRO.add(tubeM(pts, 0.045, M(0xb33a3a, { roughness: 0.5 }), 900, 6));
  MACRO.add(tubeM([GC.clone().add(V3(0, 0.8, 0.12)), GC.clone().add(V3(0.4, 1.6, 0.4)), V3(GC.x + 3, 0.15, GC.z + 1.2)], 0.1, M(0xc0392b)));     // afferent arteriole
  MACRO.add(tubeM([GC.clone().add(V3(0, 0.8, -0.12)), GC.clone().add(V3(0.4, 1.5, -0.4)), V3(GC.x + 3, 0.15, GC.z - 1.2)], 0.08, M(0x9b2d30)));  // efferent arteriole
  MACRO.add(tubeM([GC.clone().add(V3(0.3, -1.05, 0)), V3(GC.x + 1.5, 0.3, GC.z + 0.3), V3(GC.x + 3, 0.3, GC.z - 0.6), V3(GC.x + 4.5, 0.3, GC.z + 0.8), V3(GC.x + 6, 0.3, GC.z - 0.4), V3(GC.x + 7.5, 0.3, GC.z + 0.5)],
    0.25, M(0xe6a49c, { roughness: 0.6 }), 120, 14));    // the proximal tubule
  MACRO_EX.push({ name: "kidney glomerulus", real: 0.2e-3, pos: GC });
  aSign(-34, true, ["a kidney glomerulus", "a ball of capillaries 0.2 mm → 2 m, inside Bowman's capsule (cut open)",
    "blood pressure squeezes about a fifth of the plasma through the capillary walls into the capsule",
    "that filtrate leaves down the tubule (pink), which takes back the water, salt and sugar you need",
    "each kidney has about a million, filtering ~180 litres a day"]); }

// striation texture: sarcomeres 2.5 µm → 2.5 cm (16 per 0.4 m tile)
const striTex = (rep) => canvasTex(64, 256, (g, w, h) => { g.fillStyle = "#c9655a"; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 16; k++) { const y = k * 16; g.fillStyle = "#7a2e28"; g.fillRect(0, y + 4, w, 8); g.fillStyle = "#4a1a16"; g.fillRect(0, y, w, 1.5); } }, rep);
// 3 (west). Skeletal muscle: a fascicle of fibres, each one cell 60 µm → 60 cm thick
{ const MZ = -55, X0 = 5, X1 = 16, L = X1 - X0, Rf = 0.3, CY = 1.6;
  const side = new THREE.MeshStandardMaterial({ map: striTex([1, L / 0.4]), roughness: 0.5 });
  const end = new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w) => { g.fillStyle = "#b85a50"; g.fillRect(0, 0, w, w); g.fillStyle = "#6e2620";
    for (let k = 0; k < 900; k++) { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * 118; g.beginPath(); g.arc(128 + r * Math.cos(a), 128 + r * Math.sin(a), 3, 0, 6.283); g.fill(); }
    g.fillStyle = "#4a3a8a"; for (let k = 0; k < 4; k++) { const a = k * 1.7; g.beginPath(); g.ellipse(128 + 118 * Math.cos(a), 128 + 118 * Math.sin(a), 10, 6, a, 0, 6.283); g.fill(); } }), roughness: 0.5 });
  const offs = [[0, 0]]; for (let k = 0; k < 6; k++) offs.push([0.62 * Math.cos(k * Math.PI / 3), 0.62 * Math.sin(k * Math.PI / 3)]);
  for (let k = 0; k < 6; k++) offs.push([1.1 * Math.cos(k * Math.PI / 3 + Math.PI / 6), 1.1 * Math.sin(k * Math.PI / 3 + Math.PI / 6)]);
  const nucs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 6), M(0x4a3a8a), offs.length * 10); let ni = 0;
  for (const [oy, oz] of offs) { const f = new THREE.Mesh(new THREE.CylinderGeometry(Rf, Rf, L - Math.abs(oy + oz) * 0.6, 32).rotateZ(Math.PI / 2), [side, end, end]);
    f.position.set((X0 + X1) / 2, CY + oy, MZ + oz); MACRO.add(f);
    for (let k = 0; k < 10; k++) { const a = rnd() * 6.283; O3.position.set(X0 + 1 + rnd() * (L - 2), CY + oy + Rf * Math.cos(a), MZ + oz + Rf * Math.sin(a)); O3.rotation.set(0, 0, 0); O3.scale.set(0.12, 0.03, 0.03); O3.updateMatrix(); nucs.setMatrixAt(ni++, O3.matrix); } }
  MACRO.add(nucs);
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, r = 0.36; MACRO.add(tubeM([V3(X0 + 0.3, CY + r * Math.cos(a), MZ + r * Math.sin(a)), V3(X1 - 0.3, CY + r * Math.cos(a), MZ + r * Math.sin(a))], 0.03, M(0xb03030), 4, 6)); }
  const sheath = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.48, L - 1.6, 40, 1, true).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf2e6d8, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
  sheath.position.set((X0 + X1) / 2, CY, MZ); MACRO.add(sheath);
  MACRO_EX.push({ name: "skeletal muscle fibres", real: 60e-6, pos: V3(10, 0, MZ) });
  aSign(MZ, false, ["skeletal muscle fibres", "each fibre is ONE cell: 60 µm → 60 cm thick, and centimetres long (hundreds of metres here)",
    "the stripes are sarcomeres, 2.5 µm → 2.5 cm: the contracting units you walked round at ×10⁷",
    "the cut ends show myofibrils packed inside (1 µm → 1 cm); nuclei (purple) sit just under the surface",
    "red: capillaries between the fibres  ·  the clear sleeve: connective tissue binding them into a bundle"]); }

// 3 (east). An osteon: the building block of compact bone, 0.2 mm → 2 m across
{ const OC = V3(33.5, 0, -55), Ro = 1.0, Rc = 0.25, H = 2.6;
  const top = canvasTex(1024, 1024, (g, w) => { const c = w / 2; g.fillStyle = "#efe4cc"; g.fillRect(0, 0, w, w);
    for (let r = c * 0.25; r < c; r += 26) { g.strokeStyle = (r / 26 | 0) % 2 ? "#d8c9a8" : "#e9dcbf"; g.lineWidth = 13; g.beginPath(); g.arc(c, c, r, 0, 6.283); g.stroke(); }
    g.strokeStyle = "#b8a27a"; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c * 0.985, 0, 6.283); g.stroke();
    for (let k = 0; k < 70; k++) { const a = rnd() * 6.283, r = c * (0.34 + rnd() * 0.6), x = c + r * Math.cos(a), y = c + r * Math.sin(a);
      g.strokeStyle = "rgba(90,70,40,.6)"; g.lineWidth = 1.5; for (let j = 0; j < 9; j++) { const b = rnd() * 6.283; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 26 * Math.cos(b), y + 26 * Math.sin(b)); g.stroke(); }
      g.fillStyle = "#5a4628"; g.beginPath(); g.ellipse(x, y, 12, 5, a + Math.PI / 2, 0, 6.283); g.fill(); } });
  const face = new THREE.Mesh(new THREE.RingGeometry(Rc, Ro, 64, 4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: top, roughness: 0.7 }));
  face.position.set(OC.x, H, OC.z); MACRO.add(face);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(Ro, Ro, H, 64, 1, true), M(0xe3d6b8, { roughness: 0.75 })); wall.position.set(OC.x, H / 2, OC.z); MACRO.add(wall);
  const canal = new THREE.Mesh(new THREE.CylinderGeometry(Rc, Rc, H, 32, 1, true), M(0xc9b08a, { side: THREE.BackSide })); canal.position.copy(wall.position); MACRO.add(canal);
  for (const [dx, r, col] of [[0.09, 0.05, 0xc0392b], [-0.08, 0.07, 0x7a3a5a], [0, 0.03, 0xf1c40f]]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(r, r, H + 0.3, 12), M(col)); v.position.set(OC.x + dx, H / 2 + 0.15, OC.z + (col === 0xf1c40f ? 0.1 : 0)); MACRO.add(v); }
  MACRO_SOLIDS.push({ in: (x, z) => Math.hypot(x - OC.x, z - OC.z) < Ro, h: H });
  MACRO_EX.push({ name: "osteon (compact bone)", real: 0.2e-3, pos: OC });
  aSign(-55, true, ["an osteon: the building block of compact bone", "0.2 mm → 2 m across: rings of bone (lamellae) round a central canal",
    "the canal (50 µm → 50 cm) carries an artery, a vein and a nerve (yellow)",
    "each dark fleck is a lacuna holding one bone cell (osteocyte, ~10 µm → 10 cm), linked to its neighbours by hair-thin canals",
    "bone is alive: osteons are dug out and rebuilt throughout your life  ·  fly up to see the top"]); }

// 4 (west). A motor neuron and its myelinated axon, running 80 m west (8 mm of real nerve)
{ const NC = V3(19.6, 0.55, -75), AXR = 0.05, MYR = 0.09, IN = 10;
  const soma = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), new THREE.MeshStandardMaterial({ color: 0xe8c8d8, transparent: true, opacity: 0.5, depthWrite: false })); soma.position.copy(NC); soma.renderOrder = 2; MACRO.add(soma);
  const nu = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M(0x8a7ab0)); nu.position.copy(NC); MACRO.add(nu);
  const nl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), M(0x3a2a5a)); nl.position.copy(NC).add(V3(0.05, 0.05, 0)); MACRO.add(nl);
  const neur = M(0xe0b8c8, { roughness: 0.5 });
  const branch = (from, dir, len, r, depth) => { const to = from.clone().addScaledVector(dir, len); to.y = Math.max(0.05, Math.min(1.6, to.y)); to.x = Math.min(21.6, to.x);
    limb(from, to, r, r * 0.6, neur, MACRO); if (depth > 0) for (const s_ of [-1, 1]) { const d = dir.clone().applyAxisAngle(V3(0, 1, 0), s_ * (0.4 + rnd() * 0.4)); d.y += (rnd() - 0.5) * 0.4; branch(to, d.normalize(), len * 0.65, r * 0.6, depth - 1); } };
  for (const a of [0.9, 1.5, 2.1, 4.2, 4.8, 5.4, 3.6]) { const d = V3(Math.cos(a), (rnd() - 0.4) * 0.4, Math.sin(a)).normalize(); branch(NC.clone().addScaledVector(d, 0.5), d, 1.6 + rnd() * 0.8, 0.12, 2); }
  limb(NC.clone().add(V3(-0.5, -0.1, 0)), V3(NC.x - 1.1, 0.12, NC.z), 0.18, AXR, neur, MACRO, false);      // axon hillock
  const myel = M(0xf6f2ea, { roughness: 0.3 }), axM = M(0xd8a8b8), schw = M(0x9a8ab8), nodes = [];
  let x = NC.x - 1.1; MACRO.add(new THREE.Mesh(new THREE.CylinderGeometry(AXR, AXR, 80.5, 10).rotateZ(Math.PI / 2).translate(x - 40.25, 0.1, NC.z), axM));
  for (let k = 0; k < 8; k++) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(MYR, IN - 0.2, 4, 14).rotateZ(Math.PI / 2), myel); m.position.set(x - 0.3 - IN / 2, 0.1, NC.z); MACRO.add(m);
    const sn = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), schw); sn.scale.set(0.3, 0.05, 0.06); sn.position.set(x - 0.3 - IN / 2, 0.1 + MYR, NC.z); MACRO.add(sn);
    nodes.push(x - 0.25); x -= IN; }
  nodes.push(x - 0.25);
  for (let k = 0; k < 4; k++) { const b = V3(x - 0.5, 0.1, NC.z), e = V3(x - 1.8, 0.1, NC.z + (k - 1.5) * 0.7); limb(b, e, AXR, 0.03, axM, MACRO, false);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), M(0xd88aa0)); kn.position.copy(e); MACRO.add(kn); }   // terminal branches
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.75 })); MACRO.add(glow);
  procAnim.push(t => { if (!inMacro) return; const k = Math.floor(t / 0.6) % nodes.length; glow.position.set(nodes[k], 0.1, NC.z); glow.scale.setScalar(1 + 0.4 * Math.sin((t % 0.6) / 0.6 * Math.PI)); });
  MACRO_EX.push({ name: "motor neuron", real: 0.1e-3, pos: NC });
  aSign(-75, false, ["a motor neuron: the nerve cell that moves a muscle", "cell body 0.1 mm → 1 m (purple: nucleus and nucleolus); the branching dendrites collect signals",
    "its axon is 10 µm → 10 cm thick and can be a metre long: 10 km at this scale",
    "white: myelin, wrapped round it by Schwann cells, in segments ~1 mm → 10 m long",
    "the signal jumps from gap to gap (nodes of Ranvier): the glow shows it, slowed ~35,000 times",
    "follow the axon west: 80 m of it here, 8 mm of real nerve"]); }

// 4 (east). A spider's book lung: ~1 mm → 10 m, thin leaves stacked like the pages of a book
{ const BC = V3(35, 0, -75), N = 60, GAP = 0.08;
  const leaf = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 0.012, 3.6), new THREE.MeshStandardMaterial({ color: 0x7fb8b0, transparent: true, opacity: 0.62, roughness: 0.35 }), N);
  for (let k = 0; k < N; k++) { O3.position.set(BC.x, 0.5 + k * GAP, BC.z); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); leaf.setMatrixAt(k, O3.matrix); }
  MACRO.add(leaf);
  const pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, GAP - 0.012, 4), M(0x5f8f88), (N - 1) * 14);
  for (let k = 0; k < N - 1; k++) for (let j = 0; j < 14; j++) { O3.position.set(BC.x - 2.9 + rnd() * 5.8, 0.5 + k * GAP + GAP / 2, BC.z - 1.7 + rnd() * 3.4); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); pil.setMatrixAt(k * 14 + j, O3.matrix); }
  MACRO.add(pil);
  const sinus = new THREE.Mesh(new THREE.BoxGeometry(0.6, N * GAP + 0.4, 3.8), M(0x4f8a80, { roughness: 0.5 })); sinus.position.set(BC.x + 3.3, 0.5 + N * GAP / 2, BC.z); MACRO.add(sinus);
  const shellM = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  for (const [y, h] of [[0.2, 0.3], [0.5 + N * GAP + 0.25, 0.3]]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(7.2, h, 4.4), shellM); pl.position.set(BC.x + 0.3, y, BC.z); MACRO.add(pl); }
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 3.2), M(0x1a1410)); slit.position.set(BC.x - 2.6, 0.36, BC.z); MACRO.add(slit);
  MACRO_EX.push({ name: "spider book lung", real: 1e-3, pos: BC });
  aSign(-75, true, ["a spider's book lung", "about 1 mm → 10 m: 60–100 thin leaves stacked like the pages of a book",
    "blood (hemolymph, blue-green from copper-based hemocyanin) flows inside each leaf; air fills the gaps",
    "tiny pillars hold the air spaces open (~3 µm → 3 cm)",
    "air comes in through a slit under the abdomen (the dark line); most spiders have one or two pairs"]); }

// 5 (west). Insect tracheae: a spiracle in the cuticle and silvery air tubes branching to the cells
{ const SP = V3(21, 2.2, -95);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.4, 6), M(0x6b4a2a, { roughness: 0.5 })); wall.position.set(SP.x + 0.2, 2.2, SP.z); MACRO.add(wall);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.1, 10, 28).rotateY(Math.PI / 2), M(0x3a2814)); lip.position.copy(SP); MACRO.add(lip);
  for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283, b = SP.clone().add(V3(0, 0.55 * Math.sin(a), 0.55 * Math.cos(a))); limb(b, SP.clone().add(V3(-0.15, 0.12 * Math.sin(a), 0.12 * Math.cos(a))), 0.012, 0.005, M(0x2a1a0a), MACRO, false); }
  const tae = canvasTex(64, 64, (g, w) => { g.fillStyle = "#dfe6ea"; g.fillRect(0, 0, w, w); g.strokeStyle = "#8a979e"; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, w); g.stroke(); });
  const trach = (pts, r) => { const cv = new THREE.CatmullRomCurve3(pts), t = tae.clone(); t.needsUpdate = true; t.repeat.set(cv.getLength() / (r * 0.6 + 0.02), 1);
    const m = new THREE.Mesh(new THREE.TubeGeometry(cv, 40, r, 12), new THREE.MeshStandardMaterial({ map: t, metalness: 0.35, roughness: 0.25 })); MACRO.add(m); return cv; };
  const fibre = V3(9, 1.2, -95);
  const grow = (from, dir, len, r, depth) => { const to = from.clone().addScaledVector(dir, len); to.y = Math.max(0.3, Math.min(4.2, to.y));
    const mid = from.clone().lerp(to, 0.5).add(V3(0, (rnd() - 0.5) * 0.4, (rnd() - 0.5) * 0.4)); trach([from, mid, to], r);
    if (depth > 0) for (const s_ of [-1, 1]) { const d = dir.clone().applyAxisAngle(V3(0, 1, 0), s_ * (0.35 + rnd() * 0.3)); d.y += (rnd() - 0.5) * 0.6; grow(to, d.normalize(), len * 0.6, r * 0.5, depth - 1); }
    else { const tg = fibre.clone().add(V3((rnd() - 0.5) * 3, (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.4)); limb(to, tg, 0.012, 0.006, M(0xc8d0d4), MACRO, false); } };
  trach([SP.clone().add(V3(-0.1, 0, 0)), V3(SP.x - 1.5, 2.3, SP.z), V3(SP.x - 3, 2.1, SP.z)], 0.45);
  for (const a of [-0.5, 0.05, 0.6]) grow(V3(SP.x - 3, 2.1, SP.z), V3(-Math.cos(a), -0.15, Math.sin(a)).normalize(), 3.2, 0.24, 2);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 24).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ map: striTex([1, 15]), roughness: 0.5 })); f.position.copy(fibre); MACRO.add(f);
  MACRO_EX.push({ name: "insect tracheae", real: 0.1e-3, pos: V3(17, 0, -95) });
  aSign(-95, false, ["insect tracheae: breathing tubes", "air enters a spiracle (a valve fringed with filter hairs) in the cuticle",
    "and runs down silvery, air-filled tubes: the trunk 100 µm → 1 m wide, branching smaller and smaller",
    "the finest, tracheoles, are under 1 µm (1 cm here) and reach right into the cells, like this flight muscle fibre",
    "spiral ridges (taenidia) stop the tubes collapsing, like a vacuum-cleaner hose",
    "no lungs, and no blood needed to carry oxygen: one reason insects stay small"]); }

// 5 (east). Sponge tissue: a piece 0.8 × 0.5 × 0.6 mm → 8 × 5 × 6 m, see-through
{ const SC = V3(36.5, 0, -95), W = 8, H = 5, D = 6;
  const blk = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshStandardMaterial({ color: 0xe6c286, transparent: true, opacity: 0.28, roughness: 0.6, depthWrite: false })); blk.position.set(SC.x, H / 2, SC.z); blk.renderOrder = 2; MACRO.add(blk);
  const canalM = new THREE.MeshStandardMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.55, depthWrite: false });
  const osc = V3(SC.x, H, SC.z); MACRO.add(tubeM([V3(SC.x, 0.6, SC.z), V3(SC.x + 0.3, 2.5, SC.z - 0.2), osc], 0.5, canalM, 24, 16));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 10, 28).rotateX(Math.PI / 2), M(0xc9a06a)); rim.position.copy(osc); MACRO.add(rim);
  const chM = new THREE.MeshStandardMaterial({ color: 0xc0883a, transparent: true, opacity: 0.6 }), chs = [];
  for (let k = 0; k < 12; k++) {                      // incurrent canals from pores on the faces, each feeding chambers
    const face = k % 4, u = (rnd() - 0.5) * 0.8, v = 0.2 + rnd() * 0.6;
    const start = face === 0 ? V3(SC.x - W / 2, v * H, SC.z + u * D) : face === 1 ? V3(SC.x + W / 2, v * H, SC.z + u * D) : face === 2 ? V3(SC.x + u * W, v * H, SC.z - D / 2) : V3(SC.x + u * W, v * H, SC.z + D / 2);
    const end = V3(SC.x + (rnd() - 0.5) * 2, 0.8 + rnd() * 3, SC.z + (rnd() - 0.5) * 2), mid = start.clone().lerp(end, 0.5).add(V3((rnd() - 0.5), (rnd() - 0.5), (rnd() - 0.5)));
    const cv = new THREE.CatmullRomCurve3([start, mid, end]); MACRO.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 20, 0.15, 10), canalM));
    const pore = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 6, 16), M(0x8a6a3a)); pore.position.copy(start); pore.lookAt(SC.x, start.y, SC.z); MACRO.add(pore);
    for (const f of [0.35, 0.6, 0.85]) chs.push(cv.getPointAt(f).add(V3((rnd() - 0.5) * 0.5, 0.25, (rnd() - 0.5) * 0.5))); }
  const cham = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 14, 10), chM, chs.length), col = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 4), M(0x8a5a1a), chs.length * 14);
  chs.forEach((c, i) => { O3.position.copy(c); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); cham.setMatrixAt(i, O3.matrix);
    for (let j = 0; j < 14; j++) { const q = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); O3.position.copy(c).addScaledVector(q, 0.16); O3.updateMatrix(); col.setMatrixAt(i * 14 + j, O3.matrix); } });
  MACRO.add(cham, col);
  const glass = M(0xf2f7fa, { roughness: 0.1 }), spic = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 5), glass, 80);
  for (let k = 0; k < 80; k++) { const L = 1 + rnd() * 2.5, d = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); O3.position.set(SC.x + (rnd() - 0.5) * W, 0.3 + rnd() * (H - 0.4), SC.z + (rnd() - 0.5) * D);
    O3.quaternion.setFromUnitVectors(V3(0, 1, 0), d); O3.scale.set(1, L, 1); O3.updateMatrix(); spic.setMatrixAt(k, O3.matrix); }
  MACRO.add(spic);
  for (let k = 0; k < 12; k++) { const c = V3(SC.x + (rnd() - 0.5) * W * 0.9, 0.4 + rnd() * (H - 0.8), SC.z + (rnd() - 0.5) * D * 0.9);   // asters: star-shaped spicules
    for (let j = 0; j < 8; j++) { const d = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(); limb(c, c.clone().addScaledVector(d, 0.16), 0.012, 0.003, glass, MACRO, false); } }
  const amo = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), M(0x8e6ab0), 24);
  for (let k = 0; k < 24; k++) { O3.position.set(SC.x + (rnd() - 0.5) * W * 0.9, 0.3 + rnd() * (H - 0.6), SC.z + (rnd() - 0.5) * D * 0.9); O3.rotation.set(0, 0, 0); O3.scale.set(1.4, 0.8, 1); O3.updateMatrix(); amo.setMatrixAt(k, O3.matrix); }
  MACRO.add(amo);
  MACRO_EX.push({ name: "sponge tissue", real: 0.8e-3, pos: SC });
  aSign(-95, true, ["sponge tissue (a 0.8 mm piece)", "the simplest animals: no organs, no nerves, and water for a circulation",
    "water enters by pores, runs down canals to chambers (brown) lined with collar cells (choanocytes, ~5 µm → 5 cm)",
    "their beating flagella pump it on, and it leaves by the big opening on top, the osculum",
    "the glassy needles and stars are spicules, its skeleton of silica  ·  purple: wandering amoebocytes",
    "a fist-sized sponge can filter thousands of litres of water a day"]); }

// 6 (west). A small vein, 0.5 mm → 5 m across, cut open lengthwise to show a valve
{ const X0 = 6, X1 = 20, VZ = -112, R = 2.5, CY = R + 0.2, L = X1 - X0;
  const half = (r, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 48, 1, true, Math.PI, Math.PI).rotateZ(Math.PI / 2), mat); m.position.set((X0 + X1) / 2, CY, VZ); MACRO.add(m); };
  const inner = new THREE.MeshStandardMaterial({ map: cellTex("#e8a8a0", "#b8706a", 256, 64, 64, 18), roughness: 0.45, side: THREE.DoubleSide }); inner.map.repeat.set(L / 1.2, 6);
  half(R, inner); half(R + 0.18, M(0x9a5a6a, { roughness: 0.6, side: THREE.DoubleSide }));
  for (const sd of [-1, 1]) { const lip = new THREE.Mesh(new THREE.BoxGeometry(L, 0.04, 0.18), M(0xb07080)); lip.position.set((X0 + X1) / 2, CY, VZ + sd * (R + 0.09)); MACRO.add(lip); }
  const cusp = new THREE.Mesh(new THREE.CircleGeometry(R * 0.97, 40, Math.PI, Math.PI).rotateY(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf5d0c8, emissive: 0x6a3a36, transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 0.4 }));
  cusp.position.set(13, CY, VZ); cusp.rotation.z = -0.85; MACRO.add(cusp);           // leaning with the flow (toward +x, the heart)
  for (let k = 0; k < 30; k++) { const y = CY - R * (0.15 + 0.7 * rnd()), zr = Math.sqrt(Math.max(0, R * R - (y - CY) ** 2)) * 0.9, z = VZ + (rnd() * 2 - 1) * zr, yy = Math.max(y, CY - R * 0.62);
    flowRBC(new THREE.LineCurve3(V3(X0 + 0.1, yy, z), V3(X1 - 0.1, yy, z)), 8, 2, 0.1); }
  MACRO_EX.push({ name: "small vein with a valve", real: 0.5e-3, pos: V3(13, 0, VZ) });
  aSign(-108, false, ["a small vein, cut open lengthwise", "0.5 mm → 5 m across: about the smallest veins with valves",
    "the flap is a valve cusp: blood flowing toward the heart pushes it aside;",
    "if blood slides back, it fills the pocket behind the cusp and seals the vein (its partner was in the missing top half)",
    "the wall: a lining of endothelial cells, a thin layer of muscle, and a tough outer coat",
    "red blood cells drift through, shown 10× slower than real"]); }

// 6 (east). A butterfly's wing: a 1.1 × 0.9 mm patch → 11 × 9 m, its colour on overlapping scales
{ const WC = V3(35.5, 0, -113);
  const memb = new THREE.Mesh(new THREE.BoxGeometry(11, 0.05, 9), M(0x6b4a2a)); memb.position.set(WC.x, 0.35, WC.z); MACRO.add(memb);
  const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 11.4, 16).rotateZ(Math.PI / 2), M(0x1a1410)); vein.position.set(WC.x, 0.5, WC.z - 1.2); MACRO.add(vein);
  const st = canvasTex(128, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(w * 0.35, h); g.lineTo(w * 0.65, h); g.lineTo(w * 0.95, 30); for (let k = 0; k <= 4; k++) g.lineTo(w * (0.95 - k * 0.225) + (k < 4 ? -w * 0.11 : 0), k % 2 ? 0 : 30); g.lineTo(w * 0.05, 30); g.closePath(); g.fill();
    g.globalCompositeOperation = "source-atop"; g.strokeStyle = "rgba(0,0,0,.32)"; g.lineWidth = 2; for (let x = 8; x < w; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.strokeStyle = "rgba(0,0,0,.12)"; for (let y = 0; y < h; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  st.wrapS = st.wrapT = THREE.ClampToEdgeWrapping;
  const geo = new THREE.PlaneGeometry(0.5, 1.0).translate(0, 0.5, 0).rotateX(-Math.PI / 2 + 0.12);   // lying nearly flat, tips lifted ~7°, each row overlapping the next
  const rows = 14, cols = 23, sc = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: st, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }), rows * cols); let n = 0;
  const OR = new THREE.Color(0xe67e22), BK = new THREE.Color(0x1a1410), WH = new THREE.Color(0xf5f0e6), cc = new THREE.Color();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = WC.x - 5.3 + c * 0.46 + (r % 2) * 0.23, z = WC.z + 4.2 - r * 0.62;
    O3.position.set(x, 0.39 + r * 0.002, z); O3.rotation.set(0, Math.PI + (rnd() - 0.5) * 0.08, 0); O3.scale.setScalar(1); O3.updateMatrix(); sc.setMatrixAt(n, O3.matrix);
    const nearVein = Math.abs(z - (WC.z - 1.2)) < 0.9, edge = z < WC.z - 3.4, spot = edge && ((c * 7 + r * 3) % 9 < 2);
    cc.copy(spot ? WH : nearVein || edge ? BK : OR).offsetHSL(0, 0, (rnd() - 0.5) * 0.04); sc.setColorAt(n++, cc); }
  MACRO.add(sc);
  MACRO_EX.push({ name: "butterfly wing scales", real: 100e-6, pos: WC });
  aSign(-110, true, ["a butterfly's wing (a monarch): a 1 mm patch", "its colour sits on scales overlapping like roof tiles, each ~100 × 50 µm → 1 m × 50 cm",
    "every scale is a flattened single cell's dried-out wall, ridged lengthwise (ridges ~1.5 µm → 1.5 cm apart)",
    "in blue butterflies those ridges make the colour by light interference, with no pigment at all",
    "the dust on your fingers after touching a butterfly is these scales"]); }

// ---------- the west lane: everyday things and small creatures ----------
const WX = -85;                                        // the lane runs north along x = -85
macroPath([[PORTAL.x - 1.5, PORTAL.z + 4.2], [WX, PORTAL.z + 4.2], [WX, -112]]);
macroSign(["EVERYDAY THINGS AND SMALL CREATURES", "a snowflake, your fingertip, a spider's thread, a phone screen, a CD,",
  "a flea and a water flea  ·  this way, then north"], -3, PORTAL.z + 4.2, WEST, 3.2, 2.2);
const wSign = (z, east, lines) => macroSign(lines, east ? WX + 2.2 : WX - 2.2, z, east ? EASTF : WEST, 2.0, 1.6);

// a snowflake: a stellar dendrite 2 mm across → 20 m, standing on one tip. Ice plates ~20 µm thick → 20 cm.
{ const SC = V3(-101, 10.6, -14), g = new THREE.Group(); g.position.copy(SC); g.rotation.y = Math.PI / 2; MACRO.add(g);   // its face toward the lane (east)
  const ice = new THREE.MeshStandardMaterial({ color: 0xe4f6ff, emissive: 0x16303c, transparent: true, opacity: 0.78, roughness: 0.06, metalness: 0.1 });
  const bar = (x0, y0, a, len, w) => { const m = new THREE.Mesh(new THREE.BoxGeometry(len, w, 0.2), ice); m.position.set(x0 + Math.cos(a) * len / 2, y0 + Math.sin(a) * len / 2, 0); m.rotation.z = a; g.add(m); };
  const hex = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.26, 6).rotateX(Math.PI / 2), ice); g.add(hex);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.06, 4, 6).rotateZ(Math.PI / 6), M(0xffffff, { roughness: 0.1 })); ring.position.z = 0.14; g.add(ring);
  for (let k = 0; k < 6; k++) { const a = Math.PI / 2 + k * Math.PI / 3, ca = Math.cos(a), sa = Math.sin(a);
    bar(0, 0, a, 10, 0.7);
    for (let j = 1; j <= 5; j++) { const d = 1.6 + j * 1.55, L = (4.2 - j * 0.6) * (j % 2 ? 1 : 0.7), x = ca * d, y = sa * d;
      for (const sd of [-1, 1]) { const b = a + sd * Math.PI / 3; bar(x, y, b, L, 0.42);
        for (let q = 1; q < 3 && L > 1.6; q++) { const dd = L * q / 3, xx = x + Math.cos(b) * dd, yy = y + Math.sin(b) * dd; bar(xx, yy, a, L * 0.3, 0.22); } } }
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 6).rotateX(Math.PI / 2), ice); tip.position.set(ca * 10, sa * 10, 0); g.add(tip); }
  MACRO_EX.push({ name: "a snowflake", real: 2e-3, pos: SC });
  wSign(-14, false, ["a snowflake (a stellar dendrite)", "real 2 mm across  ·  here 20 m  ·  its arms are ice plates ~20 µm → 20 cm thick",
    "six arms because water molecules lock into a hexagonal lattice: the shape of the ice crystal at the museum's scale shows up here",
    "each arm grows side branches as it falls through air of changing temperature and humidity;",
    "all six arms meet the same conditions at the same moment, which is why they match"]); }

// fingertip skin: a 2.4 × 2.4 mm patch → 24 m, ridges ~0.5 mm apart (5 m) and ~60 µm high (60 cm),
// with sweat pores along their crests. Walk on it. The surface is flat dead cells (corneocytes, 30 µm → 30 cm).
{ const FC = V3(-108, 0, -47), S_ = 24, BASE = 0.45, AMP = 0.8, core = V3(FC.x + 3, 0, FC.z - 2);
  const hAt = (x, z) => { const r = Math.hypot((x - core.x) * 1.0, (z - core.z) * 1.35) + 0.4 * Math.sin(Math.atan2(z - core.z, x - core.x) * 2);
    return BASE + AMP * Math.pow(0.5 + 0.5 * Math.cos(2 * Math.PI * r / 5), 1.6); };
  const corneo = canvasTex(512, 512, (g, w) => { g.fillStyle = "#e9c2a6"; g.fillRect(0, 0, w, w); g.strokeStyle = "rgba(150,95,70,.55)"; g.lineWidth = 2;
    for (let k = 0; k < 90; k++) { const cx = rnd() * w, cy = rnd() * w, r = 26 + rnd() * 14; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + rnd() * 0.4; g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); } g.closePath(); g.stroke(); } }, [12, 12]);
  const geo = new THREE.PlaneGeometry(S_, S_, 160, 160).rotateX(-Math.PI / 2), pp = geo.attributes.position;
  const vc = new Float32Array(pp.count * 3);
  for (let i = 0; i < pp.count; i++) { const h = hAt(FC.x + pp.getX(i), FC.z + pp.getZ(i)); pp.setY(i, h);
    const f = 0.55 + 0.45 * (h - BASE) / AMP; vc[i * 3] = f; vc[i * 3 + 1] = f * 0.95; vc[i * 3 + 2] = f * 0.92; }   // furrows darker
  geo.setAttribute("color", new THREE.BufferAttribute(vc, 3)); geo.computeVertexNormals();
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: corneo, roughness: 0.75, vertexColors: true })); top.position.set(FC.x, 0, FC.z); MACRO.add(top);
  const sideM = M(0xd8a68a, { roughness: 0.8 });
  for (const [dx, dz, w, d] of [[0, -S_ / 2, S_, 0.05], [0, S_ / 2, S_, 0.05], [-S_ / 2, 0, 0.05, S_], [S_ / 2, 0, 0.05, S_]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, BASE, d), sideM); b.position.set(FC.x + dx, BASE / 2, FC.z + dz); MACRO.add(b); }
  const pores = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.22, 0.06, 14), M(0x5a2e22, { roughness: 0.4 }), 200); let n = 0;
  for (let ring = 1; ring < 7; ring++) { const r = ring * 5, steps = Math.round(2 * Math.PI * r / 4);
    for (let k = 0; k < steps && n < 200; k++) { const a = k / steps * 6.283 + ring; let x = core.x + r * Math.cos(a), z = core.z + r * Math.sin(a) / 1.35;
      for (let it = 0; it < 6; it++) { const rr = Math.hypot(x - core.x, (z - core.z) * 1.35) + 0.4 * Math.sin(Math.atan2(z - core.z, x - core.x) * 2); const f = r / rr; x = core.x + (x - core.x) * f; z = core.z + (z - core.z) * f; }
      if (Math.abs(x - FC.x) > S_ / 2 - 0.6 || Math.abs(z - FC.z) > S_ / 2 - 0.6) continue;
      O3.position.set(x, hAt(x, z) + 0.01, z); O3.rotation.set(0, 0, 0); O3.scale.setScalar(1); O3.updateMatrix(); pores.setMatrixAt(n++, O3.matrix); } }
  pores.count = n; MACRO.add(pores);
  MACRO_SOLIDS.push({ in: (x, z) => Math.abs(x - FC.x) < S_ / 2 && Math.abs(z - FC.z) < S_ / 2, h: hAt });
  MACRO_EX.push({ name: "fingertip skin", real: 2.4e-3, pos: FC });
  wSign(-47, false, ["your fingertip: a 2.4 mm patch of fingerprint", "real ridges ~0.5 mm apart and ~60 µm high  ·  here 5 m apart and 60 cm high: walk across them",
    "the surface is flat dead cells (corneocytes, ~30 µm → 30 cm), shed and replaced every few weeks",
    "the dark holes along the crests are sweat pores (~0.1 mm → 1 m): sweat helps your fingers grip",
    "the ridge pattern is set before birth and never changes, even in identical twins"]); }

// an orb-web's capture thread: 2 µm → 2 cm, strung with glue droplets (~30 µm → 30 cm) like beads,
// crossing the stiffer radial threads (4 µm → 4 cm). A frame holds a 20 × 12 m piece of web.
{ const X = -100, Z0 = -95, Z1 = -73, Hh = 13, hub = V3(X, -30, (Z0 + Z1) / 2);
  const post = M(0x8a7a6a, { roughness: 0.7 });
  for (const z of [Z0, Z1]) { const p_ = new THREE.Mesh(new THREE.BoxGeometry(0.5, Hh, 0.5), post); p_.position.set(X, Hh / 2, z); MACRO.add(p_); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, Z1 - Z0 + 0.5), post); beam.position.set(X, Hh, (Z0 + Z1) / 2); MACRO.add(beam);
  const radM = M(0xe8e8e0, { roughness: 0.3 }), capM = M(0xd8d8d0, { roughness: 0.3 });
  const inFrame = v => v.y > 0.4 && v.y < Hh - 0.3 && v.z > Z0 + 0.3 && v.z < Z1 - 0.3;
  for (const a of [-0.32, -0.12, 0.08, 0.28]) { const d = V3(0, Math.cos(a), Math.sin(a)); let A = null, B = null;
    for (let t = 0; t < 60; t += 0.1) { const v = hub.clone().addScaledVector(d, t); if (inFrame(v)) { if (!A) A = v; B = v; } }
    if (A) MACRO.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A, B), 4, 0.02, 6), radM)); }
  const drops = []; 
  for (let r = 32; r < 44; r += 2.2) { const pts = [];
    for (let a = -0.45; a <= 0.45; a += 0.004) { const v = hub.clone().add(V3(0, r * Math.cos(a), r * Math.sin(a))); v.y -= 0.25 * Math.cos(a * 18) ** 2; if (inFrame(v)) pts.push(v); }
    if (pts.length < 2) continue; MACRO.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length, 0.01, 5), capM));
    const cv = new THREE.CatmullRomCurve3(pts), L = cv.getLength();
    for (let s_ = 0.4; s_ < L; s_ += 0.8 + rnd() * 0.5) drops.push([cv.getPointAt(s_ / L), 0.1 + rnd() * 0.08]); }
  const dr = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf0f4f0, transparent: true, opacity: 0.6, roughness: 0.02, metalness: 0.1 }), drops.length);
  drops.forEach(([v, r], i) => { O3.position.copy(v); O3.rotation.set(0, 0, 0); O3.scale.set(r, r * 1.15, r); O3.updateMatrix(); dr.setMatrixAt(i, O3.matrix); });
  MACRO.add(dr);
  const pol = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), M(0xf4c430)); pol.position.copy(drops[Math.floor(drops.length * 0.4)][0]).add(V3(0.1, 0, 0)); MACRO.add(pol);
  MACRO_EX.push({ name: "spider web capture thread", real: 2e-6, pos: V3(X, 6, (Z0 + Z1) / 2) });
  wSign(-84, false, ["a piece of an orb web", "the sticky spiral thread is ~2 µm → 2 cm thick, beaded with glue droplets ~30 µm → 30 cm",
    "the thread starts as an evenly coated line; within seconds the glue pulls itself into beads",
    "the straight radial threads (~4 µm → 4 cm) are dry: the spider walks on those",
    "silk is stronger than steel for its weight  ·  stuck in the glue: a sunflower pollen grain"]); }

// phone-screen pixels: an LCD at 326 pixels per inch, each pixel 78 µm → 78 cm, three subpixel stripes
{ const NX = 8, NY = 6, PX_ = 96, c = document.createElement("canvas"); c.width = NX * PX_; c.height = NY * PX_; const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(NX * 0.78, NY * 0.78), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  panel.position.set(-71, 0.6 + NY * 0.39, -14); panel.rotation.y = -Math.PI / 2; MACRO.add(panel);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, NY * 0.78 + 0.3, NX * 0.78 + 0.3), M(0x1a1a1a)); back.position.set(-70.8, panel.position.y, -14); MACRO.add(back);
  for (const dz of [-2.6, 2.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.2), M(0x1a1a1a)); leg.position.set(-70.8, 0.35, -14 + dz); MACRO.add(leg); }
  const scenes = [(x, y) => [1, 1, 1], (x, y) => [1, 1, 0], (x, y) => [0, 1, 1], (x, y) => [1, 0, 1],
    (x, y) => { const h = x / (NX - 1); return [Math.max(0, 1 - 2 * h), 1 - Math.abs(2 * h - 1), Math.max(0, 2 * h - 1)].map(v => v * (1 - y / (NY + 2))); },
    (x, y) => { const on = [[2, 1], [3, 1], [4, 1], [1, 2], [5, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [1, 4], [2, 5], [3, 5], [4, 5]].some(([a, b]) => a === x && b === y); return on ? [1, 1, 1] : [0.1, 0.15, 0.4]; }];
  const names = ["white = red + green + blue, all full", "yellow = red + green", "cyan = green + blue", "magenta = red + blue", "a rainbow fade", "a white letter on blue: part of a lower-case e"];
  let last = -1;
  procAnim.push(t => { if (!inMacro) return; const k = Math.floor(t / 3) % scenes.length; if (k === last) return; last = k;
    g.fillStyle = "#050505"; g.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) { const v = scenes[k](x, y);
      ["255,40,30", "40,255,60", "40,90,255"].forEach((col, i) => { g.fillStyle = `rgba(${col},${0.08 + 0.92 * v[i]})`; g.fillRect(x * PX_ + i * 32 + 4, y * PX_ + 6, 24, PX_ - 12); }); }
    tex.needsUpdate = true; status.textContent = names[k]; });
  const status = { textContent: "" };
  MACRO_EX.push({ name: "phone screen pixels", real: 78e-6, pos: panel.position });
  wSign(-14, true, ["a phone screen, 8 × 6 pixels of it", "each pixel 78 µm → 78 cm (326 per inch), made of red, green and blue subpixel stripes",
    "every colour you see is these three mixed: watch it cycle through white, yellow, cyan, magenta, a rainbow and a letter",
    "from normal viewing distance the eye cannot tell them apart (it resolves ~75 µm), so they blend",
    "a single pixel here is about the size of the tardigrade's head"]); }

// a CD's data track: pits 0.5 µm wide → 5 mm, 0.83–3.6 µm long → 8–36 mm, tracks 1.6 µm apart → 1.6 cm
{ const CC = V3(-71, 0, -33), W = 2.2;
  const pl = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 1.0, W + 0.4), M(0xe5ecef, { roughness: 0.8 })); pl.position.set(CC.x, 0.5, CC.z); MACRO.add(pl);
  const disc = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, W), M(0xd8dde2, { metalness: 0.9, roughness: 0.12 })); disc.position.set(CC.x, 1.01, CC.z); MACRO.add(disc);
  const nT = Math.floor(W / 0.016), pits = []; 
  for (let t = 0; t < nT; t++) { let x = -W / 2 + rnd() * 0.02; while (true) { const len = 0.0083 + Math.floor(rnd() * 9) * 0.00346, gap = 0.0083 + Math.floor(rnd() * 9) * 0.00346;
      if (x + len > W / 2) break; pits.push([x + len / 2, -W / 2 + 0.008 + t * 0.016, len]); x += len + gap; } }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.003, 0.005), M(0x6a7078, { metalness: 0.6, roughness: 0.35 }), pits.length);
  pits.forEach(([x, z, len], i) => { O3.position.set(CC.x + z, 1.021, CC.z + x); O3.rotation.set(0, Math.PI / 2, 0); O3.scale.set(len, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); });
  MACRO.add(im);
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.008, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }));
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false }));
  MACRO.add(spot, halo);
  procAnim.push(t => { if (!inMacro) return; const z = CC.z - W / 2 + ((t * 0.06) % W), x = CC.x - W / 2 + 0.008 + 0.016 * 60; spot.position.set(x, 1.024, z); halo.position.set(x, 1.025, z); });
  MACRO_EX.push({ name: "a CD's data track", real: 0.5e-6, pos: CC });
  wSign(-33, true, ["a CD's data track (a 0.22 mm square of it)", "pits 0.5 µm wide → 5 mm, 0.8–3.6 µm long → 8–36 mm; tracks 1.6 µm apart → 1.6 cm",
    "the red dot is the laser spot (~1.6 µm → 1.6 cm), shown crawling: really it reads 1.2 m of track a second (12 km/s here)",
    "each edge of a pit is a 1, each flat stretch between edges a run of 0s",
    "DVD tracks are 0.74 µm apart, Blu-ray 0.32 µm (3.2 mm here): smaller pits, shorter-wavelength light",
    "the rainbow on a CD comes from these tracks acting as a diffraction grating"]); }

// a cat flea, 2.5 mm → 25 m: flattened side to side to slip between hairs, armoured, combs of spines
// that catch in fur, backward-pointing bristles, and huge hind legs that fling it 100 times its length
{ const FC = V3(-60, 0, -52), fl = new THREE.Group(); fl.position.copy(FC); MACRO.add(fl);   // head to the north
  fl.rotation.y = Math.PI / 2;
  const sh = M(0x6b3a1e, { roughness: 0.3, metalness: 0.1 }), legF = M(0x7a4626, { roughness: 0.35 }), spine = M(0x2a160a);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 30), sh); body.scale.set(11, 7.5, 3.6); body.position.set(-1.5, 11, 0); body.rotation.z = 0.12; fl.add(body);
  for (let k = 0; k < 9; k++) { const x = 7 - k * 2.2, r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), M(0x4a2410)); r.scale.set(0.4, 7.0 * Math.sqrt(Math.max(0.05, 1 - ((x + 1.5) / 11) ** 2)), 3.5 * Math.sqrt(Math.max(0.05, 1 - ((x + 1.5) / 11) ** 2))); r.rotation.y = Math.PI / 2; r.position.set(x, 11, 0); fl.add(r); }
  const head = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), sh); head.scale.set(3.6, 4, 2.4); head.position.set(10.5, 9.2, 0); fl.add(head);
  for (const sd of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), M(0x111111, { roughness: 0.2 })); e.position.set(11.6, 10.2, sd * 2.1); fl.add(e);
    for (let k = 0; k < 8; k++) limb(V3(11 + k * 0.25, 6.4 + k * 0.1, sd * 1.6), V3(11.3 + k * 0.25, 4.9, sd * 1.8), 0.13, 0.03, spine, fl, false);       // genal comb
    for (let k = 0; k < 16; k++) { const a = -0.9 + k * 0.12; limb(V3(7.6, 11 + 7 * Math.sin(a), sd * 3.4 * Math.cos(a)), V3(6.4, 11 + 7.3 * Math.sin(a), sd * 3.6 * Math.cos(a)), 0.1, 0.03, spine, fl, false); }   // pronotal comb
    for (let k = 0; k < 40; k++) { const x = 5 - rnd() * 15, a = (rnd() - 0.3) * 1.4, r = Math.sqrt(Math.max(0.05, 1 - ((x + 1.5) / 11) ** 2));
      const b = V3(x, 11 + 7.4 * r * Math.sin(a), sd * 3.6 * r * Math.cos(a)); limb(b, b.clone().add(V3(-1.4, 0.4 * Math.sin(a), sd * 0.3)), 0.06, 0.02, spine, fl, false); }   // backward bristles
    limb(V3(12.5, 7, sd * 0.8), V3(13.6, 3.8, sd * 0.9), 0.25, 0.1, M(0x5a2a10), fl);   // mouthparts
    for (const [x, kx, kz, fx, fz, r] of [[7, 10, 4.5, 11, 6, 0.8], [2.5, 2.8, 5.5, 3.5, 7.5, 0.9], [-3, -9, 6, -1, 9.5, 1.4]]) {
      const c = V3(x, 6, sd * 2.4), k = V3(kx, x < 0 ? 9 : 4.5, sd * kz), a = V3((k.x + fx) / 2 + (x < 0 ? 3 : 0.8), 2.4, sd * (kz + fz) / 2), f = V3(fx + (x < 0 ? 5 : 1.6), 0.15, sd * fz);
      limb(c, k, r, r * 0.8, legF, fl); limb(k, a, r * 0.75, r * 0.5, legF, fl); limb(a, f, r * 0.45, r * 0.25, legF, fl); } }
  MACRO_EX.push({ name: "cat flea", real: 2.5e-3, pos: V3(FC.x, 8, FC.z) });
  wSign(-52, true, ["a cat flea (they bite dogs and people too)", "real 2.5 mm  ·  here 25 m  ·  flattened side to side to slip between hairs",
    "the rows of dark spines are combs (on its cheek and behind its head) that catch in fur, and its bristles all point backward:",
    "it moves forward through fur easily, and is very hard to pull out",
    "it jumps 100 times its length: a pad of rubbery resilin in its body is cocked like a spring and released, at ~100 g"]); }

// a water flea (Daphnia) in its own tank of water: 2 mm → 20 m, see-through, so you watch its heart
// beat (~4 times a second), its gut, its eggs, its legs pumping water and its big swimming antennae
{ const DC = V3(-60, 12, -100), tank = new THREE.Mesh(new THREE.BoxGeometry(30, 24, 30), new THREE.MeshStandardMaterial({ color: 0x9fd0dc, transparent: true, opacity: 0.16, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  tank.position.set(DC.x, 12.02, DC.z); tank.renderOrder = 3; MACRO.add(tank);
  const dp = new THREE.Group(); dp.position.copy(DC); dp.rotation.y = Math.PI / 2; MACRO.add(dp);   // head to the north
  const shellM = new THREE.MeshStandardMaterial({ color: 0xe8e0c0, transparent: true, opacity: 0.3, roughness: 0.25, depthWrite: false });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), shellM); shell.scale.set(7, 5.5, 3.2); shell.position.set(-1, 0, 0); shell.renderOrder = 2; dp.add(shell);
  limb(V3(-7.5, 1.5, 0), V3(-13, 3.5, 0), 0.5, 0.05, shellM, dp, false);                                         // tail spine
  const hd = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), shellM); hd.scale.set(3, 3, 2.4); hd.position.set(6.5, 1.5, 0); hd.renderOrder = 2; dp.add(hd);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1.1, 20, 14), M(0x111111, { roughness: 0.2 })); eye.position.set(8.2, 1.8, 0); dp.add(eye);
  const gutPts = [V3(7, 0.5, 0), V3(4, -0.5, 0), V3(0, -1.2, 0), V3(-4, -1, 0), V3(-6.5, 0.6, 0)];
  dp.add(tubeM(gutPts, 0.55, M(0x5a8a2a, { roughness: 0.6 }), 40, 10));
  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12), M(0xd05050, { emissive: 0x3a0a0a })); heart.position.set(3.4, 3.2, 0); dp.add(heart);
  for (let k = 0; k < 7; k++) { const egg = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), M(0x6a5a2a)); egg.position.set(-1 - (k % 4) * 1.6, 2.8 + Math.floor(k / 4) * 0.9, (k % 2 ? 0.7 : -0.7)); dp.add(egg); }
  const legs = []; for (let k = 0; k < 5; k++) { const lg = new THREE.Group(); lg.position.set(3 - k * 1.5, -2.6, 0); dp.add(lg);
    lg.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 2.2).translate(0, -0.9, 0), new THREE.MeshStandardMaterial({ color: 0xd8d0b0, transparent: true, opacity: 0.6 }))); legs.push(lg); }
  const ants = []; for (const sd of [-1, 1]) { const a = new THREE.Group(); a.position.set(6, 0.5, sd * 2); dp.add(a); ants.push([a, sd]);
    const L1 = V3(-1, 3.5, sd * 4); limb(V3(0, 0, 0), L1, 0.5, 0.35, M(0xd8cfa8), a);
    for (const br of [-1, 1]) { const tip = L1.clone().add(V3(-6, 2 + br * 2.5, sd * 3)); limb(L1, tip, 0.25, 0.15, M(0xd8cfa8), a);
      for (let k = 1; k < 5; k++) { const q = L1.clone().lerp(tip, k / 5); limb(q, q.clone().add(V3(-0.6, 1.4, sd * 0.4)), 0.04, 0.02, M(0xcfc6a0), a, false); } } }
  procAnim.push(t => { if (!inMacro) return; const hb = Math.sin(t * 4 * 2 * Math.PI); heart.scale.setScalar(1 + 0.25 * Math.max(0, hb));
    legs.forEach((lg, k) => { lg.rotation.z = 0.35 * Math.sin(t * 5 * 2 * Math.PI - k * 0.8); });
    const st = (t % 1.4) / 1.4, pw = st < 0.25 ? Math.sin(st / 0.25 * Math.PI) : 0;
    for (const [a, sd] of ants) a.rotation.set(0, 0, -0.5 + (st < 0.25 ? 1.2 * st / 0.25 : 1.2 * (1 - (st - 0.25) / 0.75)));
    dp.position.y = DC.y + 1.2 * Math.sin(t * 2 * Math.PI / 1.4 - 1.2); });
  MACRO_EX.push({ name: "water flea (Daphnia)", real: 2e-3, pos: DC });
  wSign(-100, true, ["a water flea (Daphnia), in a tank of pond water", "real 2 mm  ·  here 20 m  ·  a crustacean, related to shrimp and crabs, and see-through",
    "red: its heart, beating ~4 times a second (shown at its real rate)  ·  green: its gut, full of algae",
    "brown: eggs in its brood pouch; the leaf-like legs underneath pump water through a filter of fine hairs",
    "it rows with its big branched antennae in jerky hops: the 'flea'  ·  one black compound eye"]); }
function makeMini() {                                   // photograph the museum from above, once
  const N = IS_HEADSET ? 2048 : 4096, rt = new THREE.WebGLRenderTarget(N, N, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace; rt.texture.generateMipmaps = true;
  rt.texture.minFilter = THREE.LinearMipmapLinearFilter; rt.texture.anisotropy = 8;
  const h = MINI.W / 2, cam = new THREE.OrthographicCamera(-h, h, h, -h, 1, 6000);
  cam.position.set(MINI.cx, 3000, MINI.cz); cam.up.set(0, 0, -1); cam.lookAt(MINI.cx, 0, MINI.cz); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  const slide = window.__slide, keep = { bg: scene.background, fog: scene.fog, xr: renderer.xr.enabled, rt: renderer.getRenderTarget(),
    cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha(), w7: WORLD7.visible, m: MACRO.visible };
  const hair = WORLD7.getObjectByName("hair"); hair.visible = false;    // it lies across the patch as a solid log instead
  slide.visible = false; scene.background = null; scene.fog = null; renderer.xr.enabled = false; WORLD7.visible = true; MACRO.visible = false;
  renderer.setClearColor(0xdcebf0, 1);                  // bare glass where nothing stands
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
  renderer.setRenderTarget(keep.rt); renderer.setClearColor(keep.cc, keep.ca); renderer.xr.enabled = keep.xr;
  hair.visible = true; slide.visible = true; scene.background = keep.bg; scene.fog = keep.fog; WORLD7.visible = keep.w7; MACRO.visible = keep.m;
  miniMat.map = rt.texture; miniMat.needsUpdate = true; }
let miniDone = false;
portalGate(MACRO, BACK, -Math.PI / 2, 0x5dade2, ["PORTAL: SHRINK 1,000 TIMES", "back to the museum at ×10,000,000"]);
{ const sign = label(["TEN THOUSAND TIMES BIGGER", "you are 1.7 m here = 170 µm real: about two widths of a human hair",
    "1 micrometre → 1 centimetre  ·  1 millimetre → 10 metres",
    "the 2.4 m patch in front of you is the whole museum you came from, under its drop of water",
    "you are standing on the microscope slide: 750 × 250 m of glass, 10 m thick"],
    new THREE.Vector3(PORTAL.x - 0.5, 3.9, PORTAL.z - 4.6), 3.0, "banner");
  MACRO.add(sign);
  for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 3.3, 10), M(0x34495e));
    post.position.set(PORTAL.x - 0.5 + sx * 2.2, 1.65, PORTAL.z - 4.72); MACRO.add(post); } }
function face(theta) { if (renderer.xr.isPresenting) rig.rotation.y = theta; else { yaw = theta; pitch = -0.2; } }
function enterMacro() {
  if (!miniDone) { makeMini(); miniDone = true; }
  inMacro = true; WORLD7.visible = false; MACRO.visible = true; scene.background = AIRCOL; scene.fog = macroFog;
  rig.position.set(PORTAL.x, 0, PORTAL.z + 2.4); vy = 0; face(0); hudT = 0; }     // just south of the patch, looking at it
function leaveMacro(walkedBack) {
  if (!inMacro) return;
  inMacro = false; WORLD7.visible = true; MACRO.visible = false; scene.background = WATERCOL; scene.fog = museumFog; hudT = 0;
  if (walkedBack) { rig.position.set(PORTAL.x - 1.8, 0, PORTAL.z); vy = 0; face(Math.PI / 2); } }   // out of the portal, facing the plaza
function checkPortals() {
  const at = (p) => Math.hypot(rig.position.x - p.x, rig.position.z - p.z) < 0.55 && rig.position.y < 2.5;
  if (!inMacro && at(PORTAL)) enterMacro(); else if (inMacro && at(BACK)) leaveMacro(true); }
if (Q.has("macro")) setTimeout(enterMacro, 1500);      // ?macro in the address starts you through the portal
const nearMacro = () => MACRO_EX.reduce((a, b) => b.pos.distanceTo(rig.position) < a.pos.distanceTo(rig.position) ? b : a);
function readoutMacro(v) {
  const h = Math.max(0, rig.position.y + camera.position.y), nm = nearMacro();
  hud.innerHTML = `<b>×10,000</b> &nbsp;·&nbsp; you are 1.7 m here = <b>170 µm</b> real &nbsp;<span class="dim">(you grew 1,000 times)</span><br>
    ${flying ? "jetpack" : "walking"} <span class="k">F</span> &nbsp;·&nbsp; speed ${fmt(v)}/s here = <b>${fmtReal(v / K4)}/s</b> real size
    <span class="k">− =</span> or scroll<br>
    height above the slide: ${fmt(h)} = ${fmtReal(h / K4)}<br>
    nearest: <b>${nm.name}</b> — real ${fmtReal(nm.real)}, here ${fmt(nm.real * K4)}<br>
    <span class="dim">animals here move at their real speed · the slide is 750 × 250 m of glass, 10 m thick ·
    the blue portal beside the 2.4 m patch (the museum you came from) takes you back</span>`;
}
const camW = new THREE.Vector3();
// ---------- the loop -----------------------------------------------------------------
const clock = new THREE.Clock(), fwd = new THREE.Vector3(), side = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
let hudT = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), T = tau();
  let moved = 0; const prevX = rig.position.x, prevZ = rig.position.z;
  if (!renderer.xr.isPresenting) {
    camera.rotation.set(pitch, yaw, 0, "YXZ");
    const sp = speed * (keys.ShiftLeft || keys.ShiftRight ? 4 : 1) * dt;
    camera.getWorldDirection(fwd); if (!flying) { fwd.y = 0; fwd.normalize(); }
    side.crossVectors(fwd, upV).normalize();
    const before = rig.position.clone();
    if (keys.KeyW || keys.ArrowUp) rig.position.addScaledVector(fwd, sp);
    if (keys.KeyS || keys.ArrowDown) rig.position.addScaledVector(fwd, -sp);
    if (keys.KeyD) rig.position.addScaledVector(side, sp);
    if (keys.KeyA) rig.position.addScaledVector(side, -sp);
    if (flying && keys.Space) rig.position.y += sp;
    if (flying && (keys.KeyC || keys.ControlLeft)) rig.position.y -= sp;
    if (keys.ArrowLeft) yaw += 1.5 * dt; if (keys.ArrowRight) yaw -= 1.5 * dt;
    moved = dt > 0 ? before.distanceTo(rig.position) / dt : 0;
  } else {
    const s = renderer.xr.getSession(); let boost = 1;
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue;
      if (src.handedness === "right") { if (gp.buttons[0]?.value > 0.3) boost = 5;            // trigger: fast
        if (tap("R", 4, gp)) tauI = Math.max(0, tauI - 1);                                     // A: slower time
        if (tap("R", 5, gp)) tauI = Math.min(TAUS.length - 1, tauI + 1); }                     // B: faster time
      if (src.handedness === "left") { if (tap("L", 4, gp)) jumpToHall(hallI - 1);             // X: previous hall
        if (tap("L", 5, gp)) jumpToHall(hallI + 1); } }                                        // Y: next hall
    // read each stick wherever the browser puts it (axes 2,3 on Quest; 0,1 on some browsers)
    const stick = a => { if (!a) return [0, 0]; const p = a.length >= 4 && (Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1])) ? 2 : 0;
      const x = a[p] || 0, y = a[p + 1] || 0; return [Math.abs(x) > 0.12 ? x : 0, Math.abs(y) > 0.12 ? y : 0]; };
    let mx = 0, my = 0; vrSticks = "";
    for (const src of s?.inputSources || []) { const [ax, ay] = stick(src.gamepad?.axes);
      vrSticks += `${src.handedness[0] || "?"} ${ax.toFixed(2)},${ay.toFixed(2)}  `;
      if (src.handedness === "left") { mx += ax; my += ay; }
      else { my += ay;                                            // right stick forward/back moves too
        if (Math.abs(ax) > 0.7 && snap) { rig.rotation.y -= Math.sign(ax) * Math.PI / 6; snap = false; }
        else if (Math.abs(ax) < 0.3) snap = true; } }
    if (mx || my) {                                               // fly where the headset looks
      // the headset's gaze (camera.quaternion holds its pose relative to the rig), turned by the rig's snap turns
      fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion).normalize();
      side.crossVectors(fwd, upV).normalize();
      rig.position.addScaledVector(fwd, -my * speed * boost * dt).addScaledVector(side, mx * speed * boost * dt);
      moved = speed * boost * Math.min(1, Math.hypot(mx, my)); }
  }
  // the ground: 0 on the slide, the surface itself in the Surfaces hall; steps over 0.7 m are walls when walking
  if (!flying && groundH(rig.position.x, rig.position.z) > groundH(prevX, prevZ) + 0.7) { rig.position.x = prevX; rig.position.z = prevZ; }
  const gh = groundH(rig.position.x, rig.position.z);
  if (!flying) { vy -= 9.8 * dt; rig.position.y += vy * dt; if (rig.position.y < gh) { rig.position.y = gh; vy = 0;
    if (keys.Space) vy = 3.5; } } else vy = 0;
  rig.position.y = Math.max(gh, rig.position.y);
  checkPortals();

  // water: Brownian steps, rms sqrt(2 D tau dt) per axis, scaled by S
  const sw = Math.sqrt(2 * REAL.dWater * T * dt) * S;
  waterPts.visible = true;
  camera.getWorldPosition(camW);
  const vrFar = (x, y, z, r) => renderer.xr.isPresenting && Math.hypot(camW.x - x, camW.y - y, camW.z - z) > r;
  if (sw < 0.02 && !vrFar(0, DY, 3, 6)) {
    const p = waterPts.geometry.attributes.position.array, x0 = -0.27, x1 = -0.27 + dnaLen;
    for (let i = 0; i < NW; i++) {
      let x = p[3 * i] + gauss() * sw, y = p[3 * i + 1] + gauss() * sw, z = p[3 * i + 2] + gauss() * sw;
      const dy = y - DY, dz = z - 3.0, r2 = dy * dy + dz * dz;
      if (r2 > WR * WR || r2 < sz(1 * nm) ** 2 || dz > 0) { y = p[3 * i + 1]; z = p[3 * i + 2]; }   // stay in the half-shell
      if (x < x0) x += dnaLen; if (x > x1) x -= dnaLen;
      p[3 * i] = x; p[3 * i + 1] = y; p[3 * i + 2] = z;
    }
    waterPts.geometry.attributes.position.needsUpdate = true;
  }
  // flagella turn at 100 Hz real; the bacterium runs and tumbles
  for (const f of flagella) f.userData.spin.rotation.x += REAL.flagellumHz * 6.283 * T * dt;
  const vr = renderer.xr.isPresenting; animDt += T * dt; animFrame++;
  if (!vr || animFrame % 3 === 0) {             // in VR the animations update every third frame (same speed, less work)
    if (!vrFar(9, 1.5, MTZ, 40)) updateMotors(animDt);
    updateMuscle(animDt, vrFar(SAR.position.x, 2, SAR.position.z, 70), vrFar(NMJ.position.x, NMJ.position.y, NMJ.position.z, 260));
    for (const f of animate) f(animDt); animDt = 0; }
  for (const w of WAVES) {                    // light: phase advances 2π f per real second
    const dph = 6.2831853 * w.f * T * dt; if (dph < 3) w.mat.uniforms.phase.value = (w.mat.uniforms.phase.value + dph) % 6.2831853; }
  const es = ecoliState;
  if (es.tumble > 0) { es.tumble -= T * dt; if (es.tumble <= 0) {
      es.dir.set(gauss(), 0, gauss()).normalize(); es.run = -Math.log(rnd()) * 1.0; } }   // it glides along the glass
  else { es.run -= T * dt; ECOLI.position.addScaledVector(es.dir, sz(REAL.swim) * T * dt);
    if (es.run <= 0) es.tumble = 0.1; }
  ECOLI.position.y = eR - 0.4;
  if (ECOLI.position.distanceTo(EHOME) > 18) es.dir.copy(EHOME).sub(ECOLI.position).normalize();
  ECOLI.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), es.dir), Math.min(1, T * dt * 20));

  camera.getWorldPosition(camW);
  if (renderer.xr.isPresenting) { fpsN++; fpsT += dt; if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; } }
  for (const f of wallAnim) f(clock.elapsedTime);
  for (const f of procAnim) f(clock.elapsedTime);
  for (const r of PLAQUES) if (r.kind === "plaque") {          // plaques come into view as you walk up to them
    const d = Math.hypot(camW.x - r.g.position.x, camW.z - r.g.position.z), o = THREE.MathUtils.clamp((r.reach - d) / (r.reach * 0.35), 0, 1);
    r.g.visible = o > 0.01; if (r.g.visible) for (const m of r.mats) m.opacity = o; }
  hudT -= dt; if (hudT <= 0) { const v = moved > 0 ? moved : speed;
    if (renderer.xr.isPresenting) { hudT = 0.35; try { drawWrist(v); } catch (e) { console.warn(e); } } else { readout(v); hudT = 0.2; } }
  renderer.render(scene, camera);
});

// ==========================================================================================
//  CAPTURE MODE, for micrographs.py only (needs ?cap=... in the address; the museum is
//  otherwise untouched). Renders one top-down (or tilted) orthographic view of the museum
//  at its true size and posts it back:
//    mode=lm   colour, as a light microscope sees it (glass slide invisible, bright field)
//    mode=sem  surface normals, which micrographs.py turns into secondary-electron contrast
//    mode=tem  a thin horizontal section (y0..y1), every surface drawn faintly dark and
//              stacked, so overlapping material reads as electron density
// ==========================================================================================
if (Q.has("cap")) setTimeout(() => {
  const [x0, x1, z0, z1] = Q.get("box").split(",").map(Number), mode = Q.get("mode"), tilt = Number(Q.get("tilt") || 0) * Math.PI / 180;
  const N = Number(Q.get("px") || 1600);
  renderer.setAnimationLoop(null); renderer.setSize(N, N); renderer.setPixelRatio(1);
  scene.fog = null; PLAQUES.forEach(p => p.g.visible = false);
  scene.traverse(o => { if (o.isPoints || o.isSprite || o.isLine || o.isLineSegments) o.visible = false; });
  const W = x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, W / 2, -W / 2, 0.01, 20000);
  const D = 5000; cam.position.set(cx, Math.cos(tilt) * D, cz + Math.sin(tilt) * D);
  cam.up.set(0, 0, -1); if (tilt) cam.up.set(0, 1, 0); cam.lookAt(cx, 0, cz); cam.updateProjectionMatrix();
  const slide = window.__slide;
  if (mode === "lm") { slide.visible = false; scene.background = new THREE.Color(0xf4f2ea); }
  if (mode === "sem") { scene.background = new THREE.Color(0x8080ff); scene.overrideMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }); }
  if (mode === "tem") { const y0 = Number(Q.get("y0") || 0), y1 = Number(Q.get("y1") || 1e9);
    slide.visible = false; scene.background = new THREE.Color(0xffffff);
    if (Q.has("bare")) scene.traverse(o => { if (o.isMesh && (o.userData.plinth || o.material === pathMat)) o.visible = false; });   // free particles on the grid, no stands
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -y0), new THREE.Plane(new THREE.Vector3(0, -1, 0), y1)];
    scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: Number(Q.get("op") || 0.12),
      side: THREE.DoubleSide, depthTest: false, depthWrite: false }); }
  renderer.render(scene, cam);
  renderer.domElement.toBlob(b => fetch("/shot", { method: "POST", body: b }), "image/png");
}, Number(Q.get("wait") || 4000));
