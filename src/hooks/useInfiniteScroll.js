import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for managing infinite scroll functionality
 * Handles intersection observer, loading states, and smooth item loading
 */
export const useInfiniteScroll = (totalItems, initialDisplayCount = 50, loadMoreCount = 50) => {
  const [displayedCount, setDisplayedCount] = useState(initialDisplayCount);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [newItemsLoaded, setNewItemsLoaded] = useState(false);
  
  const loadingRef = useRef(null);
  const observerRef = useRef(null);

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

  // Intersection Observer for smooth loading
  useEffect(() => {
    if (!loadingRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && hasMore && !isLoadingMore) {
            loadMoreItems();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before reaching the element
        threshold: 0.1
      }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loadMoreItems]);

  // Cleanup observer when component unmounts
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

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