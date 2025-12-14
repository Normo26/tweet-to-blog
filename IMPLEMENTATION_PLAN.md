# Implementation Plan: Teweeter-to-Blog Refactor

## 1. Architectural Refactor (Background Automation) (Completed)

**Current State**: The bot relies on a `setInterval` loop initiated by a server startup hook or manual trigger, which is unreliable in serverless environments like Vercel.

**New Architecture**:
- **Mechanism**: Use Vercel Cron Jobs to trigger the scraper logic.
- **Schedule**: Every 2 minutes.
- **Endpoint**: `/api/cron` (New secure API route).
- **Execution**: The cron job will call `runBotCycle()` directly.
- **Deduplication**: Enforced at the database level (`tweet_id` UNIQUE constraint) and application level (checking existing tweets before insertion).

**Changes**:
- [x] Create `app/api/cron/route.ts`.
- [x] Update `vercel.json` to define the cron job.
- [x] Modify `lib/bot.ts` to remove the stateful `setInterval` logic (or unused pieces of it) and ensure `runBotCycle` is stateless and optimized for a short execution window.

## 2. Shared WordPress Logic (Refactor) (Completed)

To support both the "Auto-Pilot" background process and the manual Review UI, we need to extract the WordPress publishing logic into a reusable library function.

**Changes**:
- [x] Create `lib/wordpress.ts`.
- [x] Extract logic from `app/api/post-to-wordpress-en/route.ts` into a function `publishToWordPress`.
- [x] Update the API route to use this new function.
- [x] Support a `status` parameter ('draft' vs 'publish').

## 3. Auto-Pilot Mode (Completed)

**Logic**: Automatically process new tweets that meet specific criteria.
- **Criteria**:
  - `autoMode` is ON.
  - Tweet contains image(s).
  - Text length > 100 characters.
- **Action**:
  - Generate Article (English).
  - Publish to WordPress as **Draft**.
  - Update Database status (Article Generated, Published as Draft).
- **Fallback**: If criteria not met, tweet is saved but remains in "Pending" state (processed by manual review).

**Changes**:
- [x] Update `lib/bot.ts`:
  - Integrate `publishToWordPress` in the auto-mode flow.
  - Ensure status is set to 'draft'.
  - Update tweet record with new publication details.

## 4. UI/UX Improvements (Completed)

### 4.1 Article Review Update
**Requirement**: Allow user to choose "Draft" or "Publish".
**Changes**:
- [x] Update `app/api/post-to-wordpress-en/route.ts` to accept `status`.
- [x] Update the frontend component (likely `components/ArticleViewer.tsx` or `components/TweetCard.tsx`) to add a selector for the status before publishing.

### 4.2 New "News Feed" Tab
**Requirement**: Unified view of Tweet + Article + Status.
**Changes**:
- [x] Create `app/news-feed/page.tsx`.
- [x] Create a new UI component (or reuse `TweetCard`) designed for the feed view.
- [x] Fetch data from `tweets` table with joined account info.

## 5. Testing Plan
- **Deduplication**: Verify `tweets.add` gracefully handles UNIQUE constraint violations.
- **Cron**: Test `/api/cron` manually.
- **Auto Mode**: Mock a tweet in the database or force a scrape of a known account to verify drafted post in WordPress.
- **Verification**: Run `app/api/debug/test-refactor/route.ts` to verify logic.
