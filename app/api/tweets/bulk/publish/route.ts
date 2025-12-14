import { NextRequest, NextResponse } from 'next/server';
import { settings, tweets } from '@/lib/db';
import { Buffer } from 'buffer';
import { marked } from 'marked';

async function uploadImageToWordPress(
  imageUrl: string,
  wpUrl: string,
  wpUsername: string,
  wpPassword: string
): Promise<number | null> {
  try {
    const imgResponse = await fetch(imageUrl, { 
      signal: AbortSignal.timeout(30000) 
    });
    
    if (!imgResponse.ok) {
      console.error(`Failed to download image: ${imageUrl} - Status: ${imgResponse.status}`);
      return null;
    }

    const urlPath = new URL(imageUrl).pathname;
    let filename = urlPath.split('/').pop()?.split('?')[0] || 'tweet_image.jpg';
    
    if (!filename || !filename.includes('.')) {
      const contentType = imgResponse.headers.get('Content-Type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : 
                  contentType.includes('gif') ? 'gif' : 
                  contentType.includes('webp') ? 'webp' : 'jpg';
      filename = `tweet_image_${Date.now()}.${ext}`;
    }

    const imgBuffer = await imgResponse.arrayBuffer();
    const contentType = imgResponse.headers.get('Content-Type') || 'image/jpeg';

    const wpMediaUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;

    const formData = new FormData();
    const blob = new Blob([imgBuffer], { type: contentType });
    formData.append('file', blob, filename);

    const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
    const uploadResponse = await fetch(wpMediaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      body: formData,
      signal: AbortSignal.timeout(60000)
    });
    
    if (uploadResponse.status === 201) {
      const mediaData = await uploadResponse.json();
      const uploadedUrl = mediaData.source_url || mediaData.guid?.rendered || mediaData.link;
      const mediaId = mediaData.id;
      if (uploadedUrl && mediaId) {
        console.log(`Successfully uploaded image to WordPress: ${uploadedUrl} (Media ID: ${mediaId})`);
        return mediaId;
      } else {
        console.error(`Upload succeeded but missing data in response: ${JSON.stringify(mediaData)}`);
        return null;
      }
    } else {
      const errorText = await uploadResponse.text();
      console.error(`Failed to upload image to WordPress: ${uploadResponse.status} - ${errorText}`);
      return null;
    }
  } catch (error: any) {
    console.error(`Error uploading image to WordPress: ${error.message}`);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tweetIds, language = 'english' } = await request.json();

    if (!tweetIds || !Array.isArray(tweetIds) || tweetIds.length === 0) {
      return NextResponse.json(
        { error: 'tweetIds array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (language !== 'english' && language !== 'french') {
      return NextResponse.json(
        { error: 'Invalid language. Must be "english" or "french"' },
        { status: 400 }
      );
    }

    if (tweetIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 tweets can be processed at once' },
        { status: 400 }
      );
    }

    // Get WordPress configuration
    const wpUrl = await settings.get(language === 'english' ? 'wordpressEnglishUrl' : 'wordpressFrenchUrl');
    const wpUsername = await settings.get(language === 'english' ? 'wordpressEnglishUsername' : 'wordpressFrenchUsername');
    const wpPassword = await settings.get(language === 'english' ? 'wordpressEnglishPassword' : 'wordpressFrenchPassword');

    if (!wpUrl || !wpUsername || !wpPassword) {
      return NextResponse.json(
        { error: `WordPress credentials for ${language} not configured. Please set them in Settings.` },
        { status: 500 }
      );
    }

    // Get all tweets
    const allTweets = await tweets.getAll(10000, 0);
    const tweetsToProcess = allTweets.filter((t: any) => 
      tweetIds.includes(t.id) && 
      (language === 'english' ? t.article_english : t.article_french) &&
      t.ignored === 0
    );

    if (tweetsToProcess.length === 0) {
      return NextResponse.json(
        { error: `No valid tweets found to process. Tweets must not be ignored and must have ${language} articles generated.` },
        { status: 400 }
      );
    }

    const wpApiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
    const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');

    const results = {
      total: tweetsToProcess.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ tweetId: number; error: string }>,
    };

    // Process tweets sequentially to avoid rate limiting
    for (const tweet of tweetsToProcess) {
      try {
        // Get article content
        const articleContent = language === 'english' 
          ? tweet.article_english 
          : tweet.article_french;

        if (!articleContent) {
          results.failed++;
          results.errors.push({
            tweetId: tweet.id,
            error: `Article not generated for ${language} language`,
          });
          continue;
        }

        let articleData: { title: string; article?: string; content?: string };
        try {
          articleData = typeof articleContent === 'string' 
            ? JSON.parse(articleContent) 
            : articleContent;
        } catch {
          results.failed++;
          results.errors.push({
            tweetId: tweet.id,
            error: 'Invalid article data format',
          });
          continue;
        }

        if (!articleData.title || (!articleData.article && !articleData.content)) {
          results.failed++;
          results.errors.push({
            tweetId: tweet.id,
            error: 'Invalid article format: missing title or content',
          });
          continue;
        }

        // Get first media URL for featured image
        let imageUrl: string | null = null;
        try {
          const media = tweet.media_urls ? JSON.parse(tweet.media_urls) : [];
          if (Array.isArray(media) && media.length > 0) {
            const firstMedia = media[0];
            imageUrl = typeof firstMedia === 'string' 
              ? firstMedia 
              : firstMedia.mediaUrl || firstMedia.url || null;
          }
        } catch {
          // Ignore media parsing errors
        }

        let featuredMediaId: number | null = null;
        if (imageUrl) {
          featuredMediaId = await uploadImageToWordPress(imageUrl, wpUrl, wpUsername, wpPassword);
        }

        // Convert markdown to HTML
        const articleHtml = marked(articleData.article || articleData.content || '');
        
        const fullContent = `${articleHtml}
<hr>
<p><em>Source: <a href="https://twitter.com/${tweet.username}/status/${tweet.tweet_id}" target="_blank">Original Tweet</a></em></p>`;

        const postData: any = {
          title: articleData.title,
          content: fullContent,
          status: 'publish',
        };

        if (featuredMediaId) {
          postData.featured_media = featuredMediaId;
        }

        const response = await fetch(wpApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
          },
          body: JSON.stringify(postData),
          signal: AbortSignal.timeout(60000)
        });

        if (response.status !== 201) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            errorData = { error: await response.text() };
          }
          results.failed++;
          results.errors.push({
            tweetId: tweet.id,
            error: `WordPress API error: ${response.status} - ${JSON.stringify(errorData)}`,
          });
          continue;
        }

        const publishData = await response.json();

        // Update database with publishing status
        const success = await tweets.updatePublished(tweet.id, language, true, publishData.link);
        
        if (!success) {
          results.failed++;
          results.errors.push({
            tweetId: tweet.id,
            error: 'Failed to update tweet status in database',
          });
          continue;
        }

        results.successful++;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          tweetId: tweet.id,
          error: error.message || 'Unknown error',
        });
        console.error(`Error publishing article for tweet ${tweet.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Published ${results.successful} of ${results.total} tweets successfully to ${language} WordPress site.`,
    });
  } catch (error: any) {
    console.error('Error in bulk publish:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk publish', message: error.message },
      { status: 500 }
    );
  }
}
