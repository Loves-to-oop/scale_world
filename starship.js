// starship.js -- an antimatter starship that can fly to any listed star at a constant 1 g. Built into starship.html by build.py.
//
// The ship accelerates at a constant proper acceleration of 1 g (9.80665 m/s^2) to the midpoint, turns over, and decelerates at 1 g
// to arrive at rest. For constant proper acceleration a, with proper (ship) time tau measured from the start of a leg:
//   coordinate time  t = (c/a) sinh(a tau / c)          distance  x = (c^2/a) (cosh(a tau / c) - 1)
//   map velocity     v = c tanh(a tau / c)              proper velocity  w = gamma v = c sinh(a tau / c)    gamma = cosh(a tau / c)
// all from the metric, c^2 dtau^2 = c^2 dt^2 - dx^2. Both clocks start at the real date and time when the page is opened.
// Outside, the sky is drawn as the ship sees it: relativistic aberration crowds the stars forward and the Doppler effect shifts their
// colour and brightness (blue and bright ahead, red and faint behind); at extreme speed the cosmic microwave background glows ahead.

const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 90000);
const rig = new THREE.Group(); rig.add(camera); camera.position.y = 1.6; scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.2, ...o });
const clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp;
const seeded = n => { let s = (Math.imul(n | 0, 2654435761) ^ 40503) >>> 0 || 1; return () => (s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296; };
const strSeed = s => { let h = 7; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const tex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// ---------- constants ----------
const C = 299792458, G0 = 9.80665, YEAR = 365.25 * 86400, LY = C * YEAR, AU = 1.495978707e11, RE = 6.371e6, RJ = 6.9911e7, RSUN = 6.9634e8, PC_LY = 3.26156;
const DEG = Math.PI / 180;

// ---------- the relativity of a 1 g trip (accelerate to the midpoint, turn over, decelerate) ----------
// a trip of map distance D (m) at proper acceleration a: each half is a constant-acceleration leg of length D/2
function tripPlan(D, a = G0) { const tauH = (C / a) * Math.acosh(1 + a * (D / 2) / (C * C)), tH = (C / a) * Math.sinh(a * tauH / C);
  return { D, a, tauH, tH, tau: 2 * tauH, t: 2 * tH, gammaMax: Math.cosh(a * tauH / C), vMax: C * Math.tanh(a * tauH / C), wMax: C * Math.sinh(a * tauH / C), phiMax: a * tauH / C }; }
// the state at proper time tau into the trip: distance covered x, coordinate time t, map velocity v, proper velocity w, gamma, phase
function tripState(P, tau) { tau = clampN(tau, 0, P.tau); const a = P.a, leg = tau <= P.tauH, s = leg ? tau : P.tau - tau, phi = a * s / C;
  const x1 = (C * C / a) * (Math.cosh(phi) - 1), t1 = (C / a) * Math.sinh(phi);
  return { tau, x: leg ? x1 : P.D - x1, t: leg ? t1 : P.t - t1, v: C * Math.tanh(phi), w: C * Math.sinh(phi), gamma: Math.cosh(phi), phi, accel: leg, phase: tau >= P.tau ? "arrived" : leg ? "accelerating" : "decelerating" }; }

// ---------- the stars: real positions (J2000 right ascension, declination, distance in light years) ----------
// [name, RA h, RA m, Dec deg (signed, minutes folded in), distance ly, spectral class, apparent V magnitude, mass (suns), note]
const STARS_RAW = [
  ["Sol (the Sun)", 0, 0, 0, 0, "G2V", -26.7, 1.0, "Our own star."],
  ["Proxima Centauri", 14, 29.7, -62.68, 4.246, "M5.5V", 11.1, 0.12, "The nearest star to the Sun, a red dwarf in the Alpha Centauri system; two known planets."],
  ["Alpha Centauri A & B", 14, 39.6, -60.83, 4.37, "G2V", -0.27, 1.1, "A pair of Sun-like stars orbiting each other every 80 years; no confirmed planets yet."],
  ["Barnard's Star", 17, 57.8, 4.69, 5.96, "M4V", 9.5, 0.16, "A old red dwarf, the fastest-moving star in our sky; four small planets found in 2024-25."],
  ["Wolf 359", 10, 56.5, 7.02, 7.86, "M6V", 13.5, 0.11, "A faint flare star."],
  ["Lalande 21185", 11, 3.3, 35.97, 8.31, "M2V", 7.5, 0.39, "A red dwarf with two known planets."],
  ["Sirius", 6, 45.1, -16.72, 8.6, "A1V", -1.46, 2.06, "The brightest star in our sky, with a white-dwarf companion, Sirius B."],
  ["Luyten 726-8", 1, 39.0, -17.95, 8.73, "M5.5V", 12.5, 0.10, "A pair of red dwarf flare stars (UV Ceti)."],
  ["Ross 154", 18, 49.8, -23.84, 9.7, "M3.5V", 10.4, 0.17, "A red dwarf flare star in Sagittarius."],
  ["Ross 248", 23, 41.9, 44.17, 10.3, "M6V", 12.3, 0.14, "A red dwarf; in about 36,000 years it will be the nearest star to the Sun."],
  ["Epsilon Eridani", 3, 32.9, -9.46, 10.5, "K2V", 3.73, 0.82, "A young orange star with a giant planet and dusty rings."],
  ["Lacaille 9352", 23, 5.9, -35.85, 10.7, "M0.5V", 7.3, 0.48, "A red dwarf with two super-Earths."],
  ["Ross 128", 11, 47.7, 0.80, 11.0, "M4V", 11.1, 0.17, "A quiet red dwarf with a temperate Earth-mass planet."],
  ["61 Cygni", 21, 6.9, 38.75, 11.4, "K5V", 5.2, 0.7, "The first star to have its distance measured (Bessel, 1838)."],
  ["Procyon", 7, 39.3, 5.22, 11.5, "F5IV", 0.34, 1.5, "A bright white star with a white-dwarf companion."],
  ["Epsilon Indi", 22, 3.4, -56.78, 11.9, "K5V", 4.7, 0.76, "An orange star with a cold giant planet photographed by JWST and two brown dwarfs."],
  ["Tau Ceti", 1, 44.1, -15.94, 11.9, "G8V", 3.5, 0.78, "A Sun-like star with four candidate planets."],
  ["Gliese 1061", 3, 36.0, -44.52, 12.0, "M5.5V", 13.0, 0.12, "A red dwarf with three planets."],
  ["Luyten's Star", 7, 27.4, 5.23, 12.2, "M3.5V", 9.9, 0.29, "A red dwarf with a super-Earth in its habitable zone."],
  ["Teegarden's Star", 2, 53.0, 16.88, 12.5, "M7V", 15.1, 0.097, "A tiny red dwarf with three Earth-mass planets."],
  ["Kapteyn's Star", 5, 11.7, -45.02, 12.8, "M1V", 8.9, 0.27, "An ancient halo star, orbiting the galaxy backwards."],
  ["Wolf 1061", 16, 30.3, -12.67, 14.0, "M3V", 10.1, 0.29, "A red dwarf with three planets."],
  ["Altair", 19, 50.8, 8.87, 16.7, "A7V", 0.77, 1.8, "A rapidly spinning white star, flattened by its spin."],
  ["Gliese 876", 22, 53.3, -14.27, 15.2, "M4V", 10.2, 0.37, "A red dwarf with two giant planets in resonance."],
  ["Gliese 581", 15, 19.4, -7.72, 20.5, "M3V", 10.6, 0.31, "A red dwarf with three planets."],
  ["Gliese 667 C", 17, 19.0, -34.99, 23.6, "M1.5V", 10.2, 0.33, "A red dwarf in a triple-star system, with super-Earths."],
  ["Vega", 18, 36.9, 38.78, 25.0, "A0V", 0.03, 2.1, "A bright white star ringed by dust; once the pole star, and will be again."],
  ["Fomalhaut", 22, 57.7, -29.62, 25.1, "A3V", 1.16, 1.9, "A white star with a great dust ring."],
  ["Pollux", 7, 45.3, 28.03, 33.8, "K0III", 1.14, 2.0, "An orange giant with a giant planet."],
  ["Arcturus", 14, 15.7, 19.18, 36.7, "K1.5III", -0.05, 1.1, "An orange giant, the brightest star in the northern sky."],
  ["TRAPPIST-1", 23, 6.5, -5.04, 40.7, "M8V", 18.8, 0.089, "An ultracool dwarf with seven Earth-sized planets, three in its habitable zone."],
  ["55 Cancri", 8, 52.6, 28.33, 41.0, "K0IV", 5.95, 0.95, "A star with five planets, including the lava world 55 Cancri e."],
  ["Upsilon Andromedae", 1, 36.8, 41.41, 44.0, "F8V", 4.1, 1.3, "The first star found with several planets (1999)."],
  ["LHS 1140", 0, 45.0, -15.27, 48.8, "M4.5V", 14.2, 0.18, "A red dwarf with a temperate super-Earth, perhaps an ocean world."],
  ["51 Pegasi", 22, 57.5, 20.77, 50.6, "G2IV", 5.5, 1.1, "Where the first planet around a Sun-like star was found (1995)."],
  ["Beta Pictoris", 5, 47.3, -51.07, 63.4, "A6V", 3.86, 1.75, "A young star with a huge dusty disc and two giant planets."],
  ["Aldebaran", 4, 35.9, 16.51, 65.0, "K5III", 0.85, 1.2, "The orange giant eye of Taurus."],
  ["K2-18", 11, 30.2, 7.59, 124, "M2.5V", 13.5, 0.36, "A red dwarf with a temperate sub-Neptune studied by JWST."],
  ["HR 8799", 23, 7.5, 21.13, 133, "A5V", 5.96, 1.5, "Four giant planets photographed directly."],
  ["HD 209458", 22, 3.2, 18.88, 159, "G0V", 7.65, 1.1, "The first planet seen crossing its star (1999): a hot Jupiter."],
  ["Kepler-16", 19, 16.3, 51.76, 245, "K7V", 12.0, 0.69, "A planet orbiting two suns, like Tatooine."],
  ["Canopus", 6, 24.0, -52.7, 310, "A9II", -0.74, 8.0, "The second-brightest star in our sky, a bright giant."],
  ["Polaris", 2, 31.8, 89.26, 433, "F7Ib", 1.98, 5.4, "The North Star, a yellow supergiant."],
  ["Betelgeuse", 5, 55.2, 7.41, 550, "M1Ia", 0.42, 16, "A red supergiant that will one day explode as a supernova."],
  ["Antares", 16, 29.4, -26.43, 550, "M1Ib", 1.06, 12, "The red supergiant heart of Scorpius."],
  ["Kepler-186", 19, 54.6, 43.95, 579, "M1V", 15.3, 0.54, "Kepler-186f was the first Earth-sized planet found in a habitable zone."],
  ["Kepler-22", 19, 16.9, 47.88, 640, "G5V", 11.7, 0.97, "Kepler-22b, a super-Earth in the habitable zone."],
  ["Rigel", 5, 14.5, -8.2, 860, "B8Ia", 0.13, 21, "A blue supergiant, Orion's foot."],
  ["Kepler-452", 19, 44.0, 44.28, 1800, "G2V", 13.4, 1.04, "Kepler-452b, an 'Earth cousin' circling a Sun-like star in a year of 385 days."],
  ["Deneb", 20, 41.4, 45.28, 2600, "A2Ia", 1.25, 19, "A white supergiant, one of the most luminous stars known."],
  ["Sagittarius A* (the galactic centre)", 17, 45.7, -29.01, 26670, "BH", 99, 4.3e6, "The supermassive black hole at the centre of the Milky Way, four million times the Sun's mass."]];
const TEMP = { O: 35000, B: 15000, A: 9000, F: 6700, G: 5700, K: 4500, M: 3300 };
const STARS = STARS_RAW.map(([name, rh, rm, dec, d, sp, V, mass, note], i) => { const ra = (rh + rm / 60) * 15 * DEG, de = dec * DEG, p = [d * Math.cos(de) * Math.cos(ra), d * Math.cos(de) * Math.sin(ra), d * Math.sin(de)];
  const cls = sp[0], giant = /I/.test(sp.slice(2)) && !/V/.test(sp.slice(2)), temp = sp === "BH" ? 0 : TEMP[cls] || 5000, absMag = d > 0 ? V - 5 * Math.log10(d / PC_LY) + 5 : 4.83;
  const radius = sp === "BH" ? 1.27e10 : giant ? (/Ia|Ib/.test(sp) ? (cls === "M" ? 800 : cls === "B" ? 75 : 100) : cls === "K" ? 22 : 8) * RSUN : { O: 10, B: 4, A: 1.8, F: 1.3, G: 1.0, K: 0.75, M: Math.max(0.12, mass * 1.0) }[cls] * RSUN;
  return { i, name, p, d, sp, V, absMag, mass, temp, radius, note, giant, bh: sp === "BH" }; });

// ---------- known planets: [name, period (days) or orbit (AU, given as negative), radius (Earth radii), kind] ----------
// kinds: rock, lava, hot (hot Jupiter), gas (giant), ice (ice giant / sub-Neptune), ocean, temperate (possibly habitable), earth, venus, mars
const KNOWN = {
  "Sol (the Sun)": [["Mercury", 87.97, 0.383, "rock"], ["Venus", 224.7, 0.949, "venus"], ["Earth", 365.256, 1.0, "earth"], ["Mars", 686.98, 0.532, "mars"], ["Jupiter", 4332.6, 11.21, "gas"], ["Saturn", 10759, 9.45, "saturn"], ["Uranus", 30687, 4.01, "ice"], ["Neptune", 60190, 3.88, "nep"]],
  "Proxima Centauri": [["Proxima d", 5.12, 0.8, "rock"], ["Proxima b", 11.19, 1.07, "temperate"]],
  "Barnard's Star": [["Barnard d", 2.34, 0.7, "rock"], ["Barnard b", 3.15, 0.75, "rock"], ["Barnard c", 4.12, 0.8, "rock"], ["Barnard e", 6.74, 0.65, "rock"]],
  "Lalande 21185": [["Lalande 21185 b", 12.95, 1.3, "rock"], ["Lalande 21185 c", 2900, 3.5, "ice"]],
  "Epsilon Eridani": [["Epsilon Eridani b", 2690, 11, "gas"]],
  "Lacaille 9352": [["Lacaille 9352 b", 9.26, 1.6, "rock"], ["Lacaille 9352 c", 21.8, 1.9, "temperate"]],
  "Ross 128": [["Ross 128 b", 9.87, 1.1, "temperate"]],
  "Epsilon Indi": [["Epsilon Indi Ab", -28, 12, "gas"]],
  "Tau Ceti": [["Tau Ceti g", 20.0, 1.2, "rock"], ["Tau Ceti h", 49.4, 1.2, "rock"], ["Tau Ceti e", 162.9, 1.6, "temperate"], ["Tau Ceti f", 636, 1.6, "ice"]],
  "Gliese 1061": [["Gliese 1061 b", 3.2, 1.1, "rock"], ["Gliese 1061 c", 6.7, 1.2, "rock"], ["Gliese 1061 d", 13.0, 1.1, "temperate"]],
  "Luyten's Star": [["Luyten c", 4.72, 1.2, "rock"], ["Luyten b", 18.65, 1.4, "temperate"]],
  "Teegarden's Star": [["Teegarden b", 4.91, 1.0, "temperate"], ["Teegarden c", 11.4, 1.0, "temperate"], ["Teegarden d", 26.1, 0.9, "ice"]],
  "Wolf 1061": [["Wolf 1061 b", 4.89, 1.2, "rock"], ["Wolf 1061 c", 17.9, 1.6, "temperate"], ["Wolf 1061 d", 217, 2.6, "ice"]],
  "Gliese 876": [["Gliese 876 d", 1.94, 1.7, "lava"], ["Gliese 876 c", 30.1, 11, "gas"], ["Gliese 876 b", 61.1, 12, "gas"], ["Gliese 876 e", 124, 3.4, "ice"]],
  "Gliese 581": [["Gliese 581 e", 3.15, 1.1, "rock"], ["Gliese 581 b", 5.37, 3.7, "ice"], ["Gliese 581 c", 12.9, 1.6, "rock"]],
  "Gliese 667 C": [["Gliese 667 Cb", 7.2, 1.6, "rock"], ["Gliese 667 Cc", 28.1, 1.5, "temperate"]],
  "Pollux": [["Pollux b", 590, 12, "gas"]],
  "TRAPPIST-1": [["TRAPPIST-1 b", 1.51, 1.12, "lava"], ["TRAPPIST-1 c", 2.42, 1.10, "venus"], ["TRAPPIST-1 d", 4.05, 0.79, "rock"], ["TRAPPIST-1 e", 6.10, 0.92, "temperate"], ["TRAPPIST-1 f", 9.21, 1.05, "ocean"], ["TRAPPIST-1 g", 12.35, 1.13, "ice"], ["TRAPPIST-1 h", 18.77, 0.76, "ice"]],
  "55 Cancri": [["55 Cancri e", 0.737, 1.9, "lava"], ["55 Cancri b", 14.65, 11, "hot"], ["55 Cancri c", 44.4, 7, "gas"], ["55 Cancri f", 260, 7, "gas"], ["55 Cancri d", 4800, 12, "gas"]],
  "Upsilon Andromedae": [["Upsilon Andromedae b", 4.6, 13, "hot"], ["Upsilon Andromedae c", 241, 12, "gas"], ["Upsilon Andromedae d", 1276, 12, "gas"]],
  "LHS 1140": [["LHS 1140 c", 3.78, 1.3, "rock"], ["LHS 1140 b", 24.7, 1.7, "ocean"]],
  "51 Pegasi": [["51 Pegasi b", 4.23, 14, "hot"]],
  "Beta Pictoris": [["Beta Pictoris c", -2.7, 12, "gas"], ["Beta Pictoris b", -9.9, 13, "gas"]],
  "K2-18": [["K2-18 b", 32.9, 2.6, "ocean"]],
  "HR 8799": [["HR 8799 e", -16, 13, "gas"], ["HR 8799 d", -27, 13, "gas"], ["HR 8799 c", -43, 13, "gas"], ["HR 8799 b", -68, 12, "gas"]],
  "HD 209458": [["HD 209458 b", 3.52, 15, "hot"]],
  "Kepler-16": [["Kepler-16 b", 228.8, 8.4, "saturn"]],
  "Kepler-186": [["Kepler-186 b", 3.89, 1.07, "lava"], ["Kepler-186 c", 7.27, 1.25, "rock"], ["Kepler-186 d", 13.3, 1.4, "rock"], ["Kepler-186 e", 22.4, 1.27, "rock"], ["Kepler-186 f", 129.9, 1.17, "temperate"]],
  "Kepler-22": [["Kepler-22 b", 289.9, 2.1, "ocean"]],
  "Kepler-452": [["Kepler-452 b", 384.8, 1.6, "temperate"]] };
// the planets of a star: known ones, or generated from its name (the same every visit)
function planetsOf(S) { const known = KNOWN[S.name], R = seeded(strSeed(S.name)), list = [];
  if (known) for (const [name, per, rad, kind] of known) { const aAU = per < 0 ? -per : Math.cbrt(S.mass * (per / 365.25) ** 2); list.push({ name, aAU, period: per < 0 ? 365.25 * Math.sqrt(aAU ** 3 / S.mass) : per, radius: rad * RE, kind, known: true }); }
  else if (!S.bh) { const lum = Math.pow(10, (4.83 - S.absMag) / 2.5), snow = 2.7 * Math.sqrt(lum), hz = Math.sqrt(lum), n = S.giant ? (R() < 0.5 ? 0 : 1 + (R() * 3 | 0)) : 2 + (R() * 7 | 0); let a = Math.max(0.02, 0.15 * Math.sqrt(lum)) * (0.6 + R() * 0.8);
    for (let k = 0; k < n; k++) { if (S.giant && a < 1.5 * Math.sqrt(lum) * 0.5) a = 1.5 * Math.sqrt(lum) * (0.5 + R()); const inner = a < snow, nearHZ = Math.abs(Math.log(a / hz)) < 0.25;
      const kind = inner ? (a < 0.4 * hz ? (R() < 0.4 ? "lava" : "rock") : nearHZ ? (R() < 0.45 ? "temperate" : R() < 0.5 ? "ocean" : "rock") : R() < 0.5 ? "mars" : "venus") : (R() < 0.55 ? "gas" : R() < 0.3 ? "saturn" : "ice");
      const radius = (kind === "gas" || kind === "saturn" ? 8 + R() * 6 : kind === "ice" ? 3 + R() * 2 : 0.5 + R() * 1.2) * RE;
      list.push({ name: `${S.name.split(" (")[0]} ${String.fromCharCode(98 + k)}`, aAU: a, period: 365.25 * Math.sqrt(a ** 3 / S.mass), radius, kind, known: false }); a *= 1.4 + R() * 0.9; } }
  const R2 = seeded(strSeed(S.name) + 5); list.forEach(p => { p.ph = R2() * Math.PI * 2; p.ring = p.kind === "saturn" || (p.kind === "ice" && R2() < 0.3); });
  return list; }

// ---------- the sky as the ship sees it ----------
// Every star is a direction in the equatorial frame. Each frame the graphics card applies relativistic aberration (cos th' =
// (cos th + beta)/(1 + beta cos th)) and the Doppler factor D = 1/(gamma (1 - beta cos th')): the observed colour temperature is D T and
// the brightness rises roughly as D^3 ahead and falls behind. Then the direction is turned into the ship's frame (its bow is +y).
const SKY_R = 60000, R_EQ2SHIP = new THREE.Matrix3(), R_SHIP2EQ = new THREE.Matrix3();
const skyUniforms = { uR: { value: R_EQ2SHIP }, uV: { value: V3(1, 0, 0) }, uBeta: { value: 0 }, uEps: { value: 1 }, uGamma: { value: 1 }, uPix: { value: renderer.getPixelRatio() } };
const BB_GLSL = `vec3 bb(float T){ T = clamp(T, 1000.0, 40000.0) / 100.0; float r = T <= 66.0 ? 1.0 : clamp(1.29293618606 * pow(T - 60.0, -0.1332047592), 0.0, 1.0);
  float g = T <= 66.0 ? clamp(0.390081578769 * log(T) - 0.631841443788, 0.0, 1.0) : clamp(1.12989086089 * pow(T - 60.0, -0.0755148492), 0.0, 1.0);
  float b = T >= 66.0 ? 1.0 : (T <= 19.0 ? 0.0 : clamp(0.543206789110 * log(T - 10.0) - 1.19625408914, 0.0, 1.0)); return vec3(r, g, b); }`;
const starMat = new THREE.ShaderMaterial({ uniforms: skyUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform mat3 uR; uniform vec3 uV; uniform float uBeta, uEps, uGamma, uPix; attribute vec3 aDir; attribute float aMag, aTemp; varying vec3 vCol; varying float vA; ${BB_GLSL}
    void main(){ float c = dot(aDir, uV); vec3 pr = aDir - uV * c; float pl = length(pr); vec3 pn = pl > 1e-6 ? pr / pl : vec3(0.0);
      float omc = 1.0 - c, omc2 = omc * uEps / (1.0 + uBeta * c), c2 = 1.0 - omc2; float s2 = sqrt(max(0.0, omc2 * (2.0 - omc2))); vec3 d2 = uV * c2 + pn * s2;
      float D = 1.0 / (uGamma * (omc2 + uEps * c2)), T = aTemp * D;   // written to keep precision when beta is within a hair of 1
      float vis = smoothstep(700.0, 2600.0, T) / (1.0 + pow(T / 45000.0, 1.5));
      float b = pow(10.0, -0.4 * (aMag + 1.0)) * clamp(pow(D, 3.0), 0.0, 2e4) * vis;
      vCol = bb(T); vA = clamp(b * 40.0, 0.0, 1.0); gl_PointSize = clamp(1.0 + 1.25 * log(1.0 + b * 250.0), 1.0, 7.0) * uPix;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(uR * d2 * ${SKY_R.toFixed(1)}, 1.0); if (vA < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); }`,
  fragmentShader: `varying vec3 vCol; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q, q); if (r > 0.25) discard; gl_FragColor = vec4(vCol * (1.0 - r * 3.0), vA); }` });
// the background: some 9,000 stars to naked-eye brightness, crowded along the Milky Way (galactic coordinates turned to equatorial)
const GAL2EQ = [[-0.0548755604, 0.4941094279, -0.8676661490], [-0.8734370902, -0.4448296300, -0.1980763734], [-0.4838350155, 0.7469822445, 0.4559837762]];
const g2e = (l, b) => { const g = [Math.cos(b) * Math.cos(l), Math.cos(b) * Math.sin(l), Math.sin(b)]; return GAL2EQ.map(r => r[0] * g[0] + r[1] * g[1] + r[2] * g[2]); };
const NBG = IS_HEADSET ? 7000 : 12000, bgDir = new Float32Array(NBG * 3), bgMag = new Float32Array(NBG), bgTemp = new Float32Array(NBG);
{ const R = seeded(1977), temps = [[3400, 0.3], [4400, 0.25], [5700, 0.14], [6800, 0.12], [9200, 0.13], [16000, 0.06]];
  for (let k = 0; k < NBG; k++) { let d; if (R() < 0.42) { const u = R() * 2 - 1, th = R() * 6.2832; d = [Math.sqrt(1 - u * u) * Math.cos(th), Math.sqrt(1 - u * u) * Math.sin(th), u]; }
      else { const l = (R() < 0.35 ? (R() - 0.5) * 1.2 : R() * 6.2832), gb = (R() + R() + R() - 1.5) * 0.16 * (R() < 0.5 ? 1 : 0.4); d = g2e(l, gb); }
    bgDir.set(d, k * 3); bgMag[k] = 6.8 - 7.2 * Math.pow(R(), 4.2); let r = R(), T = 5000; for (const [t, w] of temps) { if (r < w) { T = t * (0.85 + R() * 0.3); break; } r -= w; } bgTemp[k] = T; } }
// the Milky Way's glow: many faint unresolved points along the band
const NMW = IS_HEADSET ? 9000 : 22000, mwDir = new Float32Array(NMW * 3), mwMag = new Float32Array(NMW), mwTemp = new Float32Array(NMW);
{ const R = seeded(2026); for (let k = 0; k < NMW; k++) { const l = R() < 0.4 ? (R() + R() - 1) * 1.3 : R() * 6.2832, gb = (R() + R() + R() + R() - 2) * 0.09 * (1 + 0.8 * Math.cos(l)), d = g2e(l, gb); mwDir.set(d, k * 3); mwMag[k] = 6.6 + R() * 1.2 - 0.9 * Math.max(0, Math.cos(l)); mwTemp[k] = 4500 + R() * 2500; } }
const mkStars = (dir, mag, temp) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(dir.length), 3)); g.setAttribute("aDir", new THREE.BufferAttribute(dir, 3)); g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1)); g.setAttribute("aTemp", new THREE.BufferAttribute(temp, 1));
  g.boundingSphere = new THREE.Sphere(V3(0, 0, 0), 1e9); const p = new THREE.Points(g, starMat); p.frustumCulled = false; p.renderOrder = -5; scene.add(p); return p; };
mkStars(bgDir, bgMag, bgTemp); mkStars(mwDir, mwMag, mwTemp);
// the named stars: directions and brightness recomputed from where the ship is (parallax and distance), each frame
const NS = STARS.length, nsDir = new Float32Array(NS * 3), nsMag = new Float32Array(NS), nsTemp = new Float32Array(NS); STARS.forEach((S, i) => nsTemp[i] = S.temp || 1000);
const NAMED = mkStars(nsDir, nsMag, nsTemp);
function updateNamedStars(pos, hideI) { for (let i = 0; i < NS; i++) { const S = STARS[i], dx = S.p[0] - pos[0], dy = S.p[1] - pos[1], dz = S.p[2] - pos[2], d = Math.hypot(dx, dy, dz);
    if (d < 1e-9 || i === hideI || S.bh) { nsMag[i] = 99; continue; } nsDir[i * 3] = dx / d; nsDir[i * 3 + 1] = dy / d; nsDir[i * 3 + 2] = dz / d; nsMag[i] = S.absMag + 5 * Math.log10(Math.max(d, 1e-6) / PC_LY) - 5; }
  NAMED.geometry.attributes.aDir.needsUpdate = true; NAMED.geometry.attributes.aMag.needsUpdate = true; }
// the cosmic microwave background: invisible at rest (2.7 K), but ahead of a ship with gamma in the thousands it is Doppler-shifted
// into the visible and glows; also a faint deep-space tint
const cmb = new THREE.Mesh(new THREE.SphereGeometry(SKY_R * 1.2, 48, 24), new THREE.ShaderMaterial({ uniforms: { ...skyUniforms, uRi: { value: R_SHIP2EQ } }, side: THREE.BackSide, depthWrite: false,
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform mat3 uRi; uniform vec3 uV; uniform float uBeta, uEps, uGamma; varying vec3 vD; ${BB_GLSL}
    void main(){ vec3 e = normalize(uRi * vD); float c = dot(e, uV); float D = 1.0 / (uGamma * ((1.0 - c) + uEps * c)); float T = 2.725 * D;
      float glow = smoothstep(500.0, 1600.0, T) * min(1.0, pow(T / 1600.0, 2.0)); gl_FragColor = vec4(bb(T) * glow + vec3(0.002, 0.003, 0.006), 1.0); }` }));
