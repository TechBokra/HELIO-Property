
import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PartnerRequest, PartnerType, SubscriptionPlan } from '../../../types';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { addPartner } from '../../../services/partners';
import { Modal, ModalHeader, ModalContent, ModalFooter } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';

interface AdminPartnerFormModalProps {
    onClose: () => void;
}

const AdminPartnerFormModal: React.FC<AdminPartnerFormModalProps> = ({ onClose }) => {
    const { t } = useLanguage();
    const t_admin = t.adminDashboard;
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    
    // Reusing PartnerRequest type structure for simplicity in data collection
    const { register, handleSubmit, watch } = useForm<PartnerRequest & { password?: string }>({
        defaultValues: {
            companyType: 'agency',
            subscriptionPlan: 'basic',
            status: 'approved'
        }
    });

    const mutation = useMutation({
        mutationFn: (data: PartnerRequest & { password?: string }) => addPartner(data, data.password),
        onSuccess: () => {
            showToast('Partner added successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['allPartnersAdmin'] });
            onClose();
        },
        onError: () => showToast('Failed to add partner.', 'error'),
    });

    const onSubmit = (data: PartnerRequest & { password?: string }) => {
        // Mocking missing fields that are required by PartnerRequest but maybe not by direct add
        const fullData = {
            ...data,
            id: `temp-${Date.now()}`,
            createdAt: new Date().toISOString(),
            documents: [],
            managementContacts: [],
            logo: 'https://via.placeholder.com/150', // Placeholder logo
            status: 'approved' as const
        };
        mutation.mutate(fullData);
    };

    const partnerTypes = ['developer', 'agency', 'finishing'];
    const plans = ['basic', 'professional', 'elite', 'commission'];

    return (
        <Modal isOpen={true} onClose={onClose} aria-labelledby="add-partner-title">
            <ModalHeader onClose={onClose} id="add-partner-title">
                Add New Business Partner
            </ModalHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <ModalContent className="space-y-4 pt-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Company Name</label>
                        <Input {...register('companyName', { required: true })} placeholder="e.g. Sunrise Developments" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t_admin.partnerTable.type}</label>
                            <Select {...register('companyType')}>
                                {partnerTypes.map(type => <option key={type} value={type}>{t_admin.partnerTypes[type as keyof typeof t_admin.partnerTypes]}</option>)}
                            </Select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium mb-1">{t_admin.partnerTable.subscriptionPlan}</label>
                            <Select {...register('subscriptionPlan')}>
                                {plans.map(plan => <option key={plan} value={plan}>{plan}</option>)}
                            </Select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Contact Email</label>
                        <Input type="email" {...register('contactEmail', { required: true })} placeholder="contact@company.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Initial Password</label>
                        <Input type="password" {...register('password', { required: true, minLength: 6 })} placeholder="********" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <Textarea {...register('description')} rows={3} />
                    </div>
                </ModalContent>
                <ModalFooter>
                    <Button variant="secondary" onClick={onClose} type="button">{t.adminShared.cancel}</Button>
                    <Button type="submit" isLoading={mutation.isPending}>{t.adminShared.add}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default AdminPartnerFormModal;
