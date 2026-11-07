// betelgeuse.js -- Betelgeuse, the red supergiant in Orion, seen from the glass cupola of a ship parked 30 AU from it, on the side
// facing the Sun, with the sky as it really is from there (betelgeuse_sky.js: every star brighter than magnitude 6.8, recomputed
// from the AT-HYG catalogue for a point 168 pc from the Sun). Betelgeuse: about 760 times the Sun's radius (3.55 AU), 3,600 K,
// about 126,000 times the Sun's light, about 18 times its mass; a surface of a few giant convection cells, an uneven edge, an extended
// molecular atmosphere, clumps of dust forming farther out; a pulsation of about 416 days; and a probable small companion (Siwarha,
// reported in 2025) orbiting inside its outer atmosphere every 5.8 years. What is measured, what is estimated and what is drawn as
// typical is said in the panel. Built into betelgeuse.html by build.py (after betelgeuse_sky.js).
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 30000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...o });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; if (draw) draw(c.getContext("2d"), w, h); return t; };
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const fmt = (v, d = 2) => { const a = Math.abs(v); if (a >= 1e5 || (a < 1e-3 && a > 0)) { const e = Math.floor(Math.log10(a)); return (v / 10 ** e).toFixed(d) + "×10" + String(e).replace(/-/g, "⁻").replace(/\d/g, x => "⁰¹²³⁴⁵⁶⁷⁸⁹"[x]); } return a >= 100 ? Math.round(v).toLocaleString() : v.toFixed(d); };

// ---------- the numbers ----------
// Radius: 640 to 1,000 solar radii in the literature; 764 (Joyce et al. 2020, from its pulsations) is used. Distance from the Sun:
// 168 pc (548 light-years; same source). Temperature about 3,600 K. Luminosity about 90,000 to 150,000 Suns. Mass now about 16 to 19
// Suns. Main pulsation about 400 to 420 days; a 2,100-day "long secondary period", explained in 2024 by a companion, which images
// from the Gemini telescope in 2025 probably revealed: Siwarha, about the Sun's mass, orbiting about 8.7 AU from Betelgeuse's centre.
const RSUN_AU = 0.0046505, R_B = 764 * RSUN_AU, D_SHIP = 30, L_B = 126000, T_B = 3600, M_B = 18, P_PULSE = 416, P_COMP = 2110, A_COMP = Math.cbrt((M_B + 1) * (P_COMP / 365.25) ** 2);
const FAKE = 5000, SKY_R = 9000, BD = V3(...B_DIR).normalize();
const SUNLIGHT = L_B / D_SHIP ** 2;

// ---------- the sky: the stars as seen from Betelgeuse, and the Milky Way ----------
const bvTemp = bv => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
// the colour of a blackbody of temperature T as the eye sees it in daylight (Tanner Helland's fit to the CIE colours), in linear RGB
function bbRGB(T) { const t = T / 100, r = t <= 66 ? 255 : 329.7 * (t - 60) ** -0.1332, g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * (t - 60) ** -0.0755, b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305.0;
  return [r, g, b].map(v => (Math.max(0, Math.min(255, v)) / 255) ** 2.2); }
