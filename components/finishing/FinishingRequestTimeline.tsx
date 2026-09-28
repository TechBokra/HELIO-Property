import React from 'react';
import type { FinishingRequestHistoryEntry } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { 
    ClockIcon, 
    CheckCircleIcon, 
    UserPlusIcon, 
    BanknotesIcon, 
    CalendarIcon, 
    ClipboardDocumentListIcon 
} from '../ui/Icons';
import { useLanguage } from '../shared/LanguageContext';

interface FinishingRequestTimelineProps {
    history: FinishingRequestHistoryEntry[];
}

export const FinishingRequestTimeline: React.FC<FinishingRequestTimelineProps> = ({ history }) => {
    const { language } = useLanguage();

    if (!history || history.length === 0) {
        return null;
    }

    const getActionIcon = (actionType: string) => {
        switch (actionType) {
            case 'quote_submitted':
                return <BanknotesIcon className="w-4 h-4 text-amber-500" />;
            case 'quote_accepted':
                return <CheckCircleIcon className="w-4 h-4 text-emerald-500" />;
            case 'partner_assigned':
                return <UserPlusIcon className="w-4 h-4 text-blue-500" />;
            case 'site_visit_scheduled':
                return <CalendarIcon className="w-4 h-4 text-teal-500" />;
            case 'status_change':
                return <ClipboardDocumentListIcon className="w-4 h-4 text-purple-500" />;
            default:
                return <ClockIcon className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <Card>
            <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ClockIcon className="w-4 h-4 text-amber-500" />
                    {language === 'ar' ? 'سجل العمليات والتدقيق (Audit History)' : 'Request Audit Timeline'}
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="relative pl-6 rtl:pl-0 rtl:pr-6 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[11px] rtl:before:left-auto rtl:before:right-[11px] before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                    {history.map((entry) => (
                        <div key={entry.id} className="relative flex items-start gap-3">
                            <span className="absolute -left-6 rtl:-left-auto rtl:-right-6 p-1 rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 shadow-xs z-10">
                                {getActionIcon(entry.actionType)}
                            </span>
                            <div className="flex-grow bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg border border-gray-100 dark:border-gray-700 text-xs space-y-1">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {entry.changedBy}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        {new Date(entry.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </span>
                                </div>
                                {entry.note && (
                                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                                        {entry.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
