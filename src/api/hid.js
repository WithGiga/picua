// src/api/hid.js
const { getHttpClient } = require('../utils/httpClient');
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Mouse p




async function typeText(text, slow = false) {
  const httpClient = getHttpClient();
  
  if (!slow) {
    // Normal fast typing: send full text at once
    return httpClient.request('/api/hid/print', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      data: text,
    });
  } else {
    // Slow typing: send one char at a time with delay
    for (const char of text) {
      await httpClient.request('/api/hid/print', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        data: char,
      });
      await sleep(150); // 150 ms delay between keystrokes
    }
  }
}

async function keyPress(key) {
  const httpClient = getHttpClient();
  // key down
  await httpClient.post(`/api/hid/events/send_key?key=${key}&state=1`);
  // small delay here recommended to mimic real key press
  await new Promise(r => setTimeout(r, 50));
  // key up
  await httpClient.post(`/api/hid/events/send_key?key=${key}&state=0`);
}
  

async function sendShortcut(keys) {
  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error('sendShortcut requires a non-empty array of keys');
  }

  const httpClient = getHttpClient();
  // Press keys down in order
  for (const key of keys) {
    await httpClient.post(`/api/hid/events/send_key?key=${encodeURIComponent(key)}&state=1`);
  }

  // Release keys in reverse order
  for (const key of [...keys].reverse()) {
    await httpClient.post(`/api/hid/events/send_key?key=${encodeURIComponent(key)}&state=0`);
  }
}

async function moveMouseAbs(x, y) {
  const httpClient = getHttpClient();

  // Fetch current screen resolution
  let resolution;
  try {
    const resResponse = await httpClient.get('/api/streamer');
    if (resResponse.status !== 200) {
      throw new Error(`Failed to fetch resolution with status ${resResponse.status}`);
    }
    const payload = resResponse.data;

    let reso = null;
    // Try multiple common shapes
    if (payload && typeof payload === 'object') {
      reso =
        (payload.result && payload.result.streamer && payload.result.streamer.source && payload.result.streamer.source.resolution) ||
        (payload.streamer && payload.streamer.source && payload.streamer.source.resolution) ||
        (payload.result && payload.result.source && payload.result.source.resolution) ||
        (payload.source && payload.source.resolution) ||
        payload.resolution ||
        null;

      // If resolution is a string like "1920x1080", parse it
      if (typeof reso === 'string') {
        const match = reso.match(/^(\d+)x(\d+)$/i);
        if (match) {
          reso = { width: Number(match[1]), height: Number(match[2]) };
        }
      }

      // If width/height are provided directly without a resolution object
      if (!reso || typeof reso.width !== 'number' || typeof reso.height !== 'number') {
        const widthCandidate =
          (payload.result && payload.result.streamer && payload.result.streamer.source && payload.result.streamer.source.width) ??
          (payload.streamer && payload.streamer.source && payload.streamer.source.width) ??
          (payload.result && payload.result.source && payload.result.source.width) ??
          (payload.source && payload.source.width) ??
          payload.width;
        const heightCandidate =
          (payload.result && payload.result.streamer && payload.result.streamer.source && payload.result.streamer.source.height) ??
          (payload.streamer && payload.streamer.source && payload.streamer.source.height) ??
          (payload.result && payload.result.source && payload.result.source.height) ??
          (payload.source && payload.source.height) ??
          payload.height;
        if (Number.isFinite(widthCandidate) && Number.isFinite(heightCandidate)) {
          reso = { width: Number(widthCandidate), height: Number(heightCandidate) };
        }
      }
    }

    if (!reso || typeof reso.width !== 'number' || typeof reso.height !== 'number') {
      throw new Error('Invalid resolution payload');
    }
    resolution = { width: reso.width, height: reso.height };
  } catch (error) {
    console.warn(`Resolution fetch failed: ${error.message}. Falling back to default 1920x1080.`);
    resolution = { width: 1920, height: 1080 };
  }

  const width = resolution.width;
  const height = resolution.height;

  // Validate and clamp pixel inputs (top-left origin)
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('x and y must be finite numbers');
  }
  const px = Math.max(0, Math.min(Math.round(x), width - 1));
  const py = Math.max(0, Math.min(Math.round(y), height - 1));

  // Convert to normalized [-1, 1] range (center origin)
  const normX = (2 * px / width) - 1;
  const normY = (2 * py / height) - 1;

  // Scale to HID range [-32767, 32767]
  const hidX = Math.round(normX * 32767);
  const hidY = Math.round(normY * 32767);

  // Log for debugging
  console.log(`[PiCUA] Converting pixel (${px}, ${py}) to HID (${hidX}, ${hidY}) on resolution ${width}x${height}`);

  // Send to PiKVM API
  try {
    const params = new URLSearchParams({ to_x: hidX.toString(), to_y: hidY.toString() });
    const moveResponse = await httpClient.post(`/api/hid/events/send_mouse_move?${params.toString()}`);
    if (moveResponse.status !== 200) {
      throw new Error(`API request failed with status ${moveResponse.status}`);
    }
    return {
      success: true,
      pixelX: px,
      pixelY: py,
      hidX: hidX,
      hidY: hidY,
      message: 'Mouse moved successfully'
    };
  } catch (error) {
    throw new Error(`Failed to move mouse: ${error.message}`);
  }
}

