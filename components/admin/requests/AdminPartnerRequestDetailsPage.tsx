
import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import type { PartnerRequest, PlanCategory } from '../../../types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllPartnerRequests, updatePartnerRequestStatus } from '../../../services/partnerRequests';
import { addPartner } from '../../../services/partners';
import { getPlans } from '../../../services/plans';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, UsersIcon } from '../../ui/Icons';
import DetailItem from '../../shared/DetailItem';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

const AdminPartnerRequestDetailsPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard.adminRequests;
    const { data: requests, isLoading } = useQuery({ queryKey: ['partnerRequests'], queryFn: getAllPartnerRequests });
    const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getPlans });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    
    const [initialPassword, setInitialPassword] = useState('');

    const request = useMemo(() => requests?.find(r => r.id === requestId), [requests, requestId]);

    const mutation = useMutation({
        mutationFn: async ({ status, req }: { status: 'approved' | 'rejected', req: PartnerRequest }) => {
            if (status === 'approved') {
                await addPartner(req, initialPassword);
            }
            await updatePartnerRequestStatus(req.id, status);
        },
        onSuccess: (_, variables) => {
            showToast(`Partner Application ${variables.status}.`, 'success');
            queryClient.invalidateQueries({ queryKey: ['partnerRequests'] });
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            navigate('/admin/partners/requests');
        },
        onError: () => {
            showToast('Action failed. Please try again.', 'error');
        }
    });

    if (isLoading) return <div className="p-8 text-center">Loading...</div>;
    if (!request) return <div className="p-8 text-center text-red-500">Request not found.</div>;
    
    const companyTypeForPlan = request.companyType as PlanCategory;
    const selectedPlanDetails = plans?.[companyTypeForPlan]?.[request.subscriptionPlan as keyof typeof plans[typeof companyTypeForPlan]]?.[language];

    const isPending = request.status === 'pending';

    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
            <div className="mb-6 flex items-center justify-between">
                <Link to="/admin/partners/requests" className="inline-flex items-center gap-2 text-amber-600 hover:underline">
                    <ArrowLeftIcon className="w-5 h-5" />
                    {t.adminShared.backToRequests}
                </Link>
                <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${request.status === 'approved' ? 'bg-green-100 text-green-700' : request.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {request.status}
                </span>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <UsersIcon className="w-8 h-8 text-gray-400" />
                {request.companyName}
            </h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Application Data */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                             <CardTitle className="text-lg text-amber-500">{t_admin.table.companyInfo}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <DetailItem label="Company Type" value={request.companyType} className="capitalize" />
                                <DetailItem label="Address" value={request.companyAddress} />
                                <DetailItem label="Website" value={request.website ? <a href={request.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">{request.website}</a> : 'N/A'} />
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Description</dt>
                                <dd className="text-md text-gray-900 dark:text-white whitespace-pre-line bg-gray-50 dark:bg-gray-800 p-3 rounded-md border border-gray-100 dark:border-gray-700">
                                    {request.description}
                                </dd>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                             <CardTitle className="text-lg text-amber-500">{t_admin.table.primaryContact}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <DetailItem label="Name" value={request.contactName} />
                                <DetailItem label="Email" value={request.contactEmail} />
                                <DetailItem label="Phone" value={request.contactPhone} />
                            </div>

                            {request.managementContacts && request.managementContacts.length > 0 && (
                                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-3">{t_admin.table.managementContacts}</h4>
                                    <div className="grid gap-3">
                                        {request.managementContacts.map((contact, index) => (
                                            <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold">{contact.name} <span className="text-xs text-gray-500 font-normal">({contact.position})</span></p>
                                                    <p className="text-xs text-gray-500">{contact.email}</p>
                                                </div>
                                                <span className="text-sm font-mono">{contact.phone}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Plan & Actions */}
                <div className="space-y-6">
                     <Card>
                        <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                            <CardTitle className="text-lg text-amber-500">{t_admin.subscriptionPlan}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                             {selectedPlanDetails ? (
                                <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-center">
                                    <p className="text-sm text-amber-800 dark:text-amber-300 uppercase tracking-wider font-bold mb-1">Requested Plan</p>
                                    <p className="font-extrabold text-2xl text-amber-600 dark:text-amber-400 mb-2">{selectedPlanDetails.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{selectedPlanDetails.description}</p>
                                    <p className="mt-3 font-bold text-gray-900 dark:text-white">{selectedPlanDetails.price}</p>
                                </div>
                            ) : (
                                <p className="text-gray-500">Plan details not found.</p>
                            )}
                        </CardContent>
                     </Card>

                     {request.documents && request.documents.length > 0 && (
                        <Card>
                            <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-3">
                                <CardTitle className="text-lg text-amber-500">{t_admin.table.documents}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <ul className="space-y-2">
                                    {request.documents.map((doc, index) => (
                                        <li key={index} className="flex items-center gap-2">
                                            <span className="text-gray-400">📄</span>
                                            <a href={doc.fileContent} download={doc.fileName} className="text-blue-600 hover:underline text-sm truncate block max-w-[200px]">
                                                {doc.fileName}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                     )}

                    {isPending && (
                        <Card className="border-t-4 border-t-blue-500">
                            <CardHeader className="pb-3">
                                <CardTitle>Application Decision</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-gray-500">
                                    Approving will create a new partner account for <strong>{request.companyName}</strong>.
                                </p>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Set Initial Password</label>
                                    <Input 
                                        type="text" 
                                        value={initialPassword} 
                                        onChange={(e) => setInitialPassword(e.target.value)}
                                        placeholder="e.g. TempPass2024!"
                                        className="font-mono text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-3">
                                     <Button 
                                        onClick={() => mutation.mutate({ status: 'approved', req: request })} 
                                        disabled={mutation.isPending || !initialPassword} 
                                        className="bg-green-600 hover:bg-green-700 text-white w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={!initialPassword ? "Please set a password first" : ""}
                                    >
                                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                                        {t.adminShared.approve} & Create Account
                                    </Button>
                                    <Button 
                                        onClick={() => mutation.mutate({ status: 'rejected', req: request })} 
                                        disabled={mutation.isPending} 
                                        variant="danger"
                                        className="w-full justify-center"
                                    >
                                        <XCircleIcon className="w-5 h-5 mr-2" />
                                        {t.adminShared.reject}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPartnerRequestDetailsPage;
