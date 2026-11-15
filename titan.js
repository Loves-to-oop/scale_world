// titan.js -- standing on the southern shore of Ligeia Mare, Titan's second-largest sea (in truth a lake of liquid methane larger than
// Lake Superior), beside the mouth of Vid Flumina. Built into titan.html by build.py.
//
// What it rests on. Place: Ligeia Mare, 79 N 248 W, about 420 by 350 km; its southern and eastern coasts "crenulated", hummocky and
// eroded, with bays that are drowned river mouths (Cassini RADAR). Vid Flumina enters its southern edge at about 73 N 243 W, running
// straight (along faults) through canyons about 1 km wide, 240-570 m deep, with walls of about 40 degrees, the liquid in them at the
// level of the sea (Poggiali et al. 2016). The sea: mostly methane, with nitrogen and some ethane; up to 160 m deep along Cassini's
// track (Mastrogiuseppe et al. 2014; Le Gall et al. 2016), a sludge of organics on its floor; flat to within a few millimetres, so the
// winds are light. The shore underfoot follows the Huygens probe's pictures from its landing site: rounded cobbles of water ice a few
// centimetres across on dark, damp, sandy ground. The air: 1.47 bar, 94 K (-179 C), mostly nitrogen, four times as dense as the air at
// sea level on Earth; gravity 1.352 m/s2 (0.14 g); daylight about a thousandth of Earth's, orange, from a sky of haze in which the Sun
// is only a brighter glow and Saturn cannot be seen. It is 2026, a year and a half after the equinox: at 73 N the Sun stands at most
// about 12 degrees up. The ground beyond what Cassini resolved (its radar saw 300 m at best) is generated, in keeping with those maps.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 400000);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.y = 1.6;
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, sstep = THREE.MathUtils.smoothstep, lerpN = THREE.MathUtils.lerp;
const R_T = 2574700, G_T = 1.352, RHO_AIR = 5.4, RHO_LIQ = 520;

// ---------- noise ----------
function hash(i, j) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vn(x, z) { const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz), a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function fbm(x, z, n = 5) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * vn(x, z); w += a; x = x * 2.03 + 17.1; z = z * 2.03 + 9.3; a *= 0.5; } return s / w; }
function ridged(x, z, n = 4) { let s = 0, a = 0.5, w = 0; for (let k = 0; k < n; k++) { s += a * (1 - Math.abs(2 * vn(x, z) - 1)); w += a; x = x * 2.1 + 3.7; z = z * 2.1 + 1.9; a *= 0.5; } return s / w; }

// ---------- the land and the sea floor: metres above the sea's surface; x east, z south ----------
// The coast runs roughly east-west with the sea to the north; inland the hummocky ground rises to 300-450 m; tributary valleys cut it and,
// near the coast, are drowned into narrow bays; Vid Flumina's canyon comes in straight from the south-southwest, a kilometre wide at the
// top, walls at 40 degrees, its floor flooded to the sea's level; offshore the floor falls away toward the 160 m of the open sea.
const FLATS = [];
const CANYON = { x0: 1500, z0: -300, dx: -Math.sin(0.18), dz: Math.cos(0.18) };
function land(x, z) { const wx = x + 1800 * (fbm(x / 9000 + 3, z / 9000) - 0.5), wz = z + 1800 * (fbm(x / 9000, z / 9000 + 7) - 0.5);
  const s = wz - 1400 * (fbm(wx / 26000 + 11, 0.5, 4) - 0.5) - 600 * (fbm(wx / 6000 + 2, 3.1, 3) - 0.5);
  let h = s > 0 ? 420 * (1 - Math.exp(-s / 1900)) + 6 * (1 - Math.exp(-s / 250)) : -165 * (1 - Math.exp(s / 14000)) - 3 * (1 - Math.exp(s / 120));
  const L = sstep(s, -1500, 2500);
  h += L * (110 * (fbm(wx / 3200, wz / 3200, 5) - 0.42) + 18 * (fbm(wx / 700, wz / 700, 4) - 0.5)) + 1.5 * (fbm(x / 90, z / 90, 3) - 0.5) + 0.25 * (fbm(x / 9, z / 9, 2) - 0.5);
  const v = ridged(wx / 5200 + 5, wz / 5200, 4); h -= sstep(v, 0.78, 0.96) * 230 * sstep(s, -800, 3000) * (0.4 + 0.6 * fbm(wx / 12000, wz / 12000, 3));
  // the canyon: distance from its axis; a flooded floor 250 m wide, walls at 40 degrees, wider and shallower toward its mouth
  const ax = x - CANYON.x0, az = z - CANYON.z0, along = ax * CANYON.dx + az * CANYON.dz, across = Math.abs(ax * CANYON.dz - az * CANYON.dx) + 120 * (fbm(along / 900, 4.4, 3) - 0.5);
  if (along > -2500) { const floor = -12 - 8 * sstep(along, 0, 8000), half = 125 + 180 * sstep(-along, 0, 2500), wall = floor + Math.max(0, across - half) * 0.84 * (1 + 0.25 * (fbm(along / 300, across / 300, 3) - 0.5)); const k = 22, sm = -k * Math.log(Math.exp(-h / k) + Math.exp(-wall / k)); h = lerpN(h, isFinite(sm) ? sm : Math.min(h, wall), sstep(along, -2500, -500)); }
  for (const f of FLATS) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r + f.fall) h = lerpN(f.y, h, sstep(d, f.r, f.r + f.fall)); }
  return h; }
function groundColor(h, slope, x, z, out) { const n = fbm(x / 6, z / 6, 3), m = fbm(x / 140 + 4, z / 140, 3); let r, g, b;
  if (h < 0.4) { r = 0.11; g = 0.075; b = 0.045; }
  else { r = 0.2 + 0.1 * m + 0.05 * n; g = 0.14 + 0.07 * m + 0.035 * n; b = 0.08 + 0.04 * m + 0.02 * n; const dry = sstep(h, 0.4, 3); r = lerpN(0.13, r, dry); g = lerpN(0.09, g, dry); b = lerpN(0.055, b, dry); }
  if (slope > 0.45) { const t = sstep(slope, 0.45, 0.9), band = 0.5 + 0.5 * Math.sin(h * 0.35 + 3 * fbm(x / 80, z / 80, 2)); r = lerpN(r, 0.32 + 0.06 * band, t); g = lerpN(g, 0.25 + 0.05 * band, t); b = lerpN(b, 0.17 + 0.04 * band, t); }
  if (h > 60 && slope < 0.3) { const t = sstep(fbm(x / 400, z / 400, 3), 0.55, 0.7) * 0.6; r = lerpN(r, 0.38, t); g = lerpN(g, 0.3, t); b = lerpN(b, 0.2, t); }
  out[0] = r; out[1] = g; out[2] = b; }

