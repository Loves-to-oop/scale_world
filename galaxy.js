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
const _cp = V3(), _cd = V3();
function updateTags() { camera.getWorldPosition(_cp); for (const T of TAGS) { const d = _cp.distanceTo(T.p); T.sp.visible = tagsOn && d > 0.3 && !(T.near && d > T.near) && (d < 1500 || T.far || d < T.p.distanceTo(SUN) * 1.5); if (!T.sp.visible) continue;
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
for (const S of STARS.filter(s => s.name && s.d0 < 21).sort((a, b) => a.d0 - b.d0)) { const c = V3(S.p.x, S.p.y - 1.25, S.p.z); if (Math.hypot(c.x, c.z) < 2.5 + 1.3 || usedP.some(q => Math.hypot(q.x - c.x, q.z - c.z) < 2.4)) { const q = usedP.find(q => Math.hypot(q.x - c.x, q.z - c.z) < 2.4); if (q) q.names.push(S.name); continue; }
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
const PATHS = [], BEACONS = [];
function destination(kind, D) { let S = null, name, p, R = 0, col = 0xffffff; if (typeof D === "string" || Array.isArray(D)) { const [nm, star] = Array.isArray(D) ? D : [D, D]; S = byName(star); if (!S) return; name = nm; p = S.p.clone(); col = new THREE.Color().fromArray(COL, S.i * 3).getHex(); }
  else { name = D.n; p = galDir(D.l, D.b).multiplyScalar(D.d).add(SUN); R = D.R; col = D.col; }
  const from = kind === "road" ? PARK : HUB, dist = p.distanceTo(SUN), hdir = V3(p.x - from.x, 0, p.z - from.z).normalize(), a = from.clone().addScaledVector(hdir, kind === "road" ? 2.4 : 2.3);
  const toP = V3().subVectors(p, a), stop = R + 3, end = p.clone().addScaledVector(toP.normalize(), -stop); end.y = p.y - (R ? 0 : 1.25) + (R ? -R * 0.3 : 0);
  const c = platform(end, kind === "road" ? 4 : 2, col), path = strip(a, end.clone().addScaledVector(V3(end.x - a.x, 0, end.z - a.z).normalize(), -0.5), kind, 0.006 * (PATHS.length % 4));
  const h = clampN(dist * 0.03, 8, 1500), side = path.sd.clone(), bx = c.clone().addScaledVector(side, kind === "road" ? 3.2 : 1.6);
  const col2 = new THREE.Color(col), tower = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.006 + 0.04, h * 0.01 + 0.06, h, 10), new THREE.MeshBasicMaterial({ color: col2.clone().multiplyScalar(0.55) })); tower.position.copy(bx).add(V3(0, h / 2, 0)); scene.add(tower);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); lamp.position.copy(bx).add(V3(0, h, 0)); lamp.scale.setScalar(h * 0.12 + 0.6); scene.add(lamp); BEACONS.push(lamp);
  PATHS.push({ kind, name, a: path.a, b: path.b, L: path.a.distanceTo(path.b), d: path.d, sd: path.sd, n: path.n, end: c, dist, S });
  if (R) { const n = R > 1000 ? 900 : 300, ps = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, f = Math.random() * 6.283, r = R * Math.cbrt(Math.random()) * (R > 5000 ? 1 : 1), q = Math.sqrt(1 - u * u); ps.set([p.x + r * q * Math.cos(f), p.y + r * u * (R > 5000 ? 0.15 : 0.7), p.z + r * q * Math.sin(f)], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(ps, 3)); const cloud = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: R * (R > 500 ? 0.12 : 0.3), map: glowT, transparent: true, opacity: R > 500 ? 0.1 : 0.3, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })); cloud.frustumCulled = false; scene.add(cloud);
    const T = tag(p.clone().add(V3(0, R * 0.8, 0)), name.replace(/^the /, "The "), () => fmtM(dist) + " from the Sun · " + fmtLy(dist) + " ly", () => D.info, "#ffd8a8"); T.far = true; }
  const sign = tag(a.clone().add(V3(0, 1.9, 0)).addScaledVector(hdir, 0.2), (kind === "road" ? "🚗 " : "🚲 ") + name.replace(/^the /, "The "), () => fmtM(dist) + (kind === "road" ? " by road" : " by bike trail"), () => `<b>${kind === "road" ? "Road" : "Bike trail"} to ${name}</b>: ${fmtM(dist)}, ${p.y - SUN.y > 0 ? "climbing" : "descending"} ${fmtM(Math.abs(p.y - SUN.y))} on the way. Take the ${kind === "road" ? "car from the car park" : "bike from the hub"}: E beside it.`, kind === "road" ? "#ffe08a" : "#a8f0b8"); sign.near = 25; }
