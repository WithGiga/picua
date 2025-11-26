import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, Mic, ArrowRight, Power, Camera, Activity, Grid2X2, Monitor, Video } from 'lucide-react';
import * as picuaApi from './picuaApi';
import './App.css';
import logo from './assets/logo.png';
import profile from './assets/profile.svg';
import desktopImg from './assets/Desktop.svg';
import logo2 from './assets/logo2.svg';
import Preloader from './components/Preloader';
import SetupWizard from './components/SetupWizard';
import SpeechRecognition from './components/SpeechRecognition';

// Valid key names from PiKVM keymap.csv (web_name column)
// Source: https://github.com/pikvm/kvmd/blob/master/keymap.csv
const validKeys = [
  'AltLeft', 'AltRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp',
  'AudioVolumeDown', 'AudioVolumeMute', 'AudioVolumeUp', 'Backquote', 'Backslash', 'Backspace',
  'BracketLeft', 'BracketRight', 'CapsLock', 'Comma', 'ContextMenu', 'ControlLeft', 'ControlRight',
  'Convert', 'Delete', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9',
  'End', 'Enter', 'Equal', 'Escape', 'F1', 'F10', 'F11', 'F12', 'F2', 'F20', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9',
  'Home', 'Insert', 'IntlBackslash', 'IntlRo', 'IntlYen', 'KanaMode', 'KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE', 'KeyF',
  'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyO', 'KeyP', 'KeyQ', 'KeyR', 'KeyS', 'KeyT',
  'KeyU', 'KeyV', 'KeyW', 'KeyX', 'KeyY', 'KeyZ', 'MetaLeft', 'MetaRight', 'Minus', 'NonConvert', 'NumLock',
  'Numpad0', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad7', 'Numpad8', 'Numpad9',
  'NumpadAdd', 'NumpadDecimal', 'NumpadDivide', 'NumpadEnter', 'NumpadMultiply', 'NumpadSubtract',
  'PageDown', 'PageUp', 'Pause', 'Period', 'Power', 'PrintScreen', 'Quote', 'ScrollLock', 'Semicolon',
  'ShiftLeft', 'ShiftRight', 'Slash', 'Space', 'Tab'
];

