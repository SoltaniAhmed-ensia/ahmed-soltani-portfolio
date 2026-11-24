'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
let P = null, health = { ai: false, contact: false };

/* ---------- theme ---------- */
const root = document.documentElement;
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch {}
$('#theme').onclick = () => {
  const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark');
  const next = cur === 'dark' ? 'light' : 'dark'; root.dataset.theme = next; try { localStorage.setItem('theme', next); } catch {}
};
$('#yr').textContent = new Date().getFullYear();

/* ---------- nav ---------- */
const nav = $('nav'), links = $('#links'), menu = $('#menu');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });
menu.onclick = () => { const o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', o); };
links.addEventListener('click', e => { if (e.target.tagName === 'A') { links.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); } });
const secObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('a', links).forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
$$('main section').forEach(s => secObs.observe(s));
const revObs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } }), { threshold: .06 });
$$('.reveal').forEach(e => revObs.observe(e));

/* ---------- content from /api/profile (single source of truth) ---------- */
function pills(box, list, state, cb) {
  box.textContent = '';
  ['All', ...list].forEach(n => { const b = el('button', '', n); b.type = 'button'; b.setAttribute('aria-pressed', String(state.v === n)); b.onclick = () => { state.v = n; pills(box, list, state, cb); cb(); }; box.appendChild(b); });
}
function render() {
  const g = $('#aboutGrid');
  const c1 = el('div', 'card big'); c1.append(el('h3', '', 'Profile'), el('p', '', P.summary));
  const c2 = el('div', 'card'); c2.append(el('h3', '', 'Languages'), el('p', '', P.languages.map(l => `${l[0]} (${l[1]})`).join(' · ')));
  const c3 = el('div', 'card'); c3.append(el('h3', '', 'Working style'), el('p', '', P.softSkills.join(' · ')));
  g.append(c1, c2, c3);
  const edu = $('#edu');
  P.education.forEach(e => { const d = el('div'); d.append(el('h3', '', e.institution)); d.append(el('div', 'mut sm', `${e.program} · ${e.country} · ${e.period}`));
    e.details.forEach(t => d.append(el('p', 'mut', t)));
    if (e.coursework.length) { const t = el('div', 'tags'); e.coursework.forEach(x => t.append(el('span', 'tag', x))); d.append(t); } edu.append(d); });
  const sk = { v: 'All' }, skq = $('#skq'), cats = Object.keys(P.skills);
  const drawSk = () => { const g = $('#skg'); g.textContent = ''; const q = skq.value.trim().toLowerCase(); let n = 0;
    cats.forEach(k => { if (sk.v !== 'All' && sk.v !== k) return; const items = P.skills[k].filter(s => !q || s.toLowerCase().includes(q) || k.toLowerCase().includes(q)); if (!items.length) return; n++;
      const c = el('div', 'card'); c.append(el('h3', '', k)); const t = el('div', 'tags'); items.forEach(s => t.append(el('span', 'tag', s))); c.append(t); g.append(c); });
    $('#skEmpty').hidden = n > 0; };
  pills($('#skf'), cats, sk, drawSk); skq.oninput = drawSk; drawSk();
  $('#pnote').textContent = P.projectsNote;
  const pr = { v: 'All' }, pcs = [...new Set(P.projects.map(p => p.category))];
  const drawPr = () => { const g = $('#pg'); g.textContent = ''; P.projects.forEach((p, i) => { if (pr.v !== 'All' && pr.v !== p.category) return;
    const c = el('article', 'card' + (i < 2 ? ' big' : '')); c.append(el('p', 'eyebrow', p.category), el('h3', '', p.name)); const t = el('div', 'tags'); p.tech.forEach(s => t.append(el('span', 'tag', s))); c.append(t);
    if (P.links.github) { const a = el('a', 'btn sm', 'GitHub'); a.href = P.links.github; a.target = '_blank'; a.rel = 'noopener noreferrer'; const w = el('div', 'tags'); w.append(a); c.append(w); } g.append(c); }); };
  pills($('#pf'), pcs, pr, drawPr); drawPr();
  const cl = $('#clinks'); const m = el('a', 'btn p', P.email); m.href = 'mailto:' + P.email; cl.append(m);
  [['GitHub', P.links.github], ['LinkedIn', P.links.linkedin]].forEach(([n, u]) => { if (u) { const a = el('a', 'btn', n); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer'; cl.append(a); } });
  $$('.reveal').forEach(e => { if (!e.classList.contains('in')) revObs.observe(e); });
}

/* ---------- markdown (escaped first) + tiny highlighter ---------- */
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function hl(code) {
  return esc(code).replace(/(#.*$|\/\/.*$)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(def|class|return|import|from|if|elif|else|for|while|in|not|and|or|const|let|var|function|async|await|new|try|except|catch|void|int|final|print|None|True|False|null|true|false)\b|\b(\d+(?:\.\d+)?)\b/gm,
    (m, c, s, k, n) => c ? `<span class="c">${c}</span>` : s ? `<span class="s">${s}</span>` : k ? `<span class="k">${k}</span>` : `<span class="n">${n}</span>`);
}
function md(src, streaming) {
  const out = []; const parts = src.split(/```/);
  parts.forEach((p, i) => {
    if (i % 2) { const nl = p.indexOf('\n'); const body = nl >= 0 ? p.slice(nl + 1) : p; out.push(`<pre><code>${hl(body.replace(/\n$/, ''))}</code></pre>`); return; }
    const lines = esc(p).split('\n'); let html = '', list = null;
    const inline = t => t.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    const close = () => { if (list) { html += `</${list}>`; list = null; } };
    lines.forEach(l => { let m;
      if ((m = l.match(/^\s*[-*]\s+(.*)/))) { if (list !== 'ul') { close(); html += '<ul>'; list = 'ul'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== 'ol') { close(); html += '<ol>'; list = 'ol'; } html += `<li>${inline(m[1])}</li>`; }
      else if ((m = l.match(/^#{1,4}\s+(.*)/))) { close(); html += `<p><strong>${inline(m[1])}</strong></p>`; }
      else if (l.trim()) { close(); html += `<p>${inline(l)}</p>`; } else close(); });
    close(); out.push(html);
  });
  return out.join('');
}

/* ---------- chat ---------- */
const SUGG = ['What is Ahmed’s academic background?', 'Which of his projects use AI?', 'What is the difference between RAG and fine-tuning?', 'How does Ahmed’s Flutter experience relate to mobile development?', 'Write a Python function for binary search'];
let conv = [], busy = false, ctl = null, convId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
const msgs = $('#msgs'), inp = $('#inp'), sendBtn = $('#send');
const scroll = () => { msgs.scrollTop = msgs.scrollHeight; };
function addMsg(role, text) { const m = el('div', 'm ' + (role === 'user' ? 'u' : 'a')); if (role === 'user') m.textContent = text; else m.innerHTML = md(text); msgs.append(m); scroll(); return m; }
function save() { try { sessionStorage.setItem('chat:' + convId, JSON.stringify(conv.slice(-20))); sessionStorage.setItem('chat:current', convId); } catch {} }
function acts(m, text, last) {
  const a = el('div', 'macts'); const cp = el('button', '', 'Copy'); cp.type = 'button';
  cp.onclick = async () => { try { await navigator.clipboard.writeText(text); cp.textContent = 'Copied'; } catch { cp.textContent = 'Press Ctrl+C'; } setTimeout(() => cp.textContent = 'Copy', 1500); };
  a.append(cp);
  if (last) { const rg = el('button', '', 'Regenerate'); rg.type = 'button'; rg.onclick = () => { if (busy) return; conv.pop(); const u = conv.pop(); msgs.lastChild.remove(); msgs.lastChild.remove(); ask(u.content); }; a.append(rg); }
  m.append(a);
}
function reset() {
  if (ctl) ctl.abort(); conv = []; msgs.textContent = ''; convId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
  { const g = 'Hi! I’m **Ahmed AI**. Ask me about Ahmed’s studies, projects and skills — or any general AI or programming question.'; addMsg('assistant', window.tr ? tr(g) : g); }
  const s = $('#sugg'); s.textContent = ''; SUGG.forEach(t => { const b = el('button', '', t); b.type = 'button'; b.onclick = () => ask(t); s.append(b); });
}
async function ask(text) {
  text = (text || '').trim(); if (!text || busy) return; if (window.trq) text = trq(text);
  $('#sugg').textContent = ''; $$('.macts', msgs).forEach(x => x.remove());
  addMsg('user', text); conv.push({ role: 'user', content: text });
  const out = el('div', 'm a typing'); out.textContent = '…'; msgs.append(out); scroll();
  busy = true; sendBtn.textContent = 'Stop'; ctl = new AbortController(); let full = '', sources = [];
  try {
    const r = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal, body: JSON.stringify({ lang: window.LANG ? LANG() : 'en', conversationId: convId, messages: conv.slice(-10) }) });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.message || 'Request failed (' + r.status + ')'); }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true });
      let i; while ((i = buf.indexOf('\n\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 2); if (!line.startsWith('data:')) continue;
        const ev = JSON.parse(line.slice(5)); if (ev.type === 'meta') sources = ev.sources; else if (ev.type === 'delta') { full += ev.text; out.innerHTML = md(full); scroll(); } else if (ev.type === 'error') throw new Error(ev.message); }
    }
  } catch (e) {
    if (e.name === 'AbortError') { if (!full) out.textContent = 'Generation stopped.'; }
    else { if (!full) { out.textContent = '⚠ ' + e.message; } else out.append(el('span', 'src', '⚠ ' + e.message)); }
  }
  out.classList.remove('typing');
  if (full) { conv.push({ role: 'assistant', content: full }); if (sources.length) out.append(el('span', 'src', 'Based on portfolio sections: ' + sources.join(', '))); acts(out, full, true); }
  else conv.pop(); // failed turn is not kept in history
  busy = false; sendBtn.textContent = 'Send'; ctl = null; save(); scroll();
}
$('#cf').onsubmit = e => { e.preventDefault(); if (busy) { ctl && ctl.abort(); return; } const v = inp.value; if (!v.trim()) { inp.focus(); return; } inp.value = ''; inp.style.height = ''; ask(v); };
inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#cf').requestSubmit(); } };
inp.oninput = () => { inp.style.height = 'auto'; inp.style.height = Math.min(inp.scrollHeight, 120) + 'px'; };
$('#newc').onclick = reset;
function full(on) { $('#chat').classList.toggle('full', on); $('#fs').setAttribute('aria-pressed', on); document.body.style.overflow = on ? 'hidden' : ''; $('#fab').hidden = on; if (on) inp.focus(); }
$('#fs').onclick = () => full(!$('#chat').classList.contains('full'));
function openAI() { if (innerWidth < 720) full(true); else $('#assistant').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => inp.focus({ preventScroll: true }), 350); }
$$('[data-open-ai]').forEach(b => b.onclick = openAI);

/* ---------- command palette ---------- */
const pal = $('#pal'), palq = $('#palq'), pall = $('#pall'); let cmds = [], sel = 0;
function buildCmds() {
  cmds = [['Go to Home', () => location.hash = '#home'], ['Go to About', () => location.hash = '#about'], ['Go to Education', () => location.hash = '#education'], ['Go to Skills', () => location.hash = '#skills'], ['Go to Projects', () => location.hash = '#projects'], ['Open AI assistant', openAI], ['Contact Ahmed', () => location.hash = '#contact'],
    ['Download CV', () => { const a = el('a'); a.href = '/Ahmed_Soltani_CV.pdf'; a.download = ''; a.click(); }]];
  if (P) { P.projects.forEach(p => cmds.push(['Project: ' + p.name, () => location.hash = '#projects'])); if (P.links.github) cmds.push(['Open GitHub', () => open(P.links.github, '_blank', 'noopener')]); if (P.links.linkedin) cmds.push(['Open LinkedIn', () => open(P.links.linkedin, '_blank', 'noopener')]); }
}
function drawPal() { const q = palq.value.toLowerCase(); const list = cmds.filter(c => c[0].toLowerCase().includes(q)); sel = Math.min(sel, Math.max(0, list.length - 1)); pall.textContent = '';
  list.forEach((c, i) => { const li = el('li', '', c[0]); li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === sel); li.onclick = () => run(c); pall.append(li); }); pall._l = list; if (!list.length) pall.append(el('li', 'mut', 'No results')); }
function run(c) { pal.close(); c[1](); }
function openPal() { buildCmds(); palq.value = ''; sel = 0; drawPal(); pal.showModal(); palq.focus(); }
$('#kbtn').onclick = openPal;
addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.open ? pal.close() : openPal(); } else if (e.key === 'Escape' && $('#chat').classList.contains('full')) full(false); });
palq.oninput = () => { sel = 0; drawPal(); };
palq.onkeydown = e => { const l = pall._l || []; if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, l.length - 1); drawPal(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); drawPal(); } else if (e.key === 'Enter' && l[sel]) run(l[sel]); };
pal.addEventListener('click', e => { if (e.target === pal) pal.close(); });

/* ---------- contact form ---------- */
const formOpened = Date.now(), cform = $('#cform'), st = $('#cstatus');
cform.onsubmit = async e => {
  e.preventDefault(); $$('.err', cform).forEach(x => x.textContent = ''); st.className = 'status'; st.textContent = '';
  const d = Object.fromEntries(new FormData(cform)); const er = {};
  if ((d.name || '').trim().length < 2) er.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) er.email = 'Please enter a valid email.';
  if ((d.subject || '').trim().length < 3) er.subject = 'Please enter a subject.';
  if ((d.message || '').trim().length < 10) er.message = 'Message must be at least 10 characters.';
  if (Object.keys(er).length) { Object.entries(er).forEach(([k, v]) => $(`[data-e=${k}]`).textContent = v); return; }
  $('#csend').disabled = true; st.textContent = 'Sending…';
  try {
    const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, t: Date.now() - formOpened }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { st.className = 'status ok'; st.textContent = j.delivered === 'email' ? 'Thanks! Your message was sent to Ahmed.' : 'Thanks! Your message was received and saved — Ahmed will read it.'; cform.reset(); }
    else if (j.errors) Object.entries(j.errors).forEach(([k, v]) => { const t = $(`[data-e=${k}]`); if (t) t.textContent = v; });
    else { st.className = 'status bad'; st.textContent = j.message || 'Something went wrong.'; }
  } catch { st.className = 'status bad'; st.textContent = 'Network error. Please try again or email directly.'; }
  $('#csend').disabled = false;
};

/* ---------- boot ---------- */
reset();
(async () => {
  try { const [p, h] = await Promise.all([fetch('/api/profile').then(r => r.json()), fetch('/api/health').then(r => r.json())]); P = p; health = h; render(); document.dispatchEvent(new CustomEvent('profile', { detail: P })); }
  catch { $('#aiBanner').hidden = false; $('#aiBanner').textContent = 'Could not reach the backend. Start it with “python app.py”.'; return; }
  const b = $('#aiState'); b.textContent = health.ai ? 'online · ' + health.model : 'offline mode'; b.classList.toggle('on', health.ai);
  if (!health.ai) { const bn = $('#aiBanner'); bn.hidden = false; bn.textContent = 'Offline mode: answers come only from Ahmed’s CV. Run a local Ollama model or set LLM_API_KEY (see README) to unlock general AI and programming answers.'; }
})();
