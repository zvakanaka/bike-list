const cheerio = require('cheerio');
const request = require('sync-request');
const colors = require('colors');

const sendMail = require('./sendMail.js');
const mongoService = require('./mongoService.js');

// css selectors for cheerio
const SITE_ELEMENTS = require('../siteData/elements.json');
// pieces that make up the url
const SITE_URL_PARTS = require('../siteData/urlParts.json');
//these translate the select list to the specific site format
const SITE_SECTIONS = require('../siteData/sections.json');

module.exports.getSection = function (site, section) {
  return SITE_SECTIONS[site.toLowerCase()][section] || '';
}

module.exports.getCity = (zip) => {
  zip = parseInt(zip);
  if (zip > 83400 && zip <= 83499)
    return 'eastidaho';
  else if (zip > 90600 && zip <= 92899)
    return 'orangecounty';
  else if (zip === 84070 || zip > 84088 && zip <= 84095)
    return 'saltlake';
  else
    return 'provo';
}

module.exports.getArea = (zip) => {
  zip = parseInt(zip);
  if (zip > 83400 && zip <= 83499)
    return 'eastidaho';
  else if (zip > 90600 && zip <= 92899)
    return 'orangecounty';
  else if (zip === 84070 || zip > 84088 && zip <= 84095)
    return 'saltlake';
  else
    return 'provo';
}

