var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var mongoService = require('../lib/js/mongoService.js');
var scrapers = require('../lib/js/scrapers.js');

// MongoDB
describe('Delete scrapes with no user ID', function() {
  it('should return an error', function() {
    var err = new Error('Failed to specify UserId').toString();
    mongoService.deleteScrapes().toString().should.equal(err);
  });
});

describe('Inserting a valid scrape', function() {
  it('should not return an error', function() {
    var scrapeToInsert = {
      scrapeToInsertTerm: 'TEST',
      maxPrice: 999,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: 30,
      scrapeName: 'Raharizuandrinarina',
      site: 'ksl',
      zip: 90620
    };

    mongoService.insertScrape(scrapeToInsert)
      .then(function(result) {
        var results = mongoService.getScrapesForUser(123);
        results.exec(function(err, result) {
          console.log("HEYHEYHEY");
          if (!err) {
            console.log(result);
            var err = new Error('Failed to specify UserId').toString();
            result.should.equal('TEST');
          }
          else {
            console.log(result, err);
          }
        });
      }).catch(function(err) {
        console.log('ERROR!', err, 'for', 123);
      });
  });
});

describe('Get all active scrapes ', function() {
  it('should return multiple scrapes', function(done) {
    var results = mongoService.getAllActiveScrapes();
    results.exec(function(err, result) {
      if (!err) {
        result.length.should.be.at.least(1);
        done();
      }
      else {//error
        true.should.equal(false);
        done();
      }
    });
  });
});

//Scraper
describe('Get city name from zip ', function() {
  it('should return corresponding city names', function() {
    var city = scrapers.getCity(90620);
    city.should.equal('orangecounty');
    city = scrapers.getCity(83440);
    city.should.equal('eastidaho');
  });
});



it('should add a SINGLE blob on /blobs POST');
it('should update a SINGLE blob on /blob/<id> PUT');
it('should delete a SINGLE blob on /blob/<id> DELETE');
