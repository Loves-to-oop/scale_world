// blower.js -- practise replacing the heater/AC blower motor of a 2018 Nissan Sentra (the B17 generation, 2013-2019; this car built 12/17), in VR or on a
// screen: a life-size car on the driveway of a house with a garage, and a step-by-step walk-through of the whole job, from working out
// whether it is the motor at all, through what to buy and where, to putting the last screw back. Built into blower.html by build.py.
//
// The procedure follows the Nissan service manual for the B17 Sentra (blower motor: remove the glove box assembly, disconnect the
// harness connector, remove the blower motor screws, remove the motor; glove box: remove the instrument side finisher RH, then the
// glove box upper and lower screws), the fuse chart (blower motor fuses F6 and F8, 15 A, in the passenger-compartment fuse box at the
// driver's end of the dashboard), and parts-supplier guides. The car is modelled at its real size (4.63 m long, 1.76 m wide); its
// parts are simplified, and screw counts and positions may differ a little on your car: count them as you go.
const IS_HEADSET = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = !IS_HEADSET; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xb8d0e4); scene.fog = new THREE.Fog(0xb8d0e4, 70, 260);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.02, 600);
const rig = new THREE.Group(); rig.add(camera); scene.add(rig);
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, ...o });
const box = (w, h, d, mat, x, y, z, parent = scene, cast = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
const cyl = (r1, r2, h, mat, x, y, z, parent = scene, seg = 20) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };

// ---------- light, ground, street, house and garage ----------
scene.add(new THREE.HemisphereLight(0xe4eef8, 0x6a6656, 0.95));
const sun = new THREE.DirectionalLight(0xfff4e0, 2.2); sun.position.set(-18, 28, -14); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); sun.shadow.bias = -0.0004; scene.add(sun);
const lawnM = M(0x6f8f4a, { roughness: 1 }), concreteM = M(0xb9b4aa, { roughness: 0.95 }), asphaltM = M(0x4a4a4c, { roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lawnM); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const flat = (w, d, mat, x, z, y = 0.005) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
flat(6.4, 24.5, concreteM, 0, -3.75); flat(400, 9, asphaltM, 0, -22.5); flat(400, 1.6, concreteM, 0, -17.2, 0.01);   // driveway, street, sidewalk
for (let x = -60; x <= 60; x += 6) flat(2.2, 0.15, M(0xe8e4d8), x, -22.5, 0.012);   // the road's centre line
// the garage: open door facing the street, a workbench along the back wall, a pegboard, and the parts list on the side wall
const wallM = M(0xd8cfbf, { roughness: 0.9 }), trimM = M(0xf2efe8), roofM = M(0x5a4e46, { roughness: 0.9 });
const G0 = { x0: -3.4, x1: 3.4, z0: 8, z1: 15, h: 3.0 };
box(G0.x1 - G0.x0, G0.h, 0.2, wallM, 0, G0.h / 2, G0.z1); box(0.2, G0.h, G0.z1 - G0.z0, wallM, G0.x1, G0.h / 2, (G0.z0 + G0.z1) / 2); box(0.2, G0.h, G0.z1 - G0.z0, wallM, G0.x0, G0.h / 2, (G0.z0 + G0.z1) / 2);
box(0.6, G0.h, 0.2, wallM, G0.x0 + 0.3, G0.h / 2, G0.z0); box(0.6, G0.h, 0.2, wallM, G0.x1 - 0.3, G0.h / 2, G0.z0); box(G0.x1 - G0.x0, 0.7, 0.2, wallM, 0, G0.h - 0.35, G0.z0);
box(G0.x1 - G0.x0 + 0.6, 0.15, G0.z1 - G0.z0 + 0.6, roofM, 0, G0.h + 0.08, (G0.z0 + G0.z1) / 2); flat(G0.x1 - G0.x0, G0.z1 - G0.z0, M(0xa8a39a), 0, (G0.z0 + G0.z1) / 2, 0.008);
const fill = new THREE.PointLight(0xfff4e8, 0, 2.2, 1.6); fill.position.set(-0.95, 0.55, 0.8); scene.add(fill);   // daylight through the open door, under the dash
const bayLight = new THREE.PointLight(0xfff4e8, 0, 2.5, 1.4); bayLight.position.set(0.2, 1.35, 1.75); scene.add(bayLight);   // daylight into the engine bay with the hood up
const glight = new THREE.PointLight(0xfff0d8, 6, 12, 1.5); glight.position.set(0, 2.8, 12); scene.add(glight);
const bench = box(3.2, 0.06, 0.75, M(0x8a6a48), 0, 0.92, 14.45); for (const x of [-1.5, 1.5]) for (const z of [14.15, 14.75]) box(0.06, 0.9, 0.06, M(0x5a5a5a), x, 0.45, z);
box(3.2, 1.1, 0.03, M(0xc8a878), 0, 1.75, 14.88);   // pegboard
// the house beside the garage
box(11, 5.6, 9, M(0xe6dccb), -9.1, 2.8, 11.5); const roofG = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.8, 2.6, 4, 1), roofM); roofG.rotation.y = Math.PI / 4; roofG.scale.set(1.15, 1, 0.95); roofG.position.set(-9.1, 6.9, 11.5); roofG.castShadow = true; scene.add(roofG);
for (const [x, y] of [[-12.5, 1.5], [-6.0, 1.5], [-12.5, 4.2], [-9.1, 4.2], [-6.0, 4.2]]) { box(1.3, 1.3, 0.08, M(0x2a3644, { roughness: 0.2, metalness: 0.3 }), x, y, 6.98); box(1.45, 0.08, 0.12, trimM, x, y - 0.7, 6.96); }
box(1.1, 2.2, 0.1, M(0x6a3a2a), -9.1, 1.1, 6.98); flat(1.4, 9, concreteM, -9.1, 2.5, 0.008);   // front door and path
for (const [x, z, s] of [[-17, -6, 1.2], [9, 2, 1.0], [-15, -12, 0.9], [11, -10, 1.3]]) { cyl(0.18 * s, 0.25 * s, 2.4 * s, M(0x5a4430), x, 1.2 * s, z); const c = new THREE.Mesh(new THREE.SphereGeometry(1.7 * s, 12, 9), M(0x4f7a3a, { roughness: 1 })); c.position.set(x, 3.4 * s, z); c.castShadow = true; scene.add(c); }

