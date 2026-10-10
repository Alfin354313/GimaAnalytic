(()=>{"use strict";
const $=id=>document.getElementById(id);
const id=new URLSearchParams(location.search).get("id");
const labels=["Sangat tidak setuju","Tidak setuju","Netral","Setuju","Sangat setuju"];
const answers=new Map();
if(!id||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)){$("public-title").textContent="Link survei tidak valid";return;}
async function load(){
 if(!window.GIMA_AUTH?.configured())throw Error("Konfigurasi Supabase belum tersedia");
 const client=window.GIMA_AUTH.getClient();
 const {data,error}=await client.rpc("gima_public_survey",{p_survey_id:id});
 if(error)throw Error("Survei belum dapat dimuat. Pastikan SQL publikasi Tahap 7 sudah dijalankan.");
 if(!data){$("public-title").textContent="Survei tidak tersedia";$("public-status").textContent="Survei mungkin belum dipublikasikan atau sudah ditutup.";return;}
 $("public-title").textContent=data.title;
 $("public-description").textContent=data.description||"";
 const root=$("public-questions");root.replaceChildren();
 const questions=data.questions||[];
 questions.forEach((q,index)=>{
  const field=document.createElement("fieldset");field.className="response-card";
  const title=document.createElement("legend");title.textContent=(index+1)+". "+q.prompt;field.append(title);
  const opts=document.createElement("div");opts.className="response-options";
  labels.forEach((label,i)=>{
   const wrapper=document.createElement("label");wrapper.className="response-option";
   const radio=document.createElement("input");radio.type="radio";radio.name="question-"+q.id;radio.value=String(i+1);
   radio.addEventListener("change",()=>{answers.set(q.id,i+1);refresh();});
   wrapper.append(radio,document.createTextNode(" "+(i+1)+" — "+label));opts.append(wrapper);
  });field.append(opts);root.append(field);
 });
 const controls=document.createElement("section");controls.className="response-card";
 const consent=document.createElement("label");const check=document.createElement("input");check.type="checkbox";
 consent.append(check,document.createTextNode(" Saya memahami tujuan survei dan menyetujui pemrosesan jawaban anonim saya untuk analisis agregat."));controls.append(consent);
 const progress=document.createElement("p");progress.setAttribute("role","status");controls.append(progress);
 const button=document.createElement("button");button.type="button";button.textContent="Kirim Jawaban (belum aktif)";button.disabled=true;controls.append(button);
 root.append(controls);
 function refresh(){progress.textContent="Terisi "+answers.size+" dari "+questions.length+" pertanyaan"+(check.checked?" • Persetujuan diberikan":" • Persetujuan belum diberikan");}
 check.addEventListener("change",refresh);refresh();
 $("public-status").textContent="Formulir dapat diuji. Jawaban belum dikirim atau disimpan.";
}
load().catch(e=>{$("public-title").textContent="Survei belum tersedia";$("public-status").textContent=e.message;});
})();