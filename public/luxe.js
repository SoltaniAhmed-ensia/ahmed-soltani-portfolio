'use strict';
/* luxe layer: achievements section + case-study details in the project dialog (all data from /api/profile) */
(() => {
  document.addEventListener('profile', ev => {
    const P = ev.detail, box = $('#ach'); if (!box) return;
    (P.achievements || []).forEach(a => { const c = el('article', 'card'); c.append(el('b', '', a.type + ' · ' + a.year), el('h3', '', a.title), el('small', '', a.detail)); box.append(c); });
    if (!P.achievements || !P.achievements.length) $('#achievements').hidden = true;
  });
  const dlg = $('dialog.pm'); if (!dlg) return;
  new MutationObserver(() => {
    if (!dlg.open || dlg.dataset.cs === '1') return; const t = $('h3', dlg); const p = P && P.projects.find(q => q.name === (t && t.textContent)); if (!p || !p.summary) return;
    dlg.dataset.cs = '1'; const cs = el('div', 'cs'), blk = (h, v) => { const d = el('div'); d.append(el('h4', '', h)); if (Array.isArray(v)) { const u = el('ul'); v.forEach(x => u.append(el('li', '', x))); d.append(u); } else d.append(el('p', '', v)); cs.append(d); };
    blk('Overview', p.summary); if (p.problem) blk('Problem', p.problem); if (p.objective) blk('Objective', p.objective); if (p.architecture) blk('Architecture', p.architecture); if (p.features) blk('Key features', p.features);
    const inner = $('.in', dlg); const note = $('p.mut', inner); if (note) note.remove(); inner.insertBefore(cs, $('.row2', inner));
  }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
  new MutationObserver(() => { if (!dlg.open) delete dlg.dataset.cs; }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
})();
