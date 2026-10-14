// galileo.js -- fall beside the Galileo probe into Jupiter, 7 December 1995. Built into galileo_probe.html by build.py.
//
// The probe had no camera: this is reconstructed from what it measured. The atmosphere model is fitted to its
// results: T = 166 K × p^0.3 (166 K at 1 bar, ~420 K at 22 bar), so depth below the 1-bar level is
// z = 80.7 km × (p^0.3 − 1) (scale height H = RT/μg, μ = 2.3, g = 24.8 m/s²), and the parachute's fall speed
// goes as 1/√density, v = 74 m/s × p^−0.35, which takes it from 0.4 bar to 22 bar in its measured 57.6 minutes.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 140000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.65;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------- the atmosphere, as the probe measured it ----------
const P0 = 0.4, T_END = 3456, V1 = 74.4;                    // parachute opens at 0.4 bar; signal lost after 57.6 min
const pAt = t => Math.pow(Math.pow(P0, 0.65) + 0.65 * V1 * t / 24200, 1 / 0.65);   // pressure (bar) t seconds after the chute opened
const zAt = p => 80.7 * (Math.pow(p, 0.3) - 1);           // km below the 1-bar level (negative: above it)
const tempK = p => 166 * Math.pow(p, 0.304);              // 425 K (152 °C) at 22 bar, as measured
const vAt = p => V1 * Math.pow(p, -0.35);                 // fall speed, m/s
const windAt = p => p < 1 ? 100 : p < 4 ? 100 + 70 * (p - 1) / 3 : 175;   // east wind, m/s (rising with depth, as measured)
// ---------- light, in three colour bands (blue 450, green 550, red 650 nm) ----------
// Rayleigh scattering by H2/He: optical depth per bar of air above ≈ 0.24, 0.10, 0.045 (5× Earth's molecules per bar,
// each scattering ~0.2× as much as air). Methane absorbs a little red (weak 619 nm band). A trace of the brownish
// 'chromophore' haze sits in the cloud layers. Scattering conserves light, so it never gets dark in the visible:
// the light goes from a sun-lit blue sky to a diffuse glow with no Sun disc. (Most of what the probe's radiometer saw
// vanish was infrared, absorbed by methane.)
const KR = [0.24, 0.10, 0.045], KCH4 = [0, 0.001, 0.004], MU0 = 0.7;   // 650 nm falls between methane's bands: little red absorbed   // sun ~45° up
function chrom(p) { const f = q => Math.min(1, Math.max(0, Math.log(p / q[0]) / Math.log(q[1] / q[0])));   // haze absorption crossed so far
  return [0.10 + 0.06 * f([0.45, 0.75]) + 0.12 * f([1.35, 1.65]), 0.05 + 0.03 * f([0.45, 0.75]) + 0.06 * f([1.35, 1.65]), 0.02 + 0.01 * f([0.45, 0.75]) + 0.02 * f([1.35, 1.65])]; }
function lightAt(p) {
  const ca = chrom(p), out = { direct: [], down: [], diffuse: [], up: [] };
  for (let i = 0; i < 3; i++) { const tr = KR[i] * p, ta = KCH4[i] * p + ca[i];
    const direct = Math.exp(-(tr + ta) / MU0), down = Math.exp(-1.66 * ta) / (1 + 0.75 * tr);   // two-stream, conservative scattering
    const w = KR[i] / (KR[i] + KCH4[i] + 0.004), g = Math.sqrt(1 - w), albedo = (1 - g) / (1 + g);    // the deep air below, a semi-infinite scatterer
    out.direct[i] = direct; out.down[i] = Math.max(down, direct); out.diffuse[i] = down * (1 - Math.exp(-0.9 * tr / MU0)); out.up[i] = albedo * down; }   // skylight: single scattering near the top (blue), the whole flux deep down
  out.L = out.down[1]; return out; }
const SUNW = [1.0, 0.97, 0.90];                            // sunlight colour above the atmosphere
// the bands are stored blue, green, red; brightness compressed as the eyes adapt partly
const tone = (bgr, k = 1) => { const rgb = [bgr[2], bgr[1], bgr[0]], lum = (rgb[0] + rgb[1] + rgb[2]) / 3 + 1e-6, b = k * Math.pow(lum, 0.55) / lum;
  const c = rgb.map((v, i) => v * SUNW[i] * b), m = (c[0] + c[1] + c[2]) / 3;   // and the eye's colour adaptation softens tints by ~30%
  return new THREE.Color().setRGB(...c.map(v => m + 0.7 * (v - m)), THREE.LinearSRGBColorSpace); };

