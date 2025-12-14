import { NextResponse } from 'next/server';
import { runBotCycle } from '@/lib/bot';

/**
 * Manual trigger endpoint to run a bot cycle immediately
 * Useful for testing and for serverless environments where intervals don't persist
 */
export async function POST() {
  try {
    const result = await runBotCycle(true);
    return NextResponse.json({
      success: result.success,
      message: result.message || 'Bot cycle completed',
      accountsProcessed: result.accountsProcessed,
      error: result.error
    });
  } catch (error: any) {
    console.error('Error running bot cycle:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run bot cycle',
        message: error.message
      },
      { status: 500 }
    );
  }
}
