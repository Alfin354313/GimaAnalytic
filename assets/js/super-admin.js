(()=>{"use strict";
const $=id=>document.getElementById(id),status=$("super-status"),list=$("super-list");
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
let client,loading=false;

const dashboard=el("section");dashboard.style.marginTop="24px";list.after(dashboard);
const makeTable=(title,headers,rows)=>{const section=el("section");section.className="admin-box";section.style.marginTop="18px";section.append(el("h2",title));if(!rows.length){section.append(el("p","Belum ada data."));return section}const wrapper=el("div");wrapper.style.overflowX="auto";const table=el("table");table.style.width="100%";table.style.borderCollapse="collapse";const head=el("thead"),tr=el("tr");headers.forEach(h=>{const th=el("th",h);th.style.textAlign="left";th.style.padding="10px";tr.append(th)});head.append(tr);table.append(head);const body=el("tbody");rows.forEach(row=>{const tr=el("tr");row.forEach(v=>{const td=el("td",v===null||v===undefined?"—":String(v));td.style.padding="10px";td.style.borderTop="1px solid #dce8ed";tr.append(td)});body.append(tr)});table.append(body);wrapper.append(table);section.append(wrapper);return section};
async function loadDashboard(){
 const {data,error}=await client.rpc("gima_platform_dashboard");
 dashboard.replaceChildren();
 if(error){const p=el("p",error.code==="PGRST202"?"Dashboard ringkasan belum aktif. Jalankan SQL Tahap 18D di Supabase.":"Ringkasan belum tersedia: "+(error.code||error.message));p.setAttribute("role","status");dashboard.append(p);return}
 const d=data||{};
 const title=el("h2","Ringkasan Platform");dashboard.append(title);
 const cards=el("div");cards.style.display="grid";cards.style.gridTemplateColumns="repeat(auto-fit,minmax(170px,1fr))";cards.style.gap="12px";
 [["Total Organisasi",d.organization_count],["Menunggu Verifikasi",d.pending_count],["Langganan Aktif",d.active_count],["Sudah Ditinjau",d.reviewed_count]].forEach(([label,value])=>{const card=el("div");card.className="admin-box";card.append(el("p",label),el("h2",String(value??0)));cards.append(card)});dashboard.append(cards);
 dashboard.append(makeTable("Daftar Pelanggan (maks. 100)",["Organisasi","Paket terakhir","Pengajuan pending"],(d.customers||[]).map(x=>[x.name,x.latest_plan,x.pending_requests])));
 dashboard.append(makeTable("Langganan (100 terbaru)",["Organisasi","Paket","Status","Mulai","Berakhir"],(d.subscriptions||[]).map(x=>[x.organization_name,x.plan_name,x.status,x.starts_on,x.ends_on])));
 dashboard.append(makeTable("Riwayat Keputusan (100 terbaru)",["Organisasi","Paket","Status","Referensi","Tanggal Transfer"],(d.history||[]).map(x=>[x.organization_name,x.plan_name,x.status,x.transfer_reference,x.transfer_date])));
 const foot=el("p","Riwayat ini mencatat status pengajuan, bukan laporan mutasi bank atau bukti penerimaan dana.");foot.className="admin-meta";dashboard.append(foot);
}

const refresh=el("button","Muat ulang pengajuan");refresh.type="button";refresh.className="btn outline";refresh.style.marginBottom="12px";
list.before(refresh);
refresh.addEventListener("click",()=>load());
async function load(){
 if(loading)return;
 loading=true;refresh.disabled=true;status.textContent="Memuat pengajuan terbaru...";
 try{await loadPending();await loadDashboard()}finally{loading=false;refresh.disabled=false}
}
async function loadPending(){
 const {data,error}=await client.rpc("gima_platform_pending_requests");
 list.replaceChildren();
 if(error){status.textContent=error.code==="42501"?"Akses ditolak: akun ini bukan Super Admin.":"Tidak dapat memuat pengajuan: "+(error.code||error.message);return}
 status.textContent=(data||[]).length+" pengajuan menunggu verifikasi.";
 if(!(data||[]).length){const empty=el("p","Belum ada pengajuan. Masuk sebagai admin organisasi untuk mengirim pengajuan uji melalui Kontrak & Tagihan.");empty.className="admin-meta";list.append(empty)}
 for(const r of data||[]){
  const box=el("section");box.className="admin-box";box.style.marginTop="14px";
  box.append(el("h3",r.organization_name+" — "+r.plan_name),el("p","Referensi: "+r.transfer_reference+" | Tanggal transfer: "+r.transfer_date));
  const note=el("textarea");note.placeholder="Catatan verifikasi (opsional, maksimal 2000 karakter)";note.maxLength=2000;note.rows=2;
  const approve=el("button","Setujui & Aktifkan");approve.className="btn";approve.type="button";
  const reject=el("button","Tolak");reject.className="btn outline";reject.type="button";
  const message=el("p");message.setAttribute("role","status");
  const review=async yes=>{
   const action=yes?"menyetujui dan mengaktifkan":"menolak";
   if(!window.confirm("Yakin "+action+" pengajuan "+r.organization_name+"?"+(yes?" Pastikan mutasi rekening sudah diverifikasi.":"")))return;
   approve.disabled=reject.disabled=true;message.textContent="Memproses...";
   try{const {error}=await client.rpc("gima_platform_review_request",{p_request_id:r.request_id,p_approve:yes,p_notes:note.value.trim()});
    if(error){message.textContent="Gagal: "+(error.code||error.message);approve.disabled=reject.disabled=false;return}
    await load();
   }catch(err){message.textContent="Gagal: "+err.message;approve.disabled=reject.disabled=false}
  };
  approve.addEventListener("click",()=>review(true));reject.addEventListener("click",()=>review(false));
  const notice=el("p","Pastikan mutasi rekening bank resmi telah diperiksa sebelum menyetujui. Referensi yang diisi pelanggan bukan bukti pembayaran.");notice.className="admin-meta";
  box.append(notice,note,approve,el("span"," "),reject,message);list.append(box);
 }
}
async function init(){
 if(!window.GIMA_AUTH?.configured()){status.textContent="Supabase belum dikonfigurasi.";return}
 client=window.GIMA_AUTH.getClient();
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user){window.location.replace("/login");return}
 $("super-logout").hidden=false;
 $("super-logout").addEventListener("click",async()=>{await client.auth.signOut();window.location.replace("/login")});
 await load();
}
init().catch(e=>status.textContent="Gagal membuka panel: "+e.message);
})();