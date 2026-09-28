import React, { useState } from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    CloseIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ShieldCheckIcon, 
    BuildingIcon, 
    PhoneIcon, 
    SparklesIcon,
    ChevronDownIcon,
    ChevronUpIcon
} from '../ui/Icons';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Card, CardContent } from '../ui/Card';
import { 
    getQuotesByRequestId, 
    getProjectMilestones, 
    clientAcceptQuote 
} from '../../services/finishing';
import { FinishingMilestonesTracker } from '../finishing/FinishingMilestonesTracker';
import type { Request, FinishingQuote } from '../../types';
import { useToast } from '../shared/ToastContext';
import ConfirmationModal from '../shared/ConfirmationModal';

interface ClientFinishingDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: Request;
}

export const ClientFinishingDetailsModal: React.FC<ClientFinishingDetailsModalProps> = ({
    isOpen,
    onClose,
    request
}) => {
    const { language } = useLanguage();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const isAr = language === 'ar';

    const [activeTab, setActiveTab] = useState<'quotes' | 'milestones' | 'specs'>('quotes');
    const [selectedQuoteForAward, setSelectedQuoteForAward] = useState<FinishingQuote | null>(null);
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const [isSubmittingAward, setIsSubmittingAward] = useState(false);
    const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

    const payload = (request.payload || {}) as any;
    const isFinishing = request.service === 'finishing' || payload.serviceType === 'finishing' || request.type === 'LEAD';

    // Fetch quotes for this request
    const { 
        data: quotes = [], 
        isLoading: quotesLoading, 
        refetch: refetchQuotes 
    } = useQuery({
        queryKey: ['finishingQuotes', request.id],
        queryFn: () => getQuotesByRequestId(request.id),
        enabled: isOpen && !!request.id
    });

    // Fetch milestones for this request
    const { 
        data: milestones = [], 
        refetch: refetchMilestones 
    } = useQuery({
        queryKey: ['finishingMilestones', request.id],
        queryFn: () => getProjectMilestones(request.id),
        enabled: isOpen && !!request.id
    });

    if (!isOpen) return null;

    const acceptedQuote = quotes.find(q => q.status === 'accepted');

    const handleConfirmAward = async () => {
        if (!selectedQuoteForAward) return;
        setIsSubmittingAward(true);
        try {
            await clientAcceptQuote(request.id, selectedQuoteForAward.id, request.requesterInfo?.name || 'العميل');
            showToast(
                isAr ? 'تهانينا! تم اعتماد عرض المقاول بنجاح وتفعيل مراحل المشروع.' : 'Contractor quote accepted and project milestones activated!',
                'success'
            );
            setIsAwardModalOpen(false);
            setSelectedQuoteForAward(null);
            refetchQuotes();
            refetchMilestones();
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
            setActiveTab('milestones');
        } catch {
            showToast(isAr ? 'حدث خطأ أثناء اعتماد العرض' : 'Failed to accept quote', 'error');
        } finally {
            setIsSubmittingAward(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto border border-gray-100 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start gap-4 bg-gray-50/80 dark:bg-gray-800/80">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                {isAr ? 'مشروع تشطيب وديكور' : 'Finishing & Fit-out Project'}
                            </span>
                            <StatusBadge status={request.status} />
                            {acceptedQuote && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                                    {isAr ? 'تم التعاقد رسمياً' : 'Contract Awarded'}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                            {payload.serviceTitle || (isAr ? 'طلب تشطيب وحدة سكنية' : 'Finishing Inquiry')}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isAr ? 'رقم الطلب:' : 'Request ID:'} <span className="font-mono">{request.id.slice(0, 12)}...</span> • {new Date(request.createdAt).toLocaleDateString(language, { dateStyle: 'long' })}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-white dark:bg-gray-900">
                    <button
                        onClick={() => setActiveTab('quotes')}
                        className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'quotes'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span>{isAr ? 'عروض المقاولين والمقايسات' : 'Contractor Bids & Quotes'}</span>
                        <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-extrabold">
                            {quotes.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('milestones')}
                        className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'milestones'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <ClockIcon className="w-4 h-4" />
                        <span>{isAr ? 'مراحل التنفيذ والاستلام' : 'Project Milestones'}</span>
                        {acceptedQuote && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('specs')}
                        className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'specs'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        <BuildingIcon className="w-4 h-4" />
                        <span>{isAr ? 'مواصفات العقار والطلب' : 'Unit Specifications'}</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-5 sm:p-6 overflow-y-auto flex-grow space-y-6">
                    
                    {/* TAB 1: Quotes */}
                    {activeTab === 'quotes' && (
                        <div className="space-y-6">
                            
                            {/* Awarded Banner if accepted */}
                            {acceptedQuote && (
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
                                                ✓
                                            </div>
                                            <div>
                                                <span className="text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider block">
                                                    {isAr ? 'تم اعتماد العرض والتعاقد رسميًا' : 'Contract Awarded & Active'}
                                                </span>
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {acceptedQuote.partnerName}
                                                </h4>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                                                    {isAr
                                                        ? 'المقاول المعتمد باشر العمل وفق المخطط الزمني والهندسي المعتمد.'
                                                        : 'Certified contractor is now assigned and project execution has commenced.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Button
                                                onClick={() => setActiveTab('milestones')}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl flex-1 sm:flex-initial"
                                            >
                                                {isAr ? 'متابعة مراحل التنفيذ ←' : 'View Milestones →'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quotes List */}
                            {quotesLoading ? (
                                <div className="py-12 text-center text-gray-500">
                                    {isAr ? 'جاري تحميل عروض الأسعار...' : 'Loading bids...'}
                                </div>
                            ) : quotes.length === 0 ? (
                                <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                    <SparklesIcon className="w-12 h-12 text-amber-500 mx-auto mb-3 opacity-80" />
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        {isAr ? 'جاري دراسة مقايسة وحدتك' : 'Quotes Are Being Prepared'}
                                    </h4>
                                    <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                                        {isAr
                                            ? 'طلبك الآن قيد المعاينة والفحص بواسطة مديري التشطيب والشركات المعتمدة في هليوبوليس الجديدة، وستصلك العروض التنافسية هنا مباشرة.'
                                            : 'Your request is being reviewed by platform engineers and certified contractors. Competitive bids will appear here shortly.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
                                        <span>{isAr ? 'عروض الأسعار المتاحة للمقارنة والاعتماد:' : 'Available Bids for Comparison:'}</span>
                                        <span>{quotes.length} {isAr ? 'عروض' : 'Bids'}</span>
                                    </div>

                                    {quotes.map((q) => {
                                        const isWinning = q.status === 'accepted';
                                        const isRejected = q.status === 'rejected';
                                        const isExpanded = expandedQuoteId === q.id;

                                        return (
                                            <Card 
                                                key={q.id}
                                                className={`border-2 transition-all ${
                                                    isWinning 
                                                        ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20' 
                                                        : isRejected
                                                        ? 'border-gray-200 dark:border-gray-800 opacity-60'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-400 bg-white dark:bg-gray-800'
                                                }`}
                                            >
                                                <CardContent className="p-5 sm:p-6 space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="text-lg font-extrabold text-gray-900 dark:text-white">
                                                                    {q.partnerName}
                                                                </h4>
                                                                <span className="p-1 bg-amber-500/10 text-amber-600 rounded text-xs">
                                                                    ★ {isAr ? 'مقاول معتمد' : 'Verified'}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                                <span className="flex items-center gap-1">
                                                                    <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                                                                    {q.executionTimelineDays} {isAr ? 'يوم عمل' : 'working days'}
                                                                </span>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-1">
                                                                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                                    {Math.round(q.warrantyMonths / 12)} {isAr ? 'سنوات ضمان هندسي' : 'years warranty'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="sm:text-right">
                                                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                                                {q.totalPrice.toLocaleString(language)} <span className="text-sm font-bold">{q.currency}</span>
                                                            </div>
                                                            {q.pricePerSqm && (
                                                                <div className="text-xs text-gray-500">
                                                                    ({q.pricePerSqm.toLocaleString(language)} {q.currency} / {isAr ? 'م²' : 'm²'})
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Scope Summary */}
                                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                                {isAr ? 'بنود ومواصفات المقايسة:' : 'Scope Items:'} ({q.scopeItems?.length || 0} {isAr ? 'بند' : 'items'})
                                                            </span>
                                                            <button 
                                                                onClick={() => setExpandedQuoteId(isExpanded ? null : q.id)}
                                                                className="text-xs text-amber-600 hover:underline font-semibold flex items-center gap-1"
                                                            >
                                                                {isExpanded ? (isAr ? 'إخفاء التفاصيل' : 'Hide details') : (isAr ? 'عرض تفاصيل المقايسة' : 'Show details')}
                                                                {isExpanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>

                                                        {isExpanded && q.scopeItems && (
                                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                                                                {q.scopeItems.map((item, idx) => (
                                                                    <div key={item.id || idx} className="flex justify-between items-center p-1.5 border-b border-gray-200/50 dark:border-gray-800 last:border-b-0">
                                                                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                                                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
                                                                            {item.description[language] || item.description.en}
                                                                        </span>
                                                                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                                                                            {item.amount.toLocaleString(language)} {q.currency}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-between items-center pt-2">
                                                        <div>
                                                            {isWinning ? (
                                                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                                                    <CheckCircleIcon className="w-4 h-4" />
                                                                    {isAr ? 'العرض المعتمد والمنفذ حالياً' : 'Awarded Offer'}
                                                                </span>
                                                            ) : isRejected ? (
                                                                <span className="text-xs text-gray-400">
                                                                    {isAr ? 'عرض غير مختار' : 'Declined Bid'}
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        {!acceptedQuote && (
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedQuoteForAward(q);
                                                                    setIsAwardModalOpen(true);
                                                                }}
                                                                className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs py-2 px-4 rounded-xl shadow-md shadow-amber-500/20"
                                                            >
                                                                {isAr ? 'اعتماد هذا العرض والتعاقد 🤝' : 'Accept & Award This Bid 🤝'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    )}

                    {/* TAB 2: Milestones */}
                    {activeTab === 'milestones' && (
                        <div className="space-y-4">
                            <FinishingMilestonesTracker
                                requestId={request.id}
                                milestones={milestones}
                                canManage={false}
                                onMilestoneUpdated={refetchMilestones}
                            />
                        </div>
                    )}

                    {/* TAB 3: Specs & Property */}
                    {activeTab === 'specs' && (
                        <div className="space-y-6">
                            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <CardContent className="p-6 space-y-4 text-sm">
                                    <h4 className="font-bold text-base text-gray-900 dark:text-white border-b pb-2 border-gray-100 dark:border-gray-700">
                                        {isAr ? 'تفاصيل طلب التشطيب المقدم:' : 'Submitted Request Parameters:'}
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-gray-400 block">{isAr ? 'الخدمة / الباقة:' : 'Service / Tier:'}</span>
                                            <span className="font-semibold text-gray-900 dark:text-white">{payload.serviceTitle || 'N/A'}</span>
                                        </div>

                                        {payload.tierDetails?.tierName && (
                                            <div>
                                                <span className="text-xs text-gray-400 block">{isAr ? 'اسم الباقة:' : 'Tier Name:'}</span>
                                                <span className="font-semibold text-amber-600">{payload.tierDetails.tierName[language] || payload.tierDetails.tierName.en}</span>
                                            </div>
                                        )}

                                        {payload.propertyId && (
                                            <div>
                                                <span className="text-xs text-gray-400 block">{isAr ? 'معرف العقار المرتبط:' : 'Linked Property ID:'}</span>
                                                <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{payload.propertyId}</span>
                                            </div>
                                        )}

                                        {payload.area && (
                                            <div>
                                                <span className="text-xs text-gray-400 block">{isAr ? 'المساحة:' : 'Unit Area:'}</span>
                                                <span className="font-bold">{payload.area} {isAr ? 'متر مربع' : 'm²'}</span>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-xs text-gray-400 block">{isAr ? 'اسم مقدم الطلب:' : 'Requester Name:'}</span>
                                            <span className="font-semibold">{request.requesterInfo?.name || 'N/A'}</span>
                                        </div>

                                        <div>
                                            <span className="text-xs text-gray-400 block">{isAr ? 'رقم الهاتف:' : 'Phone:'}</span>
                                            <span className="font-mono">{request.requesterInfo?.phone || 'N/A'}</span>
                                        </div>
                                    </div>

                                    {payload.customerNotes && (
                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <span className="text-xs text-gray-400 block mb-1">{isAr ? 'ملاحظات وتفضيلات العميل:' : 'Customer Notes:'}</span>
                                            <p className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                                                "{payload.customerNotes}"
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end">
                    <Button onClick={onClose} variant="secondary" className="text-xs py-2 px-4">
                        {isAr ? 'إغلاق' : 'Close'}
                    </Button>
                </div>
            </div>

            {/* Confirmation Modal for Client Awarding */}
            <ConfirmationModal
                isOpen={isAwardModalOpen}
                onClose={() => setIsAwardModalOpen(false)}
                onConfirm={handleConfirmAward}
                title={isAr ? 'تأكيد اعتماد عرض المقاول والتعاقد' : 'Confirm Contractor Award'}
                message={
                    isAr
                        ? `هل أنت متأكد من رغبتك في اعتماد عرض شركة "${selectedQuoteForAward?.partnerName}" بإجمالي تكلفة ${selectedQuoteForAward?.totalPrice.toLocaleString()} ${selectedQuoteForAward?.currency} ومدة تنفيذ ${selectedQuoteForAward?.executionTimelineDays} يوم؟ سيتم بدء جدول المراحل والاتفاق على الدفعات.`
                        : `Are you sure you want to award this project to "${selectedQuoteForAward?.partnerName}" for ${selectedQuoteForAward?.totalPrice.toLocaleString()} ${selectedQuoteForAward?.currency}? This will initialize project execution milestones.`
                }
                confirmText={isAr ? 'نعم، اعتمد العرض والتعاقد' : 'Yes, Award Project'}
                cancelText={isAr ? 'تراجع' : 'Cancel'}
            />
        </div>
    );
};

export default ClientFinishingDetailsModal;
