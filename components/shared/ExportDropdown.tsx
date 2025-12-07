

import React, { useState } from 'react';
import { FileDownloadIcon } from '../ui/Icons';
import { exportToCsv, exportToPdf } from '../../utils/exportUtils';
import { useLanguage } from './LanguageContext';

interface ExportDropdownProps<T> {
  data: T[];
  // FIX: Changed type to Record<string, string> to allow dot-notation paths for keys.
  columns: Record<string, string>;
  filename: string;
}

const ExportDropdown = <T extends Record<string, any>>({ data, columns, filename }: ExportDropdownProps<T>) => {
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const handleExportCsv = () => {
        exportToCsv(filename, columns, data);
        setIsOpen(false);
    };

    const handleExportPdf = () => {
        exportToPdf(filename, columns, data, language);
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-amber-500"
                >
                    <FileDownloadIcon className="h-5 w-5 mr-2" />
                    {language === 'ar' ? 'تصدير' : 'Export'}
                </button>
            </div>

            {isOpen && (
                <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                >
                    <div className="py-1" role="none">
                        <button
                            onClick={handleExportCsv}
                            className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            role="menuitem"
                        >
                            {language === 'ar' ? 'تصدير كـ CSV' : 'Export as CSV'}
                        </button>
                        <button
                            onClick={handleExportPdf}
                            className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                            role="menuitem"
                        >
                            {language === 'ar' ? 'تصدير كـ PDF' : 'Export as PDF'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExportDropdown;
