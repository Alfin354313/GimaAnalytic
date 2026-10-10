(()=>{"use strict";
const $=id=>document.getElementById(id),status=$("admin-status"),message=$("admin-message");
let client,user,orgs=[],surveys=[],activeSurvey=null;
const say=s=>{message.textContent=s;};
const role=()=>orgs.find(o=>o.id===$("org-select").value)?.role;
const canEdit=()=>["owner","admin"].includes(role());
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
async function loadSurveys(){
  activeSurvey=null;$("question-panel").hidden=true;
  const orgId=$("org-select").value;
  if(!orgId)return;
  const {data,error}=await client.from("surveys").select("id,title,description,status,created_at").eq("organization_id",orgId).order("created_at",{ascending:false});
  if(error){say("Gagal memuat survei: "+(error.code||error.message));return;}
  surveys=data||[];$("stat-total").textContent=surveys.length;
  $("stat-draft").textContent=surveys.filter(s=>s.status==="draft").length;
  $("stat-published").textContent=surveys.filter(s=>s.status==="published").length;
  $("org-role").textContent="Peran: "+role();
  $("create-panel").hidden=!canEdit();
  renderSurveys();
  await loadMembers(orgId);
}
async function loadMembers(orgId){
  const root=$("member-list");if(!root)return;
  root.replaceChildren(el("p","Memuat anggota...","admin-meta"));
  const {data,error}=await client.from("organization_members").select("user_id,role").eq("organization_id",orgId);
  if($("org-select").value!==orgId)return;
  root.replaceChildren();
  if(error){root.append(el("p","Daftar anggota belum dapat diakses sesuai kebijakan RLS.","admin-meta"));return;}
  if(!data?.length){root.append(el("p","Tidak ada data anggota yang dapat ditampilkan.","admin-meta"));return;}
  const counts=new Map();
  for(const member of data)counts.set(member.role,(counts.get(member.role)||0)+1);
  for(const [memberRole,count] of counts){
    const row=el("div",undefined,"admin-stat");
    row.append(el("span",memberRole==="owner"?"Pemilik":memberRole==="admin"?"Admin":memberRole==="member"?"Anggota":memberRole),el("strong",String(count)));
    root.append(row);
  }
  root.append(el("p","Jumlah yang terlihat: "+data.length+" anggota. Angka mengikuti izin akses akun Anda.","admin-meta"));
  const permissions=el("div",undefined,"member-permissions");
  permissions.append(el("h3","Panduan Hak Akses"));
  const matrix=el("table",undefined,"member-permission-table");
  const thead=el("thead"),headRow=el("tr");
  for(const title of ["Peran","Lihat survei","Kelola survei"]){headRow.append(el("th",title));}
  thead.append(headRow);matrix.append(thead);
  const body=el("tbody");
  for(const [r,read,write] of [["Pemilik","Ya","Ya"],["Admin","Ya","Ya"],["Anggota","Sesuai RLS","Tidak"]]){
    const tr=el("tr");for(const value of [r,read,write])tr.append(el("td",value));body.append(tr);
  }
  matrix.append(body);permissions.append(matrix);
  permissions.append(el("p","Ringkasan ini menggambarkan aturan tampilan dashboard. Izin sesungguhnya ditentukan kebijakan RLS dan fungsi Supabase.","admin-meta"));
  root.append(permissions);
  if(canEdit()){
    const exportButton=action("Unduh Ringkasan Tim (CSV)",()=>{
      const cell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
      const rows=[["Organisasi","Peran","Jumlah terlihat"],...Array.from(counts,([r,n])=>[orgs.find(o=>o.id===orgId)?.name||"",r,n])];
      const blob=new Blob(["\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="gima-ringkasan-tim.csv";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    exportButton.className="member-export";root.append(exportButton);
  }
}
function action(label,fn){const b=el("button",label);b.type="button";b.addEventListener("click",fn);return b;}
function renderSurveys(){
  const root=$("survey-list");root.replaceChildren();
  if(!surveys.length){root.append(el("p","Belum ada survei untuk organisasi ini.","admin-meta"));return;}
  for(const s of surveys){
    const card=el("article",undefined,"admin-survey");card.append(el("h3",s.title),el("p",s.description||"Tanpa deskripsi","admin-meta"),el("p","Status: "+s.status,"admin-meta"));
    const actions=el("div",undefined,"admin-actions");
    actions.append(action("Pertanyaan",()=>openQuestions(s)));
    actions.append(action("Laporan",()=>openReport(s)));
    if(s.status==="published")actions.append(action("Salin Link Survei",async()=>{const link=new URL("/isi-survei.html?id="+encodeURIComponent(s.id),window.location.origin).href;try{await navigator.clipboard.writeText(link);say("Link survei disalin. Bagikan tautan ini kepada responden.");}catch{window.prompt("Salin link survei:",link);}}));
    if(canEdit()){
      if(s.status==="draft"){
        actions.append(action("Ubah judul",async()=>{const title=window.prompt("Judul survei (3–160 karakter):",s.title);if(title===null)return;const t=title.trim();if(t.length<3||t.length>160){say("Judul harus 3–160 karakter.");return;}await updateSurvey(s,{title:t});}));
        actions.append(action("Publikasikan",async()=>{const {count,error}=await client.from("survey_questions").select("id",{count:"exact",head:true}).eq("survey_id",s.id);if(error){say("Tidak dapat memeriksa pertanyaan.");return;}if(!count){say("Tambahkan minimal satu pertanyaan sebelum publikasi.");return;}if(window.confirm("Publikasikan survei dan aktifkan pengumpulan jawaban publik?"))await updateSurvey(s,{status:"published"});}));
        actions.append(action("Hapus draft",async()=>{if(!window.confirm("Hapus draft beserta pertanyaannya?"))return;const {error}=await client.from("surveys").delete().eq("id",s.id).eq("organization_id",$("org-select").value);if(error){say("Gagal menghapus: "+(error.code||error.message));return;}say("Draft dihapus.");await loadSurveys();}));
      }else if(s.status==="published"){
        actions.append(action("Tutup survei",async()=>{if(window.confirm("Tutup survei ini?"))await updateSurvey(s,{status:"closed"});}));
      }
    }
    card.append(actions);root.append(card);
  }
}
async function updateSurvey(s,patch){
  const {error}=await client.from("surveys").update(patch).eq("id",s.id).eq("organization_id",$("org-select").value);
  if(error){say("Gagal menyimpan: "+(error.code||error.message));return;}
  say("Perubahan tersimpan.");await loadSurveys();
}
async function openReport(s){
  activeSurvey=null;
  $("question-panel").hidden=false;
  $("question-heading").textContent="Laporan: "+s.title;
  $("question-form").hidden=true;
  const root=$("question-list");root.replaceChildren(el("p","Memuat analitik survei...","admin-meta"));
  const {data,error}=await client.rpc("gima_survey_summary",{p_survey_id:s.id});
  root.replaceChildren();
  if(error){root.append(el("p","Laporan tidak dapat dimuat: "+(error.code||error.message),"admin-meta"));return;}
  if(!data?.length){root.append(el("p","Belum ada pertanyaan dalam survei ini.","admin-meta"));return;}
  const ready=data.filter(q=>Number(q.response_count)>=5&&q.average_score!==null);
  const heading=el("div",undefined,"report-overview");
  heading.append(el("strong",ready.length+" dari "+data.length+" pertanyaan memiliki hasil yang dapat ditampilkan"));
  heading.append(el("p","Nilai hanya ditampilkan jika sedikitnya 5 respons valid tersedia pada pertanyaan tersebut. Angka 0 pada pertanyaan lain berarti hasil disembunyikan, bukan berarti tidak ada respons.","admin-meta"));
  root.append(heading);
  const executive=el("section",undefined,"executive-summary");
  executive.append(el("h3","Ringkasan Eksekutif"));
  const kpis=el("div",undefined,"executive-kpis");
  function metric(label,value,detail){
    const card=el("div",undefined,"executive-kpi");
    card.append(el("span",label),el("strong",value),el("small",detail));
    kpis.append(card);
  }
  const scores=ready.map(q=>Number(q.average_score));
  const overallScore=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
  const responseCounts=ready.map(q=>Number(q.response_count));
  const consistentCount=responseCounts.length>0&&responseCounts.every(c=>c===responseCounts[0]);
  metric("Skor agregat",overallScore===null?"Tertutup":overallScore.toFixed(2)+" / 5","Rata-rata pertanyaan yang memenuhi ambang privasi");
  metric("Cakupan pertanyaan",ready.length+" / "+data.length,"Memenuhi minimum 5 respons per pertanyaan");
  metric("Respons per pertanyaan",consistentCount?String(responseCounts[0]):"Beragam","Bukan jumlah responden unik lintas pertanyaan");
  const lowQuestions=ready.filter(q=>Number(q.average_score)<3);
  metric("Area perlu ditinjau",ready.length?String(lowQuestions.length):"—","Pertanyaan dengan skor di bawah 3/5");
  executive.append(kpis);
  executive.append(el("p","Indikator bersifat deskriptif, bukan ukuran representativitas atau diagnosis organisasi. Perbandingan hanya dapat dibuat dari pertanyaan yang identik dan memenuhi ambang privasi.","admin-meta"));
  root.append(executive);
  const printButton=action("Cetak / Simpan PDF",()=>window.print());
  printButton.className="report-download report-print-button";
  root.append(printButton);
  renderPeriodComparison(root,s,data);
  if(ready.length){
    const overall=ready.reduce((sum,q)=>sum+Number(q.average_score),0)/ready.length;
    const card=el("div",undefined,"report-score");
    card.append(el("span","Rata-rata dari pertanyaan yang memenuhi ambang privasi"),el("strong",overall.toFixed(2)+" / 5"));
    root.append(card);
    const download=action("Unduh CSV Ringkasan",()=>downloadReport(s,data));
    download.className="report-download";
    root.append(download);
  }else root.append(el("p","Laporan agregat belum dapat ditampilkan. Tunggu hingga minimal 5 jawaban valid per pertanyaan.","admin-meta"));
  const list=el("div",undefined,"report-chart");
  for(const [index,q] of data.entries()){
    const count=Number(q.response_count)||0;
    const valid=count>=5&&q.average_score!==null;
    const item=el("div",undefined,"report-item");
    item.append(el("div",(index+1)+". "+q.question_prompt,"report-question"));
    if(valid){
      const score=Number(q.average_score);
      const line=el("div",undefined,"report-bar-line");
      const track=el("div",undefined,"report-track");
      const fill=el("div",undefined,"report-fill");fill.style.width=Math.max(0,Math.min(100,score/5*100))+"%";
      track.setAttribute("role","img");track.setAttribute("aria-label","Skor rata-rata "+score.toFixed(2)+" dari 5");
      track.append(fill);line.append(track,el("strong",score.toFixed(2)+" / 5"));item.append(line);
      item.append(el("p",count+" respons valid","admin-meta"));
    }else item.append(el("p","Hasil disembunyikan (minimum 5 respons)","admin-meta"));
    list.append(item);
  }
  root.append(list);
  if(ready.length>=2){
    const ranked=[...ready].sort((a,b)=>Number(b.average_score)-Number(a.average_score));
    const insights=el("section",undefined,"report-insights");
    insights.append(el("h3","Insight Otomatis"));
    const high=ranked[0],low=ranked[ranked.length-1];
    const intro=el("p","Ringkasan deskriptif berdasarkan rata-rata skor pertanyaan yang memenuhi minimum 5 respons. Ini bukan diagnosis organisasi.","admin-meta");
    insights.append(intro);
    const best=el("p");best.append(el("strong","Skor tertinggi: "),document.createTextNode(high.question_prompt+" ("+Number(high.average_score).toFixed(2)+"/5)."));insights.append(best);
    const worst=el("p");worst.append(el("strong","Skor terendah: "),document.createTextNode(low.question_prompt+" ("+Number(low.average_score).toFixed(2)+"/5)."));insights.append(worst);
    const diff=Number(high.average_score)-Number(low.average_score);
    insights.append(el("p","Selisih skor tertinggi dan terendah: "+diff.toFixed(2)+" poin. Tinjau pertanyaan dengan skor rendah bersama konteks organisasi sebelum menentukan tindakan.","admin-meta"));
    root.append(insights);
    const advice=el("section",undefined,"report-insights report-recommendations");
    advice.append(el("h3","Rekomendasi Tindakan"));
    advice.append(el("p","Saran awal berbasis skor agregat. Verifikasi bersama karyawan dan pemangku kepentingan sebelum menetapkan program.","admin-meta"));
    const lowScore=Number(low.average_score);
    const text=String(low.question_prompt||"").toLocaleLowerCase("id-ID");
    let actions;
    if(/karier|karir|pengembang|promosi|pelatihan|kompetensi/.test(text)){
      actions=["Tinjau transparansi jalur karier dan kriteria promosi.","Diskusikan kebutuhan pelatihan dan pengembangan dengan karyawan.","Tetapkan indikator tindak lanjut dan evaluasi ulang pada survei berikutnya."];
    }else if(/atasan|pemimpin|manajer|dukungan|supervisor/.test(text)){
      actions=["Lakukan diskusi terstruktur tentang dukungan dari atasan.","Evaluasi praktik umpan balik dan komunikasi manajer.","Uji perbaikan secara terbatas dan ukur kembali hasilnya."];
    }else if(/lingkungan|produktivit|fasilitas|beban kerja|kerja sama/.test(text)){
      actions=["Petakan hambatan kerja dan kebutuhan fasilitas bersama tim.","Tinjau pembagian beban kerja dan proses kolaborasi.","Prioritaskan perbaikan yang dapat diuji serta dievaluasi."];
    }else if(/puas|kepuasan|rekomendasi|perusahaan/.test(text)){
      actions=["Gali faktor penyebab skor rendah melalui forum umpan balik sukarela.","Evaluasi kebijakan dan pengalaman kerja yang relevan.","Rencanakan tindakan perbaikan yang terukur dan survei ulang."];
    }else{
      actions=["Bahas pertanyaan dengan skor terendah bersama perwakilan karyawan.","Kumpulkan konteks tambahan secara sukarela tanpa mengungkap identitas responden.","Tentukan perbaikan yang terukur dan evaluasi pada periode berikutnya."];
    }
    advice.append(el("p","Area prioritas: "+low.question_prompt+" ("+lowScore.toFixed(2)+"/5)."));
    const ul=el("ul");for(const item of actions)ul.append(el("li",item));advice.append(ul);
    if(lowScore>=3.5)advice.append(el("p","Seluruh skor yang ditampilkan relatif tinggi; rekomendasi ini bersifat pemeliharaan dan peningkatan berkelanjutan.","admin-meta"));
    const plan=action("Unduh Rencana Tindak Lanjut (CSV)",()=>downloadActionPlan(s,low,actions));
    plan.className="report-download";advice.append(plan);
    root.append(advice);
  }
  $("question-panel").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderPeriodComparison(root,current,currentData){
  const section=el("section",undefined,"period-comparison");
  section.append(el("h3","Perbandingan Antar Survei"));
  section.append(el("p","Pilih survei lain dari organisasi yang sama. Hanya pertanyaan dengan teks persis sama, tidak duplikat, dan minimal 5 respons valid pada kedua survei yang dibandingkan. Skala keduanya Likert 1–5.","admin-meta"));
  const candidates=surveys.filter(s=>s.id!==current.id&&s.status!=="draft");
  if(!candidates.length){
    section.append(el("p","Belum ada survei pembanding yang dipublikasikan atau ditutup. Buat survei periode berikutnya dengan pertanyaan identik untuk mengaktifkan perbandingan.","admin-meta"));
    root.append(section);return;
  }
  const label=el("label","Survei pembanding");const select=el("select");
  select.setAttribute("aria-label","Survei pembanding");
  const placeholder=el("option","Pilih survei pembanding");placeholder.value="";select.append(placeholder);
  for(const item of candidates){const option=el("option",item.title);option.value=item.id;select.append(option);}
  section.append(label,select);
  const result=el("div",undefined,"period-results");section.append(result);
  let requestId=0;
  select.addEventListener("change",async()=>{
    const selectedId=select.value;const seq=++requestId;result.replaceChildren();
    if(!selectedId)return;
    result.append(el("p","Memuat perbandingan...","admin-meta"));
    const {data,error}=await client.rpc("gima_survey_summary",{p_survey_id:selectedId});
    if(seq!==requestId)return;
    result.replaceChildren();
    if(error){result.append(el("p","Gagal memuat survei pembanding: "+(error.code||error.message),"admin-meta"));return;}
    const normalize=q=>String(q.question_prompt||"").trim().replace(/\\s+/g," ").toLocaleLowerCase("id-ID");
    const currentMap=new Map(),otherMap=new Map();
    for(const [items,map] of [[currentData,currentMap],[data||[],otherMap]]){
      for(const q of items){const key=normalize(q);if(!map.has(key))map.set(key,[]);map.get(key).push(q);}
    }
    const pairs=[];
    for(const [key,a] of currentMap){
      const b=otherMap.get(key);
      if(a.length!==1||!b||b.length!==1)continue;
      const left=a[0],right=b[0];
      if(Number(left.response_count)<5||Number(right.response_count)<5||left.average_score===null||right.average_score===null)continue;
      pairs.push({prompt:left.question_prompt,current:Number(left.average_score),previous:Number(right.average_score)});
    }
    if(!pairs.length){
      result.append(el("p","Belum ada pertanyaan identik yang memenuhi minimal 5 respons pada kedua survei. Tidak ada skor yang dibandingkan.","admin-meta"));return;
    }
    const other=candidates.find(x=>x.id===selectedId);
    result.append(el("p","Selisih = skor survei saat ini dikurangi skor "+(other?.title||"pembanding")+". Nilai positif berarti lebih tinggi pada survei saat ini.","admin-meta"));
    const average=pairs.reduce((acc,p)=>acc+p.current-p.previous,0)/pairs.length;
    const top=el("div",undefined,"period-delta");
    top.append(el("span","Rata-rata selisih "+pairs.length+" pertanyaan sepadan"),el("strong",(average>0?"+":"")+average.toFixed(2)+" poin"));
    result.append(top);
    for(const p of pairs){
      const line=el("div",undefined,"period-row");
      line.append(el("strong",p.prompt));
      line.append(el("span","Pembanding "+p.previous.toFixed(2)+" / 5 → Saat ini "+p.current.toFixed(2)+" / 5"));
      const delta=p.current-p.previous;
      line.append(el("span","Selisih "+(delta>0?"+":"")+delta.toFixed(2)+" poin","admin-meta"));
      result.append(line);
    }
    result.append(el("p","Perbandingan ini deskriptif. Perbedaan waktu, responden, dan metode pengumpulan dapat memengaruhi hasil. Pertanyaan dengan teks berbeda tidak dibandingkan.","admin-meta"));
  });
  root.append(section);
}
function downloadActionPlan(s,priority,actions){
  const cell=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
  const rows=[["Survei","Area prioritas","Skor rata-rata","Rencana tindakan","Penanggung jawab","Target selesai","Status"],
    ...actions.map(item=>[s.title,priority.question_prompt,Number(priority.average_score).toFixed(2),item,"","","Belum dimulai"])];
  const content="\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
  const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="gima-rencana-tindakan-"+s.id+".csv";
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadReport(s,data){
  const csvCell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  const rows=[["Pertanyaan","Respons valid (jika >=5)","Rata-rata (1-5)"],...data.map(q=>{
    const visible=Number(q.response_count)>=5&&q.average_score!==null;
    return [q.question_prompt,visible?Number(q.response_count):"Disembunyikan",visible?Number(q.average_score).toFixed(2):"Disembunyikan"];
  })];
  const blob=new Blob(["\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="gima-laporan-"+s.id+".csv";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function openQuestions(s){
  activeSurvey=s;$("question-panel").hidden=false;$("question-heading").textContent="Pertanyaan: "+s.title;
  $("question-form").hidden=!(canEdit()&&s.status==="draft");
  await loadQuestions();$("question-panel").scrollIntoView({behavior:"smooth",block:"start"});
}
async function loadQuestions(){
  if(!activeSurvey)return;
  const {data,error}=await client.from("survey_questions").select("id,position,prompt").eq("survey_id",activeSurvey.id).order("position");
  if(error){say("Gagal memuat pertanyaan: "+(error.code||error.message));return;}
  const root=$("question-list");root.replaceChildren();
  if(!data?.length)root.append(el("p","Belum ada pertanyaan.","admin-meta"));
  for(const q of data||[]){
    const row=el("div",undefined,"admin-question");row.append(el("span",q.position+". "+q.prompt));
    if(canEdit()&&activeSurvey.status==="draft"){
      row.append(action("Hapus",async()=>{if(!window.confirm("Hapus pertanyaan ini?"))return;const {error}=await client.from("survey_questions").delete().eq("id",q.id).eq("survey_id",activeSurvey.id);if(error){say("Gagal menghapus: "+(error.code||error.message));return;}say("Pertanyaan dihapus.");await loadQuestions();}));
    }root.append(row);
  }
}
async function init(){
  if(!window.GIMA_AUTH?.configured()){status.textContent="Supabase belum dikonfigurasi.";return;}
  try{client=window.GIMA_AUTH.getClient();}catch(e){status.textContent=e.message;return;}
  const {data:{user:current},error}=await client.auth.getUser();
  if(error||!current){window.location.replace("/login");return;}user=current;
  $("admin-email").textContent=user.email||"Pengguna";$("logout").hidden=false;
  const {data:members,error:membershipError}=await client.from("organization_members").select("organization_id,role").eq("user_id",user.id);
  if(membershipError){status.textContent="Gagal memeriksa keanggotaan.";return;}
  if(!members?.length){status.textContent="Akun belum terhubung ke organisasi.";return;}
  const {data:organizations,error:orgError}=await client.from("organizations").select("id,name").in("id",members.map(m=>m.organization_id));
  if(orgError){status.textContent="Gagal memuat organisasi.";return;}
  orgs=(organizations||[]).map(o=>({...o,role:members.find(m=>m.organization_id===o.id)?.role}));
  const select=$("org-select");for(const o of orgs){const opt=el("option",o.name);opt.value=o.id;select.append(opt);}
  select.addEventListener("change",()=>{say("");loadSurveys();});
  $("admin-panel").hidden=false;status.textContent="Data organisasi siap.";
  await loadSurveys();
}
$("create-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!canEdit())return;
  const title=$("survey-title").value.trim(),description=$("survey-description").value.trim();
  if(title.length<3||title.length>160)return;
  const button=e.currentTarget.querySelector("button");button.disabled=true;
  try{
    const {error}=await client.from("surveys").insert({organization_id:$("org-select").value,created_by:user.id,title,description,status:"draft"});
    if(error){say("Gagal membuat draft: "+(error.code||error.message));return;}
    $("create-form").reset();say("Draft survei berhasil dibuat.");await loadSurveys();
  }finally{button.disabled=false;}
});
$("question-form").addEventListener("submit",async e=>{
  e.preventDefault();if(!activeSurvey||activeSurvey.status!=="draft"||!canEdit())return;
  const prompt=$("question-prompt").value.trim();if(!prompt)return;
  const {data,error}=await client.from("survey_questions").select("position").eq("survey_id",activeSurvey.id).order("position",{ascending:false}).limit(1);
  if(error){say("Gagal memeriksa urutan pertanyaan.");return;}
  const position=(data?.[0]?.position||0)+1;
  if(position>500){say("Maksimal 500 posisi pertanyaan.");return;}
  const result=await client.from("survey_questions").insert({survey_id:activeSurvey.id,position,prompt,question_type:"likert_5"});
  if(result.error){say("Gagal menambah pertanyaan: "+(result.error.code||result.error.message));return;}
  $("question-form").reset();say("Pertanyaan ditambahkan.");await loadQuestions();
});
$("close-questions").addEventListener("click",()=>{$("question-panel").hidden=true;activeSurvey=null;});
$("logout").addEventListener("click",async()=>{await client.auth.signOut();window.location.replace("/login");});
init().catch(()=>{status.textContent="Gagal memuat dashboard. Coba muat ulang.";});
})();