// ---------- the sky: orange haze; the Sun a brighter glow low in the south; no Saturn ----------
let sunAz = Math.PI * 0.92, sunEl = 0.17; const SUN = () => V3(Math.sin(sunAz) * Math.cos(sunEl), Math.sin(sunEl), -Math.cos(sunAz) * Math.cos(sunEl));
const skyU = { sun: { value: SUN() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), new THREE.ShaderMaterial({ uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
  vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: `uniform vec3 sun; varying vec3 vD; void main(){ float h = vD.y, s = max(dot(vD, sun), 0.0);
    vec3 zen = vec3(0.34, 0.2, 0.08), hor = vec3(0.86, 0.56, 0.26), c = mix(hor, zen, pow(clamp(h, 0.0, 1.0), 0.45));
    c += vec3(1.0, 0.72, 0.38) * (pow(s, 6.0) * 0.55 + pow(s, 40.0) * 0.6); if (h < 0.0) c = hor * 0.92; gl_FragColor = vec4(c * 0.75, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }` })); sky.layers.enable(1); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky); scene.background = new THREE.Color(0.58, 0.37, 0.17);
const FOGC = new THREE.Color(0.58, 0.37, 0.17); scene.fog = new THREE.FogExp2(FOGC, 1 / 26000);
const hemiL = new THREE.HemisphereLight(0xffb060, 0x3a2410, 1.55), sunL = new THREE.DirectionalLight(0xffc888, 0.35); sunL.position.copy(SUN()).multiplyScalar(100); hemiL.layers.enable(1); sunL.layers.enable(1); scene.add(hemiL, sunL);

// ---------- the ground: nested grids that follow you, the surface curving away (d^2/2R: Titan is small, the horizon close) ----------
const grainT = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d"); g.fillStyle = "#b8b8b8"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 9000; k++) { const v = 120 + Math.random() * 135; g.fillStyle = `rgba(${v},${v},${v},0.45)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
const groundMat = new THREE.MeshStandardMaterial({ map: grainT, vertexColors: true, roughness: 0.96 });
const ME = { x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0 };
function grid(size, n, drop) { const g = new THREE.PlaneGeometry(size, size, n, n).rotateX(-Math.PI / 2); g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  const m = new THREE.Mesh(g, groundMat); m.frustumCulled = false; m.userData = { size, n, drop, cx: 1e12, cz: 1e12, inner: null }; m.layers.enable(1); scene.add(m); return m; }
const GRIDS = IS_HEADSET ? [grid(400, 160, 0), grid(4000, 150, 1.5), grid(30000, 120, 10), grid(240000, 100, 70)] : [grid(500, 250, 0), grid(4000, 200, 1.5), grid(30000, 160, 10), grid(240000, 140, 70)]; for (let i = 1; i < GRIDS.length; i++) GRIDS[i].userData.inner = GRIDS[i - 1];
function fillGrid(m) { const { size, n, drop, inner } = m.userData, p = m.geometry.attributes.position, col = m.geometry.attributes.color, step = size / n, c3 = [0, 0, 0];
  const ox = Math.round(ME.x / step) * step, oz = Math.round(ME.z / step) * step; m.userData.cx = ME.x; m.userData.cz = ME.z; m.position.set(ox - ME.x0, 0, oz - ME.z0);
  const H = new Float32Array(p.count); for (let i = 0; i < p.count; i++) H[i] = land(p.getX(i) + ox, p.getZ(i) + oz);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + ox, z = p.getZ(i) + oz, ix = i % (n + 1), iz = Math.floor(i / (n + 1)), hx = H[Math.min(i + 1, iz * (n + 1) + n)] - H[Math.max(i - 1, iz * (n + 1))], hz = H[Math.min(i + n + 1, p.count - 1)] - H[Math.max(i - n - 1, 0)], slope = Math.hypot(hx, hz) / (2 * step);
    let y = H[i] - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_T) - drop; if (inner) { const ih = inner.userData.size / 2 - inner.userData.size / inner.userData.n * 2; if (Math.abs(x - inner.userData.ox) < ih && Math.abs(z - inner.userData.oz) < ih) y -= 60; }
    p.setY(i, y); groundColor(H[i], slope, x, z, c3); col.setXYZ(i, c3[0], c3[1], c3[2]); }
  const uv = m.geometry.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, ((p.getX(i) + ox) % 4000) / 2.5, ((p.getZ(i) + oz) % 4000) / 2.5);
  m.userData.ox = ox; m.userData.oz = oz; p.needsUpdate = col.needsUpdate = uv.needsUpdate = true; m.geometry.computeVertexNormals(); }
// everything is drawn relative to a moving origin near you (single-precision floats would shake hundreds of km out); x0, z0 is that origin
ME.x0 = 0; ME.z0 = 0;
function updateGround(force = false) { for (let i = 0; i < GRIDS.length; i++) { const m = GRIDS[i]; if (force || Math.hypot(ME.x - m.userData.cx, ME.z - m.userData.cz) > m.userData.size * 0.06) fillGrid(m); } }

// ---------- the cobbles: rounded lumps of water ice, 2-15 cm, as Huygens saw them; more of them near the shore ----------
const COB = new THREE.InstancedMesh((() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.85 + 0.3 * vn(p.getX(i) * 2 + 5, p.getY(i) * 2 + p.getZ(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.62, p.getZ(i) * k); } g.computeVertexNormals(); return g; })(),
  new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), 2600); COB.frustumCulled = false; scene.add(COB); let cobC = [1e12, 1e12];
function fillCobbles() { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(); let k = 0; const S = 0.9, ci = Math.floor(ME.x / S), cj = Math.floor(ME.z / S); cobC = [ME.x, ME.z];
  for (let i = ci - 34; i <= ci + 34 && k < 2600; i++) for (let j = cj - 34; j <= cj + 34 && k < 2600; j++) { const r = hash(i * 3 + 1, j * 7 + 2), x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S, h = land(x, z); if (h < -0.15 || FLATS.some(f => Math.hypot(x - f.x, z - f.z) < f.r + 2)) continue; const dens = h < 6 ? 0.55 : 0.2; if (r > dens) continue;
    const sz = 0.02 + 0.13 * Math.pow(hash(i + 9, j + 3), 2.5) + (hash(i, j + 50) < 0.03 ? 0.25 : 0); q.setFromEuler(new THREE.Euler(hash(i, 1) * 3, hash(j, 2) * 6, 0)); m4.compose(V3(x - ME.x0, h - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_T) + sz * 0.15, z - ME.z0), q, V3(sz, sz, sz)); COB.setMatrixAt(k, m4);
    const v = hash(i + 4, j + 8); col.setRGB(0.42 + 0.18 * v, 0.34 + 0.13 * v, 0.24 + 0.08 * v); COB.setColorAt(k, col); k++; }
  COB.count = k; COB.instanceMatrix.needsUpdate = true; if (COB.instanceColor) COB.instanceColor.needsUpdate = true; }

