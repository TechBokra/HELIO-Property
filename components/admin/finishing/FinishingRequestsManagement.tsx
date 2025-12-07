
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads, deleteLead as apiDeleteLead } from '../../../services/leads';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import { Lead } from '../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import Pagination from '../../shared/Pagination';
import { Button } from '../../ui/Button';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { useToast } from '../../shared/ToastContext';
import { StatusBadge } from '../../ui/StatusBadge';

const ITEMS_PER_PAGE = 10;

const FinishingRequestsManagement: React.FC = () => {
    const { language, t } = useLanguage();
    const t_dash = t.dashboard;
    const t_page = t.adminDashboard.finishingManagement;
    const { showToast } = useToast();

    const { data: allLeads, isLoading, refetch } = useQuery({ 
        queryKey: ['allLeadsAdmin'], 
        queryFn: getAllLeads 
    });

    const platformFinishingLeads = useMemo(() => {
        return (allLeads || []).filter(l => 
            l.serviceType === 'finishing' && 
            (
                l.partnerId === 'admin-user' || 
                l.assignedTo === 'admin-user' || 
                l.assignedTo === 'platform-finishing-manager-1' ||
                l.managerId === 'platform-finishing-manager-1'
            )
        );
    }, [allLeads]);

    const { paginatedItems, totalPages, currentPage, setCurrentPage } = useAdminTable({
        data: platformFinishingLeads,
        itemsPerPage: ITEMS_PER_PAGE,
        initialSort: { key: 'createdAt', direction: 'descending' },
        searchFn: (item: Lead, term) => item.customerName.toLowerCase().includes(term),
        filterFns: {},
    });

    const handleDelete = async (id: string) => {
        if (window.confirm(t.adminShared.confirmDelete)) {
            await apiDeleteLead(id);
            showToast('Request deleted successfully', 'success');
            refetch();
        }
    };

    const renderTable = (items: Lead[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden animate-fadeIn">
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
                    {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center p-8">Loading requests...</TableCell></TableRow>
                    ) : items.length > 0 ? (
                        items.map(lead => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium">
                                    {lead.customerName}
                                    <div className="text-xs text-gray-500" dir="ltr">{lead.customerPhone}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="max-w-xs truncate" title={lead.serviceTitle}>
                                        {lead.serviceTitle}
                                    </div>
                                </TableCell>
                                <TableCell>{new Date(lead.createdAt).toLocaleDateString(language)}</TableCell>
                                <TableCell>
                                    <StatusBadge status={lead.status} />
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Link to={`/admin/platform-finishing/requests/${lead.id}`}>
                                            <Button variant="link" size="sm">View Details</Button>
                                        </Link>
                                        <Button variant="link" size="sm" className="text-red-500" onClick={() => handleDelete(lead.id)}>{t.adminShared.delete}</Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={5} className="text-center p-8 text-gray-500">{t_page.noPlatformRequests}</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (lead: Lead) => (
        <Card key={lead.id}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{lead.customerName}</h3>
                        <p className="text-sm text-gray-500" dir="ltr">{lead.customerPhone}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{lead.serviceTitle}</p>
                <p className="text-xs text-gray-400 text-right">{new Date(lead.createdAt).toLocaleDateString(language)}</p>
            </CardContent>
            <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)} className="text-red-500">{t.adminShared.delete}</Button>
                <Link to={`/admin/platform-finishing/requests/${lead.id}`} className="w-full">
                    <Button variant="ghost" className="w-full">View Details</Button>
                </Link>
            </CardFooter>
        </Card>
    );

    return (
        <div className="animate-fadeIn">
            <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t_dash.leadsTitle}</h2>
                <div className="text-sm text-gray-500">
                    Showing only Platform requests
                </div>
            </div>
            <ResponsiveList
                items={paginatedItems}
                renderTable={renderTable}
                renderCard={renderCard}
                emptyState={<div className="text-center p-8 text-gray-500">{t_page.noPlatformRequests}</div>}
            />
            <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default FinishingRequestsManagement;
