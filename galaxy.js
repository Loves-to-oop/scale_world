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
function tagTex(title, sub, col = "#ffe8b0", away = "") { const c = document.createElement("canvas"); c.width = 640; c.height = 150; const g = c.getContext("2d"); g.fillStyle = "rgba(10,12,20,0.78)"; g.beginPath(); g.roundRect(4, 4, 632, 142, 20); g.fill(); g.strokeStyle = "rgba(140,170,230,0.55)"; g.lineWidth = 3; g.stroke();
  g.fillStyle = col; g.font = "bold 46px -apple-system, Helvetica, sans-serif"; g.fillText(title, 24, 58, 592); g.font = "bold 40px -apple-system, Helvetica, sans-serif"; g.fillStyle = "#ffffff"; g.fillText(away, 24, 118, 300); const aw = Math.min(300, g.measureText(away).width);
  g.font = "30px -apple-system, Helvetica, sans-serif"; g.fillStyle = "#c8d4ec"; g.fillText((away ? "· " : "") + sub, 24 + aw + (away ? 14 : 0), 117, 592 - aw - 14); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const fmtLy = d => d < 10 ? d.toFixed(1) : Math.round(d).toLocaleString(), fmtM = d => d < 1000 ? (d < 10 ? d.toFixed(1) : Math.round(d)) + " m" : (d / 1000).toFixed(d < 10000 ? 2 : d < 100000 ? 1 : 0) + " km";
function tag(p, title, subF, infoF, col) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(title, ""), depthTest: false, transparent: true, toneMapped: false })); sp.center.set(0.5, -0.2); sp.renderOrder = 30; scene.add(sp); const T = { sp, p, title, subF, infoF, col, last: "", away: true }; TAGS.push(T); return T; }
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
for (const S of tagged) tag(S.p, S.name, () => fmtLy(S.d0) + " ly from the Sun", here => starInfo(S, here), S.d0 < 20 ? "#ffd6a0" : "#e8eeff");
tag(SUN.clone().add(V3(0, 0.05, 0)), "The Sun", () => "0.15 µm across · the planets fit in 1 mm", () => "<b>The Sun</b>, here at one light-year to the metre: 0.15 thousandths of a millimetre across, far too small to see (the glow marks it). The Earth's orbit is 0.03 mm across; Neptune's 0.9 mm. Everything you could drive to in the 12-inch-globe model is inside this glass bead.", "#ffe08a");
tag(SUN.clone().add(V3(0.6, 0.55, 0)), "The Oort cloud", () => "2,000-100,000 AU · 3 cm to 1.6 m", () => "<b>The Oort cloud</b>: a vast shell of icy bodies thought to surround the Sun, from about 2,000 to 100,000 AU (here 3 cm to 1.6 m), the source of long-period comets. None has been seen out there: it is inferred from comets' orbits. Its outer edge reaches a third of the way to Proxima Centauri.", "#a8c8e8");
const _cp = V3(), _cd = V3();
let tagRR = 0;
function updateTags() { camera.getWorldPosition(_cp); let budget = 14; const n = TAGS.length;
  for (let k = 0; k < n; k++) { const T = TAGS[(tagRR + k) % n], d = _cp.distanceTo(T.p); T.sp.visible = tagsOn && d > 0.3 && !(T.near && d > T.near) && (d < 1500 || T.far || d < T.p.distanceTo(SUN) * 1.5); if (!T.sp.visible) continue;
    T.sp.position.copy(T.p); const w = clampN(d * (renderer.xr.isPresenting ? 0.14 : 0.11), 0.12, 9000); T.sp.scale.set(w, w * 150 / 640, 1);
    if (budget > 0) { const away = T.away ? fmtM(d) + " away" : "", sub = T.subF(), key = away + sub; if (key !== T.last) { budget--; T.last = key; T.sp.material.map.dispose(); T.sp.material.map = tagTex(T.title, sub, T.col, away); } } }
  tagRR = (tagRR + 7) % Math.max(1, n); }
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

