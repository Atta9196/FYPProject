import React from 'react';

export default function StatCard({ title, value, change, icon, color = 'blue' }) {
    const colorClasses = {
        blue: 'border-blue-200 bg-blue-50',
        green: 'border-green-200 bg-green-50',
        purple: 'border-purple-200 bg-purple-50',
        orange: 'border-orange-200 bg-orange-50'
    };

    return (
        <div className={`rounded-2xl p-6 border shadow-sm ${colorClasses[color]}`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-slate-600">{title}</div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
                    {change && (
                        <div className="text-sm text-green-600 font-medium">{change}</div>
                    )}
                </div>
                {icon && (
                    <div className="text-2xl">{icon}</div>
                )}
            </div>
        </div>
    );
}


