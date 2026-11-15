import { supabase } from '../lib/supabase';
import { Permission, Role } from '../types';
import type { Transaction, TransactionStatus, PaymentMethod, FinanceStats } from '../types';
import { addNotification } from './notifications';
import { requireAnyPermission } from './authGuard';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_METHODS: PaymentMethod[] = ['instapay', 'card', 'wallet'];
const VALID_STATUSES: TransactionStatus[] = ['paid', 'pending', 'failed', 'refunded', 'reviewing'];

const isValidUUID = (id?: string | null): boolean => !!id && UUID_REGEX.test(id);

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

const resolveFinanceAdminRecipientId = async (dbClient: any = supabase): Promise<string | null> => {
    try {
        const { data, error } = await dbClient
            .from('partners')
            .select('id')
            .eq('status', 'active')
            .eq('role', Role.SUPER_ADMIN)
            .limit(1);

        if (!error && Array.isArray(data) && data.length > 0 && data[0]?.id) {
            return data[0].id;
        }
        return null;
    } catch {
        return null;
    }
};

export const getAllTransactions = async (dbClient: any = supabase): Promise<Transaction[]> => {
    requireAnyPermission([Permission.VIEW_FINANCE, Permission.MANAGE_FINANCE]);

    const { data, error } = await dbClient
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching transactions from Supabase:', error);
        throw new Error(`Failed to load transactions: ${error.message}`);
    }
    return (data || []).map(mapTransactionFromDb);
};

export const getTransactionsByUserId = async (userId: string, dbClient: any = supabase): Promise<Transaction[]> => {
    if (!userId || !isValidUUID(userId)) {
        return [];
    }

    const { data, error } = await dbClient
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

export const getFinanceStats = async (dbClient: any = supabase): Promise<FinanceStats> => {
    const transactions = await getAllTransactions(dbClient);

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

export const createTransaction = async (
    data: Omit<Transaction, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
    options: { client?: any } = {}
): Promise<Transaction> => {
    const dbClient = options.client || supabase;
    const numericAmount = Number(data.amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Transaction amount must be a positive number.');
    }

    if (!data.method || !VALID_METHODS.includes(data.method)) {
        throw new Error('Unsupported payment method.');
    }

    if (data.method === 'instapay' && !data.receiptUrl) {
        throw new Error('InstaPay transfers require a receipt upload.');
    }

    // Derive authoritative authenticated user ID from active session when present
    let authoritativeUserId: string | null = isValidUUID(data.userId) ? data.userId : null;
    try {
        const { data: sessionRes } = await dbClient.auth.getSession();
        if (sessionRes?.session?.user?.id) {
            authoritativeUserId = sessionRes.session.user.id;
        }
    } catch {
        // Unauthenticated public submission falls back to validated UUID or null
    }

    // Never self-approve client card payments without verified server/gateway webhook confirmation
    const initialStatus: TransactionStatus = data.method === 'instapay' ? 'reviewing' : 'pending';

    const dbPayload: any = {
        user_id: authoritativeUserId,
        user_name: (data.userName || 'Guest').trim(),
        amount: numericAmount,
        currency: data.currency || 'EGP',
        type: data.type,
        description: data.description,
        method: data.method,
        status: initialStatus,
        reference_number: data.referenceNumber,
        receipt_url: data.receiptUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: newTxn, error } = await dbClient
        .from('transactions')
        .insert(dbPayload)
        .select()
        .single();

    if (error || !newTxn) {
        console.error('Error creating transaction in Supabase:', error);
        throw new Error(`Failed to create transaction: ${error?.message || 'Unknown database error'}`);
    }

    const transaction = mapTransactionFromDb(newTxn);

    // Notify dynamically resolved active Super Admin if review/confirmation is needed
    if (transaction.status === 'reviewing' || transaction.status === 'pending') {
        try {
            const adminRecipientId = await resolveFinanceAdminRecipientId(dbClient);
            if (adminRecipientId) {
                await addNotification({
                    userId: adminRecipientId,
                    message: {
                        ar: `معاملة مالية جديدة (${transaction.status}) للمراجعة من ${dbPayload.user_name}`,
                        en: `New payment transaction (${transaction.status}) for review from ${dbPayload.user_name}`,
                    },
                    link: '/admin/finance',
                });
            }
        } catch {
            // Non-blocking notification
        }
    }

    return transaction;
};

export const updateTransactionStatus = async (
    id: string,
    status: TransactionStatus,
    options: { client?: any } = {}
): Promise<Transaction> => {
    requireAnyPermission([Permission.MANAGE_FINANCE, Permission.VIEW_FINANCE]);

    if (!id) {
        throw new Error('Transaction ID is required.');
    }

    if (!VALID_STATUSES.includes(status)) {
        throw new Error(`Invalid transaction status: ${status}`);
    }

    const dbClient = options.client || supabase;
    const { data, error } = await dbClient
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
