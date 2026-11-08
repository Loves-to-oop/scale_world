// etta1910.js -- 218 Etta Avenue, in the Luxemburg district of St. Louis County just south of the city line and the River Des Peres,
// on Sunday afternoon, 19 June 1910: the Fraundorf family's house, inside and out, and the streets, the bluff and the river bottoms
// around it. Built into etta1910.html by build.py, after etta1910_data.js (the street lines and the land).
//
// What it rests on: the Sanborn fire insurance map of 1908 (sheet 117, "East Hancock Place": the house's L-shaped outline, a frame
// dwelling of 1 1/2 storeys with a shingle roof and a porch in the corner of the L, 11 ft back from Etta Avenue on a lot 52 by 126 ft,
// a one-storey shed with a tar-paper roof behind; its neighbours and their sheds, stables and a chicken house, and the near-twin house
// at 220 next door), the 1909 Sanborn sheet with St. Andrew's (a frame church 28 ft to the eaves, lit by lamps, and the priest's
// house), the 1910 census (sheet 26A, Carondelet Township: Richard Bernhard Fraundorf, entered as "Benjamin", 40, a bread baker born
// in Germany; Louisa, 37, who spoke German; Lulu 12, Joseph 8, Annie 6, Jennie 4, Richard 2; the house owned, with a mortgage), the
// family's photographs (the narrow clapboards, light paint and turned porch columns; the parlour's dark flowered wallpaper, framed
// pictures, ornate mirror, settee and marble-topped dresser; how they dressed), the county history of 1911 (Buttermilk Hill and
// Luxemburg, the Barracks streetcar), and the land itself from the USGS elevation model and today's street lines, renamed to the 1908
// names (Cleveland, Virginia, Hancock, Louise and Florence are today's Cartwright, Velma, Holden, Loretta and Felton). No plans of the
// house survive: the rooms are laid out as cottages of this shape usually were, and the furniture, the other houses and the people
// are typical of the time and place. The info points (E) say what is known and what is not.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: !IS_HEADSET });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 20000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
const clampN = THREE.MathUtils.clamp, sstepN = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
const SEED = 1; let s0 = 48271; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(SEED, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 4) { let a = 0, f = 1, w = 0.5, s = 0; for (let k = 0; k < n; k++) { a += w * vnoise(x * f, z * f); s += w; f *= 2.03; w *= 0.5; } return a / s; }

// ---------- textures ----------
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- the land: the USGS elevation model, smoothed between its 100 m samples ----------
// y is height above 140 m (459 ft). The house stands at about 141 m on the upland; it falls east to a bluff 300-400 m away and the
// river bottoms at about 127 m, where the Iron Mountain railroad runs; the Mississippi's surface is at about 117 m. Today's sewage
// works on the bottoms below Hoffmeister Avenue (built in the 1960s) are left out: in 1910 that was woods and fields.
const BASE = 140, WATER_Y = 117.3 - BASE;
const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
const EH = (i, j) => { i = clampN(i, 0, ELEV.nx - 1); j = clampN(j, 0, ELEV.nz - 1); const h = ELEV.h[j * ELEV.nx + i]; return h < 118.3 ? 109 : h; };
function elevRaw(x, z) { const gx = (x - ELEV.x0) / ELEV.dx, gz = (z - ELEV.z0) / ELEV.dx, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, row = jj => cr(EH(i - 1, jj), EH(i, jj), EH(i + 1, jj), EH(i + 2, jj), fx);
  return cr(row(j - 1), row(j), row(j + 1), row(j + 2), fz); }
// beyond the samples the land runs on: the upland west, the Illinois bottoms east of the river
function elevFar(x, z) { const xe = ELEV.x0 + (ELEV.nx - 1) * ELEV.dx, ze = ELEV.z0 + (ELEV.nz - 1) * ELEV.dx; const h = elevRaw(clampN(x, ELEV.x0, xe), clampN(z, ELEV.z0, ze));
  if (x > xe) return lerpN(h, 122, sstepN(x - xe, 0, 400)); if (x < ELEV.x0) return h + 6 * sstepN(ELEV.x0 - x, 0, 2000); return h; }
const LIFT = [];
function ground(x, z) { let h = elevFar(x, z) - BASE + 0.35 * (fbm(x / 40, z / 40, 3) - 0.5);
  for (const L of LIFT) { const d = Math.max(Math.abs(x - L.x) - L.hw, Math.abs(z - L.z) - L.hd, 0); if (d < L.f) h = lerpN(L.y, h, sstepN(d, 0, L.f)); } return h; }

// ---------- the sky and the sun: Sunday 19 June 1910, at St. Louis (38.53 N) ----------
let hour = 17.0;
function sunDir(hr) { const lat = 38.53 * Math.PI / 180, dec = 23.4 * Math.PI / 180, H = (hr - 12) * 15 * Math.PI / 180;
  const el = Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H)), az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(H));
  return V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); }
const skyU = { sun: { value: V3(0, 1, 0) }, day: { value: 1 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(15000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 sun; uniform float day; varying vec3 vD; void main(){ float h = max(vD.y, 0.0), s = max(dot(vD, sun), 0.0);
    vec3 top = mix(vec3(0.02, 0.03, 0.07), vec3(0.32, 0.52, 0.82), day), hor = mix(vec3(0.05, 0.05, 0.09), vec3(0.78, 0.84, 0.88), day);
    vec3 dusk = vec3(0.95, 0.55, 0.3) * pow(1.0 - h, 6.0) * smoothstep(0.35, -0.05, sun.y) * smoothstep(-0.25, 0.0, sun.y) * pow(s, 2.0);
    vec3 c = mix(hor, top, pow(h, 0.55)) + dusk + vec3(1.0, 0.9, 0.7) * pow(s, 900.0) * 6.0 * step(-0.02, sun.y) + vec3(1.0, 0.85, 0.6) * pow(s, 12.0) * 0.25 * day;
    if (vD.y < 0.0) c = hor * 0.8; gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` }));
scene.add(sky);
scene.fog = new THREE.Fog(0xc8d0d4, 400, 5000);
const hemi = new THREE.HemisphereLight(0xc8dcf0, 0x6a5a40, 0.9); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff0d8, 2.6); sunL.castShadow = true; sunL.shadow.mapSize.set(IS_HEADSET ? 1024 : 2048, IS_HEADSET ? 1024 : 2048);
Object.assign(sunL.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 400 }); sunL.shadow.bias = -0.0004; sunL.shadow.normalBias = 0.03; scene.add(sunL, sunL.target);
function updateSky() { const d = sunDir(hour), day = clampN((d.y + 0.08) / 0.3, 0, 1); skyU.sun.value.copy(d); skyU.day.value = day;
  sunL.intensity = 2.6 * clampN(d.y / 0.12, 0, 1); sunL.color.setRGB(1, 0.86 + 0.12 * clampN(d.y * 3, 0, 1), 0.7 + 0.25 * clampN(d.y * 3, 0, 1));
  hemi.intensity = 0.12 + 0.8 * day; scene.fog.color.setRGB(0.05 + 0.73 * day, 0.05 + 0.77 * day, 0.08 + 0.75 * day); renderer.toneMappingExposure = 1.0 + 0.6 * (1 - day); return d; }

// ---------- surfaces ----------
// textures are one metre square, laid on in metres, so a clapboard is the same width on every wall
const clapT = tex(256, 256, (g, w, h) => { g.fillStyle = "#f4f2ec"; g.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { const y = k * h / 9; const gr = g.createLinearGradient(0, y, 0, y + h / 9); gr.addColorStop(0, "rgba(0,0,0,0.28)"); gr.addColorStop(0.12, "rgba(0,0,0,0.06)"); gr.addColorStop(1, "rgba(255,255,255,0.05)"); g.fillStyle = gr; g.fillRect(0, y, w, h / 9); }
  for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(90,80,60,${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 8 + rnd() * 30, 1); } });
const shingleT = tex(256, 256, (g, w, h) => { g.fillStyle = "#6e6458"; g.fillRect(0, 0, w, h); const rows = 8; for (let r = 0; r < rows; r++) { let x = (r % 2) * 9 - 9; while (x < w) { const sw = 14 + rnd() * 22, c = 92 + rnd() * 40;
      g.fillStyle = `rgb(${c},${c * 0.9},${c * 0.78})`; g.fillRect(x + 1, r * h / rows, sw - 2, h / rows - 2); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x + 1, (r + 1) * h / rows - 4, sw - 2, 3); x += sw; } } });
const brickT = tex(256, 256, (g, w, h) => { g.fillStyle = "#b8b0a0"; g.fillRect(0, 0, w, h); const bh = h / 15, bw = w / 5; for (let r = 0; r < 15; r++) for (let k = -1; k < 6; k++) { const c = 120 + rnd() * 50;
      g.fillStyle = `rgb(${c + 30},${c * 0.55},${c * 0.42})`; g.fillRect(k * bw + (r % 2) * bw / 2 + 2, r * bh + 2, bw - 4, bh - 3); } });
const boardT = tex(256, 256, (g, w, h) => { const n = 10; for (let k = 0; k < n; k++) { const c = 150 + rnd() * 40; g.fillStyle = `rgb(${c},${c * 0.72},${c * 0.46})`; g.fillRect(k * w / n, 0, w / n, h);
      g.fillStyle = "rgba(40,25,10,0.5)"; g.fillRect(k * w / n, 0, 2, h); const j = rnd() * h; g.fillRect(k * w / n, j, w / n, 2); for (let s = 0; s < 6; s++) { g.fillStyle = `rgba(80,50,20,${0.1 + rnd() * 0.15})`; g.fillRect(k * w / n + 3 + rnd() * (w / n - 6), 0, 1, h); } } });
const plankT = tex(256, 256, (g, w, h) => { const n = 5; for (let k = 0; k < n; k++) { const c = 110 + rnd() * 50; g.fillStyle = `rgb(${c},${c * 0.9},${c * 0.75})`; g.fillRect(k * w / n, 0, w / n, h); g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(k * w / n, 0, 3, h);
      for (let s = 0; s < 10; s++) { g.fillStyle = `rgba(50,40,30,${0.1 + rnd() * 0.2})`; g.fillRect(k * w / n + rnd() * w / n, 0, 1, h); } } });
// wallpapers: small repeating flowers on a ground, as the parlour photographs show (dark) and lighter papers for the other rooms
const paper = (ground, a, b, size = 32) => tex(256, 256, (g, w, h) => { g.fillStyle = ground; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) { const ox = (y / size) % 2 ? size / 2 : 0;
      g.fillStyle = a; for (let k = 0; k < 5; k++) { const an = k * 1.2566; g.beginPath(); g.ellipse(x + ox + Math.cos(an) * 4, y + Math.sin(an) * 4 + 8, 3, 2, an, 0, 7); g.fill(); } g.fillStyle = b; g.beginPath(); g.arc(x + ox, y + 8, 2, 0, 7); g.fill();
      g.strokeStyle = b; g.lineWidth = 1; g.beginPath(); g.moveTo(x + ox, y + 12); g.quadraticCurveTo(x + ox + 6, y + 20, x + ox + 2, y + 26); g.stroke(); } });
const paperParlour = paper("#4a2a26", "#8a5a3a", "#c8a060"), paperDining = paper("#5a6046", "#8a8a62", "#d0c08a", 28), paperBed = paper("#d8ccb0", "#b88a7a", "#7a8a5a", 36), paperBed2 = paper("#c8d0c0", "#8aa0b8", "#a07a6a", 30), paperHall = paper("#8a7a5a", "#a8946a", "#5a4a32", 30);
const plasterT = tex(64, 64, (g, w, h) => { g.fillStyle = "#e8e2d4"; g.fillRect(0, 0, w, h); for (let k = 0; k < 200; k++) { g.fillStyle = `rgba(120,110,90,${rnd() * 0.06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const tarT = tex(64, 64, (g, w, h) => { g.fillStyle = "#3a3836"; g.fillRect(0, 0, w, h); for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(0, k * 16, w, 2); } });
const rugT = tex(128, 128, (g, w, h) => { g.fillStyle = "#6a2a24"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c8a46a"; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.strokeStyle = "#2a3a5a"; g.lineWidth = 3; g.strokeRect(18, 18, w - 36, h - 36);
  for (let k = 0; k < 18; k++) { g.fillStyle = ["#c8a46a", "#2a3a5a", "#8a5a2a"][k % 3]; g.beginPath(); g.arc(30 + (k % 6) * 14, 34 + Math.floor(k / 6) * 30, 4, 0, 7); g.fill(); } });
const ragT = tex(128, 128, (g, w, h) => { for (let y = 0; y < h; y += 4) { g.fillStyle = ["#6a5a7a", "#8a4a3a", "#5a6a4a", "#a89a7a", "#4a4a5a", "#9a6a4a"][(Math.floor(y / 4) * 7 + Math.floor(rnd() * 2)) % 6]; g.fillRect(0, y, w, 4); } });
const oilT = tex(64, 64, (g, w, h) => { g.fillStyle = "#e8e4d8"; g.fillRect(0, 0, w, h); g.fillStyle = "#7a9ab8"; for (let k = 0; k < 8; k++) { g.fillRect(k * 8, 0, 4, h); g.fillRect(0, k * 8, w, 4); } }, [1, 1]);
const MAT = {}; const mk = (k, o) => MAT[k] = new THREE.MeshStandardMaterial({ roughness: 0.88, vertexColors: true, ...o });
mk("clap", { map: clapT }); mk("shingle", { map: shingleT, roughness: 0.95 }); mk("brick", { map: brickT }); mk("trim", { roughness: 0.7 }); mk("board", { map: boardT, roughness: 0.75 }); mk("plank", { map: plankT });
mk("parlour", { map: paperParlour }); mk("dining", { map: paperDining }); mk("bed", { map: paperBed }); mk("bed2", { map: paperBed2 }); mk("hall", { map: paperHall }); mk("plaster", { map: plasterT }); mk("tar", { map: tarT });
mk("plain", {}); mk("iron", { roughness: 0.45, metalness: 0.6 }); mk("rug", { map: rugT }); mk("rag", { map: ragT }); mk("oil", { map: oilT, roughness: 0.5 }); mk("cloth", { roughness: 0.95 });
MAT.glass = new THREE.MeshStandardMaterial({ color: 0xa8c0c8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false });
MAT.lace = new THREE.MeshStandardMaterial({ map: tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.5; for (let k = 0; k < 8; k++) { g.beginPath(); g.arc(k * 8 + 4, (k % 2) * 8 + 4, 3, 0, 7); g.stroke(); g.strokeRect(0, k * 8, w, 0.5); } }, [6, 6]), transparent: true, opacity: 0.75, alphaTest: 0.05, side: THREE.DoubleSide, roughness: 0.9 });

// ---------- geometry, merged by material ----------
// Pieces are placed in a frame F (a position on the ground and a turn) in local metres: X along the front, Y up, Z back.
const BK = new Map(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
const frame = (x, z, y, ry) => ({ x, z, y, ry, m: new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1)) });
const toWorld = (F, X, Y, Z) => V3(X, Y, Z).applyMatrix4(F.m);
function metreUV(g) { const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i)); else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i)); else uv.setXY(i, p.getX(i), p.getY(i)); } return g; }
function put(mat, geo, m, col = 0xffffff) { if (!BK.has(mat)) BK.set(mat, []); const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m); _c.set(col);
  const c = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < c.length; i += 3) { c[i] = _c.r; c[i + 1] = _c.g; c[i + 2] = _c.b; } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); BK.get(mat).push(g); }
// a box, centred at (cx, cy, cz) in the frame, sized in metres, its texture laid on in metres; optionally tilted
function box(F, mat, cx, cy, cz, sx, sy, sz, col, rx = 0, ry = 0, rz = 0) { const g = metreUV(new THREE.BoxGeometry(sx, sy, sz)); _e.set(rx, ry, rz); _m.compose(V3(cx, cy, cz), _q.setFromEuler(_e), V3(1, 1, 1)); put(mat, g, F.m.clone().multiply(_m), col); }
function cyl(F, mat, cx, cy, cz, r0, r1, h, col, seg = 10, rx = 0, rz = 0) { const g = new THREE.CylinderGeometry(r0, r1, h, seg); _e.set(rx, 0, rz); _m.compose(V3(cx, cy, cz), _q.setFromEuler(_e), V3(1, 1, 1)); put(mat, g, F.m.clone().multiply(_m), col); }
function lathe(F, mat, cx, cy, cz, prof, col, seg = 12, s = 1) { const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r * s, y * s)), seg); _m.makeTranslation(cx, cy, cz); put(mat, g, F.m.clone().multiply(_m), col); }
// a flat polygon (planar, listed anticlockwise seen from the side it faces), textured in metres across its own plane
function poly(F, mat, P, col, tris = null) { const n = new THREE.Vector3().crossVectors(V3(...P[1]).sub(V3(...P[0])), V3(...P[2]).sub(V3(...P[0]))).normalize(), u = V3(...P[1]).sub(V3(...P[0])).normalize(), v = new THREE.Vector3().crossVectors(n, u);
  const T = tris || P.slice(1, -1).map((_, i) => [0, i + 1, i + 2]), pos = [], uv = [], nor = [];
  for (const t of T) for (const k of t) { const p = V3(...P[k]); pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); const d = p.clone().sub(V3(...P[0])); uv.push(d.dot(u), d.dot(v)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); put(mat, g, F.m, col); }
// both faces of a polygon, each with its own surface (a roof: shingles above, plaster or bare boards below)
function poly2(F, matA, matB, P, colA, colB, off = 0.14, tris = null) { poly(F, matA, P, colA, tris); const n = new THREE.Vector3().crossVectors(V3(...P[1]).sub(V3(...P[0])), V3(...P[2]).sub(V3(...P[0]))).normalize();
  const Q = P.map(p => [p[0] - n.x * off, p[1] - n.y * off, p[2] - n.z * off]).reverse(), T = tris ? tris.map(t => t.map(k => P.length - 1 - k).reverse()) : null; poly(F, matB, Q, colB, T); }
const MESHES = [];
function flushBK(shadow = true) { for (const [mat, list] of BK) { let n = 0; for (const g of list) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3); let o = 0;
    for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); col.set(g.attributes.color.array, o * 3); o += c; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeBoundingSphere();
    const me = new THREE.Mesh(geo, mat); me.castShadow = shadow && mat !== MAT.glass && mat !== MAT.lace; me.receiveShadow = true; scene.add(me); MESHES.push(me); } BK.clear(); }

// ---------- walking: walls that stop you, floors and stairs that carry you ----------
const WALLS = [], FLOORS = [], SOLIDS = [];
function wallSeg(F, ax, az, bx, bz, y0, y1) { const a = toWorld(F, ax, 0, az), b = toWorld(F, bx, 0, bz); WALLS.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, y0: F.y + y0, y1: F.y + y1 }); }
// a floor: a rectangle in a frame, flat at y, or a ramp (a stair) rising from y to y2 along X or Z; holes are cut out of it
function floorRect(F, x0, z0, x1, z1, y, o = {}) { FLOORS.push({ F, x0, z0, x1, z1, y: F.y + y, y2: o.y2 !== undefined ? F.y + o.y2 : null, along: o.along || "x", holes: o.holes || [], c: Math.cos(F.ry), s: Math.sin(F.ry) }); }
function solidBox(F, x0, z0, x1, z1, y0, y1) { SOLIDS.push({ F, x0, z0, x1, z1, y0: F.y + y0, y1: F.y + y1, c: Math.cos(F.ry), s: Math.sin(F.ry) }); }
const toLocal = (R, x, z) => { const dx = x - R.F.x, dz = z - R.F.z; return [dx * R.c - dz * R.s, dx * R.s + dz * R.c]; };

// ---------- walls with openings ----------
// A straight wall in a frame from (ax, az) to (bx, bz), along X or along Z, from y0 to y1, thickness t. Its two faces get their own
// surfaces: P on the +Z side (a wall along X) or the +X side (a wall along Z), N on the other. Openings (doors and windows) lying on its
// line are cut out; doors leave a gap in the walls you bump into. Papered faces get a baseboard.
const OPS = [];
function op(line, at, c, w, b, h, o = {}) { const p = { line, at, c, w, b, h, ...o }; OPS.push(p); return p; }
function wallLine(F, ax, az, bx, bz, y0, y1, t, matP, colP, matN, colN, collide = true, base = true) {
  const alongX = Math.abs(az - bz) < 1e-6, at = alongX ? az : ax, s0 = alongX ? Math.min(ax, bx) : Math.min(az, bz), s1 = alongX ? Math.max(ax, bx) : Math.max(az, bz);
  const ops = OPS.filter(o => o.line === (alongX ? "z" : "x") && Math.abs(o.at - at) < 0.05 && o.c + o.w / 2 > s0 + 0.01 && o.c - o.w / 2 < s1 - 0.01 && (o.base || 0) + o.b < y1 - 0.01 && (o.base || 0) + o.b + o.h > y0 + 0.01).sort((p, q) => p.c - q.c);
  const piece = (a0, a1, yb, yt) => { if (a1 - a0 < 0.005 || yt - yb < 0.005) return; const mid = (a0 + a1) / 2, len = a1 - a0, h = yt - yb, yc = (yb + yt) / 2;
    for (const [mat, col, sg] of [[matP, colP, 1], [matN, colN, -1]]) { if (!mat) continue; const off = sg * t / 4;
      if (alongX) box(F, mat, mid, yc, at + off, len, h, t / 2, col); else box(F, mat, at + off, yc, mid, t / 2, h, len, col);
      if (base && yb <= y0 + 0.01 && mat !== MAT.clap && mat !== MAT.brick) { const bo = sg * (t / 2 + 0.008); if (alongX) box(F, MAT.plain, mid, y0 + 0.08, at + bo, len, 0.16, 0.016, 0x4a3420); else box(F, MAT.plain, at + bo, y0 + 0.08, mid, 0.016, 0.16, len, 0x4a3420); } } };
  let a = s0; const gaps = [];
  for (const o of ops) { const o0 = Math.max(s0, o.c - o.w / 2), o1 = Math.min(s1, o.c + o.w / 2), ob = clampN((o.base || 0) + o.b, y0, y1), ot = clampN((o.base || 0) + o.b + o.h, y0, y1); piece(a, o0, y0, y1); piece(o0, o1, y0, ob); piece(o0, o1, ot, y1); if (ob < y0 + 0.15) gaps.push([o0, o1]); a = o1; }
  piece(a, s1, y0, y1);
  if (collide) { let c0 = s0; for (const [g0, g1] of gaps) { if (g0 > c0 + 0.01) alongX ? wallSeg(F, c0, at, g0, at, y0, y1) : wallSeg(F, at, c0, at, g0, y0, y1); c0 = g1; } if (s1 > c0 + 0.01) alongX ? wallSeg(F, c0, at, s1, at, y0, y1) : wallSeg(F, at, c0, at, s1, y0, y1); } }
