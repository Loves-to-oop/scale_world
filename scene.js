/* The world at ten million times: if an atom were a grain of sand.
   THREE is defined above this file by build.py (three.js inlined).

   Every size below is a measured value in metres, multiplied by S = 1e7 in one
   place (sz). Every motion is a measured rate, run at a chosen time scale TAU
   (real seconds per second you experience). Values from BioNumbers / Milo &
   Phillips, "Cell Biology by the Numbers" (2015) unless noted. */

const S = 1e7;                                   // the magnification
const sz = metres => metres * S;                 // real -> this world
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
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const WATERCOL = new THREE.Color(0x9cc4d8);        // everything here is under water
scene.background = WATERCOL;
scene.fog = new THREE.FogExp2(0x9cc4d8, 0.0009);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.0005, 20000);
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
    depthWrite: kind !== "floor" }));
  const g3 = new THREE.Group(); scene.add(g3);
  const rec = { g: g3, face, W, H: Hh, kind, anchor: new THREE.Vector3(pos.x, 0, pos.z), y: pos.y, mats: [face.material] };
  if (kind === "floor") { face.rotation.x = -Math.PI / 2; face.position.y = 0.012; g3.add(face); g3.position.set(pos.x, 0, pos.z); }
  else if (kind === "banner") { face.position.y = pos.y; g3.add(face);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W * 1.02, Hh * 1.04, Math.max(0.02, W * 0.01)), M(0x2c3e50)); back.position.set(0, pos.y, -Math.max(0.011, W * 0.0051)); g3.add(back);
    g3.position.set(pos.x, 0, pos.z); }
  else {                                                     // a plaque: a lectern for small signs, a two-post board for big ones
    const stand = M(0x34495e), backMat = M(0x2c3e50, { transparent: true });
    const back = new THREE.Mesh(new THREE.BoxGeometry(W * 1.03, Hh * 1.05, Math.max(0.02, W * 0.012)), backMat);
    rec.mats.push(backMat);
    const holder = new THREE.Group(); holder.add(back, face); face.position.z = Math.max(0.011, W * 0.0061);
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
  const slide = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.25, metalness: 0.05, color: 0xdbe9ee }));
  scene.add(slide);
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
  const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, sz(REAL.flagellumD) / 2, 6), M(0xd8e8c8));
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
const CELL = new THREE.Group(); CELL.position.set(160, sz(REAL.cell) / 2 * 0.82, -470);   // settled, a little flattened scene.add(CELL);
{
  const R = sz(REAL.cell) / 2;
  CELL.scale.set(1.08, 0.82, 1.08);
  CELL.add(new THREE.Mesh(new THREE.IcosahedronGeometry(R, 5), new THREE.MeshStandardMaterial({
    color: 0xe8c9a0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })));
  const nuc = new THREE.Mesh(new THREE.IcosahedronGeometry(sz(REAL.nucleus) / 2, 4), M(0x6a4c93, { roughness: 0.7 }));
  nuc.position.set(8, 6, 0); CELL.add(nuc);
  const [mw, ml] = REAL.mito.map(sz);
  const mitos = new THREE.InstancedMesh(new THREE.CapsuleGeometry(mw / 2, ml - mw, 6, 12), M(0xd35400), 320);
  const d = new THREE.Object3D(); let k = 0;
  while (k < 320) { const v = new THREE.Vector3(gauss(), gauss() * 0.8, gauss()).multiplyScalar(R * 0.4);
    if (v.length() > R - 6 || v.distanceTo(nuc.position) < sz(REAL.nucleus) / 2 + 4) continue;
    d.position.copy(v); d.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6); d.updateMatrix(); mitos.setMatrixAt(k++, d.matrix); }
  CELL.add(mitos);
}
label(sizeLines("animal cell", REAL.cell).concat(["nucleus " + fmt(sz(REAL.nucleus)) + "  ·  mitochondria " + fmt(sz(REAL.mito[1]))]),
  CELL.position.clone().add(new THREE.Vector3(0, sz(REAL.cell) / 2 + 25, 0)), 40);
