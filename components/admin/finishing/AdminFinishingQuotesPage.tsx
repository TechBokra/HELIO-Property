import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads } from '../../../services/leads';
import { getFinishingPartners } from '../../../services/finishing';
import { useLanguage } from '../../shared/LanguageContext';
import { Lead } from '../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { StatusBadge } from '../../ui/StatusBadge';
import { CalculatorIcon, BuildingIcon, BanknotesIcon, ClockIcon } from '../../ui/Icons';

export const AdminFinishingQuotesPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [searchQuery, setSearchQuery] = useState('');

    const { data: allLeads = [], isLoading: loadingLeads } = useQuery({
        queryKey: ['allLeadsAdmin'],
        queryFn: getAllLeads
    });

    const { data: partners = [] } = useQuery({
        queryKey: ['finishingPartnersAdmin'],
        queryFn: getFinishingPartners
    });

    const finishingLeads = useMemo(() => {
        return allLeads.filter(l => l.serviceType === 'finishing' || l.serviceTitle?.includes('تشطيب'));
    }, [allLeads]);

    const filteredLeads = useMemo(() => {
        if (!searchQuery.trim()) return finishingLeads;
        const q = searchQuery.toLowerCase();
        return finishingLeads.filter(l => 
            (l.customerName && l.customerName.toLowerCase().includes(q)) ||
            (l.serviceTitle && l.serviceTitle.toLowerCase().includes(q)) ||
            (l.customerPhone && l.customerPhone.includes(q))
        );
    }, [finishingLeads, searchQuery]);

    const stats = useMemo(() => {
        const total = finishingLeads.length;
        const awarded = finishingLeads.filter(l => l.status === 'completed' || l.status === 'in-progress' || (l.status as any) === 'won' || (l.status as any) === 'in_progress').length;
        const pending = finishingLeads.filter(l => l.status === 'new' || l.status === 'contacted').length;
        return { total, awarded, pending };
    }, [finishingLeads]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isAr ? 'عروض أسعار التشطيب' : 'Finishing Quotes & Proposals'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isAr 
                            ? 'إدارة ومقارنة عروض الأسعار المقدمة من شركاء ومقاولي التشطيب المعتمدين'
                            : 'Manage, compare and award finishing quotes submitted by verified partners'}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-t-4 border-t-amber-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'إجمالي طلبات التسعير' : 'Total Quote Requests'}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                        </div>
                        <CalculatorIcon className="w-8 h-8 text-amber-500/80" />
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'بانتظار العروض / الترسية' : 'Pending Quotes'}</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.pending}</p>
                        </div>
                        <ClockIcon className="w-8 h-8 text-blue-500/80" />
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'تمت الترسية والاتفاق' : 'Awarded / In Progress'}</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.awarded}</p>
                        </div>
                        <BanknotesIcon className="w-8 h-8 text-emerald-500/80" />
                    </CardContent>
                </Card>
            </div>

            {/* Quotes Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        {isAr ? 'قائمة معاملات التشطيب وعروض الأسعار' : 'Finishing Requests & Quote Pipelines'}
                    </h2>
                    <div className="w-full sm:w-64">
                        <Input
                            type="search"
                            placeholder={isAr ? 'بحث بالعميل أو الخدمة...' : 'Search customer or service...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{isAr ? 'العميل' : 'Customer'}</TableHead>
                                <TableHead>{isAr ? 'باقة / نوع التشطيب' : 'Package / Service'}</TableHead>
                                <TableHead>{isAr ? 'الشريك المسند إليه' : 'Assigned Partner'}</TableHead>
                                <TableHead>{isAr ? 'حالة الطلب' : 'Status'}</TableHead>
                                <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                                <TableHead className="text-end">{isAr ? 'الإجراء' : 'Action'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLeads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        {isAr ? 'لا توجد طلبات تشطيب حالية' : 'No finishing requests found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredLeads.map(lead => {
                                    const partner = partners.find(p => p.id === lead.partnerId || p.id === lead.assignedTo);
                                    return (
                                        <TableRow key={lead.id}>
                                            <TableCell>
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">{lead.customerName}</p>
                                                <p className="text-xs text-gray-500" dir="ltr">{lead.customerPhone}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="font-medium text-xs text-gray-800 dark:text-gray-200">{lead.serviceTitle || (isAr ? 'تشطيب متكامل' : 'Finishing Service')}</p>
                                                {lead.propertyArea && <span className="text-[11px] text-gray-400">{lead.propertyArea} m²</span>}
                                            </TableCell>
                                            <TableCell>
                                                {partner ? (
                                                    <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                                                        {isAr && partner.nameAr ? partner.nameAr : partner.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">{isAr ? 'غير معين' : 'Unassigned'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={lead.status} />
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500">
                                                {new Date(lead.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <Link to={`/admin/platform-finishing/requests/${lead.id}`}>
                                                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-gray-900 text-xs font-semibold">
                                                        {isAr ? 'عروض الأسعار ←' : 'Manage Quotes →'}
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default AdminFinishingQuotesPage;
