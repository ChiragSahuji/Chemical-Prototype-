/* ==========================================================
   Explainer: a 2:25 motion-graphics walkthrough drawn on a canvas.
   Every frame is a pure function of time (render(t)), so scrubbing,
   chapters, speed changes and recording all work the same way.
   ========================================================== */
(function () {
  'use strict';
  var cv = document.getElementById('exCanvas');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var W = 1280, H = 720;

  var C = { bg0: '#0a1d19', bg1: '#133830', ink: '#eaf3ee', dim: 'rgba(234,243,238,.62)', acc: '#ead84c',
    eth: '#6aa0ff', oil: '#e3b53f', gly: '#eab35a', wat: '#62cfdc', glass: 'rgba(255,255,255,.78)', red: '#ff6b5a', ok: '#8fd14f' };

  /* ---------- helpers ---------- */
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function seg(u, a, b) { return clamp((u - a) / (b - a), 0, 1); }
  function eio(k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function eo(k) { return 1 - Math.pow(1 - k, 3); }
  function rnd(i) { var s = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); }
  function hex(h) { if (h.charAt(0) === 'r') { var m = h.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, k) { var x = hex(a), y = hex(b); return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(lerp(x[i], y[i], k)); }).join(',') + ')'; }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function text(s, x, y, size, color, align, weight, family) {
    ctx.font = (weight || 600) + ' ' + size + 'px ' + (family || '"Bricolage Grotesque","Segoe UI",system-ui,sans-serif');
    ctx.fillStyle = color || C.ink; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y);
  }
  function mono(s, x, y, size, color, align) { text(s, x, y, size, color, align, 600, '"JetBrains Mono",ui-monospace,Consolas,monospace'); }
  function wrap(s, maxW, size) {
    ctx.font = '500 ' + size + 'px "Instrument Sans","Segoe UI",system-ui,sans-serif';
    var words = s.split(' '), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line); return lines;
  }
  function today() { return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------- backdrop ---------- */
  function backdrop(t) {
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, C.bg0); g.addColorStop(1, C.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.045)'; ctx.lineWidth = 1;
    for (var x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 0; y <= H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    for (var i = 0; i < 22; i++) {
      var px = rnd(i) * W, py = (rnd(i + 50) * H + t * (8 + rnd(i + 9) * 14)) % (H + 40) - 20;
      ctx.beginPath(); ctx.arc(px, H - py, 2 + rnd(i + 3) * 4, 0, 6.283);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.03 + rnd(i + 7) * 0.05) + ')'; ctx.fill();
    }
    var v = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    // bench line
    ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(0, 530, W, H - 530);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(0, 530, W, 2);
  }
  function header(step, title, u) {
    var a = eo(seg(u, 0, .08)), off = (1 - a) * -40;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(off, 0);
    if (step) { rr(56, 44, 112, 40, 20); ctx.fillStyle = C.acc; ctx.fill(); text('Step ' + step, 112, 71, 22, '#10302a', 'center', 700); text(title, 188, 73, 36, C.ink, 'left', 700); }
    else text(title, 56, 73, 36, C.ink, 'left', 700);
    ctx.restore();
  }

  /* ---------- glassware ---------- */
  function glassStroke(w) { ctx.lineWidth = w || 5; ctx.strokeStyle = C.glass; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  /* beaker: x centre, y base, level 0..1 of 60 mL */
  function beaker(o) {
    var x = o.x, y = o.y, w = o.w || 260, h = o.h || 330, l = x - w / 2, r = x + w / 2, top = y - h;
    var ly = y - 6 - (h - 8) * clamp(o.level || 0, 0, 1);
    ctx.save(); ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
    ctx.beginPath(); ctx.moveTo(l + 5, top); ctx.lineTo(l + 5, y - 26); ctx.quadraticCurveTo(l + 5, y - 5, l + 28, y - 5); ctx.lineTo(r - 28, y - 5); ctx.quadraticCurveTo(r - 5, y - 5, r - 5, y - 26); ctx.lineTo(r - 5, top); ctx.closePath();
    ctx.save(); ctx.clip();
    if (o.level > 0) {
      ctx.fillStyle = o.color || C.eth; ctx.globalAlpha *= .88; ctx.fillRect(l, ly, w, y - ly); ctx.globalAlpha /= .88;
      if (o.haze) { ctx.fillStyle = 'rgba(255,255,255,' + o.haze + ')'; ctx.fillRect(l, ly, w, y - ly); }
      if (o.inside) o.inside(ly, l, r, y);
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(l, ly, w, 3);
    }
    ctx.restore();
    glassStroke(5); ctx.beginPath(); ctx.moveTo(l - 10, top - 4); ctx.lineTo(l, top); ctx.lineTo(l, y - 28); ctx.quadraticCurveTo(l, y, l + 30, y); ctx.lineTo(r - 30, y); ctx.quadraticCurveTo(r, y, r, y - 28); ctx.lineTo(r, top); ctx.lineTo(r + 10, top - 4); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(l + 16, top + 20, 8, h * .6);
    if (o.ticks !== false) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(255,255,255,.65)';
      for (var v = 10; v <= 50; v += 10) { var ty = y - 6 - (h - 8) * v / 60; ctx.beginPath(); ctx.moveTo(r - 34, ty); ctx.lineTo(r - 4, ty); ctx.stroke(); }
    }
    ctx.restore();
  }
  /* graduated cylinder, lip pivot at (px,py), body hangs down-left, rot clockwise (rad), level 0..1 of 50 mL */
  function cylinder(o) {
    var w = o.w || 62, h = o.h || 300, rot = o.rot || 0;
    ctx.save(); ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha); ctx.translate(o.px, o.py); ctx.rotate(rot);
    ctx.beginPath(); ctx.moveTo(-w + 4, 0); ctx.lineTo(-w + 4, h - 10); ctx.quadraticCurveTo(-w + 4, h - 2, -w + 14, h - 2); ctx.lineTo(-14, h - 2); ctx.quadraticCurveTo(-4, h - 2, -4, h - 10); ctx.lineTo(-4, 0); ctx.closePath();
    ctx.save(); ctx.clip();
    if (o.level > 0) {
      var s = (1 - o.level) * h * Math.cos(rot);
      ctx.rotate(-rot); ctx.fillStyle = o.color || C.eth; ctx.globalAlpha *= .9;
      var s2 = s; // surface in world-horizontal frame, relative to the lip
      ctx.fillRect(-w * 3, s2, w * 6, h * 2);
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(-w * 3, s2, w * 6, 2.5);
      ctx.rotate(rot);
    }
    ctx.restore();
    glassStroke(4.5); ctx.beginPath(); ctx.moveTo(-w - 6, -2); ctx.lineTo(-w, 0); ctx.lineTo(-w, h - 12); ctx.quadraticCurveTo(-w, h, -w + 14, h); ctx.lineTo(-14, h); ctx.quadraticCurveTo(0, h, 0, h - 12); ctx.lineTo(0, 0); ctx.lineTo(6, -2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w - 8, h + 6); ctx.lineTo(8, h + 6); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    for (var i = 1; i <= 9; i++) { var ty = h - 8 - (h - 20) * i / 10; ctx.beginPath(); ctx.moveTo(-w + 2, ty); ctx.lineTo(-w + (i % 2 ? 16 : 26), ty); ctx.stroke(); }
    ctx.restore();
  }
  function dropper(x, tipY, sq) {
    ctx.save();
    var k = 1 - (sq || 0) * .18;
    rr(x - 17, tipY - 215, 34, 66 * k, 17); ctx.fillStyle = '#26332f'; ctx.fill();
    glassStroke(4); ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.beginPath(); ctx.moveTo(x - 14, tipY - 150); ctx.lineTo(x + 14, tipY - 150); ctx.lineTo(x + 14, tipY - 50); ctx.lineTo(x + 4, tipY); ctx.lineTo(x - 4, tipY); ctx.lineTo(x - 14, tipY - 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function rod(x1, y1, x2, y2) {
    ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(200,225,218,.9)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1 - 2, y1); ctx.lineTo(x2 - 2, y2); ctx.stroke(); ctx.restore();
  }
  function funnel(x, y, sc, paper) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (paper) { ctx.beginPath(); ctx.moveTo(-88, 6); ctx.lineTo(0, 118); ctx.lineTo(88, 6); ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.fill(); ctx.strokeStyle = 'rgba(180,200,192,.9)'; ctx.lineWidth = 2; ctx.stroke(); }
    glassStroke(5); ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.beginPath(); ctx.moveTo(-104, 0); ctx.lineTo(-15, 112); ctx.lineTo(-15, 176); ctx.lineTo(15, 176); ctx.lineTo(15, 112); ctx.lineTo(104, 0); ctx.stroke();
    ctx.restore();
  }
  function bottle(o) {
    var x = o.x, y = o.y, w = o.w || 150, h = o.h || 250, l = x - w / 2, top = y - h;
    ctx.save(); ctx.translate(x, y); var sc = o.scale || 1; ctx.scale(sc, sc); ctx.translate(-x, -y);
    ctx.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha);
    rr(l, top, w, h, 24); ctx.save(); ctx.clip();
    if (o.level > 0) { var ly = y - (h - 6) * o.level; ctx.fillStyle = o.color || C.wat; ctx.globalAlpha *= .9; ctx.fillRect(l, ly, w, y - ly); ctx.globalAlpha /= .9; if (o.haze) { ctx.fillStyle = 'rgba(255,255,255,' + o.haze + ')'; ctx.fillRect(l, ly, w, y - ly); } ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(l, ly, w, 3); }
    ctx.restore();
    glassStroke(5); rr(l, top, w, h, 24); ctx.stroke();
    rr(x - 26, top - 36, 52, 38, 4); ctx.fillStyle = 'rgba(210,225,220,.9)'; ctx.fill(); ctx.stroke();
    rr(x - 46, top - 74, 92, 40, 8); ctx.fillStyle = '#e8efec'; ctx.fill(); ctx.stroke();
    rr(x + 40, top - 66, 52, 18, 6); ctx.fillStyle = '#e8efec'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(l + 14, top + 24, 8, h * .6);
    if (o.label) o.label(l, top, w, h);
    ctx.restore();
  }
  function stream(x, y1, y2, color, t, wd) {
    if (y2 <= y1) return;
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha *= .85; ctx.lineCap = 'round'; ctx.lineWidth = wd || 9; ctx.setLineDash([16, 10]); ctx.lineDashOffset = -t * 160;
    ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth = (wd || 9) * .45; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(x - 2, y1); ctx.lineTo(x - 2, y2); ctx.stroke(); ctx.restore();
  }
  function drop(x, y, r, color, a) { ctx.save(); ctx.globalAlpha *= (a === undefined ? 1 : a); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - r * 1.9); ctx.quadraticCurveTo(x + r * 1.1, y - r * .2, x + r, y + r * .3); ctx.arc(x, y + r * .3, r, 0, Math.PI); ctx.quadraticCurveTo(x - r * 1.1, y - r * .2, x, y - r * 1.9); ctx.fill(); ctx.restore(); }
  function tag(s, x, y, color, align) {
    ctx.font = '600 24px "Instrument Sans","Segoe UI",sans-serif'; var w = ctx.measureText(s).width + 28;
    var lx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    rr(lx, y - 30, w, 44, 22); ctx.fillStyle = 'rgba(8,24,20,.82)'; ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    text(s, lx + 14, y, 24, '#fff', 'left', 600, '"Instrument Sans","Segoe UI",sans-serif');
  }
  function fadeIn(u, a, b) { return eo(seg(u, a, b)); }

  /* ---------- scenes ---------- */
  var OIL = C.oil;

  function sTitle(u, t) {
    var a = fadeIn(u, .05, .35), b = fadeIn(u, .25, .55);
    // decorative beaker that fills with the four ingredients
    var f1 = eio(seg(u, .0, .35)), f2 = eio(seg(u, .3, .45)), f3 = eio(seg(u, .45, .6)), f4 = eio(seg(u, .55, .95));
    var lvl = (20 * f1 + 2 * f2 + 2.5 * f3 + 25 * f4) / 60;
    var col = f4 > 0 ? mix(mix(C.eth, C.gly, .25), C.wat, f4 * .6) : mix(C.eth, OIL, f2 * .15);
    beaker({ x: 1010, y: 590, w: 300, h: 380, level: lvl, color: col, haze: f4 * .3, alpha: a });
    ctx.save(); ctx.globalAlpha = a; text('Herbal mosquito', 70, 270, 82, C.ink, 'left', 800); text('repellent', 70, 358, 82, C.acc, 'left', 800); ctx.restore();
    ctx.save(); ctx.globalAlpha = b; text('How to prepare 50 mL, step by step', 74, 430, 38, C.ink, 'left', 500, '"Instrument Sans","Segoe UI",sans-serif');
    text('Ethanol  +  oil  +  glycerin  +  distilled water', 74, 484, 26, C.dim, 'left', 500, '"Instrument Sans","Segoe UI",sans-serif'); ctx.restore();
    // colour dots legend
    var cols = [C.eth, OIL, C.gly, C.wat]; cols.forEach(function (c, i) { ctx.globalAlpha = b; ctx.beginPath(); ctx.arc(84 + i * 40, 536, 12, 0, 6.283); ctx.fillStyle = c; ctx.fill(); }); ctx.globalAlpha = 1;
  }

  function sWhy(u, t) {
    header(0, 'Why ethanol?', u);
    var pA = seg(u, 0, .36), pB = seg(u, .38, .66), pC = seg(u, .68, 1);
    var jx = 470, jy = 600, jw = 330, jh = 400, N = 54, top = jy - jh + 20, layerMax = 66;
    var merged = 0, drops = [];
    for (var i = 0; i < N; i++) {
      var r = 7 + rnd(i + 1) * 11, x0 = jx - jw / 2 + 36 + rnd(i + 2) * (jw - 72), y0 = jy - 50 - rnd(i + 3) * (jh - 160), sp = 80 + r * 14;
      var yy = Math.max(top, y0 - sp * pA * 2.1);
      drops.push({ x: x0 + Math.sin(t * 2 + i) * 3, y: yy, r: r, m: yy <= top + 2 });
      if (yy <= top + 2) merged++;
    }
    var layerH = layerMax * merged / N;
    var oilToEth = eio(pB), toHaze = eio(pC);
    var liqColor = mix(mix(C.wat, C.eth, oilToEth), '#cfe9f2', toHaze);
    beaker({ x: jx, y: jy, w: jw, h: jh, level: .94, color: liqColor, haze: toHaze * .38, ticks: false, inside: function (ly, l, r, y) {
      // plain oil layer + droplets (fades out in phase B)
      var a = 1 - oilToEth;
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = OIL; ctx.fillRect(l, ly, r - l, layerH + 2);
        drops.forEach(function (d) { if (!d.m) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fillStyle = OIL; ctx.fill(); ctx.beginPath(); ctx.arc(d.x - d.r * .3, d.y - d.r * .3, d.r * .28, 0, 6.283); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); } });
        ctx.restore();
      }
      // phase B: oil specks dissolving in ethanol
      if (pB > 0 && pB < 1) {
        for (var k = 0; k < 26; k++) { var rr0 = (9 + rnd(k + 40) * 8) * (1 - pB); ctx.beginPath(); ctx.arc(l + 30 + rnd(k + 41) * (r - l - 60), ly + 40 + rnd(k + 42) * (y - ly - 90), rr0, 0, 6.283); ctx.fillStyle = 'rgba(227,181,63,' + (1 - pB) + ')'; ctx.fill(); }
      }
      // phase C: fine dispersed haze droplets
      if (pC > 0) {
        for (var q = 0; q < 140; q++) { var px = l + 16 + rnd(q + 60) * (r - l - 32) + Math.sin(t * 1.5 + q) * 3, py = ly + 18 + rnd(q + 61) * (y - ly - 40) + Math.cos(t * 1.7 + q) * 3; ctx.beginPath(); ctx.arc(px, py, 1.8 + rnd(q + 62) * 1.6, 0, 6.283); ctx.fillStyle = 'rgba(227,181,63,' + (.55 * toHaze) + ')'; ctx.fill(); }
      }
    } });
    // labels
    var lab = pC > 0 ? 'Oil dispersed as a fine haze' : pB > 0 ? 'Oil dissolved in ethanol' : (merged > N * .5 ? 'Oil layer on top of water' : 'Oil droplets rise through water');
    tag(lab, jx + jw / 2 + 30, 250, pC > 0 ? C.ok : pB > 0 ? C.eth : OIL, 'left');
    // ethanol molecule panel
    var ma = fadeIn(u, .36, .5) * (1 - 0 * pC);
    if (ma > 0) {
      ctx.save(); ctx.globalAlpha = ma; var mx = 1000, my = 470;
      rr(mx - 180, my - 150, 360, 260, 22); ctx.fillStyle = 'rgba(8,24,20,.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = 8;
      ctx.strokeStyle = OIL; ctx.beginPath(); ctx.moveTo(mx - 110, my + 10); ctx.lineTo(mx - 55, my - 22); ctx.lineTo(mx, my + 10); ctx.stroke();
      ctx.strokeStyle = C.eth; ctx.beginPath(); ctx.moveTo(mx, my + 10); ctx.lineTo(mx + 54, my - 22); ctx.stroke();
      text('OH', mx + 66, my - 8, 44, C.eth, 'left', 700, '"JetBrains Mono",monospace');
      text('Ethanol', mx, my - 100, 30, C.ink, 'center', 700);
      text('non-polar', mx - 78, my + 52, 19, OIL, 'center', 700, '"Instrument Sans",sans-serif'); text('ethyl end', mx - 78, my + 74, 19, OIL, 'center', 600, '"Instrument Sans",sans-serif'); text('mixes with oil', mx - 78, my + 100, 17, C.dim, 'center', 500, '"Instrument Sans",sans-serif');
      text('polar', mx + 86, my + 52, 19, C.eth, 'center', 700, '"Instrument Sans",sans-serif'); text('\u2013OH end', mx + 86, my + 74, 19, C.eth, 'center', 600, '"Instrument Sans",sans-serif'); text('mixes with water', mx + 86, my + 100, 17, C.dim, 'center', 500, '"Instrument Sans",sans-serif');
      ctx.restore();
    }
  }

  var ING = [
    { n: 'Ethanol', q: '20 mL', r: 'Solvent', c: C.eth, v: 20 },
    { n: 'Oil', q: '2 mL', r: 'Oil phase', c: OIL, v: 2 },
    { n: 'Glycerin', q: '2–3 mL', r: 'Fixative', c: C.gly, v: 2.5 },
    { n: 'Distilled water', q: '25 mL', r: 'Diluent', c: C.wat, v: 25 }
  ];
  function sIngredients(u, t) {
    header(0, 'Four ingredients, about 50 mL', u);
    ING.forEach(function (g, i) {
      var a = fadeIn(u, .08 + i * .13, .2 + i * .13), cx = 200 + i * 290, y = 330 - (1 - a) * -30;
      ctx.save(); ctx.globalAlpha = a; rr(cx - 120, 150 + (1 - a) * 30, 240, 330, 24); ctx.fillStyle = 'rgba(8,24,20,.55)'; ctx.fill(); ctx.strokeStyle = g.c; ctx.lineWidth = 3; ctx.stroke();
      // bottle icon
      var by = 330 + (1 - a) * 30;
      ctx.translate(0, 0); rr(cx - 36, by - 100, 72, 116, 14); ctx.fillStyle = g.c; ctx.globalAlpha = a * .85; ctx.fill(); ctx.globalAlpha = a;
      glassStroke(4); rr(cx - 36, by - 100, 72, 116, 14); ctx.stroke(); rr(cx - 16, by - 126, 32, 28, 4); ctx.fillStyle = 'rgba(220,235,230,.9)'; ctx.fill(); ctx.stroke();
      text(g.q, cx, by + 62, 46, C.ink, 'center', 800);
      text(g.n, cx, by + 100, 26, g.c, 'center', 700);
      text(g.r, cx, by + 130, 22, C.dim, 'center', 500, '"Instrument Sans",sans-serif');
      ctx.restore();
    });
    // proportion bar
    var bw = 1000, bx = 140, by2 = 560, tot = 49.5, k = eo(seg(u, .62, .92)), cur = bx;
    ctx.save(); rr(bx, by2, bw, 46, 23); ctx.clip();
    ING.forEach(function (g) { var wd = bw * g.v / tot * k; ctx.fillStyle = g.c; ctx.fillRect(cur, by2, wd, 46); cur += wd; });
    ctx.restore();
    if (k > .95) { text('Total: about 50 mL', 640, 548, 24, C.dim, 'center', 500, '"Instrument Sans",sans-serif'); }
    var na = fadeIn(u, .8, .95);
    if (na > 0) { ctx.save(); ctx.globalAlpha = na; tag('Our lab run: castor oil as the oil phase', 640, 134, OIL, 'center'); ctx.restore(); }
  }

  function sClean(u, t) {
    header(1, 'Wash and dry the apparatus', u);
    var items = ['Beaker', 'Measuring cylinder', 'Glass rod', 'Dropper', 'Funnel', 'Spray bottle'];
    items.forEach(function (n, i) {
      var a = fadeIn(u, .06 + i * .1, .2 + i * .1), cx = 170 + (i % 6) * 188, cy = 560, ck = fadeIn(u, .45 + i * .08, .55 + i * .08);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 30);
      if (i === 0) beaker({ x: cx, y: cy, w: 120, h: 150, level: 0, ticks: false });
      if (i === 1) cylinder({ px: cx + 22, py: cy - 190, w: 44, h: 190, level: 0 });
      if (i === 2) rod(cx - 28, cy, cx + 28, cy - 170);
      if (i === 3) dropper(cx, cy - 6, 0);
      if (i === 4) funnel(cx, cy - 150, .6, false);
      if (i === 5) bottle({ x: cx, y: cy, w: 90, h: 120, level: 0 });
      text(n, cx, cy + 56, 21, C.ink, 'center', 600, '"Instrument Sans",sans-serif');
      ctx.restore();
      // sparkle + tick
      if (ck > 0) { ctx.save(); ctx.globalAlpha = ck; ctx.strokeStyle = C.ok; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(cx - 20, 215); ctx.lineTo(cx - 5, 232); ctx.lineTo(cx + 22, 198); ctx.stroke();
        var sp = (Math.sin(t * 6 + i) + 1) / 2; ctx.fillStyle = C.acc; ctx.globalAlpha = ck * sp; star(cx + 40, 250, 12); star(cx - 44, 330, 9); ctx.restore(); }
    });
    var wa = fadeIn(u, .3, .5);
    if (wa > 0) { ctx.save(); ctx.globalAlpha = wa; text('Rinse, then dry completely', 640, 150, 34, C.ink, 'center', 700); text('Leftover water changes the ethanol strength', 640, 192, 24, C.dim, 'center', 500, '"Instrument Sans",sans-serif'); ctx.restore(); }
  }
  function star(x, y, r) { ctx.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rad = i % 2 ? r * .35 : r; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }

  function sEthanol(u, t) {
    header(2, 'Measure 20 mL ethanol', u);
    var fillP = eio(seg(u, .04, .32)), tilt = eio(seg(u, .5, .62)) * (1 - eio(seg(u, .9, 1)));
    var pourP = eio(seg(u, .56, .88));
    var cylLevel = (.4 * fillP) * (1 - pourP);
    var bx = 830, by = 600, bl = 20 / 60 * pourP;
    var px0 = 330 + 31, py0 = 600 - 300 + 8; // lip when upright
    var px = lerp(px0, 770, tilt), py = lerp(py0, 250, tilt);
    beaker({ x: bx, y: by, level: bl, color: C.eth });
    if (pourP > 0 && pourP < 1) stream(px - 6, py + 6, by - 6 - 322 * bl, C.eth, t);
    cylinder({ px: px, py: py, rot: tilt * .85, level: cylLevel, color: C.eth, h: 300 });
    // eye-level reading inset
    var ia = fadeIn(u, .3, .4) * (1 - fadeIn(u, .5, .56));
    if (ia > 0) {
      ctx.save(); ctx.globalAlpha = ia; var cx = 520, cy = 330, R = 100;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fillStyle = 'rgba(8,24,20,.9)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = C.acc; ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 4, 0, 6.283); ctx.clip();
      ctx.fillStyle = C.eth; ctx.beginPath(); ctx.moveTo(cx - R, cy + 8); ctx.quadraticCurveTo(cx, cy + 40, cx + R, cy + 8); ctx.lineTo(cx + R, cy + R); ctx.lineTo(cx - R, cy + R); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - R, cy + 38); ctx.lineTo(cx + R, cy + 38); ctx.stroke();
      ctx.restore(); text('20', cx + R + 18, cy + 46, 28, '#fff', 'left', 700, '"JetBrains Mono",monospace');
      text('Read the bottom of the curve,', cx, cy - R - 38, 24, C.ink, 'center', 600, '"Instrument Sans",sans-serif'); text('with your eye level to the mark', cx, cy - R - 10, 24, C.ink, 'center', 600, '"Instrument Sans",sans-serif');
      ctx.restore();
    }
    var vol = Math.round(fillP * 20 * (1 - pourP));
    if (tilt < .05 && pourP < .05) mono(Math.round(fillP * 20) + ' mL', 330 - 31 - 120, 380, 30, C.eth, 'right');
    if (pourP > .02) mono(Math.round(20 * pourP) + ' mL in beaker', bx, 175, 30, C.eth, 'center');
  }

  function sOil(u, t) {
    header(3, 'Add 2 mL oil with a dropper', u);
    var da = fadeIn(u, 0, .12), bx = 700, by = 610;
    var drops = 6, win = seg(u, .16, .84), n = win * drops, absorbed = Math.floor(n);
    var lvl = (20 + 2 * clamp(n / drops, 0, 1)) / 60;
    var tipY = 300;
    beaker({ x: bx, y: by, h: 260, level: lvl, color: C.eth, inside: function (ly, l, r, y) {
      for (var i = 0; i < drops; i++) {
        var age = n - i; if (age < 1 || age > 3.2) continue;
        var k = (age - 1) / 2.2, sx = bx + (rnd(i + 5) - .5) * 40;
        var rad = lerp(14, 2, eo(k)), yy = ly + 8 + k * 80, al = 1 - eio(k);
        ctx.beginPath(); ctx.arc(sx + Math.sin(k * 6 + i) * 8, yy, rad, 0, 6.283); ctx.fillStyle = 'rgba(227,181,63,' + (al * .95) + ')'; ctx.fill();
        // schlieren
        ctx.strokeStyle = 'rgba(227,181,63,' + (al * .35) + ')'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx - 16, yy - 18); ctx.bezierCurveTo(sx - 30, yy + 8, sx + 30, yy + 20, sx + 10, yy + 50); ctx.stroke();
      }
    } });
    var sq = Math.abs(Math.sin(n * Math.PI * 1)) * (win > 0 && win < 1 ? 1 : 0);
    ctx.save(); ctx.globalAlpha = da; ctx.translate(0, (1 - da) * -60); dropper(bx, tipY, sq); ctx.restore();
    // falling drop
    if (win > 0 && win < 1) {
      var frac = n - Math.floor(n), surf = by - 6 - 252 * lvl;
      if (frac < .55) { var k2 = frac / .55; drop(bx + (rnd(Math.floor(n) + 5) - .5) * 40, lerp(tipY + 14, surf - 6, k2 * k2), 9, OIL, 1); }
      else { drop(bx, tipY + 6, 8 * (1 - 0), OIL, (frac - .55) / .45); }
    }
    tag('Oil: 2 mL', 980, 280, OIL, 'left');
    mono((20 + 2 * clamp(n / drops, 0, 1)).toFixed(1) + ' mL', 980, 340, 36, C.ink, 'left');
    var na = fadeIn(u, .86, .96);
    if (na > 0) { ctx.save(); ctx.globalAlpha = na; tag('No oil layer forms: it dissolves in ethanol', 640, 656, C.ok, 'center'); ctx.restore(); }
  }

  function sStir(u, t) {
    header(4, 'Stir gently for 1–2 minutes', u);
    var bx = 640, by = 610, bh = 330, ang = t * 5.5;
    var tipX = bx + Math.cos(ang) * 55, tipY = by - 70 + Math.sin(ang) * 10;
    beaker({ x: bx, y: by, level: 22 / 60, color: mix(C.eth, OIL, .1), inside: function (ly, l, r, y) {
      ctx.strokeStyle = 'rgba(255,255,255,.42)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) { var a2 = ang - i * 1.2, rx = 90 - i * 22; ctx.beginPath(); ctx.ellipse(bx, ly + 36 + i * 28, rx, 10, 0, a2, a2 + 2.2); ctx.stroke(); }
    } });
    rod(bx + 120, by - bh - 80, tipX, tipY);
    // timer ring
    var tx = 1020, ty = 360, R = 104, p = seg(u, .06, .94);
    ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(tx, ty, R, 0, 6.283); ctx.stroke();
    ctx.strokeStyle = C.acc; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(tx, ty, R, -Math.PI / 2, -Math.PI / 2 + 6.283 * p); ctx.stroke();
    mono(fmt(90 * p), tx, ty + 14, 44, C.ink, 'center'); text('fast-forwarded', tx, ty + 56, 18, C.dim, 'center', 500, '"Instrument Sans",sans-serif');
    text('Target: 1 to 2 min', tx, ty + R + 54, 24, C.ink, 'center', 600);
    tag('Gently: no splashing, no bubbles', 60, 330, C.acc, 'left');
  }

  function sGlycerin(u, t) {
    header(5, 'Add glycerin and mix gently', u);
    var bx = 700, by = 610, tipY = 300, p = seg(u, .14, .72), lvl = (22 + 2.5 * p) / 60, surf = by - 6 - 252 * lvl;
    var da = fadeIn(u, 0, .12);
    beaker({ x: bx, y: by, h: 260, level: lvl, color: mix(C.eth, OIL, .1), inside: function (ly, l, r, y) {
      if (p > 0) {
        var k = Math.min(1, p * 1.6), len = (y - ly) * .55 * k;
        ctx.save(); ctx.globalAlpha = .75 * (1 - seg(u, .75, 1));
        ctx.strokeStyle = C.gly; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, ly); ctx.bezierCurveTo(bx + 24, ly + len * .3, bx - 28, ly + len * .6, bx + 8, ly + len); ctx.stroke();
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(234,179,90,.7)';
        for (var i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(bx + 14 + i * 16, ly + len * .5); ctx.bezierCurveTo(bx + 50 + i * 20, ly + len * .6, bx + 8 + i * 12, ly + len * .9, bx + 50 + i * 18, ly + len * 1.1); ctx.stroke(); }
        ctx.restore();
      }
    } });
    ctx.save(); ctx.globalAlpha = da; dropper(bx, tipY, 0); ctx.restore();
    if (p > 0 && p < 1) { var wob = Math.sin(t * 2) * 3; ctx.save(); ctx.strokeStyle = C.gly; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, tipY + 4); ctx.bezierCurveTo(bx + wob, tipY + 70, bx - wob, surf - 60, bx, surf); ctx.stroke(); ctx.restore(); }
    // gentle rod
    var ang = t * 3.5, tipX = bx + Math.cos(ang) * 50, tipY2 = by - 70 + Math.sin(ang) * 8;
    if (u > .75) { ctx.save(); ctx.globalAlpha = fadeIn(u, .75, .85); rod(bx + 110, by - 340, tipX, tipY2); ctx.restore(); }
    tag('Glycerin: 2–3 mL', 980, 280, C.gly, 'left');
    text('Thick and slow: it sinks', 980, 346, 24, C.ink, 'left', 600, '"Instrument Sans",sans-serif'); text('before it mixes in', 980, 378, 24, C.ink, 'left', 600, '"Instrument Sans",sans-serif');
  }

  function sWater(u, t) {
    header(6, 'Add 25 mL distilled water, slowly', u);
    var pour = eio(seg(u, .12, .66)), tilt = eio(seg(u, .06, .16)) * (1 - eio(seg(u, .66, .74)));
    var lvl = (24.5 + 25 * pour) / 60, bx = 700, by = 610, cloud = eio(seg(u, .2, .8));
    var ang = t * 5.5, tipX = bx + Math.cos(ang) * 55, tipY = by - 70 + Math.sin(ang) * 10;
    var px = lerp(330 + 31, 650, tilt), py = lerp(600 - 300 + 8, 235, tilt);
    var col = mix(mix(C.eth, C.gly, .12), C.wat, cloud * .6);
    var cylLevel = .5 * (1 - pour);
    beaker({ x: bx, y: by, level: lvl, color: col, haze: cloud * .42 + seg(u, .66, 1) * .06, inside: function (ly, l, r, y) {
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      for (var i = 0; i < 3; i++) { var a2 = ang - i * 1.2, rx = 90 - i * 20; ctx.beginPath(); ctx.ellipse(bx, ly + 34 + i * 30, rx, 10, 0, a2, a2 + 2.2); ctx.stroke(); }
      for (var q = 0; q < 110; q++) { var xx = l + 20 + rnd(q + 90) * (r - l - 40) + Math.sin(t * 2 + q) * 4, yy = ly + 14 + rnd(q + 91) * (y - ly - 30) + Math.cos(t * 2.2 + q) * 4; ctx.beginPath(); ctx.arc(xx, yy, 1.6 + rnd(q + 92) * 1.6, 0, 6.283); ctx.fillStyle = 'rgba(227,181,63,' + (.6 * cloud) + ')'; ctx.fill(); }
    } });
    rod(bx + 120, by - 410, tipX, tipY);
    if (pour > 0 && pour < 1) stream(px - 6, py + 6, by - 6 - 322 * lvl, C.wat, t);
    cylinder({ px: px, py: py, rot: tilt * .85, level: cylLevel, color: C.wat, h: 300 });
    mono((24.5 + 25 * pour).toFixed(1) + ' mL', 1050, 340, 40, C.ink, 'center');
    text('about 50 mL when done', 1050, 376, 20, C.dim, 'center', 500, '"Instrument Sans",sans-serif');
    var lab = u < .55 ? 'Pour in a thin stream' : u < .82 ? 'Turns milky: tiny oil droplets' : 'Stir until reasonably uniform';
    tag(lab, 1050, 250, u < .55 ? C.wat : u < .82 ? C.acc : C.ok, 'center');
    if (u > .82) { mono(fmt(60 * seg(u, .82, 1)), 1050, 450, 34, C.acc, 'center'); }
  }

  function sFilter(u, t) {
    header(8, 'Filter if turbid or particles remain', u);
    var fx = 760, fy = 250, rx = 760, ry = 610;
    var p = eio(seg(u, .12, .8)), drip = seg(u, .28, .85);
    // source beaker
    beaker({ x: 330, y: 600, w: 230, h: 300, level: (1 - p) * 49.5 / 60, color: mix(mix(C.eth, C.gly, .12), C.wat, .6), haze: .45, ticks: false });
    // pour hint
    var ar = fadeIn(u, .1, .2); ctx.save(); ctx.globalAlpha = ar; ctx.strokeStyle = C.acc; ctx.lineWidth = 6; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 60; ctx.beginPath(); ctx.moveTo(460, 330); ctx.bezierCurveTo(520, 250, 560, 250, 620, 300); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    // receiver beaker
    beaker({ x: rx, y: ry - 8, w: 230, h: 220, level: p * 49.5 / 60 * .75, color: mix(mix(C.eth, C.gly, .12), C.wat, .6), haze: .42, ticks: false });
    funnel(fx, fy, 1.05, true);
    // specks on the paper
    ctx.fillStyle = '#4b4126'; for (var i = 0; i < 9; i++) { var k = fadeIn(u, .22 + i * .03, .3 + i * .03); ctx.globalAlpha = k; ctx.beginPath(); ctx.arc(fx - 52 + rnd(i + 70) * 104, fy + 52 + rnd(i + 71) * 26 + (i % 3) * 8, 3 + rnd(i + 72) * 2.4, 0, 6.283); ctx.fill(); } ctx.globalAlpha = 1;
    // drips
    if (drip > 0 && drip < 1) for (var d = 0; d < 3; d++) { var q = ((t * 1.6 + d / 3) % 1); drop(fx, fy + 190 + q * 170, 6, mix(C.eth, C.wat, .6), 1 - q * .2); }
    tag('Specks stay on the paper', 520, 160, C.acc, 'left'); tag('The haze passes through', 520, 214, C.wat, 'left');
  }

  function sTransfer(u, t) {
    header(9, 'Transfer to the spray bottle', u);
    var p = eio(seg(u, .14, .84));
    var bx = 760, by = 610;
    var col = mix(mix(C.eth, C.gly, .12), C.wat, .6);
    beaker({ x: 340, y: 600, w: 230, h: 300, level: (1 - p) * 49.5 / 60, color: col, haze: .42, ticks: false });
    funnel(bx, 235, 1, false);
    bottle({ x: bx, y: by, w: 170, h: 260, level: p * .82, color: col, haze: .42 });
    var ar = fadeIn(u, .08, .2); ctx.save(); ctx.globalAlpha = ar; ctx.strokeStyle = C.acc; ctx.lineWidth = 6; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 60; ctx.beginPath(); ctx.moveTo(460, 330); ctx.bezierCurveTo(520, 190, 620, 160, 660, 220); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    if (p > 0 && p < 1) stream(bx, 270, 610 - 260 * p * .82 - 6, col, t, 8);
    tag('Funnel prevents spills', 980, 250, C.acc, 'left'); tag('Leave a little air at the top', 980, 310, C.wat, 'left');
  }

  function sLabel(u, t) {
    header(10, 'Label the bottle', u);
    var s = eio(seg(u, 0, .25)), type = seg(u, .25, .85);
    var col = mix(mix(C.eth, C.gly, .12), C.wat, .6);
    var lines = [['Herbal repellent', 700, 15], ['Prep: ' + today(), 500, 12.5], ['Ethanol, oil, glycerin,', 500, 12], ['distilled water', 500, 12], ['Batch no.: ______', 500, 12.5], ['Group no.: ______', 500, 12.5]];
    bottle({ x: 640, y: 612, w: 170, h: 260, scale: lerp(1, 1.25, s), level: .82, color: col, haze: .42, label: function (l, top, w, h) {
      var a = eio(seg(u, .08, .3)); ctx.save(); ctx.globalAlpha = a; rr(l + 10, top + 62, w - 20, 150, 8); ctx.fillStyle = '#f6f8f5'; ctx.fill(); ctx.strokeStyle = '#c4d0c9'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      var total = lines.reduce(function (n, x) { return n + x[0].length; }, 0), shown = Math.floor(total * type), yy = top + 88;
      ctx.save(); ctx.beginPath(); rr(l + 10, top + 62, w - 20, 150, 8); ctx.clip();
      lines.forEach(function (ln, i) { var take = Math.max(0, Math.min(ln[0].length, shown)); shown -= ln[0].length; if (take <= 0) return; ctx.font = ln[1] + ' ' + ln[2] + 'px "Instrument Sans",sans-serif'; ctx.fillStyle = '#17302a'; ctx.textAlign = 'left'; ctx.fillText(ln[0].slice(0, take), l + 17, yy + i * 22); });
      ctx.restore();
    } });
    var na = fadeIn(u, .86, .96);
    if (na > 0) { ctx.save(); ctx.globalAlpha = na; tag('Shake well before each use', 640, 120, C.acc, 'center'); ctx.restore(); }
  }

  function sSafety(u, t) {
    header(0, 'Before you use it', u);
    var cards = [
      { n: 'Protect your eyes', s: 'Goggles in the lab; keep spray away from eyes', c: C.eth, draw: function (x, y) { ctx.lineWidth = 7; ctx.strokeStyle = C.eth; ctx.beginPath(); ctx.arc(x - 34, y, 26, 0, 6.283); ctx.arc(x + 34, y, 26, 0, 6.283); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x - 60, y); ctx.lineTo(x - 82, y - 6); ctx.moveTo(x + 60, y); ctx.lineTo(x + 82, y - 6); ctx.stroke(); } },
      { n: 'No flames', s: 'Ethanol is flammable', c: C.red, draw: function (x, y) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.moveTo(x, y - 52); ctx.bezierCurveTo(x + 44, y - 8, x + 40, y + 40, x, y + 44); ctx.bezierCurveTo(x - 40, y + 40, x - 44, y - 6, x - 10, y - 24); ctx.bezierCurveTo(x - 8, y - 10, x - 2, y - 8, x, y - 52); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(x - 50, y + 50); ctx.lineTo(x + 50, y - 56); ctx.stroke(); } },
      { n: 'Patch test first', s: 'Small patch of skin, wait a day', c: C.ok, draw: function (x, y) { rr(x - 60, y - 24, 120, 48, 24); ctx.fillStyle = '#d9a07a'; ctx.fill(); rr(x - 12, y - 14, 28, 28, 4); ctx.fillStyle = '#f6f8f5'; ctx.fill(); ctx.strokeStyle = C.ok; ctx.lineWidth = 3; ctx.stroke(); } },
      { n: 'Shake well', s: 'The oil slowly separates', c: C.acc, draw: function (x, y) { rr(x - 22, y - 38, 44, 76, 10); ctx.strokeStyle = C.acc; ctx.lineWidth = 6; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 64, y - 6); ctx.lineTo(x - 40, y - 20); ctx.moveTo(x - 64, y + 20); ctx.lineTo(x - 40, y + 6); ctx.moveTo(x + 64, y - 6); ctx.lineTo(x + 40, y - 20); ctx.moveTo(x + 64, y + 20); ctx.lineTo(x + 40, y + 6); ctx.stroke(); } }
    ];
    cards.forEach(function (c, i) {
      var a = fadeIn(u, .1 + i * .15, .28 + i * .15), cx = 200 + i * 290;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 30);
      rr(cx - 125, 165, 250, 385, 24); ctx.fillStyle = 'rgba(8,24,20,.6)'; ctx.fill(); ctx.strokeStyle = c.c; ctx.lineWidth = 3; ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; c.draw(cx, 285);
      text(c.n, cx, 410, 28, C.ink, 'center', 700);
      wrap(c.s, 210, 21).forEach(function (ln, k) { text(ln, cx, 448 + k * 26, 21, C.dim, 'center', 500, '"Instrument Sans",sans-serif'); });
      ctx.restore();
    });
  }

  function sEnd(u, t) {
    var a = fadeIn(u, .05, .4), b = fadeIn(u, .3, .7);
    var lvl = 49.5 / 60;
    beaker({ x: 1010, y: 590, w: 280, h: 360, level: lvl, color: mix(mix(C.eth, C.gly, .12), C.wat, .6), haze: .42, alpha: a, ticks: false });
    ctx.save(); ctx.globalAlpha = a; text('Herbal mosquito', 70, 270, 84, C.ink, 'left', 800); text('repellent', 70, 366, 84, C.acc, 'left', 800); ctx.restore();
    ctx.save(); ctx.globalAlpha = b;
    text('Chemical Prototyping  –  2026–27', 74, 440, 34, C.ink, 'left', 500, '"Instrument Sans",sans-serif');
    text('Ethanol 20 mL  +  oil 2 mL  +  glycerin 2–3 mL  +  water 25 mL', 74, 490, 24, C.dim, 'left', 500, '"Instrument Sans",sans-serif');
    ctx.restore();
  }

  /* ---------- timeline ---------- */
  var SCENES = [
    { id: 'Intro', d: 8, f: sTitle, caps: [[.08, 1, 'Making a herbal mosquito repellent spray, step by step. About 50 millilitres, from four ingredients.']] },
    { id: 'Why ethanol', d: 14, f: sWhy, caps: [[0, .37, 'Oil and water do not mix. Oil is non-polar and water is polar, so oil droplets rise and form their own layer.'], [.37, .67, 'Ethanol has a polar OH end and a non-polar ethyl end, so it dissolves the oil.'], [.67, 1, 'Add water to that solution and the oil stays dispersed as a fine haze. Ethanol is the go-between.']] },
    { id: 'Ingredients', d: 12, f: sIngredients, caps: [[0, .3, 'Four ingredients make about fifty millilitres.'], [.3, .78, 'Twenty millilitres of ethanol as solvent, two of oil, two to three of glycerin as fixative, and twenty-five of distilled water.'], [.78, 1, 'In our lab run, castor oil was the oil. A real repellent uses citronella or lemongrass oil.']] },
    { id: '1  Clean', d: 8, f: sClean, caps: [[.05, 1, 'Step one. Wash and dry the beaker, measuring cylinder, glass rod, dropper, funnel and spray bottle.']] },
    { id: '2  Ethanol', d: 12, f: sEthanol, caps: [[.02, .5, 'Step two. Measure twenty millilitres of ethanol. Read the bottom of the curve at eye level.'], [.5, 1, 'Pour it into the beaker.']] },
    { id: '3  Oil', d: 12, f: sOil, caps: [[.05, .55, 'Step three. Add two millilitres of oil with the dropper, one drop at a time.'], [.55, 1, 'It dissolves into the ethanol, so no oil layer forms. Castor oil is one of the few fatty oils that does this.']] },
    { id: '4  Stir', d: 11, f: sStir, caps: [[.03, 1, 'Step four. Stir gently with the glass rod for one to two minutes, without splashing or whipping in bubbles.']] },
    { id: '5  Glycerin', d: 8, f: sGlycerin, caps: [[.03, 1, 'Step five. Add two to three millilitres of glycerin. It is thick, so it sinks before it mixes. Then mix gently.']] },
    { id: '6  Water', d: 14, f: sWater, caps: [[.03, .55, 'Step six. Add twenty-five millilitres of distilled water slowly, while stirring.'], [.55, .82, 'The liquid turns milky as the oil breaks into tiny droplets.'], [.82, 1, 'Step seven. Keep stirring until the mixture looks reasonably uniform.']] },
    { id: '8  Filter', d: 9, f: sFilter, caps: [[.03, .5, 'Step eight. If the mixture is turbid or has particles, filter it through filter paper in a funnel.'], [.5, 1, 'The specks stay on the paper. The milky haze is tiny oil droplets, and passes through.']] },
    { id: '9  Transfer', d: 10, f: sTransfer, caps: [[.03, 1, 'Step nine. Use the funnel to move the repellent into a clean spray bottle, leaving a little air at the top.']] },
    { id: '10  Label', d: 10, f: sLabel, caps: [[.03, .8, 'Step ten. Label the bottle with the date of preparation, ingredients, batch number and group number.'], [.8, 1, 'Shake well before each use.']] },
    { id: 'Safety', d: 10, f: sSafety, caps: [[.05, 1, 'Before you use it: patch-test on a small area, shake well, and keep it away from flames, eyes and children.']] },
    { id: 'End', d: 7, f: sEnd, caps: [[.1, 1, 'That is the full procedure: ethanol, oil, glycerin and water, mixed, filtered and labelled.']] }
  ];
  var starts = [], TOTAL = 0;
  SCENES.forEach(function (s) { starts.push(TOTAL); TOTAL += s.d; });

  function caption(s, a) {
    if (a <= 0) return;
    var lines = wrap(s, 1020, 31), h = lines.length * 42 + 30, y = H - 44 - h;
    ctx.save(); ctx.globalAlpha = a; rr(W / 2 - 540, y, 1080, h, 22); ctx.fillStyle = 'rgba(5,16,13,.82)'; ctx.fill();
    lines.forEach(function (ln, i) { text(ln, W / 2, y + 44 + i * 42, 31, C.ink, 'center', 500, '"Instrument Sans","Segoe UI",system-ui,sans-serif'); });
    ctx.restore();
  }
  function locate(t) {
    var i = SCENES.length - 1; while (i > 0 && t < starts[i]) i--;
    return { i: i, u: clamp((t - starts[i]) / SCENES[i].d, 0, 1) };
  }
  var capIdx = -1, capKey = '';
  function render(t) {
    t = clamp(t, 0, TOTAL - 0.001);
    var L = locate(t), sc = SCENES[L.i];
    ctx.clearRect(0, 0, W, H);
    backdrop(t);
    ctx.save(); ctx.translate(640, 0); ctx.scale(.86, .86); ctx.translate(-640, 0);
    sc.f(L.u, t);
    ctx.restore();
    var cur = null;
    sc.caps.forEach(function (c, k) { if (L.u >= c[0] && L.u < c[1]) cur = { k: k, t: c[2], a: Math.min(seg(L.u, c[0], c[0] + .03), 1 - seg(L.u, c[1] - .02, c[1]), 1) }; });
    if (cur) caption(cur.t, cur.a);
    // progress hairline
    ctx.fillStyle = C.acc; ctx.fillRect(0, H - 4, W * t / TOTAL, 4);
    return cur ? L.i + ':' + cur.k : '';
  }

  /* ---------- player ---------- */
  var player = document.getElementById('player'), big = document.getElementById('exBig'), playBtn = document.getElementById('exPlay'), icon = document.getElementById('exPlayIcon');
  var timeEl = document.getElementById('exTime'), scrub = document.getElementById('exScrub'), fill = document.getElementById('exFill'), chap = document.getElementById('exChapters');
  var speedEl = document.getElementById('exSpeed'), voiceBtn = document.getElementById('exVoice'), recBtn = document.getElementById('exRec'), fullBtn = document.getElementById('exFull'), note = document.getElementById('exNote');
  var T = 0, playing = false, speed = 1, last = 0, started = false, voice = false, rec = null, recChunks = [], recording = false, visible = true;

  function ensureChapters() {
    chap.innerHTML = '';
    starts.forEach(function (s, i) { if (!i) return; var m = document.createElement('i'); m.style.left = (s / TOTAL * 100) + '%'; chap.appendChild(m); });
    var list = document.createElement('div'); list.className = 'player-chaps'; list.setAttribute('aria-label', 'Chapters');
    SCENES.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-small'; b.textContent = s.id.replace(/\s{2,}/g, '. ');
      b.addEventListener('click', function () { seek(starts[i] + .05); if (!playing) toggle(true); });
      list.appendChild(b);
    });
    player.appendChild(list);
  }
  function speak(s) {
    if (!voice || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(s); u.rate = Math.min(1.4, speed * .98); u.lang = 'en-GB'; window.speechSynthesis.speak(u);
  }
  function syncUI() {
    timeEl.textContent = fmt(T) + ' / ' + fmt(TOTAL); fill.style.width = (T / TOTAL * 100) + '%'; scrub.setAttribute('aria-valuenow', Math.floor(T));
  }
  function setIcon() { icon.setAttribute('d', playing ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M8 5v14l11-7z'); player.classList.toggle('playing', playing); playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
  function toggle(force) {
    playing = force === undefined ? !playing : force; started = true;
    if (playing && T >= TOTAL - .05) { T = 0; capKey = ''; }
    if (!playing && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (playing) capKey = '';
    last = 0; setIcon();
  }
  function seek(t) { T = clamp(t, 0, TOTAL - .001); capKey = ''; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); started = true; frame(); }
  function frame() { var key = render(started ? T : 0.0001 + 5.2); syncUI(); if (key !== capKey) { capKey = key; if (playing && key) { var p = key.split(':'); speak(SCENES[+p[0]].caps[+p[1]][2]); } } }

  function loop(ts) {
    if (playing) {
      var dt = last ? Math.min(.1, (ts - last) / 1000) : 0; last = ts; T += dt * speed;
      if (T >= TOTAL) { T = TOTAL - .001; playing = false; setIcon(); if (recording) stopRec(); }
    }
    if (visible || recording) frame();
    requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: .05 }).observe(cv);

  big.addEventListener('click', function () { toggle(); });
  playBtn.addEventListener('click', function () { toggle(); });
  cv.addEventListener('click', function () { toggle(); });
  speedEl.addEventListener('change', function () { speed = parseFloat(speedEl.value); });
  voiceBtn.addEventListener('click', function () {
    if (!('speechSynthesis' in window)) { note.textContent = 'Your browser has no built-in speech voice, so captions only.'; voiceBtn.disabled = true; return; }
    voice = !voice; voiceBtn.setAttribute('aria-pressed', voice); if (!voice) window.speechSynthesis.cancel(); else capKey = '';
  });
  fullBtn.addEventListener('click', function () { var el = document.querySelector('.player-screen'); (el.requestFullscreen || el.webkitRequestFullscreen || function () {}).call(el); });

  var dragging = false;
  function scrubTo(ev) { var r = scrub.getBoundingClientRect(); seek(((ev.clientX - r.left) / r.width) * TOTAL); }
  scrub.addEventListener('pointerdown', function (e) { dragging = true; scrub.setPointerCapture(e.pointerId); scrubTo(e); });
  scrub.addEventListener('pointermove', function (e) { if (dragging) scrubTo(e); });
  scrub.addEventListener('pointerup', function () { dragging = false; });
  scrub.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { seek(T + 5); e.preventDefault(); } if (e.key === 'ArrowLeft') { seek(T - 5); e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Enter') { toggle(); e.preventDefault(); }
  });

  /* ---------- record to WebM (real time) ---------- */
  function stopRec() { recording = false; if (rec && rec.state !== 'inactive') rec.stop(); recBtn.textContent = 'Save as video'; recBtn.disabled = false; }
  recBtn.addEventListener('click', function () {
    if (!cv.captureStream || typeof MediaRecorder === 'undefined') { note.textContent = 'This browser cannot record the canvas. Use a screen recorder, or try Chrome or Edge.'; recBtn.disabled = true; return; }
    if (recording) { stopRec(); return; }
    var mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].filter(function (m) { return MediaRecorder.isTypeSupported(m); })[0];
    recChunks = []; rec = new MediaRecorder(cv.captureStream(30), { mimeType: mime, videoBitsPerSecond: 6000000 });
    rec.ondataavailable = function (e) { if (e.data && e.data.size) recChunks.push(e.data); };
    rec.onstop = function () {
      var blob = new Blob(recChunks, { type: 'video/webm' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'mosquito-repellent-explainer.webm'; document.body.appendChild(a); a.click(); a.remove();
      note.textContent = 'Saved. The WebM has no narration; captions are burned in.';
    };
    var prevSpeed = speed; speed = 1; speedEl.value = '1'; voice = false; voiceBtn.setAttribute('aria-pressed', 'false'); if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    T = 0; capKey = ''; recording = true; rec.start(500); toggle(true);
    recBtn.textContent = 'Stop recording'; note.textContent = 'Recording in real time (about 2.5 minutes). Keep this tab visible.';
  });

  ensureChapters(); setIcon(); frame();
  requestAnimationFrame(loop);
  window.__explainer = { render: render, total: function () { return TOTAL; }, scenes: SCENES, starts: starts };
})();
