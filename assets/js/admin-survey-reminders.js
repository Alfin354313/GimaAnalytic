(()=>{"use strict";
const init=()=>{
 const view=document.querySelector('[data-view="respondents"]');if(!view)return;
 const box=document.createElement("section");box.className="admin-box gima-feature-panel";
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
 box.append(el("h3","Pengingat Survei — WhatsApp & Email"));
 const intro=el("p","Pilih survei yang sudah dipublikasikan, lalu buka WhatsApp atau aplikasi email dengan pesan yang telah disiapkan. Pesan tidak dikirim otomatis.");intro.className="admin-meta";box.append(intro);
 const picker=el("select");picker.setAttribute("aria-label","Survei untuk pengingat");
 const message=el("textarea");message.rows=5;message.maxLength=1500;message.setAttribute("aria-label","Pesan pengingat");
 const buttons=el("div");buttons.className="gima-feature-actions";
 const wa=el("button","Buka WhatsApp"),email=el("button","Buka Email"),copy=el("button","Salin pesan");
 for(const b of [wa,email,copy]){b.type="button";b.className="btn outline";b.style.cssText="display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:10px 16px;border-radius:9px;border:1px solid #6ab8c4;background:#eaf8fa;color:#176e7b;font-weight:700;cursor:pointer;margin:5px";buttons.append(b)}
 const status=el("p");status.className="admin-meta";status.setAttribute("role","status");
 box.append(picker,message,buttons,status);view.append(box);
 let rows=[],orgId=null;
 const selected=()=>rows.find(r=>r.id===picker.value);
 const link=r=>window.GIMA_SURVEY_LINKS.link(r);
 const defaultMessage=r=>"Halo, kami mengundang Anda untuk mengisi survei "+r.title+". Partisipasi bersifat sukarela. Silakan baca informasi persetujuan dan privasi sebelum mengisi. Link survei: "+link(r)+" Terima kasih.";
 const update=()=>{const r=selected();message.value=r?defaultMessage(r):"";for(const b of [wa,email,copy])b.disabled=!r;status.textContent=r?(window.location.hostname.endsWith(".vercel.app")&&window.location.hostname.includes("-")?"Perhatian: link memakai domain deployment Preview. Jangan bagikan kepada responden sungguhan; gunakan domain Production yang stabil.":"Tinjau isi pesan sebelum membagikan. Kirim hanya kepada penerima yang sesuai."):"Belum ada survei berstatus published."};
 picker.addEventListener("change",update);
 document.addEventListener("gima:surveys-loaded",ev=>{
  orgId=ev.detail?.orgId||null;rows=(ev.detail?.surveys||[]).filter(r=>r.status==="published"&&r.id);
  picker.replaceChildren();if(!rows.length){const o=el("option","Belum ada survei terpublikasi");o.value="";picker.append(o)}
  else for(const r of rows){const o=el("option",r.title);o.value=r.id;picker.append(o)}update();
 });
 const open=url=>{const w=window.open(url,"_blank","noopener,noreferrer");if(!w)status.textContent="Pop-up diblokir. Gunakan tombol Salin pesan atau izinkan pop-up untuk situs ini."};
 wa.addEventListener("click",()=>{if(!selected()||!message.value.trim())return;open("https://wa.me/?text="+encodeURIComponent(message.value.trim()))});
 email.addEventListener("click",()=>{const r=selected();if(!r||!message.value.trim())return;window.location.href="mailto:?subject="+encodeURIComponent("Pengingat survei: "+r.title)+"&body="+encodeURIComponent(message.value.trim())});
 copy.addEventListener("click",async()=>{if(!selected()||!message.value.trim())return;try{await navigator.clipboard.writeText(message.value.trim());status.textContent="Pesan disalin. Silakan kirim secara manual."}catch{window.prompt("Salin pesan:",message.value.trim())}});
 update();
};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();