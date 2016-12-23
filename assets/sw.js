this.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open('v1').then(function(cache) {
      return cache.addAll([
        '.',
        'js/main.js',
        'js/load-sw.js',
        'images/github.gif',
        'images/launcher-icon-1x.png',
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
    console.log('Found in cache:', r.url);
    caches.open('v1').then(function(cache) {
      cache.put(event.request, response);
    });
    return response.clone();
  }).catch(function() {
    console.log('Not found:', event.request.url);
    console.log('No response found in cache. About to fetch from network...');

     return fetch(event.request).then(function(response) {
       console.log('Response from network is:', response);

       return response;
     }).catch(function(error) {
       console.error('Fetching failed:', error);

       throw error;
     });
    //return caches.match('images/not-found.pn');//default
  }));
});

self.clients.matchAll().then(all => all.map(client => client.postMessage(data)));

function onlineTimer(event) {
  //called at an interval
  if (!navigator.onLine) {
    console.log('Warning:', 'navigator not online');
  } else {
    console.log('We\'re online!');
    clearInterval(timerInterval);
    event.ports[0].postMessage(event.data);
  }
}

var timerInterval;
//called the first time offline data is added
self.addEventListener('message', function handler (event) {
  console.log('Message in sw:'+event.data);
  timerInterval = setInterval(function(){ onlineTimer(event) }, 3000);
});
