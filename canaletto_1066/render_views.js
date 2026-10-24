
// Canaletto views of 1066 London: stills from the program, lit and finished as paintings
console.error = e => console.log("STACK " + (e && e.stack || e).toString().replace(/\n/g, " | ").slice(0, 600));
const CV = +(new URLSearchParams(location.search).get("view") || 0);
const VIEWS = [
  { name: "thames_city_from_somerset_house", at: [51.5093, -0.1163], look: [51.5106, -0.0990], h: 14, sim: [14, 50], pitch: -0.012, fov: 26, market: true, river: true },
  { name: "thames_westminster_from_somerset_house", at: [51.5097, -0.1170], look: [51.4996, -0.1268], h: 11, sim: [11, 0], pitch: -0.035, fov: 36, market: true, river: true },
  { name: "city_from_richmond_house", at: [51.5040, -0.1240], look: [51.5112, -0.1010], h: 15, sim: [14, 20], pitch: -0.035, fov: 38, market: true, river: true },
  { name: "westminster_abbey_procession", at: [51.5006, -0.1292], look: [51.4996, -0.1276], h: 2.2, sim: [10, 3], pitch: 0.1, fov: 55, market: false },
  { name: "the_thames_from_westminster", at: [51.5004, -0.1213], look: [51.5085, -0.1110], h: 4.5, sim: [13, 40], pitch: -0.02, fov: 48, market: true, river: true }];
const V = VIEWS[CV], W = 2400, H = 1350, SS = 2;
function paintLight(v) {   // Canaletto's light: a clear sky with cumulus, a warm low sun, a soft blue-gold haze
  skyMat.uniforms.up.value.setRGB(0.04, 0.12, 0.42); skyMat.uniforms.hor.value.setRGB(0.36, 0.45, 0.58);   // linear values: they come out as Canaletto's deep blue and pale horizon
  scene.fog.color.setRGB(0.46, 0.5, 0.56); scene.fog.density = 0.00019;
  sun.intensity = 3.4; sun.color.setRGB(1, 0.86, 0.68); hemi.intensity = 1.05; hemi.color.setRGB(0.62, 0.72, 0.9); hemi.groundColor.setRGB(0.55, 0.47, 0.36);
  renderer.toneMappingExposure = 1.08; sunDisc.visible = false; }
function cloudDome() { const t = tex(2048, 512, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (let k = 0; k < 60; k++) { const y = h * (0.52 + 0.4 * Math.pow(Math.random(), 0.6)), sc = (1.1 - y / h) * 120 + 10, x = Math.random() * w, n = 40 + (Math.random() * 40 | 0);   // a cumulus of many small puffs: heaped, lit tops, a flat grey base
      for (let q = 0; q < n; q++) { const u = (Math.random() - 0.5) * 2.4, px = x + u * sc, top = 1 - u * u * 0.35, r = sc * (0.12 + Math.random() * 0.2), py = y - Math.random() * sc * 0.9 * top;
        const lit = 1 - (py - (y - sc)) / (sc * 1.1), c = Math.round(205 + 50 * clampN(lit, 0, 1)), gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, `rgba(${c},${c - 4},${c - 12},.5)`); gr.addColorStop(1, `rgba(${c},${c - 4},${c - 12},0)`); g.fillStyle = gr; g.beginPath(); g.arc(px, py, r, 0, 6.283); g.fill(); } }
    });
  t.wrapS = THREE.RepeatWrapping;
  const m = new THREE.Mesh(new THREE.SphereGeometry(24000, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false })); m.renderOrder = -0.5; scene.add(m); return m; }
// water that reflects the sky, with ripples
function paintWater() { const nt = tex(512, 512, (g, w, h) => { g.fillStyle = "rgb(128,128,255)"; g.fillRect(0, 0, w, h); for (let k = 0; k < 2600; k++) { const x = Math.random() * w, y = Math.random() * h, l = 6 + Math.random() * 30, up = Math.random() < 0.5;
    g.fillStyle = up ? "rgba(128,170,255,.5)" : "rgba(128,86,255,.5)"; g.fillRect(x, y, l, 2); } }); nt.colorSpace = THREE.NoColorSpace; nt.repeat.set(6000, 16000);
  const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: skyMat.vertexShader, fragmentShader: "varying vec3 vp; void main(){ float y = max(vp.y, 0.0); gl_FragColor = vec4(mix(vec3(0.3,0.38,0.5), vec3(0.05,0.13,0.4), pow(y, 0.6)), 1.0); }" })));
  const env = pm.fromScene(es).texture; Object.assign(water.material, { envMap: env, envMapIntensity: 1.0, normalMap: nt, normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.2, metalness: 0.35 }); water.material.color.setRGB(0.2, 0.28, 0.28); water.material.needsUpdate = true; }
function shadowsOn() { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  const c = sun.shadow.camera; c.left = -650; c.right = 650; c.top = 650; c.bottom = -650; c.near = 10; c.far = 4000; c.updateProjectionMatrix(); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.5;
  scene.traverse(o => { if (!(o.isMesh || o.isInstancedMesh)) return; const big = o === sky || o === water || o === sunDisc || LEVELS.some(L => L.mesh === o); o.receiveShadow = true; o.castShadow = !big; if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); }); }
