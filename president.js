// president.js -- a term as President of the United States. Built into president.html by build.py.
// A walkable White House (West Wing rooms at their real relative layout, the Residence, Rose Garden, South Lawn,
// Marine One) plus the places presidents go: the House chamber, Camp David, Air Force One, the UN General Assembly,
// and towns (disasters, factories, rallies). Each month is one representative day: the daily brief, then decisions
// in the room where they really happen. Issues are fictional and nonpartisan; the facts about the job are real.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 6000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.65;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const O3 = new THREE.Object3D();
let s0 = 2024; const srnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * Math.random()); };
const tex = (w, h, draw, rep) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); } return t; };

// ---------- shared textures ----------
function drawSeal(g, cx, cy, r) {
  g.fillStyle = "#1c2f6b"; g.beginPath(); g.arc(cx, cy, r, 0, 6.283); g.fill(); g.strokeStyle = "#d4af37"; g.lineWidth = r * 0.06; g.beginPath(); g.arc(cx, cy, r * 0.97, 0, 6.283); g.stroke();
  g.beginPath(); g.arc(cx, cy, r * 0.7, 0, 6.283); g.stroke(); g.fillStyle = "#e8d8a0"; g.font = `700 ${r * 0.12}px Georgia`; g.textAlign = "center"; g.textBaseline = "middle";
  const txt = "SEAL OF THE PRESIDENT OF THE UNITED STATES"; for (let i = 0; i < txt.length; i++) { const a = -Math.PI * 0.95 + i / (txt.length - 1) * Math.PI * 1.9 - Math.PI / 2;
    g.save(); g.translate(cx + r * 0.84 * Math.cos(a), cy + r * 0.84 * Math.sin(a)); g.rotate(a + Math.PI / 2); g.fillText(txt[i], 0, 0); g.restore(); }
  g.fillStyle = "#8a5a2a"; g.beginPath(); g.moveTo(cx, cy - r * 0.15); for (const s of [-1, 1]) { g.lineTo(cx + s * r * 0.55, cy - r * 0.35); g.lineTo(cx + s * r * 0.45, cy + r * 0.05); g.lineTo(cx + s * r * 0.15, cy + r * 0.1); g.lineTo(cx, cy - r * 0.15); } g.fill();   // the eagle's wings
  g.fillStyle = "#f2f2f2"; g.beginPath(); g.arc(cx, cy - r * 0.3, r * 0.08, 0, 6.283); g.fill();
  g.fillStyle = "#b22234"; g.beginPath(); g.moveTo(cx - r * 0.16, cy - r * 0.12); g.lineTo(cx + r * 0.16, cy - r * 0.12); g.lineTo(cx + r * 0.16, cy + r * 0.12); g.quadraticCurveTo(cx, cy + r * 0.32, cx - r * 0.16, cy + r * 0.12); g.closePath(); g.fill();
  g.fillStyle = "#fff"; for (let k = 0; k < 13; k++) { const a = -Math.PI / 2 + (k - 6) * 0.2; g.beginPath(); g.arc(cx + r * 0.6 * Math.cos(a), cy + r * 0.62 * Math.sin(a) + r * 0.05, r * 0.025, 0, 6.283); g.fill(); } }
const SEAL = tex(512, 512, (g, w) => { g.clearRect(0, 0, w, w); drawSeal(g, w / 2, w / 2, w * 0.48); });
const USFLAG = tex(380, 200, (g, w, h) => { for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? "#ffffff" : "#b22234"; g.fillRect(0, k * h / 13, w, h / 13 + 1); }
  g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, w * 0.4, h * 7 / 13); g.fillStyle = "#fff"; for (let r = 0; r < 9; r++) for (let c = 0; c < (r % 2 ? 5 : 6); c++) { g.beginPath(); g.arc(12 + c * 25 + (r % 2 ? 12 : 0), 9 + r * 10.5, 3, 0, 6.283); g.fill(); } });
const PRESFLAG = tex(380, 200, (g, w, h) => { g.fillStyle = "#1c2f6b"; g.fillRect(0, 0, w, h); drawSeal(g, w / 2, h / 2, h * 0.4); });
const GRASS = tex(256, 256, (g, w) => { g.fillStyle = "#4f7a35"; g.fillRect(0, 0, w, w); for (let k = 0; k < 6000; k++) { g.fillStyle = Math.random() < 0.5 ? "#5e8a40" : "#3f6a2a"; g.fillRect(Math.random() * w, Math.random() * w, 2, 3); } }, [600, 600]);
const CARPET = tex(256, 256, (g, w) => { g.fillStyle = "#b8a888"; g.fillRect(0, 0, w, w); for (let k = 0; k < 3000; k++) { g.fillStyle = Math.random() < 0.5 ? "#c4b494" : "#a89878"; g.fillRect(Math.random() * w, Math.random() * w, 2, 2); } }, [20, 14]);
const WINDOWS = tex(512, 256, (g, w, h) => { g.fillStyle = "#f4f2ec"; g.fillRect(0, 0, w, h); for (let r = 0; r < 2; r++) for (let c = 0; c < 8; c++) { const x = 18 + c * 62, y = 30 + r * 120;
  g.fillStyle = "#3a4656"; g.fillRect(x, y, 28, 70); g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.strokeRect(x, y, 28, 70); g.beginPath(); g.moveTo(x + 14, y); g.lineTo(x + 14, y + 70); g.moveTo(x, y + 35); g.lineTo(x + 28, y + 35); g.stroke();
  g.fillStyle = "#e8e4da"; g.fillRect(x - 4, y - 10, 36, 6); } });
function boardMesh(lines, width, bg = "#1c2f6b", fg = "#ffffff") { const c = document.createElement("canvas"), g = c.getContext("2d"), px = 48;
  const w = Math.max(...lines.map((l, i) => { g.font = `${i ? 400 : 700} ${i ? px * 0.7 : px}px Georgia, serif`; return g.measureText(l).width; })) + 40;
  c.width = w; c.height = px * 1.35 + (lines.length - 1) * px * 0.85 + 20; g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); g.strokeStyle = "#d4af37"; g.lineWidth = 5; g.strokeRect(3, 3, c.width - 6, c.height - 6);
  lines.forEach((l, i) => { g.font = `${i ? 400 : 700} ${i ? px * 0.7 : px}px Georgia, serif`; g.fillStyle = fg; g.fillText(l, 20, px * 1.1 + i * px * 0.85); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.Mesh(new THREE.PlaneGeometry(width, width * c.height / c.width), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); }

// ---------- scene building ----------
let W = new THREE.Group(); scene.add(W);
const B = (w, h, d, x, y, z, mat, parent = W, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };
const SKIN = [0x8d5a3b, 0xc69072, 0x5a3a28, 0xe0b090, 0xa06c4a, 0xd8a888], SUITS = [0x1a1e28, 0x2a2f3a, 0x3a3f4a, 0x1e2a44, 0x4a3a30, 0x5a5f6a];
function person(x, z, ry, o = {}) {   // a standing or seated figure in business clothes
  const g = new THREE.Group(), suit = M(o.suit ?? SUITS[(srnd() * SUITS.length) | 0]), skin = M(o.skin ?? SKIN[(srnd() * SKIN.length) | 0]), sit = o.sit;
  g.position.set(x, o.y || 0, z); g.rotation.y = ry; W.add(g);
  const hipY = sit ? 0.48 : 0.92;
  for (const sd of [-1, 1]) { const leg = new THREE.Group(); leg.position.set(sd * 0.1, hipY, 0); g.add(leg); leg.add(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.9, 0.16).translate(0, -0.45, 0), o.legs ? M(o.legs) : suit)); if (sit) leg.rotation.x = -1.45; }
  B(0.42, 0.62, 0.24, 0, hipY + 0.31, 0, suit, g); if (!o.noTie) B(0.06, 0.4, 0.02, 0, hipY + 0.38, 0.125, M(o.tie ?? 0x8a1a1a), g);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), skin); head.position.y = hipY + 0.76; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, 6.283, 0, Math.PI * 0.5), M(o.hair ?? [0x1a120c, 0x3a2a1a, 0x6a6a6a, 0xb8a070][(srnd() * 4) | 0])); hair.position.y = hipY + 0.78; hair.rotation.x = -0.25; g.add(hair);
  for (const sd of [-1, 1]) { const arm = new THREE.Group(); arm.position.set(sd * 0.26, hipY + 0.56, 0); g.add(arm); arm.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1).translate(0, -0.3, 0), suit)); if (sit) arm.rotation.x = -0.9; }
  return g; }
const figGeo = (() => { const parts = [new THREE.BoxGeometry(0.42, 0.62, 0.26).translate(0, 0.31, 0), new THREE.SphereGeometry(0.12, 8, 6).translate(0, 0.76, 0)].map(q => q.toNonIndexed());
  let n = 0; parts.forEach(q => n += q.attributes.position.count); const p = new Float32Array(n * 3), nn = new Float32Array(n * 3); let o = 0;
  for (const q of parts) { p.set(q.attributes.position.array, o * 3); nn.set(q.attributes.normal.array, o * 3); o += q.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nn, 3)); return g; })();
function crowd(list, cols) {   // list of [x, y, z, ry]: seated torsos (cheap, instanced)
  const im = new THREE.InstancedMesh(figGeo, M(0xffffff), list.length), c = new THREE.Color();
  list.forEach(([x, y, z, ry], i) => { O3.position.set(x, y, z); O3.rotation.set(0, ry, 0); O3.scale.setScalar(1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); c.set(cols[(srnd() * cols.length) | 0]).offsetHSL(0, 0, (srnd() - 0.5) * 0.1); im.setColorAt(i, c); });
  W.add(im); return im; }
function flag(x, z, t, ry = 0, h = 2.4) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; W.add(g);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, h, 8).translate(0, h / 2, 0), M(0xd4af37, { metalness: 0.7 })));
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.6, 8, 1), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide })); const p = f.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.06 * Math.sin(p.getX(i) * 5)); f.position.set(0.5, h - 0.45, 0); g.add(f); return g; }
function wall(x0, z0, x1, z1, h, mat, y0 = 0) { const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.01) return; const m = B(L, h, 0.2, (x0 + x1) / 2, y0 + h / 2, (z0 + z1) / 2, mat); m.rotation.y = -Math.atan2(z1 - z0, x1 - x0); return m; }
function room(g0, x0, z0, x1, z1, doors, mat, H = 3.8) {   // four walls with door gaps (and lintels), in the coordinates of group g0
  const prev = W; W = g0;
  const edges = { n: [x0, z0, x1, z0], s: [x0, z1, x1, z1], w: [x0, z0, x0, z1], e: [x1, z0, x1, z1] };
  for (const [side, [ax, az, bx, bz]] of Object.entries(edges)) { const horiz = side === "n" || side === "s", a = horiz ? ax : az, b = horiz ? bx : bz;
    const gaps = doors.filter(d => d.side === side).map(d => [d.c - (d.w || 1.2) / 2, d.c + (d.w || 1.2) / 2]).sort((p, q) => p[0] - q[0]); let cur = a;
    for (const [g1, g2] of gaps) { if (horiz) wall(cur, az, g1, az, H, mat); else wall(ax, cur, ax, g1, H, mat);
      if (horiz) wall(g1, az, g2, az, H - 2.3, mat, 2.3); else wall(ax, g1, ax, g2, H - 2.3, mat, 2.3); cur = g2; }
    if (horiz) wall(cur, az, b, az, H, mat); else wall(ax, cur, ax, b, H, mat); }
  W = prev; }
