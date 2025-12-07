
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllPartnersForAdmin, updatePartnerAdmin } from '../../../services/partners';
import { useAdminTable } from '../../hooks/useAdminTable';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { AdminPartner, PartnerType } from '../../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/Table';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { ToggleSwitch } from '../../ui/ToggleSwitch';
import { WhatsAppIcon, PhoneIcon, ClipboardDocumentListIcon } from '../../ui/Icons';
import EditContactMethodsModal from './EditContactMethodsModal';
import { ResponsiveList } from '../../shared/ResponsiveList';
import { Card, CardContent, CardFooter } from '../../ui/Card';

const AdminInquiryManagementPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_page = t.adminDashboard.inquiryManagement;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: partners, isLoading } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
    });
    
    const [modalState, setModalState] = useState<{ isOpen: boolean, partner?: AdminPartner }>({ isOpen: false });

    const mutation = useMutation({
        mutationFn: ({ partnerId, updates }: { partnerId: string; updates: Partial<AdminPartner> }) =>
            updatePartnerAdmin(partnerId, updates),
        onSuccess: () => {
            showToast(t_page.updateSuccess, 'success');
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
        },
        onError: () => {
            showToast('Failed to update contact method.', 'error');
        },
    });
    
    const businessPartners = useMemo(() => (partners || []).filter(p => ['developer', 'finishing', 'agency'].includes(p.type)), [partners]);
    
    const {
        paginatedItems: paginatedPartners,
        searchTerm,
        setSearchTerm,
        filters,
        setFilter,
    } = useAdminTable({
        data: businessPartners,
        itemsPerPage: 10,
        initialSort: { key: 'name', direction: 'ascending' },
        searchFn: (p: AdminPartner, term: string) => p.name.toLowerCase().includes(term) || (p.nameAr?.toLowerCase().includes(term) ?? false),
        filterFns: {
            type: (p: AdminPartner, v) => p.type === v,
        }
    });

    const handleToggle = (partner: AdminPartner, method: 'whatsapp' | 'phone' | 'form') => {
        const currentMethods = partner.contactMethods || {
            whatsapp: { enabled: false, number: '' },
            phone: { enabled: false, number: '' },
            form: { enabled: true },
        };
        const newMethods = {
            ...currentMethods,
            [method]: { ...currentMethods[method], enabled: !currentMethods[method].enabled },
        };
        mutation.mutate({ partnerId: partner.id, updates: { contactMethods: newMethods } });
    };

    const renderTable = (items: AdminPartner[]) => (
         <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t_page.table.partner}</TableHead>
                        <TableHead className="w-48">{t_page.table.whatsapp}</TableHead>
                        <TableHead className="w-48">{t_page.table.phone}</TableHead>
                        <TableHead className="w-32">{t_page.table.internalForm}</TableHead>
                        <TableHead className="w-20">{t_page.table.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center p-8">Loading...</TableCell></TableRow>
                    ) : items.map(p => {
                        const methods = p.contactMethods || { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } };
                        return (
                            <TableRow key={p.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? p.nameAr : p.name}</div>
                                            <div className="text-xs text-gray-500">{t.adminDashboard.partnerTypes[p.type as keyof typeof t.adminDashboard.partnerTypes]}</div>
                                        </div>
                                    </div>
                                </TableCell>
                                
                                {/* WhatsApp */}
                                <TableCell>
                                    <div className={`flex items-start gap-3 p-2 rounded-md ${methods.whatsapp.enabled ? 'bg-green-50 dark:bg-green-900/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <div className="mt-0.5">
                                            <ToggleSwitch
                                                checked={methods.whatsapp.enabled}
                                                onChange={() => handleToggle(p, 'whatsapp')}
                                                disabled={mutation.isPending}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                <WhatsAppIcon className={`w-3 h-3 ${methods.whatsapp.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                                                WhatsApp
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1" dir="ltr">
                                                {methods.whatsapp.number || <span className="text-red-400 italic">No Number</span>}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Phone */}
                                <TableCell>
                                        <div className={`flex items-start gap-3 p-2 rounded-md ${methods.phone.enabled ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <div className="mt-0.5">
                                            <ToggleSwitch
                                                checked={methods.phone.enabled}
                                                onChange={() => handleToggle(p, 'phone')}
                                                disabled={mutation.isPending}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                <PhoneIcon className={`w-3 h-3 ${methods.phone.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                                                Phone
                                            </div>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1" dir="ltr">
                                                {methods.phone.number || <span className="text-red-400 italic">No Number</span>}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Form */}
                                <TableCell>
                                        <div className={`flex items-center gap-3 p-2 rounded-md h-full ${methods.form.enabled ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                                        <ToggleSwitch
                                            checked={methods.form.enabled}
                                            onChange={() => handleToggle(p, 'form')}
                                            disabled={mutation.isPending}
                                        />
                                            <ClipboardDocumentListIcon className={`w-5 h-5 ${methods.form.enabled ? 'text-amber-500' : 'text-gray-400'}`} />
                                    </div>
                                </TableCell>
                                
                                <TableCell>
                                    <Button variant="secondary" size="sm" onClick={() => setModalState({ isOpen: true, partner: p })}>
                                        {t.adminShared.edit}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );

    const renderCard = (p: AdminPartner) => {
        const methods = p.contactMethods || { whatsapp: { enabled: false, number: '' }, phone: { enabled: false, number: '' }, form: { enabled: true } };
        return (
            <Card key={p.id}>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                        <div>
                            <div className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? p.nameAr : p.name}</div>
                            <div className="text-xs text-gray-500">{t.adminDashboard.partnerTypes[p.type as keyof typeof t.adminDashboard.partnerTypes]}</div>
                        </div>
                    </div>
                    
                    {/* Mobile Controls */}
                    <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
                        {/* WhatsApp */}
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <WhatsAppIcon className={`w-4 h-4 ${methods.whatsapp.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium">WhatsApp</span>
                            </div>
                            <ToggleSwitch
                                checked={methods.whatsapp.enabled}
                                onChange={() => handleToggle(p, 'whatsapp')}
                                disabled={mutation.isPending}
                            />
                        </div>
                        {/* Phone */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <PhoneIcon className={`w-4 h-4 ${methods.phone.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium">Phone</span>
                            </div>
                             <ToggleSwitch
                                checked={methods.phone.enabled}
                                onChange={() => handleToggle(p, 'phone')}
                                disabled={mutation.isPending}
                            />
                        </div>
                         {/* Form */}
                         <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ClipboardDocumentListIcon className={`w-4 h-4 ${methods.form.enabled ? 'text-amber-500' : 'text-gray-400'}`} />
                                <span className="text-sm font-medium">Internal Form</span>
                            </div>
                             <ToggleSwitch
                                checked={methods.form.enabled}
                                onChange={() => handleToggle(p, 'form')}
                                disabled={mutation.isPending}
                            />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="ghost" className="w-full" onClick={() => setModalState({ isOpen: true, partner: p })}>
                        {t.adminShared.edit} Numbers
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <div>
            {modalState.isOpen && modalState.partner && (
                <EditContactMethodsModal
                    partner={modalState.partner}
                    onClose={() => setModalState({ isOpen: false })}
                    onSave={() => {
                        setModalState({ isOpen: false });
                        queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
                    }}
                />
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_page.title}</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-8">{t_page.subtitle}</p>

            <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
                <Input
                    placeholder={t.adminDashboard.filter.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                />
                <Select value={filters.type || 'all'} onChange={(e) => setFilter('type', e.target.value)} className="max-w-xs">
                    <option value="all">{t.adminDashboard.filter.all}</option>
                    <option value="developer">{t.adminDashboard.partnerTypes.developer}</option>
                    <option value="finishing">{t.adminDashboard.partnerTypes.finishing}</option>
                    <option value="agency">{t.adminDashboard.partnerTypes.agency}</option>
                </Select>
            </div>
            
             <ResponsiveList
                items={paginatedPartners}
                renderTable={renderTable}
                renderCard={renderCard}
                emptyState={<div className="text-center p-8 text-gray-500">No partners found.</div>}
            />
        </div>
    );
};

export default AdminInquiryManagementPage;