// ---------- no ground: platforms by the stars, walkways between near ones, bike trails and roads to far ones ----------
// Every walkable surface is a disc (a platform) or a strip (a walkway, trail or road, sloping straight up or down to where it goes).
const galDir = (l, b) => { l *= Math.PI / 180; b *= Math.PI / 180; return V3(-Math.cos(b) * Math.sin(l), Math.sin(b), -Math.cos(b) * Math.cos(l)); };
const SURF = [], platM = M(0x3a4048, { metalness: 0.5, roughness: 0.45 });
function platform(c, r, col = 0x5a8ad0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, 0.12, 40), platM); m.position.copy(c).add(V3(0, -0.06, 0)); scene.add(m);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: col })); rim.position.copy(c).add(V3(0, 0.02, 0)); scene.add(rim); SURF.push({ k: "disc", c: c.clone(), r }); return c; }
const stripTex = draw => { const c = document.createElement("canvas"); c.width = 128; c.height = 256; draw(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const STRIP = { walk: [stripTex(g => { g.fillStyle = "#59636e"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#8ab4e8"; g.fillRect(0, 0, 8, 256); g.fillRect(120, 0, 8, 256); g.fillStyle = "#4a535c"; for (let y = 0; y < 256; y += 32) g.fillRect(8, y, 112, 3); }), 1.0, 1.0],
  trail: [stripTex(g => { g.fillStyle = "#7a4a34"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#4ad07a"; g.fillRect(0, 0, 6, 256); g.fillRect(122, 0, 6, 256); g.fillStyle = "#f0e8d8"; g.fillRect(60, 0, 8, 128); }), 1.3, 4],
  road: [stripTex(g => { g.fillStyle = "#2c2e32"; g.fillRect(0, 0, 128, 256); g.fillStyle = "#e8e8e8"; g.fillRect(4, 0, 5, 256); g.fillRect(119, 0, 5, 256); g.fillStyle = "#f0c020"; g.fillRect(60, 0, 8, 150); }), 4.0, 12] };
// paths fade to ghosts near the desk, so the view of the sky from the Sun stays clear
function fadeMat(mat) { mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWf;").replace("#include <project_vertex>", "#include <project_vertex>\nvWf = (modelMatrix * vec4(transformed, 1.0)).xyz;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWf;").replace("#include <opaque_fragment>", "diffuseColor.a *= mix(0.12, 1.0, smoothstep(3.0, 14.0, length(vWf - vec3(0.0, 1.0, 0.0))));\n#include <opaque_fragment>"); }; return mat; }
function strip(a, b, kind, lift = 0) { const [tex, w, rep] = STRIP[kind], d = V3().subVectors(b, a), L = d.length(); d.divideScalar(L); const sd = V3().crossVectors(d, UP).normalize(), n = V3().crossVectors(sd, d);
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(1, L / rep); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), fadeMat(new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, transparent: true, depthWrite: false })));
  m.matrixAutoUpdate = false; m.matrix.makeBasis(sd, d, n).setPosition(V3().addVectors(a, b).multiplyScalar(0.5).addScaledVector(UP, lift)); scene.add(m); SURF.push({ k: "strip", a: a.clone(), b: b.clone(), w }); return { a, b, L, d, sd, n }; }
function groundAt(x, z, yRef) { let best = null; for (const S of SURF) { let h = null;
    if (S.k === "disc") { if ((x - S.c.x) ** 2 + (z - S.c.z) ** 2 <= S.r * S.r) h = S.c.y; }
    else { const ax = S.b.x - S.a.x, az = S.b.z - S.a.z, l2 = ax * ax + az * az; if (l2 < 1e-6) continue; const t = ((x - S.a.x) * ax + (z - S.a.z) * az) / l2; if (t < 0 || t > 1) continue; const px = S.a.x + ax * t - x, pz = S.a.z + az * t - z; if (px * px + pz * pz > (S.w / 2) ** 2) continue; h = S.a.y + (S.b.y - S.a.y) * t; }
    if (h !== null && h <= yRef + 0.7 && (best === null || Math.abs(h - yRef) < Math.abs(best - yRef))) best = h; } return best; }
// the hub round the desk, and the car park behind it
const HUB = platform(V3(0, 0, 0), 2.5, 0xffd080), PARK = platform(V3(0, 0, 7), 2.6, 0xffd080); strip(V3(0, 0, 2.3), V3(0, 0, 4.6), "walk");
// near stars: a platform under each (the star glows just above it), joined to the hub and to each other by the shortest network of walkways
const NEAR = [], usedP = [];
for (const S of STARS.filter(s => s.name && s.d0 < 21).sort((a, b) => a.d0 - b.d0)) { const c = V3(S.p.x, S.p.y - 1.25, S.p.z); if (Math.hypot(c.x, c.z) < 2.5 + 1.3 || usedP.some(q => q.distanceTo(c) < 2.4)) { const q = usedP.find(q => q.distanceTo(c) < 2.4); if (q) q.names.push(S.name); continue; }
  c.names = [S.name]; usedP.push(c); platform(c, 1.1); NEAR.push(c); }
{ const nodes = [HUB, ...NEAR], inT = [true], best = nodes.map(n => n.distanceTo(HUB)), from = nodes.map(() => 0); for (let k = 1; k < nodes.length; k++) inT.push(false);
  for (let it = 1; it < nodes.length; it++) { let j = -1; for (let i = 0; i < nodes.length; i++) if (!inT[i] && (j < 0 || best[i] < best[j])) j = i; inT[j] = true; strip(nodes[from[j]], nodes[j], "walk", 0.004 * (it % 3));
    for (let i = 0; i < nodes.length; i++) if (!inT[i]) { const d = nodes[i].distanceTo(nodes[j]); if (d < best[i]) { best[i] = d; from[i] = j; } } } }
// far places: bike trails from the hub, roads from the car park; each ends at a platform with a beacon tower, taller the farther it is
const BIKE = ["Vega", "Fomalhaut", "Arcturus", "Capella", "Aldebaran", "Regulus", "Achernar", "Spica", "Canopus", ["the Pleiades", "Alcyone"], "Polaris", "Betelgeuse", "Antares", "Rigel"];
const CAR = [["Deneb", "Deneb"], { n: "the Orion Nebula", l: 209.01, b: -19.38, d: 1344, R: 12, col: 0xff8ab0, info: "<b>The Orion Nebula</b>, 1,344 light-years away: a cloud of gas 24 light-years across (24 m here) where stars are being born, lit by the hot young stars of the Trapezium at its heart. The middle 'star' of Orion's sword." },
  { n: "the Crab Nebula", l: 184.56, b: -5.78, d: 6500, R: 5.5, col: 0xff9a60, info: "<b>The Crab Nebula</b>, about 6,500 light-years away: the wreck of a star seen to explode in the year 1054, recorded by Chinese astronomers; 11 light-years across and still expanding at 1,500 km a second, a pulsar spinning 30 times a second at its centre." },
  { n: "Eta Carinae", l: 287.6, b: -0.63, d: 7500, R: 60, col: 0xffb080, info: "<b>Eta Carinae</b>, about 7,500 light-years away: one of the most massive stars known, about 100 Suns, in the Carina Nebula. In the 1840s it flared to become the second brightest star in the sky; it may explode soon (in astronomical terms)." },
  { n: "the centre of the Milky Way", l: 359.944, b: -0.046, d: 26670, R: 1200, col: 0xffd080, info: "<b>The centre of the Milky Way</b>, 26,670 light-years away: here 26.7 km. A black hole of 4.3 million Suns, Sagittarius A*, sits in a crowd of stars, hidden from our eyes by dust; the glow here stands for the dense central bulge of old stars. The Milky Way's disc is about 100,000 light-years across: here, 100 km." },
  { n: "the Large Magellanic Cloud", l: 280.47, b: -32.89, d: 163000, R: 7000, col: 0xc8d0ff, info: "<b>The Large Magellanic Cloud</b>, 163,000 light-years away (163 km here): a small galaxy orbiting ours, 14,000 light-years across, seen from the southern hemisphere as a detached piece of the Milky Way. Supernova 1987A exploded in it." }];
const PATHS = [], BEACONS = [], LMS = [];
// a familiar object at real size beside each far platform, so you can judge the distance: a lamppost, a school bus, a house, a lighthouse,
// a skyscraper (the Willis Tower's 442 m), a mountain, Mount Everest
const LMK = [[60, "lamppost", 0.8, 4.5], [200, "bus", 7, 3.2], [700, "house", 9, 9], [2000, "lighthouse", 5, 32], [10000, "tower", 45, 442], [60000, "mountain", 3600, 1800], [1e9, "Everest", 16000, 8849]];
function landmark(dist, base, side, fwd, name, kind) { const [, type, rad, h] = LMK.find(q => dist < q[0]), g = new THREE.Group(), at = base.clone().addScaledVector(side, (kind === "road" ? 4 : 2) + rad + 1.5); g.position.copy(at); g.lookAt(at.x - fwd.x, at.y, at.z - fwd.z); scene.add(g);
  const add = (geo, m, x, y, z) => { if (m.isMeshStandardMaterial && !m.vertexColors) { m.emissive = m.color.clone(); m.emissiveIntensity = 0.45; } const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; }, B = c => new THREE.MeshBasicMaterial({ color: c });
  LMS.push({ name, type, at: at.clone(), h, g });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(rad * 1.15 + 0.5, rad * 1.1 + 0.5, Math.max(0.1, rad * 0.02), 32), platM); plinth.position.y = -Math.max(0.1, rad * 0.02) / 2; g.add(plinth);
  if (type === "lamppost") { add(new THREE.CylinderGeometry(0.06, 0.09, 4.5, 10), M(0x2a3a2a), 0, 2.25, 0); add(new THREE.BoxGeometry(0.9, 0.06, 0.08), M(0x2a3a2a), 0.4, 4.4, 0); add(new THREE.SphereGeometry(0.16, 12, 8), B(0xfff0c0), 0.8, 4.28, 0); }
  else if (type === "bus") { add(new THREE.BoxGeometry(2.5, 2.6, 11), M(0xf2b800, { roughness: 0.5 }), 0, 1.75, 0); add(new THREE.BoxGeometry(2.52, 0.8, 9), B(0x1a2028), 0, 2.4, -0.6); add(new THREE.BoxGeometry(2.55, 0.15, 11.02), M(0x111111), 0, 1.3, 0); for (const z of [-3.8, 3.6]) for (const x of [-1.15, 1.15]) add(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16).rotateZ(Math.PI / 2), M(0x151515), x, 0.5, z); }
  else if (type === "house") { add(new THREE.BoxGeometry(9, 5.4, 7.5), M(0xe8dcc0), 0, 2.7, 0); const roof = add(new THREE.CylinderGeometry(0.01, 6.4, 3.6, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.84), M(0x8a3a2a), 0, 7.2, 0); roof.scale.set(1, 1, 1); add(new THREE.BoxGeometry(1.1, 2.1, 0.1), M(0x5a3a22), 0, 1.05, 3.8); add(new THREE.BoxGeometry(1.0, 3.2, 1.0), M(0x8a5a4a), 2.6, 7.6, 0);
    for (const [x, y] of [[-2.8, 1.6], [2.8, 1.6], [-2.8, 4.1], [0, 4.1], [2.8, 4.1]]) add(new THREE.BoxGeometry(1.2, 1.1, 0.1), B(0xffd890), x, y, 3.8); }
  else if (type === "lighthouse") { for (let k = 0; k < 6; k++) add(new THREE.CylinderGeometry(3.6 - (k + 1) * 0.35, 3.6 - k * 0.35, 4.6, 24), M(k % 2 ? 0xc02020 : 0xf4f4f0), 0, 2.3 + k * 4.6, 0); add(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 24), M(0x222222), 0, 27.8, 0); add(new THREE.CylinderGeometry(1.4, 1.4, 2.4, 16), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }), 0, 29.2, 0); add(new THREE.ConeGeometry(1.7, 1.6, 16), M(0x222222), 0, 31.2, 0); }
  else if (type === "tower") { const wt = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d"); x.fillStyle = "#1a1e24"; x.fillRect(0, 0, 128, 128); for (let r = 0; r < 16; r++) for (let q = 0; q < 8; q++) { x.fillStyle = Math.random() < 0.55 ? "#ffd890" : "#2a3038"; x.fillRect(q * 16 + 3, r * 8 + 2, 10, 5); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (const [w, y0, y1] of [[68, 0, 200], [48, 200, 330], [32, 330, 412]]) { const t = wt.clone(); t.needsUpdate = true; t.repeat.set(w / 8, (y1 - y0) / 8); add(new THREE.BoxGeometry(w, y1 - y0, w), new THREE.MeshBasicMaterial({ map: t }), 0, (y0 + y1) / 2, 0); } for (const x of [-6, 6]) add(new THREE.CylinderGeometry(0.8, 1.2, 30, 8), M(0xcccccc), x, 427, 0); }
  else { const geo = new THREE.ConeGeometry(rad, h, 64, 24, true), p = geo.attributes.position, col = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 1 + 0.12 * (Math.sin(p.getX(i) / rad * 9) + Math.cos(p.getZ(i) / rad * 7)) * (1 - Math.abs(y / h * 2)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); const snow = (y / h + 0.5) > 0.72; col.set(snow ? [0.92, 0.94, 0.98] : [0.42, 0.38, 0.34], i * 3); }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); add(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, emissive: 0x202020 }), 0, h / 2, 0); }
  const short = name.replace(/^the /, "").replace("centre of the Milky Way", "Galactic Centre"), what = { lamppost: "lamppost", bus: "school bus", house: "house", lighthouse: "lighthouse", tower: "tower", mountain: "mountain", Everest: "mountain" }[type];
  const label = `The ${short} ${what}`, real = { lamppost: "a lamppost, 4.5 m tall", bus: "a school bus, 11 m long", house: "a house, 9 m tall", lighthouse: "a lighthouse, 32 m tall", tower: "a skyscraper as tall as Chicago's Willis Tower, 442 m", mountain: "a mountain 1.8 km high", Everest: "a mountain as high as Everest, 8.8 km" }[type];
  const T = tag(at.clone().add(V3(0, h * 1.08 + 1.2, 0)), label, () => `${fmtM(dist)} from the desk`, () => `<b>${label}</b>: ${real}, at real size, ${fmtM(dist)} from the desk: as many metres as ${name} is light-years from the Sun. A familiar object to judge the distance by; the platform beside it is where the ${kind === "road" ? "road" : "bike trail"} ends.`, "#ffd890"); T.far = dist > 1500;
  return { top: at.clone().add(V3(0, h, 0)), h }; }