// ---------- the sea: liquid methane, flat as glass, the shore and canyon walls mirrored in it ----------
// A mirror image of the world is rendered each frame from your eye reflected in the sea's surface (as a still lake reflects); the liquid's
// refractive index is about 1.27, so it reflects only 1.4% straight down and nearly everything at a glancing angle, and it is clear: in
// the shallows you see the dark sludge of the bottom. Capillary ripples only, millimetres high (Cassini found it flat to a few mm).
const RES = IS_HEADSET ? 768 : 1536, reflRT = new THREE.WebGLRenderTarget(RES, RES, { type: THREE.HalfFloatType }), reflCam = new THREE.PerspectiveCamera(100, 1, 0.1, 400000), texMat = new THREE.Matrix4(); reflCam.layers.set(1);
const seaU = { tRefl: { value: reflRT.texture }, texMat: { value: texMat }, t: { value: 0 }, fogC: { value: FOGC }, fogD: { value: 1 / 26000 }, under: { value: 0 } };
const seaGeo = (() => { const rings = [0]; let r = 0, d = 1.5; while (r < 200000) { r += d; d *= 1.07; rings.push(r); } const seg = 160, pos = [], idx = [];
  for (let i = 0; i < rings.length; i++) for (let k = 0; k < seg; k++) { const a = k / seg * Math.PI * 2; pos.push(Math.cos(a) * rings[i], 0, Math.sin(a) * rings[i]); }
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < seg; k++) { const a = i * seg + k, b = i * seg + (k + 1) % seg; idx.push(a, a + seg, b, b, a + seg, b + seg); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(pos.length / 3), 1)); g.setIndex(idx); return g; })();
const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({ uniforms: seaU, transparent: true, side: THREE.DoubleSide,
  vertexShader: `attribute float depth; uniform mat4 texMat; varying vec3 vW; varying float vDep; varying vec4 vUV;
    #include <common>
    #include <logdepthbuf_pars_vertex>
    void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vDep = depth; vUV = texMat * w; gl_Position = projectionMatrix * viewMatrix * w;
    #include <logdepthbuf_vertex>
    }`,
  fragmentShader: `uniform sampler2D tRefl; uniform float t, fogD, under; uniform vec3 fogC; varying vec3 vW; varying float vDep; varying vec4 vUV;
    #include <common>
    #include <logdepthbuf_pars_fragment>
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5); float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5);
      float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5); float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5); return mix(mix(a, b, f.x), mix(c, d, f.x), f.y); }
    void main(){
      #include <logdepthbuf_fragment>
      vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
      vec2 p = vW.xz; float e = 0.05, amp = 0.012 / (1.0 + dist * 0.02);
      float h0 = n2(p * 1.7 + vec2(t * 0.4, t * 0.25)) + 0.5 * n2(p * 4.1 - vec2(t * 0.7, -t * 0.3)), hx = n2((p + vec2(e, 0)) * 1.7 + vec2(t * 0.4, t * 0.25)) + 0.5 * n2((p + vec2(e, 0)) * 4.1 - vec2(t * 0.7, -t * 0.3)), hz = n2((p + vec2(0, e)) * 1.7 + vec2(t * 0.4, t * 0.25)) + 0.5 * n2((p + vec2(0, e)) * 4.1 - vec2(t * 0.7, -t * 0.3));
      vec3 N = normalize(vec3(-(hx - h0) / e * amp, 1.0, -(hz - h0) / e * amp)); if (under > 0.5) N = -N;
      float c = clamp(abs(dot(N, V)), 0.0, 1.0), R = 0.0141 + 0.9859 * pow(1.0 - c, 5.0);
      vec4 uv = vUV; uv.xy += N.xz * 0.6 * uv.w / max(dist, 1.0); vec3 refl = texture2DProj(tRefl, uv).rgb;
      float cosR = sqrt(max(0.0, 1.0 - (1.0 - c * c) / 1.6129)), path = vDep / max(cosR, 0.05); vec3 T = exp(-path * vec3(1.0 / 16.0, 1.0 / 19.0, 1.0 / 22.0));
      vec3 body = vec3(0.07, 0.045, 0.025); float tav = (T.r + T.g + T.b) / 3.0;
      vec3 col; float a;
      if (under > 0.5) { float tir = smoothstep(0.5, 0.75, 1.0 - c); col = mix(vec3(0.35, 0.22, 0.1) * 0.6, body, tir); a = 0.85; }
      else { a = R + (1.0 - R) * (1.0 - tav); col = (refl * R + body * (1.0 - R) * (1.0 - tav)) / max(a, 0.001); }
      float f = 1.0 - exp(-pow(dist * fogD, 2.0)); col = mix(col, fogC, f); a = mix(a, 1.0, f);
      gl_FragColor = vec4(col, a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
sea.frustumCulled = false; scene.add(sea); let seaC = [1e12, 1e12];
function fillSea() { const p = seaGeo.attributes.position, d = seaGeo.attributes.depth; seaC = [ME.x, ME.z]; sea.position.set(ME.x - ME.x0, 0, ME.z - ME.z0);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r2 = x * x + z * z; p.setY(i, -r2 / (2 * R_T)); const rr = Math.sqrt(r2); d.setX(i, rr < 30000 ? Math.max(0, -land(ME.x + x, ME.z + z)) : 160); }
  p.needsUpdate = d.needsUpdate = true; }
const CLIP = [new THREE.Plane(V3(0, 1, 0), 0.02)], _hp = V3(0, 0, 0), _hq = new THREE.Quaternion(), _hs = V3(1, 1, 1);
function updateReflection() { const cam = renderer.xr.isPresenting ? renderer.xr.getCamera() : camera; cam.matrixWorld.decompose(_hp, _hq, _hs);
  const fwd = V3(0, 0, -1).applyQuaternion(_hq), up = V3(0, 1, 0).applyQuaternion(_hq); reflCam.position.set(_hp.x, -_hp.y, _hp.z); reflCam.up.set(up.x, -up.y, up.z); reflCam.lookAt(_hp.x + fwd.x, -(_hp.y + fwd.y), _hp.z + fwd.z);
  reflCam.updateMatrixWorld(); reflCam.updateProjectionMatrix(); sky.position.copy(reflCam.position); sky.updateMatrixWorld(); texMat.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(reflCam.projectionMatrix).multiply(reflCam.matrixWorldInverse);
  const xr = renderer.xr.enabled, prev = renderer.getRenderTarget(); renderer.xr.enabled = false; renderer.clippingPlanes = CLIP; renderer.setRenderTarget(reflRT); renderer.clear(); renderer.render(scene, reflCam); renderer.setRenderTarget(prev); renderer.clippingPlanes = []; renderer.xr.enabled = xr; sky.position.copy(rig.position); }

// ---------- you: walking, bounding and jumping in a seventh of Earth's gravity, through air four times as thick ----------
// A person in a suit (say 110 kg) who jumps as hard as on Earth leaves the ground at about 2.6 m/s and rises more than 2 m, coming down
// after nearly four seconds; the dense air drags a little (it would carry a winged person aloft). The sea is about half as dense as you:
// walk in and you sink, slowly, to the bottom, where you can wade on, weighing half as much again less; moving through the liquid is slow.
const CDA = 0.8, MASS = 110, keys = {}, prevB = {}; let yaw = -1.2, pitch = -0.02, vrYaw = -1.2, started = false, factI = -1, hud = true, msgT = 0, walked = 0;
const surfaceAt = (x, z) => land(x, z) - ((x - ME.x) ** 2 + (z - ME.z) ** 2) / (2 * R_T);
// the start: on the shore west of the canyon's mouth, a couple of metres above the liquid, looking north across the sea
{ let x = 450, z = -5000; while (z < 5000 && land(x, z) < 2.2) z += 2; ME.x = x; ME.z = z; ME.y = land(ME.x, ME.z); ME.x0 = ME.x; ME.z0 = ME.z; }
const FACTS = [
  "<b>Ligeia Mare</b>, Titan's second-largest sea, 420 by 350 km: in truth a lake of liquid methane, with nitrogen and a little ethane dissolved, larger than Lake Superior. Cassini's radar found it up to 160 m deep, its floor covered in a sludge of organic compounds, its surface flat to within a few millimetres.",
  "<b>Vid Flumina</b>, the river to your east, flows into the sea's southern shore here, straight along faults for more than 400 km through canyons about a kilometre wide and up to 570 m deep, with walls of about 40 degrees. Cassini's altimeter found the liquid in the canyon at the same level as the sea. The coast around is \"crenulated\": hummocky, eroded ground with bays that are drowned river mouths.",
  "<b>The gravity</b> is 1.35 m/s2, a seventh of Earth's. Jump (space, or B in VR): you rise over 2 m and hang in the air nearly four seconds. Walking is a loping bound.",
  "<b>The air</b> is 1.47 bar, nearly all nitrogen, at 94 K (-179 C), and four times as dense as Earth's at sea level: you would need warmth and oxygen but no pressure suit. With wings strapped to your arms you could fly.",
  "<b>The light</b>: the Sun gives Titan a hundredth of Earth's sunlight, and the haze lets through a tenth of that: about 0.1% of a sunny day on Earth, like a heavily overcast day or a well-lit room. Your eyes adapt, as they are shown here. The Sun is only a brighter glow in the orange sky; Saturn, 20 times the Moon's width, cannot be seen through the haze. It is 2026, just after the equinox: here at 73 N the Sun never climbs above about 12 degrees, and a day lasts 16 Earth days.",
  "<b>The horizon</b> is close: Titan is 5,150 km across, so standing at the shore the sea's horizon is only about 3 km away (on Earth, 5 km). Climb the hills and you see far, until the haze swallows the distance.",
  "<b>The sea</b> is clear liquid methane. It reflects only 1.4% of light straight down (its refractive index is about 1.27), so near your feet you see the dark bottom; farther off, at a glancing angle, it is a mirror. Walk in: being about half as dense as you, it will not hold you up. You sink, and walk on the bottom.",
  "<b>The ground</b> follows the Huygens probe's pictures from its landing site in 2005: rounded cobbles of water ice, frozen hard as rock at this cold, a few centimetres across, lying on dark sandy ground damp with methane. The ground farther off is generated in keeping with Cassini's radar maps, which saw details no smaller than about 300 m."];
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:700px;z-index:2;background:rgba(30,18,8,.86);color:#f6e6cc;font:14.5px/1.5 -apple-system,sans-serif;padding:12px 16px;border-radius:10px;display:none"; document.body.appendChild(MSG);
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;right:14px;top:12px;z-index:2;background:rgba(30,18,8,.72);color:#f6e6cc;font:13px/1.45 -apple-system,sans-serif;padding:7px 11px;border-radius:8px;display:none"; document.body.appendChild(HUD);
const panT = (() => { const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const t = new THREE.CanvasTexture(c); t.userData.c = c; return t; })(), vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.28), new THREE.MeshBasicMaterial({ map: panT, transparent: true, depthTest: false }));
vrPanel.position.set(0, -0.42, -0.62); vrPanel.rotation.x = -0.75; vrPanel.renderOrder = 99; vrPanel.visible = false; camera.add(vrPanel); let msgAge = 0;
function say(html, secs = 30) { MSG.innerHTML = html; MSG.style.display = "block"; msgT = secs; msgAge = 0; const g = panT.userData.c.getContext("2d"); g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(30,18,8,0.9)"; g.fillRect(0, 0, 1024, 512); g.fillStyle = "#f6e6cc"; g.font = "28px sans-serif";
  const words = html.replace(/<[^>]+>/g, "").split(" "); let line = "", y = 48; for (const w of words) { if (g.measureText(line + w).width > 960) { g.fillText(line, 32, y); line = ""; y += 35; if (y > 495) break; } line += w + " "; } if (y <= 495) g.fillText(line, 32, y); panT.needsUpdate = true; vrPanel.visible = renderer.xr.isPresenting; }
const nextFact = () => { if (typeof ITEMS !== "undefined") { let best = null, bd = 1e9; for (const I of ITEMS) { const d = Math.hypot(ME.x - I.x, ME.z - I.z) - I.r; if (d < 0 && d < bd) { bd = d; best = I; } } if (best) { say(`<b>${best.title}</b><br>${best.text}`, 45); return; } } factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 45); };
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyE") nextFact(); if (e.code === "KeyH") hud = !hud; if (e.code === "KeyR") { ME.x = ME.x0s; ME.z = ME.z0s; ME.y = land(ME.x, ME.z); ME.vx = ME.vz = ME.vy = 0; } });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; start(); });
addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.004; pitch = clampN(pitch - (e.clientY - drag.y) * 0.004, -1.45, 1.45); drag.x = e.clientX; drag.y = e.clientY; }); addEventListener("pointerup", () => drag = null);
ME.x0s = ME.x; ME.z0s = ME.z;
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); HUD.style.display = "block";
  say("<b>The southern shore of Ligeia Mare, Titan.</b> A sea of liquid methane stretches north past a horizon only 3 km away; to the east, the canyon of Vid Flumina comes down to the shore. It is 94 K, the air four times as thick as Earth's, gravity a seventh. <b>Space</b> jumps (B in VR), <b>shift</b> bounds, <b>E</b> tells you about what you see (A in VR). Walk into the sea if you like: you will sink.", 35); }
document.getElementById("intro")?.addEventListener("click", start);
const VRB = document.getElementById("vr");
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- a small science base, as one might be built in the next century or two ----------
// Plausible, not planned: no one has designed a crewed Titan base. Its logic follows from Titan. Sunlight is a thousandth of Earth's,
// so power comes from a small fission reactor, set half a kilometre off behind a berm of ice gravel and cabled in. The cold (94 K) is the
// great enemy: the modules are thickly insulated and stand on legs, so their warmth does not soften the icy, methane-damp ground under
// them. Methane is everywhere, for fuel: a pipe draws it from the sea; oxygen, to breathe and to burn it with, comes from melting and
// splitting water ice, the bedrock here. The dense air makes flying easy, so the base has a rotorcraft drone (NASA's Dragonfly flies
// on Titan in the 2030s). The crew's lander, a methane-oxygen rocket, stands on a cleared pad 300 m away from the modules because of its
// blast. A weather mast, a seismometer, a drill rig on the shore and a buoy out on the sea carry the science.
const BASE = new THREE.Group(); scene.add(BASE); const BLD = [], ITEMS = [], SOLID = [];
const S0 = { x: ME.x0s, z: ME.z0s }, at = (dx, dz) => ({ x: S0.x + dx, z: S0.z + dz });
const SITE = at(150, 110), PAD = at(-280, 170), REACT = at(160, 640), ISRU = at(215, 70);
for (const [c, r] of [[SITE, 32], [PAD, 18], [REACT, 14], [ISRU, 14]]) { const y = land(c.x, c.z); FLATS.push({ x: c.x, z: c.z, r, fall: 14, y: Math.max(y, 1.5) }); }
const BM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o });
const quiltT = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#e8e4dc"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(90,80,70,0.45)"; g.lineWidth = 2;
  for (let k = 0; k <= 128; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 128); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(128, k); g.stroke(); } for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(120,100,80,${Math.random() * 0.08})`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 2); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const M_QUILT = new THREE.MeshStandardMaterial({ map: quiltT, roughness: 0.9 }), M_ORANGE = BM(0xd86a28), M_METAL = BM(0x9aa0a8, { metalness: 0.6, roughness: 0.4 }), M_DARK = BM(0x2a2a2e), M_WIN = new THREE.MeshStandardMaterial({ color: 0x302010, emissive: 0xffb060, emissiveIntensity: 1.6 }), M_YEL = BM(0xe8c020), M_GRAVEL = BM(0x3a2a1c, { roughness: 1 }), M_HEAT = BM(0x1a1614, { roughness: 0.95 }), M_WHITE = BM(0xf0eee8);
function part(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, parent = null) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); (parent || BASE).add(m); return m; }
function site(c, ry = 0) { const g = new THREE.Group(); g.userData.w = c; g.userData.y = land(c.x, c.z); g.rotation.y = ry; BASE.add(g); BLD.push(g); return g; }
function item(c, r, title, text) { ITEMS.push({ x: c.x, z: c.z, r, title, text }); }
// the habitat: three modules 4.5 m across and 10 m long round a central node, 2 m up on legs; an airlock and stairs; warm lit windows
{ const g = site(SITE, -0.4), H = 3.6;
  part(new THREE.CylinderGeometry(2.6, 2.6, 4.4, 24), M_QUILT, 0, H + 1.2, 0, 0, 0, 0, g); part(new THREE.SphereGeometry(2.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M_QUILT, 0, H + 3.4, 0, 0, 0, 0, g);
  for (const [a, name] of [[0, "quarters"], [Math.PI * 2 / 3, "laboratory"], [-Math.PI * 2 / 3, "workshop and greenhouse"]]) { const mod = new THREE.Group(); mod.rotation.y = a; g.add(mod);
    part(new THREE.CylinderGeometry(2.25, 2.25, 10, 24).rotateZ(Math.PI / 2), M_QUILT, 7.4, H + 1.2, 0, 0, 0, 0, mod); for (const x of [2.4, 12.4]) part(new THREE.CylinderGeometry(2.32, 2.32, 0.25, 24).rotateZ(Math.PI / 2), M_ORANGE, x, H + 1.2, 0, 0, 0, 0, mod);
    part(new THREE.SphereGeometry(2.25, 20, 10, 0, Math.PI), M_QUILT, 12.4, H + 1.2, 0, 0, Math.PI / 2, 0, mod);
    for (const x of [5, 8, 11]) for (const s of [-1, 1]) part(new THREE.CircleGeometry(0.22, 16), M_WIN, x, H + 1.7, s * 2.27, 0, s > 0 ? 0 : Math.PI, 0, mod);
    for (const x of [4.5, 10.5]) for (const s of [-1, 1]) { part(new THREE.CylinderGeometry(0.12, 0.12, H + 0.6, 8), M_METAL, x, (H - 0.6) / 2 + 0.1, s * 1.5, s * 0.25, 0, 0, mod); part(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 14), M_METAL, x, 0.06, s * 2.2, 0, 0, 0, mod); } }
  part(new THREE.BoxGeometry(2.2, 2.6, 2.4), M_QUILT, 0, H + 0.9, 3.4, 0, 0, 0, g); part(new THREE.BoxGeometry(1.2, 1.9, 0.08), M_ORANGE, 0, H + 0.8, 4.62, 0, 0, 0, g);
  for (let k = 0; k < 10; k++) part(new THREE.BoxGeometry(1.4, 0.06, 0.36), M_METAL, 0, H - 0.4 - k * 0.32, 5.0 + k * 0.33, 0, 0, 0, g); for (const s of [-0.75, 0.75]) part(new THREE.BoxGeometry(0.05, 0.05, 4.6), M_METAL, s, H / 2 + 0.3, 6.4, -0.79, 0, 0, g);
  part(new THREE.CylinderGeometry(0.04, 0.04, 7, 6), M_METAL, -1.6, H + 6, -0.8, 0, 0, 0, g); const beacon = part(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshStandardMaterial({ color: 0x400000, emissive: 0xff3020, emissiveIntensity: 2 }), -1.6, H + 9.6, -0.8, 0, 0, 0, g); beacon.userData.blink = true;
  const L = new THREE.PointLight(0xffc080, 60, 60, 1.8); L.position.set(0, H + 5, 6); g.add(L);
  SOLID.push({ x: SITE.x, z: SITE.z, r: 16 }); item(SITE, 26, "The habitat", "Three modules, each 4.5 m across and 10 m long: the crew's quarters, the laboratory, and a workshop with a small greenhouse under lamps, round a central node and its airlock. Under the white quilting are thick layers of insulation: at 94 K, and in air four times as dense as Earth's that carries heat away fast, keeping warm is the hardest job. They stand 2 m up on legs so their warmth does not soften the ground beneath, frozen ice gravel damp with methane. Outside there is no oxygen, so nothing burns: the methane all around is safe until it meets the base's own oxygen."); }
