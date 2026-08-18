const CACHE_NAME='questlife-v8.9';
const CORE_ASSETS=[
  './','./index.html','./styles.css','./app.js','./manifest.webmanifest',
  './assets/receptionist-blonde.png','./assets/receptionist-blonde-face.png','./assets/receptionist-blonde-card.png',
  './assets/receptionist-brunette.png','./assets/receptionist-brunette-face.png','./assets/receptionist-brunette-card.png',
  './icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('questlife-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html'))));
});
