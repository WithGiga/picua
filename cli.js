#!/usr/bin/env node

const hid = require('./src/api/hid');
const snapshot = require('./src/api/snapshot');
const session = require('./src/api/session');
const atx = require('./src/api/atx');
const msd = require('./src/api/msd');
const { hasConfig } = require('./src/utils/httpClient');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const cmd = args[0].toLowerCase();

  try {
    // Session management commands (don't require authentication)
    if (cmd === 'login') {
      await session.login(args[1]);
      process.exit(0);
    }

    if (cmd === 'logout') {
      await session.logout();
      process.exit(0);
    }

    if (cmd === 'change-password') {
      await session.changePassword();
      process.exit(0);
    }

    if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
      printHelp();
      process.exit(0);
    }

    if (cmd === 'version' || cmd === '--version' || cmd === '-v') {
      console.log('[PiCUA] PiCUA CLI v1.0.0');
      console.log('[PiCUA] PiKVM Control Utility');
      process.exit(0);
    }

    // Before any other commands, check if config exists and load it
    // Only show error if we're not in login mode
    if (!hasConfig()) {
      console.error('[PiCUA] No credentials found. Please run: ./cli.js login <pikvm_ip>');
      process.exit(1);
    }
    
    const config = await session.loadConfig();
    
    switch (cmd) {
      case 'type': {
        const slow = args.includes('--slow');
        const textArgs = args.slice(1).filter(arg => arg !== '--slow');
        const text = textArgs.join(' ');
        if (!text) {
          console.error('Error: No text provided to type.');
          process.exit(1);
        }
        await hid.typeText(text, slow);
        console.log(`[PiCUA] Typed text${slow ? ' (slow mode)' : ''}: "${text}"`);
        break;
      }
      case 'key': {
        const key = args[1];
        if (!key) {
          console.error('Error: No key provided.');
          process.exit(1);
        }
        await hid.keyPress(key);
        console.log(`[PiCUA] Key pressed: ${key}`);
        break;
      }
      case 'shortcut': {
        const keysString = args.slice(1).join(' ');
        if (!keysString) {
          console.error('Error: No keys provided for shortcut.');
          process.exit(1);
        }
        // Split by comma and trim spaces
        const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        if (keys.length === 0) {
          console.error('Error: sendShortcut requires a non-empty array of keys');
          process.exit(1);
        }
        await hid.sendShortcut(keys);
        console.log(`[PiCUA] Shortcut sent: ${keys.join(',')}`);
        break;
      }
      case 'mouse-move': {
        const x = parseInt(args[1]);
        const y = parseInt(args[2]);
        if (isNaN(x) || isNaN(y)) {
          console.error('Error: Invalid coordinates for mouse-move.');
          process.exit(1);
        }
        await hid.moveMouseAbs(x, y);
        console.log(`[PiCUA] Mouse moved to (${x}, ${y})`);
        break;
      }
      
      case 'click': {
        let clickType = 'single'; // default single click
        let button = 'left'; // default left button
        
        // Parse arguments intelligently
        if (args[1]) {
          if (args[1] === 'double' || args[1] === 'single') {
            clickType = args[1];
            button = args[2] || 'left';
          } else if (args[1] === 'left' || args[1] === 'right') {
            button = args[1];
            clickType = args[2] || 'single';
          }
        }
  
        if (clickType === 'double') {
          await hid.doubleClick(button);
          console.log(`[PiCUA] Double click with '${button}' button`);
        } else {
          await hid.singleClick(button);
          console.log(`[PiCUA] Single click with '${button}' button`);
        }
        break;
      }
      case 'scroll': {
        const dx = parseInt(args[1]) || 0;
        const dy = parseInt(args[2]) || 0;
        await hid.scrollWheel(dx, dy);
        console.log(`[PiCUA] Mouse scrolled by dx=${dx}, dy=${dy}`);
        break;
      }
      case 'drag': {
        const x1 = parseInt(args[1]);
        const y1 = parseInt(args[2]);
        const x2 = parseInt(args[3]);
        const y2 = parseInt(args[4]);
        const button = args[5] || 'left';

        if ([x1, y1, x2, y2].some(v => isNaN(v))) {
          console.error('Error: Invalid coordinates for drag.');
          process.exit(1);
        }
        await hid.dragMouse(x1, y1, x2, y2, button);
        console.log(`[PiCUA] Mouse dragged from (${x1},${y1}) to (${x2},${y2}) with button ${button}`);
        break;
      }
      case 'mouse': {
        if (args.length < 2) {
          console.error('Error: mouse command requires direction: up, down, left, or right.');
          process.exit(1);
        }

        const direction = args[1].toLowerCase();
        const pos = hid.getLastMousePosition();

        switch (direction) {
          case 'up': {
            const newY = Math.max(0, pos.y - 50);
            await hid.moveMouseAbs(pos.x, newY);
            console.log(`[PiCUA] Mouse moved up to (${pos.x}, ${newY})`);
            break;
          }
          case 'down': {
            const newY = pos.y + 50;
            await hid.moveMouseAbs(pos.x, newY);
            console.log(`[PiCUA] Mouse moved down to (${pos.x}, ${newY})`);
            break;
          }
          case 'left': {
            const newX = Math.max(0, pos.x - 50);
            await hid.moveMouseAbs(newX, pos.y);
            console.log(`[PiCUA] Mouse moved left to (${newX}, ${pos.y})`);
            break;
          }
          case 'right': {
            const newX = pos.x + 50;
            await hid.moveMouseAbs(newX, pos.y);
            console.log(`[PiCUA] Mouse moved right to (${newX}, ${pos.y})`);
            break;
          }
          default:
            console.error('Error: Invalid mouse direction. Use up, down, left, or right.');
            process.exit(1);
        }
        break;
      }
      case 'snapshot': {
        try {
          const imageBuffer = await snapshot.getSnapshot();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `screen-${timestamp}.jpg`;
          console.log(`[PiCUA] Snapshot captured successfully: ${filename}`);
          //You could save to file here if needed
          require('fs').writeFileSync(filename, imageBuffer);
        } catch (err) {
          console.error('[PiCUA] Failed to capture snapshot:', err.message);
          process.exit(1);
        }
        break;
      }
      case 'test': {
        try {
          await session.testConnection(config.ip, config.username, config.password);
          console.log('[PiCUA] Connection test successful!');
        } catch (err) {
          console.error('[PiCUA] Connection test failed:', err.message);
          process.exit(1);
        }
        break;
      }
      case 'status': {
        const status = await session.getStatus();
        if (status.connected) {
          console.log('[PiCUA] Status: Connected');
          console.log(`[PiCUA] PiKVM IP: ${status.ip}`);
          console.log(`[PiCUA] Username: ${status.username}`);
          console.log(`[PiCUA] Message: ${status.message}`);
        } else {
          console.log('[PiCUA] Status: Not connected');
          if (status.ip && status.username) {
            console.log(`[PiCUA] Saved credentials: ${status.username}@${status.ip}`);
            console.log(`[PiCUA] Issue: ${status.message}`);
          } else {
            console.log('[PiCUA] Run: ./cli.js login <pikvm_ip> to connect');
          }
        }
        break;
      }
      case 'config': {
        try {
          const config = await session.loadConfig();
          console.log('[PiCUA] Current Configuration:');
          console.log(`[PiCUA] PiKVM IP: ${config.ip}`);
          console.log(`[PiCUA] Username: ${config.username}`);
          console.log(`[PiCUA] Config file: ${require('path').join(process.env.HOME || process.env.USERPROFILE, '.picua-config.json')}`);
        } catch (error) {
          console.error('[PiCUA] Error loading config:', error.message);
          process.exit(1);
        }
        break;
      }
      case 'power': {
        const actionArg = args[1] ? args[1].toLowerCase() : 'on'; // default to 'on'
        
        // Map user-friendly commands to API actions
        const actionMap = {
          'on': 'on',           // Turn on (do nothing if already on)
          'off': 'off',         // Turn off (soft-off, emulates power button click)
          'long': 'off_hard',   // Long press power button (5+ seconds)
          'reset': 'reset_hard' // Emulate reset button (hardware hot reset)
        };
        
        if (!actionMap[actionArg]) {
          console.error(`[PiCUA] Error: Invalid power command '${actionArg}'`);
          console.error(`[PiCUA] Valid options:`);
          console.error(`[PiCUA]   on         - Turn on (do nothing if already on)`);
          console.error(`[PiCUA]   off        - Turn off (soft-off, emulates power button click)`);
          console.error(`[PiCUA]   long       - Long press power button (5+ seconds, force shutdown)`);
          console.error(`[PiCUA]   reset      - Emulate reset button (hardware hot reset)`);
          console.error(`[PiCUA] Example: ./cli.js power on`);
          process.exit(1);
        }
      
        const apiAction = actionMap[actionArg];
        // Check for --wait flag
        const wait = args.includes('--wait');
        
        try {
          await atx.sendAtxClick(apiAction, wait);
          const waitText = wait ? ' (waiting for completion)' : '';
          console.log(`[PiCUA] ATX command sent successfully: ${actionArg} → ${apiAction}${waitText}`);
        } catch (error) {
          console.error(`[PiCUA] Failed to send ATX command '${actionArg}':`, error.message);
          process.exit(1);
        }
        break;
      }
      case 'msd': {
        const subcmd = args[1];
        if (!subcmd) {
          console.log('[PiCUA] MSD (Mass Storage Device) Commands:');
          console.log('');
          console.log('  status                    Show MSD status');
          console.log('  list                      List available images');
          console.log('  upload <file> [name]      Upload local file as image');
          console.log('  upload-url <url> [name]   Upload from URL');
          console.log('  set-params [options]      Set MSD parameters');
          console.log('                             --image=<name> --cdrom=<0|1> --rw=<0|1>');
          console.log('  connect                   Connect MSD to host');
          console.log('  disconnect                Disconnect MSD from host');
          console.log('  remove <name>             Remove image');
          console.log('  reset                     Reset MSD to defaults');
          console.log('  test                      Test MSD API connectivity');
          console.log('');
          console.log('Examples:');
          console.log('  ./cli.js msd status');
          console.log('  ./cli.js msd list');
          console.log('  ./cli.js msd upload ubuntu.iso');
          console.log('  ./cli.js msd set-params --image=ubuntu.iso --cdrom=1');
          console.log('  ./cli.js msd connect');
          process.exit(0);
        }
        
        try {
          switch (subcmd) {
            case 'status': {
              const status = await msd.getStatus();
              console.log('[PiCUA] MSD Status:');
              console.log(JSON.stringify(status, null, 2));
              break;
            }
            case 'list': {
              const status = await msd.getStatus();
              if (status && status.storage && status.storage.images) {
                const images = status.storage.images;
                if (Object.keys(images).length === 0) {
                  console.log('[PiCUA] No images available');
                } else {
                  console.log('[PiCUA] Available images:');
                  for (const name in images) {
                    const image = images[name];
                    const size = image.size ? ` (${(image.size / 1024 / 1024).toFixed(2)} MB)` : '';
                    const active = image.active ? ' [ACTIVE]' : '';
                    console.log(`- ${name}${size}${active}`);
                  }
                }
              } else {
                console.log('[PiCUA] No storage information available');
              }
              break;
            }
            case 'upload': {
              const localPath = args[2];
              const imageName = args[3] || require('path').basename(localPath);
              if (!localPath) {
                console.error('[PiCUA] Error: Local file path required');
                console.error('[PiCUA] Example: ./cli.js msd upload ubuntu.iso');
                process.exit(1);
              }
              await msd.uploadImage(localPath, imageName);
              console.log(`[PiCUA] Image uploaded successfully: ${imageName}`);
              break;
            }
            case 'upload-url': {
              const url = args[2];
              const imageName = args[3];
              if (!url) {
                console.error('[PiCUA] Error: URL required');
                console.error('[PiCUA] Example: ./cli.js msd upload-url https://example.com/ubuntu.iso');
                process.exit(1);
              }
              await msd.uploadImageByUrl(url, imageName);
              console.log(`[PiCUA] Remote upload started from: ${url}`);
              break;
            }
            case 'set-params': {
              const image = args.find(a => a.startsWith('--image='))?.split('=')[1];
              const cdrom = args.find(a => a.startsWith('--cdrom='))?.split('=')[1];
              const rw = args.find(a => a.startsWith('--rw='))?.split('=')[1];
              
              if (!image && !cdrom && !rw) {
                console.error('[PiCUA] Error: At least one parameter required');
                console.error('[PiCUA] Available parameters:');
                console.error('[PiCUA]   --image=<filename>  Set the current image (e.g., ubuntu.iso)');
                console.error('[PiCUA]   --cdrom=<0|1>      Set media type (0=Flash, 1=CD-ROM)');
                console.error('[PiCUA]   --rw=<0|1>         Set read-write mode (0=read-only, 1=read-write)');
                console.error('[PiCUA] Examples:');
                console.error('[PiCUA]   ./cli.js msd set-params --image=ubuntu.iso');
                console.error('[PiCUA]   ./cli.js msd set-params --cdrom=1 --rw=0');
                console.error('[PiCUA]   ./cli.js msd set-params --image=ubuntu.iso --cdrom=1');
                process.exit(1);
              }
              
              // Validate cdrom and rw values
              if (cdrom && !['0', '1', 'true', 'false'].includes(cdrom)) {
                console.error('[PiCUA] Error: --cdrom must be 0, 1, true, or false');
                process.exit(1);
              }
              if (rw && !['0', '1', 'true', 'false'].includes(rw)) {
                console.error('[PiCUA] Error: --rw must be 0, 1, true, or false');
                process.exit(1);
              }
              
              await msd.setParams({
                image,
                cdrom: cdrom === '1' || cdrom === 'true',
                rw: rw === '1' || rw === 'true',
              });
              console.log('[PiCUA] MSD parameters set successfully');
              break;
            }
            case 'connect': {
              await msd.connect();
              console.log('[PiCUA] MSD connected successfully');
              break;
            }
            case 'disconnect': {
              await msd.disconnect();
              console.log('[PiCUA] MSD disconnected successfully');
              break;
            }
            case 'remove': {
              const imageName = args[2];
              if (!imageName) {
                console.error('[PiCUA] Error: Image name required');
                console.error('[PiCUA] Example: ./cli.js msd remove ubuntu.iso');
                process.exit(1);
              }
              await msd.removeImage(imageName);
              console.log(`[PiCUA] Image removed successfully: ${imageName}`);
              break;
            }
            case 'reset': {
              await msd.reset();
              console.log('[PiCUA] MSD reset to defaults successfully');
              break;
            }
            case 'test': {
              console.log('[PiCUA] Testing MSD API connectivity...');
              try {
                await msd.testConnection();
                console.log('[PiCUA] MSD API test completed successfully');
              } catch (error) {
                console.error('[PiCUA] ✗ MSD API test failed:', error.message);
                throw error;
              }
              break;
            }
            default: {
              console.error(`[PiCUA] Error: Unknown MSD subcommand '${subcmd}'`);
              console.error('[PiCUA] Available subcommands: status, list, upload, upload-url, set-params, connect, disconnect, remove, reset');
              console.error('[PiCUA] Example: ./cli.js msd status');
              process.exit(1);
            }
            case 'mouse-test': {
              const system = args[1]; // optional system name
              try {
                await hid.testCoordinateSystem(system);
                console.log('[PiCUA] Coordinate system test completed');
              } catch (error) {
                console.error('[PiCUA] Coordinate system test failed:', error.message);
                process.exit(1);
              }
              break;
            }
            
            case 'mouse-config': {
              const subcmd = args[1];
              if (!subcmd) {
                console.log('[PiCUA] Mouse Configuration Commands:');
                console.log('');
                console.log('  detect                    Auto-detect coordinate system and resolution');
                console.log('  set-system <system>       Set coordinate system manually');
                console.log('                           Options: centerBased, normalized, scaledNormalized, direct, percentage');
                console.log('  set-resolution <w> <h>    Set screen resolution manually');
                console.log('  show                      Show current configuration');
                console.log('  test-raw <x> <y>          Move mouse to raw PiKVM coordinates (no conversion)');
                console.log('');
                console.log('Examples:');
                console.log('  ./cli.js mouse-config detect');
                console.log('  ./cli.js mouse-config set-system centerBased');
                console.log('  ./cli.js mouse-config set-resolution 1920 1080');
                console.log('  ./cli.js mouse-config test-raw -32 -823');
                process.exit(0);
              }
              
              try {
                switch (subcmd) {
                  case 'detect': {
                    console.log('[PiCUA] Detecting coordinate system and resolution...');
                    await hid.detectScreenResolution();
                    await hid.detectCoordinateSystem();
                    console.log('[PiCUA] Detection completed');
                    break;
                  }
                  case 'set-system': {
                    const system = args[2];
                    if (!system) {
                      console.error('[PiCUA] Error: System name required');
                      console.error('[PiCUA] Available systems: centerBased, normalized, scaledNormalized, direct, percentage');
                      process.exit(1);
                    }
                    hid.setCoordinateSystem(system);
                    console.log(`[PiCUA] Coordinate system set to: ${system}`);
                    break;
                  }
                  case 'set-resolution': {
                    const width = parseInt(args[2]);
                    const height = parseInt(args[3]);
                    if (isNaN(width) || isNaN(height)) {
                      console.error('[PiCUA] Error: Invalid resolution values');
                      console.error('[PiCUA] Example: ./cli.js mouse-config set-resolution 1920 1080');
                      process.exit(1);
                    }
                    hid.setScreenResolution(width, height);
                    console.log(`[PiCUA] Screen resolution set to: ${width}x${height}`);
                    break;
                  }
                  case 'show': {
                    // This would require adding a getter function to hid.js
                    console.log('[PiCUA] Current mouse configuration:');
                    console.log('[PiCUA] (Add getter functions to hid.js to display current settings)');
                    break;
                  }
                  case 'test-raw': {
                    const x = parseFloat(args[2]);
                    const y = parseFloat(args[3]);
                    if (isNaN(x) || isNaN(y)) {
                      console.error('[PiCUA] Error: Invalid coordinates for test-raw');
                      process.exit(1);
                    }
                    await hid.moveMouseAbsDirect(x, y);
                    console.log(`[PiCUA] Mouse moved to raw PiKVM coordinates: (${x}, ${y})`);
                    break;
                  }
                  default: {
                    console.error(`[PiCUA] Error: Unknown mouse-config subcommand '${subcmd}'`);
                    console.error('[PiCUA] Available subcommands: detect, set-system, set-resolution, show, test-raw');
                    process.exit(1);
                  }
                }
              } catch (error) {
                console.error(`[PiCUA] Mouse config error: ${error.message}`);
                process.exit(1);
              }
              break;
            }
          }
        } catch (error) {
          console.error(`[PiCUA] MSD error: ${error.message}`);
          process.exit(1);
        }
        break;
      }
      default:
        console.error(`[PiCUA] Unknown command: ${cmd}`);
        console.error('[PiCUA] Run: ./cli.js help for usage information');
        process.exit(1);
    }
  } catch (err) {
    console.error('[PiCUA] Error:', err.message);
    process.exit(1);
  }
}


