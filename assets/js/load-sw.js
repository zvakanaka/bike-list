// register service worker
if ('serviceWorker' in navigator) {

  navigator.serviceWorker.addEventListener('message', function(event) {
    console.log('Sending Message:', event.data);
  });

  navigator.serviceWorker.register('sw.js').then(function(reg) {

    if(reg.installing) {
      console.log('Service worker installing');
    } else if(reg.waiting) {
      console.log('Service worker installed');
    } else if(reg.active) {
      console.log('Service worker active');
    }

  }).catch(function(error) {
    // registration failed
    console.log('Registration failed with ' + error);
  });
} else {
  console.log('ERROR: Service worker not supported.');
}
