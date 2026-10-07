import React from 'react';
import { useLanguage } from '../../shared/LanguageContext';
import { type OperationalMetrics } from '../../../types';
import { 
    ClipboardDocumentListIcon, 
    ExclamationTriangleIcon, 
    InboxIcon, 
    SparklesIcon, 
    CheckCircleIcon,
    UsersIcon
} from '../../ui/Icons';

interface OperationalMetricsBarProps {
    metrics: OperationalMetrics;
    activeView: string;
    onViewChange: (view: string) => void;
    isLoading?: boolean;
}

export const OperationalMetricsBar: React.FC<OperationalMetricsBarProps> = ({
    metrics,
    activeView,
    onViewChange,
    isLoading = false
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const cards = [
        {
            id: 'all',
            label: isAr ? 'إجمالي الطلبات' : 'All Requests',
            count: metrics.total,
            icon: ClipboardDocumentListIcon,
            color: 'text-gray-700 bg-gray-50 border-gray-200',
            activeColor: 'ring-2 ring-amber-500 bg-amber-50/40 border-amber-300',
            badgeColor: 'bg-gray-100 text-gray-700',
        },
        {
            id: 'unassigned',
            label: isAr ? 'غير معينة (تتطلب مسؤول)' : 'Unassigned',
            count: metrics.unassigned,
            icon: UsersIcon,
            color: 'text-red-700 bg-red-50/30 border-red-200',
            activeColor: 'ring-2 ring-red-500 bg-red-50/60 border-red-300',
            badgeColor: 'bg-red-100 text-red-700 font-bold',
            alert: metrics.unassigned > 0,
        },
        {
            id: 'new',
            label: isAr ? 'طلبات جديدة' : 'New Intake',
            count: metrics.newCount,
            icon: InboxIcon,
            color: 'text-blue-700 bg-blue-50/30 border-blue-200',
            activeColor: 'ring-2 ring-blue-500 bg-blue-50/60 border-blue-300',
            badgeColor: 'bg-blue-100 text-blue-700',
        },
        {
            id: 'aged',
            label: isAr ? 'تجاوزت المهلة (> 48 ساعة)' : 'Aged / At-Risk',
            count: metrics.agedRisk,
            icon: ExclamationTriangleIcon,
            color: 'text-amber-800 bg-amber-50/40 border-amber-200',
            activeColor: 'ring-2 ring-amber-500 bg-amber-100/60 border-amber-400',
            badgeColor: 'bg-amber-100 text-amber-800 font-bold',
            alert: metrics.agedRisk > 0,
        },
        {
            id: 'waiting',
            label: isAr ? 'بانتظار العميل / الشريك' : 'Waiting on Action',
            count: metrics.waiting,
            icon: SparklesIcon,
            color: 'text-purple-700 bg-purple-50/30 border-purple-200',
            activeColor: 'ring-2 ring-purple-500 bg-purple-50/60 border-purple-300',
            badgeColor: 'bg-purple-100 text-purple-700',
        },
        {
            id: 'high_priority',
            label: isAr ? 'أولوية عاجلة' : 'High Priority',
            count: metrics.highPriority,
            icon: ExclamationTriangleIcon,
            color: 'text-rose-800 bg-rose-50/30 border-rose-200',
            activeColor: 'ring-2 ring-rose-500 bg-rose-50/60 border-rose-300',
            badgeColor: 'bg-rose-100 text-rose-800 font-bold',
            alert: metrics.highPriority > 0,
        },
        {
            id: 'resolved',
            label: isAr ? 'مكتملة ومغلقة' : 'Resolved & Closed',
            count: metrics.resolvedToday,
            icon: CheckCircleIcon,
            color: 'text-emerald-700 bg-emerald-50/30 border-emerald-200',
            activeColor: 'ring-2 ring-emerald-500 bg-emerald-50/60 border-emerald-300',
            badgeColor: 'bg-emerald-100 text-emerald-700',
        },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
            {cards.map(card => {
                const Icon = card.icon;
                const isActive = activeView === card.id;

                return (
                    <button
                        key={card.id}
                        type="button"
                        onClick={() => onViewChange(card.id)}
                        disabled={isLoading}
                        className={`text-start p-3 rounded-xl border transition-all flex flex-col justify-between ${card.color} ${
                            isActive ? card.activeColor : 'hover:border-amber-300 hover:shadow-2xs'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="p-1 rounded-md bg-white shadow-3xs">
                                <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono font-bold ${card.badgeColor}`}>
                                {isLoading ? '—' : card.count}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-gray-800 line-clamp-1 block">
                                {card.label}
                            </span>
                            {card.alert && !isLoading && (
                                <span className="text-[9px] font-semibold text-red-600 block mt-0.5">
                                    {isAr ? 'يتطلب إجراء فوري' : 'Requires triage'}
                                </span>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
