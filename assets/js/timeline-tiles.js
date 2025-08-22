/* assets/js/timeline-tiles.js
   Tiles Timeline mit optionalen Bildern + Firestore-Fallback
*/
(() => {
  'use strict';

  const DEBUG = true;
  const KEY   = 'cael.timeline.custom'; // Fallback: localStorage key

  // --- kleine Helfer ---
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (s='') => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const escAttr = esc;

  const fmt = (d) => {
    if (!d) return '';
    const t = `${d}T00:00:00`;
    const dt = new Date(t);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('de-DE');
  };

  function readLocalCustom(){
    try{
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    }catch(e){
      DEBUG && console.warn('[timeline] localStorage parse failed:', e);
      return [];
    }
  }

  // Chip-Farben je Typ
  function chipColor(t){
    const map = {
      Milestone:'#6b7280', Debut:'#22d3ee', Single:'#60a5fa',
      Mini:'#f472b6', Album:'#a78bfa', MV:'#34d399',
      Event:'#f59e0b', Other:'#94a3b8'
    };
    return map[t] || '#94a3b8';
  }

  // --- Firestore lesen (falls verfügbar), sonst localStorage ---
  async function fetchCustomEvents(){
    if (window.db && window.__fs && window.__fs.collection && window.__fs.getDocs) {
      const { collection, getDocs } = window.__fs;
      try{
        const snap = await getDocs(collection(window.db, 'events'));
        const arr  = snap.docs.map(d => ({ id:d.id, ...d.data() }));
        // sort: erst Datum (asc), dann ts (asc)
        arr.sort((a,b) => (a.date||'').localeCompare(b.date||'') || (a.ts||0)-(b.ts||0));
        DEBUG && console.log('[timeline] Firestore events:', arr.length);
        return arr;
      }catch(err){
        console.error('[timeline] Firestore read failed, fallback to localStorage:', err);
        return readLocalCustom();
      }
    }
    // Fallback: localStorage
    DEBUG && console.log('[timeline] Firestore not present, using localStorage');
    return readLocalCustom();
  }

  async function allEvents(){
    const base = Array.isArray(window.CAEL_TL_BASE) ? window.CAEL_TL_BASE : [];
    const custom = await fetchCustomEvents();
    const merged = base.concat(custom)
      .filter(e => e && e.date && e.title) // einfache Hygiene
      .sort((a,b) => a.date.localeCompare(b.date)); // ASC
    DEBUG && console.log('[timeline] total merged events:', merged.length);
    return merged;
  }

  // --- Render ---
  async function render(){
    const grid  = $('#tileGrid');
    const count = $('#evCount');
    if (!grid) return;

    const q    = ($('#search')?.value || '').toLowerCase().trim();
    const type = $('.tabs .tab.active')?.dataset.type || 'all';

    const events = await allEvents();
    const filtered = events.filter(e => {
      const hitType = (type === 'all') || (e.type === type);
      const blob = [e.title, e.type, e.note, e.date].filter(Boolean).join(' ').toLowerCase();
      const hitText = !q || blob.includes(q);
      return hitType && hitText;
    }).reverse(); // neueste zuerst

    if (count) count.textContent = filtered.length;
    grid.innerHTML = '';

    if (!filtered.length) {
      grid.innerHTML = '<p class="meta">Keine Events gefunden.</p>';
      return;
    }

    for (const e of filtered) {
      const art = document.createElement('article');
      art.className = 'tile card';
      art.tabIndex = 0;

      const imgHTML = e.img
        ? `<img class="tile-img" src="${escAttr(e.img)}" alt="${escAttr(e.title)}">`
        : '';

      art.innerHTML = `
        <div class="tile-head">
          <span class="chip" style="--chip:${chipColor(e.type)}">${esc(e.type || 'Event')}</span>
          <span class="date">${esc(fmt(e.date))}</span>
        </div>
        <h3 class="tile-title">${esc(e.title)}</h3>
        ${imgHTML}
        ${e.note ? `<p class="tile-note">${esc(e.note)}</p>` : ''}
      `;

      art.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); art.click(); }
      });
      art.addEventListener('click', () => openDialog(e));
      grid.appendChild(art);
    }
  }

  function openDialog(e){
    const dlg = $('#dlg');
    if (!dlg) return;

    const dlgTitle = dlg.querySelector('.dlg-title');
    const dlgMeta  = dlg.querySelector('.dlg-meta');
    const dlgNote  = dlg.querySelector('.dlg-note');
    const dlgImg   = dlg.querySelector('.dlg-img');

    if (dlgTitle) dlgTitle.textContent = e.title || '';
    if (dlgMeta)  dlgMeta.textContent  = `${fmt(e.date)} • ${e.type || 'Event'}`;
    if (dlgNote)  dlgNote.textContent  = e.note || '';

    if (dlgImg) {
      if (e.img) {
        dlgImg.src = e.img;
        dlgImg.alt = e.title || '';
        dlgImg.style.display = 'block';
      } else {
        dlgImg.removeAttribute('src');
        dlgImg.style.display = 'none';
      }
    }
    dlg.showModal();
  }

  function bind(){
    // Tabs (Typ-Filter)
    $$('.tabs .tab').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tabs .tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });

    // Suche
    $('#search')?.addEventListener('input', render);

    // Dialog schließen
    $('#dlgClose')?.addEventListener('click', () => $('#dlg')?.close());
  }

  window.addEventListener('DOMContentLoaded', () => {
    bind();
    render();
  });
})();
