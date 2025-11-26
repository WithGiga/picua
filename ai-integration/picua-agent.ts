/**
 * PiCUA Agent - AI-powered desktop automation interface
 * Integrates with PiCUA API and Anthropic's Claude for intelligent desktop control
 */

import Anthropic from "@anthropic-ai/sdk";
import { SSEEventType, SSEEvent, sleep } from "./api";
import { ActionResponse } from "./api";
// Import types from Anthropic SDK
type BetaMessageParam = any;
type BetaToolResultBlockParam = any;
type BetaToolUseBlock = any;
  
import { logError } from "./logger";

// Import PiCUA SDK
const PiCUA = require('../src/picua');

export interface PiCUAAgentConfig {
  anthropicApiKey: string;
  pikvmIp: string;
  pikvmUsername: string;
  pikvmPassword: string;
  displayWidth?: number;
  displayHeight?: number;
}

export interface PiCUAAction {
    action: string;
  [key: string]: any;
}

export interface PiCUAAgentOptions {
  maxTokens?: number;
  thinkingTokens?: number;
  model?: string;
  displayNumber?: number;
}

const DEFAULT_INSTRUCTIONS = `
You are a PiCUA Computer Use Agent - a specialized desktop automation assistant that helps users interact with their computer through visual analysis and precise desktop actions.

**CRITICAL WORKFLOW: Screenshot First, Analyze, Then Act**

1. **MANDATORY FIRST STEP: Always start by taking a screenshot** using the computer tool with action "screenshot" to see the current desktop state
2. **Carefully analyze the screenshot** to understand what's visible and available
3. **Plan your approach** based on the user's request and current screen state  
4. **Execute PiCUA actions step by step** with verification after each action
5. **Take screenshots between actions** to verify progress and adjust approach

**Your Purpose:**
- Take screenshots to analyze desktop state
- Use PiCUA commands to interact with desktop interfaces
- Navigate applications, menus, and system interfaces
- Help users accomplish visual desktop tasks
- Respond with text explanations only when no desktop interaction is needed

**IMPORTANT: You MUST take a screenshot as your first action for ANY desktop-related task. Without seeing the current screen state, you cannot effectively help the user.**

**CRITICAL KEYBOARD TOOL SELECTION:**
- Use "key" action ONLY for single keys (Delete, Escape, Enter, etc.)
- Use "shortcut" action for ALL key combinations (Ctrl+F4, Alt+Tab, Ctrl+C, etc.)
- NEVER use "key" action with combinations like "ctrl+F4" - always use "shortcut" instead

**PiCUA Actions Available:**

**Mouse Actions:**
- \`mouse-move\` (x, y): Move mouse to coordinates
- \`mouse-move-rel\` (dx, dy): Move mouse relative to current position
- \`click\` (clickType: "single"|"double", button: "left"|"right"): Click at current position
- \`scroll\`: Scroll using delta_x and delta_y values (no coordinates needed)
- \`drag\` (x1, y1, x2, y2, button?): Drag from start to end coordinates

**Keyboard Actions:**
- \`type\` (text, slow?): Type text string
- \`key\` (key): Press single key ONLY (e.g., "Delete", "ControlLeft", "ArrowDown")
  - NEVER use key for combinations like "ctrl+alt+F4" - use shortcut instead
- \`shortcut\` (keys[]): Press key combination (e.g., ["ControlLeft", "F4"], ["ControlLeft", "AltLeft", "Delete"])
  - Use this for ANY key combination, even simple ones like "ctrl+c"
  - Examples:
    - Ctrl+F4 → shortcut with ["ControlLeft", "F4"]
    - Alt+Tab → shortcut with ["AltLeft", "Tab"] 
    - Ctrl+C → shortcut with ["ControlLeft", "KeyC"]
    - Delete → key with "Delete"
    - Escape → key with "Escape"

**System Actions:**
- \`snapshot\`: Take screenshot of desktop
- \`power\` (powerAction: "on"|"off"|"long"|"reset", wait?): Control system power
- \`wait\` (duration): Wait specified milliseconds

**IMPORTANT: Verification Process**
After each action:
1. Take a screenshot to see the result
2. Analyze if the action achieved the expected outcome
3. Explain your observation: "I can see that..."
4. If incorrect, try a different approach
5. Only proceed to next step when current step is verified successful

Remember: You are a visual desktop automation agent. Your strength is seeing and interacting with the desktop interface through PiCUA commands.
`;

export class PiCUAAgent {
  private anthropic: any;
  private picua: any;
  private config: PiCUAAgentConfig;
  private options: PiCUAAgentOptions;

