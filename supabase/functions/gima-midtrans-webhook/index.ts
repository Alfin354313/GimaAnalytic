// Midtrans HTTP notification endpoint. Public endpoint, signed payload and provider recheck.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const reply=(status:number)=>new Response("OK",{status,headers:{"cache-control":"no-store"}});
async function sha512(value:string){const data=new TextEncoder().encode(value);return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-512",data))).map(v=>v.toString(16).padStart(2,"0")).join("");}
Deno.serve(async req=>{
 if(req.method!=="POST")return reply(405);
 const key=Deno.env.get("MIDTRANS_SERVER_KEY"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!key||!url||!service)return reply(503);
 const raw=await req.text();if(raw.length>15000)return reply(413);
 let event:Record<string,unknown>;
 try{event=JSON.parse(raw)}catch{return reply(400)}
 const order=event.order_id,gross=event.gross_amount,status=event.status_code,sig=event.signature_key;
 if(typeof order!=="string"||typeof gross!=="string"||typeof status!=="string"||typeof sig!=="string")return reply(400);
 const expected=await sha512(order+status+gross+key);
 // Constant-time comparison to avoid early exit on signature bytes.
 const a=new TextEncoder().encode(sig.toLowerCase()),b=new TextEncoder().encode(expected);
 if(a.length!==b.length)return reply(403);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff!==0)return reply(403);
 // Verify current status with Midtrans server, not just callback body.
 const verify=await fetch("https://api.sandbox.midtrans.com/v2/"+encodeURIComponent(order)+"/status",{
  headers:{authorization:"Basic "+btoa(key+":"),accept:"application/json"}
 });
 if(!verify.ok)return reply(502);
 const provider=await verify.json();
 if(provider.order_id!==order)return reply(403);
 const admin=createClient(url,service);
 const {data:tx}=await admin.from("midtrans_transactions").select("invoice_id,gross_amount,transaction_status").eq("order_id",order).maybeSingle();
 if(!tx)return reply(404);
 if(Number(provider.gross_amount)!==Number(tx.gross_amount))return reply(403);
 const state=String(provider.transaction_status||"");
 const fraud=String(provider.fraud_status||"");
 const accepted=(state==="settlement"||(state==="capture"&&fraud==="accept"));
 const finalState=accepted?"settlement":["deny","cancel","expire","failure"].includes(state)?state:"pending";
 if(tx.transaction_status==="settlement"&&finalState!=="settlement")return reply(200);
 const {error}=await admin.from("midtrans_transactions").update({
  transaction_status:finalState,fraud_status:fraud,provider_transaction_id:String(provider.transaction_id||""),updated_at:new Date().toISOString()
 }).eq("order_id",order);
 if(error)return reply(500);
 // Ledger is source of truth for gateway payment. Do not forge manual payment records.
 return reply(200);
});
