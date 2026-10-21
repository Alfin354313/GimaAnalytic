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
    ["employees","Database Karyawan","users-round",[]],
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
  const featurePanels={
    respondents:makePanel("respondents","Bagikan survei dan pantau kesiapan data responden. Identitas individu tidak ditampilkan."),
    analysis:makePanel("analysis","Analisis agregat berbasis jawaban valid. Hasil dengan kurang dari lima respons disembunyikan."),
    reports:makePanel("reports","Laporan siap ditinjau, dicetak ke PDF, atau diekspor dari hasil survei yang memenuhi batas privasi."),
    settings:makePanel("settings","Informasi akun, organisasi, keamanan akses, dan pengelolaan tim.")
  };
  const addHeading=(root,title)=>{const h=document.createElement("h3");h.textContent=title;root.append(h);};
  const addNote=(root,text)=>{const p=document.createElement("p");p.className="admin-meta";p.textContent=text;root.append(p);};
  const addMetric=(root,label,value,note)=>{
    const card=document.createElement("div");card.className="gima-feature-metric";
    const labelNode=document.createElement("span");labelNode.textContent=label;
    const number=document.createElement("strong");number.textContent=String(value);
    const caption=document.createElement("small");caption.textContent=note;
    card.append(labelNode,number,caption);root.append(card);
  };
  const metricGrid=(root)=>{const grid=document.createElement("div");grid.className="gima-feature-metrics";root.append(grid);return grid;};
  const featureState={orgId:null,rows:[],loading:false};
  const getCards=()=>[...document.querySelectorAll("#survey-list .admin-survey")];
  const makeRows=(root,mode)=>{
    const list=document.createElement("div");list.className="gima-feature-list";root.append(list);
    for(const card of getCards()){
      const item=document.createElement("div");item.className="gima-feature-row";
      const left=document.createElement("div");left.className="gima-feature-description";
      const title=document.createElement("strong");title.textContent=card.querySelector("h3")?.textContent||"Survei";
      const status=card.querySelector(".admin-meta:last-of-type");
      left.append(title);
      if(status)addNote(left,status.textContent);
      const actions=document.createElement("div");actions.className="gima-feature-actions";
      const buttons=[...card.querySelectorAll("button")];
      const report=buttons.find(b=>b.textContent.trim()==="Laporan");
      const share=buttons.find(b=>b.textContent.includes("Salin Link"));
      if(mode==="respondents"){
        if(share)actions.append(linkButton("Salin link survei",()=>share.click()));
        if(report)actions.append(linkButton("Ringkasan jawaban",()=>{select("surveys");report.click();}));
      }else if(report)actions.append(linkButton(mode==="analysis"?"Analisis lengkap":"Lihat laporan & PDF",()=>{select("surveys");report.click();}));
      item.append(left,actions);list.append(item);
    }
    if(!getCards().length)addNote(list,"Belum ada survei di organisasi ini.");
  };
  const surveyData=async()=>{
    const id=document.getElementById("org-select")?.value;
    if(!id||featureState.orgId!==id)return;
    featureState.loading=true;
    const cards=getCards();
    const summaries=[];
    for(let index=0;index<cards.length;index++){
      const report=cards[index].querySelector("button");
      // Survey IDs are supplied from the workspace rather than parsed from visible text.
      // A dedicated event passes the safe IDs in the same order as the rendered survey cards.
      const survey=featureState.rows[index];
      if(!survey?.id)continue;
      const {data,error}=await window.gimaFeatureClient.rpc("gima_survey_summary",{p_survey_id:survey.id});
      if(featureState.orgId!==id)return;
      summaries.push({survey,data:data||[],error});
    }
    featureState.summaries=summaries;featureState.loading=false;renderFeatures();renderExecutive();
  };
  const renderFeatures=()=>{
    const {respondents,analysis,reports,settings}=featurePanels;
    for(const root of Object.values(featurePanels))root.querySelectorAll(".gima-feature-dynamic").forEach(n=>n.remove());
    const area=root=>{const node=document.createElement("div");node.className="gima-feature-dynamic";root.append(node);return node;};
    const rs=area(respondents),an=area(analysis),rp=area(reports),st=area(settings);
    const rows=featureState.rows;
    const summary=featureState.summaries||[];
    const eligible=summary.filter(x=>!x.error&&x.data.some(q=>Number(q.response_count)>=5&&q.average_score!==null));
    addHeading(rs,"Ringkasan pengumpulan");
    let metrics=metricGrid(rs);
    addMetric(metrics,"Total survei",rows.length,"Seluruh status");
    addMetric(metrics,"Survei dipublikasikan",rows.filter(x=>x.status==="published").length,"Dapat menerima respons");
    addMetric(metrics,"Siap dianalisis",eligible.length,"Minimal satu pertanyaan memenuhi ambang privasi");
    addHeading(rs,"Survei & akses responden");makeRows(rs,"respondents");
    addNote(rs,"Jumlah responden unik tidak ditampilkan karena belum tersedia sebagai metrik terverifikasi. Gunakan ringkasan respons per pertanyaan.");
    // Executive analytics summary: this is distinct from the detailed analysis tab.
    an.classList.add("gima-analytics-summary");
    const heading=document.createElement("div");heading.className="gima-analytics-heading";
    const headingText=document.createElement("div");const eyebrow=document.createElement("span");eyebrow.className="gima-analytics-eyebrow";eyebrow.textContent="◈ PEOPLE ANALYTICS";
    const headingTitle=document.createElement("h3");headingTitle.textContent="Ringkasan Hasil Analitik";
    const headingDesc=document.createElement("p");headingDesc.textContent="Pantau hasil survei, lihat kekuatan organisasi, dan temukan prioritas perbaikan.";
    headingText.append(eyebrow,headingTitle,headingDesc);
    const headingArt=document.createElement("div");headingArt.className="gima-analytics-art";headingArt.setAttribute("aria-hidden","true");headingArt.textContent="▥";
    heading.append(headingText,headingArt);an.append(heading);
    metrics=metricGrid(an);metrics.classList.add("gima-analytics-kpis");
    addMetric(metrics,"Survei tersedia",rows.length,"Dalam organisasi");
    addMetric(metrics,"Hasil dapat dianalisis",eligible.length,"Minimal 5 respons valid");
    addMetric(metrics,"Menunggu kecukupan data",summary.filter(x=>!x.error).length-eligible.length,"Menunggu ambang privasi");
    const icons=["▤","◉","◷"];metrics.querySelectorAll(".gima-feature-metric").forEach((card,i)=>{const icon=document.createElement("span");icon.className="gima-analytics-kpi-icon";icon.textContent=icons[i];icon.setAttribute("aria-hidden","true");card.prepend(icon);});
    if(featureState.loading)addNote(an,"Memuat hasil analisis...");
    for(const {survey,data,error} of summary){
      const box=document.createElement("section");box.className="gima-feature-result gima-analytics-result";
      const header=document.createElement("div");header.className="gima-analytics-result-heading";
      const headerCopy=document.createElement("div");const label=document.createElement("span");label.className="gima-analytics-eyebrow";label.textContent="HASIL SURVEI";
      const name=document.createElement("h3");name.textContent=survey.title;headerCopy.append(label,name);header.append(headerCopy);
      if(error){addNote(box,"Analisis belum dapat diakses: "+(error.code||error.message));}
      else{
        const ready=data.filter(q=>Number(q.response_count)>=5&&q.average_score!==null&&Number.isFinite(Number(q.average_score)));
        if(!ready.length)addNote(box,"Belum cukup respons untuk menampilkan skor.");
        else{
          const average=ready.reduce((sum,q)=>sum+Number(q.average_score),0)/ready.length;
          const score=document.createElement("div");score.className="gima-analytics-overall";const scoreValue=document.createElement("strong");scoreValue.textContent=average.toLocaleString("id-ID",{maximumFractionDigits:2});const scoreLabel=document.createElement("span");scoreLabel.textContent="/ 5 • Rata-rata skor";score.append(scoreValue,scoreLabel);header.append(score);
          const chart=document.createElement("div");chart.className="gima-analytics-chart";chart.setAttribute("role","group");chart.setAttribute("aria-label","Skor per pertanyaan dengan rentang 0 sampai 5");
          for(const q of ready.slice(0,8)){
            const value=Math.max(0,Math.min(5,Number(q.average_score)));
            const line=document.createElement("div");line.className="gima-analytics-chart-row";
            const title=document.createElement("span");title.className="gima-analytics-question";title.textContent=q.question_prompt;
            const track=document.createElement("div");track.className="gima-analytics-track";const fill=document.createElement("i");fill.style.width=(value*20)+"%";track.append(fill);
            const scoreText=document.createElement("b");scoreText.textContent=value.toLocaleString("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2})+" / 5";
            line.append(title,track,scoreText);chart.append(line);
          }
          box.append(header,chart);
          const footer=document.createElement("p");footer.className="gima-analytics-caption";footer.textContent=ready.length+" pertanyaan memenuhi ambang privasi. Grafik hanya menggunakan respons yang valid.";box.append(footer);
        }
      }
      if(!box.contains(header))box.prepend(header);
      an.append(box);
    }
    addHeading(an,"Analisis per survei");makeRows(an,"analysis");
    addHeading(rp,"Kesiapan laporan");
    metrics=metricGrid(rp);
    addMetric(metrics,"Total laporan potensial",rows.length,"Satu per survei");
    addMetric(metrics,"Memiliki hasil terbuka",eligible.length,"Ada skor yang lolos batas privasi");
    addMetric(metrics,"Perlu data tambahan",summary.filter(x=>!x.error).length-eligible.length,"Skor belum dapat ditampilkan");
    addHeading(rp,"Daftar laporan");makeRows(rp,"reports");
    addNote(rp,"Gunakan tombol Lihat laporan & PDF untuk membuka laporan resmi, grafik, rekomendasi, unduhan CSV, dan fitur Cetak / Simpan PDF yang sudah tersedia.");
    addHeading(st,"Organisasi aktif");
    const selectOrg=document.getElementById("org-select");
    const orgName=selectOrg?.selectedOptions?.[0]?.textContent||"Belum dipilih";
    const role=document.getElementById("org-role")?.textContent||"Belum diketahui";
    const info=document.createElement("div");info.className="gima-feature-settings";
    for(const [label,value] of [["Nama organisasi",orgName],["Hak akses Anda",role],["Jumlah survei",String(rows.length)]]){
      const item=document.createElement("div");const l=document.createElement("span");l.textContent=label;const v=document.createElement("strong");v.textContent=value;item.append(l,v);info.append(item);
    }
    st.append(info);
    addHeading(st,"Pengelolaan");
    const controls=document.createElement("div");controls.className="gima-feature-actions";
    controls.append(linkButton("Pilih organisasi",()=>{select("overview");org.scrollIntoView({behavior:"smooth",block:"start"});}),linkButton("Kelola anggota tim",()=>select("team")),linkButton("Kontrak & tagihan",()=>select("billing")));
    st.append(controls);
    addHeading(st,"Keamanan & privasi");
    addNote(st,"Hak akses dikendalikan oleh Supabase Row Level Security. Analitik hanya menampilkan agregat yang memenuhi ambang minimum lima respons valid per pertanyaan.");
    addNote(st,"Perubahan email, kata sandi, logo organisasi, dan rekening pembayaran belum tersedia melalui panel ini.");
  };
  document.addEventListener("gima:surveys-loaded",event=>{
    const detail=event.detail||{};
    if(detail.orgId){featureState.orgId=detail.orgId;featureState.rows=detail.surveys||[];featureState.summaries=[];}
    requestAnimationFrame(renderFeatures);
    if(detail.orgId&&window.gimaFeatureClient){surveyData();fetchResponseCounts(detail.orgId);}
  });
  renderFeatures();
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
  // Executive metrics use only privacy-cleared survey summaries. No synthetic data.
  const executive=document.createElement("div");executive.className="gima-executive";
  const execCards=document.createElement("div");execCards.className="gima-exec-cards";
  const visualGrid=document.createElement("div");visualGrid.className="gima-visual-grid";
  executive.append(execCards,visualGrid);
  const executiveCard=(label,value,description)=>{
    const card=document.createElement("article");card.className="gima-exec-card";
    const small=document.createElement("span");small.textContent=label;
    const number=document.createElement("strong");number.textContent=value;
    const note=document.createElement("small");note.textContent=description;
    card.append(small,number,note);execCards.append(card);
  };
  const chartBox=(label,description)=>{
    const card=document.createElement("section");card.className="gima-exec-chart";
    const heading=document.createElement("h3");heading.textContent=label;
    const note=document.createElement("p");note.className="admin-meta";note.textContent=description;
    const body=document.createElement("div");body.className="gima-exec-chart-body";
    card.append(heading,note,body);visualGrid.append(card);return body;
  };
  let responseCounts={orgId:null,rows:null,error:null,loading:false};
  let responseRequestId=0;
  const fetchResponseCounts=async(orgId)=>{
    if(!orgId||!window.gimaFeatureClient)return;
    const requestId=++responseRequestId;
    responseCounts={orgId,rows:null,error:null,loading:true};
    renderExecutive();
    try{
      const {data,error}=await window.gimaFeatureClient.rpc("gima_dashboard_response_counts",{p_organization_id:orgId});
      if(requestId!==responseRequestId||document.getElementById("org-select")?.value!==orgId)return;
      responseCounts={orgId,rows:error?null:(data||[]),error,loading:false};
    }catch(error){
      if(requestId!==responseRequestId||document.getElementById("org-select")?.value!==orgId)return;
      responseCounts={orgId,rows:null,error,loading:false};
    }
    renderExecutive();
  };
  const renderExecutive=()=>{
    execCards.replaceChildren();visualGrid.replaceChildren();
    const summaries=(featureState.summaries||[]).filter(x=>!x.error);
    const valid=summaries.flatMap(x=>x.data.filter(q=>Number(q.response_count)>=5&&q.average_score!==null).map(q=>({...q,surveyTitle:x.survey.title})));
    const avg=arr=>arr.length?arr.reduce((n,q)=>n+Number(q.average_score),0)/arr.length:null;
    const percent=n=>n===null?"—":(n/5*100).toFixed(1)+"%";
    const engagement=valid.filter(q=>/engage|keterlibatan|komitmen|motivasi|antusias|bangga/i.test(q.question_prompt));
    const satisfaction=valid.filter(q=>/puas|kepuasan|satisfaction/i.test(q.question_prompt));
    const consistentCounts=summaries.map(x=>{
      const counts=x.data.filter(q=>Number(q.response_count)>=5&&q.average_score!==null).map(q=>Number(q.response_count));
      return counts.length&&counts.every(n=>n===counts[0])?counts[0]:null;
    });
    const counts=responseCounts.orgId===featureState.orgId?responseCounts:null;
    const totalResponses=counts?.rows?.reduce((sum,row)=>sum+Number(row.response_count||0),0);
    executiveCard("Total Pengisian Survei",counts?.loading?"Memuat...":counts?.error?"—":counts?.rows?new Intl.NumberFormat("id-ID").format(totalResponses):"—",counts?.error?"Gagal memuat data: "+(counts.error.code||counts.error.message):"Jumlah pengisian yang menyetujui penggunaan data; bukan orang unik lintas survei");
    executiveCard("Engagement Score",percent(avg(engagement)),engagement.length+" pertanyaan relevan • indeks skor 1–5, bukan ukuran tervalidasi");
    executiveCard("Tingkat Kepuasan",percent(avg(satisfaction)),satisfaction.length+" pertanyaan relevan • indeks skor, bukan persentase karyawan puas");
    executiveCard("Turnover Rate","—","Memerlukan data HR karyawan keluar dan rata-rata headcount");
    const trend=chartBox("Tren Engagement","Perbandingan hanya dari survei berbeda dengan pertanyaan engagement yang identik.");
    const comparable=new Map();
    for(const entry of summaries){
      for(const q of entry.data){
        if(Number(q.response_count)<5||q.average_score===null||!/engage|keterlibatan|komitmen|motivasi|antusias|bangga/i.test(q.question_prompt))continue;
        const key=q.question_prompt.trim().toLocaleLowerCase("id");
        if(!comparable.has(key))comparable.set(key,[]);
        comparable.get(key).push({survey:entry.survey.title,score:Number(q.average_score)});
      }
    }
    const repeat=[...comparable.values()].filter(x=>x.length>=2);
    if(repeat.length){
      const uniqueSurveys=[...new Set(repeat.flatMap(x=>x.map(y=>y.survey)))];
      if(uniqueSurveys.length>=2){
        addNote(trend,"Perbandingan lintas survei berdasarkan pertanyaan identik. Urutan mengikuti daftar survei, bukan urutan kronologis.");
        for(const title of uniqueSurveys){
          const values=repeat.flatMap(series=>series.filter(x=>x.survey===title).map(x=>x.score));
          if(!values.length)continue;
          const row=document.createElement("div");row.className="gima-exec-bar-row";
          const label=document.createElement("span");label.textContent=title;
          const track=document.createElement("div");track.className="gima-feature-track";
          const fill=document.createElement("i");const score=values.reduce((a,b)=>a+b,0)/values.length;
          fill.style.width=Math.max(0,Math.min(100,score*20))+"%";track.append(fill);
          const number=document.createElement("b");number.textContent=score.toFixed(2)+"/5";
          row.append(label,track,number);trend.append(row);
        }
      }else addNote(trend,"Belum tersedia survei berbeda dengan pertanyaan engagement yang sebanding.");
    }else addNote(trend,"Belum tersedia survei berulang dengan pertanyaan engagement identik dan minimal lima respons valid.");
    const dimension=chartBox("Skor per Dimensi","Pengelompokan indikatif berdasarkan kata kunci pertanyaan, bukan dimensi yang sudah divalidasi.");
    const buckets=[
      ["Kepemimpinan",/pimpin|atasan|supervisor|manajer/i],
      ["Lingkungan Kerja",/lingkungan|fasilitas|budaya|rekan/i],
      ["Pengembangan",/karier|karir|pelatihan|pengembang|promosi/i],
      ["Kompensasi",/kompensasi|gaji|insentif|tunjangan/i],
      ["Work-Life Balance",/beban kerja|work.life|keseimbangan/i]
    ];
    let plotted=0;
    for(const [label,pattern] of buckets){
      const values=valid.filter(q=>pattern.test(q.question_prompt));
      const score=avg(values);if(score===null)continue;plotted++;
      const row=document.createElement("div");row.className="gima-exec-bar-row";
      const name=document.createElement("span");name.textContent=label;
      const track=document.createElement("div");track.className="gima-feature-track";
      const fill=document.createElement("i");fill.style.width=Math.max(0,Math.min(100,score*20))+"%";track.append(fill);
      const value=document.createElement("b");value.textContent=score.toFixed(2)+"/5";
      row.append(name,track,value);dimension.append(row);
    }
    if(!plotted)addNote(dimension,"Belum ada pertanyaan yang memenuhi ambang privasi dan kategori dimensi.");
    const distribution=chartBox("Distribusi Responden","Memerlukan kategori responden agregat dan izin akses yang sesuai.");
    addNote(distribution,"Data distribusi jabatan atau unit kerja belum tersedia. Tidak menampilkan identitas atau proporsi rekaan.");
    const sentiment=chartBox("Sentimen Karyawan","Analisis sentimen memerlukan jawaban teks dan metode klasifikasi yang jelas.");
    addNote(sentiment,"Belum tersedia analisis sentimen terverifikasi. Skor Likert tidak otomatis berarti sentimen positif atau negatif.");
  };
  document.addEventListener("gima:surveys-loaded",()=>requestAnimationFrame(renderExecutive));
  renderExecutive();
  overview.insertBefore(executive,org);

  const dashboardGrid=document.createElement("div");dashboardGrid.className="gima-overview-grid";
  overview.append(dashboardGrid);dashboardGrid.append(org,readiness);
  const orgHeading=org.querySelector("h2");if(orgHeading)orgHeading.textContent="Organisasi & Pengaturan";
  const readyHeading=readiness.querySelector("h2");if(readyHeading)readyHeading.textContent="Ringkasan Operasional";
  const sidebarFoot=document.createElement("div");sidebarFoot.className="gima-sidebar-foot";sidebarFoot.textContent="People Analytics • HR Survey";sidebar.append(sidebarFoot);
  // Show the original Dashboard Admin header only on the Dashboard view.
  const dashboardHeading=document.querySelector(".admin-workspace > .admin-heading");
  if(dashboardHeading)sections.get("overview").prepend(dashboardHeading);
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