  constructor(config: PiCUAAgentConfig, options: PiCUAAgentOptions = {}) {
    this.config = config;
    this.options = {
      maxTokens: 4096,
      thinkingTokens: 1024,
      model: "claude-sonnet-4-20250514",
      displayNumber: 1,
      ...options
    };
    
    this.anthropic = new (Anthropic as any)({ apiKey: config.anthropicApiKey });
    this.picua = new PiCUA();
    
    // Initialize PiCUA connection
    this.initializePiCUA();
  }

  private async initializePiCUA(): Promise<void> {
    try {
      await this.picua.login(this.config.pikvmIp, this.config.pikvmUsername, this.config.pikvmPassword);
      console.log('PiCUA initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PiCUA:', error);
      throw new Error(`PiCUA initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Map common invalid keys to valid PiKVM keys
  private mapKeyToValidKey(key: string): string {
    const keyMap: { [key: string]: string } = {
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

  // Valid PiKVM keys from keymap.csv
  private validKeys = [
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

  // Validate if a key is supported by PiKVM
  private isValidKey(key: string): boolean {
    return this.validKeys.includes(key);
  }

  // Validate and map key to valid PiKVM key
  private validateAndMapKey(key: string): string | null {
    const mappedKey = this.mapKeyToValidKey(key);
    if (this.isValidKey(mappedKey)) {
      return mappedKey;
    }
    return null; // Invalid key
  }

  /**
   * Scale coordinates from AI agent (1024x768) to PiKVM (1920x1080)
   */
  private scaleCoordinates(agentX: number, agentY: number): { pikvmX: number, pikvmY: number } {
    // Scale from AI agent coordinate space (1024x768) to PiKVM coordinate space (1920x1080)
    const screenshotX = Math.round((agentX / 1024) * 1920);
    const screenshotY = Math.round((agentY / 768) * 1080);
    
    // Clamp to PiKVM screen bounds (top-left origin)
    const clampedX = Math.max(0, Math.min(screenshotX, 1919)); // Clamp to 0-1919
    const clampedY = Math.max(0, Math.min(screenshotY, 1079)); // Clamp to 0-1079
    
    console.log(`Agent coordinates: (${agentX}, ${agentY})`);
    console.log(`PiKVM pixel coordinates: (${screenshotX}, ${screenshotY})`);
    console.log(`Clamped pixel coordinates: (${clampedX}, ${clampedY})`);
    
    return { pikvmX: clampedX, pikvmY: clampedY };
  }

  /**
   * Helper function to preserve content for conversation history
   */
  private preserveContentForConversation(content: any[]): any[] {
    // Preserve all content blocks including thinking blocks to maintain proper conversation structure
    // According to Anthropic docs: "We recommend you include thinking blocks from previous turns"
    return content;
  }

  /**
   * Execute a single PiCUA action and return the result
   */
  async executeAction(action: PiCUAAction): Promise<ActionResponse | void> {
    try {
      // Create a mock tool use block for the action
      const mockTool: BetaToolUseBlock = {
        id: 'direct-action',
        type: 'tool_use',
        name: 'computer',
        input: action
      };
      
      const result = await this.executePiCUAAction(mockTool);
      return {
        action: "picua_desktop_action",
        data: {
          type: "computer_screenshot",
          image_url: result?.screenshot || ""
        }
      };
    } catch (error) {
      console.error('Action execution failed:', error);
      throw error;
    }
  }

  /**
   * Stream AI responses with desktop actions
   */
  async *stream(props: {
    signal?: AbortSignal;
    messages: { role: "user" | "assistant"; content: string }[];
    instructions?: string;
  }): AsyncGenerator<SSEEvent> {
    const { messages, signal, instructions = DEFAULT_INSTRUCTIONS } = props;

    // Only use the latest user message - no conversation history
    const latestMessage = messages[messages.length - 1];
    const anthropicMessages: BetaMessageParam[] = [{
      role: latestMessage.role as "user" | "assistant",
      content: [{ type: "text", text: latestMessage.content }],
    }];

    console.log('AI Agent processed messages (latest only, no history):', anthropicMessages);

    try {
      // Check if aborted
      if (signal?.aborted) {
        yield {
          type: SSEEventType.DONE,
          content: "Generation stopped by user",
        };
        return;
      }

      // Start the multi-agent conversation loop
      console.log('Starting multi-agent conversation loop...');
      
      let conversationMessages = [...anthropicMessages];
      let maxIterations = 15; // Allow more iterations for complex tasks
      let iteration = 0;
      let taskComplete = false;

      while (iteration < maxIterations && !taskComplete) {
        iteration++;
        console.log(`Multi-agent loop iteration ${iteration}`);

        // Check if aborted
        if (signal?.aborted) {
          yield {
            type: SSEEventType.DONE,
            content: "Generation stopped by user",
          };
          return;
        }

        // Get response from AI
        const response = await this.anthropic.beta.messages.create({
          model: this.options.model!,
          max_tokens: this.options.maxTokens!,
          messages: conversationMessages,
          system: instructions + "\n\nIMPORTANT: Continue working on the user's request until it is fully completed. After each action, take a screenshot and explicitly evaluate: 'I have evaluated step X...' Only stop when you confirm the task has been completed successfully. Do not stop prematurely - the user expects you to complete the entire task.",
          tools: [
            {
              type: "computer_20250124",
              name: "computer",
              display_width_px: 1024,
              display_height_px: 768,
              display_number: this.options.displayNumber || 1,
            }
          ],
          betas: ["computer-use-2025-01-24"],
          thinking: { type: "enabled", budget_tokens: this.options.thinkingTokens! },
        });

        console.log(`Response received in iteration ${iteration}. Content blocks: ${response.content.length}`);

        // Process all response blocks
        const toolUseBlocks: BetaToolUseBlock[] = [];
        for (const block of response.content) {
          console.log(`Processing block type: ${block.type}`);
          
          if (block.type === "text") {
            console.log('AI text response:', block.text.substring(0, 100) + '...');
            yield {
              type: SSEEventType.REASONING,
              content: block.text,
            };
          } else if (block.type === "thinking") {
            console.log('AI thinking:', block.thinking.substring(0, 100) + '...');
            yield {
              type: SSEEventType.REASONING,
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

        // Execute all tool use blocks in this iteration
        for (const toolUse of toolUseBlocks) {
          console.log('AI wants to use tool:', toolUse.input.action);
          
          // Execute the action
          yield {
            type: SSEEventType.ACTION,
            action: toolUse.input as PiCUAAction,
          };

          const actionResult = await this.executePiCUAAction(toolUse);

          yield {
            type: SSEEventType.ACTION_COMPLETED,
          };

          // Provide feedback for the action
          if (actionResult?.message) {
            yield {
              type: SSEEventType.REASONING,
              content: actionResult.message,
            };
          }

          // Prepare tool result
          let actionToolResultContent: BetaToolResultBlockParam["content"];
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
              // Take screenshot for verification
              const screenshotBuffer = await this.picua.getSnapshot();
              const screenshotBase64 = screenshotBuffer.toString("base64");

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
                text: `Action completed. Screenshot error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              },
            ];
          }

