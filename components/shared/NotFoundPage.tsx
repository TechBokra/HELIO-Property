
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from './LanguageContext';
import { HomeIcon, ExclamationCircleIcon } from '../ui/Icons';

const NotFoundPage: React.FC = () => {
  const { t } = useLanguage();
  const t_page = t.notFoundPage;

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300">
        <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationCircleIcon className="w-12 h-12" />
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-200 mb-4">
          {t_page.title}
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          {t_page.subtitle}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 text-sm font-bold text-gray-900 shadow-lg shadow-amber-500/30 hover:bg-amber-600 hover:shadow-amber-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 transition-all duration-200"
        >
          <HomeIcon className="w-5 h-5" />
          {t_page.backButton}
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
