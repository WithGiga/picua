#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

// Import PiCUA modules
const hid = require('./src/api/hid');
const snapshot = require('./src/api/snapshot');
const session = require('./src/api/session');
const atx = require('./src/api/atx');
const msd = require('./src/api/msd');
const { hasConfig, setRuntimeConfig, getConfig, getHttpClient } = require('./src/utils/httpClient');

// Import AI integration
const { PiCUAAgent } = require('./ai-integration/picua-agent.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Track active AI sessions for cancellation
const activeSessions = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Debug logging middleware for all requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  
  // Log request headers for debugging
  if (req.url.includes('ffmpeg') || req.url.includes('record')) {
    console.log(`[DEBUG] Headers:`, JSON.stringify(req.headers, null, 2));
  }
  
  next();
});

// Security headers middleware - enable cross-origin isolation for SharedArrayBuffer
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // Allow loading scripts from unpkg.com for FFmpeg if ever needed (fallback)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; worker-src 'self' blob:; connect-src 'self' https://*; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*;"
  );

  next();
});

// Runtime credential injection from headers (stateless auth from frontend)
app.use((req, res, next) => {
  const ip = req.headers['x-pikvm-ip'];
  const username = req.headers['x-pikvm-username'];
  const password = req.headers['x-pikvm-password'];
  if (ip && username && password) {
    try {
      setRuntimeConfig({ ip, username, password });
    } catch (_) {
      // ignore; downstream will error if unusable
    }
  }
  next();
});

// Serve static files from the frontend build directory
const frontendPath = process.env.NODE_ENV === 'development' 
  ? path.join(__dirname, 'picua-frontend/src') 
  : path.join(__dirname, 'picua-frontend/dist');

// Check if dist exists, if not serve from src (development mode)
const distExists = fs.existsSync(path.join(__dirname, 'picua-frontend/dist/index.html'));
const finalFrontendPath = distExists 
  ? path.join(__dirname, 'picua-frontend/dist')
  : path.join(__dirname, 'picua-frontend');

// Serve FFmpeg.js library files from local public directory (MUST be before general static middleware)
app.use('/lib', (req, res, next) => {
  console.log('[FFmpeg Local] Request for:', req.url);
  next();
}, express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filepath) => {
    console.log('[FFmpeg Local] Serving file:', filepath);
    // Set proper MIME types for JavaScript files
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (filepath.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
    // Ensure resources opt-in for cross-origin isolation
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  }
}));

console.log('[FFmpeg Local] Serving FFmpeg library from:', path.join(__dirname, 'public'));

app.use(express.static(finalFrontendPath));
app.use('/src', express.static(path.join(__dirname, 'picua-frontend/src')));
app.use('/assets', express.static(path.join(__dirname, 'picua-frontend/src/assets')));
// Serve image assets
app.use('/img', express.static(path.join(__dirname, 'img')));

