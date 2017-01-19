module.exports = function(req, res, next) {
  if (req.user) {
    let idThing = req.cookies.id || req.user.id;
    console.log(idThing);
  } else {
    console.log('not logged in');
  }

  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`${req.method} ${req.path} from ${ip} ${new Date().toString().substr(0,24)}`);
  next();
};