const skyG = new THREE.Group(); scene.add(skyG);
{ const pos = new Float32Array(SKY_N * 3), col = new Float32Array(SKY_N * 3), size = new Float32Array(SKY_N);
  for (let i = 0; i < SKY_N; i++) { const m = SKY[i * 5], bv = SKY[i * 5 + 4]; pos.set([SKY[i * 5 + 1] * SKY_R, SKY[i * 5 + 2] * SKY_R, SKY[i * 5 + 3] * SKY_R], i * 3); const f = 10 ** (-0.4 * (m - 6.5)), c = bbRGB(bvTemp(Math.max(-0.4, Math.min(2, bv))));
    col.set(c.map(v => v * Math.min(1, 0.25 + 0.75 * Math.sqrt(f) / 4)), i * 3); size[i] = Math.min(14, 1.6 + 1.2 * Math.sqrt(f)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { px: { value: renderer.getPixelRatio() } }, vertexShader: "attribute float size; attribute vec3 color; varying vec3 vC; uniform float px; void main(){ vC = color; gl_PointSize = size * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; float a = exp(-r * r * 5.0); if (a < 0.02) discard; gl_FragColor = vec4(vC * a, a); }", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = -5; skyG.add(pts); }
// the Milky Way: a soft band along the galactic plane, brighter toward the galactic centre (in Sagittarius), with dark lanes. From
// 548 light-years away it looks almost as it does from Earth: the galaxy is 100,000 light-years across.
{ const eq = (ra, dec) => { ra *= Math.PI / 180; dec *= Math.PI / 180; const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec); return V3(x, z, -y); };
  const gnp = eq(192.85948, 27.12825), gc = eq(266.405, -28.936);
  const mw = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.02, 64, 32), new THREE.ShaderMaterial({ uniforms: { gnp: { value: gnp }, gc: { value: gc } }, side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 gnp, gc; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ vec3 d = normalize(vD); float b = asin(clamp(dot(d, gnp), -1.0, 1.0)); vec3 e1 = normalize(gc - gnp * dot(gc, gnp)), e2 = cross(gnp, e1); float l = atan(dot(d, e2), dot(d, e1));
        float bulge = exp(-l * l / 0.35), w = 0.09 + 0.10 * bulge, band = exp(-b * b / (w * w)) * (0.35 + 0.65 * bulge + 0.25 * cos(l));
        float lane = smoothstep(0.35, 0.75, n3(d * 9.0) * 0.6 + n3(d * 23.0) * 0.4) * exp(-b * b / (0.03 * 0.03)); float c = band * (0.75 + 0.5 * n3(d * 40.0)) * (1.0 - 0.7 * lane);
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.85) * c * 0.06, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` })); mw.renderOrder = -10; skyG.add(mw); }

// ---------- Betelgeuse ----------
// Its visible surface (where the gas turns opaque) is not a crisp, round ball. Simulations and interferometer images show a few
// enormous convection cells, each a good fraction of the star's width, rising and sinking over months to years, with smaller cells
// between; an outline a few per cent out of round; and strong darkening and reddening toward the edge. The pattern here is typical,
// not a map of the real star. Colours are blackbody colours as the eye sees them: at 3,600 K a deep orange, its surface 0.15
// times as bright, area for area, as the Sun's.
const NOISE = `vec3 h3(vec3 p){ p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6))); return fract(sin(p) * 43758.5453); }
  float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h3(i).x, h3(i + vec3(1,0,0)).x, f.x), mix(h3(i + vec3(0,1,0)).x, h3(i + vec3(1,1,0)).x, f.x), f.y), mix(mix(h3(i + vec3(0,0,1)).x, h3(i + vec3(1,0,1)).x, f.x), mix(h3(i + vec3(0,1,1)).x, h3(i + vec3(1,1,1)).x, f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vn(p); p *= 2.03; a *= 0.5; } return s; }
  vec3 worley(vec3 p, float t){ vec3 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0, id = 0.0;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 g = vec3(float(x), float(y), float(z)), o = h3(i + g); o = 0.5 + 0.45 * sin(t * (0.6 + o * 0.8) + 6.2831 * o); float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; id = dot(i + g, vec3(1.0, 57.0, 113.0)); } else if (d < d2) d2 = d; } return vec3(d1, d2, id); }`;
const starMat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, bright: { value: 1 } },
  vertexShader: `uniform float t; varying vec3 vP; varying vec3 vNv; varying vec3 vWp; ${NOISE}
    void main(){ vec3 n = normalize(position); float bump = 0.035 * (fbm(n * 1.6 + vec3(0.0, 0.0, t * 0.05)) - 0.5) * 2.0; vec3 p = position * (1.0 + bump); vP = n; vNv = normalize(normalMatrix * n); vec4 w = modelMatrix * vec4(p, 1.0); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform float t, bright; varying vec3 vP; varying vec3 vNv; varying vec3 vWp; ${NOISE}
    vec3 bb(float T){ float t = T / 100.0; vec3 c = vec3(255.0, 99.47 * log(t) - 161.1, t <= 19.0 ? 0.0 : 138.5 * log(t - 10.0) - 305.0); return pow(clamp(c / 255.0, 0.0, 1.0), vec3(2.2)) * pow(T / 3600.0, 4.0); }
    void main(){ vec3 p = normalize(vP); vec3 q = p + 0.18 * vec3(fbm(p * 3.0 + t * 0.1), fbm(p * 3.0 + 7.1), fbm(p * 3.0 + 13.3)) - 0.09; vec3 w = worley(q * 0.95, t), w2 = worley(q * 3.0 + 3.1, t * 1.7);
      float big = smoothstep(0.0, 0.75, w.y - w.x), small = smoothstep(0.0, 0.5, w2.y - w2.x), cellT = fract(sin(w.z) * 43758.5);
      float T = 3050.0 + 650.0 * big * (0.5 + 0.9 * cellT) + 120.0 * small + 260.0 * (fbm(p * 6.0 + t * 0.15) - 0.5);
      vec3 V = normalize(cameraPosition - vWp); float mu = clamp(dot(normalize(vNv), normalize((viewMatrix * vec4(V, 0.0)).xyz)), 0.0, 1.0);
      float limb = 1.0 - 0.72 * (1.0 - mu) - 0.18 * (1.0 - mu) * (1.0 - mu); T *= 0.82 + 0.18 * pow(mu, 0.5);
      vec3 col = bb(T) * limb * bright * 1.9; gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const star = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 6), starMat); skyG.add(star);
