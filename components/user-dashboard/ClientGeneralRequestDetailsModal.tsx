import React, { useState } from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    CloseIcon, 
    ClockIcon, 
    BuildingIcon, 
    ChatBubbleLeftRightIcon,
    InformationCircleIcon
} from '../ui/Icons';
import { StatusBadge } from '../ui/StatusBadge';
import { Card, CardContent } from '../ui/Card';
import ConversationThread from '../shared/ConversationThread';
import { getRequestHistory, getRequestMessages } from '../../services/requests';
import type { Request, Lead } from '../../types';

interface ClientGeneralRequestDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: Request;
}

export const ClientGeneralRequestDetailsModal: React.FC<ClientGeneralRequestDetailsModalProps> = ({
    isOpen,
    onClose,
    request
}) => {
    const { language, t } = useLanguage();
    const isAr = language === 'ar';
    const queryClient = useQueryClient();

    const [activeTab, setActiveTab] = useState<'details' | 'conversation' | 'history'>('details');

    const payload = (request.payload || {}) as any;

    const { data: history = [] } = useQuery({
        queryKey: ['requestHistory', request.id],
        queryFn: () => getRequestHistory(request.id),
        enabled: isOpen && !!request.id
    });

    const { data: messages = [] } = useQuery({
        queryKey: ['requestMessages', request.id],
        queryFn: () => getRequestMessages(request.id),
        enabled: isOpen && !!request.id
    });

    if (!isOpen) return null;

    // Convert request to Lead interface format expected by ConversationThread
    const leadRepresentation: Lead = {
        id: request.id,
        partnerId: request.assignedTo || payload.partnerId || '',
        managerId: payload.managerId,
        propertyId: payload.propertyId,
        propertyTitle: payload.propertyTitle,
        serviceType: payload.serviceType || 'general',
        customerName: request.requesterInfo.name,
        customerPhone: request.requesterInfo.phone,
        contactTime: payload.contactTime,
        serviceTitle: payload.serviceTitle || request.type.replace(/_/g, ' '),
        customerNotes: payload.customerNotes || payload.message || payload.details,
        status: request.status as any,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt || request.createdAt,
        messages: messages.length > 0 ? messages : (payload.messages || []),
    };

    const typeLabel = t.adminDashboard?.requestTypes?.[request.type] || request.type.replace(/_/g, ' ');

    return (
        <div 
            className="fixed inset-0 bg-black/70 z-50 flex justify-center items-center p-3 sm:p-4 overflow-y-auto animate-fadeIn" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto border border-gray-100 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start gap-4 bg-gray-50/80 dark:bg-gray-800/80">
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                {typeLabel}
                            </span>
                            <StatusBadge status={request.status} />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                            {payload.serviceTitle || payload.propertyDetails?.title?.ar || payload.propertyTitle || typeLabel}
                        </h2>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isAr ? 'رقم الطلب:' : 'Request ID:'} <span className="font-mono">{request.id.slice(0, 10)}...</span> • {new Date(request.createdAt).toLocaleDateString(language, { dateStyle: 'long' })}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-white dark:bg-gray-900">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'details'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <InformationCircleIcon className="w-4 h-4" />
                        <span>{isAr ? 'تفاصيل الطلب' : 'Request Details'}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('conversation')}
                        className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'conversation'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        <span>{isAr ? 'المحادثة والدعم' : 'Messages & Support'}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-3.5 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'history'
                                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        <ClockIcon className="w-4 h-4" />
                        <span>{isAr ? 'سجل العمليات' : 'Audit Timeline'}</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {activeTab === 'details' && (
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-5 space-y-4">
                                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                                        {isAr ? 'معلومات الطلب' : 'Request Overview'}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">{isAr ? 'نوع الطلب' : 'Request Type'}</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{typeLabel}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 dark:text-gray-400">{isAr ? 'الحالة الحالية' : 'Current Status'}</p>
                                            <div className="mt-0.5"><StatusBadge status={request.status} /></div>
                                        </div>
                                        {payload.contactTime && (
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400">{isAr ? 'وقت التواصل المفضل' : 'Preferred Contact Time'}</p>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{payload.contactTime}</p>
                                            </div>
                                        )}
                                        {payload.propertyTitle && (
                                            <div>
                                                <p className="text-gray-500 dark:text-gray-400">{isAr ? 'العقار المرتبط' : 'Related Property'}</p>
                                                <p className="font-semibold text-gray-800 dark:text-gray-200 mt-0.5">{payload.propertyTitle}</p>
                                            </div>
                                        )}
                                    </div>

                                    {(payload.customerNotes || payload.message || payload.details) && (
                                        <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">{isAr ? 'نص الطلب / الملاحظات' : 'Customer Notes / Inquiry'}</p>
                                            <p className="text-sm bg-gray-50 dark:bg-gray-800/60 p-3 rounded-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                                {payload.customerNotes || payload.message || payload.details}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'conversation' && (
                        <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <ConversationThread
                                lead={leadRepresentation}
                                requestId={request.id}
                                onMessageSent={() => {
                                    queryClient.invalidateQueries({ queryKey: ['requestMessages', request.id] });
                                    queryClient.invalidateQueries({ queryKey: ['myCustomerRequests'] });
                                    queryClient.invalidateQueries({ queryKey: ['request', request.id] });
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-8">
                                    {isAr ? 'لا توجد حركات مسجلة لهذا الطلب حتى الآن.' : 'No audit history recorded yet.'}
                                </p>
                            ) : (
                                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700">
                                    {history.map(item => (
                                        <div key={item.id} className="relative">
                                            <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-gray-900" />
                                            <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs space-y-1">
                                                <div className="flex justify-between items-center text-gray-500">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{item.action}</span>
                                                    <span>{new Date(item.createdAt).toLocaleDateString(language)} {new Date(item.createdAt).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                {item.note && <p className="text-gray-700 dark:text-gray-300">{item.note}</p>}
                                                {item.newStatus && (
                                                    <p className="text-[11px] text-gray-400">
                                                        {isAr ? 'الحالة:' : 'Status:'} <span className="font-mono">{item.newStatus}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientGeneralRequestDetailsModal;
