/* ===== Англійські слова: переклад зі словника WordHunter і список «Вчити у WordHunter» ===== */
const WH_URL = "https://genichka.github.io/trainer/";
const Words = (function(){
  // неправильні форми → початкова (для пошуку в словнику)
  const IRR = {went:"go",gone:"go",was:"be",were:"be",is:"be",are:"be",am:"be",been:"be",had:"have",has:"have",did:"do",does:"do",done:"do",
    made:"make",said:"say",took:"take",taken:"take",came:"come",saw:"see",seen:"see",got:"get",gave:"give",given:"give",found:"find",
    thought:"think",told:"tell",became:"become",left:"leave",felt:"feel",brought:"bring",began:"begin",begun:"begin",kept:"keep",held:"hold",
    wrote:"write",written:"write",stood:"stand",heard:"hear",meant:"mean",met:"meet",ran:"run",paid:"pay",sat:"sit",spoke:"speak",spoken:"speak",
    led:"lead",grew:"grow",grown:"grow",lost:"lose",fell:"fall",fallen:"fall",sent:"send",built:"build",understood:"understand",drew:"draw",
    drawn:"draw",broke:"break",broken:"break",spent:"spend",rose:"rise",drove:"drive",driven:"drive",bought:"buy",wore:"wear",chose:"choose",
    chosen:"choose",ate:"eat",eaten:"eat",drank:"drink",flew:"fly",flown:"fly",forgot:"forget",forgotten:"forget",knew:"know",known:"know",
    slept:"sleep",swam:"swim",threw:"throw",thrown:"throw",woke:"wake",won:"win",sang:"sing",taught:"teach",caught:"catch",fought:"fight",
    sold:"sell",hid:"hide",shot:"shoot",shook:"shake",stole:"steal",hung:"hang",lent:"lend",dug:"dig",fed:"feed",bit:"bite",
    children:"child",men:"man",women:"woman",feet:"foot",teeth:"tooth",mice:"mouse",better:"good",best:"good",worse:"bad",worst:"bad"};
  const norm = w => String(w).toLowerCase().replace(/[’‘`]/g,"'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g,"").replace(/^'+|'+$/g,"");
  function cands(w){
    const out=[w], add=x=>{ if(x && x.length>1 && !out.includes(x)) out.push(x); };
    const strip=(suf,rep="")=>{ if(w.length>suf.length+1 && w.endsWith(suf)) return w.slice(0,-suf.length)+rep; return null; };
    const base=b=>{ if(!b) return; add(b); add(b+"e"); if(/([b-df-hj-np-tv-z])\1$/.test(b)) add(b.slice(0,-1)); };
    if(IRR[w]) add(IRR[w]);
    if(w.endsWith("'s")) add(w.slice(0,-2));
    if(w.endsWith("n't")) add(w.slice(0,-3));
    add(strip("ies","y")); add(strip("ied","y")); add(strip("ier","y")); add(strip("iest","y")); add(strip("ily","y"));
    add(strip("ves","f")); add(strip("ves","fe"));
    if(/(s|x|z|ch|sh|o)es$/.test(w)) add(strip("es"));
    if(/s$/.test(w) && !/ss$/.test(w)) add(strip("s"));
    base(strip("ed")); base(strip("ing")); base(strip("er")); base(strip("est"));
    add(strip("ly"));
    return out;
  }
  /* Слово в позиції i: спершу сталі вирази з 2–3 слів (ice cream), потім форми слова */
  function lookup(toks, i){
    const form=norm(toks[i].w); if(!form) return null;
    for(const n of [3,2]){
      if(i+n>toks.length) continue;
      const parts=[]; let ok=true;
      for(let k=0;k<n;k++){ const w=toks[i+k].w; parts.push(norm(w)); if(k<n-1 && (/[.,;:!?…—–]["»”’)\]]*$/.test(w) || toks[i+k].p!==toks[i].p)) ok=false; }
      const key=parts.join(" ");
      if(ok && DICT[key]) return { en:key, form:key, ua:DICT[key][0], lv:DICT[key][1] };
    }
    // перевага — слову, яке є в рівнях WordHunter (children → child); переклад самої форми лишаємо як gloss
    let exact=null;
    for(const c of cands(form)){ const d=DICT[c]; if(!d) continue;
      if(d[1]) return { en:c, form, ua:d[0], lv:d[1], gloss: exact && exact.ua!==d[0] ? exact.ua : "" };
      if(!exact) exact={ en:c, ua:d[0] }; }
    return exact ? { en:exact.en, form, ua:exact.ua, lv:"" } : { en:form, form, ua:"", lv:"" };
  }
  const has = en => ST.words.some(x=>x.en===en);
  const lvName = lv => WH_LEVELS[lv] || "";
  function add(r){ if(!r || !r.lv || has(r.en)) return false;
    ST.words.push({ en:r.en, ua:r.ua, lv:r.lv, t:Date.now(), sent:false }); save(); render(); return true; }
  function send(){
    const list=ST.words.filter(w=>!w.sent);
    if(!list.length){ toast("Нових слів немає — усі вже передано у WordHunter","w"); return; }
    const url=WH_URL+"#sr-add="+list.map(w=>encodeURIComponent(w.lv)+":"+encodeURIComponent(w.en)).join(",");
    if(NATIVE){ try{ SpeedReadNative.openUrl(url); }catch(e){ toast("Не вдалося відкрити WordHunter","w"); return; } }
    else { const a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener"; document.body.appendChild(a); a.click(); a.remove(); }
    list.forEach(w=>w.sent=true); save(); render();
    toast(`Відкриваю WordHunter: ${list.length} ${plural(list.length,"слово","слова","слів")} — у «Роботу над помилками»`,"ok");
  }
  function render(){
    const box=$("rWords"); if(!box) return;
    const n=ST.words.length, fresh=ST.words.filter(w=>!w.sent).length;
    box.hidden = !n;
    if(!n) return;
    $("rWordsN").textContent = fresh ? `${fresh} ${plural(fresh,"нове","нові","нових")} з ${n}` : `${n} · усі передано`;
    $("rWordsList").innerHTML = ST.words.slice().reverse().map(w=>`<div class="wrow${w.sent?" sent":""}">
        <b>${esc(w.en)}</b><span class="ua">${esc(w.ua)}</span><span class="chip">${esc(lvName(w.lv))}</span>
        ${w.sent?`<span class="ok" title="Передано у WordHunter">✓</span>`:""}
        <button class="btn icon ghost" data-wdel="${esc(w.en)}" title="Прибрати" aria-label="Прибрати ${esc(w.en)}">×</button></div>`).join("");
    $("rWordsSend").textContent = fresh ? `Відкрити у WordHunter (${fresh})` : "Відкрити у WordHunter";
    $("rWordsSend").disabled = !fresh;
    $("rWordsClear").hidden = fresh===n;
  }
  /* Картка слова: переклад, рівень WordHunter, «Вчити у WordHunter», «Читати звідси» */
  function sheet(toks, i, onRead){
    const r=lookup(toks, i); if(!r) { onRead(i); return; }
    const m=$("dlg"), c=$("dlgCard"), inList=has(r.en);
    let head=r.en, formNote = r.form!==r.en ? `<span class="hint">у тексті: ${esc(r.form)}</span>` : "";
    let body, act="";
    if(r.lv && r.gloss){
      head=r.form; formNote="";
      body=`<div class="wua">${esc(r.gloss)}</div><div class="row"><span class="hint">У WordHunter:</span><b class="mono">${esc(r.en)}</b><span>— ${esc(r.ua)}</span><span class="chip">${esc(lvName(r.lv))}</span></div>`;
      act = inList ? `<button class="btn" disabled>✓ Уже в списку</button>` : `<button class="btn primary" data-ws="add">Вчити у WordHunter</button>`;
    } else if(r.ua && r.lv){
      body=`<div class="wua">${esc(r.ua)}</div><div class="row"><span class="chip">${esc(lvName(r.lv))}</span><span class="hint">рівень у WordHunter</span></div>`;
      act = inList ? `<button class="btn" disabled>✓ Уже в списку</button>` : `<button class="btn primary" data-ws="add">Вчити у WordHunter</button>`;
    } else if(r.ua){
      body=`<div class="wua">${esc(r.ua)}</div><p class="hint">Цього слова немає в рівнях WordHunter, тож у тренування воно не додається.</p>`;
    } else {
      body=`<p class="hint">Перекладу немає в словнику WordHunter.</p>`;
    }
    c.innerHTML=`<h2><span class="wen">${esc(head)}</span> ${formNote}</h2>${body}
      <div class="row end"><button class="btn" data-ws="read">Читати звідси</button>${act}<button class="btn ghost" data-ws="close">Закрити</button></div>`;
    m.hidden=false;
    m.onclick=e=>{
      const b=e.target.closest("[data-ws]");
      if(!b){ if(e.target===m) m.hidden=true; return; }
      m.hidden=true;
      if(b.dataset.ws==="add"){ if(add(r)) toast(`«${r.en}» додано у список для WordHunter`,"ok"); onRead(null); }
      else if(b.dataset.ws==="read") onRead(i);
    };
  }
  $("rWordsList").addEventListener("click", e=>{ const b=e.target.closest("[data-wdel]"); if(!b) return;
    ST.words=ST.words.filter(w=>w.en!==b.dataset.wdel); save(); render(); });
  $("rWordsSend").onclick=send;
  $("rWordsClear").onclick=()=>{ ST.words=ST.words.filter(w=>!w.sent); save(); render(); };
  return { lookup, sheet, render, has };
})();
