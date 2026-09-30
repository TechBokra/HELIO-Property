import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '../../services/partners';
import { updateLead } from '../../services/leads';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';
import { Button } from '../ui/Button';
import { UserPlusIcon, XMarkIcon, CheckIcon } from '../ui/Icons';
import { Role } from '../../types';

interface ReassignPartnerModalProps {
    requestId: string;
    currentAssignedId?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    filterRole?: string;
}

export const ReassignPartnerModal: React.FC<ReassignPartnerModalProps> = ({
    requestId,
    currentAssignedId,
    isOpen,
    onClose,
    onSuccess,
    filterRole
}) => {
    const { language } = useLanguage();
    const isAr = language === 'ar';
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [selectedPartnerId, setSelectedPartnerId] = useState<string>(currentAssignedId || '');

    const { data: partners = [], isLoading: loadingPartners } = useQuery({
        queryKey: ['allPartnersAdmin'],
        queryFn: getAllPartnersForAdmin,
        enabled: isOpen,
    });

    const eligiblePartners = React.useMemo(() => {
        if (!filterRole) return partners;
        return partners.filter(p => {
            if (filterRole === 'decorations' || filterRole === 'decoration') {
                return (
                    p.role === Role.FINISHING_PARTNER ||
                    p.role === Role.DECORATION_MANAGER ||
                    p.role === Role.DEVELOPER_PARTNER ||
                    p.type?.toLowerCase().includes('decor') ||
                    p.type?.toLowerCase().includes('design') ||
                    p.name.toLowerCase().includes('decor') ||
                    (p.nameAr && p.nameAr.includes('ديكور'))
                );
            }
            return true;
        });
    }, [partners, filterRole]);

    const mutation = useMutation({
        mutationFn: async (newPartnerId: string) => {
            const partnerObj = partners.find(p => p.id === newPartnerId);
            return updateLead(requestId, {
                assignedTo: newPartnerId,
                partnerId: newPartnerId,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['request', requestId] });
            queryClient.invalidateQueries({ queryKey: ['requestHistory', requestId] });
            queryClient.invalidateQueries({ queryKey: ['allLeads'] });
            queryClient.invalidateQueries({ queryKey: ['allRequests'] });
            showToast(isAr ? 'تم إعادة توجيه وتعيين الشريك بنجاح' : 'Partner reassigned successfully', 'success');
            onSuccess?.();
            onClose();
        },
        onError: (err: any) => {
            showToast(err.message || (isAr ? 'فشل إعادة تعيين الشريك' : 'Failed to reassign partner'), 'error');
        }
    });

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedPartnerId) {
            showToast(isAr ? 'يرجى اختيار شريك' : 'Please select a partner', 'error');
            return;
        }
        mutation.mutate(selectedPartnerId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                            <UserPlusIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-base">
                                {isAr ? 'تعيين / إعادة توجيه الشريك' : 'Reassign Partner'}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {isAr ? 'تخصيص الشريك المسؤول عن متابعة وتنفيذ الطلب' : 'Allocate responsible execution studio/partner'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {loadingPartners ? (
                        <div className="py-8 text-center text-sm text-gray-500">
                            {isAr ? 'جاري تحميل قائمة الشركاء...' : 'Loading partners...'}
                        </div>
                    ) : eligiblePartners.length === 0 ? (
                        <div className="py-6 text-center text-sm text-gray-400">
                            {isAr ? 'لا يوجد شركاء متاحين للتخصيص.' : 'No eligible partners available.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {eligiblePartners.map(partner => {
                                const isSelected = selectedPartnerId === partner.id;
                                const isCurrent = currentAssignedId === partner.id;
                                const partnerTitle = (language === 'ar' && partner.nameAr) ? partner.nameAr : (partner.name || partner.email);
                                const partnerContact = partner.contactMethods?.phone?.number || partner.email;

                                return (
                                    <div
                                        key={partner.id}
                                        onClick={() => setSelectedPartnerId(partner.id)}
                                        className={`p-3.5 rounded-xl border text-sm cursor-pointer transition-all flex items-center justify-between ${
                                            isSelected
                                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-gray-900 dark:text-white'
                                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{partnerTitle}</span>
                                                {isCurrent && (
                                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                                                        {isAr ? 'الحالي' : 'Current'}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono mt-0.5">
                                                {partnerContact}
                                            </span>
                                        </div>

                                        <div
                                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                                isSelected
                                                    ? 'border-amber-600 bg-amber-600 text-white'
                                                    : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        >
                                            {isSelected && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
                    <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
                        {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={mutation.isPending || !selectedPartnerId || selectedPartnerId === currentAssignedId}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {mutation.isPending
                            ? (isAr ? 'جاري التعيين...' : 'Reassigning...')
                            : (isAr ? 'تأكيد التعيين' : 'Confirm Assignment')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ReassignPartnerModal;
