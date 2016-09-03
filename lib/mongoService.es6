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

const ScrapeModel = mongoose.model('PersonalScrape', {
  oauthID: Number,
  name: String,
  sendTo: String,
  sendMessage: { type: Boolean, default: true },
  site: String, //craigslist, ksl, car, or goodwill
  searchTerm: String,
  maxPrice: Number,
  section: String,
  maxMiles: Number,
  minYear: Number,
  created: Date,
  deleted: { type: Boolean, default: false },
});

module.exports.insertScrape = (scrape) => {
  console.log('Inserting', scrape);
  const scrapeToInsert = new ScrapeModel({
    oauthID: scrape.user.oauthID,
    scrapeName: scrape.scrapeName || new Date().toString().substr(0,24),
    sendTo: scrape.sendTo,
    sendMessage: scrape.sendMessage,
    site: scrape.site, //craigslist, ksl, car, or goodwill
    searchTerm: scrape.searchTerm,
    maxPrice: scrape.maxPrice,
    section: scrape.section,
    maxMiles: scrape.maxMiles,
    minYear: scrape.minYear,
    created: new Date(),
  });

  return new Promise((reject, resolve) => {
      scrapeToInsert.save((err) => {
        if (err) {
          console.log(scrapeToInsert);
          console.log('SAVE ERROR');
          reject(new Error(err));
        }
        resolve('success');
      });
    });;
};
module.exports.getAllActiveScrapes = () => ScrapeModel.find({ deleted: false });
module.exports.getScrapesForUser = (id) => ScrapeModel.find({ oathID: id });
module.exports.deleteScrapes = (userId) => {
  if (userId) {
    ScrapeModel.remove({ oauthID: userId}, (err) => {
      if (err) return err;
      return 'success: deleted all scrapes';
    });
  } else return new Error('Failed to specify UserId');
};
module.exports.deleteAllScrapes = () => {
    ScrapeModel.remove({}, (err) => {
      if (err) return err;
      return 'success: deleted all scrapes';
    });
};

// Item schema holds items and itemTypes
const itemSchema = new mongoose.Schema({
    // seq: { type: Number, unique:true, sparse:true },
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

function saveItem(item) {
  const status = { err: null };
  item.save((err) => {
    if (err) {
      status.err = err;
      console.log(item, status);
    }
    return status;
  });
}
module.exports.insert = (item) => {
  const itemToInsert = new ItemModel({
    itemType: item.itemType,
    link: item.link,
    img: item.img,
    title: item.title,
    price: parseFloat(item.price.replace(',', '')),
    info: item.info,
    place: item.place,
    date: item.date,
    creationDate: new Date(),
  });
  const insertStatus = saveItem(itemToInsert);
  return insertStatus;
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

module.exports.getActive = () => ItemModel.find({ deleted: false });
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