// a human hair lying across the slide: 80 µm thick = an 800 m ridge
{
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(sz(REAL.hair) / 2, sz(REAL.hair) / 2, 20000, 48),
    M(0x4a3020, { roughness: 0.85 }));
  hair.rotation.set(0, 0.35, Math.PI / 2); hair.position.set(0, sz(REAL.hair) / 2, -1150); scene.add(hair);
  label(sizeLines("a human hair", REAL.hair), new THREE.Vector3(0, sz(REAL.hair) + 90, -950), 160);
}

// ---------- the ruler: a scale bar on the slide, marked in real units ---------------
// it runs from the start straight ahead (-z); 1 cm here = 1 nm real
{
  const RX = -2.2, z0 = 3.5, LEN = 720, dark = M(0x23404f);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, LEN), M(0xf2ede0));
  strip.position.set(RX, 0.002, z0 - LEN / 2); scene.add(strip);
  const ticks = [];                      // [distance m, tick length m]
  for (let d = 0; d <= 1.0001; d += 0.01) ticks.push([d, Math.round(d * 100) % 10 ? 0.06 : 0.14]);
  for (let d = 1.1; d <= 10.0001; d += 0.1) ticks.push([d, Math.round(d * 10) % 10 ? 0.1 : 0.25]);
  for (let d = 11; d <= 100.0001; d += 1) ticks.push([d, d % 10 ? 0.15 : 0.35]);
  for (let d = 110; d <= LEN; d += 10) ticks.push([d, d % 50 ? 0.2 : 0.45]);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.006, 1), dark, ticks.length), o = new THREE.Object3D();
  ticks.forEach(([d, l], i) => { const w = d <= 1 ? 0.003 : d <= 10 ? 0.012 : d <= 100 ? 0.05 : 0.2;
    o.position.set(RX - 0.25 + l / 2, 0.006, z0 - d); o.scale.set(l, 1, w); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
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
    const tag = label([`${n} ${l} nm`], new THREE.Vector3(fx - 0.9, 0.85 + i * 0.52, fz), 0.32, "banner"); });
  label(["the visible rainbow", "violet 400 nm → 4 m  ·  red 700 nm → 7 m: two waves of each",
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
  { id: "nonliving", name: "Non-living things", side: 1,  z0: -18,  z1: -114, w: 104, col: 0x95a5a6, line: "materials, light, a chip and a CD" },
  { id: "viruses",   name: "Viruses",           side: -1, z0: -78,  z1: -120, w: 46,  col: 0xe74c3c, line: "packages of genes that need a cell" },
  { id: "bacteria",  name: "Bacteria",          side: 1,  z0: -124, z1: -215, w: 160,  col: 0x52be80, line: "cells without a nucleus" },
  { id: "archaea",   name: "Archaea",           side: -1, z0: -124, z1: -215, w: 120,  col: 0xf5b041, line: "the other cells without a nucleus" },
  { id: "eukaryotes",name: "Eukaryotes",        side: 0,  z0: -230, z1: -580, w: 380, col: 0xec7063, line: "cells with a nucleus: yeast to muscle" },
];
for (const h of HALLS) {
  const cx = h.side === 0 ? 0 : h.side * (2 + h.w / 2), len = h.z0 - h.z1;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(h.w, 0.004, len), new THREE.MeshStandardMaterial({
    color: h.col, transparent: true, opacity: h.id === "entrance" ? 0.0 : 0.16, depthWrite: false }));
  mat.position.set(cx, 0.003, (h.z0 + h.z1) / 2); scene.add(mat);
  h.entry = new THREE.Vector3(h.side === 0 ? 0.8 : h.side * 1.0, 0, h.z0 - 1);
  h.look = new THREE.Vector3(cx, 0, (h.z0 + h.z1) / 2);
  if (h.id === "entrance") continue;
  // a banner at the entrance, sized to the hall
  const big = Math.min(6, Math.max(1.2, h.w / 14));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * big, 0.05 * big, 2.6 * big, 8), M(0x34495e));
  const px = h.side === 0 ? -3 : h.side * 2.6; pole.position.set(px, 1.3 * big, h.z0); scene.add(pole);
  label([h.name.toUpperCase(), h.line], new THREE.Vector3(px, 2.6 * big, h.z0 + 0.06 * big), 1.1 * big, "banner");
}
const plinth = (x, z, top = 0.9, w = 0.5) => { const p = new THREE.Mesh(new THREE.BoxGeometry(w, top, w), M(0xe5ecef, { roughness: 0.8 }));
  p.position.set(x, top / 2, z); scene.add(p); return top; };
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
    const flag = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fl), 300, sz(REAL.flagellumD) / 2, 5), M(0xd8e8c8)); flag.userData.dynamic = true; g.add(flag);
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
      arch.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, sz(6 * nm), 4), M(0xf0b27a))); }
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
const pathMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9, color: 0xd8c9a8, side: THREE.DoubleSide });
const PATHS = [];                                        // [points, width]
function path(pts, w = 2.2) {                            // a flat paved ribbon along a polyline
  const P = pts.map(([x, z]) => new THREE.Vector2(x, z)), pos = [], uv = [], idx = [];
  let run = 0;
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], t = b.clone().sub(a).normalize(), n = new THREE.Vector2(-t.y, t.x);
    if (i) run += p.distanceTo(P[i - 1]);
    pos.push(p.x + n.x * w / 2, 0.008, p.y + n.y * w / 2, p.x - n.x * w / 2, 0.008, p.y - n.y * w / 2);
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
{ const plaza = new THREE.Mesh(new THREE.CircleGeometry(13, 64).rotateX(-Math.PI / 2), pathMat); plaza.position.set(AVX, 0.007, 1); scene.add(plaza); }
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
                   [[3.7, -470], [56, -470]], [[3.7, -622], [96, -622]], [[-1.3, -642], [-150, -680]]]) path(pts, 3);   // the big ones

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
    const cx = h.side === 0 ? 0 : h.side * (2 + h.w / 2);
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
      tuft.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, sz(6 * nm), 4), M(0xf1948a))); }
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

