

import React from 'react';
import { Link } from 'react-router-dom';
import type { Language, Project, Partner } from '../../types';
import { BuildingIcon } from '../ui/Icons';
import { useLanguage } from './LanguageContext';

interface ProjectListItemProps {
    project: Project;
    developer?: Partner;
    unitsCount: number;
}

const ProjectListItem: React.FC<ProjectListItemProps> = React.memo(({ project, developer, unitsCount }) => {
    const { language, t } = useLanguage();
    const unitsText = unitsCount === 1 ? t.projectsPage.unitsAvailable : t.projectsPage.unitsAvailablePlural;

    return (
        <Link to={`/projects/${project.id}`} className="block">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group flex h-full">
                <div className="relative w-28 md:w-48 flex-shrink-0">
                    <img src={project.imageUrl} alt={project.name[language]} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-3 md:p-4 flex flex-col flex-grow">
                    <h3 className="text-sm md:text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-500 transition-colors">{project.name[language]}</h3>
                    {developer && (
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 my-1">{t.propertyCard.by} {developer.name}</p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">{project.description[language]}</p>
                    <div className="flex-grow"></div>
                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-3">
                       <BuildingIcon className="w-4 h-4 md:w-5 md:h-5" />
                       <span>{unitsCount} {unitsText}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
});

export default ProjectListItem;
