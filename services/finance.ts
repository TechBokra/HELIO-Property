
import { supabase } from '../lib/supabase';
import type { Transaction, TransactionStatus, FinanceStats } from '../types';
import { addNotification } from './notifications';

const mapTransactionFromDb = (row: any): Transaction => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    amount: Number(row.amount),
    currency: row.currency,
    type: row.type,
    description: row.description,
    method: row.method,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    referenceNumber: row.reference_number,
    receiptUrl: row.receipt_url,
});

export const getAllTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapTransactionFromDb);
};

export const getTransactionsByUserId = async (userId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(mapTransactionFromDb);
};

export const getFinanceStats = async (): Promise<FinanceStats> => {
    // In a real app, use database aggregation functions (SUM, COUNT)
    const transactions = await getAllTransactions();
    
    return transactions.reduce((acc, curr) => {
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
};

export const createTransaction = async (data: Omit<Transaction, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
    const dbPayload = {
        id: `txn-${Date.now()}`,
        user_id: data.userId,
        user_name: data.userName,
        amount: data.amount,
        currency: data.currency || 'EGP',
        type: data.type,
        description: data.description,
        method: data.method,
        status: data.method === 'card' ? 'paid' : 'reviewing',
        reference_number: data.referenceNumber,
        receipt_url: data.receiptUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: newTxn, error } = await supabase
        .from('transactions')
        .insert(dbPayload)
        .select()
        .single();

    if (error) throw error;
    const transaction = mapTransactionFromDb(newTxn);

    // Notify Admin if review needed
    if (transaction.status === 'reviewing') {
        await addNotification({
            userId: 'admin-user',
            message: {
                ar: `إيصال دفع جديد للمراجعة من ${data.userName}`,
                en: `New payment receipt for review from ${data.userName}`,
            },
            link: '/admin/finance',
        });
    }

    return transaction;
};

export const updateTransactionStatus = async (id: string, status: TransactionStatus): Promise<Transaction | undefined> => {
    const { data, error } = await supabase
        .from('transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) return undefined;
    const txn = mapTransactionFromDb(data);
    
    // Notify User
    await addNotification({
        userId: txn.userId,
        message: {
            ar: `تم تحديث حالة الدفع الخاصة بك إلى: ${status}`,
            en: `Your payment status has been updated to: ${status}`,
        },
        link: '/dashboard/finance',
    });

    return txn;
};
