const cheerio = require('cheerio');
const request = require('sync-request');
const sendMail = require('./sendMail.js');
const mongoService = require('./mongoService.js');

// http://www.shopgoodwill.com/search/SearchKey.asp?itemTitle=bow&catid=279&sellerID=all&closed=no&minPrice=0&maxPrice=200&sortBy=itemEndTime&SortOrder=a&showthumbs=on

module.exports.goodwill = (options) => {
    console.log('Scraping shopgoodwill...');
    const promise = new Promise((resolve, reject) => {
      const city = options.city || 'orangecounty';
      const searchTerm = options.searchTerm || 'bo';
      const siteUrl = `http://www.shopgoodwill.com`;
      const zip = options.zip || 90620;
      const minPrice = options.minPrice || 1; // TODO: implement
      const maxPrice = options.maxPrice || 200;
      let section = options.section || '279';
      if (section === 'sga') section = '279';
      const maxMiles = options.maxMiles || 30; // distance from zip in miles
      const insert = options.insert || true;
      const sendMessage = options.sendMessage || true;

      const reuestUrl = `${siteUrl}/search/SearchKey.asp?itemTitle=${searchTerm}&catid=${section}&sellerID=all&closed=no&minPrice=${minPrice}&maxPrice=${maxPrice}&sortBy=itemEndTime&SortOrder=a&showthumbs=on`;
      console.log('About to make request to', reuestUrl);
      const response = request('GET', reuestUrl);
      console.log('Getting\n'+reuestUrl+' ...');
      const $ = cheerio.load(response.getBody());
      const listings = [];
      const selector = '.productresults tr';
      console.log($(selector));
      const listingLength = $(selector).length;//to know when to resolve
console.log(listingLength, 'rows found');
      if (listingLength !== 0) {
        $(selector).each(function(index) {
//	console.log('img find:',
  //        let img = $(this).find('img')['0']['attribs']['src'];
    //      if (img !== undefined) {
            // img = img.substring(img.indexOf("reuestUrl(")+4, img.indexOf(')'));
            // img = img.substr(0, img.indexOf('?'));//remove query params
      //    } else {
          const  img = 'images/not-found.png';
        //  }
          console.log('img', img);
          // const title = $(this).find('#titletextonly').text().trim();
          const title = $(this).find('a').text().trim();
console.log('title:', title);
          let link = '';
          if (title !== '') {
            link = $(this).find('.row a');
          }

console.log('link', link);
          // link = link.substr(0, link.indexOf('?'));//remove query params
          let price = $(this).find('b').text().trim().substr(1);

          // const mileage = $(this).find('.mileage').text().trim();
          // let dateTemp = $(this).find('.nowrap').text().trim();
          // let dateFormatted = dateTemp.substring(dateTemp.indexOf('min(')+4, dateTemp.indexOf(')'));
          // let dateVal ="/Date("+dateFormatted+"000)/";
          // const date = new Date(parseFloat(dateVal.substr(6)));
          //TODO: get real place
          const place = 'CA';
          const info = '';

          const item = { itemType: searchTerm,
              img: img, userId: options.userId,
              title: title, link: link,
              price: price, info: info,
              place: place, date: new Date() };

          const result = mongoService.findByLink(link);
          result.exec(function(err, result) {
            if (!err) {
              if (result && result.length === 0) {//NEW! if not found
                if (insert === true) mongoService.insert(item);
                if (sendMessage === true) sendMail.sendText([item]);
              } else {
                console.log('EXISTING LINK FOUND', result[0].link)
              }
            }
            else {
              console.log('Error');
            }
            if (index === listingLength-3) {
              resolve(listings);//done checking duplicates in $list
            }
            listings.push(item);
          });
        });
      } else {
        reject(Error('Error: no listings'));
      }
    });
    return promise;
}

module.exports.getCity = (zip) => {
   if (zip > 83400 && zip <= 83499)
    return 'eastidaho';
  else if (zip > 90600 && zip <= 92899)
    return 'orangecounty';
  else if (zip === 84070 || zip > 84088 && zip <= 84095)
    return 'saltlake';
  else
    return 'provo';
}

