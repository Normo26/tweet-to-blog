'use client';

import { Filter, X, Calendar, TrendingUp } from 'lucide-react';
import { useState } from 'react';

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  accounts?: Array<{ id: number; name: string; username: string }>;
}

export interface FilterState {
  dateRange: 'all' | '7d' | '30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  minLikes?: number;
  minRetweets?: number;
  minViews?: number;
  sortBy: 'date' | 'likes' | 'retweets' | 'views' | 'account';
  sortOrder: 'asc' | 'desc';
}

const defaultFilters: FilterState = {
  dateRange: 'all',
  sortBy: 'date',
  sortOrder: 'desc',
};

export default function FilterPanel({ onFilterChange, accounts }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    
    // Count active filters
    let count = 0;
    if (updated.dateRange !== 'all') count++;
    if (updated.minLikes && updated.minLikes > 0) count++;
    if (updated.minRetweets && updated.minRetweets > 0) count++;
    if (updated.minViews && updated.minViews > 0) count++;
    if (updated.sortBy !== 'date' || updated.sortOrder !== 'desc') count++;
    
    setActiveFilterCount(count);
    onFilterChange(updated);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setActiveFilterCount(0);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Filter className="h-4 w-4" />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => updateFilters({ dateRange: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
                {filters.dateRange === 'custom' && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="date"
                      value={filters.customStartDate || ''}
                      onChange={(e) => updateFilters({ customStartDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={filters.customEndDate || ''}
                      onChange={(e) => updateFilters({ customEndDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Engagement Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <TrendingUp className="inline h-4 w-4 mr-1" />
                  Engagement
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Likes</label>
                    <input
                      type="number"
                      min="0"
                      value={filters.minLikes || ''}
                      onChange={(e) => updateFilters({ minLikes: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Retweets</label>
                    <input
                      type="number"
                      min="0"
                      value={filters.minRetweets || ''}
                      onChange={(e) => updateFilters({ minRetweets: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Min Views</label>
                    <input
                      type="number"
                      min="0"
                      value={filters.minViews || ''}
                      onChange={(e) => updateFilters({ minViews: parseInt(e.target.value) || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <div className="space-y-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="date">Date</option>
                    <option value="likes">Likes</option>
                    <option value="retweets">Retweets</option>
                    <option value="views">Views</option>
                    <option value="account">Account</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => updateFilters({ sortOrder: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              {/* Reset */}
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
