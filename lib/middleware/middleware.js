module.exports = function(req, res, next) {
  var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`${req.method} ${req.path} from ${ip} ${new Date().toString().substr(0,24)}`);
  next();
};
