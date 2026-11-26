// catch.js -- Catch on other worlds: play catch in VR with a partner, under the gravity of Earth, the Moon, Mars, Jupiter (on a floating
// deck at the 1-bar cloud level), the Sun (a heat-proof platform in the photosphere: pure fantasy, but its gravity is real) or zero g (a space
// station module). The ball is a baseball or an American football; it can be the standard ball, or one made to weigh on that world what the
// standard ball weighs on Earth. It flies with that world's gravity and that world's air (drag from its density). Your controllers are
// tracked: you catch with your hands and throw by swinging your arm and letting go. A menu on your left wrist sets it all. Built into
// catch.html by build.py.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 200000), rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.set(0, 1.6, 0);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp, M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
let s0 = 12345; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
const tex = (w, h, draw, rep = [1, 1]) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- the worlds: surface gravity (m/s²) and the density of the air the ball flies through (kg/m³) ----------
// Jupiter: at the 1-bar level, the conventional "surface", the cloud tops of ammonia; air mostly hydrogen, about 0.16 kg/m³.
// The Sun: the photosphere, 5,800 °C, density about 0.0002 kg/m³, gravity 28 times Earth's. Nobody could stand there; the platform is a fantasy.
// Zero g: inside a space station module, with cabin air at about Earth's sea-level density.
const WORLDS = [
  { key: "earth", name: "Earth", g: 9.81, rho: 1.225, dist: 12, run: 5.0, bounce: 0.45, top: "#3a78d8", hor: "#cfe2f0", fog: [0xcfe2f0, 60, 900], sun: 2.8, hemi: [0xdfeaff, 0x5a7040, 1.0] },
  { key: "moon", name: "The Moon", g: 1.62, rho: 0, dist: 14, run: 2.2, bounce: 0.35, top: "#000000", hor: "#000000", fog: null, sun: 3.4, hemi: [0x404040, 0x303030, 0.25] },
  { key: "mars", name: "Mars", g: 3.71, rho: 0.020, dist: 13, run: 3.2, bounce: 0.38, top: "#c89a70", hor: "#e8c49a", fog: [0xd8b088, 80, 1500], sun: 2.2, hemi: [0xe8c8a0, 0x8a4a2a, 0.8] },
  { key: "jupiter", name: "Jupiter", g: 24.79, rho: 0.16, dist: 7, run: 1.4, bounce: 0.4, top: "#5a7aa8", hor: "#d8c8a8", fog: [0xd8c4a0, 40, 2600], sun: 1.4, hemi: [0xe8d8c0, 0x9a6a40, 1.0], deck: 13 },
  { key: "sun", name: "The Sun", g: 274, rho: 0.0002, dist: 2.2, run: 0, bounce: 0.3, top: "#ff9a30", hor: "#fff0c0", fog: [0xffd890, 30, 600], sun: 0, hemi: [0xffe8b0, 0xffa040, 1.6], deck: 6 },
  { key: "zero", name: "Zero g", g: 0, rho: 1.2, dist: 8, run: 0, bounce: 0.6, top: "#000000", hor: "#000000", fog: null, sun: 0, hemi: [0xffffff, 0xb0b8c0, 1.3], station: 1 }];
// the balls: a baseball (145 g, 7.3 cm) and an American football (410 g, 28 cm long, 17 cm thick; it flies nose-first in a spiral)
const BALLS = { baseball: { name: "baseball", m: 0.145, r: 0.0366, cd: 0.35, area: Math.PI * 0.0366 ** 2, catchR: 0.15 }, football: { name: "football", m: 0.41, r: 0.085, cd: 0.15, area: Math.PI * 0.085 ** 2, catchR: 0.2 } };
const S = { w: WORLDS[0], ballKey: "baseball", matched: false, dist: 12, streak: 0, best: 0 };
const ballMass = () => { const B = BALLS[S.ballKey]; return S.matched && S.w.g > 0 ? B.m * 9.81 / S.w.g : B.m; };

