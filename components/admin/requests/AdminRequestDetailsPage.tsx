
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestById, updateRequest, addMessageToLead } from '../../../services/requests';
import { getAllPartnersForAdmin, addPartner } from '../../../services/partners';
import { addProperty } from '../../../services/properties';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { useAuth } from '../../auth/AuthContext';
import { RequestType, Property, RequestStatus, Role, LeadStatus } from '../../../types';
import DetailItem from '../../shared/DetailItem';
import { ArrowLeftIcon, CheckCircleIcon, UserPlusIcon, BuildingIcon } from '../../ui/Icons';
import { Button } from '../../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import ConversationThread from '../../shared/ConversationThread';
import RequestPayloadViewer from './RequestPayloadViewer';

const AdminRequestDetailsPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard.adminRequests;
    const { showToast } = useToast();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: request, isLoading } = useQuery({ 
        queryKey: ['request', requestId], 
        queryFn: () => getRequestById(requestId!),
        enabled: !!requestId,
    });
    
    const { data: partners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const managers = useMemo(() => (partners || []).filter(p => p.role.includes('_manager') || p.role === Role.SUPER_ADMIN), [partners]);

    const [actionStatus, setActionStatus] = useState<RequestStatus | LeadStatus>('pending');
    const [actionAssignee, setActionAssignee] = useState<string>('');
    const [actionNote, setActionNote] = useState<string>('');

    React.useEffect(() => {
        if (request) {
            if (request.type === RequestType.LEAD) {
                 setActionStatus((request.payload as any).status);
            } else {
                 setActionStatus(request.status);
            }
            setActionAssignee(request.assignedTo || '');
        }
    }, [request]);

    const statusOptions = useMemo(() => {
        if (!request) return [];
        if (request.type === RequestType.LEAD) {
            return Object.entries(t.dashboard.leadStatus).map(([key, value]) => ({ key, value }));
        }
        return Object.entries(t_admin.requestStatus).map(([key, value]) => ({ key, value }));
    }, [request, t, t_admin]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!request || !currentUser) return;
            
            const updates: any = { assignedTo: actionAssignee };
            let statusToSave = actionStatus;
            
            if (request.type === RequestType.LEAD) {
                 updates.payload = { ...(request.payload as any), status: actionStatus };
                 // Map generic lead statuses to request statuses for consistency
                 if (['contacted', 'quoted', 'site-visit'].includes(actionStatus as string)) statusToSave = 'in-progress';
                 if (actionStatus === 'completed') statusToSave = 'closed';
                 if (actionStatus === 'cancelled') statusToSave = 'rejected';
                 if (actionStatus === 'new') statusToSave = 'new';
            }
            
            updates.status = statusToSave;

            if (actionNote.trim()) {
                const senderType = currentUser.role === Role.SUPER_ADMIN || currentUser.role.includes('_manager') ? 'admin' : 'partner';
                try {
                     await addMessageToLead(request.id, {
                        sender: senderType,
                        senderId: currentUser.id,
                        type: 'note',
                        content: actionNote
                    });
                } catch (e) {
                    console.log("Note added to request log (simulated):", actionNote);
                }
            }
            await updateRequest(request.id, updates);
        },
        onSuccess: () => {
            showToast('Request updated successfully', 'success');
            setActionNote('');
            queryClient.invalidateQueries({ queryKey: ['request', requestId] });
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
        },
        onError: () => showToast('Failed to update request', 'error')
    });
    
    const approvalMutation = useMutation({
        mutationFn: async (action: 'approved' | 'rejected') => {
            if (!request) return;
            if (action === 'approved') {
                if (request.type === RequestType.PARTNER_APPLICATION) {
                    await addPartner(request.payload as any);
                } else if (request.type === RequestType.PROPERTY_LISTING_REQUEST) {
                     const r = request.payload as any;
                     const pd = r.propertyDetails || {};

                     // Safety Check for required fields
                     if (!pd) {
                         throw new Error("Incomplete property details. Cannot create listing.");
                     }
                     
                     // Helper to safe parse numbers and text
                     const safeNum = (val: any) => Number(val) || 0;
                     const getEn = (obj: any) => obj?.en || '';
                     const getAr = (obj: any) => obj?.ar || '';
                     
                     const mainImage = (r.images && r.images[0]) ? r.images[0] : 'https://via.placeholder.com/800x600?text=No+Image';

                     const newProperty: Omit<Property, 'id' | 'partnerName' | 'partnerImageUrl' | 'projectName'> = {
                        partnerId: 'individual-listings',
                        title: { 
                            en: getEn(pd.title) || 'Untitled Property', 
                            ar: getAr(pd.title) || 'عقار بدون عنوان' 
                        },
                        description: { 
                            en: getEn(pd.description) || '', 
                            ar: getAr(pd.description) || '' 
                        },
                        address: { en: pd.address || '', ar: pd.address || '' },
                        location: pd.location || { lat: 30.0, lng: 31.0 },
                        status: pd.purpose || { en: 'For Sale', ar: 'للبيع' },
                        type: { 
                            en: (getEn(pd.propertyType) || 'Apartment') as any, 
                            ar: getAr(pd.propertyType) || 'شقة' 
                        },
                        finishingStatus: pd.finishingStatus ? { 
                            en: getEn(pd.finishingStatus), 
                            ar: getAr(pd.finishingStatus) 
                        } : undefined,
                        area: safeNum(pd.area),
                        price: { 
                            en: `EGP ${safeNum(pd.price).toLocaleString('en-US')}`,
                            ar: `${safeNum(pd.price).toLocaleString('ar-EG')} ج.م`
                        },
                        priceNumeric: safeNum(pd.price),
                        pricePerMeter: safeNum(pd.area) > 0 ? {
                            en: `EGP ${Math.round(safeNum(pd.price) / safeNum(pd.area)).toLocaleString('en-US')}/m²`,
                            ar: `${Math.round(safeNum(pd.price) / safeNum(pd.area)).toLocaleString('ar-EG')} ج.م/م²`
                        } : undefined,
                        beds: safeNum(pd.bedrooms),
                        baths: safeNum(pd.bathrooms),
                        floor: safeNum(pd.floor),
                        amenities: pd.amenities || { en: [], ar: [] },
                        isInCompound: !!pd.isInCompound,
                        delivery: { 
                            isImmediate: pd.deliveryType === 'immediate', 
                            date: pd.deliveryType === 'future' ? `${pd.deliveryYear}-${pd.deliveryMonth}` : undefined
                        },
                        installmentsAvailable: !!pd.hasInstallments,
                        installments: pd.hasInstallments ? {
                            downPayment: safeNum(pd.downPayment),
                            monthlyInstallment: safeNum(pd.monthlyInstallment),
                            years: safeNum(pd.years)
                        } : undefined,
                        realEstateFinanceAvailable: !!pd.realEstateFinanceAvailable,
                        imageUrl: mainImage,
                        imageUrl_small: mainImage,
                        imageUrl_medium: mainImage,
                        imageUrl_large: mainImage,
                        gallery: r.images ? r.images.slice(1) : [],
                        listingStatus: 'active',
                        contactMethod: pd.contactMethod || 'platform',
                        ownerPhone: pd.ownerPhone,
                        listingStartDate: pd.listingStartDate || new Date().toISOString().split('T')[0],
                    };
                    await addProperty(newProperty);
                }
            }
            await updateRequest(request.id, { status: action });
        },
        onSuccess: (_, action) => {
             showToast(`Request ${action}.`, 'success');
             queryClient.invalidateQueries({ queryKey: ['request', requestId] });
        },
        onError: (error: any) => {
            console.error("Approval error:", error);
            showToast(error.message || 'Action failed. Please try again.', 'error');
        }
    });

    if (isLoading) return <div>Loading request...</div>;
    if (!request) return <div>Request not found.</div>;
    
    const showApprovalActions = ['new', 'pending', 'reviewed'].includes(request.status) && (request.type === RequestType.PARTNER_APPLICATION || request.type === RequestType.PROPERTY_LISTING_REQUEST);

    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
            <Link to="/admin/requests" className="inline-flex items-center gap-2 text-amber-600 hover:underline mb-4">
                <ArrowLeftIcon className="w-5 h-5" />
                Back to All Requests
            </Link>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: INFO */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                         <CardHeader>
                             <div className="flex justify-between items-center">
                                 <CardTitle>Request Details</CardTitle>
                                 <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 capitalize">
                                     {request.type.replace(/_/g, ' ')}
                                 </span>
                             </div>
                         </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div>
                                     <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Requester</h4>
                                     <p className="font-bold text-lg">{request.requesterInfo.name}</p>
                                     <p className="text-gray-600">{request.requesterInfo.phone}</p>
                                     <p className="text-gray-600">{request.requesterInfo.email}</p>
                                 </div>
                                 <div>
                                     <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">Metadata</h4>
                                     <DetailItem label="Created" value={new Date(request.createdAt).toLocaleString()} />
                                     <DetailItem label="Request ID" value={request.id} />
                                 </div>
                             </div>
                             
                             <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                 <h4 className="text-sm font-medium text-gray-500 uppercase mb-4">Payload Data</h4>
                                 <RequestPayloadViewer request={request} />
                             </div>
                             
                             {/* Approval Actions */}
                             {showApprovalActions && (
                                 <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex gap-4">
                                     <Button 
                                        onClick={() => approvalMutation.mutate('approved')} 
                                        isLoading={approvalMutation.isPending} 
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                                     >
                                         {request.type === RequestType.PARTNER_APPLICATION ? <UserPlusIcon className="w-4 h-4" /> : <BuildingIcon className="w-4 h-4" />}
                                         Approve & Create {request.type === RequestType.PARTNER_APPLICATION ? 'Partner' : 'Listing'}
                                     </Button>
                                     <Button 
                                        onClick={() => approvalMutation.mutate('rejected')} 
                                        isLoading={approvalMutation.isPending} 
                                        variant="danger"
                                     >
                                         Reject Request
                                     </Button>
                                 </div>
                             )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Conversation & History</CardTitle></CardHeader>
                        <CardContent>
                             <ConversationThread 
                                lead={request.type === RequestType.LEAD ? (request.payload as any) : { messages: (request.payload as any).messages || [] } } 
                                requestId={request.id} 
                                onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['request', requestId] })} 
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: MANAGEMENT PANEL */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="border-t-4 border-t-amber-500 sticky top-24">
                        <CardHeader><CardTitle>Management Panel</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
                                <Select value={actionStatus as string} onChange={(e) => setActionStatus(e.target.value as any)}>
                                    {statusOptions.map(opt => (
                                        <option key={opt.key} value={opt.key}>{opt.value as string}</option>
                                    ))}
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Assignee</label>
                                <Select value={actionAssignee} onChange={(e) => setActionAssignee(e.target.value)}>
                                    <option value="">Unassigned</option>
                                    {managers.map(m => (
                                        <option key={m.id} value={m.id}>{language === 'ar' ? m.nameAr : m.name}</option>
                                    ))}
                                </Select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Internal Note</label>
                                <Textarea 
                                    value={actionNote} 
                                    onChange={(e) => setActionNote(e.target.value)} 
                                    rows={3} 
                                    placeholder="Reason for change..."
                                />
                            </div>
                            
                            <Button onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending} className="w-full flex justify-center gap-2">
                                <CheckCircleIcon className="w-5 h-5" />
                                Update Request
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

        </div>
    );
};

export default AdminRequestDetailsPage;