// ---------- the car: a 2018 Nissan Sentra (same body as 2013-2019) at its real size, nose toward the garage (+z); its passenger (right) side faces -x ----------
// Length 4.625 m, width 1.760 m, height 1.495 m, wheelbase 2.700 m, 205/55R16 tyres. Simplified shapes; the parts you work on are where
// the service manual puts them.
const car = new THREE.Group(); scene.add(car);
const paint = M(0x9ea6ae, { metalness: 0.65, roughness: 0.32 }), glass = M(0x1c262e, { metalness: 0.3, roughness: 0.08, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
const blackM = M(0x141414, { roughness: 0.6 }), plastic = M(0x2b2b2e, { roughness: 0.85 }), fabric = M(0x3a3a40, { roughness: 1 }), metal = M(0x9a9a9a, { metalness: 0.8, roughness: 0.35 });
const AX = [1.36, -1.34], TR = 0.316;   // the axles (z) and the tyre radius
const topY = z => { const P = [[-2.31, 0.74], [-2.25, 0.95], [-1.55, 1.0], [1.15, 1.0], [2.2, 0.86], [2.31, 0.74]]; for (let i = 1; i < P.length; i++) if (z <= P[i][0]) { const f = (z - P[i - 1][0]) / (P[i][0] - P[i - 1][0]); return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * f; } return 0.74; };
const botY = z => { for (const a of AX) if (Math.abs(z - a) < 0.38) return Math.max(0.2, TR + Math.sqrt(0.38 * 0.38 - (z - a) ** 2)); return z < -2.2 || z > 2.2 ? 0.3 : 0.2; };
// a slab of body: the side profile between z0 and z1, extruded across x0..x1
function slab(z0, z1, x0, x1, mat, parent = car, top = topY, bot = botY, thick = null) { const sh = new THREE.Shape(), n = Math.max(2, Math.ceil((z1 - z0) / 0.04));
  for (let i = 0; i <= n; i++) { const z = z0 + (z1 - z0) * i / n; i ? sh.lineTo(z, top(z)) : sh.moveTo(z, top(z)); }
  for (let i = n; i >= 0; i--) { const z = z0 + (z1 - z0) * i / n; sh.lineTo(z, thick ? top(z) - thick : bot(z)); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x1, 0, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
slab(-2.31, -0.95, -0.88, 0.88, paint); slab(2.14, 2.31, -0.88, 0.88, paint);   // the trunk and rear; the front bumper
for (const s of [-1, 1]) slab(1.15, 2.31, s > 0 ? 0.7 : -0.88, s > 0 ? 0.88 : -0.7, paint);   // front fenders
slab(-0.95, 1.15, 0.8, 0.88, paint); slab(-0.95, 0.0, -0.88, -0.8, paint);   // driver's doors; passenger rear door
box(1.68, 0.1, 2.1, blackM, 0, 0.25, 0.1, car); box(1.6, 0.9, 0.08, plastic, 0, 0.62, 1.16, car);   // floor; firewall
// the passenger front door, hinged at its front edge
const doorP = new THREE.Group(); doorP.position.set(-0.84, 0, 1.15); car.add(doorP); const doorSkin = slab(0.0, 1.15, -0.88, -0.8, paint, doorP); doorSkin.position.set(0.84, 0, -1.15);
const roofZ = z => z > 0.3 ? 1.47 - (z - 0.3) / 0.85 * 0.47 : z > -0.6 ? 1.47 + 0.025 * Math.sin((z + 0.6) / 0.9 * Math.PI) : 1.47 - (-0.6 - z) / 0.85 * 0.45;
const sideGlass = (z0, z1, x, parent, off = null) => { const sh = new THREE.Shape(); sh.moveTo(z0, 1.0); for (let i = 0; i <= 20; i++) { const z = z0 + (z1 - z0) * i / 20; sh.lineTo(z, roofZ(z) - 0.06); } sh.lineTo(z1, 1.0); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x, 0, 0); const m = new THREE.Mesh(g, glass); if (off) m.position.set(...off); parent.add(m); return m; };
sideGlass(-1.35, 1.1, 0.74, car); sideGlass(-1.35, 0.0, -0.73, car); sideGlass(0.02, 1.1, -0.73, doorP, [0.84, 0, -1.15]);
box(1.4, 0.035, 0.95, paint, 0, 1.485, -0.15, car);   // the roof
const quad = (a, b, c, d, mat, parent = car) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); parent.add(m); return m; };
quad([-0.7, 1.0, 1.15], [0.7, 1.0, 1.15], [0.68, 1.47, 0.32], [-0.68, 1.47, 0.32], glass); quad([-0.68, 1.47, -0.62], [0.68, 1.47, -0.62], [0.7, 1.02, -1.45], [-0.7, 1.02, -1.45], glass);   // windscreen, rear window
for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.98), paint); p.position.set(s * 0.71, 1.24, 0.73); p.rotation.x = Math.atan2(0.47, 0.83); car.add(p); const c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), paint); c.position.set(s * 0.71, 1.25, -1.03); c.rotation.x = -Math.atan2(0.45, 0.83); car.add(c); box(0.05, 0.47, 0.06, paint, s * 0.74, 1.24, 0.0, car); }
for (const z of AX) for (const s of [-1, 1]) { const t = cyl(TR, TR, 0.205, blackM, s * 0.77, TR, z, car, 28); t.rotation.z = Math.PI / 2; const r = cyl(0.2, 0.2, 0.21, metal, s * 0.775, TR, z, car, 18); r.rotation.z = Math.PI / 2; }
for (const s of [-1, 1]) { box(0.36, 0.09, 0.05, M(0xf4f4ee, { emissive: 0x222222 }), s * 0.6, 0.8, 2.29, car); box(0.32, 0.1, 0.05, M(0x8a1010, { emissive: 0x200000 }), s * 0.62, 0.86, -2.3, car); box(0.06, 0.1, 0.14, paint, s * 0.95, 1.03, 1.0, car); }
box(0.62, 0.16, 0.04, blackM, 0, 0.55, 2.31, car);   // the grille
// the hood, hinged at the back; under it the engine and, at the driver's (left) front, the battery
const hood = new THREE.Group(); hood.position.set(0, topY(1.17), 1.17); car.add(hood); const hoodSkin = slab(1.17, 2.17, -0.85, 0.85, paint, hood, z => topY(z) + 0.012, null, 0.03); hoodSkin.position.set(0, -topY(1.17), -1.17);
box(1.35, 0.12, 0.95, blackM, 0, 0.5, 1.68, car); box(0.6, 0.4, 0.45, M(0x3a3a3c, { metalness: 0.5, roughness: 0.5 }), -0.1, 0.72, 1.62, car); box(0.5, 0.08, 0.3, M(0x222226), -0.1, 0.95, 1.6, car);
const battery = new THREE.Group(); battery.position.set(0.5, 0.62, 1.86); car.add(battery); box(0.24, 0.2, 0.17, M(0x1e1e1e), 0, 0.1, 0, battery); box(0.25, 0.015, 0.18, M(0x2e2e30), 0, 0.205, 0, battery);
const posT = cyl(0.016, 0.018, 0.03, M(0xb02020), -0.07, 0.225, 0.04, battery, 10), negT = cyl(0.016, 0.018, 0.03, M(0x2a2a2a), -0.07, 0.225, -0.05, battery, 10);
const negClamp = new THREE.Group(); negClamp.position.set(-0.07, 0.235, -0.05); battery.add(negClamp); box(0.05, 0.025, 0.04, metal, 0, 0, 0, negClamp); const negNut = cyl(0.009, 0.009, 0.012, metal, 0.012, 0.016, 0.012, negClamp, 6); const negCable = cyl(0.008, 0.008, 0.22, blackM, 0, 0.0, -0.13, negClamp, 8); negCable.rotation.x = Math.PI / 2;

