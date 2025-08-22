/* assets/js/tours.js
   Showcases & Tours overview (reads a JSON file, provides search & filters) */

(function () {
  'use strict';

  // Path to your JSON file
  const DATA_URL = 'assets/data/cael_tours_2019_2025.json';

  const elGrid = document.getElementById('grid');
  const elCnt  = document.getElementById('cnt');
  const elQ    = document.getElementById('q');
  const elType = document.getElementById('type');
  const elYear = document.getElementById('year');

  let ALL = [];   // all events
  let YEARS = []; // unique years for the filter

  // --- Helpers ------------------------------------------------------------

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'2-digit' });
  };

  const deriveType = (name='') => {
    const n = name.toLowerCase();
    if (n.includes('showcase')) return 'Showcase';
    if (n.includes('world'))    return 'World Tour';
    if (n.includes('asia'))     return 'Asia Tour';
    return 'Tour';
  };

  const esc = (s='') => String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // --- Render -------------------------------------------------------------

  function render(list){
    elGrid.innerHTML = '';
    elCnt.textContent = list.length;

    if (!list.length) {
      elGrid.innerHTML = '<div class="meta">No entries match your filter.</div>';
      return;
    }

    const frag = document.createDocumentFragment();

    for (const ev of list) {
      const chips = `
        <div class="chips">
          <span class="chip">${esc(ev.type)}</span>
          <span class="chip">${esc(ev.year)}</span>
          <span class="chip">${ev.count} stops</span>
        </div>
      `;

      // Stops
      const stops = (ev.stops||[]).map(s => `
        <li class="stop">
          <span class="no">${String(s.stop_no ?? '?').padStart(2,'0')}</span>
          <span class="when">${esc(fmtDate(s.date))}</span>
          <span class="city">${esc(s.city || '')}</span>
          <span class="venue">• ${esc(s.venue || '')}</span>
        </li>
      `).join('');

      const details = `
        <details class="stops">
          <summary>Show stops</summary>
          <ul class="stop-list">${stops}</ul>
        </details>
      `;

      const card = document.createElement('article');
      card.className = 'tour-card card';
      card.innerHTML = `
        <div class="tour-head">
          <div class="kv">${esc(fmtDate(ev.window?.start))} – ${esc(fmtDate(ev.window?.end))}</div>
          ${chips}
        </div>
        <h3 class="tour-title">${esc(ev.name)}</h3>
        ${details}
        ${ev.notes ? `<p class="meta" style="margin-top:.4rem">${esc(ev.notes)}</p>` : ''}
      `;
      frag.appendChild(card);
    }

    elGrid.appendChild(frag);
  }

  // --- Filter / Search ----------------------------------------------------

  function applyFilters(){
    const q = (elQ.value || '').toLowerCase().trim();
    const t = elType.value;
    const y = elYear.value;

    const out = ALL.filter(ev => {
      const typeOk = (t === 'all') || (ev.type === t);
      const yearOk = (y === 'all') || (String(ev.year) === y);
      const text   =
        `${ev.name} ${ev.notes||''} ${ev.stops?.map(s => `${s.city} ${s.venue}`).join(' ')}`.toLowerCase();
      const qOk    = !q || text.includes(q);
      return typeOk && yearOk && qOk;
    });

    render(out);
  }

  function fillYearFilter(){
    YEARS.sort((a,b)=> a-b);
    elYear.innerHTML = `<option value="all">All years</option>` +
      YEARS.map(y=> `<option value="${y}">${y}</option>`).join('');
  }

  // --- Load JSON ----------------------------------------------------------

  async function loadData(){
    try{
      const res = await fetch(DATA_URL, { cache:'no-store' });
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      // Object -> Array
      ALL = Object.entries(raw).map(([id, ev]) => ({
        id,
        name: ev.name,
        window: ev.window,
        count: ev.count ?? (ev.stops?.length || 0),
        stops: ev.stops || [],
        notes: ev.notes || '',
        year: Number((ev.window?.start || '').slice(0,4)),
        type: deriveType(ev.name)
      }));

      YEARS = Array.from(new Set(ALL.map(e => e.year).filter(Boolean)));
      fillYearFilter();
      applyFilters();

    }catch(err){
      console.error('[tours] Failed to load data:', err);
      elGrid.innerHTML = '<div class="meta">Could not load tour data.</div>';
    }
  }

  // --- Init ---------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', () => {
    elQ.addEventListener('input', applyFilters);
    elType.addEventListener('change', applyFilters);
    elYear.addEventListener('change', applyFilters);

    loadData();
  });

})();
