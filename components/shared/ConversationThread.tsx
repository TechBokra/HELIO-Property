

import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Lead, LeadMessage } from '../../types';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './ToastContext';
import { addMessageToLead } from '../../services/requests';
import { useLanguage } from './LanguageContext';
import { Role } from '../../types';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';

interface ConversationThreadProps {
  lead: Lead;
  requestId: string;
  onMessageSent: () => void;
}

const ConversationThread: React.FC<ConversationThreadProps> = ({ lead, requestId, onMessageSent }) => {
    const { language, t } = useLanguage();
    const { currentUser } = useAuth();
    const { showToast } = useToast();
    
    const [newMessage, setNewMessage] = useState('');
    const [messageType, setMessageType] = useState<'message' | 'note'>('note');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const messages = lead.messages || [];

    const isStaff = currentUser?.role === Role.SUPER_ADMIN || currentUser?.role?.includes('_manager');
    const isPartner = currentUser?.role?.includes('_partner') || (currentUser as any)?.type === 'finishing' || (currentUser as any)?.type === 'agency';
    const isClient = !isStaff && !isPartner;

    // Filter internal notes if viewer is a client
    const visibleMessages = isClient ? messages.filter(m => m.type === 'message') : messages;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [visibleMessages]);

    const mutation = useMutation({
        mutationFn: (messageData: Omit<LeadMessage, 'id' | 'timestamp'>) => addMessageToLead(requestId, messageData),
        onSuccess: () => {
            setNewMessage('');
            onMessageSent();
        },
        onError: () => {
            showToast(language === 'ar' ? 'فشل إرسال الرسالة.' : 'Failed to send message.', 'error');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;
        
        const senderType: 'admin' | 'partner' | 'client' = isStaff ? 'admin' : (isPartner ? 'partner' : 'client');
        const effectiveType: 'message' | 'note' = isClient ? 'message' : messageType;
        
        mutation.mutate({
            sender: senderType,
            senderId: currentUser.id,
            type: effectiveType,
            content: newMessage,
        });
    };
    
    const getSenderName = (message: LeadMessage) => {
        if (message.sender === 'client') return isClient && message.senderId === currentUser?.id ? (language === 'ar' ? 'أنت' : 'You') : (language === 'ar' ? 'العميل' : 'Client');
        if (message.sender === 'system') return language === 'ar' ? 'النظام' : 'System';
        if (message.senderId === currentUser?.id) return language === 'ar' ? 'أنت' : 'You';
        if (message.sender === 'admin') return language === 'ar' ? 'إدارة المنصة' : 'Platform Support';
        
        const senderInfo = t.partnerInfo[message.senderId || ''];
        return senderInfo?.name || (language === 'ar' ? 'المهندس / الشريك' : 'Partner');
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-b-lg flex flex-col gap-4">
             {(lead.contactTime || lead.customerNotes) && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 space-y-2">
                    {lead.contactTime && (
                         <div>
                            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">{t.dashboard.leadTable.contactTime}</p>
                            <p className="text-sm text-yellow-900 dark:text-yellow-200">{lead.contactTime}</p>
                        </div>
                    )}
                    {lead.customerNotes && (
                        <div>
                            <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300">{t.dashboard.leadTable.notes}</p>
                            <p className="text-sm text-yellow-900 dark:text-yellow-200 whitespace-pre-wrap">{lead.customerNotes}</p>
                        </div>
                    )}
                </div>
            )}
            <div className="flex-grow flex flex-col gap-3 p-2 bg-white dark:bg-gray-700/50 rounded-lg">
                {visibleMessages.length === 0 ? (
                     <div className="text-center text-sm text-gray-500 dark:text-gray-400 h-full flex items-center justify-center py-8">
                        {language === 'ar' ? 'لا توجد رسائل أو ملاحظات حتى الآن.' : 'No messages or notes yet.'}
                     </div>
                ) : (
                    visibleMessages.map(msg => (
                        <div 
                            key={msg.id}
                            className={`p-3 rounded-lg max-w-[80%] break-words
                                ${msg.type === 'note' ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-200' : ''}
                                ${msg.type !== 'note' ? (msg.sender === 'client' && isClient ? 'bg-amber-500 text-white ml-auto' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 mr-auto') : 'mx-auto w-full'}
                            `}
                        >
                            {msg.type === 'note' && (
                                <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                                    {language === 'ar' ? 'ملاحظة داخلية' : 'Internal Note'}
                                </p>
                            )}
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs opacity-70 mt-1 ${msg.type === 'note' ? 'text-center' : 'text-right'}`}>
                                {getSenderName(msg)} - {new Date(msg.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
                {!isClient && (
                    <div className="flex gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setMessageType('note')}
                            className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                messageType === 'note'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {language === 'ar' ? 'ملاحظة داخلية (للفريق)' : 'Internal Note'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMessageType('message')}
                            className={`px-2.5 py-1 rounded font-medium transition-colors ${
                                messageType === 'message'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {language === 'ar' ? 'رسالة للعميل' : 'Message to Client'}
                        </button>
                    </div>
                )}

                <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={
                        isClient
                            ? (language === 'ar' ? 'اكتب استفسارك أو رسالتك لمسؤول الخدمة هنا...' : 'Type your message or inquiry here...')
                            : (messageType === 'message' ? (language === 'ar' ? 'اكتب رسالة للعميل...' : 'Message to client...') : (language === 'ar' ? 'إضافة ملاحظة داخلية...' : 'Add an internal note...'))
                    }
                    className="mb-2"
                    rows={3}
                    disabled={mutation.isPending}
                />
                <div className="flex justify-end items-center">
                    <Button type="submit" isLoading={mutation.isPending} disabled={!newMessage.trim()}>
                        {isClient
                            ? (language === 'ar' ? 'إرسال الرسالة' : 'Send Message')
                            : (messageType === 'message' 
                                ? (language === 'ar' ? 'إرسال للعميل' : 'Send to Client') 
                                : (language === 'ar' ? 'إضافة الملاحظة' : 'Add Note'))}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ConversationThread;