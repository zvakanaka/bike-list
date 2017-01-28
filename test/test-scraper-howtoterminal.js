var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var scrapers = require('../lib/js/scrapers.js');

describe('Scrape howtoterminal for albums ', function() {
  this.timeout(15000);
  it('should return at least one album', function(done) {
    var search = {
      searchTerm: '',
      maxPrice: 0,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: 0,
      scrapeName: 'Raharizuandrinarina',
      site: 'howtoterminal',
      zip: 0
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.be.at.least(1);
        done();
      });
  });
});
