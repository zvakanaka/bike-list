var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

var scrapers = require('../lib/js/scrapers.js');

describe('Scrape hondacerritos cars for Fits ', function() {
  this.timeout(10000);
  it('should return at least one car', function(done) {
    var search = {
      searchTerm: 'fit',
      maxPrice: '',
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: '',
      scrapeName: 'Raharizuandrinarina',
      site: 'hondacerritos',
      zip: ''
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.be.at.least(1);
        done();
      });
  });
});
