
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestById, addMessageToLead, updateRequest } from '../../services/requests';
import { useLanguage } from '../shared/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { RequestStatus, Lead, LeadStatus, RequestType, Role, FinishingQuote, DecorationStage } from '../../types';
import { 
    ArrowLeftIcon, 
    PhoneIcon, 
    UserPlusIcon, 
    CalendarIcon, 
    BanknotesIcon, 
    CheckCircleIcon, 
    ClockIcon, 
    ClipboardDocumentListIcon,
    BuildingIcon,
    PlusIcon,
    PaintBrushIcon
} from '../ui/Icons';
import DetailItem from '../shared/DetailItem';
import ConversationThread from '../shared/ConversationThread';
import UpdateLeadStatusModal from '../shared/UpdateLeadStatusModal';
import { useToast } from '../shared/ToastContext';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { getQuotesByRequestId, getProjectMilestones } from '../../services/finishing';
import { SubmitFinishingQuoteModal } from '../finishing/SubmitFinishingQuoteModal';
import { FinishingMilestonesTracker } from '../finishing/FinishingMilestonesTracker';
import { DecorationStageTracker } from '../shared/DecorationStageTracker';
import { RequestHistoryTimeline } from '../shared/RequestHistoryTimeline';

// Helper to map internal Lead statuses to generic Request statuses
function mapLeadStatusToRequestStatus(leadStatus: LeadStatus): RequestStatus {
    switch (leadStatus) {
        case 'new': return 'new';
        case 'contacted':
        case 'site-visit':
        case 'quoted':
        case 'in-progress': return 'in-progress';
        case 'completed': return 'closed';
        case 'cancelled': return 'rejected';
        default: return 'pending';
    }
}

