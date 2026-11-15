// Language: the root (English) follows the browser language once; a saved choice wins.
// A direct language URL stays where it is. Picking a language in the menu or footer remembers it.
(() => {
  const supported = ['en', 'zh-Hant', 'zh-Hans', 'ja', 'ko', 'th'];
  const KEY = 'boyfriend-cam-language', STAY = 'boyfriend-cam-stay';
  const current = window.SITE_LOCALE;
  const page = window.SITE_PAGE || '';     // '', 'privacy/' or 'support/'
  const root = window.SITE_ROOT || '';     // climbs back to the site root
  const urlFor = (lang) => (root + (lang === 'en' ? '' : lang + '/') + page) || './';
  let saved, stay;
  try { saved = localStorage.getItem(KEY); stay = sessionStorage.getItem(STAY); } catch (_) {}

  const guess = () => {
    const b = ((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
    if (/^zh-(tw|hk|mo|hant)/.test(b)) return 'zh-Hant';
    if (/^zh/.test(b)) return 'zh-Hans';
    if (/^ja/.test(b)) return 'ja';
    if (/^ko/.test(b)) return 'ko';
    if (/^th/.test(b)) return 'th';
    return 'en';
  };
  if (current === 'en' && !stay) {
    const preferred = supported.includes(saved) ? saved : guess();
    if (preferred !== 'en') { location.replace(urlFor(preferred) + location.hash); return; }
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-lang]');
    if (!a) return;
    const next = a.dataset.lang;
    try {
      localStorage.setItem(KEY, next);
      if (next === 'en') sessionStorage.setItem(STAY, '1');   // chose English on purpose: don't bounce back
    } catch (_) {}
  });

  // language menu: close on outside click or Escape
  const menu = document.querySelector('.lang-menu');
  if (menu) {
    document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }
})();

