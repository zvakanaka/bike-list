module.exports = function(req, res, next) {

  console.log('Request Type:', req.method);
  console.log(req.headers);
  console.log('The time is:',new Date().toDateString());

  next();
};
