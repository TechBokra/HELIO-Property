import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { getMyCustomerRequests } from '../../services/requests';
import { useFavoritesStore } from '../../store/useFavoritesStore';
import { useLanguage } from '../shared/LanguageContext';
import StatCard from '../shared/StatCard';
import { InboxIcon, HeartIcon, ClockIcon } from '../ui/Icons';
import { Link } from 'react-router-dom';

const UserDashboardHomePage = () => {
    const { currentUser } = useAuth();
    const { t, language } = useLanguage();
    const { favorites } = useFavoritesStore();
    const t_home = t.dashboardHome;

    const { data: myCustomerRequests, isLoading } = useQuery({ 
        queryKey: ['myCustomerRequests', currentUser?.email], 
        queryFn: () => getMyCustomerRequests(currentUser?.email || ''),
        enabled: !!currentUser?.email
    });

    const userStats = useMemo(() => {
        if (!myCustomerRequests || !currentUser) return null;
        
        const myRequests = myCustomerRequests;
        const pendingCount = myRequests.filter(r => ['new', 'pending', 'contacted'].includes(r.status)).length;
        
        // Convert to display format
        const recentRequests = myRequests
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
            .map(req => {
                const payload = req.payload as any;
                return {
                    id: req.id,
                    customerName: req.requesterInfo.name,
                    createdAt: req.createdAt,
                    status: req.status,
                    serviceTitle: payload.serviceTitle || payload.propertyDetails?.title?.en || req.type.replace(/_/g, ' ')
                }; 
            });

        return {
            totalRequests: myRequests.length,
            pendingRequests: pendingCount,
            favoritesCount: favorites.length,
            recentRequests
        };

    }, [myCustomerRequests, currentUser, favorites.length]);

    if (isLoading || !userStats) return <div>Loading...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_home.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t_home.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title={t_home.totalLeads} // Reusing label for "Total Requests"
                    value={userStats.totalRequests}
                    icon={InboxIcon}
                    linkTo="/dashboard/requests"
                />
                 <StatCard 
                    title={t.adminDashboard.adminRequests.requestStatus.pending}
                    value={userStats.pendingRequests}
                    icon={ClockIcon}
                    linkTo="/dashboard/requests"
                />
                 <StatCard 
                    title={t.nav.favorites}
                    value={userStats.favoritesCount}
                    icon={HeartIcon}
                    linkTo="/dashboard/favorites"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t_home.recentLeads}</h2>
                    <Link to="/dashboard/requests" className="text-sm font-semibold text-amber-600 hover:underline">{t_home.viewAllLeads}</Link>
                </div>
                
                {userStats.recentRequests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="py-2 font-medium">{t.dashboard.leadTable.service}</th>
                                    <th className="py-2 font-medium">{t.dashboard.leadTable.date}</th>
                                    <th className="py-2 font-medium">{t.dashboard.leadTable.status}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {userStats.recentRequests.map((req: any) => (
                                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="py-3 font-medium text-gray-800 dark:text-gray-200">{req.serviceTitle}</td>
                                        <td className="py-3 text-gray-500">{new Date(req.createdAt).toLocaleDateString(language)}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${
                                                req.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                                req.status === 'completed' || req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">{t_home.noRecentLeads}</p>
                )}
            </div>
        </div>
    );
};

export default UserDashboardHomePage;