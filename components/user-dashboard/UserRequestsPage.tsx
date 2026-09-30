import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyCustomerRequests } from '../../services/requests';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import TableSkeleton from '../shared/TableSkeleton';
import ClientFinishingDetailsModal from './ClientFinishingDetailsModal';
import { ClientGeneralRequestDetailsModal } from './ClientGeneralRequestDetailsModal';
import { SparklesIcon, ChatBubbleLeftRightIcon } from '../ui/Icons';
import type { Request } from '../../types';

const UserRequestsPage = () => {
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const isAr = language === 'ar';

    const [selectedFinishingRequest, setSelectedFinishingRequest] = useState<Request | null>(null);
    const [selectedGeneralRequest, setSelectedGeneralRequest] = useState<Request | null>(null);

    // P0.5: Query only customer's own requests via database-scoped query
    const { data: userRequests, isLoading } = useQuery({ 
        queryKey: ['myCustomerRequests', currentUser?.email], 
        queryFn: () => getMyCustomerRequests(currentUser?.email || ''),
        enabled: !!currentUser?.email
    });

    const myRequests = useMemo(() => {
        if (!userRequests) return [];
        return [...userRequests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [userRequests]);

    if (isLoading) return <TableSkeleton cols={4} rows={5} />;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.adminDashboard.nav.myRequests}</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {isAr ? 'متابعة طلبات الخدمات، عروض مقايسات التشطيب، ومراحل الإنجاز.' : 'Track the status of your inquiries, contractor bids, and milestone progress.'}
                </p>
            </div>

            <div className="grid gap-4">
                {myRequests.length > 0 ? (
                    myRequests.map((req) => {
                        const payload = (req.payload || {}) as any;
                        const title = payload.serviceTitle || payload.propertyDetails?.title?.en || req.type.replace(/_/g, ' ');
                        const typeLabel = t.adminDashboard.requestTypes?.[req.type] || req.type;
                        
                        const isFinishing = (req as any).service === 'finishing' || 
                            payload.serviceType === 'finishing' || 
                            payload.serviceTitle?.includes('تشطيب') ||
                            payload.serviceTitle?.includes('Finishing');

                        return (
                            <Card 
                                key={req.id} 
                                className={`transition-all hover:shadow-md ${
                                    isFinishing ? 'border-amber-400/60 dark:border-amber-500/30' : ''
                                }`}
                            >
                                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{title}</h3>
                                            <StatusBadge status={req.status} />
                                            {isFinishing && (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                                    {isAr ? 'مشروع تشطيب / مناقصة' : 'Finishing RFQ'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {typeLabel} • {new Date(req.createdAt).toLocaleDateString(language, { dateStyle: 'long' })}
                                        </p>

                                        {payload.customerNotes && (
                                            <p className="text-xs text-gray-500 italic max-w-lg line-clamp-1">
                                                "{payload.customerNotes}"
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        {isFinishing ? (
                                            <Button
                                                onClick={() => setSelectedFinishingRequest(req)}
                                                className="bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                                            >
                                                <SparklesIcon className="w-4 h-4" />
                                                <span>{isAr ? 'عروض المقايسات والمراحل' : 'Bids & Milestones'}</span>
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => setSelectedGeneralRequest(req)}
                                                variant="secondary"
                                                className="border border-gray-200 dark:border-gray-700 hover:border-amber-400 font-bold text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors"
                                            >
                                                <ChatBubbleLeftRightIcon className="w-4 h-4 text-amber-500" />
                                                <span>{isAr ? 'التفاصيل والمحادثة' : 'Details & Messages'}</span>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 text-lg">
                            {isAr ? 'لم تقم بتقديم أي طلبات أو مناقصات حتى الآن.' : 'You haven\'t made any requests yet.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal for Client Finishing Hub */}
            {selectedFinishingRequest && (
                <ClientFinishingDetailsModal
                    isOpen={!!selectedFinishingRequest}
                    onClose={() => setSelectedFinishingRequest(null)}
                    request={selectedFinishingRequest}
                />
            )}

            {/* Modal for Client General Requests Hub */}
            {selectedGeneralRequest && (
                <ClientGeneralRequestDetailsModal
                    isOpen={!!selectedGeneralRequest}
                    onClose={() => setSelectedGeneralRequest(null)}
                    request={selectedGeneralRequest}
                />
            )}
        </div>
    );
};

export default UserRequestsPage;
