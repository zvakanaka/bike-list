module.exports = function(req, res, next) {

  console.log(`${req.method} ${req.path} ${new Date().toString().substr(0,24)}`);
  next();
};
