const { getHttpClient } = require('../utils/httpClient');

async function getStatus() {
  const httpClient = getHttpClient();
  try {
    const response = await httpClient.get('/api/msd');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get MSD status: ${error.message}`);
  }
}

async function uploadImage(localPath, imageName) {
  const httpClient = getHttpClient();
  try {
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }
    
    const data = fs.readFileSync(localPath);
    const response = await httpClient.post(`/api/msd/write?image=${encodeURIComponent(imageName)}`, data, {
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

async function uploadImageByUrl(url, imageName) {
  const httpClient = getHttpClient();
  try {
    console.log(`[PiCUA] Attempting to upload from URL: ${url}`);
    if (imageName) {
      console.log(`[PiCUA] Image name: ${imageName}`);
    }
    
    // PiKVM MSD write_remote API expects URL as query parameter
    const params = new URLSearchParams();
    params.set('url', url);
    if (imageName) {
      params.set('image', imageName);
    }
    
    console.log(`[PiCUA] Sending request to /api/msd/write_remote with params:`, params.toString());
    
    // Use the correct endpoint for remote uploads
    const response = await httpClient.post(`/api/msd/write_remote?${params.toString()}`);
    
    console.log(`[PiCUA] Upload response:`, response.data);
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(`[PiCUA] Server responded with status: ${error.response.status}`);
      console.error(`[PiCUA] Response data:`, error.response.data);
      throw new Error(`Failed to upload from URL: Server responded with status ${error.response.status}`);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error(`Failed to upload from URL: No response received from server`);
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Failed to upload from URL: ${error.message}`);
    }
  }
}

async function setParams({ image, cdrom, rw }) {
  const httpClient = getHttpClient();
  try {
    // Validate parameters according to API specification
    if (cdrom !== undefined && ![0, 1, true, false].includes(cdrom)) {
      throw new Error('cdrom parameter must be 0, 1, true, or false');
    }
    if (rw !== undefined && ![0, 1, true, false].includes(rw)) {
      throw new Error('rw parameter must be 0, 1, true, or false');
    }
    
    // Build query string parameters as specified in the API docs
    const params = new URLSearchParams();
    if (image !== undefined) params.append('image', image);
    if (cdrom !== undefined) params.append('cdrom', cdrom ? '1' : '0');
    if (rw !== undefined) params.append('rw', rw ? '1' : '0');
    
    console.log(`[PiCUA] Setting MSD parameters: ${params.toString()}`);
    const response = await httpClient.post(`/api/msd/set_params?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to set MSD parameters: ${error.message}`);
  }
}

async function connect() {
  const httpClient = getHttpClient();
  try {
    console.log('[PiCUA] Connecting MSD to host...');
    const response = await httpClient.post('/api/msd/set_connected?connected=1');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to connect MSD: ${error.message}`);
  }
}

async function disconnect() {
  const httpClient = getHttpClient();
  try {
    console.log('[PiCUA] Disconnecting MSD from host...');
    const response = await httpClient.post('/api/msd/set_connected?connected=0');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to disconnect MSD: ${error.message}`);
  }
}

async function removeImage(imageName) {
  const httpClient = getHttpClient();
  try {
    if (!imageName) {
      throw new Error('Image name is required');
    }
    
    console.log(`[PiCUA] Removing MSD image: ${imageName}`);
    const response = await httpClient.post(`/api/msd/remove?image=${encodeURIComponent(imageName)}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to remove image: ${error.message}`);
  }
}

async function reset() {
  const httpClient = getHttpClient();
  try {
    const response = await httpClient.post('/api/msd/reset');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to reset MSD: ${error.message}`);
  }
}

async function testConnection() {
  const httpClient = getHttpClient();
  try {
    console.log('[PiCUA] Testing MSD API connectivity...');
    const response = await httpClient.get('/api/msd');
    console.log('[PiCUA] ✓ MSD API is accessible');
    console.log('[PiCUA] Response status:', response.status);
    console.log('[PiCUA] Response data keys:', Object.keys(response.data || {}));
    return response.data;
  } catch (error) {
    console.error('[PiCUA] ✗ MSD API test failed:', error.message);
    if (error.response) {
      console.error('[PiCUA] Server status:', error.response.status);
      console.error('[PiCUA] Server data:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  getStatus,
  uploadImage,
  uploadImageByUrl,
  setParams,
  connect,
  disconnect,
  removeImage,
  reset,
  testConnection,
};
