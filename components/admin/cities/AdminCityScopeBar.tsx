import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../shared/LanguageContext';
import { useCityStore } from '../../../store/useCityStore';
import { useAuth } from '../../auth/AuthContext';
import { Permission } from '../../../types';
import {
    getAccessibleCitiesForUser,
    isGlobalCityAdmin,
    resolveAdminDefaultScope,
} from '../../../utils/cityScope';
import { GlobeAltIcon } from '../../ui/Icons';

const AdminCityScopeBar: React.FC = () => {
    const { language } = useLanguage();
    const navigate = useNavigate();
    const { currentUser, hasPermission } = useAuth();
    const cities = useCityStore((s) => s.cities);
    const adminCityScope = useCityStore((s) => s.adminCityScope);
    const setAdminCityScope = useCityStore((s) => s.setAdminCityScope);
    const switchToCity = useCityStore((s) => s.switchToCity);
    const switchToHub = useCityStore((s) => s.switchToHub);

    const canAccessAllCities = isGlobalCityAdmin(currentUser);
    const canManageCities = hasPermission(Permission.MANAGE_CITIES);
    const activeCities = cities.filter((c) => c.isActive);
    const accessibleCities = getAccessibleCitiesForUser(activeCities, currentUser);
    const effectiveScope = resolveAdminDefaultScope(currentUser, adminCityScope);
    const scopedCity = cities.find((c) => c.id === effectiveScope);

    const handlePreviewScope = () => {
        if (effectiveScope === 'all') {
            switchToHub();
            navigate('/');
        } else {
            switchToCity(effectiveScope);
            navigate('/');
        }
    };

    return (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-2xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                    <GlobeAltIcon className="w-4 h-4 text-amber-600" />
                    <span>
                        {language === 'ar' ? 'نطاق التحكم التشغيلي:' : 'Operational City Scope:'}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                    {canAccessAllCities && (
                        <button
                            type="button"
                            onClick={() => setAdminCityScope('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                effectiveScope === 'all'
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {language === 'ar' ? 'كل المدن (Only Property)' : 'All Cities (Global)'}
                        </button>
                    )}

                    {accessibleCities.map((city) => (
                        <button
                            key={city.id}
                            type="button"
                            onClick={() => setAdminCityScope(city.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                effectiveScope === city.id
                                    ? 'bg-amber-500 text-gray-950 font-bold'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {city.name[language]} · <span className="font-mono text-[11px]">{city.slug}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2.5 text-xs">
                {scopedCity ? (
                    <span className="font-mono text-gray-500 hidden sm:inline">
                        {scopedCity.subdomain}
                    </span>
                ) : (
                    <span className="font-mono text-gray-500 hidden sm:inline">
                        *.only-property.com ({accessibleCities.length} {language === 'ar' ? 'مدن' : 'cities'})
                    </span>
                )}

                <button
                    type="button"
                    onClick={handlePreviewScope}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-amber-500 hover:text-amber-600 font-semibold transition-colors"
                >
                    {language === 'ar' ? 'معاينة البوابة' : 'Preview Portal'}
                </button>

                {canManageCities && (
                    <Link
                        to="/admin/cities"
                        className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold transition-colors"
                    >
                        {language === 'ar' ? 'إدارة المدن والنطاقات' : 'Manage Cities & Subdomains'}
                    </Link>
                )}
            </div>
        </div>
    );
};

export default AdminCityScopeBar;
