import { NextRequest, NextResponse } from 'next/server';
import { tweets } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { ignored } = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid tweet ID' },
        { status: 400 }
      );
    }

    const success = await tweets.updateIgnored(id, ignored);
    if (!success) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ignored });
  } catch (error: any) {
    console.error('Error updating tweet ignore status:', error);
    return NextResponse.json(
      { error: 'Failed to update tweet', message: error.message },
      { status: 500 }
    );
  }
}
