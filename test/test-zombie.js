// var chai = require('chai');
// var chaiHttp = require('chai-http');
// var server = require('../app');
// var should = chai.should();
// var cheerio = require('cheerio');
//
// chai.use(chaiHttp);
//
// var scrapers = require('../lib/js/scrapers.js');
//
// describe('Get selectors from page with zombie and cheerio ', function() {
//   this.timeout(15000);
//   it('should produce some data', function(done) {
//     var options = {
//       searchTerm: '',
//       maxPrice: 0,
//       insert: true, // does not carry through to mongodb
//       sendMessage: false,
//       sendTo: 'nobody@ihopethisdoesntexist.com',
//       userId: 123,
//       section: "",
//       maxMiles: 0,
//       scrapeName: 'Raharizuandrinarina',
//       site: 'facebookrent',
//       zip: 0
//     };
//
//     const url = scrapers.buildUrl(options);
//     console.log(url.url);
//     scrapers.getPageBody(url.url, true).then((bod, err) => {
//       const $ = cheerio.load(bod);
//       console.log('GOT PAGE');
//       // console.log(unescape(encodeURIComponent(bod)));
//       // console.log(decodeURIComponent(escape(bod)));
//       let stuff = $('#js_3 > p').text().trim();
//       console.log(stuff);
//       stuff.length.should.be.at.least(1);
//       done();
//     }).catch(err => console.log);
//
//   });
// });
