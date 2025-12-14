'use client';

import { useQuery } from '@tanstack/react-query';
import ArticleViewer from '@/app/components/ArticleViewer';
import TweetCard from '@/app/components/TweetCard';
import { FileText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { SkeletonTweetCard } from '@/app/components/SkeletonLoader';
import EmptyState from '@/app/components/EmptyState';
import SearchBar from '@/app/components/SearchBar';

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

const ITEMS_PER_PAGE = 50;

async function fetchArticles(page: number = 1) {
  const limit = ITEMS_PER_PAGE;
  const offset = (page - 1) * limit;
  
  const params = new URLSearchParams();
  params.append('articleGenerated', 'true');
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());
  
  const response = await fetch(`/api/tweets?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch articles');
  const result = await response.json();
  
  // Handle both old format (array) and new format (object with data/total)
  if (Array.isArray(result)) {
    return { data: result, total: result.length, limit, offset };
  }
  return result;
}

export default function ArticlesPage() {
  const [selectedTweet, setSelectedTweet] = useState<Tweet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ['articles', currentPage],
    queryFn: () => fetchArticles(currentPage),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const tweets = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
  const totalCount = response?.total || (Array.isArray(response) ? response.length : 0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const articles = useMemo(() => {
    // Ensure tweets is an array before filtering
    if (!Array.isArray(tweets)) return [];
    // Filter to ensure only articles with article_generated = 1
    const allArticles = tweets.filter((tweet: Tweet) => tweet.article_generated === 1);

    if (!searchQuery.trim()) return allArticles;

    const query = searchQuery.toLowerCase();
    return allArticles.filter((tweet: Tweet) => {
      const text = tweet.text.toLowerCase();
      const username = (tweet.account_username || tweet.username || '').toLowerCase();
      const accountName = (tweet.account_name || '').toLowerCase();
      return text.includes(query) || username.includes(query) || accountName.includes(query);
    });
  }, [tweets, searchQuery]);

  // Reset to page 1 when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value !== searchQuery) {
      setCurrentPage(1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Articles</h1>
          <p className="mt-2 text-sm text-gray-600">
            View generated articles from tweets
          </p>
        </div>
        <div className="flex gap-2">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search articles..."
            className="flex-1 sm:flex-initial sm:w-64"
          />
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <SkeletonTweetCard />
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Articles List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Generated Articles ({totalCount.toLocaleString()})
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {articles.map((tweet: Tweet) => (
                  <button
                    key={tweet.id}
                    onClick={() => setSelectedTweet(tweet)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedTweet?.id === tweet.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-start space-x-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tweet.account_name || tweet.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {tweet.text.substring(0, 60)}...
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          {tweet.article_english && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              EN
                            </span>
                          )}
                          {tweet.article_french && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                              FR
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({totalCount.toLocaleString()} total)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || isLoading}
                      className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Next page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Article Viewer */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTweet ? (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Original Tweet</h2>
                  <TweetCard
                    tweet={selectedTweet}
                    onIgnore={async () => { }}
                    onGenerateArticle={async () => { }}
                    onPublish={async (id, language, status) => {
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
                        await refetch(); // Refresh data
                        // Update selected tweet locally to reflect changes immediately
                        setSelectedTweet(prev => prev ? {
                          ...prev,
                          [`published_${language}`]: 1,
                          [`published_${language}_link`]: data.link
                        } : null);

                        return { link: data.link };
                      } catch (error: any) {
                        throw error;
                      }
                    }}
                  />
                </div>
                <ArticleViewer
                  articleEnglish={selectedTweet.article_english}
                  articleFrench={selectedTweet.article_french}
                  publishedEnglish={selectedTweet.published_english === 1}
                  publishedFrench={selectedTweet.published_french === 1}
                  publishedEnglishAt={selectedTweet.published_english_at}
                  publishedFrenchAt={selectedTweet.published_french_at}
                />
              </>
            ) : (
              <EmptyState
                icon={FileText}
                title="No article selected"
                description="Select an article from the list to view it"
              />
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No articles yet"
          description="No articles generated yet. Generate articles from tweets first."
          action={{
            label: 'Go to Tweets',
            onClick: () => window.location.href = '/tweets',
          }}
        />
      )}
    </div>
  );
}