module.exports.craigslist = (options) => {
    console.log('Scraping craigslist...');
    const promise = new Promise((resolve, reject) => {
      const zip = options.zip || 90620;
      let city = options.zip ? getCity(options.zip) : 'orangecounty';
      console.log('CITY: ',city, 'Zip:', zip);
      const searchTerm = options.searchTerm || 'bow';
      const siteUrl = `https://${city}.craigslist.org`;
      const minPrice = options.minPrice || 2; // TODO: implement
      // TODO: remove parseInt, it is in mongoService already
      const maxPrice = parseInt(options.maxPrice) || 200;
      let section = options.section || 'sss';// sga is sports
      const maxMiles = options.maxMiles || 30; // distance from zip in miles
      const insert = options.insert || true;
      const sendMessage = options.sendMessage || true;
      let additional = '';
      if (section === 'cto') {
        additional += `&max_auto_miles=${options.maxAutoMiles}&auto_title_status=1`;
      }
      const reuestUrl = `${siteUrl}/search/${section}?query=${searchTerm.replace(' ','+')}&sort=rel&search_distance=${maxMiles}&max_price=${maxPrice}&postal=${zip}${additional}`;
      const response = request('GET', reuestUrl);
      console.log('Getting\n'+reuestUrl+' ...');
      const $ = cheerio.load(response.getBody());
      const listings = [];
      const listingLength = $('.row').length;//to know when to resolve
console.log(listingLength, 'rows found');
      if (listingLength !== 0) {
        // set all previous to deleted and reset to true if we find same again
        mongoService.updateItemsDeleted(searchTerm, true).then((mRes) => {
          $(".row").each(function(index) {
            let  img = 'images/not-found.png';
            let imageTest = $(this).find('.px').text();
            let hasImage = true;
            if (imageTest.indexOf('pic') === -1) {
              hasImage = false;
            }
            const title = $(this).find('.pl a').text().trim();
            let link = siteUrl + $(this).find('.pl a')['0']['attribs']['href'];
            let price = $(this).find('.price').text().trim().substr(1);
            price = price.substr(0, price.indexOf('$'));

            // let dateTemp = $(this).find('.nowrap').text().trim();
            // let dateFormatted = dateTemp.substring(dateTemp.indexOf('min(')+4, dateTemp.indexOf(')'));
            // let dateVal ="/Date("+dateFormatted+"000)/";
            // const date = new Date(parseFloat(dateVal.substr(6)));
            //TODO: get real place
            const place = 'CA';
            const info = '';

            const item = { itemType: searchTerm,
                img: img, userId: options.userId,
                title: title, link: link,
                price: price, info: info,
                place: place, date: new Date() };

            const result = mongoService.findByLink(link);
            result.exec(function(err, result) {
              if (!err) {
                if (result && result.length === 0) {//NEW! if not found
                  //TODO: scrape image here
                  if (link.startsWith('https://') && !link.includes('//', 7)) {
                    if (hasImage) {
                      const imgRequest = request('GET', link);
                      const $img = cheerio.load(imgRequest.getBody());
                      item.img = $img('.swipe-wrap').find('div').children('img')[0].attribs.src;
                    } else console.log('NO IMAGE FOR', link);
                  } else {
                    console.log('URL Error:', link);
                  }
                  if (insert === true) {
                    console.log('Inserting', item.title);
                    mongoService.insert(item).then(function(itemed) {
                      console.log('Inserted', itemed.title);
                    });
                  }
                  if (sendMessage === true) {
                    console.log('Sending text to', options.sendTo);
                    sendMail.sendText([item], options.sendTo);
                  }
                } else {
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

//options: zip, minPrice, maxPrice, resultsPerPage, sortType
module.exports.ksl = function (options) {
  console.log('SCRAPING KSL...');
  const promise = new Promise(function(resolve, reject) {
    const siteUrl = 'http://www.ksl.com';
    const zip = options.zip || 84606;
    const searchTerm = options.searchTerm || '';
    const minPrice = options.minPrice || 30;
    const maxPrice = options.maxPrice || 200;
    const resultsPerPage = options.resultsPerPage || 50;
    const sortType = options.sortType || 1;// newest to oldest
    const insert = options.insert || true;
    const sendMessage = options.sendMessage || true;
    const distance = options.maxMiles || '25';

    const url = `${siteUrl}?nid=231&cat=&search=${searchTerm}&zip=${zip}&distance=${distance}&min_price=${minPrice}&max_price=${maxPrice}&type=&category=&subcat=&sold=&city=&addisplay=&userid=&markettype=sale&adsstate=&nocache=1&o_facetSelected=&o_facetKey=&o_facetVal=&viewSelect=list&viewNumResults=${resultsPerPage}&sort=${sortType}`;
    console.log('about to scrape url:', url);
    const response = request('GET', url);
    const $ = cheerio.load(response.getBody());
    console.log('Got Body');

    let listings = [];
    let listingLength = $('.listings .adBox').length;//to know when to resolve

    console.log(listingLength, ' items found');
    if (listingLength !== 0) {
      // set all previous to deleted and reset to true if we find same again
      mongoService.updateItemsDeleted(searchTerm, true).then((mRes) => {
        $(".listings .adBox").each(function(index) {
          let img = $(this)['0'].children[0]['next'].children[0]['next'].children[0]['next']['data'];
          if (img !== undefined) {
            img = img.substring(img.indexOf("http://"), img.indexOf('?'));
          } else {
            img = 'images/not-found.png';
          }
          const title = $(this).find('.adTitle').text().trim()
          let link = siteUrl + $(this).find('.listlink')['0']['attribs']['href'];
          link = link.substr(0, link.indexOf('?'));//remove query params
          let price = $(this).find('.priceBox').text().trim();
          price = price.substring(1, price.length-2);

          //date
          let date = new Date()
          //description
          let description = ''
          //TODO: get real place
          const place = 'UT';

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
              if (result && result.length === 0) {//NEW! if not found
                console.log('NEW ITEM FOUND     ', item.title, item.link);
                if (insert === true) mongoService.insert(item);
                if (sendMessage === true) sendMail.sendText([item]);
              } else {
                console.log(`EXISTING LINK FOUND: ${item.title} - ${item.link}, ${result[0].link}`)
                // set to active because it does still exist
                mongoService.updateItemDeleted(result[0].link, false);
              }
            }
            else {
              console.log('Error');
            }
            if (index === listingLength-1) {
              console.log("RESOLVING");
              resolve(listings);//done checking duplicates in $list
            } else {
              console.log(index, " is not ", listingLength);
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
