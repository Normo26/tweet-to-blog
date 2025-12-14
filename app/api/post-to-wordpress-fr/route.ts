import { NextRequest, NextResponse } from 'next/server';
import { publishToWordPress } from '@/lib/wordpress';

export async function POST(request: NextRequest) {
  try {
    const { title, content, imageUrl, status } = await request.json();

    const result = await publishToWordPress({
      title,
      content,
      imageUrl,
      language: 'french',
      status: status || 'publish',
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        post_id: result.post_id,
        link: result.link,
      });
    } else {
      return NextResponse.json(
        {
          error: result.error,
          details: result.details,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in post-to-wordpress-fr API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}

