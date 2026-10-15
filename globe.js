// Journey globe for the "You are here" section: a dotted brass globe with a pin per place in journey.json `places`
// and an arc from the home place to each of the others. Loaded lazily by index.html (dynamic import) — keep the
// CDN versions pinned. Colours come from the page's CSS tokens, so both themes work without extra palettes.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
import { feature } from 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/+esm';

const LAND = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json';

// lat/lon (deg) -> point on a sphere where lon 0 faces +z
function toVec(lat, lon, r = 1) {
  const a = THREE.MathUtils.degToRad(lat), b = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(r * Math.cos(a) * Math.sin(b), r * Math.sin(a), r * Math.cos(a) * Math.cos(b));
}

// Land polygons drawn onto an equirectangular canvas, sampled on a Fibonacci lattice (even spacing, no pole bunching)
async function landDots() {
  const topo = await fetch(LAND).then(r => { if (!r.ok) throw new Error('land ' + r.status); return r.json(); });
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.beginPath();
  for (const f of feature(topo, topo.objects.land).features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) {
      ring.forEach(([lon, lat], i) => { const px = (lon + 180) / 360 * W, py = (90 - lat) / 180 * H; i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.closePath();
    }
  }
  x.fill('evenodd');
  const px = x.getImageData(0, 0, W, H).data, N = 26000, pos = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i + 0.5) / N * 2, lat = Math.asin(y) * 180 / Math.PI, lon = ((i * 137.50776) % 360) - 180;
    const cx = Math.min(W - 1, Math.floor((lon + 180) / 360 * W)), cy = Math.min(H - 1, Math.floor((90 - lat) / 180 * H));
    if (px[(cy * W + cx) * 4 + 3]) pos.push(...toVec(lat, lon, 1.002).toArray());
  }
  return pos;
}

// Point on Earth where the sun is overhead right now (low-precision solar position, ~0.5° — plenty for a terminator)
function subsolar(date) {
  const n = date.getTime() / 864e5 - 10957.5;   // days since J2000.0 (2000-01-01 12:00 UTC)
  const rad = Math.PI / 180, L = 280.46 + .9856474 * n, g = (357.528 + .9856003 * n) * rad;
  const lam = (L + 1.915 * Math.sin(g) + .02 * Math.sin(2 * g)) * rad, eps = (23.439 - 4e-7 * n) * rad;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / rad;
  const gmst = 280.46061837 + 360.98564736629 * n;
  return { lat: dec / rad, lon: ((ra - gmst) % 360 + 540) % 360 - 180 };
}

