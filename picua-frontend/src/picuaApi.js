const API_BASE = 'http://localhost:3000/api';

// Runtime auth headers injected into every request after login
let AUTH_HEADERS = {};

export function setAuth(ip, username, password) {
  if (ip && username && password) {
    AUTH_HEADERS = {
      'x-pikvm-ip': ip,
      'x-pikvm-username': username,
      'x-pikvm-password': password,
    };
  }
}

async function request(path, options = {}) {
  try {
    const { headers: optionHeaders, ...rest } = options;
    const mergedHeaders = {
      'Content-Type': 'application/json',
      ...AUTH_HEADERS,
      ...(optionHeaders || {}),
    };
    const res = await fetch(API_BASE + path, { ...rest, headers: mergedHeaders });

    if (!res.ok) {
      let err;
      try {
        err = await res.json();
      } catch {
        err = { error: await res.text() };
      }
      throw new Error(err.error || err.message || 'API Error');
    }

    // Some endpoints (like GET /snapshot) are handled separately
    if (options.responseType === 'blob') {
      return res.blob();
    }

    return res.json();
  } catch (error) {
    if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
      throw new Error('Network error: Unable to connect to PiCUA server');
    }
    throw error;
  }
}

// Environment API
export async function getEnvironmentConfig() {
  return request('/env/config');
}

// AI Chat API
export async function sendChatMessage(messages, anthropicApiKey) {
  return request('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ 
      messages,
      anthropicApiKey 
    }),
  });
}

export async function streamChatMessage(messages, anthropicApiKey, signal) {
  const { headers: optionHeaders, ...rest } = {
    method: 'POST',
    body: JSON.stringify({ 
      messages,
      anthropicApiKey 
    }),
    signal
  };
  
  const mergedHeaders = {
    'Content-Type': 'application/json',
    ...AUTH_HEADERS,
    ...(optionHeaders || {}),
  };
  
  const res = await fetch(API_BASE + '/ai/chat/stream', { 
    ...rest, 
    headers: mergedHeaders 
  });

  if (!res.ok) {
    let err;
    try {
      err = await res.json();
    } catch {
      err = { error: await res.text() };
    }
    
    // Improve Anthropic error messages
    const errorMessage = err.error || err.message || 'AI Chat API Error';
    
    if (res.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check your API key configuration.');
    } else if (res.status === 429) {
      if (errorMessage.toLowerCase().includes('credit') || errorMessage.toLowerCase().includes('balance')) {
        throw new Error('Anthropic API credits exhausted. Please recharge your Anthropic account credits to continue using AI features.');
      } else {
        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
      }
    } else if (res.status === 400) {
      if (errorMessage.toLowerCase().includes('credit') || errorMessage.toLowerCase().includes('insufficient')) {
        throw new Error('Insufficient Anthropic API credits. Please add credits to your Anthropic account to continue.');
      } else {
        throw new Error(`Invalid request: ${errorMessage}`);
      }
    } else if (res.status === 403) {
      throw new Error('Access forbidden. Please check your Anthropic API key permissions.');
    } else if (res.status >= 500) {
      throw new Error('Anthropic API service temporarily unavailable. Please try again in a few moments.');
    }
    
    throw new Error(errorMessage);
  }

  return res.body;
}

export async function cancelAISession() {
  return request('/ai/cancel', { method: 'POST' });
}

// HID Control
export async function typeText(text, slow = false) {
  return request('/hid/type', {
    method: 'POST',
    body: JSON.stringify({ text, slow }),
  });
}

export async function keyPress(key) {
  return request('/hid/key', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });
}

export async function sendShortcut(keys) {
  return request('/hid/shortcut', {
    method: 'POST',
    body: JSON.stringify({ keys }),
  });
}

// Absolute mouse move (pixels); alias provided for clarity
export async function mouseMove(x, y) {
  return request('/hid/mouse/move', {
    method: 'POST',
    body: JSON.stringify({ x, y }),
  });
}

export async function moveMouseAbs(x, y) {
  return mouseMove(x, y);
}

// Relative mouse move
export async function mouseMoveRelative(dx, dy) {
  return request('/hid/mouse/move-relative', {
    method: 'POST',
    body: JSON.stringify({ dx, dy }),
  });
}

export async function moveMouseRel(dx, dy) {
  return mouseMoveRelative(dx, dy);
}

export async function clickMouse(button = 'left', clickType = 'single') {
  return request('/hid/mouse/click', {
    method: 'POST',
    body: JSON.stringify({ button, clickType }),
  });
}

export async function doubleClick(button = 'left') {
  return request('/hid/mouse/click', {
    method: 'POST',
    body: JSON.stringify({ button, clickType: 'double' }),
  });
}

export async function scrollMouse(dx = 0, dy = 0) {
  return request('/hid/mouse/scroll', {
    method: 'POST',
    body: JSON.stringify({ dx, dy }),
  });
}

export async function dragMouse(x1, y1, x2, y2, button = 'left') {
  return request('/hid/mouse/drag', {
    method: 'POST',
    body: JSON.stringify({ x1, y1, x2, y2, button }),
  });
}

// Snapshot
export async function getSnapshot() {
  return request('/snapshot', { responseType: 'blob' });
}

// ATX Power Control
export async function sendAtxPower(action = 'on', wait = false) {
  return request('/atx/power', {
    method: 'POST',
    body: JSON.stringify({ action, wait }),
  });
}

// MSD (Mass Storage Device)
export async function getMsdStatus() {
  return request('/msd');
}

export async function uploadMsdImage(localPath, imageName) {
  return request('/msd/upload', {
    method: 'POST',
    body: JSON.stringify({ localPath, imageName }),
  });
}

export async function uploadMsdImageFromUrl(url, imageName) {
  return request('/msd/upload-url', {
    method: 'POST',
    body: JSON.stringify({ url, imageName }),
  });
}

export async function setMsdParams(params) {
  return request('/msd/set-params', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function connectMsd() {
  return request('/msd/connect', { method: 'POST' });
}

export async function disconnectMsd() {
  return request('/msd/disconnect', { method: 'POST' });
}

export async function removeMsdImage(imageName) {
  return request('/msd/remove', {
    method: 'POST',
    body: JSON.stringify({ imageName }),
  });
}

export async function resetMsd() {
  return request('/msd/reset', { method: 'POST' });
}

export async function testMsdConnection() {
  return request('/msd/test');
}

// Session Management
export async function login(ip, username, password) {
  // Store creds locally for subsequent calls
  setAuth(ip, username, password);
  // Validate by hitting test endpoint; server will use headers (no config write)
  return request('/session/test');
}

export async function logout() {
  return request('/session/logout', { method: 'POST' });
}

export async function changePassword() {
  return request('/session/change-password', { method: 'POST' });
}

export async function getSessionStatus() {
  return request('/session/status');
}

export async function getSessionConfig() {
  return request('/session/config');
}

export async function testConnection() {
  return request('/session/test');
}

// Health
export async function healthCheck() {
  const url = API_BASE.replace('/api', '');
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Server health check failed');
    }
    return res.json();
  } catch (error) {
    if (error.name === 'TypeError' && (error.message.includes('Failed to fetch') || error.message.includes('fetch'))) {
      throw new Error('Network error: Unable to connect to PiCUA server');
    }
    throw error;
  }
}

export async function isServerRunning() {
  try {
    await healthCheck();
    return true;
  } catch {
    return false;
  }
}


