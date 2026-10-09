import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Lead, LeadStatus, Request, DecorationStage } from '../../../types';
import { RequestType, Role } from '../../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeadById, getAllLeads, updateLead } from '../../../services/leads';
import { getAllPortfolioItems } from '../../../services/portfolio';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { ArrowLeftIcon, CheckCircleIcon, UserPlusIcon, ClockIcon, InformationCircleIcon, ChatBubbleLeftRightIcon } from '../../ui/Icons';
import ConversationThread from '../../shared/ConversationThread';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import RequestPayloadViewer from './RequestPayloadViewer';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useAuth } from '../../auth/AuthContext';
import { DecorationStageTracker } from '../../shared/DecorationStageTracker';
import { RequestHistoryTimeline } from '../../shared/RequestHistoryTimeline';
import { ReassignPartnerModal } from '../../shared/ReassignPartnerModal';

const statusColors: { [key in LeadStatus]: string } = {
    new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    contacted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    'site-visit': 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    quoted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
    'in-progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const AdminDecorationRequestDetailsPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { language, t: i18n } = useLanguage();
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();
    const t = i18n.adminDashboard.decorationsManagement;

    const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'history'>('overview');
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

    // Fetch primary lead details
    const {
        data: lead,
        isLoading: loadingLead,
        refetch: refetchLead
    } = useQuery({
        queryKey: ['lead', requestId],
        queryFn: async () => {
            if (!requestId) return null;
            const single = await getLeadById(requestId);
            if (single) return single;
            const all = await getAllLeads();
            return all.find(l => l.id === requestId) || null;
        },
        enabled: !!requestId,
    });

    const { data: portfolioItems, isLoading: loadingPortfolio } = useQuery({
        queryKey: ['portfolio'],
        queryFn: getAllPortfolioItems
    });

    const { data: allPartners = [] } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin
    });

    const [status, setStatus] = useState<LeadStatus>(lead?.status || 'new');
    const [designStage, setDesignStage] = useState<DecorationStage>(lead?.designStage || 'consultation');

    React.useEffect(() => {
        if (lead) {
            setStatus(lead.status);
            setDesignStage(lead.designStage || 'consultation');
        }
    }, [lead]);

    // Mutation for updating status or design stage
    const updateMutation = useMutation({
        mutationFn: async (updates: Partial<Lead>) => {
            if (!lead?.id) return;
            return updateLead(lead.id, updates);
        },
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ['lead', requestId] });
            queryClient.invalidateQueries({ queryKey: ['allLeads'] });
            queryClient.invalidateQueries({ queryKey: ['requestHistory', requestId] });
            if (updated) {
                setStatus(updated.status);
                if (updated.designStage) setDesignStage(updated.designStage);
            }
            showToast(isAr ? 'تم تحديث حالة الطلب وسجل العمليات بنجاح' : 'Status and audit log updated successfully', 'success');
        },
        onError: (err: any) => {
            showToast(err.message || (isAr ? 'فشل تحديث الطلب' : 'Failed to update request'), 'error');
        }
    });

    const handleUpdateStatus = (newStatus: LeadStatus) => {
        updateMutation.mutate({ status: newStatus });
    };

    const handleUpdateStage = (newStage: DecorationStage) => {
        const matchingStatus: LeadStatus = newStage === 'completed'
            ? 'completed'
            : newStage === 'cancelled'
            ? 'cancelled'
            : 'in-progress';

        updateMutation.mutate({
            designStage: newStage,
            status: matchingStatus
        });
    };

    const canManage = currentUser?.role === Role.SUPER_ADMIN ||
                      currentUser?.role === Role.DECORATION_MANAGER ||
                      currentUser?.role === Role.SERVICE_MANAGER;

    if (loadingLead || loadingPortfolio) {
        return (
            <div className="p-12 text-center text-gray-500">
                {isAr ? 'جاري تحميل تفاصيل طلب التصميم والديكور...' : 'Loading decoration request details...'}
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="p-12 text-center space-y-4">
                <p className="text-red-500 font-bold">{isAr ? 'لم يتم العثور على الطلب.' : 'Request not found.'}</p>
                <Link to="/admin/platform-decorations/requests" className="text-amber-600 underline">
                    {t.backToRequests || 'Back to Requests'}
                </Link>
            </div>
        );
    }

    const assignedPartner = allPartners.find(p => p.id === lead.assignedTo || p.id === lead.partnerId);
    const assignedPartnerTitle = assignedPartner
        ? ((language === 'ar' && assignedPartner.nameAr) ? assignedPartner.nameAr : (assignedPartner.name || assignedPartner.email))
        : null;

    const isCustomRequest = lead.serviceTitle.includes(i18n.customDecorationRequestModal.serviceTitle);
    const referenceWorkTitle = !isCustomRequest ? lead.serviceTitle.replace(`${i18n.decorationRequestModal.reference} `, '') : '';
    const referenceItem = portfolioItems?.find(item => item.title.ar === referenceWorkTitle || item.title.en === referenceWorkTitle);

    const requestMock: Request = {
        id: lead.id,
        type: RequestType.LEAD,
        status: lead.status as any,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        requesterInfo: { name: lead.customerName, phone: lead.customerPhone },
        payload: lead
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
            {/* Top Navigation & Status */}
            <div className="flex flex-wrap justify-between items-center gap-4">
                <Link
                    to="/admin/platform-decorations/requests"
                    className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-semibold"
                >
                    <ArrowLeftIcon className="w-5 h-5 rtl:rotate-180" />
                    <span>{t.backToRequests || 'Back to Requests'}</span>
                </Link>

                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[status]}`}>
                        {i18n.dashboard.leadStatus[status] || status}
                    </span>
                    {canManage && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsReassignModalOpen(true)}
                            className="flex items-center gap-1.5 text-xs"
                        >
                            <UserPlusIcon className="w-4 h-4 text-amber-600" />
                            <span>{assignedPartnerTitle ? (isAr ? 'إعادة تعيين الشريك' : 'Reassign') : (isAr ? 'تعيين شريك' : 'Assign Partner')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Header Title & Assigned Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wider font-mono text-amber-600 font-bold">
                                {isCustomRequest ? (isAr ? 'تصميم داخلي مخصص' : 'Custom Interior Design') : (isAr ? 'طلب منتج ديكور' : 'Decor Product Request')}
                            </span>
                            <span className="text-gray-400">·</span>
                            <span className="text-xs text-gray-500 font-mono tabular-nums">
                                #{lead.id.slice(0, 8)}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                            {lead.serviceTitle}
                        </h1>
                    </div>

                    <div className="text-start sm:text-end">
                        <span className="text-xs text-gray-500 block">{isAr ? 'الشريك المسؤول:' : 'Assigned Studio/Partner:'}</span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {assignedPartnerTitle || (
                                <span className="text-amber-600 dark:text-amber-400 font-normal">
                                    {isAr ? 'غير مخصص بعد (بانتظار التعيين)' : 'Unassigned (Awaiting Allocation)'}
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                {/* Milestone Design Stage Tracker */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            {isAr ? 'مراحل تنفيذ التصميم الداخلي' : 'Interior Design Milestone Pipeline'}
                        </h2>
                    </div>
                    <DecorationStageTracker
                        currentStage={designStage}
                        onStageChange={handleUpdateStage}
                        canManage={canManage}
                        isUpdating={updateMutation.isPending}
                    />
                </div>
            </div>

            {/* Tabs Bar */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl px-4 shadow-xs">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'overview'
                            ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <InformationCircleIcon className="w-4 h-4" />
                    <span>{isAr ? 'تفاصيل الطلب والعميل' : 'Request & Client Details'}</span>
                </button>
                <button
                    onClick={() => setActiveTab('messages')}
                    className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'messages'
                            ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    <span>{isAr ? 'المحادثة والتواصل المباشر' : 'Conversation Thread'}</span>
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 transition-all ${
                        activeTab === 'history'
                            ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                >
                    <ClockIcon className="w-4 h-4" />
                    <span>{isAr ? 'سجل العمليات (Audit Trail)' : 'Audit Trail History'}</span>
                </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                                <CardTitle className="text-base text-amber-600 dark:text-amber-500">
                                    {t.requestInformation || 'Request Information'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <RequestPayloadViewer request={requestMock} />
                                {referenceItem && (
                                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <h3 className="font-semibold mb-3 text-sm text-gray-700 dark:text-gray-300">
                                            {isAr ? 'القطعة المرجعية من المعرض' : 'Reference Portfolio Item'}
                                        </h3>
                                        <div className="flex gap-4 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <img
                                                src={referenceItem.imageUrl}
                                                alt={referenceItem.alt}
                                                className="w-20 h-20 object-cover rounded-lg shadow-xs"
                                            />
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">
                                                    {referenceItem.title[language]}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {referenceItem.category[language]}
                                                </p>
                                                {referenceItem.price && (
                                                    <p className="text-amber-600 font-bold text-sm mt-1">
                                                        {referenceItem.price.toLocaleString()} EGP
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        {/* Customer Info Card */}
                        <Card>
                            <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                                <CardTitle className="text-base text-amber-600 dark:text-amber-500">
                                    {t.customerInformation || 'Client Information'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-sm">
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">{isAr ? 'اسم العميل' : 'Client Name'}</span>
                                    <span className="font-bold text-base text-gray-900 dark:text-white">{lead.customerName}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500 block mb-0.5">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                                    <span className="font-mono text-sm text-gray-800 dark:text-gray-200" dir="ltr">
                                        {lead.customerPhone}
                                    </span>
                                </div>
                                {lead.contactTime && (
                                    <div>
                                        <span className="text-xs text-gray-500 block mb-0.5">{isAr ? 'وقت التواصل المفضل' : 'Preferred Contact Time'}</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{lead.contactTime}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Workflow Actions */}
                        {canManage && (
                            <Card className="border-t-4 border-t-amber-600">
                                <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                                    <CardTitle className="text-base">
                                        {isAr ? 'إجراءات الحالة والتحكم' : 'Workflow & Status Actions'}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                            {isAr ? 'تغيير الحالة المباشرة' : 'Direct Status Change'}
                                        </label>
                                        <select
                                            value={status}
                                            disabled={updateMutation.isPending}
                                            onChange={e => handleUpdateStatus(e.target.value as LeadStatus)}
                                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                        >
                                            {Object.entries(i18n.dashboard.leadStatus).map(([key, value]) => (
                                                <option key={key} value={key}>{value as string}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsReassignModalOpen(true)}
                                            className="w-full justify-center text-xs"
                                        >
                                            <UserPlusIcon className="w-4 h-4 mr-2" />
                                            {isAr ? 'تغيير الشريك المنفذ' : 'Reassign Execution Partner'}
                                        </Button>

                                        {status !== 'completed' && status !== 'cancelled' && (
                                            <Button
                                                onClick={() => handleUpdateStage('completed')}
                                                disabled={updateMutation.isPending}
                                                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                            >
                                                <CheckCircleIcon className="w-4 h-4 mr-2" />
                                                {isAr ? 'اعتماد واكتمال المشروع' : 'Mark as Completed'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 2: Messages */}
            {activeTab === 'messages' && (
                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3 bg-gray-50/50 dark:bg-gray-800">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="w-5 h-5 text-amber-600" />
                            <span>{isAr ? 'سجل المحادثات والملاحظات' : 'Communication & Internal Notes'}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ConversationThread
                            lead={lead}
                            requestId={lead.id}
                            onMessageSent={() => {
                                refetchLead();
                                queryClient.invalidateQueries({ queryKey: ['requestMessages', lead.id] });
                            }}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Tab 3: History & Audit Trail */}
            {activeTab === 'history' && (
                <Card>
                    <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3 bg-gray-50/50 dark:bg-gray-800">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ClockIcon className="w-5 h-5 text-amber-600" />
                                <span>{isAr ? 'سجل العمليات والتدقيق المحمي (PostgreSQL Audit Log)' : 'Immutable PostgreSQL Audit Trail'}</span>
                            </CardTitle>
                            <span className="text-xs text-gray-500 font-mono">
                                Table: public.request_history
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <RequestHistoryTimeline requestId={lead.id} />
                    </CardContent>
                </Card>
            )}

            {/* Reassign Partner Modal */}
            <ReassignPartnerModal
                requestId={lead.id}
                currentAssignedId={lead.assignedTo || lead.partnerId}
                isOpen={isReassignModalOpen}
                onClose={() => setIsReassignModalOpen(false)}
                filterRole="decorations"
                onSuccess={() => {
                    refetchLead();
                }}
            />
        </div>
    );
};

export default AdminDecorationRequestDetailsPage;
