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
  //console.log('USER:');
  //console.log(req.user);
  res.render('account', {
            itemType: process.env.ITEM_TYPE || 'Item',
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

// index page
app.get('/car', function(req, res) {
  debug('GET /car');
  res.type('json');
  var siteUrl = 'https://www.ksl.com/auto/search/index';
  scrapers.cars({ zip: 84606,
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
  scrapers.ksl('canon', { zip: 84606,
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
  scrapers.craigslist({ zip: 90620,
              searchTerm: 'Bow',
              maxPrice: 200 })
  .then(function (listings) {
    res.send(listings);
  }).catch(function (listings) {
    res.send(err);
  });
});

app.post('/new/cl', function(req, res) {
  debug('POST /new/cl');
  console.log('POST /new/cl');
  res.type('json');
  if (!req.body.sendTo) sendMessage = false;

  var search = {
    searchTerm: req.body.searchTerm || 'bike',
    maxPrice: req.body.maxPrice || 200,
    insert: req.body.insert || true, // does not carry through to mongodb
    sendMessage: req.body.sendMessage || true,
    sendTo: req.body.sendTo,
    userId: req.user.id,
    section: req.body.section,
    maxMiles: req.body.maxMiles,
    scrapeName: req.body.scrapeName,
    site: req.body.site
  };

  mongoService.insertScrape(search)
    .then(function(result) {
      console.log('Inserted', result);
      search.sendMessage = false;// disable first messages so we don't get a million
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
      scrapers.craigslist(search)
      .then(function (listings) {
        // res.send(listings);
      }).catch(function (listings) {
        // res.send(err);
      });
    }).catch(function(err) {
      console.log('ERROR!', err, 'for', user.id);
    });
});

app.get('/gw', function(req, res) {
  debug('GET /gw');
  res.type('json');
  scrapers.goodwill({ searchTerm: 'Bo',
              maxPrice: 200 })
  .then(function (listings) {
    res.json(listings);
  }).catch(function (listings) {
    res.json(err);
  });
});

app.delete('/db/reset', function(req, res) {
  var status = mongoService.deleteAll();
  if (process.env.SUB_APP) {
    res.redirect('/scrape/db/all');
  } else {
    res.redirect('/db/all');
  }
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
if (process.env.POLLING) {
  var minutes = process.env.POLLING_INTERVAL_MINUTES || 30;
  console.log('Paste the following line into \'crontab -e\' for polling every ' + minutes + ':');
  console.log('*/' + minutes + ' * * * * echo Begin scrape $(date) >> ~/log/scrape.txt && wget -qO- localhost:5555/scrapes >> ~/log/scrape.txt && echo End scrape $(date) >> ~/log/scrape.txt');

  // set up endpoint
  app.get('/scrape', function(req, res) {
    debug('GET /scrape');
    res.type('json');

    console.log('Scraping');
    var results = mongoService.getAllActiveScrapes();
    results.exec(function(err, results) {
      if (!err) {
        console.log(results);
        results.forEach(function(result) {
          console.log('Scraping:', result.site);
          if (result.site === 'Craigslist') {
            var options = result;
            scrapers.craigslist(options)
              .then(function() {
                console.log('OPTIONS', options);
              });
          }
        });
        res.send(results);
      }
      else {
        res.json(err);
      }
    });
  });
}

if (process.env.SUB_APP) {
  console.log('Exporting as sub-app');
  module.exports = app;
}
