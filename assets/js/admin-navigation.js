(()=>{"use strict";
const setup=()=>{
  const panel=document.getElementById("admin-panel");
  const grid=panel?.querySelector(".admin-grid");
  const aside=grid?.querySelector("aside");
  const survey=grid?.querySelector(":scope > section.admin-box");
  const org=aside?.querySelector(":scope > section.admin-box");
  const team=document.getElementById("members-panel");
  const readiness=document.getElementById("commercial-panel");
  const create=document.getElementById("create-panel");
  const billing=document.getElementById("billing-panel");
  if(!panel||!grid||!aside||!survey||!org||!team||!readiness||!create||!billing)return;
  const shell=document.createElement("div");shell.className="gima-admin-shell";
  const sidebar=document.createElement("nav");sidebar.className="gima-admin-sidebar";sidebar.setAttribute("aria-label","Menu dashboard admin");
  const brand=document.createElement("div");brand.className="gima-sidebar-brand";brand.innerHTML="<span class=\"gima-brand-mark\" aria-hidden=\"true\">◆</span><span>GIMA <b>Analytics</b><small>MANAGEMENT CONSOLE</small></span>";sidebar.append(brand);
  const mobileLabel=document.createElement("label");mobileLabel.textContent="Pilih menu";mobileLabel.htmlFor="gima-mobile-nav";mobileLabel.className="gima-mobile-label";sidebar.append(mobileLabel);
  const mobile=document.createElement("select");mobile.id="gima-mobile-nav";mobile.className="gima-mobile-nav";mobile.setAttribute("aria-label","Pilih menu dashboard");sidebar.append(mobile);
  const navList=document.createElement("div");navList.className="gima-sidebar-links";sidebar.append(navList);
  const main=document.createElement("div");main.className="gima-admin-main";
  const groups=[
    ["overview","Dashboard","layout-dashboard",[org,readiness]],
    ["surveys","Survei","clipboard-list",[create,survey]],
    ["respondents","Responden","users-round",[]],
    ["analysis","Analisis","chart-column",[]],
    ["reports","Laporan","file-chart-column",[]],
    ["settings","Pengaturan","settings",[]],
    ["team","Tim Organisasi","users",[team]],
    ["billing","Kontrak & Tagihan","receipt",[billing]]
  ];
  const sections=new Map(),buttons=new Map();
  for(const [key,label,icon,nodes] of groups){
    const section=document.createElement("section");section.className="gima-admin-view";section.dataset.view=key;section.setAttribute("aria-label",label);
    const title=document.createElement("h2");title.className="gima-view-heading";title.textContent=label;section.append(title);
    for(const node of nodes){node.style.marginTop="0";section.append(node);}
    main.append(section);sections.set(key,section);
    const btn=document.createElement("button");btn.type="button";btn.className="gima-sidebar-link";const symbol=document.createElement("span");symbol.className="gima-nav-icon";symbol.setAttribute("aria-hidden","true");symbol.textContent=({"layout-dashboard":"▦","clipboard-list":"▤","users":"♙","receipt":"▧","users-round":"♧","chart-column":"▥","file-chart-column":"▣","settings":"⚙"})[icon]||"•";btn.append(symbol,document.createTextNode(label));btn.dataset.target=key;btn.addEventListener("click",()=>select(key));navList.append(btn);buttons.set(key,btn);
    const option=document.createElement("option");option.value=key;option.textContent=label;mobile.append(option);
  }
  const makePanel=(key,description)=>{
    const view=sections.get(key);
    const panel=document.createElement("div");panel.className="admin-box gima-feature-panel";
    const intro=document.createElement("p");intro.className="admin-meta";intro.textContent=description;panel.append(intro);view.append(panel);
    return panel;
  };
  const linkButton=(label,callback)=>{
    const button=document.createElement("button");button.type="button";button.className="btn outline";button.textContent=label;button.addEventListener("click",callback);return button;
  };
  const surveyCards=(panel,mode)=>{
    const old=panel.querySelector(".gima-feature-list");if(old)old.remove();
    const list=document.createElement("div");list.className="gima-feature-list";panel.append(list);
    const cards=[...document.querySelectorAll("#survey-list .admin-survey")];
    if(!cards.length){const empty=document.createElement("p");empty.className="admin-meta";empty.textContent="Belum ada survei yang dapat ditampilkan.";list.append(empty);return;}
    for(const card of cards){
      const item=document.createElement("div");item.className="gima-feature-row";
      const name=document.createElement("strong");name.textContent=card.querySelector("h3")?.textContent||"Survei";
      const actions=document.createElement("div");actions.className="gima-feature-actions";
      const report=[...card.querySelectorAll("button")].find(b=>b.textContent.trim()==="Laporan");
      const share=[...card.querySelectorAll("button")].find(b=>b.textContent.includes("Salin Link"));
      if(mode==="respondents"){
        if(share)actions.append(linkButton("Salin link pengisian",()=>share.click()));
        if(report)actions.append(linkButton("Lihat ringkasan respons",()=>{select("surveys");report.click();}));
      }else if(report)actions.append(linkButton(mode==="analysis"?"Buka analisis":"Buka laporan",()=>{select("surveys");report.click();}));
      item.append(name,actions);list.append(item);
    }
  };
  const respondentPanel=makePanel("respondents","Kelola akses pengisian survei dan lihat ringkasan respons tanpa membuka identitas individu. Jumlah respons hanya ditampilkan pada laporan yang memenuhi ambang privasi.");
  const analysisPanel=makePanel("analysis","Analisis memakai hasil nyata dari fungsi ringkasan survei Supabase. Pilih survei untuk membuka analitik yang sudah tersedia.");
  const reportsPanel=makePanel("reports","Laporan survei tersedia pada modul survei, dengan perlindungan minimum lima respons valid per pertanyaan.");
  const settingsPanel=makePanel("settings","Pengaturan organisasi dan anggota menggunakan fungsi yang sudah tersedia. Perubahan profil perusahaan, rekening, dan logo belum tersedia.");
  settingsPanel.append(linkButton("Buka pengaturan organisasi",()=>{select("overview");org.scrollIntoView({behavior:"smooth",block:"start"});}),linkButton("Kelola tim organisasi",()=>select("team")));
  const refreshFeatures=()=>{surveyCards(respondentPanel,"respondents");surveyCards(analysisPanel,"analysis");surveyCards(reportsPanel,"reports");};
  document.addEventListener("gima:surveys-loaded",()=>requestAnimationFrame(refreshFeatures));
  refreshFeatures();
  // Mockup-inspired overview: live counts only, no invented analytics.
  const overview=sections.get("overview");
  const heading=overview.querySelector(".gima-view-heading");heading.textContent="Dashboard";
  const kpis=document.createElement("div");kpis.className="gima-kpi-grid";
  const stats=[
    ["Total Survei","stat-total","Survei dalam organisasi"],
    ["Survei Aktif","stat-published","Telah dipublikasikan"],
    ["Survei Draft","stat-draft","Belum dipublikasikan"],
    ["Peran Akun",null,"Hak akses organisasi"]
  ];
  for(const [label,id,note] of stats){
    const card=document.createElement("article");card.className="gima-kpi-card";
    const caption=document.createElement("span");caption.textContent=label;
    const value=document.createElement("strong");value.textContent="—";
    const hint=document.createElement("small");hint.textContent=note;
    card.append(caption,value,hint);kpis.append(card);
    card.dataset.statSource=id||"org-role";
  }
  const refreshKpis=()=>{
    for(const card of kpis.children){
      const source=document.getElementById(card.dataset.statSource);
      const raw=source?.textContent?.trim()||"";
      const value=card.querySelector("strong");
      if(!value)continue;
      value.textContent=card.dataset.statSource==="org-role"?(raw.replace(/^Peran:\s*/i,"")||"—"):(raw||"0");
    }
  };
  document.addEventListener("gima:surveys-loaded",refreshKpis);
  const orgSelector=document.getElementById("org-select");
  if(orgSelector)orgSelector.addEventListener("change",()=>requestAnimationFrame(refreshKpis));
  refreshKpis();
  overview.insertBefore(kpis,org);
  const dashboardGrid=document.createElement("div");dashboardGrid.className="gima-overview-grid";
  overview.append(dashboardGrid);dashboardGrid.append(org,readiness);
  const orgHeading=org.querySelector("h2");if(orgHeading)orgHeading.textContent="Organisasi & Pengaturan";
  const readyHeading=readiness.querySelector("h2");if(readyHeading)readyHeading.textContent="Ringkasan Operasional";
  const sidebarFoot=document.createElement("div");sidebarFoot.className="gima-sidebar-foot";sidebarFoot.textContent="People Analytics • HR Survey";sidebar.append(sidebarFoot);
  const email=panel.querySelector(":scope > .admin-meta");if(email)main.prepend(email);
  grid.replaceWith(shell);shell.append(sidebar,main);
  const select=key=>{
    if(!sections.has(key))key="overview";
    for(const [id,section] of sections){section.classList.toggle("gima-view-active",id===key);}
    for(const [id,btn] of buttons){btn.classList.toggle("is-active",id===key);btn.setAttribute("aria-current",id===key?"page":"false");}
    mobile.value=key;
    if(window.location.hash!=="#"+key)history.replaceState(null,"","#"+key);
    window.scrollTo({top:0,behavior:"instant"});
  };
  mobile.addEventListener("change",()=>select(mobile.value));
  window.addEventListener("hashchange",()=>select(window.location.hash.slice(1)));
  select(window.location.hash.slice(1)||"overview");
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();