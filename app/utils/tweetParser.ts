/**
 * Utility functions to parse Twitter API responses
 * Based on the Twitter GraphQL API structure
 */

export interface ParsedTweet {
  id: string;
  text: string;
  createdAt: string;
  userId: string;
  userName: string;
  userScreenName: string;
  userProfileImageUrl?: string;
  retweetCount: number;
  likeCount: number;
  replyCount: number;
  quoteCount: number;
  viewCount?: number;
  isRetweet: boolean;
  retweetedTweet?: ParsedTweet;
  isReply: boolean;
  replyToUserId?: string;
  replyToScreenName?: string;
  media?: TweetMedia[];
  urls?: TweetUrl[];
  hashtags?: string[];
  mentions?: TweetMention[];
  lang?: string;
  raw: any; // Keep raw data for reference
}

export interface TweetMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface TweetUrl {
  url: string;
  expandedUrl: string;
  displayUrl: string;
}

export interface TweetMention {
  screenName: string;
  name: string;
  id: string;
}

/**
 * Parse the Twitter API response and extract all tweets
 */
export function parseTweetsFromResponse(apiResponse: any): ParsedTweet[] {
  const tweets: ParsedTweet[] = [];
  
  // Navigate through the Twitter API response structure
  // Structure can be: 
  // - data.user.result.timeline_v2.timeline.instructions[]
  // - data.user.result.timeline.timeline.instructions[]
  // - user.result.timeline.timeline.instructions[] (direct response - this is what we're getting)
  const instructions = 
    apiResponse.data?.user?.result?.timeline_v2?.timeline?.instructions || 
    apiResponse.data?.user?.result?.timeline?.timeline?.instructions ||
    apiResponse.data?.user?.result?.timeline?.instructions ||
    apiResponse.user?.result?.timeline?.timeline?.instructions ||
    apiResponse.user?.result?.timeline?.instructions ||
    [];

  instructions.forEach((instruction: any) => {
    // Handle TimelineAddEntries (regular tweets)
    if (instruction.type === 'TimelineAddEntries' && instruction.entries) {
      instruction.entries.forEach((entry: any) => {
        const tweet = parseTweetFromEntry(entry);
        if (tweet) {
          tweets.push(tweet);
        }
      });
    }
    
    // Handle TimelinePinEntry (pinned tweets)
    if (instruction.type === 'TimelinePinEntry' && instruction.entry) {
      const tweet = parseTweetFromEntry(instruction.entry);
      if (tweet) {
        tweets.push(tweet);
      }
    }
  });

  return tweets;
}

/**
 * Parse a single tweet from an entry
 */
function parseTweetFromEntry(entry: any): ParsedTweet | null {
  // Check different possible entry structures
  let tweetResult = null;
  
  if (entry.content?.entryType === 'TimelineTimelineItem') {
    tweetResult = entry.content?.itemContent?.tweet_results?.result;
  } else if (entry.content?.itemContent?.tweet_results?.result) {
    tweetResult = entry.content.itemContent.tweet_results.result;
  } else if (entry.content?.tweet?.result) {
    tweetResult = entry.content.tweet.result;
  } else if (entry.tweet_results?.result) {
    tweetResult = entry.tweet_results.result;
  }

  if (!tweetResult) {
    return null;
  }

  // Handle retweets - check if this is a retweet
  let retweetedTweet: ParsedTweet | null = null;

  // Check for retweet structure: legacy.retweeted_status_result
  if (tweetResult.legacy?.retweeted_status_result?.result) {
    // This is a retweet - parse the original tweet
    retweetedTweet = parseTweetData(tweetResult.legacy.retweeted_status_result.result);
  }

  const parsed = parseTweetData(tweetResult);
  
  // If parsing failed, return null
  if (!parsed) {
    return null;
  }
  
  if (retweetedTweet) {
    parsed.isRetweet = true;
    parsed.retweetedTweet = retweetedTweet;
    // Use the original tweet's text instead of "RT @username: ..."
    parsed.text = retweetedTweet.text;
    // Update engagement metrics to use the original tweet's metrics
    parsed.likeCount = retweetedTweet.likeCount;
    parsed.retweetCount = retweetedTweet.retweetCount;
    parsed.replyCount = retweetedTweet.replyCount;
    parsed.quoteCount = retweetedTweet.quoteCount;
    parsed.viewCount = retweetedTweet.viewCount;
  }

  return parsed;
}

/**
 * Parse tweet data from a tweet result object
 */
