function addAlert(data) {
  var newDiv = document.createElement("div");
  var newContent = document.createTextNode('Success! Added new scrape: ' + data[0].scrapeName);
  newDiv.setAttribute('class', 'alert alert-success');
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
      addAlert(data);
      $loader.button('reset');
    }
  };
  http.send(JSON.stringify(data));
}

function addScrape(options, $loader) {
  //TODO: change cl to something else
  database('/new-scrape', options, $loader);
}

var btnSubmit = document.getElementById('btn-add-scrape');
btnSubmit.addEventListener('click', function() {
  //TODO: validate form before parsing
  console.log('Button pressed');

});

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
  var $btn = $(this).button('loading')
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
  console.log('scrapeOptions', scrapeOptions.sendMessage);

  addScrape(scrapeOptions, $btn);
});
