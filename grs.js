// grs.js -- fall into Jupiter's Great Red Spot, from 12,000 km up to the storm's roots ~300 km below the clouds.
// Built into great_red_spot.html by build.py. A hypothetical observer: nothing has ever descended into the spot.
//
// Depth z is km below the 1-bar level (negative = above). Below ~0.01 bar the atmosphere follows the same fit as
// the Galileo page (T = 166 K p^0.304, z = 80.7 km (p^0.3 − 1), fall speed ∝ 1/√density); above that it thins with
// a ~25 km scale height. The cloud decks are those expected for an upwelling region like the spot (Galileo, which
// fell into a dry hot spot, missed them); the red haze sits above the ammonia cloud; Juno's microwave and gravity
// data put the storm's roots ~300-500 km down.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.5, 1.2e8);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.65;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const R = 71492e3;                                          // Jupiter's radius, m

// ---------- the atmosphere ----------
const Z_TOP = -12000, Z_B = -60, Z_END = 300;                // km: start, where the slow physical fall begins, the storm's roots
const pOfZ = z => z < Z_B ? 0.01 * Math.exp((z - Z_B) / 25) : Math.pow(1 + z / 80.7, 1 / 0.3);
const zAt = p => 80.7 * (Math.pow(p, 0.3) - 1);
const tempK = p => p < 0.1 ? 110 + 60 * Math.max(0, Math.log10(0.1 / Math.max(p, 1e-9))) / 4 : 166 * Math.pow(p, 0.304);
const vAt = p => 74.4 * Math.pow(p, -0.35);
const DECKS = [   // what the spot is made of, top to bottom: name, top and bottom pressure (bar), optical depth, colour of the cloud, red-haze absorption
  { name: "the red haze", p0: 0.15, p1: 0.35, tau: 0.6, tint: [232, 140, 96], chrom: true, sheets: 3, cover: 0.5, fog: 0.00002 },
  { name: "the ammonia-ice cloud", p0: 0.4, p1: 0.9, tau: 4, tint: [250, 244, 236], sheets: 4, cover: 1.0, fog: 0.0011 },
  { name: "the ammonium hydrosulfide cloud", p0: 1.5, p1: 2.6, tau: 5, tint: [236, 222, 200], sheets: 4, cover: 1.0, fog: 0.0009 },
  { name: "the water cloud", p0: 4.5, p1: 7.0, tau: 10, tint: [240, 242, 246], sheets: 4, cover: 1.0, fog: 0.0014 }];
const crossed = (p, d) => Math.min(1, Math.max(0, Math.log(p / d.p0) / Math.log(d.p1 / d.p0)));
const inDeck = p => DECKS.find(d => p > d.p0 && p < d.p1);
const Z_CAP = zAt(0.4);                                     // the top of the ammonia cloud: the spot's visible 'surface' (−19 km)

// ---------- light in three bands (blue, green, red), as on the Galileo page plus clouds and the red haze ----------
const KR = [0.24, 0.10, 0.045], KCH4 = [0, 0.001, 0.004], MU0 = 0.7, SUNW = [0.90, 0.97, 1.0];   // SUNW in b, g, r
function lightAt(p) {
  const out = { direct: [], down: [], diffuse: [], up: [] };
  let tc = 0; for (const d of DECKS) tc += d.tau * crossed(p, d);
  const red = DECKS[0], cr = crossed(p, red), chrom = [0.08 + 0.9 * cr, 0.04 + 0.45 * cr, 0.01 + 0.06 * cr];   // the red haze eats blue and green
  for (let i = 0; i < 3; i++) { const tr = KR[i] * p, ta = KCH4[i] * p + chrom[i], teff = tr + 0.15 * tc;   // clouds scatter mostly forward (g ≈ 0.85)
    const direct = Math.exp(-(tr + ta + tc) / MU0), down = Math.exp(-1.66 * ta) / (1 + 0.75 * teff);
    const w = KR[i] / (KR[i] + KCH4[i] + 0.004), g = Math.sqrt(1 - w), alb = Math.max((1 - g) / (1 + g), p < 7 ? 0.85 : 0);   // thick cloud below is white
    out.direct[i] = direct; out.down[i] = Math.max(down, direct); out.diffuse[i] = down * (1 - Math.exp(-0.9 * teff / MU0)); out.up[i] = alb * down * (i === 0 ? 0.9 : 1); }
  out.L = out.down[1]; return out; }