function destination(kind, D) { let S = null, name, p, R = 0, col = 0xffffff; if (typeof D === "string" || Array.isArray(D)) { const [nm, star] = Array.isArray(D) ? D : [D, D]; S = byName(star); if (!S) return; name = nm; p = S.p.clone(); col = new THREE.Color().fromArray(COL, S.i * 3).getHex(); }
  else { name = D.n; p = galDir(D.l, D.b).multiplyScalar(D.d).add(SUN); R = D.R; col = D.col; }
  const from = kind === "road" ? PARK : HUB, dist = p.distanceTo(SUN), hdir = V3(p.x - from.x, 0, p.z - from.z).normalize(), a = from.clone().addScaledVector(hdir, kind === "road" ? 2.4 : 2.3);
  const toP = V3().subVectors(p, a), stop = R + 3, end = p.clone().addScaledVector(toP.normalize(), -stop); end.y = p.y - (R ? 0 : 1.25) + (R ? -R * 0.3 : 0);
  const c = platform(end, kind === "road" ? 4 : 2, col), path = strip(a, end.clone().addScaledVector(V3(end.x - a.x, 0, end.z - a.z).normalize(), -0.5), kind, 0.006 * (PATHS.length % 4));
  const LM = landmark(dist, c, path.sd, path.d, name, kind), lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lamp.position.copy(LM.top).add(V3(0, LM.h * 0.06 + 1, 0)); lamp.scale.setScalar(dist * 0.006 + 1); scene.add(lamp); BEACONS.push(lamp);
  PATHS.push({ kind, name, a: path.a, b: path.b, L: path.a.distanceTo(path.b), d: path.d, sd: path.sd, n: path.n, end: c, dist, S });
  if (R) { const n = R > 1000 ? 900 : 300, ps = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, f = Math.random() * 6.283, r = R * Math.cbrt(Math.random()) * (R > 5000 ? 1 : 1), q = Math.sqrt(1 - u * u); ps.set([p.x + r * q * Math.cos(f), p.y + r * u * (R > 5000 ? 0.15 : 0.7), p.z + r * q * Math.sin(f)], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(ps, 3)); const cloud = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: R * (R > 500 ? 0.12 : 0.3), map: glowT, transparent: true, opacity: R > 500 ? 0.1 : 0.3, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); cloud.frustumCulled = false; scene.add(cloud);
    const T = tag(p.clone().add(V3(0, R * 0.8, 0)), name.replace(/^the /, "The "), () => fmtM(dist) + " from the Sun · " + fmtLy(dist) + " ly", () => D.info, "#ffd8a8"); T.far = true; }
  const sign = tag(a.clone().add(V3(0, 1.9, 0)).addScaledVector(hdir, 0.2), (kind === "road" ? "🚗 " : "🚲 ") + name.replace(/^the /, "The "), () => fmtM(dist) + (kind === "road" ? " by road" : " by bike trail"), () => `<b>${kind === "road" ? "Road" : "Bike trail"} to ${name}</b>: ${fmtM(dist)}, ${p.y - SUN.y > 0 ? "climbing" : "descending"} ${fmtM(Math.abs(p.y - SUN.y))} on the way. Take the ${kind === "road" ? "car from the car park" : "bike from the hub"}: E beside it.`, kind === "road" ? "#ffe08a" : "#a8f0b8"); sign.near = 25; }
