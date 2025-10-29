import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing infinite scroll functionality
 * Uses scroll listener to detect when loading element becomes visible
 */
export const useInfiniteScroll = (totalItems, initialDisplayCount = 50, loadMoreCount = 50) => {
  const [displayedCount, setDisplayedCount] = useState(initialDisplayCount);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newItemsLoaded, setNewItemsLoaded] = useState(false);
  
  const loadingRef = useRef(null);

  // Calculate if there are more items to load
  const hasMoreItems = totalItems && displayedCount < totalItems;

  // Update hasMore state when totalItems or displayedCount changes
  useEffect(() => {
    setHasMore(hasMoreItems);
  }, [hasMoreItems]);

  // Smooth loading function with animation
  const loadMoreItems = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    
    // Simulate a small delay for smoother feel
    setTimeout(() => {
      setDisplayedCount(prev => {
        const newCount = prev + loadMoreCount;
        const hasMoreItems = totalItems && newCount < totalItems;
        setHasMore(hasMoreItems);
        setNewItemsLoaded(true);
        setIsLoadingMore(false);
        
        // Reset the new items flag after animation
        setTimeout(() => setNewItemsLoaded(false), 300);
        
        return newCount;
      });
    }, 150);
  }, [isLoadingMore, hasMore, totalItems, loadMoreCount]);

  // Scroll listener for infinite loading
  useEffect(() => {
    if (!loadingRef.current) return;

    const handleScroll = () => {
      if (!loadingRef.current || !hasMore || isLoadingMore) return;
      
      const rect = loadingRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isVisible) {
        loadMoreItems();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, isLoadingMore, loadMoreItems]);

  // Reset displayed count (useful when filters change)
  const resetDisplayCount = useCallback(() => {
    setDisplayedCount(initialDisplayCount);
    setNewItemsLoaded(false);
  }, [initialDisplayCount]);

  return {
    displayedCount,
    hasMore,
    isLoadingMore,
    newItemsLoaded,
    loadingRef,
    resetDisplayCount
  };
};