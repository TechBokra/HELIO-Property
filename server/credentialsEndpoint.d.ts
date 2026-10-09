export interface CredentialsRequestBody {
    action: 'send_password_reset' | 'reset_password';
    targetUserId?: string;
    targetUserEmail?: string;
    newPassword?: string;
}
export interface EndpointResult {
    status: number;
    body: {
        success?: boolean;
        message?: string;
        error?: string;
    };
}
export declare function handleAdminCredentialsRequest(authHeader: string | undefined, rawBody: any, env: {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
    supabaseServiceKey?: string;
}): Promise<EndpointResult>;
