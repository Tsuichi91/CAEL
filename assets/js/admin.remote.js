/* Admin UI with Firestore storage — data-js scoped */
(function (global) {
  'use strict';

  // ---- Firestore bindings injected by admin.html ----
  const FS = global.__fs || {};
  const {
    db, doc, getDoc, setDoc, deleteDoc,
    collection, getDocs, query, where, serverTimestamp
  } = FS;

  if (!db || !collection) {
    console.error('[admin] Firestore nicht initialisiert – prüfe admin.html __fs-Zuweisung.');
    return;
  }

  // ---- tiny helpers ----
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
  const sanitize = s => (s||'').replace(/[<>&]/g, m=>({ '<':'&lt;','>':'&gt;','&':'&amp;' }[m]));

  // Select per data-js inside a given root
  const q = (root, key) => root.querySelector(`[data-js="${key}"]`);

  // Dedupe event listeners
  function bindElement(el, ev, fn){
    if(!el) return el;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    clone.addEventListener(ev, fn);
    return clone;
  }

  // ---- Tabs ----
  function initTabs(){
    const tabs = $$('#tabs .tab');
    const views= $$('#tabviews > section');
    function show(id){
      tabs.forEach(b=>b.classList.toggle('active', b.dataset.id===id));
      views.forEach(v=> v.hidden = v.id !== id);
    }
    tabs.forEach(b=> b.addEventListener('click', ()=> show(b.dataset.id)));
    tabs[0]?.click();
  }

  // ---- Social posts ----
  async function fetchPosts(platform){
    const postsRef = collection(db, 'posts');
    const snap = await getDocs(query(postsRef, where('platform','==', platform)));
    const arr = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
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
            <div class="row-text">${sanitize(p.text||'')}</div>
          </div>
        </div>
        <div>
          <button class="btn btn-sm" data-edit="${p.id}">Bearbeiten</button>
          <button class="btn btn-sm danger" data-del="${p.id}">Löschen</button>
        </div>
      `;
      box.appendChild(row);
    }
  }

  function bindSocialTab(tabId, listId){
    const PLATFORM = { 'tab-insta':'instagram', 'tab-fb':'facebook', 'tab-x':'x', 'tab-tiktok':'tiktok' };
    const platform = PLATFORM[tabId];
    const tabBtn   = $(`#tabs .tab[data-id="${tabId}"]`);
    const root     = document.getElementById(tabId);
    if(!platform || !tabBtn || !root) return;

    tabBtn.addEventListener('click', async ()=>{
      // Kopfzeile je Tab
      const nice = { instagram:'Instagram', facebook:'Facebook', x:'X', tiktok:'TikTok' };
      const fp = q(root, 'f-platform'); if (fp) fp.textContent = nice[platform];

      // Formular leeren
      fillPostForm(null, root);

      // Liste laden/rendern
      const items = await fetchPosts(platform);
      renderPosts(listId, items, platform);

      // Aktionen (scoped)
      const saveBtn   = q(root, 'f-save');
      const exportBtn = q(root, 'f-export');
      const importInp = q(root, 'f-import');

      // Edit/Delete in der Liste: delegieren nach Render
      const listBox = $('#'+listId);
      listBox.querySelectorAll('[data-edit]').forEach(b=>{
        b.addEventListener('click', ()=>{
          const pick = items.find(x=>x.id===b.dataset.edit);
          fillPostForm(pick, root);
          toast('Beitrag geladen');
        });
      });
      listBox.querySelectorAll('[data-del]').forEach(b=>{
        b.addEventListener('click', async ()=>{
          await deleteDoc(doc(db,'posts', b.dataset.del));
          toast('Beitrag gelöscht');
          renderPosts(listId, await fetchPosts(platform), platform);
        });
      });

      bindElement(saveBtn, 'click', async ()=>{
        const p = readPostForm(root);
        const data = {
          user:p.user, avatar:p.avatar, img:p.img, text:p.text,
          platform, ts: Date.now(), updatedAt: serverTimestamp()
        };
        await setDoc(doc(db,'posts', p.id), data, { merge:true });
        toast('Gespeichert');
        fillPostForm(null, root);
        renderPosts(listId, await fetchPosts(platform), platform);
      });

      bindElement(exportBtn, 'click', async ()=>{
        const arr = await fetchPosts(platform);
        const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `posts_${platform}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
      });

      bindElement(importInp, 'change', async (e)=>{
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
          renderPosts(listId, await fetchPosts(platform), platform);
        }catch(err){
          console.error(err); toast('Import fehlgeschlagen', false);
        }finally{ e.target.value=''; }
      });
    });
  }

  function readPostForm(root){
    return {
      id:     q(root,'f-id').value || uid(),
      user:   q(root,'f-user').value.trim(),
      avatar: q(root,'f-avatar').value.trim(),
      img:    q(root,'f-img').value.trim(),
      text:   q(root,'f-text').value.trim(),
    };
  }
  function fillPostForm(p, root){
    q(root,'f-id').value     = p?.id || '';
    q(root,'f-user').value   = p?.user || '';
    q(root,'f-avatar').value = p?.avatar || '';
    q(root,'f-img').value    = p?.img || '';
    q(root,'f-text').value   = p?.text || '';
  }

  // ---- Timeline Events (scoped to #tab-events) ----
  const eventsRoot = document.getElementById('tab-events');

  async function fetchEvents(){
    const snap = await getDocs(collection(db,'events'));
    const arr  = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
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

    // actions
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

  function readEventForm(){
    return {
      id:    q(eventsRoot,'e-id').value || uid(),
      date:  q(eventsRoot,'e-date').value,
      title: q(eventsRoot,'e-title').value.trim(),
      type:  q(eventsRoot,'e-type').value,
      img:   q(eventsRoot,'e-img').value.trim(),
      note:  q(eventsRoot,'e-note').value.trim(),
    };
  }
  function fillEventForm(e){
    q(eventsRoot,'e-id').value    = e?.id || '';
    q(eventsRoot,'e-date').value  = e?.date || '';
    q(eventsRoot,'e-title').value = e?.title || '';
    q(eventsRoot,'e-type').value  = e?.type || 'Milestone';
    q(eventsRoot,'e-img').value   = e?.img || '';
    q(eventsRoot,'e-note').value  = e?.note || '';
  }

  function bindEvents(){
    // Render beim Tab-Öffnen
    $('#tabs .tab[data-id="tab-events"]')?.addEventListener('click', async ()=>{
      fillEventForm(null);
      renderEvents(await fetchEvents());
    });

    bindElement(q(eventsRoot,'e-save'), 'click', async ()=>{
      const e = readEventForm();
      await setDoc(doc(db,'events', e.id), {
        date:e.date, title:e.title, type:e.type, img:e.img, note:e.note,
        ts: Date.now(), updatedAt: serverTimestamp()
      }, { merge:true });
      toast('Event gespeichert');
      fillEventForm(null);
      renderEvents(await fetchEvents());
    });

    bindElement(q(eventsRoot,'e-export'), 'click', async ()=>{
      const arr = await fetchEvents();
      const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'timeline_custom_events.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    bindElement(q(eventsRoot,'e-import'), 'change', async e=>{
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

    bindElement(q(eventsRoot,'e-clear'), 'click', async ()=>{
      if(!confirm('Alle Custom-Events wirklich löschen?')) return;
      const snap = await getDocs(collection(db,'events'));
      for (const d of snap.docs){ await deleteDoc(doc(db,'events', d.id)); }
      toast('Alle Custom-Events gelöscht');
      renderEvents(await fetchEvents());
    });
  }

  // ---- Toast ----
  function toast(msg, ok=true){
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
  }

  // ---- Init ----
  function init(){
    initTabs();
    bindSocialTab('tab-insta',  'list-insta');
    bindSocialTab('tab-fb',     'list-fb');
    bindSocialTab('tab-x',      'list-x');
    bindSocialTab('tab-tiktok', 'list-tiktok');
    bindEvents();
    console.log('[admin] Firestore-Admin init (data-js scoped)');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else { init(); }

})(window);
