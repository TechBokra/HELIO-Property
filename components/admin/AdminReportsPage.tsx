
import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { getAllLeads } from '../../services/leads';
import { getAllProperties } from '../../services/properties';
import { getAllPartnersForAdmin } from '../../services/partners';
import { exportToCsv, exportToPdf } from '../../utils/exportUtils';
import { inputClasses, selectClasses } from '../ui/FormField';
import { useLanguage } from '../shared/LanguageContext';
import { useToast } from '../shared/ToastContext';
import { Checkbox } from '../ui/Checkbox';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { ChartBarIcon, FileDownloadIcon, FunnelIcon, TableCellsIcon, CheckCircleIcon } from '../ui/Icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

type DataSourceType = 'leads' | 'properties' | 'partners';
type DateRangeShortcut = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';

interface FormData {
    dataSource: DataSourceType;
    columns: string[];
    dateRangeShortcut: DateRangeShortcut;
    startDate: string;
    endDate: string;
    statusFilter: string;
}

const AdminReportsPage: React.FC = () => {
    const { language, t } = useLanguage();
    const { showToast } = useToast();
    const t_reports = t.adminReports;
    
    const { register, watch, setValue } = useForm<FormData>({
        defaultValues: {
            dataSource: 'leads',
            columns: [],
            dateRangeShortcut: 'month',
            startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            statusFilter: 'all'
        }
    });

    const dataSource = watch('dataSource') || 'leads';
    const selectedColumns = watch('columns');
    const startDate = watch('startDate');
    const endDate = watch('endDate');
    const statusFilter = watch('statusFilter');
    const dateRangeShortcut = watch('dateRangeShortcut');

    // Fetch Data
    const { data: leads, isLoading: loadingLeads } = useQuery({ queryKey: ['allLeads'], queryFn: getAllLeads });
    const { data: properties, isLoading: loadingProps } = useQuery({ queryKey: ['allPropertiesAdmin'], queryFn: getAllProperties });
    const { data: partners, isLoading: loadingPartners } = useQuery({ queryKey: ['allPartnersAdmin'], queryFn: getAllPartnersForAdmin });

    // Configuration Definitions
    const columnDefinitions: Record<DataSourceType, Record<string, { label: string, path: string }>> = {
        leads: {
            customerName: { label: 'Customer Name', path: 'customerName' },
            customerPhone: { label: 'Phone', path: 'customerPhone' },
            serviceTitle: { label: 'Service', path: 'serviceTitle' },
            status: { label: 'Status', path: 'status' },
            createdAt: { label: 'Date', path: 'createdAt' },
            partnerName: { label: 'Assigned Partner', path: 'partnerName' }
        },
        properties: {
            title: { label: 'Title', path: `title.${language}` },
            type: { label: 'Type', path: `type.${language}` },
            status: { label: 'Listing Status', path: 'listingStatus' }, // Using listingStatus internally
            price: { label: 'Price', path: 'priceNumeric' },
            area: { label: 'Area (m²)', path: 'area' },
            location: { label: 'Location', path: `address.${language}` },
            partner: { label: 'Partner', path: 'partnerName' }
        },
        partners: {
            name: { label: 'Name', path: language === 'ar' ? 'nameAr' : 'name' },
            type: { label: 'Type', path: 'type' },
            email: { label: 'Email', path: 'email' },
            status: { label: 'Status', path: 'status' },
            plan: { label: 'Subscription Plan', path: 'subscriptionPlan' },
            joined: { label: 'Joined Date', path: 'createdAt' } 
        }
    };

    // Helper to handle Date Range Shortcuts
    const handleDateShortcut = (shortcut: DateRangeShortcut) => {
        const end = new Date();
        let start = new Date();
        
        switch (shortcut) {
            case 'today': start = end; break;
            case 'week': start.setDate(end.getDate() - 7); break;
            case 'month': start.setMonth(end.getMonth() - 1); break;
            case 'quarter': start.setMonth(end.getMonth() - 3); break;
            case 'year': start.setFullYear(end.getFullYear() - 1); break;
            case 'all': start = new Date('2020-01-01'); break;
        }
        
        setValue('startDate', start.toISOString().split('T')[0]);
        setValue('endDate', end.toISOString().split('T')[0]);
        setValue('dateRangeShortcut', shortcut);
    };

    // Helper to Select All Columns
    const handleSelectAllColumns = () => {
        const colDefs = columnDefinitions[dataSource];
        if (!colDefs) return;
        
        const allCols = Object.keys(colDefs);
        if (selectedColumns.length === allCols.length) {
            setValue('columns', []);
        } else {
            setValue('columns', allCols);
        }
    };

    // Filter Logic
    const filteredData = useMemo(() => {
        let data: any[] = [];
        if (dataSource === 'leads') data = leads || [];
        else if (dataSource === 'properties') data = properties || [];
        else if (dataSource === 'partners') data = partners || [];

        if (!data) return [];

        return data.filter(item => {
            // Date Filter
            const dateField = dataSource === 'properties' ? 'listingStartDate' : 'createdAt';
            const itemDateStr = (item as any)[dateField];
            const itemDate = itemDateStr ? new Date(itemDateStr) : new Date(0);
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59); // Include end of day

            const dateMatch = itemDate >= start && itemDate <= end;

            // Status Filter
            let statusMatch = true;
            if (statusFilter !== 'all') {
                const statusField = dataSource === 'properties' ? 'listingStatus' : 'status';
                const statusValue = (item as any)[statusField];
                statusMatch = statusValue === statusFilter;
            }

            return dateMatch && statusMatch;
        });
    }, [dataSource, leads, properties, partners, startDate, endDate, statusFilter]);

    // Chart Data Preparation
    const chartData = useMemo(() => {
        if (!filteredData.length) return null;

        // Group by Status for Doughnut
        const statusCounts: Record<string, number> = {};
        filteredData.forEach(item => {
            const statusField = dataSource === 'properties' ? 'listingStatus' : 'status';
            const status = (item as any)[statusField] || 'Unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        return {
            doughnut: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#FBBF24', '#F97316', '#D97706', '#B45309', '#78350F', '#10B981', '#EF4444'],
                    borderWidth: 0
                }]
            }
        };
    }, [filteredData, dataSource]);

    const handleExport = (type: 'csv' | 'pdf') => {
        if (selectedColumns.length === 0) {
            showToast(t_reports.noColumnsSelected, 'error');
            return;
        }
        
        const currentDefs = columnDefinitions[dataSource];
        if (!currentDefs) return;

        const columnsToExport = selectedColumns.reduce((acc, key) => {
            acc[key] = currentDefs[key]?.label || key;
            return acc;
        }, {} as Record<string, string>);

        // Map data to flat structure for export based on paths
        const flatData = filteredData.map(item => {
            const row: any = {};
            selectedColumns.forEach(colKey => {
                const path = currentDefs[colKey]?.path;
                // Simple path resolution if path exists
                row[colKey] = path ? path.split('.').reduce((o, i) => o?.[i], item) : '';
            });
            return row;
        });

        const filename = `${dataSource}_report_${new Date().toISOString().split('T')[0]}`;

        if (type === 'csv') {
            exportToCsv(filename, columnsToExport, flatData);
        } else {
            exportToPdf(filename, columnsToExport, flatData, language);
        }
    };
    
    // Set default columns on datasource change
    React.useEffect(() => {
        const currentDefs = columnDefinitions[dataSource];
        if (currentDefs) {
             const defaultCols = Object.keys(currentDefs);
             setValue('columns', defaultCols);
        }
    }, [dataSource, setValue]);

    const loading = loadingLeads || loadingProps || loadingPartners;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col animate-fadeIn">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t_reports.title}</h1>
                <p className="text-gray-500 dark:text-gray-400">{t_reports.subtitle}</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                
                {/* LEFT SIDEBAR: CONFIGURATION */}
                <div className="w-full lg:w-80 flex-shrink-0 overflow-y-auto space-y-6 pr-2">
                    
                    {/* Data Source Selection */}
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><TableCellsIcon className="w-5 h-5 text-amber-500"/> Source</CardTitle></CardHeader>
                        <CardContent>
                            <select {...register('dataSource')} className={selectClasses}>
                                <option value="leads">{t_reports.dataSources.leads}</option>
                                <option value="properties">{t_reports.dataSources.properties}</option>
                                <option value="partners">{t_reports.dataSources.partners}</option>
                            </select>
                        </CardContent>
                    </Card>

                    {/* Filters */}
                    <Card>
                         <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><FunnelIcon className="w-5 h-5 text-amber-500"/> Filters</CardTitle></CardHeader>
                         <CardContent className="space-y-4">
                             {/* Date Shortcuts */}
                             <div className="grid grid-cols-3 gap-2">
                                {['today', 'week', 'month', 'year', 'all'].map((sc) => (
                                    <button 
                                        key={sc}
                                        type="button"
                                        onClick={() => handleDateShortcut(sc as DateRangeShortcut)}
                                        className={`text-xs py-1 px-2 rounded border ${dateRangeShortcut === sc ? 'bg-amber-100 border-amber-500 text-amber-700 font-bold' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {sc.charAt(0).toUpperCase() + sc.slice(1)}
                                    </button>
                                ))}
                             </div>

                             {/* Date Inputs */}
                             <div className="space-y-2">
                                 <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{t_reports.startDate}</label>
                                    <input type="date" {...register('startDate')} className={inputClasses} />
                                </div>
                                 <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">{t_reports.endDate}</label>
                                    <input type="date" {...register('endDate')} className={inputClasses} />
                                </div>
                             </div>

                             {/* Status Filter */}
                             <div>
                                 <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                                 <select {...register('statusFilter')} className={selectClasses}>
                                     <option value="all">All Statuses</option>
                                     {dataSource === 'properties' ? (
                                         <>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="sold">Sold</option>
                                         </>
                                     ) : dataSource === 'leads' ? (
                                         <>
                                            <option value="new">New</option>
                                            <option value="contacted">Contacted</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                         </>
                                     ) : (
                                         <>
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                            <option value="disabled">Disabled</option>
                                         </>
                                     )}
                                 </select>
                             </div>
                         </CardContent>
                    </Card>

                    {/* Columns Selection */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2"><TableCellsIcon className="w-5 h-5 text-amber-500"/> Columns</CardTitle>
                            <button type="button" onClick={handleSelectAllColumns} className="text-xs text-amber-600 hover:underline">Toggle All</button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {columnDefinitions[dataSource] && Object.entries(columnDefinitions[dataSource]).map(([key, def]) => (
                                    <label key={key} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                        <Checkbox {...register('columns')} value={key} />
                                        {/* FIX: Cast 'def' to a known type to access 'label' property. */}
                                        <span className="text-gray-700 dark:text-gray-300">{(def as { label: string }).label}</span>
                                    </label>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    
                     {/* Export Actions - Mobile Only (Sticky Bottom) */}
                     <div className="lg:hidden grid grid-cols-2 gap-4 sticky bottom-0 bg-gray-50 p-4 border-t">
                        <Button onClick={() => handleExport('csv')} variant="secondary" className="w-full">CSV</Button>
                        <Button onClick={() => handleExport('pdf')} variant="danger" className="w-full">PDF</Button>
                    </div>

                </div>

                {/* RIGHT SIDE: PREVIEW & CHARTS */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-100 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800">
                    
                    {/* Top Bar: Stats & Actions */}
                    <div className="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex gap-6">
                             <div className="text-center sm:text-left">
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Records</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{filteredData.length}</p>
                            </div>
                             {chartData && (
                                <div className="hidden md:flex items-center gap-2 h-12">
                                    <div className="h-full w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
                                    <div className="w-10 h-10">
                                         <Doughnut data={chartData.doughnut} options={{ maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }} />
                                    </div>
                                    <span className="text-xs text-gray-500 max-w-[100px]">Distribution by Status</span>
                                </div>
                            )}
                        </div>
                        <div className="hidden lg:flex gap-3">
                             <Button onClick={() => handleExport('csv')} variant="secondary" className="flex items-center gap-2">
                                 <FileDownloadIcon className="w-4 h-4" /> {t_reports.exportCSV}
                             </Button>
                             <Button onClick={() => handleExport('pdf')} variant="danger" className="flex items-center gap-2">
                                 <FileDownloadIcon className="w-4 h-4" /> {t_reports.exportPDF}
                             </Button>
                        </div>
                    </div>

                    {/* Table Preview */}
                    <div className="flex-grow overflow-auto p-6">
                         {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <ChartBarIcon className="w-16 h-16 mb-4 text-gray-300" />
                                <p className="text-lg">No data matches your filters.</p>
                                <Button variant="link" onClick={() => {setValue('statusFilter', 'all'); setValue('dateRangeShortcut', 'all'); handleDateShortcut('all')}}>Clear Filters</Button>
                            </div>
                        ) : (
                             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {selectedColumns.length > 0 ? selectedColumns.map(colKey => {
                                                    // Explicitly cast the lookup result
                                                    const colDefs = columnDefinitions[dataSource] as Record<string, { label: string; path: string }>;
                                                    const colDef = colDefs?.[colKey];
                                                    return (
                                                        <TableHead key={colKey} className="whitespace-nowrap">
                                                            {colDef?.label ?? colKey}
                                                        </TableHead>
                                                    );
                                                }) : <TableHead>No columns selected</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredData.slice(0, 50).map((item, idx) => (
                                                <TableRow key={idx}>
                                                     {selectedColumns.map(colKey => {
                                                         const colDefs = columnDefinitions[dataSource] as Record<string, { label: string; path: string }>;
                                                         const colDef = colDefs?.[colKey];
                                                         const path = colDef?.path;
                                                         // Safe property access using reduce
                                                         const value = path ? path.split('.').reduce((o: any, i) => o?.[i], item) : '';
                                                         
                                                         // Formatting specific values
                                                         let displayValue = value;
                                                         if (colKey.toLowerCase().includes('date') || colKey.toLowerCase().includes('created')) {
                                                             try {
                                                                displayValue = new Date(value).toLocaleDateString(language);
                                                             } catch (e) { /* keep original value */ }
                                                         }
                                                         if (colKey === 'price') {
                                                             displayValue = typeof value === 'number' ? value.toLocaleString() : value;
                                                         }

                                                         return (
                                                            <TableCell key={colKey} className="whitespace-nowrap text-sm">
                                                                {displayValue}
                                                            </TableCell>
                                                         );
                                                     })}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {filteredData.length > 50 && (
                                    <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                                        Showing first 50 rows of {filteredData.length} total records. Export to see all.
                                    </div>
                                )}
                             </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminReportsPage;
