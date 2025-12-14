# Tweet Extractor

A Next.js application to extract tweets from any Twitter/X username using the Twitter GraphQL API.

## Features

- Extract tweets from any Twitter/X username
- Beautiful, modern UI built with Tailwind CSS
- Support for authentication tokens (for protected accounts)
- **Automatic tweet parsing** - Extracts all useful data from API responses
- Display tweet content, user information, engagement metrics, and timestamps
- Show media, URLs, hashtags, and mentions
- Handle retweets and replies
- View raw API responses for debugging
- Comprehensive data parsing utility for easy integration

## Getting Started

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter a Twitter/X username (without the @ symbol)
2. Optionally provide a User ID if you know it (this can be found in the API response)
3. For protected accounts, you can provide authentication tokens:
   - Auth Token (from cookies: `auth_token`)
   - CSRF Token (from cookies: `ct0`)
   - Full Cookie String (paste from browser developer tools)
4. Click "Fetch Tweets" to retrieve the latest tweets

## How to Get Authentication Tokens

1. Open Twitter/X in your browser
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to the Network tab
4. Navigate to a user's profile
5. Find a request to `UserTweets` or similar GraphQL endpoint
6. Copy the `auth_token` and `ct0` values from the cookies
7. Or copy the entire cookie string from the request headers

## API Endpoint

The app uses the Twitter GraphQL API endpoint:
- `https://x.com/i/api/graphql/lZRf8IC-GTuGxDwcsHW8aw/UserTweets`

## Data Structure

The API returns parsed tweets with the following structure:

```typescript
{
  tweets: ParsedTweet[],  // Array of parsed tweets
  data: any,               // Raw API response
  count: number           // Number of tweets found
}
```

Each `ParsedTweet` includes:
- Tweet text, ID, creation date
- User information (name, username, profile image)
- Engagement metrics (likes, retweets, replies, views)
- Media attachments
- URLs, hashtags, and mentions
- Retweet and reply information

See `USAGE_GUIDE.md` for detailed examples of how to use the response data.

## Notes

- The Twitter API may require authentication for some accounts
- Rate limiting may apply
- User ID resolution from username is automatic (uses UserByScreenName endpoint)
- This tool is for educational purposes only

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

# tweeter-to-blog
