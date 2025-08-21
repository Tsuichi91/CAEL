
// assets/js/data-source.js
window.DataSource = (() => {
  const KEY='cael.remote.cfg';
  const DEFAULT={mode:'local',owner:'',repo:'',branch:'main',basePath:'assets/data',token:''};
  function cfg(){ try{return Object.assign({},DEFAULT,JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(e){return {...DEFAULT};} }
  function setCfg(o){ localStorage.setItem(KEY, JSON.stringify(o)); }
  function fileFor(key){
    switch(key){
      case 'instaPosts': return 'insta-posts.json';
      case 'fbPosts': return 'fb-posts.json';
      case 'xPosts': return 'x-posts.json';
      case 'tiktokPosts': return 'tiktok-posts.json';
      case 'cael.timeline.custom': return 'timeline-custom.json';
      default: return key.replace(/[^a-z0-9\-_.]/gi,'_') + '.json';
    }
  }
  async function load(key){
    const c=cfg();
    if(c.mode!=='github'){
      try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return []}
    }
    const path=`${c.basePath}/${fileFor(key)}`.replace(/\/+/g,'/');
    const url=`https://raw.githubusercontent.com/${c.owner}/${c.repo}/${c.branch}/${path}`;
    const res=await fetch(url,{cache:'no-store'});
    if(res.status===404) return [];
    if(!res.ok) throw new Error('Fetch failed: '+res.status);
    return await res.json();
  }
  async function save(key,arr){
    const c=cfg();
    if(c.mode!=='github'){ localStorage.setItem(key,JSON.stringify(arr)); return {ok:true,mode:'local'}; }
    if(!c.owner||!c.repo||!c.branch||!c.basePath) throw new Error('Remote-Konfiguration unvollständig.');
    if(!c.token) throw new Error('GitHub Token fehlt.');
    const path=`${c.basePath}/${fileFor(key)}`.replace(/\/+/g,'/');
    const getUrl=`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}?ref=${c.branch}`;
    const headers={'Accept':'application/vnd.github+json','Authorization':`token ${c.token}`};
    let sha=null;
    const meta=await fetch(getUrl,{headers});
    if(meta.ok){ const j=await meta.json(); sha=j.sha; }
    const putUrl=`https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`;
    const content=btoa(unescape(encodeURIComponent(JSON.stringify(arr,null,2))));
    const body={message:`Update ${path} via admin`,content,branch:c.branch};
    if(sha) body.sha=sha;
    const putRes=await fetch(putUrl,{method:'PUT',headers,body:JSON.stringify(body)});
    if(!putRes.ok) throw new Error('GitHub Save failed: '+putRes.status);
    return {ok:true,mode:'github'};
  }
  return {cfg,setCfg,load,save,KEY};
})();