// the landing pad and the crew lander: a methane-oxygen rocket; parachutes do most of the work in this air, the engines the last few hundred metres
{ const g = site(PAD, 0.6); part(new THREE.CylinderGeometry(17, 17, 0.12, 48), M_GRAVEL, 0, 0.05, 0, 0, 0, 0, g); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; part(new THREE.CylinderGeometry(0.18, 0.22, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x302000, emissive: 0xffa020, emissiveIntensity: 1.5 }), Math.cos(a) * 16.5, 0.25, Math.sin(a) * 16.5, 0, 0, 0, g); }
  part(new THREE.CylinderGeometry(3.1, 3.4, 1.2, 28), M_HEAT, 0, 2.4, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(1.6, 3.1, 5.2, 28), M_WHITE, 0, 5.6, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(1.0, 1.6, 1.6, 24), M_WHITE, 0, 9.0, 0, 0, 0, 0, g); part(new THREE.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M_DARK, 0, 9.8, 0, 0, 0, 0, g);
  for (let k = 0; k < 3; k++) part(new THREE.BoxGeometry(0.5, 0.35, 0.04), M_WIN, Math.sin(k * 0.5 - 0.5) * 2.05, 6.9, Math.cos(k * 0.5 - 0.5) * 2.05, -0.28, k * 0.5 - 0.5, 0, g);
  part(new THREE.BoxGeometry(0.9, 1.6, 0.06), M_ORANGE, 0, 5.2, 2.75, -0.3, 0, 0, g); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; part(new THREE.CylinderGeometry(0.1, 0.12, 3.2, 8), M_METAL, Math.cos(a) * 3.6, 1.4, Math.sin(a) * 3.6, Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45, g); part(new THREE.CylinderGeometry(0.55, 0.6, 0.15, 14), M_METAL, Math.cos(a) * 4.3, 0.1, Math.sin(a) * 4.3, 0, 0, 0, g); }
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; part(new THREE.CylinderGeometry(0.35, 0.55, 0.9, 14), M_DARK, Math.cos(a) * 1.4, 1.5, Math.sin(a) * 1.4, 0, 0, 0, g); } for (const [x, z] of [[2.8, -1.4], [-2.6, -2.0]]) part(new THREE.SphereGeometry(0.4, 10, 8), M_METAL, x, 3.1, z, 0, 0, 0, g);
  for (let k = 0; k < 9; k++) part(new THREE.BoxGeometry(0.9, 0.05, 0.3), M_METAL, 0, 0.3 + k * 0.5, 3.5 + k * 0.03 - (k > 6 ? 0 : 0), -0.05, 0, 0, g);
  SOLID.push({ x: PAD.x, z: PAD.z, r: 4.6 }); item(PAD, 24, "The crew lander", "A methane-oxygen rocket about 10 m tall that brought the crew down from orbit and will carry them back up. Landing on Titan is gentle: the thick air slows a capsule so much that parachutes do most of the work (Huygens hung under its parachute for two and a half hours) and the engines only the last few hundred metres; with gravity a seventh of Earth's, climbing back to orbit takes far less fuel than leaving Earth, and the fuel can be made here. It stands on a cleared pad 300 m from the habitat, out of reach of its exhaust."); }