const inRect = (x, z, r) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
function clearScene() { scene.remove(W); W.traverse(o => { o.geometry?.dispose(); }); W = new THREE.Group(); scene.add(W); }
let SC = null;                                             // the current scene: { name, canStand, groundH, spots, outdoor }
const hemi = new THREE.HemisphereLight(0xdfe8f4, 0x6a6050, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e0, 2.0); sun.position.set(-200, 400, 300); scene.add(sun);

// ---------- the White House ----------
const WWX = -62, WWZ = -34;                                // the West Wing's centre; its rooms in local coordinates (+x east, +z south)
const OV = { cx: 11, cz: 8.5, rx: 5.45, rz: 4.4 };          // the Oval Office: 35 ft 10 in × 29 ft
function buildWH() {
  scene.background = new THREE.Color(0x9ec4e8); scene.fog = new THREE.Fog(0xb8d0e6, 400, 3000); hemi.intensity = 1.2; sun.intensity = 2.0;
  const g = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000, 150, 150).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: GRASS, roughness: 1 })); g.position.y = -0.04; W.add(g);   // a grid, not two huge triangles: their depth is too coarse to sit under floors
  const white = M(0xf4f2ec, { roughness: 0.6 }), stone = M(0xd8d4ca);
  // the Residence: 51 × 26 m, with the South Portico's curve of columns and the Truman Balcony
  B(51, 18, 26, 0, 9, -37, white);
  for (const z of [-23.95, -50.05]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(51, 18), new THREE.MeshStandardMaterial({ map: WINDOWS, roughness: 0.6 })); f.position.set(0, 9, z); if (z < -40) f.rotation.y = Math.PI; W.add(f); }
  B(52, 1.2, 27, 0, 18.6, -37, white);
  for (let k = 0; k <= 5; k++) { const a = k / 5 * Math.PI, c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 14, 16), white); c.position.set(8 * Math.cos(a), 7, -24 + 8 * Math.sin(a)); W.add(c); }
  for (const [y, t] of [[6.6, 0.35], [14.4, 1.0], [0.08, 0.16]]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 8.8, t, 32, 1, false, 0, Math.PI), white); d.position.set(0, y, -24); d.rotation.y = -Math.PI / 2; W.add(d); }
  const door = B(2.4, 3.4, 0.1, 0, 1.7, -23.9, M(0x5a3a22));
  flag(0, -37, USFLAG, 0, 8).position.y = 19.2;
  // the West Wing: rooms laid out around a corridor, like the real plan (simplified, one floor)
  const ww = new THREE.Group(); ww.position.set(WWX, 0, WWZ); W.add(ww);
  const cream = M(0xf2ede0, { roughness: 0.85 }), dark = M(0x4a3a2c, { roughness: 0.7 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 28).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: CARPET, roughness: 0.95 })); floor.position.y = 0.02; ww.add(floor);
  B(40.6, 0.4, 28.6, 0, 4.0, 0, white, ww); const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 28).rotateX(Math.PI / 2), M(0xf2eee4, { emissive: 0x6a6860 })); ceil.position.y = 3.78; ww.add(ceil);
  const ROOMS = [["sit", -20, -14, -10, -2, [{ side: "s", c: -15 }], dark], ["roosevelt", -10, -14, 0, -2, [{ side: "s", c: -5 }], cream], ["press", 0, -14, 20, -2, [{ side: "s", c: 10 }], cream],
    ["cos", -20, 2, -10, 14, [{ side: "n", c: -15 }], cream], ["cabinet", -10, 2, 2, 14, [{ side: "n", c: -4 }], cream], ["ovalsuite", 2, 2, 20, 14, [{ side: "n", c: 7.2 }, { side: "e", c: 8.5 }], white]];
  for (const [, x0, z0, x1, z1, d, mat] of ROOMS) room(ww, x0, z0, x1, z1, d, mat);
  { const prev = W; W = ww; wall(-20, -2, -20, 2, 3.8, cream); wall(20, -2, 20, -0.6, 3.8, white); wall(20, 0.6, 20, 2, 3.8, white); wall(20, -0.6, 20, 0.6, 1.5, white, 2.3); W = prev; }
  // the Oval Office
  { const N = 64, skip = t => { const d = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); return d(t, -2.36) < 0.13 || d(t, 0) < 0.14; }, prev = W; W = ww;
    for (let i = 0; i < N; i++) { const t0 = i / N * 6.283 - Math.PI, t1 = (i + 1) / N * 6.283 - Math.PI; if (skip((t0 + t1) / 2)) continue;
      wall(OV.cx + OV.rx * Math.cos(t0), OV.cz + OV.rz * Math.sin(t0), OV.cx + OV.rx * Math.cos(t1), OV.cz + OV.rz * Math.sin(t1), 3.8, M(0xf6f0dc, { roughness: 0.8 })); }
    const rugT = tex(1024, 820, (q, w, h) => { q.fillStyle = "#e6dcb8"; q.beginPath(); q.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, 6.283); q.fill(); q.strokeStyle = "#1c2f6b"; q.lineWidth = 26; q.beginPath(); q.ellipse(w / 2, h / 2, w / 2 - 30, h / 2 - 30, 0, 0, 6.283); q.stroke(); drawSeal(q, w / 2, h / 2, h * 0.24); });
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: rugT, transparent: true, roughness: 0.95 })); rug.scale.set(OV.rx - 0.4, 1, OV.rz - 0.4); rug.position.set(OV.cx, 0.04, OV.cz); ww.add(rug);
    B(2.0, 0.78, 1.05, OV.cx, 0.39, OV.cz + 2.75, M(0x4a2a16, { roughness: 0.4 }));             // the Resolute desk, made from the timbers of HMS Resolute
    B(0.6, 1.2, 0.6, OV.cx, 0.6, OV.cz + 3.55, M(0x2a1a12));
    W = prev; const f1 = flag(OV.cx - 1.4, OV.cz + 3.75, USFLAG, 0); ww.add(f1); const f2 = flag(OV.cx + 1.4, OV.cz + 3.75, PRESFLAG, 0); ww.add(f2); W = ww;
    for (const a of [1.2, 1.57, 1.94]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), new THREE.MeshBasicMaterial({ color: 0xdfeefc })); wn.position.set(OV.cx + (OV.rx - 0.12) * Math.cos(a), 1.7, OV.cz + (OV.rz - 0.12) * Math.sin(a)); wn.lookAt(OV.cx, 1.7, OV.cz); ww.add(wn); }
    for (const sx of [-1.25, 1.25]) B(0.85, 0.8, 2.3, OV.cx + sx, 0.4, OV.cz - 0.2, M(0xe8dcc0));
    B(0.8, 0.42, 1.3, OV.cx, 0.21, OV.cz - 0.2, M(0x4a2a16, { roughness: 0.4 }));
    B(1.8, 1.3, 0.4, OV.cx, 0.65, OV.cz - OV.rz + 0.25, M(0xe8e4d8)); B(1.0, 0.7, 0.1, OV.cx, 0.45, OV.cz - OV.rz + 0.44, M(0x1a1410));   // fireplace
    const por = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), M(0x6a5a3a)); por.position.set(OV.cx, 2.4, OV.cz - OV.rz + 0.35); ww.add(por);
    const seal = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ map: SEAL, transparent: true })); seal.rotation.x = Math.PI / 2; seal.position.set(OV.cx, 3.78, OV.cz); ww.add(seal);
    W = prev; }
  // the Cabinet Room: a long table, a chair for each department head
  { const prev = W; W = ww; const t = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.08, 40), M(0x4a2a16, { roughness: 0.35 })); t.scale.set(4, 1, 1.2); t.position.set(-4, 0.76, 8); ww.add(t);
    const seats = []; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283, x = -4 + 4.5 * Math.cos(a), z = 8 + 1.8 * Math.sin(a); if (Math.abs(a - Math.PI / 2) < 0.2) continue; seats.push([x, 0.48, z, Math.atan2(-4 - x, 8 - z)]); }
    crowd(seats, SUITS); W = prev; }
  // the Situation Room: dark wood, screens
  { const prev = W; W = ww; B(7, 0.08, 1.8, -15, 0.76, -8, M(0x2a1a12, { roughness: 0.3 }));
    for (let k = 0; k < 3; k++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshBasicMaterial({ color: [0x1a3a6a, 0x2a5a3a, 0x3a2a5a][k] })); s.position.set(-18 + k * 3, 2.2, -13.85); ww.add(s); }
    const seats = []; for (let k = 0; k < 5; k++) for (const sd of [-1, 1]) seats.push([-17.5 + k * 1.3, 0.48, -8 + sd * 1.3, sd > 0 ? Math.PI : 0]); crowd(seats, [0x1a1e28, 0x2a3a2a, 0x2a2f3a]);
    W = prev; }
  // the Press Briefing Room: the podium, the blue backdrop with the White House oval, 49 seats
  { const prev = W; W = ww; B(0.12, 3.2, 6, 0.15, 1.6, -8, M(0x1c3a7a)); const plaque = boardMesh(["THE WHITE HOUSE", "WASHINGTON"], 2.2); plaque.position.set(0.25, 2.6, -8); plaque.rotation.y = Math.PI / 2; ww.add(plaque);
    B(2.2, 0.3, 4, 1.6, 0.15, -8, M(0x3a3a44)); B(0.5, 1.15, 0.7, 3.0, 0.88, -8, M(0x5a3a22)); const sm = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), new THREE.MeshBasicMaterial({ map: SEAL, transparent: true })); sm.position.set(3.26, 1.0, -8); sm.rotation.y = Math.PI / 2; ww.add(sm);
    const seats = []; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (c !== 3) seats.push([6 + r * 1.5, 0.48, -11.2 + c * 1.05, -Math.PI / 2]); crowd(seats, [0x2a2f3a, 0x5a3a30, 0x6a6a7a, 0x8a2a2a, 0x2a4a6a, 0xd8d0c0]);
    for (let k = 0; k < 4; k++) B(0.3, 1.6, 0.3, 18.5, 0.8, -12 + k * 2.6, M(0x1a1a1a));
    W = prev; }
  { const prev = W; W = ww; B(1.8, 0.76, 0.9, -15, 0.38, 12, M(0x4a2a16)); B(4, 0.08, 1.6, -5, 0.76, -8, M(0x4a2a16)); W = prev; }
  // signs over the doors, facing the corridor
  for (const [txt, x, z, ry] of [["Situation Room", -15, -1.9, 0], ["Roosevelt Room", -5, -1.9, 0], ["Press Briefing Room", 10, -1.9, 0], ["Chief of Staff", -15, 1.9, Math.PI], ["Cabinet Room", -4, 1.9, Math.PI], ["Oval Office", 7.2, 1.9, Math.PI]]) {
    const s = boardMesh([txt], 1.6); s.position.set(x, 2.75, z); s.rotation.y = ry; ww.add(s); }
  // people in the West Wing
  { const prev = W; W = ww; person(19.2, -1.2, -Math.PI / 2, { tie: 0x1a1a1a, suit: 0x111111 }); person(0, 1.0, Math.PI / 2, { female: 1 }); person(-14, -1, Math.PI / 2); person(-15, 11.2, Math.PI);
    person(-17, -10.5, 0); W = prev; }
  // the colonnade and the Rose Garden
  for (let x = -41; x <= -27; x += 2) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.6, 12), white); c.position.set(x, 1.8, -44); W.add(c); }
  B(16, 0.4, 3, -34, 3.8, -45, white);
  const rose = new THREE.Mesh(new THREE.PlaneGeometry(16, 19).rotateX(-Math.PI / 2), M(0x5a8a3a, { roughness: 1 })); rose.position.set(-34, 0.03, -33); W.add(rose);
  for (const [w, d, x, z] of [[16, 0.6, -34, -23.6], [0.6, 6, -26.3, -27], [0.6, 6, -26.3, -39]]) B(w, 0.7, d, x, 0.35, z, M(0x2f5a24));
  { const pts = []; for (let k = 0; k < 160; k++) pts.push([-41 + srnd() * 14, -42 + srnd() * 2.2 * (k % 2) + (k % 2 ? 0 : 16 + srnd() * 2)]);
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 5), M(0xffffff), pts.length), c = new THREE.Color();
    pts.forEach(([x, z], i) => { O3.position.set(x, 0.3, z); O3.scale.setScalar(1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); c.set([0xd8243a, 0xffffff, 0xf08aa8, 0xf4d040][i % 4]); im.setColorAt(i, c); }); W.add(im); }
  B(0.7, 1.15, 0.6, -34, 0.58, -40.4, M(0x5a3a22)); flag(-35.6, -41.6, USFLAG); flag(-32.4, -41.6, PRESFLAG);
  { const seats = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 10; c++) if (c !== 4 && c !== 5) seats.push([-39.5 + c * 1.1, 0.48, -36 + r * 1.4, Math.PI]); crowd(seats, SUITS.concat([0x8a2a2a, 0xd8d0c0])); }
  // the South Lawn, the fountain, Marine One, the fence, the Washington Monument
  const drive = new THREE.Mesh(new THREE.RingGeometry(26, 30, 64).rotateX(-Math.PI / 2), M(0xc8c0b0)); drive.scale.set(1.4, 1, 1); drive.position.set(0, 0.03, 18); W.add(drive);
  { const b = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.2, 0.6, 32), stone); b.position.set(0, 0.3, 20); W.add(b); const wv = new THREE.Mesh(new THREE.CircleGeometry(4.7, 32).rotateX(-Math.PI / 2), M(0x6a9ab8, { roughness: 0.1 })); wv.position.set(0, 0.62, 20); W.add(wv);
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.25, 6, 8), new THREE.MeshStandardMaterial({ color: 0xf0f8ff, transparent: true, opacity: 0.7 })); jet.position.set(0, 3.6, 20); W.add(jet); }
  const heli = new THREE.Group(); heli.position.set(0, 0, 46); W.add(heli);
  { const green = M(0x2a4a2a, { roughness: 0.5 }), top = M(0xf2f2f2, { roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.4, 8, 8, 20).rotateZ(Math.PI / 2), green); body.position.set(0, 2.1, 0); heli.add(body);
    B(8.5, 0.7, 2.6, 0, 3.3, 0, top, heli); B(7, 0.6, 0.5, -7.5, 2.8, 0, green, heli); B(0.4, 2.4, 0.2, -11, 3.6, 0, green, heli);
    for (let k = 0; k < 5; k++) B(9, 0.08, 0.4, 0, 4.2, 0, M(0x1a1a1a), heli, k / 5 * Math.PI);
    B(0.9, 1.6, 0.1, 1.5, 1.6, 1.41, M(0x1a1a1a), heli); for (let k = 0; k < 3; k++) B(1.0, 0.12, 0.35, 1.5, 0.15 + k * 0.28, 1.6 + k * 0.3, M(0xf2f2f2), heli);
    const ins = boardMesh(["UNITED STATES OF AMERICA"], 4.5, "#2a4a2a"); ins.position.set(-2.2, 2.5, 1.42); heli.add(ins); }
  person(3.2, 49, Math.PI, { suit: 0x1c1c3a, legs: 0x1c1c3a, tie: 0xf0f0f0 });           // a Marine sentry at the steps
  { const pts = []; for (let k = 0; k < 120; k++) { const a = srnd() * 6.283, r = 55 + srnd() * 45; const x = r * Math.cos(a) * 1.3, z = 10 + r * Math.sin(a) * 0.7; if (z < -20 || (Math.abs(x) < 40 && z < 60)) continue; pts.push([x, z]); }
    for (const sd of [-1, 1]) for (let k = 0; k < 10; k++) pts.push([sd * (60 + srnd() * 30), -60 + k * 12]);
    const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.4, 4, 6).translate(0, 2, 0), M(0x5a3a22), pts.length), cr = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(3.6, 1), M(0x3a6a2a), pts.length);
    pts.forEach(([x, z], i) => { const s = 0.8 + srnd() * 0.6; O3.position.set(x, 0, z); O3.scale.setScalar(s); O3.updateMatrix(); tr.setMatrixAt(i, O3.matrix); O3.position.y = 6 * s; O3.updateMatrix(); cr.setMatrixAt(i, O3.matrix); }); W.add(tr, cr); }
  for (let x = -110; x <= 110; x += 0.8) B(0.04, 2.4, 0.04, x, 1.2, 75, M(0x1a1a1a)); B(220, 0.08, 0.08, 0, 2.3, 75, M(0x1a1a1a));
  { const ob = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 11.9, 152, 4), M(0xe6dcc8)); ob.rotation.y = Math.PI / 4; ob.position.set(0, 76, 1300); W.add(ob);
    const py = new THREE.Mesh(new THREE.ConeGeometry(7.4, 17, 4), M(0xe6dcc8)); py.rotation.y = Math.PI / 4; py.position.set(0, 160.5, 1300); W.add(py); }
  const wwLocal = (x, z) => [x - WWX, z - WWZ];
  const WALK = [[-19.7, -1.7, 19.9, 1.7], [19.0, -0.5, 20.8, 0.5], [-19.7, -13.7, -10.3, -2.3], [-9.7, -13.7, -0.3, -2.3], [0.3, -13.7, 19.7, -2.3], [-19.7, 2.3, -10.3, 13.7], [-9.7, 2.3, 1.7, 13.7],
    [-15.4, -2.8, -14.6, -1.2], [-5.4, -2.8, -4.6, -1.2], [9.6, -2.8, 10.4, -1.2], [-15.4, 1.2, -14.6, 2.8], [-4.4, 1.2, -3.6, 2.8], [6.8, 1.2, 7.6, 5.9], [16.0, 8.1, 20.8, 8.9]];
  SC = { name: "wh", outdoor: true, groundH: () => 0,
    canStand(x, z) { if (Math.abs(x) > 110 || z > 74 || z < -70) return false; if (x > -25.6 && x < 25.6 && z > -50.4 && z < -23.9) return false;
      if (Math.hypot(x, z - 20) < 5.4) return false; if (x > -9.5 && x < 9.5 && Math.abs(z - 46) < 1.6) return false;
      const [lx, lz] = wwLocal(x, z); if (lx > -20.3 && lx < 20.3 && lz > -14.3 && lz < 14.3) { if (((lx - OV.cx) / (OV.rx - 0.35)) ** 2 + ((lz - OV.cz) / (OV.rz - 0.35)) ** 2 < 1) return true; return WALK.some(r => inRect(lx, lz, r)); }
      return true; },
    spots: { oval_desk: [WWX + OV.cx, WWZ + OV.cz + 1.9, "the Resolute desk"], cabinet: [WWX - 4, WWZ + 10.3, "the Cabinet Room table"], cos: [WWX - 15, WWZ + 10.4, "the Chief of Staff's office"],
      sit_room: [WWX - 18.6, WWZ - 8, "the head of the Situation Room table"], roosevelt: [WWX - 5, WWZ - 5.6, "the Roosevelt Room"], press_podium: [WWX + 2.6, WWZ - 8, "the briefing room podium"],
      rose_podium: [-34, -41.1, "the Rose Garden podium"], portico: [0, -22.4, "the Residence (South Portico)"], marine_one: [1.5, 48.6, "Marine One"] },
    spawns: { morning: [-40.5, -29, Math.PI / 2], lawn: [3, 51, 0] } };
}

