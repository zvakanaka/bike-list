const cheerio = require('cheerio');
const request = require('sync-request');
const sendMail = require('./sendMail.js');
const mongoService = require('./mongoService.js');

// http://www.shopgoodwill.com/search/SearchKey.asp?itemTitle=bow&catid=279&sellerID=all&closed=no&minPrice=0&maxPrice=200&sortBy=itemEndTime&SortOrder=a&showthumbs=on
// https://losangeles.craigslist.org/search/sga?max_price=200&sort=rel&query=bow&postal=90620&search_distance=30

module.exports.craigslist = (options) => {
    console.log('Scraping craigslist...');
    const promise = new Promise((resolve, reject) => {
      const city = options.city || 'losangeles';
      const searchTerm = options.searchTerm || 'bow';
      const siteUrl = `https://${city}.craigslist.org/search`;
      const zip = options.zip || 90620;
      const minPrice = options.minPrice || 1; // TODO: implement
      const maxPrice = options.maxPrice || 2000;
      const section = options.section || 'sga';
      const maxMiles = options.maxMiles || 30; // distance from zip in miles

      const reuestUrl = `${siteUrl}/${section}?query=${searchTerm}&sort=rel&search_distance=${maxMiles}&max_price=${maxPrice}&postal=${zip}`;
      console.log('About to make request to', reuestUrl);
      const response = request('GET', reuestUrl);
      console.log('Getting\n'+reuestUrl+' ...');
      const $ = cheerio.load(response.getBody());
      console.log($);
      const listings = [];
      const listingLength = $('.row').length;//to know when to resolve
console.log(listingLength, 'rows found');
      if (listingLength !== 0) {
        $(".row").each(function(index) {
//	console.log('img find:', 
  //        let img = $(this).find('img')['0']['attribs']['src'];
    //      if (img !== undefined) {
            // img = img.substring(img.indexOf("reuestUrl(")+4, img.indexOf(')'));
            // img = img.substr(0, img.indexOf('?'));//remove query params
      //    } else {
          const  img = 'images/not-found.png';
        //  }
          console.log(img);
          const title = $(this).find('#titletextonly').text().trim();
          let link = siteUrl + $(this).find('.pl a')['0']['attribs']['href'];
          // link = link.substr(0, link.indexOf('?'));//remove query params
          const price = $(this).find('.price').text().trim().substr(1);
          // const mileage = $(this).find('.mileage').text().trim();
          // let dateTemp = $(this).find('.nowrap').text().trim();
          // let dateFormatted = dateTemp.substring(dateTemp.indexOf('min(')+4, dateTemp.indexOf(')'));
          // let dateVal ="/Date("+dateFormatted+"000)/";
          // const date = new Date(parseFloat(dateVal.substr(6)));
          //TODO: get real place
          const place = 'CA';
          const info = 'change this yo';

          const item = { itemType: searchTerm,
              img: img,
              title: title, link: link,
              price: price, info: info,
              place: place, date: new Date() };

          const result = mongoService.findByLink(link);
          result.exec(function(err, result) {
            if (!err) {
              if (result && result.length === 0) {//NEW! if not found
                mongoService.insert(item);
                sendMail.sendText([item]);
              } else {
                console.log('EXISTING LINK FOUND', result[0].link)
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
    const searchTerm = options.searchTerm || '';
    const zip = options.zip || 84606;
    const minPrice = options.minPrice || 1;
    const maxPrice = options.maxPrice || 2000;
    const minYear = options.minYear || 1995;
    const maxYear = options.maxYear || 2016;
    const minMiles = options.minMiles || 0;
    const maxMiles = options.maxMiles || 200000;

    const url = `${siteUrl}?keyword=${searchTerm}&make%5B%5D=Honda&make%5B%5D=Toyota&make%5B%5D=Nissan&yearFrom=${minYear}&yearTo=${maxYear}&mileageFrom=${minMiles}&mileageTo=${maxMiles}&priceFrom=${minPrice}&priceTo=${maxPrice}&zip=${zip}&miles=${0}&newUsed%5B%5D=${'Used'}&newUsed%5B%5D=${'Certified'}&page=${0}&sellerType=${'For+Sale+By+Owner'}&postedTime=${'15DAYS'}&titleType=${'Clean+Title'}&sort=0&body=&transmission=&cylinders=&liters=&fuel=&drive=&numberDoors=&exteriorCondition=&interiorCondition=&cx_navSource=hp_search&search.x=65&search.y=7&search=Search+raquo%3B`;

    const response = request('GET', url);
    console.log('Getting\n'+url+' ...');
    const $ = cheerio.load(response.getBody());
    const listings = [];
    const listingLength = $('.listing').length;//to know when to resolve

    if (listingLength !== 0) {
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
            img: img,
            title: title, link: link,
            price: price, info: mileage,
            place: place, date: date};

        const result = mongoService.findByLink(link);
        result.exec(function(err, result) {
          if (!err) {
            if (result && result.length === 0) {//NEW! if not found
              mongoService.insert(item);
              sendMail.sendText([item]);
            } else {
              console.log('EXISTING LINK FOUND', result[0].link)
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
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}

//options: zip, minPrice, maxPrice, resultsPerPage, sortType
module.exports.scrapers = function (searchTerm, options) {
  console.log('SCRAPING KSL...');
  const promise = new Promise(function(resolve, reject) {
    const siteUrl = 'http://www.ksl.com/';
    const zip = options.zip || 84606;
    const minPrice = options.minPrice || 30;
    const maxPrice = options.maxPrice || 200;
    const resultsPerPage = options.resultsPerPage || 50;
    const sortType = options.sortType || 0;// newest to oldest

    const url = `${siteUrl}?nid=231&sid=74268&cat=&search=${searchTerm}&zip=${zip}&distance=&min_price=${minPrice}&max_price=${maxPrice}&type=&category=&subcat=&sold=&city=&addisplay=&userid=&markettype=sale&adsstate=&nocache=1&o_facetSelected=&o_facetKey=&o_facetVal=&viewSelect=list&viewNumResults=${resultsPerPage}&sort=${sortType}`;

    const response = request('GET', url);
    console.log('Getting\n'+url+' ...');
    const $ = cheerio.load(response.getBody());
    console.log('Got Body');

    let listings = [];
    let listingLength = $('.listings .adBox').length;//to know when to resolve

    console.log(listingLength, ' items found');
    if (listingLength !== 0) {
      $(".listings .adBox").each(function(index) {
        let img = $(this)['0'].children[0]['next'].children[0]['next'].children[0]['next']['data'];
        if (img !== undefined) {
          img = img.substring(img.indexOf("http://"), img.indexOf('?'));
        } else {
          img = 'images/not-found.png';
        }
        const title = $(this).find('.adTitle').text().trim()
        let link = siteUrl + $(this).find('.listlink')['0']['attribs']['href'];
        link = link.substr(0, link.indexOf('&cat='));//remove query params
        let price = $(this).find('.priceBox').text().trim();
        price = price.substring(1, price.length-2);

        //date
        let date = new Date()
        //description
        let description = 'TODO: implement description'
        //TODO: get real place
        const place = 'UT';

        const item = {itemType: searchTerm,
            img: img,
            title: title, link: link,
            price: price, info: description,
            place: place, date: date};

        const result = mongoService.findByLink(link);
        result.exec(function(err, result) {
          if (!err) {
            if (result && result.length === 0) {//NEW! if not found
              mongoService.insert(item);
              sendMail.sendText([item]);
              console.log('NEW ITEM FOUND     ', item.title, item.link);
            } else {
              console.log('EXISTING LINK FOUND', item.title, result[0].link)
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
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}