// Demo cards: the viewfinder animation plays only while the card is on screen (CSS pauses it otherwise).
(() => {
  const cards = document.querySelectorAll('.demo');
  if (!cards.length || !('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('play')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('play', e.isIntersecting)), { threshold: 0.35 });
  cards.forEach((c) => io.observe(c));
})();

// Composition playground: 13 compositions (23 with 1.1). Autoplays while on screen (unless reduced motion); a tap stops it.
(() => {
  const pg = document.querySelector('.pg');
  if (!pg) return;
  const items = JSON.parse(pg.querySelector('.pg-data').textContent);
  const vf = pg.querySelector('.pg-vf'), over = pg.querySelector('.pg-over'), dot = pg.querySelector('.pg-dot'), shape = pg.querySelector('.pg-shape');
  const imgA = pg.querySelector('.pg-a'), imgB = pg.querySelector('.pg-b');
  const tabs = [...pg.querySelectorAll('.pg-chip')], toggle = pg.querySelector('.pg-toggle');
  const $ = (s) => pg.querySelector(s);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, playing = !still, inView = false, timer = 0, goTimer = 0;
  const NS = 'http://www.w3.org/2000/svg';
  const pct = (v) => (v * 100).toFixed(2) + '%';
  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const line = (x1, y1, x2, y2, cls = 'v-line') => svgEl('path', { class: cls, d: `M${x1 * 90} ${y1 * 120}L${x2 * 90} ${y2 * 120}` });

  const rectEl = (r, cls) => svgEl('rect', { class: cls, x: r[0] * 90, y: r[1] * 120, width: (r[2] - r[0]) * 90, height: (r[3] - r[1]) * 120, rx: 2 });
  const tag = (e, st) => { e.classList.add(st === 'a' ? 'pg-sa' : 'pg-sb'); return e; };
  function drawGuides(it) {
    over.textContent = '';
    const g = it.guide;
    if (/thirds|space|half|small|detail|sky|table|fullbody/.test(g)) [1 / 3, 2 / 3].forEach((v) => { over.append(line(v, 0, v, 1), line(0, v, 1, v)); });
    if (g === 'center' || g === 'frame' || g === 'portrait') over.append(line(.5, 0, .5, 1));
    if (g === 'lines') it.a.lines.forEach(([p, q]) => over.append(line(p[0], p[1], q[0], q[1])));
    if (g === 'fullbody') over.append(line(.04, it.ring[1], .96, it.ring[1]));
    if (g === 'pet') over.append(line(0, it.ring[1], 1, it.ring[1]));
    if (g === 'fill') over.append(rectEl([.05, .05, .95, .95], 'v-line v-dash'));
    if (g === 'halves' || g === 'reflection') over.append(line(0, .5, 1, .5));
    if (g === 'pair') [1 / 3, 2 / 3].forEach((v) => over.append(line(v, 0, v, 1)));
    // shapes that move between "not yet" (a) and "lined up" (b): both drawn, crossfaded by .go
    ['a', 'b'].forEach((st) => {
      const s = it[st];
      if (g === 'diagonal' && s.lines) s.lines.forEach(([p, q]) => over.append(tag(line(p[0], p[1], q[0], q[1]), st)));
      if (s.ax != null && Math.abs(s.ax - .5) > .02) over.append(tag(line(s.ax, 0, s.ax, 1, 'v-line v-dash'), st));
      if (s.hy != null && Math.abs(s.hy - .5) > .02) over.append(tag(line(0, s.hy, 1, s.hy, 'v-line v-dash'), st));
      if (s.rects) {
        s.rects.forEach((r) => over.append(tag(rectEl(r, 'v-line v-dash'), st)));
        if (g === 'triangle' && s.rects.length === 3) {
          const c = s.rects.map((r) => `${(r[0] + r[2]) * 45} ${(r[1] + r[3]) * 60}`);
          over.append(tag(svgEl('path', { class: 'v-line v-dash', d: `M${c[0]}L${c[1]}L${c[2]}Z` }), st));
        }
      }
      if (s.fg) over.append(tag(rectEl(s.fg, 'v-line v-dash'), st));
    });
    if (it.ring) over.append(svgEl('circle', { class: 'v-ring', cx: it.ring[0] * 90, cy: it.ring[1] * 120, r: 7 }));
  }
  function setShape(it, s) {
    const st = shape.style;
    shape.className = 'pg-shape';
    if (it.guide === 'frame') { const [x, y, w, h] = it[s].rect; Object.assign(st, { display: 'block', left: pct(x), top: pct(y), width: pct(w), height: pct(h), transform: 'none' }); }
    else if (it.guide === 'table') { shape.classList.add('line', 'dash'); Object.assign(st, { display: 'block', left: '4%', width: '92%', top: pct(it[s].edgeY), height: '0', transform: 'none' }); }
    else if (it.guide === 'tilt') { shape.classList.add('line'); Object.assign(st, { display: 'block', left: '8%', width: '84%', top: '50%', height: '0', transform: `rotate(${-(it[s].roll || 0)}deg)` }); }
    else st.display = 'none';
  }
  function setDot(p) { dot.style.left = pct(p[0]); dot.style.top = pct(p[1]); }

  function show(i, animate) {
    cur = (i + items.length) % items.length;
    const it = items[cur];
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === cur); t.tabIndex = k === cur ? 0 : -1; });
    const bar = tabs[cur].parentElement, tb = tabs[cur];
    bar.scrollTo({ left: tb.offsetLeft - bar.offsetLeft - (bar.clientWidth - tb.offsetWidth) / 2, behavior: still ? 'auto' : 'smooth' });
    $('#pg-stage').setAttribute('aria-labelledby', tabs[cur].id);
    $('.pg-name').textContent = it.name; $('.pg-principle').textContent = it.principle;
    $('.pg-hint span').textContent = it.hint; $('.pg-why').textContent = it.why; $('.pg-p1').textContent = it.hint;
    $('.pg-when').textContent = it.when; $('.pg-hint').classList.toggle('after', !!it.after);
    $('.pg-p2').textContent = it.after ? it.name : pg.dataset.now;
    clearTimeout(goTimer);
    vf.classList.remove('anim', 'go');
    imgA.srcset = it.sa; imgB.srcset = it.sb;
    imgA.src = imgA.srcset.split(' ')[0]; imgB.src = imgB.srcset.split(' ')[0];
    drawGuides(it);
    const finish = () => { vf.classList.add('go'); setDot(it.b.dot); setShape(it, 'b'); };
    if (!animate || still) { finish(); return; }
    setDot(it.a.dot); setShape(it, 'a');
    void vf.offsetWidth;
    const start = () => { vf.classList.add('anim'); goTimer = setTimeout(finish, 650); };
    (imgB.complete ? Promise.resolve() : new Promise((r) => { imgB.onload = imgB.onerror = r; })).then(start);
    // warm the next pair
    const n = items[(cur + 1) % items.length]; [n.sa, n.sb].forEach((s) => { const im = new Image(); im.sizes = imgA.sizes; im.srcset = s; });
  }
  function schedule() {
    clearTimeout(timer);
    if (playing && inView) timer = setTimeout(() => { show(cur + 1, true); schedule(); }, 5200);
  }
  function setPlaying(v) {
    playing = v; toggle.setAttribute('aria-pressed', String(!v));
    toggle.textContent = v ? pg.dataset.pause : pg.dataset.play; schedule();
  }
  toggle.hidden = false; setPlaying(playing);
  tabs.forEach((t, k) => t.addEventListener('click', () => { setPlaying(false); show(k, true); }));
  pg.querySelector('.pg-chips').addEventListener('keydown', (e) => {
    const d = { ArrowRight: 1, ArrowLeft: -1, Home: -cur, End: items.length - 1 - cur }[e.key];
    if (d === undefined) return;
    e.preventDefault(); setPlaying(false); show(cur + d, true); tabs[cur].focus({ preventScroll: true });
  });
  toggle.addEventListener('click', () => { const v = !playing; setPlaying(v); if (v) show(cur + 1, true); });
  let first = true;
  new IntersectionObserver((es) => es.forEach((e) => {
    inView = e.isIntersecting;
    if (inView && first) { first = false; show(0, true); }
    schedule();
  }), { threshold: 0.3 }).observe(pg);
  show(0, false);
})();