export function webglAvailable() {
  if (new URLSearchParams(location.search).has('nowebgl')) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

/**
 * @param {HTMLElement} host  square container (position:relative); canvas + labels are appended to it
 * @param {{places: object[], events: object[], onPick: (placeId: string) => void}} opts
 * @returns {Promise<{focus: (id: string) => void}>}
 */
export async function mountGlobe(host, { places, events, onPick }) {
  if (!webglAvailable()) throw new Error('WebGL unavailable');
  const pos = await landDots();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const home = places.find(p => p.home) || places[0];
  const byId = Object.fromEntries(events.map(e => [e.id, e]));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const cvs = renderer.domElement;
  cvs.setAttribute('aria-hidden', 'true');
  host.appendChild(cvs);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0, 4.3);
  const ambient = new THREE.AmbientLight(0xffffff, 1.6); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(-3, 2, 4); scene.add(sun);

  const tilt = new THREE.Group(), spin = new THREE.Group();   // tilt = latitude facing us, spin = longitude
  tilt.add(spin); scene.add(tilt);
  const ocean = new THREE.Mesh(new THREE.SphereGeometry(0.995, 64, 48), new THREE.MeshLambertMaterial());
  spin.add(ocean);

  // night side: a shell just above the land dots, shaded by the angle to the real sun; it lives in `spin`, so the
  // terminator turns with the globe (sun direction is in globe coordinates, updated once a minute)
  const night = new THREE.Mesh(new THREE.SphereGeometry(1.003, 64, 48), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uSun: { value: new THREE.Vector3(1, 0, 0) }, uColor: { value: new THREE.Color() }, uAlpha: { value: .4 } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun; uniform vec3 uColor; uniform float uAlpha; varying vec3 vN;' +
      'void main(){ float d = dot(normalize(vN), uSun); gl_FragColor = vec4(uColor, uAlpha * smoothstep(.08, -.12, d)); }',
  }));
  spin.add(night);
  const setSun = () => { const s = subsolar(new Date()); night.material.uniforms.uSun.value.copy(toVec(s.lat, s.lon)); requestRender(); };

  const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const sprite = document.createElement('canvas'); sprite.width = sprite.height = 32;
  const sx = sprite.getContext('2d'); sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(16, 16, 14, 0, Math.PI * 2); sx.fill();
  const dotMat = new THREE.PointsMaterial({ size: 0.022, map: new THREE.CanvasTexture(sprite), alphaTest: 0.5 });
  spin.add(new THREE.Points(dotGeo, dotMat));

  // pins: home = "now" colour with a pulsing ring; the others = past colour with a still ring
  const nowMat = new THREE.MeshBasicMaterial(), pastMat = new THREE.MeshBasicMaterial();
  const pins = places.map(p => {
    const v = toVec(p.lat, p.lon), isHome = p === home;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(isHome ? 0.026 : 0.02, 16, 12), isHome ? nowMat : pastMat);
    dot.position.copy(v); spin.add(dot);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.038, 40), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(toVec(p.lat, p.lon, 1.004)); ring.lookAt(v.clone().multiplyScalar(2)); spin.add(ring);
    return { p, v, ring, isHome };
  });

  // arcs home -> each other place, raised in the middle; the year of the place's first event sits on the arc
  const arcMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .9 });
  const beadMat = new THREE.MeshBasicMaterial();
  const arcs = pins.filter(x => !x.isHome).map(({ p, v }, k) => {
    const a = toVec(home.lat, home.lon), mid = a.clone().add(v).multiplyScalar(.5);
    mid.setLength(1 + a.distanceTo(v) * .7);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, v);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(80));
    spin.add(new THREE.Line(geo, arcMat));
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), beadMat); spin.add(bead);
    const year = (byId[p.events[0]] || {}).year;
    return { curve, geo, bead, delay: k * .5, year, peak: curve.getPoint(.5) };
  });

  function paint() {
    const cs = getComputedStyle(document.documentElement), c = n => new THREE.Color(cs.getPropertyValue(n).trim() || '#888');
    const dark = cs.colorScheme === 'dark';
    ocean.material.color = c('--surface');
    dotMat.color = dark ? c('--past').lerp(c('--surface'), .15) : c('--past');
    dotMat.size = dark ? .022 : .026;
    nowMat.color = c('--now'); pastMat.color = c('--past');
    night.material.uniforms.uColor.value = dark ? new THREE.Color(0x000000) : c('--ink');
    night.material.uniforms.uAlpha.value = dark ? .5 : .22;
    leaderPaint();
    arcMat.color = c('--past'); beadMat.color = c('--now');
    pins.forEach(({ ring, isHome }) => { ring.material.color = c(isHome ? '--now' : '--past'); });
    // Lambert divides by π: ~3.6 total keeps the light paper close to --surface instead of grey
    ambient.intensity = dark ? 1.6 : 2.5; sun.intensity = dark ? 1.2 : 1.1;
    requestRender();
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paint);
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // HTML overlays: pin labels are real buttons (tappable, focusable); arc years are plain text
  const labels = pins.map(({ p }) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pin'; b.dataset.place = p.id;
    const hit = document.createElement('span'), tag = document.createElement('span');
    hit.className = 'hit'; tag.className = 'tag'; tag.textContent = p.name; b.append(hit, tag);
    b.setAttribute('aria-label', `${p.name}, ${p.country}`);
    b.addEventListener('click', () => onPick(p.id));
    host.appendChild(b); return b;
  });
  const yrs = arcs.map(a => {
    const s = document.createElement('span'); s.className = 'arc-yr mono'; s.textContent = a.year || ''; s.setAttribute('aria-hidden', 'true');
    host.appendChild(s); return s;
  });
  // leader lines for labels that had to move off their pin (one SVG under the labels)
  const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  leaders.setAttribute('class', 'leaders'); leaders.setAttribute('aria-hidden', 'true'); host.insertBefore(leaders, labels[0]);
  function leaderPaint() { leaders.style.color = getComputedStyle(document.documentElement).getPropertyValue('--past').trim(); }

  // view: default faces the home region; drag turns longitude only (vertical drag still scrolls the page)
  const HOME = { lat: THREE.MathUtils.clamp((home.lat + 38) / 2, 5, 40), lon: home.lon + 22 };
  const view = { ...HOME }, target = { ...HOME };
  let dragging = false, lastX = 0, lastMoveT = 0, idleAt = 0, vel = 0;   // vel = coast speed after release, deg/s
  cvs.addEventListener('pointerdown', e => { dragging = true; vel = 0; lastX = e.clientX; lastMoveT = performance.now(); cvs.setPointerCapture(e.pointerId); host.classList.add('drag'); });
  cvs.addEventListener('pointermove', e => {
    if (!dragging) return;
    const now = performance.now(), d = -(e.clientX - lastX) * 180 / cvs.clientWidth, dt = Math.max(1, now - lastMoveT) / 1000;
    target.lon += d; lastX = e.clientX; lastMoveT = now;
    vel = vel * .6 + (d / dt) * .4;   // smoothed, so one jittery event doesn't decide the throw
    view.lon = target.lon; idleAt = now; requestRender();
  });
  const end = () => {
    if (dragging && performance.now() - lastMoveT > 80) vel = 0;   // held still before letting go: no coast
    dragging = false; host.classList.remove('drag'); requestRender();
  };
  cvs.addEventListener('pointerup', end); cvs.addEventListener('pointercancel', end);

  // render only while on screen; arcs draw in the first time the globe is actually seen
  let visible = false, raf = 0, drawStart = -1, t0 = performance.now();
  const size = () => { const s = host.clientWidth; if (!s) return; renderer.setSize(s, s, false); requestRender(); };
  new ResizeObserver(size).observe(host);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && drawStart < 0 && en.intersectionRatio > .3) drawStart = performance.now();
    requestRender();
  }, { threshold: [0, .3] }).observe(host);
  document.addEventListener('visibilitychange', requestRender);
  function requestRender() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

  const tmp = new THREE.Vector3(), camDir = new THREE.Vector3(0, 0, 1);
  function project(v) {
    tmp.copy(v).applyMatrix4(spin.matrixWorld);
    const facing = tmp.clone().normalize().dot(camDir);
    tmp.project(camera);
    return { x: (tmp.x + 1) / 2 * cvs.clientWidth, y: (1 - tmp.y) / 2 * cvs.clientHeight, facing };
  }
  let lastFrame = performance.now();
  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000, still = reduce.matches;
    const dt = Math.min((now - lastFrame) / 1000, .1); lastFrame = now;
    // coast after a throw, slowing exponentially (same feel at 60 or 120 Hz)
    if (!dragging && Math.abs(vel) > 1) { target.lon += vel * dt; vel *= Math.exp(-3 * dt); idleAt = now; }
    // after 4 s idle, drift back toward home with a slow sway (never a full spin — the places share one hemisphere)
    if (!still && !dragging && now - idleAt > 4000) { target.lon = HOME.lon + Math.sin(t * .12) * 28; target.lat = HOME.lat; }
    const ease = 1 - Math.exp(-3.7 * dt);   // ≈ the old 0.06-per-frame at 60 Hz, but time-based
    view.lon += (target.lon - view.lon) * (dragging ? 1 : ease);
    view.lat += (target.lat - view.lat) * ease;
    spin.rotation.y = -THREE.MathUtils.degToRad(view.lon);
    tilt.rotation.x = THREE.MathUtils.degToRad(view.lat);

    const since = drawStart < 0 ? -1 : (now - drawStart) / 1000;
    let drawing = false;
    arcs.forEach((a, i) => {
      const k = still ? (since < 0 ? 0 : 1) : THREE.MathUtils.clamp((since - .3 - a.delay) / 1.4, 0, 1);
      if (k < 1 && since >= 0) drawing = true;
      a.geo.setDrawRange(0, Math.ceil(81 * k));
      a.bead.visible = !still && k === 1;
      if (a.bead.visible) a.curve.getPoint(((t - a.delay) * .35) % 1, a.bead.position);
      yrs[i].classList.toggle('show', k === 1);
    });
    pins.forEach(({ ring, isHome }, i) => {
      const s = still || !isHome ? 1 : 1 + ((t * .6) % 1) * 1.4;
      ring.scale.setScalar(s); ring.material.opacity = isHome && !still ? .9 * (1 - (s - 1) / 1.4) : .55;
    });

    renderer.render(scene, camera);

    const w = cvs.clientWidth, placed = [], paths = [];
    // home first, then the most front-facing pins get the first pick of space
    const order = pins.map(({ v, p }, i) => ({ i, p, q: project(v) })).sort((a, b) => (b.p === home) - (a.p === home) || b.q.facing - a.q.facing);
    for (const { i, p, q } of order) {
      const L = labels[i], tag = L.lastChild;
      L.style.left = q.x + 'px'; L.style.top = q.y + 'px';
      let away = q.facing < .45;   // labels near the rim would crowd each other
      // labels sit beside their pin, flipping side rather than running off the edge (Bangkok on a phone)
      const room = L.offsetWidth - 14, want = p.side || (p === home ? 'left' : q.x > w * .62 ? 'left' : 'right');
      const side = want === 'left' && q.x - room < 0 ? 'right' : want === 'right' && q.x + room > w ? 'left' : want;
      L.classList.toggle('left', side === 'left'); L.classList.toggle('right', side === 'right');
      // then nudge the tag up/down until it clears every label already placed; give up (hide) after 4 tries
      const tw = tag.offsetWidth, th = tag.offsetHeight, x0 = side === 'left' ? q.x - 20 - tw : q.x + 20;
      let dy = 0, ok = away;
      if (!away) for (const s of [0, -1, 1, -2, 2]) {
        const y0 = q.y - th / 2 + s * (th + 6);
        if (!placed.some(b => x0 < b[2] + 6 && x0 + tw > b[0] - 6 && y0 < b[3] + 4 && y0 + th > b[1] - 4)) {
          dy = s * (th + 6); placed.push([x0, y0, x0 + tw, y0 + th]); ok = true; break;
        }
      }
      if (!ok) away = true;
      L.classList.toggle('away', away);
      tag.style.transform = dy ? `translateY(${dy}px)` : '';
      if (!away && dy) {
        const ex = side === 'left' ? x0 + tw : x0, ey = q.y + dy;
        paths.push(`<path d="M${q.x.toFixed(1)} ${q.y.toFixed(1)} L${(ex + (side === 'left' ? 6 : -6)).toFixed(1)} ${ey.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}"/>`);
      }
    }
    leaders.setAttribute('viewBox', `0 0 ${w} ${cvs.clientHeight}`);
    leaders.innerHTML = paths.join('');
    arcs.forEach((a, i) => {
      const q = project(a.peak);
      yrs[i].style.left = q.x + 'px'; yrs[i].style.top = q.y + 'px';
      yrs[i].classList.toggle('away', q.facing < .3);
    });

    const settling = Math.abs(target.lon - view.lon) > .01 || Math.abs(target.lat - view.lat) > .01;
    if (!still || settling || drawing) requestRender();
  }

  paint(); size(); setSun();
  setInterval(setSun, 60000);
  return {
    focus(id) {
      const p = places.find(x => x.id === id); if (!p) return;
      labels.forEach(b => b.classList.toggle('on', b.dataset.place === id));
      target.lon = p.lon; target.lat = THREE.MathUtils.clamp(p.lat, 5, 40);
      idleAt = performance.now() + 6000;   // hold on the picked place a while before the sway resumes
      requestRender();
    },
  };
}