BIKE.forEach(D => destination("trail", D)); CAR.forEach(D => destination("road", D));

// ---------- microscopes: whatever it would take to see each thing at this scale ----------
// At a light-year to the metre the Sun is 147 nm across, the size of a flu virus: smaller than a light microscope can resolve (about
// 200 nm), so an electron microscope stands at the desk. Each platform has the instrument its star needs: an electron microscope
// below about 250 nm, a light microscope up to a couple of millimetres. Star radii (in Suns) from published measurements; for stars
// without one, estimated from luminosity and colour (R = √L × (5,772 K / T)²).
const LY_M = 9.4607e15, RSUN = 6.957e8, RAD = { Sun: 1, "Proxima Centauri": 0.154, "Rigil Kentaurus": 1.22, Toliman: 0.86, "Barnard's Star": 0.19, "Wolf 359": 0.16, "Lalande 21185": 0.39, Sirius: 1.71, Procyon: 2.05, Ran: 0.74, Altair: 1.8,
  Vega: 2.4, Fomalhaut: 1.84, Arcturus: 25.4, Capella: 12, Aldebaran: 45, Regulus: 4.2, Achernar: 9, Spica: 7.5, Canopus: 71, Alcyone: 9.3, Polaris: 46, Betelgeuse: 764, Antares: 680, Rigel: 79, Deneb: 203, "Luyten's Star": 0.29, Keid: 0.81, "Ross 128": 0.2, "Kapteyn's Star": 0.29, "Ross 154": 0.24, "Ross 248": 0.16, "Groombridge 34": 0.38, "Lacaille 9352": 0.47, "EZ Aqr": 0.15, "Struve 2398 A": 0.35, "Struve 2398 B": 0.28, "Kruger 60": 0.35, "Ross 614": 0.24,
  "Van Maanen's Star": 0.011, "Wolf 1061": 0.31, "Lacaille 8760": 0.51, Alsafi: 0.78, Guniibuu: 0.69, Achird: 1.04, "82 G. Eri": 0.92 };
const BC = bv => bv < -0.2 ? -2.5 : bv < 0 ? -2.0 + 8.5 * (bv + 0.2) : bv < 0.6 ? -0.3 + 0.42 * bv : bv < 1.0 ? -0.05 - 0.875 * (bv - 0.6) : bv < 1.4 ? -0.4 - 2 * (bv - 1.0) : bv < 1.8 ? -1.2 - 3.25 * (bv - 1.4) : Math.max(-4.5, -2.5 - 3 * (bv - 1.8));
function radiusOf(S) { if (RAD[S.name]) return RAD[S.name]; const bv = STAR_NUM[S.i * 6 + 4], L = Math.pow(10, -0.4 * (S.M + BC(bv) - 4.74)), T = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62)); return Math.sqrt(L) * (5772 / T) ** 2; }
const SIZES = [[1e-10, "the size of an atom"], [1.4e-9, "the size of a small protein molecule"], [5e-9, "the size of a large protein"], [2.5e-8, "the size of a ribosome or the smallest viruses"], [1.2e-7, "the size of a flu virus"], [2.5e-7, "the size of the smallest bacteria"], [2e-6, "the size of a bacterium"], [7e-6, "the size of a red blood cell"], [2.5e-5, "the size of a skin cell"], [8e-5, "the width of a hair"], [1e-3, "the size of a grain of sand"]];
const likeSize = sz => { let best = SIZES[0]; for (const s of SIZES) if (Math.abs(Math.log(s[0] / sz)) < Math.abs(Math.log(best[0] / sz))) best = s; return best[1]; };
const p3 = x => String(parseFloat(x.toPrecision(3))), fmtLen = m => m < 1e-9 ? p3(m * 1e12) + " pm" : m < 1e-6 ? p3(m * 1e9) + " nm" : m < 1e-3 ? p3(m * 1e6) + " µm" : p3(m * 1e3) + " mm";
const niceMag = x => { const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * e; };
function instrument(sz) { if (sz < 5e-11) return { kind: "none" }; if (sz < 2.5e-7) return { kind: "em", mag: niceMag(0.06 / sz) }; return { kind: "light", mag: [40, 100, 400, 1000].slice().reverse().find(m => m * sz <= 0.06) || 40 }; }
// one view = one thing seen down an instrument
function starView(S, name) { const R = radiusOf(S), sz = 2 * R * RSUN / LY_M, real = 2 * R * RSUN / 1000; return { name: name || S.name, sz, real, col: COL.slice(S.i * 3, S.i * 3 + 3), kind: "star", giant: R > 30, est: !RAD[S.name] }; }
const VIEWS_SUN = { name: "the Sun", sz: 2 * RSUN / LY_M, real: 1392700, col: [1, 0.96, 0.85], kind: "star" }, VIEW_EARTH = { name: "the Earth", sz: 12742e3 / LY_M, real: 12742, col: [0.35, 0.55, 0.9], kind: "planet" };
const VIEW_SYS = { name: "the solar system", sz: 60 * 1.496e11 / LY_M, real: 60 * 1.496e8, kind: "system" };
function drawView(g, V, W) { const I = V.inst || instrument(V.sz), em = I.kind === "em", cx = W / 2, cy = W / 2 - 30, R0 = W * 0.42;
  g.fillStyle = "#000"; g.fillRect(0, 0, W, W); g.save(); g.beginPath(); g.arc(cx, cy, R0, 0, 7); g.clip(); g.fillStyle = em ? "#2a2a2a" : V.kind === "system" ? "#05060a" : "#e8e4d8"; g.fillRect(0, 0, W, W);
  if (I.kind === "none") { g.fillStyle = "#3a3a3a"; g.fillRect(0, 0, W, W); for (let i = 0; i < 4000; i++) { const v = 40 + Math.random() * 40; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); } }
  else { const app = V.sz * I.mag, pxPerM = (2 * R0) / 0.09, r = Math.max(1.5, app * pxPerM / 2);
    if (em) { for (let i = 0; i < 9000; i++) { const v = 30 + Math.random() * 30; g.fillStyle = `rgba(${v},${v},${v},0.6)`; g.fillRect(Math.random() * W, Math.random() * W, 2, 2); } const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r); gr.addColorStop(0, "#e8e8e8"); gr.addColorStop(0.7, "#9a9a9a"); gr.addColorStop(1, "#d8d8d8"); g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 2; g.stroke(); }
    else if (V.kind === "system") { const AUpx = r / 30; for (const a of [0.39, 0.72, 1, 1.52, 5.2, 9.58, 19.2, 30.1]) { g.strokeStyle = a === 1 ? "rgba(120,180,255,0.9)" : "rgba(200,200,220,0.5)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, a * AUpx, 0, 7); g.stroke(); } g.fillStyle = "#fff4c0"; g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill();
      g.fillStyle = "#c8d4ec"; g.font = "22px sans-serif"; g.fillText("Neptune", cx + 30.1 * AUpx * 0.72, cy - 30.1 * AUpx * 0.72); g.fillText("Earth's orbit", cx + AUpx * 1.2, cy + AUpx * 3 + 20); }
    else { const [cr, cg, cb] = V.col.map(c => Math.round(c * 255)), gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, `rgb(${cr},${cg},${cb})`); gr.addColorStop(0.85, `rgb(${Math.round(cr * 0.75)},${Math.round(cg * 0.6)},${Math.round(cb * 0.5)})`); gr.addColorStop(1, `rgb(${Math.round(cr * 0.5)},${Math.round(cg * 0.35)},${Math.round(cb * 0.25)})`);
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); if (V.giant) for (let i = 0; i < 14; i++) { const a = Math.random() * 7, d = Math.random() * r * 0.7, s = r * (0.12 + Math.random() * 0.15); g.fillStyle = `rgba(255,240,200,${0.08 + Math.random() * 0.1})`; g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, 7); g.fill(); } }
    if (V.kind === "bh") { g.fillStyle = "#000"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = "rgba(255,170,80,0.8)"; g.lineWidth = r * 0.25; g.beginPath(); g.arc(cx, cy, r * 1.35, 0, 7); g.stroke(); }
    const fieldM = 0.09 / I.mag * 0.35, bar = (() => { const t = fieldM * 0.8, e = Math.pow(10, Math.floor(Math.log10(t))), f = t / e; return (f < 2 ? 1 : f < 5 ? 2 : 5) * e; })(), bpx = bar * I.mag * pxPerM;
    g.fillStyle = em ? "#fff" : V.kind === "system" ? "#fff" : "#111"; g.fillRect(cx - bpx / 2, cy + R0 * 0.8, bpx, 8); g.font = "bold 26px sans-serif"; g.textAlign = "center"; g.fillText(fmtLen(bar), cx, cy + R0 * 0.76); g.textAlign = "left"; }
  g.restore(); g.strokeStyle = "#555"; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, R0, 0, 7); g.stroke();
  g.fillStyle = "#e4ecff"; g.font = "bold 34px sans-serif"; g.textAlign = "center"; g.fillText(V.name.replace(/^the /, "The ") + (I.kind === "none" ? "" : I.kind === "em" ? `: electron microscope, ×${I.mag.toLocaleString()}` : `: light microscope, ×${I.mag}`), cx, W - 78, W - 30);
  g.font = "25px sans-serif"; g.fillStyle = "#c8d4ec"; g.fillText(V.note || (I.kind === "none" ? "" : `${fmtLen(V.sz)} here (really ${Number(V.real.toPrecision(3)).toLocaleString()} km): about ${likeSize(V.sz)}${V.est ? " (size estimated)" : ""}`), cx, W - 36, W - 30); g.textAlign = "left"; }
