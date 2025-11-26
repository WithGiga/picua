const session = require('./api/session');
const snapshot = require('./api/snapshot');
const hid = require('./api/hid');
const atx = require('./api/atx');
const msd = require('./api/msd');

class PiCUA {
  constructor() {
    this.isAuthenticated = false;
  }

  /**
   * Login to PiKVM
   * @param {string} ip - PiKVM IP address (optional, will prompt if not provided)
   * @returns {Promise<boolean>} - True if login successful
   */
  async login(ip) {
    await session.login(ip);
    this.isAuthenticated = true;
    return true;
  }

  /**
   * Logout from PiKVM
   * @returns {Promise<boolean>} - True if logout successful
   */
  async logout() {
    await session.logout();
    this.isAuthenticated = false;
    return true;
  }

  /**
   * Get connection status
   * @returns {Promise<Object>} - Status object with connection details
   */
  async getStatus() {
    return await session.getStatus();
  }

  /**
   * Test connection to PiKVM
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    return await session.testConnection();
  }

  /**
   * Change password
   * @returns {Promise<boolean>} - True if password changed successfully
   */
  async changePassword() {
    return await session.changePassword();
  }

  // HID (Human Interface Device) Methods

  /**
   * Type text
   * @param {string} text - Text to type
   * @param {boolean} slow - Whether to type slowly (default: false)
   * @returns {Promise<Object>} - Result of typing operation
   */
  async typeText(text, slow = false) {
    this._checkAuth();
    return await hid.typeText(text, slow);
  }

  /**
   * Press a key
   * @param {string} key - Key to press
   * @returns {Promise<Object>} - Result of key press
   */
  async keyPress(key) {
    this._checkAuth();
    return await hid.keyPress(key);
  }

  /**
   * Send keyboard shortcut
   * @param {Array<string>} keys - Array of keys for shortcut
   * @returns {Promise<Object>} - Result of shortcut
   */
  async sendShortcut(keys) {
    this._checkAuth();
    return await hid.sendShortcut(keys);
  }

  /**
 * Move mouse to absolute position in pixel coordinates (top-left origin).
 * Converts to PiKVM HID coordinates (-32767 to +32767, center-based) internally.
 * @param {number} x - X coordinate (pixels from left edge, 0 is left)
 * @param {number} y - Y coordinate (pixels from top edge, 0 is top)
 * @param {Object} [options] - Optional settings
 * @param {boolean} [options.smooth=false] - If true, moves cursor smoothly with interpolation
 * @returns {Promise<Object>} - Result of mouse move with pixel and HID coordinates
 * @throws {Error} - If coordinates are invalid or API call fails
 */
async moveMouseAbs(x, y, options = {}) {
  this._checkAuth();

  // Validate inputs
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('x and y must be finite numbers');
  }

