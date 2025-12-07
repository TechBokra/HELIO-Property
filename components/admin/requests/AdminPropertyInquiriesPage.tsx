
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllPropertyInquiries,
    updatePropertyInquiryStatus,
    deletePropertyInquiry,
} from '../../../services/propertyInquiries';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import Pagination from '../../shared/Pagination';
import type { PropertyInquiryRequest, RequestStatus } from '../../../types';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { statusConfig, StatusType } from '../../ui/StatusBadge';

const AdminPropertyInquiriesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard;
    const t_requests = t_admin.adminRequests;
    const queryClient = useQueryClient();
    const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['propertyInquiries'],
        queryFn: getAllPropertyInquiries,
    });

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: RequestStatus }) => updatePropertyInquiryStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyInquiries'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePropertyInquiry,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['propertyInquiries'] });
            setRequestToDelete(null);
        },
    });

    const { paginatedItems, totalPages, currentPage, setCurrentPage } = useAdminTable({
        data: requests,
        itemsPerPage: 10,
        initialSort: { key: 'createdAt', direction: 'descending' },
        searchFn: (item: PropertyInquiryRequest, term: string) =>
            item.customerName.toLowerCase().includes(term) || item.customerPhone.includes(term),
        filterFns: {},
    });

    const renderTable = (items: PropertyInquiryRequest[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t_requests.table.requester}</TableHead>
                        <TableHead>{t_admin.propertyInquiries.table.details}</TableHead>
                        <TableHead>{t_requests.table.date}</TableHead>
                        <TableHead>{t_requests.table.status}</TableHead>
                        <TableHead>{t_requests.table.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center p-8">
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : items.length > 0 ? (
                        items.map((req) => (
                            <TableRow key={req.id}>
                                <TableCell>
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {req.customerName}
                                    </div>
                                    <div className="text-sm text-gray-500">{req.customerPhone}</div>
                                </TableCell>
                                <TableCell className="max-w-sm truncate" title={req.details}>
                                    {req.details}
                                </TableCell>
                                <TableCell>{new Date(req.createdAt).toLocaleDateString(language)}</TableCell>
                                <TableCell>
                                    <Select
                                        value={req.status}
                                        onChange={(e) =>
                                            mutation.mutate({ id: req.id, status: e.target.value as RequestStatus })
                                        }
                                        className={`text-xs font-medium w-32 ${statusConfig[req.status as StatusType]}`}
                                    >
                                        {Object.entries(t_requests.requestStatus).map(([key, value]) => (
                                            <option
                                                key={key}
                                                value={key}
                                                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            >
                                                {value as string}
                                            </option>
                                        ))}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="link"
                                        className="text-red-500"
                                        onClick={() => setRequestToDelete(req.id)}
                                    >
                                        {t_requests.table.delete}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center p-8">
                                {t_admin.propertyInquiries.noRequests}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (req: PropertyInquiryRequest) => (
        <Card key={req.id}>
             <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{req.customerName}</h3>
                        <p className="text-sm text-gray-500">{req.customerPhone}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString(language)}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-sm text-gray-700 dark:text-gray-300">
                    {req.details}
                </div>
            </CardContent>
            <CardFooter className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <Select
                    value={req.status}
                    onChange={(e) =>
                        mutation.mutate({ id: req.id, status: e.target.value as RequestStatus })
                    }
                    className={`text-xs font-medium w-32 h-8 py-1 ${statusConfig[req.status as StatusType]}`}
                >
                    {Object.entries(t_requests.requestStatus).map(([key, value]) => (
                        <option
                            key={key}
                            value={key}
                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                            {value as string}
                        </option>
                    ))}
                </Select>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => setRequestToDelete(req.id)}
                >
                    {t_requests.table.delete}
                </Button>
            </CardFooter>
        </Card>
    );

    return (
        <div>
            {requestToDelete && (
                <ConfirmationModal
                    isOpen={!!requestToDelete}
                    onClose={() => setRequestToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(requestToDelete)}
                    title={t.adminShared.delete}
                    message={t_requests.confirmDelete}
                />
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_admin.nav.propertyInquiries}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_admin.propertyInquiries.subtitle}</p>

            <ResponsiveList
                items={paginatedItems}
                renderTable={renderTable}
                renderCard={renderCard}
                emptyState={<div className="text-center p-8 text-gray-500">{t_admin.propertyInquiries.noRequests}</div>}
            />

            <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default AdminPropertyInquiriesPage;
