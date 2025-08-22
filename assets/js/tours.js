/* assets/js/tours.js
   Showcases & Tours overview with search/filters + optional interactive map (Leaflet).
   To show stops on the map, add lat/lon to each stop in your JSON:
   {
     "stops": [
       { "stop_no": 1, "date": "2024-05-10", "city": "Seoul", "venue": "KSPO Dome", "lat": 37.519, "lon": 127.073 }
     ]
   }
*/

(function () {
  'use strict';

  const DATA_URL = 'assets/data/cael_tours_2019_2025.json';

  const elGrid = document.getElementById('grid');
  const elCnt  = document.getElementById('cnt');
  const elQ    = document.getElementById('q');
  const elType = document.getElementById('type');
  const elYear = document.getElementById('year');
  const elMode = document.getElementById('viewMode');
  const mapWrap= document.getElementById('mapWrap');

  let ALL = [];
  let YEARS = [];

  // Leaflet map refs
  let map = null;
  let markersLayer = null;

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

  // create a stable DOM id for each stop (for linking from popup)
  const stopDomId = (evId, stopNo) => `ev-${evId}-stop-${String(stopNo ?? 'x')}`;

  // --- Render list --------------------------------------------------------

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

      const stops = (ev.stops||[]).map(s => `
        <li id="${stopDomId(ev.id, s.stop_no)}" class="stop">
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
      card.dataset.evid = ev.id;
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

  // --- Map logic ----------------------------------------------------------

  function ensureMap() {
    if (typeof L === 'undefined') return null; // Leaflet not loaded
    if (map) return map;

    map = L.map('tourMap', { zoomControl: true, worldCopyJump: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
    return map;
  }

  function updateMap(list, mode) {
    const hasLeaflet = typeof L !== 'undefined';
    const showMap = mode !== 'list';

    mapWrap.hidden = !showMap;
    if (!showMap || !hasLeaflet) return;

    const m = ensureMap();
    if (!m) return;

    // limit panning for South Korea mode
    if (mode === 'kr') {
      const boundsKR = L.latLngBounds(
        L.latLng(33.0, 124.5),
        L.latLng(38.7, 131.0)
      );
      m.setMaxBounds(boundsKR.pad(0.05));
      // start centered on Korea if no markers to fit
      m.setView([36.5, 127.9], 6);
    } else {
      // world mode: remove bounds
      m.setMaxBounds(null);
      m.setView([20, 0], 2);
    }

    markersLayer.clearLayers();
    const pts = [];

    list.forEach(ev => {
      (ev.stops || []).forEach(s => {
        const lat = Number(s.lat);
        const lon = Number(s.lon);
        if (!isFinite(lat) || !isFinite(lon)) return;

        // In KR mode, keep only stops roughly inside Korea
        if (mode === 'kr') {
          if (lat < 33 || lat > 39 || lon < 124.5 || lon > 131.5) return;
        }

        const popupHtml = `
          <div style="min-width:180px">
            <div style="font-weight:600">${esc(ev.name)}</div>
            <div class="meta">${esc(fmtDate(s.date))}</div>
            <div>${esc(s.city||'')}${s.venue ? ' • '+esc(s.venue) : ''}</div>
            <button data-jump="${esc(stopDomId(ev.id, s.stop_no))}" class="btn btn-sm" style="margin-top:.35rem">Show in list</button>
          </div>
        `;

        const marker = L.marker([lat, lon]).bindPopup(popupHtml);
        marker.on('popupopen', () => {
          const btn = document.querySelector('button[data-jump]');
          if (btn) {
            btn.addEventListener('click', () => {
              const id = btn.getAttribute('data-jump');
              const target = document.getElementById(id);
              if (target) {
                // open the details of its card
                const details = target.closest('details.stops');
                if (details) details.open = true;

                // highlight briefly and scroll into view
                target.classList.add('highlight');
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(()=> target.classList.remove('highlight'), 1200);
              }
            }, { once:true });
          }
        });

        marker.addTo(markersLayer);
        pts.push([lat, lon]);
      });
    });

    // Fit to markers if we have any
    if (pts.length) {
      const bounds = L.latLngBounds(pts);
      m.fitBounds(bounds.pad(0.15));
    }

    // Fix sizing after container is shown
    setTimeout(() => m.invalidateSize(), 50);
  }

  // --- Filter / Search ----------------------------------------------------

  function applyFilters(){
    const q = (elQ.value || '').toLowerCase().trim();
    const t = elType.value;
    const y = elYear.value;
    const mode = elMode.value;

    const out = ALL.filter(ev => {
      const typeOk = (t === 'all') || (ev.type === t);
      const yearOk = (y === 'all') || (String(ev.year) === y);
      const text   =
        `${ev.name} ${ev.notes||''} ${ev.stops?.map(s => `${s.city} ${s.venue}`).join(' ')}`.toLowerCase();
      const qOk    = !q || text.includes(q);
      return typeOk && yearOk && qOk;
    });

    render(out);
    updateMap(out, mode);
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
    elMode.addEventListener('change', applyFilters);

    loadData();
  });

})();