// the reactor: a small fission reactor in a berm, its radiators fins in the cold wind; the cable runs to the base on low posts
{ const g = site(REACT); part(new THREE.TorusGeometry(9, 3, 8, 32).rotateX(Math.PI / 2), M_GRAVEL, 0, 0.6, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 20), M_METAL, 0, 1.7, 0, 0, 0, 0, g); part(new THREE.ConeGeometry(1.1, 0.8, 20), M_METAL, 0, 3.7, 0, 0, 0, 0, g);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; part(new THREE.BoxGeometry(0.06, 2.2, 1.4), M_DARK, Math.cos(a) * 1.6, 1.8, Math.sin(a) * 1.6, 0, -a, 0, g); } for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.6, 0.8, 0.04), M_YEL, s * 12, 1.5, -11, 0, 0, 0, g);
  SOLID.push({ x: REACT.x, z: REACT.z, r: 12 }); item(REACT, 24, "The reactor", "A small fission reactor of a few tens of kilowatts, like NASA's Kilopower design, in a berm of ice gravel half a kilometre from the habitat. Sunlight here is a thousandth of Earth's, too weak for solar panels; the reactor gives power day and night through Titan's 16-day day. Its waste heat goes into the cold, dense air through the fins.");
  const a = SITE, b = REACT, n = 24; for (let k = 1; k < n; k++) { const f = k / n, x = a.x + (b.x - a.x) * f + 18, z = a.z + (b.z - a.z) * f; const pg = site({ x, z }); part(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), M_METAL, 0, 0.6, 0, 0, 0, 0, pg); }
  const cab = []; for (let k = 0; k <= n; k++) { const f = k / n, x = a.x + (b.x - a.x) * f + 18, z = a.z + (b.z - a.z) * f; cab.push([x, z]); } BASE.userData.cable = cab; }
