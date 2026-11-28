import React from 'react';
import { useLanguage } from './LanguageContext';

interface LoadMoreProps {
    hasMore: boolean;
    onLoadMore: () => void;
    sentinelRef: React.Ref<HTMLDivElement>;
    shown: number;
    total: number;
}

/** Sentinel + fallback button used with useIncrementalList. */
const LoadMore: React.FC<LoadMoreProps> = ({ hasMore, onLoadMore, sentinelRef, shown, total }) => {
    const { language } = useLanguage();
    if (!hasMore) return null;
    return (
        <div ref={sentinelRef} className="flex flex-col items-center gap-2 py-8">
            <button
                type="button"
                onClick={onLoadMore}
                className="px-5 py-2.5 rounded-lg border border-amber-500 text-amber-600 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
                {language === 'ar' ? 'عرض المزيد' : 'Show more'}
            </button>
            <span className="text-xs text-gray-500">
                {language === 'ar' ? `معروض ${shown} من ${total}` : `Showing ${shown} of ${total}`}
            </span>
        </div>
    );
};

export default LoadMore;
