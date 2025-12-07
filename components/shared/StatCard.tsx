
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/Card';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.FC<{ className?: string }>;
    linkTo: string;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon: Icon, linkTo }) => (
    <Link to={linkTo} className="block">
        <Card className="hover:shadow-lg hover:border-amber-500/50 transition-all transform hover:-translate-y-1 p-0">
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                        <p className="text-4xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    </div>
                    <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 p-3 rounded-full">
                        <Icon className="w-6 h-6" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </Link>
));

export default StatCard;
