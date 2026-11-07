// betelgeuse.js -- Betelgeuse, the red supergiant in Orion, seen from the glass cupola of a ship parked 30 AU from it, on the side
// facing the Sun, with the sky as it really is from there (betelgeuse_sky.js: every star brighter than magnitude 6.8, recomputed
// from the AT-HYG catalogue for a point 168 pc from the Sun). Betelgeuse: about 760 times the Sun's radius (3.55 AU), 3,600 K,
// about 126,000 times the Sun's light, about 18 times its mass; a surface of a few giant convection cells, an uneven edge, an extended
// molecular atmosphere, clumps of dust forming farther out; a pulsation of about 416 days; and a probable small companion (Siwarha,
// reported in 2025) orbiting inside its outer atmosphere every 5.8 years. What is measured, what is estimated and what is drawn as
// typical is said in the panel. Built into betelgeuse.html by build.py (after betelgeuse_sky.js).
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
let MODE = "ship";
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
const skyG = new THREE.Group(); scene.add(skyG); const SKY_DIM = { value: 1 };
{ const pos = new Float32Array(SKY_N * 3), col = new Float32Array(SKY_N * 3), size = new Float32Array(SKY_N);
  for (let i = 0; i < SKY_N; i++) { const m = SKY[i * 5], bv = SKY[i * 5 + 4]; pos.set([SKY[i * 5 + 1] * SKY_R, SKY[i * 5 + 2] * SKY_R, SKY[i * 5 + 3] * SKY_R], i * 3); const f = 10 ** (-0.4 * (m - 6.5)), c = bbRGB(bvTemp(Math.max(-0.4, Math.min(2, bv))));
    col.set(c.map(v => v * Math.min(1, 0.25 + 0.75 * Math.sqrt(f) / 4)), i * 3); size[i] = Math.min(14, 1.6 + 1.2 * Math.sqrt(f)); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { px: { value: renderer.getPixelRatio() }, dim: SKY_DIM }, vertexShader: "attribute float size; attribute vec3 color; varying vec3 vC; uniform float px, dim; void main(){ vC = color * dim; gl_PointSize = size * px; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "varying vec3 vC; void main(){ vec2 q = gl_PointCoord - 0.5; float r = length(q) * 2.0; float a = exp(-r * r * 5.0); if (a < 0.02) discard; gl_FragColor = vec4(vC * a, a); }", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = -5; skyG.add(pts); }
// the Milky Way: a soft band along the galactic plane, brighter toward the galactic centre (in Sagittarius), with dark lanes. From
// 548 light-years away it looks almost as it does from Earth: the galaxy is 100,000 light-years across.
{ const eq = (ra, dec) => { ra *= Math.PI / 180; dec *= Math.PI / 180; const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec); return V3(x, z, -y); };
  const gnp = eq(192.85948, 27.12825), gc = eq(266.405, -28.936);
  const mw = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.02, 64, 32), new THREE.ShaderMaterial({ uniforms: { gnp: { value: gnp }, gc: { value: gc }, dim: SKY_DIM }, side: THREE.BackSide, depthWrite: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform vec3 gnp, gc; uniform float dim; varying vec3 vD; float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y), mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
      void main(){ vec3 d = normalize(vD); float b = asin(clamp(dot(d, gnp), -1.0, 1.0)); vec3 e1 = normalize(gc - gnp * dot(gc, gnp)), e2 = cross(gnp, e1); float l = atan(dot(d, e2), dot(d, e1));
        float bulge = exp(-l * l / 0.35), w = 0.09 + 0.10 * bulge, band = exp(-b * b / (w * w)) * (0.35 + 0.65 * bulge + 0.25 * cos(l));
        float lane = smoothstep(0.35, 0.75, n3(d * 9.0) * 0.6 + n3(d * 23.0) * 0.4) * exp(-b * b / (0.03 * 0.03)); float c = band * (0.75 + 0.5 * n3(d * 40.0)) * (1.0 - 0.7 * lane);
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.85) * c * 0.06 * dim, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }` })); mw.renderOrder = -10; skyG.add(mw); }

// ---------- Betelgeuse ----------
// Its visible surface (where the gas turns opaque) is not a crisp, round ball. Simulations and interferometer images show a few
// enormous convection cells, each a good fraction of the star's width, rising and sinking over months to years, with smaller cells
// between; an outline a few per cent out of round; and strong darkening and reddening toward the edge. The pattern here is typical,
// not a map of the real star. Colours: the blackbody colour of a temperature 8% lower, since titanium oxide in the cool atmosphere
// absorbs green and blue light and makes the star redder than its temperature alone (its measured colour, B-V = 1.85, matches about
// 3,300 K); brightness from the true temperature (3,600 K: 0.15 times the Sun's, area for area). The visible surface (photosphere)
// of a red supergiant is not crisp like the Sun's: the gas there is about a millionth as dense as air (a rough vacuum) and the opaque layer is deep
// and ragged, so the edge fades out gradually into the molecular atmosphere (the soft limb below).
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
    vec3 bb(float T){ float t = T * 0.92 / 100.0; vec3 c = vec3(255.0, 99.47 * log(t) - 161.1, t <= 19.0 ? 0.0 : 138.5 * log(t - 10.0) - 305.0); return pow(clamp(c / 255.0, 0.0, 1.0), vec3(2.2)) * pow(T / 3600.0, 4.0); }
    void main(){ vec3 p = normalize(vP); vec3 q = p + 0.18 * vec3(fbm(p * 3.0 + t * 0.1), fbm(p * 3.0 + 7.1), fbm(p * 3.0 + 13.3)) - 0.09; vec3 w = worley(q * 0.95, t), w2 = worley(q * 3.0 + 3.1, t * 1.7);
      float big = smoothstep(0.0, 0.75, w.y - w.x), small = smoothstep(0.0, 0.5, w2.y - w2.x), cellT = fract(sin(w.z) * 43758.5);
      float T = 3050.0 + 650.0 * big * (0.5 + 0.9 * cellT) + 120.0 * small + 260.0 * (fbm(p * 6.0 + t * 0.15) - 0.5);
      vec3 V = normalize(cameraPosition - vWp); float mu = clamp(dot(normalize(vNv), normalize((viewMatrix * vec4(V, 0.0)).xyz)), 0.0, 1.0);
      float limb = 1.0 - 0.72 * (1.0 - mu) - 0.18 * (1.0 - mu) * (1.0 - mu); T *= 0.82 + 0.18 * pow(mu, 0.5);
      vec3 col = bb(T) * limb * bright * 1.35; gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` });
