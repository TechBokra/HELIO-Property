import React, { useState } from 'react';
import type { FinishingQuote, FinishingQuoteStatus } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    CheckCircleIcon, 
    BanknotesIcon, 
    CalendarIcon, 
    ShieldCheckIcon, 
    ClipboardDocumentListIcon,
    XCircleIcon,
    ClockIcon
} from '../ui/Icons';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { acceptQuoteAndAward } from '../../services/finishing';
import { useAuth } from '../auth/AuthContext';

interface FinishingQuoteComparisonProps {
    requestId: string;
    propertyArea?: number;
    quotes: FinishingQuote[];
    onQuoteAction?: () => void;
    canAward?: boolean;
}

const statusBadgeStyles: Record<FinishingQuoteStatus, { bg: string; text: string; label: { ar: string; en: string } }> = {
    draft: { 
        bg: 'bg-gray-100 dark:bg-gray-800 border-gray-300', 
        text: 'text-gray-600 dark:text-gray-400',
        label: { ar: 'مسودة', en: 'Draft' } 
    },
    submitted: { 
        bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800', 
        text: 'text-blue-700 dark:text-blue-300',
        label: { ar: 'عطاء مقدم للمراجعة', en: 'Submitted for Review' } 
    },
    under_review: { 
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800', 
        text: 'text-amber-700 dark:text-amber-300',
        label: { ar: 'قيد المقارنة والدراسة', en: 'Under Evaluation' } 
    },
    accepted: { 
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700', 
        text: 'text-emerald-700 dark:text-emerald-300 font-bold',
        label: { ar: 'تم الاعتماد والترسية ✓', en: 'Awarded & Accepted ✓' } 
    },
    rejected: { 
        bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800', 
        text: 'text-red-700 dark:text-red-300',
        label: { ar: 'مستبعد', en: 'Declined' } 
    }
};

