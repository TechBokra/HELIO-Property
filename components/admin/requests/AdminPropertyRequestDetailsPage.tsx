
import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { Property, Request } from '../../../types';
import { RequestType, Role, LeadStatus, RequestStatus } from '../../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestById, updateRequest, addMessageToLead } from '../../../services/requests';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { approvePropertyListingRequest } from '../../../services/propertyRequests';
import { invalidateAllPropertyQueries } from '../../../utils/queryInvalidation';
import { resolvePropertyReferenceCode } from '../../../utils/propertyFormShared';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, BuildingIcon, UsersIcon, PhoneIcon, BedIcon, BathIcon, AreaIcon, FloorIcon, WrenchScrewdriverIcon } from '../../ui/Icons';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import UnifiedMap from '../../shared/UnifiedMap';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/Textarea';
import { useAuth } from '../../auth/AuthContext';
import ConversationThread from '../../shared/ConversationThread';
import RequestPayloadViewer from './RequestPayloadViewer';
import { Select } from '../../ui/Select';

const AdminPropertyRequestDetailsPage: React.FC = () => {
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
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    React.useEffect(() => {
        if (request) {
            if (request.type === RequestType.LEAD) {
                 setActionStatus((request.payload as any).status || 'new');
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

    const acceptMutation = useMutation({
        mutationFn: async () => {
            if (!request) throw new Error('Request not found');
            return approvePropertyListingRequest(request.id, {
                assigneeId: actionAssignee || undefined,
                actorId: currentUser?.id,
                partners: partners || [],
            });
        },
        onSuccess: ({ property, alreadyExisted }) => {
            invalidateAllPropertyQueries(queryClient, {
                propertyId: property.id,
                partnerId: property.partnerId,
                projectId: property.projectId,
            });
            queryClient.invalidateQueries({ queryKey: ['propertyRequests'] });
            queryClient.invalidateQueries({ queryKey: ['request', requestId] });
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
            queryClient.invalidateQueries({ queryKey: ['unifiedRequests'] });

            showToast(
                alreadyExisted
                    ? (language === 'ar' ? 'تم استكمال ربط المسودة الموجودة دون تكرار.' : 'Existing draft property linked cleanly without duplication.')
                    : (language === 'ar' ? 'تم قبول الطلب وإنشاء مسودة عقار واحدة مرتبطة بالطلب.' : 'Request accepted. Single draft property created with bidirectional link.'),
                'success'
            );
            setTimeout(() => {
                navigate(`/admin/properties/edit/${property.id}`);
            }, 900);
        },
        onError: (error: any) => {
            console.error(error);
            showToast(
                error?.message || (language === 'ar' ? 'فشل إنشاء المسودة. يمكنك إعادة المحاولة بأمان دون تكرار.' : 'Failed to create draft property. Retrying is safe and idempotent.'),
                'error'
            );
        },
    });

    const updateRequestStatusMutation = useMutation({
        mutationFn: (status: 'approved' | 'rejected' | 'reviewed') => updateRequest(request!.id, { status }),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['propertyRequests'] });
            queryClient.invalidateQueries({ queryKey: ['request', requestId] });
            queryClient.invalidateQueries({ queryKey: ['unifiedRequests'] });
        },
        onError: () => showToast('Failed to update request status.', 'error')
    });

    const handleAcceptAsDraft = async () => {
        if (!request || acceptMutation.isPending) return;
        acceptMutation.mutate();
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            showToast('Please provide a rejection reason.', 'error');
            return;
        }
        if (currentUser && request) {
             await addMessageToLead(request.id, {
                sender: 'admin',
                senderId: currentUser.id,
                type: 'note',
                content: `REJECTED: ${rejectionReason}`
            });
        }
        await updateRequestStatusMutation.mutateAsync('rejected');
        showToast('Request rejected.', 'success');
        navigate('/admin/properties/listing-requests');
    };

    const handleRequestReview = async () => {
        await updateRequestStatusMutation.mutateAsync('reviewed'); 
        showToast('Marked for review. Please message the client.', 'success');
    }

    if (isLoading) return <div className="p-12 text-center text-gray-500">Loading request details...</div>;
    if (!request) return <div className="p-12 text-center text-red-500 font-bold">Request not found.</div>;

    // Access payload securely
    const payload = request.payload as any;
    
    // Logic for Property Listing Requests
    if (request.type === RequestType.PROPERTY_LISTING_REQUEST) {
        const pd = payload.propertyDetails;
        if (!pd) return <div className="p-12 text-center text-red-500">Corrupted request data.</div>;
        
        const isProcessed = request.status === 'approved' || request.status === 'rejected';
        const isPaid = payload.cooperationType === 'paid_listing';
        const messages = payload.messages || [];

        // Reconstruct Lead-like object for ConversationThread
        const conversationLeadProp = {
            id: request.id,
            partnerId: 'individual-listings',
            status: 'new',
            serviceType: 'property',
            customerName: request.requesterInfo.name,
            customerPhone: request.requesterInfo.phone,
            serviceTitle: 'Listing Request',
            createdAt: request.createdAt,
            updatedAt: request.updatedAt || request.createdAt,
            messages: messages
        };

        return (
            <div className="max-w-7xl mx-auto animate-fadeIn pb-20">
                 <div className="mb-6 flex items-center justify-between">
                    <Link to="/admin/properties/listing-requests" className="inline-flex items-center gap-2 text-gray-500 hover:text-amber-600 transition-colors">
                        <ArrowLeftIcon className="w-5 h-5" />
                        {t.adminShared.backToRequests}
                    </Link>
                    <div className="flex items-center gap-3">
                        {payload.createdPropertyId && (
                            <Link 
                                to={`/admin/properties/edit/${payload.createdPropertyId}`} 
                                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                            >
                                <span>
                                    {language === 'ar'
                                        ? `فتح المسودة العقارية (${resolvePropertyReferenceCode(payload.createdPropertyId, payload.createdPropertyReference)}) ←`
                                        : `Open Draft Property (${resolvePropertyReferenceCode(payload.createdPropertyId, payload.createdPropertyReference)}) →`}
                                </span>
                            </Link>
                        )}
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize flex items-center gap-2 ${
                            request.status === 'approved' ? 'bg-green-100 text-green-700' : 
                            request.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                            'bg-amber-100 text-amber-700'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${
                                request.status === 'approved' ? 'bg-green-500' : 
                                request.status === 'rejected' ? 'bg-red-500' : 
                                'bg-amber-500'
                            }`}></span>
                            Status: {request.status}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Info & Specs */}
                    <div className="space-y-6 lg:col-span-1">
                        <Card>
                            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <UsersIcon className="w-5 h-5 text-gray-400" /> Owner Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs uppercase">Name</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{request.requesterInfo.name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs uppercase">Phone</p>
                                    <div className="flex items-center gap-2">
                                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                                        <p className="font-mono text-gray-900 dark:text-white" dir="ltr">{request.requesterInfo.phone}</p>
                                    </div>
                                </div>
                                 <div>
                                    <p className="text-gray-500 text-xs uppercase">Cooperation</p>
                                    <p className={`font-medium ${isPaid ? 'text-green-600' : 'text-blue-600'}`}>
                                        {payload.cooperationType === 'paid_listing' ? 'Paid Listing' : 'Commission Based'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <BuildingIcon className="w-5 h-5 text-gray-400" /> Specs Provided
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-gray-500 text-xs">Type</p><p className="font-medium">{pd.propertyType?.en || 'N/A'}</p></div>
                                    <div><p className="text-gray-500 text-xs">Status</p><p className="font-medium">{pd.purpose?.en || 'N/A'}</p></div>
                                    
                                    <div className="flex items-center gap-1">
                                        <BedIcon className="w-4 h-4 text-gray-400" />
                                        <div><p className="text-gray-500 text-xs">Beds</p><p className="font-medium">{pd.bedrooms || pd.beds || 0}</p></div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <BathIcon className="w-4 h-4 text-gray-400" />
                                        <div><p className="text-gray-500 text-xs">Baths</p><p className="font-medium">{pd.bathrooms || pd.baths || 0}</p></div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <FloorIcon className="w-4 h-4 text-gray-400" />
                                        <div><p className="text-gray-500 text-xs">Floor</p><p className="font-medium">{pd.floor || 0}</p></div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AreaIcon className="w-4 h-4 text-gray-400" />
                                        <div><p className="text-gray-500 text-xs">Area</p><p className="font-medium">{pd.area || 0} m²</p></div>
                                    </div>
                                    
                                    <div className="col-span-2"><p className="text-gray-500 text-xs">Finishing</p><p className="font-medium">{pd.finishingStatus?.en || pd.finishingStatus || 'N/A'}</p></div>
                                    <div className="col-span-2"><p className="text-gray-500 text-xs">Asking Price</p><p className="font-bold text-amber-600">{Number(pd.price || 0).toLocaleString()} EGP</p></div>
                                </div>
                                
                                {pd.amenities?.en && (
                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-gray-500 text-xs mb-1">Amenities</p>
                                        <div className="flex flex-wrap gap-1">
                                            {pd.amenities.en.map((am: string) => (
                                                <span key={am} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-300">
                                                    {am}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {pd.location && (
                            <Card className="overflow-hidden">
                                 <div className="h-48 w-full relative">
                                    <UnifiedMap 
                                        mode="read"
                                        markers={[{ id: 'req-loc', lat: pd.location.lat, lng: pd.location.lng, color: 'amber' }]}
                                    />
                                </div>
                                <div className="p-3 text-xs text-center text-gray-500 bg-gray-50 dark:bg-gray-900">
                                    {pd.address}
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Center Column: Review & Action */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Images Grid */}
                        {payload.images && payload.images.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {payload.images.map((img: string, idx: number) => (
                                    <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                        <img loading="lazy" decoding="async" src={img} alt={`Request img ${idx}`} className="w-full h-full object-cover" />
                                        <a href={img} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                            <span className="sr-only">View</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-center text-gray-500 border-2 border-dashed border-gray-300">
                                No images provided
                            </div>
                        )}
                        
                         <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                             <h4 className="text-sm font-medium text-gray-500 uppercase mb-4">Payload Data</h4>
                             <RequestPayloadViewer request={request} />
                         </div>

                         <Card className={`border-t-4 ${isProcessed ? 'border-gray-300' : 'border-amber-500'}`}>
                            <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        <WrenchScrewdriverIcon className="w-5 h-5 text-amber-600" />
                                        Action Center
                                    </CardTitle>
                                    {!isProcessed && <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">Needs Action</span>}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {!isProcessed ? (
                                    <>
                                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                                            <strong>Processing:</strong> Accepting this request will create a new <strong>DRAFT</strong> property in the system under "Platform Properties". 
                                            You will be immediately redirected to the property editor to refine the details before publishing.
                                        </div>

                                        {showRejectInput ? (
                                            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 animate-fadeIn">
                                                <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-2">Reason for Rejection (Required)</label>
                                                <Textarea 
                                                    value={rejectionReason} 
                                                    onChange={e => setRejectionReason(e.target.value)} 
                                                    placeholder="e.g., Invalid photos, Price too high, Duplicate listing..."
                                                    rows={3}
                                                    className="bg-white dark:bg-gray-900"
                                                />
                                                <div className="flex justify-end gap-3 mt-3">
                                                    <Button variant="secondary" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                                                    <Button variant="danger" onClick={handleReject} isLoading={updateRequestStatusMutation.isPending}>Confirm Rejection</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <Button 
                                                    onClick={handleAcceptAsDraft} 
                                                    isLoading={acceptMutation.isPending || updateRequestStatusMutation.isPending}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md py-3 text-lg"
                                                >
                                                    <CheckCircleIcon className="w-6 h-6 mr-2" />
                                                    {payload.createdPropertyId
                                                        ? (language === 'ar' ? 'استكمال ربط المسودة واعتماد الطلب' : 'Complete Draft Link & Approve')
                                                        : (language === 'ar' ? 'اعتماد وإنشاء مسودة عقار' : 'Accept as Draft & Edit')}
                                                </Button>
                                                
                                                <Button 
                                                    onClick={handleRequestReview} 
                                                    variant="secondary"
                                                    className="px-6"
                                                >
                                                    Needs Info / Review
                                                </Button>

                                                {!isPaid && (
                                                    <Button 
                                                        onClick={() => setShowRejectInput(true)} 
                                                        variant="danger"
                                                        className="px-6"
                                                    >
                                                        <XCircleIcon className="w-5 h-5 mr-2" />
                                                        Reject
                                                    </Button>
                                                )}
                                                
                                                {isPaid && (
                                                    <div className="w-full text-center text-xs text-gray-500">
                                                        * Paid requests cannot be rejected directly. Please review or contact client.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                                        <CheckCircleIcon className={`w-12 h-12 mx-auto mb-1 ${request.status === 'approved' ? 'text-green-500' : 'text-red-500'}`} />
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                            Request {request.status === 'approved' ? 'Accepted' : 'Rejected'}
                                        </h3>
                                        <p className="text-gray-500">This request has been processed.</p>
                                        {payload.createdPropertyId && (
                                            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                                                <span className="font-mono text-xs px-2.5 py-1 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                                    {resolvePropertyReferenceCode(payload.createdPropertyId, payload.createdPropertyReference)}
                                                </span>
                                                <Link
                                                    to={`/admin/properties/edit/${payload.createdPropertyId}`}
                                                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-xs shadow-sm transition-colors"
                                                >
                                                    {language === 'ar' ? 'تعديل المسودة المرتبطة' : 'Edit Linked Draft Property'}
                                                </Link>
                                                <Link
                                                    to={`/properties/${payload.createdPropertyId}`}
                                                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 font-semibold text-xs transition-colors"
                                                >
                                                    {language === 'ar' ? 'معاينة العقار' : 'Preview Listing'}
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        
                        {/* Communication Thread */}
                        <Card>
                             <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3 bg-gray-50 dark:bg-gray-800">
                                <CardTitle className="text-lg">Client Communication</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ConversationThread 
                                    lead={conversationLeadProp as any} 
                                    onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['propertyRequests'] })} 
                                    requestId={request.id} 
                                />
                            </CardContent>
                        </Card>

                    </div>
                </div>
            </div>
        );
    }

    // General Request Layout (Fallback)
    return (
        <div className="max-w-6xl mx-auto animate-fadeIn">
             <div className="flex justify-between items-center mb-6">
                 <Link to="/admin/requests" className="inline-flex items-center gap-2 text-amber-600 hover:underline">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.adminShared.backToRequests}
                </Link>
                 <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize bg-gray-100`}>
                    {request.status}
                </span>
             </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Request Details</h1>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                            <CardTitle className="text-lg text-amber-500">{t.adminDashboard.decorationsManagement.requestInformation}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <RequestPayloadViewer request={request} />
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3 bg-gray-50 dark:bg-gray-800">
                            <CardTitle className="text-lg">Communication History</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                             <ConversationThread 
                                lead={{ 
                                    messages: (request.payload as any).messages || [], 
                                    id: request.id, 
                                    partnerId: 'admin', 
                                    status: 'new', 
                                    serviceType: 'property', 
                                    customerName: request.requesterInfo.name, 
                                    customerPhone: request.requesterInfo.phone, 
                                    serviceTitle: 'Request', 
                                    createdAt: request.createdAt, 
                                    updatedAt: request.updatedAt 
                                } as any} 
                                onMessageSent={() => queryClient.invalidateQueries({ queryKey: ['request', requestId] })} 
                                requestId={request.id} 
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1 space-y-6">
                     <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                             <CardTitle className="text-lg text-amber-500">{t.adminDashboard.decorationsManagement.customerInformation}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <div><span className="text-gray-500 block mb-1">Name</span><span className="font-semibold text-lg">{request.requesterInfo.name}</span></div>
                            <div><span className="text-gray-500 block mb-1">Phone</span><span className="font-mono text-lg" dir="ltr">{request.requesterInfo.phone}</span></div>
                        </CardContent>
                    </Card>

                    <Card className="border-t-4 border-t-amber-500">
                        <CardHeader className="pb-3">
                            <CardTitle>Management Panel</CardTitle>
                        </CardHeader>
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

export default AdminPropertyRequestDetailsPage;