// ---------- the guide: jump to any hall ------------------------------------------------
window.museum = { rig, HALLS, renderer, scene, get mergeStatic() { return mergeStatic; } };                 // handy from the browser console
{
  const guide = document.getElementById("guide");
  guide.innerHTML = "<b>Museum guide</b>" + HALLS.map(h => `<button data-h="${h.id}"><i style="background:#${h.col.toString(16).padStart(6, "0")}"></i>${h.name}</button>`).join("");
  guide.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    const h = HALLS.find(x => x.id === b.dataset.h); rig.position.copy(h.entry);
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
rig.position.copy(START); let yaw = 0, pitch = 0, flying = true, speed = 2, vy = 0;
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
  const skip = new Set([ECOLI, kinesin.g, dynein.g, SAR, FIB, NMJ, waterPts, ...PLAQUES.map(p => p.g)]);
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
    scene.add(new THREE.Mesh(out, mat));
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
  line(`${hall.name}  ·  ×10,000,000`, 50, 34, "#ffffff", 700);
  line(`time: 1 s here = ${TAU_NAMES[tauI]}`, 100, 28);
  line(`speed ${fmt(v)}/s = ${fmtReal(v / S / tau())}/s real`, 145, 28);
  line(`nearest: ${n.name}`, 195, 28, "#ffe9a8");
  line(`real ${fmtReal(n.real)}  ·  here ${fmt(sz(n.real))}`, 237, 26);
  line("left stick fly · right stick: forward/back + turn · trigger fast", 300, 22, "#a9c6d4");
  line(`sticks: ${vrSticks}`, 375, 20, "#7f9fb0");
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
    s.addEventListener("end", () => { camera.position.y = 1.65; rig.rotation.y = 0; }); }; });
