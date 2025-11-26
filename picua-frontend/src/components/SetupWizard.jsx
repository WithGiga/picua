import React, { useState } from 'react';
import { Monitor, ExternalLink, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';

const SetupWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pikvmIp, setPikvmIp] = useState('');
  const [pikvmUsername, setPikvmUsername] = useState('admin');
  const [pikvmPassword, setPikvmPassword] = useState('admin');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [streamWorking, setStreamWorking] = useState(false);

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionError('');
    
    // If stream is working, that's sufficient validation for setup
    if (streamWorking) {
      // Stream is working, complete setup without API test
      onComplete({
        pikvmIp,
        pikvmUsername,
        pikvmPassword,
        setupCompleted: true
      });
      setIsTestingConnection(false);
      return;
    }
    
    // Stream is not working, we need both API connection AND stream to work
    try {
      // Test API connection first
      const picuaApi = await import('../picuaApi');
      await picuaApi.login(pikvmIp, pikvmUsername, pikvmPassword);
      
      // API connection successful but stream still not working
      // Don't complete setup, show helpful message
      setConnectionError('Connection test successful, but video stream preview is not working.\n\nTo complete setup:\n• Open PiKVM web interface in a new tab\n• Login with your credentials\n• Navigate to KVM section and start the video stream\n• Return here - the preview should show your desktop\n• Then click "Complete Setup"');
      
    } catch (error) {
      // Handle different types of errors with user-friendly messages
      let errorMessage = '';
      
      if (error.message && error.message.includes('timeout')) {
        errorMessage = 'Connection timeout - PiKVM is not responding. Please check:\n• Is the IP address correct?\n• Is PiKVM powered on and connected to network?\n• Can you access PiKVM web interface directly?';
      } else if (error.message && error.message.includes('403')) {
        errorMessage = 'Authentication failed - Wrong username or password. Please check:\n• Username is correct (usually "admin")\n• Password is correct (default is "admin")\n• Try logging into PiKVM web interface first';
      } else if (error.message && error.message.includes('404')) {
        errorMessage = 'PiKVM not found at this address. Please check:\n• IP address is correct (e.g., 192.168.1.100)\n• PiKVM is on the same network\n• Try accessing the web interface directly';
      } else if (error.message && error.message.includes('Network Error')) {
        errorMessage = 'Network connection failed. Please check:\n• PiKVM IP address is correct\n• Your computer and PiKVM are on same network\n• PiKVM is powered on and accessible';
      } else if (error.message && error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Connection refused - PiKVM is not accepting connections. Please check:\n• PiKVM is powered on\n• Web interface is enabled\n• No firewall blocking the connection';
      } else {
        errorMessage = `Connection failed: ${error.message || 'Unknown error'}\n\nPlease check:\n• PiKVM IP address is correct\n• PiKVM is powered on and accessible\n• Username and password are correct`;
      }
      
      setConnectionError(errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const openPiKVMInNewTab = () => {
    if (pikvmIp) {
      const url = pikvmIp.startsWith('http') ? pikvmIp : `https://${pikvmIp}`;
      window.open(url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-gray-900 font-inter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#F8F8F8] border-b border-[#E8E8E8]">
        <div className="max-w-7xl mx-auto h-[64px] px-3 flex items-center justify-center">
          <img src={logo} alt="PiCUA" className="h-5 w-auto lg:h-6 select-none" />
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white lg:bg-[linear-gradient(to_right,_#F8F8F8_0%,_#F8F8F8_50%,_#FFFFFF_50%,_#FFFFFF_100%)] min-h-[calc(100vh-64px)]">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl border border-[#E8E8E8] p-6">
          {currentStep === 1 && (
            <div className="text-center">
              <Monitor size={48} className="mx-auto text-gray-400 mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">Setup PiCUA AI</h2>
              <p className="text-sm text-gray-600 mb-6">
                Connect your PiKVM to enable AI desktop automation
              </p>
              <div className="bg-[#F8F8F8] rounded-lg p-4 mb-6 text-left">
                <h3 className="font-medium text-gray-900 mb-2 text-sm">Requirements:</h3>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Working PiKVM device</li>
                  <li>• Network access to PiKVM</li>
                  <li>• PiKVM credentials (admin/admin)</li>
                </ul>
              </div>
              <button
                onClick={handleNext}
                className="w-full bg-[#3F3F3F] text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">PiKVM Connection</h2>
              <p className="text-sm text-gray-600 mb-4">
                Enter your PiKVM details
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">IP / Hostname</label>
                  <input
                    type="text"
                    value={pikvmIp}
                    onChange={(e) => {
                      const value = e.target.value.trim();
                      setPikvmIp(value);
                      // Clear any previous errors when user changes IP
                      if (connectionError) {
                        setConnectionError('');
                      }
                    }}
                    placeholder="192.168.1.100 or pikvm.local"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm outline-none focus:border-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your PiKVM's IP address or hostname (without http://)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Username</label>
                    <input
                      type="text"
                      value={pikvmUsername}
                      onChange={(e) => {
                        setPikvmUsername(e.target.value);
                        // Clear authentication errors when credentials change
                        if (connectionError && connectionError.includes('Authentication failed')) {
                          setConnectionError('');
                        }
                      }}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm outline-none focus:border-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Password</label>
                    <input
                      type="password"
                      value={pikvmPassword}
                      onChange={(e) => {
                        setPikvmPassword(e.target.value);
                        // Clear authentication errors when credentials change
                        if (connectionError && connectionError.includes('Authentication failed')) {
                          setConnectionError('');
                        }
                      }}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white shadow-sm outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#F8F8F8] rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-600 mb-2">
                  <strong>Important:</strong> Open PiKVM web interface in a new tab and start the KVM stream before continuing.
                </p>
                <button
                  onClick={openPiKVMInNewTab}
                  disabled={!pikvmIp}
                  className="bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ExternalLink size={12} />
                  Open PiKVM
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 bg-[#EBEBEB] text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!pikvmIp || !pikvmUsername || !pikvmPassword}
                  className="flex-1 bg-[#3F3F3F] text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Test Connection</h2>
                  <p className="text-sm text-gray-600">
                    Verify your PiKVM connection
                  </p>
                </div>
                
                {/* Small PiKVM Stream Preview */}
                <div className="ml-4 w-24 h-16 bg-[#F8F8F8] rounded-lg border border-[#E8E8E8] overflow-hidden flex-shrink-0">
                  {pikvmIp ? (
                    <img
                      src="/pikvm-stream"
                      alt="PiKVM Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                        setStreamWorking(false);
                        setConnectionError('Stream preview failed. Please ensure you have logged into PiKVM web interface and started the KVM stream in a new tab.');
                      }}
                      onLoad={() => {
                        // Clear any previous connection errors when stream loads successfully
                        setStreamWorking(true);
                        if (connectionError && connectionError.includes('Stream preview failed')) {
                          setConnectionError('');
                        }
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full flex items-center justify-center" style={{ display: pikvmIp ? 'none' : 'flex' }}>
                    <Monitor size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="bg-[#F8F8F8] rounded-lg p-3 mb-4">
                <div className="text-xs text-gray-600 space-y-1">
                  <p><strong>PiKVM:</strong> {pikvmIp}</p>
                  <p><strong>Username:</strong> {pikvmUsername}</p>
                  <p><strong>Password:</strong> {'•'.repeat(pikvmPassword.length)}</p>
                  {streamWorking && (
                    <p className="text-green-600 font-medium"><strong>✓ Stream:</strong> Working</p>
                  )}
                </div>
              </div>

              {connectionError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
                  <div className="font-medium mb-2">
                    {connectionError.split('\n').map((line, index) => (
                      <div key={index} className={index === 0 ? 'text-red-800 font-semibold' : 'text-red-700 mt-1'}>
                        {line}
                      </div>
                    ))}
                  </div>
                  
                  {/* Action buttons for different error types */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {(connectionError.includes('timeout') || connectionError.includes('404') || connectionError.includes('Network Error')) && (
                      <button
                        onClick={openPiKVMInNewTab}
                        disabled={!pikvmIp}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Test PiKVM Web Access
                      </button>
                    )}
                    
                    {connectionError.includes('Authentication failed') && (
                      <button
                        onClick={openPiKVMInNewTab}
                        disabled={!pikvmIp}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        Login to PiKVM Web
                      </button>
                    )}
                    
                    {(connectionError.includes('Stream preview failed') || connectionError.includes('Connection test successful')) && (
                      <button
                        onClick={openPiKVMInNewTab}
                        disabled={!pikvmIp}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        Open PiKVM & Start Stream
                      </button>
                    )}
                    
                    <button
                      onClick={() => setConnectionError('')}
                      className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleBack}
                  className="flex-1 bg-[#EBEBEB] text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    streamWorking 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-[#3F3F3F] text-white hover:bg-gray-800'
                  }`}
                >
                  {isTestingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white inline-block mr-2"></div>
                      Testing...
                    </>
                  ) : streamWorking ? (
                    'Complete Setup ✓'
                  ) : (
                    'Test Connection'
                  )}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
