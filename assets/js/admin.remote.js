/* Admin UI with Firestore storage */
(function (global) {
  'use strict';

  // ---- FS bindings from admin.html ----
  const FS = global.__fs || {};
  const {
    db, doc, getDoc, setDoc, deleteDoc,
    collection, getDocs, query, where, serverTimestamp
  } = FS;

  if (!db || !collection) {
    console.error('[admin] Firestore nicht initialisiert – prüfe admin.html __fs-Zuweisung.');
    return;
  }

  // ---- tiny DOM helpers ----
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const sanitize = s => (s||'').replace(/[<>&]/g, m=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m]));

  // Dedup event listeners helper
  function bind(id, ev, fn){
    const el = (typeof id === 'string') ? $('#'+id) : id;
    if(!el) return;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener(ev, fn);
    return clone;
  }

  const toast = (msg, ok=true)=>{
    let t = $('#__toast');
    if(!t){
      t = document.createElement('div');
      t.id='__toast';
      t.style.cssText='position:fixed;right:12px;bottom:12px;padding:.6rem .9rem;border-radius:12px;background:'+(ok?'#1f3d2b':'#4b1b1b')+';color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.35);z-index:9999;transition:opacity .25s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity='1';
    setTimeout(()=>t.style.opacity='0', 2200);
  };

  // ---- Tabs ----
  function initTabs(){
    const tabs = $$('#tabs .tab');
    const views= $$('#tabviews > section');
    function show(id){
      tabs.forEach(b=>b.classList.toggle('active', b.dataset.id===id));
      views.forEach(v=>v.hidden = v.id !== id);
    }
    tabs.forEach(b=> b.addEventListener('click', ()=> show(b.dataset.id)));
    tabs[0]?.click();
  }

  // ---- Social posts ----
  const TAB2PLATFORM = {
    'tab-insta' : 'instagram',
    'tab-fb'    : 'facebook',
    'tab-x'     : 'x',
    'tab-tiktok': 'tiktok'
  };

  function readPostForm(){
    return {
      id: $('#f-id').value || uid(),
      user: $('#f-user').value.trim(),
      avatar: $('#f-avatar').value.trim(),
      img: $('#f-img').value.trim(),
      text: $('#f-text').value.trim()
    };
  }
  function fillPostForm(p){
    $('#f-id').value     = p?.id || '';
    $('#f-user').value   = p?.user || '';
    $('#f-avatar').value = p?.avatar || '';
    $('#f-img').value    = p?.img || '';
    $('#f-text').value   = p?.text || '';
  }

  async function fetchPosts(platform){
    const postsRef = collection(db, 'posts');
    // Nur where – sortieren im Client -> keine Index-Anforderung
    const snap = await getDocs(query(postsRef, where('platform','==', platform)));
    const arr = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
    // sort by server ts (number) desc, fallback to client ts
    arr.sort((a,b)=> (b.ts||0) - (a.ts||0));
    return arr;
  }

  function renderPosts(listId, items, platform){
    const box = $('#'+listId);
    box.innerHTML = '';
    if(!items.length){
      box.innerHTML = '<div class="meta">Noch keine Beiträge.</div>';
      return;
    }
    for(const p of items){
      const row = document.createElement('div');
      row.className='admin-row';
      row.innerHTML = `
        <div class="row-main">
          <img class="thumb" src="${sanitize(p.img || p.avatar || 'assets/avatar.png')}" alt="">
          <div>
            <div class="row-title">${sanitize(p.user || '@user')} <small class="meta">#${sanitize((p.id||'').slice(-6))}</small></div>
            <div class="row-text">${sanitize(p.text)}</div>
          </div>
        </div>
        <div>
          <button class="btn btn-sm" data-edit="${p.id}">Bearbeiten</button>
          <button class="btn btn-sm danger" data-del="${p.id}">Löschen</button>
        </div>
      `;
      box.appendChild(row);
    }

    // actions
    box.querySelectorAll('[data-edit]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const pick = items.find(x=>x.id===b.dataset.edit);
        fillPostForm(pick);
        toast('Beitrag geladen');
      });
    });
    box.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        await deleteDoc(doc(db,'posts', b.dataset.del));
        toast('Beitrag gelöscht');
        const again = await fetchPosts(platform);
        renderPosts(listId, again, platform);
      });
    });
  }

  function bindSocialTab(tabId, listId){
    const platform = TAB2PLATFORM[tabId];
    const tabBtn   = $(`#tabs .tab[data-id="${tabId}"]`);
    if(!platform || !tabBtn) return;

    tabBtn.addEventListener('click', async ()=>{
      $('#f-platform').textContent = ({
        instagram:'Instagram', facebook:'Facebook', x:'X', tiktok:'TikTok'
      })[platform];
      fillPostForm(null);

      const items = await fetchPosts(platform);
      renderPosts(listId, items, platform);

      // save
      bind('f-save','click', async ()=>{
        const p = readPostForm();
        const data = {
          user:p.user, avatar:p.avatar, img:p.img, text:p.text,
          platform, ts: Date.now(), updatedAt: serverTimestamp()
        };
        await setDoc(doc(db,'posts', p.id), data, { merge:true });
        toast('Gespeichert');
        fillPostForm(null);
        const again = await fetchPosts(platform);
        renderPosts(listId, again, platform);
      });

      // export
      bind('f-export','click', async ()=>{
        const arr = await fetchPosts(platform);
        const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `posts_${platform}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });

      // import
      const fi = bind('f-import','change', async e=>{
        const f = e.target.files[0]; if(!f) return;
        try{
          const arr = JSON.parse(await f.text());
          if(!Array.isArray(arr)) throw new Error('Ungültiges JSON');
          for(const p of arr){
            const id = p.id || uid();
            await setDoc(doc(db,'posts', id), {
              user:p.user||'', avatar:p.avatar||'', img:p.img||'',
              text:p.text||'', platform, ts:p.ts||Date.now(), updatedAt: serverTimestamp()
            }, { merge:true });
          }
          toast('Import OK');
          const again = await fetchPosts(platform);
          renderPosts(listId, again, platform);
        }catch(err){
          console.error(err); toast('Import fehlgeschlagen', false);
        }finally{ e.target.value=''; }
      });
    });
  }

  // ---- Timeline Events ----
  function readEventForm(){
    return {
      id: $('#e-id').value || uid(),
      date: $('#e-date').value,
      title: $('#e-title').value.trim(),
      type: $('#e-type').value,
      img: $('#e-img').value.trim(),
      note: $('#e-note').value.trim()
    };
  }
  function fillEventForm(e){
    $('#e-id').value    = e?.id || '';
    $('#e-date').value  = e?.date || '';
    $('#e-title').value = e?.title || '';
    $('#e-type').value  = e?.type || 'Milestone';
    $('#e-img').value   = e?.img || '';
    $('#e-note').value  = e?.note || '';
  }

  async function fetchEvents(){
    const snap = await getDocs(collection(db,'events'));
    const arr = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
    arr.sort((a,b)=> (b.date||'').localeCompare(a.date||'') || (b.ts||0)-(a.ts||0));
    return arr;
  }

  function renderEvents(items){
    const box = $('#list-events'); box.innerHTML='';
    if(!items.length){ box.innerHTML='<div class="meta">Noch keine Custom-Events.</div>'; return; }
    for(const e of items){
      const row = document.createElement('div');
      row.className='admin-row';
      row.innerHTML = `
        <div class="row-main">
          <img class="thumb" src="${sanitize(e.img || 'assets/photos/cael.png')}" alt="">
          <div>
            <div class="row-title">${sanitize(e.title)} <small class="meta">${sanitize(e.date||'')} • ${sanitize(e.type||'')}</small></div>
            <div class="row-text">${sanitize(e.note||'')}</div>
          </div>
        </div>
        <div>
          <button class="btn btn-sm" data-edit="${e.id}">Bearbeiten</button>
          <button class="btn btn-sm danger" data-del="${e.id}">Löschen</button>
        </div>
      `;
      box.appendChild(row);
    }
    box.querySelectorAll('[data-edit]').forEach(b=>{
      b.addEventListener('click', ()=>{
        const pick = items.find(x=>x.id===b.dataset.edit);
        fillEventForm(pick); toast('Event geladen');
      });
    });
    box.querySelectorAll('[data-del]').forEach(b=>{
      b.addEventListener('click', async ()=>{
        await deleteDoc(doc(db,'events', b.dataset.del));
        toast('Event gelöscht');
        renderEvents(await fetchEvents());
      });
    });
  }

  function bindEvents(){
    // Render beim Tab-Öffnen
    $('#tabs .tab[data-id="tab-events"]')?.addEventListener('click', async ()=>{
      fillEventForm(null);
      renderEvents(await fetchEvents());
    });

    // Save
    bind('e-save','click', async ()=>{
      const e = readEventForm();
      await setDoc(doc(db,'events', e.id), {
        date:e.date, title:e.title, type:e.type, img:e.img, note:e.note,
        ts: Date.now(), updatedAt: serverTimestamp()
      }, { merge:true });
      toast('Event gespeichert');
      fillEventForm(null);
      renderEvents(await fetchEvents());
    });

    // Export
    bind('e-export','click', async ()=>{
      const arr = await fetchEvents();
      const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'timeline_custom_events.json';
      a.click(); URL.revokeObjectURL(a.href);
    });

    // Import
    bind('e-import','change', async e=>{
      const f = e.target.files[0]; if(!f) return;
      try{
        const arr = JSON.parse(await f.text());
        if(!Array.isArray(arr)) throw new Error('Ungültiges JSON');
        for(const it of arr){
          const id = it.id || uid();
          await setDoc(doc(db,'events', id), {
            date: it.date || '', title: it.title||'', type: it.type||'Milestone',
            img: it.img||'', note: it.note||'', ts: it.ts||Date.now(), updatedAt: serverTimestamp()
          }, { merge:true });
        }
        toast('Import OK');
        renderEvents(await fetchEvents());
      }catch(err){
        console.error(err); toast('Import fehlgeschlagen', false);
      }finally{ e.target.value=''; }
    });

    // Clear (alle löschen)
    bind('e-clear','click', async ()=>{
      if(!confirm('Alle Custom-Events wirklich löschen?')) return;
      const snap = await getDocs(collection(db,'events'));
      for (const d of snap.docs){ await deleteDoc(doc(db,'events', d.id)); }
      toast('Alle Custom-Events gelöscht');
      renderEvents(await fetchEvents());
    });
  }

  // ---- Init ----
  function init(){
    initTabs();
    bindSocialTab('tab-insta',  'list-insta');
    bindSocialTab('tab-fb',     'list-fb');
    bindSocialTab('tab-x',      'list-x');
    bindSocialTab('tab-tiktok', 'list-tiktok');
    bindEvents();
    console.log('[admin] Firestore-Admin init');
  }

  // autorun
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else { init(); }

})(window);