// the paint finish: smoothing into patches of colour (Kuwahara filter), Canaletto's warm palette, a canvas weave, a soft vignette
function paintFinish(src) { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(src, 0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data, N = W * H, r = 3, S = (W + 1) * (H + 1), sR = new Float64Array(S), sG = new Float64Array(S), sB = new Float64Array(S), sL = new Float64Array(S), sL2 = new Float64Array(S);
  for (let y = 0; y < H; y++) { let aR = 0, aG = 0, aB = 0, aL = 0, aL2 = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2], L = 0.3 * R + 0.59 * G + 0.11 * B; aR += R; aG += G; aB += B; aL += L; aL2 += L * L;
    const k = (y + 1) * (W + 1) + x + 1, u = y * (W + 1) + x + 1; sR[k] = sR[u] + aR; sG[k] = sG[u] + aG; sB[k] = sB[u] + aB; sL[k] = sL[u] + aL; sL2[k] = sL2[u] + aL2; } }
  const box = (A, x0, y0, x1, y1) => A[(y1 + 1) * (W + 1) + x1 + 1] - A[y0 * (W + 1) + x1 + 1] - A[(y1 + 1) * (W + 1) + x0] + A[y0 * (W + 1) + x0];
  const out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let best = 1e18, bR = 0, bG = 0, bB = 0;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x0 = Math.max(0, dx < 0 ? x - r : x), x1 = Math.min(W - 1, dx < 0 ? x : x + r), y0 = Math.max(0, dy < 0 ? y - r : y), y1 = Math.min(H - 1, dy < 0 ? y : y + r), n = (x1 - x0 + 1) * (y1 - y0 + 1);
      const m = box(sL, x0, y0, x1, y1) / n, v = box(sL2, x0, y0, x1, y1) / n - m * m; if (v < best) { best = v; bR = box(sR, x0, y0, x1, y1) / n; bG = box(sG, x0, y0, x1, y1) / n; bB = box(sB, x0, y0, x1, y1) / n; } }
    const i = (y * W + x) * 4; let R = bR / 255, G = bG / 255, B = bB / 255;
    const l = 0.3 * R + 0.59 * G + 0.11 * B; R = l + (R - l) * 1.12; G = l + (G - l) * 1.12; B = l + (B - l) * 1.08;   // a little more colour
    const warm = 1 - Math.abs(l - 0.5) * 2; R *= 1 + 0.05 * warm; B *= 1 - 0.07 * warm;   // warm midtones
    R = 0.045 + 0.94 * R; G = 0.04 + 0.93 * G; B = 0.035 + 0.9 * B;   // no dead blacks; brown-toned shadows
    const sc = t => t * t * (3 - 2 * t) * 0.35 + t * 0.65;   // a gentle S-curve
    const weave = 1 - 0.035 * (((x % 4) < 2) !== ((y % 4) < 2) ? 1 : 0) - 0.02 * Math.random(), vx = x / W - 0.5, vy = y / H - 0.5, vig = 1 - 0.32 * Math.pow(vx * vx + vy * vy, 1.2) * 2.2;
    out[i] = 255 * sc(Math.min(1, R)) * weave * vig; out[i + 1] = 255 * sc(Math.min(1, G)) * weave * vig; out[i + 2] = 255 * sc(Math.min(1, B)) * weave * vig; out[i + 3] = 255; }
  img.data.set(out); g.putImageData(img, 0, 0); return c; }
setTimeout(() => { try {
  start(); if (V.market !== MARKET) console.log("DAYMISMATCH");
  labelsOn = false; LBL.visible = false; pins.visible = false; dots.visible = false; MOUNT.g.visible = false; for (const B of BUBBLES) B.s.visible = false;
  const [ax, az] = LL(...V.at), [lx, lz] = LL(...V.look); SIM = hms(...V.sim); narrI = 99; teleport(ax, az, lx, lz); flying = true; P_.y = groundH(ax, az) + V.h; pitch = V.pitch;
  if (V.river) { let best = 0, bd = 1e9; for (let s = 0; s < THAMES.L; s += 10) { const [x, z] = THAMES.at(s), dd = Math.hypot(x - ax, z - az); if (dd < bd) { bd = dd; best = s; } } const [x1, z1] = THAMES.at(best + 50), down = Math.hypot(x1 - lx, z1 - lz) < Math.hypot(ax - lx, az - lz) ? 1 : -1;   // gather the boats into the view, as Canaletto filled his river
    RIVER_BOATS.forEach((B, k) => { if (B.type === "ship" && down < 0) return; const s = best + down * (50 + Math.pow(k / RIVER_BOATS.length, 1.7) * 1200); if (B.type === "ship" && s < BRIDGE_S + 100) return; B.s = s; B.s0 = Math.min(B.s0, s - 50); B.s1 = Math.max(B.s1, s + 50); B.lane = (Math.random() - 0.5) * 230; }); }
  renderer.setAnimationLoop(null); camera.fov = V.fov; camera.updateProjectionMatrix();
  for (let k = 0; k < 70; k++) { SIM = hms(...V.sim); frame(); }
  const dome = cloudDome(); shadowsOn(); paintWater(); frame(); paintLight(V); dome.position.copy(rig.position);
  const fwd = V3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); fwd.y = 0; fwd.normalize(); const tgt = rig.position.clone().addScaledVector(fwd, 520); tgt.y = 0;
  const S = sunAt(SIM / 3600); sun.target.position.copy(tgt); sun.position.copy(tgt).addScaledVector(S.dir, 1800); sun.target.updateMatrixWorld();
  renderer.setPixelRatio(1); renderer.setSize(W * SS, H * SS, false); camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.render(scene, camera);
  const outC = paintFinish(renderer.domElement), url = outC.toDataURL("image/jpeg", 0.9), CH = 180000; console.log("CANAL " + V.name + " " + Math.ceil(url.length / CH));
  for (let k = 0; k * CH < url.length; k++) console.log("PART " + k + " " + url.slice(k * CH, (k + 1) * CH));
  console.log("DONE"); } catch (e) { console.log("ERR3 " + e.stack); } }, 1500);
