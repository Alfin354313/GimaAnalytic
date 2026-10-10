// Supabase Edge Function: create Midtrans Snap sandbox transaction.
// Secrets: MIDTRANS_SERVER_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const auth=req.headers.get("authorization")||"";
 if(!auth.startsWith("Bearer "))return json({error:"Authentication required"},401);
 const serverKey=Deno.env.get("MIDTRANS_SERVER_KEY");
 const url=Deno.env.get("SUPABASE_URL")||"";
 const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!serverKey||!url||!anon||!service)return json({error:"Server not configured"},503);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user)return json({error:"Invalid session"},401);
 let body;
 try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 const invoiceId=body?.invoice_id;
 const method=body?.method;
 if(typeof invoiceId!=="string"||!["qris","virtual_account"].includes(method))return json({error:"Invalid request"},400);
 const admin=createClient(url,service);
 const {data:invoice,error:invoiceError}=await admin.from("client_invoices").select("id,organization_id,invoice_number,amount_idr,status,due_on").eq("id",invoiceId).maybeSingle();
 if(invoiceError||!invoice||invoice.status!=="issued")return json({error:"Invoice unavailable"},404);
 if(invoice.due_on<new Date().toISOString().slice(0,10))return json({error:"Invoice expired"},409);
 const {data:member}=await admin.from("organization_members").select("role").eq("organization_id",invoice.organization_id).eq("user_id",user.id).maybeSingle();
 if(!member||!["owner","admin"].includes(member.role))return json({error:"Forbidden"},403);
 const {data:existing}=await admin.from("midtrans_transactions").select("order_id,redirect_url,transaction_status").eq("invoice_id",invoiceId).maybeSingle();
 if(existing)return json({order_id:existing.order_id,redirect_url:existing.redirect_url,status:existing.transaction_status,reused:true});
 const {data:payments}=await admin.from("client_payments").select("amount_idr,status").eq("invoice_id",invoiceId).eq("status","verified");
 const paid=(payments||[]).reduce((sum,p)=>sum+Number(p.amount_idr),0);
 if(paid>0)return json({error:"Invoice has manual payments; resolve before gateway checkout"},409);
 const orderId="GIMA-"+invoice.id.replaceAll("-","").slice(0,24);
 const gross=Number(invoice.amount_idr);
 if(!Number.isSafeInteger(gross)||gross<=0)return json({error:"Invalid invoice amount"},422);
 // Reserve order ID before external call to avoid accidental double checkout.
 const {error:reserveError}=await admin.from("midtrans_transactions").insert({
  organization_id:invoice.organization_id,invoice_id:invoice.id,order_id:orderId,
  payment_type:method==="qris"?"qris":"bank_transfer",gross_amount:gross
 });
 if(reserveError)return json({error:"Transaction already reserved; refresh"},409);
 const allowed=method==="qris"?["qris"]:["bca_va","bni_va","bri_va","permata_va"];
 const response=await fetch("https://app.sandbox.midtrans.com/snap/v1/transactions",{
  method:"POST",headers:{"authorization":"Basic "+btoa(serverKey+":"),"content-type":"application/json","accept":"application/json"},
  body:JSON.stringify({transaction_details:{order_id:orderId,gross_amount:gross},enabled_payments:allowed,
    callbacks:{finish:"https://gimaanalytic.vercel.app/admin"}})
 });
 const result=await response.json().catch(()=>({}));
 if(!response.ok||typeof result.redirect_url!=="string"){
  await admin.from("midtrans_transactions").update({transaction_status:"setup_failed"}).eq("order_id",orderId);
  return json({error:"Midtrans sandbox checkout unavailable; inspect server logs"},502);
 }
 await admin.from("midtrans_transactions").update({redirect_url:result.redirect_url}).eq("order_id",orderId);
 return json({order_id:orderId,redirect_url:result.redirect_url,status:"pending"});
});