// ---------- a chamber: the House of Representatives, or the UN General Assembly ----------
function buildChamber(kind) {
  const un = kind === "un", C = V3(0, 0, -14), R0 = 9, ROWS = 11, Rb = R0 + ROWS * 1.6 + 3;
  scene.background = new THREE.Color(0x1a1612); scene.fog = null; hemi.intensity = 1.6; sun.intensity = 0.6;
  const fl = new THREE.Mesh(new THREE.CircleGeometry(Rb + 2, 64).rotateX(-Math.PI / 2), M(un ? 0x2a4a6a : 0x2a3a6a, { roughness: 0.9 })); fl.position.set(C.x, 0, C.z + 4); W.add(fl);
  const wl = new THREE.Mesh(new THREE.CylinderGeometry(Rb, Rb, 16, 64, 1, true), M(un ? 0x5a6a7a : 0x6a5a44, { side: THREE.BackSide })); wl.position.set(C.x, 8, C.z + 4); W.add(wl);
  const ce = new THREE.Mesh(new THREE.CircleGeometry(Rb, 64).rotateX(Math.PI / 2), M(un ? 0x8a9aa8 : 0xd8ccb0)); ce.position.set(C.x, 16, C.z + 4); W.add(ce);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(8, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff8e8 })); sky.position.set(C.x, 15.9, C.z + 4); W.add(sky);
  B(44, 16, 1, 0, 8, C.z - 6, un ? M(0xc8a030, { metalness: 0.5, roughness: 0.4 }) : M(0x8a6a44));
  if (un) { const e = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ map: tex(512, 512, (g, w) => { g.fillStyle = "#e8d080"; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 6.283); g.fill(); g.strokeStyle = "#7a5a10"; g.lineWidth = 8;
      for (let r = 50; r < 250; r += 50) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, 6.283); g.stroke(); } for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; g.beginPath(); g.moveTo(w / 2, w / 2); g.lineTo(w / 2 + 200 * Math.cos(a), w / 2 + 200 * Math.sin(a)); g.stroke(); } }) })); e.position.set(0, 9.5, C.z - 5.45); W.add(e); }
  else { const f = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.7), new THREE.MeshStandardMaterial({ map: USFLAG })); f.position.set(0, 9, C.z - 5.45); W.add(f); }
  B(10, 1.0, 1.6, 0, 0.5, C.z + 1.5, M(un ? 0x2a5a3a : 0x5a3a22)); B(7, 2.4, 1.6, 0, 1.2, C.z - 1.8, M(un ? 0x2a5a3a : 0x5a3a22)); B(8, 0.9, 3.6, 0, 0.45, C.z, M(un ? 0x1e4a2e : 0x4a2e1a));
  B(0.9, 1.3, 0.6, 0, 1.55, C.z + 1.0, M(un ? 0x2a6a42 : 0x6a4428));
  if (!un) { person(-1.2, C.z - 2.2, 0, { sit: 1, y: 2.4 }); person(1.2, C.z - 2.2, 0, { sit: 1, y: 2.4, tie: 0x2a2a6a }); }
  else person(0, C.z - 2.2, 0, { sit: 1, y: 2.4, tie: 0x2a4a8a });
  const seats = [];
  for (let i = 0; i < ROWS; i++) { const r = R0 + i * 1.6, n = Math.floor(r * 2.6); for (let k = 0; k < n; k++) { const a = 0.18 + k / (n - 1) * (Math.PI - 0.36); if (Math.abs(a - Math.PI / 2) < 0.6 / r) continue;
      const x = C.x + r * Math.cos(a), z = C.z + 1 + r * Math.sin(a); seats.push([x, 0.48 + i * 0.28, z, Math.atan2(C.x - x, C.z - z)]); } }
  crowd(seats, un ? [0x1a1e28, 0x2a2f3a, 0xd8d0c0, 0x6a2a2a, 0x2a4a6a, 0xe0b040, 0x3a6a3a] : SUITS.concat([0x8a1a2a, 0x2a3a8a, 0xd8d0c0]));
  const desks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.75, 0.4), M(un ? 0x3a4a3a : 0x4a2e1a), seats.length);
  seats.forEach(([x, y, z, ry], i) => { O3.position.set(x + 0.45 * Math.sin(ry), y - 0.1 + 0.18, z + 0.45 * Math.cos(ry)); O3.rotation.set(0, ry, 0); O3.scale.setScalar(1); O3.updateMatrix(); desks.setMatrixAt(i, O3.matrix); }); W.add(desks);
  const gal = []; for (let k = 0; k < 260; k++) { const a = srnd() * Math.PI * 1.6 - Math.PI * 0.3 + Math.PI * 0.1, r = Rb - 1.5 - srnd() * 1.5; gal.push([C.x + r * Math.cos(a), 6.5 + srnd() * 0.8, C.z + 4 + r * Math.sin(a), a + Math.PI / 2 + Math.PI]); }
  crowd(gal, SUITS.concat([0x8a2a2a, 0xd8d0c0, 0x4a6a8a]));
  const gr = new THREE.Mesh(new THREE.TorusGeometry(Rb - 2, 0.4, 6, 64, Math.PI * 1.7), M(un ? 0x5a6a7a : 0x6a5a44)); gr.rotation.x = Math.PI / 2; gr.rotation.z = Math.PI * 0.15; gr.position.set(C.x, 6.3, C.z + 4); W.add(gr);
  SC = { name: kind, outdoor: false, groundH: (x, z) => { if (Math.abs(x) < 4 && z > C.z - 1 && z < C.z + 1.1) return 0.9; const r = Math.hypot(x - C.x, z - C.z - 1); return r > R0 - 0.8 && z > C.z + 1 ? Math.min(ROWS - 1, Math.max(0, (r - R0 + 0.8) / 1.6)) * 0.28 : 0; },   // the aisle climbs with the tiers
    canStand: (x, z) => Math.hypot(x - C.x, z - C.z - 4) < Rb - 3 && z > C.z - 1,
    spots: un ? { un_podium: [0, C.z + 0.5, "the General Assembly rostrum"], exit: [0, C.z + 4 + Rb - 4, "Air Force One home to Washington"] }
      : { capitol_podium: [0, C.z + 0.5, "the rostrum of the House"], exit: [0, C.z + 4 + Rb - 4, "the motorcade back to the White House"] },
    spawns: { arrive: [0, C.z + 4 + Rb - 4.5, 0] } };
}