function App() {
  const [commandHistory, setCommandHistory] = useState([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [commandIndex, setCommandIndex] = useState(-1);
  const [streamError, setStreamError] = useState(null);
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const outputRef = useRef(null);
  const lastScrollTop = useRef(null);
  const [isPowerOn, setIsPowerOn] = useState(false);

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginIp, setLoginIp] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // AI Chat state
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [currentAIController, setCurrentAIController] = useState(null);

  // Setup wizard state
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(null);

  // Speech recognition state
  const [isSpeechListening, setIsSpeechListening] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingFrames, setRecordingFrames] = useState([]);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [encodingProgress, setEncodingProgress] = useState(0); // 0-100 visual progress
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const recordingStartTime = useRef(null);
  const animationFrameId = useRef(null);
  const ffmpegRef = useRef(null);
  const isRecordingRef = useRef(false);
  const recordingFramesRef = useRef([]);
  const lastFrameTimeRef = useRef(0);

  const commands = {
    login: { description: 'Login to PiKVM', usage: 'login <ip> [username] [password] (default: admin/admin)', category: 'Session' },
    logout: { description: 'Logout and remove saved credentials', usage: 'logout', category: 'Session' },
    'change-password': { description: 'Change the current password', usage: 'change-password', category: 'Session' },
    status: { description: 'Show current connection status', usage: 'status', category: 'Session' },
    config: { description: 'Show current configuration', usage: 'config', category: 'Session' },
    test: { description: 'Test connection to PiKVM', usage: 'test', category: 'Session' },
    power: { description: 'Send ATX power command', usage: 'power [on|off|long|reset] [--wait]', category: 'Power' },
    msd: { description: 'Mass Storage Device commands', usage: 'msd [status|list|upload|upload-url|set-params|connect|disconnect|remove|reset|test]', category: 'MSD' },
    type: { description: 'Type text', usage: 'type <text> [--slow]', category: 'Control' },
    key: { description: 'Press a single key (use "keymap" for valid keys)', usage: 'key <key>', category: 'Control' },
    shortcut: { description: 'Send keyboard shortcut (use "keymap" for valid keys)', usage: 'shortcut <key1,key2,...>', category: 'Control' },
    mouse: { description: 'Move mouse by direction', usage: 'mouse [up|down|left|right]', category: 'Control' },
    'mouse-move': { description: 'Move mouse to absolute position', usage: 'mouse-move <x> <y>', category: 'Control' },
    'mouse-move-rel': { description: 'Move mouse relative position', usage: 'mouse-move-rel <dx> <dy>', category: 'Control' },
    click: { description: 'Click mouse', usage: 'click [single|double] [left|right]', category: 'Control' },
    scroll: { description: 'Scroll mouse wheel', usage: 'scroll [dx] [dy]', category: 'Control' },
    drag: { description: 'Drag mouse from start to end', usage: 'drag <x1> <y1> <x2> <y2> [button]', category: 'Control' },
    snapshot: { description: 'Capture a screenshot', usage: 'snapshot', category: 'Control' },
    keymap: { description: 'Show valid keys for "key" and "shortcut" commands', usage: 'keymap', category: 'Utility' },
    help: { description: 'Show help message', usage: 'help', category: 'Utility' },
    version: { description: 'Show version information', usage: 'version', category: 'Utility' },
    clear: { description: 'Clear output', usage: 'clear', category: 'Utility' },
  };

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    let interval;
    if (isRecording && recordingStartTime.current) {
      interval = setInterval(() => {
        const seconds = Math.max(0, Math.floor((Date.now() - recordingStartTime.current) / 1000));
        setRecordingElapsed(seconds);
      }, 1000);
    } else {
      setRecordingElapsed(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, recordingStartTime.current]);

  const initializeApp = async () => {
    // Check if setup has been completed before
    const setupData = localStorage.getItem('picua_setup');
    if (setupData) {
      try {
        const parsedSetup = JSON.parse(setupData);
        if (parsedSetup.setupCompleted) {
          setIsFirstTimeUser(false);
          setSetupCompleted(true);
          setSavedCredentials({
            pikvmIp: parsedSetup.pikvmIp,
            pikvmUsername: parsedSetup.pikvmUsername,
            pikvmPassword: parsedSetup.pikvmPassword
          });
          
          // Auto-authenticate with saved credentials
          try {
            await picuaApi.login(parsedSetup.pikvmIp, parsedSetup.pikvmUsername, parsedSetup.pikvmPassword);
            addToHistory({ 
              type: 'system', 
              content: `Auto-connected to PiKVM at ${parsedSetup.pikvmIp}`, 
              timestamp: new Date() 
            });
          } catch (error) {
            console.error('Auto-authentication failed:', error);
            addToHistory({ 
              type: 'system', 
              content: 'Auto-connection failed. You may need to login manually.', 
              timestamp: new Date() 
            });
          }
        }
      } catch (error) {
        console.error('Failed to parse setup data:', error);
        localStorage.removeItem('picua_setup');
      }
    }

    // Load environment config and check connection status
    await loadEnvironmentConfig();
    await checkConnectionStatus();
    
    // Only show welcome messages if setup is completed
    if (!isFirstTimeUser) {
      addToHistory({ type: 'system', content: 'Welcome back to PiCUA AI Assistant v1.0.0 - AI-powered desktop automation', timestamp: new Date() });
      addToHistory({ type: 'system', content: 'Ready for AI desktop automation commands', timestamp: new Date() });
    }
  };

  const loadEnvironmentConfig = async () => {
    try {
      const config = await picuaApi.getEnvironmentConfig();
      if (config.anthropicApiKey) {
        setAnthropicApiKey(config.anthropicApiKey);
      }
    } catch (error) {
      console.log('Could not load environment config:', error.message);
    }
  };

  useEffect(() => {
    if (outputRef.current) {
      requestAnimationFrame(() => {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      });
    }
  }, [commandHistory]);

  const handleScroll = () => {
    if (outputRef.current) {
      lastScrollTop.current = outputRef.current.scrollTop;
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const status = await picuaApi.getSessionStatus();
      setConnectionStatus(status.connected ? 'connected' : 'disconnected');
      setSessionInfo(status);
      addToHistory({
        type: 'system',
        content: status.connected
          ? `Connected to PiKVM at ${status.ip}`
          : 'Not connected to PiKVM. Try "login" to connect.',
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Connection status check failed:', error);
      setConnectionStatus('disconnected');
      setSessionInfo(null);
      addToHistory({
        type: 'error',
        content: `Failed to check connection: ${error.message || 'Unknown error'}`,
        timestamp: new Date(),
      });
    }
  };

  const addToHistory = (entry) => {
    const uniqueId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setCommandHistory(prev => [...prev, { ...entry, id: uniqueId }]);
  };

  // Speech recognition handlers
  const handleSpeechResult = async (transcript) => {
    if (transcript.trim()) {
      // Set the command and trigger submit
      setCurrentCommand(transcript);
      
      // Auto-submit the speech command using the same flow as handleSubmit
      setTimeout(async () => {
        if (!isProcessing) {
          const input = transcript.trim();
          setCurrentCommand('');
          setCommandIndex(-1);
          
          // Add user message to history with speech indicator
          addToHistory({
            type: 'user',
            content: `🎤 ${input}`,
            timestamp: new Date()
          });
          
          // Process the command using the same logic as handleSubmit
          await handleSubmitLogic(input);
        }
      }, 100); // Small delay to ensure state updates
    }
  };

  const handleSpeechStart = () => {
    setIsSpeechListening(true);
  };

  const handleSpeechEnd = () => {
    setIsSpeechListening(false);
  };

  const handleSetupComplete = async (setupData) => {
    // Save setup data to localStorage
    localStorage.setItem('picua_setup', JSON.stringify(setupData));
    
    // Update state
    setIsFirstTimeUser(false);
    setSetupCompleted(true);
    setSavedCredentials({
      pikvmIp: setupData.pikvmIp,
      pikvmUsername: setupData.pikvmUsername,
      pikvmPassword: setupData.pikvmPassword
    });

    // Add welcome messages
    addToHistory({ 
      type: 'system', 
      content: 'Welcome to PiCUA AI Assistant v1.0.0 - AI-powered desktop automation', 
      timestamp: new Date() 
    });
    addToHistory({ 
      type: 'system', 
      content: 'Setup completed successfully! You can now use AI commands to control your desktop.', 
      timestamp: new Date() 
    });

    // Check connection status
    await checkConnectionStatus();
  };

  const cancelAISession = async () => {
    if (currentAIController) {
      console.log('Cancelling AI session...');
      currentAIController.abort();
      setCurrentAIController(null);
      setIsProcessing(false);
      
      // Add cancellation message to history
      addToHistory({
        type: 'system',
        content: 'AI session cancelled by user',
        timestamp: new Date()
      });

      // Try to cancel on backend as well
      try {
        await picuaApi.cancelAISession();
      } catch (error) {
        console.error('Failed to cancel AI session on backend:', error);
      }
    }
  };

  // Recording functions
  const toggleRecording = async () => {
    if (!isRecording) {
      await startRecording();
    } else {
      await stopRecording();
    }
  };

  const startRecording = async () => {
    try {
      // Load FFmpeg if not already loaded
      if (!ffmpegLoaded && !ffmpegLoading) {
        setFfmpegLoading(true);
        setRecordingStatus('Loading FFmpeg library...');

        // Detailed debugging information
        console.log('[FFmpeg Debug] Starting FFmpeg load process...');
        console.log('[FFmpeg Debug] window.FFmpeg available:', !!window.FFmpeg);
        console.log('[FFmpeg Debug] window.ffmpegLoadError:', window.ffmpegLoadError);
        console.log('[FFmpeg Debug] User Agent:', navigator.userAgent);
        console.log('[FFmpeg Debug] WebAssembly support:', typeof WebAssembly !== 'undefined');
        
        // Check for load error first
        if (window.ffmpegLoadError) {
          const errorMsg = `FFmpeg failed to load from local server (${window.ffmpegLoadError.src}). Possible causes:\n` +
            '1. Server not serving files from /lib/ correctly\n' +
            '2. FFmpeg files missing from public/ directory\n' +
            '3. Browser cache issues\n\n' +
            'Solutions:\n' +
            '- Run download-ffmpeg.sh to download FFmpeg files\n' +
            '- Restart the backend server (npm start)\n' +
            '- Hard refresh browser (Ctrl+Shift+R)\n' +
            '- Check browser Network tab (F12) for 404 errors';
          
          console.error('[FFmpeg Error] Load error detected:', window.ffmpegLoadError);
          
          await fetch('/api/debug/log-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: 'FFmpeg local load error detected',
              context: 'startRecording - ffmpegLoadError present',
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              debug: window.ffmpegLoadError
            })
          }).catch(() => {});
          
          throw new Error(errorMsg);
        }
        
        // Check if script tag exists
        const ffmpegScripts = Array.from(document.getElementsByTagName('script'))
          .filter(s => s.src && s.src.includes('ffmpeg'));
        console.log('[FFmpeg Debug] FFmpeg script tags found:', ffmpegScripts.length);
        ffmpegScripts.forEach(s => {
          console.log('[FFmpeg Debug] Script src:', s.src);
          console.log('[FFmpeg Debug] Script loaded:', s.src && !s.src.includes('main.jsx'));
        });

        // Wait for the script to be available (increased to 10 seconds)
        let retries = 0;
        const maxRetries = 100; // 10 seconds
        while (!window.FFmpeg && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
          if (retries % 10 === 0) {
            console.log(`[FFmpeg Debug] Still waiting for FFmpeg... (attempt ${retries}/${maxRetries})`);
            setRecordingStatus(`Loading FFmpeg... (${Math.round(retries/10)}s)`);
          }
        }

        if (!window.FFmpeg) {
          // Log detailed error to server
          const errorDetails = {
            error: 'FFmpeg library failed to load from local server after 10 seconds',
            context: 'startRecording - FFmpeg script not available after timeout',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            debug: {
              retriesAttempted: retries,
              maxRetries: maxRetries,
              webAssemblySupport: typeof WebAssembly !== 'undefined',
              scriptsFound: ffmpegScripts.length,
              windowFFmpegType: typeof window.FFmpeg,
              windowFFmpegWASMType: typeof window.FFmpegWASM,
              loadErrorPresent: !!window.ffmpegLoadError,
              pageFullyLoaded: document.readyState === 'complete'
            }
          };
          
          console.error('[FFmpeg Error]', errorDetails);
          
          // Send error to server for logging
          try {
            await fetch('/api/debug/log-error', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(errorDetails)
            });
          } catch (logError) {
            console.error('[FFmpeg Error] Failed to log error to server:', logError);
          }
          
          throw new Error(
            'FFmpeg library timeout (10s). The script loaded but window.FFmpeg not available.\n\n' +
            'Debug steps:\n' +
            '1. Check browser console for [FFmpeg Loader] messages\n' +
            '2. Open DevTools (F12) → Network tab → Look for /lib/ffmpeg.min.js\n' +
            '3. Verify file loaded: http://localhost:3000/lib/ffmpeg.min.js\n' +
            '4. Hard refresh (Ctrl+Shift+R) to clear cache\n' +
            '5. Check server logs for [FFmpeg Local] messages'
          );
        }

        console.log('[FFmpeg Debug] window.FFmpeg found, creating instance...');
        console.log('[FFmpeg Debug] FFmpeg object:', window.FFmpeg);
        console.log('[FFmpeg Debug] FFmpeg object structure:', Object.keys(window.FFmpeg));
        console.log('[FFmpeg Debug] createFFmpeg type:', typeof window.FFmpeg.createFFmpeg);
        console.log('[FFmpeg Debug] global createFFmpeg:', typeof window.createFFmpeg);
        
        // Version 0.11.x uses createFFmpeg() factory function
        // Try to get it from different sources
        const createFFmpeg = window.FFmpeg.createFFmpeg || window.createFFmpeg;
        const fetchFile = window.FFmpeg.fetchFile || window.fetchFile;
        
        if (!createFFmpeg) {
          const availableKeys = window.FFmpeg ? Object.keys(window.FFmpeg).join(', ') : 'none';
          const globalFuncs = [];
          if (window.createFFmpeg) globalFuncs.push('createFFmpeg');
          if (window.fetchFile) globalFuncs.push('fetchFile');
          
          throw new Error(
            `createFFmpeg function not found.\n` +
            `Available in window.FFmpeg: ${availableKeys}\n` +
            `Available globally: ${globalFuncs.join(', ') || 'none'}\n` +
            `Try hard refreshing (Ctrl+Shift+R) or check browser console for [FFmpeg Loader] messages.`
          );
        }
        
        // Get the base URL (works in both dev and production)
        const baseUrl = window.location.origin; // e.g., http://localhost:5173
        
        // Add cache-busting timestamp to force fresh load
        const cacheBuster = `?v=${Date.now()}`;
        
        const ffmpeg = createFFmpeg({
          log: true,
          corePath: `${baseUrl}/lib/ffmpeg-core.js${cacheBuster}`,
        });
        
        console.log('[FFmpeg Debug] Using corePath:', `${baseUrl}/lib/ffmpeg-core.js`);
        console.log('[FFmpeg Debug] Using workerPath:', `${baseUrl}/lib/ffmpeg-core.worker.js`);
        console.log('[FFmpeg Debug] Using wasmPath:', `${baseUrl}/lib/ffmpeg-core.wasm`);
        
        console.log('[FFmpeg Debug] FFmpeg instance created:', ffmpeg);
        
        console.log('[FFmpeg Debug] Loading FFmpeg core from /lib/ffmpeg-core.js...');
        
        // Load FFmpeg core
        await ffmpeg.load();
        
        console.log('[FFmpeg Debug] FFmpeg core loaded successfully');
        
        ffmpegRef.current = ffmpeg;
        setFfmpegLoaded(true);
        setFfmpegLoading(false);
      }

      // Wait if FFmpeg is currently loading
      if (ffmpegLoading) {
        addToHistory({ 
          type: 'system', 
          content: '⏳ Please wait, FFmpeg is still loading...', 
          timestamp: new Date() 
        });
        return;
      }

      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingFrames([]);
      recordingFramesRef.current = [];
      recordingStartTime.current = Date.now();
      lastFrameTimeRef.current = performance.now();
      setRecordingStatus('Recording... (collecting frames)');
      setEncodingProgress(0);

      // Start capturing frames from the stream
      captureFrames();
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Log error to server
      try {
        await fetch('/api/debug/log-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: error.message,
            stack: error.stack,
            context: 'startRecording - catch block',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          })
        });
      } catch (logError) {
        console.error('[FFmpeg Error] Failed to log error to server:', logError);
      }
      
      addToHistory({ 
        type: 'error', 
        content: `❌ ${error.message}`, 
        timestamp: new Date() 
      });
      setIsRecording(false);
      setRecordingStatus('');
      setFfmpegLoading(false);
    }
  };

  const captureFrames = (currentTime) => {
    if (!isRecordingRef.current) return;

    // Throttle to 30 FPS (capture every ~33ms)
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;
    const elapsed = currentTime - lastFrameTimeRef.current;

    if (elapsed < frameInterval) {
      animationFrameId.current = requestAnimationFrame(captureFrames);
      return;
    }

    lastFrameTimeRef.current = currentTime - (elapsed % frameInterval);

    // Get the stream image element
    const imgElement = document.querySelector('img[alt="PiKVM Live Stream"]');
    if (!imgElement || !imgElement.complete) {
      animationFrameId.current = requestAnimationFrame(captureFrames);
      return;
    }

    // Create canvas if not exists
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = imgElement.naturalWidth || 1920;
      canvasRef.current.height = imgElement.naturalHeight || 1080;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw current frame to canvas
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
    
    // Convert to JPEG data URL with high quality
    let frameData;
    try {
      frameData = canvas.toDataURL('image/jpeg', 0.95);
    } catch (error) {
      console.error('[FFmpeg Capture] Failed to capture frame:', error);
      animationFrameId.current = requestAnimationFrame(captureFrames);
      return;
    }
    
    // Add frame to collection
    recordingFramesRef.current.push(frameData);
    setRecordingFrames(prev => [...prev, frameData]);

    // Continue capturing
    animationFrameId.current = requestAnimationFrame(captureFrames);
  };

  const stopRecording = async () => {
    try {
      isRecordingRef.current = false;
      setIsRecording(false);
      
      // Stop capturing frames
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }

      setRecordingStatus('Encoding video...');
      setEncodingProgress(10); // initial step after capture
      
      addToHistory({ 
        type: 'system', 
        content: 'Encoding video...', 
        timestamp: new Date() 
      });

      const ffmpeg = ffmpegRef.current;
      const frames = recordingFramesRef.current;

      if (!ffmpeg) {
        addToHistory({ 
          type: 'error', 
          content: 'FFmpeg instance not found. Please try recording again.', 
          timestamp: new Date() 
        });
        setRecordingStatus('');
        setRecordingFrames([]);
        return;
      }

      if (frames.length === 0) {
        addToHistory({ 
          type: 'error', 
          content: 'No frames captured', 
          timestamp: new Date() 
        });
        setRecordingStatus('');
        return;
      }

      // Write frames to FFmpeg filesystem
      console.log(`[FFmpeg Encode] Writing ${frames.length} frames to filesystem...`);
      for (let i = 0; i < frames.length; i++) {
        const frameName = `frame_${i.toString().padStart(6, '0')}.jpg`;
        const response = await fetch(frames[i]);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        ffmpeg.FS('writeFile', frameName, new Uint8Array(arrayBuffer));
        
        if (i % 30 === 0) {
          const prepPercent = Math.round((i / frames.length) * 60); // map 0-60% to prep
          console.log(`[FFmpeg Encode] Written ${i + 1}/${frames.length} frames`);
          setRecordingStatus(`Preparing frames... (${Math.round((i / frames.length) * 100)}%)`);
          setEncodingProgress(Math.min(60, prepPercent));
        }
      }

      const duration = (Date.now() - recordingStartTime.current) / 1000;
      const actualFPS = Math.round(frames.length / duration);
      const targetFPS = Math.min(actualFPS, 30); // Cap at 30 FPS

      console.log(`[FFmpeg Encode] Recording stats: ${frames.length} frames over ${duration.toFixed(2)}s = ${actualFPS} FPS`);
      console.log(`[FFmpeg Encode] Encoding at ${targetFPS} FPS for accurate playback`);
      console.log('[FFmpeg Encode] Starting video encoding...');
      setRecordingStatus('Encoding video (this may take time)...');
      setEncodingProgress(prev => (prev < 70 ? 70 : prev));
      
      // Encode video with calculated FPS for accurate playback
      await ffmpeg.run(
        '-framerate', targetFPS.toString(),
        '-i', 'frame_%06d.jpg',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-vf', 'format=yuv420p',
        '-movflags', '+faststart',
        'output.mp4'
      );

      console.log('[FFmpeg Encode] Video encoded, reading output file...');
      setEncodingProgress(prev => (prev < 90 ? 90 : prev));
      
      // Read the output file
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      
      // Download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = `pikvm-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
      a.click();

      console.log('[FFmpeg Encode] Cleaning up temporary files...');
      
      // Cleanup
      ffmpeg.FS('unlink', 'output.mp4');
      for (let i = 0; i < frames.length; i++) {
        try {
          ffmpeg.FS('unlink', `frame_${i.toString().padStart(6, '0')}.jpg`);
        } catch (e) {
          // Ignore errors
        }
      }

      const fileSizeMB = Math.round(blob.size / 1024 / 1024);
      setRecordingStatus('');
      setRecordingFrames([]);
      recordingFramesRef.current = [];
      setEncodingProgress(100);
      
      addToHistory({ 
        type: 'system', 
        content: `✅ Recording saved! (${fileSizeMB} MB, ${frames.length} frames, ${duration.toFixed(1)}s)`, 
        timestamp: new Date() 
      });
    } catch (error) {
      console.error('Error encoding video:', error);
      addToHistory({ 
        type: 'error', 
        content: `Failed to encode video: ${error.message}`, 
        timestamp: new Date() 
      });
      setRecordingStatus('');
      setRecordingFrames([]);
    }
  };

  const executeCommand = async (cmd) => {
    if (!cmd.trim()) return;

    const args = cmd.trim().split(' ');
    const command = args[0].toLowerCase();
    const commandArgs = args.slice(1);

    addToHistory({ type: 'command', content: cmd, timestamp: new Date() });

    if (!commands[command]) {
      addToHistory({
        type: 'error',
        content: `Unknown command: ${command}. Try "help" for available commands.`,
        timestamp: new Date(),
      });
      return;
    }

    setIsProcessing(true);

    try {
      let result = '';

      switch (command) {
        case 'help':
          result = formatHelp();
          break;
        case 'version':
          result = 'PiCUA Web CLI v1.0.0 - PiKVM Control Utility';
          break;
        case 'clear':
          setCommandHistory([]);
          setIsProcessing(false);
          return;
        case 'keymap':
          result = formatKeymap();
          break;
        case 'login':
          result = await handleLogin(commandArgs);
          break;
        case 'logout':
          result = await handleLogout();
          break;
        case 'status':
          result = await handleStatus();
          break;
        case 'config':
          result = await handleConfig();
          break;
        case 'test':
          result = await handleTest();
          break;
        case 'power':
          result = await handlePower(commandArgs);
          break;
        case 'msd':
          result = await handleMsd(commandArgs);
          break;
        case 'type':
          result = await handleType(commandArgs);
          break;
        case 'key':
          result = await handleKey(commandArgs);
          break;
        case 'shortcut':
          result = await handleShortcut(commandArgs);
          break;
        case 'mouse':
          result = await handleMouse(commandArgs);
          break;
        case 'mouse-move':
          result = await handleMouseMove(commandArgs);
          break;
        case 'mouse-move-rel':
          result = await handleMouseMoveRel(commandArgs);
          break;
        case 'click':
          result = await handleClick(commandArgs);
          break;
        case 'scroll':
          result = await handleScrollCommand(commandArgs);
          break;
        case 'drag':
          result = await handleDrag(commandArgs);
          break;
        case 'snapshot':
          result = await handleSnapshot();
          break;
        default:
          result = `Command ${command} not yet implemented`;
      }

      addToHistory({
        type: 'output',
        content: result || 'Command executed successfully',
        timestamp: new Date(),
      });

      if (['login', 'logout', 'test'].includes(command)) {
        await checkConnectionStatus();
      }
    } catch (error) {
      console.error(`Command "${command}" failed:`, error);
      addToHistory({
        type: 'error',
        content: error.message || 'An unexpected error occurred',
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatHelp = () => {
    const categories = {};
    Object.entries(commands).forEach(([cmd, info]) => {
      if (!categories[info.category]) {
        categories[info.category] = [];
      }
      categories[info.category].push({ cmd, ...info });
    });

    let help = 'Available Commands:\n\n';

    Object.entries(categories).forEach(([category, cmds]) => {
      help += `${category}:\n`;
      cmds.forEach(({ cmd, description, usage }) => {
        help += `  ${cmd.padEnd(20)} ${description}\n`;
        help += `    Usage: ${usage}\n\n`;
      });
    });

    help += 'Speech Recognition:\n';
    help += '  • Click the microphone button or press Ctrl/Cmd+M to start voice input\n';
    help += '  • Speak your command naturally (e.g., "open Chrome", "type hello world")\n';
    help += '  • Speech recognition works in Chrome, Edge, and Safari\n\n';

    help += 'Examples:\n';
    help += '  login 192.168.1.7\n';
    help += '  login 192.168.1.7 admin password123\n';
    help += '  power on\n';
    help += '  type "Hello World"\n';
    help += '  mouse up\n';
    help += '  key Enter\n';
    help += '  shortcut ControlLeft,F4\n';
    help += '  keymap\n';

    return help;
  };

  const formatKeymap = () => {
    const categories = {
      Alphanumeric: [],
      Symbols: [],
      Modifiers: [],
      Function: [],
      Navigation: [],
      Special: [],
      Numpad: [],
      Media: [],
    };

    validKeys.forEach(key => {
      if (/^Key[A-Z]$|^Digit[0-9]$/.test(key)) {
        categories.Alphanumeric.push(key);
      } else if (['Minus', 'Equal', 'Comma', 'Period', 'Slash', 'Semicolon', 'Quote', 'Backquote', 'BracketLeft', 'BracketRight', 'Backslash', 'IntlBackslash', 'IntlYen', 'IntlRo'].includes(key)) {
        categories.Symbols.push(key);
      } else if (key.includes('Control') || key.includes('Shift') || key.includes('Alt') || key.includes('Meta') || key.includes('CapsLock') || key.includes('NumLock')) {
        categories.Modifiers.push(key);
      } else if (/^F[1-9][0-2]?$/.test(key)) {
        categories.Function.push(key);
      } else if (key.includes('Arrow') || ['Home', 'End', 'PageUp', 'PageDown', 'Insert', 'Delete'].includes(key)) {
        categories.Navigation.push(key);
      } else if (['NumpadDivide', 'NumpadMultiply', 'NumpadSubtract', 'NumpadAdd', 'NumpadEnter', 'NumpadDecimal', /^Numpad[0-9]$/.test(key)].some(c => c)) {
        categories.Numpad.push(key);
      } else if (key.includes('AudioVolume') || key === 'Power') {
        categories.Media.push(key);
      } else {
        categories.Special.push(key);
      }
    });

    let output = 'Valid Keys for "key" and "shortcut" Commands:\n\n';
    Object.entries(categories).forEach(([category, keys]) => {
      if (keys.length > 0) {
        output += `${category}:\n`;
        output += keys.sort().map(key => `  ${key}`).join('\n') + '\n\n';
      }
    });
    output += 'Usage:\n';
    output += '  key Enter\n';
    output += '  shortcut ControlLeft,KeyC\n';
    output += 'Note: Keys are case-sensitive. Use commas to separate keys in shortcuts.';

    return output;
  };

  const handleLogin = async (args) => {
    const ip = args[0];
    let username = args[1];
    let password = args[2];
    if (!ip) {
      return 'Error: IP address required. Usage: login <ip> [username] [password]';
    }
    
    // If only IP provided, use default credentials
    if (!username && !password) {
      username = 'admin';
      password = 'admin';
    }
    
    if (!username || !password) {
      // Open modal to collect missing credentials (password masked)
      setLoginIp(ip);
      setLoginUsername(username || '');
      setLoginPassword('');
      setLoginError('');
      setShowLoginModal(true);
      return 'Enter username and password in the login dialog.';
    }

    try {
      await picuaApi.login(ip, username, password);
      return `Successfully logged in to ${ip} as ${username}`;
    } catch (error) {
      throw new Error(`Login failed: ${error.message || 'Unable to connect to PiKVM'}`);
    }
  };

  const handleLogout = async () => {
    try {
      await picuaApi.logout();
      
      // Clear setup data and reset to onboarding
      localStorage.removeItem('picua_setup');
      setIsFirstTimeUser(true);
      setSetupCompleted(false);
      setSavedCredentials(null);
      setConnectionStatus('disconnected');
      setSessionInfo(null);
      setCommandHistory([]);
      
      return 'Successfully logged out';
    } catch (error) {
      // Even if API logout fails, clear local data
      localStorage.removeItem('picua_setup');
      setIsFirstTimeUser(true);
      setSetupCompleted(false);
      setSavedCredentials(null);
      setConnectionStatus('disconnected');
      setSessionInfo(null);
      setCommandHistory([]);
      
      throw new Error(`Logout failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStatus = async () => {
    try {
      const status = await picuaApi.getSessionStatus();
      if (status.connected) {
        return `Status: Connected\nPiKVM IP: ${status.ip}\nUsername: ${status.username}\nMessage: ${status.message || 'N/A'}`;
      } else {
        return `Status: Not connected\nIssue: ${status.message || 'No connection established'}`;
      }
    } catch (error) {
      throw new Error(`Failed to get status: ${error.message || 'Unknown error'}`);
    }
  };

  const handleConfig = async () => {
    try {
      const config = await picuaApi.getSessionConfig();
      return `Configuration:\nPiKVM IP: ${config.ip || 'N/A'}\nUsername: ${config.username || 'N/A'}`;
    } catch (error) {
      throw new Error(`Failed to get config: ${error.message || 'Unknown error'}`);
    }
  };

  const handleTest = async () => {
    try {
      await picuaApi.testConnection();
      return 'Connection test successful!';
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handlePower = async (args) => {
    const action = args[0] || 'on';
    const wait = args.includes('--wait');

    const validActions = ['on', 'off', 'long', 'reset'];
    if (!validActions.includes(action)) {
      return `Invalid power action '${action}'. Valid options: ${validActions.join(', ')}`;
    }

    try {
      await picuaApi.sendAtxPower(action, wait);
      return `Power command '${action}' sent successfully${wait ? ' (waiting for completion)' : ''}`;
    } catch (error) {
      throw new Error(`Power command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMsd = async (args) => {
    const subcmd = args[0];
    if (!subcmd) {
      return 'MSD Commands:\n  status, list, upload, upload-url, set-params, connect, disconnect, remove, reset, test';
    }

    try {
      switch (subcmd) {
        case 'status':
          const status = await picuaApi.getMsdStatus();
          return `MSD Status:\n${JSON.stringify(status, null, 2) || 'No status available'}`;
        case 'list':
          const msdStatus = await picuaApi.getMsdStatus();
          if (msdStatus?.storage?.images) {
            const images = Object.keys(msdStatus.storage.images);
            if (images.length === 0) {
              return 'No images available';
            }
            return `Available images:\n${images.map(name => `- ${name}`).join('\n')}`;
          }
          return 'No storage information available';
        case 'upload':
          const localPath = args[1];
          const imageName = args[2];
          if (!localPath) {
            return 'Error: Local path required. Usage: msd upload <localPath> [imageName]';
          }
          await picuaApi.uploadMsdImage(localPath, imageName);
          return `Image ${imageName || localPath} uploaded successfully`;
        case 'upload-url':
          const url = args[1];
          const uploadImageName = args[2];
          if (!url) {
            return 'Error: URL required. Usage: msd upload-url <url> [imageName]';
          }
          await picuaApi.uploadMsdImageFromUrl(url, uploadImageName);
          return `Image ${uploadImageName || url} uploaded successfully from URL`;
        case 'set-params':
          const params = args.slice(1).reduce((acc, arg) => {
            const [key, value] = arg.split('=');
            if (key && value) acc[key.replace('--', '')] = value;
            return acc;
          }, {});
          if (Object.keys(params).length === 0) {
            return 'Error: Parameters required. Usage: msd set-params --key=value';
          }
          await picuaApi.setMsdParams(params);
          return `MSD parameters set:\n${JSON.stringify(params, null, 2)}`;
        case 'connect':
          await picuaApi.connectMsd();
          return 'MSD connected successfully';
        case 'disconnect':
          await picuaApi.disconnectMsd();
          return 'MSD disconnected successfully';
        case 'remove':
          const imageToRemove = args[1];
          if (!imageToRemove) {
            return 'Error: Image name required. Usage: msd remove <imageName>';
          }
          await picuaApi.removeMsdImage(imageToRemove);
          return `Image ${imageToRemove} removed successfully`;
        case 'reset':
          await picuaApi.resetMsd();
          return 'MSD reset successfully';
        case 'test':
          await picuaApi.testMsdConnection();
          return 'MSD API test completed successfully';
        default:
          return `Unknown MSD subcommand: ${subcmd}\nAvailable: status, list, upload, upload-url, set-params, connect, disconnect, remove, reset, test`;
      }
    } catch (error) {
      throw new Error(`MSD error: ${error.message || 'Unknown error'}`);
    }
  };

  const handleType = async (args) => {
    const text = args.filter(arg => !arg.startsWith('--')).join(' ');
    const slow = args.includes('--slow');

    if (!text) {
      return 'Error: No text provided to type. Usage: type <text> [--slow]';
    }

    try {
      await picuaApi.typeText(text, slow);
      return `Typed text${slow ? ' (slow mode)' : ''}: "${text}"`;
    } catch (error) {
      throw new Error(`Type command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleKey = async (args) => {
    const key = args[0];
    if (!key) {
      return 'Error: No key provided. Usage: key <key>\nExample: key Enter\nUse "keymap" to see valid keys.';
    }

    if (!validKeys.includes(key)) {
      return `Invalid key '${key}'. Use "keymap" to see valid keys.`;
    }

    try {
      await picuaApi.keyPress(key);
      return `Key pressed: ${key}`;
    } catch (error) {
      console.error(`Key press failed for '${key}':`, error);
      return `Failed to press key '${key}'. Ensure PiKVM connection and try "keymap" for valid keys.`;
    }
  };

  const handleShortcut = async (args) => {
    const keysString = args.join(' ');
    if (!keysString) {
      return 'Error: No keys provided for shortcut. Usage: shortcut <key1,key2,...>\nExample: shortcut ControlLeft,KeyC\nUse "keymap" to see valid keys.';
    }

    const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keys.length === 0) {
      return 'Error: No valid keys provided. Usage: shortcut <key1,key2,...>\nExample: shortcut ControlLeft,KeyC\nUse "keymap" to see valid keys.';
    }

    for (const key of keys) {
      if (!validKeys.includes(key)) {
        return `Invalid key '${key}' in shortcut. Use "keymap" to see valid keys.`;
      }
    }

    try {
      await picuaApi.sendShortcut(keys);
      return `Shortcut sent: ${keys.join(', ')}`;
    } catch (error) {
      console.error(`Shortcut failed for '${keys.join(', ')}':`, error);
      return `Failed to send shortcut '${keys.join(', ')}'. Ensure PiKVM connection and try "keymap" for valid keys.`;
    }
  };

  const handleMouse = async (args) => {
    const direction = args[0];
    if (!direction) {
      return 'Error: Direction required. Usage: mouse [up|down|left|right]';
    }

    const validDirections = ['up', 'down', 'left', 'right'];
    if (!validDirections.includes(direction)) {
      return `Error: Invalid direction '${direction}'. Valid options: ${validDirections.join(', ')}`;
    }

    try {
      let dx = 0, dy = 0;
      switch (direction) {
        case 'up': dy = -50; break;
        case 'down': dy = 50; break;
        case 'left': dx = -50; break;
        case 'right': dx = 50; break;
      }

      await picuaApi.mouseMoveRelative(dx, dy);
      return `Mouse moved ${direction} by 50 pixels`;
    } catch (error) {
      throw new Error(`Mouse command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMouseMove = async (args) => {
    const x = parseInt(args[0]);
    const y = parseInt(args[1]);

    if (isNaN(x) || isNaN(y)) {
      return 'Error: Invalid coordinates. Usage: mouse-move <x> <y>';
    }

    try {
      await picuaApi.moveMouseAbs(x, y);
      return `Mouse moved to (${x}, ${y})`;
    } catch (error) {
      throw new Error(`Mouse move command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMouseMoveRel = async (args) => {
    const dx = parseInt(args[0]);
    const dy = parseInt(args[1]);

    if (isNaN(dx) || isNaN(dy)) {
      return 'Error: Invalid coordinates. Usage: mouse-move-rel <dx> <dy>';
    }

    try {
      await picuaApi.mouseMoveRelative(dx, dy);
      return `Mouse moved relatively by (${dx}, ${dy})`;
    } catch (error) {
      throw new Error(`Mouse move relative command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleClick = async (args) => {
    let clickType = 'single';
    let button = 'left';

    if (args[0]) {
      if (['single', 'double'].includes(args[0])) {
        clickType = args[0];
        button = args[1] || 'left';
      } else if (['left', 'right'].includes(args[0])) {
        button = args[0];
        clickType = args[1] || 'single';
      }
    }

    try {
      if (clickType === 'double') {
        await picuaApi.doubleClick(button);
        return `Double click with '${button}' button`;
      } else {
        await picuaApi.clickMouse(button, clickType);
        return `Single click with '${button}' button`;
      }
    } catch (error) {
      throw new Error(`Click command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleScrollCommand = async (args) => {
    const dx = parseInt(args[0]) || 0;
    const dy = parseInt(args[1]) || 0;

    try {
      await picuaApi.scrollMouse(dx, dy);
      return `Mouse scrolled by dx=${dx}, dy=${dy}`;
    } catch (error) {
      throw new Error(`Scroll command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDrag = async (args) => {
    const x1 = parseInt(args[0]);
    const y1 = parseInt(args[1]);
    const x2 = parseInt(args[2]);
    const y2 = parseInt(args[3]);
    const button = args[4] || 'left';

    if ([x1, y1, x2, y2].some(v => isNaN(v))) {
      return 'Error: Invalid coordinates. Usage: drag <x1> <y1> <x2> <y2> [button]';
    }

    try {
      await picuaApi.dragMouse(x1, y1, x2, y2, button);
      return `Mouse dragged from (${x1},${y1}) to (${x2},${y2}) with button ${button}`;
    } catch (error) {
      throw new Error(`Drag command failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSnapshot = async () => {
    try {
      const blob = await picuaApi.getSnapshot();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `screen-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return 'Snapshot captured and downloaded successfully';
    } catch (error) {
      throw new Error(`Snapshot command failed: ${error.message || 'Unknown error'}`);
    }
  };

  // Extract the main submit logic to be reused by speech recognition
  const handleSubmitLogic = async (input) => {
    if (!input.trim() || isProcessing) return;
    
    // Check if user is trying to login
    if (input.toLowerCase() === 'login') {
      // If we have saved credentials and are not connected, try auto-login first
      if (savedCredentials && connectionStatus !== 'connected') {
        try {
          await picuaApi.login(savedCredentials.pikvmIp, savedCredentials.pikvmUsername, savedCredentials.pikvmPassword);
          addToHistory({
            type: 'system',
            content: `Reconnected to PiKVM at ${savedCredentials.pikvmIp}`,
            timestamp: new Date()
          });
          await checkConnectionStatus();
        } catch (error) {
          addToHistory({
            type: 'error',
            content: `Auto-reconnection failed: ${error.message}. Please check your PiKVM connection.`,
            timestamp: new Date()
          });
        }
      } else {
        setShowLoginModal(true);
      }
      setCurrentCommand('');
      return;
    }

    // Check if user is logged in before allowing AI access
    if (connectionStatus !== 'connected') {
      if (savedCredentials) {
        addToHistory({
          type: 'system',
          content: 'Connection lost. Trying to reconnect automatically...',
          timestamp: new Date()
        });
        try {
          await picuaApi.login(savedCredentials.pikvmIp, savedCredentials.pikvmUsername, savedCredentials.pikvmPassword);
          addToHistory({
            type: 'system',
            content: `Reconnected to PiKVM at ${savedCredentials.pikvmIp}`,
            timestamp: new Date()
          });
          await checkConnectionStatus();
        } catch (error) {
          addToHistory({
            type: 'error',
            content: `Auto-reconnection failed: ${error.message}. Please type "login" to reconnect manually.`,
            timestamp: new Date()
          });
          setCurrentCommand('');
          return;
        }
      } else {
        addToHistory({
          type: 'system',
          content: 'Please login first using the "login" command to access PiCUA AI features.',
          timestamp: new Date()
        });
        setCurrentCommand('');
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Create AbortController for this AI session
      const controller = new AbortController();
      
      // Add debugging to track when abort is called
      const originalAbort = controller.abort.bind(controller);
      controller.abort = (reason) => {
        console.log('🚨 Frontend AbortController.abort() called');
        console.log('Abort reason:', reason || 'No reason provided');
        console.log('Stack trace:', new Error().stack);
        return originalAbort(reason);
      };
      
      setCurrentAIController(controller);

      // Only send the current user prompt - no conversation history
      const messages = [
        { role: 'user', content: input }
      ];

      // Debug: Log messages being sent
      console.log('Messages being sent to AI (current prompt only):', messages);

      // Send to AI chat API with abort signal
      console.log('🔄 Starting AI chat stream request...');
      const response = await picuaApi.streamChatMessage(messages, anthropicApiKey, controller.signal);
      console.log('✅ AI chat stream request successful, starting to read response...');
      
      // Handle streaming response
      const reader = response.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('📖 Stream reading completed (done=true)');
          break;
        }
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'connected') {
                console.log('🔗 Connection confirmed, sessionId:', data.sessionId);
              } else if (data.type === 'test') {
                console.log('🧪 Test message received:', data.message);
              } else if (data.type === 'keepalive') {
                console.log('💓 Keep-alive received at:', new Date(data.timestamp));
              } else if (data.type === 'reasoning') {
                assistantMessage = data.content;
                // Update the last assistant message
                setCommandHistory(prev => {
                  const newHistory = [...prev];
                  const lastIndex = newHistory.length - 1;
                  if (lastIndex >= 0 && newHistory[lastIndex].type === 'assistant') {
                    newHistory[lastIndex] = {
                      ...newHistory[lastIndex],
                      content: assistantMessage
                    };
                  } else {
                    newHistory.push({
                      type: 'assistant',
                      content: assistantMessage,
                      timestamp: new Date()
                    });
                  }
                  return newHistory;
                });
              } else if (data.type === 'action') {
                addToHistory({
                  type: 'action',
                  content: `AI Action: ${JSON.stringify(data.action)}`,
                  timestamp: new Date()
                });
              } else if (data.type === 'done') {
                setIsProcessing(false);
                setCurrentAIController(null);
              } else if (data.type === 'error') {
                // Handle timeout errors specially
                if (data.error === 'TIMEOUT') {
                  addToHistory({
                    type: 'error',
                    content: `⏱️ ${data.content}\n\n💡 The AI session exceeded the 10-minute timeout limit. This can happen with very complex tasks.\n\nTo continue:\n• Break down your task into smaller steps\n• Try your request again\n• Contact support if this persists`,
                    timestamp: new Date()
                  });
                } else {
                  addToHistory({
                    type: 'error',
                    content: `AI Error: ${data.content}`,
                    timestamp: new Date()
                  });
                }
                setIsProcessing(false);
                setCurrentAIController(null);
              }
            } catch (err) {
              console.error('Error parsing SSE data:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('🚨 AI Chat error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Check if it was cancelled
      if (error.name === 'AbortError') {
        console.log('🛑 AI session was cancelled (AbortError detected)');
        return; // Don't add error message for user cancellation
      }
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      
      if (errorMessage.includes('credits exhausted') || errorMessage.includes('Insufficient Anthropic API credits')) {
        errorMessage = `💳 ${errorMessage}\n\n💡 To continue using AI features:\n• Visit console.anthropic.com\n• Add credits to your account\n• Try your request again`;
      } else if (errorMessage.includes('Invalid Anthropic API key')) {
        errorMessage = `🔑 ${errorMessage}\n\n💡 To fix this:\n• Check your API key configuration\n• Ensure the key has proper permissions\n• Contact support if the issue persists`;
      } else if (errorMessage.includes('Rate limit exceeded')) {
        errorMessage = `⏱️ ${errorMessage}\n\n💡 Please wait a moment and try again.`;
      } else if (errorMessage.includes('service temporarily unavailable')) {
        errorMessage = `🔧 ${errorMessage}\n\n💡 This is usually temporary. Please try again in a few minutes.`;
      } else {
        errorMessage = `❌ Failed to send prompt: ${errorMessage}`;
      }
      
      addToHistory({
        type: 'error',
        content: errorMessage,
        timestamp: new Date()
      });
      setIsProcessing(false);
      setCurrentAIController(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentCommand.trim() && !isProcessing) {
      const input = currentCommand.trim();
      setCurrentCommand('');
      setCommandIndex(-1);
      
      // Add user message to history
      addToHistory({
        type: 'user',
        content: input,
        timestamp: new Date()
      });
      
      await handleSubmitLogic(input);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      // Ctrl/Cmd + M to toggle speech recognition
      e.preventDefault();
      if (connectionStatus === 'connected' && !isProcessing) {
        // Trigger speech recognition toggle
        const speechButton = document.querySelector('[title*="voice input"], [title*="Stop listening"]');
        if (speechButton) {
          speechButton.click();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandIndex < commandHistory.filter(h => h.type === 'command').length - 1) {
        const newIndex = commandIndex + 1;
        setCommandIndex(newIndex);
        const commands = commandHistory.filter(h => h.type === 'command');
        setCurrentCommand(commands[commands.length - 1 - newIndex].content);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandIndex > 0) {
        const newIndex = commandIndex - 1;
        setCommandIndex(newIndex);
        const commands = commandHistory.filter(h => h.type === 'command');
        setCurrentCommand(commands[commands.length - 1 - newIndex].content);
      } else if (commandIndex === 0) {
        setCommandIndex(-1);
        setCurrentCommand('');
      }
    }
  };

  const handleInputChange = (e) => {
    setCurrentCommand(e.target.value);
  };



  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return '●';
      case 'disconnected': return '○';
      default: return '◐';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  };

  const parseHelpContent = (text) => {
    const result = [];
    let examples = [];
    const lines = text.split('\n');
    let i = 0;
    // Skip header line
    while (i < lines.length && !lines[i].toLowerCase().includes('available commands')) i++;
    i++;
    let current = null;
    let inExamples = false;
    for (; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.replace(/\r$/, '');
      if (!line.trim()) continue;
      if (/^examples:/i.test(line.trim())) {
        inExamples = true;
        continue;
      }
      if (inExamples) {
        const ex = line.trim().replace(/^[-•]\s*/, '');
        if (ex) examples.push(ex);
        continue;
      }
      if (/^[A-Za-z][\w\s]+:$/.test(line.trim())) {
        const category = line.trim().slice(0, -1);
        current = { category, items: [] };
        result.push(current);
        continue;
      }
      // Command line: two leading spaces, command columns then description
      const cmdMatch = line.match(/^\s{2}([^\s]+)\s+(.*)$/);
      if (cmdMatch) {
        const cmd = cmdMatch[1].trim();
        const description = cmdMatch[2].trim();
        current && current.items.push({ cmd, description, usage: '' });
        continue;
      }
      const usageMatch = line.match(/^\s{4}Usage:\s*(.*)$/i);
      if (usageMatch && current && current.items.length > 0) {
        current.items[current.items.length - 1].usage = usageMatch[1].trim();
      }
    }
    return { sections: result, examples };
  };

  const parseKeymapContent = (text) => {
    const sections = [];
    const lines = text.split('\n');
    let i = 0;
    // Find start line
    while (i < lines.length && !lines[i].startsWith('Valid Keys')) i++;
    // advance beyond header
    if (i < lines.length) i++;
    let current = null;
    for (; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '');
      if (!line.trim()) continue;
      if (/^Usage:/i.test(line.trim())) break; // stop before usage block
      if (/^[A-Za-z][\w\s]+:$/.test(line.trim())) {
        const category = line.trim().slice(0, -1);
        current = { category, keys: [] };
        sections.push(current);
        continue;
      }
      const keyMatch = line.match(/^\s{2}(.+)$/);
      if (keyMatch && current) {
        const key = keyMatch[1].trim();
        if (key) current.keys.push(key);
      }
    }
    return sections;
  };

  // Show setup wizard for first-time users
  if (isFirstTimeUser) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <>
      <Preloader />
      <div className="min-h-screen bg-[#F8F8F8] text-gray-900 font-inter">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#F8F8F8] border-b border-[#E8E8E8]">
          <div className="max-w-7xl mx-auto h-[64px] px-3 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-4">
              <img src={logo} alt="PiCUA" className="h-5 w-auto lg:h-6 select-none" />
              <div
                className="ml-1 lg:ml-2 inline-flex items-center gap-1.5 lg:gap-2 rounded-full h-fit px-2 lg:px-3 py-1.5 lg:py-2 text-xs lg:text-sm font-medium bg-[#EBEBEB] leading-none"
              >
                <span
                  className={`h-1.5 lg:h-2 w-1.5 lg:w-2 rounded-full animate-pulse ${connectionStatus === 'connected'
                    ? 'bg-green-500'
                    : connectionStatus === 'disconnected'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                    }`}
                />
                <span className="whitespace-nowrap">
                  {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                </span>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-[#3F3F3F] text-white flex items-center justify-center select-none cursor-pointer"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
              >
                <img src={profile} alt="PiCUA" className="h-3.5 w-auto lg:h-4 select-none" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-36 lg:w-40 rounded-md border border-gray-200 bg-white shadow-lg z-30">
                  <button
                    onClick={async () => {
                      try {
                        await picuaApi.logout();
                        
                        // Clear setup data and reset to onboarding
                        localStorage.removeItem('picua_setup');
                        setIsFirstTimeUser(true);
                        setSetupCompleted(false);
                        setSavedCredentials(null);
                        setConnectionStatus('disconnected');
                        setSessionInfo(null);
                        setCommandHistory([]);
                        setShowUserMenu(false);
                        
                        // No need to add to history since we're resetting
                      } catch (error) {
                        // Even if API logout fails, clear local data and redirect to onboarding
                        localStorage.removeItem('picua_setup');
                        setIsFirstTimeUser(true);
                        setSetupCompleted(false);
                        setSavedCredentials(null);
                        setConnectionStatus('disconnected');
                        setSessionInfo(null);
                        setCommandHistory([]);
                        setShowUserMenu(false);
                        
                        console.error('Logout error:', error);
                      }
                    }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`lg:h-[calc(100vh-80px)] h-[calc(100vh-64px)] ${streamError ? 'lg:bg-[linear-gradient(to_right,_#fef2f2_0%,_#fef2f2_50%,_#FFFFFF_50%,_#FFFFFF_100%)] bg-white' : 'bg-white lg:bg-[linear-gradient(to_right,_#F8F8F8_0%,_#F8F8F8_50%,_#FFFFFF_50%,_#FFFFFF_100%)]'}`}>
        <div className='max-w-7xl mx-auto h-full flex flex-col lg:flex-row'>
          {/* Left Panel - PiKVM Live Feed */}
          <div className="w-full lg:w-1/2 my-2 lg:m-3 flex flex-col justify-center h-full relative order-2 lg:order-1">
            {/* {streamError ? (
              <div className="absolute inset-0 flex items-center justify-center h-[20rem] lg:h-full bg-red-50">
                <p className="text-red-600 font-medium text-xs text-center px-4">{streamError}</p>
              </div>
            ) : ( */}
            <div className="py-2 lg:py-4 lg:pr-6">
              {/* Screen */}
              <div className={`rounded-xl w-full min-h-[6rem] lg:min-h-[20rem] ${!isProcessing && "img-cover"} z-0 relative`}>
                <div className={`absolute left-0 right-0 top-0 h-1 lg:h-1.5 rounded-t-xl transition-all filt duration-500 ease-in-out ${
                  isProcessing 
                    ? 'bg-gradient-to-r from-purple-400/70 via-pink-400/70 to-orange-400/70 opacity-100' 
                    : 'opacity-0'
                }`}></div>
                <div className={`absolute left-0 bottom-1.5 top-1 lg:top-1.5 w-1 lg:w-1.5 transition-all filt duration-500 ease-in-out ${
                  isProcessing 
                    ? 'bg-gradient-to-b from-purple-400/70 via-pink-400/70 to-orange-400/70 opacity-100' 
                    : 'opacity-0'
                }`}></div>
                <div className={`absolute bottom-1.5 right-0 top-1 lg:top-1.5 w-1 lg:w-1.5 rounded-br-xl transition-all filt duration-500 ease-in-out ${
                  isProcessing 
                    ? 'bg-gradient-to-t from-purple-400/70 via-pink-400/70 to-orange-400/70 opacity-100' 
                    : 'opacity-0'
                }`}></div>
                <div className={`absolute bottom-0 right-0 left-0 h-1 lg:h-1.5 rounded-br-xl transition-all filt duration-500 ease-in-out ${
                  isProcessing 
                    ? 'bg-gradient-to-l from-purple-400/70 via-pink-400/70 to-orange-400/70 opacity-100' 
                    : 'opacity-0'
                }`}></div>
                
                {connectionStatus === 'connected' ? (
                  <img
                    src="/pikvm-stream"
                    alt="PiKVM Live Stream"
                    className="w-full h-full object-contain rounded-lg"
                    onError={() => {
                      const errorMsg = 'Failed to load PiKVM stream. Check network connection or authentication.';
                      setStreamError(errorMsg);
                      addToHistory({ type: 'error', content: errorMsg, timestamp: new Date() });
                      setIsStreamLoading(false);
                    }}
                    onLoad={() => {
                      setIsStreamLoading(false);
                      setStreamError(null);
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="mb-4">
                        <Monitor size={48} className="mx-auto text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Login to PiKVM</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Type "login" in the chat to connect to your PiKVM and see the desktop stream
                      </p>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                        Waiting for connection
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className='w-full flex justify-center mt-4 lg:mt-6'>
                <div className='w-full h-[1px] bg-gray-200'></div>
              </div>
              {/* Connection & recording status */}
              {connectionStatus === 'connected' && sessionInfo?.ip && (
                <div className="mt-4 lg:mt-8 flex flex-col items-center justify-center gap-1">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full bg-[#F3F3F3] border border-[#E5E5E5] px-3 py-1 shadow-inner">
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
                      <span className="inline-flex items-center justify-center text-gray-600"><Monitor size={14} /></span>
                      <span className="text-[12px] text-gray-800">Connected to</span>
                      <a className="text-[12px] text-gray-900 font-semibold cursor-pointer">{sessionInfo?.ip}</a>
                    </div>
                    {isRecording && (
                      <div className="flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-3 py-1 shadow-inner">
                        <span className="inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[11px] text-red-700 font-semibold tracking-wide uppercase">REC</span>
                        <span className="text-[11px] text-red-600 font-mono">
                          {`${String(Math.floor(recordingElapsed / 60)).padStart(2, '0')}:${String(recordingElapsed % 60).padStart(2, '0')}`}
                        </span>
                      </div>
                    )}
                  </div>
                  {recordingStatus && recordingStatus.toLowerCase().includes('encoding') && (
                    <div className="mt-1 w-40 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 transition-all duration-300 ease-out"
                        style={{ width: `${Math.min(100, Math.max(0, encodingProgress))}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {connectionStatus === 'connected' && (
                <div className="mt-4 lg:mt-6 rounded-2xl bg-[#F0F0F0] p-2 lg:p-3 w-full lg:w-[80%] mx-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:gap-3">
                    <button onClick={async () => { if (isProcessing) return; await executeCommand(isPowerOn ? 'power off' : 'power on'); setIsPowerOn(!isPowerOn); }} disabled={isProcessing} className="h-16 sm:h-20 lg:h-24 rounded-xl bg-white border border-[#EAEAEA] shadow-sm flex flex-col items-center justify-center gap-1 lg:gap-2 hover:bg-gray-50 disabled:opacity-60 cursor-pointer transition-transform active:scale-95">
                      <Power size={14} className={`${isPowerOn ? 'text-green-600' : 'text-red-600'} sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]`} />
                      <span className="text-[10px] sm:text-[11px] lg:text-[12px] text-gray-700">Power</span>
                    </button>
                    <button onClick={() => executeCommand('snapshot')} className="h-16 sm:h-20 lg:h-24 rounded-xl bg-white border border-[#EAEAEA] shadow-sm flex flex-col items-center justify-center gap-1 lg:gap-2 hover:bg-gray-50 cursor-pointer transition-transform active:scale-95">
                      <Camera size={14} className="text-gray-700 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                      <span className="text-[10px] sm:text-[11px] lg:text-[12px] text-gray-700">Screenshot</span>
                    </button>
                    <button onClick={toggleRecording} disabled={(isProcessing && !isRecording) || ffmpegLoading} className={`h-16 sm:h-20 lg:h-24 rounded-xl bg-white border shadow-sm flex flex-col items-center justify-center gap-1 lg:gap-2 hover:bg-gray-50 disabled:opacity-60 cursor-pointer transition-transform active:scale-95 ${isRecording ? 'border-red-500 bg-red-50' : 'border-[#EAEAEA]'}`}>
                      <Video size={14} className={`${isRecording ? 'text-red-600' : 'text-gray-700'} sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]`} />
                      <span className={`text-[10px] sm:text-[11px] lg:text-[12px] ${isRecording ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                        {ffmpegLoading ? 'Loading...' : isRecording ? 'Stop' : 'Record'}
                      </span>
                    </button>
                    <button onClick={() => executeCommand('status')} className="h-16 sm:h-20 lg:h-24 rounded-xl bg-white border border-[#EAEAEA] shadow-sm flex flex-col items-center justify-center gap-1 lg:gap-2 hover:bg-gray-50 cursor-pointer transition-transform active:scale-95">
                      <Activity size={14} className="text-gray-700 sm:w-4 sm:h-4 lg:w-[18px] lg:h-[18px]" />
                      <span className="text-[10px] sm:text-[11px] lg:text-[12px] text-gray-700">Status</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* )} */}
          </div>

          {/* Right Panel - CLI Interface */}
          <div className="w-full lg:w-1/2 flex flex-col my-2 lg:m-3 bg-white order-1 lg:order-2">
            {/* Scrollable Output Area */}
            <div
              className="flex-1 overflow-y-auto rounded-lg px-3 lg:pr-0 lg:pl-6 mb-2 lg:mb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              ref={outputRef}
              onScroll={handleScroll}
            >
              <div className="space-y-4">
                {commandHistory.map((entry) => {
                  const isUser = entry.type === 'command' || entry.type === 'user';
                  const isError = entry.type === 'error';
                  const isSystem = entry.type === 'system';
                  const isAssistant = entry.type === 'assistant' || entry.type === 'output';
                  const isAction = entry.type === 'action';
                  const isHelp = !isUser && !isError && typeof entry.content === 'string' && entry.content.startsWith('Available Commands:');
                  const isKeymap = !isUser && !isError && typeof entry.content === 'string' && entry.content.startsWith('Valid Keys for "key" and "shortcut" Commands:');
                  
                  return (
                    <div key={entry.id} className="w-full">
                      {isUser ? (
                        // User Message - Right aligned (standard chatbot style)
                        <div className="flex justify-end mb-3">
                          <div className="max-w-[85%] lg:max-w-[75%]">
                            <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                              <p className="text-sm leading-relaxed">{entry.content}</p>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">{formatTimestamp(entry.timestamp)}</div>
                          </div>
                        </div>
                      ) : (
                        // PiCUA Response - Left aligned (standard chatbot style)
                        <div className="flex justify-start mb-3">
                          <div className="max-w-[85%] lg:max-w-[75%]">
                            <div className="flex items-start gap-2 mb-1">
                              <img src={logo2} alt="PiCUA" className="h-14 w-14 select-none" />
                            </div>
                            {isHelp ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-md p-0 shadow-sm overflow-hidden">
                                {(() => {
                                  const parsed = parseHelpContent(entry.content);
                                  return (
                                    <div>
                                      <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gradient-to-r from-gray-100 to-gray-50">
                                        <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                          <Grid2X2 size={16} />
                                          Available Commands
                                        </div>
                                      </div>
                                      {parsed.sections.map((sec) => (
                                        <div key={sec.category} className="p-4 border-b border-gray-100 last:border-b-0">
                                          <div className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">{sec.category}</div>
                                          <ul className="space-y-2">
                                            {sec.items.map((it) => (
                                              <li key={it.cmd} className="grid grid-cols-[auto_1fr] gap-x-4 items-start">
                                                <div className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded min-w-[6rem]">{it.cmd}</div>
                                                <div className="text-sm text-gray-700 leading-relaxed">{it.description}</div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ))}
                                      {parsed.examples.length > 0 && (
                                        <div className="p-4 bg-gray-25">
                                          <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Examples</div>
                                          <ul className="text-sm text-gray-700 space-y-1">
                                            {parsed.examples.map((ex, idx) => (
                                              <li key={idx} className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{ex}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : isKeymap ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-md p-0 shadow-sm overflow-hidden">
                                <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gradient-to-r from-gray-100 to-gray-50">
                                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <Grid2X2 size={16} />
                                    Valid Keys
                                  </div>
                                </div>
                                {(() => {
                                  const groups = parseKeymapContent(entry.content);
                                  return (
                                    <div className="p-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {groups.map((g) => (
                                          <div key={g.category} className="bg-white border border-gray-100 rounded-lg p-3">
                                            <div className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">{g.category}</div>
                                            <div className="flex flex-wrap gap-1">
                                              {g.keys.map((k) => (
                                                <span key={k} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800 font-mono">{k}</span>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className={`${
                                isError 
                                  ? 'bg-red-50 border-red-200 text-red-800' 
                                  : isSystem
                                  ? 'bg-blue-50 border-blue-200 text-blue-800'
                                  : isAction
                                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                                  : 'bg-gray-50 text-gray-900'
                              } border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm`}>
                                <div className="flex items-start gap-2">
                                  {isError && <span className="text-red-500 text-sm">⚠️</span>}
                                  {isSystem && <span className="text-blue-500 text-sm">ℹ️</span>}
                                  {isAction && <span className="text-yellow-600 text-sm">⚡</span>}
                                  {!isError && !isSystem && !isAction && <span className="text-gray-500 text-sm">💬</span>}
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">{entry.content}</p>
                                </div>
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">{formatTimestamp(entry.timestamp)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fixed Input Area */}
            <div className="bg-transparent p-3 lg:p-3 lg:pl-6">
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <div className="flex w-full items-center rounded-full border-2 border-[#E7E7E7] bg-white pl-3 lg:pl-4 pr-1.5 h-11 lg:h-13">
                    <input
                      ref={(el) => { window.__commandInput = el; }}
                      type="text"
                      value={currentCommand}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={connectionStatus === 'connected' ? "Ask me to help with your desktop..." : "Type 'login' to use PiCUA"}
                      className="bg-transparent placeholder-gray-500 text-gray-900 text-sm font-inter outline-none flex-1 w-full"
                      disabled={isProcessing}
                    />
                    
                    {/* Speech Recognition Button */}
                    <div className="mx-2">
                      <SpeechRecognition
                        onSpeechResult={handleSpeechResult}
                        onSpeechStart={handleSpeechStart}
                        onSpeechEnd={handleSpeechEnd}
                        disabled={isProcessing || connectionStatus !== 'connected'}
                      />
                    </div>
                    
                    <button
                      onClick={isProcessing ? cancelAISession : handleSubmit}
                      disabled={!isProcessing && !currentCommand.trim()}
                      className={`ml-2 h-8 w-8 lg:h-10 lg:w-10 rounded-full ${
                        isProcessing 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-[#2E2E2E]'
                      } text-white flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-colors`}
                      aria-label={isProcessing ? "Cancel AI Session" : "Send"}
                      title={isProcessing ? "Click to cancel AI session" : "Send message"}
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-3 w-3 lg:h-4 lg:w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <ArrowRight size={12} className="lg:w-4 lg:h-4" />
                      )}
                    </button>
                  </div>

                </div>

                <div className="mt-3 lg:mt-4 flex items-center justify-center text-[10px] lg:text-[12px] text-gray-400 text-center px-2">
                  <span className="mr-1">ⓘ</span>
                  <span>Picua can make mistakes. Check important actions before proceeding.</span>
                </div>
              </div>
            </div>


          </div>
        </div>

      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
          <div className="relative h-full w-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4 lg:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <img src={logo} alt="PiCUA" className="h-5 w-auto lg:h-6 select-none" />
                    <h2 className="text-sm font-semibold text-gray-900">Sign in</h2>
                  </div>
                  <button
                    onClick={() => setShowLoginModal(false)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 cursor-pointer"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">IP / Hostname</label>
                    <input
                      type="text"
                      value={loginIp}
                      onChange={(e) => setLoginIp(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm outline-none"
                      placeholder="192.168.1.7"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Username</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm outline-none"
                      placeholder="admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm outline-none"
                      placeholder="••••••••"
                    />
                  </div>

                  {loginError && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{loginError}</div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-1">
                    <button
                      onClick={() => setShowLoginModal(false)}
                      className="px-3 py-2 text-sm rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setIsLoginSubmitting(true);
                        setLoginError('');
                        try {
                          if (!loginIp || !loginUsername || !loginPassword) {
                            setLoginError('All fields are required');
                            setIsLoginSubmitting(false);
                            return;
                          }
                          await picuaApi.login(loginIp, loginUsername, loginPassword);
                          addToHistory({ type: 'output', content: `Successfully logged in to ${loginIp} as ${loginUsername}`, timestamp: new Date() });
                          setShowLoginModal(false);
                          await checkConnectionStatus();
                        } catch (err) {
                          setLoginError(err.message || 'Login failed');
                        } finally {
                          setIsLoginSubmitting(false);
                        }
                      }}
                      disabled={isLoginSubmitting}
                      className="px-4 py-2 text-sm rounded-md bg-black text-white hover:bg-gray-900 disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {isLoginSubmitting ? 'Logging in…' : 'Sign in'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  );
}

export default App;