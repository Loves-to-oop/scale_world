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
  lightGreen: 530 * nm,
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
scene.fog = new THREE.FogExp2(0x9cc4d8, 0.0011);
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

// labels: name, real size, size here
const LABELS = [];
function label(lines, pos, scale = 1) {
  const c = document.createElement("canvas"), g = c.getContext("2d"), px = 44;
  g.font = `600 ${px}px -apple-system, Helvetica, sans-serif`;
  const w = Math.max(...lines.map((l, i) => { g.font = `${i ? 400 : 600} ${i ? px * 0.72 : px}px -apple-system, Helvetica, sans-serif`;
    return g.measureText(l).width; })) + 30;
  c.width = w; c.height = px * 1.25 + (lines.length - 1) * px * 0.95 + 16;
  g.fillStyle = "rgba(10,30,45,.72)"; g.fillRect(0, 0, c.width, c.height);
  lines.forEach((l, i) => { g.font = `${i ? 400 : 600} ${i ? px * 0.72 : px}px -apple-system, Helvetica, sans-serif`;
    g.fillStyle = i ? "#cfe6f2" : "#ffffff"; g.fillText(l, 15, px * 1.05 + i * px * 0.95); });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false }));
  s.scale.set(c.width / 600 * scale, c.height / 600 * scale, 1); s.position.copy(pos);
  scene.add(s); LABELS.push(s); return s;
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
const ECOLI = new THREE.Group(); ECOLI.position.set(-20, 9, -45); scene.add(ECOLI);
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
  new THREE.Vector3(-20, 16.5, -45), 4);

// ---------- red blood cells and an animal cell -------------------------------------
function rbc() {                           // biconcave disc: 7.8 µm across, 2.5 µm rim, ~1 µm centre
  const R = sz(REAL.rbcDiam) / 2, pts = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40, r = u * R;
    const t = sz(REAL.rbcThick) / 2 * Math.sqrt(Math.max(0, 1 - u * u)) * (0.38 + 1.6 * u * u - 0.9 * u ** 4);
    pts.push(new THREE.Vector2(r, t)); }
  for (let i = 40; i >= 0; i--) pts.push(new THREE.Vector2(pts[i].x, -pts[i].y));
  return new THREE.Mesh(new THREE.LatheGeometry(pts, 64), M(0xb3312a, { roughness: 0.45 }));
}
for (const [x, y, z, rx] of [[170, 30, -120, 0.5], [230, 50, -60, 1.2], [200, 22, -200, 0.2]]) {
  const r = rbc(); r.position.set(x, y, z); r.rotation.set(rx, 0.4, 0.3); scene.add(r);
}
label(sizeLines("red blood cell", REAL.rbcDiam), new THREE.Vector3(170, 78, -120), 14);
const CELL = new THREE.Group(); CELL.position.set(-120, sz(REAL.cell) / 2 + 2, -420); scene.add(CELL);
{
  const R = sz(REAL.cell) / 2;
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
  hair.rotation.set(0, 0.35, Math.PI / 2); hair.position.set(0, sz(REAL.hair) / 2, -1900); scene.add(hair);
  label(sizeLines("a human hair", REAL.hair), new THREE.Vector3(0, sz(REAL.hair) + 90, -1700), 160);
}

// ---------- time: real rates at a chosen time scale --------------------------------
const TAUS = [1e-12, 1e-11, 1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1];
const TAU_NAMES = ["1 picosecond", "10 ps", "100 ps", "1 nanosecond", "10 ns", "100 ns", "1 microsecond",
  "10 µs", "100 µs", "1 millisecond", "10 ms", "100 ms", "1 second"];
let tauI = 0;                              // start slow enough to see water move
const tau = () => TAUS[tauI];
// E. coli run-and-tumble: runs ~1 s straight, tumbles ~0.1 s to a new direction
const ecoliState = { dir: new THREE.Vector3(1, 0, 0), run: 1, tumble: 0 };

// ---------- moving: walk on the slide, or fly with the jetpack ---------------------
rig.position.copy(START); let yaw = 0, pitch = 0, flying = true, speed = 2, vy = 0;
const keys = {};
addEventListener("keydown", e => {
  keys[e.code] = true; start();
  if (e.code === "BracketRight") tauI = Math.min(TAUS.length - 1, tauI + 1);
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
if (Q.get("tau")) tauI = Number(Q.get("tau"));

// VR: Enter VR, left stick to fly where you look, right stick to snap-turn
const vrBtn = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return;
  vrBtn.style.display = "block";
  vrBtn.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); camera.position.y = 0; start();
    s.addEventListener("end", () => camera.position.y = 1.65); }; });
