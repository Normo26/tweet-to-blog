import { NextRequest, NextResponse } from 'next/server';
import { tweets } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    // Get count before deletion for response
    const countBefore = await tweets.getCount();
    
    // Delete all tweets
    const deletedCount = await tweets.deleteAll();

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} tweet(s)`,
    });
  } catch (error: any) {
    console.error('Error deleting all tweets:', error);
    return NextResponse.json(
      { error: 'Failed to delete tweets', message: error.message },
      { status: 500 }
    );
  }
}