function printHelp() {
  console.log(`PiCUA CLI - PiKVM Control Utility

Session Management:
  ./cli.js login [ip]                    Login to PiKVM (interactive if IP not provided)
  ./cli.js logout                        Logout and remove saved credentials
  ./cli.js change-password               Change the current password
  ./cli.js status                        Show current connection status
  ./cli.js config                        Show current configuration
  ./cli.js test                          Test connection to PiKVM

Power Management:
  ./cli.js power [action] [--wait]      Send ATX power command
                                        action: on, off, long, reset (default: on)
                                        on: Turn on (do nothing if already on)
                                        off: Turn off (soft-off, emulates power button click)
                                        long: Long press power button (5+ seconds, force shutdown)
                                        reset: Emulate reset button (hardware hot reset)
                                        --wait: wait for operation to complete

Mass Storage Device (MSD):
  ./cli.js msd status                    Show MSD status
  ./cli.js msd list                      List available images
  ./cli.js msd upload <file> [name]      Upload local file as image
  ./cli.js msd upload-url <url> [name]   Upload from URL
  ./cli.js msd set-params [options]      Set MSD parameters
                                        --image=<name> --cdrom=<0|1> --rw=<0|1>
  ./cli.js msd connect                   Connect MSD to host
  ./cli.js msd disconnect                Disconnect MSD from host
  ./cli.js msd remove <name>             Remove image
  ./cli.js msd reset                     Reset MSD to defaults
  ./cli.js msd test                      Test MSD API connectivity

Control Commands:
  ./cli.js type <text> [--slow]          Type text (add --slow for slow typing)
  ./cli.js key <key>                     Press single key
  ./cli.js shortcut <keys>               Send keyboard shortcut (comma-separated keys)
  ./cli.js mouse <up|down|left|right>    Move mouse by 50 pixels in given direction
  ./cli.js mouse-move <x> <y>            Move mouse absolute position
  ./cli.js mouse-move-rel <dx> <dy>      Move mouse relative position
  ./cli.js click [type] [button]         Click mouse (type: single/double, button: left/right, defaults: single, left)
  ./cli.js scroll [dx] [dy]              Scroll mouse wheel
  ./cli.js drag <x1> <y1> <x2> <y2> [button]  Drag mouse from start to end (default button: left)
  ./cli.js snapshot                       Capture a screenshot

Utility Commands:
  ./cli.js help                          Show this help message
  ./cli.js version                       Show version information

Examples:
  ./cli.js login 192.168.1.100
  ./cli.js logout
  ./cli.js change-password
  ./cli.js status
  ./cli.js config
  ./cli.js test
  ./cli.js power on
  ./cli.js power off
  ./cli.js power long
  ./cli.js power reset --wait
  ./cli.js msd status
  ./cli.js msd list
  ./cli.js msd upload ubuntu.iso
  ./cli.js msd set-params --image=ubuntu.iso --cdrom=1
  ./cli.js msd connect
  ./cli.js type "Hello World"
  ./cli.js key Enter
  ./cli.js shortcut "Ctrl,Alt,Delete"
  ./cli.js click double right
  ./cli.js mouse up
  ./cli.js mouse down
  ./cli.js mouse left
  ./cli.js mouse right
  ./cli.js mouse-move 500 300
`);
}

main().catch((error) => {
  console.error('[PiCUA] Unexpected error:', error.message);
  process.exit(1);
});
