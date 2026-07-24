/* もくもくパズル Service Worker
   ページ本体＝ネット優先（オンライン時は常に最新版・圏外時のみ保存版）
   その他アセット＝キャッシュ優先 */
const CACHE = "mokumoku-v8";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const isPage = e.request.mode === "navigate" || e.request.destination === "document";
  if (isPage) {
    // ネット優先：オンラインなら常に最新版を取得してキャッシュも更新
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { c.put("./index.html", copy); });
        return res;
      }).catch(() =>
        caches.match("./index.html", { ignoreSearch: true })
      )
    );
    return;
  }
  // アセットはキャッシュ優先（なければ取得してキャッシュ）
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { c.put(e.request, copy); });
        return res;
      })
    )
  );
});