async function moveMouseRel(dx, dy) {
  const httpClient = getHttpClient();

  if (typeof dx !== 'number' || typeof dy !== 'number' || !Number.isFinite(dx) || !Number.isFinite(dy)) {
    throw new Error('dx and dy must be finite numbers');
  }

  return httpClient.post(`/api/hid/events/send_mouse_relative?delta_x=${dx}&delta_y=${dy}`);
}




async function clickMouse(button = 'left', isDown = true) {
  const httpClient = getHttpClient();
  // state=true means press, false means release
  const state = isDown ? 'true' : 'false';
  return httpClient.post(`/api/hid/events/send_mouse_button?button=${button}&state=${state}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function singleClick(button = 'left') {
  await clickMouse(button, true);
  await clickMouse(button, false);
}

async function doubleClick(button = 'left') {
  await singleClick(button);
  await delay(150);  // 150ms pause between clicks
  await singleClick(button);
}


async function scrollWheel(dx = 0, dy = 0) {
  const httpClient = getHttpClient();
  return httpClient.post(`/api/hid/events/send_mouse_wheel?delta_x=${dx}&delta_y=${dy}`);
}

async function dragMouse(x1, y1, x2, y2, button = 'left') {
  const httpClient = getHttpClient();
  // Press down
  await httpClient.post(`/api/hid/events/send_mouse_button?button=${button}&state=1`);
  // Move
  await httpClient.post(`/api/hid/events/send_mouse_move?to_x=${x2}&to_y=${y2}`);
  // Release
  await httpClient.post(`/api/hid/events/send_mouse_button?button=${button}&state=0`);
  
}

// Coordinate conversion function (CommonJS export)
function toPiKvmAbs(
  x_s, y_s,
  src_w = 1366, src_h = 768,
  tgt_w = 1920, tgt_h = 1080,
  abs_range = 32767,
  y_positive_down = true
) {
  // --- Step 1: scale to target framebuffer ---
  const x_p = x_s * (tgt_w / src_w);
  const y_p = y_s * (tgt_h / src_h);

  // --- Step 2: center using (W-1)/2, (H-1)/2 ---
  const cx = (tgt_w - 1) / 2;
  const cy = (tgt_h - 1) / 2;

  let ux = (x_p - cx) / cx;
  let uy = (y_p - cy) / cy;

  // numeric guard & edge safety
  ux = Math.max(-1, Math.min(1, ux));
  uy = Math.max(-1, Math.min(1, uy));

  // --- Step 3: map to [-abs_range, abs_range] ---
  let X = Math.round(ux * abs_range);
  let Y = Math.round((y_positive_down ? uy : -uy) * abs_range);

  // clamp to device range
  X = Math.max(-abs_range, Math.min(abs_range, X));
  Y = Math.max(-abs_range, Math.min(abs_range, Y));

  return [X, Y];
}

module.exports = {
  typeText,
  keyPress,
  sendShortcut,
  moveMouseAbs,
  moveMouseRel,
  clickMouse,
  singleClick,
  doubleClick,
  scrollWheel,
  dragMouse,
  toPiKvmAbs,
};