// the extended atmosphere: a warm glow of molecules (water, carbon monoxide) and gas reaching out to about 1.5 times the radius,
// faint compared with the surface; drawn as a halo
const glowTex = canvasTex(512, 512, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, W * 0.2, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,140,60,0.55)"); r.addColorStop(0.18, "rgba(255,120,50,0.22)"); r.addColorStop(0.45, "rgba(220,90,40,0.06)"); r.addColorStop(1, "rgba(200,80,40,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(glow);
// dust: Betelgeuse sheds about a millionth of a Sun's mass a year; some of it cools into dust, in clumps a few to tens of stellar radii
// out (the Great Dimming of 2019-20 was such a cloud, in front of the star). The ship is 8.5 radii out, so clumps lie all round. Typical.
const dustTex = canvasTex(256, 256, (g, W) => { for (let i = 0; i < 70; i++) { const x = W / 2 + (hash(i, 1) - 0.5) * W * 0.5, y = W / 2 + (hash(i, 2) - 0.5) * W * 0.5, r = W * (0.08 + 0.14 * hash(i, 3)); const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, "rgba(255,255,255,0.10)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, W); } });
const DUST = []; for (let i = 0; i < 46; i++) { const u = hash(i, 11) * 2 - 1, ph = hash(i, 12) * Math.PI * 2, dir = V3(Math.sqrt(1 - u * u) * Math.cos(ph), u, Math.sqrt(1 - u * u) * Math.sin(ph)), r = R_B * (5 + 12 * hash(i, 13));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xc06a3a, transparent: true, depthWrite: false, opacity: 0 })); skyG.add(s); DUST.push({ s, off: dir.multiplyScalar(r), size: R_B * (1.2 + 2.5 * hash(i, 14)) }); }
// the companion, Siwarha: a young star of about the Sun's mass (still contracting toward the main sequence), seen 2025 by speckle
// imaging at Gemini North; its orbit's tilt is not known and is assumed here. Its light: a few Suns' worth, a brilliant point.
const compTex = canvasTex(128, 128, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,252,240,1)"); r.addColorStop(0.06, "rgba(255,248,230,1)"); r.addColorStop(0.14, "rgba(255,236,205,0.55)"); r.addColorStop(0.4, "rgba(255,215,170,0.12)"); r.addColorStop(1, "rgba(255,200,160,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const comp = new THREE.Sprite(new THREE.SpriteMaterial({ map: compTex, blending: THREE.AdditiveBlending, depthWrite: true, transparent: true })); skyG.add(comp);
const COMP_TILT = 0.9, COMP_NODE = 0.6;
// where things are, in AU from the ship, and how they are drawn at a stand-in distance with their true direction and angular size
const B_AU = BD.clone().multiplyScalar(D_SHIP);
const place = (obj, au, sizeAU) => { const d = au.length(), f = FAKE * d / D_SHIP; obj.position.copy(au).multiplyScalar(f / d); if (sizeAU) obj.scale.setScalar(f * sizeAU / d); return d; };

// ---------- the ship's cupola: a glass dome with a near-all-round view ----------
// The dome is 7 m across on a low ring wall; from the middle you see the whole sky above the ring. The glass is darkened against
// the glare: here Betelgeuse gives about 140 times the sunlight at Earth.
const ship = new THREE.Group(); scene.add(ship);
{ const metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), dark = M(0x2a2c32, { metalness: 0.4 }), floorM = M(0x3a3e46, { roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.5, 48).rotateX(-Math.PI / 2), floorM); ship.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.9, 48, 1, true), M(0x50545c, { side: THREE.DoubleSide })); wall.position.y = 0.45; ship.add(wall);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.06, 8, 64).rotateX(Math.PI / 2), metal); rim.position.y = 0.9; ship.add(rim);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(3.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x14171c, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false })); glass.position.y = 0.9; ship.add(glass);
  for (let i = 0; i < 4; i++) { const arch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.035, 6, 48, Math.PI), metal); arch.position.y = 0.9; arch.rotation.y = i * Math.PI / 4 + Math.PI / 8; ship.add(arch); }
  for (const lat of [0.42, 0.85]) { const r = 3.5 * Math.cos(lat), ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 6, 64).rotateX(Math.PI / 2), metal); ring.position.y = 0.9 + 3.5 * Math.sin(lat); ship.add(ring); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 24), metal); hub.position.y = 0.9 + 3.5; ship.add(hub);
  const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.5), dark); desk.position.set(0, 0.42, 2.9); ship.add(desk);
  const hatch = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32).rotateX(-Math.PI / 2), M(0x6a5a3a, { metalness: 0.5 })); hatch.position.set(-2.2, 0.005, 1.2); ship.add(hatch); }
