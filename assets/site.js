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
