'use client';

import React from 'react';
import { useBotStatus } from './hooks/useBotStatus';
import { useQuery } from '@tanstack/react-query';
import { 
  MessageSquare, 
  FileText, 
  Settings, 
  PlayCircle, 
  PauseCircle,
  Users,
  Activity,
  Globe,
  Globe2,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { SkeletonStatCard } from '@/app/components/SkeletonLoader';
import { useToast } from '@/app/components/ToastProvider';

interface Stats {
  tweets: {
    total: number;
    active: number;
    withArticles: number;
    ignored: number;
    publishedEnglish: number;
    publishedFrench: number;
    publishedTotal: number;
  };
  accounts: {
    total: number;
  };
  engagement: {
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    totalViews: number;
  };
  conversion: {
    articleRate: number;
    publishRate: number;
  };
}

async function fetchStats(): Promise<Stats> {
  const response = await fetch('/api/stats');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch stats: ${response.status}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.message || data.error);
  }
  return data;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function Dashboard() {
  const { isRunning, isLoading, toggleBot, runNow } = useBotStatus();
  const [isRunningNow, setIsRunningNow] = React.useState(false);
  const toast = useToast();
  
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 2,
    staleTime: 0, // Always consider stale to get fresh data
    gcTime: 0, // Don't cache
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor Twitter/X accounts and manage your content pipeline
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : statsError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Stats</h3>
          <p className="text-sm text-red-700 mb-4">
            {statsError instanceof Error ? statsError.message : 'Failed to load statistics. Please try refreshing the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Refresh Page
          </button>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Tweets */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tweets</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.tweets.total)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {stats.tweets.active} active • {stats.tweets.ignored} ignored
              </p>
            </div>
          </div>

          {/* Tweets with Articles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Articles</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.tweets.withArticles)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-3 w-3 text-gray-400" />
                <p className="text-xs text-gray-500">
                  {stats.conversion.articleRate}% conversion rate
                </p>
              </div>
            </div>
          </div>

          {/* Published Articles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatNumber(stats.tweets.publishedTotal)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-3 text-xs">
                <span className="text-gray-500">
                  <Globe className="inline h-3 w-3 mr-1" />
                  {stats.tweets.publishedEnglish} EN
                </span>
                <span className="text-gray-500">
                  <Globe2 className="inline h-3 w-3 mr-1" />
                  {stats.tweets.publishedFrench} FR
                </span>
              </div>
            </div>
          </div>

          {/* Total Accounts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monitored Accounts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.accounts.total}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link 
                href="/settings" 
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                Manage accounts →
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bot Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${isRunning ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isRunning ? (
                <Activity className={`h-6 w-6 ${isRunning ? 'text-green-600' : 'text-gray-600'}`} />
              ) : (
                <PauseCircle className="h-6 w-6 text-gray-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bot Status</h2>
              <p className="text-sm text-gray-600">
                {isRunning ? 'Bot is actively monitoring accounts' : 'Bot is currently stopped'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={async () => {
                setIsRunningNow(true);
                try {
                  const result = await runNow();
                  if (result.success) {
                    toast.showSuccess(
                      result.accountsProcessed 
                        ? `Scraping completed! Processed ${result.accountsProcessed} account(s).`
                        : 'Scraping completed!'
                    );
                  } else {
                    toast.showError(result.message || 'Failed to run scraping cycle');
                  }
                } catch (error: any) {
                  toast.showError(error.message || 'Failed to run scraping cycle');
                } finally {
                  setIsRunningNow(false);
                }
              }}
              disabled={isLoading || isRunningNow}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`inline h-4 w-4 mr-2 ${isRunningNow ? 'animate-spin' : ''}`} />
              Run Now
            </button>
            <button
              onClick={toggleBot}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-red-50 text-red-700 hover:bg-red-100'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isRunning ? (
                <>
                  <PauseCircle className="inline h-4 w-4 mr-2" />
                  Stop Bot
                </>
              ) : (
                <>
                  <PlayCircle className="inline h-4 w-4 mr-2" />
                  Start Bot
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/tweets"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Tweets</h3>
              <p className="text-sm text-gray-600">View and manage tweets</p>
              {stats && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.tweets.active} tweets ready for articles
                </p>
              )}
            </div>
          </div>
        </Link>

        <Link
          href="/articles"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Articles</h3>
              <p className="text-sm text-gray-600">View generated articles</p>
              {stats && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.tweets.withArticles} articles generated
                </p>
              )}
            </div>
          </div>
        </Link>

        <Link
          href="/settings"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">Configure your account</p>
              {stats && (
                <p className="text-xs text-gray-500 mt-1">
                  {stats.accounts.total} accounts configured
                </p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      {stats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.engagement.totalLikes)}</div>
              <div className="text-xs text-gray-500 mt-1">Total Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.engagement.totalRetweets)}</div>
              <div className="text-xs text-gray-500 mt-1">Total Retweets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.engagement.totalReplies)}</div>
              <div className="text-xs text-gray-500 mt-1">Total Replies</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.engagement.totalViews)}</div>
              <div className="text-xs text-gray-500 mt-1">Total Views</div>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Add Twitter/X accounts to monitor in Settings</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Start the bot to begin fetching tweets automatically</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Generate articles from tweets and publish to WordPress</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
