/* Shezhire: 20 generations as a glowing 3D helix (three.js r128), from Alash at
   the top down to Alibi-ata, whose descendants hang below as a gold crown.
   Data comes from the <ol id="shz-list"> markup so both languages share this file.
   Scrolling through the section moves the camera from Alash down to the
   youngest generation. Falls back to the plain list without WebGL. */
(function () {
  var sec = document.getElementById('shezhire');
  var list = document.getElementById('shz-list');
  if (!sec || !list) return;
  var items = [].slice.call(list.querySelectorAll('li')).map(function (li) {
    return {
      gen: +li.dataset.gen,
      name: li.querySelector('.n').textContent,
      note: (li.querySelector('.d') || {}).textContent || '',
      years: li.dataset.years || '',
      jeti: li.dataset.jeti === '1',
      hero: li.dataset.hero === '1'
    };
  });
  // descendants of Alibi-ata ("crown" above the main line)
  var branch = [].slice.call(document.querySelectorAll('#shz-branch li')).map(function (li) {
    return { name: li.querySelector('.n').textContent, parent: li.dataset.parent, gen: +li.dataset.gen,
             note: (li.querySelector('.d') || {}).textContent || '' };
  });
  var crownInfo = document.getElementById('shz-crown');
  var canvas = document.getElementById('shz-canvas');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gl = null;
  try { gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl'); } catch (e) {}
  if (!window.THREE || !gl) { sec.classList.add('shz-flat'); return; }
  sec.classList.add('shz-3d');

  var T = window.THREE;
  var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, context: gl });
  renderer.setClearColor(0x0b1116, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  var scene = new T.Scene();
  scene.fog = new T.FogExp2(0x0b1116, 0.032);
  var camera = new T.PerspectiveCamera(42, 1, 0.1, 200);

  // --- layout: Alash (generation 1) at the top, each generation one step lower
  var STEP = 1.55, R = 3.1, TURN = 0.78;
  function lv(gen) { return gen - 1; }                       // helix level of a generation
  function pos(l) { return new T.Vector3(Math.cos(l * TURN) * R, -l * STEP, Math.sin(l * TURN) * R); }
  var pts = items.map(function (it) { return pos(lv(it.gen)); });
  var LAST = 20.0;                                            // camera travels from Alash (0) to below the crown

  // soft glow texture
  function glowTex(inner, outer) {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(0.25, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new T.CanvasTexture(c);
  }
  var GOLD = 0xe6c473, BRONZE = 0x9c7a46, SKY = 0x8fb9d4;
  var texGold = glowTex('rgba(255,226,150,1)', 'rgba(230,196,115,0)');
  var texCool = glowTex('rgba(190,215,235,0.9)', 'rgba(143,185,212,0)');

  // main thread through the generations
  var curve = new T.CatmullRomCurve3(pts.slice().sort(function (a, b) { return b.y - a.y; }));
  var tube = new T.Mesh(new T.TubeGeometry(curve, 400, 0.035, 8, false),
    new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 }));
  scene.add(tube);
  // second, fainter strand (the "anatomy"/DNA feel) with rungs
  var strand2 = [], rungs = new T.Group();
  for (var i = 0; i < items.length; i++) {
    var a = pts[i], b = new T.Vector3(-a.x, a.y - STEP * 0.5, -a.z);
    strand2.push(b);
    var g = new T.BufferGeometry().setFromPoints([a, b]);
    rungs.add(new T.Line(g, new T.LineBasicMaterial({ color: SKY, transparent: true, opacity: 0.16 })));
  }
  scene.add(rungs);
  scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(strand2.sort(function (a, b) { return b.y - a.y; })), 300, 0.018, 6, false),
    new T.MeshBasicMaterial({ color: SKY, transparent: true, opacity: 0.25 })));

  // nodes
  var nodes = items.map(function (it, i) {
    var col = it.jeti ? GOLD : BRONZE;
    var size = it.hero ? 0.24 : (it.jeti ? 0.17 : 0.13);
    var m = new T.Mesh(new T.SphereGeometry(size, 24, 16), new T.MeshBasicMaterial({ color: col }));
    m.position.copy(pts[i]);
    var halo = new T.Sprite(new T.SpriteMaterial({ map: it.jeti ? texGold : texCool, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: it.jeti ? 0.55 : 0.4 }));
    halo.scale.setScalar(size * (it.hero ? 7 : 5.5));
    m.add(halo);
    if (it.hero) {
      var ring = new T.Mesh(new T.TorusGeometry(0.46, 0.015, 8, 64), new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8 }));
      m.add(ring); m.userData.ring = ring;
    }
    scene.add(m);
    return m;
  });

  var labelBox = document.getElementById('shz-labels');
  // --- crown: sons, grandsons and great-grandsons of Alibi-ata
  var byName = {};
  items.forEach(function (it, i) { byName[it.name] = { p: pts[i], ang: lv(it.gen) * TURN, lvl: lv(it.gen) }; });
  // angle for each branch node, chosen so the crown fans out around the helix
  var ANG = { 'Асқар': TURN + 2.6, 'Тимур': TURN + 2.1, 'Арсен': 2 * TURN,
              'Дамир': -0.62, 'Сұлтан': 0, 'Батыр': 0.62, 'Дани': 2 * TURN - 0.36, 'Бари': 2 * TURN + 0.36,
              'Санжар': TURN + 1.72, 'Арыстан': TURN + 2.5 };
  Object.keys(ANG).forEach(function (k) { ANG[k] = 19 * TURN - ANG[k]; });
  var bNodes = [], bLabels = [], bLevels = [];
  branch.forEach(function (b, k) {
    var lvl = lv(b.gen), ang = ANG[b.name] != null ? ANG[b.name] : k;
    var rad = b.gen === 21 ? R * 1.4 : R;
    var lift = b.gen === 21 ? (k % 2 ? -0.45 : 0.15) : 0;      // stagger the top row so labels don't collide
    var p3 = new T.Vector3(Math.cos(ang) * rad, -lvl * STEP + lift, Math.sin(ang) * rad);
    byName[b.name] = { p: p3, ang: ang, lvl: lvl };
    var size = b.gen === 21 ? 0.11 : 0.14;
    var m = new T.Mesh(new T.SphereGeometry(size, 20, 14), new T.MeshBasicMaterial({ color: GOLD }));
    m.position.copy(p3);
    var halo = new T.Sprite(new T.SpriteMaterial({ map: texGold, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.5 }));
    halo.scale.setScalar(size * 6); m.add(halo);
    scene.add(m); bNodes.push(m); bLevels.push(lvl);
    var d = document.createElement('div');
    d.className = 'shz-label jeti shz-twig';
    d.innerHTML = '<i>' + b.gen + '</i><b></b>'; d.querySelector('b').textContent = b.name;
    labelBox.appendChild(d); bLabels.push(d);
  });
  // gold arcs from each parent to its child
  branch.forEach(function (b) {
    var P = byName[b.parent], C = byName[b.name]; if (!P || !C) return;
    var mid = P.p.clone().add(C.p).multiplyScalar(0.5); mid.y -= STEP * 0.35;
    var arc = new T.QuadraticBezierCurve3(P.p.clone(), mid, C.p.clone());
    scene.add(new T.Mesh(new T.TubeGeometry(arc, 40, 0.022, 6, false),
      new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5 })));
  });

  // jeti ata boundary disc (between gen 8 and 9)
  var jetiGen = items.reduce(function (g, it) { return it.jeti ? Math.min(g, it.gen) : g; }, 99);
  var disc = new T.Mesh(new T.RingGeometry(R + 0.6, R + 0.64, 96), new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35, side: T.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -(lv(jetiGen) - 0.5) * STEP; scene.add(disc);

  // dust / stars
  var N = 900, sp = new Float32Array(N * 3);
  for (var k = 0; k < N; k++) {
    var rr = 4 + Math.random() * 18, th = Math.random() * Math.PI * 2;
    sp[k * 3] = Math.cos(th) * rr; sp[k * 3 + 1] = 6 - Math.random() * ((LAST + 2) * STEP + 12); sp[k * 3 + 2] = Math.sin(th) * rr;
  }
  var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  var stars = new T.Points(sg, new T.PointsMaterial({ color: 0xd9c38a, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(stars);

  // HTML labels
  var labels = items.map(function (it) {
    var d = document.createElement('div');
    d.className = 'shz-label' + (it.jeti ? ' jeti' : '') + (it.hero ? ' shz-hero' : '');
    d.innerHTML = '<i>' + it.gen + '</i><b></b>';
    d.querySelector('b').textContent = it.name;
    labelBox.appendChild(d);
    return d;
  });

  // info card + counter
  var card = document.getElementById('shz-card'), cGen = card.querySelector('.g'), cName = card.querySelector('.nm'),
      cYears = card.querySelector('.y'), cNote = card.querySelector('.nt'), bar = document.getElementById('shz-bar');
  var current = -99;
  function setCard(i) {
    if (i === current) return; current = i;
    if (i < 0) {                                   // crown view
      cGen.textContent = '18–21';
      cName.textContent = crownInfo.querySelector('.nm').textContent;
      cNote.textContent = crownInfo.querySelector('.nt').textContent; cNote.hidden = false;
      cYears.hidden = true; card.classList.remove('jeti'); card.classList.add('crown');
      card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');
      return;
    }
    card.classList.remove('crown');
    var it = items[i];
    cGen.textContent = it.gen;
    cName.textContent = it.name;
    cYears.textContent = it.years; cYears.hidden = !it.years;
    cNote.textContent = it.note; cNote.hidden = !it.note;
    card.classList.toggle('jeti', it.jeti);
    card.classList.remove('flip'); void card.offsetWidth; card.classList.add('flip');
  }

  // sizing
  var W = 0, H = 0;
  function resize() {
    var r = canvas.parentNode.getBoundingClientRect(); W = r.width; H = r.height;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    camera.fov = W < 700 ? 55 : 42; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();

  // scroll progress through the section
  var prog = 0, smooth = 0, visible = false;
  function onScroll() {
    var r = sec.getBoundingClientRect(), span = r.height - window.innerHeight;
    prog = Math.min(1, Math.max(0, -r.top / Math.max(1, span)));
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) loop(); }, { rootMargin: '100px' }).observe(sec);
  } else visible = true;

  var tmp = new T.Vector3(), clock = new T.Clock(), running = false;
  function frame() {
    var t = clock.getElapsedTime();
    smooth += (prog - smooth) * (reduce ? 1 : 0.08);
    var f = smooth * LAST;                                      // fractional helix level
    var ft = Math.min(f, 18.9), y = -ft * STEP;                  // the camera parks on the crown
    var ang = f * TURN + (reduce ? 0 : t * 0.05);
    var dist = (W < 700 ? 15.5 : 12.5) + Math.max(0, f - 18.8) * (W < 700 ? 3 : 2.2);
    camera.position.set(Math.cos(ang) * dist, y + 2.4, Math.sin(ang) * dist);
    var cr = Math.min(1, Math.max(0, f - 18.2));                 // 0..1 while arriving at the crown
    camera.lookAt((W < 700 ? 0 : -1.2) + cr * (W < 700 ? 2.0 : 6.0), y - 0.8 + Math.max(0, f - 18.2) * 0.9, 0);

    var nearLv = Math.round(f), near = f > 19.55 ? -1 : items.findIndex(function (it) { return lv(it.gen) === Math.min(19, nearLv); });
    bNodes.forEach(function (m, k) {
      var d = Math.abs(bLevels[k] - f);
      m.scale.setScalar(1 + (reduce ? 0 : Math.sin(t * 2.2 + k) * 0.06));
      tmp.copy(m.position).project(camera);
      var L = bLabels[k], vis = tmp.z < 1 && d < 3.2;
      L.style.opacity = vis ? String(Math.max(0, 1 - d / 3.2)) : '0';
      L.style.transform = 'translate(' + ((tmp.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-tmp.y * 0.5 + 0.5) * H).toFixed(1) + 'px)';
    });
    nodes.forEach(function (m, i) {
      var d = Math.abs(lv(items[i].gen) - f), s = 1 + Math.max(0, 1 - d) * 0.45 + (reduce ? 0 : Math.sin(t * 2 + i) * 0.04);
      m.scale.setScalar(s);
      if (m.userData.ring) { m.userData.ring.rotation.x = t * 0.8; m.userData.ring.rotation.y = t * 0.5; }
      // label projection
      tmp.copy(m.position).project(camera);
      var L = labels[i], vis = tmp.z < 1 && d < 6;
      L.style.opacity = vis ? String(Math.max(0.15, 1 - d / 6)) : '0';
      L.style.transform = 'translate(' + ((tmp.x * 0.5 + 0.5) * W).toFixed(1) + 'px,' + ((-tmp.y * 0.5 + 0.5) * H).toFixed(1) + 'px)';
      L.classList.toggle('on', i === near);
    });
    stars.rotation.y = reduce ? 0 : t * 0.01;
    setCard(near);
    bar.style.transform = 'scaleY(' + smooth.toFixed(4) + ')';
    renderer.render(scene, camera);
  }
  function loop() {
    if (running) return; running = true;
    (function tick() {
      if (!visible) { running = false; return; }
      frame(); requestAnimationFrame(tick);
    })();
  }
  frame();

  // clicking a list entry (keyboard users) jumps to that generation
  list.addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    var i = items.findIndex(function (it) { return it.gen === +li.dataset.gen; });
    var span = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: sec.offsetTop + span * lv(items[i].gen) / LAST, behavior: reduce ? 'auto' : 'smooth' });
  });
})();
