var env = require('node-env-file');
var express = require ('express');
var debug = require('debug')('http');
var app = express();
var fs = require('fs');
var request = require('sync-request');
var cheerio = require('cheerio');
var http = require('http');
app.set('view engine', 'ejs');
var path = require('path');
var middleware = require('./dist/js/middleware/middleware.js');

env(__dirname+'/.env');

app.use(express.static(path.join(__dirname, 'dist')));
app.use('/components', express.static(__dirname + '/components'));

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// The http server will listen to an appropriate port, or default to
// port 5000.
var PORTNO = process.env.PORT || 5000;

app.listen(PORTNO);
console.log(PORTNO+' is the magic port');

app.use(middleware);

// index page
app.get('/', function(req, res) {
  debug('GET /');

  var siteUrl = 'https://www.ksl.com/';
  scrapeKsl('bike',
            { zip: 84606,
              minPrice: 30,
              maxPrice: 200,
              resultsPerPage: 50,
              sortType: 5 }
            )
  .then(function (listings) {
    console.log(listings);
    res.render('index', {
      itemType: process.env.ITEM_TYPE || 'Item',
      siteUrl: siteUrl,
      listingData: listings
    });
  });
});

var scrapeKsl = function (searchTerm, options) {
  console.log('SCRAPING KSL...');
  var promise = new Promise(function(resolve, reject) {
    var siteUrl = 'http://www.ksl.com/',
        zip = options.zip || 84606,
        minPrice = options.minPrice || 30,
        maxPrice = options.maxPrice || 200,
        resultsPerPage = options.resultsPerPage || 50,
        sortType = options.sortType || 5;

    var url = siteUrl + '?nid=231&sid=74268&cat='
                    + '&search=' + searchTerm
                    + '&zip=' + zip
                    + '&distance=&min_price=' + minPrice
                    + '&max_price=' + maxPrice
                    + '&type=&category=&subcat=&sold=&city=&addisplay=&userid=&markettype=sale&adsstate=&nocache=1&o_facetSelected=&o_facetKey=&o_facetVal=&viewSelect=list&viewNumResults='
                    + resultsPerPage
                    +'&sort=' + sortType;
                    console.log('HEY');

    var response = request('GET', url);
    console.log('Getting '+url+' ...');
    var $ = cheerio.load(response.getBody());
    var listings = [];

    if ($('.listings .adBox').length != 0) {
      $(".listings .adBox").each(function(index) {
        console.log("**********************");
        var img = $(this)['0'].children[0]['next'].children[0]['next'].children[0]['next']['data'];
        if (img !== undefined) {
          img = img.substring(img.indexOf("http://"), img.indexOf('?'));
        } else {
          img = 'images/not-found.png';
        }
        console.log(img);
        var title = $(this).find('.adTitle').text().trim()
        console.log(title);
        var itemUrl = siteUrl + $(this).find('.listlink')['0']['attribs']['href'];
        console.log(url);
        var price = $(this).find('.priceBox').text().trim();
        price = price.substring(1, price.length-2);
        console.log(price);
        console.log("**********************");

        // var img = $(this)[0].children[0].children[0].children[0].src;
        // var title = $(this)[0].children[1].children[0].children[0].innerHTML;
        // var url = $(this)[0].children[1].children[0].children[0].href;
        // var unformattedPrice = $(this)[0].children[1].children[3].children[0].children[0].innerHTML;
        // var price = unformattedPrice.split('<')[0].substr(1) || 0;
        listings.push({img: img, title: title, itemUrl: itemUrl, price: price});
      });
      resolve(listings);
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}
