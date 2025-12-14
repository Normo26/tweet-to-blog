'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import TweetCard from '@/app/components/TweetCard';
import { Filter, RefreshCw, User, FileText, MessageSquare, EyeOff, Sparkles, Loader2, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/app/components/ToastProvider';
import { SkeletonTweetCard } from '@/app/components/SkeletonLoader';
import EmptyState from '@/app/components/EmptyState';
import SearchBar from '@/app/components/SearchBar';
import FilterPanel, { FilterState } from '@/app/components/FilterPanel';
import ProgressModal from '@/app/components/ProgressModal';

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
  published_english_link: string | null;
  published_french_link: string | null;
}

interface Account {
  id: number;
  name: string;
  username: string;
  user_id: string;
  created_at: string;
}

type TabType = 'all' | 'with-articles' | 'ignored';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: 'all',
    label: 'All Tweets',
    icon: MessageSquare,
    description: 'View all tweets from monitored accounts',
  },
  {
    id: 'with-articles',
    label: 'With Articles',
    icon: FileText,
    description: 'Tweets with generated articles',
  },
  {
    id: 'ignored',
    label: 'Ignored',
    icon: EyeOff,
    description: 'Tweets that have been ignored',
  },
];

const ITEMS_PER_PAGE = 50;

async function fetchTweets(filters: {
  ignored?: boolean;
  articleGenerated?: boolean;
  accountId?: number;
}, page: number = 1) {
  const params = new URLSearchParams();
  if (filters.ignored !== undefined) params.append('ignored', filters.ignored.toString());
  if (filters.articleGenerated !== undefined) params.append('articleGenerated', filters.articleGenerated.toString());
  if (filters.accountId !== undefined && filters.accountId !== null) params.append('accountId', filters.accountId.toString());
  
  const limit = ITEMS_PER_PAGE;
  const offset = (page - 1) * limit;
  params.append('limit', limit.toString());
  params.append('offset', offset.toString());

  const response = await fetch(`/api/tweets?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch tweets');
  const result = await response.json();
  // Handle both old format (array) and new format (object with data/total)
  if (Array.isArray(result)) {
    return { data: result, total: result.length, limit, offset };
  }
  return result;
}

async function fetchAccounts(): Promise<Account[]> {
  const response = await fetch('/api/accounts');
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

export default function TweetsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedTweets, setSelectedTweets] = useState<Set<number>>(new Set());
  const [accountFilter, setAccountFilter] = useState<number | undefined>(undefined);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterState, setFilterState] = useState<FilterState>({
    dateRange: 'all',
    sortBy: 'date',
    sortOrder: 'desc',
  });
  const [progressModal, setProgressModal] = useState<{
    isOpen: boolean;
    items: Array<{ id: number; status: 'pending' | 'processing' | 'success' | 'error'; error?: string }>;
  } | null>(null);

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Build filters based on active tab
  const filters = useMemo(() => {
    const baseFilters: {
      ignored?: boolean;
      articleGenerated?: boolean;
      accountId?: number;
    } = {};

    switch (activeTab) {
      case 'with-articles':
        baseFilters.articleGenerated = true;
        baseFilters.ignored = false;
        break;
      case 'ignored':
        baseFilters.ignored = true;
        break;
      case 'all':
      default:
        // Exclude ignored tweets and tweets with articles from "All Tweets"
        baseFilters.ignored = false;
        baseFilters.articleGenerated = false; // Only show tweets without articles
        break;
    }

    if (accountFilter) {
      baseFilters.accountId = accountFilter;
    }

    return baseFilters;
  }, [activeTab, accountFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, activeTab, accountFilter]);

  const { data: response, isLoading: tweetsLoading, refetch } = useQuery({
    queryKey: ['tweets', filters, activeTab, currentPage],
    queryFn: () => fetchTweets(filters, currentPage),
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Always consider stale for real-time updates
  });

  const tweets = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
  const totalCount = response?.total || (Array.isArray(response) ? response.length : 0);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Filter and sort tweets client-side
  const filteredAndSortedTweets = useMemo(() => {
    if (!Array.isArray(tweets) || tweets.length === 0) return [];

    let filtered = [...tweets];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((tweet: Tweet) => {
        const text = tweet.text.toLowerCase();
        const username = (tweet.account_username || tweet.username || '').toLowerCase();
        const accountName = (tweet.account_name || '').toLowerCase();
        const hashtags = tweet.hashtags ? JSON.parse(tweet.hashtags).join(' ').toLowerCase() : '';
        return text.includes(query) || username.includes(query) || accountName.includes(query) || hashtags.includes(query);
      });
    }

    // Date range filter
    if (filterState.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      
      if (filterState.dateRange === '7d') {
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filterState.dateRange === '30d') {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (filterState.dateRange === 'custom') {
        if (filterState.customStartDate && filterState.customEndDate) {
          const startDate = new Date(filterState.customStartDate);
          const endDate = new Date(filterState.customEndDate);
          endDate.setHours(23, 59, 59, 999);
          filtered = filtered.filter((tweet: Tweet) => {
            const tweetDate = new Date(tweet.created_at);
            return tweetDate >= startDate && tweetDate <= endDate;
          });
        }
      } else {
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (filterState.dateRange !== 'custom') {
        filtered = filtered.filter((tweet: Tweet) => {
          const tweetDate = new Date(tweet.created_at);
          return tweetDate >= cutoffDate;
        });
      }
    }

    // Engagement filters
    if (filterState.minLikes !== undefined && filterState.minLikes > 0) {
      filtered = filtered.filter((tweet: Tweet) => tweet.like_count >= filterState.minLikes!);
    }
    if (filterState.minRetweets !== undefined && filterState.minRetweets > 0) {
      filtered = filtered.filter((tweet: Tweet) => tweet.retweet_count >= filterState.minRetweets!);
    }
    if (filterState.minViews !== undefined && filterState.minViews > 0) {
      filtered = filtered.filter((tweet: Tweet) => (tweet.view_count || 0) >= filterState.minViews!);
    }

    // Sort
    filtered.sort((a: Tweet, b: Tweet) => {
      let comparison = 0;
      
      switch (filterState.sortBy) {
        case 'likes':
          comparison = a.like_count - b.like_count;
          break;
        case 'retweets':
          comparison = a.retweet_count - b.retweet_count;
          break;
        case 'views':
          comparison = (a.view_count || 0) - (b.view_count || 0);
          break;
        case 'account':
          const aName = (a.account_name || a.username || '').toLowerCase();
          const bName = (b.account_name || b.username || '').toLowerCase();
          comparison = aName.localeCompare(bName);
          break;
        case 'date':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return filterState.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [tweets, searchQuery, filterState]);

  const handleSelect = (id: number, selected: boolean) => {
    setSelectedTweets((prev) => {
      const newSelected = new Set(prev);
      if (selected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  };

  const handleIgnore = async (id: number, ignored: boolean) => {
    try {
      const response = await fetch(`/api/tweets/${id}/ignore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ignored }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tweet');
      }

      await queryClient.invalidateQueries({ queryKey: ['tweets'] });
      toast.showSuccess('Tweet updated successfully');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to update tweet');
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

      await queryClient.invalidateQueries({ queryKey: ['tweets'] });
      toast.showInfo('Article generation started! This may take a few moments.');
    } catch (error: any) {
      toast.showError(error.message || 'Failed to generate article');
    }
  };

  const handlePublish = async (id: number, language: 'english' | 'french') => {
    try {
      const response = await fetch(`/api/tweets/${id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, published: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to publish article');
      }

      const data = await response.json();
      await queryClient.invalidateQueries({ queryKey: ['tweets'] });
      toast.showSuccess('Article published successfully!');
      return { link: data.link };
    } catch (error: any) {
      toast.showError(error.message || 'Failed to publish article');
      throw error;
    }
  };

  const handleBulkGenerateArticles = async () => {
    if (selectedTweets.size === 0) {
      toast.showWarning('Please select at least one tweet to generate articles for.');
      return;
    }

    // Use a custom confirm dialog via toast
    const confirmed = window.confirm(`Generate articles for ${selectedTweets.size} selected tweet(s)? This may take several minutes.`);
    if (!confirmed) {
      return;
    }

    const tweetIds = Array.from(selectedTweets);
    
    // Initialize progress modal
    setProgressModal({
      isOpen: true,
      items: tweetIds.map((id) => ({ id, status: 'pending' as const })),
    });

    setIsBulkGenerating(true);

    // Process tweets one by one to show progress
    const results = {
      successful: 0,
      failed: 0,
      total: tweetIds.length,
    };

    for (let i = 0; i < tweetIds.length; i++) {
      const tweetId = tweetIds[i];
      
      // Update status to processing
      setProgressModal((prev) => {
        if (!prev) return prev;
        const newItems = [...prev.items];
        const itemIndex = newItems.findIndex((item) => item.id === tweetId);
        if (itemIndex !== -1) {
          newItems[itemIndex] = { ...newItems[itemIndex], status: 'processing' };
        }
        return { ...prev, items: newItems };
      });

      try {
        const response = await fetch(`/api/tweets/${tweetId}/article`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'both' }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to generate article');
        }

        results.successful++;
        
        // Update status to success
        setProgressModal((prev) => {
          if (!prev) return prev;
          const newItems = [...prev.items];
          const itemIndex = newItems.findIndex((item) => item.id === tweetId);
          if (itemIndex !== -1) {
            newItems[itemIndex] = { ...newItems[itemIndex], status: 'success' };
          }
          return { ...prev, items: newItems };
        });
      } catch (error: any) {
        results.failed++;
        
        // Update status to error
        setProgressModal((prev) => {
          if (!prev) return prev;
          const newItems = [...prev.items];
          const itemIndex = newItems.findIndex((item) => item.id === tweetId);
          if (itemIndex !== -1) {
            newItems[itemIndex] = {
              ...newItems[itemIndex],
              status: 'error',
              error: error.message || 'Failed to generate article',
            };
          }
          return { ...prev, items: newItems };
        });
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['tweets'] });
    setSelectedTweets(new Set()); // Clear selection
    setIsBulkGenerating(false);

    if (results.failed === 0) {
      toast.showSuccess(`Successfully generated articles for ${results.successful} tweet(s)!`);
    } else {
      toast.showWarning(
        `Bulk generation completed: ${results.successful} successful, ${results.failed} failed.`,
        8000
      );
    }
  };

  const handleSelectAll = () => {
    if (!Array.isArray(tweets) || tweets.length === 0) return;
    const allIds = new Set<number>(tweets.map((tweet: Tweet) => tweet.id));
    setSelectedTweets(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedTweets(new Set());
  };

  const selectableTweets = filteredAndSortedTweets?.filter((tweet: Tweet) => 
    tweet.article_generated === 0 && tweet.ignored === 0
  ) || [];
  
  const allSelectableSelected = selectableTweets.length > 0 && 
    selectableTweets.every((tweet: Tweet) => selectedTweets.has(tweet.id));

  const activeTabConfig = TABS.find((tab) => tab.id === activeTab);
  const isLoading = tweetsLoading || accountsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Tweets</h1>
          <p className="mt-2 text-sm text-gray-600">
            {activeTabConfig?.description || 'View and manage tweets from monitored accounts'}
          </p>
          {/* Pagination Info */}
          {!isLoading && totalCount > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
              <span className="font-medium text-gray-700">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span> of{' '}
              <span className="font-medium text-gray-700">{totalCount.toLocaleString()}</span> tweets
              {totalPages > 1 && (
                <span className="ml-2">
                  (Page <span className="font-medium text-gray-700">{currentPage}</span> of{' '}
                  <span className="font-medium text-gray-700">{totalPages}</span>)
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedTweets.size > 0 && activeTab !== 'with-articles' && (
            <button
              onClick={handleBulkGenerateArticles}
              disabled={isBulkGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
              aria-label="Generate articles for selected tweets"
            >
              {isBulkGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Articles ({selectedTweets.size})</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
            aria-label="Refresh tweets"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              // Count should reflect filtered results
              const count = tab.id === activeTab ? filteredAndSortedTweets.length : 
                (Array.isArray(tweets) ? tweets.filter((tweet: Tweet) => {
                  if (tab.id === 'with-articles') return tweet.article_generated === 1;
                  if (tab.id === 'ignored') return tweet.ignored === 1;
                  return true;
                }).length : 0);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedTweets(new Set()); // Clear selection on tab change
                  }}
                  className={`
                    flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                    ${
                      isActive
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={`
                        ml-2 px-2 py-0.5 text-xs font-semibold rounded-full
                        ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}
                      `}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters and Bulk Actions */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col gap-4">
            {/* Search and Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search tweets, usernames, hashtags..."
                />
              </div>
              <div className="flex gap-2">
                <FilterPanel
                  onFilterChange={setFilterState}
                  accounts={accounts}
                />
                <select
                  value={accountFilter || ''}
                  onChange={(e) => setAccountFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  aria-label="Filter by account"
                >
                  <option value="">All Accounts</option>
                  {accounts?.map((account: Account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} (@{account.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk Selection Actions - Only show in "All Tweets" tab */}
            {activeTab === 'all' && selectableTweets.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>
                    {selectedTweets.size > 0 
                      ? `${selectedTweets.size} of ${selectableTweets.length} selected`
                      : `${selectableTweets.length} tweet${selectableTweets.length !== 1 ? 's' : ''} available for article generation`}
                    {searchQuery && ` (filtered from ${filteredAndSortedTweets?.length || 0} on this page)`}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={allSelectableSelected ? handleDeselectAll : handleSelectAll}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    {allSelectableSelected ? (
                      <>
                        <CheckSquare className="h-4 w-4" />
                        <span>Deselect All</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4" />
                        <span>Select All</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tweets List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonTweetCard key={i} />
          ))}
        </div>
      ) : filteredAndSortedTweets && filteredAndSortedTweets.length > 0 ? (
        <>
          <div className="space-y-4">
            {filteredAndSortedTweets.map((tweet: Tweet) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                selected={selectedTweets.has(tweet.id)}
                onSelect={handleSelect}
                onIgnore={handleIgnore}
                onGenerateArticle={handleGenerateArticle}
                onPublish={handlePublish}
              />
            ))}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} tweets
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isLoading}
                        className={`px-3 py-2 rounded-lg border transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || isLoading}
                  className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  title="Next page"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title={
            activeTab === 'with-articles'
              ? 'No articles yet'
              : activeTab === 'ignored'
              ? 'No ignored tweets'
              : 'No tweets found'
          }
          description={
            activeTab === 'with-articles'
              ? 'No tweets with articles found. Generate articles from tweets first.'
              : activeTab === 'ignored'
              ? 'No ignored tweets found.'
              : 'No tweets found. Start the bot to fetch tweets from monitored accounts.'
          }
          action={
            activeTab === 'all'
              ? {
                  label: 'Go to Settings',
                  onClick: () => window.location.href = '/settings',
                }
              : undefined
          }
        />
      )}

      {/* Progress Modal */}
      {progressModal && (
        <ProgressModal
          isOpen={progressModal.isOpen}
          title="Generating Articles"
          total={progressModal.items.length}
          items={progressModal.items}
          onClose={() => setProgressModal(null)}
        />
      )}
    </div>
  );
}
