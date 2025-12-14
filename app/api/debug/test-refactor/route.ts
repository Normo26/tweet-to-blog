import { NextRequest, NextResponse } from 'next/server';
import { tweets, settings, pool } from '@/lib/db';
import { processAutoMode } from '@/lib/bot';

export async function GET(request: NextRequest) {
    try {
        const results: any[] = [];

        // --- Test A: Deduplication ---
        results.push({ test: 'A: Deduplication', status: 'pending' });
        const duplicateTweetId = '999999999999999999';
        // Clean up first
        await pool.query('DELETE FROM tweets WHERE tweet_id = $1', [duplicateTweetId]);

        const tweetData = {
            tweet_id: duplicateTweetId,
            account_id: 1, // Assumes account 1 exists, otherwise this might fail if FK constraint
            user_id: 'test_user_id',
            username: 'test_user',
            text: 'Test Tweet for Deduplication',
            created_at: new Date().toISOString(),
            like_count: 0,
            retweet_count: 0,
            reply_count: 0,
            quote_count: 0,
            view_count: 0,
            is_retweet: 0,
            is_reply: 0,
            media_urls: null,
            urls: null,
            hashtags: null,
            mentions: null,
            raw_data: '{}'
        };

        // Note: We might need to ensure account 1 exists. 
        // If not, we should probably skip or creating a dummy account.
        // Let's check accounts first.
        const accountCheck = await pool.query('SELECT id FROM accounts LIMIT 1');
        if (accountCheck.rows.length > 0) {
            tweetData.account_id = accountCheck.rows[0].id;

            const firstInsert = await tweets.add(tweetData);
            const secondInsert = await tweets.add(tweetData);

            if (firstInsert && !secondInsert) {
                results[0].status = 'passed';
                results[0].message = 'Duplicate insertion blocked successfully';
            } else {
                results[0].status = 'failed';
                results[0].message = `First: ${!!firstInsert}, Second: ${!!secondInsert}`;
            }
        } else {
            results[0].status = 'skipped';
            results[0].message = 'No accounts found to test against';
        }

        // --- Test B: Auto Mode (Compliant) ---
        results.push({ test: 'B: Auto Mode (Compliant)', status: 'pending' });
        // Setup settings
        await settings.set('autoMode', 'true');
        await settings.set('autoModeMinChars', '10'); // Lower for test convenience
        await settings.set('autoModeRequireMedia', 'true');

        const compliantTweetId = '888888888888888888';
        await pool.query('DELETE FROM tweets WHERE tweet_id = $1', [compliantTweetId]);

        const compliantTweet = {
            ...tweetData,
            tweet_id: compliantTweetId,
            text: 'This is a compliant tweet with enough characters and it has media.',
            media_urls: JSON.stringify(['https://example.com/image.jpg']),
            article_generated: 0
        };

        const savedCompliant = await tweets.add(compliantTweet);
        if (savedCompliant) {
            // Mock generateArticle inside processAutoMode? 
            // We can't easily mock imports in this runtime without Jest.
            // However, we can run processAutoMode and expect it to FAIL on OpenAI call or succeed if keys are valid.
            // If it fails on OpenAI, we verify it TRIED. 
            // But we can check if it logged "Generating article..." or check DB if article_generated changed (if OpenAI worked).
            // Given we can't easily assert on logs here, we'll try to run it.
            // IMPORTANT: This will cost money/tokens if valid keys are present.
            // User asked to "Mock a tweet", not necessarily mock the API.

            // Let's assume we just want to verify logic flow. 
            // If we don't have OpenAI keys, it will throw.
            // Let's wrap in try/catch to see if it ATTEMPTED.

            const consoleLog = console.log;
            const logs: string[] = [];
            console.log = (...args) => logs.push(args.join(' '));

            try {
                await processAutoMode(savedCompliant);
            } catch (e) {
                logs.push(`Error: ${e}`);
            }

            console.log = consoleLog; // Restore

            const attempted = logs.some(l => l.includes('Generating article for tweet'));
            const criteriaMet = logs.some(l => l.includes('Meets char count: true') && l.includes('Meets media requirement: true'));

            if (attempted || criteriaMet) {
                results[1].status = 'passed';
                results[1].message = 'Logic identified tweet as compliant and attempted generation';
                results[1].logs = logs;
            } else {
                results[1].status = 'failed';
                results[1].message = 'Logic did not trigger generation';
                results[1].logs = logs;
            }
        }

        // --- Test C: Ignore Logic (Non-compliant) ---
        results.push({ test: 'C: Auto Mode (Ignore Short/No Media)', status: 'pending' });
        const shortTweetId = '777777777777777777';
        await pool.query('DELETE FROM tweets WHERE tweet_id = $1', [shortTweetId]);

        const shortTweet = {
            ...tweetData,
            tweet_id: shortTweetId,
            text: 'Short',
            media_urls: null // No media
        };

        const savedShort = await tweets.add(shortTweet);
        if (savedShort) {
            const logs: string[] = [];
            const consoleLog = console.log;
            console.log = (...args) => logs.push(args.join(' '));

            await processAutoMode(savedShort);

            console.log = consoleLog;

            const skipped = logs.some(l => l.includes('Skipping tweet') || l.includes("doesn't meet criteria"));

            if (skipped) {
                results[2].status = 'passed';
                results[2].message = 'Logic correctly skipped non-compliant tweet';
            } else {
                results[2].status = 'failed';
                results[2].message = 'Logic did not explicitly skip (or logs missing)';
                results[2].logs = logs;
            }
        }

        // Cleanup
        await pool.query('DELETE FROM tweets WHERE tweet_id IN ($1, $2, $3)', [duplicateTweetId, compliantTweetId, shortTweetId]);

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
