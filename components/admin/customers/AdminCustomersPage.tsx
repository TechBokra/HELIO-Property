import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../../shared/LanguageContext';
import { getAllPartnersForAdmin } from '../../../services/partners';
import { getAllRequests } from '../../../services/requests';
import { Role } from '../../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { UsersIcon, SearchIcon, PhoneIcon, ArrowPathIcon } from '../../ui/Icons';
import { StatusBadge } from '../../ui/StatusBadge';
import { Link } from 'react-router-dom';

interface CustomerRecord {
    id: string;
    name: string;
    email: string;
    phone: string;
    source: 'registered' | 'requester';
    requestsCount: number;
    createdAt: string;
    status: string;
}

const AdminCustomersPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [searchTerm, setSearchTerm] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'registered' | 'requester'>('all');

    // 1. Query users/partners
    const { 
        data: partners, 
        isLoading: loadingPartners, 
        isError: errorPartners, 
        refetch: refetchPartners 
    } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
    });

    // 2. Query requests to map customer activities
    const { 
        data: requests, 
        isLoading: loadingRequests, 
        isError: errorRequests, 
        refetch: refetchRequests 
    } = useQuery({
        queryKey: ['allRequestsAdmin'],
        queryFn: getAllRequests,
    });

    const isLoading = loadingPartners || loadingRequests;
    const isError = errorPartners || errorRequests;

    // Aggregate unique customer list from registered customers and request submissions
    const customersList: CustomerRecord[] = useMemo(() => {
        if (!partners && !requests) return [];

        const map = new Map<string, CustomerRecord>();

        // Registered customer accounts
        (partners || []).forEach(p => {
            if (p.role === Role.CUSTOMER || p.type === 'customer') {
                const key = p.email?.toLowerCase() || p.id;
                map.set(key, {
                    id: p.id,
                    name: (isAr && p.nameAr ? p.nameAr : p.name) || p.email,
                    email: p.email || '—',
                    phone: (p as any).phone || p.contactMethods?.phone?.number || '—',
                    source: 'registered',
                    requestsCount: 0,
                    createdAt: p.createdAt || new Date().toISOString(),
                    status: p.status || 'active',
                });
            }
        });

        // Request requesters
        (requests || []).forEach(r => {
            const email = r.requesterInfo?.email?.toLowerCase();
            const phone = r.requesterInfo?.phone;
            const name = r.requesterInfo?.name || (isAr ? 'عميل' : 'Customer');
            const key = email || phone || r.id;

            if (map.has(key)) {
                const existing = map.get(key)!;
                existing.requestsCount += 1;
            } else {
                map.set(key, {
                    id: r.id,
                    name,
                    email: email || '—',
                    phone: phone || '—',
                    source: 'requester',
                    requestsCount: 1,
                    createdAt: r.createdAt || new Date().toISOString(),
                    status: 'active',
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [partners, requests, isAr]);

    // Filter results
    const filteredCustomers = useMemo(() => {
        return customersList.filter(c => {
            const matchesSearch = 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone.includes(searchTerm);

            const matchesSource = sourceFilter === 'all' || c.source === sourceFilter;
            return matchesSearch && matchesSource;
        });
    }, [customersList, searchTerm, sourceFilter]);

    const totalCustomers = customersList.length;
    const registeredCount = customersList.filter(c => c.source === 'registered').length;
    const requestersCount = customersList.filter(c => c.source === 'requester').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isAr ? 'إدارة وسجل العملاء' : 'Customer Management'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {isAr 
                            ? 'عرض بيانات العملاء المسجلين وأصحاب الطلبات والاستفسارات' 
                            : 'View registered customers, service requesters, and their activity'}
                    </p>
                </div>
                
                <button
                    onClick={() => { refetchPartners(); refetchRequests(); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-2xs self-start sm:self-auto"
                >
                    <ArrowPathIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isAr ? 'تحديث البيانات' : 'Refresh'}</span>
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {isAr ? 'إجمالي العملاء' : 'Total Customers'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{totalCustomers}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {isAr ? 'عملاء مسجلين ومقدمي طلبات' : 'All unique contacts'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {isAr ? 'حسابات مسجلة' : 'Registered Accounts'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{registeredCount}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {isAr ? 'مستخدمين لديهم حسابات نشطة' : 'Direct user registrations'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {isAr ? 'أصحاب طلبات نشطة' : 'Active Requesters'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{requestersCount}</div>
                        <p className="text-xs text-gray-500 mt-1">
                            {isAr ? 'عملاء عبر نماذج الخدمات والعقارات' : 'Via service or property leads'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-lg border border-gray-200 shadow-2xs">
                <div className="relative flex-1">
                    <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder={isAr ? 'البحث بالاسم، البريد أو الهاتف...' : 'Search by name, email, or phone...'}
                        className="ps-9 text-xs h-9"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setSourceFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sourceFilter === 'all' 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {isAr ? 'الكل' : 'All'}
                    </button>
                    <button
                        onClick={() => setSourceFilter('registered')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sourceFilter === 'registered' 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {isAr ? 'مسجلين' : 'Registered'}
                    </button>
                    <button
                        onClick={() => setSourceFilter('requester')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            sourceFilter === 'requester' 
                                ? 'bg-amber-500 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        {isAr ? 'مقدمي طلبات' : 'Requesters'}
                    </button>
                </div>
            </div>

            {/* Error State */}
            {isError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center justify-between">
                    <span>{isAr ? 'حدث خطأ أثناء تحميل بيانات العملاء' : 'Failed to load customer records'}</span>
                    <button 
                        onClick={() => { refetchPartners(); refetchRequests(); }}
                        className="font-bold underline ms-2"
                    >
                        {isAr ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs text-gray-500 mt-2">
                        {isAr ? 'جاري تحميل قائمة العملاء...' : 'Loading customers list...'}
                    </p>
                </div>
            )}

            {/* Customers Table */}
            {!isLoading && !isError && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-2xs">
                    {filteredCustomers.length === 0 ? (
                        <div className="p-12 text-center">
                            <UsersIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <h3 className="text-sm font-bold text-gray-700">
                                {isAr ? 'لا توجد سجلات مطابقة للبحث' : 'No matching customers found'}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                                {isAr ? 'جرب تغيير معايير البحث أو تصفية المصدر' : 'Try adjusting search term or filter'}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/80">
                                    <TableHead className="text-xs">{isAr ? 'العميل' : 'Customer'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'معلومات الاتصال' : 'Contact Info'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'المصدر' : 'Source'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'عدد الطلبات' : 'Requests'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'تاريخ التسجيل' : 'Registered'}</TableHead>
                                    <TableHead className="text-xs">{isAr ? 'الحالة' : 'Status'}</TableHead>
                                    <TableHead className="text-xs text-end">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCustomers.map((cust) => (
                                    <TableRow key={cust.id} className="hover:bg-gray-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {cust.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                                        {cust.name}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 font-mono">
                                                        ID: {cust.id.slice(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-0.5 text-xs text-gray-600">
                                                <div>{cust.email}</div>
                                                {cust.phone !== '—' && (
                                                    <div className="text-gray-400 font-mono text-[11px]">{cust.phone}</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                cust.source === 'registered' 
                                                    ? 'bg-amber-100 text-amber-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                {cust.source === 'registered' 
                                                    ? (isAr ? 'حساب مسجل' : 'Registered') 
                                                    : (isAr ? 'نموذج خدمة' : 'Requester')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-bold text-gray-800">
                                                {cust.requestsCount} {isAr ? 'طلب' : 'requests'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-gray-500">
                                                {new Date(cust.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={cust.status as any} />
                                        </TableCell>
                                        <TableCell className="text-end">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {cust.phone !== '—' && (
                                                    <a 
                                                        href={`tel:${cust.phone}`}
                                                        className="p-1 text-gray-400 hover:text-emerald-600 rounded"
                                                        title="Call Customer"
                                                    >
                                                        <PhoneIcon className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <Link 
                                                    to={`/admin/leads?search=${encodeURIComponent(cust.email !== '—' ? cust.email : cust.name)}`}
                                                    className="text-xs text-amber-600 hover:text-amber-700 font-semibold px-2 py-1 bg-amber-50 rounded"
                                                >
                                                    {isAr ? 'عرض الطلبات' : 'View Leads'}
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminCustomersPage;
