module.exports = function(req, res, next) {

  console.log('Request Type:',
  req.method, req.headers.host, new Date().toString().substr(0,24));

  next();
};
