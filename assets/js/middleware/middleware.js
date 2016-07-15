module.exports = function(req, res, next) {

  console.log('Request Type:', req.method);
  console.dir('Req:', req);
  console.log('The time is:',new Date().toDateString());

  next();
};
