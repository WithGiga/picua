import React, { useEffect, useRef, useState } from "react";

export default function JanusStream() {
  const videoRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Not connected');
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    server: 'http://192.168.1.100:8080', // Default ustreamer HTTP port
    quality: 'high',
    format: 'mjpeg' // ustreamer supports MJPEG and H.264
  });

  // Common ustreamer configurations
  const commonConfigs = [
    { name: 'Default PiKVM', server: 'http://192.168.1.100:8080' },
    { name: 'Local PiKVM', server: 'http://localhost:8080' },
    { name: 'Custom Port', server: 'http://192.168.1.100:8080' },
    { name: 'Custom', server: '' }
  ];

  const connectToUstreamer = async () => {
    if (!config.server.trim()) {
      setError('Please enter a valid ustreamer server URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setConnectionStatus('Connecting...');

    try {
      setConnectionStatus('Testing connection...');
      
      // Test connection to ustreamer
      const testUrl = `${config.server}/snapshot`;
      const response = await fetch(testUrl, { method: 'HEAD' });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      setConnectionStatus('Connected to ustreamer');
      setIsConnected(true);
      setIsLoading(false);
      setError(null);

      // Set video source based on format
      if (videoRef.current) {
        if (config.format === 'mjpeg') {
          // MJPEG stream - direct URL
          videoRef.current.src = `${config.server}/stream`;
        } else {
          // H.264 stream - WebRTC or HLS
          videoRef.current.src = `${config.server}/stream`;
        }
      }

    } catch (err) {
      console.error("Ustreamer connection error:", err);
      setError(`Connection failed: ${err.message}`);
      setIsLoading(false);
      setConnectionStatus('Connection failed');
    }
  };

  const disconnect = () => {
    if (videoRef.current) {
      videoRef.current.src = '';
    }
    setIsConnected(false);
    setIsLoading(false);
    setError(null);
    setConnectionStatus('Disconnected');
  };

  const selectConfig = (configOption) => {
    if (configOption.name === 'Custom') {
      setConfig({ ...config, server: '' });
    } else {
      setConfig({ ...config, server: configOption.server });
    }
    setShowConfig(false);
  };

  const captureSnapshot = async () => {
    if (!isConnected) return;
    
    try {
      const snapshotUrl = `${config.server}/snapshot`;
      const response = await fetch(snapshotUrl);
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pikvm-snapshot-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Snapshot error:', err);
    }
  };

  useEffect(() => {
    // Cleanup function
    return () => {
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              PiKVM Live Stream (Ustreamer)
            </h2>
            <div className="text-xs text-blue-100 mt-1">
              Status: {connectionStatus}
            </div>
          </div>
          <div className="flex space-x-2">
            {!isConnected && !isLoading && (
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="px-3 py-1 bg-blue-700 text-white text-xs rounded hover:bg-blue-800 transition-colors cursor-pointer"
              >
                Configure
              </button>
            )}
            {isConnected && (
              <>
                <button
                  onClick={captureSnapshot}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors cursor-pointer"
                  title="Capture Snapshot"
                >
                  📸
                </button>
                <button
                  onClick={disconnect}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ustreamer Server URL
              </label>
              <input
                type="text"
                value={config.server}
                onChange={(e) => setConfig({ ...config, server: e.target.value })}
                placeholder="http://192.168.1.100:8080"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              {commonConfigs.map((configOption) => (
                <button
                  key={configOption.name}
                  onClick={() => selectConfig(configOption)}
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors cursor-pointer"
                >
                  {configOption.name}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={connectToUstreamer}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors cursor-pointer"
              >
                {isLoading ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Container */}
      <div className="flex-1 relative bg-gray-900 p-4">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-lg font-medium">Connecting to PiKVM...</p>
              <p className="text-sm text-blue-200 mt-2">{connectionStatus}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-red-400 bg-red-900 bg-opacity-50 p-6 rounded-lg max-w-md">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium mb-3">Connection Error</p>
              <p className="text-sm mb-4">{error}</p>
              <button
                onClick={() => setShowConfig(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Configure Connection
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full object-contain rounded-lg"
          autoPlay
          playsInline
          muted
          controls
        />

        {!isConnected && !isLoading && !error && !showConfig && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center text-gray-400 bg-gray-800 bg-opacity-50 p-6 rounded-lg">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-medium">Configure Ustreamer Connection</p>
              <p className="text-sm mb-4">Click "Configure" to set up your PiKVM ustreamer server</p>
              <button
                onClick={() => setShowConfig(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Configure Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-gray-700">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 text-xs">
              {isConnected ? 'Live Stream' : 'No Stream'}
            </span>
            {config.server && (
              <span className="text-xs text-gray-400 font-mono">
                {config.server.replace(/^https?:\/\//, '').split('/')[0]}
              </span>
            )}
            {isConnected && (
              <span className="text-xs text-green-600">
                Ustreamer Active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
