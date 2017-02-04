const env = require('node-env-file');

// admin
function isAdmin(ip) {
  if (ip.includes('127.0.0.1') || ip.includes('localhost') || ip.includes(process.env.SERVER_IP)) {
    return true;
  }
  return false;
}

module.exports = {check: isAdmin};