cmb.renderOrder = -10; cmb.frustumCulled = false; scene.add(cmb);
const FWD = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.08, "rgba(220,235,255,0.9)"); gr.addColorStop(0.3, "rgba(160,190,255,0.25)"); gr.addColorStop(1, "rgba(120,150,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
FWD.renderOrder = -4; scene.add(FWD);
// the ship's attitude: the bow (+y) along a direction in the equatorial frame
function setAttitude(bow) { const b = V3(...bow).normalize(), ref = Math.abs(b.z) > 0.95 ? V3(1, 0, 0) : V3(0, 0, 1), u = V3().crossVectors(b, ref).normalize(), w = V3().crossVectors(u, b);
  R_EQ2SHIP.set(u.x, u.y, u.z, b.x, b.y, b.z, w.x, w.y, w.z); R_SHIP2EQ.copy(R_EQ2SHIP).transpose(); }
const eq2ship = v => V3(...v).applyMatrix3(R_EQ2SHIP);

// ---------- the star system around the ship ----------
// Bodies are drawn at their true angular size and direction from the ship (placed at a fixed distance, scaled to match), lit by their
// star. Orbits are circular; in our own system the planets are placed where they are on today's date (mean longitudes at J2000).
const J2000 = Date.UTC(2000, 0, 1, 12), OBL = 23.439 * DEG;
const SOL_L0 = { Mercury: 252.25, Venus: 181.98, Earth: 100.46, Mars: 355.43, Jupiter: 34.35, Saturn: 50.08, Uranus: 314.06, Neptune: 304.35 };
const loadTex = src => { const t = new THREE.TextureLoader().load(src); t.colorSpace = THREE.SRGBColorSpace; return t; };
const EARTH_T = loadTex(EARTH_JPG), MOON_T = loadTex(MOON_JPG), TEX_CACHE = {};
function planetTex(kind, seed) { const key = kind + seed; if (TEX_CACHE[key]) return TEX_CACHE[key]; const R = seeded(seed);
  const t = tex(512, 256, (g, w, h) => { const band = (cols, n, wob) => { for (let y = 0; y < h; y++) { const f = y / h, k = Math.floor((f + 0.03 * Math.sin(f * 40 + seed)) * n) % cols.length; g.fillStyle = cols[k]; g.fillRect(0, y, w, 1); } for (let i = 0; i < wob; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.35; g.beginPath(); g.ellipse(R() * w, R() * h, 10 + R() * 40, 2 + R() * 5, 0, 0, 6.28); g.fill(); } g.globalAlpha = 1; };
    const blobs = (base, cols, n, rmin, rmax) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = cols[(R() * cols.length) | 0]; g.globalAlpha = 0.5 + R() * 0.5; g.beginPath(); g.arc(R() * w, h * 0.12 + R() * h * 0.76, rmin + R() * (rmax - rmin), 0, 6.28); g.fill(); } g.globalAlpha = 1; };
    const clouds = a => { g.fillStyle = "#ffffff"; for (let i = 0; i < 260; i++) { g.globalAlpha = a * R(); g.beginPath(); g.ellipse(R() * w, R() * h, 8 + R() * 30, 2 + R() * 6, R() * 0.4, 0, 6.28); g.fill(); } g.globalAlpha = 1; };
    if (kind === "rock") { blobs("#7a746c", ["#5a554e", "#9a948a", "#6a645c"], 500, 2, 12); }
    else if (kind === "lava") { blobs("#1c1614", ["#2a201c", "#3a2a24"], 200, 4, 20); g.strokeStyle = "#ff6a20"; g.lineWidth = 2; for (let i = 0; i < 90; i++) { g.beginPath(); let x = R() * w, y = R() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += (R() - 0.5) * 20; g.lineTo(x, y); } g.stroke(); } }
    else if (kind === "hot") band(["#4a1c12", "#7a3018", "#a8501e", "#5a2414", "#c8702a"], 13, 40);
    else if (kind === "gas") band(["#c8a878", "#a8825a", "#e0cca8", "#8a6a48", "#d8b890", "#b89068"], 15, 60);
    else if (kind === "saturn") band(["#e0cc9a", "#d0b880", "#ead8b0", "#c8ac78"], 18, 20);
    else if (kind === "ice") band(["#9ad0d8", "#8ac4cc", "#a8dce0", "#80b8c4"], 9, 10);
    else if (kind === "nep") band(["#3a5ab8", "#2a4aa0", "#4a6ac8", "#2a3a90"], 11, 14);
    else if (kind === "venus") { band(["#e0cc98", "#d8c088", "#e8d8a8"], 7, 30); clouds(0.25); }
    else if (kind === "mars") { blobs("#b0603a", ["#8a4428", "#c87848", "#6a3820"], 260, 4, 26); g.fillStyle = "#f0f0f0"; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 8, w, 8); }
    else if (kind === "ocean") { g.fillStyle = "#1a3a6a"; g.fillRect(0, 0, w, h); clouds(0.5); g.fillStyle = "#e8f0f8"; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); }
    else { blobs("#1e4a7a", ["#3a6a3a", "#6a7a4a", "#8a7a5a", "#2a5a2a"], 70, 10, 46); clouds(0.6); g.fillStyle = "#f4f8fc"; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12); } });
  return TEX_CACHE[key] = t; }
