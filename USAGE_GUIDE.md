# How to Use Twitter API Response Data

This guide explains how to extract and use data from the Twitter GraphQL API response.

## API Response Structure

The Twitter API returns data in a nested GraphQL structure. Here's how to navigate it:

### Basic Structure

```json
{
  "data": {
    "user": {
      "result": {
        "timeline_v2": {
          "timeline": {
            "instructions": [...]
          }
        }
      }
    }
  }
}
```

### Extracting Tweets

Tweets are found in the `instructions` array. Each instruction can contain multiple entries:

```typescript
// Navigate to instructions
const instructions = response.data?.user?.result?.timeline_v2?.timeline?.instructions || [];

instructions.forEach((instruction) => {
  if (instruction.type === 'TimelineAddEntries') {
    instruction.entries.forEach((entry) => {
      // Tweets are in entries with entryType 'TimelineTimelineItem'
      if (entry.content?.entryType === 'TimelineTimelineItem') {
        const tweet = entry.content?.itemContent?.tweet_results?.result;
        // Process tweet...
      }
    });
  }
});
```

## Using the Parsed Data

The app includes a `tweetParser.ts` utility that extracts all useful data from tweets. Here's what you get:

### ParsedTweet Interface

```typescript
interface ParsedTweet {
  id: string;                    // Tweet ID
  text: string;                  // Full tweet text
  createdAt: string;              // Creation date
  userId: string;                 // User ID who posted
  userName: string;               // Display name
  userScreenName: string;         // @username
  userProfileImageUrl?: string;   // Profile picture URL
  retweetCount: number;          // Number of retweets
  likeCount: number;              // Number of likes
  replyCount: number;             // Number of replies
  quoteCount: number;             // Number of quote tweets
  viewCount?: number;             // View count (if available)
  isRetweet: boolean;             // Is this a retweet?
  retweetedTweet?: ParsedTweet;   // Original tweet if retweeted
  isReply: boolean;               // Is this a reply?
  replyToUserId?: string;         // User ID being replied to
  replyToScreenName?: string;     // Username being replied to
  media?: TweetMedia[];           // Media attachments
  urls?: TweetUrl[];              // URLs in tweet
  hashtags?: string[];            // Hashtags
  mentions?: TweetMention[];      // User mentions
  lang?: string;                  // Language code
  raw: any;                       // Original raw data
}
```

## Example: Using the API Response

### In Your Code (TypeScript/JavaScript)

```typescript
// After fetching from /api/tweets
const response = await fetch('/api/tweets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'elonmusk' })
});

const data = await response.json();

// Use parsed tweets (recommended)
const tweets: ParsedTweet[] = data.tweets;

tweets.forEach(tweet => {
  console.log(`Tweet by @${tweet.userScreenName}: ${tweet.text}`);
  console.log(`Likes: ${tweet.likeCount}, Retweets: ${tweet.retweetCount}`);
  
  // Access media
  if (tweet.media) {
    tweet.media.forEach(media => {
      console.log(`Media: ${media.mediaUrl}`);
    });
  }
  
  // Access URLs
  if (tweet.urls) {
    tweet.urls.forEach(url => {
      console.log(`Link: ${url.expandedUrl}`);
    });
  }
  
  // Access hashtags
  if (tweet.hashtags) {
    console.log(`Hashtags: ${tweet.hashtags.join(', ')}`);
  }
});

// Or access raw data for advanced use cases
const rawData = data.data;
```

### In Python (Similar to your example)

