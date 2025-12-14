import { NextRequest, NextResponse } from 'next/server';
import { settings, tweets } from '@/lib/db';
import { Buffer } from 'buffer';
import { marked } from 'marked';

async function uploadImageToWordPress(
  imageUrl: string,
  wpUrl: string,
  wpUsername: string,
  wpPassword: string
): Promise<{ mediaId: number; url: string } | null> {
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
        return { mediaId, url: uploadedUrl };
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const { language, published, status } = await request.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid tweet ID' },
        { status: 400 }
      );
    }

    if (language !== 'english' && language !== 'french') {
      return NextResponse.json(
        { error: 'Invalid language. Must be "english" or "french"' },
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

    if (!published) {
      // Just update the database status and clear the link
      const success = await tweets.updatePublished(id, language, false, null);
      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update tweet status' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    // Get article content
    const articleContent = language === 'english'
      ? tweet.article_english
      : tweet.article_french;

    if (!articleContent) {
      return NextResponse.json(
        { error: `Article not generated for ${language} language` },
        { status: 400 }
      );
    }

    let articleData: { title: string; article?: string; content?: string };
    try {
      articleData = typeof articleContent === 'string'
        ? JSON.parse(articleContent)
        : articleContent;
    } catch {
      return NextResponse.json(
        { error: 'Invalid article data format' },
        { status: 400 }
      );
    }

    if (!articleData.title || (!articleData.article && !articleData.content)) {
      return NextResponse.json(
        { error: 'Invalid article format: missing title or content' },
        { status: 400 }
      );
    }

    // Get all media URLs
    const mediaUrls: string[] = [];
    try {
      const media = tweet.media_urls ? JSON.parse(tweet.media_urls) : [];
      if (Array.isArray(media) && media.length > 0) {
        media.forEach((mediaItem: any) => {
          const url = typeof mediaItem === 'string'
            ? mediaItem
            : mediaItem.mediaUrl || mediaItem.url || null;
          if (url) {
            mediaUrls.push(url);
          }
        });
      }
    } catch {
      // Ignore media parsing errors
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

    const wpApiUrl = `${wpUrl.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

    // Upload all images to WordPress
    const uploadedImages: Array<{ mediaId: number; url: string }> = [];
    for (const imageUrl of mediaUrls) {
      const uploadResult = await uploadImageToWordPress(imageUrl, wpUrl, wpUsername, wpPassword);
      if (uploadResult) {
        uploadedImages.push(uploadResult);
      }
    }

    // Use first image as featured image
    let featuredMediaId: number | null = null;
    if (uploadedImages.length > 0) {
      featuredMediaId = uploadedImages[0].mediaId;
    }

    // Convert markdown to HTML
    const articleHtml = marked(articleData.article || articleData.content || '');

    // Add additional images to the article content (skip the first one as it's the featured image)
    let imagesHtml = '';
    if (uploadedImages.length > 1) {
      imagesHtml = '<div class="article-images" style="margin: 30px 0; display: flex; flex-direction: column; gap: 20px;">';
      for (let i = 1; i < uploadedImages.length; i++) {
        imagesHtml += `<figure style="margin: 0; text-align: center;">
          <img src="${uploadedImages[i].url}" alt="Article image ${i}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </figure>`;
      }
      imagesHtml += '</div>';
    }

    const fullContent = `${articleHtml}
${imagesHtml}
<hr>
<p><em>Source: <a href="https://twitter.com/${tweet.username}/status/${tweet.tweet_id}" target="_blank">Original Tweet</a></em></p>`;

    const postData: any = {
      title: articleData.title,
      content: fullContent,
      status: status || 'publish', // Use the provided status, default to 'publish' for backward compatibility
    };

    if (featuredMediaId) {
      postData.featured_media = featuredMediaId;
    }

    const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString('base64');
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
      return NextResponse.json(
        {
          error: `WordPress API error: ${response.status}`,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const publishData = await response.json();

    // Update database with publishing status
    const success = await tweets.updatePublished(id, language, true, publishData.link);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update tweet status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post_id: publishData.id,
      link: publishData.link,
      message: `Article published successfully to ${language} WordPress site`
    });
  } catch (error: any) {
    console.error('Error publishing article:', error);
    return NextResponse.json(
      { error: 'Failed to publish article', message: error.message },
      { status: 500 }
    );
  }
}