const ringTex = tex(256, 8, (g, w) => { for (let x = 0; x < w; x++) { const f = x / w; g.fillStyle = `rgba(${210 + 30 * Math.sin(f * 40)},${190 + 30 * Math.sin(f * 33)},${150 + 20 * Math.sin(f * 21)},${(0.25 + 0.6 * Math.abs(Math.sin(f * 17))) * (f > 0.1 && f < 0.95 ? 1 : 0)})`; g.fillRect(x, 0, 1, 8); } });
const BODY_R = 20000, LOCAL = new THREE.Group(); scene.add(LOCAL);
const starLight = new THREE.DirectionalLight(0xffffff, 2.6); scene.add(starLight, starLight.target);
const SPRITE_GLOW = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.15, "rgba(255,255,255,0.8)"); gr.addColorStop(0.4, "rgba(255,255,255,0.15)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const bbColor = T => { T = clampN(T, 1000, 40000) / 100; const r = T <= 66 ? 1 : clampN(1.2929 * Math.pow(T - 60, -0.1332), 0, 1), g = T <= 66 ? clampN(0.3901 * Math.log(T) - 0.6318, 0, 1) : clampN(1.1299 * Math.pow(T - 60, -0.0755), 0, 1), b = T >= 66 ? 1 : T <= 19 ? 0 : clampN(0.5432 * Math.log(T - 10) - 1.1963, 0, 1); return new THREE.Color(r, g, b); };
let SYS = null;
function buildSystem(S) { while (LOCAL.children.length) LOCAL.remove(LOCAL.children[0]);
  const R = seeded(strSeed(S.name) + 11), sol = S.i === 0, n = sol ? [0, -Math.sin(OBL), Math.cos(OBL)] : (() => { const u = R() * 2 - 1, th = R() * 6.28; return [Math.sqrt(1 - u * u) * Math.cos(th), Math.sqrt(1 - u * u) * Math.sin(th), u]; })();
  const nv = V3(...n).normalize(), e1 = (sol ? V3(1, 0, 0) : V3().crossVectors(nv, Math.abs(nv.z) < 0.9 ? V3(0, 0, 1) : V3(1, 0, 0))).normalize(), e2 = V3().crossVectors(nv, e1).normalize();
  const starMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshBasicMaterial({ color: S.bh ? 0x000000 : bbColor(S.temp).multiplyScalar(1.6), toneMapped: false }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SPRITE_GLOW, color: S.bh ? 0xff9a50 : bbColor(S.temp), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); LOCAL.add(starMesh, glow);
  let disk = null; if (S.bh) { disk = new THREE.Mesh(new THREE.RingGeometry(2.5, 9, 96, 1), new THREE.MeshBasicMaterial({ map: tex(256, 8, (g, w) => { for (let x = 0; x < w; x++) { const f = x / w; g.fillStyle = `rgba(255,${(220 - 160 * f) | 0},${(160 - 140 * f) | 0},${(1 - f) * 0.9})`; g.fillRect(x, 0, 1, 8); } }), side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); LOCAL.add(disk); }
  const planets = planetsOf(S).map((p, k) => { const tx = p.kind === "earth" ? EARTH_T : planetTex(p.kind, strSeed(p.name)), mat = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, metalness: 0, emissive: p.kind === "lava" || p.kind === "hot" ? 0x401008 : 0x000000 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), mat); if (p.kind === "earth") mesh.userData.axis = V3(0, 0, 1); LOCAL.add(mesh); let ring = null;
    if (p.ring) { ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 2.3, 96, 1), new THREE.MeshStandardMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, depthWrite: false })); const uv = ring.geometry.attributes.uv, pos = ring.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const r = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (r - 1.25) / 1.05, 0.5); } LOCAL.add(ring); }
    const L0 = sol ? (SOL_L0[p.name] || 0) * DEG : p.ph; return { ...p, mesh, ring, L0, spin: 0.3 + k * 0.1 }; });
  let moon = null; if (sol) { moon = { name: "the Moon", radius: 1.7374e6, mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), new THREE.MeshStandardMaterial({ map: MOON_T, roughness: 1 })) }; LOCAL.add(moon.mesh); }
  SYS = { S, n: nv, e1, e2, starMesh, glow, disk, planets, moon }; }
