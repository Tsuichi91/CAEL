
const SOCIAL_KEYS={insta:'instaPosts', fb:'fbPosts', x:'xPosts', tiktok:'tiktokPosts'};
function getPosts(key){ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return []} }
function setTab(id){ document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active', t.dataset.id===id)); const container=document.getElementById('feed'); if(container) container.dataset.platform=id; renderFeed(id); }
function renderFeed(id){
  const container=document.getElementById('feed'); container.innerHTML='';
  const posts=getPosts(SOCIAL_KEYS[id]); container.dataset.platform=id;
  if(!posts.length){ container.innerHTML='<p class="meta">Noch keine Beiträge — nutze die Admin-Seite (admin.html), um Posts zu erstellen.</p>'; return; }
  posts.slice().reverse().forEach(p=>{
    const el=document.createElement('article'); el.className='post';
    const imgHtml = p.img?'<img class="post-img" src="'+p.img+'" alt="post">':'';
    el.innerHTML='<div class="post-header"><img src="'+(p.avatar||'assets/avatar.png')+'" alt="avatar"><div><strong>'+(p.user||id.toUpperCase())+'</strong><div class="meta">'+new Date(p.time||Date.now()).toLocaleString('de-DE')+'</div></div></div>'+imgHtml+'<div class="post-body"><p>'+((p.text||'')+'').replace(/\n/g,'<br>')+'</p></div><div class="post-actions"><button class="icon" title="Like">♥</button><button class="icon" title="Comment">💬</button><button class="icon" title="Share">↗</button></div>';
    container.appendChild(el);
  });
}
