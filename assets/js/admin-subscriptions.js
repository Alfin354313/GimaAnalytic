(()=>{"use strict";
const init=()=>{
 const view=document.querySelector('[data-view="billing"]');if(!view)return;
 const el=(tag,t)=>{const x=document.createElement(tag);if(t!==undefined)x.textContent=t;return x};
 const panel=el("section");panel.className="admin-box gima-feature-panel";panel.append(el("h3","Status Langganan SaaS"));
 const note=el("p","Paket dan status langganan organisasi. Aktivasi hanya dapat dilakukan oleh pengelola layanan setelah pembayaran diverifikasi. Harga masih placeholder dan belum ditetapkan.");note.className="admin-meta";panel.append(note);
 const status=el("p","Memuat informasi langganan...");status.className="admin-meta";status.setAttribute("role","status");panel.append(status);
 const info=el("div");info.className="gima-feature-metrics";panel.append(info);view.append(panel);
 let request=0;
 const draw=async(orgId)=>{
  const current=++request;info.replaceChildren();if(!orgId||!window.gimaFeatureClient)return;
  const client=window.gimaFeatureClient;
  const [plans,subs]=await Promise.all([
   client.from("gima_subscription_plans").select("id,code,name,description,price_idr,duration_months").eq("is_active",true).order("name"),
   client.from("gima_organization_subscriptions").select("id,plan_id,status,starts_on,ends_on,approved_at").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(10)
  ]);
  if(current!==request)return;
  if(plans.error||subs.error){status.textContent="Data langganan belum tersedia. Jalankan SQL Tahap 18 di Supabase atau periksa hak akses: "+(plans.error?.code||subs.error?.code||"error");return}
  const catalog=plans.data||[],entries=subs.data||[];
  const active=entries.find(s=>s.status==="active"&&s.starts_on&&s.ends_on&&s.starts_on<=new Date().toLocaleDateString("en-CA")&&s.ends_on>=new Date().toLocaleDateString("en-CA"));
  const latest=active||entries[0];const labels={pending:"Menunggu verifikasi",active:"Aktif",expired:"Kedaluwarsa",suspended:"Ditangguhkan",cancelled:"Dibatalkan"};
  status.textContent=latest?"Status tercatat: "+(labels[latest.status]||latest.status)+(active?" — masih dalam masa berlaku":" — belum terkonfirmasi aktif saat ini"):"Belum ada langganan tercatat untuk organisasi ini.";
  const add=(heading,value)=>{const card=el("div");card.className="gima-feature-metric";card.append(el("span",heading),el("strong",value));info.append(card)};
  add("Paket saat ini",catalog.find(p=>p.id===latest?.plan_id)?.name||"Belum ditentukan");
  add("Tanggal mulai",latest?.starts_on||"—");
  add("Berlaku sampai",latest?.ends_on||"—");
  add("Paket tersedia",catalog.map(p=>p.name).join(", ")||"—");
 };
 document.addEventListener("gima:surveys-loaded",ev=>draw(ev.detail?.orgId));
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();