/* ===== Тест «На якій швидкості ти зламаєшся?» ===== */
const STEPS = [250,300,375,450,550,700,900];
const LADDER = [150,200].concat(STEPS);
const AVG = 250;  // звичайна швидкість дорослого читача
const goodQ = r => r.n && r.ok/r.n >= 0.66;
const TestUI = (function(){
  const V=View($("tReader")), P=Player(V);
  const T={ text:null, stepLen:1, broke:null, comfort:null, curW:null, running:false, paused:false, cd:0 };
  const stepAt = i => Math.min(STEPS.length-1, Math.floor(i/T.stepLen));
  P.speed = i => T.comfort!=null ? T.comfort : STEPS[stepAt(i)];
  P.onFrame = (f, w) => {
    if(w!==T.curW){ V.speed(w, T.curW!=null); T.curW=w; }
    $("tProg").style.width = (100*(f.e+1)/P.toks.length).toFixed(1)+"%";
    ST.read.words += f.n; ST.read.days[dayKey()] = (ST.read.days[dayKey()]||0) + f.n;
  };
  P.onEnd = finish;

  function show(which){ ["tIntro","tRun","tQuiz","tRes"].forEach(id=>$(id).hidden = id!==which); $("main").scrollTop=0; }
  function intro(){
    $("tSteps").innerHTML = STEPS.map(s=>`<span class="chip">${s}</span>`).join('<span class="arr">→</span>') + '<span class="hint" style="margin-left:4px">слів/хв</span>';
    document.querySelectorAll("#tLang button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.v===ST.set.lang));
    const r=ST.tests[ST.tests.length-1];
    $("tLast").innerHTML = r ? `Останній тест (${fmtDate(r.d)}): комфортна <b>${r.cf}</b>, межа <b>${r.br==null?STEPS[STEPS.length-1]+"+":r.br}</b> слів/хв, розуміння <b>${r.ok}/${r.n}</b>` : "";
    show("tIntro");
  }
  function pickText(){
    const pool=TEXTS.filter(t=>t.lang===ST.set.lang && t.q);
    let fresh=pool.filter(t=>!ST.used.includes(t.id));
    if(!fresh.length){ ST.used=ST.used.filter(id=>!pool.some(t=>t.id===id)); fresh=pool; }
    return fresh[Math.floor(Math.random()*fresh.length)];
  }
  function countdown(cb){ let n=3; clearTimeout(T.cd);
    const step=()=>{ if(n===0){ cb(); return; } V.show(String(n), true, true); n--; T.cd=setTimeout(step, 600); }; step(); }
  function start(){
    T.text=pickText(); const toks=tokenize(T.text.body);
    P.load(toks, 1, true, 0); T.stepLen=Math.ceil(toks.length/STEPS.length);
    T.broke=null; T.comfort=null; T.curW=null; T.paused=false; T.running=false;
    show("tRun");
    V.setFont(ST.set.font, ST.set.fs); V.overlay(null);
    $("tBreak").textContent="Зламався"; $("tBreak").disabled=false; $("tProg").style.width="0";
    V.cap.textContent = T.text.title;
    V.speed(STEPS[0]);
    T.running=true;
    countdown(()=>{ wakeOn(); P.play(); });
  }
  function brk(){
    if(!T.running || T.paused || !P.playing) return;
    const f=P.fr[Math.max(0,P.fi-1)], cur=P.speed(f?f.s:0);
    const idx=LADDER.indexOf(cur), lower=idx>0?LADDER[idx-1]:LADDER[0];
    const first = T.broke==null;
    if(first) T.broke=cur;
    T.comfort=lower;
    const b=$("tBreak");
    if(lower<=LADDER[0]){ b.textContent="Повільніше вже нікуди"; b.disabled=true; } else b.textContent="Знову не встигаю";
    toast(first ? `Межа: ${cur} слів/хв. Далі — ${lower}` : `Далі — ${lower} слів/хв`, "w");
  }
  function pause(){ if(!T.running || T.paused) return; clearTimeout(T.cd); P.pause(); T.paused=true; wakeOff();
    V.overlay(`<b>Пауза</b><span class="hint">Торкнись, щоб продовжити</span>`); }
  function resume(){ if(!T.paused) return; T.paused=false; V.overlay(null); countdown(()=>{ wakeOn(); P.play(); }); }
  function stop(){ clearTimeout(T.cd); P.stop(); T.running=false; T.paused=false; wakeOff(); save(); intro(); }
  function finish(){
    T.running=false; wakeOff();
    if(T.comfort==null) T.comfort=STEPS[STEPS.length-1];
    show("tQuiz");
    runQuiz($("tQuiz"), T.text, result);
  }
  function result(ok, n){
    const prevBest = Math.max(0, ...ST.tests.filter(goodQ).map(r=>r.cf));
    const rec={ d:Date.now(), id:T.text.id, lang:T.text.lang, br:T.broke, cf:T.comfort, ok, n, w:P.toks.length };
    ST.tests.push(rec); if(!ST.used.includes(rec.id)) ST.used.push(rec.id); save();
    const eff=Math.round(rec.cf*ok/n), good=goodQ(rec);
    const li=LADDER.indexOf(rec.cf), lower=li>0?LADDER[li-1]:rec.cf;
    const train = good ? rec.cf : lower;
    const times = (rec.cf/AVG).toFixed(1).replace(".",",");
    let notes="";
    if(rec.br==null) notes+=`<div class="note ok">Ти не зламався навіть на ${rec.cf} слів/хв. Спробуй «Читання» з вищою швидкістю.</div>`;
    if(good && prevBest && rec.cf>prevBest) notes+=`<div class="note ok">Новий рекорд комфортної швидкості! Попередній — ${prevBest} слів/хв.</div>`;
    if(good) notes+= rec.cf>AVG ? `<div class="note">Це приблизно в ${times} раза швидше за звичайне читання (≈${AVG} слів/хв) — і з розумінням.</div>`
                                : `<div class="note">Звичайна швидкість дорослого читача — близько ${AVG} слів/хв. Тренування в «Читанні» допоможе її підняти.</div>`;
    else notes+=`<div class="note w">Розуміння низьке: швидкість поки випереджає увагу. Тренуйся на сходинку нижче — ${lower} слів/хв, поки не відповідатимеш на всі запитання.</div>`;
    $("tRes").innerHTML = `<div class="ph">Результат <span class="hint">${esc(T.text.title)}</span></div>
      <div class="lbl">Комфортна швидкість</div>
      <div class="big-res" style="margin:4px 0 12px"><span class="n">${rec.cf}</span><span class="u">слів/хв</span></div>
      <div class="stats" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:12px">
        <div class="stat"><div class="k">Межа</div><div class="v">${rec.br==null?rec.cf+"+":rec.br}</div><div class="s">«Зламався»</div></div>
        <div class="stat"><div class="k">Розуміння</div><div class="v">${ok}/${n}</div><div class="s">${Math.round(100*ok/n)}%</div></div>
        <div class="stat"><div class="k">Ефективна</div><div class="v">${eff}</div><div class="s">× розуміння</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${notes}</div>
      <div class="row"><button class="btn primary grow" id="tAgain">Ще раз</button><button class="btn grow" id="tTrain">Тренуватися на ${train}</button></div>`;
    $("tAgain").onclick=start;
    $("tTrain").onclick=()=>{ ST.set.wpm=train; save(); App.tab("read"); };
    show("tRes");
  }
  $("tStart").onclick=start;
  $("tBreak").onclick=brk;
  $("tStop").onclick=stop;
  $("tReader").addEventListener("click", ()=>{ if(T.paused) resume(); });
  $("tLang").addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return; ST.set.lang=b.dataset.v; save(); intro(); });
  intro();
  return { leave:pause, brk, isRunning:()=>T.running && !T.paused, refit:()=>V.refit(), hidden:()=>{ if(T.running) pause(); } };
})();
