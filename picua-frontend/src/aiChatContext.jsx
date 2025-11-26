import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import * as picuaApi from './picuaApi';

const AIChatContext = createContext();

export function AIChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");
  const abortControllerRef = useRef(null);

  const parseSSEEvent = (data) => {
    try {
      if (!data || data.trim() === "") {
        return null;
      }

      if (data.startsWith("data: ")) {
        const jsonStr = data.substring(6).trim();
        if (!jsonStr) return null;
        return JSON.parse(jsonStr);
      }

      const match = data.match(/data: ({.*})/);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }

      return JSON.parse(data);
    } catch (e) {
      console.error("Error parsing SSE event:", e, "Data:", data.substring(0, 200));
      return null;
    }
  };

  const sendMessage = async (content) => {
    if (isLoading || !anthropicApiKey) return;

    setIsLoading(true);
    setError(null);

    const userMessage = {
      role: "user",
      content,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setMessages(prev => [...prev, userMessage]);

    abortControllerRef.current = new AbortController();

    try {
      const apiMessages = messages
        .concat(userMessage)
        .filter(msg => msg.role === "user" || msg.role === "assistant")
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await picuaApi.streamChatMessage(
        apiMessages,
        anthropicApiKey,
        abortControllerRef.current.signal
      );

      const reader = response.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            const parsedEvent = parseSSEEvent(buffer);
            if (parsedEvent && parsedEvent.type === 'done') {
              setMessages(prev => [...prev, {
                role: "system",
                id: `system-${Date.now()}`,
                content: "Task completed",
              }]);
              setIsLoading(false);
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

          switch (parsedEvent.type) {
            case 'action':
              if (parsedEvent.action) {
                setMessages(prev => [...prev, {
                  role: "action",
                  id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  action: parsedEvent.action,
                  status: "pending",
                }]);
              }
              break;

            case 'reasoning':
              if (typeof parsedEvent.content === "string") {
                setMessages(prev => [...prev, {
                  role: "assistant",
                  id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  content: parsedEvent.content,
                }]);
              }
              break;

            case 'done':
              setMessages(prev => [...prev, {
                role: "system",
                id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: parsedEvent.content || "Task completed",
              }]);
              setIsLoading(false);
              break;

            case 'error':
              setError(parsedEvent.content);
              setMessages(prev => [...prev, {
                role: "system",
                id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                content: parsedEvent.content,
                isError: true,
              }]);
              setIsLoading(false);
              break;

            case 'action_completed':
              setMessages(prev => {
                const lastActionIndex = [...prev]
                  .reverse()
                  .findIndex(msg => msg.role === "action");

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
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error sending message:", error);
        setError(error.message);
      }
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
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Error stopping generation:", error);
        }
        setIsLoading(false);
      }
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const content = input.trim();
    setInput("");
    sendMessage(content);
  }, [input, sendMessage]);

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

  return <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>;
}

export function useAIChat() {
  const context = useContext(AIChatContext);
  if (context === undefined) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
}