// the bands are stored blue, green, red; brightness compressed as the eyes adapt partly; tints softened ~30%
const tone = (bgr, k = 1) => { const rgb = [bgr[2], bgr[1], bgr[0]], lum = (rgb[0] + rgb[1] + rgb[2]) / 3 + 1e-6, b = k * Math.pow(lum, 0.55) / lum;
  const c = rgb.map((v, i) => v * SUNW[2 - i] * b), m = (c[0] + c[1] + c[2]) / 3;
  return new THREE.Color().setRGB(...c.map(v => m + 0.7 * (v - m)), THREE.LinearSRGBColorSpace); };

// ---------- sky, Sun and stars ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, down: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor, down; varying vec3 vp; void main(){ float y = vp.y; vec3 c = y > 0.0 ? mix(hor, up, pow(y, 0.6)) : mix(hor, down, pow(-y, 0.5)); gl_FragColor = vec4(c, 1.0); \n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });   // convert to screen colour like every other material
const sky = new THREE.Mesh(new THREE.SphereGeometry(1e8, 48, 24), skyMat); sky.renderOrder = -2; scene.add(sky);
const stars = (() => { const n = 2500, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const y = rnd() * 2 - 1, f = rnd() * 6.283, r = Math.sqrt(1 - y * y); a.set([r * Math.cos(f) * 9e7, Math.abs(y) * 9e7, r * Math.sin(f) * 9e7], i * 3); }
  return new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(a, 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })); })();
stars.renderOrder = -1; scene.add(stars);
scene.fog = new THREE.FogExp2(0x000000, 0);
const sun = new THREE.DirectionalLight(0xffffff, 3); sun.position.set(0.5, 0.7, -0.45); scene.add(sun);
const amb = new THREE.HemisphereLight(0x888888, 0x444444, 0.6); scene.add(amb);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: false, toneMapped: false, depthWrite: false }));
scene.add(sunDisc);

