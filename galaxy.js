// galaxy.js -- the stars around the Sun at one light-year to the metre. Built into galaxy.html by build.py, after galaxy_data.js.
//
// The Sun sits on a desk; every star brighter than magnitude 6.5 (all you can see with the naked eye) and every star within 81.5
// light-years stands in its real direction at its real distance: Proxima Centauri 4.2 m away, Sirius 8.6 m, Vega 25 m, Polaris
// 433 m, Betelgeuse 500 m, the centre of the Milky Way 26.7 km. The ground is the plane of the Milky Way (the galactic plane), drawn
// through the desk; the galactic centre lies straight ahead from the desk. Each star shines as bright as it really would seen from
// where you stand (its absolute magnitude and your distance), so from the desk the sky is the real night sky, and walking away from
// the desk the constellations come apart: their stars are at very different distances. At this scale the Sun is 0.15 thousandths of
// a millimetre across and the planets' orbits fit in a millimetre; the Oort cloud of comets, thought to reach about 100,000 AU,
// is a haze reaching 1.6 m. Distances beyond about 1,000 light-years are uncertain by tens of percent.
// Star data: HYG database v4.1 (astronexus), CC BY-SA 4.0. Deneb's distance is set to 2,615 light-years (Schiller & Przybilla 2008),
// the catalogue's Hipparcos value (1,400) being too small for so distant a star.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.01, 2e6);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, UP = V3(0, 1, 0), LYPC = 3.26156;
const SUN = V3(0, 1.0, 0);

// ---------- the stars ----------
const N = STAR_NUM.length / 6, POS = new Float32Array(N * 3), ABS = new Float32Array(N), COL = new Float32Array(N * 3), STARS = [];
function bvToRGB(bv) { bv = clampN(bv, -0.4, 2.0); let r, g, b;
  if (bv < 0) { r = 0.62 + 0.38 * (bv + 0.4) / 0.4; g = 0.72 + 0.23 * (bv + 0.4) / 0.4; b = 1; } else if (bv < 0.6) { r = 1; g = 0.95 + 0.05 * (1 - bv / 0.6) - 0.05 * bv; b = 1 - 0.35 * bv / 0.6; } else { r = 1; g = 0.9 - 0.35 * (bv - 0.6) / 1.4; b = 0.65 - 0.5 * (bv - 0.6) / 1.4; } return [r, g, b]; }
for (let i = 0; i < N; i++) { const o = i * 6; let x = STAR_NUM[o], y = STAR_NUM[o + 1], z = STAR_NUM[o + 2]; const name = STAR_NAME[i] || "";
  if (name === "Deneb") { const d = Math.hypot(x, y, z), k = 2615 / d; x *= k; y *= k; z *= k; }
  POS.set([SUN.x + x, SUN.y + y, SUN.z + z], i * 3); ABS[i] = STAR_NUM[o + 3]; COL.set(bvToRGB(STAR_NUM[o + 4]), i * 3);
  STARS.push({ i, name, bayer: STAR_BAYER[i] || "", spect: STAR_SPECT[i] || "", M: ABS[i], m0: STAR_NUM[o + 5], d0: Math.hypot(x, y, z), p: V3(SUN.x + x, SUN.y + y, SUN.z + z) }); }
