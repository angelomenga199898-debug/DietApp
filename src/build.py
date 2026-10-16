"""Genera public/index.html e public/sw.js a partire dai sorgenti in src/.
Uso: python3 src/build.py  (dalla radice del repository)"""
import pathlib,re
R=pathlib.Path(__file__).resolve().parent.parent;S=R/"src";P=R/"public"
VERSION=(S/"VERSION").read_text().strip()
foods="".join((S/f).read_text() for f in sorted(x.name for x in S.glob("foods*.js")))
t=(S/"app_template.html").read_text()
t=t.replace("/*VERSION*/",VERSION).replace("/*FOODS*/",foods).replace("/*SPLASHCSS*/",(S/"splash.css").read_text()).replace("<!--SPLASH-->",(S/"splash.html").read_text())
t=re.sub(r"DietApp \d+(\.\d+)*</p>",f"DietApp {VERSION}</p>",t)
head='<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#ffffff"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-title" content="DietApp"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">'
tail=("<script>setTimeout(()=>{const x=document.getElementById('splash');x&&x.remove()},3800)</script>"
 "<script>if('serviceWorker' in navigator&&location.protocol!=='file:'){const had=!!navigator.serviceWorker.controller;"
 "navigator.serviceWorker.register('sw.js').then(r=>{document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')r.update().catch(()=>{})})}).catch(()=>{});"
 "navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)note('🔄 È disponibile una nuova versione',0,{label:'Aggiorna',fn:()=>location.reload()})})}</script>")
(P/"index.html").write_text(t.replace("<!--HEAD-->",head).replace("<!--TAIL-->",tail))
(P/"sw.js").write_text(f"""const C='dietapp-{VERSION}',F=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()}});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{{if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;e.respondWith(fetch(e.request).then(r=>{{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}}).catch(()=>caches.match(e.request,{{ignoreSearch:true}}).then(m=>m||caches.match('./index.html'))))}});
""")
print("Generato public/ per DietApp",VERSION)