// ---------- a town: a hurricane-hit street, a burned one, a factory, or a rally ----------
function buildTown(kind) {
  const burned = kind === "wildfire", storm = kind === "hurricane";
  scene.background = new THREE.Color(burned ? 0xc8986a : storm ? 0x8a98a8 : 0x9ec4e8); scene.fog = new THREE.Fog(scene.background, 60, burned ? 220 : 500); hemi.intensity = 1.1; sun.intensity = burned ? 1.0 : 1.8;
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 60, 60).rotateX(-Math.PI / 2), burned ? M(0x3a3028, { roughness: 1 }) : new THREE.MeshStandardMaterial({ map: GRASS, roughness: 1 })); W.add(gnd);
  B(9, 0.04, 140, 0, 0.02, 0, M(0x3a3c40)); for (const sd of [-1, 1]) B(2, 0.12, 140, sd * 5.6, 0.06, 0, M(0xb8b4aa));
  if (kind === "factory") { B(60, 12, 30, 0, 6, -40, M(0xd8dce0)); const s = boardMesh(["MIDWEST BATTERY WORKS"], 18, "#1a5a8a"); s.position.set(0, 9, -24.9); W.add(s); for (let k = 0; k < 3; k++) B(1.2, 18, 1.2, -20 + k * 20, 9, -52, M(0xa8a8a8)); }
  else for (const sd of [-1, 1]) for (let z = -60; z <= 60; z += 13) { if (Math.abs(z) < 10 && kind === "rally") continue;
    const col = burned ? 0x2a2420 : [0xe8dcc8, 0xb8c8d8, 0xd8b898, 0xc8d8b8, 0xf0e8e0][((z + 60) / 13 + (sd > 0 ? 2 : 0)) % 5 | 0], x = sd * 14, h = burned && srnd() < 0.6 ? 1.2 + srnd() * 1.5 : 4.5;
    B(8, h, 9, x, h / 2, z, M(col)); if (burned && h < 3) { B(0.8, 4, 0.8, x - 2, 2, z + 2, M(0x4a4440)); continue; }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 9.4, 3), M(burned ? 0x1a1614 : 0x5a4a44)); roof.rotation.set(Math.PI / 2, 0, Math.PI / 2); roof.scale.set(1, 1, 0.45); roof.position.set(x, h + 1.0, z);
    if (storm && srnd() < 0.5) { roof.rotation.y = 0.3; roof.position.y -= 0.6; const tarp = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), M(0x2a6ac8, { side: THREE.DoubleSide })); tarp.rotation.x = -Math.PI / 2 + 0.5; tarp.position.set(x, h + 1.4, z + 1); W.add(tarp); }
    W.add(roof); }
  if (storm) { const d = []; for (let k = 0; k < 140; k++) d.push([(srnd() - 0.5) * 30, (srnd() - 0.5) * 120]); const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.15, 0.3), M(0x8a6a4a), d.length);
    d.forEach(([x, z], i) => { if (Math.abs(x) < 4) x += 6 * Math.sign(x || 1); O3.position.set(x, 0.1, z); O3.rotation.set(0, srnd() * 3, srnd() * 0.3); O3.scale.set(1 + srnd() * 2, 1, 1); O3.updateMatrix(); im.setMatrixAt(i, O3.matrix); }); W.add(im);
    for (let k = 0; k < 3; k++) B(6, 2.6, 2.4, 22, 1.3, -30 + k * 9, M(0xf0f0f0)); }
  if (burned) for (let k = 0; k < 40; k++) B(0.3, 5 + srnd() * 4, 0.3, (srnd() < 0.5 ? -1 : 1) * (22 + srnd() * 40), 3, (srnd() - 0.5) * 150, M(0x1a1410));
  // the podium, flags, officials, and the crowd behind a rope line
  B(1.0, 1.15, 0.6, 0, 0.58, -6, M(0x5a3a22)); flag(-1.8, -7, USFLAG); flag(1.8, -7, PRESFLAG);
  if (kind === "rally") { B(24, 9, 0.4, 0, 4.5, -9, new THREE.MeshStandardMaterial({ map: USFLAG })); B(16, 0.8, 7, 0, 0.4, -7, M(0x3a3a4a)); }
  for (let k = 0; k < 4; k++) person(-4 + k * 2.6 + (k > 1 ? 1.4 : 0), -7.5, 0, { suit: kind === "factory" ? 0xe8c020 : undefined, noTie: kind !== "rally" });
  const ppl = [], N = kind === "rally" ? 700 : 240; for (let k = 0; k < N; k++) { const x = (srnd() - 0.5) * (kind === "rally" ? 40 : 16), z = 4 + srnd() * (kind === "rally" ? 40 : 16); ppl.push([x, 0, z, Math.atan2(-x, -6 - z)]); }
  crowd(ppl, kind === "factory" ? [0xe8c020, 0x2a4a8a, 0xd8d8d8] : kind === "rally" ? [0xb22234, 0xffffff, 0x3c3b6e, 0x2a2f3a] : [0x4a5a6a, 0x8a6a4a, 0x6a2a2a, 0x2a4a6a, 0xd8d0c0, 0x3a6a3a]);
  for (let x = -9; x <= 9; x += 1.5) B(0.06, 1, 0.06, x, 0.5, 2.6, M(0xd4af37)); B(18, 0.04, 0.04, 0, 0.95, 2.6, M(0xb22234));
  SC = { name: "town", outdoor: true, groundH: () => 0, canStand: (x, z) => Math.abs(x) < 10 && z > -6.6 && z < 2.4 || (Math.abs(x) < 4.4 && Math.abs(z) < 60),
    spots: { town_podium: [0, -6.7, "the podium"], exit: [0, 40, "Air Force One home to Washington"] }, spawns: { arrive: [0, 30, Math.PI] } };
}

// ---------- Camp David ----------
function buildCamp() {
  scene.background = new THREE.Color(0xa8c8e0); scene.fog = new THREE.Fog(0xb8d0e0, 50, 260); hemi.intensity = 1.2; sun.intensity = 1.8;
  W.add(new THREE.Mesh(new THREE.PlaneGeometry(600, 600, 60, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: GRASS, roughness: 1 })));
  const log = M(0x7a5a3a); B(16, 4.5, 9, 0, 2.25, -16, log); const roof = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 17, 3), M(0x4a3a30)); roof.rotation.set(Math.PI / 2, 0, Math.PI / 2); roof.scale.set(1, 1, 0.5); roof.position.set(0, 5.8, -16); W.add(roof);
  B(8, 0.2, 6, 0, 0.1, -7, M(0xa89878)); const t = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.08, 32), M(0x5a3a22)); t.position.set(0, 0.76, -6.5); W.add(t);
  person(-1.1, -7.2, 0.7, { sit: 1, tie: 0x2a6a3a }); person(1.1, -7.2, -0.7, { sit: 1, tie: 0x6a2a6a }); person(-3, -9, 0.4); person(3, -9, -0.4); person(5, -3, -1.2, { suit: 0x111111 });
  const pts = []; for (let k = 0; k < 260; k++) { const a = srnd() * 6.283, r = 18 + srnd() * 80; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
  const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.45, 9, 6).translate(0, 4.5, 0), M(0x5a3a22), pts.length), cr = new THREE.InstancedMesh(new THREE.ConeGeometry(3, 9, 8), M(0x2f5a2a), pts.length);
  pts.forEach(([x, z], i) => { const s = 0.8 + srnd() * 0.7; O3.position.set(x, 0, z); O3.scale.setScalar(s); O3.updateMatrix(); tr.setMatrixAt(i, O3.matrix); O3.position.y = 9 * s; O3.updateMatrix(); cr.setMatrixAt(i, O3.matrix); }); W.add(tr, cr);
  const sign = boardMesh(["ASPEN LODGE", "the presidential cabin, Camp David"], 4); sign.position.set(0, 3.2, -11.4); W.add(sign);
  SC = { name: "camp", outdoor: true, groundH: () => 0, canStand: (x, z) => Math.hypot(x, z) < 16 && z > -11.2, spots: { cd_table: [0, -5.1, "the table on the terrace"], exit: [8, 6, "Marine One back to the White House"] }, spawns: { arrive: [8, 8, -0.8] } };
}

