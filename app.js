// TODO: move routes
var env = require('node-env-file');
var express = require ('express');
var debug = require('debug')('http');
var path = require('path');
var middleware = require('./lib/middleware/middleware.js');
var scrapeKSL = require('./lib/js/scrapeKSL.js');
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
app.get('/list', ensureAuthenticated, function(req, res) {
  debug('GET /list');

  var siteUrl = 'https://www.ksl.com/auto/search/index';
  var results = mongoService.getAll();
  results.exec(function(err, result) {
    if (!err) {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url+'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        siteUrl: siteUrl,
        listingData: result,
        user: req.user
      });
    }
    else {
      console.log('Rendering');
      res.render('index', {
        page: process.env.SUB_APP ? req.url+'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        siteUrl: siteUrl,
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

app.get('/account', ensureAuthenticated, function(req, res){
  //console.log('USER:');
  //console.log(req.user);
  res.render('account', {
            itemType: process.env.ITEM_TYPE || 'Item',
            user: req.user });
});

app.get('/auth/google',
  passport.authenticate('google', { scope: [
    'https://www.googleapis.com/auth/plus.login',
    'https://www.googleapis.com/auth/plus.profile.emails.read'
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

// index page
app.get('/car', function(req, res) {
  debug('GET /car');
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

app.get('/cl', function(req, res) {
  debug('GET /cl');
  res.type('json');
  scrapeKSL.craigslist({ zip: 90620,
              searchTerm: 'Bow',
              maxPrice: 200 })
  .then(function (listings) {
    res.send(listings);
  }).catch(function (listings) {
    res.send(err);
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

// test authentication
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  console.log('Not authenticated - redirecting');
  res.redirect('/auth/google');
}

if (process.env.SUB_APP) {
  console.log('Exporting as sub-app');
  module.exports = app;
}
