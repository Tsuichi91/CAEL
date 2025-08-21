
(() => {
  const KEY = 'cael.timeline.custom';
  function fmt(d){ return new Date(d+'T00:00:00').toLocaleDateString('de-DE'); }
  function read(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){return []} }
  function all(){ return (window.CAEL_TL_BASE||[]).concat(read()).sort((a,b)=>a.date.localeCompare(b.date)); }
  function chipColor(t){
    const map = { Milestone:'#6b7280', Debut:'#22d3ee', Single:'#60a5fa', Mini:'#f472b6', Album:'#a78bfa', MV:'#34d399', Event:'#f59e0b', Other:'#94a3b8' };
    return map[t] || '#94a3b8';
  }
  function render(){
    const grid=document.getElementById('tileGrid'); const count=document.getElementById('evCount');
    const q=(document.getElementById('search')?.value||'').toLowerCase().trim();
    const type=document.querySelector('.tabs .tab.active')?.dataset.type||'all';
    grid.innerHTML='';
    const filtered = all().filter(e => {
      const hitType = type==='all' || e.type===type;
      const hitText = !q || [e.title,e.type,e.note,e.date].join(' ').toLowerCase().includes(q);
      return hitType && hitText;
    }).reverse();
    count.textContent = filtered.length;
    if(!filtered.length){ grid.innerHTML = '<p class="meta">Keine Events gefunden.</p>'; return; }
    filtered.forEach(e=>{
      const art=document.createElement('article'); art.className='tile card'; art.tabIndex=0;
      art.innerHTML = `<div class="tile-head"><span class="chip" style="--chip:${chipColor(e.type)}">${e.type}</span><span class="date">${fmt(e.date)}</span></div>
        <h3 class="tile-title">${e.title}</h3>${e.note?`<p class="tile-note">${e.note}</p>`:''}${e.img?`<img class="tile-img" src="${e.img}" alt="">`:''}`;
      art.addEventListener('keydown', ev => { if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); art.click(); } });
      art.addEventListener('click', () => openDialog(e));
      grid.appendChild(art);
    });
  }
  function openDialog(e){
    const dlg=document.getElementById('dlg');
    dlg.querySelector('.dlg-title').textContent=e.title;
    dlg.querySelector('.dlg-meta').textContent=`${fmt(e.date)} • ${e.type}`;
    dlg.querySelector('.dlg-note').textContent=e.note||'';
    const img=dlg.querySelector('.dlg-img'); if(e.img){ img.src=e.img; img.style.display='block'; } else { img.style.display='none'; }
    dlg.showModal();
  }
  function bind(){
    document.querySelectorAll('.tabs .tab').forEach(btn=>{ btn.onclick=()=>{ document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); render(); }; });
    document.getElementById('search')?.addEventListener('input', render);
    document.getElementById('dlgClose').onclick=()=>document.getElementById('dlg').close();
  }
  window.addEventListener('DOMContentLoaded',()=>{ bind(); render(); });
})();
