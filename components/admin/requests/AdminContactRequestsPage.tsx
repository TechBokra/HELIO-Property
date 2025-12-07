
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAllContactRequests,
    updateContactRequestStatus,
    deleteContactRequest,
} from '../../../services/contactRequests';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import Pagination from '../../shared/Pagination';
import type { ContactRequest, RequestStatus } from '../../../types';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent, CardFooter } from '../../ui/Card';
import { statusConfig, StatusType } from '../../ui/StatusBadge';

const AdminContactRequestsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_admin = t.adminDashboard.adminRequests;
    const queryClient = useQueryClient();
    const [requestToDelete, setRequestToDelete] = React.useState<string | null>(null);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['contactRequests'],
        queryFn: getAllContactRequests,
    });

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: RequestStatus }) => updateContactRequestStatus(id, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteContactRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contactRequests'] });
            setRequestToDelete(null);
        },
    });

    const { paginatedItems, totalPages, currentPage, setCurrentPage } = useAdminTable({
        data: requests,
        itemsPerPage: 10,
        initialSort: { key: 'createdAt', direction: 'descending' },
        searchFn: (item: ContactRequest, term: string) => item.name.toLowerCase().includes(term) || item.phone.includes(term),
        filterFns: {},
    });

    const renderTable = (items: ContactRequest[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t_admin.table.requester}</TableHead>
                        <TableHead>{t_admin.table.message}</TableHead>
                        <TableHead>{t_admin.table.date}</TableHead>
                        <TableHead>{t_admin.table.status}</TableHead>
                        <TableHead>{t_admin.table.actions}</TableHead>
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
                                    <div className="font-medium text-gray-900 dark:text-white">{req.name}</div>
                                    <div className="text-sm text-gray-500">{req.phone}</div>
                                </TableCell>
                                <TableCell className="max-w-sm truncate" title={req.message}>
                                    {req.message}
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
                                        {Object.entries(t_admin.requestStatus).map(([key, value]) => (
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
                                        {t_admin.table.delete}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center p-8">
                                {t_admin.noContactRequests}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (req: ContactRequest) => (
        <Card key={req.id}>
            <CardContent className="p-4 space-y-3">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{req.name}</h3>
                        <p className="text-sm text-gray-500">{req.phone}</p>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString(language)}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 bg-gray-50 dark:bg-gray-800 p-2 rounded">{req.message}</p>
            </CardContent>
            <CardFooter className="p-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <Select
                    value={req.status}
                    onChange={(e) =>
                        mutation.mutate({ id: req.id, status: e.target.value as RequestStatus })
                    }
                    className={`text-xs font-medium w-32 h-8 py-1 ${statusConfig[req.status as StatusType]}`}
                >
                    {Object.entries(t_admin.requestStatus).map(([key, value]) => (
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
                    {t_admin.table.delete}
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
                    message={t_admin.confirmDelete}
                />
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_admin.contactRequestsTitle}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_admin.contactRequestsSubtitle}</p>

            <ResponsiveList
                items={paginatedItems}
                renderTable={renderTable}
                renderCard={renderCard}
                emptyState={<div className="text-center p-8 text-gray-500">{t_admin.noContactRequests}</div>}
            />

            <div className="mt-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default AdminContactRequestsPage;
