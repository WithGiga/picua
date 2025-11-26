import { SSEEvent, ActionResponse } from "./api";
import { logDebug } from "./logger";

export function formatSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export interface PiCUAStreamerStreamProps {
  signal: AbortSignal;
  messages: { role: "user" | "assistant"; content: string }[];
}

export abstract class PiCUAStreamerFacade {
  abstract instructions: string;

  abstract stream(
    props: PiCUAStreamerStreamProps
  ): AsyncGenerator<SSEEvent>;

  // action type is specific to the streamer implementation
  abstract executeAction(action: unknown): Promise<ActionResponse | void>;
}

export function createStreamingResponse(
  generator: AsyncGenerator<SSEEvent>
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generator) {
        controller.enqueue(new TextEncoder().encode(formatSSE(chunk)));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
