
import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestById, addMessageToLead, updateRequest } from '../../services/requests';
import { useLanguage } from '../shared/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { RequestStatus, Lead, LeadStatus, RequestType, Role } from '../../types';
import { ArrowLeftIcon, PhoneIcon, UserPlusIcon, CalendarIcon } from '../ui/Icons';
import DetailItem from '../shared/DetailItem';
import ConversationThread from '../shared/ConversationThread';
import UpdateLeadStatusModal from '../shared/UpdateLeadStatusModal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

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
    const queryClient = useQueryClient();

    const { data: request, isLoading, isError } = useQuery({
        queryKey: ['request', leadId],
        queryFn: () => getRequestById(leadId!),
        enabled: !!leadId,
    });
    
    const [isModalOpen, setIsModalOpen] = useState(false);

    const lead = useMemo(() => {
        if (!request || request.type !== RequestType.LEAD) return null;
        return request.payload as Lead;
    }, [request]);

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
            queryClient.invalidateQueries({ queryKey: [`partner-leads-${currentUser?.id}`] });
            setIsModalOpen(false);
        },
    });

    if (isLoading) return <div className="p-8 text-center">Loading lead details...</div>;
    if (isError || !request || !lead) return <div className="p-8 text-center text-red-500">Could not load lead details.</div>;

    // Security check: ensure the current partner is the owner of this lead
    if (currentUser?.id !== lead.partnerId) {
        return <div className="p-8 text-center text-red-500">You are not authorized to view this lead.</div>;
    }

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
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{request.requesterInfo.name}</h1>
                            <StatusBadge status={lead.status} className="text-sm px-3 py-1" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                           <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">ID: {leadId}</span>
                           <span>•</span>
                           <span>{lead.serviceTitle}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <a href={`tel:${request.requesterInfo.phone}`} className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <PhoneIcon className="w-4 h-4 mr-2" />
                            Call
                        </a>
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
                            <DetailItem label="Full Name" value={request.requesterInfo.name} />
                            <DetailItem label="Phone Number" value={request.requesterInfo.phone} />
                             {request.requesterInfo.email && <DetailItem label="Email" value={request.requesterInfo.email} />}
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
                </div>

                {/* Right Column: Conversation / Timeline */}
                <div className="lg:col-span-2">
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
                </div>
            </div>
        </div>
    );
};

export default PartnerLeadDetailsPage;
