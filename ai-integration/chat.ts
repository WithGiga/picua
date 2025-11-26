/**
 * Type definitions for chat messages and related functionality
 */
import { ActionEvent, ComputerModel, SSEEventType, PiCUAAction } from "./api";

/**
 * Role of a chat message
 */
export type MessageRole = "user" | "assistant" | "system" | "action";

/**
 * Base interface for all chat messages
 */
export interface BaseChatMessage {
  id: string;
  role: MessageRole;
}

/**
 * User message in the chat
 */
export interface UserChatMessage extends BaseChatMessage {
  role: "user";
  content: string;
}

/**
 * Assistant message in the chat
 */
export interface AssistantChatMessage extends BaseChatMessage {
  role: "assistant";
  content: string;
  model: ComputerModel;
}

/**
 * System message in the chat
 */
export interface SystemChatMessage extends BaseChatMessage {
  role: "system";
  content: string;
  isError?: boolean;
}

/**
 * Action message in the chat
 */
export interface ActionChatMessage extends BaseChatMessage {
  role: "action";
  action: PiCUAAction;
  status?: "pending" | "completed" | "failed";
}

/**
 * Union type for all chat messages
 */
export type ChatMessage =
  | UserChatMessage
  | AssistantChatMessage
  | SystemChatMessage
  | ActionChatMessage;

/**
 * Chat state interface
 */
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Parsed SSE event from the server
 */
export interface ParsedSSEEvent {
  type: SSEEventType;
  content?: any;
  action?: ActionEvent["action"];
}

/**
 * Chat API request parameters
 */
export interface ChatApiRequest {
  messages: { role: MessageRole; content: string }[];
  anthropicApiKey: string;
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  content: string;
  anthropicApiKey: string;
}
