/* ===== Читання: будь-який текст, налаштування, свої тексти ===== */
const ReadUI = (function(){
  const V=View($("rReader")), P=Player(V);
  let text=null, toks=[], sessT=0, rampFrom=0, run={ words:0, ms:0 }, lastW=0;
  const S=ST.set;
  const clampW = w => Math.max(100, Math.min(1500, Math.round(w/25)*25));
  P.speed = i => S.ramp ? Math.min(Math.max(S.rampTo, S.wpm), S.wpm + 25*Math.floor(Math.max(0, i-rampFrom)/40)) : S.wpm;
  P.onFrame = (f, w) => {
    if(w!==lastW){ V.speed(w, S.ramp && lastW>0); lastW=w; }
    ST.pos[text.id]=f.s; run.words+=f.n;
    ST.read.words+=f.n; ST.read.days[dayKey()]=(ST.read.days[dayKey()]||0)+f.n;
    meta(f.e+1, w); saveSoon();
  };
  P.onEnd = () => { acc(); wakeOff(); ico(); ST.pos[text.id]=0; save(); meta(toks.length, lastW); endPanel(); };

  function acc(){ if(sessT){ const d=performance.now()-sessT; ST.read.ms+=d; run.ms+=d; sessT=0; } }
  function meta(done, w){
    const n=toks.length; $("rProg").style.width = n ? (100*done/n).toFixed(1)+"%" : "0";
    $("rPos").textContent = `${fmtN(done)} / ${fmtN(n)} ${plural(n,"слово","слова","слів")}`;
    $("rLeft").textContent = done>=n ? "" : `залишилось ~${fmtDur(P.leftMs(w||P.speed(P.tok())))}`;
  }
  function ico(){ $("rPlayIco").innerHTML = P.playing ? '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>' : '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>'; }
  function idle(){ // показати поточне слово у стані паузи
    const f=P.fr[P.fi]; if(f) V.show(f.text, f.n===1, true); else V.clear();
    if(text && f){ ST.pos[text.id]=f.s; saveSoon(); }
    V.speed(P.speed(P.tok())); lastW=0;
    meta(f ? f.s : toks.length, 0); ctx();
  }
  function setText(id){
    stopPlay();
    text=textById(id)||TEXTS[0]; ST.cur=text.id; toks=tokenize(text.body);
    const pos=ST.pos[text.id]||0;
    P.load(toks, S.chunk, S.pauses, pos>=toks.length?0:pos);
    rampFrom=P.tok(); run={ words:0, ms:0 };
    $("rTitle").textContent=text.title; $("rEnd").hidden=true; $("rQuiz").hidden=true;
    V.cap.textContent = P.tok()>0 ? "Торкнись, щоб продовжити" : "Торкнись, щоб почати";
    idle(); save();
  }
  function play(){
    if(!toks.length) return;
    if(P.done()){ P.fi=0; rampFrom=0; run={ words:0, ms:0 }; }
    $("rEnd").hidden=true; $("rQuiz").hidden=true; $("rCtxP").hidden=true; V.cap.textContent="";
    sessT=performance.now(); lastW=0; wakeOn(); P.play(); ico();
  }
  function stopPlay(){ if(!P.playing) return; P.pause(); acc(); wakeOff(); ico(); save(); }
  function pause(){ if(!P.playing) return; stopPlay(); idle(); V.cap.textContent="Пауза"; }
  const toggle = () => P.playing ? pause() : play();
  function ctx(){
    const box=$("rCtxP");
    if(P.playing || !toks.length || P.tok()===0 || P.done()){ box.hidden=true; return; }
    const t=Math.min(P.tok(), toks.length-1), pi=toks[t].p;
    let a=t; while(a>0 && toks[a-1].p===pi && t-a<70) a--;
    let b=t; while(b<toks.length-1 && toks[b+1].p===pi && b-t<70) b++;
    const f=P.fr[P.fi], cs=f?f.s:t, ce=f?f.e:t;
    $("rCtx").innerHTML = (a>0 && toks[a-1].p===pi ? "… " : "") +
      toks.slice(a,b+1).map((x,k)=>{ const i=a+k; return `<span data-i="${i}" class="${i>=cs&&i<=ce?"cur":i<cs?"done":""}">${esc(x.w)}</span>`; }).join(" ") +
      (b<toks.length-1 && toks[b+1].p===pi ? " …" : "");
    box.hidden=false;
    const cur=$("rCtx").querySelector(".cur"); if(cur){ const c=$("rCtx"); c.scrollTop = cur.offsetTop - c.offsetTop - c.clientHeight/2; }
  }
  function endPanel(){
    const wpm = run.ms>0 ? Math.round(run.words/(run.ms/60000)) : 0;
    const box=$("rEnd");
    box.innerHTML = `<div class="ph">Текст прочитано <span class="hint">${esc(text.title)}</span></div>
      <div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px">
        <div class="stat"><div class="k">Слів</div><div class="v">${fmtN(run.words)}</div></div>
        <div class="stat"><div class="k">Час</div><div class="v">${fmtClock(run.ms).replace(/\.\d$/,"")}</div></div>
        <div class="stat"><div class="k">Середня</div><div class="v">${wpm||"—"}</div><div class="s">слів/хв</div></div>
      </div>
      <div class="row">${text.q?`<button class="btn primary grow" id="rCheck">Перевірити розуміння</button>`:""}<button class="btn grow" id="rAgain">Ще раз</button><button class="btn grow" id="rOther">Інший текст</button></div>`;
    box.hidden=false; V.cap.textContent="Кінець тексту"; V.clear(); $("rCtxP").hidden=true;
    const ch=$("rCheck"); if(ch) ch.onclick=()=>{ box.hidden=true; const q=$("rQuiz"); q.hidden=false; q.classList.add("qcard");
      runQuiz(q, text, (ok,n)=>{ q.innerHTML=`<div class="ph">Розуміння: ${ok} з ${n}</div><p class="hint">${ok===n?"Усе правильно — можна пробувати швидше.":ok/n>=0.66?"Добре. Ще кілька текстів на цій швидкості — і можна додавати.":"Варто трохи сповільнитися: −25…50 слів/хв."}</p><div class="row"><button class="btn primary" id="rOther2">Інший текст</button></div>`;
        $("rOther2").onclick=openPicker; }); };
    $("rAgain").onclick=()=>{ box.hidden=true; P.fi=0; rampFrom=0; run={words:0,ms:0}; ST.pos[text.id]=0; idle(); V.cap.textContent="Торкнись, щоб почати"; };
    $("rOther").onclick=openPicker;
  }
  /* ---- Налаштування ---- */
  function setUI(){
    $("rWpm").value=S.wpm; $("rWpmV").textContent=`${S.wpm} слів/хв`;
    const pr=(id,v)=>document.querySelectorAll(`#${id} button`).forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===String(v)));
    pr("rChunk",S.chunk); pr("rFont",S.font); pr("rFs",S.fs);
    $("rPauses").checked=S.pauses; $("rRamp").checked=S.ramp; $("rRampF").hidden=!S.ramp;
    $("rRampV").textContent=`${S.rampTo} сл/хв`;
  }
  function setW(w){ S.wpm=clampW(w); if(S.rampTo<S.wpm) S.rampTo=S.wpm; rampFrom=P.tok(); setUI(); V.speed(P.speed(P.tok())); if(!P.playing) meta(P.tok(),0); saveSoon(); }
  $("rWpm").oninput=e=>setW(+e.target.value);
  $("rSlow").onclick=()=>setW(S.wpm-25);
  $("rFast").onclick=()=>setW(S.wpm+25);
  $("rChunk").onclick=e=>{ const b=e.target.closest("button"); if(!b) return; S.chunk=+b.dataset.v; P.rebuild(S.chunk,S.pauses); if(!P.playing) idle(); setUI(); save(); };
  $("rPauses").onchange=e=>{ S.pauses=e.target.checked; P.rebuild(S.chunk,S.pauses); if(!P.playing) idle(); save(); };
  $("rRamp").onchange=e=>{ S.ramp=e.target.checked; if(S.rampTo<=S.wpm) S.rampTo=clampW(S.wpm+200); rampFrom=P.tok(); setUI(); if(!P.playing) idle(); save(); };
  $("rRampDn").onclick=()=>{ S.rampTo=Math.max(S.wpm, clampW(S.rampTo-25)); setUI(); save(); };
  $("rRampUp").onclick=()=>{ S.rampTo=clampW(S.rampTo+25); setUI(); save(); };
  $("rFont").onclick=e=>{ const b=e.target.closest("button"); if(!b) return; S.font=b.dataset.v; V.setFont(S.font,S.fs); setUI(); save(); };
  $("rFs").onclick=e=>{ const b=e.target.closest("button"); if(!b) return; S.fs=+b.dataset.v; V.setFont(S.font,S.fs); setUI(); save(); };
  $("rPlay").onclick=toggle;
  $("rReader").addEventListener("click", toggle);
  $("rPrev").onclick=()=>{ P.prevSent(); if(!P.playing) idle(); };
  $("rNext").onclick=()=>{ P.nextSent(); if(!P.playing) idle(); };
  $("rRestart").onclick=()=>{ stopPlay(); P.fi=0; rampFrom=0; run={words:0,ms:0}; ST.pos[text.id]=0; $("rEnd").hidden=true; $("rQuiz").hidden=true; idle(); V.cap.textContent="Торкнись, щоб почати"; save(); };
  $("rCtx").addEventListener("click", e=>{ const s=e.target.closest("[data-i]"); if(!s) return; P.seekTok(+s.dataset.i); rampFrom=P.tok(); idle(); V.cap.textContent="Пауза"; });
  $("rPick").onclick=openPicker;

  /* ---- Вибір і додавання текстів ---- */
  function openPicker(){
    stopPlay(); if(text) idle();
    const m=$("dlg"), c=$("dlgCard");
    const item=t=>{ const n=wordCount(t.body), p=ST.pos[t.id]||0, pc=p>0?Math.min(99,Math.round(100*p/n))+"%":"";
      return `<div class="titem ${text&&t.id===text.id?"cur":""}" data-id="${esc(t.id)}"><div class="tn"><div>${esc(t.title)}</div><div>${fmtN(n)} ${plural(n,"слово","слова","слів")} · ~${fmtDur(n/S.wpm*60000)} на ${S.wpm}${t.q?" · є запитання":""}</div></div><span class="pc">${pc}</span>${t.custom?`<button class="btn icon ghost" data-del="${esc(t.id)}" title="Видалити" aria-label="Видалити текст"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>`:""}</div>`; };
    c.innerHTML = `<h2>Обери текст</h2><div class="tlist">
      <div class="tgrp">Українською</div>${TEXTS.filter(t=>t.lang==="uk").map(item).join("")}
      <div class="tgrp">English</div>${TEXTS.filter(t=>t.lang==="en").map(item).join("")}
      <div class="tgrp">Мої тексти</div>${ST.custom.length?ST.custom.map(item).join(""):`<div class="hint" style="padding:4px 8px">Встав свій текст або відкрий файл .txt — статтю, розділ книжки, конспект.</div>`}
      </div><div class="row sb"><button class="btn" id="pAdd">+ Свій текст</button><button class="btn primary" id="pClose">Закрити</button></div>`;
    m.hidden=false;
    m.onclick = async e => {
      const del=e.target.closest("[data-del]");
      if(del){ const t=textById(del.dataset.del); m.hidden=true;
        if(await ask("Видалити текст?", `«${t.title}» буде видалено з «Моїх текстів».`, "Видалити", true)){
          ST.custom=ST.custom.filter(x=>x.id!==t.id); delete ST.pos[t.id]; save(); if(text&&text.id===t.id) setText(TEXTS[0].id); }
        openPicker(); return; }
      const it=e.target.closest(".titem"); if(it){ m.hidden=true; setText(it.dataset.id); return; }
      if(e.target.closest("#pAdd")){ editor(); return; }
      if(e.target.closest("#pClose") || e.target===m) m.hidden=true;
    };
  }
  function editor(pref){
    const m=$("dlg"), c=$("dlgCard");
    c.innerHTML = `<h2>Свій текст</h2>
      <input type="text" id="eTitle" placeholder="Назва (необов'язково)" maxlength="80">
      <textarea id="eBody" placeholder="Встав сюди текст для читання"></textarea>
      <div class="row sb"><label class="btn"><input type="file" id="eFile" accept=".txt,text/plain" hidden>Відкрити .txt</label><span class="hint mono" id="eCnt">0 слів</span></div>
      <div class="row end"><button class="btn" id="eCancel">Скасувати</button><button class="btn primary" id="eSave">Зберегти й читати</button></div>`;
    m.hidden=false;
    const body=$("eBody"), cnt=()=>{ const n=wordCount(body.value); $("eCnt").textContent=`${fmtN(n)} ${plural(n,"слово","слова","слів")}`; };
    if(pref){ body.value=pref; cnt(); }
    body.oninput=cnt; body.focus();
    $("eFile").onchange=e=>{ const f=e.target.files[0]; if(!f) return;
      const rd=(enc,cb)=>{ const r=new FileReader(); r.onload=()=>cb(String(r.result)); r.readAsText(f,enc); };
      rd("utf-8", s=>{ const fin=s=>{ body.value=s; if(!$("eTitle").value) $("eTitle").value=f.name.replace(/\.[^.]+$/,""); cnt(); };
        if(s.includes("\uFFFD")) rd("windows-1251", fin); else fin(s); }); };
    m.onclick = e => {
      if(e.target.closest("#eCancel") || e.target===m){ m.hidden=true; return; }
      if(e.target.closest("#eSave")){
        const b=body.value.trim(), n=wordCount(b);
        if(n<5){ toast("Додай хоча б кілька речень","w"); return; }
        const title=$("eTitle").value.trim() || tokenize(b).slice(0,5).map(t=>t.w).join(" ").replace(/[.,;:!?…]+$/,"")+"…";
        const t={ id:"c"+Date.now().toString(36), title, body:b, lang:/[а-яіїєґ]/i.test(b)?"uk":"en", custom:true };
        ST.custom.push(t);
        try{ localStorage.setItem(KEY, JSON.stringify(ST)); }catch(err){ ST.custom.pop(); toast("Текст завеликий, щоб зберегти його в телефоні. Спробуй коротший уривок.","e"); return; }
        m.hidden=true; setText(t.id); toast("Текст збережено","ok");
      }
    };
  }
  V.setFont(S.font, S.fs); setUI();
  return { enter:()=>{ if(!text) setText(ST.cur); else { setUI(); idle(); V.cap.textContent = P.tok()>0?"Торкнись, щоб продовжити":"Торкнись, щоб почати"; } },
    leave:()=>{ if(P.playing){ pause(); } }, toggle, prev:()=>{ P.prevSent(); if(!P.playing) idle(); }, next:()=>{ P.nextSent(); if(!P.playing) idle(); },
    faster:()=>setW(S.wpm+25), slower:()=>setW(S.wpm-25), refit:()=>V.refit(),
    share:t=>{ stopPlay(); editor(String(t||"")); } };
})();
