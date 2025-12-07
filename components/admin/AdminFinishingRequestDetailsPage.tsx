
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Lead, LeadStatus, Request } from '../../types';
import { RequestType, Role } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads, updateLead } from '../../services/leads';
import { ArrowLeftIcon, CalendarIcon, CheckCircleIcon, ClipboardDocumentListIcon, UserPlusIcon } from '../ui/Icons';
import ConversationThread from '../shared/ConversationThread';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import RequestPayloadViewer from './requests/RequestPayloadViewer';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../auth/AuthContext';
import { StatusBadge } from '../ui/StatusBadge';
import DetailItem from '../shared/DetailItem';

const AdminFinishingRequestDetailsPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { language, t: i18n } = useLanguage();
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const t = i18n.adminDashboard.finishingManagement;
    
    const { data: allLeads, refetch: refetchLeads, isLoading } = useQuery({ queryKey: ['allLeadsAdmin'], queryFn: getAllLeads });

    const lead = useMemo(() => (allLeads || []).find(l => l.id === requestId), [allLeads, requestId]);
    
    const [status, setStatus] = useState<LeadStatus>(lead?.status || 'new');

    React.useEffect(() => {
        if (lead) {
            setStatus(lead.status);
        }
    }, [lead]);

    const handleUpdateStatus = async (newStatus: LeadStatus) => {
        if (lead) {
            await updateLead(lead.id, { status: newStatus });
            setStatus(newStatus);
            refetchLeads();
            showToast('Status updated successfully', 'success');
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

                     <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                            <CardTitle className="text-lg">Detailed Requirements</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <RequestPayloadViewer request={requestMock} />
                        </CardContent>
                    </Card>

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
        </div>
    );
};

export default AdminFinishingRequestDetailsPage;
