import { NextResponse } from 'next/server';
import { getBotStatus, setBotStatus } from '@/lib/botStatus';

export async function POST() {
  try {
    const isRunning = await getBotStatus();
    const newStatus = !isRunning;

    await setBotStatus(newStatus);

    return NextResponse.json({ running: newStatus });
  } catch (error: any) {
    console.error('Error toggling bot:', error);
    return NextResponse.json(
      { error: 'Failed to toggle bot', message: error.message },
      { status: 500 }
    );
  }
}
