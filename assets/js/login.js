(()=>{
"use strict";
const form=document.getElementById("login-form");
const status=document.getElementById("login-status");
const submit=document.getElementById("login-submit");
const say=message=>{status.textContent=message;};
const passwordInput=document.getElementById("login-password");
const togglePassword=document.getElementById("toggle-password");
if(togglePassword&&passwordInput)togglePassword.addEventListener("click",()=>{
  const visible=passwordInput.type==="password";
  passwordInput.type=visible?"text":"password";
  togglePassword.textContent=visible?"Sembunyikan":"Lihat";
  togglePassword.setAttribute("aria-label",visible?"Sembunyikan password":"Tampilkan password");
  togglePassword.setAttribute("aria-pressed",String(visible));
});

if(!window.GIMA_AUTH?.configured()){
  say("Konfigurasi Supabase belum tersedia pada deployment ini.");
  submit.disabled=true;
  return;
}
let client;
try{client=window.GIMA_AUTH.getClient();}
catch(error){say(error.message||"Gagal memuat koneksi Supabase.");submit.disabled=true;return;}
async function redirectForUser(){
  const {error}=await client.rpc("gima_platform_pending_requests");
  if(!error){window.location.replace("/super-admin.html");return;}
  if(error.code==="42501"){window.location.replace("/admin");return;}
  say("Tidak dapat memeriksa hak akses akun: "+(error.code||error.message)+". Silakan coba lagi.");
}
client.auth.getSession().then(({data,error})=>{
  if(error){say("Tidak dapat memeriksa sesi. Muat ulang halaman dan coba lagi.");return;}
  if(data.session)redirectForUser().catch(()=>say("Gagal memeriksa hak akses. Coba muat ulang."));
}).catch(()=>say("Tidak dapat menghubungi Supabase untuk memeriksa sesi."));
form.addEventListener("submit",async event=>{
  event.preventDefault();
  if(!form.reportValidity())return;
  submit.disabled=true;
  say("Memeriksa akun...");
  try{
    const email=document.getElementById("login-email").value.trim();
    const password=document.getElementById("login-password").value;
    const {data,error}=await client.auth.signInWithPassword({email,password});
    if(error){
      const code=error.code||"";
      if(code==="invalid_credentials")say("Email atau password tidak cocok. Periksa kembali atau atur ulang password melalui Supabase.");
      else if(code==="email_not_confirmed")say("Email belum dikonfirmasi di Supabase Authentication.");
      else if(code==="over_request_rate_limit"||code==="over_email_send_rate_limit")say("Terlalu banyak percobaan login. Tunggu beberapa saat sebelum mencoba kembali.");
      else if(error.name==="AuthRetryableFetchError"||error.message==="Failed to fetch"||error.message==="Load failed")say("Browser tidak dapat menghubungi Supabase. Periksa Network di Developer Tools (permintaan /auth/v1/token), koneksi internet, dan URL Supabase.");
      else say("Login gagal: "+(code||error.name||"kesalahan tidak diketahui")+(error.status?" (HTTP "+error.status+")":"")+". Periksa Authentication Logs.");
      return;
    }
    if(!data?.session||!data?.user){say("Login belum menghasilkan sesi. Periksa Authentication Logs.");return;}
    await redirectForUser();
  }catch(error){
    say("Tidak dapat terhubung ke Supabase. Periksa jaringan, URL proyek, dan deployment Preview.");
  }finally{submit.disabled=false;}
});
})();
