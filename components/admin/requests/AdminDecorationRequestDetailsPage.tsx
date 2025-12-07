
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Lead, LeadStatus, Request } from '../../../types';
import { RequestType, Role } from '../../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads, updateLead } from '../../../services/leads';
import { getAllPortfolioItems } from '../../../services/portfolio';
import { ArrowLeftIcon, CheckCircleIcon } from '../../ui/Icons';
import ConversationThread from '../../shared/ConversationThread';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import RequestPayloadViewer from './RequestPayloadViewer';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useAuth } from '../../auth/AuthContext';

const statusColors: { [key in LeadStatus]: string } = {
    new: 'bg-blue-100 text-blue-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    'site-visit': 'bg-teal-100 text-teal-800',
    quoted: 'bg-indigo-100 text-indigo-800',
    'in-progress': 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
};

const AdminDecorationRequestDetailsPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { language, t: i18n } = useLanguage();
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const t = i18n.adminDashboard.decorationsManagement;
    
    const { data: allLeads, refetch: refetchLeads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });
    const { data: portfolioItems, isLoading: loadingPortfolio } = useQuery({ queryKey: ['portfolio'], queryFn: getAllPortfolioItems });
    
    const isLoading = loadingLeads || loadingPortfolio;

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

    const isCustomRequest = lead.serviceTitle.includes(i18n.customDecorationRequestModal.serviceTitle);
    const referenceWorkTitle = !isCustomRequest ? lead.serviceTitle.replace(`${i18n.decorationRequestModal.reference} `, '') : '';
    const referenceItem = portfolioItems?.find(item => item.title.ar === referenceWorkTitle || item.title.en === referenceWorkTitle);

    // Mock a Request object to reuse the PayloadViewer
    const requestMock: Request = {
        id: lead.id,
        type: RequestType.LEAD,
        status: lead.status as any,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        requesterInfo: { name: lead.customerName, phone: lead.customerPhone },
        payload: lead
    };
    
    const canManage = currentUser?.role === Role.SUPER_ADMIN || currentUser?.role === Role.DECORATION_MANAGER || currentUser?.role === Role.SERVICE_MANAGER;

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
             <div className="flex justify-between items-center mb-6">
                 <Link to="/admin/platform-decorations/requests" className="inline-flex items-center gap-2 text-amber-600 hover:underline">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.backToRequests || 'Back to Requests'}
                </Link>
                 <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${statusColors[status]}`}>
                    {i18n.dashboard.leadStatus[status]}
                </span>
             </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{t.requestDetails}</h1>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                            <CardTitle className="text-lg text-amber-500">{t.requestInformation}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <RequestPayloadViewer request={requestMock} />
                            {referenceItem && (
                                 <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Reference Portfolio Item</h3>
                                    <div className="flex gap-4 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <img src={referenceItem.imageUrl} alt={referenceItem.alt} className="w-20 h-20 object-cover rounded-md shadow-sm"/>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{referenceItem.title[language]}</p>
                                            <p className="text-sm text-gray-500">{referenceItem.category[language]}</p>
                                            {referenceItem.price && <p className="text-amber-600 font-semibold text-sm mt-1">{referenceItem.price.toLocaleString()} EGP</p>}
                                        </div>
                                    </div>
                                </div>
                            )}
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
                             <CardTitle className="text-lg text-amber-500">{t.customerInformation}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <div><span className="text-gray-500 block mb-1">Name</span><span className="font-semibold text-lg">{lead.customerName}</span></div>
                            <div><span className="text-gray-500 block mb-1">Phone</span><span className="font-mono text-lg" dir="ltr">{lead.customerPhone}</span></div>
                            {lead.contactTime && <div><span className="text-gray-500 block mb-1">Preferred Time</span><span className="font-medium">{lead.contactTime}</span></div>}
                        </CardContent>
                    </Card>

                    {canManage && (
                        <Card className="border-t-4 border-t-amber-500">
                            <CardHeader className="pb-3">
                                <CardTitle>Workflow Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Change Status</label>
                                <select 
                                    value={status} 
                                    onChange={e => handleUpdateStatus(e.target.value as LeadStatus)} 
                                    className="w-full p-2.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                                >
                                    {Object.entries(i18n.dashboard.leadStatus).map(([key, value]) => (
                                        <option key={key} value={key}>{value as string}</option>
                                    ))}
                                </select>
                                
                                {status === 'new' && (
                                    <Button 
                                        onClick={() => handleUpdateStatus('contacted')} 
                                        className="w-full mt-4" 
                                        variant="secondary"
                                    >
                                        Mark as Contacted
                                    </Button>
                                )}
                                {status !== 'completed' && status !== 'cancelled' && (
                                     <Button 
                                        onClick={() => handleUpdateStatus('completed')} 
                                        className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                                        Mark as Completed
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

        </div>
    );
};

export default AdminDecorationRequestDetailsPage;