// the fuel plant: water ice dug, melted and split for oxygen; methane piped up from the sea; their tanks
{ const g = site(ISRU, 0.3); for (const [x, c] of [[-4, M_WHITE], [4, M_ORANGE]]) { part(new THREE.SphereGeometry(2.2, 20, 14), M_QUILT, x, 3.4, 0, 0, 0, 0, g); part(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 20), c, x, 3.4, 0, 0, 0, 0, g); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; part(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), M_METAL, x + Math.cos(a) * 1.5, 1.2, Math.sin(a) * 1.5, 0, 0, 0, g); } }
  part(new THREE.BoxGeometry(4, 2.4, 3), M_QUILT, 0, 1.3, -5, 0, 0, 0, g); part(new THREE.CylinderGeometry(0.25, 0.25, 3, 10), M_DARK, 1.2, 3.4, -5, 0, 0, 0, g);
  SOLID.push({ x: ISRU.x, z: ISRU.z, r: 8 }); item(ISRU, 18, "The fuel plant", "Living off the land. Water ice, Titan's bedrock, is dug, melted and split into hydrogen and oxygen: the oxygen to breathe and to burn, in the white tank. The other tank holds methane, pumped straight from the sea through the pipe to the shore, the lander's fuel and the base's spare power. Methane, ethane and nitrogen also make plastics; a Titan base would never run short of carbon.");
  let z = ISRU.z; while (land(ISRU.x, z) > 0 && z > ISRU.z - 1500) z -= 4; const L = ISRU.z - z, n = Math.ceil(L / 8); BASE.userData.pipe = { x: ISRU.x, z0: ISRU.z - 6, z1: z - 10, n };
  const fl = site({ x: ISRU.x, z: z - 12 }); fl.userData.y = 0; part(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16), M_YEL, 0, 0.15, 0, 0, 0, 0, fl); part(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), M_METAL, 0, 1.2, 0, 0, 0, 0, fl); fl.userData.float = true; }
