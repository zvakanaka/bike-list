var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var scrapers = require('../lib/js/scrapers.js');

describe('Scrape craiglsist for jobs ', function() {
  this.timeout(5000);
  it('should return at least one job', function(done) {
    var search = {
      searchTerm: 'tech',
      maxPrice: 11000,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: 'jobs',
      maxMiles: 100000,
      scrapeName: 'Raharizuandrinarina',
      site: 'craigslist',
      zip: 84606
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.be.at.least(1);
        done();
      });
  });
});