let snap = true;

// ---------- the readout --------------------------------------------------------------
const hud = document.getElementById("hud");
const near = [...ladder.map(l => ({ name: l.name, real: l.real, pos: new THREE.Vector3(l.x, 1, -3) })),
  { name: "E. coli", real: REAL.ecoliLen, pos: ECOLI.position }, { name: "animal cell", real: REAL.cell, pos: CELL.position },
  { name: "DNA helix", real: REAL.dnaWidth, pos: new THREE.Vector3(0, DY, 3) }];
function readout(v) {
  const h = rig.position.y + camera.position.y, realSpeed = v / S / tau();
  const n = near.reduce((a, b) => b.pos.distanceTo(rig.position) < a.pos.distanceTo(rig.position) ? b : a);
  const dWater = Math.sqrt(6 * REAL.dWater * tau()) * S;        // rms 3D step of a water molecule, per second here
  hud.innerHTML = `<b>×10,000,000</b> &nbsp;·&nbsp; you are 1.7 m here = <b>170 nm</b> real<br>
    time: 1 second here = <b>${TAU_NAMES[tauI]}</b> real &nbsp;<span class="k">[ ]</span> to change<br>
    ${flying ? "jetpack" : "walking"} <span class="k">F</span> &nbsp;·&nbsp; speed ${fmt(v)}/s here = <b>${fmtReal(realSpeed)}/s</b> real
    <span class="k">− =</span> or scroll<br>
    height above the slide: ${fmt(Math.max(0, h))} = ${fmtReal(Math.max(0, h) / S)}<br>
    nearest: <b>${n.name}</b> — real ${fmtReal(n.real)}, here ${fmt(sz(n.real))}<br>
    <span class="dim">a water molecule moves ~${fmt(dWater)} each second at this time scale
    ${dWater > 0.05 ? "— too fast to follow, shown frozen" : ""}</span>`;
}

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
    const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const a = src.gamepad?.axes; if (!a || a.length < 4) continue;
      if (src.handedness === "left") { camera.getWorldDirection(fwd); side.crossVectors(fwd, upV).normalize();
        rig.position.addScaledVector(fwd, -a[3] * speed * dt).addScaledVector(side, a[2] * speed * dt); moved = speed; }
      else if (Math.abs(a[2]) > 0.7 && snap) { rig.rotation.y -= Math.sign(a[2]) * Math.PI / 6; snap = false; }
      else if (Math.abs(a[2]) < 0.3) snap = true; }
  }
  if (!flying) { vy -= 9.8 * dt; rig.position.y += vy * dt; if (rig.position.y < 0) { rig.position.y = 0; vy = 0;
    if (keys.Space) vy = 3.5; } } else vy = 0;
  rig.position.y = Math.max(0, rig.position.y);

  // water: Brownian steps, rms sqrt(2 D tau dt) per axis, scaled by S
  const sw = Math.sqrt(2 * REAL.dWater * T * dt) * S;
  waterPts.visible = true;
  if (sw < 0.02) {
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
  const es = ecoliState;
  if (es.tumble > 0) { es.tumble -= T * dt; if (es.tumble <= 0) {
      es.dir.set(gauss(), gauss() * 0.3, gauss()).normalize(); es.run = -Math.log(rnd()) * 1.0; } }
  else { es.run -= T * dt; ECOLI.position.addScaledVector(es.dir, sz(REAL.swim) * T * dt);
    if (es.run <= 0) es.tumble = 0.1; }
  ECOLI.position.y = Math.max(eR + 1, ECOLI.position.y);
  if (ECOLI.position.distanceTo(new THREE.Vector3(-20, 9, -45)) > 120) es.dir.set(-20, 9, -45).sub(ECOLI.position).normalize();
  ECOLI.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), es.dir), Math.min(1, T * dt * 20));

  hudT -= dt; if (hudT <= 0) { readout(moved > 0 ? moved : speed); hudT = 0.2; }
  renderer.render(scene, camera);
});
