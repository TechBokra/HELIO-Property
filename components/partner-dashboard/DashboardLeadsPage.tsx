
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead, LeadStatus } from '../../types';
import { useAuth } from '../auth/AuthContext';
import ExportDropdown from '../shared/ExportDropdown';
import { getAllRequests } from '../../services/requests';
import { RequestType } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../shared/LanguageContext';
import { Select } from '../ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { ResponsiveList } from '../shared/ResponsiveList';
import CardSkeleton from '../ui/CardSkeleton';
import TableSkeleton from '../shared/TableSkeleton';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import ErrorState from '../shared/ErrorState';

type SortConfig = {
    key: keyof Lead;
    direction: 'ascending' | 'descending';
} | null;

const DashboardLeadsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const { currentUser } = useAuth();

    const { data: allRequests, isLoading: loading, isError, refetch } = useQuery({
        queryKey: ['allRequests'],
        queryFn: getAllRequests,
        enabled: !!currentUser,
    });

    const partnerLeads = useMemo((): Lead[] => {
        if (!allRequests || !currentUser) return [];

        return allRequests
            .filter(req => 
                req.type === RequestType.LEAD && 
                (req.payload as Lead).partnerId === currentUser.id
            )
            .map(req => {
                const leadPayload = req.payload as Lead;
                return {
                    ...leadPayload,
                    id: req.id, // Use the top-level Request ID
                    customerName: req.requesterInfo.name,
                    customerPhone: req.requesterInfo.phone,
                    createdAt: req.createdAt,
                    // Ensure status exists
                    status: leadPayload.status || 'new', 
                };
            });
    }, [allRequests, currentUser]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'descending' });

    const sortedAndFilteredLeads = useMemo(() => {
        if (!partnerLeads) return [];
        let filteredLeads = [...partnerLeads];

        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filteredLeads = filteredLeads.filter(lead =>
                lead.customerName.toLowerCase().includes(lowercasedFilter) ||
                lead.serviceTitle.toLowerCase().includes(lowercasedFilter)
            );
        }

        if (statusFilter !== 'all') {
            filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
        }

        if (sortConfig !== null) {
            filteredLeads.sort((a, b) => {
                const aValue = a[sortConfig.key] || ''; // Provide fallback
                const bValue = b[sortConfig.key] || ''; // Provide fallback
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return filteredLeads;
    }, [partnerLeads, searchTerm, statusFilter, sortConfig]);

    const exportData = useMemo(() => (sortedAndFilteredLeads || []).map(lead => ({
        ...lead,
        status: t_dash.leadStatus[lead.status] || lead.status,
        createdAt: new Date(lead.createdAt).toLocaleDateString(language),
    })), [sortedAndFilteredLeads, t_dash.leadStatus, language]);

    const exportColumns = {
        customerName: t_dash.leadTable.customer,
        customerPhone: t_dash.leadTable.phone,
        serviceTitle: t_dash.leadTable.service,
        status: t_dash.leadTable.status,
        createdAt: t_dash.leadTable.date,
    };

    if (isError) {
        return <ErrorState onRetry={refetch} />;
    }

    const renderCard = (lead: Lead) => (
        <Card key={lead.id} className="p-0 hover:shadow-md transition-shadow duration-200">
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                     <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t_dash.leadTable.customer}</p>
                        <p className="font-bold text-gray-900 dark:text-white">{lead.customerName}</p>
                        <p className="text-sm text-gray-500 font-mono" dir="ltr">{lead.customerPhone}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                </div>
                 <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{t_dash.leadTable.service}</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{lead.serviceTitle}</p>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                     <p className="text-xs text-gray-400 text-right">{new Date(lead.createdAt).toLocaleDateString(language)}</p>
                </div>
            </CardContent>
            <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50">
                <Link to={`/dashboard/leads/${lead.id}`} className="w-full">
                    <Button variant="ghost" className="w-full">
                        View Details
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );

    const renderTable = (leads: Lead[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t_dash.leadTable.customer}</TableHead>
                        <TableHead>{t_dash.leadTable.service}</TableHead>
                        <TableHead>{t_dash.leadTable.date}</TableHead>
                        <TableHead>{t_dash.leadTable.status}</TableHead>
                        <TableHead>{t_dash.leadTable.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan={5} className="text-center p-8">Loading leads...</TableCell></TableRow>
                    ) : leads.map(lead => (
                        <TableRow key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <TableCell className="font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                <div>{lead.customerName}</div>
                                <div className="font-normal text-gray-500 dark:text-gray-400 text-xs" dir="ltr">{lead.customerPhone}</div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate" title={lead.serviceTitle}>{lead.serviceTitle}</TableCell>
                            <TableCell>{new Date(lead.createdAt).toLocaleDateString(language)}</TableCell>
                            <TableCell>
                                <StatusBadge status={lead.status} />
                            </TableCell>
                            <TableCell>
                                <Link to={`/dashboard/leads/${lead.id}`} className="font-medium text-amber-600 hover:text-amber-700 hover:underline">
                                    View Details
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
    
    const loadingSkeletons = (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
            <div className="hidden lg:block">
                <TableSkeleton cols={5} />
            </div>
        </>
    );

    const emptyState = (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">{t_dash.leadTable.noLeads}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_dash.leadsTitle}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t_dash.leadsSubtitle}</p>
                </div>
                <ExportDropdown data={exportData} columns={exportColumns} filename="my-leads" />
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
                <Input type="text" placeholder={t_dash.filter.search} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-xs" />
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
                    <option value="all">{t_dash.filter.filterByStatus} ({t_dash.filter.all})</option>
                    {Object.entries(t_dash.leadStatus).map(([key, value]) => (<option key={key} value={key}>{value as string}</option>))}
                </Select>
            </div>
            
            {loading ? loadingSkeletons : (
                <ResponsiveList
                    items={sortedAndFilteredLeads}
                    renderCard={renderCard}
                    renderTable={renderTable}
                    emptyState={emptyState}
                />
            )}
        </div>
    );
};

export default DashboardLeadsPage;