// ---------- Air Force One ----------
function buildAF1() {
  scene.background = new THREE.Color(0x101418); scene.fog = null; hemi.intensity = 1.6; sun.intensity = 0.4;
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 50, 32, 1, true).rotateX(Math.PI / 2), M(0xe8e4dc, { side: THREE.BackSide })); hull.position.y = 1.4; W.add(hull);
  B(4.6, 0.1, 50, 0, 0, 0, M(0x2a3a5a, { roughness: 0.95 }));
  for (const z of [-25, 25]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(2.9, 32), M(0xd8ccb0, { side: THREE.DoubleSide })); cap.position.set(0, 1.4, z); W.add(cap); }
  for (const sd of [-1, 1]) for (let z = -22; z <= 22; z += 1.4) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshBasicMaterial({ color: 0xbfe0ff })); w.position.set(sd * 2.55, 1.6, z); w.rotation.y = -sd * Math.PI / 2; W.add(w); }
  B(4.6, 2.4, 0.1, 0, 1.2, -16, M(0xd8ccb0)); B(1.0, 2.1, 0.12, 0, 1.05, -16, M(0x1a1410));
  B(1.6, 0.76, 0.8, 0, 0.38, -20, M(0x4a2a16, { roughness: 0.4 })); const seal = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), new THREE.MeshBasicMaterial({ map: SEAL, transparent: true })); seal.position.set(0, 1.9, -24.5); W.add(seal);
  B(2.2, 0.08, 1.2, 0, 0.76, -8, M(0x4a2a16)); const st = []; for (let z = 0; z < 20; z += 1.2) for (const x of [-1.6, -1.0, 1.0, 1.6]) st.push([x, 0.48, z, Math.PI]); crowd(st, SUITS.concat([0xd8d0c0, 0x8a2a2a]));
  const sign = boardMesh(["AIR FORCE ONE", "office · conference room · staff · press at the back"], 2.2); sign.position.set(0, 2.0, -15.9); sign.rotation.y = Math.PI; W.add(sign);
  person(-1.2, -9, Math.PI / 2, { sit: 1 }); person(1.2, -9, -Math.PI / 2, { sit: 1 }); person(1.5, -19, -0.4, { suit: 0x1c2a4a, legs: 0x1c2a4a, noTie: 1 });
  SC = { name: "af1", outdoor: false, groundH: () => 0, canStand: (x, z) => Math.abs(x) < 1.9 && z > -23.5 && z < 23.5 && !(Math.abs(z + 16) < 0.2 && Math.abs(x) > 0.5),
    spots: { af1_desk: [0, -19.2, "the President's office on Air Force One"], af1_door: [0, 22.5, "the door: you have landed"] }, spawns: { arrive: [0, 21.5, Math.PI] } };
}