const star = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 6), starMat); skyG.add(star);
// the extended atmosphere: molecules (water, carbon monoxide) and gas reaching out to about 1.5 times the radius. At 1,500-2,000 K
// it glows mostly in infrared; in visible light it is only a faint haze round the disc, drawn as a dim halo
const glowTex = canvasTex(512, 512, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, W * 0.2, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,110,45,0.22)"); r.addColorStop(0.18, "rgba(240,90,40,0.08)"); r.addColorStop(0.45, "rgba(200,70,35,0.02)"); r.addColorStop(1, "rgba(180,60,30,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(glow);
// the soft limb: a dark orange-red veil over the outermost 10% of the disc fading out to 1.2 radii, so the star has no hard edge
const limbTex = canvasTex(512, 512, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(150,40,15,0)"); r.addColorStop(0.74, "rgba(150,40,15,0)"); r.addColorStop(0.83, "rgba(140,38,14,0.55)"); r.addColorStop(0.9, "rgba(120,32,12,0.35)"); r.addColorStop(1, "rgba(100,28,10,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const limb = new THREE.Sprite(new THREE.SpriteMaterial({ map: limbTex, transparent: true, depthWrite: false })); limb.renderOrder = 3; skyG.add(limb);
// from far away, where the disc is small, its glare: Betelgeuse from 3,000 AU is still far brighter than any star
const bGlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(bGlare);
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
// where things are: positions in AU in Betelgeuse's frame (centred on it); the ship is at SHIP. Each thing is drawn at a stand-in
// distance between 1.5 and 8 km from you that grows with the logarithm of its true distance (15 km to 10,000 AU), keeping its true
// direction and angular size, and keeping nearer things in front of farther ones.
const SHIP = BD.clone().multiplyScalar(-D_SHIP), fakeDist = d => 1500 + 6500 * THREE.MathUtils.clamp(Math.log10(d / 1e-7) / 11, 0, 1);
const place = (obj, sys, sizeAU) => { const rel = sys.clone().sub(SHIP), d = rel.length(), f = fakeDist(d); obj.position.copy(rel).multiplyScalar(f / d); if (sizeAU) obj.scale.setScalar(f * sizeAU / d); return d; };
const compPos = days => { const ca = 2 * Math.PI * days / P_COMP; return V3(Math.cos(ca) * A_COMP, 0, Math.sin(ca) * A_COMP).applyAxisAngle(V3(1, 0, 0), COMP_TILT).applyAxisAngle(V3(0, 1, 0), COMP_NODE); };
// Siwarha up close: a young star of about 2 solar radii and 5,500 K, its own glare round it
const R_COMP = 2 * RSUN_AU, compBall = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.ShaderMaterial({ vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
  fragmentShader: "varying vec3 vN; varying vec3 vV; void main(){ float mu = max(dot(normalize(vN), normalize(vV)), 0.0); gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * (0.45 + 0.55 * mu) * 2.2, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" })); skyG.add(compBall);

// ---------- the plausible system ----------
// Nothing but the companion is known. Massive stars' disks are blown away by their ultraviolet light within a few million years, so
// planets near them are rare, and anything inside about 4 AU would since have been swallowed as the star swelled. But massive disks
// can also break up directly into giant planets and brown dwarfs far out, and icy bodies can fall in from a far comet belt. So: a
// young super-Jupiter at 120 AU, still glowing dull red from its own heat at 8 million years old, with a volcanic and an icy moon; a
// brown dwarf at 900 AU, glowing orange from its heat; a comet falling in at 25 AU with tails stretched by Betelgeuse's light. Rocky
// planets: when the star was young (on the main sequence, about 50,000 Suns) its disk's snow line lay several hundred AU out, so the
// solids inside were rock and metal and rocky planets could form tens to hundreds of AU out: a scorched Mars-sized world at 45 AU and a
// young super-Earth at 350 AU, still cooling, where the light equals sunlight at Earth. All invented, all plausible; positions illustrative.
const PN = V3(0.25, 1, 0.15).normalize(), PE1 = new THREE.Vector3().crossVectors(PN, V3(0, 0, 1)).normalize(), PE2 = new THREE.Vector3().crossVectors(PN, PE1);
const inPlane = (r, ang, lift = 0) => PE1.clone().multiplyScalar(r * Math.cos(ang)).add(PE2.clone().multiplyScalar(r * Math.sin(ang))).add(PN.clone().multiplyScalar(lift));
const PLANET_FS = `uniform vec3 L, lc, c1, c2, c3, glowC; uniform float I, bands, glowI, seed, rock; varying vec3 vN; varying vec3 vO; ${NOISE}
  void main(){ vec3 o = normalize(vO); float turb = fbm(o * 4.0 + seed) * 0.6, b = sin((o.y + turb * 0.15) * bands + seed) * 0.5 + 0.5; vec3 alb;
    if (rock > 0.5) { alb = mix(c1, c2, smoothstep(0.35, 0.7, fbm(o * 6.0 + seed))) * (0.7 + 0.6 * fbm(o * 20.0 + seed)); if (rock > 1.5) alb = mix(alb, vec3(0.08, 0.05, 0.03), smoothstep(0.7, 0.78, fbm(o * 9.0 + seed * 3.0))); }
    else alb = mix(mix(c1, c2, b), c3, smoothstep(0.55, 0.9, fbm(o * 3.0 + seed * 2.0)));
    float dl = max(dot(normalize(vN), L), 0.0); vec3 col = alb * lc * I * dl + glowC * glowI * (0.55 + 0.45 * (1.0 - b)) * (rock > 1.5 ? smoothstep(0.7, 0.78, fbm(o * 9.0 + seed * 3.0)) * 3.0 : 1.0);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const PLANET_VS = "varying vec3 vN; varying vec3 vO; void main(){ vO = normalize(position); vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
const dotTex = canvasTex(64, 64, (g, W) => { const r = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,0.6)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, W, W); });
const BODIES = [];
function body(o) { const u = { L: { value: V3(1, 0, 0) }, lc: { value: new THREE.Color(1, 0.55, 0.3) }, I: { value: 1 }, c1: { value: new THREE.Color(...o.c1) }, c2: { value: new THREE.Color(...o.c2) }, c3: { value: new THREE.Color(...(o.c3 || o.c1)) }, glowC: { value: new THREE.Color(...(o.glowC || [0, 0, 0])) }, glowI: { value: o.glowI || 0 }, bands: { value: o.bands || 12 }, seed: { value: o.seed || 1 }, rock: { value: o.rock || 0 } };
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.ShaderMaterial({ uniforms: u, vertexShader: PLANET_VS, fragmentShader: PLANET_FS })); mesh.rotation.z = o.tilt || 0.2; skyG.add(mesh);
  const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(dot);
  let ring = null; if (o.ring) { ring = new THREE.Mesh(new THREE.RingGeometry(o.ring[0], o.ring[1], 96, 1), new THREE.ShaderMaterial({ uniforms: { lc: u.lc, I: u.I, r0: { value: o.ring[0] }, r1: { value: o.ring[1] } }, side: THREE.DoubleSide, transparent: true, depthWrite: false,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "uniform vec3 lc; uniform float I, r0, r1; varying vec2 vP; void main(){ float r = length(vP), f = (r - r0) / (r1 - r0); float a = (0.35 + 0.35 * sin(f * 60.0) * sin(f * 23.0)) * smoothstep(0.0, 0.05, f) * smoothstep(1.0, 0.9, f); gl_FragColor = vec4(vec3(0.85, 0.8, 0.72) * lc * I * 0.8, a * 0.8);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}" }));
    ring.rotation.x = Math.PI / 2 - 0.35; mesh.add(ring); }
  const B = { ...o, mesh, dot, ring, u }; BODIES.push(B); return B; }
const RJ = 0.000477, RE = 4.26e-5;
const PB = body({ name: "Betelgeuse b", tag: "plausible", pos: () => inPlane(120, 2.35), R: 1.3 * RJ, c1: [0.78, 0.62, 0.44], c2: [0.55, 0.32, 0.2], c3: [0.92, 0.86, 0.72], bands: 18, glowC: [1.0, 0.22, 0.05], glowI: 0.05, seed: 3.1, info: "a young super-Jupiter, about 8 times Jupiter's mass, 120 AU out: banded clouds lit orange by Betelgeuse, and on its night side a dull red glow from its own heat (about 1,100 K), since at 8 million years old it is still contracting." });
const PB1 = body({ name: "b I", tag: "plausible", lands: true, pos: () => PB.pos().add(inPlane(0.0042, 0.8)), R: 1.22e-5, c1: [0.36, 0.26, 0.2], c2: [0.62, 0.48, 0.3], rock: 2, glowC: [1.0, 0.35, 0.08], glowI: 0.3, seed: 7.7, info: "a volcanic moon the size of our Moon, kneaded by the giant's tides as Io is by Jupiter's: dark silicate lava fields and glowing vents. (At 120 AU Betelgeuse gives about 9 times Earth's sunlight, so sulfur, Io's colour, would melt here by day.)" });
const PB2 = body({ name: "b II", tag: "plausible", lands: true, pos: () => PB.pos().add(inPlane(0.0095, 3.9)), R: 1.1e-5, c1: [0.34, 0.3, 0.27], c2: [0.5, 0.44, 0.38], rock: 1, seed: 5.2, info: "a dark, cratered, rocky moon. Any ice it formed with has long since boiled away: at 120 AU Betelgeuse's light heats its surface to about 350 K." });
const PC = body({ name: "Betelgeuse c", tag: "speculative", lands: true, pos: () => inPlane(350, 4.1, 12), R: 1.6 * 6.371e6 / 1.496e11, c1: [0.16, 0.13, 0.12], c2: [0.3, 0.24, 0.2], rock: 2, glowC: [1.0, 0.32, 0.06], glowI: 0.35, seed: 9.3, tilt: 0.45, info: "a young rocky super-Earth, 1.6 times Earth's size, 350 AU out where Betelgeuse's light equals the Sun's at Earth. At 8 million years old its surface is still cooling: a dark new crust split by glowing lava, under a haze of steam and carbon dioxide outgassed from inside." });
const PE = body({ name: "Betelgeuse e", tag: "speculative", lands: true, pos: () => inPlane(45, 5.3, -2), R: 0.55 * 6.371e6 / 1.496e11, c1: [0.5, 0.36, 0.26], c2: [0.28, 0.2, 0.16], rock: 1, glowC: [1.0, 0.3, 0.05], glowI: 0.04, seed: 2.2, info: "a scorched rocky world about Mars's size, 45 AU out, in about 60 times the sunlight at Earth: an airless, baked surface, hot enough by day (about 750 K) to soften rock." });
const PD = body({ name: "a brown dwarf", tag: "plausible", pos: () => inPlane(900, 0.7, -40), R: 1.03 * RJ, c1: [0.12, 0.05, 0.03], c2: [0.06, 0.02, 0.01], bands: 24, glowC: [0.9, 0.22, 0.05], glowI: 0.75, seed: 4.4, info: "a brown dwarf of about 30 Jupiter masses, 900 AU out: too small to fuse hydrogen, glowing orange-red from the heat of its contraction (about 1,800 K)." });
// the comet: a nucleus ~10 km across falling in at 25 AU; its dust tail (curving, yellowish) and ion tail (straight, blue) point away
// from Betelgeuse, hundreds of millions of km long in its enormous light
const CN = () => inPlane(25, 1.15, 6), COMA = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xfff0dc, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); skyG.add(COMA);
const TAILS = []; for (const [kind, n, len, col] of [["dust", 220, 0.7, 0xffe2b8], ["ion", 200, 1.6, 0x8ab8ff]]) for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); skyG.add(sp); TAILS.push({ sp, kind, f: (i + 1) / n, len }); }
const tailDir = () => CN().normalize();

// ---------- where to go ----------
// The ship flies by a 1 g drive: speeding up at one Earth gravity to the midpoint, then slowing; the trip's real duration is given,
// and it is shown speeded up. (Faster than such trips would really take: a 1 g drive is far beyond any rocket today.)
const viewNear = (B, k, ang = 0.95) => () => { const P = B.pos(), toStar = P.clone().negate().normalize(), side = new THREE.Vector3().crossVectors(toStar, PN).normalize(); return P.clone().add(toStar.applyAxisAngle(side, ang).multiplyScalar(k * B.R)); };
const DESTS = [
  { name: "30 AU from Betelgeuse (start)", pos: () => BD.clone().multiplyScalar(-D_SHIP), look: () => V3(0, 0, 0) },
  { name: "Siwarha, inside the outer atmosphere", pos: () => { const c = compPos(tSec / 86400), side = new THREE.Vector3().crossVectors(c, PN).normalize(); return c.clone().add(side.multiplyScalar(0.12)).add(c.clone().normalize().multiplyScalar(0.05)); }, look: () => compPos(tSec / 86400) },
  { name: "Close to Betelgeuse: 6 AU from its centre", pos: () => BD.clone().multiplyScalar(-6).applyAxisAngle(PN, 0.3), look: () => V3(0, 0, 0) },
  { name: "The comet, 25 AU out", pos: () => { const c = CN(), side = new THREE.Vector3().crossVectors(c, PN).normalize(); return c.clone().add(side.multiplyScalar(0.25)).add(c.clone().normalize().multiplyScalar(0.2)); }, look: () => CN().add(tailDir().multiplyScalar(0.35)) },
  { name: "Betelgeuse e, a scorched rocky world (45 AU)", pos: viewNear(PE, 5, 0.8), look: () => PE.pos() },
  { name: "Betelgeuse b, a young super-Jupiter (120 AU)", pos: viewNear(PB, 4.5), look: () => PB.pos() },
  { name: "b I, its volcanic moon", pos: viewNear(PB1, 5, 0.6), look: () => PB1.pos() },
  { name: "Betelgeuse c, a young super-Earth (350 AU)", pos: viewNear(PC, 5, 0.7), look: () => PC.pos() },
  { name: "A brown dwarf (900 AU)", pos: viewNear(PD, 4.5, 1.6), look: () => PD.pos() },
  { name: "The comet belt, 3,000 AU out", pos: () => BD.clone().multiplyScalar(-3000).applyAxisAngle(PN, 0.5), look: () => V3(0, 0, 0) }];
let destI = 0; const TRAVEL = { on: false };
const AU_M = 1.496e11, fmtDays = s => s < 120 ? Math.round(s) + " seconds" : s < 3 * 3600 ? Math.round(s / 60) + " minutes" : s < 3 * 86400 ? (s / 3600).toFixed(0) + " hours" : (s / 86400).toFixed(s < 30 * 86400 ? 1 : 0) + " days";
// A trip, flown in real time on the ship's clock (speed it up with ] or T): a slow turn toward the destination (0.4° a second), a 1 g
// burn to the midpoint, a slow turn round (7.5 minutes), a 1 g burn to slow down, a slow turn to bring the destination into view.
// Under thrust there is real gravity, 1 g toward the engine; the engine off, you would float (you are held to the floor here).
const TURN_W = 0.4 * Math.PI / 180, G0 = 9.81;
function goTo(i) { if (TRAVEL.on || i === destI) return; if (RING.in) { say("The ring stops spinning during the burns: go back to the crew module first (the spoke lift, then the lift up)."); return; } const D = DESTS[i], to = D.pos(), dist = to.distanceTo(SHIP), t1g = 2 * Math.sqrt(dist * AU_M / G0), vmax = G0 * t1g / 2, q1 = thrustQuat(to.clone().sub(SHIP)), q2 = thrustQuat(SHIP.clone().sub(to)), q3 = viewQuat(D.look().sub(to));
  const segs = [["turn", ship.quaternion.angleTo(q1) / TURN_W, ship.quaternion.clone(), q1], ["burn1", t1g / 2], ["turn", Math.PI / TURN_W, q1, q2], ["burn2", t1g / 2], ["turn", q2.angleTo(q3) / TURN_W, q2, q3]];
  Object.assign(TRAVEL, { on: true, skipped: 0, from: SHIP.clone(), to, dist, t1g, vmax, i, segs, k: 0, c: 0, dir: to.clone().sub(SHIP).normalize() }); destI = i; drawConsole();
  const total = segs.reduce((a, s) => a + s[1], 0);
  say(`Setting off for ${D.name}: ${fmtD(dist)}. The ship turns slowly toward it, burns at 1 g to the midpoint, turns round and burns to slow down: ${fmtDays(total)} in all, at up to ${(vmax / 2.998e8 * 100).toFixed(vmax < 3e6 ? 2 : 1)}% of the speed of light. This runs in real time: ] or T speeds time up.`); }
// the ship's attitude. Its own "up" (+y) runs along its spine toward the nose: under thrust that is up for the crew. The observation
// sphere looks out to the ship's +x side. Parked, the ship holds the thing you came to see 30° above the sphere's horizon on that side;
// under thrust, its nose (and so the zenith) points along the thrust.
function viewQuat(dir, el = 0.52) { const t = dir.clone().normalize(), wu = Math.abs(t.y) > 0.95 ? V3(1, 0, 0) : V3(0, 1, 0), y0 = wu.clone().sub(t.clone().multiplyScalar(t.dot(wu))).normalize();
  const X = t.clone().multiplyScalar(Math.cos(el)).sub(y0.clone().multiplyScalar(Math.sin(el))), Y = t.clone().multiplyScalar(Math.sin(el)).add(y0.clone().multiplyScalar(Math.cos(el))), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
function thrustQuat(dir) { const Y = dir.clone().normalize(), wu = Math.abs(Y.y) > 0.95 ? V3(1, 0, 0) : V3(0, 1, 0), X = new THREE.Vector3().crossVectors(wu, Y).normalize(), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }

// ---------- interior surfaces: panelled walls, non-slip deck plating, ceiling light panels ----------
const wallTex = canvasTex(512, 512, (g, W) => { g.fillStyle = "#c9cdd3"; g.fillRect(0, 0, W, W); g.fillStyle = "#b9bdc4"; g.fillRect(0, W * 0.62, W, W * 0.38); g.strokeStyle = "#8e949c"; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, W - 4); g.beginPath(); g.moveTo(0, W * 0.62); g.lineTo(W, W * 0.62); g.stroke();
  g.fillStyle = "#9aa0a8"; for (const [x, y] of [[14, 14], [W - 14, 14], [14, W - 14], [W - 14, W - 14]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } g.fillStyle = "#7a8088"; for (let k = 0; k < 6; k++) g.fillRect(W * 0.3, W * 0.75 + k * 12, W * 0.4, 5); g.fillStyle = "#3a6aa0"; g.fillRect(W * 0.08, W * 0.58, W * 0.84, 6); });
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
const deckTex = canvasTex(256, 256, (g, W) => { g.fillStyle = "#555a62"; g.fillRect(0, 0, W, W); g.strokeStyle = "#454950"; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, W - 2); g.fillStyle = "#62676f"; for (let y = 8; y < W; y += 16) for (let x = (y / 16) % 2 ? 8 : 16; x < W; x += 16) { g.save(); g.translate(x, y); g.rotate(0.78); g.fillRect(-4, -1.5, 8, 3); g.restore(); } }); deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping; deckTex.repeat.set(10, 10);
const ceilTex = canvasTex(256, 256, (g, W) => { g.fillStyle = "#d8dce2"; g.fillRect(0, 0, W, W); g.strokeStyle = "#b0b6be"; g.lineWidth = 3; g.strokeRect(1, 1, W - 2, W - 2); g.fillStyle = "#ffffff"; g.fillRect(W * 0.15, W * 0.4, W * 0.7, W * 0.2); }); ceilTex.wrapS = ceilTex.wrapT = THREE.RepeatWrapping; ceilTex.repeat.set(8, 8);
const wallM = (rx, ry) => { const t = wallTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7, side: THREE.BackSide }); };
const deckM = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.85, side: THREE.DoubleSide }), ceilPanelM = new THREE.MeshStandardMaterial({ map: ceilTex, emissiveMap: ceilTex, emissive: 0x6a6c70, roughness: 0.8, side: THREE.DoubleSide });

// ---------- the ship: an observation sphere on the side of a long spine ----------
// A ship that could carry people here would need an antimatter or advanced fusion drive (even at a steady 1 g, the 548 light-years
// from the Sun would take its crew about 12.7 years, while 550 passed on Earth). Such designs share a shape: a long spine with the crew
// far from the engine; a shadow shield between them against its radiation; huge radiators for its waste heat; propellant tanks; a
// shield at the nose against interstellar dust. You are in a glass observation sphere 8 m across on the crew module's side, standing on
// an open grating, so you can look down through the floor and the glass beneath at the spine, the radiators and the engine. Typical of
// such designs, not a particular one. The sphere stands on an arm 34 m out from the spine, clear of the tanks and radiators.
const ship = new THREE.Group(); scene.add(ship); const BUB = V3(0, 1, 0), BUB_R = 4;
const engineParts = [];
{ const metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), dark = M(0x2a2c32, { metalness: 0.4 }), hull = M(0xb8bcc2, { metalness: 0.3, roughness: 0.6 });
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ship.add(m); return m; };
  add(new THREE.SphereGeometry(BUB_R, 48, 32), new THREE.MeshBasicMaterial({ color: 0x14171c, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false }), BUB.x, BUB.y, BUB.z);
  for (let k = 0; k < 6; k++) add(new THREE.TorusGeometry(BUB_R, 0.035, 6, 64), metal, BUB.x, BUB.y, BUB.z, 0, k * Math.PI / 6, 0);
  for (const lat of [-0.75, -0.35, 0.4, 0.8]) add(new THREE.TorusGeometry(BUB_R * Math.cos(lat), 0.03, 6, 64), metal, BUB.x, BUB.y + BUB_R * Math.sin(lat), BUB.z, Math.PI / 2);
  const grate = canvasTex(256, 256, (g, W) => { g.clearRect(0, 0, W, W); g.fillStyle = "#6a6e76"; for (let k = 0; k < W; k += 32) { g.fillRect(k, 0, 3, W); g.fillRect(0, k, W, 3); } }); grate.wrapS = grate.wrapT = THREE.RepeatWrapping; grate.repeat.set(5, 5);
  add(new THREE.CircleGeometry(Math.sqrt(BUB_R ** 2 - 1), 64), new THREE.MeshStandardMaterial({ map: grate, alphaTest: 0.5, transparent: true, side: THREE.DoubleSide, metalness: 0.5, roughness: 0.5 }), 0, 0, 0, -Math.PI / 2);
  add(new THREE.TorusGeometry(Math.sqrt(BUB_R ** 2 - 1), 0.08, 8, 64), metal, 0, 0, 0, Math.PI / 2);
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) - Math.PI) < 0.3 || Math.abs(a - Math.PI) < 0.3) continue; add(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 6), metal, 3.3 * Math.cos(a), 0.52, 3.3 * Math.sin(a)); }
  add(new THREE.TorusGeometry(3.3, 0.035, 6, 64, Math.PI * 2 - 0.62), metal, 0, 1.05, 0, Math.PI / 2, 0, Math.PI + 0.31);
  add(new THREE.CylinderGeometry(1.3, 1.3, 22, 24, 1, true), M(0x8a8e96, { metalness: 0.4 }), -14.5, 1, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(1.25, 1.25, 22, 24, 1, true), wallM(4, 8), -14.5, 1, 0, 0, 0, Math.PI / 2);
  const hullD = M(0xb8bcc2, { metalness: 0.3, roughness: 0.6 }), band = new THREE.MeshBasicMaterial({ color: 0x14171c, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false });
  for (const [y0, y1, m] of [[-13, 0.2, hullD], [0.2, 2.8, band], [2.8, 4.2, hullD], [4.2, 6.8, band], [6.8, 21, hullD]]) { add(new THREE.CylinderGeometry(10, 10, y1 - y0, 48, 1, true), m, -34, (y0 + y1) / 2, 0); if (m === hullD) add(new THREE.CylinderGeometry(9.9, 9.9, y1 - y0, 48, 1, true), wallM(16, (y1 - y0) / 3.2), -34, (y0 + y1) / 2, 0); }
  for (const y of [0.2, 2.8, 4.2, 6.8]) add(new THREE.TorusGeometry(10, 0.12, 6, 64), metal, -34, y, 0, Math.PI / 2); for (let k = 0; k < 16; k++) for (const y of [1.5, 5.5]) add(new THREE.BoxGeometry(0.12, 2.6, 0.2), metal, -34 + 10 * Math.cos(k * Math.PI / 8), y, 10 * Math.sin(k * Math.PI / 8), 0, -k * Math.PI / 8);
  add(new THREE.CircleGeometry(10, 48), hullD, -34, -13, 0, Math.PI / 2); add(new THREE.CircleGeometry(10, 48), hullD, -34, 21, 0, -Math.PI / 2);
  for (const [y0, y1] of [[-370, -43], [-37, -13], [21, 50]]) { add(new THREE.CylinderGeometry(3, 3, y1 - y0, 16), metal, -34, (y0 + y1) / 2, 0); for (const [x, z] of [[2.6, 2.6], [-2.6, 2.6], [2.6, -2.6], [-2.6, -2.6]]) add(new THREE.CylinderGeometry(0.4, 0.4, y1 - y0, 6), dark, -34 + x, (y0 + y1) / 2, z); }
  add(new THREE.ConeGeometry(26, 34, 40), M(0x5a5e66, { metalness: 0.4, roughness: 0.7 }), -34, 55, 0);
  for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(10, 24, 16), M(0xd8d0c0, { roughness: 0.5 }), -34 + 13 * Math.cos(k * Math.PI / 3), -75, 13 * Math.sin(k * Math.PI / 3));
  for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(10, 24, 16), M(0xd8d0c0, { roughness: 0.5 }), -34 + 13 * Math.cos(k * Math.PI / 3 + 0.5), -102, 13 * Math.sin(k * Math.PI / 3 + 0.5));
  const radM = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.3, roughness: 0.8, emissive: 0x000000 }); engineParts.push({ radM });
  for (const z of [-1, 1]) add(new THREE.BoxGeometry(0.6, 150, 60), radM, -34, -190, z * 34);
  add(new THREE.CylinderGeometry(16, 16, 2, 40), dark, -34, -290, 0);
  add(new THREE.SphereGeometry(6, 24, 16), metal, -34, -300, 0); for (let k = 0; k < 4; k++) add(new THREE.TorusGeometry(9 + k * 2.5, 0.8, 8, 40), metal, -34, -306 - k * 6, 0, Math.PI / 2);
  const plumeTex = canvasTex(64, 256, (g, W, Hh) => { const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, "rgba(200,220,255,0.9)"); gr.addColorStop(0.15, "rgba(150,180,255,0.45)"); gr.addColorStop(1, "rgba(100,130,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); });
  const plume = add(new THREE.CylinderGeometry(9, 70, 900, 32, 1, true), new THREE.MeshBasicMaterial({ map: plumeTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), -34, -780, 0); plume.visible = false; engineParts[0].plume = plume; }
// ---------- inside the ship ----------
// The crew module is a cylinder 20 m across round the spine, its decks stacked along the spine (under thrust, "down" is toward the
// engine): the airlock and suit room with the storm shelter at -4 m, the commons and galley at 0 (where the arm from the sphere comes
// in), the bridge at +4 m, the crew's quarters at +8 m, joined by a lift up the middle. Typical of such designs, not a particular ship.
const MOD = V3(-34, 0, 0), DECKS = [[-40, "the hub of the spinning ring"], [-4, "the airlock and suit room"], [0, "the commons and galley"], [4, "the bridge"], [8, "life support and the medical bay"]], liftPlat = new THREE.Group();
function plaque(text, x, y, z, ry, w = 1.6) { const lines = text.split("\n"), t = canvasTex(640, 60 + lines.length * 38, (g, W, Hh) => { g.fillStyle = "#101820"; g.fillRect(0, 0, W, Hh); g.strokeStyle = "#60a0e0"; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, Hh - 4); g.fillStyle = "#9ad0ff"; g.font = "bold 30px sans-serif"; g.fillText(lines[0], 18, 42, W - 36); g.fillStyle = "#e8eef8"; g.font = "24px sans-serif"; lines.slice(1).forEach((l, i) => g.fillText(l, 18, 82 + i * 38, W - 36)); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * (60 + lines.length * 38) / 640), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(x, y, z); m.rotation.y = ry; ship.add(m); return m; }
let bridgeCon = null;
{ const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ship.add(m); return m; };
  const floorM = M(0x4a4e56, { roughness: 0.9, side: THREE.DoubleSide }), wood = M(0x8a6a4a, { roughness: 0.8 }), white = M(0xe8eaee, { roughness: 0.6 }), dark = M(0x2a2c32), seat = M(0x3a5a8a, { roughness: 0.8 }), metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 });
  const ceilM = new THREE.MeshStandardMaterial({ color: 0xd8dce2, emissive: 0x2a2c30, roughness: 0.8 });
  for (const [y] of DECKS) { if (y === -40) continue; add(new THREE.RingGeometry(1.75, 9.95, 48), deckM, MOD.x, y, 0, -Math.PI / 2); add(new THREE.RingGeometry(1.75, 9.95, 48), ceilPanelM, MOD.x, y + 3.85, 0, Math.PI / 2); add(new THREE.TorusGeometry(9.6, 0.035, 6, 96), metal, MOD.x, y + 1.05, 0, Math.PI / 2); add(new THREE.TorusGeometry(2.0, 0.035, 6, 48, Math.PI * 1.6), metal, MOD.x, y + 1.05, 0, Math.PI / 2); const L = new THREE.PointLight(0xf2f5ff, 16, 16, 1.6); L.position.set(MOD.x, y + 3.2, 0); ship.add(L); }
  add(new THREE.RingGeometry(1.75, 9.95, 48), floorM, MOD.x, 12, 0, Math.PI / 2);
  for (let k = 0; k < 4; k++) add(new THREE.CylinderGeometry(0.06, 0.06, 16.5, 6), metal, MOD.x + 1.75 * Math.cos(k * Math.PI / 2 + 0.785), 3.8, 1.75 * Math.sin(k * Math.PI / 2 + 0.785));
  liftPlat.add(new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32), M(0x6a7a8a, { metalness: 0.5 }))); liftPlat.position.set(MOD.x, -0.05, 0); ship.add(liftPlat);
  add(new THREE.BoxGeometry(5.4, 0.2, 0.4), dark, -25.4, -0.1, 0); add(new THREE.BoxGeometry(20, 0.08, 1.6), floorM, -14.5, 0, 0); const cl = new THREE.PointLight(0xfff0dc, 6, 14, 1.6); cl.position.set(-14.5, 1.9, 0); ship.add(cl);
  // the commons and galley: a table, benches, a galley counter, a bench along the windows
  add(new THREE.BoxGeometry(2.6, 0.08, 1.2), wood, -39, 0.76, 4); for (const z of [3, 5]) add(new THREE.BoxGeometry(2.6, 0.45, 0.4), seat, -39, 0.23, z); add(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8), metal, -39, 0.36, 4);
  add(new THREE.BoxGeometry(4, 0.95, 0.7), white, -38.5, 0.48, -7.4, 0, 0.45); add(new THREE.BoxGeometry(4, 1.2, 0.4), white, -38.8, 1.9, -7.9, 0, 0.45);
  add(new THREE.BoxGeometry(0.6, 0.45, 4), seat, -43, 0.23, 0.5);
  plaque("Commons and galley, deck 0\nThe crew eats, meets and rests here. Under 1 g thrust the floor\nis down; parked, the ship is weightless (you are held here).\nThe arm to the observation sphere opens on the far side.", MOD.x + 2.2, 1.7, 1.6, Math.PI / 4);
  // the bridge: a ring of consoles facing the windows, seats, the destination console
  for (let k = -2; k <= 2; k++) { const a = k * 0.45; add(new THREE.BoxGeometry(1.6, 0.9, 0.6), dark, MOD.x + 7.6 * Math.cos(a), 4.45, 7.6 * Math.sin(a), 0, -a + Math.PI / 2); add(new THREE.BoxGeometry(0.6, 0.5, 0.6), seat, MOD.x + 6.2 * Math.cos(a), 4.25, 6.2 * Math.sin(a), 0, -a); }
  plaque("The bridge, deck 4\nNavigation, the drive and life support are run from here.\nThe destination console works here too.", MOD.x + 2.2, 5.7, 1.6, Math.PI / 4);
  // life support and the medical bay: water recycling tanks, carbon dioxide scrubbers, oxygen generation (splitting water), a medical bed
  for (let k = 0; k < 4; k++) { const a = 0.4 + k * 0.32; add(new THREE.CylinderGeometry(0.9, 0.9, 2.8, 20), M(0x4a7aa8, { roughness: 0.4 }), MOD.x + 8.4 * Math.cos(a), 9.4, 8.4 * Math.sin(a)); }
  for (let k = 0; k < 5; k++) { const a = 2.3 + k * 0.22; add(new THREE.BoxGeometry(1.4, 2.4, 0.7), M(0x9aa0a8, { metalness: 0.4 }), MOD.x + 9.2 * Math.cos(a), 9.2, 9.2 * Math.sin(a), 0, -a + Math.PI / 2); }
  add(new THREE.CylinderGeometry(0.6, 0.6, 2.2, 16), M(0xd0d4da, { metalness: 0.5 }), MOD.x - 8.5, 9.1, -2.5); add(new THREE.TorusGeometry(0.8, 0.08, 6, 24), metal, MOD.x - 8.5, 9.9, -2.5, Math.PI / 2);
  add(new THREE.BoxGeometry(2.0, 0.6, 0.9), white, MOD.x + 1, 8.3, -6.8, 0, 0.3); add(new THREE.BoxGeometry(0.5, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff8e0 }), MOD.x + 1, 11.8, -6.8);
  plaque("Life support and medical bay, deck 8\nWater is recycled (over 98%), carbon dioxide scrubbed from the air,\nand oxygen made by splitting water. Spares for everything:\nno help can come from 548 light-years away.", MOD.x + 2.2, 9.7, 1.6, Math.PI / 4);
  // the airlock and suit room, with the storm shelter
  for (const z of [-3, -1.5]) { const sx = MOD.x - 8.4; add(new THREE.CapsuleGeometry(0.32, 0.9, 4, 10), white, sx, -4 + 0.95, z); add(new THREE.SphereGeometry(0.26, 16, 12), new THREE.MeshStandardMaterial({ color: 0xd0a040, metalness: 0.8, roughness: 0.2 }), sx, -4 + 1.75, z); }
  { const a = Math.PI - 0.3, h = add(new THREE.CylinderGeometry(1.0, 1.0, 0.25, 32).rotateX(Math.PI / 2), M(0x6a5a3a, { metalness: 0.5 }), MOD.x + 9.8 * Math.cos(a), -2.8, 9.8 * Math.sin(a)); h.lookAt(ship.localToWorld(V3(MOD.x, -2.8, 0))); }
  for (let k = 0; k < 10; k++) { const a = Math.PI * 0.15 + k * 0.12; add(new THREE.BoxGeometry(1.2, 2.6, 0.5), M(0x4a7aa8, { roughness: 0.4 }), MOD.x + 9.4 * Math.cos(a), -2.7, 9.4 * Math.sin(a), 0, -a + Math.PI / 2); }
  plaque("Airlock, suits and storm shelter, deck -4\nSpacesuits and the outer hatch (a spacewalk is still to come).\nThe blue tanks hold water: a shield the crew shelter behind\nwhen a stellar flare or the drive's radiation runs high.", MOD.x + 2.2, -2.3, 1.6, Math.PI / 4);
  plaque("Lift: E up, Q down (in VR, right stick)", MOD.x + 1.2, 1.2, -1.25, -Math.PI / 2, 1.2); }

// ---------- the spinning ring: gravity while the engine is off ----------
// Gravity without thrust takes spin. A ring 114 m across turning 4 times a minute gives about 1 g at its floor (the acceleration of
// circling: omega^2 r), slowly enough that most people adapt to it. Its "down" is outward; "up" points at the ship's axis. It stops
// spinning during burns, when the thrust gives weight in the crew module's decks. The crew's quarters, the farm, the gym and a lounge
// are here. You reach it from the hub on the spine (take the crew module's lift down), then a spoke lift out to the rim.
const RF = 57, W_RING = 4 * 2 * Math.PI / 60, ringG = new THREE.Group(); ringG.position.set(MOD.x, -40, 0); ship.add(ringG); let ringSpin = W_RING, ringAng = 0;
const RING = { in: false, phi: 0.06, y: 0 };
function ringQuat(phi) { const X = V3(-Math.sin(phi), 0, Math.cos(phi)), Y = V3(-Math.cos(phi), 0, -Math.sin(phi)), Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
{ const metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), white = M(0xe8eaee, { roughness: 0.6 }), seat = M(0x3a5a8a, { roughness: 0.8 }), dark = M(0x2a2c32);
  const floorT = canvasTex(256, 64, (g, W, H) => { g.fillStyle = "#5a5e66"; g.fillRect(0, 0, W, H); g.fillStyle = "#4a4e56"; for (let k = 0; k < W; k += 32) g.fillRect(k, 0, 2, H); }); floorT.wrapS = THREE.RepeatWrapping; floorT.repeat.set(60, 1);
  const rAdd = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ringG.add(m); return m; };
  rAdd(new THREE.CylinderGeometry(RF, RF, 8, 160, 1, true), new THREE.MeshStandardMaterial({ map: floorT, side: THREE.DoubleSide, roughness: 0.9 }), 0, 0, 0);
  rAdd(new THREE.CylinderGeometry(52, 52, 8, 160, 1, true), (() => { const t = ceilTex.clone(); t.needsUpdate = true; t.repeat.set(80, 2); return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0x6a6c70, side: THREE.DoubleSide }); })(), 0, 0, 0); for (const y of [-3.9, 3.9]) rAdd(new THREE.TorusGeometry(RF - 1.05, 0.035, 6, 320), metal, 0, y, 0, Math.PI / 2);
  for (const [r0, r1, y, mt] of [[52, 53.6, 4, white], [53.6, 55.6, 4, new THREE.MeshBasicMaterial({ color: 0x14171c, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })], [55.6, RF, 4, white], [52, RF, -4, white]]) rAdd(new THREE.RingGeometry(r0, r1, 160), mt.side === THREE.DoubleSide ? mt : (mt.side = THREE.DoubleSide, mt), 0, y, 0, Math.PI / 2);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, sp = rAdd(new THREE.CylinderGeometry(1.4, 1.4, 46, 16), metal, 29 * Math.cos(a), 0, 29 * Math.sin(a), 0, -a, Math.PI / 2); }
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6 + 0.26, L = new THREE.PointLight(0xf2f5ff, 22, 22, 1.6); L.position.set(53.5 * Math.cos(a), 0, 53.5 * Math.sin(a)); ringG.add(L); }
  // things in the ring, placed on its floor at angle phi, with their up pointing at the axis
  const onFloor = (geo, mat, phi, y, h, spin = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set((RF - h) * Math.cos(phi), y, (RF - h) * Math.sin(phi)); m.quaternion.copy(ringQuat(phi)); m.rotateY(spin); ringG.add(m); return m; };
  const rPlaque = (text, phi, y) => { const m = plaque(text, 0, 0, 0, 0, 1.6); ship.remove(m); m.position.set((RF - 1.7) * Math.cos(phi), y, (RF - 1.7) * Math.sin(phi)); m.quaternion.copy(ringQuat(phi)); m.rotateX(0); ringG.add(m); };
  onFloor(new THREE.BoxGeometry(2.2, 2.6, 0.3), M(0x6a5a3a, { metalness: 0.5 }), 0.0, -3.7, 1.3); rPlaque("Spoke lift to the hub: press Q here\n(or the right stick down). Gravity falls to nothing on the way.", 0.035, -3.75);
  for (let k = 0; k < 10; k++) { const phi = 0.3 + k * 0.1, side = k % 2 ? 1 : -1; onFloor(new THREE.BoxGeometry(2.1, 1.1, 1.0), white, phi, side * 3.3, 0.55, Math.PI / 2); }
  rPlaque("Crew quarters\nA private cabin pod for each of the crew of 12, in the ring's\ngravity: sleep, a screen, a curtain. Most of the voyage is lived here.", 0.32, 0);
  for (let k = 0; k < 12; k++) { const phi = 1.9 + k * 0.08; for (const side of [-1, 1]) { for (const [dt_, dz] of [[-0.35, -0.85], [0.35, -0.85], [-0.35, 0.85], [0.35, 0.85]]) onFloor(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), metal, phi + dt_ / RF, side * 3.1 + dz, 1.15); for (const h of [0.4, 1.1, 1.8]) onFloor(new THREE.BoxGeometry(0.7, 0.18, 1.7), M(0x3a8a3a, { roughness: 0.9 }), phi, side * 3.1, h + 0.1); onFloor(new THREE.BoxGeometry(0.7, 0.04, 1.7), new THREE.MeshBasicMaterial({ color: 0xd070ff }), phi, side * 3.1, 2.3); } }
  rPlaque("The farm\nGreens, potatoes, beans and algae grow under red and blue lamps,\nfeeding the crew and helping recycle the air and water.", 1.88, 0);
  onFloor(new THREE.BoxGeometry(0.8, 0.3, 2.0), dark, 3.55, -2, 0.15); onFloor(new THREE.BoxGeometry(0.6, 1.1, 1.2), dark, 3.7, 2, 0.55); onFloor(new THREE.BoxGeometry(2, 0.12, 1), M(0x3a7a4a), 3.85, 0, 0.06);
  rPlaque("The gym\nTwo hours of exercise a day: even with the ring's gravity, the\nweightless stretches of a voyage waste bone and muscle.", 3.5, 0);
  for (let k = 0; k < 3; k++) { onFloor(new THREE.BoxGeometry(1.2, 0.08, 1.2), M(0x8a6a4a), 5.2 + k * 0.12, 0, 0.76); onFloor(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 8), metal, 5.2 + k * 0.12, 0, 0.36); }
  rPlaque("The lounge\nMeals, films, games and talk: a voyage of years is as much\na test of getting along as of engineering.", 5.12, 0); }
// the hub: a round room on the spine where the spokes meet (weightless)
{ const hub = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 6, 32, 1, true), M(0xb8bcc2, { side: THREE.DoubleSide })); hub.position.set(MOD.x, -40, 0); ship.add(hub);
  for (const y of [-43, -37]) { const c = new THREE.Mesh(new THREE.CircleGeometry(6, 32), M(0x4a4e56, { side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.position.set(MOD.x, y, 0); ship.add(c); }
  const hl = new THREE.PointLight(0xfff0dc, 10, 12, 1.6); hl.position.set(MOD.x, -38, 0); ship.add(hl); plaque("The hub (weightless)\nThe spokes to the spinning ring meet here. Press E for the\nspoke lift out to the ring (gravity grows to 1 g on the way).", MOD.x + 4.2, -38.6, 1.5, -Math.PI / 4 - Math.PI / 2, 1.5); }
// the lander and probe bay on the spine, and the big communication dish (a message home takes 548 years)
{ const metal = M(0x8a8e96, { metalness: 0.6, roughness: 0.4 }), white = M(0xe8eaee, { roughness: 0.5 }), gold = M(0xc8a040, { metalness: 0.8, roughness: 0.3 }), add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); ship.add(m); return m; };
  add(new THREE.BoxGeometry(22, 0.6, 14), metal, MOD.x + 14, -62, 0); for (const [x, z] of [[4, 6], [24, 6], [4, -6], [24, -6]]) add(new THREE.CylinderGeometry(0.25, 0.25, 8, 6), metal, MOD.x + x, -58, z);
  add(new THREE.CylinderGeometry(2.4, 2.8, 3.2, 8), gold, MOD.x + 10, -59.8, 0); add(new THREE.CylinderGeometry(1.6, 2.2, 1.6, 8), white, MOD.x + 10, -57.4, 0); add(new THREE.ConeGeometry(0.9, 1.4, 16), M(0x2a2c32), MOD.x + 10, -61.8, 0);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.785; add(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 6), metal, MOD.x + 10 + 2.9 * Math.cos(a), -60.8, 2.9 * Math.sin(a), Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
  for (let k = 0; k < 3; k++) { add(new THREE.ConeGeometry(1.1, 0.8, 24), M(0x6a4a2a, { roughness: 0.8 }), MOD.x + 19, -61.3, -3.5 + k * 3.5, Math.PI); add(new THREE.CylinderGeometry(0.6, 0.8, 0.9, 16), white, MOD.x + 19, -60.4, -3.5 + k * 3.5); }
  const dish = add(new THREE.SphereGeometry(10, 32, 12, 0, Math.PI * 2, 0, 0.6), new THREE.MeshStandardMaterial({ color: 0xe0e2e6, metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide }), MOD.x - 18, 34, 0, 0, 0, Math.PI / 2); add(new THREE.CylinderGeometry(0.4, 0.4, 14, 8), metal, MOD.x - 9, 34, 0, 0, 0, Math.PI / 2); }

// the auto-darkening patch: electrochromic glass that darkens only where the star is, like a welding helmet. What harms the eye is how
// bright each bit of the star's surface is, not how far away it is: Betelgeuse's surface is about 15% as bright as the Sun's, enough to
// burn your retina in seconds from any distance. F switches the patch off to show what you would see without it.
let filterOn = true; const patch = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide })), patchRim = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 64), new THREE.MeshBasicMaterial({ color: 0x8a8e96, transparent: true, opacity: 0.6, side: THREE.DoubleSide })); ship.add(patch, patchRim);
// fading to black, for the ship's slow turns
const fadeM = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false }), fade = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), fadeM); fade.position.z = -0.12; fade.renderOrder = 50; camera.add(fade);
// the ship starts parked with Betelgeuse in view
ship.quaternion.copy(viewQuat(BD));
scene.add(new THREE.AmbientLight(0x404858, 0.6)); const starLight = new THREE.DirectionalLight(0xffb070, 3.2); starLight.position.copy(BD).multiplyScalar(100); scene.add(starLight);

// the destination console, on a stand by the dome's edge: click a line (or point a controller and pull the trigger)
const conTex = canvasTex(640, 860), console_ = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.075), new THREE.MeshBasicMaterial({ map: conTex, toneMapped: false })); console_.position.set(2.15, 1.2, -1.75); console_.rotation.set(-0.35, Math.atan2(-2.15, 1.75), 0, "YXZ"); ship.add(console_);
{ const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 0.12), M(0x2a2c32)); st.position.set(2.2, 0.5, -1.8); ship.add(st); }
bridgeCon = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.075), new THREE.MeshBasicMaterial({ map: conTex, toneMapped: false })); bridgeCon.position.set(MOD.x + 7.0, 5.35, 0); bridgeCon.rotation.set(-0.3, -Math.PI / 2, 0, "YXZ"); ship.add(bridgeCon);
const TBTN = [["◀◀ slower", () => setRate(rateI - 1)], ["real time", () => setRate(0)], ["faster ▶▶", () => setRate(rateI + 1)], ["skip to arrival", () => skipToArrival()]];
function drawConsole() { const g = conTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 640, 860); g.fillStyle = "#ffb060"; g.font = "bold 34px sans-serif"; g.fillText("DESTINATIONS", 24, 50);
  g.fillStyle = "#ffb060"; g.font = "bold 26px sans-serif"; g.fillText(`TIME: ${RATES[rateI][1]}`, 24, 712, 600); TBTN.forEach(([t], k) => { g.fillStyle = k === 3 && !TRAVEL.on ? "#14161c" : "#243248"; g.fillRect(16 + k * 154, 730, 146, 90); g.fillStyle = k === 3 && !TRAVEL.on ? "#5a6070" : "#e8f0ff"; g.font = "bold 22px sans-serif"; g.textAlign = "center"; g.fillText(t, 89 + k * 154, 784, 136); g.textAlign = "left"; });
  DESTS.forEach((D, i) => { const y = 74 + i * 60; g.fillStyle = i === destI ? (TRAVEL.on ? "#5a4a20" : "#2a3a5a") : "#181c26"; g.fillRect(16, y, 608, 54); g.fillStyle = i === destI ? "#ffe0a0" : "#d8e0f0"; g.font = "23px sans-serif"; g.fillText(`${(i + 1) % 10}. ${D.name}`, 28, y + 35, 584); });
  conTex.needsUpdate = true; }
function consoleHit(origin, dir) { const ray = new THREE.Raycaster(origin, dir); const h = ray.intersectObjects([console_, bridgeCon, ...MAPS, ...MISSIONS].filter(Boolean))[0]; if (!h) return false; if (MISSIONS.includes(h.object)) { missionHit(h.uv); return true; } if (MAPS.includes(h.object)) { const i = Math.floor(((1 - h.uv.y) * 600 - 70) / 70); if (i >= 0 && i < SHIP_SPOTS.length) shipGo(i); return true; }
  const py = (1 - h.uv.y) * 860; if (py >= 730 && py <= 820) { const k = Math.floor(h.uv.x * 640 / 154); if (TBTN[k]) TBTN[k][1](); drawConsole(); return true; } const i = Math.floor((py - 74) / 60); if (i >= 0 && i < DESTS.length) goTo(i); return true; }
// skipping ahead: the ship's clock jumps to the end of the trip (everything else moves on by the same time)
function skipToArrival() { if (!TRAVEL.on) { say("Not travelling: choose a destination first."); return; } const T = TRAVEL, rest = T.segs.slice(T.k).reduce((a, sg, n) => a + (n ? sg[1] : sg[1] - T.c), 0); tSec += rest; T.k = T.segs.length - 1; T.c = T.segs[T.k][1]; SHIP.copy(T.to); ship.quaternion.copy(T.segs[T.k][3]); ringFade = 1.6; T.skipped = rest; }
// the ship map: jump to any part of the ship (a fade)
const SHIP_SPOTS = [["Observation sphere", () => ({ x: -0.8, y: 0, z: 0 })], ["Commons and galley (deck 0)", () => ({ x: MOD.x + 3, y: 0, z: 2 })], ["Bridge (deck 4)", () => ({ x: MOD.x + 3, y: 4, z: 0 })], ["Life support, medical (deck 8)", () => ({ x: MOD.x + 3, y: 8, z: 0 })], ["Airlock, suits, shelter (deck -4)", () => ({ x: MOD.x + 3, y: -4, z: 0 })], ["Hub of the ring (weightless)", () => ({ x: MOD.x + 2.5, y: -40, z: 0 })], ["The spinning ring", null]];
function shipGo(i) { const [name, f] = SHIP_SPOTS[i]; if (!f) { if (!RING.in) { const was = { ...P }; ringEnter(); if (!RING.in) Object.assign(P, was); } return; } if (RING.in) RING.in = false; Object.assign(P, f()); liftPlat.position.y = P.y < -30 ? liftPlat.position.y : liftPlat.position.y; ringFade = 1.6; say(`${name}. Gravity: ${gravityText()}.`); }
const mapTex = canvasTex(640, 600, (g, W, H) => { g.fillStyle = "#0c0e14"; g.fillRect(0, 0, W, H); g.fillStyle = "#9ad0ff"; g.font = "bold 34px sans-serif"; g.fillText("SHIP MAP: go to", 24, 50); SHIP_SPOTS.forEach(([n], k) => { const y = 70 + k * 70; g.fillStyle = "#1c2a3e"; g.fillRect(16, y, 608, 62); g.fillStyle = "#e8f0ff"; g.font = "26px sans-serif"; g.fillText(n, 32, y + 40, 580); }); });
const MAPS = []; for (const [x, y, z, ry] of [[2.3, 1.2, 1.55, Math.atan2(-2.3, -1.55)], [MOD.x + 2.4, 1.5, -1.9, Math.PI * 0.75], [MOD.x + 2.4, 5.5, -1.9, Math.PI * 0.75], [MOD.x + 2.4, 9.5, -1.9, Math.PI * 0.75], [MOD.x + 2.4, -2.5, -1.9, Math.PI * 0.75], [MOD.x - 4.2, -38.6, 1.5, Math.PI / 4]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.75), new THREE.MeshBasicMaterial({ map: mapTex, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(-0.2, ry, 0, "YXZ"); ship.add(m); MAPS.push(m); }
{ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.75), new THREE.MeshBasicMaterial({ map: mapTex, toneMapped: false })); m.position.set((RF - 1.6) * Math.cos(-0.035), -2.2, (RF - 1.6) * Math.sin(-0.035)); m.quaternion.copy(ringQuat(-0.035)); ringG.add(m); MAPS.push(m); }
// the status screens: beside the console in the sphere, on the bridge, and on your left wrist in VR
const statTex = canvasTex(640, 470); const STATS = [];
for (const [x, y, z, ry] of [[2.75, 1.95, -0.7, Math.atan2(-2.75, 0.7)], [MOD.x + 7.4, 6.2, 1.5, -Math.PI / 2]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.59), new THREE.MeshBasicMaterial({ map: statTex, toneMapped: false })); m.position.set(x, y, z); m.rotation.set(-0.15, ry, 0, "YXZ"); ship.add(m); STATS.push(m); }
function statusLines() { const T = TRAVEL, dB = SHIP.length(), L = [];
  if (T.on) { const D = DESTS[T.i], rest = T.rest || 0, left = T.to.distanceTo(SHIP); L.push(["Going to", D.name], ["Now", ["turning toward it", "burning at 1 g (speeding up)", "engine off, turning round", "burning at 1 g (slowing down)", "turning to view it"][T.k]], ["Distance to go", fmtD(left)], ["Speed", `${fmt((T.v || 0) / 1000, 0)} km/s (${((T.v || 0) / 2.998e6).toFixed(2)}% of light)`], ["Arrives in", `${fmtDays(rest)} ship time`], ["At this time rate", `${fmtDays(rest / RATES[rateI][0])} real time`]); }
  else L.push(["Parked at", DESTS[destI].name], ["Speed", "0 (holding position)"]);
  L.push(["Time", RATES[rateI][1]], ["Gravity here", RING.in ? `${(ringSpin * ringSpin * RF / G0).toFixed(2)} g (ring spin)` : burningNow() ? "1 g (thrust)" : "none: weightless"], ["Betelgeuse", `${fmtD(dB)} away, ${(2 * Math.asin(Math.min(1, R_B / dB)) * 180 / Math.PI).toFixed(dB > 100 ? 2 : 1)}° across`]); return L; }
function drawStatus() { const g = statTex.userData.c.getContext("2d"); g.fillStyle = "#0c0e14"; g.fillRect(0, 0, 640, 470); g.fillStyle = "#7ae0a0"; g.font = "bold 32px sans-serif"; g.fillText("SHIP STATUS", 24, 46); statusLines().forEach(([k, v], i) => { g.fillStyle = "#8a96aa"; g.font = "22px sans-serif"; g.fillText(k, 24, 88 + i * 42, 200); g.fillStyle = "#e8f0ff"; g.font = "bold 22px sans-serif"; g.fillText(v, 230, 88 + i * 42, 396); }); statTex.needsUpdate = true;
  BAR.innerHTML = statusLines().map(([k, v]) => `<span style="color:#8a96aa">${k}:</span> <b>${v}</b>`).join(" &nbsp;·&nbsp; "); }
const BAR = document.createElement("div"); BAR.style.cssText = "position:fixed;left:50%;top:10px;transform:translateX(-50%);max-width:70%;z-index:3;background:rgba(12,14,20,.85);color:#e8f0ff;font:13px/1.5 -apple-system,sans-serif;padding:6px 12px;border-radius:9px;text-align:center;display:none"; document.body.appendChild(BAR);
const TIMEBTN = document.createElement("div"); TIMEBTN.style.cssText = "position:fixed;right:14px;top:10px;z-index:3;display:none;gap:6px"; TIMEBTN.innerHTML = TBTN.map(([t], k) => `<button data-t="${k}" style="font:600 13px -apple-system,sans-serif;padding:7px 10px;border-radius:8px;border:none;background:#243248;color:#e8f0ff;cursor:pointer;margin-left:6px">${t}</button>`).join(""); document.body.appendChild(TIMEBTN);
TIMEBTN.addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (b) { TBTN[+b.dataset.t][1](); drawConsole(); } });
const ctrls = [0, 1].map(i => { const ct = renderer.xr.getController(i); rig.add(ct); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd060 })); l.scale.z = 3; ct.add(l);
  ct.addEventListener("selectstart", () => { if (MODE !== "ship") { awaySelect(ct); return; } const o = V3(0, 0, 0), d = V3(0, 0, -1); ct.getWorldPosition(o); d.applyQuaternion(ct.getWorldQuaternion(new THREE.Quaternion())); consoleHit(o, d); });
  ct.addEventListener("connected", e => { if (e.data.handedness !== "left") return; const w = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.147), new THREE.MeshBasicMaterial({ map: statTex, toneMapped: false })); w.position.set(0, 0.06, 0.05); w.rotation.x = -1.0; ct.add(w); }); return ct; });

// ---------- the HUD: labels on the sky ----------
const HUD = new THREE.Group(); skyG.add(HUD); let hudOn = true;
function label(text, sub, dir, col = "#cfe6ff", scale = 1) { const t = canvasTex(512, 128, (g, W, Hh) => { g.font = "bold 38px sans-serif"; g.fillStyle = col; g.fillText(text, 30, 50); g.font = "28px sans-serif"; g.fillStyle = "rgba(220,230,255,0.75)"; g.fillText(sub, 30, 96); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(12, 38, 8, 0, 7); g.stroke(); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false })); s.center.set(0.02, 0.7); s.scale.set(1600 * scale, 400 * scale, 1); s.position.copy(dir).multiplyScalar(SKY_R * 0.9); s.renderOrder = 30; HUD.add(s); return s; }
for (const L of SKY_LABELS) if (!/^(HD|HIP) /.test(L.name) || L.m < 1.5) label(L.name, `mag ${L.m.toFixed(1)} · ${L.d.toLocaleString()} ly${L.err > L.d * 0.2 ? " (distance uncertain)" : ""}`, V3(...L.dir), "#cfe6ff", 0.8);
for (const N of SKY_NOTES) { const vis = N.m < 6.5; label(N.name, `${vis ? "mag " + N.m.toFixed(1) : "mag " + N.m.toFixed(1) + ", too faint to see"} · ${N.d.toLocaleString()} ly away${N.name === "the Sun" ? " · directly behind you" : ""}`, V3(...N.dir), N.name === "the Sun" ? "#ffd060" : vis ? "#cfe6ff" : "#8a9ab0", 0.9); }
// labels for the things of the system, kept up to date with their distances
function dynLabel(col, scale) { const t = canvasTex(512, 128), s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false })); s.center.set(0.02, 0.7); s.scale.set(1600 * scale, 400 * scale, 1); s.renderOrder = 30; HUD.add(s); s.userData = { t, col, last: "" }; return s; }
function setLabel(s, text, sub, sys) { const rel = sys.clone().sub(SHIP); s.position.copy(rel.normalize()).multiplyScalar(SKY_R * 0.9); const key = text + sub; if (key === s.userData.last) return; s.userData.last = key; const g = s.userData.t.userData.c.getContext("2d"); g.clearRect(0, 0, 512, 128);
  g.font = "bold 38px sans-serif"; g.fillStyle = s.userData.col; g.fillText(text, 30, 50); g.font = "28px sans-serif"; g.fillStyle = "rgba(220,230,255,0.75)"; g.fillText(sub, 30, 96); g.strokeStyle = s.userData.col; g.lineWidth = 3; g.beginPath(); g.arc(12, 38, 8, 0, 7); g.stroke(); s.userData.t.needsUpdate = true; }
const fmtD = d => d < 0.01 ? Math.round(d * 1.496e8).toLocaleString() + " km" : d < 1 ? (d * 149.6).toFixed(1) + " million km" : d.toFixed(d < 10 ? 1 : 0) + " AU";
const starLabel = dynLabel("#ffb060", 1.1), compLabel = dynLabel("#ffe8c0", 0.9), cometLabel = dynLabel("#c8e0ff", 0.85); for (const B of BODIES) B.label = dynLabel(B.glowI > 0.5 ? "#ffa070" : "#d8f0d0", 0.85);

// ---------- time ----------
// Real time by default. T steps up: an hour, a day, a month, a year per second (the cells churn over months to years, the pulsation
// takes 416 days, the companion 5.8 years).
const RATES = [[1, "real time"], [10, "10 times faster"], [60, "1 minute per second"], [600, "10 minutes per second"], [3600, "1 hour per second"], [21600, "6 hours per second"], [86400, "1 day per second"], [604800, "1 week per second"], [30 * 86400, "1 month per second"], [365.25 * 86400, "1 year per second"]]; let rateI = 0, tSec = 0;
function setRate(i) { rateI = Math.max(0, Math.min(RATES.length - 1, i)); say(`Time: ${RATES[rateI][1]}. ] faster, [ slower, \\ real time.`); }

// ---------- you ----------
// where you can walk: the sphere's floor, the walkway through the arm, and the decks of the crew module; the lift up its middle
const walkable = (x, z, y) => { const m = Math.hypot(x - MOD.x, z); if (Math.abs(y) < 0.01 && (x * x + z * z < 9 || (x > -25.5 && x < -2.6 && Math.abs(z) < 0.75))) return true; if (m < 1.6 && Math.abs(liftPlat.position.y + 0.05 - y) > 0.05) return false; if (Math.abs(y + 40) < 0.01) return m < 5.2; return m < 9.2 && DECKS.some(([d]) => Math.abs(d - y) < 0.01); };
const LIFT = { on: false }; const onLift = () => Math.hypot(P.x - MOD.x, P.z) < 1.4;
function liftMove(dir) { if (RING.in) { if (dir < 0) ringExit(); return; } if (Math.abs(P.y + 40) < 0.01 && dir > 0 && !onLift()) { ringEnter(); return; } if (!LIFT.on && !onLift() && Math.hypot(P.x - MOD.x, P.z) < 3 && Math.abs(liftPlat.position.y + 0.05 - P.y) > 0.05) { liftPlat.position.y = P.y - 0.05; say("The lift comes to your deck: step onto it."); return; } if (LIFT.on || !onLift()) return; const i = DECKS.findIndex(([d]) => Math.abs(d - P.y) < 0.01), j = i + dir; if (i < 0 || j < 0 || j >= DECKS.length) { say(dir > 0 ? "This is the top deck." : "This is the bottom deck."); return; } Object.assign(LIFT, { on: true, from: P.y, to: DECKS[j][0], t: 0, T: 3 + Math.abs(DECKS[j][0] - P.y) * 0.15 }); say(`Lift ${dir > 0 ? "up" : "down"} to ${DECKS[j][1]}.`); }
// the spoke lift between the hub and the ring, shown as a fade (a minute's ride, gravity growing from nothing to 1 g)
let ringFade = 0, ringFadeA = 0;
function ringEnter() { if (TRAVEL.on && burningNow()) { say("The ring is stopped while the engine burns: wait until the ship is parked or coasting."); return; } ringFade = 1.6; RING.in = true; RING.phi = 0.06; RING.y = -2.5; say(`The spoke lift carries you out to the ring: ${gravityText()}. Walk round it: quarters, the farm, the gym, the lounge. Q at the lift to go back.`); }
function ringExit() { if (Math.abs(RING.phi) > 0.12 && Math.abs(RING.phi - 2 * Math.PI) > 0.12) { say("Walk back to the spoke lift (the hatch where you came in) to leave the ring."); return; } ringFade = 1.6; RING.in = false; P.x = MOD.x + 2.5; P.z = 0; P.y = -40; say("Back at the hub on the spine: weightless."); }
const burningNow = () => TRAVEL.on && /^burn/.test(TRAVEL.segs[TRAVEL.k][0]);
const gravityText = () => RING.in ? `the ring's spin gives ${(ringSpin * ringSpin * RF / G0).toFixed(2)} g here` : burningNow() ? "1 g of weight from the engine's thrust" : "weightless (the engine is off): you would float, pulling yourself along handrails; your view is kept upright";
const areaOf = () => RING.in ? "ring" : P.y === 0 && P.x * P.x + P.z * P.z < 10 ? "sphere" : P.y === 0 && P.x > -24 ? "arm" : onLift() ? "lift" : "deck" + P.y;
const AREA_SAY = { arm: "The arm: a 22 m tube from the observation sphere to the crew module.", lift: "The lift up the middle of the crew module: E up, Q down (in VR, right stick up or down).", "deck-40": "The hub of the spinning ring, on the spine: weightless. E takes the spoke lift out to the ring.", "deck-4": "Deck -4: the airlock, the spacesuits and the storm shelter.", deck0: "Deck 0: the commons and galley. The window band looks out on the arm and the sphere.", deck4: "Deck 4: the bridge, with windows all round and the destination console.", deck8: "Deck 8: life support and the medical bay." }; let lastArea = "sphere";
const P = { x: -0.8, y: 0, z: 0 }; let yaw = -Math.PI / 2, pitch = 0.35, started = false, vrYaw = -Math.PI / 2; const keys = {};
addEventListener("keydown", e => { keys[e.code] = true; if (!started || MODE !== "ship") return; if (e.code === "KeyL") startLanding(); if (e.code === "KeyP") launchProbe(); if (/^Digit[0-9]$/.test(e.code)) goTo((+e.code.slice(5) + 9) % 10); if (e.code === "KeyH") hudOn = !hudOn; if (e.code === "KeyF") toggleFilter(); if (e.code === "KeyE") liftMove(1); if (e.code === "KeyQ") liftMove(-1); if (e.code === "KeyT" || e.code === "BracketRight") setRate(rateI + 1); if (e.code === "BracketLeft") setRate(rateI - 1); if (e.code === "Backslash") setRate(0); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; start(); });
addEventListener("pointermove", e => { if (!drag) return; drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y); yaw -= (e.clientX - drag.x) * 0.004; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - drag.y) * 0.004, -1.4, 1.5); drag.x = e.clientX; drag.y = e.clientY; });
addEventListener("pointerup", e => { if (drag && drag.moved < 6 && started && MODE === "ship") { const r = new THREE.Raycaster(); r.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1), camera); consoleHit(r.ray.origin, r.ray.direction); } drag = null; });
const VRB = document.getElementById("vr"), prevB = {};
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); vrYaw = yaw; }; });