// the ship's frame faces Betelgeuse: its "forward" (-z) points at the star, tilted so the star stands 25° above the cupola's rim
{ const up = V3(0, 1, 0), f = BD.clone(), side = new THREE.Vector3().crossVectors(f, up).normalize(), up2 = new THREE.Vector3().crossVectors(side, f).normalize();
  const tilt = new THREE.Quaternion().setFromAxisAngle(side, -0.44), fwd = f.clone().applyQuaternion(tilt), upS = up2.clone().applyQuaternion(tilt), m = new THREE.Matrix4().makeBasis(side, upS, fwd.clone().negate()); ship.quaternion.setFromRotationMatrix(m); }
scene.add(new THREE.AmbientLight(0x404858, 0.6)); const starLight = new THREE.DirectionalLight(0xffb070, 3.2); starLight.position.copy(BD).multiplyScalar(100); scene.add(starLight);

// ---------- the HUD: labels on the sky ----------
const HUD = new THREE.Group(); skyG.add(HUD); let hudOn = true;
function label(text, sub, dir, col = "#cfe6ff", scale = 1) { const t = canvasTex(512, 128, (g, W, Hh) => { g.font = "bold 38px sans-serif"; g.fillStyle = col; g.fillText(text, 30, 50); g.font = "28px sans-serif"; g.fillStyle = "rgba(220,230,255,0.75)"; g.fillText(sub, 30, 96); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(12, 38, 8, 0, 7); g.stroke(); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false })); s.center.set(0.02, 0.7); s.scale.set(1600 * scale, 400 * scale, 1); s.position.copy(dir).multiplyScalar(SKY_R * 0.9); s.renderOrder = 30; HUD.add(s); return s; }
for (const L of SKY_LABELS) if (!/^(HD|HIP) /.test(L.name) || L.m < 1.5) label(L.name, `mag ${L.m.toFixed(1)} · ${L.d.toLocaleString()} ly${L.err > L.d * 0.2 ? " (distance uncertain)" : ""}`, V3(...L.dir), "#cfe6ff", 0.8);
for (const N of SKY_NOTES) { const vis = N.m < 6.5; label(N.name, `${vis ? "mag " + N.m.toFixed(1) : "mag " + N.m.toFixed(1) + ", too faint to see"} · ${N.d.toLocaleString()} ly away${N.name === "the Sun" ? " · directly behind you" : ""}`, V3(...N.dir), N.name === "the Sun" ? "#ffd060" : vis ? "#cfe6ff" : "#8a9ab0", 0.9); }
const starLabel = label("Betelgeuse", `3,600 K · ${Math.round(R_B * 215)} solar radii · ${D_SHIP} AU away`, BD.clone().applyAxisAngle(V3(0, 1, 0), 0.14), "#ffb060", 1.1);
const compLabel = label("Siwarha (companion, probable)", "about 1 Sun's mass · orbit 5.8 years", V3(0, 1, 0), "#ffe8c0", 0.9);

