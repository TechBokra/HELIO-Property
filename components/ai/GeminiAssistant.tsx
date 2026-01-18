import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
// Fixed: Replaced non-existent SendIcon and ChatIcon with available alternatives from Icons list
import { ArrowRightIcon, InboxIcon, CloseIcon, SparklesIcon } from '../ui/Icons';
import { Spinner } from '../ui/Spinner';
import { useLanguage } from '../shared/LanguageContext';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const GeminiAssistant: React.FC = () => {
    const { language, t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const systemInstruction = `
        You are an expert AI Real Estate and Interior Design assistant for the "ONLY HELIO" platform.
        You specialize in the city of "New Heliopolis" (Heliopolis El Gedida) in Egypt.
        Your goal is to help users find properties, understand finishing packages, and get decoration ideas.
        Be polite, professional, and helpful. 
        Always respond in the user's language: ${language === 'ar' ? 'Arabic' : 'English'}.
        If the user asks about specific pricing, refer them to the "Finishing" page.
        If they want to list a property, tell them to use the "List Your Property" button in the header.
        Knowledge context: New Heliopolis has several districts (Distinguished, 1st, 2nd, etc.) and many modern compounds like SODIC East and Al Burouj.
    `;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            // Fixed: Initializing GoogleGenAI from process.env.API_KEY as per guidelines
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                // Passing simple string for contents is supported and recommended for single-turn text
                contents: userMsg,
                config: {
                    systemInstruction,
                    temperature: 0.7,
                }
            });

            // Fixed: Using response.text getter directly (not a method call) as per latest SDK guidelines
            const aiText = response.text || (language === 'ar' ? 'عذراً، لم أستطع معالجة طلبك.' : 'Sorry, I couldn\'t process that.');
            setMessages(prev => [...prev, { role: 'model', text: aiText }]);
        } catch (error) {
            console.error("Gemini Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: 'Error connecting to AI service.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
            {isOpen && (
                <Card className="w-80 sm:w-96 h-[500px] mb-4 shadow-2xl flex flex-col animate-fadeIn border-amber-500/30">
                    <CardHeader className="p-4 bg-amber-500 text-gray-900 rounded-t-lg flex flex-row justify-between items-center space-y-0">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5" />
                            <CardTitle className="text-lg font-bold">Helio AI Assistant</CardTitle>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-900 hover:text-white transition-colors">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                {/* Fixed: Using InboxIcon as a fallback for ChatIcon */}
                                <InboxIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">{language === 'ar' ? 'اسألني أي شيء عن هليوبوليس الجديدة!' : 'Ask me anything about New Heliopolis!'}</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-amber-500 text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl">
                                    <Spinner size="sm" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question...'}
                                className="w-full pl-4 pr-12 py-2.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-amber-600 disabled:opacity-30 hover:text-amber-700"
                            >
                                {/* Fixed: Using ArrowRightIcon as a fallback for SendIcon */}
                                <ArrowRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </Card>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-amber-500 text-gray-900 p-4 rounded-full shadow-2xl hover:bg-amber-600 transition-all transform hover:scale-110 active:scale-95 group relative"
                aria-label="AI Assistant"
            >
                <SparklesIcon className="w-7 h-7" />
                {!isOpen && (
                    <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {language === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
                    </span>
                )}
            </button>
        </div>
    );
};

export default GeminiAssistant;