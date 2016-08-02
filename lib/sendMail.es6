var env = require('node-env-file');
var email 	= require("emailjs");
//Put the following in .env:
//EMAIL_FROM='example@gmail.com'
//EMAIL_PASSWORD='pass'
//EMAIL_TO='Jon 5555555555@text.republicwireless.com'
env(__dirname+'/../../.env');

var mailServer 	= email.server.connect({
   user:    process.env.EMAIL_FROM || '',
   password: process.env.EMAIL_PASSWORD || '',
   host:    "smtp.gmail.com",
   ssl:     true
});

/******* @param listings
 array of results to send
 ********/
module.exports.sendText = (listings) => {
  let subject = listings.length;
  let itemType = process.env.ITEM_TYPE || 'item'
  if (listings.length == 1) subject += ' new '+itemType+'\n';
  else subject += ' new '+itemType+'\n';
  let text = subject;

  listings.forEach(function(item, index) {
    text += item.title + ' $'+item.price + ' '
          + item.info + ' ' + item.itemUrl;
    if (index != listings.length-1) text += '\n\n';//last line
  });

  mailServer.send({
     text:    text,
     from:    process.env.EMAIL_FROM || '',
     to: process.env.EMAIL_TO || '',
     subject: subject
  }, function(err, message) { console.log(err || message); });
};