// ---------- inside: dashboard, glove box, the blower motor under the dash, fuse box, seats ----------
const dashM = M(0x25252a, { roughness: 0.85 });
box(1.06, 0.47, 0.32, dashM, 0.31, 0.785, 1.0, car); box(1.68, 0.1, 0.42, dashM, 0, 1.03, 0.98, car);   // the driver's half and centre of the dash; its top
box(0.62, 0.17, 0.32, dashM, -0.53, 0.925, 1.0, car); box(0.16, 0.26, 0.32, dashM, -0.76, 0.71, 1.0, car);   // above the glove box; the right end column
const finisher = box(0.012, 0.42, 0.26, M(0x303034), -0.846, 0.79, 0.99, car);   // the instrument side finisher RH, on the end of the dash
const gloveG = new THREE.Group(); gloveG.position.set(-0.45, 0.6, 0.835); car.add(gloveG);   // the glove box: door (hinged at the bottom) and bin
const gloveDoor = new THREE.Group(); gloveG.add(gloveDoor); box(0.46, 0.24, 0.025, M(0x2c2c31), 0, 0.12, 0, gloveDoor); box(0.08, 0.02, 0.01, metal, 0, 0.21, -0.016, gloveDoor);
const gloveBin = box(0.42, 0.21, 0.19, M(0x1c1c1e), 0, 0.115, 0.11, gloveG); const manual = box(0.15, 0.03, 0.21, M(0x88332a), -0.08, 0.04, 0.1, gloveG);
const hvac = box(0.5, 0.44, 0.12, M(0x3a3a3c), -0.37, 0.64, 1.1, car); box(0.3, 0.12, 0.22, M(0x3a3a3c), -0.4, 0.49, 1.03, car);   // the heater/AC unit behind the glove box and its blower housing
const filterDoor = box(0.24, 0.07, 0.012, M(0x505054), -0.42, 0.7, 1.035, car); const filterOld = box(0.22, 0.05, 0.2, M(0x9a8a6a), -0.42, 0.7, 1.08, car); filterOld.visible = false;
const resistor = box(0.06, 0.035, 0.05, M(0x4a4a50), -0.2, 0.43, 1.02, car);
// the blower motor: a round housing under the heater unit, three screws through its flange, a harness connector on its side
const motor = new THREE.Group(); motor.position.set(-0.42, 0.4, 0.99); car.add(motor);
const flange = cyl(0.135, 0.135, 0.014, M(0x3e3e42), 0, 0.052, 0, motor, 28), can = cyl(0.12, 0.11, 0.09, M(0x48484c), 0, 0, 0, motor, 28), cap = cyl(0.055, 0.055, 0.05, metal, 0, -0.065, 0, motor, 16);
const screws = [0, 1, 2].map(k => { const a = k / 3 * Math.PI * 2 + 0.4, s = cyl(0.008, 0.008, 0.02, metal, Math.cos(a) * 0.123, 0.064, Math.sin(a) * 0.123, motor, 8); s.userData.home = s.position.clone(); return s; });
const connector = new THREE.Group(); connector.position.set(0.12, -0.01, -0.05); motor.add(connector); box(0.04, 0.035, 0.03, M(0x1a1a1a), 0, 0, 0, connector); const wire = cyl(0.006, 0.006, 0.25, M(0x101010), 0.14, 0.05, 0, connector, 6); wire.rotation.z = 1.1;
const newMotor = motor.clone(true); newMotor.visible = false; car.add(newMotor);
// the fuse box at the driver's end of the dash (passenger-compartment fuses F6 and F8: 15 A, blower motor)
const fuseCover = box(0.17, 0.12, 0.012, M(0x2c2c31), 0.7, 0.6, 0.836, car);
const fusePanel = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshBasicMaterial({ map: canvasTex(320, 220, (g, w, h) => { g.fillStyle = "#1e1e22"; g.fillRect(0, 0, w, h); let k = 1; for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++, k++) { const x = 18 + c * 50, y = 22 + r * 66; g.fillStyle = k === 6 || k === 8 ? "#d8c040" : ["#d84040", "#3a7ad8", "#e8e8e8", "#40a040"][k % 4]; g.fillRect(x, y, 30, 38); g.fillStyle = "#ddd"; g.font = "16px sans-serif"; g.fillText("F" + k, x, y + 56); } }), toneMapped: false }));
fusePanel.position.set(0.7, 0.6, 0.842); fusePanel.rotation.y = Math.PI; car.add(fusePanel); fusePanel.visible = false;
const fuseHits = [6, 8].map(k => { const i = k - 1, c = i % 6, r = Math.floor(i / 6), m = box(0.016, 0.022, 0.01, new THREE.MeshBasicMaterial({ color: 0xd8c040 }), 0.7 + 0.08 - (18 + c * 50 + 15) / 320 * 0.16, 0.6 + 0.055 - (22 + r * 66 + 19) / 220 * 0.11, 0.838, car); m.visible = false; return m; });
const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.022, 10, 32), plastic); wheel.position.set(0.37, 0.93, 0.7); wheel.rotation.x = -0.35; car.add(wheel); cyl(0.03, 0.03, 0.3, plastic, 0.37, 0.98, 0.82, car).rotation.x = Math.PI / 2 - 0.35;
const fanKnob = cyl(0.03, 0.03, 0.025, M(0x505055), 0.05, 0.77, 0.835, car, 18); fanKnob.rotation.x = Math.PI / 2; box(0.025, 0.006, 0.01, M(0xf0f0f0), 0.05, 0.785, 0.82, car);
for (const x of [-0.08, 0.12]) box(0.12, 0.05, 0.01, blackM, x, 0.92, 0.834, car);   // centre vents
const seat = (x, parent) => { const g = new THREE.Group(); g.position.set(x, 0, 0.15); parent.add(g); box(0.5, 0.12, 0.5, fabric, 0, 0.44, 0, g); const b = box(0.5, 0.62, 0.1, fabric, 0, 0.78, -0.27, g); b.rotation.x = -0.18; box(0.26, 0.16, 0.08, fabric, 0, 1.18, -0.33, g); return g; };
const seatD = seat(0.37, car), seatP = seat(-0.37, car); box(1.4, 0.14, 0.5, fabric, 0, 0.46, -0.7, car); box(1.4, 0.55, 0.1, fabric, 0, 0.78, -0.95, car);   // rear bench
box(0.22, 0.2, 0.7, plastic, 0, 0.4, 0.35, car); const brake = box(0.04, 0.03, 0.22, M(0x3a3a3e), 0.0, 0.53, 0.2, car); brake.rotation.x = 0.35;   // console and parking brake
box(0.6, 0.01, 0.55, M(0x18181a), -0.4, 0.305, 0.75, car);   // the passenger floor mat, where you lie to work
const handle = box(0.02, 0.025, 0.14, M(0x8a9098, { metalness: 0.7 }), -0.055, 0.9, -0.53, doorP);   // on the door, so it goes with it

