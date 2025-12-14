import { NextResponse } from 'next/server';
import { getBotStatus } from '@/lib/botStatus';

export async function GET() {
  try {
    const running = await getBotStatus();
    return NextResponse.json({ running });
  } catch (error: any) {
    console.error('Error fetching bot status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bot status', message: error.message },
      { status: 500 }
    );
  }
}
