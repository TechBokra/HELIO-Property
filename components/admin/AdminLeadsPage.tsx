import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllLeads, updateLead } from '../../services/leads';
import { getAllPartnersForAdmin } from '../../services/partners';
import type { Lead, LeadStatus } from '../../types';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { StatusBadge } from '../ui/StatusBadge';
import { WhatsAppIcon, PhoneIcon, SearchIcon, AdjustmentsHorizontalIcon } from '../ui/Icons';
import ErrorState from '../shared/ErrorState';

const AdminLeadsPage: React.FC = () => {
    const { language } = useLanguage();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('all');

    const { data: allLeads = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['allLeads'],
        queryFn: getAllLeads,
    });

    const { data: partners = [] } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
    });

    const partnerMap = useMemo(() => {
        const map: Record<string, string> = {};
        partners.forEach(p => {
            map[p.id] = language === 'ar' ? (p.nameAr || p.name) : p.name;
        });
        return map;
    }, [partners, language]);

    const statusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: LeadStatus }) => updateLead(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allLeads'] });
            showToast(language === 'ar' ? 'تم تحديث حالة العميل' : 'Lead status updated', 'success');
        },
        onError: () => {
            showToast(language === 'ar' ? 'فشل التحديث' : 'Update failed', 'error');
        }
    });

    const filteredLeads = useMemo(() => {
        return allLeads.filter(lead => {
            const matchesSearch =
                !searchTerm ||
                lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                lead.customerPhone.includes(searchTerm) ||
                (lead.serviceTitle && lead.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
            const matchesService = serviceFilter === 'all' || lead.serviceType === serviceFilter;

            return matchesSearch && matchesStatus && matchesService;
        });
    }, [allLeads, searchTerm, statusFilter, serviceFilter]);

    const statusOptions: { value: LeadStatus; label: string }[] = [
        { value: 'new', label: language === 'ar' ? 'جديد (New)' : 'New' },
        { value: 'contacted', label: language === 'ar' ? 'تم التواصل (Contacted)' : 'Contacted' },
        { value: 'site-visit', label: language === 'ar' ? 'معاينة (Viewing)' : 'Viewing' },
        { value: 'completed', label: language === 'ar' ? 'تم التعاقد (Won)' : 'Deal Closed (Won)' },
        { value: 'cancelled', label: language === 'ar' ? 'ملغي / خسارة (Lost)' : 'Lost / Cancelled' },
    ];

    const getWhatsAppUrl = (phone: string, name: string) => {
        const clean = phone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(
            language === 'ar'
                ? `مرحبًا ${name}، بخصوص طلبك على منصة ONLY HELIO.`
                : `Hello ${name}, regarding your inquiry on ONLY HELIO.`
        );
        return `https://wa.me/${clean}?text=${msg}`;
    };

    if (isError) {
        return <ErrorState onRetry={refetch} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {language === 'ar' ? 'إدارة العملاء والفرص (Leads & Inquiries)' : 'Leads & Inquiries Operations'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {language === 'ar'
                            ? `إجمالي الفرص المسجلة: ${allLeads.length} فرصة عبر المنصة`
                            : `Total marketplace leads: ${allLeads.length}`}
                    </p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-72">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 text-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <AdjustmentsHorizontalIcon className="w-4 h-4" />
                        <span>{language === 'ar' ? 'الحالة:' : 'Status:'}</span>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm py-1.5 px-3 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                    >
                        <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    <select
                        value={serviceFilter}
                        onChange={(e) => setServiceFilter(e.target.value)}
                        className="text-sm py-1.5 px-3 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                    >
                        <option value="all">{language === 'ar' ? 'كل القطاعات' : 'All Sectors'}</option>
                        <option value="property">{language === 'ar' ? 'عقارات' : 'Properties'}</option>
                        <option value="finishing">{language === 'ar' ? 'تشطيبات' : 'Finishing'}</option>
                        <option value="decorations">{language === 'ar' ? 'ديكورات' : 'Decorations'}</option>
                        <option value="general">{language === 'ar' ? 'عام' : 'General'}</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                            <TableHead>{language === 'ar' ? 'الطلب / العقار' : 'Inquiry / Property'}</TableHead>
                            <TableHead>{language === 'ar' ? 'الشريك المخصص' : 'Assigned Partner'}</TableHead>
                            <TableHead>{language === 'ar' ? 'مصدر الوصول' : 'Attribution'}</TableHead>
                            <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                            <TableHead>{language === 'ar' ? 'تحديث سريع' : 'Quick Update'}</TableHead>
                            <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    {language === 'ar' ? 'جاري تحميل الفرص...' : 'Loading leads...'}
                                </TableCell>
                            </TableRow>
                        ) : filteredLeads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    {language === 'ar' ? 'لا توجد طلبات مطابقة' : 'No matching leads found'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLeads.map(lead => {
                                const partnerName = lead.partnerId ? (partnerMap[lead.partnerId] || lead.partnerId) : '—';
                                return (
                                    <TableRow key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <TableCell>
                                            <div className="font-semibold text-gray-900 dark:text-white">{lead.customerName}</div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-xs font-mono text-gray-500" dir="ltr">{lead.customerPhone}</span>
                                                {lead.customerPhone && (
                                                    <>
                                                        <a
                                                            href={getWhatsAppUrl(lead.customerPhone, lead.customerName)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                                            title="WhatsApp"
                                                        >
                                                            <WhatsAppIcon className="w-3 h-3" />
                                                        </a>
                                                        <a
                                                            href={`tel:${lead.customerPhone}`}
                                                            className="p-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                                                            title="Call"
                                                        >
                                                            <PhoneIcon className="w-3 h-3" />
                                                        </a>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="max-w-xs">
                                            <div className="truncate font-medium text-gray-800 dark:text-gray-200" title={lead.serviceTitle}>
                                                {lead.serviceTitle}
                                            </div>
                                            {lead.propertyId && (
                                                <Link
                                                    to={`/properties/${lead.propertyId}`}
                                                    target="_blank"
                                                    className="text-xs text-amber-600 hover:underline"
                                                >
                                                    {language === 'ar' ? 'عرض العقار' : 'View Property'}
                                                </Link>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                {partnerName}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                    {lead.source || 'direct'}
                                                </span>
                                                {lead.utmCampaign && (
                                                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono truncate max-w-[120px]">
                                                        {lead.utmCampaign}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={lead.status} />
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                value={lead.status}
                                                onChange={(e) => statusMutation.mutate({ id: lead.id, status: e.target.value as LeadStatus })}
                                                disabled={statusMutation.isPending}
                                                className="text-xs py-1 px-2 border rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-amber-500"
                                            >
                                                {statusOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(lead.createdAt).toLocaleDateString(language)}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading leads...</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No leads found</div>
                ) : (
                    filteredLeads.map(lead => (
                        <Card key={lead.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{lead.customerName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500 font-mono" dir="ltr">{lead.customerPhone}</span>
                                        {lead.customerPhone && (
                                            <>
                                                <a
                                                    href={getWhatsAppUrl(lead.customerPhone, lead.customerName)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded bg-emerald-100 text-emerald-700"
                                                >
                                                    <WhatsAppIcon className="w-3.5 h-3.5" />
                                                </a>
                                                <a href={`tel:${lead.customerPhone}`} className="p-1 rounded bg-amber-100 text-amber-700">
                                                    <PhoneIcon className="w-3.5 h-3.5" />
                                                </a>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={lead.status} />
                            </div>
                            <div className="text-sm text-gray-800 dark:text-gray-200">
                                {lead.serviceTitle}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <span>{lead.source || 'direct'}</span>
                                <select
                                    value={lead.status}
                                    onChange={(e) => statusMutation.mutate({ id: lead.id, status: e.target.value as LeadStatus })}
                                    className="text-xs py-1 px-2 border rounded bg-white dark:bg-gray-800"
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminLeadsPage;
