import { NextRequest, NextResponse } from 'next/server';
import { tweets } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const ignored = searchParams.get('ignored');
    const articleGenerated = searchParams.get('articleGenerated');
    const publishedEnglish = searchParams.get('publishedEnglish');
    const publishedFrench = searchParams.get('publishedFrench');
    const accountId = searchParams.get('accountId');

    const filters: any = {};
    if (ignored !== null) filters.ignored = ignored === 'true';
    if (articleGenerated !== null) filters.articleGenerated = articleGenerated === 'true';
    if (publishedEnglish !== null) filters.publishedEnglish = publishedEnglish === 'true';
    if (publishedFrench !== null) filters.publishedFrench = publishedFrench === 'true';
    if (accountId !== null) filters.accountId = parseInt(accountId);

    const [allTweets, totalCount] = await Promise.all([
      tweets.getFiltered(filters, limit, offset),
      tweets.getFilteredCount(filters)
    ]);

    return NextResponse.json({
      data: allTweets,
      total: totalCount,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Error fetching tweets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tweets', message: error.message },
      { status: 500 }
    );
  }
}