BIKE.forEach(D => destination("trail", D)); CAR.forEach(D => destination("road", D));

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
const VEH = { bike: { mesh: makeBike(), kind: "trail", max: 15, boost: 60, eye: 1.55, seat: V3(0, 0, 0.08), P: 0, s: 0, v: 0, name: "bike" }, car: { mesh: makeCar(), kind: "road", max: 400, boost: 4000, eye: 1.2, seat: V3(-0.45, 0, 0.3), P: 0, s: 0, v: 0, name: "car" } };
const pathsOf = V => PATHS.filter(p => p.kind === V.kind);
function vehPose(V) { const P = pathsOf(V)[V.P], pos = P.a.clone().addScaledVector(P.d, V.s); return { P, pos, m: new THREE.Matrix4().makeBasis(P.sd, P.n, P.d.clone().negate()) }; }
function placeVeh(V) { const { pos, m } = vehPose(V); V.mesh.position.copy(pos); V.mesh.quaternion.setFromRotationMatrix(m); }
let riding = null;
function mount(V) { riding = V; V.v = 0; yaw = 0; pitch = 0; vrYaw = 0; const P = pathsOf(V)[V.P]; say(V.s < 1 ? `<b>On the ${V.name}.</b> Destination: <b>${P.name}</b>, ${fmtM(P.L)}. A / D (left stick sideways) to choose another; W to go, S to slow or go back; shift (left trigger) for speed. E to get off.` : `<b>On the ${V.name}</b> at ${P.name}. S (pull the left stick back) to go back to the Sun; E to get off.`, 14); }
function dismount() { const V = riding, { P, pos } = vehPose(V); riding = null; const h = Math.atan2(-P.d.x, -P.d.z); yaw += h; vrYaw += h;
  const at = V.s > P.L - 2 ? P.end.clone() : V.s < 1 ? (V.kind === "road" ? PARK.clone() : HUB.clone().add(V3(0, 0, 1.4))) : pos.clone().addScaledVector(P.sd, 0.9); ME.x = at.x; ME.y = at.y; ME.z = at.z; if (V.s < 1 && V.kind === "trail") V.s = 0; say(V.s > P.L - 2 ? `<b>${P.name}</b>, ${fmtM(P.dist)} from the Sun. Look at it and press E.` : "Off.", 8); }

// ---------- moving: walk (3 m a second is 3 light-years a second: 95 million times the speed of light), ride, or fly ----------
const keys = {}, prevB = {}; let yaw = 0, pitch = 0.05, vrYaw = 0, started = false, flying = false, seated = false, hud = true, tagsOn = true, flySpeedI = 2, factI = -1;
const FLY = [2, 10, 50, 250, 1000, 4000], ME = { x: 0, y: 0, z: 1.6 };
const FACTS = [
  "<b>One light-year to the metre.</b> Light, the fastest thing there is, crosses one metre here in a year. Walking pace here is about 95 million times the speed of light.",
  "<b>Walk away from the desk</b> and watch the constellations: their stars only look grouped from here. Orion's Betelgeuse is 500 m away, Rigel 860 m; Alnilam, the middle of the belt, 2 km.",
  "<b>The nearest stars</b> are a few metres apart, each with a platform: Proxima Centauri 4.2 m, Barnard's Star 6 m, Wolf 359 7.8 m, Sirius 8.6 m. Most are dim red dwarfs you cannot see with the naked eye. Walkways join them.",
  "<b>Bike trails</b> run from the hub to stars up to a kilometre away; <b>roads</b> from the car park to places kilometres off, as far as the Large Magellanic Cloud, 163 km. Each ends at a platform with a beacon tower; towers are taller the farther they are.",
  "<b>Up and down</b> here are north and south of the Milky Way's disc. Trails and roads climb or drop straight to their stars: the road to the Large Magellanic Cloud descends 89 km.",
  "<b>The stars you see at night</b> are mostly within a kilometre here: bright, luminous stars far off and a few faint ones nearby. The Milky Way's band is the glow of millions farther away."];
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") use(); if (e.code === "KeyF") toggleFly(); if (e.code === "KeyL") tagsOn = !tagsOn; if (e.code === "KeyC") figLines.visible = !figLines.visible; if (e.code === "KeyH") hud = !hud; if (e.code === "KeyM") seated = !seated;
  if (riding && riding.v === 0 && riding.s < 1 && (e.code === "KeyA" || e.code === "KeyD")) choose(e.code === "KeyD" ? 1 : -1);
  if (e.code === "Equal") setFly(flySpeedI + 1); if (e.code === "Minus") setFly(flySpeedI - 1); if (e.code === "KeyR") { if (riding) dismount(); ME.x = 0; ME.y = 0; ME.z = 1.6; flying = false; yaw = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.5, 1.5); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
