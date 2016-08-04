const mongoose = require ("mongoose"),
      env = require('node-env-file');
env(__dirname+'/../../.env');

var MONGO_URI = process.env.MONGO_URI || '';
mongoose.connect(MONGO_URI, function (err, res) {
  if (err) {
    console.log ('ERROR connecting to: ' + MONGO_URI + '. ' + err);
  } else {
    console.log ('Yay connected to: ' + MONGO_URI);
  }
});
//Item schema holds items and itemTypes
var itemSchema = new mongoose.Schema({
    //seq: { type: Number, unique:true, sparse:true },
    itemType: { type: String, trim: true },
    link: { type: String, trim: true, unique:true, sparse:true },
    title: { type: String, trim: true },
    price: { type: Number},
    info: { type: String, trim: true },
    place: { type: String, trim: true },
    date: { type: Date},
    creationDate: Date
});
var ItemModel = mongoose.model('Items', itemSchema);

function saveItem(item) {
  var status = { err: null };
  item.save(function (err) {
    if (err) status.err = err;
  });
  return status;
}

module.exports.insert = (item) => {
  var itemToInsert = new ItemModel ({
    itemType: item.itemType,
    link: item.link,
    title: item.title,
    price: parseFloat(item.price.replace(',','')),
    info: item.info,
    place: item.place,
    date: item.date,
    creationDate: new Date()
  });
  var insertStatus = saveItem(itemToInsert);
  return insertStatus;
}

module.exports.getAll = () => {
  return ItemModel.find();
}

module.exports.deleteAll = () => {
  ItemModel.remove({}, function(err) {
    if (err) {
      return err
    } else {
      return 'success: deleted all items'
    }
  });
}

module.exports.findByLink = (link) => {
  return ItemModel.find({link: link});
}
