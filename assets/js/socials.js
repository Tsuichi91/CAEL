/* assets/js/socials.js
   Social-Feed aus Firestore (Fallback: lokale Daten) */

(() => {
  'use strict';

  const feed = document.getElementById('feed');
  const TAB2PLATFORM = { insta: 'instagram', fb: 'facebook', x: 'x', tiktok: 'tiktok' };

  // HTML-escape helpers
  const MAP = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => MAP[m]);
  const escAttr = esc;

  // Öffentliche Tab-Funktion (von socials.html aufgerufen)
  window.setTab = async function setTab(id) {
    document.querySelectorAll('.tabs .tab').forEach(b => {
      b.classList.toggle('active', b.dataset.id === id);
    });
    const platform = TAB2PLATFORM[id] || 'instagram';
    feed.dataset.platform = id;
    feed.innerHTML = '<div class="meta">Lade Posts …</div>';

    try {
      const items = await loadPosts(platform);
      render(items);
    } catch (err) {
      console.error('[socials] loadPosts error:', err);
      render([]);
    }
  };

  // Firestore → Posts laden; Fallback: lokale Datenstruktur window.SOCIALS?.[platform]
  async function loadPosts(platform) {
    // Firestore verfügbar?
    if (window.db && window.__fs) {
      const { collection, getDocs, query, where } = window.__fs;
      const q = query(collection(window.db, 'posts'), where('platform', '==', platform));
      const snap = await getDocs(q);
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // neueste zuerst
      arr.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      return arr;
    }
    // Fallback (optional)
    if (window.SOCIALS && Array.isArray(window.SOCIALS[platform])) {
      return window.SOCIALS[platform];
    }
    return [];
  }

  // Posts rendern
  function render(items) {
    if (!items.length) {
      feed.innerHTML =
        '<div class="meta">Noch keine Beiträge — nutze die Froms, um Posts zu erstellen.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    for (const p of items) {
      const el = document.createElement('article');
      el.className = 'card social';
      el.innerHTML = `
        <div class="social-top">
          <img class="avatar" src="${escAttr(p.avatar || 'assets/avatar.png')}" alt="">
          <div class="user">${esc(p.user || '@user')}</div>
        </div>
        ${p.img ? `<img class="media" src="${escAttr(p.img)}" alt="">` : ''}
        <p class="text">${esc(p.text || '')}</p>
      `;
      frag.appendChild(el);
    }
    feed.innerHTML = '';
    feed.appendChild(frag);
  }

  // Optional: beim direkten Aufruf ohne onclick() einen Default setzen
  if (!feed.dataset.platform) {
    window.setTab('insta');
  }
})();
