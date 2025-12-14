import { NextRequest, NextResponse } from 'next/server';
import { runBotCycle } from '@/lib/bot';

export async function GET(request: NextRequest) {
    // Verify Cron Secret if present (Vercel Cron)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        console.log('[Cron] Starting scheduled bot cycle...');
        const result = await runBotCycle();

        if (result.success) {
            return NextResponse.json({ success: true, processed: result.accountsProcessed });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[Cron] Execution error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
