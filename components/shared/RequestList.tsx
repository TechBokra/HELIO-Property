
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../shared/LanguageContext';

interface RequestListProps<T extends { id: string; createdAt: string; }> {
  title: string;
  requests: T[] | undefined;
  linkTo: string;
  itemRenderer: (item: T) => React.ReactNode;
}

function RequestListInner<T extends { id: string; createdAt: string; }>({ title, requests, linkTo, itemRenderer }: RequestListProps<T>) {
    const { t } = useLanguage();
    const t_page = t.adminDashboard.customerRelationsHome;
    const recentRequests = useMemo(() => (requests || []).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5), [requests]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                <Link to={linkTo} className="text-sm font-semibold text-amber-600 hover:underline">{t_page.viewAll}</Link>
            </div>
            {recentRequests.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentRequests.map(item => itemRenderer(item))}
                </ul>
            ) : (
                <p className="text-center text-sm py-8 text-gray-500 dark:text-gray-400">{t_page.noNewRequests}</p>
            )}
        </div>
    );
}

const RequestList = React.memo(RequestListInner) as typeof RequestListInner;

export default RequestList;
