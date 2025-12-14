'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import TweetCard from '@/app/components/TweetCard';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/app/components/ToastProvider';
import { SkeletonTweetCard } from '@/app/components/SkeletonLoader';
import EmptyState from '@/app/components/EmptyState';
import ArticleViewer from '@/app/components/ArticleViewer';
import { useState } from 'react';

interface Tweet {
    id: number;
    tweet_id: string;
    account_name?: string;
    account_username?: string;
    username: string;
    text: string;
    created_at: string;
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    view_count: number | null;
    is_retweet: number;
    is_reply: number;
    media_urls: string | null;
    urls: string | null;
    hashtags: string | null;
    mentions: string | null;
    ignored: number;
    article_generated: number;
    article_english: string | null;
    article_french: string | null;
    published_english: number;
    published_french: number;
    published_english_at: string | null;
    published_french_at: string | null;
    published_english_link: string | null;
    published_french_link: string | null;
}

async function fetchFeed() {
    const response = await fetch('/api/tweets?limit=50'); // Fetch recent 50 tweets
    if (!response.ok) throw new Error('Failed to fetch feed');
    const result = await response.json();
    // Handle both old format (array) and new format (object with data/total)
    return Array.isArray(result) ? result : result.data || [];
}

function FeedItem({ tweet, onPublish, onGenerateArticle, onIgnore }: {
    tweet: Tweet;
    onPublish: (id: number, language: 'english' | 'french', status: 'draft' | 'publish') => Promise<any>;
    onGenerateArticle: (id: number) => Promise<void>;
    onIgnore: (id: number, ignored: boolean) => Promise<void>;
}) {
    const [showArticle, setShowArticle] = useState(false);

    return (
        <div className="space-y-4">
            <TweetCard
                tweet={tweet}
                onPublish={onPublish}
                onGenerateArticle={onGenerateArticle}
                onIgnore={onIgnore}
            />

            {tweet.article_generated === 1 && (
                <div className="ml-8 border-l-2 border-gray-100 pl-4">
                    <button
                        onClick={() => setShowArticle(!showArticle)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 flex items-center gap-2"
                    >
                        {showArticle ? 'Hide Article' : 'Show Article Preview'}
                    </button>

                    {showArticle && (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <ArticleViewer
                                articleEnglish={tweet.article_english}
                                articleFrench={tweet.article_french}
                                publishedEnglish={tweet.published_english === 1}
                                publishedFrench={tweet.published_french === 1}
                                publishedEnglishAt={tweet.published_english_at}
                                publishedFrenchAt={tweet.published_french_at}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function NewsFeedPage() {
    const queryClient = useQueryClient();
    const toast = useToast();

    const { data: tweets, isLoading, refetch } = useQuery({
        queryKey: ['dates-feed'], // Using distinct key
        queryFn: fetchFeed,
        refetchInterval: 30000,
    });

    const handlePublish = async (id: number, language: 'english' | 'french', status: 'draft' | 'publish') => {
        try {
            const response = await fetch(`/api/tweets/${id}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, status }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to publish article');
            }

            const data = await response.json();
            await queryClient.invalidateQueries({ queryKey: ['dates-feed'] });
            return data;
        } catch (error: any) {
            throw error;
        }
    };

    const handleGenerateArticle = async (id: number) => {
        try {
            const response = await fetch(`/api/tweets/${id}/article`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: 'both' }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to generate article');
            }

            await queryClient.invalidateQueries({ queryKey: ['dates-feed'] });
            toast.showInfo('Article generation started!');
        } catch (error: any) {
            toast.showError(error.message || 'Failed to generate article');
        }
    };

    const handleIgnore = async (id: number, ignored: boolean) => {
        try {
            const response = await fetch(`/api/tweets/${id}/ignore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ignored }),
            });

            if (!response.ok) throw new Error('Failed to update tweet');

            await queryClient.invalidateQueries({ queryKey: ['dates-feed'] });
            toast.showSuccess('Tweet updated successfully');
        } catch (error: any) {
            toast.showError(error.message || 'Failed to update tweet');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">News Feed</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Real-time feed of tweets and generated content
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    {[...Array(3)].map((_, i) => (
                        <SkeletonTweetCard key={i} />
                    ))}
                </div>
            ) : tweets && tweets.length > 0 ? (
                <div className="space-y-8">
                    {tweets.map((tweet: Tweet) => (
                        <FeedItem
                            key={tweet.id}
                            tweet={tweet}
                            onPublish={handlePublish}
                            onGenerateArticle={handleGenerateArticle}
                            onIgnore={handleIgnore}
                        />
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={LayoutDashboard}
                    title="No items in feed"
                    description="Your feed is empty. Start the bot to fetch tweets."
                />
            )}
        </div>
    );
}
