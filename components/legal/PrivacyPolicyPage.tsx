
import React from 'react';
import { useLanguage } from '../shared/LanguageContext';
import { useSiteContent } from '../../hooks/useSiteContent';

const PrivacyPolicyPage: React.FC = () => {
  const { language } = useLanguage();
  const { data: siteContent, isLoading } = useSiteContent();

  if (isLoading || !siteContent?.privacyPolicy) {
      return (
          <div className="py-20 container mx-auto px-6 max-w-4xl animate-pulse">
              <div className="h-10 w-64 bg-gray-200 mx-auto mb-8 rounded"></div>
              <div className="space-y-6">
                  <div className="h-6 w-48 bg-gray-200 rounded"></div>
                  <div className="h-24 w-full bg-gray-200 rounded"></div>
                  <div className="h-6 w-48 bg-gray-200 rounded"></div>
                  <div className="h-24 w-full bg-gray-200 rounded"></div>
              </div>
          </div>
      );
  }

  const content = siteContent.privacyPolicy[language];

  return (
    <div className="bg-white py-20">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900">{content.title}</h1>
          <p className="mt-4 text-sm text-gray-500">{content.lastUpdated}</p>
        </div>
        <div className="prose prose-lg max-w-none mx-auto space-y-8">
          {content.sections.map((section: any, index: number) => (
            <div key={index}>
              <h2 className="!text-amber-500 !font-bold text-xl mb-4">{section.title}</h2>
              <p className="whitespace-pre-line text-gray-700 leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
