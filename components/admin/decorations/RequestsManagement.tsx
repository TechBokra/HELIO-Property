
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Lead, LeadStatus } from '../../../types';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads, deleteLead as apiDeleteLead } from '../../../services/leads';
import { inputClasses } from '../../ui/FormField';
import Pagination from '../../shared/Pagination';
import { useLanguage } from '../../shared/LanguageContext';
import { useAdminTable } from '../../hooks/useAdminTable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../ui/StatusBadge';

const ITEMS_PER_PAGE = 10;

const RequestsManagement: React.FC = () => {
    const { language, t: i18n } = useLanguage();
    const t = i18n.adminDashboard.decorationsManagement;
    const { data: allLeads, refetch: refetchLeads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });
    const loading = loadingLeads;

    const decorationLeads = useMemo(() => (allLeads || []).filter(lead => lead.serviceType === 'decorations'), [allLeads]);

    const {
        paginatedItems, totalPages, currentPage, setCurrentPage,
        setFilter, requestSort, getSortIcon
    } = useAdminTable({
        data: decorationLeads,
        itemsPerPage: ITEMS_PER_PAGE,
        initialSort: { key: 'createdAt', direction: 'descending' },
        searchFn: () => true, // No search on this page currently
        filterFns: {
            startDate: (l: Lead, v: string) => new Date(l.createdAt) >= new Date(v),
            endDate: (l: Lead, v: string) => new Date(l.createdAt) <= new Date(v),
        }
    });

    const handleDelete = async (itemId: string) => {
        if (window.confirm(t.confirmDelete)) {
            await apiDeleteLead(itemId);
            refetchLeads();
        }
    };
    
    const getRequestNature = (lead: Lead) => {
        if (lead.serviceTitle.includes(i18n.customDecorationRequestModal.serviceTitle)) {
             return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">Custom Design</span>;
        }
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Product Inquiry</span>;
    };

    const renderTable = (items: Lead[]) => (
        <div className="bg-white dark:bg-gray-800/50 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                       <TableRow>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('customerName')}>Customer{getSortIcon('customerName')}</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('serviceTitle')}>Subject{getSortIcon('serviceTitle')}</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('createdAt')}>Date{getSortIcon('createdAt')}</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => requestSort('status')}>Status{getSortIcon('status')}</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center p-8">Loading...</TableCell></TableRow>
                        ) : items.length > 0 ? (
                            items.map(lead => (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium text-gray-900 dark:text-white">{lead.customerName}<br/><span className="font-normal text-gray-500 text-xs">{lead.customerPhone}</span></TableCell>
                                    <TableCell>{getRequestNature(lead)}</TableCell>
                                    <TableCell className="max-w-xs truncate" title={lead.serviceTitle}>{lead.serviceTitle}</TableCell>
                                    <TableCell>{new Date(lead.createdAt).toLocaleDateString(language)}</TableCell>
                                    <TableCell><StatusBadge status={lead.status} /></TableCell>
                                    <TableCell className="space-x-4">
                                        <Link to={`/admin/platform-decorations/requests/${lead.id}`} className="font-medium text-amber-600 hover:underline">View</Link>
                                        <button onClick={() => handleDelete(lead.id)} className="font-medium text-red-600 hover:underline">{i18n.adminShared.delete}</button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={6} className="text-center p-8 text-gray-500">{t.noRequests || "No requests found."}</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );

    const renderCard = (lead: Lead) => (
        <Card key={lead.id}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{lead.customerName}</h3>
                        <p className="text-sm text-gray-500">{lead.customerPhone}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                </div>
                <div className="flex justify-between items-center">
                     {getRequestNature(lead)}
                     <p className="text-xs text-gray-400">{new Date(lead.createdAt).toLocaleDateString(language)}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 bg-gray-50 p-2 rounded">{lead.serviceTitle}</p>
            </CardContent>
            <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(lead.id)}>
                    {i18n.adminShared.delete}
                </Button>
                <Link to={`/admin/platform-decorations/requests/${lead.id}`}>
                    <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50">View</Button>
                </Link>
            </CardFooter>
        </Card>
    );
    
    return (
        <div className="animate-fadeIn">
             <div className="mb-4 flex gap-4 flex-wrap">
                <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">{i18n.adminDashboard.filter.leadDateRange} (Start)</label>
                    <input type="date" onChange={e => setFilter('startDate', e.target.value)} className={inputClasses}/>
                </div>
                 <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">{i18n.adminDashboard.filter.leadDateRange} (End)</label>
                    <input type="date" onChange={e => setFilter('endDate', e.target.value)} className={inputClasses}/>
                </div>
            </div>

            <ResponsiveList
                items={paginatedItems}
                renderTable={renderTable}
                renderCard={renderCard}
                emptyState={<div className="text-center p-8">{t.noRequests}</div>}
            />

            <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default RequestsManagement;
