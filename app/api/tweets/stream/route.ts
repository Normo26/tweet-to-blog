import { NextRequest } from 'next/server';
import { tweets } from '@/lib/db';

// Force dynamic rendering - this is a streaming endpoint
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Send initial connection message
        send(JSON.stringify({ type: 'connected', message: 'Stream connected' }));

        // Poll for new tweets every 5 seconds
        let lastCount = 0;
        const interval = setInterval(async () => {
          try {
            const allTweets = await tweets.getAll(1000, 0);
            const currentCount = allTweets.length;

            if (currentCount !== lastCount) {
              send(JSON.stringify({
                type: 'update',
                count: currentCount,
                newTweets: currentCount - lastCount,
              }));
              lastCount = currentCount;
            }
          } catch (error: any) {
            send(JSON.stringify({
              type: 'error',
              message: error.message,
            }));
          }
        }, 5000);

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      } catch (error: any) {
        send(JSON.stringify({
          type: 'error',
          message: error.message,
        }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
