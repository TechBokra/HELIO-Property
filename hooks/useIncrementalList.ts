import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Renders long lists in batches. The next batch is added when the sentinel
 * scrolls into view (or when the "show more" button is pressed), so a page with
 * hundreds of cards only mounts — and only downloads images for — what is near
 * the viewport. Resets to the first batch whenever `resetKey` changes
 * (e.g. a filter or tab change).
 */
export const useIncrementalList = <T,>(items: readonly T[], pageSize = 12, resetKey?: unknown) => {
    const [visibleCount, setVisibleCount] = useState(pageSize);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setVisibleCount(pageSize);
    }, [resetKey, pageSize]);

    const hasMore = visibleCount < items.length;
    const showMore = useCallback(() => setVisibleCount((c) => c + pageSize), [pageSize]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) showMore();
            },
            { rootMargin: '600px 0px' }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, showMore, visibleCount]);

    return {
        visibleItems: items.slice(0, visibleCount),
        hasMore,
        showMore,
        sentinelRef,
        total: items.length,
        shown: Math.min(visibleCount, items.length),
    };
};
