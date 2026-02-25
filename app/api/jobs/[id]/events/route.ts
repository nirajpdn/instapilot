import { z } from "zod";

export const runtime = "nodejs";

const paramsSchema = z.object({ id: z.string().min(1) });

function encoderData(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.parse(await context.params);
  const url = new URL(request.url);
  const intervalMs = Math.min(
    10_000,
    Math.max(1_000, Number(url.searchParams.get("intervalMs") || 2500)),
  );

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      controller.enqueue(encoder.encode(encoderData("connected", { jobId: params.id, intervalMs })));
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(encoderData("tick", { jobId: params.id, at: new Date().toISOString() })),
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, intervalMs);

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15_000);

      const abortHandler = () => {
        clearInterval(heartbeat);
        clearInterval(keepAlive);
        try {
          controller.close();
        } catch {
          // stream already closed
        }
      };

      request.signal.addEventListener("abort", abortHandler, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
