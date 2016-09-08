// TODO: move routes
var env = require('node-env-file');
var express = require ('express');
var debug = require('debug')('http');
var path = require('path');
var middleware = require('./lib/middleware/middleware.js');
var scrapers = require('./lib/js/scrapers.js');
var mongoService = require('./lib/js/mongoService.js');
var passport = require('passport');
var config = require('./private-auth.js');
var GoogleStrategy = require('passport-google-oauth2').Strategy;

env(__dirname+'/.env');

/**
 * passport
 */
 // serialize and deserialize
 passport.serializeUser(function(user, done) {
   done(null, user);
 });
 passport.deserializeUser(function(obj, done) {
   done(null, obj);
 });

 passport.use(new GoogleStrategy({
   clientID: config.google.clientID,
   clientSecret: config.google.clientSecret,
   callbackURL: config.google.callbackURL
   },
   function(request, accessToken, refreshToken, profile, done) {
     mongoService.saveOrLoginUser(profile)
     .then(function() {
       done(null, profile);
     })
     .catch(function() {
       console.log('ERROR');
       done(null, profile);
     });
   }
 ));

var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

app.set('json spaces', 2);

app.set("views", path.join(__dirname, "views"));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/components', express.static(__dirname + '/components'));

app.use(require('express-session')({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


var PORTNO = process.env.PORT || 5000;

if (!process.env.SUB_APP) {
  app.listen(PORTNO);
  console.log(PORTNO+' is the magic port');
}

app.use(middleware);

// index page
app.get('/my-list', whoIsThere, function(req, res) {
  debug('GET /my-list');

  var results = mongoService.getMyActive(req.user.id);
  console.log('Logged in as', req.user.displayName);
  results.exec(function(err, result) {
    if (!err) {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        listingData: result,
        user: req.user
      });
    }
    else {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        listingData: [],
        error: 'empty',
        user: req.user
      });
    }
  });
});

app.get('/list', whoIsThere, function(req, res) {
  debug('GET /list');

  var results = mongoService.getActive();
  console.dir(req.user);
  results.exec(function(err, result) {
    if (!err) {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        listingData: result,
        user: req.user
      });
    }
    else {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        listingData: [],
        error: 'empty',
        user: req.user
      });
    }
  });
});

app.get('/', function(req, res) {
  debug('GET /');
  res.redirect('/list');
});

app.get('/account', whoIsThere, function(req, res){
  res.render('account', {
            page: process.env.SUB_APP ? req.url : req.url,//url
            user: req.user });
});

app.get('/add-scrape', whoIsThere, function(req, res){
  res.render('add-scrape', {
            page: process.env.SUB_APP ? req.url : req.url,//url
            user: req.user });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: [
    'https://www.googleapis.com/auth/plus.login'
  ] }
));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    res.redirect('/account');
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/db/all', function(req, res) {
  var results = mongoService.getAll();
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

app.post('/new-scrape', function(req, res) {
  debug('POST /new-scrape');
  console.log('POST /new-scrape');
  res.type('json');

  var search = {
    searchTerm: req.body.searchTerm || 'bike',
    maxPrice: req.body.maxPrice || 200,
    insert: req.body.insert || true, // does not carry through to mongodb
    sendMessage: req.body.sendMessage || false,
    sendTo: req.body.sendTo,
    userId: req.user.id,
    section: req.body.section,
    maxMiles: req.body.maxMiles,
    scrapeName: req.body.scrapeName,
    site: req.body.site
  };
  if (!req.body.sendTo) search.sendMessage = false;

  mongoService.insertScrape(search)
    .then(function(result) {
      console.log('Inserted', result);
      console.log('Getting scrapes for ' + req.user.id);
      var results = mongoService.getScrapesForUser(req.user.id);
      results.exec(function(err, result) {
        if (!err) {
          console.log(result);
          res.send(result);
        }
        else {
          console.log();
          console.log(result);
          res.json(err);
        }
      });
      search.sendMessage = false;// disable first messages so we don't get a million
      scrapeSite(search);

    }).catch(function(err) {
      console.log('ERROR!', err, 'for', user.id);
    });
});

