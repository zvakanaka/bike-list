var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var scrapers = require('../lib/js/scrapers.js');

//Scraper
describe('Get city name from zip ', function() {
  it('should return corresponding city names', function() {
    var city = scrapers.getCity(90620);
    city.should.equal('orangecounty');
    city = scrapers.getCity(83440);
    city.should.equal('eastidaho');
  });
});

describe('Scrape KSL for couches ', function() {
  this.timeout(15000);
  it('should return at least one listing', function(done) {
    var search = {
      scrapeToInsertTerm: 'couch',
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
    scrapers.ksl(search)
      .then(function(listings) {
        console.log(listings.length + ' items found');
        listings.length.should.be.at.least(1);
        done();
      });
  });
});
