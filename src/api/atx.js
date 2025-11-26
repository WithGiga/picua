const { getHttpClient } = require('../utils/httpClient');

async function sendAtxClick(action = 'on', wait = false) {
  const httpClient = getHttpClient();
  const waitParam = wait ? 'true' : 'false';
  const url = `/api/atx/power?action=${action}&wait=${waitParam}`;
  return httpClient.post(url);
}

module.exports = {
  sendAtxClick,
};
