/***************************
 * DATABASE
 ***************************/
function database(url, data) {
  var http = new XMLHttpRequest();
  http.open("POST", url, true);
  http.setRequestHeader("Content-type", "application/json; charset=utf-8");
  http.onreadystatechange = function() {
    if (http.readyState == 4 && http.status == 200) {
      //response
      var data = (http.responseText);
      console.log('RESPONSE! ' + data);
      data = JSON.parse(data);
    }
  };
  http.send(JSON.stringify(data));
}


function addScrape(options) {

  var searchTerm = options.searchTerm;
  var maxPrice = options.maxPrice;
  var insert = options.insert;
  var sendMessage = options.sendMessage;
  var sendTo = options.sendTo;
  var section = options.section;
  var maxMiles = options.maxMiles;
  var name = options.scrapeName;
  var site = options.site;

  //TODO: change cl to something else
  database('/new/cl', options);
}

var btnSubmit = document.getElementById('btn-add-scrape');
btnSubmit.addEventListener('click', function() {
  //TODO: validate form before parsing
  console.log('Button pressed');
  var scrapeOptions = {
    searchTerm: document.getElementById('input-search-term').value,
    maxPrice: document.getElementById('input-max-price').value,
    insert:  document.getElementById('input-insert') || false,
    sendMessage:  document.getElementById('checkbox-send-message').value,
    sendTo:  document.getElementById('input-send-to').value,
    section:  document.getElementById('select-section').value,
    maxMiles:  document.getElementById('input-max-miles').value,
    scrapeName:  document.getElementById('input-name').value,
    site:  document.getElementById('select-site').value
  };
  // convert those checkboxes
  if (scrapeOptions.sendMessage === 'on')
    scrapeOptions.sendMessage = true;
  else if (scrapeOptions.sendMessage === 'off')
    scrapeOptions.sendMessage = false;
  addScrape(scrapeOptions);
});