          // Add tool result to conversation
          const actionToolResult: BetaToolResultBlockParam = {
            type: "tool_result",
            tool_use_id: toolUse.id,
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
          type: SSEEventType.REASONING,
          content: "Task processing completed after maximum iterations. If the task is not finished, please try a more specific request or check if additional actions are needed.",
        };
      } else {
        console.log(`Multi-agent loop completed successfully in ${iteration} iterations.`);
      }

      // Final completion
      yield {
        type: SSEEventType.DONE,
      };

    } catch (error) {
      logError("PICUA_AGENT", error);
      yield {
        type: SSEEventType.ERROR,
        content: "An error occurred with the PiCUA Computer Use Agent. Please try again.",
      };
    }
  }

  /**
   * Execute PiCUA action based on tool input
   */
  private async executePiCUAAction(tool: BetaToolUseBlock): Promise<{screenshot?: string, message?: string}> {
    const toolName = tool.name;
    const input = tool.input as PiCUAAction;

    if (toolName !== "computer") {
      console.log(`Unknown tool: ${toolName}`);
      return { message: `Unknown tool: ${toolName}` };
    }

    console.log('PiCUA Action:', JSON.stringify(input, null, 2));
    
    try {
      switch (input.action) {
        // Mouse Actions
        case "mouse_move": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          return { message: `Mouse moved to (${x}, ${y})` };
        }

        case "left_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          await this.picua.singleClick('left');
          return { message: `Left clicked at (${x}, ${y})` };
        }

        case "right_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          await this.picua.singleClick('right');
          return { message: `Right clicked at (${x}, ${y})` };
        }

        case "double_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          await this.picua.doubleClick('left');
          return { message: `Double clicked at (${x}, ${y})` };
        }

        case "left_click_drag": {
          // Handle both coordinate formats for drag start and end points
          const x1 = input.start_x || (input.start_coordinate && input.start_coordinate[0]) || 0;
          const y1 = input.start_y || (input.start_coordinate && input.start_coordinate[1]) || 0;
          const x2 = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y2 = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.dragMouse(x1, y1, x2, y2, 'left');
          return { message: `Dragged from (${x1}, ${y1}) to (${x2}, ${y2})` };
        }

        // New fine-grained mouse controls (Claude Sonnet 3.7+)
        case "left_mouse_down": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          // PiCUA doesn't have direct mouse down, simulate with click
          await this.picua.singleClick('left');
          return { message: `Left mouse down at (${x}, ${y})` };
        }

        case "left_mouse_up": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          // Mouse up is implicit after mouse down in PiCUA
          return { message: `Left mouse up at (${x}, ${y})` };
        }

        case "middle_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          // PiCUA doesn't have middle click, use right click as fallback
          await this.picua.singleClick('right');
          return { message: `Middle clicked at (${x}, ${y})` };
        }

        case "triple_click": {
          // Handle both coordinate formats: array [x, y] or individual properties x, y
          const x = input.x || (input.coordinate && input.coordinate[0]) || 0;
          const y = input.y || (input.coordinate && input.coordinate[1]) || 0;
          await this.picua.moveMouseAbs(x, y);
          // Simulate triple click with multiple clicks
          await this.picua.doubleClick('left');
          await this.picua.singleClick('left');
          return { message: `Triple clicked at (${x}, ${y})` };
        }

        case "scroll": {
          // Use delta_x and delta_y directly from input (no coordinates needed)
          const dx = input.delta_x || 0;
          const dy = input.delta_y || 0;
          
          console.log(`Scroll: delta_x=${dx}, delta_y=${dy}`);
          
          await this.picua.scrollWheel(dx, dy);
          return { message: `Scrolled delta_x=${dx} delta_y=${dy}` };
        }

        // Keyboard Actions
        case "type": {
          const text = input.text || '';
          await this.picua.typeText(text, false);
          return { message: `Typed: "${text}"` };
        }

        case "key": {
          const key = input.text || '';
          
          // Single key only - no combinations allowed
          const mappedKey = this.validateAndMapKey(key);
          if (!mappedKey) {
            return { message: `Invalid key: ${key}. Use valid PiKVM keys only. For key combinations, use the 'shortcut' action instead.` };
          }
          await this.picua.keyPress(mappedKey);
          return { message: `key ${mappedKey}` };
        }

        case "hold_key": {
          const key = input.text || '';
          const duration = input.duration || 1000;
          // PiCUA doesn't have hold key, simulate with key press and wait
          await this.picua.keyPress(key);
          await sleep(duration);
          return { message: `Held key ${key} for ${duration}ms` };
        }

        // System Actions
        case "screenshot":
        case "snapshot": {
          try {
            const screenshotBuffer = await this.picua.getSnapshot();
            const screenshotBase64 = screenshotBuffer.toString("base64");
            return { 
              screenshot: screenshotBase64,
              message: "Screenshot captured successfully" 
            };
          } catch (error) {
            console.error('Screenshot failed:', error);
            return { 
              message: `Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please check PiKVM connection.` 
            };
          }
        }

        case "wait": {
          const duration = input.duration || 1000;
          await sleep(duration);
          return { message: `Waited ${duration}ms` };
        }

        case "cursor_position": {
          // PiCUA doesn't have direct cursor position query, return current position estimate
          return { message: "Cursor position requested (PiCUA doesn't support position queries)" };
        }

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

  /**
   * Get current PiCUA connection status
   */
  async getStatus(): Promise<any> {
    return await this.picua.getStatus();
  }

  /**
   * Test PiCUA connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.picua.testConnection();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PiCUAAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Update options
   */
  updateOptions(newOptions: Partial<PiCUAAgentOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}

/**
 * Factory function to create a PiCUA Agent instance
 */
export function createPiCUAAgent(
  config: PiCUAAgentConfig,
  options?: PiCUAAgentOptions
): PiCUAAgent {
  return new PiCUAAgent(config, options);
}

/**
 * Utility function to convert Anthropic computer use actions to PiCUA actions
 */
export function mapComputerActionToPiCUA(action: any): PiCUAAction {
  switch (action.action) {
    case "mouse_move":
      return {
        action: "mouse-move",
        x: action.coordinate[0],
        y: action.coordinate[1]
      };
    
    case "left_click":
      return {
        action: "click",
        clickType: "single",
        button: "left",
        x: action.coordinate[0],
        y: action.coordinate[1]
      };
    
    case "type":
      return {
        action: "type",
        text: action.text
      };
    
    case "screenshot":
      return {
        action: "snapshot"
      };
    
    default:
      return {
        action: action.action,
        ...action
      };
  }
}
