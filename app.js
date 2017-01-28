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
var cookieParser = require('cookie-parser');
var fs = require('fs');

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

app.use(cookieParser());

app.set('json spaces', 2);

app.set('views', path.join(__dirname, 'views'));
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


if (process.env.PROTOCOL === 'https' && !process.env.SUB_APP) {
  var https = require('https');
  var expressHttpsOptions = {
    ca: [fs.readFileSync(process.env.PATH_TO_BUNDLE_CERT)],
    cert: fs.readFileSync(process.env.PATH_TO_CERT),
    key: fs.readFileSync(process.env.PATH_TO_KEY)
  };
  var server = https.createServer(expressHttpsOptions, app);
  server.listen(PORTNO, function(){
     console.log(`server running at ${process.env.PROTOCOL}://${process.env.DOMAIN}:${PORTNO}`);
  });
} else if (!process.env.SUB_APP) {
  app.listen(PORTNO);
  console.log(`server running at ${process.env.PROTOCOL}://${process.env.DOMAIN}:${PORTNO}`);
}

app.use(middleware);

// list page
app.get('/my-list', whoIsThere, function(req, res) {
  debug('GET /my-list');

  var results = mongoService.getMyActive(req.user.id);
  console.log('Logged in as', req.user.displayName);
  results.exec(function(err, result) {
    if (!err) {
      console.log('Rendering');
      res.render('list', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        listingData: result,
        user: req.user
      });
    }
    else {
      console.log('Rendering');
      res.render('list', {
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
      res.render('list', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        itemType: process.env.ITEM_TYPE || 'Item',
        listingData: result,
        user: req.user
      });
    }
    else {
      console.log('Rendering');
      res.render('list', {
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
  if (req.user) res.redirect('/add-scrape');
  else res.render('login', {
            page: process.env.SUB_APP ? req.url : req.url,//url
            user: {displayName:null} });
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
    res.cookie('id', req.user.id, { maxAge: 900000, httpOnly: true });
    res.cookie('name', req.user.displayName, { maxAge: 900000, httpOnly: false });
    res.redirect('/add-scrape');
});

app.get('/logout', function(req, res){
  res.clearCookie('name');
  res.clearCookie('id');
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

  var userId = req.cookies.id;
  if (req.user) {
    userId = req.user.id;
  } else {
    console.log('ERROR: not logged in');
  }

  var search = {
    searchTerm: req.body.searchTerm || '',
    maxPrice: req.body.maxPrice || 200,
    insert: req.body.insert || true, // does not carry through to mongodb
    sendMessage: req.body.sendMessage || false,
    sendTo: req.body.sendTo,
    userId: userId,
    section: req.body.section,
    maxMiles: req.body.maxMiles,
    scrapeName: req.body.scrapeName,
    site: req.body.site,
    zip: req.body.zip
  };
  if (!req.body.sendTo) search.sendMessage = false;

  mongoService.insertScrape(search)
    .then(function(result) {
      console.log('Inserted', result);
      console.log('Getting scrapes for ' + userId);
      var results = mongoService.getScrapesForUser(userId);
      results.exec(function(err, result) {
        if (!err) {
          console.log(result);
          res.send(result);
        }
        else {
          console.log();
          console.log('error', result);
          res.json(err);
        }
      });
      search.sendMessage = false;// disable first messages so we don't get a million
      scrapeSite(search);

    }).catch(function(err) {
      console.log('ERROR!', err, 'for', userId);
    });
});

app.get('/manage-scrapes', whoIsThere, function(req, res) {
  console.log('Getting scrapes for ' + req.user.id);
  var results = mongoService.getScrapesForUser(req.user.id);
  results.exec(function(err, result) {
    if (!err) {
      result.forEach(one => { //add url of search
        one.searchUrl = scrapers.buildUrl(one).url;
      });
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

app.get('/scrape-details', whoIsThere, function(req, res) {
  console.log('Getting scrape for ' + req.user.id);
  var _id = req.query.id;
  var result = mongoService.getScrape(_id);
  result.exec(function(err, result) {
    if (!err) {
	console.log('details:',result[0]);
	res.render('scrape-details', {
	      page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        result: result[0],
        user: req.user
      });
    }
    else {
      console.log(err);
      res.render('scrape-details', {
        page: process.env.SUB_APP ? req.url + 'scrape' : req.url,//url
        result: {},
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
  //res.json({ success: 'deleted scrape: ' + _id})
  res.redirect('/manage-scrapes');
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
  const CUSTOM_COLORS = ['red', 'yellow', 'green', 'blue', 'magenta'];

  console.log('Scraping');
  var scrapes = mongoService.getAllActiveScrapes();
  scrapes.exec(function(err, scrapes) {
    if (!err) {
      console.log('Number of Scrapes:', scrapes.length);
      let i = 0;
      scrapes.forEach(function(options) {
        let custom = [CUSTOM_COLORS[i%(CUSTOM_COLORS.length-1)]];
        console.log('Scraping:', options.site, 'for', options.scrapeName);
        scrapeSite(options, custom);
        i++;
      });
      res.send(scrapes);
    }
    else {
      res.json(err);
    }
  });
});

function scrapeSite(options, customColor) {
  // if (options.section === 'cta') {
  // } else {
    scrapers.scrape(options, customColor)
      .then(function(result) {
        console.log('DONE SCRAPING' + options.searchTerm + ' at ' + result.url);
      }).catch(function(err) {
        console.log(err);
      });
  // }
}
if (process.env.SUB_APP) {
  console.log('Exporting as sub-app');
  module.exports = app;
}
