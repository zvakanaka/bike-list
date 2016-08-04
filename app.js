//TODO: move routes
var env = require('node-env-file');
var express = require ('express');
var debug = require('debug')('http');
var fs = require('fs');
var request = require('sync-request');
var cheerio = require('cheerio');
var http = require('http');
var path = require('path');
var middleware = require('./lib/middleware/middleware.js');
var sendMail = require('./lib/js/sendMail.js');
var mongoItem = require('./lib/js/mongoItem.js');

env(__dirname+'/.env');

var app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/components', express.static(__dirname + '/components'));

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var PORTNO = process.env.PORT || 5000;

if (!process.env.SUB_APP) {
  app.listen(PORTNO);
  console.log(PORTNO+' is the magic port');
}

app.use(middleware);

// index page
app.get('/', function(req, res) {
  debug('GET /');

  var siteUrl = 'https://www.ksl.com/auto/search/index';
  scrapeKslCars('',
            { zip: 84606,
              minPrice: 30,
              maxPrice: 2000,
              resultsPerPage: 50,
              sortType: 5 }
            )
  .then(function (listings) {
    res.render('index', {
      itemType: process.env.ITEM_TYPE || 'Item',
      siteUrl: siteUrl,
      listingData: listings
    });
  }).catch(function (listings) {
    res.render('index', {
      itemType: process.env.ITEM_TYPE || 'Item',
      siteUrl: siteUrl,
      listingData: [],
      error: 'empty'
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
                    + '&type=&category=&subcat=&sold=&city=&addisplay=&userid=&markettype=sale&adsstate=&nocache=1&o_facetSelected=&o_facetKey=&o_facetVal=&viewSelect=list'
                    + '&viewNumResults=' + resultsPerPage
                    + '&sort=' + sortType;

    var response = request('GET', url);
    console.log('Getting '+url+' ...');
    var $ = cheerio.load(response.getBody());
    var listings = [];

    if ($('.listings .adBox').length != 0) {
      $(".listings .adBox").each(function(index) {
        var img = $(this)['0'].children[0]['next'].children[0]['next'].children[0]['next']['data'];
        if (img !== undefined) {
          img = img.substring(img.indexOf("http://"), img.indexOf('?'));
        } else {
          img = 'images/not-found.png';
        }
        var title = $(this).find('.adTitle').text().trim()
        var link = siteUrl + $(this).find('.listlink')['0']['attribs']['href'];
        var price = $(this).find('.priceBox').text().trim();
        price = price.substring(1, price.length-2);
        listings.push({img: img, title: title, link: link, price: price});
      });
      resolve(listings);
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}

var scrapeKslCars = function (searchTerm, options) {
  console.log('SCRAPING KSL AUTOS...');
  var promise = new Promise(function(resolve, reject) {
    var siteUrl = 'http://www.ksl.com/auto/search/index',
        searchTerm = searchTerm || '',
        zip = options.zip || 84606,
        minPrice = options.minPrice || 1,
        maxPrice = options.maxPrice || 2000;
    var url = siteUrl + '?keyword=' + searchTerm
                    + '&make%5B%5D=' + 'Honda'
                    + '&yearFrom='+1995+'&yearTo='+2016
                    + '&mileageFrom='+0+'&mileageTo='+200000
                    + '&priceFrom=' + minPrice
                    + '&priceTo=' + maxPrice
                    + '&zip=' + zip
                    + '&miles='+0
                    +'&newUsed%5B%5D='+'Used'+'&newUsed%5B%5D='+'Certified'
                    +'&page='+0
                    +'&sellerType='+'For+Sale+By+Owner'
                    +'&postedTime='+'15DAYS'
                    +'&titleType='+'Clean+Title'
                    +'&body=&transmission=&cylinders=&liters=&fuel=&drive=&numberDoors=&exteriorCondition=&interiorCondition=&cx_navSource=hp_search&search.x=65&search.y=7&search=Search+raquo%3B';

    var response = request('GET', url);
    console.log('Getting '+url+' ...');
    var $ = cheerio.load(response.getBody());
    var listings = [];

    if ($('.listing').length !== 0) {
      $(".listing").each(function(index) {
        var img = $(this).find('.photo')['0']['attribs']['style'];
        if (img !== undefined) {
          img = img.substring(img.indexOf("url(")+4, img.indexOf(')'));
        } else {
          img = 'images/not-found.png';
        }
        var title = $(this).find('.title').text().trim();
        var link = 'http://www.ksl.com' + $(this).find('.title .link')['0']['attribs']['href'];
        var price = $(this).find('.price').text().trim().substr(1);
        var mileage = $(this).find('.mileage').text().trim();
        var dateTemp = $(this).find('.nowrap').text().trim();
        var dateFormatted = dateTemp.substring(dateTemp.indexOf('min(')+4, dateTemp.indexOf(')'));
        var dateVal ="/Date("+dateFormatted+"000)/";
        var date = new Date(parseFloat(dateVal.substr(6)));
        //TODO: get real place
        var place = 'UT';

        var item = {itemType: 'Car',
            img: img,
            title: title, link: link,
            price: price, info: mileage,
            place: place, date: date};

        var result = mongoItem.findByLink(link);
        result.exec(function(err, result) {
          if (!err) {
            if (result && result.length === 0) {//NEW! if not found
              mongoItem.insert(item);
              sendMail.sendText([item]);
            } else {
              console.log('LINK FOUND', result)
            }
          }
          else {
            console.log('Error');
          }
        });
        listings.push(item);
      });
      resolve(listings);
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}

app.get('/db/all', function(req, res) {
  var results = mongoItem.getAll();
  results.exec(function(err, result) {
    if (!err) {
      console.log('RESULT', result)
      res.send(result);
    }
    else {
      res.send(err);
    }
  });

});

app.get('/db/reset', function(req, res) {
  var status = mongoItem.deleteAll();
  res.redirect('/db/all');
});
