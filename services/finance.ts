
import { transactionsData as initialData } from '../data/finance';
import type { Transaction, TransactionStatus, FinanceStats } from '../types';
import { addNotification } from './notifications';

let transactionsData: Transaction[] = [...initialData];
const SIMULATED_DELAY = 300;

export const getAllTransactions = (): Promise<Transaction[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([...transactionsData].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }, SIMULATED_DELAY);
    });
};

export const getTransactionsByUserId = (userId: string): Promise<Transaction[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(transactionsData.filter(t => t.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }, SIMULATED_DELAY);
    });
};

export const getFinanceStats = (): Promise<FinanceStats> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const stats = transactionsData.reduce((acc, curr) => {
                if (curr.status === 'paid') {
                    acc.totalRevenue += curr.amount;
                    acc.successfulTransactions += 1;
                } else if (curr.status === 'reviewing' || curr.status === 'pending') {
                    acc.pendingAmount += curr.amount;
                }
                
                if (curr.status === 'reviewing') {
                    acc.pendingReviews += 1;
                }
                return acc;
            }, { totalRevenue: 0, pendingAmount: 0, successfulTransactions: 0, pendingReviews: 0 });
            resolve(stats);
        }, SIMULATED_DELAY);
    });
};

export const createTransaction = (data: Omit<Transaction, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const newTransaction: Transaction = {
                ...data,
                id: `txn-${Date.now()}`,
                status: data.method === 'card' ? 'paid' : 'reviewing', // Auto-approve simulated cards, review manual
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            
            transactionsData.unshift(newTransaction);

            // Notify Admin if review needed
            if (newTransaction.status === 'reviewing') {
                addNotification({
                    userId: 'admin-user', // Super Admin or Finance Manager
                    message: {
                        ar: `إيصال دفع جديد للمراجعة من ${data.userName}`,
                        en: `New payment receipt for review from ${data.userName}`,
                    },
                    link: '/admin/finance',
                });
            }

            resolve(newTransaction);
        }, SIMULATED_DELAY * 2); // Longer delay for payment simulation
    });
};

export const updateTransactionStatus = (id: string, status: TransactionStatus): Promise<Transaction | undefined> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const index = transactionsData.findIndex(t => t.id === id);
            if (index > -1) {
                transactionsData[index] = {
                    ...transactionsData[index],
                    status,
                    updatedAt: new Date().toISOString()
                };
                
                // Notify User
                addNotification({
                    userId: transactionsData[index].userId,
                    message: {
                        ar: `تم تحديث حالة الدفع الخاصة بك إلى: ${status}`,
                        en: `Your payment status has been updated to: ${status}`,
                    },
                    link: '/dashboard/finance', // Or finance page
                });

                resolve(transactionsData[index]);
            } else {
                resolve(undefined);
            }
        }, SIMULATED_DELAY);
    });
};
