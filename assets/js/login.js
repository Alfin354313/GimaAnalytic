(()=>{
"use strict";
const form=document.getElementById("login-form");
const status=document.getElementById("login-status");
const submit=document.getElementById("login-submit");
const say=message=>{status.textContent=message;};
if(!window.GIMA_AUTH?.configured()){
  say("Konfigurasi Supabase belum tersedia pada deployment ini.");
  submit.disabled=true;
  return;
}
let client;
try{client=window.GIMA_AUTH.getClient();}
catch(error){say(error.message||"Gagal memuat koneksi Supabase.");submit.disabled=true;return;}
client.auth.getSession().then(({data,error})=>{
  if(error){say("Tidak dapat memeriksa sesi. Muat ulang halaman dan coba lagi.");return;}
  if(data.session)window.location.replace("/admin");
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
      else say("Supabase menolak login ("+(code||"HTTP "+(error.status||"tidak diketahui"))+"). Periksa Authentication Logs.");
      return;
    }
    if(!data?.session||!data?.user){say("Login belum menghasilkan sesi. Periksa Authentication Logs.");return;}
    window.location.replace("/admin");
  }catch(error){
    say("Tidak dapat terhubung ke Supabase. Periksa jaringan, URL proyek, dan deployment Preview.");
  }finally{submit.disabled=false;}
});
})();