// where a planet is (metres from its star, equatorial frame) at a coordinate time
function planetPos(p, ms) { const days = (ms - J2000) / 864e5, th = p.L0 + 2 * Math.PI * days / p.period, a = p.aAU * AU; return SYS.e1.clone().multiplyScalar(a * Math.cos(th)).addScaledVector(SYS.e2, a * Math.sin(th)); }
function moonPos(ms) { const days = (ms - J2000) / 864e5, th = 2 * Math.PI * days / 27.3217 + 2.1; return SYS.e1.clone().multiplyScalar(3.844e8 * Math.cos(th)).addScaledVector(SYS.e2, 3.844e8 * Math.sin(th)); }
// draw each body from the ship: rel = body - ship (metres, equatorial)
function placeBody(mesh, rel, radius, spin) { const d = rel.length(); if (d < radius * 1.01 || !isFinite(d)) { mesh.visible = false; return; } const v = rel.clone().applyMatrix3(R_EQ2SHIP).normalize(), rr = BODY_R * clampN(0.12 + 0.88 * (Math.log10(d) - 6) / 12, 0.08, 1); mesh.visible = true; mesh.position.copy(v).multiplyScalar(rr); mesh.scale.setScalar(rr * radius / d); if (spin !== undefined) { const ax = (mesh.userData.axis || SYS.n).clone().applyMatrix3(R_EQ2SHIP).normalize(); mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), ax).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 1, 0), spin)); } return v; }
function updateSystem(shipPos, ms) { if (!SYS) return; const S = SYS.S, starRel = V3((S.p[0] - shipPos[0]) * LY, (S.p[1] - shipPos[1]) * LY, (S.p[2] - shipPos[2]) * LY), near = starRel.length() < 0.2 * LY;
  for (const o of LOCAL.children) o.visible = near; if (!near) return -1;
  const sv = placeBody(SYS.starMesh, starRel, S.radius); if (sv) { starLight.position.copy(sv).multiplyScalar(100); starLight.intensity = S.bh ? 0.4 : 2.6; const ang = S.radius / starRel.length(); SYS.glow.position.copy(SYS.starMesh.position); SYS.glow.scale.setScalar(SYS.starMesh.position.length() * Math.max(ang * 10, 0.012)); }
  if (SYS.disk) { SYS.disk.position.copy(SYS.starMesh.position); SYS.disk.scale.setScalar(SYS.starMesh.scale.x); SYS.disk.lookAt(SYS.disk.position.clone().add(SYS.n.clone().applyMatrix3(R_EQ2SHIP))); }
  const spin = (ms - J2000) / 864e5 * 2 * Math.PI;
  for (const p of SYS.planets) { const rel = starRel.clone().add(planetPos(p, ms)), v = placeBody(p.mesh, rel, p.radius, p.kind === "earth" ? spin : spin * p.spin * 0.1); if (p.ring) { p.ring.visible = !!v; if (v) { p.ring.position.copy(p.mesh.position); p.ring.scale.setScalar(p.mesh.scale.x); p.ring.lookAt(p.ring.position.clone().add(SYS.n.clone().applyMatrix3(R_EQ2SHIP))); } } }
  if (SYS.moon) { const E = SYS.planets.find(p => p.name === "Earth"); placeBody(SYS.moon.mesh, starRel.clone().add(planetPos(E, ms)).add(moonPos(ms)), SYS.moon.radius, spin / 27.32 + Math.PI); }
  return starRel.length() < 0.01 * LY ? S.i : -1; }

// ---------- the ship ----------
// A tower ship: under constant 1 g thrust "down" is always toward the engine, so the decks are stacked like the floors of a building,
// bow (+y) at the top. The crew section, 22 m across, holds the habitat deck and the bridge, with the cupola, an observation room of
// framed windows like the ISS's, on its roof. Below it (not visible from inside) a long spine carries the hydrogen tanks, the magnetic
// antimatter traps, the radiators and, 600 m aft, the engine; the forward hull carries the radiation shield.
const SHIP = new THREE.Group(); scene.add(SHIP);
const HULL_R = 11, CUP_R = 5.0, DECKS = [{ name: "the habitat deck", y: -5 }, { name: "the bridge", y: 0 }, { name: "the cupola", y: 5 }];
// surfaces: light grey wall panels with seams and fasteners, non-slip floor plates, ceiling light panels
const panelT = tex(512, 512, (g, w, h) => { g.fillStyle = "#c4c8cc"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 256) { g.fillStyle = (x + y) % 384 ? "#cdd1d4" : "#bfc3c7"; g.fillRect(x + 3, y + 3, 250, 122); g.strokeStyle = "#8a9096"; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, 252, 124);
    g.fillStyle = "#7a8086"; for (const [fx, fy] of [[10, 10], [244, 10], [10, 118], [244, 118]]) { g.beginPath(); g.arc(x + fx, y + fy, 3, 0, 6.28); g.fill(); } } g.fillStyle = "#5a6066"; g.font = "600 13px Helvetica"; g.fillText("P-117", 20, 40); g.fillText("O2 / N2", 280, 168); });