// the instruments
const scopeM = M(0xe8e8e4, { roughness: 0.4 }), scopeDark = M(0x2a2a2e, { roughness: 0.5 }), SCOPES = [];
function scope(pos, faceTo, views) { const kind = (views[0].inst || instrument(views[0].sz)).kind, g = new THREE.Group(); g.position.copy(pos); g.lookAt(faceTo.x, pos.y, faceTo.z); scene.add(g);
  const add = (geo, m, x, y, z) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); g.add(me); return me; };
  let eye, screen = null;
  if (kind === "em") { add(new THREE.BoxGeometry(1.0, 0.75, 0.6), scopeM, 0, 0.375, 0); add(new THREE.CylinderGeometry(0.16, 0.2, 1.7, 20), scopeM, -0.35, 1.6, -0.1); add(new THREE.CylinderGeometry(0.22, 0.22, 0.25, 20), scopeDark, -0.35, 0.88, -0.1);
    const c = document.createElement("canvas"); c.width = c.height = 512; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; screen = add(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), 0.2, 1.05, 0.05); screen.rotation.x = -0.25; screen.userData.c = c; screen.userData.t = t; add(new THREE.BoxGeometry(0.54, 0.54, 0.03), scopeDark, 0.2, 1.05, 0.03).rotation.x = -0.25; eye = V3(0.2, 1.05, 0.3); }
  else if (kind === "light") { add(new THREE.BoxGeometry(0.45, 0.95, 0.45), scopeDark, 0, 0.475, 0); add(new THREE.BoxGeometry(0.22, 0.04, 0.28), scopeM, 0, 0.97, 0); const arm = add(new THREE.BoxGeometry(0.05, 0.3, 0.06), scopeM, 0, 1.12, -0.1); arm.rotation.x = 0.25;
    add(new THREE.BoxGeometry(0.14, 0.015, 0.12), scopeDark, 0, 1.08, 0.02); const tube = add(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 12), scopeDark, 0, 1.26, 0.04); tube.rotation.x = -0.5; add(new THREE.CylinderGeometry(0.018, 0.026, 0.05, 12), M(0x888888, { metalness: 0.7 }), 0, 1.15, 0.02); eye = V3(0, 1.36, 0.1); }
  else { add(new THREE.BoxGeometry(0.6, 1.0, 0.1), scopeDark, 0, 0.5, 0); const c = document.createElement("canvas"); c.width = c.height = 512; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; screen = add(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), 0, 1.3, 0.06); screen.userData.c = c; screen.userData.t = t; eye = V3(0, 1.3, 0.3); }
  g.updateMatrixWorld(true); const S = { g, views, i: 0, eye: g.localToWorld(eye.clone()), screen, kind }; SCOPES.push(S); if (screen) { drawView(screen.userData.c.getContext("2d"), views[0], 512); screen.userData.t.needsUpdate = true; } return S; }
// the desk: a light microscope for the planets' orbits, an electron microscope for the Sun and the Earth
scope(V3(-1.3, 0, -0.9), V3(0, 0, 1.6), [{ ...VIEW_SYS, inst: { kind: "light", mag: 40 } }]);
scope(V3(1.4, 0, -0.9), V3(0, 0, 1.6), [VIEWS_SUN, VIEW_EARTH]);
for (const c of NEAR) { const stars = c.names.map(byName).filter(Boolean), hd = V3(-c.x, 0, -c.z).normalize(), side = V3(hd.z, 0, -hd.x); scope(c.clone().addScaledVector(side, 0.65).addScaledVector(hd, 0.2), c.clone().addScaledVector(hd, 2), stars.map(s => starView(s))); }
for (const P of PATHS) { const at = P.end.clone().addScaledVector(P.sd, P.kind === "road" ? -2.4 : -1.2), face = P.end.clone().addScaledVector(P.d, -3);
  if (P.S) scope(at, face, [starView(P.S, P.name)]);
  else if (P.name.includes("Crab")) scope(at, face, [{ name: "the Crab pulsar", sz: 20000 / LY_M, real: 20, kind: "star", col: [0.8, 0.9, 1], inst: { kind: "none" }, note: "a neutron star 20 km across: here 2 picometres, a fiftieth of an atom. No microscope could ever show it." }]);
  else if (P.name.includes("centre")) scope(at, face, [{ name: "Sagittarius A*", sz: 2.54e10 / LY_M, real: 25400000, kind: "bh", col: [0, 0, 0], note: "the black hole's event horizon: 25 million km across, here 2.7 µm, the size of a bacterium" }]); }
