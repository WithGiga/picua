const { getHttpClient } = require('../utils/httpClient');

async function getSnapshot() {
  try {
    const httpClient = getHttpClient();
    const response = await httpClient.get('/api/streamer/snapshot', {
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (err) {
    console.error('[PiCUA] Failed to get snapshot:', err.message);
    throw err;
  }
}

module.exports = { getSnapshot };
