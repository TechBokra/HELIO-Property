
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminPartner } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { updatePartnerAdmin } from '../../../services/partners';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { WhatsAppIcon, PhoneIcon } from '../../ui/Icons';

interface EditContactMethodsModalProps {
    partner: AdminPartner;
    onClose: () => void;
    onSave: () => void;
}

const EditContactMethodsModal: React.FC<EditContactMethodsModalProps> = ({ partner, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const t_page = t.adminDashboard.inquiryManagement;
    const { showToast } = useToast();

    const [numbers, setNumbers] = useState({
        whatsapp: partner.contactMethods?.whatsapp?.number || '',
        phone: partner.contactMethods?.phone?.number || '',
    });
    
    const mutation = useMutation({
        mutationFn: (updates: { whatsapp: { number: string }, phone: { number: string } }) => {
            const newContactMethods = {
                ...partner.contactMethods,
                whatsapp: { ...(partner.contactMethods?.whatsapp || { enabled: false }), number: updates.whatsapp.number },
                phone: { ...(partner.contactMethods?.phone || { enabled: false }), number: updates.phone.number },
            };
            return updatePartnerAdmin(partner.id, { contactMethods: newContactMethods as any });
        },
        onSuccess: () => {
            showToast(t_page.updateSuccess, 'success');
            onSave();
        },
        onError: () => {
            showToast('Failed to update numbers.', 'error');
        },
    });
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNumbers(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        mutation.mutate({
            whatsapp: { number: numbers.whatsapp },
            phone: { number: numbers.phone }
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} aria-labelledby="edit-contact-title" className="max-w-md">
            <ModalHeader onClose={onClose} id="edit-contact-title">
                {t_page.editModalTitle}
            </ModalHeader>
            <ModalContent className="space-y-6 pt-4">
                <div className="flex items-center gap-4 mb-2">
                     <img src={partner.imageUrl} alt="" className="w-12 h-12 rounded-full border border-gray-200" />
                     <div>
                         <p className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? partner.nameAr : partner.name}</p>
                         <p className="text-xs text-gray-500">Update contact routing numbers</p>
                     </div>
                </div>

                 <div className="space-y-4">
                    <div>
                        <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                            <WhatsAppIcon className="w-4 h-4 text-green-600" />
                            {t.adminDashboard.partnerTable.whatsAppNumber}
                        </label>
                        <Input
                            id="whatsapp"
                            name="whatsapp"
                            value={numbers.whatsapp}
                            onChange={handleChange}
                            placeholder="+201..."
                            dir="ltr"
                            className="font-mono"
                        />
                    </div>
                    <div>
                         <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                             <PhoneIcon className="w-4 h-4 text-blue-600" />
                            {t.adminDashboard.partnerTable.phoneNumber}
                        </label>
                        <Input
                            id="phone"
                            name="phone"
                            value={numbers.phone}
                            onChange={handleChange}
                            placeholder="+201..."
                            dir="ltr"
                             className="font-mono"
                        />
                    </div>
                 </div>
            </ModalContent>
            <ModalFooter>
                <Button variant="secondary" onClick={onClose}>{t.adminShared.cancel}</Button>
                <Button onClick={handleSave} isLoading={mutation.isPending}>{t.adminShared.save}</Button>
            </ModalFooter>
        </Modal>
    );
};

export default EditContactMethodsModal;