// ---------- time ----------
// Real time by default. T steps up: an hour, a day, a month, a year per second (the cells churn over months to years, the pulsation
// takes 416 days, the companion 5.8 years).
const RATES = [[1, "real time"], [3600, "1 hour per second"], [86400, "1 day per second"], [30 * 86400, "1 month per second"], [365.25 * 86400, "1 year per second"]]; let rateI = 0, tSec = 0;

// ---------- you ----------
const P = { x: 0, z: 0.8 }; let yaw = 0, pitch = 0.3, started = false, vrYaw = 0; const keys = {};
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyH") hudOn = !hudOn; if (e.code === "KeyT") { rateI = (rateI + 1) % RATES.length; say(`Time: ${RATES[rateI][1]}.`); } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - drag.y) * 0.004, -1.4, 1.5); drag.x = e.clientX; drag.y = e.clientY; });
addEventListener("pointerup", () => drag = null);
const VRB = document.getElementById("vr"), prevB = {};
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the panel ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:410px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(14,12,20,.85);color:#f0e8dc;font:13.5px/1.45 -apple-system,sans-serif;padding:12px 15px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:680px;z-index:2;background:rgba(14,12,20,.9);color:#f0e8dc;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0; function say(t) { MSG.innerHTML = t; MSG.style.display = "block"; msgT = 20; }
const ANG = 2 * Math.asin(R_B / D_SHIP) * 180 / Math.PI;
function drawPanel() { const days = tSec / 86400, ph = (days % P_PULSE) / P_PULSE, cph = (days % P_COMP) / P_COMP;
  PANEL.innerHTML = `<div style="font-size:17px;font-weight:600">Betelgeuse, from 30 AU</div>
  <div style="color:#c8c0d8;font-size:12.5px;margin:4px 0 6px">A red supergiant at the end of its life, about 548 light-years from the Sun. From this ship it is ${ANG.toFixed(1)}° across, ${Math.round(ANG / 0.52)} times the Moon's width in Earth's sky, and gives ${Math.round(SUNLIGHT)} times the sunlight at Earth: the cupola's glass is darkened.</div>
  <b>Measured (with uncertainties)</b><br>&middot; radius about ${Math.round(R_B * 215)} times the Sun's (${R_B.toFixed(2)} AU; estimates 640 to 1,000): in our Solar System it would reach past Mars<br>&middot; surface 3,600 K (deep orange), light about ${fmt(L_B, 0)} Suns, mass now about ${M_B} Suns<br>&middot; age about 8 to 10 million years; it should explode as a supernova within about 100,000 years<br>&middot; mean density about ${fmt(M_B * 1.989e30 / (4 / 3 * Math.PI * (R_B * 1.496e11) ** 3) / 1.2, 1)} of the air you breathe<br>&middot; it pulses every ~${P_PULSE} days, now at ${Math.round(ph * 100)}% of a cycle<br>&middot; it loses about a millionth of a Sun's mass a year, some of it as dust
  <div style="margin-top:6px"><b>Probable</b>: the companion Siwarha, about the Sun's mass, ${A_COMP.toFixed(1)} AU from Betelgeuse's centre (inside its outer atmosphere), once round every 5.8 years (now ${Math.round(cph * 100)}% round). Its orbit's tilt is assumed.</div>
  <div style="margin-top:6px"><b>Drawn as typical</b>: the pattern of giant convection cells and the uneven edge, the glow of the outer atmosphere, the dust clumps.</div>
  <div style="margin-top:6px"><b>The sky here</b> (from the star catalogue): the brightest star is Rigel (mag −1.4), with Orion's belt stars and Saiph close behind. The Sun is magnitude 11, far too faint to see (it is directly behind you), and so is Sirius, the brightest star in Earth's sky (mag 7.6). Stars near Betelgeuse with only older distances may be misplaced by up to ~100 ly; in truth the glare of Betelgeuse would hide the faint ones.</div>
  <div style="margin-top:6px;color:#c8c0d8;font-size:12.5px">Time: ${RATES[rateI][1]} (T to change) · H labels ${hudOn ? "on" : "off"} · drag to look · WASD walk round the cupola</div>`; }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block";
  say(`You are in the glass cupola of a ship 30 AU from Betelgeuse. The star is ${ANG.toFixed(0)}° across: a churning orange surface of a few giant cells, darkening to red at its uneven edge, in a faint glow of its outer atmosphere. Its probable companion, Siwarha, is the brilliant point near it. The labels (H) name the stars as seen from here; the Sun is behind you, too faint to see. T speeds up time.`); }