panelT.wrapS = panelT.wrapT = THREE.RepeatWrapping;
const floorT = tex(512, 512, (g, w, h) => { g.fillStyle = "#4e545a"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { g.strokeStyle = "#3a3e44"; g.lineWidth = 4; g.strokeRect(x + 2, y + 2, 124, 124); g.fillStyle = "#585e64"; for (let k = 0; k < 36; k++) { g.beginPath(); g.arc(x + 12 + (k % 6) * 20, y + 12 + Math.floor(k / 6) * 20, 2.2, 0, 6.28); g.fill(); } } });
floorT.wrapS = floorT.wrapT = THREE.RepeatWrapping; floorT.repeat.set(6, 6);
const ceilT = tex(256, 256, (g, w, h) => { g.fillStyle = "#d4d8dc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#a8aeb4"; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4); }); ceilT.wrapS = ceilT.wrapT = THREE.RepeatWrapping; ceilT.repeat.set(10, 10);
const mWall = new THREE.MeshStandardMaterial({ map: panelT, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide }), mFloor = new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.9 }), mCeil = new THREE.MeshStandardMaterial({ map: ceilT, roughness: 0.8, side: THREE.DoubleSide });
const mPanel = M(0x2a2e34, { roughness: 0.6 }), mDesk = M(0x8a9096, { metalness: 0.3, roughness: 0.55 }), mRail = M(0xc8b46a, { metalness: 0.6, roughness: 0.35 }), mSeat = M(0x3a4048, { roughness: 0.9 }), mWhite = M(0xe2e4e6, { roughness: 0.7 }), mFrame = M(0x4a4e54, { metalness: 0.6, roughness: 0.4 });
const mGlass = new THREE.MeshPhysicalMaterial({ color: 0xa8c0d0, transparent: true, opacity: 0.08, roughness: 0.02, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
const add = (geo, mat, x, y, z, ry = 0, parent = SHIP) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };
const box = (w, h, d, mat, x, y, z, ry = 0) => add(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, ry);
function signTex(lines, w = 512, h = 128, bg = "#1a1e22", fg = "#d8dde2", font = 44) { return tex(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = `600 ${font}px Helvetica, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; const L = [].concat(lines); L.forEach((t, i) => g.fillText(t, w / 2, h / 2 + (i - (L.length - 1) / 2) * font * 1.15)); }); }
// small stencilled labels, as on a real spacecraft
const plaque = (lines, x, y, z, ry, w = 0.7, h = 0.16) => add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTex(lines, 512, Math.round(512 * h / w), "#e4e6e8", "#22262a", Math.round(512 * h / w * 0.55)), toneMapped: false }), x, y, z, ry);
const OBST = [[], [], []]; const obst = (deck, x, z, w, d) => OBST[deck].push([x, z, w / 2 + 0.25, d / 2 + 0.25]);
// the lift: an enclosed shaft through the decks, its door facing forward (-z) on every deck
const LIFT_R = 1.4, DOOR = 0.42;
const walkable = (deck, x, z) => { const r = Math.hypot(x, z), lim = deck === 2 ? CUP_R - 0.5 : HULL_R - 0.6; if (r > lim) return false;
  if (deck < 2 && r > LIFT_R - 0.25 && r < LIFT_R + 0.25 && Math.abs(Math.atan2(x, z)) < Math.PI - DOOR * 0.8) return false; return !OBST[deck].some(([ox, oz, hw, hd]) => Math.abs(x - ox) < hw && Math.abs(z - oz) < hd); };
{ for (const D of DECKS) add(new THREE.CircleGeometry(LIFT_R - 0.05, 32), mFloor, 0, D.y + 0.012, 0).rotation.x = -Math.PI / 2;
  add(new THREE.CylinderGeometry(LIFT_R, LIFT_R, 10, 40, 1, true, Math.PI + DOOR, Math.PI * 2 - 2 * DOOR), mWall, 0, 0, 0);
  { const r = add(new THREE.TorusGeometry(LIFT_R + 0.05, 0.03, 6, 48, Math.PI * 2 - 2 * DOOR), mRail, 0, 6.0, 0); r.rotation.x = -Math.PI / 2; r.rotation.z = -Math.PI / 2 + DOOR; for (let k = 0; k < 8; k++) { const a = DOOR + (k + 0.5) / 8 * (Math.PI * 2 - 2 * DOOR) + Math.PI; box(0.04, 1.0, 0.04, mRail, Math.sin(a) * (LIFT_R + 0.05), 5, Math.cos(a) * (LIFT_R + 0.05)); } }
  for (const D of DECKS.slice(0, 2)) { add(new THREE.CircleGeometry(LIFT_R - 0.05, 32), mFloor, 0, D.y + 0.01, 0).rotation.x = -Math.PI / 2; for (const s of [-1, 1]) box(0.12, 2.2, 0.15, mFrame, s * Math.sin(DOOR) * LIFT_R, D.y, -Math.cos(DOOR) * LIFT_R); box(Math.sin(DOOR) * LIFT_R * 2 + 0.2, 0.25, 0.15, mFrame, 0, D.y + 2.2, -Math.cos(DOOR) * LIFT_R);
    plaque(["LIFT"], 0, D.y + 2.6, -LIFT_R - 0.02, Math.PI, 0.5, 0.14); } }
// the hull: the outer wall panelled inside, floors, ceilings with light panels, handrails, lockers, cable trays
{ add(new THREE.CylinderGeometry(HULL_R, HULL_R, 14, 72, 1, true), mWall, 0, -2, 0).material.map.repeat.set(26, 7);
  const ring = (y0, r0, r1, mat, up) => { const f = add(new THREE.RingGeometry(r0, r1, 72, 1), mat, 0, y0, 0); f.rotation.x = up ? -Math.PI / 2 : Math.PI / 2; return f; };
  ring(-5, LIFT_R, HULL_R, mFloor, true); ring(-1.4, LIFT_R, HULL_R, mCeil, false); ring(0, LIFT_R, HULL_R, mFloor, true); ring(3.6, LIFT_R, HULL_R, mCeil, false);
  add(new THREE.CircleGeometry(HULL_R, 72), M(0x2a2e34), 0, -9, 0).rotation.x = -Math.PI / 2;
  ring(5, CUP_R, HULL_R, M(0x8a9096, { metalness: 0.4 }), true);
  const ledM = new THREE.MeshBasicMaterial({ color: 0xf4f6ff }); for (const y of [-1.42, 3.58]) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, l = add(new THREE.PlaneGeometry(1.6, 0.4), ledM, Math.cos(a) * 6, y, Math.sin(a) * 6, -a); l.rotation.x = Math.PI / 2; l.rotation.order = "YXZ"; l.rotation.y = -a; }
  for (const D of DECKS.slice(0, 2)) { const hr = add(new THREE.TorusGeometry(HULL_R - 0.18, 0.025, 6, 96), mRail, 0, D.y + 1.05, 0); hr.rotation.x = Math.PI / 2; const tray = add(new THREE.TorusGeometry(HULL_R - 0.3, 0.12, 4, 96), mPanel, 0, D.y + (D.y < 0 ? 3.3 : 3.35), 0); tray.rotation.x = Math.PI / 2; } }
const deckOf = y => DECKS.reduce((b, D, i) => Math.abs(D.y - y) < Math.abs(DECKS[b].y - y) ? i : b, 0);
// screens: canvases on framed displays
const SCREENS = {}; const screen = (key, w, h, cw, ch, x, y, z, ry, tilt = 0) => { const c = document.createElement("canvas"); c.width = cw; c.height = ch; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = add(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), x, y, z, ry); m.rotation.order = "YXZ"; m.rotation.x = tilt; m.rotation.y = ry;
  const f = add(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.05), mPanel, x - Math.sin(ry) * Math.cos(tilt) * 0.03, y - Math.sin(-tilt) * 0.03, z - Math.cos(ry) * Math.cos(tilt) * 0.03, ry); f.rotation.order = "YXZ"; f.rotation.x = tilt; f.rotation.y = ry;
  return SCREENS[key] = { c, g: c.getContext("2d"), t, w: cw, h: ch, m }; };
// buttons you press: by clicking, or with the VR controller's ray and trigger
const BUTTONS = [];
function button(label, x, y, z, ry, tilt, onPick, w = 0.5, h = 0.18, col = "#2a3a48") { const cw = Math.round(clampN(256 * w / 0.5, 256, 1024)), m = add(new THREE.BoxGeometry(w, h, 0.04), new THREE.MeshBasicMaterial({ map: signTex(label, cw, Math.round(cw * h / w), col, "#eef2f6", Math.round(cw * h / w * 0.42)), toneMapped: false }), x, y, z, ry); m.rotation.order = "YXZ"; m.rotation.x = tilt; m.rotation.y = ry; m.userData.onPick = onPick; BUTTONS.push(m); return m; }
// the bridge: the trip computer on the forward console, the autopilot and navigation stations before two seats, propulsion and ship-systems stations at the sides
{ screen("trip", 4.4, 2.4, 1600, 872, 0, 2.15, -9.6, 0);
  box(6.6, 0.95, 0.9, mDesk, 0, 0, -9.3); obst(1, 0, -9.3, 6.6, 0.9); box(5.8, 0.05, 0.4, mPanel, 0, 0.95, -9.15);
  for (const [x, ry, key, lab] of [[-2.6, 0.22, "auto", "AUTOPILOT"], [2.6, -0.22, "nav", "NAVIGATION"]]) { box(2.0, 0.85, 0.95, mDesk, x, 0, -6.4, ry); obst(1, x, -6.4, 2.0, 1.0); screen(key, 1.6, 1.07, 1200, 800, x + Math.sin(ry) * 0.3, 1.45, -6.75 + Math.cos(ry) * 0.0, ry, -0.32); plaque([lab], x + Math.sin(ry) * 0.42, 2.12, -6.82, ry, 0.7, 0.13);
    const sx = x, sz = -4.9; box(0.62, 0.48, 0.62, mSeat, sx, 0, sz); box(0.62, 0.95, 0.14, mSeat, sx, 0.48, sz + 0.3); box(0.36, 0.26, 0.12, mSeat, sx, 1.43, sz + 0.3); for (const s of [-1, 1]) box(0.08, 0.2, 0.5, mSeat, sx + s * 0.34, 0.6, sz); obst(1, sx, sz, 0.7, 0.75); }
  for (const [x, ry, key, lab] of [[8.4, -1.25, "eng", "PROPULSION"], [-8.4, 1.25, "ship", "SHIP SYSTEMS"]]) { screen(key, 2.2, 1.24, 1280, 720, x, 1.75, -2.7, ry); box(2.4, 0.9, 0.7, mDesk, x - Math.sin(ry) * 0.5, 0, -2.7 - Math.cos(ry) * 0.5, ry); obst(1, x - Math.sin(ry) * 0.5, -2.7 - Math.cos(ry) * 0.5, 1.2, 1.2); plaque([lab], x + Math.sin(ry) * 0.05, 2.55, -2.7 + Math.cos(ry) * 0.05, ry, 0.8, 0.14); }
  plaque(["TRIP COMPUTER"], 0, 3.45, -9.62, 0, 1.0, 0.16);
  for (let k = 0; k < 6; k++) { const a = Math.PI * 0.2 + k * 0.12; box(0.9, 2.2, 0.55, mWhite, Math.cos(a) * 10.4, 0, Math.sin(a) * 10.4, -a + Math.PI / 2); } }
// the habitat deck: four cabins, the galley, a hydroponic garden, an exercise area and a sick bay round the lift
{ const y = -5, wallRun = (x0, z0, x1, z1, gaps = []) => { const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0); let s = 0; for (const [g0, g1] of [...gaps, [L, L]]) { if (g0 > s) { const m = (s + g0) / 2, cx = x0 + (x1 - x0) * m / L, cz = z0 + (z1 - z0) * m / L; box(0.1, 2.4, g0 - s, mWall, cx, y, cz, ry); OBST[0].push([cx, cz, Math.abs(Math.cos(ry)) * 0.3 + Math.abs(Math.sin(ry)) * (g0 - s) / 2, Math.abs(Math.sin(ry)) * 0.3 + Math.abs(Math.cos(ry)) * (g0 - s) / 2]); } s = g1; } };
  // cabins along the aft side: each 3 m wide with a bunk, a desk and a locker
  for (let k = 0; k < 4; k++) { const x0 = -6 + k * 3; wallRun(x0, 3.2, x0, 9.0); if (k === 3) wallRun(x0 + 3, 3.2, x0 + 3, 9.0); wallRun(x0, 3.2, x0 + 3, 3.2, [[0.9, 2.1]]); box(2.0, 0.5, 0.9, M(0x5a6a80), x0 + 1.5, y, 7.6); box(2.0, 0.1, 0.9, mWhite, x0 + 1.5, y + 0.5, 7.6); obst(0, x0 + 1.5, 7.6, 2.0, 0.9); box(0.8, 0.75, 0.5, mDesk, x0 + 2.4, y, 4.2); plaque([`CABIN ${k + 1}`], x0 + 1.5, y + 2.0, 3.14, Math.PI, 0.55, 0.13); }
  // the galley: counter and cabinets, a table with fixed seats
  box(4.0, 0.92, 0.65, mWhite, -7.8, y, -3.2, Math.PI / 2); obst(0, -7.8, -3.2, 0.7, 4.0); box(4.0, 0.9, 0.5, mWhite, -8.3, y + 1.5, -3.2, Math.PI / 2); plaque(["GALLEY"], -7.55, y + 2.6, -3.2, Math.PI / 2, 0.6, 0.14);
  box(2.4, 0.06, 1.0, mDesk, -4.6, y + 0.72, -4.2); box(0.15, 0.72, 0.15, mDesk, -4.6, y, -4.2); obst(0, -4.6, -4.2, 2.4, 1.0); for (const s of [-1, 1]) box(2.2, 0.45, 0.4, mSeat, -4.6, y, -4.2 + s * 0.8);
  // hydroponics: shelving in tiers under LED growth lights
  plaque(["HYDROPONICS"], 5.5, y + 2.6, -8.9, 0, 0.8, 0.14); const leaf = M(0x4a8a3a, { roughness: 0.9 }), led = new THREE.MeshBasicMaterial({ color: 0xffe0f0 });
  for (let r = 0; r < 3; r++) { const x = 3.2 + r * 1.6; box(0.7, 2.2, 3.6, mDesk, x, y, -6.4); obst(0, x, -6.4, 0.8, 3.6); for (const ty of [0.6, 1.3, 2.0]) { for (let k = 0; k < 7; k++) add(new THREE.SphereGeometry(0.16, 8, 6), leaf, x, y + ty + 0.1, -8.0 + k * 0.5); add(new THREE.BoxGeometry(0.4, 0.03, 3.4), led, x, y + ty + 0.5, -6.4); } }
  // exercise: a treadmill with its bungee harness, a cycle ergometer, a resistance machine
  plaque(["EXERCISE"], 9.0, y + 2.6, -1.4, -Math.PI / 2, 0.6, 0.14); box(0.8, 0.2, 2.0, mPanel, 7.6, y, 0.6); box(0.8, 1.1, 0.08, mPanel, 7.6, y, -0.4); obst(0, 7.6, 0.6, 0.9, 2.1); box(0.5, 0.9, 1.0, mPanel, 6.0, y, 2.2); obst(0, 6.0, 2.2, 0.6, 1.1);
  // the sick bay
  plaque(["MEDICAL"], 4.0, y + 2.6, 3.14, Math.PI, 0.55, 0.14); box(2.0, 0.8, 0.8, mWhite, 7.0, y, 5.0, Math.PI / 6); obst(0, 7.0, 5.0, 2.1, 1.1); box(0.6, 1.8, 0.4, mWhite, 8.8, y, 3.5, -Math.PI / 3); }
// the cupola: an observation room on the roof, glazed all the way round: eight tall windows from a low sill up to eight sloping
// windows, and a large round window overhead (looking forward, at the bow). Only the floor and the slim frames block the view.
{ const y = 5, n = 8, sill = y + 0.25, wallTop = y + 2.2, rTop = 2.2, yTop = y + 4.2, R1 = CUP_R / Math.cos(Math.PI / n), R2 = rTop / Math.cos(Math.PI / n);
  const pane = P => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...P[0], ...P[1], ...P[2], ...P[0], ...P[2], ...P[3]], 3)); g.computeVertexNormals(); add(g, mGlass, 0, 0, 0);
    // the window frame: a metal edge round each pane
    for (let e = 0; e < 4; e++) { const A = V3(...P[e]), B = V3(...P[(e + 1) % 4]), L = A.distanceTo(B), mid = A.clone().add(B).multiplyScalar(0.5), bar = add(new THREE.BoxGeometry(0.12, 0.12, L), mFrame, mid.x, mid.y, mid.z); bar.lookAt(B); } };
  for (let k = 0; k < n; k++) { const a0 = (k - 0.5) / n * Math.PI * 2, a1 = (k + 0.5) / n * Math.PI * 2, am = k / n * Math.PI * 2, at = (R, h, a) => [R * Math.cos(a), h, R * Math.sin(a)];
    box(2 * CUP_R * Math.tan(Math.PI / n), 0.25, 0.2, mFrame, Math.cos(am) * CUP_R, y, Math.sin(am) * CUP_R, -am + Math.PI / 2);
    pane([at(R1, sill, a0), at(R1, sill, a1), at(R1, wallTop, a1), at(R1, wallTop, a0)]);
    pane([at(R1, wallTop, a0), at(R1, wallTop, a1), at(R2, yTop, a1), at(R2, yTop, a0)]); }
  { const top = new THREE.Mesh(new THREE.CircleGeometry(rTop * 0.92, 48), mGlass); top.position.set(0, yTop + 0.01, 0); top.rotation.x = -Math.PI / 2; SHIP.add(top); const fr = add(new THREE.TorusGeometry(rTop * 0.95, 0.12, 8, 64), mFrame, 0, yTop, 0); fr.rotation.x = Math.PI / 2;
    const ring2 = add(new THREE.RingGeometry(rTop * 0.95, rTop / Math.cos(Math.PI / n), 8, 1, Math.PI / n), mFrame, 0, yTop + 0.005, 0); ring2.rotation.x = -Math.PI / 2; }
  add(new THREE.CircleGeometry(CUP_R / Math.cos(Math.PI / n), n, Math.PI / n), mFloor, 0, y + 0.005, 0).rotation.x = -Math.PI / 2;
  // two reclining couches for looking up through the big window, a handrail round the room, a small workstation
  for (const s of [-1, 1]) { const cx = s * 1.9, cz = 1.6; box(0.7, 0.4, 1.9, mSeat, cx, y, cz); const back = box(0.7, 0.1, 1.2, mSeat, cx, y + 0.55, cz - 1.2); back.rotation.x = -0.7; obst(2, cx, cz - 0.3, 0.8, 2.4); }
  const hr = add(new THREE.TorusGeometry(CUP_R - 0.22, 0.025, 6, 64), mRail, 0, y + 1.1, 0); hr.rotation.x = Math.PI / 2;
  box(1.2, 0.85, 0.5, mDesk, -3.0, y, -3.0, Math.PI / 4); obst(2, -3.0, -3.0, 1.0, 1.0); plaque(["CUPOLA"], -3.0 + 0.18, y + 1.0, -3.0 + 0.18, Math.PI / 4, 0.5, 0.12); }
// light inside: soft white panels; the cupola kept dim so the sky can be seen
scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x404448, 0.6)); for (const D of DECKS.slice(0, 2)) for (const [x, z] of [[0, -5], [0, 5], [-5, 0], [5, 0]]) { const l = new THREE.PointLight(0xf2f4ff, 14, 16, 1.6); l.position.set(x, D.y + 3.2, z); scene.add(l); }
{ const l = new THREE.PointLight(0xc8d4e8, 1.5, 8, 2); l.position.set(0, 6.6, 0); scene.add(l); }
// ---------- the flight ----------
// Two clocks, both set to the real date and time when the page opens: the ship's own (proper) time, and coordinate time in the rest
// frame of the stars (the galaxy's frame, near enough Earth's). Parked, they run together; under way, coordinate time runs gamma times faster.
const NOW0 = Date.now(); let properMs = NOW0, coordMs = NOW0;
const WARPS = [[1, "real time"], [60, "1 minute a second"], [3600, "1 hour a second"], [86400, "1 day a second"], [604800, "1 week a second"], [2629800, "1 month a second"], [31557600, "1 year a second"], [315576000, "10 years a second"]];
let warpI = 0, mode = "parked", trip = null, destI = 1, listTop = 0, here = 0, park = null, shipPos = [0, 0, 0], bow = [1, 0, 0], align = null, tripLog = [];
// where to park at a star: in orbit near its most interesting planet (one in the habitable zone if any, else the biggest), or near the star
function parkPlan(Si, ms) { const S = STARS[Si]; if (SYS?.S !== S) buildSystem(S); const P = SYS.planets;
  let p = P.findIndex(q => q.kind === "earth"); if (p < 0) p = P.findIndex(q => q.kind === "temperate" || q.kind === "ocean"); if (p < 0 && P.length) p = P.reduce((b, q, i) => q.radius > P[b].radius ? i : b, 0);
  const body = p >= 0 ? planetPos(P[p], ms) : V3(0, 0, 0), rad = p >= 0 ? P[p].radius : S.radius, k = p >= 0 ? (P[p].radius > 3 * RE ? 4 : 3) : S.bh ? 40 : S.giant ? 4 : 30;
  const toStar = body.length() > 0 ? body.clone().negate().normalize() : SYS.e1.clone(), off = toStar.clone().applyAxisAngle(SYS.n, 1.0).addScaledVector(SYS.n, 0.25).normalize().multiplyScalar(rad * k);
  return { Si, p, off }; }
const parkBody = (pk, ms) => (pk.p >= 0 ? planetPos(SYS.planets[pk.p], ms) : V3(0, 0, 0));
const parkPos = (pk, ms) => { const S = STARS[pk.Si], b = parkBody(pk, ms).add(pk.off); return [S.p[0] + b.x / LY, S.p[1] + b.y / LY, S.p[2] + b.z / LY]; };
function parkAt(Si) { here = Si; park = parkPlan(Si, coordMs); shipPos = parkPos(park, coordMs); const o = park.off.clone().negate().normalize(); bow = [o.x, o.y, o.z]; mode = "parked"; trip = null; }
const parkName = () => park.p >= 0 ? SYS.planets[park.p].name : STARS[park.Si].name.split(" (")[0];
function engage() { if (mode !== "parked") return say("The autopilot is already flying a course.", 6); if (destI === here) return say("We are already there.", 5);
  const S = STARS[destI], d0 = Math.hypot(S.p[0] - shipPos[0], S.p[1] - shipPos[1], S.p[2] - shipPos[2]) * LY, est = tripPlan(d0), dpark = parkPlan(destI, coordMs + est.t * 1000); buildSystem(STARS[here]);
  const P1 = (() => { const keep = SYS; buildSystem(S); const p = parkPos(dpark, coordMs + est.t * 1000); buildSystem(STARS[here]); return p; })();
  const u = [P1[0] - shipPos[0], P1[1] - shipPos[1], P1[2] - shipPos[2]], L = Math.hypot(...u); u[0] /= L; u[1] /= L; u[2] /= L;
  align = { from: bow.slice(), to: u, t: 0, dur: 20, P1, dest: destI, dpark };
  mode = "align"; say(`Autopilot engaged for <b>${S.name}</b>, ${fmtLy(L)} away. Turning the ship to point at it; then the engine lights and we accelerate at 1 g until the midpoint, turn over, and decelerate at 1 g for the second half.`, 14); }
function startBurn() { const A = align, D = Math.hypot(A.P1[0] - shipPos[0], A.P1[1] - shipPos[1], A.P1[2] - shipPos[2]) * LY;
  trip = { P0: shipPos.slice(), P1: A.P1, u: A.to, plan: tripPlan(D), tau: 0, prop0: properMs, coord0: coordMs, dest: A.dest, dpark: A.dpark, flipped: false, switched: false }; mode = "trip"; align = null;
  say(`Engine lit. Proper acceleration 1.000 g: you feel it as ordinary gravity, toward the decks below. Expected trip: <b>${fmtDur(trip.plan.tau)}</b> by the ship's clock, <b>${fmtDur(trip.plan.t)}</b> by the stars' (and Earth's).`, 14); }
function arrive() { const T = trip; tripLog.push({ from: STARS[here].name, to: STARS[T.dest].name, tau: T.plan.tau, t: T.plan.t }); buildSystem(STARS[T.dest]); here = T.dest; park = T.dpark; mode = "parked"; trip = null;
  shipPos = parkPos(park, coordMs); const o = park.off.clone().negate().normalize(); bow = [o.x, o.y, o.z]; warpI = Math.min(warpI, 2);
  say(`Arrived at <b>${STARS[here].name}</b>, in orbit near <b>${parkName()}</b>. ${STARS[here].note} ${SYS.planets.length ? `Planets: ${SYS.planets.map(p => p.name.replace(STARS[here].name.split(" (")[0] + " ", "")).join(", ")} (${SYS.planets[0].known ? "known" : "generated: none are known here"}).` : ""} Look out from the cupola.`, 18); }
function skip(to) { if (mode !== "trip") return say("Engage the autopilot first.", 5); const P = trip.plan; trip.tau = Math.max(trip.tau, to === "turn" ? P.tauH - 120 : P.tau - 6 * 3600); say(to === "turn" ? "Skipping ahead to just before turnover." : "Skipping ahead to six hours (ship time) before arrival.", 6); }
function stepFlight(dt) { const w = WARPS[warpI][0], step = dt * w;
  if (mode === "parked") { properMs += step * 1000; coordMs += step * 1000; shipPos = parkPos(park, coordMs); }
  else if (mode === "align") { properMs += dt * 1000; coordMs += dt * 1000; shipPos = parkPos(park, coordMs); align.t += dt; const f = Math.min(1, align.t / align.dur), s = f * f * (3 - 2 * f), a = V3(...align.from), b = V3(...align.to), q = new THREE.Quaternion().setFromUnitVectors(a, b), qi = new THREE.Quaternion().slerp(q, s), v = a.clone().applyQuaternion(qi); bow = [v.x, v.y, v.z]; if (f >= 1) startBurn(); }
  else if (mode === "trip") { const T = trip, P = T.plan; T.tau = Math.min(P.tau, T.tau + step); const st = tripState(P, T.tau); T.st = st;
    shipPos = [T.P0[0] + T.u[0] * st.x / LY, T.P0[1] + T.u[1] * st.x / LY, T.P0[2] + T.u[2] * st.x / LY]; properMs = T.prop0 + T.tau * 1000; coordMs = T.coord0 + st.t * 1000;
    bow = st.accel ? T.u : [-T.u[0], -T.u[1], -T.u[2]];
    if (!st.accel && !T.flipped) { T.flipped = true; say("<b>Turnover.</b> At the midpoint the engine shuts down, the ship turns end over end, and the engine lights again pointing ahead: now 1 g of deceleration. The floor is still 'down', but the cupola now faces back the way we came.", 14); }
    if (!T.switched && st.x > P.D / 2) { T.switched = true; buildSystem(STARS[T.dest]); }
    if (T.tau >= P.tau) arrive(); } }
// ---------- formatting ----------
const pad = (n, k = 2) => String(n).padStart(k, "0");
const fmtDate = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`; };
const fmtDur = s => { s = Math.max(0, s); if (s < 120) return `${s.toFixed(0)} s`; if (s < 7200) return `${(s / 60).toFixed(1)} min`; if (s < 2 * 86400) return `${(s / 3600).toFixed(1)} hours`; if (s < YEAR) return `${(s / 86400).toFixed(1)} days`; const y = s / YEAR; return y < 1000 ? `${y.toFixed(2)} years` : `${Math.round(y).toLocaleString()} years`; };
// distances step up through metres, kilometres, astronomical units and light years as they grow
const fmtLy = ly => { const m = Math.abs(ly) * LY; if (m < 1000) return `${m.toFixed(m < 10 ? 2 : m < 100 ? 1 : 0)} m`; if (m < 1e8) return `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: m < 1e5 ? 2 : 0 })} km`; if (m < 0.05 * LY) { const au = m / AU; return `${au.toFixed(au < 10 ? 4 : au < 100 ? 2 : 1)} AU`; } return ly < 10 ? `${ly.toFixed(3)} ly` : `${ly.toLocaleString(undefined, { maximumFractionDigits: 1 })} ly`; };
const fmtV = v => { const b = v / C; if (b < 0.9) return `${b.toFixed(6)} c`; const n = Math.min(14, Math.max(4, Math.ceil(-Math.log10(1 - b)) + 3)); return `${b.toFixed(n)} c`; };
// speeds step up from metres a second to kilometres a second as they grow
const fmtKms = v => { const a = Math.abs(v); if (a < 1000) return `${a.toFixed(a < 10 ? 3 : a < 100 ? 2 : 1)} m/s`; return `${(a / 1000).toLocaleString(undefined, { minimumFractionDigits: a < 1e7 ? 2 : 1, maximumFractionDigits: a < 1e7 ? 2 : 1 })} km/s`; };
// a speed in units of c, with enough digits to see it (both velocities use this, so at low speed they read the same)
const fmtC = v => { const b = v / C; if (b === 0) return "0 c"; if (b < 1e-3) return `${b.toExponential(4)} c`; if (b < 0.99) return `${b.toFixed(6)} c`; if (b < 1) return fmtV(v); return `${b.toFixed(b < 10 ? 6 : 3)} c`; };
const fmtG = g => g < 10 ? g.toFixed(g < 1.01 ? 8 : 5) : fmtBig(g);
const fmtBig = x => x < 1e6 ? x.toLocaleString(undefined, { maximumFractionDigits: 2 }) : x.toExponential(3);

// ---------- the screens ----------
function panel(S, title) { const g = S.g; g.fillStyle = "#06121a"; g.fillRect(0, 0, S.w, S.h); g.strokeStyle = "#2a6a8a"; g.lineWidth = 4; g.strokeRect(6, 6, S.w - 12, S.h - 12); g.fillStyle = "#7ad0f0"; g.font = "700 40px Helvetica, sans-serif"; g.fillText(title, 28, 56); return g; }
function row(g, y, label, value, x = 28, vx = 560, size = 34, col = "#e8f4fa") { g.fillStyle = "#8ab0c4"; g.font = `500 ${size * 0.72}px Helvetica, sans-serif`; g.fillText(label, x, y); g.fillStyle = col; g.font = `600 ${size}px Menlo, monospace`; g.fillText(value, vx, y); }
const curState = () => mode === "trip" && trip.st ? trip.st : { tau: 0, x: 0, t: 0, v: 0, w: 0, gamma: 1, phi: 0, accel: false, phase: mode === "align" ? "turning to the course" : "in orbit" };
function drawTrip() { const S = SCREENS.trip, g = panel(S, "TRIP COMPUTER"), st = curState(), T = trip;
  g.fillStyle = "#f0d890"; g.font = "600 34px Helvetica, sans-serif"; g.fillText(mode === "trip" ? `${STARS[here].name.split(" (")[0]}  →  ${STARS[T.dest].name.split(" (")[0]}   ·   ${st.phase}` : `${mode === "align" ? "turning to the course for " + STARS[align.dest].name.split(" (")[0] : "in orbit near " + parkName() + ", " + STARS[here].name.split(" (")[0]}`, 28, 110);
  let y = 175; const R = (l, v, c) => { row(g, y, l, v, 28, 640, 38, c); y += 58; };
  R("PROPER TIME (ship clock)", fmtDate(properMs), "#9af0b0"); R("COORDINATE TIME (star frame)", fmtDate(coordMs), "#f0c890");
  R("  elapsed this trip: ship / stars", mode === "trip" ? `${fmtDur(st.tau)}  /  ${fmtDur(st.t)}` : "-");
  R("PROPER VELOCITY  w = γv = dx/dτ", `${fmtKms(st.w)}   (${fmtC(st.w)})`, "#9ad8ff"); R("MAP VELOCITY  v = dx/dt", `${fmtKms(st.v)}   (${fmtC(st.v)})`, "#9ad8ff");
  R("LORENTZ FACTOR  γ = dt/dτ", `${fmtG(st.gamma)}      rapidity ${st.phi.toFixed(4)}`);
  R("PROPER ACCELERATION", mode === "trip" ? `${st.accel ? "+" : "−"}1.000 g  (9.807 m/s²)` : "0 g (in orbit: gravity off)");
  if (mode === "trip") { R("DISTANCE: covered / to go (map)", `${fmtLy(st.x / LY)}  /  ${fmtLy((T.plan.D - st.x) / LY)}`); R("  to go as the ship measures it", fmtLy((T.plan.D - st.x) / LY / st.gamma)); R("ARRIVAL: ship clock / star clock", `${fmtDur(T.plan.tau - st.tau)}  /  ${fmtDur(T.plan.t - st.t)}  from now`); }
  g.fillStyle = "#5a8aa0"; g.font = "500 24px Menlo, monospace"; g.fillText("c²dτ² = c²dt² − dx²    t = (c/a) sinh(aτ/c)    x = (c²/a)(cosh(aτ/c) − 1)    v = c tanh(aτ/c)    w = c sinh(aτ/c)", 28, S.h - 30);
  g.fillStyle = "#c8a860"; g.font = "600 28px Helvetica, sans-serif"; g.fillText(`TIME: ${WARPS[warpI][1]}`, S.w - 470, 56); S.t.needsUpdate = true; }
function drawAuto() { const S = SCREENS.auto, g = panel(S, "AUTOPILOT: DESTINATIONS"), n = 11; listTop = clampN(destI - 5, 0, STARS.length - n);
  for (let k = 0; k < n; k++) { const i = listTop + k; if (i >= STARS.length) break; const St = STARS[i], d = Math.hypot(St.p[0] - shipPos[0], St.p[1] - shipPos[1], St.p[2] - shipPos[2]), y = 108 + k * 44, sel = i === destI;
    if (sel) { g.fillStyle = "#1a4a62"; g.fillRect(16, y - 32, S.w - 32, 42); } g.fillStyle = i === here ? "#9af0b0" : sel ? "#ffffff" : "#c8dce8"; g.font = `${sel ? 700 : 500} 28px Helvetica, sans-serif`; g.fillText(St.name, 28, y);
    g.font = "500 24px Menlo, monospace"; g.fillStyle = "#8ab0c4"; g.fillText(i === here ? "here" : fmtLy(d), 640, y); g.fillText(KNOWN[St.name] ? `${KNOWN[St.name].length} known` : St.bh ? "black hole" : "generated", 900, y); }
  const St = STARS[destI], d = Math.hypot(St.p[0] - shipPos[0], St.p[1] - shipPos[1], St.p[2] - shipPos[2]) * LY, P = tripPlan(d);
  g.fillStyle = "#0e2230"; g.fillRect(16, 600, S.w - 32, 184); g.fillStyle = "#f0d890"; g.font = "700 30px Helvetica, sans-serif"; g.fillText(`${St.name}  (${St.sp})`, 30, 640);
  g.fillStyle = "#c8dce8"; g.font = "500 23px Helvetica, sans-serif"; g.fillText(St.note.slice(0, 92), 30, 676); g.fillText(St.note.slice(92, 184), 30, 704);
  g.fillStyle = "#9ad8ff"; g.font = "600 24px Menlo, monospace"; g.fillText(destI === here ? "We are here." : `1 g trip: ${fmtDur(P.tau)} ship, ${fmtDur(P.t)} stars; top speed ${fmtV(P.vMax)}, γ ${fmtBig(P.gammaMax)}`, 30, 750); S.t.needsUpdate = true; }
function drawNav() { const S = SCREENS.nav, g = panel(S, "NAVIGATION: STARS NEAR THE COURSE (top view, celestial north up)"), cx = S.w / 2, cy = S.h / 2 + 20;
  const tgt = mode === "trip" ? trip.P1 : STARS[destI].p, span = Math.max(12, 1.4 * Math.hypot(tgt[0] - shipPos[0], tgt[1] - shipPos[1]), 1.4 * Math.hypot(...shipPos.slice(0, 2))), sc = 330 / span, X = p => cx + (p[0] - shipPos[0] * 0.5 - tgt[0] * 0.5) * sc, Y = p => cy - (p[1] - shipPos[1] * 0.5 - tgt[1] * 0.5) * sc;
  g.strokeStyle = "#16384a"; g.lineWidth = 1; for (let r = 1; r < 6; r++) { g.beginPath(); g.arc(X([0, 0]), Y([0, 0]), r * span / 5 * sc, 0, 6.28); g.stroke(); }
  for (const St of STARS) { const x = X(St.p), y = Y(St.p); if (x < 20 || x > S.w - 20 || y < 80 || y > S.h - 20) continue; g.fillStyle = St.temp ? `#${bbColor(St.temp).getHexString()}` : "#ff9a50"; g.beginPath(); g.arc(x, y, St.i === destI ? 7 : 4, 0, 6.28); g.fill(); g.fillStyle = "#8ab0c4"; g.font = "18px Helvetica"; g.fillText(St.name.split(" (")[0], x + 8, y - 6); }
  if (mode === "trip") { g.strokeStyle = "#f0d890"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(trip.P0), Y(trip.P0)); g.lineTo(X(trip.P1), Y(trip.P1)); g.stroke(); }
  g.fillStyle = "#9af0b0"; g.beginPath(); g.arc(X(shipPos), Y(shipPos), 8, 0, 6.28); g.fill(); g.fillText("ship", X(shipPos) + 10, Y(shipPos) + 22);
  g.fillStyle = "#5a8aa0"; g.font = "20px Helvetica"; g.fillText(`rings every ${fmtLy(span / 5)} from the Sun`, 28, S.h - 22); S.t.needsUpdate = true; }
