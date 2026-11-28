// hole.js -- A hole through your floor, in mixed reality: a 5-ft shaft opens in your real floor, a ladder goes down through a (made-up)
// basement and on down a lit shaft through the real rock under Glen Carbon, Illinois: the glacial loess and till, the coal-bearing Pennsylvanian
// shales and coals that Glen Carbon mined, the Mississippian limestones full of crinoids, and on down to granite 4,400 ft below. Fossils are set in
// the walls where they occur. In a headset that can show your room (Quest), the shaft is drawn only through the hole, so your real floor stays
// around it; below the floor the shaft surrounds you. Built into hole.html by build.py.
const FT2M = 0.3048;
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true }); renderer.setClearColor(0x000000, 0); renderer.setPixelRatio(Math.min(devicePixelRatio, IS_HEADSET ? 1 : 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.xr.enabled = true; document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 3000), rig = new THREE.Group(); rig.add(camera); scene.add(rig); camera.position.set(0, 1.6, 0);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), clampN = THREE.MathUtils.clamp, lerpN = THREE.MathUtils.lerp, UP = V3(0, 1, 0);
const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
// the portal: the hole's opening writes 1 into the stencil buffer; everything below the floor draws only where the stencil is 1 (while you are above
// the floor), so in mixed reality your real floor stays visible all round the hole
const UNDER = []; function under(mat) { if (mat.userData.under) return mat; mat.userData.under = true; mat.stencilWrite = true; mat.stencilRef = 1; mat.stencilFunc = THREE.EqualStencilFunc; mat.stencilFail = mat.stencilZFail = mat.stencilZPass = THREE.KeepStencilOp; UNDER.push(mat); return mat; }
function setPortal(on) { for (const m of UNDER) m.stencilFunc = on ? THREE.EqualStencilFunc : THREE.AlwaysStencilFunc; }
const HOLE = new THREE.Group(); scene.add(HOLE);   // the hole and everything under it move together when you place the hole
const R_HOLE = 5 * FT2M / 2, BASE_CEIL = -0.35, BASE_FLOOR = -2.75, GRADE = -0.75;   // the hole is 5 ft across; the basement is under a 35-cm floor; the ground outside is 75 cm below your floor
const depthFt = y => Math.max(0, (GRADE - y) / FT2M), yOfFt = ft => GRADE - ft * FT2M;
