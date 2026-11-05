/* ===== Прогрес: показники, графік тестів, історія, рекорди Шульте ===== */
const StatsUI = (function(){
  const NS="http://www.w3.org/2000/svg";
  const brV = r => r.br==null ? r.cf : r.br;
  function kpi(){
    const good=ST.tests.filter(goodQ), bestC=good.reduce((a,r)=>r.cf>(a?a.cf:0)?r:a,null);
    const bestB=ST.tests.reduce((a,r)=>brV(r)>(a?brV(a):0)?r:a,null);
    const today=ST.read.days[dayKey()]||0, days=Object.keys(ST.read.days).length;
    const mins=Math.round(ST.read.ms/60000);
    const tile=(k,v,u,s)=>`<div class="stat"><div class="k">${k}</div><div class="v">${v}${u?`<small>${u}</small>`:""}</div><div class="s">${s}</div></div>`;
    $("kpi").innerHTML =
      tile("Комфортна швидкість", bestC?bestC.cf:"—", bestC?"сл/хв":"", bestC?`з розумінням · ${fmtDate(bestC.d)}`:"пройди тест") +
      tile("Межа", bestB?(bestB.br==null?bestB.cf+"+":bestB.br):"—", bestB?"сл/хв":"", bestB?`«Зламався» · ${fmtDate(bestB.d)}`:"ще немає") +
      tile("Прочитано", fmtN(ST.read.words), plural(ST.read.words,"слово","слова","слів"), `сьогодні ${fmtN(today)}`) +
      tile("Час читання", mins<60?mins:(mins/60).toFixed(1).replace(".",","), mins<60?"хв":"год", `${days} ${plural(days,"день","дні","днів")} з читанням`);
  }
  function chart(){
    const box=$("chart"); box.innerHTML="";
    const data=ST.tests.slice(-30);
    if(data.length<2){ box.innerHTML=`<div class="empty">Пройди тест хоча б двічі, щоб побачити графік</div>`; return; }
    const W=Math.max(260, box.clientWidth), H=210, m={l:36,r:78,t:12,b:24};
    const iw=W-m.l-m.r, ih=H-m.t-m.b, n=data.length;
    const vals=data.flatMap(r=>[r.cf,brV(r)]);
    let ymax=Math.ceil(Math.max(...vals)/100)*100, ymin=Math.max(0,Math.floor(Math.min(...vals)/100)*100-100);
    if(ymax-ymin<300) ymax=ymin+300;
    const step = ymax-ymin<=600?100:200;
    const X=i=>m.l+(n===1?iw/2:i*iw/(n-1)), Y=v=>m.t+ih-(v-ymin)/(ymax-ymin)*ih;
    const svg=document.createElementNS(NS,"svg"); svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("height",H);
    svg.setAttribute("role","img"); svg.setAttribute("aria-label","Комфортна швидкість і межа в останніх тестах");
    const el=(tag,attrs,txt)=>{ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(txt!=null) e.textContent=txt; svg.appendChild(e); return e; };
    for(let v=ymin; v<=ymax; v+=step){ el("line",{x1:m.l,x2:m.l+iw,y1:Y(v),y2:Y(v),class:"gl"}); el("text",{x:m.l-6,y:Y(v)+3.5,"text-anchor":"end",class:"ax"},v); }
    const lab=new Set([0,n-1,Math.round((n-1)/2)]);
    data.forEach((r,i)=>{ if(lab.has(i)) el("text",{x:X(i),y:H-6,"text-anchor":i===0?"start":i===n-1?"end":"middle",class:"ax"},fmtDate(r.d)); });
    const series=[{k:"cf",name:"Комфортна",c:"var(--c1)",v:r=>r.cf},{k:"br",name:"Межа",c:"var(--c2)",v:brV}];
    series.forEach(s=>{ el("path",{d:data.map((r,i)=>`${i?"L":"M"}${X(i).toFixed(1)},${Y(s.v(r)).toFixed(1)}`).join(""),fill:"none",stroke:s.c,"stroke-width":2,"stroke-linejoin":"round","stroke-linecap":"round"});
      if(n<=20) data.forEach((r,i)=>el("circle",{cx:X(i),cy:Y(s.v(r)),r:4,fill:s.c,stroke:"var(--panel)","stroke-width":2})); });
    // прямі підписи в кінці ліній, без накладання
    const last=data[n-1]; let y1=Y(last.cf), y2=Y(brV(last));
    if(Math.abs(y1-y2)<14){ const mid=(y1+y2)/2; if(y1>=y2){ y1=mid+7; y2=mid-7; } else { y1=mid-7; y2=mid+7; } }
    el("text",{x:X(n-1)+8,y:y1+4,class:"dl"},"Комфортна"); el("text",{x:X(n-1)+8,y:y2+4,class:"dl"},"Межа");
    const cross=el("line",{x1:0,x2:0,y1:m.t,y2:m.t+ih,stroke:"var(--muted)","stroke-width":1,"stroke-dasharray":"3 3",visibility:"hidden"});
    const hit=el("rect",{x:m.l-10,y:0,width:iw+20,height:H,fill:"transparent"});
    const tip=document.createElement("div"); tip.className="tip"; box.appendChild(tip); box.appendChild(svg);
    function at(clientX){
      const r=svg.getBoundingClientRect(), x=(clientX-r.left)*W/r.width;
      pick(Math.max(0,Math.min(n-1,Math.round((x-m.l)/iw*(n-1)))), true);
    }
    function pick(i, hover){ const d=data[i];
      cross.setAttribute("x1",X(i)); cross.setAttribute("x2",X(i)); cross.setAttribute("visibility",hover?"visible":"hidden");
      tip.innerHTML=""; const dd=document.createElement("div"); dd.className="td"; dd.textContent=`${hover?"":"Останній: "}${fmtDT(d.d)} · ${(textById(d.id)||{}).title||""}`; tip.appendChild(dd);
      const row=(c,name,val)=>{ const e=document.createElement("div"); e.className="tr"; e.innerHTML=`<i style="background:${c}"></i><span></span><b></b>`; e.children[1].textContent=name; e.children[2].textContent=val; tip.appendChild(e); };
      row("var(--c1)","Комфортна",`${d.cf} сл/хв`); row("var(--c2)","Межа",`${d.br==null?d.cf+"+":d.br} сл/хв`); row("var(--muted)","Розуміння",`${d.ok}/${d.n}`);
    }
    const off=()=>pick(n-1,false);
    off();
    hit.addEventListener("pointermove",e=>at(e.clientX)); hit.addEventListener("pointerdown",e=>at(e.clientX)); hit.addEventListener("pointerleave",off);
  }
  function hist(){
    const rows=ST.tests.slice(-40).reverse();
    $("hist").innerHTML = rows.length ? `<table class="tbl"><thead><tr><th>Дата</th><th>Текст</th><th class="n">Межа</th><th class="n">Комф.</th><th class="n">Розум.</th></tr></thead><tbody>${
      rows.map(r=>`<tr><td class="mono">${fmtDate(r.d)}</td><td class="tx">${esc((textById(r.id)||{}).title||r.id)}</td><td class="n">${r.br==null?r.cf+"+":r.br}</td><td class="n">${r.cf}</td><td class="n">${r.ok}/${r.n}</td></tr>`).join("")}</tbody></table>`
      : `<div class="empty">Тут з'являться результати тестів</div>`;
    const sz=[3,4,5,6,7].filter(k=>ST.schulte.runs[k]);
    $("sRec").innerHTML = sz.length ? `<table class="tbl"><thead><tr><th>Таблиця</th><th class="n">Рекорд</th><th class="n">Спроб</th></tr></thead><tbody>${
      sz.map(k=>`<tr><td>${k}×${k}</td><td class="n">${ST.schulte.best[k]?fmtClock(ST.schulte.best[k]):"—"}</td><td class="n">${ST.schulte.runs[k]}</td></tr>`).join("")}</tbody></table>`
      : `<div class="empty">Ще немає результатів</div>`;
  }
  $("resetAll").onclick=async()=>{
    if(!await ask("Скинути прогрес?","Буде видалено результати тестів, статистику читання, позиції в текстах і рекорди Шульте. Налаштування й «Мої тексти» залишаться.","Скинути",true)) return;
    ST.tests=[]; ST.used=[]; ST.pos={}; ST.read={words:0,ms:0,days:{}}; ST.schulte={best:{},runs:{}}; save(); render(); toast("Прогрес скинуто","ok");
  };
  function render(){ kpi(); chart(); hist(); }
  return { enter:render, refit:chart };
})();