// ---------- the job: events ----------
// fx keys: a approval, c Congress, e economy, w world standing, s security. Options may succeed with probability p.
const EV = {
  letter: { place: "oval_desk", title: "Inauguration Day: the letter", who: "In the top drawer of the Resolute Desk",
    text: "Sworn in at noon on the Capitol's West Front, you have walked into the Oval Office for the first time as President. In the desk drawer is an envelope addressed to you, from your predecessor.",
    opts: [["Read it, and write a thank-you note", { a: 1 }, "The letter wishes you luck, warns of the loneliness of the job, and reminds you that the office is borrowed. You keep it."]],
    fact: "Since 1989 each outgoing president has left a private letter for the next in the Resolute Desk, which was made from the timbers of the British ship HMS Resolute." },
  firstCabinet: { place: "cabinet", title: "Your first Cabinet meeting", who: "Fifteen department heads, the Vice President and Cabinet-level officials",
    text: "Most of your Cabinet still awaits Senate confirmation; acting secretaries fill several chairs. What do you ask of them first?",
    opts: [["Cut red tape: report rules that can go", { e: 2 }, "Agencies start reviews; business groups applaud."], ["Make disaster readiness the priority", { s: 3 }, "FEMA and Homeland Security start new drills."], ["Tell them to work with Congress, not around it", { c: 4 }, "Committee chairs notice the courtesy calls."]],
    fact: "The Cabinet has 15 executive departments plus several Cabinet-level posts. Every secretary must be confirmed by the Senate; most real work happens in smaller meetings, not the full Cabinet." },
  sotu: { place: "capitol_podium", title: "The State of the Union", who: "A joint session of Congress, the Supreme Court, the Joint Chiefs, and 40 million watching",
    text: "The Sergeant at Arms announces you; the chamber rises. What is the theme of your address?",
    opts: [["The economy and jobs", { e: 1, a: 2 }, "Seventy-two standing ovations, mostly from one side; polls show a modest bounce."], ["Unity: a bipartisan agenda", { c: 4, a: 1 }, "Both sides rise for your call to fix roads and lower drug prices."], ["A bold new agenda", { a: 3, c: -3 }, "Your base is fired up; the other party is not."]],
    fact: "The Constitution says the president shall 'from time to time give to the Congress Information of the State of the Union'. Wilson revived the speech in person in 1913; one Cabinet member always stays away as the 'designated survivor'." },
  unga: { place: "un_podium", title: "The UN General Assembly", who: "Leaders of 193 member states, New York",
    text: "You step to the green marble rostrum. What is your message to the world?",
    opts: [["Rally the world on health and climate", { w: 4 }, "Allies welcome the tone; a new joint initiative gains 40 sponsors."], ["Warn adversaries in firm terms", { s: 2, w: 1, a: 1 }, "The headline writers call it your toughest speech yet."], ["Announce a global food-security fund", { w: 5, e: -1 }, "Aid agencies cheer; critics at home ask about the cost."]],
    fact: "Every September world leaders gather in New York for the General Debate. By tradition Brazil speaks first and the host country, the United States, second." },
  turkey: { place: "rose_podium", title: "Pardoning the Thanksgiving turkey", who: "The National Turkey Federation, the press, and a 40-pound bird named Liberty",
    text: "The press pool waits for a joke. Liberty gobbles at the microphone.", opts: [["Grant a full and unconditional pardon", { a: 1 }, "Liberty retires to a university farm. The pun count is high."]],
    fact: "Presidents had received turkeys for decades, but the formal 'pardon' became an annual Rose Garden tradition in 1989." },
  midterms: { place: "oval_desk", title: "Midterm election night", who: "Your political director, with the returns", text: "", opts: [["Call the winners, of both parties", { c: 1 }, ""]],
    fact: "The president's party has lost House seats in all but a few midterm elections since the Civil War." },
  election: { place: "oval_desk", title: "Election night", who: "Your campaign manager", text: "The polls have closed. The networks are calling states.", opts: [["Wait for the results", {}, ""]],
    fact: "Presidents are chosen by the Electoral College: 538 electors, 270 to win, nearly all assigned winner-take-all by state." },
  rally: { place: "town_podium", town: "rally", title: "A campaign rally", who: "Ten thousand supporters in Pennsylvania", text: "Your re-election campaign's closing week. What do you talk about?",
    opts: [["Your record", { a: 2 }, "The crowd chants the numbers back at you."], ["What you'll do in a second term", { a: 2, c: -1 }, "You make three new promises; reporters count the cost."]],
    fact: "Incumbent presidents campaign while still doing the job: Air Force One carries both the government and, billed separately, the campaign." },
  pandemic: { place: "sit_room", title: "The virus has arrived", who: "Health officials and the National Security Council",
    text: "The respiratory virus flagged months ago is now spreading in three U.S. cities. Hospitals are filling.",
    opts: [["Mobilize: testing, supplies, clear daily briefings", { s: 4, e: -4, a: 2 }, "It is costly, but the curve bends within weeks."], ["Keep things open; urge caution", { e: 1, s: -6, a: -4 }, "Cases surge; the economy stalls anyway."]],
    fact: "The White House keeps pandemic preparedness staff on the National Security Council; early warning and fast testing matter more than anything else." },
  hurricaneVisit: { place: "town_podium", town: "hurricane", title: "Visiting the storm zone", who: "Survivors, first responders, the governor and the mayor",
    text: "Blue tarps cover half the roofs. People without power for a week line the rope.", opts: [["Promise federal help; stay and listen", { a: 4 }, "You spend two hours on the rope line. A photo of you hugging a nurse goes everywhere."], ["Brief remarks, then tour by air", { a: 1 }, "Efficient, but local reporters note how short the visit was."]],
    fact: "Presidential visits are planned to avoid pulling police and responders away from the recovery, which is why many come a few days after the disaster." },
  wildfireVisit: { place: "town_podium", town: "wildfire", title: "Visiting the burn zone", who: "Firefighters and families who lost their homes",
    text: "Chimneys stand where houses were. The air still smells of smoke.", opts: [["Pledge to rebuild, and fund firefighting", { a: 3, e: -1 }, "Firefighters thank you for the new money for crews and aircraft."], ["Talk about forest management", { a: 1 }, "A useful point, but it lands awkwardly in front of the ashes."]],
    fact: "Most federal disaster money flows through FEMA after a presidential disaster declaration, under the Stafford Act of 1988." },
  campDavid: { place: "cd_table", title: "Peace talks at Camp David", who: "Two foreign leaders, after two days of talks", text: "A deal is close. Each side wants one more concession.",
    opts: [["Push both, all night", { w: 8, a: 4 }, "At 4 a.m. both leaders shake hands on the terrace. The Camp David Framework is signed the next day.", 0.55, { w: -2, a: -1 }, "The talks collapse at dawn; both leaders fly home blaming the other."], ["Settle for a framework for future talks", { w: 3 }, "Modest, but real: the two sides agree to keep talking."]],
    fact: "Camp David, in Maryland's Catoctin Mountains, hosted the 1978 Camp David Accords between Egypt and Israel, negotiated by Jimmy Carter over 13 days." },
  factory: { place: "town_podium", town: "factory", title: "A factory visit", who: "Workers at a new battery plant in Michigan", text: "The plant employs 2,400 people. Hard hats and hi-vis vests all round.",
    opts: [["Talk about jobs and training", { a: 2, e: 1 }, "The workers like the bit about apprenticeships."], ["Announce a new manufacturing tax credit", { e: 2, c: -1 }, "Investors like it; Congress has to pass it."]],
    fact: "Presidents travel most weeks. Every trip is advanced by staff and the Secret Service days or weeks ahead, down to where the president will stand." },
};
const POOL = {
  pdb: [
    { place: "oval_desk", title: "The President's Daily Brief", who: "Your intelligence briefer", text: "A foreign-backed hacking group has been probing the computer systems of U.S. power utilities.",
      opts: [["Quietly harden defenses with the utilities", { s: 4, e: -1 }, "Engineers patch systems across 40 states."], ["Name the country publicly and impose sanctions", { s: 2, w: -2, a: 2 }, "The country denies everything."], ["Authorize a covert cyber response", { s: 2, w: -3 }, "You will never be able to talk about it."]],
      fact: "The President's Daily Brief is prepared overnight by the intelligence community and delivered most mornings, often in the Oval Office." },
    { place: "oval_desk", title: "The President's Daily Brief", who: "Your intelligence briefer", text: "An adversary tested a new long-range missile overnight.",
      opts: [["Consult allies and call a UN Security Council session", { w: 4 }, "Allies join a joint statement."], ["Move a carrier group to the region", { s: 3, w: -2, a: 1 }, "The adversary calls it a provocation."], ["A measured statement only", { a: -1 }, "Critics call it weak; diplomats call it wise."]],
      fact: "The PDB is among the most closely held documents in government: only a handful of officials are cleared to read it." },
    { place: "oval_desk", title: "The President's Daily Brief", who: "Your intelligence briefer", text: "Analysts have found signs of a possible plot against a U.S. embassy abroad. Details are thin.",
      opts: [["Close the embassy for a week", { s: 4, w: -1, a: -1 }, "Nothing happens. You'll never know why."], ["Reinforce security, stay open", { s: 1, w: 1 }, "Marines and diplomatic security agents fly in."], ["Strike the suspected cell", { s: 3, w: -5, a: 2 }, "The strike hits its target; the host government protests."]],
      fact: "Each U.S. embassy is protected by the State Department's Diplomatic Security Service, often with a Marine Security Guard detachment." },
    { place: "oval_desk", title: "The President's Daily Brief", who: "Your intelligence briefer", text: "A quiet morning: harvest forecasts, a disputed election abroad, and the finances of drug cartels.",
      opts: [["Ask for a deep dive on the cartels", { s: 2 }, "Treasury prepares new sanctions on money launderers."], ["Ask about the election abroad", { w: 2 }, "You call the winner before other leaders do."]],
      fact: "Most days are like this: the brief covers what the president may need to know, not just crises." },
    { place: "oval_desk", title: "The President's Daily Brief", who: "Your intelligence briefer", text: "Health officials flag an unusual respiratory virus spreading in another country.",
      opts: [["Send CDC experts and fund testing now", { e: -2, s: 5, a: 1 }, "Teams deploy; test kits are ordered.", 1, null, null, "pandemicNo"], ["Monitor for now", { e: 1 }, "Officials will watch the numbers.", 1, null, null, "pandemicRisk"], ["Restrict travel from the region", { w: -3, s: 2, a: 1 }, "The other government protests; the virus may already be here.", 1, null, null, "pandemicRisk"]],
      fact: "Early warning of disease outbreaks is part of the intelligence brief as well as the CDC's job." },
    { place: "sit_room", title: "Hostages", who: "The National Security Council, in the Situation Room", text: "Two American aid workers have been kidnapped abroad. Special forces believe a rescue raid could work, but it is risky.",
      opts: [["Authorize the rescue raid", { a: 7, s: 3 }, "Both hostages are rescued unharmed. You call their families yourself.", 0.7, { a: -8, w: -2 }, "The raid fails; one service member is wounded and the hostages are moved."], ["Negotiate through intermediaries", { a: -1, w: 1 }, "Talks begin. It may take months."]],
      fact: "The Situation Room is a 5,500 sq ft complex of secure rooms in the West Wing's basement, staffed around the clock." }],
  main: [
    { place: "oval_desk", title: "A bill on your desk", who: "Your legislative affairs director", text: "Congress passed a bipartisan infrastructure bill: roads, bridges, broadband, and some spending you think is wasteful.",
      opts: [["Sign it, with a ceremony", { e: 4, c: 3, a: 2 }, "Members of both parties crowd behind you for the photo; you hand out the pens."], ["Veto it over the waste", { c: -6, a: -2, e: -1 }, "Congress tries to override and falls six votes short."]],
      fact: "A president has 10 days (Sundays excepted) to sign or veto. Congress can override a veto with two-thirds of both houses." },
    { place: "cos", title: "A budget deadline", who: "Your Chief of Staff", text: "The government runs out of money in three days. Congressional leaders are deadlocked.",
      opts: [["Compromise: split the difference", { c: 4, a: 1 }, "A deal passes at midnight."], ["Hold firm and risk a shutdown", { c: -2, a: 3 }, "The other side caves at the last minute.", 0.5, { e: -4, a: -5, c: -4 }, "The government shuts down for 16 days. Parks close; troops work without pay."], ["Sign a short-term extension", { c: 1, a: -1 }, "You have bought six weeks."]],
      fact: "When funding lapses, 'non-essential' federal work stops; essential workers, like air traffic controllers, work without pay until it returns." },
    { place: "oval_desk", title: "A Supreme Court vacancy", who: "Your White House Counsel", text: "A justice has announced retirement. You nominate; the Senate confirms.",
      opts: [["A highly qualified consensus pick", { c: 4, a: 1 }, "Confirmed 74-26."], ["A nominee who energizes your base", { c: -4, a: 3 }, "Confirmed by two votes after bruising hearings."], ["A historic first", { a: 3, c: -1 }, "Confirmed after weeks of hearings; the moment is celebrated."]],
      fact: "Justices serve for life. Nominees need a simple majority of the Senate." },
    { place: "roosevelt", title: "A national rail strike", who: "Union leaders and railroad executives, in the Roosevelt Room", text: "Rail workers and companies are deadlocked. A strike would halt a third of the nation's freight.",
      opts: [["Lock them in a room until they deal", { e: 2, a: 2 }, "Twenty hours later, they shake hands."], ["Ask Congress to impose a contract", { e: 3, c: -1, a: -2 }, "Trains keep running; the unions are angry."], ["Stay out of it", { e: -5, a: -3 }, "The strike lasts nine days. Store shelves thin out."]],
      fact: "Under the Railway Labor Act, Congress can impose a contract to prevent a national rail strike, as it did in 2022." },
    { place: "sit_room", title: "A hurricane", who: "FEMA and the National Security Council", text: "A major hurricane has struck the Gulf Coast. Hundreds of thousands are without power.",
      opts: [["Declare a major disaster and fly there", { a: 3 }, "Air Force One is being readied.", 1, null, null, null, "hurricaneVisit"], ["Declare a major disaster; send the FEMA administrator", { a: 1 }, "Aid flows; you monitor from Washington."]],
      fact: "A governor asks; the president declares. A major disaster declaration unlocks federal money for families, cleanup and rebuilding." },
    { place: "cos", title: "Wildfires in the West", who: "Your Chief of Staff", text: "Wind-driven wildfires have burned two towns.",
      opts: [["Declare a disaster and go see it", { a: 2 }, "You'll fly out this afternoon.", 1, null, null, null, "wildfireVisit"], ["Declare a disaster; surge federal firefighters", { a: 1, s: 1 }, "Air tankers and crews arrive from six states."]],
      fact: "The federal government fights fires on federal land and helps states pay for the rest." },
    { place: "cos", title: "Markets tumble", who: "Your Chief of Staff and economic advisers", text: "Stocks fell 9% this week on fears of a recession.",
      opts: [["Speak calmly; let the Federal Reserve work", { e: 1, a: 1 }, "Markets steady within days."], ["Propose a stimulus package", { e: 3, c: -2, a: 1 }, "Congress argues about it for a month."], ["Blame your predecessor", { a: -2 }, "It does not help."]],
      fact: "The Federal Reserve is independent: the president appoints its governors but does not set interest rates." },
    { place: "cabinet", title: "A Cabinet meeting", who: "Your Cabinet", text: "Each secretary reports. You can push one priority across the government.",
      opts: [["Lower prescription drug prices", { a: 2 }, "Health and Human Services starts negotiating prices."], ["Speed up permits for building", { e: 2 }, "Agencies promise decisions in months, not years."], ["Prepare for cyberattacks", { s: 3 }, "Every department runs a drill."]],
      fact: "The Cabinet meets in the Cabinet Room; the president sits at the middle of the table, facing the Rose Garden windows." },
    { place: "oval_desk", title: "An executive order", who: "Your Domestic Policy Council", text: "Advisers propose an executive order to speed up permits for new power lines.",
      opts: [["Sign it", { e: 2, c: -1 }, "Utilities welcome it; a lawsuit is filed within a week."], ["Ask Congress to pass a law instead", { c: 2 }, "Slower, but harder to undo."]],
      fact: "Executive orders direct the executive branch. They can't override laws, courts can block them, and the next president can reverse them." },
    { place: "oval_desk", title: "A trade dispute", who: "The leader of a major trading partner, on the phone", text: "They are angry about your tariffs on their steel.",
      opts: [["Agree to negotiate", { w: 3, e: 2 }, "Talks begin next month."], ["Keep the tariffs", { e: -2, a: 1, w: -2 }, "They retaliate against U.S. soybeans."], ["Raise them further", { e: -4, w: -4, a: 1 }, "A trade war begins."]],
      fact: "Presidents spend a lot of time on calls with foreign leaders, arranged and listened in on by National Security Council staff." },
    { place: "cos", title: "Energy prices spike", who: "Your Chief of Staff", text: "Gasoline is up 80 cents a gallon in a month.",
      opts: [["Release oil from the Strategic Petroleum Reserve", { e: 2, s: -1, a: 1 }, "Prices ease a little."], ["Ask producers abroad to pump more", { w: 1 }, "They promise to consider it."], ["Wait it out", { a: -2 }, "Prices fall slowly on their own."]],
      fact: "The Strategic Petroleum Reserve stores hundreds of millions of barrels of oil in salt caverns along the Gulf Coast." },
    { place: "oval_desk", title: "Peace talks", who: "Your Secretary of State", text: "Two foreign leaders in a long border conflict will accept an invitation to talks.",
      opts: [["Invite them to Camp David", { w: 1 }, "Marine One is on standby for this afternoon.", 1, null, null, null, "campDavid"], ["Let the Secretary of State mediate", { w: 2 }, "Talks begin in Geneva."]],
      fact: "Presidents often use Camp David for summits: it is private, secure, and away from the press." },
    { place: "oval_desk", title: "A factory opening", who: "Your scheduler", text: "A battery plant built with new federal tax credits is opening in Michigan.",
      opts: [["Go: fly out for the opening", { a: 1 }, "Air Force One is fuelled.", 1, null, null, null, "factory"], ["Send the Commerce Secretary", {}, "It makes the local news."]],
      fact: "A trip of a few hours involves hundreds of people: military aircraft, the Secret Service, staff, and the travelling press pool." }],
  second: [
    { place: "press_podium", title: "A press briefing", who: "The White House press corps", text: "The first question: why are grocery prices still so high?",
      opts: [["Lay out a concrete plan", { a: 2 }, "The answer leads the evening news."], ["Point to the good economic data", { a: -1 }, "It sounds out of touch."], ["Joke your way through it", { a: 2 }, "The clip goes viral, in a good way.", 0.5, { a: -2 }, "The clip goes viral, in a bad way."]],
      fact: "The press secretary briefs most weekdays from this podium; presidents hold formal solo press conferences only a few times a year." },
    { place: "rose_podium", title: "The Medal of Honor", who: "An Army sergeant, her family, and her unit", text: "She carried four wounded soldiers to safety under fire.", opts: [["Present the medal", { a: 2 }, "The room stands for a long ovation."]],
      fact: "The Medal of Honor, the nation's highest military award, is presented by the president, usually in the East Room or the Rose Garden." },
    { place: "cos", title: "Clemency", who: "Your White House Counsel", text: "Petitions include a nonviolent drug offender who has served 20 years with a spotless record.",
      opts: [["Grant clemency to a group of such cases", { a: 1 }, "Seventy-five people go home to their families."], ["Decline for now", {}, "The petitions go back in the queue."]],
      fact: "The pardon power covers federal crimes and is nearly absolute; it cannot be used for impeachment." },
    { place: "oval_desk", title: "An ally asks for help", who: "An allied prime minister, on the phone", text: "Their border is threatened by a large neighbour's army.",
      opts: [["Send air-defence systems", { w: 3, s: 1, c: -1 }, "The systems ship within days."], ["Organize allied sanctions", { w: 4 }, "Thirty countries sign on."], ["Stay neutral", { w: -5 }, "Allies ask what your word is worth."]],
      fact: "Many U.S. alliances, like NATO, carry treaty commitments to mutual defence." },
    { place: "cos", title: "A leak", who: "Your Chief of Staff", text: "A classified document leak has been traced to a junior member of your own staff.",
      opts: [["Fire them and cooperate fully with investigators", { a: 1 }, "The story fades in a week."], ["Downplay it", { a: -3 }, "The story grows for a month."]],
      fact: "The president can declassify documents, but the rules on handling classified information bind the president's staff." },
    { place: "roosevelt", title: "Mayors and governors", who: "A bipartisan group of mayors and governors, in the Roosevelt Room", text: "They want federal help with housing costs.",
      opts: [["Offer grants tied to building more homes", { a: 2, e: 1 }, "Twelve cities sign up within a month."], ["Promise to study it", { a: -1 }, "They leave unimpressed."]],
      fact: "The Roosevelt Room, across the hall from the Oval Office, is used for meetings and was named for both Roosevelts." },
    { place: "sit_room", title: "A border surge", who: "Homeland Security, in the Situation Room", text: "Crossings at the southern border have doubled in a month.",
      opts: [["Send more officers and immigration judges", { a: 1, c: 1 }, "The backlog of cases starts to shrink."], ["Push Congress for comprehensive reform", { c: 2 }, "Talks begin in the Senate."], ["Tighten asylum by executive action", { a: 1, w: -2, c: -1 }, "Crossings fall; lawsuits follow."]],
      fact: "Most immigration law is written by Congress; presidents act within it through enforcement priorities and executive actions." },
    { place: "oval_desk", title: "A state visit", who: "Your Chief of Protocol", text: "A close ally's president arrives for a state visit: a ceremony on the South Lawn, talks, and a state dinner.",
      opts: [["Host a state dinner in the East Room", { w: 3 }, "The toasts go well; a trade agreement is announced."], ["Keep it to a working lunch", { w: 1 }, "Efficient; the guests notice."]],
      fact: "State visits begin with an arrival ceremony on the South Lawn: a 21-gun salute and the Old Guard Fife and Drum Corps." }] };