// looking: E (A) beside an instrument, or in VR lean your head into a light microscope's eyepiece
const viewC = document.createElement("canvas"); viewC.width = viewC.height = 1024; viewC.style.cssText = "position:fixed;left:50%;top:50%;width:min(86vh,86vw);height:min(86vh,86vw);transform:translate(-50%,-50%);z-index:4;display:none;border-radius:50%"; document.body.appendChild(viewC);
const viewT = new THREE.CanvasTexture(viewC); viewT.colorSpace = THREE.SRGBColorSpace; const viewPanel = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshBasicMaterial({ map: viewT, toneMapped: false, depthTest: false })); viewPanel.position.set(0, 0, -0.45); viewPanel.renderOrder = 100; viewPanel.visible = false; camera.add(viewPanel);
let viewing = null;
function showView(S) { S.auto = false; viewing = S; drawView(viewC.getContext("2d"), S.views[S.i], 1024); viewT.needsUpdate = true; if (renderer.xr.isPresenting) viewPanel.visible = true; else viewC.style.display = "block"; }
function closeView() { viewing = null; viewC.style.display = "none"; viewPanel.visible = false; }
function nearScope(r = 1.8) { camera.getWorldPosition(_cp); let best = null, bd = r; for (const S of SCOPES) { const d = S.eye.distanceTo(_cp); if (d < bd) { bd = d; best = S; } } return best; }
function scopeUse() { if (viewing) { if (viewing.i < viewing.views.length - 1) { viewing.i++; showView(viewing); } else { viewing.i = 0; closeView(); } return true; } const S = nearScope(); if (S) { S.i = 0; showView(S); if (S.views.length > 1) say("E again for the next view; it closes after the last.", 5); return true; } return false; }

// ---------- the bike and the car: ride along a trail or road; choose where at the start ----------
function makeBike() { const g = new THREE.Group(), m = M(0x2a8a4a, { metalness: 0.5 }), dark = M(0x202020); for (const z of [-0.5, 0.5]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 8, 24).rotateY(Math.PI / 2), dark); w.position.set(0, 0.34, z); g.add(w); }
  const bar = (a, b) => { const d = V3().subVectors(b, a), me = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, d.length(), 6), m); me.position.copy(a).add(b).multiplyScalar(0.5); me.quaternion.setFromUnitVectors(UP, d.normalize()); g.add(me); };
  bar(V3(0, 0.34, 0.5), V3(0, 0.75, 0.05)); bar(V3(0, 0.75, 0.05), V3(0, 0.78, -0.4)); bar(V3(0, 0.34, -0.5), V3(0, 0.78, -0.4)); bar(V3(0, 0.34, 0.5), V3(0, 0.4, -0.05)); bar(V3(0, 0.4, -0.05), V3(0, 0.75, 0.05)); bar(V3(-0.25, 0.95, -0.42), V3(0.25, 0.95, -0.42)); bar(V3(0, 0.78, -0.4), V3(0, 0.95, -0.42));
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.25), dark); seat.position.set(0, 0.8, 0.08); g.add(seat); scene.add(g); return g; }
function makeCar() { const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4.0), M(0xc83a2a, { metalness: 0.4, roughness: 0.35 })); body.position.y = 0.55; g.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.08, 1.2), M(0x8a2418)); hood.position.set(0, 0.86, -1.3); g.add(hood); const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshPhysicalMaterial({ color: 0x9ac0e0, transparent: true, opacity: 0.25, roughness: 0.05 })); ws.position.set(0, 1.05, -0.6); ws.rotation.x = -0.5; g.add(ws);
  for (const [x, z] of [[-0.85, -1.3], [0.85, -1.3], [-0.85, 1.3], [0.85, 1.3]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 16).rotateZ(Math.PI / 2), M(0x181818)); w.position.set(x, 0.33, z); g.add(w); }
  for (const x of [-0.45, 0.45]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), M(0x2a2a2a)); st.position.set(x, 0.75, 0.3); g.add(st); }
  for (const x of [-0.6, 0.6]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), new THREE.MeshBasicMaterial({ color: 0xfff4d0 })); hl.position.set(x, 0.62, -2.01); hl.rotation.y = Math.PI; g.add(hl); } scene.add(g); return g; }
const VEH = { bike: { mesh: makeBike(), kind: "trail", cmin: 5, cmax: 60, eye: 1.55, seat: V3(0, 0, 0.08), P: 0, s: 0, v: 0, dir: 1, leg: null, queue: [], name: "bike" }, car: { mesh: makeCar(), kind: "road", cmin: 20, cmax: 4000, eye: 1.2, seat: V3(-0.45, 0, 0.3), P: 0, s: 0, v: 0, dir: 1, leg: null, queue: [], name: "car" } };
const pathsOf = V => PATHS.filter(p => p.kind === V.kind);
function vehPose(V) { const P = pathsOf(V)[V.P], pos = P.a.clone().addScaledVector(P.d, V.s), f = P.d.clone().multiplyScalar(V.dir), sd = P.sd.clone().multiplyScalar(V.dir); return { P, pos, f, m: new THREE.Matrix4().makeBasis(sd, P.n, f.clone().negate()) }; }
function placeVeh(V) { const { pos, m } = vehPose(V); V.mesh.position.copy(pos); V.mesh.quaternion.setFromRotationMatrix(m); }
let riding = null;
// autopilot: choose where when you get on; it drives there (back past the hub first if you are out at another place)
function mount(V) { riding = V; V.v = 0; yaw = 0; pitch = 0; vrYaw = 0; openMenu(); }
function planTo(V, k) { V.queue = []; const paths = pathsOf(V); if (V.s > 0.5 && k !== V.P) V.queue.push({ P: V.P, dir: -1 }); if (k >= 0 && !(k === V.P && V.s >= paths[k].L - 0.5)) V.queue.push({ P: k, dir: 1 }); V.leg = null; V.goal = k; }
function arrived(V) { const P = pathsOf(V)[V.P]; say(V.s > 1 ? `<b>${P.name}</b>, ${fmtM(P.dist)} from the Sun (${fmtLy(P.dist)} light-years). E for the menu: get off, or go somewhere else.` : `<b>Back at the ${V.kind === "road" ? "car park" : "hub"}</b> by the Sun. E for the menu.`, 12); }
let menu = null;
const menuC = document.createElement("canvas"); menuC.width = 900; menuC.height = 1100; menuC.style.cssText = "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);height:min(88vh,1100px);z-index:4;display:none"; document.body.appendChild(menuC);
const menuT = new THREE.CanvasTexture(menuC); menuT.colorSpace = THREE.SRGBColorSpace; const menuPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.55), new THREE.MeshBasicMaterial({ map: menuT, transparent: true, depthTest: false, toneMapped: false })); menuPanel.position.set(0, -0.05, -0.7); menuPanel.renderOrder = 101; menuPanel.visible = false; camera.add(menuPanel);
function openMenu() { const V = riding, paths = pathsOf(V), items = [];
  paths.forEach((P, k) => items.push({ label: P.name.replace(/^the /, "The "), sub: fmtM(P.dist) + (P.S ? "" : ""), f: () => { planTo(V, k); closeMenu(); say(`Autopilot: to <b>${P.name}</b>, ${fmtM(P.dist)} from the Sun.${V.queue.length > 1 ? " Back past the " + (V.kind === "road" ? "car park" : "hub") + " first." : ""} E for the menu (stop, or change your mind).`, 8); } }));
  if (V.s > 0.5) items.unshift({ label: "Back to the Sun", sub: V.kind === "road" ? "the car park" : "the hub", f: () => { planTo(V, -1); closeMenu(); } });
  if (V.leg || V.queue.length) items.push({ label: "Stop here", sub: "", f: () => { V.queue = []; V.leg = null; V.v = 0; closeMenu(); } }); else items.push({ label: "Get off", sub: "", f: () => { closeMenu(); dismount(); } });
  items.push({ label: "Close", sub: "", f: closeMenu }); menu = { items, i: Math.max(0, items.findIndex(it => it.label.includes("Betelgeuse") || it.label.includes("centre"))) }; drawMenu(); }
