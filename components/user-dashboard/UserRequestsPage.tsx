import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRequests } from '../../services/requests';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import TableSkeleton from '../shared/TableSkeleton';

const UserRequestsPage = () => {
    const { currentUser } = useAuth();
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;

    const { data: allRequests, isLoading } = useQuery({ 
        queryKey: ['allRequests'], 
        queryFn: getAllRequests,
        enabled: !!currentUser
    });

    const myRequests = useMemo(() => {
        if (!allRequests || !currentUser) return [];
        return allRequests.filter(req => 
            req.requesterInfo.email === currentUser.email || 
            req.requesterInfo.phone === currentUser.contactMethods?.phone?.number
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [allRequests, currentUser]);

    if (isLoading) return <TableSkeleton cols={4} rows={5} />;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.adminDashboard.nav.myRequests}</h1>
                <p className="text-gray-500 dark:text-gray-400">Track the status of your inquiries and service requests.</p>
            </div>

            <div className="grid gap-4">
                {myRequests.length > 0 ? (
                    myRequests.map((req) => {
                        const payload = req.payload as any;
                        const title = payload.serviceTitle || payload.propertyDetails?.title?.en || req.type.replace(/_/g, ' ');
                        
                        return (
                            <Card key={req.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{title}</h3>
                                            <StatusBadge status={req.status} />
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {t.adminDashboard.requestTypes[req.type]} • {new Date(req.createdAt).toLocaleDateString(language, { dateStyle: 'long' })}
                                        </p>
                                    </div>
                                    
                                    {/* Action area could go here, e.g. View Details if user detail page exists */}
                                    {payload.customerNotes && (
                                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm text-gray-600 dark:text-gray-300 max-w-md">
                                            "{payload.customerNotes}"
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-16 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 text-lg">You haven't made any requests yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserRequestsPage;