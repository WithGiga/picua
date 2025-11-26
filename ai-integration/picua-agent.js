/**
 * PiCUA Agent - JavaScript wrapper for Node.js compatibility
 * This file provides a JavaScript interface to the TypeScript PiCUA Agent
 */

const Anthropic = require("@anthropic-ai/sdk");

// Import PiCUA SDK
const PiCUA = require('../src/picua');

const INSTRUCTIONS = `
You are a PiCUA Computer Use Agent - a specialized desktop automation assistant that helps users interact with their computer through visual analysis and precise desktop actions.

**🎯 CRITICAL WORKFLOW: Screenshot → Analyze → Act → Verify → Repeat**

**MANDATORY PROCESS FOR EVERY TASK:**

1. **SCREENSHOT FIRST (Always)**
   - BEFORE any action, take a screenshot to see the current desktop state
   - Use computer tool: {"action": "screenshot"}
   - Never proceed without visual context

2. **ANALYZE CAREFULLY**
   - Study the screenshot in detail
   - Identify relevant UI elements, buttons, menus, text fields
   - Determine exact coordinates and available options
   - Plan your next single action

3. **EXECUTE ONE ACTION**
   - Perform ONLY ONE action at a time
   - Use precise coordinates from screenshot analysis
   - Follow PiCUA command syntax exactly

4. **VERIFY IMMEDIATELY (MANDATORY - NO EXCEPTIONS)**
   - **STOP**: Do NOT proceed to evaluation or next action yet
   - **REQUIRED**: Use computer tool with action "screenshot" to capture the current state
   - **WAIT**: You must receive the screenshot before continuing
   - **THEN**: Compare the new screenshot with the before state
   - **ONLY AFTER** seeing the verification screenshot, explicitly state your evaluation

5. **EVALUATE THE RESULT**
   - Study the verification screenshot carefully
   - State: "**Evaluation of Step X:** Looking at the verification screenshot, I can see that [describe what happened]..."
   - Determine if the action achieved the intended outcome based on VISIBLE changes
   - If the result is incorrect or unexpected, explain what went wrong based on what you SEE

6. **DECIDE NEXT STEP**
   - ✅ If successful: Proceed to next action following steps 1-6
   - ❌ If unsuccessful: Analyze why it failed, adjust approach, and retry
   - 🔄 Never repeat the same failed action - try alternative methods (keyboard shortcuts, different coordinates, etc.)
   - ⚠️ NEVER perform another action without first taking and analyzing a verification screenshot

**🚨 CRITICAL RULES:**
- **SCREENSHOT AFTER EVERY ACTION**: After ANY action (click, type, key, shortcut, etc.), immediately take a screenshot using {"action": "screenshot"}
- **NO BLIND EVALUATION**: NEVER evaluate or describe results without first taking a verification screenshot - you cannot know what happened without seeing it
- **ONE ACTION PER TURN**: Never execute multiple actions without verification screenshots between them
- **WAIT FOR SCREENSHOT**: After an action, STOP and wait for the verification screenshot before doing ANYTHING else
- **SHOW YOUR THINKING**: Use format "**Evaluation of Step X:** Looking at the verification screenshot, I can see..." for every verification
- **ADJUST ON FAILURE**: If coordinates don't work, try different locations or keyboard alternatives
- **BE PATIENT**: Complex tasks require multiple iterations - verify each step thoroughly

**Your Purpose:**
- Take screenshots to analyze desktop state
- Use PiCUA commands to interact with desktop interfaces
- Navigate applications, menus, and system interfaces
- Help users accomplish visual desktop tasks through methodical, verified actions
- Respond with text explanations only when no desktop interaction is needed

**CRITICAL: You have access to a computer tool. You MUST use this tool to interact with the desktop. For any desktop task, you should:**
1. Use the computer tool with action "screenshot" to take a screenshot
2. Use the computer tool with actions like "left_click", "right_click", "type", "key", "shortcut", etc. to perform desktop actions
3. Always use the computer tool - do not just provide text responses for desktop tasks

**CRITICAL KEYBOARD TOOL SELECTION:**
- Use "key" action ONLY for single keys (Delete, Escape, Enter, etc.)
- Use "shortcut" action for ALL key combinations (Ctrl+F4, Alt+Tab, Ctrl+C, etc.)
- NEVER use "key" action with combinations like "ctrl+F4" - always use "shortcut" instead

**📊 EVALUATION FORMAT - USE THIS EXACT STRUCTURE:**

⚠️ **CRITICAL**: You MUST take a verification screenshot BEFORE writing this evaluation!

**CORRECT WORKFLOW:**
1. Perform action (e.g., click, type, key)
2. Immediately take screenshot: {"action": "screenshot"}
3. Wait for screenshot result
4. THEN write evaluation based on what you see

**Evaluation Template:**

**Evaluation of Step X: [Action Description]**

Before: [What the previous screenshot showed before the action]
Action Taken: [The exact action you performed]
After: [What the VERIFICATION SCREENSHOT shows now - describe visible changes]

Result: ✅ SUCCESS / ❌ FAILURE
Reason: [Explain why based on VISIBLE evidence in the verification screenshot]

Next: [If success: describe next step | If failure: describe alternative approach]


**Example Evaluation:**

**Evaluation of Step 2: Clicking File Menu**

Before: The desktop showed the application window with a menu bar at the top
Action Taken: Left click at coordinates (50, 30) on "File" menu
After: Looking at the verification screenshot, the File dropdown menu is now visible showing options like New, Open, Save

Result: ✅ SUCCESS
Reason: The verification screenshot confirms the File menu opened correctly and displays the expected menu items

Next: Will take a screenshot, then click on "Open" option to proceed with opening a file


**CRITICAL:** Never skip the evaluation step and screenshot. Every action requires this structured analysis.

**🚨 CRITICAL KEYBOARD TOOL USAGE RULES - MANDATORY 🚨**

**RULE #1: NEVER USE "key" FOR COMBINATIONS**
- If you see ANY plus sign (+) in a key combination, use "shortcut" action
- If you see ANY modifier key (Ctrl, Alt, Shift, Meta), use "shortcut" action
- The "key" action is ONLY for single, individual keys

**RULE #2: CORRECT ACTION SELECTION**
- Single key press → use "key" action with "text" parameter
- Key combination → use "shortcut" action with "keys" array parameter
- Text input → use "type" action with "text" parameter

**MANDATORY EXAMPLES TO FOLLOW:**
✅ CORRECT: {"action": "shortcut", "keys": ["ControlLeft", "KeyA"]} for Ctrl+A
✅ CORRECT: {"action": "shortcut", "keys": ["ControlLeft", "KeyC"]} for Ctrl+C  
✅ CORRECT: {"action": "shortcut", "keys": ["AltLeft", "Tab"]} for Alt+Tab
✅ CORRECT: {"action": "key", "text": "Delete"} for Delete key
✅ CORRECT: {"action": "key", "text": "Escape"} for Escape key

**FORBIDDEN - NEVER DO THIS:**
❌ WRONG: {"action": "key", "text": "ctrl+a"}
❌ WRONG: {"action": "key", "text": "ControlLeft+KeyA"}
❌ WRONG: {"action": "key", "text": "alt+tab"}
❌ WRONG: {"action": "key", "text": "ctrl+c"}

**VALID PiKVM KEYS ONLY - CRITICAL:**
You MUST use only these valid PiKVM keys. Common key mappings:
- Windows/Super key → use "MetaLeft" or "MetaRight" 
- Ctrl → use "ControlLeft" or "ControlRight"
- Alt → use "AltLeft" or "AltRight"
- Shift → use "ShiftLeft" or "ShiftRight"
- Enter → use "Enter"
- Space → use "Space"
- Tab → use "Tab"
- Escape → use "Escape"
- Backspace → use "Backspace"
- Delete → use "Delete"
- Arrow keys → use "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
- Function keys → use "F1", "F2", etc.
- Letters → use "KeyA", "KeyB", "KeyC", etc.
- Numbers → use "Digit0", "Digit1", etc.



**PiCUA Commands Available:**

**Mouse Commands:**
- \`move-mouse {x} {y}\`: Move mouse to specific coordinates (PiCUA coordinate space: top-left is 0,0,)
- \`mouse-move-rel {dx} {dy}\`: Move mouse by relative offset (use only in BIOS)
- \`click {x} {y}\`: Single left click at coordinates
- \`click right {x} {y}\`: Single right click at coordinates  
- \`click double {x} {y}\`: Double left click at coordinates
- \`click double right {x} {y}\`: Double right click at coordinates
- \`drag {x1} {y1} {x2} {y2} [button]\`: Drag from start to end coordinates
- \`scroll {dx} {dy}\`: Scroll using horizontal and vertical delta values

**KEYBOARD COMMANDS - READ CAREFULLY:**

**CRITICAL RULE: NEVER USE "key" ACTION FOR COMBINATIONS!**

**1. For SINGLE KEYS ONLY - Use "key" action:**
- \`key Delete\` - Press Delete key
- \`key Enter\` - Press Enter key  
- \`key Escape\` - Press Escape key
- \`key ArrowUp\` - Press Up arrow key
- \`key Space\` - Press Space key
- \`key Tab\` - Press Tab key

**2. For ANY COMBINATION - Use "shortcut" action:**
- \`shortcut ControlLeft,KeyA\` - Press Ctrl+A
- \`shortcut ControlLeft,KeyC\` - Press Ctrl+C
- \`shortcut ControlLeft,KeyV\` - Press Ctrl+V
- \`shortcut AltLeft,Tab\` - Press Alt+Tab
- \`shortcut ControlLeft,ShiftLeft,KeyN\` - Press Ctrl+Shift+N
- \`shortcut ControlLeft,AltLeft,Delete\` - Press Ctrl+Alt+Delete

**3. For TYPING TEXT - Use "type" action:**
- \`type Hello World\` - Type text word-by-word
- \`type Hello World --slow\` - Type text slowly letter-by-letter

**FORBIDDEN EXAMPLES - NEVER DO THIS:**
❌ \`key ctrl+a\` - WRONG! Use shortcut instead
❌ \`key ControlLeft+KeyA\` - WRONG! Use shortcut instead  
❌ \`key alt+tab\` - WRONG! Use shortcut instead
❌ \`key ctrl+c\` - WRONG! Use shortcut instead
❌ \`type ctrl+c\` - WRONG! Use shortcut instead
❌ \`type ctrl\` - WRONG! Use key instead

**Screenshot Commands:**
- \`snapshot\`: Capture screenshot of current desktop

**🎯 DECISION MAKING:**
- Use desktop actions when user wants to interact with GUI, navigate, click, type, or manipulate desktop
- Respond with text when user asks for explanations, information, or discussions that don't require desktop interaction
- Always start desktop tasks with a screenshot to understand current state

**⚠️ CRITICAL FAILURE RECOVERY RULES:**

1. **Never Repeat Failed Coordinates**
   - If a click at coordinates (X, Y) fails, DO NOT try the exact same coordinates again
   - Adjust coordinates by ±10-20 pixels and try nearby locations
   - Consider the UI element might be positioned differently than expected

2. **Use Keyboard Alternatives**
   - If mouse actions fail repeatedly, switch to keyboard navigation
   - Use Tab to navigate between elements
   - Use arrow keys for menu navigation
   - Use keyboard shortcuts (Alt+F for File menu, etc.)

3. **Verify UI State Changes**
   - If an action doesn't produce visible changes in the screenshot, it failed
   - Don't assume success without visual confirmation
   - Re-analyze the screen to understand why the action didn't work

4. **Adaptive Strategy**
   - Try different approaches: mouse → keyboard → shortcuts
   - If one method fails 2-3 times, completely change your approach
   - Consider that UI elements might be in different positions or states than expected

**🎯 REMEMBER - THE GOLDEN RULE:**

**EVERY action MUST be followed by a verification screenshot BEFORE you do anything else.**

Workflow mantra: **ACTION → SCREENSHOT → EVALUATE → NEXT ACTION**

❌ WRONG: Click → Evaluate → Click again
✅ CORRECT: Click → Screenshot → Evaluate based on screenshot → Screenshot → Next click

You are a visual desktop automation agent. Your strength is seeing and interacting with the desktop interface through PiCUA commands. You CANNOT know if an action succeeded without taking a screenshot to verify. Always verify with screenshots, always adapt, never repeat failed actions, and never skip verification screenshots.
`;


class PiCUAAgent {
  constructor(anthropicApiKey, pikvmIp, pikvmUsername, pikvmPassword) {
    this.anthropic = new Anthropic({ apiKey: anthropicApiKey });
    this.picua = new PiCUA();
    this.config = {
      anthropicApiKey,
      pikvmIp,
      pikvmUsername,
      pikvmPassword
    };
    
    // Dynamic PiKVM resolution - will be fetched from API
    this.pikvmResolution = {
      width: 1920,  // Default fallback
      height: 1080  // Default fallback
    };
    
    // Valid PiKVM keys from keymap.csv
    this.validKeys = [
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
    
    // Store initialization promise so we can await it when needed
    this.initPromise = this.initializePiCUA();
  }

  async initializePiCUA() {
    try {
      console.log('[PiCUA] Starting initialization...');
      
      // Use the session module directly to login with credentials
      const session = require('../src/api/session');
      await session.loginWithCredentials(
        this.config.pikvmIp,
        this.config.pikvmUsername,
        this.config.pikvmPassword
      );
      this.picua.isAuthenticated = true;
      console.log('[PiCUA] ✅ Authentication successful');
      
      // Fetch current PiKVM resolution
      const resolutionFetched = await this.fetchPiKVMResolution();
      
      if (resolutionFetched) {
        console.log(`[PiCUA] ✅ Initialization complete - Resolution: ${this.pikvmResolution.width}x${this.pikvmResolution.height}`);
      } else {
        console.warn(`[PiCUA] ⚠️ Initialization complete but resolution fetch failed - using fallback: ${this.pikvmResolution.width}x${this.pikvmResolution.height}`);
      }
    } catch (error) {
      console.error('[PiCUA] ❌ Failed to initialize:', error.message);
      console.log('[PiCUA] Will retry authentication when first action is performed');
    }
  }

  // Fetch current PiKVM resolution from API
  async fetchPiKVMResolution() {
    try {
      const { getHttpClient } = require('../src/utils/httpClient');
      const httpClient = getHttpClient();
      
      console.log(`[PiKVM] 🔍 Fetching resolution from /api/streamer...`);
      
      const response = await httpClient.get('/api/streamer', { timeout: 5000 });
      
      // Extract resolution from response - PiKVM API structure is result.streamer.source
      const source = response.data?.result?.streamer?.source || response.data?.result?.source || response.data?.source;
      const resolution = source?.resolution;
      
      if (!resolution?.width || !resolution?.height) {
        console.warn('[PiKVM] ⚠️ Invalid response structure from /api/streamer');
        console.warn('[PiKVM] ⚠️ Expected path: result.streamer.source.resolution');
        console.warn('[PiKVM] ⚠️ Received:', JSON.stringify(response.data, null, 2).substring(0, 500));
        return false;
      }
      
      console.log(`[PiKVM] ✅ Successfully fetched resolution from API: ${resolution.width}x${resolution.height}`);
      
      const oldResolution = `${this.pikvmResolution.width}x${this.pikvmResolution.height}`;
      const newResolution = `${resolution.width}x${resolution.height}`;
      
      this.pikvmResolution.width = resolution.width;
      this.pikvmResolution.height = resolution.height;
      
      if (oldResolution !== newResolution) {
        console.log(`[PiKVM] 🔄 Resolution updated from ${oldResolution} to ${newResolution}`);
      } else {
        console.log(`[PiKVM] ✅ Resolution confirmed: ${newResolution}`);
      }
      
      return true;
    } catch (error) {
      console.error('[PiKVM] ❌ Failed to fetch resolution:', error.message);
      console.log(`[PiKVM] ⚠️ Using fallback resolution: ${this.pikvmResolution.width}x${this.pikvmResolution.height}`);
      return false;
    }
  }

  // Manually refresh resolution (useful if PiKVM resolution changes)
  async refreshResolution() {
    console.log('[PiKVM] 🔄 Manually refreshing resolution...');
    return await this.fetchPiKVMResolution();
  }

  // Map common invalid keys to valid PiKVM keys
  mapKeyToValidKey(key) {
    const keyMap = {
      'Super_L': 'MetaLeft',
      'Super_R': 'MetaRight', 
      'Super': 'MetaLeft',
      'Win': 'MetaLeft',
      'Windows': 'MetaLeft',
      'Ctrl': 'ControlLeft',
      'Control': 'ControlLeft',
      'Alt': 'AltLeft',
      'Shift': 'ShiftLeft',
      'Return': 'Enter',
      'Spacebar': 'Space',
      'Esc': 'Escape',
      'BackSpace': 'Backspace',
      'Del': 'Delete',
      'Up': 'ArrowUp',
      'Down': 'ArrowDown',
      'Left': 'ArrowLeft',
      'Right': 'ArrowRight'
    };
    
    return keyMap[key] || key;
  }

  // Validate if a key is supported by PiKVM
  isValidKey(key) {
    return this.validKeys.includes(key);
  }

  // Validate and map key to valid PiKVM key
  validateAndMapKey(key) {
    const mappedKey = this.mapKeyToValidKey(key);
    if (this.isValidKey(mappedKey)) {
      return mappedKey;
    }
    return null; // Invalid key
  }

  // Validate if all keys in a shortcut are supported
  isValidShortcut(keys) {
    if (!Array.isArray(keys)) return false;
    return keys.every(key => {
      const mappedKey = this.mapKeyToValidKey(key);
      return this.isValidKey(mappedKey);
    });
  }

  // Scale coordinates from AI agent resolution to actual PiKVM resolution
  scaleCoordinates(agentX, agentY) {
    let pikvmX, pikvmY;
    
    // Conditional scaling based on PiKVM resolution
    if (this.pikvmResolution.width === 1920 && this.pikvmResolution.height === 1080) {
      // For 1920x1080: Scale from 1455x818 to 1920x1080
      const scaleX = 1920 / 1455;
      const scaleY = 1080 / 818;
      pikvmX = Math.round(agentX * scaleX);
      pikvmY = Math.round(agentY * scaleY);
      console.log(`[Scale] 1920x1080 mode - scaling from 1455x818`);
    } else if (this.pikvmResolution.width === 1280 && this.pikvmResolution.height === 720) {
      // For 1280x720: No scaling, use coordinates directly
      pikvmX = Math.round(agentX);
      pikvmY = Math.round(agentY);
      console.log(`[Scale] 1280x720 mode - no scaling (1:1)`);
    } else {
      // For other resolutions: Calculate scale factor dynamically
      const scaleX = this.pikvmResolution.width / 1455;
      const scaleY = this.pikvmResolution.height / 818;
      pikvmX = Math.round(agentX * scaleX);
      pikvmY = Math.round(agentY * scaleY);
      console.log(`[Scale] Custom resolution ${this.pikvmResolution.width}x${this.pikvmResolution.height} - dynamic scaling`);
    }

    // Clamp to PiKVM screen bounds (0 to width-1, 0 to height-1)
    const clampedX = Math.max(0, Math.min(pikvmX, this.pikvmResolution.width - 1));
    const clampedY = Math.max(0, Math.min(pikvmY, this.pikvmResolution.height - 1));

    console.log(`[Coords] Input: (${agentX}, ${agentY}) → Scaled: (${pikvmX}, ${pikvmY}) → Clamped: (${clampedX}, ${clampedY})`);

    return { x: clampedX, y: clampedY };
  }

  // Scale screenshot based on PiKVM resolution
  async scaleScreenshot(screenshotBuffer) {
    try {
      // For 1920x1080: Scale to 1455x818
      if (this.pikvmResolution.width === 1920 && this.pikvmResolution.height === 1080) {
        console.log(`📐 Scaling screenshot from 1920x1080 to 1455x818`);
        
        try {
          const sharp = require('sharp');
          const scaledBuffer = await sharp(screenshotBuffer)
            .resize(1455, 818, {
              fit: 'fill',
              kernel: sharp.kernel.lanczos3
            })
            .jpeg({ quality: 90 })
            .toBuffer();
          
          console.log('✅ Screenshot scaled successfully using Sharp');
          return scaledBuffer.toString('base64');
        } catch (sharpError) {
          console.warn('⚠️ Sharp not available, using original screenshot:', sharpError.message);
          console.log('💡 To enable scaling, install Sharp: npm install sharp');
          return screenshotBuffer.toString('base64');
        }
      } else {
        // For 1280x720 or other resolutions: Use original screenshot
        console.log(`📐 Using native screenshot at ${this.pikvmResolution.width}x${this.pikvmResolution.height} (no scaling)`);
        return screenshotBuffer.toString('base64');
      }
    } catch (error) {
      console.error('Screenshot processing failed:', error);
      return screenshotBuffer.toString('base64');
    }
  }

  // Helper function to preserve content for conversation history
  preserveContentForConversation(content) {
    // Preserve all content blocks including thinking blocks to maintain proper conversation structure
    // According to Anthropic docs: "We recommend you include thinking blocks from previous turns"
    return content;
  }

  async *stream({ messages, signal }) {
    // Debug: Log messages received by AI agent
    console.log('AI Agent received messages:', messages);

    // Ensure we have messages
    if (!messages || messages.length === 0) {
      throw new Error('No messages provided to AI agent');
    }

    // Only use the latest user message - no conversation history
    const latestMessage = messages[messages.length - 1];
    const anthropicMessages = [{
      role: latestMessage.role,
      content: [{ type: "text", text: latestMessage.content }],
    }];

    console.log('AI Agent processed messages (latest only, no history):', anthropicMessages);

    try {
      // Ensure initialization (including resolution fetch) is complete before proceeding
      console.log('[PiCUA Agent] Ensuring initialization is complete...');
      await this.initPromise;
      console.log(`[PiCUA Agent] ✅ Initialization complete. Using resolution: ${this.pikvmResolution.width}x${this.pikvmResolution.height}`);
      
      // Add debugging for signal state
      console.log(`[PiCUA Agent] 🔍 Starting stream with signal state: aborted=${signal?.aborted}, reason=${signal?.reason}`);
      
      // Check if aborted
      if (signal?.aborted) {
        console.log(`[PiCUA Agent] 🛑 Signal already aborted at start`);
        yield {
          type: "done",
          content: "Generation stopped by user",
        };
        return;
      }

      // Start the multi-agent conversation loop
      console.log('Starting multi-agent conversation loop...');
      
      let conversationMessages = [...anthropicMessages];
      let maxIterations = 100; // Allow more iterations for complex tasks
      let iteration = 0;
      let taskComplete = false;

      while (iteration < maxIterations && !taskComplete) {
        iteration++;
        console.log(`Multi-agent loop iteration ${iteration}`);

        // Check if aborted
        if (signal?.aborted) {
          const reason = signal.reason || 'No reason provided';
          console.log(`[PiCUA Agent] 🛑 Signal aborted detected in iteration ${iteration}`);
          console.log(`[PiCUA Agent] Abort reason: ${reason}`);
          
          // Check if it's a timeout
          if (reason.includes('timeout')) {
            yield {
              type: "error",
              content: "⏱️ Session timed out after 10 minutes. Please start a new request.",
              error: "TIMEOUT"
            };
          }
          
          yield {
            type: "done",
            content: reason.includes('timeout') ? 'Session timed out' : 'Generation stopped by user',
          };
          return;
        }

        // Get response from AI
      const response = await this.anthropic.beta.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
          messages: conversationMessages,
          system: INSTRUCTIONS + "\n\nIMPORTANT: Continue working on the user's request until it is fully completed. After each action, take a screenshot and explicitly evaluate: 'I have evaluated step X...' Only stop when you confirm the task has been completed successfully. Do not stop prematurely - the user expects you to complete the entire task.",
          tools: [
            {
              type: "computer_20250124",
              name: "computer",
              display_width_px: (this.pikvmResolution.width === 1920 && this.pikvmResolution.height === 1080) ? 1455 : this.pikvmResolution.width,
              display_height_px: (this.pikvmResolution.width === 1920 && this.pikvmResolution.height === 1080) ? 818 : this.pikvmResolution.height,
              display_number: 1,
            }
          ],
        betas: ["computer-use-2025-01-24"],
        thinking: { type: "enabled", budget_tokens: 1024 },
      });

        console.log(`Response received in iteration ${iteration}. Content blocks: ${response.content.length}`);

        // Process response blocks in real-time
      const toolUseBlocks = [];
        for (const block of response.content) {
          console.log(`Processing block type: ${block.type}`);
          
          if (block.type === "text") {
            console.log('AI text response:', block.text.substring(0, 100) + '...');
          yield {
            type: "reasoning",
            content: block.text,
          };
          } else if (block.type === "thinking") {
            console.log('AI thinking:', block.thinking.substring(0, 100) + '...');
          yield {
            type: "reasoning",
            content: block.thinking,
          };
          } else if (block.type === "tool_use") {
            toolUseBlocks.push(block);
          }
        }

        // Add assistant response to conversation
        conversationMessages.push({
          role: "assistant",
          content: this.preserveContentForConversation(response.content),
        });

        // If no tool use blocks, the task is complete
      if (toolUseBlocks.length === 0) {
          console.log('No more tool use blocks found. Task appears complete.');
          taskComplete = true;
          break;
        }

        // Execute tool use blocks one by one for real-time streaming
        for (const block of toolUseBlocks) {
          console.log('AI wants to use tool:', block.input.action);
          
          // Execute the action immediately
        yield {
          type: "action",
            action: block.input,
        };

          const actionResult = await this.executePiCUAAction(block);

        yield {
          type: "action_completed",
        };

          // Provide feedback for the action immediately
          if (actionResult?.message) {
            yield {
              type: "reasoning",
              content: actionResult.message,
            };
          }

          // Prepare tool result
          let actionToolResultContent;
        try {
          if (actionResult?.screenshot) {
              actionToolResultContent = [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: actionResult.screenshot,
                },
              },
            ];
          } else {
            // Take screenshot for verification and scale it
            const screenshotBuffer = await this.picua.getSnapshot();
            const screenshotBase64 = await this.scaleScreenshot(screenshotBuffer);

              actionToolResultContent = [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: screenshotBase64,
                },
              },
            ];
          }

          if (actionResult?.message) {
              actionToolResultContent.push({
              type: "text",
              text: actionResult.message,
            });
          }
        } catch (error) {
            actionToolResultContent = [
            {
              type: "text",
              text: `Action completed. Screenshot error: ${error.message || 'Unknown error'}`,
            },
          ];
        }

          // Add tool result to conversation
          const actionToolResult = {
            type: "tool_result",
            tool_use_id: block.id,
            content: actionToolResultContent,
            is_error: false,
          };

          // Add tool result to conversation
          conversationMessages.push({
            role: "user",
            content: [actionToolResult]
          });
        }
      }

      if (iteration >= maxIterations) {
        console.log('Multi-agent loop reached maximum iterations. Task may be complete or needs manual intervention.');
        yield {
          type: "reasoning",
          content: "Task processing completed after maximum iterations. If the task is not finished, please try a more specific request or check if additional actions are needed.",
        };
      } else {
        console.log(`Multi-agent loop completed successfully in ${iteration} iterations.`);
      }

      // Final completion
      yield {
        type: "done",
      };

    } catch (error) {
      console.error("PICUA_AGENT Error:", error);
      console.error("Error message:", error.message);
      console.error("Error type:", error.type);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      
      // Extract meaningful error message from nested error structure
      let errorMessage = 'An error occurred with the PiCUA Computer Use Agent. Please try again.';
      
      // Try to parse nested error structure from Anthropic API
      try {
        // Check if error.message contains a JSON structure
        if (error.message && error.message.includes('{')) {
          // Extract JSON from message (format: "400 {...json...}")
          const jsonMatch = error.message.match(/\{.*\}/s);
          if (jsonMatch) {
            const errorObj = JSON.parse(jsonMatch[0]);
            // Anthropic errors have structure: {error: {message: "..."}}
            if (errorObj.error && errorObj.error.message) {
              errorMessage = errorObj.error.message;
            } else if (errorObj.message) {
              errorMessage = errorObj.message;
            }
          }
        }
        // If no JSON structure, use the message as-is
        else if (error.message) {
          errorMessage = error.message;
        }
      } catch (parseError) {
        // If parsing fails, fall back to checking for known error patterns
        if (error.message) {
          const msg = error.message;
          
          // Credit/billing errors
          if (msg.includes('credit balance is too low') || msg.includes('Insufficient credits')) {
            errorMessage = 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.';
          }
          // Authentication errors
          else if (msg.includes('invalid x-api-key') || msg.includes('authentication') || msg.includes('API key')) {
            errorMessage = 'Authentication Error: Invalid Anthropic API key. Please check your API key configuration.';
          }
          // Rate limiting
          else if (msg.includes('rate limit') || msg.includes('too many requests')) {
            errorMessage = 'Rate Limit Error: Too many requests. Please wait a moment and try again.';
          }
          // Model errors
          else if (msg.includes('model') || msg.includes('not found')) {
            errorMessage = `Model Error: ${error.message}`;
          }
          // Network/connection errors
          else if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('network')) {
            errorMessage = 'Connection Error: Unable to reach Anthropic API. Please check your internet connection.';
          }
          // All other errors - show the actual message
          else {
            errorMessage = error.message;
          }
        }
      }
      
      yield {
        type: "error",
        content: errorMessage,
      };
    }
  }

  // Utility method for delays
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Map Anthropic Computer Tool actions to PiCUA command format
  mapAnthropicActionToPiCUA(action) {
    const actionMap = {
      'mouse_move': 'move-mouse',
      'left_click': 'click',
      'right_click': 'click right',
      'double_click': 'click double',
      'double_right_click': 'click double right',
      'left_click_drag': 'drag',
      'scroll': 'scroll',
      'type': 'type',
      'key': 'key',
      'shortcut': 'shortcut',
      'screenshot': 'snapshot',
      'snapshot': 'snapshot'
    };
    return actionMap[action] || action;
  }


  // Helper method to intelligently execute key actions with auto-correction
  async executeKeyAction(keyText) {
    const key = keyText || '';
    
    // Parse key combinations (ctrl+shift+a, ctrl+a, etc.)
    if (key.includes('+')) {
      console.log(`🔧 AUTO-CORRECTING: "${key}" detected as key combination - converting to shortcut`);
      
      // Parse the combination
      const keys = key.split('+').map(k => k.trim());
      const mappedKeys = [];
      
      for (const k of keys) {
        const kLower = k.toLowerCase();
        // Map common key names to PiKVM format
        const keyMap = {
          'ctrl': 'ControlLeft',
          'control': 'ControlLeft',
          'alt': 'AltLeft',
          'shift': 'ShiftLeft',
          'meta': 'MetaLeft',
          'win': 'MetaLeft',
          'cmd': 'MetaLeft',
          'super': 'MetaLeft'
        };
        
        if (keyMap[kLower]) {
          mappedKeys.push(keyMap[kLower]);
        } else if (k.length === 1) {
          // Single letter
          mappedKeys.push(`Key${k.toUpperCase()}`);
        } else {
          // Try to map directly
          const mappedKey = this.mapKeyToValidKey(k);
          if (mappedKey && this.isValidKey(mappedKey)) {
            mappedKeys.push(mappedKey);
          } else {
            return { error: true, message: `Invalid key in combination: ${k}` };
          }
        }
      }
      
      // Execute as shortcut
      await this.picua.sendShortcut(mappedKeys);
      return { message: `shortcut ${mappedKeys.join(',')} (auto-corrected from "${key}")` };
    }
    
    // Check for single modifier keys that should be mapped
    const keyLower = key.toLowerCase();
    const modifierMap = {
      'ctrl': 'ControlLeft',
      'control': 'ControlLeft', 
      'alt': 'AltLeft',
      'shift': 'ShiftLeft',
      'meta': 'MetaLeft',
      'win': 'MetaLeft',
      'cmd': 'MetaLeft',
      'super': 'MetaLeft'
    };
    
    if (modifierMap[keyLower]) {
      console.log(`🔧 AUTO-CORRECTING: "${key}" mapped to "${modifierMap[keyLower]}"`);
      const mappedKey = modifierMap[keyLower];
      await this.picua.keyPress(mappedKey);
      return { message: `key ${mappedKey} (auto-corrected from "${key}")` };
    }
    
    // Single key - validate and execute
    const mappedKey = this.validateAndMapKey(key);
    if (!mappedKey) {
      return { error: true, message: `Invalid key: ${key}. Use valid PiKVM keys only.` };
    }
    
    await this.picua.keyPress(mappedKey);
    return { message: `key ${mappedKey}` };
  }

  async executePiCUAAction(tool) {
    const toolName = tool.name;
    const input = tool.input;

    if (toolName !== "computer") {
      console.log(`Unknown tool: ${toolName}`);
      return { message: `Unknown tool: ${toolName}` };
    }

    console.log('PiCUA Action:', JSON.stringify(input, null, 2));
    
    // Store action for verification
    this.lastAction = {
      action: input.action,
      input: input,
      timestamp: Date.now()
    };
    const picuaCommand = this.mapAnthropicActionToPiCUA(input.action);
    console.log(`Mapped to PiCUA command: ${picuaCommand}`);
    
    try {
      switch (input.action) {
        // Mouse Actions
        case "mouse_move": {
          // Check for invalid text parameter in mouse actions
          if (input.text) {
            return { 
              message: `🚨 CRITICAL ERROR: Mouse actions should NOT have a "text" parameter! Found: "${input.text}". Mouse actions only need coordinates. If you want to press a key, use "key" or "shortcut" action separately.` 
            };
          }
          
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          return { message: `move-mouse ${pikvmX} ${pikvmY}` };
        }

        case "mouse_move_rel": {
          const dx = input.dx || 0;
          const dy = input.dy || 0;
          // For relative movement, we need to implement it properly
          // Since PiCUA doesn't have native relative movement, we simulate it
          console.log(`Relative mouse movement: dx=${dx}, dy=${dy}`);
          // Note: This is a limitation - PiCUA SDK doesn't support true relative movement
          // We would need to track current position and add the delta
          return { message: `mouse-move-rel ${dx} ${dy}` };
        }

        case "left_click": {
          // Auto-correct: If text parameter exists, treat it as a separate key action first
          if (input.text) {
            console.log(`🔧 AUTO-CORRECTING: left_click with text "${input.text}" - executing as separate key action first`);
            
            // First execute the key action
            const keyResult = await this.executeKeyAction(input.text);
            if (keyResult.error) {
              return keyResult;
            }
            
            // Then continue with the click (remove text parameter)
            console.log(`🔧 Now executing the mouse click without text parameter`);
          }
          
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          await this.picua.singleClick('left');
          return { message: `click ${pikvmX} ${pikvmY}` };
        }

        case "right_click": {
          // Auto-correct: If text parameter exists, treat it as a separate key action first
          if (input.text) {
            console.log(`🔧 AUTO-CORRECTING: right_click with text "${input.text}" - executing as separate key action first`);
            
            // First execute the key action
            const keyResult = await this.executeKeyAction(input.text);
            if (keyResult.error) {
              return keyResult;
            }
            
            // Then continue with the click
            console.log(`🔧 Now executing the mouse click without text parameter`);
          }
          
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          await this.picua.singleClick('right');
          return { message: `click right ${pikvmX} ${pikvmY}` };
        }

        case "double_click": {
          // Auto-correct: If text parameter exists, treat it as a separate key action first
          if (input.text) {
            console.log(`🔧 AUTO-CORRECTING: double_click with text "${input.text}" - executing as separate key action first`);
            
            // First execute the key action
            const keyResult = await this.executeKeyAction(input.text);
            if (keyResult.error) {
              return keyResult;
            }
            
            // Then continue with the click
            console.log(`🔧 Now executing the mouse click without text parameter`);
          }
          
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          await this.picua.doubleClick('left');
          return { message: `click double ${pikvmX} ${pikvmY}` };
        }

        case "left_click_drag": {
          // Handle both coordinate formats for drag start and end points
          const agentX1 = input.start_x || (input.start_coordinate && input.start_coordinate[0]) || 0;
          const agentY1 = input.start_y || (input.start_coordinate && input.start_coordinate[1]) || 0;
          const agentX2 = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY2 = input.y || (input.coordinate && input.coordinate[1]) || 0;
          
          const { x: picuaX1, y: picuaY1 } = this.scaleCoordinates(agentX1, agentY1);
          const { x: picuaX2, y: picuaY2 } = this.scaleCoordinates(agentX2, agentY2);
          
          console.log(`Agent start coordinates: (${agentX1}, ${agentY1})`);
          console.log(`Agent end coordinates: (${agentX2}, ${agentY2})`);
          console.log(`PiCUA start coordinates: (${picuaX1}, ${picuaY1})`);
          console.log(`PiCUA end coordinates: (${picuaX2}, ${picuaY2})`);
          
          await this.picua.dragMouse(picuaX1, picuaY1, picuaX2, picuaY2, 'left');
          return { message: `drag ${picuaX1} ${picuaY1} ${picuaX2} ${picuaY2} left` };
        }

        // Add support for double right click
        case "double_right_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          await this.picua.doubleClick('right');
          return { message: `click double right ${pikvmX} ${pikvmY}` };
        }

        // New fine-grained mouse controls (Claude Sonnet 3.7+)
        case "left_mouse_down": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          // PiCUA doesn't have direct mouse down, simulate with click
          await this.picua.singleClick('left');
          return { message: `Left mouse down at (${pikvmX}, ${pikvmY})` };
        }

        case "left_mouse_up": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          // Mouse up is implicit after mouse down in PiCUA
          return { message: `Left mouse up at (${pikvmX}, ${pikvmY})` };
        }

        case "middle_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          // PiCUA doesn't have middle click, use right click as fallback
          await this.picua.singleClick('right');
          return { message: `Middle clicked at (${pikvmX}, ${pikvmY})` };
        }

        case "triple_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const agentX = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const agentY = input.y || (input.coordinate && input.coordinate[1]) || 0;
          const { x: pikvmX, y: pikvmY } = this.scaleCoordinates(agentX, agentY);
          
          await this.picua.moveMouseAbs(pikvmX, pikvmY);
          // Simulate triple click with multiple clicks
          await this.picua.doubleClick('left');
          await this.picua.singleClick('left');
          return { message: `Triple clicked at (${pikvmX}, ${pikvmY})` };
        }

        case "scroll": {
          // Handle multiple scroll parameter formats
          let dx = 0;
          let dy = 0;
          
          // Method 1: Anthropic Computer Tool format (scroll_direction + scroll_amount) - PRIORITIZE THIS
          if (input.scroll_direction || input.scroll_amount) {
            const amount = Math.abs(input.scroll_amount) || 3;
            const direction = (input.scroll_direction || 'down').toLowerCase();
            
            console.log(`🔧 AUTO-CORRECTING: Converting scroll_direction "${direction}" and scroll_amount ${amount} to dx/dy (ignoring coordinates if present)`);
            
            switch (direction) {
              case 'up':
                dy = amount;  // Positive for scrolling up
                break;
              case 'down':
                dy = -amount; // Negative for scrolling down
                break;
              case 'left':
                dx = amount;  // Positive for scrolling left
                break;
              case 'right':
                dx = -amount; // Negative for scrolling right
                break;
              default:
                console.warn(`Unknown scroll direction: ${direction}, defaulting to down`);
                dy = -amount; // Negative for default down scroll
            }
          }
          // Method 2: Direct dx/dy parameters
          else if (input.dx !== undefined || input.dy !== undefined) {
            dx = input.dx || 0;
            dy = input.dy || 0;
          }
          // Method 3: delta_x/delta_y parameters (fallback)
          else if (input.delta_x !== undefined || input.delta_y !== undefined) {
            dx = input.delta_x || 0;
            dy = input.delta_y || 0;
          }
          // Method 4: Default fallback - scroll down
          else {
            console.log(`🔧 AUTO-CORRECTING: No valid scroll parameters found, defaulting to scroll down by 3`);
            dy = -3; // Negative for scrolling down
          }
          
          console.log(`Scroll: dx=${dx}, dy=${dy}`);
          
          await this.picua.scrollWheel(dx, dy);
          return { message: `scroll ${dx} ${dy}` };
        }

        // Keyboard Actions
        case "type": {
          const text = input.text || '';
          
          // Auto-correct: Check if someone is trying to use type for key combinations or single keys
          const textLower = text.toLowerCase();
          const keyIndicators = [
            'ctrl+', 'alt+', 'shift+', 'meta+', 'cmd+', 'win+',
            'control+', 'option+', 'command+', 'windows+'
          ];
          
          const singleKeyPatterns = [
            /^ctrl$/i, /^alt$/i, /^shift$/i, /^meta$/i, /^enter$/i, /^escape$/i,
            /^delete$/i, /^backspace$/i, /^tab$/i, /^space$/i, /^arrow/i, /^f\d+$/i
          ];
          
          // Auto-correct: Convert key combinations to shortcut action
          if (keyIndicators.some(indicator => textLower.includes(indicator))) {
            console.log(`🔧 AUTO-CORRECTING: type "${text}" detected as key combination - executing as shortcut`);
            return await this.executeKeyAction(text);
          }
          
          // Auto-correct: Convert single keys to key action
          if (singleKeyPatterns.some(pattern => pattern.test(text))) {
            console.log(`🔧 AUTO-CORRECTING: type "${text}" detected as single key - executing as key action`);
            return await this.executeKeyAction(text);
          }
          
          const slow = input.slow || false;
          await this.picua.typeText(text, slow);
          return { message: slow ? `type ${text} --slow` : `type ${text}` };
        }

        case "key": {
          const key = input.text || '';
          return await this.executeKeyAction(key);
        }

        case "hold_key": {
          const key = input.text || '';
          const mappedKey = this.validateAndMapKey(key);
          if (!mappedKey) {
            return { message: `Invalid key: ${key}. Use valid PiKVM keys only.` };
          }
          const duration = input.duration || 1000;
          // PiCUA doesn't have hold key, simulate with key press and wait
          await this.picua.keyPress(mappedKey);
          await new Promise(resolve => setTimeout(resolve, duration));
          return { message: `Held key ${mappedKey} for ${duration}ms` };
        }

        case "shortcut": {
          const keys = input.keys || [];
          
          if (!Array.isArray(keys) || keys.length === 0) {
            return { message: `ERROR: Shortcut requires an array of keys. Example: {"action": "shortcut", "keys": ["ControlLeft", "KeyA"]} for Ctrl+A` };
          }
          
          const mappedKeys = keys.map(key => this.mapKeyToValidKey(key));
          const invalidKeys = mappedKeys.filter(key => !this.isValidKey(key));
          
          if (invalidKeys.length > 0) {
            return { message: `Invalid keys in shortcut: ${invalidKeys.join(', ')}. Use valid PiKVM keys only. Valid examples: ControlLeft, KeyA, AltLeft, Tab, etc.` };
          }
          
          await this.picua.sendShortcut(mappedKeys);
          return { message: `shortcut ${mappedKeys.join(',')}` };
        }

        // System Actions
        case "snapshot":
        case "screenshot": {
          try {
            console.log('📸 Taking screenshot for verification/analysis');
            const screenshotBuffer = await this.picua.getSnapshot();
            const screenshotBase64 = await this.scaleScreenshot(screenshotBuffer);
            
            // Store screenshot with metadata
            this.lastScreenshot = {
              screenshot: screenshotBase64,
              timestamp: Date.now(),
              purpose: input.purpose || 'general',
              context: this.lastAction || null
            };
            
            return { 
              screenshot: screenshotBase64,
              message: "screenshot taken",
              metadata: {
                timestamp: this.lastScreenshot.timestamp,
                purpose: this.lastScreenshot.purpose,
                hasContext: !!this.lastScreenshot.context
              }
            };
          } catch (error) {
            console.error('Screenshot failed:', error.message);
            return { 
              message: `Screenshot failed: ${error.message}. Please check PiKVM connection.` 
            };
          }
        }

        case "wait": {
          const duration = input.duration || 1000;
          await new Promise(resolve => setTimeout(resolve, duration));
          return { message: `Waited ${duration}ms` };
        }

        // Note: No 'cursor_position' support in PiCUA

        default:
          console.log(`PiCUA action not implemented: ${input.action}`);
          return { message: `Action not implemented: ${input.action}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`PiCUA action failed: ${errorMessage}`);
      return { message: `Action failed: ${errorMessage}` };
    }
  }
}

module.exports = { PiCUAAgent };