function drawMenu() { const g = menuC.getContext("2d"), n = menu.items.length, rowH = Math.min(58, 960 / n); g.clearRect(0, 0, 900, 1100); g.fillStyle = "rgba(10,12,22,0.94)"; g.beginPath(); g.roundRect(0, 0, 900, 1100, 28); g.fill(); g.strokeStyle = "#5a8ad0"; g.lineWidth = 4; g.stroke();
  g.fillStyle = "#ffe08a"; g.font = "bold 44px -apple-system, sans-serif"; g.fillText(riding.name === "car" ? "Drive to…" : "Ride to…", 36, 62); g.font = "24px -apple-system, sans-serif"; g.fillStyle = "#a8b8d8"; g.fillText("W/S or ↑↓ (left stick) to choose · E or Enter (A) to go · Esc (B) to close", 36, 100, 830);
  menu.items.forEach((it, k) => { const y = 120 + k * rowH; if (k === menu.i) { g.fillStyle = "rgba(90,138,208,0.4)"; g.fillRect(20, y, 860, rowH - 4); } g.fillStyle = "#e4ecff"; g.font = `bold ${Math.round(rowH * 0.55)}px -apple-system, sans-serif`; g.fillText(it.label, 40, y + rowH * 0.68, 560); g.fillStyle = "#ffffff"; g.textAlign = "right"; g.fillText(it.sub, 860, y + rowH * 0.68); g.textAlign = "left"; });
  menuT.needsUpdate = true; if (renderer.xr.isPresenting) menuPanel.visible = true; else menuC.style.display = "block"; }
function closeMenu() { menu = null; menuC.style.display = "none"; menuPanel.visible = false; }
function menuMove(k) { menu.i = (menu.i + k + menu.items.length) % menu.items.length; drawMenu(); }
function menuPick() { menu.items[menu.i].f(); }
function dismount() { const V = riding, { P, pos, f } = vehPose(V); riding = null; closeMenu(); const h = Math.atan2(-f.x, -f.z); yaw += h; vrYaw += h;
  const at = V.s > P.L - 2 ? P.end.clone() : V.s < 1 ? (V.kind === "road" ? PARK.clone() : HUB.clone().add(V3(0, 0, 1.4))) : pos.clone().addScaledVector(P.sd, 0.9); ME.x = at.x; ME.y = at.y; ME.z = at.z; if (V.s < 1 && V.kind === "trail") V.s = 0; say(V.s > P.L - 2 ? `<b>${P.name}</b>, ${fmtM(P.dist)} from the Sun. Look at it and press E.` : "Off.", 8); }