// ---------- the planet seen from above: the spot and the bands around it, painted on a 60,000 km cap ----------
const HALF = 45000e3, CAPN = IS_HEADSET ? 96 : 160;
function spotTexture() {
  const N = 2048, c = document.createElement("canvas"); c.width = c.height = N; const g = c.getContext("2d"), km = N / (2 * HALF / 1000), cx = N / 2, cy = N / 2;
  const band = (lat0, lat1, col) => { g.fillStyle = col; g.fillRect(0, cy - (lat1 + 22) * 1248 * km, N, (lat1 - lat0) * 1248 * km); };   // lat in degrees, spot at −22°
  g.fillStyle = "#e2d2b4"; g.fillRect(0, 0, N, N);
  band(-20, -7, "#b98a5e"); band(-7, 5, "#efe2c4"); band(-36, -28, "#a8805e"); band(-28, -24, "#ece0c8"); band(-46, -36, "#d8c6a6");
  for (let k = 0; k < 2600; k++) { const x = rnd() * N, y = rnd() * N, w = 20 + rnd() * 220, h = 2 + rnd() * 9;   // turbulent streaks along the bands
    g.fillStyle = `rgba(${rnd() < 0.5 ? "255,250,240" : "120,80,50"},${0.05 + rnd() * 0.12})`; g.beginPath(); g.ellipse(x, y, w, h, (rnd() - 0.5) * 0.15, 0, 6.283); g.fill(); }
  const a = 7000 * km, b = 5500 * km;                       // the spot: ~14,000 × 11,000 km
  for (let k = 0; k < 900; k++) { const x = cx - a * (1.4 + rnd() * 2.5), y = cy - b * (0.2 + rnd() * 1.2);   // the chaotic wake to its north-west
    g.fillStyle = `rgba(255,250,240,${0.08 + rnd() * 0.18})`; g.beginPath(); g.ellipse(x, y, 10 + rnd() * 60, 4 + rnd() * 20, rnd() * 3, 0, 6.283); g.fill(); }
  const hollow = g.createRadialGradient(cx, cy, 0, cx, cy, a * 1.35); hollow.addColorStop(0.7, "rgba(250,244,232,0)"); hollow.addColorStop(0.78, "rgba(250,244,232,0.85)"); hollow.addColorStop(1, "rgba(250,244,232,0)");
  g.save(); g.translate(cx, cy); g.scale(1, b / a); g.translate(-cx, -cy); g.fillStyle = hollow; g.beginPath(); g.arc(cx, cy, a * 1.35, 0, 6.283); g.fill(); g.restore();   // the pale 'Red Spot Hollow'
  g.save(); g.translate(cx, cy); g.scale(1, b / a);
  const body = g.createRadialGradient(0, 0, 0, 0, 0, a); body.addColorStop(0, "#b8552e"); body.addColorStop(0.35, "#c45a2c"); body.addColorStop(0.8, "#d27448"); body.addColorStop(1, "#d99a74");
  g.fillStyle = body; g.beginPath(); g.arc(0, 0, a, 0, 6.283); g.fill();
  for (let k = 0; k < 420; k++) { const r = a * (0.1 + 0.88 * rnd()), t0 = rnd() * 6.283, len = 0.4 + rnd() * 1.2;   // spiral streaks, counter-clockwise
    g.strokeStyle = `rgba(${rnd() < 0.5 ? "250,200,170" : "140,50,25"},${0.10 + rnd() * 0.18})`; g.lineWidth = 2 + rnd() * 6; g.beginPath();
    for (let t = 0; t <= len; t += 0.04) { const rr = r * (1 - 0.06 * t); g.lineTo(rr * Math.cos(t0 + t), rr * Math.sin(t0 + t)); } g.stroke(); }
  const core = g.createRadialGradient(0, 0, 0, 0, 0, a * 0.3); core.addColorStop(0, "rgba(150,60,30,0.6)"); core.addColorStop(1, "rgba(150,60,30,0)"); g.fillStyle = core; g.beginPath(); g.arc(0, 0, a * 0.3, 0, 6.283); g.fill();
  g.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const planet = new THREE.Group(); scene.add(planet);
{ const geo = new THREE.PlaneGeometry(2 * HALF, 2 * HALF, CAPN, CAPN), pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const e = pos.getX(i), n = pos.getY(i), d = Math.hypot(e, n), ang = d / R, s = d > 0 ? Math.sin(ang) / d * R : 0;
    pos.setXYZ(i, e * s, R * Math.cos(ang), -n * s); uv.setXY(i, 0.5 + e / (2 * HALF), 0.5 + n / (2 * HALF)); }   // east = +x, north = −z
  geo.computeVertexNormals();
  planet.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: spotTexture(), roughness: 0.95 })));
  // (no second sphere underneath: from 12,000 km up the horizon is ~41,000 km away, near this 45,000 km cap, and two surfaces
  // that close together flicker against each other at this distance)
  const limb = new THREE.Mesh(new THREE.SphereGeometry(R + 80e3, 96, 48), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide,
    vertexShader: "varying vec3 n; varying vec3 v; void main(){ n = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying vec3 n; varying vec3 v; void main(){ float f = pow(1.0 - max(dot(n, v), 0.0), 4.0); gl_FragColor = vec4(0.75, 0.82, 0.95, f * 0.8); }" }));
  planet.add(limb); }

