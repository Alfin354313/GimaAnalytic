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
  await loadMembers(orgId);
  renderCommercialReadiness(orgId);
  await renderBilling(orgId);
}
async function renderBilling(orgId){
  const panel=$("billing-panel"),root=$("billing-content");if(!panel||!root)return;
  panel.hidden=!canEdit();if(panel.hidden)return;
  root.replaceChildren(el("p","Memuat kontrak dan tagihan...","admin-meta"));
  const [contractsResult,invoicesResult,paymentsResult]=await Promise.all([
    client.from("client_contracts").select("id,client_name,reference,amount_idr,starts_on,ends_on,status").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100),
    client.from("client_invoices").select("id,contract_id,invoice_number,amount_idr,issued_on,due_on,status,payment_method,payment_instructions").eq("organization_id",orgId).order("created_at",{ascending:false}).limit(100),
    client.from("client_payments").select("id,invoice_id,amount_idr,paid_on,transfer_reference,status").eq("organization_id",orgId).limit(500)
  ]);
  if($("org-select").value!==orgId)return;
  root.replaceChildren();
  const error=contractsResult.error||invoicesResult.error||paymentsResult.error;
  if(error){root.append(el("p","Modul tagihan belum tersedia di database atau akses ditolak. Jalankan migrasi Tahap 14 setelah ditinjau: "+(error.code||error.message),"admin-meta"));return;}
  const contracts=contractsResult.data||[],invoices=invoicesResult.data||[],payments=paymentsResult.data||[];
  const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  const verifiedByInvoice=new Map();
  for(const p of payments){
    if(p.status==="verified")verifiedByInvoice.set(p.invoice_id,(verifiedByInvoice.get(p.invoice_id)||0)+Number(p.amount_idr));
  }
  const activeInvoices=invoices.filter(i=>i.status!=="void");
  const billed=activeInvoices.reduce((sum,i)=>sum+Number(i.amount_idr),0);
  const paid=activeInvoices.reduce((sum,i)=>sum+Math.min(Number(i.amount_idr),verifiedByInvoice.get(i.id)||0),0);
  const outstanding=Math.max(0,billed-paid);
  const finance=el("section",undefined,"finance-dashboard");
  finance.append(el("h3","Dashboard Keuangan & Riwayat Pembayaran"));
  const stats=el("div",undefined,"finance-stats");
  const moneyFinance=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
  for(const [label,value] of [["Total Tagihan",billed],["Sudah Dibayar (Terverifikasi)",paid],["Sisa Piutang",outstanding]]){
    const card=el("div",undefined,"finance-stat");card.append(el("small",label),el("strong",moneyFinance(value)));stats.append(card);
  }
  finance.append(stats);
  const filters=el("div",undefined,"finance-filters");
  const search=el("input");search.type="search";search.placeholder="Cari klien atau nomor invoice";search.setAttribute("aria-label","Cari klien atau nomor invoice");
  const statusFilter=el("select");statusFilter.setAttribute("aria-label","Filter status invoice");
  for(const [value,label] of [["all","Semua status"],["paid","Lunas"],["unpaid","Belum lunas"],["overdue","Lewat jatuh tempo"]]){
    const option=el("option",label);option.value=value;statusFilter.append(option);
  }
  filters.append(search,statusFilter);finance.append(filters);
  const invoiceHistory=el("div",undefined,"finance-history");finance.append(invoiceHistory);
  const monthly=el("div",undefined,"finance-monthly");finance.append(monthly);
  const renderFinance=()=>{
    invoiceHistory.replaceChildren();monthly.replaceChildren();
    const q=search.value.trim().toLocaleLowerCase("id");
    const today=new Date().toISOString().slice(0,10);
    const matching=activeInvoices.filter(i=>{
      const contract=contracts.find(c=>c.id===i.contract_id);
      const verified=verifiedByInvoice.get(i.id)||0;
      const isPaid=verified>=Number(i.amount_idr);
      const isOverdue=!isPaid&&i.due_on<today;
      const matchStatus=statusFilter.value==="all"||(statusFilter.value==="paid"&&isPaid)||(statusFilter.value==="unpaid"&&!isPaid)||(statusFilter.value==="overdue"&&isOverdue);
      return matchStatus&&((contract?.client_name||"")+" "+i.invoice_number).toLocaleLowerCase("id").includes(q);
    });
    invoiceHistory.append(el("h4","Daftar Invoice ("+matching.length+")"));
    if(!matching.length)invoiceHistory.append(el("p","Tidak ada invoice yang cocok.","admin-meta"));
    for(const i of matching){
      const contract=contracts.find(c=>c.id===i.contract_id);
      const verified=verifiedByInvoice.get(i.id)||0;
      const label=verified>=Number(i.amount_idr)?"Lunas":i.due_on<today?"Terlambat":"Belum lunas";
      const row=el("div",undefined,"finance-history-row");
      row.append(el("strong",i.invoice_number+" — "+(contract?.client_name||"Klien")));
      row.append(el("span",moneyFinance(i.amount_idr)+" • Terbayar "+moneyFinance(verified)+" • "+label+" • Jatuh tempo "+i.due_on));
      invoiceHistory.append(row);
    }
    monthly.append(el("h4","Pemasukan Bulanan (Pembayaran Terverifikasi)"));
    const grouped=new Map();
    for(const p of payments.filter(p=>p.status==="verified")){
      const month=String(p.paid_on||"").slice(0,7);
      if(/^\\d{4}-\\d{2}$/.test(month))grouped.set(month,(grouped.get(month)||0)+Number(p.amount_idr));
    }
    if(!grouped.size)monthly.append(el("p","Belum ada pembayaran terverifikasi.","admin-meta"));
    for(const [month,total] of [...grouped].sort((a,b)=>b[0].localeCompare(a[0]))){
      const row=el("div",undefined,"finance-history-row");
      row.append(el("strong",month),el("span",moneyFinance(total)));monthly.append(row);
    }
    const payHistory=el("div",undefined,"finance-payment-history");
    payHistory.append(el("h4","Riwayat Pembayaran"));
    for(const p of [...payments].sort((a,b)=>String(b.paid_on).localeCompare(String(a.paid_on)))){
      const inv=invoices.find(i=>i.id===p.invoice_id);
      const row=el("div",undefined,"finance-history-row");
      row.append(el("strong",(inv?.invoice_number||"Invoice")+" — "+p.paid_on));
      row.append(el("span",moneyFinance(p.amount_idr)+" • "+p.status+" • "+p.transfer_reference));
      payHistory.append(row);
    }
    monthly.append(payHistory);
  };
  search.addEventListener("input",renderFinance);
  statusFilter.addEventListener("change",renderFinance);
  renderFinance();
  root.append(finance);
  const title=(t)=>root.append(el("h3",t));
  const form=(fields,buttonLabel,onSubmit)=>{
    const f=el("form",undefined,"billing-form");const inputs={};
    for(const [key,label,type,options] of fields){
      const wrap=el("label",label);const input=el(type==="select"?"select":"input");
      if(type==="select"){for(const [value,text] of options||[]){const o=el("option",text);o.value=value;input.append(o);}}
      else input.type=type;
      input.required=true;if(type==="number"){input.min="1";input.step="1";}
      wrap.append(input);f.append(wrap);inputs[key]=input;
    }
    const button=el("button",buttonLabel);button.type="submit";f.append(button);
    const notice=el("p",undefined,"admin-meta");notice.setAttribute("role","status");f.append(notice);
    f.addEventListener("submit",async e=>{
      e.preventDefault();button.disabled=true;notice.textContent="Menyimpan...";
      try{const result=await onSubmit(Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value])));
        if(result.error){notice.textContent="Gagal menyimpan: "+(result.error.code||result.error.message);return;}
        await renderBilling(orgId);
      }finally{button.disabled=false;}
    });root.append(f);
  };

  const openDocument=(invoice,contract,verified,paid)=>{
    const popup=window.open("","_blank");
    if(!popup){say("Izinkan pop-up browser untuk mencetak PDF.");return;}
    const doc=popup.document;
    doc.title=(paid?"Bukti-Lunas-":"Invoice-")+invoice.invoice_number;
    const style=doc.createElement("style");
    style.textContent="*{box-sizing:border-box}body{font:14px/1.65 Arial,sans-serif;color:#1b3547;max-width:800px;margin:36px auto;padding:0 30px}.head{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:3px solid #1673b6;padding-bottom:20px}.brand{display:flex;align-items:center;gap:14px}.brand img{width:56px;height:56px;object-fit:contain}.brand strong{display:block;font-size:23px;color:#174f84}.brand small{display:block;color:#587183}.eyebrow{font-size:12px;font-weight:bold;letter-spacing:1px;color:#47728c}.meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:26px 0}.meta p{margin:4px 0}h1{font-size:27px;color:#174f84;margin:26px 0 8px}table{border-collapse:collapse;width:100%;margin:20px 0}th,td{padding:12px;border-bottom:1px solid #dce7ef;text-align:left}th{background:#f1f7fc;color:#245578}.amount{font-size:22px;font-weight:bold;color:#174f84}.paid{display:inline-block;padding:8px 18px;border:2px solid #18804d;color:#18804d;font-size:21px;font-weight:bold;letter-spacing:2px}.unpaid{color:#a35816;font-weight:bold}.foot{border-top:1px solid #dce7ef;margin-top:36px;padding-top:16px;color:#5b7282;font-size:12px}.print{margin-top:24px;border:0;border-radius:8px;padding:12px 20px;background:#146fa8;color:white;cursor:pointer}@media print{@page{size:A4;margin:16mm}.print{display:none}body{margin:0;padding:0;max-width:none}h1{break-after:avoid}table{break-inside:avoid}}";
    doc.head.append(style);
    const add=(parent,tag,value,cls)=>{const node=doc.createElement(tag);node.textContent=value;if(cls)node.className=cls;parent.append(node);return node;};
    const head=add(doc.body,"header",undefined,"head");
    const brand=add(head,"div",undefined,"brand");
    const logo=doc.createElement("img");logo.src=new URL("/assets/giandra-maheswara-logo.svg",window.location.origin).href;logo.alt="Logo GIMA Analytics";brand.append(logo);
    const brandText=doc.createElement("div");brand.append(brandText);add(brandText,"strong","GIMA Analytics");add(brandText,"small","BY GIANDRA MAHESWARA");
    add(head,"span",paid?"BUKTI PEMBAYARAN":"INVOICE","eyebrow");
    add(doc.body,"h1",paid?"Bukti Pembayaran Lunas":"Invoice Tagihan");
    const meta=add(doc.body,"section",undefined,"meta");
    const left=doc.createElement("div"),right=doc.createElement("div");meta.append(left,right);
    add(left,"p","Ditagihkan kepada:");
    add(left,"strong",contract?.client_name||"Klien");
    add(left,"p","Referensi kontrak: "+(contract?.reference||"—"));
    add(right,"p","No. invoice: "+invoice.invoice_number);
    add(right,"p","Tanggal terbit: "+(invoice.issued_on||"—"));
    add(right,"p","Jatuh tempo: "+invoice.due_on);
    const table=doc.createElement("table");doc.body.append(table);
    const trHead=doc.createElement("tr");table.append(trHead);add(trHead,"th","Keterangan");add(trHead,"th","Jumlah");
    for(const [label,value] of [["Layanan GIMA Analytics",money(invoice.amount_idr)],["Pembayaran terverifikasi",money(verified)],["Sisa tagihan",money(Math.max(0,Number(invoice.amount_idr)-verified))]]){
      const tr=doc.createElement("tr");table.append(tr);add(tr,"td",label);add(tr,"td",value);
    }
    add(doc.body,"p","Total invoice: "+money(invoice.amount_idr),"amount");
    if(paid){
      add(doc.body,"p","LUNAS","paid");
      add(doc.body,"p","Seluruh nilai tagihan telah dicatat sebagai pembayaran terverifikasi oleh Owner.");
    }else{
      add(doc.body,"p","BELUM LUNAS","unpaid");
      add(doc.body,"p","Pembayaran dilakukan melalui transfer bank dan dikonfirmasi melalui WhatsApp pengelola. Mintalah detail rekening resmi sebelum transfer.");
      if(invoice.payment_method==="bank_transfer"&&invoice.payment_instructions){
        add(doc.body,"p","Petunjuk pembayaran: "+invoice.payment_instructions);
      }
    }
    add(doc.body,"p","Dokumen ini dibuat secara elektronik dari catatan transaksi GIMA Analytics. Simpan PDF melalui menu cetak browser.","foot");
    const button=add(doc.body,"button","Cetak / Simpan sebagai PDF","print");button.type="button";button.onclick=()=>popup.print();
    popup.focus();
  };

  const deleteBilling=async(table,id,label)=>{
    if(role()!=="owner")return;
    if(!window.confirm("Hapus "+label+" secara permanen? Tindakan ini tidak bisa dibatalkan."))return;
    const {data,error}=await client.from(table).delete().eq("id",id).eq("organization_id",orgId).select("id");
    if(error){say("Gagal menghapus "+label+": "+(error.message||error.code));return;}
    if(!data?.length){say("Data tidak terhapus. Periksa hak akses dan jalankan migrasi SQL 012.");return;}
    say(label+" berhasil dihapus.");await renderBilling(orgId);
  };
  title("Kontrak Klien");
  for(const c of contracts){
    const row=el("div",undefined,"billing-record");
    row.append(el("p",c.reference+" — "+c.client_name+" • "+money(c.amount_idr)+" • "+c.status));
    if(role()==="owner")row.append(action("Hapus Kontrak",()=>deleteBilling("client_contracts",c.id,"kontrak "+c.reference)));
    root.append(row);
  }
  form([["client_name","Nama klien","text"],["reference","Nomor kontrak","text"],["amount_idr","Nilai kontrak (Rp)","number"],["starts_on","Mulai kontrak","date"]],
    "Simpan Kontrak + Invoice Otomatis",v=>client.from("client_contracts").insert({...v,organization_id:orgId,amount_idr:Number(v.amount_idr)}));
  title("Invoice Otomatis — Jatuh Tempo 5 Hari");
  root.append(el("p","Invoice otomatis dibuat saat kontrak disimpan. QRIS dan Virtual Account belum aktif sampai payment gateway terintegrasi.","admin-meta"));
  for(const i of invoices){
    const verified=payments.filter(p=>p.invoice_id===i.id&&p.status==="verified").reduce((sum,p)=>sum+Number(p.amount_idr),0);
    const item=el("div",undefined,"billing-record");
    item.append(el("p",i.invoice_number+" • "+money(i.amount_idr)+" • Jatuh tempo "+i.due_on+" • Terverifikasi "+money(verified)+" • "+i.status));
    const method=el("select");
    for(const [value,label] of [["bank_transfer","Transfer bank manual"],["qris","QRIS (belum aktif)"],["virtual_account","Virtual Account (belum aktif)"]]){
      const opt=el("option",label);opt.value=value;method.append(opt);
    }
    method.value=i.payment_method||"bank_transfer";
    const note=el("input");note.type="text";note.maxLength=300;note.placeholder="Instruksi pembayaran / rekening bisnis";note.value=i.payment_instructions||"";
    const save=action("Simpan metode pembayaran",async()=>{
      if(method.value!=="bank_transfer"&&!window.confirm("QRIS/VA belum terintegrasi; metode ini belum bisa menerima pembayaran. Lanjutkan?"))return;
      const {error}=await client.from("client_invoices").update({payment_method:method.value,payment_instructions:note.value.trim()}).eq("id",i.id).eq("organization_id",orgId);
      if(error){say("Gagal menyimpan metode: "+(error.code||error.message));return;}
      await renderBilling(orgId);
    });
    item.append(method,note,save);
    const contract=contracts.find(c=>c.id===i.contract_id);
    item.append(action("Invoice PDF",()=>openDocument(i,contract,verified,false)));
    if(role()==="owner"&&!payments.some(p=>p.invoice_id===i.id)){
      item.append(action("Hapus Invoice",()=>deleteBilling("client_invoices",i.id,"invoice "+i.invoice_number)));
    }
    if(verified>=Number(i.amount_idr)&&Number(i.amount_idr)>0){
      item.append(action("Bukti Lunas PDF",()=>openDocument(i,contract,verified,true)));
    }
    item.append(action("Kirim via WhatsApp",()=>{
      const number=window.prompt("Nomor WhatsApp klien (contoh: 6281234567890). PDF dikirim sebagai lampiran secara manual:");
      if(number===null)return;
      const normalized=number.replace(/[^0-9]/g,"").replace(/^0/,"62");
      if(!/^62[0-9]{8,13}$/.test(normalized)){say("Nomor WhatsApp tidak valid.");return;}
      const label=verified>=Number(i.amount_idr)?"Bukti pembayaran lunas":"Invoice tagihan";
      const msg=label+" GIMA Analytics "+i.invoice_number+" untuk "+(contract?.client_name||"klien")+". Nilai: "+money(i.amount_idr)+". Jatuh tempo: "+i.due_on+". Dokumen PDF akan kami kirim sebagai lampiran.";
      window.open("https://wa.me/"+normalized+"?text="+encodeURIComponent(msg),"_blank","noopener,noreferrer");
    }));
    root.append(item);
  }
  title("Pembayaran Transfer Manual");
  for(const p of payments){
    const invoice=invoices.find(i=>i.id===p.invoice_id);
    const row=el("div",undefined,"billing-record");
    row.append(el("span",(invoice?.invoice_number||"Invoice")+" • "+money(p.amount_idr)+" • "+p.status+" • "+p.transfer_reference));
    if(role()==="owner"&&p.status==="pending"){
      const confirm=action("Verifikasi",async()=>{
        if(!window.confirm("Pastikan dana benar-benar sudah diterima di rekening sebelum verifikasi."))return;
        const {error}=await client.from("client_payments").update({status:"verified"}).eq("id",p.id).eq("organization_id",orgId);
        if(error){say("Gagal verifikasi pembayaran: "+(error.code||error.message));return;}
        await renderBilling(orgId);
      });row.append(confirm);
    }
    if(role()==="owner"&&p.status==="pending"){
      row.append(action("Hapus Pembayaran",()=>deleteBilling("client_payments",p.id,"pembayaran pending "+p.transfer_reference)));
    }
    root.append(row);
  }
  if(invoices.length)form([
    ["invoice_id","Invoice","select",invoices.filter(i=>i.status!=="void").map(i=>[i.id,i.invoice_number])],
    ["amount_idr","Jumlah transfer (Rp)","number"],["paid_on","Tanggal transfer","date"],["transfer_reference","Referensi transfer","text"]
  ],"Catat Pembayaran (Menunggu Verifikasi)",v=>client.from("client_payments").insert({...v,organization_id:orgId,amount_idr:Number(v.amount_idr),status:"pending"}));
  root.append(el("p","Pencatatan ini tidak memindahkan dana, tidak mengirim invoice otomatis, dan tidak membuktikan pembayaran sebelum diverifikasi pemilik.","admin-meta"));
}
function renderCommercialReadiness(orgId){
  const root=$("commercial-content");if(!root)return;
  root.replaceChildren();
  const org=orgs.find(o=>o.id===orgId);if(!org)return;
  const draft=surveys.filter(s=>s.status==="draft").length;
  const published=surveys.filter(s=>s.status==="published").length;
  const closed=surveys.filter(s=>s.status==="closed").length;
  const metrics=[["Survei draft",draft],["Survei aktif",published],["Survei selesai",closed]];
  for(const [name,value] of metrics){const line=el("div",undefined,"admin-stat");line.append(el("span",name),el("strong",String(value)));root.append(line);}
  const checklist=el("div",undefined,"commercial-checklist");
  checklist.append(el("h3","Checklist Operasional"));
  const items=[
    ["Akun organisasi aktif",true],
    ["Setidaknya satu survei dibuat",surveys.length>0],
    ["Survei pernah dipublikasikan",published+closed>0],
    ["Laporan dan izin akses sudah ditinjau",false],
    ["Persetujuan klien, privasi, dan retensi sudah diverifikasi",false]
  ];
  const list=el("ul");
  for(const [label,complete] of items){const item=el("li",(complete?"✓ ":"○ ")+label);item.className=complete?"commercial-complete":"commercial-pending";list.append(item);}
  checklist.append(list);
  checklist.append(el("p","Dua pemeriksaan terakhir wajib dilakukan secara manual. Checklist ini tidak menyatakan organisasi sudah siap produksi.","admin-meta"));
  root.append(checklist);
  if(["owner","admin"].includes(org.role)){
    const button=action("Unduh Rekap Survei (CSV)",()=>{
      const csvCell=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
      const rows=[["Organisasi","Judul survei","Status","Dibuat pada"],...surveys.map(s=>[org.name,s.title,s.status,s.created_at||""])];
      const content="\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n");
      const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="gima-rekap-survei.csv";document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    button.className="member-export";root.append(button);
  }
}
async function loadMembers(orgId){
  const root=$("member-list");if(!root)return;
  root.replaceChildren(el("p","Memuat anggota...","admin-meta"));
  const {data,error}=await client.rpc("gima_list_organization_members",{p_organization_id:orgId});
  if($("org-select").value!==orgId)return;
  root.replaceChildren();
  if(error){root.append(el("p","Daftar anggota belum dapat diakses sesuai kebijakan RLS.","admin-meta"));return;}
  if(!data?.length){root.append(el("p","Tidak ada data anggota yang dapat ditampilkan.","admin-meta"));return;}
  const counts=new Map();
  for(const member of data)counts.set(member.role,(counts.get(member.role)||0)+1);
  for(const [memberRole,count] of counts){
    const row=el("div",undefined,"admin-stat");
    row.append(el("span",memberRole==="owner"?"Pemilik":memberRole==="admin"?"Admin":memberRole==="member"?"Anggota":memberRole),el("strong",String(count)));
    root.append(row);
  }
  root.append(el("p","Jumlah yang terlihat: "+data.length+" anggota. Angka mengikuti izin akses akun Anda.","admin-meta"));
  const permissions=el("div",undefined,"member-permissions");
  permissions.append(el("h3","Panduan Hak Akses"));
  const matrix=el("table",undefined,"member-permission-table");
  const thead=el("thead"),headRow=el("tr");
  for(const title of ["Peran","Lihat survei","Kelola survei"]){headRow.append(el("th",title));}
  thead.append(headRow);matrix.append(thead);
  const body=el("tbody");
  for(const [r,read,write] of [["Pemilik","Ya","Ya"],["Admin","Ya","Ya"],["Analis","Sesuai RLS","Tidak"]]){
    const tr=el("tr");for(const value of [r,read,write])tr.append(el("td",value));body.append(tr);
  }
  matrix.append(body);permissions.append(matrix);
  permissions.append(el("p","Ringkasan ini menggambarkan aturan tampilan dashboard. Izin sesungguhnya ditentukan kebijakan RLS dan fungsi Supabase.","admin-meta"));
  root.append(permissions);
  const currentOrg=orgs.find(o=>o.id===orgId);
  if(currentOrg?.role==="owner"){
    const form=el("form",undefined,"member-add-form");
    form.append(el("h3","Tambah Anggota Terdaftar"));
    form.append(el("p","Masukkan User ID (UUID) akun yang sudah terdaftar di Supabase Auth. Jangan gunakan email atau service_role key.","admin-meta"));
    const uid=el("input");uid.type="text";uid.placeholder="User ID (UUID)";uid.required=true;uid.setAttribute("aria-label","User ID anggota");
    uid.pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    const roleSelect=el("select");roleSelect.setAttribute("aria-label","Peran anggota");
    for(const role of ["analyst","admin"]){const option=el("option",role);option.value=role;roleSelect.append(option);}
    const submit=el("button","Tambah Anggota");submit.type="submit";
    const feedback=el("p",undefined,"admin-meta");feedback.setAttribute("role","status");
    form.append(uid,roleSelect,submit,feedback);
    form.addEventListener("submit",async e=>{
      e.preventDefault();submit.disabled=true;feedback.textContent="Memproses...";
      const {error:addError}=await client.rpc("gima_add_organization_member",{
        p_organization_id:orgId,p_user_id:uid.value.trim(),p_role:roleSelect.value
      });
      if(addError){feedback.textContent="Gagal menambah anggota: "+(addError.message||addError.code);submit.disabled=false;return;}
      feedback.textContent="Anggota berhasil ditambahkan.";submit.disabled=false;
      await loadMembers(orgId);
    });
    root.append(form);
  }
  if(canEdit()){
    const exportButton=action("Unduh Ringkasan Tim (CSV)",()=>{
      const cell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
      const rows=[["Organisasi","Peran","Jumlah terlihat"],...Array.from(counts,([r,n])=>[orgs.find(o=>o.id===orgId)?.name||"",r,n])];
      const blob=new Blob(["\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="gima-ringkasan-tim.csv";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    exportButton.className="member-export";root.append(exportButton);
  }
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
    if(s.status==="published")actions.append(action("Salin Link Survei",async()=>{const link=new URL("/isi-survei.html?id="+encodeURIComponent(s.id),window.location.origin).href;try{await navigator.clipboard.writeText(link);say("Link survei disalin. Bagikan tautan ini kepada responden.");}catch{window.prompt("Salin link survei:",link);}}));
    if(canEdit()){
      if(s.status==="draft"){
        actions.append(action("Ubah judul",async()=>{const title=window.prompt("Judul survei (3–160 karakter):",s.title);if(title===null)return;const t=title.trim();if(t.length<3||t.length>160){say("Judul harus 3–160 karakter.");return;}await updateSurvey(s,{title:t});}));
        actions.append(action("Publikasikan",async()=>{const {count,error}=await client.from("survey_questions").select("id",{count:"exact",head:true}).eq("survey_id",s.id);if(error){say("Tidak dapat memeriksa pertanyaan.");return;}if(!count){say("Tambahkan minimal satu pertanyaan sebelum publikasi.");return;}if(window.confirm("Publikasikan survei dan aktifkan pengumpulan jawaban publik?"))await updateSurvey(s,{status:"published"});}));
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
  const root=$("question-list");root.replaceChildren(el("p","Memuat analitik survei...","admin-meta"));
  const {data,error}=await client.rpc("gima_survey_summary",{p_survey_id:s.id});
  root.replaceChildren();
  if(error){root.append(el("p","Laporan tidak dapat dimuat: "+(error.code||error.message),"admin-meta"));return;}
  if(!data?.length){root.append(el("p","Belum ada pertanyaan dalam survei ini.","admin-meta"));return;}
  const ready=data.filter(q=>Number(q.response_count)>=5&&q.average_score!==null);
  const heading=el("div",undefined,"report-overview");
  heading.append(el("strong",ready.length+" dari "+data.length+" pertanyaan memiliki hasil yang dapat ditampilkan"));
  heading.append(el("p","Nilai hanya ditampilkan jika sedikitnya 5 respons valid tersedia pada pertanyaan tersebut. Angka 0 pada pertanyaan lain berarti hasil disembunyikan, bukan berarti tidak ada respons.","admin-meta"));
  root.append(heading);
  const executive=el("section",undefined,"executive-summary");
  executive.append(el("h3","Ringkasan Eksekutif"));
  const kpis=el("div",undefined,"executive-kpis");
  function metric(label,value,detail){
    const card=el("div",undefined,"executive-kpi");
    card.append(el("span",label),el("strong",value),el("small",detail));
    kpis.append(card);
  }
  const scores=ready.map(q=>Number(q.average_score));
  const overallScore=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
  const responseCounts=ready.map(q=>Number(q.response_count));
  const consistentCount=responseCounts.length>0&&responseCounts.every(c=>c===responseCounts[0]);
  metric("Skor agregat",overallScore===null?"Tertutup":overallScore.toFixed(2)+" / 5","Rata-rata pertanyaan yang memenuhi ambang privasi");
  metric("Cakupan pertanyaan",ready.length+" / "+data.length,"Memenuhi minimum 5 respons per pertanyaan");
  metric("Respons per pertanyaan",consistentCount?String(responseCounts[0]):"Beragam","Bukan jumlah responden unik lintas pertanyaan");
  const lowQuestions=ready.filter(q=>Number(q.average_score)<3);
  metric("Area perlu ditinjau",ready.length?String(lowQuestions.length):"—","Pertanyaan dengan skor di bawah 3/5");
  executive.append(kpis);
  executive.append(el("p","Indikator bersifat deskriptif, bukan ukuran representativitas atau diagnosis organisasi. Perbandingan hanya dapat dibuat dari pertanyaan yang identik dan memenuhi ambang privasi.","admin-meta"));
  root.append(executive);
  const cover=el("section",undefined,"professional-cover");
  cover.append(el("p","GIMA ANALYTICS | LAPORAN ORGANISASI","professional-eyebrow"));
  cover.append(el("h2",s.title));
  cover.append(el("p","Laporan agregat hasil survei • "+new Date().toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}),"admin-meta"));
  const org=orgs.find(o=>o.id===s.organization_id);
  cover.append(el("p","Organisasi: "+(org?.name||"Organisasi terkait"),"admin-meta"));
  cover.append(el("p","Disusun dari hasil survei yang tersedia pada saat laporan dibuat. Angka dengan kurang dari 5 respons valid per pertanyaan disembunyikan.","admin-meta"));
  root.insertBefore(cover,root.firstChild);
  const method=el("section",undefined,"professional-method");
  method.append(el("h3","Metodologi dan Batasan"));
  const methodList=el("ul");
  for(const line of [
    "Skala pengukuran: Likert 1 sampai 5 untuk setiap pertanyaan.",
    "Skor agregat merupakan rata-rata skor pertanyaan yang lolos ambang minimum 5 respons; bukan rata-rata seluruh karyawan.",
    "Pertanyaan dengan kurang dari 5 respons valid tidak ditampilkan untuk menjaga privasi.",
    "Hasil bersifat deskriptif; tidak membuktikan hubungan sebab-akibat dan tidak otomatis mewakili seluruh organisasi.",
    "Rekomendasi adalah titik awal diskusi, bukan keputusan otomatis tentang individu atau karyawan."
  ])methodList.append(el("li",line));
  method.append(methodList);root.append(method);
  const checklist=el("section",undefined,"professional-checklist");
  checklist.append(el("h3","Checklist Sebelum Laporan Dibagikan"));
  const items=[
    "Pastikan nama organisasi dan judul survei sudah benar.",
    "Periksa kembali pertanyaan dengan skor rendah dan konteks organisasinya.",
    "Hindari menyimpulkan identitas responden dari kelompok kecil.",
    "Konfirmasi rekomendasi dengan pemangku kepentingan sebelum implementasi."
  ];
  const checks=el("ul");for(const item of items)checks.append(el("li",item));
  checklist.append(checks);
  checklist.append(el("p","Checklist ini panduan internal dan tidak menggantikan validasi profesional.","admin-meta"));
  root.append(checklist);
  const reportFooter=el("p","GIMA Analytics • Dokumen ringkasan survei • "+new Date().toLocaleDateString("id-ID"),"professional-report-footer");
  const printButton=action("Cetak / Simpan PDF",()=>window.print());
  printButton.className="report-download report-print-button";
  root.append(printButton);
  renderPeriodComparison(root,s,data);
  if(ready.length){
    const overall=ready.reduce((sum,q)=>sum+Number(q.average_score),0)/ready.length;
    const card=el("div",undefined,"report-score");
    card.append(el("span","Rata-rata dari pertanyaan yang memenuhi ambang privasi"),el("strong",overall.toFixed(2)+" / 5"));
    root.append(card);
    const download=action("Unduh CSV Ringkasan",()=>downloadReport(s,data));
    download.className="report-download";
    root.append(download);
  }else root.append(el("p","Laporan agregat belum dapat ditampilkan. Tunggu hingga minimal 5 jawaban valid per pertanyaan.","admin-meta"));
  const list=el("div",undefined,"report-chart");
  for(const [index,q] of data.entries()){
    const count=Number(q.response_count)||0;
    const valid=count>=5&&q.average_score!==null;
    const item=el("div",undefined,"report-item");
    item.append(el("div",(index+1)+". "+q.question_prompt,"report-question"));
    if(valid){
      const score=Number(q.average_score);
      const line=el("div",undefined,"report-bar-line");
      const track=el("div",undefined,"report-track");
      const fill=el("div",undefined,"report-fill");fill.style.width=Math.max(0,Math.min(100,score/5*100))+"%";
      track.setAttribute("role","img");track.setAttribute("aria-label","Skor rata-rata "+score.toFixed(2)+" dari 5");
      track.append(fill);line.append(track,el("strong",score.toFixed(2)+" / 5"));item.append(line);
      item.append(el("p",count+" respons valid","admin-meta"));
    }else item.append(el("p","Hasil disembunyikan (minimum 5 respons)","admin-meta"));
    list.append(item);
  }
  root.append(list);
  if(ready.length>=2){
    const ranked=[...ready].sort((a,b)=>Number(b.average_score)-Number(a.average_score));
    const insights=el("section",undefined,"report-insights");
    insights.append(el("h3","Insight Otomatis"));
    const high=ranked[0],low=ranked[ranked.length-1];
    const intro=el("p","Ringkasan deskriptif berdasarkan rata-rata skor pertanyaan yang memenuhi minimum 5 respons. Ini bukan diagnosis organisasi.","admin-meta");
    insights.append(intro);
    const best=el("p");best.append(el("strong","Skor tertinggi: "),document.createTextNode(high.question_prompt+" ("+Number(high.average_score).toFixed(2)+"/5)."));insights.append(best);
    const worst=el("p");worst.append(el("strong","Skor terendah: "),document.createTextNode(low.question_prompt+" ("+Number(low.average_score).toFixed(2)+"/5)."));insights.append(worst);
    const diff=Number(high.average_score)-Number(low.average_score);
    insights.append(el("p","Selisih skor tertinggi dan terendah: "+diff.toFixed(2)+" poin. Tinjau pertanyaan dengan skor rendah bersama konteks organisasi sebelum menentukan tindakan.","admin-meta"));
    root.append(insights);
    const advice=el("section",undefined,"report-insights report-recommendations");
    advice.append(el("h3","Rekomendasi Tindakan"));
    advice.append(el("p","Saran awal berbasis skor agregat. Verifikasi bersama karyawan dan pemangku kepentingan sebelum menetapkan program.","admin-meta"));
    const lowScore=Number(low.average_score);
    const text=String(low.question_prompt||"").toLocaleLowerCase("id-ID");
    let actions;
    if(/karier|karir|pengembang|promosi|pelatihan|kompetensi/.test(text)){
      actions=["Tinjau transparansi jalur karier dan kriteria promosi.","Diskusikan kebutuhan pelatihan dan pengembangan dengan karyawan.","Tetapkan indikator tindak lanjut dan evaluasi ulang pada survei berikutnya."];
    }else if(/atasan|pemimpin|manajer|dukungan|supervisor/.test(text)){
      actions=["Lakukan diskusi terstruktur tentang dukungan dari atasan.","Evaluasi praktik umpan balik dan komunikasi manajer.","Uji perbaikan secara terbatas dan ukur kembali hasilnya."];
    }else if(/lingkungan|produktivit|fasilitas|beban kerja|kerja sama/.test(text)){
      actions=["Petakan hambatan kerja dan kebutuhan fasilitas bersama tim.","Tinjau pembagian beban kerja dan proses kolaborasi.","Prioritaskan perbaikan yang dapat diuji serta dievaluasi."];
    }else if(/puas|kepuasan|rekomendasi|perusahaan/.test(text)){
      actions=["Gali faktor penyebab skor rendah melalui forum umpan balik sukarela.","Evaluasi kebijakan dan pengalaman kerja yang relevan.","Rencanakan tindakan perbaikan yang terukur dan survei ulang."];
    }else{
      actions=["Bahas pertanyaan dengan skor terendah bersama perwakilan karyawan.","Kumpulkan konteks tambahan secara sukarela tanpa mengungkap identitas responden.","Tentukan perbaikan yang terukur dan evaluasi pada periode berikutnya."];
    }
    advice.append(el("p","Area prioritas: "+low.question_prompt+" ("+lowScore.toFixed(2)+"/5)."));
    const ul=el("ul");for(const item of actions)ul.append(el("li",item));advice.append(ul);
    if(lowScore>=3.5)advice.append(el("p","Seluruh skor yang ditampilkan relatif tinggi; rekomendasi ini bersifat pemeliharaan dan peningkatan berkelanjutan.","admin-meta"));
    const plan=action("Unduh Rencana Tindak Lanjut (CSV)",()=>downloadActionPlan(s,low,actions));
    plan.className="report-download";advice.append(plan);
    root.append(advice);
  }
  root.append(reportFooter);
  $("question-panel").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderPeriodComparison(root,current,currentData){
  const section=el("section",undefined,"period-comparison");
  section.append(el("h3","Perbandingan Antar Survei"));
  section.append(el("p","Pilih survei lain dari organisasi yang sama. Hanya pertanyaan dengan teks persis sama, tidak duplikat, dan minimal 5 respons valid pada kedua survei yang dibandingkan. Skala keduanya Likert 1–5.","admin-meta"));
  const candidates=surveys.filter(s=>s.id!==current.id&&s.status!=="draft");
  if(!candidates.length){
    section.append(el("p","Belum ada survei pembanding yang dipublikasikan atau ditutup. Buat survei periode berikutnya dengan pertanyaan identik untuk mengaktifkan perbandingan.","admin-meta"));
    root.append(section);return;
  }
  const label=el("label","Survei pembanding");const select=el("select");
  select.setAttribute("aria-label","Survei pembanding");
  const placeholder=el("option","Pilih survei pembanding");placeholder.value="";select.append(placeholder);
  for(const item of candidates){const option=el("option",item.title);option.value=item.id;select.append(option);}
  section.append(label,select);
  const result=el("div",undefined,"period-results");section.append(result);
  let requestId=0;
  select.addEventListener("change",async()=>{
    const selectedId=select.value;const seq=++requestId;result.replaceChildren();
    if(!selectedId)return;
    result.append(el("p","Memuat perbandingan...","admin-meta"));
    const {data,error}=await client.rpc("gima_survey_summary",{p_survey_id:selectedId});
    if(seq!==requestId)return;
    result.replaceChildren();
    if(error){result.append(el("p","Gagal memuat survei pembanding: "+(error.code||error.message),"admin-meta"));return;}
    const normalize=q=>String(q.question_prompt||"").trim().replace(/\\s+/g," ").toLocaleLowerCase("id-ID");
    const currentMap=new Map(),otherMap=new Map();
    for(const [items,map] of [[currentData,currentMap],[data||[],otherMap]]){
      for(const q of items){const key=normalize(q);if(!map.has(key))map.set(key,[]);map.get(key).push(q);}
    }
    const pairs=[];
    for(const [key,a] of currentMap){
      const b=otherMap.get(key);
      if(a.length!==1||!b||b.length!==1)continue;
      const left=a[0],right=b[0];
      if(Number(left.response_count)<5||Number(right.response_count)<5||left.average_score===null||right.average_score===null)continue;
      pairs.push({prompt:left.question_prompt,current:Number(left.average_score),previous:Number(right.average_score)});
    }
    if(!pairs.length){
      result.append(el("p","Belum ada pertanyaan identik yang memenuhi minimal 5 respons pada kedua survei. Tidak ada skor yang dibandingkan.","admin-meta"));return;
    }
    const other=candidates.find(x=>x.id===selectedId);
    result.append(el("p","Selisih = skor survei saat ini dikurangi skor "+(other?.title||"pembanding")+". Nilai positif berarti lebih tinggi pada survei saat ini.","admin-meta"));
    const average=pairs.reduce((acc,p)=>acc+p.current-p.previous,0)/pairs.length;
    const top=el("div",undefined,"period-delta");
    top.append(el("span","Rata-rata selisih "+pairs.length+" pertanyaan sepadan"),el("strong",(average>0?"+":"")+average.toFixed(2)+" poin"));
    result.append(top);
    for(const p of pairs){
      const line=el("div",undefined,"period-row");
      line.append(el("strong",p.prompt));
      line.append(el("span","Pembanding "+p.previous.toFixed(2)+" / 5 → Saat ini "+p.current.toFixed(2)+" / 5"));
      const delta=p.current-p.previous;
      line.append(el("span","Selisih "+(delta>0?"+":"")+delta.toFixed(2)+" poin","admin-meta"));
      result.append(line);
    }
    result.append(el("p","Perbandingan ini deskriptif. Perbedaan waktu, responden, dan metode pengumpulan dapat memengaruhi hasil. Pertanyaan dengan teks berbeda tidak dibandingkan.","admin-meta"));
  });
  root.append(section);
}
function downloadActionPlan(s,priority,actions){
  const cell=value=>'"'+String(value??"").replace(/"/g,'""')+'"';
  const rows=[["Survei","Area prioritas","Skor rata-rata","Rencana tindakan","Penanggung jawab","Target selesai","Status"],
    ...actions.map(item=>[s.title,priority.question_prompt,Number(priority.average_score).toFixed(2),item,"","","Belum dimulai"])];
  const content="\uFEFF"+rows.map(row=>row.map(cell).join(",")).join("\r\n");
  const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="gima-rencana-tindakan-"+s.id+".csv";
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function downloadReport(s,data){
  const csvCell=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  const rows=[["Pertanyaan","Respons valid (jika >=5)","Rata-rata (1-5)"],...data.map(q=>{
    const visible=Number(q.response_count)>=5&&q.average_score!==null;
    return [q.question_prompt,visible?Number(q.response_count):"Disembunyikan",visible?Number(q.average_score).toFixed(2):"Disembunyikan"];
  })];
  const blob=new Blob(["\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download="gima-laporan-"+s.id+".csv";document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
  $("admin-panel").hidden=false;status.textContent="Data organisasi siap.";
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