let snap = true, hallI = 0, vrSticks = "";
const pressed = {};                                       // edge detection for controller buttons
const tap = (hand, i, gp) => { const k = hand + i, now = !!gp.buttons[i]?.pressed, was = pressed[k]; pressed[k] = now; return now && !was; };
function jumpToHall(i) { hallI = (i + HALLS.length) % HALLS.length; const h = HALLS[hallI];
  rig.position.copy(h.entry); const d = h.look.clone().sub(h.entry); rig.rotation.y = Math.atan2(-d.x, -d.z); }

// ---------- the readout --------------------------------------------------------------
const hud = document.getElementById("hud");
const near = [...ladder.map(l => ({ name: l.name, real: l.real, pos: new THREE.Vector3(l.x, 1, l.z ?? -3) })),
  { name: "E. coli", real: REAL.ecoliLen, pos: ECOLI.position }, { name: "animal cell", real: REAL.cell, pos: CELL.position },
  { name: "DNA helix", real: REAL.dnaWidth, pos: new THREE.Vector3(0, DY, 3) }];
function readout(v) {
  const h = rig.position.y + camera.position.y, realSpeed = v / S / tau();
  const n = near.reduce((a, b) => b.pos.distanceTo(rig.position) < a.pos.distanceTo(rig.position) ? b : a);
  const dWater = Math.sqrt(6 * REAL.dWater * tau()) * S;        // rms 3D step of a water molecule, per second here
  hud.innerHTML = `<b>×10,000,000</b> &nbsp;·&nbsp; you are 1.7 m here = <b>170 nm</b> real<br>
    time: 1 second here = <b>${TAU_NAMES[tauI]}</b> real &nbsp;<span class="k">[ ]</span> or <span class="k">0</span> light · <span class="k">1</span> water · <span class="k">2</span> bacteria · <span class="k">3</span> motors &amp; muscle<br>
    ${flying ? "jetpack" : "walking"} <span class="k">F</span> &nbsp;·&nbsp; speed ${fmt(v)}/s here = <b>${fmtReal(realSpeed)}/s</b> real
    <span class="k">− =</span> or scroll<br>
    height above the slide: ${fmt(Math.max(0, h))} = ${fmtReal(Math.max(0, h) / S)}<br>
    nearest: <b>${n.name}</b> — real ${fmtReal(n.real)}, here ${fmt(sz(n.real))}<br>
    <span class="dim">a water molecule moves ~${fmt(dWater)} each second at this time scale
    ${dWater > 0.05 ? "— too fast to follow, shown frozen" : ""}</span>`;
}

placePlaques();
const camW = new THREE.Vector3();
// ---------- the loop -----------------------------------------------------------------
const clock = new THREE.Clock(), fwd = new THREE.Vector3(), side = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0);
let hudT = 0;
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), T = tau();
  let moved = 0;
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
  if (!flying) { vy -= 9.8 * dt; rig.position.y += vy * dt; if (rig.position.y < 0) { rig.position.y = 0; vy = 0;
    if (keys.Space) vy = 3.5; } } else vy = 0;
  rig.position.y = Math.max(0, rig.position.y);

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
  updateMotors(T * dt); updateMuscle(T * dt, vrFar(SAR.position.x, 2, SAR.position.z, 70), vrFar(NMJ.position.x, NMJ.position.y, NMJ.position.z, 260)); for (const f of animate) f(T * dt);
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
  for (const r of PLAQUES) if (r.kind === "plaque") {          // plaques come into view as you walk up to them
    const d = Math.hypot(camW.x - r.g.position.x, camW.z - r.g.position.z), o = THREE.MathUtils.clamp((r.reach - d) / (r.reach * 0.35), 0, 1);
    r.g.visible = o > 0.01; if (r.g.visible) for (const m of r.mats) m.opacity = o; }
  hudT -= dt; if (hudT <= 0) { const v = moved > 0 ? moved : speed;
    if (renderer.xr.isPresenting) { hudT = 0.35; try { drawWrist(v); } catch (e) { console.warn(e); } } else { readout(v); hudT = 0.2; } }
  renderer.render(scene, camera);
});