// ---------- the clouds up close: sheets at each deck's depth ----------
function cloudTex(cover, tint) { const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  if (cover >= 1) { g.fillStyle = `rgba(${tint},0.55)`; g.fillRect(0, 0, 512, 512); }
  for (let k = 0; k < 1100 * cover; k++) { const x = rnd() * 512, y = rnd() * 512, r = 10 + rnd() * 60, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${tint},${0.12 + 0.15 * cover})`); gr.addColorStop(1, `rgba(${tint},0)`); g.fillStyle = gr;
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { g.save(); g.translate(dx, dy); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
const fadeTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.4, "#ccc"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
for (const d of DECKS) { d.list = [];
  for (let k = 0; k < d.sheets; k++) { const tex = cloudTex(d.cover, d.tint.join(",")); tex.repeat.set(24, 24); tex.offset.set(rnd(), rnd());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(160000, 160000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, alphaMap: fadeTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    m.renderOrder = 1; scene.add(m); d.list.push({ m, z: zAt(d.p0 * Math.pow(d.p1 / d.p0, (k + 0.5) / d.sheets)), spin: (rnd() - 0.5) * 0.0004 }); } }

// ---------- motes: cloud particles streaming up past you ----------
const NM = 1800, BOX = 60, mp = new Float32Array(NM * 3);
for (let i = 0; i < NM; i++) mp.set([(rnd() - 0.5) * BOX, (rnd() - 0.5) * BOX, (rnd() - 0.5) * BOX], i * 3);
const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(mp, 3)),
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.5, depthWrite: false })); scene.add(motes);

// ---------- your parachute: it opens at the top of the atmosphere (60 km up), where the slow fall begins ----------
const chute = new THREE.Group(); rig.add(chute);
const lineMat = new THREE.LineBasicMaterial({ color: 0x9a968c, transparent: true, opacity: 0.7 });
{ const gores = document.createElement("canvas"); gores.width = 512; gores.height = 64; const g = gores.getContext("2d");
  for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? "#f2efe6" : "#2f6fb3"; g.fillRect(k * 32, 0, 32, 64); }
  const gt = new THREE.CanvasTexture(gores); gt.colorSpace = THREE.SRGBColorSpace;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(3.5, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ map: gt, side: THREE.DoubleSide, roughness: 0.8 }));
  canopy.position.y = 8.2; canopy.scale.y = 0.7; chute.add(canopy);
  const rim = 3.5 * Math.sin(Math.PI * 0.42), rimY = 8.2 + 3.5 * 0.7 * Math.cos(Math.PI * 0.42), pts = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, sx = k < 8 ? 0.22 : -0.22; pts.push(V3(sx, 1.75, 0), V3(rim * Math.cos(a), rimY, rim * Math.sin(a))); }   // two risers at your shoulders
  chute.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), lineMat)); }

// ---------- captions ----------
const EVENTS = [   // [depth km, title, line]
  [-12000, "12,000 km above the Great Red Spot", "a storm ~14,000 km across, wider than the Earth, watched since at least 1831 (it was twice this size in the 1800s)"],
  [-1500, "It turns counter-clockwise, once every few days", "winds race round its edge at up to ~650 km/h; you are falling towards its calmer centre"],
  [-600, "The pale ring round it is the 'Red Spot Hollow'", "and the white swirls to its north-west are the turbulence it leaves in its wake"],
  [-150, "The top of the atmosphere: the sky is turning from black to deep blue", "the spot's cloud tops bulge several km above the clouds round it"],
  [Z_B, "Your parachute opens", "60 km above the cloud tops, in air a hundredth as thick as at sea level: from here you drift down slowly, as a probe would"],
  [zAt(0.15), "Into the red haze", "the colour is a thin haze above the clouds, probably made when sunlight breaks up ammonia and acetylene; its exact chemistry is unknown"],
  [zAt(0.4), "Into the ammonia-ice cloud: white-out", "crystals of frozen ammonia, the white of Jupiter's zones, here lit orange through the haze above"],
  [zAt(0.9), "Out beneath the ammonia cloud", "a dim, warm world between cloud decks: the light has come through the red haze and a thick cloud"],
  [zAt(1.5), "The ammonium hydrosulfide cloud", "ammonia and hydrogen sulfide combined: it would smell of ammonia and rotten eggs"],
  [zAt(4.5), "The water cloud", "ice and liquid droplets: the deck where Jupiter's lightning forms (here, at about 0 °C)"],
  [zAt(7.0), "Below the last cloud deck", "only the deep, hot hydrogen-helium air remains, glowing faintly with sunlight scattered down through everything above"],
  [zAt(22), "22 bar: as deep as the Galileo probe ever reached", "Galileo fell into a dry, clear patch elsewhere; the spot has all the cloud decks it missed"],
  [zAt(100), "100 bar, ~240 km down, ~390 °C", "Juno's microwave radiometer still sees the storm here: it is far deeper than the weather on Earth"],
  [Z_END, "~300 km down: the roots of the Great Red Spot", "Juno's microwaves and gravity data show the storm reaching roughly 300-500 km down. Below, it fades into the rest of Jupiter"]];
let evI = 0, caption = ["", ""];
const panelC = document.createElement("canvas"); panelC.width = 1024; panelC.height = 520; const panelT = new THREE.CanvasTexture(panelC); panelT.colorSpace = THREE.SRGBColorSpace;
const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.81), new THREE.MeshBasicMaterial({ map: panelT, transparent: true, toneMapped: false, depthTest: false, fog: false }));
panel.renderOrder = 10; scene.add(panel);
const SPEEDS = [1, 5, 20, 60, 300, 1000]; let speedI = 2, paused = false, simT = 0;
const fmtKm = km => Math.abs(km) >= 10 ? `${Math.abs(km).toFixed(0)} km` : `${Math.abs(km).toFixed(1)} km`;
function drawPanel(st) {
  const g = panelC.getContext("2d"); g.clearRect(0, 0, 1024, 520); g.fillStyle = "rgba(10,20,30,.72)"; g.beginPath(); g.roundRect(0, 0, 1024, 520, 24); g.fill();
  const line = (s, y, sz, col = "#e6f3f9", w = 400) => { g.fillStyle = col; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; while (g.measureText(s).width > 960 && sz > 13) { sz--; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; } g.fillText(s, 32, y); };
  const h = Math.floor(st.t / 3600), m = Math.floor(st.t % 3600 / 60), s = Math.floor(st.t % 60);
  line(`${h ? h + ":" : ""}${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")} into the fall  ·  time ×${SPEEDS[speedI]}${paused ? "  ·  paused" : ""}`, 56, 34, "#ffe9a8", 700);
  line(`${st.z < 0 ? `${fmtKm(st.z)} above` : `${fmtKm(st.z)} below`} the 1-bar level  ·  ${st.p < 1e-6 ? "near-vacuum" : "pressure " + ( st.p < 0.001 ? st.p.toExponential(1) : st.p < 10 ? st.p.toFixed(st.p < 0.1 ? 3 : 2) : st.p.toFixed(0)) + " bar"}`, 112, 32);
  line(`${st.z < -400 ? "in space" : `temperature ${(st.T - 273.15).toFixed(0)} °C`}  ·  falling ${st.v >= 1000 ? (st.v / 1000).toFixed(1) + " km/s" : st.v.toFixed(0) + " m/s"}  ·  daylight ${(st.L * 100).toFixed(0)}% of the top`, 160, 32);
  line(st.deck ? `inside ${st.deck}` : st.z < Z_B ? "falling from space (slowed down so you can look)" : "under your parachute, between cloud decks", 208, 30, "#c8dce6");
  line(caption[0], 290, 34, "#ffffff", 700); line(caption[1], 338, 25, "#c8dce6");
  line("Nothing has ever gone into the Great Red Spot: this is rebuilt from telescope, spacecraft and Juno data, and physics.", 440, 22, "#93aebb");
  line(IS_HEADSET ? "A / B time slower / faster  ·  X restart  ·  left stick: move about" : "[ ] time slower / faster  ·  space pause  ·  R restart  ·  drag to look  ·  WASD move", 480, 22, "#93aebb");
  panelT.needsUpdate = true; }

// ---------- the fall: from space at an accelerating-then-braking pace, then by 'parachute' physics below 0.01 bar ----------
const TA = 1500;                                             // simulated seconds for the drop from 12,000 to 60 km
function zOfT(t) {
  if (t < TA) return Z_B + (Z_TOP - Z_B) * Math.pow(1 - t / TA, 2.2);
  const p0 = 0.01, pp = Math.pow(Math.pow(p0, 0.65) + 0.65 * 74.4 * (t - TA) / 24200, 1 / 0.65); return Math.min(Z_END, zAt(pp)); }
const T_END = (() => { let lo = TA, hi = TA + 40000; for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (zOfT(mid) < Z_END - 1e-6) lo = mid; else hi = mid; } return hi; })();

