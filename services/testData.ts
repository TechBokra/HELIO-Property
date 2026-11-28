import { supabase } from '../lib/supabase';

export type TestDataGroup = 'test_accounts' | 'demo_staff_accounts' | 'content' | 'operations';

export interface TestDataSummaryRow {
    groupName: TestDataGroup;
    tableName: string;
    registered: number;
    existing: number;
}

export interface TestDataAccount {
    userId: string;
    email: string;
    name: string | null;
    role: string | null;
    groupName: TestDataGroup;
    lastSignInAt: string | null;
}

export const PURGE_CONFIRMATION_TEXT = 'DELETE TEST DATA';

export const getTestMode = async (): Promise<boolean> => {
    const { data, error } = await supabase.from('app_runtime_flags').select('value').eq('key', 'test_mode').maybeSingle();
    if (error) throw error;
    return data?.value === true;
};

export const setTestMode = async (enabled: boolean): Promise<boolean> => {
    const { data, error } = await supabase.rpc('set_test_mode', { p_enabled: enabled });
    if (error) throw error;
    return Boolean(data);
};

export const getTestDataSummary = async (): Promise<TestDataSummaryRow[]> => {
    const { data, error } = await supabase.rpc('test_data_summary');
    if (error) throw error;
    return (data || []).map((r: any) => ({
        groupName: r.group_name,
        tableName: r.table_name,
        registered: Number(r.registered) || 0,
        existing: Number(r.existing) || 0,
    }));
};

export const getTestDataAccounts = async (): Promise<TestDataAccount[]> => {
    const { data, error } = await supabase.rpc('test_data_accounts');
    if (error) throw error;
    return (data || []).map((r: any) => ({
        userId: r.user_id,
        email: r.email,
        name: r.name,
        role: r.role,
        groupName: r.group_name,
        lastSignInAt: r.last_sign_in_at,
    }));
};

export const markTestData = async (table: string, ids: string[], group?: TestDataGroup): Promise<number> => {
    const { data, error } = await supabase.rpc('mark_test_data', { p_table: table, p_ids: ids, p_group: group ?? null });
    if (error) throw error;
    return Number(data) || 0;
};

export const unmarkTestData = async (table: string, ids: string[]): Promise<number> => {
    const { data, error } = await supabase.rpc('unmark_test_data', { p_table: table, p_ids: ids });
    if (error) throw error;
    return Number(data) || 0;
};

export const purgeTestData = async (confirmation: string, groups?: TestDataGroup[]): Promise<Record<string, number>> => {
    const { data, error } = await supabase.rpc('purge_test_data', { p_confirm: confirmation, p_groups: groups ?? null });
    if (error) throw error;
    return (data || {}) as Record<string, number>;
};