// ---------- sky: a gradient sphere that darkens and browns with depth ----------
const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { up: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, down: { value: new THREE.Color() } },
  vertexShader: "varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "uniform vec3 up, hor, down; varying vec3 vp; void main(){ float y = vp.y; vec3 c = y > 0.0 ? mix(hor, up, pow(y, 0.6)) : mix(hor, down, pow(-y, 0.5)); gl_FragColor = vec4(c, 1.0); \n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" });   // convert to screen colour like every other material
const sky = new THREE.Mesh(new THREE.SphereGeometry(120000, 48, 24), skyMat); scene.add(sky);
scene.fog = new THREE.FogExp2(0xc8b89a, 0.00003);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.2); sun.position.set(0.4, 0.75, 0.3); scene.add(sun);
const amb = new THREE.HemisphereLight(0xbcc8d8, 0x8a6a48, 0.9); scene.add(amb);
const C = (h) => new THREE.Color(h);
// the Sun's disc: 1/5 of its size seen from Earth (0.1°), fading as its direct beam is scattered away
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, fog: false, toneMapped: false, depthWrite: false }));
const sunGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
scene.add(sunGlow, sunDisc);

// ---------- cloud layers at their measured depths (thin and patchy: a dry 'hot spot') ----------
function cloudTex(cover, tint) { const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
  g.clearRect(0, 0, 512, 512);
  for (let k = 0; k < 900 * cover; k++) { const x = rnd() * 512, y = rnd() * 512, r = 10 + rnd() * 50, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${tint},${0.10 + 0.12 * cover})`); gr.addColorStop(1, `rgba(${tint},0)`); g.fillStyle = gr;
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { g.save(); g.translate(dx, dy); g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); g.restore(); } }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }
const LAYERS = [   // name, top and bottom pressure (bar), sheets, cover, tint
  { name: "a thin haze of ammonia ice", p0: 0.45, p1: 0.75, n: 3, cover: 0.55, tint: "245,240,228" },
  { name: "a thin cloud, probably ammonium hydrosulfide", p0: 1.35, p1: 1.65, n: 3, cover: 0.8, tint: "226,206,170" }];
const fadeTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "#fff"); gr.addColorStop(0.35, "#bbb"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();   // sheets thin out with distance: no hard edge
for (const L of LAYERS) { L.sheets = [];
  for (let k = 0; k < L.n; k++) { const tex = cloudTex(L.cover, L.tint); tex.repeat.set(30, 30); tex.offset.set(rnd(), rnd());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, alphaMap: fadeTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    m.renderOrder = 1; scene.add(m); L.sheets.push({ m, z: zAt(L.p0 * Math.pow(L.p1 / L.p0, (k + 0.5) / L.n)) }); } }

// ---------- motes in the air close by: they stream up past you, so you feel the fall ----------
const NM = 1500, BOX = 60, mp = new Float32Array(NM * 3);
for (let i = 0; i < NM; i++) mp.set([(rnd() - 0.5) * BOX, (rnd() - 0.5) * BOX, (rnd() - 0.5) * BOX], i * 3);
const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(mp, 3)),
  new THREE.PointsMaterial({ color: 0xf4ead8, size: 0.06, transparent: true, opacity: 0.6, depthWrite: false }));
scene.add(motes);

// ---------- distant lightning: the probe's radio picked up its static from thousands of km away ----------
// (the probe's radio heard lightning thousands of km away, below the horizon: too far to see, so no flashes here)

// ---------- the probe, its parachute, and the heat shield falling away ----------
const probe = new THREE.Group(); scene.add(probe);
const lineMat = new THREE.LineBasicMaterial({ color: 0x9a968c, transparent: true, opacity: 0.6 });
{ const gold = M(0xd4a838, { metalness: 0.3, roughness: 0.4 }), dark = M(0x4a4a50, { metalness: 0.2, roughness: 0.55 }), white = M(0xe8e8e4, { roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.37, 0.5, 32), gold); body.position.y = 0; probe.add(body);   // the descent module, wrapped in gold foil
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.33, 0.14, 32), dark); cap.position.y = 0.32; probe.add(cap);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.3, 0.12, 32), dark); base.position.y = -0.31; probe.add(base);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 20), white); ant.position.y = 0.43; probe.add(ant);   // the antenna that talked to the orbiter
  for (let k = 0; k < 6; k++) { const vane = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.18, 0.12), dark); const a = k / 6 * Math.PI * 2;   // spin vanes
    vane.position.set(0.39 * Math.cos(a), -0.15, 0.39 * Math.sin(a)); vane.rotation.set(0.5, -a, 0); probe.add(vane); }
  for (const a of [0.4, 2.2, 4.1]) { const box = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), white); box.position.set(0.37 * Math.cos(a), 0.05, 0.37 * Math.sin(a)); box.lookAt(0, 0.05, 0); probe.add(box); }   // instrument ports
  // the parachute: 2.5 m across, ~7 m above, on lines from the top of the module
  const gores = document.createElement("canvas"); gores.width = 512; gores.height = 64; const g = gores.getContext("2d");
  for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? "#f2efe6" : "#d9772f"; g.fillRect(k * 32, 0, 32, 64); }
  const gt = new THREE.CanvasTexture(gores); gt.colorSpace = THREE.SRGBColorSpace;
  const chute = new THREE.Mesh(new THREE.SphereGeometry(1.25, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new THREE.MeshStandardMaterial({ map: gt, side: THREE.DoubleSide, roughness: 0.8 }));
  chute.position.y = 6.6; chute.scale.y = 0.75; probe.add(chute);
  const rim = 1.25 * Math.sin(Math.PI * 0.42), rimY = 6.6 + 1.25 * 0.75 * Math.cos(Math.PI * 0.42), lines = [];
  for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; lines.push(V3(0, 0.47, 0), V3(rim * Math.cos(a), rimY, rim * Math.sin(a))); }
  probe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), lineMat)); }
const shield = new THREE.Group(); scene.add(shield);        // the aeroshell: a 1.25 m blunt cone, charred by a 47 km/s entry
{ const prof = []; for (let i = 0; i <= 12; i++) { const u = i / 12; prof.push(new THREE.Vector2(0.62 * u, -0.25 * (1 - u * u) - 0.12 * u)); }
  const s = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), M(0x2a1e18, { roughness: 0.95, side: THREE.DoubleSide })); s.rotation.x = Math.PI; shield.add(s);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.5 })); glow.position.y = -0.26; shield.add(glow); shield.userData.glow = glow; }

// ---------- captions: what the probe found, at the depth it found it ----------
const EVENTS = [
  ["t", 0, "The parachute is open: 0.4 bar, about 20 km above Jupiter's 1-bar level", "3 minutes ago the probe hit the atmosphere at 47 km/s and braked at up to 230 g behind its heat shield"],
  ["t", 8, "The heat shield drops away below", "it took most of the entry heat: much of its carbon surface burned off"],
  ["p", 0.45, "Entering a thin haze of ammonia ice", "far thinner than expected: the probe fell into a dry, clear 'hot spot'"],
  ["p", 1.0, "1 bar: the pressure at sea level on Earth, and Jupiter's reference 'zero'", "−107 °C here, about 1.8 times the density of Earth's air"],
  ["p", 1.35, "A thin cloud deck, probably ammonium hydrosulfide", "the only real cloud the probe ever detected"],
  ["p", 2.5, "The probe's radio hears lightning", "static from storms thousands of km away, beyond the horizon: too far to see"],
  ["p", 3.5, "The winds are still rising with depth: now ~600 km/h", "so they are driven by heat from inside Jupiter, not by sunlight"],
  ["p", 5, "Here a thick water cloud was expected", "there was none: the hot spot was far drier than Jupiter as a whole"],
  ["p", 7, "The Sun's disc has faded into the haze", "light now comes evenly from the whole sky: no shadows, a dim, warm glow above, bluer below"],
  ["p", 12, "Still not dark: blue light is scattered, not absorbed", "it gets dimmer and warmer above, but the deep air keeps glowing, like a dull overcast day"],
  ["p", 16, "The heat is rising fast: past 100 °C", "the probe's electronics are near their design limit"],
  ["p", 22, "22 bar, 152 °C: the signal stops", "58 minutes after the chute opened. The probe sank on, and melted and vaporised far below"]];
let evI = 0, caption = ["", ""], captionT = 0;
const panelC = document.createElement("canvas"); panelC.width = 1024; panelC.height = 520; const panelT = new THREE.CanvasTexture(panelC); panelT.colorSpace = THREE.SRGBColorSpace;
const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.81), new THREE.MeshBasicMaterial({ map: panelT, transparent: true, toneMapped: false, depthTest: false }));
panel.renderOrder = 10; scene.add(panel);
function drawPanel(st) {
  const g = panelC.getContext("2d"); g.clearRect(0, 0, 1024, 520); g.fillStyle = "rgba(10,20,30,.72)"; g.beginPath(); g.roundRect(0, 0, 1024, 520, 24); g.fill();
  const line = (s, y, sz, col = "#e6f3f9", w = 400) => { g.fillStyle = col; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; g.fillText(s, 32, y); };
  const m = Math.floor(st.t / 60), s = Math.floor(st.t % 60);
  line(`${m}:${String(s).padStart(2, "0")} after the parachute opened  ·  time ×${SPEEDS[speedI]}${paused ? "  ·  paused" : ""}`, 56, 34, "#ffe9a8", 700);
  line(`pressure ${st.p.toFixed(st.p < 10 ? 2 : 1)} bar  ·  ${st.z >= 0 ? `${st.z.toFixed(1)} km below` : `${(-st.z).toFixed(1)} km above`} the 1-bar level`, 112, 32);
  line(`temperature ${(st.T - 273.15).toFixed(0)} °C  ·  ${st.v ? `falling ${st.v.toFixed(0)} m/s (${(st.v * 3.6).toFixed(0)} km/h)` : "signal lost"}`, 160, 32);
  line(`wind carrying you east at ${(st.w * 3.6).toFixed(0)} km/h  ·  daylight ${(st.L * 100).toFixed(0)}% of the top  ·  Sun's disc ${st.D > 0.5 ? "bright" : st.D > 0.12 ? "dimming" : st.D > 0.02 ? "faint" : "gone"}`, 208, 32);
  const fit = (txt, y, sz, col, w) => { g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; while (g.measureText(txt).width > 960 && sz > 14) { sz--; g.font = `${w} ${sz}px -apple-system, Helvetica, sans-serif`; } line(txt, y, sz, col, w); };
  fit(caption[0], 290, 34, "#ffffff", 700); fit(caption[1], 338, 27, "#c8dce6", 400);
  line("Galileo probe, 7 December 1995. It had no camera: this view is rebuilt from its measurements.", 440, 23, "#93aebb");
  line(IS_HEADSET ? "A / B time slower / faster  ·  X restart  ·  sticks: move round the probe" : "[ ] time slower / faster  ·  space pause  ·  R restart  ·  WASD move round  ·  drag look", 480, 23, "#93aebb");
  panelT.needsUpdate = true; }

