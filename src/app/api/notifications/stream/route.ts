import { NextRequest } from "next/server";
import { layOwnerIdTuRequest } from "@/lib/auth";
import { ensureNotificationSchema, listUserNotifications, subscribeUserNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(request: NextRequest) {
  const ownerId = layOwnerIdTuRequest(request);
  if (!ownerId) return new Response("Unauthorized", { status: 401 });

  await ensureNotificationSchema();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          closed = true;
        }
      };

      const initial = await listUserNotifications(ownerId, 1, 0);
      send("ready", { unreadCount: initial.unreadCount });

      const unsubscribe = subscribeUserNotifications(ownerId, (notification) => {
        send("notification", notification);
      });

      const ping = setInterval(() => send("ping", { at: new Date().toISOString() }), 25000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ping);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
