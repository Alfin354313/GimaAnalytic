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
    if(s.status==="published")actions.append(action("Salin Link Survei",async()=>{const link=new URL("/isi-survei.html?id="+encodeURIComponent(s.id),window.location.origin).href;try{await navigator.clipboard.writeText(link);say("Link survei disalin. Formulir saat ini hanya pratinjau; pengiriman jawaban belum aktif.");}catch{window.prompt("Salin link survei (pratinjau):",link);}}));
    if(canEdit()){
      if(s.status==="draft"){
        actions.append(action("Ubah judul",async()=>{const title=window.prompt("Judul survei (3–160 karakter):",s.title);if(title===null)return;const t=title.trim();if(t.length<3||t.length>160){say("Judul harus 3–160 karakter.");return;}await updateSurvey(s,{title:t});}));
        actions.append(action("Publikasikan",async()=>{const {count,error}=await client.from("survey_questions").select("id",{count:"exact",head:true}).eq("survey_id",s.id);if(error){say("Tidak dapat memeriksa pertanyaan.");return;}if(!count){say("Tambahkan minimal satu pertanyaan sebelum publikasi.");return;}if(window.confirm("Publikasikan survei? Pengumpulan jawaban publik belum diaktifkan."))await updateSurvey(s,{status:"published"});}));
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
  const root=$("question-list");root.replaceChildren();
  root.append(el("p","Memuat ringkasan...","admin-meta"));
  const {data,error}=await client.rpc("gima_survey_summary",{p_survey_id:s.id});
  root.replaceChildren();
  if(error){root.append(el("p","Laporan belum tersedia. Jalankan SQL Tahap 7 terlebih dahulu. ("+(error.code||"error")+")","admin-meta"));return;}
  if(!data?.length){root.append(el("p","Belum ada pertanyaan.","admin-meta"));return;}
  for(const q of data){
    const line=el("div",undefined,"admin-question");
    const count=Number(q.response_count)||0;
    line.append(el("span",q.question_prompt),el("strong",count>=5?"Rata-rata "+Number(q.average_score).toFixed(2)+"/5":"Belum cukup respons (minimum 5)"));
    root.append(line);
  }
  $("question-panel").scrollIntoView({behavior:"smooth",block:"start"});
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
  $("admin-panel").hidden=false;status.textContent="Data organisasi siap. Pengumpulan respons publik belum diaktifkan.";
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