// ---------- controls ----------
const SPEEDS = [1, 5, 20, 60, 300]; let speedI = 0, paused = false, simT = 0;
const keys = {}; let yaw = Math.PI, pitch = 0.15, dragging = false, started = false;
rig.position.set(0, -0.9, 1.5);                             // 1.5 m (5 ft) from the probe, eyes level with it
const intro = document.getElementById("intro");
function start() { started = true; intro?.classList.add("gone"); }
function restart() { simT = 0; evI = 0; caption = ["", ""]; shieldY = -0.6; shieldV = 0; }
addEventListener("keydown", e => { keys[e.code] = true; start();
  if (e.code === "BracketRight") speedI = Math.min(SPEEDS.length - 1, speedI + 1); if (e.code === "BracketLeft") speedI = Math.max(0, speedI - 1);
  if (e.code === "Space") paused = !paused; if (e.code === "KeyR") restart(); });
addEventListener("keyup", e => keys[e.code] = false);
renderer.domElement.addEventListener("pointerdown", () => { dragging = true; start(); }); addEventListener("pointerup", () => dragging = false);
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0;
  const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.12 ? x : 0, Math.abs(y) > 0.12 ? y : 0]; };
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] });
    renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); renderer.xr.setFramebufferScaleFactor(0.8);
    await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); rig.position.y = -2.1;
    s.addEventListener("end", () => { camera.position.set(0, 1.65, 0); rig.rotation.set(0, 0, 0); rig.position.y = -0.9; }); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0);