// ---------- controls ----------
const keys = {}; let yaw = 0, pitch = -1.0, dragging = false, started = false;
const intro = document.getElementById("intro");
function start() { started = true; intro?.classList.add("gone"); }
function restart() { simT = 0; evI = 0; caption = ["", ""]; }
addEventListener("keydown", e => { keys[e.code] = true; start();
  if (e.code === "BracketRight") speedI = Math.min(SPEEDS.length - 1, speedI + 1); if (e.code === "BracketLeft") speedI = Math.max(0, speedI - 1);
  if (e.code === "Space") paused = !paused; if (e.code === "KeyR") restart(); });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.004, -1.55, 1.55); });
intro?.addEventListener("click", start);
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.12 ? x : 0, Math.abs(y) > 0.12 ? y : 0]; };
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); rig.position.y = -1.65;
    s.addEventListener("end", () => { camera.position.set(0, 1.65, 0); rig.rotation.set(0, 0, 0); rig.position.y = 0; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let panelTimer = 0, loopErrs = 0, lastZ = Z_TOP;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting, rate = paused || !started ? 0 : SPEEDS[speedI];
  simT = Math.min(T_END, simT + dt * rate);
  const z = zOfT(simT), p = pOfZ(z), v = simT < T_END ? Math.abs(zOfT(simT + 1) - z) * 1000 : 0, Lt = lightAt(p), deck = inDeck(p);
  // moving about (you drift with the wind, so the air round you is calm)
  if (vr) { const s = renderer.xr.getSession(); let mx = 0, my = 0;
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) restart(); }
      else { if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true;
        if (tap("R", gp, 4)) speedI = Math.max(0, speedI - 1); if (tap("R", gp, 5)) speedI = Math.min(SPEEDS.length - 1, speedI + 1); } }
    rig.rotation.y = vrTurn;
    if (mx || my) { fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion).normalize(); side.crossVectors(fwd, UP).normalize();
      rig.position.addScaledVector(fwd, -my * 1.5 * dt).addScaledVector(side, mx * 1.5 * dt); } }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); side.crossVectors(fwd, UP).normalize(); const sp = 2 * dt;
    if (keys.KeyW) rig.position.addScaledVector(fwd, sp); if (keys.KeyS) rig.position.addScaledVector(fwd, -sp);
    if (keys.KeyD) rig.position.addScaledVector(side, sp); if (keys.KeyA) rig.position.addScaledVector(side, -sp); }
  if (rig.position.length() > 30) rig.position.setLength(30);
  const open = THREE.MathUtils.clamp((z - (Z_B - 3)) / 3, 0, 1); chute.visible = open > 0; chute.scale.set(0.15 + 0.85 * open, open, 0.15 + 0.85 * open);   // it blooms over ~3 km of fall
  chute.rotation.set(0.04 * Math.sin(clock.elapsedTime * 0.6), 0, 0.03 * Math.sin(clock.elapsedTime * 0.45 + 1));
  if (vr) chute.position.set(camera.position.x, 0, camera.position.z); else chute.position.set(0, 0, 0);
  // the planet from above, fading out as you sink into the haze
  const hCap = (Z_CAP - z) * 1000;                          // metres above the ammonia cloud top
  planet.position.set(0, -(R + hCap), 0); planet.visible = hCap > 1500;
  // colours and light
  const downC = tone(Lt.down, 0.95), upC = tone(Lt.diffuse.map((x, i) => x + 0.02 * Lt.direct[i]), 0.85), belowC = tone(Lt.up, 0.8);
  const space = THREE.MathUtils.clamp((-z - 150) / 250, 0, 1);   // 1 = black space overhead
  upC.lerp(new THREE.Color(0, 0, 0), space);
  const horC = upC.clone().lerp(belowC, 0.5).lerp(new THREE.Color(0xffffff), 0.1 * (1 - space)).lerp(new THREE.Color(0, 0, 0), space);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.down.value.copy(belowC).lerp(new THREE.Color(0, 0, 0), space);   // from space, the sky below the horizon is space too sky.position.copy(rig.position);
  stars.material.opacity = space; stars.position.copy(rig.position);
  const scat = z < Z_B ? 0 : KR[1] * p / (24.2 * Math.pow(p, 0.304) * 1000);
  scene.fog.color.copy(deck ? downC.clone().lerp(new THREE.Color(...deck.tint.map(x => x / 255)), 0.3) : horC);
  scene.fog.density = scat * 1.2 + (deck ? deck.fog : 0);
  if (deck || scene.fog.density > 0.0004) { const f = deck ? 0.9 : 0.5;   // in a cloud the sky is the cloud: no horizon
    for (const k of ["up", "hor", "down"]) skyMat.uniforms[k].value.lerp(scene.fog.color, f); }
  const D = Lt.direct, sunC = tone(D, 1.0), sunVis = Math.min(1, D[1] * 1.6), sdir = sun.position.clone().normalize();
  sun.intensity = 3.0 * D[1] + (planet.visible ? 0.4 : 0); sun.color.copy(sunC); amb.intensity = 0.5 + 1.6 * (Lt.diffuse[1] + Lt.up[1]) / 2; amb.color.copy(upC.clone().lerp(downC, 0.5)); amb.groundColor.copy(belowC);
  sunDisc.position.copy(rig.position).addScaledVector(sdir, 50); sunDisc.scale.setScalar(50 * 0.09 * Math.PI / 180); sunDisc.lookAt(rig.position);
  sunDisc.material.opacity = sunVis; sunDisc.visible = sunVis > 0.01; sunDisc.material.color.copy(sunC);
  // the cloud decks move up past you, turning slowly with the storm
  for (const d of DECKS) for (const sh of d.list) { const y = (z - sh.z) * 1000; sh.m.position.y = y; sh.m.visible = Math.abs(y) < 15000 && z > Z_B - 40;
    sh.m.material.color.copy(downC).lerp(new THREE.Color(...d.tint.map(x => x / 255)), 0.25); sh.m.rotation.y += sh.spin * dt * rate;
    sh.m.material.opacity = THREE.MathUtils.clamp((Math.abs(y) - 150) / 900, 0, 1); }   // a sheet seen edge-on at eye level reads as a stripe: fade it as you pass
  const pos = motes.geometry.attributes.position.array, rise = Math.min(v * dt * rate, BOX * 0.45);
  for (let i = 0; i < NM; i++) { let y = pos[i * 3 + 1] + rise; if (y > BOX / 2) y -= BOX; pos[i * 3 + 1] = y; }
  motes.geometry.attributes.position.needsUpdate = true; motes.position.copy(rig.position); motes.visible = z > Z_B - 20;
  motes.material.opacity = deck ? 0.85 : 0.3; motes.material.color.copy(downC); lineMat.color.copy(downC).multiplyScalar(0.7);
  // captions
  while (evI < EVENTS.length && z >= EVENTS[evI][0] - 1e-6) { caption = [EVENTS[evI][1], EVENTS[evI][2]]; evI++; }
  if (z < lastZ - 1) { evI = 0; while (evI < EVENTS.length && z >= EVENTS[evI][0] - 1e-6) { caption = [EVENTS[evI][1], EVENTS[evI][2]]; evI++; } }
  lastZ = z;
  const cp = camera.getWorldPosition(V3(0, 0, 0)), look = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); look.y = 0;
  if (look.lengthSq() < 1e-4) look.set(0, 0, -1); look.normalize(); const right = V3(-look.z, 0, look.x);
  panel.position.copy(cp).addScaledVector(look, 2.2).addScaledVector(right, 0.9).add(V3(0, -0.35, 0)); panel.lookAt(cp);
  panelTimer -= dt; if (panelTimer <= 0) { drawPanel({ t: simT, z, p, T: tempK(p), v, L: Lt.L, deck: deck?.name }); panelTimer = 0.2; }
  renderer.render(scene, camera);
}
