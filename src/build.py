"""Genera public/index.html e public/sw.js a partire dai sorgenti in src/.
Uso: python3 src/build.py  (dalla radice del repository)"""
import pathlib,re,json,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import i18n
R=pathlib.Path(__file__).resolve().parent.parent;S=R/"src";P=R/"public"
VERSION=(S/"VERSION").read_text().strip()
foods="".join((S/f).read_text() for f in sorted(x.name for x in S.glob("foods*.js")))
t=(S/"app_template.html").read_text()
# Account (Firebase): attivi solo se esiste src/firebase.json = {"config": {...}, "providers": ["google","password","facebook"]}
FBV="10.14.1";FBJ=S/"firebase.json";FB=json.loads(FBJ.read_text()) if FBJ.exists() else None
t=t.replace("FBCFG=/*FBCFG*/null","FBCFG="+(json.dumps(FB,ensure_ascii=False) if FB else "null"))
t=t.replace("/*VERSION*/",VERSION).replace("/*FOODS*/",foods).replace("/*SPLASHCSS*/",(S/"splash.css").read_text()).replace("<!--SPLASH-->",(S/"splash.html").read_text())
t=re.sub(r"DietApp \d+(\.\d+)*</p>",f"DietApp {VERSION}</p>",t)
# Lingua: salvata (dietapp_lang), italiano per chi ha già dati, altrimenti quella del telefono (inglese se non c'è).
lang="<script>(()=>{const L=['it','en','fr','es','de'];let l=null;try{l=localStorage.getItem('dietapp_lang');if(!L.includes(l)){l=null;if(localStorage.getItem('tracker_dieta_v1'))l='it'}}catch(e){}if(!l){const n=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'it']).map(x=>String(x).slice(0,2).toLowerCase()).find(x=>L.includes(x));l=n||'en'}try{localStorage.setItem('dietapp_lang',l)}catch(e){}window.__LG=l;document.documentElement.lang=l;if(l!='it')document.write('<script src=\"lang/'+l+'.js\"><\\/script>')})()</script>"
head=lang+'<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#10260a"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-title" content="DietApp"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
fbmod=(f"<script type=\"module\">const B='https://www.gstatic.com/firebasejs/{FBV}/';try{{const[A,U,F]=await Promise.all([import(B+'firebase-app.js'),import(B+'firebase-auth.js'),import(B+'firebase-firestore.js')]);window.FBX={{A,U,F}}}}catch(e){{window.FBX=null}}dispatchEvent(new Event('fbload'))</script>") if FB else ""
tail=(fbmod+"<script>(()=>{const x=document.getElementById('splash');if(!x)return;const rm=matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('rm'),m=document.querySelector('meta[name=theme-color]');"
 "document.querySelectorAll('main>section.on>*').forEach((e,i)=>e.style.setProperty('--i',Math.min(i,7)));"
 "if(m&&!rm){m.content='#10260a';setTimeout(()=>{if(!done)m.content='#9be564'},950)}let done=false;"
 "const go=()=>{if(done)return;done=true;x.classList.add('out');if(typeof applyTheme=='function')applyTheme();setTimeout(()=>x.remove(),rm?0:1700)};"
 "x.addEventListener('click',go);setTimeout(go,rm?900:2300)})()</script>"
 "<script>if('serviceWorker' in navigator&&location.protocol!=='file:'){const had=!!navigator.serviceWorker.controller;"
 "navigator.serviceWorker.register('sw.js').then(r=>{document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')r.update().catch(()=>{})})}).catch(()=>{});"
 "navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)note(T('🔄 È disponibile una nuova versione'),0,{label:T('Aggiorna'),fn:()=>location.reload()})})}</script>")
manc=i18n.genera(i18n.testo(),P)
(P/"index.html").write_text(t.replace("<!--HEAD-->",head).replace("<!--TAIL-->",tail))
FBU=[f"https://www.gstatic.com/firebasejs/{FBV}/firebase-{m}.js" for m in ("app","auth","firestore")] if FB else []
(P/"sw.js").write_text(f"""const C='dietapp-{VERSION}',F=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png',{json.dumps(["./lang/"+l+".js" for l in manc])[1:-1]}],FB={json.dumps(FBU)};
self.addEventListener('install',e=>{{e.waitUntil(caches.open(C).then(c=>c.addAll(F).then(()=>Promise.all(FB.map(u=>c.add(new Request(u,{{mode:'cors'}})).catch(()=>{{}}))))));self.skipWaiting()}});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
if(u.origin==='https://www.gstatic.com'&&u.pathname.startsWith('/firebasejs/')){{e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}})));return}}
if(u.origin!==location.origin||u.pathname.startsWith('/__/'))return;e.respondWith(fetch(e.request).then(r=>{{if(!r.ok)throw r;const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}}).catch(x=>caches.match(e.request,{{ignoreSearch:true}}).then(m=>m||(e.request.mode==='navigate'?caches.match('./index.html'):null)).then(m=>m||(x instanceof Response?x:Response.error()))))}});
""")
# Pagine pubbliche (privacy, eliminazione dati): src/pagine/*.html -> public/, con stile e contatto dal template
m=re.search(r"CONTACT_EMAIL='([^']*)'",t);CONTACT=m.group(1) if m else ""
css=(S/"pagine"/"stile.css").read_text()
for f in sorted((S/"pagine").glob("*.html")):(P/f.name).write_text(f.read_text().replace("/*STYLE*/",css).replace("/*CONTACT*/",CONTACT or "lo sviluppatore"))
rd=P/"_redirects"
if FB:rd.write_text("".join(f"/__/{x}/*  https://{FB['config']['projectId']}.firebaseapp.com/__/{x}/:splat  200!\n" for x in ("auth","firebase")))
elif rd.exists():rd.unlink()
print("Lingue:",", ".join(f"{l} {len(m)} da tradurre" for l,m in manc.items()) or "solo italiano")
print("Generato public/ per DietApp",VERSION,"| account:","attivi ("+", ".join(FB.get("providers",[]))+")" if FB else "non configurati")
