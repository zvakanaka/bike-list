var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var scrapers = require('../lib/js/scrapers.js');

describe('Scrape aaa cars for Fords under 1000 with under 1000 miles', function() {
  this.timeout(10000);
  it('should return no cars', function(done) {
    var search = {
      searchTerm: 'ford/explorer',
      maxPrice: 1000,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: 1000,
      scrapeName: 'Raharizuandrinarina',
      site: 'aaacars',
      zip: 84606
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.equal(0);
        done();
      });
  });
});
