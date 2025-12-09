
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Role } from '../../types';
import { Input } from '../ui/Input';
import { SiteIdentity } from '../shared/SiteIdentity';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { LockClosedIcon, EnvelopeIcon, ExclamationCircleIcon } from '../ui/Icons';

const LoginPage: React.FC = () => {
    const { t, language } = useLanguage();
    const t_auth = t.auth;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const savedEmail = localStorage.getItem('onlyhelio-remember-email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const user = await login(email, password);

            if (user) {
                if (rememberMe) {
                    localStorage.setItem('onlyhelio-remember-email', email);
                } else {
                    localStorage.removeItem('onlyhelio-remember-email');
                }

                if (user.role === Role.SUPER_ADMIN || 
                    user.role.includes('manager')) {
                    navigate('/admin', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            }
        } catch (err: any) {
             console.error("Login error:", err);
             const msg = err.message || '';
             
             if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
                 setError(language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
             } else if (msg.includes('Email not confirmed')) {
                 setError(language === 'ar' 
                    ? 'البريد الإلكتروني غير مفعل. يرجى مراجعة بريدك أو التواصل مع الإدارة.' 
                    : 'Email not confirmed. Please check your inbox or contact support.');
             } else {
                 setError(language === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : (msg || t_auth.loginError));
             }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="py-20 bg-gray-50 dark:bg-gray-900 min-h-[calc(100vh-80px)] flex flex-col justify-center sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <SiteIdentity className="text-amber-500" textClassName="text-3xl font-bold" hideTextOnMobile={false} />
                </div>
                <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {t_auth.loginTitle}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {t_auth.loginSubtitle}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t_auth.email}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <EnvelopeIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="pl-10"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t_auth.password}
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <LockClosedIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="pl-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                                />
                                <label htmlFor="remember-me" className={`ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer ${language === 'ar' ? 'mr-2 ml-0' : 'ml-2'}`}>
                                    {language === 'ar' ? 'تذكرني' : 'Remember me'}
                                </label>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-fadeIn">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className={`ml-3 ${language === 'ar' ? 'mr-3 ml-0' : 'ml-3'}`}>
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <Button type="submit" isLoading={loading} className="w-full flex justify-center" size="lg">
                               {t_auth.loginButton}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
