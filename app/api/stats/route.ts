import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  let client;
  try {
    // Get a client from the pool with timeout handling and retry
    let retries = 3;
    while (retries > 0) {
      try {
        client = await Promise.race([
          pool.connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 8000)
          )
        ]) as any;
        break;
      } catch (error: any) {
        retries--;
        if (retries === 0 || !error.message?.includes('timeout') && !error.message?.includes('Connection')) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!client) {
      throw new Error('Failed to get database client after retries');
    }
    
    // Use SQL aggregations for accurate counts - much more efficient and accurate
    const statsQuery = `
      SELECT 
        COUNT(*) as total_tweets,
        COUNT(CASE WHEN ignored = 1 THEN 1 END) as ignored_tweets,
        COUNT(CASE WHEN article_generated = 1 THEN 1 END) as tweets_with_articles,
        COUNT(CASE WHEN ignored = 0 AND article_generated = 0 THEN 1 END) as active_tweets,
        COUNT(CASE WHEN published_english = 1 THEN 1 END) as published_english,
        COUNT(CASE WHEN published_french = 1 THEN 1 END) as published_french,
        COALESCE(SUM(like_count), 0) as total_likes,
        COALESCE(SUM(retweet_count), 0) as total_retweets,
        COALESCE(SUM(reply_count), 0) as total_replies,
        COALESCE(SUM(view_count), 0) as total_views,
        COALESCE(SUM(quote_count), 0) as total_quotes,
        COUNT(CASE WHEN like_count > 0 THEN 1 END) as tweets_with_likes,
        COUNT(CASE WHEN view_count > 0 THEN 1 END) as tweets_with_views
      FROM tweets
    `;

    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];

    // Get account count - use direct query to ensure fresh data (no caching)
    const accountsQuery = 'SELECT COUNT(*) as total FROM accounts';
    const accountsResult = await client.query(accountsQuery);
    // PostgreSQL COUNT returns as string, parse it
    const totalAccounts = parseInt(String(accountsResult.rows[0]?.total || '0'), 10);

    // Parse stats (PostgreSQL returns strings for bigint)
    const totalTweets = parseInt(stats.total_tweets, 10) || 0;
    const ignoredTweets = parseInt(stats.ignored_tweets, 10) || 0;
    const tweetsWithArticles = parseInt(stats.tweets_with_articles, 10) || 0;
    const activeTweets = parseInt(stats.active_tweets, 10) || 0;
    const publishedEnglish = parseInt(stats.published_english, 10) || 0;
    const publishedFrench = parseInt(stats.published_french, 10) || 0;
    
    const totalLikes = parseInt(stats.total_likes, 10) || 0;
    const totalRetweets = parseInt(stats.total_retweets, 10) || 0;
    const totalReplies = parseInt(stats.total_replies, 10) || 0;
    const totalViews = parseInt(stats.total_views, 10) || 0;
    const totalQuotes = parseInt(stats.total_quotes, 10) || 0;
    
    const tweetsWithLikes = parseInt(stats.tweets_with_likes, 10) || 0;
    const tweetsWithViews = parseInt(stats.tweets_with_views, 10) || 0;
    
    // Calculate averages
    const avgLikes = tweetsWithLikes > 0 
      ? Math.round(totalLikes / tweetsWithLikes) 
      : 0;
    const avgRetweets = totalTweets > 0 
      ? (totalRetweets / totalTweets).toFixed(1) 
      : '0.0';
    const avgReplies = totalTweets > 0 
      ? (totalReplies / totalTweets).toFixed(1) 
      : '0.0';
    const avgViews = tweetsWithViews > 0 
      ? Math.round(totalViews / tweetsWithViews) 
      : 0;
    
    // Calculate engagement rate (likes + retweets + replies) / views
    const totalEngagements = totalLikes + totalRetweets + totalReplies;
    const engagementRate = totalViews > 0 
      ? ((totalEngagements / totalViews) * 100).toFixed(2) 
      : '0.00';
    
    // Calculate conversion rates
    const articleConversionRate = totalTweets > 0 
      ? ((tweetsWithArticles / totalTweets) * 100).toFixed(1) 
      : '0.0';
    const publishConversionRate = tweetsWithArticles > 0
      ? (((publishedEnglish + publishedFrench) / tweetsWithArticles) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      tweets: {
        total: totalTweets,
        active: activeTweets,
        withArticles: tweetsWithArticles,
        ignored: ignoredTweets,
        publishedEnglish,
        publishedFrench,
        publishedTotal: publishedEnglish + publishedFrench,
      },
      accounts: {
        total: totalAccounts,
      },
      engagement: {
        totalLikes,
        totalRetweets,
        totalReplies,
        totalViews,
        totalQuotes,
        avgLikes,
        avgRetweets: parseFloat(avgRetweets),
        avgReplies: parseFloat(avgReplies),
        avgViews,
        totalEngagements: totalLikes + totalRetweets + totalReplies,
        engagementRate: parseFloat(engagementRate),
      },
      conversion: {
        articleRate: parseFloat(articleConversionRate),
        publishRate: parseFloat(publishConversionRate),
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: error.message },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
    }
  }
}