const PartnerLeadDetailsPage: React.FC = () => {
    const { leadId } = useParams<{ leadId: string }>();
    const { t, language } = useLanguage();
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: request, isLoading, isError } = useQuery({
        queryKey: ['request', leadId],
        queryFn: () => getRequestById(leadId!),
        enabled: !!leadId,
    });
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

    const lead = useMemo(() => {
        if (!request || request.type !== RequestType.LEAD) return null;
        return request.payload as Lead;
    }, [request]);

    const { data: quotes = [], refetch: refetchQuotes } = useQuery({
        queryKey: ['finishingQuotes', leadId],
        queryFn: () => getQuotesByRequestId(leadId!),
        enabled: !!leadId
    });

    const isDecoration = useMemo(() => {
        if (!lead) return false;
        return lead.serviceType === 'decorations' || 
               lead.serviceType === 'decoration' || 
               lead.serviceTitle?.includes('ديكور') ||
               lead.serviceTitle?.toLowerCase().includes('decor') ||
               lead.serviceTitle?.toLowerCase().includes('interior');
    }, [lead]);

    const isFinishing = useMemo(() => {
        if (!lead || isDecoration) return false;
        return lead.serviceType === 'finishing' || 
               (lead as any).category === 'turnkey' ||
               lead.serviceTitle?.includes('تشطيب') ||
               lead.serviceTitle?.toLowerCase().includes('finishing');
    }, [lead, isDecoration]);

    const { data: milestones = [], refetch: refetchMilestones } = useQuery({
        queryKey: ['finishingMilestones', leadId],
        queryFn: () => getProjectMilestones(leadId!),
        enabled: !!leadId && isFinishing
    });

    const myQuote = useMemo(() => {
        if (!quotes || !currentUser) return null;
        return quotes.find(q => q.partnerId === currentUser.id);
    }, [quotes, currentUser]);

    const updateLeadMutation = useMutation({
        mutationFn: async ({ status, note }: { status: LeadStatus; note: string }) => {
            if (!request || !currentUser || !lead) throw new Error("Missing data for update");
            
            const senderType = currentUser.role.includes('_manager') || currentUser.role === Role.SUPER_ADMIN ? 'admin' : 'partner';
            
            // 1. Add the note to the lead conversation
            await addMessageToLead(request.id, {
                sender: senderType,
                senderId: currentUser.id,
                type: 'note',
                content: note,
            });

            // 2. Update the payload status locally before sending
            const updatedPayload = { ...lead, status: status };
            
            // 3. Update the parent Request status and payload
            await updateRequest(request.id, { 
                status: mapLeadStatusToRequestStatus(status), 
                payload: updatedPayload 
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['request', leadId] });
            queryClient.invalidateQueries({ queryKey: ['requestHistory', leadId] });
            queryClient.invalidateQueries({ queryKey: [`partner-leads-${currentUser?.id}`] });
            setIsModalOpen(false);
            showToast(language === 'ar' ? 'تم تحديث حالة الطلب بنجاح' : 'Lead updated successfully', 'success');
        },
        onError: (err: any) => {
            showToast(err?.message || (language === 'ar' ? 'فشل تحديث حالة الطلب في قاعدة البيانات' : 'Failed to update lead in database'), 'error');
        },
    });

    const updateStageMutation = useMutation({
        mutationFn: async (newStage: DecorationStage) => {
            if (!request || !currentUser || !lead) throw new Error("Missing data for update");
            const newStatus: LeadStatus = newStage === 'completed'
                ? 'completed'
                : newStage === 'cancelled'
                ? 'cancelled'
                : 'in-progress';

            const updatedPayload = { ...lead, designStage: newStage, status: newStatus };
            await updateRequest(request.id, {
                status: mapLeadStatusToRequestStatus(newStatus),
                payload: updatedPayload
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['request', leadId] });
            queryClient.invalidateQueries({ queryKey: ['requestHistory', leadId] });
            queryClient.invalidateQueries({ queryKey: [`partner-leads-${currentUser?.id}`] });
            showToast(language === 'ar' ? 'تم تحديث مرحلة التصميم الداخلي وسجل العمليات بنجاح' : 'Design stage and audit trail updated successfully', 'success');
        },
        onError: (err: any) => {
            showToast(err?.message || (language === 'ar' ? 'فشل تحديث مرحلة التصميم' : 'Failed to update design stage'), 'error');
        }
    });

    if (isLoading) return <div className="p-8 text-center">Loading lead details...</div>;
    if (isError || !request || !lead) return <div className="p-8 text-center text-red-500">Could not load lead details.</div>;

    // Security check: ensure current user is authorized for this lead
    const isAuthorized = 
        currentUser?.id === lead.partnerId || 
        currentUser?.id === (lead as any).assignedTo || 
        currentUser?.id === request.assignedTo ||
        currentUser?.role === Role.PLATFORM_FINISHING_MANAGER ||
        currentUser?.role === Role.DECORATION_MANAGER ||
        currentUser?.role === Role.SUPER_ADMIN ||
        currentUser?.role === Role.FINISHING_PARTNER ||
        currentUser?.role === Role.DEVELOPER_PARTNER ||
        currentUser?.role === Role.AGENCY_PARTNER;

    if (!isAuthorized) {
        return <div className="p-8 text-center text-red-500">You are not authorized to view this lead.</div>;
    }

    const isAssignedOrWon = 
        currentUser?.id === lead.partnerId || 
        currentUser?.id === (lead as any).assignedTo || 
        currentUser?.id === request.assignedTo ||
        myQuote?.status === 'accepted' ||
        currentUser?.role === Role.PLATFORM_FINISHING_MANAGER ||
        currentUser?.role === Role.SUPER_ADMIN;

    const displayName = isAssignedOrWon 
        ? request.requesterInfo.name 
        : (language === 'ar' ? 'عميل المنصة الموثق (مناقصة)' : 'Verified Client (Finishing RFQ)');

    const displayPhone = isAssignedOrWon 
        ? request.requesterInfo.phone 
        : (language === 'ar' ? 'يُكشف بعد الترسية والاعتماد' : 'Revealed upon award');

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
            {isModalOpen && (
                 <UpdateLeadStatusModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onUpdate={(status, note) => updateLeadMutation.mutate({ status, note })}
                    currentStatus={lead.status}
                    isLoading={updateLeadMutation.isPending}
                />
            )}
            
            <div className="mb-6">
                <Link to="/dashboard/leads" className="inline-flex items-center gap-2 text-gray-500 hover:text-amber-600 transition-colors mb-4">
                    <ArrowLeftIcon className="w-4 h-4" />
                    {t.adminShared.backToRequests || 'Back to Leads'}
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                            <StatusBadge status={lead.status} className="text-sm px-3 py-1" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                           <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">ID: {leadId}</span>
                           <span>•</span>
                           <span>{lead.serviceTitle}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {isAssignedOrWon && (
                            <a href={`tel:${request.requesterInfo.phone}`} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <PhoneIcon className="w-4 h-4 mr-2" />
                                Call
                            </a>
                        )}
                        <Button onClick={() => setIsModalOpen(true)}>Update Status</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Customer & Request Info */}
                <div className="space-y-6">
                     <Card>
                        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserPlusIcon className="w-5 h-5 text-amber-500" />
                                Customer Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <DetailItem label="Full Name" value={displayName} />
                            <DetailItem label="Phone Number" value={displayPhone} />
                             {isAssignedOrWon && request.requesterInfo.email && <DetailItem label="Email" value={request.requesterInfo.email} />}
                             <DetailItem label="Preferred Time" value={lead.contactTime} icon={<CalendarIcon className="w-4 h-4 text-gray-400" />} />
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                            <CardTitle className="text-lg">Request Info</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                             <DetailItem label="Service Type" value={lead.serviceType} className="capitalize" />
                             <DetailItem label="Created At" value={new Date(lead.createdAt).toLocaleString(language)} />
                             <DetailItem label="Last Updated" value={new Date(lead.updatedAt).toLocaleString(language)} />
                             {lead.propertyId && (
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 uppercase font-bold">Related Property</span>
                                    <Link to={`/properties/${lead.propertyId}`} target="_blank" className="block mt-1 text-amber-600 hover:underline truncate">
                                        View Property
                                    </Link>
                                </div>
                             )}
                        </CardContent>
                    </Card>

                    {/* Attribution & Marketing Origin */}
                    <Card>
                         <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                            <CardTitle className="text-sm font-bold flex items-center justify-between">
                                <span>{language === 'ar' ? 'مصدر العميل والوساطة' : 'Attribution & Origin'}</span>
                                <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-mono px-2 py-0.5 rounded">
                                    {lead.source || 'Direct'}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <DetailItem label={language === 'ar' ? 'القناة' : 'Channel'} value={lead.source} />
                            {lead.utmSource && <DetailItem label="UTM Source" value={lead.utmSource} />}
                            {lead.utmCampaign && <DetailItem label="UTM Campaign" value={lead.utmCampaign} />}
                            {lead.utmMedium && <DetailItem label="UTM Medium" value={lead.utmMedium} />}
                            {lead.landingPage && <DetailItem label={language === 'ar' ? 'صفحة الهبوط' : 'Landing Page'} value={lead.landingPage} />}
                            {lead.referrer && <DetailItem label={language === 'ar' ? 'الموقع المحيل' : 'Referrer'} value={lead.referrer} />}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Finishing Quote Bid & Conversation / Timeline */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Finishing Contractor Bid Panel */}
                    {isFinishing && (
                        <Card className="border-2 border-amber-500/30 overflow-hidden shadow-sm">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 pb-3 border-b border-amber-200 dark:border-amber-800/40">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                                            <BanknotesIcon className="w-5 h-5 text-amber-600" />
                                            {language === 'ar' ? 'مقايسة وعطاء شركتكم للمشروع' : 'Your Company Quote & Proposal'}
                                        </CardTitle>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {language === 'ar'
                                                ? 'تفاصيل الأسعار وجداول التسليم وبنود التأسيس والتشطيب'
                                                : 'Detailed cost breakdown, MEP rough-ins, schedule and warranty'}
                                        </p>
                                    </div>
                                    {myQuote && (
                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                                            myQuote.status === 'accepted'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                : myQuote.status === 'rejected'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                        }`}>
                                            {myQuote.status === 'accepted' 
                                                ? (language === 'ar' ? 'تمت الترسية والاعتماد ✓' : 'Awarded ✓')
                                                : myQuote.status === 'rejected'
                                                    ? (language === 'ar' ? 'مستبعد' : 'Declined')
                                                    : (language === 'ar' ? 'مقدم للمراجعة' : 'Under Review')}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                {myQuote ? (
                                    <div className="space-y-4">
                                        {myQuote.status === 'accepted' && (
                                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 flex items-start gap-3">
                                                <CheckCircleIcon className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                                                        {language === 'ar' ? 'مبارك! تم اعتماد عطائك وترسية المشروع رسمياً عليك' : 'Congratulations! Your quote has been awarded!'}
                                                    </h4>
                                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                                                        {language === 'ar'
                                                            ? 'يمكنك الآن التواصل فوراً مع العميل لتحديد موعد المعاينة وتوقيع التعاقد النهائي.'
                                                            : 'You can now coordinate directly with the client to schedule site visits and sign the contract.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <span className="text-[11px] text-gray-500 uppercase block font-semibold">
                                                    {language === 'ar' ? 'إجمالي المقايسة' : 'Total Quote'}
                                                </span>
                                                <p className="text-base font-bold text-amber-600 mt-0.5">
                                                    {myQuote.totalPrice.toLocaleString()} {myQuote.currency || 'EGP'}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <span className="text-[11px] text-gray-500 uppercase block font-semibold">
                                                    {language === 'ar' ? 'سعر المتر التقديري' : 'Est. / m²'}
                                                </span>
                                                <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                                                    {myQuote.pricePerSqm ? `${myQuote.pricePerSqm.toLocaleString()} ج.م` : '—'}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <span className="text-[11px] text-gray-500 uppercase block font-semibold">
                                                    {language === 'ar' ? 'مدة التنفيذ' : 'Timeline'}
                                                </span>
                                                <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                                                    {myQuote.executionTimelineDays} {language === 'ar' ? 'يوم' : 'days'}
                                                </p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                                                <span className="text-[11px] text-gray-500 uppercase block font-semibold">
                                                    {language === 'ar' ? 'مدة الضمان' : 'Warranty'}
                                                </span>
                                                <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                                                    {myQuote.warrantyMonths} {language === 'ar' ? 'شهراً' : 'months'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Scope Items Breakdown */}
                                        {myQuote.scopeItems && myQuote.scopeItems.length > 0 && (
                                            <div className="pt-2">
                                                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-2">
                                                    {language === 'ar' ? 'تفصيل بنود ومراحل الأعمال' : 'Scope of Work Breakdown'}
                                                </h5>
                                                <div className="space-y-1.5">
                                                    {myQuote.scopeItems.map((item, idx) => (
                                                        <div key={item.id || idx} className="flex justify-between items-center text-xs p-2 rounded bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
                                                            <span className="text-gray-800 dark:text-gray-200">
                                                                {item.description[language] || item.description.ar || item.description.en}
                                                            </span>
                                                            <span className="font-bold text-gray-900 dark:text-white font-mono">
                                                                {item.amount.toLocaleString()} EGP
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {myQuote.termsAndConditions && (
                                            <div className="text-xs text-gray-500 bg-gray-50/60 dark:bg-gray-800/40 p-2.5 rounded border border-gray-100 dark:border-gray-700">
                                                <span className="font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                                                    {language === 'ar' ? 'الشروط والمواصفات:' : 'Terms & Specifications:'}
                                                </span>
                                                <p>{myQuote.termsAndConditions}</p>
                                            </div>
                                        )}

                                        {myQuote.status !== 'accepted' && (
                                            <div className="pt-2 flex justify-end">
                                                <Button 
                                                    variant="secondary" 
                                                    onClick={() => setIsQuoteModalOpen(true)}
                                                    className="text-xs"
                                                >
                                                    {language === 'ar' ? 'تعديل عرض المقايسة ✎' : 'Edit Submitted Quote ✎'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center bg-amber-50/30 dark:bg-amber-950/10 rounded-xl border border-dashed border-amber-200 dark:border-amber-800 space-y-3">
                                        <BanknotesIcon className="w-10 h-10 text-amber-500 mx-auto" />
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-base">
                                                {language === 'ar' ? 'فرصة تقديم مقايسة سعر وعطاء جديد' : 'Submit a Project Bid'}
                                            </h4>
                                            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                                                {language === 'ar'
                                                    ? 'قدم مقايستك الآن متضمنة الأسعار وبنود التأسيس والتشطيب ومدة التسليم والضمان لدراستها ومقارنتها واعتمادها.'
                                                    : 'Provide your detailed quote breakdown, timeline, and warranty to compete for this finishing project.'}
                                            </p>
                                        </div>
                                        <Button 
                                            onClick={() => setIsQuoteModalOpen(true)}
                                            className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm text-sm"
                                        >
                                            <PlusIcon className="w-4 h-4 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
                                            {language === 'ar' ? 'تقديم عرض مقايسة تفصيلية الآن' : 'Submit Detailed Quote Now'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Finishing Execution Milestones & Payment Schedule */}
                    {isFinishing && (
                        <div className="space-y-2">
                            <FinishingMilestonesTracker
                                requestId={lead.id}
                                milestones={milestones}
                                canManage={myQuote?.status === 'accepted'}
                                userLabel={currentUser?.name || 'Assigned Partner'}
                                onMilestoneUpdated={() => {
                                    refetchMilestones();
                                    queryClient.invalidateQueries({ queryKey: ['request', leadId] });
                                }}
                            />
                        </div>
                    )}

                    {/* Interior Design Stage Pipeline */}
                    {isDecoration && (
                        <Card className="border border-amber-500/30 overflow-hidden shadow-xs">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 pb-3 border-b border-amber-200 dark:border-amber-800/40">
                                <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                                    <PaintBrushIcon className="w-5 h-5 text-amber-600" />
                                    <span>{language === 'ar' ? 'مراحل تنفيذ التصميم الداخلي والديكور' : 'Interior Design Milestone Progression'}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <DecorationStageTracker
                                    currentStage={lead.designStage || 'consultation'}
                                    canManage={isAssignedOrWon}
                                    isUpdating={updateStageMutation.isPending}
                                    onStageChange={(stage) => updateStageMutation.mutate(stage)}
                                />
                            </CardContent>
                        </Card>
                    )}

                    <Card className="h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                            <CardTitle className="text-lg">Activity & Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow p-0">
                            <ConversationThread 
                                lead={lead} 
                                requestId={request.id}
                                onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['request', leadId] })} 
                            />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                            <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white">
                                <ClockIcon className="w-5 h-5 text-amber-600" />
                                <span>{language === 'ar' ? 'سجل العمليات والتدقيق (Audit Trail)' : 'Audit Trail & Event History'}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <RequestHistoryTimeline requestId={request.id} />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Quote Submission Modal */}
            {isQuoteModalOpen && currentUser && (
                <SubmitFinishingQuoteModal
                    isOpen={isQuoteModalOpen}
                    onClose={() => setIsQuoteModalOpen(false)}
                    requestId={lead.id}
                    partnerId={currentUser.id}
                    partnerName={currentUser.name || 'Contractor'}
                    propertyArea={(lead as any).propertyArea || (lead as any).area || 120}
                    onSuccess={() => {
                        refetchQuotes();
                        queryClient.invalidateQueries({ queryKey: ['request', leadId] });
                    }}
                />
            )}
        </div>
    );
};

export default PartnerLeadDetailsPage;
