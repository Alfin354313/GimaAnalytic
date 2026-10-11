(()=>{"use strict";
const $=id=>document.getElementById(id),status=$("super-status"),list=$("super-list");
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
let client;
async function load(){
 const {data,error}=await client.rpc("gima_platform_pending_requests");
 list.replaceChildren();
 if(error){status.textContent=error.code==="42501"?"Akses ditolak: akun ini bukan Super Admin.":"Tidak dapat memuat pengajuan: "+(error.code||error.message);return}
 status.textContent=(data||[]).length+" pengajuan menunggu verifikasi.";
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
  box.append(note,approve,el("span"," "),reject,message);list.append(box);
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