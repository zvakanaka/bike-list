var env = require('node-env-file');
var express = require ('express');
var app = express();
var fs = require('fs');
var request = require('sync-request');
var cheerio = require('cheerio');
var http = require('http');
app.set('view engine', 'ejs');
var path = require('path');

env(__dirname+'/.env');

app.use(express.static(path.join(__dirname, 'public')));

//app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// The http server will listen to an appropriate port, or default to
// port 5000.
var PORTNO = process.env.PORT || 4000;
app.listen(PORTNO);
console.log(PORTNO+' is the magic port');

// index page
app.get('/', function(req, res) {
  //var arr = loadCsv('listing.csv');
  download('http://howtoterminal.com/listing.csv', 'listing.csv', function() {
    var arr = [];
    var filename = 'listing.csv'
    fs.readFile(filename, 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      }
      arr = data.split('\n')
      arr.pop();

      console.log(arr);

      var list = [];
      arr.forEach(function (line) {
        var listItem = [];
        var temp = line.split(',');
        listItem.item = temp[0];
        listItem.price = temp[1];
        listItem.place = temp[2];
        listItem.url = temp[3];
        //TODO: add date
        list.push(listItem);
      });

  //todo: scrape for thumbs
console.log('list ', list);
      scrapeThumbs(list).then(function(thumbUrls) {
        //add prop to list
        console.log('NEW LIST!!! ', thumbUrls);
        console.log('Attempting to combine ', list);
        var i = 0;
        var table = list.reduce((table, row) => {
          table.push({
            item: row.item,
            price: row.price,
            place: row.place,
            url: row.url,
            thumb: thumbUrls[i].thumb
          });
          i++;

          return table;
        }, []);

        console.log('RENDERING...', table);

        res.render('index', {
          itemType: process.env.ITEM_TYPE || 'Item',
          listingData: table
        });
      });
    });
  });
});
//return a list of thumb urls
var scrapeThumbs = function(urlArr) {

  var promise = new Promise(function(resolve, reject) {
    var list = [];
    urlArr.forEach(url => {
      console.log('MAKING REQUEST ', url.url);

      var res = request('GET', url.url);
      console.log('DONE...');

      var $ = cheerio.load(res.getBody());
      //var thumbnail = $('.swipe-wrap').find('div').children('img')[0].src;
      var thumbnail = $('.swipe-wrap').find('div').children('img')[0].attribs.src;

      console.log('thumbnail ',thumbnail);
      var temp = [];
      temp.thumb = thumbnail;
      list.push(temp);
    });
    if (true) {
      resolve(list);
    } else
        reject(Error("Broked shoot dangit"))
    });
    return promise;
};

var download = function(url, dest, cb) {
  var file = fs.createWriteStream(dest);
  var request = http.get(url, function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close(cb);  // close() is async, call cb after close completes.
    });
  }).on('error', function(err) { // Handle errors
    fs.unlink(dest); // Delete the file async. (But we don't check the result)
    if (cb) cb(err.message);
  });
};