// ---------- the panel ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:410px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(14,12,20,.85);color:#f0e8dc;font:13.5px/1.45 -apple-system,sans-serif;padding:12px 15px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:680px;z-index:2;background:rgba(14,12,20,.9);color:#f0e8dc;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0; function say(t) { MSG.innerHTML = t; MSG.style.display = "block"; msgT = 20; }
const ANG = 2 * Math.asin(R_B / D_SHIP) * 180 / Math.PI;
function drawPanel() { const days = tSec / 86400, ph = (days % P_PULSE) / P_PULSE, cph = (days % P_COMP) / P_COMP;
  const dB = SHIP.length(), angB = 2 * Math.asin(Math.min(1, R_B / dB)) * 180 / Math.PI, flux = L_B / dB ** 2, near = BODIES.concat([{ name: "Siwarha", pos: () => compPos(days) }, { name: "the comet", pos: CN }]).map(B => [B, B.pos().distanceTo(SHIP)]).sort((a, b) => a[1] - b[1])[0];
  PANEL.innerHTML = `<div style="font-size:17px;font-weight:600">Betelgeuse${TRAVEL.on ? ": travelling" : ""}</div>
  <div style="margin:4px 0 6px"><b>Where you are</b>: ${fmtD(dB)} from Betelgeuse, which is ${angB.toFixed(angB < 1 ? 2 : 1)}° across (${fmt(angB / 0.52, angB < 5 ? 1 : 0)} times the Moon's width from Earth) and gives ${fmt(flux, flux < 10 ? 1 : 0)} times the sunlight at Earth${flux > 30 ? ": deadly without heavy shielding" : flux > 2 ? "" : flux > 0.5 ? ", much like the Sun at Earth" : ""}. Nearest: ${near[0].name}, ${fmtD(near[1])}. Gravity: ${gravityText()}.
  ${TRAVEL.on ? `<br>On the way to ${DESTS[TRAVEL.i].name}: ${["turning toward it", "burning at 1 g (you feel 1 g of weight), destination overhead", "engine off, turning round", "burning at 1 g to slow down, destination below your feet", "turning to view it"][TRAVEL.k]}; speed ${fmt((TRAVEL.v || 0) / 1000, 0)} km/s (${((TRAVEL.v || 0) / 2.998e6).toFixed(2)}% of light); ${fmtDays(TRAVEL.rest || 0)} to go at ${RATES[rateI][1]} (] faster).` : ""}</div>
  <div style="margin-bottom:6px"><b>Go to</b> (click, press 1-9, or use the console in the dome):<br>${DESTS.map((D, k) => `<span data-d="${k}" style="cursor:pointer;color:${k === destI ? "#ffd070" : "#a8c8ff"}">${k + 1}. ${D.name}</span>`).join("<br>")}</div>
  <b>Measured (with uncertainties)</b><br>&middot; radius about ${Math.round(R_B * 215)} times the Sun's (${R_B.toFixed(2)} AU; estimates 640 to 1,000): in our Solar System it would reach past Mars<br>&middot; surface 3,600 K (deep orange), light about ${fmt(L_B, 0)} Suns, mass now about ${M_B} Suns<br>&middot; age about 8 to 10 million years; it should explode as a supernova within about 100,000 years<br>&middot; mean density about ${fmt(M_B * 1.989e30 / (4 / 3 * Math.PI * (R_B * 1.496e11) ** 3) / 1.2, 1)} of the air you breathe<br>&middot; it pulses every ~${P_PULSE} days, now at ${Math.round(ph * 100)}% of a cycle<br>&middot; it loses about a millionth of a Sun's mass a year, some of it as dust
  <div style="margin-top:6px"><b>Probable</b>: the companion Siwarha, about the Sun's mass, ${A_COMP.toFixed(1)} AU from Betelgeuse's centre (inside its outer atmosphere), once round every 5.8 years (now ${Math.round(cph * 100)}% round). Its orbit's tilt is assumed.</div>
  <div style="margin-top:6px"><b>Drawn as typical</b>: the pattern of giant convection cells and the uneven edge, the glow of the outer atmosphere, the dust clumps.</div>
  <div style="margin-top:6px"><b>Plausible, invented</b>: the young super-Jupiter Betelgeuse b (120 AU) and its moons, the brown dwarf (900 AU), the comet and the far comet belt. No planets are known around Betelgeuse, but real massive stars have such companions: b Centauri (a 6 to 10 solar-mass pair) has a planet of about 11 Jupiter masses about 560 AU out, and the massive star μ² Scorpii has wide giant companions; dusty comet belts are seen round massive young stars.<br><b>Speculative</b>: the rocky worlds Betelgeuse e (45 AU) and c (350 AU). Around so bright a star the young disk's snow line lay hundreds of AU out, so its solids were rock, but massive stars blow away their disks within about a million years, so rocky planets may never form.</div>
  <div style="margin-top:6px"><b>The sky here</b> (from the star catalogue): the brightest star is Rigel (mag −1.4), with Orion's belt stars and Saiph close behind. The Sun is magnitude 11, far too faint to see (it is directly behind you), and so is Sirius, the brightest star in Earth's sky (mag 7.6). Stars near Betelgeuse with only older distances may be misplaced by up to ~100 ly; in truth the glare of Betelgeuse would hide the faint ones.</div>
  <div style="margin-top:6px;color:#c8c0d8;font-size:12.5px">Time: ${RATES[rateI][1]} (T to change) · H labels ${hudOn ? "on" : "off"} · drag to look · WASD walk round the cupola</div>`; }
PANEL.addEventListener("click", e => { const d = e.target.closest("[data-d]"); if (d) goTo(+d.dataset.d); });
function toggleFilter() { filterOn = !filterOn; say(filterOn ? "Filter on: the glass darkens over Betelgeuse, about 100,000 times, so you can look at it." : "Filter off: this is closer to the truth. Betelgeuse's surface is about 15% as bright as the Sun's, so it is a blinding glare that would burn your retina in seconds, and its light drowns every other star. F to switch the filter back on."); }
function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block"; BAR.style.display = "block"; TIMEBTN.style.display = "flex";
  say(`You are in the glass cupola of a ship 30 AU from Betelgeuse. The star is ${ANG.toFixed(0)}° across: a churning orange surface of a few giant cells, darkening to red at its uneven edge, in a faint glow of its outer atmosphere. Its probable companion, Siwarha, is the brilliant point near it. The labels (H) name the stars and the things of this system (the planets are plausible inventions). Fly anywhere with the console beside you, the list in the panel, or keys 1-9. Look down through the grating floor at the ship. The dark patch on the glass is a filter over the star (F to see without it). T speeds up time.`); drawConsole(); }
document.getElementById("intro")?.addEventListener("click", start);

// ---------- the loop ----------
const clock = new THREE.Clock(), headP = V3(0, 0, 0), tmpV = V3(0, 0, 0), toCam = V3(0, 0, 0); let frameN = 0;
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting; frameN++;
  if (MODE !== "ship") { awayFrame(dt, vr); return; }
  if (started) tSec += dt * RATES[rateI][0]; const days = tSec / 86400;
  let mx = 0, my = 0, vrRun = false;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; vrRun = !!gp.buttons[0]?.pressed; const bX = gp.buttons[4]?.pressed; if (bX && !prevB.x) toggleFilter(); prevB.x = bX; const bY = gp.buttons[5]?.pressed; if (bY && !prevB.y) setRate(rateI - 1); prevB.y = bY; }
      else { const tx = a[ax] || 0, ty = a[ax + 1] || 0; if (ty < -0.75 && !prevB.lu) { liftMove(1); prevB.lu = true; } else if (ty > -0.3) prevB.lu = false; if (ty > 0.75 && !prevB.ld) { liftMove(-1); prevB.ld = true; } else if (ty < 0.3) prevB.ld = false; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; const bB = gp.buttons[5]?.pressed; if (bB && !prevB.b) hudOn = !hudOn; prevB.b = bB; const bA = gp.buttons[4]?.pressed; if (bA && !prevB.a) setRate(rateI + 1); prevB.a = bA; } } }
  else { if (keys.KeyW) my -= 1; if (keys.KeyS) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
  // walking round the cupola floor (in the ship's frame)
  if ((mx || my) && !LIFT.on && !RING.in) { const f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(ship.quaternion.clone().invert()); f.y = 0; f.normalize(); const sd = V3(-f.z, 0, f.x), sp = (keys.ShiftLeft || keys.ShiftRight || vrRun ? 6 : 2.5) * dt;
    const nx = P.x + (f.x * -my + sd.x * mx) * sp, nz = P.z + (f.z * -my + sd.z * mx) * sp; if (walkable(nx, nz, P.y)) { P.x = nx; P.z = nz; } else if (walkable(nx, P.z, P.y)) P.x = nx; else if (walkable(P.x, nz, P.y)) P.z = nz; }
  if (LIFT.on) { LIFT.t += dt; const f = Math.min(1, LIFT.t / LIFT.T), e = f * f * (3 - 2 * f); P.y = LIFT.from + (LIFT.to - LIFT.from) * e; if (f >= 1) { LIFT.on = false; P.y = LIFT.to; } } liftPlat.position.y = (onLift() ? P.y : liftPlat.position.y) - 0.05 + (onLift() ? 0 : 0.05);
  { const a = areaOf(); if (a !== lastArea) { lastArea = a; if (started && AREA_SAY[a]) say(AREA_SAY[a] + " Gravity: " + gravityText() + "."); } }
  // the ring: spinning (spun down during burns, spun up after, over a few minutes); walking round it in its own turning frame
  { const simDt = dt * RATES[rateI][0], tgt = burningNow() ? 0 : W_RING; ringSpin += THREE.MathUtils.clamp(tgt - ringSpin, -0.002 * simDt, 0.002 * simDt); ringAng = (ringAng + ringSpin * simDt) % (2 * Math.PI); ringG.rotation.y = ringAng; }
  ringFadeA = 0; if (ringFade > 0) { ringFade -= dt; ringFadeA = Math.max(0, Math.min(1, ringFade > 0.8 ? (1.6 - ringFade) / 0.8 : ringFade / 0.8)); }
  if (RING.in) { if (mx || my) { const qW = ringG.getWorldQuaternion(new THREE.Quaternion()).invert(), f = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qW), r = V3(1, 0, 0).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qW), T = V3(-Math.sin(RING.phi), 0, Math.cos(RING.phi)), sp = (keys.ShiftLeft || keys.ShiftRight || vrRun ? 6 : 2.5) * dt;
      RING.phi = (RING.phi + (f.dot(T) * -my + r.dot(T) * mx) * sp / RF + 2 * Math.PI) % (2 * Math.PI); RING.y = THREE.MathUtils.clamp(RING.y + (f.y * -my + r.y * mx) * sp, -3.3, 3.3); }
    rig.position.copy(ringG.localToWorld(V3(RF * Math.cos(RING.phi), RING.y, RF * Math.sin(RING.phi)))); rig.quaternion.copy(ringG.getWorldQuaternion(new THREE.Quaternion()).multiply(ringQuat(RING.phi))); rig.rotateY(vr ? vrYaw : 0); }
  else { rig.position.copy(V3(P.x, P.y, P.z).applyQuaternion(ship.quaternion)); rig.quaternion.copy(ship.quaternion); rig.rotateY(vr ? vrYaw : 0); }
  if (!vr) { camera.position.set(0, 1.65, 0); camera.rotation.set(pitch, yaw, 0, "YXZ"); }
  camera.getWorldPosition(headP); skyG.position.copy(headP);
  // travelling: the remaining distance shrinks geometrically, so the destination grows steadily; the ship turns to face it
  // the trip: turn (a fade), burn toward it (it stands overhead), turn round at the midpoint (a fade), burn to slow (it lies below your
  // feet), and park (a fade). The remaining distance shrinks geometrically in real time, so the destination grows steadily; the trip's
  // clock follows the true 1 g motion for that distance, so the time-lapse runs fast early and slows near the end.
  let fadeA = 0, burning = false;
  if (TRAVEL.on) { const T = TRAVEL; let simDt = dt * RATES[rateI][0];
    while (T.on && simDt > 0) { const sg = T.segs[T.k], left = sg[1] - T.c, step = Math.min(left, simDt); T.c += step; simDt -= step;
      if (sg[0] === "burn1") { const s1 = 0.5 * G0 * T.c * T.c / AU_M; SHIP.copy(T.from).addScaledVector(T.dir, s1); T.v = G0 * T.c; burning = true; }
      else if (sg[0] === "burn2") { const vm = G0 * T.t1g / 2, s2 = T.dist / 2 + (vm * T.c - 0.5 * G0 * T.c * T.c) / AU_M; SHIP.copy(T.from).addScaledVector(T.dir, Math.min(T.dist, s2)); T.v = vm - G0 * T.c; burning = true; }
      else { const f = sg[1] > 0 ? T.c / sg[1] : 1, e = f * f * (3 - 2 * f); ship.quaternion.copy(sg[2]).slerp(sg[3], e); T.v = 0; if (sg[1] / RATES[rateI][0] < 5) fadeA = Math.max(fadeA, Math.min(1, Math.min(T.c, sg[1] - T.c) / Math.max(1e-6, RATES[rateI][0] * 0.4))); }
      if (T.c >= sg[1] - 1e-9) { T.k++; T.c = 0; if (T.k === 2) say("Midpoint: the engine is off (you would float), and the ship turns slowly round to burn the other way and slow down."); if (T.k === 3) say("Burning again to slow down: your destination is now beneath your feet. Look down through the floor.");
        if (T.k >= T.segs.length) { T.on = false; SHIP.copy(T.to); drawConsole(); const D = DESTS[T.i], B = BODIES.find(b => D.name.startsWith(b.name)); say(`${T.skipped ? `Skipped ahead ${fmtDays(T.skipped)} of ship time. ` : ""}Arrived and parked: ${D.name}.${B ? " " + B.name[0].toUpperCase() + B.name.slice(1) + ": " + B.info + (B.tag === "speculative" ? " (Speculative: rocky planets need a disk that lasts long enough, and massive stars blow theirs away within about a million years.)" : " (Plausible: invented to fit what such a star could have; real massive stars have been seen with giant planets and brown dwarfs far out.)") : ""} The engine is off: you would float here; you are held to the floor.`); } } }
    // the time-lapse eases off near the end, so the arrival does not flash past
    if (T.on) { const rest = T.segs.slice(T.k).reduce((a, s, n) => a + (n ? s[1] : s[1] - T.c), 0); while (rateI > 0 && rest / RATES[rateI][0] < 6) { rateI--; say(`Approaching: time slows to ${RATES[rateI][1]}.`); } T.rest = rest; } }
  fadeM.opacity = Math.max(fadeA, ringFadeA); engineParts[0].plume.visible = burning; engineParts[0].radM.emissive.setRGB(burning ? 0.35 : 0, burning ? 0.08 : 0, 0);
  // Betelgeuse: pulsing a few per cent in size and about 0.3 magnitude in light; its cells churning
  const pul = Math.sin(2 * Math.PI * days / P_PULSE), Rnow = R_B * (1 + 0.03 * pul), dB = place(star, V3(0, 0, 0), Rnow); starMat.uniforms.t.value = days / 220; starMat.uniforms.bright.value = (1 + 0.12 * pul) * (filterOn ? 1 : 30); SKY_DIM.value = filterOn ? 1 : 0.06;
  { const f = star.position.length(), rho = star.scale.x, alpha = Math.asin(Math.min(0.999, rho / f)), fr = f - rho, h = fr * Math.tan(alpha), u = star.position.clone().divideScalar(f);
    limb.position.copy(u).multiplyScalar(fr); limb.scale.setScalar(2 * h / 0.83); glow.position.copy(u).multiplyScalar(f); glow.scale.setScalar(2 * f * Math.tan(alpha) * (filterOn ? 2.1 : 6)); glow.material.opacity = filterOn ? 1 : 1; glow.material.color.setScalar(filterOn ? 1 : 3);
    bGlare.position.copy(u).multiplyScalar(fr); bGlare.scale.setScalar(f * 0.06); bGlare.material.opacity = THREE.MathUtils.clamp(1 - alpha / 0.012, 0, 1); }
  setLabel(starLabel, "Betelgeuse", `red supergiant · ${fmtD(dB)} away · ${(2 * Math.asin(Math.min(1, R_B / dB)) * 180 / Math.PI).toFixed(dB > 100 ? 2 : 1)}° across`, V3(0, 0, 0));
  // the companion, and the dust clumps lit from Betelgeuse
  const cpos = compPos(days), cd = place(comp, cpos); place(compBall, cpos, R_COMP); comp.scale.setScalar(Math.max(comp.position.length() * 0.035, compBall.scale.x * 7)); setLabel(compLabel, "Siwarha (companion, probable)", `about 1 Sun's mass · ${fmtD(cd)} away`, cpos);
  for (const D of DUST) { const d = place(D.s, D.off, D.size), toShip = SHIP.clone().sub(D.off).normalize(), cosT = D.off.clone().normalize().dot(toShip), g = 0.55, hg = (1 - g * g) / Math.pow(1 + g * g - 2 * g * cosT, 1.5);
    D.s.material.opacity = Math.min(0.5, 0.05 * hg * (R_B * 8 / D.off.length()) ** 2) * THREE.MathUtils.smoothstep(d, 0.3, 3); }
  // the planets, moons and brown dwarf: lit by Betelgeuse (brightness compressed, as by eyes adapting), a point of light when far
  for (const B of BODIES) { const P = B.pos(), d = place(B.mesh, P, B.R), fluxS = L_B / P.lengthSq(), ang = B.R / d; B.u.L.value.copy(P).negate().normalize(); B.u.I.value = 0.35 * Math.pow(fluxS, 0.3);
    B.dot.position.copy(B.mesh.position); B.dot.scale.setScalar(B.mesh.position.length() * 0.004); const lit = Math.min(1, (0.6 * Math.pow(fluxS, 0.3) * 0.3 + B.glowI) * 1.5); B.dot.material.color.setRGB(lit, lit * 0.8, lit * 0.6); B.dot.material.opacity = THREE.MathUtils.clamp(1 - ang / 0.002, 0, 1); B.mesh.visible = ang > 2e-4;
    setLabel(B.label, B.name, `${B.tag} · ${fmtD(d)} away`, P); }
  // the comet: coma and two tails, each a chain of soft glows placed along its length
  { const c = CN(), td = tailDir(), side = new THREE.Vector3().crossVectors(td, PN).normalize(), dc = place(COMA, c, 0.0016); COMA.material.opacity = 0.9; setLabel(cometLabel, "a comet", `plausible · ${fmtD(dc)} away`, c);
    for (const T of TAILS) { const f = T.f, pt = c.clone().add(td.clone().multiplyScalar(T.len * Math.pow(f, 1.2))); if (T.kind === "dust") pt.add(side.clone().multiplyScalar(T.len * 0.18 * f * f)); place(T.sp, pt, 0.004 + (T.kind === "dust" ? 0.09 : 0.035) * f); T.sp.material.opacity = (T.kind === "dust" ? 0.16 : 0.12) * (1 - f) ** 1.3; } }
  // the darkening patch on the sphere's glass, over Betelgeuse
  // (it tracks your eye, as such glass would have to: the darkened spot is where your line of sight to the star crosses the glass)
  { const dL = SHIP.clone().negate().normalize().applyQuaternion(ship.quaternion.clone().invert()), eye = ship.worldToLocal(headP.clone()), oc = eye.clone().sub(BUB), b = oc.dot(dL), cc = oc.lengthSq() - (BUB_R - 0.05) ** 2, tHit = -b + Math.sqrt(Math.max(0, b * b - cc));
    const hit = eye.clone().add(dL.clone().multiplyScalar(tHit)), aB = Math.asin(Math.min(1, R_B / SHIP.length())), rP = Math.min(9, tHit * Math.tan(Math.min(1.25, aB * 1.2 + 0.004)));
    for (const m of [patch, patchRim]) { m.position.copy(hit).add(dL.clone().multiplyScalar(m === patchRim ? -0.01 : 0)); m.scale.setScalar(rP); m.lookAt(headP); m.visible = filterOn; } }
  // the light on the cupola comes from Betelgeuse's direction, dimmer far away
  starLight.position.copy(SHIP).negate().normalize().multiplyScalar(100).applyQuaternion(new THREE.Quaternion()); starLight.intensity = 3.2 * THREE.MathUtils.clamp(Math.pow(L_B / SHIP.lengthSq() / 140, 0.25), 0.1, 3) * (areaOf() === "sphere" ? 1 : 0.06);
  HUD.visible = hudOn && areaOf() === "sphere";
  if (frameN % 10 === 0) { drawPanel(); drawStatus(); if (frameN % 30 === 0) drawConsole(); } msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") MSG.style.display = "none";
  renderer.render(scene, camera); });