// Recompose card: tapping a plan stops the loop and shows that crop.
(() => {
  document.querySelectorAll('.k-recompose').forEach((hint) => {
    const demo = hint.closest('.demo'), crop = demo.querySelector('.v-crop');
    if (!crop) return;
    const crops = JSON.parse(crop.dataset.crops), pills = demo.querySelectorAll('.v-cyc');
    const chips = hint.querySelectorAll('.plans .chip');
    chips.forEach((c) => c.addEventListener('click', () => {
      const j = +c.dataset.j, [x, y, w, h] = crops[j];
      demo.classList.add('manual');
      Object.assign(crop.style, { left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%' });
      chips.forEach((o, k) => { o.classList.toggle('on', k === j); o.setAttribute('aria-pressed', String(k === j)); });
      pills.forEach((p, k) => p.classList.toggle('sel', k === j));
    }));
  });
})();

// Intro video: muted loop plays only while on screen and only when motion is welcome; the button switches to the voiced cut.
(() => {
  const v = document.querySelector('.iv-v');
  if (!v) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let voiced = false;
  if (still) v.controls = true;
  else if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => es.forEach((e) => {
      if (voiced) return;
      if (e.isIntersecting) v.play().catch(() => { v.controls = true; }); else v.pause();
    }), { threshold: 0.4 }).observe(v);
  }
  document.querySelector('.iv-sound').addEventListener('click', (e) => {
    voiced = true;
    v.src = v.dataset.sound; v.muted = false; v.loop = false; v.controls = true; v.currentTime = 0;
    v.play().catch(() => {});
    e.currentTarget.hidden = true;
  });
})();