// ---------- the workbench: what you need, to buy and to have ----------
const KIT = new Set(), ITEMS = {};
const item = (id, name, need, where, make, x) => { const g = new THREE.Group(); g.position.set(x, 0.95, 14.4); scene.add(g); make(g); ITEMS[id] = { id, name, need, where, g }; g.userData.item = id; return g; };
item("motor", "Blower motor with fan wheel, for a 2018 Nissan Sentra", true, "An auto parts store (AutoZone, O'Reilly, Advance, NAPA), a Nissan dealer's parts counter (give them your VIN for the exact Nissan part), or online (RockAuto, Amazon). Ask for the 2018 Sentra (model year from your registration, not the 12/17 build date on the door label); parts listed for 2013-2019 Sentras fit. Compare the connector and mounting flange with your old one before you install it. Aftermarket motors are usually a few tens of dollars; Nissan's own costs more.", g => { box(0.3, 0.2, 0.3, M(0xc89a4a), 0, 0.1, 0, g); }, -1.25);
item("filter", "Cabin air filter (optional, recommended)", false, "The same stores. It sits behind the glove box, so while the glove box is out is the easiest time to change it. Buy one listed for the 2013-2019 Sentra.", g => { box(0.26, 0.06, 0.22, M(0xe8e4dc), 0, 0.03, 0, g); }, -0.85);
item("phillips", "Phillips No. 2 screwdriver (a magnetic tip helps)", true, "Any hardware or auto parts store; you may already have one. A short stubby one helps under the dash.", g => { cyl(0.012, 0.012, 0.11, M(0xc83a2a), 0, 0.012, 0, g, 10).rotation.z = Math.PI / 2; cyl(0.003, 0.003, 0.1, metal, 0.1, 0.012, 0, g, 6).rotation.z = Math.PI / 2; }, -0.55);
item("trim", "Plastic trim removal tool", true, "Auto parts stores sell sets cheaply. Plastic, so it will not scratch or crack the dash trim (a flat screwdriver wrapped in tape will do at a pinch).", g => { box(0.18, 0.008, 0.03, M(0x2a5ad8), 0, 0.005, 0, g); }, -0.3);
item("wrench", "10 mm wrench or socket", true, "For the battery's negative terminal nut. Hardware or auto parts store.", g => { box(0.16, 0.008, 0.02, metal, 0, 0.005, 0, g); }, -0.05);
item("light", "Flashlight or headlamp", true, "It is dark under the dash. A headlamp leaves both hands free.", g => { cyl(0.018, 0.018, 0.14, M(0x222222), 0, 0.02, 0, g, 12).rotation.z = Math.PI / 2; }, 0.2);
item("glasses", "Safety glasses", true, "Dust, leaves and grit fall out of the blower housing when you drop the motor.", g => { box(0.14, 0.04, 0.03, M(0x88aacc, { transparent: true, opacity: 0.7 }), 0, 0.02, 0, g); }, 0.45);
item("meter", "Multimeter (optional)", false, "Any hardware store. Lets you check that power is reaching the motor before you buy one.", g => { box(0.08, 0.03, 0.14, M(0xe0b020), 0, 0.015, 0, g); }, 0.7);
item("tray", "Small tray or magnetic dish for screws (optional)", false, "So the little screws do not vanish under the seat.", g => { cyl(0.06, 0.05, 0.02, metal, 0, 0.01, 0, g, 16); }, 0.95);
// the parts list on the garage wall
const listBoard = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.05), new THREE.MeshStandardMaterial({ map: canvasTex(1800, 630, (g, w, h) => { g.fillStyle = "#f6f2e6"; g.fillRect(0, 0, w, h); g.fillStyle = "#2a2218"; g.font = "bold 40px sans-serif"; g.fillText("Blower motor job: what you need", 30, 58);
  g.font = "30px sans-serif"; let y = 112; for (const it of Object.values(ITEMS)) { g.fillStyle = it.need ? "#2a2218" : "#6a5a44"; g.fillText((it.need ? "■ " : "□ ") + it.name, 30, y); y += 52; } g.font = "italic 22px sans-serif"; g.fillStyle = "#6a5a44"; g.fillText("■ needed   □ optional.  Click each item on the bench to take it.", 30, h - 26); }), roughness: 0.9 }));
listBoard.position.set(0, 1.75, 14.86); listBoard.rotation.y = Math.PI; scene.add(listBoard);
const kitMat = new THREE.Group(); kitMat.position.set(-1.45, 0.01, 0.9); scene.add(kitMat); flat(0.8, 0.6, M(0x7a2a2a), -1.45, 0.9, 0.012); kitMat.visible = false;   // where your kit sits, by the passenger door

// ---------- labels on the parts ----------
const labelOf = (txt) => { const t = canvasTex(512, 96, (g, w, h) => { g.fillStyle = "rgba(20,20,24,.85)"; g.beginPath(); g.roundRect(0, 0, w, h, 18); g.fill(); g.fillStyle = "#ffe9a8"; g.font = "bold 40px sans-serif"; g.textAlign = "center"; g.fillText(txt, w / 2, 62); }); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, toneMapped: false })); s.scale.set(0.32, 0.06, 1); s.renderOrder = 10; s.visible = false; scene.add(s); return s; };
const LABELS = {}; const label = (key, txt, obj, dy = 0.08) => { LABELS[key] = { s: labelOf(txt), obj, dy }; };
label("finisher", "Instrument side finisher RH", finisher, 0.28); label("motor", "Blower motor", motor, -0.14); label("connector", "Harness connector", connector, -0.06); label("resistor", "Blower resistor", resistor, -0.06);
label("filter", "Cabin filter cover", filterDoor, 0.07); label("neg", "Negative (−) terminal", negClamp, 0.09); label("fuse6", "F6 15A", fuseHits[0], 0.04); label("fuse8", "F8 15A", fuseHits[1], 0.04); label("knob", "Fan speed", fanKnob, 0.06);
function showLabels(keys) { for (const k in LABELS) LABELS[k].s.visible = keys.includes(k); }
function placeLabels() { for (const k in LABELS) { const L = LABELS[k]; if (!L.s.visible) continue; const p = new THREE.Vector3(); L.obj.getWorldPosition(p); L.s.position.set(p.x, p.y + L.dy, p.z); } }

// ---------- animation ----------
const TWEENS = []; const tween = (dur, f, done) => TWEENS.push({ t: 0, dur, f, done });
function tweenStep(dt) { for (let i = TWEENS.length - 1; i >= 0; i--) { const T = TWEENS[i]; T.t = Math.min(T.dur, T.t + dt); const k = T.t / T.dur, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; T.f(e); if (T.t >= T.dur) { TWEENS.splice(i, 1); T.done && T.done(); } } }
const unscrew = (s, done) => { const p0 = s.position.clone(); tween(0.8, e => { s.rotation.y = e * 12; s.position.y = p0.y - e * 0.03; }, () => { s.visible = false; done && done(); }); };
const screwIn = (s, done) => { s.visible = true; const p = s.userData.home; tween(0.8, e => { s.rotation.y = (1 - e) * 12; s.position.y = p.y - (1 - e) * 0.03; }, done); };
// the glove box's own screws: three along the top of its opening, three along the bottom
const gScrews = [[-0.62, 0.845], [-0.45, 0.845], [-0.28, 0.845], [-0.62, 0.585], [-0.45, 0.585], [-0.28, 0.585]].map(([x, y]) => { const s = cyl(0.007, 0.007, 0.018, metal, x, y, 0.86, car, 8); s.rotation.x = Math.PI / 2; s.userData.home = s.position.clone(); return s; });
gScrews.forEach(s => { s.visible = false; });

// ---------- airflow from the vents when the fan runs ----------
const AIR = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(240 * 3), 3)), new THREE.PointsMaterial({ color: 0xdfefff, size: 0.012, transparent: true, opacity: 0.7 }));
car.add(AIR); AIR.visible = false; let fanSpeed = 0;
function airStep(dt) { if (!AIR.visible) return; const p = AIR.geometry.attributes.position; for (let i = 0; i < 240; i++) { let z = p.getZ(i) - dt * (0.3 + fanSpeed * 0.35); if (z < 0.2 || !p.getZ(i)) { p.setXYZ(i, (i % 2 ? -0.08 : 0.12) + (Math.random() - 0.5) * 0.1, 0.92 + (Math.random() - 0.5) * 0.04, 0.82 - Math.random() * 0.05); continue; } p.setZ(i, z); } p.needsUpdate = true; }