const ROOM_INFO = {
  oval_desk: "The Oval Office: every president since Taft has worked here. The Resolute Desk was a gift from Queen Victoria in 1880.",
  cabinet: "The Cabinet Room overlooks the Rose Garden. Each chair carries a brass plate with the secretary's title; the president's is two inches taller.",
  cos: "The Chief of Staff's office, a few steps from the Oval: the person who runs the West Wing and controls who gets in to see you.",
  sit_room: "The Situation Room: where presidents follow military operations and crises with the National Security Council.",
  roosevelt: "The Roosevelt Room: a windowless meeting room across the hall from the Oval Office.",
  press_podium: "The James S. Brady Press Briefing Room, built over the indoor pool FDR used. Forty-nine seats, each assigned to a news organization.",
  rose_podium: "The Rose Garden, laid out in 1913 and redesigned for Kennedy in 1962: used for announcements and ceremonies.",
  portico: "The South Portico and the Truman Balcony. Upstairs is the Residence, where the First Family lives.",
  marine_one: "Marine One: the call sign of any Marine Corps helicopter carrying the president. Identical decoys fly with it.",
  af1_desk: "Air Force One is the call sign of any Air Force aircraft carrying the president; the planes are modified Boeing 747s with an office, a conference room and a medical suite.",
  cd_table: "Aspen Lodge, the presidential cabin at Camp David.", capitol_podium: "The House chamber, where joint sessions of Congress meet.",
  un_podium: "The General Assembly Hall at UN headquarters in New York.", town_podium: "A podium set up by the advance team." };
const SCENE_OF = { capitol_podium: "capitol", un_podium: "un", town_podium: "town", cd_table: "camp" };
const FAR = new Set(["un", "town"]);

// ---------- state ----------
const meters = { a: 57, c: 52, e: 52, w: 52, s: 58 }, MNAMES = { a: "Approval", c: "Congress", e: "Economy", w: "World standing", s: "Security" };
let m = 0, items = [], itemI = 0, flags = {}, dayDate = "", reelected = false, history = [], pending = null;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const bag = {}; function draw(k) { if (!bag[k] || !bag[k].length) bag[k] = POOL[k].slice().sort(() => Math.random() - 0.5); return bag[k].pop(); }
const it = (time, ev, extra = {}) => ({ time, place: ev.place, ev, ...extra });
function planMonth() {
  const cm = m % 12, yr = Math.floor(m / 12) + 1; dayDate = `${m === 0 ? "Friday" : DAYS[(Math.random() * 5) | 0]}, ${MONTHS[cm]} ${m === 0 ? 20 : 3 + ((Math.random() * 24) | 0)}, year ${yr} of your term`;
  items = [];
  if (m === 0) items.push(it("12:40", EV.letter), it("15:00", EV.firstCabinet));
  else { items.push(it("8:00", draw("pdb")));
    if (flags.pandemicRisk && m >= flags.pandemicRisk + 2 && !flags.pandemicDone) { flags.pandemicDone = 1; items.push(it("10:00", EV.pandemic)); } else items.push(it("10:00", draw("main")));
    if (cm === 1) items.push(it("21:00", EV.sotu));
    else if (cm === 8) items.push(it("15:00", EV.unga));
    else if (cm === 10) { items.push(it("14:00", EV.turkey)); if (yr % 4 === 2) items.push(it("21:00", EV.midterms)); if (yr === 4 && !reelected) { items.push(it("16:00", EV.rally)); items.push(it("23:00", EV.election)); } }
    else items.push(it("14:00", draw("second"))); }
  items.push({ time: "evening", place: "portico", kind: "residence", title: "Go up to the Residence to end the day" }); itemI = 0; }
const cur = () => items[itemI];
const clampM = v => Math.max(3, Math.min(97, v));
function apply(fx) { for (const k in fx) meters[k] = clampM(meters[k] + fx[k]); }

// ---------- the dialog: HTML on desktop, a panel in VR ----------
const DLG = document.createElement("div"); DLG.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:4;background:rgba(248,246,240,.97);color:#1a2030;border-radius:14px;padding:22px 26px;max-width:640px;width:86vw;box-shadow:0 20px 60px rgba(0,0,0,.45);font:15px/1.5 Georgia,serif;display:none;border-top:6px solid #1c2f6b";
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(16,24,44,.78);color:#eef2f8;padding:10px 14px;border-radius:10px;font:13.5px/1.5 -apple-system,Helvetica,sans-serif;max-width:600px";
const FADE = document.createElement("div"); FADE.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .45s;z-index:5";
document.body.append(DLG, HUD, FADE);
let dlg = null, sel = 0;
function openDialog(d) { dlg = d; sel = 0; vrDirty = true;
  DLG.innerHTML = `<div style="font:700 22px Georgia">${d.title}</div>${d.who ? `<div style="color:#5a6478;font-style:italic;margin:2px 0 10px">${d.who}</div>` : ""}<div style="margin-bottom:12px">${d.text}</div>` +
    d.opts.map((o, i) => `<button data-i="${i}" style="display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:8px;border:1px solid #c0c8d8;background:#fff;font:15px Georgia;cursor:pointer">${i + 1}. ${o.label}</button>`).join("") +
    (d.fact ? `<div style="margin-top:12px;color:#3a4a6a;font-size:13.5px;border-top:1px solid #d8dce4;padding-top:8px">📜 ${d.fact}</div>` : "");
  DLG.style.display = renderer.xr.isPresenting ? "none" : "block"; }
DLG.addEventListener("click", e => { const b = e.target.closest("button"); if (b) choose(+b.dataset.i); });
function choose(i) { if (!dlg || !dlg.opts[i]) return; const fn = dlg.opts[i].fn; dlg = null; DLG.style.display = "none"; vrDirty = true; fn && fn(); }
function info(title, text, then) { openDialog({ title, text, opts: [{ label: "Continue", fn: then }] }); }

function runEvent(ev, item) {
  if (ev === EV.midterms) { const lose = meters.a < 49; ev = { ...ev, text: lose ? "Your party has lost the House of Representatives. For two years the other party will control what comes to the floor." : "Against history, your party held both chambers.", opts: [["Call the winners, of both parties", lose ? { c: -12 } : { c: 4 }, lose ? "The new Speaker accepts your call, coolly." : "A rare midterm win."]] }; }
  if (ev === EV.election) { const win = meters.a + gauss() * 3 > 47; reelected = win; flags.lost = !win;
    ev = { ...ev, text: win ? `With ${meters.a.toFixed(0)}% approval, you carry the swing states. You have won a second term.` : `With ${meters.a.toFixed(0)}% approval, it wasn't enough. You have lost. You will serve until noon on January 20.`,
      opts: [[win ? "Thank your supporters" : "Call your opponent to concede", win ? { a: 3 } : {}, win ? "Four more years." : "You promise a peaceful transfer of power, as every president has."]] }; }
  openDialog({ title: ev.title, who: ev.who, text: ev.text, fact: null, opts: ev.opts.map(([label, fx, res, p, failFx, failRes, flag, next]) => ({ label, fn: () => {
    const ok = p === undefined || Math.random() < p, F = ok ? fx : failFx, R = ok ? res : failRes; apply(F);
    if (flag === "pandemicRisk" && !flags.pandemicRisk) flags.pandemicRisk = m; if (flag === "pandemicNo") flags.pandemicDone = 1;
    if (next) items.splice(itemI + 1, 0, it(EV[next].place === "cd_table" ? "16:00" : "13:00", EV[next], { town: EV[next].town }));
    const delta = Object.entries(F || {}).filter(([, v]) => v).map(([k, v]) => `${MNAMES[k]} ${v > 0 ? "+" : ""}${v}`).join(" · ");
    history.push(`${MONTHS[m % 12]} Y${Math.floor(m / 12) + 1}: ${ev.title}: ${label}`);
    openDialog({ title: ev.title, text: `${R}${delta ? `<div style="color:#1c4a8a;margin-top:6px">${delta}</div>` : ""}`, fact: ev.fact, opts: [{ label: "Continue", fn: () => { itemI++; } }] }); } })) }); }

function endDay() {
  meters.e = clampM(meters.e + gauss() * 2 - (meters.e - 52) * 0.06);
  const target = 46 + 0.35 * (meters.e - 50) + 0.2 * (meters.s - 50) + 0.15 * (meters.w - 50) + 0.1 * (meters.c - 50) + (m < 6 ? 6 : 0);
  const a0 = meters.a; meters.a = clampM(meters.a + (target - meters.a) * 0.25 + gauss() * 1.2);
  const heads = [meters.e > 58 ? "Hiring is strong; the economy is growing." : meters.e < 42 ? "Economists warn of recession." : "The economy grinds along.",
    meters.a > a0 + 1 ? "Your approval is rising." : meters.a < a0 - 1 ? "Your approval is slipping." : "Your approval holds steady.",
    meters.c < 40 ? "Congress is in open revolt against your agenda." : meters.c > 60 ? "Congress is passing your bills." : "Congress is divided.",
    meters.w > 60 ? "Allies praise U.S. leadership." : meters.w < 40 ? "Allies quietly hedge their bets." : ""].filter(Boolean);
  m++;
  const over = (m === 48 && !reelected) || m === 96;
  if (over) return finish();
  planMonth();
  info("Weeks pass", `You sleep in the Residence; the weeks until your next day here pass in briefings, calls, travel and events.<br><br>${heads.join(" ")}<br><br><b>${dayDate}</b>`, () => goScene("wh", "morning"));
}
function finish() { const yrs = m / 12;
  openDialog({ title: "Noon, January 20: your presidency ends", text: `You served ${yrs} years${reelected ? ", two full terms" : ""}. Final approval ${meters.a.toFixed(0)}%. Economy ${meters.e.toFixed(0)}, world standing ${meters.w.toFixed(0)}, security ${meters.s.toFixed(0)}.<br><br>
    You leave a letter in the Resolute Desk for your successor, ride with them to the Capitol, and fly home.<br><br><span style="font-size:13px;color:#5a6478">Some of your decisions: ${history.slice(-6).join("; ")}.</span>`, fact: "Only two presidents' terms ended before 1951's 22nd Amendment limited presidents to two elected terms because of a choice not to run; since then, two is the law.",
    opts: [{ label: "Begin a new presidency", fn: () => location.reload() }] }); }

