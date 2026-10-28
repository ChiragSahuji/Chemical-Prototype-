/* ==========================================================
   Herbal Mosquito Repellent: page interactions
   Sections: nav, tube progress, principle demo, composition bar,
   hotspots, flowchart, lab-bench simulator, safety, decision
   flow, footage.  (The explainer video lives in explainer.js.)
   ========================================================== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = window.SITE_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- nav, scroll spy, tube ---------- */
  (function nav() {
    var bar = $('#topbar'), toggle = $('#navToggle'), menu = $('#siteNav'), fill = $('#tubeFill');
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }); });

    function onScroll() {
      bar.classList.toggle('solid', window.scrollY > 40);
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.height = (p * 100) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var links = {};
    $$('a', menu).forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var ids = ['principle', 'materials', 'process', 'setup', 'explainer', 'footage', 'team'];
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === e.target.id); });
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ids.forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
      var hero = $('#top');
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); }); }, { threshold: 0.5 }).observe(hero);
    }
  })();

  /* ---------- principle demo: oil + water, with and without ethanol ---------- */
  (function demo() {
    var cv = $('#demoCanvas'); if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var jar = { x: 150, y: 36, w: 260, h: 312 };
    var mode = 'plain', shaking = 0, ps = [], layerFrac = 0, last = 0, t = 0;
    var cap = $('#demoCap');
    var CAPS = {
      plain: 'Oil is non-polar and water is polar, so the oil rises and forms its own layer.',
      plainShaken: 'Shaking breaks the oil into droplets, but they merge and rise again within seconds.',
      ethanol: 'Ethanol has a polar –OH end and a non-polar ethyl end, so it dissolves the oil and mixes with water. The oil stays as a fine haze.'
    };

    function rand(a, b) { return a + Math.random() * (b - a); }
    function seed() {
      ps = []; layerFrac = 0;
      var n = mode === 'plain' ? 70 : 340;
      for (var i = 0; i < n; i++) {
        ps.push({
          x: rand(jar.x + 14, jar.x + jar.w - 14), y: rand(jar.y + 24, jar.y + jar.h - 16),
          r: mode === 'plain' ? rand(4, 10) : rand(1.2, 2.6), vx: 0, vy: 0, parked: false
        });
      }
    }
    function setMode(m, announce) {
      mode = m;
      $$('#demoBtns [data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m); });
      seed();
      if (announce !== false) cap.textContent = m === 'plain' ? CAPS.plainShaken : CAPS.ethanol;
    }
    $$('#demoBtns [data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
    $('#demoShake').addEventListener('click', function () {
      seed(); shaking = 0.9;
      cap.textContent = mode === 'plain' ? CAPS.plainShaken : CAPS.ethanol;
    });
    seed(); cap.textContent = CAPS.plain;

    function step(dt) {
      var layerH = 62, top = jar.y + 26 + layerH * layerFrac;
      if (shaking > 0) shaking -= dt;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (p.parked) continue;
        if (shaking > 0) {
          p.vx = rand(-160, 160); p.vy = rand(-160, 160);
        } else if (mode === 'plain') {
          p.vy = -(18 + p.r * 7); p.vx = rand(-8, 8);
        } else {
          p.vx = rand(-10, 10); p.vy = rand(-10, 10);
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.x = Math.max(jar.x + p.r + 8, Math.min(jar.x + jar.w - p.r - 8, p.x));
        p.y = Math.max(jar.y + 26 + p.r, Math.min(jar.y + jar.h - p.r - 8, p.y));
        if (mode === 'plain' && shaking <= 0 && p.y <= jar.y + 26 + layerH * layerFrac + p.r + 4) {
          p.parked = true;
          layerFrac = Math.min(1, layerFrac + (p.r * p.r) / 3300);
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f3f8f3'); g.addColorStop(1, '#e1ebe2');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(16,48,42,.12)'; ctx.fillRect(0, jar.y + jar.h + 4, W, H);
      // jar clip
      ctx.save();
      roundRect(ctx, jar.x, jar.y, jar.w, jar.h, 26); ctx.clip();
      // water
      ctx.fillStyle = mode === 'ethanol' ? 'rgba(190,226,235,.95)' : 'rgba(150,218,232,.9)';
      ctx.fillRect(jar.x, jar.y + 26, jar.w, jar.h);
      if (mode === 'ethanol') { ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.fillRect(jar.x, jar.y + 26, jar.w, jar.h); }
      // oil layer
      if (mode === 'plain') {
        var lh = 62 * layerFrac;
        ctx.fillStyle = '#e0b44a'; ctx.fillRect(jar.x, jar.y + 26, jar.w, lh);
        ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(jar.x, jar.y + 26 + lh - 2, jar.w, 2);
      }
      // droplets
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; if (p.parked) continue;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = mode === 'plain' ? 'rgba(224,180,74,.95)' : 'rgba(224,180,74,.8)'; ctx.fill();
        if (mode === 'plain') { ctx.beginPath(); ctx.arc(p.x - p.r * .3, p.y - p.r * .3, p.r * .3, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fill(); }
      }
      ctx.restore();
      // jar outline
      ctx.lineWidth = 5; ctx.strokeStyle = '#4d6b63'; roundRect(ctx, jar.x, jar.y, jar.w, jar.h, 26); ctx.stroke();
      ctx.fillStyle = '#4d6b63'; roundRect(ctx, jar.x + 16, jar.y - 18, jar.w - 32, 20, 6); ctx.fill();
      // labels
      ctx.font = '600 15px "Instrument Sans", sans-serif'; ctx.fillStyle = '#2b4a42'; ctx.textAlign = 'left';
      if (mode === 'plain') {
        ctx.fillText('Oil', jar.x + jar.w + 16, jar.y + 26 + 62 * layerFrac / 2 + 5);
        ctx.fillText('Water', jar.x + jar.w + 16, jar.y + jar.h / 2 + 40);
      } else {
        ctx.fillText('Oil dissolved in', jar.x + jar.w + 16, jar.y + 120);
        ctx.fillText('ethanol, then water:', jar.x + jar.w + 16, jar.y + 140);
        ctx.fillText('fine, even haze', jar.x + jar.w + 16, jar.y + 160);
      }
      if (shaking > 0) {
        ctx.save(); ctx.translate(Math.sin(t * 60) * 2, 0); ctx.restore();
      }
    }
    function roundRect(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    var visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(cv);
    function loop(ts) {
      var dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts; t += dt;
      if (visible) { step(reduceMotion ? dt * 3 : dt); draw(); }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ---------- composition bar ---------- */
  (function qbar() {
    var note = $('#qnote');
    var TXT = {
      ethanol: 'Ethanol: 20 mL. The solvent that carries the oil into the water.',
      castor: 'Oil: 2 mL. Castor oil in our lab (citronella or lemongrass in the reference formula).',
      glycerin: 'Glycerin: 2–3 mL. Humectant and fixative.',
      water: 'Distilled water: 25 mL. The diluent that makes up the bulk.'
    };
    var base = 'Total: about 50 mL (20 + 2 + 2.5 + 25 mL).';
    $$('#qbar .q').forEach(function (q) {
      var id = q.dataset.ing;
      function on() { note.textContent = TXT[id]; }
      function off() { note.textContent = base; }
      q.addEventListener('mouseenter', on); q.addEventListener('focus', on);
      q.addEventListener('mouseleave', off); q.addEventListener('blur', off);
      q.addEventListener('click', function () {
        var map = { castor: 'ing-castor', ethanol: 'ing-ethanol', glycerin: 'ing-glycerin', water: 'ing-water' };
        var el = document.getElementById(map[id]); if (!el) return;
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        el.classList.add('hot'); setTimeout(function () { el.classList.remove('hot'); }, 1600);
      });
    });
  })();

  /* ---------- hotspot photos ---------- */
  $$('[data-hs]').forEach(function (hs) {
    var panel = $('.hs-panel', hs), pins = $$('.hs-pin', hs);
    pins.forEach(function (pin) {
      pin.setAttribute('aria-pressed', 'false');
      pin.addEventListener('click', function () {
        pins.forEach(function (p) { p.setAttribute('aria-pressed', p === pin); });
        panel.innerHTML = '';
        var b = document.createElement('b'); b.textContent = pin.dataset.title;
        panel.appendChild(b); panel.appendChild(document.createTextNode(pin.dataset.text));
      });
    });
  });

  /* ---------- process flowchart ---------- */
  var sim; // assigned later; flowchart links into it
  (function flowchart() {
    var svg = $('#flowSvg'); if (!svg) return;
    var info = $('#flowInfo');
    var NODES = {
      ethanol: { t: 'Ethanol, 20 mL (70–95%)', p: 'The solvent. Measured in the cylinder and poured into the beaker first, so the oil has something to dissolve in.', s: [2] },
      oil: { t: 'Oil, 2 mL', p: 'Added drop by drop with a dropper. Castor oil in our lab, because it was the only oil available; citronella or lemongrass oil in the reference formula.', s: [3] },
      mixer1: { t: 'Mixer 1: ethanol + oil', p: 'Stir gently with the glass rod for 1–2 minutes. The oil dissolves in the ethanol and the liquid turns clear.', s: [4] },
      glycerin: { t: 'Glycerin, 2–3 mL', p: 'Joins the mixture at Mixer 2. A humectant and fixative: it slows evaporation so the scent lasts a little longer on skin.', s: [5] },
      water: { t: 'Distilled water, 25 mL', p: 'Added slowly while stirring, so the oil breaks into tiny droplets instead of clumping. It makes up half of the batch.', s: [6] },
      mixer2: { t: 'Mixer 2: + glycerin + distilled water', p: 'Add glycerin and mix gently, then add the water slowly under continuous stirring until the mixture looks reasonably uniform. A slightly milky look is normal.', s: [5, 6, 7] },
      filter: { t: 'Filtration', p: 'If the mixture is turbid or particles remain, pass it through filter paper in a funnel. This step was in our block diagram but missing from the written procedure, so it has been added.', s: [8] },
      tank: { t: 'Storage tank: the repellent', p: 'In the lab, the storage tank is a labelled spray bottle. Transfer through a funnel, then label it with date of preparation, ingredients, batch no. and group no.', s: [9, 10] }
    };
    var order = ['ethanol', 'oil', 'mixer1', 'glycerin', 'water', 'mixer2', 'filter', 'tank'];
    var nodes = {}; $$('.fl-node', svg).forEach(function (n) { nodes[n.dataset.node] = n; });
    var timer = null, playing = false;

    function show(key) {
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.toggle('on', k === key); });
      var n = NODES[key]; if (!n) return;
      info.innerHTML = '';
      var h = document.createElement('h4'); h.textContent = n.t;
      var p = document.createElement('p'); p.textContent = n.p;
      var r = document.createElement('p'); r.className = 'steps-ref'; r.appendChild(document.createTextNode('Lab steps: '));
      n.s.forEach(function (s, i) {
        var a = document.createElement('a'); a.href = '#sim'; a.textContent = s;
        a.addEventListener('click', function (e) { e.preventDefault(); if (sim) sim.go(s - 1); document.getElementById('sim').scrollIntoView({ behavior: 'smooth' }); });
        if (i) r.appendChild(document.createTextNode(', ')); r.appendChild(a);
      });
      info.appendChild(h); info.appendChild(p); info.appendChild(r);
    }
    Object.keys(nodes).forEach(function (k) {
      nodes[k].addEventListener('click', function () { stop(); show(k); });
      nodes[k].addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); show(k); } });
    });

    // flowing dots along every connector
    var dots = $('#flowDots'), paths = ['p-eth', 'p-oil', 'p-m1m2', 'p-gly', 'p-wat', 'p-m2f', 'p-fst'];
    var html = '';
    paths.forEach(function (id, i) {
      [0, 1].forEach(function (j) {
        html += '<circle r="5" class="flow-dot"><animateMotion dur="2.6s" begin="-' + (i * .37 + j * 1.3).toFixed(2) + 's" repeatCount="indefinite"><mpath href="#' + id + '"/></animateMotion></circle>';
      });
    });
    dots.innerHTML = html;

    var btn = $('#flowPlay'), idx = 0;
    function stop() { playing = false; clearInterval(timer); btn.textContent = 'Play the flow'; }
    btn.addEventListener('click', function () {
      if (playing) { stop(); return; }
      playing = true; idx = 0; btn.textContent = 'Stop'; show(order[0]);
      timer = setInterval(function () {
        idx++; if (idx >= order.length) { stop(); return; } show(order[idx]);
      }, 2400);
    });
  })();

  /* ---------- lab-bench simulator ---------- */
  (function simulator() {
    var svg = $('#benchSvg'); if (!svg) return;
    var OILCOL = { castor: '#e0b44a', citronella: '#c6d45a' };
    var COL = { eth: '#9fc0f7', gly: '#e8b866', wat: '#a9e3ec' };
    var oilKey = 'castor', turbid = true, idx = 0, stepTimers = [], raf = null;
    var today = new Date();
    var dateTxt = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    var labelInfo = { batch: (CFG.label && CFG.label.batchNo) || 'B-01', group: (CFG.label && CFG.label.groupNo) || '' };

    /* ---- build SVG ---- */
    function beaker(id, cx, base, sc) {
      var ticks = '';
      [10, 20, 30, 40, 50, 60].forEach(function (v) {
        var y = 440 - v * 4.1667;
        ticks += '<line class="b-tick" x1="312" x2="328" y1="' + y + '" y2="' + y + '"/><text class="b-label" x="304" y="' + (y + 4) + '" text-anchor="end">' + v + '</text>';
      });
      return '<g id="' + id + '" class="fade" transform="translate(' + cx + ' ' + base + ') scale(' + sc + ') translate(-250 -446)">' +
        '<clipPath id="clip-' + id + '"><path d="M176 170H324V428Q324 440 312 440H188Q176 440 176 428Z"/></clipPath>' +
        '<g clip-path="url(#clip-' + id + ')"><g class="b-liq" id="liq-' + id + '" style="transform:translateY(250px)">' +
        '<rect id="liqr-' + id + '" x="170" y="190" width="160" height="262" fill="' + COL.eth + '"/>' +
        '<rect class="b-haze" id="haze-' + id + '" x="170" y="190" width="160" height="262" opacity="0"/>' +
        '<g id="specks-' + id + '" class="fade hide" fill="#5b5136"><circle cx="205" cy="300" r="3"/><circle cx="262" cy="340" r="2.5"/><circle cx="296" cy="282" r="3.2"/><circle cx="224" cy="380" r="2.2"/><circle cx="280" cy="398" r="2.8"/><circle cx="240" cy="250" r="2.4"/></g>' +
        '<g class="b-swirl"><path d="M190 206Q250 218 310 206"/><path d="M200 230Q250 240 300 230"/></g>' +
        '</g></g>' +
        '<path class="b-glass" fill="none" d="M166 166H180M320 166H334M172 166V428Q172 446 190 446H310Q328 446 328 428V166"/>' + ticks + '</g>';
    }
    function bottle(id, cx, base, sc) {
      return '<g id="' + id + '" class="fade" style="transform-origin:' + cx + 'px ' + base + 'px" transform="translate(' + cx + ' ' + base + ') scale(' + sc + ') translate(-250 -446)">' +
        '<clipPath id="clip-' + id + '"><rect x="206" y="290" width="88" height="150" rx="14"/></clipPath>' +
        '<g clip-path="url(#clip-' + id + ')"><g class="b-liq" id="liq-' + id + '" style="transform:translateY(150px)"><rect id="liqr-' + id + '" x="200" y="290" width="100" height="160" fill="' + COL.wat + '"/><rect class="b-haze" id="haze-' + id + '" x="200" y="290" width="100" height="160" opacity="0"/></g></g>' +
        '<rect class="b-glass" x="206" y="290" width="88" height="150" rx="14" fill="none"/>' +
        '<rect class="b-glass" x="236" y="264" width="28" height="26" fill="#cfdcd6"/>' +
        '<path class="b-glass" fill="#e9efec" d="M224 238H276V264H224ZM276 244H304V254H276Z"/>' +
        '<g id="labelg" class="fade hide"><rect class="b-label-rect" x="212" y="318" width="76" height="82" rx="3"/>' +
        '<text class="b-label-txt" x="217" y="332" font-weight="700" font-size="8.5">Herbal repellent</text>' +
        '<text class="b-label-txt" id="lbDate" x="217" y="346">Prep: ' + dateTxt + '</text>' +
        '<text class="b-label-txt" id="lbBatch" x="217" y="358">Batch: B-01</text>' +
        '<text class="b-label-txt" id="lbGroup" x="217" y="370">Group: __</text>' +
        '<text class="b-label-txt" x="217" y="383" font-size="6.2">Ethanol, oil, glycerin,</text><text class="b-label-txt" x="217" y="392" font-size="6.2">distilled water</text></g>' +
        '</g>';
    }
    svg.innerHTML =
      '<rect class="b-bench" x="0" y="486" width="760" height="34"/>' +
      '<ellipse class="b-shadow" cx="250" cy="488" rx="110" ry="7"/>' +
      // magnetic stirrer under beaker A
      '<g id="stirrer"><rect x="130" y="446" width="240" height="40" rx="7" fill="#35443f"/><rect x="132" y="446" width="236" height="6" rx="3" fill="#aab9b3"/><rect x="150" y="458" width="64" height="20" rx="3" fill="#1a0b0b"/><text id="rpm" x="182" y="474" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="15" font-weight="600" fill="#ff4a3d">0000</text><circle cx="262" cy="468" r="8" fill="#6b7d76"/><circle cx="296" cy="468" r="8" fill="#6b7d76"/><circle cx="330" cy="468" r="3.5" fill="#ff4a3d"/></g>' +
      // graduated cylinder (outer wrapper shifts it to the bench)
      '<g transform="translate(0 46)"><g id="cyl" class="cyl fade hide"><clipPath id="clip-cyl"><rect x="88" y="200" width="28" height="240" rx="3"/></clipPath>' +
        '<g clip-path="url(#clip-cyl)"><g class="b-liq" id="liq-cyl" style="transform:translateY(240px)"><rect id="liqr-cyl" x="84" y="200" width="36" height="250" fill="' + COL.eth + '"/></g></g>' +
        '<path class="b-glass" fill="none" d="M84 196H92M116 196H122M88 196V436Q88 442 94 442H110Q116 442 116 436V196"/>' +
        '<path class="b-glass" fill="none" d="M70 442H134" />' +
        '<line class="b-tick" x1="104" x2="116" y1="248" y2="248"/><line class="b-tick" x1="104" x2="116" y1="296" y2="296"/><line class="b-tick" x1="104" x2="116" y1="344" y2="344"/><line class="b-tick" x1="104" x2="116" y1="392" y2="392"/>' +
      '</g></g>' +
      beaker('A', 250, 446, 1) +
      beaker('B', 540, 486, .78) +
      bottle('C', 660, 486, 1) +
      // pour stream from cylinder (set in JS)
      '<line id="stream" class="b-stream" x1="194" x2="194" y1="152" y2="300" stroke="' + COL.eth + '"/>' +
      // dropper
      '<g id="dropper" class="fade hide"><rect x="238" y="22" width="24" height="46" rx="12" fill="#33423e"/><path class="b-glass" fill="rgba(255,255,255,.55)" d="M241 68H259V130L252 154H248L241 130Z"/>' +
        '<circle id="d1" class="b-drop" cx="250" cy="160" r="5.5" fill="#e0b44a"/><circle id="d2" class="b-drop" cx="250" cy="160" r="5.5" fill="#e0b44a"/><circle id="d3" class="b-drop" cx="250" cy="160" r="5.5" fill="#e0b44a"/></g>' +
      // glass rod
      '<g id="rod" class="b-rod fade hide"><g class="b-rod-inner" style="transform-origin:300px 110px"><line x1="302" y1="96" x2="236" y2="430" stroke="#6e8a81" stroke-width="7" stroke-linecap="round"/><line x1="302" y1="96" x2="236" y2="430" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/></g></g>' +
      // funnel
      '<g id="funnel" class="fade hide" style="transform:translate(540px,128px)"><path class="b-glass" fill="rgba(255,255,255,.4)" d="M-52 0L-7 64V96H7V64L52 0Z"/><path id="paper" class="b-paper" fill="#fff" stroke="#b9c7c0" stroke-width="2" opacity="0" d="M-44 6L0 66L44 6Z"/></g>' +
      // pour arrow A -> funnel
      '<path id="pourArrow" class="b-stream" stroke="#4d6b63" d="M340 160C400 100 470 100 500 140" style="stroke-width:5"/>' +
      // sparkles for cleaning
      '<g id="sparks" class="">' + [[190,300],[310,260],[250,380],[330,360]].map(function (p) { return '<path class="spark" d="M' + p[0] + ' ' + (p[1] - 14) + 'L' + (p[0] + 4) + ' ' + (p[1] - 4) + 'L' + (p[0] + 14) + ' ' + p[1] + 'L' + (p[0] + 4) + ' ' + (p[1] + 4) + 'L' + p[0] + ' ' + (p[1] + 14) + 'L' + (p[0] - 4) + ' ' + (p[1] + 4) + 'L' + (p[0] - 14) + ' ' + p[1] + 'L' + (p[0] - 4) + ' ' + (p[1] - 4) + 'Z" fill="#ead84c" stroke="#9a8a10" stroke-width="1.5"/>'; }).join('') + '</g>';

    var el = function (id) { return document.getElementById(id); };
    var A = { liq: el('liq-A'), r: el('liqr-A'), haze: el('haze-A'), g: el('A'), specks: el('specks-A') };
    var B = { liq: el('liq-B'), r: el('liqr-B'), haze: el('haze-B'), g: el('B') };
    var C = { liq: el('liq-C'), r: el('liqr-C'), haze: el('haze-C'), g: el('C') };
    var Cyl = { g: el('cyl'), liq: el('liq-cyl'), r: el('liqr-cyl') };

    /* ---- step data. Each state() returns the target scene. ---- */
    var STEPS = [
      { t: 'Wash and dry all apparatus', d: 'Rinse the beaker, measuring cylinder, glass rod, dropper and funnel, then dry them.', why: 'Leftover water changes the ethanol strength, and dust or residue can contaminate the batch.',
        st: function () { return { A: 0, cum: { e: 0, o: 0, g: 0, w: 0 }, sparkle: true }; } },
      { t: 'Measure 20 mL ethanol', d: 'Pour about 20 mL of ethanol (70–95%) into the beaker. Read the measuring cylinder at eye level, at the bottom of the curved surface.', why: 'Ethanol goes in first: it is the solvent the oil will dissolve in.',
        st: function () { return { A: 20, cum: { e: 20, o: 0, g: 0, w: 0 }, cyl: { tint: COL.eth, from: 20 }, pour: true }; } },
      { t: 'Add 2 mL oil with the dropper', d: function () { return oilKey === 'castor' ? 'Add 2 mL of castor oil, drop by drop. It is thick and amber, but it dissolves into the ethanol.' : 'Add 2 mL of citronella oil, drop by drop. It dissolves into the ethanol and gives the characteristic scent.'; }, why: 'A dropper keeps the amount accurate and lets each drop disperse before the next lands.',
        st: function () { return { A: 22, cum: { e: 20, o: 2, g: 0, w: 0 }, dropper: { col: OILCOL[oilKey], dur: 1.1 } }; } },
      { t: 'Stir gently for 1–2 minutes', d: 'Mix with the glass rod, or on the magnetic stirrer, until the oil is fully dissolved and the liquid looks clear.', why: 'Gentle stirring dissolves the oil without whipping air bubbles into the liquid.',
        st: function () { return { A: 22, cum: { e: 20, o: 2, g: 0, w: 0 }, stir: true, timer: 90 }; } },
      { t: 'Add 2–3 mL glycerin and mix gently', d: 'Add glycerin slowly. It is thick, so let it run down the side or drip from the dropper, then mix gently.', why: 'Glycerin is the humectant and fixative: it slows evaporation of the oil so the scent lasts longer.',
        st: function () { return { A: 24.5, cum: { e: 20, o: 2, g: 2.5, w: 0 }, dropper: { col: COL.gly, dur: 2.2 }, stir: true }; } },
      { t: 'Add 25 mL distilled water slowly', d: 'Pour the water in a thin stream while stirring continuously. Watch the liquid turn milky.', why: 'Water is the one thing the oil does not like. Slow addition under stirring breaks the oil into tiny droplets instead of clumps. Ethanol keeps them dispersed.',
        st: function () { return { A: 49.5, cum: { e: 20, o: 2, g: 2.5, w: 25 }, cyl: { tint: COL.wat, from: 25 }, pour: true, stir: true, haze: .45, specks: true }; } },
      { t: 'Stir until reasonably uniform', d: 'Keep stirring until the mixture looks even throughout. A slight milky haze is normal.', why: 'Uniform mixing spreads the oil droplets evenly, so each spray delivers the same dose.',
        st: function () { return { A: 49.5, cum: { e: 20, o: 2, g: 2.5, w: 25 }, stir: true, haze: .4, specks: true, rpm: true }; } },
      { t: 'Filter if any turbidity or particles remain', d: function () { return turbid ? 'Pass the mixture through filter paper in a funnel into a clean beaker. The specks stay on the paper.' : 'The mixture is free of particles, so no filtering is needed. Skip to the next step.'; }, why: 'Filtering removes dust and solid specks. The milky haze is not dirt: it is tiny oil droplets, and it passes through the paper.',
        st: function () { return turbid ? { A: 0, B: 49.5, cum: { e: 20, o: 2, g: 2.5, w: 25 }, haze: .4, funnel: 'B', paper: true, arrow: true, extra: 'turbid' } : { A: 49.5, B: 0, cum: { e: 20, o: 2, g: 2.5, w: 25 }, haze: .4, extra: 'turbid' }; } },
      { t: 'Transfer to the spray bottle with a funnel', d: 'Place the funnel in the neck of a clean spray bottle and pour the repellent in. Leave a little air space at the top.', why: 'The funnel stops spills, which matters with a flammable, skin-contact product.',
        st: function () { return turbid ? { A: 0, B: 0, C: 49.5, cum: { e: 20, o: 2, g: 2.5, w: 25 }, haze: .4, funnel: 'C', arrow: true } : { A: 0, B: 0, C: 49.5, cum: { e: 20, o: 2, g: 2.5, w: 25 }, haze: .4, funnel: 'C', arrow: true, fromA: true }; } },
      { t: 'Label the bottle', d: 'Write the date of preparation, ingredients, batch no. and group no. on the label. Fill in yours below.', why: 'A label makes the batch traceable and warns the next person that it contains ethanol. Shake well before each use.',
        st: function () { return { A: 0, B: 0, C: 49.5, cum: { e: 20, o: 2, g: 2.5, w: 25 }, haze: .4, label: true }; } }
    ];

    function mixColor(c) {
      var cols = [COL.eth, OILCOL[oilKey], COL.gly, COL.wat], w = [c.e, c.o * 4, c.g * 4, c.w], tot = 0, rgb = [0, 0, 0];
      for (var i = 0; i < 4; i++) {
        var h = cols[i].replace('#', ''), v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
        for (var k = 0; k < 3; k++) rgb[k] += v[k] * w[i];
        tot += w[i];
      }
      if (!tot) return COL.eth;
      return 'rgb(' + rgb.map(function (x) { return Math.round(x / tot); }).join(',') + ')';
    }
    function setLevel(obj, ml, perMl, cap) { obj.liq.style.transform = 'translateY(' + ((cap - ml) * perMl) + 'px)'; }

    /* ---- apply a step ---- */
    function clearTimers() { stepTimers.forEach(clearTimeout); stepTimers = []; if (raf) cancelAnimationFrame(raf); raf = null; }
    function later(fn, ms) { stepTimers.push(setTimeout(fn, ms)); }

    function apply() {
      clearTimers();
      var S = STEPS[idx].st();
      var col = mixColor(S.cum);
      var hz = S.haze || 0;
      var vis = function (g, on) { g.classList.toggle('hide', !on); };

      svg.classList.toggle('stirring', !!S.stir);
      svg.classList.toggle('sparkle', !!S.sparkle);
      svg.classList.toggle('dropping', !!S.dropper);
      svg.classList.toggle('pouring', !!S.pour);

      // beaker A
      A.r.setAttribute('fill', col); A.haze.setAttribute('opacity', hz);
      setLevel(A, S.A, 4.1667, 60);
      vis(A.g, !S.label); A.g.style.opacity = (S.label ? 0 : 1);
      vis(A.specks, !!S.specks && turbid);
      // receiver B
      B.r.setAttribute('fill', col); B.haze.setAttribute('opacity', hz);
      setLevel(B, S.B || 0, 4.1667, 60);
      var showB = !!(S.funnel === 'B' || (S.funnel === 'C' && turbid && (S.B || 0) >= 0)) && !S.label;
      vis(B.g, showB);
      // bottle C
      C.r.setAttribute('fill', col); C.haze.setAttribute('opacity', hz);
      setLevel(C, S.C || 0, 2.5, 60);
      var showC = idx >= 8;
      vis(C.g, showC);
      var Cg = C.g;
      if (S.label) { Cg.setAttribute('transform', 'translate(380 486) scale(1.7) translate(-250 -446)'); }
      else { Cg.setAttribute('transform', 'translate(660 486) scale(1) translate(-250 -446)'); }
      el('labelg').classList.toggle('hide', !S.label);

      // cylinder
      var cylOn = !!S.cyl; vis(Cyl.g, cylOn); Cyl.g.classList.remove('tilt');
      var stream = el('stream');
      if (cylOn) {
        Cyl.r.setAttribute('fill', S.cyl.tint);
        Cyl.liq.style.transition = 'none'; Cyl.liq.style.transform = 'translateY(' + ((50 - S.cyl.from) * 4.8) + 'px)';
        void Cyl.liq.getBoundingClientRect(); Cyl.liq.style.transition = '';
        stream.setAttribute('stroke', S.cyl.tint);
        var surf = 440 - S.A * 4.1667; stream.setAttribute('y2', Math.max(210, surf));
        later(function () { Cyl.g.classList.add('tilt'); }, 500);
        later(function () { Cyl.liq.style.transform = 'translateY(' + (50 * 4.8) + 'px)'; }, 1100);
      }
      // dropper
      vis(el('dropper'), !!S.dropper);
      if (S.dropper) {
        svg.style.setProperty('--dur', S.dropper.dur + 's');
        svg.style.setProperty('--fall', Math.max(30, 440 - S.A * 4.1667 - 160) + 'px');
        ['d1', 'd2', 'd3'].forEach(function (id) { el(id).setAttribute('fill', S.dropper.col); });
      }
      // rod, funnel, paper, arrow
      vis(el('rod'), !!S.stir);
      var fn = el('funnel'); vis(fn, !!S.funnel);
      if (S.funnel === 'B') fn.style.transform = 'translate(540px,128px)';
      if (S.funnel === 'C') fn.style.transform = 'translate(660px,172px)';
      el('paper').setAttribute('opacity', S.paper ? 1 : 0);
      var arrow = el('pourArrow'); svg.classList.toggle('arrowing', !!S.arrow);
      if (S.arrow) arrow.setAttribute('d', S.funnel === 'C' ? 'M340 160C430 80 560 80 640 126' : 'M340 160C400 100 460 100 510 128');
      el('rpm').textContent = (S.stir ? '0640' : '0000');

      // labels
      el('lbBatch').textContent = 'Batch: ' + labelInfo.batch;
      el('lbGroup').textContent = 'Group: ' + (labelInfo.group || '__');

      renderText(S);
    }

    /* ---- UI ---- */
    var stepsOl = $('#simSteps');
    STEPS.forEach(function (s, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = s.t; b.addEventListener('click', function () { go(i); });
      li.appendChild(b); stepsOl.appendChild(li);
    });
    function renderText(S) {
      var s = STEPS[idx];
      $('#simTitle').textContent = (idx + 1) + '. ' + s.t;
      $('#simText').textContent = typeof s.d === 'function' ? s.d() : s.d;
      $('#simWhy').textContent = 'Why: ' + s.why;
      $('#simVol').textContent = (idx >= 8 ? (S.C || 0) : (S.B && S.funnel === 'B' ? S.B : S.A)) + ' mL';
      $('#simStepNo').textContent = (idx + 1) + ' / ' + STEPS.length;
      $$('#simSteps button').forEach(function (b, i) {
        if (i === idx) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
        b.classList.toggle('done', i < idx);
      });
      $('#simPrev').disabled = idx === 0;
      $('#simNext').textContent = idx === STEPS.length - 1 ? 'Restart' : 'Next step';
      // composition mini bar
      var c = S.cum, tot = c.e + c.o + c.g + c.w;
      $('#simMini').innerHTML = '<div class="mini-bar"><i style="background:' + COL.eth + ';flex-grow:' + (c.e || 0.001) + '"></i><i style="background:' + OILCOL[oilKey] + ';flex-grow:' + (c.o || 0.001) + '"></i><i style="background:' + COL.gly + ';flex-grow:' + (c.g || 0.001) + '"></i><i style="background:' + COL.wat + ';flex-grow:' + (c.w || 0.001) + '"></i></div><span style="font-size:.75rem;opacity:.7;margin-top:4px">Added so far: ' + tot.toFixed(1).replace('.0', '') + ' mL of ingredients</span>';
      renderExtra(S);
    }
    function renderExtra(S) {
      var ex = $('#simExtra'); ex.innerHTML = '';
      if (S.timer) {
        var wrap = document.createElement('div'); wrap.style.cssText = 'flex:1;min-width:200px';
        wrap.innerHTML = '<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:.85rem"><span>Stirring</span><span id="tm">0:00</span></div><div class="meter-bar" style="width:100%;background:var(--tint)"><span id="tb"></span></div><div style="font-size:.78rem;color:var(--muted);margin-top:4px">Fast-forwarded: 1.5 minutes in about 6 seconds</div>';
        ex.appendChild(wrap);
        var t0 = performance.now(), dur = reduceMotion ? 800 : 6000;
        (function tick(now) {
          var p = Math.min(1, ((now || performance.now()) - t0) / dur), s = Math.round(S.timer * p);
          var tm = document.getElementById('tm'), tb = document.getElementById('tb'); if (!tm) return;
          tm.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); tb.style.width = (p * 100) + '%';
          if (p < 1) raf = requestAnimationFrame(tick);
        })();
      }
      if (S.extra === 'turbid') {
        var lb = document.createElement('label'), cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = turbid;
        cb.addEventListener('change', function () { turbid = cb.checked; apply(); });
        lb.appendChild(cb); lb.appendChild(document.createTextNode(' The mixture has particles or looks turbid'));
        ex.appendChild(lb);
      }
      if (S.label) {
        [['Batch no.', 'batch', 'text-batch'], ['Group no.', 'group', 'text-group']].forEach(function (f) {
          var lb = document.createElement('label'), inp = document.createElement('input');
          inp.type = 'text'; inp.value = labelInfo[f[1]]; inp.maxLength = 8; inp.setAttribute('aria-label', f[0]); inp.placeholder = f[0];
          inp.addEventListener('input', function () { labelInfo[f[1]] = inp.value.trim(); el('lbBatch').textContent = 'Batch: ' + (labelInfo.batch || '__'); el('lbGroup').textContent = 'Group: ' + (labelInfo.group || '__'); });
          lb.appendChild(document.createTextNode(f[0] + ' ')); lb.appendChild(inp); ex.appendChild(lb);
        });
        var d = document.createElement('span'); d.textContent = 'Date: ' + dateTxt; ex.appendChild(d);
      }
    }
    function go(i) { idx = Math.max(0, Math.min(STEPS.length - 1, i)); apply(); }
    $('#simPrev').addEventListener('click', function () { stopAuto(); go(idx - 1); });
    $('#simNext').addEventListener('click', function () { stopAuto(); go(idx === STEPS.length - 1 ? 0 : idx + 1); });
    var auto = null;
    function stopAuto() { if (auto) { clearInterval(auto); auto = null; $('#simPlay').textContent = 'Auto-play'; } }
    $('#simPlay').addEventListener('click', function () {
      if (auto) { stopAuto(); return; }
      $('#simPlay').textContent = 'Pause';
      if (idx === STEPS.length - 1) go(0);
      auto = setInterval(function () { if (idx >= STEPS.length - 1) { stopAuto(); return; } go(idx + 1); }, 6500);
    });
    $$('input[name="oil"]').forEach(function (r) { r.addEventListener('change', function () { oilKey = r.value; apply(); }); });
    $('#sim').addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
      if (e.key === 'ArrowRight') { stopAuto(); go(idx + 1); }
      if (e.key === 'ArrowLeft') { stopAuto(); go(idx - 1); }
    });
    sim = { go: go };
    apply();
  })();

  /* ---------- safety checklist ---------- */
  (function safety() {
    var list = $('#safetyList'); if (!list) return;
    var ITEMS = [
      ['Wear goggles, gloves and a lab coat', 'Splashes of ethanol and oil sting the eyes and skin.'],
      ['Keep the exhaust fans running', 'Ethanol vapour is heavier than air and collects at bench level.'],
      ['Keep ethanol away from flames and hot plates', 'Switch off the gas burner and the stirrer’s heater before opening the bottle.'],
      ['Use ethanol, never methanol', 'Methanol is toxic and must not go into anything sprayed on skin.'],
      ['Label every container', 'Date of preparation, ingredients, batch no. and group no.'],
      ['Patch test before wider use', 'Try a small patch of skin and wait a day to check for irritation.'],
      ['Keep it away from eyes, mouth and children', 'It is flammable and not a drink or a toy. Shake well before each use.'],
      ['Dispose of leftovers as the lab instructs', 'Do not pour solvent mixtures down an open drain without checking.']
    ];
    var bar = $('#safetyBar'), count = $('#safetyCount'), done = $('#safetyDone');
    ITEMS.forEach(function (it, i) {
      var li = document.createElement('li'), lb = document.createElement('label');
      lb.innerHTML = '<input type="checkbox"><span class="box"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span class="ct"><b></b><span></span></span>';
      $('b', lb).textContent = it[0]; $('.ct > span', lb).textContent = it[1];
      $('input', lb).addEventListener('change', update);
      li.appendChild(lb); list.appendChild(li);
    });
    function update() {
      var n = $$('input:checked', list).length;
      bar.style.width = (n / ITEMS.length * 100) + '%'; count.textContent = n + ' / ' + ITEMS.length;
      done.hidden = n !== ITEMS.length;
    }
  })();

  /* ---------- decision flow: before you spray ---------- */
  (function decision() {
    var box = $('#decision'); if (!box) return;
    var Q = {
      shake: { q: 'Have you shaken the bottle well?', y: 'patch', n: { stop: 'Shake it first. The oil slowly separates from the water, so the first sprays would be too strong or too weak.' } },
      patch: { q: 'Have you done a patch test on a small area of skin and waited a day with no irritation?', y: 'flame', n: { stop: 'Do the patch test first. Any new mixture can irritate some skin, even if the ingredients are gentle.' } },
      flame: { q: 'Is there an open flame, a lit stove or a hot surface nearby?', y: { stop: 'Move away first. Ethanol vapour is flammable, and a spray puts a lot of it in the air.' }, n: 'eyes' },
      eyes: { q: 'Are you spraying away from your eyes, mouth and any broken skin?', y: { ok: 'You are good to go. Spray on exposed skin and clothing, then rub in lightly with clean hands.' }, n: { stop: 'Avoid eyes, mouth and broken skin. For the face, spray onto your hands first and then apply.' } }
    };
    var trail = [];
    function render(key) {
      box.innerHTML = '';
      if (trail.length) { var t = document.createElement('div'); t.className = 'dtrail'; trail.forEach(function (x) { var s = document.createElement('span'); s.textContent = x; t.appendChild(s); }); box.appendChild(t); }
      var node = Q[key];
      var q = document.createElement('p'); q.className = 'dq'; q.textContent = node.q; box.appendChild(q);
      var a = document.createElement('div'); a.className = 'dans';
      [['Yes', node.y, ''], ['No', node.n, 'no']].forEach(function (o) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + o[2]; b.textContent = o[0];
        b.addEventListener('click', function () {
          trail.push(node.q.replace(/\?$/, '') + ': ' + o[0]);
          typeof o[1] === 'string' ? render(o[1]) : end(o[1]);
        });
        a.appendChild(b);
      });
      box.appendChild(a);
    }
    function end(r) {
      box.innerHTML = '';
      var t = document.createElement('div'); t.className = 'dtrail'; trail.forEach(function (x) { var s = document.createElement('span'); s.textContent = x.split(':')[0].replace(/^Have you |^Is there |^Are you /, '') + (x.slice(-3) === 'Yes' ? ': yes' : ': no'); t.appendChild(s); }); box.appendChild(t);
      var d = document.createElement('div'); d.className = 'dend ' + (r.ok ? 'ok' : 'stop');
      d.textContent = r.ok || r.stop;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-small'; b.textContent = 'Start again';
      b.addEventListener('click', function () { trail = []; render('shake'); });
      d.appendChild(document.createElement('br')); d.appendChild(b); box.appendChild(d);
    }
    render('shake');
  })();

  /* ---------- footage: YouTube placeholders, driven by js/config.js ---------- */
  (function footage() {
    var grid = $('#footageGrid'); if (!grid) return;
    function ytId(v) {
      if (!v) return '';
      var m = String(v).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
      if (m) return m[1];
      return /^[\w-]{11}$/.test(v) ? v : '';
    }
    (CFG.footage || []).forEach(function (f) {
      var card = document.createElement('article'); card.className = 'vid';
      var frame = document.createElement('div'); frame.className = 'vid-frame';
      var id = ytId(f.youtube);
      if (id) {
        var ifr = document.createElement('iframe');
        ifr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?controls=1&rel=0&playsinline=1'; ifr.title = f.title; ifr.loading = 'lazy';
        ifr.referrerPolicy = 'strict-origin-when-cross-origin';
        ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; ifr.allowFullscreen = true;
        frame.appendChild(ifr);
      } else {
        frame.innerHTML = '<div class="vid-ph"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="9" width="38" height="30" rx="6"/><path d="M20 18l10 6-10 6z"/></svg><b>Video coming soon</b><span>Placeholder for our own lab recording</span></div>';
      }
      var meta = document.createElement('div'); meta.className = 'vid-meta';
      var h = document.createElement('h3'); h.textContent = f.title; var p = document.createElement('p'); p.textContent = f.description || '';
      meta.appendChild(h); meta.appendChild(p); card.appendChild(frame); card.appendChild(meta); grid.appendChild(card);
    });
  })();
})();
