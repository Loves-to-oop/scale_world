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
  for (let i = ci - 34; i <= ci + 34 && k < 2600; i++) for (let j = cj - 34; j <= cj + 34 && k < 2600; j++) { const r = hash(i * 3 + 1, j * 7 + 2), x = (i + hash(i, j)) * S, z = (j + hash(j, i)) * S, h = land(x, z); if (h < -0.15) continue; const dens = h < 6 ? 0.55 : 0.2; if (r > dens) continue;
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
const nextFact = () => { factI = (factI + 1) % FACTS.length; say(FACTS[factI] + ` <span style="opacity:.6">(${factI + 1}/${FACTS.length}: E for the next)</span>`, 45); };
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

// ---------- the loop ----------
const clock = new THREE.Clock(); let T = 0, frameN = 0, underFog = false;
updateGround(true); fillCobbles(); fillSea();
renderer.setAnimationLoop(() => { const dt = clampN(clock.getDelta(), 0, 0.05), vr = renderer.xr.isPresenting; T += dt; frameN++;
  let mx = 0, my = 0, run = false, jump = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; run = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) hud = !hud; prevB.x = bX; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bA = gp.buttons[4]?.pressed, bB = gp.buttons[5]?.pressed; if (bA && !prevB.a) nextFact(); prevB.a = bA; if (bB && !prevB.b) jump = true; prevB.b = bB; } } }
  else { if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD || keys.ArrowRight) mx += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; run = keys.ShiftLeft || keys.ShiftRight; if (keys.Space) jump = true; }
  // physics: on the ground you push off and steer; in the air only gravity and drag act; in the liquid, buoyancy and heavy drag
  const gY = land(ME.x, ME.z), sub = clampN((0 - ME.y) / 1.7, 0, 1), onGround = ME.y <= gY + 0.03;
  if (started && (mx || my) && (onGround || sub > 0.3)) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = sub > 0.5 ? 0.6 : run ? 3.0 : 1.45;
    const tx = (f.x * -my + sd.x * mx) * sp, tz = (f.z * -my + sd.z * mx) * sp, k = 1 - Math.exp(-dt * (sub > 0.5 ? 1.5 : 6)); ME.vx += (tx - ME.vx) * k; ME.vz += (tz - ME.vz) * k; }
  else if (onGround) { const k = 1 - Math.exp(-dt * (sub > 0.5 ? 2 : 5)); ME.vx -= ME.vx * k; ME.vz -= ME.vz * k; }
  if (jump && onGround && started) ME.vy = sub > 0.6 ? 0.8 : 2.6;
  const v = Math.hypot(ME.vx, ME.vy, ME.vz), rho = lerpN(RHO_AIR, RHO_LIQ, sub), dragK = 0.5 * rho * CDA * v / MASS, gEff = G_T * (1 - rho / 1000 * (sub > 0 ? 1 : 0.0055));
  ME.vy -= gEff * dt; ME.vx -= ME.vx * dragK * dt; ME.vy -= ME.vy * Math.min(1, dragK * dt); ME.vz -= ME.vz * dragK * dt;
  const ox = ME.x, oz = ME.z; ME.x += ME.vx * dt; ME.z += ME.vz * dt; ME.y += ME.vy * dt; walked += Math.hypot(ME.x - ox, ME.z - oz);
  const gN = land(ME.x, ME.z); if (ME.y < gN) { if (gN - ME.y > 1.2 && onGround) { ME.x = ox; ME.z = oz; ME.vx *= -0.2; ME.vz *= -0.2; ME.y = land(ox, oz); } else { ME.y = gN; if (ME.vy < 0) ME.vy = 0; } }
  // the world is kept near the origin; far moves shift the origin and rebuild the ground
  if (Math.hypot(ME.x - ME.x0, ME.z - ME.z0) > 3000) { ME.x0 = ME.x; ME.z0 = ME.z; updateGround(true); fillCobbles(); fillSea(); }
  else { updateGround(); if (Math.hypot(ME.x - cobC[0], ME.z - cobC[1]) > 6) fillCobbles(); if (Math.hypot(ME.x - seaC[0], ME.z - seaC[1]) > 40) fillSea(); }
  rig.position.set(ME.x - ME.x0, ME.y, ME.z - ME.z0); rig.rotation.set(0, vr ? vrYaw : 0, 0); if (!vr) { camera.position.set(0, 1.6, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  sky.position.copy(rig.position);
  // under the surface: a dim brown murk
  const eyeY = ME.y + 1.6, under = eyeY < 0; if (under !== underFog) { underFog = under; scene.fog.density = under ? 0.12 : 1 / 26000; scene.fog.color.copy(under ? new THREE.Color(0.16, 0.1, 0.05) : FOGC); seaU.under.value = under ? 1 : 0; }
  seaU.t.value = T; if (!under && (!IS_HEADSET || frameN % 2 === 0)) { sea.visible = false; COB.visible = false; updateReflection(); sea.visible = true; COB.visible = true; }
  if (hud && frameN % 10 === 0) HUD.innerHTML = `Ligeia Mare, Titan · 73° N<br>${ME.y >= 0 ? (ME.y < 1000 ? ME.y.toFixed(1) + " m" : (ME.y / 1000).toFixed(2) + " km") + " above the sea" : (-ME.y).toFixed(1) + " m under the surface"} · walked ${walked < 1000 ? Math.round(walked) + " m" : (walked / 1000).toFixed(2) + " km"}<br>gravity 0.14 g · 94 K (−179 °C) · 1.47 bar${onGround ? "" : " · in the air " + (ME.y - gN).toFixed(1) + " m"}`;
  HUD.style.display = hud && started ? "block" : "none";
  msgT -= dt; msgAge += dt; if (vr && vrPanel.visible && msgAge > 4 && (mx || my)) msgT = 0; if (msgT <= 0) { MSG.style.display = "none"; vrPanel.visible = false; }
  renderer.render(scene, camera); });