// options: searchTerm, zip, minPrice, maxPrice, minYear, maxYear, minMiles, maxMiles
module.exports.cars = (options) => {
  console.log('SCRAPING KSL AUTOS...');
  const promise = new Promise((resolve, reject) => {
    const siteUrl = 'http://www.ksl.com/auto/search/index';
    let searchTerm = options.searchTerm || '';
    const zip = options.zip || 84606;
    const minPrice = options.minPrice || 2;
    const maxPrice = options.maxPrice || 2000;
    const minYear = options.minYear || 1985;
    const maxYear = options.maxYear || 2016;
    const minMiles = options.minMiles || 0;
    const maxMiles = options.maxAutoMiles || 200000;
    const insert = options.insert || true;
    const sendMessage = options.sendMessage || true;

    const url = `${siteUrl}?keyword=${searchTerm.replace(' ','+')}&yearFrom=${minYear}&yearTo=${maxYear}&mileageFrom=${minMiles}&mileageTo=${maxMiles}&priceFrom=${minPrice}&priceTo=${maxPrice}&zip=${zip}&miles=${0}&newUsed%5B%5D=${'Used'}&newUsed%5B%5D=${'Certified'}&page=${0}&sellerType=${'For+Sale+By+Owner'}&postedTime=${'15DAYS'}&titleType=${'Clean+Title'}&sort=1&body=&transmission=&cylinders=&liters=&fuel=&drive=&numberDoors=&exteriorCondition=&interiorCondition=&cx_navSource=hp_search&search.x=65&search.y=7&search=Search+raquo%3B`;

    const response = request('GET', url);
    console.log('Getting\n'+url+' ...');
    const $ = cheerio.load(response.getBody());
    const listings = [];
    const listingLength = $('.listing').length;//to know when to resolve
    if (listingLength !== 0) {
      // set all previous to deleted and reset to true if we find same again
      mongoService.updateItemsDeleted('Car', true).then((mRes) => {
        $('.listing').each(function(index) {
          let img = $(this).find('.photo')['0']['attribs']['style'];
          if (img !== undefined) {
            img = img.substring(img.indexOf('url(')+4, img.indexOf(')'));
            img = img.substr(0, img.indexOf('?'));//remove query params
          } else {
            img = 'images/not-found.png';
          }
          console.log(img);
          const title = $(this).find('.title').text().trim();
          let link = 'http://www.ksl.com' + $(this).find('.title .link')['0']['attribs']['href'];
          link = link.substr(0, link.indexOf('?'));//remove query params
          const price = $(this).find('.price').text().trim().substr(1);
          const mileage = $(this).find('.mileage').text().trim();
          let dateTemp = $(this).find('.nowrap').text().trim();
          let dateFormatted = dateTemp.substring(dateTemp.indexOf('min(')+4, dateTemp.indexOf(')'));
          let dateVal = '/Date('+dateFormatted+'000)/';
          const date = new Date(parseFloat(dateVal.substr(6)));
          //TODO: get real place
          const place = 'UT';

          const item = {itemType: 'Car',
              img: img, userId: options.userId,
              title: title, link: link,
              price: price, info: mileage,
              place: place, date: date};

          const result = mongoService.findByLink(link);
          result.exec(function(err, result) {
            if (!err) {
              if (result && result.length === 0) {//NEW! if not found
                if (insert === true) mongoService.insert(item);
                if (sendMessage === true) sendMail.sendText([item]);
              } else {
                console.log('EXISTING LINK FOUND', result[0].link);
                // set to active
                mongoService.updateItemDeleted(result[0].link, false);
              }
            }
            else {
              console.log('Error');
            }
            if (index === listingLength-1) {
              resolve(listings);//done checking duplicates in $list
            }
            listings.push(item);
          });
        });
      });
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}


//options: zip, minPrice, maxPrice, resultsPerPage, sortType
module.exports.scrape = function (options, color = 'green') {
  const promise = new Promise(function(resolve, reject) {
    const quals = SITE_ELEMENTS[options.site.toLowerCase()];
    const param = SITE_URL_PARTS[options.site.toLowerCase()];
    colors.setTheme({
      custom: [color]
    });
    console.log(`SCRAPING ${param.siteUrl}...`.custom);

    const zip = options.zip;
    const searchTerm = options.searchTerm.replace(' ', '+') || '';
    const minPrice = options.minPrice || 30;
    const maxPrice = options.maxPrice || 200;
    const resultsPerPage = options.resultsPerPage || 50;
    const insert = options.insert || true;
    const sendMessage = options.sendMessage;
    const distance = options.maxMiles || '25';

    let section = '';
    if (options.section) {
      section = module.exports.getSection(options.site, options.section);
    } else if (param.section) {
      section = param.section;
    }

    let subdomain = '';
    let searchSegment = `${param.siteUrl}${param.searchPrefix}${searchTerm}&${param.section}=${section}`;
    // craiglist special treatment
    if (options.site.toLowerCase().includes('craigslist')) {
      subdomain = `${module.exports.getArea(zip)}.`;
      searchSegment = `${subdomain}${param.siteUrl}${param.searchPrefix}${section}${param.searchSuffix}${searchTerm}`;
    }

    const url = `${param.protocol}://${searchSegment}&${param.zip}=${zip}&${param.distance}=${distance}&${param.minPrice}=${minPrice}&${param.maxPrice}=${maxPrice}&${param.sortParam}=${param.sortType}${param.extra}`;
    console.log('url:', url.custom);
    const response = request('GET', url);
    const $ = cheerio.load(response.getBody());
    //console.log('Got Body');

    let listings = [];

    let listingLength = $(quals.listing).length;//to know when to resolve

    console.log(`${listingLength} items found`.custom);
    if (listingLength !== 0) {
      // set all previous to deleted and reset to true if we find same again
      mongoService.updateItemsDeleted(searchTerm, true).then((mRes) => {
        $(quals.listing).each(function(index) {

          // get image
          let img = '';
          if (quals.img) {
            img = $(this).find(quals.img)['0']['attribs']['src'];
            if (img !== undefined) {
              if (img.indexOf('?') !== -1) { // remove query string
                img = img.substring(0, img.indexOf('?'));
              }
              if (img[0] === '/' && img[1] === '/') {
                img = `${param.protocol}:${img}`;
              } else if (img[4] === '.' && img[5] === '/') {
                img = `${param.protocol}://${param.imgPrefix}${img.substring(5, img.length)}`;
              }
            } else {
              img = 'images/not-found.png';
            }
          } else {
              img = 'images/not-found.png';
          }

          let title = '';
          if (quals.title) {
            title = $(this).find(quals.title).text().trim();
          }
          let link = $(this).find(quals.link)['0']['attribs']['href'];
          if (link.startsWith(`${param.protocol}://`)) {
            //do nothing... at the moment
          } else {
            link = `${param.protocol}://${subdomain}${param.siteUrl}${link}`;
          }
          //link = link.substr(0, link.indexOf('?'));//remove query params
          let price = '0';
          if (quals.price) {
            price = $(this).find(quals.price).text().trim();
          }
          // console.dir(price)
          if (price[0] === '$') {
            price = price.substring(1, price.length);
          }

          //date
          let date = new Date()
          //description
          let description = '';
          if (quals.description) {
            description = $(this).find(quals.description).text().trim();
          }
          if (description.length > 256) { // add ellipses if long
            description = `${description.substring(0, 256)}...`;
          }
          const place = module.exports.getCity(zip);

          const item = {
              itemType: searchTerm,
              img: img, userId: options.userId,
              title: title, link: link,
              price: price, info: description,
              place: place, date: date
            };
          const result = mongoService.findByLink(link);
          result.exec(function(err, result) {
            if (!err) {
              // console.log('Searching for', title);
              // console.dir(result);
              if (result && result.length === 0) {//NEW! if not found
                console.log(`NEW ITEM FOUND     ${item.title} ${item.link}`.custom);
                // console.log(`insert? ${insert}`.custom);
                if (insert === true) mongoService.insert(item);
                console.log(`sendMessage ${sendMessage}`.custom);
                if (sendMessage === true) sendMail.sendText([item], options.sendTo);
              } else {
                //console.log(`EXISTING LINK FOUND: ${item.title} - ${item.link}, ${result[0].link}`)
                // set to active because it does still exist
                mongoService.updateItemDeleted(result[0].link, false);
              }
            }
            else {
              console.log('Error'.custom);
            }
            if (index === listingLength-1) {
              // console.dir(listings)
              resolve(listings);//done checking duplicates in $list
            }
            listings.push(item);
          });
        });
      });
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}