const starGeo = new THREE.BufferGeometry(); starGeo.setAttribute("position", new THREE.BufferAttribute(POS, 3)); starGeo.setAttribute("absmag", new THREE.BufferAttribute(ABS, 1)); starGeo.setAttribute("color", new THREE.BufferAttribute(COL, 3));
// each star's brightness as seen from the eye: apparent magnitude m = M + 5 log10(d / 10 parsecs); fainter than about 6.5 fades out
const starMat = new THREE.ShaderMaterial({ uniforms: { px: { value: renderer.getPixelRatio() }, glass: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float absmag; attribute vec3 color; uniform float px; varying vec3 vC; varying float vA;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = max(length(mv.xyz), 0.0005); float m = absmag + 5.0 * log2(d / ${LYPC} / 10.0) / log2(10.0);
      float s = clamp(1.6 + (6.5 - m) * 0.85, 1.2, 46.0); vA = clamp(pow(10.0, -0.4 * (m - 6.5)), 0.0, 1.0); vC = color; gl_PointSize = s * px; gl_Position = projectionMatrix * mv;
      #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `varying vec3 vC; varying float vA;
    #include <logdepthbuf_pars_fragment>
    void main() { vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0; if (r > 1.0) discard; float core = exp(-r * r * 9.0), halo = exp(-r * 3.5) * 0.35; gl_FragColor = vec4(vC * (core + halo) * vA * 1.6, 1.0);
      #include <logdepthbuf_fragment>
    }` });
const starPts = new THREE.Points(starGeo, starMat); starPts.frustumCulled = false; scene.add(starPts);
const byName = n => STARS.find(s => s.name === n);

// ---------- constellation lines: right from the desk, coming apart as you walk away ----------
const FIGS = { Orion: [["Betelgeuse", "Bellatrix"], ["Betelgeuse", "Meissa"], ["Bellatrix", "Meissa"], ["Betelgeuse", "Alnitak"], ["Bellatrix", "Mintaka"], ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"], ["Alnitak", "Saiph"], ["Mintaka", "Rigel"]],
  "the Big Dipper": [["Dubhe", "Merak"], ["Merak", "Phecda"], ["Phecda", "Megrez"], ["Megrez", "Dubhe"], ["Megrez", "Alioth"], ["Alioth", "Mizar"], ["Mizar", "Alkaid"]],
  Cassiopeia: [["Caph", "Schedar"], ["Schedar", "Cih"], ["Cih", "Ruchbah"], ["Ruchbah", "Segin"]], "the Southern Cross": [["Acrux", "Gacrux"], ["Mimosa", "Imai"]],
  "the Northern Cross (Cygnus)": [["Deneb", "Sadr"], ["Sadr", "Albireo"], ["Fawaris", "Sadr"], ["Sadr", "Aljanah"]], "Canis Major": [["Sirius", "Mirzam"], ["Sirius", "Wezen"], ["Wezen", "Adhara"], ["Wezen", "Aludra"]],
  Gemini: [["Castor", "Pollux"]], "the Summer Triangle": [["Vega", "Deneb"], ["Deneb", "Altair"], ["Altair", "Vega"]] };
const linePts = [], FIGSTARS = new Set();
for (const k in FIGS) for (const [a, b] of FIGS[k]) { const A = byName(a), B = byName(b); if (!A || !B) continue; linePts.push(A.p, B.p); FIGSTARS.add(A); FIGSTARS.add(B); A.fig = B.fig = k; }
const figLines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(linePts), new THREE.LineBasicMaterial({ color: 0x4a78b8, transparent: true, opacity: 0.55, depthWrite: false })); figLines.frustumCulled = false; scene.add(figLines);

// ---------- the ground: the galactic plane through the desk, a metre grid near you, 100 m and 1 km lines farther ----------
const groundU = { op: { value: 1 } };
const groundMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
groundMat.onBeforeCompile = sh => { sh.uniforms.op = groundU.op;
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vW;").replace("#include <project_vertex>", "#include <project_vertex>\nvW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vW; uniform float op;\nfloat grid(vec2 p, float s, float w) { vec2 g = abs(fract(p / s - 0.5) - 0.5) * s / fwidth(p); return 1.0 - clamp(min(g.x, g.y) / w, 0.0, 1.0); }")
    .replace("vec4 diffuseColor = vec4( diffuse, opacity );", "vec2 p = vW.xz; float d = length(cameraPosition.xz - p); float g1 = grid(p, 1.0, 1.0) * smoothstep(40.0, 5.0, d), g2 = grid(p, 100.0, 1.2) * smoothstep(3000.0, 200.0, d), g3 = grid(p, 1000.0, 1.4) * smoothstep(40000.0, 2000.0, d);\n vec4 diffuseColor = vec4(vec3(0.035, 0.04, 0.05) + vec3(0.08, 0.1, 0.14) * g1 + vec3(0.12, 0.14, 0.2) * g2 + vec3(0.15, 0.13, 0.08) * g3, op);"); };
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400000, 400000, 64, 64).rotateX(-Math.PI / 2), groundMat);
ground.renderOrder = -1; scene.add(ground);
// a line along the ground toward the galactic centre, and its label far ahead
const toGC = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 26700).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x8a6a30, transparent: true, opacity: 0.3 })); toGC.position.set(0, 0.01, -26700 / 2); scene.add(toGC);

// ---------- the desk, the Sun on it, the Oort cloud round it ----------
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
scene.add(new THREE.HemisphereLight(0x8090b0, 0x202020, 0.5));
const lamp = new THREE.PointLight(0xffe8c0, 3, 8, 1.5); lamp.position.set(-0.5, 1.6, 0.3); scene.add(lamp);
{ const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), M(0x6a4428)); top.position.set(0, 0.74, 0); scene.add(top); for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.05), M(0x4a2e1a)); l.position.set(x, 0.36, z); scene.add(l); }
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.24, 8), M(0xb0b0b0, { metalness: 0.8 })); st.position.set(0, 0.88, 0); scene.add(st); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.02, 24), M(0x303030)); base.position.set(0, 0.775, 0); scene.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.035, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.95, roughness: 0.05, thickness: 0.01, transparent: true, opacity: 0.25 })); dome.position.copy(SUN); scene.add(dome); }
const glowT = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.2, "rgba(255,255,255,0.5)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xfff0c8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sunGlow.position.copy(SUN); sunGlow.scale.setScalar(0.012); scene.add(sunGlow);
// the Oort cloud: thought to run from about 2,000 to 100,000 AU (3 cm to 1.6 m here), densest inside; billions of comets, none ever seen there
{ const n = 3000, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const r = 0.03 * Math.pow(1.58 / 0.03, Math.pow(Math.random(), 0.8)), u = Math.random() * 2 - 1, a = Math.random() * 6.283, s = Math.sqrt(1 - u * u); p.set([SUN.x + r * s * Math.cos(a), SUN.y + r * u, SUN.z + r * s * Math.sin(a)], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9ab8d8, size: 0.0015, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }))); }

// ---------- labels: named stars, look at one and press E (A) for its info ----------
const TAGS = [];
function tagTex(title, sub, col = "#ffe8b0") { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const g = c.getContext("2d"); g.fillStyle = "rgba(10,12,20,0.72)"; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill(); g.strokeStyle = "rgba(140,170,230,0.5)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = col; g.font = "bold 40px -apple-system, Helvetica, sans-serif"; g.fillText(title, 22, 54, 470); g.fillStyle = "#c8d4ec"; g.font = "28px -apple-system, Helvetica, sans-serif"; g.fillText(sub, 22, 100, 470); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const fmtLy = d => d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString(), fmtM = d => d < 1000 ? (d < 10 ? d.toFixed(1) : Math.round(d)) + " m" : (d / 1000).toFixed(d < 10000 ? 2 : 1) + " km";
function tag(p, title, subF, infoF, col) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(title, ""), depthTest: false, transparent: true, toneMapped: false })); sp.center.set(0.5, -0.2); sp.renderOrder = 30; scene.add(sp); const T = { sp, p, title, subF, infoF, col, last: "" }; TAGS.push(T); return T; }
const SPECT = s => { const c = (s || "").charAt(0); return { O: "a hot blue O star", B: "a blue-white B star", A: "a white A star", F: "a yellow-white F star", G: "a yellow G star like the Sun", K: "an orange K star", M: "a red M star" }[c] || "a star"; };
const NOTES = { "Proxima Centauri": "The nearest star to the Sun, a small red dwarf too faint to see without a telescope. It has at least one planet the size of the Earth, in its habitable zone.",
  "Rigil Kentaurus": "Alpha Centauri A, the nearest Sun-like star; with B and Proxima, the nearest star system.", Sirius: "The brightest star in the night sky: twice the Sun's mass, 25 times as bright, with a white dwarf companion.",
  Betelgeuse: "A red supergiant: put in the Sun's place it would reach past Mars. It will explode as a supernova, perhaps within 100,000 years. Its distance is uncertain (500-700 light-years).",
  Rigel: "A blue supergiant, about 120,000 times as luminous as the Sun. Orion's two brightest stars are 360 light-years apart: walk sideways and the figure falls apart.",
  Polaris: "The Pole Star: the Earth's axis happens to point near it now. It is a yellow supergiant, 2,500 times as luminous as the Sun.",
  Deneb: "One of the most luminous stars known, about 200,000 Suns; at 2,600 light-years it is still one of the brightest in our sky. Its distance is uncertain.",
  Vega: "Once the Pole Star, about 12,000 years ago, and will be again. Twice the Sun's mass, spinning so fast it bulges.", Arcturus: "An orange giant, the brightest star in the northern sky.",
  Antares: "A red supergiant, the heart of the Scorpion.", Canopus: "The second brightest star in the night sky, a white giant 310 light-years away.", Altair: "Spins once every 9 hours, flattened by its spin." };
function starInfo(S, here) { const d = here.distanceTo(S.p), m = S.M + 5 * Math.log10(d / LYPC / 10);
  return `<b>${S.name}</b>${S.bayer ? " (" + S.bayer.replace(/-\d/, "") + ")" : ""}: ${SPECT(S.spect)}${S.spect ? " (" + S.spect + ")" : ""}. ${fmtLy(S.d0)} light-years from the Sun: ${fmtM(S.d0)} from the desk here.
    Seen from the Earth it is magnitude ${S.m0.toFixed(1)}; from where you stand, ${fmtLy(d)} light-years away, magnitude ${m.toFixed(1)}${m < 6.5 ? "" : " (too faint to see)"}. ${NOTES[S.name] || ""}${S.fig ? " Part of " + S.fig + "." : ""}`; }
const tagged = STARS.filter(s => s.name && (s.m0 < 2.6 || s.d0 < 20 || FIGSTARS.has(s)));
for (const S of tagged) tag(S.p, S.name, () => fmtM(S.d0) + " from the Sun · " + fmtLy(S.d0) + " ly", here => starInfo(S, here), S.d0 < 20 ? "#ffd6a0" : "#e8eeff");
tag(SUN.clone().add(V3(0, 0.05, 0)), "The Sun", () => "0.15 µm across · the planets fit in 1 mm", () => "<b>The Sun</b>, here at one light-year to the metre: 0.15 thousandths of a millimetre across, far too small to see (the glow marks it). The Earth's orbit is 0.03 mm across; Neptune's 0.9 mm. Everything you could drive to in the 12-inch-globe model is inside this glass bead.", "#ffe08a");
tag(SUN.clone().add(V3(0.6, 0.55, 0)), "The Oort cloud", () => "2,000-100,000 AU · 3 cm to 1.6 m", () => "<b>The Oort cloud</b>: a vast shell of icy bodies thought to surround the Sun, from about 2,000 to 100,000 AU (here 3 cm to 1.6 m), the source of long-period comets. None has been seen out there: it is inferred from comets' orbits. Its outer edge reaches a third of the way to Proxima Centauri.", "#a8c8e8");
tag(V3(0, 300, -26700), "Centre of the Milky Way", () => "26,700 ly · 26.7 km straight ahead", () => "<b>The centre of the Milky Way</b>, 26,700 light-years away: 26.7 km straight ahead along the line on the ground. A black hole of 4.3 million Suns, Sagittarius A*, sits there, hidden from our eyes by dust. The Milky Way's disc is about 100,000 light-years across: here 100 km.", "#ffd080");
const _cp = V3(), _cd = V3();
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const d = _cp.distanceTo(T.p); T.sp.visible = tagsOn && d > 0.3 && (glass || T.p.y > 0 || _cp.y < 0) && (d < 1500 || T.title.startsWith("Centre") || d < T.p.distanceTo(SUN) * 1.5); if (!T.sp.visible) continue;
    T.sp.position.copy(T.p); const w = clampN(d * 0.09, 0.08, 4000); T.sp.scale.set(w, w / 4, 1); const sub = T.subF(); if (sub !== T.last) { T.last = sub; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub, T.col); } } }
function lookedAt() { camera.getWorldDirection(_cd); camera.getWorldPosition(_cp); let best = null, ba = 0.06; for (const T of TAGS) { if (!T.sp.visible) continue; const a = T.p.clone().sub(_cp).normalize().angleTo(_cd); if (a < ba) { ba = a; best = T; } } return best; }

// ---------- messages, readout ----------
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:720px;z-index:2;background:rgba(10,12,22,.88);color:#e4ecff;font:14.5px/1.5 -apple-system,sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(10,12,22,.72);color:#e4ecff;font:13px/1.45 -apple-system,sans-serif;padding:7px 11px;border-radius:8px;display:none"; document.body.appendChild(HUD);
const panT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.userData.c = c; return t; })(), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: panT, transparent: true, depthTest: false }));
vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel);
let msgT = 0, msgAge = 0;
function say(html, secs = 30) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = panT.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(10,12,22,0.92)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#e4ecff"; g.font = "28px sans-serif";
  const words = html.replace(/<[^>]+>/g, "").split(/\s+/); let line = "", y = 48; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 35; if (y > 495) break; } line += w + " "; } if (y <= 495) g.fillText(line, 32, y); panT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
// wrist readout in VR
const wristT = (() => { const c = document.createElement("canvas"); c.width = 640; c.height = 320; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t; })(), wrist = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshBasicMaterial({ map: wristT, transparent: true, toneMapped: false }));
wrist.position.set(0, 0.06, 0.1); wrist.rotation.x = -1.1; wrist.visible = false;
for (const i of [0, 1]) { const grip = renderer.xr.getControllerGrip(i); rig.add(grip); grip.addEventListener("connected", e => { if (e.data.handedness === "left") grip.add(wrist); }); }
function drawWrist(lines) { const g = wristT.userData.c.getContext("2d"); g.clearRect(0, 0, 640, 320); g.fillStyle = "rgba(10,12,22,0.88)"; g.beginPath(); g.roundRect(0, 0, 640, 320, 22); g.fill(); g.fillStyle = "#e4ecff"; g.font = "26px sans-serif"; lines.forEach((l, i) => g.fillText(l, 18, 40 + i * 34, 604)); wristT.needsUpdate = true; }

// ---------- moving: walk (1.4 m a second is 1.4 light-years a second, 44 million times the speed of light), or fly ----------
const keys = {}, prevB = {}; let yaw = 0, pitch = 0.05, vrYaw = 0, started = false, flying = false, seated = false, hud = true, tagsOn = true, glass = false, flySpeedI = 2, factI = -1;
const FLY = [2, 10, 50, 250, 1000, 4000], ME = { x: 0, y: 0, z: 2.2 };
const FACTS = [
  "<b>One light-year to the metre.</b> Light, the fastest thing there is, crosses one metre here in a year. Walking pace here is 44 million times the speed of light.",
  "<b>Walk away from the desk</b> and watch the constellations: their stars only look grouped from here. Orion's Betelgeuse is 500 m away, Rigel 860 m; Alnilam, the middle of the belt, 2 km.",
  "<b>The nearest stars</b> are a few metres apart: Proxima Centauri 4.2 m, Barnard's Star 6 m, Wolf 359 7.9 m, Sirius 8.6 m. Most of them are dim red dwarfs you cannot see with the naked eye.",
  "<b>The stars you see at night</b> are mostly within a kilometre here (1,000 light-years): bright, luminous stars far off and a few faint ones nearby. The Milky Way's band is the glow of millions farther away, out along the ground.",
  "<b>The ground</b> is the plane of the Milky Way's disc, drawn through the desk; the Sun actually sits about 20 light-years above the middle of the disc. The disc of stars is about 1,000 light-years thick: here, a kilometre.",
  "<b>G</b> turns the ground to glass so you can see the stars below it: half the sky is under your feet."];
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") act(); if (e.code === "KeyF") toggleFly(); if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyC") figLines.visible = !figLines.visible; if (e.code === "KeyG") toggleGlass(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyM") seated = !seated;
  if (e.code === "Equal") setFly(flySpeedI + 1); if (e.code === "Minus") setFly(flySpeedI - 1); if (e.code === "KeyR") { ME.x = 0; ME.y = 0; ME.z = 2.2; flying = false; yaw = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function toggleFly() { flying = !flying; if (!flying) ME.y = 0; say(flying ? `<b>Flying</b> at ${FLY[flySpeedI]} m/s (${FLY[flySpeedI]} light-years a second). Space / C up and down (right stick up/down in VR); = and − change speed (left trigger in VR). F again to land.` : "<b>Walking.</b>", 8); }
function setFly(i) { flySpeedI = clampN(i, 0, FLY.length - 1); say(`Flying speed: ${FLY[flySpeedI]} m/s: ${FLY[flySpeedI]} light-years a second`, 5); }
function toggleGlass() { glass = !glass; groundU.op.value = glass ? 0.12 : 1; ground.material.depthWrite = !glass; say(glass ? "<b>Glass ground</b>: the whole sky, including the half below the galactic plane." : "Solid ground.", 6); }
function act() { const T = tagsOn ? lookedAt() : null; camera.getWorldPosition(_cp); if (T) { say(T.infoF(_cp), 45); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 40); }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block"; say("<b>The stars at one light-year to the metre.</b> The Sun is the glint on the desk. Every star is in its real direction and distance and shines as it would from where you stand. Look at a label and press <b>E</b>; <b>F</b> to fly; <b>G</b> glass ground; <b>C</b> constellation lines.", 30); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let frameN = 0;
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; frameN++;
  let mx = 0, my = 0, up = 0, run = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0, b = gp.buttons; const edge = (k, on) => { const r = on && !prevB[k]; prevB[k] = on; return r; };
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!b[0]?.pressed; if (edge("x", b[4]?.pressed)) tagsOn = !tagsOn; if (edge("y", b[5]?.pressed)) figLines.visible = !figLines.visible; if (edge("ls", b[3]?.pressed)) seated = !seated; }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; if (flying && Math.abs(ty) > 0.2) up = -ty;
        if (edge("a", b[4]?.pressed) || edge("tr", b[0]?.pressed)) act(); if (edge("b", b[5]?.pressed)) toggleFly(); if (edge("rs", b[3]?.pressed)) toggleGlass(); } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) up += 1; if (keys.KeyC && flying) up -= 1; }
  if (started) { const f = V3(), r = V3(); camera.getWorldDirection(f); if (!flying) f.y = 0; f.normalize(); r.crossVectors(f, UP).normalize(); const sp = flying ? FLY[flySpeedI] * (run ? 5 : 1) : run ? 6 : 1.4;
    ME.x += (f.x * -my + r.x * mx) * sp * dt; ME.z += (f.z * -my + r.z * mx) * sp * dt; if (flying) { ME.y = Math.max(glass ? -1e5 : 0, ME.y + (f.y * -my + up) * sp * dt); } }
  const lift = vr && seated ? 0.45 : 0; rig.position.set(ME.x, ME.y + lift, ME.z); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  updateTags();
  if (frameN % 10 === 0) { camera.getWorldPosition(_cp); const dSun = _cp.distanceTo(SUN); let near = null, nd = 1e9; for (const S of STARS) { const d = _cp.distanceToSquared(S.p); if (d < nd) { nd = d; near = S; } } nd = Math.sqrt(nd);
    const v = flying ? FLY[flySpeedI] : 1.4, lines = [`From the Sun: ${fmtLy(dSun)} light-years (${fmtM(dSun)})`, `Nearest star: ${near.name || near.bayer || "an unnamed star"}, ${fmtLy(nd)} ly`, `${flying ? "Flying" : "Walking"}: ${v} m/s = ${v} light-years a second (${(v * 31557600).toExponential(1).replace("e+", " × 10^")} × light)`, `Height above the galactic plane: ${fmtLy(_cp.y - SUN.y)} ly`];
    HUD.innerHTML = lines.join("<br>"); HUD.style.display = hud && started ? "block" : "none"; wrist.visible = vr && hud; if (vr && frameN % 30 === 0) drawWrist(lines); }
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