document.getElementById("intro")?.addEventListener("click", start);

// ---------- the loop ----------
const clock = new THREE.Clock(), headP = V3(0, 0, 0), tmpV = V3(0, 0, 0), toCam = V3(0, 0, 0); let frameN = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++;
  if (started) tSec += dt * RATES[rateI][0]; const days = tSec / 86400;
  let mx = 0, my = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bB = gp.buttons[5]?.pressed; if (bB && !prevB.b) hudOn = !hudOn; prevB.b = bB; const bA = gp.buttons[4]?.pressed; if (bA && !prevB.a) { rateI = (rateI + 1) % RATES.length; say(`Time: ${RATES[rateI][1]}.`); } prevB.a = bA; } } }
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
  // walking round the cupola floor (in the ship's frame)
  if (mx || my) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(ship.quaternion.clone().invert()); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x); P.x += (f.x * -my + sd.x * mx) * 1.4 * dt; P.z += (f.z * -my + sd.z * mx) * 1.4 * dt; const r = Math.hypot(P.x, P.z); if (r > 2.9) { P.x *= 2.9 / r; P.z *= 2.9 / r; } }
  rig.position.copy(V3(P.x, 0, P.z).applyQuaternion(ship.quaternion)); rig.quaternion.copy(ship.quaternion); rig.rotateY(vr ? vrYaw : 0);
  if (!vr) { camera.position.set(0, 1.65, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  camera.getWorldPosition(headP); skyG.position.copy(headP);
  // Betelgeuse: pulsing a few per cent in size and about 0.3 magnitude in light; its cells churning
  const pul = Math.sin(2 * Math.PI * days / P_PULSE), Rnow = R_B * (1 + 0.03 * pul); place(star, B_AU, Rnow); starMat.uniforms.t.value = days / 220; starMat.uniforms.bright.value = 1 + 0.12 * pul;
  glow.position.copy(star.position); glow.scale.setScalar(star.scale.x * 4.2);
  // the companion on its orbit, and the dust clumps lit from Betelgeuse
  const ca = 2 * Math.PI * days / P_COMP, cpos = V3(Math.cos(ca) * A_COMP, 0, Math.sin(ca) * A_COMP).applyAxisAngle(V3(1, 0, 0), COMP_TILT).applyAxisAngle(V3(0, 1, 0), COMP_NODE).add(B_AU);
  const cd = place(comp, cpos); comp.scale.setScalar(comp.position.length() * 0.035); compLabel.position.copy(cpos).normalize().multiplyScalar(SKY_R * 0.9);
  for (const D of DUST) { const au = D.off.clone().add(B_AU), d = place(D.s, au, D.size); toCam.copy(au).normalize().negate(); const fromStar = D.off.clone().normalize(), cosT = fromStar.dot(toCam.clone().negate()), g = 0.55, hg = (1 - g * g) / Math.pow(1 + g * g - 2 * g * cosT, 1.5);
    D.s.material.opacity = Math.min(0.5, 0.05 * hg * (R_B * 8 / D.off.length()) ** 2); }
  HUD.visible = hudOn; compLabel.visible = hudOn;
  if (frameN % 10 === 0) drawPanel(); msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") MSG.style.display = "none";
  renderer.render(scene, camera); });
