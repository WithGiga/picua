const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { getHttpClient, reloadConfig, hasConfig, setRuntimeConfig, getConfig } = require('../utils/httpClient');

const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.picua-config.json');

async function prompt(question, mask = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (!mask) {
    return new Promise((resolve) => rl.question(question, (ans) => {
      rl.close();
      resolve(ans);
    }));
  } else {
    return new Promise((resolve) => {
      rl.stdoutMuted = true;
      rl.question(question, (ans) => {
        rl.close();
        console.log('');
        resolve(ans);
      });
      rl._writeToOutput = function (stringToWrite) {
        if (rl.stdoutMuted) rl.output.write('*');
        else rl.output.write(stringToWrite);
      };
    });
  }
}

async function saveConfig(ip, username, password) {
  const config = { ip, username, password };
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
    console.log(`[PiCUA] Credentials saved to ${CONFIG_PATH}`);
    return true;
  } catch (e) {
    console.error('[PiCUA] Error saving config:', e.message);
    throw e;
  }
}

async function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error('No credentials found');
    }
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    throw new Error('Not authenticated. Please login from the web UI.');
  }
}

async function deleteConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      fs.unlinkSync(CONFIG_PATH);
      console.log('[PiCUA] Credentials removed successfully');
      return true;
    } else {
      console.log('[PiCUA] No credentials found to remove');
      return true;
    }
  } catch (error) {
    console.error('[PiCUA] Error removing credentials:', error.message);
    throw error;
  }
}

async function login(ipArg) {
  try {
    const ip = ipArg || (await prompt('PiKVM IP/Hostname: '));
    const username = await prompt('Username: ');
    const password = await prompt('Password: ', true);
    
    if (!ip || !username || !password) {
      throw new Error('All fields are required');
    }
    
    // Test the connection before saving
    await testConnection(ip, username, password);
    
    // Save the credentials
    await saveConfig(ip, username, password);
    
    // Reload the config in httpClient so it knows about the new credentials
    reloadConfig();
    
    console.log('[PiCUA] Login successful! You can now use other commands.');
    return true;
  } catch (error) {
    console.error('[PiCUA] Login failed:', error.message);
    throw error;
  }
}

async function loginWithCredentials(ip, username, password) {
  try {
    if (!ip || !username || !password) {
      throw new Error('IP, username and password are required');
    }
    await testConnection(ip, username, password);
    // Do not save on disk; set runtime only
    setRuntimeConfig({ ip, username, password });
    return true;
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

async function logout() {
  try {
    if (!hasConfig()) {
      console.log('[PiCUA] No active session to logout from');
      return true;
    }
    
    // Remove the config file
    await deleteConfig();
    
    // Reload the config in httpClient to clear the session
    reloadConfig();
    
    console.log('[PiCUA] Logout successful!');
    return true;
  } catch (error) {
    console.error('[PiCUA] Logout failed:', error.message);
    throw error;
  }
}

async function testConnection(ip, username, password) {
  try {
    // Create a temporary HTTP client to test the connection
    const axios = require('axios');
    const testClient = axios.create({
      baseURL: `https://${ip}`,
      auth: {
        username: username,
        password: password,
      },
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 5000,
    });
    
    // Test if we can access a protected endpoint to verify auth works
    const response = await testClient.get('/api/info');
    
    if (response.data.ok) {
      console.log('[PiCUA] Connection test successful - connected to PiKVM');
    } else {
      throw new Error('Failed to connect to PiKVM');
    }
  } catch (err) {
    throw new Error(`Connection test failed: ${err.message}`);
  }
}

async function getStatus() {
  try {
    // Prefer runtime (in-memory) credentials set by frontend
    if (hasConfig()) {
      const runtime = getConfig();
      try {
        await testConnection(runtime.ip, runtime.username, runtime.password);
        return {
          connected: true,
          ip: runtime.ip,
          username: runtime.username,
          message: 'Connected and authenticated'
        };
      } catch (error) {
        return {
          connected: false,
          ip: runtime.ip,
          username: runtime.username,
          message: `Credentials present but connection failed: ${error.message}`
        };
      }
    }

    // Fallback to disk-based config (CLI workflow)
    try {
      const fileConfig = await loadConfig();
      try {
        await testConnection(fileConfig.ip, fileConfig.username, fileConfig.password);
        return {
          connected: true,
          ip: fileConfig.ip,
          username: fileConfig.username,
          message: 'Connected and authenticated'
        };
      } catch (error) {
        return {
          connected: false,
          ip: fileConfig.ip,
          username: fileConfig.username,
          message: `Credentials saved but connection failed: ${error.message}`
        };
      }
    } catch (_) {
      return { connected: false, message: 'Not connected' };
    }
  } catch (error) {
    return {
      connected: false,
      message: error.message
    };
  }
}

async function changePassword() {
  try {
    if (!hasConfig()) {
      throw new Error('No active session. Please login first.');
    }
    
    const config = await loadConfig();
    const newPassword = await prompt('New Password: ', true);
    
    if (!newPassword) {
      throw new Error('New password is required');
    }
    
    // Test the new credentials
    await testConnection(config.ip, config.username, newPassword);
    
    // Save the updated config
    await saveConfig(config.ip, config.username, newPassword);
    
    // Reload the config
    reloadConfig();
    
    console.log('[PiCUA] Password changed successfully!');
    return true;
  } catch (error) {
    console.error('[PiCUA] Password change failed:', error.message);
    throw error;
  }
}

module.exports = {
  login,
  logout,
  getStatus,
  testConnection,
  changePassword,
  loadConfig,
  saveConfig,
  deleteConfig,
  loginWithCredentials
};
