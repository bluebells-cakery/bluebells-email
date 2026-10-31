import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { FormConfig } from "@/lib/forms";

// Serves the embeddable popup script: <script src="https://edm.bluebellscakery.co.nz/f/1.js" async></script>
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const fid = id.replace(/\.js$/, "");
  const [f] = await sql`select id, status, kind, config from forms where id = ${fid}`;
  const preview = req.nextUrl.searchParams.get("preview") === "1";
  if (!f || (f.status !== "live" && !preview)) return new NextResponse("// form not live", { headers: { "content-type": "application/javascript" } });
  const c = f.config as FormConfig; const base = process.env.APP_URL ?? "https://edm.bluebellscakery.co.nz";
  const js = `(function(){
  var ID=${JSON.stringify(String(f.id))}, BASE=${JSON.stringify(base)}, C=${JSON.stringify(c)}, PREVIEW=${preview};
  var KEY='bb_edm_form_'+ID; try{ if(!PREVIEW){ var last=localStorage.getItem(KEY); if(last && Date.now()-Number(last) < C.showAgainDays*86400000) return; } }catch(e){}
  if(!PREVIEW && C.hideOnMobile && window.innerWidth<640) return;
  var ex=(C.excludePaths||'').split(',').map(function(s){return s.trim()}).filter(Boolean); if(!PREVIEW && ex.some(function(p){return location.pathname.indexOf(p)===0})) return;
  function post(p,b){ try{ fetch(BASE+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(function(r){return r.json()}).then(b._cb||function(){}) }catch(e){} }
  var shown=false;
  function show(){ if(shown) return; shown=true; try{ if(!PREVIEW) localStorage.setItem(KEY,String(Date.now())); }catch(e){}
    if(!PREVIEW) post('/api/forms/'+ID+'/view',{type:'view',page:location.pathname});
    var img = C.image && C.imageSide!=='none';
    var wrap=document.createElement('div'); wrap.id='bb-edm-form'; wrap.innerHTML=
      '<div class="bb-ov"></div><div class="bb-box'+(img?' bb-img-'+C.imageSide:'')+'" role="dialog" aria-modal="true">'+
      '<button class="bb-x" aria-label="Close">&times;</button>'+ (img?'<div class="bb-pic"><img src="'+C.image+'" alt=""></div>':'') +
      '<div class="bb-body">'+(C.showLogo?'<img class="bb-logo" src="'+BASE+'/brand/logo.svg" alt="Bluebells Cakery">':'')+(C.intro?'<p class="bb-intro">'+C.intro+'</p>':'')+(C.offer?'<div class="bb-offer">'+C.offer+'</div>':'')+(C.heading?'<h2>'+C.heading+'</h2>':'')+'<p>'+C.body+'</p>'+(C.finePrint?'<p class="bb-fine">'+C.finePrint+'</p>':'')+'<form class="bb-f">'+
      (C.askName?'<input type="text" name="first_name" placeholder="First name" autocomplete="given-name">':'')+
      '<input type="email" name="email" placeholder="'+C.placeholder+'" required autocomplete="email"><input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px">'+
      '<button type="submit">'+C.button+'</button><div class="bb-err"></div></form>'+(C.dismissText?'<button type="button" class="bb-no">'+C.dismissText+'</button>':'')+'<div class="bb-ok" style="display:none">'+C.success+'</div></div></div>';
    var css='#bb-edm-form .bb-ov{position:fixed;inset:0;background:rgba(38,41,103,.45);z-index:99998;animation:bbfade .3s}'+
      '#bb-edm-form .bb-box{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99999;max-width:none;width:min(92vw,'+(img&&C.imageSide==='left'?'760px':'440px')+');background:'+C.bg+';color:'+C.text+';border-radius:'+C.radius+'px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:Poppins,Arial,sans-serif;display:flex;flex-direction:'+(img&&C.imageSide==='left'?'row':'column')+';animation:bbpop .35s}'+
      '#bb-edm-form .bb-pic{flex:0 0 auto;position:relative;overflow:hidden;'+(img&&C.imageSide==='left'?'width:48%!important;min-height:520px':'height:200px;width:100%')+'}#bb-edm-form .bb-pic img{position:absolute;inset:0;width:100%!important;height:100%!important;max-width:none!important;object-fit:cover;display:block;margin:0}'+
      '@media(max-width:640px){#bb-edm-form .bb-box{flex-direction:column;width:92vw}#bb-edm-form .bb-pic{width:100%;height:160px;min-height:0}}'+
      '#bb-edm-form .bb-body{padding:36px 32px;flex:1 1 0;min-width:0;text-align:center}#bb-edm-form .bb-logo{height:64px;margin:0 auto 14px;display:block}#bb-edm-form .bb-intro{font-size:16px;margin:0 0 4px}#bb-edm-form .bb-offer{font-size:58px;line-height:1.1;font-weight:400;letter-spacing:-1px;margin:4px 0 10px}#bb-edm-form .bb-fine{font-size:11.5px;opacity:.85;margin:-6px 0 18px}#bb-edm-form .bb-no{display:block;margin:14px auto 0;border:0;background:none;color:inherit;font:inherit;font-size:15px;cursor:pointer;opacity:.9}'+
      '#bb-edm-form h2{font-family:"Crimson Pro",Georgia,serif;font-weight:400;font-size:32px;line-height:1.1;margin:0 0 10px}#bb-edm-form p{font-size:15px;line-height:1.5;margin:0 0 18px;opacity:.9}'+
      '#bb-edm-form input{display:block;width:100%;box-sizing:border-box;padding:14px 16px;border:1px solid #555;border-radius:6px;font:inherit;font-size:17px;margin-bottom:10px;background:#fff;color:#262967}'+
      '#bb-edm-form button[type=submit]{width:100%;padding:13px;border:0;border-radius:6px;background:'+C.buttonBg+';color:'+C.buttonText+';font:inherit;font-weight:700;font-size:20px;cursor:pointer}'+
      '#bb-edm-form .bb-x{position:absolute;top:12px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:#666;color:#fff;font-size:22px;line-height:34px;text-align:center;cursor:pointer;z-index:2;padding:0}#bb-edm-form .bb-err{color:#c0392b;font-size:13px;margin-top:8px}#bb-edm-form .bb-ok{font-size:17px;padding:10px 0}'+
      '@keyframes bbfade{from{opacity:0}}@keyframes bbpop{from{opacity:0;transform:translate(-50%,-46%)}}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st); document.body.appendChild(wrap);
    if(!document.querySelector('link[href*="Crimson+Pro"]')){ var l=document.createElement('link'); l.rel='stylesheet'; l.href='https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400&family=Poppins:wght@400;600&display=swap'; document.head.appendChild(l); }
    function close(){ wrap.remove(); if(!PREVIEW) post('/api/forms/'+ID+'/view',{type:'close',page:location.pathname}); }
    wrap.querySelector('.bb-x').onclick=close; wrap.querySelector('.bb-ov').onclick=close; var no=wrap.querySelector('.bb-no'); if(no) no.onclick=close; document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
    wrap.querySelector('.bb-f').onsubmit=function(e){ e.preventDefault(); var fd=new FormData(e.target); var btn=e.target.querySelector('button'); btn.disabled=true;
      if(PREVIEW){ e.target.style.display='none'; wrap.querySelector('.bb-ok').style.display='block'; return; }
      fetch(BASE+'/api/forms/'+ID+'/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:fd.get('email'),first_name:fd.get('first_name'),website:fd.get('website'),page:location.pathname})})
        .then(function(r){return r.json()}).then(function(j){ if(j.error){ wrap.querySelector('.bb-err').textContent=j.error; btn.disabled=false; return; } e.target.style.display='none'; wrap.querySelector('.bb-ok').style.display='block'; setTimeout(close,4000); })
        .catch(function(){ wrap.querySelector('.bb-err').textContent='Something went wrong — please try again.'; btn.disabled=false; }); };
  }
  if(PREVIEW){ show(); return; }
  if(C.trigger==='delay') setTimeout(show, (C.delaySeconds||0)*1000);
  else if(C.trigger==='scroll') window.addEventListener('scroll',function(){ var p=100*(window.scrollY+window.innerHeight)/document.body.scrollHeight; if(p>=C.scrollPercent) show(); });
  else if(C.trigger==='exit') document.addEventListener('mouseout',function(e){ if(!e.relatedTarget && e.clientY<10) show(); });
})();`;
  return new NextResponse(js, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": preview ? "no-store" : "public, max-age=300" } });
}
