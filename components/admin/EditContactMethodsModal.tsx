
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPartner } from '../../types';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { updatePartnerAdmin } from '../../services/partners';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface EditContactMethodsModalProps {
    partner: AdminPartner;
    onClose: () => void;
    onSave: () => void;
}

const EditContactMethodsModal: React.FC<EditContactMethodsModalProps> = ({ partner, onClose, onSave }) => {
    const { language, t } = useLanguage();
    const t_page = t.adminDashboard.inquiryManagement;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [numbers, setNumbers] = useState({
        whatsapp: partner.contactMethods?.whatsapp?.number || '',
        phone: partner.contactMethods?.phone?.number || '',
    });
    
    const mutation = useMutation({
        mutationFn: (updates: { whatsapp: { number: string }, phone: { number: string } }) => {
            const newContactMethods = {
                ...partner.contactMethods,
                whatsapp: { ...partner.contactMethods?.whatsapp, number: updates.whatsapp.number },
                phone: { ...partner.contactMethods?.phone, number: updates.phone.number },
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
        <Modal isOpen={true} onClose={onClose} aria-labelledby="edit-contact-title">
            <ModalHeader onClose={onClose} id="edit-contact-title">
                {t_page.editModalTitle}
            </ModalHeader>
            <ModalContent className="space-y-4 pt-2">
                 <div>
                    <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.adminDashboard.partnerTable.whatsAppNumber}
                    </label>
                    <Input
                        id="whatsapp"
                        name="whatsapp"
                        value={numbers.whatsapp}
                        onChange={handleChange}
                        placeholder="+201..."
                        dir="ltr"
                    />
                </div>
                <div>
                     <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t.adminDashboard.partnerTable.phoneNumber}
                    </label>
                    <Input
                        id="phone"
                        name="phone"
                        value={numbers.phone}
                        onChange={handleChange}
                        placeholder="+201..."
                        dir="ltr"
                    />
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