
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Role, Permission } from '../../types';
import type { Language, Partner } from '../../types';
import { getPartnerByEmail } from '../../services/partners';
import { Input } from '../ui/Input';
import { SiteIdentity } from '../shared/SiteIdentity';
import { partnersData } from '../../data/partners';
import { rolePermissions } from '../../data/permissions';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';

const LoginPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_auth = t.auth;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState<string | boolean>(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLoginAndRedirect = async (emailToLogin: string) => {
        const user = await login(emailToLogin, 'password');

        if (user) {
            const permissions = rolePermissions.get(user.role) || [];
            const isAdmin = permissions.includes(Permission.VIEW_ADMIN_DASHBOARD);

            if (isAdmin) {
                navigate('/admin', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } else {
            setError(t_auth.loginError);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        await handleLoginAndRedirect(email);
        setLoading(false);
    };

    const handleQuickLogin = async (emailToLogin: string) => {
        setError('');
        setLoading(emailToLogin);
        await handleLoginAndRedirect(emailToLogin);
        setLoading(false);
    };

    const quickLoginUsers = useMemo(() => {
        const quickLoginEmails = [
            // Internal Roles
            'admin@onlyhelio.com',
            'decor@onlyhelio.com',
            'fin-platform@onlyhelio.com',
            'fin-market@onlyhelio.com',
            're-platform@onlyhelio.com',
            're-market@onlyhelio.com',
            'partners@onlyhelio.com',
            'content@onlyhelio.com',
            // External Partners (Demo Accounts)
            'dev1@onlyhelio.com',      // Developer (United Development)
            'fin1@onlyhelio.com',      // Finishing (El Mottaheda)
            'agency1@onlyhelio.com',   // Agency (Future Real Estate)
        ];

        return quickLoginEmails
            .map(email => {
                const partner = partnersData.find(p => p.email === email);
                if (!partner) return null;
                
                // Use translation if available, otherwise fallback to ID
                // @ts-ignore
                const localizedName = t.partnerInfo[partner.id]?.name || partner.id;
                
                return {
                    name: localizedName,
                    email: partner.email,
                };
            })
            .filter(Boolean) as { name: string; email: string }[];
    }, [language, t]);


    return (
        <div className="py-20 bg-white flex items-center justify-center">
            <div className="w-full max-w-lg p-8 space-y-8 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-center">
                    <Link to="/" className="inline-block mb-4">
                        <SiteIdentity className="justify-center text-amber-500" textClassName="text-2xl" hideTextOnMobile={false} />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-800">{t_auth.loginTitle}</h1>
                    <p className="mt-2 text-gray-600">{t_auth.loginSubtitle}</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">{t_auth.email}</label>
                            <Input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder={t_auth.email}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={!!loading}
                            />
                        </div>
                        <div className="pt-4">
                            <label htmlFor="password" className="sr-only">{t_auth.password}</label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder={t_auth.password}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!!loading}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                    <div>
                        <Button type="submit" isLoading={loading === true} className="w-full" size="lg">
                           {t_auth.loginButton}
                        </Button>
                    </div>
                    
                    <div className="text-center mt-4">
                         <Link to="/register" className="text-sm font-medium text-amber-600 hover:text-amber-500 transition-colors">
                            {t.joinAsPartner}
                        </Link>
                    </div>
                </form>

                {/* Quick Login Section for Demo/Testing Purposes */}
                <div className="border-t border-gray-200 pt-6">
                    <p className="text-center text-sm font-medium text-gray-600 mb-4">
                        {language === 'ar' ? 'للتجربة: تسجيل دخول سريع' : 'For Demo: Quick Logins'}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                        {quickLoginUsers.map(user => (
                            <Button
                                key={user.email}
                                variant="secondary"
                                size="sm"
                                onClick={() => handleQuickLogin(user.email)}
                                isLoading={loading === user.email}
                                className="w-full text-xs h-auto py-2 whitespace-normal leading-tight"
                            >
                                {user.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
