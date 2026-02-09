import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
}

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullDistance: number;
  isPulling: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 150,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);

  const getScrollTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 0;
    
    // Find the scrollable element (with data-app-scroll or the container itself)
    const scrollable = container.querySelector('[data-app-scroll]') || container;
    return scrollable.scrollTop;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = getScrollTop();
    if (scrollTop > 5) return; // Allow small tolerance
    
    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
  }, [disabled, isRefreshing, getScrollTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || disabled || isRefreshing) return;
    
    const scrollTop = getScrollTop();
    if (scrollTop > 5) {
      // User scrolled down, cancel pull
      isPullingRef.current = false;
      setPullDistance(0);
      setIsPulling(false);
      return;
    }
    
    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;
    
    if (diff > 0) {
      // Apply resistance (pull feels heavier as you pull more)
      const resistance = 0.5;
      const pull = Math.min(diff * resistance, maxPull);
      setPullDistance(pull);
      setIsPulling(true);
      
      // Prevent default scroll behavior when pulling down
      if (pull > 10) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [disabled, isRefreshing, maxPull, getScrollTop]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current) return;
    
    isPullingRef.current = false;
    
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold); // Snap to threshold during refresh
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
      }
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add touch event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    containerRef,
  };
}