// a gable end (or a wall under a roof): full width up to the knee height, then narrowing to the peak; an opening cut out of it
function gable(F, line, at, a0, a1, yb, yk, yp, t, matP, colP, matN, colN, hole = null) {
  const mid = (a0 + a1) / 2, half = (a1 - a0) / 2, hw = y => y <= yk ? half : half * Math.max(0, (yp - y) / (yp - yk));
  const ys = [...new Set([yb, yk, yp, ...(hole ? [hole.y0, hole.y1] : [])])].filter(y => y >= yb && y <= yp).sort((p, q) => p - q);
  const P = (s, y, off) => line === "z" ? [s, y, at + off] : [at + off, y, s];
  const quad = (sa0, sa1, sb0, sb1, ya, yb2) => { for (const [mat, col, sg] of [[matP, colP, 1], [matN, colN, -1]]) { if (!mat) continue; const off = sg * t / 2;
      let Q = [P(sa0, ya, off), P(sa1, ya, off), P(sb1, yb2, off), P(sb0, yb2, off)]; if (sb1 - sb0 < 1e-4) Q = [Q[0], Q[1], Q[2]];
      const flip = (line === "z" ? sg > 0 : sg < 0); poly(F, mat, flip ? Q : Q.slice().reverse(), col); } };
  for (let k = 0; k < ys.length - 1; k++) { const ya = ys[k], yt = ys[k + 1], wa = hw(ya), wt = hw(yt);
    if (hole && ya >= hole.y0 - 1e-6 && yt <= hole.y1 + 1e-6) { quad(mid - wa, hole.c - hole.w / 2, mid - wt, hole.c - hole.w / 2, ya, yt); quad(hole.c + hole.w / 2, mid + wa, hole.c + hole.w / 2, mid + wt, ya, yt); }
    else quad(mid - wa, mid + wa, mid - wt, mid + wt, ya, yt); } }
// a window: casing inside and out, a moulded head and a sill outside, two sashes (two panes over two, the usual of the 1880s-1900s)
function windowAt(F, o, y0, t, trimC = 0xf2efe6, inC = 0x5a3a22) { const alongX = o.line === "z", W = o.w, H = o.h, yb = y0 + o.b, yc = yb + H / 2, sgOut = o.out || 1;
  const B = (c, y, n, sx, sy, sn, mat, col) => alongX ? box(F, mat, c, y, n, sx, sy, sn, col) : box(F, mat, n, y, c, sn, sy, sx, col);
  for (const sg of [1, -1]) { const n = o.at + sg * (t / 2 + 0.015), col = sg === sgOut ? trimC : inC;
    B(o.c - W / 2 - 0.05, yc, n, 0.1, H + 0.2, 0.03, MAT.plain, col); B(o.c + W / 2 + 0.05, yc, n, 0.1, H + 0.2, 0.03, MAT.plain, col); B(o.c, yb + H + 0.06, n, W + 0.2, 0.12, 0.03, MAT.plain, col); if (!o.door) B(o.c, yb - 0.04, n, W + 0.16, 0.08, 0.03, MAT.plain, col); }
  const no = o.at + sgOut * (t / 2 + 0.06); if (!o.int) { B(o.c, yb + H + 0.17, no, W + 0.34, 0.1, 0.1, MAT.plain, trimC); B(o.c, yb + H + 0.23, no, W + 0.4, 0.035, 0.14, MAT.plain, trimC); if (!o.door) B(o.c, yb - 0.03, no - sgOut * 0.02, W + 0.14, 0.04, 0.12, MAT.plain, trimC); }
  if (o.door) return;
  const sc = o.sashC || trimC; for (const [ya, yt] of [[yb, yb + H / 2], [yb + H / 2, yb + H]]) { const ym = (ya + yt) / 2, n = o.at + (ya === yb ? 0.02 : -0.02) * sgOut;
    B(o.c, ya + 0.025, n, W, 0.05, 0.04, MAT.plain, sc); B(o.c, yt - 0.025, n, W, 0.05, 0.04, MAT.plain, sc); B(o.c - W / 2 + 0.025, ym, n, 0.05, yt - ya, 0.04, MAT.plain, sc); B(o.c + W / 2 - 0.025, ym, n, 0.05, yt - ya, 0.04, MAT.plain, sc);
    B(o.c, ym, n, 0.025, yt - ya - 0.08, 0.03, MAT.plain, sc); B(o.c, ym, n, W - 0.08, yt - ya - 0.08, 0.006, MAT.glass, 0xffffff); } }
// a door leaf, standing open at a right angle into the room beside its hinge: four panels' worth of wood
function doorLeaf(F, o, y0, t, col = 0x6a4a2e, openTo = 1, hingeLeft = true) { const W = o.w - 0.04, H = o.h - 0.03, hx = o.c + (hingeLeft ? -1 : 1) * (o.w / 2 - 0.03), n = o.at + openTo * (t / 2 + W / 2);
  if (o.line === "z") box(F, MAT.plain, hx, y0 + H / 2, n, 0.045, H, W, col); else box(F, MAT.plain, n, y0 + H / 2, hx, W, H, 0.045, col); }

// ---------- 218 Etta Avenue ----------
// From the Sanborn: an L. The front-gabled wing, 17 ft 8 in wide and 29 ft 6 in deep, stands at the west side of the lot 11 ft back
// from the street; the side wing, 14 ft 5 in by 16 ft 6 in, sits east of it 13 ft further back, with the porch (one storey, 5 ft 5 in
// deep) in front of it in the corner of the L. 1 1/2 storeys: walls rise a metre above the upstairs floor and the steep roof does the
// rest (about 52 degrees, as the modern photographs show). Frame, narrow clapboards, light paint, turned porch columns (the 1914
// photograph). The rooms inside are a typical plan for this shape; no plan of the house survives.
const P218 = { WX: 5.4, SX: 9.75, D: 9.0, SZ: 3.96, PZ: 2.2, UP: 3.0, PL: 4.0, CE: 2.9, PITCH: 1.28 };
const EXT = 0xf2eee2, TRIM = 0xfbfaf6, SASH = 0x2e3a2c;
function build218(F) { const { WX, SX, D, SZ, PZ, UP, PL, CE, PITCH } = P218, T = 0.15, TI = 0.12, RW = PL + (WX / 2) * PITCH, RS = PL + ((D - SZ) / 2) * PITCH, ZR = (SZ + D) / 2;
  const clap = MAT.clap, gy = (X, Z) => { const w = toWorld(F, X, 0, Z); return ground(w.x, w.z) - F.y; };
  // the openings: ground-floor windows tall (5 ft 5 in), as in the 1914 photograph; the front door from the porch into the side wing
  const W = (line, at, c, out, o = {}) => op(line, at, c, o.w || 0.8, o.b ?? 0.72, o.h || 1.65, { out, sashC: SASH, ...o });
  W("z", 0, 1.45, -1); W("z", 0, 3.95, -1); W("x", 0, 3.45, -1); W("x", 0, 5.6, -1); W("x", 0, 7.9, -1, { b: 1.0, h: 1.2 }); W("x", WX, 1.1, 1); W("x", WX, 3.15, 1, { w: 0.72 });
  W("z", SZ, 6.55, -1); W("x", SX, 5.0, 1); W("x", SX, 7.8, 1); W("z", D, 3.6, 1, { b: 1.0, h: 1.2 }); W("z", D, 7.6, 1);
  const frontDoor = op("z", SZ, 8.65, 0.95, 0, 2.2, { door: true, out: -1 }), backDoor = op("z", D, 1.25, 0.86, 0, 2.1, { door: true, out: 1 });
  const dArch = op("z", 4.4, 2.7, 2.2, 0, 2.35, { door: true, int: true }), dKit = op("z", 6.8, 4.45, 0.8, 0, 2.05, { door: true, int: true }), dDin = op("x", WX, 4.95, 0.85, 0, 2.05, { door: true, int: true }),
    dBedK = op("x", WX, 7.95, 0.8, 0, 2.05, { door: true, int: true }), dBed = op("z", 6.6, 5.85, 0.75, 0, 2.0, { door: true, int: true });
  // foundation: brick, from the ground up to the sills (the lot falls toward the street, so the front stands higher)
  for (const [ax, az, bx, bz] of [[0, 0, WX, 0], [0, 0, 0, D], [WX, 0, WX, SZ], [WX, SZ, SX, SZ], [SX, SZ, SX, D], [0, D, SX, D]]) { const lo = Math.min(gy(ax, az), gy(bx, bz)) - 0.3, alongX = az === bz, len = alongX ? bx - ax : bz - az;
    alongX ? box(F, MAT.brick, (ax + bx) / 2, (lo - 0.1) / 2, az, len + T, -0.1 - lo, T + 0.02, 0xffffff) : box(F, MAT.brick, ax, (lo - 0.1) / 2, (az + bz) / 2, T + 0.02, -0.1 - lo, len + T, 0xffffff); }
  // outside walls, ground floor and the metre of wall above the upstairs floor; papers inside by room
  const pp = MAT.parlour, pd = MAT.dining, pk = MAT.plaster, ph = MAT.hall, pb = MAT.bed, pb2 = MAT.bed2, KC = 0xe2ead8;
  wallLine(F, 0, 0, WX, 0, -0.1, UP, T, pp, 0xffffff, clap, EXT);
  wallLine(F, 0, 0, 0, 4.4, -0.1, UP, T, pp, 0xffffff, clap, EXT); wallLine(F, 0, 4.4, 0, 6.8, -0.1, UP, T, pd, 0xffffff, clap, EXT); wallLine(F, 0, 6.8, 0, D, -0.1, UP, T, pk, KC, clap, EXT);
  wallLine(F, 0, 0, 0, 5.0, UP, PL, T, pb, 0xffffff, clap, EXT, true, false); wallLine(F, 0, 5.0, 0, D, UP, PL, T, pb2, 0xffffff, clap, EXT, true, false);
  wallLine(F, WX, 0, WX, SZ, -0.1, UP, T, clap, EXT, pp, 0xffffff); wallLine(F, WX, 0, WX, SZ, UP, PL, T, clap, EXT, pb, 0xffffff, true, false);
  wallLine(F, WX, SZ, SX, SZ, -0.1, UP, T, ph, 0xffffff, clap, EXT); wallLine(F, WX, SZ, SX, SZ, UP, PL, T, pb2, 0xffffff, clap, EXT, true, false);
  wallLine(F, SX, SZ, SX, 6.6, -0.1, UP, T, clap, EXT, ph, 0xffffff); wallLine(F, SX, 6.6, SX, D, -0.1, UP, T, clap, EXT, pb, 0xffffff);
  wallLine(F, 0, D, WX, D, -0.1, UP, T, clap, EXT, pk, KC); wallLine(F, WX, D, SX, D, -0.1, UP, T, clap, EXT, pb, 0xffffff); wallLine(F, WX, D, SX, D, UP, PL, T, clap, EXT, pb2, 0xffffff, true, false);
  // the gables, each with its upstairs window
  const gw = (line, at, c) => ({ c, w: 0.75, y0: UP + 0.55, y1: UP + 1.95, op: op(line, at, c, 0.75, 0.55, 1.4, { out: at === 0 ? -1 : 1, sashC: SASH, base: UP }) });
  const gF = gw("z", 0, WX / 2), gR = gw("z", D, WX / 2), gE = gw("x", SX, ZR);
  gable(F, "z", 0, 0, WX, UP, PL, RW, T, pb, 0xffffff, clap, EXT, gF); gable(F, "z", D, 0, WX, UP, PL, RW, T, clap, EXT, pb2, 0xffffff, gR); gable(F, "x", SX, SZ, D, UP, PL, RS, T, clap, EXT, pb2, 0xffffff, gE);
  for (const o of OPS) if (!o.door && !o.int) windowAt(F, o, o.base || 0, T, TRIM);
  windowAt(F, frontDoor, 0, T, TRIM); windowAt(F, backDoor, 0, T, TRIM);
  // inside walls, ground floor
  wallLine(F, 0, 4.4, WX, 4.4, 0, CE, TI, pd, 0xffffff, pp, 0xffffff); wallLine(F, 0, 6.8, WX, 6.8, 0, CE, TI, pk, KC, pd, 0xffffff);
  wallLine(F, WX, SZ, WX, 4.4, 0, CE, TI, ph, 0xffffff, pp, 0xffffff); wallLine(F, WX, 4.4, WX, 6.6, 0, CE, TI, ph, 0xffffff, pd, 0xffffff); wallLine(F, WX, 6.6, WX, 6.8, 0, CE, TI, pb, 0xffffff, pd, 0xffffff); wallLine(F, WX, 6.8, WX, D, 0, CE, TI, pb, 0xffffff, pk, KC);
  wallLine(F, WX, 6.6, SX, 6.6, 0, CE, TI, pb, 0xffffff, ph, 0xffffff);
  for (const o of [dArch, dKit, dDin, dBedK, dBed]) windowAt(F, o, 0, TI, 0x5a3a22, 0x5a3a22);
  doorLeaf(F, frontDoor, 0, T, 0x5a3a24, 1, false); doorLeaf(F, backDoor, 0, T, 0x7a6a50, -1, true); doorLeaf(F, dKit, 0, TI, 0x6a4a2e, 1, false); doorLeaf(F, dDin, 0, TI, 0x6a4a2e, -1, true); doorLeaf(F, dBedK, 0, TI, 0x6a4a2e, 1, false); doorLeaf(F, dBed, 0, TI, 0x6a4a2e, 1, true);
  // upstairs: the partition across the wing and the wall between the wing and the side wing, shaped to the roofs, with doorways
  const dUp1 = { c: 3.8, w: 0.8, y0: UP, y1: UP + 2.0 }, dUp2 = { c: 6.1, w: 0.8, y0: UP, y1: UP + 2.02 };
  gable(F, "z", 5.0, 0, WX, UP, PL, RW - 0.16, TI, pb2, 0xffffff, pb, 0xffffff, dUp1); gable(F, "x", WX, SZ, D, UP, PL, RS - 0.16, TI, pb2, 0xffffff, pb2, 0xffffff, dUp2);
  wallSeg(F, 0, 5.0, 3.4, 5.0, UP, PL + 2); wallSeg(F, 4.2, 5.0, WX, 5.0, UP, PL + 2); wallSeg(F, WX, SZ, WX, 5.7, UP, PL + 2); wallSeg(F, WX, 6.5, WX, D, UP, PL + 2);
  // where the roof comes down too low to stand, you stop
  wallSeg(F, 0.55, 0, 0.55, D, UP, UP + 1.5); wallSeg(F, WX - 0.55, 0, WX - 0.55, 4.3, UP, UP + 1.5); wallSeg(F, WX, 4.35, SX, 4.35, UP, UP + 1.5); wallSeg(F, WX, 8.6, SX, 8.6, UP, UP + 1.5);
  // floors and ceilings: boards underfoot, plaster overhead
  box(F, MAT.board, WX / 2, -0.03, D / 2, WX, 0.06, D, 0xffffff); box(F, MAT.board, (WX + SX) / 2, -0.03, (SZ + D) / 2, SX - WX, 0.06, D - SZ, 0xffffff);
  const slab = (x0, z0, x1, z1) => { box(F, MAT.plaster, (x0 + x1) / 2, CE + 0.02, (z0 + z1) / 2, x1 - x0, 0.04, z1 - z0, 0xf4f0e6); box(F, MAT.board, (x0 + x1) / 2, UP - 0.03, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, 0xe8dcc8); };
  slab(0, 0, WX, D); slab(WX, SZ, SX, 5.7); slab(WX, 6.55, SX, D); slab(WX, 5.7, 6.3, 6.55); slab(9.5, 5.7, SX, 6.55);
  floorRect(F, 0, 0, WX, D, 0); floorRect(F, WX, SZ, SX, D, 0); floorRect(F, 0, 0, WX, D, UP); floorRect(F, WX, SZ, SX, D, UP, { holes: [[6.3, 5.7, 9.5, 6.55]] });
  // the stair: up the side wing along the bedroom wall, fifteen steps of 8 in, rising toward the wing; a turned newel and balusters
  for (let k = 0; k < 15; k++) { const x = 9.5 - (k + 1) * 3.2 / 15, y = (k + 1) * UP / 15; box(F, MAT.board, x + 0.107, y - 0.02, 6.125, 0.24, 0.04, 0.85, 0xc8a878); box(F, MAT.plain, x + 0.213, y - 0.1, 6.125, 0.02, 0.2, 0.85, 0x6a4a2e); }
  for (const z of [5.71, 6.54]) box(F, MAT.plain, 7.9, UP / 2 - 0.15, z, Math.hypot(3.2, UP), 0.25, 0.04, 0x5a3a22, 0, 0, Math.atan2(UP, 3.2));
  floorRect(F, 6.3, 5.7, 9.5, 6.55, UP, { y2: 0, along: "x" }); wallSeg(F, 6.3, 5.69, 9.3, 5.69, 0, UP + 1.0); wallSeg(F, 6.3, 6.56, 9.5, 6.56, UP - 0.2, UP + 1.0); wallSeg(F, 9.5, 5.7, 9.5, 6.56, UP - 0.2, UP + 1.0);
  lathe(F, MAT.plain, 9.42, 0, 5.66, [[0.06, 0], [0.06, 0.9], [0.045, 0.95], [0.06, 1.0], [0.04, 1.05], [0.05, 1.12], [0, 1.16]], 0x4a2e1a, 8);
  for (let k = 0; k < 14; k++) { const x = 9.3 - k * 0.22, y = (9.5 - x) / 3.2 * UP; cyl(F, MAT.plain, x, y + 0.45, 5.66, 0.016, 0.016, 0.9, 0x4a2e1a, 6); }
  box(F, MAT.plain, 7.85, UP / 2 + 0.8, 5.66, Math.hypot(3.2, UP), 0.06, 0.07, 0x4a2e1a, 0, 0, Math.atan2(UP, 3.2));
  for (const [x0, z0, x1, z1] of [[6.3, 5.66, 9.5, 5.66], [6.3, 6.59, 9.5, 6.59], [9.54, 5.66, 9.54, 6.59]]) { const len = Math.hypot(x1 - x0, z1 - z0), alongX = z0 === z1;
    box(F, MAT.plain, (x0 + x1) / 2, UP + 0.86, (z0 + z1) / 2, alongX ? len : 0.06, 0.06, alongX ? 0.06 : len, 0x4a2e1a); for (let s = 0; s <= len / 0.12; s++) cyl(F, MAT.plain, alongX ? x0 + s * 0.12 : x0, UP + 0.43, alongX ? z0 : z0 + s * 0.12, 0.015, 0.015, 0.86, 0x4a2e1a, 6); }
  // the roofs: wood shingles over, plaster under (upstairs rooms), the wing's slopes cut where the side wing's roof runs into them
  const yW = X => RW - Math.abs(X - WX / 2) * PITCH, yS = Z => RS - Math.abs(Z - ZR) * PITCH, XV = WX / 2 + (RW - RS) / PITCH;
  const R = (P, tris = null) => { let n = 0; for (const t of tris || P.slice(1, -1).map((_, i) => [0, i + 1, i + 2])) { const [a, b, c] = t.map(k => V3(...P[k])); n += new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).y; }
    if (n < 0) { P = P.slice().reverse(); if (tris) tris = tris.map(t => t.map(k => P.length - 1 - k).reverse()); } poly2(F, MAT.shingle, MAT.plaster, P, 0xffffff, 0xf0ece2, 0.14, tris); };
  const wP = (X, Z) => [X, yW(X), Z], sP = (X, Z) => [X, yS(Z), Z], O = 0.3;
  R([wP(-O, D + 0.25), wP(-O, -0.25), wP(WX / 2, -0.25), wP(WX / 2, D + 0.25)]);
  R([wP(WX / 2, -0.25), wP(WX + O, -0.25), wP(WX + O, SZ - O), wP(WX, SZ), wP(XV, ZR), wP(WX / 2, ZR)], [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]]);
  R([wP(WX / 2, ZR), wP(XV, ZR), wP(WX, D), wP(WX + O, D + 0.25), wP(WX / 2, D + 0.25)], [[0, 1, 2], [0, 2, 3], [0, 3, 4]]);
  R([sP(XV, ZR), sP(WX, SZ), sP(SX + O, SZ), sP(SX + O, ZR)].map(p => [p[0], yS(p[2]), p[2]]).reverse());
  R([sP(XV, ZR), sP(SX + O, ZR), sP(SX + O, D), sP(WX, D)].map(p => [p[0], yS(p[2]), p[2]]).reverse());
  R([[WX + O, yS(SZ - O), SZ - O], [SX + O, yS(SZ - O), SZ - O], [SX + O, yS(SZ), SZ], [WX + O, yS(SZ), SZ]].map(p => [p[0], PL - O * PITCH + (p[2] - (SZ - O)) * PITCH, p[2]]).reverse());
  R([[WX + O, PL, D], [SX + O, PL, D], [SX + O, PL - O * PITCH, D + O], [WX + O, PL - O * PITCH, D + O]].reverse());
  // gable trim: a fascia up each rake with a scalloped bargeboard below it (the modern photographs show scalloped gable trim)
  const rake = (a, b) => { const A = V3(...a), B = V3(...b), d = B.clone().sub(A), len = d.length(), mid = A.clone().add(B).multiplyScalar(0.5);
    const ang = Math.atan2(d.y, Math.hypot(d.x, d.z)), yaw = Math.atan2(-d.z, d.x); box(F, MAT.plain, mid.x, mid.y - 0.05, mid.z, len, 0.2, 0.04, TRIM, 0, yaw, ang);
    for (let s = 0.15; s < len - 0.1; s += 0.17) { const p = A.clone().add(d.clone().multiplyScalar(s / len)); cyl(F, MAT.plain, p.x, p.y - 0.2, p.z, 0.075, 0.075, 0.03, TRIM, 10, Math.abs(d.x) > Math.abs(d.z) ? Math.PI / 2 : 0, Math.abs(d.x) > Math.abs(d.z) ? 0 : Math.PI / 2); } };
  for (const z of [-0.25, D + 0.25]) { rake([-O, yW(-O), z], [WX / 2, RW + 0.02, z]); rake([WX / 2, RW + 0.02, z], [WX + O, yW(WX + O), z]); }
  rake([SX + O, yS(SZ - O), SZ - O], [SX + O, RS + 0.02, ZR]); rake([SX + O, RS + 0.02, ZR], [SX + O, yS(D + O), D + O]);
  for (const [x, z] of [[0, 0], [WX, 0], [0, D], [SX, D], [SX, SZ], [WX, SZ]]) box(F, MAT.plain, x, 1.95, z, 0.2, 4.1, 0.2, TRIM);
  // chimneys: brick, one through the ridge (kitchen range and dining stove) and one at the side wing's back (the bedroom); corbelled tops
  const chim = (x, z, y0, y1) => { box(F, MAT.brick, x, (y0 + y1) / 2, z, 0.5, y1 - y0, 0.5, 0xffffff); box(F, MAT.brick, x, y1 + 0.05, z, 0.62, 0.1, 0.62, 0xffffff); box(F, MAT.brick, x, y1 + 0.16, z, 0.54, 0.12, 0.54, 0xffffff); box(F, MAT.plain, x, y1 + 0.23, z, 0.3, 0.03, 0.3, 0x1a1a1a); };
  chim(WX / 2, 6.8, -0.8, RW + 0.9); chim(8.9, 8.7, 2.2, RS + 0.4);
  // the porch: grey-painted boards, three steps, turned columns with groups of rings (the 1914 photograph), a shed roof, a beaded ceiling
  box(F, MAT.board, (WX + SX) / 2, -0.08, (PZ + SZ) / 2, SX - WX, 0.06, SZ - PZ, 0x9a9890); floorRect(F, WX, PZ, SX, SZ, -0.05);
  const fy = gy(7.6, PZ - 0.9); for (let k = 0; k < 3; k++) { const y = -0.1 + (k + 1) * (fy + 0.1) / 3.4; box(F, MAT.board, 7.6, y - 0.05, PZ - 0.15 - k * 0.28, 1.6, 0.06, 0.3, 0x9a9890); box(F, MAT.plain, 7.6, (y + fy) / 2 - 0.05, PZ - 0.15 - k * 0.28, 1.6, Math.max(0.05, y - fy), 0.3, 0x8a8880); }
  floorRect(F, 6.8, PZ - 1.0, 8.4, PZ, fy + 0.02, { y2: -0.05, along: "z" });
  box(F, MAT.plank, (WX + SX) / 2, (-0.1 + Math.min(gy(WX, PZ), gy(SX, PZ))) / 2, PZ + 0.02, SX - WX, -0.1 - Math.min(gy(WX, PZ), gy(SX, PZ)) + 0.1, 0.03, 0xd8d4c8);
  const col = [[0, 0.11], [0.05, 0.1], [0.08, 0.075], [0.25, 0.075], [0.27, 0.09], [0.29, 0.075], [0.31, 0.09], [0.33, 0.075], [0.7, 0.08], [0.72, 0.095], [0.74, 0.08], [0.76, 0.095], [0.78, 0.08], [1.55, 0.085], [1.57, 0.1], [1.59, 0.085], [1.61, 0.1], [1.63, 0.085], [2.2, 0.075], [2.24, 0.1], [2.32, 0.11], [2.36, 0]];
  for (const x of [WX + 0.2, 7.6, SX - 0.15]) { lathe(F, MAT.plain, x, -0.05, PZ + 0.15, col.map(([y, r]) => [r, y]), TRIM, 12); }
  box(F, MAT.plain, (WX + SX) / 2, 2.42, PZ + 0.15, SX - WX + 0.1, 0.16, 0.14, TRIM);
  const pr = [[WX, 2.95, SZ], [SX + 0.15, 2.95, SZ], [SX + 0.15, 2.5, PZ - 0.25], [WX, 2.5, PZ - 0.25]]; poly2(F, MAT.shingle, MAT.plank, pr.slice().reverse(), 0xffffff, 0xe8e6de, 0.08);
  box(F, MAT.plain, (WX + SX) / 2 + 0.07, 2.47, PZ - 0.25, SX - WX + 0.2, 0.14, 0.04, TRIM); box(F, MAT.plain, SX + 0.15, 2.7, (PZ + SZ) / 2 - 0.12, 0.04, 0.5, SZ - PZ + 0.25, TRIM);
  // a step at the back door, and the kitchen's rain gutter and downspout to the cistern
  const by = gy(1.25, D + 0.6); box(F, MAT.plank, 1.25, (by - 0.1) / 2, D + 0.45, 1.1, Math.max(0.1, -0.1 - by), 0.7, 0x8a7a62); floorRect(F, 0.7, D, 1.8, D + 0.8, Math.max(by, -0.12));
  cyl(F, MAT.iron, -0.05, 1.8, D + 0.05, 0.04, 0.04, 3.9, 0x8a8a84, 8);
  // the walls you bump into outside: the house's outline, the porch's open front between its columns
  wallSeg(F, WX, PZ, WX, SZ, -0.06, 3); wallSeg(F, SX, PZ, SX, SZ, -0.06, 3); wallSeg(F, WX, PZ, 6.8, PZ, -0.06, 3); wallSeg(F, 8.4, PZ, SX, PZ, -0.06, 3); }

