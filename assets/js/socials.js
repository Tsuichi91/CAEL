/* assets/js/socials.js
   Social-Feed aus Firestore (Fallback: lokale Daten) */
(() => {
  'use strict';

  const feed = document.getElementById('feed');

  // Akzeptiere sowohl "insta"/"fb" als auch die finalen Namen
  const ALIAS = {
    insta: 'instagram',
    ig: 'instagram',
    instagram: 'instagram',
    fb: 'facebook',
    facebook: 'facebook',
    x: 'x',
    tiktok: 'tiktok'
  };

  // HTML escape
  const ENT = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' };
  const esc = (s='') => String(s).replace(/[&<>"']/g, m => ENT[m]);

  /** Öffentliche Tab-Funktion – wird von socials.html aufgerufen */
  window.setTab = async function setTab(id) {
    const platform = ALIAS[id] || 'instagram';

    // Tabs visuell umschalten
    document.querySelectorAll('.tabs .tab').forEach(b => {
      b.classList.toggle('active', b.dataset.id === platform);
    });

    // Feed-Status
    if (feed) {
      feed.dataset.platform = platform;
      feed.innerHTML = '<div class="meta">Lade Posts …</div>';
    }

    try {
      const items = await loadPosts(platform);
      render(items);
    } catch (err) {
      console.error('[socials] loadPosts error:', err);
      render([]);
    }
  };

  /** Posts aus Firestore laden – Fallback: window.SOCIALS[platform] */
  async function loadPosts(platform) {
    // Firestore vorhanden? (über socials.html gesetzt)
    if (window.db && window.__fs) {
      const { collection, getDocs, query, where } = window.__fs;
      try {
        const q = query(collection(window.db, 'posts'), where('platform', '==', platform));
        const snap = await getDocs(q);
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // neueste zuerst
        arr.sort((a, b) => (b.ts || 0) - (a.ts || 0));
        console.log(`[socials] ${platform}: ${arr.length} Post(s) geladen`);
        return arr;
      } catch (e) {
        console.warn('[socials] Firestore-Query fehlgeschlagen, nutze Fallback:', e);
      }
    }

    // Fallback: lokale Datenstruktur (optional)
    if (window.SOCIALS && Array.isArray(window.SOCIALS[platform])) {
      return window.SOCIALS[platform];
    }

    return [];
  }

  /** Feed rendern (nutzt die Klassen aus styles.css: .post, .post-img, .post-header/.avatar, .post-body, .post-text) */
  function render(items) {
    if (!feed) return;

    if (!items.length) {
      feed.innerHTML =
        '<div class="meta">Noch keine Beiträge — nutze die Admin-Seite (admin.html), um Posts zu erstellen.</div>';
      return;
    }

    const html = items.map(p => {
      const avatar = esc(p.avatar || 'assets/avatar.png');
      const media  = esc(p.img || avatar);  // wenn kein Bild, Avatar groß anzeigen
      const user   = esc(p.user || '@user');
      const text   = esc(p.text || '');

      return `
        <article class="post">
          <img class="post-img" src="${media}" alt="">
          <div class="post-body">
            <div class="post-header">
              <img class="avatar" src="${avatar}" alt="">
              <div class="user">${user}</div>
            </div>
            <div class="post-text">${text}</div>
          </div>
        </article>
      `;
    }).join('');

    feed.innerHTML = html;
  }

  // Auto-Init: aktuelles Tab aus data-Attribut lesen, sonst Instagram
  document.addEventListener('DOMContentLoaded', () => {
    const current = feed?.dataset.platform || 'instagram';
    window.setTab(current);
  });
})();
