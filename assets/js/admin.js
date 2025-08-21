// admin.js — scoped controls per tab (fix for FB/X/TikTok create), MERGE imports
(() => {
  const SOCIAL = {
    insta:  { key:'instaPosts',  title:'Instagram' },
    fb:     { key:'fbPosts',     title:'Facebook'  },
    x:      { key:'xPosts',      title:'X'         },
    tiktok: { key:'tiktokPosts', title:'TikTok'    }
  };
  const TL_KEY = 'cael.timeline.custom';

  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const $  = (sel, root=document) => root.querySelector(sel);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,8);

  function load(k){ try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return []} }
  function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  function migrate(list){ list.forEach(it=>{ if(!it.id) it.id=uid(); }); return list; }
  function fmt(ts){ const d=new Date(ts||Date.now()); return isNaN(+d)?'—':d.toLocaleString('de-DE'); }

  // ---------- Tabs
  function initTabs(){
    $$('#tabs .tab').forEach(btn => {
      btn.onclick = () => {
        $$('#tabs .tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const id = btn.dataset.id;
        $$('#tabviews > section').forEach(s => s.hidden = (s.id !== id));
        if(id === 'tab-events') renderEvents();
        else renderSocial(id.replace('tab-',''));
      };
    });
  }

  // ---------- Social Section (scoped to tab section)
  function renderSocial(platform){
    const cfg = SOCIAL[platform];
    const sec = document.getElementById('tab-'+platform);
    if(!sec) return;

    const idEl     = $('#f-id', sec);
    const userEl   = $('#f-user', sec);
    const avatarEl = $('#f-avatar', sec);
    const imgEl    = $('#f-img', sec);
    const textEl   = $('#f-text', sec);
    const saveBtn  = $('#f-save', sec);
    const exportBtn= $('#f-export', sec);
    const importIn = $('#f-import', sec);
    const label    = $('#f-platform', sec);
    const grid     = document.getElementById('list-'+platform);

    if(label) label.textContent = cfg.title;

    // reset form
    idEl.value=''; userEl.value=''; avatarEl.value=''; imgEl.value=''; textEl.value=''; saveBtn.textContent='Speichern';

    function listData(){
      return migrate(load(cfg.key)).sort((a,b)=> (a.time||0)-(b.time||0));
    }
    function draw(){
      const data = listData().slice().reverse();
      save(cfg.key, data.slice().reverse()); // persist id migration
      grid.innerHTML='';
      if(!data.length){ const p=document.createElement('p'); p.className='meta'; p.textContent='Keine Beiträge vorhanden.'; grid.appendChild(p); return; }
      data.forEach(item => {
        const card = document.createElement('article'); card.className='card admin-row';
        card.innerHTML = `<div class="row-main">
            <img src="${item.img || 'assets/avatar.png'}" class="thumb" alt="">
            <div class="meta-wrap">
              <div class="row-title">${item.user || '@user'} <span class="meta">• ${fmt(item.time)}</span></div>
              <div class="row-text meta">${(item.text||'').slice(0,140)}</div>
            </div>
          </div>
          <div class="row-actions">
            <button class="btn btn-sm edit">Bearbeiten</button>
            <button class="btn btn-sm danger del">Löschen</button>
          </div>`;
        card.querySelector('.edit').onclick = () => {
          idEl.value = item.id;
          userEl.value = item.user || '';
          avatarEl.value = item.avatar || '';
          imgEl.value = item.img || '';
          textEl.value = item.text || '';
          saveBtn.textContent = 'Änderungen speichern';
        };
        card.querySelector('.del').onclick = () => {
          if(!confirm('Diesen Beitrag löschen?')) return;
          const base = load(cfg.key).filter(p => p.id !== item.id);
          save(cfg.key, base); draw();
        };
        grid.appendChild(card);
      });
    }

    // Save handler (scoped)
    saveBtn.onclick = () => {
      const obj = {
        id: idEl.value || uid(),
        user: userEl.value || '@cael_official',
        avatar: avatarEl.value || 'assets/avatar.png',
        img: imgEl.value || '',
        text: textEl.value || '',
        time: Date.now()
      };
      let arr = load(cfg.key);
      const idx = arr.findIndex(p => p.id === obj.id);
      if (idx >= 0) arr[idx] = obj; else arr.push(obj);
      save(cfg.key, arr);
      idEl.value=''; userEl.value=''; avatarEl.value=''; imgEl.value=''; textEl.value=''; saveBtn.textContent='Speichern';
      draw();
    };

    // Export
    exportBtn.onclick = () => {
      const data = JSON.stringify(load(cfg.key), null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${platform}-posts.json`; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    };

    // Import (MERGE)
    importIn.onchange = (e) => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const incoming = migrate(JSON.parse(reader.result));
          let base = load(cfg.key);
          const idxById = new Map(base.map((it,i)=>[it.id, i]));
          incoming.forEach(n => {
            if(!n.id) n.id = uid();
            if(idxById.has(n.id)) base[idxById.get(n.id)] = n;
            else{
              const comp = (n.user||'')+'|'+(n.text||'')+'|'+String(n.time||'');
              const j = base.findIndex(it => ((it.user||'')+'|'+(it.text||'')+'|'+String(it.time||'')) === comp);
              if(j>=0) base[j]=n; else base.push(n);
            }
          });
          save(cfg.key, base); draw();
        }catch(err){ alert('Import (Merge) fehlgeschlagen: ' + err.message); }
      };
      reader.readAsText(file);
      e.target.value='';
    };

    draw();
  }

  // ---------- Timeline Events (scoped to its tab)
  function renderEvents(){
    const sec   = document.getElementById('tab-events');
    const idEl  = $('#e-id', sec);
    const dateEl= $('#e-date', sec);
    const titleEl=$('#e-title', sec);
    const typeEl= $('#e-type', sec);
    const imgEl = $('#e-img', sec);
    const noteEl= $('#e-note', sec);
    const saveBtn=$('#e-save', sec);
    const exportBtn=$('#e-export', sec);
    const importIn=$('#e-import', sec);
    const clearBtn=$('#e-clear', sec);
    const grid=document.getElementById('list-events');

    function listData(){
      const arr = migrate(load(TL_KEY));
      arr.sort((a,b)=>a.date.localeCompare(b.date));
      save(TL_KEY, arr);
      return arr;
    }
    function draw(){
      grid.innerHTML='';
      const data = listData().slice().reverse();
      if(!data.length){ const p=document.createElement('p'); p.className='meta'; p.textContent='Noch keine Custom‑Events.'; grid.appendChild(p); return; }
      data.forEach(item => {
        const card=document.createElement('article'); card.className='card admin-row';
        card.innerHTML = `<div class="row-main">
            <img src="${item.img||'assets/covers/veins.png'}" class="thumb" alt="">
            <div class="meta-wrap">
              <div class="row-title">${item.title} <span class="meta">• ${item.type} • ${item.date}</span></div>
              <div class="row-text meta">${(item.note||'').slice(0,160)}</div>
            </div></div>
          <div class="row-actions">
            <button class="btn btn-sm edit">Bearbeiten</button>
            <button class="btn btn-sm danger del">Löschen</button>
          </div>`;
        card.querySelector('.edit').onclick = () => {
          idEl.value=item.id; dateEl.value=item.date; titleEl.value=item.title;
          typeEl.value=item.type||'Milestone'; imgEl.value=item.img||''; noteEl.value=item.note||'';
          saveBtn.textContent='Änderungen speichern';
        };
        card.querySelector('.del').onclick = () => {
          if(!confirm('Dieses Event löschen?')) return;
          save(TL_KEY, load(TL_KEY).filter(p => p.id !== item.id)); draw();
        };
        grid.appendChild(card);
      });
    }

    saveBtn.onclick = () => {
      const obj = { id:idEl.value||uid(), date:dateEl.value, title:titleEl.value.trim(), type:typeEl.value, img:imgEl.value.trim(), note:noteEl.value.trim() };
      if(!obj.date || !obj.title){ alert('Datum & Titel sind Pflicht.'); return; }
      let arr = load(TL_KEY);
      const idx = arr.findIndex(e => e.id === obj.id);
      if(idx>=0) arr[idx]=obj; else arr.push(obj);
      save(TL_KEY, arr);
      idEl.value=''; dateEl.value=''; titleEl.value=''; typeEl.value='Milestone'; imgEl.value=''; noteEl.value=''; saveBtn.textContent='Speichern';
      draw();
    };

    exportBtn.onclick = () => {
      const data = JSON.stringify(load(TL_KEY), null, 2);
      const blob = new Blob([data], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='timeline-custom.json'; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
    };

    importIn.onchange = (e) => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const incoming = JSON.parse(reader.result);
          let base = load(TL_KEY);
          const idxById = new Map(base.map((it,i)=>[it.id, i]));
          incoming.forEach(n => {
            if(!n.id) n.id = uid();
            if(idxById.has(n.id)) base[idxById.get(n.id)] = n;
            else{
              const comp = (n.title||'')+'|'+(n.date||'')+'|'+(n.type||'');
              const j = base.findIndex(it => ((it.title||'')+'|'+(it.date||'')+'|'+(it.type||'')) === comp);
              if(j>=0) base[j]=n; else base.push(n);
            }
          });
          save(TL_KEY, base); draw();
        }catch(err){ alert('Import (Merge) fehlgeschlagen: ' + err.message); }
      };
      reader.readAsText(file);
      e.target.value='';
    };

    clearBtn.onclick = () => { if(confirm('Wirklich alle Custom‑Events löschen?')){ localStorage.removeItem(TL_KEY); draw(); } };

    draw();
  }

  // ---------- init
  window.addEventListener('DOMContentLoaded', () => {
    initTabs();
    (function(){
      const map={insta:'tab-insta',fb:'tab-fb',x:'tab-x',tiktok:'tab-tiktok',events:'tab-events'};
      const h=(location.hash||'').replace('#','');
      const id = map[h] || 'tab-insta';
      const btn = Array.from(document.querySelectorAll('#tabs .tab')).find(b=>b.dataset.id===id) || document.querySelector('#tabs .tab');
      btn && btn.click();
    })();
    const y=document.getElementById('year'); if(y) y.append(new Date().getFullYear());
  });
})();
