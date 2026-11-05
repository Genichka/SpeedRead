/* ===== Спільне: стан, збереження, тости, діалоги, RSVP-рушій ===== */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const KEY = "speedread-v1";
const NATIVE = typeof window.SpeedReadNative !== "undefined";   // запущено як Android-додаток (APK)
const WEB_URL = "https://genichka.github.io/SpeedRead/";
const APK_URL = "https://github.com/Genichka/SpeedRead/releases/download/apk-latest/SpeedRead.apk";
const DEF = { tab:"test",
  set:{ wpm:300, chunk:1, pauses:true, ramp:false, rampTo:500, font:"sans", fs:40, lang:"uk", sSize:5, sShuf:false },
  cur:"uk-eyes", pos:{}, custom:[], tests:[], used:[], words:[],
  read:{ words:0, ms:0, days:{} },
  schulte:{ best:{}, runs:{} } };
function merge(d, s){ for(const k in s){ const a=d[k], b=s[k];
  if(b && typeof b==="object" && !Array.isArray(b) && a && typeof a==="object" && !Array.isArray(a)) merge(a,b); else d[k]=b; } return d; }
function loadState(){ const d=JSON.parse(JSON.stringify(DEF)); try{ const s=JSON.parse(localStorage.getItem(KEY)||"null"); if(s&&typeof s==="object") return merge(d,s); }catch(e){} return d; }
let ST = loadState();
let saveT = 0;
function save(){ clearTimeout(saveT); try{ localStorage.setItem(KEY, JSON.stringify(ST)); }catch(e){} }
function saveSoon(){ clearTimeout(saveT); saveT=setTimeout(save,400); }

let toastT = 0;
function toast(msg, cls=""){ const t=$("toast"); t.textContent=msg; t.className="toast "+cls; t.style.opacity=1; clearTimeout(toastT); toastT=setTimeout(()=>t.style.opacity=0,2600); }

/* Діалог: buttons = [{l:"Текст", v:значення, cls:"primary"}] → Promise(значення або null) */
function dialog(html, buttons){ return new Promise(res=>{ const m=$("dlg"), c=$("dlgCard");
  c.innerHTML = html + `<div class="row end">${buttons.map((b,i)=>`<button class="btn ${b.cls||""}" data-dlg="${i}">${esc(b.l)}</button>`).join("")}</div>`;
  m.hidden=false; const f=c.querySelector(".btn.primary,.btn.danger"); if(f) f.focus();
  const done=v=>{ m.hidden=true; m.onclick=null; document.removeEventListener("keydown",kd); res(v); };
  const kd=e=>{ if(e.key==="Escape") done(null); };
  document.addEventListener("keydown",kd);
  m.onclick=e=>{ const b=e.target.closest("[data-dlg]"); if(b) done(buttons[+b.dataset.dlg].v); else if(e.target===m) done(null); }; }); }
const ask = (title, text, ok, danger) => dialog(`<h2>${esc(title)}</h2><p>${esc(text)}</p>`, [{l:"Скасувати",v:false},{l:ok,v:true,cls:danger?"danger":"primary"}]);

const fmtD = s => String(s).split("-").reverse().join(".");
const dayKey = (t=Date.now()) => { const d=new Date(t); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const fmtDate = t => { const d=new Date(t); return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`; };
const fmtDT = t => { const d=new Date(t); return `${fmtDate(t)}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };
const fmtDur = ms => { const s=Math.max(0,Math.round(ms/1000)); return s<60?`${s} с`:`${Math.floor(s/60)} хв ${String(s%60).padStart(2,"0")} с`; };
const fmtClock = ms => { const s=Math.max(0,ms)/1000; return `${Math.floor(s/60)}:${(s%60).toFixed(1).padStart(4,"0")}`; };
const fmtN = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g," ");
const plural = (n, a, b, c) => { const m10=n%10, m100=n%100; return m10===1&&m100!==11?a: m10>=2&&m10<=4&&(m100<12||m100>14)?b:c; };
const shuffle = a => { for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };

/* Утримання екрана ввімкненим під час читання */
let wakeL = null;
async function wakeOn(){ if(NATIVE){ try{ SpeedReadNative.keepScreen(true); }catch(e){} return; } try{ if("wakeLock" in navigator && !wakeL){ wakeL=await navigator.wakeLock.request("screen"); wakeL.addEventListener("release",()=>{ wakeL=null; }); } }catch(e){} }
function wakeOff(){ if(NATIVE){ try{ SpeedReadNative.keepScreen(false); }catch(e){} return; } try{ if(wakeL) wakeL.release(); }catch(e){} wakeL=null; }