function parseTweetData(tweet: any): ParsedTweet | null {
  const legacy = tweet?.legacy || tweet;
  const restId = tweet?.rest_id || tweet?.id_str || tweet?.id;
  
  // Return null if we can't find a valid tweet ID
  if (!restId || restId === 'unknown') {
    return null;
  }
  
  // Get user information - check multiple paths
  let user = null;
  if (tweet?.core?.user_results?.result?.legacy) {
    user = tweet.core.user_results.result.legacy;
  } else if (tweet?.core?.user_results?.result?.core) {
    // New structure with core.name and core.screen_name
    user = {
      name: tweet.core.user_results.result.core?.name || '',
      screen_name: tweet.core.user_results.result.core?.screen_name || '',
      profile_image_url_https: tweet.core.user_results.result.avatar?.image_url || '',
      ...tweet.core.user_results.result.legacy
    };
  } else if (tweet?.legacy?.user) {
    user = tweet.legacy.user;
  } else if (legacy?.user) {
    user = legacy.user;
  }

  // Get tweet text - prioritize note_tweet for long-form tweets
  let text = '';
  if (tweet?.note_tweet?.note_tweet_results?.result?.text) {
    text = tweet.note_tweet.note_tweet_results.result.text;
  } else if (legacy?.full_text) {
    text = legacy.full_text;
  } else if (legacy?.text) {
    text = legacy.text;
  } else if (tweet?.text) {
    text = tweet.text;
  }

  // Extract media
  const media: TweetMedia[] = [];
  if (legacy?.entities?.media) {
    legacy.entities.media.forEach((m: any) => {
      media.push({
        type: m.type === 'photo' ? 'photo' : m.type === 'video' ? 'video' : 'animated_gif',
        url: m.url || '',
        mediaUrl: m.media_url_https || m.media_url || '',
        thumbnailUrl: m.media_url_https || m.media_url || '',
        width: m.sizes?.large?.w || m.original_info?.width,
        height: m.sizes?.large?.h || m.original_info?.height,
      });
    });
  }

  // Extract URLs
  const urls: TweetUrl[] = [];
  if (legacy?.entities?.urls) {
    legacy.entities.urls.forEach((u: any) => {
      urls.push({
        url: u.url || '',
        expandedUrl: u.expanded_url || '',
        displayUrl: u.display_url || '',
      });
    });
  }

  // Extract hashtags
  const hashtags: string[] = [];
  if (legacy?.entities?.hashtags) {
    legacy.entities.hashtags.forEach((h: any) => {
      if (h.text) hashtags.push(h.text);
    });
  }

  // Extract mentions
  const mentions: TweetMention[] = [];
  if (legacy?.entities?.user_mentions) {
    legacy.entities.user_mentions.forEach((m: any) => {
      mentions.push({
        screenName: m.screen_name || '',
        name: m.name || '',
        id: m.id_str || m.id || '',
      });
    });
  }

  // Get view count if available
  let viewCount: number | undefined;
  if (tweet?.views?.count) {
    viewCount = parseInt(tweet.views.count);
  } else if (tweet?.views?.state === 'EnabledWithCount') {
    viewCount = parseInt(tweet.views.count || '0');
  }

  // Get user ID from multiple possible locations
  const userId = 
    user?.id_str || 
    user?.id || 
    tweet?.core?.user_results?.result?.rest_id ||
    tweet?.legacy?.user_id_str ||
    legacy?.user_id_str ||
    '';

  // Get user name and screen name from multiple paths
  const userName = 
    user?.name || 
    tweet?.core?.user_results?.result?.core?.name || 
    '';
  
  const userScreenName = 
    user?.screen_name || 
    tweet?.core?.user_results?.result?.core?.screen_name || 
    '';

  // Get profile image
  const userProfileImageUrl = 
    user?.profile_image_url_https || 
    user?.profile_image_url || 
    tweet?.core?.user_results?.result?.avatar?.image_url ||
    '';

  return {
    id: restId,
    text: text,
    createdAt: legacy?.created_at || '',
    userId: userId,
    userName: userName,
    userScreenName: userScreenName,
    userProfileImageUrl: userProfileImageUrl,
    retweetCount: legacy?.retweet_count || 0,
    likeCount: legacy?.favorite_count || legacy?.like_count || 0,
    replyCount: legacy?.reply_count || 0,
    quoteCount: legacy?.quote_count || 0,
    viewCount: viewCount,
    isRetweet: false,
    isReply: !!legacy?.in_reply_to_status_id_str || !!legacy?.in_reply_to_status_id,
    replyToUserId: legacy?.in_reply_to_user_id_str || legacy?.in_reply_to_user_id || undefined,
    replyToScreenName: legacy?.in_reply_to_screen_name || undefined,
    media: media.length > 0 ? media : undefined,
    urls: urls.length > 0 ? urls : undefined,
    hashtags: hashtags.length > 0 ? hashtags : undefined,
    mentions: mentions.length > 0 ? mentions : undefined,
    lang: legacy?.lang || undefined,
    raw: tweet, // Keep raw data
  };
}

/**
 * Format a number with K/M suffixes
 */
export function formatCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

/**
 * Format date string to readable format
 */
export function formatTweetDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return dateString;
  }
}

