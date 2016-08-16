//TODO: move routes
var env = require('node-env-file');
var express = require ('express');
var debug = require('debug')('http');
var path = require('path');
var middleware = require('./lib/middleware/middleware.js');
var scrapeKSL = require('./lib/js/scrapeKSL.js');
var mongoItem = require('./lib/js/mongoItem.js');

env(__dirname+'/.env');

var app = express();
app.set("views", path.join(__dirname, "views"));
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
  var results = mongoItem.getAll();
  results.exec(function(err, result) {
    if (!err) {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url+'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        siteUrl: siteUrl,
        listingData: result
      });
    }
    else {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url+'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        siteUrl: siteUrl,
        listingData: [],
        error: 'empty'
      });
    }
  });
});

// index page
app.get('/scrape', function(req, res) {
  debug('GET /scrape');
  res.type('json');
  var siteUrl = 'https://www.ksl.com/auto/search/index';
  scrapeKSL.cars({ zip: 84606,
              minPrice: 30,
              maxPrice: 4000,
              resultsPerPage: 50,
              sortType: 5 })
  .then(function (listings) {
    res.send(listings);
  }).catch(function (listings) {
    res.send(err);
  });
});

app.get('/db/all', function(req, res) {
  var results = mongoItem.getAll();
  res.type('json');
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

app.get('/item', function(req, res) {
  debug('GET /item');
  res.type('json');
  scrapeKSL.scrapeKsl('canon', { zip: 84606,
              minPrice: 30,
              maxPrice: 200,
              resultsPerPage: 50,
              sortType: 5 })
  .then(function (listings) {
    res.send(listings);
  }).catch(function (listings) {
    res.send(err);
  });
});

app.get('/db/reset', function(req, res) {
  var status = mongoItem.deleteAll();
  if (process.env.SUB_APP) {
    res.redirect('/scrape/db/all');
  } else {
    res.redirect('/db/all');
  }
});

if (process.env.SUB_APP) {
  console.log('Exporting as sub-app');
  module.exports = app;
}
