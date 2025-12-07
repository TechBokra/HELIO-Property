
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllTransactions, getFinanceStats, updateTransactionStatus } from '../../../services/finance';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import StatCard from '../../shared/StatCard';
import { BanknotesIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon, CalendarIcon } from '../../ui/Icons';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { Card, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Transaction, TransactionStatus } from '../../../types';
import TableSkeleton from '../../shared/TableSkeleton';
import Pagination from '../../shared/Pagination';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal';

const statusColors: Record<TransactionStatus, string> = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    reviewing: 'bg-purple-100 text-purple-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800'
};

const TransactionDetailsModal: React.FC<{ txn: Transaction; onClose: () => void }> = ({ txn, onClose }) => {
    const { language } = useLanguage();
    return (
        <Modal isOpen={true} onClose={onClose} aria-labelledby="txn-details-title">
            <ModalHeader id="txn-details-title" onClose={onClose}>
                {language === 'ar' ? 'تفاصيل المعاملة' : 'Transaction Details'}
            </ModalHeader>
            <ModalContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-sm text-gray-500 block">{language === 'ar' ? 'رقم المعاملة' : 'Transaction ID'}</span>
                        <span className="font-mono font-medium">{txn.id}</span>
                    </div>
                    <div>
                         <span className="text-sm text-gray-500 block">{language === 'ar' ? 'الرقم المرجعي' : 'Reference No'}</span>
                        <span className="font-mono font-medium">{txn.referenceNumber || '-'}</span>
                    </div>
                    <div>
                         <span className="text-sm text-gray-500 block">{language === 'ar' ? 'المبلغ' : 'Amount'}</span>
                        <span className="font-bold text-amber-600">{txn.amount.toLocaleString()} {txn.currency}</span>
                    </div>
                    <div>
                         <span className="text-sm text-gray-500 block">{language === 'ar' ? 'التاريخ' : 'Date'}</span>
                        <span className="">{new Date(txn.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                <div className="border-t pt-4 mt-4">
                     <span className="text-sm text-gray-500 block mb-1">{language === 'ar' ? 'الوصف' : 'Description'}</span>
                     <p className="text-sm bg-gray-50 p-2 rounded">{txn.description}</p>
                </div>
                {txn.receiptUrl && (
                    <div className="border-t pt-4 mt-4">
                        <span className="text-sm text-gray-500 block mb-2">{language === 'ar' ? 'صورة الإيصال' : 'Receipt Image'}</span>
                        <a href={txn.receiptUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={txn.receiptUrl} alt="Receipt" className="w-full max-h-60 object-contain border rounded bg-gray-100" />
                        </a>
                    </div>
                )}
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose}>{language === 'ar' ? 'إغلاق' : 'Close'}</Button>
            </ModalFooter>
        </Modal>
    );
};

const AdminFinancePage: React.FC = () => {
    const { language } = useLanguage();
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    const { data: stats } = useQuery({ queryKey: ['financeStats'], queryFn: getFinanceStats });
    const { data: transactions, isLoading } = useQuery({ queryKey: ['allTransactions'], queryFn: getAllTransactions });
    
    const [detailsTxn, setDetailsTxn] = useState<Transaction | null>(null);
    const [dateRange, setDateRange] = useState<{start: string, end: string}>({ start: '', end: '' });

    const updateMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: TransactionStatus }) => updateTransactionStatus(id, status),
        onSuccess: () => {
            showToast(language === 'ar' ? 'تم تحديث المعاملة' : 'Transaction updated', 'success');
            queryClient.invalidateQueries({ queryKey: ['allTransactions'] });
            queryClient.invalidateQueries({ queryKey: ['financeStats'] });
        }
    });

    const {
        paginatedItems,
        totalPages,
        currentPage,
        setCurrentPage,
        searchTerm,
        setSearchTerm,
        filters,
        setFilter,
    } = useAdminTable({
        data: transactions,
        itemsPerPage: 10,
        initialSort: { key: 'createdAt', direction: 'descending' },
        searchFn: (t: Transaction, term: string) => 
            t.id.toLowerCase().includes(term) || 
            t.userName.toLowerCase().includes(term) || 
            t.userId.toLowerCase().includes(term) || 
            (t.referenceNumber || '').toLowerCase().includes(term),
        filterFns: {
            status: (t, v) => t.status === v,
            method: (t, v) => t.method === v,
            dateRange: (t, _v) => {
                if (!dateRange.start && !dateRange.end) return true;
                const txnDate = new Date(t.createdAt);
                const start = dateRange.start ? new Date(dateRange.start) : new Date('2000-01-01');
                const end = dateRange.end ? new Date(dateRange.end) : new Date();
                end.setHours(23, 59, 59);
                return txnDate >= start && txnDate <= end;
            }
        }
    });
    
    // Trigger re-filter when dates change
    React.useEffect(() => {
        setFilter('dateRange', 'trigger');
    }, [dateRange, setFilter]);

    const renderTable = (items: Transaction[]) => (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{language === 'ar' ? 'المستخدم' : 'User'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الطريقة' : 'Method'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراء' : 'Action'}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.length > 0 ? items.map(txn => (
                        <TableRow key={txn.id}>
                            <TableCell className="font-medium">
                                <div>{txn.userName}</div>
                                <div className="text-xs text-gray-500">{txn.userId}</div>
                                <div className="text-[10px] text-gray-400 font-mono mt-1">{txn.id}</div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate cursor-pointer hover:text-amber-600" title={txn.description} onClick={() => setDetailsTxn(txn)}>
                                {txn.description}
                            </TableCell>
                            <TableCell className="font-bold">{txn.amount.toLocaleString()} {txn.currency}</TableCell>
                            <TableCell className="capitalize">{txn.method}</TableCell>
                            <TableCell className="text-xs">{new Date(txn.createdAt).toLocaleDateString(language)}</TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[txn.status]}`}>
                                    {txn.status}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex gap-2 items-center">
                                     <Button size="sm" variant="ghost" onClick={() => setDetailsTxn(txn)}>
                                        {language === 'ar' ? 'تفاصيل' : 'Details'}
                                    </Button>
                                    {txn.status === 'reviewing' && (
                                        <>
                                            <Button size="sm" variant="success" onClick={() => updateMutation.mutate({ id: txn.id, status: 'paid' })} className="px-2 py-1 h-auto text-xs">
                                                ✓
                                            </Button>
                                            <Button size="sm" variant="danger" onClick={() => updateMutation.mutate({ id: txn.id, status: 'failed' })} className="px-2 py-1 h-auto text-xs">
                                                ✕
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                         <TableRow>
                            <TableCell colSpan={7} className="text-center p-8 text-gray-500">
                                {language === 'ar' ? 'لا توجد معاملات.' : 'No transactions found.'}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (txn: Transaction) => (
        <Card key={txn.id}>
            <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{txn.userName}</h3>
                        <p className="text-[10px] text-gray-400 font-mono">{txn.id}</p>
                        <p className="text-xs text-gray-500 mt-1">{txn.type}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[txn.status]}`}>{txn.status}</span>
                </div>
                <p className="text-sm truncate" onClick={() => setDetailsTxn(txn)}>{txn.description}</p>
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                     <span className="font-bold text-lg text-amber-600">{txn.amount.toLocaleString()} {txn.currency}</span>
                     <span className="text-xs text-gray-400">{new Date(txn.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 capitalize">Via {txn.method}</span>
                    <Button size="sm" variant="ghost" onClick={() => setDetailsTxn(txn)}>
                        {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </Button>
                </div>
                 {txn.status === 'reviewing' && (
                     <div className="flex gap-2 mt-2 w-full">
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => updateMutation.mutate({ id: txn.id, status: 'paid' })}>
                            {language === 'ar' ? 'قبول' : 'Approve'}
                        </Button>
                        <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white" onClick={() => updateMutation.mutate({ id: txn.id, status: 'failed' })}>
                            {language === 'ar' ? 'رفض' : 'Reject'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8 animate-fadeIn">
            {detailsTxn && <TransactionDetailsModal txn={detailsTxn} onClose={() => setDetailsTxn(null)} />}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{language === 'ar' ? 'المركز المالي' : 'Financial Center'}</h1>
                <p className="text-gray-500">Overview of all revenue and pending transactions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'} value={`${stats?.totalRevenue.toLocaleString() || 0} EGP`} icon={BanknotesIcon} linkTo="#" />
                <StatCard title={language === 'ar' ? 'مبالغ معلقة' : 'Pending Amount'} value={`${stats?.pendingAmount.toLocaleString() || 0} EGP`} icon={ClockIcon} linkTo="#" />
                <StatCard title={language === 'ar' ? 'عمليات ناجحة' : 'Successful Txns'} value={stats?.successfulTransactions || 0} icon={CheckCircleIcon} linkTo="#" />
                <StatCard title={language === 'ar' ? 'يحتاج مراجعة' : 'Needs Action'} value={stats?.pendingReviews || 0} icon={ExclamationCircleIcon} linkTo="#" />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-end md:items-center">
                <Input 
                    placeholder={language === 'ar' ? 'بحث برقم المعاملة (ID)، الاسم أو المرجع...' : 'Search by ID, Name or Ref...'} 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="w-full md:max-w-xs"
                />
                 <div className="flex items-center gap-2 w-full md:w-auto">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <Input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full md:w-40" />
                    <span className="text-gray-400">-</span>
                    <Input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full md:w-40" />
                </div>
                <Select value={filters.status || 'all'} onChange={e => setFilter('status', e.target.value)} className="w-full md:w-40">
                    <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                    <option value="paid">Paid</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </Select>
            </div>

            <div>
                <h2 className="text-xl font-bold mb-4">{language === 'ar' ? 'أحدث المعاملات' : 'Recent Transactions'}</h2>
                {isLoading ? <TableSkeleton cols={7} /> : (
                    <ResponsiveList 
                        items={paginatedItems}
                        renderTable={renderTable}
                        renderCard={renderCard}
                        emptyState={<div className="text-center py-10 text-gray-500">{language === 'ar' ? 'لا توجد معاملات.' : 'No transactions found.'}</div>}
                    />
                )}
                 <div className="mt-4">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
            </div>
        </div>
    );
};

export default AdminFinancePage;
