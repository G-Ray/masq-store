'use strict';

var staticCacheName = 'app-cache-v1.0.0';
var filesToCache = ['.', 'dist/store.js', 'index.html'];

self.addEventListener('install', function (event) {
  console.log('Attempting to install service worker and cache static assets');
  event.waitUntil(caches.open(staticCacheName).then(function (cache) {
    return cache.addAll(filesToCache);
  }));
});

self.addEventListener('activate', function (event) {
  console.log('Activating new service worker...');

  var cacheWhitelist = [staticCacheName];
  // delete stale cache
  event.waitUntil(caches.keys().then(function (cacheNames) {
    return Promise.all(cacheNames.map(function (cacheName) {
      if (cacheWhitelist.indexOf(cacheName) < 0) {
        return caches.delete(cacheName);
      }
    }));
  }));
});

self.addEventListener('fetch', function (event) {
  console.log('Fetch event for ' + event.request.url);
  event.respondWith(caches.match(event.request).then(function (response) {
    if (response) {
      console.log('Found ' + event.request.url + ' in cache');
      return response;
    }
    console.log('Network request for ' + event.request.url);
    return fetch(event.request);
  }).catch(function (err) {
    console.log(err);
  }));
});