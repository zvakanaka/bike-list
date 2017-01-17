// Send new item reports through email
const env = require('node-env-file');
const email = require("emailjs");
//Put the following in .env:
//EMAIL_FROM='example@gmail.com'
//EMAIL_PASSWORD='pass'
//EMAIL_TO='Jon 5555555555@text.republicwireless.com'
env(__dirname+'/../../.env');

const mailServer = email.server.connect({
    user:     process.env.EMAIL_FROM || '',
    password: process.env.EMAIL_PASSWORD || '',
    host:     "smtp.gmail.com",
    ssl:      true,
    port:     465
});

module.exports.buildSubject = (listings) => {
  let subject = listings.length;
  let itemType = process.env.ITEM_TYPE || 'item'
  if (listings.length === 1) subject += ' new '+itemType+'\n';
  else subject += ' new '+itemType+'s\n';
  return subject;
}

module.exports.buildBody = (listings, subject) => {
  let body = subject;// begin with subject
  listings.forEach(function(item, index) {
    body += item.title + ' $'+item.price + ' '
         + item.info + ' ' + item.link;
    if (index === listings.length-1) body += '\n\n';//last line
    else body += '\n';
  });
  return body;
}

/*******
 @param listings
 array of results to send
 ********/
module.exports.sendText = (listings, sendTo) => {
  console.log('Sending Text');
  let subject = module.exports.buildSubject(listings);
  let text = module.exports.buildBody(listings, subject);

  if (!process.env.NO_SEND_MAIL) {
    mailServer.send({
       text:    text,
       from:    process.env.EMAIL_FROM || '',
       to: sendTo || process.env.EMAIL_TO,
       subject: subject
    }, function(err, message) {
    //  console.log(err || message);
    });
  } else {
    console.log('MAIL IS OFF: re-enable by removing config var \'NO_SEND_MAIL\'');
  }
};
