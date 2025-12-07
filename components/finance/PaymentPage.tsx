
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createTransaction } from '../../services/finance';
import { getContent } from '../../services/content';
import { addRequest } from '../../services/requests';
import { addLead } from '../../services/leads';
import { upgradePartnerPlan } from '../../services/partners';
import { RequestType } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { CheckCircleIcon, CreditCardIcon, PhoneIcon, ArrowLeftIcon, LockClosedIcon, ClockIcon, ArrowRightIcon } from '../ui/Icons';
import type { TransactionType, PaymentMethod } from '../../types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/Card';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const PaymentPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    
    const { data: siteContent, isLoading: isLoadingContent } = useQuery({ queryKey: ['siteContent'], queryFn: getContent });
    
    // Payment State
    const [amount, setAmount] = useState<number>(0);
    const [description, setDescription] = useState<string>('');
    const [type, setType] = useState<TransactionType>('subscription_fee');
    const [userId, setUserId] = useState<string>('');
    const [userName, setUserName] = useState<string>('');
    const [contextData, setContextData] = useState<any>(null); 
    const [isValidSession, setIsValidSession] = useState(false);

    const [method, setMethod] = useState<PaymentMethod | null>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);
    const [transactionId, setTransactionId] = useState<string>('');

    useEffect(() => {
        if (location.state) {
            const { amount, description, type, userId, userName, data } = location.state;
            setAmount(amount || 0);
            setDescription(description || '');
            setType(type || 'subscription_fee');
            setUserId(userId || '');
            setUserName(userName || '');
            setContextData(data || null);
            setIsValidSession(true);
        } else {
            // Redirect immediately if no state is present to avoid flashing empty page
            navigate('/', { replace: true });
        }
    }, [location, navigate]);

    // Set default method based on enabled config
    useEffect(() => {
        if (siteContent?.paymentConfiguration) {
            const { instapay, paymob } = siteContent.paymentConfiguration;
            if (instapay.enabled && !paymob.enabled) setMethod('instapay');
            else if (!instapay.enabled && paymob.enabled) setMethod('card');
            else if (instapay.enabled && paymob.enabled) setMethod('instapay'); 
        }
    }, [siteContent]);

    const transactionMutation = useMutation({
        mutationFn: createTransaction,
        onSuccess: async (transaction) => {
            setTransactionId(transaction.id);
            setIsSuccess(true);
            const paymentStatus = transaction.status; 
            
            try {
                if (contextData) {
                    if (type === 'subscription_fee') {
                        if (contextData.isUpgrade) {
                            if (paymentStatus === 'paid') {
                                await upgradePartnerPlan(contextData.partnerId, contextData.newPlan);
                            }
                        } else {
                             await addRequest(RequestType.PARTNER_APPLICATION, {
                                requesterInfo: { name: contextData.contactName, phone: contextData.contactPhone, email: contextData.contactEmail },
                                payload: { ...contextData, paymentStatus: paymentStatus } 
                            });
                        }
                    } else if (type === 'listing_fee') {
                        const { requesterInfo, payload } = contextData;
                        await addRequest(RequestType.PROPERTY_LISTING_REQUEST, {
                            requesterInfo,
                            payload: { ...payload, paymentStatus: paymentStatus }
                        });
                    } else if (type === 'service_payment' || type === 'product_purchase') {
                        await addLead({
                            ...contextData,
                            customerNotes: `${contextData.customerNotes || ''}\n[Payment Transaction: ${transaction.id} - ${transaction.status.toUpperCase()}]`,
                            status: 'new'
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to submit request after payment", e);
                showToast("Payment recorded, but request submission failed. Please contact support.", "error");
            }
        },
        onError: () => {
            showToast('Payment failed. Please try again.', 'error');
        }
    });

    const handleSubmit = async () => {
        let receiptUrl = undefined;
        
        if (!method) {
             showToast("Please select a payment method", "error");
             return;
        }

        if (method === 'instapay') {
            if (!receiptFile) {
                showToast(language === 'ar' ? 'يرجى رفع صورة الإيصال' : 'Please upload receipt image', 'error');
                return;
            }
            receiptUrl = await fileToBase64(receiptFile);
        }

        transactionMutation.mutate({
            userId: userId || 'guest',
            userName: userName || 'Guest',
            amount,
            currency: 'EGP',
            type,
            description,
            method,
            receiptUrl
        });
    };

    // Don't render anything until we verify the session or redirect
    if (!isValidSession) return null;
    if (isLoadingContent) return <div className="p-10 text-center flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;
    
    const config = siteContent?.paymentConfiguration;

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                <Card className="max-w-md w-full text-center p-8 animate-fadeIn shadow-xl border-t-4 border-t-green-500">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${method === 'card' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {method === 'card' ? <CheckCircleIcon className="w-10 h-10" /> : <ClockIcon className="w-10 h-10" />}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {method === 'card' 
                            ? (language === 'ar' ? 'تم الدفع بنجاح!' : 'Payment Successful!') 
                            : (language === 'ar' ? 'تم إرسال الطلب للمراجعة' : 'Payment Submitted for Review')}
                    </h2>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                        {method === 'card'
                            ? (language === 'ar' ? 'تمت عملية الدفع بنجاح وتأكيد طلبك.' : 'Your payment was processed successfully and your request is confirmed.')
                            : (language === 'ar' ? 'تم استلام إيصال التحويل. سيقوم فريقنا بمراجعة الطلب وتفعيله في أقرب وقت.' : 'Receipt received. Our team will review the transaction and activate your request shortly.')}
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-8 text-sm text-left">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">{language === 'ar' ? 'رقم المعاملة:' : 'Transaction ID:'}</span>
                            <span className="font-mono font-semibold">{transactionId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">{language === 'ar' ? 'المبلغ:' : 'Amount:'}</span>
                            <span className="font-semibold text-amber-600">{amount.toLocaleString()} EGP</span>
                        </div>
                    </div>

                    <Button onClick={() => navigate(contextData?.isUpgrade ? '/dashboard/subscription' : '/')} className="w-full">
                        {language === 'ar' ? 'العودة للقائمة الرئيسية' : 'Return to Home'}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors">
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    {language === 'ar' ? 'إلغاء وعودة' : 'Cancel & Return'}
                </button>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Order Summary */}
                    <div className="md:col-span-1">
                        <Card className="bg-white dark:bg-gray-800 sticky top-8">
                            <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                                <CardTitle className="text-lg">{language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'الوصف' : 'Description'}</p>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{description}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{language === 'ar' ? 'المستخدم' : 'User'}</p>
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{userName}</p>
                                </div>
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-gray-900 dark:text-white">{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                                        <span className="text-2xl font-bold text-amber-600 dark:text-amber-500">{amount.toLocaleString()} <span className="text-sm">EGP</span></span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Payment Options */}
                    <div className="md:col-span-2">
                        <Card className="bg-white dark:bg-gray-800">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <LockClosedIcon className="w-5 h-5 text-green-600" />
                                    {language === 'ar' ? 'دفع آمن' : 'Secure Payment'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                        {language === 'ar' ? 'اختر طريقة الدفع' : 'Select Payment Method'}
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {config?.instapay.enabled && (
                                            <button
                                                type="button"
                                                onClick={() => setMethod('instapay')}
                                                className={`p-4 border rounded-xl flex items-center gap-4 transition-all ${method === 'instapay' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500' : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'}`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                                                    <PhoneIcon className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="font-bold block text-gray-900 dark:text-white">InstaPay</span>
                                                    <span className="text-xs text-gray-500">Transfer & Upload Receipt</span>
                                                </div>
                                                {method === 'instapay' && <CheckCircleIcon className="w-6 h-6 text-amber-600 ml-auto" />}
                                            </button>
                                        )}
                                        
                                        {config?.paymob.enabled && (
                                            <button
                                                type="button"
                                                onClick={() => setMethod('card')}
                                                className={`p-4 border rounded-xl flex items-center gap-4 transition-all ${method === 'card' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-500' : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'}`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                                    <CreditCardIcon className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <span className="font-bold block text-gray-900 dark:text-white">Credit Card</span>
                                                    <span className="text-xs text-gray-500">Secure Online Payment</span>
                                                </div>
                                                 {method === 'card' && <CheckCircleIcon className="w-6 h-6 text-amber-600 ml-auto" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[200px]">
                                    {method === 'instapay' && (
                                        <div className="space-y-6 animate-fadeIn">
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{language === 'ar' ? 'بيانات التحويل' : 'Transfer Details'}</h4>
                                                
                                                {config?.instapay.qrCodeUrl && (
                                                    <div className="mb-4 flex justify-center">
                                                        <img src={config.instapay.qrCodeUrl} alt="InstaPay QR Code" className="w-48 h-48 object-contain border-4 border-white rounded-lg shadow-md" />
                                                    </div>
                                                )}
                                                
                                                {config?.instapay.paymentLink && (
                                                    <a 
                                                        href={config.instapay.paymentLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="block w-full text-center bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition-colors mb-4"
                                                    >
                                                        {language === 'ar' ? 'اضغط للدفع عبر InstaPay' : 'Click to Pay via InstaPay'} <ArrowRightIcon className="w-4 h-4 inline-block ml-1" />
                                                    </a>
                                                )}
                                                
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                                                    {config?.instapay.instructions[language]}
                                                </p>
                                                
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                                        <span className="text-gray-500 text-sm">Wallet Number</span>
                                                        <span className="font-mono font-bold text-lg select-all text-amber-600">{config?.instapay.number}</span>
                                                    </div>
                                                    {config?.instapay.walletName && (
                                                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                                            <span className="text-gray-500 text-sm">Name</span>
                                                            <span className="font-bold text-gray-800 dark:text-white">{config.instapay.walletName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{language === 'ar' ? 'صورة الإيصال' : 'Upload Receipt'}</label>
                                                <Input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)} className="bg-white dark:bg-gray-800" />
                                                <p className="text-xs text-gray-400 mt-1">Please upload a clear screenshot of the transaction.</p>
                                            </div>
                                        </div>
                                    )}

                                    {method === 'card' && (
                                         <div className="text-center py-8 animate-fadeIn">
                                            <CreditCardIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                                                {language === 'ar' ? 'الدفع عبر الإنترنت' : 'Online Payment'}
                                            </p>
                                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                                {language === 'ar' 
                                                    ? 'سيتم إعادة توجيهك إلى بوابة الدفع الآمنة Paymob لإتمام العملية.' 
                                                    : 'You will be redirected to the secure Paymob payment gateway to complete your transaction.'}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {!method && (
                                        <div className="text-center py-12 text-gray-400">
                                            Select a payment method to proceed.
                                        </div>
                                    )}
                                </div>

                            </CardContent>
                            <CardFooter className="border-t border-gray-100 dark:border-gray-700 pt-6">
                                <Button 
                                    onClick={handleSubmit} 
                                    isLoading={transactionMutation.isPending} 
                                    className="w-full text-lg py-6"
                                    disabled={!method}
                                >
                                    {method === 'card' 
                                        ? (language === 'ar' ? `دفع ${amount.toLocaleString()} EGP` : `Pay ${amount.toLocaleString()} EGP`) 
                                        : (language === 'ar' ? 'تأكيد التحويل' : 'Confirm Transfer')
                                    }
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
