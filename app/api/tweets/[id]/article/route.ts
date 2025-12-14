import { NextRequest, NextResponse } from 'next/server';
import { tweets } from '@/lib/db';
import { generateArticle } from '@/app/actions/generateArticle';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { language = 'both' } = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid tweet ID' },
        { status: 400 }
      );
    }

    // Get tweet data
    const allTweets = await tweets.getAll(10000, 0);
    const tweet = allTweets.find((t: any) => t.id === id);

    if (!tweet) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    // Generate article
    const articleData = await generateArticle(
      tweet.text,
      tweet.media_urls || '',
      language as 'english' | 'french' | 'both'
    );

    // Update tweet with article data
    const articleEnglish = articleData.en ? JSON.stringify(articleData.en) : null;
    const articleFrench = articleData.fr ? JSON.stringify(articleData.fr) : null;
    
    await tweets.updateArticle(id, articleEnglish, articleFrench);

    return NextResponse.json({ 
      success: true,
      article: articleData
    });
  } catch (error: any) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article', message: error.message },
      { status: 500 }
    );
  }
}