function drawEng() { const S = SCREENS.eng, g = panel(S, "ENGINE: ANTIMATTER DRIVE"), st = curState(), on = mode === "trip", tau = on ? st.tau : 0, phiUsed = G0 * tau / C;
  let y = 120; const R = (l, v, c) => { row(g, y, l, v, 28, 520, 30, c); y += 50; };
  R("THRUST", on ? "FULL · 1.000 g proper" : "off", on ? "#9af0b0" : "#c8dce8"); R("DRIVE", "beamed-core: H + anti-H annihilation, pions steered by a magnetic nozzle");
  R("FUEL USED (ideal photon rocket)", on ? `mass ratio e^(aτ/c) = ${fmtBig(Math.exp(phiUsed))}` : "-"); R("FUEL USED (real pion exhaust, ~0.33 c)", on ? `mass ratio ${fmtBig(Math.exp(phiUsed / 0.33))}` : "-");
  R("FUEL ON BOARD", "assumed sufficient (see note)", "#f0c890"); R("RADIATORS", on ? "glowing dull red, ~1,000 K" : "cool"); R("FORWARD SHIELD", on && st.gamma > 2 ? `up: interstellar gas arriving at γ = ${fmtG(st.gamma)}` : "standby");
  g.fillStyle = "#8ab0c4"; g.font = "21px Helvetica"; ["Note: a real 1 g trip is limited by fuel. Even a perfect photon rocket needs about 40 kg of matter and antimatter per kg delivered to", "Proxima Centauri (accelerating and stopping); this ship simply assumes an enormous store, as you asked."].forEach((t, i) => g.fillText(t, 28, S.h - 70 + i * 28)); S.t.needsUpdate = true; }
