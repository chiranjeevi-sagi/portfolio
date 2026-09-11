/* ==========================================================================
   Chiranjeevi Sagi — portfolio interactions
   Vanilla JS, no dependencies. Everything degrades gracefully without it.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  let flow = null; // hero canvas animation, created at the bottom
  let menuOpen = false;

  $$('[data-kbd]').forEach((el) => { el.textContent = isMac ? '⌘ K' : 'Ctrl K'; });

  /* ---------- Theme ---------- */
  const themeBtn = $('.theme-toggle');
  const themeMeta = $('meta[name="theme-color"]');
  const storedTheme = () => { try { return localStorage.getItem('theme'); } catch { return null; } };

  function applyTheme(theme, persist) {
    root.dataset.theme = theme;
    if (persist) { try { localStorage.setItem('theme', theme); } catch { /* private mode */ } }
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#f7f8fa' : '#07090d');
    if (themeBtn) themeBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    if (flow) flow.setTheme(theme);
  }

  // Circular wipe from the toggle button using the View Transitions API, instant elsewhere.
  function toggleTheme() {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (!doc.startViewTransition || reducedMotion.matches) { applyTheme(next, true); return; }
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = doc.startViewTransition(() => applyTheme(next, true));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  }

  applyTheme(root.dataset.theme || 'dark', false);
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!storedTheme()) applyTheme(e.matches ? 'light' : 'dark', false);
  });

  /* ---------- Scroll-linked UI: progress bar, header, back-to-top, timeline ---------- */
  const header = $('.site-header');
  const progressBar = $('.progress span');
  const toTop = $('.to-top');
  const timeline = $('.timeline');
  const tlItems = $$('.tl-item');
  let lastY = scrollY;
  let ticking = false;

  function onScrollFrame() {
    ticking = false;
    const y = scrollY;
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;

    progressBar.style.transform = `scaleX(${p})`;
    header.classList.toggle('is-scrolled', y > 16);
    if (!menuOpen) {
      if (y > 480 && y > lastY + 6) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y <= 480) header.classList.remove('is-hidden');
    }
    lastY = y;

    toTop.classList.toggle('is-on', y > innerHeight * 0.8);
    toTop.style.setProperty('--p', p.toFixed(4));

    if (timeline) {
      const line = innerHeight * 0.62;
      const r = timeline.getBoundingClientRect();
      timeline.style.setProperty('--progress', clamp((line - r.top) / r.height, 0, 1).toFixed(4));
      tlItems.forEach((item) => {
        item.classList.toggle('is-passed', item.querySelector('.tl-dot').getBoundingClientRect().top + 12 < line);
      });
    }
  }
  const requestScrollFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScrollFrame); } };
  addEventListener('scroll', requestScrollFrame, { passive: true });
  addEventListener('resize', requestScrollFrame);
  onScrollFrame();

  /* ---------- Active section in the nav (sliding pill) ---------- */
  const navLinks = $$('[data-nav]');
  const indicator = $('.nav-indicator');
  let activeLink = null;

  function moveIndicator() {
    if (!indicator) return;
    if (!activeLink || !activeLink.offsetParent) { indicator.classList.remove('is-on'); return; }
    indicator.style.width = `${activeLink.offsetWidth}px`;
    indicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
    indicator.classList.add('is-on');
  }
  function setActive(id) {
    const link = navLinks.find((a) => a.getAttribute('href') === `#${id}`) || null;
    if (link === activeLink) return;
    if (activeLink) { activeLink.classList.remove('is-active'); activeLink.removeAttribute('aria-current'); }
    activeLink = link;
    if (link) { link.classList.add('is-active'); link.setAttribute('aria-current', 'true'); }
    moveIndicator();
  }
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => sectionObserver.observe(s));
  addEventListener('resize', moveIndicator);

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-toggle');
  const menu = $('#mobile-menu');
  let menuTimer;

  function setMenu(open) {
    if (!menu || open === menuOpen) return;
    menuOpen = open;
    clearTimeout(menuTimer);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('menu-open', open);
    if (open) {
      header.classList.remove('is-hidden');
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    } else {
      menu.classList.remove('is-open');
      menuTimer = setTimeout(() => { menu.hidden = true; }, 700);
    }
  }
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  if (menu) menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); menuBtn.focus(); }
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Scroll reveal + number counters ---------- */
  $$('[data-stagger]').forEach((group) => {
    Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
  });

  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  function countUp(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const format = (v) => (target >= 1000 ? compact.format(Math.round(v)) : Math.round(v)) + suffix;
    if (reducedMotion.matches) { el.textContent = format(target); return; }
    const start = performance.now();
    const duration = 1800;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      el.textContent = format(target * (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)));
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = format(0);
    requestAnimationFrame(tick);
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      $$('[data-count]', entry.target).forEach(countUp);
      revealObserver.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal, [data-stagger]').forEach((el) => revealObserver.observe(el));

  /* ---------- Typed role line ---------- */
  const typed = $('.typed');
  if (typed && !reducedMotion.matches) {
    let words = [];
    try { words = JSON.parse(typed.dataset.words); } catch { /* keep static text */ }
    let w = 0;
    let i = words.length ? words[0].length : 0;
    let deleting = true;
    const loop = () => {
      const word = words[w];
      if (deleting) {
        typed.textContent = word.slice(0, --i);
        if (i > 0) { setTimeout(loop, 30); return; }
        deleting = false;
        w = (w + 1) % words.length;
        setTimeout(loop, 380);
        return;
      }
      typed.textContent = word.slice(0, ++i);
      if (i < word.length) { setTimeout(loop, 55 + Math.random() * 55); return; }
      deleting = true;
      setTimeout(loop, 2300);
    };
    if (words.length > 1) setTimeout(loop, 3200);
  }

  /* ---------- Pointer effects: card spotlight, 3D tilt, magnetic buttons ---------- */
  if (finePointer.matches) {
    $$('.card').forEach((card) => {
      const tilt = card.hasAttribute('data-tilt');
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        if (tilt && !reducedMotion.matches) {
          const rx = (0.5 - y / r.height) * 6;
          const ry = (x / r.width - 0.5) * 6;
          card.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`;
        }
      });
      if (tilt) card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });

    if (!reducedMotion.matches) {
      $$('.magnetic').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          el.style.transform = `translate(${(dx * 0.2).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px)`;
        });
        el.addEventListener('pointerleave', () => { el.style.transform = ''; });
      });
    }
  }

  /* ---------- Project filters (animated by View Transitions where supported) ---------- */
  const filterBtns = $$('.filter-btn');
  const projects = $$('.project');

  function applyFilter(cat) {
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
    projects.forEach((p) => { p.hidden = cat !== 'all' && !p.dataset.cat.split(' ').includes(cat); });
  }
  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-pressed') === 'true') return;
    const cat = btn.dataset.filter;
    if (!doc.startViewTransition || reducedMotion.matches) { applyFilter(cat); return; }
    root.classList.add('vt-filter');
    const transition = doc.startViewTransition(() => applyFilter(cat));
    transition.finished.finally(() => root.classList.remove('vt-filter'));
  }));

  /* ---------- Local time in Hyderabad + footer year ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const tick = () => { const now = fmt.format(new Date()); clocks.forEach((c) => { c.textContent = now; }); };
    tick();
    setInterval(tick, 15000);
  }
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Command palette (Ctrl/⌘ K or "/") ---------- */
  const palette = $('#palette');
  const pInput = palette && $('input', palette);
  const pList = palette && $('.palette-list', palette);
  const icon = (id) => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const openUrl = (url) => window.open(url, '_blank', 'noopener');
  const goTo = (id) => {
    const el = doc.getElementById(id);
    if (el) el.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const commands = [
    { group: 'Navigate', label: 'Home', icon: 'hash', hint: 'Top', keys: 'start hero intro', run: () => goTo('home') },
    { group: 'Navigate', label: 'About', icon: 'hash', hint: '01', keys: 'bio summary stats', run: () => goTo('about') },
    { group: 'Navigate', label: 'Experience', icon: 'hash', hint: '02', keys: 'work jobs career timeline iit', run: () => goTo('experience') },
    { group: 'Navigate', label: 'Projects', icon: 'hash', hint: '03', keys: 'work portfolio github', run: () => goTo('projects') },
    { group: 'Navigate', label: 'Skills', icon: 'hash', hint: '04', keys: 'toolkit tech stack aws', run: () => goTo('skills') },
    { group: 'Navigate', label: 'Credentials', icon: 'hash', hint: '05', keys: 'education certification degree talk speaking', run: () => goTo('credentials') },
    { group: 'Navigate', label: 'Contact', icon: 'hash', hint: '06', keys: 'hire reach connect linkedin', run: () => goTo('contact') },
    { group: 'Projects', label: 'Weather Data Pipeline', icon: 'pipeline', hint: 'GitHub', keys: 'airflow docker postgres metabase etl', run: () => openUrl('https://github.com/chiranjeevi-sagi/weather-data-pipeline') },
    { group: 'Projects', label: 'Simultaneous Machine Translation', icon: 'spark', hint: 'GitHub', keys: 'simulmt nlp speech telugu asr', run: () => openUrl('https://github.com/chiranjeevi-sagi/Simultaneous-Machine-Translation') },
    { group: 'Projects', label: 'Resampling for Imbalanced Data', icon: 'chart', hint: 'GitHub', keys: 'dissertation oversampling spark databricks fraud', run: () => openUrl('https://github.com/chiranjeevi-sagi/oversampling-on-imbalanced-datasets') },
    { group: 'Projects', label: 'MOVEHOME Database', icon: 'db', hint: 'GitHub', keys: 'oracle sql mongodb plsql', run: () => openUrl('https://github.com/chiranjeevi-sagi/Movehome_db') },
    { group: 'Actions', label: 'Toggle light / dark theme', icon: 'palette', keys: 'theme mode dark light', run: toggleTheme },
    { group: 'Links', label: 'GitHub', icon: 'github', hint: 'chiranjeevi-sagi', keys: 'code repos', run: () => openUrl('https://github.com/chiranjeevi-sagi') },
    { group: 'Links', label: 'LinkedIn', icon: 'linkedin', hint: 'chiranjeevisagi', keys: 'profile network contact message', run: () => openUrl('https://www.linkedin.com/in/chiranjeevisagi/') },
  ];
  commands.forEach((c) => { c.text = norm(`${c.label} ${c.group} ${c.keys || ''}`); });

  // Substring matches rank first (earlier = better); otherwise fall back to an in-order character match.
  function score(text, q) {
    if (!q) return 1;
    const idx = text.indexOf(q);
    if (idx !== -1) return 100 - idx;
    let from = 0;
    for (const ch of q) {
      from = text.indexOf(ch, from);
      if (from === -1) return 0;
      from++;
    }
    return 1;
  }

  let results = [];
  let activeIndex = 0;

  function setActiveItem(i) {
    const items = $$('.palette-item', pList);
    if (!items.length) return;
    activeIndex = (i + items.length) % items.length;
    items.forEach((el, n) => el.setAttribute('aria-selected', String(n === activeIndex)));
    pInput.setAttribute('aria-activedescendant', items[activeIndex].id);
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function renderPalette() {
    const q = norm(pInput.value.trim());
    results = commands.map((c) => ({ c, s: score(c.text, q) })).filter((r) => r.s > 0);
    if (q) results.sort((a, b) => b.s - a.s);
    activeIndex = 0;
    if (!results.length) {
      pList.innerHTML = `<li class="palette-empty" role="presentation">No results for “${escapeHtml(pInput.value.trim())}”</li>`;
      pInput.removeAttribute('aria-activedescendant');
      return;
    }
    let html = '';
    let lastGroup = '';
    results.forEach(({ c }, i) => {
      if (!q && c.group !== lastGroup) {
        html += `<li class="palette-group" role="presentation">${c.group}</li>`;
        lastGroup = c.group;
      }
      const hint = c.hint || (q ? c.group : '');
      html += `<li class="palette-item" id="pi-${i}" role="option" aria-selected="false" data-index="${i}">${icon(c.icon)}<span>${c.label}</span>${hint ? `<small>${hint}</small>` : ''}</li>`;
    });
    pList.innerHTML = html;
    setActiveItem(0);
  }

  function openPalette() {
    if (!palette || palette.open) return;
    setMenu(false);
    pInput.value = '';
    renderPalette();
    palette.showModal();
    pInput.focus();
  }

  function closePalette(then) {
    if (!palette || !palette.open) { if (then) then(); return; }
    const finish = () => {
      palette.classList.remove('is-closing');
      palette.close();
      if (then) then();
    };
    if (reducedMotion.matches) { finish(); return; }
    palette.classList.add('is-closing');
    setTimeout(finish, 150);
  }

  function runActive() {
    const r = results[activeIndex];
    if (r) closePalette(r.c.run);
  }

  if (palette) {
    pInput.addEventListener('input', renderPalette);
    pInput.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveItem(activeIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveItem(activeIndex - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runActive(); }
    });
    pList.addEventListener('click', (e) => {
      const item = e.target.closest('.palette-item');
      if (item) { activeIndex = Number(item.dataset.index); runActive(); }
    });
    pList.addEventListener('pointermove', (e) => {
      const item = e.target.closest('.palette-item');
      if (item && Number(item.dataset.index) !== activeIndex) setActiveItem(Number(item.dataset.index));
    });
    palette.addEventListener('click', (e) => { if (e.target === palette) closePalette(); });
    palette.addEventListener('cancel', (e) => { e.preventDefault(); closePalette(); });
    $$('[data-palette-open]').forEach((b) => b.addEventListener('click', openPalette));

    addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (palette.open) closePalette(); else openPalette();
        return;
      }
      const el = doc.activeElement;
      const typing = el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if (e.key === '/' && !typing && !palette.open) { e.preventDefault(); openPalette(); }
    });
  }

  /* ---------- Hero flow field: particles streaming like data through a pipeline ---------- */
  function createFlowField(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const host = canvas.parentElement;
    const PALETTES = {
      dark: ['#34e5c6', '#5eead4', '#60a5fa', '#a78bfa'],
      light: ['#0d9488', '#0891b2', '#4f46e5', '#7c3aed'],
    };
    const R = 150;
    const R2 = R * R;
    const pointer = { x: 0, y: 0, active: false };
    let colors = PALETTES.dark;
    let alpha = 0.75;
    let w = 0;
    let h = 0;
    let t = 0;
    let buckets = [];
    let raf = 0;
    let running = false;
    let inView = true;
    let last = 0;

    const spawn = (p) => {
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.life = 0;
      p.max = 60 + Math.random() * 240;
      p.speed = 0.5 + Math.random() * 1.3;
      return p;
    };

    // Cheap smooth "noise" from layered sines: a flow angle for (x, y) that drifts over time.
    const angleAt = (x, y) =>
      Math.sin(x * 0.0017 + t * 0.00022) * 1.2 +
      Math.cos(y * 0.0026 - t * 0.00017) * 1.0 +
      Math.sin((x - y) * 0.0009 + t * 0.00011) * 0.8;

    function step(dt) {
      t += dt;
      const k = dt / 16.667;
      // Fade previous frames towards transparent so trails work on any page background.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      for (let b = 0; b < buckets.length; b++) {
        const list = buckets[b];
        ctx.strokeStyle = colors[b];
        ctx.beginPath();
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          const a = angleAt(p.x, p.y);
          let vx = (Math.cos(a) * 0.9 + 0.9) * p.speed; // bias the flow left → right
          let vy = Math.sin(a) * 0.7 * p.speed;
          if (pointer.active) {
            const dx = p.x - pointer.x;
            const dy = p.y - pointer.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < R2 && d2 > 1) {
              const d = Math.sqrt(d2);
              const f = (1 - d / R) * 2.4;
              vx += ((dx - dy * 1.4) / d) * f; // push outwards and swirl around the cursor
              vy += ((dy + dx * 1.4) / d) * f;
            }
          }
          const nx = p.x + vx * k;
          const ny = p.y + vy * k;
          if (++p.life > p.max || nx < -5 || nx > w + 5 || ny < -5 || ny > h + 5) { spawn(p); continue; }
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nx, ny);
          p.x = nx;
          p.y = ny;
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Reduced motion: render one settled frame instead of animating.
    function paintStill() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) step(16.667);
    }

    function resize() {
      const rect = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(clamp((w * h) / 1400, 160, 1000));
      buckets = colors.map(() => []);
      for (let i = 0; i < count; i++) buckets[i % buckets.length].push(spawn({}));
      if (reducedMotion.matches) paintStill();
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(now - last, 48);
      last = now;
      step(dt);
    }
    function start() {
      if (running || !inView || doc.hidden || reducedMotion.matches) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }
    function setTheme(theme) {
      colors = PALETTES[theme] || PALETTES.dark;
      alpha = theme === 'light' ? 0.55 : 0.75;
      if (reducedMotion.matches && w) paintStill();
    }

    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = true;
    }, { passive: true });
    host.addEventListener('pointerleave', () => { pointer.active = false; });

    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) start(); else stop();
    }).observe(host);
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); else start(); });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) { stop(); paintStill(); } else start();
    });

    // Rebuild on real size changes only; ignore small height jitter from mobile URL bars.
    let lastW = 0;
    let lastH = 0;
    let resizeTimer;
    const syncSize = () => {
      const r = host.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 100) return;
      lastW = r.width;
      lastH = r.height;
      resize();
    };
    new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(syncSize, 120); }).observe(host);

    setTheme(root.dataset.theme);
    syncSize();
    start();
    return { setTheme };
  }

  const heroCanvas = $('.hero-canvas');
  if (heroCanvas) flow = createFlowField(heroCanvas);

  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(moveIndicator);
  root.classList.add('ready');
})();