/* ---------- Текст → слова ---------- */
const DASH = /^[—–\-…]+$/;
function tokenize(body){
  const paras = String(body||"").replace(/\r/g,"").split(/\n\s*\n+|\n(?=\s*[—–-]\s)/).map(p=>p.replace(/\s+/g," ").trim()).filter(Boolean);
  const toks=[];
  paras.forEach((p,pi)=>{ let pend="";
    for(const w of p.split(" ")){
      if(DASH.test(w)){ const last=toks[toks.length-1]; if(last && last.p===pi) last.w+=" "+w; else pend+=w+" "; continue; }
      toks.push({ w:pend+w, p:pi }); pend=""; }
    if(toks.length && toks[toks.length-1].p===pi) toks[toks.length-1].pe=true; });
  return toks;
}
const wordCount = body => tokenize(body).length;
const SENT = /[.!?…]["»”’)\]]*$/;
const CLAUSE = /[,;:—–\-]["»”’)\]]*$/;
const coreLen = w => [...w.replace(/[^\p{L}\p{N}]/gu,"")].length;
function multOf(t, single){
  let m = SENT.test(t.w) ? 2 : CLAUSE.test(t.w) ? 1.5 : 1;
  if(single && m===1){ const L=coreLen(t.w); m = L>=13 ? 1.4 : L>=9 ? 1.2 : 1; }
  if(t.pe) m = Math.max(m, 2.6);
  return m;
}
/* Кадри: 1–3 слова; кадр не перетинає кінець речення й абзацу. norm вирівнює середню швидкість до заданої. */
function buildFrames(toks, chunk, pauses){
  const fr=[]; let i=0;
  while(i<toks.length){ let j=i;
    while(j-i+1<chunk && j+1<toks.length && !SENT.test(toks[j].w) && !toks[j].pe && toks[j+1].p===toks[i].p) j++;
    const n=j-i+1;
    fr.push({ s:i, e:j, n, text:toks.slice(i,j+1).map(t=>t.w).join(" "), m: pauses ? multOf(toks[j], n===1) : 1 });
    i=j+1; }
  let a=0, b=0; for(const f of fr){ a+=f.n*f.m; b+=f.n; }
  return { fr, norm: a ? b/a : 1 };
}
/* Опорна літера (ORP): трохи лівіше від середини слова */
function splitOrp(word){
  const ch=[...word]; const m=word.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  const lead=m?[...m[1]].length:0, core=m?[...m[2]].length:ch.length;
  if(!core){ const k=Math.floor((ch.length-1)/2); return [ch.slice(0,k).join(""), ch[k]||"", ch.slice(k+1).join("")]; }
  const k = core<=1?0: core<=5?1: core<=9?2: core<=13?3: 4;
  const idx = lead+k; return [ch.slice(0,idx).join(""), ch[idx], ch.slice(idx+1).join("")];
}

/* ---------- Вікно читалки ---------- */
function View(root){
  root.innerHTML = `<div class="ret t"></div><div class="ret b"></div><div class="word"><span class="wl"></span><span class="wp"></span><span class="wr"></span></div><div class="cap"></div><div class="spd mono"></div><div class="overlay" hidden></div>`;
  const W=root.querySelector(".word"), L=W.children[0], P=W.children[1], R=W.children[2];
  const V = { root, cap:root.querySelector(".cap"), spd:root.querySelector(".spd"), over:root.querySelector(".overlay"), fs:40, last:null };
  const PIV = .38;
  V.setFont = (font, fs) => { root.classList.toggle("f-serif", font==="serif"); root.classList.toggle("f-mono", font==="mono"); V.fs=fs; if(V.last) V.show(...V.last); };
  V.show = (text, single, dim) => {
    V.last=[text, single, dim];
    const cw=root.clientWidth, x=Math.round(cw*PIV);
    root.style.setProperty("--px", x+"px");
    W.classList.toggle("dim", !!dim);
    W.style.fontSize = V.fs+"px";
    if(single){ const [a,b,c]=splitOrp(text); L.textContent=a; P.textContent=b; R.textContent=c; }
    else { L.textContent=text; P.textContent=""; R.textContent=""; }
    let lw=L.offsetWidth, pw=P.offsetWidth, rw=R.offsetWidth, sc=1;
    if(single){ const nl=lw+pw/2, nr=rw+pw/2; sc=Math.min(1, nl>0?(x-10)/nl:1, nr>0?(cw-x-10)/nr:1); }
    else sc=Math.min(1, (cw-24)/Math.max(1,lw));
    if(sc<1){ W.style.fontSize=(V.fs*sc).toFixed(1)+"px"; lw=L.offsetWidth; pw=P.offsetWidth; }
    const tx = single ? x - lw - pw/2 : (cw - L.offsetWidth)/2;
    W.style.transform = `translate(${tx.toFixed(1)}px,-50%)`;
  };
  V.clear = () => { V.last=null; L.textContent=P.textContent=R.textContent=""; };
  V.speed = (w, flash) => { V.spd.textContent = w ? `${w} слів/хв` : ""; if(flash){ V.spd.classList.remove("flash"); void V.spd.offsetWidth; V.spd.classList.add("flash"); } };
  V.overlay = html => { if(html==null){ V.over.hidden=true; V.over.innerHTML=""; } else { V.over.innerHTML=html; V.over.hidden=false; } };
  V.refit = () => { if(V.last) V.show(...V.last); };
  return V;
}

/* ---------- Програвач ---------- */
function Player(view){
  const P = { toks:[], fr:[], norm:1, fi:0, playing:false, timer:0, next:0, chunk:1, pauses:true,
    speed:()=>300, onFrame:null, onEnd:null };
  P.frameOf = t => { let lo=0, hi=P.fr.length-1; while(lo<=hi){ const mid=(lo+hi)>>1, f=P.fr[mid]; if(t<f.s) hi=mid-1; else if(t>f.e) lo=mid+1; else return mid; } return Math.min(Math.max(lo,0), P.fr.length); };
  P.load = (toks, chunk, pauses, startTok=0) => { P.pause(); P.toks=toks; P.chunk=chunk; P.pauses=pauses; const b=buildFrames(toks,chunk,pauses); P.fr=b.fr; P.norm=b.norm; P.fi=P.frameOf(startTok); };
  P.rebuild = (chunk, pauses) => { const was=P.playing, t=P.tok(); P.load(P.toks, chunk, pauses, t); P.showCur(); if(was) P.play(); };
  P.tok = () => P.fr[P.fi] ? P.fr[P.fi].s : P.toks.length;
  P.done = () => P.fi >= P.fr.length;
  P.delay = (f, w) => 60000 / w * f.n * f.m * P.norm;
  P.showCur = () => { const f=P.fr[P.fi]; if(f) view.show(f.text, f.n===1); };
  function tick(){
    if(!P.playing) return;
    const f=P.fr[P.fi];
    if(!f){ P.playing=false; P.onEnd && P.onEnd(); return; }
    view.show(f.text, f.n===1);
    const w=P.speed(f.s); P.onFrame && P.onFrame(f, w);
    const now=performance.now(); if(now-P.next>250) P.next=now;
    P.next += P.delay(f, w); P.fi++;
    P.timer = setTimeout(tick, Math.max(0, P.next-performance.now()));
  }
  P.play = () => { if(P.playing || !P.fr.length) return; if(P.done()) P.fi=0; P.playing=true; P.next=performance.now(); tick(); };
  P.pause = () => { if(!P.playing) return; P.playing=false; clearTimeout(P.timer); if(P.fi>0) P.fi--; };
  P.stop = () => { P.playing=false; clearTimeout(P.timer); };
  P.seekTok = t => { const was=P.playing; P.pause(); P.fi=P.frameOf(Math.max(0,Math.min(t,P.toks.length-1))); P.showCur(); if(was) P.play(); };
  /* межі речень для «назад/вперед» */
  P.sentStart = t => { let i=t; while(i>0 && !SENT.test(P.toks[i-1].w) && !P.toks[i-1].pe) i--; return i; };
  P.prevSent = () => { const t=P.tok(); let s=P.sentStart(Math.min(t,P.toks.length-1)); if(t-s<2 && s>0) s=P.sentStart(s-1); P.seekTok(s); };
  P.nextSent = () => { let i=P.tok(); while(i<P.toks.length-1 && !SENT.test(P.toks[i].w) && !P.toks[i].pe) i++; if(i<P.toks.length-1) P.seekTok(i+1); };
  P.leftMs = w => { let ms=0; for(let i=P.fi;i<P.fr.length;i++) ms+=P.delay(P.fr[i], w); return ms; };
  return P;
}

/* ---------- Запитання на розуміння (спільні для тесту й читання) ---------- */
function runQuiz(box, text, onDone){
  const qs = text.q.map(q=>({ t:q[0], ok:q[1], opts:shuffle(q.slice(1)) }));
  let k=0, good=0;
  const isEn = text.lang==="en";
  function draw(){
    const q=qs[k];
    box.innerHTML = `<div class="qn">${isEn?"Question":"Запитання"} ${k+1} / ${qs.length}</div><div class="qt">${esc(q.t)}</div>
      <div class="opts">${q.opts.map((o,i)=>`<button class="btn" data-o="${i}">${esc(o)}</button>`).join("")}</div>`;
    box.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{
      const pick=q.opts[+b.dataset.o], right=pick===q.ok; if(right) good++;
      box.querySelectorAll("[data-o]").forEach(x=>{ x.disabled=true; if(q.opts[+x.dataset.o]===q.ok) x.classList.add("ok"); });
      if(!right) b.classList.add("bad");
      setTimeout(()=>{ k++; if(k<qs.length) draw(); else onDone(good, qs.length); }, right?650:1300);
    });
  }
  draw();
}
const allTexts = () => TEXTS.concat(WH_TEXTS, ST.custom);
const textById = id => allTexts().find(t=>t.id===id);