app.get('/manage-scrapes', whoIsThere, function(req, res) {
  console.log('Getting scrapes for ' + req.user.id);
  var results = mongoService.getScrapesForUser(req.user.id);
  results.exec(function(err, result) {
    if (!err) {
      res.render('manage-scrapes', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        myScrapes: result,
        user: req.user
      });
    }
    else {
      console.log(err);
      res.render('manage-scrapes', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        myScrapes: [],
        error: 'empty',
        user: req.user
      });
    }
  });
});

app.get('/db/reset', function(req, res) {
  var status = mongoService.deleteAll();
  if (process.env.SUB_APP) {
    res.redirect('/scrape/db/all');
  } else {
    res.redirect('/db/all');
  }
});

app.get('/db/delete-scrape', whoIsThere, function(req, res) {
  var _id = req.query.id;
  var status = mongoService.deleteScrape(_id);
  console.log(status);
  res.json({ success: 'deleted scrape: ' + _id})
});

app.get('/db/delete-my-items', whoIsThere, function(req, res) {
  var status = mongoService.updateAllItemsDeleted(req.user.id);
  res.json({ success: 'deleted all items for ' + req.user.id})
});

app.get('/db/delete-scrapes', whoIsThere, function(req, res) {
  var status = mongoService.deleteScrapes(req.user.id);
  res.json({ success: 'deleted all scrapes for ' + req.user.id})
});

app.get('/db/my-scrapes', whoIsThere, function(req, res) {
  console.log('Getting scrapes for ' + req.user.id);
  var results = mongoService.getScrapesForUser(req.user.id);
  results.exec(function(err, result) {
    if (!err) {
      console.log(result);
      res.send(result);
    }
    else {
      console.log();
      console.log(result);
      res.json(err);
    }
  });
});

app.get('/db/all-active-scrapes', function(req, res) {
  console.log('Getting all active scrapes ' + req.user.id);
  var results = mongoService.getAllActiveScrapes();
  results.exec(function(err, result) {
    if (!err) {
      console.log(result);
      res.send(result);
    }
    else {
      console.log();
      console.log(result);
      res.json(err);
    }
  });
});

app.get('/db/delete-all-scrapes', whoIsThere, function(req, res) {
  var result = mongoService.deleteAllScrapes();
  res.json({ result: result });
});

// test authentication
function whoIsThere(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  console.log('Not authenticated - redirecting');
  res.redirect('/auth/google');
}

// scrapes poll
app.get('/scrape', function(req, res) {
  debug('GET /scrape');
  res.type('json');

  console.log('Scraping');
  var results = mongoService.getAllActiveScrapes();
  results.exec(function(err, results) {
    if (!err) {
      console.log('Number of Scrapes:', results.length);
      results.forEach(function(options) {
        console.log('Scraping:', options.site, 'for', options.scrapeName);
        scrapeSite(options);
      });
      res.send(results);
    }
    else {
      res.json(err);
    }
  });
});

function scrapeSite(options) {
  if (options.site === 'Craigslist') {
    scrapers.craigslist(options)
      .then(function() {
        console.log('DONE SCRAPING', options.scrapeName);
      });
  } else if (options.site === 'Shopgoodwill') {
    scrapers.goodwill(options)
      .then(function() {
        console.log('DONE SCRAPING', options.scrapeName);
      });
  } else if (options.site === 'KSL') {
    if (options.section === 'cta') {
      scrapers.cars(options)
        .then(function() {
          console.log('DONE SCRAPING', options.scrapeName);
        });
    } else {
      scrapers.ksl(options)
        .then(function() {
          console.log('DONE SCRAPING', options.scrapeName);
        });
    }
  } else {
    console.log(result.site, 'not yet supported.');
  }
}
if (process.env.SUB_APP) {
  console.log('Exporting as sub-app');
  module.exports = app;
}
