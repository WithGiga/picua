const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.picua-config.json');

let config = null;
let warningShown = false;

// Load config silently on startup
try {
  const raw = fs.readFileSync(CONFIG_PATH);
  config = JSON.parse(raw);
} catch {
  // Don't show warning on startup - only when actually trying to use the client
  config = null;
}

// Export a function to get httpClient instance
function getHttpClient() {
  if (!config || !config.ip || !config.username || !config.password) {
    // Only show warning once per session when actually trying to use the client
    if (!warningShown) {
      console.warn('[PiCUA] No credentials found. Please login from the web UI.');
      warningShown = true;
    }
    throw new Error('Not authenticated. Please login from the web UI.');
  }

  return axios.create({
    baseURL: `https://${config.ip}`,
    auth: {
      username: config.username,
      password: config.password,
    },
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 5000,
  });
}

module.exports = {
  getHttpClient,
  getConfig() {
    return config ? { ...config } : null;
  },
  reloadConfig() {
    try {
      const raw = fs.readFileSync(CONFIG_PATH);
      config = JSON.parse(raw);
      // Reset warning flag when config is reloaded
      warningShown = false;
    } catch {
      config = null;
      warningShown = false;
    }
  },
  // Add function to check if config exists without showing warnings
  hasConfig() {
    return !!(config && config.ip && config.username && config.password);
  },
  setRuntimeConfig(newConfig) {
    if (
      newConfig &&
      typeof newConfig.ip === 'string' &&
      typeof newConfig.username === 'string' &&
      typeof newConfig.password === 'string'
    ) {
      config = {
        ip: newConfig.ip,
        username: newConfig.username,
        password: newConfig.password,
      };
      warningShown = false;
    } else {
      config = null;
    }
  }
};