// ---------- inside 218: the furniture ----------
// The parlour after the family's photographs: dark flowered paper, framed pictures (a large one of a woman, perhaps a holy picture),
// an ornate dark-framed mirror, an upholstered settee, a dark dresser with a light marble top and a pair of horn-shaped vases with a
// crocheted doily. The rest is typical of a German Catholic working family's cottage in 1910: a cast-iron range, an icebox, a
// treadle sewing machine, iron beds, a washstand with pitcher and bowl, holy pictures and a crucifix, kerosene lamps (no electricity
// out here yet), no bathroom (the privy is out back, water from the cistern pump by the kitchen door). Heating stoves are put away
// for the summer.
const PICS = [];
function picture(F, x, y, z, w, h, ry, draw, frameC = 0x3a2416) { const t = tex(128, Math.round(128 * h / w), draw); const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
  const p = toWorld(F, x, y, z); me.position.copy(p); me.rotation.y = F.ry + ry; scene.add(me); PICS.push(me); const n = V3(Math.sin(ry), 0, Math.cos(ry));
  box(F, MAT.plain, x - n.x * 0.026, y, z - n.z * 0.026, Math.abs(n.z) > 0.5 ? w + 0.08 : 0.03, h + 0.08, Math.abs(n.z) > 0.5 ? 0.03 : w + 0.08, frameC); }
const drawSacredHeart = (g, w, h) => { g.fillStyle = "#2a2a4a"; g.fillRect(0, 0, w, h); const r = g.createRadialGradient(w / 2, h * 0.35, 4, w / 2, h * 0.35, w * 0.6); r.addColorStop(0, "#f8e8b0"); r.addColorStop(1, "rgba(60,50,80,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h);
  g.fillStyle = "#e8c8a0"; g.beginPath(); g.ellipse(w / 2, h * 0.3, w * 0.13, w * 0.17, 0, 0, 7); g.fill(); g.fillStyle = "#5a3a22"; g.beginPath(); g.ellipse(w / 2, h * 0.24, w * 0.16, w * 0.13, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#b02a2a"; g.beginPath(); g.moveTo(w * 0.28, h); g.lineTo(w * 0.33, h * 0.45); g.lineTo(w * 0.67, h * 0.45); g.lineTo(w * 0.72, h); g.fill(); g.fillStyle = "#e8e2d0"; g.fillRect(w * 0.44, h * 0.45, w * 0.12, h * 0.55);
  g.fillStyle = "#d82020"; g.beginPath(); g.arc(w * 0.47, h * 0.58, 5, 0, 7); g.arc(w * 0.53, h * 0.58, 5, 0, 7); g.fill(); g.fillStyle = "#f8d040"; g.fillRect(w * 0.49, h * 0.5, 2, 8); };
const drawPortrait = (g, w, h) => { g.fillStyle = "#c8b490"; g.fillRect(0, 0, w, h); g.fillStyle = "#a89070"; g.fillRect(6, 6, w - 12, h - 12); for (const [x, s] of [[0.35, 1], [0.65, 1]]) { g.fillStyle = "#3a2a1c"; g.beginPath(); g.ellipse(w * x, h * 0.75, w * 0.15, h * 0.3, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#d8c0a0"; g.beginPath(); g.ellipse(w * x, h * 0.36, w * 0.07, h * 0.09, 0, 0, 7); g.fill(); g.fillStyle = "#2a1c12"; g.beginPath(); g.ellipse(w * x, h * 0.29, w * 0.075, h * 0.05, 0, Math.PI, 0); g.fill(); } g.fillStyle = "#f0e8d8"; g.fillRect(w * 0.6, h * 0.5, w * 0.1, h * 0.4); };
const drawMotto = (g, w, h) => { g.fillStyle = "#efe6d0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a2a2a"; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = "#2a3a6a"; g.font = "bold 15px Georgia"; g.textAlign = "center";
  g.fillText("Gott segne", w / 2, h * 0.45); g.fillText("unser Heim", w / 2, h * 0.72); g.fillStyle = "#3a7a3a"; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(14 + k * 20, h - 12, 3, 0, 7); g.fill(); } };
const drawCalendar = (g, w, h) => { g.fillStyle = "#f4efe4"; g.fillRect(0, 0, w, h); g.fillStyle = "#6a8aa8"; g.fillRect(6, 6, w - 12, h * 0.45); g.fillStyle = "#e8d8b0"; g.beginPath(); g.ellipse(w / 2, h * 0.3, 20, 24, 0, 0, 7); g.fill();
  g.fillStyle = "#8a1a1a"; g.font = "bold 13px Georgia"; g.textAlign = "center"; g.fillText("JUNE 1910", w / 2, h * 0.58); g.fillStyle = "#222"; g.font = "8px sans-serif"; for (let d = 0; d < 30; d++) g.fillText(String(d + 1), 14 + ((d + 3) % 7) * 16, h * 0.66 + Math.floor((d + 3) / 7) * 12); };
const drawLandscape = (g, w, h) => { const s = g.createLinearGradient(0, 0, 0, h); s.addColorStop(0, "#8aa0b0"); s.addColorStop(0.6, "#d8c8a0"); s.addColorStop(1, "#5a6a3a"); g.fillStyle = s; g.fillRect(0, 0, w, h); g.fillStyle = "#3a4a2a"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(10 + k * 28, h * 0.62, 14, 0, 7); g.fill(); } };
function chairB(F, x, z, ry, col = 0x4a2e1a) { const c = Math.cos(ry), s = Math.sin(ry), L = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.17, 0.17], [0.17, 0.17]]) { const [px, pz] = L(dx, dz); cyl(F, MAT.plain, px, 0.22, pz, 0.014, 0.016, 0.44, col, 6); }
  const [cx, cz] = L(0, 0); cyl(F, MAT.plain, cx, 0.45, cz, 0.21, 0.21, 0.03, col, 12); const [bx, bz] = L(0, 0.19); box(F, MAT.plain, bx, 0.72, bz, 0.4, 0.5, 0.025, col, 0, ry, 0); }
function bedIron(F, x, z, w, l, ry, quilt = 0xe8e0d0, col = 0x2a2a2e) { const c = Math.cos(ry), s = Math.sin(ry), L = (dx, dz) => [x + dx * c + dz * s, z - dx * s + dz * c];
  const [cx, cz] = L(0, l / 2); box(F, MAT.cloth, cx, 0.5, cz, w, 0.2, l, 0xf0ece4, 0, ry, 0); box(F, MAT.cloth, cx, 0.62, cz + 0.0, w + 0.04, 0.05, l * 0.8, quilt, 0, ry, 0); const [px, pz] = L(0, 0.22); box(F, MAT.cloth, px, 0.66, pz, w * 0.85, 0.12, 0.35, 0xfaf8f2, 0, ry, 0);
  for (const [dz, hh] of [[0, 1.25], [l, 0.9]]) { for (const dx of [-w / 2, w / 2]) { const [qx, qz] = L(dx, dz); cyl(F, MAT.iron, qx, hh / 2, qz, 0.022, 0.022, hh, col, 6); } const [rx, rz] = L(0, dz); box(F, MAT.iron, rx, hh - 0.03, rz, w, 0.03, 0.03, col, 0, ry, 0); box(F, MAT.iron, rx, 0.42, rz, w, 0.03, 0.03, col, 0, ry, 0);
    for (let k = 1; k < 6; k++) { const [vx, vz] = L(-w / 2 + k * w / 6, dz); cyl(F, MAT.iron, vx, (hh + 0.42) / 2, vz, 0.01, 0.01, hh - 0.42, col, 5); } } }
function table(F, x, z, w, d, h, top = 0x7a5232, cloth = null) { box(F, MAT.plain, x, h - 0.02, z, w, 0.04, d, top); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(F, MAT.plain, x + sx * (w / 2 - 0.05), (h - 0.04) / 2, z + sz * (d / 2 - 0.05), 0.05, h - 0.04, 0.05, top);
  if (cloth) box(F, cloth === "oil" ? MAT.oil : MAT.cloth, x, h + 0.003, z, w + 0.12, 0.006, d + 0.12, cloth === "oil" ? 0xffffff : cloth); }
function lamp(F, x, y, z) { lathe(F, MAT.glass, x, y, z, [[0.06, 0], [0.07, 0.05], [0.05, 0.12], [0.02, 0.14], [0.03, 0.17], [0.035, 0.22], [0.02, 0.32]], 0xffffff, 10); lathe(F, MAT.plain, x, y, z, [[0.065, 0], [0.07, 0.03], [0.055, 0.1], [0.02, 0.13]], 0x6a8a5a, 10); }
const LAMPS = [];
function furnish218(F) { const { WX, SX, D, SZ, UP } = P218;
  // parlour
  box(F, MAT.rug, 2.7, 0.006, 2.2, 3.2, 0.012, 2.6, 0xffffff);
  box(F, MAT.cloth, 0.42, 0.25, 1.6, 0.6, 0.5, 1.7, 0x5a2a30); box(F, MAT.cloth, 0.17, 0.72, 1.6, 0.16, 0.6, 1.7, 0x5a2a30); for (const z of [0.78, 2.42]) box(F, MAT.cloth, 0.42, 0.55, z, 0.62, 0.22, 0.1, 0x4a2228);
  for (const z of [0.82, 2.38]) for (const x of [0.2, 0.66]) cyl(F, MAT.plain, x, 0.06, z, 0.025, 0.02, 0.12, 0x3a2416, 6);
  cyl(F, MAT.plain, 2.6, 0.74, 2.1, 0.45, 0.45, 0.04, 0x5a3420, 20); cyl(F, MAT.plain, 2.6, 0.37, 2.1, 0.05, 0.12, 0.7, 0x5a3420, 8); cyl(F, MAT.cloth, 2.6, 0.765, 2.1, 0.3, 0.3, 0.006, 0xf6f2e6, 16); lamp(F, 2.6, 0.77, 2.1); LAMPS.push([F, 2.6, 1.1, 2.1]);
  box(F, MAT.plain, 2.35, 0.8, 2.25, 0.18, 0.06, 0.24, 0x2a1a12);
  chairB(F, 1.4, 1.0, 0.6, 0x3a2416); chairB(F, 4.1, 1.7, -0.9, 0x3a2416);
  { const x = 4.95, z = 2.12; box(F, MAT.plain, x, 0.42, z, 0.48, 0.84, 0.95, 0x3a2214); box(F, MAT.plain, x, 0.86, z, 0.5, 0.04, 0.98, 0xe8e4dc); for (const y of [0.22, 0.5, 0.72]) box(F, MAT.plain, x - 0.245, y, z, 0.01, 0.2, 0.85, 0x2a180e);
    box(F, MAT.cloth, x, 0.885, z, 0.3, 0.004, 0.5, 0xf6f2e6); for (const dz of [-0.28, 0.28]) { lathe(F, MAT.plain, x, 0.88, z + dz, [[0.04, 0], [0.025, 0.04], [0.02, 0.15], [0.05, 0.24]], 0xe8e0c8, 10); }
    box(F, MAT.plain, x + 0.22, 1.75, z, 0.04, 1.2, 0.8, 0x2a180e); box(F, MAT.plain, x + 0.19, 1.75, z, 0.012, 1.0, 0.62, 0xb8c4c8); box(F, MAT.plain, x + 0.2, 2.42, z, 0.06, 0.18, 0.95, 0x2a180e); }
  picture(F, 0.09, 1.85, 1.6, 0.62, 0.82, Math.PI / 2, drawSacredHeart, 0x8a6a2a); picture(F, 2.7, 1.85, 0.09, 0.5, 0.62, 0, drawPortrait); picture(F, 0.09, 1.75, 2.75, 0.26, 0.34, Math.PI / 2, drawPortrait);
  picture(F, 4.3, 1.6, 4.32, 0.36, 0.28, Math.PI, drawLandscape); box(F, MAT.plain, 1.2, 1.9, 4.33, 0.04, 0.32, 0.02, 0x3a2416); box(F, MAT.plain, 1.2, 1.97, 4.33, 0.2, 0.035, 0.02, 0x3a2416);
  for (const c of [1.45, 3.95]) box(F, MAT.lace, c, 1.55, 0.12, 0.95, 1.85, 0.01, 0xffffff);
  lathe(F, MAT.plain, 0.5, 0, 3.0, [[0.12, 0], [0.04, 0.05], [0.04, 0.7], [0.15, 0.75], [0.16, 0.8]], 0x3a2416, 10); for (let k = 0; k < 9; k++) { const a = k * 0.7; box(F, MAT.cloth, 0.5 + Math.cos(a) * 0.12, 0.9, 3.0 + Math.sin(a) * 0.12, 0.32, 0.02, 0.07, 0x3a6a2a, 0.6, -a, 0); }
  // the entry room: the stair, the hall tree, the sewing machine under the front window, a chair, the house blessing
  for (let k = 0; k < 3; k++) box(F, MAT.plain, 9.55, 1.7, 4.2 + k * 0.08, 0.06, 0.06, 0.06, 0x2a2a2a); cyl(F, MAT.plain, 9.45, 0.95, 4.35, 0.03, 0.03, 1.9, 0x3a2416, 6); box(F, MAT.cloth, 9.45, 1.68, 4.35, 0.08, 0.6, 0.35, 0x2a2a30); cyl(F, MAT.plain, 9.42, 1.92, 4.35, 0.12, 0.12, 0.02, 0x2a2a2a, 12); cyl(F, MAT.plain, 9.42, 1.97, 4.35, 0.07, 0.07, 0.1, 0x2a2a2a, 12);
  { const x = 6.55, z = 4.32; box(F, MAT.plain, x, 0.74, z, 0.95, 0.04, 0.45, 0x5a3420); box(F, MAT.iron, x, 0.38, z, 0.85, 0.7, 0.05, 0x2a2a2a); box(F, MAT.iron, x, 0.09, z + 0.05, 0.4, 0.04, 0.3, 0x2a2a2a); box(F, MAT.iron, x + 0.1, 0.88, z, 0.4, 0.22, 0.09, 0x1a1a1a); box(F, MAT.iron, x - 0.12, 1.0, z, 0.08, 0.12, 0.09, 0x1a1a1a); }
  chairB(F, 7.3, 5.0, 2.6); picture(F, 7.6, 1.8, SZ + 0.09, 0.44, 0.3, 0, drawMotto, 0x5a3a22);
  // dining room: the table and chairs, the sideboard, the clock and calendar, the crucifix and holy-water font
  table(F, 2.5, 5.65, 1.8, 1.0, 0.76, 0x6a4628, 0xf4f0e6); for (const [x, z, r] of [[1.9, 5.0, 0], [2.6, 5.0, 0], [3.3, 5.0, 0], [1.9, 6.3, Math.PI], [2.6, 6.3, Math.PI], [3.3, 6.3, Math.PI], [1.35, 5.65, Math.PI / 2]]) chairB(F, x, z, r);
  { const x = 5.13, z = 6.1; box(F, MAT.plain, x, 0.47, z, 0.48, 0.94, 1.2, 0x5a3420); box(F, MAT.plain, x + 0.12, 1.5, z, 0.22, 1.1, 1.2, 0x5a3420); box(F, MAT.plain, x - 0.25, 0.47, z, 0.01, 0.7, 1.0, 0x4a2a18); for (let k = 0; k < 4; k++) cyl(F, MAT.plain, x + 0.06, 1.22 + (k % 2) * 0.35, z - 0.4 + k * 0.27, 0.11, 0.11, 0.02, 0xf2eee4, 14, 0, Math.PI / 2); }
  box(F, MAT.plain, 0.12, 2.0, 5.0, 0.12, 0.7, 0.36, 0x5a3420); cyl(F, MAT.plain, 0.19, 2.15, 5.0, 0.12, 0.12, 0.02, 0xf4f0e0, 16, 0, Math.PI / 2); cyl(F, MAT.iron, 0.18, 1.82, 5.0, 0.05, 0.05, 0.01, 0xc8a040, 10, 0, Math.PI / 2);
  picture(F, 0.09, 1.55, 6.35, 0.28, 0.4, Math.PI / 2, drawCalendar, 0x8a7a6a); box(F, MAT.plain, 2.7, 2.0, 4.48, 0.04, 0.4, 0.03, 0x3a2416); box(F, MAT.plain, 2.7, 2.1, 4.48, 0.24, 0.04, 0.03, 0x3a2416); box(F, MAT.plain, 3.62, 1.5, 4.48, 0.08, 0.12, 0.05, 0xd8d4cc);
  // kitchen: the range against the chimney, the work table with the bread (he is a baker), the dry sink and water pail, the cupboard, the icebox
  { const x = WX / 2, z = 7.45; box(F, MAT.iron, x, 0.42, z, 1.1, 0.8, 0.68, 0x1e1e20); box(F, MAT.iron, x, 0.83, z, 1.14, 0.03, 0.72, 0x2a2a2c); box(F, MAT.iron, x, 1.35, z - 0.25, 1.1, 0.4, 0.22, 0x1e1e20); for (const dx of [-0.3, 0, 0.3]) for (const dz of [-0.12, 0.15]) cyl(F, MAT.iron, x + dx, 0.85, z + dz, 0.1, 0.1, 0.01, 0x3a3a3c, 12);
    box(F, MAT.plain, x - 0.25, 0.4, z + 0.345, 0.4, 0.34, 0.01, 0x6a6a6e); box(F, MAT.plain, x + 0.25, 0.4, z + 0.345, 0.4, 0.34, 0.01, 0x6a6a6e); cyl(F, MAT.iron, x + 0.4, 1.7, z - 0.2, 0.07, 0.07, 0.9, 0x2a2a2c, 10); cyl(F, MAT.iron, x + 0.4, 2.1, z - 0.42, 0.07, 0.07, 0.45, 0x2a2a2c, 10, Math.PI / 2, 0);
    cyl(F, MAT.iron, x - 0.25, 0.94, z + 0.1, 0.12, 0.12, 0.18, 0x4a4a4e, 14); cyl(F, MAT.iron, x + 0.2, 0.92, z - 0.05, 0.1, 0.09, 0.14, 0x3a5a7a, 12); box(F, MAT.plain, x + 0.85, 0.3, z, 0.4, 0.6, 0.4, 0x6a4a2a); box(F, MAT.plain, x + 0.85, 0.62, z, 0.36, 0.06, 0.36, 0x2a2a2a); }
  table(F, 3.7, 8.35, 1.3, 0.75, 0.78, 0xb8946a); for (let k = 0; k < 5; k++) box(F, MAT.cloth, 3.3 + k * 0.18, 0.84, 8.3 + (k % 2) * 0.08, 0.15, 0.09, 0.28, 0xb87838); cyl(F, MAT.plain, 4.05, 0.86, 8.4, 0.22, 0.17, 0.14, 0xd8d4c8, 14);
  box(F, MAT.cloth, 4.7, 0.3, 8.6, 0.4, 0.6, 0.3, 0xe8e0c8); chairB(F, 3.4, 8.85, Math.PI);
  { const x = 0.32, z = 7.9; box(F, MAT.plain, x, 0.42, z, 0.5, 0.84, 1.05, 0x8a7050); box(F, MAT.plain, x, 0.87, z, 0.52, 0.06, 1.07, 0x6a5038); cyl(F, MAT.iron, x + 0.02, 0.99, z - 0.2, 0.15, 0.13, 0.22, 0xa8a8a0, 14); cyl(F, MAT.iron, x + 0.02, 0.93, z + 0.25, 0.22, 0.2, 0.1, 0xe8e8e4, 16); }
  { const x = 0.95, z = 7.06; box(F, MAT.plain, x, 1.05, z, 1.0, 2.1, 0.42, 0xd8d0b0); box(F, MAT.glass, x, 1.55, z + 0.215, 0.8, 0.9, 0.01, 0xffffff); for (let k = 0; k < 6; k++) cyl(F, MAT.plain, x - 0.35 + k * 0.14, 1.75, z + 0.1, 0.06, 0.06, 0.01, 0xf2eee4, 12, Math.PI / 2 - 0.2, 0); }
  { const x = 5.0, z = 7.08; box(F, MAT.plain, x, 0.6, z, 0.65, 1.2, 0.5, 0x8a6236); box(F, MAT.iron, x - 0.33, 0.9, z + 0.12, 0.02, 0.04, 0.1, 0xc8b070); box(F, MAT.iron, x - 0.33, 0.4, z + 0.12, 0.02, 0.04, 0.1, 0xc8b070); }
  box(F, MAT.plain, 2.0, 1.6, D - 0.15, 1.0, 0.03, 0.22, 0x8a6a46); for (let k = 0; k < 5; k++) cyl(F, MAT.iron, 1.65 + k * 0.18, 1.69, D - 0.15, 0.05, 0.05, 0.14, [0xb83a2a, 0x3a6a3a, 0xc8a040, 0x3a4a8a, 0xe8e0d0][k], 10);
  box(F, MAT.plain, 4.2, 1.5, D - 0.09, 0.1, 0.18, 0.1, 0x6a4a2a);
  // the parents' bedroom: the iron bed, little Richard's crib, the washstand, a chair, a holy picture; the rosary on the bedpost
  bedIron(F, 7.9, 6.75, 1.35, 1.95, 0, 0xc8d8e8); box(F, MAT.plain, 7.9, 0.06, 7.75, 0.3, 0.12, 0.3, 0xe8e4dc);
  { const x = 6.1, z = 8.5; box(F, MAT.plain, x, 0.48, z, 0.62, 0.04, 1.1, 0x7a5a3a); for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(F, MAT.plain, x + sx * 0.28, 0.45, z + sz * 0.52, 0.015, 0.015, 0.9, 0x7a5a3a, 6); for (let k = 0; k < 9; k++) cyl(F, MAT.plain, x - 0.3, 0.68, z - 0.48 + k * 0.12, 0.008, 0.008, 0.4, 0x7a5a3a, 4); box(F, MAT.cloth, x, 0.52, z, 0.55, 0.06, 1.0, 0xf4f0e4); }
  { const x = 9.45, z = 6.95; box(F, MAT.plain, x, 0.4, z, 0.45, 0.8, 0.75, 0x6a4628); box(F, MAT.plain, x, 0.82, z, 0.48, 0.04, 0.78, 0xe8e4dc); lathe(F, MAT.plain, x, 0.84, z, [[0.18, 0], [0.2, 0.06], [0.17, 0.09]], 0xf4f2ee, 16); lathe(F, MAT.plain, x, 0.86, z, [[0.07, 0], [0.1, 0.12], [0.07, 0.22], [0.05, 0.26], [0.08, 0.3]], 0xf4f2ee, 14); }
  chairB(F, 9.2, 8.4, -1.6); picture(F, 9.66, 1.8, 7.1, 0.4, 0.5, -Math.PI / 2, drawSacredHeart, 0x6a4a2a); box(F, MAT.rag, 7.9, 0.006, 8.95 - 0.2, 1.4, 0.012, 0.5, 0xffffff);
  // upstairs: the girls' room at the front, Lulu's room behind it, Joseph's room over the side wing
  const FU = frame(F.x, F.z, F.y + UP, F.ry); bedIron(FU, 1.55, 0.25, 1.3, 1.9, 0, 0xd8a8a8); bedIron(FU, 4.0, 0.25, 0.95, 1.8, 0, 0xa8c0d8);
  box(F, MAT.plain, 2.75, UP + 0.22, 3.0, 0.9, 0.44, 0.5, 0x6a4a2a); box(F, MAT.plain, 2.75, UP + 0.46, 3.0, 0.92, 0.04, 0.52, 0x5a3a20);
  { const x = 4.6, z = 4.55; box(F, MAT.plain, x, UP + 0.4, z, 0.7, 0.8, 0.42, 0x8a6a46); lathe(F, MAT.plain, x, UP + 0.8, z, [[0.16, 0], [0.18, 0.05], [0.15, 0.08]], 0xf4f2ee, 14); lathe(F, MAT.plain, x, UP + 0.82, z, [[0.06, 0], [0.09, 0.1], [0.06, 0.19], [0.07, 0.24]], 0xf4f2ee, 12); }
  for (let k = 0; k < 4; k++) { box(F, MAT.plain, 0.6 + k * 0.5, UP + 1.55, 4.9, 0.03, 0.03, 0.08, 0x3a2416); box(F, MAT.cloth, 0.6 + k * 0.5, UP + 1.15, 4.86, 0.36, 0.8, 0.04, [0xf0ece4, 0x3a4a6a, 0xe8d8d8, 0x6a3a3a][k]); }
  picture(F, 2.7, UP + 2.4, 0.09, 0.3, 0.38, 0, drawSacredHeart, 0x8a6a2a);
  bedIron(FU, 1.6, 8.75, 1.1, 1.9, Math.PI, 0xe8d8a8); box(F, MAT.plain, 3.8, UP + 0.45, 8.65, 0.9, 0.9, 0.45, 0x6a4628); box(F, MAT.plain, 3.8, UP + 1.25, 8.82, 0.6, 0.7, 0.03, 0x3a2416); box(F, MAT.plain, 3.8, UP + 1.25, 8.8, 0.5, 0.6, 0.01, 0xb8c4c8); chairB(FU, 3.0, 6.2, 0.3); box(F, MAT.rag, 2.6, UP + 0.01, 7.4, 1.4, 0.012, 0.6, 0xffffff);
  bedIron(FU, 7.5, 8.35, 0.95, 1.85, Math.PI * 0.5, 0xc8b8a0); box(F, MAT.plain, 8.6, UP + 0.25, 7.2, 0.5, 0.5, 0.9, 0x5a4a32); box(F, MAT.plain, 8.6, UP + 0.51, 7.2, 0.52, 0.03, 0.92, 0x3a2a1a);
  cyl(F, MAT.plain, 6.9, UP + 0.3, 7.6, 0.3, 0.3, 0.03, 0x8a6a3a, 18, Math.PI / 2, 0.3); box(F, MAT.plain, 7.1, UP + 0.09, 7.0, 0.5, 0.18, 0.3, 0x8a6a3a); }

