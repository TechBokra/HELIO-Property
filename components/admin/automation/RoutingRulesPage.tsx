
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllRoutingRules, deleteRoutingRule, updateRoutingRule, reorderRoutingRules } from '../../../services/routingRules';
import { getAllPartnersForAdmin } from '../../../services/partners';
import type { RoutingRule } from '../../../data/routingRules';
import { useLanguage } from '../../shared/LanguageContext';
import { useToast } from '../../shared/ToastContext';
import { Button } from '../../ui/Button';
import { ToggleSwitch } from '../../ui/ToggleSwitch';
import RoutingRuleFormModal from './RoutingRuleFormModal';
import ConfirmationModal from '../../shared/ConfirmationModal';
import { AdjustmentsHorizontalIcon, TrashIcon, CheckCircleIcon, XCircleIcon, ArrowRightIcon, ArrowUpIcon, ArrowDownIcon } from '../../ui/Icons';

const RoutingRulesPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_auto = t.adminDashboard.automation;
    const t_shared = t.adminShared;
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const { data: rules, isLoading: loadingRules } = useQuery({ queryKey: ['routingRules'], queryFn: getAllRoutingRules });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });
    const isLoading = loadingRules || loadingPartners;
    
    const [modalState, setModalState] = useState<{ isOpen: boolean; ruleToEdit?: RoutingRule }>({ isOpen: false });
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
    
    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<RoutingRule> }) => updateRoutingRule(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['routingRules'] });
        }
    });

    const reorderMutation = useMutation({
        mutationFn: ({ id, direction }: { id: string, direction: 'up' | 'down' }) => reorderRoutingRules(id, direction),
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['routingRules'] });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRoutingRule,
        onSuccess: () => {
            showToast('Rule deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['routingRules'] });
            setRuleToDelete(null);
        }
    });

    const handleToggleStatus = (rule: RoutingRule) => {
        updateMutation.mutate({ id: rule.id, updates: { active: !rule.active } });
    };
    
    const handleSave = () => {
        setModalState({ isOpen: false });
        queryClient.invalidateQueries({ queryKey: ['routingRules'] });
    }

    return (
        <div>
            {modalState.isOpen && (
                <RoutingRuleFormModal
                    ruleToEdit={modalState.ruleToEdit}
                    onClose={() => setModalState({ isOpen: false })}
                    onSave={handleSave}
                />
            )}
             {ruleToDelete && (
                <ConfirmationModal
                    isOpen={!!ruleToDelete}
                    onClose={() => setRuleToDelete(null)}
                    onConfirm={() => deleteMutation.mutate(ruleToDelete)}
                    title={t_shared.delete}
                    message={t_auto.confirmDelete}
                />
            )}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_auto.title}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t_auto.subtitle}</p>
                </div>
                <Button onClick={() => setModalState({ isOpen: true })} className="flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-5 h-5" />
                    {t_auto.addNewRule}
                </Button>
            </div>
            
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-200 text-sm rounded-r-lg">
                <p className="font-bold">⚠️ {language === 'ar' ? 'الترتيب مهم!' : 'Order Matters!'}</p>
                <p>{language === 'ar' 
                    ? 'يتم تقييم القواعد من أعلى إلى أسفل. أول قاعدة نشطة تتطابق مع الطلب ستحدد تعيينه. استخدم الأسهم لتحديد أولويات القواعد.' 
                    : 'Rules are evaluated from top to bottom. The first active rule that matches a request will determine its assignment. Use the arrow buttons to prioritize important rules.'}</p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                     <div className="text-center p-8">Loading rules...</div>
                ) : (rules || []).length === 0 ? (
                     <div className="text-center p-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
                        No automation rules defined yet.
                     </div>
                ) : (rules || []).map((rule, index) => {
                    const assignedToUser = (partners || []).find(p => p.id === rule.action.assignTo);
                    const assignedToName = assignedToUser ? (language === 'ar' ? assignedToUser.nameAr : assignedToUser.name) : rule.action.assignTo;

                    return (
                        <div key={rule.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border transition-all duration-200 ${rule.active ? 'border-gray-200 dark:border-gray-700 hover:border-amber-400' : 'border-gray-100 dark:border-gray-800 opacity-75'}`}>
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col gap-1 mr-2">
                                            <button onClick={() => reorderMutation.mutate({ id: rule.id, direction: 'up' })} disabled={index === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUpIcon className="w-4 h-4" /></button>
                                            <button onClick={() => reorderMutation.mutate({ id: rule.id, direction: 'down' })} disabled={index === (rules?.length || 0) - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDownIcon className="w-4 h-4" /></button>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{rule.name[language]}</h3>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${rule.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                                                    {rule.active ? <CheckCircleIcon className="w-3 h-3" /> : <XCircleIcon className="w-3 h-3" />}
                                                    {rule.active ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ToggleSwitch
                                            checked={rule.active}
                                            onChange={() => handleToggleStatus(rule)}
                                        />
                                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
                                        <Button variant="secondary" size="sm" onClick={() => setModalState({ isOpen: true, ruleToEdit: rule })}>
                                            {t_shared.edit}
                                        </Button>
                                        <Button variant="danger" size="sm" className="bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 border-none shadow-none" onClick={() => setRuleToDelete(rule.id)}>
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-md text-sm ml-10">
                                    <div className="flex-grow space-y-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">IF ({t_auto.conditions})</span>
                                        <div className="flex flex-wrap gap-2">
                                            {rule.conditions.map((cond, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-mono text-xs">
                                                    <span className="text-amber-600 dark:text-amber-500 mr-1">{cond.field}</span>
                                                    <span className="text-gray-400 mx-1">{cond.operator.replace('_', ' ')}</span>
                                                    <span className="font-bold">"{cond.value}"</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="hidden md:block text-gray-400">
                                        <ArrowRightIcon className={`w-6 h-6 ${language === 'ar' ? 'rotate-180' : ''}`} />
                                    </div>

                                    <div className="flex-shrink-0 w-full md:w-auto md:min-w-[200px]">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">THEN ({t_auto.action})</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-600 dark:text-gray-400">{t_auto.assignToAction}</span>
                                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 shadow-sm">
                                                {assignedToUser?.imageUrl && <img src={assignedToUser.imageUrl} className="w-5 h-5 rounded-full object-cover" alt="" />}
                                                <span className="font-semibold text-gray-900 dark:text-white">{assignedToName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RoutingRulesPage;