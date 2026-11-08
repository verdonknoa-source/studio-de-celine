/* Studio de Céline — mouvement.
   GSAP + ScrollTrigger + Lenis (fichiers locaux, aucun service externe).
   Règles : courbes douces (power3/4, expo), transform + opacity en priorité,
   version allégée sous prefers-reduced-motion et sur mobile. */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none)').matches;
  const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
  const PHONE = '+33667778465';
  const saveData = navigator.connection && navigator.connection.saveData;

  let lenis = null;
  let lashIntro = () => {};
  const scrollLock = (on) => { if (lenis) { on ? lenis.stop() : lenis.start(); } else { document.documentElement.style.overflow = on ? 'hidden' : ''; } };

  /* ---------- Découpe de texte (mots / lettres, avec masque) ---------- */
  function split(el, mode) {
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    if (el.tagName !== 'SPAN' && !el.hasAttribute('aria-label') && !el.closest('[aria-label]')) el.setAttribute('aria-label', text);
    el.textContent = '';
    const words = text.split(' ');
    const out = [];
    words.forEach((word, i) => {
      if (mode === 'words') {
        const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = word;
        w.appendChild(wi); el.appendChild(w); out.push(wi);
      } else {
        const wd = document.createElement('span'); wd.style.cssText = 'display:inline-block;white-space:nowrap'; wd.setAttribute('aria-hidden', 'true');
        [...word].forEach((c) => {
          const cm = document.createElement('span'); cm.className = 'cm';
          const ch = document.createElement('span'); ch.className = 'ch'; ch.textContent = c;
          cm.appendChild(ch); wd.appendChild(cm); out.push(ch);
        });
        el.appendChild(wd);
      }
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return out;
  }

  /* ---------- Éléments statiques (sans GSAP) ---------- */
  function initStatic() {
    $('#year').textContent = new Date().getFullYear();

    // Séparateur « pointes d'amande » : tracé généré
    $$('[data-tips]').forEach((p) => {
      const n = 14, w = 1200, h = 64, s = w / n;
      let d = `M0 0H${w}V8`;
      for (let i = n; i >= 1; i--) {
        const x = i * s;
        d += ` C${x - s * .1} 8 ${x - s * .42} ${h * .55} ${x - s * .5} ${h - 4} C${x - s * .58} ${h * .55} ${x - s * .9} 8 ${x - s} 8`;
      }
      p.setAttribute('d', d + 'Z');
    });

    initHours();
    initBuilder();
    initLightbox();
    initReviews();
    initMenu();
    initTabs();
  }

  /* Horaires + « ouvert maintenant » (heure de Paris) */
  function initHours() {
    const H = { 1: [9, 19], 2: [9, 18], 3: [8, 13], 4: [9, 19], 5: [9, 18], 6: [8, 13], 0: null };
    const names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    const now = (+get('hour') % 24) + (+get('minute')) / 60;
    const row = $(`#hoursBody tr[data-d="${day}"]`);
    if (row) row.classList.add('is-today');
    const state = $('#openState'); const label = $('span', state);
    const t = H[day];
    if (t && now >= t[0] && now < t[1]) {
      state.classList.add('is-open');
      label.textContent = `Ouvert maintenant · ferme à ${t[1]}h`;
      return;
    }
    let msg = 'Fermé';
    for (let k = 0; k < 7; k++) {
      const d = (day + k) % 7; const o = H[d];
      if (!o) continue;
      if (k === 0 && now >= o[0]) continue;
      const when = k === 0 ? "aujourd'hui" : k === 1 ? 'demain' : names[d];
      msg = `Fermé · ouvre ${when} à ${o[0]}h`;
      break;
    }
    label.textContent = msg;
  }

  /* Composer son rendez-vous : la carte est lue depuis les cartes de prestations */
  function initBuilder() {
    const list = $('#builderList');
    const items = new Map();
    let uid = 0;
    $$('.card[data-group]').forEach((card, gi) => {
      const title = $('h3', card).textContent;
      const from = $('.card__from b', card).textContent;
      const det = document.createElement('details'); det.className = 'grp'; if (gi === 0) det.open = true;
      const sum = document.createElement('summary'); sum.innerHTML = `<span></span><small></small>`;
      $('span', sum).textContent = title; $('small', sum).textContent = `dès ${from}`;
      det.appendChild(sum);
      const body = document.createElement('div'); body.className = 'grp__body';
      const cols = $$('.cols > div', card);
      const blocks = cols.length ? cols.map((c) => ({ sub: $('h4', c).textContent, lis: $$('li', c) })) : [{ sub: '', lis: $$('li', card) }];
      blocks.forEach((b) => {
        if (b.sub) { const h = document.createElement('p'); h.className = 'grp__sub'; h.textContent = b.sub; body.appendChild(h); }
        b.lis.forEach((li) => {
          const id = 'o' + (++uid);
          const label = $('.l', li).textContent; const dur = $('.d', li).textContent; const priceTxt = $('.p', li).textContent;
          items.set(id, { name: (b.sub ? b.sub + ' · ' : '') + label, price: +li.dataset.price, min: +li.dataset.min });
          const lab = document.createElement('label'); lab.className = 'opt'; lab.setAttribute('for', id);
          lab.innerHTML = `<input type="checkbox" id="${id}"><span class="opt__box" aria-hidden="true"></span><span class="opt__l"></span><span class="opt__p"></span>`;
          const ol = $('.opt__l', lab); ol.textContent = label; const sm = document.createElement('small'); sm.textContent = dur; ol.appendChild(sm);
          $('.opt__p', lab).textContent = priceTxt;
          body.appendChild(lab);
        });
      });
      det.appendChild(body); list.appendChild(det);
    });

    const sumList = $('#sumList'), sumTime = $('#sumTime'), sumTotal = $('#sumTotal'), sms = $('#sumSms');
    const fmtMin = (m) => m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`;
    const render = () => {
      const chosen = $$('#builderList input:checked').map((i) => items.get(i.id));
      sumList.innerHTML = '';
      if (!chosen.length) { sumList.innerHTML = '<li class="empty">Rien de coché pour l’instant.</li>'; }
      chosen.forEach((c) => { const li = document.createElement('li'); li.innerHTML = '<span></span><b></b>'; $('span', li).textContent = c.name; $('b', li).textContent = `${c.price} €`; sumList.appendChild(li); });
      const total = chosen.reduce((a, c) => a + c.price, 0); const min = chosen.reduce((a, c) => a + c.min, 0);
      sumTotal.textContent = `${total} €`; sumTime.textContent = fmtMin(min);
      let body = 'Bonjour Céline, je souhaiterais prendre rendez-vous.';
      if (chosen.length) body = `Bonjour Céline, je souhaiterais prendre rendez-vous pour :\n${chosen.map((c) => `- ${c.name} (${c.price} €)`).join('\n')}\nTotal estimé : ${total} € · durée environ ${fmtMin(min)}.\nMes disponibilités : `;
      sms.href = `sms:${PHONE}?&body=${encodeURIComponent(body)}`;
    };
    list.addEventListener('change', render);
    render();
  }

  /* Lightbox de la galerie */
  function initLightbox() {
    const box = $('#lightbox'), img = $('#lbImg'), cap = $('#lbCap'), close = $('#lbClose');
    let last = null;
    const open = (fig) => {
      const src = $('img', fig);
      img.src = src.currentSrc || src.src; img.alt = src.alt; cap.textContent = $('figcaption', fig).textContent;
      box.hidden = false; last = fig; scrollLock(true); close.focus();
    };
    const shut = () => { box.hidden = true; scrollLock(false); if (last) last.focus({ preventScroll: true }); };
    $$('[data-lightbox]').forEach((fig) => {
      fig.tabIndex = 0; fig.setAttribute('role', 'button'); fig.setAttribute('aria-label', 'Agrandir : ' + $('figcaption', fig).textContent);
      fig.addEventListener('click', () => open(fig));
      fig.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(fig); } });
    });
    close.addEventListener('click', shut);
    box.addEventListener('click', (e) => { if (e.target === box) shut(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !box.hidden) shut(); });
  }

  /* Carrousel d'avis : défilement natif + glisser + flèches + lecture auto */
  function initReviews() {
    const track = $('#revTrack'); if (!track) return;
    const revs = $$('.rev', track);
    const dots = $('#revDots');
    revs.forEach(() => dots.appendChild(document.createElement('i')));
    const dotEls = $$('i', dots);
    let active = 0, raf = 0;
    const step = () => revs[0].offsetWidth + parseFloat(getComputedStyle(track).columnGap || 24);
    const update = () => {
      raf = 0;
      const c = track.scrollLeft + track.clientWidth / 2; let best = 0, bd = 1e9;
      revs.forEach((r, i) => {
        const d = Math.abs(r.offsetLeft + r.offsetWidth / 2 - c);
        if (d < bd) { bd = d; best = i; }
        const t = Math.min(1, d / (track.clientWidth * .55));
        r.style.setProperty('--s', (1 - .06 * t).toFixed(3));
        r.style.opacity = (1 - .4 * t).toFixed(2);
      });
      if (best !== active || !dotEls[best].classList.contains('is-on')) { active = best; dotEls.forEach((d, i) => d.classList.toggle('is-on', i === best)); }
    };
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
    addEventListener('resize', update);
    update();
    const go = (dir) => {
      const max = track.scrollWidth - track.clientWidth;
      if (dir > 0 && track.scrollLeft >= max - 8) track.scrollTo({ left: 0, behavior: 'smooth' });
      else if (dir < 0 && track.scrollLeft <= 8) track.scrollTo({ left: max, behavior: 'smooth' });
      else track.scrollBy({ left: dir * step(), behavior: 'smooth' });
    };
    $('#revPrev').addEventListener('click', () => go(-1));
    $('#revNext').addEventListener('click', () => go(1));
    track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });

    // Glisser à la souris
    let down = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = track.scrollLeft; track.classList.add('is-drag'); });
    addEventListener('pointermove', (e) => { if (down) track.scrollLeft = sl - (e.clientX - sx); });
    addEventListener('pointerup', () => { if (down) { down = false; track.classList.remove('is-drag'); } });

    // Lecture auto (suspendue au survol / focus / hors écran / mouvement réduit)
    if (!reduce) {
      let paused = false, visible = false;
      track.addEventListener('pointerenter', () => { paused = true; });
      track.addEventListener('pointerleave', () => { paused = false; });
      track.addEventListener('focusin', () => { paused = true; });
      track.addEventListener('focusout', () => { paused = false; });
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: .4 }).observe(track);
      setInterval(() => { if (!paused && visible && !document.hidden) go(1); }, 6500);
    }
  }

  /* Menu mobile plein écran */
  let closeMenu = () => {};
  function initMenu() {
    const burger = $('#burger'), menu = $('#menu'), dock = $('#dock');
    const set = (open) => {
      burger.setAttribute('aria-expanded', open); menu.classList.toggle('is-open', open); menu.setAttribute('aria-hidden', !open);
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      scrollLock(open); if (dock) dock.style.visibility = open ? 'hidden' : '';
      $('#nav').classList.remove('is-hidden');
    };
    closeMenu = () => { if (menu.classList.contains('is-open')) set(false); };
    burger.addEventListener('click', () => set(!menu.classList.contains('is-open')));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
  }

  /* Onglets cils + schéma de densité */
  function initTabs() {
    const tabs = $$('[role="tab"]'); const svg = $('#lashviz');
    const NS = 'http://www.w3.org/2000/svg';
    const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
    const P0 = [40, 200], C = [300, 40], P2 = [560, 200];
    const bez = (t) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * C[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * C[1] + t * t * P2[1]];
    const tan = (t) => [2 * (1 - t) * (C[0] - P0[0]) + 2 * t * (P2[0] - C[0]), 2 * (1 - t) * (C[1] - P0[1]) + 2 * t * (P2[1] - C[1])];
    const dir = (deg) => [Math.sin(deg * Math.PI / 180), -Math.cos(deg * Math.PI / 180)];
    const MODES = {
      cil: { sites: 17, strands: () => [0], len: 1, curl: 12, spread: 0 },
      mixte: { sites: 15, strands: (i) => (i % 2 ? [-7, 0, 7] : [0]), len: 1.05, curl: 14, spread: 0 },
      volume: { sites: 13, strands: () => [-14, -7, 0, 7, 14], len: 1.1, curl: 16, spread: 0 },
      rehauss: { sites: 17, strands: () => [0], len: .82, curl: 30, spread: 0 }
    };
    const draw = (mode, animate) => {
      svg.textContent = '';
      const m = MODES[mode];
      svg.appendChild(el('path', { class: 'lid', d: 'M40 200 Q300 40 560 200' }));
      svg.appendChild(el('path', { class: 'lid', d: 'M40 200 Q300 262 560 200', opacity: .55 }));
      svg.appendChild(el('circle', { class: 'iris', cx: 300, cy: 178, r: 46 }));
      svg.appendChild(el('circle', { class: 'pupil', cx: 300, cy: 178, r: 16 }));
      const g = el('g', {}); svg.appendChild(g);
      for (let i = 0; i < m.sites; i++) {
        const t = .03 + .94 * (i / (m.sites - 1));
        const [x, y] = bez(t); const T = tan(t);
        const n = [T[1], -T[0]]; const nl = Math.hypot(n[0], n[1]);
        const base = Math.atan2(n[0] / nl, -n[1] / nl) * 180 / Math.PI;
        const side = base >= 0 ? 1 : -1;
        const L = (46 + 40 * Math.sin(Math.PI * t)) * m.len;
        m.strands(i).forEach((off) => {
          const a = base + off + (side * (t > .5 ? 8 : 4));
          const tip = dir(a), ctl = dir(a - side * m.curl);
          const d = `M${x.toFixed(1)} ${y.toFixed(1)} Q${(x + ctl[0] * L * .62).toFixed(1)} ${(y + ctl[1] * L * .62).toFixed(1)} ${(x + tip[0] * L).toFixed(1)} ${(y + tip[1] * L).toFixed(1)}`;
          g.appendChild(el('path', { class: 'lash', d, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': (animate && hasGSAP && !reduce) ? 1 : 0 }));
        });
      }
      if (animate && hasGSAP && !reduce) gsap.to($$('.lash', svg), { strokeDashoffset: 0, duration: 1.1, ease: 'power3.out', stagger: { each: .012, from: 'center' } });
    };
    const select = (tab, focus) => {
      tabs.forEach((t) => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
      draw(tab.dataset.mode, true); if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      });
    });
    draw('cil', false);
    // dessin animé à la première apparition (déclenché depuis initMotion, après les sections pinnées)
    lashIntro = () => {
      const first = $$('.lash', svg); first.forEach((l) => l.setAttribute('stroke-dashoffset', 1));
      ScrollTrigger.create({ trigger: svg, start: 'top 85%', once: true, onEnter: () => gsap.to(first, { strokeDashoffset: 0, duration: 1.4, ease: 'power3.out', stagger: { each: .015, from: 'center' } }) });
    };
  }

  /* ---------- Mouvement ---------- */
  let heroPlayed = false;
  function heroIn() {
    if (heroPlayed) return; heroPlayed = true;
    const big = $$('.hero__big .ch'), pre = $$('.hero__pre .ch');
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    tl.fromTo('.hero__video', { scale: 1.32 }, { scale: 1.04, duration: 3.2, ease: 'power3.out' }, 0)
      .to('.hero__veil', { opacity: 1, duration: 1.4 }, 0)
      .to(big, { yPercent: 0, rotate: 0, duration: 1.5, stagger: .075 }, .1)
      .to(pre, { yPercent: 0, duration: 1.1, stagger: .04 }, .35)
      .to('[data-hero-in]', { opacity: 1, y: 0, duration: 1.2, stagger: .11 }, .7)
      .to('.shape', { opacity: (i, t) => t.classList.contains('shape--hex') ? .75 : t.classList.contains('a3') ? .85 : t.classList.contains('a2') ? .92 : 1, scale: 1, duration: 1.6, stagger: .08, ease: 'power3.out' }, .5)
      .add(() => { $('#dock') && $('#dock').classList.add('is-in'); }, 1.4);
    // dérive lente du fond
    gsap.to('.hero__video', { scale: 1.1, duration: 22, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 3.4 });
  }

  function initLoader() {
    const loader = $('#loader');
    const nameChars = split($('[data-loader-name]'), 'chars');
    const count = $('#count');
    // On attend les polices et le chargement de la page, mais jamais plus de 3,2 s (la vidéo peut être lourde)
    const loaded = Promise.race([
      Promise.all([
        new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r))),
        document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()
      ]),
      new Promise((r) => setTimeout(r, 3200))
    ]);
    const done = () => { loader.remove(); scrollLock(false); ScrollTrigger.refresh(); const d = $('#dock'); if (d) d.classList.add('is-in'); };

    if (reduce) {
      loaded.then(() => gsap.to(loader, { opacity: 0, duration: .5, onComplete: done }));
      return;
    }
    gsap.set(nameChars, { yPercent: 115 });
    gsap.set('.loader__tag', { opacity: 0, y: 10 });
    const o = { v: 0 };
    const tl = gsap.timeline();
    tl.to('.crest path', { strokeDashoffset: 0, duration: 1.5, stagger: .16, ease: 'power2.inOut' }, 0)
      .to('.crest__c', { opacity: 1, duration: .9 }, 1)
      .to(nameChars, { yPercent: 0, stagger: .035, duration: .9, ease: 'power4.out' }, .6)
      .to('.loader__tag', { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, 1.2)
      .to(o, { v: 100, duration: 2.1, ease: 'power1.inOut', onUpdate: () => { count.textContent = Math.round(o.v); } }, 0);
    const exit = () => {
      gsap.timeline({ onComplete: done })
        .to('.loader__inner', { scale: 1.18, opacity: 0, duration: .75, ease: 'power2.in' }, 0)
        .to('.loader__panel--t', { yPercent: -102, duration: 1.3, ease: 'power4.inOut' }, .4)
        .to('.loader__panel--b', { yPercent: 102, duration: 1.3, ease: 'power4.inOut' }, .4)
        .add(heroIn, .62);
    };
    Promise.all([loaded, new Promise((r) => tl.eventCallback('onComplete', r))]).then(exit);
    setTimeout(() => { if (!heroPlayed) exit(); }, 9000); // filet de sécurité
  }

  function initMotion() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Défilement fluide (Lenis) branché sur ScrollTrigger
    if (!reduce && typeof Lenis !== 'undefined') {
      lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: .95 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    } else {
      document.documentElement.style.overflow = 'hidden';
    }

    // Ancres
    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const t = $(id); if (!t) return;
      e.preventDefault(); closeMenu();
      if (lenis) lenis.scrollTo(t, { offset: id === '#accueil' ? 0 : -4, duration: 1.7, easing: (x) => 1 - Math.pow(1 - x, 4) });
      else t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }));

    // Vidéo : image de secours si l'utilisateur limite le mouvement ou les données
    const video = $('#heroVideo');
    if (video && (reduce || saveData)) { video.removeAttribute('autoplay'); video.pause(); }
    else if (video) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }

    // États initiaux du hero (derrière le loader)
    const bigChars = split($('.hero__big'), 'chars');
    const preChars = split($('.hero__pre'), 'chars');
    if (!reduce) {
      gsap.set(bigChars, { yPercent: 118, rotate: 7 });
      gsap.set(preChars, { yPercent: 118 });
      gsap.set('[data-hero-in]', { opacity: 0, y: 30 });
      gsap.set('.hero__veil', { opacity: 0 });
      gsap.set('.shape', { opacity: 0, scale: .6 });
    }
    // Giant du footer + titres
    const giant = split($('#giant'), 'chars');
    const heads = $$('[data-split="words"]').map((h) => ({ h, words: split(h, 'words') }));

    initLoader();
    if (reduce) { ScrollTrigger.refresh(); return; }

    const mm = gsap.matchMedia();

    /* --- Hero : parallax multicouche + souris --- */
    gsap.to('[data-hero-media]', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { y: -70, opacity: .1, ease: 'none', scrollTrigger: { trigger: '.hero', start: '25% top', end: 'bottom top', scrub: true } });
    $$('.shape').forEach((s) => {
      const depth = +s.dataset.depth || .5;
      gsap.to(s, { y: -depth * 190, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 } });
    });
    gsap.to('.hero__badge', { y: -90, rotate: 25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    mm.add('(min-width: 901px) and (hover: hover)', () => {
      const hero = $('.hero');
      const q = $$('.shape').map((s) => ({ d: +s.dataset.depth || .5, x: gsap.quickTo(s, 'x', { duration: 1.4, ease: 'power3.out' }), y: gsap.quickTo(s, 'yPercent', { duration: 1.4, ease: 'power3.out' }) }));
      const move = (e) => { const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5; q.forEach((o) => { o.x(nx * o.d * -70); o.y(ny * o.d * -30); }); };
      hero.addEventListener('pointermove', move);
      return () => hero.removeEventListener('pointermove', move);
    });

    /* --- Marquee : vitesse et sens suivent le scroll --- */
    const rows = $$('.marquee__row').map((row) => {
      const dir = +row.dataset.dir; const track = $('.marquee__track', row);
      const tw = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, ease: 'none', duration: 42, repeat: -1 });
      return { tw, ts: 1 };
    });
    let vel = 0, sd = 1;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { vel = self.getVelocity(); if (Math.abs(vel) > 40) sd = self.direction; } });
    gsap.ticker.add(() => {
      const boost = Math.min(7, Math.abs(vel) / 380); vel *= .93;
      const target = sd * (1 + boost);
      rows.forEach((r) => { r.ts += (target - r.ts) * .07; r.tw.timeScale(r.ts); });
    });
    gsap.from('.marquee', { yPercent: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.marquee', start: 'top 98%', once: true } });

    /* --- Cadres amande : rideau + zoom + image qui bouge dans son cadre --- */
    const reveal = (f, o = {}) => {
      const img = $('img', f); if (!img) return;
      const c = document.createElement('span'); c.className = 'curtain'; f.appendChild(c);
      gsap.set(img, { scale: 1.38 });
      ScrollTrigger.create({
        trigger: f, start: 'top 88%', once: true,
        onEnter: () => {
          gsap.timeline()
            .to(c, { scaleY: 0, duration: 1.15, ease: 'power4.inOut' }, 0)
            .to(img, { scale: 1, duration: 1.8, ease: 'power3.out', onComplete: () => { if (o.kb) gsap.to(img, { scale: 1.13, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 }); } }, 0);
        }
      });
      if (o.parallax !== false) gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
    };

    /* --- Le rituel : section pinnée, storytelling étape par étape --- */
    mm.add('(min-width: 901px)', () => {
      const steps = $$('.step'); if (!steps.length) return;
      gsap.set(steps.slice(1), { autoAlpha: 0 });
      reveal($('.frame', steps[0]), { parallax: false });
      gsap.from($$('.step__text > *', steps[0]), { autoAlpha: 0, y: 46, duration: 1.1, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.ritual', start: 'top 62%', once: true } });
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
      tl.to({}, { duration: .6 });
      steps.forEach((s, i) => {
        if (!i) return;
        const prev = steps[i - 1];
        tl.to($$('.step__text > *', prev), { autoAlpha: 0, y: -36, duration: .45, stagger: .04 }, '>')
          .to($('.step__fig', prev), { autoAlpha: 0, scale: .92, rotate: -2, duration: .55 }, '<')
          .set(prev, { autoAlpha: 0 })
          .set(s, { autoAlpha: 1 })
          .fromTo($$('.step__text > *', s), { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: .6, stagger: .08, ease: 'power3.out' }, '>')
          .fromTo($('.step__fig', s), { autoAlpha: 0, scale: 1.08, rotate: 2 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: .75, ease: 'power3.out' }, '<')
          .to({}, { duration: .9 });
        gsap.set($('.frame img', s), { scale: 1 });
      });
      tl.fromTo('.ritual__fill', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: tl.duration() }, 0);
      ScrollTrigger.create({ trigger: '.ritual', start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.6), pin: true, scrub: .7, animation: tl, anticipatePin: 1 });
    });
    mm.add('(max-width: 900px)', () => { $$('.step .frame').forEach((f) => reveal(f)); });

    /* --- Prestations : défilement horizontal piloté par le scroll vertical --- */
    mm.add('(min-width: 901px)', () => {
      const track = $('#track');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const h = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.services', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: .9, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.card').forEach((card, i) => {
        gsap.from(card, { opacity: 0, y: 80, rotationY: -18, transformPerspective: 1200, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, containerAnimation: h, start: 'left 96%', toggleActions: 'play none none none' } });
      });
      const end = $('.services__end h3'); const w = heads.find((x) => x.h === end);
      if (w) { gsap.set(w.words, { yPercent: 115 }); gsap.to(w.words, { yPercent: 0, duration: 1.1, stagger: .09, ease: 'power4.out', scrollTrigger: { trigger: end, containerAnimation: h, start: 'left 85%', toggleActions: 'play none none none' } }); }
    });

    /* --- Titres : apparition mot par mot (masque qui monte) --- */
    const endH = $('.services__end h3');
    heads.forEach(({ h, words }) => {
      if (h === endH && matchMedia('(min-width: 901px)').matches) return;
      gsap.set(words, { yPercent: 115, rotate: 3 });
      ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.15, stagger: .07, ease: 'power4.out' }) });
    });

    /* --- Apparitions douces des blocs --- */
    ['.eyebrow', '.services__intro > p', '.regard__lead', '.tabs', '.lashviz', '.tabpanel:not([hidden])', '.reviews__score', '.bars', '.reviews__ctrl', '.book__intro > p', '.book__direct', '.builder', '.visit__info address', '.visit__links', '.hours', '.visit__map', '.gallery__head > p:last-child', '.gallery__more', '.footer__top > *', '.stats__foot', '.regard__chip'].forEach((sel) => {
      $$(sel).forEach((el) => {
        if (el.closest('.services__track') && !el.closest('.services__intro')) return;
        gsap.from(el, { y: 36, opacity: 0, duration: 1.1, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
      });
    });

    /* --- Le regard --- */
    $$('.regard .frame').forEach((f) => reveal(f, { kb: true }));
    lashIntro();

    /* --- Chiffres clés : compteurs + anneau qui se trace --- */
    const fmt = (v, d) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    $$('.stat').forEach((stat) => {
      const n = $('[data-count]', stat), target = +n.dataset.count, dec = +(n.dataset.dec || 0);
      n.textContent = fmt(0, dec);
      ScrollTrigger.create({
        trigger: stat, start: 'top 85%', once: true,
        onEnter: () => {
          const o = { v: 0 };
          gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => { n.textContent = fmt(o.v, dec); } });
          gsap.fromTo($('.stat__ring circle', stat), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 2.2, ease: 'power3.inOut' });
          gsap.from(stat, { scale: .88, opacity: 0, duration: 1.2, ease: 'power3.out' });
        }
      });
    });

    /* --- Galerie : colonnes à vitesses différentes + survol 3D --- */
    mm.add('(min-width: 901px)', () => {
      $$('.gcol').forEach((col) => {
        const sp = +col.dataset.speed || 0;
        gsap.fromTo(col, { y: -sp / 2 }, { y: sp / 2, ease: 'none', scrollTrigger: { trigger: '#galleryCols', start: 'top bottom', end: 'bottom top', scrub: .8 } });
      });
    });
    $$('.gitem .frame').forEach((f) => reveal(f));

    /* --- Avis : barres de notes --- */
    $$('.bars li').forEach((li, i) => {
      const bar = $('i', li);
      gsap.fromTo(bar, { '--w': 0 }, { '--w': 1, duration: 1.6, delay: i * .12, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 92%', once: true } });
    });
    gsap.from('.rev', { y: 60, opacity: 0, duration: 1.1, stagger: .09, ease: 'power3.out', scrollTrigger: { trigger: '#revTrack', start: 'top 88%', once: true }, clearProps: 'transform' });

    /* --- Footer : le grand nom se déploie --- */
    gsap.fromTo(giant, { yPercent: 105 }, { yPercent: 0, ease: 'power3.out', stagger: .035, scrollTrigger: { trigger: '.footer', start: 'top 92%', end: 'top 15%', scrub: .6 } });

    /* --- Navigation, progression, dock --- */
    const nav = $('#nav');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle('is-solid', y > 60);
        if ($('#menu').classList.contains('is-open')) return;
        if (self.direction === 1 && y > 360) nav.classList.add('is-hidden');
        else if (self.direction === -1) nav.classList.remove('is-hidden');
      }
    });
    gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .25 } });

    /* --- Interactions : boutons magnétiques, cartes inclinables --- */
    if (!coarse) {
      $$('[data-magnetic]').forEach((btn) => {
        const label = $('.btn__label', btn);
        const bx = gsap.quickTo(btn, 'x', { duration: .7, ease: 'power3.out' }), by = gsap.quickTo(btn, 'y', { duration: .7, ease: 'power3.out' });
        const lx = gsap.quickTo(label, 'x', { duration: .7, ease: 'power3.out' }), ly = gsap.quickTo(label, 'y', { duration: .7, ease: 'power3.out' });
        btn.addEventListener('pointermove', (e) => {
          const r = btn.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          bx(dx * .3); by(dy * .45); lx(dx * .12); ly(dy * .2);
        });
        btn.addEventListener('pointerleave', () => { bx(0); by(0); lx(0); ly(0); });
      });
      $$('[data-tilt]').forEach((el) => {
        const isCard = el.classList.contains('card'); const max = isCard ? 7 : 9;
        const glare = $('.card__glare', el);
        gsap.set(el, { transformPerspective: 1000 });
        const rx = gsap.quickTo(el, 'rotationX', { duration: .6, ease: 'power3.out' }), ry = gsap.quickTo(el, 'rotationY', { duration: .6, ease: 'power3.out' });
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          ry((px - .5) * max * 2); rx(-(py - .5) * max * 2);
          if (glare) gsap.to(glare, { x: px * r.width, y: py * r.height, opacity: 1, duration: .45, ease: 'power3.out', overwrite: 'auto' });
        });
        el.addEventListener('pointerleave', () => { rx(0); ry(0); if (glare) gsap.to(glare, { opacity: 0, duration: .6 }); });
      });
    }

    // Recalcule quand les polices et images sont prêtes
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Démarrage ---------- */
  const boot = () => {
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    initStatic();
    if (hasGSAP) {
      initMotion();
    } else {
      const l = $('#loader'); if (l) l.remove();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