// ---------- the other houses: frame cottages, closed, seen from outside ----------
function polyOut(F, mat, P, col, out) { const n = new THREE.Vector3().crossVectors(V3(...P[1]).sub(V3(...P[0])), V3(...P[2]).sub(V3(...P[0]))); poly(F, mat, n.dot(V3(...out)) < 0 ? P.slice().reverse() : P, col); }
// a gable roof over the rectangle x0..x1, z0..z1, eaves at ye, ridge along X or Z; gable ends filled with the wall surface
function gableRoof(F, x0, x1, z0, z1, ye, along, pitch, o = 0.3, roofM = MAT.shingle, roofC = 0xffffff, wallM = MAT.clap, wallC = EXT, ends = [true, true]) {
  if (along === "z") { const xm = (x0 + x1) / 2, yr = ye + (x1 - x0) / 2 * pitch, yo = ye - o * pitch;
    polyOut(F, roofM, [[x0 - o, yo, z0 - o], [xm, yr, z0 - o], [xm, yr, z1 + o], [x0 - o, yo, z1 + o]], roofC, [-1, 1, 0]); polyOut(F, roofM, [[x1 + o, yo, z0 - o], [xm, yr, z0 - o], [xm, yr, z1 + o], [x1 + o, yo, z1 + o]], roofC, [1, 1, 0]);
    polyOut(F, MAT.plain, [[x0 - o, yo - 0.02, z0 - o], [xm, yr - 0.08, z0 - o], [xm, yr - 0.08, z1 + o], [x0 - o, yo - 0.02, z1 + o]], 0x5a5048, [1, -1, 0]); polyOut(F, MAT.plain, [[x1 + o, yo - 0.02, z0 - o], [xm, yr - 0.08, z0 - o], [xm, yr - 0.08, z1 + o], [x1 + o, yo - 0.02, z1 + o]], 0x5a5048, [-1, -1, 0]);
    if (ends[0]) polyOut(F, wallM, [[x0, ye, z0], [x1, ye, z0], [xm, yr, z0]], wallC, [0, 0, -1]); if (ends[1]) polyOut(F, wallM, [[x0, ye, z1], [x1, ye, z1], [xm, yr, z1]], wallC, [0, 0, 1]); return yr; }
  const zm = (z0 + z1) / 2, yr = ye + (z1 - z0) / 2 * pitch, yo = ye - o * pitch;
  polyOut(F, roofM, [[x0 - o, yo, z0 - o], [x1 + o, yo, z0 - o], [x1 + o, yr, zm], [x0 - o, yr, zm]], roofC, [0, 1, -1]); polyOut(F, roofM, [[x0 - o, yo, z1 + o], [x1 + o, yo, z1 + o], [x1 + o, yr, zm], [x0 - o, yr, zm]], roofC, [0, 1, 1]);
  polyOut(F, MAT.plain, [[x0 - o, yo - 0.02, z0 - o], [x1 + o, yo - 0.02, z0 - o], [x1 + o, yr - 0.08, zm], [x0 - o, yr - 0.08, zm]], 0x5a5048, [0, -1, 1]); polyOut(F, MAT.plain, [[x0 - o, yo - 0.02, z1 + o], [x1 + o, yo - 0.02, z1 + o], [x1 + o, yr - 0.08, zm], [x0 - o, yr - 0.08, zm]], 0x5a5048, [0, -1, -1]);
  if (ends[0]) polyOut(F, wallM, [[x0, ye, z0], [x0, ye, z1], [x0, yr, zm]], wallC, [-1, 0, 0]); if (ends[1]) polyOut(F, wallM, [[x1, ye, z0], [x1, ye, z1], [x1, yr, zm]], wallC, [1, 0, 0]); return yr; }
function hipRoof(F, x0, x1, z0, z1, ye, pitch, o = 0.3, roofM = MAT.shingle, roofC = 0xffffff) { const w = x1 - x0, d = z1 - z0, r = Math.min(w, d) / 2, yr = ye + r * pitch, yo = ye - o * pitch, ax = w >= d, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const A = ax ? [x0 + r, yr, cz] : [cx, yr, z0 + r], B = ax ? [x1 - r, yr, cz] : [cx, yr, z1 - r], c = [[x0 - o, yo, z0 - o], [x1 + o, yo, z0 - o], [x1 + o, yo, z1 + o], [x0 - o, yo, z1 + o]];
  if (ax) { polyOut(F, roofM, [c[0], c[1], B, A], roofC, [0, 1, -1]); polyOut(F, roofM, [c[3], c[2], B, A], roofC, [0, 1, 1]); polyOut(F, roofM, [c[0], c[3], A], roofC, [-1, 1, 0]); polyOut(F, roofM, [c[1], c[2], B], roofC, [1, 1, 0]); }
  else { polyOut(F, roofM, [c[0], c[3], B, A], roofC, [-1, 1, 0]); polyOut(F, roofM, [c[1], c[2], B, A], roofC, [1, 1, 0]); polyOut(F, roofM, [c[0], c[1], A], roofC, [0, 1, -1]); polyOut(F, roofM, [c[3], c[2], B], roofC, [0, 1, 1]); } return yr; }
// a window or door seen from outside: casing, a moulded head, the dark glass of the sashes
function winOut(F, line, at, c, yb, w, h, out, door = false, trim = TRIM) { const B = (cc, y, n, sx, sy, sn, mat, col) => line === "z" ? box(F, mat, cc, y, n, sx, sy, sn, col) : box(F, mat, n, y, cc, sn, sy, sx, col), n = at + out * 0.085;
  B(c, yb + h / 2, n, w, h, 0.02, MAT.plain, door ? 0x5a3a24 : 0x1e262c); B(c - w / 2 - 0.05, yb + h / 2, n + out * 0.01, 0.1, h + 0.12, 0.03, MAT.plain, trim); B(c + w / 2 + 0.05, yb + h / 2, n + out * 0.01, 0.1, h + 0.12, 0.03, MAT.plain, trim);
  B(c, yb + h + 0.1, n + out * 0.03, w + 0.32, 0.12, 0.07, MAT.plain, trim); if (!door) { B(c, yb - 0.03, n + out * 0.03, w + 0.14, 0.05, 0.08, MAT.plain, trim); B(c, yb + h / 2, n + out * 0.012, w, 0.05, 0.02, MAT.plain, trim); } }
// cottages: "gfw" (gable front and wing, like 218), "front" (front-gabled, 1 1/2 storeys), "side" (side-gabled, one storey), "hip" (a hipped
// cottage), "two" (two storeys, front-gabled); walls frame (clapboard) or brick
function cottage(F, o) { const wall = o.brick ? MAT.brick : MAT.clap, wc = o.brick ? 0xffffff : o.col, T = 0.16, gyv = (X, Z) => { const w = toWorld(F, X, 0, Z); return ground(w.x, w.z) - F.y; };
  const walls = (x0, x1, z0, z1, h) => { box(F, wall, (x0 + x1) / 2, h / 2 - 0.05, (z0 + z1) / 2, x1 - x0, h + 0.1, z1 - z0, wc); const lo = Math.min(gyv(x0, z0), gyv(x1, z0), gyv(x0, z1), gyv(x1, z1)) - 0.3;
    box(F, MAT.brick, (x0 + x1) / 2, (lo - 0.1) / 2, (z0 + z1) / 2, x1 - x0 + 0.06, -0.1 - lo, z1 - z0 + 0.06, 0xffffff); solidBox(F, x0, z0, x1, z1, lo, h + 4);
    if (!o.brick) for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) box(F, MAT.plain, x, h / 2, z, 0.17, h, 0.17, o.trim || TRIM); };
  const sideWins = (x0, x1, z0, z1, h, n = 2) => { for (const [line, at, a0, a1, out] of [["x", x0, z0, z1, -1], ["x", x1, z0, z1, 1]]) { const L = a1 - a0, k = Math.max(1, Math.round(L / 3.2)); for (let i = 0; i < k; i++) winOut(F, line, at, a0 + (i + 0.5) * L / k, 0.75, 0.75, 1.55, out, false, o.trim); } };
  const porch = (x0, x1, z0, z1, yTop) => { box(F, MAT.board, (x0 + x1) / 2, -0.1, (z0 + z1) / 2, x1 - x0, 0.06, z1 - z0, 0x9a9890); const n = Math.max(2, Math.round((x1 - x0) / 2.2));
    for (let i = 0; i <= n; i++) cyl(F, MAT.plain, x0 + 0.12 + i * (x1 - x0 - 0.24) / n, yTop / 2, z0 + 0.12, 0.07, 0.08, yTop, o.trim || TRIM, 8); polyOut(F, MAT.shingle, [[x0 - 0.1, yTop, z0 - 0.15], [x1 + 0.1, yTop, z0 - 0.15], [x1 + 0.1, yTop + 0.5, z1], [x0 - 0.1, yTop + 0.5, z1]], 0xffffff, [0, 1, -0.3]);
    const st = gyv((x0 + x1) / 2, z0 - 0.6); box(F, MAT.board, (x0 + x1) / 2, (st - 0.1) / 2, z0 - 0.35, 1.2, Math.max(0.05, -0.1 - st), 0.6, 0x9a9890); };
  const t = o.type, P = o.pitch || 1.15;
  if (t === "gfw") { const { wx, wd, sx, sz } = o, h = 4.0; walls(0, wx, 0, wd, h); walls(wx, wx + sx, sz, wd, h); gableRoof(F, 0, wx, 0, wd, h, "z", P); gableRoof(F, wx, wx + sx, sz, wd, h, "x", P, 0.3, MAT.shingle, 0xffffff, wall, wc, [false, true]);
    winOut(F, "z", 0, wx * 0.3, 0.75, 0.78, 1.6, -1, false, o.trim); winOut(F, "z", 0, wx * 0.7, 0.75, 0.78, 1.6, -1, false, o.trim); winOut(F, "z", 0, wx / 2, 4.3, 0.7, 1.3, -1, false, o.trim); winOut(F, "z", sz, wx + sx * 0.7, 0, 0.92, 2.15, -1, true, o.trim); winOut(F, "z", sz, wx + sx * 0.25, 0.75, 0.78, 1.6, -1, false, o.trim);
    sideWins(0, wx, 0, wd, h); porch(wx, wx + sx, sz - 1.7, sz, 2.6); }
  else if (t === "front" || t === "two") { const { w, d } = o, h = t === "two" ? 5.6 : 4.0; walls(0, w, 0, d, h); gableRoof(F, 0, w, 0, d, h, "z", P); winOut(F, "z", 0, w * 0.28, 0.75, 0.78, 1.6, -1, false, o.trim); winOut(F, "z", 0, w * 0.72, 0, 0.92, 2.15, -1, true, o.trim);
    winOut(F, "z", 0, w / 2, t === "two" ? 3.5 : 4.2, 0.72, 1.35, -1, false, o.trim); if (t === "two") winOut(F, "z", 0, w * 0.22, 3.5, 0.72, 1.35, -1, false, o.trim); sideWins(0, w, 0, d, h); if (o.porch !== false) porch(0, w, -1.8, 0, 2.6); }
  else if (t === "side") { const { w, d } = o, h = 3.0; walls(0, w, 0, d, h); gableRoof(F, 0, w, 0, d, h, "x", P * 0.85); winOut(F, "z", 0, w * 0.22, 0.7, 0.75, 1.5, -1, false, o.trim); winOut(F, "z", 0, w * 0.5, 0, 0.9, 2.1, -1, true, o.trim); winOut(F, "z", 0, w * 0.78, 0.7, 0.75, 1.5, -1, false, o.trim); if (o.porch) porch(w * 0.3, w * 0.7, -1.6, 0, 2.4); }
  else if (t === "hip") { const { w, d } = o, h = 3.2; walls(0, w, 0, d, h); hipRoof(F, 0, w, 0, d, h, 0.9); winOut(F, "z", 0, w * 0.25, 0.7, 0.75, 1.5, -1, false, o.trim); winOut(F, "z", 0, w * 0.6, 0, 0.9, 2.1, -1, true, o.trim); sideWins(0, w, 0, d, h); if (o.porch !== false) porch(0, w, -1.7, 0, 2.5); }
  if (o.chimney !== false) { const cx = t === "gfw" ? o.wx / 2 : o.w / 2, cz = (t === "gfw" ? o.wd : o.d) * 0.6, top = (t === "two" ? 5.6 : t === "side" ? 3.0 : 4.0) + (t === "gfw" ? o.wx : o.w) / 2 * P + 0.6; box(F, MAT.brick, cx, top - 1.2, cz, 0.45, 2.4, 0.45, 0xffffff); } }
// outbuildings: sheds and privies (boards, tar-paper roofs), stables (two storeys, a loft door), the chicken house
function shed(F, x0, z0, x1, z1, h, kind = "shed") { const gyv = (X, Z) => { const w = toWorld(F, X, 0, Z); return ground(w.x, w.z) - F.y; }, lo = Math.min(gyv(x0, z0), gyv(x1, z1), gyv(x0, z1), gyv(x1, z0)), hi = Math.max(gyv(x0, z0), gyv(x1, z1), gyv(x0, z1), gyv(x1, z0)), y0 = hi + 0.05;
  box(F, MAT.plank, (x0 + x1) / 2, (y0 + lo + h) / 2, (z0 + z1) / 2, x1 - x0, y0 + h - lo, z1 - z0, kind === "stable" ? 0x9a7a5a : 0xb0a088); solidBox(F, x0, z0, x1, z1, lo, y0 + h + 3);
  if (kind === "stable") { gableRoof(F, x0, x1, z0, z1, y0 + h, "x", 1.0, 0.3, MAT.shingle, 0xd0c8c0, MAT.plank, 0x9a7a5a); box(F, MAT.plain, (x0 + x1) / 2, y0 + h - 1.0, z0 - 0.02, 1.0, 1.0, 0.04, 0x4a3420); box(F, MAT.plain, (x0 + x1) / 2, y0 + 1.1, z0 - 0.02, 2.2, 2.2, 0.04, 0x5a4028); }
  else { polyOut(F, MAT.tar, [[x0 - 0.15, y0 + h + 0.35, z0 - 0.15], [x1 + 0.15, y0 + h + 0.35, z0 - 0.15], [x1 + 0.15, y0 + h - 0.1, z1 + 0.15], [x0 - 0.15, y0 + h - 0.1, z1 + 0.15]], 0xffffff, [0, 1, 0.2]); box(F, MAT.plain, x0 + 0.7, y0 + 0.95, z0 - 0.02, 0.75, 1.9, 0.04, 0x6a5a44); } }
function fence(F, x0, z0, x1, z1, rough = false, col = 0xe8e4d8) { const len = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(len / (rough ? 0.16 : 0.12)), g = (X, Z) => { const w = toWorld(F, X, 0, Z); return ground(w.x, w.z) - F.y; };
  for (let k = 0; k <= n; k++) { const f = k / n, X = x0 + (x1 - x0) * f, Z = z0 + (z1 - z0) * f, h = rough ? 1.3 + 0.12 * Math.sin(k * 7.3) : 1.05; box(F, MAT.plain, X, g(X, Z) + h / 2, Z, 0.07, h, 0.02, rough ? 0x8a7a62 + ((k * 2131) % 3) * 0x080808 : col, rough ? 0.05 * Math.sin(k * 3.1) : 0, Math.atan2(-(z1 - z0), x1 - x0), 0); }
  const yaw = Math.atan2(-(z1 - z0), x1 - x0); for (const hh of rough ? [0.45, 1.1] : [0.3, 0.8]) for (let s = 0; s < Math.ceil(len / 2.4); s++) { const fa = s * 2.4 / len, fb = Math.min(1, (s + 1) * 2.4 / len), Xa = x0 + (x1 - x0) * fa, Za = z0 + (z1 - z0) * fa, Xb = x0 + (x1 - x0) * fb, Zb = z0 + (z1 - z0) * fb;
    box(F, MAT.plain, (Xa + Xb) / 2, (g(Xa, Za) + g(Xb, Zb)) / 2 + hh, (Za + Zb) / 2, Math.hypot(Xb - Xa, Zb - Za), 0.06, 0.03, rough ? 0x6a5a48 : col, 0, yaw, 0); } }

