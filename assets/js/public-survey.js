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
 const tokenLabel=document.createElement("label");tokenLabel.textContent="Kode undangan sekali pakai";const tokenInput=document.createElement("input");tokenInput.type="text";tokenInput.autocomplete="off";tokenInput.placeholder="Masukkan kode dari pengelola";tokenInput.maxLength=64;tokenInput.value=new URLSearchParams(location.search).get("token")||"";tokenLabel.append(tokenInput);controls.append(tokenLabel);
 const progress=document.createElement("p");progress.setAttribute("role","status");controls.append(progress);
 const button=document.createElement("button");button.type="button";button.textContent="Kirim Jawaban";button.disabled=true;controls.append(button);
 root.append(controls);
 function refresh(){button.disabled=!(answers.size===questions.length&&check.checked&&/^[0-9a-f]{64}$/.test(tokenInput.value.trim()));progress.textContent="Terisi "+answers.size+" dari "+questions.length+" pertanyaan"+(check.checked?" • Persetujuan diberikan":" • Persetujuan belum diberikan");}
 check.addEventListener("change",refresh);tokenInput.addEventListener("input",refresh);button.addEventListener("click",async()=>{if(button.disabled)return;button.disabled=true;button.textContent="Mengirim...";const payload=questions.map(q=>({question_id:q.id,score:answers.get(q.id)}));const {error}=await client.rpc("gima_submit_invited_survey",{p_survey_id:id,p_token:tokenInput.value.trim(),p_answers:payload,p_consented:check.checked});if(error){$("public-status").textContent="Gagal mengirim: "+(error.message||"Periksa kode undangan dan coba lagi.");button.textContent="Kirim Jawaban";refresh();return;}root.replaceChildren();$("public-status").textContent="Terima kasih! Jawaban berhasil disimpan. Kode undangan ini tidak dapat digunakan lagi.";});refresh();
 $("public-status").textContent="Jawaban hanya dapat dikirim menggunakan kode undangan sekali pakai setelah SQL Tahap 7 terbaru dijalankan.";
}
load().catch(e=>{$("public-title").textContent="Survei belum tersedia";$("public-status").textContent=e.message;});
})();