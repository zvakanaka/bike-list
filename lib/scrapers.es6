const cheerio = require('cheerio');
const Browser = require('zombie');
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

module.exports.getPageBody = function (url, needsJavaScript) {
  return new Promise(function(resolve, reject) {
    if (needsJavaScript) { // use zombie for needsJS sites
      const browser = new Browser();
      // console.log(url);
      browser.visit(url).then(function() {
        let body = browser.document.documentElement.innerHTML;
        browser.tabs.closeAll()
        resolve(Buffer.from(body, 'utf8'));
      }).catch(err => reject(err));
    } else {
      resolve(request('GET', url).getBody());
    }
  });
}

module.exports.buildUrl = function (options, param) {
  const zip = options.zip;
  const minPrice = options.minPrice || 30;
  const maxPrice = options.maxPrice || 200;
  const resultsPerPage = options.resultsPerPage || 50;
  const distance = options.maxMiles || '25';

  let section = '';
  if (options.section) {
    section = module.exports.getSection(options.site, options.section);
  } else if (param.section) {
    section = param.section;
  }

  let subdomain = '';
  let searchSegment = `${param.siteUrl}${param.searchPrefix}${options.searchTerm}&${param.section}=${section}`;
  // craiglist special treatment
  if (options.site.toLowerCase().includes('craigslist')) {
    subdomain = `${module.exports.getArea(zip)}.`;
    searchSegment = `${subdomain}${param.siteUrl}${param.searchPrefix}${section}${param.searchSuffix}${options.searchTerm}`;
  }

  return {
    url: `${param.protocol}://${searchSegment}&${param.zip}=${zip}&${param.distance}=${distance}&${param.minPrice}=${minPrice}&${param.maxPrice}=${maxPrice}&${param.sortParam}=${param.sortType}${param.extra}`,
    subdomain: subdomain,
    searchSegment: searchSegment };
}

//options: zip, minPrice, maxPrice, resultsPerPage, sortType
module.exports.scrape = function (options, color = 'green') {
  const promise = new Promise(function(resolve, reject) {
    const quals = SITE_ELEMENTS[options.site.toLowerCase()];
    const param = SITE_URL_PARTS[options.site.toLowerCase()];
    options.searchTerm = options.searchTerm.replace(' ', '+') || '';
    console.log(options.searchTerm);
    colors.setTheme({
      custom: [color]
    });
    const insert = options.insert || true;
    const sendMessage = options.sendMessage;

    console.log(`SCRAPING ${param.siteUrl}...`.custom);

    const url = module.exports.buildUrl(options, param);

    module.exports.getPageBody(url.url, param.needsJavaScript).then((bod, err) => {
      const $ = cheerio.load(bod, { withDomLvl1: false,
                                    normalizeWhitespace: true,
                                    xmlMode: true,
                                    decodeEntities: true
                                  });

      let listings = [];

      let listingLength = $(quals.listing).length;//to know when to resolve

      console.log(`${listingLength} items found`.custom);
      if (listingLength !== 0) {
        // set all previous to deleted and reset to true if we find same again
        mongoService.updateItemsDeleted(options.searchTerm, true).then((mRes) => {
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
              link = `${param.protocol}://${url.subdomain}${param.siteUrl}${link}`;
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
            const place = module.exports.getCity(options.zip);

            const item = {
                itemType: options.searchTerm,
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
                resolve({url: url.url, listings: listings});//done checking duplicates in $list
              }
              listings.push(item);
            });
          });
        });
      } else {
        resolve({url: url.url, listings: []});
      }
    }).catch(err => {
        reject(Error(`unable to get body for ${url.url}:`, err));
    });
  });
  return promise;
}
