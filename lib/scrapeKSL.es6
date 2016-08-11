const cheerio = require('cheerio');
const request = require('sync-request');
const sendMail = require('./sendMail.js');
const mongoItem = require('./mongoItem.js');

//options: searchTerm, zip, minPrice, maxPrice, minYear, maxYear, minMiles, maxMiles
module.exports.cars = function (options) {
  console.log('SCRAPING KSL AUTOS...');
  const promise = new Promise(function(resolve, reject) {
    const siteUrl = 'http://www.ksl.com/auto/search/index',
        searchTerm = options.searchTerm || '',
        zip = options.zip || 84606,
        minPrice = options.minPrice || 1,
        maxPrice = options.maxPrice || 2000,
        minYear  = options.minYear || 1995,
        maxYear  = options.maxYear || 2016,
        minMiles = options.minMiles || 0,
        maxMiles = options.maxMiles || 200000;

    const url = siteUrl + '?keyword=' + searchTerm
                    + '&make%5B%5D=' + 'Honda'
                    + '&make%5B%5D=' + 'Toyota'
                    + '&make%5B%5D=' + 'Nissan'
                    + '&yearFrom='+minYear+'&yearTo='+maxYear
                    + '&mileageFrom='+minMiles+'&mileageTo='+maxMiles
                    + '&priceFrom=' + minPrice
                    + '&priceTo=' + maxPrice
                    + '&zip=' + zip
                    + '&miles='+0
                    +'&newUsed%5B%5D='+'Used'+'&newUsed%5B%5D='+'Certified'
                    +'&page='+0
                    +'&sellerType='+'For+Sale+By+Owner'
                    +'&postedTime='+'15DAYS'
                    +'&titleType='+'Clean+Title'
                    +'&body=&transmission=&cylinders=&liters=&fuel=&drive=&numberDoors=&exteriorCondition=&interiorCondition=&cx_navSource=hp_search&search.x=65&search.y=7&search=Search+raquo%3B';

    const response = request('GET', url);
    console.log('Getting\n'+url+' ...');
    const $ = cheerio.load(response.getBody());
    let listings = [];
    let listingLength = $('.listing').length;

    if (listingLength !== 0) {
      // for (let i = 0; i < listingLength; i++) {
      $(".listing").each(function(index) {
        let img = $(this).find('.photo')['0']['attribs']['style'];
        if (img !== undefined) {
          img = img.substring(img.indexOf("url(")+4, img.indexOf(')'));
          img = img.substr(0, img.indexOf('?'));//remove query params
        } else {
          img = 'images/not-found.png';
        }
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

        const result = mongoItem.findByLink(link);
        result.exec(function(err, result) {
          if (!err) {
            if (result && result.length === 0) {//NEW! if not found
              mongoItem.insert(item);
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
module.exports.scrapeKsl = function (searchTerm, options) {
  console.log('SCRAPING KSL...');
  const promise = new Promise(function(resolve, reject) {
    const siteUrl = 'http://www.ksl.com/',
        zip = options.zip || 84606,
        minPrice = options.minPrice || 30,
        maxPrice = options.maxPrice || 200,
        resultsPerPage = options.resultsPerPage || 50,
        sortType = options.sortType || 5;

    const url = siteUrl + '?nid=231&sid=74268&cat='
                    + '&search=' + searchTerm
                    + '&zip=' + zip
                    + '&distance=&min_price=' + minPrice
                    + '&max_price=' + maxPrice
                    + '&type=&category=&subcat=&sold=&city=&addisplay=&userid=&markettype=sale&adsstate=&nocache=1&o_facetSelected=&o_facetKey=&o_facetVal=&viewSelect=list'
                    + '&viewNumResults=' + resultsPerPage
                    + '&sort=' + sortType;

    const response = request('GET', url);
    console.log('Getting '+url+' ...');
    const $ = cheerio.load(response.getBody());
    let listings = [];

    if ($('.listings .adBox').length != 0) {
      $(".listings .adBox").each(function(index) {
        let img = $(this)['0'].children[0]['next'].children[0]['next'].children[0]['next']['data'];
        if (img !== undefined) {
          img = img.substring(img.indexOf("http://"), img.indexOf('?'));
        } else {
          img = 'images/not-found.png';
        }
        const title = $(this).find('.adTitle').text().trim()
        const link = siteUrl + $(this).find('.listlink')['0']['attribs']['href'];
        let price = $(this).find('.priceBox').text().trim();
        price = price.substring(1, price.length-2);
        listings.push({img: img, title: title, link: link, price: price});
      });
      resolve(listings);
    } else {
      reject(Error('Error: no listings'));
    }
  });
  return promise;
}