function drawShip() { const S = SCREENS.ship, g = panel(S, "SHIP STATUS"), st = curState(), dSun = Math.hypot(...shipPos);
  let y = 120; const R = (l, v) => { row(g, y, l, v, 28, 480, 30); y += 50; };
  R("WHERE", mode === "trip" ? "between the stars" : `${STARS[here].name.split(" (")[0]}, near ${parkName()}`); R("FROM THE SUN", fmtLy(dSun)); R("LIGHT FROM EARTH TAKES", fmtDur(dSun * LY / C));
  R("DOPPLER: ahead / behind", mode === "trip" ? `×${fmtBig(Math.sqrt((1 + st.v / C) / (1 - st.v / C)))}  /  ×${fmtBig(Math.sqrt((1 - st.v / C) / (1 + st.v / C)))}` : "×1");
  R("TRIPS MADE", String(tripLog.length)); R("CREW SPACE", "3 decks, 22 m across: cupola, bridge, habitat"); R("GRAVITY", mode === "trip" ? "1 g from the thrust" : "weightless in orbit (shown as 1 g)");
  S.t.needsUpdate = true; }
// buttons
{ const deskBtn = (dx, dz, ry, u, v, label, fn, w = 0.42, h = 0.16, col) => button(label, dx + Math.cos(ry) * u + Math.sin(ry) * v, 0.875, dz - Math.sin(ry) * u + Math.cos(ry) * v, ry, -1.3, fn, w, h, col);
  const A = [-2.6, -6.4, 0.22], N = [2.6, -6.4, -0.22];
  deskBtn(...A, -0.72, 0.1, "▲", () => { destI = Math.max(0, destI - 1); }); deskBtn(...A, -0.24, 0.1, "▼", () => { destI = Math.min(STARS.length - 1, destI + 1); });
  deskBtn(...A, 0.24, 0.1, "▲ 10", () => { destI = Math.max(0, destI - 10); }); deskBtn(...A, 0.72, 0.1, "▼ 10", () => { destI = Math.min(STARS.length - 1, destI + 10); });
  deskBtn(...A, 0, 0.34, "ENGAGE AUTOPILOT", engage, 1.4, 0.17, "#6a2a22");
  deskBtn(...N, -0.5, 0.1, "TIME −", () => { warpI = Math.max(0, warpI - 1); }, 0.55); deskBtn(...N, 0.1, 0.1, "TIME +", () => { warpI = Math.min(WARPS.length - 1, warpI + 1); }, 0.55);
  deskBtn(...N, -0.42, 0.34, "TO TURNOVER", () => skip("turn"), 0.75); deskBtn(...N, 0.42, 0.34, "TO ARRIVAL", () => skip("arrive"), 0.75);
  // inside the lift, on its wall facing the door: a button for each deck
  for (let d = 0; d < 3; d++) { const y = DECKS[d].y; if (d === 2) box(0.12, 1.4, 0.3, mPanel, LIFT_R - 0.02, y, 0); box(0.06, 0.8, 0.5, mPanel, LIFT_R - 0.06, y + 0.95, 0, 0); [["CUPOLA", 2], ["BRIDGE", 1], ["HABITAT", 0]].forEach(([lab, to], k) => button(lab, LIFT_R - 0.1, y + 1.6 - k * 0.24, 0, -Math.PI / 2, 0, () => goDeck(to), 0.42, 0.18, to === d ? "#4a5a2a" : "#2a3a48")); } }
