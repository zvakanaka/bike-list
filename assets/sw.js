this.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '.',
        'js/main.js',
        'js/load-sw.js',
        'images/github.gif',
        'images/howtoterm.gif',
        'images/not-found.png',
        'styles/styles.css',
        'components/bootstrap/dist/css/bootstrap.min.css',
        'components/jquery/dist/jquery.min.js',
        'components/bootstrap/dist/js/bootstrap.min.js'
      ]);
    })
  );
});

this.addEventListener('fetch', function(event) {
  var response;
  console.log('INTERCEPTING FETCH', event.request.url);
  event.respondWith(caches.match(event.request).catch(function() {
    console.log(event.request.url, 'is in the cache');
    return fetch(event.request);
  }).then(function(r) {
    response = r;
    console.log('Found in cache, putting in new', r.url);
    caches.open('v1').then(function(cache) {
      cache.put(event.request, response);
    });
    return response.clone();
  }).catch(function() {
    console.log('Not found:', event.request.url);
    return caches.match('images/not-found.pn');
  }));
});

self.addEventListener('message', function(event){
    console.log("SW Received Message: " + event.data);
});