let shieldY = -0.6, shieldV = 0, panelTimer = 0, loopErrs = 0;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting, rate = paused || !started ? 0 : SPEEDS[speedI];
  simT = Math.min(T_END + 30, simT + dt * rate);
  const tt = Math.min(simT, T_END), p = pAt(tt), z = zAt(p), v = simT < T_END ? vAt(p) : 0, Lt = lightAt(p), L = Lt.L;
  // moving round the probe (you fall with it, so it stays put; you can walk or float round it)
  if (vr) { const s = renderer.xr.getSession(); let mx = 0, my = 0;
    for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) restart(); }
      else { if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true;
        if (tap("R", gp, 4)) speedI = Math.max(0, speedI - 1); if (tap("R", gp, 5)) speedI = Math.min(SPEEDS.length - 1, speedI + 1); } }
    rig.rotation.y = vrTurn;
    if (mx || my) { fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion).normalize(); side.crossVectors(fwd, UP).normalize();
      rig.position.addScaledVector(fwd, -my * 1.2 * dt).addScaledVector(side, mx * 1.2 * dt); } }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); side.crossVectors(fwd, UP).normalize(); const sp = 1.5 * dt;
    if (keys.KeyW) rig.position.addScaledVector(fwd, sp); if (keys.KeyS) rig.position.addScaledVector(fwd, -sp);
    if (keys.KeyD) rig.position.addScaledVector(side, sp); if (keys.KeyA) rig.position.addScaledVector(side, -sp); }
  if (rig.position.length() > 25) rig.position.setLength(25);
  // the probe swings gently under its chute and turns slowly on its vanes
  probe.rotation.set(0.05 * Math.sin(clock.elapsedTime * 0.7), clock.elapsedTime * 0.25, 0.04 * Math.sin(clock.elapsedTime * 0.53 + 1));
  // the heat shield falls away below
  if (simT < 300) { const a = 4; shieldV += a * dt * rate; shieldY -= shieldV * dt * rate; shield.visible = simT > 8 && shieldY > -4000; } else shield.visible = false;
  if (simT <= 8) { shieldY = -0.6; shieldV = 0; } shield.position.set(0.1, shieldY, 0); shield.rotation.z += dt * 0.4; shield.userData.glow.material.opacity = Math.max(0, 0.5 - simT / 60);
  // the atmosphere moves up past you
  const downC = tone(Lt.down, 0.95), upC = tone(Lt.diffuse.map((v, i) => v + 0.02 * Lt.direct[i]), 0.85), belowC = tone(Lt.up, 0.8), horC = upC.clone().lerp(belowC, 0.5).lerp(new THREE.Color(0xffffff), 0.12);
  for (const Lr of LAYERS) for (const sh of Lr.sheets) { const y = (z - sh.z) * 1000; sh.m.position.y = y; sh.m.visible = Math.abs(y) < 12000;   // only the sheets near you are drawn
    sh.m.material.color.copy(downC); }
  const pos = motes.geometry.attributes.position.array, rise = Math.min(v * dt * rate, BOX * 0.45), inCloud = LAYERS.some(Lr => p > Lr.p0 * 0.9 && p < Lr.p1 * 1.1);
  for (let i = 0; i < NM; i++) { let y = pos[i * 3 + 1] + rise; if (y > BOX / 2) y -= BOX; pos[i * 3 + 1] = y; }
  motes.geometry.attributes.position.needsUpdate = true; motes.material.opacity = inCloud ? 0.8 : 0.35; motes.material.color.copy(downC); motes.position.copy(rig.position);
  skyMat.uniforms.up.value.copy(upC); skyMat.uniforms.hor.value.copy(horC); skyMat.uniforms.down.value.copy(belowC);
  const scat = KR[1] * p / (24.2 * Math.pow(p, 0.304) * 1000);                     // scattering per metre (τ per bar × bar per metre)
  scene.fog.color.copy(horC); scene.fog.density = scat * 1.2; sky.position.copy(rig.position);
  const D = Lt.direct, sunC = tone(D, 1.0), sdir = sun.position.clone().normalize(), sunVis = Math.min(1, D[1] * 1.6);
  sun.intensity = 3.0 * D[1]; sun.color.copy(sunC); amb.intensity = 0.6 + 1.6 * (Lt.diffuse[1] + Lt.up[1]) / 2; amb.color.copy(upC); amb.groundColor.copy(belowC);
  for (const [m, r, op] of [[sunDisc, 0.09, 1], [sunGlow, 0.5, 0.25]]) { m.position.copy(rig.position).addScaledVector(sdir, 50); m.scale.setScalar(50 * r * Math.PI / 180); m.lookAt(rig.position);
    m.material.opacity = op * sunVis; m.visible = sunVis > 0.01; }
  sunDisc.material.color.copy(sunC); lineMat.color.copy(downC).multiplyScalar(0.7);
  // captions
  while (evI < EVENTS.length) { const [kind, k, a, b] = EVENTS[evI]; if (!(kind === "t" ? simT >= k : p >= k * 0.999)) break; caption = [a, b]; evI++; }
  // the panel floats beside the probe, facing you
  const cp = camera.getWorldPosition(V3(0, 0, 0)), toProbe = V3(-cp.x, 0, -cp.z).normalize(), right = V3(toProbe.z, 0, -toProbe.x);
  panel.position.copy(cp).addScaledVector(toProbe, 2.4).addScaledVector(right, -1.05).add(V3(0, 0.15, 0)); panel.lookAt(cp);
  panelTimer -= dt; if (panelTimer <= 0) { drawPanel({ t: tt, p, z, T: tempK(p), v, w: windAt(p), L, D: Lt.direct[1] }); panelTimer = 0.2; }
  renderer.render(scene, camera);
}
