import { NextRequest, NextResponse } from "next/server";
import { reviewCtx } from "@/lib/reviews";
import { SITE_URL } from "@/lib/site";

// Customer-facing review form: /r/{send token}?p={handle}&s={stars}. Public (no login).
const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ctx = await reviewCtx(token);
  const p = req.nextUrl.searchParams.get("p") ?? "", s = Number(req.nextUrl.searchParams.get("s") ?? 0);
  const page = (inner: string) => new NextResponse(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Review your order · Bluebells Cakery</title><meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{--navy:#262967;--cream:#fffdf8;--pink:#e4c5e0;--pinkh:#d9b2d4;--blush:#fbe7e6;--line:#ece4e2}
*{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--navy);font-family:Poppins,Arial,sans-serif;font-size:15px;line-height:1.5}
header{background:var(--navy);padding:22px 16px;text-align:center}header img{height:86px;width:86px}
.wrap{max-width:560px;margin:0 auto;padding:28px 16px 60px}
h1{font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:34px;line-height:1.15;margin:0 0 6px;text-align:center}
.sub{text-align:center;opacity:.8;margin:0 0 26px}
.banner{background:var(--blush);border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:18px;text-align:center}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:16px}
.prod{display:flex;gap:14px;align-items:center}.prod img{width:76px;height:76px;object-fit:cover;border-radius:12px;background:var(--blush);flex:none}
.prod .t{font-weight:600;font-size:16px;line-height:1.3}
.stars{display:flex;gap:4px;margin-top:8px}.stars button{background:none;border:0;padding:0 2px;font-size:34px;line-height:1;color:#e3dbe6;cursor:pointer;transition:transform .1s}
.stars button.on{color:var(--navy)}.stars button:active{transform:scale(1.15)}
.hint{font-size:13px;opacity:.7;min-height:20px}
.more{display:none;margin-top:14px}.card.open .more{display:block}
label{display:block;font-size:13px;font-weight:500;margin:12px 0 4px}
input[type=text],textarea{width:100%;border:1px solid var(--line);border-radius:10px;padding:10px 12px;font:inherit;color:inherit;background:var(--cream)}
textarea{min-height:110px;resize:vertical}input:focus,textarea:focus{outline:2px solid var(--pink);border-color:var(--pink)}
.photos{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}.photos img{width:64px;height:64px;object-fit:cover;border-radius:10px}
.add{width:64px;height:64px;border:1.5px dashed #cbbfd0;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;color:#9a8fa3}
.btn{display:block;width:100%;margin-top:16px;background:var(--pink);color:var(--navy);border:0;border-radius:30px;padding:13px 20px;font:600 15px Poppins,Arial,sans-serif;cursor:pointer}
.btn:hover{background:var(--pinkh)}.btn[disabled]{opacity:.5;cursor:default}
.err{color:#b3261e;font-size:13px;margin-top:8px}
.done{display:flex;align-items:center;gap:10px;margin-top:10px;font-weight:500}.done .s{letter-spacing:2px}
.thanks{text-align:center;padding:26px 10px}.thanks h2{font-family:'Crimson Pro',Georgia,serif;font-weight:400;font-size:28px;margin:0 0 6px}
.thanks a{color:var(--navy)}
footer{text-align:center;font-size:12px;opacity:.6;margin-top:30px}
</style></head><body><header><img src="/brand/logo.png" alt="Bluebells Cakery"></header><div class="wrap">${inner}</div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

  if (!ctx || !ctx.items.length) return page(`<h1>This link has expired</h1><p class="sub">Thanks for thinking of us! You can still leave a review on <a href="${SITE_URL}">our website</a>.</p>`);

  const cards = ctx.items.map(it => `
  <div class="card${ctx.done[it.handle] ? " is-done" : ""}" data-h="${esc(it.handle)}">
    <div class="prod">${it.image ? `<img src="${esc(it.image)}" alt="">` : `<img alt="">`}<div style="flex:1"><div class="t">${esc(it.title)}</div>
      ${ctx.done[it.handle] ? `<div class="done"><span class="s">${"★".repeat(ctx.done[it.handle])}</span> Thanks — review posted</div>` :
      `<div class="stars" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}</div><div class="hint">Tap a star to rate</div>`}
    </div></div>
    ${ctx.done[it.handle] ? "" : `<div class="more">
      <label>Tell us more <span style="opacity:.6;font-weight:400">(optional)</span></label><textarea placeholder="What did you love? How was the taste, the look, the occasion?"></textarea>
      <label>Headline <span style="opacity:.6;font-weight:400">(optional)</span></label><input type="text" class="title" maxlength="100" placeholder="e.g. The best birthday cake!">
      <label>Add photos <span style="opacity:.6;font-weight:400">(optional, up to 4)</span></label><div class="photos"><label class="add" style="margin:0">+<input type="file" accept="image/*" hidden></label></div>
      <label>Shown as</label><input type="text" class="name" maxlength="60" value="${esc(`${ctx.firstName} ${ctx.lastName.slice(0, 1)}${ctx.lastName ? "." : ""}`.trim())}">
      <button class="btn" type="button">Post review</button><div class="err"></div>
    </div>`}
  </div>`).join("");

  const allDone = ctx.items.every(i => ctx.done[i.handle]);
  return page(`${ctx.preview ? `<div class="banner">Preview — reviews submitted here are not saved or sent to Judge.me.</div>` : ""}
  <h1>How was it${ctx.firstName ? `, ${esc(ctx.firstName)}` : ""}?</h1>
  <p class="sub">Your review helps other customers choose — and means the world to our bakers.</p>
  <div id="list">${cards}</div>
  <div class="thanks" id="thanks" style="${allDone ? "" : "display:none"}"><h2>Thank you! 💙</h2><p>Your review is on its way to our website.</p><p><a href="${SITE_URL}">Back to Bluebells Cakery →</a></p></div>
  <footer>Bluebells Cakery · Auckland</footer>
<script>
const T=${JSON.stringify(token)}, pre=${JSON.stringify(p)}, preS=${Number.isFinite(s) ? s : 0};
const labels=["","Not for me","Could be better","Good","Really good","Loved it!"];
function resize(file){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>{const m=1600,k=Math.min(1,m/Math.max(i.width,i.height));const c=document.createElement('canvas');c.width=Math.round(i.width*k);c.height=Math.round(i.height*k);c.getContext('2d').drawImage(i,0,0,c.width,c.height);c.toBlob(b=>b?ok(b):no(),'image/jpeg',.85)};i.onerror=no;i.src=URL.createObjectURL(file)})}
document.querySelectorAll('.card:not(.is-done)').forEach(card=>{
  let rating=0;const photos=[];const st=[...card.querySelectorAll('.stars button')];const hint=card.querySelector('.hint');
  const set=n=>{rating=n;st.forEach(b=>b.classList.toggle('on',+b.dataset.n<=n));hint.textContent=labels[n];card.classList.add('open')};
  st.forEach(b=>{b.onclick=()=>set(+b.dataset.n);b.onmouseenter=()=>st.forEach(x=>x.classList.toggle('on',+x.dataset.n<=+b.dataset.n));b.onmouseleave=()=>st.forEach(x=>x.classList.toggle('on',+x.dataset.n<=rating))});
  const fin=card.querySelector('input[type=file]'),box=card.querySelector('.photos'),add=box.querySelector('.add'),err=card.querySelector('.err'),btn=card.querySelector('.btn');
  fin.onchange=async()=>{const f=fin.files[0];fin.value='';if(!f||photos.length>=4)return;err.textContent='';add.textContent='…';
    try{const b=await resize(f);const fd=new FormData();fd.append('file',new File([b],'photo.jpg',{type:'image/jpeg'}));const r=await fetch('/r/'+T+'/photo',{method:'POST',body:fd});const j=await r.json();if(!j.url)throw new Error(j.error||'Upload failed');photos.push(j.url);const im=document.createElement('img');im.src=j.url;box.insertBefore(im,add);if(photos.length>=4)add.style.display='none'}
    catch(e){err.textContent=e.message||'Upload failed'}finally{add.innerHTML='+';add.appendChild(fin)}};
  btn.onclick=async()=>{if(!rating){err.textContent='Please choose a star rating.';return}btn.disabled=true;btn.textContent='Posting…';err.textContent='';
    try{const r=await fetch('/r/'+T+'/submit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({handle:card.dataset.h,rating,body:card.querySelector('textarea').value,title:card.querySelector('.title').value,name:card.querySelector('.name').value,photos})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Something went wrong');
      card.classList.add('is-done');card.classList.remove('open');card.querySelector('.more').remove();card.querySelector('.stars').outerHTML='<div class="done"><span class="s">'+'★'.repeat(rating)+'</span> Thanks — review posted</div>';hint.remove();
      if(!document.querySelector('.card:not(.is-done)')){document.getElementById('thanks').style.display='';document.getElementById('thanks').scrollIntoView({behavior:'smooth'})}}
    catch(e){err.textContent=e.message;btn.disabled=false;btn.textContent='Post review'}};
  if(card.dataset.h===pre){card.scrollIntoView({block:'center'});if(preS>=1&&preS<=5)set(preS)}
});
</script>`);
}
