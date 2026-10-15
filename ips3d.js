// Thesis dialog demo: the real DC-HKNN test set in 3D. Two floors of reference points (1.2 m grid), the 18 access
// points (positions estimated from signal strength — the dataset has none), and for each test reading the true spot,
// the DC-HKNN estimate and the standard-KNN estimate. Data = data/ips.json, exported from the thesis notebook
// (see README). Loaded lazily by index.html; same pinned Three.js as globe.js. Colours come from the CSS tokens.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

const FLOOR_H = 7;           // vertical gap between the two floors (exaggerated so both stay readable)
const MARGIN = 1.2;          // slab overhang around the outermost reference points

/**
 * @param {HTMLElement} host  the dialog hero (position:relative, 16:9)
 * @returns {Promise<() => void>} stop: cancels animation, disposes WebGL, removes the overlay
 */
export async function mountIps(host, { url = 'data/ips.json' } = {}) {
  const D = await fetch(url).then(r => { if (!r.ok) throw new Error('ips ' + r.status); return r.json(); });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T = D.test.map(t => ({ x: t[0], y: t[1], f: t[2], dir: t[3], dx: t[4], dy: t[5], df: t[6], kx: t[7], ky: t[8] }));
  const err = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const mdeDc = T.reduce((s, t) => s + err(t.x, t.y, t.dx, t.dy), 0) / T.length;
  const mdeKnn = T.reduce((s, t) => s + err(t.x, t.y, t.kx, t.ky), 0) / T.length;

  // dataset X/Y (m) + floor -> scene; centred so the camera orbits the middle of the building
  const xs = D.rp.map(r => r[0]), ys = D.rp.map(r => r[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const P = (x, y, f, up = 0) => new THREE.Vector3(x - cx, f * FLOOR_H + up, y - cy);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const cvs = renderer.domElement; cvs.setAttribute('aria-hidden', 'true'); host.appendChild(cvs);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.5, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1); sun.position.set(-20, 40, 25); scene.add(sun);

  // ---- materials (coloured in paint()) ----
  const M = {
    slab: new THREE.MeshStandardMaterial({ transparent: true, opacity: .55, roughness: .9, depthWrite: false }),
    edge: new THREE.LineBasicMaterial({ transparent: true, opacity: .8 }),
    rp: new THREE.MeshStandardMaterial({ roughness: .8 }),
    ap: new THREE.MeshStandardMaterial({ roughness: .5 }),
    apRing: new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    truth: new THREE.MeshStandardMaterial({ roughness: .4 }),
    dc: new THREE.MeshStandardMaterial({ roughness: .4 }),
    knn: new THREE.MeshStandardMaterial({ roughness: .4 }),
    dcLine: new THREE.LineBasicMaterial(),
    knnLine: new THREE.LineDashedMaterial({ dashSize: .45, gapSize: .3 }),
  };

  // ---- floors: slab + outline, sized to that floor's reference points ----
  for (const f of [0, 1]) {
    const pts = D.rp.filter(r => r[2] === f);
    const x0 = Math.min(...pts.map(r => r[0])) - MARGIN, x1 = Math.max(...pts.map(r => r[0])) + MARGIN;
    const y0 = Math.min(...pts.map(r => r[1])) - MARGIN, y1 = Math.max(...pts.map(r => r[1])) + MARGIN;
    const geo = new THREE.BoxGeometry(x1 - x0, .12, y1 - y0);
    const slab = new THREE.Mesh(geo, M.slab); slab.position.copy(P((x0 + x1) / 2, (y0 + y1) / 2, f, -.1)); slab.userData.floor = f;
    scene.add(slab);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), M.edge); edges.position.copy(slab.position); scene.add(edges);
  }

  // ---- reference points: one InstancedMesh, per-instance colour for the signal view ----
  const rpMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(.27, .27, .08, 12), M.rp, D.rp.length);
  const m4 = new THREE.Matrix4();
  D.rp.forEach((r, i) => { m4.makeTranslation(P(r[0], r[1], r[2], .02)); rpMesh.setMatrixAt(i, m4); });
  rpMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(D.rp.length * 3), 3);
  scene.add(rpMesh);

  // ---- access points (estimated): small octahedron above the floor + a flat ring that pulses ----
  const apObjs = D.ap.map((a, i) => {
    if (!a) return null;
    const g = new THREE.Group(); g.position.copy(P(a[0], a[1], a[2], 2.4));
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(.32), M.ap));
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .62, 32), M.apRing.clone()); ring.rotation.x = -Math.PI / 2; ring.position.y = -2.3;
    g.add(ring); scene.add(g);
    return { g, ring, i };
  });

  // ---- the sample being shown ----
  const ball = (mat, r) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);
  const truth = ball(M.truth, .38), dc = ball(M.dc, .34), knn = ball(M.knn, .3);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.6, 6), M.truth);
  const dcLine = new THREE.Line(new THREE.BufferGeometry(), M.dcLine), knnLine = new THREE.Line(new THREE.BufferGeometry(), M.knnLine);
  scene.add(truth, dc, knn, pole, dcLine, knnLine);

  // ---- overlay UI (real buttons; the caption is live text) ----
  const ui = document.createElement('div'); ui.className = 'ips-ui';
  ui.innerHTML = `<button type="button" data-a="next">Next reading</button><button type="button" data-a="signal" aria-pressed="false">Signal: off</button>`;
  const cap = document.createElement('div'); cap.className = 'cap ips-cap'; cap.setAttribute('aria-live', 'polite');
  const capMain = document.createElement('b'), capSub = document.createElement('small'); cap.append(capMain, capSub);
  const key = document.createElement('div'); key.className = 'ips-key';
  key.innerHTML = `<span><i class="k-t"></i>true spot</span><span><i class="k-d"></i>DC-HKNN</span><span><i class="k-k"></i>standard KNN</span><span><i class="k-a"></i>Wi-Fi AP (est.)</span>`;
  host.append(ui, cap, key);

  let cur = 0, signal = -1, auto = !reduce, lastPick = performance.now();
  function show(i) {
    cur = i; const t = T[i];
    truth.position.copy(P(t.x, t.y, t.f, .45)); pole.position.copy(P(t.x, t.y, t.f, 1.2));
    dc.position.copy(P(t.dx, t.dy, t.df, .45));
    knn.position.copy(P(t.kx, t.ky, t.f, .45));   // KNN's own floor guess is fractional; drawn on the true floor
    dcLine.geometry.setFromPoints([truth.position, dc.position]);
    knnLine.geometry.setFromPoints([truth.position, knn.position]); knnLine.computeLineDistances();
    const e1 = err(t.x, t.y, t.dx, t.dy), e2 = err(t.x, t.y, t.kx, t.ky);
    capMain.textContent = `This reading: DC-HKNN ${e1.toFixed(2)} m off · KNN ${e2.toFixed(2)} m off`;
    capSub.textContent = `#${i + 1} · floor ${t.f + 1}, facing ${t.dir} · all ${T.length.toLocaleString('en')}: ${mdeDc.toFixed(3)} vs ${mdeKnn.toFixed(3)} m`;
    target.t.set(truth.position.x * .35, FLOOR_H / 2, truth.position.z * .35);   // drift the view a little toward the reading
    requestRender();
  }
  const next = () => { show(Math.floor(Math.random() * T.length)); lastPick = performance.now(); };

  // signal view: colour every reference point by one AP's mean RSSI (-90 dBm or never heard = background)
  const cA = new THREE.Color(), cB = new THREE.Color(), cOut = new THREE.Color();
  function colourRps() {
    D.rp.forEach((_, i) => {
      if (signal < 0) cOut.copy(cA);
      else { const v = D.heat[i][signal]; const k = v == null ? 0 : THREE.MathUtils.clamp((v + 90) / 50, 0, 1); cOut.copy(cA).lerp(cB, k); }
      rpMesh.setColorAt(i, cOut);
    });
    rpMesh.instanceColor.needsUpdate = true;
    apObjs.forEach(o => o && (o.g.scale.setScalar(signal === o.i ? 1.6 : 1)));
    requestRender();
  }
  ui.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    auto = false;
    if (b.dataset.a === 'next') next();
    else {
      do signal = signal + 1 >= D.ap.length ? -1 : signal + 1; while (signal >= 0 && !D.ap[signal]);
      b.textContent = signal < 0 ? 'Signal: off' : `Signal: AP ${signal + 1}`; b.setAttribute('aria-pressed', String(signal >= 0));
      colourRps();
    }
  });

  function paint() {
    const cs = getComputedStyle(document.documentElement), c = n => new THREE.Color(cs.getPropertyValue(n).trim() || '#888');
    M.slab.color = c('--surface'); M.edge.color = c('--line');
    M.ap.color = c('--future'); apObjs.forEach(o => o && (o.ring.material.color = c('--future')));
    M.truth.color = c('--ink'); M.dc.color = c('--now'); M.dcLine.color = c('--now'); M.knn.color = c('--ink-soft'); M.knnLine.color = c('--ink-soft');
    cA.copy(c('--line')); cB.copy(c('--future'));
    colourRps();
  }
  const mo = new MutationObserver(paint); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener('change', paint);

  // ---- camera: yaw / pitch / distance around a target, eased with exp-lerp (same feel at any frame rate) ----
  const view = { yaw: -.55, pitch: .78, dist: 70, t: new THREE.Vector3(0, FLOOR_H / 2, 0) };
  const target = { yaw: view.yaw, pitch: view.pitch, dist: view.dist, t: view.t.clone() };
  const ptrs = new Map(); let pinch = 0, moved = 0;
  cvs.addEventListener('pointerdown', e => { cvs.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; auto = false; });
  cvs.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) target.dist = THREE.MathUtils.clamp(target.dist * pinch / d, 22, 110);
      pinch = d;
    } else {
      target.yaw -= dx * .008; target.pitch = THREE.MathUtils.clamp(target.pitch + dy * .006, .2, 1.4);
    }
    requestRender();
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    if (e.type === 'pointerup' && moved < 6) pick(e);
  };
  cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
  cvs.addEventListener('wheel', e => { e.preventDefault(); target.dist = THREE.MathUtils.clamp(target.dist * Math.exp(e.deltaY * .001), 22, 110); auto = false; requestRender(); }, { passive: false });

  // tap a floor: show the test reading recorded nearest to that spot
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const slabs = scene.children.filter(o => o.userData.floor !== undefined);
  function pick(e) {
    const r = cvs.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(slabs)[0]; if (!hit) return;
    const f = hit.object.userData.floor, x = hit.point.x + cx, y = hit.point.z + cy;
    let best = -1, bd = Infinity;
    T.forEach((t, i) => { if (t.f !== f) return; const d = Math.hypot(t.x - x, t.y - y); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    // each spot has several readings (4 headings); tapping the same spot again steps through them
    const same = T.map((t, i) => i).filter(i => T[i].f === f && T[i].x === T[best].x && T[i].y === T[best].y);
    const at = same.indexOf(cur);
    show(at >= 0 ? same[(at + 1) % same.length] : best);
  }

  // ---- render loop: on demand; continuous only while something moves ----
  let raf = 0, last = performance.now(), alive = true;
  function requestRender() { if (alive && !raf) raf = requestAnimationFrame(frame); }
  const size = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); requestRender(); };
  const ro = new ResizeObserver(size); ro.observe(host);
  function frame(now) {
    raf = 0; if (!alive) return;
    const dt = Math.min((now - last) / 1000, .1); last = now;
    const k = 1 - Math.exp(-6 * dt);
    view.yaw += (target.yaw - view.yaw) * k; view.pitch += (target.pitch - view.pitch) * k;
    view.dist += (target.dist - view.dist) * k; view.t.lerp(target.t, k);
    camera.position.set(view.t.x + Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist, view.t.y + Math.sin(view.pitch) * view.dist,
      view.t.z + Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist);
    camera.lookAt(view.t);
    if (!reduce) {
      const s = (now / 1000 * .5) % 1;
      apObjs.forEach(o => { if (!o) return; o.ring.scale.setScalar(1 + ((s + o.i * .13) % 1) * 2.2); o.ring.material.opacity = .5 * (1 - (s + o.i * .13) % 1); });
      if (auto && now - lastPick > 2600) next();
    }
    renderer.render(scene, camera);
    const settling = Math.abs(target.yaw - view.yaw) + Math.abs(target.pitch - view.pitch) + Math.abs(target.dist - view.dist) + view.t.distanceTo(target.t) > 1e-3;
    if (!reduce || settling) requestRender();
  }

  // open on a reading that shows the point of the thesis: KNN far off, DC-HKNN close
  const first = T.findIndex(t => { const k = err(t.x, t.y, t.kx, t.ky); return t.f === 0 && k > 4 && k < 8 && err(t.x, t.y, t.dx, t.dy) < 1.5; });
  paint(); size(); show(Math.max(0, first));
  return () => {
    alive = false; cancelAnimationFrame(raf); ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', paint);
    scene.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose && o.material.dispose(); });
    renderer.dispose(); renderer.forceContextLoss(); cvs.remove(); ui.remove(); cap.remove(); key.remove();
  };
}