// ---------- moving between places ----------
let fading = false;
function goScene(name, spawn = "arrive", arg) {
  const doit = () => { clearScene();
    if (name === "wh") buildWH(); else if (name === "capitol" || name === "un") buildChamber(name); else if (name === "town") buildTown(arg); else if (name === "camp") buildCamp(); else if (name === "af1") buildAF1();
    const sp = SC.spawns[spawn] || Object.values(SC.spawns)[0]; P.x = sp[0]; P.z = sp[1]; P.y = SC.groundH(sp[0], sp[1]); yaw = sp[2]; pitch = -0.08; vrTurn = 0; vrDirty = true; };
  if (renderer.xr.isPresenting || !SC) return doit();
  fading = true; FADE.style.opacity = 1; setTimeout(() => { doit(); FADE.style.opacity = 0; fading = false; }, 480); }
function target() {   // where to go next: [x, z, label]
  const c = cur(); if (!c) return null; const sc = c.kind === "residence" ? "wh" : SCENE_OF[c.place] || "wh";
  if (SC.name === "af1") return [...SC.spots.af1_door];
  if (sc === SC.name || (sc === "town" && SC.name === "town")) { const s = SC.spots[c.place]; return s ? s : null; }
  if (SC.name === "wh") return [...SC.spots.marine_one.slice(0, 2), `Marine One (${sc === "capitol" ? "to the Capitol" : sc === "camp" ? "to Camp David" : "to Andrews and Air Force One"})`];
  return [...SC.spots.exit]; }
function interact() {
  if (!started) return start(); if (dlg || fading) return;
  let best = null, bd = 2.3; for (const [id, s] of Object.entries(SC.spots)) { const d = Math.hypot(P.x - s[0], P.z - s[1]); if (d < bd) { bd = d; best = id; } }
  if (!best) return info("Nothing to do here", "Follow the gold marker to your next appointment. The readout says where it is.");
  const c = cur(), sc = c ? (c.kind === "residence" ? "wh" : SCENE_OF[c.place] || "wh") : "wh";
  if (c && best === c.place) { if (c.kind === "residence") return endDay(); return runEvent(c.ev, c); }
  if (best === "marine_one") { if (sc !== "wh") { if (FAR.has(sc)) { pending = { name: sc, arg: c.town || c.ev.town }; return info("Marine One", "Marine One lifts off from the South Lawn for the 10-minute flight to Joint Base Andrews, where Air Force One is waiting.", () => goScene("af1")); }
      return info(sc === "capitol" ? "The motorcade" : "Marine One", sc === "capitol" ? "The motorcade, with the armoured limousine called 'the Beast', takes you up Pennsylvania Avenue to the Capitol." : "Thirty minutes north-west over the Maryland hills to Camp David.", () => goScene(sc)); }
    return info("Marine One", ROOM_INFO.marine_one + " Your next appointment is here at the White House."); }
  if (best === "af1_door") { const p = pending || { name: sc, arg: c?.town }; return info("Landing", "Air Force One touches down. A motorcade is waiting on the tarmac.", () => goScene(p.name, "arrive", p.arg)); }
  if (best === "exit") { if (c && sc === SC.name) return info("Not yet", "You still have an appointment here: follow the gold marker."); return goScene("wh", "lawn"); }
  info(SC.spots[best][2][0].toUpperCase() + SC.spots[best][2].slice(1), ROOM_INFO[best] || ""); }

// ---------- controls ----------
const P = { x: 0, z: 0, y: 0 }, keys = {}; let yaw = 0, pitch = 0, dragging = false, started = false;
const intro = document.getElementById("intro");
function start() { if (started) return; started = true; intro?.classList.add("gone"); info("Inauguration Day", `At noon you took the oath of office on the West Front of the Capitol: "I do solemnly swear that I will faithfully execute the Office of President of the United States, and will to the best of my Ability, preserve, protect and defend the Constitution of the United States."<br><br>After the parade, you walk into the West Wing for the first time. Follow the gold marker to the Oval Office.<br><br><b>${dayDate}</b>`); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return start(); if (e.code === "KeyE") interact(); if (dlg && /^Digit[1-4]$/.test(e.code)) choose(+e.code.slice(5) - 1); if (dlg && e.code === "Enter" && dlg.opts.length === 1) choose(0); });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; if (!started) start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.004, -1.4, 1.4); });
intro?.addEventListener("click", start);
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0, vrDirty = true, selLatch = false;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0; const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 720; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.45), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 30; vrPanel.position.set(0, -0.12, -0.75); vrPanel.visible = false; camera.add(vrPanel);
function wrap(g, txt, x, y, maxW, lh, maxLines = 99) { const words = txt.replace(/<br>/g, " \n ").replace(/<[^>]+>/g, "").split(" "); let line = "", n = 0;
  for (const w of words) { if (w === "\n") { g.fillText(line, x, y); y += lh; line = ""; if (++n >= maxLines) return y; continue; } if (g.measureText(line + w).width > maxW) { g.fillText(line, x, y); y += lh; line = ""; if (++n >= maxLines) return y; } line += w + " "; } g.fillText(line, x, y); return y + lh; }
function drawVR() { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 720);
  if (dlg) { g.fillStyle = "rgba(248,246,240,.96)"; g.beginPath(); g.roundRect(0, 0, 1024, 720, 20); g.fill(); g.fillStyle = "#1c2f6b"; g.fillRect(0, 0, 1024, 10);
    g.fillStyle = "#1a2030"; g.font = "700 38px Georgia"; let y = wrap(g, dlg.title, 28, 60, 960, 42, 2); g.font = "26px Georgia"; y = wrap(g, dlg.text, 28, y + 4, 960, 32, 9);
    dlg.opts.forEach((o, i) => { g.fillStyle = i === sel ? "#1c2f6b" : "#e4e8f0"; g.beginPath(); g.roundRect(24, y, 976, 54, 10); g.fill(); g.fillStyle = i === sel ? "#fff" : "#1a2030"; g.font = "26px Georgia"; g.fillText(`${i + 1}. ${o.label}`.slice(0, 70), 40, y + 36); y += 62; });
    if (dlg.fact) { g.fillStyle = "#3a4a6a"; g.font = "21px Georgia"; wrap(g, "📜 " + dlg.fact, 28, y + 20, 960, 26, 4); }
    g.fillStyle = "#6a7488"; g.font = "20px Helvetica"; g.fillText("left stick: choose · A: select", 28, 706); }
  else { g.fillStyle = "rgba(16,24,44,.82)"; g.beginPath(); g.roundRect(0, 470, 1024, 250, 20); g.fill(); g.fillStyle = "#eef2f8"; g.font = "26px Helvetica"; wrap(g, hudText(true), 26, 510, 970, 32, 7); }
  vrT.needsUpdate = true; }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.85);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; DLG.style.display = "none"; vrDirty = true;
    s.addEventListener("end", () => { camera.position.set(0, 1.65, 0); rig.rotation.set(0, 0, 0); vrPanel.visible = false; if (dlg) DLG.style.display = "block"; }); }; });

// ---------- the readout ----------
const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd04a, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beacon.frustumCulled = false; scene.add(beacon);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd04a, transparent: true, opacity: 0.8 })); scene.add(ring);
const fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
function hudText(plain) { const c = cur(), T = target();
  let where = ""; if (T) { const dx = T[0] - P.x, dz = T[1] - P.z, d = Math.hypot(dx, dz), rel = Math.atan2(dx, dz) - Math.atan2(fwd.x, fwd.z), r = Math.atan2(Math.sin(rel), Math.cos(rel));
    where = d < 2.3 ? `${T[2]}: press ${plain && renderer.xr.isPresenting ? "A" : "E"}` : `${T[2]}, ${Math.round(d)} m ${Math.abs(r) < 0.4 ? "ahead" : Math.abs(r) > 2.6 ? "behind you" : r > 0 ? "to your left" : "to your right"}`; }
  const bars = Object.entries(meters).map(([k, v]) => plain ? `${MNAMES[k]} ${v.toFixed(0)}` : `<span style="display:inline-block;width:118px">${MNAMES[k]}</span><span style="display:inline-block;width:150px;height:8px;background:#2a3450;border-radius:4px;vertical-align:middle"><span style="display:block;width:${v * 1.5}px;height:8px;border-radius:4px;background:${v > 55 ? "#5ac87a" : v < 40 ? "#e05a4a" : "#e8c050"}"></span></span> ${v.toFixed(0)}`).join(plain ? " · " : "<br>");
  const task = c ? `${c.time !== "evening" ? c.time + " · " : ""}${c.ev ? c.ev.title : c.title}` : "";
  return plain ? `${dayDate}  ·  ${task}  ·  ${where}  ·  ${bars}` :
    `<b>${dayDate}</b><br><span style="color:#ffd84a">Next: ${task}</span><br>${where}<br><div style="margin:6px 0">${bars}</div><span style="color:#9aa8c0;font-size:12.5px">WASD walk · drag to look · shift run · E act · 1-4 choose</span>`; }

// ---------- the loop ----------
const clock = new THREE.Clock(); let hudT = 0, loopErrs = 0;
planMonth(); goScene("wh", "morning"); FADE.style.opacity = 0;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  if (!SC) return;
  const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; let mx = 0, my = 0, run = 1;
  if (vr) { const s = renderer.xr.getSession();
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { if (dlg) { if (Math.abs(ay) > 0.6 && !selLatch) { sel = (sel + (ay > 0 ? 1 : -1) + dlg.opts.length) % dlg.opts.length; selLatch = true; vrDirty = true; } else if (Math.abs(ay) < 0.3) selLatch = false; } else { mx += ax; my += ay; } }
      else { if (tap("R", gp, 4) || tap("R", gp, 0)) { if (dlg) choose(sel); else interact(); } if (gp.buttons[0]?.value > 0.3 && !dlg) run = 2.2;
        if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = yaw + vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (!dlg) { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
    if (keys.ShiftLeft || keys.ShiftRight) run = 2.4; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; }
  fwd.y = 0; fwd.normalize(); side.crossVectors(fwd, UP).normalize();
  if ((mx || my) && !fading) { const sp = 1.6 * run * dt, nx = P.x + (fwd.x * -my + side.x * mx) * sp, nz = P.z + (fwd.z * -my + side.z * mx) * sp;
    if (SC.canStand(nx, nz)) { P.x = nx; P.z = nz; } else if (SC.canStand(nx, P.z)) P.x = nx; else if (SC.canStand(P.x, nz)) P.z = nz; }
  P.y += (SC.groundH(P.x, P.z) - P.y) * Math.min(1, dt * 10); rig.position.set(P.x, P.y, P.z);
  const T = target(); beacon.visible = ring.visible = !!T && !dlg;
  if (T) { const d = Math.hypot(T[0] - P.x, T[1] - P.z); beacon.position.set(T[0], 15, T[1]); beacon.material.opacity = 0.3 * THREE.MathUtils.clamp((d - 2) / 8, 0.1, 1); ring.position.set(T[0], SC.groundH(T[0], T[1]) + 0.03, T[1]); ring.scale.setScalar(1 + 0.15 * Math.sin(clock.elapsedTime * 3)); }
  hudT -= dt; if (hudT <= 0) { hudT = 0.3; HUD.innerHTML = hudText(false); if (vr && (vrDirty || true)) { drawVR(); vrDirty = false; } }
  renderer.render(scene, camera);
}
