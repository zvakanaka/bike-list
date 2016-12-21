const cheerio = require('cheerio');
const request = require('sync-request');
const sendMail = require('./sendMail.js');
const mongoService = require('./mongoService.js');

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
        $(".listing").each(function(index) {
          let img = $(this).find('.photo')['0']['attribs']['style'];
          if (img !== undefined) {
            img = img.substring(img.indexOf("url(")+4, img.indexOf(')'));
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
          let dateVal ="/Date("+dateFormatted+"000)/";
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

const SITE_ELEMENTS = {
  "ksl": {
        "listing": ".listing-group .listing",
        "title": ".title",
        "link": ".title .link",
        "description": ".description-text",
        "img": ".photo a img",
        "price": ".price"
  }, "goodwill": {
        "listing": "body > div.mainbluebox > div.searchresults > table > tbody > tr",
        "title": "th a",
        "link": "th a",
        "description": "",
        "img": "th:nth-child(2) > img",
        "price": "th:nth-child(3) td b"
  }, "craigslist": {
        "listing": "ul.rows li.result-row",
        "title": "p.result-info a.result-title",
        "link": "a.result-image",
        "description": false,
        "img": false,
        "price": "span.result-meta span.result-price"
  }, "howtoterminal": {
        "listing": "main .album-thumb",
        "title": "body > main > div > div",
        "link": "body > main > div > a",
        "description": false,
        "img": "body > main > div > a > img",
        "price": false
  }
};

const SITE_URL_PARTS = {
  "ksl": {
        "siteUrl": "ksl.com",
        "searchUrl": "/classifieds/search/?keyword=",
        "sortParam": "sort",
        "sortType": "0",
        "maxPrice": "priceTo",
        "minPrice": "priceFrom",
        "zip": "zip",
        "distance": "distance",
        "extra": "",
        "protocol": "http"
  }, "goodwill": {
        "siteUrl": "shopgoodwill.com",
        "searchUrl": "/search/SearchKey.asp?itemTitle=",
        "sortParam": "SortOrder",
        "sortType": "a",
        "maxPrice": "maxPrice",
        "minPrice": "minPrice",
        "zip": "sellerId",
        "distance": "distance",
        "extra": "&showthumbs=on",
        "protocol": "http"
  }, "craigslist": {
        "siteUrl": "craigslist.com",
        "searchUrl": "/search/sss?query=",
        "sortParam": "sort",
        "sortType": "date",
        "maxPrice": "max_price",
        "minPrice": "min_price",
        "zip": "postal",
        "distance": "search_distance",
        "extra": "",
        "protocol": "http"
  }, "howtoterminal": {
        "siteUrl": "howtoterminal.com/php-class/dynamic/?action=home",
        "searchUrl": "",
        "sortParam": "",
        "sortType": "",
        "maxPrice": "",
        "minPrice": "",
        "zip": "",
        "distance": "",
        "extra": "",
        "protocol": "http"
  }
};

//options: zip, minPrice, maxPrice, resultsPerPage, sortType
module.exports.scrape = function (options) {
  const promise = new Promise(function(resolve, reject) {
    const quals = SITE_ELEMENTS[options.site.toLowerCase()];
    const param = SITE_URL_PARTS[options.site.toLowerCase()];
    console.log(`SCRAPING ${param.siteUrl}...`);

    const zip = options.zip;
    const searchTerm = options.searchTerm.replace(' ', '+') || '';
    const minPrice = options.minPrice || 30;
    const maxPrice = options.maxPrice || 200;
    const resultsPerPage = options.resultsPerPage || 50;
    const insert = options.insert || true;
    const sendMessage = options.sendMessage;

    const distance = options.maxMiles || '25';

    let subdomain = "";
    if (options.site.toLowerCase() === 'craigslist') {
      subdomain = `${module.exports.getArea(zip)}.`;
    }

    const url = `${param.protocol}://${subdomain}${param.siteUrl}${param.searchUrl}${searchTerm}&${param.zip}=${zip}&${param.distance}=${distance}&${param.minPrice}=${minPrice}&${param.maxPrice}=${maxPrice}&${param.sortParam}=${param.sortType}${param.extra}`;
    console.log('url:', url);
    const response = request('GET', url);
    const $ = cheerio.load(response.getBody());
    //console.log('Got Body');

    let listings = [];

    let listingLength = $(quals.listing).length;//to know when to resolve

    console.log(listingLength, ' items found');
    if (listingLength !== 0) {
      // set all previous to deleted and reset to true if we find same again
      mongoService.updateItemsDeleted(searchTerm, true).then((mRes) => {
        $(quals.listing).each(function(index) {
          // get image
          let img = "";
          if (quals.img) {
            img = $(this).find(quals.img)['0']['attribs']['src'];
            if (img !== undefined) {
              if (img.indexOf('?') !== -1) { // remove query string
                img = img.substring(0, img.indexOf('?'));
              }
              if (img[0] === '/' && img[1] === '/') {
                img = `${param.protocol}:${img}`;
              }
            } else {
              img = 'images/not-found.png';
            }
          } else {
              img = 'images/not-found.png';
          }

          const title = $(this).find(quals.title).text().trim()
          let link = `${param.protocol}://${subdomain}${param.siteUrl}${$(this).find(quals.link)['0']['attribs']['href']}`;
          //link = link.substr(0, link.indexOf('?'));//remove query params
          let price = "";
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
          let description = "";
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
              console.log('Length', result.length);
              // console.dir(result);
              if (result && result.length === 0) {//NEW! if not found
                console.log('NEW ITEM FOUND     ', item.title, item.link);
                // console.log('insert', insert);
                if (insert === true) mongoService.insert(item);
                console.log('sendMessage', sendMessage);
                if (sendMessage === true) sendMail.sendText([item]);
              } else {
                //console.log(`EXISTING LINK FOUND: ${item.title} - ${item.link}, ${result[0].link}`)
                // set to active because it does still exist
                mongoService.updateItemDeleted(result[0].link, false);
              }
            }
            else {
              console.log('Error');
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
