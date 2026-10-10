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
    ["team","Tim Organisasi","users",[team]],
    ["billing","Kontrak & Tagihan","receipt",[billing]]
  ];
  const sections=new Map(),buttons=new Map();
  for(const [key,label,icon,nodes] of groups){
    const section=document.createElement("section");section.className="gima-admin-view";section.dataset.view=key;section.setAttribute("aria-label",label);
    const title=document.createElement("h2");title.className="gima-view-heading";title.textContent=label;section.append(title);
    for(const node of nodes){node.style.marginTop="0";section.append(node);}
    main.append(section);sections.set(key,section);
    const btn=document.createElement("button");btn.type="button";btn.className="gima-sidebar-link";const symbol=document.createElement("span");symbol.className="gima-nav-icon";symbol.setAttribute("aria-hidden","true");symbol.textContent=({"layout-dashboard":"▦","clipboard-list":"▤","users":"♙","receipt":"▧"})[icon]||"•";btn.append(symbol,document.createTextNode(label));btn.dataset.target=key;btn.addEventListener("click",()=>select(key));navList.append(btn);buttons.set(key,btn);
    const option=document.createElement("option");option.value=key;option.textContent=label;mobile.append(option);
  }
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