// ---------- the steps ----------
// Each step: a title, what to do, why (and what can go wrong), where to stand, and the things to click (in order, or in any order).
const S = { diag: null, battery: true, motorOut: false };
const V = (x, y, z, lx, ly, lz) => ({ p: [x, y, z], l: [lx, ly, lz] });
const VIEW = { side: V(-2.2, 1.6, -0.3, -0.84, 0.9, 0.9), driver: V(0.37, 1.12, 0.1, 0.3, 1.0, 0.9), dash: V(-1.15, 1.05, 0.55, -0.45, 0.68, 1.0), under: V(-0.66, 0.48, 0.42, -0.42, 0.46, 0.99), hood: V(0.5, 1.65, 3.6, 0.45, 0.8, 1.85), bench: V(0, 1.6, 12.4, 0, 1.0, 14.4), fuse: V(1.45, 1.0, 0.55, 0.7, 0.6, 0.84), front: V(-1.8, 1.6, -3.2, 0, 0.8, 0) };
const anyHit = (objs, act) => objs.map(o => ({ o, act }));
const STEPS = [
  { t: "Welcome", d: "This is a full practice run of replacing the heater/AC blower motor on your 2018 Nissan Sentra (built 12/17; the same blower motor as every 2013-2019 Sentra): first making sure the motor is really the problem, then getting the right part and tools, then doing the job step by step. Click the glowing things to do each step (in VR, point and pull the trigger).", w: "Plan about 45 minutes the first time. Work on a level driveway in daylight. Nothing here needs force: if a part will not come, look for a screw or clip you missed.", v: "side", cont: true },
  { t: "1. What is the fan doing?", d: "Sit in the driver's seat, turn the key or push the start button to ON, and try the fan at every speed. Then click the card that matches what happens.", w: "The fan's symptom tells you which part has failed, before you buy anything.", v: "driver", choice: true },
  { t: "1b. Check the two blower fuses", d: "Open the fuse box cover at the driver's end of the dashboard, low down by your left knee. Find fuses F6 and F8 (15 A, BLOWER MOTOR) and look at each: the metal strip inside should be unbroken. Click the cover, then each fuse.", w: "If one is blown, replace it with a 15 A fuse only. If the new fuse blows again soon, the motor is probably seized and drawing too much current: replace the motor.", v: "fuse", skip: () => S.diag !== "none", hits: () => [{ o: fuseCover, act: done => { tween(0.5, e => { fuseCover.position.z = 0.836 - e * 0.12; fuseCover.position.y = 0.6 - e * 0.25; }, () => { fuseCover.visible = false; fusePanel.visible = true; fuseHits.forEach(f => f.visible = true); showLabels(["fuse6", "fuse8"]); done(); }); } }, ...anyHit(fuseHits, (done, o) => { say("Fuse " + (o === fuseHits[0] ? "F6" : "F8") + ": the strip is intact. This fuse is good."); done(); })], after: () => { fusePanel.visible = false; fuseHits.forEach(f => f.visible = false); fuseCover.visible = true; fuseCover.position.set(0.7, 0.6, 0.836); } },
  { t: "2. Get the right part and the tools", d: "In the garage: read the list on the wall, then click each needed item on the workbench to take it (the optional ones too, if you like). The panel tells you what each is and where to buy it.", w: "Buy the motor by model year (2018 Nissan Sentra, from your registration), or give the parts counter your VIN, the surest way. Keep the receipt: compare the new motor's connector and flange with the old one before you fit it.", v: "bench", bench: true },
  { t: "3. Park safely", d: "Car in Park on level ground, engine off. Set the parking brake: click the lever between the seats.", w: "Never work under the dash with the engine running.", v: "driver", hits: () => [{ o: brake, act: done => tween(0.4, e => { brake.rotation.x = 0.35 + e * 0.35; }, done) }] },
  { t: "4. Open the passenger door; move the seat back", d: "Click the passenger door handle, then the passenger seat to slide it all the way back. Lay your kit on the mat by the door.", w: "Room to lie on your back in the footwell, head under the dash, makes the job much easier.", v: "side", hits: () => [{ o: handle, act: done => tween(1.0, e => { doorP.rotation.y = e * 1.15; }, () => { fill.intensity = 0.9; done(); }) }, { o: seatP.children[0], act: done => { kitMat.visible = true; tween(0.8, e => { seatP.position.z = 0.15 - e * 0.32; }, done); } }] },
  { t: "5. Remove the instrument side finisher RH", d: "The narrow trim panel on the end of the dashboard, visible with the door open. Put on your safety glasses. Slip the plastic trim tool behind its edge and pull it off its clips. Click it.", w: "Use the plastic tool, not a screwdriver: the clips are plastic and the dash scratches easily. Pull evenly; do not bend the panel.", v: "dash", labels: ["finisher"], need: ["trim", "glasses"], hits: () => [{ o: finisher, act: done => tween(0.7, e => { finisher.position.x = -0.846 - e * 0.35; finisher.position.y = 0.79 - e * 0.45; finisher.rotation.z = e * 0.6; }, () => { finisher.visible = false; done(); }) }] },
  { t: "6. Empty the glove box and remove its screws", d: "Open the glove box (click its door) and take out what is in it. Then remove its screws with the Phillips screwdriver: along the top of the opening and along the bottom (about six; count them). Put them in your tray.", w: "Hold the glove box with one hand as the last screws come out, so it does not drop. Your car may have a screw or two in slightly different places: if it will not come free, look again rather than pulling.", v: "dash", need: ["phillips"], hits: () => [{ o: gloveDoor, act: done => tween(0.6, e => { gloveDoor.rotation.x = -e * 1.2; }, () => { manual.visible = false; gScrews.forEach(s => s.visible = true); done(); }) }, ...anyHit(gScrews, (done, o) => unscrew(o, done))] },
  { t: "7. Take out the glove box", d: "With the screws out, ease the glove box assembly out of the dash and set it aside on the seat. Click it.", w: "Behind it you can now see the heater/AC unit, the cabin filter cover, and below them the round blower motor housing.", v: "dash", hits: () => [{ o: gloveBin, act: done => tween(0.9, e => { gloveG.position.set(-0.45 - e * 0.2, 0.6 - e * 0.1, 0.835 - e * 0.45); gloveG.rotation.y = e * 0.5; }, () => { gloveG.visible = false; done(); }) }] },
  { t: "7b. Change the cabin filter (optional)", d: "Since it is right there: click the cabin filter cover on the face of the heater unit, slide the old filter out, and slide the new one in with its airflow arrow pointing down.", w: "A clogged cabin filter also weakens the airflow, so it is worth doing now.", v: "dash", labels: ["filter"], skip: () => !KIT.has("filter"), hits: () => [{ o: filterDoor, act: done => { filterOld.visible = true; tween(0.8, e => { filterDoor.position.z = 1.035 - e * 0.1; filterOld.position.z = 1.08 - e * 0.28; }, () => { filterOld.material = M(0xf4f0e6); tween(0.8, e => { filterOld.position.z = 0.8 + e * 0.28; filterDoor.position.z = 0.935 + e * 0.1; }, () => { filterOld.visible = false; done(); }); }); } }] },
  { t: "8. Find the blower motor and unplug it", d: "Lie on your back in the passenger footwell with the flashlight, head under the dash. The blower motor is the round housing under the heater unit; the small blower resistor is just beside it. Press the tab on the motor's harness connector and pull it straight off. Click the connector.", w: "Pull the plastic connector body, never the wires. If it is stiff, press the tab harder rather than wiggling hard.", v: "under", labels: ["motor", "connector", "resistor"], need: ["light"], hits: () => [{ o: connector, act: done => tween(0.6, e => { connector.position.x = 0.12 + e * 0.07; }, done) }] },
  { t: "8b. Check for power (optional)", d: "With the multimeter on DC volts, ignition ON and the fan switch on high, touch the probes to the two terminals in the connector you unplugged (the harness side). Click the connector.", w: "About 12 V means power is reaching the motor and the motor itself is bad. No voltage means the problem is upstream (fuse, relay, resistor or switch): a new motor will not help. Turn the ignition OFF afterwards.", v: "under", labels: ["connector"], skip: () => !KIT.has("meter"), hits: () => [{ o: connector, act: done => { say("The meter reads 12.4 V with the fan on high: power is getting to the motor, so the motor is the fault. Ignition OFF now."); done(); } }] },
  { t: "9. Disconnect the battery", d: "Before taking the motor out: ignition OFF, and the key (intelligent key) away from the car. Open the hood: the battery is at the front on the driver's side. With the 10 mm wrench, loosen the nut on the NEGATIVE (−, black) terminal, then lift the cable off the post and tuck it aside. Click the hood, the nut, then the cable.", w: "Always the negative terminal first, so a slipping wrench cannot short to the body. Make sure the cable cannot fall back onto the post. Your clock and radio presets may reset.", v: "hood", labels: ["neg"], need: ["wrench"], hits: () => [{ o: hoodSkin, act: done => tween(1.2, e => { hood.rotation.x = -e * 1.05; bayLight.intensity = e * 1.6; }, done) }, { o: negNut, act: done => tween(0.7, e => { negNut.rotation.y = e * 10; negNut.position.y = 0.016 + e * 0.008; }, done) }, { o: negCable, act: done => tween(0.7, e => { negClamp.position.y = 0.235 + e * 0.05; negClamp.position.z = -0.05 - e * 0.06; negClamp.rotation.x = e * 0.5; }, () => { S.battery = false; done(); }) }] },
  { t: "10. Remove the blower motor", d: "Back under the dash. Remove the screws around the blower motor's flange, supporting the motor with your other hand. Then lower the motor out of its housing. Click each screw, then the motor.", w: "If it does not drop free after the screws, some versions are also held by a twist-lock: squeeze the tab and turn the motor a little to release it. Expect dust and leaves to fall: glasses on.", v: "under", labels: ["motor"], need: ["phillips", "glasses"], hits: () => [...anyHit(screws, (done, o) => unscrew(o, done)), { o: can, act: done => { connector.visible = false; tween(1.0, e => { motor.position.set(-0.42 - e * 0.35, 0.4 - e * 0.07, 0.99 - e * 0.25); motor.rotation.z = e * 0.4; }, () => { S.motorOut = true; done(); }); } }] },
  { t: "11. Clean out the housing; compare the parts", d: "Shine the light up into the empty housing and pull out any leaves or debris. Then put the old and new motors side by side: same fan wheel, same flange and screw holes, same connector? Click the new motor to unpack it.", w: "If your old motor has a separate piece (some have a clip or seal) that the new one lacks, move it across. Spin the new fan wheel by hand: it should turn freely and not touch anything.", v: "under", need: ["motor"], before: () => { newMotor.visible = true; newMotor.position.set(-1.45, 0.07, 0.9); newMotor.rotation.set(0, 0, 0); }, hits: () => [{ o: newMotor, act: done => { say("Old and new side by side: same flange, three screw holes, the same connector. The new fan wheel spins freely by hand. Good to go."); done(); } }] },
  { t: "12. Install the new motor", d: "Lift the new motor up into the housing, the connector facing the same way as the old one, and hold it in place. Put the screws back in and snug them up. Then push the harness connector on until it clicks. Click the new motor, each screw, then the connector.", w: "Do not overtighten: the screws go into plastic. Make sure the wheel does not rub, and the connector is fully latched.", v: "under", hits: () => { const nm = newMotor.children, ns = [nm[3], nm[4], nm[5]]; return [{ o: nm[1], act: done => { motor.visible = false; ns.forEach(s => { s.userData.home = s.position.clone(); s.visible = false; }); tween(1.0, e => { newMotor.position.set(-1.45 + e * 1.03, 0.07 + e * 0.33, 0.9 + e * 0.09); }, done); } }, ...anyHit(ns, (done, o) => screwIn(o, done)), { o: nm[6], act: done => { say("The connector clicks home."); done(); } }]; } },
  { t: "13. Reconnect the battery and test", d: "Put the negative cable back on its post and tighten the 10 mm nut until the clamp will not turn on the post (firm, not forced). Close the hood. Then in the driver's seat, ignition ON, try the fan at every speed. Click the cable, then the fan knob (several times).", w: "Test before you put the glove box back, so you can still reach the motor if something is wrong. All speeds should blow; no rattles or squeals.", v: "hood", need: ["wrench"], hits: () => [{ o: negCable, act: done => tween(0.7, e => { negClamp.position.y = 0.285 - e * 0.05; negClamp.position.z = -0.11 + e * 0.06; negClamp.rotation.x = 0.5 - e * 0.5; }, () => tween(1.0, e => { hood.rotation.x = -1.05 + e * 1.05; bayLight.intensity = (1 - e) * 1.6; }, () => { S.battery = true; go("driver"); done(); })) }, { o: fanKnob, act: done => { fanSpeed = (fanSpeed % 4) + 1; AIR.visible = true; fanKnob.rotation.y = fanSpeed * 0.6; say(`Fan speed ${fanSpeed}: air is blowing. ${fanSpeed < 4 ? "Click again for the next speed." : "All four speeds work."}`); if (fanSpeed >= 4) done(); else return "again"; } }] },
  { t: "14. Put the glove box and trim back", d: "Fan off. Slide the glove box assembly back in, put its screws back (bottom and top), close the door, and press the instrument side finisher back onto its clips. Put your things back in the glove box and the seat where you like it. Click the glove box, then the finisher.", w: "Start all the screws by hand before tightening any, so the glove box lines up. Count them: none should be left in your tray.", v: "dash", hits: () => [{ o: gloveBin, act: done => { fanSpeed = 0; AIR.visible = false; tween(0.9, e => { gloveG.position.set(-0.65 + e * 0.2, 0.5 + e * 0.1, 0.385 + e * 0.45); gloveG.rotation.y = 0.5 - e * 0.5; }, () => { gScrews.forEach(s => screwIn(s)); tween(0.6, e => { gloveDoor.rotation.x = -1.2 + e * 1.2; }, done); }); } }, { o: finisher, act: done => { finisher.visible = true; tween(0.7, e => { finisher.position.x = -1.196 + e * 0.35; finisher.position.y = 0.34 + e * 0.45; finisher.rotation.z = 0.6 - e * 0.6; }, () => { tween(0.8, e => { seatP.position.z = -0.17 + e * 0.32; doorP.rotation.y = 1.15 - e * 1.15; }, () => { fill.intensity = 0; done(); }); }); } }], before: () => { gloveG.visible = true; finisher.visible = true; finisher.position.set(-1.196, 0.34, 0.99); finisher.rotation.z = 0.6; } },
  { t: "Done", d: "That is the whole job: diagnose, buy the right part, glove box out, battery off, old motor out, new motor in, test, put it all back. Reset your clock and radio presets if they were lost, and take the old motor to the parts store for recycling.", w: "If the fan still does not work: check the connector is fully latched, the fuses, and (if only some speeds fail) the blower resistor next to the motor, which comes out the same way: unplug it and remove its screws. Press R to practise again.", v: "side", cont: true } ];
