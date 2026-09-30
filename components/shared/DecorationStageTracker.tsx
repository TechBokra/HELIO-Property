import React from 'react';
import type { DecorationStage } from '../../types';
import { useLanguage } from './LanguageContext';
import { CheckIcon } from '../ui/Icons';

export interface StageDefinition {
    key: DecorationStage;
    number: number;
    title: { ar: string; en: string };
    description: { ar: string; en: string };
}

export const DECORATION_STAGES: StageDefinition[] = [
    {
        key: 'consultation',
        number: 1,
        title: { ar: 'الاستشارة وتحديد النطاق', en: 'Consultation & Scope' },
        description: { ar: 'مراجعة متطلبات العميل والمساحة والميزانية', en: 'Initial brief, site study, and design goals' }
    },
    {
        key: 'concept_and_3d',
        number: 2,
        title: { ar: 'التصميم والرسم ثلاثي الأبعاد', en: '3D Concept & Moodboard' },
        description: { ar: 'إعداد اللوحات الفنية والمخططات والمناظير 3D', en: 'Visual moodboards and realistic 3D renderings' }
    },
    {
        key: 'boq_and_materials',
        number: 3,
        title: { ar: 'جدول الكميات واختيار الخامات', en: 'BOQ & Materials Specs' },
        description: { ar: 'تحديد مواصفات الأقمشة، الألوان، والأخشاب وعروض الأسعار', en: 'Detailed bill of quantities and material selection' }
    },
    {
        key: 'execution_and_fitting',
        number: 4,
        title: { ar: 'التنفيذ والتوريد الميداني', en: 'Execution & Fitting' },
        description: { ar: 'بدء الأعمال الفنية، النجارة، الدهانات، وتوريد الأثاث', en: 'On-site execution, bespoke carpentry, and installation' }
    },
    {
        key: 'completed',
        number: 5,
        title: { ar: 'التسليم والفحص النهائي', en: 'Handover & Inspection' },
        description: { ar: 'المعاينة النهائية مع العميل واعتماد اكتمال المشروع', en: 'Final walkthrough, quality audit, and handover' }
    }
];

interface DecorationStageTrackerProps {
    currentStage?: DecorationStage | string;
    onStageChange?: (stage: DecorationStage) => void;
    canManage?: boolean;
    isUpdating?: boolean;
    className?: string;
}

export const DecorationStageTracker: React.FC<DecorationStageTrackerProps> = ({
    currentStage = 'consultation',
    onStageChange,
    canManage = false,
    isUpdating = false,
    className = ''
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';

    const currentStageIndex = DECORATION_STAGES.findIndex(s => s.key === currentStage);
    const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
    const isCancelled = currentStage === 'cancelled';

    return (
        <div className={`space-y-4 ${className}`}>
            {isCancelled ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
                    <span className="font-semibold">
                        {isAr ? 'تم إلغاء طلب الديكور والتصميم الداخلي' : 'Interior design request was cancelled'}
                    </span>
                    {canManage && onStageChange && (
                        <button
                            onClick={() => onStageChange('consultation')}
                            className="text-xs underline hover:text-red-800 dark:hover:text-red-300"
                        >
                            {isAr ? 'إعادة التفعيل' : 'Reactivate'}
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    {/* Progress Bar Line */}
                    <div className="hidden sm:block absolute top-5 left-8 right-8 h-0.5 bg-gray-200 dark:bg-gray-700 z-0" />
                    <div
                        className="hidden sm:block absolute top-5 left-8 h-0.5 bg-amber-600 transition-all duration-300 z-0"
                        style={{
                            width: `${(activeIndex / (DECORATION_STAGES.length - 1)) * 85}%`
                        }}
                    />

                    {/* Stage Steps Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
                        {DECORATION_STAGES.map((stage, idx) => {
                            const isDone = idx < activeIndex;
                            const isCurrent = idx === activeIndex;
                            const isPending = idx > activeIndex;

                            return (
                                <div
                                    key={stage.key}
                                    className={`flex sm:flex-col items-center sm:items-center text-start sm:text-center p-3 sm:p-2 rounded-xl border transition-all ${
                                        isCurrent
                                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700/60 shadow-xs'
                                            : isDone
                                            ? 'bg-white dark:bg-gray-800/60 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                                            : 'bg-white/60 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500'
                                    }`}
                                >
                                    {/* Number / Check circle */}
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                            isDone
                                                ? 'bg-emerald-600 text-white'
                                                : isCurrent
                                                ? 'bg-amber-600 text-white ring-4 ring-amber-100 dark:ring-amber-900/50'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {isDone ? <CheckIcon className="w-5 h-5 stroke-[2.5]" /> : stage.number}
                                    </div>

                                    {/* Text Info */}
                                    <div className="ms-3 sm:ms-0 sm:mt-2.5 flex-1 min-w-0">
                                        <p
                                            className={`text-xs font-bold leading-tight truncate ${
                                                isCurrent
                                                    ? 'text-amber-900 dark:text-amber-300 font-extrabold'
                                                    : isDone
                                                    ? 'text-gray-900 dark:text-gray-100'
                                                    : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                        >
                                            {stage.title[language]}
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 hidden sm:block">
                                            {stage.description[language]}
                                        </p>
                                    </div>

                                    {/* Manager Advance Button */}
                                    {canManage && onStageChange && isCurrent && idx < DECORATION_STAGES.length - 1 && (
                                        <button
                                            type="button"
                                            disabled={isUpdating}
                                            onClick={() => onStageChange(DECORATION_STAGES[idx + 1].key)}
                                            className="ms-auto sm:ms-0 sm:mt-2 px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50"
                                        >
                                            {isAr ? 'الانتقال للمرحلة التالية' : 'Advance'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DecorationStageTracker;
