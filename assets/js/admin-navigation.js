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
  const brand=document.createElement("div");brand.className="gima-sidebar-brand";brand.textContent="GIMA Analytics";sidebar.append(brand);
  const mobileLabel=document.createElement("label");mobileLabel.textContent="Pilih menu";mobileLabel.htmlFor="gima-mobile-nav";mobileLabel.className="gima-mobile-label";sidebar.append(mobileLabel);
  const mobile=document.createElement("select");mobile.id="gima-mobile-nav";mobile.className="gima-mobile-nav";mobile.setAttribute("aria-label","Pilih menu dashboard");sidebar.append(mobile);
  const navList=document.createElement("div");navList.className="gima-sidebar-links";sidebar.append(navList);
  const main=document.createElement("div");main.className="gima-admin-main";
  const groups=[
    ["overview","Ringkasan","layout-dashboard",[org,readiness]],
    ["surveys","Survei","clipboard-list",[create,survey]],
    ["team","Tim Organisasi","users",[team]],
    ["billing","Kontrak & Tagihan","receipt",[billing]]
  ];
  const sections=new Map(),buttons=new Map();
  for(const [key,label,,nodes] of groups){
    const section=document.createElement("section");section.className="gima-admin-view";section.dataset.view=key;section.setAttribute("aria-label",label);
    const title=document.createElement("h2");title.className="gima-view-heading";title.textContent=label;section.append(title);
    for(const node of nodes){node.style.marginTop="0";section.append(node);}
    main.append(section);sections.set(key,section);
    const btn=document.createElement("button");btn.type="button";btn.className="gima-sidebar-link";btn.textContent=label;btn.dataset.target=key;btn.addEventListener("click",()=>select(key));navList.append(btn);buttons.set(key,btn);
    const option=document.createElement("option");option.value=key;option.textContent=label;mobile.append(option);
  }
  const email=panel.querySelector(":scope > .admin-meta");if(email)main.prepend(email);
  grid.replaceWith(shell);billing.remove();shell.append(sidebar,main);
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