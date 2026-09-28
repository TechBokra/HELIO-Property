
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Lead, LeadStatus, Request, FinishingQuote } from '../../types';
import { RequestType, Role } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads, updateLead } from '../../services/leads';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon, ClipboardDocumentListIcon, UserPlusIcon, BuildingIcon, BanknotesIcon, PlusIcon } from '../ui/Icons';
import ConversationThread from '../shared/ConversationThread';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import RequestPayloadViewer from './requests/RequestPayloadViewer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';
import DetailItem from '../shared/DetailItem';
import { 
    getFinishingPartners, 
    PLATFORM_FINISHING_MANAGER_ID, 
    getQuotesByRequestId, 
    getFinishingRequestHistory, 
    recordFinishingRequestHistory,
    getProjectMilestones
} from '../../services/finishing';
import { FinishingQuoteComparison } from '../finishing/FinishingQuoteComparison';
import { FinishingRequestTimeline } from '../finishing/FinishingRequestTimeline';
import { SubmitFinishingQuoteModal } from '../finishing/SubmitFinishingQuoteModal';
import { FinishingMilestonesTracker } from '../finishing/FinishingMilestonesTracker';

const AdminFinishingRequestDetailsPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { language, t: i18n } = useLanguage();
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const t = i18n.adminDashboard.finishingManagement;
    
    const { data: allLeads, refetch: refetchLeads, isLoading } = useQuery({ queryKey: ['allLeadsAdmin'], queryFn: getAllLeads });

    const lead = useMemo(() => (allLeads || []).find(l => l.id === requestId), [allLeads, requestId]);
    
    const [status, setStatus] = useState<LeadStatus>(lead?.status || 'new');
    const [assignedPartnerId, setAssignedPartnerId] = useState<string>(lead?.partnerId || lead?.assignedTo || '');
    const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);

    const { data: finishingPartners = [] } = useQuery({
        queryKey: ['finishingPartnersAdmin'],
        queryFn: getFinishingPartners
    });

    const { data: quotes = [], refetch: refetchQuotes } = useQuery({
        queryKey: ['finishingQuotes', requestId],
        queryFn: () => getQuotesByRequestId(requestId!),
        enabled: !!requestId
    });

    const { data: history = [], refetch: refetchHistory } = useQuery({
        queryKey: ['finishingHistory', requestId],
        queryFn: () => getFinishingRequestHistory(requestId!),
        enabled: !!requestId
    });

    const { data: milestones = [], refetch: refetchMilestones } = useQuery({
        queryKey: ['finishingMilestones', requestId],
        queryFn: () => getProjectMilestones(requestId!),
        enabled: !!requestId
    });

    React.useEffect(() => {
        if (lead) {
            setStatus(lead.status);
            setAssignedPartnerId(lead.partnerId || lead.assignedTo || '');
        }
    }, [lead]);

    const handleUpdateStatus = async (newStatus: LeadStatus) => {
        if (lead) {
            const oldStatus = lead.status;
            await updateLead(lead.id, { status: newStatus });
            setStatus(newStatus);
            refetchLeads();
            await recordFinishingRequestHistory({
                requestId: lead.id,
                actionType: 'status_change',
                changedBy: currentUser?.name || 'Platform Finishing Manager',
                oldValue: oldStatus,
                newValue: newStatus,
                note: language === 'ar' ? `تحديث حالة الطلب إلى: ${newStatus}` : `Status updated to ${newStatus}`
            });
            refetchHistory();
            showToast('Status updated successfully', 'success');
        }
    };

    const handleAssignPartner = async (newPartnerId: string) => {
        if (lead) {
            const assignedPartner = finishingPartners.find(p => p.id === newPartnerId);
            const partnerName = assignedPartner?.nameAr || assignedPartner?.name || 'Platform Finishing Manager';

            await updateLead(lead.id, { 
                partnerId: newPartnerId,
                assignedTo: newPartnerId 
            });
            setAssignedPartnerId(newPartnerId);
            refetchLeads();

            await recordFinishingRequestHistory({
                requestId: lead.id,
                actionType: 'partner_assigned',
                changedBy: currentUser?.name || 'Platform Finishing Manager',
                newValue: { partnerId: newPartnerId, partnerName },
                note: language === 'ar' ? `تم إسناد الطلب للشريك المقاول: ${partnerName}` : `Request assigned to partner contractor: ${partnerName}`
            });
            refetchHistory();
            showToast(language === 'ar' ? 'تم إسناد الطلب للشريك بنجاح' : 'Assigned partner updated successfully', 'success');
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading details...</div>;
    if (!lead) return <div className="p-8 text-center text-red-500">Request not found.</div>;

    // Extract package info if available (it's usually passed in payload for booked services)
    const tierDetails = (lead as any).tierDetails;

    // Mock a Request object to reuse the PayloadViewer if needed, but we'll build custom UI too
    const requestMock: Request = {
        id: lead.id,
        type: RequestType.LEAD,
        status: lead.status as any,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        requesterInfo: { name: lead.customerName, phone: lead.customerPhone },
        payload: lead
    };
    
    const canManage = currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.PLATFORM_FINISHING_MANAGER;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
             <div className="flex justify-between items-center mb-6">
                 <Link to="/admin/platform-finishing/requests" className="inline-flex items-center gap-2 text-amber-600 hover:underline">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Finishing Requests
                </Link>
                <StatusBadge status={status} className="px-3 py-1 text-sm" />
             </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{lead.serviceTitle}</h1>
            <p className="text-gray-500 mb-8">Request ID: {lead.id}</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Linked Property Card */}
                    {lead.propertyId && (
                        <Card className="border-l-4 border-l-blue-500 bg-blue-50/40 dark:bg-blue-900/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base text-blue-700 dark:text-blue-300 flex items-center gap-2">
                                    <BuildingIcon className="w-5 h-5 text-blue-500" />
                                    {language === 'ar' ? 'العقار المرتبط بطلب التشطيب' : 'Associated Property Listing'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-base">
                                            {lead.propertyTitle || lead.serviceTitle}
                                        </p>
                                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                                            Property ID: {lead.propertyId}
                                        </p>
                                    </div>
                                    <Link 
                                        to={`/properties/${lead.propertyId}`}
                                        className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors whitespace-nowrap"
                                    >
                                        {language === 'ar' ? 'عرض تفاصيل العقار ↗' : 'View Property ↗'}
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Package Details Card - Highlights specific booking info */}
                    {tierDetails && (
                        <Card className="border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-900/10">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg text-amber-600">Selected Package Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-800/30">
                                        <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Unit Type</span>
                                        <p className="font-semibold text-gray-900 dark:text-white">{tierDetails.unitType[language]}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-800/30">
                                        <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Scope/Area</span>
                                        <p className="font-semibold text-gray-900 dark:text-white">{tierDetails.areaRange[language]}</p>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-amber-100 dark:border-amber-800/30">
                                        <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Estimated Price</span>
                                        <p className="font-bold text-lg text-amber-600">{tierDetails.price.toLocaleString()} EGP</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Multi-Quotes & Tendering Comparison */}
                    <div className="space-y-4 pt-2">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/40">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <BanknotesIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    {language === 'ar' ? 'مناقصة ومقايسات المقاولين المعتمدين' : 'Contractor Quotes & Tendering'}
                                </h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                    {language === 'ar'
                                        ? 'مقارنة العروض المقدمة من شركات ومقاولي التشطيب والترسية المباشرة'
                                        : 'Evaluate bids, compare timelines and warranties, and award the contract'}
                                </p>
                            </div>
                            {canManage && (
                                <Button 
                                    onClick={() => setIsAddQuoteOpen(true)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    {language === 'ar' ? 'إضافة عرض مقايسة جديد' : 'Submit Contractor Bid'}
                                </Button>
                            )}
                        </div>

                        <FinishingQuoteComparison 
                            requestId={lead.id}
                            propertyArea={(lead as any).propertyArea || (lead as any).area || (tierDetails ? 120 : undefined)}
                            quotes={quotes}
                            canAward={canManage}
                            onQuoteAction={() => {
                                refetchQuotes();
                                refetchHistory();
                                refetchLeads();
                            }}
                        />
                    </div>

                    {/* Project Execution Milestones & Payment Schedule */}
                    <div className="pt-2">
                        <FinishingMilestonesTracker
                            requestId={lead.id}
                            milestones={milestones}
                            canManage={canManage}
                            onMilestoneUpdated={() => {
                                refetchMilestones();
                                refetchHistory();
                            }}
                        />
                    </div>

                    <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                            <CardTitle className="text-lg">Detailed Requirements</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <RequestPayloadViewer request={requestMock} />
                        </CardContent>
                    </Card>

                    {/* Timeline & Audit History */}
                    <FinishingRequestTimeline history={history} />

                    <Card>
                         <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3 bg-gray-50 dark:bg-gray-800">
                            <CardTitle className="text-lg">Communication History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ConversationThread lead={lead} onMessageSent={refetchLeads} requestId={lead.id} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                             <CardTitle className="text-lg flex items-center gap-2">
                                <UserPlusIcon className="w-5 h-5 text-amber-500"/> Customer Info
                             </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <DetailItem label="Name" value={lead.customerName} />
                            <DetailItem label="Phone" value={lead.customerPhone} className="font-mono" />
                            {lead.contactTime && <DetailItem label="Preferred Time" value={lead.contactTime} />}
                        </CardContent>
                    </Card>

                    {canManage && (
                        <Card className="border-t-4 border-t-amber-500">
                            <CardHeader className="pb-2 border-b border-gray-100 dark:border-gray-700">
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <UserPlusIcon className="w-5 h-5 text-amber-500"/>
                                    {language === 'ar' ? 'إسناد الطلب لشركة تشطيب' : 'Assign Contractor'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                                    {language === 'ar' ? 'المقاول / الشريك المسؤول' : 'Assigned Contractor'}
                                </label>
                                <select
                                    value={assignedPartnerId}
                                    onChange={e => handleAssignPartner(e.target.value)}
                                    className="w-full p-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                >
                                    <option value={PLATFORM_FINISHING_MANAGER_ID}>
                                        {language === 'ar' ? 'مدير تشطيبات المنصة (إشراف ومطابقة)' : 'Platform Finishing Manager (Triage & Review)'}
                                    </option>
                                    {finishingPartners.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.nameAr || p.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-gray-500 leading-normal">
                                    {language === 'ar'
                                        ? 'يتم توجيه المحادثات وبيانات المقايسة والتنفيذ لحساب المقاول المعتمد.'
                                        : 'Communication, quote specifications, and execution are routed to this contractor.'}
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {canManage && (
                        <Card className="border-t-4 border-t-blue-500 sticky top-6">
                            <CardHeader className="pb-3">
                                <CardTitle>Workflow Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Update Status</label>
                                <select 
                                    value={status} 
                                    onChange={e => handleUpdateStatus(e.target.value as LeadStatus)} 
                                    className="w-full p-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                    {Object.entries(i18n.dashboard.leadStatus).map(([key, value]) => (
                                        <option key={key} value={key}>{value as string}</option>
                                    ))}
                                </select>
                                
                                <div className="pt-4 space-y-2 border-t border-gray-100 dark:border-gray-700">
                                    {status === 'new' && (
                                        <Button onClick={() => handleUpdateStatus('contacted')} className="w-full" variant="secondary">
                                            Mark Contacted
                                        </Button>
                                    )}
                                    {status === 'contacted' && (
                                         <Button onClick={() => handleUpdateStatus('site-visit')} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                                            <CalendarIcon className="w-4 h-4 mr-2"/> Schedule Site Visit
                                        </Button>
                                    )}
                                    {(status === 'site-visit' || status === 'contacted') && (
                                         <Button onClick={() => handleUpdateStatus('quoted')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                            <ClipboardDocumentListIcon className="w-4 h-4 mr-2"/> Send Quote
                                        </Button>
                                    )}
                                    {status === 'quoted' && (
                                         <Button onClick={() => handleUpdateStatus('in-progress')} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                                            Start Project
                                        </Button>
                                    )}
                                     {status === 'in-progress' && (
                                         <Button onClick={() => handleUpdateStatus('completed')} className="w-full bg-green-600 hover:bg-green-700 text-white">
                                            <CheckCircleIcon className="w-4 h-4 mr-2"/> Mark Complete
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {isAddQuoteOpen && (
                <SubmitFinishingQuoteModal
                    isOpen={isAddQuoteOpen}
                    onClose={() => setIsAddQuoteOpen(false)}
                    requestId={lead.id}
                    partnerId={assignedPartnerId && assignedPartnerId !== PLATFORM_FINISHING_MANAGER_ID 
                        ? assignedPartnerId 
                        : (finishingPartners[0]?.id || PLATFORM_FINISHING_MANAGER_ID)}
                    partnerName={
                        finishingPartners.find(p => p.id === assignedPartnerId)?.nameAr ||
                        finishingPartners.find(p => p.id === assignedPartnerId)?.name ||
                        finishingPartners[0]?.nameAr ||
                        finishingPartners[0]?.name ||
                        'Platform Certified Partner'
                    }
                    propertyArea={(lead as any).propertyArea || (lead as any).area || 120}
                    onSuccess={() => {
                        refetchQuotes();
                        refetchHistory();
                        refetchLeads();
                    }}
                />
            )}
        </div>
    );
};

export default AdminFinishingRequestDetailsPage;
