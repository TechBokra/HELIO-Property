

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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const mutation = useMutation({
        mutationFn: (messageData: Omit<LeadMessage, 'id' | 'timestamp'>) => addMessageToLead(requestId, messageData),
        onSuccess: () => {
            setNewMessage('');
            onMessageSent();
        },
        onError: () => {
            showToast('Failed to send message.', 'error');
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !currentUser) return;
        
        const senderType = currentUser.role === Role.SUPER_ADMIN || currentUser.role.includes('_manager') ? 'admin' : 'partner';
        
        mutation.mutate({
            sender: senderType,
            senderId: currentUser.id,
            type: messageType,
            content: newMessage,
        });
    };
    
    const getSenderName = (message: LeadMessage) => {
        if (message.sender === 'client') return 'Client';
        if (message.sender === 'system') return 'System';
        if (message.senderId === currentUser?.id) return 'You';
        
        const senderInfo = t.partnerInfo[message.senderId || ''];
        return senderInfo?.name || message.sender;
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
                {messages.length === 0 ? (
                     <div className="text-center text-sm text-gray-500 dark:text-gray-400 h-full flex items-center justify-center py-8">
                        No messages or notes yet.
                     </div>
                ) : (
                    messages.map(msg => (
                        <div 
                            key={msg.id}
                            className={`p-3 rounded-lg max-w-[80%] break-words
                                ${msg.type === 'note' ? (msg.sender === 'system' ? 'chat-bubble-note' : 'chat-bubble-note') : ''}
                                ${msg.sender === 'system' ? 'chat-bubble-note' : (msg.sender === 'partner' || msg.sender === 'admin' ? 'chat-bubble-sent' : 'chat-bubble-received')}
                            `}
                        >
                            <p className="text-sm">{msg.content}</p>
                            <p className={`text-xs opacity-70 mt-1 ${msg.type === 'note' || msg.sender === 'system' ? 'text-center' : (msg.sender === 'partner' || msg.sender === 'admin' ? 'text-right' : 'text-left')}`}>
                                {getSenderName(msg)} - {new Date(msg.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit}>
                <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={messageType === 'message' ? 'Add a new note...' : 'Add a new internal note...'}
                    className="mb-2"
                    rows={3}
                    disabled={mutation.isPending}
                />
                <div className="flex justify-end items-center">
                    <Button type="submit" isLoading={mutation.isPending} disabled={!newMessage.trim()}>
                        Add Note
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ConversationThread;