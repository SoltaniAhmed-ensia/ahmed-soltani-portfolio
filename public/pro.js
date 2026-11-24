'use strict';
/* pro layer: runs after app.js (shares its globals: ask, openAI, el, $, $$) */
(() => {
  const toast = t => { let n = $('.toast'); if (!n) { n = el('div', 'toast'); n.setAttribute('role', 'status'); document.body.append(n); } n.textContent = t; n.classList.add('on'); clearTimeout(n._t); n._t = setTimeout(() => n.classList.remove('on'), 2000); };
  const root = document.documentElement;

  /* accent theme: cycle with the nav button, remembered */
  const ACC = ['', 'violet', 'emerald', 'amber', 'rose'];
  try { const a = localStorage.getItem('accent'); if (a) root.dataset.accent = a; } catch {}
  const ab = el('button', 'ib', '◉'); ab.type = 'button'; ab.title = ab.ariaLabel = 'Change accent color';
  ab.onclick = () => { const n = ACC[(ACC.indexOf(root.dataset.accent || '') + 1) % ACC.length]; if (n) root.dataset.accent = n; else delete root.dataset.accent; try { localStorage.setItem('accent', n); } catch {} };
  $('#theme').before(ab);

  /* hero: ask the AI straight from the first screen */
  const Q = ['What are Ahmed’s strongest skills?', 'Explain RAG in simple words', 'Which projects use AI?', 'Write a Python function for binary search', 'What is K-Means clustering?'];
  const f = el('form', 'askbar'), i = el('input'), b = el('button', '', 'Ask AI');
  i.placeholder = Q[0]; i.ariaLabel = 'Ask Ahmed AI'; i.maxLength = 300; b.type = 'submit'; f.append(i, b);
  let qi = 0; setInterval(() => { if (document.activeElement !== i) i.placeholder = Q[qi = (qi + 1) % Q.length]; }, 3200);
  f.onsubmit = e => { e.preventDefault(); const v = i.value.trim() || i.placeholder; i.value = ''; openAI(); setTimeout(() => ask(v), 400); };
  $('.hero2 .cta').after(f);

  /* project cards open a detail dialog (only facts from the CV) + ask-AI shortcut */
  const dlg = el('dialog', 'pm'); dlg.setAttribute('aria-label', 'Project details'); document.body.append(dlg);
  dlg.onclick = e => { if (e.target === dlg) dlg.close(); };
  function openProject(p) {
    dlg.textContent = ''; const w = el('div', 'in'), x = el('button', 'x', '×'); x.type = 'button'; x.ariaLabel = 'Close'; x.onclick = () => dlg.close();
    const t = el('div', 'tags'); p.tech.forEach(s => t.append(el('span', 'tag', s)));
    const r = el('div', 'row2'), a = el('button', 'btn p', 'Ask AI about this project'); a.type = 'button';
    a.onclick = () => { dlg.close(); openAI(); setTimeout(() => ask('Tell me about the project ' + p.name.split(' – ')[0]), 400); };
    r.append(a); if (P.links.github) { const g = el('a', 'btn', 'GitHub'); g.href = P.links.github; g.target = '_blank'; g.rel = 'noopener noreferrer'; r.append(g); }
    w.append(el('p', 'eyebrow', p.category), el('h3', '', p.name), t, el('p', 'mut', 'Category: ' + p.category + '. The CV does not document a further description, so none is shown here. Ask Ahmed directly.'), r);
    dlg.append(x, w); dlg.showModal();
  }
  new MutationObserver(() => $$('#pg .card:not([data-pro])').forEach(c => {
    c.dataset.pro = 1; c.tabIndex = 0; c.setAttribute('role', 'button');
    const p = P.projects.find(q => q.name === $('h3', c).textContent); if (!p) return;
    c.append(el('span', 'open', 'View details'));
    const go = () => openProject(p); c.onclick = e => { if (!e.target.closest('a')) go(); };
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  })).observe($('#pg'), { childList: true });

  /* chat: voice input (en / fr / ar), export, topic chips */
  const cf = $('#cf'), inp = $('#inp'), SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const mic = el('button', 'mic', '🎤'); mic.type = 'button'; mic.title = mic.ariaLabel = 'Speak your question'; let rec = null, li = 0; const L = ['en-US', 'fr-FR', 'ar-DZ'];
    mic.onclick = () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = L[li]; rec.interimResults = true; mic.classList.add('on'); toast('Listening in ' + rec.lang + ' (tap again to stop)');
      rec.onresult = e => { inp.value = [...e.results].map(r => r[0].transcript).join(' '); inp.oninput(); };
      rec.onerror = () => toast('Microphone unavailable'); rec.onend = () => { rec = null; mic.classList.remove('on'); li = (li + 1) % L.length; };
      try { rec.start(); } catch { rec = null; mic.classList.remove('on'); }
    };
    $('#send').before(mic);
  }
  const ex = el('button', 'ib', 'Save'); ex.type = 'button'; ex.title = 'Download this conversation';
  ex.onclick = () => { if (!conv.length) return toast('Nothing to save yet'); const t = conv.map(m => (m.role === 'user' ? 'You: ' : 'Ahmed AI: ') + m.content).join('\n\n'); const a = el('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain' })); a.download = 'ahmed-ai-chat.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  $('#newc').before(ex, ' ');
  const chips = el('div', 'chips'); chips.setAttribute('aria-label', 'Quick topics');
  ['About Ahmed', 'Skills', 'Projects', 'Education', 'Explain transformers', 'What is overfitting?', 'How to contact him?', 'Explain Big-O'].forEach(t => { const c = el('button', '', t); c.type = 'button'; c.onclick = () => ask(t === 'About Ahmed' ? 'Who is Ahmed?' : t === 'Skills' ? 'What are Ahmed’s skills?' : t === 'Projects' ? 'List Ahmed’s projects' : t === 'Education' ? 'What is Ahmed’s education?' : t); chips.append(c); });
  cf.before(chips);

  /* contact: copy email */
  document.addEventListener('profile', () => { const c = $('#clinks'); const b = el('button', 'btn', 'Copy email'); b.type = 'button'; b.onclick = async () => { try { await navigator.clipboard.writeText(P.email); toast('Email copied'); } catch { toast(P.email); } }; c.append(b); });

  /* back to top + mobile dock with active section */
  const up = el('button', 'totop', '↑'); up.type = 'button'; up.ariaLabel = 'Back to top'; up.onclick = () => scrollTo({ top: 0, behavior: 'smooth' }); document.body.append(up);
  addEventListener('scroll', () => up.classList.toggle('on', scrollY > 700), { passive: true });
  const dock = el('nav', 'dock'); dock.setAttribute('aria-label', 'Quick navigation');
  [['#home', '⌂', 'Home'], ['#projects', '◧', 'Projects'], ['ai', '✦', 'AI'], ['#skills', '⚙', 'Skills'], ['#contact', '✉', 'Contact']].forEach(([h, ic, t]) => {
    const n = h === 'ai' ? el('button', 'ai') : el('a'); if (h === 'ai') { n.type = 'button'; n.onclick = openAI; } else n.href = h;
    const s = el('i', '', ic); n.append(s, document.createTextNode(t)); dock.append(n);
  });
  document.body.append(dock);
  const dk = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('a', dock).forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section, header#home').forEach(s => dk.observe(s));

  /* shortcut: "/" focuses the assistant */
  addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !$('dialog[open]')) { e.preventDefault(); openAI(); } });
})();
