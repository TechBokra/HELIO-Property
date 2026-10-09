import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads } from '../../../services/leads';
import { getFinishingPartners } from '../../../services/finishing';
import { useLanguage } from '../../shared/LanguageContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { StatusBadge } from '../../ui/StatusBadge';
import { WrenchScrewdriverIcon, DocumentCheckIcon, ClockIcon, CheckCircleIcon } from '../../ui/Icons';

export const AdminFinishingExecutionPage: React.FC = () => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const [searchQuery, setSearchQuery] = useState('');

    const { data: allLeads = [], isLoading } = useQuery({
        queryKey: ['allLeadsAdmin'],
        queryFn: getAllLeads
    });

    const { data: partners = [] } = useQuery({
        queryKey: ['finishingPartnersAdmin'],
        queryFn: getFinishingPartners
    });

    // Projects currently in execution or completed
    const executionProjects = useMemo(() => {
        return allLeads.filter(l => 
            (l.serviceType === 'finishing' || l.serviceTitle?.includes('تشطيب')) &&
            (l.status === 'in-progress' || (l.status as any) === 'in_progress' || l.status === 'completed' || (l.status as any) === 'won')
        );
    }, [allLeads]);

    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return executionProjects;
        const q = searchQuery.toLowerCase();
        return executionProjects.filter(l => 
            (l.customerName && l.customerName.toLowerCase().includes(q)) ||
            (l.serviceTitle && l.serviceTitle.toLowerCase().includes(q))
        );
    }, [executionProjects, searchQuery]);

    const stats = useMemo(() => {
        const inProgress = executionProjects.filter(p => p.status === 'in-progress' || (p.status as any) === 'in_progress').length;
        const completed = executionProjects.filter(p => p.status === 'completed' || (p.status as any) === 'won').length;
        return { inProgress, won: 0, completed, total: executionProjects.length };
    }, [executionProjects]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isAr ? 'متابعة تنفيذ المشاريع والمراحل' : 'Finishing Execution & Milestones Tracker'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {isAr 
                            ? 'متابعة مراحل التنفيذ، التقارير الميدانية، والتحقق من الجداول الزمنية لمشاريع التشطيب'
                            : 'Track project milestones, field attachments, and delivery progress for active finishing contracts'}
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-t-4 border-t-amber-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'إجمالي المشاريع الجارية' : 'Active Projects'}</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
                        </div>
                        <WrenchScrewdriverIcon className="w-8 h-8 text-amber-500/80" />
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-blue-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'قيد التنفيذ الفعلي' : 'In Execution'}</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
                        </div>
                        <ClockIcon className="w-8 h-8 text-blue-500/80" />
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-purple-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'بانتظار بدء الأعمال' : 'Contracted / Pending Start'}</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.won}</p>
                        </div>
                        <DocumentCheckIcon className="w-8 h-8 text-purple-500/80" />
                    </CardContent>
                </Card>

                <Card className="border-t-4 border-t-emerald-500 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-medium">{isAr ? 'مشاريع مكتملة' : 'Completed'}</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
                        </div>
                        <CheckCircleIcon className="w-8 h-8 text-emerald-500/80" />
                    </CardContent>
                </Card>
            </div>

            {/* Execution Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">
                        {isAr ? 'المشاريع الخاضعة للتنفيذ والمتابعة' : 'Projects Under Operational Oversight'}
                    </h2>
                    <div className="w-full sm:w-64">
                        <Input
                            type="search"
                            placeholder={isAr ? 'بحث بالعميل أو المشروع...' : 'Search by client or project...'}
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
                                <TableHead>{isAr ? 'المشروع / العميل' : 'Project / Client'}</TableHead>
                                <TableHead>{isAr ? 'الشريك المنفذ' : 'Contractor Partner'}</TableHead>
                                <TableHead>{isAr ? 'الحالة التشغيلية' : 'Execution Status'}</TableHead>
                                <TableHead>{isAr ? 'تاريخ البدء' : 'Contract Date'}</TableHead>
                                <TableHead className="text-end">{isAr ? 'متابعة المراحل' : 'Milestones Action'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        {isAr ? 'لا توجد مشاريع تشطيب في مرحلة التنفيذ حالياً' : 'No active execution projects found'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProjects.map(p => {
                                    const partner = partners.find(pt => pt.id === p.partnerId || pt.id === p.assignedTo);
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <p className="font-semibold text-gray-900 dark:text-white text-sm">{p.customerName}</p>
                                                <p className="text-xs text-gray-500">{p.serviceTitle || (isAr ? 'مشروع تشطيب سكني' : 'Finishing Contract')}</p>
                                            </TableCell>
                                            <TableCell>
                                                {partner ? (
                                                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                                                        {isAr && partner.nameAr ? partner.nameAr : partner.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">{isAr ? 'فريق المنصة الداخلي' : 'Platform Operations'}</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={p.status} />
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500">
                                                {new Date(p.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                                            </TableCell>
                                            <TableCell className="text-end">
                                                <Link to={`/admin/platform-finishing/requests/${p.id}`}>
                                                    <Button size="sm" variant="outline" className="text-xs font-medium">
                                                        {isAr ? 'جدول المراحل والمرفقات ←' : 'Milestones & Attachments →'}
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

export default AdminFinishingExecutionPage;