// science: a weather mast, a seismometer under its dome, a drill rig on the shore, the rotorcraft drone and the pressurised rover
{ const w = site(at(110, 60)); part(new THREE.CylinderGeometry(0.06, 0.08, 10, 8), M_METAL, 0, 5, 0, 0, 0, 0, w); for (const y of [3, 6, 9.6]) part(new THREE.BoxGeometry(0.9, 0.06, 0.06), M_METAL, 0, y, 0, 0, 0, 0, w);
  const cups = new THREE.Group(); cups.position.y = 10.1; w.add(cups); for (let k = 0; k < 3; k++) part(new THREE.SphereGeometry(0.07, 8, 6, 0, Math.PI), M_WHITE, Math.cos(k * 2.1) * 0.25, 0, Math.sin(k * 2.1) * 0.25, 0, k * 2.1, 0, cups); cups.userData.spin = true; w.userData.cups = cups;
  item(at(110, 60), 9, "The weather mast", "Wind, temperature, pressure, methane humidity. Titan's winds at the surface are gentle (a metre a second or less; the sea is flat as glass), but its methane rain falls in rare, heavy storms, drops twice the size of raindrops falling slowly, like snowflakes, in the dense air.");
  const sm = site(at(190, 150)); part(new THREE.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M_WHITE, 0, 0, 0, 0, 0, 0, sm); item(at(190, 150), 6, "The seismometer", "Listening for titanquakes and for the deep ocean of salty water thought to lie 50-100 km down, under the ice shell; Titan's tides from Saturn flex the shell every 16 days.");
  let zs = S0.z; while (land(S0.x + 60, zs) > 0.6) zs -= 2; const dr = site({ x: S0.x + 60, z: zs + 4 }); for (let k = 0; k < 3; k++) { const a = k * 2.094; part(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6), M_METAL, Math.cos(a) * 0.9, 2.1, Math.sin(a) * 0.9, Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22, dr); }
  part(new THREE.CylinderGeometry(0.1, 0.1, 3.0, 8), M_ORANGE, 0, 1.6, 0, 0, 0, 0, dr); part(new THREE.BoxGeometry(0.6, 0.5, 0.6), M_YEL, 0, 3.9, 0, 0, 0, 0, dr); item({ x: S0.x + 60, z: zs + 4 }, 8, "The drill rig", "Coring the shore: layers of organic sediment washed down Vid Flumina and settled out of the sky. Titan's haze is a chemical factory, sunlight breaking methane and nitrogen into complex organic molecules that snow down for millions of years; some may react with water where impacts or ice volcanoes melted the crust, a natural experiment in the chemistry that led to life.");
  const dg = site(at(120, 135), 0.5); part(new THREE.CylinderGeometry(4, 4, 0.08, 24), M_GRAVEL, 0, 0.04, 0, 0, 0, 0, dg); part(new THREE.BoxGeometry(2.2, 0.7, 1.4), M_WHITE, 0, 1.0, 0, 0, 0, 0, dg); const rot = [];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; part(new THREE.BoxGeometry(1.6, 0.08, 0.1), M_METAL, Math.cos(a) * 0.8, 1.3, Math.sin(a) * 0.8, 0, -a, 0, dg); for (const y of [1.2, 1.45]) { const r = part(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 20), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.55 }), Math.cos(a) * 1.55, y, Math.sin(a) * 1.55, 0, 0, 0, dg); rot.push(r); } }
  for (const s of [-0.7, 0.7]) part(new THREE.BoxGeometry(0.08, 0.6, 1.6), M_METAL, s, 0.35, 0, 0, 0, 0, dg); item(at(120, 135), 8, "The drone", "A rotorcraft, like NASA's Dragonfly (due on Titan in 2034). In air four times as thick as Earth's and a seventh of the gravity, flying takes about a fortieth of the power it does on Earth: the base's scouts fly, hopping kilometres to sample the dunes, the canyon floor and the sea. A person could fly here too, with wings strapped to the arms.");
  const rv = site(at(85, 150), 1.1); part(new THREE.BoxGeometry(3, 2.2, 6.5), M_QUILT, 0, 2.1, 0, 0, 0, 0, rv); part(new THREE.BoxGeometry(2.6, 0.9, 0.08), M_WIN, 0, 2.6, 3.27, 0, 0, 0, rv); for (const z of [-2.3, 0, 2.3]) for (const s of [-1, 1]) part(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 20).rotateZ(Math.PI / 2), M_DARK, s * 1.75, 0.85, z, 0, 0, 0, rv);
  SOLID.push({ x: at(85, 150).x, z: at(85, 150).z, r: 3.6 }); item(at(85, 150), 9, "The pressurised rover", "For trips up the canyon and along the coast: a heated cabin on six fat, soft wheels for the loose organic sand, running on methane and oxygen from the plant (no shortage of fuel on Titan, only of oxygen).");
  const ant = site(at(175, 85)); part(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8), M_METAL, 0, 1.2, 0, 0, 0, 0, ant); const dish = part(new THREE.SphereGeometry(1.6, 20, 8, 0, Math.PI * 2, 0, 0.5), M_WHITE, 0, 2.6, 0, 0, 0, 0, ant); dish.material.side = THREE.DoubleSide; dish.lookAt(dish.getWorldPosition(V3(0, 0, 0)).add(SUN().multiplyScalar(-10))); dish.rotateX(-Math.PI / 2);
  item(at(175, 85), 7, "The antenna", "Pointed at Earth, which from Titan is never far from the Sun (and always hidden in the haze). A message takes 70 to 90 minutes each way, so the crew work on their own."); }
