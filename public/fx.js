'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches, fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const done = () => $('#pre') && $('#pre').classList.add('done');
  addEventListener('load', () => setTimeout(done, 250)); setTimeout(done, 2500);

  /* scroll progress */
  const prog = () => document.documentElement.style.setProperty('--p', (scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)).toFixed(4));
  addEventListener('scroll', prog, { passive: true }); prog();

  /* typed role (from real interests in the CV) */
  const roles = ['AI engineering student', 'LLM & AI-agent builder', 'Data mining explorer', 'Software & mobile developer'], ty = $('#typed');
  if (ty && !reduce) {
    let i = 0, j = 0, del = false;
    (function tick() {
      const w = window.tr ? tr(roles[i]) : roles[i];
      if (window.LANG && LANG() === 'ar') { ty.textContent = w; j = 0; del = false; i = (i + 1) % roles.length; return setTimeout(tick, 2400); } /* Arabic letters must stay joined: no letter-by-letter typing */ j += del ? -1 : 1; ty.textContent = w.slice(0, j);
      let d = del ? 28 : 65;
      if (!del && j === w.length) { del = true; d = 1600; } else if (del && j === 0) { del = false; i = (i + 1) % roles.length; d = 350; }
      setTimeout(tick, d);
    })();
  }

  /* neural-network background */
  const cv = $('#net');
  if (cv && !reduce) {
    const x = cv.getContext('2d'); let w, h, dpr, N = [], m = { x: -999, y: -999 };
    const resize = () => { dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
      N = Array.from({ length: Math.min(90, Math.round(w * h / 17000)) }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 })); };
    resize(); addEventListener('resize', resize);
    addEventListener('pointermove', e => { m.x = e.clientX; m.y = e.clientY; }, { passive: true });
    let on = true; document.addEventListener('visibilitychange', () => { on = !document.hidden; if (on) loop(); });
    function loop() {
      if (!on) return; x.clearRect(0, 0, w, h); const c = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim() || '#7c9cff';
      x.fillStyle = c; x.strokeStyle = c;
      for (let i = 0; i < N.length; i++) {
        const p = N[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > w) p.vx *= -1; if (p.y < 0 || p.y > h) p.vy *= -1;
        const dm = Math.hypot(p.x - m.x, p.y - m.y); if (dm < 140) { p.x += (p.x - m.x) / dm * .8; p.y += (p.y - m.y) / dm * .8; }
        x.globalAlpha = .8; x.beginPath(); x.arc(p.x, p.y, 1.6, 0, 6.3); x.fill();
        for (let j = i + 1; j < N.length; j++) { const q = N[j], d = Math.hypot(p.x - q.x, p.y - q.y); if (d < 130) { x.globalAlpha = .22 * (1 - d / 130); x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(q.x, q.y); x.stroke(); } }
        if (dm < 170) { x.globalAlpha = .35 * (1 - dm / 170); x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(m.x, m.y); x.stroke(); }
      }
      requestAnimationFrame(loop);
    }
    loop();
  }

  /* cursor glow, card spotlight and 3D tilt (mouse only) */
  if (fine && !reduce) {
    const g = $('#glow');
    addEventListener('pointermove', e => { g.classList.add('on'); g.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; }, { passive: true });
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty('--mx', px * 100 + '%'); c.style.setProperty('--my', py * 100 + '%');
      if (c.closest('#projects')) c.style.transform = `perspective(900px) rotateX(${(.5 - py) * 7}deg) rotateY(${(px - .5) * 9}deg) translateY(-4px)`;
    });
    document.addEventListener('pointerout', e => { const c = e.target.closest && e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) c.style.transform = ''; });
  }

  /* stagger grids as they are filled */
  const stagger = () => $$('.grid').forEach(g => [...g.children].forEach((c, i) => c.style.setProperty('--i', i)));
  new MutationObserver(stagger).observe(document.body, { childList: true, subtree: true });

  /* real stats + marquee, from /api/profile */
  document.addEventListener('profile', ev => {
    const P = ev.detail;
    const data = [[P.projects.length, 'Projects', 0], [P.skills['Programming Languages'].length, 'Programming languages', 0], [P.languages.length, 'Spoken languages', 0], [18.05, 'Baccalaureate /20', 2]];
    const box = $('#stats'); box.textContent = '';
    data.forEach(([v, l, dec]) => { const d = document.createElement('div'), t = document.createElement('dt'), s = document.createElement('dd'); t.textContent = reduce ? v.toFixed(dec) : '0'; s.textContent = l; d.append(t, s); box.append(d);
      if (!reduce) { const t0 = performance.now(); (function f(n) { const k = Math.min(1, (n - t0) / 1400), e = 1 - Math.pow(1 - k, 3); t.textContent = (v * e).toFixed(dec); if (k < 1) requestAnimationFrame(f); })(t0); } });
    const items = [...Object.values(P.skills).flat(), ...P.projects.map(p => p.name.split(' – ')[0])];
    const html = [...items, ...items].map(s => { const e = document.createElement('span'); e.textContent = s; return e.outerHTML; }).join('');
    $('#mqt').innerHTML = html;
  });
})();
