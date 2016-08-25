module.exports = function(req, res, next) {

  console.log('Request Type:',
  req.method, 'Host', req.headers.host, 
  'The time is:',new Date().toDateString());

  next();
};
