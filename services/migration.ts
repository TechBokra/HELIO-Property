
import { supabase } from '../lib/supabase';

/**
 * @deprecated
 * 
 * ----------------------------------------------------------------------------------
 * IMPORTANT NOTICE:
 * This migration service file is DEPRECATED and should NOT be used for data seeding.
 * 
 * We have switched to direct SQL execution via the Supabase SQL Editor for robustness,
 * data integrity, and speed.
 * 
 * Please use the SQL scripts provided in the project documentation or the admin panel
 * instructions to seed or reset the database.
 * ----------------------------------------------------------------------------------
 */

export const migrateDataToSupabase = async (onProgress: (msg: string) => void) => {
    console.warn("DEPRECATION WARNING: migrateDataToSupabase is deprecated and disabled. Please use the SQL Seed script.");
    onProgress("Migration service is disabled. Please check console for details.");
    return false;
};