// ---------- sky, light ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: V3(0.4, 0.6, -0.5).normalize() }, sunOn: { value: 1 }, stars: { value: 0 } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(90000, 32, 16), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 top, hor, sunDir; uniform float sunOn, stars; varying vec3 vD;
  float h2(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
  void main(){ float h = max(vD.y, 0.0), s = max(dot(vD, sunDir), 0.0); vec3 c = mix(hor, top, pow(h, 0.5)); c += vec3(1.0, 0.95, 0.85) * (pow(s, 2000.0) * 20.0 + pow(s, 40.0) * 0.4) * sunOn;
    vec3 q = floor(vD * 300.0); c += vec3(step(0.997, h2(q)) * stars * smoothstep(-0.05, 0.1, vD.y)); if (vD.y < 0.0) c = hor * 0.7; gl_FragColor = vec4(c, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` })); scene.add(sky);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xfff4e0, 2.8); sunL.position.set(20, 30, -25); sunL.castShadow = true; sunL.shadow.mapSize.set(2048, 2048); Object.assign(sunL.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 120 }); sunL.shadow.bias = -0.0004; scene.add(sunL, sunL.target);
const lampL = new THREE.PointLight(0xffffff, 0, 30, 1.2); lampL.position.set(0, 2.2, -3); scene.add(lampL);

// ---------- the places ----------
const ENV = {};
const ground = (col, draw, rep, r = 2000) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex(512, 512, draw, rep), color: col, roughness: 0.95 })); m.receiveShadow = true; return m; };
const speckle = (base, a, b, n) => (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let k = 0; k < n; k++) { g.fillStyle = rnd() < 0.5 ? a : b; g.globalAlpha = 0.25 + 0.5 * rnd(); g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); } g.globalAlpha = 1; };
function rocks(G, n, col, rmax, R0, R1) { const im = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), M(col, { flatShading: true }), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) { const a = rnd() * 6.283, r = R0 + (R1 - R0) * Math.sqrt(rnd()), s = rmax * Math.pow(rnd(), 3) + 0.05; q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3)); im.setMatrixAt(i, m4.compose(V3(Math.cos(a) * r, s * 0.2, Math.sin(a) * r), q, V3(s, s * 0.6, s))); }
  im.castShadow = true; im.receiveShadow = true; G.add(im); }
function hills(G, col, R, h, n = 64) { const g = new THREE.CylinderGeometry(R, R, 1, n, 6, true), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.5, a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y * h * (0.3 + 0.7 * Math.abs(Math.sin(a * 3.7) * Math.cos(a * 1.9 + 1)))); } g.computeVertexNormals(); const m = new THREE.Mesh(g, M(col, { side: THREE.BackSide, flatShading: true })); G.add(m); }
function deck(G, R, col) { const d = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.92, 0.6, 48), M(col, { metalness: 0.6, roughness: 0.4 })); d.position.y = -0.3; d.receiveShadow = true; G.add(d);
  const plates = new THREE.Mesh(new THREE.CircleGeometry(R - 0.05, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex(512, 512, (g, w, h) => { g.fillStyle = "#8a8e92"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5a5e62"; g.lineWidth = 3; for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke(); } for (let k = 0; k < 300; k++) { g.fillStyle = "rgba(40,40,40,0.4)"; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, [R / 2, R / 2]), roughness: 0.5, metalness: 0.5 }));
  plates.position.y = 0.002; plates.receiveShadow = true; G.add(plates);
  for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2, p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), M(0xd8d8d8, { metalness: 0.7 })); p.position.set(Math.cos(a) * (R - 0.1), 0.55, Math.sin(a) * (R - 0.1)); G.add(p); }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.035, 6, 96), M(0xd8d8d8, { metalness: 0.7 })); rail.rotation.x = Math.PI / 2; rail.position.y = 1.1; G.add(rail); }
function buildEnv(key) { const G = new THREE.Group(); scene.add(G);
  if (key === "earth") { G.add(ground(0xffffff, speckle("#4e8a32", "#6aa040", "#3a6a24", 40000), [400, 400]));
    const trunk = M(0x5a4030), leaf = M(0x3a6a2a, { flatShading: true }); for (let k = 0; k < 60; k++) { const a = rnd() * 6.283, r = 60 + rnd() * 200, s = 0.8 + rnd() * 0.8, t = new THREE.Group(); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 4 * s, 7), trunk); tr.position.y = 2 * s; const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6 * s, 1), leaf); cr.position.y = 5.5 * s; tr.castShadow = cr.castShadow = true; t.add(tr, cr); G.add(t); }
    hills(G, 0x5a7a4a, 1500, 120); }
  if (key === "moon") { G.add(ground(0xffffff, speckle("#8a8884", "#a8a6a0", "#5a5854", 30000), [300, 300])); rocks(G, 400, 0x7a7874, 1.2, 6, 300); hills(G, 0x6a6864, 2500, 220);
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ map: tex(512, 256, (g, w, h) => { g.fillStyle = "#2a5aa8"; g.fillRect(0, 0, w, h); for (let k = 0; k < 40; k++) { g.fillStyle = rnd() < 0.5 ? "#5a8a4a" : "#c8b088"; g.beginPath(); g.ellipse(rnd() * w, h * 0.2 + rnd() * h * 0.6, 10 + rnd() * 40, 6 + rnd() * 25, rnd() * 3, 0, 7); g.fill(); } for (let k = 0; k < 120; k++) { g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 30, 2 + rnd() * 6, 0, 0, 7); g.fill(); } }), fog: false }));
    earth.scale.setScalar(1800); earth.position.set(-20000, 30000, -60000); G.add(earth); }
  if (key === "mars") { G.add(ground(0xffffff, speckle("#a8603a", "#c87a48", "#7a4028", 30000), [300, 300])); rocks(G, 500, 0x7a4a30, 1.0, 5, 300); hills(G, 0xa86a48, 2000, 180); }
  if (key === "jupiter") { deck(G, S.w.deck || 13, 0x7a7e82); const clouds = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tex(1024, 1024, (g, w, h) => { const B = ["#e8d8b8", "#c8946a", "#f0e4cc", "#a86a48", "#e0c8a0", "#d8a87a", "#f4ecd8", "#b8805a"]; for (let y = 0; y < h; y += 4) { g.fillStyle = B[Math.floor((y / h * 8 + 0.5 * Math.sin(y * 0.03)) % 8 + 8) % 8]; g.fillRect(0, y, w, 4); }
      for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(255,248,230,${0.1 + rnd() * 0.25})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 60, 3 + rnd() * 10, 0, 0, 7); g.fill(); } }, [6, 6]), roughness: 1 })); clouds.position.y = -120; G.add(clouds); }
  if (key === "sun") { deck(G, 6, 0xb8a888); const gran = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(256, 256, (g, w, h) => { g.fillStyle = "#ff8a20"; g.fillRect(0, 0, w, h); const P = []; for (let k = 0; k < 60; k++) P.push([rnd() * w, rnd() * h]); const im = g.getImageData(0, 0, w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let d1 = 1e9, d2 = 1e9; for (const [px, py] of P) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const d = (x - px - a * w) ** 2 + (y - py - b * h) ** 2; if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; } const e = Math.sqrt(d2) - Math.sqrt(d1), t = Math.min(1, e / 6), o = (y * w + x) * 4; im.data[o] = 255; im.data[o + 1] = 120 + 110 * t; im.data[o + 2] = 30 + 120 * t * t; } g.putImageData(im, 0, 0); }, [120, 120]), fog: true }));
    gran.position.y = -60; G.add(gran); }
  if (key === "zero") { const R = 2.3, L = 30, wall = new THREE.MeshStandardMaterial({ map: tex(512, 512, (g, w, h) => { g.fillStyle = "#e8eae8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b8bcb8"; g.lineWidth = 4; for (let k = 0; k <= 4; k++) { g.strokeRect(4, k * 128 + 4, w - 8, 120); } g.fillStyle = "#c8ccc8"; for (let k = 0; k < 4; k++) g.fillRect(40, k * 128 + 40, 120, 50); g.fillStyle = "#3a6ad8"; for (let k = 0; k < 8; k++) g.fillRect(300 + (k % 4) * 40, 60 + Math.floor(k / 4) * 260, 22, 14); }, [8, 10]), roughness: 0.7, side: THREE.BackSide });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 32, 1, true).rotateX(Math.PI / 2), wall); tube.position.set(0, 1.3, -L / 2 + 6); tube.receiveShadow = true; G.add(tube);
    for (const z of [6, -L + 6]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 32), M(0xd8dcd8, { side: THREE.DoubleSide })); cap.position.set(0, 1.3, z); G.add(cap); }
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, L).rotateX(-Math.PI / 2), M(0xa8aca8)); floor.position.set(0, 0, -L / 2 + 6); floor.receiveShadow = true; G.add(floor);
    for (let z = 4; z > -L + 6; z -= 3) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.25), new THREE.MeshBasicMaterial({ color: 0xf8f8f0 })); l.position.set(0, 1.3 + R - 0.03, z); G.add(l); for (const sd of [-1, 1]) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6).rotateX(Math.PI / 2), M(0xf0c040)); rail.position.set(sd * 1.6, 0.4, z); G.add(rail); } }
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24), new THREE.MeshBasicMaterial({ map: tex(256, 256, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); const gr = g.createRadialGradient(w * 0.5, h * 1.6, w * 0.6, w * 0.5, h * 1.6, w * 1.3); gr.addColorStop(0, "#3a7ae0"); gr.addColorStop(0.9, "#8ac0f0"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) }));
    win.position.set(-2.2, 1.3, -2); win.rotation.y = Math.PI / 2; G.add(win); }
  return G; }
function setWorld(i) { const w = WORLDS[i]; S.w = w; S.dist = w.dist; for (const k in ENV) ENV[k].visible = false; if (!ENV[w.key]) ENV[w.key] = buildEnv(w.key); ENV[w.key].visible = true;
  skyU.top.value.set(w.top); skyU.hor.value.set(w.hor); skyU.sunOn.value = w.key === "sun" || w.station ? 0 : 1; skyU.stars.value = w.key === "moon" ? 1 : 0; sky.visible = !w.station;
  scene.fog = w.fog ? new THREE.Fog(...w.fog) : null; sunL.intensity = w.sun; hemi.color.set(w.hemi[0]); hemi.groundColor.set(w.hemi[1]); hemi.intensity = w.hemi[2]; lampL.intensity = w.station ? 25 : 0;
  if (w.key === "sun") { sunL.intensity = 2.5; sunL.position.set(5, -20, -8); sunL.color.set(0xffd080); } else { sunL.position.set(20, 30, -25); sunL.color.set(0xfff4e0); }
  NPC.setOutfit(w.key === "earth" || w.station ? "casual" : "suit"); NPC.home.set(0, 0, -S.dist); NPC.base.copy(NPC.home); resetBall("npc"); S.streak = 0; drawMenu(); say(`<b>${w.name}</b>: gravity ${w.g ? (w.g / 9.81).toFixed(w.g < 9 ? 2 : 1) + " × Earth's" : "none"}${note(w)}`, 8); }
const note = w => ({ moon: ". No air: the ball flies on a perfect curve.", mars: ". The air is about 1% as thick as Earth's.", jupiter: ". A deck floating at the cloud tops, where the pressure is 1 bar; 2.5 times your weight.", sun: ". A heat-proof platform in the photosphere, 5,800 °C: no one could stand 28 times their weight, so this is a fantasy; the throws are short and fast.", zero: ". Inside a space station: the ball goes straight until it hits something.", earth: "." })[w.key];

// ---------- the partner ----------
const NPC = (() => { const G = new THREE.Group(); scene.add(G); const P = { G, base: V3(0, 0, -12), home: V3(0, 0, -12), face: 0, hands: { L: V3(), R: V3() }, walk: 0 };
  const mats = { skin: M(0xd8a888), shirt: M(0x3a6aa8), pants: M(0x2a3448), suit: M(0xeeeeea, { roughness: 0.6 }), dark: M(0x2a2a2a), glass: new THREE.MeshStandardMaterial({ color: 0x8aa8c8, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.45 }), hair: M(0x3a2618), gold: M(0xc8a040, { metalness: 0.8, roughness: 0.3 }) };
  const seg = (r, m) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 1, 10), m); me.castShadow = true; G.add(me); return me; }, ball = (r, m) => { const me = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); me.castShadow = true; G.add(me); return me; };
  const torso = ball(1, mats.shirt), pelvis = ball(1, mats.pants), head = ball(0.11, mats.skin), hair = ball(0.115, mats.hair), helmet = ball(0.19, mats.glass), visor = ball(0.185, mats.gold), pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2), mats.suit); G.add(pack);
  torso.scale.set(0.2, 0.3, 0.13); pelvis.scale.set(0.18, 0.12, 0.12);
  const L = { uaL: seg(0.05, mats.shirt), faL: seg(0.04, mats.skin), uaR: seg(0.05, mats.shirt), faR: seg(0.04, mats.skin), thL: seg(0.075, mats.pants), shL: seg(0.06, mats.pants), thR: seg(0.075, mats.pants), shR: seg(0.06, mats.pants) }, handL = ball(0.05, mats.skin), handR = ball(0.05, mats.skin), footL = ball(0.06, mats.dark), footR = ball(0.06, mats.dark);
  footL.scale.set(1, 0.6, 1.8); footR.scale.set(1, 0.6, 1.8);
  const glove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), M(0x8a5a2a)); G.add(glove);
  const place = (m, a, b) => { m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, a.distanceTo(b), 1); m.quaternion.setFromUnitVectors(V3(0, 1, 0), b.clone().sub(a).normalize()); };
  // two-bone reach: the elbow (or knee) bends out toward the pole direction
  const ik = (A, T, l1, l2, pole) => { const d = T.clone().sub(A), len = clampN(d.length(), 0.01, l1 + l2 - 0.001), dir = d.normalize(), Tc = A.clone().addScaledVector(dir, len), a = (l1 * l1 - l2 * l2 + len * len) / (2 * len), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), pp = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize(); return [A.clone().addScaledVector(dir, a).addScaledVector(pp, h), Tc]; };
  P.setOutfit = o => { const suit = o === "suit"; for (const k of ["uaL", "uaR"]) L[k].material = suit ? mats.suit : mats.shirt; for (const k of ["faL", "faR"]) L[k].material = suit ? mats.suit : mats.skin; for (const k of ["thL", "thR", "shL", "shR"]) L[k].material = suit ? mats.suit : mats.pants;
    torso.material = suit ? mats.suit : mats.shirt; pelvis.material = suit ? mats.suit : mats.pants; handL.material = handR.material = suit ? mats.dark : mats.skin; helmet.visible = visor.visible = pack.visible = suit; hair.visible = !suit; glove.visible = !suit; };
  P.update = (dt) => { const c = Math.cos(P.face), s = Math.sin(P.face), W = (x, y, z) => V3(P.base.x + x * c + z * s, P.base.y + y, P.base.z - x * s + z * c), gait = Math.sin(P.walk) * Math.min(1, P.speed || 0);
    const hip = W(0, 0.95 + 0.03 * Math.abs(gait), 0), chest = W(0, 1.32, 0), neck = W(0, 1.6, 0); torso.position.copy(chest); torso.rotation.y = P.face; pelvis.position.copy(hip); pelvis.rotation.y = P.face;
    head.position.copy(W(0, 1.7, 0.01)); hair.position.copy(W(0, 1.73, -0.01)); helmet.position.copy(W(0, 1.7, 0.02)); visor.position.copy(W(0, 1.7, 0.035)); visor.scale.set(1, 0.7, 0.6); visor.rotation.y = P.face; pack.position.copy(W(0, 1.35, -0.22)); pack.rotation.y = P.face;
    for (const [sd, k] of [[1, "L"], [-1, "R"]]) { const sh = W(sd * 0.22, 1.52, 0), [el, hd] = ik(sh, P.hands[k], 0.3, 0.29, W(sd * 0.6, 1.0, -0.6).sub(sh)); place(L["ua" + k], sh, el); place(L["fa" + k], el, hd); (k === "L" ? handL : handR).position.copy(hd);
      const hp = W(sd * 0.1, 0.95, 0), fs = sd * gait * 0.35, foot = W(sd * 0.12, 0.06 + Math.max(0, Math.sin(P.walk + (sd > 0 ? 0 : Math.PI))) * 0.12 * Math.min(1, P.speed || 0), fs), [kn, ft] = ik(hp, foot, 0.45, 0.45, W(0, 0.5, 1).sub(hp)); place(L["th" + k], hp, kn); place(L["sh" + k], kn, ft); const F = k === "L" ? footL : footR; F.position.copy(ft).add(V3(0, -0.02, 0)); F.rotation.y = P.face; }
    glove.position.copy(handL.position); glove.lookAt(handL.position.clone().add(W(0, 0, 1).sub(P.base))); };
  return P; })();

// ---------- the ball ----------
const BALL = { pos: V3(0, 1, -11), vel: V3(), owner: "npc", hand: null, thrower: null, rest: false, spin: 0, spinAxis: V3(0, 0, 1), lost: 0 };
const ballMesh = { baseball: (() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0366, 24, 16), new THREE.MeshStandardMaterial({ map: tex(256, 128, (g, w, h) => { g.fillStyle = "#f6f2e8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c82020"; g.lineWidth = 2; for (const off of [0, Math.PI]) { g.beginPath(); for (let x = 0; x <= w; x += 2) { const y = h / 2 + Math.sin(x / w * Math.PI * 2 * 2 + off) * h * 0.28; g.lineTo(x, y); } g.stroke(); for (let x = 0; x <= w; x += 6) { const y = h / 2 + Math.sin(x / w * Math.PI * 4 + off) * h * 0.28; g.beginPath(); g.moveTo(x - 2, y - 3); g.lineTo(x + 2, y + 3); g.stroke(); } } }), roughness: 0.55 })); m.castShadow = true; return m; })(),
  football: (() => { const g = new THREE.SphereGeometry(1, 24, 16); g.scale(0.085, 0.085, 0.14); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i) / 0.14, k = 1 - 0.15 * z * z; p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k); } g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex(256, 128, (gg, w, h) => { gg.fillStyle = "#7a3a1e"; gg.fillRect(0, 0, w, h); for (let k = 0; k < 3000; k++) { gg.fillStyle = `rgba(40,15,5,${rnd() * 0.25})`; gg.fillRect(rnd() * w, rnd() * h, 2, 2); } gg.fillStyle = "#f4f0e8"; gg.fillRect(w * 0.48, h * 0.35, w * 0.04, h * 0.3); for (let k = 0; k < 8; k++) gg.fillRect(w * 0.44, h * 0.37 + k * h * 0.035, w * 0.12, h * 0.012); gg.fillRect(w * 0.15, 0, w * 0.03, h); gg.fillRect(w * 0.82, 0, w * 0.03, h); }), roughness: 0.6 }));
    m.castShadow = true; return m; })() };
scene.add(ballMesh.baseball, ballMesh.football);
function resetBall(to) { BALL.vel.set(0, 0, 0); BALL.rest = false; BALL.lost = 0; if (to === "npc") { BALL.owner = "npc"; NPC.state = "hold"; NPC.timer = 1.2; } else { BALL.owner = "player"; BALL.hand = to; HOLD.armed = false; } }
// the world's floor under a point (null where there is none: off the edge of a deck)
function floorAt(x, z) { const w = S.w; if (w.deck && Math.hypot(x, z) > w.deck) return null; return 0; }
// one step of flight: gravity and the world's air (quadratic drag: ½ ρ Cd A v², the football flying nose-first)
const _dv = V3();
function stepBall(dt) { const w = S.w, B = BALLS[S.ballKey], m = ballMass(), v = BALL.vel, sp = v.length(), k = 0.5 * w.rho * B.cd * B.area / m;
  if (!BALL.rest) { v.y -= w.g * dt; if (sp > 0) v.addScaledVector(v, -k * sp * dt); BALL.pos.addScaledVector(v, dt); }
  const r = B.r, p = BALL.pos;
  if (w.station) { const dy = p.y - 1.3, dr = Math.hypot(p.x, dy), R = 2.3 - r; if (dr > R) { const nx = p.x / dr, ny = dy / dr, vn = v.x * nx + v.y * ny; if (vn > 0) { v.x -= (1 + w.bounce) * vn * nx; v.y -= (1 + w.bounce) * vn * ny; bump(Math.abs(vn)); } p.x = nx * R; p.y = 1.3 + ny * R; }
    if (p.y < r) { p.y = r; if (v.y < 0) { v.y = -v.y * w.bounce; bump(Math.abs(v.y)); } } if (p.z > 6 - r) { p.z = 6 - r; v.z = -Math.abs(v.z) * w.bounce; bump(Math.abs(v.z)); } if (p.z < -24 + r) { p.z = -24 + r; v.z = Math.abs(v.z) * w.bounce; bump(Math.abs(v.z)); } return; }
  const f = floorAt(p.x, p.z); if (f !== null && p.y < f + r) { p.y = f + r; if (v.y < 0) { if (-v.y > 0.6) { bump(-v.y); v.y = -v.y * w.bounce; v.x *= 0.75; v.z *= 0.75; } else { v.y = 0; const hs = Math.hypot(v.x, v.z), dec = (S.ballKey === "football" ? 3 : 1.5) * Math.max(w.g, 0.5) * 0.4 * dt; if (hs < dec) { v.x = v.z = 0; BALL.rest = true; } else { v.x *= 1 - dec / hs; v.z *= 1 - dec / hs; } } } if (BALL.thrower) groundTouch(); } }
function groundTouch() { if (S.streak > 0) say(`Dropped. ${S.streak} catch${S.streak === 1 ? "" : "es"} in a row.`, 4); S.streak = 0; BALL.thrower = null; drawMenu(); }

// how close the ball came to a point during the last frame (it can move half a metre in one)
function ballNear(p) { const a = BALL.prev || BALL.pos, b = BALL.pos, ab = b.clone().sub(a), t = clampN(p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()), 0, 1); return a.clone().addScaledVector(ab, t).distanceTo(p); }
// ---------- the partner's mind: catch what comes, chase what it can reach, pick up what it missed, throw back to your chest ----------
NPC.state = "hold"; NPC.timer = 1.5; NPC.target = null; NPC.speed = 0;
function predict(maxT = 6) { const w = S.w, B = BALLS[S.ballKey], m = ballMass(), k = 0.5 * w.rho * B.cd * B.area / m, p = BALL.pos.clone(), v = BALL.vel.clone(), out = [], dt = 1 / 120;
  for (let t = 0; t < maxT; t += dt) { v.y -= w.g * dt; const sp = v.length(); v.addScaledVector(v, -k * sp * dt); p.addScaledVector(v, dt); out.push([t + dt, p.clone()]); const f = w.station ? 0 : floorAt(p.x, p.z); if (f !== null && p.y < f + B.r) break; if (w.station && (Math.hypot(p.x, p.y - 1.3) > 2.3 || p.z < -24)) break; if (p.y < -40) break; } return out; }
function npcPlan() { const pts = predict(), reach = 0.85, react = 0.25; for (const [t, p] of pts) { const lo = 0.35, hi = S.w.g > 0 ? 2.3 : 2.6; if (p.y < lo || p.y > hi) continue; const d = Math.hypot(p.x - NPC.base.x, p.z - NPC.base.z); if (d <= reach + NPC_RUN() * Math.max(0, t - react)) { NPC.target = { p, t, born: TIME }; return true; } } NPC.target = null; return false; }
const NPC_RUN = () => S.w.run;
// the throw: aim at your chest with a comfortable arc no higher than the world allows, then correct for the air by trial
function solveThrow(from, to) { const w = S.w, d = Math.hypot(to.x - from.x, to.z - from.z), dy = to.y - from.y, m = ballMass(), vmax = clampN(24 * Math.pow(0.145 / m, 0.2), 6, 34);
  let v; if (w.g === 0) { v = to.clone().sub(from).normalize().multiplyScalar(clampN(d * 0.9, 3, 9)); }
  else { let T = Math.max(0.12, Math.min(d / 11, Math.sqrt(8 * 2.0 / w.g))); for (let it = 0; it < 30; it++) { const vy = (dy + 0.5 * w.g * T * T) / T, vh = d / T; v = V3((to.x - from.x) / d * vh, vy, (to.z - from.z) / d * vh); if (v.length() <= vmax) break; T *= 0.9; } }
  for (let it = 0; it < 4 && w.rho > 0; it++) { const p = from.clone(), vv = v.clone(), B = BALLS[S.ballKey], k = 0.5 * w.rho * B.cd * B.area / m, dt = 1 / 240; let best = null, bd = 1e9;
    for (let t = 0; t < 4; t += dt) { vv.y -= w.g * dt; vv.addScaledVector(vv, -k * vv.length() * dt); p.addScaledVector(vv, dt); const dd = Math.hypot(p.x - to.x, p.z - to.z); if (dd < bd) { bd = dd; best = p.clone(); } if (dd > bd + 0.5) break; } v.add(to.clone().sub(best).multiplyScalar(0.8 / Math.max(0.15, d / Math.max(1, v.length())))); }
  if (v.length() > vmax) v.setLength(vmax); return v; }
function updateNPC(dt) { const N = NPC, w = S.w, toPlayer = Math.atan2(PLAYER.chest.x - N.base.x, PLAYER.chest.z - N.base.z); let goal = N.home, faceTo = toPlayer;
  const W = (x, y, z) => { const c = Math.cos(N.face), s = Math.sin(N.face); return V3(N.base.x + x * c + z * s, N.base.y + y, N.base.z - x * s + z * c); };
  let hL = W(0.15, 1.15, 0.3), hR = W(-0.15, 1.15, 0.3);
  if (BALL.owner === null && BALL.thrower === "player" && !BALL.rest) { if (!N.target || TIME - N.target.born > 0.15) npcPlan(); if (N.target) { const p = N.target.p; goal = V3(p.x, 0, p.z).add(V3(N.base.x - p.x, 0, N.base.z - p.z).setLength(0.45)); faceTo = Math.atan2(BALL.pos.x - N.base.x, BALL.pos.z - N.base.z);
      const near = BALL.pos.distanceTo(W(0, 1.3, 0)), aim = (N.target.t - (TIME - N.target.born)) < 0.6 || near < 2.5 ? (near < 0.8 ? BALL.pos : p) : null; if (aim) { hL = aim.clone().add(W(0.07, 0, 0).sub(N.base).setY(0)); hR = aim.clone().add(W(-0.07, 0, 0).sub(N.base).setY(0)); N.reach = 1; } else { hL = W(0.18, 1.4, 0.35); hR = W(-0.18, 1.4, 0.35); }
      if (ballNear(N.hands.L) < BALLS[S.ballKey].catchR + 0.08 || ballNear(N.hands.R) < BALLS[S.ballKey].catchR + 0.06) { BALL.owner = "npc"; BALL.thrower = null; N.state = "hold"; N.timer = 0.9; S.streak++; S.best = Math.max(S.best, S.streak); pop(BALL.vel.length() * ballMass()); drawMenu(); } } }
  else if (BALL.owner === null && (BALL.rest || BALL.vel.length() < 0.3) && !w.station && floorAt(BALL.pos.x, BALL.pos.z) !== null) { const dP = Math.hypot(BALL.pos.x - PLAYER.chest.x, BALL.pos.z - PLAYER.chest.z); if (dP > 2.5 && N.run !== 0 && w.run > 0) { goal = V3(BALL.pos.x, 0, BALL.pos.z); faceTo = Math.atan2(goal.x - N.base.x, goal.z - N.base.z); if (Math.hypot(goal.x - N.base.x, goal.z - N.base.z) < 0.6) { hR = BALL.pos.clone(); if (N.hands.R.distanceTo(BALL.pos) < 0.2) { BALL.owner = "npc"; N.state = "hold"; N.timer = 1.0; } } } }
  if (BALL.owner === "npc") { if (N.state === "hold") { N.timer -= dt; hR = W(-0.2, 1.1, 0.25); if (Math.hypot(N.base.x - N.home.x, N.base.z - N.home.z) > 0.5) { N.timer = Math.max(N.timer, 0.3); } else if (N.timer <= 0) { N.state = "windup"; N.timer = 0.45; } }
    if (N.state === "windup") { N.timer -= dt; const f = 1 - N.timer / 0.45; hR = W(-0.3, 1.5 + 0.2 * f, -0.25 * f); if (N.timer <= 0) { N.state = "throw"; N.timer = 0.12; } }
    if (N.state === "throw") { N.timer -= dt; hR = W(-0.2, 1.55, 0.45); if (N.timer <= 0) { const from = N.hands.R.clone(), v = solveThrow(from, PLAYER.chest.clone().add(V3(0, -0.05, 0))); BALL.owner = null; BALL.thrower = "npc"; BALL.pos.copy(from); BALL.vel.copy(v); BALL.rest = false; BALL.spin = S.ballKey === "football" ? 40 : 15; N.state = "ready"; } }
    BALL.pos.copy(N.hands.R); }
  // walk toward the goal at the speed this world allows, and turn toward what matters
  const dx = goal.x - N.base.x, dz = goal.z - N.base.z, dist = Math.hypot(dx, dz), sp = Math.min(dist / Math.max(dt, 1e-3), w.run * (dist > 0.05 ? 1 : 0)); if (dist > 0.03 && w.run > 0) { N.base.x += dx / dist * sp * dt; N.base.z += dz / dist * sp * dt; } N.speed = sp / Math.max(1, w.run); N.walk += sp * dt * 3.2;
  let df = faceTo - N.face; while (df > Math.PI) df -= 2 * Math.PI; while (df < -Math.PI) df += 2 * Math.PI; N.face += df * Math.min(1, dt * 6);
  const hr = N.reach ? 30 : 12; N.reach = 0; N.hands.L.lerp(hL, Math.min(1, dt * hr)); N.hands.R.lerp(hR, Math.min(1, dt * (N.state === "throw" ? 40 : hr))); N.update(dt); }

// ---------- you: your hands are the controllers; catch what comes near them, hold the trigger or grip and let go to throw ----------
const PLAYER = { chest: V3(0, 1.3, 0) };
const HOLD = { armed: false };
const HANDS = [0, 1].map(i => { const grip = renderer.xr.getControllerGrip(i), ray = renderer.xr.getController(i); rig.add(grip, ray); const H = { i, grip, ray, src: null, hist: [], down: false, side: i === 0 ? "left" : "right", pos: V3(), vel: V3() };
  const mitt = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), M(0xc8a070, { roughness: 0.7 })); mitt.scale.set(1, 0.7, 1.2); mitt.position.z = 0.02; grip.add(mitt); H.mitt = mitt;
  grip.addEventListener("connected", e => { H.src = e.data; H.side = e.data.handedness; if (H.side === "left") attachMenu(grip); }); grip.addEventListener("disconnected", () => { H.src = null; }); return H; });
const LASER = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0x80e0ff })); LASER.visible = false;
function handVel(H) { const h = H.hist; if (h.length < 3) return V3(); const now = h[h.length - 1]; let j = h.length - 1; while (j > 0 && now.t - h[j].t < 0.06) j--; const a = h[j]; return now.p.clone().sub(a.p).multiplyScalar(1 / Math.max(0.008, now.t - a.t)); }
function pulse(H, s, ms) { try { H.src?.gamepad?.hapticActuators?.[0]?.pulse(clampN(s, 0.05, 1), ms); } catch (e) { } }
function updateHands(dt) { for (const H of HANDS) { if (!H.src) continue; H.grip.getWorldPosition(H.pos); H.hist.push({ t: TIME, p: H.pos.clone() }); while (H.hist.length > 30) H.hist.shift(); const gp = H.src.gamepad, down = !!(gp && (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed));
    if (BALL.owner === "player" && BALL.hand === H) { BALL.pos.copy(H.pos).add(V3(0, 0, -0.04).applyQuaternion(H.grip.getWorldQuaternion(new THREE.Quaternion()))); if (down && !menuPointing) HOLD.armed = true; if (!down && H.down && HOLD.armed) { const v = handVel(H).multiplyScalar(1.08); lastThrowT = TIME; BALL.owner = null; BALL.thrower = "player"; BALL.vel.copy(v); BALL.rest = false; BALL.spin = S.ballKey === "football" ? 40 : 20; NPC.target = null; NPC.state = "ready"; } }
    else if (BALL.owner === null && ballNear(H.pos) < BALLS[S.ballKey].catchR && (BALL.thrower !== "player" || BALL.rest || BALL.vel.length() < 4)) { const p = BALL.vel.length() * ballMass(), fromNPC = BALL.thrower === "npc"; resetBall(H); if (fromNPC) { S.streak++; S.best = Math.max(S.best, S.streak); } BALL.thrower = null; pulse(H, p / 3 + 0.1, 60); pop(p); drawMenu(); }
    H.down = down; } }
let lastThrowT = -10;

// ---------- the wrist menu: on your left wrist; point with your right hand and pull the trigger ----------
const MENU = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 720; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const me = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.225), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })); me.renderOrder = 10; return { c, t, me, btn: [], hover: -1 }; })();
function attachMenu(grip) { MENU.me.position.set(0, 0.04, 0.16); MENU.me.rotation.set(-Math.PI / 2 + 0.75, 0, 0); grip.add(MENU.me); }
function drawMenu() { const g = MENU.c.getContext("2d"), W = 512, B = []; g.clearRect(0, 0, W, 720); g.fillStyle = "rgba(14,18,28,0.9)"; g.beginPath(); g.roundRect(0, 0, W, 720, 28); g.fill();
  const btn = (x, y, w, h, label, on, act) => { const i = B.length; B.push({ x, y, w, h, act }); g.fillStyle = on ? "#3a8a5a" : i === MENU.hover ? "#3a4a6a" : "#252c3c"; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); g.fillStyle = "#f2eee4"; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, x + w / 2, y + h / 2 + 1); };
  g.fillStyle = "#c8d8f0"; g.font = "bold 28px sans-serif"; g.textAlign = "left"; g.fillText("Gravity", 24, 40);
  WORLDS.forEach((w, i) => btn(20 + (i % 2) * 240, 58 + Math.floor(i / 2) * 72, 228, 60, w.name, S.w === w, () => setWorld(i)));
  g.fillStyle = "#c8d8f0"; g.font = "bold 28px sans-serif"; g.textAlign = "left"; g.fillText("Ball", 24, 300); btn(20, 316, 228, 56, "Baseball", S.ballKey === "baseball", () => { S.ballKey = "baseball"; drawMenu(); }); btn(260, 316, 228, 56, "Football", S.ballKey === "football", () => { S.ballKey = "football"; drawMenu(); });
  g.fillStyle = "#c8d8f0"; g.fillText("Weight", 24, 410); btn(20, 426, 228, 56, "Standard", !S.matched, () => { S.matched = false; drawMenu(); }); btn(260, 426, 228, 56, "This world's", S.matched, () => { S.matched = true; drawMenu(); });
  g.fillStyle = "#c8d8f0"; g.fillText("Distance " + S.dist.toFixed(1) + " m", 24, 520); btn(300, 494, 88, 50, "−", false, () => { S.dist = Math.max(1, S.dist * 0.8); NPC.home.set(0, 0, -S.dist); drawMenu(); }); btn(400, 494, 88, 50, "+", false, () => { S.dist = Math.min(60, S.dist * 1.25); NPC.home.set(0, 0, -S.dist); drawMenu(); });
  btn(20, 560, 468, 54, "Ball to me", false, () => { resetBall(HANDS.find(h => h.src && h.side === "right") || HANDS[1]); drawMenu(); });
  const m = ballMass(), w = S.w; g.fillStyle = "#e8e4d8"; g.font = "24px sans-serif"; g.textAlign = "left"; g.fillText(`${w.name}: g = ${w.g} m/s²  ·  air ${w.rho} kg/m³`, 24, 648); g.fillText(`${BALLS[S.ballKey].name} ${m >= 1 ? m.toFixed(2) + " kg" : Math.round(m * 1000) + " g"}  ·  catches ${S.streak} (best ${S.best})`, 24, 684);
  MENU.btn = B; MENU.t.needsUpdate = true; renderPanel(); }
let menuPointing = false; const _mray = new THREE.Raycaster(), _rm = new THREE.Matrix4();
function updateMenuRay() { menuPointing = false; const R = HANDS.find(h => h.src && h.side === "right"); if (!R || !MENU.me.parent) { LASER.visible = false; return; } _rm.identity().extractRotation(R.ray.matrixWorld); _mray.ray.origin.setFromMatrixPosition(R.ray.matrixWorld); _mray.ray.direction.set(0, 0, -1).applyMatrix4(_rm);
  const hit = _mray.intersectObject(MENU.me)[0]; if (!hit) { LASER.visible = false; if (MENU.hover !== -1) { MENU.hover = -1; drawMenu(); } return; } menuPointing = true; if (!LASER.parent) R.ray.add(LASER); LASER.visible = true; LASER.scale.z = hit.distance;
  const x = hit.uv.x * 512, y = (1 - hit.uv.y) * 720, i = MENU.btn.findIndex(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h); if (i !== MENU.hover) { MENU.hover = i; drawMenu(); }
  const gp = R.src.gamepad, trig = !!gp?.buttons[0]?.pressed; if (trig && !R.menuDown && i >= 0) { MENU.btn[i].act(); pulse(R, 0.3, 30); } R.menuDown = trig; }

// ---------- sounds: a leather pop for a catch, a thud for a bounce ----------
let AC = null; const audio = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function noise(dur, f, gain) { try { const a = audio(), n = a.sampleRate * dur, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(); s.buffer = b; const fl = a.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = f; const gn = a.createGain(); gn.gain.value = gain; s.connect(fl); fl.connect(gn); gn.connect(a.destination); s.start(); } catch (e) { } }
const pop = p => { if (S.w.rho > 0.01 || S.w.station) noise(0.08, 2500, clampN(p / 3, 0.15, 1)); };
const bump = v => { if (v > 0.8 && (S.w.rho > 0.01 || S.w.station)) noise(0.06, 600, clampN(v / 15, 0.05, 0.6)); };

// ---------- on a screen without a headset: drag to look, hold the mouse to wind up and let go to throw; the ball is caught when it reaches you ----------
let yaw = 0, pitch = 0, started = false, msgT = 0, charge = null, drag = null; const keys = {};
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:700px;z-index:2;background:rgba(14,18,28,.88);color:#f2eee4;font:15px/1.5 sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const PANEL = document.createElement("img"); PANEL.style.cssText = "position:fixed;left:12px;top:12px;width:200px;z-index:2;display:none;cursor:pointer;border-radius:10px"; document.body.appendChild(PANEL);
function renderPanel() { PANEL.src = MENU.c.toDataURL(); }
PANEL.addEventListener("click", e => { const r = PANEL.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 512, y = (e.clientY - r.top) / r.height * 720, b = MENU.btn.find(b => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h); if (b) b.act(); });
function say(html, secs = 6) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; }
renderer.domElement.addEventListener("pointerdown", e => { start(); drag = { x: e.clientX, y: e.clientY, moved: 0 }; if (BALL.owner === "player") charge = TIME; });
addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); yaw -= dx * 0.004; pitch = clampN(pitch - dy * 0.004, -1.4, 1.4); drag.x = e.clientX; drag.y = e.clientY; });
addEventListener("pointerup", () => { if (charge !== null && BALL.owner === "player" && !renderer.xr.isPresenting) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())), held = clampN(TIME - charge, 0.05, 1.2), sp = 4 + 22 * held / 1.2; BALL.owner = null; BALL.thrower = "player"; BALL.vel.copy(f.multiplyScalar(sp)); BALL.rest = false; lastThrowT = TIME; NPC.target = null; NPC.state = "ready"; } charge = null; drag = null; });
addEventListener("keydown", e => { keys[e.code] = true; if (/^Digit[1-6]$/.test(e.code)) setWorld(+e.code.slice(5) - 1); if (e.code === "KeyB") { S.ballKey = S.ballKey === "baseball" ? "football" : "baseball"; drawMenu(); } if (e.code === "KeyH") { S.matched = !S.matched; drawMenu(); } if (e.code === "KeyR") { resetBall("desk"); } });
addEventListener("keyup", e => keys[e.code] = false);
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = renderer.xr.isPresenting ? "none" : "block"; audio(); setWorld(0); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr"); if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); PANEL.style.display = "none"; say("Your partner will throw to you. Catch with either hand; hold the trigger and let go to throw. The menu is on your left wrist: point at it with your right hand and pull the trigger.", 10); }; });

// ---------- the loop ----------
const clock = new THREE.Clock(); let TIME = 0; const _cq = new THREE.Quaternion();
setWorld(0); drawMenu();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.05), vr = renderer.xr.isPresenting; TIME += dt;
  if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  camera.getWorldPosition(PLAYER.chest); PLAYER.chest.y -= 0.35;
  updateMenuRay();
  // without a headset, the ball you are holding sits in front of you, and the ball is caught when it comes within half a metre
  if (!vr) { if (BALL.owner === "player") { BALL.pos.copy(V3(0.25, -0.25, -0.5).applyQuaternion(camera.getWorldQuaternion(_cq)).add(camera.getWorldPosition(V3()))); } else if (BALL.owner === null && BALL.thrower !== "player" && ballNear(PLAYER.chest.clone().add(V3(0, 0.2, 0))) < 0.6) { const p = BALL.vel.length() * ballMass(); BALL.owner = "player"; BALL.thrower = null; S.streak++; S.best = Math.max(S.best, S.streak); pop(p); drawMenu(); } }
  if (BALL.owner === "desk") BALL.owner = "player";
  BALL.prev = BALL.pos.clone();
  if (BALL.owner === null) { const n = 8; for (let k = 0; k < n; k++) stepBall(dt / n); if (BALL.pos.y < -30 || Math.hypot(BALL.pos.x, BALL.pos.z) > 400 || (BALL.rest && (S.w.run === 0 || floorAt(BALL.pos.x, BALL.pos.z) === null) && Math.hypot(BALL.pos.x - PLAYER.chest.x, BALL.pos.z - PLAYER.chest.z) > 1.2)) { BALL.lost += dt; if (BALL.lost > 1.5) { say(BALL.pos.y < -30 ? (S.w.key === "sun" ? "Gone into the Sun." : "Lost into the clouds.") + " Your partner has another." : "Your partner has another ball.", 4); groundTouch(); resetBall("npc"); } } else BALL.lost = 0;
    if (BALL.vel.length() < 0.3 && Math.hypot(BALL.pos.x - PLAYER.chest.x, BALL.pos.z - PLAYER.chest.z) > 1.2) { BALL.idle = (BALL.idle || 0) + dt; if (BALL.idle > 4 && (S.w.station || S.w.run === 0)) { BALL.idle = 0; say("Your partner has another ball.", 3); groundTouch(); resetBall("npc"); } } else BALL.idle = 0; }
  updateHands(dt); updateNPC(dt);
  const bm = ballMesh[S.ballKey]; ballMesh.baseball.visible = S.ballKey === "baseball"; ballMesh.football.visible = S.ballKey === "football"; bm.position.copy(BALL.pos);
  if (BALL.owner === null && !BALL.rest) { BALL.spin += 0; if (S.ballKey === "football" && BALL.vel.lengthSq() > 1) { bm.quaternion.setFromUnitVectors(V3(0, 0, 1), BALL.vel.clone().normalize()); bm.rotateZ(TIME * 60); } else bm.rotateOnAxis(V3(1, 0, 0), dt * 25); }
  msgT -= dt; if (msgT <= 0) MSG.style.display = "none";
  renderer.render(scene, camera); });