```python
import requests

# Your existing code...
response = requests.get(
    'https://x.com/i/api/graphql/lZRf8IC-GTuGxDwcsHW8aw/UserTweets',
    params=params,
    cookies=cookies,
    headers=headers,
)

data = response.json()

# Extract tweets from the response
def extract_tweets(api_response):
    tweets = []
    instructions = api_response.get('data', {}).get('user', {}).get('result', {}).get('timeline_v2', {}).get('timeline', {}).get('instructions', [])
    
    for instruction in instructions:
        if instruction.get('type') == 'TimelineAddEntries':
            for entry in instruction.get('entries', []):
                if entry.get('content', {}).get('entryType') == 'TimelineTimelineItem':
                    tweet_result = entry.get('content', {}).get('itemContent', {}).get('tweet_results', {}).get('result')
                    if tweet_result:
                        tweets.append(parse_tweet(tweet_result))
    
    return tweets

def parse_tweet(tweet_data):
    """Extract useful information from a tweet"""
    legacy = tweet_data.get('legacy', {})
    
    # Get user info
    user = None
    if 'core' in tweet_data and 'user_results' in tweet_data['core']:
        user = tweet_data['core']['user_results']['result']['legacy']
    elif 'legacy' in tweet_data and 'user' in tweet_data['legacy']:
        user = tweet_data['legacy']['user']
    
    # Extract tweet data
    parsed = {
        'id': tweet_data.get('rest_id', ''),
        'text': legacy.get('full_text', ''),
        'created_at': legacy.get('created_at', ''),
        'user_name': user.get('name', '') if user else '',
        'user_screen_name': user.get('screen_name', '') if user else '',
        'like_count': legacy.get('favorite_count', 0),
        'retweet_count': legacy.get('retweet_count', 0),
        'reply_count': legacy.get('reply_count', 0),
        'quote_count': legacy.get('quote_count', 0),
        'media': [],
        'urls': [],
        'hashtags': [],
        'mentions': [],
    }
    
    # Extract media
    if 'entities' in legacy and 'media' in legacy['entities']:
        for media in legacy['entities']['media']:
            parsed['media'].append({
                'type': media.get('type', ''),
                'url': media.get('media_url_https', ''),
            })
    
    # Extract URLs
    if 'entities' in legacy and 'urls' in legacy['entities']:
        for url in legacy['entities']['urls']:
            parsed['urls'].append({
                'url': url.get('url', ''),
                'expanded_url': url.get('expanded_url', ''),
            })
    
    # Extract hashtags
    if 'entities' in legacy and 'hashtags' in legacy['entities']:
        parsed['hashtags'] = [h.get('text', '') for h in legacy['entities']['hashtags']]
    
    # Extract mentions
    if 'entities' in legacy and 'user_mentions' in legacy['entities']:
        parsed['mentions'] = [
            {
                'screen_name': m.get('screen_name', ''),
                'name': m.get('name', ''),
            }
            for m in legacy['entities']['user_mentions']
        ]
    
    return parsed

# Use it
tweets = extract_tweets(data)
for tweet in tweets:
    print(f"@{tweet['user_screen_name']}: {tweet['text']}")
    print(f"Likes: {tweet['like_count']}, Retweets: {tweet['retweet_count']}")
    if tweet['hashtags']:
        print(f"Hashtags: {', '.join(tweet['hashtags'])}")
    print()
```

## Common Data Paths

### Tweet Text
- `tweet.legacy.full_text` - Full tweet text
- `tweet.note_tweet.note_tweet_results.result.text` - For long-form tweets

### User Information
- `tweet.core.user_results.result.legacy` - User data
- `tweet.legacy.user` - Alternative path

### Engagement Metrics
- `tweet.legacy.retweet_count` - Retweets
- `tweet.legacy.favorite_count` or `tweet.legacy.like_count` - Likes
- `tweet.legacy.reply_count` - Replies
- `tweet.legacy.quote_count` - Quote tweets
- `tweet.views.count` - View count (if available)

### Media
- `tweet.legacy.entities.media[]` - Array of media objects
- Each media has: `type`, `media_url_https`, `url`

### URLs
- `tweet.legacy.entities.urls[]` - Array of URL objects
- Each URL has: `url`, `expanded_url`, `display_url`

### Hashtags
- `tweet.legacy.entities.hashtags[]` - Array of hashtag objects
- Each hashtag has: `text`, `indices`

### Mentions
- `tweet.legacy.entities.user_mentions[]` - Array of mention objects
- Each mention has: `screen_name`, `name`, `id_str`

## Tips

1. **Always check for null/undefined** - The API structure can vary
2. **Use optional chaining** - `tweet?.legacy?.full_text` in JavaScript/TypeScript
3. **Handle retweets** - Check for `retweeted_status_result` to get original tweet
4. **Check entry types** - Not all entries are tweets (some are ads, suggestions, etc.)
5. **Use the parser utility** - The `tweetParser.ts` handles all edge cases

## Next Steps

- Check out `app/utils/tweetParser.ts` for the full parsing implementation
- See `app/page.tsx` for examples of displaying parsed tweets
- The API route at `app/api/tweets/route.ts` shows how to make the request





