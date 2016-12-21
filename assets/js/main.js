function addAlert(content, kind) {
  var newDiv = document.createElement("div");
  var newContent = document.createTextNode(content);
  newDiv.setAttribute('class', `alert alert-${kind}`);
  newDiv.setAttribute('role', 'alert');
  newDiv.appendChild(newContent); //add the text node to the newly created div.

  // add the newly created element and its content into the DOM
  var currentDiv = document.getElementById("form-add-scrape");
  currentDiv.parentNode.insertBefore(newDiv, currentDiv.nextSibling);
}
/***************************
 * DATABASE
 ***************************/
function postJSON(url, data, $loader) {
  var http = new XMLHttpRequest();
  http.open("POST", url, true);
  http.setRequestHeader("Content-type", "application/json; charset=utf-8");
  http.onreadystatechange = function() {
    if (http.readyState == 4 && http.status == 200) {
      //response
      var resData = (http.responseText);
      console.log('RESPONSE! ' + resData);
      resData = JSON.parse(resData);
      addAlert(`Success! Added new scrape: ${resData[0].scrapeName}`, 'success');
      if ($loader) $loader.button('reset');
    } else if (http.status != 200) {
      console.log('Error:', http.status, 'while sending', data);
      addAlert(`Error: ${http.status}`, 'danger');
      if ($loader) $loader.button('reset');
    }
  };
  if (typeof data === 'string' || data instanceof String)
    http.send(data);
  else
    http.send(JSON.stringify(data));
}

function sendMessage(message) {
  //used to initially send data while offline
  console.log('sending',message);
  return new Promise(function(resolve, reject) {
     var messageChannel = new MessageChannel();
     messageChannel.port1.onmessage = function(event) {
       if (event.data.error) {
         console.log('rejecting');
         reject(event.data.error);
       } else {
         console.log('resolving');
         resolve(event.data);
       }
     };
    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

//check local storage, if scrape exists, call addscrape
if (localStorage.getItem("scrape") !== null) {
  console.log("pending scrape", localStorage.getItem("scrape"));
  // var $btn = btnAddScrape.button('loading');
  addScrape(JSON.parse(localStorage.getItem("scrape")));
}

function addScrape(options, $loader) {
  if (!navigator.onLine) {
    if (localStorage.getItem("scrape") === null) {
      console.log("adding scrape to local storage", JSON.stringify(options));
      localStorage.setItem("scrape", JSON.stringify(options));
    }
    console.log('Warning:', 'scrape will be added on connection');
    addAlert(`Warning: ${'scrape will be added on connection'}`, 'warning');
    sendMessage(JSON.stringify(options)).then(function(result){
      //when sendMessage resolves:
      localStorage.removeItem("scrape");
      console.log('DATAS');
      console.log(result);
      postJSON('/new-scrape', result, $loader);
    });

    if ($loader) $loader.button('reset');
  } else {
    //TODO: change loader to be something within a cb
    postJSON('/new-scrape', options, $loader);
  }
}

document.getElementById('car-selects').hidden = true;
var selectSection = document.getElementById('select-section');
selectSection.addEventListener('change', function() {
  document.getElementById('car-selects').hidden = true;
  if (selectSection.selectedIndex === 2) {
    document.getElementById('car-selects').hidden = false;
  }
});

var btnAddScrape = document.getElementById('btn-add-scrape');
btnAddScrape.addEventListener('click', function() {
  var $btn = $(this).button('loading');
  var scrapeOptions = {
    searchTerm: document.getElementById('input-search-term').value,
    maxPrice: document.getElementById('input-max-price').value,
    insert: true,
    sendMessage:  document.getElementById('checkbox-send-message').checked,
    sendTo:  document.getElementById('input-send-to').value + document.getElementById('select-carrier').value,
    section:  document.getElementById('select-section').value,
    maxMiles:  document.getElementById('input-max-miles').value,
    maxAutoMiles:  document.getElementById('input-auto-max-miles').value,
    scrapeName:  document.getElementById('input-name').value,
    site:  document.getElementById('select-site').value,
    zip: document.getElementById('input-zip').value || 84606
  };
  //console.log('scrapeOptions', scrapeOptions);

  addScrape(scrapeOptions, $btn);
});
