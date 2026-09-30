
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

    if (error) {
        console.error('Error fetching transactions from Supabase:', error);
        throw new Error(`Failed to load transactions: ${error.message}`);
    }
    return (data || []).map(mapTransactionFromDb);
};

export const getTransactionsByUserId = async (userId: string): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user transactions from Supabase:', error);
        throw new Error(`Failed to load user transactions: ${error.message}`);
    }
    return (data || []).map(mapTransactionFromDb);
};

export const getFinanceStats = async (): Promise<FinanceStats> => {
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
    const isValidUUID = (id?: string) => !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    const dbPayload: any = {
        user_id: isValidUUID(data.userId) ? data.userId : null,
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

    if (error || !newTxn) {
        console.error('Error creating transaction in Supabase:', error);
        throw new Error(`Failed to create transaction: ${error?.message || 'Unknown database error'}`);
    }

    const transaction = mapTransactionFromDb(newTxn);

    // Notify Admin if review needed
    if (transaction.status === 'reviewing') {
        const SUPER_ADMIN_DEFAULT_ID = '3e554896-eee8-4545-9c7f-0a79a4c1a9f1';
        try {
            await addNotification({
                userId: SUPER_ADMIN_DEFAULT_ID,
                message: {
                    ar: `إيصال دفع جديد للمراجعة من ${data.userName}`,
                    en: `New payment receipt for review from ${data.userName}`,
                },
                link: '/admin/finance',
            });
        } catch {
            // Non-blocking notification
        }
    }

    return transaction;
};

export const updateTransactionStatus = async (id: string, status: TransactionStatus): Promise<Transaction> => {
    const { data, error } = await supabase
        .from('transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error || !data) {
        console.error('Failed to update transaction status in Supabase:', error);
        throw new Error(`Failed to update transaction: ${error?.message || 'Unknown database error'}`);
    }

    const txn = mapTransactionFromDb(data);
    
    // Notify User
    if (txn && txn.userId) {
        try {
            await addNotification({
                userId: txn.userId,
                message: {
                    ar: `تم تحديث حالة الدفع الخاصة بك إلى: ${status}`,
                    en: `Your payment status has been updated to: ${status}`,
                },
                link: '/dashboard/finance',
            });
        } catch {
            // Non-blocking notification
        }
    }

    return txn;
};
