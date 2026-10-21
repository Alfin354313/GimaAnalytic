(()=>{"use strict";
const init=()=>{
 const survey=document.querySelector('[data-view="surveys"] .survey-create');
 const create=document.getElementById("create-panel"),form=document.getElementById("create-form");
 if(survey&&create&&form&&!survey.querySelector(".gima-survey-wizard")){
  survey.classList.add("gima-illustrated-survey");
  const wizard=document.createElement("div");wizard.className="gima-survey-wizard";wizard.innerHTML='<div class="gima-wizard-title"><span class="gima-wizard-icon" aria-hidden="true">✦</span><div><strong>Mulai Survei Baru</strong><small>Susun survei dengan langkah yang jelas dan terarah.</small></div></div><div class="gima-wizard-steps" aria-label="Tahapan pembuatan survei"><span class="current"><b>1</b> Informasi</span><span><b>2</b> Pertanyaan</span><span><b>3</b> Pengaturan</span><span><b>4</b> Publikasi</span></div>';
  const heading=create.querySelector("h2");if(heading)heading.textContent="Informasi Dasar";
  create.insertBefore(wizard,heading||create.firstChild);
  const hero=document.createElement("div");hero.className="gima-survey-hero";hero.innerHTML='<div class="gima-hero-copy"><span class="gima-hero-eyebrow">✦ SURVEI KARYAWAN</span><strong>Rancang survei yang bermakna</strong><p>Mulai dari judul dan tujuan. Pertanyaan dapat disusun setelah draft tersimpan.</p></div><div class="gima-hero-art" aria-hidden="true"><span class="gima-art-bubble">✓</span><span class="gima-art-sheet"><i></i><i></i><i></i><i></i></span><span class="gima-art-person">●</span></div>';
  form.parentNode.insertBefore(hero,form);
  const tips=document.createElement("aside");tips.className="gima-survey-tips";tips.innerHTML='<strong>✧ Tips Membuat Survei</strong><ul><li>Gunakan judul yang jelas</li><li>Jelaskan tujuan dan manfaat</li><li>Buat pertanyaan yang relevan</li><li>Pastikan durasi tidak terlalu panjang</li></ul></aside>';form.after(tips);
  const desc=document.getElementById("survey-description");if(desc){desc.placeholder="Jelaskan tujuan survei, target responden, dan manfaatnya...";desc.maxLength=2000}
  const submit=form.querySelector('button[type="submit"]');if(submit){submit.textContent="Simpan sebagai Draft";submit.classList.add("gima-primary-save")}
 }
 const reports=document.querySelector('[data-view="reports"]');const action=[...reports?.querySelectorAll(".gima-feature-panel")||[]].find(n=>n.querySelector("h3")?.textContent==="Action Plan HR");
 if(action&&!action.querySelector(".gima-action-hero")){
  action.classList.add("gima-illustrated-action");
  const h=action.querySelector("h3");if(h)h.textContent="Action Plan HR";
  const hero=document.createElement("div");hero.className="gima-action-hero";hero.innerHTML='<div class="gima-action-art" aria-hidden="true"><span class="gima-action-light">✦</span><span class="gima-action-board"><i>✓</i><i>✓</i><i>✓</i></span><span class="gima-action-target">◎</span></div><div class="gima-action-hero-copy"><strong>Dari insight menjadi aksi nyata</strong><p>Susun tindak lanjut berdasarkan temuan survei, tentukan penanggung jawab, dan pantau progres secara terukur.</p><div class="gima-action-chips"><span>✓ Komunikasi internal</span><span>✓ Pengembangan tim</span><span>✓ Kesejahteraan kerja</span></div></div>';
  const intro=h?.nextElementSibling;action.insertBefore(hero,intro?intro.nextSibling:action.firstChild);
  const form=action.querySelector("form");if(form){form.classList.add("gima-action-form");form.removeAttribute("style");const labels=form.querySelectorAll("label");labels.forEach((l,i)=>{l.classList.add("gima-action-field");l.dataset.icon=["✦","♙","▦","▤","⚑","◷","☷"][i]||"•"})}
  const summary=action.querySelector("section.admin-box");if(summary)summary.classList.add("gima-action-summary");
 }
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(init,0));else setTimeout(init,0);
})();