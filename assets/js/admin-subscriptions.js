(()=>{"use strict";
const init=()=>{
 const view=document.querySelector('[data-view="billing"]');if(!view)return;
 const el=(tag,t)=>{const x=document.createElement(tag);if(t!==undefined)x.textContent=t;return x};
 const panel=el("section");panel.className="admin-box gima-feature-panel";panel.append(el("h3","Status Langganan SaaS"));
 const note=el("p","Paket dan status langganan organisasi. Aktivasi hanya dapat dilakukan oleh pengelola layanan setelah pembayaran diverifikasi. Harga masih placeholder dan belum ditetapkan.");note.className="admin-meta";panel.append(note);
 const status=el("p","Memuat informasi langganan...");status.className="admin-meta";status.setAttribute("role","status");panel.append(status);
 const requestBox=el("div");requestBox.className="billing-form";panel.append(requestBox);
 const info=el("div");info.className="gima-feature-metrics";panel.append(info);view.append(panel);
 let request=0;
 const draw=async(orgId)=>{
  const current=++request;info.replaceChildren();if(!orgId||!window.gimaFeatureClient)return;
  const client=window.gimaFeatureClient;
  const [plans,subs,requests]=await Promise.all([
   client.from("gima_subscription_plans").select("id,code,name,description,price_idr,duration_months").eq("is_active",true).order("name"),
   client.from("gima_organization_subscriptions").select("id,plan_id,status,starts_on,ends_on,approved_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(10),
   client.from("gima_subscription_requests").select("id,plan_id,transfer_reference,transfer_date,status,created_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(10)
  ]);
  if(current!==request)return;
  if(plans.error||subs.error){status.textContent="Data langganan belum tersedia. Jalankan SQL Tahap 18 di Supabase atau periksa hak akses: "+(plans.error?.code||subs.error?.code||"error");return}
  const catalog=plans.data||[],entries=subs.data||[];
  requestBox.replaceChildren();
  if(requests.error){requestBox.append(el("p","Form pengajuan belum tersedia. Jalankan SQL Tahap 18B: "+(requests.error.code||requests.error.message)));}
  else {
   const pending=(requests.data||[]).find(r=>r.status==="pending");
   requestBox.append(el("h4","Pengajuan Langganan / Konfirmasi Transfer"));
   const todayLocal=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
   const currentActive=entries.some(s=>s.status==="active"&&s.approved_at&&s.starts_on<=todayLocal&&s.ends_on>=todayLocal);
   if(pending){requestBox.append(el("p","Pengajuan menunggu pemeriksaan pengelola. Referensi: "+pending.transfer_reference+" • Tanggal: "+pending.transfer_date));}
   else if(currentActive){requestBox.append(el("p","Langganan masih aktif. Pengajuan perpanjangan atau perubahan paket belum tersedia; hubungi pengelola GIMA."));}
   else {
    const form=el("form");form.className="billing-form";
    const select=el("select");select.required=true;select.setAttribute("aria-label","Pilih paket");
    const placeholder=el("option","Pilih paket langganan");placeholder.value="";select.append(placeholder);
    for(const p of catalog){const o=el("option",p.name+" (harga dikonfirmasi pengelola)");o.value=p.id;select.append(o)}
    const reference=el("input");reference.required=true;reference.maxLength=120;reference.minLength=4;reference.placeholder="Nomor referensi transfer";reference.setAttribute("aria-label","Nomor referensi transfer");
    const date=el("input");date.type="date";date.required=true;date.setAttribute("aria-label","Tanggal transfer");
    const button=el("button","Ajukan verifikasi transfer");button.type="submit";
    const result=el("p");result.setAttribute("role","status");
    form.append(select,reference,date,button,result);
    form.addEventListener("submit",async e=>{e.preventDefault();if(!form.reportValidity())return;button.disabled=true;result.textContent="Mengirim pengajuan...";try{
     const {error}=await client.from("gima_subscription_requests").insert({organization_id:orgId,plan_id:select.value,transfer_reference:reference.value.trim(),transfer_date:date.value});
     if(error){result.textContent="Pengajuan gagal: "+(error.code||error.message);return}
     result.textContent="Pengajuan diterima, menunggu verifikasi manual.";await draw(orgId);
    }catch(err){result.textContent="Gagal mengirim: "+err.message}finally{button.disabled=false}});
    requestBox.append(el("p","Jangan transfer sebelum menerima instruksi pembayaran resmi. Form ini hanya mencatat referensi transfer, bukan bukti pembayaran terverifikasi."),form);
   }
  }
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const active=entries.find(s=>s.status==="active"&&s.approved_at&&s.starts_on&&s.ends_on&&s.starts_on<=today&&s.ends_on>=today);
  const latest=active||entries[0];const labels={pending:"Menunggu verifikasi",active:"Aktif",expired:"Kedaluwarsa",suspended:"Ditangguhkan",cancelled:"Dibatalkan"};
  const effectiveStatus=active?"Aktif":latest?.status==="active"?(latest.ends_on&&latest.ends_on<today?"Masa berlaku berakhir":"Belum berlaku"):(labels[latest?.status]||"Belum berlangganan");
  status.textContent=latest?"Status langganan: "+effectiveStatus+(active?" — diverifikasi dan dalam masa berlaku":" — akses belum dinyatakan aktif oleh panel ini"):"Belum ada langganan tercatat untuk organisasi ini.";
  const add=(heading,value)=>{const card=el("div");card.className="gima-feature-metric";card.append(el("span",heading),el("strong",value));info.append(card)};
  add("Status efektif",effectiveStatus);
  add("Paket tercatat",catalog.find(p=>p.id===latest?.plan_id)?.name||"Belum ditentukan");
  add("Tanggal mulai",latest?.starts_on||"—");
  add("Berlaku sampai",latest?.ends_on||"—");
  add("Paket tersedia",catalog.map(p=>p.name).join(", ")||"—");
  const warning=el("p","Pembayaran diverifikasi secara manual oleh pengelola. Status ini belum membatasi akses ke fitur berdasarkan langganan.");warning.className="admin-meta";info.append(warning);
 };
 document.addEventListener("gima:surveys-loaded",ev=>draw(ev.detail?.orgId));
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();