// the diagnosis cards
const CHOICES = [["none", "No air at any speed"], ["high", "Works only on the highest speed"], ["noise", "Rattles, ticks or squeals"]].map(([id, txt], i) => { const t = canvasTex(512, 160, (g, w, h) => { g.fillStyle = "#f4ead0"; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); g.fillStyle = "#2a2218"; let fs = 40; do { g.font = `bold ${fs}px sans-serif`; fs -= 2; } while (g.measureText(txt).width > w - 30); g.textAlign = "center"; g.fillText(txt, w / 2, 96); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.156), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, side: THREE.DoubleSide })); m.position.set(0.3, 1.27 - i * 0.12, 0.52); m.rotation.y = Math.PI; m.scale.setScalar(0.5); m.userData.choice = id; m.visible = false; scene.add(m); return m; });
const DIAG = { none: "No air at any speed: check the two blower fuses first (next step). If they are good, the motor (or its connector) is the likely fault; the voltage test later will confirm it.", high: "Only the highest speed works: that is almost always the blower RESISTOR, not the motor (the top speed bypasses the resistor). The resistor sits right next to the motor and comes out the same way: unplug it, remove its screws. You can practise the whole job here anyway, since the access is the same.", noise: "Noise: often leaves or debris in the blower housing hitting the fan wheel. Take the motor out (the same steps), clean the housing and wheel, and refit it; replace the motor only if its bearing is worn (wobbles or squeals when spun by hand)." };

