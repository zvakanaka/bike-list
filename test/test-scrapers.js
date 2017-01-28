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

describe('Get section name ', function() {
  it('should return proper craigslist abreviation', function() {
    var sectionName = scrapers.getSection('craigslist', 'antiques');
    sectionName.should.equal('ata');
    sectionName = scrapers.getSection('craigslist', 'cars+trucks');
    sectionName.should.equal('cta');
    sectionName = scrapers.getSection('shopgoodwill', 'photo+video');
    sectionName.should.equal('170');
    sectionName = scrapers.getSection('craigslist', '');
    sectionName.should.equal('sss');
  });
});

describe('Get body ', function() {
  this.timeout(15000);
  it('should return a body for a page that needs JavaScript', function() {
    scrapers.getPageBody('http://howtoterminal.com', true)
    .then((bod, err) => {
      bod.size.should.be.greater.than(1);
      done();
    }).catch(err => {
      true.should.equal(false);
      console.log(err);
      done();
    });
  });
});

describe('Scrape KSL for couches ', function() {
  this.timeout(15000);
  it('should return at least one listing', function(done) {
    var search = {
      searchTerm: 'couch',
      maxPrice: 999,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: 30,
      scrapeName: 'Raharizuandrinarina',
      site: 'ksl',
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

describe('Scrape Goodwill for cameras ', function() {
  this.timeout(15000);
  it('should return at least one listing', function(done) {
    var search = {
      searchTerm: 'camera',
      maxPrice: 999,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      section: 'photo+video',
      maxMiles: 30,
      scrapeName: 'Raharizuandrinarina',
      site: 'shopgoodwill',
      zip: ""
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.be.at.least(1);
        done();
      }).catch(function(err) {
        console.log(err);
        done();
      });
  });
});

describe('Scrape Craigslist for cameras ', function() {
  this.timeout(15000);
  it('should return at least one listing', function(done) {
    var search = {
      searchTerm: 'mirrorless',
      maxPrice: 999,
      insert: true, // does not carry through to mongodb
      sendMessage: false,
      sendTo: 'nobody@ihopethisdoesntexist.com',
      userId: 123,
      section: '',
      maxMiles: 30,
      scrapeName: 'Raharizuandrinarina',
      site: 'craigslist',
      zip: "90620"
    };
    scrapers.scrape(search)
      .then(function(res) {
        console.log(res.listings.length + ' items found');
        res.listings.length.should.be.at.least(1);
        done();
      });
  });
});