// ---------- you: walking and the lift ----------
const P_ = { x: 0, z: -3.0, deck: 1 }; let yaw = 0, pitch = 0.05, dragging = false, down = null, started = false, vrDirty = true, msgT = 0, msgText = "";
const keys = {}; const intro = document.getElementById("intro"), FADE = document.createElement("div"); FADE.style.cssText = "position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .5s;z-index:5";
const HUD = document.createElement("div"); HUD.style.cssText = "position:fixed;left:14px;top:12px;z-index:2;background:rgba(8,16,24,.8);color:#e0eef6;padding:10px 14px;border-radius:10px;font:13px/1.5 -apple-system,Helvetica,sans-serif;max-width:600px";
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2;background:rgba(8,16,24,.9);color:#e8f2f8;padding:12px 18px;border-radius:12px;font:15px/1.5 -apple-system,Helvetica,sans-serif;max-width:800px;display:none";
document.body.append(HUD, MSG, FADE);
function say(t, secs = 12) { msgText = t; msgT = secs; MSG.innerHTML = t; MSG.style.display = "block"; vrDirty = true; }
function goDeck(d) { if (Math.hypot(P_.x, P_.z) > LIFT_R - 0.15) return say("Step into the lift first: the shaft in the middle of each deck, its door facing forward. The deck buttons are inside.", 6); if (d === P_.deck) return; FADE.style.opacity = 1; setTimeout(() => { P_.deck = d; P_.x = 0; P_.z = 0.2; yaw = 0; FADE.style.opacity = 0; say(`Lift: ${DECKS[d].name}. Walk out through the door ahead.`, 4); }, 450); }
function start() { if (started) return; started = true; intro?.classList.add("gone"); say("You are on the bridge of an antimatter starship in orbit near Earth. At the AUTOPILOT station (front left) choose a destination and press ENGAGE AUTOPILOT; the TRIP COMPUTER ahead shows both clocks and both velocities. To look out, take the lift behind you up to the CUPOLA.", 16); }
addEventListener("keydown", e => { keys[e.code] = true; start(); if (e.code === "KeyQ") goDeck(Math.min(2, P_.deck + 1)); if (e.code === "KeyZ") goDeck(Math.max(0, P_.deck - 1)); if (e.code === "BracketRight") warpI = Math.min(WARPS.length - 1, warpI + 1); if (e.code === "BracketLeft") warpI = Math.max(0, warpI - 1); });
addEventListener("keyup", e => keys[e.code] = false);
const ray = new THREE.Raycaster();
function pick(origin, dir) { ray.set(origin, dir); const hit = ray.intersectObjects(BUTTONS, false)[0]; if (hit && hit.distance < 8) { hit.object.userData.onPick(); hit.object.scale.setScalar(0.92); setTimeout(() => hit.object.scale.setScalar(1), 150); return true; } return false; }
renderer.domElement.addEventListener("pointerdown", e => { dragging = true; down = [e.clientX, e.clientY]; start(); });
addEventListener("pointerup", e => { dragging = false; if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 5 && !renderer.xr.isPresenting) { const m = new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1); ray.setFromCamera(m, camera); pick(ray.ray.origin.clone(), ray.ray.direction.clone()); } down = null; });
addEventListener("pointermove", e => { if (!dragging) return; yaw -= e.movementX * 0.004; pitch = clampN(pitch - e.movementY * 0.004, -1.5, 1.5); });
intro?.addEventListener("click", start);
// ---------- VR ----------
const VRB = document.getElementById("vr"), prevB = {}; let snap = true, vrTurn = 0;
const tap = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };
const stick = a => { if (!a) return [0, 0]; const q = a.length >= 4 && Math.abs(a[2]) + Math.abs(a[3]) >= Math.abs(a[0]) + Math.abs(a[1]) ? 2 : 0; const x = a[q] || 0, y = a[q + 1] || 0; return [Math.abs(x) > 0.15 ? x : 0, Math.abs(y) > 0.15 ? y : 0]; };
const CTRL = [0, 1].map(i => { const c = renderer.xr.getController(i); rig.add(c); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, -6)]), new THREE.LineBasicMaterial({ color: 0x8ad8ff })); c.add(ln);
  c.addEventListener("selectstart", () => { const o = new THREE.Vector3(), q = new THREE.Quaternion(); c.getWorldPosition(o); c.getWorldQuaternion(q); pick(o, V3(0, 0, -1).applyQuaternion(q)); }); return c; });
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 420; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.23), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 30; vrPanel.position.set(0, -0.32, -0.75); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
function drawVR(lines) { const g = vrC.getContext("2d"); g.clearRect(0, 0, 1024, 420); g.fillStyle = "rgba(8,16,24,.86)"; g.beginPath(); g.roundRect(0, 0, 1024, 420, 22); g.fill(); g.font = "26px -apple-system, Helvetica, sans-serif"; lines.forEach((t, i) => { g.fillStyle = i === 0 ? "#f0d890" : "#e0eef6"; g.fillText(t.replace(/<[^>]+>/g, "").slice(0, 70), 24, 44 + i * 36); }); vrT.needsUpdate = true; }
let SITTING = localStorage.getItem("vrPosture") === "sitting";
{ const card = intro?.querySelector(".card"), r = document.createElement("p"); r.innerHTML = 'In VR, are you <button data-p="standing">🧍 standing</button> or <button data-p="sitting">🪑 sitting</button>?';
  const paint = () => r.querySelectorAll("button").forEach(b => { b.style.cssText = "font:600 14px -apple-system,sans-serif;padding:6px 12px;margin:0 4px;border-radius:8px;cursor:pointer;border:2px solid #1d4e66;" + ((b.dataset.p === "sitting") === SITTING ? "background:#1d4e66;color:#fff" : "background:#fff;color:#1d4e66"); });
  r.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; e.stopPropagation(); SITTING = b.dataset.p === "sitting"; localStorage.setItem("vrPosture", b.dataset.p); paint(); }); paint(); card?.insertBefore(r, card.lastElementChild); }
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block";
  VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); renderer.xr.setFoveation(1.0); await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; s.addEventListener("end", () => { camera.position.set(0, 1.6, 0); vrPanel.visible = false; }); }; });
// ---------- the loop ----------
parkAt(0); setAttitude(bow);
const clock = new THREE.Clock(), fwd = V3(0, 0, 0), side = V3(0, 0, 0), UP = V3(0, 1, 0); let scrT = 0, hudT = 0, loopErrs = 0;
renderer.setAnimationLoop(() => { try { frame(); } catch (e) { if (loopErrs++ < 5) console.error(e); renderer.render(scene, camera); } });
function frame() { const dt = Math.min(clock.getDelta(), 0.1), vr = renderer.xr.isPresenting;
  if (started) stepFlight(dt);
  setAttitude(bow); const st = curState(), u = mode === "trip" ? trip.u : [1, 0, 0]; skyUniforms.uV.value.set(...u); skyUniforms.uBeta.value = st.v / C; skyUniforms.uGamma.value = st.gamma; skyUniforms.uEps.value = mode === "trip" ? Math.exp(-st.phi) / Math.cosh(st.phi) : 1;   // 1 - beta, computed without cancellation
  { const b = st.v / C; FWD.visible = b > 0.98; if (FWD.visible) { FWD.position.copy(eq2ship(u)).multiplyScalar(SKY_R * 0.9); FWD.scale.setScalar(SKY_R * 0.9 * clampN(0.01 + 0.008 * Math.log10(st.gamma), 0.01, 0.07)); } }
  const hideI = updateSystem(shipPos, coordMs); updateNamedStars(shipPos, hideI);
  // walking
  let mx = 0, my = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s?.inputSources || []) { const gp = src.gamepad; if (!gp) continue; const [ax, ay] = stick(gp.axes);
      if (src.handedness === "left") { mx += ax; my += ay; if (tap("L", gp, 4)) warpI = Math.max(0, warpI - 1); if (tap("L", gp, 5)) warpI = Math.min(WARPS.length - 1, warpI + 1); }
      else { if (tap("R", gp, 4)) goDeck((P_.deck + 1) % 3); if (Math.abs(ax) > 0.7 && snap) { vrTurn -= Math.sign(ax) * Math.PI / 6; snap = false; } else if (Math.abs(ax) < 0.3) snap = true; } }
    rig.rotation.y = vrTurn; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyAxisAngle(UP, vrTurn); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; if (keys.ArrowLeft) yaw += 1.6 * dt; if (keys.ArrowRight) yaw -= 1.6 * dt; }
  fwd.y = 0; fwd.normalize(); side.set(-fwd.z, 0, fwd.x);
  if (mx || my) { const sp = 1.4 * dt, nx = P_.x + (fwd.x * -my + side.x * mx) * sp, nz = P_.z + (fwd.z * -my + side.z * mx) * sp; if (walkable(P_.deck, nx, nz)) { P_.x = nx; P_.z = nz; } else if (walkable(P_.deck, nx, P_.z)) P_.x = nx; else if (walkable(P_.deck, P_.x, nz)) P_.z = nz; }
  rig.position.set(P_.x, DECKS[P_.deck].y + (vr && SITTING ? 0.45 : 0), P_.z);
  // screens and messages
  scrT -= dt; if (scrT <= 0) { scrT = 0.25; drawTrip(); drawAuto(); drawNav(); drawEng(); drawShip(); }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; msgText = ""; }
  hudT -= dt; if (hudT <= 0) { hudT = 0.25; HUD.innerHTML = `<b>${DECKS[P_.deck].name}</b> · ${mode === "trip" ? `to <b>${STARS[trip.dest].name}</b>, ${st.phase}` : mode === "align" ? "turning to the course" : `in orbit near ${parkName()}`} · time: ${WARPS[warpI][1]}<br>ship ${fmtDate(properMs)} · stars ${fmtDate(coordMs)}<br>map velocity v = ${fmtKms(st.v)} (${fmtC(st.v)}) · proper velocity w = ${fmtKms(st.w)} (${fmtC(st.w)}) · γ = ${fmtG(st.gamma)}<br><span style="color:#8ab0c4;font-size:12px">WASD walk · drag to look · click the console buttons · [ ] time · Q/Z lift up/down (in the lift)</span>`;
    if (vr) drawVR([`${mode === "trip" ? "to " + STARS[trip.dest].name + " · " + st.phase : "in orbit near " + parkName()} · ${WARPS[warpI][1]}`, `ship ${fmtDate(properMs)}`, `stars ${fmtDate(coordMs)}`, `v ${fmtKms(st.v)}  w ${fmtKms(st.w)}  gamma ${fmtG(st.gamma)}`, msgText.slice(0, 70), msgText.slice(70, 140), "trigger: press buttons · A in the lift: next deck · X/Y: time"]); }
  renderer.render(scene, camera); }
