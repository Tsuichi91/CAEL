
const LIBRARY = {
  singles: [
    { title:'VEINS', date:'2023-08-18', cover:'assets/covers/veins.png', tracks:[
      { title:'Veins', src:'assets/audio/singles/veins/veins.mp3' },
      { title:'Grey Room', src:'assets/audio/singles/veins/grey-room.mp3' },
      { title:'Butterfly Dust', src:'assets/audio/singles/veins/butterfly-dust.mp3' }
    ]},
    { title:'NIGHT DRIVE', date:'2024-10-18', cover:'assets/covers/night-drive.png', tracks:[
      { title:'Midnight Drive', src:'assets/audio/singles/night-drive/midnight-drive.mp3' },
      { title:'GLOW (빛나)', src:'assets/audio/singles/night-drive/glow.mp3' },
      { title:'Crisis (Nightfall DJ Remix)', src:'assets/audio/singles/night-drive/crisis-nightfall-dj-remix.mp3' }
    ]}
  ],
  mini: [
    { title:'D I V I D E', date:'2024-02-16', cover:'assets/covers/divide.png', tracks:[
      { title:'Black Pulse', src:'assets/audio/mini/divide/black-pulse.mp3' },
      { title:'Still (그 자리에)', src:'assets/audio/mini/divide/still.mp3' },
      { title:'Obsidian', src:'assets/audio/mini/divide/obsidian.mp3' },
      { title:'Glass Voice', src:'assets/audio/mini/divide/glass-voice.mp3' },
      { title:'Crisis', src:'assets/audio/mini/divide/crisis.mp3' }
    ]},
    { title:'CITY CHORDS', date:'2025-08-01', cover:'assets/covers/city-chords.png', tracks:[
      { title:'Love Frequency (러브 프리퀀시)', src:'assets/audio/mini/city-chords/love-frequency.mp3' },
      { title:'After Midnight (자정 이후)', src:'assets/audio/mini/city-chords/after-midnight.mp3' },
      { title:'City Loner (도시 외톨이)', src:'assets/audio/mini/city-chords/city-loner.mp3' },
      { title:'Hey, You (거기 너)', src:'assets/audio/mini/city-chords/hey-you.mp3' },
      { title:'Headspace (머릿속)', src:'assets/audio/mini/city-chords/headspace.mp3' }
    ]}
  ],
  albums: [
    { title:'HALO // HAVOC', date:'2025-06-13', cover:'assets/covers/halo-havoc.png', tracks:[
      { title:'ICON', src:'assets/audio/albums/halo-havoc/icon.mp3' },
      { title:'PARADE', src:'assets/audio/albums/halo-havoc/parade.mp3' },
      { title:'ELECTR!K', src:'assets/audio/albums/halo-havoc/electrik.mp3' },
      { title:'IGNITE', src:'assets/audio/albums/halo-havoc/ignite.mp3' },
      { title:'DAY BY DAY (하루씩)', src:'assets/audio/albums/halo-havoc/day-by-day.mp3' },
      { title:'NONE', src:'assets/audio/albums/halo-havoc/none.mp3' },
      { title:'SHOCKWAVE', src:'assets/audio/albums/halo-havoc/shockwave.mp3' },
      { title:'OUTLAW', src:'assets/audio/albums/halo-havoc/outlaw.mp3' },
      { title:'PAPER SMILE', src:'assets/audio/albums/halo-havoc/paper-smile.mp3' },
      { title:'TIDELIGHT', src:'assets/audio/albums/halo-havoc/tidelight.mp3' },
      { title:'STARDUST!', src:'assets/audio/albums/halo-havoc/stardust.mp3' },
      { title:'UNSENT LETTER', src:'assets/audio/albums/halo-havoc/unsent-letter.mp3' }
    ]}
  ]
};
let cat='all', queue=[], qIndex=0, audio;
function releasesFor(sel){ if(sel==='all'){ const arr=[]; Object.keys(LIBRARY).forEach(c=>LIBRARY[c].forEach((rel,ri)=>arr.push({cat:c,ri,rel}))); arr.sort((b,a)=>a.rel.date.localeCompare(b.rel.date)); return arr; } return (LIBRARY[sel]||[]).map((rel,ri)=>({cat:sel,ri,rel})); }
function buildQueue(){ const rels=releasesFor(cat); queue=[]; rels.forEach(r=>r.rel.tracks.forEach((t,ti)=>{ queue.push({cat:r.cat,ri:r.ri,ti,title:t.title,artist:'CΛEL',cover:r.rel.cover,release:r.rel.title,src:t.src}); })); }
function renderTabs(){ document.querySelectorAll('#catTabs .tab').forEach(btn=>{ btn.onclick=()=>{ document.querySelectorAll('#catTabs .tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); cat=btn.dataset.cat; buildQueue(); renderLibrary(); qIndex=0; load(); highlight(); }; }); }
function renderLibrary(){ const container=document.getElementById('library'); container.innerHTML=''; const rels=releasesFor(cat); rels.forEach(r=>{ const wrap=document.createElement('details'); wrap.className='release'; if(container.children.length===0) wrap.open=true; const sum=document.createElement('summary'); sum.innerHTML=`<div style="display:flex;align-items:center;gap:.6rem"><img src="${r.rel.cover}" alt="${r.rel.title}" style="width:42px;height:42px;border-radius:8px;object-fit:cover;border:1px solid var(--border)"><div><strong>${r.rel.title}</strong><div class="meta">${new Date(r.rel.date).toLocaleDateString('de-DE')}</div></div></div>`; wrap.appendChild(sum); const ol=document.createElement('ol'); ol.className='tracks'; r.rel.tracks.forEach((t,ti)=>{ const li=document.createElement('li'); li.innerHTML=`<div class="row" id="row-${r.cat}-${r.ri}-${ti}"><div style="display:flex;gap:.75rem;align-items:center"><img src="${r.rel.cover}" alt="" style="width:32px;height:32px;border-radius:6px;object-fit:cover"><div><strong>${t.title}</strong><div class="meta">${r.rel.title}</div></div></div></div>`; li.querySelector('.row').onclick=()=>{ const idx=queue.findIndex(q=>q.cat===r.cat && q.ri===r.ri && q.ti===ti); if(idx>=0){ qIndex=idx; load(); play(); highlight(); } }; ol.appendChild(li); }); wrap.appendChild(ol); container.appendChild(wrap); }); }
function fmt(t){ if(!isFinite(t)) return '0:00'; const m=Math.floor(t/60),s=Math.floor(t%60).toString().padStart(2,'0'); return `${m}:${s}`; }
function bindAudio(){ audio.addEventListener('loadedmetadata',()=>{ const d=audio.duration; if(isFinite(d)) document.getElementById('total').textContent=fmt(d); }); audio.addEventListener('timeupdate',()=>{ const cur=audio.currentTime; document.getElementById('current').textContent=fmt(cur); const seek=document.getElementById('seek'); if(audio.duration) seek.value=(cur/audio.duration)*100; }); audio.addEventListener('ended',()=>next()); document.getElementById('seek').oninput=(e)=>{ if(audio.duration) audio.currentTime=(e.target.value/100)*audio.duration; }; document.getElementById('volume').oninput=(e)=>{ audio.volume=e.target.value; }; }
function load(){ const t=queue[qIndex]; if(!t) return; document.getElementById('p-cover').src=t.cover; document.getElementById('p-title').textContent=t.title; document.getElementById('p-artist').textContent=t.artist; document.getElementById('p-release').textContent=t.release; if(!audio){ audio=new Audio(); audio.preload='metadata'; bindAudio(); } audio.src=t.src; audio.load(); }
function play(){ audio && audio.play().catch(()=>{}); document.getElementById('btnPlay').textContent='⏸'; }
function pause(){ audio && audio.pause(); document.getElementById('btnPlay').textContent='▶'; }
function toggle(){ audio && (audio.paused?play():pause()); }
function next(){ if(!queue.length) return; qIndex=(qIndex+1)%queue.length; load(); play(); highlight(); }
function prev(){ if(!queue.length) return; qIndex=(qIndex-1+queue.length)%queue.length; load(); play(); highlight(); }
function highlight(){ document.querySelectorAll('#library .row').forEach(el=>el.classList.remove('active')); const cur=queue[qIndex]; if(!cur) return; const el=document.getElementById(`row-${cur.cat}-${cur.ri}-${cur.ti}`); if(el){ el.classList.add('active'); el.scrollIntoView({behavior:'smooth', block:'nearest'}); } }
function initPlayer(){ renderTabs(); buildQueue(); renderLibrary(); qIndex=0; load(); highlight(); }
window.initPlayer=initPlayer; window.play=play; window.pause=pause; window.toggle=toggle; window.next=next; window.prev=prev;