function choose(k) { const V = riding, n = pathsOf(V).length; V.P = (V.P + k + n) % n; V.s = 0; placeVeh(V); const P = pathsOf(V)[V.P]; say(`Destination: <b>${P.name}</b>, ${fmtM(P.dist)} away (${fmtLy(P.dist)} light-years). W to go.`, 6); }
function toggleFly() { if (riding) return; flying = !flying; if (!flying) { const below = groundAt(ME.x, ME.z, ME.y); if (below !== null) ME.y = below; else { flying = true; say("No platform or path below you to land on.", 5); return; } }
  say(flying ? `<b>Flying</b> at ${FLY[flySpeedI]} m/s (${FLY[flySpeedI]} light-years a second). Space / C up and down (right stick up/down in VR); = and − change speed. F again to land on whatever is below.` : "<b>Landed.</b>", 8); }
function setFly(i) { flySpeedI = clampN(i, 0, FLY.length - 1); say(`Flying speed: ${FLY[flySpeedI]} m/s: ${FLY[flySpeedI]} light-years a second`, 5); }
function nearVeh() { camera.getWorldPosition(_cp); for (const V of Object.values(VEH)) if (V.mesh.position.distanceTo(_cp) < 3) return V; return null; }
function use() { if (riding) { dismount(); return; } const V = !flying && nearVeh(); if (V) { mount(V); return; } act(); }
function act() { const T = tagsOn ? lookedAt() : null; camera.getWorldPosition(_cp); if (T) { say(T.infoF(_cp), 45); return; } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 40); }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block"; say("<b>The stars at one light-year to the metre.</b> The Sun is the glint on the desk. Every star is in its real direction and distance and shines as it would from where you stand. Walkways lead to the nearest stars; the bike (on the hub) and the car (in the car park behind you) take trails and roads to far ones: E beside them. Look at a label and press <b>E</b>.", 30); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let frameN = 0, T = 0; VEH.bike.P = Math.max(0, pathsOf(VEH.bike).findIndex(p => p.name === "Betelgeuse")); VEH.car.P = Math.max(0, pathsOf(VEH.car).findIndex(p => p.name === "the centre of the Milky Way")); placeVeh(VEH.bike); placeVeh(VEH.car);
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; frameN++; T += dt;
  let mx = 0, my = 0, up = 0, run = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0, b = gp.buttons; const edge = (k, on) => { const r = on && !prevB[k]; prevB[k] = on; return r; };
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!b[0]?.pressed; if (edge("x", b[4]?.pressed)) tagsOn = !tagsOn; if (edge("y", b[5]?.pressed)) figLines.visible = !figLines.visible; if (edge("ls", b[3]?.pressed)) seated = !seated;
        if (riding && riding.v === 0 && riding.s < 1) { if (Math.abs(mx) > 0.7 && !prevB.ch) { choose(Math.sign(mx)); prevB.ch = true; } else if (Math.abs(mx) < 0.3) prevB.ch = false; } }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; if (flying && Math.abs(ty) > 0.2) up = -ty;
        if (edge("a", b[4]?.pressed) || edge("tr", b[0]?.pressed)) use(); if (edge("b", b[5]?.pressed)) toggleFly(); } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) up += 1; if (keys.KeyC && flying) up -= 1; }
  let heading = 0;
  if (started && riding) { const V = riding, P = pathsOf(V)[V.P], top = run ? V.boost : V.max, acc = top * 0.6; if (my < -0.2) V.v = Math.min(top, V.v + acc * dt); else if (my > 0.2) V.v = Math.max(-top, V.v - acc * dt); else V.v *= Math.exp(-dt * 1.2);
    if (Math.abs(V.v) < 0.05 && Math.abs(my) < 0.2) V.v = 0; const brake = V.v > 0 ? P.L - V.s : V.s; if (brake < V.v * V.v / (2 * acc) + 0.5) V.v *= Math.exp(-dt * 6);
    V.s = clampN(V.s + V.v * dt, 0, P.L); if ((V.s >= P.L && V.v > 0) || (V.s <= 0 && V.v < 0)) { if (V.v > 0 && !V.arrived) { say(`<b>${P.name}</b>, ${fmtM(P.dist)} from the Sun (${fmtLy(P.dist)} light-years). E to get off; S to go back.`, 10); } V.arrived = V.v > 0; V.v = 0; }
    placeVeh(V); const { pos } = vehPose(V); heading = Math.atan2(-P.d.x, -P.d.z); const seat = V.seat.clone().applyAxisAngle(UP, heading); ME.x = pos.x + seat.x; ME.y = pos.y; ME.z = pos.z + seat.z; }
  else if (started) { const f = V3(), r = V3(); camera.getWorldDirection(f); if (!flying) f.y = 0; f.normalize(); r.crossVectors(f, UP).normalize(); const sp = flying ? FLY[flySpeedI] * (run ? 5 : 1) : run ? 9 : 3;
    const nx = ME.x + (f.x * -my + r.x * mx) * sp * dt, nz = ME.z + (f.z * -my + r.z * mx) * sp * dt;
    if (flying) { ME.x = nx; ME.z = nz; ME.y += (f.y * -my + up) * sp * dt; }
    else if (mx || my) { const h = groundAt(nx, nz, ME.y); if (h !== null && Math.abs(h - ME.y) < 1.5) { ME.x = nx; ME.z = nz; ME.y = h; } else { const hx = groundAt(nx, ME.z, ME.y), hz = groundAt(ME.x, nz, ME.y); if (hx !== null && Math.abs(hx - ME.y) < 1.5) { ME.x = nx; ME.y = hx; } else if (hz !== null && Math.abs(hz - ME.y) < 1.5) { ME.z = nz; ME.y = hz; } } } }
  const lift = vr && seated ? 0.45 : 0; rig.position.set(ME.x, ME.y + lift, ME.z); rig.rotation.set(0, vr ? vrYaw + heading : heading, 0); if (!vr) { camera.position.set(0, riding ? riding.eye : 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  for (const b of BEACONS) b.material.opacity = 0.7 + 0.3 * Math.sin(T * 2.5);
  updateTags();
  if (frameN % 10 === 0) { camera.getWorldPosition(_cp); const dSun = _cp.distanceTo(SUN); let near = null, nd = 1e9; for (const S of STARS) { const d = _cp.distanceToSquared(S.p); if (d < nd) { nd = d; near = S; } } nd = Math.sqrt(nd);
    const v = riding ? Math.abs(riding.v) : flying ? FLY[flySpeedI] : 3, how = riding ? (riding.name === "car" ? "Driving" : "Cycling") + " to " + pathsOf(riding)[riding.P].name : flying ? "Flying" : "Walking";
    const lines = [`From the Sun: ${fmtLy(dSun)} light-years (${fmtM(dSun)})`, `Nearest star: ${near.name || near.bayer || "an unnamed star"}, ${fmtLy(nd)} ly`, `${how}: ${v < 10 ? v.toFixed(1) : Math.round(v)} m/s = ${v < 10 ? v.toFixed(1) : Math.round(v)} ly/s`, `Height above the galactic plane: ${fmtLy(_cp.y - SUN.y)} ly`];
    if (riding) { const P = pathsOf(riding)[riding.P]; lines.push(`${fmtM(P.L - riding.s)} to go`); }
    HUD.innerHTML = lines.join("<br>"); HUD.style.display = hud && started ? "block" : "none"; wrist.visible = vr && hud; if (vr && frameN % 30 === 0) drawWrist(lines); }
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my) && !riding) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
