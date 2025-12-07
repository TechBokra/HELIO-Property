import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllPartnersForAdmin } from '@/services/partners';
import { getAllProperties } from '@/services/properties';
import { getAllProjects } from '@/services/projects';
import { SearchIcon, CloseIcon } from '@/components/ui/Icons';
import { useDebounce } from '@/hooks/useDebounce';
import { useLanguage } from '@/components/shared/LanguageContext';

const GlobalSearch: React.FC = () => {
    const { language } = useLanguage();
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const debouncedQuery = useDebounce(query, 300);
    const navigate = useNavigate();
    const searchRef = useRef<HTMLDivElement>(null);

    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartners'], queryFn: getAllPartnersForAdmin, enabled: isFocused });
    const { data: properties, isLoading: loadingProperties } = useQuery({ queryKey: ['allProperties'], queryFn: getAllProperties, enabled: isFocused });
    const { data: projects, isLoading: loadingProjects } = useQuery({ queryKey: ['allProjects'], queryFn: getAllProjects, enabled: isFocused });

    const isLoading = loadingPartners || loadingProperties || loadingProjects;

    const searchResults = useMemo(() => {
        if (!debouncedQuery) return null;

        const lowerQuery = debouncedQuery.toLowerCase();

        const filteredPartners = (partners || []).filter(p => 
            p.name.toLowerCase().includes(lowerQuery) || 
            (p.nameAr && p.nameAr.toLowerCase().includes(lowerQuery)) ||
            p.email.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);

        const filteredProperties = (properties || []).filter(p =>
            p.title.ar.toLowerCase().includes(lowerQuery) ||
            p.title.en.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);

        const filteredProjects = (projects || []).filter(p =>
            p.name.ar.toLowerCase().includes(lowerQuery) ||
            p.name.en.toLowerCase().includes(lowerQuery)
        ).slice(0, 5);

        if (filteredPartners.length === 0 && filteredProperties.length === 0 && filteredProjects.length === 0) {
            return null;
        }

        return { partners: filteredPartners, properties: filteredProperties, projects: filteredProjects };
    }, [debouncedQuery, partners, properties, projects]);
    
    const handleNavigation = (path: string) => {
        navigate(path);
        setQuery('');
        setIsFocused(false);
    };

    const clearSearch = () => {
        setQuery('');
        setIsFocused(false);
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative w-full max-w-lg" ref={searchRef}>
            <div className="relative">
                <SearchIcon className="absolute top-1/2 left-4 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder={language === 'ar' ? 'بحث شامل...' : 'Global search...'}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg py-2 pl-11 pr-10 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                />
                {query && (
                     <button onClick={clearSearch} className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                )}
            </div>

            {isFocused && query && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                    {isLoading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
                    {!isLoading && !searchResults && <div className="p-4 text-sm text-gray-500">{language === 'ar' ? 'لا توجد نتائج' : 'No results found.'}</div>}
                    
                    {searchResults?.partners && searchResults.partners.length > 0 && (
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <h3 className="p-3 text-xs font-bold text-gray-400 uppercase">Partners</h3>
                            <ul>
                                {searchResults.partners.map(p => (
                                    <li key={p.id}>
                                        <button onClick={() => handleNavigation(`/admin/partners?edit=${p.id}&highlight=${p.id}`)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3">
                                            <img src={p.imageUrl} className="w-8 h-8 rounded-full object-cover"/>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">{language === 'ar' ? p.nameAr : p.name}</p>
                                                <p className="text-xs text-gray-500">{p.email}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {searchResults?.properties && searchResults.properties.length > 0 && (
                        <div className="border-b border-gray-200 dark:border-gray-700">
                            <h3 className="p-3 text-xs font-bold text-gray-400 uppercase">Properties</h3>
                             <ul>
                                {searchResults.properties.map(p => (
                                    <li key={p.id}>
                                        <button onClick={() => handleNavigation(`/admin/properties/edit/${p.id}`)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3">
                                             <img src={p.imageUrl} className="w-8 h-8 rounded-md object-cover"/>
                                             <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">{p.title[language]}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {searchResults?.projects && searchResults.projects.length > 0 && (
                        <div>
                             <h3 className="p-3 text-xs font-bold text-gray-400 uppercase">Projects</h3>
                             <ul>
                                {searchResults.projects.map(p => (
                                    <li key={p.id}>
                                        <button onClick={() => handleNavigation(`/admin/projects/edit/${p.id}`)} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3">
                                             <img src={p.imageUrl} className="w-8 h-8 rounded-md object-cover"/>
                                             <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-white">{p.name[language]}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;