// ---------- the step machine ----------
let SI = 0, ACTIVE = [], DONE = new Set(), CONT = null;
const GLOW = new Map();   // object -> its original materials, while glowing
function glow(o, on) { o.traverse(m => { if (!m.isMesh) return; if (on) { if (!GLOW.has(m)) { GLOW.set(m, m.material); m.material = m.material.clone(); m.material.emissive = new THREE.Color(0xffb020); } } else if (GLOW.has(m)) { m.material = GLOW.get(m); GLOW.delete(m); } }); }
function setActive(list) { for (const h of ACTIVE) glow(h.o, false); ACTIVE = list; DONE = new Set(); }
function begin(i) {
  if (STEPS[SI] && STEPS[SI].after && i !== SI) STEPS[SI].after();
  SI = i; const st = STEPS[SI]; if (st.skip && st.skip()) return begin(SI + 1);
  if (st.before) st.before(); showLabels(st.labels || []); CHOICES.forEach(c => c.visible = !!st.choice); for (const it of Object.values(ITEMS)) it.g.visible = !KIT.has(it.id);
  const miss = (st.need || []).filter(n => !KIT.has(n));
  setActive(st.hits ? st.hits() : []); if (st.bench) setActive(Object.values(ITEMS).filter(it => !KIT.has(it.id)).map(it => ({ o: it.g, act: done => take(it.id, done) })));
  if (st.choice) setActive(CHOICES.map(c => ({ o: c, act: done => { S.diag = c.userData.choice; say(DIAG[S.diag]); done(); } })));
  CONT = st.cont || st.choice ? true : null; go(st.v, true); draw(miss);
}
function take(id, done) { KIT.add(id); const it = ITEMS[id]; tween(0.4, e => { it.g.position.y = 0.95 + e * 0.3; }, () => { it.g.visible = false; it.g.position.y = 0.95; done(); }); draw(); say(`<b>${it.name}</b>: ${it.where}`); }
function allowed() { const st = STEPS[SI], open = ACTIVE.filter(a => !DONE.has(a)); if (st.bench || st.choice) return open; const f = open[0]; return f ? open.filter(a => a === f || a.act === f.act) : []; }
function hit(h) { if (!ACTIVE.includes(h) || DONE.has(h)) return; if (!allowed().includes(h)) { say("Not yet: do the glowing step first."); return; }
  glow(h.o, false); DONE.add(h); const r = h.act(() => checkDone(), h.o); if (r === "again") DONE.delete(h); }
function checkDone() { const st = STEPS[SI]; if (st.choice) { CONT = true; draw(); return; }
  if (st.bench) { const needAll = Object.values(ITEMS).filter(it => it.need).every(it => KIT.has(it.id)); if (needAll) { CONT = true; } draw(); return; }
  if (ACTIVE.length && ACTIVE.every(a => DONE.has(a))) { CONT = true; draw(); say("Done. Click <b>Next step</b> (or press N)."); } }
function next() { if (!CONT) return; if (SI < STEPS.length - 1) begin(SI + 1); }

// ---------- moving about: on screen (WASD, drag to look, C to crouch) and in VR ----------
const P = { x: -2.2, z: -0.3, eye: 1.6 }; let yaw = 0, pitch = 0, crouch = false; const keys = {}; let started = false;
function go(v, soft) { const V0 = VIEW[v]; if (!V0) return; P.x = V0.p[0]; P.z = V0.p[2]; P.eye = V0.p[1]; crouch = V0.p[1] < 1.3; const dx = V0.l[0] - V0.p[0], dy = V0.l[1] - V0.p[1], dz = V0.l[2] - V0.p[2]; yaw = Math.atan2(-dx, -dz); pitch = Math.atan2(dy, Math.hypot(dx, dz)); if (renderer.xr.isPresenting) { vrYaw = yaw; } }
addEventListener("keydown", e => { keys[e.code] = true; if (!started) return; if (e.code === "KeyC") { crouch = !crouch; P.eye = crouch ? 0.8 : 1.6; } if (e.code === "KeyN" || e.code === "Enter") next(); if (e.code === "KeyG") go(STEPS[SI].v); if (e.code === "KeyR") location.reload(); if (e.code === "KeyB" && SI > 0) begin(SI - 1); });
addEventListener("keyup", e => keys[e.code] = false);
let drag = null; renderer.domElement.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; });
addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; yaw -= dx * 0.004; pitch = THREE.MathUtils.clamp(pitch - dy * 0.004, -1.45, 1.45); });
addEventListener("pointerup", e => { if (drag && drag.moved < 6 && started) clickAt(e.clientX, e.clientY); drag = null; });
const ray = new THREE.Raycaster(); ray.near = 0.01; ray.far = 12;
function pickFrom(origin, dir) { ray.set(origin, dir); const objs = ACTIVE.filter(a => !DONE.has(a)).map(a => a.o); if (!objs.length) return null; const hits = ray.intersectObjects(objs, true); if (!hits.length) return null; let o = hits[0].object; while (o && !ACTIVE.find(a => a.o === o)) o = o.parent; return ACTIVE.find(a => a.o === o) || null; }
function clickAt(cx, cy) { const v = new THREE.Vector2(cx / innerWidth * 2 - 1, -cy / innerHeight * 2 + 1); ray.setFromCamera(v, camera); const h = pickFrom(ray.ray.origin, ray.ray.direction); if (h) hit(h); }
// the flashlight, when you have it and are under the dash
const torch = new THREE.SpotLight(0xfff4e0, 0, 6, 0.5, 0.5, 1.2); camera.add(torch); camera.add(torch.target); torch.target.position.set(0, 0, -1);
// VR: controllers with pointing rays; left stick walks, right stick turns, trigger clicks, A goes to the step's spot, B goes on
let vrYaw = 0; const VRB = document.getElementById("vr"), prevB = {};
const ctrls = [0, 1].map(i => { const c = renderer.xr.getController(i); rig.add(c); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffd060 })); l.scale.z = 4; c.add(l);
  c.addEventListener("selectstart", () => { const o = new THREE.Vector3(), d = new THREE.Vector3(0, 0, -1); c.getWorldPosition(o); d.applyQuaternion(c.getWorldQuaternion(new THREE.Quaternion())); const h = pickFrom(o, d); if (h) hit(h); }); return c; });
