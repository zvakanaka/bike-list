module.exports = function(req, res, next) {

  console.log('Request Type:', req.method);
  console.log('The time is:',new Date().toDateString());

  next();
};