// Enhanced real-time PiKVM stream proxy endpoint with lag elimination
app.get('/pikvm-stream', async (req, res) => {
  try {
    const auth = getConfig();
    
    if (!auth) {
      // Return a placeholder image or error for unauthenticated users
      res.status(401);
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <html>
          <body style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: Arial, sans-serif;">
            <div style="text-align: center; color: #666;">
              <h2>PiKVM Stream Unavailable</h2>
              <p>Please log in to access the PiKVM stream.</p>
            </div>
          </body>
        </html>
      `);
      return;
    }

    // Enhanced stream URL with optimized parameters for real-time streaming
    const streamUrl = `https://${auth.ip}/streamer/stream?key=BZj3B3mGV63mb9G0&advance_headers=1&quality=80&fps=30&format=mjpeg`;
    
    console.log(`[PiKVM Stream] Starting real-time stream proxy to: ${auth.ip} (${auth.username})`);
    
    // Create authorization header
    const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
    
    // Proxy the request to PiKVM with optimized settings
    const https = require('https');
    const agent = new https.Agent({
      rejectUnauthorized: false, // Ignore self-signed SSL certificate
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 10,
      maxFreeSockets: 5,
      timeout: 5000,
      freeSocketTimeout: 4000
    });

    const options = {
      hostname: auth.ip,
      port: 443,
      path: '/streamer/stream?key=BZj3B3mGV63mb9G0&advance_headers=1&quality=80&fps=30&format=mjpeg',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'PiCUA-Stream-Proxy/2.0',
        'Accept': 'multipart/x-mixed-replace,image/jpeg',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      agent: agent,
      timeout: 5000
    };

    const proxyReq = https.request(options, (proxyRes) => {
      console.log(`[PiKVM Stream] Connected, status: ${proxyRes.statusCode}, content-type: ${proxyRes.headers['content-type']}`);
      
      if (proxyRes.statusCode !== 200) {
        console.error(`[PiKVM Stream] Unexpected status code: ${proxyRes.statusCode}`);
        if (!res.headersSent) {
          res.status(proxyRes.statusCode).json({ error: 'PiKVM stream error' });
        }
        return;
      }

      // Set appropriate headers for streaming
      const contentType = proxyRes.headers['content-type'] || 'multipart/x-mixed-replace';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.status(proxyRes.statusCode);
      
      console.log(`[PiKVM Stream] Headers set, starting stream pipe`);
      
      // Direct pipe for simplicity and reliability
      proxyRes.pipe(res);
      
      proxyRes.on('end', () => {
        console.log('[PiKVM Stream] Stream ended');
      });
      
      // Handle errors
      proxyRes.on('error', (error) => {
        console.error('[PiKVM Stream] Response error:', error.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream response error' });
        }
      });
    });

    proxyReq.on('error', (error) => {
      console.error('[PiKVM Stream] Request error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to connect to PiKVM stream' });
      }
    });

    proxyReq.on('timeout', () => {
      console.error('[PiKVM Stream] Request timeout');
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: 'PiKVM stream timeout' });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('[PiKVM Stream] Request closed by client');
      proxyReq.destroy();
    });

    req.on('aborted', () => {
      console.log('[PiKVM Stream] Request aborted by client');
      proxyReq.destroy();
    });

    proxyReq.end();

  } catch (error) {
    console.error('[PiKVM Stream] Unexpected error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Stream test endpoint
app.get('/test-stream', (req, res) => {
  const auth = getConfig();
  if (!auth) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  res.json({
    status: 'ok',
    message: 'Stream test endpoint',
    pikvmIp: auth.ip,
    streamUrl: `/pikvm-stream`,
    testUrl: `https://${auth.ip}/streamer/stream?key=BZj3B3mGV63mb9G0&advance_headers=1`
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  const auth = getConfig();
  res.json({ 
    status: 'ok', 
    message: 'PiCUA Backend Server Running',
    version: '1.0.0',
    authenticated: !!auth,
    ip: auth?.ip
  });
});

// Environment configuration endpoint
app.get('/api/env/config', (req, res) => {
  res.json({
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    pikvmIp: process.env.PIKVM_IP || '',
    pikvmUsername: process.env.PIKVM_USERNAME || '',
    pikvmPassword: process.env.PIKVM_PASSWORD || '',
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint to verify FFmpeg files are accessible
app.get('/api/debug/ffmpeg-files', async (req, res) => {
  const fs = require('fs');
  const publicDir = path.join(__dirname, 'public');
  
  try {
    const files = fs.readdirSync(publicDir).filter(f => f.includes('ffmpeg'));
    const fileInfo = files.map(f => {
      const stats = fs.statSync(path.join(publicDir, f));
      return {
        name: f,
        size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
        url: `http://localhost:3000/lib/${f}`,
        accessible: fs.existsSync(path.join(publicDir, f))
      };
    });
    
    res.json({
      status: 'ok',
      publicDir: publicDir,
      files: fileInfo,
      message: 'All files should be accessible at /lib/filename'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint for FFmpeg and recording issues
app.get('/api/debug/recording', (req, res) => {
  console.log('[DEBUG] Recording debug endpoint called');
  console.log('[DEBUG] Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('[DEBUG] User-Agent:', req.get('User-Agent'));
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    server: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      ip: req.ip,
      protocol: req.protocol,
      secure: req.secure
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: PORT
    },
    ffmpegInfo: {
      cdnUrl: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
      coreUrl: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      cspHeaders: res.getHeaders()['content-security-policy'] || 'not set',
      corsHeaders: {
        'cross-origin-embedder-policy': res.getHeaders()['cross-origin-embedder-policy'] || 'not set',
        'cross-origin-opener-policy': res.getHeaders()['cross-origin-opener-policy'] || 'not set'
      }
    },
    recommendations: [
      'Check browser console for detailed FFmpeg loading errors',
      'Verify network connectivity to unpkg.com CDN',
      'Check if Content Security Policy is blocking scripts',
      'Ensure browser supports WebAssembly (required for FFmpeg.js)',
      'Try clearing browser cache and hard refresh (Ctrl+Shift+R)'
    ]
  };
  
  console.log('[DEBUG] Sending debug info:', JSON.stringify(debugInfo, null, 2));
  res.json(debugInfo);
});

// Error logging endpoint for client-side errors
app.post('/api/debug/log-error', (req, res) => {
  const { error, context, userAgent, timestamp } = req.body;
  
  console.error('='.repeat(80));
  console.error('[CLIENT ERROR]', timestamp || new Date().toISOString());
  console.error('[Context]', context || 'No context provided');
  console.error('[User Agent]', userAgent || req.get('User-Agent'));
  console.error('[Error]', error);
  console.error('='.repeat(80));
  
  res.json({ 
    success: true, 
    message: 'Error logged on server',
    serverTime: new Date().toISOString()
  });
});

// API Routes

// HID Control Endpoints
app.post('/api/hid/type', async (req, res) => {
  try {
    const { text, slow } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    await hid.typeText(text, slow);
    res.json({ success: true, message: `Typed text${slow ? ' (slow mode)' : ''}: "${text}"` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/key', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }
    
    await hid.keyPress(key);
    res.json({ success: true, message: `Key pressed: ${key}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/shortcut', async (req, res) => {
  try {
    const { keys } = req.body;
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Keys array is required' });
    }
    
    await hid.sendShortcut(keys);
    res.json({ success: true, message: `Shortcut sent: ${keys.join(',')}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/mouse/move', async (req, res) => {
  try {
    const { x, y } = req.body;
    const px = Number(x);
    const py = Number(y);
    if (!Number.isFinite(px) || !Number.isFinite(py)) {
      return res.status(400).json({ error: 'Valid numeric x and y coordinates are required' });
    }

    const result = await hid.moveMouseAbs(px, py);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/mouse/move-relative', async (req, res) => {
  try {
    const { dx, dy } = req.body;
    if (typeof dx !== 'number' || typeof dy !== 'number') {
      return res.status(400).json({ error: 'Valid dx and dy values are required' });
    }
    
    if (typeof hid.moveMouseRel === 'function') {
      await hid.moveMouseRel(dx, dy);
    } else {
      // Fallback: call PikVM endpoint directly
      const httpClient = getHttpClient();
      await httpClient.post(`/api/hid/events/send_mouse_relative?delta_x=${dx}&delta_y=${dy}`);
    }
    res.json({ success: true, message: `Mouse moved relatively by (${dx}, ${dy})` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/mouse/click', async (req, res) => {
  try {
    const { button, clickType } = req.body;
    const validButtons = ['left', 'right'];
    const validClickTypes = ['single', 'double'];
    
    if (!validButtons.includes(button)) {
      return res.status(400).json({ error: 'Valid button is required (left or right)' });
    }
    
    if (!validClickTypes.includes(clickType)) {
      return res.status(400).json({ error: 'Valid clickType is required (single or double)' });
    }
    
    if (clickType === 'double') {
      await hid.doubleClick(button);
      res.json({ success: true, message: `Double click with '${button}' button` });
    } else {
      await hid.singleClick(button);
      res.json({ success: true, message: `Single click with '${button}' button` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/mouse/scroll', async (req, res) => {
  try {
    const { dx, dy } = req.body;
    const scrollX = dx || 0;
    const scrollY = dy || 0;
    
    await hid.scrollWheel(scrollX, scrollY);
    res.json({ success: true, message: `Mouse scrolled by dx=${scrollX}, dy=${scrollY}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/hid/mouse/drag', async (req, res) => {
  try {
    const { x1, y1, x2, y2, button } = req.body;
    if ([x1, y1, x2, y2].some(v => typeof v !== 'number')) {
      return res.status(400).json({ error: 'Valid coordinates are required' });
    }
    
    const dragButton = button || 'left';
    await hid.dragMouse(x1, y1, x2, y2, dragButton);
    res.json({ success: true, message: `Mouse dragged from (${x1},${y1}) to (${x2},${y2}) with button ${dragButton}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Snapshot Endpoint
app.get('/api/snapshot', async (req, res) => {
  try {
    const imageBuffer = await snapshot.getSnapshot();
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', `attachment; filename="screen-${Date.now()}.jpg"`);
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ATX Power Control Endpoint
app.post('/api/atx/power', async (req, res) => {
  try {
    const { action, wait } = req.body;
    const validActions = ['on', 'off', 'long', 'reset'];
    
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Valid options: ${validActions.join(', ')}` });
    }
    
    await atx.sendAtxClick(action, wait);
    const waitText = wait ? ' (waiting for completion)' : '';
    res.json({ success: true, message: `Power command '${action}' sent successfully${waitText}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MSD Endpoints
app.get('/api/msd', async (req, res) => {
  try {
    const status = await msd.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/upload', async (req, res) => {
  try {
    const { localPath, imageName } = req.body;
    if (!localPath) {
      return res.status(400).json({ error: 'Local file path is required' });
    }
    
    const name = imageName || path.basename(localPath);
    await msd.uploadImage(localPath, name);
    res.json({ success: true, message: `Image uploaded successfully: ${name}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/upload-url', async (req, res) => {
  try {
    const { url, imageName } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    await msd.uploadImageByUrl(url, imageName);
    res.json({ success: true, message: `Remote upload started from: ${url}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/set-params', async (req, res) => {
  try {
    const { image, cdrom, rw } = req.body;
    if (!image && cdrom === undefined && rw === undefined) {
      return res.status(400).json({ error: 'At least one parameter is required' });
    }
    
    await msd.setParams({ image, cdrom, rw });
    res.json({ success: true, message: 'MSD parameters set successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/connect', async (req, res) => {
  try {
    await msd.connect();
    res.json({ success: true, message: 'MSD connected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/disconnect', async (req, res) => {
  try {
    await msd.disconnect();
    res.json({ success: true, message: 'MSD disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/remove', async (req, res) => {
  try {
    const { imageName } = req.body;
    if (!imageName) {
      return res.status(400).json({ error: 'Image name is required' });
    }
    
    await msd.removeImage(imageName);
    res.json({ success: true, message: `Image removed successfully: ${imageName}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/msd/reset', async (req, res) => {
  try {
    await msd.reset();
    res.json({ success: true, message: 'MSD reset to defaults successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/msd/test', async (req, res) => {
  try {
    await msd.testConnection();
    res.json({ success: true, message: 'MSD API test completed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// AI Chat Endpoints
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, anthropicApiKey } = req.body;
    const auth = getConfig();
    
    if (!auth) {
      return res.status(401).json({ error: 'PiKVM authentication required' });
    }
    
    // Use provided API key or fall back to environment variable
    const apiKey = anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Anthropic API key is required' });
    }
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const agent = new PiCUAAgent(
      apiKey,
      auth.ip,
      auth.username,
      auth.password
    );
    const response = await agent.stream({ 
      messages, 
      signal: req.aborted ? new AbortController().signal : undefined 
    });

    // For non-streaming response, collect all events and return final result
    const events = [];
    for await (const event of response) {
      events.push(event);
    }
    
    res.json({ events });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/chat/stream', async (req, res) => {
  try {
    const { messages, anthropicApiKey } = req.body;
    const auth = getConfig();
    
    if (!auth) {
      return res.status(401).json({ error: 'PiKVM authentication required' });
    }
    
    // Use provided API key or fall back to environment variable
    const apiKey = anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'Anthropic API key is required' });
    }
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Create session ID and AbortController for this session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    
    // Add debugging to track when abort is called
    const originalAbort = abortController.abort.bind(abortController);
    abortController.abort = (reason) => {
      console.log(`[AI Session] 🚨 AbortController.abort() called for session ${sessionId}`);
      console.log(`[AI Session] Abort reason: ${reason || 'No reason provided'}`);
      console.log(`[AI Session] Stack trace:`, new Error().stack);
      return originalAbort(reason);
    };

    // Set up SSE headers with better connection handling
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial connection confirmation
    console.log(`[AI Session] 📡 Sending connection confirmation for session ${sessionId}`);
    res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
    
    // Send a test message immediately to verify connection
    setTimeout(() => {
      if (!sessionEnded) {
        console.log(`[AI Session] 📡 Sending test message for session ${sessionId}`);
        try {
          res.write(`data: ${JSON.stringify({ type: 'test', message: 'Connection test successful' })}\n\n`);
        } catch (error) {
          console.log(`[AI Session] ❌ Failed to send test message for session ${sessionId}:`, error.message);
        }
      }
    }, 1000); // Send test message after 1 second
    
    // Track this session
    activeSessions.set(sessionId, {
      abortController,
      timestamp: Date.now(),
      ip: auth.ip
    });
    
    // Set a reasonable timeout (10 minutes) to prevent runaway sessions
    const sessionTimeout = setTimeout(() => {
      if (!sessionEnded) {
        console.log(`[AI Session] ⏱️ Session ${sessionId} timed out after 10 minutes`);
        sessionEnded = true;
        
        // Send timeout notification to client before aborting
        try {
          res.write(`data: ${JSON.stringify({ 
            type: 'error', 
            content: '⏱️ Session timed out after 10 minutes. Please start a new request.',
            error: 'TIMEOUT'
          })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'done', content: 'Session timed out' })}\n\n`);
        } catch (error) {
          console.log(`[AI Session] Failed to send timeout notification: ${error.message}`);
        }
        
        abortController.abort('Session timeout after 10 minutes');
        activeSessions.delete(sessionId);
        
        // End the response
        try {
          res.end();
        } catch (error) {
          console.log(`[AI Session] Failed to end response: ${error.message}`);
        }
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    console.log(`[AI Session] Started session ${sessionId}`);

    // Handle client disconnect - but be more careful about when to cancel
    let sessionEnded = false;
    
    // Send periodic keep-alive to prevent connection timeout
    const keepAliveInterval = setInterval(() => {
      if (!sessionEnded && !res.destroyed) {
        try {
          res.write(`data: ${JSON.stringify({ type: 'keepalive', timestamp: Date.now() })}\n\n`);
        } catch (error) {
          console.log(`[AI Session] Keep-alive failed for session ${sessionId}, ending session`);
          if (!sessionEnded) {
            sessionEnded = true;
            clearTimeout(sessionTimeout);
            clearInterval(keepAliveInterval);
            abortController.abort();
            activeSessions.delete(sessionId);
          }
        }
      }
    }, 30000); // Send keep-alive every 30 seconds
    
    // TEMPORARILY DISABLED - Testing if these events are causing premature cancellation
    // req.on('close', () => {
    //   if (!sessionEnded) {
    //     console.log(`[AI Session] ⚠️  Client disconnected (req.close), cancelling session ${sessionId}`);
    //     console.log(`[AI Session] Request details: method=${req.method}, url=${req.url}, headers=${JSON.stringify(req.headers)}`);
    //     sessionEnded = true;
    //     clearTimeout(sessionTimeout);
    //     clearInterval(keepAliveInterval);
    //     abortController.abort();
    //     activeSessions.delete(sessionId);
    //   }
    // });

    // req.on('aborted', () => {
    //   if (!sessionEnded) {
    //     console.log(`[AI Session] ⚠️  Request aborted (req.aborted), cancelling session ${sessionId}`);
    //     console.log(`[AI Session] Request details: method=${req.method}, url=${req.url}, headers=${JSON.stringify(req.headers)}`);
    //     sessionEnded = true;
    //     clearTimeout(sessionTimeout);
    //     clearInterval(keepAliveInterval);
    //     abortController.abort();
    //     activeSessions.delete(sessionId);
    //   }
    // });
    
    console.log(`[AI Session] 🧪 TESTING: Disabled automatic connection monitoring for session ${sessionId}`);

    const agent = new PiCUAAgent(
      apiKey,
      auth.ip,
      auth.username,
      auth.password
    );
    
    try {
      for await (const event of agent.stream({ 
        messages, 
        signal: abortController.signal
      })) {
        // Check if session was cancelled
        if (abortController.signal.aborted) {
          console.log(`[AI Session] 🛑 Session ${sessionId} was cancelled during streaming`);
          console.log(`[AI Session] Abort reason: ${abortController.signal.reason || 'No reason provided'}`);
          console.log(`[AI Session] Event type: ${event?.type}, sessionEnded: ${sessionEnded}`);
          break;
        }
        
        const sseData = `data: ${JSON.stringify(event)}\n\n`;
        res.write(sseData);
      }
    } catch (error) {
      console.error('Streaming error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Extract clean error message from nested JSON structure
      let errorMessage = 'An error occurred with the PiCUA Computer Use Agent. Please try again.';
      
      try {
        // Check if error.message contains a JSON structure (format: "400 {...json...}")
        if (error.message && error.message.includes('{')) {
          const jsonMatch = error.message.match(/\{.*\}/s);
          if (jsonMatch) {
            const errorObj = JSON.parse(jsonMatch[0]);
            // Anthropic errors: {error: {message: "..."}}
            if (errorObj.error && errorObj.error.message) {
              errorMessage = errorObj.error.message;
            } else if (errorObj.message) {
              errorMessage = errorObj.message;
            }
          }
        }
        // If no JSON, use message as-is
        else if (error.message) {
          errorMessage = error.message;
        }
      } catch (parseError) {
        // If parsing fails, use original message
        errorMessage = error.message || errorMessage;
      }
      
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        content: errorMessage,
        originalError: error.message 
      })}\n\n`);
    }
    
    // Clean up session
    if (!sessionEnded) {
      sessionEnded = true;
      clearTimeout(sessionTimeout);
      clearInterval(keepAliveInterval);
      activeSessions.delete(sessionId);
      console.log(`[AI Session] Cleaned up session ${sessionId}`);
    }
    
    res.end();
  } catch (error) {
    console.error('AI Chat stream error:', error);
    console.error('Error message:', error.message);
    console.error('Error type:', error.type);
    console.error('Error stack:', error.stack);
    
    // Extract clean error message from nested JSON structure
    let errorMessage = 'An error occurred with the PiCUA Computer Use Agent. Please try again.';
    let errorDetails = null;
    
    try {
      // Parse nested error structure if present
      if (error.message && error.message.includes('{')) {
        const jsonMatch = error.message.match(/\{.*\}/s);
        if (jsonMatch) {
          const errorObj = JSON.parse(jsonMatch[0]);
          if (errorObj.error && errorObj.error.message) {
            errorMessage = errorObj.error.message;
            errorDetails = {
              type: errorObj.error.type || 'api_error',
              message: errorObj.error.message
            };
          } else if (errorObj.message) {
            errorMessage = errorObj.message;
            errorDetails = {
              type: errorObj.type || 'api_error',
              message: errorObj.message
            };
          }
        }
      }
      // If no JSON structure, use message as-is
      else if (error.message) {
        errorMessage = error.message;
        const msg = error.message;
        
        // Categorize errors for better tracking
        if (msg.includes('credit balance is too low') || msg.includes('Insufficient credits')) {
          errorDetails = { type: 'insufficient_credits', message: error.message };
        } else if (msg.includes('invalid_request_error') || msg.includes('invalid request')) {
          errorDetails = { type: 'invalid_request_error', message: error.message };
        } else if (msg.includes('authentication') || msg.includes('invalid x-api-key')) {
          errorDetails = { type: 'authentication_error', message: error.message };
        } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
          errorDetails = { type: 'rate_limit_error', message: error.message };
        } else {
          errorDetails = { type: 'general_error', message: error.message };
        }
      }
    } catch (parseError) {
      // If parsing fails, use original message
      errorMessage = error.message || errorMessage;
      errorDetails = { type: 'general_error', message: error.message };
    }
    
    // Clean up session on error
    if (!sessionEnded) {
      sessionEnded = true;
      clearTimeout(sessionTimeout);
      clearInterval(keepAliveInterval);
      activeSessions.delete(sessionId);
      console.log(`[AI Session] Cleaned up session ${sessionId} due to error`);
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: errorMessage,
        details: errorDetails,
        originalError: error.message
      });
    }
  }
});

// AI Session Cancellation Endpoint
app.post('/api/ai/cancel', async (req, res) => {
  try {
    console.log('[AI Cancel] 🚨 MANUAL CANCELLATION REQUEST RECEIVED');
    console.log('[AI Cancel] Request headers:', JSON.stringify(req.headers));
    console.log('[AI Cancel] Request body:', JSON.stringify(req.body));
    
    const auth = getConfig();
    let cancelledCount = 0;
    
    // Cancel all active sessions for the current user/IP
    for (const [sessionId, sessionData] of activeSessions.entries()) {
      if (!auth || sessionData.ip === auth.ip) {
        console.log(`[AI Cancel] Cancelling session ${sessionId}`);
        sessionData.abortController.abort();
        activeSessions.delete(sessionId);
        cancelledCount++;
      }
    }
    
    // Also cancel any sessions older than 5 minutes (cleanup)
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    for (const [sessionId, sessionData] of activeSessions.entries()) {
      if (sessionData.timestamp < fiveMinutesAgo) {
        console.log(`[AI Cancel] Cleaning up old session ${sessionId}`);
        sessionData.abortController.abort();
        activeSessions.delete(sessionId);
      }
    }
    
    console.log(`[AI Cancel] Cancelled ${cancelledCount} active sessions`);
    
    res.json({ 
      success: true, 
      message: `AI session cancellation completed. Cancelled ${cancelledCount} active sessions.`,
      cancelledSessions: cancelledCount
    });
  } catch (error) {
    console.error('AI Cancel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Session Status Endpoint (for debugging)
app.get('/api/ai/sessions', async (req, res) => {
  try {
    const sessions = Array.from(activeSessions.entries()).map(([id, data]) => ({
      sessionId: id,
      ip: data.ip,
      timestamp: data.timestamp,
      age: Date.now() - data.timestamp
    }));
    
    res.json({
      activeSessions: sessions.length,
      sessions: sessions
    });
  } catch (error) {
    console.error('AI Sessions status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Session Management Endpoints
app.post('/api/session/login', async (req, res) => {
  try {
    const { ip: bodyIp, username: bodyUsername, password: bodyPassword } = req.body || {};
    const hdrIp = req.headers['x-pikvm-ip'];
    const hdrUsername = req.headers['x-pikvm-username'];
    const hdrPassword = req.headers['x-pikvm-password'];
    const ip = hdrIp || bodyIp;
    const username = hdrUsername || bodyUsername;
    const password = hdrPassword || bodyPassword;
    if (!ip) {
      return res.status(400).json({ error: 'IP address is required' });
    }
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Only set runtime config (no file write)
    await session.loginWithCredentials(ip, username, password);
    res.json({ success: true, message: `Successfully logged in to ${ip}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session/logout', async (req, res) => {
  try {
    await session.logout();
    res.json({ success: true, message: 'Successfully logged out' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/session/change-password', async (req, res) => {
  try {
    await session.changePassword();
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/session/status', async (req, res) => {
  try {
    const status = await session.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/session/config', async (req, res) => {
  try {
    const config = await session.loadConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/session/test', async (req, res) => {
  try {
    const ip = req.headers['x-pikvm-ip'];
    const username = req.headers['x-pikvm-username'];
    const password = req.headers['x-pikvm-password'];
    if (ip && username && password) {
      await session.testConnection(ip, username, password);
    } else {
      const config = await session.loadConfig();
      await session.testConnection(config.ip, config.username, config.password);
    }
    res.json({ success: true, message: 'Connection test successful!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  const indexPath = distExists 
    ? path.join(__dirname, 'picua-frontend/dist/index.html')
    : path.join(__dirname, 'picua-frontend/index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Fallback HTML for development
    res.send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>PiCUA - AI Desktop Automation</title>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
          </style>
        </head>
        <body>
          <div id="root">
            <div style="min-height: 100vh; background: #F8F8F8; display: flex; align-items: center; justify-content: center;">
              <div style="text-align: center; padding: 2rem;">
                <h1 style="font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">PiCUA AI Assistant</h1>
                <p style="color: #666; margin-bottom: 2rem;">AI-powered desktop automation</p>
                <p style="color: #999; font-size: 0.875rem;">Please build the React app or run in development mode</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`[PiCUA] Backend server running on http://localhost:${PORT}`);
  console.log(`[PiCUA] Frontend will be available at http://localhost:${PORT}`);
  console.log(`[PiCUA] API endpoints available at http://localhost:${PORT}/api`);
});
