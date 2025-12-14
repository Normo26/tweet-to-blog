'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchBotStatus() {
  const response = await fetch('/api/bot/status');
  if (!response.ok) throw new Error('Failed to fetch bot status');
  return response.json();
}

export function useBotStatus() {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['botStatus'],
    queryFn: fetchBotStatus,
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
    staleTime: 0, // Always consider data stale to ensure fresh status
  });

  const isRunning = data?.running || false;

  const toggleBot = async () => {
    // Optimistic update
    const previousStatus = isRunning;
    queryClient.setQueryData(['botStatus'], { running: !previousStatus });
    
    try {
      const response = await fetch('/api/bot/toggle', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        // Update cache with actual response
        queryClient.setQueryData(['botStatus'], { running: data.running });
        // Invalidate to trigger refetch on all pages
        await queryClient.invalidateQueries({ queryKey: ['botStatus'] });
        return { success: true, running: data.running };
      } else {
        // Revert on error
        queryClient.setQueryData(['botStatus'], { running: previousStatus });
        throw new Error(data.error || 'Failed to toggle bot');
      }
    } catch (error: any) {
      // Revert on error
      queryClient.setQueryData(['botStatus'], { running: previousStatus });
      throw error;
    }
  };

  const runNow = async () => {
    try {
      const response = await fetch('/api/bot/run', { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        // Invalidate stats to refresh after scraping
        await queryClient.invalidateQueries({ queryKey: ['stats'] });
        return { success: data.success, message: data.message, accountsProcessed: data.accountsProcessed };
      } else {
        throw new Error(data.error || 'Failed to run bot cycle');
      }
    } catch (error: any) {
      throw error;
    }
  };

  return {
    isRunning,
    isLoading,
    toggleBot,
    runNow,
  };
}





