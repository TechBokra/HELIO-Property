import React from 'react';

interface ResponsiveListProps<T> {
    items: T[];
    renderTable: (items: T[]) => React.ReactNode;
    renderCard: (item: T, index: number) => React.ReactNode;
    emptyState: React.ReactNode;
}

export function ResponsiveList<T>({
    items,
    renderTable,
    renderCard,
    emptyState,
}: ResponsiveListProps<T>) {

    if (items.length === 0) {
        return <>{emptyState}</>;
    }

    return (
        <>
            {/* Mobile/Tablet View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {items.map(renderCard)}
            </div>
            
            {/* Desktop View */}
            <div className="hidden lg:block">
                {renderTable(items)}
            </div>
        </>
    );
}