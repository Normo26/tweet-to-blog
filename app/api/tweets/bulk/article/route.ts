import { NextRequest, NextResponse } from 'next/server';
import { tweets } from '@/lib/db';
import { generateArticle } from '@/app/actions/generateArticle';

export async function POST(request: NextRequest) {
  try {
    const { tweetIds, language = 'both' } = await request.json();

    if (!tweetIds || !Array.isArray(tweetIds) || tweetIds.length === 0) {
      return NextResponse.json(
        { error: 'tweetIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (tweetIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 tweets can be processed at once' },
        { status: 400 }
      );
    }

    // Get all tweets
    const allTweets = await tweets.getAll(10000, 0);
    const tweetsToProcess = allTweets.filter((t: any) => 
      tweetIds.includes(t.id) && t.article_generated === 0 && t.ignored === 0
    );

    if (tweetsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No valid tweets found to process. Tweets must not be ignored and must not already have articles.' },
        { status: 400 }
      );
    }

    const results = {
      total: tweetsToProcess.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ tweetId: number; error: string }>,
    };

    // Process tweets sequentially to avoid rate limiting
    for (const tweet of tweetsToProcess) {
      try {
        // Generate article
        const articleData = await generateArticle(
          tweet.text,
          tweet.media_urls || '',
          language as 'english' | 'french' | 'both'
        );

        // Update tweet with article data
        const articleEnglish = articleData.en ? JSON.stringify(articleData.en) : null;
        const articleFrench = articleData.fr ? JSON.stringify(articleData.fr) : null;
        
        await tweets.updateArticle(tweet.id, articleEnglish, articleFrench);
        results.successful++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          tweetId: tweet.id,
          error: error.message || 'Unknown error',
        });
        console.error(`Error generating article for tweet ${tweet.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.successful} of ${results.total} tweets successfully.`,
    });
  } catch (error: any) {
    console.error('Error in bulk article generation:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk article generation', message: error.message },
      { status: 500 }
    );
  }
}
