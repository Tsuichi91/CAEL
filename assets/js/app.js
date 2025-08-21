
(function(){
  const l=document.createElement('link');
  l.href='https://fonts.googleapis.com/css2?family=Audiowide&family=Megrim&family=Offside&family=Dongle:wght@300;400;700&family=Zen+Maru+Gothic:wght@300;400;500;700&family=Rubik+Glitch&family=Rubik+Distressed&display=swap';
  l.rel='stylesheet'; document.head.appendChild(l);
})();
// Dark-only
window.__applyTheme=function(){};
window.__markActive=function(){
  const path=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  document.querySelectorAll('.navlinks a').forEach(a=>{
    const href=(a.getAttribute('href')||'').toLowerCase();
    a.classList.toggle('active', href.endsWith(path));
  });
};
window.addEventListener('DOMContentLoaded',()=>{
  window.__applyTheme(); window.__markActive();
  document.getElementById('year')?.append(new Date().getFullYear());
});
// Per-letter wrapping for spinning title
window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.letter-spin').forEach(el => {
    const text = el.textContent.trim();
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'char';
      span.style.setProperty('--i', i);
      span.textContent = ch;
      el.appendChild(span);
    });
  });
});