// ---------- moving: walk (3 m a second is 3 light-years a second: 95 million times the speed of light), ride, or fly ----------
const keys = {}, prevB = {}; let yaw = 0, pitch = 0.05, vrYaw = 0, started = false, flying = false, seated = false, hud = true, tagsOn = true, flySpeedI = 2, factI = -1;
const FLY = [2, 10, 50, 250, 1000, 4000], ME = { x: 0, y: 0, z: 1.6 };
const FACTS = [
  "<b>One light-year to the metre.</b> Light, the fastest thing there is, crosses one metre here in a year. Walking pace here is about 95 million times the speed of light.",
  "<b>Walk away from the desk</b> and watch the constellations: their stars only look grouped from here. Orion's Betelgeuse is 500 m away, Rigel 860 m; Alnilam, the middle of the belt, 2 km.",
  "<b>The nearest stars</b> are a few metres apart, each with a platform: Proxima Centauri 4.2 m, Barnard's Star 6 m, Wolf 359 7.8 m, Sirius 8.6 m. Most are dim red dwarfs you cannot see with the naked eye. Walkways join them.",
  "<b>Bike trails</b> run from the hub to stars up to a kilometre away; <b>roads</b> from the car park to places kilometres off, as far as the Large Magellanic Cloud, 163 km. Each ends at a platform beside a familiar object at real size, a lamppost, a bus, a house, a lighthouse, a skyscraper, a mountain, to judge the distance by. Get on and choose where: the autopilot takes you.",
  "<b>Up and down</b> here are north and south of the Milky Way's disc. Trails and roads climb or drop straight to their stars: the road to the Large Magellanic Cloud descends 89 km.",
  "<b>The stars you see at night</b> are mostly within a kilometre here: bright, luminous stars far off and a few faint ones nearby. The Milky Way's band is the glow of millions farther away."];
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (menu) { if (e.code === "KeyW" || e.code === "ArrowUp") menuMove(-1); else if (e.code === "KeyS" || e.code === "ArrowDown") menuMove(1); else if (e.code === "KeyE" || e.code === "Enter" || e.code === "Space") menuPick(); else if (e.code === "Escape") closeMenu(); return; } if (e.code === "KeyE") use(); if (e.code === "KeyF") toggleFly(); if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyC") figLines.visible = !figLines.visible; if (e.code === "KeyH") hud = !hud; if (e.code === "KeyM") setSeated(!seated);
  if (e.code === "Equal") setFly(flySpeedI + 1); if (e.code === "Minus") setFly(flySpeedI - 1); if (e.code === "KeyR") { if (riding) dismount(); ME.x = 0; ME.y = 0; ME.z = 1.6; flying = false; yaw = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function toggleFly() { if (riding) return; flying = !flying; if (!flying) { const below = groundAt(ME.x, ME.z, ME.y); if (below !== null) ME.y = below; else { flying = true; say("No platform or path below you to land on.", 5); return; } }
  say(flying ? `<b>Flying</b> at ${FLY[flySpeedI]} m/s (${FLY[flySpeedI]} light-years a second). Space / C up and down (right stick up/down in VR); = and − change speed. F again to land on whatever is below.` : "<b>Landed.</b>", 8); }
function setFly(i) { flySpeedI = clampN(i, 0, FLY.length - 1); say(`Flying speed: ${FLY[flySpeedI]} m/s: ${FLY[flySpeedI]} light-years a second`, 5); }
function nearVeh() { camera.getWorldPosition(_cp); for (const V of Object.values(VEH)) if (V.mesh.position.distanceTo(_cp) < 3) return V; return null; }
function use() { if (!riding && scopeUse()) return; if (riding) { openMenu(); return; } const V = !flying && nearVeh(); if (V) { mount(V); return; } act(); }
function act() { const T = tagsOn ? lookedAt() : null; camera.getWorldPosition(_cp); if (T) { say(T.infoF(_cp), 45); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 40); }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block"; say("<b>The stars at one light-year to the metre.</b> The Sun is the glint on the desk. Every star is in its real direction and distance and shines as it would from where you stand. Walkways lead to the nearest stars; the bike (on the hub) and the car (in the car park behind you) take trails and roads to far ones: E beside them. Look at a label and press <b>E</b>.", 30); }
document.getElementById("intro")?.addEventListener("click", start);
// sitting or standing (in VR, sitting raises your view to a standing eye height); remembered between visits
seated = localStorage.getItem("vrPosture") === "sitting";
const POSB = document.createElement("button"); POSB.style.cssText = "display:none;position:fixed;right:18px;bottom:72px;z-index:3;padding:10px 16px;font:600 14px -apple-system,sans-serif;border:0;border-radius:10px;background:#2a3a5a;color:#fff;cursor:pointer";
const posLabel = () => seated ? "🪑 Sitting (tap for standing)" : "🧍 Standing (tap for sitting)"; POSB.textContent = posLabel(); document.body.appendChild(POSB);
function setSeated(v) { seated = v; localStorage.setItem("vrPosture", v ? "sitting" : "standing"); POSB.textContent = posLabel(); if (started) say(v ? "<b>Sitting</b>: your view is raised to a standing eye height." : "<b>Standing</b>.", 4); }
POSB.onclick = e => { e.stopPropagation(); setSeated(!seated); };
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (ok) POSB.style.display = "block"; });
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let frameN = 0, T = 0; VEH.bike.P = Math.max(0, pathsOf(VEH.bike).findIndex(p => p.name === "Betelgeuse")); VEH.car.P = Math.max(0, pathsOf(VEH.car).findIndex(p => p.name === "the centre of the Milky Way")); placeVeh(VEH.bike); placeVeh(VEH.car);
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; frameN++; T += dt;
  let mx = 0, my = 0, up = 0, run = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0, b = gp.buttons; const edge = (k, on) => { const r = on && !prevB[k]; prevB[k] = on; return r; };
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!b[0]?.pressed; if (edge("x", b[4]?.pressed)) tagsOn = !tagsOn; if (edge("y", b[5]?.pressed)) figLines.visible = !figLines.visible; if (edge("ls", b[3]?.pressed)) setSeated(!seated);
        if (menu) { if (Math.abs(my) > 0.7 && !prevB.mm) { menuMove(Math.sign(my)); prevB.mm = true; } else if (Math.abs(my) < 0.3) prevB.mm = false; } }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; if (flying && Math.abs(ty) > 0.2) up = -ty;
        const pa = edge("a", b[4]?.pressed) || edge("tr", b[0]?.pressed), pb = edge("b", b[5]?.pressed); if (menu) { if (pa) menuPick(); else if (pb) closeMenu(); } else { if (pa) use(); if (pb) toggleFly(); } } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) up += 1; if (keys.KeyC && flying) up -= 1; }
  let heading = 0;
  if (started && riding) { const V = riding;
    if (!V.leg && V.queue.length) { V.leg = V.queue.shift(); if (V.leg.P !== V.P) { V.P = V.leg.P; V.s = 0; } V.dir = V.leg.dir; }
    if (V.leg) { const P = pathsOf(V)[V.P], rem = V.dir > 0 ? P.L - V.s : V.s, cruise = clampN(P.L / 12, V.cmin, V.cmax), acc = cruise / 2.5, want = Math.min(cruise, Math.sqrt(2 * acc * rem) + 0.3); V.v += clampN(want - V.v, -acc * 3 * dt, acc * dt);
      V.s = clampN(V.s + V.v * V.dir * dt, 0, P.L); if (rem - V.v * dt <= 0.05) { V.s = V.dir > 0 ? P.L : 0; V.v = 0; V.leg = null; if (!V.queue.length) arrived(V); } }
    placeVeh(V); const { pos, f } = vehPose(V); heading = Math.atan2(-f.x, -f.z); const seat = V.seat.clone().applyAxisAngle(UP, heading); ME.x = pos.x + seat.x; ME.y = pos.y; ME.z = pos.z + seat.z; }
  else if (started) { const f = V3(), r = V3(); camera.getWorldDirection(f); if (!flying) f.y = 0; f.normalize(); r.crossVectors(f, UP).normalize(); const sp = flying ? FLY[flySpeedI] * (run ? 5 : 1) : run ? 9 : 3;
    const nx = ME.x + (f.x * -my + r.x * mx) * sp * dt, nz = ME.z + (f.z * -my + r.z * mx) * sp * dt;
    if (flying) { ME.x = nx; ME.z = nz; ME.y += (f.y * -my + up) * sp * dt; }
    else if (mx || my) { const h = groundAt(nx, nz, ME.y); if (h !== null && Math.abs(h - ME.y) < 1.5) { ME.x = nx; ME.z = nz; ME.y = h; } else { const hx = groundAt(nx, ME.z, ME.y), hz = groundAt(ME.x, nz, ME.y); if (hx !== null && Math.abs(hx - ME.y) < 1.5) { ME.x = nx; ME.y = hx; } else if (hz !== null && Math.abs(hz - ME.y) < 1.5) { ME.z = nz; ME.y = hz; } } } }
  const lift = vr && seated ? 0.45 : 0; rig.position.set(ME.x, ME.y + lift, ME.z); rig.rotation.set(0, vr ? vrYaw + heading : heading, 0); if (!vr) { camera.position.set(0, riding ? riding.eye : 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  for (const b of BEACONS) b.material.opacity = 0.7 + 0.3 * Math.sin(T * 2.5);
  if (started && !riding) { camera.getWorldPosition(_cp); if (viewing && viewing.eye.distanceTo(_cp) > (viewing.auto ? 0.4 : 2.5)) closeView(); if (vr && !viewing) { const S = nearScope(0.22); if (S && S.kind === "light") { showView(S); S.auto = true; } } }
  updateTags();
  if (frameN % 10 === 0) { camera.getWorldPosition(_cp); const dSun = _cp.distanceTo(SUN); let near = null, nd = 1e9; for (const S of STARS) { const d = _cp.distanceToSquared(S.p); if (d < nd) { nd = d; near = S; } } nd = Math.sqrt(nd);
    const v = riding ? Math.abs(riding.v) : flying ? FLY[flySpeedI] : 3, how = riding ? (riding.name === "car" ? "In the car" : "On the bike") : flying ? "Flying" : "Walking";
    const lines = [`From the Sun: ${fmtLy(dSun)} light-years (${fmtM(dSun)})`, `Nearest star: ${near.name || near.bayer || "an unnamed star"}, ${fmtLy(nd)} ly`, `${how}: ${v < 10 ? v.toFixed(1) : Math.round(v)} m/s = ${v < 10 ? v.toFixed(1) : Math.round(v)} ly/s`, `Height above the galactic plane: ${fmtLy(_cp.y - SUN.y)} ly`];
    if (riding && (riding.leg || riding.queue.length)) { const V = riding, P = pathsOf(V)[V.P], rem = (V.dir > 0 ? P.L - V.s : V.s) + V.queue.reduce((a, q) => a + pathsOf(V)[q.P].L, 0); lines.push(`Autopilot: ${fmtM(rem)} to go${V.v > 0.5 ? ", about " + Math.ceil(rem / Math.max(V.v, 1)) + " s" : ""}`); }
    HUD.innerHTML = lines.join("<br>"); HUD.style.display = hud && started ? "block" : "none"; wrist.visible = vr && hud; if (vr && frameN % 30 === 0) drawWrist(lines); }
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my) && !riding) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
