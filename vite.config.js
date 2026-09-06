import { defineConfig } from 'vite';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'arcade-offline-cache',
    generateBundle(_options, bundle) {
      const publicFiles = readdirSync('public', { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => `${entry.parentPath || entry.path}/${entry.name}`.replaceAll('\\', '/').replace(/^public\//, ''));
      const hash = createHash('sha256');
      for (const item of Object.values(bundle)) hash.update(item.type === 'chunk' ? item.code : item.source);
      for (const file of publicFiles) hash.update(readFileSync(`public/${file}`));
      const cache = `astral-strike-${hash.digest('hex').slice(0, 12)}`;
      const files = ['index.html', ...Object.keys(bundle), ...publicFiles];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = ${JSON.stringify(cache)};
const FILES = ${JSON.stringify(files)};
const urls = FILES.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(urls)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('astral-strike-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match(new URL('index.html', self.registration.scope).href, { ignoreVary: true }))));
  } else if (urls.includes(request.url)) {
    // These exact URLs contain only this build's static assets. The preview
    // host varies responses by Origin; module requests and precache requests
    // can carry different Origin headers despite using the same local asset.
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request, { ignoreVary: true })).then(hit => hit || fetch(request)));
  }
});
` });
    },
  }],
});
