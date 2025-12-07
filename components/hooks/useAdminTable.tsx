import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '../ui/Icons';
import { useDebounce } from './useDebounce';

type SortDirection = 'ascending' | 'descending';

export type SortConfig<T> = {
    key: keyof T | string; // Allow string for dot notation
    direction: SortDirection;
} | null;

// Generic helper for safe nested property access
function getNestedValue<T>(obj: T, path: string): unknown {
    if (!path) return obj;
    // Safe traversal without 'any'
    return path.split('.').reduce((o: unknown, i: string) => {
        if (o && typeof o === 'object' && i in (o as object)) {
            return (o as Record<string, unknown>)[i];
        }
        return undefined;
    }, obj);
}

export function useAdminTable<T>({
    data = [],
    itemsPerPage = 10,
    initialSort,
    initialFilters = {},
    searchFn,
    filterFns,
}: {
    data: T[] | undefined;
    itemsPerPage?: number;
    initialSort: SortConfig<T>;
    initialFilters?: Record<string, string>;
    searchFn: (item: T, searchTerm: string) => boolean;
    filterFns: Record<string, (item: T, value: string) => boolean>;
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig<T>>(initialSort);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [filters, setFilters] = useState<Record<string, string>>(initialFilters);

    useEffect(() => {
        if (Object.keys(initialFilters).length > 0) {
            setFilters(prev => ({ ...prev, ...initialFilters }));
        }
    }, [initialFilters]);

    const setFilter = useCallback((key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setCurrentPage(1); 
    }, []);

    const processedData = useMemo(() => {
        if (!data) return [];
        let items = [...data];

        // 1. Search
        if (debouncedSearchTerm.trim()) {
            const lowercasedTerm = debouncedSearchTerm.trim().toLowerCase();
            items = items.filter((item) => searchFn(item, lowercasedTerm));
        }

        // 2. Filter
        for (const key in filters) {
            if (Object.prototype.hasOwnProperty.call(filters, key)) {
                const value = filters[key];
                if (value && value !== 'all' && filterFns[key]) {
                    items = items.filter((item) => filterFns[key](item, value));
                }
            }
        }

        // 3. Sort
        if (sortConfig) {
            items.sort((a, b) => {
                const aValue = getNestedValue(a, sortConfig.key as string);
                const bValue = getNestedValue(b, sortConfig.key as string);
                const dir = sortConfig.direction === 'ascending' ? 1 : -1;

                // Safe Type checking for sorting
                if (aValue === bValue) return 0;
                
                // Handle nulls/undefined
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                // Handle numbers
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return (aValue - bValue) * dir;
                }
                
                // Handle booleans
                if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    return (aValue === bValue ? 0 : aValue ? -1 : 1) * dir;
                }

                // Default to string comparison
                const stringA = String(aValue).toLowerCase();
                const stringB = String(bValue).toLowerCase();

                return stringA.localeCompare(stringB) * dir;
            });
        }
        return items;
    }, [data, debouncedSearchTerm, filters, sortConfig, searchFn, filterFns]);

    // Reset page if data length changes significantly
    useEffect(() => {
        const newTotalPages = Math.ceil(processedData.length / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(newTotalPages);
        } else if (currentPage === 0 && newTotalPages > 0) {
            setCurrentPage(1);
        }
    }, [processedData.length, itemsPerPage, currentPage]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedData.slice(start, start + itemsPerPage);
    }, [processedData, currentPage, itemsPerPage]);

    const requestSort = useCallback(
        (key: string) => {
            let direction: SortDirection = 'ascending';
            if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
                direction = 'descending';
            }
            setSortConfig({ key, direction });
        },
        [sortConfig],
    );

    const getSortIcon = useCallback(
        (key: string) => {
            if (!sortConfig || sortConfig.key !== key) {
                return (
                    <span className="w-4 h-4 ml-1 inline-block opacity-0 group-hover:opacity-50" aria-hidden="true">
                        <ArrowUpIcon />
                    </span>
                );
            }
            return sortConfig.direction === 'ascending' ? (
                <ArrowUpIcon className="w-4 h-4 ml-1 inline-block text-amber-500" aria-label="Sorted Ascending" />
            ) : (
                <ArrowDownIcon className="w-4 h-4 ml-1 inline-block text-amber-500" aria-label="Sorted Descending" />
            );
        },
        [sortConfig]
    );

    return {
        paginatedItems,
        totalPages,
        currentPage,
        setCurrentPage,
        searchTerm,
        setSearchTerm,
        filters,
        setFilter,
        requestSort,
        getSortIcon,
    };
}