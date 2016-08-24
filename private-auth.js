var env = require('node-env-file');
env(__dirname+'/.env');

var port = process.env.PORT || 4000;
var ids = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://127.0.0.1:' + port + '/auth/google/callback'
  }
};

module.exports = ids;
