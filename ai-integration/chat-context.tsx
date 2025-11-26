"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  ChatMessage,
  ChatState,
  ParsedSSEEvent,
  SendMessageOptions,
  ActionChatMessage,
  UserChatMessage,
  AssistantChatMessage,
  SystemChatMessage,
} from "./chat";
import { ComputerModel, SSEEventType } from "./api";
import { logDebug, logError } from "./logger";

interface ChatContextType extends ChatState {
  sendMessage: (options: SendMessageOptions) => Promise<void>;
  stopGeneration: () => void;
  clearMessages: () => void;
  setInput: (input: string) => void;
  input: string;
  handleSubmit: (e: any) => string | undefined;
  anthropicApiKey: string;
  setAnthropicApiKey: (key: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: any;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const parseSSEEvent = (data: string): ParsedSSEEvent | null => {
    try {
      if (!data || data.trim() === "") {
        return null;
      }

      if (data.startsWith("data: ")) {
        const jsonStr = data.substring(6).trim();

        if (!jsonStr) {
          return null;
        }

        return JSON.parse(jsonStr);
      }

      const match = data.match(/data: ({.*})/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }

      return JSON.parse(data);
    } catch (e) {
      logError(
        "Error parsing SSE event:",
        e,
        "Data:",
        data.substring(0, 200) + (data.length > 200 ? "..." : "")
      );
      return null;
    }
  };

  const sendMessage = async ({
    content,
    anthropicApiKey: apiKey,
  }: SendMessageOptions) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const userMessage: ChatMessage = {
      role: "user",
      content,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setMessages((prev) => [...prev, userMessage]);

    abortControllerRef.current = new AbortController();

    try {
      // Only send the current user message - no conversation history
      const apiMessages = [{
        role: userMessage.role,
        content: userMessage.content,
      }];

      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          anthropicApiKey: apiKey,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          id: `system-message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: "Initializing AI desktop automation...",
        },
      ]);

      const decoder = new TextDecoder();
      let assistantMessage = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            const parsedEvent = parseSSEEvent(buffer);
            if (parsedEvent) {
              if (parsedEvent.type === SSEEventType.DONE) {
                setMessages((prev) => {
                  const systemMessage: SystemChatMessage = {
                    role: "system",
                    id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    content: "Task completed",
                  };

                  return [...prev, systemMessage];
                });
                setIsLoading(false);
              }
            }
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const events = buffer.split("\n\n");

        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.trim()) continue;

          const parsedEvent = parseSSEEvent(event);
          if (!parsedEvent) continue;

          if (process.env.NODE_ENV === "development") {
            logDebug("Parsed event:", parsedEvent);
          }

          switch (parsedEvent.type) {
            case SSEEventType.ACTION:
              if (parsedEvent.action) {
                const actionMessage: ActionChatMessage = {
                  role: "action",
                  id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  action: parsedEvent.action,
                  status: "pending",
                };

                setMessages((prev) => [...prev, actionMessage]);
              }
              break;

            case SSEEventType.REASONING:
              if (typeof parsedEvent.content === "string") {
                assistantMessage = parsedEvent.content;
                const reasoningMessage: AssistantChatMessage = {
                  role: "assistant",
                  id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  content: assistantMessage,
                  model: "anthropic",
                };
                setMessages((prev) => [...prev, reasoningMessage]);
              }
              break;

            case SSEEventType.DONE:
              setMessages((prev) => {
                const systemMessage: SystemChatMessage = {
                  role: "system",
                  id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  content: parsedEvent.content || "Task completed",
                };

                return [...prev, systemMessage];
              });
              setIsLoading(false);
              break;

            case SSEEventType.ERROR:
              setError(parsedEvent.content);
              setMessages((prev) => [
                ...prev,
                {
                  role: "system",
                  id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  content: parsedEvent.content,
                  isError: true,
                },
              ]);
              setIsLoading(false);
              break;


            case SSEEventType.ACTION_COMPLETED:
              setMessages((prev) => {
                const lastActionIndex = [...prev]
                  .reverse()
                  .findIndex((msg) => msg.role === "action");

                if (lastActionIndex !== -1) {
                  const actualIndex = prev.length - 1 - lastActionIndex;

                  return prev.map((msg, index) =>
                    index === actualIndex
                      ? { ...msg, status: "completed" }
                      : msg
                  );
                }

                return prev;
              });
              break;
          }
        }
      }
    } catch (error) {
      // Don't log AbortError as it's expected when user stops generation
      if (error instanceof Error && error.name !== "AbortError") {
        logError("Error sending message:", {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        setError(error.message);
      } else if (!(error instanceof Error)) {
        logError("Error sending message:", {
          type: typeof error,
          value: error,
          stringified: String(error)
        });
        setError("An error occurred");
      }
      // Don't set error for AbortError as it's user-initiated
      setIsLoading(false);
    }
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort(
          new DOMException("Generation stopped by user", "AbortError")
        );
        setIsLoading(false);
      } catch (error) {
        // Don't log AbortError as it's expected when user stops generation
        if (error instanceof Error && error.name !== "AbortError") {
          logError("Error stopping generation:", {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        } else if (!(error instanceof Error)) {
          logError("Error stopping generation:", {
            type: typeof error,
            value: error,
            stringified: String(error)
          });
        }
        setIsLoading(false);
      }
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    (e: any): string | undefined => {
      e.preventDefault();
      if (!input.trim()) return;

      const content = input.trim();
      setInput("");
      return content;
    },
    [input]
  );

  const value = {
    messages,
    isLoading,
    error,
    input,
    setInput,
    sendMessage,
    stopGeneration,
    clearMessages,
    handleSubmit,
    anthropicApiKey,
    setAnthropicApiKey,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