// the buoy out on the sea, moored off the shore
{ let z = S0.z; while (land(S0.x - 40, z) > -2.5 && z > S0.z - 3000) z -= 4; const by = site({ x: S0.x - 40, z }); by.userData.y = 0; by.userData.float = true; part(new THREE.CylinderGeometry(0.7, 0.5, 0.9, 16), M_YEL, 0, 0.1, 0, 0, 0, 0, by); part(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), M_METAL, 0, 1.4, 0, 0, 0, 0, by);
  const lt = part(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0x402000, emissive: 0xffc040, emissiveIntensity: 2 }), 0, 2.6, 0, 0, 0, 0, by); lt.userData.blink = true; item({ x: S0.x - 40, z }, 10, "The sea buoy", "Moored in Ligeia Mare, it measures the liquid's depth, temperature and make-up and listens for the waves and the \"magic islands\" Cassini saw come and go (bubbles of nitrogen? floating ice? waves?). A submarine has been proposed to explore Kraken Mare, the largest sea, farther north."); }
// the pipe and the cable as single meshes
function placeBase() { for (const g of BLD) { const c = g.userData.w, y = g.userData.y ?? land(c.x, c.z); g.position.set(c.x - ME.x0, y - ((c.x - ME.x) ** 2 + (c.z - ME.z) ** 2) / (2 * R_T), c.z - ME.z0); }
  if (BASE.userData.pipeMesh) BASE.remove(BASE.userData.pipeMesh); const P = BASE.userData.pipe, pts = []; for (let k = 0; k <= P.n * 2; k++) { const z = P.z0 + (P.z1 - P.z0) * k / (P.n * 2); pts.push(V3(P.x - ME.x0 + 2, Math.max(land(P.x + 2, z), -0.2) + 0.5, z - ME.z0)); }
  BASE.userData.pipeMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.14, 8), M_METAL); BASE.add(BASE.userData.pipeMesh);
  if (BASE.userData.cabMesh) BASE.remove(BASE.userData.cabMesh); const cp = BASE.userData.cable.map(([x, z]) => V3(x - ME.x0, land(x, z) + 1.15, z - ME.z0)); BASE.userData.cabMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), cp.length * 3, 0.03, 5), M_DARK); BASE.add(BASE.userData.cabMesh); }
BASE.traverse(o => o.layers.enable(1));
FACTS.push("<b>The base</b> (imagined: no one has yet planned one) sits on the shore east of you, with its lander on a pad 300 m off and a reactor half a kilometre inland. Walk up to anything there and press E to hear what it is for.");

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0, underFog = false;
updateGround(true); fillCobbles(); fillSea(); placeBase(); BASE.traverse(o => o.layers.enable(1));
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; T += dt; frameN++;
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) hud = !hud; prevB.x = bX; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.a) nextFact(); prevB.a = bA; if (bB && !prevB.b) jump = true; prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  // physics: on the ground you push off and steer; in the air only gravity and drag act; in the liquid, buoyancy and heavy drag
  const gY = land(ME.x, ME.z), sub = clampN((0 - ME.y) / 1.7, 0, 1), onGround = ME.y <= gY + 0.03;
  if (started && (mx || my) && (onGround || sub > 0.3)) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = sub > 0.5 ? 0.7 : run ? 5.5 : 2.5;
    const tx = (f.x * -my + sd.x * mx) * sp, tz = (f.z * -my + sd.z * mx) * sp, k = 1 - Math.exp(-dt * (sub > 0.5 ? 1.5 : 6)); ME.vx += (tx - ME.vx) * k; ME.vz += (tz - ME.vz) * k; }
  else if (onGround) { const k = 1 - Math.exp(-dt * (sub > 0.5 ? 2 : 5)); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; }
  if (jump && onGround && started) ME.vy = sub > 0.6 ? 0.8 : 2.6;
  const v = Math.hypot(ME.vx, ME.vy, ME.vz), rho = lerpN(RHO_AIR, RHO_LIQ, sub), dragK = 0.5 * rho * CDA * v / MASS, gEff = G_T * (1 - rho / 1000 * (sub > 0 ? 1 : 0.0055));
  ME.vy -= gEff * dt; ME.vx -= ME.vx * dragK * dt; ME.vy -= ME.vy * Math.min(1, dragK * dt); ME.vz -= ME.vz * dragK * dt;
  const ox = ME.x, oz = ME.z; ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; walked += Math.hypot(ME.x - ox, ME.z - oz);
  for (const c of SOLID) { const dx = ME.x - c.x, dz = ME.z - c.z, d = Math.hypot(dx, dz); if (d < c.r && d > 0.01 && ME.y < land(c.x, c.z) + 12) { ME.x = c.x + dx / d * c.r; ME.z = c.z + dz / d * c.r; } }
  const gN = land(ME.x, ME.z); if (ME.y < gN) { if (gN - ME.y > 1.2 && onGround) { ME.x = ox; ME.z = oz; ME.vx *= -0.2; ME.vz *= -0.2; ME.y = land(ox, oz); } else { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } }
  // the world is kept near the origin; far moves shift the origin and rebuild the ground
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 3000) { ME.x0 = ME.x; ME.z0 = ME.z; updateGround(true); fillCobbles(); fillSea(); placeBase(); BASE.traverse(o => o.layers.enable(1)); }
  else { updateGround(); if (Math.hypot(ME.x - cobC[0], ME.z - cobC[1]) > 6) fillCobbles(); if (Math.hypot(ME.x - seaC[0], ME.z - seaC[1]) > 40) fillSea(); }
  rig.position.set(ME.x - ME.x0, ME.y, ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  sky.position.copy(rig.position);
  // under the surface: a dim brown murk
  const eyeY = ME.y + 1.6, under = eyeY < 0; if (under !== underFog) { underFog = under; scene.fog.density = under ? 0.12 : 1 / 26000; scene.fog.color.copy(under ? new THREE.Color(0.16, 0.1, 0.05) : FOGC); seaU.under.value = under ? 1 : 0; }
  BASE.traverse(o => { if (o.userData.blink) o.material.emissiveIntensity = (T % 2) < 0.15 ? 3 : 0.2; if (o.userData.spin) o.rotation.y += dt * 2.5; });
  seaU.t.value = T; if (!under && (!IS_HEADSET || frameN % 2 === 0)) { sea.visible = false; COB.visible = false; updateReflection(); sea.visible = true; COB.visible = true; }
  if (hud && frameN % 10 === 0) HUD.innerHTML = `Ligeia Mare, Titan · 73° N<br>${ME.y >= 0 ? (ME.y < 1000 ? ME.y.toFixed(1) + " m" : (ME.y / 1000).toFixed(2) + " km") + " above the sea" : (-ME.y).toFixed(1) + " m under the surface"} · walked ${walked < 1000 ? Math.round(walked) + " m" : (walked / 1000).toFixed(2) + " km"}<br>gravity 0.14 g · 94 K (−179 °C) · 1.47 bar${onGround ? "" : " · in the air " + (ME.y - gN).toFixed(1) + " m"}`;
  HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