export const FinishingQuoteComparison: React.FC<FinishingQuoteComparisonProps> = ({
    requestId,
    propertyArea,
    quotes,
    onQuoteAction,
    canAward = true
}) => {
    const { language } = useLanguage();
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const [awardingQuoteId, setAwardingQuoteId] = useState<string | null>(null);

    if (!quotes || quotes.length === 0) {
        return (
            <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700 p-8 text-center bg-gray-50/50 dark:bg-gray-800/20">
                <ClipboardDocumentListIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-1">
                    {language === 'ar' ? 'لا توجد عروض مقايسة مقدمة بعد' : 'No contractor quotes submitted yet'}
                </h4>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                    {language === 'ar'
                        ? 'سيظهر هنا جدول مقارنة مفصل لمقايسات الأسعار ومواعيد التسليم والضمان فور تقديمها من المقاولين المعتمدين.'
                        : 'Side-by-side quote comparison table will appear here once contractors submit their proposals.'}
                </p>
            </Card>
        );
    }

    const handleAward = async (quote: FinishingQuote) => {
        if (!window.confirm(
            language === 'ar' 
                ? `هل أنت متأكد من اعتماد عرض المقاولة المقدم من "${quote.partnerName}" بقيمة ${quote.totalPrice.toLocaleString()} ج.م وترسية المشروع؟` 
                : `Are you sure you want to award this project to "${quote.partnerName}" for ${quote.totalPrice.toLocaleString()} EGP?`
        )) {
            return;
        }

        setAwardingQuoteId(quote.id);
        try {
            await acceptQuoteAndAward(
                quote.id,
                requestId,
                currentUser?.name || 'Platform Finishing Manager',
                quote.partnerName
            );
            showToast(
                language === 'ar' ? 'تم اعتماد العرض وترسية المشروع بنجاح!' : 'Quote accepted and project awarded!',
                'success'
            );
            onQuoteAction?.();
        } catch {
            showToast(language === 'ar' ? 'فشل اعتماد العرض.' : 'Failed to award quote.', 'error');
        } finally {
            setAwardingQuoteId(null);
        }
    };

    // Find lowest price for highlighting
    const lowestPrice = quotes.reduce((min, q) => q.totalPrice < min ? q.totalPrice : min, Infinity);
    const shortestTimeline = quotes.reduce((min, q) => q.executionTimelineDays < min ? q.executionTimelineDays : min, Infinity);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BanknotesIcon className="w-5 h-5 text-amber-500" />
                        {language === 'ar' ? 'مقارنة عروض ومقايسات المقاولين (Quote Comparison)' : 'Contractor Quotes & Bids'}
                    </h3>
                    <p className="text-xs text-gray-500">
                        {language === 'ar'
                            ? `تم استلام ${quotes.length} عروض مقايسة تفصيلية لهذا الطلب`
                            : `${quotes.length} verified quotes received for evaluation`}
                    </p>
                </div>
            </div>

            {/* Side-by-side comparative grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotes.map((quote) => {
                    const isLowest = quote.totalPrice === lowestPrice && quotes.length > 1;
                    const isFastest = quote.executionTimelineDays === shortestTimeline && quotes.length > 1;
                    const isAwarded = quote.status === 'accepted';
                    const isDeclined = quote.status === 'rejected';
                    const statusInfo = statusBadgeStyles[quote.status] || statusBadgeStyles.submitted;

                    const effectiveArea = propertyArea || 120;
                    const calcPricePerSqm = quote.pricePerSqm || Math.round(quote.totalPrice / effectiveArea);

                    return (
                        <Card 
                            key={quote.id} 
                            className={`flex flex-col transition-all duration-200 relative overflow-hidden border-2 ${
                                isAwarded 
                                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-md' 
                                    : isDeclined 
                                        ? 'border-gray-200 dark:border-gray-800 opacity-60' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                            }`}
                        >
                            {/* Top Badges */}
                            <div className="p-4 pb-2 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-start gap-2">
                                <div>
                                    <h4 className="font-bold text-base text-gray-900 dark:text-white">
                                        {quote.partnerName}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 font-mono">
                                        {new Date(quote.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                                    </p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.text}`}>
                                    {statusInfo.label[language]}
                                </span>
                            </div>

                            <CardContent className="p-4 flex-grow space-y-4 text-sm">
                                {/* Total Price Callout */}
                                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-xs text-gray-500 uppercase font-semibold">
                                            {language === 'ar' ? 'إجمالي المقايسة' : 'Total Bid Price'}
                                        </span>
                                        {isLowest && (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded">
                                                {language === 'ar' ? 'الأفضل سعراً' : 'Best Value'}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                                        {quote.totalPrice.toLocaleString(language)} <span className="text-xs font-normal text-gray-500">{quote.currency}</span>
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        {language === 'ar' 
                                            ? `المتوسط للمتر: ~${calcPricePerSqm.toLocaleString(language)} ج.م / م²` 
                                            : `~${calcPricePerSqm.toLocaleString(language)} EGP / m²`}
                                    </p>
                                </div>

                                {/* Key Specs: Timeline & Warranty */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2.5 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <span className="flex items-center gap-1 text-gray-500 mb-1">
                                            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                                            {language === 'ar' ? 'مدة التنفيذ' : 'Timeline'}
                                        </span>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {quote.executionTimelineDays} {language === 'ar' ? 'يوم عمل' : 'days'}
                                        </p>
                                        {isFastest && (
                                            <span className="text-[10px] text-blue-600 font-semibold">
                                                {language === 'ar' ? 'الأسرع تسليماً' : 'Fastest'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="p-2.5 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <span className="flex items-center gap-1 text-gray-500 mb-1">
                                            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                            {language === 'ar' ? 'فترة الضمان' : 'Warranty'}
                                        </span>
                                        <p className="font-bold text-gray-900 dark:text-white">
                                            {quote.warrantyMonths} {language === 'ar' ? 'شهراً' : 'months'}
                                        </p>
                                        <span className="text-[10px] text-emerald-600 font-semibold">
                                            {language === 'ar' ? 'ضمان كتابي' : 'Certified'}
                                        </span>
                                    </div>
                                </div>

                                {/* Scope Items Breakdown */}
                                {quote.scopeItems && quote.scopeItems.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                            {language === 'ar' ? 'تفصيل بنود المقايسة:' : 'Scope Breakdown:'}
                                        </p>
                                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                                            {quote.scopeItems.map((item, idx) => (
                                                <div key={item.id || idx} className="flex justify-between items-center text-xs py-1 px-1.5 rounded bg-gray-50/80 dark:bg-gray-800/40">
                                                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                                                        {item.description[language] || item.description.en}
                                                    </span>
                                                    <span className="font-mono font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                                        {item.amount.toLocaleString(language)} {quote.currency}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {quote.notes && (
                                    <p className="text-xs text-gray-500 italic bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                        "{quote.notes}"
                                    </p>
                                )}
                            </CardContent>

                            {/* Award / Status Button Footer */}
                            {canAward && (
                                <div className="p-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                    {isAwarded ? (
                                        <div className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                            <CheckCircleIcon className="w-4 h-4" />
                                            {language === 'ar' ? 'العرض المعتمد قيد التنفيذ' : 'Awarded Contractor'}
                                        </div>
                                    ) : isDeclined ? (
                                        <p className="text-center text-xs text-gray-400 py-1.5">
                                            {language === 'ar' ? 'تم استبعاد هذا العرض' : 'Quote Declined'}
                                        </p>
                                    ) : (
                                        <Button
                                            onClick={() => handleAward(quote)}
                                            isLoading={awardingQuoteId === quote.id}
                                            disabled={!!awardingQuoteId}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow"
                                        >
                                            <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                                            {language === 'ar' ? 'اعتماد العرض وترسية المشروع' : 'Accept & Award Project'}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
