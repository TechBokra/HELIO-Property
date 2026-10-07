
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { PartnerType, SubscriptionPlan, PlanCategory, OfficialDocument } from '../../types';
import FormField from '../ui/FormField';
import { CheckCircleIcon, ClipboardDocumentListIcon } from '../ui/Icons';
import { SiteIdentity } from '../shared/SiteIdentity';
import { submitIntake } from '../../services/intake';
import { uploadFile } from '../../services/upload';
import { RequestType } from '../../types';
import SubscriptionPlanSelector from '../shared/SubscriptionPlanSelector';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { commonSchemas } from '../../utils/validation';

// Validation Schema using centralized utils
const registerSchema = z.object({
    companyName: commonSchemas.name,
    contactName: commonSchemas.name,
    contactEmail: commonSchemas.email,
    contactPhone: commonSchemas.phoneEG,
    companyAddress: z.string().min(5, "Address is too short"),
    website: commonSchemas.url,
    description: z.string().min(20, "Description must be at least 20 characters"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const PLAN_PRICES: Record<string, Record<string, number>> = {
    developer: { basic: 0, professional: 5000, elite: 15000 },
    agency: { basic: 0, professional: 2000, elite: 5000 },
    finishing: { commission: 0, professional: 3000, elite: 8000 },
};

const Stepper: React.FC<{ steps: string[], currentStep: number }> = ({ steps, currentStep }) => {
    return (
        <nav aria-label="Progress">
            <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
                {steps.map((stepName, stepIdx) => (
                    <li key={stepName} className="md:flex-1">
                         <div className={`group flex w-full flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 transition-colors ${currentStep > stepIdx ? 'border-amber-600 text-amber-600' : currentStep === stepIdx + 1 ? 'border-amber-600 text-amber-600' : 'border-gray-200 text-gray-500'}`}>
                            <span className="text-sm font-medium">{`Step ${stepIdx + 1}`}</span>
                            <span className="text-sm font-medium">{stepName}</span>
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

const RegisterPage: React.FC = () => {
    const { language, t } = useLanguage();
    const t_page = t.partnerRequestForm;
    const { showToast } = useToast();
    const navigate = useNavigate();
    
    const [currentStep, setCurrentStep] = useState(1);
    const [formSubmitted, setFormSubmitted] = useState(false);
    
    const [companyType, setCompanyType] = useState<PartnerType | ''>('');
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | ''>('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [docFiles, setDocFiles] = useState<FileList | null>(null);

    // Initialize Hook Form with Zod Resolver
    const { register, handleSubmit, formState: { errors, isValid }, trigger } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        mode: 'onBlur'
    });

    const mutation = useMutation({
        mutationFn: (intakeParams: any) => submitIntake(intakeParams),
        onSuccess: () => {
            setFormSubmitted(true);
            window.scrollTo(0, 0);
        },
        onError: (error: any) => {
            console.error("Submission failed:", error);
            showToast(error.message || 'Submission failed. Please try again.', 'error');
        }
    });

    const nextStep = async () => {
        if (currentStep === 1) {
            if (companyType && selectedPlan) setCurrentStep(2);
        } else if (currentStep === 2) {
            const isStepValid = await trigger(); // Validate Step 2 fields
            if (isStepValid) setCurrentStep(3);
        }
    };
    
    const prevStep = () => setCurrentStep(prev => prev - 1);

    const handleFinalSubmit = async (data: RegisterFormData) => {
        if (!logoFile) {
            showToast("Please upload a company logo.", "error");
            return;
        }
        
        let logoUrl = '';
        try {
            logoUrl = await uploadFile(logoFile);
        } catch (e: any) {
            console.error("Logo upload error", e);
            showToast(e.message || "Failed to upload logo", "error");
            return;
        }

        let officialDocs: OfficialDocument[] = [];
        if (docFiles) {
            const filesArray = Array.from(docFiles);
            const uploadPromises = filesArray.map(async (file: File) => {
                const url = await uploadFile(file);
                return {
                    fileName: file.name,
                    fileContent: url,
                    url: url,
                };
            });
            try {
                officialDocs = await Promise.all(uploadPromises);
            } catch (e: any) {
                console.error("Doc upload error", e);
                showToast(e.message || "Failed to upload document", "error");
                return;
            }
        }
        
        const finalData = {
            companyType,
            subscriptionPlan: selectedPlan,
            ...data,
            logo: logoUrl,
            documents: officialDocs,
            managementContacts: [] 
        };

        const typeKey = companyType as string;
        const planKey = selectedPlan as string;
        const price = PLAN_PRICES[typeKey]?.[planKey] || 0;

        if (price > 0) {
             navigate('/payment', { 
                state: { 
                    amount: price,
                    description: `Partner Subscription: ${companyType} (${selectedPlan})`,
                    type: 'subscription_fee',
                    userId: data.contactEmail, 
                    userName: data.companyName,
                    data: finalData
                } 
            });
        } else {
            mutation.mutate({
                formSlug: 'partner-application',
                requestType: RequestType.PARTNER_APPLICATION,
                domain: 'partners',
                formData: {
                    companyName: data.companyName,
                    companyType,
                    contactName: data.contactName,
                    contactPhone: data.contactPhone,
                    contactEmail: data.contactEmail,
                    companyAddress: data.companyAddress,
                    website: data.website,
                    description: data.description,
                    subscriptionPlan: selectedPlan,
                    logo: logoUrl,
                    documents: officialDocs,
                },
                contextData: {
                    companyType,
                    subscriptionPlan: selectedPlan,
                    documents: officialDocs,
                    logo: logoUrl,
                }
            });
        }
    };
    
    if (formSubmitted) {
        return (
            <div className="py-20 bg-white flex items-center justify-center text-center">
                <div className="max-w-xl">
                    <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-6" />
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.auth.registerSuccessTitle}</h1>
                    <p className="text-lg text-gray-600 mb-8">{t.auth.registerSuccessMessage}</p>
                    <Link to="/" className="bg-amber-50 text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-amber-600 transition-colors">
                        {t.addPropertyPage.backToHome}
                    </Link>
                </div>
            </div>
        )
    }

    const steps = [t_page.step1_title, t_page.step2_title, t_page.step3_title];

    return (
        <div className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                 <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block mb-4">
                            <SiteIdentity className="justify-center text-amber-500" textClassName="text-2xl" hideTextOnMobile={false} />
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-800">{t.auth.registerTitle}</h1>
                        <p className="mt-2 text-gray-600">{t.auth.registerSubtitle}</p>
                    </div>
                    
                    <div className="mb-12">
                        <Stepper steps={steps} currentStep={currentStep} />
                    </div>

                    {currentStep === 1 && (
                        <section className="animate-fadeIn">
                            <h2 className="text-2xl font-bold mb-2">{t_page.step1_title}</h2>
                            <p className="text-gray-500 mb-6">{t_page.step1_subtitle}</p>
                            
                            <FormField label={t_page.companyType} id="companyType">
                                <Select 
                                    value={companyType} 
                                    onChange={(e) => { setCompanyType(e.target.value as PartnerType); setSelectedPlan(''); }}
                                >
                                    <option value="" disabled>{t_page.selectType}</option>
                                    <option value="developer">{t_page.developer}</option>
                                    <option value="finishing">{t_page.finishing}</option>
                                    <option value="agency">{t_page.agency}</option>
                                </Select>
                            </FormField>
                            
                            {companyType && (
                                <div className="mt-8">
                                    <SubscriptionPlanSelector 
                                        partnerType={companyType as PlanCategory}
                                        selectedPlan={selectedPlan}
                                        onSelectPlan={(plan) => setSelectedPlan(plan)}
                                    />
                                </div>
                            )}
                            
                            <div className="mt-8 flex justify-end">
                                <Button onClick={nextStep} disabled={!companyType || !selectedPlan}>
                                    {t_page.next}
                                </Button>
                            </div>
                        </section>
                    )}
                    
                    {currentStep === 2 && (
                        <section className="animate-fadeIn">
                            <h2 className="text-2xl font-bold mb-2">{t_page.step2_title}</h2>
                            <p className="text-gray-500 mb-6">{t_page.step2_subtitle}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField label={t_page.companyName} id="companyName" error={errors.companyName?.message}>
                                    <Input {...register('companyName')} />
                                </FormField>
                                <FormField label={t_page.companyAddress} id="companyAddress" error={errors.companyAddress?.message}>
                                    <Input {...register('companyAddress')} />
                                </FormField>
                                <FormField label={t_page.contactName} id="contactName" error={errors.contactName?.message}>
                                    <Input {...register('contactName')} />
                                </FormField>
                                <FormField label={t_page.contactPhone} id="contactPhone" error={errors.contactPhone?.message}>
                                    <Input {...register('contactPhone')} placeholder="01xxxxxxxxx" />
                                </FormField>
                                <FormField label={t_page.contactEmail} id="contactEmail" error={errors.contactEmail?.message}>
                                    <Input {...register('contactEmail')} type="email" />
                                </FormField>
                                <FormField label={t_page.website} id="website" error={errors.website?.message}>
                                    <Input {...register('website')} placeholder="https://..." />
                                </FormField>
                            </div>
                            <div className="mt-6">
                                 <FormField label={t_page.companyDescription} id="description" error={errors.description?.message}>
                                    <textarea {...register('description')} className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none" rows={4} />
                                </FormField>
                            </div>
                            
                            <div className="mt-8 flex justify-between">
                                <Button type="button" variant="secondary" onClick={prevStep}>{t_page.back}</Button>
                                <Button type="button" onClick={nextStep}>{t_page.next}</Button>
                            </div>
                        </section>
                    )}
                    
                    {currentStep === 3 && (
                         <section className="animate-fadeIn space-y-6">
                            <h2 className="text-2xl font-bold mb-2">{t_page.step3_title}</h2>
                            <p className="text-gray-500 mb-6">{t_page.step3_subtitle}</p>

                            <form onSubmit={handleSubmit(handleFinalSubmit)} className="space-y-6">
                                <FormField label={t_page.companyLogo} id="logo">
                                    <Input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files ? e.target.files[0] : null)} required />
                                </FormField>
                                
                                <FormField label={t_page.officialDocs} id="documents">
                                    <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg bg-gray-50">
                                        <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400"/>
                                        <Input type="file" multiple onChange={(e) => setDocFiles(e.target.files)} />
                                    </div>
                                </FormField>

                                {selectedPlan && companyType && PLAN_PRICES[companyType]?.[selectedPlan] > 0 && (
                                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 mt-6">
                                        <p className="font-semibold text-amber-800">Payment Required</p>
                                        <p className="text-sm text-amber-700">
                                            You have selected the <strong>{selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}</strong> plan. 
                                            A payment of <strong>{PLAN_PRICES[companyType][selectedPlan].toLocaleString()} EGP</strong> will be required upon submission.
                                        </p>
                                    </div>
                                )}

                                <div className="mt-12 flex justify-between">
                                    <Button type="button" variant="secondary" onClick={prevStep}>{t_page.back}</Button>
                                    <Button type="submit" isLoading={mutation.isPending}>
                                        {selectedPlan && companyType && PLAN_PRICES[companyType]?.[selectedPlan] > 0 
                                            ? (language === 'ar' ? 'متابعة للدفع' : 'Proceed to Payment') 
                                            : t_page.submitRequest}
                                    </Button>
                                </div>
                            </form>
                        </section>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default RegisterPage;
