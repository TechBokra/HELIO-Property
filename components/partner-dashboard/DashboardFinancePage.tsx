
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTransactionsByUserId } from '../../services/finance';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../shared/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { BanknotesIcon, ClockIcon, CheckCircleIcon } from '../ui/Icons';
import StatCard from '../shared/StatCard';

const DashboardFinancePage: React.FC = () => {
    const { currentUser } = useAuth();
    const { language } = useLanguage();
    
    const { data: transactions, isLoading } = useQuery({
        queryKey: ['userTransactions', currentUser?.id],
        queryFn: () => getTransactionsByUserId(currentUser!.id),
        enabled: !!currentUser
    });

    if (isLoading) return <div className="p-8 text-center">Loading financials...</div>;

    const stats = (transactions || []).reduce((acc, curr) => {
        if (curr.status === 'paid') acc.totalSpent += curr.amount;
        if (curr.status === 'reviewing') acc.pendingReview += curr.amount;
        return acc;
    }, { totalSpent: 0, pendingReview: 0 });

    return (
        <div className="space-y-8 animate-fadeIn">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {language === 'ar' ? 'المالية والاشتراكات' : 'Financials & Subscriptions'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    {language === 'ar' ? 'تتبع مدفوعاتك واشتراكاتك.' : 'Track your payments and subscriptions.'}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard 
                    title={language === 'ar' ? 'إجمالي المدفوعات' : 'Total Paid'} 
                    value={`${stats.totalSpent.toLocaleString()} EGP`} 
                    icon={CheckCircleIcon} 
                    linkTo="#" 
                />
                <StatCard 
                    title={language === 'ar' ? 'قيد المراجعة' : 'Pending Review'} 
                    value={`${stats.pendingReview.toLocaleString()} EGP`} 
                    icon={ClockIcon} 
                    linkTo="#" 
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{language === 'ar' ? 'سجل المعاملات' : 'Transaction History'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                                    <TableHead>{language === 'ar' ? 'الطريقة' : 'Method'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(transactions || []).length > 0 ? (transactions || []).map(txn => (
                                    <TableRow key={txn.id}>
                                        <TableCell>{new Date(txn.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>{txn.description}</TableCell>
                                        <TableCell className="font-bold">{txn.amount.toLocaleString()} {txn.currency}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize
                                                ${txn.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                  txn.status === 'reviewing' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 
                                                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                {txn.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="capitalize">{txn.method}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center p-4 text-gray-500">
                                            {language === 'ar' ? 'لا توجد معاملات.' : 'No transactions found.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardFinancePage;
