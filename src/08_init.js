/* ===== Вкладки, клавіатура, старт ===== */
const App = (function(){
  const MODS = { test:TestUI, read:ReadUI, schulte:SchulteUI, stats:StatsUI };
  let cur=null;
  function tab(name){
    if(!MODS[name]) name="test";
    if(cur && cur!==name && MODS[cur].leave) MODS[cur].leave();
    cur=name; ST.tab=name; saveSoon();
    document.querySelectorAll(".tb").forEach(b=>b.setAttribute("aria-selected", b.dataset.tab===name));
    document.querySelectorAll(".scr").forEach(s=>s.hidden = s.id!=="scr-"+name);
    $("main").scrollTop=0;
    if(MODS[name].enter) MODS[name].enter();
    if(MODS[name].refit) requestAnimationFrame(()=>MODS[name].refit());
  }
  document.querySelector(".tbar").addEventListener("click", e=>{ const b=e.target.closest(".tb"); if(b) tab(b.dataset.tab); });
  document.addEventListener("keydown", e=>{
    if(e.target.closest("input,textarea,select") || !$("dlg").hidden || !$("upd").hidden){ if(e.key==="Escape" && !$("dlg").hidden) $("dlg").hidden=true; return; }
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    if(cur==="test" && (e.key===" "||e.key==="Enter") && TestUI.isRunning()){ e.preventDefault(); TestUI.brk(); return; }
    if(cur==="read"){
      if(e.key===" "){ e.preventDefault(); ReadUI.toggle(); }
      else if(e.key==="ArrowLeft"){ e.preventDefault(); ReadUI.prev(); }
      else if(e.key==="ArrowRight"){ e.preventDefault(); ReadUI.next(); }
      else if(e.key==="ArrowUp"){ e.preventDefault(); ReadUI.faster(); }
      else if(e.key==="ArrowDown"){ e.preventDefault(); ReadUI.slower(); }
    }
  });
  document.addEventListener("visibilitychange", ()=>{ if(document.hidden){ TestUI.hidden(); ReadUI.leave(); SchulteUI.leave(); save(); } });
  window.addEventListener("pagehide", save);
  let rt=0; window.addEventListener("resize", ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ const m=MODS[cur]; if(m&&m.refit) m.refit(); },120); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>{ const m=MODS[cur]; if(m&&m.refit) m.refit(); });
  tab(ST.tab);
  return { tab };
})();
