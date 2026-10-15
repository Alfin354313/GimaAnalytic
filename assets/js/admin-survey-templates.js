(()=>{"use strict";
const templates=[
 {name:"Employee Engagement",description:"Keterlibatan, dukungan pimpinan, dan motivasi kerja.",questions:["Saya merasa antusias menjalankan pekerjaan saya.","Saya memahami bagaimana pekerjaan saya berkontribusi pada tujuan organisasi.","Atasan saya memberikan dukungan yang saya perlukan.","Saya memiliki kesempatan berkembang dalam pekerjaan.","Saya bersedia merekomendasikan organisasi ini sebagai tempat bekerja."]},
 {name:"Kepuasan Karyawan",description:"Kepuasan terhadap pekerjaan, lingkungan, dan komunikasi.",questions:["Saya puas dengan lingkungan kerja saya.","Saya puas dengan komunikasi internal organisasi.","Saya merasa beban kerja saya dikelola dengan baik.","Saya puas dengan kesempatan pengembangan karier.","Secara keseluruhan, saya puas bekerja di organisasi ini."]},
 {name:"Evaluasi Kepemimpinan",description:"Umpan balik mengenai komunikasi dan kepemimpinan.",questions:["Pimpinan menyampaikan tujuan kerja dengan jelas.","Pimpinan mendengarkan masukan dari anggota tim.","Pimpinan memberikan umpan balik yang membangun.","Pimpinan mengambil keputusan secara adil.","Pimpinan mendukung kolaborasi antaranggota tim."]}
];
const init=()=>{
 const panel=document.getElementById("create-panel"),form=document.getElementById("create-form");if(!panel||!form)return;
 const wrap=document.createElement("div");wrap.className="admin-box gima-template-legacy";wrap.style.cssText="margin-bottom:16px;padding:16px";
 const heading=document.createElement("h3");heading.textContent="Template Survei HR";
 const note=document.createElement("p");note.className="admin-meta";note.textContent="Pilih template untuk membuat draft baru dengan lima pertanyaan Likert 1–5. Tinjau dan sesuaikan pertanyaan sebelum dipublikasikan.";
 const select=document.createElement("select");select.setAttribute("aria-label","Pilih template survei");
 const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Pilih template";select.append(placeholder);
 for(const [index,t] of templates.entries()){const o=document.createElement("option");o.value=String(index);o.textContent=t.name;select.append(o)}
 const desc=document.createElement("p");desc.className="admin-meta";
 const button=document.createElement("button");button.type="button";button.className="btn";button.textContent="Buat draft dari template";button.style.cssText="display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:11px 20px;border:1px solid #39a9b7;border-radius:9px;background:#4eb5bf;color:#ffffff;font-weight:700;cursor:pointer;box-shadow:0 3px 10px rgba(17,89,112,.12)";
 select.addEventListener("change",()=>{desc.textContent=select.value===""?"":templates[Number(select.value)].description});
 wrap.append(heading,note,select,desc,button);form.before(wrap);
 document.addEventListener("gima:use-template",event=>{const index=Number(event.detail?.index);if(!Number.isInteger(index)||!templates[index])return;select.value=String(index);select.dispatchEvent(new Event("change"));button.click();});
 window.gimaSurveyTemplates=templates.map(t=>({name:t.name,description:t.description}));
 const info=document.createElement("p");info.className="admin-meta";info.setAttribute("role","status");wrap.append(info);
 button.addEventListener("click",async()=>{
  if(select.value===""||!window.gimaFeatureClient)return;
  const orgId=document.getElementById("org-select")?.value;
  const role=document.getElementById("org-role")?.textContent||"";
  if(!orgId||!/owner|admin/i.test(role)){info.textContent="Hanya owner/admin dapat membuat survei.";return}
  const t=templates[Number(select.value)];if(!window.confirm("Buat draft "+t.name+" dengan lima pertanyaan?"))return;
  button.disabled=true;button.style.opacity="0.65";button.style.cursor="wait";info.textContent="Membuat draft...";
  try{
   const client=window.gimaFeatureClient;const {data:auth,error:authError}=await client.auth.getUser();if(authError||!auth?.user)throw authError||new Error("Sesi berakhir");
   const {data:survey,error:createError}=await client.from("surveys").insert({organization_id:orgId,created_by:auth.user.id,title:t.name+" — "+new Date().toLocaleDateString("id-ID"),description:t.description,status:"draft"}).select("id").single();
   if(createError)throw createError;
   const questions=t.questions.map((prompt,i)=>({survey_id:survey.id,position:i+1,prompt,question_type:"likert_5"}));
   const {error:questionError}=await client.from("survey_questions").insert(questions);
   if(questionError){info.textContent="Draft dibuat, tetapi pertanyaan gagal ditambahkan ("+(questionError.code||questionError.message)+"). Buka menu Survei untuk memperbaiki draft.";return}
   info.textContent="Draft template berhasil dibuat. Buka daftar survei untuk meninjau pertanyaan.";
   document.getElementById("org-select")?.dispatchEvent(new Event("change"));
  }catch(err){info.textContent="Gagal membuat template: "+(err.code||err.message)}finally{button.disabled=false;button.style.opacity="1";button.style.cursor="pointer"}
 });
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();