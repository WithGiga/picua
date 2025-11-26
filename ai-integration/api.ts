/**
 * Type definitions for PiCUA Computer API and SSE events
 */

// Define PiCUA-specific action types
export interface PiCUAAction {
  action: string;
  [key: string]: any;
}

/**
 * Model types supported by PiCUA
 */
export type ComputerModel = "anthropic";

/**
 * SSE event types for client communication
 */
export enum SSEEventType {
  ACTION = "action",
  REASONING = "reasoning",
  DONE = "done",
  ERROR = "error",
  ACTION_COMPLETED = "action_completed",
}

/**
 * Base interface for all SSE events
 */
export interface BaseSSEEvent {
  type: SSEEventType;
}

/**
 * Action event with details about computer action being performed
 */
export interface ActionEvent extends BaseSSEEvent {
  type: SSEEventType.ACTION;
  action: PiCUAAction;
}

/**
 * Reasoning event with AI's explanation for an action
 */
export interface ReasoningEvent extends BaseSSEEvent {
  type: SSEEventType.REASONING;
  content: string;
}

/**
 * Done event indicating completion
 */
export interface DoneEvent extends BaseSSEEvent {
  type: SSEEventType.DONE;
  content?: string; // Final AI response output
}

/**
 * Error event with error details
 */
export interface ErrorEvent extends BaseSSEEvent {
  type: SSEEventType.ERROR;
  content: string;
}


/**
 * Action completed event with details about the completed action
 */
export interface ActionCompletedEvent extends BaseSSEEvent {
  type: SSEEventType.ACTION_COMPLETED;
}

/**
 * Union type of all possible SSE events
 */
export type SSEEvent =
  | ActionEvent
  | ReasoningEvent
  | DoneEvent
  | ErrorEvent
  | ActionCompletedEvent;

/**
 * Response from action execution
 */
export type ActionResponse = {
  action: string;
  data: {
    type: "computer_screenshot";
    image_url: string;
  };
};

/**
 * Helper function to sleep for a specified duration
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