  try {
    return await hid.moveMouseAbs(x, y, options);
  } catch (error) {
    throw new Error(`Failed to move mouse: ${error.message}`);
  }
}
  

  /**
   * Single click mouse
   * @param {string} button - Button to click (left, right)
   * @returns {Promise<Object>} - Result of click
   */
  async singleClick(button = 'left') {
    this._checkAuth();
    return await hid.singleClick(button);
  }

  /**
   * Double click mouse
   * @param {string} button - Button to click (left, right)
   * @returns {Promise<Object>} - Result of double click
   */
  async doubleClick(button = 'left') {
    this._checkAuth();
    return await hid.doubleClick(button);
  }

  /**
   * Scroll mouse wheel
   * @param {number} dx - Delta X scroll
   * @param {number} dy - Delta Y scroll
   * @returns {Promise<Object>} - Result of scroll
   */
  async scrollWheel(dx = 0, dy = 0) {
    this._checkAuth();
    return await hid.scrollWheel(dx, dy);
  }

  /**
   * Drag mouse from one position to another
   * @param {number} x1 - Start X coordinate
   * @param {number} y1 - Start Y coordinate
   * @param {number} x2 - End X coordinate
   * @param {number} y2 - End Y coordinate
   * @param {string} button - Button to hold (left, right)
   * @returns {Promise<Object>} - Result of drag
   */
  async dragMouse(x1, y1, x2, y2, button = 'left') {
    this._checkAuth();
    return await hid.dragMouse(x1, y1, x2, y2, button);
  }

  // ATX (Power Management) Methods

  /**
   * Send ATX power command
   * @param {string} action - Power action (on, off, long, reset)
   * @param {boolean} wait - Whether to wait for completion
   * @returns {Promise<Object>} - Result of power command
   */
  async sendAtxCommand(action = 'on', wait = false) {
    this._checkAuth();
    return await atx.sendAtxClick(action, wait);
  }

  // MSD (Mass Storage Device) Methods

  /**
   * Get MSD status
   * @returns {Promise<Object>} - MSD status information
   */
  async getMsdStatus() {
    this._checkAuth();
    return await msd.getStatus();
  }

  /**
   * List MSD images
   * @returns {Promise<Array>} - Array of available images
   */
  async listMsdImages() {
    this._checkAuth();
    const status = await msd.getStatus();
    if (status && status.storage && status.storage.images) {
      return Object.keys(status.storage.images);
    }
    return [];
  }

  /**
   * Upload image from local file
   * @param {string} localPath - Path to local file
   * @param {string} imageName - Name for the image (optional)
   * @returns {Promise<Object>} - Result of upload
   */
  async uploadMsdImage(localPath, imageName) {
    this._checkAuth();
    return await msd.uploadImage(localPath, imageName);
  }

  /**
   * Upload image from URL
   * @param {string} url - URL to download from
   * @param {string} imageName - Name for the image (optional)
   * @returns {Promise<Object>} - Result of upload
   */
  async uploadMsdImageFromUrl(url, imageName) {
    this._checkAuth();
    return await msd.uploadImageByUrl(url, imageName);
  }

  /**
   * Set MSD parameters
   * @param {Object} params - Parameters object
   * @param {string} params.image - Image name
   * @param {boolean} params.cdrom - CD-ROM mode
   * @param {boolean} params.rw - Read-write mode
   * @returns {Promise<Object>} - Result of parameter setting
   */
  async setMsdParams(params) {
    this._checkAuth();
    return await msd.setParams(params);
  }

  /**
   * Connect MSD to host
   * @returns {Promise<Object>} - Result of connection
   */
  async connectMsd() {
    this._checkAuth();
    return await msd.connect();
  }

  /**
   * Disconnect MSD from host
   * @returns {Promise<Object>} - Result of disconnection
   */
  async disconnectMsd() {
    this._checkAuth();
    return await msd.disconnect();
  }

  /**
   * Remove MSD image
   * @param {string} imageName - Name of image to remove
   * @returns {Promise<Object>} - Result of removal
   */
  async removeMsdImage(imageName) {
    this._checkAuth();
    return await msd.removeImage(imageName);
  }

  /**
   * Reset MSD to defaults
   * @returns {Promise<Object>} - Result of reset
   */
  async resetMsd() {
    this._checkAuth();
    return await msd.reset();
  }

  // Snapshot Methods

  /**
   * Get screenshot
   * @returns {Promise<Buffer>} - Image buffer
   */
  async getSnapshot() {
    this._checkAuth();
    return await snapshot.getSnapshot();
  }

  // Utility Methods

  /**
   * Check if authenticated
   * @returns {boolean} - True if authenticated
   */
  isLoggedIn() {
    return this.isAuthenticated;
  }

  /**
   * Get current configuration
   * @returns {Promise<Object>} - Configuration object
   */
  async getConfig() {
    return await session.loadConfig();
  }

  /**
   * Test MSD API connectivity
   * @returns {Promise<Object>} - Test result
   */
  async testMsdConnection() {
    this._checkAuth();
    return await msd.testConnection();
  }

  /**
   * Check authentication before operations
   * @private
   */
  _checkAuth() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }
  }
}

module.exports = PiCUA;
