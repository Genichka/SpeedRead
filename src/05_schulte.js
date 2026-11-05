/* ===== Таблиці Шульте ===== */
const SchulteUI = (function(){
  let N=ST.set.sSize, nums=[], next=1, err=0, t0=0, tm=0, running=false;
  const G=$("sGrid"), O=$("sOver");
  function fit(){ const w=G.clientWidth||300; const fs=Math.max(12, Math.min(34, w/N*0.38)); G.querySelectorAll("button").forEach(b=>b.style.fontSize=fs+"px"); }
  function draw(){ G.style.gridTemplateColumns=`repeat(${N},minmax(0,1fr))`; G.innerHTML=nums.map(n=>`<button data-n="${n}" tabindex="${running?0:-1}">${n}</button>`).join(""); fit(); }
  function best(){ const b=ST.schulte.best[N]; return b?fmtClock(b):"—"; }
  function stat(){ $("sNext").textContent = next>N*N ? "✓" : next; $("sErr").textContent=err; $("sBest").textContent=`Рекорд ${N}×${N}: ${best()} · спроб: ${ST.schulte.runs[N]||0}`; }
  function idle(){ running=false; clearInterval(tm); next=1; err=0; nums=[...Array(N*N)].map((_,i)=>i+1); draw(); $("sTime").textContent="0:00.0"; stat();
    O.innerHTML=`<b>Таблиця ${N}×${N}</b><span class="hint">Знайди числа від 1 до ${N*N}</span><button class="btn primary big" id="sGo" style="margin-top:8px">Старт</button>`; O.hidden=false; }
  function start(){ next=1; err=0; nums=shuffle([...Array(N*N)].map((_,i)=>i+1)); running=true; draw(); stat(); O.hidden=true;
    t0=performance.now(); clearInterval(tm); tm=setInterval(()=>$("sTime").textContent=fmtClock(performance.now()-t0),100); }
  function finish(){
    running=false; clearInterval(tm); const ms=performance.now()-t0; $("sTime").textContent=fmtClock(ms);
    const prev=ST.schulte.best[N], rec=!prev||ms<prev; if(rec) ST.schulte.best[N]=Math.round(ms);
    ST.schulte.runs[N]=(ST.schulte.runs[N]||0)+1; save(); stat();
    O.innerHTML=`<span class="hint">Таблиця ${N}×${N}${ST.set.sShuf?" · з перемішуванням":""}</span><b style="font-size:30px" class="mono">${fmtClock(ms)}</b>
      <span class="hint">${rec?(prev?`Новий рекорд! Було ${fmtClock(prev)}`:"Перший результат — це твій рекорд"):`Рекорд: ${fmtClock(prev)}`} · помилок: ${err}</span>
      <button class="btn primary big" id="sGo" style="margin-top:8px">Ще раз</button>`;
    O.hidden=false;
  }
  G.addEventListener("pointerdown", e=>{
    const b=e.target.closest("button[data-n]"); if(!b || !running) return; e.preventDefault();
    const n=+b.dataset.n;
    if(n===next){ next++; b.classList.remove("bad"); b.classList.add("ok"); setTimeout(()=>b.classList.remove("ok"),180);
      if(next>N*N){ stat(); finish(); return; }
      if(ST.set.sShuf){ nums=shuffle(nums); draw(); } }
    else { err++; b.classList.add("bad"); setTimeout(()=>b.classList.remove("bad"),300); }
    stat();
  });
  O.addEventListener("click", e=>{ if(e.target.closest("#sGo")) start(); });
  $("sSize").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; N=ST.set.sSize=+b.dataset.v; save(); ui(); idle(); });
  $("sShuf").onchange=e=>{ ST.set.sShuf=e.target.checked; save(); idle(); };
  function ui(){ document.querySelectorAll("#sSize button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===String(N))); $("sShuf").checked=ST.set.sShuf; }
  ui(); idle();
  return { enter:()=>{ ui(); fit(); stat(); }, leave:()=>{ if(running) idle(); }, refit:fit };
})();
