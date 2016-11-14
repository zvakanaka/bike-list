const mongoose = require('mongoose');
const env = require('node-env-file');
const path = require('path');

env(path.join(__dirname, '/../../.env'));

const MONGO_URI = process.env.MONGO_URI || '';
mongoose.connect(MONGO_URI, (err, res) => {
  if (err) {
    console.log('ERROR connecting to: ' + MONGO_URI + '. ' + err + res);
  } else {
    console.log('Yay connected to: ' + MONGO_URI);
  }
});

// This is one way to make a model inline
const User = mongoose.model('User', {
  oauthID: Number,
  scrapeName: String,
  created: Date
});

module.exports.saveOrLoginUser = (profile) => {
  var promise = new Promise((resolve, reject) => {
    User.findOne({ oauthID: profile.id }, function(err, user) {
      if(err) {
        console.log('Mongo Error', err);  // handle errors!
        reject(err);
      }
      if (!err && user !== null) {
        console.log('User found:', profile.email);
        resolve(user);
      } else {
        user = new User({
          oauthID: profile.id,
          name: profile.displayName,
          created: Date.now()
        });
        user.save(function(err) {
          if(err) {
            console.log(err);  // handle errors!
          } else {
            console.log("Saving user", profile.email);
            resolve(user);
          }
        });
      }
    });
  });
  return promise;
};

const scrapeSchema = new mongoose.Schema({
    userId: String,
    scrapeName: String,
    sendTo: String,
    sendMessage: { type: Boolean },
    site: String, //craigslist, ksl, car, or goodwill
    searchTerm: String,
    maxPrice: Number,
    zip: Number,
    section: String,
    maxMiles: { type: Number },
    maxAutoMiles: { type: Number },
    minYear: Number,
    created: Date,
    deleted: { type: Boolean, default: false },
  });
const ScrapeModel = mongoose.model('Scrapes', scrapeSchema);

module.exports.insertScrape = (scrape) => {
  console.log('Inserting', scrape);
  let maxAutoMiles;
  if (typeof(scrape.maxAutoMiles) === "string") {
    maxAutoMiles = scrape.maxAutoMiles.replace(',','');
  }
  const scrapeToInsert = new ScrapeModel({
    userId: scrape.userId,
    scrapeName: scrape.scrapeName || new Date().toString().substr(0,24),
    sendTo: scrape.sendTo,
    sendMessage: scrape.sendMessage,
    site: scrape.site, //craigslist, ksl, car, or goodwill
    searchTerm: scrape.searchTerm,
    maxPrice: parseInt(scrape.maxPrice),
    zip: parseInt(scrape.zip),
    section: scrape.section || '',
    maxMiles: scrape.maxMiles || 0,
    maxAutoMiles: maxAutoMiles || scrape.maxAutoMiles || 0,
    minYear: scrape.minYear,
    created: new Date(),
  });

  return new Promise((resolve, reject) => {
      scrapeToInsert.save((err) => {
        if (err) {
          console.log('SAVE ERROR', err);
          reject(new Error(err));
        }
        resolve(scrapeToInsert);
      });
    });;
};
module.exports.getAllActiveScrapes = () => ScrapeModel.find({ deleted: false }).sort('-date');
module.exports.getScrapesForUser = (id) => ScrapeModel.find({ userId: id }).sort('-date');
module.exports.getScrape = (id) => ScrapeModel.find({ _id: id });
module.exports.deleteScrapes = (id) => {
  if (id) {
    ScrapeModel.remove({ userId: id}, (err) => {
      if (err) return err;
      return 'success: deleted all scrapes';
    });
  } else return new Error('Failed to specify UserId');
};
module.exports.deleteScrape = (_id) => {
  if (_id) {
    //TODO: update to innactive instead
    ScrapeModel.remove({ _id: _id}, (err) => {
      if (err) return err;
      return 'success: deleted scrape';
    });
  } else return new Error('Failed to specify _id');
};
module.exports.deleteAllScrapes = () => {
    const promise = new Promise((resolve, reject) => {
      ScrapeModel.remove({}, (err) => {
        if (err) reject(err);
        console.log('deleted scrapes');
        resolve ('success: deleted all scrapes');
      });
  });
  return promise;
};

// Item schema holds items and itemTypes
const itemSchema = new mongoose.Schema({
    // seq: { type: Number, unique:true, sparse:true },
  userId: String,
  itemType: { type: String, trim: true },
  link: { type: String, trim: true, unique: true, sparse: true },
  img: { type: String, trim: true },
  title: { type: String, trim: true },
  price: { type: Number },
  info: { type: String, trim: true },
  place: { type: String, trim: true },
  date: { type: Date },
  creationDate: Date,
  deleted: { type: Boolean, default: false },
});
// This is the other way to make a model
const ItemModel = mongoose.model('Items', itemSchema);

module.exports.insert = (item) => {
  if (typeof(item.price === 'string')) {
    item.price = parseFloat(item.price.replace(',', ''));
  }
  const itemToInsert = new ItemModel({
    userId: item.userId,
    itemType: item.itemType,
    link: item.link,
    img: item.img,
    title: item.title,
    price: parseInt(item.price),
    info: item.info,
    place: item.place,
    date: item.date,
    creationDate: new Date(),
  });
  return new Promise((resolve, reject) => {
      itemToInsert.save((err) => {
        if (err) {
          console.log('SAVE ERROR', err);
          reject(new Error(err));
        }
        resolve(itemToInsert);
      });
    });;
};

module.exports.updateItemsDeleted = (itemType, deleted) => {
  const promise = new Promise((resolve, reject) => {
    ItemModel.update({itemType:itemType}, {deleted: deleted}, {multi: true},
        function(err, num) {
            console.log("updated "+num);
            if (!err) {
              resolve(num);
            } else {
              reject(err);
            }
        });
  });
  return promise;
}

module.exports.updateItemDeleted = (link, deleted) => {
  ItemModel.update({ link: link }, { $set: { deleted: deleted }}, (err) => {
    if (err) console.log('err', err);
  });
}
module.exports.updateAllItemsDeleted = (id) => {
  ItemModel.update({ userId: id }, { $set: { deleted: true }}, {multi: true}, (err) => {
    if (err) console.log('err', err);
  });
}

module.exports.getActive = () => ItemModel.find({ deleted: false }).sort('-date');
module.exports.getMyActive = (id) => ItemModel.find({ userId: id, deleted: false }).sort('-date');
module.exports.getAll = () => ItemModel.find();

module.exports.deleteAll = () => {
  ItemModel.remove({}, (err) => {
    if (err) return err;
    return 'success: deleted all items';
  });
};

module.exports.findByLink = (l) => ItemModel.find({
  link: l,
});
