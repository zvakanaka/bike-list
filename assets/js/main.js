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
function database(url, data, $loader) {
  var http = new XMLHttpRequest();
  http.open("POST", url, true);
  http.setRequestHeader("Content-type", "application/json; charset=utf-8");
  http.onreadystatechange = function() {
    if (http.readyState == 4 && http.status == 200) {
      //response
      var data = (http.responseText);
      console.log('RESPONSE! ' + data);
      data = JSON.parse(data);
      addAlert(`Success! Added new scrape: ${data[0].scrapeName}`, 'success');
      $loader.button('reset');
    } else {
      console.log('Error:', http.status);
      addAlert(`Error: ${http.status}`, 'danger');
      $loader.button('reset');
    }
  };
  http.send(JSON.stringify(data));
}

function postMessage(msg){
    navigator.serviceWorker.controller.postMessage("Client 1 says '"+msg+"'");
}

function addScrape(options, $loader) {
  if (!navigator.onLine) {
    console.log('Warning:', 'navigator not online');
    addAlert(`Warning: ${'navigator not online'}`, 'warning');
    postMessage(JSON.stringify(options))
    $loader.button('reset');
  } else {
    //TODO: change loader to be something within a cb
    database('/new-scrape', options, $loader);
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

//I'm not sure if I should have a n interval event that checks if online every so often and submits then.
var btnAddScrape = document.getElementById('btn-add-scrape');
btnAddScrape.addEventListener('click', function() {
  var $btn = $(this).button('loading');
  var scrapeOptions = {
    searchTerm: document.getElementById('input-search-term').value,
    maxPrice: document.getElementById('input-max-price').value,
    insert:  document.getElementById('input-insert') || false,
    sendMessage:  document.getElementById('checkbox-send-message').checked,
    sendTo:  document.getElementById('input-send-to').value + document.getElementById('select-carrier').value,
    section:  document.getElementById('select-section').value,
    maxMiles:  document.getElementById('input-max-miles').value,
    maxAutoMiles:  document.getElementById('input-auto-max-miles').value,
    scrapeName:  document.getElementById('input-name').value,
    site:  document.getElementById('select-site').value,
    zip: document.getElementById('input-zip').value
  };
  console.log('scrapeOptions', scrapeOptions);

  addScrape(scrapeOptions, $btn);
});
