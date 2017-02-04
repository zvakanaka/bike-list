var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var scrapers = require('../lib/js/scrapers.js');

describe('Scrape craiglsist cars for Fords ', function() {
  this.timeout(10000);
  it('should return at least one car', function(done) {
    var search = {
      searchTerm: 'ford',
      maxPrice: 11000,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: 100000,
      scrapeName: 'Raharizuandrinarina',
      site: 'craigslistcars',
      zip: 90620
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.be.at.least(1);
        done();
      });
  });
});
