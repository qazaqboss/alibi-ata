/* Shezhire: 20 generations as a glowing 3D helix (three.js r128).
   Data comes from the <ol id="shz-list"> markup so both languages share this file.
   Scrolling through the section moves the camera from the youngest generation
   down to the root (Alash). Falls back to the plain list without WebGL. */
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

  // --- layout: helix, youngest at top (y = 0), root at the bottom
  var STEP = 1.55, R = 3.1, TURN = 0.78;
  function pos(i) { return new T.Vector3(Math.cos(i * TURN) * R, -i * STEP, Math.sin(i * TURN) * R); }
  var pts = items.map(function (_, i) { return pos(i); });

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
  var curve = new T.CatmullRomCurve3(pts);
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
  scene.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(strand2), 300, 0.018, 6, false),
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

  // jeti ata boundary disc (between gen 8 and 9)
  var jetiIdx = items.reduce(function (k, it, i) { return it.jeti ? i : k; }, 0);
  var disc = new T.Mesh(new T.RingGeometry(R + 0.6, R + 0.64, 96), new T.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35, side: T.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -(jetiIdx + 0.5) * STEP; scene.add(disc);

  // dust / stars
  var N = 900, sp = new Float32Array(N * 3);
  for (var k = 0; k < N; k++) {
    var rr = 4 + Math.random() * 18, th = Math.random() * Math.PI * 2;
    sp[k * 3] = Math.cos(th) * rr; sp[k * 3 + 1] = 4 - Math.random() * (items.length * STEP + 12); sp[k * 3 + 2] = Math.sin(th) * rr;
  }
  var sg = new T.BufferGeometry(); sg.setAttribute('position', new T.BufferAttribute(sp, 3));
  var stars = new T.Points(sg, new T.PointsMaterial({ color: 0xd9c38a, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false }));
  scene.add(stars);

  // HTML labels
  var labelBox = document.getElementById('shz-labels');
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
  var current = -1;
  function setCard(i) {
    if (i === current) return; current = i;
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
    var f = smooth * (items.length - 1);            // fractional generation index
    var y = -f * STEP;
    var ang = f * TURN + (reduce ? 0 : t * 0.05);
    var dist = W < 700 ? 15.5 : 12.5;
    camera.position.set(Math.cos(ang) * dist, y + 2.4, Math.sin(ang) * dist);
    camera.lookAt(W < 700 ? 0 : -1.2, y - 0.8, 0);

    var near = Math.round(f);
    nodes.forEach(function (m, i) {
      var d = Math.abs(i - f), s = 1 + Math.max(0, 1 - d) * 0.45 + (reduce ? 0 : Math.sin(t * 2 + i) * 0.04);
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
    window.scrollTo({ top: sec.offsetTop + span * i / (items.length - 1), behavior: reduce ? 'auto' : 'smooth' });
  });
})();