// ---------- placing it all ----------
// Etta Avenue runs a little south of east here (0.9 degrees); its south curb meets Hoffmeister Avenue 72 m east of the street-map
// address point, and the Sanborn puts 218's lot line 25 ft west of that corner. SF is a frame on the curb line: X east along the street
// from 218's front wall corner, Z back from the street.
const ETTA_A = 0.0161, SF = frame(49.1, 5.6, 0, -ETTA_A);
const ON = (X, Z) => toWorld(SF, X, 0, Z);
function placeF(X, Z, turn = 0, raise = 0.6) { const w = ON(X, Z); return frame(w.x, w.z, ground(w.x, w.z) + raise, -ETTA_A + turn); }
const F218 = (() => { const w = ON(0, 0), f = ON(2.7, -1.2); return frame(w.x, w.z, ground(f.x, f.z) + 0.85, -ETTA_A); })();
LIFT.push({ x: ON(4.9, 4.5).x, z: ON(4.9, 4.5).z, hw: 6, hd: 6.5, f: 6, y: F218.y - 0.7 });
build218(F218); furnish218(F218);
// the Sanborn's neighbours (1908), measured off the sheet: 220 next door is all but a twin of 218 (the same builder?), with a one-storey
// kitchen at the back and a two-storey stable between sheds behind; 216, one storey, set far back; the long chicken house; 206, 1 1/2
// storeys with a bay; 201 across the street, one storey; three sheds and a stable at the corner of Hoffmeister; 225, 233 and 237 face
// Virginia (Velma) behind. Their colours are guesses: white and cream were the commonest paints, with some greys and browns.
shed(F218, 6.0, 22.2, 10.4, 25.0, 2.3, "shed");
cottage(placeF(15.7, 4.1), { type: "gfw", wx: 5.0, wd: 9.3, sx: 4.8, sz: 4.5, col: 0xe8e2cc, pitch: 1.25 }); shed(placeF(20.7, 13.4), 0, 0, 4.8, 2.1, 2.6, "shed");
shed(SF, 22.5, 22.6, 25.8, 26.2, 2.4); shed(SF, 17.7, 22.6, 22.5, 26.2, 4.2, "stable"); shed(SF, 15.3, 22.6, 17.6, 26.2, 2.4);
cottage(placeF(-7.35, 11.2), { type: "front", w: 4.1, d: 7.4, col: 0xd8d4c8, porch: true, pitch: 0.9 }); shed(SF, -7.35, 18.6, -1.7, 21.5, 2.5); shed(SF, -3.25, 30, -0.93, 33.7, 2.2);
shed(SF, -24.5, 14.5, -8.7, 21.3, 2.0, "chicken");
cottage(placeF(-40.8, 22.4), { type: "front", w: 6.2, d: 8.6, col: 0xc8c0a8, pitch: 1.2 }); shed(SF, -46.4, 31.7, -41.8, 34.4, 2.2); shed(SF, -44.2, 34.8, -39.1, 39.5, 2.3);
cottage(placeF(-11.5, -23.4, Math.PI), { type: "side", w: 9.6, d: 7.0, col: 0xece6d6, porch: true });
shed(SF, -3.7, -31.3, -0.6, -27.3, 2.3); shed(SF, -3.7, -27.3, -0.6, -23.0, 3.8, "stable"); shed(SF, -3.7, -23.0, -0.6, -19.4, 2.3);
cottage(placeF(9.4, 70.4, Math.PI), { type: "gfw", wx: 5.0, wd: 9.3, sx: 3.8, sz: 2.6, col: 0xd8dcd0, pitch: 1.2 }); cottage(placeF(25.5, 70.4, Math.PI), { type: "gfw", wx: 5.0, wd: 9.3, sx: 4.1, sz: 2.6, col: 0xe8e0c4, pitch: 1.2 });
cottage(placeF(-24.4, 63.5, Math.PI), { type: "two", w: 8.5, d: 12.0, col: 0xb8b0a0, pitch: 1.0 }); shed(SF, 10, 34.8, 14.3, 37.5, 2.2); shed(SF, -29, 35.6, -24, 39, 2.2);
// the Fraundorfs' yard: the rough picket fence with its wires (the 1917 photograph), the cistern and its pitcher pump by the kitchen door,
// the vegetable garden at the back, a rain barrel, the woodpile, a clothes line (empty: it is Sunday; Monday is washday)
fence(SF, -0.4, 0, -0.4, 38.4, true); fence(SF, 15.6, 3.0, 15.6, 38.4, true); fence(SF, -0.4, 38.4, 15.6, 38.4, true);
{ const F = F218, gy = (X, Z) => { const w = toWorld(F, X, 0, Z); return ground(w.x, w.z) - F.y; }; const cx = 0.6, cz = 10.4, y = gy(cx, cz);
  box(F, MAT.plank, cx, y + 0.25, cz, 1.3, 0.5, 1.3, 0x7a6a52); cyl(F, MAT.iron, cx, y + 0.75, cz, 0.06, 0.08, 0.5, 0x2a2a2a, 10); box(F, MAT.iron, cx + 0.12, y + 0.95, cz, 0.18, 0.06, 0.06, 0x2a2a2a); box(F, MAT.iron, cx - 0.2, y + 1.0, cz, 0.35, 0.03, 0.03, 0x2a2a2a, 0, 0, 0.4);
  cyl(F, MAT.plank, -0.1, gy(-0.1, 8.7) + 0.45, 8.7, 0.3, 0.27, 0.9, 0x6a5038, 12); for (let k = 0; k < 9; k++) box(F, MAT.plain, 3 + k * 0.9, gy(3 + k * 0.9, 31) + 0.04, 31, 0.5, 0.08, 9, k % 3 ? 0x4a6a2a : 0x6a4a30);
  for (let k = 0; k < 7; k++) box(F, MAT.plank, 11.5, gy(11.5, 21) + 0.15 + k * 0.17, 21 + (k % 2) * 0.1, 0.4, 0.15, 2.4, 0x8a6a46, 0, 0, Math.PI / 2);
  for (const z of [14, 26]) cyl(F, MAT.plain, 8, gy(8, z) + 1.1, z, 0.05, 0.05, 2.2, 0x6a5a44, 6); box(F, MAT.plain, 8, (gy(8, 14) + gy(8, 26)) / 2 + 2.0, 20, 0.012, 0.012, 12, 0xd8d0c0); }