const vrC = document.createElement("canvas"); vrC.width = 1024; vrC.height = 512; const vrT = new THREE.CanvasTexture(vrC); vrT.colorSpace = THREE.SRGBColorSpace;
const vrPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: vrT, transparent: true, depthTest: false, toneMapped: false })); vrPanel.renderOrder = 20; vrPanel.position.set(0, -0.28, -0.8); vrPanel.rotation.x = -0.35; vrPanel.visible = false; camera.add(vrPanel);
if (navigator.xr) navigator.xr.isSessionSupported("immersive-vr").then(ok => { if (!ok) return; VRB.style.display = "block"; VRB.onclick = async () => { const s = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor"] }); renderer.xr.setReferenceSpaceType("local-floor"); await renderer.xr.setSession(s); start(); camera.position.set(0, 0, 0); vrPanel.visible = true; vrYaw = yaw; drawVR(); s.addEventListener("end", () => { camera.position.set(0, P.eye, 0); vrPanel.visible = false; }); }; });
const tapB = (k, gp, i) => { const p = !!gp.buttons[i]?.pressed, was = prevB[k + i]; prevB[k + i] = p; return p && !was; };

// ---------- the panel: the step, what to do, why, your kit ----------
const PANEL = document.createElement("div"); PANEL.style.cssText = "position:fixed;left:14px;top:14px;width:420px;max-height:calc(100% - 28px);overflow:auto;z-index:2;background:rgba(24,22,20,.86);color:#f2eadb;font:14px/1.45 -apple-system,sans-serif;padding:14px 16px;border-radius:12px;display:none"; document.body.appendChild(PANEL);
const MSG = document.createElement("div"); MSG.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);max-width:640px;z-index:2;background:rgba(24,22,20,.9);color:#f2eadb;font:14px/1.45 -apple-system,sans-serif;padding:10px 14px;border-radius:10px;display:none"; document.body.appendChild(MSG);
let msgT = 0, lastMsg = ""; function say(t) { lastMsg = t; MSG.innerHTML = t; MSG.style.display = "block"; msgT = 14; drawVR(); }
function draw(miss = []) { const st = STEPS[SI], kit = [...KIT].map(k => ITEMS[k].name.split(" (")[0]);
  PANEL.innerHTML = `<div style="color:#c8b898;font-size:12px">Step ${SI} of ${STEPS.length - 1} &middot; 2018 Nissan Sentra blower motor</div><div style="font-size:18px;font-weight:600;margin:2px 0 6px">${st.t}</div><div>${st.d}</div>
    <div style="margin-top:8px;padding:8px 10px;background:rgba(255,200,80,.12);border-left:3px solid #ffb020;border-radius:4px"><b>Why / careful:</b> ${st.w}</div>
    ${miss.length ? `<div style="margin-top:8px;color:#ff9a7a">You will need: ${miss.map(m => ITEMS[m].name.split(" (")[0]).join(", ")}. Get it from the workbench in the garage (step 2).</div>` : ""}
    <div style="margin-top:10px">${CONT ? '<button id="nb" style="font:600 14px sans-serif;padding:7px 14px;border-radius:8px;border:0;background:#ffb020;color:#2a1a00;cursor:pointer">Next step &#9654;</button> ' : '<span style="color:#c8b898">Click the glowing parts.</span> '}
    <button id="gb" style="font:13px sans-serif;padding:6px 10px;border-radius:8px;border:0;background:#4a4440;color:#f2eadb;cursor:pointer">Go to the spot (G)</button> ${SI > 0 ? '<button id="bb" style="font:13px sans-serif;padding:6px 10px;border-radius:8px;border:0;background:#4a4440;color:#f2eadb;cursor:pointer">Back (B)</button>' : ""}</div>
    <div style="margin-top:10px;color:#c8b898;font-size:12.5px">Your kit: ${kit.length ? kit.join(" &middot; ") : "nothing yet"}<br>WASD walk &middot; drag to look &middot; C crouch / stand &middot; N next &middot; G go to the spot</div>`;
  const nb = document.getElementById("nb"), gb = document.getElementById("gb"), bb = document.getElementById("bb"); if (nb) nb.onclick = next; if (gb) gb.onclick = () => go(st.v); if (bb) bb.onclick = () => begin(SI - 1); drawVR(); }
function drawVR() { const g = vrC.getContext("2d"), st = STEPS[SI]; g.clearRect(0, 0, 1024, 512); g.fillStyle = "rgba(24,22,20,.86)"; g.beginPath(); g.roundRect(0, 0, 1024, 512, 24); g.fill();
  const wrap = (txt, y, sz, col, max) => { g.fillStyle = col; g.font = `${sz}px sans-serif`; let ln = "", n = 0; for (const w of txt.replace(/<[^>]+>/g, "").split(" ")) { if (g.measureText(ln + w).width > 970) { g.fillText(ln, 26, y); y += sz * 1.25; ln = ""; if (++n >= max) return y; } ln += w + " "; } g.fillText(ln, 26, y); return y + sz * 1.25; };
  let y = wrap(st.t, 50, 36, "#ffe9a8", 1); y = wrap(st.d, y + 6, 24, "#f2eadb", 7); if (lastMsg && msgT > 0) wrap(lastMsg, y + 10, 22, "#ffc870", 4); g.fillStyle = "#c8b898"; g.font = "20px sans-serif"; g.fillText(CONT ? "B: next step   A: go to the spot   trigger: click" : "Point at the glowing part and pull the trigger.   A: go to the spot", 26, 494); vrT.needsUpdate = true; }

function start() { if (started) return; started = true; document.getElementById("intro")?.classList.add("gone"); PANEL.style.display = "block"; begin(0); }
document.getElementById("intro")?.addEventListener("click", start);

// ---------- the loop ----------
const clock = new THREE.Clock(), fwd = new THREE.Vector3();
renderer.setAnimationLoop(() => { const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime, vr = renderer.xr.isPresenting;
  let mx = 0, my = 0;
  if (vr) { const s = renderer.xr.getSession(); for (const src of s ? s.inputSources : []) { const gp = src.gamepad; if (!gp) continue; const a = gp.axes, ax = a.length >= 4 ? 2 : 0;
      if (src.handedness === "left") { mx = Math.abs(a[ax]) > 0.15 ? a[ax] : 0; my = Math.abs(a[ax + 1]) > 0.15 ? a[ax + 1] : 0; }
      else { const tx = a[ax] || 0; if (Math.abs(tx) > 0.7 && !prevB.turn) { vrYaw -= Math.sign(tx) * Math.PI / 6; prevB.turn = true; } else if (Math.abs(tx) < 0.3) prevB.turn = false; if (tapB("r", gp, 4)) go(STEPS[SI].v); if (tapB("r", gp, 5)) next(); } }
    rig.rotation.y = vrYaw; fwd.set(0, 0, -1).applyQuaternion(camera.quaternion).applyQuaternion(rig.quaternion); }
  else { camera.rotation.set(pitch, yaw, 0, "YXZ"); camera.getWorldDirection(fwd); if (keys.KeyW || keys.ArrowUp) my -= 1; if (keys.KeyS || keys.ArrowDown) my += 1; if (keys.KeyD) mx += 1; if (keys.KeyA) mx -= 1; }
  fwd.y = 0; fwd.normalize(); const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)); const sp = 1.6 * dt;
  if (mx || my) { P.x += (fwd.x * -my + side.x * mx) * sp; P.z += (fwd.z * -my + side.z * mx) * sp; }
  if (vr) rig.position.set(P.x, 0, P.z); else { rig.position.set(P.x, 0, P.z); camera.position.y += (P.eye - camera.position.y) * Math.min(1, dt * 6); }
  torch.intensity = KIT.has("light") && (crouch || (vr && camera.position.y < 1.1)) ? 8 : 0;
  tweenStep(dt); airStep(dt); placeLabels(); { const al = allowed(); for (const h of ACTIVE) { const on = al.includes(h) && !DONE.has(h); glow(h.o, on); if (on) h.o.traverse(m => { if (m.isMesh && GLOW.has(m) && m.material.emissive) m.material.emissiveIntensity = 0.35 + 0.35 * Math.sin(t * 5); }); } }
  msgT -= dt; if (msgT <= 0 && MSG.style.display !== "none") { MSG.style.display = "none"; lastMsg = ""; drawVR(); }
  renderer.render(scene, camera); });
camera.position.set(0, 1.6, 0); go("side");
