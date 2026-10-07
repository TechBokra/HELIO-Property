import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Role, Partner } from '../../types';
import { Input } from '../ui/Input';
import { SiteIdentity } from '../shared/SiteIdentity';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { LockClosedIcon, EnvelopeIcon, ExclamationCircleIcon } from '../ui/Icons';

const LoginPage: React.FC = () => {
    const { t, language } = useLanguage();
    const t_auth = t.auth;
    const isAr = language === 'ar';

    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, registerCustomer } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const savedEmail = localStorage.getItem('onlyhelio-remember-email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const redirectUserAfterLogin = (user: Partner) => {
        const role = user.role || '';
        const isAdmin = 
            role === Role.SUPER_ADMIN ||
            role.includes('manager') ||
            role.includes('admin');

        const isPartner = 
            role === Role.DEVELOPER_PARTNER ||
            role === Role.FINISHING_PARTNER ||
            role === Role.AGENCY_PARTNER;

        if (isAdmin) {
            navigate('/admin', { replace: true });
        } else if (isPartner) {
            navigate('/dashboard', { replace: true });
        } else {
            navigate('/my-dashboard', { replace: true });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            if (isSignUp) {
                if (!name.trim()) {
                    throw new Error(isAr ? 'يرجى إدخال الاسم بالكامل' : 'Please enter your full name');
                }
                const user = await registerCustomer(email, password, name, phone);
                if (user) {
                    navigate('/my-dashboard', { replace: true });
                }
            } else {
                const user = await login(email, password);

                if (user) {
                    if (rememberMe) {
                        localStorage.setItem('onlyhelio-remember-email', email);
                    } else {
                        localStorage.removeItem('onlyhelio-remember-email');
                    }

                    redirectUserAfterLogin(user);
                }
            }
        } catch (err: any) {
             console.error("Auth error:", err);
             const msg = err.message || '';
             
             if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
                 setError(isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
             } else if (msg.includes('Email not confirmed')) {
                 setError(isAr 
                    ? 'البريد الإلكتروني غير مفعل. يرجى مراجعة بريدك أو التواصل مع الإدارة.' 
                    : 'Email not confirmed. Please check your inbox or contact support.');
             } else if (msg.includes('already registered')) {
                 setError(isAr ? 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.' : 'Email is already registered. Please sign in.');
             } else {
                 setError(isAr ? (msg || 'حدث خطأ أثناء المصادقة') : (msg || t_auth.loginError));
             }
        } finally {
            setLoading(false);
        }
    };

    const handleQuickLogin = async (demoEmail: string, demoPass: string = 'password') => {
        setIsSignUp(false);
        setError('');
        setEmail(demoEmail);
        setPassword(demoPass);
        setLoading(true);

        try {
            const user = await login(demoEmail, demoPass);
            if (user) {
                redirectUserAfterLogin(user);
            }
        } catch (err: any) {
            console.error("Quick login error:", err);
            setError(isAr ? 'تعذر تسجيل الدخول بالحساب التجريبي' : 'Failed to login with demo account');
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
                    {isSignUp ? (isAr ? 'إنشاء حساب عميل جديد' : 'Create Customer Account') : t_auth.loginTitle}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {isSignUp 
                        ? (isAr ? 'سجل لمتابعة طلباتك، عروض المقاولين، ومراحل التشطيب' : 'Sign up to track your inquiries, bids, and milestones')
                        : t_auth.loginSubtitle}
                </p>

                {/* Mode Selector Tabs */}
                <div className="mt-6 flex justify-center bg-gray-200 dark:bg-gray-700/60 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(false); setError(''); }}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                            !isSignUp 
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {isAr ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setIsSignUp(true); setError(''); }}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                            isSignUp 
                                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    >
                        {isAr ? 'حساب عميل جديد' : 'New Customer'}
                    </button>
                </div>
            </div>

            <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700">
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {isSignUp && (
                            <>
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {isAr ? 'الاسم بالكامل' : 'Full Name'}
                                    </label>
                                    <div className="mt-1">
                                        <Input
                                            id="name"
                                            name="name"
                                            type="text"
                                            required={isSignUp}
                                            placeholder={isAr ? 'أحمد محمد' : 'Ahmed Mohamed'}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {isAr ? 'رقم الهاتف' : 'Phone Number'}
                                    </label>
                                    <div className="mt-1">
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            placeholder="010XXXXXXXX"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

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
                                    placeholder="name@example.com"
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
                                    autoComplete={isSignUp ? "new-password" : "current-password"}
                                    required
                                    className="pl-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {!isSignUp && (
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
                                    <label htmlFor="remember-me" className={`ml-2 block text-sm text-gray-900 dark:text-gray-300 cursor-pointer ${isAr ? 'mr-2 ml-0' : 'ml-2'}`}>
                                        {isAr ? 'تذكرني' : 'Remember me'}
                                    </label>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-fadeIn">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                                    </div>
                                    <div className={`ml-3 ${isAr ? 'mr-3 ml-0' : 'ml-3'}`}>
                                        <h3 className="text-sm font-medium text-red-800 dark:text-red-300">{error}</h3>
                                        {!isSignUp && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                {isAr 
                                                    ? 'إذا لم تكن قد أنشأت حساباً بعد، يمكنك التبديل إلى تبويب "حساب عميل جديد" أعلاه، أو استخدام حسابات التجربة السريعة أدناه.' 
                                                    : 'If you have not registered yet, switch to "New Customer" tab above, or use 1-click demo login below.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <Button type="submit" isLoading={loading} className="w-full flex justify-center bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold" size="lg">
                                {isSignUp ? (isAr ? 'إنشاء الحساب' : 'Create Account') : t_auth.loginButton}
                            </Button>
                        </div>
                    </form>

                    {/* Quick 1-Click Demo Logins */}
                    {!isSignUp && (
                        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/60">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 text-center">
                                {isAr ? '⚡ تجربة سريعة بنقرة واحدة (حسابات تجريبية):' : '⚡ 1-Click Quick Demo Login:'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('admin@onlyhelio.com', 'password')}
                                    disabled={loading}
                                    className="p-2.5 text-xs font-semibold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 text-amber-950 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-right flex items-center justify-between shadow-xs ring-1 ring-amber-400/30"
                                >
                                    <span>👑 {isAr ? 'المدير العام (لوحة التحكم)' : 'Super Admin (Dashboard)'}</span>
                                    <span className="text-[10px] opacity-80 font-mono">admin</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('mega@heliopolis.com', 'password')}
                                    disabled={loading}
                                    className="p-2.5 text-xs font-medium rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-right flex items-center justify-between"
                                >
                                    <span>🏢 {isAr ? 'مطور عقاري' : 'Developer'}</span>
                                    <span className="text-[10px] opacity-75 font-mono">partner</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('expert@decor.com', 'password')}
                                    disabled={loading}
                                    className="p-2.5 text-xs font-medium rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-right flex items-center justify-between"
                                >
                                    <span>🎨 {isAr ? 'تشطيب وديكور' : 'Finishing'}</span>
                                    <span className="text-[10px] opacity-75 font-mono">finishing</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickLogin('client1@example.com', 'password')}
                                    disabled={loading}
                                    className="p-2.5 text-xs font-medium rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-right flex items-center justify-between"
                                >
                                    <span>👤 {isAr ? 'حساب عميل' : 'Customer'}</span>
                                    <span className="text-[10px] opacity-75 font-mono">client</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Partner Registration Link */}
                    <div className="mt-5 pt-5 border-t border-gray-200 dark:border-gray-700 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {isAr ? 'هل أنت مقاول تشطيبات أو شركة تطوير عقاري؟' : 'Are you a contractor or real estate developer?'}
                        </p>
                        <Link 
                            to="/register" 
                            className="inline-block mt-1 text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline"
                        >
                            {isAr ? 'انضم كشريك في المنصة ←' : 'Join as a Partner ←'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