// the rest of the blocks between Broadway and Hoffmeister: lots of 25 ft, a house on about four in ten pairs (the Sanborn shows the
// blocks only half built), typical cottages of the 1880s-1900s, mostly frame; a shed or privy behind each, a tree or two
const STREET_NAMES = new Set(["Etta Avenue", "Cleveland Avenue", "Virginia Avenue", "Hancock Avenue", "Louise Avenue", "Florence Avenue", "John Avenue"]);
const HOF_A = [-143, -334], HOF_B = [342, 428], westOfHof = (x, z) => (HOF_B[0] - HOF_A[0]) * (z - HOF_A[1]) - (HOF_B[1] - HOF_A[1]) * (x - HOF_A[0]) > 0;
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, t = clampN(((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
const roadDist = (x, z, filter = null) => { let d = 1e9; for (const [n, k, P] of ROADS) { if (filter && !filter(n, k)) continue; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, segDist(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); } return d; };
const sanbornZone = (x, z) => { const dx = x - SF.x, dz = z - SF.z, c = Math.cos(SF.ry), s = Math.sin(SF.ry), X = dx * c - dz * s, Z = dx * s + dz * c; return X > -52 && X < 34 && Z > -46 && Z < 80; };
const COLS = [0xf0ece0, 0xe8e2cc, 0xf2f0ea, 0xd8d4c8, 0xc8c4b4, 0xe0d8b8, 0xb8b0a0, 0xd8c8a8, 0x9a8a72, 0xe8e8e0], TREES = [];
const house1 = (x, z, ang, r, broadway) => { const R = k => hash(Math.round(x * 3) + k * 101, Math.round(z * 3)), t = broadway && R(1) < 0.3 ? "store" : ["gfw", "front", "front", "side", "hip", "two", "gfw"][Math.floor(R(2) * 7)], brick = R(3) < 0.14;
  const w = t === "gfw" ? 9.2 : t === "side" ? 8.4 : t === "hip" ? 7.4 : t === "two" ? 6.8 : t === "store" ? 7.5 : 5.8, setback = t === "store" ? 0.6 : 3 + R(4) * 3.5, half = r + setback;
  const fx = x + Math.cos(ang + Math.PI / 2) * half, fz = z + Math.sin(ang + Math.PI / 2) * half;
  const F = frame(fx - Math.cos(ang) * w / 2, fz - Math.sin(ang) * w / 2, ground(fx, fz) + 0.55, -ang);
  if (t === "store") { store(F, w, 12, R(5)); return; }
  const col = COLS[Math.floor(R(6) * COLS.length)];
  if (t === "gfw") cottage(F, { type: "gfw", wx: 5.0, wd: 8.8, sx: 4.2, sz: 3.4, col, brick, pitch: 1.1 + R(7) * 0.2 }); else cottage(F, { type: t, w, d: t === "side" ? 6.2 : t === "hip" ? 7.4 : 8.8 + R(8) * 1.6, col, brick, porch: R(9) < 0.75, pitch: 1.0 + R(7) * 0.25 });
  shed(F, w * 0.3, 24, w * 0.3 + 1.4 + R(10) * 2.5, 25.6 + R(11) * 1.5, 2.2); for (let k = 0; k < 1 + Math.floor(R(12) * 3); k++) { const a = toWorld(F, -2 + R(13 + k) * (w + 4), 0, 12 + R(16 + k) * 18); TREES.push([a.x, a.z, 0.8 + R(19 + k) * 0.6, 1]); }
  if (R(22) < 0.35) fence(F, -1.5, -1.0, w + 1.5, -1.0, false, R(23) < 0.6 ? 0xe8e4d8 : 0x9a8a72); };
// a store or saloon on Broadway: two storeys of brick or a frame false front, a cornice, big shop windows, rooms upstairs
function store(F, w, d, r) { const brick = r < 0.6, wall = brick ? MAT.brick : MAT.clap, wc = brick ? 0xffffff : 0xd8d0b8, h = 7.2; box(F, wall, w / 2, h / 2 - 0.3, d / 2, w, h + 0.6, d, wc); solidBox(F, 0, 0, w, d, -3, h + 3);
  box(F, MAT.plain, w / 2, h + 0.25, -0.12, w + 0.3, 0.5, 0.3, 0x5a4a3a); box(F, MAT.plain, w / 2, 3.25, -0.08, w, 0.25, 0.16, 0x4a3a2a); polyOut(F, MAT.tar, [[0, h, 0], [w, h, 0], [w, h - 0.5, d], [0, h - 0.5, d]], 0xffffff, [0, 1, 0]);
  winOut(F, "z", 0, w * 0.25, 0.5, w * 0.36, 2.3, -1, false, 0x5a4a3a); winOut(F, "z", 0, w * 0.75, 0.5, w * 0.36, 2.3, -1, false, 0x5a4a3a); winOut(F, "z", 0, w / 2, 0, 1.0, 2.4, -1, true, 0x5a4a3a);
  for (const x of [0.22, 0.5, 0.78]) winOut(F, "z", 0, w * x, 4.1, 0.75, 1.5, -1, false, brick ? 0xd8d0c0 : TRIM); }
// St. Andrew's (the parish of 1905), on Hoffmeister Avenue by Military Road; St. Joseph's Institute for the Deaf, west of Broadway between
// Cleveland and Etta (both from the 1908-1909 Sanborn sheets; the institute's building is drawn as typical, its plan not traced)
const HD = (() => { const a = V3(-143, 0, -334), b = V3(-565, 0, -679), d = b.clone().sub(a).normalize(); return { a, d, n: V3(-d.z, 0, d.x) }; })();
const CHURCH = HD.a.clone().addScaledVector(HD.d, 95).addScaledVector(HD.n, 22), INST = V3(-372, 0, -48);
for (const [n, k, P] of ROADS) { const broadway = n === "South Broadway"; if (!STREET_NAMES.has(n) && !broadway) continue; const half = broadway ? 9.1 : 7.6;
  for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    for (let s = 7.6; s < L - 7.6; s += 15.24) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L; if (broadway && (z < -420 || z > 420)) continue; if (!broadway && !westOfHof(x, z)) continue;
      for (const side of [1, -1]) { const a = side > 0 ? ang : ang + Math.PI, px = x + Math.cos(a + Math.PI / 2) * (half + 7), pz = z + Math.sin(a + Math.PI / 2) * (half + 7);
        if (sanbornZone(px, pz) || !westOfHof(px, pz) && !broadway || hash(Math.round(px), Math.round(pz)) > (broadway ? 0.52 : 0.4)) continue; if (roadDist(px, pz, (nn) => nn !== n) < 16) continue;
        if (Math.hypot(px - INST.x, pz - INST.z) < 40 || Math.hypot(px - CHURCH.x, pz - CHURCH.z) < 35) continue; house1(x, z, a, half, broadway); } } } }

// St. Andrew's: a frame church 39 by 84 ft, 28 ft to the eaves (the 1909 Sanborn), painted white, with a small belfry; the priest's house
{ const n = HD.n, ry = Math.atan2(n.x, n.z), X = V3(Math.cos(ry), 0, -Math.sin(ry)), o = CHURCH.clone().addScaledVector(n, -12.8).addScaledVector(X, -6), F = frame(o.x, o.z, ground(CHURCH.x, CHURCH.z) + 0.6, ry);
  const W = 11.9, D = 25.6, H = 8.5; box(F, MAT.clap, W / 2, H / 2 - 0.3, D / 2, W, H + 0.6, D, 0xf4f2ec); solidBox(F, 0, 0, W, D, -3, H + 12); const yr = gableRoof(F, 0, W, 0, D, H, "z", 1.05, 0.4, MAT.shingle, 0xc8c0b8, MAT.clap, 0xf4f2ec);
  winOut(F, "z", 0, W / 2, 0, 1.8, 3.0, -1, true); for (const c of [2.4, W - 2.4]) winOut(F, "z", 0, c, 1.2, 1.0, 3.6, -1); winOut(F, "z", 0, W / 2, 5.0, 1.2, 2.0, -1);
  for (let k = 0; k < 6; k++) { winOut(F, "x", 0, 3.5 + k * 3.6, 1.4, 1.0, 3.6, -1); winOut(F, "x", W, 3.5 + k * 3.6, 1.4, 1.0, 3.6, 1); }
  box(F, MAT.clap, W / 2, yr - 0.4, 1.6, 2.6, 2.4, 2.6, 0xf4f2ec); box(F, MAT.plain, W / 2, yr + 1.2, 1.6, 2.7, 0.9, 2.7, 0x3a3a3a); polyOut(F, MAT.shingle, [[W / 2 - 1.4, yr + 1.65, 0.2], [W / 2 + 1.4, yr + 1.65, 0.2], [W / 2, yr + 6, 1.6]], 0xd0c8c0, [0, 0.3, -1]);
  polyOut(F, MAT.shingle, [[W / 2 + 1.4, yr + 1.65, 0.2], [W / 2 + 1.4, yr + 1.65, 3.0], [W / 2, yr + 6, 1.6]], 0xd0c8c0, [1, 0.3, 0]); polyOut(F, MAT.shingle, [[W / 2 + 1.4, yr + 1.65, 3.0], [W / 2 - 1.4, yr + 1.65, 3.0], [W / 2, yr + 6, 1.6]], 0xd0c8c0, [0, 0.3, 1]); polyOut(F, MAT.shingle, [[W / 2 - 1.4, yr + 1.65, 3.0], [W / 2 - 1.4, yr + 1.65, 0.2], [W / 2, yr + 6, 1.6]], 0xd0c8c0, [-1, 0.3, 0]);
  box(F, MAT.iron, W / 2, yr + 6.6, 1.6, 0.08, 1.2, 0.08, 0x2a2a2a); box(F, MAT.iron, W / 2, yr + 6.8, 1.6, 0.6, 0.08, 0.08, 0x2a2a2a);
  const st = ground(o.x, o.z) - F.y; box(F, MAT.board, W / 2, (st - 0.1) / 2, -1.2, 4, Math.max(0.1, -0.1 - st), 2.4, 0xa8a49a);
  cottage(frame(o.x + X.x * (W + 6), o.z + X.z * (W + 6), ground(o.x + X.x * (W + 9), o.z + X.z * (W + 9)) + 0.6, ry), { type: "gfw", wx: 5.2, wd: 9, sx: 4.4, sz: 3.4, col: 0xe8e4d8, pitch: 1.15 }); }
// St. Joseph's Institute for the Deaf: brick, three storeys, facing Broadway
{ const F = frame(INST.x + 7, INST.z - 18, ground(INST.x + 7, INST.z) + 0.5, -Math.PI / 2), W = 36, D = 14, H = 11;
  box(F, MAT.brick, W / 2, H / 2 - 0.5, D / 2, W, H + 1, D, 0xffffff); solidBox(F, 0, 0, W, D, -4, H + 8); const yr = hipRoof(F, 0, W, 0, D, H, 0.7, 0.5, MAT.shingle, 0x8a8478);
  for (let f = 0; f < 3; f++) for (let k = 0; k < 11; k++) { if (f === 0 && k === 5) continue; winOut(F, "z", 0, 1.8 + k * 3.24, 0.9 + f * 3.5, 0.95, 1.9, -1, false, 0xd8d0c0); winOut(F, "z", D, 1.8 + k * 3.24, 0.9 + f * 3.5, 0.95, 1.9, 1, false, 0xd8d0c0); }
  winOut(F, "z", 0, W / 2, 0, 1.6, 2.6, -1, true, 0xd8d0c0); box(F, MAT.plain, W / 2, 3.1, -1.4, 5, 0.3, 2.8, 0xe8e4dc); for (const dx of [-2.2, 2.2]) cyl(F, MAT.plain, W / 2 + dx, 1.5, -2.6, 0.15, 0.17, 3.1, 0xe8e4dc, 10);
  box(F, MAT.clap, W / 2, yr + 0.9, D / 2, 2.4, 1.8, 2.4, 0xf0ece4); hipRoof(F, W / 2 - 1.2, W / 2 + 1.2, D / 2 - 1.2, D / 2 + 1.2, yr + 1.8, 1.3, 0.2, MAT.shingle, 0x6a6a6a); box(F, MAT.iron, W / 2, yr + 4.0, D / 2, 0.07, 1.0, 0.07, 0x2a2a2a); }

// ---------- streets, the streetcar line, the railroad ----------
// Out here the streets were not paved in 1910: graded dirt with wheel ruts, dusty in June. Broadway, the old road to Jefferson Barracks,
// was macadamised, and down its middle ran the Barracks line of the United Railways (the #43 car, 1896-1932), trolley wire overhead.
const dirtT = tex(256, 256, (g, w, h) => { g.fillStyle = "#9a8a6a"; g.fillRect(0, 0, w, h); for (let k = 0; k < 3000; k++) { const c = 110 + rnd() * 60; g.fillStyle = `rgba(${c},${c * 0.88},${c * 0.68},0.35)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  for (const x of [0.3, 0.7]) { g.fillStyle = "rgba(70,55,35,0.35)"; g.fillRect(x * w - 10, 0, 20, h); } });
const macT = tex(256, 256, (g, w, h) => { g.fillStyle = "#857e72"; g.fillRect(0, 0, w, h); for (let k = 0; k < 5000; k++) { const c = 90 + rnd() * 80; g.fillStyle = `rgba(${c},${c * 0.96},${c * 0.9},0.4)`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } });
const roadMat = (t, c) => new THREE.MeshStandardMaterial({ map: t, color: c, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
function ribbon(P, w, mat, step = 3, lift = 0.12) { const pts = []; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / step)); for (let k = 0; k < n; k++) pts.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]); } pts.push(P[P.length - 1]);
  const pos = [], uv = [], idx = []; let along = 0; for (let i = 0; i < pts.length; i++) { const [x, z] = pts[i], [x2, z2] = pts[Math.min(i + 1, pts.length - 1)], [x0, z0] = pts[Math.max(i - 1, 0)], dx = x2 - x0, dz = z2 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L;
    if (i) along += Math.hypot(x - pts[i - 1][0], z - pts[i - 1][1]); for (const s of [-1, 1]) { const px = x + nx * s * w / 2, pz = z + nz * s * w / 2; pos.push(px, ground(px, pz) + lift, pz); uv.push(s * w / 2 / 4, along / 4); } if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); const me = new THREE.Mesh(g, mat); me.receiveShadow = true; scene.add(me); return pts; }
const DIRT = roadMat(dirtT, 0xffffff), MAC = roadMat(macT, 0xffffff), BALLAST = roadMat(macT, 0x8a8478);
let BROADWAY = null;
for (const [n, k, P] of ROADS) { if (n === "South Broadway") { BROADWAY = ribbon(P, 9, MAC, 2.5); } else ribbon(P, n === "Hoffmeister Avenue" || n === "Military Road" ? 7 : 6.2, DIRT, 3); }
// the track and the trolley wire down Broadway
{ const F0 = frame(0, 0, 0, 0), P = BROADWAY; let acc = 0; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax), mx = (ax + bx) / 2, mz = (az + bz) / 2, y = ground(mx, mz);
    box(F0, MAT.plain, mx, y + 0.13, mz, 2.2, 0.08, 0.2, 0x4a3a2a, 0, -ang + Math.PI / 2, 0); for (const s of [-0.72, 0.72]) box(F0, MAT.iron, mx - Math.sin(ang) * s, y + 0.2, mz + Math.cos(ang) * s, L + 0.02, 0.06, 0.05, 0x5a5048, 0, -ang, 0);
    acc += L; if (acc > 36) { acc = 0; const px = ax - Math.sin(ang) * 5.2, pz = az + Math.cos(ang) * 5.2, py = ground(px, pz); cyl(F0, MAT.plain, px, py + 4.2, pz, 0.1, 0.14, 8.4, 0x5a4a38, 7); box(F0, MAT.plain, (px + ax) / 2, py + 7.2, (pz + az) / 2, 0.08, 0.08, 5.4, 0x4a3a2a, 0, -ang, 0); }
    box(F0, MAT.iron, mx, y + 6.1, mz, L, 0.025, 0.025, 0x2a2a2a, 0, -ang, 0); } }
// the Iron Mountain railroad (1858; the St. Louis, Iron Mountain and Southern, later the Missouri Pacific): one track on the bottoms,
// ballast, ties, rails, the telegraph line beside it
const RAILP = []; for (const seg of RAIL) for (const p of seg) if (p[1] > -2400 && p[1] < 1600) RAILP.push(p); RAILP.sort((a, b) => a[1] - b[1]);
{ const P = RAILP.filter((p, i) => i === 0 || Math.hypot(p[0] - RAILP[i - 1][0], p[1] - RAILP[i - 1][1]) > 6); ribbon(P, 4.2, BALLAST, 4, 0.32); const F0 = frame(0, 0, 0, 0); let acc = 0, tie = 0;
  for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    for (let s = tie; s < L; s += 1.2) { const x = ax + (bx - ax) * s / L, z = az + (bz - az) * s / L; box(F0, MAT.plain, x, ground(x, z) + 0.4, z, 2.6, 0.14, 0.22, 0x3a2e22, 0, -ang + Math.PI / 2, 0); } tie = (tie + L) % 1.2;
    const mx = (ax + bx) / 2, mz = (az + bz) / 2, y = ground(mx, mz); for (const s of [-0.72, 0.72]) box(F0, MAT.iron, mx - Math.sin(ang) * s, y + 0.52, mz + Math.cos(ang) * s, L + 0.02, 0.12, 0.07, 0x5a4a40, 0, -ang, 0);
    acc += L; if (acc > 50) { acc = 0; const px = ax - Math.sin(ang) * 6, pz = az + Math.cos(ang) * 6; cyl(F0, MAT.plain, px, ground(px, pz) + 4, pz, 0.1, 0.13, 8, 0x5a4a38, 7); box(F0, MAT.plain, px, ground(px, pz) + 7.4, pz, 1.4, 0.1, 0.1, 0x5a4a38, 0, -ang + Math.PI / 2, 0); } } }

// ---------- the ground ----------
// one mesh, a metre between points near the house, coarser toward the horizon; coloured by what grew there: yards and gardens round the
// houses; beyond the built blocks, fields in mid-June (wheat turning gold, oats, knee-high corn, pasture); the river bottoms wooded
// (cottonwood, sycamore, willow), sand at the Mississippi's edge
const NEAR = [], BUILT = new Float32Array(120 * 120);
for (let j = 0; j < 120; j++) for (let i = 0; i < 120; i++) { const x = -1500 + i * 25 + 12.5, z = -1500 + j * 25 + 12.5; BUILT[j * 120 + i] = roadDist(x, z, (n) => STREET_NAMES.has(n) || n === "South Broadway" || n === "Hoffmeister Avenue" || n === "Military Road"); }
const builtD = (x, z) => { const i = clampN(Math.floor((x + 1500) / 25), 0, 119), j = clampN(Math.floor((z + 1500) / 25), 0, 119); return BUILT[j * 120 + i]; };
function groundCol(x, z, h, out) { const n = fbm(x / 9, z / 9, 3), bd = builtD(x, z); let r, g, b;
  if (h < WATER_Y + 1.6) { r = 0.6; g = 0.54; b = 0.4; }
  else if (h < -9.6) { if (fbm(x / 150 + 2, z / 150, 3) > 0.5) { r = 0.27 + 0.06 * n; g = 0.36 + 0.06 * n; b = 0.17; } else { const row = 0.5 + 0.5 * Math.sin((x * 0.6 - z * 0.8) * 2.6); r = 0.42 + 0.1 * (1 - row); g = 0.44 + 0.12 * row; b = 0.22; } }
  else if (bd < 60 || !westOfHof(x, z) && x < 260) { const d = fbm(x / 3, z / 3, 2); r = 0.4 + 0.12 * n; g = 0.5 + 0.08 * n; b = 0.25; if (d > 0.62) { r = 0.5; g = 0.45; b = 0.32; } }
  else { const f = fbm(x / 170 + 3, z / 170, 3), row = 0.5 + 0.5 * Math.sin((x * 0.7 + z * 0.7) * 2.6);
    if (f < 0.42) { r = 0.68 + 0.05 * n; g = 0.6 + 0.04 * n; b = 0.3; } else if (f < 0.5) { r = 0.5; g = 0.6; b = 0.3; } else if (f < 0.58) { r = 0.42 + 0.12 * (1 - row); g = 0.42 + 0.12 * row; b = 0.22; } else { r = 0.38 + 0.08 * n; g = 0.52 + 0.07 * n; b = 0.24; } }
  out[0] = r; out[1] = g; out[2] = b; }
const grassT = tex(256, 256, (g, w, h) => { g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, w, h); for (let k = 0; k < 6000; k++) { const c = 150 + rnd() * 105; g.fillStyle = `rgba(${c},${c},${c},0.5)`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 2 + rnd() * 4); } });
{ const C = [54, 10], ax = (c, lo, hi) => { const a = []; for (const dir of [-1, 1]) { let x = c, r = 0; while (dir > 0 ? x < hi : x > lo) { const K = IS_HEADSET ? 1.7 : 1, d = K * (r < 30 ? 1 : r < 450 ? 1 + 2 * (r - 30) / 420 : 3 + (r - 450) * 0.06); x += dir * d; r += d; a.push(x); } } a.push(c); return a.sort((p, q) => p - q); };
  const XS = ax(C[0], -4500, 6500), ZS = ax(C[1], -5000, 5000), nx = XS.length, nz = ZS.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), c3 = [0, 0, 0];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = XS[i], z = ZS[j], h = ground(x, z), k = j * nx + i; pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; groundCol(x, z, h, c3); col.set(c3, k * 3); uv[k * 2] = x / 3; uv[k * 2 + 1] = z / 3; }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let o = 0; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx[o++] = a; idx[o++] = a + nx; idx[o++] = a + 1; idx[o++] = a + 1; idx[o++] = a + nx; idx[o++] = a + nx + 1; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  const me = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: grassT, vertexColors: true, roughness: 0.97 })); me.receiveShadow = true; scene.add(me); }
// the Mississippi, at its summer level
{ const w = new THREE.Mesh(new THREE.PlaneGeometry(9000, 12000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a6a52, roughness: 0.35, metalness: 0.1 })); w.position.set(3000, WATER_Y, 0); scene.add(w); }

// ---------- trees ----------
// the big trees round 218: the 1914 photograph shows a wall of large trees in full leaf behind the porch
for (const [X, Z, s] of [[13.5, 7, 1.25], [4, 17, 1.1], [13, 29, 1.2], [-4, 26, 1.0], [6, -26, 1.1], [-6, 1.5, 0.9], [22, -2, 1.0], [-14, 40, 1.1], [29, 33, 1.0]]) { const w = ON(X, Z); TREES.push([w.x, w.z, s, 2]); }
for (let j = -125; j < 125; j++) for (let i = -75; i < 140; i++) { const x = i * 11 + (hash(i, j) - 0.5) * 9, z = j * 11 + (hash(j, i + 77) - 0.5) * 9, h = ground(x, z); if (h < WATER_Y + 0.9) continue;
  const bottom = h < -9.8, bluff = !bottom && h < -2.5 && !westOfHof(x, z), bd = builtD(x, z), r = hash(i * 7 + 3, j * 5 + 1); let p;
  if (bottom || bluff) p = bottom ? (fbm(x / 150 + 2, z / 150, 3) > 0.5 ? 0.55 : 0.03) : 0.22; if (x > 300 && x < 420 && z > -30 && z < 110) p = 0; else if (bd < 60) p = 0.015; else p = fbm(x / 120 + 9, z / 120, 2) > 0.62 ? 0.35 : 0.02;
  if (r > p) continue; if (roadDist(x, z) < (bd < 200 ? 7 : 5)) continue; if (RAILP.length && Math.min(...[0, 1, 2].map(() => 1e9)) < 0) continue; TREES.push([x, z, 0.7 + hash(i + 5, j + 9) * (bottom ? 0.8 : 0.6), bottom ? 3 : 1]); }
const nearRail = (x, z) => { for (let i = 0; i < RAILP.length - 1; i += 1) if (Math.abs(RAILP[i][1] - z) < 60 && segDist(x, z, RAILP[i][0], RAILP[i][1], RAILP[i + 1][0], RAILP[i + 1][1]) < 10) return true; return false; };
const inSolid = (x, z) => SOLIDS.some(S => { const [lx, lz] = toLocal(S, x, z); return lx > S.x0 - 2 && lx < S.x1 + 2 && lz > S.z0 - 2 && lz < S.z1 + 2; });
{ const crownG = (() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)), k = 0.82 + 0.3 * vnoise(v.x * 2.2 + 5, v.y * 2.2 + v.z * 1.7); v.multiplyScalar(k); v.y *= 0.85; p.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; })();
  const trunkG = new THREE.CylinderGeometry(0.18, 0.3, 1, 7).translate(0, 0.5, 0), crownM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), trunkM = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
  const L = TREES.filter(([x, z]) => !nearRail(x, z) && !inSolid(x, z)), near = L.filter(([x, z]) => Math.hypot(x - 54, z - 10) < 260), far = L.filter(([x, z]) => Math.hypot(x - 54, z - 10) >= 260);
  for (const [list, shadow] of [[near, true], [far, false]]) { const N = list.length * 2, C = new THREE.InstancedMesh(crownG, crownM, N), Tr = new THREE.InstancedMesh(trunkG, trunkM, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let k = 0;
    list.forEach(([x, z, s, kind], i) => { const y = ground(x, z), r = (kind === 3 ? 5.5 : kind === 2 ? 6.5 : 4.2) * s, th = (kind === 3 ? 9 : kind === 2 ? 7 : 4.5) * s; m4.compose(V3(x, y - 0.2, z), q, V3(1 + 0.5 * s, th + 1, 1 + 0.5 * s)); Tr.setMatrixAt(i, m4);
      for (let c = 0; c < 2; c++) { const a = hash(i, c * 11) * 6.28, d = c ? r * 0.45 : 0; q.setFromEuler(new THREE.Euler(0, a, 0)); m4.compose(V3(x + Math.cos(a) * d, y + th + r * (c ? 0.55 : 0.85), z + Math.sin(a) * d), q, V3(r * (c ? 0.75 : 1), r * (c ? 0.7 : 0.95), r * (c ? 0.75 : 1)));
        C.setMatrixAt(k, m4); const v = hash(i * 3 + c, 41); col.setRGB(0.2 + 0.1 * v + (kind === 3 ? 0.03 : 0), 0.32 + 0.12 * v, 0.12 + 0.05 * v); C.setColorAt(k, col); k++; } });
    C.castShadow = Tr.castShadow = shadow; C.receiveShadow = true; scene.add(C, Tr); } }
flushBK();


// ---------- the people, 1910 ----------
// Dress after the family's photographs and the fashions of 1905-1912: women in a white or light shirtwaist (blouse) and an ankle-length
// dark skirt, an apron at home, the hair up in a full pompadour, a broad hat out of doors; girls in light dresses to the calf, black
// stockings and boots, a huge bow in the hair; small boys still in smocks, older boys in knickers and long stockings and a flat cap; men
// in shirtsleeves, a vest and suspenders at home, a sack suit and a straw boater or a bowler in town, most with a moustache; soldiers from
// Jefferson Barracks in khaki with the campaign hat; the streetcar crews in dark blue; the Sisters of St. Joseph in black habits.
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
  hairUp: mergeG([[faceCap(0.112, Math.PI * 0.55, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.68, -0.004, 0.96, 1.18, 1.08)], [new THREE.SphereGeometry(0.075, 10, 7), MT(0, 0.79, -0.02, 1.25, 0.75, 1.1)], [new THREE.SphereGeometry(0.05, 8, 6), MT(0, 0.74, -0.1)]]),
  hairGirl: mergeG([[faceCap(0.108, Math.PI * 0.56, Math.PI * 0.3, Math.PI * 0.42), MT(0, 0.672, -0.006, 0.9, 1.12, 1.04)], [foldTube(0.085, 0.095, 0.26, 12, 9, 0.1, Math.PI * 0.85, Math.PI * 0.425), MT(0, 0.54, -0.025)]]),
  bow: mergeG([[new THREE.SphereGeometry(0.07, 8, 5), MT(0.06, 0.78, -0.03, 1, 0.75, 0.3, 0, 0.3)], [new THREE.SphereGeometry(0.07, 8, 5), MT(-0.06, 0.78, -0.03, 1, 0.75, 0.3, 0, -0.3)], [new THREE.SphereGeometry(0.025, 6, 4), MT(0, 0.78, -0.03)]]),
  mustache: G1(new THREE.BoxGeometry(0.07, 0.016, 0.02), MT(0, 0.643, 0.097)),
  coat: G1(foldTube(0.175, 0.205, 0.6, 18, 5, 0.03, Math.PI * 0.3, Math.PI * 0.15, 3).scale(1, 1, 0.8).translate(0, 0.2, -0.01)),
  vest: G1(new THREE.LatheGeometry([[0.148, -0.02], [0.138, 0.12], [0.158, 0.25], [0.172, 0.34], [0.176, 0.42], [0.126, 0.49]].map(([r, y]) => new THREE.Vector2(r, y)), 14).scale(1, 1, 0.7)),
  skirt: G1(foldTube(0.15, 0.3, 0.86, 22, 9, 0.06, 0, 0, 2).scale(1, 1, 0.82).translate(0, -0.37, 0)),
  dress: G1(foldTube(0.15, 0.26, 0.5, 20, 8, 0.07, 0, 0, 5).scale(1, 1, 0.82).translate(0, -0.2, 0)),
  apron: G1(new THREE.PlaneGeometry(0.34, 0.66).translate(0, -0.3, 0.2)),
  braces: mergeG([[new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(0.07, 0.25, 0.127)], [new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(-0.07, 0.25, 0.127)], [new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(0.07, 0.25, -0.128)], [new THREE.BoxGeometry(0.03, 0.5, 0.012), MT(-0.07, 0.25, -0.128)]]),
  tie: G1(new THREE.BoxGeometry(0.04, 0.2, 0.012), MT(0, 0.4, 0.122)),
  belt: mergeG([[new THREE.CylinderGeometry(0.142, 0.142, 0.035, 14, 1, true), MT(0, 0.07, 0, 1, 1, 0.72)], [new THREE.BoxGeometry(0.05, 0.04, 0.02), MT(0, 0.07, 0.105)]]),
  bowler: mergeG([[new THREE.CylinderGeometry(0.15, 0.15, 0.012, 18), MT(0, 0.765, 0)], [new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, 0.77, 0, 1, 1.05, 1.08)]]),
  boater: mergeG([[new THREE.CylinderGeometry(0.17, 0.17, 0.01, 18), MT(0, 0.765, 0)], [new THREE.CylinderGeometry(0.098, 0.098, 0.075, 16), MT(0, 0.8, 0)], [new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16, 1, true), MT(0, 0.78, 0)]]),
  flatcap: mergeG([[new THREE.SphereGeometry(0.115, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MT(0, 0.735, 0, 1.0, 0.45, 1.08)], [new THREE.BoxGeometry(0.15, 0.012, 0.08), MT(0, 0.74, 0.11, 1, 1, 1, 0.15, 0)]]),
  ladyHat: mergeG([[new THREE.CylinderGeometry(0.24, 0.24, 0.012, 20), MT(0, 0.82, -0.01)], [new THREE.CylinderGeometry(0.12, 0.13, 0.1, 16), MT(0, 0.87, -0.01)], [new THREE.SphereGeometry(0.06, 8, 5), MT(0.08, 0.9, 0.0, 1.2, 0.7, 1)]]),
  campaign: mergeG([[new THREE.CylinderGeometry(0.19, 0.19, 0.012, 18), MT(0, 0.765, 0)], [new THREE.ConeGeometry(0.11, 0.15, 4), MT(0, 0.84, 0, 1, 1, 1, 0, 0)]]),
  uniCap: mergeG([[new THREE.CylinderGeometry(0.105, 0.11, 0.07, 14), MT(0, 0.78, 0)], [new THREE.BoxGeometry(0.15, 0.01, 0.07), MT(0, 0.75, 0.1, 1, 1, 1, 0.2, 0)]]),
  veil: mergeG([[faceCap(0.125, Math.PI * 0.62, Math.PI * 0.26, Math.PI * 0.5), MT(0, 0.674, -0.008, 0.95, 1.15, 1.08)], [foldTube(0.12, 0.2, 0.42, 14, 6, 0.06, Math.PI * 0.7, Math.PI * 0.35), MT(0, 0.52, -0.03)]]),
  coif: mergeG([[new THREE.TorusGeometry(0.1, 0.02, 4, 18, Math.PI * 1.2).rotateX(-0.25), MT(0, 0.72, 0.0)], [new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.3), MT(0, 0.6, 0.02, 1, 0.8, 0.9)]]) };
const PARTS = ["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR", "torso", "head", "eyeW", "eyes", "brows", "hairShort", "hairUp", "hairGirl", "bow", "mustache",
  "coat", "vest", "skirt", "dress", "apron", "braces", "tie", "belt", "bowler", "boater", "flatcap", "ladyHat", "campaign", "uniCap", "veil", "coif"];
const PGEO = { legL: PG.thigh, legR: PG.thigh, shinL: PG.shin, shinR: PG.shin, shoeL: PG.shoe, shoeR: PG.shoe, armL: PG.uarm, armR: PG.uarm, foreL: PG.farm, foreR: PG.farm, handL: PG.hand, handR: PG.hand };
for (const k in PG) if (!PG[k].attributes.color) PG[k] = G1(PG[k]);
const METAL = new Set([]);
const personMat = new THREE.MeshStandardMaterial({ roughness: 0.88, side: THREE.DoubleSide, vertexColors: true });
const SK = [0xecc8ae, 0xe2b898, 0xf0d2bc, 0xdcae90, 0xe6c0a2], HAIR = [0x3a2618, 0x5a3a20, 0x7a5a32, 0x2a1c12, 0x6a4a2a, 0x8a6a42, 0x1a120c], DARK = [0x1e1e24, 0x2a2a30, 0x3a3328, 0x2a3040, 0x403a30, 0x4a4438];
const WAIST = [0xf6f4ee, 0xf0ece2, 0xe8eef4, 0xf4ece8, 0xdde4ec], SKIRTS = [0x1e1e28, 0x2a2a3a, 0x3a3028, 0x2a3a4a, 0x4a3a3a, 0x5a5a62, 0x3a4a3a], SHIRT = [0xf4f2ec, 0xe8ecf2, 0xc8d4e4, 0xe8e0d0, 0x9aaac8];
// roles: man, gent (in his Sunday suit), woman, lady (dressed to go out), girl, boy, toddler, soldier, crew (streetcar), nun, priest
function looks(i, role, o = {}) { const h = k => hash(i * 13 + k, 91), pick = (A, k) => A[(h(k) * A.length) | 0];
  const L = { role, s: role === "girl" || role === "boy" ? 0.72 + h(5) * 0.14 : role === "toddler" ? 0.5 : 0.95 + h(5) * 0.1, skin: pick(SK, 4), hair: h(30) < 0.08 && role !== "girl" && role !== "boy" ? 0x8a8478 : pick(HAIR, 6),
    shirt: pick(SHIRT, 7), leg: pick(DARK, 8), shoes: 0x1a1612, coat: null, vest: null, hat: null, hatC: 0x1a1612, skirtC: pick(SKIRTS, 12), waist: pick(WAIST, 13), apron: false, apronC: 0xf2eee6, bowC: pick([0x1a1a2a, 0xe8e0d0, 0x8a2a2a, 0x2a3a6a], 14), mustache: h(15) < 0.65, braces: false, tie: false };
  if (role === "man") Object.assign(L, { vest: h(16) < 0.6 ? pick(DARK, 17) : null, braces: h(18) < 0.5, hat: h(19) < 0.35 ? "flatcap" : h(19) < 0.7 ? "boater" : h(19) < 0.85 ? "bowler" : null, hatC: h(19) < 0.35 ? pick([0x4a4438, 0x5a5048, 0x3a3a40], 20) : 0x1a1612 });
  if (role === "gent") Object.assign(L, { coat: pick(DARK, 17), vest: pick(DARK, 17), tie: true, hat: h(19) < 0.55 ? "boater" : "bowler", leg: pick(DARK, 17) });
  if (role === "woman") Object.assign(L, { apron: h(21) < 0.7 });
  if (role === "lady") Object.assign(L, { hat: "ladyHat", hatC: pick([0x1a1a1a, 0xe8e0d0, 0x3a2a3a, 0x6a5a4a, 0x2a3a4a], 22) });
  if (role === "girl") Object.assign(L, { skirtC: pick([0xf6f4ee, 0xf0ece2, 0xe8d8d8, 0xd8e4ee, 0x4a3a5a], 23), leg: 0x1a1a1e });
  if (role === "boy") Object.assign(L, { leg: pick([0x3a3a40, 0x4a4030, 0x2a3040], 24), hat: h(25) < 0.5 ? "flatcap" : null, hatC: pick([0x5a5048, 0x3a3a40, 0x6a5a42], 26), braces: h(18) < 0.5 });
  if (role === "toddler") Object.assign(L, { skirtC: 0xf4f2ec, leg: L.skin });
  if (role === "soldier") Object.assign(L, { shirt: 0xa8925e, leg: 0xa8925e, hat: "campaign", hatC: 0x9a7a50, mustache: h(15) < 0.3, belt: true, shoes: 0x5a3a22 });
  if (role === "crew") Object.assign(L, { coat: 0x1e2a44, vest: 0x1e2a44, leg: 0x1e2a44, hat: "uniCap", hatC: 0x1a2236 });
  if (role === "nun") Object.assign(L, { skirtC: 0x121214, waist: 0x121214 });
  if (role === "priest") Object.assign(L, { skirtC: 0x121214, waist: 0x121214, hat: "bowler", hatC: 0x121214, mustache: false });
  return Object.assign(L, o); }
const isFem = L => L.role === "woman" || L.role === "lady" || L.role === "girl" || L.role === "nun";
const robed = L => L.role === "woman" || L.role === "lady" || L.role === "nun" || L.role === "priest";
function shows(L, p) { const r = L.role, man = r === "man" || r === "gent" || r === "soldier" || r === "crew";
  switch (p) {
    case "hairShort": return !isFem(L) && r !== "toddler" && r !== "priest" || r === "toddler"; case "hairUp": return r === "woman" || r === "lady"; case "hairGirl": return r === "girl"; case "bow": return r === "girl"; case "mustache": return man && L.mustache;
    case "coat": return !!L.coat; case "vest": return !!L.vest && !L.coat || !!L.vest && r === "crew"; case "skirt": return robed(L); case "dress": return r === "girl" || r === "toddler"; case "apron": return (r === "woman") && L.apron; case "braces": return !!L.braces && !L.coat && !L.vest;
    case "tie": return !!L.tie; case "belt": return r === "soldier" || (r === "boy" && !L.braces); case "veil": case "coif": return r === "nun";
    case "bowler": case "boater": case "flatcap": case "ladyHat": case "campaign": case "uniCap": return L.hat === p; default: return true; } }
function colorOf(L, p) { const r = L.role;
  if (p.startsWith("leg")) return robed(L) ? L.skirtC : r === "girl" || r === "toddler" ? L.skin : L.leg; if (p.startsWith("shin")) return robed(L) ? L.skirtC : L.leg; if (p.startsWith("shoe")) return L.shoes;
  if (p.startsWith("hand") || p === "head") return L.skin; if (p.startsWith("arm") || p.startsWith("fore")) return L.coat || (isFem(L) || r === "priest" ? (r === "girl" ? L.skirtC : L.waist) : r === "toddler" ? L.skirtC : L.shirt);
  switch (p) { case "torso": return isFem(L) || r === "priest" ? (r === "girl" ? L.skirtC : L.waist) : r === "toddler" ? L.skirtC : L.shirt; case "eyes": return 0x2a1e16; case "eyeW": return 0xe8e4dc; case "brows": case "hairShort": case "hairUp": case "hairGirl": case "mustache": return L.hair;
    case "bow": return L.bowC; case "coat": return L.coat; case "vest": return L.vest; case "skirt": return L.skirtC; case "dress": return L.skirtC; case "apron": return L.apronC; case "braces": return 0x2a2a2a; case "tie": return 0x2a1a2a; case "belt": return r === "soldier" ? 0x8a6a3a : 0x3a2a1c;
    case "veil": return 0x121214; case "coif": return 0xf4f2ee; default: return L.hatC; } }
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

const _M = {}, LIMB = new Set(["legL", "legR", "shinL", "shinR", "shoeL", "shoeR", "armL", "armR", "foreL", "foreR", "handL", "handR"]), SKIRT = new Set(["skirt", "apron", "dress"]);
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

// ---------- who is where: Sunday 19 June 1910, late afternoon ----------
// The household from the census of April 1910, and the neighbours named on the same sheet; what they are doing is imagined (a Sunday:
// Mass in the morning at St. Andrew's, no washing or work, supper cooking). Everyone else is typical.
const crowd = new Crowd(150), PEOPLE = [];
const wl = (F, X, Z, y = null) => { const w = toWorld(F, X, 0, Z); return [w.x, y === null ? ground(w.x, w.z) : F.y + y, w.z]; };
function person(L, name, info, o) { const p = { L, name, info, i: PEOPLE.length, t0: hash(PEOPLE.length, 3) * 50, ...o }; crowd.look(p.i, L); PEOPLE.push(p); return p; }
const F220 = placeF(15.7, 4.1), F216 = placeF(-7.35, 11.2);
const LOUISA_INFO = "Louisa (Aloise) Fraundorf, 37. Born in Germany, says the 1910 census; in Bohemia, says that of 1920, which also gives Bohemian as her mother tongue. She came over between 1885 and 1896 and speaks German at home. The family's photographs name her Aloise Cozl Windisch Fraundorf, and name Lulu and Joseph \"Windisch\": perhaps her children by an earlier marriage, though the census lists them as Richard's. Mother of five living children in April 1910; Bertha, counted at 10 in January 1920 but not in April 1910, may be born about now (she is not shown). Here she is making Sunday supper.";
person(looks(1, "man", { hair: 0x5a3a20, shirt: 0xf4f2ec, vest: 0x2a2a30, braces: false, hat: null, mustache: true }), "Richard Bernhard Fraundorf", "Richard Bernhard Fraundorf, 40, the head of the house (the census taker wrote \"Benjamin\"). A bread baker, born in Saxony on 13 January 1874, in America since about 1880-83; in 1918 he worked for the Nafziger Baking Company at Sarah Street and Cook Avenue, and registered for the draft as medium height, with grey eyes and brown hair. He owns this house, with a mortgage. Bakers start in the small hours, so Sunday afternoon on the porch with the paper is his to enjoy.", { pos: wl(F218, 8.95, 3.25, -0.05), h: F218.ry + Math.PI, kind: "sit", paper: true });
person(looks(2, "woman", { hair: 0x2a1c12, waist: 0xf6f4ee, skirtC: 0x2a2a3a, apron: true }), "Louisa Fraundorf", LOUISA_INFO, { pos: wl(F218, 3.7, 7.85, 0), h: F218.ry, kind: "knead" });
person(looks(3, "girl", { s: 0.86, hair: 0x3a2618, skirtC: 0x3a3a4a, bowC: 0x1a1a1a }), "Lulu Fraundorf", "Lulu (Louisa), 12, born in Missouri, at school (St. Andrew's had a parish school). The eldest, minding her little brother. By 1917 the city directory lists her at 218 too; in the photographs she is \"Lulu Cozl Fraundorf\" or \"Lula Windisch\".", { pos: wl(F218, 8.2, -1.6), h: F218.ry + 2.6, kind: "talk" });
person(looks(4, "toddler", { hair: 0x8a6a42 }), "Richard Fraundorf", "Richard Thomas Fraundorf, 2, the youngest (a little boy still in a smock, as small boys were dressed). In the 1914 photograph he wears a striped cap and tie.", { path: "circle", c: wl(F218, 7.2, -2.6), r: 0.9, speed: 0.35, kind: "walk" });
person(looks(5, "girl", { s: 0.68, hair: 0x8a6a42, skirtC: 0xf6f4ee, bowC: 0x1a1a2a }), "Annie Fraundorf", "Annie, 6, born in Missouri; she starts school this year. In 1920 she was a telephone operator. Playing ring-around with Jennie in the side yard.", { path: "circle", c: wl(F218, 12.6, 4.4), r: 0.85, speed: 0.9, kind: "dance" });
person(looks(6, "girl", { s: 0.6, hair: 0x7a5a32, skirtC: 0xf0ece2, bowC: 0x2a2a3a }), "Jennie Fraundorf", "Jennie, 4 (\"Jennie (Shirley)\" in the 1914 photograph), born in Missouri.", { path: "circle", c: wl(F218, 12.6, 4.4), r: 0.85, speed: 0.9, phase: Math.PI, kind: "dance" });
const JOE = person(looks(7, "boy", { s: 0.76, hair: 0x5a3a20, hat: "flatcap" }), "Joseph Fraundorf", "Joseph, 8, born in Missouri, at school; in 1920 he was a baker at a bakery, like his father. In the photographs he is \"Joseph Windisch\". Rolling a hoop along Etta Avenue with Herman Irion from next door.", { path: "line", a: ON(-36, -8.5), b: ON(30, -8.5), speed: 1.6, kind: "walk", hoop: true });
person(looks(8, "boy", { s: 0.8 }), "Herman Irion", "Herman Irion, 9, from 216 next door: his father August, 34, was born in New York, his mother Josephine, 43, in Illinois.", { path: "line", a: ON(-36, -10), b: ON(30, -10), speed: 1.6, phase: 0.3, kind: "walk" });
person(looks(9, "man", { hair: 0x8a8478, vest: 0x2a2a30, hat: null }), "William Mordfeld", "William Mordfeld, 50, at 220 next door (the house all but a twin of 218): born in Germany, came over in 1881, naturalised, living on his own income.", { pos: wl(F220, 7.0, 3.3, -0.07), h: F220.ry + Math.PI - 0.3, kind: "sit" });
person(looks(10, "woman", { hair: 0x8a8478, waist: 0xe8e0d8, apron: false }), "Barbara Mordfeld", "Barbara Mordfeld, 46, at 220: born in Germany, came over in 1891; she speaks German.", { pos: wl(F220, 8.6, 3.3, -0.07), h: F220.ry + Math.PI + 0.3, kind: "sit" });
person(looks(11, "man", { hat: null, vest: null, braces: true }), "August Irion", "August Irion, 34, at 216: born in New York, with his wife Josephine, 43, born in Illinois, and their son Herman, 9.", { pos: wl(F216, 1.0, -1.0, -0.1), h: F216.ry + Math.PI, kind: "talk" });
person(looks(12, "woman", { apron: false }), "Josephine Irion", "Josephine Irion, 43, at 216, born in Illinois.", { pos: wl(F216, 2.2, -1.1, -0.1), h: F216.ry + Math.PI + 2.6, kind: "talk" });
person(looks(13, "boy", { s: 0.84 }), "Victor Kuntz", "Victor Kuntz, 11, from 206: his father Frank is 32, his mother Frances 31.", { path: "circle", c: ON(-36, -10), r: 2.5, speed: 1.2, kind: "walk" });
person(looks(14, "girl", { s: 0.74, skirtC: 0xd8e4ee }), "Alma Kuntz", "Alma Kuntz, 8, from 206.", { path: "circle", c: ON(-36, -10), r: 2.5, speed: 1.2, phase: 2.5, kind: "walk" });
// chairs on the porches
chairB(frame(F218.x, F218.z, F218.y - 0.05, F218.ry), 8.95, 3.35, Math.PI); chairB(frame(F218.x, F218.z, F218.y - 0.05, F218.ry), 6.6, 3.4, Math.PI - 0.4);
for (const X of [7.0, 8.6]) chairB(frame(F220.x, F220.z, F220.y - 0.07, F220.ry), X, 3.4, Math.PI);
// passers-by on the streets and on Broadway, a few soldiers from the Barracks among them; men outside the saloon at the corner
const walkRoads = ROADS.filter(([n]) => STREET_NAMES.has(n) || n === "South Broadway" || n === "Hoffmeister Avenue");
for (let k = 0; k < 34; k++) { const [n, , P] = walkRoads[(k * 7) % walkRoads.length], r = hash(k, 55), role = n === "South Broadway" && r < 0.18 ? "soldier" : r < 0.4 ? "man" : r < 0.55 ? "gent" : r < 0.75 ? "lady" : r < 0.88 ? "woman" : "boy";
  const pts = []; for (const [x, z] of P) if (Math.abs(z) < 700 && Math.abs(x) < 700) pts.push([x, z]); if (pts.length < 2) continue; const side = hash(k, 9) < 0.5 ? 1 : -1;
  person(looks(100 + k, role), null, null, { path: "poly", pts, side: side * (n === "South Broadway" ? 6.5 : 4.2), speed: 1.15 + hash(k, 4) * 0.4, off: hash(k, 8) * 1000, kind: "walk" }); }
{ const b = BROADWAY.reduce((best, p) => Math.abs(p[1] + 8) < Math.abs(best[1] + 8) ? p : best, BROADWAY[0]); for (let k = 0; k < 4; k++) person(looks(200 + k, k === 3 ? "gent" : "man"), null, null, { pos: [b[0] + 13 + (k % 2) * 1.2, ground(b[0] + 13, b[1] - 13) , b[1] - 13 + Math.floor(k / 2) * 1.1], h: k * 1.6, kind: "talk" }); }
person(looks(220, "priest"), "Father at St. Andrew's", "The pastor of St. Andrew's. The parish was founded in 1905 for \"the territory between the River Des Peres and Jefferson Barracks, east and west of Broadway. The population was predominately German, with an admixture of eight or nine other nationalities\" (Rothensteiner's history of the archdiocese). Its records from 1905 survive.", { path: "line", a: CHURCH.clone().addScaledVector(HD.n, -16).addScaledVector(HD.d, -8), b: CHURCH.clone().addScaledVector(HD.n, -16).addScaledVector(HD.d, 10), speed: 0.7, kind: "walk" });
for (let k = 0; k < 2; k++) person(looks(230 + k, "nun"), "A Sister of St. Joseph", "The Sisters of St. Joseph of Carondelet ran St. Joseph's Institute for the Deaf, here on the 1908 map just west of Broadway, and taught in the parish schools; their motherhouse is across the River Des Peres in Carondelet.", { path: "line", a: V3(INST.x + 12, 0, INST.z - 14), b: V3(INST.x + 12, 0, INST.z + 14), speed: 0.8, phase: k * 0.9, sideOff: k * 0.7, kind: "walk" });
// the household's hoop, the father's newspaper, and the neighbours' chickens
const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 28), M(0x5a4a3a)); hoop.castShadow = true; scene.add(hoop);
const paperM = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: tex(64, 86, (g, w, h) => { g.fillStyle = "#e8e2d2"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a3a3a"; g.font = "bold 7px Georgia"; g.fillText("WESTLICHE POST", 4, 9); for (let y = 14; y < h; y += 3) for (let x = 4; x < w - 4; x += 20) g.fillRect(x, y, 16, 1); }), side: THREE.DoubleSide, roughness: 0.9 })); scene.add(paperM);
const CHICK = []; { const g = new THREE.SphereGeometry(0.13, 8, 6).scale(1, 0.8, 1.3), m = M(0xf2eee4), hg = new THREE.SphereGeometry(0.06, 6, 4), cm = M(0xc82a1a); for (let k = 0; k < 11; k++) { const c = new THREE.Group(), b = new THREE.Mesh(g, m), hd = new THREE.Mesh(hg, m), cb = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.05), cm); hd.position.set(0, 0.12, 0.15); cb.position.set(0, 0.17, 0.15); b.position.y = 0.12; c.add(b, hd, cb); scene.add(c); CHICK.push({ g: c, hd, x: -20 + hash(k, 1) * 14, z: 9 + hash(k, 2) * 4, a: hash(k, 3) * 6 }); } }

// ---------- the streetcar, a buggy, a train, a steamboat ----------
function streetcar() { const g = new THREE.Group(), green = M(0x2e4a32), cream = M(0xe8dcb8), dark = M(0x1e1e1e), red = M(0x7a2a1e), wood = M(0x6a4a2e);
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  add(new THREE.BoxGeometry(2.4, 1.1, 8.2), green, 0, 1.25, 0); add(new THREE.BoxGeometry(2.42, 0.9, 8.2), cream, 0, 2.25, 0); for (let k = 0; k < 9; k++) for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.7, 0.62), dark, s * 1.215, 2.25, -3.6 + k * 0.9);
  add(new THREE.BoxGeometry(2.6, 0.14, 10.4), red, 0, 2.78, 0); add(new THREE.BoxGeometry(1.4, 0.35, 7.6), red, 0, 3.0, 0); for (const z of [-4.65, 4.65]) { add(new THREE.BoxGeometry(2.2, 0.08, 1.4), wood, 0, 0.72, z); add(new THREE.BoxGeometry(2.2, 0.9, 0.06), green, 0, 1.2, z + Math.sign(z) * 0.7); for (const x of [-1.0, 1.0]) add(new THREE.CylinderGeometry(0.03, 0.03, 2.0, 6), dark, x, 1.75, z + Math.sign(z) * 0.7); }
  for (const z of [-2.6, 2.6]) for (const x of [-0.75, 0.75]) add(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 14).rotateZ(Math.PI / 2), dark, x, 0.42, z); add(new THREE.BoxGeometry(2.0, 0.3, 8), dark, 0, 0.62, 0);
  const pole = add(new THREE.CylinderGeometry(0.03, 0.03, 4.6, 6), dark, 0, 4.6, 2.2); pole.rotation.x = -0.88; scene.add(g); return g; }
const CARS = [{ g: streetcar(), s: 200, dir: 1, wait: 0 }, { g: streetcar(), s: 1400, dir: -1, wait: 0 }];
const BW_LEN = (() => { let L = 0; for (let i = 0; i < BROADWAY.length - 1; i++) L += Math.hypot(BROADWAY[i + 1][0] - BROADWAY[i][0], BROADWAY[i + 1][1] - BROADWAY[i][1]); return L; })();
function alongPts(P, s) { let i = 0; while (i < P.length - 2) { const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); if (s <= L) break; s -= L; i++; } const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) || 1, f = clampN(s / L, 0, 1);
  return [P[i][0] + (P[i + 1][0] - P[i][0]) * f, P[i][1] + (P[i + 1][1] - P[i][1]) * f, Math.atan2(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1])]; }
const ETTA_S = (() => { let best = 0, bd = 1e9, acc = 0; for (let i = 0; i < BROADWAY.length - 1; i++) { const d = Math.hypot(BROADWAY[i][0] + 300, BROADWAY[i][1] + 10); if (d < bd) { bd = d; best = acc; } acc += Math.hypot(BROADWAY[i + 1][0] - BROADWAY[i][0], BROADWAY[i + 1][1] - BROADWAY[i][1]); } return best; })();
for (const C of CARS) { C.motor = person(looks(240 + CARS.indexOf(C), "crew"), "A motorman of the United Railways", "The Barracks line (route 43) ran from downtown St. Louis down Broadway through Carondelet, over the River Des Peres and through Luxemburg to Jefferson Barracks, from 1896 until 1932. \"As we ride south in the Barracks car, we pass on our left the beautiful Odd Fellows' Cemetery, and on our right Mount St. Rose hospital\" (the county history of 1911). Richard Fraundorf may well have ridden it to the bakery in the city.", { onCar: C, kind: "guard" }); }
function horse(col = 0x5a3a24) { const g = new THREE.Group(), m = M(col), d = M(0x1a1410), add = (geo, mm, x, y, z, rx = 0) => { const me = new THREE.Mesh(geo, mm); me.position.set(x, y, z); me.rotation.x = rx; me.castShadow = true; g.add(me); return me; };
  add(new THREE.CylinderGeometry(0.32, 0.3, 1.5, 10).rotateX(Math.PI / 2), m, 0, 1.25, 0); add(new THREE.CylinderGeometry(0.16, 0.24, 0.8, 8), m, 0, 1.65, 0.85, 0.7); add(new THREE.BoxGeometry(0.2, 0.22, 0.55), m, 0, 1.9, 1.25, 0.3); const legs = [];
  for (const [x, z] of [[-0.18, 0.6], [0.18, 0.6], [-0.18, -0.6], [0.18, -0.6]]) { const l = new THREE.Group(); l.position.set(x, 1.05, z); const me = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.0, 6).translate(0, -0.5, 0), m); me.castShadow = true; l.add(me); g.add(l); legs.push(l); }
  add(new THREE.CylinderGeometry(0.03, 0.06, 0.6, 6), d, 0, 1.25, -0.9, -0.6); return { g, legs }; }
function buggy() { const g = new THREE.Group(), H = horse(), blk = M(0x1a1a1a), add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; }; H.g.position.z = 1.9; g.add(H.g);
  add(new THREE.BoxGeometry(1.2, 0.35, 1.6), blk, 0, 0.95, -0.4); add(new THREE.BoxGeometry(1.1, 0.5, 0.15), blk, 0, 1.35, -1.1); for (const [x, z, r] of [[-0.7, 0.2, 0.42], [0.7, 0.2, 0.42], [-0.7, -1.0, 0.55], [0.7, -1.0, 0.55]]) add(new THREE.TorusGeometry(r, 0.025, 4, 18).rotateY(Math.PI / 2), blk, x, r, z);
  for (const x of [-0.4, 0.4]) add(new THREE.BoxGeometry(0.04, 0.04, 2.2), blk, x, 1.0, 1.3); scene.add(g); return { g, legs: H.legs }; }
const BUGGY = { ...buggy(), s: 600, dir: -1 }; BUGGY.driver = person(looks(250, "gent"), null, null, { onBuggy: BUGGY, kind: "sit" });
// the train: a ten-wheeler and four coaches on the Iron Mountain, every few minutes, one way and then the other
const RAIL_LEN = (() => { let L = 0; for (let i = 0; i < RAILP.length - 1; i++) L += Math.hypot(RAILP[i + 1][0] - RAILP[i][0], RAILP[i + 1][1] - RAILP[i][1]); return L; })();
const TRAIN = (() => { const cars = [], blk = M(0x1a1a1c, { roughness: 0.6 }), grn = M(0x2a3a2a), red = M(0x6a2a1e);
  const loco = new THREE.Group(), add = (g, geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; g.add(me); return me; };
  add(loco, new THREE.CylinderGeometry(0.8, 0.8, 7.5, 14).rotateX(Math.PI / 2), blk, 0, 2.3, 0.8); add(loco, new THREE.CylinderGeometry(0.28, 0.4, 1.2, 10), blk, 0, 3.6, 3.6); add(loco, new THREE.BoxGeometry(2.6, 2.4, 2.4), blk, 0, 2.6, -3.6); add(loco, new THREE.BoxGeometry(2.8, 0.15, 2.8), red, 0, 3.85, -3.6);
  for (const z of [-1.4, 0.2, 1.8]) for (const x of [-0.8, 0.8]) add(loco, new THREE.CylinderGeometry(0.75, 0.75, 0.15, 16).rotateZ(Math.PI / 2), red, x, 0.85, z); add(loco, new THREE.SphereGeometry(0.35, 8, 6), blk, 0, 3.15, 1.4); scene.add(loco); cars.push({ g: loco, len: 11 });
  const tender = new THREE.Group(); add(tender, new THREE.BoxGeometry(2.8, 2.0, 6), blk, 0, 2.0, 0); scene.add(tender); cars.push({ g: tender, len: 7 });
  for (let k = 0; k < 4; k++) { const c = new THREE.Group(); add(c, new THREE.BoxGeometry(2.9, 2.6, 18), grn, 0, 2.4, 0); add(c, new THREE.BoxGeometry(3.0, 0.3, 18.4), blk, 0, 3.85, 0); add(c, new THREE.BoxGeometry(1.6, 0.4, 16), blk, 0, 4.15, 0); for (let w = 0; w < 12; w++) for (const s of [-1, 1]) add(c, new THREE.BoxGeometry(0.02, 0.8, 0.7), M(0xe8d890, { emissive: 0x000000 }), s * 1.46, 2.7, -7.6 + w * 1.4); scene.add(c); cars.push({ g: c, len: 19.5 }); }
  return { cars, t: 40, dir: 1, smoke: [] }; })();
const SMOKE = []; { const t = tex(64, 64, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); r.addColorStop(0, "rgba(90,90,90,0.8)"); r.addColorStop(1, "rgba(90,90,90,0)"); g.fillStyle = r; g.fillRect(0, 0, w, h); }); for (let k = 0; k < 24; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0 })); scene.add(sp); SMOKE.push({ sp, age: 99 }); } }
// a sternwheel packet boat working up the Mississippi
const BOAT = (() => { const g = new THREE.Group(), w = M(0xf2efe6), d = M(0x2a2a2a), r = M(0x8a2a1e), add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
  add(new THREE.BoxGeometry(11, 1.4, 52), w, 0, 0.7, 0); add(new THREE.BoxGeometry(10, 2.4, 40), w, 0, 2.6, 2); add(new THREE.BoxGeometry(8, 2.2, 28), w, 0, 4.9, 4); add(new THREE.BoxGeometry(3.5, 2, 4), w, 0, 7, 10); for (const x of [-2, 2]) { add(new THREE.CylinderGeometry(0.45, 0.5, 12, 10), d, x, 10, 16); add(new THREE.CylinderGeometry(0.7, 0.45, 0.6, 10), d, x, 16.2, 16); }
  const wheel = add(new THREE.CylinderGeometry(3.2, 3.2, 9, 16, 1, true).rotateZ(Math.PI / 2), r, 0, 2.6, -28.5); g.position.set(1260, WATER_Y, 2600); scene.add(g); return { g, wheel }; })();

// ---------- what is known, and what is not: the info points ----------
const INFO = [], infoTex = tex(64, 64, (g, w, h) => { g.fillStyle = "#1e3a5a"; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill(); g.strokeStyle = "#f4e8c8"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#f4e8c8"; g.font = "bold 36px Georgia"; g.textAlign = "center"; g.fillText("i", 32, 44); });
function info(pos, title, text) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: infoTex, depthTest: true })); sp.scale.setScalar(0.26); sp.position.copy(pos); scene.add(sp); INFO.push({ pos, title, text, sp }); }
const L218 = (X, Z, y = 1.6) => toWorld(F218, X, y, Z);
info(ON(4.8, -6.5).setY(ground(ON(4.8, -6.5).x, ON(4.8, -6.5).z) + 1.8), "218 Etta Avenue, 1910", "Known from the Sanborn fire insurance map of 1908: a frame (wooden) house of 1 1/2 storeys with a shingle roof, L-shaped: a front-gabled wing 17 ft 8 in wide and 29 ft 6 in deep at the west side of the lot, 11 ft back from the street, and a side wing 14 ft 5 in by 16 ft 6 in to the east with a one-storey porch in the corner. The lot is 52 by 126 ft, with a one-storey shed (tar-paper roof) near the back. From the photographs: narrow clapboards, light paint, turned porch columns with groups of rings, tall windows with moulded heads. The steep roof and scalloped gable trim follow the photographs of 2010-2013 (the house was replaced in 2016). Not known: the colours, the number and exact places of the windows, the inside.");
info(L218(0.35, 0.5, 2.3), "The parlour", "The best room, kept for Sundays and visitors. Its look follows the family's own photographs taken in such a room around 1910-1912: dark wallpaper with a small flowered pattern, a large framed picture of a woman (perhaps a holy picture), an ornate dark-framed mirror, an upholstered settee, a dark dresser with a light marble top, a pair of horn-shaped vases and a crocheted doily. Whether those photographs were taken in this house is not known. No plan of the house survives: the arrangement of the rooms is the usual one for a cottage of this shape.");
info(L218(5.15, 8.7, 2.2), "The kitchen", "Typical, not known: a cast-iron range burning wood or coal, its pipe into the chimney (the Sanborn does not show chimneys; the brick chimney on the ridge is in the modern photographs). Out here in the county in 1910 there was no city water, gas or sewer: water came from the cistern by the back door (rain off the roof) and its pitcher pump, light from kerosene lamps, and the privy was out back. Richard was a bread baker, so there is bread on the table.");
info(L218(1.0, 4.6, UP_INFO() + 0.5), "Upstairs", "A storey and a half: the walls rise a metre above the upstairs floor and the rooms tuck in under the steep roof, plastered on the underside of the rafters. Seven people lived in the house in 1910 (and soon eight): the children upstairs, probably the girls together, the parents downstairs with the youngest. Hot in a St. Louis June.");
info(toWorld(F218, 8.2, 2.0, 23.6), "The shed and privy", "The Sanborn shows a one-storey shed here, about 14 by 9 ft, with a composition (tar-paper) roof. Every house in Luxemburg had a privy; what else the shed held (coal, wood, tools, a wash kettle) is a guess.");
info(ON(20, 1.5).setY(ground(ON(20, 1.5).x, ON(20, 1.5).z) + 2), "220, next door", "On the Sanborn, 220 has the same L-shaped plan, porch and size as 218, probably built by the same hand, with a one-storey kitchen added behind and a two-storey stable between two sheds at the back of the lot. In 1910 William and Barbara Mordfeld lived here.");
info(ON(-16, 13).setY(ground(ON(-16, 13).x, ON(-16, 13).z) + 2.4), "The chicken house", "Marked \"CHICKEN HO.\" on the 1908 Sanborn, 52 ft long: someone on the block kept a good many hens. Chickens, a cow or a horse in a stable, and big vegetable gardens were usual on these county lots.");
info(ON(-20, -11).setY(ground(ON(-20, -11).x, ON(-20, -11).z) + 1.8), "Etta Avenue", "A dirt street 50 ft wide in the subdivision of East Hancock Place, from South Broadway east to Hoffmeister Avenue. This was unincorporated St. Louis County, just south of the city limit at the River Des Peres: \"the territory to the left has been facetiously named Buttermilk Hill; to the right it is known as Luxemburg, a thrifty settlement\" (the county history of 1911). The neighbouring streets of 1908 have since been renamed: Cleveland is Cartwright, Virginia is Velma, Hancock is Holden, Louise is Loretta, Florence is Felton.");
{ const b = BROADWAY.reduce((best, p) => Math.abs(p[1] + 30) < Math.abs(best[1] + 30) ? p : best, BROADWAY[0]); info(V3(b[0] + 7, ground(b[0] + 7, b[1]) + 2, b[1]), "South Broadway and the Barracks car", "The old road to Jefferson Barracks, three kilometres south. Down it ran the Barracks line of the United Railways, route 43, from 1896 to 1932, the car (drawn here as typical of the time) running every few minutes. Stores, saloons and houses lined it; their details here are typical, not traced."); }
info(CHURCH.clone().addScaledVector(HD.n, -18).setY(ground(CHURCH.x, CHURCH.z) + 2), "St. Andrew's", "The parish of St. Andrew, founded in 1905. The 1909 Sanborn shows the church here on Hoffmeister Avenue by Military Road: frame (wood), about 39 by 84 ft, 28 ft to the eaves, heated by a furnace and lit by lamps, with the priest's house beside it. The Fraundorfs were Catholic, and this was their parish (its baptism records begin in 1905). Its belfry and windows are typical; the brick Romanesque church that stands now came later.");
info(V3(INST.x + 14, ground(INST.x + 14, INST.z) + 2, INST.z + 18), "St. Joseph's Institute for the Deaf", "On the 1908 Sanborn index this block, west of Broadway between Cleveland and Etta, belongs to St. Joseph's Institute for the Deaf, run by the Sisters of St. Joseph of Carondelet. The building is drawn as a typical brick institution; its true form was not traced.");
info(V3(330, ground(330, 40) + 1.8, 40), "The bluff and the river bottoms", "Here the upland falls 13 m to the bottoms of the Mississippi (from the USGS elevation model). Below runs the Iron Mountain railroad (1858; later the Missouri Pacific) and beyond it, a kilometre off, the river; to the north the River Des Peres winds to its mouth (it flooded in August 1915; it was straightened into a channel in the 1920s-30s). Today a sewage works fills these bottoms.");

// ---------- moving about ----------
function UP_INFO() { return P218.UP + 1.6; }
const ME = { x: 0, y: 0, z: 0, vy: 0 }; let yaw = 0, pitch = -0.05, vrYaw = 0, started = false, msgT = 0, rateI = 0; const keys = {}, RATES = [1, 60, 600];
const PLACES = [["In front of 218", () => ON(4.8, -10), Math.PI], ["On the porch", () => L218(8.0, 3.3, 0), 0], ["The parlour", () => L218(3.6, 3.7, 0), 0.75], ["The kitchen", () => L218(1.6, 8.2, 0), -Math.PI / 2],
  ["Upstairs, the girls' room", () => L218(2.7, 3.9, P218.UP), 0], ["The back yard", () => ON(8, 19), 0], ["Broadway at Etta", () => { const b = BROADWAY.reduce((best, p) => Math.abs(p[1] + 8) < Math.abs(best[1] + 8) ? p : best, BROADWAY[0]); return V3(b[0] + 6, 0, b[1] - 6); }, -Math.PI / 2],
  ["St. Andrew's", () => CHURCH.clone().addScaledVector(HD.n, -30).addScaledVector(HD.d, -8), Math.atan2(-HD.n.x, -HD.n.z) + 0.25], ["The bluff above the bottoms", () => V3(305, 0, 40), -Math.PI / 2]]; let placeI = 0;
const floorAt = (x, z, yRef) => { let best = ground(x, z); for (const R of FLOORS) { const [lx, lz] = toLocal(R, x, z); if (lx < R.x0 || lx > R.x1 || lz < R.z0 || lz > R.z1) continue; if (R.holes.some(([a, b, c, d]) => lx > a && lx < c && lz > b && lz < d)) continue;
    const y = R.y2 === null ? R.y : R.along === "x" ? lerpN(R.y, R.y2, (lx - R.x0) / (R.x1 - R.x0)) : lerpN(R.y, R.y2, (lz - R.z0) / (R.z1 - R.z0)); if (y <= yRef + 0.45 && y > best) best = y; } return best; };
function goPlace(i) { placeI = (i + PLACES.length) % PLACES.length; const [n, f, h] = PLACES[placeI], p = f(); ME.x = p.x; ME.z = p.z; ME.y = floorAt(p.x, p.z, (p.y ? p.y : ground(p.x, p.z)) + 0.1); yaw = h + F218.ry; pitch = -0.05; vrYaw = yaw; say(`<b>${n}</b>`); }
function moveTo(nx, nz) { const r = 0.26; let x = nx, z = nz;
  for (let it = 0; it < 3; it++) { for (const w of WALLS) { if (ME.y + 1.7 < w.y0 || ME.y > w.y1 - 0.2) continue; if (Math.max(w.ax, w.bx) < x - 1 || Math.min(w.ax, w.bx) > x + 1 || Math.max(w.az, w.bz) < z - 1 || Math.min(w.az, w.bz) > z + 1) continue;
      const dx = w.bx - w.ax, dz = w.bz - w.az, L2 = dx * dx + dz * dz || 1, t = clampN(((x - w.ax) * dx + (z - w.az) * dz) / L2, 0, 1), px = w.ax + t * dx, pz = w.az + t * dz, d = Math.hypot(x - px, z - pz); if (d < r && d > 1e-6) { x = px + (x - px) / d * r; z = pz + (z - pz) / d * r; } }
    for (const S of SOLIDS) { if (ME.y > S.y1 || ME.y < S.y0 - 1) continue; const [lx, lz] = toLocal(S, x, z); if (lx < S.x0 - r || lx > S.x1 + r || lz < S.z0 - r || lz > S.z1 + r) continue;
      const pen = [[lx - (S.x0 - r), -1, 0], [S.x1 + r - lx, 1, 0], [lz - (S.z0 - r), 0, -1], [S.z1 + r - lz, 0, 1]].sort((a, b) => a[0] - b[0])[0]; const ox = pen[1] * pen[0], oz = pen[2] * pen[0];
      x += ox * S.c + oz * S.s; z += -ox * S.s + oz * S.c; } }
  ME.x = x; ME.z = z; }
// the message box, and in VR a panel before your eyes
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:700px;z-index:2;background:rgba(30,22,12,.88);color:#f6ecd8;font:14.5px/1.5 Georgia,serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const CLOCK = document.createElement("div"); CLOCK.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(30,22,12,.75);color:#f6ecd8;font:13px Georgia,serif;padding:6px 10px;border-radius:8px;display:none"; document.body.appendChild(CLOCK);
const vrPanelT = tex(1024, 512, () => { }), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ map: vrPanelT, transparent: true, depthTest: false })); vrPanel.position.set(0, -0.15, -0.9); vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
function say(html, secs = 18) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; const g = vrPanelT.image.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(30,22,12,0.9)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#f6ecd8"; g.font = "28px Georgia";
  const words = html.replace(/<[^>]+>/g, "").split(" "); let line = "", y = 50; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 36; if (y > 490) break; } line += w + " "; } if (y <= 490) g.fillText(line, 32, y); vrPanelT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
function readNearest() { let best = null, bd = 6; for (const I of INFO) { const d = Math.hypot(I.pos.x - ME.x, I.pos.z - ME.z) + Math.abs(I.pos.y - ME.y - 1.6) * 0.5; if (d < bd) { bd = d; best = ["i", I]; } }
  for (const p of PEOPLE) { if (!p.name || !p.at) continue; const d = Math.hypot(p.at[0] - ME.x, p.at[2] - ME.z) + Math.abs(p.at[1] - ME.y) * 0.5; if (d < Math.min(bd, 3.5)) { bd = d; best = ["p", p]; } }
  if (!best) { say("Nothing to read here. Walk up to a blue <b>i</b>, or to one of the people (the family and the neighbours named in the census)."); return; }
  if (best[0] === "i") say(`<b>${best[1].title}</b><br>${best[1].text}`, 40); else say(`<b>${best[1].name}</b><br>${best[1].info}`, 40); }
function setRate(i) { rateI = (i + RATES.length) % RATES.length; say(`Time: ${["real time", "a minute a second", "ten minutes a second"][rateI]}.`); }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") readNearest(); if (e.code === "KeyT") setRate(rateI + 1); if (/^Digit[1-9]$/.test(e.code)) goPlace(+e.code.slice(5) - 1); if (e.code === "KeyN") goPlace(placeI + 1); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); CLOCK.style.display = "block"; goPlace(0);
  say("<b>Sunday, 19 June 1910, five in the afternoon.</b> 218 Etta Avenue, in the Luxemburg district of St. Louis County, just south of the city. Richard Fraundorf is reading on the porch; Louisa is making supper; the children are out in the yard and the street. Walk in (the front door is on the porch), up the stairs, round the yard and the streets. <b>E</b> reads the blue <b>i</b> points or tells you about a person; <b>1</b>-<b>9</b> jump to places; <b>T</b> speeds up time.", 30); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr"), prevB = {};
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- lamplight after dark ----------
const LAMPL = LAMPS.concat([[F218, 3.7, 1.3, 8.2], [F218, 7.6, 1.4, 5.2]]).map(([F, x, y, z]) => { const L = new THREE.PointLight(0xffc070, 0, 9, 1.6); L.position.copy(toWorld(F, x, y, z)); scene.add(L); return L; });
const DAYL = [[2.7, 2.2, 2.2], [2.7, 2.2, 5.6], [2.7, 2.2, 7.9], [7.6, 2.2, 5.2], [7.6, 2.2, 7.8], [2.7, UP_INFO() + 0.6, 2.5], [2.7, UP_INFO() + 0.6, 7.0], [7.6, UP_INFO() + 0.6, 7.5]].map(([x, y, z]) => { const L = new THREE.PointLight(0xfff4e4, 0, 7, 1.5); L.position.copy(toWorld(F218, x, y, z)); scene.add(L); return L; });
flushBK();

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0;
function pathPos(p, t) { if (p.pos) return [p.pos[0], p.pos[1], p.pos[2], p.h];
  if (p.path === "circle") { const a = t * p.speed / p.r + (p.phase || 0), x = p.c[0] + Math.cos(a) * p.r, z = p.c[2] + Math.sin(a) * p.r; return [x, ground(x, z), z, -a + (p.speed > 0 ? 0 : Math.PI)]; }
  if (p.path === "line") { const L = Math.hypot(p.b.x - p.a.x, p.b.z - p.a.z), s = ((t * p.speed + (p.phase || 0) * L) % (2 * L) + 2 * L) % (2 * L), f = s < L ? s / L : 2 - s / L, x = p.a.x + (p.b.x - p.a.x) * f + (p.sideOff || 0), z = p.a.z + (p.b.z - p.a.z) * f; return [x, ground(x, z), z, Math.atan2((p.b.x - p.a.x) * (s < L ? 1 : -1), (p.b.z - p.a.z) * (s < L ? 1 : -1))]; }
  if (p.path === "poly") { if (!p.len) { p.len = 0; for (let i = 0; i < p.pts.length - 1; i++) p.len += Math.hypot(p.pts[i + 1][0] - p.pts[i][0], p.pts[i + 1][1] - p.pts[i][1]); } const s0 = ((t * p.speed + p.off) % (2 * p.len) + 2 * p.len) % (2 * p.len), fw = s0 < p.len, s = fw ? s0 : 2 * p.len - s0;
    const [x, z, a] = alongPts(p.pts, s), sx = x + Math.cos(a) * p.side * (fw ? 1 : -1), sz = z - Math.sin(a) * p.side * (fw ? 1 : -1); return [sx, ground(sx, sz), sz, fw ? a : a + Math.PI]; } return [0, 0, 0, 0]; }
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++; T += dt; if (started) hour = Math.min(23.9, hour + dt * RATES[rateI] / 3600);
  const sd = updateSky(); const night = clampN((0.02 - sd.y) / 0.08, 0, 1); for (const L of LAMPL) L.intensity = 2.2 * night; for (const L of DAYL) L.intensity = 0.9 * (1 - night) + 0.05;
  // you
  let mx = 0, my = 0, run = false, snap = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) setRate(rateI + 1); prevB.x = bX; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.a) readNearest(); prevB.a = bA; if (bB && !prevB.b) goPlace(placeI + 1); prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; }
  if (started && (mx || my)) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sdv = V3(-f.z, 0, f.x), sp = (run ? 4.2 : 1.6) * dt; moveTo(ME.x + (f.x * -my + sdv.x * mx) * sp, ME.z + (f.z * -my + sdv.z * mx) * sp); }
  { const fy = floorAt(ME.x, ME.z, ME.y); if (fy >= ME.y - 0.02) { ME.y = fy; ME.vy = 0; } else { ME.vy -= 9.8 * dt; ME.y = Math.max(fy, ME.y + ME.vy * dt); } }
  rig.position.set(ME.x, ME.y, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  sunL.position.set(ME.x + sd.x * 200, ME.y + Math.max(sd.y, 0.05) * 200, ME.z + sd.z * 200); sunL.target.position.set(ME.x, ME.y, ME.z); sky.position.copy(rig.position);
  // the streetcars (a stop at Etta), the buggy, the train, the boat
  for (const C of CARS) { if (C.wait > 0) C.wait -= dt; else { const before = C.s; C.s += C.dir * 7 * dt; if ((before - ETTA_S) * (C.s - ETTA_S) < 0) C.wait = 15; if (C.s > BW_LEN - 6) { C.s = BW_LEN - 6; C.dir = -1; C.wait = 30; } if (C.s < 6) { C.s = 6; C.dir = 1; C.wait = 30; } }
    const [x, z, a] = alongPts(BROADWAY, C.s); C.g.position.set(x, ground(x, z) + 0.1, z); C.g.rotation.y = a + (C.dir < 0 ? Math.PI : 0); }
  { BUGGY.s += BUGGY.dir * 2.6 * dt; if (BUGGY.s > BW_LEN - 10 || BUGGY.s < 10) BUGGY.dir *= -1; const [x, z, a] = alongPts(BROADWAY, BUGGY.s), ox = Math.cos(a) * 3.2 * BUGGY.dir, oz = -Math.sin(a) * 3.2 * BUGGY.dir; BUGGY.g.position.set(x + ox, ground(x + ox, z + oz), z + oz); BUGGY.g.rotation.y = a + (BUGGY.dir < 0 ? Math.PI : 0);
    BUGGY.legs.forEach((l, k) => l.rotation.x = 0.45 * Math.sin(T * 6 + (k % 3 ? Math.PI : 0) + (k > 1 ? 0.6 : 0))); }
  { const TR = TRAIN; TR.t -= dt; if (TR.t < 0) { const head = TR.s ?? 0; TR.s = (TR.s ?? (TR.dir > 0 ? 0 : RAIL_LEN)) + TR.dir * 14 * dt; if (TR.s > RAIL_LEN + 30 || TR.s < -100) { TR.dir *= -1; TR.t = 150; TR.s = TR.dir > 0 ? -60 : RAIL_LEN + 20; } }
    let s = TR.s ?? -999; for (const c of TR.cars) { const sc = clampN(s - c.len / 2 * TR.dir, 0, RAIL_LEN), [x, z, a] = alongPts(RAILP, sc), on = TR.t < 0 && s > -50 && s < RAIL_LEN + 50; c.g.visible = on; c.g.position.set(x, ground(x, z) + 0.58, z); c.g.rotation.y = a + (TR.dir < 0 ? Math.PI : 0); s -= c.len * TR.dir; }
    if (TR.t < 0 && frameN % 6 === 0) { const S = SMOKE.find(q => q.age > 4); if (S) { const L0 = TR.cars[0].g; S.age = 0; S.sp.position.copy(L0.position).add(V3(Math.sin(L0.rotation.y) * 3.6, 4.4, Math.cos(L0.rotation.y) * 3.6)); } } }
  for (const S of SMOKE) { S.age += dt; S.sp.position.y += dt * 1.6; S.sp.scale.setScalar(1.5 + S.age * 2.2); S.sp.material.opacity = Math.max(0, 0.55 - S.age * 0.13); }
  { BOAT.g.position.z -= dt * 2.2; if (BOAT.g.position.z < -3500) BOAT.g.position.z = 3500; BOAT.wheel.rotation.x -= dt * 1.2; }
  for (const c of CHICK) { c.a += dt * (0.3 + 0.2 * Math.sin(T + c.x)); const pz = c.z + Math.sin(c.a) * 1.5, px = c.x + Math.cos(c.a * 0.7) * 2, w = ON(px, pz); c.g.position.set(w.x, ground(w.x, w.z), w.z); c.g.rotation.y = c.a; c.hd.position.y = 0.12 - 0.08 * Math.max(0, Math.sin(T * 3 + c.x * 5)); }
  // the people
  for (const p of PEOPLE) { let x, y, z, h; if (p.onCar) { const g = p.onCar.g, v = V3(0.5, 0.7, 4.7).applyQuaternion(g.quaternion).add(g.position); x = v.x; y = v.y; z = v.z; h = g.rotation.y; }
    else if (p.onBuggy) { const g = p.onBuggy.g, v = V3(0.25, 0.5, -0.4).applyQuaternion(g.quaternion).add(g.position); x = v.x; y = v.y; z = v.z; h = g.rotation.y; }
    else [x, y, z, h] = pathPos(p, T + p.t0); p.at = [x, y, z]; if (Math.hypot(x - ME.x, z - ME.z) > 220) { crowd.hide(p.i); continue; } crowd.set(p.i, x, y, z, h, p.kind, T + p.t0, p.kind === "walk" || p.kind === "dance" ? 1 : 0);
    if (p.hoop) { hoop.position.set(x + Math.cos(h) * 0.5, y + 0.34, z - Math.sin(h) * 0.5); hoop.rotation.set(0, h + Math.PI / 2, 0); hoop.rotateX(T * 4.7); }
    if (p.paper) { paperM.position.set(x + Math.sin(h) * 0.42, y + 1.0, z + Math.cos(h) * 0.42); paperM.rotation.set(-0.3, h, 0, "YXZ"); } }
  crowd.done();
  for (const I of INFO) { const d = Math.hypot(I.pos.x - ME.x, I.pos.z - ME.z); I.sp.visible = d < 60 && d > 1.2; }
  if (frameN % 15 === 0) { const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60); CLOCK.textContent = `Sunday 19 June 1910 · ${hh > 12 ? hh - 12 : hh}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "pm" : "am"}${rateI ? " (fast)" : ""}`; }
  msgT -= dt; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
