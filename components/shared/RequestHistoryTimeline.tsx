import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRequestHistory } from '../../services/requests';
import type { RequestHistoryEntry } from '../../types';
import { useLanguage } from './LanguageContext';
import { ClockIcon, CheckCircleIcon, ArrowPathIcon } from '../ui/Icons';

interface RequestHistoryTimelineProps {
    requestId: string;
    initialHistory?: RequestHistoryEntry[];
    className?: string;
}

export const RequestHistoryTimeline: React.FC<RequestHistoryTimelineProps> = ({
    requestId,
    initialHistory,
    className = ''
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const { data: history = initialHistory || [], isLoading, error } = useQuery({
        queryKey: ['requestHistory', requestId],
        queryFn: () => getRequestHistory(requestId),
        enabled: !!requestId,
        staleTime: 10000,
    });

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'created':
                return isAr ? 'إنشاء الطلب' : 'Request Created';
            case 'status_changed':
                return isAr ? 'تحديث الحالة' : 'Status Transition';
            case 'reassigned':
                return isAr ? 'إعادة توجيه / تعيين' : 'Partner Reassigned';
            case 'updated':
                return isAr ? 'تعديل البيانات' : 'Details Updated';
            default:
                return action;
        }
    };

    const getActorBadge = (role?: string) => {
        switch (role) {
            case 'super_admin':
            case 'admin':
                return isAr ? 'إدارة المنصة' : 'Platform Admin';
            case 'decoration_manager':
                return isAr ? 'مدير الديكور' : 'Decorations Manager';
            case 'platform_finishing_manager':
                return isAr ? 'مدير التشطيبات' : 'Finishing Manager';
            case 'partner':
                return isAr ? 'الشريك المنفذ' : 'Assigned Partner';
            case 'client':
            case 'customer':
                return isAr ? 'العميل' : 'Customer';
            case 'system':
                return isAr ? 'النظام الآلي' : 'System Automation';
            default:
                return role || (isAr ? 'مستخدم معتمد' : 'Authorized User');
        }
    };

    if (isLoading && (!initialHistory || initialHistory.length === 0)) {
        return (
            <div className={`p-6 text-center text-sm text-gray-500 animate-pulse ${className}`}>
                <div className="flex items-center justify-center gap-2">
                    <ArrowPathIcon className="w-4 h-4 animate-spin text-amber-600" />
                    <span>{isAr ? 'جاري تحميل سجل العمليات...' : 'Loading audit trail...'}</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`p-4 text-center text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg ${className}`}>
                {isAr ? 'تعذر تحميل سجل العمليات.' : 'Could not load audit timeline.'}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className={`py-8 text-center text-sm text-gray-400 dark:text-gray-500 ${className}`}>
                <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>{isAr ? 'لا توجد حركات مسجلة لهذا الطلب حتى الآن.' : 'No audit history entries recorded yet.'}</p>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                {history.map((entry) => {
                    const dateObj = new Date(entry.createdAt);
                    const formattedDate = dateObj.toLocaleDateString(language, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    const formattedTime = dateObj.toLocaleTimeString(language, {
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    return (
                        <div key={entry.id} className="relative group">
                            {/* Marker dot */}
                            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-gray-900 shadow-sm" />

                            <div className="bg-white dark:bg-gray-800/80 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-1.5 transition-colors">
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {getActionLabel(entry.action)}
                                        </span>
                                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                            {getActorBadge(entry.actorRole)} ({entry.actorName})
                                        </span>
                                    </div>
                                    <span className="font-mono text-[11px] text-gray-400 tabular-nums" dir="ltr">
                                        {formattedDate} · {formattedTime}
                                    </span>
                                </div>

                                {entry.note && (
                                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {entry.note}
                                    </p>
                                )}

                                {(entry.oldStatus || entry.newStatus) && (
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                        {entry.oldStatus && (
                                            <>
                                                <span className="line-through opacity-70">{entry.oldStatus}</span>
                                                <span aria-hidden="true">→</span>
                                            </>
                                        )}
                                        <span className="font-bold text-amber-600 dark:text-amber-400">
                                            {entry.newStatus}
                                        </span>
                                    </div>
                                )}

                                {entry.metadata?.assignedToName && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        {isAr ? 'تم التعيين إلى:' : 'Assigned to:'}{' '}
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {entry.metadata.assignedToName}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RequestHistoryTimeline;
